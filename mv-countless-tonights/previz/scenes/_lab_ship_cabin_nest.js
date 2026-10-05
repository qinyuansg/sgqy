// LAB (ship_cabin): shows the nested named view 'view_cabin' as the gallery would — rendered into an RT and displayed
// on a portrait pane (G3a, 1.4 × 2.4 m → aspect 0.58) and a landscape pane, side by side. Shots: NEST_CABIN.
import * as THREE from 'three';
export const needs = ['ship_cabin'];
export default async function create(ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x05070a);
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.05, 50);
  const rtP = ctx.makeRT(420, 720), rtL = ctx.makeRT(640, 400);
  const mk = (rt, w, h, x) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: rt.texture, toneMapped: false })); m.position.set(x, 0, 0); scene.add(m); return m; };
  mk(rtP, 1.4 * 0.5, 2.4 * 0.5, -0.75); mk(rtL, 1.6, 1.0, 0.75);
  return {
    scene, camera, post: { exposure: 1.0, vignette: 0.1, grain: 0.02 },
    setShot(shot, tl, u, T) {
      ctx.renderNested('ship_cabin', 'view_cabin', tl, u, T, rtP, 1.4 / 2.4);
      ctx.renderNested('ship_cabin', 'view_cabin', tl, u, T, rtL, 1.6);
      ctx.cam.place(camera, [0, 0, 3.2], [0, 0, 0]); ctx.cam.lens(camera, 40);
      return { dof: null };
    },
  };
}
