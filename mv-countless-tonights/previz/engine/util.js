// Deterministic helpers shared by the engine and every scene module.
// Never use Math.random() or wall-clock time in scenes: frames must be reproducible.

export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const remap = (x, a, b, c = 0, d = 1) => lerp(c, d, clamp((x - a) / (b - a)));
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export const ease = {
  linear: (t) => t,
  inSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  outSine: (t) => Math.sin((t * Math.PI) / 2),
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  inCubic: (t) => t * t * t,
  inOutQuint: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - Math.pow(-2 * t + 2, 5) / 2),
  smooth: (t) => t * t * (3 - 2 * t),
  smoother: (t) => t * t * t * (t * (t * 6 - 15) + 10),
};

// mulberry32 seeded PRNG: const r = rng(42); r() -> [0,1)
export function rng(seed = 1) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 1-D value noise in [-1,1], deterministic: noise1(x, seed)
export function noise1(x, seed = 0) {
  const h = (i) => { const s = Math.sin((i + seed * 157.31) * 127.1) * 43758.5453; return (s - Math.floor(s)) * 2 - 1; };
  const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
  return lerp(h(i), h(i + 1), u);
}
// Fractal 1-D noise
export function fbm1(x, seed = 0, oct = 3) {
  let a = 0.5, s = 0, n = 0;
  for (let o = 0; o < oct; o++) { s += a * noise1(x * (1 << o), seed + o * 13); n += a; a *= 0.5; }
  return s / n;
}

// Candle / flame flicker in ~[0.75,1.1] for time T (seconds)
export const flicker = (T, seed = 0) => 0.92 + 0.1 * fbm1(T * 7.0, seed, 3) + 0.04 * noise1(T * 23.0, seed + 5);

// Keyframe interpolation: keys = [[u, value(number|array)], ...] sorted by u
export function keys(k, u, e = ease.inOutSine) {
  if (u <= k[0][0]) return k[0][1];
  for (let i = 0; i < k.length - 1; i++) {
    const [u0, v0] = k[i], [u1, v1] = k[i + 1];
    if (u <= u1) {
      const t = e((u - u0) / (u1 - u0));
      return Array.isArray(v0) ? v0.map((x, j) => lerp(x, v1[j], t)) : lerp(v0, v1, t);
    }
  }
  return k[k.length - 1][1];
}
