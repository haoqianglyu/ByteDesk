<script setup lang="ts">
import { computed, markRaw, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import type { Locale } from '../lib/i18n';
import { groupReportRanges, groupScannedReports, packReports, parseReportRanges, reportFileNames, validReportName, type ScannedFile, type ScannedReport } from '../lib/pdfReports';
import { describePdfError, pdfToolFailureKind } from '../lib/pdfToolErrors';
import { throwIfAborted } from '../lib/abort';

const props = defineProps<{ locale: Locale }>();
const zh = computed(() => props.locale === 'zh');
const t = (cn: string, en: string) => zh.value ? cn : en;
const fileInput = ref<HTMLInputElement>(), folderInput = ref<HTMLInputElement>();
const files = ref<File[]>([]), reports = ref<ScannedReport[]>([]);
type FileState = {
  rule: 'auto' | 'pagination' | 'custom' | 'ranges' | 2 | 4 | 6;
  customSize: number | string;
  scanned?: ScannedFile;
  rangeDraft: string;
  appliedDraft?: string;
  manualRanges?: number[][];
  rangeError: string;
};
const fileStates = ref<FileState[]>([]);
const splitMode = ref<'fixed' | 'auto'>('auto');
const scanningIndex = ref(-1);
const errors = ref<{ source: string; message: string }[]>([]);
const stage = ref<'idle' | 'scanning' | 'ready' | 'packing' | 'done'>('idle');
const rotation = ref<number | 'auto'>('auto');
const pagesPerReport = ref<number | string>(2);
const validSize = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 && value <= 1000;
const validGroupSize = computed(() => validSize(pagesPerReport.value));
const validSettings = computed(() => splitMode.value === 'fixed' ? validGroupSize.value : fileStates.value.every(state => state.rule !== 'custom' || validSize(state.customSize)));
const groupHint = computed(() => {
  if (!validGroupSize.value) return t('请输入 1–1,000 之间的整数。', 'Enter a whole number from 1 to 1,000.');
  const count = Number(pagesPerReport.value);
  const first = count === 1 ? '1' : `1–${count}`;
  const second = count === 1 ? '2' : `${count + 1}–${count * 2}`;
  return t(`第 ${first} 页、第 ${second} 页……按原顺序拆分。`, `Pages ${first}, ${second}, and so on, in their original order.`);
});
const folderSupported = ref(true), dragging = ref(false), onlyReview = ref(false);
const note = ref(''), progressText = ref(''), percent = ref(0), stopping = ref(false);
const failureDetails = ref('');
const incomplete = ref(false), allowPartial = ref(false), downloaded = ref(false);
let controller: AbortController | undefined;
const busy = computed(() => stage.value === 'scanning' || stage.value === 'packing');
const totalSize = computed(() => files.value.reduce((sum, file) => sum + file.size, 0));
const needsBoundaryReview = (report: ScannedReport) => !!report.boundaryIssue && !report.boundaryConfirmed;
const needsReview = (report: ScannedReport) => !validReportName(report.name) || (report.review && !report.confirmed) || needsBoundaryReview(report);
const pending = computed(() => reports.value.filter(needsReview).length);
const boundaryPending = computed(() => reports.value.filter(needsBoundaryReview).length);
const visibleReports = computed(() => reports.value.map((report, index) => ({ report, index })).filter(({ report }) => !onlyReview.value || needsReview(report)));
const names = computed(() => reportFileNames(reports.value.map((report, index) => validReportName(report.name) ? report.name : `pending_${index + 1}`)));
const rangesUnapplied = (state: FileState) => state.rule === 'ranges' && (!state.manualRanges || state.rangeDraft !== state.appliedDraft);
const unresolved = computed(() => splitMode.value === 'auto' ? fileStates.value.filter(state => state.scanned &&
  (rangesUnapplied(state) || (state.rule === 'custom' && !validSize(state.customSize)))).length : 0);
const canDownload = computed(() => reports.value.length > 0 && !busy.value && validSettings.value && !pending.value && !unresolved.value && (!incomplete.value || allowPartial.value));
const size = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1)} MB`;
const sourceName = (file: File) => file.webkitRelativePath || file.name;
const range = (report: ScannedReport) => report.pages.length === 1 ? `${report.pages[0]! + 1}` : `${report.pages[0]! + 1}–${report.pages.at(-1)! + 1}`;

function invalidate() {
  failureDetails.value = '';
  fileStates.value.forEach(state => { state.scanned = undefined; });
  reports.value = []; errors.value = []; stage.value = 'idle'; downloaded.value = false;
  incomplete.value = false; allowPartial.value = false; onlyReview.value = false; percent.value = 0;
}
function effectiveSize(index: number): number | undefined {
  if (splitMode.value === 'fixed') return validSize(pagesPerReport.value) ? pagesPerReport.value : undefined;
  const state = fileStates.value[index]!;
  if (state.rule === 'custom') return validSize(state.customSize) ? state.customSize : undefined;
  return typeof state.rule === 'number' ? state.rule : undefined;
}
function regroupFile(index: number) {
  const state = fileStates.value[index]!, scanned = state.scanned, count = effectiveSize(index);
  let selected: ScannedReport[] = [];
  if (scanned) {
    if (count) selected = groupScannedReports(index, scanned.readings, count);
    else if (state.rule === 'auto' && scanned.detection) selected = groupReportRanges(index, scanned.readings, scanned.detection.groups);
    else if (state.rule === 'pagination' && scanned.paginationDetection) selected = groupReportRanges(index, scanned.readings, scanned.paginationDetection.groups);
    else if (state.rule === 'ranges') selected = state.manualRanges
      ? groupReportRanges(index, scanned.readings, state.manualRanges.map(pages => ({ pages, pagesPerReport: pages.length })))
      : reports.value.filter(report => report.sourceIndex === index);
  }
  reports.value = [...reports.value.filter(report => report.sourceIndex !== index), ...selected]
    .sort((a, b) => a.sourceIndex - b.sourceIndex || a.pages[0]! - b.pages[0]!);
  downloaded.value = false;
  if (stage.value === 'done') stage.value = 'ready';
}
function changeFileRule(index: number) {
  const state = fileStates.value[index]!;
  state.rangeError = '';
  if (state.rule === 'ranges' && !state.rangeDraft) state.rangeDraft = reports.value.filter(report => report.sourceIndex === index).map(range).join('\n');
  regroupFile(index);
}
async function editRanges(index: number) {
  fileStates.value[index]!.rule = 'ranges';
  changeFileRule(index);
  await nextTick();
  document.getElementById(`pdf-ranges-${index}`)?.focus();
}
function applyRanges(index: number) {
  const state = fileStates.value[index]!;
  if (!state.scanned || busy.value) return;
  try {
    state.manualRanges = parseReportRanges(state.rangeDraft, state.scanned.readings.length);
    state.appliedDraft = state.rangeDraft;
    state.rangeError = '';
    regroupFile(index);
  } catch {
    state.rangeError = t(`请按顺序覆盖第 1–${state.scanned.readings.length} 页，每页恰好出现一次。每行写一份的起止页码，例如 1-2。`, `Cover pages 1–${state.scanned.readings.length} in order, with every page included exactly once. Enter one range per line, such as 1-2.`);
  }
}
function boundaryMessage(report: ScannedReport) {
  if (report.boundaryIssue === 'number') return t('本段含有识别不清或经过字符纠正的编号，请核对这些页面是否属于同一报告。', 'Some report IDs were unclear or corrected. Check that these pages belong to the same report.');
  if (report.boundaryIssue === 'incomplete') return t(`印刷总页数为 ${report.pagesPerReport}，本段只有 ${report.pages.length} 页。请核对缺页或拆分边界。`, `The printed total is ${report.pagesPerReport}, but this range contains ${report.pages.length} pages. Check for missing pages or an incorrect boundary.`);
  if (report.boundaryIssue === 'conflict') return t('本段的印刷总页数有冲突，请核对拆分范围。', 'Printed totals conflict within this range. Check its boundaries.');
  if (report.boundaryIssue === 'sequence') return t('本段的印刷页码顺序异常，请核对拆分范围。', 'Printed page numbers are out of sequence. Check this range.');
  return t('部分页码未识别，请核对此页段是否是一份完整报告。', 'Some page numbers could not be read. Check that this range is one complete report.');
}
function fileRuleHint(index: number) {
  if (scanningIndex.value === index) return t('正在逐页识别报告编号…', 'Reading the report ID on each page…');
  const state = fileStates.value[index]!, count = effectiveSize(index);
  if (state.rule === 'ranges') return rangesUnapplied(state) ? t('页段尚未应用，请检查后点击“应用页段”。', 'Ranges have not been applied. Check them and choose Apply ranges.') : t(`已按手动页段分为 ${state.manualRanges!.length} 份。`, `Split into ${state.manualRanges!.length} manually defined reports.`);
  if (state.rule !== 'auto' && state.rule !== 'pagination') return count ? t(`此文件统一按每 ${count} 页拆分。`, `This file uses ${count} pages per report.`) : t('请输入 1–1,000 之间的整数。', 'Enter a whole number from 1 to 1,000.');
  const detection = state.rule === 'pagination' ? state.scanned?.paginationDetection : state.scanned?.detection;
  if (!detection) return state.rule === 'auto' ? t('待识别 · 连续相同编号归为一份。', 'Pending · Consecutive pages with the same ID form one report.') : t('待识别 · 按印刷页码分组。', 'Pending · Groups by printed page numbers.');
  const counts = new Map<number, number>();
  for (const group of detection.groups) counts.set(group.pages.length, (counts.get(group.pages.length) || 0) + 1);
  const summary = [...counts].sort((a, b) => a[0] - b[0]).map(([pages, count]) => t(`${pages} 页 × ${count} 份`, `${pages} pages × ${count}`)).join('，');
  const pending = reports.value.filter(report => report.sourceIndex === index && needsBoundaryReview(report)).length;
  return summary + (pending ? t(`；${pending} 段需要核对。`, `; ${pending} range(s) need review.`) : state.rule === 'auto' ? t('；按连续编号分组。', '; grouped by consecutive report IDs.') : t('；页码核对通过。', '; page numbers checked.'));
}
function addFiles(incoming: File[]) {
  if (busy.value) return;
  const next = [...files.value];
  let ignored = 0;
  const warnings: string[] = [];
  for (const file of incoming) {
    if (!/\.pdf$/i.test(file.name)) { ignored++; continue; }
    if (next.some(other => sourceName(other) === sourceName(file) && other.size === file.size && other.lastModified === file.lastModified)) continue;
    if (file.size > 100 * 1024 * 1024 || next.reduce((sum, item) => sum + item.size, 0) + file.size > 200 * 1024 * 1024 || next.length >= 100) {
      warnings.push(t(`未添加 ${file.name}：单个文件上限 100 MB，每批最多 100 个文件、200 MB。`, `Skipped ${file.name}: limit 100 MB per file, 100 files and 200 MB per batch.`)); continue;
    }
    next.push(file);
  }
  if (next.length !== files.value.length) {
    invalidate();
    for (let index = files.value.length; index < next.length; index++) fileStates.value.push({ rule: 'auto', customSize: 2, rangeDraft: '', rangeError: '' });
    files.value = next;
  }
  if (ignored) warnings.push(t(`已忽略 ${ignored} 个非 PDF 文件。`, `Ignored ${ignored} non-PDF files.`));
  note.value = warnings.join(' ');
}
function pick(event: Event) {
  const input = event.target as HTMLInputElement;
  addFiles(Array.from(input.files || [])); input.value = '';
}
function drop(event: DragEvent) {
  dragging.value = false; addFiles(Array.from(event.dataTransfer?.files || []));
}
function remove(index: number) { files.value.splice(index, 1); fileStates.value.splice(index, 1); invalidate(); note.value = ''; }
function clear() { files.value = []; fileStates.value = []; invalidate(); note.value = ''; }
function stop() { stopping.value = true; controller?.abort(); }
function changed(report: ScannedReport) { report.review = true; report.confirmed = false; downloaded.value = false; }
function errorMessage(error: unknown) {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : '';
  if (/Password|destroyed/i.test(name + message)) return t('PDF 受密码保护，请先解锁后再添加。', 'This PDF is password protected. Unlock it and add it again.');
  if (message === 'PAGE_LIMIT') return t('单个 PDF 最多处理 1,000 页，请先分批。', 'The limit is 1,000 pages per PDF. Split this file into batches.');
  return t('无法读取或识别此 PDF。请检查文件是否损坏，并重试。', 'Could not read or recognize this PDF. Check the file and try again.');
}
function toolFailureMessage(error: unknown) {
  if (error instanceof Error && error.name === 'PdfBrowserCompatibilityError') return t('当前浏览器缺少 PDF 识别所需的功能。请升级浏览器，或使用最新版 Chrome / Edge 打开本页后重新选择文件。原文件不受影响。', 'This browser is missing features required for PDF recognition. Update your browser or open this page in the latest Chrome / Edge and select your files again. Originals are unchanged.');
  const kind = pdfToolFailureKind(error);
  if (kind === 'resource') return t('识别程序资源未能加载，可能是网络问题或页面版本已更新。请刷新页面后重新选择文件；原文件不受影响。', 'Recognition resources could not load. The connection may have failed or this page may be out of date. Refresh and select your files again; originals are unchanged.');
  if (kind === 'compatibility') return t('识别程序遇到浏览器兼容性或脚本错误。请使用最新版 Chrome / Edge 重试，并查看下方错误详情。文件仍保留在本地。', 'Recognition encountered a browser compatibility or script error. Try the latest Chrome / Edge and check the error details below. Files remain local.');
  return t('识别工具未能启动，请查看下方错误详情后重试。文件仍保留在本地。', 'Recognition tools could not start. Check the error details below and retry. Files remain local.');
}
async function scan() {
  if (!files.value.length || busy.value || !validSettings.value) return;
  invalidate(); stage.value = 'scanning'; note.value = ''; stopping.value = false;
  controller = new AbortController(); const signal = controller.signal;
  progressText.value = t('正在准备本地识别工具，首次使用需要加载资源…', 'Preparing local recognition tools. Assets load on first use…');
  let scanner: Awaited<ReturnType<typeof import('../lib/pdfReportScanner')['createReportScanner']>> | undefined;
  try {
    const { createReportScanner } = await import('../lib/pdfReportScanner');
    scanner = await createReportScanner(signal);
    for (const [index, file] of files.value.entries()) {
      throwIfAborted(signal);
      scanningIndex.value = index;
      try {
        const result = await scanner.scan(file, (page, total) => {
          percent.value = Math.round((index + page / total) / files.value.length * 100);
          progressText.value = t(`${file.name} · 第 ${page} / ${total} 页`, `${file.name} · Page ${page} / ${total}`);
        }, rotation.value, splitMode.value === 'auto');
        fileStates.value[index]!.scanned = markRaw(result);
        regroupFile(index);
      } catch (error) {
        if (signal.aborted) throw error;
        console.error('[ByteDesk PDF] File recognition failed', error);
        errors.value.push({ source: sourceName(file), message: errorMessage(error) });
      }
    }
    percent.value = 100;
    incomplete.value = errors.value.length > 0;
  } catch (error) {
    incomplete.value = true;
    if (signal.aborted) note.value = t('已停止。已完成文件的结果保留在下方。', 'Stopped. Results from completed files are kept below.');
    else {
      console.error('[ByteDesk PDF] Recognition tools could not start', error);
      note.value = toolFailureMessage(error);
      failureDetails.value = `${describePdfError(error)}\n\n${navigator.userAgent}\nSecure context: ${window.isSecureContext}; protocol: ${location.protocol}`;
    }
  } finally {
    scanningIndex.value = -1;
    try { await scanner?.dispose(); }
    catch (error) { console.warn('[ByteDesk PDF] Recognition cleanup failed', error); }
    finally { stage.value = 'ready'; stopping.value = false; }
  }
}
async function download() {
  if (!canDownload.value) return;
  stage.value = 'packing'; stopping.value = false; percent.value = 0;
  controller = new AbortController();
  try {
    const data = await packReports(files.value.map(file => ({ name: sourceName(file), bytes: () => file.arrayBuffer() })), reports.value,
      (completed, total) => { percent.value = Math.round(completed / total * 100); progressText.value = t(`正在打包 ${completed} / ${total} 份报告`, `Packing report ${completed} / ${total}`); }, controller.signal);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/zip' }));
    const link = document.createElement('a'); link.href = url;
    link.download = files.value.length === 1 ? `${files.value[0]!.name.replace(/\.pdf$/i, '')}_reports.zip` : 'pdf_reports.zip';
    document.body.append(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
    downloaded.value = true; stage.value = 'done';
  } catch {
    stage.value = 'ready'; note.value = controller.signal.aborted ? t('已取消打包，可以重新下载。', 'Packing cancelled. You can download again.') : t('打包失败，请减少本批文件数量后重试。', 'Packing failed. Try a smaller batch.');
  } finally { stopping.value = false; }
}
onMounted(() => { folderSupported.value = 'webkitdirectory' in document.createElement('input'); });
onBeforeUnmount(() => controller?.abort());
</script>

<template>
  <section class="pdf-tool" :aria-label="t('PDF 报告拆分工具', 'PDF report splitter')">
    <ol class="pdf-steps" :aria-label="t('处理步骤', 'Workflow')">
      <li :class="{ current: !reports.length }"><span>1</span>{{ t('选择 PDF', 'Choose PDFs') }}</li>
      <li :class="{ current: reports.length && !downloaded }"><span>2</span>{{ t('核对拆分结果', 'Review reports') }}</li>
      <li :class="{ current: downloaded }"><span>3</span>{{ t('下载压缩包', 'Download ZIP') }}</li>
    </ol>
    <div class="pdf-drop" :class="{ dragging, compact: files.length }" @dragover.prevent="dragging = !busy" @dragleave.prevent="dragging = false" @drop.prevent="drop">
      <svg class="pdf-paper-icon" viewBox="0 0 64 68" fill="none" aria-hidden="true"><path d="M16 13H46V62H16z" fill="var(--selection)" stroke="var(--accent)"/><path d="M23 5H44L55 16V55H23z" fill="var(--surface)" stroke="var(--accent)" stroke-width="1.5"/><path d="M44 5V16H55M31 28H47M31 34H47M31 40H41" stroke="var(--accent)" stroke-width="1.5"/><circle cx="16" cy="50" r="12" fill="var(--accent)"/><path d="M12 50H20M16 46V54" stroke="var(--surface)" stroke-width="1.5"/></svg>
      <div><h2>{{ files.length ? t('继续添加文件', 'Add more files') : t('把整本报告，分成一份一份。', 'Give each report its own file.') }}</h2><p>{{ t('拖入 PDF，或选择单个、多个文件。文件夹会包含子文件夹中的 PDF。', 'Drop PDFs, select one or several files, or choose a folder including its subfolders.') }}</p></div>
      <div class="pdf-pick-actions"><button class="pdf-button primary" :disabled="busy" @click="fileInput?.click()">{{ t('选择 PDF', 'Choose PDFs') }}</button><button class="pdf-button" :disabled="busy || !folderSupported" @click="folderInput?.click()">{{ t('选择文件夹', 'Choose folder') }}</button></div>
      <input ref="fileInput" class="pdf-hidden" type="file" accept=".pdf,application/pdf" multiple :disabled="busy" :aria-label="t('选择一个或多个 PDF', 'Select one or more PDFs')" @change="pick"/>
      <input ref="folderInput" class="pdf-hidden" type="file" webkitdirectory multiple :disabled="busy" :aria-label="t('选择包含 PDF 的文件夹', 'Select a folder containing PDFs')" @change="pick"/>
      <p v-if="!folderSupported" class="pdf-note">{{ t('当前浏览器不支持文件夹选择，请使用 PDF 多选。', 'Folder selection is unavailable in this browser. Select multiple PDFs instead.') }}</p>
    </div>
    <div class="pdf-local-note"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>{{ t('文件在你的浏览器中处理，不上传。原始页面内容与方向保持不变。', 'Files stay in your browser. Original page content and orientation are preserved.') }}</div>
    <p v-if="note" class="pdf-alert" role="status">{{ note }}</p>
    <details v-if="failureDetails" class="pdf-error-details">
      <summary>{{ t('查看错误详情', 'View error details') }}</summary>
      <pre>{{ failureDetails }}</pre>
      <p>{{ t('排查问题时，可将以上错误和浏览器版本提供给网站维护者。', 'Share this error and browser version with the site maintainer for troubleshooting.') }}</p>
    </details>
    <section v-if="files.length" class="pdf-queue" :aria-label="t('已选文件', 'Selected files')">
      <div class="pdf-section-head"><h2>{{ t('已选文件', 'Selected files') }} <span>{{ files.length }}</span></h2><span>{{ size(totalSize) }} <button :disabled="busy" @click="clear">{{ t('清空', 'Clear') }}</button></span></div>
      <fieldset class="pdf-split-mode" :disabled="busy">
        <legend>{{ t('拆分方式', 'Split mode') }}</legend>
        <label><input v-model="splitMode" type="radio" value="fixed" @change="invalidate"/>{{ t('统一页数', 'Same page count') }}</label>
        <label><input v-model="splitMode" type="radio" value="auto" @change="invalidate"/>{{ t('智能识别（支持混合页数）', 'Detect reports (mixed page counts)') }}</label>
      </fieldset>
      <p v-if="splitMode === 'auto'" class="pdf-auto-help">{{ t('连续相同报告编号归为一份，编号变化时拆分，支持同一 PDF 中混合 2、4、6 页等报告。印刷页码仅供参考，重复扫描的页面也会完整保留。', 'Consecutive pages with the same report ID stay together; a different ID starts a new report. Supports mixed page counts within one PDF. Printed page numbers are a reference, and repeated copies are preserved.') }}</p>
      <ul><li v-for="(file, index) in files" :key="`${sourceName(file)}-${file.size}-${file.lastModified}`">
        <div class="pdf-file-line"><span class="pdf-file-type">PDF</span><span class="pdf-source-name" :title="sourceName(file)">{{ sourceName(file) }}</span><span class="pdf-file-size">{{ size(file.size) }}</span><button :disabled="busy" :aria-label="t(`移除 ${file.name}`, `Remove ${file.name}`)" @click="remove(index)">×</button></div>
        <div v-if="splitMode === 'auto'" class="pdf-file-rule">
          <div class="pdf-rule-controls"><label :for="`pdf-rule-${index}`">{{ t('拆分规则', 'Split rule') }}<span class="pdf-sr-only"> · {{ file.name }}</span></label><select :id="`pdf-rule-${index}`" v-model="fileStates[index]!.rule" :disabled="busy" :aria-describedby="`pdf-rule-hint-${index}`" @change="changeFileRule(index)"><option value="auto">{{ t('按连续报告编号', 'Consecutive report IDs') }}</option><option value="pagination">{{ t('按印刷页码', 'Printed page numbers') }}</option><option :value="2">{{ t('统一 2 页', 'Always 2 pages') }}</option><option :value="4">{{ t('统一 4 页', 'Always 4 pages') }}</option><option :value="6">{{ t('统一 6 页', 'Always 6 pages') }}</option><option value="custom">{{ t('自定义统一页数', 'Custom fixed count') }}</option><option value="ranges" :disabled="!fileStates[index]!.scanned">{{ t('手动划分页段', 'Manual page ranges') }}</option></select><input v-if="fileStates[index]!.rule === 'custom'" v-model.number="fileStates[index]!.customSize" class="pdf-custom-size" type="number" min="1" max="1000" step="1" inputmode="numeric" :disabled="busy" :aria-label="t(`${file.name} 的自定义每份页数`, `Custom pages per report for ${file.name}`)" :aria-invalid="!validSize(fileStates[index]!.customSize)" @input="regroupFile(index)"/></div>
          <p :id="`pdf-rule-hint-${index}`" role="status">{{ fileRuleHint(index) }}</p>
          <div v-if="fileStates[index]!.rule === 'ranges' && fileStates[index]!.scanned" class="pdf-range-editor">
            <label :for="`pdf-ranges-${index}`">{{ t('拆分页段', 'Report page ranges') }}<span class="pdf-sr-only"> · {{ file.name }}</span></label>
            <p :id="`pdf-ranges-help-${index}`">{{ t(`原文件共 ${fileStates[index]!.scanned!.readings.length} 页，每行一份，例如 1-2、3-6、7-12。所有页面需按顺序完整包含。`, `The source has ${fileStates[index]!.scanned!.readings.length} pages. Enter one report per line, e.g. 1-2, 3-6, 7-12. Include every source page in order.`) }}</p>
            <textarea :id="`pdf-ranges-${index}`" v-model="fileStates[index]!.rangeDraft" rows="3" maxlength="30000" spellcheck="false" :disabled="busy" :aria-invalid="!!fileStates[index]!.rangeError" :aria-describedby="`pdf-ranges-help-${index}`" @input="fileStates[index]!.rangeError = ''; downloaded = false"/>
            <p v-if="fileStates[index]!.rangeError" class="pdf-validation" role="alert">{{ fileStates[index]!.rangeError }}</p>
            <button class="pdf-button small" :disabled="busy || !rangesUnapplied(fileStates[index]!)" @click="applyRanges(index)">{{ t('应用页段', 'Apply ranges') }}</button>
          </div>
        </div>
      </li></ul>
      <div class="pdf-run"><div v-if="splitMode === 'fixed'"><label class="pdf-group-size" for="pdf-group-size"><strong>{{ t('每份页数', 'Pages per report') }}</strong><input id="pdf-group-size" v-model.number="pagesPerReport" type="number" min="1" max="1000" step="1" inputmode="numeric" :disabled="busy" :aria-invalid="!validGroupSize" aria-describedby="pdf-group-hint" @input="invalidate"/><span>{{ t('页', 'pages') }}</span></label><p id="pdf-group-hint" :class="{ 'pdf-validation': !validGroupSize }">{{ groupHint }}</p></div><div v-else><strong>{{ unresolved ? t(`${unresolved} 个文件待应用设置`, `${unresolved} file(s) need settings applied`) : t('按所选规则，保留全部页面。', 'Keep every page using the selected rules.') }}</strong><p>{{ boundaryPending ? t(`${boundaryPending} 个页段需要核对边界。`, `${boundaryPending} range(s) need boundary review.`) : t('编号不清的位置可核对原图，并手动调整页段。', 'Review unclear report IDs in the scan and adjust ranges as needed.') }}</p></div><button class="pdf-button primary" :disabled="busy || !validSettings" @click="scan">{{ reports.length ? t('重新识别', 'Scan again') : t('开始识别与拆分', 'Recognize & split') }}</button></div>
      <details class="pdf-settings"><summary>{{ t('识别设置与适用范围', 'Recognition settings & supported format') }}</summary><label for="pdf-rotation">{{ t('文字识别方向', 'Text recognition orientation') }}<select id="pdf-rotation" v-model="rotation" :disabled="busy" @change="invalidate"><option value="auto">{{ t('自动检测', 'Automatic') }}</option><option :value="0">{{ t('正向', 'Upright') }}</option><option :value="90">{{ t('顺时针 90°', '90° clockwise') }}</option><option :value="180">180°</option><option :value="270">{{ t('逆时针 90°', '90° counterclockwise') }}</option></select></label><p>{{ t('适配右上角带“报告编号”的此类检测报告，示例编号 E030E10212600001。其他版式可在拆分后手动填写编号。每批最多 100 个文件、200 MB，单文件不超过 100 MB、1,000 页。末尾不足一份的页面会一起保留并提示核对。', 'Designed for this inspection-report layout with the report number at the upper right, with sample number E030E10212600001. For other layouts, enter numbers manually after splitting. Up to 100 files / 200 MB per batch; 100 MB / 1,000 pages per file. Any remaining pages are kept together and flagged for review.') }}</p></details>
    </section>
    <div v-if="busy" class="pdf-progress" role="status" aria-live="polite"><div><span>{{ stopping ? t('正在停止…', 'Stopping…') : progressText }}</span><button :disabled="stopping" @click="stop">{{ t('停止', 'Stop') }}</button></div><progress :value="percent" max="100">{{ percent }}%</progress></div>
    <div v-if="errors.length" class="pdf-alert" role="alert"><p v-for="error in errors" :key="error.source"><strong>{{ error.source }}</strong> — {{ error.message }}</p></div>
    <section v-if="reports.length" class="pdf-results" :aria-label="t('拆分结果', 'Split results')">
      <div class="pdf-section-head"><h2>{{ t('拆分结果', 'Split results') }} <span>{{ reports.length }}</span></h2><label class="pdf-filter"><input v-model="onlyReview" type="checkbox"/>{{ t(`只看待核对（${pending}）`, `Needs review (${pending})`) }}</label></div>
      <p class="pdf-result-note">{{ t('展开编号原图核对识别结果。异常页段需确认边界，也可在文件设置中手动调整拆分范围。', 'Open the report number scan to check the recognition. Confirm unclear boundaries or adjust the ranges in the file settings.') }}</p>
      <div class="pdf-report-list">
        <article v-for="{ report, index } in visibleReports" :key="`${report.sourceIndex}-${report.pages[0]}`" class="pdf-report" :class="{ attention: needsReview(report) }">
          <div class="pdf-report-top"><span>{{ t(`第 ${range(report)} 页`, `Pages ${range(report)}`) }}</span><span class="pdf-source-name" :title="sourceName(files[report.sourceIndex]!)">{{ sourceName(files[report.sourceIndex]!) }}</span><span class="pdf-status">{{ needsReview(report) ? t('待核对', 'Review') : report.confirmed ? t('已确认', 'Confirmed') : t(report.pages.length === 1 ? '已识别编号' : '组内编号一致', report.pages.length === 1 ? 'Number recognized' : 'Numbers match') }}</span></div>
          <div v-if="needsBoundaryReview(report)" class="pdf-boundary-alert"><p>{{ boundaryMessage(report) }}</p><div><button class="pdf-button small" :disabled="busy" @click="report.boundaryConfirmed = true">{{ t('确认此页段为一份', 'Confirm this range as one report') }}</button><button class="pdf-button small" :disabled="busy" @click="editRanges(report.sourceIndex)">{{ t('调整拆分范围', 'Adjust page ranges') }}</button></div></div>
          <div class="pdf-name-line"><label :for="`pdf-report-${index}`" class="pdf-sr-only">{{ t(`第 ${index + 1} 份报告编号`, `Report ${index + 1} number`) }}</label><input :id="`pdf-report-${index}`" v-model="report.name" :disabled="busy" :placeholder="t('填写报告编号', 'Enter report number')" :aria-invalid="!validReportName(report.name)" spellcheck="false" autocomplete="off" @input="changed(report)"/><span>.pdf</span><button v-if="report.review && !report.confirmed" class="pdf-button small" :disabled="busy || !validReportName(report.name)" @click="report.confirmed = true">{{ t('确认编号', 'Confirm') }}</button></div>
          <p v-if="!validReportName(report.name)" class="pdf-validation">{{ t('请填写编号，可使用字母、数字、短横线和下划线。', 'Enter a number using letters, digits, hyphens or underscores.') }}</p>
          <p v-else-if="names[index] !== `${report.name.trim()}.pdf`" class="pdf-duplicate">{{ t('压缩包文件名：', 'ZIP filename: ') }}{{ names[index] }}</p>
          <details class="pdf-proof"><summary>{{ t('核对编号原图', 'Check report number scan') }}</summary><div class="pdf-proof-grid"><figure v-for="(reading, pageIndex) in report.readings" :key="pageIndex"><figcaption>{{ t(`第 ${report.pages[pageIndex]! + 1} 页`, `Page ${report.pages[pageIndex]! + 1}`) }} · {{ reading.reading?.number || t('未识别出编号', 'Number not recognized') }}</figcaption><img :src="reading.preview" :alt="t(`第 ${report.pages[pageIndex]! + 1} 页报告编号原图`, `Original report number on page ${report.pages[pageIndex]! + 1}`)" width="660" height="115"/></figure></div><p v-if="report.pages.length < report.pagesPerReport">{{ t(`这一段共 ${report.pages.length} 页，少于预期的 ${report.pagesPerReport} 页，页面已全部保留。`, `This range contains ${report.pages.length} of the expected ${report.pagesPerReport} pages. All available pages are kept.`) }}</p></details>
        </article>
        <p v-if="!visibleReports.length" class="pdf-empty-review">{{ t('所有报告均已核对完成。', 'All reports are ready.') }}</p>
      </div>
      <label v-if="incomplete" class="pdf-partial"><input v-model="allowPartial" type="checkbox"/>{{ t('本批有文件未完成。我确认只下载上方已完成的结果。', 'Some files were not completed. Download only the completed results shown above.') }}</label>
      <div class="pdf-download"><div><strong>{{ downloaded ? t('压缩包已生成', 'ZIP created') : t(`${reports.length} 份 PDF，打包带走。`, `${reports.length} PDFs, in one ZIP.`) }}</strong><p>{{ unresolved ? t(`还有 ${unresolved} 个文件的设置尚未应用。`, `${unresolved} file(s) have unapplied settings.`) : pending ? t(`还有 ${pending} 份需要核对页段或编号。`, `${pending} report ranges or numbers still need review.`) : t('包含全部拆分后的 PDF。', 'Includes all split PDFs.') }}</p></div><button class="pdf-button primary" :disabled="!canDownload" @click="download">{{ downloaded ? t('再次下载 ZIP', 'Download ZIP again') : t('下载 ZIP 压缩包', 'Download ZIP') }}</button></div>
    </section>
  </section>
</template>

<style scoped>
.pdf-range-editor{margin-top:12px;max-width:560px}.pdf-range-editor>label{font-size:12px;font-weight:550}.pdf-range-editor textarea{display:block;width:100%;margin:9px 0;resize:vertical;min-height:80px;padding:9px 11px;border:1px solid var(--line);border-radius:5px;background:var(--surface);color:var(--text);font:inherit;font-variant-numeric:tabular-nums;line-height:1.6}.pdf-boundary-alert{padding:12px;margin-bottom:12px;border-left:3px solid var(--tool-warn);background:var(--hover);border-radius:0 5px 5px 0}.pdf-boundary-alert p{font-size:12px;line-height:1.7;color:var(--tool-warn)}.pdf-boundary-alert>div{display:flex;gap:8px;flex-wrap:wrap;margin-top:9px}

.pdf-split-mode{display:flex;flex-wrap:wrap;align-items:center;gap:14px 24px;border:0;padding:0;margin:0 0 15px}.pdf-split-mode legend{font-size:11px;color:var(--secondary);margin-bottom:10px}.pdf-split-mode label{display:flex;align-items:center;gap:7px;font-size:12px;cursor:pointer}.pdf-split-mode input{accent-color:var(--accent)}.pdf-auto-help{font-size:11px;line-height:1.8;color:var(--secondary);margin:0 0 14px;max-width:640px}.pdf-file-rule{padding:8px 0 0 41px}.pdf-rule-controls{display:flex;flex-wrap:wrap;align-items:center;gap:9px}.pdf-rule-controls label{font-size:11px;color:var(--secondary)}.pdf-rule-controls select,.pdf-custom-size{min-height:34px;border:1px solid var(--line);border-radius:5px;background:var(--surface);color:var(--text);font-size:12px;padding:5px 8px}.pdf-custom-size{width:76px}.pdf-file-rule p{font-size:11px;color:var(--secondary);margin-top:7px;line-height:1.7}.pdf-file-rule p.pdf-validation{color:var(--tool-warn)}

.pdf-group-size{display:flex;align-items:center;gap:10px}.pdf-group-size input{width:76px;min-height:36px;padding:6px 8px;border:1px solid var(--line);border-radius:5px;background:var(--surface);color:var(--text);font-size:14px;font-variant-numeric:tabular-nums}.pdf-group-size>span{color:var(--secondary);font-size:12px}.pdf-run p.pdf-validation{color:var(--tool-warn)}
.pdf-tool{--tool-warn:#94611b;font-size:13px}.pdf-steps{display:flex;list-style:none;padding:0;margin:0 0 24px;gap:28px;color:var(--secondary);font-size:12px}.pdf-steps li{display:flex;align-items:center;gap:8px}.pdf-steps li>span{display:grid;place-items:center;width:23px;height:23px;border:1px solid var(--line);border-radius:50%;font-variant-numeric:tabular-nums}.pdf-steps .current{color:var(--accent);font-weight:600}.pdf-steps .current>span{background:var(--selection);border-color:var(--selection)}.pdf-drop{border:1px dashed var(--accent);border-radius:12px;padding:32px 24px;background:var(--surface);display:flex;align-items:center;text-align:center;flex-direction:column;gap:16px}.pdf-drop.dragging{background:var(--selection);outline:3px solid var(--accent);outline-offset:3px}.pdf-paper-icon{width:58px;height:62px}.pdf-drop h2{font-size:20px;font-weight:600;letter-spacing:-.4px}.pdf-drop p{max-width:440px;margin:8px auto 0;color:var(--secondary);font-size:12px;line-height:1.8}.pdf-pick-actions{display:flex;gap:10px;margin-top:2px}.pdf-button{border:1px solid var(--line);border-radius:7px;background:var(--surface);padding:10px 17px;font-weight:550;font-size:13px;white-space:nowrap;min-height:40px}.pdf-button:hover:not(:disabled){background:var(--hover)}.pdf-button.primary{background:var(--accent);color:var(--surface);border-color:var(--accent)}.pdf-button.primary:hover:not(:disabled){filter:brightness(.93)}.pdf-button:disabled{opacity:.45}.pdf-button.small{padding:5px 11px;min-height:34px;font-size:12px}.pdf-hidden{display:none}.pdf-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.pdf-local-note{display:flex;align-items:flex-start;gap:7px;color:var(--secondary);font-size:11px;line-height:1.8;margin:12px 0 26px}.pdf-local-note svg{margin-top:3px}.pdf-drop.compact{flex-direction:row;flex-wrap:wrap;padding:18px;text-align:left;gap:14px}.compact .pdf-paper-icon{width:38px;height:41px}.compact h2{font-size:15px}.compact>div:nth-child(2){flex:1;min-width:170px}.compact p{margin:4px 0 0;font-size:11px}.compact .pdf-pick-actions{margin-left:auto}.pdf-section-head{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:13px}.pdf-section-head h2{font-size:16px;font-weight:600}.pdf-section-head h2 span{font-size:12px;color:var(--secondary);font-weight:400;margin-left:6px}.pdf-section-head>span{font-size:11px;color:var(--secondary)}.pdf-section-head>span>button{color:var(--accent);margin-left:15px;padding:5px}.pdf-queue ul{list-style:none;padding:0;margin:0;max-height:440px;overflow-y:auto}.pdf-queue li{padding:12px 0;border-top:1px solid var(--line);font-size:12px}.pdf-file-line{display:flex;align-items:center;gap:12px}.pdf-file-type{color:var(--accent);font-size:9px;font-weight:650;border:1px solid var(--line);padding:4px;border-radius:3px}.pdf-source-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}.pdf-file-size{font-size:11px;color:var(--secondary);white-space:nowrap}.pdf-file-line>button{font-size:20px;color:var(--secondary);padding:2px 7px}.pdf-run{border-top:1px solid var(--line);padding:18px 0 10px;display:flex;align-items:center;justify-content:space-between;gap:15px}.pdf-run strong,.pdf-download strong{font-size:14px;font-weight:550}.pdf-run p,.pdf-download p{font-size:11px;color:var(--secondary);margin-top:5px}.pdf-settings{color:var(--secondary);font-size:11px;padding:8px 0 22px}.pdf-settings summary,.pdf-proof summary{cursor:pointer;width:fit-content;padding:5px 0;color:var(--accent)}.pdf-settings label{display:flex;align-items:center;gap:15px;margin:12px 0}.pdf-settings select{background:var(--surface);border:1px solid var(--line);border-radius:5px;color:var(--text);padding:6px;font-size:12px}.pdf-settings p{line-height:1.9;max-width:650px}.pdf-progress{border:1px solid var(--line);padding:17px;border-radius:8px;margin:16px 0 24px;background:var(--surface)}.pdf-progress>div{display:flex;justify-content:space-between;gap:12px;font-size:12px}.pdf-progress>div>span{overflow-wrap:anywhere}.pdf-progress button{color:var(--accent);flex-shrink:0}.pdf-progress progress{width:100%;height:6px;border:0;display:block;margin-top:13px;accent-color:var(--accent)}.pdf-alert{background:var(--hover);border-left:3px solid var(--accent);padding:12px 15px;margin:15px 0;color:var(--secondary);font-size:12px;line-height:1.8;overflow-wrap:anywhere}.pdf-alert p+p{margin-top:8px}.pdf-results{margin-top:22px}.pdf-filter{display:flex;align-items:center;gap:5px;color:var(--secondary);font-size:11px}.pdf-filter input,.pdf-partial input{accent-color:var(--accent)}.pdf-result-note{font-size:12px;color:var(--secondary);line-height:1.8;margin-bottom:18px}.pdf-report-list{border-top:1px solid var(--line)}.pdf-report{padding:17px 0;border-bottom:1px solid var(--line)}.pdf-report-top{display:flex;gap:12px;font-size:11px;color:var(--secondary);margin-bottom:10px;align-items:center}.pdf-report-top>span:first-child{flex-shrink:0;min-width:64px}.pdf-status{color:var(--accent);font-size:10px;white-space:nowrap}.attention .pdf-status{color:var(--tool-warn)}.pdf-name-line{display:flex;align-items:center;gap:10px}.pdf-name-line>input{width:min(100%,300px);min-width:0;border:1px solid var(--line);background:var(--surface);border-radius:5px;padding:8px 10px;font-size:14px;font-variant-numeric:tabular-nums;color:var(--text);letter-spacing:.3px}.pdf-name-line>span{color:var(--secondary);font-size:12px}.pdf-name-line>button{margin-left:auto}.pdf-validation,.pdf-duplicate{margin-top:8px;font-size:11px;overflow-wrap:anywhere}.pdf-validation{color:var(--tool-warn)}.pdf-duplicate{color:var(--secondary)}.pdf-proof{margin-top:6px;font-size:11px}.pdf-proof-grid{display:grid;gap:12px;margin-top:8px}.pdf-proof figure{margin:0;min-width:0}.pdf-proof figcaption{color:var(--secondary);margin-bottom:6px;overflow-wrap:anywhere}.pdf-proof img{width:100%;max-width:660px;height:auto;object-fit:contain;background:white;border:1px solid var(--line);border-radius:4px}.pdf-proof p{color:var(--tool-warn);margin-top:8px}.pdf-partial{display:flex;align-items:flex-start;gap:7px;font-size:12px;color:var(--secondary);padding-top:20px}.pdf-download{display:flex;align-items:center;justify-content:space-between;gap:15px;padding:22px 0;margin-top:6px}.pdf-empty-review{padding:25px 0;text-align:center;color:var(--secondary)}:global([data-theme=dark]) .pdf-tool{--tool-warn:#e6b668}
@container content (max-width:620px){.pdf-steps{gap:15px;justify-content:space-between;font-size:11px}.pdf-steps li{gap:5px}.pdf-steps li>span{width:20px;height:20px}.pdf-drop{padding:24px 17px}.pdf-drop h2{font-size:18px}.compact .pdf-pick-actions{margin-left:0;width:100%;padding-left:52px}.pdf-run,.pdf-download{align-items:flex-start;flex-direction:column}.pdf-run>.pdf-button,.pdf-download>.pdf-button{width:100%}.pdf-report-top{gap:8px}.pdf-name-line{flex-wrap:wrap}.pdf-name-line>input{flex:1;max-width:300px}.pdf-name-line>button{margin-left:0}.pdf-section-head{gap:10px}.pdf-filter{font-size:10px}.pdf-proof-grid{grid-template-columns:1fr}.pdf-source-name{font-size:11px}.pdf-section-head h2{font-size:15px}}
.pdf-error-details{margin:-5px 0 20px;font-size:12px;color:var(--secondary)}
.pdf-error-details summary{cursor:pointer;color:var(--accent);padding:5px 0;width:fit-content}
.pdf-error-details pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;line-height:1.7;background:var(--hover);padding:12px;border-radius:5px;margin:8px 0}
.pdf-error-details p{font-size:11px;line-height:1.8}
</style>
