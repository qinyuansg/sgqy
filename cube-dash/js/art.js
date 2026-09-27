// ─────────────────────────────────────────────────────────────
// CUBE DASH — shared character art
//   • roundedBoxGeometry  — soft "clay toy" cube used by every character
//   • createCubeMaterial  — toon/clay shader that draws the FACE procedurally
//                           (eyes, highlights, blush, brows, mouth, dizzy
//                           spirals…) so faces stay crisp at any size and a
//                           whole crowd renders in ONE instanced draw call.
//   • BlobShadows         — instanced soft contact shadows (Nintendo-style
//                           readability: you always know where a cube is)
// ─────────────────────────────────────────────────────────────
import * as THREE from 'three';

// Face expressions understood by the shader (aFace.x / uFace.x)
export const EXPR = {
  HAPPY: 0,     // hero default: big glossy eyes + open smile
  ANGRY: 1,     // red cubes: slanted brows, shouting mouth
  DIZZY: 2,     // spiral eyes, wobbly mouth
  HURT: 3,      // > <  squint
  JOY: 4,       // ^ ^  (freed cubes, victory)
  CHARGE: 5,    // angry + glowing eyes (about to dash / explode)
  FOCUS: 6,     // hero determined (dashing): narrowed eyes, small grin
  SLEEP: 7,     // – –  (menus, idle)
};

// ---------- geometry ----------
const geoCache = new Map();
/** Unit cube (1×1×1) with rounded edges. Cached per (radius, segments). */
export function roundedBoxGeometry(radius = 0.2, segments = 4) {
  const key = radius + ':' + segments;
  if (geoCache.has(key)) return geoCache.get(key);
  const g = new THREE.BoxGeometry(1, 1, 1, segments * 2, segments * 2, segments * 2);
  const pos = g.attributes.position;
  const nrm = g.attributes.normal;
  const inner = 0.5 - radius;
  const p = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i);
    c.set(
      THREE.MathUtils.clamp(p.x, -inner, inner),
      THREE.MathUtils.clamp(p.y, -inner, inner),
      THREE.MathUtils.clamp(p.z, -inner, inner),
    );
    n.subVectors(p, c);
    if (n.lengthSq() < 1e-8) n.fromBufferAttribute(nrm, i);
    n.normalize();
    p.copy(c).addScaledVector(n, radius);
    pos.setXYZ(i, p.x, p.y, p.z);
    nrm.setXYZ(i, n.x, n.y, n.z);
  }
  g.computeBoundingSphere();
  geoCache.set(key, g);
  return g;
}

// ---------- shader ----------
const VERT = /* glsl */`
#ifdef INSTANCED
attribute vec3 aColor;
attribute vec4 aFace;   // expr, blink(0 open..1 closed), lookX, lookY
attribute vec4 aFx;     // flash(0..1 white), glow(emissive 0..1), opacity, faceTilt
#else
uniform vec3 uColor;
uniform vec4 uFace;
uniform vec4 uFx;
#endif
varying vec3 vColor;
varying vec4 vFace;
varying vec4 vFx;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec3 vWorldN;
varying vec3 vViewDir;
#include <common>
#include <fog_pars_vertex>
void main() {
#ifdef INSTANCED
  vColor = aColor; vFace = aFace; vFx = aFx;
  mat4 im = instanceMatrix;
#else
  vColor = uColor; vFace = uFace; vFx = uFx;
  mat4 im = mat4(1.0);
#endif
  vLocal = position;
  vLocalN = normal;
  vec4 wp = modelMatrix * im * vec4(position, 1.0);
  vWorldN = normalize(mat3(modelMatrix) * mat3(im) * normal);
  vViewDir = normalize(cameraPosition - wp.xyz);
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const FRAG = /* glsl */`
uniform vec3 uLightDir;
uniform vec3 uSky;
uniform vec3 uGround;
uniform vec3 uRim;
uniform float uTime;
varying vec3 vColor;
varying vec4 vFace;
varying vec4 vFx;
varying vec3 vLocal;
varying vec3 vLocalN;
varying vec3 vWorldN;
varying vec3 vViewDir;
#include <common>
#include <fog_pars_fragment>

float sdEllipse(vec2 p, vec2 r) { float k = length(p / r); return (k - 1.0) * min(r.x, r.y); }
float sdSeg(vec2 p, vec2 a, vec2 b) { vec2 pa = p - a, ba = b - a; float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0); return length(pa - ba * h); }
float fill(float d, float aa) { return 1.0 - smoothstep(-aa, aa, d); }

// returns rgb in .rgb and coverage in .a
vec4 face(vec2 uv, float expr, float blink, vec2 look) {
  vec3 ink = vec3(0.035, 0.04, 0.09);
  vec4 col = vec4(0.0);
  uv *= 0.76;          // face features ~1.3x: big poster-style eyes
  float aa = 0.009;
  vec2 L = look * 0.045;
  // --- blush (all but angry/charge get strong blush; angry gets faint)
  float blushAmt = (expr == 1.0 || expr == 5.0) ? 0.35 : 0.85;
  for (int s = 0; s < 2; s++) {
    float sx = s == 0 ? -1.0 : 1.0;
    float b = fill(sdEllipse(uv - vec2(0.29 * sx, -0.10) - L * 0.5, vec2(0.085, 0.05)), 0.05);
    col.rgb = mix(col.rgb, vec3(1.0, 0.42, 0.45), b * blushAmt * (1.0 - col.a));
    col.a = max(col.a, b * blushAmt * 0.75);
  }
  for (int s = 0; s < 2; s++) {
    float sx = s == 0 ? -1.0 : 1.0;
    vec2 e = uv - vec2(0.165 * sx, 0.075) - L;
    float eye = 0.0; float hi = 0.0;
    if (expr == 2.0) {
      // dizzy spiral
      float r = length(e); float a = atan(e.y, e.x) * sx;
      float sp = abs(fract((r * 26.0 - a / 6.2831 - uTime * 2.0)) - 0.5);
      eye = (1.0 - smoothstep(0.16, 0.26, sp)) * (1.0 - smoothstep(0.095, 0.105, r));
    } else if (expr == 3.0) {
      // > <
      vec2 q = vec2(e.x * sx, e.y);
      float d = min(sdSeg(q, vec2(-0.06, 0.05), vec2(0.05, 0.0)), sdSeg(q, vec2(-0.06, -0.05), vec2(0.05, 0.0)));
      eye = fill(d - 0.022, aa);
    } else if (expr == 4.0) {
      // ^ ^
      float d = min(sdSeg(e, vec2(-0.07, -0.02), vec2(0.0, 0.05)), sdSeg(e, vec2(0.0, 0.05), vec2(0.07, -0.02)));
      eye = fill(d - 0.022, aa);
    } else if (expr == 7.0) {
      eye = fill(sdSeg(e, vec2(-0.06, 0.0), vec2(0.06, 0.0)) - 0.02, aa);
    } else {
      vec2 r = vec2(0.075, 0.108);
      if (expr == 1.0 || expr == 5.0) r = vec2(0.07, 0.075);
      if (expr == 6.0) r = vec2(0.075, 0.07);
      r.y *= max(0.08, 1.0 - blink);
      float d = sdEllipse(e, r);
      eye = fill(d, aa);
      // glossy highlights (big + small), hidden when blinking
      float open = 1.0 - smoothstep(0.5, 0.8, blink);
      hi = fill(sdEllipse(e - vec2(-0.022 * sx + 0.018, 0.035), vec2(0.03, 0.036)), aa) * open;
      hi = max(hi, fill(sdEllipse(e - vec2(0.03, -0.045), vec2(0.014, 0.014)), aa) * open * 0.9);
      hi *= eye;
    }
    vec3 eyeCol = ink;
    if (expr == 5.0) eyeCol = vec3(1.0, 0.95, 0.35) * 2.2; // glowing
    col.rgb = mix(col.rgb, eyeCol, eye);
    col.rgb = mix(col.rgb, vec3(1.0), hi);
    col.a = max(col.a, eye);
    // angry brows
    if (expr == 1.0 || expr == 5.0) {
      vec2 q = vec2(e.x * sx, e.y);
      float d = sdSeg(q, vec2(-0.075, 0.075), vec2(0.085, 0.13));
      float br = fill(d - 0.026, aa);
      col.rgb = mix(col.rgb, ink, br); col.a = max(col.a, br);
    }
    if (expr == 6.0) {
      vec2 q = vec2(e.x * sx, e.y);
      float d = sdSeg(q, vec2(-0.08, 0.12), vec2(0.07, 0.10));
      float br = fill(d - 0.02, aa);
      col.rgb = mix(col.rgb, ink, br); col.a = max(col.a, br);
    }
  }
  // --- mouth
  vec2 m = uv - vec2(0.0, -0.13) - L * 0.6;
  float mouth = 0.0; float tongue = 0.0;
  if (expr == 1.0 || expr == 5.0) {
    // shouting: rounded trapezoid-ish open mouth
    float d = sdEllipse(m - vec2(0.0, 0.01), vec2(0.085, 0.07));
    d = max(d, (m.y - 0.03));
    mouth = fill(d, aa);
    tongue = fill(sdEllipse(m - vec2(0.0, -0.05), vec2(0.05, 0.03)), aa) * mouth;
  } else if (expr == 2.0) {
    float w = sin(m.x * 60.0 + uTime * 8.0) * 0.012;
    mouth = fill(abs(m.y - w) - 0.016, aa) * step(abs(m.x), 0.07);
  } else if (expr == 3.0 || expr == 7.0) {
    mouth = fill(sdEllipse(m - vec2(0.0, 0.0), vec2(0.035, 0.03)), aa);
  } else if (expr == 6.0) {
    float d = sdEllipse(m - vec2(0.0, 0.01), vec2(0.06, 0.035)); d = max(d, m.y - 0.01);
    mouth = fill(d, aa);
  } else {
    // happy open smile (poster)
    float d = sdEllipse(m - vec2(0.0, 0.025), vec2(0.08, 0.09)); d = max(d, m.y - 0.025);
    mouth = fill(d, aa);
    tongue = fill(sdEllipse(m - vec2(0.0, -0.045), vec2(0.05, 0.032)), aa) * mouth;
  }
  col.rgb = mix(col.rgb, vec3(0.35, 0.05, 0.08), mouth);
  col.rgb = mix(col.rgb, vec3(1.0, 0.45, 0.5), tongue);
  col.a = max(col.a, mouth);
  return col;
}

void main() {
  vec3 N = normalize(vWorldN);
  vec3 V = normalize(vViewDir);
  vec3 Ld = normalize(uLightDir);
  vec3 base = vColor;
  // soft clay lighting: wrapped lambert + hemisphere + rim + soft spec
  float wrap = dot(N, Ld) * 0.5 + 0.5;
  float diff = smoothstep(0.15, 0.95, wrap);
  vec3 hemi = mix(uGround, uSky, N.y * 0.5 + 0.5);
  vec3 lit = base * (0.38 * hemi + 0.8 * diff);
  float rim = pow(1.0 - max(dot(N, V), 0.0), 3.0);
  lit += uRim * rim * 0.32;
  vec3 H = normalize(Ld + V);
  float spec = pow(max(dot(N, H), 0.0), 60.0);
  lit += vec3(1.0) * spec * 0.35;
  // subtle top-face sheen like the poster's soft plastic
  lit += base * smoothstep(0.7, 1.0, N.y) * 0.08;

  // face on local +Z side
  if (vLocalN.z > 0.55) {
    vec4 f = face(vLocal.xy, floor(vFace.x + 0.5), vFace.y, vFace.zw);
    vec3 faceLit = f.rgb * (0.65 + 0.45 * diff);
    if (floor(vFace.x + 0.5) == 5.0) faceLit = mix(faceLit, f.rgb, 0.8); // keep glow bright
    lit = mix(lit, faceLit, f.a);
  }
  // hit flash + emissive glow (feeds bloom)
  lit = mix(lit, vec3(1.6), vFx.x);
  lit += base * vFx.y * 1.4;
  gl_FragColor = vec4(lit, vFx.z);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

export const LIGHT = {
  dir: new THREE.Vector3(-0.45, 0.85, 0.55).normalize(),
  sky: new THREE.Color(0xdcecff),
  ground: new THREE.Color(0xf3d9b8),
  rim: new THREE.Color(0xbfe4ff),
};

const sharedUniforms = {
  uLightDir: { value: LIGHT.dir },
  uSky: { value: LIGHT.sky },
  uGround: { value: LIGHT.ground },
  uRim: { value: LIGHT.rim },
  uTime: { value: 0 },
};

/** Advance face animation clock (dizzy spirals etc.). Call once per frame. */
export function tickArt(t) { sharedUniforms.uTime.value = t; }
/** Retint character lighting for a world theme. */
export function setCharacterLighting({ sky, ground, rim, dir } = {}) {
  if (sky !== undefined) LIGHT.sky.set(sky);
  if (ground !== undefined) LIGHT.ground.set(ground);
  if (rim !== undefined) LIGHT.rim.set(rim);
  if (dir) LIGHT.dir.copy(dir).normalize();
}

/**
 * Cube character material.
 *  instanced=true  → reads per-instance attributes aColor/aFace/aFx
 *  instanced=false → uses uniforms uColor/uFace/uFx (see material.userData)
 */
export function createCubeMaterial({ instanced = false, color = 0x2f6bff, transparent = false } = {}) {
  const uniforms = { ...sharedUniforms, ...THREE.UniformsLib.fog };
  if (!instanced) {
    uniforms.uColor = { value: new THREE.Color(color) };
    uniforms.uFace = { value: new THREE.Vector4(EXPR.HAPPY, 0, 0, 0) };
    uniforms.uFx = { value: new THREE.Vector4(0, 0, 1, 0) };
  }
  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: FRAG,
    defines: instanced ? { INSTANCED: '' } : {},
    fog: true,
    transparent,
  });
  return mat;
}

/**
 * Crowd of face-cubes in one draw call.
 *   const crowd = new CubeCrowd(128); scene.add(crowd.mesh);
 *   crowd.set(i, {x,y,z, sx,sy,sz, rotY, color, expr, blink, lookX, lookY, flash, glow});
 *   crowd.count = n; crowd.commit();
 */
export class CubeCrowd {
  constructor(capacity = 128, { radius = 0.22, segments = 3 } = {}) {
    this.capacity = capacity;
    const geo = roundedBoxGeometry(radius, segments).clone();
    this.aColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    this.aFace = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    this.aFx = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 4), 4);
    for (const a of [this.aColor, this.aFace, this.aFx]) a.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('aColor', this.aColor);
    geo.setAttribute('aFace', this.aFace);
    geo.setAttribute('aFx', this.aFx);
    this.material = createCubeMaterial({ instanced: true });
    this.mesh = new THREE.InstancedMesh(geo, this.material, capacity);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this._m = new THREE.Matrix4();
    this._q = new THREE.Quaternion();
    this._e = new THREE.Euler();
    this._p = new THREE.Vector3();
    this._s = new THREE.Vector3();
    this._c = new THREE.Color();
  }
  set count(n) { this.mesh.count = Math.min(n, this.capacity); }
  get count() { return this.mesh.count; }
  set(i, o) {
    if (i >= this.capacity) return;
    this._e.set(o.rotX || 0, o.rotY || 0, o.rotZ || 0, 'YXZ');
    this._q.setFromEuler(this._e);
    this._p.set(o.x, o.y, o.z);
    this._s.set(o.sx ?? o.s ?? 1, o.sy ?? o.s ?? 1, o.sz ?? o.s ?? 1);
    this._m.compose(this._p, this._q, this._s);
    this.mesh.setMatrixAt(i, this._m);
    if (o.color !== undefined) {
      if (typeof o.color === 'number') this._c.setHex(o.color); else this._c.copy(o.color);
      this.aColor.setXYZ(i, this._c.r, this._c.g, this._c.b);
    }
    this.aFace.setXYZW(i, o.expr ?? EXPR.ANGRY, o.blink ?? 0, o.lookX ?? 0, o.lookY ?? 0);
    this.aFx.setXYZW(i, o.flash ?? 0, o.glow ?? 0, o.opacity ?? 1, 0);
  }
  commit() {
    this.mesh.instanceMatrix.needsUpdate = true;
    this.aColor.needsUpdate = true;
    this.aFace.needsUpdate = true;
    this.aFx.needsUpdate = true;
  }
}

// ---------- blob shadows ----------
function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(0,0,0,0.55)');
  grd.addColorStop(0.55, 'rgba(0,0,0,0.3)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class BlobShadows {
  constructor(capacity = 256) {
    this.capacity = capacity;
    const geo = new THREE.PlaneGeometry(1, 1);
    geo.rotateX(-Math.PI / 2);
    this.mesh = new THREE.InstancedMesh(
      geo,
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false, color: 0x2a3050 }),
      capacity,
    );
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    this.mesh.count = 0;
    this.n = 0;
    this._m = new THREE.Matrix4();
  }
  begin() { this.n = 0; }
  /** x,z ground position, size = footprint diameter, h = height above ground (fades/shrinks) */
  add(x, z, size, h = 0, groundY = 0.02) {
    if (this.n >= this.capacity) return;
    const k = Math.max(0.35, 1 - h * 0.12);
    const s = size * 1.35 * k;
    this._m.makeScale(s, 1, s);
    this._m.setPosition(x, groundY, z);
    this.mesh.setMatrixAt(this.n++, this._m);
  }
  end() { this.mesh.count = this.n; this.mesh.instanceMatrix.needsUpdate = true; }
}
