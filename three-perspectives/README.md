# 三个视角 —— 讲解视频

一段约 8.6 分钟的 1080p 讲解视频（`three-perspectives.mp4`），全面解释看待一件事的三个视角：

1. **事实的视角**：像一台摄像机，只记录看得见、听得见、可验证的东西（附“哪句是事实”小测验）
2. **我的视角**：我的感受、需要、经历、期待（附“事实 + 感受 + 需要 + 请求”表达公式）
3. **别人的视角**：对方的处境、信息、压力和动机（理解 ≠ 认同、善意假设）

随后用四个例子把三个视角串起来：同事开会迟到、消息已读不回、孩子考了 70 分、网上“地铁不让座”视频。
最后讲“只用一个视角”的三个陷阱、“遇事三问”方法和一个小练习。

视频为图文动画 + 背景音乐（无人声旁白）。

## 重新生成

```bash
pip install pillow numpy
python3 make_video.py            # 输出 three-perspectives.mp4
python3 make_video.py preview    # 只导出每个场景的静态预览图到 build/
```

需要 `ffmpeg` 和文泉驿正黑字体（`/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc`）。
