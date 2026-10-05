// cast.js — every character of 《无数个今晚》 as a ready-made figure, close-up hands per character,
// accessories (glasses on cord, badge, bangles, hairpin, loupe, cufflink, flashlight), crowd extras.
//
//   import { makeCharacter, makeCharacterHand, makeExtra, makeCrowd, CAST_CODES } from '/previz/lib/cast.js';
//   const r = makeCharacter('RESTORER');            // Figure (see figure.js) – scene.add(r.root)
//   const h = makeCharacterHand('NAVIGATOR', 'R', { cuffTurned: true });   // Hand (see hand.js)
//
// Colours / fabrics follow bible/bible.json v1.0 (embedded below; if /bible/bible.json is reachable
// at import time its colour_hex values override the embedded ones by costume-item index).
import * as THREE from 'three';
import { makeFigure, figureKey } from './figure.js';
import { preloadKeys } from './figure_cache.js';
import { makeHand, handCacheKey } from './hand.js';
import { clothMaterial, leatherMaterial } from './figure_mat.js';

export const CAST_CODES = ['RESTORER', 'GUARD', 'NAVIGATOR', 'WIFE', 'MIGRANT', 'MAPHAND', 'MOTHER', 'COMPANION', 'TRAVELLER', 'LONELY', 'FUTURE', 'CHILD'];

const hex = (s) => (typeof s === 'number' ? s : parseInt(String(s).replace('#', ''), 16));

// ------------------------------------------------------------------------------------------
// bible colours (v1.0) – keyed slots map to bible costume item indices for live override
// ------------------------------------------------------------------------------------------
const C = {
  RESTORER: { skin: '#E3BFA0', hair: '#2A211C', coat: '#3C4045', wear: '#5A5E62', knit: '#D8CDBB', trousers: '#2B2D31', shoes: '#1D1D1F', gloves: '#F1EFE8', loupe: '#1A1A1A', buttons: '#3A2C22', smudge: '#B9AE9C' },
  GUARD: { skin: '#C99A78', hair: '#8E8C88', jacket: '#23304A', buttons: '#8F7A55', shirt: '#B9C3CC', trousers: '#1E2638', shoes: '#1A1A1C', glasses: '#111111', flashlight: '#1C1C1C', badge: '#A9B0B8' },
  NAVIGATOR: { skin: '#A26F4C', hair: '#1B1612', jacket: '#2E3F5C', worn: '#4A5F7E', patch: '#7D9CBB', stitch: '#E9E4D6', under: '#CFC3A8', trousers: '#2C2622', belt: '#A08E6E', headcloth: '#263650', outercoat: '#5B4634', sandals: '#B9A27A' },
  WIFE: { skin: '#D8AE8C', hair: '#1E1A18', jacket: '#7D9CBB', skirt: '#22283A', shoes: '#2A2624', hairpin: '#8A6A48', bangle: '#BFC2C2', thimble: '#9A7D4E' },
  MIGRANT: { skin: '#DDB392', hair: '#1C1816', blouse: '#8FA1B3', flowerA: '#EDE6D8', flowerB: '#C99A97', trousers: '#232633', shoes: '#1F1E1F', soles: '#D9D2C3', overjacket: '#3E4A5A' },
  MAPHAND: { skin: '#D6B59A', sleeve: '#22201E', cuff: '#ECE9E1', cufflink: '#A8894F' },
  MOTHER: { skin: '#C99A78', hair: '#1B1715', qipao: '#BDB6AB', bangle: '#9DB8A2', shoes: '#1C1B1D', bag: '#6A4A33' },
  COMPANION: { skin: '#B07A55', hair: '#1A1511', shirt: '#CBBFA3', trousers: '#3A2E24', band: '#CBBFA3' },
  TRAVELLER: { skin: '#D2A47F', hair: '#181412', jacket: '#6B5E50', shirt: '#7F93A6', cap: '#4E4A44', shoes: '#2A2826', trousers: '#3B3a3c' },
  LONELY: { skin: '#8A5F44', hair: '#E4E1DC', shirt: '#E6E1D6', trousers: '#6E6A64', cap: '#5A544C', shoes: '#2B2724' },
  FUTURE: { skin: '#CFA88C', hair: '#2B2522', garment: '#CFCAC2', shoes: '#9C968E' },
  CHILD: { skin: '#C8956E', hair: '#1A1511', jacket: '#7A6A55', trousers: '#2C2925' },
};
// bible costume-item index for each slot (live override)
const BIBLE_SLOTS = {
  RESTORER: { coat: 0, wear: 1, knit: 2, trousers: 3, shoes: 4, gloves: 5, loupe: 6 },
  GUARD: { jacket: 0, buttons: 1, shirt: 2, trousers: 3, shoes: 4, glasses: 5, flashlight: 6 },
  NAVIGATOR: { jacket: 0, patch: 1, under: 2, trousers: 3, belt: 4, headcloth: 5, outercoat: 6, sandals: 7 },
  WIFE: { jacket: 0, skirt: 1, shoes: 2, hairpin: 3, bangle: 4, thimble: 5 },
  MIGRANT: { blouse: 0, trousers: 1, shoes: 2, overjacket: 3 },
  MAPHAND: { sleeve: 0, cuff: 1, cufflink: 2 },
  MOTHER: { qipao: 0, bangle: 1, shoes: 2, bag: 3 },
  COMPANION: { shirt: 0, trousers: 1 },
  TRAVELLER: { jacket: 0, shirt: 1, cap: 2, shoes: 3 },
  LONELY: { shirt: 0, trousers: 1, cap: 2 },
  FUTURE: { garment: 0 },
};
// apply bible.json colours (costume colour_hex by item index, skin from the look text)
export function applyBible(bible) {
  if (!bible || !Array.isArray(bible.characters)) return false;
  for (const ch of bible.characters) {
    const code = ch.code, slots = BIBLE_SLOTS[code];
    if (!slots || !C[code]) continue;
    for (const [slot, i] of Object.entries(slots)) {
      const it = ch.costume?.[i];
      const h = it && (Array.isArray(it.colour_hex) ? it.colour_hex[0] : it.colour_hex);
      if (h && /^#[0-9a-fA-F]{6}$/.test(h)) C[code][slot] = h;
    }
    const m = /skin\s*(?:tone\s*)?(#[0-9A-Fa-f]{6})/.exec(ch.look || '') || /(#[0-9A-Fa-f]{6})\s*with/.exec(ch.look || '');
    if (m) C[code].skin = m[1];
  }
  return true;
}
try {
  if (typeof fetch !== 'undefined' && typeof location !== 'undefined') {
    const r = await fetch('/bible/bible.json');
    if (r.ok) applyBible(await r.json());
  }
} catch (e) { /* offline: embedded colours */ }
export const CAST_COLORS = C;

// ------------------------------------------------------------------------------------------
// figure specs
// ------------------------------------------------------------------------------------------
export function castSpec(code, o = {}) {
  const c = C[code];
  const k = (n) => hex(c[n]);
  switch (code) {
    case 'RESTORER': return {
      name: 'RESTORER', sex: 'f', height: 1.65, age: 28, build: 0.36, skin: k('skin'),
      hair: { style: 'ponytail', color: k('hair'), strands: 'R' },
      hands: { glove: o.gloves ?? true, slender: 0.96, R: { smudge: ['index', 'thumb'] } },
      costume: [
        { type: 'shirt', name: 'knit', color: k('knit'), fabric: 'knit', collar: 'round', closure: 'none', ease: 0.006, length: 'hip', sleeve: 'long', cuffStyle: 'plain' },
        { type: 'trousers', name: 'trousers', color: k('trousers'), fabric: 'serge', length: 'ankle', ease: 0.008, wide: 0.016 },
        { type: 'shoes', name: 'shoes', shoe: 'leather', color: k('shoes') },
        ...(o.coat === false ? [] : [{ type: 'coat', name: 'coat', color: k('coat'), fabric: 'wool', length: 0.385, ease: 0.014, drape: 0.9, collar: 'lapel', closure: 'center', buttons: 3, buttonColor: k('buttons'), vDepth: 0.19, wearColor: k('wear'), cuff: { style: 'plain', detail: [{ type: 'worn', side: 'L' }] } }]),
      ],
      accessories: o.loupe ? ['loupe'] : [],
    };
    case 'GUARD': return {
      name: 'GUARD', sex: 'm', height: 1.70, age: 65, build: 0.55, stoop: 0.55, skin: k('skin'),
      hair: { style: 'short', color: k('hair'), grey: 0.55, thickness: 0.04, hairline: 0.66 },
      hands: { age: 0.8 },
      costume: [
        { type: 'shirt', name: 'shirt', color: k('shirt'), fabric: 'cotton', collar: 'shirt', ease: 0.008, length: 'hip' },
        { type: 'trousers', name: 'trousers', color: k('trousers'), fabric: 'serge', ease: 0.01, wide: 0.02 },
        { type: 'shoes', name: 'shoes', shoe: 'leather', color: k('shoes') },
        { type: 'jacket', name: 'jacket', color: k('jacket'), fabric: 'serge', ease: 0.017, collar: 'lapel', vDepth: 0.22, buttons: 3, buttonColor: k('buttons'), length: 'hip' },
      ],
      accessories: ['glasses_cord', 'badge', 'flashlight'],
    };
    case 'NAVIGATOR': return {
      name: 'NAVIGATOR', sex: 'm', height: 1.72, age: 35, build: 0.62, skin: k('skin'),
      hair: { style: 'headcloth', color: k('headcloth'), fabric: 'cotton', topknot: true },
      hands: { variant: 'salt', age: 0.55, salt: 1 },
      salt: 0.4,
      barefoot: o.barefoot ?? false,
      costume: [
        { type: 'sailor', name: 'jacket', color: k('jacket'), fabric: 'indigo', length: 'hip', ease: 0.02, sleeveWidth: 0.03, collar: 'cross', underCollar: k('under'), wearZones: ['elbows', 'shoulders'], wearColor: k('worn'),
          cuff: { style: o.cuffTurned ? 'rolled' : 'plain', color: k('jacket'), detail: [{ type: 'patch', side: 'R', color: k('patch'), inside: !o.cuffTurned }] } },
        { type: 'trousers', name: 'trousers', color: k('trousers'), fabric: 'cotton', length: 'calf', wide: 0.035, rolled: true, ease: 0.014 },
        { type: 'sash', name: 'belt', color: k('belt'), fabric: 'canvas', width: 0.024, rope: true },
        ...(o.barefoot ? [] : [{ type: 'shoes', name: 'sandals', shoe: 'sandal', color: k('sandals') }]),
        ...(o.outerCoat ? [{ type: 'robe', name: 'outercoat', color: k('outercoat'), fabric: 'canvas', length: 'knee', ease: 0.034, collar: 'cross', sleeveWidth: 0.05, flare: 0.04 }] : []),
      ],
    };
    case 'WIFE': return {
      name: 'WIFE', sex: 'f', height: 1.58, age: 30, build: 0.36, skin: k('skin'),
      hair: { style: 'low_bun', color: k('hair') },
      hands: { slender: 0.95 },
      costume: [
        { type: 'skirt', name: 'skirt', color: k('skirt'), fabric: 'cotton', length: 'ankle', flare: 0.07, folds: 1.2 },
        { type: 'side_jacket', name: 'jacket', color: k('jacket'), fabric: 'cotton', length: 'thigh', trimColor: hex('#5f7fa0'), faded: 0.08 },
        { type: 'shoes', name: 'shoes', shoe: 'cloth', color: k('shoes'), soleColor: hex('#cfc6b4') },
      ],
      accessories: ['hairpin', 'bangle_silver_L'],
    };
    case 'MIGRANT': return {
      name: 'MIGRANT', sex: 'f', height: 1.55, age: 20, build: 0.55, skin: k('skin'),
      hair: { style: 'braid', color: k('hair'), bangs: 0.35 },
      costume: [
        { type: 'trousers', name: 'trousers', color: k('trousers'), fabric: 'cotton', length: 'ankle', wide: 0.025, ease: 0.012 },
        { type: 'blouse', name: 'blouse', color: k('blouse'), fabric: 'cotton', sleeve: '3/4', length: 'hip', print: { colors: [c.flowerA, c.flowerB, c.flowerA], leaf: '#9aa7a6', count: 11, scale: 0.12, dot: c.flowerA }, faded: 0.12 },
        { type: 'shoes', name: 'shoes', shoe: 'cloth', color: k('shoes'), soleColor: k('soles') },
        ...(o.overJacket ? [{ type: 'side_jacket', name: 'overjacket', color: k('overjacket'), fabric: 'cotton', length: 'hip', ease: 0.02 }] : []),
      ],
    };
    case 'MAPHAND': return {
      name: 'MAPHAND', sex: 'm', height: 1.75, age: 48, build: 0.55, skin: k('skin'),
      hair: { style: 'short', color: hex('#2b2420'), grey: 0.2 },
      costume: [
        { type: 'shirt', name: 'shirt', color: k('cuff'), fabric: 'linen', collar: 'shirt', length: 'hip', cuffStyle: 'band' },
        { type: 'trousers', name: 'trousers', color: k('sleeve'), fabric: 'wool' },
        { type: 'shoes', name: 'shoes', shoe: 'leather', color: hex('#151312') },
        { type: 'coat', name: 'frockcoat', color: k('sleeve'), fabric: 'wool', length: 'knee', collar: 'lapel', buttons: 4, buttonColor: hex('#141210'), sleeve: 0.96 },
      ],
    };
    case 'MOTHER': return {
      name: 'MOTHER', sex: 'f', height: 1.60, age: 45, build: 0.5, skin: k('skin'),
      hair: { style: 'low_bun', color: k('hair'), grey: 0.12 },
      hands: { slender: 1.0 },
      costume: [
        { type: 'cheongsam', name: 'qipao', color: k('qipao'), fabric: 'linen', length: 'knee', sleeve: 'short', ease: 0.009, flare: 0.03, slit: 0.1 },
        { type: 'shoes', name: 'shoes', shoe: 'leather', color: k('shoes') },
      ],
      accessories: ['bangle_jade_L'],
    };
    case 'COMPANION': return {
      name: 'COMPANION', sex: 'm', height: 1.63, age: 17, build: 0.28, skin: k('skin'),
      hair: { style: 'topknot', color: k('hair'), band: k('band') },
      barefoot: true,
      hands: { slender: 0.92, salt: 0.5, variant: 'salt' },
      costume: [
        { type: 'sailor', name: 'shirt', color: k('shirt'), fabric: 'linen', length: 'hip', ease: 0.016, collar: 'cross', sleeveWidth: 0.02, folds: 1.3, ragged: true },
        { type: 'trousers', name: 'trousers', color: k('trousers'), fabric: 'cotton', length: 'below_knee', wide: 0.02, ease: 0.012 },
      ],
    };
    case 'TRAVELLER': return {
      name: 'TRAVELLER', sex: 'm', height: 1.55, age: 15, build: 0.28, skin: k('skin'),
      hair: { style: 'cap', color: k('cap'), fabric: 'cotton' },
      costume: [
        { type: 'shirt', name: 'shirt', color: k('shirt'), fabric: 'cotton', collar: 'shirt', length: 'hip' },
        { type: 'trousers', name: 'trousers', color: k('trousers'), fabric: 'cotton', ease: 0.012 },
        { type: 'shoes', name: 'shoes', shoe: 'cloth', color: k('shoes'), soleColor: hex('#bdb3a0') },
        { type: 'jacket', name: 'jacket', color: k('jacket'), fabric: 'wool', ease: 0.034, length: 0.4, collar: 'lapel', buttons: 3, buttonColor: hex('#2a241e'), sleeve: 0.9, cuff: { style: 'rolled', width: 0.045 } },
      ],
    };
    case 'LONELY': return {
      name: 'LONELY', sex: 'm', height: 1.66, age: 76, build: 0.28, stoop: 0.65, skin: k('skin'),
      hair: { style: 'short', color: k('hair'), grey: 1, thickness: 0.022, hairline: 0.74 },
      hands: { age: 0.95 },
      costume: [
        { type: 'shirt', name: 'shirt', color: k('shirt'), fabric: 'cotton', collar: 'shirt', length: 'hip', ease: 0.012, faded: 0.1 },
        { type: 'trousers', name: 'trousers', color: k('trousers'), fabric: 'cotton', ease: 0.016 },
        { type: 'shoes', name: 'shoes', shoe: 'leather', color: k('shoes') },
      ],
    };
    case 'FUTURE': return {
      name: 'FUTURE', sex: 0.5, height: 1.70, age: 30, build: 0.4, skin: k('skin'),
      hair: { style: 'short', color: k('hair'), thickness: 0.07, volume: 0.02 },
      costume: [
        { type: 'robe', name: 'garment', color: k('garment'), fabric: 'knit', length: 'calf', collar: 'stand', collarHeight: 0.05, closure: 'none', ease: 0.016, sleeveWidth: 0.01, flare: 0.03 },
        { type: 'shoes', name: 'shoes', shoe: 'slipper', color: k('shoes') },
      ],
    };
    case 'CHILD': return {
      name: 'CHILD', sex: 'm', age: 5, build: 0.5, skin: k('skin'),
      hair: { style: 'topknot', color: k('hair') },
      barefoot: true,
      costume: [
        { type: 'side_jacket', name: 'jacket', color: k('jacket'), fabric: 'cotton', length: 'hip', ease: 0.012 },
        { type: 'trousers', name: 'trousers', color: k('trousers'), fabric: 'cotton', length: 'calf', ease: 0.01 },
      ],
    };
  }
  throw new Error('unknown character ' + code);
}

// ------------------------------------------------------------------------------------------
// accessories (rigid, attached to bones after construction)
// ------------------------------------------------------------------------------------------
const metal = (c, r = 0.35) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.9, roughness: r });
function addAccessory(fig, kind, code) {
  const P = fig.P, H = P.H, s = H / 1.7;
  const c = C[code] || {};
  const chest = fig.bone('chest');
  const chestW = fig.bindWorld[fig.bi.chest];
  const local = (v) => v; // bone frames are world-aligned in the neutral pose
  let obj = null;
  if (kind === 'glasses_cord') {
    // reading glasses hanging on the chest on a black cord
    obj = new THREE.Group(); obj.name = 'glasses';
    const fm = new THREE.MeshStandardMaterial({ color: hex(c.glasses || '#111'), metalness: 0.5, roughness: 0.35 });
    const lensM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, metalness: 0, transmission: 0, transparent: true, opacity: 0.18, envMapIntensity: 1.2 });
    const zf = P.rib[2] + 0.03 * s;
    for (const sg of [1, -1]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.019 * s, 0.0016 * s, 6, 24), fm); rim.scale.set(1.15, 0.8, 1);
      rim.position.set(sg * 0.024 * s, 0.075 * H - 0.012 * s, zf); rim.rotation.set(-0.2, 0, 0); obj.add(rim);
      const lens = new THREE.Mesh(new THREE.CircleGeometry(0.019 * s, 20), lensM); lens.scale.set(1.15, 0.8, 1); lens.position.copy(rim.position); lens.rotation.copy(rim.rotation); obj.add(lens);
    }
    const bridge = new THREE.Mesh(new THREE.TorusGeometry(0.006 * s, 0.0014 * s, 5, 10, Math.PI), fm); bridge.position.set(0, 0.075 * H - 0.004 * s, zf); obj.add(bridge);
    // cord: from the temples up round the back of the neck
    const nb = new THREE.Vector3().setFromMatrixPosition(fig.bindWorld[fig.bi.neck]);
    const cp = new THREE.Vector3().setFromMatrixPosition(chestW);
    const toLocal = (x, y, z) => new THREE.Vector3(x - cp.x, y - cp.y, z - cp.z);
    const pts = [];
    for (const [x, y, z] of [[0.045, 0.075 * H - 0.012 * s + cp.y, zf + cp.z - 0.003], [0.07, nb.y - 0.02, nb.z + 0.06], [0.06, nb.y + 0.02, nb.z - 0.01], [0.0, nb.y + 0.03, nb.z - 0.055], [-0.06, nb.y + 0.02, nb.z - 0.01], [-0.07, nb.y - 0.02, nb.z + 0.06], [-0.045, 0.075 * H - 0.012 * s + cp.y, zf + cp.z - 0.003]]) pts.push(toLocal(x * s, y, z));
    const cord = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0011 * s, 5, false), new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.6 }));
    obj.add(cord);
    chest.add(obj);
  } else if (kind === 'badge') {
    // invented embroidered badge on the LEFT chest: silver-grey ring with three wave lines
    const cv = typeof document !== 'undefined' ? document.createElement('canvas') : null;
    let mat;
    if (cv) {
      cv.width = cv.height = 128; const g = cv.getContext('2d');
      g.fillStyle = '#23304a'; g.fillRect(0, 0, 128, 128);
      g.strokeStyle = c.badge || '#A9B0B8'; g.lineWidth = 9; g.beginPath(); g.arc(64, 64, 46, 0, 6.283); g.stroke();
      g.lineWidth = 6; for (let i = 0; i < 3; i++) { g.beginPath(); for (let x = 30; x <= 98; x += 2) { const y = 50 + i * 14 + Math.sin(x * 0.18) * 4; x === 30 ? g.moveTo(x, y) : g.lineTo(x, y); } g.stroke(); }
      const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
      mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.75, metalness: 0.1 });
    } else mat = new THREE.MeshStandardMaterial({ color: 0x8a909a });
    obj = new THREE.Mesh(new THREE.CircleGeometry(0.022 * s, 32), mat); obj.name = 'badge';
    obj.position.set(0.075 * s, 0.085 * H, P.rib[2] + 0.033 * s); obj.rotation.set(-0.12, 0.25, 0);
    chest.add(obj);
  } else if (kind === 'flashlight') {
    obj = new THREE.Group(); obj.name = 'flashlight';
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.014 * s, 0.013 * s, 0.17 * s, 16), metal(hex(c.flashlight || '#1c1c1c'), 0.45));
    const head = new THREE.Mesh(new THREE.CylinderGeometry(0.02 * s, 0.015 * s, 0.035 * s, 16), body.material); head.position.y = -0.1 * s; body.add(head);
    obj.add(body);
    obj.position.set(-(P.pelvis[0] + 0.03 * s), -0.06 * s, 0.02 * s); obj.rotation.set(0, 0, -0.08);
    fig.bone('hips').add(obj);
  } else if (kind === 'hairpin') {
    obj = new THREE.Mesh(new THREE.CylinderGeometry(0.0022 * s, 0.0016 * s, 0.13 * s, 8), new THREE.MeshStandardMaterial({ color: hex(c.hairpin || '#8A6A48'), roughness: 0.5 }));
    obj.position.set(0.0, 0.2 * P.hu, -0.52 * P.hu); obj.rotation.set(0.2, 0, 1.25); obj.name = 'hairpin';
    fig.bone('head').add(obj);
  } else if (kind.startsWith('bangle')) {
    const side = kind.endsWith('_R') ? 'R' : 'L';
    const jade = kind.includes('jade');
    const m = jade ? new THREE.MeshPhysicalMaterial({ color: hex(c.bangle || '#9DB8A2'), roughness: 0.15, clearcoat: 0.6, sheen: 0, transmission: 0 }) : metal(hex(c.bangle || '#BFC2C2'), 0.3);
    obj = new THREE.Mesh(new THREE.TorusGeometry(P.wristR * 1.6, (jade ? 0.0045 : 0.0018) * s, 10, 36), m); obj.name = 'bangle' + side;
    obj.rotation.x = Math.PI / 2; obj.scale.set(0.95, 1.2, 1);
    obj.position.set(0, -0.012 * s, 0);
    fig.bone(`arm${side}.lower`).add(obj); obj.position.copy(fig.bone(`arm${side}.hand`).position).add(new THREE.Vector3(0, 0.03 * s, 0));
  } else if (kind === 'loupe') {
    obj = new THREE.Group(); obj.name = 'loupe';
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.4 * P.hu, 0.012 * P.hu, 6, 40), new THREE.MeshStandardMaterial({ color: hex(c.loupe || '#1a1a1a'), roughness: 0.55 }));
    band.position.set(0, 0.55 * P.hu, -0.06 * P.hu); band.rotation.set(Math.PI / 2 - 0.25, 0, 0); band.scale.set(0.92, 1.12, 1); obj.add(band);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.075 * P.hu, 0.075 * P.hu, 0.06 * P.hu, 20), band.material);
    lens.position.set(0.13 * P.hu, 0.45 * P.hu, 0.5 * P.hu); lens.rotation.x = Math.PI / 2 - 0.5; obj.add(lens);
    fig.bone('head').add(obj);
  }
  if (obj) obj.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return obj;
}

// ------------------------------------------------------------------------------------------
// public API
// ------------------------------------------------------------------------------------------
// makeCharacter(code, opts) -> Figure. opts: {lod:'hi'|'mid'|'lo', gloves (RESTORER), coat:false (RESTORER),
//   loupe (RESTORER), cuffTurned (NAVIGATOR: rolled cuff showing the patch), barefoot, outerCoat (NAVIGATOR),
//   overJacket (MIGRANT), any makeFigure option override}
export function makeCharacter(code, opts = {}) {
  const spec = castSpec(code, opts);
  const { accessories = [], ...fo } = spec;
  const fig = makeFigure({ ...fo, lod: opts.lod || fo.lod || 'hi', ...(opts.figure || {}) });
  fig.code = code;
  fig.accessories = {};
  for (const a of accessories) fig.accessories[a] = addAccessory(fig, a, code);
  return fig;
}

// makeCharacterHand(code, side, opts) -> Hand for close-ups / macro with the character's skin, age,
// glove/salt variant and sleeve cuff(s). opts: {lod:'macro'|'close', gloves, cuffTurned, noCuff, noBangle, hand:{...makeHand overrides}}
export function characterHandOptions(code, side = 'R', o = {}) {
  const c = C[code];
  const k = (n) => hex(c[n]);
  const base = { side, lod: o.lod || 'close' };
  let ho;
  switch (code) {
    case 'RESTORER':
      ho = { ...base, sex: 'f', age: 0.15, skin: k('skin'), slender: 0.96, variant: (o.gloves ?? true) ? 'glove' : 'bare', gloveColor: k('gloves'), smudge: side === 'R' && (o.gloves ?? true) ? ['index', 'thumb'] : null, smudgeColor: k('smudge'),
        cuffs: o.noCuff ? [] : [{ style: 'plain', color: k('coat'), fabric: 'wool', radius: 0.046, edge: 0.012, wearColor: k('wear'), detail: side === 'L' ? [{ type: 'worn' }] : [] }] };
      break;
    case 'GUARD':
      ho = { ...base, sex: 'm', age: 0.8, skin: k('skin'), cuffs: o.noCuff ? [] : [{ style: 'band', color: k('shirt'), fabric: 'cotton', radius: 0.036, edge: 0.0 }, { style: 'plain', color: k('jacket'), fabric: 'serge', radius: 0.048, edge: 0.03 }] };
      break;
    case 'NAVIGATOR':
      ho = { ...base, sex: 'm', age: 0.5, skin: k('skin'), variant: 'salt', salt: 1, width: 1.1, thick: 1.08, length: 0.195,
        cuffs: o.noCuff ? [] : [{ style: o.cuffTurned ? 'rolled' : 'plain', color: k('jacket'), fabric: 'indigo', radius: 0.05, edge: 0.016, mottle: 0.2, detail: side === 'R' ? [{ type: 'patch', color: k('patch'), stitch: k('stitch'), inside: !o.cuffTurned }] : [] }] };
      break;
    case 'WIFE':
      ho = { ...base, sex: 'f', age: 0.3, skin: k('skin'), slender: 0.95, cuffs: o.noCuff ? [] : [{ style: 'band', color: k('jacket'), fabric: 'cotton', radius: 0.045, edge: 0.03 }] };
      break;
    case 'MIGRANT':
      ho = { ...base, sex: 'f', age: 0.08, skin: k('skin'), length: 0.165, width: 0.98, cuffs: [] };
      break;
    case 'MAPHAND':
      ho = { ...base, sex: 'm', age: 0.5, skin: k('skin'), cuffs: o.noCuff ? [] : [{ style: 'band', color: k('cuff'), fabric: 'linen', radius: 0.035, edge: -0.002, len: 0.05 }, { style: 'plain', color: k('sleeve'), fabric: 'wool', radius: 0.047, edge: 0.016 }] };
      break;
    case 'MOTHER':
      ho = { ...base, sex: 'f', age: 0.5, skin: k('skin'), cuffs: [] };
      break;
    case 'COMPANION':
      ho = { ...base, sex: 'm', age: 0.1, skin: k('skin'), slender: 0.9, variant: 'salt', salt: 0.6, cuffs: o.noCuff ? [] : [{ style: 'plain', color: k('shirt'), fabric: 'linen', radius: 0.045, edge: 0.03 }] };
      break;
    case 'TRAVELLER':
      ho = { ...base, sex: 'm', age: 0.02, length: 0.165, skin: k('skin'), slender: 0.9, cuffs: o.noCuff ? [] : [{ style: 'rolled', color: k('jacket'), fabric: 'wool', radius: 0.05, edge: 0.03 }] };
      break;
    case 'LONELY':
      ho = { ...base, sex: 'm', age: 1.0, skin: k('skin'), slender: 0.9, cuffs: o.noCuff ? [] : [{ style: 'band', color: k('shirt'), fabric: 'cotton', radius: 0.04, edge: 0.02 }] };
      break;
    case 'FUTURE':
      ho = { ...base, sex: 'f', age: 0.2, skin: k('skin'), cuffs: o.noCuff ? [] : [{ style: 'plain', color: k('garment'), fabric: 'knit', radius: 0.042, edge: 0.03 }] };
      break;
    default:
      ho = { ...base };
  }
  return { ...ho, ...(o.hand || {}) };
}
export function makeCharacterHand(code, side = 'R', o = {}) {
  const c = C[code] || {};
  const k = (n) => hex(c[n]);
  const h = makeHand(characterHandOptions(code, side, o));
  if (code === 'MAPHAND' && !o.noCuff) { // plain brass oval cufflink, no engraving
    const cl = new THREE.Mesh(new THREE.SphereGeometry(0.0065, 16, 10), metal(k('cufflink'), 0.3)); cl.scale.set(1, 0.7, 0.45);
    cl.position.set((side === 'L' ? 1 : -1) * 0.012, 0.006, -0.028); h.byName.forearm.add(cl); cl.castShadow = true;
  }
  const bangle = code === 'WIFE' ? 'silver' : code === 'MOTHER' ? 'jade' : null;
  if (bangle && side === 'L' && !o.noBangle) {
    const jade = bangle === 'jade';
    const m = jade ? new THREE.MeshPhysicalMaterial({ color: k('bangle'), roughness: 0.12, clearcoat: 0.7 }) : metal(k('bangle'), 0.3);
    const b = new THREE.Mesh(new THREE.TorusGeometry(0.033, jade ? 0.0048 : 0.0019, 12, 48), m);
    b.rotation.x = Math.PI / 2; b.scale.set(0.82, 1.08, 1); b.position.set(0, 0.035, 0); b.castShadow = true;
    h.byName.forearm.add(b);
  }
  h.code = code;
  return h;
}

// ------------------------------------------------------------------------------------------
// crowd extras
// ------------------------------------------------------------------------------------------
function rng(seed) { let a = (seed >>> 0) || 1; return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const PAL = {
  modern: { tops: ['#2b2f36', '#4a4e55', '#6b6a66', '#24324a', '#5a4b3e', '#7c8590'], bottoms: ['#1f2228', '#2d3038', '#3b3a38'], skins: ['#E3BFA0', '#D6AE8E', '#C99A78', '#B98A68'] },
  navigator: { tops: ['#2E3F5C', '#3b4a63', '#CBBFA3', '#5b4634', '#4a4038'], bottoms: ['#2C2622', '#3A2E24', '#2a2e38'], skins: ['#A26F4C', '#B07A55', '#9a6a4a'] },
  home: { tops: ['#7D9CBB', '#5f6f7f', '#8a7a62', '#3b4250'], bottoms: ['#22283A', '#2a2624', '#3a3632'], skins: ['#D8AE8C', '#C99A78'] },
  migrant: { tops: ['#8FA1B3', '#6b7a8c', '#a59a86', '#3E4A5A', '#e3ddd0', '#5e5446', '#2f3440'], bottoms: ['#232633', '#2e2a28', '#3c3a38', '#1f2127'], skins: ['#DDB392', '#D2A47F', '#C99A78', '#B88A66'] },
  maphand: { tops: ['#22201E', '#3a3633', '#ECE9E1', '#4a4640'], bottoms: ['#22201E', '#2f2c2a'], skins: ['#D6B59A', '#C9A68A'] },
  chapel: { tops: ['#BDB6AB', '#4a4a4e', '#E6E1D6', '#5a5048', '#3e4656'], bottoms: ['#6E6A64', '#2c2b2c', '#3d3a36'], skins: ['#C99A78', '#8A5F44', '#B88A66', '#D6AE8E'] },
  future: { tops: ['#CFCAC2', '#b9b4ab', '#8f8a82'], bottoms: ['#9C968E', '#7d7871'], skins: ['#CFA88C', '#B98A68', '#E0BC9E'] },
};
const pick = (r, a) => a[Math.floor(r() * a.length) % a.length];

// makeExtra(era, seed, opts) -> Figure at low LOD (mitten hands). Deterministic per seed.
export function makeExtra(era = 'migrant', seed = 1, o = {}) {
  const r = rng(seed * 7919 + 13);
  const pal = PAL[era] || PAL.migrant;
  const female = r() < 0.5;
  const age = 18 + Math.floor(r() * 50);
  const top = hex(pick(r, pal.tops)), bot = hex(pick(r, pal.bottoms)), skin = hex(pick(r, pal.skins));
  const hairC = age > 55 ? 0x6e6b67 : 0x1a1512;
  let costume, hair;
  switch (era) {
    case 'navigator':
      costume = [{ type: 'sailor', color: top, fabric: 'indigo', collar: 'cross' }, { type: 'trousers', color: bot, length: 'calf', wide: 0.03 }];
      hair = { style: 'headcloth', color: hex(pick(r, ['#263650', '#4a4038', '#2c2a28'])) };
      break;
    case 'home':
      costume = female ? [{ type: 'skirt', color: bot, length: 'ankle' }, { type: 'side_jacket', color: top }] : [{ type: 'trousers', color: bot }, { type: 'side_jacket', color: top, length: 'hip' }];
      hair = { style: female ? 'low_bun' : 'topknot', color: hairC };
      break;
    case 'modern':
      costume = [{ type: 'trousers', color: bot }, { type: r() < 0.5 ? 'jacket' : 'coat', color: top, collar: r() < 0.5 ? 'lapel' : 'stand', closure: 'center', buttons: 0 }, { type: 'shoes', color: 0x1c1c1e }];
      hair = { style: female ? (r() < 0.5 ? 'bob' : 'ponytail') : 'short', color: hairC };
      break;
    case 'chapel':
      costume = female ? [{ type: 'dress', color: top, length: 'calf', sleeve: 'elbow' }, { type: 'shoes', color: 0x1c1b1d }] : [{ type: 'trousers', color: bot }, { type: 'shirt', color: top }, { type: 'shoes', color: 0x221d1a }];
      hair = { style: female ? 'low_bun' : 'short', color: hairC, grey: age > 55 ? 0.6 : 0 };
      break;
    case 'future':
      costume = [{ type: 'robe', color: top, fabric: 'knit', collar: 'stand', closure: 'none' }];
      hair = { style: 'short', color: hairC };
      break;
    case 'maphand':
      costume = [{ type: 'trousers', color: bot }, { type: 'coat', color: top, collar: 'lapel', buttons: 0 }];
      hair = { style: 'short', color: hairC };
      break;
    default: // migrant era pier crowd
      if (female) costume = [{ type: 'trousers', color: bot, wide: 0.02 }, { type: 'blouse', color: top, sleeve: r() < 0.5 ? '3/4' : 'long' }, { type: 'shoes', shoe: 'cloth', color: 0x1f1e1f }];
      else costume = [{ type: 'trousers', color: bot }, { type: r() < 0.4 ? 'side_jacket' : 'jacket', color: top, collar: r() < 0.5 ? 'mandarin' : 'lapel', buttons: 0, length: 'hip' }, { type: 'shoes', shoe: r() < 0.5 ? 'cloth' : 'leather', color: 0x201d1b }];
      hair = { style: female ? (r() < 0.5 ? 'braid' : 'low_bun') : (r() < 0.4 ? 'cap' : 'short'), color: r() < 0.4 && !female ? hex(pick(r, ['#4E4A44', '#3b3a38', '#5a5046'])) : hairC };
  }
  const fig = makeFigure({ sex: female ? 'f' : 'm', height: (female ? 1.52 : 1.62) + r() * 0.14, build: 0.3 + r() * 0.5, age, skin, hair, costume, lod: o.lod || 'lo', name: `extra_${era}_${seed}` });
  fig.code = 'EXTRA';
  return fig;
}

// makeCrowd(era, people, opts) -> THREE.Group of InstancedMeshes (cheap). people = [{pos:[x,y,z], rotY, pose, phase, seed}]
// opts.variants: number of distinct baked figures (default 6); poses baked per variant on demand.
export function makeCrowd(era, people, o = {}) {
  const nVar = o.variants || 6;
  const group = new THREE.Group(); group.name = 'crowd_' + era;
  const figs = [];
  for (let v = 0; v < nVar; v++) figs.push(makeExtra(era, (o.seed || 1) * 101 + v, { lod: o.lod || 'lo' }));
  const buckets = new Map();
  const dummy = new THREE.Object3D();
  for (const [i, p] of people.entries()) {
    const v = (p.variant ?? (p.seed ?? i)) % nVar;
    const poseKey = `${p.pose || 'stand'}|${(p.phase ?? 0).toFixed(2)}`;
    const k = v + '|' + poseKey;
    if (!buckets.has(k)) buckets.set(k, { v, pose: p.pose || 'stand', phase: p.phase ?? 0, list: [] });
    buckets.get(k).list.push(p);
  }
  for (const b of buckets.values()) {
    const f = figs[b.v];
    f.pose(b.pose, { phase: b.phase, seat: b.seat });
    const baked = f.bake();
    for (const part of baked.children) {
      const im = new THREE.InstancedMesh(part.geometry, part.material, b.list.length);
      im.castShadow = o.castShadow ?? true; im.receiveShadow = true;
      b.list.forEach((p, j) => {
        dummy.position.fromArray(p.pos); dummy.rotation.set(0, p.rotY || 0, 0); dummy.scale.setScalar(p.scale || 1); dummy.updateMatrix();
        im.setMatrixAt(j, dummy.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      group.add(im);
    }
  }
  group.userData.figures = figs;
  return group;
}

// ------------------------------------------------------------------------------------------
// async loaders (use baked geometry from previz/lib/cache when available — instant start-up)
// ------------------------------------------------------------------------------------------
export async function preloadCharacters(codes, opts = {}) {
  const keys = codes.map((c) => { const { accessories, ...fo } = castSpec(c, opts); return figureKey({ ...fo, lod: opts.lod || 'hi', ...(opts.figure || {}) }); });
  return preloadKeys({ figures: keys });
}
export async function loadCharacter(code, opts = {}) {
  await preloadCharacters([code], opts);
  return makeCharacter(code, opts);
}
export async function loadCharacterHand(code, side = 'R', opts = {}) {
  await preloadKeys({ hands: [handCacheKey(characterHandOptions(code, side, opts))] });
  return makeCharacterHand(code, side, opts);
}

export { addAccessory };
