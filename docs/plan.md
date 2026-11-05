# Project plan

Status as of 1 November 2026. Update the checklists as you go.

## What Cross-Connect Labs is

A one-person freelance studio. Services:

- **Websites and web apps**
- **Mobile apps**
- **Online stores** with an admin panel
- **WhatsApp bots**
- **Clinic and doctor bot with a CRM** (appointments, reminders, patient follow-up)
- **AI workflows and agents** (automating repetitive work)
- **Electrical automation:** PLC/SCADA and energy monitoring
- **Small freelance jobs**

## What the website must do

1. Show what you build, with examples of the work.
2. Make it feel easy and cheap to start: **no minimum budget**. The message is "we connect, I look at it, I tell you the cost".
3. Turn visitors into conversations: every section leads to the contact form, which can deliver by form service, WhatsApp or email.
4. Look like nobody else's site (see [design.md](design.md)).

## Decisions so far

| Area | Decision | Why |
| --- | --- | --- |
| Design | **Option B, "patch bay", with day and night modes** | Picked from three mockups after several rounds. Details in [design.md](design.md). |
| Brand | Copper `#C2541F` and navy `#14202E` from the logo set, IBM Plex Mono and Sans | Matches the logo files. |
| Framework | **Astro 7.4**, plain CSS, small TypeScript scripts | Fast static pages, very little JavaScript, easy to add pages later. |
| Fonts | Self-hosted with `@fontsource` | Faster, and no request to Google. |
| Contact | Form service (Web3Forms or Formspree), then WhatsApp, then email | Works without a server. |
| Hosting | **Cloudflare Workers, free plan** | Free, business use allowed, fast everywhere. Vercel's free plan is non-commercial only. See [hosting.md](hosting.md). |
| Branches | `main` is the live site | Every push to `main` goes live. Other branches get preview links. |
| Learning | Docker and Google Cloud Run kept as a side track | See [learn-docker.md](learn-docker.md) and [cloud-run.md](cloud-run.md). |

## Done

- [x] Competitor research (21 companies) and site direction ([research.md](research.md))
- [x] Clickable mockups, three options, Option B day/night approved
- [x] Astro site built: header, hero patch bay, rack (8 services), case files, budget knob, signal path, spec sheet, field reports, FAQ, contact section, contact form, 404 page
- [x] Day/night switch that follows the visitor's system and remembers their choice
- [x] Docker image and Cloud Run guide (for learning)
- [x] Live on Cloudflare: https://crossconnectlabs.com
- [x] Deploys from GitHub: Workers Builds is connected, `main` is the default branch
- [x] Smoke test (`npm run test:smoke`), 30 checks

## Launch checklist: before you share the link

Most of this is in `src/data/site.ts`. Every placeholder is in `[square brackets]`.

- [ ] Your name, city, languages and reply time (`site` block)
- [ ] Availability badge text (`site.availability`; it says "booking projects for december")
- [x] Contact form: WhatsApp +91 79008 42047 with a message typed in, and hello@crossconnectlabs.com (`contact` block)
- [x] Email: hello@crossconnectlabs.com forwards to Gmail through Cloudflare Email Routing (1 Nov 2026)
- [x] Call booking: Google project `cross-connect-labs` published, secrets set with `wrangler secret put`, live (1 Nov 2026)
- [ ] Reply as hello@: Gmail "Send mail as" with `smtp.gmail.com:587` and an app password ([hosting.md](hosting.md#reply-as-hello-gmail-send-mail-as))
- [ ] DNS for sending: edit the SPF TXT record to `v=spf1 include:_spf.mx.cloudflare.net include:_spf.google.com ~all` (keep one SPF record only), and add TXT `_dmarc` = `v=DMARC1; p=none; rua=mailto:hello@crossconnectlabs.com`
- [ ] Rotate the Google keys that were pasted in chat: new client secret (Clients → Add secret, delete the old one), revoke and re-create the refresh token, then `npx wrangler secret put` both ([booking.md](booking.md))
- [ ] Make one test booking from another email address and check the Meet invite arrives, then delete the event
- [ ] Case studies: replace the four examples with real projects and set `example: false`, including real results in place of `[Your measured result]`
- [ ] Field reports (testimonials): real quotes, or remove the section until you have them
- [ ] FAQ: data protection answer and the area you can work on site
- [ ] Official logo SVG files in place of the redrawn ones (`Logo.astro`, `IconMark.astro`, `public/favicon.svg`, `public/apple-touch-icon.png`)
- [ ] Run `npm run test:smoke` and check the site on your phone in both modes

## Next steps

### Soon after launch

- [x] **Own domain.** Buy one (Cloudflare Registrar sells at cost), connect it to the Worker, then update `site` in `astro.config.mjs`. Steps in [hosting.md](hosting.md).
- [x] **Email on your domain.** hello@crossconnectlabs.com is routed to Gmail with Cloudflare Email Routing. Replying as hello@ is still in the launch checklist.
- [x] **Social preview image.** `public/og-image.png` (1200 × 630), made by `npm run og-image`.
- [x] **Analytics.** Our own visit log in D1 with a private dashboard at /admin, ported from ANI / SYSTEMS. No cookies, no third-party scripts. See [analytics.md](analytics.md).
- [ ] **Visit log password.** Run `npx wrangler secret put TRACKER_KEY` so /admin opens ([analytics.md](analytics.md)).
- [x] **Search basics.** `sitemap.xml`, `robots.txt` pointing to it, structured data (ProfessionalService, FAQ), Open Graph and Twitter tags, `noindex` on the 404 and privacy pages, IndexNow for Bing (`npm run indexnow`). Steps for Google and Bing in [search.md](search.md).
- [x] **Site name in search results.** `WebSite` structured data with the name and other spellings, linked to the business entry (`altNames`, `areaServed`, `profiles` in `site.ts`).
- [ ] **One address only.** Today `http://`, `https://www.` and `https://` all answer 200, so search engines see three copies (the canonical tag only hints). In the Cloudflare dashboard for crossconnectlabs.com: SSL/TLS → Edge Certificates → turn on **Always Use HTTPS**; then Rules → Redirect Rules → template **Redirect from WWW to root** (301). Check with `curl -sI http://www.crossconnectlabs.com/`: one 301 to `https://crossconnectlabs.com/`.
- [ ] **Profile links.** Once LinkedIn, GitHub or Instagram pages exist, add their URLs to `profiles` in `site.ts` and link them from the footer.
- [ ] **Google Search Console.** Verification file `public/google3db46dd8c61fef25.html` is live; finish verifying, then submit `https://crossconnectlabs.com/sitemap.xml`. Do the same in Bing Webmaster Tools (it can import from Search Console).
- [ ] **Google Business Profile**, if you want local clients to find you.
- [x] **Custom booking dialog.** "No idea what you're looking for? Let's hop on a call" in the hero and contact section. On-brand dialog with Google Calendar behind it (free/busy, events with a Meet link) through `worker/index.ts`. Chosen over Cal.com because Cal.com's brand colours and branding removal are paid. Live; setup in [booking.md](booking.md).

### Ads tracking (before running paid ads)

The visit log already records `utm_*` tags, enquiries and bookings. What paid ads need on top:

- [ ] **Pick the ad network** (Google Ads, Meta, or both). Everything below depends on it.
- [ ] **Keep ad-click IDs.** Add `gclid`, `gbraid`, `wbraid` (Google), `fbclid` (Meta) and `msclkid` (Microsoft) to `CAMPAIGN` in `src/scripts/track.ts` and `worker/visits.ts`. Today the Worker drops them.
- [ ] **Remember the first campaign per visitor.** Store the first-seen `utm_*` and click ID in `localStorage` and send it with every action, so a call booked days after the ad click still counts for that ad.
- [ ] **Campaign results on /admin.** A table of campaign → sessions → forms sent → calls booked → WhatsApp taps, plus a field for ad spend to show cost per enquiry.
- [ ] **UTM links for every ad.** For example `?utm_source=google&utm_medium=cpc&utm_campaign=<name>&utm_content=<ad>`. Most ad networks can add them automatically.
- [ ] **The ad network's conversion tag** (Google tag with conversion actions, or Meta Pixel), fired on `contact-send` and `booked`. Without it the network can't tell which clicks became enquiries, so it can't optimise.
  - Add its hosts to any Content-Security-Policy, and keep `public/_headers` and `nginx.conf` in step.
  - It sets cookies, so rewrite the privacy page and add a consent banner for visitors from the EU and UK. India's DPDP Act expects a clear notice too.
  - Better option to look at: server-side conversions from the Worker (Google Ads offline conversions with the `gclid`, Meta Conversions API). They need no browser tag and are not blocked by ad blockers.
- [ ] **Smoke test:** block the ad tag's requests too, so test runs never count as conversions.

### Later

- [ ] **Case study pages** (`/work/<project>`), written as Markdown files with Astro content collections.
- [x] **Service pages** at `/services/<slug>/`, one per rack module, linked from the Rack. Each has its own title, description, FAQ and structured data (`services` in `site.ts`).
- [ ] **Read the service pages through** and fix anything that isn't how you work, especially the FAQ answers on costs, WhatsApp rules, data and app store timing.
- [ ] **PLC & SCADA page.** Only in the FAQ and the form topics so far; it needs a rack module and a `services` entry.
- [ ] **Notes or blog**, for short write-ups of what you built.
- [ ] **Other languages**, if your clients need them.

### Learning track

- [ ] Docker exercises in [learn-docker.md](learn-docker.md)
- [ ] Deploy the same site to Google Cloud Run by hand with [cloud-run.md](cloud-run.md). It's a separate copy; the live site stays on Cloudflare.

## Open questions

- Which domain name?
- Do you want to show starting prices, or keep "tell me your budget"?
- Which past projects can you show, and can you name the clients?

## Reference

- Research report (private to your claude.ai account): https://claude.ai/artifact/VHvfUrTp1fjpgoAaxTG7Cc
- Design mockups, Options A, B and B day/night (private to your claude.ai account): https://claude.ai/artifact/1kZ6ci4MZyTkJiYjmyR3Z8
