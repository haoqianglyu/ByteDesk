import { geoNaturalEarth1 } from 'd3-geo';

export const mapWidth=960,mapHeight=500;
export const travelProjection=geoNaturalEarth1().fitExtent([[24,12],[936,488]],{type:'Sphere'});
export type MapPoint={id:string;x:number;y:number};
export type MapView={x:number;y:number;k:number};
export const worldView:MapView={x:0,y:0,k:1};
export function constrainView(view:MapView):MapView{
 const k=Math.max(1,Math.min(9,view.k));
 return {k,x:Math.min(0,Math.max(mapWidth*(1-k),view.x)),y:Math.min(0,Math.max(mapHeight*(1-k),view.y))};
}
export function zoomAround(view:MapView,factor:number,x=mapWidth/2,y=mapHeight/2):MapView{
 const k=Math.max(1,Math.min(9,view.k)),next=Math.max(1,Math.min(9,k*factor));
 return constrainView({k:next,x:x-(x-view.x)*next/k,y:y-(y-view.y)*next/k});
}
export function fitPoints(points:MapPoint[],maxZoom=5):MapView{
 if(!points.length)return {...worldView};
 const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
 const left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
 const k=Math.max(1,Math.min(maxZoom,(mapWidth-240)/Math.max(1,right-left),(mapHeight-170)/Math.max(1,bottom-top)));
 return constrainView({k,x:mapWidth/2-(left+right)/2*k,y:mapHeight/2-(top+bottom)/2*k});
}
export function clusterPoints(points:MapPoint[],radius:number){
 const groups:{x:number;y:number;points:MapPoint[]}[]=[];
 for(const point of [...points].sort((a,b)=>a.id.localeCompare(b.id))){
  const group=groups.find(g=>Math.hypot(g.x-point.x,g.y-point.y)<radius);
  if(group){group.points.push(point);group.x=group.points.reduce((s,p)=>s+p.x,0)/group.points.length;group.y=group.points.reduce((s,p)=>s+p.y,0)/group.points.length;}
  else groups.push({x:point.x,y:point.y,points:[point]});
 }
 return groups;
}
