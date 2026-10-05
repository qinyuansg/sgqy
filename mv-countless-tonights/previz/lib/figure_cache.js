// figure_cache.js — bake / load figure & hand geometry so scenes start instantly.
//   node previz/tools/bake_cast.mjs           -> previz/lib/cache/*.bin + index.json
//   await preloadKeys({ figures:[key], hands:[key] })   (browser; cast.js loadCharacter() does this)
// Geometry is quantised: positions f32, normals i8, aux i16 (normalised), skin u8.
import * as THREE from 'three';
import { FIGURE_CACHE } from './figure.js';
import { HAND_CACHE } from './hand.js';

export function hashKey(str) { // FNV-1a 64-bit as hex
  let h1 = 0x811c9dc5 | 0, h2 = 0x01000193 | 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 16777619); h2 = Math.imul(h2 ^ (c + i), 2246822519);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

// ---- packing ---------------------------------------------------------------------------------
function encodeGeo(geo, chunks) {
  const a = geo.attributes, n = a.position.count;
  const out = { n, attrs: {} };
  const push = (name, arr, type, size, normalized = false) => { out.attrs[name] = { type, size, normalized, chunk: chunks.length }; chunks.push(arr); };
  push('position', new Float32Array(a.position.array), 'f32', 3);
  { const s = a.normal.array, o = new Int8Array(n * 3); for (let i = 0; i < n * 3; i++) o[i] = Math.max(-127, Math.min(127, Math.round(s[i] * 127))); push('normal', o, 'i8', 3, true); }
  if (a.aux) { const s = a.aux.array, o = new Int16Array(n * 4); for (let i = 0; i < n * 4; i++) o[i] = Math.max(-32767, Math.min(32767, Math.round(Math.max(-1, Math.min(1, s[i])) * 32767))); push('aux', o, 'i16', 4, true); }
  if (a.skinIndex) { const s = a.skinIndex.array, o = new Uint8Array(n * 4); for (let i = 0; i < n * 4; i++) o[i] = s[i]; push('skinIndex', o, 'u8', 4); }
  if (a.skinWeight) {
    const s = a.skinWeight.array, o = new Uint8Array(n * 4);
    for (let v = 0; v < n; v++) {
      let sum = 0, big = 0;
      for (let j = 0; j < 4; j++) { const q = Math.round(s[v * 4 + j] * 255); o[v * 4 + j] = q; sum += q; if (q > o[v * 4 + big]) big = j; }
      o[v * 4 + big] += 255 - sum; // exact normalisation
    }
    push('skinWeight', o, 'u8', 4, true);
  }
  if (a.color) push('color', new Float32Array(a.color.array), 'f32', 3);
  const ix = geo.index.array;
  if (n < 65536) { const o = new Uint16Array(ix.length); o.set(ix); out.index = { type: 'u16', chunk: chunks.length }; chunks.push(o); }
  else { out.index = { type: 'u32', chunk: chunks.length }; chunks.push(new Uint32Array(ix)); }
  return out;
}
const CTOR = { f32: Float32Array, i8: Int8Array, i16: Int16Array, u8: Uint8Array, u16: Uint16Array, u32: Uint32Array };
function decodeGeo(d, chunks) {
  const g = new THREE.BufferGeometry();
  for (const [name, at] of Object.entries(d.attrs)) {
    const arr = chunks[at.chunk];
    const ba = new THREE.BufferAttribute(arr, at.size, at.normalized);
    g.setAttribute(name, ba);
  }
  g.setAttribute('restPos', g.attributes.position);
  g.setAttribute('restNrm', g.attributes.normal);
  g.setIndex(new THREE.BufferAttribute(chunks[d.index.chunk], 1));
  g.computeBoundingBox(); g.computeBoundingSphere();
  return g;
}
export function packBuffers(meta, chunks) {
  const enc = new TextEncoder().encode(JSON.stringify({ ...meta, chunks: chunks.map((c) => [c.constructor.name, c.length]) }));
  const pad = (x) => (x + 3) & ~3;
  let size = 4 + pad(enc.length);
  for (const c of chunks) size += pad(c.byteLength);
  const buf = new ArrayBuffer(size);
  const dv = new DataView(buf);
  dv.setUint32(0, enc.length, true);
  new Uint8Array(buf, 4, enc.length).set(enc);
  let off = 4 + pad(enc.length);
  for (const c of chunks) { new Uint8Array(buf, off, c.byteLength).set(new Uint8Array(c.buffer, c.byteOffset, c.byteLength)); off += pad(c.byteLength); }
  return buf;
}
export function unpackBuffers(buf) {
  const dv = new DataView(buf);
  const len = dv.getUint32(0, true);
  const meta = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, len)));
  const pad = (x) => (x + 3) & ~3;
  let off = 4 + pad(len);
  const chunks = [];
  for (const [ctor, n] of meta.chunks) {
    const C = { Float32Array, Int8Array, Int16Array, Uint8Array, Uint16Array, Uint32Array }[ctor];
    chunks.push(new C(buf.slice(off, off + n * C.BYTES_PER_ELEMENT)));
    off += pad(n * C.BYTES_PER_ELEMENT);
  }
  return { meta, chunks };
}

// ---- figure G <-> buffer -----------------------------------------------------------------------
export function serializeFigure(key, G) {
  const chunks = [];
  const meta = { kind: 'figure', key, body: encodeGeo(G.body.geo, chunks), head: G.head ? encodeGeo(G.head.geo, chunks) : null,
    hair: G.hair ? { geo: encodeGeo(G.hair.geo, chunks), mat: G.hair.mat, tris: G.hair.tris } : null,
    garments: G.garments.map((g) => ({ name: g.name, mat: g.mat, tris: g.tris, geo: encodeGeo(g.geo, chunks), extras: (g.extras || []).map((e) => ({ name: e.name, mat: e.mat || null, geo: encodeGeo(e.geo, chunks) })) })),
    tris: G.tris, ms: G.ms };
  return packBuffers(meta, chunks);
}
export function deserializeFigure(buf) {
  const { meta, chunks } = unpackBuffers(buf);
  const G = { body: { geo: decodeGeo(meta.body, chunks) }, head: meta.head ? { geo: decodeGeo(meta.head, chunks) } : null,
    hair: meta.hair ? { geo: decodeGeo(meta.hair.geo, chunks), mat: meta.hair.mat, tris: meta.hair.tris } : null,
    garments: meta.garments.map((g) => ({ name: g.name, mat: g.mat, tris: g.tris, geo: decodeGeo(g.geo, chunks), extras: g.extras.map((e) => ({ name: e.name, mat: e.mat || undefined, geo: decodeGeo(e.geo, chunks) })) })),
    accessories: [], tris: meta.tris, ms: 0, baked: true };
  return { key: meta.key, G };
}
export function serializeHand(key, G) {
  const chunks = [];
  const g = G.geo;
  const meta = { kind: 'hand', key, joints: G.joints, skin: encodeGeo(g.skin, chunks), glove: g.glove ? encodeGeo(g.glove, chunks) : null, skinArm: g.skinArm ? encodeGeo(g.skinArm, chunks) : null, cuffs: g.cuffs.map((c) => encodeGeo(c, chunks)) };
  return packBuffers(meta, chunks);
}
export function deserializeHand(buf) {
  const { meta, chunks } = unpackBuffers(buf);
  const geo = { skin: decodeGeo(meta.skin, chunks), glove: meta.glove ? decodeGeo(meta.glove, chunks) : null, skinArm: meta.skinArm ? decodeGeo(meta.skinArm, chunks) : null, cuffs: meta.cuffs.map((c) => decodeGeo(c, chunks)) };
  return { key: meta.key, G: { geo, joints: meta.joints, baked: true } };
}

// ---- browser loading ---------------------------------------------------------------------------
const BASE = '/previz/lib/cache/';
// the cache is only valid for the exact library sources it was baked from
export const SOURCE_FILES = ['figure.js', 'figure_garments.js', 'figure_sdf.js', 'hand.js', 'cast.js'];
export function sourceHash(texts) { return hashKey(texts.join('\n/*--*/\n')); }
let INDEX = null;
export async function cacheIndex() {
  if (INDEX) return INDEX;
  const empty = { figures: {}, hands: {} };
  try {
    const r = await fetch(BASE + 'index.json');
    INDEX = r.ok ? await r.json() : empty;
    if (INDEX !== empty) {
      const texts = await Promise.all(SOURCE_FILES.map((f) => fetch('/previz/lib/' + f).then((x) => x.text())));
      const h = sourceHash(texts);
      if (INDEX.src !== h) { console.warn(`figure cache is stale (baked ${INDEX.src}, sources ${h}) - building live; run: node previz/tools/bake_cast.mjs`); INDEX = empty; }
    }
  } catch (e) { INDEX = empty; }
  return INDEX;
}
// Load baked geometry for the given cache keys (figure keys pull in their hands too). Returns counts.
export async function preloadKeys({ figures = [], hands = [] } = {}) {
  const idx = await cacheIndex();
  let nf = 0, nh = 0;
  const handKeys = new Set(hands.map(hashKey));
  for (const k of figures) {
    if (FIGURE_CACHE.has(k)) continue;
    const e = idx.figures[hashKey(k)];
    if (!e) continue;
    for (const hk of e.hands || []) handKeys.add(hk);
    try { const r = await fetch(BASE + e.file); if (!r.ok) continue; const { key, G } = deserializeFigure(await r.arrayBuffer()); if (key === k) { FIGURE_CACHE.set(key, G); nf++; } } catch (err) { console.warn('figure cache', err); }
  }
  for (const hh of handKeys) {
    const e = idx.hands[hh];
    if (!e || [...HAND_CACHE.keys()].some((k) => hashKey(k) === hh)) continue;
    try { const r = await fetch(BASE + e.file); if (!r.ok) continue; const { key, G } = deserializeHand(await r.arrayBuffer()); HAND_CACHE.set(key, G); nh++; } catch (err) { console.warn('hand cache', err); }
  }
  return { figures: nf, hands: nh };
}
