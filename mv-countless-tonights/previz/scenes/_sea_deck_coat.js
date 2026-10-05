// sea_deck helper (review): the S067 coat as a deterministic Verlet cloth, simulated ONCE at scene build.
// Pure math (no THREE, no DOM) so it can be tuned from node: `node scenes/_sea_deck_coat.js` runs a self-test.
//
// simulateCoat(opt) → { frames: Float32Array[] (positions, xyz per particle), normals: Float32Array[], fps, nu, nv, active }
//   opt.nu, opt.nv            grid cells (particles = (nu+1)(nv+1)), cu ∈ [-1,1] across, cv ∈ [0,1] collar → hem
//   opt.W, opt.H              coat size (m) laid flat; sleeves only where |cu| > 0.44 and cv < 0.36
//   opt.pins(te) → [[x,y,z],[x,y,z]] | null   world (ship-local) positions of the two collar pins (cu = ±pinCu), null = free
//   opt.pinCu                 |cu| of the pinned collar points (default 1/3)
//   opt.drive(te) → { L:[x,y,z], R:[x,y,z] } | null  optional: collar points DRIVEN along an art-directed arc during the
//                             flight (the heavy collar leads, the rest is free cloth); null = free
//   opt.init(cu, cv) → [x,y,z]   initial (hanging) position of a particle at te = opt.t0
//   opt.capsules [{a:[x,y,z], b:[x,y,z], r}]  static colliders (the boy, the navigator's legs/torso, the coil)
//   opt.boxes [{c:[x,y,z], h:[hx,hy,hz], yaw}] static boxes (the hatch cover)
//   opt.floorY                deck plane
//   opt.wind [x,y,z]          air velocity (m/s)
//   opt.t0, opt.t1, opt.fps, opt.dt, opt.iters
// Every quantity is a pure function of opt: frames are reproducible (no randomness).

export function simulateCoat(opt) {
  const nu = opt.nu ?? 30, nv = opt.nv ?? 26, W = opt.W ?? 1.42, H = opt.H ?? 1.02;
  const n = (nu + 1) * (nv + 1), id = (i, j) => j * (nu + 1) + i;
  const cuOf = (i) => i / nu * 2 - 1, cvOf = (j) => j / nv;
  const isActive = (i, j) => { const cu = cuOf(i), cv = cvOf(j); return Math.abs(cu) <= 0.44 + 1e-6 || (cv <= 0.36 + 1e-6 && Math.abs(cu) <= 0.98); };
  const active = new Uint8Array(n);
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) active[id(i, j)] = isActive(i, j) ? 1 : 0;
  // nearest active particle for the inactive ones (they follow it: they are discarded in the shader anyway)
  const follow = new Int32Array(n).fill(-1);
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    if (active[id(i, j)]) continue;
    let best = -1, bd = 1e9;
    for (let jj = 0; jj <= nv; jj++) for (let ii = 0; ii <= nu; ii++) { if (!active[id(ii, jj)]) continue; const d = (ii - i) ** 2 + (jj - j) ** 2; if (d < bd) { bd = d; best = id(ii, jj); } }
    follow[id(i, j)] = best;
  }
  const P = new Float64Array(n * 3), Q = new Float64Array(n * 3), N = new Float64Array(n * 3);
  const dx = W / nu, dy = H / nv;
  const t0 = opt.t0 ?? -0.8, t1 = opt.t1 ?? 1.8, fps = opt.fps ?? 48, dt = opt.dt ?? 1 / 480, iters = opt.iters ?? 10;
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { const k = id(i, j), p = opt.init(cuOf(i), cvOf(j)); P[k * 3] = Q[k * 3] = p[0]; P[k * 3 + 1] = Q[k * 3 + 1] = p[1]; P[k * 3 + 2] = Q[k * 3 + 2] = p[2]; }
  // constraints: [a, b, rest, stiffness]
  const C = [];
  const add = (i, j, i2, j2, s) => { if (i2 < 0 || j2 < 0 || i2 > nu || j2 > nv) return; const a = id(i, j), b = id(i2, j2); if (!active[a] || !active[b]) return; C.push(a, b, Math.hypot((i2 - i) * dx, (j2 - j) * dy), s); };
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    add(i, j, i + 1, j, 1); add(i, j, i, j + 1, 1);                    // structural
    add(i, j, i + 1, j + 1, 0.7); add(i + 1, j, i, j + 1, 0.7);         // shear
    add(i, j, i + 2, j, opt.bend ?? 0.35); add(i, j, i, j + 2, opt.bend ?? 0.35); // bend (padded cotton: stiffish)
  }
  const nC = C.length / 4;
  const pinCu = opt.pinCu ?? 1 / 3;
  const pinI = [Math.round((-pinCu + 1) / 2 * nu), Math.round((pinCu + 1) / 2 * nu)].map((i) => id(i, 0)); // [R-side (−cu), L-side (+cu)]
  const caps = (opt.capsules || []).map((c) => ({ a: c.a, b: c.b, r: c.r, ab: [c.b[0] - c.a[0], c.b[1] - c.a[1], c.b[2] - c.a[2]] }));
  for (const c of caps) c.l2 = Math.max(1e-9, c.ab[0] ** 2 + c.ab[1] ** 2 + c.ab[2] ** 2);
  const boxes = (opt.boxes || []).map((b) => ({ ...b, cs: Math.cos(b.yaw || 0), sn: Math.sin(b.yaw || 0) }));
  const floorY = opt.floorY ?? -1e9, margin = opt.margin ?? 0.018;
  const wind = opt.wind || [0, 0, 0];
  const g = -9.81;
  const kn = opt.dragN ?? 5.0, kt = opt.dragT ?? 0.35;
  const touched = new Uint8Array(n);
  const normals = () => {
    for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
      const k = id(i, j), il = id(Math.max(0, i - 1), j), ir = id(Math.min(nu, i + 1), j), jd = id(i, Math.max(0, j - 1)), ju = id(i, Math.min(nv, j + 1));
      const ax = P[ir * 3] - P[il * 3], ay = P[ir * 3 + 1] - P[il * 3 + 1], az = P[ir * 3 + 2] - P[il * 3 + 2];
      const bx = P[ju * 3] - P[jd * 3], by = P[ju * 3 + 1] - P[jd * 3 + 1], bz = P[ju * 3 + 2] - P[jd * 3 + 2];
      let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx; const l = Math.hypot(nx, ny, nz) || 1;
      N[k * 3] = nx / l; N[k * 3 + 1] = ny / l; N[k * 3 + 2] = nz / l;
    }
  };
  const collide = (k) => {
    let x = P[k * 3], y = P[k * 3 + 1], z = P[k * 3 + 2], hit = 0;
    for (const c of caps) {
      const px = x - c.a[0], py = y - c.a[1], pz = z - c.a[2];
      let t = (px * c.ab[0] + py * c.ab[1] + pz * c.ab[2]) / c.l2; t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qx = px - c.ab[0] * t, qy = py - c.ab[1] * t, qz = pz - c.ab[2] * t, d = Math.hypot(qx, qy, qz), R = c.r + margin;
      if (d < R) { const s = d > 1e-6 ? (R - d) / d : 0; x += qx * s; y += qy * s + (d <= 1e-6 ? R : 0); z += qz * s; hit = 1; }
    }
    for (const b of boxes) {
      const lx0 = x - b.c[0], lz0 = z - b.c[2];
      const lx = lx0 * b.cs - lz0 * b.sn, lz = lx0 * b.sn + lz0 * b.cs, ly = y - b.c[1];
      const ex = b.h[0] + margin, ey = b.h[1] + margin, ez = b.h[2] + margin;
      if (Math.abs(lx) < ex && Math.abs(ly) < ey && Math.abs(lz) < ez) {
        const ox = ex - Math.abs(lx), oy = ey - Math.abs(ly), oz = ez - Math.abs(lz);
        let nlx = lx, nly = ly, nlz = lz;
        if (oy <= ox && oy <= oz) nly = Math.sign(ly || 1) * ey; else if (ox <= oz) nlx = Math.sign(lx || 1) * ex; else nlz = Math.sign(lz || 1) * ez;
        x = b.c[0] + nlx * b.cs + nlz * b.sn; z = b.c[2] - nlx * b.sn + nlz * b.cs; y = b.c[1] + nly; hit = 1;
      }
    }
    if (y < floorY + margin) { y = floorY + margin; hit = 1; }
    P[k * 3] = x; P[k * 3 + 1] = y; P[k * 3 + 2] = z;
    return hit;
  };
  const frames = [], fnormals = [];
  const steps = Math.round((t1 - t0) / dt), every = Math.round(1 / fps / dt);
  const firstRec = Math.round((0 - t0) / dt);
  for (let s = 0; s <= steps; s++) {
    const te = t0 + s * dt;
    const pins = opt.pins ? opt.pins(te) : null;
    const drive = opt.drive ? opt.drive(te) : null;
    normals();
    const settleDamp = te < 0 ? 0.97 : (opt.damp ?? 0.996);
    // integrate
    for (let k = 0; k < n; k++) {
      if (!active[k]) continue;
      const x = P[k * 3], y = P[k * 3 + 1], z = P[k * 3 + 2];
      let vx = (x - Q[k * 3]) / dt, vy = (y - Q[k * 3 + 1]) / dt, vz = (z - Q[k * 3 + 2]) / dt;
      const rx = vx - wind[0], ry = vy - wind[1], rz = vz - wind[2];
      const vn = rx * N[k * 3] + ry * N[k * 3 + 1] + rz * N[k * 3 + 2];
      const axx = -kn * vn * N[k * 3] - kt * rx, ayy = g - kn * vn * N[k * 3 + 1] - kt * ry, azz = -kn * vn * N[k * 3 + 2] - kt * rz;
      const fr = touched[k] ? (opt.friction ?? 0.3) : 1.0;                              // contact friction: kill most of the sliding velocity
      Q[k * 3] = x; Q[k * 3 + 1] = y; Q[k * 3 + 2] = z;
      P[k * 3] = x + vx * dt * settleDamp * fr + axx * dt * dt;
      P[k * 3 + 1] = y + vy * dt * settleDamp * fr + ayy * dt * dt;
      P[k * 3 + 2] = z + vz * dt * settleDamp * fr + azz * dt * dt;
    }
    const fix = (k, p) => { P[k * 3] = p[0]; P[k * 3 + 1] = p[1]; P[k * 3 + 2] = p[2]; };
    for (let it = 0; it < iters; it++) {
      for (let c = 0; c < nC; c++) {
        const a = C[c * 4], b = C[c * 4 + 1], rest = C[c * 4 + 2], st = C[c * 4 + 3];
        const ex = P[b * 3] - P[a * 3], ey = P[b * 3 + 1] - P[a * 3 + 1], ez = P[b * 3 + 2] - P[a * 3 + 2];
        const d = Math.hypot(ex, ey, ez); if (d < 1e-9) continue;
        // bend constraints only resist compression softly (cloth folds), structural/shear both ways
        let diff = (d - rest) / d * 0.5 * st;
        if (st < 0.5 && d < rest) diff *= 0.25;
        P[a * 3] += ex * diff; P[a * 3 + 1] += ey * diff; P[a * 3 + 2] += ez * diff;
        P[b * 3] -= ex * diff; P[b * 3 + 1] -= ey * diff; P[b * 3 + 2] -= ez * diff;
      }
      if (pins) { fix(pinI[0], pins[0]); fix(pinI[1], pins[1]); }
      if (drive) { fix(pinI[0], drive.R); fix(pinI[1], drive.L); }
      for (let k = 0; k < n; k++) if (active[k]) touched[k] = collide(k) | (it ? touched[k] : 0);
    }
    if (s >= firstRec && (s - firstRec) % every === 0) {
      normals();
      const f = new Float32Array(n * 3), fn = new Float32Array(n * 3);
      for (let k = 0; k < n; k++) { const src = active[k] ? k : follow[k]; f[k * 3] = P[src * 3]; f[k * 3 + 1] = P[src * 3 + 1]; f[k * 3 + 2] = P[src * 3 + 2]; fn[k * 3] = N[src * 3]; fn[k * 3 + 1] = N[src * 3 + 1]; fn[k * 3 + 2] = N[src * 3 + 2]; }
      frames.push(f); fnormals.push(fn);
    }
  }
  return { frames, normals: fnormals, fps, nu, nv, active, pinI };
}

// self-test from node: a sheet dropped from two pins onto a capsule + box, prints the settle state
if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('_sea_deck_coat.js')) {
  const t = Date.now();
  const r = simulateCoat({
    init: (cu, cv) => [cu * 0.3, 1.3 - cv * 1.0, 0.3],
    pins: (te) => te < 0.25 ? [[-0.15, 1.3, 0.3], [0.15, 1.3, 0.3]] : null,
    capsules: [{ a: [-0.5, 0.55, 1.4], b: [0.5, 0.55, 1.4], r: 0.15 }],
    boxes: [{ c: [0, 0.2, 1.4], h: [1.0, 0.2, 0.45], yaw: 0 }], floorY: 0, wind: [0, 0, 1.2],
  });
  const last = r.frames[r.frames.length - 1]; let ymin = 9, ymax = -9; for (let i = 1; i < last.length; i += 3) { ymin = Math.min(ymin, last[i]); ymax = Math.max(ymax, last[i]); }
  console.log('frames', r.frames.length, 'ms', Date.now() - t, 'y range', ymin.toFixed(3), ymax.toFixed(3));
}
