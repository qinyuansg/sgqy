// Lab: hand variants close-up (throwaway test module)
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeHand, pairHands } from '/previz/lib/hand.js';

export default async function create(ctx) {
  const { cam } = ctx;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x101318);
  const pm = new THREE.PMREMGenerator(ctx.renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.35;
  const camera = new THREE.PerspectiveCamera(20, ctx.aspect, 0.02, 20);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4, 4), new THREE.MeshStandardMaterial({ color: 0x2b2a28, roughness: 0.8 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const key = new THREE.SpotLight(0xfff1e0, 9, 8, 0.6, 0.6, 2); key.position.set(0.9, 1.3, 1.4); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.002; scene.add(key);
  key.target.position.set(0, 0.08, 0); scene.add(key.target);
  const rim = new THREE.DirectionalLight(0xbcd0ff, 1.6); rim.position.set(-1, 0.8, -1.2); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0x9aa6bb, 0x221d18, 0.35));

  const t0 = performance.now();
  const q = new URLSearchParams(location.search);
  const variant = 'bare';
  const hands = [];
  const views = [
    { pose: 'flat', fd: [0, 1, 0], pn: [0, 0, -1] },   // dorsal, fingers up
    { pose: 'flat', fd: [0, 1, 0], pn: [0, 0, 1] },    // palm
    { pose: 'relaxed', fd: [0, -1, 0], pn: [1, 0, 0] }, // side (thumb toward camera?)
    { pose: 'relaxed', fd: [0, -1, 0], pn: [0, 0, 1] },
    { pose: 'grip', pp: { radius: 0.018 }, fd: [0, -1, 0], pn: [-1, 0, 0] },
  ];
  views.forEach((v, i) => {
    const h = makeHand({ side: 'L', lod: 'close', variant: 'bare', age: 0.2, skin: 0xd2a586 });
    const x = (i - 2) * 0.2;
    h.placeWrist([x, v.fd[1] > 0 ? 0.03 : 0.22, 0], v.fd, v.pn); h.pose(v.pose, v.pp || {});
    scene.add(h.root); hands.push(h);
    if (v.pose === 'grip') { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.16, 32), new THREE.MeshStandardMaterial({ color: 0x6b4a2b, roughness: 0.5 })); c.castShadow = true; h.hold(c, 'grip'); }
  });
  // variants row 2 (x offset 2 m): glove wipe, salt relaxed with rolled cuff + patch, old bare, cup
  const V2 = [
    makeHand({ side: 'L', lod: 'close', variant: 'glove' }),
    makeHand({ side: 'R', lod: 'close', variant: 'salt', sex: 'm', age: 0.55, skin: 0xa8755a, cuffs: [{ style: 'rolled', color: 0x223554, fabric: 'indigo', radius: 0.046, detail: [{ type: 'patch', color: 0x5d7fa6 }] }] }),
    makeHand({ side: 'L', lod: 'close', variant: 'bare', age: 0.85, sex: 'm', skin: 0xc49a80, cuffs: [{ style: 'band', color: 0x3a3b3f, fabric: 'wool', radius: 0.04, detail: [{ type: 'worn' }] }] }),
    makeHand({ side: 'R', lod: 'close', variant: 'bare', age: 0.25, skin: 0xd8ae93 }),
  ];
  const poses2 = [['wipe', {}, [0, -1, 0], [0, 0, -1]], ['relaxed', {}, [0, -1, 0], [0, 0, 1]], ['relaxed', {}, [0, -1, 0], [0, 0, -1]], ['hold_cup', {}, [0, -1, 0], [1, 0, 0]]];
  V2.forEach((h, i) => { h.placeWrist([2 + (i - 1.5) * 0.2, 0.22, 0], poses2[i][2], poses2[i][3]); h.pose(poses2[i][0], poses2[i][1]); scene.add(h.root); hands.push(h); });
  { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.034, 0.09, 40), new THREE.MeshStandardMaterial({ color: 0xe8e2d6, roughness: 0.25 })); c.castShadow = true; V2[3].hold(c, 'cup'); }
  console.log('hands built ms', (performance.now() - t0).toFixed(0));
  const setups = {
    default(tl, u, T, shot) {
      const m = /^H(\d)$/.exec(shot.id);
      if (m) {
        const h = hands[+m[1]];
        const c = h.root.position.clone().add(new THREE.Vector3(0, h.root.position.y > 0.1 ? -0.09 : 0.09, 0));
        cam.place(camera, [c.x + 0.08, c.y + 0.05, 0.62], c); cam.lens(camera, 100);
        return { dof: { focus: 0.62, fstop: 8 } };
      }
      if (shot.id === 'GRIP') { const h = hands[4]; const c = h.root.position.clone().add(new THREE.Vector3(-0.02, -0.08, 0)); cam.place(camera, [c.x - 0.25, c.y + 0.12, 0.55], c); cam.lens(camera, 100); return { dof: { focus: 0.6, fstop: 11 } }; }
      if (shot.id === 'GRIP2') { const h = hands[4]; const c = h.root.position.clone().add(new THREE.Vector3(-0.02, -0.08, 0)); cam.place(camera, [c.x - 0.6, c.y - 0.02, 0.0], c); cam.lens(camera, 100); return { dof: { focus: 0.6, fstop: 11 } }; }
      if (shot.id === 'CUP') { const h = hands[8]; const c = h.root.position.clone().add(new THREE.Vector3(0.03, -0.08, 0)); cam.place(camera, [c.x + 0.3, c.y + 0.15, 0.5], c); cam.lens(camera, 100); return { dof: { focus: 0.6, fstop: 11 } }; }
      if (shot.id === 'ROW2') { cam.place(camera, [2, 0.14, 1.9], [2, 0.12, 0]); cam.lens(camera, 85); return { dof: null }; }
      cam.place(camera, [0, 0.13, 2.4], [0, 0.12, 0]); cam.lens(camera, 85);
      return { dof: null };
    },
  };
  return {
    scene, camera, post: { exposure: 1.0, vignette: 0.2, grain: 0.02 },
    setShot(shot, tl, u, T) { return (setups[shot.id] || setups.default)(tl, u, T, shot); },
  };
}
