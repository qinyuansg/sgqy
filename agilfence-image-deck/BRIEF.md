# AgilFence image flow — PowerPoint brief (no Co-pilot, AgilFence features only)

A visual, picture-led deck for the airport: how AgilFence protects the airfield perimeter, feature by feature,
from a touch on the fence to a confirmed response. **No AI Co-pilot anywhere** (no lavender, no "Co-pilot", no
AI summaries). Hero pictures on every slide; short words.

## Photo policy (from the product owner's research, 18–19 Oct 2026)
- Real photographs could not be downloaded from this environment (network policy). Every hero picture slot therefore
  holds a **stand-in render** (our stylised fence / thermal / patrol scenes or the V11 AgilFence frames) with a small
  corner tag **"Stand-in · replace with approved photo"** and the suggested source in the speaker notes.
- Suggested real sources (owner-verified): ST Engineering Annual Report 2018, p. 46 (AgilFence publicity photo —
  installation location unverified); A*STAR 2013 engineering-award announcement image (promotional, not verified as an
  airport); CAG Annual Report 2011/12, p. 58 (3 Aug 2011 joint announcement photo, not the fence); ST Engineering
  "Engineering with Passion" coverage; Changi Connections, Oct 2011; the AgilFence Changi case-study PDF (inaccessible).
- **Never label a generic AgilFence photo as "actual deployment at Changi Airport"** unless CAG or the AgilFence product
  team confirms it. The deck says "AgilFence (publicity photo)" or "Illustration" on each picture.
- Dates we may state: joint announcement 3 Aug 2011; Changi system officially commissioned 28 Feb 2013.

## Facts we may state (keep to these; indicative figures are marked)
- Fibre Bragg grating (FBG) sensors in one optical cable on the fence feel a climb, a cut or a lift of the fabric.
- The cable is passive optical: it senses with light, so it is immune to electromagnetic and radio interference and needs
  no power or electronics on the fence line.
- Pinpoints the disturbance to the segment, within a few metres.
- Adapts to wind, rain and jet blast to keep nuisance alarms low; signatures of a climb, a cut, a lift, wind and animals
  look different.
- iPAMS (the AgilFence alarm-management software) raises the alarm, shows the segment on the site map and calls up the
  camera preset for that segment (PTZ slews to the segment; thermal and visible views).
- Per-segment zones and sensitivity profiles; maintenance mode for planned works; self-diagnostics on the sensing cable
  and controllers (segment faults and tamper shown on the map).
- Outputs to the security platform (alarm, segment, time) so the alarm runs through AGIL Secure's alarm → incident →
  SOP → report workflow, the video wall and the patrol radio/app.
- Anything numeric beyond "a few metres" (cable lengths per controller, detection probability, nuisance-alarm rates,
  response times) is NOT stated; write "indicative · confirm with the AgilFence product team" if a number is wanted.
- No facial recognition, no automatic closure, no AI claims. Clock times only in the scenario (02:14:58 climb …).

## Scenario pictures available (assets dir)
`cctv/fence_pre_clean.jpg` perimeter road before the alarm · `cctv/fence_wide_clean.jpg` sector wide · `cctv/fence_ptz_clean.jpg`
PTZ on the climber · `cctv/thermal_clean.jpg` thermal person · `cctv/fence_inside_clean.jpg` auto-track inside the fence ·
`cctv/fence_patrol_clean.jpg` patrol with the person · `cctv/lidar_clean.jpg` LiDAR point cloud · `af/AF-01…09*.png` the V11
AgilFence frames at 2× (AF-01 illustration of the fence bay, cable, strain signature and climber; AF-02 system message;
AF-04 Locate with nearest cameras; AF-05 PTZ player; AF-06 command-centre wall 3840×2160; AF-08 patrol on scene) —
**crop away any lavender / Co-pilot element** (AF-03, AF-05 summary, AF-07 caption, AF-09 report draft: do not use those areas).
Backgrounds `bg2_*.jpg`, `bg3_*.jpg`, rendered art `viz_*.png`, geometry `visuals.json`, `af-anchors.json` (rects of AF elements).

## Slides (16:9, deck-v2 theme: navy, Arial, viewfinder brackets; amber `D4B741` is the AgilFence accent, no lavender)
| # | Slide | Picture (stand-in) | Words |
|---|---|---|---|
| 1 | Cover: **AgilFence on the airfield perimeter** — from a touch on the fence to a confirmed response | fence_pre (full bleed, graded) | Prepared for Changi Airport Group · October 2026 · pictures: AgilFence publicity / illustration |
| 2 | **The fence is the first sensor** — the perimeter challenge | fence_wide | kilometres of fence, weather, jet blast, wildlife, night; what a missed touch and what a nuisance alarm each cost (no numbers) |
| 3 | **One cable feels the fence** — FBG sensing | AF-01 crop (cable, strain signature) | climb · cut · lift; light, not electricity |
| 4 | **Pinpoint the segment** — within a few metres | AF-04 crop (fence line, segment 5-14, marker) | segment map, nearest cameras |
| 5 | **Built for an airfield** | fence_wide + three icon cards | passive optical at the fence; immune to EMI/RF; wind, rain and jet blast rejected |
| 6 | **Knows a climb from the wind** — signature classification | AF-01 strain signature crop + small waveform cards (climb / cut / lift / wind / animal), drawn natively | each signature labelled; nuisance alarms stay low |
| 7 | **Zones, sensitivity, maintenance mode** | native diagram: fence line with segments 5-09…5-19, sensitivity bands, a segment in maintenance | per-segment settings, planned works, schedules |
| 8 | **Alarm to picture in seconds** — iPAMS calls the camera preset | AF-02 toast crop + fence_ptz | alarm, segment, PTZ 7-02 slews to preset 5-14 |
| 9 | **See the person, day or night** — thermal and visible | thermal + fence_ptz side by side | verify on video before anyone moves |
| 10 | **The whole room sees one picture** — map and video wall | AF-06 (crop the wall) | live, wide, replay, LiDAR, map |
| 11 | **Health you can see** — self-diagnostics | native diagram: fence line with one segment fault and one tamper, health list | cable and controller health, segment faults, tamper, test alarms logged |
| 12 | **Into the same workflow** — AGIL Secure, patrol, tower | AF-08 (patrol on scene) + small chain diagram (AgilFence → iPAMS → AGIL Secure → operator → patrol) | alarm → incident → SOP → report; patrol radio/app; tower informed; clock times 02:14:58 → 02:18:08 → 02:44:20 |
| 13 | **Proven at Changi** | CAG announcement photo slot (stand-in: bg + text) | announced 3 Aug 2011 · commissioned 28 Feb 2013; on the airfield perimeter since |
| 14 | **What you saw** — the flow on one page | strip of the 9 AF steps (thumbnails, no lavender crops) | 02:14:58 climb → 02:44:20 closed |
| 15 | Close: **The fence feels it. Your team acts on it.** | fence_patrol | next: site walk and SOP-mapping workshop |
| A1 | Picture sources and labelling rule | table | the owner-verified sources list, the rule, which slides hold stand-ins |

Speaker notes: 2–3 short spoken paragraphs per slide, plain English, and on picture slides the line "Replace the stand-in
with: <source>". Nothing below 12 pt; keep FIT WARNINGS empty; validate with the pptx validator; no role labels, no model
identifiers, no Co-pilot.
