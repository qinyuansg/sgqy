// Fallback slate: drawn for shots whose scene module is missing or threw an error.
// Shows shot id, timecode, lyric and action so a full-length timing animatic exists from day one.
import * as THREE from 'three';

const tc = (f) => { const s = Math.floor(f / 24); return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}:${String(f % 24).padStart(2, '0')}`; };

function wrap(g, text, x, y, maxW, lh, maxLines = 4) {
  let line = '', n = 0;
  for (const ch of String(text || '')) {
    const t = line + ch;
    if (g.measureText(t).width > maxW) { g.fillText(line, x, y + n * lh); line = ch; if (++n >= maxLines) return; }
    else line = t;
  }
  if (line) g.fillText(line, x, y + n * lh);
}

export default async function create(ctx) {
  const { W, H } = ctx;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 10);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const h = 2 * Math.tan(THREE.MathUtils.degToRad(25));
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(h * (W / H), h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  plane.position.z = -1; scene.add(plane);
  const s = W / 1280;
  return {
    scene, camera,
    post: { grain: 0.02, vignette: 0.2, saturation: 1, exposure: 1.6, bloom: { strength: 0 }, aberration: 0 },
    setShot(shot, tl, u) {
      const grd = g.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, '#0b1730'); grd.addColorStop(1, '#05080f');
      g.fillStyle = grd; g.fillRect(0, 0, W, H);
      g.fillStyle = 'rgba(200,170,110,0.9)'; g.font = `${28 * s}px "WenQuanYi Zen Hei", sans-serif`;
      const inF = shot.in_frame ?? 0, outF = shot.out_frame ?? 24;
      g.fillText(`${shot.id}  ·  ${tc(inF)} – ${tc(outF)}  ·  ${shot.section || ''}  ·  ${shot.scene || ''}`, 48 * s, 64 * s);
      g.fillStyle = '#e8edf5'; g.font = `${44 * s}px "WenQuanYi Zen Hei", sans-serif`;
      g.fillText(shot.lyric || '（无歌词）', 48 * s, 140 * s);
      g.fillStyle = 'rgba(200,210,225,0.85)'; g.font = `${24 * s}px "WenQuanYi Zen Hei", sans-serif`;
      wrap(g, `${shot.shot_size || ''} ${shot.lens_mm ? shot.lens_mm + 'mm' : ''} ${shot.camera_move || ''}`, 48 * s, 200 * s, W - 96 * s, 32 * s, 2);
      wrap(g, shot.action || '', 48 * s, 280 * s, W - 96 * s, 32 * s, 5);
      if (shot._error) { g.fillStyle = '#ff7a6a'; g.font = `${18 * s}px monospace`; wrap(g, shot._error, 48 * s, H - 70 * s, W - 96 * s, 22 * s, 2); }
      g.fillStyle = 'rgba(200,170,110,0.8)'; g.fillRect(0, H - 6 * s, W * Math.min(1, Math.max(0, u)), 6 * s);
      tex.needsUpdate = true;
      camera.position.set(0, 0, 0); camera.lookAt(0, 0, -1);
      return {};
    },
  };
}
