import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';
import { describePdfError, pdfToolFailureKind } from '../src/lib/pdfToolErrors.ts';

test('initialization errors retain their original message, including worker string rejections', () => {
 assert.equal(describePdfError(new TypeError('Promise.withResolvers is not a function')), 'TypeError: Promise.withResolvers is not a function');
 assert.equal(describePdfError('Failed to load worker'), 'Failed to load worker');
 assert.equal(describePdfError({ name: 'Error', message: 'Cross-realm error' }), 'Error: Cross-realm error');
 assert.equal(describePdfError(undefined), 'Unknown error');
});

test('PDF preflight still reports platform features that cannot be polyfilled', () => {
 const context = createContext({ exports: {}, DOMMatrix: function () {}, Worker: function () {}, structuredClone() {}, AbortController: function () {} });
 const script = ts.transpileModule(readFileSync('src/lib/pdfToolErrors.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
 }).outputText;
 runInContext(script, context);
 assert.doesNotThrow(() => context.exports.assertPdfBrowserSupport());
 runInContext('delete globalThis.Worker; delete globalThis.WebAssembly;', context);
 assert.throws(() => context.exports.assertPdfBrowserSupport(), error => {
  assert.equal(error.name, 'PdfBrowserCompatibilityError');
  for (const feature of ['Worker', 'WebAssembly.instantiate']) assert.ok(error.message.includes(feature));
  assert.equal(pdfToolFailureKind(error), 'compatibility');
  return true;
 });
});

test('known module load failures and missing browser APIs get different recovery guidance', () => {
 for (const message of ['Failed to fetch dynamically imported module: https://example.test/chunk.js', 'Importing a module script failed.', 'error loading dynamically imported module']) {
  assert.equal(pdfToolFailureKind(new TypeError(message)), 'resource');
 }
 for (const error of [new TypeError('Promise.withResolvers is not a function'), new ReferenceError('DOMMatrix is not defined'), new SyntaxError('Unexpected token')]) {
  assert.equal(pdfToolFailureKind(error), 'compatibility');
 }
 assert.equal(pdfToolFailureKind(new TypeError('Cannot read properties of undefined')), 'unknown');
 assert.equal(pdfToolFailureKind(new Error('Unexpected initialization failure')), 'unknown');
});
