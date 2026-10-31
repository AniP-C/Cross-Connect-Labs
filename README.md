# Cross-Connect Labs website

The one-page site for Cross-Connect Labs: websites, apps, online stores, WhatsApp bots, clinic CRMs, AI automation and PLC/SCADA work. It uses the "patch bay" design with a day/night switch.

Built with [Astro](https://astro.build) 7. Pages are pre-built to plain HTML, so the site loads fast and can be hosted on any static host.

## Run it

You need Node.js 22.22 or newer.

```bash
npm install
```

```bash
npm run dev
```

Open http://localhost:4321. Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Builds the site into `dist/` |
| `npm run preview` | Serves the built site locally |
| `npm run check` | Type-checks the project |

## Edit the content

Almost everything you will want to change is in **`src/data/site.ts`**: your name, location, reply time, the availability badge, services, patch bay options, case studies, budget knob text, spec sheet, testimonials and FAQ.

Every placeholder is written in `[square brackets]`. Search the project for `[` to find them all before launch.

Other things to replace:

- **Your photo**: put it in `public/` (for example `public/me.jpg`) and follow the comment in `src/components/SpecSheet.astro`.
- **Case studies**: the four projects are examples. Replace them in `site.ts` and set `example: false` on real ones.
- **Logo**: `src/components/Logo.astro` and `src/components/IconMark.astro` redraw the logo set. Swap in the official SVG exports when you have them. `public/favicon.svg` and `public/apple-touch-icon.png` are the app icon.
- **Domain**: set `site` in `astro.config.mjs` to the live URL (the `*.pages.dev` address or your own domain) so canonical and social links are correct. While it is unset, those tags are left out.

## Contact form

The form opens from the patch bay switch, the rack modules, the budget knob and the plug button. Set it up in the `contact` block of `src/data/site.ts`. It uses the first option that is filled in:

1. **Form service** (recommended): enquiries arrive in your inbox without a server.
   - [Web3Forms](https://web3forms.com): set `formEndpoint` to `https://api.web3forms.com/submit` and `formAccessKey` to your key.
   - [Formspree](https://formspree.io): set `formEndpoint` to your form URL and leave `formAccessKey` empty.
2. **WhatsApp**: set `whatsapp` to your number, digits only with the country code (for example `919876543210`). The form opens WhatsApp with the message already written.
3. **Email**: set `email`. The form opens the visitor's email app with the message ready.

Until one of these is set, the form shows the visitor their message to copy and tells them nothing was sent.

Also set `whatsappDisplay` and `emailDisplay`, which are shown in the "Let's connect." section.

## Day and night

The site follows the visitor's system setting on the first visit. The DAY/NIGHT switch in the header overrides it, and the choice is remembered. All colours are CSS variables in `src/styles/global.css`: `:root` holds day mode and `:root[data-theme='dark']` holds night mode. Brand copper is `#C2541F` and navy is `#14202E`, taken from the logo set.

## Project layout

```text
src/
  data/site.ts           all editable content and contact settings
  layouts/BaseLayout.astro  page shell, meta tags, fonts, theme start-up
  pages/index.astro      the page, built from the components below
  pages/404.astro        "not found" page
  components/            Header, Hero, PatchBay, Rack, CaseFiles, Pricing,
                         SignalPath, SpecSheet, FieldReports, Faq,
                         ContactSection, ContactDialog, Logo, IconMark, Rails
  scripts/contact-bus.ts lets any button open the contact form, pre-filled
  styles/global.css      colour tokens for day and night, shared styles
public/                  favicon, touch icon, robots.txt, _headers (Cloudflare)
```

## Deploy

### Live site: Cloudflare Pages

The site is hosted on Cloudflare Pages (free plan, commercial use allowed). Cloudflare builds it from GitHub:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node.js version | read from `.node-version` (no environment variable needed) |

- **Publishing:** every push to `main` goes live in about a minute.
- **Previews:** a push to any other branch gets its own preview URL and does not touch the live site.
- **Rollback:** in the Cloudflare dashboard, open the project's **Deployments** and use **Rollback** on an older one.
- **Headers:** `public/_headers` sets caching for `/_astro/` files and basic security headers. Cloudflare serves `404.html` for unknown pages.

The free plan allows 500 builds a month across all sites in the account, one build at a time.

### Learning option: Google Cloud Run with Docker

See **[DEPLOY.md](DEPLOY.md)** for a step-by-step manual guide. The `Dockerfile` builds the site with Node and serves it with nginx on port 8080 (`nginx.conf`).

Any other static host also works with build command `npm run build` and output folder `dist`.
