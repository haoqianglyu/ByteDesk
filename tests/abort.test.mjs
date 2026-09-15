import test from 'node:test';
import assert from 'node:assert/strict';
import { throwIfAborted } from '../src/lib/abort.ts';

test('cancellation works without throwIfAborted or the newer reason property', () => {
 assert.doesNotThrow(() => throwIfAborted());
 assert.doesNotThrow(() => throwIfAborted({ aborted: false }));
 assert.throws(() => throwIfAborted({ aborted: true }), { name: 'AbortError' });
 for (const reason of [new Error('Stopped'), null, 'custom reason']) {
  assert.throws(() => throwIfAborted({ aborted: true, reason }), value => value === reason);
 }
});
