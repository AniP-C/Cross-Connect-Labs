// The /admin dashboard. Sends the key to /api/stats, then counts and draws everything here in the
// browser, so a new breakdown needs no Worker change. Every value from the log came from a visitor,
// so it only ever goes into the page as textContent, never as HTML.
import type { EventRecord, StatsResponse, VisitRecord } from '../../worker/visits';
import { visitLog } from '../data/site';

const KEY_STORE = 'cc-admin-key';
const DAY = 86_400_000;

const root = document.querySelector<HTMLElement>('.admin');

if (root) {
  const get = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const gate = get('[data-gate]');
  const report = get('[data-report]');
  const unlockForm = get<HTMLFormElement>('[data-unlock]');
  const keyInput = get<HTMLInputElement>('#admin-key');
  const gateNote = get('[data-gate-note]');
  const status = get('[data-status]');
  const body = get('[data-body]');
  const rangeLabel = get('[data-range-label]');
  const botsButton = get<HTMLButtonElement>('[data-bots]');

  let key = '';
  let days = 30;
  let showBots = false;
  let data: StatsResponse | null = null;

  try {
    key = localStorage.getItem(KEY_STORE) ?? '';
  } catch {}

  const say = (el: HTMLElement, text: string, error = false) => {
    el.textContent = text;
    el.classList.toggle('error', error);
  };

  async function load() {
    say(status, 'Reading the log…');
    let res: Response;
    try {
      res = await fetch('/api/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ key, days }),
      });
    } catch {
      return say(status, 'No connection. Try refresh.', true);
    }
    const reply = res.headers.get('Content-Type')?.includes('application/json') ? ((await res.json().catch(() => null)) as (StatsResponse & { error?: string }) | null) : null;

    if (res.status === 401) {
      lock();
      return say(gateNote, 'Wrong key.', true);
    }
    gate.hidden = true;
    report.hidden = false;
    if (!reply?.ok) {
      // The dev server has no Worker; `npx wrangler dev` or the live site does.
      return say(status, reply?.error ?? `The log isn’t answering here (${res.status}). Open /admin on the live site, or run npx wrangler dev.`, true);
    }
    data = reply;
    draw();
  }

  function lock() {
    key = '';
    data = null;
    try {
      localStorage.removeItem(KEY_STORE);
    } catch {}
    body.replaceChildren();
    report.hidden = true;
    gate.hidden = false;
    keyInput.value = '';
    keyInput.focus();
  }

  unlockForm.addEventListener('submit', (event) => {
    event.preventDefault();
    key = keyInput.value.trim();
    if (!key) return;
    try {
      localStorage.setItem(KEY_STORE, key);
    } catch {}
    say(gateNote, '');
    load();
  });

  root.querySelectorAll<HTMLButtonElement>('[data-days]').forEach((button) =>
    button.addEventListener('click', () => {
      days = Number(button.dataset.days);
      root.querySelectorAll('[data-days]').forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
      load();
    }),
  );
  botsButton.addEventListener('click', () => {
    showBots = !showBots;
    botsButton.setAttribute('aria-pressed', String(showBots));
    draw();
  });
  get('[data-refresh]').addEventListener('click', load);
  get('[data-lock]').addEventListener('click', lock);

  if (key) load();

  function draw() {
    if (!data) return;
    rangeLabel.textContent = `VISIT LOG · LAST ${data.days} DAYS`;
    const botSessions = new Set(data.records.filter((r) => r.bot).map((r) => r.session));
    const views = showBots ? data.records : data.records.filter((r) => !r.bot);
    const events = showBots ? data.events : data.events.filter((e) => !botSessions.has(e.session));
    const sessions = toSessions(views, events);
    const label = (name: string) => (visitLog.actions as Record<string, string>)[name] ?? name;
    const count = (name: string) => events.filter((e) => e.name === name).length;

    say(
      status,
      `${views.length} page views and ${events.length} actions, read ${clock(data.generatedAt)}.` +
        (data.truncated ? ' Only the newest 5,000 rows are shown; pick a shorter range.' : '') +
        (showBots ? '' : ` ${botSessions.size} bot sessions hidden.`),
    );

    if (!views.length && !events.length) {
      body.replaceChildren(el('p', { class: 'hint' }, 'Nothing in this range yet.'));
      return;
    }

    const visitors = new Set(views.map((v) => v.visitor)).size;
    const returning = sessions.filter((s) => (s.views[0].visitCount ?? 1) > 1).length;
    const timed = sessions.filter((s) => s.totalMs > 0);
    const avgSession = timed.length ? timed.reduce((sum, s) => sum + s.totalMs, 0) / timed.length : undefined;
    const active = views.filter((v) => v.activeMs !== undefined);
    const avgActive = active.length ? active.reduce((sum, v) => sum + (v.activeMs ?? 0), 0) / active.length : undefined;
    const scrolled = views.filter((v) => v.maxScroll !== undefined);
    const avgScroll = scrolled.length ? Math.round(scrolled.reduce((sum, v) => sum + (v.maxScroll ?? 0), 0) / scrolled.length) : undefined;
    const bounced = sessions.filter((s) => s.views.length === 1 && !s.actions.length).length;

    const tiles = el(
      'div',
      { class: 'tiles' },
      tile(views.length, 'Page views'),
      tile(sessions.length, 'Sessions'),
      tile(visitors, 'Unique browsers', 'a localStorage id, not people'),
      tile(returning, 'Returning', 'had an earlier session'),
      tile(duration(avgSession), 'Avg session'),
      tile(duration(avgActive), 'Avg time looking', 'per page, tab visible'),
      tile(avgScroll === undefined ? '—' : `${avgScroll}%`, 'Avg scroll'),
      tile(sessions.length ? `${Math.round((bounced / sessions.length) * 100)}%` : '—', 'Left at once', 'one page, no action'),
      tile(count('contact-send'), 'Messages sent'),
      tile(count('booked'), 'Calls booked'),
      tile(botSessions.size, 'Bot sessions', showBots ? 'included' : 'hidden'),
    );

    // How far sessions got towards an enquiry.
    const reached = (name: string) => sessions.filter((s) => s.actions.some((a) => a.name === name)).length;
    const steps: [string, number][] = [
      ['Sessions', sessions.length],
      [label('contact-open'), reached('contact-open')],
      [label('contact-send'), reached('contact-send')],
      [label('book-open'), reached('book-open')],
      [label('booked'), reached('booked')],
      [label('whatsapp'), reached('whatsapp')],
    ];
    const funnel = panel(
      'Towards an enquiry',
      el('ul', { class: 'rows funnel' }, ...steps.map(([name, n]) => row(name, n, sessions.length, sessions.length ? `${n} · ${Math.round((n / sessions.length) * 100)}%` : '0'))),
    );

    const perDay = byDay(views, data.days);
    const peak = Math.max(1, ...perDay.map((d) => d.views));
    const chart = el(
      'div',
      { class: 'chart lcd' },
      el('p', { class: 'label' }, `Views per day · peak ${peak}`),
      el(
        'div',
        { class: 'bars', role: 'img', 'aria-label': `Views per day over the last ${data.days} days, peak ${peak}` },
        ...perDay.map((d) => {
          const bar = el('span', { title: `${d.day}: ${d.views} views, ${d.visitors} browsers`, class: d.views ? '' : 'empty' });
          bar.style.height = `${(d.views / peak) * 100}%`;
          return bar;
        }),
      ),
      el('div', { class: 'axis' }, el('span', {}, perDay[0]?.day ?? ''), el('span', {}, perDay.at(-1)?.day ?? '')),
    );

    const firsts = sessions.map((s) => s.views[0]);
    const detailHead = (name: string) =>
      events
        .filter((e) => e.name === name)
        .map((e) => e.detail?.split(' · ')[0])
        .filter((d): d is string => Boolean(d));
    const campaignOf = (v: VisitRecord) => v.params && [v.params.utm_source ?? v.params.ref, v.params.utm_campaign].filter(Boolean).join(' / ');
    const breakdowns = el(
      'div',
      { class: 'grid' },
      breakdown('Pages', tally(views, (v) => v.path), views.length),
      breakdown('Came from', tally(firsts, (v) => referrer(v.referrer)), firsts.length),
      breakdown('Campaign', tally(firsts, campaignOf), firsts.length),
      breakdown('Country', tally(firsts, (v) => v.country), firsts.length),
      breakdown('City', tally(firsts, (v) => v.city && [v.city, v.countryCode].filter(Boolean).join(', ')), firsts.length),
      breakdown('Device', tally(firsts, (v) => v.device), firsts.length),
      breakdown('Browser', tally(firsts, (v) => v.browser), firsts.length),
      breakdown('OS', tally(firsts, (v) => v.os), firsts.length),
      breakdown('Screen', tally(firsts, (v) => v.screen), firsts.length),
      breakdown('Language', tally(firsts, (v) => v.lang), firsts.length),
      breakdown('Time zone', tally(firsts, (v) => v.tz), firsts.length),
      breakdown('Day or night', tally(firsts, (v) => v.theme), firsts.length),
      breakdown('Actions', tally(events, (e) => label(e.name), 12), events.length),
      breakdown('Topics opened', tally(detailHead('contact-open'), (t) => t), count('contact-open')),
      breakdown('Sent by', tally(detailHead('contact-send'), (t) => t), count('contact-send')),
      breakdown('Buttons pressed in', tally(events.filter((e) => e.name.endsWith('-open')), (e) => e.detail?.match(/from (.+)$/)?.[1]), events.length),
      breakdown('Links followed out', tally(events.filter((e) => e.name === 'outbound'), (e) => e.detail?.replace(/^https?:\/\/(www\.)?/, '')), count('outbound')),
    );

    const latest = events.slice(0, 60).map((e) =>
      el(
        'div',
        { class: 'event surface' },
        el('span', { class: 'mono muted' }, clock(e.ts)),
        el('span', {}, el('strong', {}, label(e.name)), e.detail ? ` · ${e.detail}` : '', el('span', { class: 'muted' }, ` · ${e.path}${e.countryCode ? ` · ${flag(e.countryCode)} ${e.countryCode}` : ''}`)),
      ),
    );

    body.replaceChildren(
      tiles,
      funnel,
      el('h2', {}, 'Traffic'),
      chart,
      el('h2', {}, 'Breakdowns'),
      breakdowns,
      el('h2', {}, `Actions · ${events.length}`),
      events.length ? el('div', { class: 'list' }, ...latest) : el('p', { class: 'hint' }, 'No actions in this range.'),
      el('h2', {}, `Sessions · ${sessions.length}`),
      el('div', { class: 'list' }, ...sessions.slice(0, 200).map((s) => sessionItem(s, label))),
      sessions.length > 200 ? el('p', { class: 'hint' }, 'The newest 200 sessions are listed. Pick a shorter range to see older ones.') : '',
    );
  }
}

interface Session {
  session: string;
  views: VisitRecord[];
  actions: EventRecord[];
  totalMs: number;
}

// Groups page views and actions back into the sessions they came from, newest first.
function toSessions(views: VisitRecord[], events: EventRecord[]): Session[] {
  const groups = new Map<string, Session>();
  for (const view of views) {
    const s = groups.get(view.session) ?? { session: view.session, views: [], actions: [], totalMs: 0 };
    s.views.push(view);
    s.totalMs += view.durationMs ?? 0;
    groups.set(view.session, s);
  }
  for (const event of events) groups.get(event.session)?.actions.push(event);
  for (const s of groups.values()) {
    s.views.sort((a, b) => a.t0 - b.t0);
    s.actions.sort((a, b) => a.t0 - b.t0);
  }
  return [...groups.values()].sort((a, b) => b.views[0].t0 - a.views[0].t0);
}

// One bar per day in the viewer's own calendar, empty days included.
function byDay(views: VisitRecord[], days: number) {
  const key = (t: number) => new Date(t).toLocaleDateString('en-CA');
  const buckets = new Map<string, { views: number; visitors: Set<string> }>();
  for (let i = days - 1; i >= 0; i--) buckets.set(key(Date.now() - i * DAY), { views: 0, visitors: new Set() });
  for (const v of views) {
    const bucket = buckets.get(key(v.t0));
    if (!bucket) continue;
    bucket.views++;
    bucket.visitors.add(v.visitor);
  }
  return [...buckets].map(([day, b]) => ({ day, views: b.views, visitors: b.visitors.size }));
}

function tally<T>(items: T[], pick: (item: T) => string | undefined | false, limit = 8): [string, number][] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const name = pick(item);
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit);
}

function sessionItem(s: Session, label: (name: string) => string): HTMLElement {
  const first = s.views[0];
  const place = [first.city, first.country].filter(Boolean).join(', ') || 'Unknown place';
  const campaign = first.params && Object.entries(first.params).map(([k, v]) => `${k}=${v}`).join(' ');
  const steps = [
    ...s.views.map((v) => ({
      t0: v.t0,
      text: `${v.path} · ${duration(v.durationMs)}${v.activeMs !== undefined ? ` (${duration(v.activeMs)} looking)` : ''}${v.maxScroll !== undefined ? ` · scrolled ${v.maxScroll}%` : ''}${v.completed ? '' : ' · no exit beacon'}`,
    })),
    ...s.actions.map((a) => ({ t0: a.t0, text: `→ ${label(a.name)}${a.detail ? ` · ${a.detail}` : ''}` })),
  ].sort((a, b) => a.t0 - b.t0);

  const facts: [string, string | undefined, boolean?][] = [
    ['IP', first.ip],
    ['Place', [first.city, first.region, first.country].filter(Boolean).join(', ')],
    ['Visitor clock', localClock(first)],
    ['Time zone', first.tz ?? first.geoTz],
    ['Came from', first.referrer ?? 'Direct'],
    ['Campaign', campaign],
    ['Visit number', first.visitCount ? `#${first.visitCount}` : undefined],
    ['Browser', `${first.browser} ${first.browserVersion}`.trim()],
    ['OS', `${first.os} ${first.osVersion}`.trim()],
    ['Device', first.device],
    ['Screen', first.screen],
    ['Window', first.viewport],
    ['Pixel ratio', first.dpr ? `${first.dpr}×` : undefined],
    ['Touch', first.touch === undefined ? undefined : first.touch ? 'yes' : 'no'],
    ['CPU cores', first.cores ? String(first.cores) : undefined],
    ['Memory', first.memory ? `${first.memory} GB+` : undefined],
    ['Connection', first.connection],
    ['Language', first.languages ?? first.lang],
    ['Day or night', first.theme],
    ['Visitor id', first.visitor],
    ['User agent', first.ua, true],
  ];

  return el(
    'details',
    { class: 'item surface' },
    el(
      'summary',
      {},
      el('span', { class: 'mono' }, clock(first.ts)),
      el('span', {}, `${first.countryCode ? `${flag(first.countryCode)} ` : ''}${place}`),
      el('span', { class: 'muted' }, `${first.device} · ${first.browser} · ${s.views.length} page${s.views.length === 1 ? '' : 's'} · ${duration(s.totalMs)}`),
      first.referrer ? el('span', { class: 'muted' }, `from ${referrer(first.referrer)}`) : '',
      ...[...new Set(s.actions.map((a) => a.name))].map((name) => el('span', { class: 'tag' }, label(name))),
      first.bot ? el('span', { class: 'tag' }, 'bot') : '',
    ),
    el('ol', { class: 'trail' }, ...steps.map((step) => el('li', {}, step.text))),
    el(
      'dl',
      { class: 'facts' },
      ...facts.filter(([, value]) => value).map(([name, value, wide]) => el('div', { class: wide ? 'wide' : '' }, el('dt', { class: 'label' }, name), el('dd', {}, value!))),
    ),
  );
}

function tile(value: number | string, name: string, hint?: string): HTMLElement {
  return el('div', { class: 'panel surface' }, el('p', { class: 'tile-value' }, String(value)), el('p', { class: 'label' }, name), hint ? el('p', { class: 'hint' }, hint) : '');
}

function panel(title: string, ...children: Node[]): HTMLElement {
  return el('div', { class: 'panel surface' }, el('p', { class: 'label' }, title), ...children);
}

function row(name: string, n: number, total: number, shown = String(n)): HTMLElement {
  const fill = el('span', { class: 'fill' });
  fill.style.width = `${total ? (n / total) * 100 : 0}%`;
  return el('li', { class: 'row' }, fill, el('span', {}, name), el('span', { class: 'count' }, shown));
}

function breakdown(title: string, rows: [string, number][], total: number): HTMLElement {
  return panel(title, rows.length ? el('ul', { class: 'rows' }, ...rows.map(([name, n]) => row(name, n, total))) : el('p', { class: 'hint' }, 'Nothing yet.'));
}

// Builds an element with text children only, so nothing from the log is ever read as HTML.
function el(tag: string, attrs: Record<string, string>, ...children: (Node | string)[]): HTMLElement {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) if (value) node.setAttribute(name, value);
  node.append(...children);
  return node;
}

// 0s, 47s, 3m 12s, 1h 04m.
function duration(ms: number | undefined): string {
  if (ms === undefined || !Number.isFinite(ms)) return '—';
  const total = Math.round(ms / 1000);
  if (total < 60) return `${total}s`;
  const minutes = Math.floor(total / 60);
  if (minutes < 60) return `${minutes}m ${String(total % 60).padStart(2, '0')}s`;
  return `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
}

function clock(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
}

// The visitor's own wall clock, from the offset their browser reported.
function localClock(v: VisitRecord): string | undefined {
  if (v.tzOffset === undefined) return undefined;
  const t = new Date(v.t0 + v.tzOffset * 60_000);
  return `${String(t.getUTCHours()).padStart(2, '0')}:${String(t.getUTCMinutes()).padStart(2, '0')} their time`;
}

// The bare host, so https://www.google.com/ reads as google.com.
function referrer(url: string | undefined): string {
  if (!url) return 'Direct';
  try {
    const host = new URL(url).host;
    return host === location.host ? 'This site' : host.replace(/^www\./, '');
  } catch {
    return 'Unknown';
  }
}

// ISO country code → the pair of regional letters that shows as a flag.
function flag(code: string): string {
  return /^[A-Z]{2}$/.test(code) ? String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)) : '';
}
