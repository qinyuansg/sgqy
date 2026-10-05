// figure_mat.js — materials for figures & hands: cloth (weave/fold bump, prints, wear, patch,
// seams, hem stitching), skin (pores, knuckle creases, palm lines, nails, salt crust, age),
// hair (strand grooves), leather. All detail is procedural in REST space (attributes restPos /
// restNrm / aux written by figure.js & hand.js), so patterns stick to skinned cloth and never swim.
// Bump is applied with screen-space derivatives (Mikkelsen) — no UVs or tangents needed.
import * as THREE from 'three';

const VERT_HEAD = /* glsl */`
attribute vec3 restPos; attribute vec3 restNrm; attribute vec4 aux;
varying vec3 vRest; varying vec3 vRestN; varying vec4 vAux;`;
const VERT_BODY = /* glsl */`
vRest = restPos; vRestN = restNrm; vAux = aux;`;

const FRAG_HEAD = /* glsl */`
varying vec3 vRest; varying vec3 vRestN; varying vec4 vAux;
float fzHash(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float fzNoise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(fzHash(i), fzHash(i + vec3(1,0,0)), f.x), mix(fzHash(i + vec3(0,1,0)), fzHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(fzHash(i + vec3(0,0,1)), fzHash(i + vec3(1,0,1)), f.x), mix(fzHash(i + vec3(0,1,1)), fzHash(i + vec3(1,1,1)), f.x), f.y), f.z) * 2.0 - 1.0; }
float fzFbm(vec3 p){ return 0.5 * fzNoise(p) + 0.25 * fzNoise(p * 2.03 + 3.1) + 0.125 * fzNoise(p * 4.01 + 7.7); }
// cellular (for salt crystals / speckle)
float fzCell(vec3 p){ vec3 i = floor(p); vec3 f = fract(p); float d = 8.0;
  for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
    vec3 g = vec3(float(x), float(y), float(z)); vec3 o = vec3(fzHash(i + g), fzHash(i + g + 17.3), fzHash(i + g + 41.9));
    vec3 r = g + o - f; d = min(d, dot(r, r)); }
  return sqrt(d); }
// fade factor for a feature of period P (m) given pixel footprint fw (m/px)
float fzAA(float P, float fw){ return 1.0 - smoothstep(0.35, 0.9, fw * 2.2 / P); }
vec3 fzTriW(vec3 n){ vec3 w = pow(abs(n), vec3(4.0)); return w / (w.x + w.y + w.z + 1e-5); }
vec3 fzPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir){
  vec3 vSigmaX = dFdx(surf_pos); vec3 vSigmaY = dFdy(surf_pos); vec3 vN = surf_norm;
  vec3 R1 = cross(vSigmaY, vN); vec3 R2 = cross(vN, vSigmaX);
  float fDet = dot(vSigmaX, R1) * faceDir;
  vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
  return normalize(abs(fDet) * surf_norm - vGrad);
}`;

// Install procedural code into a MeshPhysicalMaterial.
// parts: {uniforms, head (glsl), color (glsl, may set float fzH (height, m) & fzR (rough mult)), key}
const QS = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams('');
const DEBUG_PLAIN = QS.get('figmat') === 'plain';
function install(mat, parts) {
  mat.userData.fzUniforms = parts.uniforms || {};
  if (DEBUG_PLAIN) return mat;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, mat.userData.fzUniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + VERT_HEAD)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_BODY);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FRAG_HEAD + (parts.head || ''))
      .replace('#include <color_fragment>', '#include <color_fragment>\n float fzH = 0.0; float fzR = 1.0; vec3 fzFw3 = fwidth(vRest); float fzFw = max(max(fzFw3.x, fzFw3.y), fzFw3.z);\n {\n' + (QS.get('figmat') === 'nocolor' ? '' : (parts.color || '')) + '\n }\n')
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = clamp(roughnessFactor * fzR, 0.04, 1.0);')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\n' + (QS.get('figmat') === 'nobump' || QS.get('figmat') === 'nocolor' ? '' : ' normal = fzPerturb(-vViewPosition, normal, vec2(dFdx(fzH), dFdy(fzH)), faceDirection);'));
  };
  mat.customProgramCacheKey = () => parts.key;
  return mat;
}

const col = (c) => (c instanceof THREE.Color ? c.clone() : new THREE.Color(c));

// ------------------------------------------------------------------------------------------
// CLOTH
// fabric: 'cotton' | 'indigo' | 'wool' | 'linen' | 'silk' | 'knit' | 'canvas' | 'serge'
// aux: x = wear mask, y = patch (0.5 isoline = patch edge), z = seam proximity (0 on seam), w = hem proximity (0 at edge)
// ------------------------------------------------------------------------------------------
const FABRIC = {
  cotton: { rough: 0.88, sheen: 0.45, sheenRough: 0.55, weave: 0.0011, wAmp: 0.00010, slub: 0.00012, fold: 0.0007, fuzz: 0.0 },
  indigo: { rough: 0.9, sheen: 0.55, sheenRough: 0.5, weave: 0.0016, wAmp: 0.00016, slub: 0.0002, fold: 0.0009, fuzz: 0.0, mottle: 0.16 },
  wool: { rough: 0.95, sheen: 0.9, sheenRough: 0.7, weave: 0.0018, wAmp: 0.00008, slub: 0.0001, fold: 0.0008, fuzz: 0.6 },
  serge: { rough: 0.8, sheen: 0.55, sheenRough: 0.45, weave: 0.0011, wAmp: 0.00010, slub: 0.00008, fold: 0.0007, fuzz: 0.1, twill: 1 },
  linen: { rough: 0.9, sheen: 0.35, sheenRough: 0.5, weave: 0.0013, wAmp: 0.00014, slub: 0.00025, fold: 0.0011, fuzz: 0.0 },
  silk: { rough: 0.5, sheen: 0.7, sheenRough: 0.3, weave: 0.0006, wAmp: 0.00004, slub: 0.00006, fold: 0.0006, fuzz: 0.0 },
  knit: { rough: 0.95, sheen: 0.7, sheenRough: 0.65, weave: 0.003, wAmp: 0.00025, slub: 0.0001, fold: 0.0006, fuzz: 0.4, rib: 1 },
  canvas: { rough: 0.92, sheen: 0.3, sheenRough: 0.6, weave: 0.0018, wAmp: 0.00018, slub: 0.0002, fold: 0.0008, fuzz: 0.0 },
};

let _clothId = 0;
export function clothMaterial(o = {}) {
  const fab = { ...(FABRIC[o.fabric || 'cotton'] || FABRIC.cotton), ...(o.fabricOverride || {}) };
  const base = col(o.color ?? 0x777777);
  const sheenCol = o.sheenColor !== undefined ? col(o.sheenColor) : base.clone().lerp(new THREE.Color(1, 1, 1), 0.35);
  const mat = new THREE.MeshPhysicalMaterial({
    color: base, roughness: o.roughness ?? fab.rough, metalness: 0,
    sheen: o.sheen ?? fab.sheen, sheenRoughness: fab.sheenRough, sheenColor: sheenCol,
    side: o.side ?? THREE.DoubleSide, vertexColors: !!o.vertexColors,
    envMapIntensity: o.envMapIntensity ?? 0.6,
  });
  mat.name = 'cloth_' + (o.fabric || 'cotton');
  const U = {
    uWeave: { value: fab.weave * (o.weaveScale || 1) }, uWAmp: { value: fab.wAmp * (o.detail ?? 1) },
    uSlub: { value: fab.slub * (o.detail ?? 1) }, uFold: { value: fab.fold * (o.fold ?? 1) },
    uFuzz: { value: fab.fuzz }, uMottle: { value: o.mottle ?? fab.mottle ?? 0.06 },
    uPatchColor: { value: col(o.patchColor ?? 0x3c5a7a) }, uWearColor: { value: o.wearColor !== undefined ? col(o.wearColor) : base.clone().lerp(new THREE.Color(0.8, 0.78, 0.74), 0.35) },
    uStitchColor: { value: o.stitchColor !== undefined ? col(o.stitchColor) : base.clone().multiplyScalar(0.7) },
    uInner: { value: o.innerShade ?? 0.55 },
    uPrint: { value: o.print || null }, uPrintScale: { value: o.printScale || 0.09 }, uPrintAmt: { value: o.print ? (o.printAmount ?? 1) : 0 },
    uFade: { value: o.faded ?? 0 }, uPatchInside: { value: o.patchInside ? 1 : 0 },
  };
  const twill = fab.twill ? 1 : 0, rib = fab.rib ? 1 : 0;
  const head = /* glsl */`
uniform float uWeave, uWAmp, uSlub, uFold, uFuzz, uMottle, uInner, uPrintScale, uPrintAmt, uFade, uPatchInside;
uniform vec3 uPatchColor, uWearColor, uStitchColor;
${o.print ? 'uniform sampler2D uPrint;' : ''}
float fzWeave2(vec2 q, float P){
  vec2 t = q / P;
  ${twill ? 'return sin(6.2831 * (t.x + t.y)) * 0.8 + 0.2 * sin(12.566 * t.x);' : rib ? 'return abs(sin(3.1416 * t.x)) * 1.4 - 0.7 + 0.25 * sin(6.2831 * t.y);' : 'return sin(6.2831 * t.x) * sin(6.2831 * t.y);'}
}
${o.print ? `vec4 fzPrint(vec3 p, vec3 n){ vec3 w = fzTriW(n); float s = 1.0 / uPrintScale;
  return w.x * texture2D(uPrint, p.zy * s) + w.y * texture2D(uPrint, p.xz * s) + w.z * texture2D(uPrint, p.xy * s); }` : ''}
`;
  const color = /* glsl */`
  vec3 rp = vRest; vec3 rn = vRestN;
  float wear = clamp(vAux.x, 0.0, 1.0);
  float patchM = smoothstep(0.47, 0.53, vAux.y) * (uPatchInside > 0.5 ? (gl_FrontFacing ? 0.0 : 1.0) : 1.0);
  float seam = vAux.z; float hem = vAux.w;
  // one low-frequency noise drives dye mottling and the fold micro-relief
  float n1 = fzNoise(rp * 11.0);
  diffuseColor.rgb *= 1.0 + n1 * uMottle;
  diffuseColor.rgb = mix(diffuseColor.rgb, vec3(dot(diffuseColor.rgb, vec3(0.3, 0.5, 0.2))) * 1.15, uFade);
  ${o.print ? 'vec4 pr = fzPrint(rp, rn); diffuseColor.rgb = mix(diffuseColor.rgb, pr.rgb, pr.a * uPrintAmt * (1.0 - patchM));' : ''}
  float wearN = 0.0;
  if (wear > 0.01) { // pilling, lightening
    wearN = wear * (0.65 + 0.35 * fzNoise(rp * 420.0));
    diffuseColor.rgb = mix(diffuseColor.rgb, uWearColor, smoothstep(0.1, 0.9, wearN) * 0.85);
  }
  if (vAux.y > 0.02) { // patch of different cloth with a running-stitch border
    vec3 pc = uPatchColor * (1.0 + 0.1 * n1);
    diffuseColor.rgb = mix(diffuseColor.rgb, pc, patchM);
    float edge = 1.0 - smoothstep(0.0, 0.06, abs(vAux.y - 0.5));
    float dash = step(0.0, sin((rp.x + rp.y + rp.z) * 2300.0));
    float stitch = edge * dash * fzAA(0.0027, fzFw);
    diffuseColor.rgb = mix(diffuseColor.rgb, uStitchColor, stitch * 0.8 * (uPatchInside > 0.5 ? (gl_FrontFacing ? 0.0 : 1.0) : 1.0));
  }
  float seamLine = 1.0 - smoothstep(0.0, 0.12, seam);
  diffuseColor.rgb *= 1.0 - 0.18 * seamLine;
  if (!gl_FrontFacing) diffuseColor.rgb *= mix(uInner, 0.85, patchM);
  // height field (metres): weave in the dominant projection plane (only when resolvable)
  float P = uWeave;
  float wv = 0.0;
  if (fzFw < P * 0.45) {
    vec3 an = abs(rn);
    vec2 q = (an.x > an.y && an.x > an.z) ? rp.zy : ((an.y > an.z) ? rp.xz : rp.xy);
    wv = fzWeave2(q, P) * uWAmp * fzAA(P, fzFw);
  }
  float fl = n1 * uFold * 0.9 * fzAA(0.05, fzFw);
  fzH = wv + fl;
  fzH *= 1.0 - 0.75 * smoothstep(0.2, 0.8, wearN);
  fzH -= seamLine * 0.0006 * fzAA(0.004, fzFw);
  float hs = 1.0 - smoothstep(0.0, 0.08, abs(hem - 0.33));
  fzH -= hs * 0.00025 * fzAA(0.003, fzFw) * step(0.001, hem);
  fzR = 1.0 + 0.08 * wearN - 0.05 * patchM;
  `;
  install(mat, { uniforms: U, head, color, key: `cloth_${o.fabric}_${twill}${rib}_${o.print ? 'p' : ''}_${o.vertexColors ? 'v' : ''}` });
  return mat;
}

// ------------------------------------------------------------------------------------------
// SKIN
// aux (hands): x = nail mask (0.5 isoline = nail edge), y = salt amount, z = joint coordinate
//              (m, signed, along finger axis from nearest joint), w = side (+1 dorsal, -1 palmar)
// aux (body/head): x = 0, y = salt, z = 0, w = 0
// age: 0 young … 1 old (wrinkles, spots, veins darker)
// ------------------------------------------------------------------------------------------
export function skinMaterial(o = {}) {
  const base = col(o.color ?? 0xd2a586);
  const mat = new THREE.MeshPhysicalMaterial({
    color: base, roughness: o.roughness ?? 0.6, metalness: 0,
    sheen: o.sheen ?? 0.22, sheenRoughness: 0.6, sheenColor: col(o.sheenColor ?? 0xb07060),
    specularIntensity: 0.5, envMapIntensity: o.envMapIntensity ?? 0.5,
    side: o.side ?? THREE.FrontSide, vertexColors: !!o.vertexColors,
  });
  mat.name = 'skin';
  const U = {
    uAge: { value: o.age ?? 0.2 }, uSalt: { value: o.salt ?? 0 }, uHand: { value: o.hand ? 1 : 0 },
    uNail: { value: col(o.nailColor ?? base.clone().lerp(new THREE.Color(0.95, 0.78, 0.74), 0.5)) },
    uSaltCol: { value: col(0xe9e6df) }, uDetail: { value: o.detail ?? 1 },
    uFlush: { value: col(o.flush ?? 0xc9705a) },
    uJC: { value: Array.from({ length: 15 }, (_, i) => new THREE.Vector3().fromArray(o.joints?.[i]?.c || [0, 9, 0])) },
    uJA: { value: Array.from({ length: 15 }, (_, i) => new THREE.Vector3().fromArray(o.joints?.[i]?.ax || [0, -1, 0])) },
    uJR: { value: Array.from({ length: 15 }, (_, i) => o.joints?.[i]?.r || 0) },
  };
  const head = /* glsl */`uniform float uAge, uSalt, uHand, uDetail; uniform vec3 uNail, uSaltCol, uFlush;
  uniform vec3 uJC[15]; uniform vec3 uJA[15]; uniform float uJR[15];
  float fzPalmLine(vec2 q, vec2 a, vec2 b, vec2 c){ // distance to quadratic bezier-ish polyline
    float d = 1.0; for (int i = 0; i < 8; i++) { float t0 = float(i) / 8.0, t1 = float(i + 1) / 8.0;
      vec2 p0 = mix(mix(a, b, t0), mix(b, c, t0), t0); vec2 p1 = mix(mix(a, b, t1), mix(b, c, t1), t1);
      vec2 pa = q - p0, ba = p1 - p0; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); d = min(d, length(pa - ba * h)); }
    return d; }`;
  const color = /* glsl */`
  vec3 rp = vRest;
  float side = vAux.w;
  float dors = smoothstep(0.1, 0.6, side), palm = smoothstep(-0.1, -0.6, side);
  float sv = fzNoise(rp * 40.0);
  diffuseColor.rgb *= 1.0 + 0.05 * sv;
  float nail = 0.0, wr = 0.0, crease = 0.0, palmLines = 0.0;
  if (uHand > 0.5) {
    nail = smoothstep(0.42, 0.58, vAux.x);
    float js = 0.02, isMcp = 0.0, bd = 1.0;
    for (int i = 0; i < 15; i++) { vec3 dj = rp - uJC[i]; float a = dot(dj, uJA[i]); float dd = dot(dj, dj);
      float rad = sqrt(max(dd - a * a, 0.0));
      if (rad < abs(uJR[i]) * 1.5 && abs(a) < 0.0085 && dd < bd) { bd = dd; js = a; isMcp = uJR[i] < 0.0 ? 1.0 : 0.0; } }
    float tipWarm = (1.0 - smoothstep(0.0, 0.012, abs(js))) * 0.25 * dors;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * uFlush * 1.35, tipWarm + palm * 0.18);
    diffuseColor.rgb *= 1.0 - smoothstep(0.55, 0.8, sv * 0.5 + 0.5) * uAge * dors * 0.12; // age spots
    diffuseColor.rgb = mix(diffuseColor.rgb, uNail, nail * 0.85);
    if (fzFw < 0.0009) { // knuckle wrinkles / creases / palm lines only resolve in close-ups
      float jw = js + fzNoise(rp * 700.0) * 0.00035;
      float env = 1.0 - smoothstep(0.0008, 0.0032 + 0.0015 * uAge, abs(jw));
      float dors2 = smoothstep(0.35, 0.9, side);
      wr = sin(jw * 6.2831 / (0.0019 + 0.0004 * uAge)) * env * dors2 * (0.000018 + 0.00005 * uAge) * fzAA(0.0019, fzFw);
      crease = (1.0 - smoothstep(0.0, 0.00055, abs(abs(js + 0.0004) - 0.0011))) * palm * (1.0 - isMcp) * 0.00009 * fzAA(0.0013, fzFw);
      if (palm > 0.01) {
        vec2 q = rp.zy;
        float pl = min(min(fzPalmLine(q, vec2(-0.034, -0.062), vec2(-0.005, -0.068), vec2(0.022, -0.080)),
                           fzPalmLine(q, vec2(0.030, -0.052), vec2(0.004, -0.048), vec2(-0.030, -0.040))),
                           fzPalmLine(q, vec2(0.028, -0.050), vec2(0.010, -0.030), vec2(0.012, -0.010)));
        float wristL = min(abs(rp.y + 0.006), abs(rp.y + 0.0005));
        pl = min(pl, wristL + step(0.022, abs(rp.z)));
        palmLines = (1.0 - smoothstep(0.0, 0.0009, pl)) * palm * step(-0.097, rp.y) * step(rp.y, 0.004) * 0.00014 * fzAA(0.0016, fzFw);
      }
    }
  }
  float saltA = 0.0, saltH = 0.0;
  if (uSalt > 0.01) { // dried salt: white patches (mid scale) + crystals (close)
    float saltM = clamp(vAux.y * uSalt, 0.0, 1.0);
    float patchS = smoothstep(0.58, 0.78, fzNoise(rp * 150.0) * 0.5 + 0.5 + 0.18 * (saltM - 0.5)) * saltM;
    float speck = 0.0;
    if (fzFw < 0.0012) {
      vec3 g = rp * 900.0; vec3 c = floor(g); vec3 f = fract(g) - 0.5;
      float hsh = fzHash(c); vec3 o = vec3(fzHash(c + 17.3), fzHash(c + 41.9), fzHash(c + 7.1)) - 0.5;
      speck = step(0.45, hsh) * (1.0 - smoothstep(0.12, 0.32, length(f - o * 0.5))) * fzAA(0.0016, fzFw);
    }
    saltA = clamp(patchS * 0.55 + speck * 0.9 * saltM, 0.0, 1.0);
    saltA = max(saltA, saltM * 0.08);
    diffuseColor.rgb = mix(diffuseColor.rgb, uSaltCol, saltA * 0.8);
    saltH = speck * 0.00008 * saltM + patchS * 0.00004 * fzAA(0.006, fzFw);
  }
  float pores = 0.0;
  if (fzFw < 0.00035) pores = fzNoise(rp * 2600.0) * 0.000018 * fzAA(0.0006, fzFw);
  float fine = 0.0;
  if (fzFw < 0.001) fine = fzNoise(rp * vec3(700.0, 300.0, 700.0)) * 0.00003 * (0.4 + uAge) * fzAA(0.002, fzFw);
  fzH = (pores + fine + wr - crease - palmLines) * uDetail * (1.0 - nail * 0.9) + saltH;
  fzR = mix(1.0, 0.45, nail) * (1.0 + saltA * 0.5) * (1.0 + 0.08 * uAge);
  `;
  install(mat, { uniforms: U, head, color, key: 'skin_' + (o.vertexColors ? 'v' : '') });
  return mat;
}

// ------------------------------------------------------------------------------------------
// HAIR — sculpted mass with strand grooves flowing from the crown (uCrown, rest space) toward
// uFlow target (e.g. bun / nape). aux unused.
// ------------------------------------------------------------------------------------------
export function hairMaterial(o = {}) {
  const base = col(o.color ?? 0x17120f);
  const mat = new THREE.MeshPhysicalMaterial({
    color: base, roughness: o.roughness ?? 0.48, metalness: 0,
    sheen: 0.6, sheenRoughness: 0.35, sheenColor: base.clone().lerp(new THREE.Color(0.6, 0.5, 0.42), 0.4),
    specularIntensity: 0.7, specularColor: new THREE.Color(0.85, 0.78, 0.7), envMapIntensity: 0.5,
  });
  mat.name = 'hair';
  const U = { uCrown: { value: new THREE.Vector3().fromArray(o.crown || [0, 1.7, -0.03]) }, uGrey: { value: o.grey ?? 0 } };
  const head = 'uniform vec3 uCrown; uniform float uGrey;';
  const color = /* glsl */`
  vec3 rp = vRest - uCrown;
  // strand coordinate: azimuth around the crown axis (scaled to arc length) + small warp
  float r = length(rp.xz) + 1e-4;
  float az = atan(rp.x, rp.z);
  float warp = fzNoise(vRest * 18.0) * 0.6;
  float sc = (az + warp * 0.05) * (0.08 + r * 0.6);
  float n1 = fzNoise(vRest * 30.0);
  float clump = sin(sc * 6.2831 / 0.006 + n1 * 1.5) * 0.00035 * fzAA(0.006, fzFw);
  float strand = 0.0;
  if (fzFw < 0.0006) strand = sin(sc * 6.2831 / 0.0011 + n1 * 6.0) * 0.00006 * fzAA(0.0011, fzFw);
  fzH = clump + strand + n1 * 0.0008;
  float g = uGrey > 0.0 ? smoothstep(0.4, 0.9, fract(sin(dot(floor(vec2(sc, vRest.y) * vec2(700.0, 40.0)), vec2(12.9898, 78.233))) * 43758.5453)) * uGrey : 0.0;
  diffuseColor.rgb = mix(diffuseColor.rgb * (1.0 + 0.25 * n1), vec3(0.62, 0.6, 0.58), g);
  fzR = 1.0 + 0.25 * n1;
  `;
  install(mat, { uniforms: U, head, color, key: 'hair' });
  return mat;
}

// LEATHER / generic matte-gloss solid with fine grain
export function leatherMaterial(o = {}) {
  const mat = new THREE.MeshPhysicalMaterial({ color: col(o.color ?? 0x2a211c), roughness: o.roughness ?? 0.45, metalness: 0, clearcoat: o.clearcoat ?? 0.15, clearcoatRoughness: 0.5, envMapIntensity: 0.7, side: o.side ?? THREE.FrontSide });
  mat.name = 'leather';
  const color = /* glsl */`
  float n1 = fzNoise(vRest * 45.0);
  fzH = n1 * 0.0002 + (fzFw < 0.0005 ? fzNoise(vRest * 1800.0) * 0.00002 * fzAA(0.0008, fzFw) : 0.0);
  diffuseColor.rgb *= 1.0 + 0.08 * n1;
  fzR = 1.0 + 0.2 * n1;
  `;
  install(mat, { uniforms: {}, color, key: 'leather' });
  return mat;
}

// Simple matte material with vertex colours for crowd extras (cheap: no sheen, standard).
export function extraMaterial(o = {}) {
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, envMapIntensity: 0.4 });
  mat.name = 'extra';
  return mat;
}

// ------------------------------------------------------------------------------------------
// Print textures (canvas, deterministic). floralPrint({ground, colors:[...], density})
// ------------------------------------------------------------------------------------------
export function floralPrint(o = {}) {
  const N = o.size || 256;
  if (typeof OffscreenCanvas === 'undefined' && typeof document === 'undefined') return null; // node (bake): no canvas
  const cv = (typeof OffscreenCanvas !== 'undefined') ? new OffscreenCanvas(N, N) : document.createElement('canvas');
  cv.width = N; cv.height = N;
  const g = cv.getContext('2d');
  g.clearRect(0, 0, N, N);
  let s = o.seed || 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const colors = o.colors || ['#c9867a', '#e4cfa0', '#8aa39a'];
  const leaf = o.leaf || '#7d927c';
  const n = o.count || 14;
  const drawFlower = (x, y, r, c) => {
    for (const dx of [-N, 0, N]) for (const dy of [-N, 0, N]) {
      const X = x + dx, Y = y + dy;
      if (X < -r * 3 || X > N + r * 3 || Y < -r * 3 || Y > N + r * 3) continue;
      // leaves
      g.fillStyle = leaf; g.globalAlpha = 0.75;
      for (let k = 0; k < 2; k++) { const a = rnd() * 6.283; g.beginPath(); g.ellipse(X + Math.cos(a) * r * 1.5, Y + Math.sin(a) * r * 1.5, r * 0.9, r * 0.38, a, 0, 6.283); g.fill(); }
      g.fillStyle = c; g.globalAlpha = 0.92;
      const a0 = rnd() * 6.283;
      for (let p = 0; p < 5; p++) { const a = a0 + p * 1.2566; g.beginPath(); g.ellipse(X + Math.cos(a) * r * 0.62, Y + Math.sin(a) * r * 0.62, r * 0.58, r * 0.42, a, 0, 6.283); g.fill(); }
      g.fillStyle = '#efe2c4'; g.globalAlpha = 0.9; g.beginPath(); g.arc(X, Y, r * 0.24, 0, 6.283); g.fill();
    }
  };
  for (let i = 0; i < n; i++) drawFlower(rnd() * N, rnd() * N, N * (0.035 + rnd() * 0.03), colors[i % colors.length]);
  // tiny dots
  g.globalAlpha = 0.6; g.fillStyle = o.dot || '#efe6d2';
  for (let i = 0; i < n * 3; i++) { g.beginPath(); g.arc(rnd() * N, rnd() * N, N * 0.006, 0, 6.283); g.fill(); }
  g.globalAlpha = 1;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

// Material from a serialisable descriptor {kind:'cloth'|'leather'|'hair', o:{...}} (used by baked geometry)
export function materialFromDesc(d) {
  if (!d) return clothMaterial({});
  if (d.kind === 'leather') return leatherMaterial(d.o);
  if (d.kind === 'hair') return hairMaterial(d.o);
  if (d.kind === 'skin') return skinMaterial(d.o);
  const o = { ...d.o };
  if (o.print && !o.print.isTexture) o.print = floralPrint(o.print);
  if (!o.print) delete o.print;
  return clothMaterial(o);
}
