// LAB: engine cost probe. Shots: EMPTY (clear only), FLAT (one full-screen lit plane), DOF (same + depth of field),
// BLOOM0 (flat, bloom off). Use with tools/bench.mjs or render.mjs --range to read fixed per-frame overheads.
import * as THREE from 'three';
import * as FX from '../lib/fx.js';
import * as TX from '../lib/textures.js';

export default async function create(ctx) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.05, 100);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(40, 20), new THREE.MeshStandardMaterial({ color: 0x556070, roughness: 0.6 }));
  plane.position.z = -6; scene.add(plane);
  const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xaa8866, roughness: 0.4 }));
  box.position.set(0.8, 0, -2.5); scene.add(box);
  const key = new THREE.DirectionalLight(0xffffff, 2); key.position.set(1, 2, 3); scene.add(key);
  scene.add(new THREE.HemisphereLight(0x8899aa, 0x332211, 0.6));
  const qq = new URLSearchParams(location.search);
  const shaft = FX.windowShaft({ center: [-1.5, 2, -3], right: [0, 0, 0.8], up: [0, 1.2, 0], dir: [0.8, -0.5, 0.3], length: 8, cookie: TX.windowCookie().map,
    intensity: 0.3, steps: +(qq.get('steps') || 10), lowres: qq.get('lowres') !== '0' });
  scene.add(shaft.object3D);
  return {
    scene, camera, post: {},
    setShot(shot, tl, u, T) {
      ctx.cam.place(camera, [0, 0, 2], [0, 0, -6]); ctx.cam.lens(camera, 35);
      plane.visible = box.visible = shot.id !== 'EMPTY';
      shaft.object3D.visible = shot.id === 'SHAFT'; shaft.update(T);
      if (shot.id === 'DOF') return { dof: { focus: 4.5, fstop: 2 } };
      if (shot.id === 'BLOOM0') return { bloom: { strength: 0 } };
      return { dof: null };
    },
  };
}
