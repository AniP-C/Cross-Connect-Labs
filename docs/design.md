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

There are more tokens for hardware details: screws, jacks, sockets, knobs, switches, cables.

## How day/night works

1. **Before the page draws:** a small inline script in `BaseLayout.astro` sets `data-theme` on `<html>`. It uses the saved choice (`localStorage` key `cc-theme`), or the system setting on a first visit.
2. **The switch:** the DAY/NIGHT switch in `Header.astro` changes the theme and saves the choice.
3. **Mode-specific content:** use the classes `.only-day` and `.only-night` to show something in one mode only.

## Page sections, top to bottom

| Section | Component | What it does |
| --- | --- | --- |
| Header | `Header.astro` | Logo, menu, "online" light (hidden under 1180px), an "In a hurry? Book a call" button (`data-book`), DAY/NIGHT switch. On phones (760px and under) it is one row: logo, switch without its word, and a `menu` button that opens a sheet of the sections as patch jacks (`phone` in `site.ts`). The header slides away while you scroll down and returns on the way up. The call button moves to a bar fixed at the bottom ("Book a call" and "Patch in"), which shows once the hero has scrolled away and steps aside at the contact section. |
| Hero | `Hero.astro` + `PatchBay.astro` | "Plug in your problem. I'll wire the fix." Fault finder on a faint circuit-trace background: "What's going wrong?" lists five problems as keys with status lights; picking one runs a short copper cable into the "We'd build" card, which shows the fix, what it does and the time (`patches` and `patchHeads` in `site.ts`). "Flip to send" in the card opens the contact form already filled in. A copper torch glow follows the mouse. On phones the intro is one line (`phone.lede`), the service list and call line are hidden, the keys sit in two columns, and a sixth dashed key, "Not sure yet" (`patchUnsure`), turns the switch into "Flip to book", which opens the call dialog. |
| Team and clients | `PatchedIn.astro` | "Our team's experience includes": a strip under the hero that scrolls sideways. Faceplate cards with screws for the companies the team has worked at, with a caption line below. Groups come from `patchedIn.groups`; a short list repeats so the loop never shows a gap. Each plate lights up (LED on, copper edge) as it passes the middle of the strip. Pauses on hover and on focus. With reduced motion it stops and wraps. Edit `patchedIn` in `site.ts`. |
| Services | `Rack.astro` | "The Rack.", with a plain "our services" label above it (`rack` in `site.ts`). Eight rack modules, each with a "patch in" button that opens the form with that topic, and a quieter "spec sheet" link (and the module name) to its service page. On phones the grid is replaced by rows (code, name, build time) that open on tap, one at a time, with `aria-expanded`. |
| Work | `CaseFiles.astro` | Case files: a list on the left, details on the right. Five real projects; mark any placeholder with `example: true`. On phones the script moves the details panel right under the picked row. |
| Pricing | `Pricing.astro` | Budget knob: turn it from tiny to large. The message is "No minimum budget." On phones the knob shrinks and the four sizes become a row of buttons under it. |
| Process | `SignalPath.astro` | How a project runs, step by step. |
| ~~About~~ | removed | Site speaks as "we"; no photo or about section. |
| Field reports | `FieldReports.astro` | Six short notes on what our builds have done, taken from the real projects (`reports` in `site.ts`). Generic on purpose: no client names or quotes. On phones the cards are a strip you swipe, with a `01 / 06` counter. |
| FAQ | `Faq.astro` | Native `<details>` items. |
| Contact | `ContactSection.astro` | "Let's connect." with a plug button. |
| Form | `ContactDialog.astro` | Native `<dialog>`. Any button with `data-contact` opens it (see `src/scripts/contact-bus.ts`). |
| Call booking | `ContactDialog.astro` + `src/scripts/booking.ts` | Second `<dialog>`, sharing the form's styles. Any button with `data-book` opens it: "No idea what you're looking for? Let's hop on a call", and "Talk it through on a free call" under the enquiry form, which closes the form and carries the topic and message into the call note. Day and time buttons use `aria-pressed`. See [booking.md](booking.md). |
| Service pages | `src/pages/services/[slug].astro` | One page per module at `/services/<slug>/`: breadcrumb, module code, a plain h1, a copper "patch in" button and the call link, and a screwed-on spec sheet with an LCD readout. Then what's included, who it fits, related case files, the module's own FAQ (`Faq.astro` with `items`), links to the other modules, and the contact section. Header and footer links point back to `/#…` there (`home={false}`). |
| Rails | `Rails.astro` | Rack rails at the page edges on screens 1280px and wider. |

## Interaction rules

- **Opening the contact form:** any button can open it with `data-contact`. Pre-fill it with `data-topic`, `data-budget` or `data-message`, or call `openContact({...})` from a script.
- **Small scripts:** each interactive part has its own `<script>` in its component. There is no UI framework.
- **Mouse effects:** the torch and the cursor ring (`Cursor.astro`, a thin copper ring that trails the normal pointer and widens over anything clickable) only run on devices with a mouse. The ring is off for reduced motion.
- **Reduced motion:** animations stop when the visitor asks for reduced motion.
- **Keyboard and screen readers:** every control is a real `<button>` with `aria-pressed` where it toggles. There is a skip link, and focus rings stay visible.

## Layout

- **Container:** `.wrap`, with side gutters of `clamp(16px, 4vw, 56px)`.
- **Phone headings:** section headings stack below 760px.
- **No sideways scrolling** at any width. The smoke test checks this at 360px, 390px and 1440px.
- **Phones (760px and under):** sections start 56px apart, every button and link is at least 44px tall, and the page stays under 8,000px at 390px. The smoke test checks all three, and that every fault finder key is on the first screen.
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
