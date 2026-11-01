// The Cloudflare Worker for the site. Static files in dist/ are served straight from the ASSETS
// binding; only /api/* reaches this code (see run_worker_first in wrangler.jsonc).
//
// /api/slots  GET   free call times from Google Calendar, as UTC ISO strings
// /api/book   POST  books one of them as a calendar event with a Google Meet link
//
// Setup, Google credentials and secrets: docs/booking.md.
import { booking, site } from '../src/data/site';

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GOOGLE_REFRESH_TOKEN?: string;
  // Optional. Defaults to the main calendar of the Google account.
  GOOGLE_CALENDAR_ID?: string;
}

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    // Google Search Console checks its verification file at the exact .html address, but the
    // asset server redirects *.html to the address without it. Serve it in place instead.
    if (/^\/google[0-9a-f]+\.html$/.test(pathname)) {
      return env.ASSETS.fetch(new Request(new URL(pathname.slice(0, -'.html'.length), request.url), request));
    }
    if (!pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REFRESH_TOKEN) {
      return json({ error: 'booking is not set up' }, 503);
    }
    try {
      if (pathname === '/api/slots' && request.method === 'GET') return await slots(env);
      if (pathname === '/api/book' && request.method === 'POST') return await book(request, env);
      return json({ error: 'not found' }, 404);
    } catch (err) {
      console.error('booking failed', err);
      return json({ error: 'calendar unavailable' }, 502);
    }
  },
};

async function slots(env: Env): Promise<Response> {
  const candidates = candidateSlots(Date.now());
  if (!candidates.length) return json({ minutes: booking.minutes, slots: [] });
  const busy = await freeBusy(env, candidates[0], candidates[candidates.length - 1] + booking.minutes * MINUTE);
  const free = candidates.filter((start) => isFree(busy, start));
  return json({ minutes: booking.minutes, slots: free.map((start) => new Date(start).toISOString()) });
}

async function book(request: Request, env: Env): Promise<Response> {
  // Only the site's own pages may book: same origin, JSON body.
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: 'forbidden' }, 403);
  if (!request.headers.get('Content-Type')?.includes('application/json')) return json({ error: 'expected JSON' }, 415);

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const text = (key: string, max: number) => (typeof body?.[key] === 'string' ? (body[key] as string).trim().slice(0, max) : '');
  const name = text('name', 80);
  const email = text('email', 254);
  const note = text('note', 1000);
  const start = Date.parse(text('start', 40));

  // Bots fill the hidden field. Answer as if it worked and book nothing.
  if (body?.botcheck) return json({ ok: true });
  if (!name || !EMAIL.test(email)) return json({ error: 'name and email needed' }, 400);
  if (!candidateSlots(Date.now()).includes(start)) return json({ error: 'not a bookable time' }, 400);

  const end = start + booking.minutes * MINUTE;
  if (!isFree(await freeBusy(env, start, end), start)) return json({ error: 'taken' }, 409);

  const calendar = encodeURIComponent(env.GOOGLE_CALENDAR_ID || 'primary');
  const event = (await google(env, `/calendars/${calendar}/events?conferenceDataVersion=1&sendUpdates=all`, {
    summary: `${booking.eventTitle}: ${name}`,
    description: [`Booked on the ${site.name} website.`, `Name: ${name}`, `Email: ${email}`, note && `\n${note}`].filter(Boolean).join('\n'),
    start: { dateTime: new Date(start).toISOString() },
    end: { dateTime: new Date(end).toISOString() },
    attendees: [{ email, displayName: name }],
    conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
  })) as { hangoutLink?: string };

  return json({ ok: true, start: new Date(start).toISOString(), meet: event.hangoutLink });
}

// Every start time in the booking window, in UTC milliseconds, from the hours in site.ts.
function candidateSlots(now: number): number[] {
  const toMinutes = (hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const first = toMinutes(booking.dayStart);
  const last = toMinutes(booking.dayEnd) - booking.minutes;
  const earliest = now + booking.noticeHours * 60 * MINUTE;
  const today = new Date(now + zoneOffset(now) * MINUTE);
  const out: number[] = [];

  for (let d = 0; d <= booking.daysAhead; d++) {
    const midnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() + d);
    if (!booking.days.includes(new Date(midnight).getUTCDay())) continue;
    const offset = zoneOffset(midnight + 12 * 60 * MINUTE);
    for (let t = first; t <= last; t += booking.minutes) {
      const start = midnight + (t - offset) * MINUTE;
      if (start >= earliest && start < now + (booking.daysAhead + 1) * DAY) out.push(start);
    }
  }
  return out;
}

// Minutes the booking time zone is ahead of UTC at a moment, e.g. 330 for Asia/Kolkata.
function zoneOffset(at: number): number {
  const name = new Intl.DateTimeFormat('en-US', { timeZone: booking.timeZone, timeZoneName: 'longOffset' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')?.value;
  const m = /GMT([+-])(\d{1,2}):?(\d{2})?/.exec(name ?? '');
  return m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
}

function isFree(busy: [number, number][], start: number): boolean {
  const end = start + booking.minutes * MINUTE;
  return busy.every(([from, to]) => to <= start || from >= end);
}

async function freeBusy(env: Env, from: number, to: number): Promise<[number, number][]> {
  const id = env.GOOGLE_CALENDAR_ID || 'primary';
  const res = (await google(env, '/freeBusy', {
    timeMin: new Date(from).toISOString(),
    timeMax: new Date(to).toISOString(),
    items: [{ id }],
  })) as { calendars?: Record<string, { busy?: { start: string; end: string }[]; errors?: unknown[] }> };
  const cal = res.calendars?.[id];
  if (!cal || cal.errors?.length) throw new Error(`freeBusy: ${JSON.stringify(cal?.errors ?? 'no calendar')}`);
  return (cal.busy ?? []).map((b) => [Date.parse(b.start), Date.parse(b.end)]);
}

async function google(env: Env, path: string, body: unknown): Promise<unknown> {
  const res = await fetch(`https://www.googleapis.com/calendar/v3${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken(env)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Google ${path}: ${res.status} ${await res.text()}`);
  return res.json();
}

// Access tokens last an hour; keep one per Worker instance.
let cached: { token: string; expires: number } | undefined;

async function accessToken(env: Env): Promise<string> {
  if (cached && cached.expires > Date.now() + MINUTE) return cached.token;
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID!,
      client_secret: env.GOOGLE_CLIENT_SECRET!,
      refresh_token: env.GOOGLE_REFRESH_TOKEN!,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error(`Google token: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: data.access_token, expires: Date.now() + data.expires_in * 1000 };
  return cached.token;
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
  });
}
