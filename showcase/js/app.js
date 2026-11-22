// Screens and state. All text and product data come from content.json.
import { createViewer } from './viewer.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const EDIT = params.has('edit');

const ICONS = {
  screen: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M2.5 10h19M6 15h4"/>',
  printer: '<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>',
  cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.4 9.3 8 11 4.6-1.700 8-6 8-11V5z"/><path d="m9 12 2 2 4-4"/>',
  signal: '<path d="M5 12.5a10 10 0 0 1 14 0M8 15.500a6 6 0 0 1 8 0"/><circle cx="12" cy="19" r="1"/><path d="M2 9a15 15 0 0 1 20 0"/>',
  light: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-4 10.500c.7.700 1 1.500 1 2.500h6c0-1 .3-1.800 1-2.500A6 6 0 0 0 12 3z"/>',
  scan: '<path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3M4 12h16"/>',
  fingerprint: '<path d="M12 11v4a6 6 0 0 1-1 3.300M8 11a4 4 0 0 1 8 0v3a12 12 0 0 1-1 5M5 14v-3a7 7 0 0 1 12-5M19 11v3M6.500 19a9 9 0 0 0 1.500-4"/>',
  speaker: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.500 8.500a5 5 0 0 1 0 7M19 6a8.500 8.500 0 0 1 0 12"/>',
  plug: '<path d="M9 2v6M15 2v6M6 8h12v3a6 6 0 0 1-12 0zM12 17v5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  dot: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.500"/>',
  search: '<circle cx="11" cy="11" r="6.500"/><path d="m20 20-4.300-4.300"/>',
};
const icon = (name) => `<svg viewBox="0 0 24 24">${ICONS[name] || ICONS.dot}</svg>`;

// Descriptions may use <b>, <i>, <br> and new lines; everything else is shown as text.
function rich(text) {
  const escaped = String(text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return escaped
    .replace(/&lt;(\/?)(b|i|strong|em)&gt;/gi, '<$1$2>')
    .replace(/&lt;br\s*\/?&gt;/gi, '<br>')
    .replace(/\n/g, '<br>');
}

const state = { content: null, productIndex: -1, featureIndex: -1 };
let viewer;

init().catch((err) => {
  console.error(err);
  const box = $('fatal');
  box.hidden = false;
  box.textContent = location.protocol === 'file:'
    ? 'This page must be opened through a web server (see README), not directly from a file.'
    : 'Could not start the showcase: ' + err.message;
});

async function init() {
  const res = await fetch('content.json?v=' + Date.now());
  if (!res.ok) throw new Error('content.json not found');
  const content = (state.content = await res.json());
  const ui = content.ui || {};
  const brand = content.branding || {};

  document.title = brand.title || 'Product Showcase';
  const title = brand.title || '';
  const accent = brand.titleAccent && title.includes(brand.titleAccent) ? brand.titleAccent : '';
  $('home-title').innerHTML = accent
    ? rich(title).replace(rich(accent), `<span>${rich(accent)}</span>`)
    : rich(title);
  $('home-subtitle').innerHTML = rich(brand.subtitle);
  $('sectors').replaceChildren(...(brand.sectors || []).map((t) => Object.assign(document.createElement('li'), { textContent: t })));
  $('btn-next-label').textContent = ui.nextButtonText || 'NEXT';
  $('btn-reset-label').textContent = ui.resetButtonText || 'RESET VIEW';
  $('explore-hint-text').textContent = ui.tapToExploreText || 'TAP TO EXPLORE';
  if (content.background && content.background.imageUrl) {
    $('backdrop-image').style.backgroundImage = `url("${content.background.imageUrl}")`;
  }
  const footer = $('home-footer');
  if (brand.footerText) footer.append(Object.assign(document.createElement('span'), { textContent: brand.footerText }));
  const logos = document.createElement('div');
  logos.className = 'logos';
  (brand.logos || []).forEach((l) => logos.append(Object.assign(new Image(), { src: l.imageUrl, alt: l.alt || '' })));
  footer.append(logos);

  viewer = createViewer($('stage'), $('hotspot-layer'), { edit: EDIT });
  viewer.onHotspotTap((i) => selectFeature(i));
  viewer.onInteract(() => $('explore-hint').classList.add('is-gone'));

  await buildLineup(content.products, ui);
  wireControls();
  startBackdrop();
  startIdleTimer(ui.idleResetSeconds);

  const deepLink = content.products.findIndex((p) => p.id === params.get('product'));
  if (deepLink >= 0) openProduct(deepLink);
}

// ---------- home screen ----------

async function buildLineup(products, ui) {
  const lineup = $('lineup');
  for (const [index, product] of products.entries()) {
    const node = document.createElement('button');
    node.className = 'product';
    node.style.setProperty('--scale', product.homeScale || 1);
    node.title = `${ui.inspectTitle || 'Inspect'} ${product.name}`;
    node.innerHTML =
      '<span class="product-visual"><img alt="" draggable="false"></span>' +
      `<span class="pin"><span class="pin-pulse"></span><span class="pin-circle">${icon('search')}</span></span>` +
      '<span class="product-name"></span>';
    node.querySelector('.product-name').textContent = product.name;
    const img = node.querySelector('img');
    img.alt = product.name;
    try {
      img.src = product.imageUrl || (await viewer.snapshot(product));
    } catch (err) {
      console.error(`Could not load ${product.name}`, err);
      node.classList.add('is-broken');
    }
    node.addEventListener('click', () => openProduct(index));
    lineup.append(node);
  }
}

// ---------- viewer screen ----------

async function openProduct(index) {
  const products = state.content.products;
  const product = products[(index + products.length) % products.length];
  state.productIndex = products.indexOf(product);
  state.featureIndex = -1;

  $('loading').hidden = false;
  try {
    await viewer.show(product);
  } catch (err) {
    console.error(err);
    $('loading').hidden = true;
    return;
  }
  $('loading').hidden = true;

  $('viewer-title').textContent = product.name;
  $('viewer-desc').innerHTML = rich(product.description);
  $('btn-next').hidden = products.length < 2;
  $('explore-hint').classList.remove('is-gone');

  const row = $('feature-row');
  row.replaceChildren();
  (product.features || []).forEach((f, i) => {
    const btn = document.createElement('button');
    btn.className = 'feature-btn';
    btn.innerHTML = `<span class="feature-icon">${icon(f.icon)}</span><span class="feature-label"></span>`;
    btn.querySelector('.feature-label').textContent = f.title;
    btn.addEventListener('click', () => selectFeature(i));
    row.append(btn);
  });
  const dots = $('card-dots');
  dots.replaceChildren(...(product.features || []).map((_, i) => {
    const d = document.createElement('button');
    d.setAttribute('aria-label', `Feature ${i + 1}`);
    d.addEventListener('click', () => selectFeature(i));
    return d;
  }));

  renderFeature();
  $('screen-home').hidden = true;
  $('screen-viewer').hidden = false;
  document.body.classList.add('in-viewer');
  viewer.setRunning(true);
}

function goHome() {
  state.productIndex = -1;
  state.featureIndex = -1;
  document.body.classList.remove('in-viewer', 'has-feature');
  $('screen-viewer').hidden = true;
  $('screen-home').hidden = false;
  viewer.setRunning(false);
}

function selectFeature(i) {
  const features = state.content.products[state.productIndex].features || [];
  if (!features.length) return;
  state.featureIndex = (i + features.length) % features.length;
  viewer.focus(state.featureIndex);
  renderFeature();
}

function closeFeature() {
  state.featureIndex = -1;
  viewer.reset();
  renderFeature();
}

function renderFeature() {
  const product = state.content.products[state.productIndex];
  const feature = product && (product.features || [])[state.featureIndex];
  const card = $('feature-card');
  document.body.classList.toggle('has-feature', !!feature);
  card.hidden = !feature;
  if (!feature) return;
  card.classList.remove('is-expanded');
  $('card-icon').innerHTML = icon(feature.icon);
  $('card-title').textContent = feature.title;
  $('card-desc').innerHTML = rich(feature.description);
  $('card-desc').scrollTop = 0;
  [...$('card-dots').children].forEach((d, i) => d.classList.toggle('is-on', i === state.featureIndex));
  const many = product.features.length > 1;
  $('card-prev').hidden = $('card-next').hidden = !many;
  // Only offer "expand" when the text is actually cut off.
  requestAnimationFrame(() => {
    const desc = $('card-desc');
    $('card-toggle').hidden = desc.scrollHeight <= desc.clientHeight + 2;
  });
}

function wireControls() {
  $('btn-back').addEventListener('click', () => (state.featureIndex >= 0 ? closeFeature() : goHome()));
  $('btn-next').addEventListener('click', () => openProduct(state.productIndex + 1));
  $('btn-reset').addEventListener('click', () => viewer.reset());
  $('card-prev').addEventListener('click', () => selectFeature(state.featureIndex - 1));
  $('card-next').addEventListener('click', () => selectFeature(state.featureIndex + 1));
  $('card-toggle').addEventListener('click', () => $('feature-card').classList.toggle('is-expanded'));
  document.addEventListener('contextmenu', (e) => { if (!EDIT) e.preventDefault(); });
  document.addEventListener('keydown', (e) => {
    if (state.productIndex < 0) return;
    if (e.key === 'Escape') state.featureIndex >= 0 ? closeFeature() : goHome();
    if (e.key === 'ArrowRight') selectFeature(state.featureIndex + 1);
    if (e.key === 'ArrowLeft') selectFeature(state.featureIndex < 0 ? -1 : state.featureIndex - 1);
  });
}

// Unattended displays: return to the home screen after a period of no touch.
function startIdleTimer(seconds) {
  if (!seconds || EDIT) return;
  let timer;
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => { if (state.productIndex >= 0) goHome(); }, seconds * 1000);
  };
  ['pointerdown', 'pointermove', 'keydown', 'wheel'].forEach((t) => window.addEventListener(t, arm, { passive: true }));
  arm();
}

// ---------- animated backdrop: slow drifting light streaks ----------

function startBackdrop() {
  const canvas = $('backdrop-canvas');
  const ctx = canvas.getContext('2d');
  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, streaks;
  const seed = () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
    streaks = Array.from({ length: Math.round((w * h) / 26000) }, () => ({
      x: Math.random() * w, y: Math.random() * h * 0.9,
      len: 20 + Math.random() * 90, speed: 6 + Math.random() * 22,
      alpha: 0.08 + Math.random() * 0.3, warm: Math.random() < 0.12,
    }));
  };
  seed();
  window.addEventListener('resize', seed);
  let last = performance.now();
  const draw = (now) => {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    ctx.clearRect(0, 0, w, h);
    for (const s of streaks) {
      s.x += s.speed * dt;
      if (s.x - s.len > w) s.x = -s.len;
      const g = ctx.createLinearGradient(s.x - s.len, 0, s.x, 0);
      const rgb = s.warm ? '255,170,90' : '90,190,255';
      g.addColorStop(0, `rgba(${rgb},0)`);
      g.addColorStop(1, `rgba(${rgb},${s.alpha})`);
      ctx.fillStyle = g;
      ctx.fillRect(s.x - s.len, s.y, s.len, 1.5);
    }
    if (!still) requestAnimationFrame(draw);
  };
  requestAnimationFrame(draw);
}
