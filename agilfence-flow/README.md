# AgilFence operator flow video

`agilfence-operator-flow.mp4` (1920×1080, 30 fps, 35 s, no subtitles) shows how an operator handles a fence alarm:

1. **Alarm**: a new "Fence Sector 5" critical alert arrives. The operator clicks **Locate**, and the map zooms to segment 5-14.
2. **Camera**: the Active Alarms panel opens. PTZ 7-02 thermal moves to its preset, LiDAR L-5B builds a point cloud, and CAM 7-11 shows the wide view. The investigation feed links the alarms.
3. **SOP flow**: steps 1 and 2 are checked automatically. The operator approves **Dispatch Patrol 2**, the patrol route appears on the map, and the tower is informed.
4. **Escalate**: the Escalate Event form is pre-filled. The operator clicks **Create Incident**, and incident PER-005 opens in Incident Management.

`flow.html` is the animated source. Open it in a browser to watch it play live.
To render the video again (needs Playwright with Chromium, and ffmpeg):

```sh
NODE_PATH=$(npm root -g) node agilfence-flow/render.js
```
