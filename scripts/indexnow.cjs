// Tells Bing (and Yandex, Seznam, Naver) about every page in the live sitemap through IndexNow,
// so new or changed pages are crawled within hours instead of weeks. Google does not use IndexNow.
//
// Run after a deploy that adds or changes pages:  npm run indexnow
// Other site:                                      npm run indexnow -- https://example.com/
//
// The key is public by design: it's the file public/<KEY>.txt, which proves we own the site.
// Docs: https://www.indexnow.org/documentation

const KEY = '03c454544da0f1f453cddacacb85fff7';
const site = new URL(process.argv[2] || 'https://crossconnectlabs.com/');

(async () => {
  const keyLocation = new URL(`/${KEY}.txt`, site).href;
  const keyFile = await fetch(keyLocation);
  if (!keyFile.ok || (await keyFile.text()).trim() !== KEY) {
    throw new Error(`${keyLocation} is not live yet. Deploy first, then run this again.`);
  }

  const sitemap = await (await fetch(new URL('/sitemap.xml', site))).text();
  const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (!urlList.length) throw new Error('No pages found in the sitemap.');

  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: site.host, key: KEY, keyLocation, urlList }),
  });
  // 200 and 202 both mean accepted. 403: key file not found. 422: a URL is not on this host.
  console.log(`IndexNow answered ${res.status} for ${urlList.length} pages:`);
  console.log(urlList.map((u) => `  ${u}`).join('\n'));
  if (res.status !== 200 && res.status !== 202) process.exit(1);
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
