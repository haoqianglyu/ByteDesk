import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import mark from '../../public/brand/bytedesk-mark.svg?raw';

export function createLogoScene(host: HTMLElement, onExpand: () => void, onFailure: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.25 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, .1, 50);
  camera.position.set(0, 0, 9.5);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, .025);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xffffff, 4);
  key.position.set(-3, 5, 6);
  scene.add(key, new THREE.HemisphereLight(0xc9e9ff, 0x233659, 2));
  const group = new THREE.Group();
  scene.add(group);
  const materials: THREE.MeshPhysicalMaterial[] = [];
  const geometries: THREE.ExtrudeGeometry[] = [];
  const pieces: THREE.Mesh[] = [];
  for (const [index, path] of new SVGLoader().parse(mark.replaceAll('currentColor', '#ffffff')).paths.entries()) {
    const geometry = new THREE.ExtrudeGeometry(path.toShapes(), {
      depth: 5, bevelEnabled: true, bevelThickness: .8, bevelSize: .65, bevelSegments: 5, steps: 1, curveSegments: 16,
    });
    geometry.translate(-32, -32, -2.5);
    geometry.scale(.066, -.066, .066);
    // Mirroring SVG's Y axis reverses winding; regenerate outward-facing faces.
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const uvs = geometry.getAttribute('uv');
    for (let i = 0; i < positions.count; i += 3) {
      for (const attribute of [positions, normals, uvs]) {
        for (let axis = 0; axis < attribute.itemSize; axis++) {
          const values = attribute.array;
          const a = (i + 1) * attribute.itemSize + axis;
          const b = (i + 2) * attribute.itemSize + axis;
          const value = values[a]!;
          values[a] = values[b]!;
          values[b] = value;
        }
      }
    }
    geometry.computeVertexNormals();
    const material = new THREE.MeshPhysicalMaterial({ roughness: .16, thickness: .65, ior: 1.45, clearcoat: 1, clearcoatRoughness: .12 });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData.direction = index === 0 ? -1 : 1;
    group.add(mesh);
    pieces.push(mesh); materials.push(material); geometries.push(geometry);
  }
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.enableDamping = false;
  controls.rotateSpeed = .65;
  let disposed = false, visible = false, playing = true, reduced = false, expanded = false;
  let spread = 0, clock = 0, last = 0, frame = 0, dirty = true;
  let pointerX = 0, pointerY = 0;
  function requestDraw() {
    dirty = true;
    if (!disposed && visible && !document.hidden && !frame) frame = requestAnimationFrame(draw);
  }
  function draw(now: number) {
    frame = 0;
    if (disposed || !visible || document.hidden) { last = 0; return; }
    const dt = last ? Math.min((now - last) / 1000, .05) : 0;
    last = now;
    const moving = playing && !reduced;
    if (moving) clock += dt;
    const target = expanded ? 1 : 0;
    spread = reduced ? target : THREE.MathUtils.damp(spread, target, 9, dt || 1 / 60);
    if (Math.abs(spread - target) < .001) spread = target;
    group.rotation.set(-.13 + (moving ? Math.sin(clock * .45) * .06 + pointerY * .035 : 0), -.32 + (moving ? Math.sin(clock * .3) * .18 + pointerX * .06 : 0), -.1);
    group.position.y = moving ? Math.sin(clock * .8) * .06 : 0;
    pieces.forEach(piece => {
      const direction = piece.userData.direction as number;
      piece.position.set(direction * spread * .45, -direction * spread * .35, direction * spread * .26);
      piece.rotation.y = direction * spread * .22;
    });
    if (dirty || moving || spread !== target) renderer.render(scene, camera);
    dirty = false;
    if (moving || spread !== target) requestDraw();
  }
  function resize() {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    camera.aspect = width / height;
    camera.position.setLength(camera.aspect < 1 ? 9.5 / camera.aspect : 9.5);
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
    requestDraw();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const visibility = () => { last = 0; requestDraw(); };
  document.addEventListener('visibilitychange', visibility);
  controls.addEventListener('change', requestDraw);
  let startX = 0, startY = 0;
  const down = (event: PointerEvent) => { startX = event.clientX; startY = event.clientY; };
  const up = (event: PointerEvent) => { if (Math.hypot(event.clientX - startX, event.clientY - startY) < 5) onExpand(); };
  const move = (event: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / rect.width - .5;
    pointerY = (event.clientY - rect.top) / rect.height - .5;
  };
  const leave = () => { pointerX = pointerY = 0; };
  const lost = (event: Event) => { event.preventDefault(); onFailure(); };
  renderer.domElement.addEventListener('pointerdown', down);
  renderer.domElement.addEventListener('pointerup', up);
  renderer.domElement.addEventListener('pointermove', move);
  renderer.domElement.addEventListener('pointerleave', leave);
  renderer.domElement.addEventListener('webglcontextlost', lost);
  resize();
  return {
    appearance(dark: boolean, metal: boolean) {
      materials.forEach((material, i) => {
        material.color.set(metal ? (dark ? '#becbdc' : '#dce3ed') : (i === 0 ? (dark ? '#ceeaff' : '#b9ddf5') : '#75b9ed'));
        material.metalness = metal ? 1 : .05;
        material.transmission = metal ? 0 : .83;
        material.roughness = metal ? .27 : .16;
        material.envMapIntensity = dark ? 1.65 : 1.15;
        material.needsUpdate = true;
      });
      scene.background = new THREE.Color(dark ? '#102437' : '#edf3f7');
      requestDraw();
    },
    visible(value: boolean) { visible = value; last = 0; requestDraw(); },
    motion(value: boolean, reduce: boolean) { playing = value; reduced = reduce; requestDraw(); },
    expand(value: boolean) { expanded = value; requestDraw(); },
    reset() { controls.reset(); clock = 0; pointerX = pointerY = 0; resize(); },
    rotate(direction: number) { camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), direction * .2); controls.update(); requestDraw(); },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect(); document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      renderer.domElement.removeEventListener('pointerdown', down);
      renderer.domElement.removeEventListener('pointerup', up);
      renderer.domElement.removeEventListener('pointermove', move);
      renderer.domElement.removeEventListener('pointerleave', leave);
      controls.dispose(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
      environment.dispose(); renderer.dispose(); renderer.domElement.remove();
    },
  };
}
