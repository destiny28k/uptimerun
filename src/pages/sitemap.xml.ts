// sitemap.xml: every public page we want in search results.
import type { APIRoute } from 'astro';
import { SITE } from '../site';

const PAGES = [
  { path: '/', priority: '1.0', changefreq: 'weekly' },
  { path: '/pricing', priority: '0.9', changefreq: 'monthly' },
  { path: '/tools', priority: '0.8', changefreq: 'monthly' },
  { path: '/tools/website-down-checker', priority: '0.8', changefreq: 'monthly' },
  { path: '/tools/ssl-checker', priority: '0.8', changefreq: 'monthly' },
  { path: '/tools/domain-expiry-checker', priority: '0.8', changefreq: 'monthly' },
  { path: '/tools/http-status-checker', priority: '0.8', changefreq: 'monthly' },
  { path: '/status/demo', priority: '0.6', changefreq: 'monthly' },
  { path: '/about', priority: '0.5', changefreq: 'yearly' },
  { path: '/contact', priority: '0.5', changefreq: 'yearly' },
  { path: '/privacy', priority: '0.3', changefreq: 'yearly' },
  { path: '/terms', priority: '0.3', changefreq: 'yearly' },
  { path: '/refund-policy', priority: '0.3', changefreq: 'yearly' },
];

export const GET: APIRoute = () => {
  const lastmod = new Date().toISOString().slice(0, 10);
  const urls = PAGES.map((p) => `  <url>
    <loc>${new URL(p.path, SITE.url).href}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`, { headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
};
