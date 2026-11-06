# -*- coding: utf-8 -*-
"""Scene definitions for the Beijing conference CPO recap video.
Each scene: section, title, kicker (small label), html (slide body), narration (spoken text).
"""

def cards(items, cols=None, cls=""):
    cols = cols or len(items)
    out = [f'<div class="cards cols{cols} {cls}">']
    for it in items:
        head, body = it[0], it[1]
        tag = f'<div class="tag">{it[2]}</div>' if len(it) > 2 and it[2] else ''
        out.append(f'<div class="card">{tag}<h3>{head}</h3><div class="body">{body}</div></div>')
    out.append('</div>')
    return "\n".join(out)

def flow(steps, sub=None):
    out = ['<div class="flow">']
    for i, s in enumerate(steps):
        if i:
            out.append('<div class="arrow">›</div>')
        s2 = f'<div class="sub">{sub[i]}</div>' if sub else ''
        out.append(f'<div class="step"><div class="main">{s}</div>{s2}</div>')
    out.append('</div>')
    return "\n".join(out)

def ul(items, cls=""):
    return f'<ul class="{cls}">' + "".join(f'<li>{i}</li>' for i in items) + '</ul>'

def table(headers, rows, cls=""):
    h = "".join(f'<th>{x}</th>' for x in headers)
    r = "".join('<tr>' + "".join(f'<td>{c}</td>' for c in row) + '</tr>' for row in rows)
    return f'<table class="tbl {cls}"><thead><tr>{h}</tr></thead><tbody>{r}</tbody></table>'

def w5(items):
    """who/what/why/how/when/where grid; items = dict"""
    order = [("WHAT", "what"), ("WHY", "why"), ("WHO", "who"), ("WHERE", "where"), ("WHEN", "when"), ("HOW", "how")]
    out = ['<div class="w5">']
    for lab, key in order:
        out.append(f'<div class="w5c"><div class="w5l">{lab}</div><div class="w5b">{items[key]}</div></div>')
    out.append('</div>')
    return "\n".join(out)

def two(left, right, ratio="1fr 1fr"):
    return f'<div class="two" style="grid-template-columns:{ratio}"><div>{left}</div><div>{right}</div></div>'

def note(text):
    return f'<div class="note">{text}</div>'

def big(text, sub=""):
    return f'<div class="bigq">{text}</div>' + (f'<div class="bigsub">{sub}</div>' if sub else '')

SCENES = []
def S(section, title, kicker, html, narration):
    SCENES.append(dict(section=section, title=title, kicker=kicker, html=html, narration=narration))

# ------------------------------------------------------------------ PART 0: OPENING
S("Opening", "Beijing Security Conference 2026 — CPO Recap", "3–4 November 2026 · Beijing",
  f'''
  <div class="hero">
    <div class="hero-kicker">PRODUCT MANAGEMENT · FOR THE CPO AND THE C-SUITE</div>
    <div class="hero-title">From security <span class="accent">devices</span><br>to connected <span class="accent">operations</span></div>
    <div class="hero-sub">What we discovered, who uses it, who pays for it, and what it means for the product roadmap</div>
    {cards([("9 source documents","6 AI-transcribed booth and meeting recordings · 2 strategy infographics · 1 vendor datasheet"),
            ("2 days on the floor","3 Nov: glasses, compute, biometrics, digital twin, gun management · 4 Nov: AI vision, millimeter wave, vertical LLM lab"),
            ("1 operating thesis","Make every alert actionable, assigned and auditable — on the ISMP / V11 core we already own")], cls="hero-cards")}
  </div>
  ''',
  "Welcome. This is the product recap of the Beijing security conference held on the third and fourth of November 2026. "
  "It is built for the Chief Product Officer and the leadership team, and it covers every product ecosystem we discovered, "
  "who uses it, who pays for it, how the value chain works, and what it means for our roadmap. "
  "The material behind this video is nine documents: six AI-generated transcripts of booth and meeting conversations, "
  "two strategy infographics prepared after day one, and the NUCTECH millimeter-wave datasheet. "
  "One warning before we begin: the transcripts are noisy and were never checked against audio, so vendor identities, prices and performance claims "
  "are treated as signals to validate, not as facts. The thesis that runs through the whole recap is simple: "
  "our opportunity is to move from selling security devices to delivering connected operations, "
  "where every alert becomes actionable, assigned and auditable on the ISMP V11 core we already own.")

S("Opening", "How this video is organised", "Seven parts · about thirty minutes",
  cards([
    ("1 · The ecosystem map", "All products we met, categorised in layers, and the operating value chain they plug into."),
    ("2 · Four leadership-priority products", "Smart glasses, millimeter-wave body screening, facial multi-parameter AI, fence intrusion sensing — the WHAT, WHY, WHO, WHERE, WHEN and HOW of each."),
    ("3 · Connected-operations signals", "NVR-connected edge analytics, response orchestration, digital twin and IBMS, managed compute and racks, edge-AI vendors by industry."),
    ("4 · Identity and controlled assets", "Biometric capture, passport readers, gun and ammunition management."),
    ("5 · Intelligence layer know-how", "The vertical large-model paradigm, MCP agents for access control, and the strategic insights from the Peking University session."),
    ("6 · Adjacent and watchlist", "Companion robots, virtual try-on, digital humans, embodied robots."),
    ("7 · Synthesis for the CPO", "Stakeholder map, prioritisation, product model, roadmap, 90-day plan, decisions per executive, success criteria and risks."),
  ], cols=4) + note("Evidence boundary: booth discussions indicate possible capabilities, not verified production maturity. Every recommendation here is a proposal to validate."),
  "Here is how the video is organised. Part one draws the ecosystem map and the operating value chain. "
  "Part two goes deep on the four products our leadership flagged as top priority: smart glasses, millimeter-wave body screening, "
  "facial multi-parameter AI, and fence intrusion sensing. Part three covers the connected-operations signals from the security and compute booths. "
  "Part four covers identity and controlled assets. Part five distils the intelligence-layer know-how from the vertical large-model session at Peking University. "
  "Part six parks the adjacent categories on a watchlist. And part seven is the synthesis for the Chief Product Officer: "
  "stakeholders, prioritisation, product model, roadmap, the ninety-day plan, the decisions each executive must take, and the risks.")

# ------------------------------------------------------------------ PART 1: ECOSYSTEM MAP
S("1 · Ecosystem map", "The product ecosystem we discovered, in five layers", "Categorised from all six transcripts",
  '''
  <div class="layers">
    <div class="layer l5"><div class="ln">ADJACENT / WATCHLIST</div><div class="lb">Companion AI robot for the elderly · AI virtual try-on · Digital-human guides · Humanoid and embodied robots</div></div>
    <div class="layer l4"><div class="ln">INTELLIGENCE</div><div class="lb">Vertical large models (knowledge base + evaluation set + fine-tune loop) · MCP agents for command operations · Facial attribute AI (identity, age, expression, blood pressure) · Text-to-video search</div></div>
    <div class="layer l3"><div class="ln">PLATFORM &amp; ORCHESTRATION</div><div class="lb">ISMP / V11 incident core · Response plans driving drones, unmanned vehicles, watches and phones · Digital twin from design to operations · IBMS (HVAC, chillers, lighting, drainage, DDC) · SUS data backend</div></div>
    <div class="layer l2"><div class="ln">EDGE AI &amp; COMPUTE</div><div class="lb">Edge nodes pulling third-party NVR streams · Front-end compute cameras trained per industry · Heterogeneous compute (Huawei 8-card, domestic chips vs NVIDIA) · Managed racks and data-centre cabinets · Drone-dock AI boxes</div></div>
    <div class="layer l1"><div class="ln">FRONTLINE SENSING &amp; WEARABLES</div><div class="lb">Smart patrol glasses (camera and display-only) · Patrol watch · Millimeter-wave body screening · Fence force / vibration sensing · Fingerprint, palm, iris, palm-vein capture · Passport OCR + chip readers · Smart gun cabinets + UWB off-post tags</div></div>
  </div>
  ''',
  "Let us start with the map. Everything we met in Beijing fits into five layers. "
  "At the bottom is frontline sensing and wearables: smart patrol glasses with and without cameras, a patrol watch, millimeter-wave body screening, "
  "fence force and vibration sensing, biometric capture devices, passport readers, and smart gun cabinets with ultra-wideband tags. "
  "Above it is edge AI and compute: edge nodes that pull video from third-party recorders, cameras with built-in compute trained per industry, "
  "heterogeneous compute servers, and managed racks. "
  "The middle layer is platform and orchestration, which is where our own ISMP V11 lives, alongside response plans that drive drones and unmanned vehicles, "
  "digital twins, and integrated building management. "
  "The intelligence layer holds vertical large models, MCP agents, facial attribute AI, and text search over video. "
  "And at the top are adjacent categories we should watch but not pilot. "
  "Keep this map in mind: our strategic position is the platform layer, and every lower-layer product is a candidate sensor or actuator for it.")

S("1 · Ecosystem map", "Value is created in the complete operating workflow", "The value chain every product must plug into",
  flow(["Detect", "Verify", "Assign", "Resolve", "Audit"],
       ["Signal from a sensor: camera analytics, fence zone, body scanner, glasses, watch",
        "Evidence: operator reviews video, scanner marks the location, glasses show the match",
        "Accountable owner: SOP picks severity, dispatches a task to a phone, watch or drone",
        "Confirmed outcome: field officer acknowledges, captures evidence, closes",
        "Traceable record: one incident record, permissions, versioned integration contracts"]) +
  two(
    cards([("Where the booths stop", "Most vendors sell the DETECT step: a device, an algorithm, a box. Few connect it to accountability and closure. Several told us plainly that China’s market is component-driven with little system integration.")], cols=1),
    cards([("Where ST creates value", "Owning the incident record and the operating model, configuring customer workflows, and adapting to whatever sensors the customer already has — that is the repeatable product.")], cols=1)
  ),
  "The second idea to hold onto is the operating value chain. Value is not created when a sensor detects something. "
  "It is created when the detection is verified with evidence, assigned to an accountable owner, resolved with a confirmed outcome, and audited in a traceable record. "
  "Almost every booth we visited sells the detect step: a camera, an algorithm, a scanner, a box. "
  "Very few connect it to assignment and closure. In fact, vendors themselves told us that the Chinese market is component-driven, highly competitive, "
  "and weak on system integration. That is exactly the gap our platform fills. Throughout this video, when we assess a product, "
  "the question is always: where does it plug into detect, verify, assign, resolve and audit, and what does it add to the complete workflow?")

# ------------------------------------------------------------------ PART 2: FOUR PRIORITY PRODUCTS
S("2 · Priority product 01", "Smart patrol glasses — what we saw and how they work", "Rokid-class and Even Realities-class wearables · S1, S3, day-2 AI session",
  w5({
    "what": "A head-worn terminal in two flavours: <b>camera glasses</b> that stream a first-person view and run face recognition, and <b>display-only glasses</b> (no camera) that show prompts, watch-lists, a teleprompter or data on the lens.",
    "why": "Hands-free capture and prompting for people who walk: patrol officers, inspectors, guards. The demo pitch was ‘virtual guided patrol plus glasses’ and face-recognition alerts for a user’s own watch-list.",
    "who": "Public-security and traffic police needing long shifts; private security companies (‘guards need many private firms’); inspectors; remote experts who see what the wearer sees.",
    "where": "Patrol routes, checkpoints, campuses, command centres receiving the first-person feed. Civilian versions are already sold on Taobao for lifestyle vloggers.",
    "when": "Available now as demo units; vendor proposed we ‘buy one or two to test’. Battery claims ranged up to 8 hours; the controller doubles as battery pack and needs charging.",
    "how": "Bluetooth pairing to a phone or standalone Android with MDM; prescription lenses fitted per wearer; recognition can run on the glasses, the phone or the server; original image can be handed to our backend so we extract features and match ourselves.",
  }),
  "Product one: smart patrol glasses. We saw two flavours. Camera glasses stream a first-person view to a command centre and run face recognition. "
  "Display-only glasses, with no camera, show prompts, watch-lists, a teleprompter or live data on the lens, and are controlled by a single tap to confirm and a double tap to exit. "
  "The why is hands-free capture and prompting for people who walk: patrol officers, guards and inspectors. "
  "The who includes public-security and traffic police who need long shifts, private security companies, inspectors, and remote experts. "
  "The where is patrol routes, checkpoints and campuses, with the feed landing in a command centre. Civilian versions are already on Taobao for vloggers, "
  "which tells you the hardware is commoditising. The when is now: demo units exist and the vendor suggested we buy one or two to test. "
  "The how matters most for us: Bluetooth pairing to a phone or standalone Android with mobile device management, prescription lenses fitted per wearer, "
  "and, critically, the vendor can hand us the original image so that we do feature extraction and matching in our own backend and only the result flows back.")

S("2 · Priority product 01", "Smart glasses — the ST product role and what to validate first", "Partner the terminal; own the task, SOP, evidence and audit",
  flow(["Capture on site", "Targeted detection", "Human confirmation", "Task created"],
       ["First-person photo or video", "One model matched to one job: item, asset tag, meter, authorised identity", "Prompt on lens + evidence retained", "ISMP / V11 event or work order"]) +
  two(
    cards([("Commercial hypothesis", "Terminal + industry workflow licence + training and support. Compare against a phone on the same task: efficiency, adoption and total cost."),
           ("Concerns raised on the floor", "Cyber-security of pushing video to a backend; data sovereignty of face features; battery and charging in real shifts; ‘some units have no camera at all’ — know which job needs which flavour.")], cols=1),
    cards([("CTO must answer with a sample unit", "Exact model and camera; recording and streaming interfaces; where the model runs; on-prem and account dependencies; weak-network and offline behaviour; device management and data rights."),
           ("COO accepts on task results", "Task completion time, first-time completion rate, usable-image rate, weak-network success, battery under real tasks, wearing burden and frontline adoption.")], cols=1)
  ),
  "What is our role? We should not build glasses. We partner for the terminal and the base SDK, and we own the task definition, the SOP, the evidence chain and the audit, "
  "reusing the platform we already have. The product flow is: capture on site, run one targeted detection matched to one job, confirm with a human on the lens, and create a task in ISMP V11. "
  "The commercial hypothesis is terminal plus industry workflow licence plus training and support, always benchmarked against a phone doing the same job. "
  "Concerns raised on the floor were cyber-security of pushing video to a backend, sovereignty of face features, and real-shift battery life. "
  "Before any pilot, the CTO needs a sample unit to answer: which model and camera, which streaming interfaces, where the model runs, what the offline behaviour is, and who controls the data. "
  "The COO should accept only on task results: completion time, first-time completion rate, usable-image rate, and actual frontline adoption. "
  "Only if a repeatable operational gain over the phone appears do we expand.")

S("2 · Priority product 02", "Millimeter-wave body screening — the product and the field evidence", "NUCTECH MW1000AA datasheet + day-2 booth conversation",
  two(
    w5({
      "what": "Non-contact detection of items hidden in or under clothing — metallic and non-metallic weapons, IEDs, liquids, gels, drugs — with automatic threat recognition and a cartoon figure for privacy.",
      "why": "Replaces manual pat-down and the ‘stop and raise your arms’ pose. The booth claim: bind the face, walk through, result appears, officer gives pass or not-pass feedback.",
      "who": "<b>Airports pay</b> (equipment department), not airlines or immigration. Also customs, border, rail transit (‘mainly looking for big items’), prisons, government buildings, stadiums.",
      "where": "Deployed in China at Beijing, Shanghai Pudong, Xinjiang, Tianjin, Wuhan; three units in Africa (Nigeria) since last year; <b>none in Southeast Asia yet</b>.",
      "when": "Shipping now. The vendor is booking Dubai and the Amsterdam passenger-terminal expo in April; Munich is avoided because Rohde &amp; Schwarz exhibits there.",
      "how": "Active holographic imaging over a wide band; the datasheet lists 2 s scan and 4 s inspection with a brief stand; the booth unit claims continuous walking — <b>this must be proven</b>.",
    }),
    cards([("Datasheet reference (MW1000AA V2.0, 2022)", ul(["Active millimeter-wave holographic imaging, neural-network ATR", "Scan 2 s · inspection 4 s · stand with arms slightly out", "1188 × 1408 × 2498 mm · 550 kg · 1 kW · &lt;60 dB(A)", "ECAC SSc 2.1 Type A, CE certified", "Optional foot metal detector"])),
           ("Field pain points heard", ul(["Shoes with metal plates still trigger — ‘we are thinking how to handle it’", "Height: designed for Asian body types; Europe wants 2 m", "Pre-entry screening at some airports creates queues", "Buy one lane and the other lanes ask for theirs"]))], cols=1),
    "1.15fr 1fr"),
  "Product two: millimeter-wave body screening. The what is non-contact detection of items hidden in or under clothing, metallic and non-metallic, with automatic threat recognition and a privacy-preserving cartoon figure. "
  "The why is replacing pat-downs and the stop-and-raise-your-arms pose. The booth pitch was: bind the person's face, walk through, the result appears, and the officer gives pass or no-pass feedback. "
  "Who pays? The airport's equipment department, not the airlines and not immigration. Other buyers are customs, border, rail transit, prisons and government buildings. "
  "Where is it deployed? Beijing, Shanghai Pudong, Xinjiang, Tianjin and Wuhan in China, three units in Nigeria, and none yet in Southeast Asia, which is an open field for us. "
  "The when is now, and the vendor is actively going to Dubai and Amsterdam to find partners. "
  "The how is active holographic imaging. The MW1000AA datasheet lists a two-second scan and a four-second inspection with a brief stand, "
  "while the booth unit claims continuous walking. That gap is the single most important thing to verify. "
  "Field pain points we heard: metal plates in shoes still trigger alarms, European height requirements, and queues when screening is pushed to the building entrance.")

S("2 · Priority product 02", "Millimeter wave — certification gap, vendor profile and ST packaging", "The buying decision hinges on certification, not imaging quality",
  two(
    cards([("The certification problem", "The vendor holds only China civil-aviation approval at the highest national GB ‘A3’ level. No TSA or ECAC listing yet. Singapore ‘sits in the middle’: it wants the price but also the certification — ‘that is the headache’."),
           ("Vendor profile", "Millimeter-wave radar company with three lines: body screening, petrochemical tank-level radar, traffic radar. Own 65 nm chips from TSMC — expensive at low volume; testing domestic chips. Remote diagnostics and self-check at every boot; engineers fix small issues remotely."),
           ("Custom requests they will quote", "Vehicle occupant screening through a 60 × 60 cm window with a robotic arm; four-person side-by-side demo requested.")], cols=1),
    cards([("Four judgments for product and operations", ul(["<b>Detection boundary</b> — separate test lists for metallic and non-metallic items, by position, clothing and crowd", "<b>Lane efficiency</b> — real peak throughput, nuisance alarm rate, re-check ratio and manual re-check time for the whole lane", "<b>Users and deployment</b> — passenger guidance, explainable location for the officer, footprint, power, uptime, support", "<b>ST product and revenue</b> — link to identity, gates and ISMP / V11; test a ‘device + lane integration + lifecycle service’ offer"])),
           ("Gate before commercial introduction", "Site acceptance with customer-approved target items and operating flow; confirm model, applicable population, certifications, real detection and throughput — then decide scope.")], cols=1)
  ),
  "The buying decision for millimeter wave hinges on certification, not image quality. The vendor holds only the Chinese civil-aviation approval at the highest national level, "
  "with no TSA or ECAC listing. They said Singapore sits in the middle: it wants the price but also the certification, and that is the headache. "
  "The vendor itself is a radar company with three lines: body screening, tank-level radar for petrochemicals, and traffic radar, built on its own sixty-five nanometre chips, "
  "which are expensive at low volume. They offer remote diagnostics and a self-check at every boot. "
  "For us there are four judgments. Detection boundary, tested separately for metallic and non-metallic items. Lane efficiency, measured as real peak throughput, nuisance alarms and re-check time for the whole lane. "
  "Users and deployment, including passenger guidance and an explainable alarm location for the officer. And the ST product and revenue model, "
  "linking the scanner to identity, gates and ISMP V11 and testing a device plus lane integration plus lifecycle service offer. "
  "The gate before any commercial introduction is a site acceptance with customer-approved target items and the operating flow.")

S("2 · Priority product 03", "Facial multi-parameter AI — split the capability to judge the value", "Identity · Age · Expression · Blood pressure · plus day-2 attribute demos",
  table(["Capability", "Actual output / likely mechanism", "Product use and boundary", "Evidence to obtain"],
        [["Identity verification", "Face image → feature vector → match. Liveness detection is now standard on every Chinese face camera (‘not that hard’). Face + QR is the most popular combination in China.", "Align with reader and gate flows; accept on false-accept, false-reject, liveness and real-environment performance.", "Independent test set; live-environment trial at a gate."],
         ["Age estimation", "Apparent age range with error.", "Validated audience analytics only; never decide a boundary age from a single estimate.", "Error distribution across demographics (NIST-style)."],
         ["Expression analysis", "Classification of visible expression. Booth demo tagged emotion, gender, mask / no mask, glasses, hand-in-pocket, smile.", "Output is not inner emotion; do not infer danger or make rights-affecting decisions from it.", "Define the operational question first; measure against it."],
         ["Blood-pressure estimation", "Possibly video rPPG (skin-colour micro-changes → pulse signal → model). Mechanism not confirmed by the vendor.", "Independent reference-device comparison, per-person calibration and intended use; not a diagnosis; FDA has warned about unauthorised BP devices.", "Study with reference device; failure rate; when the system refuses to output."]],
        cls="mid") +
  note("Also seen: alcohol screening before duty; iris cameras at ~3,000 RMB each (too expensive, little uptake); palm-vein cameras at several hundred to ~1,000 RMB, used only for classified-unit access control; ‘Hi-Face’ vendor doing face since 2014."),
  "Product three: facial multi-parameter AI. Leadership saw a demo that reads identity, age, expression and blood pressure from a face. "
  "The product discipline here is to split it into four capabilities and judge each separately. "
  "Identity verification is mature: liveness detection is now standard on every Chinese face camera, and face plus QR is the most popular combination. We align it with reader and gate flows and accept on false-accept, false-reject and live performance. "
  "Age estimation is an apparent range with error, fine for validated analytics but never for a boundary decision. "
  "Expression analysis classifies visible expression; the day-two demo tagged emotion, gender, mask, glasses, hand in pocket and smile. The output is not inner emotion, and we must not infer danger from it. "
  "Blood-pressure estimation is probably video-based photoplethysmography, but the vendor did not confirm the mechanism. It needs an independent reference-device study and a clear intended use. It is not a diagnosis. "
  "We also learned that iris cameras cost around three thousand RMB and sell poorly, while palm-vein cameras are cheaper but niche, used only for classified-unit access.")

S("2 · Priority product 03", "Facial AI — two separate validation paths", "Identity goes into access control now; health estimation is evidence-first",
  two(
    cards([("Path A · Identity → existing access control", ul(["Reuse our identity management and gate workflows", "Vendor supplies original image; ST extracts features and matches — only the result returns", "Accept on FAR / FRR, liveness, lighting, mask and glasses conditions", "Package with QR and card as tiered assurance"])),
           ("CMO positioning", "Package identity, entrance and perimeter value separately. Describe health features strictly within the evidence.")], cols=1),
    cards([("Path B · Health estimation → evidence and intended use", ul(["<b>Validity</b>: independent subjects vs reference device; check train / test overlap; report error distribution and failure rate", "<b>Robustness</b>: lighting, skin tone, age, head motion, device; need for per-person calibration; refusal when unreliable", "<b>Use and commercialisation</b>: define health information vs screening vs medical use; then check target-market requirements, data consent, support and liability"])),
           ("Hard rule", "Until evidence is sufficient, health estimates never enter a safety release decision or an automatic disposition chain.")], cols=1)
  ),
  "That gives us two validation paths. Path A takes identity straight into our existing access control. We reuse our identity management and gate workflows, "
  "take the original image from the vendor and do the matching ourselves, and accept on false-accept and false-reject rates under real lighting, masks and glasses. "
  "Path B treats health estimation as evidence-first. We need validity against a reference device with independent subjects, robustness across lighting, skin tone, age and motion, "
  "and a clear statement of intended use before we look at target-market regulation, consent and liability. "
  "The hard rule for the whole company: until that evidence exists, health estimates never enter a safety release decision or an automated disposition chain. "
  "For the Chief Marketing Officer, this means packaging identity, entrance and perimeter value separately, and describing health features strictly within the evidence.")

S("2 · Priority product 04", "Fence force and vibration sensing — turn perimeter disturbance into a dispatchable event", "Sensing method (tension, cable, fibre) to be confirmed with the exhibitor",
  flow(["Fence disturbance", "Sensing + processing", "Zone alarm + location", "Video verification", "Dispatch + closure"],
       ["Climb, cut, lift — tested against a customer-approved list", "On-site calibration; zone mapping; discriminate from wind, rain, vegetation", "Area, time and event evidence", "Camera preset or pop-up in ISMP / V11", "Patrol task, possibly with glasses feed; audit trail"]) +
  two(
    cards([("Acceptance must cover three cases", table(["Case", "What to test", "What to measure"],
              [["Intrusion", "Climb, cut and other approved tests", "Detection / miss, location error, alarm latency"],
               ["No intrusion", "Wind, rain, vegetation contact, small animals, nearby vibration", "Nuisance alarms per km per day; operator verification load"],
               ["Faults", "Sensor / cable fault, power loss, comms loss", "Fault visibility, recovery time, protected coverage"]], cls="small"))], cols=1),
    cards([("ST opportunity", "Partner for the perimeter sensor; ST owns zoning, video linkage, event flow, patrol dispatch and audit. Inventory the overlap with our existing perimeter products first."),
           ("Delivery and commercial model", "Survey fence material, gates, vegetation, power and comms. Test ‘sensor + installation and calibration + platform linkage + maintenance’."),
           ("Closest to customer value", "Stable detection at an acceptable nuisance load; shorter verify, arrive and close times. Prove it on one real fence segment.")], cols=1),
    "1.2fr 1fr"),
  "Product four: fence force and vibration sensing. The product essence is detecting an intrusion attempt through the force, deformation or vibration a fence experiences, "
  "then turning that into a zoned, located and dispatchable event. The sensing method, whether tension, sensing cable or fibre, still has to be confirmed with the exhibitor. "
  "The value chain is disturbance, sensing and processing with on-site calibration, zone alarm with location, video verification in ISMP V11, and dispatch with closure and audit, "
  "potentially with the patrol glasses feed attached. Acceptance must cover three cases: real intrusions, measured on detection, location error and latency; "
  "non-intrusion disturbances like wind, rain and animals, measured as nuisance alarms per kilometre per day; and equipment and link faults, measured on visibility and recovery time. "
  "Our role is to partner for the sensor and own zoning, video linkage, event flow, dispatch and audit, after checking the overlap with the perimeter products we already sell. "
  "The commercial test is sensor plus installation and calibration plus platform linkage plus maintenance, proven on one real fence segment.")

# ------------------------------------------------------------------ PART 3: CONNECTED OPERATIONS SIGNALS
S("3 · Connected-operations signals", "Signal 01 · NVR-connected edge analytics", "S1 pp. 36–37 · an edge node reading streams from the installed video estate",
  two(
    w5({
      "what": "An edge compute node that connects to existing third-party NVRs (Dahua was named), pulls the streams, analyses them and lets the operator <b>search video with text</b> for a person or trajectory.",
      "why": "Adds intelligence to the installed camera estate without replacing it; analysis ran at roughly 16× speed on a small model.",
      "who": "Operators and investigators in control rooms; integrators who inherit a customer’s cameras.",
      "where": "Any site with an existing NVR or VMS — campuses, transport, government buildings.",
      "when": "Demo-ready; the vendor had not yet productised the chip or the full node (‘still not out’).",
      "how": "Edge node ↔ NVR API or RTSP; small retrieval model; results handed to a search UI — and, in our model, into an incident.",
    }),
    cards([("Product implication", "Add intelligence around the installed video estate with a clear hand-off into an incident record. This is the ‘prove first’ pilot of the strategy: video + incident."),
           ("Next proof required", ul(["Which NVRs and APIs are supported", "Retrieval quality and query method", "Latency and cost per stream", "Where the node runs and who maintains it"])),
           ("Fit with ISMP / V11", "Operator verifies video → creates incident → platform adds site and SOP → assigns task. The edge node is a sensor for the Verify step.")], cols=1)
  ),
  "Now the connected-operations signals from the security and compute booths. Signal one is NVR-connected edge analytics. "
  "A vendor showed an edge node that connects to existing third-party network video recorders, Dahua was named, pulls the streams, "
  "and lets the operator search video with text for a person or a trajectory, running at around sixteen times speed on a small model. "
  "The why is powerful: it adds intelligence to the installed camera estate without replacing cameras. "
  "The who is control-room operators and investigators. The when is demo-ready but not fully productised. "
  "For us, this is the prove-first pilot of the whole strategy: video plus incident. The edge node becomes the sensor for the verify step. "
  "The proof we need is which recorders and APIs are supported, the retrieval quality, the latency, and the cost per stream.")

S("3 · Connected-operations signals", "Signal 02 · Response orchestration and embodied terminals", "S1 pp. 16, 21, 39–40 · ‘leaders want the first 80 % of the work replaced’",
  two(
    cards([("What was described", ul(["A control layer that commands any ‘embodied-intelligence’ terminal: cameras, robots, unmanned vehicles, drones", "Pre-set response plans: camera detects a fight → drone flies to the zone → captures faces → performs dispersal", "<b>Watch Patrol</b>: alerts and short videos to a wrist watch; a voice command on the watch triggers an action on the phone", "Phones remain the simplest channel: SMS or push alert", "All of it running on edge compute"])),
           ("Why buyers care", "Management and public security ‘care about the closed loop’. Leaders want the first 80 % of routine work removed from people; drones and unmanned vehicles are now mainstream security devices.")], cols=1),
    cards([("Product implication", "Make incident ownership, dispatch and closure the reusable product workflow. Terminals are interchangeable; the plan, the acknowledgement and the proof of closure are ours."),
           ("Next proof required", ul(["Live vs staged dispatch", "Task acknowledgement, retries and proof of closure", "Which terminals expose a controllable API", "Rules of engagement for autonomous actions such as dispersal"])),
           ("Strategic fit", "Connected patrol is the ‘extend next’ opportunity: phone first, glasses and watch evaluated against a specific job.")], cols=1)
  ),
  "Signal two is response orchestration. One vendor described a control layer that can command any embodied terminal: cameras, robots, unmanned vehicles and drones, "
  "with pre-set response plans. Their example: a camera detects a fight, a drone flies to the zone, captures faces, and performs dispersal. "
  "Another booth showed a patrol watch that receives alerts and short videos, with a voice command on the watch triggering an action on the phone. "
  "The buyer motivation was stated clearly: management and public security care about the closed loop, and leaders want the first eighty percent of routine work removed from people. "
  "The product implication for us is to make incident ownership, dispatch and closure the reusable workflow, with terminals interchangeable underneath. "
  "The proof we need is live versus staged dispatch, acknowledgement and retries, proof of closure, and clear rules of engagement for any autonomous action.")

S("3 · Connected-operations signals", "Signal 03 · Digital twin and integrated building management", "S2 pp. 3–4, 12 · 3D model from design through operations",
  two(
    w5({
      "what": "A 3D-model platform used to place devices <b>before</b> a building is built and to run it <b>after</b>: an operations centre showing surrounding construction, schedules, and all building systems connected.",
      "why": "One operating picture for the site; connects an incident to its asset, floor and facilities context.",
      "who": "Building owners and operators; campus and city security; the vendor serves ‘every industry’ — factories, construction sites, hospitals, IBMS projects.",
      "where": "Shanghai reference project shown; campuses and buildings; the vendor’s group already has an overseas arm.",
      "when": "Mature for IBMS; AI layer and live (vs recorded) demo to be checked.",
      "how": "IBMS controls ventilation, drainage, chillers and lighting through DDC controllers and gateways; the twin sits on top; CCTV points are modelled.",
    }),
    cards([("Product implication", "Connect incidents to assets and locations. Partner for specialist building-system functions rather than build them."),
           ("Next proof required", ul(["Live vs recorded demo", "Asset identifiers and data model", "Read / write access to BMS points", "Integration effort per site"])),
           ("Strategic fit", "Site operations is the ‘partner’ opportunity: assess selected rack, IBMS and digital-twin integrations; certify only the interfaces the pilot needs.")], cols=1)
  ),
  "Signal three is digital twin and integrated building management. A vendor showed a 3D-model platform used to place devices before a building is built and to operate it afterwards, "
  "with an operations centre showing surrounding construction, schedules and all connected building systems. Their IBMS controls ventilation, drainage, chillers and lighting through DDC controllers and gateways. "
  "They serve factories, construction sites and hospitals across government and industry, and the group already has an overseas arm. "
  "For us the implication is to connect incidents to assets and locations, and to partner for the specialist building functions rather than build them. "
  "The proof needed is a live rather than recorded demo, the asset identifiers and data model, read and write access to building points, and the integration effort per site.")

S("3 · Connected-operations signals", "Signal 04 · Managed compute and racks", "S1 pp. 7–15, 28, 41 · the cabinet is part of the product",
  two(
    cards([("What was shown", ul(["Smart power racks with temperature, humidity, power draw and compute status visible on a central platform", "Cabinet door opens by face, card or fingerprint — ‘make ours the same’", "Air-cooled, sealed cabinets with cold and hot aisles; in-row cooling optional", "Largest deployments: airports and an aviation command centre, ‘thousands of units’", "Edge AI boxes small enough for a drone dock (Hikvision named)"])),
           ("Who buys", "Airports, command centres, enterprises hosting edge nodes; the operations team that must keep analytics running.")], cols=1),
    cards([("Product implication", "Include infrastructure in deployment and service economics. Size compute to a <b>measured</b> workload, not to a demo."),
           ("Next proof required", ul(["Cooling configuration for the target environment", "Actual throughput per stream on the chosen hardware", "Maintenance model and spares", "Written quotes"])),
           ("Why it matters to the CFO", "Hardware, cooling, power and support are a recurring line in every connected-operations deal. The rack decides the margin.")], cols=1)
  ),
  "Signal four is managed compute and racks. We saw smart power racks that report temperature, humidity, power draw and compute status to a central platform, "
  "with cabinet doors that open by face, card or fingerprint. They are air-cooled, sealed, with cold and hot aisles, and the largest deployments are airports and an aviation command centre, in the thousands of units. "
  "Hikvision has an AI box small enough to sit inside a drone dock, which tells you edge compute is spreading to very small scenes. "
  "The product implication is that infrastructure belongs in our deployment and service economics, sized to a measured workload rather than a demo. "
  "For the Chief Financial Officer: hardware, cooling, power and support are a recurring line in every connected-operations deal, and the rack decides the margin.")

S("3 · Connected-operations signals", "Compute economics heard on the floor", "Treat every number as a quote to verify, not a fact",
  two(
    table(["Item heard", "Figure quoted", "Implication"],
          [["Huawei 8-card AI server", "≈ 700k RMB per machine", "On-prem large-model inference is a capital decision, not an add-on"],
           ["Domestic AI chip vs NVIDIA 3090 / 4090", "‘70–80 % of the performance’ after optimisation", "Heterogeneous compute is viable for video analytics; benchmark our own models"],
           ["Two NVIDIA 5090 cards", "≈ 15.5k", "Small scenes may run on commodity GPUs"],
           ["A 26B-parameter model", "‘costs about 20–30k USD’ to run", "Model size must match the job"],
           ["Vertical-model vendor compute", "Private GPUs; customers refuse cloud", "Our customers are the same: plan on-prem"],
           ["Token-based AI apps", "Try-on and digital-human vendors pay per token", "Token costs make or break small apps; on-prem token server as alternative"]], cls="small"),
    cards([("Rule for product decisions", "Benchmark the real workload across edge and on-prem options on four axes: quality, latency, uptime and total cost."),
           ("Keep the roles clear", ul(["<b>AI assistance</b>: retrieve evidence, draft summaries, suggest SOPs — always checked against source", "<b>Operational control</b>: rules and accountable operators decide dispatch, access and closure", "<b>Deployment economics</b>: measured, not assumed"]))], cols=1),
    "1.3fr 1fr"),
  "Some compute economics were quoted on the floor, and every figure is a quote to verify. A Huawei eight-card AI server was priced around seven hundred thousand RMB. "
  "Domestic chips were claimed to reach seventy to eighty percent of an NVIDIA 3090 or 4090 after optimisation. Two 5090 cards were around fifteen and a half thousand. "
  "A twenty-six-billion-parameter model was said to cost twenty to thirty thousand dollars to run. Vertical-model vendors run private GPUs because customers refuse cloud, and our customers behave the same way. "
  "The token-based AI apps we saw, virtual try-on and digital humans, live or die by token cost. "
  "The rule for our product decisions: benchmark the real workload across edge and on-prem options on quality, latency, uptime and total cost. "
  "And keep the roles clear: AI assists with evidence and drafts, accountable operators control dispatch, access and closure, and economics are measured, never assumed.")

S("3 · Connected-operations signals", "Edge-AI vision vendors organise by industry, and the money is moving", "Day-2 AI vision booth · who buys algorithms in China today",
  two(
    cards([("How algorithms are sold", ul(["Per industry: <b>public security</b> wants face and licence plate; <b>safety production</b> wants helmet, vest and behaviour; <b>construction</b> wants 24-hour supervision of compliant work", "Cameras ship with front-end compute; models run on the device", "Custom models: collect images or video, auto-split, auto-import to the device", "A backend ‘SUS’ platform aggregates all data for analysis and display"])),
           ("Where the budgets are", "‘Public-security budgets have been tight for two years’; vendors are shifting to central state-owned enterprises such as State Grid and Southern Grid, and to safety-production regulation driven by accidents.")], cols=1),
    cards([("What this means for ST", ul(["Our buyers abroad mirror this split: law-enforcement identity vs industrial safety vs facilities", "Industry-specific model packs are a partner input, not something to build", "Front-end compute reduces our rack load but raises device-management needs", "Demand follows regulation and incidents — align roadmap to compliance triggers in each market"])),
           ("Market observation", "Domestic security construction peaked; government projects are large and hardware-heavy; ‘software gets little money’. Growth is in regulated industry and overseas.")], cols=1)
  ),
  "The edge-AI vision vendors we met organise their algorithms by industry. Public security wants face and licence plate. Safety production wants helmet, vest and behaviour detection. "
  "Construction wants twenty-four-hour supervision of compliant work. Cameras ship with front-end compute, custom models are trained from collected images and pushed to the device, "
  "and a backend platform aggregates everything. The money is moving: public-security budgets have been tight for two years, so vendors are chasing central state-owned enterprises such as the power grids, "
  "and safety-production regulation driven by accidents. For us, this split mirrors our buyers abroad. Industry model packs are a partner input, not something to build. "
  "And demand follows regulation and incidents, so the roadmap should align to compliance triggers in each market. One more observation: domestic security construction in China has peaked, "
  "and government projects are hardware-heavy with little money for software, which is why these vendors are looking overseas.")

# ------------------------------------------------------------------ PART 4: IDENTITY & CONTROLLED ASSETS
S("4 · Identity and controlled assets", "Biometric capture and identity documents", "S1 pp. 17–20 · 1:25 pm session on passports and face",
  two(
    cards([("Fingerprint and palm capture", ul(["Dual-finger, single-finger and rolled capture; four-finger ‘slap’ for visas and airports; palm print", "References: prisons in Turkey; a Brazilian state driving-licence system; airports and visa issuance", "Status for ST: component-sourcing watchlist — we integrate, we do not manufacture"])),
           ("Passport reading", ul(["Two modes: <b>OCR</b> of the data page and <b>chip decoding</b>; about 3 seconds", "No data retention by default — ‘a legal requirement’", "Multilingual OCR incl. Chinese and Japanese"]))], cols=1),
    cards([("Face is the default modality", ul(["Face is the most popular credential in China; face + QR is the common pairing", "Liveness is now standard — low cost, every camera has it", "Iris: ~3,000 RMB per camera, ‘too expensive’, little uptake", "Palm vein: several hundred to ~1,000 RMB, used for classified-unit access only; a vendor built one and it ‘sold poorly’"])),
           ("Product implication", "Our identity line should treat face + QR + card as tiered assurance, source fingerprint and palm capture as components for border and licensing programmes, and keep iris and palm vein as niche options for high-security rooms.")], cols=1)
  ),
  "Part four: identity and controlled assets. On biometric capture we saw dual-finger, single-finger and rolled fingerprint capture, four-finger slap for visas and airports, and palm print, "
  "with references in prisons in Turkey and a Brazilian state driving-licence programme. For us these are components to source, not to build. "
  "Passport readers offer OCR of the data page and chip decoding in about three seconds, with no data retention by default because the law requires it, and multilingual OCR. "
  "Face is the default modality in China. Face plus QR is the common pairing, and liveness is standard and cheap. Iris cameras cost around three thousand RMB and sell poorly. "
  "Palm vein is cheaper but niche, used only for classified-unit access. Our identity line should therefore treat face, QR and card as tiered assurance, "
  "source fingerprint and palm capture for border and licensing programmes, and keep iris and palm vein as options for the highest-security rooms.")

S("4 · Identity and controlled assets", "Gun and ammunition management — a regulated asset-control product", "1:25 pm session · relevant to our military, police and critical-infrastructure customers",
  two(
    w5({
      "what": "Smart gun and ammunition cabinets: per-weapon locks, cabinet types per weapon (long guns, pistols), a master controller deciding which lock opens, face authentication before duty.",
      "why": "A <b>national standard</b> governs anywhere guns and ammunition are stored; permits must be verified; the state must know where each weapon goes.",
      "who": "Police stations as primary users; army and armed-police sentry posts for the off-post alarm; data reported up to national level, not just the department.",
      "where": "Every police station ‘down to the small county town’; sentry posts; vehicle-mounted variants.",
      "when": "Mature, standards-driven, widely deployed in China.",
      "how": "Off-post alarm uses a <b>UWB tag</b> inside the weapon with a base unit at the post: it detects <b>leaving</b> (presence, roughly up to 300 m), not positioning; alarm fires when the weapon leaves the post.",
    }),
    cards([("Why it matters to us", ul(["Our ISMP already manages keys, cabinets and data-centre racks for military and critical sites — gun and controlled-item cabinets are the same product pattern", "Regulated storage with national reporting is a repeatable, compliance-driven buyer motion", "UWB presence tags are a cheap pattern for any ‘must not leave this zone’ asset"])),
           ("Validation", "Confirm local standards in target markets, integration to our identity and audit, and whether tags survive real duty cycles.")], cols=1)
  ),
  "Gun and ammunition management is a regulated asset-control product. Smart cabinets have per-weapon locks, cabinet types per weapon class, a master controller that decides which lock opens, and face authentication before an officer draws a weapon. "
  "A national standard governs anywhere guns are stored, permits are verified, and the data is reported to national level, not just to the department. "
  "Users are police stations down to the smallest county town, and army and armed-police sentry posts. The off-post alarm is clever and cheap: an ultra-wideband tag inside the weapon and a base unit at the post, "
  "detecting leaving rather than positioning, with a range of roughly three hundred metres. For us this is the same product pattern as the key, cabinet and rack management we already run for military and critical sites, "
  "and a repeatable compliance-driven buying motion. Validation means confirming the standards in each target market, integration to our identity and audit, and real duty-cycle tests for the tags.")

# ------------------------------------------------------------------ PART 5: INTELLIGENCE LAYER
S("5 · Intelligence layer know-how", "The vertical large-model paradigm, as practised by the lab", "Day-2 afternoon session with a Peking University research institute (medical and industrial deployments)",
  flow(["Scenario and knowledge base", "Build the evaluation set", "Measure and diagnose", "Govern the data", "Feedback and iterate"],
       ["Start from the customer’s scenario, not from a model; assemble the domain knowledge", "A high-quality, expert-confirmed benchmark — ‘the biggest human value contribution’", "Where are points lost: retrieval, summarisation or complex reasoning?", "Clean noisy knowledge, resolve conflicts, compile assets; graphs and ontology help", "Keep runtime errors; fix without touching the model where possible; fine-tune periodically from the accumulated set"]) +
  two(
    cards([("Key judgments heard", ul(["Fine-tuning is not the default answer to a 5 % error — diagnose first", "Open-source RAG ‘is not enough’; the system around it is the product", "Medical and industrial differ far less than in the digitalisation era; differences sit in fine-tuning and real-time IoT data", "Predictive-maintenance algorithms already reach 85–90 %; the value is an LLM interface that lets frontline workers use them"]))], cols=1),
    cards([("Speed", "A precise antibiotic-guidance system took about one month; systems in general take one to two months; ‘why would a proposal take a week when a day is enough?’"),
           ("Models in private deployment", "Qwen (multilingual, permissive licence), DeepSeek, Mistral for Europe, Zhipu for state enterprises; customers refuse cloud; own GPUs.")], cols=1)
  ),
  "Part five: the intelligence layer. On the afternoon of day two we met a Peking University research institute that deploys vertical large models in medicine and industry. "
  "Their paradigm is worth adopting. Start from the customer's scenario and knowledge base, not from a model. Build an expert-confirmed evaluation set first, which they called the biggest human value contribution. "
  "Measure, then diagnose where points are lost: retrieval, summarisation or complex reasoning. Govern the data, cleaning noise and conflicts with graphs and ontology. "
  "Then keep runtime errors, fix without touching the model where possible, and fine-tune periodically. They were clear that fine-tuning is not the default answer to a five percent error, "
  "and that open-source retrieval alone is not enough: the system around it is the product. They also argued that medicine and industry differ far less than in the digitalisation era, "
  "and that predictive maintenance is already at eighty-five to ninety percent, so the value is an LLM interface for frontline workers. "
  "Their speed is striking: systems in one to two months. And in private deployment they use Qwen, DeepSeek, Mistral for Europe and Zhipu for state enterprises, because customers refuse cloud.")

S("5 · Intelligence layer know-how", "MCP agents for access control — our question, their answer", "‘If we don’t do it, others will, and we fall behind. We must do it first — carefully.’",
  two(
    cards([("Our intent", "Expose our access-control, door and gate functions as MCP services so robots and agents can request opening and closing by conversation — while recognising this is critical and dangerous."),
           ("Their guidance", ul(["Command-type operations → <b>API / MCP</b>; search only for complex analysis", "Single-tool calls are solved; the hard part is <b>tool selection</b> when many capabilities combine", "Search accuracy is bounded by MCP accuracy", "Our access rules — who, when, which room, contractors, weekends — are an <b>ontology</b> and ‘outside vendors cannot do this; they don’t understand your rules’"]))], cols=1),
    cards([("Why ST is hard to copy", ul(["Eleven generations of the platform over thirty-plus years", "Un-clonable cards and secured readers vs Chinese two-wire readers where ‘cutting the wire reveals the number’", "Customers: land transport, port authority, military camps, border, airports, refineries — ‘very critical infrastructure’", "Quarterly patching and cyber-security as a cost we carry and others skip"])),
           ("Product principle", "Rules and accountable operators decide access. Agents request; the ontology and policy engine decide; every action is audited.")], cols=1)
  ),
  "We asked the lab a direct question: we want to expose our access-control functions as MCP services so robots and agents can open and close doors by conversation, "
  "knowing this is critical and dangerous. Their guidance: command-type operations belong on APIs via MCP, and search should be reserved for complex analysis. "
  "Single tool calls are solved; the hard problem is tool selection when many capabilities combine, and search accuracy is bounded by MCP accuracy. "
  "Most importantly, they recognised that our access rules, who can enter, when, which room, contractors, weekends, are an ontology, and that outside vendors cannot replicate it because they do not understand our rules. "
  "That is why ST is hard to copy: eleven generations over thirty years, un-clonable cards and secured readers, critical-infrastructure customers, and the cyber-security discipline others skip. "
  "The product principle: agents request, the ontology and policy engine decide, and every action is audited.")

S("5 · Intelligence layer know-how", "Strategic insights from the dialogue", "What the lab believes about platforms, teams, talent and markets",
  cards([
    ("Platforms are the last era", "Generic ontology or model-building platforms sold to every industry are ‘a dead end’ except for frontier labs. Build vertical, own your own knowledge. Knowledge equality means the moat is proprietary operational knowledge and speed."),
    ("Integration must become product", "‘System integration has no profit in the long run.’ Crystallise thirty years of integration knowledge into ontology and product so each integration gets cheaper — that becomes the product."),
    ("Small teams, fast loops", "Frontier teams are 10–20 people; proposals in a day; POCs in one to two months; avoid state-enterprise sales cycles. Define the real problem fast, POC fast, validate fast."),
    ("Talent and co-operation", "Large-model PhDs cost ~3M RMB a year in China. Two co-operation modes: package non-AI-heavy development to capable China teams; do AI-deep work with an expert lab. Start with one themed workshop for our engineers."),
    ("Go-to-market geography", "‘Use Chinese brains and knowledge for overseas terminals.’ Singapore is the gateway to ASEAN for Chinese companies going abroad; ST’s markets (critical infrastructure, Middle East, SEA) do not compete with theirs."),
    ("Private, on-prem, secure", "Customers will not allow cloud models. Plan full-domain and small models on our own GPUs. Cyber-security patching is a real cost line and a differentiator against low-cost vendors."),
  ], cols=3),
  "The dialogue also produced strategic insights. First, generic platforms are the last era: ontology or model-building platforms sold to every industry are a dead end except for frontier labs; build vertical and own your own knowledge. "
  "Second, integration must become product. System integration has no profit in the long run, so thirty years of integration knowledge must be crystallised into ontology and product so each integration gets cheaper. "
  "Third, small teams and fast loops: ten to twenty people, proposals in a day, proofs of concept in one to two months, and avoid slow state-enterprise cycles. "
  "Fourth, talent and co-operation: large-model PhDs cost around three million RMB a year in China, so package non-AI-heavy development to capable Chinese teams and do AI-deep work with an expert lab, starting with one themed workshop for our engineers. "
  "Fifth, geography: use Chinese brains for overseas terminals; Singapore is the gateway to ASEAN, and our critical-infrastructure markets do not compete with theirs. "
  "Sixth, everything is private and on-prem, and cyber-security discipline is both a cost and a differentiator.")

# ------------------------------------------------------------------ PART 6: ADJACENT
S("6 · Adjacent and watchlist", "Adjacent categories — watch, do not pilot", "Seen on the floor; outside the near-term operating-workflow thesis",
  cards([
    ("Companion AI robot", "For the elderly: camera, emergency call to contacts, an app, and a ‘psychology large-model layer’ on top of a base model that steers conversation positively. Event price quoted around 100k RMB. Buyer: families and eldercare; not a security buyer.", "WATCH"),
    ("AI virtual try-on", "Software that swaps clothing on a photo in ~30 seconds, including uniforms by rank and service. Token-based cloud model; sold to clothing stores for footfall and to live-commerce. Relevance: uniform visualisation for training — marginal.", "WATCH"),
    ("Digital-human guides", "Voice-interactive avatars (a Su Dongpo persona was demoed) for museums and reception; ‘say pause to stop’; vendor moving to an on-prem token server. Relevance: visitor-facing kiosks at our sites — later.", "LATER"),
    ("Humanoid and embodied robots", "‘Most robots still lack the brain; the brain is still human.’ Humanoids unlikely in factories; eldercare story doubted; delivery robots spreading fast. A national joint evaluation lab for embodied intelligence is forming.", "WATCH"),
  ], cols=4) + note("Classification rule: an adjacent product earns a pilot only when it adds a measurable step to detect → verify → assign → resolve → audit for a paying security operator."),
  "Part six: adjacent categories we should watch but not pilot. A companion robot for the elderly with a camera, emergency calling and a psychology layer on top of a base model, priced around one hundred thousand RMB at the show; its buyer is families and eldercare, not security. "
  "AI virtual try-on that swaps clothing, including uniforms by rank, in thirty seconds, sold to clothing stores and live commerce on a token model. "
  "Digital-human guides, demonstrated as a Su Dongpo persona, aimed at museums and reception, moving to on-prem token servers. "
  "And humanoid or embodied robots, where even vendors admitted that most robots still lack the brain and the brain is still human. "
  "The classification rule is simple: an adjacent product earns a pilot only when it adds a measurable step to detect, verify, assign, resolve and audit for a paying security operator.")

# ------------------------------------------------------------------ PART 7: SYNTHESIS
S("7 · Synthesis for the CPO", "Who uses it, who pays, who influences — by product", "Stakeholder map across the ecosystem",
  table(["Product", "Users", "Buying customer", "Influencers / gatekeepers", "ST position"],
        [["Smart patrol glasses", "Patrol officers, guards, inspectors, remote experts", "Police forces, private security firms, facility operators", "IT security (MDM, data), unions / HR (wearing burden), command-centre ops", "Partner terminal; own workflow"],
         ["Millimeter-wave body screening", "Screening officers, passengers / staff", "Airport equipment departments, customs, rail, prisons, government buildings", "Aviation regulators (TSA / ECAC / CAS), privacy bodies, airport ops", "Integrate device + lane + ISMP; lifecycle service"],
         ["Facial multi-parameter AI", "Gate operators, analysts", "Access-control owners; (health: undefined until intended use is set)", "Data-protection and health regulators, legal", "Identity now; health evidence-first"],
         ["Fence intrusion sensing", "Control-room operators, patrol teams", "Perimeter owners: utilities, ports, camps, airports", "Facilities (installation), weather / terrain realities", "Partner sensor; own zoning, video, dispatch, audit"],
         ["Video + incident (edge analytics)", "Operators, investigators", "Campus / transport / government security owners with existing NVRs", "IT (integration), VMS vendors", "Prove-first pilot on ISMP / V11"],
         ["Response orchestration, watch, drones", "Supervisors, field officers", "Security operations leaders wanting the ‘closed loop’", "Legal (autonomous actions), aviation rules for drones", "Own dispatch and closure workflow"],
         ["Digital twin + IBMS", "Facilities and security operators", "Building and campus owners", "BMS vendors, developers, consultants", "Partner; integrate incidents to assets"],
         ["Managed compute + racks", "Operations / IT teams", "Same buyer as the analytics deal", "Data-centre and cooling vendors, CFO", "Include in service economics"],
         ["Biometric capture, passport readers", "Border and licensing officers", "Border agencies, licensing authorities, airports", "National standards, data-retention law", "Component sourcing; integrate to identity"],
         ["Gun / controlled-item cabinets", "Officers, armourers, sentries", "Police, military, armed police", "National storage standards, audit authorities", "Extend key / cabinet management"]], cls="small"),
  "Part seven: the synthesis. First, the stakeholder map. For each product, the user, the buyer and the influencer are different people, and our position differs too. "
  "Glasses are used by officers and guards, bought by police forces and security firms, gated by IT security and HR, and we partner for the terminal and own the workflow. "
  "Millimeter wave is used by screening officers, bought by airport equipment departments, customs, rail and prisons, gated by aviation regulators, and we integrate device, lane and ISMP with a lifecycle service. "
  "Facial AI is bought by access-control owners for identity, while the health features have no defined buyer until the intended use is set. "
  "Fence sensing is bought by perimeter owners such as utilities, ports, camps and airports, and we own zoning, video, dispatch and audit. "
  "Video plus incident is our prove-first pilot with existing recorder owners. Orchestration is bought by security operations leaders who want the closed loop. "
  "Digital twin and racks share buyers with the analytics deal. Biometric capture and passport readers are bought by border and licensing agencies. "
  "And gun cabinets extend the key and cabinet management we already sell to police and military.")

S("7 · Synthesis for the CPO", "Prioritisation — strategic value against evidence maturity", "Where to place product bets now, next and later",
  '''
  <div class="matrix">
    <div class="axis-y">STRATEGIC VALUE TO ST →</div>
    <div class="quad q-tl"><div class="qn">HIGH VALUE · LOW EVIDENCE — VALIDATE FAST</div>
      <div class="dot">Smart patrol glasses (job-specific pilot vs phone)</div>
      <div class="dot">Millimeter-wave screening (walk-through + certification)</div>
      <div class="dot">MCP agents for access control</div>
      <div class="dot">Facial identity → gates</div>
    </div>
    <div class="quad q-tr"><div class="qn">HIGH VALUE · HIGH EVIDENCE — PROVE FIRST, THEN SCALE</div>
      <div class="dot hot">Video + incident on ISMP / V11 (NVR edge analytics)</div>
      <div class="dot hot">Response orchestration: assign → resolve → audit</div>
      <div class="dot">Fence intrusion → zoned event (mature sensors; our workflow)</div>
      <div class="dot">Vertical-model paradigm: eval set + private deployment</div>
    </div>
    <div class="quad q-bl"><div class="qn">LOW VALUE · LOW EVIDENCE — WATCH</div>
      <div class="dot cold">Facial blood-pressure / expression</div>
      <div class="dot cold">Companion robots · humanoids · virtual try-on</div>
    </div>
    <div class="quad q-br"><div class="qn">LOWER VALUE · HIGH EVIDENCE — PARTNER / SOURCE</div>
      <div class="dot">Digital twin + IBMS (partner)</div>
      <div class="dot">Managed racks + compute (include in economics)</div>
      <div class="dot">Biometric capture, passport readers (source)</div>
      <div class="dot">Gun / controlled-item cabinets (extend existing line)</div>
    </div>
    <div class="axis-x">EVIDENCE MATURITY (what the floor actually proved) →</div>
  </div>
  ''',
  "Second, prioritisation, plotted as strategic value against the evidence the floor actually proved. "
  "Top right, high value and high evidence, is where we prove first and then scale: video plus incident on ISMP V11 using NVR edge analytics, response orchestration from assignment to audit, "
  "fence intrusion as a zoned event, and the vertical-model paradigm of evaluation sets and private deployment. "
  "Top left, high value but low evidence, is where we validate fast: smart glasses on one job against a phone, millimeter wave on walk-through and certification, MCP agents for access control, and facial identity into gates. "
  "Bottom right, lower value but mature, is where we partner or source: digital twin and IBMS, racks and compute, biometric capture and passport readers, and gun cabinets as an extension of our existing line. "
  "Bottom left is the watchlist: facial blood pressure and expression, companion robots, humanoids and virtual try-on.")

S("7 · Synthesis for the CPO", "The product model — shared core, configurable workflows, customer adapters", "Own · Configure · Adapt",
  '''
  <div class="stack">
    <div class="srow own"><div class="sl">OWN / PLATFORM CORE</div><div class="sb"><b>One incident record and one operating model.</b> Event schema, permissions, incident state, audit trail, identity and access ontology, versioned integration contracts. Reuse ISMP / V11 workflow, UX and audit; build only validated gaps.</div></div>
    <div class="srow cfg"><div class="sl">CONFIGURE / SOLUTION</div><div class="sb"><b>Customer workflows and operator experience.</b> SOPs, severity rules, escalation paths, dashboards, asset and location context, industry model packs selected per customer.</div></div>
    <div class="srow adp"><div class="sl">ADAPT / CUSTOMER ENVIRONMENT</div><div class="sb">
      <div class="adp-grid">
        <div><b>Video + analytics</b><br>Existing NVR / VMS, edge nodes, front-end-compute cameras</div>
        <div><b>Access + IBMS</b><br>Doors, racks, BMS points, gun and key cabinets</div>
        <div><b>Field tools</b><br>Phone, patrol watch, smart glasses</div>
        <div><b>Entrance screening</b><br>Millimeter wave, passport readers, biometric capture</div>
        <div><b>Perimeter</b><br>Fence sensing, drones, unmanned vehicles</div>
        <div><b>Specialist systems</b><br>Digital twin, robots, vertical models via MCP</div>
      </div></div></div>
  </div>
  ''' + two(
    cards([("Own + reuse", "ISMP / V11 workflow, UX, audit, identity ontology.")], cols=1),
    cards([("Partner", "AI components, wearables, scanners, sensors, compute, specialist twins.")], cols=1),
  ) + two(
    cards([("Integrate", "The customer’s existing video, access and facilities systems. Certify only the interfaces the selected pilot needs.")], cols=1),
    cards([("Acceptance includes", "Auditability, failure recovery, offline needs, customer data rules, named support ownership.")], cols=1),
  ),
  "Third, the product model. We own the platform core: one incident record and one operating model, with the event schema, permissions, incident state, audit trail, "
  "the identity and access ontology, and versioned integration contracts, reusing ISMP V11 and building only validated gaps. "
  "We configure the solution layer: SOPs, severity rules, escalation paths, dashboards, asset context and the industry model packs a customer needs. "
  "And we adapt to the customer environment through six adapter families: video and analytics, access and building systems, field tools, entrance screening, perimeter, and specialist systems. "
  "Devices and algorithms are replaceable. The event interface, the disposition responsibility, the evidence and the service experience stay with ST. "
  "Product acceptance always includes auditability, failure recovery, offline behaviour, customer data rules and a named support owner.")

S("7 · Synthesis for the CPO", "Roadmap proposal — now, next, later", "Gated by evidence; no vendor commitment implied",
  cards([
    ("NOW · 0–3 months · Validate", ul(["Pilot <b>video + incident</b> on one existing campus (after-hours perimeter incident) with the customer’s NVR", "Glasses: sample unit, one job, phone control group", "Millimeter wave: walk / stop demo, target-item tests, lane throughput, certification roadmap", "Fence: survey one segment; intrusion and weather logs", "Facial identity test at one gate; health features evidence-only", "MCP access-control spike with the lab; one themed workshop"]), "PROVE FIRST"),
    ("NEXT · 3–12 months · Extend", ul(["Connected patrol: assign → acknowledge → evidence → close on phone, watch, glasses", "Fence zone events wired to video presets and dispatch", "Millimeter wave lane at one checkpoint if certification path is credible", "Compute and rack sizing from measured workload; written quotes", "Industry model packs via partners (safety production, plates)", "Vertical model: build our evaluation set for operator assistance"]), "EXTEND"),
    ("LATER · 12–24 months · Partner and platform", ul(["Site operations: incidents linked to digital twin and IBMS assets", "Agent-ready access control: MCP services under policy engine and audit", "Entrance product family: identity + screening + passport capture on one lane", "Gun / controlled-item cabinets with UWB presence as an extension of key management", "Regional expansion: SEA airports (no mmWave installed yet), Middle East critical infrastructure"]), "PARTNER"),
  ], cols=3),
  "Fourth, the roadmap. Now, in the first three months, we validate: pilot video plus incident on one existing campus using the customer's recorders; test a glasses sample on one job with a phone control group; "
  "run the millimeter-wave walk and stop demo with target items and lane throughput while mapping the certification path; survey one fence segment; "
  "test facial identity at one gate while keeping health features evidence-only; and run an MCP access-control spike with the lab, starting with a workshop. "
  "Next, from three to twelve months, we extend: connected patrol across phone, watch and glasses; fence zone events wired to video presets and dispatch; "
  "a millimeter-wave lane at one checkpoint if certification is credible; compute sized from measured workload; partner model packs; and our own evaluation set for operator assistance. "
  "Later, in twelve to twenty-four months, we partner and platform: incidents linked to digital twin and building assets, agent-ready access control under a policy engine, "
  "an entrance product family combining identity, screening and passport capture, controlled-item cabinets, and regional expansion into Southeast Asian airports and Middle East critical infrastructure.")

S("7 · Synthesis for the CPO", "The 90-day validation plan and its gates", "Starts after approval · Product Management coordinates the decision pack",
  flow(["Days 1–30 · Demand + feasibility", "Days 31–60 · Pilot + measure", "Days 61–90 · Business case + gate"],
       ["Interview 3 buyers / operators. Choose one workflow and baseline it. Confirm vendor SDK / API access and written scope. <b>Gate: agreed pilot specification.</b>",
        "Connect one site in assisted mode. Measure the complete task; test exceptions and frontline usability. <b>Gate: comparable pilot results.</b>",
        "Compare outcomes, total cost and repeat-deployment effort. Define the service model and rollout case. <b>Gate: scale, revise or stop.</b>"]) +
  two(
    cards([("Four evidence cards to bring back", table(["Product", "Obtain first", "Decides"],
            [["Glasses", "Sample / SDK; glasses vs phone on the same task", "Whether the gain justifies a frontline pilot"],
             ["Millimeter wave", "Walk / stop demo; target-item tests; re-check and lane throughput", "Which checkpoint, how to configure and price"],
             ["Facial AI", "Split specs; identity test; BP reference study and intended-use material", "How far identity integration and health exploration each go"],
             ["Fence", "Site survey; zone / video interfaces; intrusion and weather logs", "Whether nuisance and maintenance cost are controllable"]], cls="small"))], cols=1),
    cards([("Packaging to test", "Platform / workflow licence + integration + annual support. For devices: ‘device + lane or segment integration + lifecycle service’."),
           ("Illustrative first pilot", "After-hours perimeter incident at one existing campus: operator verifies video and creates the incident → platform adds site and SOP and assigns → field officer acknowledges and captures evidence → supervisor confirms closure and reviews the audit.")], cols=1),
    "1.25fr 1fr"),
  "Fifth, the ninety-day validation plan. Days one to thirty: demand and feasibility. Interview three buyers or operators, choose one workflow and baseline it, and confirm vendor SDK access and written scope. The gate is an agreed pilot specification. "
  "Days thirty-one to sixty: pilot and measure. Connect one site in assisted mode and measure the complete task, including exceptions and frontline usability. The gate is comparable pilot results. "
  "Days sixty-one to ninety: business case. Compare outcomes, total cost and repeat-deployment effort, and define the service model. The gate is scale, revise or stop. "
  "In parallel we bring back four evidence cards: glasses versus phone on one task, millimeter-wave walk and stop results with lane throughput, split facial specifications with a blood-pressure reference study, "
  "and a fence survey with intrusion and weather logs. The packaging to test is a platform and workflow licence plus integration plus annual support, and for devices, device plus lane integration plus lifecycle service.")

S("7 · Synthesis for the CPO", "What each executive must decide, and the evidence to bring back", "Consensus pack for CEO · CTO · CMO · COO · CFO · CCO",
  table(["Owner", "Decision / responsibility", "Evidence to bring back"],
        [["<b>CEO</b>", "Confirm one use case, the sponsor and gated funding. Set the scale gate.", "Named pilot customer and agreed decision criteria."],
         ["<b>CTO</b>", "Own the architecture spike and technical vendor validation: data access, model quality, deployment economics, MCP security model.", "Integration proof; workload quality / cost benchmark; glasses and scanner test results."],
         ["<b>CMO</b>", "Own customer discovery, positioning and packaging. Sell outcomes supported by evidence; package entrance, patrol and perimeter separately; health claims within evidence only.", "Buyer need, outcome narrative, willingness to pay."],
         ["<b>COO</b>", "Own pilot operations and service readiness: SOPs, response accountability, re-check and nuisance-alarm handling, maintenance and support ownership.", "SOP, accountable response owner, support handover, frontline adoption data."],
         ["<b>CFO</b>", "Set the investment cap and the economics gate: hardware, compute, licensing, support, token vs on-prem; approve the packaging to test.", "Total cost per site, integration days, margin model for device + service bundles."],
         ["<b>CCO</b>", "Own partner and channel strategy: SDK / API terms with glasses, scanner and sensor vendors; certification roadmap with the scanner vendor; co-operation terms with the lab; regional entry (SEA airports, Middle East).", "Signed scopes, certification plan, partner shortlist, pipeline for the first paying scenario."]], cls="mid") +
  note("Product Management coordinates prioritisation, the pilot specification and the decision pack. Decision proposed: sponsor a scoped validation and return with measured operator value and a go / no-go case."),
  "Sixth, the decisions. The CEO confirms one use case, the sponsor and gated funding, and brings back a named pilot customer with agreed decision criteria. "
  "The CTO owns the architecture spike and technical vendor validation, including the MCP security model, and brings back integration proof and a workload benchmark. "
  "The CMO owns discovery, positioning and packaging, selling outcomes supported by evidence, with entrance, patrol and perimeter packaged separately and health claims kept within evidence. "
  "The COO owns pilot operations and service readiness: SOPs, response accountability, nuisance-alarm handling and support ownership. "
  "The CFO sets the investment cap and the economics gate, covering hardware, compute, licensing, support and token versus on-prem, and brings back total cost per site and the margin model for device plus service bundles. "
  "The Chief Commercial Officer owns partner and channel strategy: SDK and API terms with the glasses, scanner and sensor vendors, the certification roadmap with the scanner vendor, co-operation terms with the lab, and regional entry into Southeast Asian airports and Middle East critical infrastructure. "
  "Product Management coordinates the pilot specification and the decision pack. The decision proposed is to sponsor a scoped validation and return with measured operator value and a go or no-go case.")

S("7 · Synthesis for the CPO", "Success criteria, risks and the evidence boundary", "Agree targets against a real baseline before the pilot starts",
  two(
    cards([("Success criteria", table(["Dimension", "Measures"],
            [["Value", "Minutes per incident; acknowledgement and closure time; avoidable repeat work"],
             ["Quality", "False and missed alerts; task completion; frontline adoption"],
             ["Economics", "Integration days; hardware, compute, licensing and support cost; willingness to pay"]], cls="small")),
           ("Scale rule", "Scale only with measured operator benefit, viable economics and a repeatable delivery model.")], cols=1),
    cards([("Risks to manage", ul(["<b>Evidence</b>: transcripts are AI-generated and noisy; vendor identities, prices and claims unverified", "<b>Certification</b>: scanner lacks TSA / ECAC; buyers want both price and certification", "<b>Data sovereignty and cyber</b>: video and face features leaving devices; MDM; patching discipline", "<b>Regulatory</b>: health estimation, expression inference, autonomous drone actions", "<b>Economics</b>: compute and token costs; hardware-heavy deals with thin software margin", "<b>Supply</b>: scanner chips at 65 nm, low volume; domestic-chip transition", "<b>Organisational</b>: integration mindset vs product mindset; small-team speed"])),
           ("Evidence boundary", "Booth discussions indicate possible capabilities, not verified production maturity. ST mappings and priorities are strategic proposals.")], cols=1)
  ),
  "Seventh, success criteria and risks. Value is measured in minutes per incident, acknowledgement and closure time, and avoidable repeat work. "
  "Quality is false and missed alerts, task completion and frontline adoption. Economics is integration days, total cost of hardware, compute, licensing and support, and willingness to pay. "
  "We scale only with measured operator benefit, viable economics and a repeatable delivery model. "
  "The risks: the evidence itself is noisy; the scanner lacks Western certification; video and face data leaving devices raise sovereignty and cyber questions; "
  "health estimation, expression inference and autonomous drone actions carry regulatory exposure; compute and token costs can erase margin; the scanner's chip supply is low-volume; "
  "and the organisational shift from an integration mindset to a product mindset is real. Everything here is a proposal to validate, not a demonstrated end-to-end capability.")

S("Closing", "The one-page takeaway", "From devices to connected operations",
  big("Make every alert actionable, assigned and auditable.",
      "Prove video + incident on ISMP / V11 first. Validate glasses, millimeter wave, facial identity and fence sensing with evidence cards. Partner for twins, racks and sensors. Adopt the evaluation-set discipline for every AI feature. Keep agents behind the policy engine.") +
  note("Prepared by Product Management from the 3–4 November 2026 Beijing conference materials. All figures are booth quotes pending written confirmation.") +
  cards([("Prove first", "Video + incident on one existing campus"),
         ("Extend next", "Connected patrol: phone, watch, glasses"),
         ("Partner", "Site operations: racks, IBMS, digital twin"),
         ("Validate", "Glasses · millimeter wave · facial identity · fence"),
         ("Watch", "Health estimation · robots · try-on · digital humans")], cols=5),
  "To close, the one-page takeaway. Make every alert actionable, assigned and auditable. Prove video plus incident on ISMP V11 first. "
  "Validate glasses, millimeter wave, facial identity and fence sensing with evidence cards. Partner for digital twins, racks and sensors. "
  "Adopt the evaluation-set discipline for every AI feature. And keep agents behind the policy engine, with every action audited. "
  "That is the recap of Beijing. Use it to align the CTO, CMO, COO, CFO and CCO on one scoped validation, and return in ninety days with measured operator value and a go or no-go case. Thank you.")
