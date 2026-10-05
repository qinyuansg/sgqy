import * as THREE from 'three';
import * as FX from '../lib/fx.js';
export default async function create(ctx) {
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.05, 100);
  const q = new URLSearchParams(location.search);
  const r = FX.rain({ center: [0, 1.6, 0], size: [4, 3, 4], count: 3000, intensity: 1.0, width: +(q.get('w') || 0.0011) }); scene.add(r.object3D);
  const d = FX.drips({ points: [[-0.5, 2.5, 0], [0, 2.5, 0], [0.5, 2.5, 0]], toY: 0, intensity: 3 }); scene.add(d.object3D);
  return { scene, camera, setShot(shot, tl, u, T) { r.update(T); d.update(T); ctx.cam.place(camera, [0, 1.5, 4], [0, 1.5, 0]); ctx.cam.lens(camera, 35); return { bloom: { strength: 0 } }; } };
}
