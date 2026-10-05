// Museum vitrine glass — the film's central device ("the reflection in the glass shows the past").
//
//   const g = glassMaterial({ nested: tex, nestedMode: 'screen', nestedStrength: 0.8, wipe: { points: [[0.2,0.4],[0.5,0.55],[0.8,0.45]], width: 0.12 }, res: [ctx.W, ctx.H] });
//   g.setWipe(progress01); g.setNested(texture | null, strength);
//   const v = vitrine({ w: 0.7, d: 0.7, h: 0.55, front: { nested: rt.texture, wipe: {...} } }); scene.add(v.object3D);
//   v.deckY → world-local height of the display deck (put the compass there); v.update(T)
//
// Glass shading = MeshStandardMaterial (black, glossy) so it gets real env (scene.environment) + light reflections,
// composited premultiplied: out = reflection + nested + haze + dst · (1 − absorption). Nested texture (another era's
// night, from ctx.renderNested) is mapped in screen space (matches the camera, best for "looking through" reflections)
// or pane UV ('plane', moves with the glass, with view parallax). Mask = procedural wipe stroke and/or a mask map.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { glassSmudge, noiseTexture, cotton, brass, velvet, spriteTexture } from './textures.js';

const COL = (c) => (c && c.isColor ? c.clone() : new THREE.Color(c));

export function glassMaterial(o = {}) {
  const p = {
    reflect: 1.0, envMapIntensity: 1.0, absorb: 0.035, haze: 0.35, dust: 0.25, hazeColor: 0x9aa4b4, hazeLevel: 0.025,
    edge: 0.6, edgeWidth: 0.01, edgeTint: 0x8fc0aa, smudgeRepeat: [1, 1], seed: 18,
    nested: null, nestedMode: 'screen', nestedStrength: 0.7, nestedTint: 0xffffff, nestedScale: [1, 1], nestedOffset: [0, 0], parallax: 0.0,
    nestedFresnel: 0.6, maskOnlyNested: true, mask: null, wipe: null, wipeClean: 0.85, edgeSoft: 0.06, aspect: 1, res: [1280, 536], side: THREE.FrontSide,
    ...o,
  };
  const smudge = glassSmudge({ seed: p.seed });
  const m = new THREE.MeshStandardMaterial({
    color: 0x000000, roughness: 1, metalness: 0, roughnessMap: smudge.map, envMapIntensity: p.envMapIntensity,
    transparent: true, depthWrite: false, side: p.side,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor,
  });
  m.roughnessMap.repeat.set(p.smudgeRepeat[0], p.smudgeRepeat[1]);
  m.defines = { USE_UV: '' };
  const wp = Array.from({ length: 6 }, () => new THREE.Vector2()), wl = new Array(6).fill(0);
  const U = {
    uReflect: { value: p.reflect }, uAbsorb: { value: p.absorb }, uHazeAmt: { value: p.haze }, uDustAmt: { value: p.dust }, uHazeCol: { value: COL(p.hazeColor) }, uHazeLevel: { value: p.hazeLevel },
    uEdge: { value: p.edge }, uEdgeW: { value: p.edgeWidth }, uEdgeTint: { value: COL(p.edgeTint) }, uSmudge: { value: smudge.map }, uSmRep: { value: new THREE.Vector2(...p.smudgeRepeat) },
    uNested: { value: p.nested }, uHasNested: { value: p.nested ? 1 : 0 }, uNMode: { value: p.nestedMode === 'plane' ? 1 : 0 }, uNStr: { value: p.nestedStrength }, uNTint: { value: COL(p.nestedTint) },
    uNScale: { value: new THREE.Vector2(...p.nestedScale) }, uNOff: { value: new THREE.Vector2(...p.nestedOffset) }, uPar: { value: p.parallax }, uNFres: { value: p.nestedFresnel },
    uMaskOnly: { value: p.maskOnlyNested ? 1 : 0 }, uMask: { value: p.mask }, uHasMask: { value: p.mask ? 1 : 0 },
    uWipeN: { value: 0 }, uWipeP: { value: wp }, uWipeL: { value: wl }, uWipeProg: { value: 1 }, uWipeW: { value: 0.1 }, uWipeSoft: { value: 0.03 }, uWipeClean: { value: p.wipeClean },
    uEdgeSoft: { value: p.edgeSoft }, uAspect: { value: p.aspect }, uRes: { value: new THREE.Vector2(...p.res) }, uNoiseT: { value: noiseTexture() },
  };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.fragmentShader = /* glsl */ `
uniform float uReflect, uAbsorb, uHazeAmt, uDustAmt, uHazeLevel, uEdge, uEdgeW, uHasNested, uNMode, uNStr, uPar, uNFres, uMaskOnly, uHasMask;
uniform vec3 uHazeCol, uEdgeTint, uNTint; uniform sampler2D uSmudge, uNested, uMask, uNoiseT; uniform vec2 uSmRep, uNScale, uNOff, uRes;
uniform int uWipeN; uniform vec2 uWipeP[6]; uniform float uWipeL[6]; uniform float uWipeProg, uWipeW, uWipeSoft, uWipeClean, uEdgeSoft, uAspect;
float wipeMask(vec2 p){
  if (uWipeN < 2) return 0.0;
  vec2 sc = vec2(uAspect, 1.0); p *= sc;
  float total = uWipeL[5]; float lim = uWipeProg * total; float d = 1e9;
  for (int i = 1; i < 6; i++) {
    if (i >= uWipeN) break;
    float l0 = uWipeL[i - 1], l1 = uWipeL[i];
    if (l0 >= lim) break;
    vec2 a = uWipeP[i - 1] * sc, b = uWipeP[i] * sc;
    b = mix(a, b, clamp((lim - l0) / max(l1 - l0, 1e-5), 0.0, 1.0));
    vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-8), 0.0, 1.0);
    d = min(d, length(pa - ba * h));
  }
  float n = texture2D(uNoiseT, p * vec2(2.0, 9.0)).r - 0.5;
  return 1.0 - smoothstep(uWipeW - uWipeSoft, uWipeW + uWipeSoft, d + n * uWipeSoft * 2.0);
}
` + sh.fragmentShader.replace('#include <opaque_fragment>', /* glsl */ `
  vec3 Nv = normalize(normal);
  float NdV = clamp(abs(dot(Nv, geometryViewDir)), 0.0, 1.0);
  float fres = pow(1.0 - NdV, 5.0);
  vec4 sm = texture2D(uSmudge, vUv * uSmRep);
  float m = wipeMask(vUv);
  if (uHasMask > 0.5) m = max(m, texture2D(uMask, vUv).r);
  float e = min(min(vUv.x, 1.0 - vUv.x) * uAspect, min(vUv.y, 1.0 - vUv.y));
  float soft = smoothstep(0.0, uEdgeSoft, e);
  float haze = sm.r * uHazeAmt * (1.0 - m * uWipeClean);
  float dust = sm.b * uDustAmt * (1.0 - m * uWipeClean);
  vec3 nested = vec3(0.0);
  if (uHasNested > 0.5) {
    vec2 nuv = uNMode < 0.5 ? gl_FragCoord.xy / uRes : vUv;
    nuv = (nuv - 0.5) / uNScale + 0.5 + uNOff + geometryViewDir.xy * uPar;
    float inb = step(0.0, nuv.x) * step(nuv.x, 1.0) * step(0.0, nuv.y) * step(nuv.y, 1.0);
    vec3 nc = texture2D(uNested, clamp(nuv, 0.0, 1.0)).rgb * uNTint;
    float mk = uMaskOnly > 0.5 ? m : 1.0;
    nested = nc * uNStr * soft * inb * mk * mix(1.0, 0.35 + 1.6 * fres, uNFres);
  }
  float edgeA = (1.0 - smoothstep(0.0, uEdgeW, e)) * uEdge;
  // pane borders: the 6 mm edge of low-iron glass reads as a faint green-grey line (light trapped in the sheet) — enough
  // for an empty case to read in a dark gallery without becoming a drawn outline
  vec3 col = outgoingLight * uReflect + nested + uHazeCol * (haze + dust * 2.0) * uHazeLevel + uEdgeTint * edgeA * (uHazeLevel + 0.02) * (1.0 + 4.0 * fres);
  float alpha = clamp(uAbsorb + haze * 0.08 + dust * 0.15 + edgeA * 0.55, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
`);
  };
  m.customProgramCacheKey = () => 'vitrineGlass';
  const api = {
    material: m, uniforms: U,
    setNested(texv, strength) { U.uNested.value = texv; U.uHasNested.value = texv ? 1 : 0; if (strength !== undefined) U.uNStr.value = strength; },
    // wipe: { points: [[u,v],...] (≤6, pane UV), width (UV of pane height), soft, progress }
    setWipe(w, progress) {
      if (w && typeof w === 'object') {
        const pts = w.points.slice(0, 6); U.uWipeN.value = pts.length;
        let acc = 0; pts.forEach((q, i) => { wp[i].set(q[0], q[1]); if (i) acc += Math.hypot((q[0] - pts[i - 1][0]) * U.uAspect.value, q[1] - pts[i - 1][1]); wl[i] = acc; });
        for (let i = pts.length; i < 6; i++) wl[i] = acc;
        U.uWipeW.value = w.width ?? 0.1; U.uWipeSoft.value = w.soft ?? 0.03; if (w.progress !== undefined) U.uWipeProg.value = w.progress;
      }
      if (typeof w === 'number') U.uWipeProg.value = w;
      if (progress !== undefined) U.uWipeProg.value = progress;
    },
    set(k, v) { if (U[k]) { if (U[k].value && U[k].value.copy && v && v.isColor === undefined && Array.isArray(v)) U[k].value.set(...v); else U[k].value = v; } },
  };
  m.userData.glass = api;
  if (p.wipe) api.setWipe(p.wipe);
  return api;
}

// Vitrine: plinth (+ shadow-gap kick), linen display deck, 5 glass panes (front = +Z) in a thin bronze frame,
// interior light strip (+ optional SpotLight). Origin at floor centre.
export function vitrine(o = {}) {
  // bible LOC_GALLERY G1: 95 cm dark plinth + FRAMELESS low-iron glass hood 60×60×50 cm over near-black navy velvet #101A2A, one 3000 K pin spot.
  // frame: 0 → frameless (silicone-bonded edges, green edge tint does the work); deck: 'velvet' | cotton tone name
  const p = { w: 0.6, d: 0.6, h: 0.5, plinthH: 0.95, frame: 0, plinthColor: 0x16191f, deck: 'velvet', light: 'spot', lightColor: 0xffd8a8, lightIntensity: 2.5, pinSpot: null,
    spotAngle: 0.7, castShadow: false, glass: {}, front: {}, res: [1280, 536], seed: 1, ...o };
  const grp = new THREE.Group(); grp.name = 'vitrine';
  const plinthM = new THREE.MeshStandardMaterial({ color: p.plinthColor, roughness: 0.62, metalness: 0.0 });
  const plinth = new THREE.Mesh(new RoundedBoxGeometry(p.w, p.plinthH - 0.06, p.d, 3, 0.008), plinthM);
  plinth.position.y = 0.06 + (p.plinthH - 0.06) / 2; plinth.castShadow = plinth.receiveShadow = true; grp.add(plinth);
  const kick = new THREE.Mesh(new THREE.BoxGeometry(p.w - 0.05, 0.06, p.d - 0.05), new THREE.MeshStandardMaterial({ color: 0x07080a, roughness: 0.9 }));
  kick.position.y = 0.03; grp.add(kick);
  let deckM;
  if (p.deck === 'velvet') { const vv = velvet({ seed: p.seed + 40 }); deckM = new THREE.MeshPhysicalMaterial({ map: vv.map, normalMap: vv.normalMap, roughness: 0.9, sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(0x4a5a7a) }); }
  else { const lin = cotton({ tone: p.deck, threads: 140, creases: 0.05, seed: p.seed + 40 }); deckM = new THREE.MeshStandardMaterial({ map: lin.map, normalMap: lin.normalMap, roughnessMap: lin.roughnessMap, roughness: 1, normalScale: new THREE.Vector2(0.6, 0.6) }); }
  const deck = new THREE.Mesh(new THREE.BoxGeometry(p.w - 0.02, 0.02, p.d - 0.02), deckM);
  deck.position.y = p.plinthH + 0.01; deck.receiveShadow = true; grp.add(deck);
  const deckY = p.plinthH + 0.02;
  // frame (dark oxidised bronze)
  const br = brass({ tone: 'bronze', patina: 0.15, seed: p.seed + 3 });
  const frameM = new THREE.MeshStandardMaterial({ map: br.map, roughnessMap: br.roughnessMap, metalnessMap: br.metalnessMap, roughness: 1, metalness: 1, color: 0x8a7a66 });
  const f = p.frame, y0 = p.plinthH, y1 = p.plinthH + p.h;
  const bar = (sx, sy, sz, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), frameM); b.position.set(x, y, z); b.castShadow = true; grp.add(b); return b; };
  if (f > 0) {
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) bar(f, p.h, f, sx * (p.w / 2 - f / 2), (y0 + y1) / 2, sz * (p.d / 2 - f / 2));
    for (const y of [y0 + f / 2, y1 - f / 2]) { for (const sz of [-1, 1]) bar(p.w, f, f, 0, y, sz * (p.d / 2 - f / 2)); for (const sx of [-1, 1]) bar(f, f, p.d, sx * (p.w / 2 - f / 2), y, 0); }
  } else {
    // frameless hood: thin green-tinted glass edges (6 mm low-iron) + a dark seating channel on the plinth
    // (no emissive: a self-lit green edge reads as neon wire in a dark gallery; the edge is a dark green-black strip that
    // only brightens where it catches a real reflection)
    const edgeM = new THREE.MeshStandardMaterial({ color: 0x16211e, roughness: 0.08, metalness: 0.0, envMapIntensity: 2.4, transparent: true, opacity: 0.65, depthWrite: false });
    const e = 0.005;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(e, p.h, e), edgeM); b.position.set(sx * p.w / 2, (y0 + y1) / 2, sz * p.d / 2); grp.add(b); }
    for (const sz of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(p.w, e, e), edgeM); b.position.set(0, y1, sz * p.d / 2); grp.add(b); }
    for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(e, e, p.d), edgeM); b.position.set(sx * p.w / 2, y1, 0); grp.add(b); }
    const ch = new THREE.Mesh(new THREE.BoxGeometry(p.w + 0.012, 0.008, p.d + 0.012), new THREE.MeshStandardMaterial({ color: 0x050607, roughness: 0.5 })); ch.position.y = y0 + 0.004; grp.add(ch);
  }
  // glass panes
  const shared = glassMaterial({ ...p.glass, res: p.res, smudgeRepeat: [p.w / 0.6, p.h / 0.6], aspect: p.w / p.h });
  const frontG = glassMaterial({ ...p.glass, ...p.front, res: p.res, smudgeRepeat: [p.w / 0.6, p.h / 0.6], aspect: p.w / p.h, seed: (p.glass.seed || 18) + 1 });
  const sideG = glassMaterial({ ...p.glass, res: p.res, smudgeRepeat: [p.d / 0.6, p.h / 0.6], aspect: p.d / p.h, seed: 22 });
  const topG = glassMaterial({ ...p.glass, res: p.res, smudgeRepeat: [p.w / 0.6, p.d / 0.6], aspect: p.w / p.d, seed: 23 });
  const pane = (w, h, mat, pos, rotY = 0, rotX = 0) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat.material); m.position.copy(pos); m.rotation.set(rotX, rotY, 0, 'YXZ'); m.renderOrder = 60; grp.add(m); return m; };
  const cy = (y0 + y1) / 2;
  const panes = {
    front: pane(p.w, p.h, frontG, new THREE.Vector3(0, cy, p.d / 2)),
    back: pane(p.w, p.h, shared, new THREE.Vector3(0, cy, -p.d / 2), Math.PI),
    left: pane(p.d, p.h, sideG, new THREE.Vector3(-p.w / 2, cy, 0), -Math.PI / 2),
    right: pane(p.d, p.h, sideG, new THREE.Vector3(p.w / 2, cy, 0), Math.PI / 2),
    top: pane(p.w, p.d, topG, new THREE.Vector3(0, y1, 0), 0, -Math.PI / 2),
  };
  // interior light: 'strip' (emissive strip under the top-back edge + soft spot) | 'spot' (one 3000 K ceiling pin spot from above, bible G1) | 'none'
  const lc = COL(p.lightColor);
  let strip = null;
  if (p.light === 'strip') {
    strip = new THREE.Mesh(new THREE.BoxGeometry(p.w - 4 * Math.max(f, 0.01), 0.006, 0.012), new THREE.MeshBasicMaterial({ color: lc.clone().multiplyScalar(4) }));
    strip.position.set(0, y1 - f - 0.004, -p.d / 2 + f + 0.01); grp.add(strip);
  }
  let spot = null;
  // 'strip' is cheap by default (emissive strip + additive light-pool decal, no real light); stripSpot:true adds a SpotLight
  if (p.light === 'strip' || p.light === 'spot') {
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(p.w * 0.9, p.d * 0.9), new THREE.MeshBasicMaterial({ map: spriteTexture('soft'), color: lc.clone().multiplyScalar(p.light === 'spot' ? 0.05 : 0.12), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = deckY + 0.002; grp.add(pool);
  }
  if (p.light === 'spot' || (p.light === 'strip' && p.stripSpot)) {
    const pin = p.light === 'spot';
    spot = new THREE.SpotLight(lc, p.lightIntensity * (pin ? 6 : 1), 0, pin ? 0.11 : p.spotAngle, pin ? 0.55 : 0.85, 2);
    if (pin) { spot.position.set(0.15, 3.4, 0.35); spot.target.position.set(0, deckY + 0.06, 0); }
    else { spot.position.set(0, y1 - f - 0.01, -p.d * 0.25); spot.target.position.set(0, deckY, p.d * 0.05); }
    spot.castShadow = p.castShadow; if (p.castShadow) { spot.shadow.mapSize.set(1024, 1024); spot.shadow.bias = -0.0005; spot.shadow.camera.near = 0.05; spot.shadow.camera.far = 5; }
    grp.add(spot, spot.target);
  }
  return {
    object3D: grp, panes, glass: { front: frontG, back: shared, side: sideG, top: topG }, frontGlass: frontG, deckY, light: spot, strip, plinth, deck,
    setNested(texv, strength) { frontG.setNested(texv, strength); },
    setWipe(w, prog) { frontG.setWipe(w, prog); },
    update() {},
  };
}
