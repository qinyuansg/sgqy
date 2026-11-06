# -*- coding: utf-8 -*-
"""Customer-centric, story-driven scene definitions for the motion video.
Each scene: type, customer (chapter label), narration as a list of sentences, and beats keyed to sentence indexes.
"""
SCENES = []
def S(**kw):
    SCENES.append(kw)

# ---------------------------------------------------------------- COLD OPEN
S(type="vignettes", customer="", title="Three nights, one question",
  sentences=[
    "Two in the morning at a camp perimeter. A fence moves, and nobody is sure whether it was the wind or a person.",
    "Six in the morning at an airport security lane. The queue is forty people deep and every alarm means a pat-down.",
    "Nine in the morning at a land checkpoint. A passport takes too long, a face does not match, and a car has four occupants nobody can see.",
    "Eight customers. Different nights, same question: can an alert become an action, fast, by the right person, with proof?",
    "In Beijing, on the third and fourth of November 2026, we went looking for answers. This is what we found, told customer by customer.",
  ],
  beats=[{"s":0,"panel":0},{"s":1,"panel":1},{"s":2,"panel":2},{"s":3,"question":True},{"s":4,"date":True}])

S(type="customers", customer="", title="Eight customers, one platform",
  sentences=[
    "These are the customers this story is about.",
    "MINDEF and the SAF, with camps, sentry posts and armouries to protect.",
    "ICA, which runs the land, sea and air checkpoints.",
    "ROAMS, where a few operators watch many sites from one room.",
    "The Police, whose officers walk, respond and investigate.",
    "DSTA, which has to prove a system works and what it costs before it is bought.",
    "HTX, which brings new science into the Home Team quickly and safely.",
    "The airports, where security must not slow the passenger.",
    "And data centres, where racks, doors and assets are the crown jewels.",
    "All of them already run on, or next to, our ISMP V11 platform. Everything we saw in Beijing is judged by one test: does it make their alert actionable, assigned and auditable?",
  ],
  customers=[
    {"key":"mindef","name":"MINDEF / SAF","icon":"🪖","line":"Perimeter, sentries, armouries"},
    {"key":"ica","name":"ICA","icon":"🛂","line":"Checkpoints and identity"},
    {"key":"roams","name":"ROAMS","icon":"🛰️","line":"Remote operations & monitoring"},
    {"key":"police","name":"Police","icon":"👮","line":"Patrol, response, investigation"},
    {"key":"dsta","name":"DSTA","icon":"🔬","line":"Prove it works, prove the cost"},
    {"key":"htx","name":"HTX","icon":"🧪","line":"New science into the Home Team"},
    {"key":"airport","name":"Airport","icon":"✈️","line":"Security without the queue"},
    {"key":"dc","name":"Data centre","icon":"🖥️","line":"Racks, doors, assets"},
  ],
  beats=[{"s":1,"c":0},{"s":2,"c":1},{"s":3,"c":2},{"s":4,"c":3},{"s":5,"c":4},{"s":6,"c":5},{"s":7,"c":6},{"s":8,"c":7},{"s":9,"core":True}])

# ---------------------------------------------------------------- AIRPORT
S(type="problem", customer="airport", icon="✈️", title="The airport: security without the queue",
  persona="A screening officer, Terminal lane 3, 06:10",
  sentences=[
    "Start with the airport, because it is where the trade-off is most visible.",
    "The screening officer on lane three has a simple job description: miss nothing, and keep the line moving.",
    "Every metal detector alarm becomes a pat-down. Every pat-down is thirty seconds of a passenger's patience and an officer's attention.",
    "The airport, not the airline, pays for the lane. The equipment department owns it, and when one lane gets new equipment, the other lanes ask for theirs.",
    "And in Singapore the buyer wants two things at once: the price of a Chinese scanner and the certification of a Western one.",
    "So the question for this customer is not 'is the imaging good'. It is: does the whole lane move faster, with fewer hands on passengers, and will the regulator accept it?",
  ],
  day=["06:10 — queue is 40 deep", "Alarm → pat-down, 30 s each", "Officer attention split: screen, pat down, explain", "Equipment department owns the lane budget"],
  problems=[("Throughput","Every alarm costs the lane half a minute"),("Hands-on","Pat-downs are the pain for passengers and officers"),("Certification","Price of China, approval of the West"),("Scope","One lane bought, every lane wanted")],
  beats=[{"s":1,"day":0},{"s":2,"day":1,"p":0},{"s":2,"day":2,"p":1},{"s":3,"day":3,"p":3},{"s":4,"p":2},{"s":5,"caption":"Does the whole lane move faster, with fewer hands on passengers?"}])

S(type="flow", customer="airport", icon="✈️", title="What Beijing showed: a walk-through screening lane",
  nodes=[("🧑","Passenger\narrives"),("🪪","Face bound\nto record"),("🚶","Walks through\nmillimeter wave"),("🧠","Automatic threat\nrecognition"),("👮","Officer: pass\nor re-check"),("📋","Alarm → incident\nin ISMP / V11")],
  sentences=[
    "Here is the lane as the Beijing vendor described it, and as the NUCTECH datasheet documents a close relative of it.",
    "The passenger's face is bound to their record at the entrance.",
    "They walk through an active millimeter-wave portal. The datasheet version needs a two-second stand with arms slightly out; the booth unit claims continuous walking, and that difference is the whole business case.",
    "Automatic threat recognition marks hidden items, metallic or not, on a cartoon figure, so privacy is protected and the officer gets a location, not a naked image.",
    "The officer gives a pass or sends the passenger to a re-check, and only an alarm becomes an incident record on our platform, with the lane, the time and the evidence attached.",
    "Three field realities we heard: metal plates in shoes still trigger alarms, Europe wants a two-metre portal, and pushing screening to the building entrance creates its own queue.",
    "Deployed today in Beijing, Shanghai, Tianjin, Wuhan and Xinjiang, three units in Nigeria, and none yet in Southeast Asia. That is an open field.",
  ],
  facts=[("Datasheet","2 s scan · 4 s inspection · ECAC SSc 2.1 Type A · CE"),("Booth claim","Continuous walk-through — must be proven on a real lane"),("Privacy","Cartoon figure with marked location; no raw image"),("Realities","Shoe metal plates · 2 m height for Europe · entrance queues"),("Footprint","CN: 5 cities · Africa: 3 units · SEA: none yet")],
  beats=[{"s":1,"node":0},{"s":1,"node":1},{"s":2,"node":2,"fact":0},{"s":2,"fact":1},{"s":3,"node":3,"fact":2},{"s":4,"node":4},{"s":4,"node":5},{"s":5,"fact":3},{"s":6,"fact":4}])

S(type="split", customer="airport", icon="✈️", title="Fitting it to the airport's journey, and what we must prove",
  left_title="What the airport needs", right_title="What we can assemble",
  rows=[("A lane that moves faster with fewer pat-downs","Walk-through portal + officer re-check only on marked items"),
        ("A regulator that signs off","Vendor holds China civil-aviation GB ‘A3’ only; TSA / ECAC path must be mapped before any commitment"),
        ("One passenger journey from kerb to gate","Our airport biometrics line + passport OCR and chip read in ~3 s + screening on one identity record"),
        ("Equipment that stays up","Remote diagnostics and self-check at boot; thousands of smart racks already in airports for the compute behind it"),
        ("A price the equipment department can defend","Test ‘device + lane integration + lifecycle service’ against pat-down minutes saved")],
  prove=["Walk vs stop demo on a real lane","Target-item detection list, metallic and non-metallic","Peak throughput, nuisance alarms, re-check time","Certification roadmap in writing"],
  sentences=[
    "So how does it fit the airport we already serve?",
    "The airport needs a lane that moves faster with fewer pat-downs. The portal plus re-check only on marked items is exactly that, if the walk-through claim survives a real lane.",
    "The airport needs a regulator that signs off. The vendor holds only China's civil-aviation approval, so the certification path must be mapped before anyone commits.",
    "The airport wants one passenger journey from kerb to gate. Our biometrics line, a passport reader that does OCR and chip decoding in about three seconds, and the screening result can sit on one identity record.",
    "Equipment must stay up, and the vendor offers remote diagnostics and a self-check at every boot. The compute behind it lives in the kind of smart racks airports already deploy by the thousand.",
    "And the price has to be defensible: we test a device plus lane integration plus lifecycle service bundle against the pat-down minutes it saves.",
    "What we must prove before the airport sees a proposal: a walk-versus-stop demo on a real lane, a customer-approved target-item list, peak throughput with nuisance and re-check numbers, and a certification roadmap in writing.",
  ],
  beats=[{"s":1,"row":0},{"s":2,"row":1},{"s":3,"row":2},{"s":4,"row":3},{"s":5,"row":4},{"s":6,"prove":0},{"s":6,"prove":1},{"s":6,"prove":2},{"s":6,"prove":3}])

# ---------------------------------------------------------------- ICA
S(type="problem", customer="ica", icon="🛂", title="ICA: identity at the speed of the checkpoint",
  persona="A checkpoint officer, land crossing, 09:00 peak",
  sentences=[
    "Now the checkpoint.",
    "At nine in the morning the officer sees a bus, a motorcycle and a car with four occupants, all at once. Each needs an identity decision in seconds.",
    "A passport is read, a face is compared, sometimes a fingerprint is taken for a visa. If any step is slow or uncertain, the whole lane backs up.",
    "The law says what may be kept: a reader that holds passport data is a liability, not a feature.",
    "And the car is the blind spot. The officer can see the driver's face through the window, but not what the four occupants are carrying.",
    "ICA's question is about assurance per second: how much identity certainty can a lane produce without stopping the flow?",
  ],
  day=["09:00 — bus, bike, car with 4 occupants", "Passport → face → fingerprint, in seconds", "Retention rules: keep nothing you do not need", "The car interior is the blind spot"],
  problems=[("Assurance per second","Seconds per identity decision, at peak"),("Legal retention","Readers must not keep data"),("Vehicle occupants","Faces visible, contents not"),("Tiered trust","Face, QR, card, fingerprint for different risk")],
  beats=[{"s":1,"day":0,"p":0},{"s":2,"day":1,"p":3},{"s":3,"day":2,"p":1},{"s":4,"day":3,"p":2},{"s":5,"caption":"How much identity certainty can a lane produce without stopping the flow?"}])

S(type="flow", customer="ica", icon="🛂", title="What Beijing showed: an identity stack that fits the lane",
  nodes=[("📖","Passport: OCR\n+ chip, ~3 s"),("🙂","Face + liveness\n(standard now)"),("🖐️","Fingerprint slap\n/ roll for visas"),("🚶","Walk-through\nscreening"),("🚗","Vehicle occupant\nscreening"),("🗂️","One identity\nrecord + audit")],
  sentences=[
    "Beijing gave us the pieces of an identity stack, each one already in production somewhere.",
    "A passport reader that does both OCR of the data page and chip decoding in about three seconds, multilingual, and with no data retention by default because the law requires it.",
    "Face recognition where liveness detection is now standard and cheap on every camera, and where face plus QR is the most common pairing. Iris is around three thousand RMB per camera and sells poorly; palm vein is cheap but niche.",
    "Fingerprint capture: dual-finger, rolled and four-finger slap, already used for visas, airports and a Brazilian driving-licence programme.",
    "The same walk-through screening as the airport, which at rail stations is used mainly to find large items.",
    "And a vendor willing to quote vehicle occupant screening through a sixty-by-sixty centimetre window on a robotic arm, with a four-person side-by-side demo requested.",
    "Our part is the record: every step lands on one identity record with tiered assurance and an audit trail, which is what our identity management already does for the checkpoints we run.",
  ],
  facts=[("Passport","OCR + chip · ~3 s · no retention · multilingual"),("Face","Liveness standard · face + QR common · iris ~3k RMB, palm vein niche"),("Fingerprint","Slap, roll, dual-finger · visas, airports, licensing"),("Vehicle","60 × 60 cm window · robotic arm · demo requested"),("ST","One identity record · tiered assurance · audit")],
  beats=[{"s":1,"node":0,"fact":0},{"s":2,"node":1,"fact":1},{"s":3,"node":2,"fact":2},{"s":4,"node":3},{"s":5,"node":4,"fact":3},{"s":6,"node":5,"fact":4}])

S(type="split", customer="ica", icon="🛂", title="ICA: what to assemble, what to prove",
  left_title="What ICA needs", right_title="What we can assemble",
  rows=[("Identity decisions in seconds at peak","Reader + face + liveness on one record; fingerprint only when risk requires"),
        ("Zero unnecessary retention","Readers configured for no retention; features extracted and matched in our backend, only results stored"),
        ("The car interior visible","Vehicle occupant screening prototype; prove image quality through glass and the lane geometry"),
        ("Trust that scales with risk","Face + QR + card as tiered assurance; iris and palm vein reserved for the highest-security rooms")],
  prove=["Reader throughput and OCR accuracy on our documents","Face FAR / FRR with masks, glasses, lighting","Vehicle screening geometry and image quality","Retention and data-flow sign-off"],
  sentences=[
    "For ICA the assembly is about assurance per second.",
    "Identity decisions in seconds: reader, face and liveness on one record, with fingerprint only where the risk demands it.",
    "Zero unnecessary retention: readers configured to keep nothing, and face features extracted and matched in our own backend so only results are stored.",
    "The car interior made visible: a vehicle screening prototype, with image quality through glass and the lane geometry proven before anyone designs a lane around it.",
    "Trust that scales with risk: face, QR and card as tiers, with iris and palm vein reserved for the highest-security rooms.",
    "To prove: reader throughput and OCR accuracy on our document set, face error rates under masks, glasses and lighting, the vehicle screening geometry, and a retention and data-flow sign-off.",
  ],
  beats=[{"s":1,"row":0},{"s":2,"row":1},{"s":3,"row":2},{"s":4,"row":3},{"s":5,"prove":0},{"s":5,"prove":1},{"s":5,"prove":2},{"s":5,"prove":3}])

# ---------------------------------------------------------------- POLICE
S(type="problem", customer="police", icon="👮", title="Police: the officer who walks, responds and investigates",
  persona="A patrol officer on foot, and an investigator in the control room",
  sentences=[
    "Now the Police, and two people at once.",
    "The patrol officer walks with a radio in one hand and a phone in the other. The watch-list is in a system; the face in front of them is not.",
    "When something happens, the response is a chain of calls. Who acknowledged, who went, what they found and when it was closed live in four different places.",
    "The investigator in the control room has the opposite problem: hours of video from recorders of three brands, and a question that takes a day to answer.",
    "And before the shift even starts, there is the armoury, with weapons that must be issued, tracked and returned under a national standard.",
    "Leaders on the Beijing floor said it plainly: they want the first eighty percent of routine work taken off people, with a closed loop on the rest.",
  ],
  day=["Radio in one hand, phone in the other", "Response = a chain of calls, no single record", "Video from 3 recorder brands, one question, one day", "Armoury: issue, track, return under standard"],
  problems=[("Hands and eyes","Watch-lists live in systems, not in view"),("Closed loop","Acknowledge, go, find, close — in one place"),("Video search","Hours of footage, minutes of patience"),("Controlled assets","Weapons and ammunition under national rules")],
  beats=[{"s":1,"day":0,"p":0},{"s":2,"day":1,"p":1},{"s":3,"day":2,"p":2},{"s":4,"day":3,"p":3},{"s":5,"caption":"Take the first 80 % of routine work off people; close the loop on the rest."}])

S(type="flow", customer="police", icon="👮", title="What Beijing showed: the frontline loop, hands-free",
  nodes=[("🥽","Glasses or watch\non the officer"),("📸","First-person\ncapture"),("🧠","Match in our\nbackend"),("💡","Prompt on lens\nor wrist"),("✅","Officer\nconfirms"),("📋","Task in\nISMP / V11")],
  sentences=[
    "Two wearables stood out for the officer on foot.",
    "Smart glasses in two flavours: camera glasses that stream a first-person view to a command centre and run face recognition, and display-only glasses with no camera that show a watch-list, a prompt or a teleprompter on the lens, confirmed with a single tap.",
    "A patrol watch that receives alerts and short videos, where a voice command on the wrist triggers an action on the phone.",
    "The vendor will hand us the original image so that feature extraction and matching happen in our backend and only the result returns, which answers the first question any police IT security team will ask.",
    "Prescription lenses are fitted per wearer, pairing is Bluetooth to a phone or standalone Android under mobile device management, and the battery claim was up to eight hours, with the controller doubling as the battery pack.",
    "The loop we would build: capture, match, prompt, officer confirms, task created, every step on the record. The glasses are a terminal; the loop is the product.",
  ],
  facts=[("Glasses","Camera + face recognition, or display-only, single tap to confirm"),("Watch","Alerts and short video on the wrist; voice command → phone"),("Data","Vendor gives raw image; ST matches; only results return"),("Fit","Prescription lenses · Bluetooth or standalone Android + MDM · up to 8 h claimed"),("Rule","Terminal is replaceable; the loop is ours")],
  beats=[{"s":1,"node":0,"fact":0},{"s":2,"fact":1},{"s":3,"node":1},{"s":3,"node":2,"fact":2},{"s":4,"node":3,"fact":3},{"s":5,"node":4},{"s":5,"node":5,"fact":4}])

S(type="flow", customer="police", icon="👮", title="What Beijing showed: response, investigation and the armoury",
  nodes=[("📹","Camera detects\na fight"),("📡","Response plan\nfires"),("🚁","Drone to zone,\ncaptures faces"),("🔎","Text search on\nthird-party NVRs"),("🔐","Smart armoury\ncabinet"),("📍","UWB off-post\nalarm")],
  sentences=[
    "For response and investigation, three more signals.",
    "A control layer that commands any embodied terminal with pre-set plans: a camera detects a fight, a drone flies to the zone, captures faces and performs dispersal. Powerful, and it needs rules of engagement before any autonomous action.",
    "An edge node that connects to existing recorders, Dahua was named, and lets the investigator search video with text for a person or a trajectory at around sixteen times speed. The installed camera estate becomes searchable without replacing a camera.",
    "And for the armoury: smart cabinets with per-weapon locks, a master controller, and face authentication before an officer draws a weapon, with data reported to national level because a standard requires it.",
    "At a sentry post, an ultra-wideband tag inside the weapon and a base unit at the post raise an alarm the moment the weapon leaves, with a range of roughly three hundred metres. Presence, not positioning, and cheap.",
    "What we must prove for the Police: glasses versus a phone on one real task, the edge node's supported recorders and retrieval quality, and the rules of engagement for any autonomous response.",
  ],
  facts=[("Orchestration","Camera → plan → drone → faces → dispersal; needs rules of engagement"),("Investigation","Edge node on existing NVRs · text search · ~16× speed"),("Armoury","Per-weapon locks · face auth before issue · national reporting"),("Sentry","UWB tag + base unit · alarm on leaving · ~300 m"),("Prove","Glasses vs phone · NVR support and retrieval quality · rules of engagement")],
  beats=[{"s":1,"node":0,"node2":1},{"s":1,"node":2,"fact":0},{"s":2,"node":3,"fact":1},{"s":3,"node":4,"fact":2},{"s":4,"node":5,"fact":3},{"s":5,"fact":4}])

# ---------------------------------------------------------------- MINDEF
S(type="problem", customer="mindef", icon="🪖", title="MINDEF / SAF: the perimeter at two in the morning",
  persona="A duty officer, camp operations room, 02:00",
  sentences=[
    "Back to the fence at two in the morning, because that is MINDEF's night.",
    "The duty officer has kilometres of perimeter, a handful of patrols, and a sensor that cannot tell wind from a climber.",
    "Every false alarm sends a patrol out and teaches the team to trust the system a little less. Every missed one is the one that matters.",
    "Inside the camp, the rules are stricter than anywhere else: who may enter which room, when, as a contractor or on a weekend. Cards must be impossible to clone, readers impossible to tap, and nothing may touch a cloud.",
    "And the armoury and the key press are the same problem in a different cabinet.",
    "The question for this customer: can a disturbance become a located, verified, dispatched and closed event, at a nuisance rate the patrols can live with?",
  ],
  day=["02:00 — fence zone 7 reports movement", "Wind, animal or climber? Nobody knows yet", "Patrol sent; trust erodes with every false run", "Rooms, keys, weapons: rules nobody outside knows"],
  problems=[("Nuisance alarms","Wind, rain, animals send patrols out"),("Verification","Seeing the zone before sending people"),("Access rules","Who, when, which room — an ontology"),("Air-gapped","No cloud; un-clonable cards; secured readers")],
  beats=[{"s":1,"day":0,"p":1},{"s":2,"day":1,"day2":2,"p":0},{"s":3,"day":3,"p":2},{"s":3,"p":3},{"s":5,"caption":"A disturbance becomes a located, verified, dispatched, closed event — at a liveable nuisance rate."}])

S(type="flow", customer="mindef", icon="🪖", title="What Beijing showed: fence disturbance to closed event",
  nodes=[("🧗","Climb, cut\nor lift"),("〰️","Fence sensing\n+ calibration"),("📍","Zone alarm\n+ location"),("📹","Camera preset\n→ verify"),("🏃","Dispatch to\npatrol phone"),("✅","Close +\naudit")],
  sentences=[
    "The fence product we saw senses force, deformation or vibration on the fence itself; whether by tension, sensing cable or fibre still has to be confirmed with the exhibitor.",
    "A climb, a cut or a lift becomes a disturbance.",
    "On-site calibration and zone mapping turn it into a located alarm, and the hard part, discriminating wind, rain, vegetation and animals from a person, is where comparable products use micro-deformation signatures.",
    "On our platform, the zone alarm calls a camera preset so the duty officer sees the fence before anyone moves.",
    "Then a task goes to the nearest patrol's phone, or to glasses, with the clip attached; the patrol acknowledges, captures evidence, and the event is closed with a full audit trail.",
    "Acceptance must cover three cases: real intrusions, measured by detection, location error and latency; non-intrusions, measured as nuisance alarms per kilometre per day; and faults, measured by how visibly and quickly the system recovers.",
    "Our role is clear: partner for the sensor, own the zoning, the video linkage, the dispatch and the audit, and first check the overlap with the perimeter products we already sell.",
  ],
  facts=[("Sensor","Force / vibration on the fence; method (tension, cable, fibre) to confirm"),("Discrimination","Wind, rain, vegetation, animals vs a person — the real test"),("Verify","Zone alarm → camera preset → duty officer sees first"),("Dispatch","Task to patrol phone or glasses with the clip; close with audit"),("Acceptance","Intrusion · nuisance per km per day · fault recovery")],
  beats=[{"s":0,"node":0,"fact":0},{"s":1,"node":0},{"s":2,"node":1,"node2":2,"fact":1},{"s":3,"node":3,"fact":2},{"s":4,"node":4,"node2":5,"fact":3},{"s":5,"fact":4}])

S(type="split", customer="mindef", icon="🪖", title="MINDEF: the camp as one access and asset fabric",
  left_title="What the camp needs", right_title="What we can assemble",
  rows=[("A perimeter the patrols trust","Fence sensing + camera verification + dispatch and audit on ISMP; pilot one real fence segment first"),
        ("Rooms, keys and weapons under one rule set","Our identity ontology (who, when, which room, contractor, weekend) extended to key presses and smart gun cabinets with UWB presence tags"),
        ("Nothing clonable, nothing in the cloud","Un-clonable cards and secured readers stay; private models on our own GPUs if AI is used at all"),
        ("Agents and robots that can ask, never decide","If doors are ever exposed as MCP services, the policy engine decides and every action is audited")],
  prove=["One fence segment: intrusion and weather logs","Cabinet and tag survival in real duty cycles","Access-rule ontology coverage test","Offline and failure-recovery behaviour"],
  sentences=[
    "For the camp, the assembly is one access and asset fabric.",
    "A perimeter the patrols trust: fence sensing, camera verification, dispatch and audit on our platform, piloted on one real fence segment before anything else.",
    "Rooms, keys and weapons under one rule set: the identity ontology we already run, who, when, which room, contractor or weekend, extended to key presses and smart gun cabinets with presence tags.",
    "Nothing clonable and nothing in the cloud: our un-clonable cards and secured readers stay, and if any AI is used it runs as a private model on our own GPUs, which is exactly how the Beijing lab deploys for its own customers.",
    "Agents and robots that can ask but never decide: if doors are ever exposed as MCP services, the policy engine decides and every action is audited. The lab's advice was blunt: command-type operations belong on APIs, and tool selection at scale is the hard problem.",
    "To prove: one fence segment with intrusion and weather logs, cabinet and tag survival in real duty cycles, a coverage test of the access-rule ontology, and offline and failure-recovery behaviour.",
  ],
  beats=[{"s":1,"row":0},{"s":2,"row":1},{"s":3,"row":2},{"s":4,"row":3},{"s":5,"prove":0},{"s":5,"prove":1},{"s":5,"prove":2},{"s":5,"prove":3}])

# ---------------------------------------------------------------- ROAMS
S(type="problem", customer="roams", icon="🛰️", title="ROAMS: many sites, few operators, one picture",
  persona="A night operator responsible for twelve sites",
  sentences=[
    "ROAMS is the customer that watches many sites from one room.",
    "The night operator has twelve sites on the wall: different recorders, different building systems, different alarm panels, and one pair of eyes.",
    "An alarm on site nine means switching tools, finding the right camera, finding the right person on site, and writing it all up afterwards by hand.",
    "The buildings themselves generate half the noise: a chiller fault, a door held open, a rack running hot. None of it is security, all of it lands on the same desk.",
    "What this customer wants is not another dashboard. It is one incident record that already knows the site, the asset, the SOP and the person who must act.",
  ],
  day=["12 sites, 3 recorder brands, 2 building systems", "Alarm on site 9: switch tools, find camera, find person", "Chiller fault, door held, rack hot — same desk", "Write-up by hand at the end of the shift"],
  problems=[("Fragmentation","Tools per site, not one picture"),("Context","Which asset, which floor, which SOP?"),("Dispatch","Finding the right person on a remote site"),("Audit","Shift reports written by hand")],
  beats=[{"s":1,"day":0,"p":0},{"s":2,"day":1,"p":2},{"s":3,"day":2,"p":1},{"s":4,"day":3,"p":3},{"s":4,"caption":"One incident record that already knows the site, the asset, the SOP and the person."}])

S(type="flow", customer="roams", icon="🛰️", title="What Beijing showed: the remote operations loop",
  nodes=[("🏢","Site event:\nvideo, door, BMS"),("🖧","Edge node on\nexisting NVRs"),("🗺️","Digital twin:\nasset + location"),("📋","One incident\nrecord + SOP"),("⌚","Assign: phone,\nwatch, glasses"),("✅","Close + audit\nacross sites")],
  sentences=[
    "Three Beijing signals assemble into a remote operations loop.",
    "Edge nodes that attach to the recorders a site already has and make the video searchable and analysable without a forklift upgrade.",
    "A digital twin platform used from design to operations, with an operations centre that shows the building, its schedule and every connected system, on top of an IBMS that controls ventilation, drainage, chillers and lighting through DDC controllers and gateways.",
    "And response orchestration where an event becomes a plan, and a plan becomes a task on a phone, a watch or a pair of glasses, with acknowledgement and proof of closure.",
    "Our platform is the record in the middle: the event schema, the SOP, the asset and location context from the twin, and the audit trail across all twelve sites.",
    "The smart racks we saw add the last piece: temperature, humidity, power and compute status on the same central view, with cabinet doors opened by face, card or fingerprint.",
    "To prove: a live, not recorded, twin demo with real asset identifiers, read and write access to building points, which recorders the edge node supports, and the integration effort per site, because repeatability is the economics of this customer.",
  ],
  facts=[("Edge","Attach to existing NVRs; search and analyse without replacing cameras"),("Twin + IBMS","Design-to-operations model; HVAC, chillers, lighting, drainage via DDC"),("Orchestration","Event → plan → task on phone / watch / glasses → proof of closure"),("Racks","Temp, humidity, power, compute on one view; door by face / card / fingerprint"),("Prove","Live twin demo · BMS read / write · NVR support · integration days per site")],
  beats=[{"s":1,"node":0,"node2":1,"fact":0},{"s":2,"node":2,"fact":1},{"s":3,"node":4,"fact":2},{"s":4,"node":3},{"s":4,"node":5},{"s":5,"fact":3},{"s":6,"fact":4}])

# ---------------------------------------------------------------- DSTA
S(type="problem", customer="dsta", icon="🔬", title="DSTA: how do we know it works, and what will it cost to run?",
  persona="A programme manager and an evaluator, before any purchase",
  sentences=[
    "DSTA asks the questions every other customer is glad someone asks.",
    "Does it actually work, on our data, in our environment, and how would we know?",
    "What does it cost to run for ten years: hardware, cooling, power, licences, patches, people?",
    "Is the supply chain stable, and what happens when a chip or a model is no longer available?",
    "And can it be certified and secured to the standard the mission requires, with no cloud and no shortcuts?",
    "Beijing had more to say to DSTA than any booth would admit, because the best answers came from a lab, not a vendor.",
  ],
  day=["Evidence on our data, not the vendor's demo", "Ten-year run cost: hardware, cooling, licences, patching", "Supply: chips, models, vendors that disappear", "Certification and cyber, with no cloud"],
  problems=[("Evidence","Demo claims are not test results"),("Economics","Compute and support decide the margin"),("Supply","65 nm chips at low volume; model licences"),("Assurance","Certification, patching, air-gap")],
  beats=[{"s":1,"day":0,"p":0},{"s":2,"day":1,"p":1},{"s":3,"day":2,"p":2},{"s":4,"day":3,"p":3},{"s":5,"caption":"The best answers for DSTA came from a lab, not a booth."}])

S(type="flow", customer="dsta", icon="🔬", title="What the lab showed: evidence first, then the model",
  nodes=[("🎯","Customer scenario\n+ knowledge"),("📐","Build the\nevaluation set"),("🔍","Measure and\ndiagnose"),("🧹","Govern the\ndata"),("🔁","Fix, then\nfine-tune"),("🖥️","Deploy private,\non own GPUs")],
  sentences=[
    "The Peking University institute deploys vertical models in hospitals and factories, and its method is DSTA's method.",
    "Start from the customer's scenario and knowledge, never from a model.",
    "Build an expert-confirmed evaluation set first. They called it the biggest human value contribution in the whole process.",
    "Measure, then diagnose where points are lost: retrieval, summarisation or reasoning. Fine-tuning is not the default answer to a five-percent error.",
    "Govern the data: clean noisy knowledge, resolve conflicts, use graphs and ontology where they help.",
    "Fix without touching the model where possible, and fine-tune periodically from the accumulated set. Systems take one to two months, not a year.",
    "Deploy privately on your own GPUs, because customers refuse cloud: Qwen for multilingual work, DeepSeek, Mistral for Europe, Zhipu for state enterprises.",
    "On compute economics, the floor quoted a Huawei eight-card server at around seven hundred thousand RMB, domestic chips at seventy to eighty percent of an NVIDIA 3090 or 4090, and two 5090 cards at about fifteen and a half thousand. Every figure is a quote to verify, and the rule is to benchmark the real workload on quality, latency, uptime and total cost.",
  ],
  facts=[("Principle","Scenario first; the evaluation set is the biggest human contribution"),("Diagnosis","Retrieval vs summarisation vs reasoning before any fine-tune"),("Speed","Systems in 1–2 months; proposals in a day"),("Models","Qwen · DeepSeek · Mistral (EU) · Zhipu (SOE) — private, on-prem"),("Compute quotes","8-card ≈ 700k RMB · domestic chip 70–80 % of 3090/4090 · 2×5090 ≈ 15.5k")],
  beats=[{"s":1,"node":0},{"s":2,"node":1,"fact":0},{"s":3,"node":2,"fact":1},{"s":4,"node":3},{"s":5,"node":4,"fact":2},{"s":6,"node":5,"fact":3},{"s":7,"fact":4}])

S(type="split", customer="dsta", icon="🔬", title="DSTA: the evidence pack we would bring",
  left_title="What DSTA will ask", right_title="What we bring back",
  rows=[("Does it work on our data?","An evaluation set built with the customer's experts, and scores before and after each change"),
        ("What does it cost to run?","A workload benchmark across edge and on-prem options: quality, latency, uptime, total cost; written quotes, not booth figures"),
        ("Is the supply chain stable?","Scanner chips are 65 nm at low volume with a domestic-chip transition under way; model licences checked (Qwen is permissive)"),
        ("Is it certified and secure?","Certification roadmap per device; private deployment; quarterly patching as a budgeted line, which the Beijing side admitted it skips")],
  prove=["Evaluation set + baseline scores","Workload benchmark with written quotes","Supply and licence review","Security and certification plan"],
  sentences=[
    "So the evidence pack for DSTA writes itself.",
    "Does it work on our data? An evaluation set built with the customer's own experts, and scores before and after each change.",
    "What does it cost to run? A workload benchmark across edge and on-prem options on quality, latency, uptime and total cost, with written quotes rather than booth figures.",
    "Is the supply chain stable? The scanner's chips are sixty-five nanometre at low volume with a domestic transition under way, and model licences are checked up front.",
    "Is it certified and secure? A certification roadmap per device, private deployment, and quarterly patching budgeted as a line item, which the Beijing side openly admitted it does not do.",
    "That is the pack: evaluation set and baseline, benchmark with quotes, supply and licence review, security and certification plan.",
  ],
  beats=[{"s":1,"row":0},{"s":2,"row":1},{"s":3,"row":2},{"s":4,"row":3},{"s":5,"prove":0},{"s":5,"prove":1},{"s":5,"prove":2},{"s":5,"prove":3}])

# ---------------------------------------------------------------- HTX
S(type="problem", customer="htx", icon="🧪", title="HTX: new science into the Home Team, quickly and safely",
  persona="A capability lead with a six-month window and a regulator watching",
  sentences=[
    "HTX lives between a demo and a deployment.",
    "Its job is to bring new science to the Police, ICA, prisons and civil defence in months, not years, and to know which claims are real.",
    "In Beijing that meant faces that report emotion, age and blood pressure, robots that patrol, drones that respond, and algorithms sold by industry.",
    "Each one comes with a regulatory edge: a health estimate is not a diagnosis, an expression is not an intent, and an autonomous drone needs rules before it needs a battery.",
    "The question for HTX is a sorting question: what is ready for a Home Team pilot, what needs evidence first, and what belongs on a watchlist?",
  ],
  day=["Six-month window per capability", "Face AI: identity, age, expression, blood pressure", "Robots, drones, embodied terminals", "Regulator and public trust in the loop"],
  problems=[("Claim vs evidence","Which demo survives a test set?"),("Boundaries","Health ≠ diagnosis; expression ≠ intent"),("Autonomy","Drones and robots need rules of engagement"),("Speed","POCs in 1–2 months with the right partner")],
  beats=[{"s":1,"day":0,"p":3},{"s":2,"day":1,"day2":2,"p":0},{"s":3,"p":1},{"s":3,"day":3,"p":2},{"s":4,"caption":"Ready for a pilot, evidence first, or watchlist?"}])

S(type="split", customer="htx", icon="🧪", title="What Beijing showed, sorted the way HTX sorts",
  left_title="Pilot now", right_title="Evidence first, or watch",
  rows=[("Facial identity into gates: liveness is standard, face + QR is the norm; vendor gives the raw image so we match it ourselves","Facial blood pressure: probably video rPPG, mechanism unconfirmed; needs a reference-device study and an intended use before any claim"),
        ("Edge AI model packs by industry: helmet and vest for safety, plates and faces for enforcement, 24-hour construction supervision","Expression and emotion tags (smile, angry, hand in pocket): visible expression only; never an inference of danger"),
        ("Response orchestration with staged dispatch and proof of closure","Autonomous drone dispersal: rules of engagement and legal review before any live trial"),
        ("Co-development with a lab: POC in 1–2 months, one themed workshop for our engineers first","Companion robots, humanoids, virtual try-on, digital-human guides: adjacent, watch only")],
  prove=["Identity test at one gate","Model-pack accuracy on our footage","Staged-dispatch pilot with closure proof","BP reference study design (if pursued)"],
  sentences=[
    "Sorted the way HTX sorts, Beijing splits cleanly.",
    "Pilot now: facial identity into gates, because liveness is standard and the vendor will give us the raw image to match ourselves. Evidence first: facial blood pressure, which is probably video photoplethysmography but unconfirmed, and needs a reference study and an intended use before any claim.",
    "Pilot now: edge AI model packs by industry, helmet and vest for safety, plates and faces for enforcement. Evidence first: expression and emotion tags, which are visible expression only and never an inference of danger.",
    "Pilot now: response orchestration with staged dispatch and proof of closure. Evidence first: autonomous dispersal by drone, which needs rules of engagement and legal review before a live trial.",
    "Pilot now: co-development with the Beijing lab, a proof of concept in one to two months, starting with one themed workshop for our engineers. Watch only: companion robots, humanoids, virtual try-on and digital-human guides.",
    "To prove: an identity test at one gate, model-pack accuracy on our own footage, a staged-dispatch pilot with closure proof, and, only if pursued, a properly designed blood-pressure reference study.",
  ],
  beats=[{"s":1,"row":0},{"s":2,"row":1},{"s":3,"row":2},{"s":4,"row":3},{"s":5,"prove":0},{"s":5,"prove":1},{"s":5,"prove":2},{"s":5,"prove":3}])

# ---------------------------------------------------------------- DATA CENTRE
S(type="problem", customer="dc", icon="🖥️", title="Data centre: racks, doors and assets that must not leave",
  persona="A facility security manager during a 03:00 maintenance window",
  sentences=[
    "The data centre's night is a maintenance window at three in the morning.",
    "A contractor needs rack forty-two, and only rack forty-two, for ninety minutes. The security manager must grant it, see it, and prove afterwards that nothing else was touched.",
    "The racks themselves have a pulse: temperature, humidity, power draw, a door that stayed open too long. Today that lives in a facilities tool, not a security one.",
    "Assets walk: a drive, a tape, a laptop. The alarm that matters is 'this left the zone', not 'where is it on a map'.",
    "And the perimeter and the lobby are the same story as every other customer, only with higher stakes per minute of downtime.",
    "The question: one record, from the fence to the rack door, with the contractor, the rack, the time and the evidence on it.",
  ],
  day=["03:00 — contractor needs rack 42 for 90 min", "Grant, see, prove afterwards", "Rack telemetry lives in a facilities tool", "A drive leaves the zone: did anyone notice?"],
  problems=[("Granular access","Rack-level, time-boxed, contractor-aware"),("Telemetry","Heat, power, door state as security signals"),("Assets","‘Left the zone’ alarms"),("Audit","Prove nothing else was touched")],
  beats=[{"s":1,"day":0,"day2":1,"p":0},{"s":2,"day":2,"p":1},{"s":3,"day":3,"p":2},{"s":4,"p":3},{"s":5,"caption":"One record from the fence to the rack door: contractor, rack, time, evidence."}])

S(type="flow", customer="dc", icon="🖥️", title="What Beijing showed: the rack as part of the security record",
  nodes=[("〰️","Fence zone\nalarm"),("🙂","Lobby: face,\ncard, fingerprint"),("🗄️","Rack door opens\nby identity"),("🌡️","Rack telemetry\non the platform"),("📍","UWB: asset\nleft the zone"),("📋","One record:\nwho, what, when")],
  sentences=[
    "From the fence to the rack door, every piece we need was on the floor.",
    "The same fence sensing and camera verification as the camp, feeding the same incident record.",
    "At the lobby and the cage, face, card or fingerprint, with liveness standard; the vendor's own words were 'make ours the same' when we asked about cabinet access by face.",
    "Smart power racks whose doors open by identity, and whose temperature, humidity, power draw and compute status report to one central platform. Airports already run these by the thousand, in sealed, air-cooled rows with cold and hot aisles.",
    "An ultra-wideband tag on an asset and a base unit on the zone: the alarm fires when the asset leaves, roughly three hundred metres of range, presence rather than positioning, and cheap enough to tag everything that matters.",
    "Our platform already manages keys, cabinets and racks for military and critical sites. The data-centre version is the same product pattern with the rack telemetry added as a security signal, and the contractor's ninety minutes on rack forty-two as a time-boxed grant with evidence.",
    "If a robot or an agent ever asks to open that cage, the answer comes from the policy engine, not the agent, and it is audited either way.",
  ],
  facts=[("Fence","Same sensing and verification as the camp; same record"),("Doors","Face, card, fingerprint; liveness standard; cage and cabinet"),("Racks","Door by identity · temp, humidity, power, compute on one platform · hot / cold aisles"),("Assets","UWB tag + base unit · alarm on leaving · ~300 m"),("ST","Key, cabinet and rack management extended; agents behind the policy engine")],
  beats=[{"s":1,"node":0,"fact":0},{"s":2,"node":1,"fact":1},{"s":3,"node":2,"node2":3,"fact":2},{"s":4,"node":4,"fact":3},{"s":5,"node":5,"fact":4},{"s":6}])

# ---------------------------------------------------------------- SYNTHESIS
S(type="hub", customer="", title="One platform, eight customers",
  core="ISMP / V11\nevent · SOP · dispatch · audit · identity ontology",
  spokes=[("mindef","🪖","MINDEF","Fence → verify → dispatch · armoury · access rules"),
          ("ica","🛂","ICA","Passport · face · fingerprint · screening on one record"),
          ("roams","🛰️","ROAMS","Edge nodes · twin + IBMS · one incident across sites"),
          ("police","👮","Police","Glasses · watch · NVR search · armoury"),
          ("dsta","🔬","DSTA","Evaluation set · benchmark · certification plan"),
          ("htx","🧪","HTX","Identity now · model packs · evidence-first health"),
          ("airport","✈️","Airport","Walk-through lane · biometrics journey · racks"),
          ("dc","🖥️","Data centre","Rack doors · telemetry · UWB assets")],
  sentences=[
    "Step back and the eight stories are one picture.",
    "In the middle is the platform we already own: one incident record, the SOP, dispatch, audit, and the identity ontology that outside vendors told us they cannot replicate.",
    "Around it, each customer plugs in different sensors and terminals: fence and armoury for the camp, passport and face and vehicle screening for the checkpoint, edge nodes and the twin for remote operations, glasses and the watch for the officer, the evaluation pack for DSTA, sorted capabilities for HTX, the walk-through lane for the airport, rack doors and asset tags for the data centre.",
    "Devices and algorithms are replaceable; the Chinese market itself is component-driven and weak on integration, several vendors said so.",
    "The event interface, the responsibility for the response, the evidence and the service experience stay with us. That is the product, and that is the moat.",
  ],
  beats=[{"s":1,"core":True},{"s":2,"spoke":0},{"s":2,"spoke":1},{"s":2,"spoke":2},{"s":2,"spoke":3},{"s":2,"spoke":4},{"s":2,"spoke":5},{"s":2,"spoke":6},{"s":2,"spoke":7},{"s":4,"ring":True}])

S(type="timeline", customer="", title="Where to start, customer by customer",
  cols=[("NOW · 0–90 days · prove", [("mindef","One fence segment: intrusion and weather logs"),("police","Glasses vs phone on one real task"),("airport","Walk / stop demo + certification roadmap"),("ica","Reader and face tests on our documents"),("dsta","Evaluation set + workload benchmark"),("roams","Live twin demo + NVR edge node on one site")]),
        ("NEXT · 3–12 months · extend", [("mindef","Dispatch loop to patrol phones and glasses"),("police","NVR text search for investigators; armoury cabinets"),("airport","One walk-through lane at one checkpoint if certified"),("dc","Rack telemetry as a security signal; UWB tags"),("htx","Identity at one gate; model packs on our footage"),("roams","One incident record across three sites")]),
        ("LATER · 12–24 months · platform", [("ica","Entrance family: identity + screening + vehicle lane"),("dc","Agent-ready cage control behind the policy engine"),("roams","Twin + IBMS assets linked to incidents"),("airport","Kerb-to-gate biometrics with screening on one record"),("dsta","Evidence pack as a standard deliverable"),("htx","Health estimation only with a reference study")])],
  sentences=[
    "Where to start, customer by customer, gated by evidence.",
    "In the first ninety days we prove: one fence segment for the camp, glasses against a phone for the Police, the walk-or-stop demo and certification roadmap for the airport, reader and face tests for ICA, the evaluation set and benchmark for DSTA, and a live twin demo with an edge node on one site for remote operations.",
    "From three to twelve months we extend: the dispatch loop to patrol phones and glasses, video search for investigators and armoury cabinets, one walk-through lane if certification holds, rack telemetry and asset tags for the data centre, identity at one gate and model packs for HTX, and one incident record across three remote sites.",
    "From twelve to twenty-four months the platform work: an entrance product family for ICA with a vehicle lane, agent-ready cage control behind the policy engine, twin and building assets linked to incidents, kerb-to-gate biometrics, the evidence pack as a standard deliverable, and health estimation only if a reference study earns it.",
  ],
  beats=[{"s":1,"col":0},{"s":2,"col":1},{"s":3,"col":2}])

S(type="decisions", customer="", title="What leadership decides, and what each customer gets back",
  execs=[("CEO","Sponsor one scoped validation per customer cluster; set the scale gate","A named pilot customer and agreed decision criteria"),
         ("CTO","Architecture spike, vendor validation, MCP security model, benchmark","Integration proof and the workload quality / cost benchmark"),
         ("CMO","Customer discovery and packaging: entrance, patrol, perimeter sold separately; health within evidence","Buyer need, outcome narrative, willingness to pay"),
         ("COO","Pilot operations: SOPs, accountable responder, nuisance-alarm handling, support","SOP, response owner, support handover, adoption data"),
         ("CFO","Investment cap and economics gate: hardware, compute, licences, token vs on-prem","Total cost per site and the margin on device + service bundles"),
         ("CCO","Partner terms with glasses, scanner and sensor vendors; certification roadmap; lab co-operation; SEA and Middle East entry","Signed scopes, certification plan, partner shortlist, first paying scenario")],
  criteria=[("Value","Minutes per incident · acknowledgement and closure time · pat-down and patrol minutes saved"),("Quality","False and missed alerts · task completion · frontline adoption"),("Economics","Integration days · hardware, compute, licence, support cost · willingness to pay")],
  sentences=[
    "What leadership decides, so that each customer gets something back.",
    "The CEO sponsors one scoped validation per customer cluster and sets the scale gate; the customer gets a named pilot with agreed criteria.",
    "The CTO owns the architecture spike, vendor validation and the MCP security model; the customer gets integration proof and a benchmark.",
    "The CMO packages entrance, patrol and perimeter value separately and keeps health claims inside the evidence; the customer gets an outcome narrative that matches their day.",
    "The COO owns pilot operations: SOPs, an accountable responder, nuisance-alarm handling and support; the customer gets a response owner and a handover.",
    "The CFO sets the investment cap and the economics gate, including token versus on-prem; the customer gets a price the equipment department can defend.",
    "The CCO owns partner terms, the certification roadmap, the lab co-operation and regional entry; the customer gets signed scopes instead of booth promises.",
    "Success is measured in the customer's units: minutes per incident, pat-down and patrol minutes saved, false and missed alerts, adoption, integration days and total cost. We scale only with measured benefit, viable economics and a repeatable delivery model.",
  ],
  beats=[{"s":1,"e":0},{"s":2,"e":1},{"s":3,"e":2},{"s":4,"e":3},{"s":5,"e":4},{"s":6,"e":5},{"s":7,"crit":True}])

S(type="close", customer="", title="Two in the morning, again",
  lines=["02:00 — fence zone 7 moves","02:00:20 — camera preset: a person, climbing","02:00:45 — task to patrol B, clip attached","02:01:10 — acknowledged, en route","02:06:30 — resolved, evidence captured","02:07:00 — closed · audited · one record"],
  thesis="Make every alert actionable, assigned and auditable.",
  sentences=[
    "Two in the morning, again. The fence in zone seven moves.",
    "Twenty seconds later the duty officer is looking at a person climbing, not a sensor graph.",
    "Forty-five seconds in, the task is on patrol B's phone with the clip attached; it is acknowledged, they are en route.",
    "Six minutes later it is resolved with evidence, and seven minutes in it is closed, audited, on one record that the camp, the Police, the checkpoint, the airport and the data centre would all recognise.",
    "That is what Beijing contributes, customer by customer: not devices, but the pieces of a loop we already own the middle of.",
    "Make every alert actionable, assigned and auditable. Prove it on one customer, with their numbers, in ninety days, and bring back the case to scale, revise or stop.",
  ],
  beats=[{"s":0,"line":0},{"s":1,"line":1},{"s":2,"line":2},{"s":2,"line":3},{"s":3,"line":4},{"s":3,"line":5},{"s":5,"thesis":True}])
