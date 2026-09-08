import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CSS3DObject, CSS3DRenderer } from 'three/addons/renderers/CSS3DRenderer.js';
import { phoneModel as model } from './phoneModel';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import zojiMark from '../../public/brand/zoji-mark.svg?raw';

function outline(width: number, height: number, radius: number) {
  const x = -width / 2, y = -height / 2, s = new THREE.Shape();
  s.moveTo(x + radius, y); s.lineTo(x + width - radius, y);
  s.absarc(x + width - radius, y + radius, radius, -Math.PI / 2, 0, false);
  s.lineTo(x + width, y + height - radius); s.absarc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2, false);
  s.lineTo(x + radius, y + height); s.absarc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + radius); s.absarc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5, false);
  return s;
}

export function createPhoneScene(host: HTMLElement, source: string, next: () => void, fail: () => void) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, matchMedia('(pointer: coarse)').matches ? 1.25 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  const css = new CSS3DRenderer();
  css.domElement.className = 'phone-css-layer';
  css.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement, css.domElement);
  const scene = new THREE.Scene(), overlay = new THREE.Scene(), phone = new THREE.Group();
  scene.add(phone);
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 50);
  const environmentScene = new RoomEnvironment(), generator = new THREE.PMREMGenerator(renderer);
  const environment = generator.fromScene(environmentScene, .025);
  scene.environment = environment.texture;
  environmentScene.dispose(); generator.dispose();
  const light = new THREE.DirectionalLight(0xffffff, 3);
  light.position.set(-3, 4, 6); scene.add(light, new THREE.HemisphereLight(0xe7fff5, 0x213d3b, 2));
  const geometries: THREE.BufferGeometry[] = [], materials: THREE.Material[] = [];
  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, x = 0, y = 0, z = 0) {
    geometries.push(geometry); materials.push(material);
    const object = new THREE.Mesh(geometry, material); object.position.set(x, y, z); phone.add(object); return object;
  }
  function slab(w: number, h: number, r: number, depth: number) {
    const bevel = Math.min(.018, depth / 4);
    const geometry = new THREE.ExtrudeGeometry(outline(w - bevel * 2, h - bevel * 2, r - bevel), { depth: depth - bevel * 2, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 4, curveSegments: 20 });
    geometry.translate(0, 0, -(depth - bevel * 2) / 2); return geometry;
  }
  const silver = new THREE.MeshStandardMaterial({ color: '#d1d3d5', metalness: .85, roughness: .3 });
  const rear = new THREE.MeshPhysicalMaterial({ color: '#ececee', roughness: .24, metalness: .12, clearcoat: .65 });
  mesh(slab(model.width, model.height, model.radius, model.depth - .016), silver, 0, 0, -.008);
  mesh(slab(75.58 * .032, 161.03 * .032, model.radius - .0384, .014), new THREE.MeshStandardMaterial({ color: '#090b0d', roughness: .16 }), 0, 0, .133);
  // Ceramic Shield inset below the wide aluminum camera plateau.
  mesh(slab(2.27, 3.64, .29, .008), rear, 0, -.635, -.143);
  // Vector tracing of Zoji's app-icon paw, printed just above the ceramic back.
  const logoMaterial = new THREE.MeshStandardMaterial({ color: '#8b9496', metalness: .5, roughness: .36 });
  for (const path of new SVGLoader().parse(zojiMark.replaceAll('currentColor', '#ffffff')).paths) {
    const geometry = new THREE.ShapeGeometry(path.toShapes(), 32);
    geometry.translate(-256, -253, 0);
    geometry.scale(.0019, .0019, 1);
    geometry.rotateX(Math.PI);
    mesh(geometry, logoMaterial, 0, -.635, -.149);
  }
  const half = model.width / 2;
  for (const [x, y, h] of [[-half, 1.51, .19], [-half, 1.06, .30], [-half, .61, .30], [half, .84, .56], [half, -1.24, .56]]) {
    mesh(new THREE.BoxGeometry(.022, h, .085), silver, x, y, 0);
  }
  mesh(slab(2.31, 1.41, .39, .105), silver, 0, 1.85, -.185);
  // Back-view coordinates from Apple's drawing, mirrored into world X.
  for (const [left, top] of [[14.37, 14.37], [14.37, 33.61], [32.38, 23.99]]) {
    const x = model.width / 2 - left * .032, y = model.height / 2 - top * .032;
    mesh(new THREE.CylinderGeometry(.2592, .2592, .05, 64).rotateX(Math.PI / 2), silver, x, y, -.26);
    mesh(new THREE.CircleGeometry(.235, 64), new THREE.MeshPhysicalMaterial({ color: '#05080d', roughness: .07, metalness: .45, clearcoat: 1 }), x, y, -.287).rotation.y = Math.PI;
    mesh(new THREE.RingGeometry(.12, .16, 48), new THREE.MeshStandardMaterial({ color: '#172537', metalness: .7, roughness: .2 }), x, y, -.289).rotation.y = Math.PI;
    mesh(new THREE.CircleGeometry(.105, 48), new THREE.MeshPhysicalMaterial({ color: '#090f1d', metalness: .45, roughness: .05, clearcoat: 1 }), x, y, -.291).rotation.y = Math.PI;
  }
  const sensorX = model.width / 2 - 64.16 * .032;
  for (const [top, radius, color] of [[13.82, .1088, '#f2efdf'], [34.16, .1064, '#171b22'], [23.99, .0184, '#111319']] as const) {
    mesh(new THREE.CircleGeometry(radius, 40), new THREE.MeshStandardMaterial({ color, roughness: .35 }), sensorX, model.height / 2 - top * .032, -.24).rotation.y = Math.PI;
  }
  // USB-C opening and the two speaker rows on the lower edge.
  const port = mesh(slab(.29, .078, .035, .008), new THREE.MeshBasicMaterial({ color: '#111317' }), 0, -model.height / 2 - .001, 0);
  port.rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
    const hole = mesh(new THREE.CircleGeometry(.023, 16), new THREE.MeshBasicMaterial({ color: '#15171b' }), side * (.28 + i * .08), -model.height / 2 - .001, 0);
    hole.rotation.x = Math.PI / 2;
  }
  const screenElement = document.createElement('div');
  screenElement.className = 'phone-screen-surface';
  const img = document.createElement('img'); img.addEventListener('error', fail); img.alt = ''; img.width = 1320; img.height = 2868; img.draggable = false; img.src = source;
  screenElement.append(img);
  const screen = new CSS3DObject(screenElement); screenElement.style.pointerEvents = 'none';
  screen.matrixAutoUpdate = false; overlay.add(screen);
  const localScreen = new THREE.Matrix4().makeTranslation(0, 0, model.screenZ).scale(new THREE.Vector3().setScalar(model.screenWidth / 320));
  const normal = new THREE.Vector3(), toCamera = new THREE.Vector3(), center = new THREE.Vector3();
  const controls = new OrbitControls(camera, host);
  controls.enableZoom = false; controls.enablePan = false; controls.enableDamping = false;
  controls.rotateSpeed = .55; controls.minPolarAngle = .5; controls.maxPolarAngle = Math.PI - .5;
  let disposed = false, visible = false, raf = 0;
  function draw() {
    raf = 0;
    if (disposed || !visible || document.hidden) return;
    phone.updateMatrixWorld(true);
    screen.matrix.copy(phone.matrixWorld).multiply(localScreen);
    normal.set(0, 0, 1).transformDirection(phone.matrixWorld);
    center.set(0, 0, model.screenZ).applyMatrix4(phone.matrixWorld);
    toCamera.copy(camera.position).sub(center);
    screen.visible = normal.dot(toCamera) > .05;
    renderer.render(scene, camera); css.render(overlay, camera);
  }
  function requestDraw() { if (!disposed && visible && !document.hidden && !raf) raf = requestAnimationFrame(draw); }
  function resize() {
    const { width, height } = host.getBoundingClientRect(); if (!width || !height) return;
    camera.aspect = width / height;
    camera.position.setLength(Math.max(11.2, 6.2 / camera.aspect)); camera.updateProjectionMatrix();
    renderer.setSize(width, height); css.setSize(width, height); requestDraw();
  }
  function reset() { camera.position.set(3.1, 1.05, 11); controls.target.set(0, 0, 0); controls.update(); resize(); }
  reset();
  controls.addEventListener('change', requestDraw);
  const observer = new ResizeObserver(resize); observer.observe(host);
  document.addEventListener('visibilitychange', requestDraw);
  const raycaster = new THREE.Raycaster();
  const screenHit = new THREE.Mesh(new THREE.ShapeGeometry(outline(model.screenWidth, model.screenHeight, model.screenRadius)), new THREE.MeshBasicMaterial());
  screenHit.position.z = model.screenZ; geometries.push(screenHit.geometry); materials.push(screenHit.material);
  let start: { x: number; y: number; id: number } | undefined, dragged = false;
  const down = (e: PointerEvent) => { if (e.button !== 0 || !e.isPrimary) { start = undefined; return; } start = { x: e.clientX, y: e.clientY, id: e.pointerId }; dragged = false; };
  const move = (e: PointerEvent) => { if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 6) dragged = true; };
  const up = (e: PointerEvent) => {
    if (start?.id !== e.pointerId || dragged) { start = undefined; return; }
    start = undefined;
    const rect = host.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((e.clientX - rect.left) / rect.width * 2 - 1, -(e.clientY - rect.top) / rect.height * 2 + 1), camera);
    screenHit.updateMatrixWorld();
    if (screen.visible && raycaster.intersectObject(screenHit).length) next();
  };
  const cancel = () => { start = undefined; };
  const lost = (e: Event) => { e.preventDefault(); fail(); };
  host.addEventListener('pointerdown', down); host.addEventListener('pointermove', move); host.addEventListener('pointerup', up); host.addEventListener('pointercancel', cancel);
  renderer.domElement.addEventListener('webglcontextlost', lost);
  return {
    screenshot(src: string) { img.src = src; },
    appearance(dark: boolean) { silver.envMapIntensity = dark ? 1.4 : 1; rear.envMapIntensity = dark ? 1.3 : 1; requestDraw(); },
    visible(value: boolean) { visible = value; requestDraw(); },
    rotate(direction: number) { camera.position.applyAxisAngle(new THREE.Vector3(0, 1, 0), direction * .25); controls.update(); requestDraw(); },
    reset,
    dispose() {
      disposed = true; cancelAnimationFrame(raf); observer.disconnect(); controls.dispose();
      document.removeEventListener('visibilitychange', requestDraw);
      host.removeEventListener('pointerdown', down); host.removeEventListener('pointermove', move); host.removeEventListener('pointerup', up); host.removeEventListener('pointercancel', cancel);
      renderer.domElement.removeEventListener('webglcontextlost', lost);
      new Set(geometries).forEach(g => g.dispose()); new Set(materials).forEach(m => m.dispose()); environment.dispose(); renderer.dispose();
      img.removeEventListener('error', fail); screen.removeFromParent(); renderer.domElement.remove(); css.domElement.remove();
    },
  };
}
