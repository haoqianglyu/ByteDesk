import * as THREE from 'three';
import { imageUrl } from './images';
import type { SolarScene } from './solarScene';

const imageBase = imageUrl('wallpapers/earth/')!;
// Solar System Scope / NASA Blue Marble derivatives, CC BY 4.0. See ASSET_CREDITS.md.
const vertex = /* glsl */`
 varying vec2 vUv; varying vec3 vWorld; varying vec3 vNormal;
 void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;vNormal=normalize(mat3(modelMatrix)*normal);gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}
`;
const surfaceFragment = /* glsl */`
 uniform sampler2D uDay;uniform sampler2D uNight;uniform sampler2D uClouds;uniform sampler2D uOcean;
 uniform vec3 uSun;uniform float uCloudOffset;
 varying vec2 vUv;varying vec3 vWorld;varying vec3 vNormal;
 void main(){
  vec3 n=normalize(vNormal),v=normalize(cameraPosition-vWorld),l=normalize(uSun);
  float nl=dot(n,l);float daylight=smoothstep(-.08,.18,nl);
  vec3 day=texture2D(uDay,vUv).rgb;
  float water=texture2D(uOcean,vUv).r;
  // Cloud shadows use the same moving map as the separate cloud shell.
  float cloudShadow=texture2D(uClouds,vec2(vUv.x+uCloudOffset+.0015,vUv.y-.001)).r;
  float irradiance=max(nl,0.);
  vec3 color=day*(.006+irradiance*1.2)*(1.-cloudShadow*.32);
  float roughSpec=pow(max(dot(n,normalize(l+v)),0.),85.);
  color+=vec3(1.,.93,.79)*roughSpec*water*.22*daylight*(1.-cloudShadow);
  vec3 night=texture2D(uNight,vUv).rgb;
  // Keep the unlit oceans black; only the bright city pixels emit light.
  float emission=smoothstep(.07,.42,max(night.r,max(night.g,night.b)));
  color+=night*emission*(1.-smoothstep(-.16,.08,nl))*1.45*(1.-cloudShadow*.6);
  float edge=pow(1.-max(dot(n,v),0.),3.3);
  vec3 air=mix(vec3(.08,.26,.58),vec3(.16,.42,.8),max(nl,0.));
  color=mix(color,air,edge*.38*daylight);
  float dusk=(1.-smoothstep(.0,.14,abs(nl)))*edge;
  color+=vec3(.17,.043,.012)*dusk*.5;
  gl_FragColor=vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }
`;
const nightFragment = /* glsl */`
 uniform sampler2D uDay;uniform sampler2D uNight;uniform sampler2D uOcean;uniform vec2 uNightTexel;
 varying vec2 vUv;varying vec3 vWorld;varying vec3 vNormal;
 vec3 city(vec2 uv){
  vec3 sampleColor=texture2D(uNight,uv).rgb;
  float intensity=max(sampleColor.r,max(sampleColor.g,sampleColor.b));
  return sampleColor*smoothstep(.008,.09,intensity);
 }
 void main(){
  vec3 n=normalize(vNormal),v=normalize(cameraPosition-vWorld);
  float facing=max(dot(n,v),0.);
  vec3 terrain=texture2D(uDay,vUv).rgb;
  float luminance=dot(terrain,vec3(.2126,.7152,.0722));
  // Lift linear-space terrain into visible indigo while keeping dark oceans distinct.
  float land=1.-texture2D(uOcean,vUv).r;
  float relief=pow(luminance,.7);
  // A visible ocean base and curved falloff keep the night globe reading as solid.
  vec3 ocean=vec3(.005,.009,.019);
  vec3 continent=vec3(.045,.047,.105)*(.08+relief*1.35);
  float curvature=.36+.64*pow(facing,.65);
  float fill=.72+.28*max(dot(n,normalize(vec3(-.6,.5,1.))),0.);
  vec3 base=mix(ocean,continent,land)*curvature*fill;
  vec3 lights=city(vUv);
  // Small, texture-space light spread preserves the geography and avoids a full-screen bloom pass.
  vec2 d=uNightTexel*1.6;
  vec3 glow=(city(vUv+vec2(d.x,0.))+city(vUv-vec2(d.x,0.))+city(vUv+vec2(0.,d.y))+city(vUv-vec2(0.,d.y)))*.25;
  vec3 warm=mix(lights,vec3(1.,.6,.26)*dot(lights,vec3(.3,.59,.11)),.38);
  // The grazing light path is obscured by the atmosphere before a city passes the limb.
  float cityVisibility=smoothstep(.015,.3,facing);
  vec3 color=base+(warm*2.7+glow*vec3(1.,.67,.36)*.42)*cityVisibility;
  float horizon=pow(1.-facing,5.);
  color+=vec3(.004,.013,.035)*horizon;
  gl_FragColor=vec4(color,1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }
`;
const cloudsFragment = /* glsl */`
 uniform sampler2D uClouds;uniform vec3 uSun;varying vec2 vUv;varying vec3 vWorld;varying vec3 vNormal;
 void main(){
  float coverage=texture2D(uClouds,vUv).r;
  vec3 n=normalize(vNormal);float nl=dot(n,normalize(uSun));
  float relief=texture2D(uClouds,vUv+vec2(-.0008,.0006)).r-coverage;
  vec3 color=vec3(.92,.965,1.)*(.01+max(nl,0.)*1.35+relief*.15);
  float twilight=1.-smoothstep(.0,.16,abs(nl));
  color=mix(color,vec3(.36,.16,.075),twilight*.35);
  gl_FragColor=vec4(color,smoothstep(.045,.94,coverage)*.96);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }
`;
const atmosphereFragment = /* glsl */`
 uniform vec3 uSun;uniform float uNightMode;varying vec3 vWorld;varying vec3 vNormal;
 void main(){
  vec3 n=normalize(vNormal),v=normalize(cameraPosition-vWorld);float nl=dot(n,normalize(uSun));
  float limb=pow(1.-abs(dot(n,v)),5.5);
  float daylight=smoothstep(-.2,.45,nl);
  vec3 air=mix(vec3(.7,.19,.04),vec3(.14,.46,1.),smoothstep(-.07,.2,nl));
  gl_FragColor=uNightMode>.5?vec4(vec3(.07,.22,.52),limb*.16):vec4(air,limb*daylight*.48);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
 }
`;

export async function createEarthScene(host: HTMLElement, onState: (state: string) => void, signal: AbortSignal, mode: 'day' | 'night' = 'day'): Promise<SolarScene> {
 const night = mode === 'night';
 const timeKey = night ? 'bytedesk-earth-night-time' : 'bytedesk-earth-time';
 const mobile = matchMedia('(max-width:600px)').matches;
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const textures: THREE.Texture[] = [];
 // Fetch is abortable when the visitor switches wallpapers before textures arrive.
 async function texture(name: string, color = false) {
  const response = await fetch(imageBase + name, { signal, mode: 'cors' });
  if (!response.ok) throw new Error(`Earth texture unavailable: ${response.status}`);
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'flipY', resizeWidth: mobile || (night && name === 'day-4k.jpg') ? 2048 : name.includes('2k') ? 2048 : 4096, resizeQuality: 'high' });
  if (signal.aborted) { bitmap.close(); throw new DOMException('Wallpaper changed', 'AbortError'); }
  const map = new THREE.Texture(bitmap);map.needsUpdate=true;map.colorSpace=color?THREE.SRGBColorSpace:THREE.NoColorSpace;map.wrapS=THREE.RepeatWrapping;
  textures.push(map);return map;
 }
 let maps: THREE.Texture[];
 try {
  const requests = [texture('day-4k.jpg',true),texture('night-4k.jpg',true)];
  if (!night) requests.push(texture('clouds-4k.jpg'));
  requests.push(texture('ocean-2k.jpg'));
  const results = await Promise.allSettled(requests);
  const error = results.find(result => result.status === 'rejected');
  if (error?.status === 'rejected') throw error.reason;
  maps = results.map(result => (result as PromiseFulfilledResult<THREE.Texture>).value);
 } catch (error) { textures.forEach(map=>{map.dispose();(map.image as ImageBitmap).close();});throw error; }
 let renderer: THREE.WebGLRenderer;
 try { renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false, powerPreference: 'low-power' }); }
 catch (error) { textures.forEach(map=>{map.dispose();(map.image as ImageBitmap).close();});throw error; }
 renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 renderer.setClearColor(0x010207);renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
 textures.forEach(map=>{map.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());});
 const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(39,1,.1,100);
 const globe=new THREE.Group();globe.rotation.z=.18;scene.add(globe);
 const sphere=new THREE.SphereGeometry(1,mobile?80:128,mobile?48:80);
 const sun={value:new THREE.Vector3(-1,.35,.6).normalize()};
 const cloudOffset={value:0};
 const surfaceMaterial=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:night?nightFragment:surfaceFragment,uniforms:{uDay:{value:maps[0]},uNight:{value:maps[1]},uClouds:{value:night?null:maps[2]},uOcean:{value:maps[night?2:3]},uSun:sun,uCloudOffset:cloudOffset,uNightTexel:{value:new THREE.Vector2(1/(mobile?2048:4096),1/(mobile?1024:2048))}}});
 // The ground, ocean and city emission are one opaque, depth-writing front surface.
 surfaceMaterial.side=THREE.FrontSide;surfaceMaterial.transparent=false;surfaceMaterial.depthTest=true;surfaceMaterial.depthWrite=true;
 const earth=new THREE.Mesh(sphere,surfaceMaterial);globe.add(earth);
 const cloudMaterial=night?undefined:new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:cloudsFragment,uniforms:{uClouds:{value:maps[2]},uSun:sun},transparent:true,depthWrite:false});
 const clouds=cloudMaterial?new THREE.Mesh(sphere,cloudMaterial):undefined;
 if(clouds){clouds.scale.setScalar(1.006);globe.add(clouds);}
 const atmosphereMaterial=new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:atmosphereFragment,uniforms:{uSun:sun,uNightMode:{value:night?1:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
 const atmosphere=new THREE.Mesh(sphere,atmosphereMaterial);atmosphere.scale.setScalar(night?1.012:1.018);globe.add(atmosphere);
 // Sparse, dim stars match the exposure of a sunlit Earth instead of a bright nebula.
 let seed=58137;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const starsPositions=new Float32Array((mobile?250:650)*3);
 for(let i=0;i<starsPositions.length;i+=3){starsPositions[i]=(random()-.5)*32;starsPositions[i+1]=(random()-.5)*22;starsPositions[i+2]=-8-random()*12;}
 const starGeometry=new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(starsPositions,3));
 const starMaterial=new THREE.PointsMaterial({color:0x71809a,size:.012,transparent:true,opacity:.32,depthWrite:false});scene.add(new THREE.Points(starGeometry,starMaterial));
 let elapsed=0,disposed=false,paused=false,obscured=false,focused=false,lost=false,frame=0,last=0;
 try{elapsed=Number(sessionStorage.getItem(timeKey))||0;}catch{}
 function draw(){
  earth.rotation.y=(night?-2.6:-.6)+elapsed*(night?.016:.022);
  if(clouds){
   clouds.rotation.y=earth.rotation.y+elapsed*.0012;
   // SphereGeometry stores longitude opposite to a positive Y rotation.
   cloudOffset.value=(earth.rotation.y-clouds.rotation.y)/(Math.PI*2);
  }
  renderer.render(scene,camera);
 }
 function active(){return !disposed&&!lost&&!paused&&!obscured&&!document.hidden&&!reduced.matches;}
 function loop(now:number){
  frame=0;if(!active())return;
  const delta=now-last;
  if(delta>=(focused?1000/30:1000/16)){if(last)elapsed+=Math.min(delta/1000,.12);last=now;draw();}
  frame=requestAnimationFrame(loop);
 }
 function sync(){
  cancelAnimationFrame(frame);frame=0;last=0;
  if(lost){onState('fallback');return;}
  onState(obscured||document.hidden?'suspended':paused||reduced.matches?'paused':'running');
  if(!obscured&&!document.hidden)draw();if(active())frame=requestAnimationFrame(loop);
 }
 function resize(){
  const {width,height}=host.getBoundingClientRect();if(!width||!height)return;
  renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1:1.5,Math.sqrt(2_400_000/(width*height))));renderer.setSize(width,height,false);camera.aspect=width/height;
  if(camera.aspect<1){camera.position.set(0,0,2.75/camera.aspect);camera.fov=44;globe.position.set(0,-.12,0);}
  else{camera.position.set(0,0,3.65);camera.fov=39;globe.position.set(.25,-.035,0);}
  camera.lookAt(0,0,0);camera.updateProjectionMatrix();if(!lost&&!obscured&&!document.hidden)draw();
 }
 function save(){try{sessionStorage.setItem(timeKey,String(elapsed));}catch{}}
 function contextLost(event:Event){event.preventDefault();lost=true;sync();}
 renderer.domElement.addEventListener('webglcontextlost',contextLost);
 const observer=new ResizeObserver(resize);observer.observe(host);document.addEventListener('visibilitychange',sync);reduced.addEventListener('change',sync);window.addEventListener('pagehide',save);
 resize();sync();
 return {setState(p,o,f){paused=p;obscured=o;focused=f;sync();},dispose(){
  disposed=true;cancelAnimationFrame(frame);save();observer.disconnect();document.removeEventListener('visibilitychange',sync);reduced.removeEventListener('change',sync);window.removeEventListener('pagehide',save);
  renderer.domElement.removeEventListener('webglcontextlost',contextLost);
  textures.forEach(map=>{map.dispose();(map.image as ImageBitmap).close();});[sphere,surfaceMaterial,cloudMaterial,atmosphereMaterial,starGeometry,starMaterial].forEach(resource=>resource?.dispose());renderer.dispose();renderer.domElement.remove();
 }};
}
