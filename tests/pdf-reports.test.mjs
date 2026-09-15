import test from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { unzipSync } from 'fflate';
import { pageGroups, readReportNumber, readPrintedPagination, detectNumberGroups, detectReportGroups, groupReportRanges, parseReportRanges, groupScannedReports, reportFileNames, packReports, validReportName } from '../src/lib/pdfReports.ts';

const pageReadings = (length, total, suffix = '2828') => Array.from({ length }, (_, index) => ({
  pagination: { total, current: index % total + 1 }, paginationConfidence: 80,
  reading: { number: `E030E1021260${suffix}`, corrected: false }, confidence: 90, preview: '', rotation: 90,
}));

test('printed pagination requires both fields and rejects invalid or conflicting readings', () => {
  assert.deepEqual(readPrintedPagination('共 ２ 页 第 １ 页'), { total: 2, current: 1 });
  assert.deepEqual(readPrintedPagination('4 页 第 3 页'), { total: 4, current: 3 });
  for (const text of ['共 2 页', '第 4 页', '共2页第3页', '共1001页第1页', '共4页第0页', '共12345页第1页', '共2页第1页 / 共4页第1页']) {
    assert.equal(readPrintedPagination(text), undefined, text);
  }
});

test('explicit printed-page mode separates page cycles even with identical report IDs', () => {
  const readings = [2, 4, 6, 2, 1, 3].flatMap(count => pageReadings(count, count));
  const detection = detectReportGroups(readings);
  assert.equal(detection.checkedPages, 18);
  assert.deepEqual(detection.groups.map(group => group.pagesPerReport), [2, 4, 6, 2, 1, 3]);
  assert.ok(detection.groups.every(group => !group.issue));
  assert.deepEqual(detection.groups.flatMap(group => group.pages), Array.from({ length: 18 }, (_, index) => index));
  assert.equal(groupReportRanges(0, readings, detection.groups).length, 6);
  assert.equal(detectReportGroups(pageReadings(8, 2)).groups.length, 4);
});

test('automatic ID grouping retains all copies despite repeated 1/1 and 1/2, 2/2 markers', () => {
  const readings = [
    ...pageReadings(2, 1, '2930'), ...pageReadings(4, 2, '2926'),
    ...pageReadings(4, 2, '2927'), ...pageReadings(2, 1, '2924'),
  ];
  const detection = detectNumberGroups(readings);
  assert.equal(detection.checkedPages, 12);
  assert.deepEqual(detection.groups.map(group => group.pages.length), [2, 4, 4, 2]);
  assert.ok(detection.groups.every(group => !group.issue));
  assert.deepEqual(detection.groups.flatMap(group => group.pages), Array.from({ length: 12 }, (_, index) => index));
  assert.deepEqual(groupReportRanges(0, readings, detection.groups).map(report => report.name),
    ['E030E10212602930', 'E030E10212602926', 'E030E10212602927', 'E030E10212602924']);
  assert.deepEqual(detectNumberGroups(pageReadings(4, 1)).groups, [{ pages: [0, 1, 2, 3], pagesPerReport: 4, issue: undefined }]);
  assert.equal(detectNumberGroups(pageReadings(6, 1)).groups[0].pages.length, 6);
});

test('ID changes define automatic boundaries, and a nonconsecutive repeated ID stays separate', () => {
  const readings = [...pageReadings(2, 6), ...pageReadings(4, 6, '2829'), ...pageReadings(2, 6)];
  for (const page of readings) page.pagination = { total: 6, current: 1 };
  const groups = detectNumberGroups(readings).groups;
  assert.deepEqual(groups.map(group => group.pages.length), [2, 4, 2]);
  const parts = groupReportRanges(0, readings, groups);
  assert.deepEqual(reportFileNames(parts.map(part => part.name)), ['E030E10212602828.pdf', 'E030E10212602829.pdf', 'E030E10212602828_2.pdf']);
});

test('unreadable pages between matching IDs stay in a proposed group requiring boundary review', () => {
  const readings = pageReadings(4, 1);
  readings[1].reading = undefined; readings[2].reading = undefined;
  const detection = detectNumberGroups(readings);
  assert.equal(detection.checkedPages, 2);
  assert.deepEqual(detection.groups, [{ pages: [0, 1, 2, 3], pagesPerReport: 4, issue: 'number' }]);
  const [report] = groupReportRanges(0, readings, detection.groups);
  assert.equal(report.review, true);
  assert.equal(report.boundaryIssue, 'number');
  assert.equal(report.boundaryConfirmed, false);
  assert.equal(readings[1].reading, undefined, 'do not invent an OCR reading');
});

test('unknown IDs at edges or between different IDs remain separate without losing any page', () => {
  const unknown = () => ({ paginationConfidence: 0, confidence: 0, preview: '', rotation: 90 });
  const readings = [unknown(), ...pageReadings(2, 1), unknown(), unknown(), ...pageReadings(4, 1, '2829'), unknown()];
  const detection = detectNumberGroups(readings);
  assert.deepEqual(detection.groups.map(group => group.pages.length), [1, 2, 2, 4, 1]);
  assert.deepEqual(detection.groups.map(group => group.issue), ['number', undefined, 'number', undefined, 'number']);
  assert.deepEqual(detection.groups.flatMap(group => group.pages), Array.from({ length: 10 }, (_, index) => index));
  assert.deepEqual(detectNumberGroups([unknown(), unknown()]).groups, [{ pages: [0, 1], pagesPerReport: 2, issue: 'number' }]);
  assert.deepEqual(detectNumberGroups([]), { groups: [], checkedPages: 0 });
});

test('weak or corrected ID readings require both name and boundary review', () => {
  const readings = [...pageReadings(2, 1), ...pageReadings(2, 1, '2829')];
  readings[0].confidence = 10; readings[3].reading.corrected = true;
  const detection = detectNumberGroups(readings);
  assert.equal(detection.checkedPages, 2);
  assert.deepEqual(detection.groups.map(group => group.issue), ['number', 'number']);
  const reports = groupReportRanges(0, readings, detection.groups);
  reports[0].confirmed = true;
  assert.equal(reports[0].boundaryConfirmed, false);
  assert.ok(reports.every(report => report.review));
});

test('missing or low-confidence markers flag only the affected report and preserve later reports', () => {
  const readings = [...pageReadings(2, 2), ...pageReadings(4, 4), ...pageReadings(6, 6)];
  readings[2].pagination = undefined;
  readings[10].paginationConfidence = 5;
  const groups = detectReportGroups(readings).groups;
  assert.deepEqual(groups.map(group => group.pages.length), [2, 4, 6]);
  assert.deepEqual(groups.map(group => group.issue), [undefined, 'missing', 'missing']);
  const unknown = detectReportGroups(Array.from({ length: 8 }, () => ({ paginationConfidence: 0 })));
  assert.deepEqual(unknown.groups, [{ pages: [0, 1, 2, 3, 4, 5, 6, 7], pagesPerReport: 8, issue: 'missing' }]);
});

test('a truncated report stops before a new first page, with no lost or duplicated pages', () => {
  const readings = [...pageReadings(2, 4), ...pageReadings(6, 6), ...pageReadings(2, 2)];
  const groups = detectReportGroups(readings).groups;
  assert.deepEqual(groups.map(group => group.pages.length), [2, 6, 2]);
  assert.deepEqual(groups.map(group => group.issue), ['incomplete', undefined, undefined]);
  assert.deepEqual(groups.flatMap(group => group.pages), Array.from({ length: 10 }, (_, index) => index));
  const truncatedTail = detectReportGroups([...pageReadings(2, 2), ...pageReadings(3, 6)]).groups;
  assert.equal(truncatedTail[1].issue, 'incomplete');
  assert.equal(truncatedTail[1].pagesPerReport, 6);
});

test('conflicting totals, out-of-sequence pages and leading orphan pages require boundary review', () => {
  const conflicting = pageReadings(4, 4); conflicting[2].pagination.total = 6;
  assert.equal(detectReportGroups(conflicting).groups[0].issue, 'conflict');
  const outOfOrder = pageReadings(4, 4); outOfOrder[1].pagination.current = 3;
  assert.equal(detectReportGroups(outOfOrder).groups[0].issue, 'sequence');
  const orphan = [...pageReadings(4, 4).slice(2), ...pageReadings(2, 2)];
  assert.deepEqual(detectReportGroups(orphan).groups.map(group => group.issue), ['sequence', undefined]);
});

test('manual page ranges must cover the file exactly once and in order', () => {
  assert.deepEqual(parseReportRanges('1-2\n3–6，7-12', 12), [[0, 1], [2, 3, 4, 5], [6, 7, 8, 9, 10, 11]]);
  assert.deepEqual(parseReportRanges('1; 2-3', 3), [[0], [1, 2]]);
  for (const text of ['', '2-4', '1-2,2-4', '1-2,4', '1-5', '1-2', '1-2,4-3', '1-1.5', '1+3', '0-4']) {
    assert.throws(() => parseReportRanges(text, 4), /INVALID_RANGES/, text);
  }
});

test('boundary review is separate from number review and can be replaced by explicit ranges', () => {
  const readings = pageReadings(4, 4); readings[1].pagination = undefined;
  const automatic = groupReportRanges(0, readings, detectReportGroups(readings).groups);
  assert.equal(automatic[0].review, false);
  assert.equal(automatic[0].boundaryIssue, 'missing');
  assert.equal(automatic[0].boundaryConfirmed, false);
  const manual = groupReportRanges(0, readings, parseReportRanges('1-4', 4).map(pages => ({ pages, pagesPerReport: pages.length })));
  assert.equal(manual[0].boundaryIssue, undefined);
  assert.equal(manual[0].readings[0], readings[0]);
  readings[2].reading.number = 'E030E10212602829';
  assert.equal(groupReportRanges(0, readings, detectReportGroups(readings).groups)[0].review, true);
});

test('manual regrouping reuses readings and flags partial or mismatched reports', () => {
  const readings = pageReadings(9, 4);
  const groups = groupScannedReports(1, readings, 4);
  assert.deepEqual(groups.map(part => part.pages), [[0, 1, 2, 3], [4, 5, 6, 7], [8]]);
  assert.deepEqual(groups.map(part => part.review), [false, false, true]);
  assert.equal(groups[0].readings[0], readings[0]);
  assert.equal(groups[2].pagesPerReport, 4);
  assert.equal(groupScannedReports(1, readings, 2).length, 5);
  readings[2].reading.number = 'E030E10212602829';
  assert.equal(groupScannedReports(1, readings, 4)[0].review, true);
});

test('automatic mixed-page batches retain page order and keep matching IDs in different sources separate', async () => {
  const sources = [], parts = [];
  for (const [index, counts] of [[2, 4, 4, 2], [6, 2]].entries()) {
    const readings = counts.flatMap((count, group) => pageReadings(count, group % 2 + 1, String(2920 + group)));
    const pdf = await PDFDocument.create();
    for (let page = 0; page < readings.length; page++) pdf.addPage([200 + index * 100 + page, 500]);
    const bytes = await pdf.save();
    sources.push({ name: `file-${index}.pdf`, bytes: async () => bytes });
    parts.push(...groupReportRanges(index, readings, detectNumberGroups(readings).groups));
  }
  const entries = Object.entries(unzipSync(await packReports(sources, parts)));
  assert.equal(entries.length, 6);
  assert.ok(entries.every(([name]) => name.endsWith('.pdf')));
  assert.deepEqual(entries.map(([name]) => name), ['E030E10212602920.pdf', 'E030E10212602921.pdf', 'E030E10212602922.pdf', 'E030E10212602923.pdf', 'E030E10212602920_2.pdf', 'E030E10212602921_2.pdf']);
  const pageWidths = [];
  for (const [, bytes] of entries) pageWidths.push((await PDFDocument.load(bytes)).getPages().map(page => page.getWidth()));
  assert.deepEqual(pageWidths, [[200, 201], [202, 203, 204, 205], [206, 207, 208, 209], [210, 211], [300, 301, 302, 303, 304, 305], [306, 307]]);
});

test('grouping always uses consecutive pairs, retaining an odd final page', () => {
  assert.deepEqual(pageGroups(5), [[0, 1], [2, 3], [4]]);
  assert.equal(pageGroups(64).length, 32);
  assert.deepEqual(pageGroups(1), [[0]]);
  assert.throws(() => pageGroups(0));
});

test('four-page and custom groups retain all remaining pages and reject invalid sizes', () => {
  assert.deepEqual(pageGroups(10, 4), [[0, 1, 2, 3], [4, 5, 6, 7], [8, 9]]);
  assert.equal(pageGroups(64, 4).length, 16);
  assert.deepEqual(pageGroups(3, 1), [[0], [1], [2]]);
  assert.deepEqual(pageGroups(3, 4), [[0, 1, 2]]);
  assert.deepEqual(pageGroups(7, 3), [[0, 1, 2], [3, 4, 5], [6]]);
  for (const size of [0, -1, 1.5, NaN, Infinity, 1001]) assert.throws(() => pageGroups(10, size));
});

test('report recognition rejects partial tokens, conflicting numbers and unrelated IDs', () => {
  assert.deepEqual(readReportNumber('报告编号 E030E10212602828'), { number: 'E030E10212602828', corrected: false });
  assert.deepEqual(readReportNumber('EQ30E10212602828'), { number: 'E030E10212602828', corrected: true });
  assert.equal(readReportNumber('委托编号2026501661'), undefined);
  assert.equal(readReportNumber('E030E10212602828 / E030E10212602829'), undefined);
  assert.equal(readReportNumber('EO030E10212602828'), undefined);
  assert.equal(readReportNumber('E030E102126028281'), undefined);
});

test('names cannot escape the archive and duplicates never overwrite reports', () => {
  assert.deepEqual(reportFileNames(['ABC', 'abc', 'ABC_2', 'ABC']), ['ABC.pdf', 'abc_2.pdf', 'ABC_2_2.pdf', 'ABC_3.pdf']);
  for (const name of ['../secret', '/report', 'a\\b', '', 'a:b', '=SUM(A1)']) assert.equal(validReportName(name), false);
  assert.throws(() => reportFileNames(['../report']));
});

test('ZIP contains only PDFs and retains every page, page dimensions and duplicate report names', async () => {
  const a = await PDFDocument.create();
  for (let n = 0; n < 5; n++) a.addPage([200 + n, 300 + n]);
  const b = await PDFDocument.create(); b.addPage([800, 600]); b.addPage([700, 500]);
  const aBytes = await a.save(), bBytes = await b.save();
  const parts = [...pageGroups(5).map(pages => ({ sourceIndex: 0, pages, name: 'E030E10212602828' })), { sourceIndex: 1, pages: [0, 1], name: 'E030E10212602828' }];
  const data = await packReports([{ name: 'folder/a.pdf', bytes: async () => aBytes }, { name: 'b.pdf', bytes: async () => bBytes }], parts);
  const files = unzipSync(data);
  const names = ['E030E10212602828.pdf', 'E030E10212602828_2.pdf', 'E030E10212602828_3.pdf', 'E030E10212602828_4.pdf'];
  assert.deepEqual(Object.keys(files), names);
  const sizes = [];
  for (const name of names) sizes.push((await PDFDocument.load(files[name])).getPages().map(page => [page.getWidth(), page.getHeight()]));
  assert.deepEqual(sizes, [[[200, 300], [201, 301]], [[202, 302], [203, 303]], [[204, 304]], [[800, 600], [700, 500]]]);
});

test('cancelled or invalid batches never produce a silently incomplete ZIP', async () => {
  await assert.rejects(packReports([], [{ sourceIndex: 0, pages: [0], name: 'report' }]));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(packReports([{ name: 'a.pdf', bytes: async () => new Uint8Array() }], [{ sourceIndex: 0, pages: [0], name: 'report' }], undefined, controller.signal), { name: 'AbortError' });
});

test('four-page ZIP reports retain page order and an incomplete last report', async () => {
  const original = await PDFDocument.create();
  for (let n = 0; n < 9; n++) original.addPage([200 + n, 300 + n]);
  const bytes = await original.save();
  const parts = pageGroups(9, 4).map((pages, index) => ({ sourceIndex: 0, pages, name: `report_${index + 1}` }));
  const files = unzipSync(await packReports([{ name: 'nine-pages.pdf', bytes: async () => bytes }], parts));
  const names = ['report_1.pdf', 'report_2.pdf', 'report_3.pdf'];
  assert.deepEqual(Object.keys(files), names);
  const widths = [];
  for (const name of names) widths.push((await PDFDocument.load(files[name])).getPages().map(page => page.getWidth()));
  assert.deepEqual(widths, [[200, 201, 202, 203], [204, 205, 206, 207], [208]]);
});
