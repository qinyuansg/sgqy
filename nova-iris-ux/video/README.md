# Concept video: same moment, new interface

`NOVA-Iris-Concept.mp4` is the original NOVA+ reader recording with **only the screen replaced** by the Liquid Glass UI. Everything else is untouched: the device, the room, the handheld camera moves and the person's actions. The new UI reacts on the same frames the current UI did.

`NOVA-Iris-Before-After.mp4` plays both versions side by side, frame-synced, with a timeline that marks when each one tells the person the door is open. `before-after-poster.jpg` shows six of those moments as stills.

| File | Format |
|---|---|
| `NOVA-Iris-Concept.mp4` | 1080 × 1920, 30 fps, 10.37 s, H.264 + AAC (same length and beats as the recording) |
| `NOVA-Iris-Before-After.mp4` | 2160 × 2140, 30 fps, 10.37 s, with labels and a timeline |
| `before-after-poster.jpg` | Today vs Concept at 0.6, 1.3, 1.5, 2.0, 3.6 and 5.0 s |

The "Today" side shows the original screen, which includes the person's iris images and IR face feed. Keep those files internal. The concept video itself contains no biometric imagery.

## Timeline (mirrors the recording, 30 fps)

| Moment | Recording (frame) | Today's UI | Concept UI |
|---|---|---|---|
| Person steps in (97 → 62 cm) | 1–37 | "Please look up · Too far · 97 cm · 00:19" | *Come a little closer*: amber ring fills with the measured distance |
| In range | 38 | (no change) | *Look up at the light*: "Look here" lights up under the camera |
| Capture | 44 | "Iris captured" + iris photos | *Hold still*: cyan progress, abstract eye signatures |
| **Match** | **51 (1.67 s)** | Green tick | **Welcome, Ma Lun · Door unlocked**, chime, relock countdown |
| Welcome screen | 88 (2.9 s) | "Welcome Ma Lun" + device drawing | (already unlocked) |
| Door message | 130 (4.3 s) | "Door Unlocked · Please proceed." | (shown 2.6 s earlier) |
| Pass 2: position, look up, eyes, capture | 190 / 220 / 233 / 245 | Position face · Look up · live IR feed · iris photos | Find → Look (eyes lock at 233) → Hold still |
| **Match** | **254 (8.43 s)** | Green tick | **Welcome, Ma Lun · Door unlocked** |

## How it was made

1. **Screen tracking.** The screen is segmented by colour in every frame. Its edges are fitted with RANSAC and refined to sub-pixel accuracy (≈0.1 px RMS). The left edge is often out of shot, so it is solved with a pinhole-camera model (focal length, aspect 0.589, principal point) fitted on the frames where it is visible: **0.5 px RMS**. Rectifying the old UI's static header and footer through the tracks holds still to **0.3–0.5 px median**. The fast pan at the end is snapped to the measured screen region.
2. **UI animation.** `video_ui.py` draws every frame with the same Liquid Glass primitives as the Figma board (`../build_board.py`), at the panel's real 0.589 aspect, on the recorded timeline above. Chromium rasterises it.
3. **Compositing.** Each UI frame is warped onto the screen with sub-frame motion blur, LCD black level, highlight bloom, a glass reflection that shifts with the camera, matched softness and grain. A dark rim keeps the old screen's edges from showing.
4. **Sound.** The room audio is kept (including what sounds like the lock relay clicking at the match). The old 1.56 kHz beep is notched out and replaced by a soft rising chime on each match, plus a faint tick when "Look here" lights up.

`make_video.sh <recording.mov>` rebuilds both videos from the original recording, which is not stored in this repo.
