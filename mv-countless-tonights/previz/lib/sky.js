// Sky dome: dusk (暮色深蓝 + low copper-gold horizon), deep night with moon (月光银) + stars + soft fbm clouds,
// pre-dawn → dawn. Physical-ish linear HDR radiance, rendered at the far plane (never clips, no need to follow the camera).
//
//   import { createSky, SKY_PRESETS } from '/previz/lib/sky.js';
//   const sky = createSky({ preset: 'dusk' });            // or { preset:'night', moonElev: 28, cloudCover: 0.4, ... }
//   scene.add(sky.object3D);
//   sky.update(T);                                        // drives clouds drift + star twinkle (pure function of T)
//   sky.set({ preset: 'dawn' }) | sky.blend('predawn', 'dawn', t)
//   scene.fog = new THREE.FogExp2(sky.horizonColor(), 0.0008); const { moon, hemi } = sky.makeLights(); scene.add(moon, hemi);
//
// The GLSL is exported (SKY_GLSL + sky.uniforms) so sea.js / env.js evaluate exactly the same sky for reflections.
import * as THREE from 'three';
import { noiseTexture } from './textures.js';

const C = (hex, k = 1) => new THREE.Color(hex).multiplyScalar(k); // sRGB hex -> linear, scaled
const dirFromAngles = (azDeg, elDeg) => {
  const az = THREE.MathUtils.degToRad(azDeg), el = THREE.MathUtils.degToRad(elDeg);
  // azimuth 0 = -Z (into the screen for a default camera), 90 = +X
  return new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el)).normalize();
};

// Presets (colours sRGB, scaled to linear HDR radiance). Angles in degrees.
export const SKY_PRESETS = {
  dusk: { // bible LOC_DECK V1: dusk after sunset, zenith P01, a faint warm line at the horizon, last light on cloud tops
    zenith: ['#0E1B30', 0.85], horizon: ['#2E4A6E', 0.75], ground: ['#0c1424', 0.3], haze: ['#41557a', 0.55], hazeAmt: 0.32,
    sunAz: -35, sunElev: -3, sunColor: ['#d08a4c', 0.85], sunGlow: 0.9, sunGlowWidth: 26.0, sunDisc: 0, sunSharp: 18,
    moonAz: 150, moonElev: 12, moonColor: ['#C8D2DB', 1], moonSize: 0.010, moonIntensity: 2.5, moonHalo: 0.05,
    stars: 0.22, cloudCover: 0.5, cloudDensity: 0.85, cloudScale: 0.1, cloudLit: ['#6a7896', 0.45], cloudDark: ['#1c2742', 0.32], wind: [0.004, 0.0015],
  },
  night: {
    zenith: ['#08112a', 0.7], horizon: ['#24365a', 0.7], ground: ['#050912', 0.3], haze: ['#33415f', 0.6], hazeAmt: 0.3,
    sunAz: -30, sunElev: -25, sunColor: ['#202a40', 0.2], sunGlow: 0.0, sunGlowWidth: 8.0, sunDisc: 0,
    moonAz: 12, moonElev: 16, moonColor: ['#c9d3e0', 1], moonSize: 0.011, moonIntensity: 9.0, moonHalo: 0.25,
    stars: 1.0, cloudCover: 0.38, cloudDensity: 0.75, cloudScale: 0.1, cloudLit: ['#7d8aa6', 0.32], cloudDark: ['#141c30', 0.24], wind: [0.003, 0.001],
  },
  predawn: { // bible P20 dawn blue-grey #5B6F8A: sky and sea 20 min before dawn, a faint warm band low in the east
    zenith: ['#16264a', 0.7], horizon: ['#5B6F8A', 0.6], ground: ['#0b111e', 0.3], haze: ['#6a7a98', 0.5], hazeAmt: 0.3,
    sunAz: 70, sunElev: -6, sunColor: ['#c99070', 0.55], sunGlow: 0.7, sunGlowWidth: 22.0, sunDisc: 0, sunSharp: 12,
    moonAz: -110, moonElev: 14, moonColor: ['#C8D2DB', 1], moonSize: 0.010, moonIntensity: 4.0, moonHalo: 0.08,
    stars: 0.3, cloudCover: 0.32, cloudDensity: 0.7, cloudScale: 0.11, cloudLit: ['#8a8ea8', 0.4], cloudDark: ['#2a3150', 0.32], wind: [0.003, 0.001],
  },
  dawn: { // bible P21 晨光桃 #EBB894 horizon glow, P22 晨光奶白 #F5E4C8 brightest areas; soft, not blown out
    zenith: ['#4a6690', 0.6], horizon: ['#EBB894', 0.55], ground: ['#2a2a34', 0.35], haze: ['#e8c8aa', 0.5], hazeAmt: 0.25,
    sunAz: 70, sunElev: 1.5, sunColor: ['#F5E4C8', 1.0], sunGlow: 0.65, sunGlowWidth: 12.0, sunDisc: 12, sunSharp: 10,
    moonAz: -110, moonElev: 10, moonColor: ['#e6ecf4', 1], moonSize: 0.010, moonIntensity: 0.8, moonHalo: 0.0,
    stars: 0.0, cloudCover: 0.35, cloudDensity: 0.7, cloudScale: 0.11, cloudLit: ['#f0c8a8', 0.62], cloudDark: ['#7a7e98', 0.38], wind: [0.003, 0.001],
  },
};

export const SKY_GLSL = /* glsl */ `
uniform vec3 uZenith, uHorizon, uGround, uHazeColor; uniform float uHaze;
uniform vec3 uSunDir, uSunColor; uniform float uSunGlow, uSunGlowWidth, uSunDisc, uSunSharp;
uniform vec3 uMoonDir, uMoonColor; uniform float uMoonSize, uMoonIntensity, uMoonHalo;
uniform float uStars, uCloudCover, uCloudDensity, uCloudScale; uniform vec2 uWind;
uniform vec3 uCloudLit, uCloudDark; uniform float uSkyTime, uSkyExposure;
uniform sampler2D uSkyNoise;
float skyHash(vec3 p){ p = fract(p * 0.3183099 + vec3(0.71, 0.113, 0.419)); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float skyFbm(vec2 p){
  return texture2D(uSkyNoise, p).r * 0.52 + texture2D(uSkyNoise, p * 2.03 + 0.17).a * 0.28 + texture2D(uSkyNoise, p * 4.07 + 0.31).g * 0.2;
}
// cloud coverage at direction d (0..1), used for both radiance and moon occlusion
float skyCloud(vec3 d){
  if (d.y <= 0.0 || uCloudCover <= 0.0) return 0.0;
  vec2 cp = d.xz / (d.y + 0.09) * uCloudScale + uWind * uSkyTime;
  float n = skyFbm(cp);
  float cov = smoothstep(1.0 - uCloudCover, 1.0 - uCloudCover + 0.28, n);
  return cov * smoothstep(0.0, 0.1, d.y) * uCloudDensity;
}
vec3 skyRadiance(vec3 d, float withDisc){
  d = normalize(d);
  float h = d.y;
  float t = pow(clamp(h, 0.0, 1.0), 0.42);
  vec3 col = mix(uHorizon, uZenith, t);
  if (h < 0.0) col = mix(uHorizon, uGround, clamp(-h * 5.0, 0.0, 1.0));
  float cs = dot(d, uSunDir);
  float horiz = exp(-max(h, 0.0) * uSunGlowWidth) * smoothstep(-0.25, 0.0, h);
  col += uSunColor * uSunGlow * (pow(max(cs * 0.5 + 0.5, 0.0), uSunSharp) * horiz + 0.12 * pow(max(cs * 0.5 + 0.5, 0.0), 3.0) * exp(-max(h, 0.0) * 6.0) + 0.5 * pow(max(cs, 0.0), 40.0) * exp(-max(h, 0.0) * 4.0));
  col = mix(col, uHazeColor, uHaze * exp(-abs(h) * 14.0));
  if (withDisc > 0.5 && uSunDisc > 0.0) col += uSunColor * uSunDisc * smoothstep(0.9997, 0.99985, cs);
  // stars
#ifndef SKY_NO_STARS
  if (withDisc > 0.5 && uStars > 0.0 && h > 0.0) {
    vec3 sd = d * 300.0; vec3 cell = floor(sd); vec3 f = fract(sd);
    float hs = skyHash(cell);
    if (hs > 0.972) {
      vec3 sp = vec3(skyHash(cell + 1.3), skyHash(cell + 2.7), skyHash(cell + 5.1)) * 0.8 + 0.1;
      float dist = length(f - sp);
      float w = max(length(fwidth(sd)) * 0.55, 0.035);
      float b = exp(-dist * dist / (w * w)) * pow((hs - 0.972) / 0.028, 2.2);
      float tw = 0.75 + 0.25 * sin(uSkyTime * (2.0 + 6.0 * skyHash(cell + 9.0)) + hs * 400.0);
      vec3 sc = mix(vec3(0.75, 0.85, 1.0), vec3(1.0, 0.9, 0.75), skyHash(cell + 4.0));
      col += sc * b * tw * uStars * 1.6 * smoothstep(0.02, 0.3, h);
    }
  }
#endif
  // moon: aureole + disc (limb darkening, soft maria)
  float cm = dot(d, uMoonDir);
  float ang = acos(clamp(cm, -1.0, 1.0));
  col += uMoonColor * uMoonHalo * (0.6 * exp(-ang * ang / 0.0016) + 0.25 * exp(-ang * 9.0) + 0.06 * exp(-ang * 2.5));
  if (withDisc > 0.5 && ang < uMoonSize * 1.2) {
    vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), uMoonDir)); vec3 up = cross(uMoonDir, rt);
    vec2 l = vec2(dot(d, rt), dot(d, up)) / uMoonSize;
    float r2 = dot(l, l);
    float disc = smoothstep(1.0, 0.94, sqrt(r2));
    float maria = 0.78 + 0.22 * smoothstep(0.35, 0.65, texture2D(uSkyNoise, l * 0.18 + 0.37).r);
    col += uMoonColor * uMoonIntensity * disc * maria * pow(max(1.0 - r2, 0.0), 0.25);
  }
  // clouds over everything above (occlude stars/moon disc), lit by moon (silver lining) & low sun
  float cov = skyCloud(d);
  if (cov > 0.0) {
    vec2 cp = d.xz / (h + 0.09) * uCloudScale + uWind * uSkyTime;
    float n2 = texture2D(uSkyNoise, cp * 3.1 + 0.5).g;
    float thin = 1.0 - smoothstep(0.15, 0.75, cov);
    vec3 cc = mix(uCloudDark, uCloudLit, clamp(0.3 + 0.55 * n2 + 0.3 * thin, 0.0, 1.0));
    cc += uMoonColor * uMoonHalo * 3.0 * thin * pow(max(cm, 0.0), 24.0);
    cc += uSunColor * uSunGlow * 0.9 * pow(max(cs * 0.5 + 0.5, 0.0), 4.0) * horiz * (0.4 + 0.6 * thin);
    col = mix(col, cc, cov);
  }
  return col * uSkyExposure;
}
`;

function presetUniforms(p) {
  const col = (v) => C(v[0], v[1]);
  return {
    uZenith: col(p.zenith), uHorizon: col(p.horizon), uGround: col(p.ground), uHazeColor: col(p.haze), uHaze: p.hazeAmt,
    uSunDir: dirFromAngles(p.sunAz, p.sunElev), uSunColor: col(p.sunColor), uSunGlow: p.sunGlow, uSunGlowWidth: p.sunGlowWidth, uSunDisc: p.sunDisc, uSunSharp: p.sunSharp ?? 7,
    uMoonDir: dirFromAngles(p.moonAz, p.moonElev), uMoonColor: col(p.moonColor), uMoonSize: p.moonSize, uMoonIntensity: p.moonIntensity, uMoonHalo: p.moonHalo,
    uStars: p.stars, uCloudCover: p.cloudCover, uCloudDensity: p.cloudDensity, uCloudScale: p.cloudScale,
    uCloudLit: col(p.cloudLit), uCloudDark: col(p.cloudDark), uWind: new THREE.Vector2(p.wind[0], p.wind[1]),
  };
}
function resolve(params) {
  const base = SKY_PRESETS[params.preset || 'night'] || SKY_PRESETS.night;
  return { ...base, ...params };
}
const lerpVal = (a, b, t) => {
  if (a && a.isColor) return a.clone().lerp(b, t);
  if (a && a.isVector3) return a.clone().lerp(b, t).normalize();
  if (a && a.isVector2) return a.clone().lerp(b, t);
  return a + (b - a) * t;
};

// createSky(params): params = preset name + any preset field override (sunAz, moonElev, cloudCover, …) + exposure
export function createSky(params = {}) {
  const uniforms = {
    uSkyNoise: { value: noiseTexture() }, uSkyTime: { value: 0 }, uSkyExposure: { value: params.exposure ?? 1 },
  };
  const apply = (u) => { for (const [k, v] of Object.entries(u)) { if (!uniforms[k]) uniforms[k] = { value: v }; else if (v && v.copy && uniforms[k].value && uniforms[k].value.copy) uniforms[k].value.copy(v); else uniforms[k].value = v; } };
  let current = resolve(params);
  apply(presetUniforms(current));

  const mat = new THREE.ShaderMaterial({
    uniforms, side: THREE.BackSide, depthWrite: false, depthTest: true, fog: false,
    vertexShader: /* glsl */ `varying vec3 vDir;
      void main(){ vDir = position; vec4 p = projectionMatrix * viewMatrix * vec4(position + cameraPosition, 1.0); p.z = p.w * 0.99999; gl_Position = p; }`,
    fragmentShader: SKY_GLSL + /* glsl */ `varying vec3 vDir; void main(){ gl_FragColor = vec4(skyRadiance(vDir, 1.0), 1.0); }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(10, 64, 32), mat);
  mesh.frustumCulled = false; mesh.renderOrder = -1000; mesh.name = 'sky';

  const sky = {
    object3D: mesh, uniforms, material: mat,
    get params() { return current; },
    update(T) { uniforms.uSkyTime.value = T; },
    set(p) { current = resolve({ ...(p.preset ? {} : current), ...p }); apply(presetUniforms(current)); if (p.exposure !== undefined) uniforms.uSkyExposure.value = p.exposure; return sky; },
    // blend two presets (names or param objects), t 0..1 — e.g. night → predawn → dawn over the outro
    blend(a, b, t, extra = {}) {
      const pa = presetUniforms(resolve(typeof a === 'string' ? { preset: a, ...extra } : a)), pb = presetUniforms(resolve(typeof b === 'string' ? { preset: b, ...extra } : b));
      const u = {}; for (const k of Object.keys(pa)) u[k] = lerpVal(pa[k], pb[k], t);
      apply(u); return sky;
    },
    sunDir: () => uniforms.uSunDir.value.clone(), moonDir: () => uniforms.uMoonDir.value.clone(),
    // CPU estimate of the radiance near the horizon (for scene.fog / far haze), optionally toward a direction
    horizonColor(dir = null) {
      const u = (k) => uniforms[k].value;
      const c = u('uHorizon').clone().lerp(u('uHazeColor'), u('uHaze') * 0.77);
      if (dir) { const d = dir.clone().setY(0).normalize(); const cs = d.dot(u('uSunDir')); c.add(u('uSunColor').clone().multiplyScalar(u('uSunGlow') * Math.pow(Math.max(cs * 0.5 + 0.5, 0), 5) * 0.8)); }
      return c.multiplyScalar(uniforms.uSkyExposure.value);
    },
    zenithColor() { return uniforms.uZenith.value.clone().multiplyScalar(uniforms.uSkyExposure.value); },
    // Matching lights: moon (or sun) DirectionalLight + HemisphereLight sky/ground fill. Positions it `dist` along the dir.
    makeLights({ dist = 60, moonIntensity = null, hemiIntensity = 1.0, castShadow = false } = {}) {
      const md = uniforms.uMoonDir.value, sd = uniforms.uSunDir.value;
      const sunUp = sd.y > -0.02 && uniforms.uSunGlow.value > 0.5;
      const dir = sunUp ? sd : md;
      const col = sunUp ? uniforms.uSunColor.value.clone() : uniforms.uMoonColor.value.clone();
      const inten = moonIntensity ?? (sunUp ? 1.6 : 0.25 + uniforms.uMoonIntensity.value * 0.06);
      const moon = new THREE.DirectionalLight(col.clone().multiplyScalar(1 / Math.max(col.r, col.g, col.b, 1e-3)), inten);
      moon.position.copy(dir).multiplyScalar(dist); moon.castShadow = castShadow;
      if (castShadow) { moon.shadow.mapSize.set(2048, 2048); const c = moon.shadow.camera; c.left = c.bottom = -12; c.right = c.top = 12; c.near = 1; c.far = dist * 2; moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.02; }
      const z = sky.zenithColor(), h = sky.horizonColor();
      const hemi = new THREE.HemisphereLight(z.clone().lerp(h, 0.4).multiplyScalar(2.2), uniforms.uGround.value.clone().multiplyScalar(1.5), hemiIntensity);
      return { moon, hemi };
    },
  };
  sky.update(0);
  return sky;
}

// Stand-alone moon billboard (for window views / scenes without the dome). Always faces the camera.
export function moonSprite({ size = 1, color = '#c9d3e0', intensity = 8, halo = 0.6, haloSize = 6 } = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: C(color) }, uInt: { value: intensity }, uHalo: { value: halo }, uHaloSize: { value: haloSize }, uNoise: { value: noiseTexture() } },
    vertexShader: /* glsl */ `varying vec2 vUv; void main(){ vUv = uv * 2.0 - 1.0; vec4 mv = modelViewMatrix * vec4(0.0,0.0,0.0,1.0); float s = length(modelMatrix[0].xyz); mv.xy += position.xy * s; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `varying vec2 vUv; uniform vec3 uColor; uniform float uInt, uHalo, uHaloSize; uniform sampler2D uNoise;
      void main(){ vec2 l = vUv * uHaloSize; float r = length(l);
        float disc = smoothstep(1.0, 0.94, r); float maria = 0.78 + 0.22 * smoothstep(0.35, 0.65, texture2D(uNoise, l * 0.18 + 0.37).r);
        vec3 c = uColor * (uInt * disc * maria * pow(max(1.0 - r*r, 0.0), 0.25) + uHalo * (exp(-r*r*0.15) * 0.5 + exp(-r * 0.8) * 0.3) * smoothstep(1.0, 0.7, length(vUv)));
        gl_FragColor = vec4(c, 1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  m.scale.setScalar(size * haloSize); m.frustumCulled = false; m.renderOrder = -900;
  return { object3D: m, material: mat, update() {} };
}
