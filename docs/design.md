# Design

The approved design is **Option B, "patch bay", with day and night modes**. The mockups (private to your claude.ai account) are at https://claude.ai/artifact/1kZ6ci4MZyTkJiYjmyR3Z8. The live site is the reference now.

## The idea

The site is a piece of studio and electrical hardware: a patch bay. The visitor plugs their problem into what you build, and a cable connects them. This joins the two sides of the business, software and electrical work, in one image. Copy and labels sound like equipment: "patch in", "flip to send", "signal path", "spec sheet", "field reports", "E404 · NO SIGNAL".

## Brand

| | Value |
| --- | --- |
| Copper | `#C2541F` (logo, cables, LEDs, buttons) |
| Navy | `#14202E` (logo text in day mode) |
| Logo | Copper ring with a power symbol as the "o", a cable, and a copper "labs" pill with white text |
| Fonts | **IBM Plex Mono** for headings, labels and readouts; **IBM Plex Sans** for body text |

## Colours (day and night)

All colours are CSS variables in `src/styles/global.css`:

- `:root` is **day**.
- `:root[data-theme='dark']` is **night**, and it only overrides what changes.

**Never hard-code a colour in a component.** Use a variable, or add one to both blocks.

| Token | Day | Night | Used for |
| --- | --- | --- | --- |
| `--bg` | `#eeeff1` | `#18181b` | Page background |
| `--panel` | `#f7f8fa` | `#202024` | Hardware panels |
| `--text` | `#15171c` | `#f3f3f4` | Headings |
| `--body` | `#3b3f48` | `#d2d2d6` | Body text |
| `--muted` | `#5f6570` | `#9c9ca4` | Secondary text |
| `--copper` | `#c2541f` | `#c2541f` | Fills, cables, buttons |
| `--copper-text` | `#a3401a` | `#ec7a48` | Copper text (darker in day mode, lighter at night, so it is readable) |
| `--led` | `#c2541f` | `#e46a34` | Status lights |
| `--lcd` | `#17191e` | `#0c0c0e` | Dark readout screens (dark in both modes) |

There are more tokens for hardware details: screws, jacks, knobs, switches, cables, traces.

## How day/night works

1. **Before the page draws:** a small inline script in `BaseLayout.astro` sets `data-theme` on `<html>`. It uses the saved choice (`localStorage` key `cc-theme`), or the system setting on a first visit.
2. **The switch:** the DAY/NIGHT switch in `Header.astro` changes the theme and saves the choice.
3. **Mode-specific content:** use the classes `.only-day` and `.only-night` to show something in one mode only.

## Page sections, top to bottom

| Section | Component | What it does |
| --- | --- | --- |
| Header | `Header.astro` | Logo, menu, "online" light, DAY/NIGHT switch. On phones the menu becomes a second row that scrolls sideways. |
| Hero | `Hero.astro` + `PatchBay.astro` | "Plug in your problem. I'll wire the fix." Pick a problem and a build: the cable moves and the readout updates. "Flip to send" opens the contact form already filled in. A copper torch glow follows the mouse. The panel has a faint circuit-trace pattern. |
| Team and clients | `PatchedIn.astro` | "Our team's experience includes": a strip under the hero that scrolls sideways. Faceplate cards with screws for the companies the team has worked at, with a caption line below. Groups come from `patchedIn.groups`; a short list repeats so the loop never shows a gap. Pauses on hover, on focus and with its own `aria-pressed` button. With reduced motion it stops and wraps. Edit `patchedIn` in `site.ts`. |
| Services | `Rack.astro` | Eight rack modules, each with a "patch in" button that opens the form with that topic. |
| Work | `CaseFiles.astro` | Case files: a list on the left, details on the right. Five real projects; mark any placeholder with `example: true`. |
| Pricing | `Pricing.astro` | Budget knob: turn it from tiny to large. The message is "No minimum budget." |
| Process | `SignalPath.astro` | How a project runs, step by step. |
| ~~About~~ | removed | Site speaks as "we"; no photo or about section. |
| Testimonials | `FieldReports.astro` | Client quotes (placeholders). |
| FAQ | `Faq.astro` | Native `<details>` items. |
| Contact | `ContactSection.astro` | "Let's connect." with a plug button. |
| Form | `ContactDialog.astro` | Native `<dialog>`. Any button with `data-contact` opens it (see `src/scripts/contact-bus.ts`). |
| Call booking | `ContactDialog.astro` + `src/scripts/booking.ts` | Second `<dialog>`, sharing the form's styles. Any button with `data-book` opens it: "No idea what you're looking for? Let's hop on a call", and "Talk it through on a free call" under the enquiry form, which closes the form and carries the topic and message into the call note. Day and time buttons use `aria-pressed`. See [booking.md](booking.md). |
| Rails | `Rails.astro` | Rack rails at the page edges on screens 1280px and wider. |

## Interaction rules

- **Opening the contact form:** any button can open it with `data-contact`. Pre-fill it with `data-topic`, `data-budget` or `data-message`, or call `openContact({...})` from a script.
- **Small scripts:** each interactive part has its own `<script>` in its component. There is no UI framework.
- **Mouse effects:** the torch only runs on devices with a mouse (`pointer: fine`).
- **Reduced motion:** animations stop when the visitor asks for reduced motion.
- **Keyboard and screen readers:** every control is a real `<button>` with `aria-pressed` where it toggles. There is a skip link, and focus rings stay visible.

## Layout

- **Container:** `.wrap`, with side gutters of `clamp(16px, 4vw, 56px)`.
- **Phone headings:** section headings stack below 760px.
- **No sideways scrolling** at any width. The smoke test checks this at 390px and 1440px.
- **Hero headline:** has fixed line breaks and is sized `clamp(40px, 5.2vw, 76px)` so it always breaks the same way.

## What to avoid

You rejected these during the mockup rounds:

- Anything that looks like a generic AI or template site: soft gradients, glass cards, emoji icons, "Get started" and "Learn more" button pairs
- Grid-line backgrounds and the usual two-button hero
- The logo repeated as a background pattern
- Horizontal stripe lines across panels
- Cyan, teal and amber accents. Stay with the logo's copper and navy.

## Adding something new

1. **Content:** put text in `src/data/site.ts`, not in the component.
2. **Colours:** use existing tokens, and check the result in **both** day and night.
3. **Contact buttons:** reuse `.cable-link` and add `data-contact`.
4. **Check before pushing:** run `npm run check` and `npm run test:smoke`. Add a check to `tests/smoke.cjs` if you add an interaction.
