// T5 ISMS Sitewide — one-page product architecture, three visual versions.
//   V1  Layered stack   · SpaceX-style (black, hairlines, tracked caps, orbital horizon)
//   V2  Modular bento   · Apple-style (rounded tiles, app-icon glyphs, intelligence gradient)
//   V3  Flow / hub      · Neon command-centre (connect → secure → unify → orchestrate → automate)
//   V4  Layered stack   · V1 layout in the V3 neon look
//   V5  Modular bento   · pearl-white liquid glass
//   V6  Flow / hub      · dark liquid glass, Palantir-style
const pptxgen = require("pptxgenjs");
const React = require("react");
const RDS = require("react-dom/server");
const sharp = require("sharp");
const pi = require("react-icons/pi");
const JSZip = require("jszip");
const fs = require("fs");
const path = require("path");
const { applyTheme } = require(process.env.PPTX_SKILL + "/scripts/apply_theme.js");

const OUT = process.argv[2] || path.join(__dirname, "out");
const ASSETS = path.join(__dirname, "assets");
fs.mkdirSync(OUT, { recursive: true });

// ───────────────────────────── shared content (identical in every version) ─────────────────────────────
const C = {
  sub: "Open-standards based and integrated — future-ready for advanced sensors, AI/ML and autonomous technologies.",
  platform: {
    name: "T5-ISMS Sitewide",
    caption: "Integrated Security Management System",
    modules: {
      twin: { label: "Digital Twin", icon: "CubeTransparent" },
      incident: { label: "Incident & Alarm Management", icon: "Siren" },
      health: { label: "Sitewide Health Status", icon: "Heartbeat" },
      cop: { label: "Common Operating Picture", icon: "SquaresFour" },
      workflow: { label: "Digital Workflow Engine", icon: "FlowArrow" },
    },
  },
  video: { name: "Video Analytics", sub: "Video dispatcher & aggregators", icon: "SecurityCamera" },
  ai: { name: "A.I.", sub: "ML · LLM · AI", icon: "Brain" },
  network: { name: "Network & Cyber Security Layer", icon: "ShieldCheck" },
  sites: [
    { code: "T5A ISMS", desc: "Terminal 5A", icon: "Buildings" },
    { code: "T5B ISMS", desc: "Terminal 5B", icon: "Buildings" },
    { code: "T5C ISMS", desc: "Terminal 5C", icon: "Buildings" },
    { code: "LIW", desc: "Land Infrastructure Works", icon: "HardHat" },
    { code: "APM Depot", desc: "Automated People Mover", icon: "Train" },
    { code: "ERS", desc: "Early Remote Stands", icon: "Airplane" },
    { code: "AO Sites", desc: "Any Other Sites", icon: "Plus", future: true },
  ],
  orch: {
    name: "Orchestration Layer",
    icon: "Graph",
    ifaces: [
      { t: "API", icon: "Code" },
      { t: "SDK", icon: "Package" },
      { t: "DIO", icon: "Plugs" },
      { t: "Industry Standards", icon: "SealCheck" },
    ],
  },
  robotics: {
    name: "Robotics & Automation",
    icon: "Robot",
    items: [
      { t: "Automated Wheelchair", icon: "WheelchairMotion" },
      { t: "Patrol Robots", icon: "ShieldCheckered" },
    ],
  },
  pdm: { name: "Predictive Maintenance", icon: "Wrench" },
  vision: { name: "Vision Watch", icon: "Eye" },
  pillars: ["Open standards", "Integrated", "Cyber-secure", "Future-ready"],
};
const M = C.platform.modules;
const MOD_ORDER = ["twin", "incident", "health", "cop", "workflow"];

const NOTES = [
  "Talk track (about 90 seconds)",
  "",
  "1. Start at the foundation: every T5 site (T5A, T5B and T5C ISMS, Land Infrastructure Works, the Automated People Mover depot, Early Remote Stands) and any other site we add later plugs into one platform.",
  "2. A dedicated Network & Cyber Security Layer protects every connection before data reaches the platform.",
  "3. T5-ISMS Sitewide unifies operations: Digital Twin, Incident & Alarm Management, Sitewide Health Status, a Common Operating Picture and a Digital Workflow Engine.",
  "4. Video Analytics (with video dispatcher and aggregators) and A.I. (ML, LLM) turn sensor and video data into insight.",
  "5. The Orchestration Layer, built on APIs, SDKs, DIO and industry standards, lets that intelligence drive autonomous operations: robotics and automation (automated wheelchairs, patrol robots), predictive maintenance and Vision Watch.",
  "",
  "Key message: one open-standards platform today, ready for autonomy tomorrow.",
].join("\n");

// ───────────────────────────── helpers ─────────────────────────────
const iconCache = new Map();
async function ic(name, weight, color) {
  const key = `${name}|${weight}|${color}`;
  if (iconCache.has(key)) return iconCache.get(key);
  const comp = pi["Pi" + name + (weight === "Regular" ? "" : weight)];
  if (!comp) throw new Error(`missing icon Pi${name}${weight}`);
  const svg = RDS.renderToStaticMarkup(React.createElement(comp, { size: 384, color: "#" + color }));
  const buf = await sharp(Buffer.from(svg)).png().toBuffer();
  const data = "image/png;base64," + buf.toString("base64");
  iconCache.set(key, data);
  return data;
}

function mk(pres, s) {
  const S = pres.shapes;
  return {
    text(t, o) {
      s.addText(t, Object.assign({ margin: 0, isTextBox: true, valign: "top" }, o));
    },
    rect(o) {
      s.addShape(o.r ? S.ROUNDED_RECTANGLE : S.RECTANGLE, Object.assign(o.r ? { rectRadius: o.r } : {}, o));
    },
    ellipse(o) {
      s.addShape(S.OVAL, o);
    },
    hexagon(o) {
      s.addShape(S.HEXAGON, o);
    },
    line(x1, y1, x2, y2, line) {
      const flipH = x2 < x1, flipV = y2 < y1;
      s.addShape(S.LINE, {
        x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
        flipH, flipV, line,
      });
    },
    async icon(name, weight, color, x, y, size) {
      s.addImage({ data: await ic(name, weight, color), x, y, w: size, h: size, altText: name.replace(/([a-z])([A-Z])/g, "$1 $2") + " icon" });
    },
  };
}
const glow = (color, blur, opacity) => ({ type: "outer", color, blur, offset: 0, angle: 90, opacity });
function hudCorners(d, color) {
  for (const [x, y, sx, sy] of [[0.3, 0.3, 1, 1], [13.033, 0.3, -1, 1], [0.3, 7.2, 1, -1], [13.033, 7.2, -1, -1]]) {
    d.line(x, y, x + 0.24 * sx, y, { color, width: 1, transparency: 35 });
    d.line(x, y, x, y + 0.24 * sy, { color, width: 1, transparency: 35 });
  }
}

// Gradient fills/lines/text: shapes are drawn with a unique sentinel colour, then swapped for a
// <a:gradFill> after writing. LibreOffice previews gradient *text* as a flat colour; PowerPoint renders it.
const SENT = {
  v2ai: "B05AF0", v2head: "B15AF1", v2orch: "B25AF2",
  v3bar: "B35AF3", v3core: "B45AF4", v3head: "B55AF5", v1ai: "B65AF6",
  v4band: "B75AF7", v4spine: "B85AF8",
  v5glass: "C05A01", v5edge: "C05A02", v5ai: "C05A03", v5gold: "C05A04", v5head: "C05A05",
  v6glass: "C05A11", v6edge: "C05A12", v6core: "C05A13", v6lite: "C05A14", v6glassHi: "C05A15",
};
const stop = (pos, hex, alpha) =>
  `<a:gs pos="${pos}"><a:srgbClr val="${hex}">${alpha != null ? `<a:alpha val="${alpha}"/>` : ""}</a:srgbClr></a:gs>`;
const lin = (stops, ang) => `<a:gradFill rotWithShape="1"><a:gsLst>${stops.join("")}</a:gsLst><a:lin ang="${ang}" scaled="0"/></a:gradFill>`;
const radial = (stops) =>
  `<a:gradFill rotWithShape="1"><a:gsLst>${stops.join("")}</a:gsLst><a:path path="circle"><a:fillToRect l="50000" t="50000" r="50000" b="50000"/></a:path></a:gradFill>`;
const APPLE_INTEL = (ang) => lin([stop(0, "0A84FF"), stop(38000, "BF5AF2"), stop(70000, "FF375F"), stop(100000, "FF9F0A")], ang);
const GRADS = {
  [SENT.v2ai]: APPLE_INTEL(2700000),
  [SENT.v2head]: APPLE_INTEL(0),
  [SENT.v2orch]: APPLE_INTEL(2700000),
  [SENT.v3bar]: lin([stop(0, "00E5FF", 30000), stop(55000, "1D6BFF", 18000), stop(100000, "8B5CF6", 30000)], 5400000),
  [SENT.v3core]: radial([stop(0, "0E5A80"), stop(60000, "082238"), stop(100000, "050F1C")]),
  [SENT.v3head]: lin([stop(0, "00E5FF"), stop(100000, "8B5CF6")], 0),
  [SENT.v1ai]: lin([stop(0, "FFFFFF", 14000), stop(100000, "FFFFFF", 2000)], 0),
  [SENT.v4band]: lin([stop(0, "00E5FF", 26000), stop(55000, "1D6BFF", 14000), stop(100000, "8B5CF6", 26000)], 0),
  [SENT.v4spine]: lin([stop(0, "071C30"), stop(50000, "0E4D6E"), stop(100000, "071C30")], 5400000),
  // pearl glass: milky white body, bright top-left rim falling to a cool grey edge
  [SENT.v5glass]: lin([stop(0, "FFFFFF", 80000), stop(100000, "FFFFFF", 44000)], 2700000),
  [SENT.v5edge]: lin([stop(0, "FFFFFF"), stop(60000, "FFFFFF", 75000), stop(100000, "CDD3DD")], 2700000),
  [SENT.v5ai]: lin([stop(0, "E6DDF3"), stop(35000, "D8E6F5"), stop(70000, "F3E8D8"), stop(100000, "EFDCE4")], 2700000),
  [SENT.v5gold]: lin([stop(0, "D9C28F"), stop(50000, "F4ECDA"), stop(100000, "B39663")], 2700000),
  [SENT.v5head]: lin([stop(0, "A8895A"), stop(55000, "8C8A8E"), stop(100000, "3E5170")], 0),
  // dark glass: smoked translucent body, specular top-left rim, cool ice glint bottom-right
  [SENT.v6glass]: lin([stop(0, "FFFFFF", 11000), stop(100000, "FFFFFF", 3000)], 2700000),
  [SENT.v6glassHi]: lin([stop(0, "FFFFFF", 20000), stop(100000, "9CC3F0", 6000)], 2700000),
  [SENT.v6edge]: lin([stop(0, "FFFFFF", 60000), stop(50000, "FFFFFF", 14000), stop(100000, "9CC3F0", 30000)], 2700000),
  [SENT.v6core]: radial([stop(0, "FFFFFF", 22000), stop(100000, "FFFFFF", 4000)]),
  [SENT.v6lite]: lin([stop(0, "FFFFFF", 7000), stop(100000, "FFFFFF", 2000)], 2700000),
};
async function postProcess(file) {
  const zip = await JSZip.loadAsync(fs.readFileSync(file));
  for (const name of Object.keys(zip.files)) {
    if (!/^ppt\/slides\/slide\d+\.xml$/.test(name)) continue;
    let xml = await zip.file(name).async("string");
    for (const [hex, grad] of Object.entries(GRADS)) {
      xml = xml.split(`<a:solidFill><a:srgbClr val="${hex}"/></a:solidFill>`).join(grad);
    }
    zip.file(name, xml);
  }
  fs.writeFileSync(file, await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }));
}

// ═════════════════════════════ V1 — LAYERED · SpaceX ═════════════════════════════
async function v1(pres) {
  const s = pres.addSlide();
  s.background = { path: path.join(ASSETS, "bg_v1.jpg") };
  s.addNotes(NOTES);
  const d = mk(pres, s);
  const W = "FFFFFF", G1 = "A8A8A8", G2 = "6F6F6F", HL = "3C3C3C", CELL = "080808";
  const cell = (o) => d.rect(Object.assign({ fill: { color: CELL }, line: { color: HL, width: 0.75 } }, o));

  // header
  d.text([
    { text: "T5 ISMS SITEWIDE", options: { bold: true, color: W } },
    { text: "   /   PRODUCT ARCHITECTURE", options: { color: G1 } },
  ], { x: 0.55, y: 0.42, w: 8, h: 0.24, fontSize: 10, charSpacing: 3 });
  d.text([
    { text: "ONE PLATFORM. EVERY SITE.", options: { breakLine: true } },
    { text: "READY FOR AUTONOMY." },
  ], { x: 0.55, y: 0.72, w: 8.6, h: 0.95, fontSize: 28, bold: true, color: W, charSpacing: 1.5, lineSpacingMultiple: 0.92 });
  d.text("01°21′N   103°59′E", { x: 9.65, y: 0.42, w: 3.13, h: 0.24, fontSize: 10, color: G2, charSpacing: 3 });
  d.text(C.sub, { x: 9.65, y: 0.74, w: 3.13, h: 0.9, fontSize: 10.5, color: G1, lineSpacingMultiple: 1.15 });

  // geometry
  const X0 = 1.85, X1 = 9.47, CW = X1 - X0; // stack content
  const SPX = 9.65, SPW = 0.55;            // orchestration spine
  const RX = 10.38, RW = 2.4;              // autonomy column
  const R4 = { y: 1.9, h: 0.85 }, R3 = { y: 2.87, h: 1.33 }, R2 = { y: 4.32, h: 0.6 }, R1 = { y: 5.04, h: 1.56 };
  const label = (num, name, x, y) => d.text([
    { text: num, options: { color: G2, breakLine: true } },
    { text: name, options: { color: W, bold: true } },
  ], { x, y, w: 1.3, h: 0.42, fontSize: 10, charSpacing: 1, paraSpaceAfter: 2 });
  label("04", "INTELLIGENCE", 0.55, R4.y);
  label("03", "PLATFORM", 0.55, R3.y);
  label("02", "SECURITY", 0.55, R2.y);
  label("01", "SITES", 0.55, R1.y);
  label("06", "AUTONOMY", RX, R4.y);

  // 04 intelligence: video analytics + A.I.
  const half = (CW - 0.12) / 2;
  const intel = [
    { x: X0, item: C.video, title: "VIDEO ANALYTICS" },
    { x: X0 + half + 0.12, item: C.ai, title: "A.I.", hi: true },
  ];
  for (const c of intel) {
    cell({ x: c.x, y: R4.y, w: half, h: R4.h, fill: { color: c.hi ? SENT.v1ai : CELL }, line: { color: c.hi ? "D9D9D9" : HL, width: c.hi ? 1 : 0.75 } });
    await d.icon(c.item.icon, "Light", W, c.x + 0.22, R4.y + 0.245, 0.36);
    d.text(c.title, { x: c.x + 0.75, y: R4.y + 0.15, w: half - 0.9, h: 0.26, fontSize: 12, bold: true, color: W, charSpacing: 2 });
    d.text(c.item.sub, { x: c.x + 0.75, y: R4.y + 0.45, w: half - 0.9, h: 0.26, fontSize: 10.5, color: G1 });
  }

  // 03 platform
  cell({ x: X0, y: R3.y, w: CW, h: R3.h });
  d.text(C.platform.name.toUpperCase(), { x: X0 + 0.18, y: R3.y + 0.12, w: 3.5, h: 0.24, fontSize: 11, bold: true, color: W, charSpacing: 2 });
  d.text("5 CORE MODULES", { x: X1 - 3.68, y: R3.y + 0.12, w: 3.5, h: 0.24, fontSize: 10, color: G2, charSpacing: 2, align: "right" });
  const mw = (CW - 0.3) / 5;
  for (let i = 0; i < 5; i++) {
    const m = M[MOD_ORDER[i]], mx = X0 + 0.15 + i * mw;
    if (i > 0) d.line(mx, R3.y + 0.5, mx, R3.y + 1.2, { color: "2A2A2A", width: 0.75 });
    await d.icon(m.icon, "Light", W, mx + 0.15, R3.y + 0.5, 0.32);
    d.text(m.label, { x: mx + 0.15, y: R3.y + 0.88, w: mw - 0.25, h: 0.4, fontSize: 10.5, color: W });
  }

  // 02 network & cyber
  d.rect({ x: X0, y: R2.y, w: CW, h: R2.h, fill: { color: "FFFFFF", transparency: 92 }, line: { color: "4A4A4A", width: 0.75 } });
  await d.icon(C.network.icon, "Light", W, X0 + 0.2, R2.y + 0.14, 0.32);
  d.text(C.network.name.toUpperCase(), { x: X0 + 0.68, y: R2.y, w: 6.5, h: R2.h, fontSize: 11, bold: true, color: W, charSpacing: 4, valign: "middle" });
  d.line(X1, R2.y + R2.h / 2, SPX, R2.y + R2.h / 2, { color: G2, width: 0.75 });

  // 01 sites
  const gap = 0.068, sw = (CW - 6 * gap) / 7;
  for (let i = 0; i < 7; i++) {
    const st = C.sites[i], sx = X0 + i * (sw + gap);
    d.line(sx + sw / 2, R2.y + R2.h, sx + sw / 2, R1.y, { color: "5A5A5A", width: 0.75 });
    cell({ x: sx, y: R1.y, w: sw, h: R1.h, line: { color: st.future ? "6A6A6A" : HL, width: 0.75, dashType: st.future ? "dash" : "solid" } });
    await d.icon(st.icon, "Light", W, sx + 0.1, R1.y + 0.14, 0.3);
    d.text(st.code.toUpperCase(), { x: sx + 0.1, y: R1.y + 0.56, w: sw - 0.12, h: 0.24, fontSize: 10, bold: true, color: W });
    d.text(st.desc, { x: sx + 0.1, y: R1.y + 0.84, w: sw - 0.14, h: 0.66, fontSize: 10, color: G1 });
  }

  // 05 orchestration spine
  const SY = R4.y, SH = R1.y + R1.h - R4.y;
  d.rect({ x: SPX, y: SY, w: SPW, h: SH, fill: { color: "FFFFFF", transparency: 93 }, line: { color: "8A8A8A", width: 0.75 } });
  const scx = SPX + SPW / 2, scy = SY + SH / 2, L = SH - 0.3;
  d.text([
    { text: "05  /  " + C.orch.name.toUpperCase(), options: { bold: true, color: W, fontSize: 11, charSpacing: 3, breakLine: true } },
    { text: "API  ·  SDK  ·  DIO  ·  INDUSTRY STANDARDS", options: { color: G1, fontSize: 10, charSpacing: 1.5 } },
  ], { x: scx - L / 2, y: scy - SPW / 2, w: L, h: SPW, rotate: 270, align: "center", valign: "middle", paraSpaceAfter: 3 });

  // 06 autonomy
  const arrow = { color: W, width: 1.25, beginArrowType: "triangle", endArrowType: "triangle" };
  d.line(X1, R4.y + R4.h / 2, SPX, R4.y + R4.h / 2, Object.assign({}, arrow));
  const rob = { y: 2.38, h: 1.87 }, pdm = { y: 4.37, h: 1.06 }, vis = { y: 5.54, h: 1.06 };
  cell({ x: RX, y: rob.y, w: RW, h: rob.h, line: { color: "D9D9D9", width: 1 } });
  await d.icon(C.robotics.icon, "Light", W, RX + 0.2, rob.y + 0.2, 0.36);
  d.text("ROBOTICS &\nAUTOMATION", { x: RX + 0.7, y: rob.y + 0.17, w: RW - 0.85, h: 0.42, fontSize: 11.5, bold: true, color: W, charSpacing: 1 });
  d.line(RX + 0.2, rob.y + 0.78, RX + RW - 0.2, rob.y + 0.78, { color: "2E2E2E", width: 0.75 });
  for (let i = 0; i < 2; i++) {
    const it = C.robotics.items[i], iy = rob.y + 0.95 + i * 0.44;
    await d.icon(it.icon, "Light", W, RX + 0.22, iy + 0.02, 0.28);
    d.text(it.t, { x: RX + 0.62, y: iy, w: RW - 0.75, h: 0.32, fontSize: 10.5, color: W, valign: "middle" });
  }
  for (const [box, item] of [[pdm, C.pdm], [vis, C.vision]]) {
    cell({ x: RX, y: box.y, w: RW, h: box.h });
    await d.icon(item.icon, "Light", W, RX + 0.2, box.y + box.h / 2 - 0.18, 0.36);
    const t = item.name.toUpperCase().replace(" ", "\n");
    d.text(item === C.vision ? item.name.toUpperCase() : t, { x: RX + 0.7, y: box.y, w: RW - 0.85, h: box.h, fontSize: 11.5, bold: true, color: W, charSpacing: 1, valign: "middle" });
    d.line(SPX + SPW, box.y + box.h / 2, RX, box.y + box.h / 2, { color: G1, width: 0.75 });
  }
  d.line(SPX + SPW, rob.y + rob.h / 2, RX, rob.y + rob.h / 2, Object.assign({}, arrow));

  // footer
  d.text(C.pillars.map((p) => p.toUpperCase()).join("  ·  "), { x: 0.55, y: 6.82, w: 7.5, h: 0.24, fontSize: 10, color: G1, charSpacing: 2 });
  d.text("INTEGRATED SECURITY MANAGEMENT SYSTEM", { x: 8.2, y: 6.82, w: 4.58, h: 0.24, fontSize: 10, color: G2, charSpacing: 2, align: "right" });
}

// ═════════════════════════════ V2 — MODULAR · Apple ═════════════════════════════
async function v2(pres) {
  const s = pres.addSlide();
  s.background = { path: path.join(ASSETS, "bg_v2.jpg") };
  s.addNotes(NOTES);
  const d = mk(pres, s);
  const W = "FFFFFF", G = "98989D", TILE = "1C1C1E", CHIP = "2C2C2E", EDGE = "2C2C2E";
  const tile = (o) => d.rect(Object.assign({ r: 0.2, fill: { color: TILE, transparency: 8 }, line: { color: EDGE, width: 0.75 } }, o));
  const appIcon = async (name, bg, x, y, size, glyph = W) => {
    d.rect({ x, y, w: size, h: size, r: size * 0.24, fill: { color: bg }, line: { type: "none" } });
    const g = size * 0.62;
    await d.icon(name, "Fill", glyph, x + (size - g) / 2, y + (size - g) / 2, g);
  };

  // header
  d.text([
    { text: "T5 ISMS Sitewide", options: { bold: true, color: W } },
    { text: "  ·  Product Architecture", options: { color: G } },
  ], { x: 0.55, y: 0.48, w: 6, h: 0.28, fontSize: 14 });
  d.text(C.pillars.join("  ·  "), { x: 6.8, y: 0.5, w: 5.98, h: 0.26, fontSize: 11, color: G, align: "right" });
  d.text([
    { text: "One platform. Every site. ", options: { color: W } },
    { text: "Ready for autonomy.", options: { color: SENT.v2head } },
  ], { x: 0.55, y: 0.82, w: 12.23, h: 0.62, fontSize: 32, bold: true, charSpacing: -0.5 });
  d.text(C.sub, { x: 0.55, y: 1.45, w: 12.23, h: 0.32, fontSize: 14, color: G });

  // grid
  const top = 2.0, gp = 0.15;
  const R1 = { y: top, h: 2.2 }, R2 = { y: 4.35, h: 0.5 }, R3 = { y: 5.0, h: 1.95 };
  const RX = 9.78, RW = 3.0;

  // platform tile
  const P = { x: 0.55, w: 5.5 };
  tile({ x: P.x, y: R1.y, w: P.w, h: R1.h });
  d.text(C.platform.name, { x: P.x + 0.25, y: R1.y + 0.18, w: 4.5, h: 0.36, fontSize: 20, bold: true, color: W });
  d.text(C.platform.caption, { x: P.x + 0.25, y: R1.y + 0.52, w: 4.5, h: 0.26, fontSize: 12, color: G });
  const cols = [["incident", "cop", "health"], ["twin", "workflow"]];
  const colX = [P.x + 0.25, P.x + 3.0];
  const modColor = { twin: "0A84FF", incident: "FF453A", health: "FF375F", cop: "FF9F0A", workflow: "BF5AF2" };
  for (let c = 0; c < 2; c++) {
    for (let r = 0; r < cols[c].length; r++) {
      const k = cols[c][r], y = R1.y + 0.94 + r * 0.38;
      await appIcon(M[k].icon, modColor[k], colX[c], y, 0.32);
      d.text(M[k].label, { x: colX[c] + 0.44, y: y - 0.03, w: c === 0 ? 2.25 : 2.0, h: 0.38, fontSize: 11.5, color: W, valign: "middle" });
    }
  }

  // video tile
  const V = { x: P.x + P.w + gp, w: 1.7 };
  tile({ x: V.x, y: R1.y, w: V.w, h: R1.h });
  await appIcon(C.video.icon, "64D2FF", V.x + 0.22, R1.y + 0.22, 0.5);
  d.text("Video\nAnalytics", { x: V.x + 0.22, y: R1.y + 0.9, w: V.w - 0.35, h: 0.56, fontSize: 15, bold: true, color: W });
  d.text(C.video.sub, { x: V.x + 0.22, y: R1.y + 1.5, w: V.w - 0.35, h: 0.56, fontSize: 11, color: G });

  // A.I. tile (Apple-intelligence gradient)
  const A = { x: V.x + V.w + gp, w: 9.63 - (V.x + V.w + gp) };
  d.rect({ x: A.x, y: R1.y, w: A.w, h: R1.h, r: 0.2, fill: { color: SENT.v2ai }, line: { type: "none" }, shadow: glow("BF5AF2", 22, 0.45) });
  await d.icon("Sparkle", "Fill", W, A.x + 0.22, R1.y + 0.22, 0.4);
  d.text(C.ai.name, { x: A.x + 0.22, y: R1.y + 0.92, w: A.w - 0.3, h: 0.66, fontSize: 40, bold: true, color: W, charSpacing: -0.5 });
  d.text(C.ai.sub, { x: A.x + 0.22, y: R1.y + 1.62, w: A.w - 0.3, h: 0.3, fontSize: 12.5, bold: true, color: W });

  // network band
  tile({ x: 0.55, y: R2.y, w: 9.08, h: R2.h, r: 0.16 });
  await appIcon(C.network.icon, "30D158", 0.75, R2.y + 0.1, 0.3);
  d.text(C.network.name, { x: 1.2, y: R2.y, w: 5, h: R2.h, fontSize: 14, bold: true, color: W, valign: "middle" });
  d.text("Secures every site connection", { x: 5.4, y: R2.y, w: 4.03, h: R2.h, fontSize: 11, color: G, valign: "middle", align: "right" });

  // connected sites 4 x 2
  const cw = (9.08 - 3 * gp) / 4, ch = (R3.h - gp) / 2;
  d.text("Connected sites", { x: 0.6, y: R3.y + 0.12, w: cw - 0.1, h: 0.34, fontSize: 17, bold: true, color: W });
  d.text("T5 and beyond, on one platform.", { x: 0.6, y: R3.y + 0.46, w: cw - 0.2, h: 0.4, fontSize: 11, color: G });
  for (let i = 0; i < 7; i++) {
    const slot = i + 1, col = slot % 4, row = Math.floor(slot / 4);
    const x = 0.55 + col * (cw + gp), y = R3.y + row * (ch + gp), st = C.sites[i];
    if (st.future) d.rect({ x, y, w: cw, h: ch, r: 0.2, fill: { color: "000000", transparency: 100 }, line: { color: "5A5A5E", width: 1, dashType: "dash" } });
    else tile({ x, y, w: cw, h: ch });
    d.ellipse({ x: x + 0.18, y: y + 0.2, w: 0.48, h: 0.48, fill: { color: st.future ? "1C1C1E" : CHIP }, line: { type: "none" } });
    await d.icon(st.icon, "Fill", st.future ? "0A84FF" : W, x + 0.29, y + 0.31, 0.26);
    d.text(st.code, { x: x + 0.8, y: y + 0.13, w: cw - 0.9, h: 0.3, fontSize: 14, bold: true, color: W });
    d.text(st.desc, { x: x + 0.8, y: y + 0.43, w: cw - 0.9, h: 0.4, fontSize: 10.5, color: G });
  }

  // orchestration tile (gradient edge)
  d.rect({ x: RX, y: R1.y, w: RW, h: R1.h, r: 0.2, fill: { color: TILE, transparency: 8 }, line: { color: SENT.v2orch, width: 1.75 } });
  await appIcon(C.orch.icon, "5E5CE6", RX + 0.34, R1.y + 0.22, 0.5);
  d.text(C.orch.name, { x: RX + 0.34, y: R1.y + 0.88, w: RW - 0.45, h: 0.36, fontSize: 17, bold: true, color: W });
  const chips = [[["API", 0.62], ["SDK", 0.64], ["DIO", 0.62]], [["Industry Standards", 1.72]]];
  for (let r = 0; r < 2; r++) {
    let cx = RX + 0.34;
    for (const [t, w] of chips[r]) {
      d.rect({ x: cx, y: R1.y + 1.36 + r * 0.42, w, h: 0.32, r: 0.16, fill: { color: CHIP }, line: { type: "none" } });
      d.text(t, { x: cx, y: R1.y + 1.36 + r * 0.42, w, h: 0.32, fontSize: 11, color: W, align: "center", valign: "middle" });
      cx += w + 0.1;
    }
  }

  // robotics + predictive maintenance + vision watch
  const rob = { y: R2.y, h: 1.4 };
  tile({ x: RX, y: rob.y, w: RW, h: rob.h });
  await appIcon(C.robotics.icon, "FF9F0A", RX + 0.22, rob.y + 0.2, 0.38);
  d.text(C.robotics.name, { x: RX + 0.72, y: rob.y + 0.2, w: RW - 0.85, h: 0.38, fontSize: 13.5, bold: true, color: W, valign: "middle" });
  for (let i = 0; i < 2; i++) {
    const it = C.robotics.items[i], iy = rob.y + 0.72 + i * 0.32;
    await d.icon(it.icon, "Regular", "FF9F0A", RX + 0.29, iy + 0.03, 0.24);
    d.text(it.t, { x: RX + 0.72, y: iy, w: RW - 0.85, h: 0.3, fontSize: 11.5, color: W, valign: "middle" });
  }
  const small = [[C.pdm, "FFD60A", "1C1C1E", 5.9], [C.vision, "63E6E2", "1C1C1E", 6.5]];
  for (const [item, bg, glyph, y] of small) {
    tile({ x: RX, y, w: RW, h: 0.45, r: 0.16 });
    await appIcon(item.icon, bg, RX + 0.2, y + 0.075, 0.3, glyph);
    d.text(item.name, { x: RX + 0.64, y, w: RW - 0.8, h: 0.45, fontSize: 13, bold: true, color: W, valign: "middle" });
  }

  // link badges (the ↔ in the sketch)
  const badge = async (cx, cy, glyph) => {
    d.ellipse({ x: cx - 0.21, y: cy - 0.21, w: 0.42, h: 0.42, fill: { color: "3A3A3C" }, line: { color: "000000", width: 3 } });
    await d.icon(glyph, "Bold", W, cx - 0.12, cy - 0.12, 0.24);
  };
  await badge((9.63 + RX) / 2, R1.y + R1.h / 2, "ArrowsLeftRight");
  await badge(RX + RW - 0.5, (R1.y + R1.h + rob.y) / 2, "ArrowsDownUp");
}

// ═════════════════════════════ V3 — FLOW / HUB · Neon ═════════════════════════════
async function v3(pres) {
  const s = pres.addSlide();
  s.background = { path: path.join(ASSETS, "bg_v3.jpg") };
  s.addNotes(NOTES);
  const d = mk(pres, s);
  const W = "FFFFFF", CY = "00E5FF", VI = "8B5CF6", VIL = "B9A2FF", MG = "FF3DCB", MUTE = "8FA3BF", DIM = "5E7896";
  const PILL = "081426", PILLLN = "1D4E7A";

  hudCorners(d, CY);

  // header
  d.text("T5 ISMS SITEWIDE  //  PRODUCT ARCHITECTURE", { x: 0.55, y: 0.42, w: 8, h: 0.24, fontSize: 10, bold: true, color: CY, charSpacing: 4 });
  d.text([
    { text: "ONE PLATFORM. EVERY SITE. ", options: { color: W } },
    { text: "READY FOR AUTONOMY.", options: { color: SENT.v3head } },
  ], { x: 0.55, y: 0.7, w: 12.23, h: 0.5, fontSize: 24, bold: true, charSpacing: 1.5, glow: { size: 8, opacity: 0.35, color: "00B8FF" } });
  d.text(C.sub, { x: 0.55, y: 1.2, w: 11, h: 0.3, fontSize: 12, color: MUTE });

  // columns
  const C1 = { x: 0.55, w: 2.35 }, C2 = { x: 3.1, w: 0.5 }, C3 = { x: 3.85, w: 4.2 }, C4 = { x: 8.35, w: 1.95 }, C5 = { x: 10.5, w: 2.28 };
  const TOP = 2.2, BOT = 6.75;

  // step track
  const steps = [["01", "CONNECT", C1], ["02", "SECURE", C2], ["03", "UNIFY", C3], ["04", "ORCHESTRATE", C4], ["05", "AUTOMATE", C5]];
  d.line(0.55, 2.0, 12.78, 2.0, { color: CY, width: 0.75, transparency: 72 });
  for (const [n, t, col] of steps) {
    const cx = col.x + col.w / 2;
    d.text([{ text: n + "  ", options: { color: CY } }, { text: t, options: { color: W } }],
      { x: cx - 1.1, y: 1.66, w: 2.2, h: 0.24, fontSize: 10, bold: true, charSpacing: 3, align: "center" });
    d.ellipse({ x: cx - 0.05, y: 1.95, w: 0.1, h: 0.1, fill: { color: CY }, line: { type: "none" }, shadow: glow(CY, 8, 0.9) });
  }

  // 01 sites
  const ph = (BOT - TOP - 6 * 0.08) / 7;
  for (let i = 0; i < 7; i++) {
    const st = C.sites[i], y = TOP + i * (ph + 0.08);
    d.rect({ x: C1.x, y, w: C1.w, h: ph, r: 0.08, fill: { color: PILL, transparency: 10 }, line: { color: st.future ? CY : PILLLN, width: 0.75, dashType: st.future ? "dash" : "solid" } });
    await d.icon(st.icon, "Duotone", CY, C1.x + 0.13, y + (ph - 0.3) / 2, 0.3);
    d.text(st.code.toUpperCase(), { x: C1.x + 0.56, y: y + 0.07, w: C1.w - 0.62, h: 0.22, fontSize: 10.5, bold: true, color: W, charSpacing: 1 });
    d.text(st.desc, { x: C1.x + 0.56, y: y + 0.3, w: C1.w - 0.6, h: 0.22, fontSize: 10, color: MUTE });
    d.line(C1.x + C1.w, y + ph / 2, C2.x, y + ph / 2, { color: CY, width: 0.75, transparency: 40 });
  }

  // 02 network & cyber bar
  d.rect({ x: C2.x, y: TOP, w: C2.w, h: BOT - TOP, r: 0.1, fill: { color: SENT.v3bar }, line: { color: CY, width: 1.25 }, shadow: glow(CY, 14, 0.55) });
  await d.icon(C.network.icon, "Duotone", W, C2.x + 0.07, TOP + 0.1, 0.36);
  const nby = (TOP + 0.55 + BOT) / 2, nbl = BOT - TOP - 0.75;
  d.text(C.network.name.toUpperCase(), { x: C2.x + C2.w / 2 - nbl / 2, y: nby - 0.2, w: nbl, h: 0.4, rotate: 270, fontSize: 10.5, bold: true, color: W, charSpacing: 2.5, align: "center", valign: "middle" });
  for (const y of [2.75, 4.47, 6.2]) d.line(C2.x + C2.w, y, C3.x, y, { color: CY, width: 1, transparency: 25 });

  // 03 platform panel
  d.rect({ x: C3.x, y: TOP, w: C3.w, h: BOT - TOP, r: 0.12, fill: { color: "06101E", transparency: 12 }, line: { color: CY, width: 1 }, shadow: glow(CY, 18, 0.35) });
  await d.icon("Stack", "Duotone", CY, C3.x + 0.2, TOP + 0.15, 0.36);
  d.text(C.platform.name.toUpperCase(), { x: C3.x + 0.68, y: TOP + 0.13, w: 3.3, h: 0.24, fontSize: 13, bold: true, color: W, charSpacing: 2 });
  d.text(C.platform.caption, { x: C3.x + 0.68, y: TOP + 0.4, w: 3.3, h: 0.22, fontSize: 10, color: MUTE });
  const LX = C3.x + 0.2, LW = 2.15, pitch = 0.7375;
  for (let i = 0; i < 5; i++) {
    const m = M[MOD_ORDER[i]], y = 3.0 + i * pitch;
    d.rect({ x: LX, y, w: LW, h: 0.6, r: 0.06, fill: { color: "0B1A2E", transparency: 5 }, line: { color: "17406A", width: 0.75 } });
    d.hexagon({ x: LX + 0.1, y: y + 0.11, w: 0.44, h: 0.38, fill: { color: "00E5FF", transparency: 88 }, line: { color: CY, width: 0.75 } });
    await d.icon(m.icon, "Regular", CY, LX + 0.2, y + 0.18, 0.24);
    d.text(m.label, { x: LX + 0.66, y, w: LW - 0.72, h: 0.6, fontSize: 10.5, color: W, valign: "middle" });
  }
  const RXc = C3.x + 2.5, RWc = 1.5;
  const ai = { y: 3.0, h: 1.6 }, vid = { y: 4.75, h: 1.8 };
  d.rect({ x: RXc, y: ai.y, w: RWc, h: ai.h, r: 0.08, fill: { color: "1A0820", transparency: 8 }, line: { color: MG, width: 1.25 }, shadow: glow(MG, 16, 0.6) });
  await d.icon(C.ai.icon, "Duotone", MG, RXc + 0.15, ai.y + 0.14, 0.38);
  d.text(C.ai.name, { x: RXc + 0.15, y: ai.y + 0.58, w: RWc - 0.25, h: 0.45, fontSize: 24, bold: true, color: W, glow: { size: 6, opacity: 0.4, color: MG } });
  d.text(C.ai.sub, { x: RXc + 0.15, y: ai.y + 1.08, w: RWc - 0.25, h: 0.3, fontSize: 10.5, bold: true, color: "F8A8EC" });
  d.rect({ x: RXc, y: vid.y, w: RWc, h: vid.h, r: 0.08, fill: { color: "0B1A2E", transparency: 5 }, line: { color: CY, width: 0.75, transparency: 20 } });
  await d.icon(C.video.icon, "Duotone", CY, RXc + 0.15, vid.y + 0.14, 0.38);
  d.text("VIDEO\nANALYTICS", { x: RXc + 0.15, y: vid.y + 0.6, w: RWc - 0.25, h: 0.42, fontSize: 11, bold: true, color: W, charSpacing: 1 });
  d.text(C.video.sub, { x: RXc + 0.15, y: vid.y + 1.06, w: RWc - 0.25, h: 0.6, fontSize: 10, color: MUTE });

  // 04 orchestration hub
  const hx = C4.x + C4.w / 2, hy = ai.y + ai.h / 2;
  d.text("ORCHESTRATION\nLAYER", { x: C4.x - 0.1, y: TOP + 0.02, w: C4.w + 0.2, h: 0.46, fontSize: 11, bold: true, color: W, charSpacing: 2, align: "center" });
  d.ellipse({ x: hx - 0.85, y: hy - 0.85, w: 1.7, h: 1.7, fill: { color: "000000", transparency: 100 }, line: { color: CY, width: 1, dashType: "sysDot", transparency: 25 } });
  d.ellipse({ x: hx - 0.68, y: hy - 0.68, w: 1.36, h: 1.36, fill: { color: SENT.v3core }, line: { color: CY, width: 1.5 }, shadow: glow(CY, 22, 0.75) });
  await d.icon(C.orch.icon, "Duotone", CY, hx - 0.32, hy - 0.32, 0.64);
  d.line(RXc + RWc, hy, hx - 0.85, hy, { color: MG, width: 1.5, beginArrowType: "triangle", endArrowType: "triangle" });
  const ifY0 = 4.95, ifP = 0.45;
  d.line(hx, hy + 0.85, hx, ifY0, { color: CY, width: 1, transparency: 25 });
  for (let i = 0; i < 4; i++) {
    const it = C.orch.ifaces[i], y = ifY0 + i * ifP;
    d.rect({ x: C4.x + 0.05, y, w: C4.w - 0.2, h: 0.36, r: 0.18, fill: { color: PILL, transparency: 5 }, line: { color: PILLLN, width: 0.75 } });
    await d.icon(it.icon, "Regular", CY, C4.x + 0.19, y + 0.07, 0.22);
    d.text(it.t, { x: C4.x + 0.51, y, w: C4.w - 0.6, h: 0.36, fontSize: 10.5, color: W, valign: "middle" });
  }

  // 05 autonomy nodes
  const card = (y, h) => d.rect({ x: C5.x, y, w: C5.w, h, r: 0.08, fill: { color: "0D0A26", transparency: 8 }, line: { color: VI, width: 1.25 }, shadow: glow(VI, 14, 0.55) });
  const rob = { y: TOP, h: 2.05 }, pdm = { y: 4.4, h: 1.1 }, vis = { y: 5.65, h: 1.1 };
  card(rob.y, rob.h);
  await d.icon(C.robotics.icon, "Duotone", VIL, C5.x + 0.15, rob.y + 0.15, 0.38);
  d.text("ROBOTICS &\nAUTOMATION", { x: C5.x + 0.62, y: rob.y + 0.13, w: C5.w - 0.7, h: 0.44, fontSize: 11.5, bold: true, color: W, charSpacing: 1 });
  for (let i = 0; i < 2; i++) {
    const it = C.robotics.items[i], y = rob.y + 0.78 + i * 0.6;
    d.rect({ x: C5.x + 0.15, y, w: C5.w - 0.3, h: 0.5, r: 0.06, fill: { color: "140F33" }, line: { color: "3B2D7A", width: 0.75 } });
    await d.icon(it.icon, "Regular", VIL, C5.x + 0.25, y + 0.11, 0.28);
    d.text(it.t, { x: C5.x + 0.62, y, w: C5.w - 0.82, h: 0.5, fontSize: 10.5, color: W, valign: "middle" });
  }
  for (const [box, item, label] of [[pdm, C.pdm, "PREDICTIVE\nMAINTENANCE"], [vis, C.vision, "VISION WATCH"]]) {
    card(box.y, box.h);
    await d.icon(item.icon, "Duotone", VIL, C5.x + 0.15, box.y + box.h / 2 - 0.19, 0.38);
    d.text(label, { x: C5.x + 0.62, y: box.y, w: C5.w - 0.7, h: box.h, fontSize: 11.5, bold: true, color: W, charSpacing: 1, valign: "middle" });
  }
  // bus from hub to autonomy
  const busX = C5.x - 0.2, ys = [rob.y + rob.h / 2, pdm.y + pdm.h / 2, vis.y + vis.h / 2];
  d.line(hx + 0.85, hy, busX, hy, { color: VIL, width: 1.25 });
  d.line(busX, ys[0], busX, ys[2], { color: VIL, width: 1.25 });
  for (const y of ys) d.line(busX, y, C5.x, y, { color: VIL, width: 1.25, endArrowType: "triangle" });

  // footer
  d.text(C.pillars.map((p) => p.toUpperCase()).join("  ·  "), { x: 0.55, y: 6.9, w: 7, h: 0.22, fontSize: 10, color: DIM, charSpacing: 2 });
}

// ═════════════════════════════ V4 — LAYERED (V1 layout) · Neon (V3 look) ═════════════════════════════
async function v4(pres) {
  const s = pres.addSlide();
  s.background = { path: path.join(ASSETS, "bg_v4.jpg") };
  s.addNotes(NOTES);
  const d = mk(pres, s);
  const W = "FFFFFF", CY = "00E5FF", VI = "8B5CF6", VIL = "B9A2FF", MG = "FF3DCB", MUTE = "8FA3BF", DIM = "5E7896";
  const PILL = "081426", PILLLN = "1D4E7A";
  hudCorners(d, CY);

  // header
  d.text("T5 ISMS SITEWIDE  //  PRODUCT ARCHITECTURE", { x: 0.55, y: 0.42, w: 8, h: 0.24, fontSize: 10, bold: true, color: CY, charSpacing: 4 });
  d.text([
    { text: "ONE PLATFORM. EVERY SITE.", options: { color: W, breakLine: true } },
    { text: "READY FOR AUTONOMY.", options: { color: SENT.v3head } },
  ], { x: 0.55, y: 0.72, w: 8.6, h: 0.95, fontSize: 28, bold: true, charSpacing: 1.5, lineSpacingMultiple: 0.92, glow: { size: 8, opacity: 0.35, color: "00B8FF" } });
  d.text("01°21′N   103°59′E", { x: 9.65, y: 0.42, w: 3.13, h: 0.24, fontSize: 10, bold: true, color: DIM, charSpacing: 3 });
  d.text(C.sub, { x: 9.65, y: 0.74, w: 3.13, h: 0.9, fontSize: 10.5, color: MUTE, lineSpacingMultiple: 1.15 });

  // geometry — identical to V1
  const X0 = 1.85, X1 = 9.47, CW = X1 - X0;
  const SPX = 9.65, SPW = 0.55;
  const RX = 10.38, RW = 2.4;
  const R4 = { y: 1.9, h: 0.85 }, R3 = { y: 2.87, h: 1.33 }, R2 = { y: 4.32, h: 0.6 }, R1 = { y: 5.04, h: 1.56 };
  const label = (num, name, x, y) => d.text([
    { text: num, options: { color: CY, bold: true, breakLine: true } },
    { text: name, options: { color: W, bold: true } },
  ], { x, y, w: 1.3, h: 0.42, fontSize: 10, charSpacing: 1, paraSpaceAfter: 2 });
  label("04", "INTELLIGENCE", 0.55, R4.y);
  label("03", "PLATFORM", 0.55, R3.y);
  label("02", "SECURITY", 0.55, R2.y);
  label("01", "SITES", 0.55, R1.y);
  label("06", "AUTONOMY", RX, R4.y);

  // 04 intelligence
  const half = (CW - 0.12) / 2;
  d.rect({ x: X0, y: R4.y, w: half, h: R4.h, r: 0.08, fill: { color: "0B1A2E", transparency: 5 }, line: { color: CY, width: 0.75, transparency: 20 } });
  await d.icon(C.video.icon, "Duotone", CY, X0 + 0.22, R4.y + 0.235, 0.38);
  d.text("VIDEO ANALYTICS", { x: X0 + 0.75, y: R4.y + 0.15, w: half - 0.9, h: 0.26, fontSize: 12, bold: true, color: W, charSpacing: 2 });
  d.text(C.video.sub, { x: X0 + 0.75, y: R4.y + 0.45, w: half - 0.9, h: 0.26, fontSize: 10.5, color: MUTE });
  const AX = X0 + half + 0.12;
  d.rect({ x: AX, y: R4.y, w: half, h: R4.h, r: 0.08, fill: { color: "1A0820", transparency: 8 }, line: { color: MG, width: 1.25 }, shadow: glow(MG, 16, 0.6) });
  await d.icon(C.ai.icon, "Duotone", MG, AX + 0.22, R4.y + 0.235, 0.38);
  d.text("A.I.", { x: AX + 0.75, y: R4.y + 0.13, w: half - 0.9, h: 0.3, fontSize: 14, bold: true, color: W, charSpacing: 2, glow: { size: 6, opacity: 0.4, color: MG } });
  d.text(C.ai.sub, { x: AX + 0.75, y: R4.y + 0.45, w: half - 0.9, h: 0.26, fontSize: 10.5, bold: true, color: "F8A8EC" });

  // 03 platform
  d.rect({ x: X0, y: R3.y, w: CW, h: R3.h, r: 0.1, fill: { color: "06101E", transparency: 12 }, line: { color: CY, width: 1 }, shadow: glow(CY, 18, 0.35) });
  d.text(C.platform.name.toUpperCase(), { x: X0 + 0.2, y: R3.y + 0.12, w: 3.5, h: 0.24, fontSize: 11, bold: true, color: W, charSpacing: 2 });
  d.text("5 CORE MODULES", { x: X1 - 3.7, y: R3.y + 0.12, w: 3.5, h: 0.24, fontSize: 10, bold: true, color: DIM, charSpacing: 2, align: "right" });
  const mw = (CW - 0.3) / 5;
  for (let i = 0; i < 5; i++) {
    const m = M[MOD_ORDER[i]], mx = X0 + 0.15 + i * mw;
    if (i > 0) d.line(mx, R3.y + 0.48, mx, R3.y + 1.2, { color: "17406A", width: 0.75 });
    d.hexagon({ x: mx + 0.13, y: R3.y + 0.44, w: 0.5, h: 0.44, fill: { color: CY, transparency: 88 }, line: { color: CY, width: 0.75 } });
    await d.icon(m.icon, "Regular", CY, mx + 0.25, R3.y + 0.53, 0.26);
    d.text(m.label, { x: mx + 0.13, y: R3.y + 0.93, w: mw - 0.22, h: 0.38, fontSize: 10.5, color: W });
  }

  // 02 network & cyber
  d.rect({ x: X0, y: R2.y, w: CW, h: R2.h, r: 0.08, fill: { color: SENT.v4band }, line: { color: CY, width: 1.25 }, shadow: glow(CY, 14, 0.5) });
  await d.icon(C.network.icon, "Duotone", W, X0 + 0.2, R2.y + 0.12, 0.36);
  d.text(C.network.name.toUpperCase(), { x: X0 + 0.72, y: R2.y, w: 6.5, h: R2.h, fontSize: 11, bold: true, color: W, charSpacing: 4, valign: "middle" });
  d.line(X1, R2.y + R2.h / 2, SPX, R2.y + R2.h / 2, { color: CY, width: 1 });

  // 01 sites
  const gap = 0.068, sw = (CW - 6 * gap) / 7;
  for (let i = 0; i < 7; i++) {
    const st = C.sites[i], sx = X0 + i * (sw + gap);
    d.line(sx + sw / 2, R2.y + R2.h, sx + sw / 2, R1.y, { color: CY, width: 0.75, transparency: 40 });
    d.rect({ x: sx, y: R1.y, w: sw, h: R1.h, r: 0.08, fill: { color: PILL, transparency: 10 }, line: { color: st.future ? CY : PILLLN, width: 0.75, dashType: st.future ? "dash" : "solid" } });
    await d.icon(st.icon, "Duotone", CY, sx + 0.1, R1.y + 0.14, 0.32);
    d.text(st.code.toUpperCase(), { x: sx + 0.1, y: R1.y + 0.58, w: sw - 0.12, h: 0.24, fontSize: 10, bold: true, color: W });
    d.text(st.desc, { x: sx + 0.1, y: R1.y + 0.86, w: sw - 0.14, h: 0.66, fontSize: 10, color: MUTE });
  }

  // 05 orchestration spine
  const SY = R4.y, SH = R1.y + R1.h - R4.y;
  d.rect({ x: SPX, y: SY, w: SPW, h: SH, r: 0.1, fill: { color: SENT.v4spine }, line: { color: CY, width: 1.5 }, shadow: glow(CY, 22, 0.7) });
  await d.icon(C.orch.icon, "Duotone", CY, SPX + (SPW - 0.38) / 2, SY + 0.14, 0.38);
  const L = SH - 0.75, scx = SPX + SPW / 2, scy = SY + 0.6 + L / 2;
  d.text([
    { text: "05  /  " + C.orch.name.toUpperCase(), options: { bold: true, color: W, fontSize: 11, charSpacing: 3, breakLine: true } },
    { text: "API  ·  SDK  ·  DIO  ·  INDUSTRY STANDARDS", options: { color: "9FEFFF", fontSize: 10, charSpacing: 1 } },
  ], { x: scx - L / 2, y: scy - SPW / 2, w: L, h: SPW, rotate: 270, align: "center", valign: "middle", paraSpaceAfter: 3 });

  // 06 autonomy
  d.line(X1, R4.y + R4.h / 2, SPX, R4.y + R4.h / 2, { color: MG, width: 1.5, beginArrowType: "triangle", endArrowType: "triangle" });
  const card = (box) => d.rect({ x: RX, y: box.y, w: RW, h: box.h, r: 0.08, fill: { color: "0D0A26", transparency: 8 }, line: { color: VI, width: 1.25 }, shadow: glow(VI, 14, 0.55) });
  const rob = { y: 2.38, h: 1.87 }, pdm = { y: 4.37, h: 1.06 }, vis = { y: 5.54, h: 1.06 };
  card(rob);
  await d.icon(C.robotics.icon, "Duotone", VIL, RX + 0.15, rob.y + 0.15, 0.38);
  d.text("ROBOTICS &\nAUTOMATION", { x: RX + 0.62, y: rob.y + 0.15, w: RW - 0.7, h: 0.44, fontSize: 11.5, bold: true, color: W, charSpacing: 1 });
  for (let i = 0; i < 2; i++) {
    const it = C.robotics.items[i], y = rob.y + 0.78 + i * 0.52;
    d.rect({ x: RX + 0.15, y, w: RW - 0.3, h: 0.44, r: 0.06, fill: { color: "140F33" }, line: { color: "3B2D7A", width: 0.75 } });
    await d.icon(it.icon, "Regular", VIL, RX + 0.25, y + 0.09, 0.26);
    d.text(it.t, { x: RX + 0.62, y, w: RW - 0.82, h: 0.44, fontSize: 10.5, color: W, valign: "middle" });
  }
  for (const [box, item, text] of [[pdm, C.pdm, "PREDICTIVE\nMAINTENANCE"], [vis, C.vision, "VISION WATCH"]]) {
    card(box);
    await d.icon(item.icon, "Duotone", VIL, RX + 0.15, box.y + box.h / 2 - 0.19, 0.38);
    d.text(text, { x: RX + 0.62, y: box.y, w: RW - 0.7, h: box.h, fontSize: 11.5, bold: true, color: W, charSpacing: 1, valign: "middle" });
    d.line(SPX + SPW, box.y + box.h / 2, RX, box.y + box.h / 2, { color: VIL, width: 1.25, endArrowType: "triangle" });
  }
  d.line(SPX + SPW, rob.y + rob.h / 2, RX, rob.y + rob.h / 2, { color: VIL, width: 1.25, beginArrowType: "triangle", endArrowType: "triangle" });

  // footer
  d.text(C.pillars.map((p) => p.toUpperCase()).join("  ·  "), { x: 0.55, y: 6.82, w: 7.5, h: 0.24, fontSize: 10, color: DIM, charSpacing: 2 });
  d.text("INTEGRATED SECURITY MANAGEMENT SYSTEM", { x: 8.2, y: 6.82, w: 4.58, h: 0.24, fontSize: 10, color: DIM, charSpacing: 2, align: "right" });
}

// ═════════════════════════════ V5 — MODULAR · Pearl-white liquid glass ═════════════════════════════
async function v5(pres) {
  const s = pres.addSlide();
  s.background = { path: path.join(ASSETS, "bg_v5.jpg") };
  s.addNotes(NOTES);
  const d = mk(pres, s);
  const INK = "1D1D1F", SUB = "6E6E73", SLATE = "3E5170", GOLD = "A8895A";
  const TONE = { twin: "5B7FA6", incident: "B0705E", health: "AE7684", cop: "A8895A", workflow: "8579A8", video: "5F8FA0", network: "6E9484", robotics: "5B7FA6", pdm: "9C8462", vision: "5F8FA0" };
  const soft = (blur = 26, offset = 8, opacity = 0.16) => ({ type: "outer", color: "6F7C93", blur, offset, angle: 90, opacity });
  const glass = (o) => d.rect(Object.assign({ r: 0.22, fill: { color: SENT.v5glass }, line: { color: SENT.v5edge, width: 1.25 }, shadow: soft() }, o));
  const orb = async (name, tone, x, y, size, weight = "Regular") => {
    d.ellipse({ x, y, w: size, h: size, fill: { color: "FFFFFF" }, line: { color: "FFFFFF", width: 1 }, shadow: soft(8, 2, 0.2) });
    const g = size * 0.56;
    await d.icon(name, weight, tone, x + (size - g) / 2, y + (size - g) / 2, g);
  };

  // header
  d.text([
    { text: "T5 ISMS Sitewide", options: { bold: true, color: INK } },
    { text: "  ·  Product Architecture", options: { color: SUB } },
  ], { x: 0.55, y: 0.48, w: 6, h: 0.28, fontSize: 14 });
  d.text(C.pillars.join("  ·  "), { x: 6.8, y: 0.5, w: 5.98, h: 0.26, fontSize: 11, color: SUB, align: "right" });
  d.text([
    { text: "One platform. Every site. ", options: { color: INK } },
    { text: "Ready for autonomy.", options: { color: SENT.v5head } },
  ], { x: 0.55, y: 0.82, w: 12.23, h: 0.62, fontSize: 32, bold: true, charSpacing: -0.5 });
  d.text(C.sub, { x: 0.55, y: 1.45, w: 12.23, h: 0.32, fontSize: 14, color: SUB });

  // grid — same modular layout as V2
  const gp = 0.15, R1 = { y: 2.0, h: 2.2 }, R2 = { y: 4.35, h: 0.5 }, R3 = { y: 5.0, h: 1.95 };
  const RX = 9.78, RW = 3.0;

  const P = { x: 0.55, w: 5.5 };
  glass({ x: P.x, y: R1.y, w: P.w, h: R1.h });
  d.text(C.platform.name, { x: P.x + 0.25, y: R1.y + 0.18, w: 4.5, h: 0.36, fontSize: 20, bold: true, color: INK });
  d.text(C.platform.caption, { x: P.x + 0.25, y: R1.y + 0.52, w: 4.5, h: 0.26, fontSize: 12, color: SUB });
  const cols = [["incident", "cop", "health"], ["twin", "workflow"]];
  const colX = [P.x + 0.25, P.x + 3.0];
  for (let c = 0; c < 2; c++) {
    for (let r = 0; r < cols[c].length; r++) {
      const k = cols[c][r], y = R1.y + 0.94 + r * 0.38;
      await orb(M[k].icon, TONE[k], colX[c], y, 0.32);
      d.text(M[k].label, { x: colX[c] + 0.44, y: y - 0.03, w: c === 0 ? 2.25 : 2.0, h: 0.38, fontSize: 11.5, color: INK, valign: "middle" });
    }
  }

  const V = { x: P.x + P.w + gp, w: 1.7 };
  glass({ x: V.x, y: R1.y, w: V.w, h: R1.h });
  await orb(C.video.icon, TONE.video, V.x + 0.22, R1.y + 0.22, 0.5);
  d.text("Video\nAnalytics", { x: V.x + 0.22, y: R1.y + 0.9, w: V.w - 0.35, h: 0.56, fontSize: 15, bold: true, color: INK });
  d.text(C.video.sub, { x: V.x + 0.22, y: R1.y + 1.5, w: V.w - 0.35, h: 0.56, fontSize: 11, color: SUB });

  const A = { x: V.x + V.w + gp, w: 9.63 - (V.x + V.w + gp) };
  d.rect({ x: A.x, y: R1.y, w: A.w, h: R1.h, r: 0.22, fill: { color: SENT.v5ai }, line: { color: "FFFFFF", width: 1.5 }, shadow: soft(28, 8, 0.2) });
  await d.icon("Sparkle", "Fill", GOLD, A.x + 0.22, R1.y + 0.22, 0.4);
  d.text(C.ai.name, { x: A.x + 0.22, y: R1.y + 0.92, w: A.w - 0.3, h: 0.66, fontSize: 40, bold: true, color: INK, charSpacing: -0.5 });
  d.text(C.ai.sub, { x: A.x + 0.22, y: R1.y + 1.62, w: A.w - 0.3, h: 0.3, fontSize: 12.5, bold: true, color: SLATE });

  glass({ x: 0.55, y: R2.y, w: 9.08, h: R2.h, r: 0.18 });
  await orb(C.network.icon, TONE.network, 0.72, R2.y + 0.08, 0.34);
  d.text(C.network.name, { x: 1.2, y: R2.y, w: 5, h: R2.h, fontSize: 14, bold: true, color: INK, valign: "middle" });
  d.text("Secures every site connection", { x: 5.4, y: R2.y, w: 4.03, h: R2.h, fontSize: 11, color: SUB, valign: "middle", align: "right" });

  const cw = (9.08 - 3 * gp) / 4, ch = (R3.h - gp) / 2;
  d.text("Connected sites", { x: 0.6, y: R3.y + 0.12, w: cw - 0.1, h: 0.34, fontSize: 17, bold: true, color: INK });
  d.text("T5 and beyond, on one platform.", { x: 0.6, y: R3.y + 0.46, w: cw - 0.2, h: 0.4, fontSize: 11, color: SUB });
  for (let i = 0; i < 7; i++) {
    const slot = i + 1, col = slot % 4, row = Math.floor(slot / 4);
    const x = 0.55 + col * (cw + gp), y = R3.y + row * (ch + gp), st = C.sites[i];
    if (st.future) d.rect({ x, y, w: cw, h: ch, r: 0.22, fill: { color: "FFFFFF", transparency: 70 }, line: { color: "A3AAB6", width: 1, dashType: "dash" } });
    else glass({ x, y, w: cw, h: ch });
    await orb(st.icon, st.future ? GOLD : SLATE, x + 0.18, y + 0.2, 0.48);
    d.text(st.code, { x: x + 0.8, y: y + 0.13, w: cw - 0.9, h: 0.3, fontSize: 14, bold: true, color: INK });
    d.text(st.desc, { x: x + 0.8, y: y + 0.43, w: cw - 0.9, h: 0.4, fontSize: 10.5, color: SUB });
  }

  // orchestration — champagne-gold edge
  d.rect({ x: RX, y: R1.y, w: RW, h: R1.h, r: 0.22, fill: { color: SENT.v5glass }, line: { color: SENT.v5gold, width: 1.75 }, shadow: soft() });
  await orb(C.orch.icon, GOLD, RX + 0.34, R1.y + 0.22, 0.5);
  d.text(C.orch.name, { x: RX + 0.34, y: R1.y + 0.88, w: RW - 0.45, h: 0.36, fontSize: 17, bold: true, color: INK });
  const chips = [[["API", 0.62], ["SDK", 0.64], ["DIO", 0.62]], [["Industry Standards", 1.72]]];
  for (let r = 0; r < 2; r++) {
    let cx = RX + 0.34;
    for (const [t, w] of chips[r]) {
      d.rect({ x: cx, y: R1.y + 1.36 + r * 0.42, w, h: 0.32, r: 0.16, fill: { color: "FFFFFF", transparency: 15 }, line: { color: "E1E4EA", width: 0.75 } });
      d.text(t, { x: cx, y: R1.y + 1.36 + r * 0.42, w, h: 0.32, fontSize: 11, color: INK, align: "center", valign: "middle" });
      cx += w + 0.1;
    }
  }

  const rob = { y: R2.y, h: 1.4 };
  glass({ x: RX, y: rob.y, w: RW, h: rob.h });
  await orb(C.robotics.icon, TONE.robotics, RX + 0.22, rob.y + 0.2, 0.38);
  d.text(C.robotics.name, { x: RX + 0.72, y: rob.y + 0.2, w: RW - 0.85, h: 0.38, fontSize: 13.5, bold: true, color: INK, valign: "middle" });
  for (let i = 0; i < 2; i++) {
    const it = C.robotics.items[i], iy = rob.y + 0.72 + i * 0.32;
    await d.icon(it.icon, "Regular", TONE.robotics, RX + 0.29, iy + 0.03, 0.24);
    d.text(it.t, { x: RX + 0.72, y: iy, w: RW - 0.85, h: 0.3, fontSize: 11.5, color: INK, valign: "middle" });
  }
  for (const [item, tone, y] of [[C.pdm, TONE.pdm, 5.9], [C.vision, TONE.vision, 6.5]]) {
    glass({ x: RX, y, w: RW, h: 0.45, r: 0.18 });
    await orb(item.icon, tone, RX + 0.19, y + 0.065, 0.32);
    d.text(item.name, { x: RX + 0.64, y, w: RW - 0.8, h: 0.45, fontSize: 13, bold: true, color: INK, valign: "middle" });
  }

  const badge = async (cx, cy, glyph) => {
    d.ellipse({ x: cx - 0.21, y: cy - 0.21, w: 0.42, h: 0.42, fill: { color: "FFFFFF" }, line: { color: "E3E6EC", width: 0.75 }, shadow: soft(10, 3, 0.25) });
    await d.icon(glyph, "Bold", SLATE, cx - 0.11, cy - 0.11, 0.22);
  };
  await badge((9.63 + RX) / 2, R1.y + R1.h / 2, "ArrowsLeftRight");
  await badge(RX + RW - 0.5, (R1.y + R1.h + rob.y) / 2, "ArrowsDownUp");
}

// ═════════════════════════════ V6 — FLOW (V3 layout) · Dark liquid glass, Palantir-style ═════════════════════════════
async function v6(pres) {
  const s = pres.addSlide();
  s.background = { path: path.join(ASSETS, "bg_v6.jpg") };
  s.addNotes(NOTES);
  const d = mk(pres, s);
  const INK = "F3F4F6", SUB = "9AA0AA", DIM = "6B717C", ICE = "9CC3F0", ICE2 = "C9DCF2";
  const deep = () => ({ type: "outer", color: "000000", blur: 30, offset: 8, angle: 90, opacity: 0.6 });
  const glass = (o) => d.rect(Object.assign({ r: 0.12, fill: { color: SENT.v6glass }, line: { color: SENT.v6edge, width: 1 }, shadow: deep() }, o));
  const lite = (o) => d.rect(Object.assign({ r: 0.06, fill: { color: SENT.v6lite }, line: { color: "FFFFFF", width: 0.75, transparency: 86 } }, o));

  // header
  d.rect({ x: 0.55, y: 0.495, w: 0.08, h: 0.08, fill: { color: ICE }, line: { type: "none" } });
  d.text([
    { text: "T5 ISMS SITEWIDE", options: { bold: true, color: INK } },
    { text: "   /   PRODUCT ARCHITECTURE", options: { color: SUB } },
  ], { x: 0.75, y: 0.42, w: 8, h: 0.24, fontSize: 10, charSpacing: 3 });
  d.text("01°21′N   103°59′E", { x: 9.3, y: 0.42, w: 3.48, h: 0.24, fontSize: 10, color: DIM, charSpacing: 3, align: "right" });
  d.text([
    { text: "One platform. Every site. ", options: { color: INK } },
    { text: "Ready for autonomy.", options: { color: "7F8590" } },
  ], { x: 0.55, y: 0.7, w: 12.23, h: 0.54, fontSize: 30, bold: true, charSpacing: -0.3 });
  d.text(C.sub, { x: 0.55, y: 1.25, w: 11, h: 0.28, fontSize: 12, color: SUB });

  // columns — same flow layout as V3
  const C1 = { x: 0.55, w: 2.35 }, C2 = { x: 3.1, w: 0.5 }, C3 = { x: 3.85, w: 4.2 }, C4 = { x: 8.35, w: 1.95 }, C5 = { x: 10.5, w: 2.28 };
  const TOP = 2.2, BOT = 6.75;
  const steps = [["01", "CONNECT", C1], ["02", "SECURE", C2], ["03", "UNIFY", C3], ["04", "ORCHESTRATE", C4], ["05", "AUTOMATE", C5]];
  d.line(0.55, 2.0, 12.78, 2.0, { color: "FFFFFF", width: 0.75, transparency: 82 });
  for (const [n, t, col] of steps) {
    const cx = col.x + col.w / 2;
    d.text([{ text: n + "  ", options: { color: ICE } }, { text: t, options: { color: SUB } }],
      { x: cx - 1.1, y: 1.68, w: 2.2, h: 0.24, fontSize: 10, bold: true, charSpacing: 3, align: "center" });
    d.rect({ x: cx - 0.04, y: 1.96, w: 0.08, h: 0.08, fill: { color: ICE }, line: { type: "none" } });
  }

  // 01 sites
  const ph = (BOT - TOP - 6 * 0.08) / 7;
  for (let i = 0; i < 7; i++) {
    const st = C.sites[i], y = TOP + i * (ph + 0.08);
    if (st.future) lite({ x: C1.x, y, w: C1.w, h: ph, r: 0.1, line: { color: ICE, width: 0.75, dashType: "dash", transparency: 30 } });
    else glass({ x: C1.x, y, w: C1.w, h: ph, r: 0.1 });
    await d.icon(st.icon, "Light", st.future ? ICE : INK, C1.x + 0.14, y + (ph - 0.3) / 2, 0.3);
    d.text(st.code.toUpperCase(), { x: C1.x + 0.56, y: y + 0.07, w: C1.w - 0.62, h: 0.22, fontSize: 10.5, bold: true, color: INK, charSpacing: 1 });
    d.text(st.desc, { x: C1.x + 0.56, y: y + 0.3, w: C1.w - 0.6, h: 0.22, fontSize: 10, color: SUB });
    d.line(C1.x + C1.w, y + ph / 2, C2.x, y + ph / 2, { color: ICE, width: 0.75, transparency: 55 });
  }

  // 02 network & cyber
  glass({ x: C2.x, y: TOP, w: C2.w, h: BOT - TOP, r: 0.1, line: { color: ICE, width: 1 }, shadow: glow(ICE, 12, 0.35) });
  await d.icon(C.network.icon, "Light", INK, C2.x + 0.07, TOP + 0.1, 0.36);
  const nby = (TOP + 0.55 + BOT) / 2, nbl = BOT - TOP - 0.75;
  d.text(C.network.name.toUpperCase(), { x: C2.x + C2.w / 2 - nbl / 2, y: nby - 0.2, w: nbl, h: 0.4, rotate: 270, fontSize: 10.5, bold: true, color: INK, charSpacing: 2.5, align: "center", valign: "middle" });
  for (const y of [2.75, 4.47, 6.2]) d.line(C2.x + C2.w, y, C3.x, y, { color: ICE, width: 0.75, transparency: 45 });

  // 03 platform
  glass({ x: C3.x, y: TOP, w: C3.w, h: BOT - TOP, r: 0.14 });
  await d.icon("Stack", "Light", ICE, C3.x + 0.2, TOP + 0.15, 0.36);
  d.text(C.platform.name.toUpperCase(), { x: C3.x + 0.68, y: TOP + 0.13, w: 3.3, h: 0.24, fontSize: 13, bold: true, color: INK, charSpacing: 2 });
  d.text(C.platform.caption, { x: C3.x + 0.68, y: TOP + 0.4, w: 3.3, h: 0.22, fontSize: 10, color: SUB });
  const LX = C3.x + 0.2, LW = 2.15, pitch = 0.7375;
  for (let i = 0; i < 5; i++) {
    const m = M[MOD_ORDER[i]], y = 3.0 + i * pitch;
    lite({ x: LX, y, w: LW, h: 0.6 });
    d.ellipse({ x: LX + 0.1, y: y + 0.1, w: 0.4, h: 0.4, fill: { color: "FFFFFF", transparency: 94 }, line: { color: "FFFFFF", width: 0.75, transparency: 70 } });
    await d.icon(m.icon, "Light", INK, LX + 0.19, y + 0.19, 0.22);
    d.text(m.label, { x: LX + 0.62, y, w: LW - 0.68, h: 0.6, fontSize: 10.5, color: INK, valign: "middle" });
  }
  const RXc = C3.x + 2.5, RWc = 1.5;
  const ai = { y: 3.0, h: 1.6 }, vid = { y: 4.75, h: 1.8 };
  d.rect({ x: RXc, y: ai.y, w: RWc, h: ai.h, r: 0.08, fill: { color: SENT.v6glassHi }, line: { color: ICE, width: 1.25 }, shadow: glow(ICE, 18, 0.5) });
  await d.icon(C.ai.icon, "Light", ICE2, RXc + 0.15, ai.y + 0.14, 0.38);
  d.text(C.ai.name, { x: RXc + 0.15, y: ai.y + 0.58, w: RWc - 0.25, h: 0.45, fontSize: 24, bold: true, color: INK });
  d.text(C.ai.sub, { x: RXc + 0.15, y: ai.y + 1.08, w: RWc - 0.25, h: 0.3, fontSize: 10.5, bold: true, color: ICE2 });
  lite({ x: RXc, y: vid.y, w: RWc, h: vid.h, r: 0.08 });
  await d.icon(C.video.icon, "Light", INK, RXc + 0.15, vid.y + 0.14, 0.38);
  d.text("VIDEO\nANALYTICS", { x: RXc + 0.15, y: vid.y + 0.6, w: RWc - 0.25, h: 0.42, fontSize: 11, bold: true, color: INK, charSpacing: 1 });
  d.text(C.video.sub, { x: RXc + 0.15, y: vid.y + 1.06, w: RWc - 0.25, h: 0.6, fontSize: 10, color: SUB });

  // 04 orchestration hub
  const hx = C4.x + C4.w / 2, hy = ai.y + ai.h / 2;
  d.text("ORCHESTRATION\nLAYER", { x: C4.x - 0.1, y: TOP + 0.02, w: C4.w + 0.2, h: 0.46, fontSize: 11, bold: true, color: INK, charSpacing: 2, align: "center" });
  d.ellipse({ x: hx - 0.85, y: hy - 0.85, w: 1.7, h: 1.7, fill: { color: "000000", transparency: 100 }, line: { color: "FFFFFF", width: 0.75, dashType: "sysDot", transparency: 50 } });
  d.ellipse({ x: hx - 0.68, y: hy - 0.68, w: 1.36, h: 1.36, fill: { color: SENT.v6core }, line: { color: ICE, width: 1.5 }, shadow: glow(ICE, 22, 0.55) });
  await d.icon(C.orch.icon, "Light", INK, hx - 0.3, hy - 0.3, 0.6);
  d.line(RXc + RWc, hy, hx - 0.85, hy, { color: ICE, width: 1.25, beginArrowType: "triangle", endArrowType: "triangle" });
  const ifY0 = 4.95, ifP = 0.45;
  d.line(hx, hy + 0.85, hx, ifY0, { color: ICE, width: 0.75, transparency: 40 });
  for (let i = 0; i < 4; i++) {
    const it = C.orch.ifaces[i], y = ifY0 + i * ifP;
    lite({ x: C4.x + 0.05, y, w: C4.w - 0.2, h: 0.36, r: 0.18 });
    await d.icon(it.icon, "Light", ICE, C4.x + 0.19, y + 0.07, 0.22);
    d.text(it.t, { x: C4.x + 0.51, y, w: C4.w - 0.6, h: 0.36, fontSize: 10.5, color: INK, valign: "middle" });
  }

  // 05 autonomy
  const rob = { y: TOP, h: 2.05 }, pdm = { y: 4.4, h: 1.1 }, vis = { y: 5.65, h: 1.1 };
  glass({ x: C5.x, y: rob.y, w: C5.w, h: rob.h, r: 0.1 });
  await d.icon(C.robotics.icon, "Light", INK, C5.x + 0.15, rob.y + 0.15, 0.38);
  d.text("ROBOTICS &\nAUTOMATION", { x: C5.x + 0.62, y: rob.y + 0.13, w: C5.w - 0.7, h: 0.44, fontSize: 11.5, bold: true, color: INK, charSpacing: 1 });
  for (let i = 0; i < 2; i++) {
    const it = C.robotics.items[i], y = rob.y + 0.78 + i * 0.6;
    lite({ x: C5.x + 0.15, y, w: C5.w - 0.3, h: 0.5 });
    await d.icon(it.icon, "Light", ICE, C5.x + 0.25, y + 0.11, 0.28);
    d.text(it.t, { x: C5.x + 0.62, y, w: C5.w - 0.82, h: 0.5, fontSize: 10.5, color: INK, valign: "middle" });
  }
  for (const [box, item, text] of [[pdm, C.pdm, "PREDICTIVE\nMAINTENANCE"], [vis, C.vision, "VISION WATCH"]]) {
    glass({ x: C5.x, y: box.y, w: C5.w, h: box.h, r: 0.1 });
    await d.icon(item.icon, "Light", INK, C5.x + 0.15, box.y + box.h / 2 - 0.19, 0.38);
    d.text(text, { x: C5.x + 0.62, y: box.y, w: C5.w - 0.7, h: box.h, fontSize: 11.5, bold: true, color: INK, charSpacing: 1, valign: "middle" });
  }
  const busX = C5.x - 0.2, ys = [rob.y + rob.h / 2, pdm.y + pdm.h / 2, vis.y + vis.h / 2];
  d.line(hx + 0.85, hy, busX, hy, { color: ICE, width: 1, transparency: 25 });
  d.line(busX, ys[0], busX, ys[2], { color: ICE, width: 1, transparency: 25 });
  for (const y of ys) d.line(busX, y, C5.x, y, { color: ICE, width: 1, transparency: 25, endArrowType: "triangle" });

  // footer
  d.text(C.pillars.map((p) => p.toUpperCase()).join("  ·  "), { x: 0.55, y: 6.9, w: 7, h: 0.22, fontSize: 10, color: DIM, charSpacing: 2 });
  d.text("INTEGRATED SECURITY MANAGEMENT SYSTEM", { x: 8.2, y: 6.9, w: 4.58, h: 0.22, fontSize: 10, color: DIM, charSpacing: 2, align: "right" });
}

// ───────────────────────────── output ─────────────────────────────
const THEMES = {
  v1: { name: "T5 ISMS Orbital", colors: { dk1: "000000", lt1: "FFFFFF", dk2: "0A0A0A", lt2: "A8A8A8", accent1: "FFFFFF", accent2: "A8A8A8", accent3: "8CB8FF", accent4: "6F6F6F", accent5: "3C3C3C", accent6: "FFF1DC", hlink: "8CB8FF", folHlink: "A8A8A8" } },
  v2: { name: "T5 ISMS Bento", colors: { dk1: "000000", lt1: "FFFFFF", dk2: "1C1C1E", lt2: "98989D", accent1: "0A84FF", accent2: "BF5AF2", accent3: "FF375F", accent4: "FF9F0A", accent5: "30D158", accent6: "64D2FF", hlink: "0A84FF", folHlink: "BF5AF2" } },
  v3: { name: "T5 ISMS Command", colors: { dk1: "02050C", lt1: "FFFFFF", dk2: "081426", lt2: "8FA3BF", accent1: "00E5FF", accent2: "8B5CF6", accent3: "FF3DCB", accent4: "1D6BFF", accent5: "B9A2FF", accent6: "5E7896", hlink: "00E5FF", folHlink: "8B5CF6" } },
  v5: { name: "T5 ISMS Pearl", colors: { dk1: "1D1D1F", lt1: "FFFFFF", dk2: "3E5170", lt2: "F4F3F0", accent1: "5B7FA6", accent2: "A8895A", accent3: "6E9484", accent4: "AE7684", accent5: "8579A8", accent6: "5F8FA0", hlink: "3E5170", folHlink: "8579A8" } },
  v6: { name: "T5 ISMS Graphite", colors: { dk1: "08090C", lt1: "F3F4F6", dk2: "171C25", lt2: "9AA0AA", accent1: "9CC3F0", accent2: "C9DCF2", accent3: "6B717C", accent4: "7F8590", accent5: "3A4250", accent6: "D6E4F5", hlink: "9CC3F0", folHlink: "C9DCF2" } },
};
THEMES.v4 = { name: "T5 ISMS Command Stack", colors: THEMES.v3.colors };
const FILES = {
  v1: "T5-ISMS_Architecture_V1_Layered_SpaceX.pptx",
  v2: "T5-ISMS_Architecture_V2_Modular_Apple.pptx",
  v3: "T5-ISMS_Architecture_V3_Flow_Neon.pptx",
  v4: "T5-ISMS_Architecture_V4_Layered_Neon.pptx",
  v5: "T5-ISMS_Architecture_V5_PearlGlass_Light.pptx",
  v6: "T5-ISMS_Architecture_V6_DarkGlass_Palantir.pptx",
};
const REVIEW_DECKS = [
  { file: "T5-ISMS_Architecture_All-3-Versions.pptx", keys: ["v1", "v2", "v3"], title: "round 1" },
  { file: "T5-ISMS_Architecture_Round2_All-3-Versions.pptx", keys: ["v4", "v5", "v6"], title: "round 2" },
];
const BUILDERS = { v1, v2, v3, v4, v5, v6 };

function newPres(title) {
  const pres = new pptxgen();
  pres.layout = "LAYOUT_WIDE";
  pres.theme = { headFontFace: "Arial", bodyFontFace: "Arial" };
  pres.title = title;
  pres.subject = "T5 ISMS Sitewide product architecture";
  return pres;
}

async function write(pres, file, theme) {
  const f = path.join(OUT, file);
  await pres.writeFile({ fileName: f });
  await postProcess(f);
  await applyTheme(f, theme);
  console.log("wrote", f);
}

(async () => {
  for (const k of Object.keys(BUILDERS)) {
    const pres = newPres(`T5 ISMS Sitewide — Product Architecture (${k.toUpperCase()})`);
    await BUILDERS[k](pres);
    await write(pres, FILES[k], THEMES[k]);
  }
  for (const deck of REVIEW_DECKS) {
    const pres = newPres(`T5 ISMS Sitewide — Product Architecture (${deck.title}: 3 versions)`);
    for (const k of deck.keys) await BUILDERS[k](pres);
    await write(pres, deck.file, THEMES[deck.keys[0]]);
  }
})().catch((e) => { console.error(e); process.exit(1); });
