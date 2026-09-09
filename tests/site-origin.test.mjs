import test from 'node:test';
import assert from 'node:assert/strict';
import { isIndexableSite } from '../src/lib/site.ts';

test('local preview origins stay out of search even when SITE_URL is explicitly set', () => {
 assert.equal(isIndexableSite(), false);
 for (const origin of ['http://localhost:4321', 'http://127.0.0.1:4321', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://preview.localhost', 'https://bytedesk.test', 'https://bytedesk.local']) {
  assert.equal(isIndexableSite(new URL(origin)), false, origin);
 }
});

test('public HTTPS origins enable canonical URLs and indexing together', () => {
 assert.equal(isIndexableSite(new URL('https://blog.example.org')), true);
 assert.equal(isIndexableSite(new URL('http://blog.example.org')), false);
 assert.equal(isIndexableSite(new URL('https://localhost-notes.example.org')), true);
});

test('Cloudflare preview URLs stay out of search until a custom domain is configured', () => {
 for (const origin of ['https://bytedesk.example.workers.dev', 'https://version-bytedesk.example.workers.dev', 'https://bytedesk-haoqianglyu.pages.dev', 'https://preview.bytedesk-haoqianglyu.pages.dev']) {
  assert.equal(isIndexableSite(new URL(origin)), false, origin);
 }
});
