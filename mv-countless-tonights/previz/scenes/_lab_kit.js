// LAB: environment-kit showcase. Shots: K_MAT (swatch board), K_VIT (vitrine + nested sea reflection + moon shaft + dust),
// K_CANDLE (candle + steam close-up). The sea wide is the separate module _lab_kit_sea (also nested here).
import * as THREE from 'three';
import * as TX from '../lib/textures.js';
import * as FX from '../lib/fx.js';
import { vitrine } from '../lib/glass.js';
import { envTexture } from '../lib/env.js';

export const needs = ['_lab_kit_sea'];

export default async function create(ctx) {
  const { cam } = ctx;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.02, 200);
  camera.userData.H = ctx.H;
  const groups = { mat: new THREE.Group(), vit: new THREE.Group(), candle: new THREE.Group() };
  for (const g of Object.values(groups)) scene.add(g);
  const envs = { mat: envTexture(ctx.renderer, 'night_museum'), vit: envTexture(ctx.renderer, 'night_museum', { moon: 1.4 }), candle: envTexture(ctx.renderer, 'candle_interior') };

  // ============================================================ (a) swatch board under museum light
  {
    const G = groups.mat;
    const table = new THREE.Mesh(new THREE.BoxGeometry(4, 0.06, 2.4), TX.mat('velvet', { tex: { tone: '#191c22' } }));
    table.position.set(0, -0.03, 0); table.receiveShadow = true; G.add(table);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(8, 4), TX.mat('brick', { repeat: [7, 3.5], tex: { limewash: 0.55 } })); wall.position.set(0, 1.4, -1.3); wall.receiveShadow = true; G.add(wall);
    const board = new THREE.Group(); board.position.set(0, 0.0, -0.42); board.rotation.x = -0.52; G.add(board);
    const boardM = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.9, 0.03), new THREE.MeshStandardMaterial({ color: 0x101216, roughness: 0.7 })); boardM.position.set(0, 0.45, -0.016); boardM.castShadow = boardM.receiveShadow = true; board.add(boardM);
    const kinds = [
      ['wood_ship', { tex: { salt: 0.45 } }], ['teak', {}], ['camphor', {}], ['wood_smoke', {}], ['plaster', {}], ['granite', {}], ['brick_render', {}],
      ['terrazzo', {}], ['tiles_clay', {}], ['tiles_terracotta', {}], ['stone', {}], ['brass', { tex: { tone: 'then', patina: 0.35 } }], ['wool_coat', {}], ['linen', {}],
      ['cotton', {}], ['floral', {}], ['indigo', { tex: { salt: 0.3 } }], ['indigo_patch', {}], ['shirt', {}], ['rattan', {}], ['velvet', {}],
    ];
    const ts = 0.225, gap = 0.04, cols = 7;
    kinds.forEach(([k, o], i) => {
      const cx = (i % cols - (cols - 1) / 2) * (ts + gap), ry = 2 - Math.floor(i / cols);
      const m = TX.mat(k, { repeat: [0.45, 0.45], ...o });
      const tile = new THREE.Mesh(new THREE.BoxGeometry(ts, ts, 0.012), m);
      tile.position.set(cx, 0.075 + ry * (ts + gap) + ts / 2, 0.006); tile.castShadow = tile.receiveShadow = true; board.add(tile);
    });
    // hero props on the table: chart, letter (unfinished, pressed flower), oil-paper sweets, compass, bowl (restored, one missing piece), shard E, stained glass
    const chart = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.39), TX.mat('chart')); chart.rotation.x = -Math.PI / 2; chart.rotation.z = 0.06; chart.position.set(-0.74, 0.002, 0.02); chart.receiveShadow = true; G.add(chart);
    const letter = new THREE.Mesh(new THREE.PlaneGeometry(0.17, 0.25), TX.mat('letter', { tex: { fill: 0.72, flower: true } })); letter.rotation.x = -Math.PI / 2; letter.rotation.z = -0.18; letter.position.set(-0.36, 0.003, 0.08); letter.receiveShadow = true; G.add(letter);
    const sweets = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.022, 0.08), TX.mat('oilpaper')); sweets.position.set(-0.18, 0.011, 0.16); sweets.rotation.y = 0.5; sweets.castShadow = true; G.add(sweets);
    const string = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.0012, 4, 24), new THREE.MeshStandardMaterial({ color: 0xA33A2E, roughness: 0.6 })); string.rotation.x = Math.PI / 2; string.scale.set(1.1, 0.9, 1); string.position.set(-0.18, 0.023, 0.16); G.add(string);
    const cg = new THREE.Group(); cg.position.set(0.02, 0, 0.0); cg.rotation.y = 0.3; G.add(cg);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.05, 0.19), TX.mat('camphor')); box.position.y = 0.025; box.castShadow = box.receiveShadow = true; cg.add(box);
    const compassBody = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.012, 64), TX.mat('brass', { tex: { tone: 'museum', patina: 0.45 } })); compassBody.position.y = 0.05; cg.add(compassBody);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.073, 64), TX.mat('compass', { tex: { state: 'museum' } })); face.rotation.x = -Math.PI / 2; face.position.y = 0.0565; cg.add(face);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.002, 0.036), new THREE.MeshStandardMaterial({ color: 0x1c2430, metalness: 0.8, roughness: 0.3 })); needle.position.y = 0.059; cg.add(needle);
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.0037, 0.0022, 0.007), new THREE.MeshStandardMaterial({ color: 0xA33A2E, roughness: 0.4 })); tip.position.set(0, 0.0592, 0.0145); cg.add(tip);
    const K = TX.bowlShards();
    const bowl = new THREE.Mesh(K.geometry, K.material(-1, { mode: 'missing', hide: ['MISSING'] })); bowl.position.set(0.34, 0, 0.02); bowl.rotation.y = -Math.PI / 2 + 0.25; bowl.castShadow = bowl.receiveShadow = true; G.add(bowl);
    const shardE = new THREE.Mesh(K.geometry, K.material('E')); shardE.position.set(0.58, 0.065, 0.1); shardE.rotation.set(0, Math.PI, Math.PI / 2 - 0.08); shardE.castShadow = true; G.add(shardE);
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.44), TX.mat('stained_glass', { intensity: 1.2 })); sg.position.set(0.84, 0.235, -0.12); sg.rotation.y = -0.4; G.add(sg);
    const sgFrame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.02, 0.04), new THREE.MeshStandardMaterial({ color: 0x1a1612, roughness: 0.6 })); sgFrame.position.set(0.84, 0.01, -0.12); sgFrame.rotation.y = -0.4; G.add(sgFrame);
    const salt = new THREE.Mesh(new THREE.PlaneGeometry(ts, ts), TX.mat('salt', { tex: { density: 0.55 } })); salt.position.set(-3 * (ts + gap), 0.075 + 2 * (ts + gap) + ts / 2, 0.0135); board.add(salt);
    const key = new THREE.SpotLight(0xffd2a0, 34, 0, 0.36, 0.85, 2); key.position.set(-0.9, 2.7, 1.3); key.target.position.set(0.05, 0.25, -0.35); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0002; key.shadow.normalBias = 0.01; G.add(key, key.target);
    const rim = new THREE.SpotLight(0x9fb4e8, 7, 0, 0.6, 0.8, 2); rim.position.set(1.8, 1.4, -0.9); rim.target.position.set(0.2, 0.1, 0.2); G.add(rim, rim.target);
    const key2 = new THREE.SpotLight(0xffd8b0, 9, 0, 0.42, 0.9, 2); key2.position.set(0.6, 2.2, 1.6); key2.target.position.set(0.1, 0.0, 0.0); G.add(key2, key2.target);
    const sgLight = new THREE.PointLight(0xffe0b8, 0.25, 0, 2); sgLight.position.set(0.92, 0.25, 0.0); G.add(sgLight);
  }

  // ============================================================ (b) vitrine: compass under glass, moon shaft, dust, nested sea reflection
  const rt = ctx.makeRT(640, 534); const RT_ASPECT = 1.2;
  let V, shaft, dust;
  {
    const G = groups.vit;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), TX.mat('teak', { repeat: [5, 5] })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; G.add(floor);
    const back = new THREE.Mesh(new THREE.PlaneGeometry(14, 6), TX.mat('brick', { repeat: [7, 3], tex: { limewash: 0.3 } })); back.position.set(0, 3, -3.2); back.receiveShadow = true; G.add(back);
    const left = new THREE.Mesh(new THREE.PlaneGeometry(10, 6), TX.mat('brick_render', { repeat: [5, 3] })); left.position.set(-3.4, 3, 0); left.rotation.y = Math.PI / 2; left.receiveShadow = true; G.add(left);
    // arched window opening in the left wall (frame + bright moonlit glass)
    const winC = new THREE.Vector3(-3.38, 2.5, -2.0);
    const ck = TX.windowCookie({ pattern: 'steel', size: 512, blur: 1.5, glass: 0.2 });
    const winGlass = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.8), new THREE.MeshBasicMaterial({ map: ck.map, color: new THREE.Color(0.22, 0.27, 0.4), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); winGlass.position.copy(winC).add(new THREE.Vector3(-0.01, 0, 0)); winGlass.rotation.y = Math.PI / 2; G.add(winGlass);
    const dir = new THREE.Vector3(0.85, -0.42, 0.32).normalize();
    shaft = FX.windowShaft({ center: winC.clone().add(new THREE.Vector3(0.02, 0, 0)), right: [0, 0, 0.7], up: [0, 1.4, 0], dir, length: 7, cookie: ck.map, color: 0xb4c6ec, intensity: 0.12, floorY: 0, noise: 0.85, soft: 0.08 });
    G.add(shaft.object3D);
    // moonlight on the floor through the same window (projected cookie)
    const cs = FX.windowLight({ center: winC, right: [0, 0, 0.7], up: [0, 1.4, 0], dir, cookie: ck.map, color: 0xb4c6ec, intensity: 1.6 });
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 6, 16), new THREE.MeshStandardMaterial({ color: 0x3B4540, roughness: 0.5, metalness: 0.4 })); col.position.set(-1.9, 3, -1.6); col.castShadow = col.receiveShadow = true; G.add(col);
    const V2 = vitrine({ res: [ctx.W, ctx.H], w: 0.5, d: 0.5, h: 0.4, light: 'strip' }); V2.object3D.position.set(1.6, 0, -2.4); V2.object3D.rotation.y = -0.3; G.add(V2.object3D);
    const V3 = vitrine({ res: [ctx.W, ctx.H], w: 0.5, d: 0.5, h: 0.4, light: 'strip' }); V3.object3D.position.set(-0.75, 0, -2.75); G.add(V3.object3D);
    const V4 = vitrine({ res: [ctx.W, ctx.H], w: 0.5, d: 0.5, h: 0.4, light: 'strip' }); V4.object3D.position.set(0.55, 0, -3.0); G.add(V4.object3D);
    G.add(cs.object3D);
    V = vitrine({ res: [ctx.W, ctx.H], lightIntensity: 5, glass: { haze: 0.45, dust: 0.4, hazeLevel: 0.022, envMapIntensity: 1.6 }, front: { nestedMode: 'plane', nestedStrength: 0.7, parallax: 0.05, wipe: { points: [[0.16, 0.58], [0.36, 0.68], [0.58, 0.62], [0.84, 0.7]], width: 0.19, soft: 0.07, progress: 1 } } });
    V.object3D.position.set(0, 0, 0); G.add(V.object3D);
    // compass on a 15° acrylic cradle
    const cradle = new THREE.Group(); cradle.position.set(0, V.deckY + 0.07, 0); cradle.rotation.x = THREE.MathUtils.degToRad(15); G.add(cradle);
    const acr = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.008, 0.17), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.18, depthWrite: false })); cradle.add(acr);
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.06), acr.material); stand.position.set(0, -0.035, 0); cradle.add(stand);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.077, 0.032, 64), TX.mat('brass', { tex: { tone: 'museum', patina: 0.45 }, envMapIntensity: 2.0 })); body.position.y = 0.02; body.castShadow = true; cradle.add(body);
    const face = new THREE.Mesh(new THREE.CircleGeometry(0.072, 64), TX.mat('compass', { tex: { state: 'museum' }, envMapIntensity: 2.0 })); face.rotation.x = -Math.PI / 2; face.position.y = 0.0365; cradle.add(face);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.0035, 0.002, 0.036), new THREE.MeshStandardMaterial({ color: 0x1c2430, metalness: 0.8, roughness: 0.3 })); needle.position.y = 0.0385; cradle.add(needle);
    dust = FX.dustMotes({ center: [-0.9, 1.3, -0.4], size: [3.6, 2.4, 2.6], count: 1200, beam: { shaft }, intensity: 1.1, ambient: 0.0, moteSize: 0.0026 });
    G.add(dust.object3D);
    const fill = new THREE.HemisphereLight(0x2a3a5a, 0x1a120c, 0.12); G.add(fill);
  }

  // ============================================================ (c) candle + tea steam close-up (old home table, cracked-ice window)
  let candle, steam1;
  {
    const G = groups.candle;
    const table = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.9), TX.mat('camphor', { repeat: [1, 1] })); table.position.set(0, 0.75, 0); table.receiveShadow = true; table.castShadow = true; G.add(table);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(5, 3), TX.mat('granite', { repeat: [3, 2] })); wall.position.set(0, 1.5, -0.9); wall.receiveShadow = true; G.add(wall);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), TX.mat('tiles_clay', { repeat: [6, 6] })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; G.add(floor);
    candle = FX.candle({ state: 'B', seed: 3, intensity: 0.32, castShadow: true });
    candle.object3D.position.set(-0.11, 0.775, -0.1); G.add(candle.object3D);
    const K = TX.bowlShards();
    const bowl = new THREE.Mesh(K.geometry, TX.mat('porcelain_bowl')); bowl.position.set(0.05, 0.775, 0.04); bowl.rotation.y = -Math.PI / 2 - 0.15; bowl.castShadow = bowl.receiveShadow = true; G.add(bowl);
    const rice = new THREE.Mesh(new THREE.SphereGeometry(0.062, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.6), new THREE.MeshStandardMaterial({ color: 0xe6e2d6, roughness: 0.7 })); rice.scale.y = 0.45; rice.position.set(0.05, 0.775 + 0.04, 0.04); G.add(rice);
    // teacup (bible PROP_TEA: pale bluish-white, one cobalt line 6 mm below the rim) with steam
    const cupPts = [[0, 0.002], [0.026, 0.002], [0.027, 0], [0.03, 0.001], [0.036, 0.02], [0.041, 0.068], [0.039, 0.068], [0.034, 0.02], [0.02, 0.008], [0, 0.008]].map(([r, y]) => new THREE.Vector2(r, y));
    const ct = TX.porcelain({ layout: 'cup', lineV: 0.12 });
    const cup = new THREE.Mesh(new THREE.LatheGeometry(cupPts, 48), new THREE.MeshPhysicalMaterial({ map: ct.map, roughnessMap: ct.roughnessMap, roughness: 1, clearcoat: 0.5, clearcoatRoughness: 0.08, color: 0xE6ECEC, side: THREE.DoubleSide }));
    cup.position.set(0.2, 0.775, -0.12); cup.castShadow = true; G.add(cup);
    const teaS = new THREE.Mesh(new THREE.CircleGeometry(0.037, 32), new THREE.MeshStandardMaterial({ color: 0x8a6a2a, roughness: 0.05 })); teaS.rotation.x = -Math.PI / 2; teaS.position.set(0.2, 0.775 + 0.058, -0.12); G.add(teaS);
    steam1 = FX.steam({ position: [0.2, 0.775 + 0.06, -0.12], count: 40, height: 0.3, width: 0.026, opacity: 0.16, size: 0.055, light: 1.0, color: 0xf5e4c8 });
    G.add(steam1.object3D);
    // cracked-ice lattice window: moonlight through it onto wall/table
    const ck = TX.windowCookie({ pattern: 'crackedIce', size: 512, blur: 1.2, glass: 0 });
    const cs = FX.windowLight({ center: [0.75, 1.35, -0.88], right: [0.4, 0, 0], up: [0, 0.5, 0], dir: [-0.55, -0.45, 0.7], cookie: ck.map, color: 0x9fb4dc, intensity: 1.2, frameVisible: false });
    G.add(cs.object3D);
    const fill = new THREE.HemisphereLight(0x1a2438, 0x120c08, 0.06); G.add(fill);
    const bounce = new THREE.PointLight(0xffb070, 0.05, 0, 2); bounce.position.set(0.05, 0.84, 0.45); G.add(bounce);
  }

  const setups = {
    K_MAT(tl, u, T) {
      cam.move(camera, { pos: [0.08, 0.98, 2.0], target: [0.03, 0.31, -0.36], mm: 33 }, { pos: [0.02, 0.97, 1.97], target: [0.01, 0.31, -0.36], mm: 33 }, u);
      return { post: { exposure: 1.0 }, dof: { focus: cam.distTo(camera, [0, 0.2, 0.0]), fstop: 8 } };
    },
    K_VIT(tl, u, T) {
      cam.move(camera, { pos: [0.8, 1.34, 1.75], target: [-0.18, 1.08, -0.2], mm: 35 }, { pos: [0.74, 1.35, 1.7], target: [-0.18, 1.08, -0.2], mm: 35 }, u);
      cam.handheld(camera, T, 0.2, 2);
      return { exposure: 1.15, dof: { focus: cam.distTo(camera, [0, 1.1, 0.0]), fstop: 2.8 } };
    },
    K_CANDLE(tl, u, T) {
      cam.move(camera, { pos: [0.06, 0.93, 0.64], target: [0.04, 0.86, -0.06], mm: 50 }, { pos: [0.02, 0.925, 0.62], target: [0.03, 0.86, -0.06], mm: 50 }, u);
      return { exposure: 1.0, dof: { focus: cam.distTo(camera, [0.05, 0.82, 0.02]), fstop: 2.4 } };
    },
  };
  return {
    scene, camera, post: { exposure: 1.0, bloom: { strength: 0.4, threshold: 0.85, radius: 0.55 } },
    setShot(shot, tl, u, T) {
      const which = shot.id === 'K_VIT' ? 'vit' : shot.id === 'K_CANDLE' ? 'candle' : 'mat';
      for (const [k, g] of Object.entries(groups)) g.visible = k === which;
      scene.environment = envs[which];
      scene.environmentIntensity = which === 'vit' ? 0.5 : which === 'candle' ? 0.6 : 0.55;
      scene.background = new THREE.Color(0x020305);
      if (which === 'vit') {
        const tex = ctx.renderNested('_lab_kit_sea', 'reflection', tl, u, T, rt, RT_ASPECT);
        V.setNested(tex, 0.9);
        shaft.update(T); dust.update(T, { camera, focus: 2.15, fstop: 2.8 });
      }
      if (which === 'candle') { candle.update(T); steam1.update(T); }
      const r = (setups[shot.id] || setups.K_MAT)(tl, u, T);
      const post = r.post || {}; delete r.post;
      return { ...post, ...r };
    },
  };
}
