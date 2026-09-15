import { throwIfAborted } from './abort.ts';

/** Fixed mode groups by position, independent of report numbers. */
export function pageGroups(pageCount: number, pagesPerReport = 2): number[][] {
  if (!Number.isSafeInteger(pageCount) || pageCount < 1) throw new Error('Invalid page count');
  if (!Number.isSafeInteger(pagesPerReport) || pagesPerReport < 1 || pagesPerReport > 1000) throw new Error('Invalid pages per report');
  return Array.from({ length: Math.ceil(pageCount / pagesPerReport) }, (_, i) => {
    const start = i * pagesPerReport;
    return Array.from({ length: Math.min(pagesPerReport, pageCount - start) }, (_, offset) => start + offset);
  });
}

export type NumberReading = { number: string; corrected: boolean };

export type PrintedPagination = { total: number; current: number };
export type PaginationEvidence = { pagination?: PrintedPagination; paginationConfidence: number };
export type BoundaryIssue = 'missing' | 'conflict' | 'sequence' | 'incomplete' | 'number';
export type ReportGroup = { pages: number[]; pagesPerReport: number; issue?: BoundaryIssue };
export type ReportGroupDetection = { groups: ReportGroup[]; checkedPages: number };

/** Require both printed page fields. A damaged leading 共 may be absent in a cropped scan. */
export function readPrintedPagination(text: string): PrintedPagination | undefined {
  const compact = text.normalize('NFKC').replace(/\s+/g, '');
  const matches = [...compact.matchAll(/(?<!\d)([1-9]\d{0,3})页第([1-9]\d{0,3})页/g)];
  const readings = matches.map(match => ({ total: Number(match[1]), current: Number(match[2]) }));
  if (!readings.length || readings.some(item => item.total > 1000 || item.current > item.total)) return undefined;
  return new Set(readings.map(item => `${item.total}/${item.current}`)).size === 1 ? readings[0] : undefined;
}

/** Each printed page number points back to its report's start, independent of its ID. */
export function detectReportGroups(pages: PaginationEvidence[]): ReportGroupDetection {
  const markers = pages.map(page => {
    const p = page.pagination;
    return p && page.paginationConfidence >= 45 && Number.isSafeInteger(p.total) && p.total >= 1 && p.total <= 1000 &&
      Number.isSafeInteger(p.current) && p.current >= 1 && p.current <= p.total ? p : undefined;
  });
  const claims = new Map<number, Map<number, number>>();
  const starts = new Set([0, pages.length]);
  markers.forEach((marker, index) => {
    if (!marker) return;
    const start = index - marker.current + 1;
    if (start < 0) return;
    const totals = claims.get(start) || new Map<number, number>();
    totals.set(marker.total, (totals.get(marker.total) || 0) + 1);
    claims.set(start, totals);
    // A readable first page or two agreeing continuation pages can locate a new
    // report. This lets later reports recover after an unclear or missing page.
    if (marker.current === 1 || totals.get(marker.total)! >= 2) starts.add(start);
  });
  const anchors = [...starts].sort((a, b) => a - b);
  const groups: ReportGroup[] = [];
  let start = 0, anchorIndex = 1;
  while (start < pages.length) {
    while (anchors[anchorIndex]! <= start) anchorIndex++;
    const nextStart = anchors[anchorIndex]!;
    const candidates = [...(claims.get(start) || new Map<number, number>())];
    candidates.sort((a, b) => b[1] - a[1] || a[0] - b[0]);
    const total = candidates[0]?.[0];
    const end = Math.min(total ? start + total : nextStart, nextStart, pages.length);
    const selected = markers.slice(start, end);
    let issue: BoundaryIssue | undefined;
    if (!total) issue = selected.some(Boolean) ? 'sequence' : 'missing';
    else if (candidates.length > 1 || selected.some(marker => marker && marker.total !== total)) issue = 'conflict';
    else if (selected.some((marker, index) => marker && marker.current !== index + 1)) issue = 'sequence';
    else if (end - start !== total) issue = 'incomplete';
    else if (selected.some(marker => !marker)) issue = 'missing';
    groups.push({ pages: Array.from({ length: end - start }, (_, offset) => start + offset), pagesPerReport: total || end - start, issue });
    start = end;
  }
  return { groups, checkedPages: markers.filter(Boolean).length };
}

/** A source's consecutive pages with the same report ID form one output, including copies. */
export function detectNumberGroups(pages: { reading?: NumberReading; confidence: number }[]): ReportGroupDetection {
  const numbers = pages.map(page => page.reading?.number);
  // An unreadable run may belong between two readings of the same ID. Keep that
  // proposed group together but require boundary review; never guess across IDs.
  for (let start = 0; start < numbers.length;) {
    if (numbers[start]) { start++; continue; }
    let end = start + 1;
    while (end < numbers.length && !numbers[end]) end++;
    const before = numbers[start - 1], after = numbers[end];
    if (before && before === after) numbers.fill(before, start, end);
    start = end;
  }
  const groups: ReportGroup[] = [];
  for (let start = 0; start < pages.length;) {
    let end = start + 1;
    while (end < pages.length && numbers[end] === numbers[start]) end++;
    const selected = pages.slice(start, end);
    const uncertain = selected.some(page => !page.reading || page.reading.corrected || page.confidence < 40);
    groups.push({
      pages: Array.from({ length: end - start }, (_, offset) => start + offset),
      pagesPerReport: end - start,
      issue: uncertain ? 'number' : undefined,
    });
    start = end;
  }
  return { groups, checkedPages: pages.filter(page => page.reading && !page.reading.corrected && page.confidence >= 40).length };
}

export type PageReading = PaginationEvidence & {
  reading?: NumberReading;
  confidence: number;
  preview: string;
  rotation: number;
};
export type ScannedFile = { readings: PageReading[]; detection?: ReportGroupDetection; paginationDetection?: ReportGroupDetection };
export type ScannedReport = ReportPart & {
  pagesPerReport: number;
  readings: PageReading[];
  review: boolean;
  confirmed: boolean;
  boundaryIssue?: BoundaryIssue;
  boundaryConfirmed: boolean;
};

/** Cached page readings can be regrouped without running OCR again. */
export function groupScannedReports(sourceIndex: number, readings: PageReading[], pagesPerReport: number): ScannedReport[] {
  return groupReportRanges(sourceIndex, readings, pageGroups(readings.length, pagesPerReport).map(pages => ({ pages, pagesPerReport })));
}

export function groupReportRanges(sourceIndex: number, readings: PageReading[], groups: ReportGroup[]): ScannedReport[] {
  return groups.map(({ pages, pagesPerReport, issue }) => {
    const selected = pages.map(index => readings[index]!);
    const name = selected.find(item => item.reading)?.reading?.number || '';
    const review = selected.length !== pagesPerReport || selected.some(item => !item.reading ||
      item.reading.number !== name || item.reading.corrected || item.confidence < 40);
    return { sourceIndex, pages, pagesPerReport, name, readings: selected, review, confirmed: false, boundaryIssue: issue, boundaryConfirmed: false };
  });
}

/** Explicit ranges must cover the entire file in order, without gaps or overlaps. */
export function parseReportRanges(text: string, pageCount: number): number[][] {
  if (!Number.isSafeInteger(pageCount) || pageCount < 1 || text.length > 30000) throw new Error('INVALID_RANGES');
  const tokens = text.trim().split(/[\n,;，；]+/).map(token => token.trim()).filter(Boolean);
  let next = 1;
  const groups = tokens.map(token => {
    const match = /^(\d+)\s*(?:[-–—]\s*(\d+))?$/.exec(token);
    if (!match) throw new Error('INVALID_RANGES');
    const start = Number(match[1]), end = Number(match[2] || match[1]);
    if (start !== next || !Number.isSafeInteger(end) || end < start || end > pageCount) throw new Error('INVALID_RANGES');
    next = end + 1;
    return Array.from({ length: end - start + 1 }, (_, offset) => start - 1 + offset);
  });
  if (next !== pageCount + 1) throw new Error('INVALID_RANGES');
  return groups;
}

/** This experiment targets the alphanumeric report format shown in its sample. */
export function readReportNumber(text: string): NumberReading | undefined {
  const compact = text.toUpperCase().replace(/\s+/g, '');
  const exact = compact.match(/(?<![A-Z0-9])[A-Z][0-9]{3}[A-Z][0-9]{11}(?![A-Z0-9])/g);
  if (exact && new Set(exact).size === 1) return { number: exact[0]!, corrected: false };
  // Only correct O/Q/I in the numeric positions, and require review in the UI.
  const possible = compact.match(/(?<![A-Z0-9])[A-Z][0-9OIQ]{3}[A-Z][0-9OIQ]{11}(?![A-Z0-9])/g);
  if (!possible || new Set(possible).size !== 1) return undefined;
  const raw = possible[0]!;
  const digits = (s: string) => s.replace(/[OQ]/g, '0').replaceAll('I', '1');
  return { number: raw[0] + digits(raw.slice(1, 4)) + raw[4] + digits(raw.slice(5)), corrected: true };
}

export function validReportName(name: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(name.trim());
}

export function reportFileNames(names: string[]): string[] {
  const used = new Set<string>();
  return names.map(name => {
    const base = name.trim();
    if (!validReportName(base)) throw new Error('Invalid report name');
    let unique = base, suffix = 2;
    while (used.has(unique.toLowerCase())) unique = `${base}_${suffix++}`;
    used.add(unique.toLowerCase());
    return `${unique}.pdf`;
  });
}

export type ReportPart = {
  sourceIndex: number;
  pages: number[];
  name: string;
};

/** Both the browser and local verification use this lossless page-copy path. */
export async function packReports(
  sources: { name: string; bytes: () => Promise<ArrayBuffer | Uint8Array> }[],
  parts: ReportPart[],
  progress?: (completed: number, total: number) => void,
  signal?: AbortSignal,
): Promise<Uint8Array<ArrayBuffer>> {
  const [{ PDFDocument }, { zipSync }] = await Promise.all([import('pdf-lib'), import('fflate')]);
  const names = reportFileNames(parts.map(part => part.name));
  const files: Record<string, Uint8Array> = Object.create(null);
  let completed = 0;
  for (const [sourceIndex, source] of sources.entries()) {
    throwIfAborted(signal);
    const selected = parts.map((part, index) => ({ part, index })).filter(({ part }) => part.sourceIndex === sourceIndex);
    if (!selected.length) continue;
    const original = await PDFDocument.load(await source.bytes());
    for (const { part, index } of selected) {
      throwIfAborted(signal);
      if (!part.pages.length || part.pages.some(page => !Number.isInteger(page) || page < 0 || page >= original.getPageCount())) throw new Error('Invalid page range');
      const output = await PDFDocument.create();
      const pages = await output.copyPages(original, part.pages);
      pages.forEach(page => output.addPage(page));
      files[names[index]!] = await output.save();
      completed++;
      progress?.(completed, parts.length);
      // Give rendering and the cancel button time between reports.
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  if (completed !== parts.length || !completed) throw new Error('Missing source PDF');
  throwIfAborted(signal);
  // Scans are already compressed; storing them avoids a second expensive compression.
  return zipSync(files, { level: 0 });
}
