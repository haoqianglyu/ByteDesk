<script setup lang="ts">
import { computed,onMounted,onUnmounted,ref,watch } from 'vue';
import { geoGraticule10,geoPath } from 'd3-geo';
import type { FeatureCollection } from 'geojson';
import world from '../data/world.json';
import { clusterPoints,constrainView,fitPoints,travelProjection,worldView,zoomAround,type MapView } from '../lib/travelMap';
import type { PostCard } from '../lib/content';
import { dateLabel,type Locale } from '../lib/i18n';
import Icon from './Icon.vue';

const props=defineProps<{locale:Locale;posts:PostCard[]}>();
const zh=computed(()=>props.locale==='zh');
const tag=ref('');
const posts=computed(()=>props.posts.filter(p=>p.category==='travel'&&(!tag.value||p.tags.includes(tag.value))));
const tags=computed(()=>[...new Set(props.posts.filter(p=>p.category==='travel').flatMap(p=>p.tags))]);
const places=computed(()=>{
 const groups=new Map<string,{id:string;x:number;y:number;name:string;region:string;posts:PostCard[]}>();
 for(const post of posts.value){
  const place=post.place;if(!place)continue;
  const group=groups.get(place.id);
  if(group)group.posts.push(post);
  else{const [x,y]=travelProjection([place.longitude,place.latitude])!;groups.set(place.id,{id:place.id,x,y,name:place.name,region:place.region,posts:[post]});}
 }
 return [...groups.values()];
});
const selectedId=ref(props.posts.find(p=>p.category==='travel'&&p.place)?.place?.id??'');
const selected=computed(()=>places.value.find(p=>p.id===selectedId.value)??places.value[0]);
const selectedPost=computed(()=>selected.value?.posts[0]);
const onlySamples=computed(()=>posts.value.length>0&&posts.value.every(p=>p.sample));
const view=ref<MapView>({...worldView}),svg=ref<SVGSVGElement>(),svgScale=ref(1);
const atlas=ref<HTMLElement>();
const journal=ref<HTMLElement>();
const failedCovers=ref(new Set<string>());
const clusterIds=ref<string[]>([]);
const clusterPlaces=computed(()=>places.value.filter(p=>clusterIds.value.includes(p.id)));
watch(tag,()=>{
 clusterIds.value=[];
 const url=new URL(location.href);
 if(tag.value)url.searchParams.set('tag',tag.value);else url.searchParams.delete('tag');
 history.replaceState(history.state,'',url);
});
const path=geoPath(travelProjection).digits(2);
const countries=(world as unknown as FeatureCollection).features.map(f=>({id:String(f.properties?.id),path:path(f)??''}));
const gridPath=path(geoGraticule10())??'';
const groups=computed(()=>clusterPoints(places.value,42/svgScale.value/view.value.k));
const projectedTransform=computed(()=>`translate(${view.value.x} ${view.value.y}) scale(${view.value.k})`);
const href=(post:PostCard)=>`/${props.locale}/posts/${post.slug}/`;
function selectPlace(id:string,focus=false){clusterIds.value=[];selectedId.value=id;if(focus){const place=places.value.find(p=>p.id===id);if(place)view.value=fitPoints([place]);}}
function showOnMap(id:string){selectPlace(id,true);atlas.value?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}
function groupLabel(ids:string[]){return ids.length>1?(zh.value?`${ids.length} 个地点，放大查看`:`Zoom to ${ids.length} places`):places.value.find(p=>p.id===ids[0])?.name??'';}
function activate(ids:string[]){
 if(ids.length===1)selectPlace(ids[0]);
 else{clusterIds.value=ids;view.value=fitPoints(places.value.filter(p=>ids.includes(p.id)),Math.min(9,view.value.k*2.5));}
}
function coords(event:PointerEvent|WheelEvent){
 const point=svg.value!.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
 return point.matrixTransform(svg.value!.getScreenCTM()!.inverse());
}
const pointers=new Map<number,{x:number;y:number}>();
let dragged=false;
function pointerDown(event:PointerEvent){
 if(event.button!==0||(event.target as Element).closest('[data-map-pin]'))return;
 const point=coords(event);pointers.set(event.pointerId,point);dragged=false;
 svg.value!.setPointerCapture(event.pointerId);
}
function pointerMove(event:PointerEvent){
 const before=pointers.get(event.pointerId);if(!before)return;
 const next=coords(event);
 if(Math.hypot(next.x-before.x,next.y-before.y)>2)dragged=true;
 if(pointers.size===2){
  const other=[...pointers.entries()].find(([id])=>id!==event.pointerId)![1];
  const oldDistance=Math.hypot(before.x-other.x,before.y-other.y),newDistance=Math.hypot(next.x-other.x,next.y-other.y);
  const mid={x:(before.x+other.x)/2,y:(before.y+other.y)/2};
  const zoomed=zoomAround(view.value,newDistance/Math.max(1,oldDistance),mid.x,mid.y);
  view.value=constrainView({...zoomed,x:zoomed.x+(next.x-before.x)/2,y:zoomed.y+(next.y-before.y)/2});
 }else view.value=constrainView({...view.value,x:view.value.x+next.x-before.x,y:view.value.y+next.y-before.y});
 pointers.set(event.pointerId,next);
}
function pointerUp(event:PointerEvent){pointers.delete(event.pointerId);if(svg.value?.hasPointerCapture(event.pointerId))svg.value.releasePointerCapture(event.pointerId);}
function wheel(event:WheelEvent){
 // Normal scrolling still scrolls the journal; modifier + wheel zooms the map.
 if(!event.ctrlKey&&!event.metaKey)return;event.preventDefault();const point=coords(event);
 view.value=zoomAround(view.value,Math.exp(-event.deltaY*.006),point.x,point.y);
}
function keyboard(event:KeyboardEvent){
 if(event.target!==svg.value)return;
 const delta=45;
 if(event.key==='+'||event.key==='=')view.value=zoomAround(view.value,1.4);
 else if(event.key==='-')view.value=zoomAround(view.value,1/1.4);
 else if(event.key==='Home')view.value={...worldView};
 else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))view.value=constrainView({...view.value,x:view.value.x+(event.key==='ArrowLeft'?delta:event.key==='ArrowRight'?-delta:0),y:view.value.y+(event.key==='ArrowUp'?delta:event.key==='ArrowDown'?-delta:0)});
 else return;event.preventDefault();
}
let observer:ResizeObserver|undefined;
onMounted(()=>{
 // Server-rendered photos may fail before Vue attaches its error listeners.
 journal.value?.querySelectorAll('img').forEach(img=>{
  const src=img.getAttribute('src');
  if(src&&img.complete&&!img.naturalWidth)failedCovers.value.add(src);
 });
 tag.value=new URLSearchParams(location.search).get('tag')??'';
 observer=new ResizeObserver(()=>{svgScale.value=svg.value?.getScreenCTM()?.a||1;});if(svg.value)observer.observe(svg.value);
 svg.value?.addEventListener('wheel',wheel,{passive:false});
});
onUnmounted(()=>{observer?.disconnect();svg.value?.removeEventListener('wheel',wheel);pointers.clear();});
</script>

<template>
 <div ref="journal" class="travel-journal">
  <header class="travel-heading"><div><p class="eyebrow">A WORLD OF LITTLE STORIES</p><h1>{{ zh?'把故事，留在地图上。':'A world of places. A handful of stories.' }}</h1><p>{{ zh?'走过的地方，遇见的风景，都值得慢慢记下来。':'Places wandered, quiet moments found. A little collection of the world.' }}</p></div><span class="travel-heading-icon"><Icon name="travel" :size="30"/></span></header>
  <section ref="atlas" class="travel-atlas" :aria-label="zh?'旅行足迹地图':'Travel footprints map'">
   <div class="atlas-toolbar"><div class="atlas-title"><span class="atlas-dot"></span><strong>{{ zh?'旅行足迹':'Travel atlas' }}</strong><span>{{ String(places.length).padStart(2,'0') }} {{ zh?(onlySamples?'示例地点':'地点'):(onlySamples?'sample places':'places') }}</span></div><div class="atlas-views"><button :class="{active:view.k===1}" @click="view={...worldView}">{{ zh?'世界':'World' }}</button><button :disabled="!places.length" :class="{active:view.k>1}" @click="view=fitPoints(places)">{{ zh?'足迹':'Footprints' }}</button></div></div>
   <div class="atlas-map">
    <svg ref="svg" class="atlas-svg" viewBox="0 0 960 500" tabindex="0" role="group" :aria-label="zh?'世界地图。加减键缩放，方向键移动，Home 键复位。':'World map. Plus and minus to zoom, arrow keys to pan, Home to reset.'" @keydown="keyboard" @pointerdown="pointerDown" @pointermove="pointerMove" @pointerup="pointerUp" @pointercancel="pointerUp" @lostpointercapture="pointers.delete($event.pointerId)">
     <g :transform="projectedTransform">
      <path :d="gridPath" class="atlas-grid"/>
      <path v-for="country in countries" :key="country.id" :d="country.path" class="atlas-country"/>
      <text class="atlas-ocean" x="220" y="295">{{ zh?'太平洋':'PACIFIC OCEAN' }}</text><text class="atlas-ocean" x="420" y="265">{{ zh?'大西洋':'ATLANTIC OCEAN' }}</text><text class="atlas-ocean" x="700" y="340">{{ zh?'印度洋':'INDIAN OCEAN' }}</text>
      <g v-for="group in groups" :key="group.points.map(p=>p.id).join('-')" data-map-pin :transform="`translate(${group.x} ${group.y}) scale(${1/svgScale/view.k})`" class="atlas-pin" :class="{selected:group.points.some(p=>p.id===selected?.id)}" tabindex="0" role="button" :aria-label="groupLabel(group.points.map(p=>p.id))" :aria-pressed="group.points.some(p=>p.id===selected?.id)" @click.stop="!dragged&&activate(group.points.map(p=>p.id))" @keydown.enter.prevent.stop="activate(group.points.map(p=>p.id))" @keydown.space.prevent.stop="activate(group.points.map(p=>p.id))" @pointerdown.stop="dragged=false">
       <circle class="pin-halo" r="16"/><circle class="pin-core" r="5"/><path d="M0 -4V-24" class="pin-stem"/>
       <rect class="pin-label-bg" :x="group.points.length>1?-20:-56" y="-52" :width="group.points.length>1?40:112" height="30" rx="7"/>
       <text class="pin-label" y="-32">{{ group.points.length>1?group.points.length:places.find(p=>p.id===group.points[0]?.id)?.name }}</text>
      </g>
     </g>
    </svg>
    <div class="atlas-zoom"><button :aria-label="zh?'放大地图':'Zoom in'" :disabled="view.k>=9" @click="view=zoomAround(view,1.5)">+</button><button :aria-label="zh?'缩小地图':'Zoom out'" :disabled="view.k<=1" @click="view=zoomAround(view,1/1.5)">−</button></div>
    <span class="atlas-map-hint">{{ zh?'拖动探索 · ⌘ / Ctrl + 滚轮缩放':'Drag to explore · ⌘ / Ctrl + scroll to zoom' }}</span>
    <a class="atlas-credit" href="https://www.naturalearthdata.com/" target="_blank" rel="noopener noreferrer">Natural Earth ↗</a>
   </div>
   <div v-if="clusterPlaces.length>1" class="atlas-cluster-places" :aria-label="zh?'选择地点':'Choose a place'"><span>{{ zh?'选择地点':'Choose a place' }}</span><button v-for="place in clusterPlaces" :key="place.id" @click="selectPlace(place.id,true)">{{ place.name }}</button></div>
   <div v-if="selected&&selectedPost" class="atlas-place" aria-live="polite"><img v-if="selectedPost.cover&&!failedCovers.has(selectedPost.cover)" @error="failedCovers.add(selectedPost.cover!)" :src="selectedPost.cover" :alt="selectedPost.coverAlt||selected.name" width="176" height="128"/><div class="atlas-place-copy"><div class="atlas-place-meta"><span>{{ selected.region }}</span><span>{{ selected.posts.every(p=>p.sample)?(zh?'示例地点':'Sample location'):(zh?'旅行记录':'Travel stories') }}</span></div><h2>{{ selected.name }}</h2><ul class="atlas-place-stories"><li v-for="post in selected.posts" :key="post.slug"><a :href="href(post)">{{ post.title }} <span aria-hidden="true">↗</span></a></li></ul></div><button class="atlas-locate" @click="selectPlace(selected.id,true)"><Icon name="pin" :size="16"/>{{ zh?'定位这里':'Locate' }}</button></div>
   <div v-else class="atlas-empty">{{ zh?'地图上还没有地点，游记仍可在下方阅读。':'No places on the map yet. Stories are available below.' }}</div>
   <p v-if="onlySamples" class="atlas-sample-note">{{ zh?'当前地点与游记为布局示例，不代表站长的真实旅行足迹。':'The location and story are layout samples, not the owner’s actual travel history.' }}</p>
  </section>
  <section class="travel-stories" :aria-label="zh?'旅行手记':'Travel journal'"><div class="travel-stories-heading"><h2>{{ zh?'旅行手记':'Notes from the road' }}<span>{{ String(posts.length).padStart(2,'0') }}</span></h2><span>{{ zh?'照片之外，还有故事。':'More than a pin on a map.' }}</span></div>
   <div v-if="tags.length||tag" class="tag-filter"><button :class="{active:!tag}" :aria-pressed="!tag" @click="tag=''">{{ zh?'全部':'All' }}</button><button v-for="item in tags" :key="item" :class="{active:tag===item}" :aria-pressed="tag===item" @click="tag=tag===item?'':item">{{ item }}</button></div>
   <div class="travel-cards"><article v-for="post in posts" :key="post.slug" class="travel-card" :class="{selected:!!post.place&&post.place.id===selected?.id}"><a :href="href(post)" class="travel-card-photo" :aria-label="`${zh?'阅读游记':'Read story'}：${post.title}`"><img v-if="post.cover&&!failedCovers.has(post.cover)" @error="failedCovers.add(post.cover!)" :src="post.cover" :alt="post.coverAlt||post.title" width="600" height="400" loading="lazy"/><div v-else class="travel-photo-fallback"><Icon name="travel" :size="30"/><span>{{ post.cover?(zh?'照片暂时无法加载':'Photo unavailable'):(zh?'旅途待留影':'A story to picture') }}</span></div><span v-if="post.sample">{{ zh?'示例游记':'Sample story' }}</span></a><div class="travel-card-copy"><div class="travel-card-meta"><span>{{ post.place?.name|| (zh?'旅行记录':'Travel story') }}</span><time :datetime="post.date">{{ dateLabel(post.date,locale) }}</time></div><a :href="href(post)"><h3>{{ post.title }}</h3><p>{{ post.description }}</p></a><button v-if="post.cover&&failedCovers.has(post.cover)" class="travel-photo-retry" @click="failedCovers.delete(post.cover)">{{ zh?'重试加载照片':'Retry photo' }}</button><div class="travel-card-actions"><button v-if="post.place" @click="showOnMap(post.place.id)"><Icon name="pin" :size="14"/>{{ zh?'在地图上查看':'Show on map' }}</button><a :href="href(post)">{{ zh?'阅读游记':'Read story' }} <span>↗</span></a></div></div></article></div>
   <p v-if="!posts.length" class="atlas-empty">{{ zh?'这个标签下还没有游记。':'No travel stories with this tag yet.' }}</p>
  </section>
  <footer class="travel-footer"><Icon name="travel" :size="18"/><span>{{ zh?'世界很大，慢慢走。':'A big world. Take your time.' }}</span></footer>
 </div>
</template>

<style scoped>
.travel-journal{padding:32px 30px 0;container-type:inline-size;max-width:1400px;margin:auto;--map-water:#edf2f4;--map-land:#d5ddd9;--map-border:#f2f5f3;--map-grid:#dbe4e7;--map-label:#91a0aa;--pin:#ba7955;--pin-soft:#bd825025;--pin-paper:#fffaf4}
:global(:root[data-theme=dark] .travel-journal){--map-water:#142532;--map-land:#30434b;--map-border:#1b303b;--map-grid:#223743;--map-label:#667f8e;--pin:#e0ae83;--pin-soft:#e0ae8328;--pin-paper:#263944}
.travel-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:28px;gap:20px}.travel-heading h1{font-size:clamp(25px,3cqw,37px);letter-spacing:-.035em;line-height:1.35;margin:12px 0}.travel-heading>div>p:last-child{font-size:13px;color:var(--muted);line-height:1.8}.travel-heading .eyebrow{font-size:10px;letter-spacing:.17em}.travel-heading-icon{border:1px solid var(--line);border-radius:14px;color:var(--muted);padding:13px;transform:rotate(-7deg)}
.travel-atlas{scroll-margin-top:64px;border:1px solid var(--line);border-radius:15px;overflow:hidden;background:var(--surface);box-shadow:0 7px 30px #10233405}.atlas-toolbar{padding:14px 18px;display:flex;justify-content:space-between;align-items:center;gap:10px}.atlas-title{display:flex;align-items:center;gap:8px;font-size:12px}.atlas-title>span:last-child{color:var(--muted);font-size:11px;margin-left:5px}.atlas-dot{width:6px;height:6px;border-radius:100%;background:var(--pin)}.atlas-views{display:flex;background:var(--sidebar);padding:3px;border:1px solid var(--line);border-radius:7px}.atlas-views button{font-size:11px;padding:4px 13px;border-radius:4px;color:var(--muted)}.atlas-views button.active{background:var(--surface);box-shadow:0 1px 3px #0001;color:var(--text)}
.atlas-map{position:relative;background:var(--map-water);height:clamp(270px,46cqw,470px);overflow:hidden;border-block:1px solid var(--line)}.atlas-svg{width:100%;height:100%;display:block;touch-action:none;cursor:grab;outline-offset:-4px}.atlas-svg:active{cursor:grabbing}.atlas-grid{fill:none;stroke:var(--map-grid);stroke-width:.6;vector-effect:non-scaling-stroke}.atlas-country{fill:var(--map-land);stroke:var(--map-border);stroke-width:.7;vector-effect:non-scaling-stroke}.atlas-ocean{font-size:9px;fill:var(--map-label);letter-spacing:2.5px;pointer-events:none}.atlas-pin{cursor:pointer;outline:none}.pin-halo{fill:var(--pin-soft)}.pin-core{fill:var(--pin);stroke:var(--pin-paper);stroke-width:2}.pin-stem{stroke:var(--pin);stroke-width:1.5}.pin-label-bg{fill:var(--pin-paper);stroke:var(--pin);stroke-width:.8}.pin-label{fill:var(--text);font:600 11px -apple-system,sans-serif;text-anchor:middle;pointer-events:none}.atlas-pin:focus-visible .pin-label-bg,.atlas-pin:hover .pin-label-bg{stroke-width:2.5}.atlas-pin.selected .pin-halo{stroke:var(--pin);stroke-width:.7;stroke-dasharray:2 3}
.atlas-zoom{position:absolute;right:16px;bottom:42px;display:flex;flex-direction:column;border:1px solid var(--line);border-radius:8px;background:var(--surface);box-shadow:0 3px 10px #0001;overflow:hidden}.atlas-zoom button{height:32px;width:32px;font-size:21px;line-height:1}.atlas-zoom button+button{border-top:1px solid var(--line)}.atlas-zoom button:disabled{opacity:.3}.atlas-zoom button:hover:enabled{background:var(--hover)}.atlas-map-hint,.atlas-credit{position:absolute;bottom:11px;color:var(--secondary);font-size:9px;background:var(--map-water);padding:2px 4px}.atlas-map-hint{left:14px}.atlas-credit{right:13px;opacity:.7}
.atlas-place{display:flex;align-items:center;padding:16px 18px;gap:16px}.atlas-place>img{width:88px;height:64px;object-fit:cover;border-radius:8px}.atlas-place-copy{min-width:0;flex:1}.atlas-place-meta{display:flex;flex-wrap:wrap;gap:10px;font-size:10px;color:var(--muted)}.atlas-place-meta>span+span{color:var(--pin)}.atlas-place h2{font-size:18px;margin:3px 0}.atlas-place-stories{list-style:none;padding:0;margin:0;display:grid;gap:5px;font-size:11px;color:var(--secondary)}.atlas-place-stories a:hover{text-decoration:underline}.atlas-place-stories a{overflow-wrap:anywhere}.atlas-cluster-places{padding:12px 18px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;border-bottom:1px solid var(--line);font-size:11px}.atlas-cluster-places>span{color:var(--muted)}.atlas-cluster-places button{border:1px solid var(--line);border-radius:6px;padding:6px 10px}.travel-photo-fallback{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;color:var(--muted);font-size:12px}.travel-photo-retry{align-self:flex-start;font-size:11px;color:var(--secondary);text-decoration:underline}.atlas-locate{display:flex;align-items:center;gap:6px;border:1px solid var(--line);padding:8px 12px;border-radius:7px;font-size:11px;white-space:nowrap}.atlas-locate:hover{background:var(--hover)}.atlas-sample-note{font-size:10px;color:var(--muted);padding:0 18px 14px}.atlas-empty{padding:30px;font-size:12px;color:var(--muted)}
.travel-stories{margin-top:32px}.travel-stories-heading{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:18px}.travel-stories-heading h2{font-size:16px;display:flex;gap:9px;align-items:center}.travel-stories-heading h2>span{font:11px monospace;color:var(--muted)}.travel-stories-heading>span{font-size:11px;color:var(--muted)}.travel-cards{display:grid;gap:16px}.travel-card{display:grid;grid-template-columns:38% 1fr;border:1px solid var(--line);background:var(--surface);border-radius:12px;overflow:hidden}.travel-card.selected{border-color:color-mix(in srgb,var(--pin) 36%,var(--line))}.travel-card-photo{position:relative;min-height:190px;overflow:hidden;background:var(--sidebar)}.travel-card-photo>img{width:100%;height:100%;position:absolute;inset:0;object-fit:cover;transition:transform .3s}.travel-card-photo:hover>img{transform:scale(1.03)}.travel-card-photo>span{position:absolute;left:12px;top:12px;font-size:10px;background:#14203177;color:#fff;padding:3px 7px;border-radius:4px;backdrop-filter:blur(8px)}.travel-card-copy{padding:21px 23px;display:flex;flex-direction:column;justify-content:center;gap:10px;min-width:0}.travel-card-meta{display:flex;justify-content:space-between;gap:10px;font-size:10px;color:var(--muted)}.travel-card-meta>span{color:var(--pin)}.travel-card h3{font-size:19px;line-height:1.5}.travel-card p{font-size:12px;line-height:1.8;color:var(--muted);margin-top:5px}.travel-card-actions{display:flex;justify-content:space-between;align-items:center;gap:10px;border-top:1px solid var(--line);padding-top:12px;margin-top:5px;font-size:11px}.travel-card-actions>button{display:flex;gap:4px;align-items:center;color:var(--muted);padding:0}.travel-card-actions>a{color:var(--secondary)}.travel-card-actions>a>span{padding-left:8px}.travel-footer{display:flex;align-items:center;justify-content:center;gap:10px;padding:30px;color:var(--muted);font-size:11px}
@container (max-width:550px){.travel-heading-icon{display:none}.atlas-title>span:last-child{display:none}.atlas-place{gap:10px;padding:13px;flex-wrap:wrap}.atlas-place-copy{flex-basis:calc(100% - 80px)}.atlas-locate{margin-left:auto}.atlas-place>img{width:66px;height:59px}.atlas-place h2{font-size:16px}.atlas-locate{padding:7px}.atlas-locate>svg{display:none}.atlas-map-hint{display:none}.travel-stories-heading>span{display:none}.travel-card{grid-template-columns:1fr}.travel-card-photo{min-height:185px}.travel-card-copy{padding:18px}.travel-heading h1{font-size:25px}.atlas-sample-note{padding-inline:13px}}
@media(max-width:600px){.travel-journal{padding:25px 16px 0}.travel-heading{margin-bottom:20px}.atlas-map{height:280px}.atlas-toolbar{padding:11px 13px}.travel-footer{padding:25px 10px}}
</style>
