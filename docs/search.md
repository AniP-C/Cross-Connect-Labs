# Search: Google and Bing

What's in the code, and what you do by hand in Google Search Console and Bing Webmaster Tools.

## In the code

- `sitemap.xml` lists only pages meant for search: the home page and the service pages. `/privacy/`, `/admin` and the 404 page are `noindex` and stay out.
- `robots.txt` allows everything and points to the sitemap.
- Each page has its own title, description, canonical link and structured data (see `src/pages/index.astro` and `src/pages/services/[slug].astro`).
- IndexNow for Bing: the key file `public/03c454544da0f1f453cddacacb85fff7.txt` and `npm run indexnow`, which sends every page in the live sitemap to Bing.

## Google Search Console

1. Finish verifying `crossconnectlabs.com` (the verification file is live).
2. **Sitemaps** → add `sitemap.xml`.
3. **URL Inspection** → paste each page → **Request indexing**. About 10 a day: the home page first, then the service pages.
4. If an old result shows up (like the privacy page did for our name), **Removals** → **New request** hides it for about six months while the `noindex` takes effect.

## Bing Webmaster Tools

Bing also feeds DuckDuckGo, Yahoo, Ecosia and ChatGPT search, so it's worth the ten minutes.

1. Go to https://www.bing.com/webmasters and sign in with the same Google account you use for Search Console.
2. **Import from Google Search Console.** It copies the site, its verification and the sitemap, so no extra file or meta tag is needed. (Search Console must be verified first.)
3. **Sitemaps:** check that `https://crossconnectlabs.com/sitemap.xml` is listed. If not, add it.
4. After a deploy that adds or changes pages, run `npm run indexnow`. Bing usually crawls them within a day. The first run only works once the key file is live.
5. **URL Inspection:** paste the home page to check that Bing can fetch it and has no errors.
6. **SEO → Site Scan:** start a scan once a month. It lists missing titles, broken links and slow pages.
7. **Settings → Crawl control:** leave it as is. The site is small.

## After the first week

- In both tools, look at **Pages / Indexing** to see which pages are in and why any are left out.
- **Performance / Search performance** shows the searches people found you by. Use those words in `services` in `src/data/site.ts`.
