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

const BUILDERS = { kiosk, cabinet, reader };

export function buildPlaceholder(kind, name) {
  return (BUILDERS[kind] || cabinet)(name);
}
