// LAB: sea_deck's named view 'view_shiplamp' rendered nested (no post inside, like a vitrine pane) at three pane aspects.
import * as THREE from 'three';
export const needs = ['sea_deck'];
export default async function create(ctx) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x05070a);
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.05, 100);
  const panes = [[480, 400, -1.55, 0.85], [400, 500, 0.0, 0.92], [640, 268, 1.55, 0.6]].map(([w, h, x, sc]) => {
    const rt = ctx.makeRT(w, h); const m = new THREE.Mesh(new THREE.PlaneGeometry(1.4 * sc * w / h * (h / 400), 1.4 * sc * (h / 400)), new THREE.MeshBasicMaterial({ map: rt.texture }));
    m.position.set(x, 0, 0); scene.add(m); return { rt, m, a: w / h };
  });
  return { scene, camera, post: { exposure: 1.0, vignette: 0.1, grain: 0.0, bloom: { strength: 0.3 } },
    setShot(shot, tl, u, T) {
      for (const p of panes) ctx.renderNested('sea_deck', 'view_shiplamp', tl, u, T + 15, p.rt, p.a);
      ctx.cam.place(camera, [0, 0, 4.2], [0, 0, 0]); ctx.cam.lens(camera, 32);
      return { dof: null };
    } };
}
