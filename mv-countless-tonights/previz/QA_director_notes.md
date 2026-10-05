# Director's notes for the integration QA pass (from contact sheet v1, all shots at u=0.5)

Contact sheet v1: `previz/out/sheets_v1/page_*.jpg` (museum_gallery + corridor were still slates).

## Keep — these are the film's standard
S008 (lone junk on the dusk sea), S009 compass, S012/S013/S015 porcelain, S016 cold rice by candle, S018 city aerial,
S019 eaves + moon, S022 shore light, S046 harbour across eras, S055/S056 chapel light, S057/S058 mother,
S079 window bay at dawn, S080 harbour dawn, S081 the two teacups.

## Fix
1. **Faces in close-ups read as mannequins** (S010, S032, S065, S073, S074, also S076/S075 profiles). The previz figures are
   faceless by design, so close faces must be *lit and framed* to carry feeling without exposing the mask: low-key side or
   back light, faces partly in shadow or silhouette against a brighter background, shallower focus, catch-light/eye-line cues,
   slightly wider framing where the brief allows (MCU instead of ECU). S073: never a giant head filling the frame — favour
   the eye-line and the phone light. S074: his hand must not cover his face.
2. **Map office** (S021, S044, S047): heavy diagonal window-blind shadow stripes dominate the map; the map and the ink line
   must read first. S047's ink-in-fibre macro reads like fur — make it paper with a wet line.
3. **S007** mid-move (u=0.5) is an unreadable dark blur: the rise from cabin to sail must stay legible all the way.
4. **S045** too dark — the patch and the hand must read before the look to the shore.
5. **S049** composition unclear (red cloth / glove / sleeve fill the frame) — the aged handle → open case → letter must read.
6. **Awkward poses**: S067 (sleeping companion lies like a plank; the coat fall), S068 (arms of both figures stiff; the
   handover of the sweet must read as a tender small gesture), S048 (hand on handle scale).
7. **Grain uniformity**: engine grain is fixed (integer hash). Remove module-level grain workarounds (pier_waiting,
   night_window, any other) and use engine grain so the whole film has one grain.
8. **Exposure/grade continuity across cuts**: no shot should be black or murky at its first/last frame unless written as
   such; check each cut pair, especially cross-era match cuts and dissolves.
