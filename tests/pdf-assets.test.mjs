import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, readdir, stat, utimes, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { preparePdfAssets } from '../scripts/prepare-pdf-assets.mjs';
import { PDF_WORKER_FILE } from '../src/lib/pdfAssetPaths.ts';

test('repeated PDF asset preparation leaves unchanged files untouched and repairs changed or missing assets', async t => {
  const root = await mkdtemp(join(tmpdir(), 'bytedesk-pdf-assets-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const modules = join(root, 'modules'), output = join(root, 'public');
  const sources = [
    'pdfjs-dist/LICENSE', 'tesseract.js/LICENSE.md', 'tesseract.js-core/LICENSE', 'core-js/LICENSE',
    'tesseract.js/dist/worker.min.js', 'tesseract.js-core/core.wasm.js',
    '@tesseract.js-data/eng/4.0.0_best_int/eng.traineddata.gz',
    '@tesseract.js-data/chi_sim/4.0.0_best_int/chi_sim.traineddata.gz',
    'pdfjs-dist/legacy/build/pdf.worker.mjs', 'pdfjs-dist/cmaps/map.bcmap',
    'pdfjs-dist/standard_fonts/font.pfb', 'pdfjs-dist/wasm/nested/decoder.wasm',
  ];
  for (const source of sources) {
    await mkdir(dirname(join(modules, source)), { recursive: true });
    await writeFile(join(modules, source), source);
  }
  await writeFile(join(modules, 'pdfjs-dist/legacy/build/pdf.worker.mjs'), 'export const WorkerMessageHandler = "fixture-worker";');
  await preparePdfAssets(modules, output);
  assert.match(await readFile(join(output, PDF_WORKER_FILE), 'utf8'), /fixture-worker/);
  const paths = await readdir(output, { recursive: true });
  const files = [];
  for (const path of paths) if ((await stat(join(output, path))).isFile()) files.push(path);
  assert.equal(files.length, sources.length);
  const sentinel = new Date('2000-01-01T00:00:00Z');
  for (const path of files) await utimes(join(output, path), sentinel, sentinel);
  await preparePdfAssets(modules, output);
  for (const path of files) assert.equal((await stat(join(output, path))).mtimeMs, sentinel.getTime(), path);

  await writeFile(join(modules, 'pdfjs-dist/wasm/nested/decoder.wasm'), 'new decoder');
  await writeFile(join(modules, 'pdfjs-dist/legacy/build/pdf.worker.mjs'), 'export const WorkerMessageHandler = "updated-worker";');
  await rm(join(output, 'worker.min.js'));
  await preparePdfAssets(modules, output);
  assert.equal(await readFile(join(output, 'wasm/nested/decoder.wasm'), 'utf8'), 'new decoder');
  assert.equal(await readFile(join(output, 'worker.min.js'), 'utf8'), 'tesseract.js/dist/worker.min.js');
  assert.match(await readFile(join(output, PDF_WORKER_FILE), 'utf8'), /updated-worker/);
  for (const path of files.filter(path => !['worker.min.js', 'wasm/nested/decoder.wasm', PDF_WORKER_FILE].includes(path))) {
    assert.equal((await stat(join(output, path))).mtimeMs, sentinel.getTime(), path);
  }
});
