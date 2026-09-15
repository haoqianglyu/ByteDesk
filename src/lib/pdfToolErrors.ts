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
 if (/SyntaxError|(?:withResolvers|getOrInsert(?:Computed)?|Promise\.try|URL\.parse|Math\.sumPrecise|Float16Array|DOMMatrix).*(?:not a function|not a constructor|not defined|undefined)/i.test(detail)) return 'compatibility';
 return 'unknown';
}
