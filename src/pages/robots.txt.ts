import type { APIRoute } from 'astro';
import { isIndexableSite } from '../lib/site';
export const GET: APIRoute = ({ site }) => new Response(
 isIndexableSite(site)
  ? `User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap.xml', site)}\n`
  : 'User-agent: *\nDisallow: /\n',
 { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
);
