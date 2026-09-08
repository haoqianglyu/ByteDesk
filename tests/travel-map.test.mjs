import test from 'node:test';
import assert from 'node:assert/strict';
import {travelProjection,zoomAround,fitPoints,clusterPoints,worldView} from '../src/lib/travelMap.ts';

test('map projection places cities on the correct side of the world and round-trips coordinates',()=>{
 const cities=[[-74,40.7],[12.1,46.5],[139.7,35.7]];
 const points=cities.map(c=>travelProjection(c));
 assert.ok(points[0][0]<points[1][0]&&points[1][0]<points[2][0]);
 cities.forEach((city,i)=>travelProjection.invert(points[i]).forEach((n,j)=>assert.ok(Math.abs(n-city[j])<1e-5)));
});
test('zoom preserves its anchor and reset boundaries; empty and single-place fits remain usable',()=>{
 const zoom=zoomAround(worldView,2,300,200);
 assert.equal(zoom.x+300*zoom.k,300);assert.equal(zoom.y+200*zoom.k,200);
 assert.deepEqual(zoomAround(zoom,.01),worldView);
 assert.deepEqual(fitPoints([]),worldView);
 const [x,y]=travelProjection([12.1,46.5]);const fitted=fitPoints([{id:'sample',x,y}]);
 assert.ok(fitted.k>1&&fitted.k<=5);assert.ok(fitted.x+x*fitted.k>0&&fitted.x+x*fitted.k<960);
});
test('nearby destinations cluster at world scale and split when zoomed, preserving every place',()=>{
 const points=[{id:'a',x:500,y:200},{id:'b',x:510,y:204},{id:'c',x:800,y:250}];
 assert.equal(clusterPoints(points,42).length,2);
 assert.equal(clusterPoints(points,5).length,3);
 assert.deepEqual(clusterPoints(points,42).flatMap(g=>g.points.map(p=>p.id)).sort(),['a','b','c']);
});
