// Ocean surface: Gerstner waves on a projected (screen-space) grid — vertices are ray-cast from the camera onto
// the sea plane every frame, so density is uniform on screen (cheap on SwiftShader) while the waves stay world-locked.
// Long swells: displacement + normal per vertex; short waves + detail normals per pixel (analytic, footprint-faded);
// fresnel sky reflection (same GLSL as the dome), moon / low-sun glitter path with variance-broadened highlights,
// warm lamp reflections, crest foam from the Gerstner Jacobian, horizon fog to the sky's own horizon colour.
// "海洋真实而有重量": deep-water dispersion ω = √(gk) — a 120 m swell takes ~9 s to pass, crests 2–3 m on 'heavy'.
//
//   const sky = createSky({ preset: 'dusk' }); const sea = createSea({ sky, swell: 'heavy', windDir: 30 });
//   scene.add(sky.object3D, sea.object3D);
//   per frame, AFTER placing the camera:  sea.update(T, camera);
//   sea.setLamps([{ position: lampWorldPos, color: 0xffa050, intensity: 12 }]);
//   const pose = sea.poseAt(x, z, heading, T, { length: 24, beam: 7 });   // ship bobbing (y, pitch, roll)
import * as THREE from 'three';
import { SKY_GLSL } from './sky.js';
import { noiseTexture, waterNormalTexture } from './textures.js';
import { rng } from '../engine/util.js';

const G = 9.81;
export const SWELLS = {
  calm:     { amp: 0.32, steep: 0.35, chop: 0.5, longest: 70 },
  moderate: { amp: 0.62, steep: 0.5, chop: 0.75, longest: 90 },
  heavy:    { amp: 0.78, steep: 0.62, chop: 1.0, longest: 120 },
  storm:    { amp: 1.6, steep: 0.75, chop: 1.3, longest: 150 },
};
const NW = 12, NV = 6; // waves 0..NV-1 shaded per vertex, NV..NW-1 per pixel

// Deterministic wave set: [{dx, dz, k, A, Q, w, ph, L}] longest first.
export function makeWaves({ swell = 'moderate', windDir = 30, seed = 3, amp = 1, spread = 1.4 } = {}) {
  const S = typeof swell === 'string' ? SWELLS[swell] || SWELLS.moderate : swell;
  const r = rng(seed * 97 + 11), waves = [];
  let L = S.longest;
  for (let i = 0; i < NW; i++) {
    const t = i / (NW - 1);
    const ang = THREE.MathUtils.degToRad(windDir + (r() - 0.5) * (24 + 90 * t) * spread + (i % 2 ? 18 : -18) * t);
    const k = (2 * Math.PI) / L;
    const A = L * (0.0065 + 0.0075 * Math.sin(Math.PI * Math.min(1, t * 1.3)) + 0.002 * r()) * S.amp * amp * (i < 3 ? 1 : S.chop) * (1 - 0.35 * t * t);
    waves.push({ dx: Math.cos(ang), dz: Math.sin(ang), k, A, Q: 0, w: Math.sqrt(G * k), ph: r() * Math.PI * 2, L });
    L *= 0.7 + 0.06 * r();
  }
  const sumAk = waves.reduce((s, w) => s + w.A * w.k, 0);
  for (const w of waves) w.Q = S.steep / sumAk;
  return waves;
}

const COMMON = /* glsl */ `
uniform vec4 uW[${NW}]; uniform vec3 uW2[${NW}]; uniform float uT, uLevel;
`;
const SEA_VERT = '#define SKY_NO_STARS\n' + SKY_GLSL + COMMON + /* glsl */ `
uniform mat4 uInvVP; uniform vec3 uCam; uniform float uMaxDist, uFogDensity; uniform vec4 uNdc; // x0,x1,y0,y1
varying vec3 vWorld; varying vec2 vGrid; varying vec3 vTx; varying vec3 vTz; varying vec3 vFogC; varying float vFog; varying vec3 vJ; varying float vH;
vec3 castRay(vec2 ndc){
  vec4 a = uInvVP * vec4(ndc, -1.0, 1.0); a /= a.w;
  vec4 b = uInvVP * vec4(ndc, 1.0, 1.0); b /= b.w;
  vec3 d = normalize(b.xyz - a.xyz);
  if (d.y < -1e-5) { float t = (uLevel - uCam.y) / d.y; if (t < uMaxDist) return uCam + d * t; }
  vec3 hd = normalize(vec3(d.x, 0.0, d.z) + vec3(0.0, 0.0, 1e-6));
  return vec3(uCam.x, uLevel, uCam.z) + hd * uMaxDist;
}
void main(){
  vec2 ndc = vec2(mix(uNdc.x, uNdc.y, position.x), mix(uNdc.z, uNdc.w, position.y));
  vec3 h0 = castRay(ndc);
  vec3 h1 = castRay(ndc + vec2(0.0, (uNdc.w - uNdc.z) / 96.0));
  float spacing = max(distance(h0.xz, h1.xz), 0.02);
  vec2 g = h0.xz;
  vec3 p = vec3(g.x, uLevel, g.y);
  vec3 tx = vec3(1.0, 0.0, 0.0), tz = vec3(0.0, 0.0, 1.0);
  float jxx = 0.0, jzz = 0.0, jxz = 0.0, hh = 0.0;
  for (int i = 0; i < ${NW}; i++) {
    vec4 a = uW[i]; vec3 b = uW2[i];
    float L = 6.2831853 / a.z;
    float A = a.w * smoothstep(L, L * 0.5, spacing * 5.0);
    float f = a.z * dot(a.xy, g) - b.y * uT + b.z;
    float c = cos(f), s = sin(f);
    p.x += b.x * A * a.x * c; p.z += b.x * A * a.y * c; p.y += A * s;
    if (i < ${NV}) {
      float WA = a.z * A;
      tx += vec3(-b.x * WA * a.x * a.x * s, WA * a.x * c, -b.x * WA * a.x * a.y * s);
      tz += vec3(-b.x * WA * a.x * a.y * s, WA * a.y * c, -b.x * WA * a.y * a.y * s);
      jxx += b.x * WA * a.x * a.x * s; jzz += b.x * WA * a.y * a.y * s; jxz += b.x * WA * a.x * a.y * s;
      hh += A * s;
    }
  }
  vTx = tx; vTz = tz; vJ = vec3(jxx, jzz, jxz); vH = hh;
  vWorld = p; vGrid = g;
  vec3 V = uCam - p; float dist = length(V);
#ifdef NO_VFOG
  vFogC = uHorizon;
#else
  vFogC = skyRadiance(normalize(vec3(-V.x, 0.0, -V.z)) + vec3(0.0, 0.012, 0.0), 0.0);
#endif
  vFog = 1.0 - exp(-dist * uFogDensity);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}`;

const SEA_FRAG = SKY_GLSL + COMMON + /* glsl */ `
uniform float uPixAngle;
uniform sampler2D uDetail; uniform float uDetailStr, uDetailScale;
uniform vec3 uDeep, uScatter; uniform float uFoam, uGlitter, uSunGlitter, uReflect;
uniform vec3 uLampPos[4]; uniform vec3 uLampCol[4]; uniform int uLampN;
varying vec3 vWorld; varying vec2 vGrid; varying vec3 vTx; varying vec3 vTz; varying vec3 vFogC; varying float vFog; varying vec3 vJ; varying float vH;
void main(){
  vec3 V = cameraPosition - vWorld; float dist = length(V); V /= dist;
  float fp = dist * uPixAngle / max(abs(V.y), 0.04);
  vec2 g = vGrid;
  vec3 tx = vTx, tz = vTz;
  float lostVar = 0.0, jxx = vJ.x, jzz = vJ.y, jxz = vJ.z, hgt = vH;
#ifndef NO_PPW
  for (int i = ${NV}; i < ${NW}; i++) {
    vec4 a = uW[i]; vec3 b = uW2[i];
    float L = 6.2831853 / a.z;
    float nf = smoothstep(L * 0.5, L * 0.12, fp);
    float f = a.z * dot(a.xy, g) - b.y * uT + b.z;
    float c = cos(f), s = sin(f);
    float WA = a.z * a.w, An = WA * nf;
    tx += vec3(-b.x * An * a.x * a.x * s, An * a.x * c, -b.x * An * a.x * a.y * s);
    tz += vec3(-b.x * An * a.x * a.y * s, An * a.y * c, -b.x * An * a.y * a.y * s);
    lostVar += WA * WA * (1.0 - nf) * 0.5;
    jxx += b.x * An * a.x * a.x * s; jzz += b.x * An * a.y * a.y * s; jxz += b.x * An * a.x * a.y * s;
    hgt += a.w * nf * s;
  }
#endif
  vec3 N = normalize(cross(tz, tx));
  float dn = uDetailStr * smoothstep(3.0, 0.15, fp);
  vec2 uv1 = g * uDetailScale + vec2(0.013, 0.007) * uT, uv2 = g * uDetailScale * 2.7 + vec2(-0.011, 0.017) * uT;
  vec2 dxy = ((texture2D(uDetail, uv1).xy * 2.0 - 1.0) + (texture2D(uDetail, uv2).xy * 2.0 - 1.0) * 0.7) * dn;
  N = normalize(N + vec3(dxy.x, 0.0, dxy.y));
  lostVar += uDetailStr * uDetailStr * 0.05 * (1.0 - smoothstep(3.0, 0.15, fp));
  if (!gl_FrontFacing) N = -N;
  float NdV = max(dot(N, V), 0.0);
  float F = 0.02 + 0.98 * pow(1.0 - NdV, 5.0);
  vec3 R = reflect(-V, N); R.y = abs(R.y) * 0.9 + 0.012;
#ifdef NO_REFL
  vec3 refl = vFogC;
#else
  vec3 refl = skyRadiance(R, 0.0) * uReflect;
#endif
  vec3 amb = (uZenith * 0.6 + uHorizon * 0.4) * uSkyExposure;
  vec3 Lm = uMoonDir, Ls = normalize(vec3(uSunDir.x, max(uSunDir.y, 0.02), uSunDir.z));
  float back = pow(max(dot(-V, normalize(vec3(Ls.x, 0.0, Ls.z))) * 0.5 + 0.5, 0.0), 3.0);
  vec3 body = uDeep * amb * 3.0 + uScatter * max(hgt, 0.0) * 0.25 * (uSunColor * uSunGlow * back * 0.6 + uMoonColor * 0.02 + amb);
  vec3 col = mix(body, refl, F);
  float sh = 1600.0 / (1.0 + 1600.0 * lostVar * 1.5); sh = max(sh, 60.0);
  float gm = pow(max(dot(N, normalize(V + Lm)), 0.0), sh) * (sh + 8.0) / 25.0;
  col += uMoonColor * uMoonIntensity * uGlitter * gm * 0.01 * step(0.0, Lm.y) * (1.0 - skyCloud(Lm) * 0.85);
  float shs = sh * 0.5;
  float gs = pow(max(dot(N, normalize(V + Ls)), 0.0), shs) * (shs + 8.0) / 25.0;
  col += uSunColor * uSunGlow * uSunGlitter * gs * 0.02 * smoothstep(-0.12, 0.0, uSunDir.y);
#ifndef NO_LAMP
  for (int i = 0; i < 4; i++) {
    if (i >= uLampN) break;
    vec3 Lv = uLampPos[i] - vWorld; float ld = length(Lv); Lv /= ld;
    float shl = min(sh * 0.12, 220.0);
    float spec = pow(max(dot(N, normalize(V + Lv)), 0.0), shl) * (shl + 8.0) / 25.0;
    col += uLampCol[i] * (spec * 0.05 + 0.006 * max(dot(N, Lv), 0.0)) / (1.0 + ld * ld * 0.05);
  }
#endif
  float J = (1.0 - jxx) * (1.0 - jzz) - jxz * jxz;
  if (uFoam > 0.0 && J < 0.5 && dist < 900.0) {
    float fn = texture2D(uSkyNoise, g * 0.07 + vec2(0.0, 0.008) * uT).r * 0.6 + texture2D(uSkyNoise, g * 0.29).g * 0.4;
    float foam = uFoam * smoothstep(0.5, 0.1, J) * smoothstep(0.5, 0.68, fn) * smoothstep(900.0, 60.0, dist);
    col = mix(col, (amb * 1.6 + uMoonColor * 0.03 + uSunColor * uSunGlow * 0.08), foam * 0.6);
  }
  col = mix(col, vFogC, clamp(vFog, 0.0, 1.0));
  gl_FragColor = vec4(col, 1.0);
}`;

function screenGrid(cols, rows) {
  const pos = [], idx = [];
  for (let j = 0; j <= rows; j++) for (let i = 0; i <= cols; i++) pos.push(i / cols, j / rows, 0);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const a = j * (cols + 1) + i, b = a + 1, c = a + cols + 1, d = c + 1;
    idx.push(a, b, d, a, d, c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

export function createSea(o = {}) {
  const p = { swell: 'moderate', windDir: 30, seed: 3, amp: 1, level: 0, deep: '#071624', scatter: '#245f66', fogDensity: 0.00055,
    foam: 0.5, glitter: 1, sunGlitter: 1, reflect: 1, detail: 0.3, detailScale: 0.045, maxDist: 5000, cols: 128, rows: 96, ...o };
  if (!p.sky) throw new Error('createSea needs { sky } from createSky()');
  const waves = makeWaves(p);
  const geometry = screenGrid(p.cols, p.rows);
  const own = {
    uW: { value: waves.map((w) => new THREE.Vector4(w.dx, w.dz, w.k, w.A)) }, uW2: { value: waves.map((w) => new THREE.Vector3(w.Q, w.w, w.ph)) },
    uT: { value: 0 }, uLevel: { value: p.level }, uInvVP: { value: new THREE.Matrix4() }, uCam: { value: new THREE.Vector3() }, uMaxDist: { value: p.maxDist },
    uNdc: { value: new THREE.Vector4(-1.15, 1.15, -1.3, 1.0) }, uPixAngle: { value: 0.0008 },
    uDetail: { value: waterNormalTexture() }, uDetailStr: { value: p.detail }, uDetailScale: { value: p.detailScale },
    uDeep: { value: new THREE.Color(p.deep) }, uScatter: { value: new THREE.Color(p.scatter) },
    uFogDensity: { value: p.fogDensity }, uFoam: { value: p.foam }, uGlitter: { value: p.glitter }, uSunGlitter: { value: p.sunGlitter }, uReflect: { value: p.reflect },
    uLampPos: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) }, uLampCol: { value: [0, 1, 2, 3].map(() => new THREE.Vector3()) }, uLampN: { value: 0 },
  };
  const uniforms = { ...p.sky.uniforms, ...own };
  if (!uniforms.uSkyNoise.value) uniforms.uSkyNoise.value = noiseTexture();
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader: SEA_VERT, fragmentShader: SEA_FRAG, fog: false, side: THREE.DoubleSide, defines: { ...(p.defines || {}) } });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false; mesh.name = 'sea';

  function displace(x0, z0, T) {
    let x = x0, y = 0, z = z0;
    for (const w of waves) {
      const f = w.k * (w.dx * x0 + w.dz * z0) - w.w * T + w.ph, c = Math.cos(f), s = Math.sin(f);
      x += w.Q * w.A * w.dx * c; z += w.Q * w.A * w.dz * c; y += w.A * s;
    }
    return [x, y + p.level, z];
  }
  function heightAt(x, z, T) {
    let x0 = x, z0 = z;
    for (let it = 0; it < 5; it++) { const d = displace(x0, z0, T); x0 += x - d[0]; z0 += z - d[2]; }
    return displace(x0, z0, T)[1];
  }
  const _m = new THREE.Matrix4(), _v = new THREE.Vector3();
  const sea = {
    object3D: mesh, material, uniforms, waves, displace, heightAt, level: p.level,
    normalAt(x, z, T, e = 0.5) {
      const hx = heightAt(x + e, z, T) - heightAt(x - e, z, T), hz = heightAt(x, z + e, T) - heightAt(x, z - e, T);
      return new THREE.Vector3(-hx / (2 * e), 1, -hz / (2 * e)).normalize();
    },
    // Rigid float pose for a hull (heading: radians about +Y, 0 = bow toward −Z). damp < 1 = heavy hull ignores chop.
    poseAt(x, z, heading, T, { length = 20, beam = 6, damp = 0.6, lag = 0.35 } = {}) {
      const fw = [-Math.sin(heading), -Math.cos(heading)], sd = [Math.cos(heading), -Math.sin(heading)];
      const t = T - lag;
      const hb = heightAt(x + fw[0] * length / 2, z + fw[1] * length / 2, t), hs = heightAt(x - fw[0] * length / 2, z - fw[1] * length / 2, t);
      const hp = heightAt(x - sd[0] * beam / 2, z - sd[1] * beam / 2, t), hr = heightAt(x + sd[0] * beam / 2, z + sd[1] * beam / 2, t);
      const hc = heightAt(x, z, t);
      return { y: (hc * 2 + hb + hs + hp + hr) / 6, pitch: Math.atan2(hb - hs, length) * damp, roll: -Math.atan2(hr - hp, beam) * damp };
    },
    setLamps(list = []) {
      own.uLampN.value = Math.min(4, list.length);
      list.slice(0, 4).forEach((l, i) => { own.uLampPos.value[i].copy(l.position); const c = new THREE.Color(l.color ?? 0xffa050).multiplyScalar(l.intensity ?? 5); own.uLampCol.value[i].set(c.r, c.g, c.b); });
    },
    // Call every frame after the camera is placed (also inside nested views).
    update(T, camera) {
      own.uT.value = T;
      if (!camera) return;
      camera.updateMatrixWorld(); camera.updateProjectionMatrix();
      own.uCam.value.copy(camera.position);
      _m.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); own.uInvVP.value.copy(_m).invert();
      // top of the grid just above the horizon (max over the frame's width), bottom below the frame for crest overhang
      let yTop = -1.3;
      const fwd = new THREE.Vector3(); camera.getWorldDirection(fwd);
      const fh = fwd.clone().setY(0); if (fh.lengthSq() < 1e-6) fh.set(0, 0, -1); fh.normalize();
      const rh = new THREE.Vector3(-fh.z, 0, fh.x);
      const tx = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.aspect;
      for (const s of [-1.25, -0.6, 0, 0.6, 1.25]) {
        const d = fh.clone().addScaledVector(rh, s * tx).normalize();
        _v.copy(camera.position).setY(p.level).addScaledVector(d, p.maxDist).applyMatrix4(_m);
        yTop = Math.max(yTop, _v.y + 0.05);
      }
      own.uNdc.value.set(-1.2, 1.2, -2.6, Math.min(1.25, yTop));
      own.uPixAngle.value = THREE.MathUtils.degToRad(camera.fov) / ((camera.userData && camera.userData.H) || 536);
    },
  };
  return sea;
}

// Distant shore (bible LOC_DECK lock: low black coastline on screen-LEFT with one to three warm points P13).
// A low hill silhouette on an arc at `distance` m spanning azimuths [az0, az1] (deg, 0 = −Z, 90 = +X), hazed toward the
// sky's own horizon colour, plus `lights` tiny warm shore lamps at the waterline (constant pixel size, gentle shimmer).
export function createCoast({ sky, distance = 4200, az0 = -75, az1 = -20, height = 70, seed = 5, lights = 3, lightColor = 0xE2A458, lightIntensity = 6, lightPx = 3.2, haze = 0.25, level = 0 } = {}) {
  if (!sky) throw new Error('createCoast needs { sky }');
  const r = rng(seed * 31 + 1), N = 160, pos = [], idx = [];
  const hgt = (t) => { let h = 0; for (let k = 1; k <= 5; k++) h += Math.sin(t * Math.PI * (k * 2.3 + r.k1) + k * 1.7) / k; return h; };
  r.k1 = r() * 3;
  for (let i = 0; i <= N; i++) {
    const t = i / N, az = THREE.MathUtils.degToRad(az0 + (az1 - az0) * t);
    const env = Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.6;
    const h = height * env * (0.55 + 0.3 * hgt(t * 3) + 0.15 * Math.sin(t * 90 + 1));
    const x = Math.sin(az) * distance, z = -Math.cos(az) * distance;
    pos.push(x, level - 8, z, x, level + Math.max(2, h), z);
    if (i < N) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  const m = new THREE.ShaderMaterial({ uniforms: { ...sky.uniforms, uLand: { value: new THREE.Color(0x05070b) }, uCoastHaze: { value: haze } }, side: THREE.DoubleSide, fog: false,
    vertexShader: /* glsl */ `varying float vY; void main(){ vY = position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uLand, uHorizon, uHazeColor; uniform float uCoastHaze, uHaze, uSkyExposure; varying float vY;
      void main(){ vec3 hz = mix(uHorizon, uHazeColor, uHaze * 0.77) * uSkyExposure; gl_FragColor = vec4(mix(uLand, hz, uCoastHaze * (0.6 + 0.4 * smoothstep(0.0, 60.0, vY))), 1.0); }` });
  const land = new THREE.Mesh(g, m); land.frustumCulled = false; land.renderOrder = -10;
  const grp = new THREE.Group(); grp.add(land);
  const lp = new Float32Array(lights * 3), ls = new Float32Array(lights);
  for (let k = 0; k < lights; k++) { const t = 0.25 + 0.5 * (lights > 1 ? k / (lights - 1) : 0.5) + (r() - 0.5) * 0.08; const az = THREE.MathUtils.degToRad(az0 + (az1 - az0) * t); lp.set([Math.sin(az) * (distance - 30), level + 3 + r() * 6, -Math.cos(az) * (distance - 30)], k * 3); ls[k] = r(); }
  const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(lp, 3)); pg.setAttribute('aS', new THREE.BufferAttribute(ls, 1));
  const pm = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uPx: { value: lightPx }, uCol: { value: new THREE.Color(lightColor).multiplyScalar(lightIntensity) } },
    vertexShader: /* glsl */ `attribute float aS; uniform float uT, uPx; varying float vF; void main(){ vF = 0.8 + 0.2 * sin(uT * (3.0 + aS * 4.0) + aS * 40.0); gl_PointSize = uPx * 4.0; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */ `uniform vec3 uCol; varying float vF; void main(){ vec2 d = gl_PointCoord * 2.0 - 1.0; float r2 = dot(d, d); float a = exp(-r2 * 14.0) + 0.12 * exp(-r2 * 2.5); gl_FragColor = vec4(uCol * a * vF, 1.0); }` });
  const pts = new THREE.Points(pg, pm); pts.frustumCulled = false; grp.add(pts);
  return { object3D: grp, land, lights: pts, positions: lp, update(T) { pm.uniforms.uT.value = T; } };
}
