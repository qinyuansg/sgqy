/* AGIL® Secure FastPass — site interactions.
   Vanilla JS, no dependencies. All "live" data is simulated specimen data. */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, attrs, html) {
    var n = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function hhmmss(d) { return pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  var ICONS = {
    ble: '<svg viewBox="0 0 24 24"><path d="M7 7l10 10-5 5V2l5 5L7 17"/></svg>',
    command: '<svg viewBox="0 0 24 24"><rect x="2.5" y="4" width="19" height="13" rx="2"/><path d="M8 21h8M12 17v4M6 13l3-3 3 2 5-5"/></svg>',
    check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  /* =========================================================
     Mobile nav
     ========================================================= */
  var navToggle = $("#nav-toggle");
  var nav = $("#site-nav");
  function setNav(open) {
    nav.classList.toggle("open", open);
    navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  navToggle.addEventListener("click", function () { setNav(!nav.classList.contains("open")); });
  $all("a", nav).forEach(function (a) { a.addEventListener("click", function () { setNav(false); }); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") setNav(false); });

  /* Highlight the nav link of the section in view (none while in the hero) */
  var spyLinks = $all('.site-nav a[href^="#"]:not(.btn)');
  var spySections = spyLinks.map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); });
  var spyQueued = false;
  function updateSpy() {
    spyQueued = false;
    var mid = window.innerHeight * 0.45, active = -1;
    spySections.forEach(function (sec, i) {
      if (!sec) return;
      var r = sec.getBoundingClientRect();
      if (r.top <= mid && r.bottom > mid) active = i;
    });
    spyLinks.forEach(function (a, i) { a.classList.toggle("active", i === active); });
  }
  window.addEventListener("scroll", function () {
    if (!spyQueued) { spyQueued = true; requestAnimationFrame(updateSpy); }
  }, { passive: true });
  window.addEventListener("resize", updateSpy);
  updateSpy();

  /* Reveal on scroll (added by JS so the page is fully visible without it) */
  if ("IntersectionObserver" in window && !reduceMotion) {
    var revealer = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); revealer.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    $all(".stats, .problems, .products, .features, .audiences, .loop, .market-grid, .timeline, .tiers").forEach(function (n) {
      n.classList.add("reveal");
      revealer.observe(n);
    });
  }

  /* =========================================================
     Journey explorer
     ========================================================= */
  var STEPS = [
    { phase: "Verified identity", name: "FastPass Mobile App", short: "Enrol once",
      text: "Passport scan and selfie, once. Encrypted on the phone.",
      sub: "Traveller enrolment and digital identity. The credential stays on the traveller's device.",
      img: "assets/app-enrolment.jpg", alt: "FastPass Mobile App enrolment screens with specimen data",
      x: 6.2, y: 63 },
    { phase: "Approach", name: "BLE lane pairing", short: "Pair on approach",
      text: "The lane's BLE beacon pairs with the phone on approach.",
      sub: "No tapping, no scanning: the phone presents the credential as the traveller walks up.",
      icon: "ble", x: 18.4, y: 47 },
    { phase: "Walk through", name: "FastPass Biometric E-Gate", short: "Verify on the move",
      text: "Face matched on the move. Status TV shows “Cleared”.",
      sub: "On-the-move immigration clearance for eligible travellers. Officers can step in when policy requires.",
      img: "assets/biometric-egate.jpg", alt: "FastPass Biometric E-Gate", x: 31.5, y: 31 },
    { phase: "Pre-boarding", name: "FastPass Nova Plus Reader", short: "Confirm identity",
      text: "The Nova Plus reader confirms identity before X-ray.",
      sub: "A pre-screening profile check, without showing documents again.",
      img: "assets/nova-plus-reader.jpg", alt: "FastPass Nova Plus Reader", x: 53.5, y: 37 },
    { phase: "Automated boarding", name: "FastPass Smart Boarding Kiosk", short: "Board contactlessly",
      text: "Face plus phone clears boarding. No documents to show.",
      sub: "Automated facial-recognition boarding at the gate.",
      img: "assets/boarding-kiosk.jpg", alt: "FastPass Smart Boarding Kiosk", x: 77.5, y: 61 },
    { phase: "Oversee", name: "Unified Command & Control", short: "One view",
      text: "Every step in one view. Officers act only on exceptions.",
      sub: "AGIL® Secure Platform (ISMP): live lane status, clearance and exceptions.",
      icon: "command", x: 38.6, y: 69 }
  ];

  var tabsBox = $(".journey-tabs");
  var map = $("#journey-map");
  var detail = $("#journey-detail");
  var current = 0;
  var playTimer = null;

  STEPS.forEach(function (s, i) {
    var tab = el("button", {
      class: "journey-tab", role: "tab", id: "jtab-" + i,
      "aria-selected": "false", "aria-controls": "journey-detail", tabindex: "-1"
    }, '<span class="num">' + (i + 1) + "</span>" + esc(s.phase));
    tab.addEventListener("click", function () { stopPlay(); showStep(i, true); });
    tabsBox.appendChild(tab);

    var hs = el("button", {
      class: "hotspot", style: "left:" + s.x + "%;top:" + s.y + "%",
      "aria-label": "Step " + (i + 1) + ": " + s.name
    }, String(i + 1));
    hs.addEventListener("click", function () { stopPlay(); showStep(i, true); });
    map.appendChild(hs);
  });
  detail.setAttribute("role", "tabpanel");

  /* Arrow-key navigation between tabs */
  tabsBox.addEventListener("keydown", function (e) {
    var next = null;
    if (e.key === "ArrowRight") next = (current + 1) % STEPS.length;
    else if (e.key === "ArrowLeft") next = (current - 1 + STEPS.length) % STEPS.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = STEPS.length - 1;
    if (next !== null) { e.preventDefault(); stopPlay(); showStep(next, true); $("#jtab-" + next).focus(); }
  });

  function showStep(i, scrollTab) {
    current = i;
    var s = STEPS[i];
    $all(".journey-tab", tabsBox).forEach(function (t, k) {
      var on = k === i;
      t.setAttribute("aria-selected", on ? "true" : "false");
      t.setAttribute("tabindex", on ? "0" : "-1");
      if (on && scrollTab && t.scrollIntoView) {
        var box = tabsBox.getBoundingClientRect(), r = t.getBoundingClientRect();
        if (r.left < box.left || r.right > box.right) tabsBox.scrollLeft += r.left - box.left - 8;
      }
    });
    $all(".hotspot", map).forEach(function (h, k) { h.classList.toggle("active", k === i); });
    detail.setAttribute("aria-labelledby", "jtab-" + i);

    var media = s.img
      ? '<img src="' + s.img + '" alt="' + esc(s.alt) + '" width="981" height="550" />'
      : '<div class="placeholder-ill" aria-hidden="true">' + ICONS[s.icon] + "</div>";
    detail.innerHTML = media +
      '<div><p class="jd-step">Step ' + (i + 1) + " of " + STEPS.length + " · " + esc(s.phase) + "</p>" +
      "<h3>" + esc(s.name) + "</h3><p>" + esc(s.text) + '</p><p class="jd-sub">' + esc(s.sub) + "</p></div>";
    detail.classList.remove("swap");
    void detail.offsetWidth; // restart animation
    detail.classList.add("swap");
  }

  var playBtn = $("#journey-play");
  function stopPlay() {
    if (playTimer) { clearInterval(playTimer); playTimer = null; }
    playBtn.setAttribute("aria-pressed", "false");
    playBtn.textContent = "▶ Play the journey";
  }
  function startPlay() {
    showStep(0, true);
    playBtn.setAttribute("aria-pressed", "true");
    playBtn.textContent = "❚❚ Pause";
    playTimer = setInterval(function () {
      if (current >= STEPS.length - 1) { stopPlay(); return; }
      showStep(current + 1, true);
    }, 3200);
  }
  playBtn.addEventListener("click", function () { playTimer ? stopPlay() : startPlay(); });
  $("#journey-prev").addEventListener("click", function () { stopPlay(); showStep((current - 1 + STEPS.length) % STEPS.length, true); });
  $("#journey-next").addEventListener("click", function () { stopPlay(); showStep((current + 1) % STEPS.length, true); });
  showStep(0, false);

  /* =========================================================
     Traveller app simulator
     ========================================================= */
  var screen = $("#phone-screen");
  var stepsList = $("#demo-steps");
  var backBtn = $("#demo-back");
  var nextBtn = $("#demo-next");
  var demoIdx = 0;
  var demoTimers = [];

  var TRAVELLER = { name: "SPECIMEN, TRAVELLER", short: "SPECIMEN T.", doc: "••••0412", nat: "UTOPIAN (SPECIMEN)",
                    flight: "FP 412", gate: "B12", seat: "32A", from: "SIN", to: "DXB", boarding: "14:25" };

  function later(fn, ms) { demoTimers.push(setTimeout(fn, reduceMotion ? 0 : ms)); }
  function clearDemoTimers() { demoTimers.forEach(clearTimeout); demoTimers = []; }

  var SCREENS = [
    { label: "Open the app", render: function () {
      return '<div class="scr"><div class="grow"><div><div class="logo-big">' + ICONS.check + '</div>' +
        '<p class="scr-top">AGIL® Secure</p><h3>FastPass</h3>' +
        '<p>One verified identity, from kerb to gate.</p></div></div>' +
        '<button class="btn cta" data-next>Get started</button>' +
        '<p class="cta-hint">Enrol once at home · takes about a minute</p></div>';
    } },
    { label: "Scan your passport", render: function () {
      return '<div class="scr"><p class="scr-top">Step 1 · Verified identity</p><h3>Scan your passport</h3>' +
        '<p>Hold the photo page inside the frame.</p>' +
        '<div class="grow"><div class="passport"><div class="pp-photo"></div><div class="pp-line" style="width:55%"></div>' +
        '<div class="pp-line" style="width:70%"></div><div class="pp-line" style="width:40%"></div>' +
        '<div class="pp-mrz">P&lt;UTOSPECIMEN&lt;&lt;TRAVELLER&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;<br>X0000412&lt;0UTO0001019F3001012&lt;&lt;&lt;&lt;&lt;&lt;</div>' +
        '<div class="scanline" id="scanline"></div></div></div>' +
        '<p id="scan-status" role="status">Reading document…</p>' +
        '<button class="btn cta" data-next disabled>Continue</button></div>';
    }, after: function () {
      later(function () {
        var sl = $("#scanline"); if (sl) sl.remove();
        $("#scan-status").innerHTML = '<span class="chip-ok">✓ Passport read · ' + TRAVELLER.doc + "</span>";
        enableCta();
      }, 2000);
    } },
    { label: "Take a live selfie", render: function () {
      return '<div class="scr"><p class="scr-top">Step 1 · Verified identity</p><h3>Position your face in the oval</h3>' +
        '<p>Demo only — the camera is not used.</p>' +
        '<div class="grow"><div class="face-ring"><div class="oval"></div><div class="oval prog"></div>' +
        '<svg viewBox="0 0 100 120" aria-hidden="true"><ellipse cx="50" cy="52" rx="28" ry="36"/><path d="M38 46h4M58 46h4M44 72q6 5 12 0M50 52v10"/><path d="M14 120q4-26 36-26t36 26"/></svg></div></div>' +
        '<p id="face-status" role="status">Checking liveness…</p>' +
        '<button class="btn cta" data-next disabled>Continue</button></div>';
    }, after: function () {
      later(function () {
        $("#face-status").innerHTML = '<span class="chip-ok">✓ Liveness confirmed · face matched to passport</span>';
        enableCta();
      }, 2300);
    } },
    { label: "Your credential is ready", render: function () {
      return '<div class="scr"><p class="scr-top">Enrolment complete</p><h3>Your FastPass is ready</h3>' +
        '<div class="grow"><div class="cred"><div class="cred-top"><span>AGIL® SECURE FASTPASS</span><span>VERIFIED</span></div>' +
        '<p class="cred-name">' + TRAVELLER.name + '</p>' +
        '<div class="cred-row"><span>Document</span><b>' + TRAVELLER.doc + '</b></div>' +
        '<div class="cred-row"><span>Nationality</span><b>' + TRAVELLER.nat + '</b></div>' +
        '<div class="cred-row"><span>Next flight</span><b>' + TRAVELLER.flight + " · " + TRAVELLER.from + " → " + TRAVELLER.to + '</b></div>' +
        '<div class="cred-lock">🔒 Encrypted and stored on this device only</div></div></div>' +
        '<button class="btn cta" data-next>Head to the airport</button></div>';
    } },
    { label: "Approach the FastPass lane", render: function () {
      return '<div class="scr"><p class="scr-top">Step 2 · Approach</p><h3>Walk to the FastPass lane</h3>' +
        '<p>Keep your phone in your pocket.</p>' +
        '<div class="grow"><div class="ble"><span></span><span></span><span></span><div class="ble-core">' + ICONS.ble + '</div></div></div>' +
        '<p id="ble-status" role="status">Searching for lane beacon…</p>' +
        '<button class="btn cta" data-next disabled>Walk through</button></div>';
    }, after: function () {
      later(function () {
        $("#ble-status").innerHTML = '<span class="chip-ok">✓ Paired with FastPass Lane 2</span>';
        enableCta();
      }, 1900);
    } },
    { label: "Walk through the e-gate", render: function () {
      return '<div class="scr"><p class="scr-top">Step 3 · Walk through</p><h3>Cleared</h3>' +
        '<div class="grow"><div><div class="cleared-badge" style="margin:0 auto">' + ICONS.check + '</div>' +
        '<div class="status-tv">' + TRAVELLER.short + "<br>" + TRAVELLER.flight + " · " + TRAVELLER.gate + "<br><b>CLEARED</b></div></div></div>" +
        '<p>Face matched on the move. Keep walking.</p>' +
        '<button class="btn cta" data-next>Continue to security</button></div>';
    } },
    { label: "Pre-screening check", render: function () {
      return '<div class="scr"><p class="scr-top">Step 4 · Pre-boarding</p><h3>Identity confirmed</h3>' +
        '<div class="grow"><div class="cleared-badge">' + ICONS.check + '</div></div>' +
        '<p>The Nova Plus reader confirmed your profile. Proceed to the X-ray.</p>' +
        '<button class="btn cta" data-next>Go to gate ' + TRAVELLER.gate + '</button></div>';
    } },
    { label: "Board contactlessly", render: function () {
      return '<div class="scr"><p class="scr-top">Step 5 · Automated boarding</p><h3>Boarded. Have a good flight!</h3>' +
        '<div class="grow"><div class="boarding-pass">' +
        '<div class="bp-row"><div><small>FROM</small><span class="bp-big">' + TRAVELLER.from + '</span></div>' +
        '<div style="text-align:right"><small>TO</small><span class="bp-big">' + TRAVELLER.to + '</span></div></div>' +
        '<div class="bp-sep"></div>' +
        '<div class="bp-row"><div><small>FLIGHT</small><b>' + TRAVELLER.flight + '</b></div><div><small>GATE</small><b>' + TRAVELLER.gate + '</b></div>' +
        '<div><small>SEAT</small><b>' + TRAVELLER.seat + '</b></div><div><small>BOARDING</small><b>' + TRAVELLER.boarding + '</b></div></div>' +
        '<div class="bp-sep"></div><p style="color:#0a7a5c;margin:0;font-weight:700">✓ Face + phone cleared boarding</p></div></div>' +
        '<p>No documents shown, from kerb to gate.</p>' +
        '<button class="btn cta" data-restart>Start again</button></div>';
    } }
  ];

  SCREENS.forEach(function (s, i) {
    var li = el("li", { tabindex: "0", role: "button", "aria-label": "Go to demo step " + (i + 1) + ": " + s.label },
      '<span class="num">' + (i + 1) + "</span>" + esc(s.label));
    li.addEventListener("click", function () { renderDemo(i); });
    li.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); renderDemo(i); }
    });
    stepsList.appendChild(li);
  });

  function enableCta() {
    var b = $("[data-next]", screen); if (b) b.disabled = false;
    nextBtn.disabled = demoIdx >= SCREENS.length - 1;
  }

  function renderDemo(i) {
    clearDemoTimers();
    demoIdx = Math.max(0, Math.min(SCREENS.length - 1, i));
    var s = SCREENS[demoIdx];
    screen.innerHTML = s.render();
    $all("li", stepsList).forEach(function (li, k) {
      li.classList.toggle("current", k === demoIdx);
      li.classList.toggle("done", k < demoIdx);
      if (k === demoIdx) li.setAttribute("aria-current", "step"); else li.removeAttribute("aria-current");
    });
    backBtn.disabled = demoIdx === 0;
    var waiting = !!$("[data-next][disabled]", screen);
    nextBtn.disabled = waiting || demoIdx >= SCREENS.length - 1;
    if (s.after) s.after();
  }

  screen.addEventListener("click", function (e) {
    var t = e.target.closest ? e.target.closest("button") : null;
    if (!t || t.disabled) return;
    if (t.hasAttribute("data-next")) renderDemo(demoIdx + 1);
    else if (t.hasAttribute("data-restart")) renderDemo(0);
  });
  backBtn.addEventListener("click", function () { renderDemo(demoIdx - 1); });
  nextBtn.addEventListener("click", function () { renderDemo(demoIdx + 1); });
  renderDemo(0);

  /* =========================================================
     Command & control console (simulated)
     ========================================================= */
  var consoleBox = $("#console");
  var logBody = $("#log-body");
  var lanesBox = $("#lanes");
  var excBox = $("#exceptions");
  var chart = $("#flow-chart");
  var pauseBtn = $("#console-pause");
  var clockEl = $("#console-clock");

  var NAMES = ["TAN M. Y.", "LIM K. H.", "RAHMAN A.", "KUMAR S.", "NGUYEN T. L.", "AL-SAYED O.", "WONG J.", "SANTOS M.",
               "ISMAIL N.", "CHEN Y.", "PATEL R.", "HASSAN F.", "LEE S. J.", "OKAFOR C.", "MÜLLER L.", "SATO K.",
               "GARCIA P.", "ONG W. L.", "SHARMA P.", "ABDULLAH Z."];
  var POINTS = [
    { loc: "Biometric Lane 1", lane: 0 }, { loc: "Biometric Lane 2", lane: 1 },
    { loc: "Biometric Lane 3", lane: 2 }, { loc: "Biometric Lane 4", lane: 3 },
    { loc: "Pre-screen PS1" }, { loc: "Pre-screen PS2" },
    { loc: "Boarding Gate B12" }, { loc: "Boarding Gate B14" }, { loc: "Boarding Gate C3" }
  ];
  var REASONS = [
    "Face match below threshold — officer check required.",
    "Possible tailgating detected behind traveller.",
    "Credential could not be verified — document expired.",
    "Traveller requested assistance at the lane."
  ];

  var state = {
    cleared: 1180 + Math.floor(Math.random() * 120),
    times: [],
    lanes: [3, 2, 4, 1],
    exc: [],
    excSeq: 0,
    flow: [],
    tick: 0,
    paused: false,
    visible: true
  };
  for (var f = 0; f < 30; f++) state.flow.push(Math.round(32 + 10 * Math.sin(f / 4) + Math.random() * 8));

  function renderKpis() {
    $("#kpi-cleared").textContent = state.cleared.toLocaleString("en-US");
    if (state.times.length) {
      var avg = state.times.reduce(function (a, b) { return a + b; }, 0) / state.times.length;
      $("#kpi-time").textContent = avg.toFixed(1) + " s";
    }
    $("#kpi-exc").textContent = String(state.exc.length);
  }

  function renderLanes() {
    lanesBox.innerHTML = state.lanes.map(function (q, i) {
      return '<li><span class="ld' + (q >= 5 ? " busy" : "") + '"></span>FastPass Lane ' + (i + 1) +
        '<span class="lq">' + q + " in queue</span></li>";
    }).join("");
  }

  function renderExceptions() {
    if (!state.exc.length) { excBox.innerHTML = '<li class="empty">No open exceptions.</li>'; return; }
    excBox.innerHTML = state.exc.map(function (x) {
      return '<li><div class="ex-head">' + esc(x.who) + " · " + esc(x.loc) + "<span>" + x.time + "</span></div>" +
        "<p>" + esc(x.reason) + '</p><div class="ex-actions">' +
        '<button class="btn btn-small" data-ex="clear" data-id="' + x.id + '">Clear after check</button>' +
        '<button class="btn btn-ghost btn-small" data-ex="refer" data-id="' + x.id + '">Refer to officer</button></div></li>';
    }).join("");
  }

  excBox.addEventListener("click", function (e) {
    var b = e.target.closest ? e.target.closest("button[data-ex]") : null;
    if (!b) return;
    var id = Number(b.getAttribute("data-id"));
    var x = null;
    state.exc = state.exc.filter(function (it) { if (it.id === id) { x = it; return false; } return true; });
    if (!x) return;
    var cleared = b.getAttribute("data-ex") === "clear";
    if (cleared) state.cleared++;
    addRow(x.who, x.loc, cleared ? "CLEARED" : "OFFICER", cleared ? "ok" : "off");
    renderExceptions();
    renderKpis();
  });

  function addRow(who, loc, status, cls) {
    var tr = el("tr", { class: "new" },
      "<td>" + hhmmss(new Date()) + "</td><td>" + esc(who) + "</td><td>" + esc(loc) + "</td>" +
      '<td><span class="badge ' + cls + '">' + status + "</span></td>");
    logBody.insertBefore(tr, logBody.firstChild);
    while (logBody.children.length > 40) logBody.removeChild(logBody.lastChild);
  }

  function renderChart() {
    var W = 600, H = 140, max = 60, n = state.flow.length;
    var pts = state.flow.map(function (v, i) {
      return [(i / (n - 1)) * W, H - 8 - (Math.min(v, max) / max) * (H - 16)];
    });
    var line = pts.map(function (p, i) { return (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1); }).join(" ");
    var grid = "";
    for (var g = 1; g < 4; g++) { var y = (H / 4) * g; grid += '<line class="grid" x1="0" x2="' + W + '" y1="' + y + '" y2="' + y + '"/>'; }
    chart.innerHTML =
      '<defs><linearGradient id="flowGrad" x1="0" x2="0" y1="0" y2="1">' +
      '<stop offset="0%" stop-color="#22e3a6" stop-opacity=".35"/><stop offset="100%" stop-color="#22e3a6" stop-opacity="0"/></linearGradient></defs>' +
      grid + '<path class="area" d="' + line + " L" + W + " " + H + " L0 " + H + ' Z"/><path class="ln" d="' + line + '"/>';
  }

  function tick() {
    state.tick++;
    var who = pick(NAMES);
    var p = pick(POINTS);
    var isException = Math.random() < 0.07 && state.exc.length < 3;

    if (isException) {
      var x = { id: ++state.excSeq, who: who, loc: p.loc, reason: pick(REASONS), time: hhmmss(new Date()).slice(0, 5) };
      state.exc.unshift(x);
      addRow(who, p.loc, "REVIEW", "rev");
      renderExceptions();
    } else {
      state.cleared++;
      addRow(who, p.loc, "CLEARED", "ok");
      if (p.lane != null) {
        state.times.push(5.5 + Math.random() * 4);
        if (state.times.length > 50) state.times.shift();
      }
    }
    /* Queues drift a little each tick */
    state.lanes = state.lanes.map(function (q) { return Math.max(0, Math.min(7, q + pick([-1, 0, 0, 1]))); });
    renderLanes();

    /* Add a new chart point every 4 ticks */
    if (state.tick % 4 === 0) {
      var last = state.flow[state.flow.length - 1];
      state.flow.push(Math.max(12, Math.min(58, Math.round(last + (Math.random() * 12 - 6)))));
      state.flow.shift();
      renderChart();
    }
    renderKpis();
  }

  function clockTick() { clockEl.textContent = hhmmss(new Date()); }

  /* Seed the log so the console never looks empty */
  for (var s0 = 0; s0 < 8; s0++) {
    var sp = pick(POINTS);
    addRow(pick(NAMES), sp.loc, "CLEARED", "ok");
    if (sp.lane != null) state.times.push(5.5 + Math.random() * 4);
  }
  $all("tr", logBody).forEach(function (r) { r.classList.remove("new"); });
  renderKpis(); renderLanes(); renderChart(); clockTick();

  var feedTimer = null;
  function feedRunning() { return !state.paused && state.visible && !document.hidden; }
  function syncFeed() {
    if (feedRunning() && !feedTimer) feedTimer = setInterval(tick, 1700);
    if (!feedRunning() && feedTimer) { clearInterval(feedTimer); feedTimer = null; }
  }
  setInterval(clockTick, 1000);
  pauseBtn.addEventListener("click", function () {
    state.paused = !state.paused;
    pauseBtn.setAttribute("aria-pressed", state.paused ? "true" : "false");
    pauseBtn.textContent = state.paused ? "Resume feed" : "Pause feed";
    consoleBox.classList.toggle("paused", state.paused);
    syncFeed();
  });
  document.addEventListener("visibilitychange", syncFeed);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      state.visible = entries[0].isIntersecting;
      syncFeed();
    }).observe(consoleBox);
  } else {
    syncFeed();
  }

  /* =========================================================
     Today vs FastPass race
     ========================================================= */
  var race = $("#race");
  function runRace() {
    race.classList.remove("run");
    void race.offsetWidth;
    race.classList.add("run");
  }
  $("#race-replay").addEventListener("click", runRace);
  if ("IntersectionObserver" in window) {
    var raceObs = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { runRace(); raceObs.disconnect(); }
    }, { threshold: 0.5 });
    raceObs.observe(race);
  } else {
    runRace();
  }

  /* =========================================================
     Pilot request form (client-side only)
     ========================================================= */
  var form = $("#pilot-form");
  var done = $("#form-done");
  var summaryEl = $("#form-summary");
  var copyMsg = $("#copy-msg");
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setErr(id, msg) {
    var input = $("#f-" + id);
    $("#e-" + id).textContent = msg || "";
    if (msg) { input.setAttribute("aria-invalid", "true"); input.setAttribute("aria-describedby", "e-" + id); }
    else { input.removeAttribute("aria-invalid"); input.removeAttribute("aria-describedby"); }
    return !msg;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var v = {
      name: $("#f-name").value.trim(), org: $("#f-org").value.trim(), email: $("#f-email").value.trim(),
      role: $("#f-role").value, message: $("#f-msg").value.trim()
    };
    var ok = true;
    ok = setErr("name", v.name ? "" : "Please enter your name.") && ok;
    ok = setErr("org", v.org ? "" : "Please enter your organisation.") && ok;
    ok = setErr("email", !v.email ? "Please enter your work email." : EMAIL_RE.test(v.email) ? "" : "Please enter a valid email address.") && ok;
    ok = setErr("role", v.role ? "" : "Please choose an option.") && ok;
    if (!ok) { var first = $('[aria-invalid="true"]', form); if (first) first.focus(); return; }

    summaryEl.textContent =
      "FastPass pilot request\n" +
      "Name: " + v.name + "\n" +
      "Organisation: " + v.org + "\n" +
      "Email: " + v.email + "\n" +
      "Represents: " + v.role + "\n" +
      "Pilot interest: " + (v.message || "—");
    copyMsg.textContent = "";
    done.hidden = false;
    done.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "nearest" });
  });

  $all("input, select", form).forEach(function (inp) {
    inp.addEventListener("input", function () { if (inp.getAttribute("aria-invalid")) setErr(inp.id.slice(2), ""); });
  });

  $("#copy-summary").addEventListener("click", function () {
    var text = summaryEl.textContent;
    function fallback() {
      var range = document.createRange();
      range.selectNodeContents(summaryEl);
      var sel = window.getSelection();
      sel.removeAllRanges(); sel.addRange(range);
      var copied = false;
      try { copied = document.execCommand("copy"); } catch (err) { copied = false; }
      copyMsg.textContent = copied ? "Copied." : "Selected — press Ctrl/Cmd + C to copy.";
    }
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { copyMsg.textContent = "Copied."; }, fallback);
    } else {
      fallback();
    }
  });
})();
