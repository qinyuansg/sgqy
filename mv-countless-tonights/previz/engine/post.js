// Film post chain: scene (linear HDR; FXAA by default, 4× MSAA per shot with aa:'msaa') [+ half-res additive layer]
// -> depth of field (half-res gather) -> bloom/halation -> ACES + grade (+ FXAA) + grain.
// Each Chain renders one shot into its own display-referred RGBA8 target so the engine can dissolve two shots.
import * as THREE from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SENSOR_W } from './cam.js';

const FS_VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

function fsQuad(material) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  m.frustumCulled = false;
  const s = new THREE.Scene(); s.add(m);
  return { scene: s, mesh: m, cam: new THREE.Camera() };
}

// Depth of field, half resolution (≈5× cheaper than a full-res gather on SwiftShader, and smoother bokeh):
//   1. COC_FRAG   full-res colour + depth → half-res RGBA16F (rgb = 2×2 box average, a = signed CoC in FULL-res px,
//                 the largest |CoC| of the 4 texels so half-res texels straddling a sharp edge blur with their side)
//   2. GATHER_FRAG half-res: own-CoC gather (background / own blur, skipped for in-focus pixels) + a wide ring that only
//                 collects nearer, more-blurred samples (foreground spilling over sharper things, energy-normalised
//                 coverage). Sample pattern rotated per pixel (interleaved gradient noise): no star / ring stamps on
//                 small bright points (candle flames, dust motes, lamp glints).
//   3. MERGE_FRAG full-res: mix(sharp, blurred, a) where a = max(own-blur ramp, foreground coverage).
const DOF_COMMON = /* glsl */ `
uniform float near, far, focusMM, focalMM, fstop, sensorW, width, maxCoc;
float cocAt(float zmm){ // signed circle of confusion in full-res pixels (+ far, - near)
  float A = focalMM / fstop;
  float c = A * focalMM * (zmm - focusMM) / (zmm * max(focusMM - focalMM, 1.0));
  return clamp(c / sensorW * width, -maxCoc, maxCoc);
}`;
const COC_FRAG = /* glsl */ `
#include <packing>
varying vec2 vUv;
uniform sampler2D tColor; uniform sampler2D tDepth; uniform vec2 texel;
` + DOF_COMMON + `
float viewZmm(vec2 uv){ float d = texture2D(tDepth, uv).x; return -perspectiveDepthToViewZ(d, near, far) * 1000.0; }
void main(){
  vec3 c = texture2D(tColor, vUv).rgb;               // half-res pixel centre = corner of 4 full-res texels → box average
  vec2 h = 0.5 * texel;
  float c0 = cocAt(viewZmm(vUv + vec2(-h.x, -h.y))), c1 = cocAt(viewZmm(vUv + vec2(h.x, -h.y)));
  float c2 = cocAt(viewZmm(vUv + vec2(-h.x, h.y))), c3 = cocAt(viewZmm(vUv + vec2(h.x, h.y)));
  float a = abs(c0) > abs(c1) ? c0 : c1, b = abs(c2) > abs(c3) ? c2 : c3;
  gl_FragColor = vec4(c, abs(a) > abs(b) ? a : b);  // max-|CoC| downsample: texels straddling a sharp edge count as blurred
}`;
const GATHER_FRAG = /* glsl */ `
varying vec2 vUv;
uniform sampler2D tHalf; uniform vec2 texelH; uniform float maxCoc;
float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
void main(){
  vec4 b = texture2D(tHalf, vUv);
  float c0 = b.a, r0 = abs(c0);
  const float GA = 2.39996323;
  float rot = ign(gl_FragCoord.xy) * 6.2831853;
  vec2 pxUV = 0.5 * texelH;                          // one FULL-res pixel in half-res uv
  // (1) own blur: samples spread over the pixel's own CoC
  vec3 accB = b.rgb; float wB = 1.0;
  if (r0 > 0.6) {
    const int NA = 20;
    for (int i = 0; i < NA; i++) {
      float fi = float(i) + 0.5;
      float th = fi * GA + rot;
      vec2 o = vec2(cos(th), sin(th)) * sqrt(fi / float(NA)) * r0;
      vec4 s = texture2D(tHalf, vUv + o * pxUV);
      float rs = abs(s.a), d = length(o);
      float rEff = (s.a < c0) ? rs : min(rs, r0);    // nearer samples may spill, farther only within our own CoC
      float w = smoothstep(d - 1.0, d + 0.75, rEff);
      accB += s.rgb * w; wB += w;
    }
  }
  vec3 bg = accB / wB;
  // (2) foreground spill: nearer & more blurred samples anywhere within maxCoc
  const int NB = 16;
  vec3 accF = vec3(0.0); float wF = 0.0, cov = 0.0;
  float R2 = maxCoc * maxCoc;
  for (int i = 0; i < NB; i++) {
    float fi = float(i) + 0.5;
    float th = fi * GA - rot * 1.618;
    vec2 o = vec2(cos(th), sin(th)) * sqrt(fi / float(NB)) * maxCoc;
    vec4 s = texture2D(tHalf, vUv + o * pxUV);
    float rs = abs(s.a), d = length(o);
    if (s.a < c0 - 1.0 && rs > r0 + 0.5) {
      float w = smoothstep(d - 1.0, d + 0.75, rs);
      accF += s.rgb * w; wF += w;
      cov += w * min(R2 / max(rs * rs, 1.0), 12.0);  // each sample stands for R²/N px of a disc of area rs²
    }
  }
  float fc = clamp(cov / float(NB), 0.0, 1.0);
  vec3 col = wF > 0.0 ? mix(bg, accF / wF, fc) : bg;
  gl_FragColor = vec4(col, fc);
}`;
// own-blur ramp from the FULL-res depth (no half-res stair-steps along in-focus silhouettes), foreground coverage from the gather
const MERGE_FRAG = /* glsl */ `
#include <packing>
varying vec2 vUv; uniform sampler2D tColor, tBlur, tDepth, tLow; uniform vec2 texel; uniform float uLow;
` + DOF_COMMON + `
void main(){
  vec3 s = texture2D(tColor, vUv).rgb;
  // 4 bilinear taps 1 px apart on the half-res result ≈ 3×3 tent: removes the gather's per-pixel rotation noise
  vec4 b = 0.25 * (texture2D(tBlur, vUv + vec2(-texel.x, -texel.y)) + texture2D(tBlur, vUv + vec2(texel.x, -texel.y))
                 + texture2D(tBlur, vUv + vec2(-texel.x, texel.y)) + texture2D(tBlur, vUv + vec2(texel.x, texel.y)));
  float z = -perspectiveDepthToViewZ(texture2D(tDepth, vUv).x, near, far) * 1000.0;
  float a = max(smoothstep(0.6, 2.2, abs(cocAt(z))), b.a);
  gl_FragColor = vec4(mix(s, b.rgb, a) + uLow * texture2D(tLow, vUv).rgb, 1.0);
}`;
const COPY_FRAG = /* glsl */ `varying vec2 vUv; uniform sampler2D tColor, tLow; uniform float uLow;
void main(){ gl_FragColor = vec4(texture2D(tColor, vUv).rgb + uLow * texture2D(tLow, vUv).rgb, 1.0); }`;

// Half-resolution layer for soft ADDITIVE, UNLIT effects (volumetric window shafts, light cones): objects with
// object.layers.set(LOWRES_LAYER) are skipped by the main pass and rendered at half res against a downsampled depth
// buffer (farthest of each 2×2, so light may graze a silhouette rather than leave a dark halo), then added back
// before bloom. ≈4× cheaper fill. Lights are not visible to that pass — only unlit materials belong there.
export const LOWRES_LAYER = 1;
const DEPTHDOWN_FRAG = /* glsl */ `varying vec2 vUv; uniform sampler2D tDepth; uniform vec2 texel;
void main(){ vec2 h = 0.5 * texel;
  float d = max(max(texture2D(tDepth, vUv + vec2(-h.x, -h.y)).x, texture2D(tDepth, vUv + vec2(h.x, -h.y)).x),
                max(texture2D(tDepth, vUv + vec2(-h.x, h.y)).x, texture2D(tDepth, vUv + vec2(h.x, h.y)).x));
  gl_FragDepth = d; gl_FragColor = vec4(0.0); }`;

const GRADE_FRAG = /* glsl */ `
varying vec2 vUv;
uniform sampler2D tColor; uniform vec2 res; uniform float frame;
uniform float exposure, contrast, saturation, temp, tint, vignette, grain, halation, fade, aberration;
uniform vec3 lift, gamma, gain, shadowTint, highTint;
uniform float splitBalance, fxaa;
// FXAA (Lottes, "PC fast" variant) on the linear HDR image, luma Reinhard-compressed: the alternative to 4× MSAA
// for geometry-heavy shots (aa:'fxaa' — MSAA rasterisation of skinned figures is the single biggest cost there)
float fxL(vec3 c){ float l = dot(c, vec3(0.2126, 0.7152, 0.0722)); return sqrt(l / (1.0 + l)); }
vec3 fxaaAt(vec2 uv){
  vec2 px = 1.0 / res;
  vec3 cNW = texture2D(tColor, uv + vec2(-0.5, -0.5) * px).rgb, cNE = texture2D(tColor, uv + vec2(0.5, -0.5) * px).rgb;
  vec3 cSW = texture2D(tColor, uv + vec2(-0.5, 0.5) * px).rgb, cSE = texture2D(tColor, uv + vec2(0.5, 0.5) * px).rgb;
  vec3 cM = texture2D(tColor, uv).rgb;
  float lNW = fxL(cNW), lNE = fxL(cNE), lSW = fxL(cSW), lSE = fxL(cSE), lM = fxL(cM);
  float lMin = min(lM, min(min(lNW, lNE), min(lSW, lSE))), lMax = max(lM, max(max(lNW, lNE), max(lSW, lSE)));
  if (lMax - lMin < max(0.0312, lMax * 0.125)) return cM;
  vec2 dir = vec2(-((lNW + lNE) - (lSW + lSE)), ((lNW + lSW) - (lNE + lSE)));
  float red = max((lNW + lNE + lSW + lSE) * 0.03125, 1.0 / 128.0);
  dir = clamp(dir / (min(abs(dir.x), abs(dir.y)) + red), -8.0, 8.0) * px;
  vec3 a = 0.5 * (texture2D(tColor, uv + dir * (1.0 / 3.0 - 0.5)).rgb + texture2D(tColor, uv + dir * (2.0 / 3.0 - 0.5)).rgb);
  vec3 b = a * 0.5 + 0.25 * (texture2D(tColor, uv - dir * 0.5).rgb + texture2D(tColor, uv + dir * 0.5).rgb);
  float lb = fxL(b);
  return (lb < lMin || lb > lMax) ? a : b;
}
vec3 aces(vec3 x){ const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }
vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4))-0.055, step(0.0031308, c)); }
// integer PCG hash: exact at any frame number (the old float hash banded into stripes past ~f2100)
uint pcg(uint v){ uint s = v * 747796405u + 2891336453u; uint w = ((s >> ((s >> 28u) + 4u)) ^ s) * 277803737u; return (w >> 22u) ^ w; }
float rnd3(uvec3 p){ return float(pcg(p.x + pcg(p.y + pcg(p.z)))) * (1.0 / 4294967295.0); }
void main(){
  vec2 uv = vUv;
  vec2 dc = (uv - 0.5);
  vec3 col;
  vec3 c0 = texture2D(tColor, uv).rgb;
  vec3 aaD = fxaa > 0.5 ? fxaaAt(uv) - c0 : vec3(0.0);   // AA correction, carried onto the aberration-offset channels
  if (aberration > 0.0) {
    vec2 off = dc * aberration * 0.004;
    col = vec3(texture2D(tColor, uv + off).r, c0.g, texture2D(tColor, uv - off).b) + aaD;
  } else col = c0 + aaD;
  col = max(col, 0.0);
  col *= exposure;
  // white balance: temp (+warm / -cool), tint (+magenta / -green)
  col *= vec3(1.0 + temp * 0.18 + tint*0.05, 1.0 - tint * 0.08, 1.0 - temp * 0.22 + tint*0.05);
  col = aces(col);
  col = toSRGB(col);
  // lift / gamma / gain (ASC-ish)
  col = gain * (col + lift * (1.0 - col));
  col = pow(max(col, 0.0), 1.0 / gamma);
  // contrast around mid grey
  col = (col - 0.5) * contrast + 0.5;
  // split toning
  float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  float sh = 1.0 - smoothstep(0.0, 0.5 + splitBalance, l);
  float hi = smoothstep(0.5 + splitBalance, 1.0, l);
  col += (shadowTint - 0.5) * 0.25 * sh + (highTint - 0.5) * 0.25 * hi;
  // saturation
  l = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(l), col, saturation);
  // vignette (anamorphic-ish oval)
  float v = 1.0 - vignette * smoothstep(0.25, 0.95, length(dc * vec2(1.0, 0.75)) * 1.25);
  col *= v;
  // film grain, luminance-weighted, new pattern every frame
  uvec2 pix = uvec2(gl_FragCoord.xy); uint fr = uint(frame);
  float g = rnd3(uvec3(pix, fr)) + rnd3(uvec3(pix, fr + 104729u)) - 1.0;
  float lw = 4.0 * l * (1.0 - l) + 0.25;
  col += g * grain * lw;
  // fade to black (for fade in / out)
  col *= (1.0 - fade);
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

export const DEFAULT_POST = {
  exposure: 1.0, contrast: 1.04, saturation: 0.92, temp: 0, tint: 0,
  lift: [0.0, 0.0, 0.0], gamma: [1, 1, 1], gain: [1, 1, 1],
  shadowTint: [0.46, 0.5, 0.58], highTint: [0.55, 0.52, 0.47], splitBalance: 0.0,
  vignette: 0.32, grain: 0.035, aberration: 0.6, fade: 0,
  bloom: { strength: 0.35, radius: 0.55, threshold: 0.85 },
  dof: null, // {focus: metres, fstop: 2.0} or null
  // anti-aliasing: 'fxaa' (default: FXAA in the grade pass) | 'msaa' (4× scene MSAA: crisper sub-pixel lines — rain, glazing
  // bars, hair strands — but SwiftShader's multisampled rasterisation costs ≈0.13 s fixed + ≈0.15 s per close-up hi figure,
  // 1.8 s for a 12-figure lineup) | 'none'
  aa: 'fxaa',
};

export class Chain {
  constructor(renderer, W, H, { samples = 4, aa = null } = {}) {
    this.renderer = renderer; this.W = W; this.H = H; this.forceAA = aa; // aa: force 'msaa'|'fxaa'|'none' for every shot
    const depthTexture = new THREE.DepthTexture(W, H);
    depthTexture.type = THREE.UnsignedIntType;
    this.rtScene = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples, depthTexture, depthBuffer: true });
    const depthTexture1 = new THREE.DepthTexture(W, H);
    depthTexture1.type = THREE.UnsignedIntType;
    this.rtScene1 = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 0, depthTexture: depthTexture1, depthBuffer: true }); // aa:'fxaa'|'none'
    this.rtA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false });
    this.out = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType, depthBuffer: false });
    const Wh = Math.max(2, W >> 1), Hh = Math.max(2, H >> 1);
    this.rtHalfA = new THREE.WebGLRenderTarget(Wh, Hh, { type: THREE.HalfFloatType, depthBuffer: false });
    this.rtHalfB = new THREE.WebGLRenderTarget(Wh, Hh, { type: THREE.HalfFloatType, depthBuffer: false });
    const lens = () => ({ near: { value: 0.1 }, far: { value: 100 }, focusMM: { value: 2000 }, focalMM: { value: 50 }, fstop: { value: 2.8 },
      sensorW: { value: SENSOR_W }, width: { value: W }, maxCoc: { value: Math.max(6, W / 110) } });
    const sm = (frag, uniforms) => new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: frag, depthTest: false, depthWrite: false, uniforms });
    this.cocMat = sm(COC_FRAG, { tColor: { value: this.rtScene.texture }, tDepth: { value: depthTexture }, texel: { value: new THREE.Vector2(1 / W, 1 / H) }, ...lens() });
    this.gatherMat = sm(GATHER_FRAG, { tHalf: { value: this.rtHalfA.texture }, texelH: { value: new THREE.Vector2(1 / Wh, 1 / Hh) }, maxCoc: { value: Math.max(6, W / 110) } });
    this.rtLow = new THREE.WebGLRenderTarget(Wh, Hh, { type: THREE.HalfFloatType, depthBuffer: true });
    const low = () => ({ tLow: { value: this.rtLow.texture }, uLow: { value: 0 } });
    this.mergeMat = sm(MERGE_FRAG, { tColor: { value: this.rtScene.texture }, tBlur: { value: this.rtHalfB.texture }, tDepth: { value: depthTexture }, texel: { value: new THREE.Vector2(1 / W, 1 / H) }, ...lens(), ...low() });
    this.copyMat = sm(COPY_FRAG, { tColor: { value: this.rtScene.texture }, ...low() });
    this.depthDownMat = new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader: DEPTHDOWN_FRAG, depthTest: true, depthFunc: THREE.AlwaysDepth, depthWrite: true, colorWrite: false,
      uniforms: { tDepth: { value: depthTexture }, texel: { value: new THREE.Vector2(1 / W, 1 / H) } } });
    this.depthDownQ = fsQuad(this.depthDownMat);
    this.dofMat = this.cocMat; // (back-compat name: the lens uniforms live here)
    this.cocQ = fsQuad(this.cocMat); this.gatherQ = fsQuad(this.gatherMat); this.mergeQ = fsQuad(this.mergeMat); this.copyQ = fsQuad(this.copyMat);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.4, 0.5, 0.85);
    this.gradeMat = new THREE.ShaderMaterial({
      vertexShader: FS_VERT, fragmentShader: GRADE_FRAG, depthTest: false, depthWrite: false,
      uniforms: Object.fromEntries(Object.entries({
        tColor: this.rtA.texture, res: new THREE.Vector2(W, H), frame: 0,
        exposure: 1, contrast: 1, saturation: 1, temp: 0, tint: 0, vignette: 0.3, grain: 0.03, halation: 0, fade: 0, aberration: 0,
        lift: new THREE.Vector3(), gamma: new THREE.Vector3(1, 1, 1), gain: new THREE.Vector3(1, 1, 1),
        shadowTint: new THREE.Vector3(0.5, 0.5, 0.5), highTint: new THREE.Vector3(0.5, 0.5, 0.5), splitBalance: 0, fxaa: 0,
      }).map(([k, v]) => [k, { value: v }])),
    });
    this.gradeQ = fsQuad(this.gradeMat);
  }

  // Render scene+camera through the chain into this.out. p = merged post params.
  // any visible object on the low-res layer?
  _hasLow(scene) {
    let n = 0;
    scene.traverseVisible((o) => { if (!n && (o.layers.mask & (1 << LOWRES_LAYER)) && (o.isMesh || o.isPoints || o.isLine)) n = 1; });
    return n > 0;
  }

  _renderLow(scene, camera) {
    const r = this.renderer;
    r.setRenderTarget(this.rtLow);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, true);
    r.render(this.depthDownQ.scene, this.depthDownQ.cam);            // depth := farthest of each 2×2 full-res texel
    const bg = scene.background, au = r.autoClear, sm = r.shadowMap.autoUpdate, mask = camera.layers.mask;
    scene.background = null; r.autoClear = false; r.shadowMap.autoUpdate = false;
    camera.layers.set(LOWRES_LAYER);
    r.render(scene, camera);
    camera.layers.mask = mask; scene.background = bg; r.autoClear = au; r.shadowMap.autoUpdate = sm;
  }

  render(scene, camera, p, frame) {
    const r = this.renderer;
    const mask = camera.layers.mask;
    const hasLow = this._hasLow(scene);
    const aa = this.forceAA || p.aa;
    const rt = aa === 'fxaa' || aa === 'none' ? this.rtScene1 : this.rtScene;
    if (this._rt !== rt) { // re-point the post passes at the chosen scene target
      this._rt = rt;
      this.cocMat.uniforms.tColor.value = this.mergeMat.uniforms.tColor.value = this.copyMat.uniforms.tColor.value = rt.texture;
      this.cocMat.uniforms.tDepth.value = this.mergeMat.uniforms.tDepth.value = this.depthDownMat.uniforms.tDepth.value = rt.depthTexture;
    }
    camera.layers.disable(LOWRES_LAYER);
    r.setRenderTarget(rt);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, true);
    r.render(scene, camera);
    camera.layers.mask = mask;
    if (hasLow) this._renderLow(scene, camera);
    this.copyMat.uniforms.uLow.value = this.mergeMat.uniforms.uLow.value = hasLow ? 1 : 0;

    if (p.dof) {
      const du = this.cocMat.uniforms;
      du.near.value = camera.near; du.far.value = camera.far;
      du.focusMM.value = Math.max(0.05, p.dof.focus) * 1000;
      du.focalMM.value = camera.userData.mm || 50;
      du.fstop.value = p.dof.fstop || 2.8;
      du.maxCoc.value = this.gatherMat.uniforms.maxCoc.value = (p.dof.maxCoc || 1) * Math.max(6, this.W / 110);
      const mu = this.mergeMat.uniforms;
      for (const k of ['near', 'far', 'focusMM', 'focalMM', 'fstop', 'maxCoc']) mu[k].value = du[k].value;
      r.setRenderTarget(this.rtHalfA); r.render(this.cocQ.scene, this.cocQ.cam);
      r.setRenderTarget(this.rtHalfB); r.render(this.gatherQ.scene, this.gatherQ.cam);
      r.setRenderTarget(this.rtA); r.render(this.mergeQ.scene, this.mergeQ.cam);
    } else {
      r.setRenderTarget(this.rtA); r.render(this.copyQ.scene, this.copyQ.cam);
    }

    const b = p.bloom || {};
    if ((b.strength || 0) > 0.001) {
      this.bloom.strength = b.strength; this.bloom.radius = b.radius ?? 0.5; this.bloom.threshold = b.threshold ?? 0.85;
      this.bloom.renderToScreen = false;
      this.bloom.render(r, null, this.rtA, 0, false);
    }

    const g = this.gradeMat.uniforms;
    for (const k of ['exposure', 'contrast', 'saturation', 'temp', 'tint', 'vignette', 'grain', 'fade', 'aberration', 'splitBalance']) g[k].value = p[k];
    for (const k of ['lift', 'gamma', 'gain', 'shadowTint', 'highTint']) g[k].value.fromArray(p[k]);
    g.frame.value = frame;
    g.fxaa.value = aa === 'fxaa' ? 1 : 0;
    r.setRenderTarget(this.out);
    r.render(this.gradeQ.scene, this.gradeQ.cam);
    r.setRenderTarget(null);
    return this.out.texture;
  }
}

// Final blit to the canvas: mix(A, B, mixAmt), optional additive light flash, fade.
export class Display {
  constructor(renderer) {
    this.renderer = renderer;
    this.mat = new THREE.ShaderMaterial({
      vertexShader: FS_VERT, depthTest: false, depthWrite: false,
      fragmentShader: /* glsl */ `varying vec2 vUv; uniform sampler2D tA, tB; uniform float mixAmt, flash, fade, mode;
        void main(){ vec3 a = texture2D(tA, vUv).rgb; vec3 b = texture2D(tB, vUv).rgb;
          vec3 c;
          if (mode < 0.5) c = mix(a, b, mixAmt);
          else { // luminance-keyed "light" dissolve: brights of B arrive first
            float lb = dot(b, vec3(0.3,0.59,0.11)); float k = smoothstep(mixAmt*1.4-0.4, mixAmt*1.4, lb*0.6+mixAmt*0.4);
            c = mix(a, b, clamp(max(k, mixAmt*mixAmt), 0.0, 1.0)); }
          c += flash; c *= (1.0 - fade); gl_FragColor = vec4(clamp(c,0.0,1.0), 1.0); }`,
      uniforms: { tA: { value: null }, tB: { value: null }, mixAmt: { value: 0 }, flash: { value: 0 }, fade: { value: 0 }, mode: { value: 0 } },
    });
    this.q = fsQuad(this.mat);
  }
  show(texA, texB = null, mixAmt = 0, { flash = 0, fade = 0, mode = 0 } = {}) {
    const u = this.mat.uniforms;
    u.tA.value = texA; u.tB.value = texB || texA; u.mixAmt.value = texB ? mixAmt : 0;
    u.flash.value = flash; u.fade.value = fade; u.mode.value = mode;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.q.scene, this.q.cam);
  }
}

export function mergePost(...ps) {
  const out = JSON.parse(JSON.stringify(DEFAULT_POST));
  for (const p of ps) {
    if (!p) continue;
    for (const [k, v] of Object.entries(p)) {
      if (k === 'bloom' && v) out.bloom = { ...out.bloom, ...v };
      else if (k === 'dof') out.dof = v ? { ...v } : null;
      else if (v !== undefined) out[k] = v;
    }
  }
  return out;
}
