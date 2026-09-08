import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { isIndexableSite } from '../src/lib/site.ts';

if (existsSync('.env')) process.loadEnvFile('.env');
const site = new URL(process.env.SITE_URL || 'http://localhost:4321');
const indexable = isIndexableSite(site);

const root = resolve('dist');
const read = path => readFileSync(join(root, path), 'utf8');
function walk(dir) { return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]); }
const pages = walk(root).filter(p => p.endsWith('.html'));
const decode = s => s.replaceAll('&amp;', '&').replaceAll('&#39;', "'").replaceAll('&quot;', '"');

test('all internal navigation, scripts, styles and images resolve to build output', () => {
 const failures = [];
 for (const file of pages) {
  const html = readFileSync(file, 'utf8');
  const sourcePath = `/${file.slice(root.length + 1).replace(/index\.html$/, '')}`;
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
   const raw = decode(match[1]);
   if (!raw.startsWith('/') && !raw.startsWith('#')) continue;
   const url = new URL(raw, `https://bytedesk.test${sourcePath}`);
   const pathname = decodeURIComponent(url.pathname);
   let dest = join(root, pathname);
   if (pathname.endsWith('/')) dest = join(dest, 'index.html');
   if (!existsSync(dest)) { failures.push(`${sourcePath} -> ${raw}`); continue; }
   if (url.hash && dest.endsWith('.html')) {
    const id = decodeURIComponent(url.hash.slice(1));
    if (!readFileSync(dest, 'utf8').includes(`id="${id}"`)) failures.push(`Missing anchor: ${sourcePath} -> ${raw}`);
   }
  }
 }
 assert.deepEqual(failures, []);
});

test('both languages have complete home, category, article and RSS pages', () => {
 for (const locale of ['zh', 'en']) {
  const home = read(`${locale}/index.html`);
  assert.match(home, new RegExp(`lang="${locale === 'zh' ? 'zh-CN' : 'en'}"`));
  assert.ok(home.includes(locale === 'zh' ? '记录代码，也记录灵感。' : 'A home for code and ideas.'));
  for (const category of ['pets', 'daily', 'travel', 'code']) {
   const html = read(`${locale}/category/${category}/index.html`);
   assert.match(html, new RegExp(`<article\\b[^>]*>[\\s\\S]*?href="/${locale}/posts/`), `${locale}/${category} must contain a readable story`);
   if(category==='travel'){
    assert.ok(html.includes('data-map-pin'), `${locale}/travel must render its mapped sample location`);
    assert.ok(html.includes(locale==='zh'?'示例地点':'Sample location'));
   }
  }
  const xml = read(`${locale}/rss.xml`);
  assert.equal([...xml.matchAll(/<item>/g)].length, 6);
  assert.ok(xml.includes(`<language>${locale === 'zh' ? 'zh-CN' : 'en'}</language>`));
 }
});

test('article body and headings are rendered before client JavaScript runs', () => {
 for (const locale of ['zh', 'en']) {
  const html = read(`${locale}/posts/a-desktop-in-vue/index.html`);
  assert.ok(html.includes(locale === 'zh' ? '从一个小组件开始' : 'Start with one small component'));
  assert.match(html, /<pre[^>]*class="astro-code/);
  assert.match(html, /<code>/);
  assert.ok(html.includes('article-toc'));
  assert.ok(html.includes(`/${locale === 'zh' ? 'en' : 'zh'}/posts/a-desktop-in-vue/`));
  assert.ok(html.includes('noindex, follow'), 'Sample articles should not be indexed');
 }
});

test('photos use the configured R2 origin, have descriptions and dimensions, and are not bundled', () => {
 const manifest = JSON.parse(readFileSync('R2_IMAGES.json', 'utf8'));
 const base = process.env.PUBLIC_IMAGE_BASE_URL || manifest.publicBaseUrl;
 let count = 0;
 for (const page of pages) {
  const html = readFileSync(page, 'utf8');
  for (const match of html.matchAll(/<img\b[^>]*>/g)) {
   assert.match(match[0], /alt="[^"]+"/);
   assert.match(match[0], /width="\d+"/);
   assert.match(match[0], /height="\d+"/);
   const src = decode(match[0].match(/\bsrc="([^"]+)"/)[1]);
   assert.equal(new URL(src).origin, new URL(base).origin, 'Photos must use the configured R2 origin');
   count++;
  }
 }
 assert.ok(count > 0, 'Photo references must exist in the generated pages');
 assert.ok(!existsSync('public/images'), 'Do not retain local photo copies');
 assert.ok(!existsSync(join(root, 'images')), 'Do not bundle photos in the site output');
});

test('preview and production builds agree on robots, canonical URLs and sample indexing', () => {
 const home = read('zh/index.html');
 if (indexable) {
  assert.match(read('robots.txt'), /Allow: \//);
  assert.ok(read('robots.txt').includes(new URL('/sitemap.xml', site).href));
  assert.ok(home.includes(`rel="canonical" href="${new URL('/zh/', site).href}"`));
  assert.ok(!home.includes('name="robots" content="noindex'));
 } else {
  assert.match(read('robots.txt'), /Disallow: \//);
  assert.ok(home.includes('name="robots" content="noindex'));
  assert.ok(!home.includes('rel="canonical"'));
 }
 assert.ok(!read('sitemap.xml').includes('/posts/'));
 assert.ok(read('404.html').includes('404'));
});

test('creative spaces have bilingual routes, working detail pages and matching language switches', () => {
 for (const locale of ['zh', 'en']) {
  const other = locale === 'zh' ? 'en' : 'zh';
  for (const route of ['lab', 'lab/glass-playground', 'lab/logo-study', 'projects', 'projects/bytedesk']) {
   const html = read(`${locale}/${route}/index.html`);
   assert.ok(html.includes(`/${other}/${route}/`), `Language switch must preserve ${route}`);
   assert.ok(read('sitemap.xml').includes(`/${locale}/${route}/`));
  }
  const lab = read(`${locale}/lab/glass-playground/index.html`);
  assert.match(lab, /type="range"/);
  assert.match(lab, /id="glass-opacity"/);
  assert.ok(lab.includes(`/${locale}/projects/bytedesk/`));
  const project = read(`${locale}/projects/bytedesk/index.html`);
  assert.ok(project.includes(locale === 'zh' ? '开发中 · 预览版' : 'In development · Preview'));
  assert.ok(read(`${locale}/index.html`).includes(`/${locale}/lab/`));
 }
});

test('Zoji uses the matching storefront and six localized R2 screenshots', () => {
 const filenames = ['01-home.png', '02-records.png', '03-reminders.png', '04-family.png', '05-hospitals.png', '06-health-record.png'];
 for (const [locale, region] of [['zh', 'cn'], ['en', 'us']]) {
  const otherLocale = locale === 'zh' ? 'en' : 'zh';
  for (const route of ['about', 'projects', 'projects/zoji']) {
   const html = read(`${locale}/${route}/index.html`);
   const stores = [...html.matchAll(/href="(https:\/\/apps\.apple\.com\/[^\"]+)"/g)].map(m => decode(m[1]));
   assert.ok(stores.length > 0, `Missing Zoji store link on ${locale}/${route}`);
   for (const store of stores) {
    assert.equal(new URL(store).pathname.split('/')[1], region);
    assert.ok(new URL(store).pathname.endsWith('/id6802273364'));
   }
  }
  const detail = read(`${locale}/projects/zoji/index.html`);
  for (const file of filenames) assert.ok(detail.includes(`/projects/zoji/${locale}-${file}`));
  assert.ok(!detail.includes(`/projects/zoji/${otherLocale}-`), 'Do not mix localized artwork');
  assert.ok(detail.includes(`/${otherLocale}/projects/zoji/`));
  assert.ok(read('sitemap.xml').includes(`/${locale}/projects/zoji/`));
 }
});


test('3D study has a static fallback and loads only on its own visible island', () => {
 for (const locale of ['zh', 'en']) {
  const detail = read(`${locale}/lab/logo-study/index.html`);
  assert.match(detail, /class="logo-static"/);
  assert.match(detail, /client="visible"/);
  assert.ok(detail.includes(locale === 'zh' ? '在两片之间' : 'Between the pieces'));
  assert.ok(read(`${locale}/lab/index.html`).includes(`/${locale}/lab/logo-study/`));
  for (const route of ['', 'lab/']) {
   const html = read(`${locale}/${route}index.html`);
   assert.ok(!/component-url="[^"]*LogoStudy/.test(html), 'Listing pages must not hydrate the 3D scene');
  }
 }
});


test('Zoji phone is localized, has a static screen, and is isolated to the project detail', () => {
 for (const locale of ['zh', 'en']) {
  const detail = read(`${locale}/projects/zoji/index.html`);
  assert.match(detail, /class="phone-static-screen"/);
  assert.match(detail, /client="visible"/);
  assert.ok(detail.includes(locale === 'zh' ? '选择 App 界面' : 'Choose an app screen'));
  assert.equal((detail.match(/class="phone-dot"/g) || []).length, 6);
  for (const route of ['index.html', 'projects/index.html', 'about/index.html']) {
   assert.ok(!read(`${locale}/${route}`).includes('phone-renderer'), 'Do not initialize the phone outside its detail page');
  }
 }
});
