# Cross-Connect Labs website

The one-page site for Cross-Connect Labs: websites, apps, online stores, WhatsApp bots, clinic CRMs, AI automation and PLC/SCADA work. It uses the "patch bay" design with a day/night switch.

**Live:** https://crossconnectlabs.com (Cloudflare, deploys from `main`)

Built with [Astro](https://astro.build) 7. Pages are pre-built to plain HTML, so the site loads fast and needs no server.

## Docs

| File | What's in it |
| --- | --- |
| [docs/plan.md](docs/plan.md) | Decisions so far, launch checklist, next steps, open questions |
| [docs/design.md](docs/design.md) | Design idea, colours, day/night, sections, interaction rules, what to avoid |
| [docs/hosting.md](docs/hosting.md) | How the Cloudflare deploy works, own domain, email options and costs |
| [docs/research.md](docs/research.md) | Summary of the competitor research |
| [docs/learn-docker.md](docs/learn-docker.md) | Docker course built around this repo |
| [docs/cloud-run.md](docs/cloud-run.md) | Manual deploy to Google Cloud Run (learning track) |
| [CLAUDE.md](CLAUDE.md) | Project notes for Claude Code, if you use it |

## Develop on your computer

You need **Node.js 22.22 or newer** and **Git**.

- **Node:** the exact version is in `.node-version`. If you use a version manager (fnm, nvm, Volta), install that version. Otherwise install the current Node 22 LTS from https://nodejs.org.
- **Editor:** VS Code will suggest the Astro extension when you open the folder.

Get the code (once):

```bash
git clone https://github.com/AniP-C/Cross-Connect-Labs.git
```

```bash
cd Cross-Connect-Labs
```

```bash
npm install
```

Start the dev server, then open http://localhost:4321. Changes show up as you save.

```bash
npm run dev
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with live reload on port 4321 |
| `npm run build` | Builds the site into `dist/` |
| `npm run preview` | Serves the built `dist/` on port 4321 |
| `npm run check` | Type-checks the project |
| `npm run test:smoke` | Clicks through the site in a real browser (needs the dev server or preview running) |

The smoke test needs a browser downloaded once:

```bash
npx playwright install chromium
```

### Git workflow

`main` is the live site: **every push to `main` goes live in about a minute.**

For small changes, work on `main`:

```bash
git pull
```

Make your changes, check them, then commit and push:

```bash
npm run check
```

```bash
git add -A
```

```bash
git commit -m "Describe the change"
```

```bash
git push
```

For bigger changes, use a branch. Pushing a branch gives you a **preview link** in Cloudflare (Workers & Pages, then cross-connect-labs, then Deployments) without touching the live site:

```bash
git switch -c my-change
```

```bash
git push -u origin my-change
```

When it looks right, merge it into `main` with a pull request on GitHub.

The branch `claude/youthful-cerf-x45vpr` is where the site was first built. It matches `main`, so you can delete it on GitHub once you no longer need it.

## Edit the content

Almost everything you will want to change is in **`src/data/site.ts`**: your name, location, reply time, the availability badge, services, patch bay options, case studies, budget knob text, spec sheet, testimonials and FAQ.

Every placeholder is written in `[square brackets]`. The full launch checklist is in [docs/plan.md](docs/plan.md).

- **Your photo:** put it in `public/` (for example `public/me.jpg`) and follow the comment in `src/components/SpecSheet.astro`.
- **Case studies:** the four projects are examples. Replace them in `site.ts` and set `example: false` on real ones.
- **Logo:** `src/components/Logo.astro` and `src/components/IconMark.astro` redraw the logo set. Swap in the official SVG exports when you have them. `public/favicon.svg` and `public/apple-touch-icon.png` are the app icon.
- **Domain:** `site` in `astro.config.mjs` is the live address, used for canonical and social links. Change it when you connect your own domain.

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

The site follows the visitor's system setting on the first visit. The DAY/NIGHT switch in the header overrides it, and the choice is remembered. All colours are CSS variables in `src/styles/global.css`: `:root` holds day mode and `:root[data-theme='dark']` holds night mode. Brand copper is `#C2541F` and navy is `#14202E`, taken from the logo set. More in [docs/design.md](docs/design.md).

## Project layout

```text
src/
  data/site.ts              all editable content and contact settings
  layouts/BaseLayout.astro  page shell, meta tags, fonts, theme start-up
  pages/index.astro         the page, built from the components below
  pages/404.astro           "not found" page
  components/               Header, Hero, PatchBay, Rack, CaseFiles, Pricing,
                            SignalPath, SpecSheet, FieldReports, Faq,
                            ContactSection, ContactDialog, Logo, IconMark, Rails
  scripts/contact-bus.ts    lets any button open the contact form, pre-filled
  styles/global.css         colour tokens for day and night, shared styles
public/                     favicon, touch icon, robots.txt, _headers (Cloudflare)
tests/smoke.cjs             browser smoke test (npm run test:smoke)
docs/                       plan, design, hosting, research, Docker guides
wrangler.jsonc              Cloudflare Workers settings
.node-version               Node version for Cloudflare and version managers
Dockerfile, nginx.conf      container image (learning track, see docs/cloud-run.md)
```

## Deploy

- **Live site:** Cloudflare Workers builds and deploys every push to `main`. Settings, rollback and custom domain steps are in [docs/hosting.md](docs/hosting.md).
- **Learning track:** the `Dockerfile` builds the site with Node and serves it with nginx on port 8080. [docs/cloud-run.md](docs/cloud-run.md) deploys it to Google Cloud Run by hand.
