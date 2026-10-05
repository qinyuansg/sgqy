import * as THREE from 'three';
import * as FX from '../lib/fx.js';
import * as TX from '../lib/textures.js';
export default async function create(ctx) {
  const scene = new THREE.Scene(); const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.05, 100);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ color: 0x404040, roughness: 0.8 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const winC = new THREE.Vector3(-3.38, 2.6, -0.6);
  const ck = TX.windowCookie({ pattern: 'steel', size: 512, blur: 1.5, glass: 0.2 });
  const dir = new THREE.Vector3(0.62, -0.5, 0.42).normalize();
  const shaft = FX.windowShaft({ center: winC, right: [0, 0, 0.7], up: [0, 1.4, 0], dir, length: 7, cookie: ck.map, color: 0xb4c6ec, intensity: 1.0, floorY: 0 });
  scene.add(shaft.object3D);
  const qq = new URLSearchParams(location.search);
  const cs = FX.cookieSpot({ center: winC, right: [0, 0, 0.7], up: [0, 1.4, 0], dir, cookie: qq.get('nomap') ? null : ck.map, color: 0xb4c6ec, intensity: 2.2 }); scene.add(cs.object3D);
  if (qq.get('noshadow')) cs.light.castShadow = false;
  if (qq.get('point')) { const pl = new THREE.PointLight(0xffffff, 5); pl.position.set(0, 2, 1); scene.add(pl); }
  console.log('spot', cs.light.intensity, cs.light.angle, cs.light.position.toArray().map(v=>v.toFixed(2)).join(','));
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.5,1,0.5), new THREE.MeshStandardMaterial({color:0x808080})); box.position.set(-0.6,0.5,1.2); box.castShadow = true; scene.add(box);
  return { scene, camera, setShot(shot, tl, u, T) { shaft.update(T); ctx.cam.place(camera, [0.5, 1.3, 4.5], [-1.0, 1.0, 0]); ctx.cam.lens(camera, 24); return {}; } };
}
