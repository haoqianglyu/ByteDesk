import test from 'node:test';
import assert from 'node:assert/strict';
import { fitWindow, resizeWindow } from '../src/lib/windowGeometry.ts';
const bounds = { left: 6, top: 36, right: 1394, bottom: 800 };
const rect = { left: 200, top: 100, width: 900, height: 600 };

test('each edge and corner keeps its opposite edge anchored', () => {
 for (const edge of ['n','s','e','w','ne','nw','se','sw']) {
  const r = resizeWindow(rect, edge, 50, 30, bounds);
  assert.equal(r.left, edge.includes('w') ? 250 : 200);
  assert.equal(r.top, edge.includes('n') ? 130 : 100);
  assert.equal(r.left + r.width, edge.includes('e') ? 1150 : 1100);
  assert.equal(r.top + r.height, edge.includes('s') ? 730 : 700);
 }
});
test('large pointer movements respect minimum sizes and visible desktop bounds', () => {
 for (const edge of ['n','s','e','w','ne','nw','se','sw']) {
  for (const delta of [-10000,10000]) {
   const r=resizeWindow(rect,edge,delta,delta,bounds);
   assert.ok(r.width>=560 && r.height>=320);
   assert.ok(r.left>=bounds.left && r.top>=bounds.top);
   assert.ok(r.left+r.width<=bounds.right && r.top+r.height<=bounds.bottom);
  }
 }
});
test('viewport contraction fits the window without losing its reachable edges', () => {
 const small={left:6,top:36,right:610,bottom:300};
 assert.deepEqual(fitWindow(rect,small),{left:6,top:36,width:604,height:264});
 const moved=fitWindow({...rect,left:-1000,top:9000},bounds);
 assert.equal(moved.left,6); assert.equal(moved.top+moved.height,800);
});
