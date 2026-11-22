// Stand-in 3D models, used until a real .glb file (or photo) is supplied for
// a product in content.json. Each builder returns a THREE.Group standing on
// y = 0 and roughly 1.7 units tall.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const shell = () => new THREE.MeshStandardMaterial({ color: 0xe8edf3, roughness: 0.5, metalness: 0.05 });
const graphite = () => new THREE.MeshStandardMaterial({ color: 0x1b2430, roughness: 0.45, metalness: 0.3 });
const glass = () => new THREE.MeshStandardMaterial({ color: 0x05080d, roughness: 0.12, metalness: 0.6 });
const glow = (color = 0x35e0c8, intensity = 1.6) =>
  new THREE.MeshStandardMaterial({ color: 0x08110f, emissive: color, emissiveIntensity: intensity, roughness: 0.4 });

function box(group, w, h, d, r, mat, x, y, z) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, Math.min(r, w / 2, h / 2, d / 2)), mat);
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

function screenMaterial(label) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#0d3b66');
  grad.addColorStop(1, '#08203a');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  g.fillStyle = '#35e0c8';
  g.fillRect(56, 70, 120, 10);
  g.fillStyle = '#ffffff';
  g.font = '600 54px system-ui, sans-serif';
  g.fillText(label, 56, 160);
  g.fillStyle = 'rgba(255,255,255,0.22)';
  for (let i = 0; i < 4; i++) g.fillRect(56, 220 + i * 62, 400 - i * 50, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: tex, toneMapped: false });
}

function screen(group, label, w, h, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), screenMaterial(label));
  mesh.position.set(x, y, z);
  group.add(mesh);
  return mesh;
}

function kiosk(name) {
  const g = new THREE.Group();
  box(g, 0.66, 0.05, 0.56, 0.02, graphite(), 0, 0.025, 0.02);          // floor plate
  box(g, 0.5, 0.9, 0.3, 0.05, shell(), 0, 0.5, 0);                     // pedestal
  box(g, 0.56, 0.1, 0.5, 0.04, shell(), 0, 0.84, 0.08);                // shelf
  box(g, 0.62, 0.86, 0.26, 0.06, shell(), 0, 1.3, 0.05);               // head
  box(g, 0.52, 0.52, 0.02, 0.01, glass(), 0, 1.2, 0.185);              // bezel
  screen(g, name, 0.46, 0.46, 0, 1.2, 0.197);
  box(g, 0.2, 0.06, 0.02, 0.01, glass(), 0, 1.56, 0.185);              // camera bar
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 24), glow(0x4aa8ff, 0.8));
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 1.56, 0.195);
  g.add(lens);
  box(g, 0.02, 0.5, 0.02, 0.008, glow(), -0.285, 1.2, 0.18);           // light strips
  box(g, 0.02, 0.5, 0.02, 0.008, glow(), 0.285, 1.2, 0.18);
  box(g, 0.14, 0.03, 0.12, 0.01, graphite(), 0.17, 0.9, 0.22);         // card reader
  box(g, 0.1, 0.012, 0.02, 0.004, glow(0x35e0c8, 1.2), 0.17, 0.9, 0.282);
  box(g, 0.2, 0.05, 0.02, 0.008, glass(), -0.14, 0.7, 0.15);           // printer slot
  return g;
}

function cabinet(name) {
  const g = new THREE.Group();
  box(g, 0.76, 0.06, 0.56, 0.02, graphite(), 0, 0.03, 0);
  box(g, 0.7, 1.6, 0.5, 0.04, graphite(), 0, 0.86, 0);
  box(g, 0.62, 1.48, 0.02, 0.02, shell(), 0, 0.86, 0.25);              // front door
  box(g, 0.5, 0.3, 0.02, 0.01, glass(), 0, 1.3, 0.262);
  screen(g, name, 0.46, 0.26, 0, 1.3, 0.274);
  box(g, 0.2, 0.2, 0.03, 0.02, graphite(), 0.19, 0.85, 0.265);         // module
  box(g, 0.12, 0.02, 0.012, 0.004, glow(0x35e0c8, 1.4), 0.19, 0.85, 0.283);
  box(g, 0.2, 0.2, 0.03, 0.02, graphite(), -0.19, 0.85, 0.265);
  for (let i = 0; i < 5; i++) box(g, 0.5, 0.018, 0.012, 0.004, glass(), 0, 0.3 + i * 0.05, 0.262); // vents
  box(g, 0.012, 1.44, 0.012, 0.004, glow(0x4aa8ff, 1.2), -0.33, 0.86, 0.252);
  box(g, 0.012, 1.44, 0.012, 0.004, glow(0x4aa8ff, 1.2), 0.33, 0.86, 0.252);
  return g;
}

function reader(name) {
  const g = new THREE.Group();
  box(g, 0.6, 1.62, 0.04, 0.02, shell(), 0, 0.95, -0.06);              // wall plate
  box(g, 0.5, 1.5, 0.14, 0.06, graphite(), 0, 0.95, 0.02);             // body
  box(g, 0.44, 1.44, 0.01, 0.005, glass(), 0, 0.95, 0.09);             // glass face
  screen(g, name, 0.36, 0.36, 0, 1.12, 0.097);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.012, 12, 48), glow(0x35e0c8, 1.8));
  ring.position.set(0, 0.56, 0.097);
  g.add(ring);
  const dot = new THREE.Mesh(new THREE.CircleGeometry(0.035, 32), glow(0x35e0c8, 1.2));
  dot.position.set(0, 0.56, 0.097);
  g.add(dot);
  box(g, 0.24, 0.03, 0.01, 0.004, glow(0x66ff9a, 1.8), 0, 1.5, 0.095); // status light
  return g;
}

// Modelled on the NOVA+ concept image: tall glass-fronted reader, camera bar
// on top, sensor chin below, leaning back on a slim stand.
function novaReader(name) {
  const g = new THREE.Group();
  box(g, 0.5, 0.04, 0.42, 0.02, shell(), 0, 0.02, -0.08);                 // foot
  const arm = box(g, 0.14, 0.86, 0.06, 0.03, shell(), 0, 0.44, -0.16);     // stand
  arm.rotation.x = 0.12;
  box(g, 0.02, 0.1, 0.064, 0.008, glow(0x22e3a6, 1.8), -0.071, 0.6, -0.14).rotation.x = 0.12;

  const head = new THREE.Group();
  head.position.set(0, 1.2, 0.1);
  head.rotation.x = -0.2;
  g.add(head);
  box(head, 0.5, 1.0, 0.09, 0.07, shell(), 0, 0, 0);                       // body
  box(head, 0.44, 0.78, 0.012, 0.03, glass(), 0, 0.08, 0.045);             // glass face
  screen(head, name, 0.36, 0.5, 0, 0.04, 0.0525);
  box(head, 0.3, 0.035, 0.008, 0.012, glow(0xdfe9f5, 0.9), 0, 0.435, 0.05); // light bar
  for (const x of [-0.045, 0.045]) {                                       // cameras
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 32), glow(0x4aa8ff, 0.7));
    lens.position.set(x, 0.385, 0.0525);
    head.add(lens);
  }
  const pad = new THREE.Mesh(new THREE.RingGeometry(0.028, 0.034, 4, 1, Math.PI / 4), glow(0xffffff, 0.9));
  pad.scale.set(1.3, 0.8, 1);
  pad.position.set(0, -0.25, 0.0525);
  head.add(pad);
  for (const x of [-0.05, 0.05]) {                                         // chin sensors
    const eye = new THREE.Mesh(new THREE.CircleGeometry(0.024, 32), glass());
    eye.position.set(x, -0.41, 0.0455);
    head.add(eye);
  }
  return g;
}

// Generic self-service clearance kiosk: pedestal with a biometric head.
function clearanceKiosk(name) {
  const g = new THREE.Group();
  box(g, 0.7, 0.05, 0.56, 0.02, graphite(), 0, 0.025, 0);
  box(g, 0.44, 1.0, 0.3, 0.06, shell(), 0, 0.55, -0.04);                   // pedestal
  box(g, 0.012, 0.9, 0.012, 0.004, glow(0x22e3a6, 1.4), -0.2, 0.55, 0.112);
  box(g, 0.012, 0.9, 0.012, 0.004, glow(0x22e3a6, 1.4), 0.2, 0.55, 0.112);
  box(g, 0.6, 0.08, 0.44, 0.03, shell(), 0, 1.02, 0.06);                   // deck
  box(g, 0.26, 0.012, 0.2, 0.004, glass(), -0.13, 1.064, 0.12);            // passport reader window
  box(g, 0.16, 0.02, 0.14, 0.008, graphite(), 0.18, 1.068, 0.14);          // fingerprint scanner
  box(g, 0.1, 0.006, 0.08, 0.002, glow(0x22e3a6, 1.1), 0.18, 1.08, 0.14);
  box(g, 0.6, 0.62, 0.14, 0.05, shell(), 0, 1.38, -0.08);                  // head
  box(g, 0.52, 0.4, 0.012, 0.01, glass(), 0, 1.33, -0.006);
  screen(g, name, 0.46, 0.34, 0, 1.33, 0.002);
  box(g, 0.4, 0.07, 0.012, 0.02, glass(), 0, 1.61, -0.006);                // camera bar
  for (const x of [-0.06, 0.06]) {
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.02, 32), glow(0x4aa8ff, 0.8));
    lens.position.set(x, 1.61, 0.001);
    g.add(lens);
  }
  box(g, 0.2, 0.012, 0.012, 0.004, glow(0x22e3a6, 1.6), 0, 1.665, -0.006); // status light
  return g;
}

// Nova (card + PIN) and Nova Plus (iris, face, QR, card, fingerprint) side by
// side on a display panel. Layout follows the product slide description.
function novaFamily() {
  const g = new THREE.Group();
  box(g, 1.3, 1.7, 0.04, 0.03, graphite(), 0, 0.85, -0.05);                // display panel
  const lens = (x, y, z, r, mat) => {
    const m = new THREE.Mesh(new THREE.CircleGeometry(r, 32), mat);
    m.position.set(x, y, z);
    g.add(m);
  };
  const cardIcon = (x, y, z) => {
    box(g, 0.13, 0.085, 0.004, 0.012, glow(0xffffff, 0.5), x, y, z);
    box(g, 0.115, 0.07, 0.005, 0.008, glass(), x, y, z);
    box(g, 0.05, 0.008, 0.006, 0.003, glow(0x22e3a6, 1.4), x, y - 0.02, z);
  };

  // ---- Nova Plus (left)
  const px = -0.3;
  box(g, 0.42, 1.3, 0.09, 0.05, shell(), px, 0.9, 0.005);                  // body
  box(g, 0.37, 0.96, 0.012, 0.03, glass(), px, 1.0, 0.05);                 // glass face
  box(g, 0.2, 0.09, 0.05, 0.02, graphite(), px, 1.5, 0.04);                // iris module
  lens(px - 0.045, 1.5, 0.066, 0.022, glow(0xb0483a, 0.7));
  lens(px + 0.045, 1.5, 0.066, 0.022, glow(0xb0483a, 0.7));
  for (let i = 0; i < 3; i++) box(g, 0.14, 0.006, 0.004, 0.002, graphite(), px, 1.405 + i * 0.012, 0.057); // speaker
  lens(px - 0.05, 1.345, 0.0575, 0.02, glow(0x4aa8ff, 0.8));               // face cameras
  lens(px + 0.05, 1.345, 0.0575, 0.02, glow(0x4aa8ff, 0.8));
  box(g, 0.05, 0.036, 0.004, 0.006, glow(0x7a1010, 0.9), px + 0.135, 1.345, 0.057); // QR window
  screen(g, 'Nova Plus', 0.32, 0.5, px, 1.03, 0.0575);
  cardIcon(px, 0.66, 0.0575);
  box(g, 0.42, 0.2, 0.1, 0.05, shell(), px, 0.36, 0.012);                  // base
  box(g, 0.12, 0.1, 0.012, 0.02, glass(), px, 0.36, 0.062);                // fingerprint sensor
  box(g, 0.08, 0.06, 0.004, 0.012, glow(0x22e3a6, 1.0), px, 0.36, 0.069);

  // ---- Nova (right)
  const nx = 0.33;
  box(g, 0.38, 0.86, 0.08, 0.05, shell(), nx, 0.88, 0);
  box(g, 0.33, 0.8, 0.012, 0.03, glass(), nx, 0.88, 0.04);
  box(g, 0.2, 0.012, 0.004, 0.004, glow(0x22e3a6, 1.6), nx, 1.24, 0.047);  // status light
  for (let r = 0; r < 4; r++) {                                            // touch keypad
    for (let c = 0; c < 3; c++) {
      box(g, 0.06, 0.06, 0.004, 0.014, glow(0xdfe9f5, 0.35), nx + (c - 1) * 0.085, 1.15 - r * 0.085, 0.047);
    }
  }
  cardIcon(nx, 0.6, 0.047);
  return g;
}

const BUILDERS = { kiosk, cabinet, reader, novaReader, clearanceKiosk, novaFamily };

export function buildPlaceholder(kind, name) {
  return (BUILDERS[kind] || cabinet)(name);
}
