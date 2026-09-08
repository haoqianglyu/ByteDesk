import type { APIRoute } from 'astro';
import { publishedPosts, postUrl } from '../lib/content';
import { showcaseItems } from '../lib/showcase';
import { locales, sectionIds, sectionHref } from '../lib/i18n';
export const GET: APIRoute = async ({ site }) => {
 const base = site || new URL('http://localhost:4321');
 const paths = locales.flatMap(locale => [`/${locale}/`, `/${locale}/about/`, ...sectionIds.map(c => sectionHref(locale, c)), ...showcaseItems(locale).map(item => item.href)]);
 for (const p of await publishedPosts()) if (!p.data.sample) paths.push(postUrl(p.data.locale, p.data.translationKey));
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${paths.map(p => `<url><loc>${new URL(p, base)}</loc></url>`).join('')}</urlset>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
