import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { PDF_ASSETS, PDF_WORKER_FILE } from '../src/lib/pdfAssetPaths.ts';

async function writeChanged(destination, data) {
  data = Buffer.from(data);
  try {
    if (data.equals(await readFile(destination))) return;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await writeFile(destination, data);
}

async function copyChanged(source, destination) {
  await writeChanged(destination, await readFile(source));
}

async function copyTree(source, destination) {
  await mkdir(destination, { recursive: true });
  for (const entry of await readdir(source, { withFileTypes: true })) {
    const from = `${source}/${entry.name}`, to = `${destination}/${entry.name}`;
    if (entry.isDirectory()) await copyTree(from, to);
    else if (entry.isFile()) await copyChanged(from, to);
  }
}

// Keep unchanged mtimes so a concurrent build does not refresh an active dev page.
// Ship OCR assets from this site, including its language models; no CDN requests.
export async function preparePdfAssets(modules = resolve('node_modules'), dest = resolve(`public${PDF_ASSETS}`)) {
  await mkdir(`${dest}/core`, { recursive: true });
  await mkdir(`${dest}/lang`, { recursive: true });
  await mkdir(`${dest}/licenses`, { recursive: true });
  for (const [source, name] of [
    ['pdfjs-dist/LICENSE', 'pdfjs.txt'],
    ['tesseract.js/LICENSE.md', 'tesseract.txt'],
    ['tesseract.js-core/LICENSE', 'tesseract-core.txt'],
    ['core-js/LICENSE', 'core-js.txt'],
  ]) await copyChanged(`${modules}/${source}`, `${dest}/licenses/${name}`);
  await copyChanged(`${modules}/tesseract.js/dist/worker.min.js`, `${dest}/worker.min.js`);
  for (const file of await readdir(`${modules}/tesseract.js-core`)) {
    if (file.endsWith('.wasm.js')) await copyChanged(`${modules}/tesseract.js-core/${file}`, `${dest}/core/${file}`);
  }
  for (const language of ['eng', 'chi_sim']) {
    await copyChanged(`${modules}/@tesseract.js-data/${language}/4.0.0_best_int/${language}.traineddata.gz`, `${dest}/lang/${language}.traineddata.gz`);
  }
  // Workers have a separate global scope: bundle the same API polyfills before
  // PDF.js and lower its syntax too. Vite does not transform files in public/.
  const runtime = fileURLToPath(new URL('../src/lib/pdfRuntimeCompat.ts', import.meta.url));
  const worker = resolve(modules, 'pdfjs-dist/legacy/build/pdf.worker.mjs');
  const bundled = await build({
    stdin: { contents: `import ${JSON.stringify(runtime)}; export { WorkerMessageHandler } from ${JSON.stringify(worker)};`, resolveDir: fileURLToPath(new URL('..', import.meta.url)), sourcefile: 'pdf-worker-entry.mjs' },
    bundle: true, format: 'esm', platform: 'browser', target: 'es2020',
    minify: true, write: false, legalComments: 'eof', external: ['node:*'],
  });
  await writeChanged(`${dest}/${PDF_WORKER_FILE}`, bundled.outputFiles[0].contents);
  for (const folder of ['cmaps', 'standard_fonts', 'wasm']) await copyTree(`${modules}/pdfjs-dist/${folder}`, `${dest}/${folder}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await preparePdfAssets();
  console.log('PDF and OCR assets ready.');
}
