# Cross-Connect Labs website

One-page Astro 7 site for a small studio (the site speaks as "we"). Static pages, no UI framework. The only server code is a small Worker for call booking at `/api/*`.

## Commands

- `npm run dev`: dev server on http://localhost:4321
- `npm run build`: builds to `dist/`
- `npm run check`: `astro check`. Must report 0 errors.
- `npm run og-image`: regenerates `public/og-image.png` (the link preview picture).
- `npm run test:smoke`: Playwright click-through. Needs the dev server or `npm run preview` running. Pass a URL to test another address: `npm run test:smoke -- <url>`.

Run `check` and `test:smoke` before pushing.

## Where things are

- `src/data/site.ts`: all content and contact settings. Put text here, not in components. Placeholders are in `[square brackets]`.
- `src/components/*.astro`: one component per section. Each keeps its own scoped `<style>` and a small TypeScript `<script>`.
- `src/styles/global.css`: colour tokens. `:root` is day, `:root[data-theme='dark']` is night. Shared classes live here too.
- `src/scripts/contact-bus.ts`: `openContact()`. Any `[data-contact]` button opens the dialog, pre-filled from `data-topic`, `data-budget` and `data-message`.
- `src/scripts/booking.ts` + `worker/index.ts`: "hop on a call". Any `[data-book]` button opens the booking dialog. The Worker reads Google Calendar free/busy and books with a Meet link; setup and secrets in `docs/booking.md`. Without the Worker or secrets the dialog falls back to WhatsApp and email.
- `src/scripts/track.ts` + `worker/visits.ts`: the visit log. Every page sends beacons to `/api/ping`, stored in the D1 database `cross-connect-visits`; `/admin` reads them with `TRACKER_KEY`. Record dialog actions with `trackAction()`; new action names go in `visitLog.actions` in `site.ts`. Details in `docs/analytics.md`. Ads tracking is a to-do in `docs/plan.md`, not built.
- `src/pages/services/[slug].astro`: one page per rack module at `/services/<slug>/`, from `services` and `servicePage` in `site.ts`. A new module needs a `slug` and a `services` entry; the sitemap picks it up.
- `src/pages/sitemap.xml.ts`, `src/pages/robots.txt.ts`: add new pages to the sitemap's `paths`. Leave `/admin` out.
- `docs/`: plan, design rules, hosting, research and Docker guides. **Read `docs/design.md` before changing anything visual.**

## Rules

- **Colours:** never hard-code a colour in a component. Use or add a token, defined for both day and night. Check both modes.
- **Brand:** copper `#C2541F` and navy `#14202E`, IBM Plex Mono and Sans. No cyan, teal or amber accents, no grid-line or stripe backgrounds, no logo-pattern backgrounds, no generic "AI template" look.
- **Copy:** keep the patch bay and equipment voice ("patch in", "flip to send", "signal path"). The offer has no minimum budget.
- **Accessibility:** real buttons, `aria-pressed` on toggles, visible focus, respect `prefers-reduced-motion`, no sideways scrolling at 390px.
- **Smoke test:** it must never submit a real enquiry or book a real call. It skips the send step when the contact form is set up, and answers `/api/*` inside the browser for the booking checks and the visit log.
- **Visit log:** never send anything a visitor typed (names, emails, messages) in a beacon.

## Deploy

- **Live site:** Cloudflare Workers, static assets plus `worker/index.ts` for `/api/*` only, a D1 database for the visit log, and a nightly cron that purges it. Google secrets and `TRACKER_KEY` live in the dashboard, never in the repo. Config is in `wrangler.jsonc`; the Worker name `cross-connect-labs` must not change.
- **Branches:** `main` is production, so every push to `main` goes live. Other branches get preview URLs.
- **Node:** pinned in `.node-version`. Astro 7 needs at least 22.22.
- **Headers:** set in `public/_headers` for Cloudflare and in `nginx.conf` for the Docker image. Keep the two in step.
- **Site URL:** `site` in `astro.config.mjs` is the live URL. Update it when a custom domain is added.
