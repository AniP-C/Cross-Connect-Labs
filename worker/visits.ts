// The visit log, the server half. The browser half is src/scripts/track.ts, the dashboard is /admin.
//
// /api/ping   POST  public: records one page view, the exit numbers for it, or one action
// /api/stats  POST  private: returns the log for /admin, only with the right TRACKER_KEY
//
// Rows live in the D1 database `cross-connect-visits` (table in migrations/0001_visits.sql).
// A nightly cron deletes rows older than visitLog.keepDays. Setup and field list: docs/analytics.md.
//
// The public path is /api/ping, not /api/track: ad blockers match the word "track" even on the
// site's own address, and a blocked beacon fails without a sound.
import { visitLog } from '../src/data/site';

// The parts of the D1 API used here. https://developers.cloudflare.com/d1/worker-api/
export interface D1Database {
  prepare(sql: string): D1Statement;
}
interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  run(): Promise<{ meta: { changes?: number } }>;
  all<T>(): Promise<{ results: T[] }>;
}

export interface VisitEnv {
  DB?: D1Database;
  // The password for /admin. While it is unset, /api/stats refuses everyone.
  TRACKER_KEY?: string;
}

export type Action = keyof typeof visitLog.actions;

// What the browser sends. Everything in it is untrusted.
interface Payload {
  type?: 'view' | 'end' | 'event';
  id?: unknown;
  session?: unknown;
  visitor?: unknown;
  viewId?: unknown;
  t0?: unknown;
  [field: string]: unknown;
}

// One page view: what the browser told us, what Cloudflare adds, and the exit numbers once the
// visitor leaves. /admin reads this shape (src/scripts/admin.ts).
export interface VisitRecord {
  kind: 'view';
  id: string;
  session: string;
  visitor: string;
  ts: string;
  t0: number;

  ip: string;
  ua: string;
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  device: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
  bot: boolean;
  // Opened inside another app's browser: Instagram, LinkedIn, Facebook… These often break forms.
  inApp?: string;
  // The phone's model ("SM-S918B", "Pixel 8"), where Chrome tells us. iPhones never do.
  model?: string;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  geoTz?: string;
  // Rough, city-level spot from Cloudflare, rounded to about a kilometre. Drawn on the /admin map.
  lat?: number;
  lon?: number;
  // The network the visit came from: "Reliance Jio", "Infosys Ltd", "Google Cloud".
  network?: string;
  asn?: number;

  path: string;
  title?: string;
  // The 404 page was shown for this path.
  notFound?: boolean;
  // How the page was opened: navigate, reload or back_forward.
  navType?: string;
  referrer?: string;
  // utm_* and ref from the address, if it had any.
  params?: Record<string, string>;
  // 1 for the page the visitor landed on.
  pageIndex?: number;
  // How many sessions this browser has had here.
  visitCount?: number;
  screen?: string;
  viewport?: string;
  dpr?: number;
  lang?: string;
  languages?: string;
  tz?: string;
  // Minutes ahead of UTC, so /admin can show the visitor's own clock.
  tzOffset?: number;
  theme?: string;
  touch?: boolean;
  cores?: number;
  memory?: number;
  connection?: string;

  // From the exit beacon. A view without `completed` was cut off before it could send one.
  durationMs?: number;
  // Time the tab was actually visible.
  activeMs?: number;
  maxScroll?: number;
  clicks?: number;
  keys?: number;
  // Rapid repeat clicks on one spot: something looked clickable and wasn't, or was slow.
  rageClicks?: number;
  // Milliseconds each section (by id) held the middle of the screen while the tab was visible.
  sections?: Record<string, number>;
  // The section on screen when the visitor left.
  lastSection?: string;
  // Click spots for the heatmap: "section:x:y", plus ":d" for a click on nothing clickable.
  // x and y run 0–1000 across and down the section.
  heat?: string[];
  // Page speed on the visitor's own device. lcp, inp, ttfb and loadMs in milliseconds; cls has no unit.
  lcp?: number;
  inp?: number;
  cls?: number;
  ttfb?: number;
  loadMs?: number;
  exit?: string;
  completed: boolean;
  updatedAt?: string;
}

// Something the visitor did: opened the contact form, booked a call, tapped WhatsApp.
export interface EventRecord {
  kind: 'event';
  id: string;
  session: string;
  visitor: string;
  // The page view it happened on.
  viewId?: string;
  ts: string;
  t0: number;
  name: Action;
  detail?: string;
  path: string;
  ip: string;
  country?: string;
  countryCode?: string;
}

export interface StatsResponse {
  ok: true;
  days: number;
  truncated: boolean;
  generatedAt: string;
  records: VisitRecord[];
  events: EventRecord[];
}

const DAY = 86_400_000;
// Anything bigger is not a beacon from our own pages.
const MAX_BODY = 8_192;
// A t0 further off than this is a broken clock or a made-up payload.
const MAX_SKEW = 2 * DAY;
const MAX_ROWS = 5_000;
const MAX_DAYS = 400;
const CAMPAIGN = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref'];

export async function ping(request: Request, env: VisitEnv): Promise<Response> {
  if (request.method !== 'POST') return status(405);
  if (!env.DB) return status(503);
  if (!sameOrigin(request)) return status(403);
  if (Number(request.headers.get('Content-Length') ?? 0) > MAX_BODY) return status(413);

  const raw = await request.text().catch(() => '');
  if (raw.length > MAX_BODY) return status(413);
  let body: Payload;
  try {
    body = JSON.parse(raw) as Payload;
  } catch {
    return status(400);
  }
  if (!body || typeof body !== 'object') return status(400);

  const { id, session, visitor } = body;
  if (!isId(id) || !isId(session) || !isId(visitor)) return status(400);
  const now = Date.now();
  const t0 = typeof body.t0 === 'number' && Math.abs(now - body.t0) <= MAX_SKEW ? Math.round(body.t0) : now;
  const who = { id, session, visitor, t0 };

  try {
    if (body.type === 'view') {
      // A repeated view beacon keeps the row that is already there, which may have exit numbers.
      await write(env.DB, 'view', viewRecord(body, who, request), 'DO NOTHING');
    } else if (body.type === 'end') {
      const exit = compact({
        durationMs: num(body.durationMs, 0, DAY),
        activeMs: num(body.activeMs, 0, DAY),
        maxScroll: num(body.maxScroll, 0, 100),
        clicks: num(body.clicks, 0, 100_000),
        keys: num(body.keys, 0, 100_000),
        rageClicks: num(body.rageClicks, 0, 10_000),
        sections: sections(body.sections),
        lastSection: str(body.lastSection, 40),
        heat: heat(body.heat),
        lcp: num(body.lcp, 0, 120_000),
        inp: num(body.inp, 0, 60_000),
        cls: num(body.cls, 0, 50, false),
        ttfb: num(body.ttfb, 0, 120_000),
        loadMs: num(body.loadMs, 0, 600_000),
        exit: str(body.exit, 32),
        completed: true,
        updatedAt: new Date(now).toISOString(),
      });
      // Merges into the view's row. If the view never arrived (offline, cold start), the exit
      // numbers still get a row of their own instead of being lost.
      await write(env.DB, 'view', { ...viewRecord(body, who, request), ...exit }, 'DO UPDATE SET data = json_patch(data, ?6)', exit);
    } else if (body.type === 'event') {
      if (!isAction(body.name)) return status(400);
      const geo = readGeo(request);
      const event: EventRecord = compact({
        kind: 'event' as const,
        ...who,
        viewId: isId(body.viewId) ? body.viewId : undefined,
        ts: new Date(t0).toISOString(),
        name: body.name,
        detail: str(body.detail, 512),
        path: str(body.path, 512) ?? '/',
        ip: readIp(request),
        country: geo.country,
        countryCode: geo.countryCode,
      });
      await write(env.DB, 'event', event, 'DO NOTHING');
    } else {
      return status(400);
    }
  } catch (err) {
    console.error('visit log write failed', err);
    return status(500);
  }
  return status(204);
}

export async function stats(request: Request, env: VisitEnv): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
  // An unset key must never mean an open dashboard.
  if (!env.TRACKER_KEY) return json({ error: 'TRACKER_KEY is not set, so the log stays shut. See docs/analytics.md.' }, 503);
  if (!env.DB) return json({ error: 'The visit log database is not connected. See docs/analytics.md.' }, 503);
  if (!sameOrigin(request)) return json({ error: 'forbidden' }, 403);

  // The key comes in the body, not the address, so it stays out of history and logs.
  const body = (await request.json().catch(() => null)) as { key?: unknown; days?: unknown } | null;
  if (typeof body?.key !== 'string' || !sameKey(body.key, env.TRACKER_KEY)) return json({ error: 'wrong key' }, 401);

  const days = Math.min(MAX_DAYS, Math.max(1, Math.round(Number(body.days) || 30)));
  const { results } = await env.DB.prepare('SELECT kind, data FROM visits WHERE t0 >= ? ORDER BY t0 DESC LIMIT ?')
    .bind(Date.now() - days * DAY, MAX_ROWS + 1)
    .all<{ kind: string; data: string }>();

  const records: VisitRecord[] = [];
  const events: EventRecord[] = [];
  for (const row of results.slice(0, MAX_ROWS)) {
    try {
      if (row.kind === 'event') events.push(JSON.parse(row.data) as EventRecord);
      else records.push(JSON.parse(row.data) as VisitRecord);
    } catch {
      // A broken row costs that row only.
    }
  }

  const response: StatsResponse = {
    ok: true,
    days,
    truncated: results.length > MAX_ROWS,
    generatedAt: new Date().toISOString(),
    records,
    events,
  };
  return json(response);
}

// Deletes rows older than visitLog.keepDays. Run by the nightly cron in wrangler.jsonc.
export async function purge(env: VisitEnv): Promise<number> {
  if (!env.DB) return 0;
  const { meta } = await env.DB.prepare('DELETE FROM visits WHERE t0 < ?').bind(Date.now() - visitLog.keepDays * DAY).run();
  return meta.changes ?? 0;
}

async function write(db: D1Database, kind: 'view' | 'event', record: VisitRecord | EventRecord, onConflict: string, patch?: object) {
  const values: unknown[] = [record.id, record.t0, record.session, record.visitor, JSON.stringify(record)];
  if (patch) values.push(JSON.stringify(patch));
  await db
    .prepare(`INSERT INTO visits (id, kind, t0, session, visitor, data) VALUES (?1, '${kind}', ?2, ?3, ?4, ?5) ON CONFLICT(id) ${onConflict}`)
    .bind(...values)
    .run();
}

function viewRecord(body: Payload, who: { id: string; session: string; visitor: string; t0: number }, request: Request): VisitRecord {
  const ua = request.headers.get('User-Agent') ?? '';
  const geo = readGeo(request);
  return compact({
    kind: 'view' as const,
    ...who,
    ts: new Date(who.t0).toISOString(),
    ip: readIp(request),
    ua: ua.slice(0, 512),
    ...parseAgent(ua, request.headers, str(body.platformVersion, 32)),
    model: str(body.model, 64),
    ...geo,

    path: str(body.path, 512) ?? '/',
    title: str(body.title, 200),
    notFound: body.notFound === true ? true : undefined,
    navType: str(body.navType, 16),
    referrer: str(body.referrer, 512),
    params: campaign(body.params),
    pageIndex: num(body.pageIndex, 1, 10_000),
    visitCount: num(body.visitCount, 1, 100_000),
    screen: str(body.screen, 24),
    viewport: str(body.viewport, 24),
    dpr: num(body.dpr, 0, 10, false),
    lang: str(body.lang, 32),
    languages: str(body.languages, 120),
    tz: str(body.tz, 64),
    tzOffset: num(body.tzOffset, -900, 900),
    theme: str(body.theme, 16),
    touch: typeof body.touch === 'boolean' ? body.touch : undefined,
    cores: num(body.cores, 0, 512),
    memory: num(body.memory, 0, 1024, false),
    connection: str(body.connection, 24),
    completed: false,
  });
}

// Only the campaign fields, never the whole query string, which can carry anything.
function campaign(params: unknown): Record<string, string> | undefined {
  if (!params || typeof params !== 'object') return undefined;
  const out: Record<string, string> = {};
  for (const key of CAMPAIGN) {
    const value = str((params as Record<string, unknown>)[key], 120);
    if (value) out[key] = value;
  }
  return Object.keys(out).length ? out : undefined;
}

// Section id → milliseconds. Ids are our own, so anything that doesn't look like one is dropped.
function sections(value: unknown): Record<string, number> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const out: Record<string, number> = {};
  for (const [id, ms] of Object.entries(value).slice(0, 24)) {
    const n = num(ms, 0, DAY);
    if (/^[a-z0-9-]{1,40}$/.test(id) && n) out[id] = n;
  }
  return Object.keys(out).length ? out : undefined;
}

// Heatmap spots. Only the exact shape track.ts sends gets through, at most 80 per page.
function heat(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const out = value.filter((v): v is string => typeof v === 'string' && /^[a-z0-9-]{1,40}:\d{1,4}:\d{1,4}(:d)?$/.test(v)).slice(0, 80);
  return out.length ? out : undefined;
}

function readIp(request: Request): string {
  return (request.headers.get('CF-Connecting-IP') ?? request.headers.get('X-Forwarded-For')?.split(',')[0] ?? 'unknown').trim().slice(0, 64);
}

// Cloudflare works out the place from the IP: often a city, sometimes only the country. A hint, not an address.
function readGeo(request: Request) {
  const cf = (request as Request & { cf?: Record<string, unknown> }).cf ?? {};
  const code = typeof cf.country === 'string' && /^[A-Z]{2}$/.test(cf.country) ? cf.country : undefined;
  let country: string | undefined;
  try {
    country = code && new Intl.DisplayNames(['en'], { type: 'region' }).of(code);
  } catch {
    country = code;
  }
  // Two decimals is about a kilometre: enough for a map of cities, not a street address.
  const coord = (v: unknown, max: number) => {
    const n = typeof v === 'string' || typeof v === 'number' ? Number(v) : NaN;
    return Number.isFinite(n) && Math.abs(n) <= max ? Math.round(n * 100) / 100 : undefined;
  };
  return {
    city: str(cf.city, 80),
    region: str(cf.region, 80),
    country,
    countryCode: code,
    geoTz: str(cf.timezone, 64),
    lat: coord(cf.latitude, 90),
    lon: coord(cf.longitude, 180),
    network: str(cf.asOrganization, 120),
    asn: num(cf.asn, 1, 4_294_967_295),
  };
}

// The same-origin check the booking endpoint uses. Beacons often send no Origin, which is fine.
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

// Ids become primary keys, so they get the strictest check of anything here.
function isId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(value);
}

// Action names are a closed set: the endpoint is public, and an open name would fill the log with junk.
function isAction(value: unknown): value is Action {
  return typeof value === 'string' && Object.hasOwn(visitLog.actions, value);
}

function str(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, max);
  return trimmed || undefined;
}

function num(value: unknown, min: number, max: number, round = true): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) return undefined;
  return round ? Math.round(value) : value;
}

// Drops undefined fields, so the stored JSON stays small.
function compact<T extends object>(obj: T): T {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as T;
}

// Compares without stopping at the first difference, so timing says nothing about the key.
function sameKey(a: string, b: string): boolean {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  for (let i = 0; i < Math.max(left.length, right.length); i++) diff |= (left[i] ?? 0) ^ (right[i] ?? 0);
  return diff === 0;
}

function status(code: number): Response {
  return new Response(null, { status: code, headers: { 'Cache-Control': 'no-store' } });
}

function json(data: unknown, code = 200): Response {
  return new Response(JSON.stringify(data), {
    status: code,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' },
  });
}

// A small user-agent reader. It covers the browsers this site sees and says "Unknown" rather
// than guess. Client Hints, where Chrome sends them, beat the frozen UA string.
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegram|linkedinbot|slackbot|discordbot|embedly|pinterest|applebot|petalbot|semrush|ahrefs|mj12|dotbot|dataforseo|headless|lighthouse|puppeteer|playwright|curl|wget|python-requests|axios|go-http|java\//i;

// Most specific first: Edge and Opera also say Chrome, and Chrome also says Safari.
const BROWSERS: [string, RegExp][] = [
  ['Edge', /Edg(?:e|A|iOS)?\/([\d.]+)/],
  ['Opera', /(?:OPR|Opera)\/([\d.]+)/],
  ['Samsung Internet', /SamsungBrowser\/([\d.]+)/],
  ['Vivaldi', /Vivaldi\/([\d.]+)/],
  ['Brave', /Brave\/([\d.]+)/],
  ['DuckDuckGo', /DuckDuckGo\/([\d.]+)/],
  ['Chrome', /(?:Chrome|CriOS)\/([\d.]+)/],
  ['Firefox', /(?:Firefox|FxiOS)\/([\d.]+)/],
  ['Safari', /Version\/([\d.]+).*Safari/],
];

const WINDOWS: Record<string, string | undefined> = { '10.0': '10 / 11', '6.3': '8.1', '6.2': '8', '6.1': '7' };

const SYSTEMS: [string, RegExp, ((v: string) => string)?][] = [
  ['iPadOS', /iPad.*OS ([\d_]+)/, (v) => v.replace(/_/g, '.')],
  ['iOS', /(?:iPhone |CPU )OS ([\d_]+)/, (v) => v.replace(/_/g, '.')],
  ['Android', /Android ([\d.]+)/],
  ['Chrome OS', /CrOS \w+ ([\d.]+)/],
  ['macOS', /Mac OS X ([\d_.]+)/, (v) => v.replace(/_/g, '.')],
  // Windows reports a kernel version; nobody calls their laptop "NT 10.0".
  ['Windows', /Windows NT ([\d.]+)/, (v) => WINDOWS[v] ?? v],
  ['Linux', /Linux|X11/],
];

// Apps that open links in their own browser say so in the user agent. Checked before BOT, whose
// "whatsapp" and "telegram" are the link-preview fetchers, not people.
const IN_APP: [string, RegExp][] = [
  ['Instagram', /Instagram/],
  ['Facebook', /FBAN|FBAV|FB_IAB|FBIOS/],
  ['LinkedIn', /LinkedInApp/],
  ['Snapchat', /Snapchat/],
  ['X / Twitter', /Twitter/],
  ['Threads', /Barcelona/],
  ['Telegram', /Telegram(?!Bot)/],
  ['Google app', /\bGSA\//],
  ['Line', /\bLine\//],
  ['Android app (WebView)', /; wv\)/],
];

function parseAgent(
  ua: string,
  headers: Headers,
  platformVersion?: string,
): Pick<VisitRecord, 'browser' | 'browserVersion' | 'os' | 'osVersion' | 'device' | 'bot' | 'inApp'> {
  const inApp = IN_APP.find(([, re]) => re.test(ua))?.[0];
  if (inApp) return { ...parseBrowser(ua, headers, platformVersion), inApp };
  return parseBrowser(ua, headers, platformVersion);
}

function parseBrowser(ua: string, headers: Headers, platformVersion?: string): Pick<VisitRecord, 'browser' | 'browserVersion' | 'os' | 'osVersion' | 'device' | 'bot'> {
  if (!ua) return { browser: 'Unknown', browserVersion: '', os: 'Unknown', osVersion: '', device: 'unknown', bot: false };
  if (BOT.test(ua)) return { browser: 'Bot / crawler', browserVersion: '', os: 'Unknown', osVersion: '', device: 'bot', bot: true };

  let browser = 'Unknown';
  let browserVersion = '';
  for (const [name, re] of BROWSERS) {
    const m = re.exec(ua);
    if (!m) continue;
    browser = name;
    browserVersion = m[1] ?? '';
    break;
  }
  let os = 'Unknown';
  let osVersion = '';
  for (const [name, re, clean] of SYSTEMS) {
    const m = re.exec(ua);
    if (!m) continue;
    os = name;
    osVersion = m[1] ? (clean ? clean(m[1]) : m[1]) : '';
    break;
  }
  const platform = headers.get('Sec-CH-UA-Platform')?.replace(/"/g, '');
  if (platform && platform !== 'Unknown') {
    os = platform;
    osVersion = headers.get('Sec-CH-UA-Platform-Version')?.replace(/"/g, '') || osVersion;
  }
  // The browser asked itself (track.ts). On Windows, platform version 13 and up is Windows 11.
  if (platformVersion && /^\d+(\.\d+)*$/.test(platformVersion)) {
    const major = Number(platformVersion.split('.')[0]);
    if (os === 'Windows') osVersion = major >= 13 ? '11' : major > 0 ? '10' : osVersion;
    else if (os === 'Android' || os === 'macOS' || os === 'Chrome OS') osVersion = platformVersion;
  }

  const tablet = /iPad|Tablet|PlayBook|Silk/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua));
  const mobile = headers.get('Sec-CH-UA-Mobile') === '?1' || /Mobi|iPhone|iPod|Android.*Mobile|Windows Phone/i.test(ua);
  return { browser, browserVersion, os, osVersion, device: tablet ? 'tablet' : mobile ? 'mobile' : 'desktop', bot: false };
}
