export function describePdfError(error: unknown): string {
 if (typeof error === 'string') return error;
 if (error && typeof error === 'object') {
  const { name, message } = error as { name?: unknown; message?: unknown };
  if (typeof message === 'string') return typeof name === 'string' ? `${name}: ${message}` : message;
 }
 return 'Unknown error';
}

export function pdfToolFailureKind(error: unknown): 'resource' | 'compatibility' | 'unknown' {
 const detail = describePdfError(error);
 if (/Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .+ failed|Failed to load module script/i.test(detail)) return 'resource';
 if (/PdfBrowserCompatibilityError|SyntaxError|(?:withResolvers|getOrInsert(?:Computed)?|Promise\.try|URL\.parse|Math\.sumPrecise|Float16Array|DOMMatrix).*(?:not a function|not a constructor|not defined|undefined)/i.test(detail)) return 'compatibility';
 return 'unknown';
}

// PDF.js's legacy build does not polyfill all browser APIs. Check its essential
// native requirements before importing the scanner, so an older engine gets an
// actionable error instead of failing while parsing/evaluating a lazy module.
export function assertPdfBrowserSupport() {
 const required: [string, unknown][] = [
  ['Promise.withResolvers', Promise.withResolvers],
  ['Array.prototype.at', Array.prototype.at],
  ['Array.prototype.findLast', Array.prototype.findLast],
  ['structuredClone', globalThis.structuredClone],
  ['AbortSignal.prototype.throwIfAborted', globalThis.AbortSignal?.prototype.throwIfAborted],
  ['DOMMatrix', globalThis.DOMMatrix],
  ['Worker', globalThis.Worker],
  ['WebAssembly.instantiate', globalThis.WebAssembly?.instantiate],
 ];
 const missing = required.filter(([, value]) => typeof value !== 'function').map(([name]) => name);
 if (missing.length) {
  const error = new Error(`Missing browser features: ${missing.join(', ')}`);
  error.name = 'PdfBrowserCompatibilityError';
  throw error;
 }
}
