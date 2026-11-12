# Visit log

Our own record of who visits the site and what they do, with a private dashboard at **/admin**. It is ported from the tracker on ANI / SYSTEMS (`AniP-C/Ani-Portfolio-Web`), moved from Netlify Blobs to Cloudflare D1, and extended with this site's actions. There are no cookies and no third-party scripts.

Ads tracking (ad-click IDs, conversion tags) is not built yet. It is in the to-do list in [plan.md](plan.md).

## How it works

```
every page ── view / end / event ──► POST /api/ping ──► D1: cross-connect-visits (table visits)
/admin ──── key ───────────────────► POST /api/stats ─► rows for the range ─► counted in the browser
cron 03:00 UTC ─────────────────────────────────────► deletes rows older than 90 days
```

| File | What it does |
| --- | --- |
| `src/scripts/track.ts` | The browser half. Started by `BaseLayout.astro` on every page. Exports `trackAction()` for the dialogs. |
| `worker/visits.ts` | `/api/ping` (public, writes one row), `/api/stats` (needs `TRACKER_KEY`), the nightly purge, user-agent parsing. **The record types live here.** |
| `worker/index.ts` | Routes the two paths and runs the cron. |
| `migrations/0001_visits.sql` | The table. |
| `src/pages/admin.astro` + `src/scripts/admin.ts` | The dashboard. |
| `src/data/site.ts` → `visitLog` | Days kept, the action names the Worker accepts, and their labels on /admin. |

The public path is `/api/ping`, not `/api/track`: ad blockers match the word "track" even on the site's own address.

## What it records

**Page view** (one per page load), sent when the page opens:

- page path and title, the referrer, and `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` and `ref` from the address
- visitor id (random, in `localStorage`), session id (per tab, in `sessionStorage`), visit number and page number in the session
- screen and window size, pixel ratio, language, time zone, day or night, touch screen, CPU cores, memory, connection type
- how the page was opened (link, reload, back button), and whether it was the 404 page
- the phone model and real OS version, where Chrome gives them (`navigator.userAgentData`, no prompt). Safari and Firefox don't, so iPhones show no model.
- added by the Worker: IP address, city, region, country, time zone, a rough spot for the map (latitude and longitude rounded to 2 decimals, about a kilometre) and the network name and number (`asOrganization`, `asn`), all from Cloudflare; browser, OS, device type, a bot flag, and the app it was opened inside (Instagram, Facebook, LinkedIn, Snapchat, X, Threads, Telegram, Google app, Line, or an Android app's WebView)

**Exit numbers**, sent when the tab is hidden or closed and merged into the same row:

- time on the page, time the tab was visible, deepest scroll, clicks, key presses and rage clicks (three quick clicks on one spot)
- time per section: whichever `main section` crosses the middle of the screen gets the time, while the tab is visible. Sections without an id are named from their heading (`aria-labelledby="signal-title"` → `signal`). Also the section on screen when they left.
- page speed on their device: LCP, INP and CLS (Core Web Vitals, measured with the browser's own `PerformanceObserver`), time to first byte and load time

**Actions** (names in `visitLog.actions`):

| Action | When | Detail |
| --- | --- | --- |
| `contact-open` | The contact form opens | Topic, and where the button was (`from hero`, `from call bar`…) |
| `contact-send` | The form is sent | How (`whatsapp`, `email`, `form`), topic and budget. Never the name or message. |
| `book-open` | The call dialog opens | Where the button was |
| `book-fallback` | Booking is offline and WhatsApp/email is shown instead | Why |
| `booked` | A call is booked | The time picked. Never the name or email. |
| `whatsapp`, `email`, `phone` | A `wa.me`, `mailto:` or `tel:` link is clicked | Where, or the address |
| `copy-email` | Someone copies exactly an email address | The address |
| `outbound` | A link to another site is clicked | The address, without its query string |
| `contact-close` | The contact form closes without being sent | Seconds open, topic, budget, how many of the 3 fields had something in them, whether they pressed send or went to the call dialog. Never the contents. |
| `book-close` | The call dialog closes without a booking | Seconds open and how far they got: loading, looked at times, picked a time, details filled (count only), or saw WhatsApp/email |
| `patch-pick`, `patch-flip` | A fault finder problem is picked; the switch is flipped | The problem; the fix on the card |
| `knob-turn` | The budget knob is turned to a size | The size |
| `case-open` | A case file is opened | Its title |
| `faq-open` | An FAQ question is opened (not the one open on load) | The question |
| `rack-row` | A service row is opened on a phone | The service |
| `service-link` | A link to a service page is followed | The page and where the link was |
| `theme`, `menu` | Day/night switched; phone menu opened | `to night` / `to day` |
| `rage-click` | Three quick clicks on one spot | Where, and the element's own text (never a form field's) |
| `error` | A script error, a file that failed to load, or the contact form or booking failing | The message and file. At most 5 per page. |

Actions from the page's own controls (`patch-pick` to `rage-click`, and `error`) are sent once per page for each value, with `trackOnce()`, so turning the knob back and forth is one row per size, not twenty. Report a failure from code with `trackError()`.

**Not recorded:** anything typed into a form. Nothing at all when the browser sends Do Not Track or Global Privacy Control, on `localhost`, or on `/admin`.

## Setup, once

The D1 database `cross-connect-visits` exists (APAC) and is bound as `DB` in `wrangler.jsonc`. Preview links from other branches use a second database, `cross-connect-visits-preview` (the `previews` block), so test visits stay out of the live log. Both have the table.

1. **Create the table** (already done for the live database; run it again only for a new one):

   ```bash
   npx wrangler d1 migrations apply cross-connect-visits --remote
   ```

   For the preview database: `npx wrangler d1 execute cross-connect-visits-preview --remote --file migrations/0001_visits.sql`.

2. **Set the dashboard password.** Until it is set, `/api/stats` answers 503 and /admin stays shut:

   ```bash
   npx wrangler secret put TRACKER_KEY
   ```

   Paste a long random string. Keep it in your password manager.

3. **Deploy** (push to `main`), then open `https://crossconnectlabs.com/admin` and paste the key.

## Using /admin

The page looks like the 404 page until you enter the key. The key is kept in that browser's local storage until you press **lock**.

- **Range:** 7, 30, 90 or 365 days. The log only keeps 90.
- **bots:** shows or hides crawler sessions (hidden by default).
- **Tiles:** page views, sessions, unique browsers, returning visitors, average session, average time looking, average scroll, sessions that left at once, messages sent, calls booked.
- **Towards an enquiry:** how many sessions opened the form, sent it, opened the call dialog, booked, or tapped WhatsApp.
- **Where they are:** a map of sessions by city, fitted to where visits came from (**whole world** zooms out), with filled dots where someone reached out and rings where they only looked. Beside it, **City → enquiry rate**: visits, how many opened the form or call dialog, how many reached out (sent, booked, or tapped WhatsApp, email or phone), and the rate. The outlines are Natural Earth's 1:110m countries from the `world-atlas` package, built into a file of our own and only loaded on /admin.
- **Attention and speed:** for home page views, the share that reached each section and the average time there; page speed at the 75th percentile for phones and computers, marked good, needs work or poor by Google's limits.
- **Breakdowns:** pages, where people came from, campaign, country, city, network, device, phone model, app it was opened inside, browser, OS and version, screen, language, time zone, day or night, actions, topics, where buttons were pressed, links followed out, how pages were opened.
- **On the page:** problems picked, budget sizes, case files, FAQ questions, service rows and pages, where people gave up on the form or a call, rage clicks, errors, pages not found (with where the link came from), and the section people left from.
- **Actions and sessions:** the latest actions, and each session with its pages, times, scroll and the full device details.

Use `utm_*` tags on links you share, for example `https://crossconnectlabs.com/?utm_source=linkedin&utm_campaign=launch`. They show under **Campaign**.

## Health check

If nothing shows up, test the endpoint before touching code. A `204` means the log is working:

```bash
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://crossconnectlabs.com/api/ping -H 'Content-Type: application/json' -d '{"type":"view","id":"probe0000001","session":"probe0000001","visitor":"probe0000001","path":"/probe"}'
```

`503` means the database binding is missing. `404` means the request never reached the Worker.

To look at rows directly:

```bash
npx wrangler d1 execute cross-connect-visits --remote --command "SELECT kind, datetime(t0/1000,'unixepoch') AS at, json_extract(data,'$.path') AS path, json_extract(data,'$.name') AS action FROM visits ORDER BY t0 DESC LIMIT 20"
```

## Testing locally

The log is off on `localhost`. To try the whole thing with a local database:

```bash
npx wrangler d1 migrations apply cross-connect-visits --local
```

```bash
npx wrangler dev --var TRACKER_KEY:local-testing
```

Open the address it prints. In the browser console run `localStorage.setItem('cc-track-force', '1')` and reload. Then open `/admin` and use the key `local-testing`. `npm run dev` has no Worker, so there /admin only shows that the log isn't answering.

`npm run test:smoke` forces the log on, answers `/api/ping` and `/api/stats` inside the browser, and checks the beacons and the dashboard. It never writes to the real log.

## Privacy

The privacy page (`privacy` in `site.ts`) says we keep a simple log of visits (pages, device, rough area and network, page speed), that it never includes what people type, that we don't share it, and that we delete it after 90 days. Update that line if the log starts recording something new.

Nothing here asks the visitor anything: no prompt, no banner, no cookie, no outside script. Keep it that way. Exact location (the browser's geolocation), fingerprinting (canvas, fonts, audio) and session recording tools are left out on purpose. IP addresses are personal data. Keep the 90-day purge on, and delete a person's rows if they ask:

```bash
npx wrangler d1 execute cross-connect-visits --remote --command "DELETE FROM visits WHERE json_extract(data,'$.ip') = '<their IP>'"
```
