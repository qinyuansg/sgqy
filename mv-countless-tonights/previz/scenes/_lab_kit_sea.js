// LAB: sea + dusk sky + horn stern lantern + distant shore (also rendered nested into the vitrine glass by _lab_kit).
import * as THREE from 'three';
import { createSky } from '../lib/sky.js';
import { createSea, createCoast } from '../lib/sea.js';
import * as FX from '../lib/fx.js';
import * as TX from '../lib/textures.js';

export default async function create(ctx) {
  const { cam } = ctx;
  const q0 = new URLSearchParams(location.search);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.05, 6000);
  camera.userData.H = ctx.H;
  const sky = createSky({ preset: 'dusk', moonAz: 40, moonElev: 9 });
  const sea = createSea({ sky, swell: 'heavy', windDir: 20, defines: Object.fromEntries((q0.get('defs') || '').split(',').filter(Boolean).map((d) => [d, ''])) });
  const coast = createCoast({ sky, az0: -62, az1: -18, distance: 4200, lights: 3 });
  scene.add(sky.object3D, sea.object3D, coast.object3D);
  if (q0.get('nosky')) sky.object3D.visible = false; if (q0.get('nosea')) sea.object3D.visible = false;
  const { moon, hemi } = sky.makeLights({ hemiIntensity: 0.8 }); scene.add(moon, hemi);

  // a piece of the junk's stern: rail + deck planks (for scale), carried by the swell
  const ship = new THREE.Group(); scene.add(ship);
  const deckM = TX.mat('wood_ship', { repeat: [2, 2], tex: { salt: 0.35 } });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(7, 0.12, 6), deckM); deck.position.set(0, 2.9, 1.5); deck.receiveShadow = true; ship.add(deck);
  const railM = TX.mat('wood_beam');
  const rail = new THREE.Mesh(new THREE.BoxGeometry(7, 0.1, 0.12), railM); rail.position.set(0, 3.95, -1.4); ship.add(rail);
  for (let i = 0; i < 9; i++) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.05, 0.09), railM); post.position.set(-3.4 + i * 0.85, 3.45, -1.4); ship.add(post); }
  const bulwark = new THREE.Mesh(new THREE.BoxGeometry(7, 0.5, 0.1), deckM); bulwark.position.set(0, 3.2, -1.45); ship.add(bulwark);
  const railParts = [rail, bulwark, deck]; ship.children.forEach((c) => { if (c.geometry && c.geometry.parameters && c.geometry.parameters.height === 1.05) railParts.push(c); });
  // stern lamp on a bracket at the rail (bible PROP_SHIPLAMP: horn panels, ~7 s swing)
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.1), railM); arm.position.set(-1.25, 4.76, -0.95); ship.add(arm);
  const mast = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.9, 0.08), railM); mast.position.set(-1.25, 3.85, -0.42); ship.add(mast);
  const lamp = FX.lantern({ style: 'horn', size: 0.9, intensity: 5, seed: 4, period: 7, pendulum: 0.07 });
  lamp.object3D.position.set(-1.25, 4.72, -1.45); ship.add(lamp.object3D);
  const spray = FX.seaSpray({ center: [0, 1.2, -14], area: [40, 2.5, 24], count: 40, size: 2.2, opacity: 0.05, color: 0x9aa6bc });
  scene.add(spray.object3D);

  const views = {
    // wide: over the stern rail toward the dusk horizon, lamp left, coast left
    default: { pos: [0.55, 5.05, 2.2], target: [-0.9, 4.75, -30], mm: 32 },
    // nested reflection view for the vitrine: tighter on the swinging lamp over the sea
    reflection: { pos: [-0.55, 4.85, 1.1], target: [-1.3, 4.3, -1.45], mm: 36 },
  };
  return {
    scene, camera, post: { exposure: 1.05, bloom: { strength: 0.45, threshold: 0.8, radius: 0.6 }, vignette: 0.35 },
    setShot(shot, tl, u, T) {
      const v = views[shot.id] || views.default;
      const nestedView = shot.id === 'reflection';
      for (const c of railParts) c.visible = !nestedView; mast.visible = !nestedView;
      if (shot.id === 'night' || shot.id === 'reflection') sky.set({ preset: 'night', moonAz: 30, moonElev: 14 }); else sky.set({ preset: 'dusk', moonAz: 40, moonElev: 9 });
      sky.update(T); coast.update(T);
      const pose = sea.poseAt(0, 0, 0, T, { length: 30, beam: 8, damp: 0.5 });
      ship.position.y = pose.y; ship.rotation.set(pose.pitch, 0, pose.roll, 'YXZ');
      ship.updateMatrixWorld(true);
      lamp.update(T, { swing: [-pose.roll * 1.6 + 0.05 * Math.sin(T * 0.9), -pose.pitch * 1.2] });
      cam.place(camera, v.pos, v.target); cam.lens(camera, v.mm);
      camera.position.applyMatrix4(ship.matrixWorld); const tgt = new THREE.Vector3(...v.target);
      camera.lookAt(tgt.x, tgt.y + pose.y, tgt.z); camera.rotateZ(pose.roll * 0.6);
      cam.handheld(camera, T, 0.4, 3);
      const lw = lamp.flameWorld();
      sea.setLamps([{ position: lw, color: 0xE2A458, intensity: 9 }]);
      sea.update(T, camera);
      spray.update(T);
      return { dof: null };
    },
  };
}
