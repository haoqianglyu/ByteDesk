import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { PDF_ASSETS, PDF_WORKER_FILE } from '../src/lib/pdfAssetPaths.ts';

test('the compatibility runtime and shipped worker read PDFs without newer native APIs', () => {
 // Remove the exact APIs reported by the user's browser, in an isolated process.
 const result = spawnSync(process.execPath, ['--input-type=module', '-'], {
  encoding: 'utf8', timeout: 30_000,
  input: `
   import assert from 'node:assert/strict';
   import { PDFDocument } from 'pdf-lib';
   import { pathToFileURL } from 'node:url';
   import { resolve } from 'node:path';
   const source = await PDFDocument.create();
   source.addPage().drawText('E030E10212600001');
   const data = await source.save();
   delete Promise.try;
   delete Promise.withResolvers;
   delete globalThis.structuredClone;
   delete ArrayBuffer.prototype.transfer;
   delete ArrayBuffer.prototype.transferToFixedLength;
   delete AbortSignal.prototype.throwIfAborted;
   delete Array.prototype.at;
   delete Array.prototype.findLast;
   delete Object.hasOwn;
   delete URL.parse;
   delete Map.prototype.getOrInsertComputed;
   await import('./src/lib/pdfRuntimeCompat.ts');
   const { throwIfAborted } = await import('./src/lib/abort.ts');
   const active = new AbortController();
   assert.doesNotThrow(() => throwIfAborted(active.signal));
   active.abort();
   assert.throws(() => throwIfAborted(active.signal), { name: 'AbortError' });
   const bytes = new Uint8Array([7, 8, 9]);
   const original = { bytes, map: new Map([['bytes', bytes]]) };
   original.self = original;
   const cloned = structuredClone(original, { transfer: [bytes.buffer] });
   assert.equal(bytes.byteLength, 0);
   assert.deepEqual([...cloned.bytes], [7, 8, 9]);
   assert.equal(cloned.self, cloned);
   assert.equal(cloned.map.get('bytes'), cloned.bytes);
   assert.throws(() => structuredClone(() => {}), { name: 'DataCloneError' });
   const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
   pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(resolve('public${PDF_ASSETS}/${PDF_WORKER_FILE}')).href;
   const task = pdfjs.getDocument({ data, useSystemFonts: true });
   try {
    const pdf = await task.promise;
    assert.equal(pdf.numPages, 1);
    const page = await pdf.getPage(1);
    const text = await page.getTextContent();
    assert.equal(text.items.map(item => item.str).join(' '), 'E030E10212600001');
   } finally { await task.destroy(); }
  `,
 });
 assert.equal(result.status, 0, result.stderr || result.error?.message);
});

test('the shipped worker installs compatibility APIs in its own clean global scope', () => {
 const result = spawnSync(process.execPath, ['--input-type=module', '-'], {
  encoding: 'utf8', timeout: 30_000,
  input: `
   import assert from 'node:assert/strict';
   delete Promise.withResolvers;
   delete globalThis.structuredClone;
   delete ArrayBuffer.prototype.transfer;
   delete ArrayBuffer.prototype.transferToFixedLength;
   const { WorkerMessageHandler } = await import('./public${PDF_ASSETS}/${PDF_WORKER_FILE}');
   assert.equal(typeof WorkerMessageHandler.setup, 'function');
   const capability = Promise.withResolvers();
   capability.resolve(42);
   assert.equal(await capability.promise, 42);
   const buffer = new Uint8Array([1, 2]).buffer;
   const copy = structuredClone(buffer, { transfer: [buffer] });
   assert.equal(buffer.byteLength, 0);
   assert.deepEqual([...new Uint8Array(copy)], [1, 2]);
   const resized = copy.transferToFixedLength(3);
   assert.equal(copy.byteLength, 0);
   assert.deepEqual([...new Uint8Array(resized)], [1, 2, 0]);
  `,
 });
 assert.equal(result.status, 0, result.stderr || result.error?.message);
});
