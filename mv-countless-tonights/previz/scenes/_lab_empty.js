import * as THREE from 'three';
export default async function create(ctx) {
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.1, 100);
  return { scene, camera, post: { bloom: { strength: +(new URLSearchParams(location.search).get('bloom') ?? 0.35) } }, setShot(shot) { camera.position.set(0, 0, 0); return shot.id === 'dof' ? { dof: { focus: 2, fstop: 2 } } : {}; } };
}
