import { mkdir, copyFile, readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

async function copyChanged(source, destination) {
  const data = await readFile(source);
  try {
    if (data.equals(await readFile(destination))) return;
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  await copyFile(source, destination);
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
export async function preparePdfAssets(modules = resolve('node_modules'), dest = resolve('public/vendor/pdf-tools-v1')) {
  await mkdir(`${dest}/core`, { recursive: true });
  await mkdir(`${dest}/lang`, { recursive: true });
  await mkdir(`${dest}/licenses`, { recursive: true });
  for (const [source, name] of [
    ['pdfjs-dist/LICENSE', 'pdfjs.txt'],
    ['tesseract.js/LICENSE.md', 'tesseract.txt'],
    ['tesseract.js-core/LICENSE', 'tesseract-core.txt'],
  ]) await copyChanged(`${modules}/${source}`, `${dest}/licenses/${name}`);
  await copyChanged(`${modules}/tesseract.js/dist/worker.min.js`, `${dest}/worker.min.js`);
  for (const file of await readdir(`${modules}/tesseract.js-core`)) {
    if (file.endsWith('.wasm.js')) await copyChanged(`${modules}/tesseract.js-core/${file}`, `${dest}/core/${file}`);
  }
  for (const language of ['eng', 'chi_sim']) {
    await copyChanged(`${modules}/@tesseract.js-data/${language}/4.0.0_best_int/${language}.traineddata.gz`, `${dest}/lang/${language}.traineddata.gz`);
  }
  // A distinct URL avoids reusing a cached worker from the modern build.
  await copyChanged(`${modules}/pdfjs-dist/legacy/build/pdf.worker.min.mjs`, `${dest}/pdf.worker.legacy.min.mjs`);
  for (const folder of ['cmaps', 'standard_fonts', 'wasm']) await copyTree(`${modules}/pdfjs-dist/${folder}`, `${dest}/${folder}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await preparePdfAssets();
  console.log('PDF and OCR assets ready.');
}
