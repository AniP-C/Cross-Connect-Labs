// Makes public/og-image.png, the 1200 × 630 picture shown when the site is shared
// (WhatsApp, LinkedIn, X, Google). Run it again after changing the text below.
//
// One-time setup:  npx playwright install chromium
// Run:             npm run og-image

const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const font = (pkg, file) =>
  `data:font/woff2;base64,${fs.readFileSync(path.join(root, 'node_modules/@fontsource', pkg, 'files', file)).toString('base64')}`;

// Brand colours from docs/design.md: navy #14202E, copper #C2541F.
const html = `<!doctype html>
<html><head><style>
  @font-face { font-family: Mono; font-weight: 600; src: url(${font('ibm-plex-mono', 'ibm-plex-mono-latin-600-normal.woff2')}); }
  @font-face { font-family: Mono; font-weight: 400; src: url(${font('ibm-plex-mono', 'ibm-plex-mono-latin-400-normal.woff2')}); }
  * { box-sizing: border-box; margin: 0; }
  body { width: 1200px; height: 630px; background: #14202e; color: #f3f3f4; font-family: Mono; overflow: hidden; }
  .card { position: relative; height: 100%; padding: 64px 72px; display: flex; flex-direction: column; justify-content: space-between; }
  .logo text { font-family: Mono; font-weight: 600; font-size: 40px; fill: #ffffff; }
  .logo .copper { fill: none; stroke: #c2541f; stroke-width: 3.8; stroke-linecap: round; }
  .logo .pill { fill: #c2541f; }
  .logo .labs { font-size: 22px; font-weight: 600; }
  h1 { font-size: 76px; font-weight: 600; line-height: 1.02; letter-spacing: -0.05em; }
  h1 span { color: #ec7a48; }
  .foot { display: flex; align-items: center; gap: 22px; font-size: 22px; color: #a9b0bc; }
  .badge { padding: 8px 16px; border-radius: 999px; background: #c2541f; color: #ffffff; font-weight: 600; }
  .cable { position: absolute; right: 0; top: 80px; display: flex; align-items: center; }
  .cord { width: 150px; height: 9px; border-radius: 5px; background: #c2541f; }
  .plug { width: 52px; height: 40px; border-radius: 8px; background: #2c3a4c; }
  .prongs { display: flex; flex-direction: column; gap: 10px; margin-right: 26px; }
  .prongs i { display: block; width: 20px; height: 5px; background: #b9b9be; }
  .socket { width: 70px; height: 70px; border-radius: 16px; background: #0b121b; box-shadow: inset 0 3px 8px rgba(0,0,0,.8); position: relative; margin-right: 72px; }
  .socket::after { content: ''; position: absolute; right: 10px; top: 10px; width: 10px; height: 10px; border-radius: 50%; background: #e46a34; box-shadow: 0 0 18px #e46a34; }
</style></head>
<body><div class="card">
  <svg class="logo" viewBox="0 0 300 92" width="300" height="92">
    <text x="0" y="40">cr</text><text x="72" y="40">ssc</text><text x="168" y="40">nnect</text>
    <g class="copper">
      <path d="M60 38.7 C60 68 156 68 156 38.7"></path><circle cx="60" cy="29.5" r="9.2"></circle>
      <path d="M161.9 22.45 A9.2 9.2 0 1 1 150.1 22.45"></path><path d="M156 13.5 L156 29"></path>
    </g>
    <rect class="pill" x="222" y="60" width="76" height="28" rx="14"></rect>
    <text class="labs" x="260" y="80.5" text-anchor="middle">labs</text>
  </svg>
  <h1>Plug in your problem.<br><span>We’ll wire the fix.</span></h1>
  <div class="foot"><span class="badge">no minimum budget</span>websites · apps · whatsapp bots · ai · plc/scada</div>
  <div class="cable"><span class="cord"></span><span class="plug"></span><span class="prongs"><i></i><i></i></span><span class="socket"></span></div>
</div></body></html>`;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.setContent(html, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const out = path.join(root, 'public', 'og-image.png');
  await page.screenshot({ path: out });
  await browser.close();
  console.log(`Wrote ${path.relative(root, out)}`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
