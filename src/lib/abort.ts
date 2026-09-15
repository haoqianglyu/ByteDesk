/** Preserve cancellation on browsers that do not implement throwIfAborted(). */
export function throwIfAborted(signal?: AbortSignal): void {
 if (signal?.aborted) {
  throw 'reason' in signal ? signal.reason : new DOMException('The operation was aborted.', 'AbortError');
 }
}
