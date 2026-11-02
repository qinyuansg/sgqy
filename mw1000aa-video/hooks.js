/* Per-scene procedural animation. Each hook gets (lt = seconds since chapter start, ch, B(i) = beat i start, el). */
(function () {
  const { clamp, easeOut, easeInOut } = window.EZ;
  const NS = "http://www.w3.org/2000/svg";
  const $ = id => document.getElementById(id);
  const mk = (tag, attrs, parent) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; };
  const ramp = (lt, t0, d) => clamp((lt - t0) / d, 0, 1);
  const pulseCache = new Map();
  function pulses(el, lt) {
    if (!pulseCache.has(el)) pulseCache.set(el, el.querySelectorAll(".pulseA"));
    const o = (0.45 + 0.55 * Math.abs(Math.sin(lt * 3))).toFixed(3);
    pulseCache.get(el).forEach(n => n.style.opacity = o);
  }

  /* ---------- human silhouette point cloud ---------- */
  function inside(u, v) { // u: -1..1 (x), v: 0..1 (top->bottom). returns [inside, shade]
    const sh = (d, w) => [true, 1 - Math.pow(Math.min(Math.abs(d) / w, 1), 2)];
    { const du = u / 0.12, dv = (v - 0.075) / 0.07; if (du * du + dv * dv <= 1) return [true, 1 - du * du]; }
    if (v > 0.14 && v < 0.18 && Math.abs(u) < 0.06) return sh(u, 0.06);
    if (v >= 0.17 && v <= 0.53) { const w = 0.27 - 0.07 * (v - 0.17) / 0.36; if (Math.abs(u) <= w) return sh(u, w); }
    if (v >= 0.19 && v <= 0.56) { const c = 0.32 + 0.14 * (v - 0.19); const w = 0.05; if (Math.abs(Math.abs(u) - c) <= w) return sh(Math.abs(u) - c, w); }
    if (v >= 0.5 && v <= 0.98) { const c = 0.11 + 0.03 * (v - 0.5); const w = 0.085 - 0.03 * (v - 0.5); if (Math.abs(Math.abs(u) - c) <= w) return sh(Math.abs(u) - c, w); }
    return [false, 0];
  }
  function drawCloud(cv, p, lt, opts = {}) {
    const ctx = cv.getContext("2d"), W = cv.width, H = cv.height;
    ctx.clearRect(0, 0, W, H);
    const step = opts.step || 6, cx = W / 2, sx = W * 0.62, top = 10, sy = H - 20;
    const rows = Math.floor(sy / step);
    const maxRow = Math.floor(rows * p);
    for (let r = 0; r <= maxRow; r++) {
      const y = top + r * step, v = r / rows;
      for (let x = 0; x < W; x += step) {
        const u = (x - cx) / (sx / 2) * 0.62;
        const [ins, s] = inside(u, v);
        if (!ins) continue;
        // concealed object: viewer's right hip (person's left)
        const anom = u > 0.05 && u < 0.2 && v > 0.47 && v < 0.55;
        if (anom && opts.anom !== false) {
          const a = 0.6 + 0.4 * Math.abs(Math.sin(lt * 4));
          ctx.fillStyle = `rgba(255,177,46,${a})`;
        } else {
          const b = 0.25 + 0.75 * s;
          ctx.fillStyle = `rgba(${Math.round(70 + 120 * b)},${Math.round(150 + 80 * b)},255,${0.35 + 0.65 * b})`;
        }
        ctx.beginPath(); ctx.arc(x, y, step * 0.36, 0, 6.283); ctx.fill();
      }
    }
    if (p < 1) { // scan line
      const y = top + maxRow * step;
      const g = ctx.createLinearGradient(0, y - 18, 0, y + 4);
      g.addColorStop(0, "rgba(71,211,255,0)"); g.addColorStop(1, "rgba(71,211,255,.9)");
      ctx.fillStyle = g; ctx.fillRect(0, y - 18, W, 22);
    }
  }

  const H = window.HOOKS = {};

  /* ---------- intro ---------- */
  let introInit = false;
  H.intro = (lt, ch, B, el) => {
    const svg = $("introWaves");
    if (!introInit) { introInit = true; for (let i = 0; i < 7; i++) mk("circle", { cx: 1470, cy: 520, r: 50, fill: "none", stroke: "#47d3ff", "stroke-width": 2 }, svg); }
    [...svg.children].forEach((c, i) => {
      const r = 80 + ((lt * 70 + i * 110) % 770);
      c.setAttribute("r", r.toFixed(1));
      c.setAttribute("opacity", (0.32 * (1 - (r - 80) / 770) * ramp(lt, 0.6, 1)).toFixed(3));
    });
    const s = $("introScan");
    s.style.top = (190 + (0.5 - 0.5 * Math.cos(lt * 1.3)) * 680).toFixed(1) + "px";
    s.style.opacity = (ramp(lt, 1.4, 0.8) * 0.9).toFixed(3);
  };

  H.why = (lt, ch, B, el) => pulses(el, lt);

  /* ---------- how ---------- */
  let howInit = false, xsW = [], rays = [], nnNodes = [];
  function initHow() {
    howInit = true;
    const g = $("xsWaves");
    for (let i = 0; i < 4; i++) xsW.push({ k: "out", e: mk("path", { fill: "none", stroke: "#ffffff", "stroke-width": 4, "stroke-linecap": "round" }, g), i });
    for (let i = 0; i < 4; i++) xsW.push({ k: "skin", e: mk("path", { fill: "none", stroke: "#47d3ff", "stroke-width": 4, "stroke-linecap": "round" }, g), i });
    for (let i = 0; i < 3; i++) xsW.push({ k: "obj", e: mk("path", { fill: "none", stroke: "#ffb12e", "stroke-width": 5, "stroke-linecap": "round" }, g), i });
    const rg = $("rays");
    for (let i = 0; i < 10; i++) rays.push(mk("line", {}, rg));
    // chirp plot sawtooth
    let d = ""; for (let k = 0; k < 4; k++) { const x0 = 40 + k * 80; d += `M${x0} 200 L${x0 + 76} 44 `; }
    $("chirpPlot").setAttribute("d", d);
    // echoes
    const es = $("echoes");
    for (let i = 0; i < 13; i++) mk("path", { fill: "none", stroke: i % 3 ? "#47d3ff" : "#a08bff", "stroke-width": 1.6, opacity: 0.75 }, es);
    // neural net
    const nn = $("nn"), layers = [5, 7, 7, 5, 3], xs = [380, 560, 740, 920, 1100];
    const pos = layers.map((n, li) => Array.from({ length: n }, (_, j) => [xs[li], 300 + (j - (n - 1) / 2) * 62]));
    const lg = mk("g", { stroke: "rgba(71,211,255,.18)", "stroke-width": 1.4 }, nn);
    pos[0].forEach(p => mk("line", { x1: 262, y1: 300, x2: p[0], y2: p[1] }, lg));
    for (let li = 0; li < pos.length - 1; li++) pos[li].forEach(a => pos[li + 1].forEach(b => mk("line", { x1: a[0], y1: a[1], x2: b[0], y2: b[1] }, lg)));
    pos[pos.length - 1].forEach(p => mk("line", { x1: p[0], y1: p[1], x2: 1258, y2: 300 }, lg));
    pos.forEach((L, li) => L.forEach(p => nnNodes.push({ li, e: mk("circle", { cx: p[0], cy: p[1], r: 17, fill: "#47d3ff", stroke: "#bfefff", "stroke-width": 2 }, nn) })));
    drawCloud($("cloudMini"), 1, 0, { step: 4, anom: true });
  }
  const arc = (x, y0, y1, bulge) => `M${x.toFixed(1)} ${y0} Q${(x + bulge).toFixed(1)} ${(y0 + y1) / 2} ${x.toFixed(1)} ${y1}`;
  H.how = (lt, ch, B, el) => {
    if (!howInit) initHow();
    pulses(el, lt);
    // P0 chirp wave
    if (lt < B(2) + 0.6) {
      let d = "";
      for (let x = 0; x <= 1600; x += 4) {
        const ph = 0.006 * x + 0.0000135 * x * x - lt * 4;
        const amp = 60 * clamp((lt - 0.6) / 1.2, 0, 1);
        d += (x ? "L" : "M") + x + " " + (100 + amp * Math.sin(ph)).toFixed(1);
      }
      $("chirp").setAttribute("d", d);
      const g = 0.5 + 0.5 * Math.sin(lt * 3);
      $("mmwSeg").style.boxShadow = `0 0 ${20 + 30 * g}px rgba(71,211,255,${0.4 + 0.4 * g})`;
    }
    // P2 cross-section waves
    if (lt > B(2) - 0.5 && lt < B(3) + 0.6) {
      xsW.forEach(w => {
        const ph = (lt * 0.42 + w.i / (w.k === "obj" ? 3 : 4)) % 1;
        let d, op = Math.sin(ph * Math.PI);
        if (w.k === "out") d = arc(110 + ph * 990, 120, 500, 46);
        else if (w.k === "skin") d = arc(1090 - ph * 990, 90, 540, -46);
        else d = arc(990 - ph * 890, 250, 360, -26);
        w.e.setAttribute("d", d); w.e.setAttribute("opacity", (op * 0.9).toFixed(3));
      });
    }
    // P3 sweep
    if (lt > B(3) - 0.5 && lt < B(4) + 0.6) {
      const y = 100 + (0.5 - 0.5 * Math.cos(lt * Math.PI)) * 460;
      $("dotL").setAttribute("cy", y.toFixed(1)); $("dotR").setAttribute("cy", y.toFixed(1));
      const targets = [[-150, 0], [-110, -42], [-60, -58], [-110, 42], [-60, 58]];
      rays.forEach((r, i) => {
        const left = i < 5, t = targets[i % 5];
        const x1 = left ? 476 : 1064, tx = 770 + (left ? t[0] : -t[0]), ty = 330 + t[1];
        r.setAttribute("x1", x1); r.setAttribute("y1", y.toFixed(1)); r.setAttribute("x2", tx); r.setAttribute("y2", ty);
        r.setAttribute("opacity", (0.25 + 0.6 * Math.abs(Math.sin(lt * 9 + i))).toFixed(2));
      });
      const p = ((Math.max(0, lt - B(3))) % 2.6) / 2.6, pp = clamp(p * 1.3, 0, 1);
      $("sweepRing").setAttribute("stroke-dashoffset", (578 * (1 - pp)).toFixed(1));
      $("sweepTxt").textContent = (pp * 2).toFixed(1) + " s";
    }
    // P4 echoes + cloud
    if (lt > B(4) - 0.5 && lt < B(5) + 0.6) {
      [...$("echoes").children].forEach((pth, i) => {
        let d = "";
        for (let x = 0; x <= 430; x += 5) {
          const env = Math.exp(-Math.pow((x - 140 - (i * 37) % 200) / 40, 2));
          const yv = 24 + i * 32 + (Math.sin(x * 0.35 + i * 1.7 + lt * 6) * 9 + Math.sin(x * 0.11 + i) * 3) * (0.25 + env);
          d += (x ? "L" : "M") + x + " " + yv.toFixed(1);
        }
        pth.setAttribute("d", d);
      });
      const p = ramp(lt, B(4) + 2.0, 5.5);
      drawCloud($("cloud"), easeInOut(p), lt);
    }
    // P5 NN activations
    if (lt > B(5) - 0.5 && lt < B(6) + 0.6) {
      nnNodes.forEach(n => {
        const a = 0.5 + 0.5 * Math.sin(lt * 4 - n.li * 1.1);
        n.e.setAttribute("fill-opacity", (0.15 + 0.85 * a * a).toFixed(3));
      });
    }
  };

  H.who = () => {};

  /* ---------- flow ---------- */
  function limb(id, ang, px, py) { $(id).setAttribute("transform", `rotate(${ang.toFixed(2)} ${px} ${py})`); }
  function walkPose(prefix, phase, moving, armOut) {
    const sw = moving ? Math.sin(phase) * 16 : 0;
    limb(prefix + "LegL", sw, -12, -100); limb(prefix + "LegR", -sw, 12, -100);
    limb(prefix + "ArmL", armOut - sw * 0.6, -40, -188); limb(prefix + "ArmR", -armOut + sw * 0.6, 40, -188);
  }
  H.flow = (lt, ch, B, el) => {
    pulses(el, lt);
    let beat = 0; for (let i = 0; i < ch.beats.length; i++) if (lt >= B(i) - 0.05) beat = i;
    // steps tracker
    const active = [0, 1, 2, 3, 4, 5, 5, 6][beat];
    for (let i = 1; i <= 6; i++) $("st" + i).className = "step" + (i === active ? " on" : i < active ? " done" : "");
    // passenger position
    let x = 300, moving = false, op = 1, armOut = 0;
    const walk = (t0, d, a, b) => { const p = ramp(lt, t0, d); if (p > 0 && p < 1) moving = true; return a + (b - a) * easeInOut(p); };
    if (beat <= 1) x = 300;
    if (beat === 2) x = walk(B(2) + 0.3, 2.2, 300, 485);
    if (beat === 3 || beat === 4) x = 485;
    if (beat === 3) armOut = 20 * easeOut(ramp(lt, B(3) + 0.3, 0.6));
    if (beat === 4) armOut = 20 * (1 - easeOut(ramp(lt, B(4) + 0.4, 0.6)));
    if (beat === 5) x = walk(B(5) + 3.0, 3.0, 485, 865);
    if (beat === 6) { x = 600; op = ramp(lt, B(6), 0.35); }
    if (beat === 7) x = walk(B(7) + 6.0, 3.2, 600, 865);
    if (beat === 5 && lt > B(6) - 0.35) op = 1 - ramp(lt, B(6) - 0.35, 0.3);
    $("pax").setAttribute("transform", `translate(${x.toFixed(1)},540)`);
    $("pax").setAttribute("opacity", op.toFixed(3));
    walkPose("pax", lt * 9, moving, armOut);
    // officer
    let ox = 680, omove = false;
    if (beat === 6) { const p = ramp(lt, B(6) + 3.5, 1.2); ox = 680 - 30 * easeInOut(p); omove = p > 0 && p < 1; }
    if (beat === 7) { const p = ramp(lt, B(7) + 3.0, 1.2); ox = 650 + 30 * easeInOut(p); omove = p > 0 && p < 1; }
    $("off").setAttribute("transform", `translate(${ox.toFixed(1)},540)`);
    walkPose("off", lt * 9, omove, beat === 6 && lt > B(6) + 4.7 ? 35 : 0);
    // items into tray (beat 1)
    const items = [["it1", 0], ["it2", 0.5], ["it3", 1.0]];
    items.forEach(([id, dl], k) => {
      const p = ramp(lt, B(1) + 2.6 + dl, 0.9);
      const sx = 300 + 10 - k * 8, sy = 400, tx = 92 + k * 20, ty = 440;
      const ix = sx + (tx - sx) * easeInOut(p), iy = sy + (ty - sy) * easeInOut(p) - Math.sin(p * Math.PI) * 60;
      const e = $(id);
      if (e.tagName === "circle") { e.setAttribute("cx", ix); e.setAttribute("cy", iy); }
      else { e.setAttribute("x", ix - 8); e.setAttribute("y", iy - 8); }
      const vis = beat === 1 ? ramp(lt, B(1) + 2.4 + dl, 0.2) : (beat >= 2 && beat < 7 ? 1 : 0);
      e.setAttribute("opacity", (beat >= 2 && beat < 7 ? 0 : vis).toFixed(2)); // items vanish into X-ray
    });
    $("tray").setAttribute("x", beat >= 2 ? 78 + Math.min(1, ramp(lt, B(2), 4)) * 120 : 78);
    $("tray2").setAttribute("opacity", beat === 7 ? ramp(lt, B(7) + 5, 0.6).toFixed(2) : 0);
    // scan bar + LED
    let led = "#7f8ea8", sb = 0, sby = 530;
    if (beat === 3) {
      const p = ramp(lt, B(3) + 0.9, 2.0);
      sb = p > 0 && p < 1 ? 1 : 0; sby = 530 - Math.sin(p * Math.PI) * 318; led = "#47d3ff";
    }
    if (beat === 4) led = `rgba(160,139,255,${(0.5 + 0.5 * Math.abs(Math.sin(lt * 5))).toFixed(2)})`;
    if (beat === 5) led = "#36d98d";
    if (beat === 6) led = "#ffb12e";
    $("ledBar").setAttribute("fill", led);
    $("scanBar").setAttribute("opacity", sb); $("scanBar").setAttribute("y", sby.toFixed(1));
    // alarm visuals
    $("altLbl").setAttribute("opacity", beat === 6 ? ramp(lt, B(6), 0.4) : 0);
    const ring = $("ankleRing");
    ring.setAttribute("opacity", beat === 6 ? (0.4 + 0.6 * Math.abs(Math.sin(lt * 4))) * ramp(lt, B(6) + 1.0, 0.4) : 0);
    const hand = $("hand");
    hand.setAttribute("opacity", beat === 6 ? ramp(lt, B(6) + 4.8, 0.3) : 0);
    hand.setAttribute("transform", `translate(${612 + Math.sin(lt * 6) * 6},${520})`);
    // timer
    let tm = "", tval = 0;
    if (beat < 3) tm = "scan: 0.0 s";
    if (beat === 3) { tval = 2 * ramp(lt, B(3) + 0.9, 2.0); tm = `scan: ${tval.toFixed(1)} s`; }
    if (beat === 4) { tval = 2 + 2 * ramp(lt, B(4) + 0.3, 2.0); tm = `total: ${tval.toFixed(1)} s`; }
    if (beat >= 5) tm = "total ≈ 4 s ✓";
    $("flowTimer").textContent = tm;
    $("timerG").setAttribute("opacity", ramp(lt, B(2) + 2.0, 0.4).toFixed(2));
    // operator screen
    const st = ["ready", "ready", "ready", "scan", "proc", "clear", "alarm", "done"][beat];
    ["ready", "scan", "proc", "clear", "alarm", "done"].forEach(s => {
      const e = $("ss-" + s);
      if (s === st) { e.style.display = "block"; e.style.opacity = ramp(lt, B(beat), 0.3).toFixed(2); }
      else e.style.display = "none";
    });
    $("readyTxt").textContent = beat === 2 && lt > B(2) + 2.5 ? "Passenger in position" : "Waiting for passenger";
    if (beat === 3) {
      const p = ramp(lt, B(3) + 0.9, 2.0);
      $("scanProg").style.width = (p * 100).toFixed(1) + "%";
      $("scanPct").textContent = `${(p * 2).toFixed(1)} / 2.0 s`;
    }
  };

  /* ---------- where ---------- */
  H.where = (lt, ch, B, el) => {
    const img = $("airportImg");
    const base = parseFloat(img.style.opacity || "1");
    const f = 1 - 0.86 * ramp(lt, B(1) - 0.2, 0.6) - 0.14 * ramp(lt, B(3) - 0.3, 0.5);
    img.style.opacity = (base * f).toFixed(3);
  };
})();
