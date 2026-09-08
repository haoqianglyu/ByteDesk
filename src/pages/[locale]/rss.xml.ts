import type { APIRoute } from 'astro';
import { publishedPosts, postUrl } from '../../lib/content';
import { locales, ui, type Locale } from '../../lib/i18n';
import { escapeXml } from '../../lib/xml';
export function getStaticPaths() { return locales.map(locale => ({ params: { locale } })); }
export const GET: APIRoute = async ({ params, site }) => {
 const locale = params.locale as Locale;
 const t = ui(locale);
 const posts = (await publishedPosts()).filter(p => p.data.locale === locale);
 const base = site || new URL('http://localhost:4321');
 const items = posts.map(p => `<item><title>${escapeXml(p.data.title)}</title><link>${new URL(postUrl(locale, p.data.translationKey), base)}</link><guid isPermaLink="true">${new URL(postUrl(locale, p.data.translationKey), base)}</guid><description>${escapeXml(`${p.data.sample ? `[${t.sample}] ` : ''}${p.data.description}`)}</description><pubDate>${p.data.date.toUTCString()}</pubDate><category>${escapeXml(t[p.data.category])}</category></item>`).join('');
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>ByteDesk · ${escapeXml(t.brand)}</title><link>${new URL(`/${locale}/`, base)}</link><description>${escapeXml(t.tagline)}</description><language>${locale === 'zh' ? 'zh-CN' : 'en'}</language>${items}</channel></rss>`, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
