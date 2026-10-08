# AI Use Case 1 — AI-powered AGIL® Secure ISMS for Airports
### 视频脚本与产品提炼 · Video script & product distillation

> 概念视频 · 3:08 · 1920×1080 · 英文旁白 + 中英双语字幕。场景、人名与数据均为示意（画面已标注 *Illustrative scenario · simulated data*）。
> Concept video. Scenario, names and data are illustrative.

---

## 1. 产品提炼 · Product distillation

### 一句话定位 · Positioning
**为机场安保控制室装上 AI 智能助手（Copilot）：在已经统一了门禁、视频、入侵探测与身份管理的 AGIL® Secure ISMS（Integrated Security Management System，综合安防管理系统）之上，用 AI 完成"识别—研判—调查—处置—报告"，并提前预判拥堵与设备故障。人始终掌握决策权。**
*An AI co-pilot for the airport security control room — built into the AGIL® Secure ISMS that already unifies access control, video, intrusion detection and identity. People stay in command.*

**Tagline:** From alarm noise to decisive action. · 从告警噪声，到果断行动。

### 痛点 · Pain points（每个痛点对应一个角色）
| # | 痛点 Pain | 表现 What it looks like | 角色 Who feels it |
|---|---|---|---|
| 1 | 告警疲劳 Alarm fatigue | 真实威胁淹没在大量无效告警中（示例：一小时 312 条告警，仅 3 起事件） | 值守员 Operator |
| 2 | 态势割裂 Fragmented picture | 系统彼此孤立、跨区域视野有限，每条告警都靠人工核实 | 值守员 Operator |
| 3 | 调查缓慢 Slow investigation | 追踪一个人要翻看数小时录像 | 值守员 / 调查员 |
| 4 | 处置不一致 Inconsistent response | 处置效果取决于当班人员，SOP 停留在纸面 | 值班经理 Duty manager |
| 5 | 审计留痕参差 Patchy auditability | 报告与证据靠人工整理 | 安保主管 Head of security |
| 6 | 被动运营 Reactive operations | 排队拥堵与设备故障在造成影响后才被发现 | 值班经理 Duty manager |

**不确定的代价（公开数据）：** 巴黎各机场 2017 年因无人看管行李告警造成 **1,280 次延误**，每次告警排查可长达约 **45 分钟**（来源：Groupe ADP 数据，Air Journal 2018 年 1 月报道）。

### 解决方案 · Solution
三层架构，AI 是一次**升级**而非推倒重来（画面中明确区分"已部署平台"与"本用例提出的 AI 层"）：
1. **既有安防子系统** — 门禁、CCTV/VMS、视频分析、入侵探测、身份管理、其他物理安防传感器。
2. **AGIL® Secure ISMS（已部署平台）** — 统一运营视图，厂商中立，兼容既有系统（已在印尼 Dhoho Kediri 国际机场运行）。
3. **AI 智能助手（AI Use Case 1 提出的新增层）** — 辅助式 AI，所有干预动作由人批准。

### 核心功能 · Core capabilities（7 项，每项对应一个痛点）
| 阶段 | 功能 Capability | AI 做什么 What the AI does | 消除的痛点 |
|---|---|---|---|
| 事件全周期 | **Detect 识别** | 识别异常行为：尾随、徘徊、无人看管物品 | 态势割裂 |
| | **Triage 研判** | 结合情境的告警分级：融合多系统告警、风险评分、给出依据 | 告警疲劳 |
| | **Investigate 调查** | 自然语言视频检索 + 跨摄像头追踪 | 调查缓慢 |
| | **Respond 处置** | 依据机场 SOP 推荐处置步骤，人一键批准 | 处置不一致 |
| | **Report 报告** | 自动起草事件报告，完整审计轨迹 | 审计留痕参差 |
| 主动预防 | **Anticipate 预判** | 旅客流量预测，提前看到各区域拥堵 | 被动运营 |
| | **Maintain 运维** | 设备与网络健康预测，故障前预警 | 被动运营 |

> 依据：用户提供的 InnoChamp 2026 申报材料中，ISMP 的 AI 能力包括"异常行为模式识别、情境感知的告警研判、AI 推荐威胁处置、旅客流量分析与拥堵预测、设备与网络健康监测及预防性维护"。自然语言视频检索与报告自动起草为本用例的延伸设想（概念）。

### 设计理念 · Design principles
1. **人始终掌握决策 Human in command** — AI 只建议，人做决定；每个干预动作都经批准并留痕。
2. **可解释 Explainable** — 每个评分、每条建议都附带证据，没有黑箱；误报会被归并并注明原因，绝不悄然丢弃。
3. **扎根于 SOP Grounded in SOPs** — 处置建议严格依据机场自身的作业程序与法规。
4. **安全设计 Secure by design** — 零信任架构；可本地部署，数据不出机场。

### 用户场景与用户故事 · User scenarios & user stories（一个夜班，五个时刻）
| 时刻 | 场景 Scenario | 角色 | 用户故事 User story | 之前 → 有了 AI |
|---|---|---|---|---|
| 02:14 | **告警风暴 → 3 起事件**：312 条告警被融合为 3 起事件，按风险排序（尾随 94 / 无人看管行李 71 / 围界振动 08，经 AI 核实为小动物，由 Nurul 关闭），309 条无效告警按原因归组 | Nurul · 值守员 | As a control room operator, I want alarms from every system fused, ranked and explained, so that I act on real threats first. | 312 条告警人工研判 → 3 起事件，附证据排序 |
| 02:15 | **尾随进入空侧**：AI 依据 SOP AS-07 推荐处置（锁门、追踪、派巡逻、通知警方），值班经理一键批准每个处置动作，3 分 46 秒完成拦截，全程留痕 | Daniel · 值班经理 | As a duty manager, I want responses recommended from our own SOPs, approved in one click, so that every shift gives the same, correct response. | 处置因人而异 → SOP 步骤一键批准 |
| 02:16 | **谁留下了这个包？**：一句自然语言提问，AI 4 秒内跨 38 个摄像头追踪到行李主人在咖啡厅（02:16:08 最后目击），02:16:11 照片与位置推送给巡逻员 Arjun；02:20 行李被认领，登机口无需关闭 | Nurul · 值守员 / Arjun · 巡逻员 | As an operator, I want to search every camera in plain language, so that I find the right person in seconds, not hours. | 数小时翻录像 → 几秒定位 |
| 05:10 | **早高峰之前**：预测 3 号安检口排队峰值 20 分钟（服务目标 15 分钟），建议 05:30 加开 5、6 号通道并调配 4 名安检员 → 峰值降至 11 分钟；CAM 4-221（机坪 C4–C5 机位）镜头起雾，预测 72 小时内画面不可用，自动生成工单，在早高峰前修复 | Daniel · 值班经理 | As a duty manager, I want early warning of queues and failing devices, so that I act before the peak, not after it. | 拥堵与故障发现太晚 → 提前预测、建议、修复 |
| 07:00 | **交接班**：事件报告已由 AI 起草（时间线、证据、审批记录，SOP 5/5 步），主管 07:04 审阅签发；班次总结 | Grace · 安保主管 | As a head of security, I want every incident documented automatically, so that we are always audit-ready. | 报告人工整理 → 自动起草、随时可审计 |

### 核心价值 · Core value
| 对象 | 价值 | 场景中的证据 |
|---|---|---|
| 值守人员 Operators | **专注 Focus** — 更少噪声、更少屏幕、更少疲劳 | 312 条告警 → 3 起事件 |
| 值班经理 Duty managers | **一致 Consistency** — 每个班次都按 SOP 正确处置 | SOP 5/5 步 · 一键批准 |
| 机场 Airport | **连续 Continuity** — 更少运营中断，旅程更顺畅 | 无需关闭登机口 · 排队被化解 |
| 安保管理层 Security leadership | **合规 Compliance** — 默认可审计（audit-ready by default） | 每个动作全程留痕 |
| 业务 Business | **升级而非重建** — 构建于 AGIL® Secure 及机场既有系统之上，厂商中立、兼容既有系统 | AGIL® Secure 已在 Dhoho Kediri 国际机场运行 |

### 准确性说明 · Accuracy notes
- 产品事实（统一多子系统、厂商中立、兼容既有系统、可转为本地部署、零信任架构、Dhoho Kediri 机场运行）来自 ST Engineering 公开资料及用户的 FastPass 申报材料。
- 画面将 AI 层整体标注为"PROPOSED · AI USE CASE 1"（本用例提出），将 AGIL® Secure ISMS 标注为"DEPLOYED PLATFORM"。AI 能力中，"异常行为识别、告警研判、AI 推荐处置、客流拥堵预测、设备健康与预防性维护"来自用户申报材料；"自然语言视频检索、报告自动起草"为本用例的概念延伸。
- 场景中的所有时间、编号、评分、人名均为示意数据，画面已标注。
- 外部数据仅一处：巴黎机场 1,280 次延误 / 约 45 分钟（Groupe ADP 数据，Air Journal 2018 年 1 月），画面已标注来源。

---

## 2. 分镜与旁白 · Storyboard & narration

| 章节 Chapter | 场景 Scene | 画面 On screen |
|---|---|---|
| 01 · The challenge | s01 Cold open | 机场平面图自绘，摄像头/门禁/围界传感器点亮，数据流汇聚至控制室 |
| | s02 Alarm storm | 过去一小时的告警以延时方式回放（约每 11 秒一条，共 312 条）；保洁撑门、风吹围栏、镜头眩光被标注；真实的遗留行李与尾随亮起后又被噪声淹没；末尾 12 条与 m1 队列完全一致 |
| | s03 Pain points | 六张痛点卡片，各对应一个角色与后果 |
| | s04 Cost of doubt | 1,280 次延误 + 示意航班屏（部分航班变为 DELAYED）；来源标注 |
| 02 · The solution | s05 | 标题 *AI-powered AGIL® Secure ISMS*（注明 ISMS = Integrated Security Management System）；三层架构自下而上搭建：子系统 → ISMS（DEPLOYED PLATFORM）→ AI 智能助手（PROPOSED：Detect→Triage→Investigate→Respond→Report + Anticipate/Maintain）→ 人 |
| 03 · Design principles | s06 | 四项设计原则卡片 |
| 04 · User scenarios | s07 | 夜班时间线（5 个时刻）+ 4 位角色 |
| | m1 02:14 | 左栏：角色 + 用户故事 + 之前/有了 AI；右栏：AI 研判开关、扫描、312 条收敛为 3 起事件、风险评分与证据、309 条误报按原因归组 |
| | m2 02:15 | 门禁摄像头回放尾随；证据列表；AI 推荐处置清单（SOP AS-07），光标逐步批准；跟踪画面；审计轨迹；3 分 46 秒拦截 |
| | m3 02:16 | 遗留行李画面；自然语言提问；38 个摄像头检索进度；4 次目击轨迹 + 楼层路径图；巡逻派单卡片；"4 分钟内认领 · 无需关闭登机口" |
| | m4 05:10 | 安检口等待时间预测曲线（峰值 22 分钟 → 批准后 11 分钟）；设备健康卡（CAM 4-221 起雾、工单） |
| | m5 07:00 | AI 起草的事件报告（摘要、时间线、证据、审批、SOP 5/5）+ 班次总结；"已审阅"签章 |
| 05 · Core capabilities | s13 | 7 项能力卡片，逐一随旁白点亮，每项对应 s03 中的一个痛点（Addresses: …） |
| 06 · Core value | s14 | 4 类角色价值 + "升级而非推倒重来"的分层动画 |
| End | s15 | 噪点汇聚成一条信号线；标语；白色结尾卡（AI Use Case 01 · ST Engineering） |

### 旁白与字幕（时间码由实测配音生成）· Timecoded narration
<!-- VO-TABLE:START -->
| # | 时间 Time | 场景 | English narration | 中文字幕 |
|---|---|---|---|---|
| 1 | 0:00.80–0:03.83 | s01 | An airport never sleeps — and neither does its security. | 机场从不停歇，安保亦然。 |
| 2 | 0:04.18–0:07.90 | s01 | Thousands of cameras, doors and sensors report to one control room. | 成千上万的摄像头、门禁与传感器，汇聚于同一个控制室。 |
| 3 | 0:09.10–0:12.50 | s02 | 2 a.m. 312 alarms in the past hour. | 凌晨两点，过去一小时内触发了 312 条告警。 |
| 4 | 0:12.85–0:18.18 | s02 | Most are nuisance alarms: a door propped open by cleaners, wind on the fence, glare on a lens. | 大多是无效告警：保洁员撑开的门、风吹动的围栏、镜头上的眩光。 |
| 5 | 0:18.63–0:21.28 | s02 | But a few are real — and they're buried in the noise. | 但其中有几条是真实威胁——却被淹没在噪声之中。 |
| 6 | 0:22.58–0:26.89 | s03 | Operators juggle siloed systems and verify every alarm by hand. | 值守人员在孤立的系统间来回切换，每条告警都靠人工核实。 |
| 7 | 0:27.24–0:33.20 | s03 | Tracing one person takes hours of footage. Responses vary by shift, and auditability is patchy. | 追踪一个人要翻看数小时录像。处置因班次而异，审计留痕参差不齐。 |
| 8 | 0:33.55–0:36.89 | s03 | Queues and device faults surface only after they cause trouble. | 排队拥堵与设备故障，往往在造成影响后才被发现。 |
| 9 | 0:37.89–0:44.47 | s04 | And doubt is costly: in one year, unattended-bag alerts caused 1,280 delays at Paris airports. | 不确定的代价高昂：仅一年之内，无人看管行李告警就在巴黎各机场造成 1,280 次延误。 |
| 10 | 0:45.97–0:57.57 | s05 | AI Use Case 1 brings an AI co-pilot into the AGIL® Secure ISMS, the platform that already unifies access control, video, intrusion detection and identity management. | AI 用例一：为 AGIL® Secure ISMS引入 AI 智能助手（Copilot），该平台已将门禁、视频、入侵探测与身份管理融为一体。 |
| 11 | 0:57.97–1:07.45 | s05 | It detects unusual behaviour, triages alarms in context, investigates in plain language, recommends the response and writes the report — and it looks ahead. | 它能识别异常行为，结合情境研判告警，用自然语言调查取证，推荐处置方案，并撰写报告——还能提前预判。 |
| 12 | 1:08.45–1:16.87 | s06 | People stay in command. Every recommendation shows its evidence and follows the airport's own procedures. And it all runs securely, on-premises. | 人始终掌握决策权。每条建议都附有证据，并遵循机场自身的作业程序。整个系统可本地部署、安全运行。 |
| 13 | 1:17.87–1:19.51 | s07 | Let's follow one night shift. | 让我们跟随一个夜班。 |
| 14 | 1:21.91–1:29.48 | m1 | 02:14. Instead of 312 alarms, operator Nurul sees three incidents, ranked by risk, each with its evidence. | 02:14，值守员 Nurul 看到的不再是 312 条告警，而是 3 起事件，按风险排序，每起都附有证据。 |
| 15 | 1:29.83–1:33.64 | m1 | Nuisance alarms are grouped and explained — never silently dropped. | 无效告警会归类合并并注明原因——绝不会被悄然丢弃。 |
| 16 | 1:35.24–1:40.33 | m2 | 02:15. First, the critical one: someone tailgated through a staff door leading airside. | 02:15，先处理最紧急的一起：有人尾随穿过一扇通往空侧的员工门。 |
| 17 | 1:40.68–1:44.56 | m2 | The AI recommends the response from the airport's own procedures. | AI 依据机场自身的作业程序推荐处置方案。 |
| 18 | 1:44.86–1:52.07 | m2 | Duty manager Daniel approves each action with one click. The subject is intercepted in under four minutes — and everything is logged. | 值班经理 Daniel一键批准每个处置动作。不到 4 分钟即完成拦截，全程留痕。 |
| 19 | 1:53.67–1:59.80 | m3 | 02:16. Meanwhile, an unattended bag at Gate B12. Nurul simply asks: who left this bag? | 02:16，与此同时，B12 登机口出现一件无人看管的行李。Nurul 只需问一句：谁留下了这个包？ |
| 20 | 2:00.20–2:07.00 | m3 | In seconds, the AI traces the owner across 38 cameras to a café, and sends her photo to the nearest patrol. | 几秒之内，AI 跨 38 个摄像头追踪到行李主人身在一家咖啡厅，并将她的照片发送给最近的巡逻员。 |
| 21 | 2:07.50–2:10.17 | m3 | Bag reclaimed in four minutes. No gate closure. | 4 分钟内行李被认领，登机口无需关闭。 |
| 22 | 2:11.77–2:17.91 | m4 | 05:10. The AI forecasts a 20-minute queue at Checkpoint 3 and recommends opening two more lanes. | 05:10，AI 预测 3 号安检口将出现 20 分钟排队，建议加开两条通道。 |
| 23 | 2:18.26–2:21.96 | m4 | It also flags a failing camera — before it becomes a blind spot. | 它还能提前发现即将故障的摄像头，避免出现监控盲区。 |
| 24 | 2:23.56–2:30.89 | m5 | 07:00. Handover. Every incident report is already drafted: timeline, evidence and approvals — ready for audit. | 07:00，交接班。每份事件报告均已起草完毕：时间线、证据与审批记录齐全，随时可供审计。 |
| 25 | 2:32.09–2:36.28 | s13 | Detect. Triage. Investigate. Respond. Report. Anticipate. Maintain. | 识别。研判。调查。处置。报告。预判。运维。 |
| 26 | 2:36.58–2:39.14 | s13 | AI across the whole security lifecycle. | AI 贯穿安保全生命周期。 |
| 27 | 2:40.34–2:49.62 | s14 | For operators: focus. For duty managers: the right response, every shift. For the airport: fewer disruptions. For security leaders: audit-ready, by default. | 对值守人员：更专注。对值班经理：每个班次都能正确处置。对机场：更少运营中断。对安保管理层：默认可审计。 |
| 28 | 2:50.07–2:57.59 | s14 | And because it builds on AGIL® Secure and the systems airports already run, AI arrives as an upgrade — not a rip-and-replace. | 而且它构建于 AGIL® Secure及机场既有系统之上，AI 是一次升级，而非推倒重来。 |
| 29 | 2:58.99–3:03.98 | s15 | AI-powered AGIL® Secure ISMS. From alarm noise to decisive action. | AI 赋能的AGIL® Secure ISMS。从告警噪声，到果断行动。 |

总时长 Total: **3:07.58**
<!-- VO-TABLE:END -->

---

## 3. 制作规格 · Production specs
- 1920×1080 · 30 fps · H.264 + AAC · 时长见上表
- 配音：Kokoro-82M（离线 AI 语音，英式女声 bf_emma，与 FastPass 视频一致；正式使用前建议试听，或按时间码替换为真人配音）
- 音乐与音效：原创，numpy/scipy 合成（D 小调紧张段 → 解决方案处转 D 大调），音效与画面逐帧对齐
- 响度：−14 LUFS 综合响度，真峰值 ≤ −1 dBTP；旁白高于音乐约 12 dB
- 字幕：英文 / 中文 / 中英双语 SRT，另附中英双语硬字幕版本
- 字体：Plus Jakarta Sans、Inter、JetBrains Mono、Noto Sans SC（均为 SIL OFL）
