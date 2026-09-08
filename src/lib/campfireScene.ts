import * as THREE from 'three';
import { imageUrl } from './images';
import type { SolarScene } from './solarScene';

const baseUrl = imageUrl('wallpapers/campfire/')!;
const vertex = `varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const fragment = /* glsl */`
 uniform sampler2D uImage;
 uniform vec2 uCrop,uFire,uFlame,uImageSize;
 uniform float uTime;
 varying vec2 vUv;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){
  vec2 cell=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(hash(cell),hash(cell+vec2(1.,0.)),f.x),mix(hash(cell+vec2(0.,1.)),hash(cell+vec2(1.)),f.x),f.y);
 }
 float turbulence(vec2 p){return noise(p)*.65+noise(p*2.03+vec2(17.,9.))*.25+noise(p*4.11)*.1;}
 vec3 photo(vec2 p){return texture2D(uImage,vec2(p.x,1.-p.y)).rgb;}
 void main(){
  vec2 p=(vec2(vUv.x,1.-vUv.y)-.5)*uCrop+.5;
  vec2 local=(uFire-p)/uFlame;
  float rise=local.y;
  float flameZone=(1.-smoothstep(.55,1.15,abs(local.x)))*smoothstep(.06,.24,rise)*(1.-smoothstep(.9,1.35,rise));
  vec3 original=photo(p),color=original;
  float fireMask=0.;
  if(flameZone>.001){
  // Advect fine flame detail upward. Separate columns flare at irregular intervals;
  // their horizontal coordinates and the log bed stay fixed instead of swaying as a sheet.
  float plume=turbulence(vec2(local.x*3.1,rise*5.5-uTime*3.4));
  float heightScale=.82+.4*noise(vec2(local.x*2.2+31.,uTime*2.6));
  float sourceRise=rise/heightScale+(plume-.5)*.11*rise;
  vec2 warped=p;
  warped.y=mix(p.y,uFire.y-sourceRise*uFlame.y,flameZone);
  vec3 flameSample=photo(warped);
  float hotOriginal=smoothstep(.07,.3,original.r-original.b)*smoothstep(.12,.5,original.r);
  float hotSample=smoothstep(.07,.3,flameSample.r-flameSample.b)*smoothstep(.12,.5,flameSample.r);
  // Restrict motion to luminous fire pixels; nearby people, scenery and wood do not warp.
  fireMask=max(hotOriginal,hotSample)*flameZone;
  float breakup=mix(1.,smoothstep(.18,.53,plume),smoothstep(.28,1.05,rise)*.65);
  color=mix(original,flameSample*breakup,fireMask);
  }
  float pulse=noise(vec2(uTime*4.3,21.))*.7+noise(vec2(uTime*9.7,6.))*.3;
  color*=1.+fireMask*(pulse-.5)*.18;
  // Soft reflected firelight remains local to the campsite.
  vec2 halo=(p-uFire)/vec2(uFlame.x*4.,uFlame.y*1.6);
  color+=vec3(.023,.007,.001)*exp(-dot(halo,halo)*1.4)*(.55+.45*pulse);
  // Sparse embers rise from the same image-space fire origin, including after a crop.
  for(int i=0;i<10;i++){
   float seed=float(i);
   float age=fract(uTime*(.23+hash(vec2(seed,8.))*.12)+hash(vec2(seed,3.)));
   float drift=(hash(vec2(seed,2.))-.5)*.8+sin(uTime*1.7+seed)*age*.25;
   vec2 ember=uFire+vec2(drift*uFlame.x,-age*uFlame.y*2.1);
   vec2 delta=(p-ember)*uImageSize;
   float spark=exp(-dot(delta,delta)/1.8)*sin(age*3.14159);
   color+=vec3(1.,.25,.035)*spark*.65;
  }
  float sky=1.-smoothstep(.54,.6,p.y);
  float star=smoothstep(.15,.55,max(original.r,max(original.g,original.b)));
  float phase=hash(floor(p*uImageSize/3.));
  float twinkle=sin(uTime*(.55+phase*1.3)+phase*50.);
  color+=original*star*sky*twinkle*.32;
  // A brief meteor every 22 seconds; no constant stream across the sky.
  float cycle=floor(uTime/22.);
  float age=mod(uTime,22.)-7.;
  vec2 start=vec2(.15+hash(vec2(cycle,4.))*.38,.08+hash(vec2(cycle,6.))*.17);
  vec2 direction=vec2(.16,.09);
  vec2 head=start+direction*age;
  vec2 offset=p-head;
  float along=dot(offset,direction)/dot(direction,direction);
  float distanceToTrail=length(offset-direction*clamp(along,-.45,0.));
  float meteor=exp(-pow(distanceToTrail/.00065,2.))*smoothstep(-.45,0.,along);
  float visible=smoothstep(0.,.15,age)*(1.-smoothstep(.65,.95,age));
  color+=vec3(.65,.77,1.)*meteor*visible*sky*.5;
  gl_FragColor=vec4(max(color,vec3(0.)),1.);
  #include <colorspace_fragment>
 }
`;

export async function createCampfireScene(host: HTMLElement, onState: (state: string) => void, signal: AbortSignal): Promise<SolarScene> {
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const images=new Map<boolean,THREE.Texture>();
 const pending=new Map<boolean,Promise<THREE.Texture>>();
 let disposed=false,paused=false,obscured=false,focused=false,lost=false,frame=0,last=0,time=0;
 let version=0;
 function load(portrait:boolean):Promise<THREE.Texture>{
  const existing=images.get(portrait);if(existing)return Promise.resolve(existing);
  const inFlight=pending.get(portrait);if(inFlight)return inFlight;
  const request=fetchImage(portrait).finally(()=>pending.delete(portrait));
  pending.set(portrait,request);return request;
 }
 async function fetchImage(portrait:boolean){
  const response=await fetch(baseUrl+(portrait?'portrait.png':'landscape.png'),{signal,mode:'cors'});
  if(!response.ok)throw new Error(`Campfire image unavailable: ${response.status}`);
  const bitmap=await createImageBitmap(await response.blob(),{imageOrientation:'flipY'});
  if(disposed||signal.aborted){bitmap.close();throw new DOMException('Wallpaper changed','AbortError');}
  const map=new THREE.Texture(bitmap);map.colorSpace=THREE.SRGBColorSpace;map.needsUpdate=true;
  images.set(portrait,map);return map;
 }
 const initialPortrait=host.clientWidth/host.clientHeight<.85;
 const first=await load(initialPortrait);
 let renderer:THREE.WebGLRenderer;
 try{renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'low-power'});}
 catch(error){images.forEach(map=>{map.dispose();(map.image as ImageBitmap).close();});throw error;}
 renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.Camera();
 const uniforms={uImage:{value:first},uCrop:{value:new THREE.Vector2(1,1)},uFire:{value:new THREE.Vector2()},uFlame:{value:new THREE.Vector2()},uImageSize:{value:new THREE.Vector2()},uTime:{value:0}};
 const material=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:fragment,uniforms,depthTest:false,depthWrite:false,toneMapped:false});
 const geometry=new THREE.PlaneGeometry(2,2);scene.add(new THREE.Mesh(geometry,material));
 let portrait=initialPortrait;
 function draw(){uniforms.uTime.value=time;renderer.render(scene,camera);}
 function active(){return !disposed&&!lost&&!paused&&!obscured&&!document.hidden&&!reduced.matches;}
 function loop(now:number){
  frame=0;if(!active())return;
  const delta=now-last;
  if(delta>=(focused?1000/30:1000/15)){if(last)time+=Math.min(delta/1000,.12);last=now;draw();}
  frame=requestAnimationFrame(loop);
 }
 function sync(){
  cancelAnimationFrame(frame);frame=0;last=0;
  if(disposed)return;
  if(lost){onState('fallback');return;}
  onState(obscured||document.hidden?'suspended':paused||reduced.matches?'paused':'running');
  if(!obscured&&!document.hidden)draw();if(active())frame=requestAnimationFrame(loop);
 }
 function layout(){
  const {width,height}=host.getBoundingClientRect();if(!width||!height)return;
  const bitmap=uniforms.uImage.value.image as ImageBitmap;
  const ratio=width/height,imageRatio=bitmap.width/bitmap.height;
  uniforms.uCrop.value.set(Math.min(1,ratio/imageRatio),Math.min(1,imageRatio/ratio));
  uniforms.uImageSize.value.set(bitmap.width,bitmap.height);
  uniforms.uFire.value.set(portrait?.575:.55,portrait?.772:.806);
  uniforms.uFlame.value.set(portrait?.047:.023,portrait?.049:.094);
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.25,Math.sqrt(2_000_000/(width*height))));
  renderer.setSize(width,height,false);
  if(!lost&&!obscured&&!document.hidden)draw();
 }
 async function resize(){
  layout();const next=host.clientWidth/host.clientHeight<.85;
  const token=++version;if(next===portrait)return;
  try{
   const map=await load(next);if(disposed||token!==version)return;
   portrait=next;uniforms.uImage.value=map;layout();sync();
  }catch{if(!disposed&&!signal.aborted)onState('fallback');}
 }
 function contextLost(event:Event){event.preventDefault();lost=true;sync();}
 renderer.domElement.addEventListener('webglcontextlost',contextLost);
 const observer=new ResizeObserver(()=>void resize());observer.observe(host);
 document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);
 layout();sync();
 return {setState(p,o,f){paused=p;obscured=o;focused=f;sync();},dispose(){
  disposed=true;cancelAnimationFrame(frame);observer.disconnect();
  document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);
  renderer.domElement.removeEventListener('webglcontextlost',contextLost);
  images.forEach(map=>{map.dispose();(map.image as ImageBitmap).close();});images.clear();
  geometry.dispose();material.dispose();renderer.dispose();renderer.domElement.remove();
 }};
}
