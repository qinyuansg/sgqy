// Film post chain: scene (linear HDR, MSAA) -> depth of field -> bloom/halation -> ACES + grade + grain.
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

const DOF_FRAG = /* glsl */ `
#include <packing>
varying vec2 vUv;
uniform sampler2D tColor; uniform sampler2D tDepth;
uniform float near, far, focusMM, focalMM, fstop, sensorW, width, maxCoc;
uniform vec2 texel; uniform float enabled;
float viewZmm(vec2 uv){ float d = texture2D(tDepth, uv).x; return -perspectiveDepthToViewZ(d, near, far) * 1000.0; }
float coc(float z){ // signed circle of confusion in pixels (+ far, - near)
  float A = focalMM / fstop;
  float c = A * focalMM * (z - focusMM) / (z * max(focusMM - focalMM, 1.0));
  return clamp(c / sensorW * width, -maxCoc, maxCoc);
}
void main(){
  vec4 base = texture2D(tColor, vUv);
  if (enabled < 0.5) { gl_FragColor = base; return; }
  float c0 = coc(viewZmm(vUv));
  float r0 = abs(c0);
  vec3 acc = base.rgb; float wsum = 1.0;
  const int N = 28; const float GA = 2.39996323;
  float searchR = maxCoc;
  for (int i = 0; i < N; i++) {
    float fi = float(i) + 0.5;
    float rr = sqrt(fi / float(N));
    float th = fi * GA;
    vec2 o = vec2(cos(th), sin(th)) * rr * searchR;
    vec2 uv = vUv + o * texel;
    float cs = coc(viewZmm(uv));
    float d = length(o);
    // nearer samples may spill their blur over us; farther samples only within our own CoC
    float rEff = (cs < c0) ? abs(cs) : min(abs(cs), r0);
    float w = smoothstep(d - 1.0, d + 0.5, rEff);
    vec3 s = texture2D(tColor, uv).rgb;
    acc += s * w; wsum += w;
  }
  gl_FragColor = vec4(acc / wsum, base.a);
}`;

const GRADE_FRAG = /* glsl */ `
varying vec2 vUv;
uniform sampler2D tColor; uniform vec2 res; uniform float frame;
uniform float exposure, contrast, saturation, temp, tint, vignette, grain, halation, fade, aberration;
uniform vec3 lift, gamma, gain, shadowTint, highTint;
uniform float splitBalance;
vec3 aces(vec3 x){ const float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14; return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0); }
vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1.0/2.4))-0.055, step(0.0031308, c)); }
float hash(vec2 p){ p = fract(p*vec2(443.897,441.423)); p += dot(p, p.yx+19.19); return fract((p.x+p.y)*p.x); }
void main(){
  vec2 uv = vUv;
  vec2 dc = (uv - 0.5);
  vec3 col;
  if (aberration > 0.0) {
    vec2 off = dc * aberration * 0.004;
    col = vec3(texture2D(tColor, uv + off).r, texture2D(tColor, uv).g, texture2D(tColor, uv - off).b);
  } else col = texture2D(tColor, uv).rgb;
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
  float g = hash(uv * res + frame * 17.13) + hash(uv * res * 1.7 - frame * 3.7) - 1.0;
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
};

export class Chain {
  constructor(renderer, W, H) {
    this.renderer = renderer; this.W = W; this.H = H;
    const depthTexture = new THREE.DepthTexture(W, H);
    depthTexture.type = THREE.UnsignedIntType;
    this.rtScene = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4, depthTexture, depthBuffer: true });
    this.rtA = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false });
    this.out = new THREE.WebGLRenderTarget(W, H, { type: THREE.UnsignedByteType, depthBuffer: false });
    this.dofMat = new THREE.ShaderMaterial({
      vertexShader: FS_VERT, fragmentShader: DOF_FRAG, depthTest: false, depthWrite: false,
      uniforms: {
        tColor: { value: this.rtScene.texture }, tDepth: { value: depthTexture },
        near: { value: 0.1 }, far: { value: 100 }, focusMM: { value: 2000 }, focalMM: { value: 50 }, fstop: { value: 2.8 },
        sensorW: { value: SENSOR_W }, width: { value: W }, maxCoc: { value: Math.max(6, W / 110) },
        texel: { value: new THREE.Vector2(1 / W, 1 / H) }, enabled: { value: 0 },
      },
    });
    this.dofQ = fsQuad(this.dofMat);
    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.4, 0.5, 0.85);
    this.gradeMat = new THREE.ShaderMaterial({
      vertexShader: FS_VERT, fragmentShader: GRADE_FRAG, depthTest: false, depthWrite: false,
      uniforms: Object.fromEntries(Object.entries({
        tColor: this.rtA.texture, res: new THREE.Vector2(W, H), frame: 0,
        exposure: 1, contrast: 1, saturation: 1, temp: 0, tint: 0, vignette: 0.3, grain: 0.03, halation: 0, fade: 0, aberration: 0,
        lift: new THREE.Vector3(), gamma: new THREE.Vector3(1, 1, 1), gain: new THREE.Vector3(1, 1, 1),
        shadowTint: new THREE.Vector3(0.5, 0.5, 0.5), highTint: new THREE.Vector3(0.5, 0.5, 0.5), splitBalance: 0,
      }).map(([k, v]) => [k, { value: v }])),
    });
    this.gradeQ = fsQuad(this.gradeMat);
  }

  // Render scene+camera through the chain into this.out. p = merged post params.
  render(scene, camera, p, frame) {
    const r = this.renderer;
    r.setRenderTarget(this.rtScene);
    r.setClearColor(0x000000, 1);
    r.clear(true, true, true);
    r.render(scene, camera);

    const du = this.dofMat.uniforms;
    du.enabled.value = p.dof ? 1 : 0;
    if (p.dof) {
      du.near.value = camera.near; du.far.value = camera.far;
      du.focusMM.value = Math.max(0.05, p.dof.focus) * 1000;
      du.focalMM.value = camera.userData.mm || 50;
      du.fstop.value = p.dof.fstop || 2.8;
      du.maxCoc.value = (p.dof.maxCoc || 1) * Math.max(6, this.W / 110);
    }
    r.setRenderTarget(this.rtA);
    r.render(this.dofQ.scene, this.dofQ.cam);

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
