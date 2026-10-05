# Director's Notes · 《无数个今晚》 Countless Tonights

These notes lock the decisions every department (bible, shot list, previz, edit) must share.
The user's brief (`brief/treatment_zh.md`) is the authority on story and tone; these notes only
fill gaps and fix the technical contract. Output documents are written in **Chinese** (the
user's language); AI-generation prompts are given in **English and Chinese**.

## 1. Delivery contract

| Item | Value |
|---|---|
| Song | `无数个今晚` by qinyuansg, 256.824 s (4:16.82), played complete and unedited |
| Picture length | exactly the song: 24 fps, **6164 frames** (frame 0 … 6163) |
| Aspect | 2.39:1 scope, letterboxed inside 16:9 (1920×1080 deliverable, active 1920×804) |
| On-screen text | **none** in picture — titles, subtitles, credits are added in post (brief requirement) |
| Timing source | `timing/timing.json` (sections + every sung line with start/end + per-character times), `timing/beats.json` (beat grid, ~152 BPM pulse ≈ 76 BPM ballad feel, bar ≈ 3.16 s) |

Song map (seconds): INTRO 0–28.9 (sung "千年" 15.1, "有多远" 21.6) · V1 28.9–53.0 · GAP1 53–56 ·
PRE1 56.0–70.6 · CH1 70.6–101.6 (full-band stop 95.95–96.85 between 舍不得 / 的人间) · INTERLUDE 101.6–110.3
(no true silence — small dip 102.0–103.4; wordless vocalise from the 103.37 accent) · V2 110.3–135.4 · CH2 135.4–148.8 ·
BR1 148.8–174.6 (drops at 162.75, near-silent 164.25–165.6, hit 165.75) · BR2 174.6–204.0 (builds; full band enters
198.22, plateau to 203.2) · CH3 204.0–216.6 (pulled back until the surge at 214.25) · CH4 216.6–233.8 (loudest
sustained music 214.25–229 and 230.6–233.9; full-band stop 229.1–230.5; 232–233.4 is only a vocal gap) ·
OUTRO 233.8–246.6 (soft solo vocal, accents 237.0 / 240.35) · TAIL 246.6–256.824 (swell 245.9–249.3 = loudest
passage of the song; soft 249.3–252.4; final chord 252.55 decaying to the end).
*(Energy map corrected in the shot-list revision pass from measured RMS — see `shotlist/revision_log.md`.)*

## 2. Story anchors (fixed casting & eras)

The film is set in a fictional harbour city on the South China Sea. The museum is a converted
**old harbour customs house / godown** at the water's edge — the same building appears, earlier
in its life, in the "harbour across eras" sequence. **No real institution, flag, emblem or
uniform insignia is depicted**; all flags/insignia are invented, neutral designs.

| Code | Who | Era | Fixed details |
|---|---|---|---|
| `RESTORER` 修复师 | young woman, ~28, East Asian | present day | dark-grey wool coat with a small worn spot on the **left cuff** (pays off in the future vitrine), white cotton conservator gloves, hair loosely tied, magnifier headband or loupe at the bench. Works too late; reads dates easily, people not at all. |
| `GUARD` 夜班工作人员 | man, mid-60s | present day | navy night-shift attendant jacket (invented badge), reading glasses on a cord, flashlight, slightly stooped back, old phone. Nods to her in the INTERLUDE; she answers briefly. The person he hesitates to call is never identified (留白). |
| `NAVIGATOR` 航海人 | man, ~35, compass-keeper (火长) on an ocean-going junk | 17th–18th c. | salt-crusted hands, indigo cotton jacket; **inside the right cuff a patch of a different blue cloth** sewn by his family; brass compass engraved with 24 bearings and star marks; needle-route chart (针路图). |
| `WIFE` 等待的人 | woman, ~30 | same era, coastal home | the person at home: candle, cooling rice in the **blue-and-white bowl whose pattern matches the restorer's shards**, empty seat opposite. She is also the one who puts the **empty bowl under the eaves to catch rain**, and whose mending (the sleeve patch) is seen in the "补衣时羞涩的笑" insert. In CH2 a **child's small feet** appear beside her. Her face is never fully clear (seen through glass, candle, shadow). |
| `MIGRANT` 迁徙女性 | young woman, ~20 | 1920s–30s | crosses the sea to Nanyang. Faded floral cotton blouse, old shirt (a family member's) folded into a **rattan suitcase**, a small family keepsake on top (e.g. a cloth-wrapped wooden comb), a letter she writes and refolds, a **scrap of old shirt cloth tucked in the letter** (CH2), sweets in oil paper, a travel document that receives a **stamp**. |
| `MAPHAND` 掌管地图的手 | anonymous official's hand | colonial-administrative era | only hands/sleeve/ruler/pen are seen. Draws a line on a map ("有人要把山河握在掌间", "地图添一道线"). |
| `MOTHER` 祈祷的母亲 | woman, ~45, East Asian, in a foreign port's chapel | mid-20th c. | holds a folded letter; prays in a language and liturgy that are not hers; shoulders tremble. Whether she is connected to the migrant is left open — only the folded letter rhymes. |
| `COMPANION` 年轻同伴 | young sailor ~17 | navigator's era | the navigator puts his jacket over him (CH3). |
| `TRAVELLER` 紧张的旅客 | nervous young passenger | migrant's era | receives a sweet from the migrant (CH3). |
| `LONELY` 另一位孤单者 | an old person in the chapel | mother's era | the mother sits beside them (CH3). |
| `FUTURE` 未来观看者 | a stranger of an unspecified future | future | seen only as a reflection raising a hand toward the vitrine holding the restorer's coat. |

Key props: `CHART` 海图 · `COMPASS` 黄铜罗盘 · `SHARDS` 青花残片/`BOWL` 青花碗 · `PATCH` 袖口补丁 ·
`SHIRT` 旧衫 · `CASE` 藤箱 · `KEEPSAKE` 家人小物 · `LETTER` 信 · `SWEETS` 油纸糖 · `LAMP` 门口小灯 ·
`STAMP` 旅行印章 · `CANDLE` 蜡烛 · `SHIPLAMP` 船灯 · `GLOVES` 白手套 · `TEA` 两杯热茶 · `PHONE` 手机 ·
`COAT` 深灰外套.

## 3. Gaps the brief leaves open (director's guidance)

* **INTRO 0–28.9** – brief §一. The two sung words "千年" (15.1 s) and "有多远" (21.6 s) are real
  vocals; use them as beats inside the prelude (e.g. "千年" lands on the overlapping hands / the
  ship-lamp reflection; "有多远" on the pull-back revealing the compass alone). The guard's flashlight
  may sweep the gallery far in the background once (plants him).
* **GAP1 53–56** – a breath after "你想回的岸": hold the navigator's thought / the far coast, or the
  bridge back to the museum bench.
* **CH1 B 90–101.6** ("我隔着玻璃 认不出你的脸 / 却认得你 舍不得的人间") – the restorer looks into a
  vitrine; the reflected past faces never resolve, but a hand/gesture does.
* **INTERLUDE 101.6–110.3** – the modern world breathes: the **guard's nod** (brief §八 requires it to
  be planted earlier), her brief, distracted reply, then lead into the migrant's era.
* **BR1 155–174.6** ("你的明天…也读我没说完的喜欢") – the restorer reading the past more closely: e.g.
  a ledger/letter where the catalog only records dates, but a margin holds something unfinished
  (a pressed flower, a half-written line). Quiet, intimate; energy drops at 164.
* **TAIL 246.6–256.824** – the final teacup shot holds until the last note fully decays (brief §十一).

## 4. Shot-list contract (`shotlist/shots.json`)

An array of shots, **contiguous and complete**: `S001.in_frame = 0`, each `in_frame` equals the
previous `out_frame`, last `out_frame = 6164`. Times in frames at 24 fps (`in_frame` inclusive,
`out_frame` exclusive). Prefer cuts on beats from `beats.json` or on vocal breaths; long takes are
welcome where the brief asks for time ("让重要的眼神和动作有时间被看见"). Target ~70–100 shots.

```jsonc
{
  "id": "S001",
  "in_frame": 0, "out_frame": 96,           // [in, out) @24fps
  "section": "INTRO",                        // timing.json section id
  "treatment_ref": "一",                      // brief chapter (一…十一) or "gap"
  "lyric_ids": ["L000"], "lyric": "千年",    // lines sung during the shot ("" if none)
  "sync_points": [{"t": 15.14, "event": "two hands align exactly as 千 is sung"}],
  "era": "modern|navigator|home|migrant|maphand|chapel|future|multi",
  "scene": "museum_gallery",                 // previz module key, see §5
  "location": "…", "characters": ["RESTORER"], "props": ["GLOVES"],
  "shot_size": "ECU|CU|MCU|MS|MWS|WS|EWS|INSERT",
  "angle": "…", "lens_mm": 100, "camera_move": "…", "speed": "24|48 (50% slow motion)",
  "focus": "…", "lighting": "…",
  "action": "beat-by-beat what happens",
  "emotion": "what the viewer should feel/understand",
  "transition_in": {"type": "cut|match_cut|dissolve|reflection|light|fade_in", "frames": 0, "on": "what matches"},
  "continuity": "props/light/eyeline/screen-direction notes",
  "refs": ["CHAR_RESTORER", "PROP_GLOVES", "LOC_GALLERY"],   // bible reference ids
  "prompt_en": "…", "prompt_zh": "…", "negative": "…",       // AI video-generation prompts
  "previz_notes": "how the previz should approximate it"
}
```

## 5. Previz scene modules (value of `scene`)

| key | content |
|---|---|
| `museum_gallery` | modern night gallery in the old customs house: vitrines (compass vitrine, coat vitrine in the future variant), glass reflections that can show another era |
| `restoration_lab` | conservator's bench: lamp, blue-and-white shards, tools, ledger, window to harbour |
| `ship_cabin` | navigator's cramped cabin: chart, compass, candle, low beams |
| `sea_deck` | exterior: deck, huge sails, clouds, the vast dusk/night sea, distant shore light, ship lamp |
| `old_home` | coastal home interior (candle, bowl, empty seat, lattice window shadow) and eaves exterior (rain bowl) |
| `pier_waiting` | 1920s–30s pier & waiting hall: crowd, rattan case, farewells, stamp desk, steamer |
| `harbor_eras` | locked-off harbour frame changing across eras (junks → colonial customs house → steamers → cranes → museum) |
| `map_office` | official's desk: map, ruler, pen, hand drawing the line; threshold/checkpoint |
| `chapel` | foreign chapel with stained glass, falling coloured light, pews |
| `night_window` | modern window bench in the museum overlooking the harbour: guard, phone, two teacups, dawn |
| `corridor` | the long moonlit gallery whose glass panes each hold a different era's night (the film's signature image) |

Previz is a stylised moving storyboard (faceless figures, real lighting and camera); the shot list
itself describes the **final film**, not the limits of previz.
