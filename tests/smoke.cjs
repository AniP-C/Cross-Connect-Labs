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
// against a stand-in API inside the browser. Visit log beacons (/api/ping) are answered inside
// the browser too, so a run against the live site never adds to the log.

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
  // Every context answers /api/ping itself and keeps what the page sent, for the visit log checks.
  const pings = [];
  const newContext = async (options) => {
    const c = await browser.newContext(options);
    await c.route('**/api/ping', (r) => {
      try {
        pings.push(JSON.parse(r.request().postData() || '{}'));
      } catch {}
      return r.fulfill({ status: 204 });
    });
    return c;
  };
  const watch = (page, label) => {
    page.on('console', (m) => m.type() === 'error' && errors.push(`${label}: ${m.text()}`));
    page.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
  };

  // Layout: both themes, desktop, phone and a small phone.
  for (const [label, width, height] of [['desktop', 1440, 900], ['phone', 390, 844], ['small phone', 360, 780]]) {
    for (const theme of ['light', 'dark']) {
      const ctx = await newContext({ viewport: { width, height }, colorScheme: theme });
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

  // Interactions: desktop, day mode. The visit log is forced on here (it is off on localhost).
  const ctx = await newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light' });
  await ctx.addInitScript(() => localStorage.setItem('cc-track-force', '1'));
  const page = await ctx.newPage();
  watch(page, 'interactions');
  pings.length = 0;
  await page.goto(URL, { waitUntil: 'networkidle' });
  const view = pings.find((p) => p.type === 'view');
  ok('visit log: page view sent', view && view.path === new globalThis.URL(URL).pathname && Boolean(view.visitor && view.session && view.screen), JSON.stringify(view ?? {}).slice(0, 120));
  const actions = (name) => pings.filter((p) => p.type === 'event' && p.name === name);

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
  ok('visit log: picked problem recorded', actions('patch-pick').some((p) => p.detail === fromLabel), actions('patch-pick').map((p) => p.detail).join(' | '));

  // Flip switch opens the contact form, filled in from the patch bay.
  await page.click('[data-flip]');
  await page.waitForTimeout(900);
  const dialogOpen = () => page.evaluate(() => document.querySelector('dialog').open);
  const checkedTopic = () => page.evaluate(() => document.querySelector('input[name="topic"]:checked')?.value);
  ok('flip switch: contact form opens', await dialogOpen());
  ok('flip switch: topic filled in', (await checkedTopic()) === toTopic, await checkedTopic());
  const message = await page.inputValue('textarea[name="message"]');
  ok('flip switch: message filled in', message.toLowerCase().includes(fromLabel.toLowerCase()), message);
  ok('visit log: contact form opening recorded with its topic', actions('contact-open').some((p) => p.detail.startsWith(toTopic)), actions('contact-open').map((p) => p.detail).join(' | '));
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
  const patchIn = page.locator('#services .grid .cable-link').nth(4);
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
  ok('visit log: call dialog and booking recorded', actions('book-open').length >= 2 && actions('booked').length === 1 && actions('book-fallback').length === 1);
  ok('visit log: nothing typed is sent', !pings.some((p) => /Smoke Test|test@example\.com/.test(JSON.stringify(p))));
  ok(
    'visit log: dialogs closed unsent are recorded with how far they got',
    actions('contact-close').some((p) => /of 3 filled/.test(p.detail)) && actions('book-close').some((p) => p.detail.includes('WhatsApp')),
    [...actions('contact-close'), ...actions('book-close')].map((p) => p.detail).join(' | '),
  );
  await page.click('[data-book-done] .back');
  ok('booking: closes', !(await bookOpen()));
  await page.unroute('**/api/*');

  // Case files.
  await page.click('[data-case="2"]');
  ok('case files: switches project', (await page.isVisible('#case-2')) && !(await page.isVisible('#case-0')));
  ok('visit log: opened case file recorded', actions('case-open').length === 1);

  // Budget knob.
  const ctaBefore = await page.getAttribute('[data-knob-cta]', 'data-budget');
  const pos = page.locator('[data-budget-index="3"]');
  const deg = await pos.getAttribute('data-deg');
  await pos.click();
  await page.waitForTimeout(700);
  ok('knob: needle turns', (await page.evaluate(() => document.querySelector('[data-dial]').style.getPropertyValue('--deg'))) === `${deg}deg`);
  ok('knob: shows the matching budget', await page.isVisible('[data-budget-pane="3"]'));
  ok('knob: button carries the budget', (await page.getAttribute('[data-knob-cta]', 'data-budget')) !== ctaBefore);
  ok('visit log: knob turn recorded once', actions('knob-turn').length === 1);
  await shot(page.locator('#pricing'), 'budget-knob');

  // FAQ: opening a question is recorded with the question.
  const question = page.locator('#faq details:not([open]) summary').first();
  const questionText = (await question.locator('.q').textContent()).replace(/\s+/g, ' ').trim();
  await question.click();
  ok('visit log: opened FAQ question recorded', actions('faq-open').some((p) => p.detail === questionText), actions('faq-open').map((p) => p.detail).join(' | '));

  // Hiding the tab sends the exit numbers. (Beacons sent while a page unloads never reach the route, so not a reload.)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForTimeout(300);
  const end = pings.find((p) => p.type === 'end');
  ok('visit log: leaving a page sends time and scroll', end && end.id === view?.id && end.durationMs > 0 && end.maxScroll >= 0, JSON.stringify(end ?? {}).slice(0, 120));
  ok('visit log: exit numbers include time per section', end && end.sections && Object.keys(end.sections).length >= 2 && Boolean(end.lastSection), JSON.stringify(end?.sections ?? {}));
  ok('visit log: no errors reported from the page', actions('error').length === 0, actions('error').map((p) => p.detail).join(' | '));
  ok(
    'visit log: exit numbers carry heatmap click spots',
    end && Array.isArray(end.heat) && end.heat.length >= 3 && end.heat.every((h) => /^[a-z0-9-]+:\d{1,4}:\d{1,4}(:d)?$/.test(h)) && end.heat.some((h) => h.startsWith('pricing:')),
    (end?.heat ?? []).slice(0, 6).join(' '),
  );

  // Browser translation: Google Translate marks <html> like this. Recorded once, with the language only.
  await page.evaluate(() => {
    document.documentElement.lang = 'hi';
    document.documentElement.classList.add('translated-ltr');
  });
  await page.waitForTimeout(200);
  ok('visit log: browser translation recorded', actions('translate').length === 1 && actions('translate')[0].detail === 'hi · Google', actions('translate').map((p) => p.detail).join(' | '));
  await page.evaluate(() => {
    document.documentElement.lang = 'en';
    document.documentElement.classList.remove('translated-ltr');
  });

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

  // Phone layout: 390px wide, day mode.
  const mob = await newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'light', hasTouch: true, isMobile: true });
  const m = await mob.newPage();
  watch(m, 'phone');
  await m.goto(URL, { waitUntil: 'networkidle' });
  await m.evaluate(() => (document.documentElement.style.scrollBehavior = 'auto'));
  const height = await m.evaluate(() => document.documentElement.scrollHeight);
  ok('phone: page is short', height < 8000, `${height}px`);
  const headerH = await m.evaluate(() => document.querySelector('[data-header]').offsetHeight);
  ok('phone: header is one row', headerH <= 64, `${headerH}px`);
  const keysEnd = await m.evaluate(() => [...document.querySelectorAll('[data-patchbay] .key')].at(-1).getBoundingClientRect().bottom);
  ok('phone: every fault finder key is on the first screen', keysEnd <= 844, `${Math.round(keysEnd)}px`);
  const small = await m.evaluate(() =>
    [...document.querySelectorAll('header button, header a, main button, main a, main summary')]
      .filter((e) => e.offsetParent && !e.closest('[hidden]'))
      .map((e) => [e.textContent.trim().slice(0, 20) || e.getAttribute('aria-label'), Math.round(e.getBoundingClientRect().height)])
      .filter(([, h]) => h < 44),
  );
  ok('phone: buttons and links are at least 44px tall', small.length === 0, small.map((x) => x.join(' ')).join(', '));

  // Menu sheet.
  await m.click('[data-menu]');
  ok('phone menu: opens', (await m.isVisible('[data-sheet]')) && (await m.getAttribute('[data-menu]', 'aria-expanded')) === 'true');
  await m.keyboard.press('Escape');
  ok('phone menu: closes with Escape', !(await m.isVisible('[data-sheet]')));

  // Call bar: hidden in the hero, shown below it.
  ok('call bar: hidden in the hero', !(await m.isVisible('[data-dock]')));
  await m.evaluate(() => window.scrollTo(0, document.getElementById('services').offsetTop));
  await m.waitForTimeout(400);
  ok('call bar: shows below the hero', await m.isVisible('[data-dock]'));
  await m.click('[data-dock] [data-contact]');
  ok('call bar: "patch in" opens the form', await m.evaluate(() => document.querySelector('[data-contact-dialog]').open));
  await m.keyboard.press('Escape');

  // "Not sure yet" books a call. The browser answers /api/* itself, so nothing is booked.
  await m.route('**/api/slots', (r) => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html>' }));
  await m.evaluate(() => window.scrollTo(0, 0));
  await m.click('[data-patchbay] .key.unsure');
  ok('fault finder: "not sure yet" shows a free call', (await m.textContent('[data-readout="fix"]')) === (await m.getAttribute('[data-patchbay] .key.unsure', 'data-fix')));
  await m.click('[data-flip]');
  ok('fault finder: "not sure yet" opens the call dialog', await m.evaluate(() => document.querySelector('[data-book-dialog]').open));
  await m.keyboard.press('Escape');
  await m.unroute('**/api/slots');

  // Services: rows open on tap, one at a time.
  const row = m.locator('[data-row]').nth(3);
  await row.click();
  ok('phone services: row opens', (await row.getAttribute('aria-expanded')) === 'true' && (await m.isVisible('#mod-3')));
  ok('phone services: one row open at a time', (await m.locator('[data-row][aria-expanded="true"]').count()) === 1);

  // Case files: the details open right under the picked row.
  await m.click('[data-case="2"]');
  const under = await m.evaluate(() => document.querySelector('[data-case="2"]').nextElementSibling?.classList.contains('viewer'));
  ok('phone case files: details open under the row', under && (await m.isVisible('#case-2')));

  // Pricing: the sizes are a row of buttons.
  await m.click('[data-budget-index="0"]');
  ok('phone pricing: size buttons work', await m.isVisible('[data-budget-pane="0"]'));

  // Field reports swipe sideways inside their strip only.
  const strip = await m.evaluate(() => {
    const s = document.querySelector('[data-reports]');
    return s.scrollWidth > s.clientWidth && document.documentElement.scrollWidth <= window.innerWidth;
  });
  ok('phone field reports: strip swipes, page does not', strip);
  await shot(m, 'phone-interactions', { fullPage: true });
  await mob.close();

  // Visit log dashboard: a dead end without the key; with it, the report. /api/stats is answered here.
  const admin = await ctx.newPage();
  watch(admin, 'admin');
  const now = Date.now();
  const rec = (i, extra = {}) => ({ kind: 'view', id: `view000${i}`, session: `sess000${i % 2}`, visitor: 'visitor01', ts: new Date(now - i * 6e5).toISOString(), t0: now - i * 6e5, ip: '203.0.113.9', ua: 'Mozilla/5.0', browser: 'Chrome', browserVersion: '140', os: 'Android', osVersion: '15', device: 'mobile', bot: false, city: 'Jhansi', country: 'India', countryCode: 'IN', lat: 25.45, lon: 78.57, network: 'Reliance Jio', path: '/', sections: { top: 9000, services: 4000 }, lastSection: 'services', lcp: 1800, viewport: '1440x900', heat: ['top:300:400', 'top:310:410', 'services:500:200:d'], referrer: 'https://www.google.com/', params: { utm_source: 'newsletter' }, durationMs: 42000, activeMs: 30000, maxScroll: 80, completed: true, ...extra });
  const stats = {
    ok: true,
    days: 30,
    truncated: false,
    generatedAt: new Date(now).toISOString(),
    records: [rec(1), rec(2), rec(3, { path: '/privacy/' })],
    events: [{ kind: 'event', id: 'event0001', session: 'sess0001', visitor: 'visitor01', ts: new Date(now - 6e5).toISOString(), t0: now - 6e5, name: 'contact-send', detail: 'whatsapp · Website · budget Small', path: '/', ip: '203.0.113.9', countryCode: 'IN' }],
  };
  await admin.route('**/api/stats', (r) => {
    const sent = JSON.parse(r.request().postData() || '{}');
    return sent.key === 'right-key' ? r.fulfill({ json: stats }) : r.fulfill({ status: 401, json: { error: 'wrong key' } });
  });
  pings.length = 0;
  await admin.goto(new globalThis.URL('/admin/', URL).href, { waitUntil: 'networkidle' });
  ok('admin: looks like a dead end without the key', (await admin.isVisible('[data-gate]')) && !(await admin.isVisible('[data-report]')));
  ok('admin: is not in the visit log', pings.length === 0, `${pings.length} beacons`);
  await admin.fill('#admin-key', 'wrong-key');
  await admin.press('#admin-key', 'Enter');
  await admin.waitForFunction(() => document.querySelector('[data-gate-note]').textContent.length > 0);
  ok('admin: wrong key is refused', (await admin.isVisible('[data-gate]')) && (await admin.textContent('[data-gate-note]')).includes('Wrong'));
  // Chrome logs the 401 for the wrong key as a console error. That one is expected.
  errors.splice(0, errors.length, ...errors.filter((e) => !(e.startsWith('admin:') && e.includes('401'))));
  await admin.fill('#admin-key', 'right-key');
  await admin.press('#admin-key', 'Enter');
  await admin.waitForSelector('[data-report] .tiles');
  ok('admin: right key shows the report', (await admin.textContent('.tiles')).includes('Page views') && (await admin.locator('details.item').count()) === 2);
  await admin.waitForSelector('.map svg', { timeout: 5000 }).catch(() => {});
  ok('admin: map shows the places', (await admin.locator('.map svg circle').count()) === 1 && (await admin.locator('.map svg .map-land').count()) === 1);
  await admin.waitForSelector('.heat-stage iframe', { timeout: 5000 }).catch(() => {});
  const heatFrame = admin.frameLocator('.heat-stage iframe');
  await heatFrame.locator('canvas[data-heat]').waitFor({ state: 'attached', timeout: 15000 }).catch(() => {});
  ok('admin: click heatmap draws on the page', (await heatFrame.locator('canvas[data-heat]').getAttribute('data-heat').catch(() => null)) === '6', await admin.locator('.heat-box').evaluate((b) => b.previousElementSibling?.textContent ?? ''));
  ok('admin: the heatmap frame is not in the visit log', !pings.some((p) => p.type === 'view'), `${pings.length} beacons`);
  ok('admin: city table shows the enquiry rate', /Jhansi, IN\s*2\s*0\s*1\s*50%/.test(await admin.locator('.where table').innerText()), (await admin.locator('.where table').innerText()).replace(/\s+/g, ' '));
  await shot(admin, 'admin', { fullPage: true });
  await admin.setViewportSize({ width: 390, height: 844 });
  const adminOver = await admin.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok('admin: no sideways scrolling on a phone', adminOver <= 0, `${adminOver}px`);
  await admin.click('[data-lock]');
  ok('admin: lock goes back to the key box', await admin.isVisible('[data-gate]'));
  await admin.close();

  // Unknown pages get the 404 page. The dev server has no 404 status, so only the content is checked.
  const lost = await ctx.newPage();
  await lost.goto(new globalThis.URL('/this-page-does-not-exist', URL).href);
  ok('404 page: shown for unknown pages', ((await lost.textContent('body')) || '').includes('NO SIGNAL'));

  // Service pages: linked from the Rack, each with its own heading, and "patch in" fills the form.
  const specLinks = await page.evaluate(() => [...document.querySelectorAll('#services .grid a.spec')].map((a) => a.getAttribute('href')));
  ok('rack: every module links to its service page', specLinks.length === 8 && specLinks.every((h) => /^\/services\/[a-z-]+\/$/.test(h)), specLinks.join(' '));
  const svc = await ctx.newPage();
  watch(svc, 'service page');
  await svc.goto(new globalThis.URL(specLinks[4] || '/services/whatsapp-bots/', URL).href, { waitUntil: 'networkidle' });
  ok('service page: has its own heading and title', ((await svc.textContent('h1')) || '').trim().length > 0 && !(await svc.title()).startsWith('Page not found'));
  ok('service page: header links go back to the home page', (await svc.getAttribute('header .nav a', 'href')).startsWith('/#'));
  const svcTopic = await svc.getAttribute('#top [data-contact]', 'data-topic');
  await svc.click('#top [data-contact]');
  ok('service page: "patch in" opens the form with its topic', await svc.evaluate((t) => document.querySelector('[data-contact-dialog]').open && document.querySelector('input[name="topic"]:checked')?.value === t, svcTopic), svcTopic);
  await svc.keyboard.press('Escape');
  const svcLd = await svc.evaluate(() => JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent).map((d) => d['@type']));
  ok('service page: structured data for the service, breadcrumb and FAQ', ['Service', 'BreadcrumbList', 'FAQPage'].every((t) => svcLd.includes(t)), svcLd.join(' '));
  await svc.setViewportSize({ width: 390, height: 844 });
  const svcOver = await svc.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  ok('service page: no sideways scrolling on a phone', svcOver <= 0, `${svcOver}px`);
  const svcSmall = await svc.evaluate(() =>
    [...document.querySelectorAll('main a, main button, main summary')]
      .filter((e) => e.offsetParent && !e.closest('[hidden]'))
      .map((e) => [e.textContent.trim().slice(0, 20) || e.getAttribute('aria-label'), Math.round(e.getBoundingClientRect().height)])
      .filter(([, h]) => h < 44),
  );
  ok('service page: buttons and links are at least 44px tall on a phone', svcSmall.length === 0, svcSmall.map((x) => x.join(' ')).join(', '));
  await shot(svc, 'service-phone', { fullPage: true });
  await svc.close();

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
