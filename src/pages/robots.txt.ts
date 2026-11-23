// robots.txt: allow the public site, keep private areas out, point to the sitemap.
import type { APIRoute } from 'astro';
import { SITE } from '../site';

export const GET: APIRoute = () => new Response(`User-agent: *
Allow: /
Disallow: /dashboard
Disallow: /api/
Disallow: /login
Disallow: /signup

Sitemap: ${new URL('/sitemap.xml', SITE.url).href}
`, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' } });
