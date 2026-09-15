import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('the compatibility runtime and shipped worker read PDFs without newer native APIs', () => {
 // Isolate removed built-ins from the other tests. These APIs are newer than
 // the browsers supported by PDF.js's legacy build.
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
   delete URL.parse;
   delete Map.prototype.getOrInsertComputed;
   const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
   pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(resolve('public/vendor/pdf-tools-v1/pdf.worker.legacy.min.mjs')).href;
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
