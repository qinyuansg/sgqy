/* The Butterfly Garden — player + export hooks (used by tools/render_video.mjs). */
'use strict';

const CANVAS = document.getElementById('c');
ctx = CANVAS.getContext('2d');
const READY = loadAll().then(buildScenery);

// ---- hooks for the headless video exporter
window.__ready = READY.then(() => true);
window.__frame = (t, q = 0.93) => { render(t); return CANVAS.toDataURL('image/jpeg', q); };
window.__audio = async () => wavBase64(await renderSoundtrack(48000));

// ---- interactive player: plays the pre-rendered soundtrack file (falls back to live synthesis)
const btn = document.getElementById('play'), label = document.getElementById('label');
const still = QS.has('t') ? parseFloat(QS.get('t')) : null;
const track = new Audio('assets/soundtrack.m4a');
track.preload = 'auto';
let synth = null, raf = 0;          // {ac, t0} when the file is unavailable
const now = () => (synth ? synth.ac.currentTime - synth.t0 : track.currentTime);

READY.then(() => {
  render(still ?? 0.95);
  if (still !== null) { btn.hidden = true; return; }
  label.textContent = 'Tap to play';
}).catch(e => { label.textContent = 'Oops: ' + e.message; });

function frameLoop() {
  const t = now();
  render(Math.min(t, DUR));
  if (t < DUR && !(synth === null && track.ended)) raf = requestAnimationFrame(frameLoop);
  else { btn.hidden = false; label.textContent = 'Play again'; }
}
async function startSynth() {
  label.textContent = 'Making the music… (about a minute)';
  btn.hidden = false;
  const ac = new (window.AudioContext || window.webkitAudioContext)();
  const buf = await renderSoundtrack(ac.sampleRate);
  const src = ac.createBufferSource(); src.buffer = buf; src.connect(ac.destination);
  synth = { ac, t0: ac.currentTime + 0.1 }; src.start(synth.t0);
  btn.hidden = true;
}
btn.addEventListener('click', async () => {
  await READY;
  btn.hidden = true;
  cancelAnimationFrame(raf);
  if (!synth) {
    try { track.currentTime = 0; await track.play(); }
    catch (e) { await startSynth(); }
  } else { synth = null; return btn.click(); }
  raf = requestAnimationFrame(frameLoop);
});
document.addEventListener('keydown', e => {
  if (e.code !== 'Space') return;
  e.preventDefault();
  if (synth) synth.ac.state === 'running' ? synth.ac.suspend() : synth.ac.resume();
  else if (!track.ended && track.currentTime > 0) track.paused ? track.play() : track.pause();
});
