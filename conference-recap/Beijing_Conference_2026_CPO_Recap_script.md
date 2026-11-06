# Beijing Conference 2026 — CPO Recap Video: Script and Slide Index

Companion to `Beijing_Conference_2026_CPO_Recap.mp4`. One section per scene, in video order. Narration text is what the voice-over says; slide content is summarised by title.

## Opening

### 01 · Beijing Security Conference 2026 — CPO Recap
*3–4 November 2026 · Beijing*

Welcome. This is the product recap of the Beijing security conference held on the third and fourth of November 2026. It is built for the Chief Product Officer and the leadership team, and it covers every product ecosystem we discovered, who uses it, who pays for it, how the value chain works, and what it means for our roadmap. The material behind this video is nine documents: six AI-generated transcripts of booth and meeting conversations, two strategy infographics prepared after day one, and the NUCTECH millimeter-wave datasheet. One warning before we begin: the transcripts are noisy and were never checked against audio, so vendor identities, prices and performance claims are treated as signals to validate, not as facts. The thesis that runs through the whole recap is simple: our opportunity is to move from selling security devices to delivering connected operations, where every alert becomes actionable, assigned and auditable on the ISMP V11 core we already own.

### 02 · How this video is organised
*Seven parts · about twenty-five minutes*

Here is how the video is organised. Part one draws the ecosystem map and the operating value chain. Part two goes deep on the four products our leadership flagged as top priority: smart glasses, millimeter-wave body screening, facial multi-parameter AI, and fence intrusion sensing. Part three covers the connected-operations signals from the security and compute booths. Part four covers identity and controlled assets. Part five distils the intelligence-layer know-how from the vertical large-model session at Peking University. Part six parks the adjacent categories on a watchlist. And part seven is the synthesis for the Chief Product Officer: stakeholders, prioritisation, product model, roadmap, the ninety-day plan, the decisions each executive must take, and the risks.

## 1 · Ecosystem map

### 03 · The product ecosystem we discovered, in five layers
*Categorised from all six transcripts*

Let us start with the map. Everything we met in Beijing fits into five layers. At the bottom is frontline sensing and wearables: smart patrol glasses with and without cameras, a patrol watch, millimeter-wave body screening, fence force and vibration sensing, biometric capture devices, passport readers, and smart gun cabinets with ultra-wideband tags. Above it is edge AI and compute: edge nodes that pull video from third-party recorders, cameras with built-in compute trained per industry, heterogeneous compute servers, and managed racks. The middle layer is platform and orchestration, which is where our own ISMP V11 lives, alongside response plans that drive drones and unmanned vehicles, digital twins, and integrated building management. The intelligence layer holds vertical large models, MCP agents, facial attribute AI, and text search over video. And at the top are adjacent categories we should watch but not pilot. Keep this map in mind: our strategic position is the platform layer, and every lower-layer product is a candidate sensor or actuator for it.

### 04 · Value is created in the complete operating workflow
*The value chain every product must plug into*

The second idea to hold onto is the operating value chain. Value is not created when a sensor detects something. It is created when the detection is verified with evidence, assigned to an accountable owner, resolved with a confirmed outcome, and audited in a traceable record. Almost every booth we visited sells the detect step: a camera, an algorithm, a scanner, a box. Very few connect it to assignment and closure. In fact, vendors themselves told us that the Chinese market is component-driven, highly competitive, and weak on system integration. That is exactly the gap our platform fills. Throughout this video, when we assess a product, the question is always: where does it plug into detect, verify, assign, resolve and audit, and what does it add to the complete workflow?

## 2 · Priority product 01

### 05 · Smart patrol glasses — what we saw and how they work
*Rokid-class and Even Realities-class wearables · S1, S3, day-2 AI session*

Product one: smart patrol glasses. We saw two flavours. Camera glasses stream a first-person view to a command centre and run face recognition. Display-only glasses, with no camera, show prompts, watch-lists, a teleprompter or live data on the lens, and are controlled by a single tap to confirm and a double tap to exit. The why is hands-free capture and prompting for people who walk: patrol officers, guards and inspectors. The who includes public-security and traffic police who need long shifts, private security companies, inspectors, and remote experts. The where is patrol routes, checkpoints and campuses, with the feed landing in a command centre. Civilian versions are already on Taobao for vloggers, which tells you the hardware is commoditising. The when is now: demo units exist and the vendor suggested we buy one or two to test. The how matters most for us: Bluetooth pairing to a phone or standalone Android with mobile device management, prescription lenses fitted per wearer, and, critically, the vendor can hand us the original image so that we do feature extraction and matching in our own backend and only the result flows back.

### 06 · Smart glasses — the ST product role and what to validate first
*Partner the terminal; own the task, SOP, evidence and audit*

What is our role? We should not build glasses. We partner for the terminal and the base SDK, and we own the task definition, the SOP, the evidence chain and the audit, reusing the platform we already have. The product flow is: capture on site, run one targeted detection matched to one job, confirm with a human on the lens, and create a task in ISMP V11. The commercial hypothesis is terminal plus industry workflow licence plus training and support, always benchmarked against a phone doing the same job. Concerns raised on the floor were cyber-security of pushing video to a backend, sovereignty of face features, and real-shift battery life. Before any pilot, the CTO needs a sample unit to answer: which model and camera, which streaming interfaces, where the model runs, what the offline behaviour is, and who controls the data. The COO should accept only on task results: completion time, first-time completion rate, usable-image rate, and actual frontline adoption. Only if a repeatable operational gain over the phone appears do we expand.

## 2 · Priority product 02

### 07 · Millimeter-wave body screening — the product and the field evidence
*NUCTECH MW1000AA datasheet + day-2 booth conversation*

Product two: millimeter-wave body screening. The what is non-contact detection of items hidden in or under clothing, metallic and non-metallic, with automatic threat recognition and a privacy-preserving cartoon figure. The why is replacing pat-downs and the stop-and-raise-your-arms pose. The booth pitch was: bind the person's face, walk through, the result appears, and the officer gives pass or no-pass feedback. Who pays? The airport's equipment department, not the airlines and not immigration. Other buyers are customs, border, rail transit, prisons and government buildings. Where is it deployed? Beijing, Shanghai Pudong, Xinjiang, Tianjin and Wuhan in China, three units in Nigeria, and none yet in Southeast Asia, which is an open field for us. The when is now, and the vendor is actively going to Dubai and Amsterdam to find partners. The how is active holographic imaging. The MW1000AA datasheet lists a two-second scan and a four-second inspection with a brief stand, while the booth unit claims continuous walking. That gap is the single most important thing to verify. Field pain points we heard: metal plates in shoes still trigger alarms, European height requirements, and queues when screening is pushed to the building entrance.

### 08 · Millimeter wave — certification gap, vendor profile and ST packaging
*The buying decision hinges on certification, not imaging quality*

The buying decision for millimeter wave hinges on certification, not image quality. The vendor holds only the Chinese civil-aviation approval at the highest national level, with no TSA or ECAC listing. They said Singapore sits in the middle: it wants the price but also the certification, and that is the headache. The vendor itself is a radar company with three lines: body screening, tank-level radar for petrochemicals, and traffic radar, built on its own sixty-five nanometre chips, which are expensive at low volume. They offer remote diagnostics and a self-check at every boot. For us there are four judgments. Detection boundary, tested separately for metallic and non-metallic items. Lane efficiency, measured as real peak throughput, nuisance alarms and re-check time for the whole lane. Users and deployment, including passenger guidance and an explainable alarm location for the officer. And the ST product and revenue model, linking the scanner to identity, gates and ISMP V11 and testing a device plus lane integration plus lifecycle service offer. The gate before any commercial introduction is a site acceptance with customer-approved target items and the operating flow.

## 2 · Priority product 03

### 09 · Facial multi-parameter AI — split the capability to judge the value
*Identity · Age · Expression · Blood pressure · plus day-2 attribute demos*

Product three: facial multi-parameter AI. Leadership saw a demo that reads identity, age, expression and blood pressure from a face. The product discipline here is to split it into four capabilities and judge each separately. Identity verification is mature: liveness detection is now standard on every Chinese face camera, and face plus QR is the most popular combination. We align it with reader and gate flows and accept on false-accept, false-reject and live performance. Age estimation is an apparent range with error, fine for validated analytics but never for a boundary decision. Expression analysis classifies visible expression; the day-two demo tagged emotion, gender, mask, glasses, hand in pocket and smile. The output is not inner emotion, and we must not infer danger from it. Blood-pressure estimation is probably video-based photoplethysmography, but the vendor did not confirm the mechanism. It needs an independent reference-device study and a clear intended use. It is not a diagnosis. We also learned that iris cameras cost around three thousand RMB and sell poorly, while palm-vein cameras are cheaper but niche, used only for classified-unit access.

### 10 · Facial AI — two separate validation paths
*Identity goes into access control now; health estimation is evidence-first*

That gives us two validation paths. Path A takes identity straight into our existing access control. We reuse our identity management and gate workflows, take the original image from the vendor and do the matching ourselves, and accept on false-accept and false-reject rates under real lighting, masks and glasses. Path B treats health estimation as evidence-first. We need validity against a reference device with independent subjects, robustness across lighting, skin tone, age and motion, and a clear statement of intended use before we look at target-market regulation, consent and liability. The hard rule for the whole company: until that evidence exists, health estimates never enter a safety release decision or an automated disposition chain. For the Chief Marketing Officer, this means packaging identity, entrance and perimeter value separately, and describing health features strictly within the evidence.

## 2 · Priority product 04

### 11 · Fence force and vibration sensing — turn perimeter disturbance into a dispatchable event
*Sensing method (tension, cable, fibre) to be confirmed with the exhibitor*

Product four: fence force and vibration sensing. The product essence is detecting an intrusion attempt through the force, deformation or vibration a fence experiences, then turning that into a zoned, located and dispatchable event. The sensing method, whether tension, sensing cable or fibre, still has to be confirmed with the exhibitor. The value chain is disturbance, sensing and processing with on-site calibration, zone alarm with location, video verification in ISMP V11, and dispatch with closure and audit, potentially with the patrol glasses feed attached. Acceptance must cover three cases: real intrusions, measured on detection, location error and latency; non-intrusion disturbances like wind, rain and animals, measured as nuisance alarms per kilometre per day; and equipment and link faults, measured on visibility and recovery time. Our role is to partner for the sensor and own zoning, video linkage, event flow, dispatch and audit, after checking the overlap with the perimeter products we already sell. The commercial test is sensor plus installation and calibration plus platform linkage plus maintenance, proven on one real fence segment.

## 3 · Connected-operations signals

### 12 · Signal 01 · NVR-connected edge analytics
*S1 pp. 36–37 · an edge node reading streams from the installed video estate*

Now the connected-operations signals from the security and compute booths. Signal one is NVR-connected edge analytics. A vendor showed an edge node that connects to existing third-party network video recorders, Dahua was named, pulls the streams, and lets the operator search video with text for a person or a trajectory, running at around sixteen times speed on a small model. The why is powerful: it adds intelligence to the installed camera estate without replacing cameras. The who is control-room operators and investigators. The when is demo-ready but not fully productised. For us, this is the prove-first pilot of the whole strategy: video plus incident. The edge node becomes the sensor for the verify step. The proof we need is which recorders and APIs are supported, the retrieval quality, the latency, and the cost per stream.

### 13 · Signal 02 · Response orchestration and embodied terminals
*S1 pp. 16, 21, 39–40 · ‘leaders want the first 80 % of the work replaced’*

Signal two is response orchestration. One vendor described a control layer that can command any embodied terminal: cameras, robots, unmanned vehicles and drones, with pre-set response plans. Their example: a camera detects a fight, a drone flies to the zone, captures faces, and performs dispersal. Another booth showed a patrol watch that receives alerts and short videos, with a voice command on the watch triggering an action on the phone. The buyer motivation was stated clearly: management and public security care about the closed loop, and leaders want the first eighty percent of routine work removed from people. The product implication for us is to make incident ownership, dispatch and closure the reusable workflow, with terminals interchangeable underneath. The proof we need is live versus staged dispatch, acknowledgement and retries, proof of closure, and clear rules of engagement for any autonomous action.

### 14 · Signal 03 · Digital twin and integrated building management
*S2 pp. 3–4, 12 · 3D model from design through operations*

Signal three is digital twin and integrated building management. A vendor showed a 3D-model platform used to place devices before a building is built and to operate it afterwards, with an operations centre showing surrounding construction, schedules and all connected building systems. Their IBMS controls ventilation, drainage, chillers and lighting through DDC controllers and gateways. They serve factories, construction sites and hospitals across government and industry, and the group already has an overseas arm. For us the implication is to connect incidents to assets and locations, and to partner for the specialist building functions rather than build them. The proof needed is a live rather than recorded demo, the asset identifiers and data model, read and write access to building points, and the integration effort per site.

### 15 · Signal 04 · Managed compute and racks
*S1 pp. 7–15, 28, 41 · the cabinet is part of the product*

Signal four is managed compute and racks. We saw smart power racks that report temperature, humidity, power draw and compute status to a central platform, with cabinet doors that open by face, card or fingerprint. They are air-cooled, sealed, with cold and hot aisles, and the largest deployments are airports and an aviation command centre, in the thousands of units. Hikvision has an AI box small enough to sit inside a drone dock, which tells you edge compute is spreading to very small scenes. The product implication is that infrastructure belongs in our deployment and service economics, sized to a measured workload rather than a demo. For the Chief Financial Officer: hardware, cooling, power and support are a recurring line in every connected-operations deal, and the rack decides the margin.

### 16 · Compute economics heard on the floor
*Treat every number as a quote to verify, not a fact*

Some compute economics were quoted on the floor, and every figure is a quote to verify. A Huawei eight-card AI server was priced around seven hundred thousand RMB. Domestic chips were claimed to reach seventy to eighty percent of an NVIDIA 3090 or 4090 after optimisation. Two 5090 cards were around fifteen and a half thousand. A twenty-six-billion-parameter model was said to cost twenty to thirty thousand dollars to run. Vertical-model vendors run private GPUs because customers refuse cloud, and our customers behave the same way. The token-based AI apps we saw, virtual try-on and digital humans, live or die by token cost. The rule for our product decisions: benchmark the real workload across edge and on-prem options on quality, latency, uptime and total cost. And keep the roles clear: AI assists with evidence and drafts, accountable operators control dispatch, access and closure, and economics are measured, never assumed.

### 17 · Edge-AI vision vendors organise by industry, and the money is moving
*Day-2 AI vision booth · who buys algorithms in China today*

The edge-AI vision vendors we met organise their algorithms by industry. Public security wants face and licence plate. Safety production wants helmet, vest and behaviour detection. Construction wants twenty-four-hour supervision of compliant work. Cameras ship with front-end compute, custom models are trained from collected images and pushed to the device, and a backend platform aggregates everything. The money is moving: public-security budgets have been tight for two years, so vendors are chasing central state-owned enterprises such as the power grids, and safety-production regulation driven by accidents. For us, this split mirrors our buyers abroad. Industry model packs are a partner input, not something to build. And demand follows regulation and incidents, so the roadmap should align to compliance triggers in each market. One more observation: domestic security construction in China has peaked, and government projects are hardware-heavy with little money for software, which is why these vendors are looking overseas.

## 4 · Identity and controlled assets

### 18 · Biometric capture and identity documents
*S1 pp. 17–20 · 1:25 pm session on passports and face*

Part four: identity and controlled assets. On biometric capture we saw dual-finger, single-finger and rolled fingerprint capture, four-finger slap for visas and airports, and palm print, with references in prisons in Turkey and a Brazilian state driving-licence programme. For us these are components to source, not to build. Passport readers offer OCR of the data page and chip decoding in about three seconds, with no data retention by default because the law requires it, and multilingual OCR. Face is the default modality in China. Face plus QR is the common pairing, and liveness is standard and cheap. Iris cameras cost around three thousand RMB and sell poorly. Palm vein is cheaper but niche, used only for classified-unit access. Our identity line should therefore treat face, QR and card as tiered assurance, source fingerprint and palm capture for border and licensing programmes, and keep iris and palm vein as options for the highest-security rooms.

### 19 · Gun and ammunition management — a regulated asset-control product
*1:25 pm session · relevant to our military, police and critical-infrastructure customers*

Gun and ammunition management is a regulated asset-control product. Smart cabinets have per-weapon locks, cabinet types per weapon class, a master controller that decides which lock opens, and face authentication before an officer draws a weapon. A national standard governs anywhere guns are stored, permits are verified, and the data is reported to national level, not just to the department. Users are police stations down to the smallest county town, and army and armed-police sentry posts. The off-post alarm is clever and cheap: an ultra-wideband tag inside the weapon and a base unit at the post, detecting leaving rather than positioning, with a range of roughly three hundred metres. For us this is the same product pattern as the key, cabinet and rack management we already run for military and critical sites, and a repeatable compliance-driven buying motion. Validation means confirming the standards in each target market, integration to our identity and audit, and real duty-cycle tests for the tags.

## 5 · Intelligence layer know-how

### 20 · The vertical large-model paradigm, as practised by the lab
*Day-2 afternoon session with a Peking University research institute (medical and industrial deployments)*

Part five: the intelligence layer. On the afternoon of day two we met a Peking University research institute that deploys vertical large models in medicine and industry. Their paradigm is worth adopting. Start from the customer's scenario and knowledge base, not from a model. Build an expert-confirmed evaluation set first, which they called the biggest human value contribution. Measure, then diagnose where points are lost: retrieval, summarisation or complex reasoning. Govern the data, cleaning noise and conflicts with graphs and ontology. Then keep runtime errors, fix without touching the model where possible, and fine-tune periodically. They were clear that fine-tuning is not the default answer to a five percent error, and that open-source retrieval alone is not enough: the system around it is the product. They also argued that medicine and industry differ far less than in the digitalisation era, and that predictive maintenance is already at eighty-five to ninety percent, so the value is an LLM interface for frontline workers. Their speed is striking: systems in one to two months. And in private deployment they use Qwen, DeepSeek, Mistral for Europe and Zhipu for state enterprises, because customers refuse cloud.

### 21 · MCP agents for access control — our question, their answer
*‘If we don’t do it, others will, and we fall behind. We must do it first — carefully.’*

We asked the lab a direct question: we want to expose our access-control functions as MCP services so robots and agents can open and close doors by conversation, knowing this is critical and dangerous. Their guidance: command-type operations belong on APIs via MCP, and search should be reserved for complex analysis. Single tool calls are solved; the hard problem is tool selection when many capabilities combine, and search accuracy is bounded by MCP accuracy. Most importantly, they recognised that our access rules, who can enter, when, which room, contractors, weekends, are an ontology, and that outside vendors cannot replicate it because they do not understand our rules. That is why ST is hard to copy: eleven generations over thirty years, un-clonable cards and secured readers, critical-infrastructure customers, and the cyber-security discipline others skip. The product principle: agents request, the ontology and policy engine decide, and every action is audited.

### 22 · Strategic insights from the dialogue
*What the lab believes about platforms, teams, talent and markets*

The dialogue also produced strategic insights. First, generic platforms are the last era: ontology or model-building platforms sold to every industry are a dead end except for frontier labs; build vertical and own your own knowledge. Second, integration must become product. System integration has no profit in the long run, so thirty years of integration knowledge must be crystallised into ontology and product so each integration gets cheaper. Third, small teams and fast loops: ten to twenty people, proposals in a day, proofs of concept in one to two months, and avoid slow state-enterprise cycles. Fourth, talent and co-operation: large-model PhDs cost around three million RMB a year in China, so package non-AI-heavy development to capable Chinese teams and do AI-deep work with an expert lab, starting with one themed workshop for our engineers. Fifth, geography: use Chinese brains for overseas terminals; Singapore is the gateway to ASEAN, and our critical-infrastructure markets do not compete with theirs. Sixth, everything is private and on-prem, and cyber-security discipline is both a cost and a differentiator.

## 6 · Adjacent and watchlist

### 23 · Adjacent categories — watch, do not pilot
*Seen on the floor; outside the near-term operating-workflow thesis*

Part six: adjacent categories we should watch but not pilot. A companion robot for the elderly with a camera, emergency calling and a psychology layer on top of a base model, priced around one hundred thousand RMB at the show; its buyer is families and eldercare, not security. AI virtual try-on that swaps clothing, including uniforms by rank, in thirty seconds, sold to clothing stores and live commerce on a token model. Digital-human guides, demonstrated as a Su Dongpo persona, aimed at museums and reception, moving to on-prem token servers. And humanoid or embodied robots, where even vendors admitted that most robots still lack the brain and the brain is still human. The classification rule is simple: an adjacent product earns a pilot only when it adds a measurable step to detect, verify, assign, resolve and audit for a paying security operator.

## 7 · Synthesis for the CPO

### 24 · Who uses it, who pays, who influences — by product
*Stakeholder map across the ecosystem*

Part seven: the synthesis. First, the stakeholder map. For each product, the user, the buyer and the influencer are different people, and our position differs too. Glasses are used by officers and guards, bought by police forces and security firms, gated by IT security and HR, and we partner for the terminal and own the workflow. Millimeter wave is used by screening officers, bought by airport equipment departments, customs, rail and prisons, gated by aviation regulators, and we integrate device, lane and ISMP with a lifecycle service. Facial AI is bought by access-control owners for identity, while the health features have no defined buyer until the intended use is set. Fence sensing is bought by perimeter owners such as utilities, ports, camps and airports, and we own zoning, video, dispatch and audit. Video plus incident is our prove-first pilot with existing recorder owners. Orchestration is bought by security operations leaders who want the closed loop. Digital twin and racks share buyers with the analytics deal. Biometric capture and passport readers are bought by border and licensing agencies. And gun cabinets extend the key and cabinet management we already sell to police and military.

### 25 · Prioritisation — strategic value against evidence maturity
*Where to place product bets now, next and later*

Second, prioritisation, plotted as strategic value against the evidence the floor actually proved. Top right, high value and high evidence, is where we prove first and then scale: video plus incident on ISMP V11 using NVR edge analytics, response orchestration from assignment to audit, fence intrusion as a zoned event, and the vertical-model paradigm of evaluation sets and private deployment. Top left, high value but low evidence, is where we validate fast: smart glasses on one job against a phone, millimeter wave on walk-through and certification, MCP agents for access control, and facial identity into gates. Bottom right, lower value but mature, is where we partner or source: digital twin and IBMS, racks and compute, biometric capture and passport readers, and gun cabinets as an extension of our existing line. Bottom left is the watchlist: facial blood pressure and expression, companion robots, humanoids and virtual try-on.

### 26 · The product model — shared core, configurable workflows, customer adapters
*Own · Configure · Adapt*

Third, the product model. We own the platform core: one incident record and one operating model, with the event schema, permissions, incident state, audit trail, the identity and access ontology, and versioned integration contracts, reusing ISMP V11 and building only validated gaps. We configure the solution layer: SOPs, severity rules, escalation paths, dashboards, asset context and the industry model packs a customer needs. And we adapt to the customer environment through six adapter families: video and analytics, access and building systems, field tools, entrance screening, perimeter, and specialist systems. Devices and algorithms are replaceable. The event interface, the disposition responsibility, the evidence and the service experience stay with ST. Product acceptance always includes auditability, failure recovery, offline behaviour, customer data rules and a named support owner.

### 27 · Roadmap proposal — now, next, later
*Gated by evidence; no vendor commitment implied*

Fourth, the roadmap. Now, in the first three months, we validate: pilot video plus incident on one existing campus using the customer's recorders; test a glasses sample on one job with a phone control group; run the millimeter-wave walk and stop demo with target items and lane throughput while mapping the certification path; survey one fence segment; test facial identity at one gate while keeping health features evidence-only; and run an MCP access-control spike with the lab, starting with a workshop. Next, from three to twelve months, we extend: connected patrol across phone, watch and glasses; fence zone events wired to video presets and dispatch; a millimeter-wave lane at one checkpoint if certification is credible; compute sized from measured workload; partner model packs; and our own evaluation set for operator assistance. Later, in twelve to twenty-four months, we partner and platform: incidents linked to digital twin and building assets, agent-ready access control under a policy engine, an entrance product family combining identity, screening and passport capture, controlled-item cabinets, and regional expansion into Southeast Asian airports and Middle East critical infrastructure.

### 28 · The 90-day validation plan and its gates
*Starts after approval · Product Management coordinates the decision pack*

Fifth, the ninety-day validation plan. Days one to thirty: demand and feasibility. Interview three buyers or operators, choose one workflow and baseline it, and confirm vendor SDK access and written scope. The gate is an agreed pilot specification. Days thirty-one to sixty: pilot and measure. Connect one site in assisted mode and measure the complete task, including exceptions and frontline usability. The gate is comparable pilot results. Days sixty-one to ninety: business case. Compare outcomes, total cost and repeat-deployment effort, and define the service model. The gate is scale, revise or stop. In parallel we bring back four evidence cards: glasses versus phone on one task, millimeter-wave walk and stop results with lane throughput, split facial specifications with a blood-pressure reference study, and a fence survey with intrusion and weather logs. The packaging to test is a platform and workflow licence plus integration plus annual support, and for devices, device plus lane integration plus lifecycle service.

### 29 · What each executive must decide, and the evidence to bring back
*Consensus pack for CEO · CTO · CMO · COO · CFO · CCO*

Sixth, the decisions. The CEO confirms one use case, the sponsor and gated funding, and brings back a named pilot customer with agreed decision criteria. The CTO owns the architecture spike and technical vendor validation, including the MCP security model, and brings back integration proof and a workload benchmark. The CMO owns discovery, positioning and packaging, selling outcomes supported by evidence, with entrance, patrol and perimeter packaged separately and health claims kept within evidence. The COO owns pilot operations and service readiness: SOPs, response accountability, nuisance-alarm handling and support ownership. The CFO sets the investment cap and the economics gate, covering hardware, compute, licensing, support and token versus on-prem, and brings back total cost per site and the margin model for device plus service bundles. The Chief Commercial Officer owns partner and channel strategy: SDK and API terms with the glasses, scanner and sensor vendors, the certification roadmap with the scanner vendor, co-operation terms with the lab, and regional entry into Southeast Asian airports and Middle East critical infrastructure. Product Management coordinates the pilot specification and the decision pack. The decision proposed is to sponsor a scoped validation and return with measured operator value and a go or no-go case.

### 30 · Success criteria, risks and the evidence boundary
*Agree targets against a real baseline before the pilot starts*

Seventh, success criteria and risks. Value is measured in minutes per incident, acknowledgement and closure time, and avoidable repeat work. Quality is false and missed alerts, task completion and frontline adoption. Economics is integration days, total cost of hardware, compute, licensing and support, and willingness to pay. We scale only with measured operator benefit, viable economics and a repeatable delivery model. The risks: the evidence itself is noisy; the scanner lacks Western certification; video and face data leaving devices raise sovereignty and cyber questions; health estimation, expression inference and autonomous drone actions carry regulatory exposure; compute and token costs can erase margin; the scanner's chip supply is low-volume; and the organisational shift from an integration mindset to a product mindset is real. Everything here is a proposal to validate, not a demonstrated end-to-end capability.

## Closing

### 31 · The one-page takeaway
*From devices to connected operations*

To close, the one-page takeaway. Make every alert actionable, assigned and auditable. Prove video plus incident on ISMP V11 first. Validate glasses, millimeter wave, facial identity and fence sensing with evidence cards. Partner for digital twins, racks and sensors. Adopt the evaluation-set discipline for every AI feature. And keep agents behind the policy engine, with every action audited. That is the recap of Beijing. Use it to align the CTO, CMO, COO, CFO and CCO on one scoped validation, and return in ninety days with measured operator value and a go or no-go case. Thank you.

---

Sources: six AI-generated transcripts (3–4 Nov 2026, Beijing), two ST strategic infographics dated 2026-11-03, NUCTECH MW1000AA datasheet V2.0 (2022). Transcripts are noisy and unverified against audio; vendor identities, prices and performance claims are signals to validate.