import * as THREE from 'three';
import { surfaceVertex, surfaceFragment, atmosphereFragment, glowFragment, ringFragment, noiseGLSL } from './solarShaders';

export type SolarScene = { setState: (paused: boolean, obscured: boolean, focused: boolean) => void; dispose: () => void };
export function createSolarScene(host: HTMLElement, onState: (state: string) => void): SolarScene {
 const mobile = matchMedia('(max-width: 600px)').matches;
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const renderer = new THREE.WebGLRenderer({ antialias: !mobile, alpha: false, powerPreference: 'low-power' });
 renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1 : 1.25));
 renderer.setClearColor(0x02040b);
 renderer.outputColorSpace = THREE.SRGBColorSpace;
 renderer.toneMapping = THREE.ACESFilmicToneMapping;
 renderer.toneMappingExposure = 1.2;
 renderer.domElement.setAttribute('aria-hidden', 'true');
 host.append(renderer.domElement);
 const scene = new THREE.Scene();
 const camera = new THREE.PerspectiveCamera(43, 1, .1, 600);
 let seed = 73421;
 const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
 const resources: { dispose: () => void }[] = [];
 function keep<T extends { dispose: () => void }>(resource: T): T { resources.push(resource); return resource; }
 const sky = new THREE.Mesh(keep(new THREE.PlaneGeometry(2, 2)), keep(new THREE.ShaderMaterial({
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}',
  fragmentShader: `varying vec2 vUv;${noiseGLSL}
   void main(){
    vec2 p=vUv;float diagonal=p.y-(.76-p.x*.55);
    float dust=fbm(vec3(p*7.,3.4));
    float band=exp(-pow(diagonal*5.,2.));
    float wisps=fbm(vec3(p*vec2(15.,35.),8.));
    vec3 haze=mix(vec3(.012,.017,.035),vec3(.033,.027,.05),dust);
    haze*=band*(.35+dust*1.3+wisps*.4);
    haze*=1.-smoothstep(.48,.72,fbm(vec3(p*14.,12.)))*.65;
    gl_FragColor=vec4(vec3(.001,.002,.005)+haze*.48,1.);
    #include <colorspace_fragment>
   }`, depthWrite: false, depthTest: false,
 })));
 sky.frustumCulled = false; sky.renderOrder = -1000; scene.add(sky);
 const time = { value: 0 };
 const sphere = keep(new THREE.SphereGeometry(1, mobile ? 40 : 64, mobile ? 24 : 48));
 function surface(kind: number) {
  return keep(new THREE.ShaderMaterial({ vertexShader: surfaceVertex, fragmentShader: surfaceFragment, uniforms: { uKind: { value: kind }, uTime: time } }));
 }
 const sun = new THREE.Mesh(sphere, surface(0)); sun.scale.setScalar(6.1); scene.add(sun);
 const glow = new THREE.Mesh(keep(new THREE.PlaneGeometry(65, 65)), keep(new THREE.ShaderMaterial({
  vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: glowFragment, uniforms: { uTime: time }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
 })));
 scene.add(glow);
 // Distances, radii and rates are compressed for a legible desktop composition.
 const specs = [
  { radius: .65, orbit: 10, phase: 2.3, rate: .12, tilt: .03 },
  { radius: 1.0, orbit: 14, phase: 4.4, rate: .088, tilt: .04 },
  { radius: 1.2, orbit: 18, phase: .9, rate: .065, tilt: .41 },
  { radius: .88, orbit: 23, phase: 3.5, rate: .052, tilt: .44 },
  { radius: 3.5, orbit: 31, phase: -.38, rate: .028, tilt: .05 },
  { radius: 2.8, orbit: 41, phase: .64, rate: .019, tilt: .47 },
  { radius: 1.65, orbit: 50, phase: 2.7, rate: .013, tilt: 1.7 },
  { radius: 1.6, orbit: 59, phase: 4.9, rate: .009, tilt: .49 },
 ];
 const orbitMaterial = keep(new THREE.LineBasicMaterial({ color: 0x849bbf, transparent: true, opacity: .11, depthWrite: false }));
 const planets = specs.map((spec, i) => {
  const group = new THREE.Group(); scene.add(group);
  const axial = new THREE.Group(); axial.rotation.z = spec.tilt; group.add(axial);
  const planet = new THREE.Mesh(sphere, surface(i + 1)); planet.scale.setScalar(spec.radius); axial.add(planet);
  const points = Array.from({ length: 180 }, (_, k) => {
   const a = k / 180 * Math.PI * 2; return new THREE.Vector3(Math.cos(a) * spec.orbit, 0, Math.sin(a) * spec.orbit);
  });
  scene.add(new THREE.LineLoop(keep(new THREE.BufferGeometry().setFromPoints(points)), orbitMaterial));
  if ([2, 6, 7].includes(i)) {
   const atmosphere = new THREE.Mesh(sphere, keep(new THREE.ShaderMaterial({ vertexShader: surfaceVertex, fragmentShader: atmosphereFragment,
    uniforms: { uColor: { value: new THREE.Color(i === 2 ? '#4293ff' : '#71baf3') } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
   })));
   atmosphere.scale.setScalar(spec.radius * 1.045); axial.add(atmosphere);
  }
  let ring: THREE.ShaderMaterial | undefined;
  if (i === 5) {
   const outer = spec.radius * 2.24;
   ring = keep(new THREE.ShaderMaterial({
    vertexShader: `varying vec2 vRing;varying vec3 vWorld;void main(){vRing=position.xy/${outer.toFixed(4)};vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}`,
    fragmentShader: ringFragment, uniforms: { uCenter: { value: group.position }, uRadius: { value: spec.radius } },
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
   }));
   const rings = new THREE.Mesh(keep(new THREE.RingGeometry(spec.radius * 1.16, outer, 180)), ring);
   rings.rotation.x = Math.PI / 2; axial.add(rings);
  }
  return { group, planet, spec };
 });
 const moon = new THREE.Mesh(sphere, surface(1)); moon.scale.setScalar(.32); planets[2]!.group.add(moon);
 // Seeded stellar field: brighter nearby stars, with a denser distant galactic band.
 const starCount = mobile ? 1700 : 4100;
 const positions = new Float32Array(starCount * 3), colors = new Float32Array(starCount * 3), sizes = new Float32Array(starCount);
 for (let i = 0; i < starCount; i++) {
  const a = random() * Math.PI * 2;
  const y = i < starCount * .55 ? (random() + random() + random() - 1.5) * .22 : random() * 2 - 1;
  const r = Math.sqrt(1 - y * y), radius = 180 + random() * 90;
  const p = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r).applyAxisAngle(new THREE.Vector3(0, 0, 1), .58).multiplyScalar(radius);
  positions.set([p.x, p.y, p.z], i * 3);
  const c = new THREE.Color().setRGB(.65 + random() * .35, .7 + random() * .3, .8 + random() * .2);
  c.multiplyScalar(.5 + random() * .5); colors.set([c.r, c.g, c.b], i * 3); sizes[i] = random() > .985 ? 3.2 : 1.0 + random() * 1.6;
 }
 const starsGeometry = keep(new THREE.BufferGeometry());
 starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); starsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); starsGeometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
 const stars = new THREE.Points(starsGeometry, keep(new THREE.ShaderMaterial({
  vertexShader: 'attribute float aSize;varying vec3 vColor;void main(){vColor=color;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_PointSize=aSize;}',
  fragmentShader: 'varying vec3 vColor;void main(){float d=length(gl_PointCoord-.5)*2.;gl_FragColor=vec4(vColor,pow(max(0.,1.-d),1.15));}',
  vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
 })));
 scene.add(stars);
 const asteroids = new Float32Array((mobile ? 550 : 1400) * 3);
 for (let i = 0; i < asteroids.length / 3; i++) {
  const a = random() * Math.PI * 2, r = 26 + random() * 2.7;
  asteroids.set([Math.cos(a) * r, (random() - .5) * .65, Math.sin(a) * r], i * 3);
 }
 const belt = new THREE.Points(keep(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(asteroids, 3))), keep(new THREE.PointsMaterial({ color: 0x92857a, size: .065, transparent: true, opacity: .4 })));
 scene.add(belt);
 let contextUnavailable = false;
 let disposed = false, paused = false, obscured = false, focused = false, frame = 0, last = 0, elapsed = 0;
 try { elapsed = Number(sessionStorage.getItem('bytedesk-solar-time')) || 0; } catch {}
 function draw() {
  time.value = elapsed;
  sun.rotation.y = elapsed * .035;
  planets.forEach(({ group, planet, spec }, i) => {
   const a = spec.phase + elapsed * spec.rate;
   group.position.set(Math.cos(a) * spec.orbit, 0, Math.sin(a) * spec.orbit);
   planet.rotation.y = elapsed * (i === 1 ? -.04 : .12 + i * .017);
  });
  moon.position.set(Math.cos(elapsed * .18) * 2.25, .1, Math.sin(elapsed * .18) * 2.25);
  belt.rotation.y = elapsed * .006;
  glow.quaternion.copy(camera.quaternion);
  renderer.render(scene, camera);
 }
 function active() { return !disposed && !contextUnavailable && !obscured && !document.hidden && !paused && !reduced.matches; }
 function loop(now: number) {
  frame = 0;
  if (!active()) return;
  const delta = now - last;
  if (delta >= (focused ? 1000 / 30 : 1000 / 16)) {
   if (last) elapsed += Math.min(delta / 1000, .12);
   last = now; draw();
  }
  frame = requestAnimationFrame(loop);
 }
 function sync() {
  cancelAnimationFrame(frame); frame = 0; last = 0;
  if (contextUnavailable) { onState('fallback'); return; }
  onState(obscured || document.hidden ? 'suspended' : paused || reduced.matches ? 'paused' : 'running');
  if (!contextUnavailable && !obscured && !document.hidden) draw();
  if (active()) frame = requestAnimationFrame(loop);
 }
 function resize() {
  const { width, height } = host.getBoundingClientRect(); if (!width || !height) return;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1 : 1.25, Math.sqrt(2_000_000 / (width * height))));
  renderer.setSize(width, height, false); camera.aspect = width / height;
  if (camera.aspect < 1) { camera.position.set(0, 98, 137); camera.lookAt(0, 0, 0); camera.rotateZ(Math.PI / 2); camera.fov = 57; }
  else { camera.position.set(26, 74, 112); camera.lookAt(16, 0, 3); camera.fov = 43; }
  camera.updateProjectionMatrix(); if (!contextUnavailable && !obscured && !document.hidden) draw();
 }
 const observer = new ResizeObserver(resize); observer.observe(host);
 document.addEventListener('visibilitychange', sync); reduced.addEventListener('change', sync);
 function saveTime() { try { sessionStorage.setItem('bytedesk-solar-time', String(elapsed)); } catch {} }
 window.addEventListener('pagehide', saveTime);
 function contextLost(event: Event) { event.preventDefault(); contextUnavailable = true; sync(); }
 renderer.domElement.addEventListener('webglcontextlost', contextLost);
 resize(); sync();
 return {
  setState(nextPaused, nextObscured, nextFocused) { paused = nextPaused; obscured = nextObscured; focused = nextFocused; sync(); },
  dispose() {
   disposed = true; cancelAnimationFrame(frame); saveTime(); observer.disconnect();
   document.removeEventListener('visibilitychange', sync); reduced.removeEventListener('change', sync); window.removeEventListener('pagehide', saveTime);
   renderer.domElement.removeEventListener('webglcontextlost', contextLost);
   resources.forEach(resource => resource.dispose()); renderer.dispose(); renderer.domElement.remove();
  },
 };
}
