import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'acorn';
import { PDF_ASSETS, PDF_WORKER_FILE } from '../src/lib/pdfAssetPaths.ts';

function walk(dir) {
 return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)]);
}

test('all bundled and inline browser scripts parse as ES2020, including lazy wallpaper and PDF modules', () => {
 const assets = walk('dist/_astro').filter(file => file.endsWith('.js'));
 assert.ok(assets.some(file => /three\.module\./.test(file)), 'Three.js must be checked');
 assert.ok(assets.some(file => /\/pdf\./.test(file)), 'PDF.js must be checked');
 assets.push(`dist${PDF_ASSETS}/${PDF_WORKER_FILE}`);
 for (const file of assets) {
  assert.doesNotThrow(() => parse(readFileSync(file, 'utf8'), { ecmaVersion: 2020, sourceType: 'module' }), file);
 }
 for (const file of walk('dist').filter(file => file.endsWith('.html'))) {
  for (const [, attributes, script] of readFileSync(file, 'utf8').matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
   if (/\bsrc=|type="application\//.test(attributes)) continue;
   assert.doesNotThrow(() => parse(script, { ecmaVersion: 2020, sourceType: attributes.includes('type="module"') ? 'module' : 'script' }), `${file} inline script`);
  }
 }
});
