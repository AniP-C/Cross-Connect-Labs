// The /admin dashboard. Sends the key to /api/stats, then counts and draws everything here in the
// browser, so a new breakdown needs no Worker change. Every value from the log came from a visitor,
// so it only ever goes into the page as textContent, never as HTML.
import type { EventRecord, StatsResponse, VisitRecord } from '../../worker/visits';
import { visitLog } from '../data/site';
import { sectionName } from './track';
// Country outlines from Natural Earth, served as a file of our own and only fetched on /admin.
import atlasUrl from 'world-atlas/countries-110m.json?url';

const KEY_STORE = 'cc-admin-key';
const DAY = 86_400_000;
// A session "reached out" if it did any of these.
const REACH = ['contact-send', 'booked', 'whatsapp', 'email', 'phone', 'copy-email'];
// Home page sections in page order, then the service pages' own. Anything else sorts after.
const SECTION_ORDER = ['top', 'patched', 'services', 'includes', 'work', 'cases', 'pricing', 'signal', 'reports', 'faq', 'others', 'contact', 'footer'];
const SVG = 'http://www.w3.org/2000/svg';

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
      [label('contact-close'), reached('contact-close')],
      [label('book-close'), reached('book-close')],
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
      breakdown('Network', tally(firsts, (v) => v.network), firsts.length),
      breakdown('Device', tally(firsts, (v) => v.device), firsts.length),
      breakdown('Phone model', tally(firsts, (v) => v.model), firsts.length),
      breakdown('Opened inside an app', tally(firsts, (v) => v.inApp ?? (v.bot ? undefined : 'No, a normal browser')), firsts.length),
      breakdown('Browser', tally(firsts, (v) => v.browser), firsts.length),
      breakdown('OS', tally(firsts, (v) => [v.os, v.osVersion].filter(Boolean).join(' ')), firsts.length),
      breakdown('Screen', tally(firsts, (v) => v.screen), firsts.length),
      breakdown('Language', tally(firsts, (v) => v.lang), firsts.length),
      breakdown('Time zone', tally(firsts, (v) => v.tz), firsts.length),
      breakdown('Day or night', tally(firsts, (v) => v.theme), firsts.length),
      breakdown('Actions', tally(events, (e) => label(e.name), 12), events.length),
      breakdown('Topics opened', tally(detailHead('contact-open'), (t) => t), count('contact-open')),
      breakdown('Sent by', tally(detailHead('contact-send'), (t) => t), count('contact-send')),
      breakdown('Buttons pressed in', tally(events.filter((e) => e.name === 'contact-open' || e.name === 'book-open'), (e) => e.detail?.match(/from (.+)$/)?.[1]), events.length),
      breakdown('Links followed out', tally(events.filter((e) => e.name === 'outbound'), (e) => e.detail?.replace(/^https?:\/\/(www\.)?/, '')), count('outbound')),
      breakdown('Opened by', tally(views, (v) => v.navType && { navigate: 'link or address', reload: 'reload', back_forward: 'back / forward' }[v.navType]), views.length),
    );

    // What they clicked on the page itself, and where they gave up.
    const details = (name: string, pick = (d: string) => d) => tally(events.filter((e) => e.name === name), (e) => e.detail && pick(e.detail), 10);
    const afterOpen = (d: string) => d.replace(/^\d+s open · /, '');
    const clicked = el(
      'div',
      { class: 'grid' },
      breakdown('Problems picked', details('patch-pick'), count('patch-pick')),
      breakdown('Budget knob turned to', details('knob-turn'), count('knob-turn')),
      breakdown('Case files opened', details('case-open'), count('case-open')),
      breakdown('FAQ questions opened', details('faq-open'), count('faq-open')),
      breakdown('Service rows opened (phone)', details('rack-row'), count('rack-row')),
      breakdown('Service pages followed', details('service-link', (d) => d.split(' · ')[0]), count('service-link')),
      breakdown('Gave up on the form', details('contact-close', afterOpen), count('contact-close')),
      breakdown('Gave up on a call', details('book-close', afterOpen), count('book-close')),
      breakdown('Rage clicks', details('rage-click'), count('rage-click')),
      breakdown('Errors', details('error'), count('error')),
      breakdown('Translated into', details('translate', languageName), count('translate')),
      breakdown('Pages not found', tally(views.filter((v) => v.notFound), (v) => `${v.path} ← ${referrer(v.referrer)}`), views.filter((v) => v.notFound).length),
      breakdown(
        'Left from',
        tally(views.filter((v) => v.lastSection), (v) => `${v.path === '/' ? '' : v.path}#${v.lastSection}`),
        views.filter((v) => v.lastSection).length,
      ),
    );

    const reachedOut = (s: Session) => s.actions.some((a) => REACH.includes(a.name));

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
      el('h2', {}, 'Where they are'),
      el('div', { class: 'where' }, mapPanel(sessions, reachedOut), cityTable(sessions, reachedOut)),
      el('h2', {}, 'Attention and speed'),
      el('div', { class: 'grid pair' }, attentionPanel(views.filter((v) => v.path === '/')), speedPanel(views)),
      el('h2', {}, 'Click heatmap'),
      heatmapPanel(views),
      el('h2', {}, 'Breakdowns'),
      breakdowns,
      el('h2', {}, 'On the page'),
      clicked,
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
      text:
        `${v.path}${v.notFound ? ' (not found)' : ''} · ${duration(v.durationMs)}${v.activeMs !== undefined ? ` (${duration(v.activeMs)} looking)` : ''}` +
        `${v.maxScroll !== undefined ? ` · scrolled ${v.maxScroll}%` : ''}${v.lastSection ? ` · left from #${v.lastSection}` : ''}` +
        `${v.sections ? ` · ${sortSections(Object.entries(v.sections)).map(([id, ms]) => `${id} ${duration(ms)}`).join(', ')}` : ''}` +
        `${v.lcp ? ` · LCP ${speed(v.lcp)}` : ''}${v.rageClicks ? ` · ${v.rageClicks} rage click${v.rageClicks === 1 ? '' : 's'}` : ''}${v.completed ? '' : ' · no exit beacon'}`,
    })),
    ...s.actions.map((a) => ({ t0: a.t0, text: `→ ${label(a.name)}${a.detail ? ` · ${a.detail}` : ''}` })),
  ].sort((a, b) => a.t0 - b.t0);

  const facts: [string, string | undefined, boolean?][] = [
    ['IP', first.ip],
    ['Place', [first.city, first.region, first.country].filter(Boolean).join(', ')],
    ['Network', first.network && `${first.network}${first.asn ? ` (AS${first.asn})` : ''}`],
    ['Opened inside', first.inApp],
    ['Phone model', first.model],
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

// ── Where they are ────────────────────────────────────────────────────────────────────────────

interface Spot {
  lat: number;
  lon: number;
  name: string;
  sessions: number;
  reached: number;
}

// Sessions grouped by the place of their first page, biggest first.
function spots(sessions: Session[], reachedOut: (s: Session) => boolean): Spot[] {
  const by = new Map<string, Spot>();
  for (const s of sessions) {
    const v = s.views[0];
    if (v.lat === undefined || v.lon === undefined) continue;
    const key = v.city ? `${v.city}|${v.countryCode}` : `${v.lat.toFixed(1)}|${v.lon.toFixed(1)}`;
    const spot = by.get(key) ?? { lat: v.lat, lon: v.lon, name: [v.city, v.countryCode].filter(Boolean).join(', ') || 'Unknown place', sessions: 0, reached: 0 };
    spot.sessions++;
    if (reachedOut(s)) spot.reached++;
    by.set(key, spot);
  }
  return [...by.values()].sort((a, b) => b.sessions - a.sessions);
}

interface Topology {
  transform?: { scale: [number, number]; translate: [number, number] };
  arcs: [number, number][][];
}

// TopoJSON stores each border once as an "arc" of small steps. Drawing every arc gives the
// coastlines and borders without assembling countries. Antarctica is left out.
let outlines: Promise<[number, number][][]> | null = null;
function loadOutlines() {
  outlines ??= fetch(atlasUrl)
    .then((r) => r.json() as Promise<Topology>)
    .then((t) => {
      const [sx, sy] = t.transform?.scale ?? [1, 1];
      const [tx, ty] = t.transform?.translate ?? [0, 0];
      return t.arcs
        .map((arc) => {
          let x = 0;
          let y = 0;
          return arc.map(([dx, dy]): [number, number] => {
            x += dx;
            y += dy;
            return [x * sx + tx, y * sy + ty];
          });
        })
        .filter((line) => line.some(([, lat]) => lat > -60));
    })
    .catch(() => []);
  return outlines;
}

// The visible box in map units, fitted to the dots (or the whole world) at a 2:1 shape.
// Longitude is squeezed by cos(latitude) so places near the middle keep their shape.
function frameFor(list: Spot[], world: boolean) {
  let west = -180;
  let east = 180;
  let south = -58;
  let north = 84;
  if (!world && list.length) {
    west = Math.min(...list.map((s) => s.lon));
    east = Math.max(...list.map((s) => s.lon));
    south = Math.min(...list.map((s) => s.lat));
    north = Math.max(...list.map((s) => s.lat));
    const padLon = Math.max(6, (east - west) * 0.2);
    const padLat = Math.max(4, (north - south) * 0.2);
    west -= padLon;
    east += padLon;
    south -= padLat;
    north += padLat;
  }
  const k = Math.cos((((north + south) / 2) * Math.PI) / 180);
  let w = (east - west) * k;
  let h = north - south;
  if (w / h < 2) w = h * 2;
  else h = w / 2;
  const cx = ((east + west) / 2) * k;
  const cy = -(north + south) / 2;
  return { x: cx - w / 2, y: cy - h / 2, w, h, k };
}

function drawMap(lines: [number, number][][], list: Spot[], world: boolean): SVGElement {
  const view = frameFor(list, world);
  const at = (lon: number, lat: number) => `${(lon * view.k).toFixed(2)} ${(-lat).toFixed(2)}`;
  const svg = svgEl('svg', {
    viewBox: `${view.x} ${view.y} ${view.w} ${view.h}`,
    role: 'img',
    'aria-label': `Map of ${list.length} places visits came from. The table beside it has the same numbers.`,
  });
  svg.append(svgEl('path', { class: 'map-land', d: lines.map((line) => `M${line.map(([lon, lat]) => at(lon, lat)).join('L')}`).join('') }));
  const most = list[0]?.sessions ?? 1;
  list.forEach((s, i) => {
    const r = view.h * (0.012 + 0.028 * Math.sqrt(s.sessions / most));
    const [x, y] = at(s.lon, s.lat).split(' ').map(Number);
    const dot = svgEl('circle', { class: `spot ${s.reached ? 'full' : 'ring'}`, cx: String(x), cy: String(y), r: String(r) });
    const title = svgEl('title', {});
    title.textContent = `${s.name}: ${s.sessions} session${s.sessions === 1 ? '' : 's'}, ${s.reached} reached out`;
    dot.append(title);
    svg.append(dot);
    if (i < 6) {
      const text = svgEl('text', { class: 'map-label', x: String(x + r * 1.4), y: String(y + view.h * 0.012), 'font-size': String(view.h * 0.035) });
      text.textContent = s.name;
      svg.append(text);
    }
  });
  return svg;
}

function mapPanel(sessions: Session[], reachedOut: (s: Session) => boolean): HTMLElement {
  const list = spots(sessions, reachedOut);
  const unplaced = sessions.length - list.reduce((n, s) => n + s.sessions, 0);
  let world = false;
  const toggle = el('button', { type: 'button', class: 'map-toggle', 'aria-pressed': 'false' }, 'whole world');
  const frame = el('div', { class: 'map-frame' }, el('p', { class: 'label' }, 'Drawing the map…'));
  const render = async () => frame.replaceChildren(drawMap(await loadOutlines(), list, world));
  toggle.addEventListener('click', () => {
    world = !world;
    toggle.setAttribute('aria-pressed', String(world));
    render();
  });
  render();
  return el(
    'div',
    { class: 'chart lcd map' },
    el('div', { class: 'map-head' }, el('p', { class: 'label' }, `Sessions by place · ${list.length} places${unplaced ? ` · ${unplaced} without a location` : ''}`), toggle),
    frame,
    el('p', { class: 'map-key label' }, el('span', { class: 'key-dot full' }), 'someone reached out', el('span', { class: 'key-dot ring' }), 'visits only'),
  );
}

// City → how many came, how many opened a form or the call dialog, how many reached out.
function cityTable(sessions: Session[], reachedOut: (s: Session) => boolean): HTMLElement {
  const by = new Map<string, { sessions: number; opened: number; reached: number }>();
  for (const s of sessions) {
    const v = s.views[0];
    const name = v.city ? [v.city, v.countryCode].filter(Boolean).join(', ') : (v.country ?? 'Unknown place');
    const c = by.get(name) ?? { sessions: 0, opened: 0, reached: 0 };
    c.sessions++;
    if (s.actions.some((a) => a.name === 'contact-open' || a.name === 'book-open')) c.opened++;
    if (reachedOut(s)) c.reached++;
    by.set(name, c);
  }
  const rows = [...by].sort((a, b) => b[1].sessions - a[1].sessions || b[1].reached - a[1].reached).slice(0, 15);
  const cell = (tag: string, text: string, cls = '') => el(tag, { class: cls }, text);
  return panel(
    'City → enquiry rate',
    rows.length
      ? el(
          'table',
          { class: 'table' },
          el('thead', {}, el('tr', {}, cell('th', 'City'), cell('th', 'Visits', 'num'), cell('th', 'Opened', 'num'), cell('th', 'Reached', 'num'), cell('th', 'Rate', 'num'))),
          el(
            'tbody',
            {},
            ...rows.map(([name, c]) =>
              el(
                'tr',
                {},
                cell('td', name),
                cell('td', String(c.sessions), 'num'),
                cell('td', String(c.opened), 'num'),
                cell('td', String(c.reached), 'num'),
                cell('td', `${Math.round((c.reached / c.sessions) * 100)}%`, `num${c.reached ? ' hot' : ''}`),
              ),
            ),
          ),
        )
      : el('p', { class: 'hint' }, 'Nothing yet.'),
    el('p', { class: 'hint' }, 'Opened: the form or the call dialog. Reached: sent, booked, or tapped WhatsApp, email or phone.'),
  );
}

// ── Click heatmap ─────────────────────────────────────────────────────────────────────────────

// The real page in a frame, at computer (1440px) or phone (390px) width, with every recorded click
// drawn on a canvas laid over it: glows for clicks on buttons and links, rings for dead clicks.
// track.ts stays off inside frames, so showing the page here never adds a visit.
function heatmapPanel(views: VisitRecord[]): HTMLElement {
  const withHeat = views.filter((v) => v.heat?.length);
  if (!withHeat.length) return panel('Clicks on the page', el('p', { class: 'hint' }, 'No clicks recorded yet. They come with the exit numbers when a visitor leaves.'));

  const onPhoneLayout = (v: VisitRecord) => Number(v.viewport?.split('x')[0]) <= 760;
  const pages = tally(withHeat, (v) => v.path, 30).map(([path]) => path);
  let page = pages.includes('/') ? '/' : pages[0];
  let phone = withHeat.filter(onPhoneLayout).length > withHeat.length / 2;

  const select = el('select', { class: 'heat-select', 'aria-label': 'Page' }, ...pages.map((p) => el('option', { value: p }, p))) as HTMLSelectElement;
  select.value = page;
  const layouts = ([['computer', false], ['phone', true]] as const).map(([name, value]) => {
    const button = el('button', { type: 'button', class: 'heat-toggle', 'aria-pressed': String(phone === value) }, name);
    button.addEventListener('click', () => {
      phone = value;
      layouts.forEach((b, i) => b.setAttribute('aria-pressed', String((i === 1) === phone)));
      render();
    });
    return button;
  });
  select.addEventListener('change', () => {
    page = select.value;
    render();
  });

  const summary = el('p', { class: 'hint' });
  const stage = el('div', { class: 'heat-stage' });
  const box = el('div', { class: 'heat-box' }, stage);
  let fit = () => {};
  new ResizeObserver(() => fit()).observe(box);

  function render() {
    const chosen = withHeat.filter((v) => v.path === page && onPhoneLayout(v) === phone);
    const points = chosen.flatMap((v) => v.heat!);
    const dead = points.filter((p) => p.endsWith(':d')).length;
    const bySection = tally(points, (p) => p.split(':')[0], 4).map(([name, n]) => `#${name} ${Math.round((n / points.length) * 100)}%`);
    summary.textContent = points.length
      ? `${points.length} clicks from ${chosen.length} page view${chosen.length === 1 ? '' : 's'} · ${dead} dead (rings) · most: ${bySection.join(', ')}`
      : `No clicks on ${page} on a ${phone ? 'phone' : 'computer'} yet.`;

    const width = phone ? 390 : 1440;
    const frame = el('iframe', { title: `Click heatmap of ${page}`, tabindex: '-1', 'aria-hidden': 'true' }) as HTMLIFrameElement;
    frame.style.width = `${width}px`;
    frame.style.height = '900px';
    stage.replaceChildren(frame);
    fit = () => {
      const scale = Math.min(1, box.clientWidth / width);
      frame.style.transform = `scale(${scale})`;
      stage.style.width = `${width * scale}px`;
      stage.style.height = `${(parseFloat(frame.style.height) || 900) * scale}px`;
    };
    fit();
    frame.addEventListener('load', async () => {
      const doc = frame.contentDocument;
      if (!doc) return;
      await doc.fonts?.ready.catch(() => {});
      await new Promise((r) => setTimeout(r, 300));
      frame.style.height = `${doc.documentElement.scrollHeight}px`;
      fit();
      drawHeat(doc, points);
    });
    frame.src = page;
  }
  render();

  return panel(
    'Clicks on the page',
    el('div', { class: 'heat-controls' }, select, el('div', { class: 'group', role: 'group', 'aria-label': 'Layout' }, ...layouts)),
    summary,
    box,
  );
}

function drawHeat(doc: Document, points: string[]) {
  const root = doc.documentElement;
  // The page's own copper, so the overlay follows the brand and the day or night setting.
  const copper = getComputedStyle(root).getPropertyValue('--copper').trim();
  if (!copper) return;
  // The same copper at zero opacity. Fading to plain `transparent` would pass through black.
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(copper);
  const clear = hex ? `rgba(${parseInt(hex[1], 16)}, ${parseInt(hex[2], 16)}, ${parseInt(hex[3], 16)}, 0)` : 'transparent';
  const boxes = new Map<string, { left: number; top: number; width: number; height: number }>();
  for (const section of doc.querySelectorAll<HTMLElement>('main section, footer, header')) {
    const name = sectionName(section);
    if (!name || boxes.has(name)) continue;
    const r = section.getBoundingClientRect();
    boxes.set(name, { left: r.left + (doc.defaultView?.scrollX ?? 0), top: r.top + (doc.defaultView?.scrollY ?? 0), width: r.width, height: r.height });
  }

  const canvas = doc.createElement('canvas');
  canvas.width = root.scrollWidth;
  canvas.height = root.scrollHeight;
  Object.assign(canvas.style, { position: 'absolute', left: '0', top: '0', width: `${canvas.width}px`, height: `${canvas.height}px`, pointerEvents: 'none', zIndex: '2147483647' });
  canvas.setAttribute('data-heat', String(points.length));
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  for (const point of points) {
    const [name, xs, ys, flag] = point.split(':');
    const b = boxes.get(name);
    if (!b) continue;
    const x = b.left + (Number(xs) / 1000) * b.width;
    const y = b.top + (Number(ys) / 1000) * b.height;
    if (flag === 'd') {
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = copper;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      // Overlapping glows add up, so a busy button burns brighter.
      const glow = ctx.createRadialGradient(x, y, 0, x, y, 30);
      glow.addColorStop(0, copper);
      glow.addColorStop(1, clear);
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  doc.querySelector('[data-heat]')?.remove();
  doc.body.append(canvas);
}

// "hi · Google" → "Hindi · Google".
function languageName(detail: string): string {
  const [code, ...rest] = detail.split(' · ');
  let name = code;
  try {
    name = (code !== 'unknown' && new Intl.DisplayNames(['en'], { type: 'language' }).of(code)) || code;
  } catch {
    // Not a language code we know: keep it as it came.
  }
  return [name, ...rest].join(' · ');
}

// ── Attention and speed ───────────────────────────────────────────────────────────────────────

function sortSections<T>(entries: [string, T][]): [string, T][] {
  const rank = (id: string) => (SECTION_ORDER.includes(id) ? SECTION_ORDER.indexOf(id) : SECTION_ORDER.length);
  return entries.sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
}

// How many home page views reached each section (a second or more in the middle of the screen).
function attentionPanel(home: VisitRecord[]): HTMLElement {
  const timed = home.filter((v) => v.sections);
  const ids = sortSections([...new Set(timed.flatMap((v) => Object.keys(v.sections!)))].map((id): [string, null] => [id, null])).map(([id]) => id);
  const rows = ids.map((id) => {
    const seen = timed.map((v) => v.sections![id] ?? 0).filter((ms) => ms >= 1000);
    const avg = seen.length ? seen.reduce((a, b) => a + b, 0) / seen.length : 0;
    return row(`#${id} · ${duration(avg)} avg`, seen.length, timed.length, `${Math.round((seen.length / timed.length) * 100)}%`);
  });
  return panel(
    'Home page: who reached each section',
    rows.length ? el('ul', { class: 'rows' }, ...rows) : el('p', { class: 'hint' }, 'Nothing yet.'),
    el('p', { class: 'hint' }, `${timed.length} views. Time counts while the section held the middle of the screen.`),
  );
}

// Google's Core Web Vitals, at the 75th percentile like Search Console, for phones and computers.
function speedPanel(views: VisitRecord[]): HTMLElement {
  const metrics: [string, 'lcp' | 'inp' | 'cls' | 'ttfb', number, number][] = [
    ['Largest paint (LCP)', 'lcp', 2500, 4000],
    ['Response to taps (INP)', 'inp', 200, 500],
    ['Layout shift (CLS)', 'cls', 0.1, 0.25],
    ['First byte (TTFB)', 'ttfb', 800, 1800],
  ];
  const groups: [string, VisitRecord[]][] = [
    ['Phones', views.filter((v) => v.device === 'mobile' || v.device === 'tablet')],
    ['Computers', views.filter((v) => v.device === 'desktop')],
  ];
  const show = (field: string, value: number | undefined) => (value === undefined ? '—' : field === 'cls' ? value.toFixed(2) : speed(value));
  const verdict = (value: number | undefined, good: number, poor: number) => (value === undefined ? '' : value <= good ? 'good' : value <= poor ? 'needs work' : 'poor');
  return panel(
    'Page speed on their devices',
    el(
      'table',
      { class: 'table' },
      el('thead', {}, el('tr', {}, el('th', {}, ''), ...groups.map(([name]) => el('th', { class: 'num' }, name)))),
      el(
        'tbody',
        {},
        ...metrics.map(([name, field, good, poor]) =>
          el(
            'tr',
            {},
            el('td', {}, name),
            ...groups.map(([, list]) => {
              const value = p75(list.map((v) => v[field]).filter((n): n is number => n !== undefined));
              const word = verdict(value, good, poor);
              return el('td', { class: `num${word === 'poor' ? ' hot' : ''}`, title: word }, `${show(field, value)}${word ? ` · ${word}` : ''}`);
            }),
          ),
        ),
      ),
    ),
    el('p', { class: 'hint' }, '75th percentile. Good is under 2.5 s, 200 ms and 0.1.'),
  );
}

function p75(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(0.75 * (sorted.length - 1))];
}

// 340 ms, 2.4 s.
function speed(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function svgEl(tag: string, attrs: Record<string, string>): SVGElement {
  const node = document.createElementNS(SVG, tag);
  for (const [name, value] of Object.entries(attrs)) node.setAttribute(name, value);
  return node;
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
