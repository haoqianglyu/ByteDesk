import { detectNumberGroups, detectReportGroups, readPrintedPagination, readReportNumber, type PageReading, type ScannedFile } from './pdfReports';
import type { Worker } from 'tesseract.js';

const ASSETS = '/vendor/pdf-tools-v1';
export type { ScannedReport, ScannedFile } from './pdfReports';

function canvas(width: number, height: number) {
  const element = document.createElement('canvas');
  element.width = Math.ceil(width); element.height = Math.ceil(height);
  const context = element.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Canvas is unavailable');
  return { element, context };
}

function rotate(source: HTMLCanvasElement, angle: number) {
  const swap = angle % 180 !== 0;
  const result = canvas(swap ? source.height : source.width, swap ? source.width : source.height);
  result.context.translate(result.element.width / 2, result.element.height / 2);
  result.context.rotate(angle * Math.PI / 180);
  result.context.drawImage(source, -source.width / 2, -source.height / 2);
  return result.element;
}

/** Locate the printed line inside the report-number field, allowing scan drift. */
function numberCrop(source: HTMLCanvasElement) {
  const context = source.getContext('2d')!;
  const x = Math.round(source.width * .815), y = Math.round(source.height * .20);
  const width = Math.round(source.width * .14), height = Math.round(source.height * .06);
  const data = context.getImageData(x, y, width, height).data;
  const bands: number[][] = [];
  let start = -1;
  for (let row = 0; row <= height; row++) {
    let count = 0;
    for (let col = 0; col < width && row < height; col++) {
      const i = (row * width + col) * 4;
      if (data[i]! < 160 && data[i + 1]! < 160 && data[i + 2]! < 160) count++;
    }
    if (count > 3 && start < 0) start = row;
    if (count <= 3 && start >= 0) {
      if (row - start >= 8 && row - start < height * .6) bands.push([start, row]);
      start = -1;
    }
  }
  const center = (band: number[]) => (y + (band[0]! + band[1]!) / 2) / source.height;
  const band = bands.filter(b => center(b) > .215 && center(b) < .245)
    .sort((a, b) => Math.abs(center(a) - .231) - Math.abs(center(b) - .231))[0] || [height * .3, height * .8];
  const cropHeight = band[1]! - band[0]! + 6;
  const output = canvas(800, Math.round(cropHeight * 760 / width) + 40);
  output.context.fillStyle = 'white';
  output.context.fillRect(0, 0, output.element.width, output.element.height);
  output.context.drawImage(source, x, y + band[0]! - 3, width, cropHeight, 20, 20, 760, output.element.height - 40);
  return output.element;
}

function preview(source: HTMLCanvasElement) {
  const output = canvas(660, 115);
  output.context.fillStyle = 'white'; output.context.fillRect(0, 0, 660, 115);
  output.context.drawImage(source, source.width * .70, source.height * .19, source.width * .27, source.height * .085, 0, 0, 660, 115);
  const url = output.element.toDataURL('image/jpeg', .85);
  output.element.width = output.element.height = 0;
  return url;
}

function thresholdCrop(source: HTMLCanvasElement, threshold: number) {
  const output = canvas(source.width, source.height);
  output.context.drawImage(source, 0, 0);
  const pixels = output.context.getImageData(0, 0, source.width, source.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const shade = Math.max(pixels.data[index]!, pixels.data[index + 1]!, pixels.data[index + 2]!) < threshold ? 0 : 255;
    pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = shade;
  }
  output.context.putImageData(pixels, 0, 0);
  return output.element;
}

/** The printed 共 N 页 / 第 N 页 line sits above the QR code in this layout. */
function paginationCrop(source: HTMLCanvasElement) {
  const output = canvas(900, 185);
  output.context.fillStyle = 'white'; output.context.fillRect(0, 0, 900, 185);
  output.context.drawImage(source, source.width * .81, source.height * .07, source.width * .15, source.height * .044, 20, 20, 860, 145);
  // Remove pale and colored scanner streaks while retaining dark printed glyphs.
  const pixels = output.context.getImageData(0, 0, 900, 185);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const shade = Math.max(pixels.data[index]!, pixels.data[index + 1]!, pixels.data[index + 2]!) < 175 ? 0 : 255;
    pixels.data[index] = pixels.data[index + 1] = pixels.data[index + 2] = shade;
  }
  output.context.putImageData(pixels, 0, 0);
  return output.element;
}

export async function createReportScanner(signal: AbortSignal) {
  // Use PDF.js's official compatibility build on both sides of the worker boundary.
  const [pdfjs, { createWorker, PSM }] = await Promise.all([import('pdfjs-dist/legacy/build/pdf.mjs'), import('tesseract.js')]);
  pdfjs.GlobalWorkerOptions.workerSrc = `${ASSETS}/pdf.worker.legacy.min.mjs`;
  let worker: Worker | undefined;
  let paginationWorker: Worker | undefined;
  async function ocr() {
    signal.throwIfAborted();
    if (!worker) {
      worker = await createWorker('eng', 1, {
        workerPath: `${ASSETS}/worker.min.js`, corePath: `${ASSETS}/core`, langPath: `${ASSETS}/lang`,
      });
      signal.throwIfAborted();
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE, tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' });
    }
    return worker;
  }
  async function paginationOcr() {
    signal.throwIfAborted();
    if (!paginationWorker) {
      paginationWorker = await createWorker('chi_sim', 1, {
        workerPath: `${ASSETS}/worker.min.js`, corePath: `${ASSETS}/core`, langPath: `${ASSETS}/lang`,
      });
      signal.throwIfAborted();
      await paginationWorker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_LINE, tessedit_char_whitelist: '共页第0123456789' });
    }
    return paginationWorker;
  }
  async function recognizeNumber(crop: HTMLCanvasElement) {
    const worker = await ocr();
    const initial = (await worker.recognize(crop)).data;
    const first = { reading: readReportNumber(initial.text), confidence: initial.confidence };
    if (first.reading && !first.reading.corrected && first.confidence >= 60) return first;
    const candidates = [first];
    // Slight rasterization differences can turn a zero into O or add a glyph.
    // Retry unclear crops at two contrasts instead of guessing from nearby IDs.
    for (const threshold of [200, 220]) {
      signal.throwIfAborted();
      const cleaned = thresholdCrop(crop, threshold);
      try {
        const data = (await worker.recognize(cleaned)).data;
        candidates.push({ reading: readReportNumber(data.text), confidence: data.confidence });
      } finally { cleaned.width = cleaned.height = 0; }
    }
    const usable = candidates.filter(candidate => candidate.reading).sort((a, b) => b.confidence - a.confidence);
    const best = usable[0] || first;
    // Conflicting plausible readings still need human review.
    const distinct = new Set(usable.filter(candidate => candidate.confidence >= 40).map(candidate => candidate.reading!.number));
    return { ...best, confidence: distinct.size > 1 ? 0 : best.confidence };
  }
  return {
    async scan(file: File, progress: (page: number, total: number) => void, rotation: number | 'auto', detectPageCount = false): Promise<ScannedFile> {
      signal.throwIfAborted();
      const task = pdfjs.getDocument({
        data: new Uint8Array(await file.arrayBuffer()),
        cMapUrl: `${ASSETS}/cmaps/`, cMapPacked: true,
        standardFontDataUrl: `${ASSETS}/standard_fonts/`, wasmUrl: `${ASSETS}/wasm/`,
      });
      // Password prompts must not leave the batch waiting indefinitely.
      task.onPassword = () => { void task.destroy(); };
      const abort = () => { void task.destroy(); };
      signal.addEventListener('abort', abort, { once: true });
      let preferred = rotation === 'auto' ? 90 : rotation;
      try {
        const pdf = await task.promise;
        if (pdf.numPages > 1000) throw new Error('PAGE_LIMIT');
        const readings: PageReading[] = [];
        for (let index = 0; index < pdf.numPages; index++) {
          signal.throwIfAborted(); progress(index, pdf.numPages);
          const page = await pdf.getPage(index + 1);
          const viewport = page.getViewport({ scale: 1 });
          const scaled = page.getViewport({ scale: 2200 / Math.max(viewport.width, viewport.height) });
          const rendered = canvas(scaled.width, scaled.height);
          await page.render({ canvas: rendered.element, canvasContext: rendered.context, viewport: scaled }).promise;
          const content = await page.getTextContent();
          const text = content.items.map(item => 'str' in item ? item.str : '').join('\n');
          const embedded = readReportNumber(text);
          const embeddedPagination = detectPageCount ? readPrintedPagination(text) : undefined;
          let best: PageReading | undefined;
          const angles = embedded || embeddedPagination ? [rotation === 'auto' ? 0 : rotation] : rotation === 'auto' ? [...new Set([preferred, 0, 90, 180, 270])] : [rotation];
          for (const angle of angles) {
            signal.throwIfAborted();
            const upright = rotate(rendered.element, angle);
            const crop = embedded ? undefined : numberCrop(upright);
            const data = crop ? await recognizeNumber(crop) : { reading: embedded, confidence: 100 };
            if (crop) crop.width = crop.height = 0;
            const reading = data.reading;
            let pagination = embeddedPagination, paginationConfidence = embeddedPagination ? 100 : 0;
            if (detectPageCount && !pagination) {
              const header = paginationCrop(upright);
              const result = (await (await paginationOcr()).recognize(header)).data;
              header.width = header.height = 0;
              pagination = readPrintedPagination(result.text); paginationConfidence = result.confidence;
            }
            const candidate = { reading, confidence: data.confidence, preview: preview(upright), rotation: angle, pagination, paginationConfidence };
            if (!best || reading || pagination) best = candidate;
            upright.width = upright.height = 0;
            if (reading || pagination) { preferred = angle; break; }
          }
          readings.push(best!);
          rendered.element.width = rendered.element.height = 0;
          page.cleanup();
          progress(index + 1, pdf.numPages);
        }
        return { readings, detection: detectPageCount ? detectNumberGroups(readings) : undefined, paginationDetection: detectPageCount ? detectReportGroups(readings) : undefined };
      } finally {
        signal.removeEventListener('abort', abort);
        await task.destroy();
      }
    },
    async dispose() {
      await Promise.all([worker?.terminate(), paginationWorker?.terminate()]);
      worker = undefined; paginationWorker = undefined;
    },
  };
}
