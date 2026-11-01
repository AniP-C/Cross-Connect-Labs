// Smoke test: opens the site in Chromium and clicks through the main features.
//
// One-time setup:  npx playwright install chromium
// Start the site:  npm run dev        (or: npm run build && npm run preview)
// Then run:        npm run test:smoke
// Other address:   npm run test:smoke -- https://crossconnectlabs.com/
// Screenshots:     set SHOTS=some-folder to save them there.
//
// It never sends a real enquiry. If the contact form is set up (form service,
// WhatsApp or email in src/data/site.ts), the send step is skipped.

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

  // Patch bay: pick the second problem and the second build.
  const from = page.locator('.jack[data-side="from"][data-index="1"]');
  const to = page.locator('.jack[data-side="to"][data-index="1"]');
  const fromLabel = (await from.locator('.jack-label').textContent()).trim();
  const toLabel = (await to.locator('.jack-label').textContent()).trim();
  const toTopic = await to.getAttribute('data-topic');
  const d0 = await page.getAttribute('[data-cable]', 'd');
  await from.click();
  await to.click();
  await page.waitForTimeout(600);
  ok('patch bay: cable moves', d0 !== (await page.getAttribute('[data-cable]', 'd')));
  ok('patch bay: readout shows the problem', (await page.textContent('[data-readout="problem"]')) === fromLabel.toLowerCase());
  ok('patch bay: readout shows the build', (await page.textContent('[data-readout="build"]')) === toLabel.toLowerCase());
  ok('patch bay: chosen socket is pressed', (await to.getAttribute('aria-pressed')) === 'true');

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
  } else {
    await page.fill('input[name="name"]', 'Smoke Test');
    await page.fill('input[name="contact"]', 'test@example.com');
    await page.click('[data-send]');
    ok('form: not set up, so it shows the message to copy', await page.isVisible('[data-done-copy]'));
  }
  await page.click('.back');
  ok('form: closes', !(await dialogOpen()));

  // Rack: a "patch in" button opens the form with its topic.
  const patchIn = page.locator('#services .cable-link').nth(4);
  const rackTopic = await patchIn.getAttribute('data-topic');
  await patchIn.click();
  ok('rack: "patch in" opens the form with its topic', (await dialogOpen()) && (await checkedTopic()) === rackTopic, rackTopic);
  await page.keyboard.press('Escape');

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
