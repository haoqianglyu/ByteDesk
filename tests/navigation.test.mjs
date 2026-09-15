import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';
import ts from 'typescript';

const script = ts.transpileModule(readFileSync('src/lib/navigation.ts', 'utf8'), {
 compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

function initialize(crypto, state = {}) {
 const listeners = new Set();
 const history = { state, replaceState(value) { this.state = value; } };
 const context = createContext({
  exports: {}, crypto, history, location: { pathname: '/zh/', search: '' },
  window: { addEventListener(name) { listeners.add(name); } },
  document: { addEventListener(name) { listeners.add(name); } },
 });
 runInContext(script, context);
 return { context, history, listeners };
}

test('navigation initializes without crypto.randomUUID on older browsers and HTTP origins', () => {
 for (const crypto of [undefined, {}]) {
  const { context, history, listeners } = initialize(crypto, { routerIndex: 7 });
  assert.equal(typeof history.state.bytedeskEntry, 'string');
  assert.equal(history.state.routerIndex, 7);
  for (const name of ['astro:before-swap', 'scroll', 'hashchange', 'popstate']) assert.ok(listeners.has(name), name);
  const first = history.state.bytedeskEntry;
  assert.equal(runInContext('historyEntry()', context), first, 'reuse the active entry');
  const keys = new Set([first]);
  for (let i = 0; i < 100; i++) keys.add(runInContext('historyEntry(true)', context));
  assert.equal(keys.size, 101, 'rapid navigation must produce distinct scroll entries');
  assert.equal(history.state.routerIndex, 7);
 }
});

test('initialization preserves an existing history entry for back/forward navigation', () => {
 const { history } = initialize(undefined, { bytedeskEntry: 'previous-entry', routerIndex: 3 });
 assert.equal(history.state.bytedeskEntry, 'previous-entry');
 assert.equal(history.state.routerIndex, 3);
});
