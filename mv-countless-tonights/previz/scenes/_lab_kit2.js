// LAB 2: chapel stained-glass light petals (coloured windowLight + coloured shaft + dust), eave rain with drips into the
// blue-and-white bowl (rain, drips, ripples, oil lamp, fog), env-preset spheres, sky presets. Throwaway test module.
import * as THREE from 'three';
import * as TX from '../lib/textures.js';
import * as FX from '../lib/fx.js';
import { envTexture, ENV_PRESETS } from '../lib/env.js';
import { createSky } from '../lib/sky.js';
import { createSea } from '../lib/sea.js';

export default async function create(ctx) {
  const { cam } = ctx;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.02, 6000); camera.userData.H = ctx.H;
  const groups = { chapel: new THREE.Group(), rain: new THREE.Group(), env: new THREE.Group(), sky: new THREE.Group() };
  for (const g of Object.values(groups)) scene.add(g);

  // ---------------------------------------------------------------- chapel
  let shaftC, dustC;
  {
    const G = groups.chapel;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), TX.mat('tiles_terracotta', { repeat: [20, 20] })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; G.add(floor);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), TX.mat('plaster', { repeat: [4, 2.2], tex: { tone: 'lime', damp: 0.2, flake: 0.15 } })); wall.position.set(-3, 4.5, 0); wall.rotation.y = Math.PI / 2; wall.receiveShadow = true; G.add(wall);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), TX.mat('plaster', { repeat: [4, 2.2], tex: { tone: 'lime', damp: 0.2, flake: 0.15, seed: 5 } })); back.position.set(0, 4.5, -6); back.receiveShadow = true; G.add(back);
    const sg = TX.stainedGlass({ style: 'mixed', seed: 14 });
    const winC = new THREE.Vector3(-2.98, 3.4, -1.2), R = [0, 0, 0.55], U = [0, 1.1, 0];
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 2.2), new THREE.MeshBasicMaterial({ map: sg.map, transparent: true, color: new THREE.Color(1, 1, 1).multiplyScalar(1.6) })); pane.position.copy(winC).add(new THREE.Vector3(0.01, 0, 0)); pane.rotation.y = Math.PI / 2; G.add(pane);
    const dir = new THREE.Vector3(0.6, -0.68, 0.42).normalize();
    const qq = new URLSearchParams(location.search);
    const wl = FX.windowLight({ center: winC, right: R, up: U, dir, cookie: qq.get('wcook') === 'win' ? TX.windowCookie().map : sg.cookie, colored: !qq.get('nocol'), color: 0xffd8a8, intensity: 9 }); G.add(wl.object3D);
    shaftC = FX.windowShaft({ center: winC, right: R, up: U, dir, length: 9, cookie: sg.cookie, color: 0xffe2bc, intensity: 0.3, floorY: 0, noise: 0.8 }); G.add(shaftC.object3D);
    dustC = FX.dustMotes({ center: [-1, 2, 0.6], size: [4, 3.4, 4], count: 1400, beam: { shaft: shaftC }, intensity: 2.6, moteSize: 0.0035, ambient: 0.005 }); G.add(dustC.object3D);
    const pewM = TX.mat('pew', { repeat: [1, 1] });
    for (let i = 0; i < 4; i++) {
      const pew = new THREE.Group(); pew.position.set(2.3, 0, -2.6 + i * 1.1); G.add(pew);
      const seat = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.06, 0.42), pewM); seat.position.y = 0.45; const backr = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.5, 0.05), pewM); backr.position.set(0, 0.8, 0.2);
      for (const m of [seat, backr]) { m.castShadow = m.receiveShadow = true; pew.add(m); }
      for (const x of [-1.55, 1.55]) { const end = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.0, 0.5), pewM); end.position.set(x, 0.5, 0.05); end.castShadow = end.receiveShadow = true; pew.add(end); }
    }
    G.add(new THREE.HemisphereLight(0x3a3040, 0x201510, 0.25));
    G.userData.env = envTexture(ctx.renderer, 'chapel_coloured');
  }

  // ---------------------------------------------------------------- eave rain + bowl
  let rainFX, dripFX, rip, lampFX, fog;
  {
    const G = groups.rain;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), TX.mat('stone', { repeat: [5, 5], tex: { tone: 'dark', seed: 7 } })); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; G.add(ground);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), TX.mat('granite', { repeat: [3, 1.6] })); wall.position.set(0, 2, -1.2); wall.receiveShadow = true; G.add(wall);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.1, 0.06), TX.mat('wood_smoke', { repeat: [1, 1], tex: { planks: 4, joints: 0 } })); door.position.set(0.7, 1.05, -1.17); door.receiveShadow = true; G.add(door);
    const step = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.16, 0.5), TX.mat('granite', { repeat: [0.6, 0.2] })); step.position.set(0.7, 0.08, -0.9); step.castShadow = step.receiveShadow = true; G.add(step);
    const niche = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.32, 0.16), new THREE.MeshStandardMaterial({ color: 0x2a2622, roughness: 0.9, side: THREE.BackSide })); niche.position.set(-0.2, 1.35, -1.12); G.add(niche);
    lampFX = FX.oilLamp({ intensity: 0.9 }); lampFX.object3D.position.set(-0.24, 1.2, -1.12); G.add(lampFX.object3D);
    const eave = new THREE.Mesh(new THREE.BoxGeometry(8, 0.12, 1.3), TX.mat('wood_beam', { repeat: [4, 1] })); eave.position.set(0, 2.75, -0.55); eave.castShadow = true; G.add(eave);
    const eaveEdge = 0.1;
    const pts = []; for (let i = 0; i < 14; i++) pts.push([-2.6 + i * 0.4 + (i % 3) * 0.05, 2.68, eaveEdge]);
    pts.push([-0.55, 2.68, eaveEdge + 0.0]);
    dripFX = FX.drips({ points: pts, toY: 0.05, period: [0.55, 1.3], lamp: { position: [-0.2, 1.3, -1.0], intensity: 0.8 } }); G.add(dripFX.object3D);
    const K = TX.bowlShards();
    const bowl = new THREE.Mesh(K.geometry, TX.mat('porcelain_bowl')); bowl.position.set(-0.55, 0, eaveEdge); bowl.rotation.y = -Math.PI / 2 - 0.3; bowl.castShadow = bowl.receiveShadow = true; G.add(bowl);
    rip = FX.ripples({ radius: 0.062, sources: dripFX.sources([-0.55, 0.05, eaveEdge], 0.07), rainRate: 0 }); rip.object3D.position.set(-0.55, 0.05, eaveEdge); G.add(rip.object3D);
    rainFX = FX.rain({ center: [0, 1.6, 2.2], size: [6, 3.4, 4.0], count: 5000, intensity: 0.3, lamp: { position: [-0.2, 1.3, -1.0], color: 0xE2A458, intensity: 2.5 } }); G.add(rainFX.object3D);
    fog = FX.fogCards({ center: [0, 0.8, 4.5], size: [9, 1, 3], count: 5, color: 0x5a6a88, opacity: 0.12 }); G.add(fog.object3D);
    const moon = new THREE.DirectionalLight(0x9fb2d8, 0.35); moon.position.set(3, 6, 5); G.add(moon);
    G.add(new THREE.HemisphereLight(0x223048, 0x0c0a08, 0.15));
    G.userData.env = envTexture(ctx.renderer, 'moon_exterior');
  }

  // ---------------------------------------------------------------- env spheres
  {
    const G = groups.env;
    ENV_PRESETS.forEach((name, i) => {
      const env = envTexture(ctx.renderer, name);
      const x = (i - 2) * 0.62;
      const chrome = new THREE.Mesh(new THREE.SphereGeometry(0.22, 48, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.06, envMap: env }));
      chrome.position.set(x, 0.5, 0); G.add(chrome);
      const brassS = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 24), new THREE.MeshStandardMaterial({ color: 0xb08d57, metalness: 1, roughness: 0.35, envMap: env }));
      brassS.position.set(x - 0.12, 0.12, 0.35); G.add(brassS);
      const glaze = new THREE.Mesh(new THREE.SphereGeometry(0.12, 32, 24), new THREE.MeshPhysicalMaterial({ color: 0xedf1ef, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.05, envMap: env }));
      glaze.position.set(x + 0.15, 0.12, 0.35); G.add(glaze);
    });
  }

  // ---------------------------------------------------------------- sky presets strip (dusk / night / predawn / dawn) over a calm sea
  const sky = createSky({ preset: 'dusk' }); const sea = createSea({ sky, swell: 'calm' }); groups.sky.add(sky.object3D, sea.object3D);

  const setups = {
    K_CHAPEL(tl, u, T) { cam.place(camera, [1.2, 1.45, 4.6], [-0.9, 1.25, -0.6]); cam.lens(camera, 24); return { exposure: 1.1, dof: { focus: 4.5, fstop: 5.6 } }; },
    K_RAIN(tl, u, T) { cam.place(camera, [0.25, 0.55, 3.3], [-0.3, 0.55, -0.6]); cam.lens(camera, 40); return { exposure: 1.4, dof: { focus: cam.distTo(camera, [-0.55, 0.06, 0.1]), fstop: 5.6 } }; },
    K_ENV(tl, u, T) { cam.place(camera, [0, 0.62, 2.9], [0, 0.32, 0]); cam.lens(camera, 40); return { exposure: 1.0 }; },
  };
  const skyShots = { SKY_DUSK: 'dusk', SKY_NIGHT: 'night', SKY_PREDAWN: 'predawn', SKY_DAWN: 'dawn' };
  return {
    scene, camera, post: { bloom: { strength: 0.4, threshold: 0.85 } },
    setShot(shot, tl, u, T) {
      const which = shot.id === 'K_CHAPEL' ? 'chapel' : shot.id === 'K_RAIN' ? 'rain' : shot.id === 'K_ENV' ? 'env' : 'sky';
      for (const [k, g] of Object.entries(groups)) g.visible = k === which;
      scene.environment = groups[which].userData.env || null; scene.environmentIntensity = 0.5;
      scene.background = which === 'env' ? new THREE.Color(0x0a0c10) : new THREE.Color(0x010203);
      if (which === 'chapel') { shaftC.update(T); dustC.update(T, { camera, focus: 3.4, fstop: 4 }); }
      if (which === 'rain') { rainFX.update(T); dripFX.update(T); rip.update(T); lampFX.update(T); fog.update(T); }
      if (which === 'sky') {
        sky.set({ preset: skyShots[shot.id] || 'dusk' }); sky.update(T);
        const az = { SKY_DUSK: -35, SKY_NIGHT: 15, SKY_PREDAWN: 70, SKY_DAWN: 70 }[shot.id] ?? 0;
        cam.place(camera, [0, 3, 0], [Math.sin(az * Math.PI / 180) * 50, 4.5, -Math.cos(az * Math.PI / 180) * 50]); cam.lens(camera, 24);
        sea.update(T, camera);
        return { exposure: 1.0 };
      }
      return (setups[shot.id] || setups.K_ENV)(tl, u, T);
    },
  };
}
