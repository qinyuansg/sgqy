// Lab: figure / cast / hands reference renders (throwaway test module, also used for bible refs).
// Shots: CAST (lineup), CAST_A/CAST_B (halves), POSES, HANDS, FIG<n> (single), FACE<n>, BACK
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { makeFigure } from '/previz/lib/figure.js';
import { makeHand, pairHands } from '/previz/lib/hand.js';

let cast = null;
try { cast = await import('/previz/lib/cast.js'); } catch (e) { console.warn('cast.js not ready', String(e).slice(0, 200)); }

export default async function create(ctx) {
  const { cam } = ctx;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1d22);
  const pm = new THREE.PMREMGenerator(ctx.renderer);
  scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.28;
  const camera = new THREE.PerspectiveCamera(30, ctx.aspect, 0.05, 80);
  // cyclorama: floor + curved back wall
  const cyc = new THREE.Group();
  const cycMat = new THREE.MeshStandardMaterial({ color: 0x4a4d52, roughness: 0.92, side: THREE.DoubleSide });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 30), cycMat); floor.rotation.x = -Math.PI / 2; floor.position.set(40, 0, 5); floor.receiveShadow = true; cyc.add(floor);
  const curve = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 200, 32, 1, true, Math.PI, Math.PI / 2), cycMat);
  curve.rotation.z = Math.PI / 2; curve.position.set(40, 3, -7); curve.receiveShadow = true; cyc.add(curve);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(200, 20), cycMat); wall.position.set(40, 13, -10); wall.receiveShadow = true; cyc.add(wall);
  scene.add(cyc);
  // lights: soft key (spot, wide penumbra), fill, rim, backdrop wash — in a rig moved to each study
  const rig = new THREE.Group(); scene.add(rig);
  const key = new THREE.SpotLight(0xfff2e6, 90, 30, 0.5, 0.9, 2); key.position.set(3.6, 5.2, 6.5); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0003; key.shadow.normalBias = 0.02; key.shadow.radius = 6; key.shadow.camera.near = 3; key.shadow.camera.far = 25;
  key.target.position.set(0, 0.9, 0); rig.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xcad8ff, 1.1); rim.position.set(-4, 5, -6); rim.target.position.set(0, 1, 0); rig.add(rim, rim.target);
  const fill = new THREE.HemisphereLight(0xc4ccd8, 0x302a24, 0.75); scene.add(fill);
  const fillF = new THREE.DirectionalLight(0xffeedd, 0.35); fillF.position.set(-2, 1.6, 6); fillF.target.position.set(0, 1, 0); rig.add(fillF, fillF.target);
  const wash = new THREE.SpotLight(0xd8dde6, 60, 40, 0.8, 1.0, 2); wash.position.set(0, 6, 4); wash.target.position.set(0, 2, -8); rig.add(wash, wash.target);
  const t0 = performance.now();
  if (cast) { const r = await cast.preloadCharacters(cast.CAST_CODES); console.log('preloaded from cache', JSON.stringify(r), (performance.now() - t0).toFixed(0), 'ms'); }
  const figs = [];
  const codes = cast ? cast.CAST_CODES : ['X'];
  const n = codes.length;
  const spacing = 0.78;
  const getFig = (i) => {
    if (figs[i]) return figs[i];
    const tt = performance.now();
    const f = cast ? cast.makeCharacter(codes[i], { lod: 'hi' }) : makeFigure({ sex: 'f', height: 1.62, age: 28, skin: 0xd6ab90, hair: { style: 'low_bun' } });
    console.log('built', codes[i], (performance.now() - tt).toFixed(0), 'ms', JSON.stringify(f.G.tris));
    f.root.position.set((i - (n - 1) / 2) * spacing, 0, 0); f.pose('stand', { weight: (i % 3 - 1) * 0.5 }); scene.add(f.root);
    figs[i] = f; return f;
  };
  // pose study group (x offset 20 m)
  const poseGroup = new THREE.Group(); poseGroup.position.set(20, 0, 0); scene.add(poseGroup);
  const pFigs = [];
  const buildPoses = () => {
  if (pFigs.length || !cast) return;
  {
    const chair = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.44), new THREE.MeshStandardMaterial({ color: 0x5a4434, roughness: 0.6 }));
    chair.position.set(-1.6, 0.23, -0.05); chair.castShadow = chair.receiveShadow = true; poseGroup.add(chair);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.04), chair.material); back.position.set(-1.6, 0.7, -0.27); back.castShadow = true; poseGroup.add(back);
    const g = cast.makeCharacter('GUARD'); g.root.position.set(-1.6, 0, 0.0); g.pose('sit_chair', { seat: 0.46 }); poseGroup.add(g.root); pFigs.push(g);
    const m = cast.makeCharacter('MOTHER'); m.root.position.set(-0.4, 0, 0); m.pose('pray_kneel', {}); poseGroup.add(m.root); pFigs.push(m);
    const r = cast.makeCharacter('RESTORER'); r.root.position.set(0.9, 0, 0); r.root.rotation.y = -0.5; r.pose('stand'); poseGroup.add(r.root); pFigs.push(r);
    const tgt = new THREE.Vector3(1.12, 1.3, 0.42);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.2, 0.01), new THREE.MeshPhysicalMaterial({ color: 0xaabbcc, roughness: 0.05, transmission: 0, transparent: true, opacity: 0.18 }));
    pane.position.set(1.2, 1.2, 0.47); pane.rotation.y = -0.5; poseGroup.add(pane);
    r._reachTarget = tgt;
  }
  };

  // pose study 2 (x offset 80 m): walk, bench, phone, tea, patch
  const pose2 = new THREE.Group(); pose2.position.set(80, 0, 0); scene.add(pose2);
  const p2 = {};
  const buildPoses2 = () => {
    if (p2.done || !cast) return; p2.done = true;
    const wood = new THREE.MeshStandardMaterial({ color: 0x5a4434, roughness: 0.6 });
    const bench = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.4), wood); bench.position.set(0.0, 0.42, -0.02); bench.castShadow = bench.receiveShadow = true; pose2.add(bench);
    const bb = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.45, 0.05), wood); bb.position.set(0, 0.72, -0.24); bb.castShadow = true; pose2.add(bb);
    p2.mother = cast.makeCharacter('MOTHER'); p2.mother.root.position.set(-0.35, 0, 0); pose2.add(p2.mother.root);
    p2.lonely = cast.makeCharacter('LONELY'); p2.lonely.root.position.set(0.35, 0, 0); pose2.add(p2.lonely.root);
    p2.walkers = [0, 0.25, 0.5].map((ph, i) => { const f = cast.makeCharacter('MIGRANT'); f.root.position.set(-2.6 + i * 0.75, 0, 0.3); f.root.rotation.y = Math.PI / 2; f._ph = ph; pose2.add(f.root);
      const cs = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.58, 0.38), new THREE.MeshStandardMaterial({ color: 0xa8783f, roughness: 0.7 })); cs.position.set(0, 0, 0.21); const holder = new THREE.Group(); holder.add(cs); f.hold('R', holder, { socket: 'grip', grip: ['rattan'] }); f._case = holder; return f; });
    const stool = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 0.4), wood); stool.position.set(2.3, 0.225, -0.02); stool.castShadow = stool.receiveShadow = true; pose2.add(stool);
    p2.guard = cast.makeCharacter('GUARD'); p2.guard.root.position.set(2.6, 0, 0); pose2.add(p2.guard.root);
    p2.rest = cast.makeCharacter('RESTORER', { gloves: false }); p2.rest.root.position.set(2.0, 0, 0); pose2.add(p2.rest.root);
    p2.phone = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.14, 0.009), new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.3, emissive: 0x334455, emissiveIntensity: 0.6 }));
    p2.cup = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.031, 0.075, 28), new THREE.MeshStandardMaterial({ color: 0xedf1ef, roughness: 0.25 }));
    p2.wife = cast.makeCharacter('WIFE'); p2.wife.root.position.set(-1.2, 0, 2.0); p2.wife.root.rotation.y = 0.9; pose2.add(p2.wife.root);
    const st2 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.4), wood); st2.position.set(-1.2 - Math.sin(0.9) * 0.02, 0.225, 2.0 - Math.cos(0.9) * 0.02); st2.rotation.y = 0.9; pose2.add(st2);
    p2.mom2 = cast.makeCharacter('MOTHER'); p2.mom2.root.position.set(-0.4, 0, 2.0); p2.mom2.root.rotation.y = 1.4; pose2.add(p2.mom2.root);
    const st3 = st2.clone(); st3.position.set(-0.4 - Math.sin(1.4) * 0.02, 0.225, 2.0 - Math.cos(1.4) * 0.02); st3.rotation.y = 1.4; pose2.add(st3);
    p2.nav = cast.makeCharacter('NAVIGATOR'); p2.nav.root.position.set(4.0, 0, 0.1); p2.nav.root.rotation.y = -0.4; pose2.add(p2.nav.root);
  };
  const poses2 = (T) => {
    buildPoses2(); if (!p2.mother) return;
    p2.mother.pose('pray_sit', { seat: 0.45 });
    p2.lonely.pose('sit_bench', { seat: 0.45, hands: 'lap' });
    p2.wife.pose('sit_chair', { seat: 0.45 }); p2.mom2.pose('sit_chair', { seat: 0.45 });
    for (const f of p2.walkers) f.pose('walk', { phase: f._ph });
    p2.guard.pose('sit_bench', { seat: 0.45, lean: 0.3, hands: 'none' });
    p2.guard.hold('R', p2.phone, { socket: 'palm', grip: ['cupped'] });
    p2.guard.reach('R', p2.guard.root.localToWorld(new THREE.Vector3(-0.05, 0.92, 0.32)), { palm: new THREE.Vector3(0, 0.75, -0.6), fingers: new THREE.Vector3(0.3, 0.3, 0.9) });
    p2.guard.reach('L', p2.guard.root.localToWorld(new THREE.Vector3(0.12, 0.62, 0.3)), {});
    p2.guard.lookAt(p2.phone.getWorldPosition(new THREE.Vector3()));
    p2.rest.pose('sit_bench', { seat: 0.45, hands: 'none' });
    p2.rest.hold('L', p2.cup, { socket: 'cup', grip: ['hold_cup'] });
    p2.rest.reach('L', p2.rest.root.localToWorld(new THREE.Vector3(0.05, 0.78, 0.3)), { palm: new THREE.Vector3(-1, 0, 0), fingers: new THREE.Vector3(0, 0, 1) });
    p2.rest.reach('R', p2.rest.root.localToWorld(new THREE.Vector3(-0.02, 0.75, 0.36)), { palm: new THREE.Vector3(1, 0.2, 0), fingers: new THREE.Vector3(0, 0, 1) });
    p2.rest.lookAt(p2.guard.eye());
    // navigator: left fingers on the inside of the right cuff
    p2.nav.pose('stand');
    p2.nav.reach('R', p2.nav.root.localToWorld(new THREE.Vector3(-0.05, 1.05, 0.32)), { palm: new THREE.Vector3(0.2, 1, 0.2), fingers: new THREE.Vector3(0.6, 0, 0.7) });
    const cuff = p2.nav.worldPos('armR.hand').add(p2.nav.root.localToWorld(new THREE.Vector3(0, 0, 0)).multiplyScalar(0)).add(new THREE.Vector3(0.03, -0.01, 0.0));
    p2.nav.reach('L', cuff, { fingers: new THREE.Vector3(-1, -0.2, 0.2) });
    p2.nav.hands.L.pose('touch');
    p2.nav.lookAt(cuff);
  };
  // hand study group (x offset 40 m)
  const handGroup = new THREE.Group(); handGroup.position.set(40, 0, 0); scene.add(handGroup);
  const hands = [];
  const buildHands = () => {
  if (hands.length) return;
  const mkH = (o, pos, fd, pn, pose, pp) => { const h = makeHand(o); h.placeWrist(pos, fd, pn); h.pose(pose, pp || {}); handGroup.add(h.root); hands.push(h); return h; };
  mkH({ side: 'R', lod: 'close', variant: 'glove' }, [-0.33, 0.25, 0], [0.1, -1, 0.05], [0, 0, -1], 'wipe');
  mkH({ side: 'L', lod: 'close', variant: 'salt', sex: 'm', age: 0.5, skin: 0xa77a5e, cuffs: [{ style: 'rolled', color: 0x25385a, fabric: 'indigo', radius: 0.046, detail: [{ type: 'patch', color: 0x5f84ad }] }] }, [-0.11, 0.25, 0], [0, -1, 0], [0, 0, 1], 'flat_on_glass');
  const hc = mkH({ side: 'R', lod: 'close', age: 0.2, skin: 0xd8ad92 }, [0.11, 0.25, 0], [0, -1, 0.0], [1, 0, 0.0], 'grip', { radius: 0.017 });
  { const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.14, 24), new THREE.MeshStandardMaterial({ color: 0x9b7a4a, roughness: 0.7 })); handle.castShadow = true; hc.hold(handle, 'grip'); }
  mkH({ side: 'L', lod: 'close', age: 0.75, sex: 'm', skin: 0xc9a084, cuffs: [{ style: 'band', color: 0x23283a, fabric: 'serge', radius: 0.04 }] }, [0.33, 0.25, 0], [0, -1, 0], [0, 0, -1], 'relaxed');
  };

  const headGroup = new THREE.Group(); headGroup.position.set(60, 0, 0); scene.add(headGroup);
  const heads = [];
  const buildHeads = () => {
    if (heads.length) return;
    const defs = [
      { sex: 'f', age: 28, hair: { style: 'ponytail', color: 0x2a211c, strands: 'R' }, skin: 0xe3bfa0 },
      { sex: 'm', age: 65, hair: { style: 'short', color: 0x8e8c88, grey: 0.55, thickness: 0.04, hairline: 0.66 }, skin: 0xc99a78 },
      { sex: 'm', age: 35, hair: { style: 'headcloth', color: 0x263650, topknot: true }, skin: 0xa26f4c },
      { sex: 'f', age: 30, hair: { style: 'low_bun', color: 0x1e1a18 }, skin: 0xd8ae8c },
      { sex: 'f', age: 20, hair: { style: 'braid', color: 0x1c1816, bangs: 0.35 }, skin: 0xddb392 },
      { sex: 'm', age: 15, hair: { style: 'cap', color: 0x4e4a44 }, skin: 0xd2a47f },
    ];
    defs.forEach((d, i) => { const f = makeFigure({ ...d, lod: 'hi', costume: [] }); f.root.position.set((i - 2.5) * 0.55, 0, 0); f.pose('stand'); headGroup.add(f.root); heads.push(f); });
  };
  const views = {
    POSES2: (tl, u, T) => { poses2(T); cam.place(camera, [80.7, 1.25, 6.2], [80.7, 0.75, 0]); cam.lens(camera, 32); return { dof: null }; },
    BENCH: (tl, u, T) => { poses2(T); cam.place(camera, [80.3, 1.0, 2.6], [80.0, 0.8, 0]); cam.lens(camera, 40); return { dof: null }; },
    TEA: (tl, u, T) => { poses2(T); cam.place(camera, [82.1, 1.0, 1.9], [82.3, 0.85, 0]); cam.lens(camera, 45); return { dof: null }; },
    PATCH: (tl, u, T) => { poses2(T); cam.place(camera, [84.5, 1.25, 1.4], [84.0, 1.0, 0.2]); cam.lens(camera, 50); return { dof: null }; },
    SIT: (tl, u, T) => { poses2(T); cam.place(camera, [79.4, 0.9, 4.6], [79.2, 0.55, 2.0]); cam.lens(camera, 45); return { dof: null }; },
    APOSE: () => { buildHeads(); heads.forEach((f, i) => f.pose(i % 2 ? 'apose' : 'stand')); cam.place(camera, [60, 0.95, 6.2], [60, 0.85, 0]); cam.lens(camera, 32); return { dof: null }; },
    HEADS: () => { buildHeads(); heads.forEach((f) => f.pose('stand')); const e = heads[0].eye(); cam.place(camera, [60, e.y + 0.05, 3.3], [60, e.y - 0.08, 0]); cam.lens(camera, 50); return { dof: null }; },
    HEADS3Q: () => { buildHeads(); heads.forEach((f) => f.pose('stand')); const e = heads[0].eye(); cam.place(camera, [62.2, e.y + 0.1, 2.4], [60, e.y - 0.08, 0]); cam.lens(camera, 50); return { dof: null }; },
    CAST: () => { for (let i = 0; i < n; i++) getFig(i); const w = n * spacing; cam.place(camera, [0, 1.05, w * 1.12 + 1.5], [0, 0.88, 0]); cam.lens(camera, 40); return { dof: null }; },
    CAST_A: () => { for (let i = 0; i < 6; i++) getFig(i); const cx = -((n - 1) / 2) * spacing + 2 * spacing; cam.place(camera, [cx, 1.0, 5.2], [cx, 0.86, 0]); cam.lens(camera, 40); return { dof: null }; },
    CAST_B: () => { for (let i = 6; i < n; i++) getFig(i); const cx = ((n - 1) / 2) * spacing - 2 * spacing; cam.place(camera, [cx, 1.0, 5.2], [cx, 0.86, 0]); cam.lens(camera, 40); return { dof: null }; },
    POSES: () => { buildPoses(); cam.place(camera, [20.2, 1.15, 5.0], [20.0, 0.8, 0]); cam.lens(camera, 40); return { dof: null }; },
    HANDS: () => { buildHands(); cam.place(camera, [40, 0.2, 1.75], [40, 0.17, 0]); cam.lens(camera, 85); return { dof: { focus: 1.75, fstop: 8 } }; },
  };
  return {
    scene, camera, post: { exposure: 1.0, vignette: 0.22, grain: 0.02, saturation: 0.95 },
    setShot(shot, tl, u, T) {
      const id = shot.id;
      rig.position.x = id === 'SIT' || id === 'POSES2' || id === 'BENCH' || id === 'TEA' || id === 'PATCH' ? 80.7 : id.startsWith('POSES') ? 20 : id.startsWith('HANDS') ? 40 : (id.startsWith('HEADS') || id === 'APOSE') ? 60 : 0;
      if (shot.id === 'POSES') buildPoses();
      const r = pFigs[2];
      if (r && shot.id === 'POSES') { r.pose('stand'); r.reach('R', r._reachTarget.clone().add(poseGroup.position), { palm: new THREE.Vector3(0.45, 0, 0.9), fingers: new THREE.Vector3(0, 1, 0) }); r.pose && 0; r.hands.R && r.hands.R.pose('flat_on_glass'); r.lookAt(r._reachTarget.clone().add(poseGroup.position)); }
      let m = /^FIG(\d+)$/.exec(shot.id);
      if (m) { const f = getFig(+m[1]); const p = f.root.position; cam.place(camera, [p.x + 0.6, 1.05, 5.0], [p.x, 0.86, 0]); cam.lens(camera, 40); return { dof: null }; }
      m = /^MID(\d+)$/.exec(shot.id);
      if (m) { const f = getFig(+m[1]); const p = f.root.position; const e = f.eye(); cam.place(camera, [p.x + 0.5, e.y - 0.02, 2.6], [p.x, e.y - 0.3, 0]); cam.lens(camera, 50); return { dof: null }; }
      m = /^FACE(\d+)$/.exec(shot.id);
      if (m) { const f = getFig(+m[1]); const e = f.eye(); cam.place(camera, [e.x + 0.45, e.y + 0.03, e.z + 1.1], [e.x, e.y - 0.06, e.z]); cam.lens(camera, 75); return { dof: { focus: 1.19, fstop: 5.6 } }; }
      m = /^BACK(\d+)$/.exec(shot.id);
      if (m) { const f = getFig(+m[1]); const p = f.root.position; cam.place(camera, [p.x - 1.2, 1.15, -4.6], [p.x, 0.86, 0]); cam.lens(camera, 40); return { dof: null }; }
      return (views[shot.id] || views.CAST)(tl, u, T);
    },
  };
}
