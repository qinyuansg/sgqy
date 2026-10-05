// Deterministic FX helpers. Every effect is a pure function of time: build once, then call update(T, opts) each frame.
// Each returns { object3D, update(T, opts?) } (+ extras). Nothing accumulates state, so frames can render out of order.
//
//   import * as FX from '/previz/lib/fx.js';
//   const c = FX.candle({ height: 0.09 }); c.object3D.position.set(0, 0.76, 0); scene.add(c.object3D);
//   const s = FX.windowShaft({ center, right, up, dir, length: 6, cookie: TX.windowCookie().map }); scene.add(s.object3D);
//   const d = FX.dustMotes({ center, size: [3, 2.5, 3], beam: { shaft: s } }); scene.add(d.object3D);
//   per frame: c.update(T); s.update(T); d.update(T, { camera, focus: 2.2, fstop: 2 });
import * as THREE from 'three';
import { noiseTexture, spriteTexture } from './textures.js';
import { rng, flicker, noise1, fbm1 } from '../engine/util.js';
import { LOWRES_LAYER } from '../engine/post.js'; // soft additive volumetrics render at half resolution (see engine/post.js)

const V3 = (a) => (a && a.isVector3 ? a.clone() : new THREE.Vector3(...(a || [0, 0, 0])));
const COL = (c, k = 1) => (c && c.isColor ? c.clone() : new THREE.Color(c ?? 0xffffff)).multiplyScalar(k);
const IGN = /* glsl */ `float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }`;

// camera → { pxScale (px per unit size at depth 1), mm, H } for point-size & defocus
function camInfo(camera, H) {
  const h = H || (camera && camera.userData && camera.userData.H) || 536;
  if (!camera) return { pxScale: 1000, mm: 50, H: h };
  return { pxScale: h / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)), mm: camera.userData.mm || 50, H: h };
}

// ------------------------------------------------------------------ glow (round additive billboard halo)
export function glow({ color = 0xffb060, size = 0.2, intensity = 1, falloff = 2.2, core = 0.0 } = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uCol: { value: COL(color) }, uInt: { value: intensity }, uFall: { value: falloff }, uCore: { value: core } },
    vertexShader: /* glsl */ `varying vec2 vUv; uniform float uSize; void main(){ vUv = uv * 2.0 - 1.0;
      vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0); float s = length(modelMatrix[0].xyz); mv.xy += position.xy * s; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `varying vec2 vUv; uniform vec3 uCol; uniform float uInt, uFall, uCore;
      void main(){ float r = length(vUv); if (r > 1.0) discard; float g = exp(-r * r * uFall * 2.0) * (1.0 - r) + uCore * exp(-r * r * 60.0);
        gl_FragColor = vec4(uCol * uInt * g, 1.0); }`,
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
  m.scale.setScalar(size / 2); m.renderOrder = 10; m.frustumCulled = false;
  return { object3D: m, material: mat, set(i) { mat.uniforms.uInt.value = i; }, update() {} };
}

// ------------------------------------------------------------------ volumetric window shaft (oblique prism, ray-marched)
// Window rectangle at `center` with half-extent vectors `right`, `up`; light travels along `dir` for `length` m.
// cookie: texture over the window (mullions / stained glass colours). floorY clips the march at the floor.
// penumbra: angular size of the source (rad; sun/moon ≈ 0.0093 + a little scatter) — the cookie (glazing bars, lead
// lines) blurs with distance from the window instead of streaking down the whole beam as hard stripes.
export function windowShaft({ center = [0, 2, 0], right = [0.6, 0, 0], up = [0, 0.9, 0], dir = [0.4, -0.6, 0.7], length = 6, color = 0xbcd0ff,
  intensity = 0.35, cookie = null, floorY = -1e5, noise = 0.6, soft = 0.12, steps = 10, seed = 0, penumbra = 0.014, lowres = true } = {}) {
  const C = V3(center), R = V3(right), U = V3(up), D = V3(dir).normalize().multiplyScalar(length);
  const ckRes = (cookie && cookie.image && cookie.image.width) || 512;
  // cookie texels per metre of blur, along the window's smaller half-extent
  const lodK = penumbra * length * ckRes / (2 * Math.min(R.length(), U.length()));
  const M = new THREE.Matrix4().makeBasis(R, U, D).setPosition(C);
  const inv = M.clone().invert();
  const geo = new THREE.BoxGeometry(2, 2, 1).translate(0, 0, 0.5);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    defines: { STEPS: steps },
    uniforms: {
      uInv: { value: inv }, uCol: { value: COL(color) }, uInt: { value: intensity }, uT: { value: 0 }, uNoiseAmt: { value: noise },
      uFloorY: { value: floorY }, uCookie: { value: cookie }, uHasCookie: { value: cookie ? 1 : 0 }, uSoft: { value: soft }, uNoise: { value: noiseTexture() }, uSeed: { value: seed },
      uLodK: { value: lodK },
    },
    vertexShader: /* glsl */ `varying vec3 vWorld; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: IGN + /* glsl */ `
      uniform mat4 uInv; uniform vec3 uCol; uniform float uInt, uT, uNoiseAmt, uFloorY, uHasCookie, uSoft, uSeed, uLodK;
      uniform sampler2D uCookie, uNoise; varying vec3 vWorld;
      void main(){
        vec3 ro = (uInv * vec4(cameraPosition, 1.0)).xyz;
        vec3 rdW = normalize(vWorld - cameraPosition);
        vec3 rd = (uInv * vec4(rdW, 0.0)).xyz;
        vec3 iv = 1.0 / rd;
        vec3 t0 = (vec3(-1.0, -1.0, 0.0) - ro) * iv, t1 = (vec3(1.0, 1.0, 1.0) - ro) * iv;
        vec3 tn3 = min(t0, t1), tf3 = max(t0, t1);
        float tn = max(max(tn3.x, tn3.y), tn3.z), tf = min(min(tf3.x, tf3.y), tf3.z);
        bool inside = abs(ro.x) < 1.0 && abs(ro.y) < 1.0 && ro.z > 0.0 && ro.z < 1.0;
        if (inside == gl_FrontFacing) discard;
        tn = max(tn, 0.0);
        if (rdW.y < 0.0) tf = min(tf, (uFloorY - cameraPosition.y) / rdW.y);
        if (tf <= tn) discard;
        float dt = (tf - tn) / float(STEPS);
        float j = ign(gl_FragCoord.xy + uSeed * 17.0);
        // drifting haze density: 3 fetches per pixel (near / mid / far along the ray), interpolated per step
        vec3 wa = cameraPosition + rdW * mix(tn, tf, 0.15), wm = cameraPosition + rdW * mix(tn, tf, 0.5), wb = cameraPosition + rdW * mix(tn, tf, 0.85);
        vec2 drift = vec2(uT * 0.006, uT * 0.004);
        float na = texture2D(uNoise, wa.xz * 0.21 + vec2(wa.y * 0.13, 0.0) + drift).r;
        float nm = texture2D(uNoise, wm.xz * 0.21 + vec2(wm.y * 0.13, 0.0) + drift).r;
        float nb = texture2D(uNoise, wb.xz * 0.21 + vec2(wb.y * 0.13, 0.0) + drift).r;
        vec3 acc = vec3(0.0);
        for (int i = 0; i < STEPS; i++) {
          float f = (float(i) + j) / float(STEPS);
          float t = tn + f * (tf - tn);
          vec3 lp = ro + rd * t;
          float d = clamp(lp.z, 0.0, 1.0);
          float sf = uSoft * (0.08 + d);
          float edge = smoothstep(1.0, 1.0 - sf, abs(lp.x)) * smoothstep(1.0, 1.0 - sf, abs(lp.y));
          vec3 ck = uHasCookie > 0.5 ? textureLod(uCookie, lp.xy * 0.5 + 0.5, log2(1.0 + d * uLodK)).rgb : vec3(1.0);
          float fall = smoothstep(0.0, 0.06, d) * pow(1.0 - d, 1.3);
          float nr = f < 0.5 ? mix(na, nm, clamp((f - 0.15) / 0.35, 0.0, 1.0)) : mix(nm, nb, clamp((f - 0.5) / 0.35, 0.0, 1.0));
          float n = mix(1.0, nr * 1.8 - 0.1, uNoiseAmt);
          acc += ck * (edge * fall * max(n, 0.0));
        }
        gl_FragColor = vec4(uCol * uInt * acc * dt, 1.0);
      }`,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.matrixAutoUpdate = false; mesh.matrix.copy(M); mesh.renderOrder = 20; mesh.frustumCulled = false;
  if (lowres) mesh.layers.set(LOWRES_LAYER);
  // rasterise only the faces the ray enters through: front faces from outside the prism, back faces from inside
  // (halves the fragment work vs DoubleSide; the shader's inside test stays as a safety net)
  const _cl = new THREE.Vector3();
  mesh.onBeforeRender = (r, sc, camera) => {
    _cl.setFromMatrixPosition(camera.matrixWorld).applyMatrix4(inv);
    const inside = Math.abs(_cl.x) < 1.02 && Math.abs(_cl.y) < 1.02 && _cl.z > -0.02 && _cl.z < 1.02;
    const side = inside ? THREE.BackSide : THREE.FrontSide;
    if (mat.side !== side) mat.side = side;
  };
  return { object3D: mesh, material: mat, matrix: M, inverse: inv, center: C, right: R, up: U, dir: D.clone().normalize(), length,
    update(T, o = {}) { mat.uniforms.uT.value = T; if (o.intensity !== undefined) mat.uniforms.uInt.value = o.intensity; } };
}

// Moonlight (or sun) through a window: a far SpotLight aimed through the opening + real shadow casters so the floor
// pool, the glazing-bar shadows and any figure's shadow are physically consistent (SpotLight.map can't follow an
// oblique window). Casters: an alpha-tested lattice plane built from the same `cookie` used by windowShaft (also
// visible as a dark flat lattice; frameVisible:false hides it) + an invisible blocker plane with a hole (so light only
// enters through the opening even if the scene's wall doesn't cast). intensity ≈ illuminance arriving at the window.
// Counts toward the ≤2 shadow-casting-lights budget.
// colored: true → the cookie is projected as the light's colour map instead (stained glass petals of colour on the
// floor), pre-warped so that it lands exactly on the oblique window for this light direction (exact for parallel light).
// bounce: floor albedo for a soft first-bounce fill (default 0.3): an unshadowed PointLight just BELOW the floor pool, so
// the floor itself is not lit by it but walls, pews, figures and ceiling get the upward glow a real sunlit/moonlit pool
// throws back into the room (without it a bright pool sits in a black void). Tinted by the cookie's mean colour when
// colored. floorY: height of the receiving floor (default 0). 0 disables it.
export function windowLight({ center = [0, 2, 0], right = [0.6, 0, 0], up = [0, 0.9, 0], dir = [0.4, -0.6, 0.7], cookie = null, color = 0xbcd0ff,
  intensity = 2, dist = 25, mapSize = 1024, blocker = 6, frameVisible = true, frameColor = 0x15110d, colored = false, bounce = 0.3, floorY = 0, bounceRange = 7 } = {}) {
  const C = V3(center), R = V3(right), U = V3(up), D = V3(dir).normalize();
  const grp = new THREE.Group(); grp.name = 'windowLight';
  const N = new THREE.Vector3().crossVectors(R, U).normalize();
  const basis = new THREE.Matrix4().makeBasis(R.clone().normalize(), U.clone().normalize(), N);
  if (cookie && !colored) {
    const lat = new THREE.Mesh(new THREE.PlaneGeometry(R.length() * 2, U.length() * 2), new THREE.MeshStandardMaterial({ color: frameColor, roughness: 0.7, alphaMap: invertTex(cookie), alphaTest: 0.5, side: THREE.DoubleSide, colorWrite: frameVisible, depthWrite: frameVisible }));
    lat.quaternion.setFromRotationMatrix(basis); lat.position.copy(C); lat.castShadow = true; grp.add(lat); grp.userData.lattice = lat;
  }
  if (blocker > 0) {
    const s = new THREE.Shape(); s.moveTo(-blocker, -blocker); s.lineTo(blocker, -blocker); s.lineTo(blocker, blocker); s.lineTo(-blocker, blocker); s.lineTo(-blocker, -blocker);
    const hw = R.length() * 1.002, hh = U.length() * 1.002, hole = new THREE.Path(); hole.moveTo(-hw, -hh); hole.lineTo(-hw, hh); hole.lineTo(hw, hh); hole.lineTo(hw, -hh); hole.lineTo(-hw, -hh); s.holes.push(hole);
    const bl = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: THREE.DoubleSide }));
    bl.quaternion.setFromRotationMatrix(basis); bl.position.copy(C).addScaledVector(D, -0.04); bl.castShadow = true; bl.renderOrder = -50; grp.add(bl);
  }
  const half = R.clone().add(U).length();
  const light = new THREE.SpotLight(COL(color), intensity * dist * dist, 0, Math.atan(half * 1.08 / dist), 0.05, 2);
  light.position.copy(C).addScaledVector(D, -dist); light.target.position.copy(C);
  light.castShadow = true; light.shadow.mapSize.set(mapSize, mapSize); light.shadow.bias = -0.0002; light.shadow.normalBias = 0.015;
  light.shadow.camera.near = Math.max(0.5, dist - 3); light.shadow.camera.far = dist + 25;
  grp.add(light, light.target);
  if (cookie && colored) light.map = warpCookie(cookie, C, R, U, light, mapSize);
  // first-bounce fill from the floor pool
  let bounceLight = null, bounceK = 0;
  if (bounce > 0 && D.y < -0.05 && C.y > floorY) {
    const t = (floorY - C.y) / D.y, pool = C.clone().addScaledVector(D, t);
    const winArea = 4 * R.length() * U.length(), cosW = Math.abs(D.dot(N));
    const poolArea = winArea * cosW / Math.abs(D.y);
    const mean = cookieMean(cookie, colored);           // fraction of the window that passes light (and its tint)
    // reflected flux Φ = ρ·E·A·(pass); a point source radiating Φ over the upper hemisphere → I ≈ Φ / 2π
    bounceK = bounce * winArea * cosW * mean.pass / (2 * Math.PI); void poolArea;
    bounceLight = new THREE.PointLight(COL(color).multiply(mean.tint), intensity * bounceK, bounceRange, 2);
    bounceLight.position.copy(pool).add(new THREE.Vector3(0, -0.12, 0));
    grp.add(bounceLight);
  }
  return { object3D: grp, light, target: light.target, lattice: grp.userData.lattice || null, bounce: bounceLight,
    update(T, o = {}) { if (o.intensity !== undefined) { light.intensity = o.intensity * dist * dist; if (bounceLight) bounceLight.intensity = o.intensity * bounceK; } } };
}
// Draw the window cookie into the spot's square map so its corners land where the window corners project in the light's view.
function warpCookie(tex, C, R, U, light, size) {
  const img = tex.image; if (!img || !img.getContext) return tex;
  const S = Math.min(1024, size), cam = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(light.angle) * 2, 1, 0.5, 500);
  cam.position.copy(light.position); cam.lookAt(light.target.position); cam.updateMatrixWorld(); cam.updateProjectionMatrix();
  const P = (v) => { const q = v.clone().project(cam); return [(q.x * 0.5 + 0.5) * S, (1 - (q.y * 0.5 + 0.5)) * S]; };
  const tl = P(C.clone().sub(R).add(U)), tr = P(C.clone().add(R).add(U)), bl = P(C.clone().sub(R).sub(U));
  const c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  const w = img.width, h = img.height;
  g.setTransform((tr[0] - tl[0]) / w, (tr[1] - tl[1]) / w, (bl[0] - tl[0]) / h, (bl[1] - tl[1]) / h, tl[0], tl[1]);
  g.drawImage(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.colorSpace = tex.colorSpace; t.needsUpdate = true;
  return t;
}
export const cookieSpot = windowLight; // older name
// mean transmitted fraction + normalised tint of a cookie texture (for bounce light); cached on the texture
function cookieMean(tex, colored) {
  const out = { pass: 0.75, tint: new THREE.Color(1, 1, 1) };
  const img = tex && tex.image; if (!img || !img.getContext) return out;
  if (tex.userData.mean) return tex.userData.mean;
  const S = 32, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.drawImage(img, 0, 0, S, S); const d = g.getImageData(0, 0, S, S).data;
  let r = 0, gg = 0, b = 0; const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const srgb = tex.colorSpace === THREE.SRGBColorSpace;
  for (let i = 0; i < d.length; i += 4) { const f = srgb ? lin : (v) => v / 255; r += f(d[i]); gg += f(d[i + 1]); b += f(d[i + 2]); }
  const n = d.length / 4; r /= n; gg /= n; b /= n;
  const m = Math.max(r, gg, b, 1e-4);
  out.pass = (r + gg + b) / 3; out.tint = colored ? new THREE.Color(r / m, gg / m, b / m) : new THREE.Color(1, 1, 1);
  tex.userData.mean = out;
  return out;
}
function invertTex(t) {
  const img = t.image; if (!img || !img.getContext) return t;
  if (t.userData.inverted) return t.userData.inverted;
  const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const g = c.getContext('2d');
  g.filter = 'invert(1)'; g.drawImage(img, 0, 0);
  const o = new THREE.CanvasTexture(c); o.colorSpace = THREE.NoColorSpace; o.needsUpdate = true; t.userData.inverted = o;
  return o;
}

// ------------------------------------------------------------------ soft light cone (flashlight / lantern spill)
export function beamCone({ origin = [0, 1, 0], dir = [0, 0, -1], angle = 0.25, length = 6, color = 0xfff1d6, intensity = 0.25, noise = 0.4, lowres = true } = {}) {
  const geo = new THREE.ConeGeometry(Math.tan(angle) * length, length, 32, 1, true).translate(0, -length / 2, 0);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uCol: { value: COL(color) }, uInt: { value: intensity }, uLen: { value: length }, uT: { value: 0 }, uNoise: { value: noiseTexture() }, uNA: { value: noise } },
    vertexShader: /* glsl */ `varying vec3 vN; varying vec3 vW; varying float vAx; uniform float uLen;
      void main(){ vAx = -position.y / uLen; vN = normalize(mat3(modelMatrix) * normal); vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `varying vec3 vN; varying vec3 vW; varying float vAx; uniform vec3 uCol; uniform float uInt, uT, uNA; uniform sampler2D uNoise;
      void main(){ vec3 V = normalize(cameraPosition - vW); float f = pow(abs(dot(normalize(vN), V)), 2.5);
        float n = mix(1.0, texture2D(uNoise, vW.xz * 0.3 + vW.y * 0.1 + uT * 0.01).r * 1.6, uNA);
        float a = f * pow(1.0 - clamp(vAx, 0.0, 1.0), 2.0) * smoothstep(0.0, 0.05, vAx) * n;
        gl_FragColor = vec4(uCol * uInt * a, 1.0); }`,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.renderOrder = 20;
  if (lowres) mesh.layers.set(LOWRES_LAYER);
  const o = V3(origin), d = V3(dir).normalize();
  mesh.position.copy(o); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
  return { object3D: mesh, material: mat, update(T, p = {}) { mat.uniforms.uT.value = T; if (p.intensity !== undefined) mat.uniforms.uInt.value = p.intensity; if (p.dir) mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), V3(p.dir).normalize()); if (p.origin) mesh.position.copy(V3(p.origin)); } };
}

// ------------------------------------------------------------------ dust motes (Points; only bright inside a beam if given)
// beam: { shaft } (a windowShaft result) | { cone: { origin, dir, angle, length } } | null (all lit).
// update(T, { camera, focus, fstop }) → physically sized bokeh discs for out-of-focus motes.
export function dustMotes({ count = 600, center = [0, 1.5, 0], size = [3, 2.5, 3], moteSize = 0.0035, color = 0xfff4e0, intensity = 1.2, drift = 0.08,
  seed = 1, beam = null, ambient = 0.04, H = null } = {}) {
  const r = rng(seed * 131 + 7), pos = new Float32Array(count * 3), sd = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) { sd[i * 4] = r(); sd[i * 4 + 1] = r(); sd[i * 4 + 2] = r(); sd[i * 4 + 3] = r(); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('aSeed', new THREE.BufferAttribute(sd, 4));
  const S = V3(size), Cc = V3(center);
  const cone = beam && beam.cone ? beam.cone : null, shaft = beam && beam.shaft ? beam.shaft : null;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: {
      uT: { value: 0 }, uMin: { value: Cc.clone().addScaledVector(S, -0.5) }, uBox: { value: S }, uDrift: { value: drift }, uSize: { value: moteSize },
      uPx: { value: 1000 }, uFocus: { value: 2 }, uCocK: { value: 0 }, uCol: { value: COL(color) }, uInt: { value: intensity }, uAmb: { value: ambient },
      uBeam: { value: shaft ? 2 : cone ? 1 : 0 }, uInv: { value: shaft ? shaft.inverse : new THREE.Matrix4() },
      uCookie: { value: shaft && shaft.material.uniforms.uCookie.value }, uHasCookie: { value: shaft && shaft.material.uniforms.uCookie.value ? 1 : 0 },
      uLodK: { value: shaft ? shaft.material.uniforms.uLodK.value : 0 },
      uConeO: { value: cone ? V3(cone.origin) : new THREE.Vector3() }, uConeD: { value: cone ? V3(cone.dir).normalize() : new THREE.Vector3(0, -1, 0) },
      uConeCos: { value: cone ? Math.cos(cone.angle) : 0.9 }, uConeLen: { value: cone ? cone.length : 5 },
    },
    vertexShader: /* glsl */ `
      attribute vec4 aSeed; uniform float uT, uDrift, uSize, uPx, uFocus, uCocK, uInt, uAmb; uniform vec3 uMin, uBox;
      uniform int uBeam; uniform mat4 uInv; uniform sampler2D uCookie; uniform float uHasCookie, uLodK; uniform vec3 uConeO, uConeD; uniform float uConeCos, uConeLen;
      varying float vA; varying vec3 vTint;
      void main(){
        vec3 s = aSeed.xyz; float w = aSeed.w;
        vec3 dr = vec3(sin(uT * (0.11 + 0.07 * w) + s.x * 31.0) + 0.5 * sin(uT * 0.37 + s.y * 17.0),
                       0.6 * sin(uT * (0.09 + 0.05 * s.z) + w * 23.0) - uT * 0.012 * (w - 0.3),
                       cos(uT * (0.13 + 0.06 * s.y) + s.z * 19.0) + 0.5 * cos(uT * 0.29 + w * 11.0)) * uDrift;
        vec3 q = fract(s + dr / uBox);
        vec3 p = uMin + q * uBox;
        vec3 e3 = min(q, 1.0 - q); float edge = smoothstep(0.0, 0.07, min(min(e3.x, e3.y), e3.z));
        float inB = 1.0; vTint = vec3(1.0);
        if (uBeam == 1) { vec3 d = p - uConeO; float l = dot(d, uConeD); float c = l / max(length(d), 1e-4);
          inB = smoothstep(uConeCos - 0.01, uConeCos + 0.03, c) * smoothstep(0.0, 0.1, l) * smoothstep(uConeLen, uConeLen * 0.6, l); }
        else if (uBeam == 2) { vec3 lp = (uInv * vec4(p, 1.0)).xyz;
          inB = smoothstep(1.0, 0.9, abs(lp.x)) * smoothstep(1.0, 0.9, abs(lp.y)) * smoothstep(0.0, 0.05, lp.z) * smoothstep(1.0, 0.7, lp.z);
          if (uHasCookie > 0.5) { vec3 ck = textureLod(uCookie, lp.xy * 0.5 + 0.5, log2(1.0 + clamp(lp.z, 0.0, 1.0) * uLodK)).rgb; vTint = ck; inB *= max(max(ck.r, ck.g), ck.b); } }
        float tw = 0.3 + 0.7 * pow(0.5 + 0.5 * sin(uT * (0.7 + w * 2.6) + s.x * 60.0), 4.0);
        vec4 mv = modelViewMatrix * vec4(p, 1.0); float z = max(-mv.z, 0.01);
        float px = uSize * uPx / z;
        float coc = uCocK * abs(z - uFocus) / z;
        float ps = max(px, 1.2) + coc;
        gl_PointSize = min(ps, 96.0);
        vA = uInt * (inB * tw + uAmb) * edge * (max(px, 1.2) * max(px, 1.2)) / (ps * ps) * (0.5 + w);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `uniform vec3 uCol; varying float vA; varying vec3 vTint;
      void main(){ vec2 d = gl_PointCoord * 2.0 - 1.0; float r2 = dot(d, d); if (r2 > 1.0) discard;
        float a = vA * (smoothstep(1.0, 0.6, r2) * 0.8 + 0.2 * exp(-r2 * 4.0));
        gl_FragColor = vec4(uCol * vTint * a, 1.0); }`,
  });
  const pts = new THREE.Points(geo, mat); pts.frustumCulled = false; pts.renderOrder = 30;
  return {
    object3D: pts, material: mat,
    update(T, { camera = null, focus = null, fstop = 2.8 } = {}) {
      const u = mat.uniforms; u.uT.value = T;
      if (camera) {
        const ci = camInfo(camera, H); u.uPx.value = ci.pxScale;
        if (focus) { // CoC(px) = (f²/N)/(zf - f) * |z - zf| / z  → in px via sensor width 36 mm
          const f = ci.mm / 1000, zf = focus; u.uFocus.value = zf;
          u.uCocK.value = (f * f / fstop) / Math.max(zf - f, 1e-3) / 0.036 * (ci.H * camera.aspect);
        } else u.uCocK.value = 0;
      }
    },
  };
}

// ------------------------------------------------------------------ candle (wax, wick, shader flame, halo, PointLight)
const FLAME_VERT = /* glsl */ `uniform float uW, uH; varying vec2 vUv;
  void main(){ vUv = uv; vec3 c = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vec3 toCam = cameraPosition - c; toCam.y = 0.0; toCam = normalize(toCam + vec3(1e-5, 0.0, 0.0));
    vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toCam));
    vec3 wp = c + right * position.x * uW + vec3(0.0, 1.0, 0.0) * position.y * uH;
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`;
const FLAME_FRAG = /* glsl */ `uniform float uT, uSeed, uInt, uLean; varying vec2 vUv; uniform sampler2D uNoise;
  void main(){
    vec2 p = vec2(vUv.x * 2.0 - 1.0, vUv.y * 1.25 - 0.12);           // y: 0 = flame base, 1 = tip
    float y = p.y;
    float n = texture2D(uNoise, vec2(vUv.x * 0.3 + uSeed, vUv.y * 0.5 - uT * 0.9)).r - 0.5;
    p.x -= (uLean + n * 0.25) * y * y;
    float w = 0.62 * pow(clamp(y + 0.06, 0.0, 1.0), 0.45) * pow(clamp(1.0 - y, 0.0, 1.0), 0.85);
    float d = abs(p.x) / max(w, 1e-3);
    if (y < -0.08 || y > 1.0 || d > 1.3) discard;
    float body = smoothstep(1.15, 0.55, d) * smoothstep(-0.08, 0.06, y);
    float core = smoothstep(0.62, 0.0, d) * smoothstep(0.02, 0.2, y) * smoothstep(0.75, 0.3, y);
    float blue = smoothstep(0.22, 0.0, y) * smoothstep(1.1, 0.4, d) * 0.6;
    vec3 col = vec3(1.0, 0.42, 0.1) * body * (0.6 + 0.6 * y) + vec3(1.0, 0.82, 0.55) * core * 2.4 + vec3(0.25, 0.4, 1.0) * blue * (1.0 - core);
    col *= mix(1.0, 0.55, smoothstep(0.6, 1.0, y));
    gl_FragColor = vec4(col * uInt, 1.0);
  }`;
export function flameMesh({ width = 0.012, height = 0.032, intensity = 6, seed = 0 } = {}) {
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uT: { value: 0 }, uSeed: { value: (seed * 0.137) % 1 }, uInt: { value: intensity }, uLean: { value: 0 }, uW: { value: width / 2 }, uH: { value: height }, uNoise: { value: noiseTexture() } },
    vertexShader: FLAME_VERT, fragmentShader: FLAME_FRAG,
  });
  const g = new THREE.PlaneGeometry(2, 1).translate(0, 0.5, 0);
  const m = new THREE.Mesh(g, mat); m.frustumCulled = false; m.renderOrder = 12;
  return m;
}
function gradientTex(stops) {
  const c = document.createElement('canvas'); c.width = 4; c.height = 64; const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 64, 0, 0); for (const [o, col] of stops) gr.addColorStop(o, col);
  g.fillStyle = gr; g.fillRect(0, 0, 4, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
// Bible PROP_CANDLE: ivory wax #E8DFC8, Ø2 cm, brass candlestick with drip pan; burn states A 18 cm → B 11 → C 6 → D 2.5 cm.
export const CANDLE_STATES = { A: 0.18, B: 0.11, C: 0.06, D: 0.025 };
export function candle({ height = 0.18, radius = 0.01, wax = '#E8DFC8', burn = 0, state = null, seed = 1, light = true, intensity = 1.0, castShadow = false,
  flameScale = 1, holder = true } = {}) {
  if (state && CANDLE_STATES[state]) { burn = 1 - CANDLE_STATES[state] / height; }
  const grp = new THREE.Group(); grp.name = 'candle';
  // wax: translucent glow near the flame (subsurface fake via emissive gradient), scaled with the flicker
  const waxMat = new THREE.MeshStandardMaterial({ color: wax, roughness: 0.5, emissive: new THREE.Color('#ffb070'), emissiveIntensity: 0.9,
    emissiveMap: gradientTex([[0, '#000000'], [0.55, '#0a0503'], [0.82, '#3a1c0a'], [0.95, '#a05828'], [1, '#e08a40']]) });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.03, 1, 28, 1, false), waxMat);
  body.castShadow = true; body.receiveShadow = true; grp.add(body);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.92, radius * 0.12, 8, 28), waxMat); rim.rotation.x = Math.PI / 2; grp.add(rim);
  const drip = new THREE.Mesh(new THREE.CapsuleGeometry(radius * 0.18, radius * 1.6, 4, 8), waxMat); grp.add(drip);
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.0007, 0.0008, 0.012, 6), new THREE.MeshStandardMaterial({ color: 0x140c08, roughness: 0.9, emissive: 0xff5010, emissiveIntensity: 0.4 }));
  grp.add(wick);
  if (holder) {
    const brassM = new THREE.MeshStandardMaterial({ color: 0x8C7350, metalness: 1, roughness: 0.38 });
    const dish = new THREE.Mesh(new THREE.CylinderGeometry(radius * 3.2, radius * 3.6, 0.008, 32), brassM); dish.position.y = 0.004; dish.castShadow = dish.receiveShadow = true;
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(radius * 1.35, radius * 1.5, 0.018, 24, 1, true), brassM); cup.position.y = 0.016;
    grp.add(dish, cup);
  }
  const flame = flameMesh({ width: 0.013 * flameScale, height: 0.034 * flameScale, seed });
  grp.add(flame);
  const halo = glow({ color: 0xffa050, size: 0.16 * flameScale, intensity: 0.5, falloff: 2.6 });
  const halo2 = glow({ color: 0xff8a40, size: 0.6 * flameScale, intensity: 0.06, falloff: 1.4 });
  grp.add(halo.object3D, halo2.object3D);
  let pl = null;
  if (light) { pl = new THREE.PointLight(0xffa85a, intensity, 0, 2); pl.castShadow = castShadow; if (castShadow) { pl.shadow.mapSize.set(512, 512); pl.shadow.bias = -0.002; pl.shadow.camera.near = 0.02; } grp.add(pl); }
  const base0 = holder ? 0.012 : 0;
  function layout(b) {
    const h = Math.max(0.012, height * (1 - b));
    body.scale.set(1, h, 1); body.position.y = base0 + h / 2;
    waxMat.emissiveMap.repeat.set(1, 1);
    rim.position.y = base0 + h - radius * 0.05; drip.position.set(radius * 0.98, base0 + h - radius * 1.2, 0);
    wick.position.y = base0 + h + 0.005;
    const fy = base0 + h + 0.006; flame.position.y = fy;
    halo.object3D.position.y = fy + 0.012 * flameScale; halo2.object3D.position.y = fy + 0.012 * flameScale;
    if (pl) pl.position.set(0, fy + 0.015 * flameScale, 0);
    return fy;
  }
  let fy = layout(burn);
  const c = {
    object3D: grp, light: pl, flame, halo,
    get flameY() { return fy; },
    setBurn(b) { fy = layout(b); },
    setState(st) { fy = layout(1 - (CANDLE_STATES[st] ?? height) / height); },
    update(T, { burn: b, intensity: ii, gust = 0 } = {}) {
      if (b !== undefined) fy = layout(b);
      const f = flicker(T, seed);
      const u = flame.material.uniforms;
      u.uT.value = T; u.uLean.value = 0.18 * fbm1(T * 1.3, seed + 3) + gust;
      u.uH.value = 0.034 * flameScale * (0.88 + 0.22 * (f - 0.92) / 0.14 + 0.06 * noise1(T * 9, seed));
      u.uInt.value = 6 * (0.9 + 0.2 * (f - 0.92) / 0.14);
      halo.set(0.5 * f); halo2.set(0.06 * f);
      waxMat.emissiveIntensity = 0.9 * f;
      if (pl) { pl.intensity = (ii ?? intensity) * f; pl.position.x = 0.002 * noise1(T * 5, seed + 7); pl.position.z = 0.002 * noise1(T * 5.3, seed + 9); }
    },
  };
  c.update(0);
  return c;
}

// ------------------------------------------------------------------ steam (curling soft sprites, instanced billboards)
export function steam({ position = [0, 0, 0], count = 16, height = 0.24, width = 0.03, rate = 0.22, seed = 2, color = 0xf2f0ea, opacity = 0.22, size = 0.035, light = 1 } = {}) {
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry(); geo.index = base.index; geo.attributes.position = base.attributes.position; geo.attributes.uv = base.attributes.uv;
  const r = rng(seed * 71 + 3), sd = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) { sd[i * 4] = (i + r() * 0.6) / count; sd[i * 4 + 1] = r(); sd[i * 4 + 2] = r(); sd[i * 4 + 3] = r(); }
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(sd, 4)); geo.instanceCount = count;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uH: { value: height }, uW: { value: width }, uRate: { value: rate }, uSize: { value: size }, uCol: { value: COL(color, light) }, uOp: { value: opacity },
      uSprite: { value: spriteTexture('wisp', 128, seed) }, uNoise: { value: noiseTexture() }, uWind: { value: new THREE.Vector2(0, 0) } },
    vertexShader: /* glsl */ `attribute vec4 aSeed; uniform float uT, uH, uW, uRate, uSize; uniform vec2 uWind; varying vec2 vUv; varying float vA; varying float vRot;
      void main(){ float ph = fract(uT * uRate + aSeed.x); vUv = uv;
        vec3 c = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        float k = ph * 6.0 + uT * 0.7 + aSeed.y * 6.28;
        vec3 off = vec3(sin(k) * uW * (0.3 + ph) + uWind.x * ph * ph, ph * uH * (0.85 + 0.3 * aSeed.z), cos(k * 0.8 + aSeed.w * 3.0) * uW * 0.6 * (0.3 + ph) + uWind.y * ph * ph);
        float s = uSize * (0.45 + 1.8 * ph) * (0.8 + 0.4 * aSeed.w);
        vec4 mv = viewMatrix * vec4(c + off, 1.0);
        float a = aSeed.y * 6.28 + uT * (0.3 + aSeed.z * 0.4) * (aSeed.w > 0.5 ? 1.0 : -1.0);
        vec2 q = mat2(cos(a), -sin(a), sin(a), cos(a)) * position.xy;
        mv.xy += q * s;
        vA = pow(sin(3.14159 * ph), 1.3) * pow(1.0 - ph, 0.4) * smoothstep(0.0, 0.08, ph);
        gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform sampler2D uSprite, uNoise; uniform vec3 uCol; uniform float uOp, uT; varying vec2 vUv; varying float vA;
      void main(){ vec2 w = vUv + (texture2D(uNoise, vUv * 0.5 + vec2(0.0, -uT * 0.05)).rg - 0.5) * 0.25;
        float a = texture2D(uSprite, w).a * vA * uOp; if (a < 0.003) discard; gl_FragColor = vec4(uCol, a); }`,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.position.copy(V3(position)); mesh.renderOrder = 40;
  return { object3D: mesh, material: mat, update(T, { wind, light: l } = {}) { mat.uniforms.uT.value = T; if (wind) mat.uniforms.uWind.value.set(wind[0], wind[1]); if (l !== undefined) mat.uniforms.uCol.value.copy(COL(color, l)); } };
}

// ------------------------------------------------------------------ rain (instanced camera-facing streaks)
// lamp: { position, color, intensity } brightens drops near a light (rain is only visible when lit / backlit).
export function rain({ center = [0, 2, 0], size = [8, 5, 8], count = 2500, speed = 7.5, wind = [0.8, 0.2], length = 0.16, width = 0.0011, color = 0xc8d4e8,
  intensity = 0.25, seed = 4, lamp = null, nearFade = 0.9 } = {}) {
  const base = new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0);
  const geo = new THREE.InstancedBufferGeometry(); geo.index = base.index; geo.attributes.position = base.attributes.position; geo.attributes.uv = base.attributes.uv;
  const r = rng(seed * 53 + 1), sd = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) { sd[i * 4] = r(); sd[i * 4 + 1] = r(); sd[i * 4 + 2] = r(); sd[i * 4 + 3] = r(); }
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(sd, 4)); geo.instanceCount = count;
  const S = V3(size), Cc = V3(center);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uMin: { value: Cc.clone().addScaledVector(S, -0.5) }, uBox: { value: S }, uVel: { value: new THREE.Vector3(wind[0], -speed, wind[1]) },
      uLen: { value: length }, uWid: { value: width }, uCol: { value: COL(color) }, uInt: { value: intensity }, uNear: { value: nearFade },
      uLampP: { value: lamp ? V3(lamp.position) : new THREE.Vector3(0, -1e4, 0) }, uLampC: { value: lamp ? COL(lamp.color ?? 0xffa050, lamp.intensity ?? 1) : new THREE.Color(0, 0, 0) } },
    vertexShader: /* glsl */ `attribute vec4 aSeed; uniform float uT, uLen, uWid, uInt, uNear; uniform vec3 uMin, uBox, uVel, uLampP, uLampC, uCol; varying float vA; varying vec2 vUv; varying vec3 vC;
      void main(){ vUv = uv;
        float fallT = uBox.y / -uVel.y;
        float ph = fract(aSeed.y + uT / fallT * (0.9 + 0.2 * aSeed.w));
        vec3 p = uMin + vec3(aSeed.x, 1.0 - ph, aSeed.z) * uBox + vec3(uVel.x, 0.0, uVel.z) * ph * fallT;
        p.x = uMin.x + mod(p.x - uMin.x, uBox.x); p.z = uMin.z + mod(p.z - uMin.z, uBox.z);
        vec3 ax = normalize(uVel);
        vec3 toC = normalize(cameraPosition - p);
        vec3 side = normalize(cross(ax, toC));
        float dist = distance(cameraPosition, p);
        float wpx = max(uWid, dist * 0.0009);
        vec3 wp = p + side * position.x * wpx - ax * position.y * uLen * (0.7 + 0.6 * aSeed.w);
        float edge = smoothstep(0.0, 0.05, ph) * smoothstep(1.0, 0.92, ph);
        float ld = distance(p, uLampP);
        // drops scatter mostly FORWARD (refraction): bright when the lamp is behind them, faint when lit from the camera side
        float cs = dot(normalize(p - uLampP), toC), g = 0.55;
        float hg = (1.0 - g * g) / pow(1.0 + g * g - 2.0 * g * cs, 1.5);
        vC = uCol * uInt * (0.35 + 0.65 * aSeed.z) + uLampC * (0.45 * hg) / (1.0 + ld * ld * 0.8);
        vA = edge * uWid / wpx * (0.4 + 0.6 * aSeed.x) * smoothstep(uNear * 0.35, uNear, dist);
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
    fragmentShader: /* glsl */ `varying float vA; varying vec2 vUv; varying vec3 vC;
      void main(){ float a = vA * (1.0 - abs(vUv.x * 2.0 - 1.0)) * smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.6, vUv.y); gl_FragColor = vec4(vC * a, 1.0); }`,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 35;
  return { object3D: mesh, material: mat, update(T, { intensity: ii } = {}) { mat.uniforms.uT.value = T; if (ii !== undefined) mat.uniforms.uInt.value = ii; } };
}

// ------------------------------------------------------------------ eave drips + water-surface ripples (rain bowl / puddles)
// drips({ points:[[x,y,z],...], toY }) drops fall from each point on its own period. drips.sources() → ripple sources.
export function drips({ points = [[0, 2.2, 0]], toY = 0, period = [0.7, 1.6], seed = 5, size = 0.004, color = 0xd0dcf0, intensity = 0.8, lamp = null } = {}) {
  const r = rng(seed * 17 + 9), n = points.length;
  const src = points.map((p) => ({ p: V3(p), period: period[0] + r() * (period[1] - period[0]), off: r() * 3 }));
  const base = new THREE.PlaneGeometry(1, 1).translate(0, -0.5, 0);
  const geo = new THREE.InstancedBufferGeometry(); geo.index = base.index; geo.attributes.position = base.attributes.position; geo.attributes.uv = base.attributes.uv;
  const a1 = new Float32Array(n * 4), a2 = new Float32Array(n * 2);
  src.forEach((s, i) => { a1.set([s.p.x, s.p.y, s.p.z, s.period], i * 4); a2.set([s.off, Array.isArray(toY) ? toY[i] : toY], i * 2); });
  geo.setAttribute('aP', new THREE.InstancedBufferAttribute(a1, 4)); geo.setAttribute('aO', new THREE.InstancedBufferAttribute(a2, 2)); geo.instanceCount = n;
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { uT: { value: 0 }, uS: { value: size }, uCol: { value: COL(color, intensity) }, uLampP: { value: lamp ? V3(lamp.position) : new THREE.Vector3(0, -1e4, 0) }, uLampC: { value: lamp ? COL(lamp.color ?? 0xffa050, lamp.intensity ?? 1) : new THREE.Color(0, 0, 0) } },
    vertexShader: /* glsl */ `attribute vec4 aP; attribute vec2 aO; uniform float uT, uS; uniform vec3 uCol, uLampP, uLampC; varying vec2 vUv; varying float vA; varying vec3 vC;
      void main(){ vUv = uv; float t = mod(uT + aO.x, aP.w); float hang = 0.35 * aP.w;
        float tf = max(t - hang, 0.0); float y = aP.y - 4.9 * tf * tf; float v = 9.8 * tf;
        vA = step(aO.y, y) * smoothstep(0.0, 0.1, t);
        vec3 p = vec3(aP.x, y, aP.z); vec3 toC = normalize(cameraPosition - p); vec3 side = normalize(cross(vec3(0.0, 1.0, 0.0), toC));
        float len = uS * 1.6 + v * 0.02;
        vec3 wp = p + side * position.x * uS - vec3(0.0, 1.0, 0.0) * (position.y + 0.5) * len;
        float ld = distance(p, uLampP); vC = uCol + uLampC / (1.0 + ld * ld * 4.0);
        gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
    fragmentShader: /* glsl */ `varying vec2 vUv; varying float vA; varying vec3 vC; void main(){ vec2 d = vUv * 2.0 - 1.0; float a = vA * smoothstep(1.0, 0.2, length(d * vec2(1.0, 0.7))); if (a < 0.01) discard; gl_FragColor = vec4(vC * a, 1.0); }`,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 36;
  return {
    object3D: mesh, material: mat,
    // ripple sources for drips landing inside a circle (center/radius in world xz) — feed to ripples({ sources })
    sources(center = [0, 0, 0], radius = 1e9) {
      const c = V3(center);
      return src.filter((s) => Math.hypot(s.p.x - c.x, s.p.z - c.z) < radius).map((s) => {
        const fall = Math.sqrt(Math.max(0, 2 * (s.p.y - c.y) / 9.8));
        return { x: s.p.x - c.x, z: s.p.z - c.z, period: s.period, offset: s.off - 0.35 * s.period - fall };
      });
    },
    update(T) { mat.uniforms.uT.value = T; },
  };
}
// Water surface disc with expanding ring ripples (normal perturbation of a standard material → reflects env/lights).
// sources: [{x, z (local), period, offset}] deterministic impacts; rainRate adds random impacts per second (rain into a bowl).
export function ripples({ radius = 0.07, sources = [], rainRate = 0, seed = 6, color = 0x0a1018, roughness = 0.04, strength = 1, speed = 0.18 } = {}) {
  const mat = new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, transparent: true, opacity: 0.92 });
  const list = sources.slice(0, 4);
  const U = { uT: { value: 0 }, uSrc: { value: [0, 1, 2, 3].map((i) => new THREE.Vector4(list[i]?.x ?? 0, list[i]?.z ?? 0, list[i]?.period ?? 1, list[i]?.offset ?? 0)) },
    uN: { value: list.length }, uRain: { value: rainRate }, uR: { value: radius }, uStr: { value: strength }, uSpd: { value: speed }, uSeed: { value: seed } };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = 'varying vec2 vLoc;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLoc = position.xy;');
    sh.fragmentShader = `varying vec2 vLoc; uniform float uT, uRain, uR, uStr, uSpd, uSeed; uniform vec4 uSrc[4]; uniform int uN;
      float rh(float n){ return fract(sin(n * 91.345 + uSeed * 7.1) * 47453.5453); }
      vec2 ring(vec2 p, vec2 c, float age){ vec2 d = p - c; float r = length(d) + 1e-5; float front = uSpd * age;
        float env = exp(-age * 3.0) * smoothstep(front + 0.012, front - 0.002, r) * smoothstep(0.0, 0.004, r);
        float s = cos((r - front) * 260.0) * env; return d / r * s; }
      ` + sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
      { vec2 g = vec2(0.0);
        for (int i = 0; i < 4; i++) { if (i >= uN) break; vec4 s = uSrc[i]; float age = mod(uT - s.w, s.z); g += ring(vLoc, s.xy, age); }
        if (uRain > 0.0) for (int k = 0; k < 6; k++) { float per = 6.0 / uRain; float cyc = floor((uT + float(k) * per / 6.0) / per);
          float age = mod(uT + float(k) * per / 6.0, per); float id = cyc * 13.0 + float(k);
          vec2 c = (vec2(rh(id), rh(id + 3.7)) * 2.0 - 1.0) * uR * 0.8; g += ring(vLoc, c, age); }
        vec3 pw = vec3(g.x, 0.0, -g.y) * 0.35 * uStr;
        normal = normalize(normal + (viewMatrix * vec4(pw, 0.0)).xyz); }`);
  };
  mat.customProgramCacheKey = () => 'fxRipples';
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, 48), mat); mesh.rotation.x = -Math.PI / 2; mesh.receiveShadow = true;
  return { object3D: mesh, material: mat, update(T) { U.uT.value = T; } };
}

// ------------------------------------------------------------------ sea spray / low mist (soft drifting sprites; optional periodic bow bursts)
export function seaSpray({ center = [0, 0.5, 0], area = [20, 1.5, 20], count = 60, size = 1.2, color = 0xb8c4d4, opacity = 0.08, wind = [1.2, 0.3], seed = 7,
  burst = null } = {}) {
  const r = rng(seed * 19 + 5), n = count + (burst ? burst.count || 40 : 0);
  const base = new THREE.PlaneGeometry(1, 1);
  const geo = new THREE.InstancedBufferGeometry(); geo.index = base.index; geo.attributes.position = base.attributes.position; geo.attributes.uv = base.attributes.uv;
  const sd = new Float32Array(n * 4); for (let i = 0; i < n; i++) { sd[i * 4] = r(); sd[i * 4 + 1] = r(); sd[i * 4 + 2] = r(); sd[i * 4 + 3] = i < count ? r() : -1 - r(); }
  geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(sd, 4)); geo.instanceCount = n;
  const A = V3(area), Cc = V3(center);
  const B = burst || {};
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false,
    uniforms: { uT: { value: 0 }, uMin: { value: Cc.clone().addScaledVector(A, -0.5) }, uBox: { value: A }, uWind: { value: new THREE.Vector2(wind[0], wind[1]) }, uSize: { value: size },
      uCol: { value: COL(color) }, uOp: { value: opacity }, uSprite: { value: spriteTexture('wisp', 128, seed) },
      uBO: { value: V3(B.origin || [0, 1, 0]) }, uBD: { value: V3(B.dir || [0, 1, 0]).normalize() }, uBPer: { value: B.period || 4 }, uBSpd: { value: B.speed || 5 }, uBSize: { value: B.size || 0.25 } },
    vertexShader: /* glsl */ `attribute vec4 aSeed; uniform float uT, uSize, uBPer, uBSpd, uBSize; uniform vec3 uMin, uBox, uBO, uBD; uniform vec2 uWind; varying vec2 vUv; varying float vA;
      void main(){ vUv = uv; vec3 p; float s; float a;
        if (aSeed.w >= 0.0) {
          vec3 q = vec3(aSeed.x, aSeed.y, aSeed.z); vec3 dr = vec3(uWind.x, 0.03 * sin(uT * 0.2 + aSeed.y * 9.0), uWind.y) * uT;
          q = fract(q + dr / uBox); p = uMin + q * uBox; s = uSize * (0.6 + 0.8 * aSeed.w);
          vec3 e = min(q, 1.0 - q); a = smoothstep(0.0, 0.15, min(e.x, e.z)) * (0.5 + 0.5 * sin(uT * 0.3 + aSeed.x * 20.0));
        } else {
          float ph = fract(uT / uBPer + aSeed.x * 0.15); float t = ph * uBPer;
          vec3 d = normalize(uBD + (vec3(aSeed.y, aSeed.z, -aSeed.w - 1.0) - 0.5) * 0.9);
          p = uBO + d * uBSpd * t * (0.6 + 0.6 * aSeed.y) + vec3(uWind.x, -4.9 * t, uWind.y) * t;
          s = uBSize * (0.5 + t * 1.5); a = smoothstep(0.0, 0.02, t) * exp(-t * 2.5) * 3.0;
        }
        vA = a; vec4 mv = viewMatrix * vec4(p, 1.0); mv.xy += position.xy * s; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: /* glsl */ `uniform sampler2D uSprite; uniform vec3 uCol; uniform float uOp; varying vec2 vUv; varying float vA;
      void main(){ float a = texture2D(uSprite, vUv).a * vA * uOp; if (a < 0.002) discard; gl_FragColor = vec4(uCol, a); }`,
  });
  const mesh = new THREE.Mesh(geo, mat); mesh.frustumCulled = false; mesh.renderOrder = 38;
  return { object3D: mesh, material: mat, update(T, { color: c } = {}) { mat.uniforms.uT.value = T; if (c) mat.uniforms.uCol.value.copy(COL(c)); } };
}

// ------------------------------------------------------------------ fog cards (large soft noise planes, Y-billboarded, near-fade)
export function fogCards({ center = [0, 1, 0], size = [12, 2.5, 12], count = 6, color = 0x8a96b0, opacity = 0.12, seed = 8, scroll = [0.02, 0.0], cardSize = [6, 2.2], nearFade = 1.5 } = {}) {
  const r = rng(seed * 29 + 3), grp = new THREE.Group();
  const S = V3(size), Cc = V3(center), mats = [];
  for (let i = 0; i < count; i++) {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uT: { value: 0 }, uCol: { value: COL(color) }, uOp: { value: opacity }, uNoise: { value: noiseTexture() }, uOff: { value: new THREE.Vector2(r() * 10, r() * 10) }, uScroll: { value: new THREE.Vector2(...scroll) }, uNear: { value: nearFade }, uSz: { value: new THREE.Vector2(...cardSize) } },
      vertexShader: /* glsl */ `varying vec2 vUv; varying float vD; uniform vec2 uSz;
        void main(){ vUv = uv; vec3 c = (modelMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz; vec3 toC = cameraPosition - c; toC.y = 0.0; toC = normalize(toC + vec3(1e-5, 0.0, 0.0));
          vec3 right = normalize(cross(vec3(0.0, 1.0, 0.0), toC)); vec3 wp = c + right * position.x * uSz.x + vec3(0.0, 1.0, 0.0) * position.y * uSz.y;
          vD = distance(cameraPosition, wp); gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0); }`,
      fragmentShader: /* glsl */ `varying vec2 vUv; varying float vD; uniform float uT, uOp, uNear; uniform vec3 uCol; uniform sampler2D uNoise; uniform vec2 uOff, uScroll;
        void main(){ vec2 p = vUv * vec2(1.6, 0.6) + uOff + uScroll * uT;
          float n = texture2D(uNoise, p * 0.5).r * 0.6 + texture2D(uNoise, p * 1.3 + 0.3).a * 0.4;
          float e = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x) * smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
          float a = uOp * e * smoothstep(0.35, 0.75, n) * smoothstep(uNear * 0.3, uNear, vD); if (a < 0.002) discard; gl_FragColor = vec4(uCol, a); }`,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    m.position.set(Cc.x + (r() - 0.5) * S.x, Cc.y + (r() - 0.5) * S.y, Cc.z + (r() - 0.5) * S.z); m.frustumCulled = false; m.renderOrder = 45;
    grp.add(m); mats.push(mat);
  }
  return { object3D: grp, materials: mats, update(T, { opacity: o, color: c } = {}) { for (const m of mats) { m.uniforms.uT.value = T; if (o !== undefined) m.uniforms.uOp.value = o; if (c) m.uniforms.uCol.value.copy(COL(c)); } } };
}

// ------------------------------------------------------------------ lantern: 'horn' (bible PROP_SHIPLAMP: hexagonal bamboo/wood frame, six scraped-horn
// panels #E3C08A, iron hook; 0.55 m stern lamp, size 0.45 → 25 cm cabin lamp), 'ship' (brass-framed glass), 'paper' (round paper), 'glass' (hurricane)
// Origin = hook point; body hangs below. update(T, { swing }) swing in radians (e.g. from ship roll); else gentle pendulum.
export function lantern({ style = 'horn', size = 1, color = 0xE2A458, intensity = 6, seed = 3, castShadow = false, pendulum = 0.04, period = 7, frameColor = null, paper = '#e9d8b8' } = {}) {
  if (frameColor === null) frameColor = style === 'horn' ? 0x3A2A1E : 0x2a2018;
  const pivot = new THREE.Group(); pivot.name = 'lantern';
  const body = new THREE.Group(); pivot.add(body);
  const s = size;
  const frameM = new THREE.MeshStandardMaterial({ color: frameColor, metalness: style === 'ship' ? 0.8 : 0.1, roughness: 0.45 });
  const glowCol = COL(color);
  let flameY = -0.2 * s;
  if (style === 'paper') {
    const pm = new THREE.MeshStandardMaterial({ color: paper, roughness: 0.9, emissive: glowCol.clone(), emissiveIntensity: 1.2, side: THREE.DoubleSide, transparent: true, opacity: 0.95 });
    const shape = new THREE.Mesh(new THREE.SphereGeometry(0.13 * s, 24, 16), pm); shape.scale.set(1, 1.12, 1); shape.position.y = -0.2 * s; body.add(shape);
    for (let i = 0; i < 10; i++) { const rib = new THREE.Mesh(new THREE.TorusGeometry(0.13 * s * Math.sin(Math.PI * (i + 1) / 11), 0.0016 * s, 4, 32), frameM); rib.rotation.x = Math.PI / 2; rib.position.y = -0.2 * s + 0.146 * s * Math.cos(Math.PI * (i + 1) / 11); body.add(rib); }
    for (const y of [-0.05, -0.355]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 0.018 * s, 16), frameM); cap.position.y = y * s; body.add(cap); }
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.0015, 0.0015, 0.05 * s, 4), frameM); str.position.y = -0.02 * s; body.add(str);
    body.userData.shell = pm;
  } else if (style === 'horn') {
    const w = 0.12, h = 0.4; // 55 cm overall at size 1
    const hornM = new THREE.MeshStandardMaterial({ color: 0x6a5032, roughness: 0.6, emissive: COL(0xE3C08A), emissiveIntensity: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
    const cage = new THREE.Mesh(new THREE.CylinderGeometry(w * s, w * 0.92 * s, h * s, 6, 1, true), hornM); cage.position.y = -(0.08 + h / 2) * s; body.add(cage);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.55 * s, w * 1.12 * s, 0.06 * s, 6), frameM); top.position.y = -0.05 * s; body.add(top);
    const bot = new THREE.Mesh(new THREE.CylinderGeometry(w * 1.05 * s, w * 0.8 * s, 0.05 * s, 6), frameM); bot.position.y = -(0.1 + h) * s; body.add(bot);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; const post = new THREE.Mesh(new THREE.CylinderGeometry(0.006 * s, 0.006 * s, h * s, 5), frameM); post.position.set(Math.cos(a) * w * 0.97 * s, -(0.08 + h / 2) * s, Math.sin(a) * w * 0.97 * s); body.add(post); }
    for (const y of [0.33, 0.66]) { const band = new THREE.Mesh(new THREE.TorusGeometry(w * 0.97 * s, 0.004 * s, 4, 6), frameM); band.rotation.x = Math.PI / 2; band.rotation.z = Math.PI / 6; band.position.y = -(0.08 + h * y) * s; body.add(band); }
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.03 * s, 0.005 * s, 6, 16, Math.PI * 1.5), new THREE.MeshStandardMaterial({ color: 0x1a1a1c, metalness: 0.7, roughness: 0.6 })); hook.position.y = 0.0; body.add(hook);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.004 * s, 0.004 * s, 0.05 * s, 5), frameM); rod.position.y = -0.025 * s; body.add(rod);
    flameY = -(0.08 + h * 0.6) * s;
    body.userData.shell = hornM; body.userData.shellBase = 0.9;
  } else {
    const w = style === 'glass' ? 0.07 : 0.085, h = style === 'glass' ? 0.22 : 0.24;
    const glassM = new THREE.MeshStandardMaterial({ color: 0x302418, roughness: 0.15, metalness: 0, emissive: glowCol.clone(), emissiveIntensity: 0.35, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false });
    const top = new THREE.Mesh(new THREE.ConeGeometry(w * 1.25 * s, 0.07 * s, style === 'glass' ? 24 : 6), frameM); top.position.y = -0.04 * s; body.add(top);
    const bot = new THREE.Mesh(new THREE.CylinderGeometry(w * 1.1 * s, w * 1.2 * s, 0.03 * s, style === 'glass' ? 24 : 6), frameM); bot.position.y = -(0.07 + h) * s; body.add(bot);
    const cage = new THREE.Mesh(style === 'glass' ? new THREE.SphereGeometry(w * s, 20, 14) : new THREE.CylinderGeometry(w * s, w * s, h * s, 6, 1, true), glassM);
    if (style === 'glass') cage.scale.set(1, 1.45, 1);
    cage.position.y = -(0.07 + h / 2) * s; body.add(cage);
    if (style === 'ship') for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const post = new THREE.Mesh(new THREE.BoxGeometry(0.006 * s, h * s, 0.006 * s), frameM); post.position.set(Math.cos(a) * w * s, -(0.07 + h / 2) * s, Math.sin(a) * w * s); body.add(post); }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.022 * s, 0.003 * s, 6, 16), frameM); ring.position.y = 0.0; body.add(ring);
    flameY = -(0.07 + h * 0.62) * s;
    body.userData.shell = glassM;
  }
  const fl = flameMesh({ width: 0.016 * s, height: 0.04 * s, seed, intensity: 6 }); fl.position.y = flameY - 0.02 * s; body.add(fl);
  const halo = glow({ color, size: 0.5 * s, intensity: 0.35, falloff: 2.2 }); halo.object3D.position.y = flameY; body.add(halo.object3D);
  const halo2 = glow({ color, size: 1.8 * s, intensity: 0.05, falloff: 1.2 }); halo2.object3D.position.y = flameY; body.add(halo2.object3D);
  const pl = new THREE.PointLight(glowCol.clone().multiplyScalar(1 / Math.max(glowCol.r, glowCol.g, glowCol.b)), intensity, 0, 2); pl.position.y = flameY + 0.01 * s; pl.castShadow = castShadow;
  if (castShadow) { pl.shadow.mapSize.set(512, 512); pl.shadow.bias = -0.002; pl.shadow.camera.near = 0.05; }
  body.add(pl);
  const _w = new THREE.Vector3();
  return {
    object3D: pivot, light: pl, body, halo,
    flameWorld() { fl.getWorldPosition(_w); return _w.clone().setY(_w.y + 0.02 * s); },
    update(T, { swing = null, intensity: ii } = {}) {
      const f = flicker(T, seed);
      const sw = swing ?? pendulum * Math.sin(T * 2 * Math.PI / period + seed) + pendulum * 0.25 * Math.sin(T * 2 * Math.PI / (period * 0.53) + seed * 2);
      if (typeof sw === 'number') { body.rotation.z = sw; body.rotation.x = sw * 0.35 * Math.sin(seed); } else { body.rotation.z = sw[0]; body.rotation.x = sw[1]; }
      fl.material.uniforms.uT.value = T; fl.material.uniforms.uLean.value = -body.rotation.z * 0.8 + 0.1 * fbm1(T * 1.2, seed);
      fl.material.uniforms.uInt.value = 6 * f;
      halo.set(0.35 * f); halo2.set(0.05 * f);
      pl.intensity = (ii ?? intensity) * f;
      if (body.userData.shell) body.userData.shell.emissiveIntensity = (body.userData.shellBase ?? (style === 'paper' ? 1.2 : 0.35)) * f;
    },
  };
}

// ------------------------------------------------------------------ oil-lamp dish (bible PROP_LAMP 门口小灯): brown-glazed stoneware dish Ø9 cm on a
// short stand, rush-pith wick, ~2 cm flame at ~1900 K (P13). Same apparent size/colour as the shore lights at sea (motif M7).
export function oilLamp({ intensity = 1.6, seed = 11, castShadow = false, glaze = 0x6B4A2E } = {}) {
  const grp = new THREE.Group(); grp.name = 'oilLamp';
  const m = new THREE.MeshStandardMaterial({ color: glaze, roughness: 0.28, metalness: 0 });
  const pts = [[0, 0], [0.024, 0], [0.026, 0.004], [0.012, 0.012], [0.01, 0.03], [0.02, 0.034], [0.045, 0.04], [0.046, 0.046], [0.04, 0.044], [0.02, 0.04], [0, 0.04]].map(([r, y]) => new THREE.Vector2(r, y));
  const dish = new THREE.Mesh(new THREE.LatheGeometry(pts, 32), m); dish.castShadow = dish.receiveShadow = true; grp.add(dish);
  const oil = new THREE.Mesh(new THREE.CircleGeometry(0.038, 24), new THREE.MeshStandardMaterial({ color: 0x3a2a10, roughness: 0.05 })); oil.rotation.x = -Math.PI / 2; oil.position.y = 0.0415; grp.add(oil);
  const wick = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.03, 5), new THREE.MeshStandardMaterial({ color: 0xc8b890, roughness: 0.9 })); wick.rotation.z = 1.1; wick.position.set(0.03, 0.045, 0); grp.add(wick);
  const fl = flameMesh({ width: 0.009, height: 0.02, seed, intensity: 6 }); fl.position.set(0.043, 0.05, 0); grp.add(fl);
  const halo = glow({ color: 0xE2A458, size: 0.12, intensity: 0.45, falloff: 2.4 }); halo.object3D.position.set(0.043, 0.06, 0); grp.add(halo.object3D);
  const halo2 = glow({ color: 0xE2A458, size: 0.5, intensity: 0.05, falloff: 1.3 }); halo2.object3D.position.copy(halo.object3D.position); grp.add(halo2.object3D);
  const pl = new THREE.PointLight(0xffa458, intensity, 0, 2); pl.position.set(0.043, 0.065, 0); pl.castShadow = castShadow;
  if (castShadow) { pl.shadow.mapSize.set(512, 512); pl.shadow.bias = -0.002; pl.shadow.camera.near = 0.02; }
  grp.add(pl);
  return { object3D: grp, light: pl, flame: fl, update(T, { intensity: ii, gust = 0 } = {}) {
    const f = flicker(T, seed); fl.material.uniforms.uT.value = T; fl.material.uniforms.uLean.value = 0.15 * fbm1(T * 1.4, seed) + gust;
    fl.material.uniforms.uInt.value = 6 * f; halo.set(0.45 * f); halo2.set(0.05 * f); pl.intensity = (ii ?? intensity) * f; } };
}
