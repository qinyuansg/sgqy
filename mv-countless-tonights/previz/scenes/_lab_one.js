// perf probe: one figure, variants selected by ?probe=
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as cast from '/previz/lib/cast.js';
export default async function create(ctx) {
  const q = new URLSearchParams(location.search);
  const probe = q.get('probe') || 'full';
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x202328);
  const pm = new THREE.PMREMGenerator(ctx.renderer); scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.3;
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.05, 50);
  const key = new THREE.SpotLight(0xffffff, 60, 20, 0.5, 0.8, 2); key.position.set(3, 5, 5); key.castShadow = probe !== 'noshadow'; key.shadow.mapSize.set(2048, 2048); scene.add(key);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x222222, 0.6));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshStandardMaterial({ color: 0x555555 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const lod = q.get('lod') || 'hi';
  await cast.preloadCharacters(['RESTORER'], { lod });
  const f = cast.makeCharacter('RESTORER', { lod });
  if (q.get('n') === '0') f.root.visible = false;
  scene.add(f.root);
  const copies = +(q.get('n') || 1);
  for (let i = 1; i < copies; i++) { const g = cast.makeCharacter('RESTORER', { lod }); g.root.position.x = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.6; g.pose('stand'); scene.add(g.root); if (probe === 'basic') g.root.traverse((m) => { if (m.isMesh) m.material = new THREE.MeshBasicMaterial({ color: 0x888888 }); }); }
  if (probe === 'static') { const b = f.bake(); scene.remove(f.root); scene.add(b); }
  if (probe === 'basic') f.root.traverse((m) => { if (m.isMesh) m.material = new THREE.MeshBasicMaterial({ color: 0x888888 }); });
  if (probe === 'std') f.root.traverse((m) => { if (m.isMesh) m.material = new THREE.MeshStandardMaterial({ color: 0x888888 }); });
  const repl = (fn) => { scene.traverse((m) => { if (m.isMesh && m !== floor) m.material = fn(m.material); }); };
  if (probe === 'phys') repl(() => new THREE.MeshPhysicalMaterial({ color: 0x888888, sheen: 0.8, sheenRoughness: 0.6, sheenColor: 0xffffff, roughness: 0.8 }));
  if (probe === 'physnosheen') repl(() => new THREE.MeshPhysicalMaterial({ color: 0x888888, roughness: 0.8 }));
  if (probe === 'stdall') repl(() => new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.8 }));
  if (probe === 'noenv') scene.environment = null;
  if (probe === 'front') scene.traverse((m) => { if (m.isMesh && m.material) m.material.side = THREE.FrontSide; });
  let tris = 0; f.root.traverse((m) => { if (m.isMesh) tris += m.geometry.index.count / 3; });
  console.warn('probe', probe, 'tris', tris);
  return { scene, camera, setShot(shot, tl, u, T) { f.pose('stand'); cam(); return { dof: null }; } };
  function cam() { ctx.cam.place(camera, [0.5, 1.1, 4.5], [0, 0.9, 0]); ctx.cam.lens(camera, 40); }
}
