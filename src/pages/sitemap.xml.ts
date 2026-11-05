// sitemap.xml for search engines. Add new pages to `paths` when they exist.
// Only pages meant for search: /privacy/ and /admin are noindex, so they stay out.
import type { APIRoute } from 'astro';
import { services } from '../data/site';

const paths = ['/', ...services.map((s) => `/services/${s.slug}/`)];

export const GET: APIRoute = ({ site }) => {
  const urls = paths.map((p) => `  <url><loc>${new URL(p, site).href}</loc></url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
