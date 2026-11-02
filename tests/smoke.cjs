// Smoke test: opens the site in Chromium and clicks through the main features.
//
// One-time setup:  npx playwright install chromium
// Start the site:  npm run dev        (or: npm run build && npm run preview)
// Then run:        npm run test:smoke
// Other address:   npm run test:smoke -- https://crossconnectlabs.com/
// Screenshots:     set SHOTS=some-folder to save them there.
//
// It never sends a real enquiry or books a real call. If the contact form is set up (form service,
// WhatsApp or email in src/data/site.ts), the send step is skipped. Booking is tested
// against a stand-in API inside the browser.

const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const URL = process.argv[2] || 'http://localhost:4321/';
const SHOTS = process.env.SHOTS;
const results = [];
let failed = 0;

const ok = (name, cond, extra = '') => {
  if (!cond) failed++;
  results.push(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`);
};
const skip = (name, why) => results.push(`SKIP  ${name}  (${why})`);
const shot = async (target, name, options = {}) => {
  if (!SHOTS) return;
  fs.mkdirSync(SHOTS, { recursive: true });
  await target.screenshot({ path: path.join(SHOTS, `${name}.png`), ...options });
};

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const watch = (page, label) => {
    page.on('console', (m) => m.type() === 'error' && errors.push(`${label}: ${m.text()}`));
    page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  };

  // Layout: both themes, desktop and phone.
  for (const [label, width, height] of [['desktop', 1440, 900], ['phone', 390, 844]]) {
    for (const theme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width, height }, colorScheme: theme });
      const page = await ctx.newPage();
      watch(page, `${label}/${theme}`);
      await page.goto(URL, { waitUntil: 'networkidle' });
      const t = await page.evaluate(() => document.documentElement.dataset.theme);
      ok(`${label}/${theme}: theme follows the system setting`, t === theme, t);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      ok(`${label}/${theme}: no sideways scrolling`, over <= 0, `${over}px`);
      await shot(page, `${label}-${theme}`, { fullPage: true });
      await ctx.close();
    }
  }

  // Interactions: desktop, day mode.
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  const page = await ctx.newPage();
  watch(page, 'interactions');
  await page.goto(URL, { waitUntil: 'networkidle' });

  // Patch bay: pick the second problem; the card shows its fix.
  const key = page.locator('[data-patchbay] .key[data-index="1"]');
  const fromLabel = (await key.locator('.problem').textContent()).trim();
  const toLabel = await key.getAttribute('data-fix');
  const toTopic = await key.getAttribute('data-topic');
  await key.click();
  ok('patch bay: picked problem is pressed', (await key.getAttribute('aria-pressed')) === 'true');
  ok('patch bay: only one problem pressed', (await page.locator('[data-patchbay] .key[aria-pressed="true"]').count()) === 1);
  ok('patch bay: card shows the fix', (await page.textContent('[data-readout="fix"]')) === toLabel);
  ok('patch bay: card says what it does', (await page.textContent('[data-readout="does"]')) === (await key.getAttribute('data-does')));

  // Flip switch opens the contact form, filled in from the patch bay.
  await page.click('[data-flip]');
  await page.waitForTimeout(900);
  const dialogOpen = () => page.evaluate(() => document.querySelector('dialog').open);
  const checkedTopic = () => page.evaluate(() => document.querySelector('input[name="topic"]:checked')?.value);
  ok('flip switch: contact form opens', await dialogOpen());
  ok('flip switch: topic filled in', (await checkedTopic()) === toTopic, await checkedTopic());
  const message = await page.inputValue('textarea[name="message"]');
  ok('flip switch: message filled in', message.toLowerCase().includes(fromLabel.toLowerCase()), message);
  await shot(page, 'contact-form');

  // Validation: sending with no name marks the field.
  await page.fill('input[name="name"]', '');
  await page.click('[data-send]');
  ok('form: empty name is flagged', (await page.getAttribute('input[name="name"]', 'aria-invalid')) === 'true');
  ok('form: shows a message', ((await page.textContent('[data-note]')) || '').trim().length > 0);

  const configured = await page.evaluate(() => {
    const d = document.querySelector('dialog').dataset;
    return Boolean(d.endpoint || d.whatsapp || d.email);
  });
  if (configured) {
    skip('form: send', 'contact form is set up, so no real enquiry is sent');
    await page.click('[data-contact-dialog] .close');
  } else {
    await page.fill('input[name="name"]', 'Smoke Test');
    await page.fill('input[name="contact"]', 'test@example.com');
    await page.click('[data-send]');
    ok('form: not set up, so it shows the message to copy', await page.isVisible('[data-done-copy]'));
    await page.click('[data-contact-dialog] .back');
  }
  ok('form: closes', !(await dialogOpen()));

  // Rack: a "patch in" button opens the form with its topic.
  const patchIn = page.locator('#services .cable-link').nth(4);
  const rackTopic = await patchIn.getAttribute('data-topic');
  await patchIn.click();
  ok('rack: "patch in" opens the form with its topic', (await dialogOpen()) && (await checkedTopic()) === rackTopic, rackTopic);
  await page.keyboard.press('Escape');

  // Call booking. The browser answers /api/* itself here, so nothing is ever booked.
  const bookOpen = () => page.evaluate(() => document.querySelector('[data-book-dialog]').open);
  await page.route('**/api/slots', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html>' }));
  await page.click('#top [data-book]');
  await page.waitForSelector('[data-book-fallback]:not([hidden])');
  ok('booking: "hop on a call" opens the call dialog', await bookOpen());
  const waLink = await page.locator('[data-book-fallback] a[href*="wa.me"]').count();
  ok('booking: without the booking API it offers WhatsApp or email', waLink + (await page.locator('[data-book-fallback] a[href^="mailto:"]').count()) > 0);
  await page.keyboard.press('Escape');

  const hour = 3600e3;
  const slot = (h) => new Date(Math.ceil((Date.now() + h * hour) / hour) * hour).toISOString();
  await page.unroute('**/api/slots');
  await page.route('**/api/slots', (r) => r.fulfill({ json: { minutes: 30, slots: [slot(26), slot(27), slot(50)] } }));
  await page.route('**/api/book', (r) => r.fulfill({ json: { ok: true } }));
  await page.click('#contact [data-book]');
  await page.waitForSelector('[data-book-picker]:not([hidden])');
  ok('booking: shows days and times', (await page.locator('[data-book-days] .pick').count()) >= 2 && (await page.locator('[data-book-times] .pick').count()) >= 1);
  const time = page.locator('[data-book-times] .pick').first();
  await time.click();
  ok('booking: chosen time is pressed', (await time.getAttribute('aria-pressed')) === 'true');
  await shot(page, 'booking');
  await page.fill('[data-book-form] input[name="name"]', 'Smoke Test');
  await page.fill('[data-book-form] input[name="email"]', 'test@example.com');
  await page.click('[data-book-send]');
  await page.waitForSelector('[data-book-done]:not([hidden])');
  ok('booking: confirms the call', ((await page.textContent('[data-book-done-text]')) || '').includes('test@example.com'));
  await page.click('[data-book-done] .back');
  ok('booking: closes', !(await bookOpen()));
  await page.unroute('**/api/*');

  // Case files.
  await page.click('[data-case="2"]');
  ok('case files: switches project', (await page.isVisible('#case-2')) && !(await page.isVisible('#case-0')));

  // Budget knob.
  const ctaBefore = await page.getAttribute('[data-knob-cta]', 'data-budget');
  const pos = page.locator('[data-budget-index="3"]');
  const deg = await pos.getAttribute('data-deg');
  await pos.click();
  await page.waitForTimeout(700);
  ok('knob: needle turns', (await page.evaluate(() => document.querySelector('[data-dial]').style.getPropertyValue('--deg'))) === `${deg}deg`);
  ok('knob: shows the matching budget', await page.isVisible('[data-budget-pane="3"]'));
  ok('knob: button carries the budget', (await page.getAttribute('[data-knob-cta]', 'data-budget')) !== ctaBefore);
  await shot(page.locator('#pricing'), 'budget-knob');

  // Day/night switch is remembered.
  await page.click('[data-theme-toggle]');
  ok('day/night: switches to night', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
  await page.reload({ waitUntil: 'networkidle' });
  ok('day/night: remembered after reload', (await page.evaluate(() => document.documentElement.dataset.theme)) === 'dark');
  ok('day/night: switch state after reload', (await page.getAttribute('[data-theme-toggle]', 'aria-pressed')) === 'true');

  // Torch follows the mouse in the hero.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.mouse.move(300, 400);
  await page.mouse.move(310, 410);
  await page.waitForTimeout(200);
  ok('torch: follows the mouse', (await page.evaluate(() => document.querySelector('[data-torch]').style.getPropertyValue('--mx'))) !== '');
  ok('cursor ring: shows with the mouse', await page.evaluate(() => document.querySelector('[data-ring]').classList.contains('on')));

  // Unknown pages get the 404 page. The dev server has no 404 status, so only the content is checked.
  const lost = await ctx.newPage();
  await lost.goto(new globalThis.URL('/this-page-does-not-exist', URL).href);
  ok('404 page: shown for unknown pages', ((await lost.textContent('body')) || '').includes('NO SIGNAL'));

  ok('no errors in the browser console', errors.length === 0, errors.join(' | '));

  console.log(`Smoke test: ${URL}\n`);
  console.log(results.join('\n'));
  console.log(`\n${failed ? `${failed} check(s) failed` : 'All checks passed'}`);
  await browser.close();
  process.exit(failed ? 1 : 0);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
