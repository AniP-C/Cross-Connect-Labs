// The visit log, the browser half. BaseLayout starts it on every page; the Worker side is
// worker/visits.ts and the dashboard is /admin. What it records: docs/analytics.md.
//
// One `view` beacon when the page opens and one `end` beacon when it closes, with the same id so
// the Worker can merge them, plus an `event` beacon for each action (trackAction below).
// Nothing here may break the page: every failure is silent.
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
}

let live: LiveView | null = null;
let visitCount = 1;
let memoryVisitor = '';
let memorySession = '';
// Where the last click on the page was, so an opened dialog can say which button opened it.
let lastArea = '';

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
  };
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

// The exit numbers. Safe to send more than once: the Worker keeps the latest.
function flush(exit: string) {
  const view = live;
  if (!view) return;
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
  return null;
}

export function startTracking() {
  if (live || !enabled()) return;

  // Capture phase, so it still runs if a handler further down stops the click.
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target as Element | null;
      if (!target?.closest) return;
      lastArea = areaOf(target);
      if (live) live.clicks += 1;
      const link = target.closest('a');
      const action = link && linkAction(link);
      if (action) trackAction(...action);
    },
    true,
  );

  // Copying the email address is a stronger signal than clicking it. Only a selection that is
  // exactly an address counts: this must never turn into a clipboard log.
  document.addEventListener('copy', () => {
    const selected = document.getSelection()?.toString().trim() ?? '';
    if (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(selected)) trackAction('copy-email', selected);
  });

  let pending = false;
  addEventListener(
    'scroll',
    () => {
      if (pending || !live) return;
      pending = true;
      requestAnimationFrame(() => {
        pending = false;
        if (live) live.maxScroll = Math.max(live.maxScroll, scrollDepth());
      });
    },
    { passive: true },
  );

  addEventListener('keydown', () => {
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
  };
  const session = sessionId();
  send(
    {
      type: 'view',
      id: live.id,
      session,
      visitor: visitorId(),
      t0: live.t0,
      path: location.pathname,
      title: document.title,
      referrer: document.referrer || undefined,
      params: campaign(),
      // Each page here is its own load, so the session's page count lives in sessionStorage.
      pageIndex: nextPageIndex(),
      visitCount,
      ...environment(),
    },
    false,
  );
}

function nextPageIndex(): number {
  const index = Number(read(() => sessionStorage, 'cc-pages') ?? 0) + 1;
  write(() => sessionStorage, 'cc-pages', String(index));
  return index;
}
