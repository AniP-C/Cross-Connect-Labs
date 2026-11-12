// The visit log, the browser half. BaseLayout starts it on every page; the Worker side is
// worker/visits.ts and the dashboard is /admin. What it records: docs/analytics.md.
//
// One `view` beacon when the page opens and one `end` beacon when it closes, with the same id so
// the Worker can merge them, plus an `event` beacon for each action (trackAction below).
// Nothing here may break the page, ask the visitor anything, or slow it down: every failure is silent.
//
// Two clocks per page: durationMs is wall time, activeMs only counts while the tab is visible.
// A forty-minute visit with thirty seconds of attention is a tab left open, not a reader.
import type { Action } from '../../worker/visits';

// Not /api/track: ad blockers match that word even on the site's own address.
const ENDPOINT = '/api/ping';
const KEY_VISITOR = 'cc-visitor';
const KEY_COUNT = 'cc-visits';
const KEY_SESSION = 'cc-session';
// localStorage.setItem('cc-track-force', '1') records on localhost and with Do Not Track on, for testing.
const KEY_FORCE = 'cc-track-force';
const CAMPAIGN = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref'];
const ID = /^[a-z0-9]{8,64}$/;
// At most this many error beacons per page, so a broken loop can't flood the log.
const MAX_ERRORS = 5;

interface LiveView {
  id: string;
  t0: number;
  // Visible time so far, not counting the stretch in progress.
  activeMs: number;
  // When the current visible stretch began, or null while the tab is hidden.
  visibleSince: number | null;
  maxScroll: number;
  clicks: number;
  keys: number;
  rageClicks: number;
  // Time per section, and the one holding the middle of the screen right now.
  sections: Record<string, number>;
  section: string;
  sectionSince: number | null;
  // name|detail pairs already sent from this page, for trackOnce.
  sent: Set<string>;
  errors: number;
}

let live: LiveView | null = null;
let visitCount = 1;
let memoryVisitor = '';
let memorySession = '';
// Where the last click on the page was, so an opened dialog can say which button opened it.
let lastArea = '';
// When the visitor last clicked or pressed a key. A <details> that opens without one opened itself.
let lastInput = 0;
let sectionEls: HTMLElement[] = [];
const vitals = { lcp: 0, inp: 0, cls: 0 };

function randomId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  return [...bytes].map((b) => b.toString(36).padStart(2, '0')).join('');
}

function read(store: () => Storage, key: string): string | null {
  try {
    return store().getItem(key);
  } catch {
    return null;
  }
}

function write(store: () => Storage, key: string, value: string) {
  try {
    store().setItem(key, value);
  } catch {
    // Private mode or storage blocked: the ids live in memory for this page only.
  }
}

// A random number for this browser, kept in localStorage. Not a cookie, not shared with any other site.
function visitorId(): string {
  const saved = read(() => localStorage, KEY_VISITOR);
  if (saved && ID.test(saved)) return saved;
  memoryVisitor ||= randomId();
  write(() => localStorage, KEY_VISITOR, memoryVisitor);
  return memoryVisitor;
}

// One per tab. A new one counts as a new visit.
function sessionId(): string {
  const saved = read(() => sessionStorage, KEY_SESSION);
  const count = Number(read(() => localStorage, KEY_COUNT) ?? 0);
  if (saved && ID.test(saved)) {
    visitCount = Number.isFinite(count) && count > 0 ? count : 1;
    return saved;
  }
  if (!memorySession) {
    memorySession = randomId();
    write(() => sessionStorage, KEY_SESSION, memorySession);
    visitCount = Number.isFinite(count) ? count + 1 : 1;
    write(() => localStorage, KEY_COUNT, String(visitCount));
  }
  return memorySession;
}

function campaign(): Record<string, string> | undefined {
  const query = new URLSearchParams(location.search);
  const out: Record<string, string> = {};
  for (const key of CAMPAIGN) {
    const value = query.get(key);
    if (value) out[key] = value.slice(0, 120);
  }
  return Object.keys(out).length ? out : undefined;
}

function environment() {
  const nav = navigator as Navigator & { connection?: { effectiveType?: string }; deviceMemory?: number };
  const entry = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
  return {
    screen: `${screen.width}x${screen.height}`,
    viewport: `${innerWidth}x${innerHeight}`,
    dpr: Math.round((devicePixelRatio ?? 1) * 100) / 100,
    lang: navigator.language,
    languages: navigator.languages?.slice(0, 6).join(','),
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
    tzOffset: -new Date().getTimezoneOffset(),
    theme: document.documentElement.dataset.theme,
    touch: (navigator.maxTouchPoints ?? 0) > 0,
    cores: navigator.hardwareConcurrency,
    memory: nav.deviceMemory,
    connection: nav.connection?.effectiveType,
    navType: entry?.type,
    notFound: document.querySelector('[data-not-found]') ? true : undefined,
  };
}

// Chrome can say which phone it is and the real OS version, without any prompt. Safari and
// Firefox don't, and that's fine. Never waits more than 400ms.
async function deviceHints(): Promise<{ model?: string; platformVersion?: string }> {
  const data = (navigator as Navigator & { userAgentData?: { getHighEntropyValues?: (hints: string[]) => Promise<Record<string, string>> } }).userAgentData;
  if (!data?.getHighEntropyValues) return {};
  try {
    const timeout = new Promise<Record<string, string>>((resolve) => setTimeout(() => resolve({}), 400));
    const v = await Promise.race([data.getHighEntropyValues(['model', 'platformVersion']), timeout]);
    return { model: v.model || undefined, platformVersion: v.platformVersion || undefined };
  } catch {
    return {};
  }
}

// sendBeacon survives the page closing; fetch with keepalive is the fallback.
function send(payload: Record<string, unknown>, beacon: boolean) {
  const body = JSON.stringify(payload);
  if (beacon && typeof navigator.sendBeacon === 'function') {
    try {
      if (navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))) return;
    } catch {
      // Fall through to fetch.
    }
  }
  fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
}

function scrollDepth(): number {
  const height = Math.max(document.documentElement.scrollHeight, document.body?.scrollHeight ?? 0);
  if (height <= innerHeight) return 100;
  return Math.min(100, Math.round(((scrollY + innerHeight) / height) * 100));
}

// Sections: whichever one crosses the middle of the screen has the visitor's attention.
// Sections without an id are named from their heading id: aria-labelledby="signal-title" → "signal".
function sectionName(el: HTMLElement): string {
  const name = el.id || el.getAttribute('aria-labelledby')?.replace(/-title$/, '') || el.tagName.toLowerCase();
  return /^[a-z0-9-]{1,40}$/.test(name) ? name : '';
}

function sectionAtMiddle(): string {
  const mid = innerHeight / 2;
  for (const el of sectionEls) {
    const r = el.getBoundingClientRect();
    if (r.top <= mid && r.bottom > mid) return sectionName(el);
  }
  return '';
}

// Adds the stretch in progress to its section and starts a new one (or none, while hidden).
function settleSection() {
  if (!live) return;
  const now = Date.now();
  if (live.section && live.sectionSince !== null) live.sections[live.section] = (live.sections[live.section] ?? 0) + now - live.sectionSince;
  live.sectionSince = document.visibilityState === 'visible' ? now : null;
}

function updateSection() {
  if (!live) return;
  const id = sectionAtMiddle();
  if (id === live.section) return;
  settleSection();
  live.section = id;
}

// Page speed, measured the way Google's Core Web Vitals are, with the browser's own observers.
function watchVitals() {
  const observe = (type: string, onEntries: (entries: PerformanceEntry[]) => void, extra: Record<string, unknown> = {}) => {
    try {
      new PerformanceObserver((list) => onEntries(list.getEntries())).observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
    } catch {
      // Not supported in this browser.
    }
  };
  observe('largest-contentful-paint', (entries) => {
    const last = entries.at(-1);
    if (last) vitals.lcp = Math.round(last.startTime);
  });
  // Layout shift is counted in windows: shifts less than 1s apart, at most 5s long. The worst window counts.
  let windowValue = 0;
  let windowStart = 0;
  let windowLast = 0;
  observe('layout-shift', (entries) => {
    for (const e of entries as unknown as { value: number; hadRecentInput: boolean; startTime: number }[]) {
      if (e.hadRecentInput) continue;
      if (windowValue && e.startTime - windowLast < 1000 && e.startTime - windowStart < 5000) windowValue += e.value;
      else {
        windowValue = e.value;
        windowStart = e.startTime;
      }
      windowLast = e.startTime;
      vitals.cls = Math.max(vitals.cls, windowValue);
    }
  });
  // The slowest response to a click, tap or key press.
  observe(
    'event',
    (entries) => {
      for (const e of entries as unknown as { interactionId?: number; duration: number }[]) if (e.interactionId) vitals.inp = Math.max(vitals.inp, Math.round(e.duration));
    },
    { durationThreshold: 40 },
  );
}

function timing() {
  const entry = performance.getEntriesByType?.('navigation')[0] as PerformanceNavigationTiming | undefined;
  return {
    ttfb: entry && entry.responseStart > 0 ? Math.round(entry.responseStart) : undefined,
    loadMs: entry && entry.loadEventEnd > 0 ? Math.round(entry.loadEventEnd) : undefined,
    lcp: vitals.lcp || undefined,
    inp: vitals.inp || undefined,
    cls: vitals.lcp || vitals.cls ? Math.round(vitals.cls * 1000) / 1000 : undefined,
  };
}

// The exit numbers. Safe to send more than once: the Worker keeps the latest.
function flush(exit: string) {
  const view = live;
  if (!view) return;
  settleSection();
  send(
    {
      type: 'end',
      id: view.id,
      session: sessionId(),
      visitor: visitorId(),
      t0: view.t0,
      durationMs: Date.now() - view.t0,
      activeMs: view.activeMs + (view.visibleSince === null ? 0 : Date.now() - view.visibleSince),
      maxScroll: Math.max(view.maxScroll, scrollDepth()),
      clicks: view.clicks,
      keys: view.keys,
      rageClicks: view.rageClicks,
      sections: Object.fromEntries(Object.entries(view.sections).map(([id, ms]) => [id, Math.round(ms)])),
      lastSection: view.section || undefined,
      ...timing(),
      exit,
    },
    true,
  );
}

// Do Not Track and Global Privacy Control are explicit requests, so they are honoured.
function enabled(): boolean {
  if (document.documentElement.hasAttribute('data-no-track')) return false;
  if (read(() => localStorage, KEY_FORCE) === '1') return true;
  const nav = navigator as Navigator & { doNotTrack?: string | null; globalPrivacyControl?: boolean };
  if (nav.doNotTrack === '1' || nav.globalPrivacyControl === true) return false;
  // Our own testing would swamp the numbers.
  if (/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname)) return false;
  return import.meta.env.PROD;
}

// Records something the visitor did. `detail` must never hold what they typed.
export function trackAction(name: Action, detail?: string) {
  if (!live) return;
  send(
    {
      type: 'event',
      id: randomId(),
      session: sessionId(),
      visitor: visitorId(),
      viewId: live.id,
      t0: Date.now(),
      name,
      detail: detail?.slice(0, 512),
      path: location.pathname,
    },
    // Links that leave the page need the beacon to survive it.
    true,
  );
}

// The same, but only the first time per page: turning the knob ten times is one row, not ten.
export function trackOnce(name: Action, detail = '') {
  if (!live) return;
  const id = `${name}|${detail}`;
  if (live.sent.has(id)) return;
  live.sent.add(id);
  trackAction(name, detail || undefined);
}

// Something broke: a script error, a file that didn't load, an /api call that failed.
export function trackError(text: string) {
  if (!live || live.errors >= MAX_ERRORS) return;
  live.errors++;
  trackOnce('error', text.replace(/\s+/g, ' ').trim().slice(0, 300));
}

// Which part of the page the last click was in: "header", "call bar", "contact", "case-2"...
export function clickArea(): string {
  return lastArea;
}

function areaOf(el: Element): string {
  if (el.closest('[data-dock]')) return 'call bar';
  if (el.closest('header')) return 'header';
  if (el.closest('dialog')) return 'dialog';
  if (el.closest('footer')) return 'footer';
  return el.closest('[id]')?.id ?? '';
}

// Short visible text of our own page content. Never of a form field: that could be something typed.
function textOf(el: Element | null | undefined, max = 80): string {
  if (!el || el.closest('form, input, textarea, select, [contenteditable]')) return '';
  return (el.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, max);
}

// Sorts a clicked link into an action. Ordinary links inside the site return null.
function linkAction(link: HTMLAnchorElement): [Action, string] | null {
  const href = link.getAttribute('href') ?? '';
  if (!href || href.startsWith('#')) return null;
  if (href.startsWith('mailto:')) return ['email', href.slice(7).split('?')[0]];
  if (href.startsWith('tel:')) return ['phone', href.slice(4)];
  let url: URL;
  try {
    url = new URL(href, location.href);
  } catch {
    return null;
  }
  if (/(^|\.)wa\.me$|whatsapp\.com$/.test(url.hostname)) return ['whatsapp', lastArea];
  if (url.host !== location.host) return ['outbound', `${url.origin}${url.pathname}`];
  if (url.pathname.startsWith('/services/') && url.pathname !== location.pathname) return ['service-link', `${url.pathname} · from ${lastArea}`];
  return null;
}

// Clicks on the page's own controls. This runs in the capture phase, before the component's
// handler, so toggles are read in their old state: aria-expanded="false" means "about to open".
function controlAction(target: Element): [Action, string] | null {
  const key = target.closest<HTMLElement>('[data-patchbay] .key');
  if (key) return key.getAttribute('aria-pressed') === 'true' ? null : ['patch-pick', textOf(key.querySelector('.problem')) || key.dataset.fix || ''];
  if (target.closest('[data-flip]')) return ['patch-flip', textOf(document.querySelector('[data-readout="fix"]'))];
  const pos = target.closest('[data-budget-index]');
  if (pos) return pos.getAttribute('aria-pressed') === 'true' ? null : ['knob-turn', textOf(pos, 24)];
  const file = target.closest('[data-case]');
  if (file) return file.getAttribute('aria-pressed') === 'true' ? null : ['case-open', textOf(file.querySelector('.title'))];
  const row = target.closest('[data-row]');
  if (row) return row.getAttribute('aria-expanded') === 'true' ? null : ['rack-row', textOf(row.querySelector('.row-name') ?? row)];
  if (target.closest('[data-theme-toggle]')) return ['theme', document.documentElement.dataset.theme === 'dark' ? 'to day' : 'to night'];
  const menu = target.closest('[data-menu]');
  if (menu) return menu.getAttribute('aria-expanded') === 'true' ? null : ['menu', ''];
  return null;
}

// Three quick clicks on the same spot. A burst counts once, however long it goes on.
let burst: { t: number; x: number; y: number }[] = [];
function checkRage(event: MouseEvent, target: Element) {
  // Keyboard "clicks" have no position.
  if (!live || event.detail === 0) return;
  const now = performance.now();
  burst = burst.filter((c) => now - c.t < 800 && Math.hypot(c.x - event.clientX, c.y - event.clientY) < 40);
  burst.push({ t: now, x: event.clientX, y: event.clientY });
  if (burst.length !== 3) return;
  live.rageClicks++;
  const what = target.closest('button, a, summary, label, img, h1, h2, h3, p, li') ?? target;
  trackOnce('rage-click', [lastArea, what.tagName.toLowerCase(), textOf(what, 40)].filter(Boolean).join(' · '));
}

function fileName(url: string | undefined): string {
  if (!url) return '';
  try {
    const u = new URL(url, location.href);
    return u.host === location.host ? u.pathname : `${u.host}${u.pathname}`;
  } catch {
    return '';
  }
}

export function startTracking() {
  if (live || !enabled()) return;

  // Capture phase, so it still runs if a handler further down stops the click.
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as Element | null;
      if (!target?.closest) return;
      lastInput = performance.now();
      lastArea = areaOf(target);
      if (live) live.clicks += 1;
      checkRage(event, target);
      const link = target.closest('a');
      const action = (link && linkAction(link)) || controlAction(target);
      if (!action) return;
      // Links are recorded every time; the page's own controls once per page.
      if (link) trackAction(...action);
      else trackOnce(...action);
    },
    true,
  );

  // FAQ answers. <details> fires `toggle` without bubbling, so this listens in the capture phase.
  document.addEventListener(
    'toggle',
    (event) => {
      const item = event.target;
      if (!(item instanceof HTMLDetailsElement) || !item.open || performance.now() - lastInput > 1500) return;
      if (item.closest('#faq')) trackOnce('faq-open', textOf(item.querySelector('summary .q') ?? item.querySelector('summary'), 120));
    },
    true,
  );

  // Copying the email address is a stronger signal than clicking it. Only a selection that is
  // exactly an address counts: this must never turn into a clipboard log.
  document.addEventListener('copy', () => {
    const selected = document.getSelection()?.toString().trim() ?? '';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(selected)) trackAction('copy-email', selected);
  });

  // Script errors and files that failed to load. Capture phase, because load errors don't bubble.
  addEventListener(
    'error',
    // Typed as Event: load errors from <img> and <script> arrive here too, and they aren't ErrorEvents.
    (event: Event) => {
      if (event instanceof ErrorEvent) {
        trackError(`${event.message} @ ${fileName(event.filename)}:${event.lineno}`);
        return;
      }
      const el = event.target as (HTMLElement & { src?: string; href?: string }) | null;
      if (el && el !== (window as unknown) && el.tagName) trackError(`failed to load ${el.tagName.toLowerCase()} ${fileName(el.src || el.href)}`);
    },
    true,
  );
  addEventListener('unhandledrejection', (event) => {
    const reason = event.reason as { message?: string } | string | undefined;
    trackError(`unhandled: ${typeof reason === 'string' ? reason : (reason?.message ?? 'promise rejected')}`);
  });

  let pending = false;
  addEventListener(
    'scroll',
    () => {
      if (pending || !live) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        if (!live) return;
        live.maxScroll = Math.max(live.maxScroll, scrollDepth());
        updateSection();
      });
    },
    { passive: true },
  );
  addEventListener('resize', () => updateSection(), { passive: true });

  addEventListener('keydown', () => {
    lastInput = performance.now();
    if (live) live.keys += 1;
  });

  document.addEventListener('visibilitychange', () => {
    if (!live) return;
    if (document.visibilityState === 'hidden') {
      // On phones this is often the last chance to report, so send now and keep the view open.
      if (live.visibleSince !== null) live.activeMs += Date.now() - live.visibleSince;
      live.visibleSince = null;
      flush('hidden');
    } else {
      live.visibleSince = Date.now();
      settleSection();
    }
  });

  addEventListener('pagehide', () => flush('pagehide'));

  live = {
    id: randomId(),
    t0: Date.now(),
    activeMs: 0,
    visibleSince: document.visibilityState === 'visible' ? Date.now() : null,
    maxScroll: scrollDepth(),
    clicks: 0,
    keys: 0,
    rageClicks: 0,
    sections: {},
    section: '',
    sectionSince: null,
    sent: new Set(),
    errors: 0,
  };
  sectionEls = [...document.querySelectorAll<HTMLElement>('main section, footer')];
  live.section = sectionAtMiddle();
  live.sectionSince = document.visibilityState === 'visible' ? Date.now() : null;
  watchVitals();

  const view = live;
  const session = sessionId();
  const base = {
    type: 'view',
    id: view.id,
    session,
    visitor: visitorId(),
    t0: view.t0,
    path: location.pathname,
    title: document.title,
    referrer: document.referrer || undefined,
    params: campaign(),
    // Each page here is its own load, so the session's page count lives in sessionStorage.
    pageIndex: nextPageIndex(),
    visitCount,
    ...environment(),
  };
  deviceHints().then((hints) => send({ ...base, ...hints }, false));
}

function nextPageIndex(): number {
  const index = Number(read(() => sessionStorage, 'cc-pages') ?? 0) + 1;
  write(() => sessionStorage, 'cc-pages', String(index));
  return index;
}
