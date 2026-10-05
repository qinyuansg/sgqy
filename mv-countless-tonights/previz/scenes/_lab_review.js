// LAB (art-direction review): figures under a cinematic low-key rig. Shots: RV_FACE (three heads), RV_SIT (restorer +
// guard on the window bench, front 3/4), RV_SIDE (same, profile), RV_PRAY (mother pray_sit + lonely), RV_STAND (5 standing).
import * as THREE from 'three';
import { loadCharacter } from '../lib/cast.js';
import { envTexture } from '../lib/env.js';

export default async function create(ctx) {
  const { cam } = ctx;
  const q = new URLSearchParams(location.search);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0f17);
  scene.environment = envTexture(ctx.renderer, 'night_museum'); scene.environmentIntensity = 0.9;
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.05, 60);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: 0x2a2520, roughness: 0.55 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 8), new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 0.9 }));
  wall.position.set(0, 4, -2.2); wall.receiveShadow = true; scene.add(wall);
  // warm practical key (3000 K) from camera-left, cool moon rim from back-right, low cool fill
  const key = new THREE.SpotLight(0xffd2a8, 26, 0, 0.55, 0.85, 2); key.position.set(-2.4, 2.6, 2.6); key.target.position.set(0, 1.0, 0);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0001; key.shadow.normalBias = 0.004; key.shadow.radius = 3; key.shadow.camera.near = 1; key.shadow.camera.far = 9;
  scene.add(key, key.target);
  if (q.get('noshadow')) key.castShadow = false;
  const rim = new THREE.DirectionalLight(0xa8c0ff, 2.2); rim.position.set(3, 3.5, -3); scene.add(rim);
  const fill = new THREE.HemisphereLight(0x5a6a88, 0x1a140f, 0.35); scene.add(fill);

  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 0.45), new THREE.MeshStandardMaterial({ color: 0x4a3626, roughness: 0.5 }));
  bench.position.set(0, 0.42, -0.05); bench.castShadow = bench.receiveShadow = true; scene.add(bench);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.39, 0.4), new THREE.MeshStandardMaterial({ color: 0x2c2018, roughness: 0.7 }));
  legs.position.set(0, 0.195, -0.05); legs.castShadow = legs.receiveShadow = true; scene.add(legs);

  const lod = q.get('lod') || 'hi';
  const R = await loadCharacter('RESTORER', { lod, gloves: false });
  const G = await loadCharacter('GUARD', { lod });
  const M = await loadCharacter('MOTHER', { lod });
  const L = await loadCharacter('LONELY', { lod });
  const W = await loadCharacter('WIFE', { lod });
  for (const f of [R, G, M, L, W]) scene.add(f.root);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.031, 0.075, 32), new THREE.MeshPhysicalMaterial({ color: 0xedf1ef, roughness: 0.2, clearcoat: 0.6 }));
  cup.castShadow = true;
  const phone = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.009), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.3, emissive: 0x4a6080, emissiveIntensity: 0.5 }));

  const layout = (id) => {
    for (const f of [R, G, M, L, W]) f.root.visible = false;
    bench.visible = legs.visible = id !== 'RV_STAND' && id !== 'RV_FACE';
    if (id === 'RV_SIT' || id === 'RV_SIDE') {
      R.root.visible = G.root.visible = true;
      R.root.position.set(-0.32, 0, 0); R.root.rotation.y = 0.12; R.pose('sit_bench', { seat: 0.45, hands: 'none' });
      G.root.position.set(0.32, 0, 0); G.root.rotation.y = -0.1; G.pose('sit_bench', { seat: 0.45, lean: 0.3, hands: 'none' });
      R.hold('L', cup, { socket: 'cup', grip: ['hold_cup'] });
      R.reach('L', R.root.localToWorld(new THREE.Vector3(0.05, 0.78, 0.3)), { palm: new THREE.Vector3(-1, 0, 0), fingers: new THREE.Vector3(0, 0, 1) });
      R.reach('R', R.root.localToWorld(new THREE.Vector3(-0.02, 0.75, 0.36)), { palm: new THREE.Vector3(1, 0.2, 0), fingers: new THREE.Vector3(0, 0, 1) });
      G.hold('R', phone, { socket: 'palm', grip: ['cupped'] });
      G.reach('R', G.root.localToWorld(new THREE.Vector3(-0.05, 0.92, 0.32)), { palm: new THREE.Vector3(0, 0.75, -0.6), fingers: new THREE.Vector3(0.3, 0.3, 0.9) });
      G.reach('L', G.root.localToWorld(new THREE.Vector3(0.12, 0.62, 0.3)), {});
      G.lookAt(phone.getWorldPosition(new THREE.Vector3())); R.lookAt(G.eye());
    } else if (id.startsWith('RV_DBG')) {
      M.root.visible = R.root.visible = true; bench.visible = legs.visible = false;
      M.root.position.set(-0.4, 0, 0); M.root.rotation.y = 0; M.pose('sit_bench', { seat: 0.45, hands: 'lap' });
      R.root.position.set(0.4, 0, 0); R.root.rotation.y = 0; R.pose('sit_bench', { seat: 0.45, hands: 'lap' });
    } else if (id === 'RV_PRAY') {
      M.root.visible = L.root.visible = true;
      M.root.position.set(-0.3, 0, 0); M.root.rotation.y = 0.1; M.pose('pray_sit', { seat: 0.45 });
      L.root.position.set(0.35, 0, 0); L.root.rotation.y = -0.15; L.pose('sit_bench', { seat: 0.45, hands: 'lap' });
    } else {
      const set = [W, R, M, G, L];
      set.forEach((f, i) => { f.root.visible = true; f.root.position.set((i - 2) * 0.62, 0, 0); f.root.rotation.y = (2 - i) * 0.08; f.pose('stand', { weight: (i % 2 ? 0.5 : -0.4) }); });
    }
  };
  return {
    scene, camera, post: { exposure: 1.0, vignette: 0.3, contrast: 1.06 },
    setShot(shot, tl, u, T) {
      layout(shot.id);
      if (shot.id === 'RV_FACE') {
        const e = R.eye(); cam.place(camera, [e.x + 0.25, e.y + 0.02, e.z + 2.4], [e.x, e.y - 0.1, 0]); cam.lens(camera, 50);
        return { dof: { focus: 2.4, fstop: 4 } };
      }
      const dbl = q.get('dbl'); if (dbl) for (const f of [M, R]) for (const [k, m] of Object.entries(f.materials)) if (m && m.side !== undefined && k !== 'skin') { m.side = THREE.DoubleSide; m.needsUpdate = true; }
      if (q.get('noskin')) for (const f of [M, R]) { f.layers.body.visible = false; }
      if (q.get('only')) for (const f of [M, R]) { for (const [k, o] of Object.entries(f.layers)) o.visible = k === q.get('only'); for (const h of Object.values(f.hands)) h.root.visible = false; }
      if (q.get('probe') && shot.id.startsWith('RV_DBG')) {
        const m = M.layers.qipao, g = m.geometry, pos = g.attributes.position.array, P = M.P, crotch = P.hipJY - 0.05 * P.H, v3 = new THREE.Vector3();
        M.root.updateMatrixWorld(true); m.skeleton.update();
        let n = 0, sy = 0, sz = 0;
        for (let v = 0; v < pos.length / 3; v++) { if (pos[v * 3 + 1] > crotch || pos[v * 3 + 2] < 0.03) continue; v3.fromArray(pos, v * 3); m.applyBoneTransform(v, v3); v3.applyMatrix4(m.matrixWorld); n++; sy += v3.y; sz += v3.z; }
        console.log('PROBE front', n, (sy / n).toFixed(3), (sz / n).toFixed(3), 'bindMatrix', m.bindMatrix.elements.slice(12, 15).join(','), 'root', M.root.position.toArray().join(','), 'skinW', g.attributes.skinWeight.itemSize, g.attributes.skinWeight.array.constructor.name, g.attributes.skinIndex.array.constructor.name);
      }
      if (shot.id === 'RV_DBG1') { cam.place(camera, [3.2, 0.7, 0.3], [0, 0.55, 0.1]); cam.lens(camera, 40); return { dof: null }; }
      if (shot.id === 'RV_DBG2') { cam.place(camera, [0, 0.9, 2.6], [0, 0.55, 0.1]); cam.lens(camera, 40); return { dof: null }; }
      if (shot.id === 'RV_DBG3') { cam.place(camera, [-1.4, 0.35, 1.6], [0, 0.45, 0.1]); cam.lens(camera, 40); return { dof: null }; }
      if (shot.id === 'RV_SIT') { cam.place(camera, [0.55, 1.05, 2.5], [0, 0.78, 0]); cam.lens(camera, 40); return { dof: { focus: 2.5, fstop: 4 } }; }
      if (shot.id === 'RV_SIDE') { cam.place(camera, [-2.6, 0.95, 0.6], [0, 0.72, 0.05]); cam.lens(camera, 40); return { dof: { focus: 2.6, fstop: 4 } }; }
      if (shot.id === 'RV_PRAY') { cam.place(camera, [-0.6, 1.0, 2.6], [0, 0.75, 0]); cam.lens(camera, 40); return { dof: { focus: 2.6, fstop: 4 } }; }
      cam.place(camera, [0, 1.1, 5.2], [0, 0.88, 0]); cam.lens(camera, 40);
      return { dof: null };
    },
  };
}
