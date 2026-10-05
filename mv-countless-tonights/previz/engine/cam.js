// Camera helpers: physical lenses, paths, handheld, dolly moves.
import * as THREE from 'three';
import { ease, lerp, noise1 } from './util.js';

// Large-format sensor (36 mm wide), cropped to 2.39:1 by the canvas aspect.
export const SENSOR_W = 36;

// Set a PerspectiveCamera from a focal length in mm (horizontal coverage on a 36 mm sensor).
export function lens(camera, mm) {
  const sensorH = SENSOR_W / camera.aspect;
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(sensorH / 2 / mm));
  camera.userData.mm = mm;
  camera.updateProjectionMatrix();
  return camera;
}

const V = (a) => (a.isVector3 ? a : new THREE.Vector3(a[0], a[1], a[2]));

// Place camera at pos, aim at target, optional roll (radians).
export function place(camera, pos, target, roll = 0) {
  camera.position.copy(V(pos));
  camera.up.set(0, 1, 0);
  camera.lookAt(V(target));
  if (roll) camera.rotateZ(roll);
  return camera;
}

// Linear move between two placements with easing. a/b = {pos:[x,y,z], target:[x,y,z], mm?, roll?}
export function move(camera, a, b, u, e = ease.inOutSine) {
  const t = e(Math.min(1, Math.max(0, u)));
  const pos = V(a.pos).clone().lerp(V(b.pos), t);
  const tgt = V(a.target).clone().lerp(V(b.target), t);
  place(camera, pos, tgt, lerp(a.roll || 0, b.roll || 0, t));
  if (a.mm || b.mm) lens(camera, lerp(a.mm || b.mm, b.mm || a.mm, t));
  return t;
}

// Catmull-Rom path through several placements: pts = [{pos,target,mm?}, ...]
export function path(camera, pts, u, e = ease.inOutSine) {
  const t = e(Math.min(1, Math.max(0, u)));
  const pc = new THREE.CatmullRomCurve3(pts.map((p) => V(p.pos)), false, 'centripetal');
  const tc = new THREE.CatmullRomCurve3(pts.map((p) => V(p.target)), false, 'centripetal');
  place(camera, pc.getPoint(t), tc.getPoint(t));
  const mms = pts.map((p) => p.mm).filter(Boolean);
  if (mms.length) {
    const f = t * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(f));
    lens(camera, lerp(pts[i].mm || mms[0], pts[i + 1].mm || mms[0], f - i));
  }
  return t;
}

// Subtle, deterministic handheld / breathing motion. Call AFTER placing the camera.
// amp 1 ≈ gentle shoulder rig; 0.3 ≈ "breathing" on a fluid head.
export function handheld(camera, T, amp = 1, seed = 0) {
  const r = 0.004 * amp;
  camera.rotateX(r * (noise1(T * 0.9, seed + 1) * 0.7 + noise1(T * 2.3, seed + 2) * 0.3));
  camera.rotateY(r * (noise1(T * 0.7, seed + 3) * 0.7 + noise1(T * 1.9, seed + 4) * 0.3));
  camera.rotateZ(r * 0.6 * noise1(T * 0.5, seed + 5));
  camera.position.y += 0.004 * amp * noise1(T * 1.1, seed + 6);
  return camera;
}

// Distance from camera to a world point (handy for focus pulls).
export const distTo = (camera, p) => camera.position.distanceTo(V(p));
