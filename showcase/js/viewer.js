// 3D stage: loads a product (GLB model, photo, or placeholder), lets the
// visitor orbit it, pins HTML hotspots to points on it, and flies the camera
// to a hotspot when a feature is selected.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { buildPlaceholder } from './placeholders.js';

const MODEL_HEIGHT = 1.7;
const FOV = 32;
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function createViewer(stageEl, hotspotLayer, { edit = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  stageEl.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(2, 4, 3);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(FOV, 1, 0.05, 50);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minPolarAngle = 0.5;
  controls.maxPolarAngle = Math.PI / 2 + 0.05;

  const platform = makePlatform();
  scene.add(platform);

  const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const textureLoader = new THREE.TextureLoader();
  const cache = new Map(); // product.id -> Promise<{ root, flat }>

  let current = null;       // { product, root, flat, box, center }
  let home = null;          // { pos, target } default view
  let tween = null;
  let hotspots = [];        // { el, pos: Vector3, index }
  let activeIndex = -1;
  let running = false;
  let onTap = () => {};
  let onInteract = () => {};
  let occlusionDue = 0;
  const raycaster = new THREE.Raycaster();
  const tmp = new THREE.Vector3();

  controls.addEventListener('start', () => { tween = null; onInteract(); });

  // ---------- model loading ----------

  function loadModel(product) {
    if (!cache.has(product.id)) cache.set(product.id, buildModel(product));
    return cache.get(product.id);
  }

  async function buildModel(product) {
    if (product.model3dUrl) {
      const narrow = Math.min(window.innerWidth, window.innerHeight) < 600;
      const url = (narrow && product.model3dUrlMobile) || product.model3dUrl;
      const gltf = await gltfLoader.loadAsync(url);
      return { root: normalize(gltf.scene, product), flat: false };
    }
    if (product.imageUrl) {
      const tex = await textureLoader.loadAsync(product.imageUrl);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
      const h = product.modelHeight || MODEL_HEIGHT;
      const w = (h * tex.image.width) / tex.image.height;
      const plane = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false, side: THREE.DoubleSide })
      );
      plane.position.y = h / 2 + 0.04;
      const root = new THREE.Group();
      root.add(plane);
      return { root, flat: true };
    }
    return { root: buildPlaceholder(product.placeholder, product.name), flat: false };
  }

  // Scale a loaded model to a standard height, centred, standing on y = 0,
  // so hotspot coordinates and camera framing behave the same for any file.
  function normalize(object, product) {
    const box = new THREE.Box3().setFromObject(object);
    const size = box.getSize(new THREE.Vector3());
    const centre = box.getCenter(new THREE.Vector3());
    const s = (product.modelHeight || MODEL_HEIGHT) / (size.y || 1);
    object.position.set(-centre.x * s, -box.min.y * s, -centre.z * s);
    object.scale.setScalar(s);
    const root = new THREE.Group();
    root.add(object);
    if (product.modelRotationY) root.rotation.y = THREE.MathUtils.degToRad(product.modelRotationY);
    return root;
  }

  // ---------- framing ----------

  function frame(box, { fill = 0.5, yaw = 0, lift = 0.1 } = {}) {
    const size = box.getSize(new THREE.Vector3());
    const target = box.getCenter(new THREE.Vector3());
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * camera.aspect);
    const wide = Math.max(size.x, size.z);
    const dist = Math.max(
      size.y / 2 / Math.tan(vFov / 2) / fill,
      wide / 2 / Math.tan(hFov / 2) / 0.72
    );
    const pos = new THREE.Vector3(Math.sin(yaw) * dist, dist * lift, Math.cos(yaw) * dist).add(target);
    return { pos, target, dist };
  }

  function applyHome() {
    if (!current) return;
    const p = current.product;
    const auto = frame(current.box);
    home = {
      pos: p.defaultCameraPos ? new THREE.Vector3(...p.defaultCameraPos) : auto.pos,
      target: p.defaultTarget ? new THREE.Vector3(...p.defaultTarget) : auto.target,
    };
    controls.minDistance = 0.45;
    controls.maxDistance = auto.dist * 1.5;
    const swing = current.flat ? 0.4 : Infinity; // a photo only tilts a little
    controls.minAzimuthAngle = -swing;
    controls.maxAzimuthAngle = swing;
  }

  function flyTo(pos, target, seconds = 0.9) {
    tween = {
      fromPos: camera.position.clone(), fromTarget: controls.target.clone(),
      toPos: pos.clone(), toTarget: target.clone(), t: 0, seconds,
    };
  }

  function jumpTo(pos, target) {
    tween = null;
    camera.position.copy(pos);
    controls.target.copy(target);
    controls.update();
  }

  // ---------- hotspots ----------

  function setHotspots(features) {
    hotspotLayer.replaceChildren();
    hotspots = features.map((f, index) => {
      const el = document.createElement('button');
      el.className = 'hotspot';
      el.innerHTML = '<span class="hotspot-pulse"></span><span class="hotspot-core"></span><span class="hotspot-tag"></span>';
      el.querySelector('.hotspot-tag').textContent = f.title;
      el.addEventListener('click', () => onTap(index));
      hotspotLayer.append(el);
      return { el, index, pos: new THREE.Vector3(...((f.hotspot && f.hotspot.position) || [0, 1, 0])), feature: f };
    });
    setActive(-1);
  }

  function setActive(index) {
    activeIndex = index;
    hotspots.forEach((h) => {
      h.el.classList.toggle('is-active', h.index === index);
      h.el.classList.toggle('is-dimmed', index >= 0 && h.index !== index);
    });
  }

  function placeHotspots() {
    const w = stageEl.clientWidth, h = stageEl.clientHeight;
    for (const hs of hotspots) {
      tmp.copy(hs.pos).project(camera);
      const visible = tmp.z < 1 && Math.abs(tmp.x) < 1.2 && Math.abs(tmp.y) < 1.2;
      hs.el.style.display = visible ? '' : 'none';
      if (visible) {
        hs.el.style.transform = `translate3d(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px, 0)`;
      }
    }
  }

  // Fade hotspots that sit behind the model from the current viewpoint.
  function checkOcclusion(now) {
    if (!current || current.flat || now < occlusionDue) return;
    occlusionDue = now + 200;
    for (const hs of hotspots) {
      const dist = camera.position.distanceTo(hs.pos);
      raycaster.set(camera.position, tmp.copy(hs.pos).sub(camera.position).normalize());
      raycaster.far = dist - 0.06;
      const hidden = raycaster.intersectObject(current.root, true).length > 0;
      hs.el.classList.toggle('is-hidden', hidden && hs.index !== activeIndex);
    }
  }

  function focus(index) {
    const hs = hotspots[index];
    if (!hs || !current) return;
    setActive(index);
    const spec = hs.feature.hotspot || {};
    const height = current.box.max.y - current.box.min.y;
    // Narrow (portrait) screens see less width, so stand further back.
    const narrow = THREE.MathUtils.clamp(1.15 / camera.aspect, 1, 2.4);
    const dist = spec.distance || (0.5 + height * 0.4) * narrow;
    let target = spec.target ? new THREE.Vector3(...spec.target) : hs.pos.clone();
    let pos;
    if (spec.cameraPos) {
      pos = new THREE.Vector3(...spec.cameraPos);
    } else {
      // Look at the hotspot from outside the model, mostly from the front.
      const out = new THREE.Vector3(hs.pos.x - current.center.x, 0, hs.pos.z - current.center.z);
      if (current.flat || out.length() < 0.02) out.set(0, 0, 1);
      out.normalize().lerp(new THREE.Vector3(0, 0, 1), 0.35).normalize();
      pos = hs.pos.clone().addScaledVector(out, dist);
      pos.y += dist * 0.12;
    }
    // The description card covers the lower part of the screen, so aim a
    // little below the hotspot to keep it in the clear upper area.
    target = target.clone();
    target.y -= pos.distanceTo(target) * 0.13;
    flyTo(pos, target);
  }

  function reset(animated = true) {
    if (!home) return;
    setActive(-1);
    if (animated) flyTo(home.pos, home.target); else jumpTo(home.pos, home.target);
  }

  // ---------- public: show a product ----------

  async function show(product) {
    const { root, flat } = await loadModel(product);
    if (current) scene.remove(current.root);
    scene.add(root);
    const box = new THREE.Box3().setFromObject(root);
    current = { product, root, flat, box, center: box.getCenter(new THREE.Vector3()) };
    const radius = Math.max(box.max.x - box.min.x, box.max.z - box.min.z) * 0.5;
    platform.scale.setScalar(Math.max(0.55, radius * 1.9));
    platform.visible = true;
    resize();
    applyHome();
    setHotspots(product.features || []);
    reset(false);
  }

  // Render a product to a transparent image for the home screen line-up.
  async function snapshot(product, width = 560, height = 760) {
    const { root } = await loadModel(product);
    const box = new THREE.Box3().setFromObject(root);
    const shotScene = new THREE.Scene();
    shotScene.environment = scene.environment;
    shotScene.add(key.clone(), root);
    const cam = camera.clone();
    cam.aspect = width / height;
    cam.updateProjectionMatrix();
    const keep = { aspect: camera.aspect };
    camera.aspect = cam.aspect;
    const view = frame(box, { fill: 0.86, yaw: -0.42, lift: 0.16 });
    camera.aspect = keep.aspect;
    cam.position.copy(view.pos);
    cam.lookAt(view.target);
    const size = renderer.getSize(new THREE.Vector2());
    const ratio = renderer.getPixelRatio();
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.render(shotScene, cam);
    const url = renderer.domElement.toDataURL('image/png');
    renderer.setPixelRatio(ratio);
    renderer.setSize(size.x, size.y, false);
    shotScene.remove(root);
    if (current && current.root === root) scene.add(root);
    return url;
  }

  // ---------- loop ----------

  function resize() {
    const w = stageEl.clientWidth || 1, h = stageEl.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', () => { resize(); applyHome(); });

  let last = 0;
  function tick(now) {
    if (!running) return;
    requestAnimationFrame(tick);
    const dt = Math.min((now - last) / 1000 || 0, 0.05);
    last = now;
    if (tween) {
      tween.t = Math.min(1, tween.t + dt / tween.seconds);
      const k = ease(tween.t);
      camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
      controls.target.lerpVectors(tween.fromTarget, tween.toTarget, k);
      if (tween.t >= 1) tween = null;
    }
    controls.update();
    platform.children[1].rotation.z = now * 0.00012;
    renderer.render(scene, camera);
    placeHotspots();
    checkOcclusion(now);
  }

  function setRunning(on) {
    if (on === running) return;
    running = on;
    if (on) { resize(); last = performance.now(); requestAnimationFrame(tick); }
  }

  // ---------- edit mode: click the model to get hotspot coordinates ----------

  if (edit) {
    const panel = document.getElementById('edit-panel');
    const marker = new THREE.Mesh(
      new THREE.SphereGeometry(0.012, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xff3366, depthTest: false })
    );
    marker.renderOrder = 10;
    marker.visible = false;
    scene.add(marker);
    let down = null;
    let picked = null;
    const fmt = (v) => `[${v.x.toFixed(3)}, ${v.y.toFixed(3)}, ${v.z.toFixed(3)}]`;
    const report = () => {
      panel.hidden = false;
      panel.textContent =
        'EDIT MODE — click the model, then copy into content.json\n\n' +
        `"hotspot": {\n  "position": ${picked ? fmt(picked) : '[click the model]'},\n` +
        `  "cameraPos": ${fmt(camera.position)},\n  "target": ${fmt(controls.target)}\n}\n\n` +
        `"defaultCameraPos": ${fmt(camera.position)},\n"defaultTarget": ${fmt(controls.target)}`;
    };
    renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; });
    renderer.domElement.addEventListener('pointerup', (e) => {
      if (!down || !current || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
      const r = renderer.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      const ray = new THREE.Raycaster();
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObject(current.root, true)[0];
      if (hit) { picked = hit.point.clone(); marker.position.copy(picked); marker.visible = true; report(); }
    });
    controls.addEventListener('end', report);
    report();
  }

  return {
    show, snapshot, focus, reset, setRunning,
    onHotspotTap(fn) { onTap = fn; },
    onInteract(fn) { onInteract = fn; },
  };
}

// Glowing disc the product stands on.
function makePlatform() {
  const group = new THREE.Group();
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grad.addColorStop(0, 'rgba(53,224,200,0.55)');
  grad.addColorStop(0.55, 'rgba(40,140,220,0.22)');
  grad.addColorStop(1, 'rgba(40,140,220,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(1, 64),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false })
  );
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = -0.004;
  group.add(disc);

  const ring = new THREE.Group();
  ring.rotation.x = -Math.PI / 2;
  const mat = new THREE.MeshBasicMaterial({ color: 0x7ff3e2, transparent: true, opacity: 0.7, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
  for (let i = 0; i < 3; i++) {
    const arc = new THREE.Mesh(new THREE.RingGeometry(0.7, 0.712, 64, 1, (i * Math.PI * 2) / 3, Math.PI * 0.5), mat);
    ring.add(arc);
  }
  group.add(ring);
  group.visible = false;
  return group;
}
