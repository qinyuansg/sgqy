# 《无数个今晚》AI 生成提示词包（中英双语 · 制作版）

> 歌曲：《无数个今晚》（qinyuansg，256.824 s）· 画面 24 fps、6164 帧（f0–f6163）、2.39:1（1920×1080 内含 1920×804 有效画面）· 镜头 81 个。
> 来源（权威顺序）：`brief/treatment_zh.md` ＞ `brief/directors_notes.md` ＞ `bible/production_bible.md` + `bible/bible.json` ＞ `shotlist/shots.json`（本包的机器可读版本）。
> 本包由四组提示词（`shotlist/parts/gen_g1–g4.json`）经 QA 统一后合并而成；同一数据另有 `delivery/prompts.csv`（表格用，UTF-8 BOM）。时码格式 分:秒:帧，入点含、出点不含。

## 目录

- 1. 使用方法：参考先行工作流
- 2. 全局风格块（EN / ZH）
- 3. 全局负面提示词（EN / ZH）
- 4. 全片统一规则（QA 锁定）
- 5. 参考图库（CHAR_ / PROP_ / LOC_ / 补充 XREF_）
- 6. 逐镜提示词 S001–S081
- 7. QA 修订记录与待导演确认事项

## 1. 使用方法：参考先行工作流

**第 1 步 · 生成并锁定参考图。** 按 §5 的 `ref_prompt_en / ref_prompt_zh` 为每个 `CHAR_*`（四视图转面＋双手掌心与手背＋关键服装细节）、`PROP_*`（多角度＋微距＋“当年/博物馆/未来”多状态）、`LOC_*`（主机位全景＋关键机位）生成参考图；在中性灰背景、均匀 5600K 光下出图，逐张检查手指数量、左右锁（痣、疤、银镯、补丁、磨损的左右与位置）。导演确认后锁定版本号与种子（seed），此后所有镜头只用这一套参考图。圣经未登记、但分镜需要的五项补充参考（§5.4 的 `XREF_*`）同法生成。等待的人与未来观看者也要有完整面貌的参考图（只用于一致性，成片中脸永不清晰）。

**第 2 步 · 逐镜生成首帧关键帧（keyframe）。** 以每镜的 `keyframe_en`（或 `keyframe_zh`）为提示词，`refs` 中列出的参考图作为图像参考（人物 / 道具 / 场景各至少一张），全局风格块追加在后，负面＝全局负面＋本镜 `negative`。按 2.39:1 出图（如 2048×858，或 1920×804 有效画面）。有 `endframe_en` 的镜头另生成末帧静帧，供首尾帧控制与匹配剪辑登记；**匹配剪辑的 B 镜首帧必须以 A 镜末帧作为构图参考图**，叠在一起检查坐标（容差 ±3% 画面，见 §4.3）。

**第 3 步 · 图生视频（I2V）。** 以首帧（及末帧）为输入，`motion_en / motion_zh` 为运动提示词：其中写明摄影机运动、速度、每个动作在本镜内的秒数（与分镜 `sync_points` 对齐）、帧率（24 fps 或 48 fps 慢动作）以及“不得移动”的元素。按 `gen.segments` 分段生成，每段带 0.25–0.5 s 的手柄（handles），在段落重叠区按 post 写的方式（同路径隐藏接缝、光流融合或交叉叠化）接合。慢动作镜头可以直接生成慢动作，也可 24 fps 生成后补帧；面部情绪（颤抖的肩、点头、眉眼舒展）一律真实速度。

**第 4 步 · 文生视频（T2V，备选或预演）。** `prompt_en / prompt_zh` 是独立、完整的单条提示词（120–220 词），已含景别、焦段、机位、运动、光源与色温方向、动作时间点、人物锁定特征与调色，可直接用于文生视频或做快速预演。

**第 5 步 · 分层合成。** `gen.plates` 列出的分层（plate A/B/C…）分别生成：反射、跨时代画面、元素（针、雨滴、热气、手电光束、印迹）不要指望一次生成同时守住两个世界。`gen.post` 写明合成方式：反射强度（screen 百分比）、遮罩与羽化、按镜像深度的焦外、时代 LUT、速度曲线、与歌曲的同步帧号。所有反射镜头遵守 §4.1 的镜像规则 MP-1。

**第 6 步 · 调色与剪辑。** 共用底片模拟 CT_BASE，按时代套 CT_* 小幅偏移（§4.2），颗粒在最后统一；按每镜 `in_frame / out_frame`（本包的时码）放上 24 fps、6164 帧的时间线，歌曲完整不剪；片名、字幕、演职员文字全部后期添加，画面内不出现任何文字。

**每镜 QC 清单。** ① 人物锁：修复师左眼下痣、左袖口磨损、手套状态；夜班工作人员右颧骨老年斑、驼背、老花镜状态；航海人左眉尾疤、靛蓝头巾、补丁只在右袖口内侧；等待的人左腕银镯、脸不清；迁徙女性右眉峰痣、长辫、右手提箱；母亲左腕玉镯、不划十字。② 道具锁：青花碗唯一纹样、裂纹不穿过梅花、凉饭无热气；茶杯一道钴蓝线、他的杯 2 点钟磕口；印章苯胺紫、墨线不是红色。③ 屏幕方向：画左＝家/过去，画右＝远方/明天，横移与给予动作由左向右，黎明从画右来。④ 无文字、无真实旗帜徽章机构、无鬼影、无变形转场。⑤ 手指、脚趾逐帧检查。⑥ 匹配剪辑坐标在 ±3% 内。

## 2. 全局风格块（EN / ZH）

追加在每条关键帧、运动与文生视频提示词之后（每镜提示词已自带本镜的调色与质感，风格块用于统一全片）。

**EN**
```text
Photoreal live-action cinema, 2.39:1 anamorphic widescreen (2x anamorphic look on a large-format digital sensor, oval bokeh, gentle edge fall-off), fine organic 35mm-like film grain that is heavier in the shadows, subtle red-orange halation only around strong point sources, soft highlight roll-off, deep shadow detail with blacks lifted 2-3% and never crushed, natural unretouched East Asian skin with pores, fine lines and real tiredness. Palette: dusk deep blue #1A2D4A / #0E1B30, moon silver #C8D2DB, blue-and-white porcelain white #EDF1EF with cobalt #2B4A8B, desaturated copper-gold #B08D57; every light left for someone is one small steady amber point #E2A458; dawn warmth only in the final minutes and never above half the frame. Motivated light only (moon, candle, horn lantern, oil lamp, kerosene, 1920s bulbs, stained glass, museum practicals, phone, dawn sky), fill disguised as bounce. Camera vocabulary: barely perceptible slow push-in, stable lateral track left to right, focus pull of at least one beat, minimal natural handheld, slow motion only for the bible's irreversible moments. Only short warm horizontal flares. No on-screen text, letters, logos, real flags, insignia or real institutions; invented neutral designs only.
```

**ZH**
```text
写实真人电影质感，2.39:1 变形宽银幕（大画幅数字机配 2 倍变形镜头的观感：椭圆焦外、柔和的边缘衰减），细腻有机的 35mm 胶片颗粒、暗部颗粒更明显，只在强点光源周围有极细的红橙光晕，高光柔和滚降，暗部层次丰富、黑位抬起 2–3%、绝不死黑，自然未修饰的东亚肤色，保留毛孔、细纹与真实的疲惫。色板：暮色深蓝 #1A2D4A / #0E1B30、月光银 #C8D2DB、青花白 #EDF1EF 与钴蓝 #2B4A8B、低饱和铜金 #B08D57；每一盏“为人留的灯”都是一个小而稳定的琥珀暖点 #E2A458；黎明的暖色只在最后几分钟出现、且不超过画面一半。只用有来源的光（月光、蜡烛、角片灯、油灯、煤油灯、1920 年代灯泡、彩窗、博物馆展柜灯、手机、黎明天光），补光伪装成环境反射。摄影词汇：几乎察觉不到的缓慢推进、由左向右的稳定横移、至少一拍的焦点转移、少量自然手持、只在圣经允许的不可逆瞬间使用慢动作。只允许短而暖的水平光晕。画面内无任何文字、字母、标志、真实旗帜、徽章或真实机构，只使用虚构的中性设计。
```

## 3. 全局负面提示词（EN / ZH）

来自 `bible/bible.json` 的 `negative_prompt_global_en / zh`，每镜使用时在其后追加本镜 `negative`。

**EN**
```text
text, letters, words, subtitles, captions, watermark, logo, brand names, signage text, gibberish characters, fake Chinese characters, real national flags, real emblems or insignia, military insignia, cartoon, anime, illustration, painting, 3D render, CGI look, video-game look, plastic skin, airbrushed skin, beauty filter, skin whitening, over-smoothed faces, doll face, oversaturated colours, teal-and-orange grade, cyan shadows, yellow-green 'Asia' filter, sepia wash, HDR halos, crushed pure black shadows, blown-out highlights, over-sharpening, digital noise, blue streak lens flares, anamorphic flare overload, fog-machine haze, glowing magic light, unmotivated rim light, extra fingers, missing fingers, fused fingers, deformed hands, extra limbs, distorted anatomy, warped faces, asymmetrical eyes, face morphing, melting objects, morph transition, translucent ghosts standing in the room, double exposure ghosting, floating objects, wrong reflections, non-mirrored reflections, impossible perspective, anachronisms (wristwatch, plastic, zippers, LED light or electric light in pre-1890s scenes, modern clothing in historical scenes), Qing queue hairstyle on the navigator, Orientalist clichés (random red lanterns, dragons, gongs, incense smoke clouds), religious figures or icons in focus, exaggerated crying, melodrama, horror mood, cluttered composition, tilted horizon, shaky camera, motion blur smear, flicker, frame jitter, low resolution, jpeg artifacts
```

**ZH**
```text
文字、字母、单词、字幕、说明文字、水印、标志、品牌名、招牌文字、乱码字符、伪汉字、真实国旗、真实国徽或徽章、军事徽记、卡通、动漫、插画、绘画、3D渲染、CG感、游戏画面感、塑料皮肤、喷枪磨皮、美颜滤镜、美白、过度平滑的脸、娃娃脸、过度饱和、青橙调色、青色阴影、亚洲题材黄绿滤镜、棕褐怀旧滤镜、HDR光晕、死黑阴影、高光溢出、过度锐化、数字噪点、蓝色长条镜头光晕、过量变形光晕、烟雾机浓雾、魔法发光、无来源轮廓光、多余手指、缺失手指、粘连手指、畸形的手、多余肢体、扭曲的解剖结构、变形的脸、不对称的眼睛、人脸变形、物体融化、变形转场、站在房间里的半透明鬼魂、双重曝光鬼影、漂浮物体、错误的反射、未镜像的反射、不可能的透视、时代错误（手表、塑料、拉链、1890年代以前场景中的LED或电灯、历史场景中的现代服装）、航海人的清代辫发、东方主义陈词（随意的红灯笼、龙、锣、香火烟雾）、清晰对焦的宗教人物或圣像、夸张的哭泣、煽情、恐怖氛围、杂乱构图、倾斜的地平线、晃动的镜头、运动模糊拖影、闪烁、画面抖动、低分辨率、JPEG压缩痕迹
```

## 4. 全片统一规则（QA 锁定）

### 4.1 镜像规则 MP-1

**镜像规则 MP-1（全片统一）**：凡“玻璃里的另一个时代”（S001–S003 航海人的手与夜海、S017 旧日家中、S024–S026 三联柜、S041 屋檐、S066 长廊 P1–P4），按分镜写明的**画面所见**合成——画左/画右布局与左右手锁（等待的人坐画左、银镯在左腕，T11 月光右上→左下）就是最终画面，不做翻转（这些时代并不真实地站在房间里，圣经 §8.2-3 禁止鬼影；若翻转，所有左右锁都会落错）。**当下空间里的物理反射**——修复师自己的倒影、手套指尖的倒影、夜班工作人员、未来观看者、S023 玻璃里的月亮、S081 窗玻璃里的两个人——一律是真实的镜像。全局负面提示词里的 non-mirrored reflections 针对的是后者。此规则与圣经 §8.3-4 的字面写法不同，需导演签字；若导演坚持字面翻转，S024 的 post 已写明重生成方式（反向轨道、左上月光、翻转后布局反转）。

### 4.2 分时代调色词（每条提示词结尾统一使用）

| 时代 | LUT（只用于调色/合成） | 提示词结尾（EN） | 提示词结尾（ZH） | 使用镜头 |
|---|---|---|---|---|
| 现代夜间 | CT_MODERN | Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text. | 现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。 | S003–S004、S012–S015、S018、S023、S027–S030、S040、S049–S054、S059–S065、S073 |
| 航海时代 | CT_NAV | Navigator-era grade: strongest warm-cool split, deep-blue sea and sky against amber lamplight, greens muted; fine 35mm grain, 2.39:1, no text. | 航海时代调色：全片最强的冷暖对比，深蓝的海与天对琥珀色灯光，绿色压低；细腻 35mm 颗粒，2.39:1，无任何文字。 | S005–S011、S022、S045、S067 |
| 旧日家中 | CT_HOME | Old-home grade: candle-warm interior against cool lattice moonlight, blacks slightly lifted; fine 35mm grain, 2.39:1, no text. | 旧日家中调色：烛光暖色的室内对窗格透入的冷月光，黑位略抬；细腻 35mm 颗粒，2.39:1，无任何文字。 | S016、S019、S035、S042 |
| 迁徙时代 | CT_MIG | Migrant-era grade: faded-photograph softness, saturation -15%, creamy highlights, never sepia; fine 35mm grain, 2.39:1, no text. | 迁徙时代调色：褪色家庭照片般的柔和，饱和度 −15%，高光微奶油，绝不做棕褐；细腻 35mm 颗粒，2.39:1，无任何文字。 | S020、S031–S034、S036–S039、S043、S048、S068 |
| 地图办公室 | CT_MAP | Map-office grade: the hardest, highest-contrast cold look, saturation -25%, grey-green surroundings; fine 35mm grain, 2.39:1, no text. | 地图办公室调色：全片最冷硬、反差最高，饱和度 −25%，四周压成冷灰绿；细腻 35mm 颗粒，2.39:1，无任何文字。 | S021、S044、S047 |
| 礼拜堂 | CT_CHAPEL | Chapel grade: the richest colour of the film, stained-glass hues softened, never neon; fine 35mm grain, 2.39:1, no text, no religious images. | 礼拜堂调色：全片色彩最丰富处，彩窗色相柔化，绝不霓虹；细腻 35mm 颗粒，2.39:1，无任何文字，无任何宗教图像。 | S055–S058（S069 为蓝调时刻变体） |
| 未来 | CT_FUTURE | Future grade: lowest contrast, slightly high-key silver-white with a trace of warmth, no sci-fi teal; very fine grain, 2.39:1, no text. | 未来调色：反差最低、略高调，银白里带一丝暖，不用科幻青色；极细颗粒，2.39:1，无任何文字。 | S070、S071、S078 |
| 黎明 | CT_DAWN | Dawn grade: the light simply comes up, blue-grey toward soft peach, never orange; fine 35mm grain, 2.39:1, no text. | 黎明调色：光自然地亮起来，由蓝灰走向柔和的桃色，绝不变橙；细腻 35mm 颗粒，2.39:1，无任何文字。 | S077、S079–S081（S072/S074/S075/S076 为“渐向黎明”变体） |

多时代镜头（S001、S002、S017、S024–S026、S041、S046、S066）与过渡镜头（S069、S072、S074–S076）使用组合写法：展厅/长廊用现代夜间调色，玻璃里每个时代保留自己的调色，见各镜提示词结尾。

### 4.3 匹配剪辑登记（两侧规格一致，坐标为 2.39:1 有效画面的 0–1 坐标，容差 ±3%）

| 剪辑 | 类型 | A 镜末帧 | B 镜首帧 |
|---|---|---|---|
| S001→S002 | 隐藏接缝（同一运动控制路径） | 两手中心 (0.50,0.55)，手宽约 44–45% 画高；航海人左手大 8%、掌心朝镜头 | 与 A 末帧完全相同 |
| S002→S003 | 隐藏剪辑（玻璃罩立边高光） | 立边高光 x≈0.66；罗盘 (0.50,0.62)；反射船灯 (0.36,0.32)；修复师淡影 (0.74,0.45) | 同一构图，换 75 mm |
| S004→S005 | T03 相似构图 | 双峰小岛 (0.62,0.40)；海图宽 90%；压条：左端 x≈0.10、上边 x 0.55–0.95；空角 (0.95,0.88) | 小岛 (0.62,0.40)；镇纸 (0.10,0.50)/(0.78,0.06)；圆石 (0.08,0.85)；空角 (0.95,0.88) |
| S009→S010 | T05 针轴→瞳孔 | 针轴 (0.46,0.50)，针长 60% 画高，红端指左下 | 近侧瞳孔 (0.46,0.50)，眼睛 25% 画高 |
| S011→S012 | 手势（跨时代） | 左手指腹在补丁上 (0.50,0.52)，指向左下约 30°，指尖 12% 画高 | 戴手套的指尖捏残片 (0.50,0.52)，同方向同大小 |
| S015→S016 | T07 碗沿→碗沿 | 碗心 (0.50,0.52)；口沿圆 80% 画高；自 6 点钟一侧 15° 斜俯；高光 (0.36,0.24)；A 面朝 12 点 | 完全相同（整碗、凉饭、筷子） |
| S017→S018 | 光点接光点 | 玻璃里的烛焰 (0.42,0.46) | 亮着的修复室窗 (0.42,0.46) |
| S018→S019 | 天空（共享天空板 B） | 月光 (0.80,0.14)，云带占上三分之一 | 同一天空板，月光 (0.80,0.14) |
| S019→S020 | 手势（区域呼应，非 ±3% 登记） | 掌心离开碗沿上抬 (0.30,0.74) | 右手落向信纸 (0.40,0.62) |
| S020→S021 | 线 | 信边＋箱盖前沿 y 0.66，x 0.20–0.80 | 尺边 y 0.66，x 0.18–0.80 |
| S021→S022 | 点 | 渔村记号 (0.30,0.58) | 岸灯 (0.30,0.58) |
| S022→S023 | 光点接光点 | 眼中岸灯亮点 (0.70,0.40) | 玻璃里的月亮 (0.70,0.40)（镜像） |
| S030→S031 | T13 衣料 | 手套掌心在衣领 (0.42,0.42)，旧衫方块 (0.48,0.52)，提手在下沿 | 裸掌压在衣领 (0.42,0.42)，同构图 |
| S034→S035 | 手势 | 合拢的手指 (0.52,0.56) | 捏针的手指 (0.54,0.58) |
| S037↔S040 | 印迹位置呼应 | 紫色印迹 (0.60,0.50) | 褪色灰紫印迹 (0.60,0.50) |
| S039→S040 | T15 停留之手 | 右手手背 (0.36,0.56)，40% 画高，四指微弯、拇指在左 | 戴手套的右手手背，同位同形 |
| S040→S041 | 反射 | 手套 (0.36,0.56)，印迹 (0.60,0.50) | 同位（更广镜头），焦点穿入屋檐反射 |
| S043→S044 | 线（CH2 重复 S020→S021） | 信边 y 0.66，x 0.34–0.66 | 尺边 y 0.66，x 0.30–0.90 |
| S044→S045 | 手势 | 左掌心 (0.45,0.60)，35% 画高 | 航海人左手 (0.45,0.60)，35% 画高 |
| S045→S046 | 光点接光点 | 岸灯 (0.40,0.46) | E1 门柱灯笼 (0.40,0.46) |
| S046→S047 | 线 | E4 门槛铁条 y 0.66，x 0.30–0.46 | 墨线 y 0.66，自 x 0.30 起笔 |
| S047→S048 | T17 线→门槛 | 墨线 y 0.66，x 0.30–0.92 | 门槛铁条 y 0.66，x 0.05–0.95，停 ≥13 帧 |
| S048→S049 | T17 提手 | 新提手横杆 y 0.66，x 0.28–0.72（45% 画宽） | 老提手同位同大 |
| S054→S055 | 光点接光点 | 放大镜彩色光晕 (0.72,0.30) | 彩窗最亮色块 (0.72,0.30) |
| S055→S056 | 连续摇臂运动 | A 末帧＝B 首帧（约 6.5 m 高、左摇 40°） | 同 |
| S057↔S061 | T18 同一块菱形小玻璃 | (0.70,0.45)，约 9% 画高 | (0.70,0.45) |
| S058→S059 | T19 背与肩 | 肩线 (0.66,0.50)，肩宽 30% 画宽，背对镜头 | 同 |
| S062→S063 | 同一机位接续 | A 末帧＝B 首帧 | 同 |
| S064→S069→S070 | 袖口磨损位置 | S064 登记磨损 (0.42,0.62)，袖口 30% 画高 | S069 两只衣袖 (0.42,0.62)（约 15% 画高，仅位置匹配）→ S070 老外套袖口 (0.42,0.62)，30% |
| S066→S067 | 光点接光点 | 窗湾阅读灯 (0.38,0.36) | 艉灯 (0.38,0.36) |
| S002↔S071 | T22/T23 第三只手 | T01 两手 (0.50,0.55)，45% 画高，MC_G1_OPEN | 未来观看者倒影右手 (0.50,0.55)，45% |
| S075→S076→S077→S078 | T25 呼应链 | 眼睛 (0.33,0.40)，人物在画左三分之一，光从画右 | 每一镜首帧眼睛都在 (0.33,0.40) |
| S046↔S080 | 同一港口机位 | 门槛 y 0.66，等待位置 (0.38,0.70) | 同机位，等待位置空着 |
| S063↔S081 | 杯子排列 | 他的在画右、她的在画左，相距约 6 cm，磕口 2 点钟 | 同 |

### 4.4 机位复用

| 机位数据 | 镜头 | 规格 |
|---|---|---|
| MC_G1_OPEN | S001、S002（T01）、S070 末段、S071（T22/T23） | 镜头高 1.18 m，正对 G1 南面，100 mm 微距 |
| 港口固定机位 | S046（E1–E4）、S080（E5 黎明） | 40 mm，镜头高 1.6 m，向东 |
| MC_CORRIDOR | S027（建立）、S066（主运动 x −12.5 → −1.5） | 40 mm（S027 为 135 mm 西端压缩），镜头高 1.45 m |
| BAY_3Q | S062–S065、S072–S074、S077 | 窗湾西南角向北偏东，东窗在画右，他在画右靠窗、她在画左 |
| S019 = S041 | 屋檐全景同机位（CH1 → CH2 天气） | 32 mm，镜头高 1.5 m |
| S020 = S043 | 第三盏灯下同机位（CH1 → CH2 布片） | 75 mm，镜头高 1.3 m |

### 4.5 连续性跟踪

| 对象 | 全片状态 |
|---|---|
| 修复师手套 | S001–S061 戴着（略暖白、右手食指与拇指黄铜污迹）；S061 192.7–194.6 s 先右后左摘下；S062 压在左手拇指下；S063–S074 叠放在长凳画左角 |
| 外套中间扣 | 扣着直到 S063 199.3 s 解开；S065 起始终敞开 |
| 左袖口磨损 | 左臂入画即可见：S012、S014、S023、S028、S049、S050、S061、S062、S063、S064（登记 (0.42,0.62)）；S070 未来同位 |
| 碎发 | 右侧太阳穴两三缕 → S074 起更多 |
| 老花镜 | S059–S060 戴着看手机；S060 2.55 s 落回挂绳；S061–S081 挂在胸前 |
| 手机 | S028 在右口袋；S059 膝上点亮；S060 扣在右大腿；S072 拿起拨出；S073–S074 贴右耳 |
| 保温壶 XREF_THERMOS | S059、S062 在他右胯旁；S077 续茶 |
| 茶杯与热气 | S062 他的放窗台 → S063 她的放其左约 6 cm → S064 他捧到膝上 → S065 膝上 → S066 尽头两杯冒热气 → S072–S074 茶凉、无热气 → S077 续茶 → S079、S081 热气 |
| 航海人外衣 | S022、S045、S066-P1 穿棕色夹棉守夜外衣 → S067 披给同伴 → S075 只穿靛蓝短褂 |
| 补丁 | 只在右袖口内侧、由左手翻开：S011、S035（缝制中）、S045、S067 |
| 蜡烛 | S016 B 11 cm → S017 B→C → S024–S026 C 6 cm → S066-P2 D 2.5 cm |
| 家中天气 | S016–S017 晴闷 → S019 云聚 → S041–S042 厚云潮湿无雨 → S066-P2 落雨 |
| 雨碗位置 | S019、S041、S042、S066-P2：檐下石阶外沿、滴水线下 (0.28,0.80) |
| 壁龛小灯 | S019 未点；S035 点亮；S041、S042、S066 亮着 |
| G3c 柜门 | S028–S030 打开（状况检查）；S040、S041 关上 |
| 藤箱 | S023–S041 在展厅 G3c；S049 起在修复室 |
| 信 | S020 三折后对折；S043 夹三角布；S049–S054 博物馆状态（保护套、茉莉、断笔，透字） |
| 罗盘 | 当年 S006、S009（云母完整、暖金）；博物馆 S002–S003（乾位裂纹、铜绿）；S070 未来展柜中罗盘已移走 |
| 外套未来状态 | S070、S071、S078：偏褐灰、叠放、左袖口朝上朝向玻璃 |

## 5. 参考图库

每项给出：锁定描述（所有镜头提示词都按它核对过）、圣经参考图提示词 EN/ZH、连续性锁、使用镜头。先生成参考图，再生成任何镜头。

### 5.1 人物 CHAR_

#### `CHAR_RESTORER` · 修复师

- 时代：现代；年龄：约28岁 / ~28
- 使用镜头（34）：S001–S002、S004、S012、S014、S017–S018、S023–S030、S040–S041、S049–S050、S052–S054、S057、S061–S066、S072、S074、S077、S079、S081
- **锁定描述 EN**：~28-year-old East Asian woman conservator; soft oval face, straight natural brows, inner double eyelids, tiny light-brown mole below the outer corner of her LEFT eye; black-brown hair in a loose low ponytail with 2-3 strands at the RIGHT temple (more by dawn); no make-up, jewellery or watch; charcoal wool melton coat #3C4045 with three dark horn buttons (middle one fastened until she sits in S063, open after) and an 18x8 mm rubbed, lighter-grey worn spot on the outer little-finger side of the LEFT cuff ~1 cm above the edge; oatmeal knit, charcoal trousers; thin warm-white cotton conservator gloves (brass smudge on right index tip and thumb) until S061, then bare hands with a 6 mm healed scar on the outer right index finger.
- **锁定描述 ZH**：约 28 岁东亚女性文物修复师；鹅蛋脸、自然平直的眉、内双眼皮，左眼外眼角下方一颗极小的浅褐色痣；黑褐色直发松扎低马尾，右侧太阳穴两三缕碎发（黎明时更多）；不化妆、无首饰、无手表；深灰羊毛呢外套 #3C4045，三粒深褐牛角扣（S063 坐下前扣着中间一粒，之后敞开），左袖口外侧小指一侧、距袖口边约 1 cm 一块 18×8 mm 起毛变浅的磨损；燕麦白针织衫、炭黑长裤；S061 前始终戴略暖白薄棉修复手套（右手食指与拇指指尖一点黄铜污迹），之后裸手，右手食指外侧一道 6 mm 旧疤。
- **连续性锁（圣经）**：worn spot on the LEFT coat cuff, outer (little-finger) side, ~1 cm above the edge, 18x8 mm, #5A5E62 - same position in every shot and in the future vitrine；tiny mole below the LEFT eye；low loose ponytail, loose strands at RIGHT temple; never re-tied during the night；gloves ON in every shot before chapter 8 (BR2 ~194.8 s); bare hands only after；coat worn all night with the middle button fastened; unbuttoned when she sits beside the guard；no watch, no jewellery

- QA：圣经参考图提示词里的 “thin white cotton gloves / 白色薄棉手套” 按圣经 §6.15 改为 “warm-white / 略暖白”（避免生成荧光白），其余逐字保留。

参考图提示词 EN
```text
Character reference: RESTORER, a ~28-year-old East Asian woman museum conservator, slim, 165 cm, soft oval face, straight natural brows, inner double eyelids, small straight nose, natural pale lips, light warm skin with real texture and faint tiredness under the eyes, a tiny light-brown mole 1 cm below the outer corner of her LEFT eye, black-brown straight hair just past the shoulders in a loose low ponytail with two loose strands at the right temple, no make-up, no jewellery, no watch. Wearing a charcoal dark-grey wool melton coat (#3C4045), single-breasted with three dark horn buttons, middle button fastened, over an oatmeal crew-neck knit and charcoal trousers, soft black flat shoes, thin warm-white cotton conservator gloves. Detail inset: the LEFT coat cuff with a small 18x8 mm rubbed, pilled, lighter-grey worn spot on the outer little-finger side just above the cuff edge. Second inset: bare right hand with a small healed scar on the outer side of the index finger. Quiet, attentive expression. photoreal character reference sheet, same person in four full-body views (front, three-quarter, profile, back) plus close-up insets of face, both hands (palm and back) and key costume detail, neutral mid-grey seamless backdrop, soft even 5600K studio light, true-to-life skin texture with pores and fine lines, natural unretouched skin tone, consistent identity in every view, cinematic 35mm film look, fine grain, high detail, no text, no labels, no watermark
```
参考图提示词 ZH
```text
人物参考：修复师，约28岁东亚女性文物修复师，身形偏瘦，165厘米；鹅蛋脸，自然平直的眉，内双眼皮，鼻梁平直，唇色自然偏淡；浅暖肤色，真实肤质，眼下有熬夜的淡青；左眼外眼角下方约1厘米处一颗极小的浅褐色痣；黑褐色直发过肩，松松扎成低马尾，右侧太阳穴落下两三缕碎发；不化妆、无首饰、无手表。穿深灰羊毛呢外套（#3C4045），单排三粒深褐牛角扣、扣着中间一粒，内搭燕麦白圆领针织衫、炭黑直筒裤、黑色软底平底鞋，戴略暖白的薄棉修复手套。细节特写一：外套左袖口外侧（小指一侧）、距袖口边约1厘米处一块18×8毫米的起毛变浅的磨损。细节特写二：摘下手套的右手，食指外侧一道已愈合的小疤。神情安静专注。写实人物参考设定图：同一人物的四个全身视图（正面、四分之三侧、正侧、背面），附面部、双手（掌心与手背）与关键服装细节特写；中性中灰无缝背景，柔和均匀的 5600K 棚拍光；真实皮肤质感，保留毛孔与细纹，自然未修饰的肤色；所有视图中人物身份一致；电影感 35mm 胶片质感，细腻颗粒，高细节；无文字、无标注、无水印
```

#### `CHAR_GUARD` · 夜班工作人员

- 时代：现代；年龄：约65岁 / mid-60s
- 使用镜头（18）：S002、S028–S029、S050、S059–S066、S072–S074、S077、S079、S081
- **锁定描述 EN**：~65-year-old East Asian night attendant; square-round face, three forehead lines, gentle down-turned eyes, pale-brown age spot on his RIGHT cheekbone, clean-shaven (faint grey stubble by dawn); short salt-and-pepper hair thinning at the crown; slightly stooped upper back; navy night-shift jacket #23304A a little big at the shoulders, dull brass-tone buttons, invented text-free badge on the left chest (silver-grey ring with three wave lines); pale grey-blue shirt, navy trousers; reading glasses on a black cord (worn only for the phone in S059-S060, hanging on the cord after); black flashlight on the belt; no ring; old phone in a worn navy flip case.
- **锁定描述 ZH**：约 65 岁东亚男性夜班工作人员；方中带圆的脸、额头三道横纹、眼角下垂，右颧骨一块浅褐色老年斑，胡子刮净（黎明有极淡灰白胡茬）；灰多黑少的短发、头顶略稀；上背微驼；藏青值守夹克 #23304A 肩部略大、旧铜色纽扣，左胸虚构徽章（银灰圆环内三道水波纹，无任何文字）；浅灰蓝衬衫、藏青长裤；老花镜挂在黑色挂绳上（只在 S059–S060 看手机时戴上，之后挂在胸前）；腰侧黑色手电；不戴戒指；旧手机装在磨旧的藏青翻盖套里。
- **连续性锁（圣经）**：slightly stooped upper back (more stooped when seated)；reading glasses on a black cord；age spot on the RIGHT cheekbone；no ring；phone lives in the RIGHT jacket pocket; screen text never readable；badge invented, no text；at the window he sits nearer the window (screen-right), the restorer on his screen-left

参考图提示词 EN
```text
Character reference: GUARD, a ~65-year-old East Asian museum night attendant, 170 cm, slightly stooped upper back, square-round face with three forehead lines, gentle down-turned eyes, a pale-brown age spot on his right cheekbone, clean-shaven, short salt-and-pepper hair thinning at the crown. Wearing a navy night-shift attendant jacket (#23304A) a little big at the shoulders with dull brass-tone buttons and a small invented embroidered badge on the left chest (silver-grey ring with three wave lines, absolutely no text), pale grey-blue shirt with the top button open, navy trousers, soft creased black shoes, reading glasses hanging on a black cord, a black aluminium flashlight on the belt, no ring. Inset: his broad age-spotted hand holding an old dark-grey phone in a worn navy flip case, thumb hovering above the dark screen. Kind, tired, hesitant expression. photoreal character reference sheet, same person in four full-body views (front, three-quarter, profile, back) plus close-up insets of face, both hands (palm and back) and key costume detail, neutral mid-grey seamless backdrop, soft even 5600K studio light, true-to-life skin texture with pores and fine lines, natural unretouched skin tone, consistent identity in every view, cinematic 35mm film look, fine grain, high detail, no text, no labels, no watermark
```
参考图提示词 ZH
```text
人物参考：夜班工作人员，约65岁东亚男性博物馆夜班值守，170厘米，上背微驼；方中带圆的脸，额头三道横纹，眼角下垂、目光温和，右颧骨一块浅褐色老年斑，胡子刮净，短发灰多黑少、头顶略稀。穿藏青夜班值守夹克（#23304A），肩部略显宽大，旧铜色纽扣，左胸一枚虚构线绣徽章（银灰圆环内三道水波纹，绝无文字）；浅灰蓝衬衫最上一粒不扣，藏青长裤，鞋头有细纹的黑色软皮鞋；胸前挂黑绳老花镜，腰侧黑色铝手电，不戴戒指。细节特写：他宽厚有老年斑的手握着装在旧藏青翻盖套里的深灰旧手机，拇指悬在暗着的屏幕上方。神情温和、疲惫、犹豫。写实人物参考设定图：同一人物的四个全身视图（正面、四分之三侧、正侧、背面），附面部、双手（掌心与手背）与关键服装细节特写；中性中灰无缝背景，柔和均匀的 5600K 棚拍光；真实皮肤质感，保留毛孔与细纹，自然未修饰的肤色；所有视图中人物身份一致；电影感 35mm 胶片质感，细腻颗粒，高细节；无文字、无标注、无水印
```

#### `CHAR_NAVIGATOR` · 航海人（火长）

- 时代：航海人；年龄：约35岁 / ~35
- 使用镜头（12）：S001–S002、S006–S007、S010–S011、S022、S024、S045、S066–S067、S075
- **锁定描述 EN**：~35-year-old East Asian compass-keeper of an early-17th-century ocean-going junk; long sun-weathered face, high cheekbones, slightly deep-set dark-brown eyes with deep sun creases, short neat beard and moustache bleached brown by salt, a pale 1.5 cm scar at the tail of his LEFT eyebrow; topknot in an indigo head-cloth (never a Qing queue); faded indigo cross-collar cotton jacket #2E3F5C, hemp under-shirt, wide dark trousers; large rope-callused hands, cracked fingertips, white sea-salt crystals; a pale-blue patch INSIDE his RIGHT cuff, turned back only by his LEFT hand; brown padded night coat (PROP_OUTERCOAT) on night watch until he gives it away in S067.
- **锁定描述 ZH**：约 35 岁东亚男性，17 世纪上半叶远洋帆船的火长；风吹日晒的长脸、颧骨突出、眼窝略深的深褐眼睛带深深的日晒纹，短而整齐、被盐漂浅的胡须，左眉尾一道 1.5 cm 浅白旧疤；发髻裹靛蓝粗布头巾（绝不剃发留辫）；褪色靛蓝右衽交领粗棉短褂 #2E3F5C、本色麻布内衫、深色宽裤；手大、缆绳老茧、指尖干裂、白色细盐；右袖口内侧一块浅蓝补丁，只由左手翻开；夜里守夜穿棕色夹棉外衣（PROP_OUTERCOAT），直到 S067 披给同伴。
- **连续性锁（圣经）**：patch is INSIDE the RIGHT cuff, visible only when the cuff is turned back; he turns it back with his LEFT hand；the hand in the INTRO glass is his LEFT hand (no patch visible)；pale scar at the tail of the LEFT eyebrow；indigo head-cloth over a topknot; no queue；shore light is always screen-left；CH2 order: touches patch FIRST, then looks at the shore light；after giving away the outer coat in CH3 he wears only the indigo jacket

参考图提示词 EN
```text
Character reference: NAVIGATOR, a ~35-year-old East Asian compass-keeper on an early-17th-century ocean-going Chinese junk, lean and strong, long face, high cheekbones, slightly deep-set dark-brown eyes with deep sun creases, short neat beard and moustache, a small pale old scar at the tail of his LEFT eyebrow, deep sun-weathered skin, hair in a topknot wrapped in an indigo cotton head-cloth (no queue). Wearing a faded coarse indigo cotton short jacket with right-over-left cross collar and cloth ties, undyed hemp under-shirt, wide dark trousers rolled to the calf, hemp rope belt with a small pouch, barefoot; a brown padded cotton outer coat shown separately. Inset 1: his RIGHT jacket cuff turned back by his LEFT fingers revealing a 4.5x6 cm patch of paler blue hand-woven cloth sewn inside with uneven off-white running stitches. Inset 2: his large calloused hands with cracked fingertips and fine white sea-salt crystals on the backs and between the fingers. Steady, tired, faraway gaze. photoreal character reference sheet, same person in four full-body views (front, three-quarter, profile, back) plus close-up insets of face, both hands (palm and back) and key costume detail, neutral mid-grey seamless backdrop, soft even 5600K studio light, true-to-life skin texture with pores and fine lines, natural unretouched skin tone, consistent identity in every view, cinematic 35mm film look, fine grain, high detail, no text, no labels, no watermark
```
参考图提示词 ZH
```text
人物参考：航海人，约35岁东亚男性，17世纪上半叶远洋帆船上掌管罗盘的火长；精瘦结实，长脸，颧骨突出，眼窝略深，深褐眼睛，眼角深深的日晒纹，短而整齐的胡须与唇须，左眉尾一道浅白旧疤，长期日晒的深暖肤色；头发束髻，裹靛蓝粗布头巾（不剃发、不留辫）。穿洗旧的靛蓝粗棉右衽交领短褂（布带系结），本色麻布内衫，卷到小腿的深色宽裤，麻绳腰带挂小布袋，赤足；另附棕色夹棉外衣单独展示。细节特写一：他用左手手指翻开右袖口，袖口内侧缝着一块4.5×6厘米的浅蓝手织布补丁，本白棉线针脚略不齐。细节特写二：他粗大有茧的双手，指尖干裂，手背与指缝有细白的海盐结晶。目光稳定、疲惫、望向远方。写实人物参考设定图：同一人物的四个全身视图（正面、四分之三侧、正侧、背面），附面部、双手（掌心与手背）与关键服装细节特写；中性中灰无缝背景，柔和均匀的 5600K 棚拍光；真实皮肤质感，保留毛孔与细纹，自然未修饰的肤色；所有视图中人物身份一致；电影感 35mm 胶片质感，细腻颗粒，高细节；无文字、无标注、无水印
```

#### `CHAR_WIFE` · 等待的人

- 时代：旧日家中；年龄：约30岁 / ~30
- 使用镜头（10）：S016–S017、S019、S024–S026、S035、S041–S042、S066
- **锁定描述 EN**：slender ~30-year-old woman of the navigator's era; face NEVER resolved (candle back-light, lattice shadow, glass, defocus or out of frame); black hair in a low bun with a plain wooden hairpin; washed pale-blue cotton jacket #7D9CBB (the same cloth as his patch), dark indigo-black skirt, mended cloth shoes; a thin, slightly tarnished plain silver bangle on her LEFT wrist; she sits on the screen-left bench, the screen-right bench always empty.
- **锁定描述 ZH**：约 30 岁、与航海人同时代的海边妇人，清瘦；脸永不完全清晰（烛光侧逆、窗格影、玻璃、焦外或在画外）；黑发挽低髻、插一支素面木簪；洗旧的浅蓝粗棉大襟短袄 #7D9CBB（与补丁同一块布）、深靛黑布裙、补过的布鞋；左手腕一只微微氧化的素银细镯；她坐画左长凳，画右长凳永远空着。
- **连续性锁（圣经）**：face never fully clear: seen only in candle back-light, lattice shadow, glass reflection or out of focus；silver bangle on the LEFT wrist；she sits on the screen-left bench facing right; the screen-right seat is always empty；her jacket cloth = the navigator's patch cloth (#7D9CBB)；the same blue-and-white bowl (PROP_BOWL) for rice and for rain；cold rice shows NO steam

参考图提示词 EN
```text
Character reference: WIFE, a ~30-year-old East Asian woman of the early 17th century in a coastal stone house, slender, upright posture, narrow face with a pointed chin, thin brows, long lashes, thin lips, black hair in a low bun with a plain wooden hairpin and a few loose strands behind the ears. Wearing a washed pale blue (#7D9CBB) coarse cotton short jacket with right-side opening and cloth buttons, a dark indigo-black cotton skirt and mended cloth shoes, a plain thin slightly tarnished silver bangle on her LEFT wrist. Inset: her slender working hands mending a pale blue cloth patch with a needle, an old brass thimble on the left middle finger, the silver bangle visible. Quiet, patient, sleepless expression. (Reference for consistency; on screen her face is never fully clear.) photoreal character reference sheet, same person in four full-body views (front, three-quarter, profile, back) plus close-up insets of face, both hands (palm and back) and key costume detail, neutral mid-grey seamless backdrop, soft even 5600K studio light, true-to-life skin texture with pores and fine lines, natural unretouched skin tone, consistent identity in every view, cinematic 35mm film look, fine grain, high detail, no text, no labels, no watermark
```
参考图提示词 ZH
```text
人物参考：等待的人，约30岁东亚女性，17世纪上半叶海边石屋中的妇人；清瘦，坐姿挺直，瓜子脸偏窄、下巴尖，眉细，睫毛长，唇薄；黑发挽低髻，插一支素面木簪，耳后几缕散发。穿洗旧的浅蓝粗棉大襟短袄（#7D9CBB，右衽布纽），深靛黑布裙，补过针脚的布鞋，左手腕一只微微氧化的素银细镯。细节特写：她纤细而劳作过的手正在用针缝一块浅蓝布补丁，左手中指戴旧铜顶针，银镯可见。神情安静、耐心、彻夜未眠。（此图仅用于一致性；成片中她的脸从不完全清晰。）写实人物参考设定图：同一人物的四个全身视图（正面、四分之三侧、正侧、背面），附面部、双手（掌心与手背）与关键服装细节特写；中性中灰无缝背景，柔和均匀的 5600K 棚拍光；真实皮肤质感，保留毛孔与细纹，自然未修饰的肤色；所有视图中人物身份一致；电影感 35mm 胶片质感，细腻颗粒，高细节；无文字、无标注、无水印
```

#### `CHAR_MIGRANT` · 迁徙女性

- 时代：迁徙；年龄：约20岁 / ~20
- 使用镜头（16）：S020、S024、S031–S034、S036–S039、S043、S046、S048、S066、S068、S076
- **锁定描述 EN**：~20-year-old East Asian woman of the 1920s-30s; round-square face with full cheeks, large bright wide-set eyes, straight thick brows, small mole above her RIGHT brow peak, slightly chapped lips, a right canine shows when she smiles; one long black braid; faded grey-blue #8FA1B3 cotton blouse with small white and faded-rose five-petal flowers and five cloth knot buttons; wide dark indigo trousers; black cloth shoes with white layered soles; carries her honey-amber rattan case in her RIGHT hand.
- **锁定描述 ZH**：约 20 岁东亚女性（1920–30 年代）；圆中带方的脸、颊肉饱满，大而亮、两眼距离略宽的眼睛，直而浓的眉，右眉峰上方一颗小痣，嘴唇略干，笑时右侧虎牙微露；一条乌黑长辫；褪色灰蓝底 #8FA1B3、白色与褪玫色小五瓣碎花的棉布大襟衫、五粒布盘扣；深靛黑阔腿裤；白色千层底黑布鞋；右手提蜂蜜琥珀色藤箱。
- **连续性锁（圣经）**：single long braid；small mole above the RIGHT eyebrow peak；floral blouse pattern and colours exactly as specified；she carries the rattan case in her RIGHT hand；letter folded in thirds, then in half；family / town on screen-left, the steamer on screen-right

参考图提示词 EN
```text
Character reference: MIGRANT, a ~20-year-old East Asian young woman of the 1920s-30s about to sail to Southeast Asia, small and sturdy, round-square face with full cheeks, large bright wide-set eyes, straight thick brows, a small mole above the right eyebrow peak, slightly chapped lips, sun-pink cheekbones, black hair in one long braid to mid-back with a thin fringe. Wearing a faded grey-blue (#8FA1B3) cotton blouse with small white and faded-rose five-petal flowers and five cloth knot buttons on a right-side opening, wide dark indigo trousers, black cloth shoes with white layered soles; a thin grey-blue over-jacket over her arm; holding a honey-amber rattan suitcase in her RIGHT hand. Inset: her small strong hands pressing a folded shirt flat with the whole palm. Determined, nervous, tender expression. photoreal character reference sheet, same person in four full-body views (front, three-quarter, profile, back) plus close-up insets of face, both hands (palm and back) and key costume detail, neutral mid-grey seamless backdrop, soft even 5600K studio light, true-to-life skin texture with pores and fine lines, natural unretouched skin tone, consistent identity in every view, cinematic 35mm film look, fine grain, high detail, no text, no labels, no watermark
```
参考图提示词 ZH
```text
人物参考：迁徙女性，约20岁东亚年轻女性，1920–30年代即将渡海下南洋；个子小而结实，圆中带方的脸、颊肉饱满，眼睛大而亮、两眼距离略宽，眉直而浓，右眉峰上方一颗小痣，嘴唇微干，颧骨有日晒的红；黑发编成一条垂到背中的长辫，额前稀薄刘海。穿褪色灰蓝底（#8FA1B3）白色与褪玫色小五瓣碎花棉布大襟衫，五粒布盘扣，深靛黑阔腿裤，白色千层底黑布鞋；手臂上搭一件灰蓝薄棉外褂；右手提蜂蜜琥珀色藤箱。细节特写：她小而有力的手用整个手掌把叠好的衣服压平。神情坚定、紧张、温柔。写实人物参考设定图：同一人物的四个全身视图（正面、四分之三侧、正侧、背面），附面部、双手（掌心与手背）与关键服装细节特写；中性中灰无缝背景，柔和均匀的 5600K 棚拍光；真实皮肤质感，保留毛孔与细纹，自然未修饰的肤色；所有视图中人物身份一致；电影感 35mm 胶片质感，细腻颗粒，高细节；无文字、无标注、无水印
```

#### `CHAR_MAPHAND` · 掌管地图的手

- 时代：地图之手；年龄：中年 / middle-aged (hands only)
- 使用镜头（3）：S021、S044、S047
- **锁定描述 EN**：hands and cuffs only (no face, no body): a middle-aged man's well-kept hands, ethnically ambiguous medium skin #D6B59A, clean trimmed nails, writing bump and faint ink stain on the right middle finger, no ring; dark charcoal wool frock-coat sleeves, 1.5 cm of starched white shirt cuff, plain unengraved brass oval cufflinks; right hand draws, left hand presses the map; iron-gall ink, never red.
- **锁定描述 ZH**：只出现手与袖口（无脸、无身体）：保养良好的中年男性的手，肤色为难以判定族裔的中间色 #D6B59A，指甲修剪干净，右手中指写字茧与淡墨渍，无戒指；深炭黑羊毛礼服袖、露出 1.5 cm 浆白衬衫袖口、素面无刻花的黄铜椭圆袖扣；右手画线、左手压图；铁胆墨，绝不用红色。
- **连续性锁（圣经）**：face and body never seen；right hand draws, left hand presses the map；ink line is iron-gall (blue-black wet, brown-black dry), NEVER red；cufflink plain, no insignia; no ring；the drawn line is horizontal at frame height 0.66 for the line-threshold-handle match

参考图提示词 EN
```text
Prop-character reference: MAPHAND, hands only - a middle-aged man's well-kept hands of the 1890s with clean trimmed nails, no calluses, a writing bump and faint ink stain on the right middle finger, ethnically ambiguous medium skin tone, no ring; dark charcoal wool frock-coat sleeves with 1.5 cm of starched white shirt cuff and a plain brass oval cufflink without any engraving. Views: right hand holding a steel ruling pen against an ebony ruler with brass edges; left hand spread flat on a linen-backed hand-drawn map; both hands from above, from the side and in close-up. No face, no body, no insignia. photoreal character reference sheet, hands and cuffs from four angles plus close-up insets, neutral mid-grey seamless backdrop, soft even 5600K studio light, true-to-life skin texture with pores and fine lines, natural unretouched skin tone, consistent identity in every view, cinematic 35mm film look, fine grain, high detail, no text, no labels, no watermark
```
参考图提示词 ZH
```text
人物参考（仅手）：掌管地图的手——1890年代中年男性保养良好的手，指甲修剪干净，无老茧，右手中指有写字茧与淡淡墨渍，肤色为难以判定族裔的中间色，不戴戒指；深炭黑羊毛礼服袖，露出1.5厘米浆硬白衬衫袖口与一枚无刻花的素面黄铜椭圆袖扣。视图：右手持钢制直线笔靠着铜边乌木直尺；左手五指张开压在裱布手绘地图上；俯视、侧视与特写。不出现脸、身体与任何徽章。写实人物参考设定图：双手与袖口的四个角度视图及特写；中性中灰无缝背景，柔和均匀的 5600K 棚拍光；真实皮肤质感，保留毛孔与细纹，自然未修饰的肤色；所有视图中人物身份一致；电影感 35mm 胶片质感，细腻颗粒，高细节；无文字、无标注、无水印
```

#### `CHAR_MOTHER` · 祈祷的母亲

- 时代：礼拜堂；年龄：约45岁 / ~45
- 使用镜头（5）：S056–S058、S066、S069
- **锁定描述 EN**：~45-year-old East Asian woman of the 1950s; oval face, fairly high cheekbones, fine lines at the eyes, pressed lips; black hair with grey at the temples in a low chignon held by black pins, damp strands at the neck; pale dove-grey #BDB6AB short-sleeved cotton-linen qipao with stand collar; old pale-green jade bangle on her LEFT wrist; holds a folded pale-blue airmail letter; never makes the sign of the cross; shoulders tremble at real speed only.
- **锁定描述 ZH**：约 45 岁东亚女性（1950 年代）；椭圆脸、颧骨较高、眼角细纹、嘴唇抿着；黑发夹着太阳穴处的白发、颈后盘低髻、黑发夹固定，颈侧几缕汗湿碎发；浅鸽灰 #BDB6AB 棉麻短袖立领旗袍；左腕一只旧的浅绿玉镯；手握折好的浅蓝航空信；绝不划十字；肩膀只以真实速度颤抖。
- **连续性锁（圣经）**：pale dove-grey qipao；jade bangle on the LEFT wrist；never makes the sign of the cross or liturgical gestures；sits at the screen-left end of the 7th pew, south side, facing east; light comes from behind her (west windows)；shoulder tremble is real-time, never slow motion；letter folded in thirds then in half (same as PROP_LETTER)

参考图提示词 EN
```text
Character reference: MOTHER, a ~45-year-old East Asian woman of the 1950s, oval face with fairly high cheekbones, fine lines at the eyes, lightly groomed brows, pressed lips, black hair with a few grey strands at the temples in a low chignon held by black pins. Wearing a pale dove-grey (#BDB6AB) cotton-linen short-sleeved knee-length qipao with stand collar and plain cloth frog buttons, black low-heeled shoes, an old pale-green jade bangle on her LEFT wrist, a small worn brown leather handbag. Inset: both hands holding a folded pale-blue onionskin airmail letter to her chest, thumb on the soft worn fold. Restrained, anxious, prayerful expression, eyes closed in one view. photoreal character reference sheet, same person in four full-body views (front, three-quarter, profile, back) plus close-up insets of face, both hands (palm and back) and key costume detail, neutral mid-grey seamless backdrop, soft even 5600K studio light, true-to-life skin texture with pores and fine lines, natural unretouched skin tone, consistent identity in every view, cinematic 35mm film look, fine grain, high detail, no text, no labels, no watermark
```
参考图提示词 ZH
```text
人物参考：祈祷的母亲，约45岁东亚女性，1950年代；椭圆脸、颧骨较高，眼角细纹，眉形很淡，嘴唇抿着；黑发夹着太阳穴处少量白发，在颈后盘成低髻、以黑色发夹固定。穿浅鸽灰（#BDB6AB）棉麻短袖及膝旗袍，立领、素面布盘扣，黑色低跟鞋，左腕一只旧的浅绿玉镯，一只磨旧的小号棕色皮手提包。细节特写：她双手把一封折叠的浅蓝葱皮纸航空信握在胸前，拇指压在被摩挲得发软的折边上。神情克制、不安、祈祷，其中一个视图闭着眼睛。写实人物参考设定图：同一人物的四个全身视图（正面、四分之三侧、正侧、背面），附面部、双手（掌心与手背）与关键服装细节特写；中性中灰无缝背景，柔和均匀的 5600K 棚拍光；真实皮肤质感，保留毛孔与细纹，自然未修饰的肤色；所有视图中人物身份一致；电影感 35mm 胶片质感，细腻颗粒，高细节；无文字、无标注、无水印
```

#### `CHAR_COMPANION` · 年轻同伴

- 时代：航海人；年龄：约17岁 / ~17
- 使用镜头（1）：S067
- **锁定描述 EN**：~17-year-old East Asian sailor; thin boyish beardless face, lips pale with cold, peeling sunburn on the cheekbones; small topknot tied with a frayed undyed cloth band; torn undyed hemp short shirt, dark brown short trousers, barefoot; sleeps against the rope coil at screen-right, head to screen-right.
- **锁定描述 ZH**：约 17 岁东亚少年水手；窄而稚气、无胡须的脸，嘴唇冻得发白，颧骨晒脱皮；小发髻用磨毛的本色布带扎着；袖口磨破的本色麻布短衫、深褐短裤、赤足；睡在画右缆绳卷旁，头朝画右。
- **连续性锁（圣经）**：sleeps against the rope coil on screen-RIGHT, head toward screen-right；the coat falls over him moving left to right

参考图提示词 EN
```text
Character reference: COMPANION, a ~17-year-old East Asian young sailor of the early 17th century, thin, narrow boyish face without beard, lips pale with cold, peeling sunburn on the cheekbones, small topknot tied with a frayed undyed cloth band and many loose strands; wearing a torn undyed hemp short shirt, dark brown short trousers, barefoot. Additional view: curled asleep on a ship's rope coil, shivering. photoreal character reference sheet, same person in four full-body views (front, three-quarter, profile, back) plus close-up insets of face, both hands (palm and back) and key costume detail, neutral mid-grey seamless backdrop, soft even 5600K studio light, true-to-life skin texture with pores and fine lines, natural unretouched skin tone, consistent identity in every view, cinematic 35mm film look, fine grain, high detail, no text, no labels, no watermark
```
参考图提示词 ZH
```text
人物参考：年轻同伴，约17岁东亚少年水手，17世纪上半叶；瘦，窄而稚气的脸、没有胡须，嘴唇冻得发白，颧骨晒脱皮；短小的发髻用磨毛的本色布带扎着，碎发很多；穿袖口磨破的本色麻布短衫、深褐短裤，赤足。附加视图：蜷缩在甲板缆绳卷旁睡着、发抖。写实人物参考设定图：同一人物的四个全身视图（正面、四分之三侧、正侧、背面），附面部、双手（掌心与手背）与关键服装细节特写；中性中灰无缝背景，柔和均匀的 5600K 棚拍光；真实皮肤质感，保留毛孔与细纹，自然未修饰的肤色；所有视图中人物身份一致；电影感 35mm 胶片质感，细腻颗粒，高细节；无文字、无标注、无水印
```

#### `CHAR_TRAVELLER` · 紧张的旅客

- 时代：迁徙；年龄：约14–15岁 / ~14-15
- 使用镜头（1）：S068
- **锁定描述 EN**：~14-year-old East Asian boy travelling alone (1920s-30s); thin, prominent ears, darting eyes, tightly pressed lips, close-cropped hair; oversized grey-brown adult jacket with sleeves rolled twice over a washed-out blue shirt, old cloth cap; hugs a cloth bundle, a text-free ticket in his fist; sits at the migrant's screen-right.
- **锁定描述 ZH**：约 14 岁独自出行的东亚少年（1920–30 年代）；瘦、耳朵显大、眼神四处张望、嘴唇紧抿、短发；明显过大的灰褐大人外套（袖子挽两道）、洗白的蓝布衫、旧布帽；怀抱布包袱，手攥无可读文字的船票；坐在迁徙女性画右。
- **连续性锁（圣经）**：sits on screen-RIGHT of the migrant on the waiting-hall bench；the sweet travels left to right

参考图提示词 EN
```text
Character reference: TRAVELLER, a ~14-year-old East Asian boy travelling alone in the 1920s-30s, thin, prominent ears, darting nervous eyes, tightly pressed lips, close-cropped hair; wearing an oversized grey-brown adult's jacket with sleeves rolled twice over a washed-out blue cotton shirt, an old cloth cap and old cloth shoes, hugging a cloth bundle and clutching a paper ticket with no readable text. photoreal character reference sheet, same person in four full-body views (front, three-quarter, profile, back) plus close-up insets of face, both hands (palm and back) and key costume detail, neutral mid-grey seamless backdrop, soft even 5600K studio light, true-to-life skin texture with pores and fine lines, natural unretouched skin tone, consistent identity in every view, cinematic 35mm film look, fine grain, high detail, no text, no labels, no watermark
```
参考图提示词 ZH
```text
人物参考：紧张的旅客，约14岁东亚少年，1920–30年代独自出行；瘦，耳朵显大，眼神不停张望，嘴唇紧抿，短发；穿明显过大的灰褐色大人外套（袖子挽了两道），里面洗白的蓝布衫，旧布帽、旧布鞋；怀里紧抱布包袱，手里攥着无可读文字的船票。写实人物参考设定图：同一人物的四个全身视图（正面、四分之三侧、正侧、背面），附面部、双手（掌心与手背）与关键服装细节特写；中性中灰无缝背景，柔和均匀的 5600K 棚拍光；真实皮肤质感，保留毛孔与细纹，自然未修饰的肤色；所有视图中人物身份一致；电影感 35mm 胶片质感，细腻颗粒，高细节；无文字、无标注、无水印
```

#### `CHAR_LONELY` · 另一位孤单者

- 时代：礼拜堂；年龄：约75岁 / ~75
- 使用镜头（2）：S056、S069
- **锁定描述 EN**：~75-year-old local man of the 1950s port (ethnicity deliberately unmarked), shown with dignity; thin, deep sun-darkened skin, sparse white hair, deeply lined face, eyes half closed; thin much-washed white cotton shirt, grey trousers, old cloth cap on his knees under folded age-spotted hands; sits at the screen-right end of the pew.
- **锁定描述 ZH**：约 75 岁的港口本地老人（族裔不刻意标注），以尊严呈现；瘦削、深色日晒肤色、白发稀疏、脸上深深的纹路、眼睛半闭；洗得很薄的白棉衬衫、灰色长裤，膝上一顶旧布帽、长老年斑的双手交叠压在帽上；坐在长椅画右端。
- **连续性锁（圣经）**：sits at the screen-RIGHT end of the pew; the mother comes from screen-left；depicted with dignity, never as exotic decoration

参考图提示词 EN
```text
Character reference: LONELY, a ~75-year-old elderly man of a 1950s tropical port town, thin, deeply lined sun-darkened face, sparse white hair, eyes half closed, dignified; wearing a thin much-washed white cotton shirt and grey trousers, an old cloth cap held on his knees with age-spotted hands folded over it. Additional view: seated alone at the end of a teak pew. photoreal character reference sheet, same person in four full-body views (front, three-quarter, profile, back) plus close-up insets of face, both hands (palm and back) and key costume detail, neutral mid-grey seamless backdrop, soft even 5600K studio light, true-to-life skin texture with pores and fine lines, natural unretouched skin tone, consistent identity in every view, cinematic 35mm film look, fine grain, high detail, no text, no labels, no watermark
```
参考图提示词 ZH
```text
人物参考：另一位孤单者，约75岁的老人，1950年代热带港口城市的本地居民；瘦削，深色日晒肤色，脸上深深的纹路，白发稀疏，眼睛半闭，有尊严；穿洗得很薄的白棉衬衫、灰色长裤，膝上放一顶旧布帽，长着老年斑的双手交叠压在帽子上。附加视图：独自坐在柚木长椅的一端。写实人物参考设定图：同一人物的四个全身视图（正面、四分之三侧、正侧、背面），附面部、双手（掌心与手背）与关键服装细节特写；中性中灰无缝背景，柔和均匀的 5600K 棚拍光；真实皮肤质感，保留毛孔与细纹，自然未修饰的肤色；所有视图中人物身份一致；电影感 35mm 胶片质感，细腻颗粒，高细节；无文字、无标注、无水印
```

#### `CHAR_FUTURE` · 未来观看者

- 时代：未来；年龄：20–40岁之间，不确定 / indeterminate 20-40
- 使用镜头（2）：S071、S078
- **锁定描述 EN**：a stranger of an unspecified future, 20-40, gender unclear; short soft dark hair; seamless pale warm-grey high-collared knit garment, no devices; seen ONLY as a reflection, face always defocused and attenuated, never resolved; raises the RIGHT hand to the opening's point (0.50,0.55).
- **锁定描述 ZH**：来自不确定未来的陌生观看者，20–40 岁、性别不确定；短而柔软的深色头发；浅暖灰无缝高领针织长衣，无任何设备；只以倒影出现，脸永远焦外、被反射衰减、永不清晰；抬起右手停在开场两手重合的位置 (0.50,0.55)。
- **连续性锁（圣经）**：appears only as a reflection；face never sharp；hand at frame position (0.50, 0.55), identical to INTRO；camera position identical to INTRO (motion-control data reused)；no sci-fi costume or devices

参考图提示词 EN
```text
Character reference: FUTURE, a stranger of an unspecified near-timeless future, gender unspecified, 20-40 years old, short soft dark hair, gentle neutral expression, wearing a seamless pale warm-grey high-collared knit long garment with a simple silhouette and no technology or devices; one view raising the right hand palm-forward as if touching glass. Also render one view as a faint soft-focus reflection in museum glass. photoreal character reference sheet, same person in four full-body views (front, three-quarter, profile, back) plus close-up insets of face, both hands (palm and back) and key costume detail, neutral mid-grey seamless backdrop, soft even 5600K studio light, true-to-life skin texture with pores and fine lines, natural unretouched skin tone, consistent identity in every view, cinematic 35mm film look, fine grain, high detail, no text, no labels, no watermark
```
参考图提示词 ZH
```text
人物参考：未来观看者，来自不确定的未来，性别不确定，20至40岁之间，短而柔软的深色头发，神情温和中性；穿浅暖灰无缝高领针织长衣，轮廓简单，无任何科技装饰与设备；其中一个视图抬起右手、掌心向前，像要触碰玻璃。另附一个视图：作为博物馆玻璃中淡淡的、焦外的倒影。写实人物参考设定图：同一人物的四个全身视图（正面、四分之三侧、正侧、背面），附面部、双手（掌心与手背）与关键服装细节特写；中性中灰无缝背景，柔和均匀的 5600K 棚拍光；真实皮肤质感，保留毛孔与细纹，自然未修饰的肤色；所有视图中人物身份一致；电影感 35mm 胶片质感，细腻颗粒，高细节；无文字、无标注、无水印
```

### 5.2 道具 PROP_

#### `PROP_CHART` · 海图（针路图）

- 使用镜头（2）：S004–S005
- **锁定描述 EN**：early-17th-century needle-route chart on a horizontal mulberry-paper handscroll (32 cm high): a fictional coastline in mountain-profile elevation, ink-dot reefs, pale indigo water, pale ochre land, dotted route, annotations never legible; twin-peaked islet at (0.62,0.40) in the match frames. THEN cream #DCCDA6, curled corners, two brass weights + a round stone, one wax drip; MUSEUM yellowed #CDB98C, foxing, toned-tissue repairs, two clear acrylic strips where the weights were.
- **锁定描述 ZH**：17 世纪上半叶针路图，横向桑皮纸手卷（高 32 cm）：以山形立面画法画虚构海岸线，墨点为礁、水淡花青、陆淡赭、细墨点航线，注记永不可读；匹配帧中双峰小岛在 (0.62,0.40)。当年：米色 #DCCDA6、四角卷起、两块铜镇纸＋一块圆石、一处烛泪；博物馆：泛黄 #CDB98C、霉斑、调色和纸补边、两条透明亚克力压条（与镇纸同位）。

参考图提示词 EN
```text
Prop reference: an early-17th-century Chinese needle-route sea chart on a horizontal paper handscroll, 32 cm high, a 60 cm section unrolled, a fictional coastline drawn as small mountain-profile islands and ink-dot reefs, pale indigo wash for water, pale ochre for land, a fine dotted sailing route, tiny brush annotations kept illegible and soft. Two states side by side: (1) in use - warm cream paper softened by handling, curled corners, two small brass weights and a round stone, a candle-wax drip; (2) museum - yellowed paper with brown foxing, edge losses repaired with toned Japanese tissue, held by two clear acrylic strips in the same positions as the weights. Include a macro of the paper fibres. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：17世纪上半叶的针路图，横向纸本长卷，高32厘米，展开60厘米一段；以山形立面画法描绘一段虚构海岸，岛屿为小山侧影，礁石为墨点，水面淡花青晕染，陆地淡赭，一条细墨点航路，小楷注记保持不可读、柔焦。两种状态并列：（1）使用中——暖米色纸被手翻软、四角卷起，两块小铜镇纸与一块圆石压着，一处烛泪；（2）博物馆——泛黄、布满褐色霉斑，边缘缺损以调色和纸修补，两条透明亚克力压条位置与铜镇纸相同。附纸张纤维微距。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_COMPASS` · 黄铜罗盘

- 使用镜头（6）：S001–S003、S006、S009、S024
- **锁定描述 EN**：15 cm brass mariner's compass in a camphor-wood box; blued-steel dry-pivot needle with a vermilion drop on its SOUTH tip; rings of trigram bars, the 24 bearings (correct order; calligrapher texture or kept soft), 28 drilled star points, a silver-inlaid pole star. THEN warm golden brass, thumb-polished rim at south, soot, salt bloom, mica intact; MUSEUM matte chocolate patina, verdigris in the grooves, mica cracked at the north-west (qian) edge, on a 15-degree acrylic cradle over near-black navy velvet.
- **锁定描述 ZH**：直径 15 cm 黄铜罗盘，樟木罗盘匣；发蓝钢针（旱罗盘），南端一滴朱红漆；八卦刻线、二十四向（顺序正确，由书法顾问书写或保持柔焦）、外圈二十八星点、北辰嵌银。当年：暖金铜色、南向口沿被拇指磨亮、刻槽积烟灰、盐霜、云母完整；博物馆：哑光巧克力褐包浆、刻槽铜绿、云母在西北（乾位）边缘有裂纹，倾斜 15° 置于近黑深蓝绒布上的亚克力托架。

参考图提示词 EN
```text
Prop reference: a 17th-century Chinese brass mariner's compass, 15 cm round, in a square camphor-wood box; central needle well under a thin golden mica cover with a blued-steel needle whose south end has a drop of red lacquer; concentric engraved rings: eight trigram bar symbols, then the 24 Chinese bearings in small engraved regular script filled black, then an outer ring of tiny drilled star points joined by hair-fine lines into small constellations with one silver-inlaid star at north. Two states: (1) in use - warm golden brass, rim thumb-polished bright, soot in the grooves, white sea-salt bloom at the box edge, candlelight glinting along the engravings; (2) museum - stabilised matte chocolate-brown patina with honey highlights, blue-green verdigris in the deepest grooves, a crack across one edge of the mica, on a clear acrylic cradle over near-black navy velvet. Macro inset: needle tip and engraved stars. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：17世纪中国航海黄铜罗盘，直径15厘米，嵌在方形樟木罗盘匣中；中央针池覆一片微带金色的薄云母，发蓝钢针的指南一端点一滴朱红漆；同心刻圈依次为：八卦卦象刻线、二十四向小楷阴刻填黑、最外圈由极细刻线连成小星组的二十八处钻孔星点，正北一颗嵌银大星。两种状态：（1）使用中——温暖的金色黄铜，口沿被拇指磨亮，刻槽积着烟灰，匣边有白色盐霜，烛光沿刻痕闪动；（2）博物馆——稳定化处理后的哑光巧克力褐包浆、高点蜂蜜色，最深刻槽里有蓝绿色铜绿，云母一侧边缘有裂纹，置于透明亚克力托架、近黑深蓝绒布上。微距特写：针尖与刻星。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_BOWL` · 青花碗（整碗）

- 使用镜头（10）：S013、S015–S017、S019、S024、S026、S041–S042、S066
- **锁定描述 EN**：THE canonical folk-kiln blue-and-white flared bowl (rim 15.2 cm): bluish-white glaze with pinholes, loose cobalt with dark iron spots; outer rim band = ONE continuous flowering plum branch with 16 five-petal blossoms; side A a single-sail boat with three batten lines over waves under a crescent moon; side B a low fence, plum branch and a cracked-ice lattice window; centre double circle with one plum blossom; no reign mark. With cold rice and untouched chopsticks - never steam; or empty at the step's outer edge under the eaves' drip line for rain.
- **锁定描述 ZH**：唯一标准纹样的民窑青花撇口碗（口径 15.2 cm）：白中泛青、带棕眼的釉，笔触粗放的钴料与铁锈斑；外口沿纹带为一枝连绵不断的折枝梅（16 朵五瓣梅）；A 面单帆小船、帆上三道竹篾、波浪与左上新月；B 面矮篱、梅枝与冰裂纹方窗；碗心双圈一朵五瓣梅；无底款。盛凉饭与未动的竹筷——绝无热气；或空碗放在檐下石阶外沿的滴水线下接雨。

参考图提示词 EN
```text
Prop reference: folk-kiln blue-and-white flared-rim bowl, rim diameter 15.2 cm, height 6.6 cm, foot 6.0 cm; slightly bluish white glaze with tiny pinholes; quick loose cobalt brushwork with dark heaped iron spots; outer rim band 1 cm wide between thin double lines containing ONE continuous flowering plum branch with 16 five-petal blossoms alternating with buds; side A: a single-sail small boat with three batten lines on three rows of wave lines under a crescent moon at upper left; side B: a low fence, a plum branch and a square window filled with a cracked-ice lattice; large plain white space between sides A and B; inside: one fine line below the rim, and in the centre a double circle (4.5 cm) holding a single five-petal plum blossom; unglazed foot ring with orange-brown kiln flush, no reign mark. Views: exterior side A (boat and moon), exterior side B (window with cracked-ice lattice), top-down into the bowl showing the central plum blossom, and the unglazed foot. Additional state: the same bowl filled with cold white rice, top grains dry, a pair of bamboo chopsticks resting across the rim, absolutely no steam. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：南方民窑青花撇口碗，口径15.2厘米、高6.6厘米、圈足径6.0厘米；白中泛淡青的釉，有细小棕眼；钴料笔触快而不工整，堆积处有深色铁锈斑；外口沿下1厘米宽、上下各一道细弦线的纹带内，是一枝连绵不断的折枝梅，共16朵五瓣梅花与花苞交替；外壁A面：三行波浪线上一叶单帆小船（帆上三道横线），左上方一弯新月；外壁B面：一段矮篱笆、一枝梅与一扇方窗，窗内为冰裂纹格子；A、B两面之间大面积留白；内壁口沿下一道细弦线，碗心双圈（直径4.5厘米）内一朵五瓣梅花；圈足无釉，露胎处有橙褐色火石红，底部无款。视图：外壁A面（小船与新月）、外壁B面（冰裂纹窗）、正俯视碗心梅花、圈足。附加状态：同一只碗盛着凉了的白米饭，表面米粒发干，一双竹筷横放在碗口，绝无热气。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_SHARDS` · 青花残片

- 使用镜头（4）：S012–S015
- **锁定描述 EN**：the same bowl in 7 shards + 1 missing piece (in the plain zone between sides A and B); cracks pass only BETWEEN rim blossoms so the band reads complete; grey-white break edges; on grey foam and in a fine white-sand conservation tray.
- **锁定描述 ZH**：同一只碗碎成 7 片＋1 处缺失（A、B 两面之间的留白处）；裂纹只从口沿梅花之间穿过，对齐后纹带完整；灰白断面；放在灰色海绵垫与细白沙修复沙盘中。

参考图提示词 EN
```text
Prop reference: seven shards of the canonical bowl - folk-kiln blue-and-white flared-rim bowl, rim diameter 15.2 cm, height 6.6 cm, foot 6.0 cm; slightly bluish white glaze with tiny pinholes; quick loose cobalt brushwork with dark heaped iron spots; outer rim band 1 cm wide between thin double lines containing ONE continuous flowering plum branch with 16 five-petal blossoms alternating with buds; side A: a single-sail small boat with three batten lines on three rows of wave lines under a crescent moon at upper left; side B: a low fence, a plum branch and a square window filled with a cracked-ice lattice; large plain white space between sides A and B; inside: one fine line below the rim, and in the centre a double circle (4.5 cm) holding a single five-petal plum blossom; unglazed foot ring with orange-brown kiln flush, no reign mark - laid out on grey conservation foam and partly aligned in a tray of fine white sand; the rim band of plum blossoms continues unbroken across three rim shards because the cracks run between blossoms; one shard with the central blossom and foot ring, one with the boat and crescent moon, one with the cracked-ice window; a visible gap where one piece of plain white body between the two scenes is missing; grey-white break edges. Include a top-down layout and a macro of a crack meeting the glaze. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：标准青花碗的七片残片——南方民窑青花撇口碗，口径15.2厘米、高6.6厘米、圈足径6.0厘米；白中泛淡青的釉，有细小棕眼；钴料笔触快而不工整，堆积处有深色铁锈斑；外口沿下1厘米宽、上下各一道细弦线的纹带内，是一枝连绵不断的折枝梅，共16朵五瓣梅花与花苞交替；外壁A面：三行波浪线上一叶单帆小船（帆上三道横线），左上方一弯新月；外壁B面：一段矮篱笆、一枝梅与一扇方窗，窗内为冰裂纹格子；A、B两面之间大面积留白；内壁口沿下一道细弦线，碗心双圈（直径4.5厘米）内一朵五瓣梅花；圈足无釉，露胎处有橙褐色火石红，底部无款——摆放在灰色修复海绵垫上，部分残片对齐插在细白沙盘中；口沿梅花纹带跨三片残片仍然连续，因为裂纹都从梅花之间穿过；一片带碗心梅花与圈足，一片带小船与新月，一片带冰裂纹窗；两幅画面之间的留白处缺失一块，留出空缺；断面为灰白胎。附俯视排布图与裂纹穿过釉面的微距。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_PATCH` · 袖口补丁

- 使用镜头（4）：S011、S035、S045、S067
- **锁定描述 EN**：4.5x6 cm pale-blue #7D9CBB hand-woven patch INSIDE the RIGHT cuff of the navigator's indigo jacket, small off-white running stitches, one uneven corner with a double knot, centre rubbed soft and shiny; hidden until the cuff is turned back.
- **锁定描述 ZH**：航海人靛蓝短褂右袖口内侧 4.5×6 cm 浅蓝手织布补丁 #7D9CBB，本白棉线细密平针，一角针脚不齐并打了两次结，中间被摩挲得起毛发亮；袖口翻开才可见。

参考图提示词 EN
```text
Prop reference: the right cuff of a faded indigo coarse-cotton 17th-century jacket turned back to reveal a 4.5x6 cm patch of paler blue hand-woven cotton sewn on the inside with small uneven off-white running stitches and a double knot at one corner, the centre of the patch rubbed soft and slightly shiny by years of a thumb. Include a macro of the stitches and weave, and a view of the cuff folded normally with the patch hidden. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：一件洗旧的17世纪靛蓝粗棉短褂的右袖口被翻开，露出缝在内侧的一块4.5×6厘米浅蓝手织棉布补丁，本白棉线细密平针、略不整齐，一角打了两次结；补丁中间被拇指常年摩挲得起毛、微亮。附针脚与织纹微距，以及袖口正常放下、补丁不可见的视图。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_SHIRT` · 旧衫

- 使用镜头（6）：S023、S030–S031、S033、S043、S049
- **锁定描述 EN**：a family member's old men's centre-opening shirt, faded grey-blue (#6F7F8F then, #8392A0 museum), seven cloth buttons, mended collar, a 3x4 cm triangle cut from the lower-right hem; folded sleeves-back, in half, then in three (30x22 cm), corners pressed flat with the palm.
- **锁定描述 ZH**：家人的男式旧对襟短衫，褪色灰蓝（当年 #6F7F8F，博物馆 #8392A0），七粒布纽，领口补过，衣摆右下角剪去 3×4 cm 三角；折法：袖子后折、衣身对折、再三折成 30×22 cm，用手掌压平衣角。

参考图提示词 EN
```text
Prop reference: a 1920s Chinese men's centre-opening short shirt in faded grey-blue cotton with seven cloth knot buttons, collar mended with a slightly darker patch, elbows worn thin, a small triangle cut out of the lower right hem. Views: laid flat; folded into a neat 30x22 cm block; macro of the cotton creases and worn weave. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：一件1920年代男式对襟短衫，褪色灰蓝棉布，七粒布纽，领口用略深的布补过，肘部磨薄，右下衣摆被剪去一个小三角。视图：平铺；叠成30×22厘米的整齐方块；棉布折痕与磨薄织纹的微距。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_CASE` · 藤箱

- 使用镜头（18）：S020、S023–S024、S028、S030–S033、S036、S038、S040、S043、S046、S048–S049、S066、S068、S076
- **锁定描述 EN**：1920s-30s rattan suitcase 58x38x21 cm: honey-amber split rattan over bamboo, two brown leather straps with brass buckles, leather corners, rattan-wrapped handle, indigo resist-print lining with small white flowers; carried in her RIGHT hand. MUSEUM: one broken corner, cracked straps, dull buckles, sweat-darkened handle.
- **锁定描述 ZH**：1920–30 年代藤箱 58×38×21 cm：竹框外包蜂蜜琥珀色劈藤，两条棕皮带配黄铜扣，四角包皮，藤皮缠绕的提手，蓝印花布内衬（白色小碎花）；右手提。博物馆：一角藤条断裂、皮带干裂、带扣发暗、提手被手汗浸深。

参考图提示词 EN
```text
Prop reference: a 1920s-30s Chinese rattan suitcase, 58x38x21 cm, honey-amber woven split rattan over a bamboo frame, two brown leather straps with brass buckles, leather corners, a rattan-wrapped handle darkened by use, lid open showing an indigo-and-white resist-printed cotton lining. Two states: (1) in use, buckles bright; (2) museum, one corner's rattan broken, leather cracked, buckles dull, a folded grey-blue shirt and a boxwood comb inside. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：1920–30年代中国藤箱，58×38×21厘米，竹框外包蜂蜜琥珀色劈藤编织，两条棕色皮带配黄铜带扣，四角包皮，提手藤皮被手握得发深；箱盖打开，露出蓝白蓝印花布内衬。两种状态：（1）使用中，带扣明亮；（2）博物馆，一角藤条断裂翘起，皮带干裂，带扣发暗，箱内放着叠好的灰蓝旧衫与一把黄杨木梳。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_KEEPSAKE` · 家人小物（黄杨木梳）

- 使用镜头（4）：S023、S030、S033、S049
- **锁定描述 EN**：boxwood comb 9.5x5 cm, 34 teeth (two worn short), honey-coloured, wrapped in a 15 cm square of faded red-brown cotton #8E4A3C; museum: cloth untied and laid flat, comb on it.
- **锁定描述 ZH**：黄杨木梳 9.5×5 cm、34 齿（两齿磨短），蜂蜜色，用 15 cm 见方的褪色红褐棉布 #8E4A3C 包着；博物馆：包布解开平铺，木梳放在上面。

参考图提示词 EN
```text
Prop reference: an old boxwood comb, 9.5x5 cm with 34 teeth, two worn shorter, honey-coloured and mellowed by hair oil, shown wrapped in a small square of faded red-brown cotton and unwrapped lying on the cloth with its fold lines; macro of the wood grain. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：一把旧黄杨木梳，9.5×5厘米，34齿，其中两齿磨短，被头油浸得温润发深；展示用褪色红褐小方布包着的状态，以及解开后木梳放在带折痕的包布上的状态；附木纹微距。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_LETTER` · 信（迁徙女性）

- 使用镜头（8）：S020、S043、S049–S054
- **锁定描述 EN**：eight-column letter on thin cream bamboo paper #E7DCC3 with faded vermilion rules, black brush script never legible; folded in thirds then in half (~8.5 cm); CH2: a grey-blue shirt-cloth triangle inside. MUSEUM: flattened in a clear sleeve, soft fold valleys, foxing, a pressed browned jasmine in the margin, the last column stopping mid-stroke.
- **锁定描述 ZH**：八行笺：米色薄竹纸 #E7DCC3，印褪色朱红竖格，黑色毛笔小楷永不可读；先三折再对折（约 8.5 cm）；CH2 信中夹一片灰蓝旧衫三角布。博物馆：展平于透明保护套、折痕成柔软凹谷、霉斑，页边一朵压扁的褐色茉莉，最后一行写到一半。

参考图提示词 EN
```text
Prop reference: a 1920s Chinese letter on thin cream bamboo paper with eight faded vermilion vertical column rules, small brush-script writing kept soft and illegible; states: folded in thirds then in half with soft worn creases and a small triangle of faded grey-blue shirt cloth tucked inside; and flattened in a clear archival sleeve with soft fold valleys, foxing, a pressed browned jasmine flower in the margin, the last column ending mid-stroke. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：一封1920年代的信，写在印有八条褪色朱红竖格线的米色薄竹纸（八行笺）上，小楷字迹保持柔焦不可读；状态：先三折再对折、折痕被反复折叠得发软，里面夹着一小片三角形灰蓝旧衫布；以及展平夹在透明档案保护套中的状态——折痕成为柔软的凹谷，有霉斑，页边夹着一朵压扁变褐的茉莉花，最后一行写到一半停住。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_AIRLETTER` · 航空信（母亲）

- 使用镜头（4）：S056–S058、S069
- **锁定描述 EN**：1950s pale-blue onionskin airmail letter #C9D6E2, translucent, writing faintly showing through and never legible; folded in thirds then in half, edges thumb-softened.
- **锁定描述 ZH**：1950 年代浅蓝葱皮纸航空信 #C9D6E2，半透明，背面字迹隐约透出且永不可读；先三折再对折，折边被拇指摩挲得发软。

参考图提示词 EN
```text
Prop reference: a folded 1950s pale-blue onionskin airmail letter, translucent with faint illegible handwriting showing through, folded in thirds then in half, edges softened and fuzzy from being rubbed by a thumb; one view with coloured stained-glass light glowing through it. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：一封折叠的1950年代浅蓝葱皮纸航空信，半透明，隐约透出不可读的字迹，先三折再对折，折边被拇指摩挲得发软起毛；其中一个视图有彩窗的彩光透过信纸。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_SWEETS` · 油纸糖

- 使用镜头（2）：S034、S068
- **锁定描述 EN**：10x8 cm packet of translucent honey tung-oil paper tied crosswise with thin red cotton string; peanut-sesame brittle and sugar-frosted winter-melon strips; glows warm when light is behind it.
- **锁定描述 ZH**：10×8 cm 半透明蜂蜜色桐油纸包，细红棉绳十字系紧；内装花生芝麻酥与撒糖霜的冬瓜条；背后有光时温暖透亮。

参考图提示词 EN
```text
Prop reference: a small square packet of translucent honey-coloured oiled paper tied crosswise with thin red cotton string, shown closed with warm lamplight glowing through it, and opened revealing pieces of peanut-sesame brittle and sugar-frosted candied winter-melon strips; 1920s China. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：一个用细红棉绳十字系紧的半透明蜂蜜色桐油纸方包，闭合状态下暖色灯光透过油纸发光；打开后可见花生芝麻酥糖块与糖霜冬瓜条；1920年代中国。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_LAMP` · 门口小灯

- 使用镜头（4）：S035、S041–S042、S066
- **锁定描述 EN**：small brown-glazed stoneware oil-lamp dish (9 cm) in the stone niche left of the old home's door; rush-pith wick, steady 2 cm 1900K flame - the same warm point as the navigator's shore light (M7).
- **锁定描述 ZH**：旧日家中门左石墙壁龛里的小油灯：酱褐釉陶灯盏（9 cm）、灯芯草芯，约 2 cm 的 1900K 稳定火苗——与航海人望见的岸灯是同一种暖点（M7）。

参考图提示词 EN
```text
Prop reference: a small 17th-century Chinese brown-glazed stoneware oil-lamp dish on a short stand with a rush-pith wick and a small steady 2 cm flame, set in a rough granite wall niche beside a wooden door at night; one view with a hand shielding the flame. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：一盏17世纪中国酱褐釉陶小油灯盏，带矮灯座，灯芯草芯，2厘米高的小而稳定的火焰，放在夜晚木门旁粗糙花岗岩墙的壁龛里；其中一个视图有一只手护着火焰。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_STAMP` · 旅行印章

- 使用镜头（1）：S037
- **锁定描述 EN**：brass-faced hand stamp (38 mm) with turned dark rosewood handle; aniline-violet ink #5B4A78, never red; invented text-free emblem: double ring, simple steamer, three waves, six-pointed star.
- **锁定描述 ZH**：黄铜印面（38 mm）、紫檀色木柄的手持印章；苯胺紫印泥 #5B4A78，绝不是红色；虚构无文字图案：双圈、简化轮船、三道波浪、六角星。

参考图提示词 EN
```text
Prop reference: a 1920s-30s hand stamp with a round brass face and a turned dark rosewood handle beside a flat tin ink pad of violet ink, and a crisp violet impression on cream paper showing an invented emblem - a double ring around a simple steamship over three waves under a six-pointed star - with no letters or words at all. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：一枚1920–30年代的手持印章，圆形黄铜印面、紫檀色车木柄，旁边是一只扁铁盒紫色印台；米色纸上一枚清晰的紫色印迹：双圈之内一艘简化的轮船、三道波浪与一颗六角星的虚构图案，完全没有任何文字。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_PASS` · 通行纸（旅行证件）

- 使用镜头（5）：S023、S030、S037–S038、S040
- **锁定描述 EN**：invented travel permit: folded cream laid card, grey-green guilloche border, ruled fields with unreadable handwriting, four photo corner-mounts (then: photo never frontal; museum: photo gone, four empty mounts, stamp faded grey-violet #7A6E8C).
- **锁定描述 ZH**：虚构通行纸：对折米色仿古纹卡纸，灰绿扭索纹边框，表格与手写内容全部不可读，四个照片相角（当年照片永不正面入画；博物馆照片已脱落、只剩四个空相角，印迹褪成灰紫 #7A6E8C）。

参考图提示词 EN
```text
Prop reference: an invented 1920s-30s travel permit, a folded cream laid-paper card with a fine grey-green guilloche border and ruled form fields filled in faint unreadable handwriting, a violet circular stamp half over the border, and four small photo corner-mounts at upper left that are EMPTY (the photo is missing); aged museum state, no legible text anywhere. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：一张虚构的1920–30年代旅行通行纸，对折的米色仿古纹卡纸，细密的灰绿扭索纹边框，表格栏线内是淡淡的不可读手写字，一枚紫色圆形印迹半压在边框上，左上角四个小相角是空的（照片已脱落）；博物馆老化状态，任何地方都没有可读文字。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_CANDLE` · 蜡烛

- 使用镜头（7）：S016–S017、S024–S026、S035、S066
- **锁定描述 EN**：ivory plant-wax candle (2 cm) in an old brass candlestick with drip pan, 1850K flame; burn states A 18 cm -> B 11 cm (one drip) -> C 6 cm (wax pooled) -> D 2.5 cm stub (B in S016, B->C in S017, C in CH1 S024-S026, D in S066-P2).
- **锁定描述 ZH**：象牙色植物蜡烛（直径 2 cm），旧铜烛台带接蜡盘，火焰 1850K；燃烧状态 A 18 cm → B 11 cm（一道蜡泪）→ C 6 cm（蜡泪堆在接蜡盘）→ D 2.5 cm 残烛（S016 为 B，S017 B→C，CH1 的 S024–S026 为 C，S066 P2 为 D）。

参考图提示词 EN
```text
Prop reference: an ivory plant-wax candle in an old brass candlestick with a drip pan, shown in four burn states side by side - 18 cm freshly lit, 11 cm with one wax drip, 6 cm with wax pooled in the pan, a 2.5 cm stub - each with a small calm 1850K flame; plus the museum state: the brass candlestick with a cold stub. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：插在带接蜡盘旧铜烛台上的象牙色植物蜡蜡烛，并列展示四个燃烧状态——18厘米刚点燃、11厘米一道蜡泪、6厘米蜡泪积在接蜡盘、2.5厘米残烛——每个都有小而安静的1850K火焰；另附博物馆状态：带一截冷残烛的铜烛台。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_SHIPLAMP` · 船灯

- 使用镜头（14）：S002–S003、S005–S011、S022、S024、S045、S066–S067
- **锁定描述 EN**：hexagonal bamboo-and-wood lantern with scraped-horn panels (stern 55 cm, cabin 25 cm), candle inside, 1950K, swinging on a 6-8 s period; museum (corridor P1): unlit, blackened, two cracked panels, one missing.
- **锁定描述 ZH**：六角竹木框刮角片灯（艉灯 55 cm、舱灯 25 cm），内燃蜡烛，1950K，6–8 秒一周期摆动；博物馆（长廊 P1）：不点亮、竹框发黑、两面角片开裂、一面缺失。

参考图提示词 EN
```text
Prop reference: a 17th-century Chinese ship's stern lantern, hexagonal bamboo-and-wood frame 55 cm tall with translucent cream-amber scraped-horn panels and an iron hook, glowing warmly from a candle inside; a smaller 25 cm cabin version; and the museum state - unlit, blackened frame, two cracked horn panels and one missing. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：17世纪中国帆船艉灯，六角形竹木框，高55厘米，嵌半透明奶油琥珀色刮角片，铁钩悬挂，内燃蜡烛发出温暖的光；另附25厘米的小号舱灯；以及博物馆状态——不点亮，竹框发黑，两面角片开裂、一面缺失。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_GLOVES` · 白手套

- 使用镜头（22）：S001–S002、S004、S012、S014、S023、S025–S026、S028–S030、S040–S041、S049–S050、S052–S054、S061–S063、S074
- **锁定描述 EN**：thin warm-white #F1EFE8 (never optical white) cotton-knit conservator gloves, ribbed cuffs, near-invisible grip dots, a faint grey-brown brass smudge on the right index tip and thumb; removed right first, then left (S061), folded, laid on the bench corner (S063-S074).
- **锁定描述 ZH**：略暖白 #F1EFE8（绝非荧光白）的薄棉针织修复手套，罗纹腕口，几乎看不见的防滑胶点，右手食指与拇指指尖一点浅灰褐黄铜污迹；S061 先右后左摘下、叠好，S063–S074 放在长凳角上。

参考图提示词 EN
```text
Prop reference: a pair of thin warm-white cotton-knit museum conservator gloves with ribbed cuffs and near-invisible white grip dots on the palms, a faint grey-brown brass smudge on the right index fingertip and thumb tip; views worn on a woman's slim hands, and folded flat as a pair on a teak bench. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：一副暖白色薄棉针织文物修复手套，罗纹腕口，掌面有几乎看不见的白色防滑胶点，右手食指与拇指指尖各有一点浅灰褐的黄铜污迹；视图：戴在女性纤细的手上，以及成对叠好平放在柚木长凳上。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_TEA` · 两杯热茶

- 使用镜头（10）：S062–S066、S072、S074、S077、S079、S081
- **锁定描述 EN**：two handle-less porcelain cups (8.2 cm), pale bluish-white glaze, ONE thin complete cobalt line 6 mm below the rim; his cup has a tiny chip at 2 o'clock, hers is new; jasmine tea #C9A55A; steam backlit against dark (cold, no steam S072-S074; refilled S077); final: his screen-right, hers screen-left, ~6 cm apart.
- **锁定描述 ZH**：两只无柄瓷茶杯（口径 8.2 cm），青白釉，杯口下 6 mm 一道完整的钴蓝细线；他的杯子口沿 2 点钟有个小磕口，她的是同款新杯；茉莉花茶 #C9A55A；热气以暗背景衬托、逆光照亮（S072–S074 茶已凉、无热气；S077 续茶）；尾镜他的在画右、她的在画左，相距约 6 cm。

参考图提示词 EN
```text
Prop reference: two identical handle-less porcelain teacups with a pale bluish-white glaze and a single thin cobalt-blue line just below the rim, one with a tiny chip on the rim, filled with pale amber jasmine tea and a few unfurled leaves, gentle steam rising, backlit against a dark window; a view of the two cups side by side on a white-painted wooden window sill. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：两只同款无柄瓷茶杯，青白釉，口沿下一道钴蓝细线，其中一只口沿有极小的磕口；杯中是浅琥珀色的茉莉花茶与几片舒展的茶叶，热气缓缓升起，以暗色窗为背景逆光照亮；附两只杯子并排放在漆白木窗台上的视图。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_PHONE` · 手机

- 使用镜头（9）：S028、S059–S063、S072–S074
- **锁定描述 EN**：unbranded older smartphone, matte dark grey, worn navy faux-leather flip case cracked at one corner; screen never readable; face down on his right thigh from S060 until he dials in S072.
- **锁定描述 ZH**：无品牌旧款智能手机，哑光深灰，磨旧的藏青仿皮翻盖套、套角开裂；屏幕永不可读；S060 起屏幕朝下扣在他右大腿上，直到 S072 拨出。

参考图提示词 EN
```text
Prop reference: an unbranded older smartphone, matte dark grey, in a worn navy faux-leather flip case with a cracked corner and a cracked screen-protector corner, screen dimly glowing cool white with a soft out-of-focus generic interface and no readable text, no logos. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：一部无品牌的旧款智能手机，哑光深灰，装在磨旧、一角开裂的藏青仿皮翻盖套里，屏幕保护膜一角有裂纹；屏幕发出微弱的冷白光，界面为柔焦的通用样式，没有任何可读文字与标志。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_COAT` · 深灰外套

- 使用镜头（28）：S001–S002、S012、S014、S017、S023、S025、S028–S029、S040、S049–S050、S052–S054、S061–S066、S070–S072、S074、S077–S079
- **锁定描述 EN**：the restorer's charcoal wool melton coat #3C4045 with the LEFT-cuff worn spot; FUTURE state (S070-S071, S078): faded brownish grey #5B5853, folded on a 12-degree linen-covered board in the G1 vitrine, left cuff on top facing the glass, worn spot brighter but identical in shape and position.
- **锁定描述 ZH**：修复师的深灰羊毛呢外套 #3C4045，带左袖口磨损；未来状态（S070–S071、S078）：褪成偏褐的灰 #5B5853，叠放在 G1 展柜里倾斜 12° 的亚麻展板上，左袖口在最上、朝向玻璃，磨损更亮但形状与位置完全一致。

参考图提示词 EN
```text
Prop reference: a woman's charcoal-grey wool melton coat, single-breasted with three dark horn buttons, notch lapel, mid-thigh straight cut, with a small 18x8 mm rubbed and pilled lighter-grey worn spot on the outer little-finger side of the LEFT cuff just above the edge (macro inset). Second state: the same coat aged by decades, faded to a brownish grey, lying flat on a linen-covered sloped museum display board inside a frameless glass vitrine, left cuff arranged toward the viewer with the same worn spot visible. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：一件女式深灰羊毛呢外套，单排三粒深褐牛角扣，平驳领，及大腿中部直身剪裁；左袖口外侧（小指一侧）、紧挨袖口边上方有一块18×8毫米的起毛变浅磨损（附微距特写）。第二状态：同一件外套经过数十年岁月，褪成偏褐的灰，平躺在无框玻璃展柜内包亚麻布的倾斜展板上，左袖口朝向观者，同一处磨损清晰可见。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_OUTERCOAT` · 航海人夹棉外衣

- 使用镜头（4）：S022、S045、S066–S067
- **锁定描述 EN**：brown #5B4634 padded coarse-cotton night coat, knee length, wide sleeves, right-over-left, rope-paled shoulders, undyed lining; worn by the navigator at night (S022, S045, S066-P1) and laid over the companion left to right in S067.
- **锁定描述 ZH**：棕色 #5B4634 粗棉夹棉守夜外衣，及膝、宽袖、右衽，肩部被缆绳磨浅，本色里子；航海人夜里穿着（S022、S045、S066-P1），S067 由画左向画右披到同伴身上。

参考图提示词 EN
```text
Prop reference: a 17th-century Chinese sailor's brown padded coarse-cotton outer coat, knee length, wide sleeves, right-over-left closure, shoulders paled by rope wear, undyed lining; views laid flat, hanging, and draped over a sleeping figure on a ship's deck. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：17世纪中国水手的棕色粗棉夹棉外衣，及膝、宽袖、右衽，肩部被缆绳磨出浅色，本色里子；视图：平铺、悬挂、披在甲板上睡着的人身上。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_MAP` · 地图（掌管地图的手）

- 使用镜头（3）：S021、S044、S047
- **锁定描述 EN**：1890s linen-backed hand-drawn administrative map (90x70 cm, paper #E2D6B8) of the same fictional coast: brown-ink coastline, hachured hills, blank water, no legible names; ebony brass-edged ruler, steel ruling pen, brass weights; the new line iron-gall blue-black when wet, never red, horizontal at frame height 0.66.
- **锁定描述 ZH**：1890 年代亚麻裱手绘行政地图（90×70 cm，纸色 #E2D6B8），同一段虚构海岸：褐墨海岸线、晕滃线山地、水域留白、无可读地名；乌木铜边直尺、钢制直线笔、黄铜镇纸；新线为铁胆墨，湿时蓝黑、绝不用红色，水平位于画面高度 0.66。

参考图提示词 EN
```text
Prop reference: a large 1890s hand-drawn administrative coastal map on linen-backed paper with brown-ink coastline and hachured hills, water left blank, no legible place names; an ebony ruler with brass edges, a steel ruling pen, a glass inkwell and brass weights on it; a freshly drawn straight blue-black iron-gall ink line still wet and glistening in kerosene lamplight. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：一张1890年代裱布手绘沿海行政地图，褐色墨线海岸、晕滃线山地，水域留白，没有可读地名；图上放着铜边乌木直尺、钢制直线笔、玻璃墨水瓶与黄铜镇纸；一道刚画下的蓝黑色铁胆墨直线还湿着，在煤油灯下反光。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_LEDGER` · 藏品登记簿

- 使用镜头（3）：S014、S050、S053
- **锁定描述 EN**：old accession ledger, dark green buckram #2F4A3E with a rubbed spine, ruled pages of dates and numbers only, always illegible.
- **锁定描述 ZH**：旧藏品登记簿，深绿布面硬壳 #2F4A3E、书脊磨白，横格页上只有日期与数字，永远不可读。

参考图提示词 EN
```text
Prop reference: an old museum accession ledger with a dark green buckram hardcover and rubbed spine, open to ruled pages of neat handwritten numbers and dates rendered soft and illegible, under a warm desk lamp. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：一本旧博物馆藏品登记簿，深绿布面硬壳、书脊磨白，翻开的横格账页上是整齐的手写编号与日期（柔焦不可读），在暖色台灯下。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_GLASSPANEL` · 彩窗残片

- 使用镜头（3）：S057、S061、S066
- **锁定描述 EN**：60x90 cm leaded stained-glass panel, NON-figurative layered petals in softened ruby, amber, cobalt, sea-green and pale rose; a 6x9 cm clear diamond quarry at lower left (registered at (0.70,0.45) in S057/S061); then: in the south-aisle window beside the mother's pew; museum (corridor P4): oxidised grey lead, two cracked pieces, very dim lightbox.
- **锁定描述 ZH**：60×90 cm 铅条彩窗残片，非具象层叠花瓣，柔化的绛红、琥珀、钴蓝、海青、浅玫；左下方一块 6×9 cm 透明菱形小玻璃（S057/S061 登记位置 (0.70,0.45)）；当年：嵌在母亲座位旁南侧廊下矮彩窗里；博物馆（长廊 P4）：铅条氧化发灰、两处裂纹、背后极暗灯箱。

参考图提示词 EN
```text
Prop reference: a 60x90 cm leaded stained-glass panel with an abstract non-figurative design of overlapping petal shapes in soft muted ruby, amber, cobalt blue, sea-green and pale rose, a few clear quarries including one small clear diamond pane at lower left; no human figures, no religious figures, no symbols; states: glowing in situ with low sunset light behind it, and as a museum object with oxidised grey lead and two cracked pieces on a dim lightbox. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：一块60×90厘米的铅条彩窗，非具象抽象图案，层层叠叠的花瓣形色块，柔和低饱和的绛红、琥珀、钴蓝、海青与浅玫，间有几块透明菱形小玻璃，其中左下角一块小小的透明菱形；没有人物、没有圣像、没有符号；状态：嵌在原处、背后是低角度夕阳而发光；以及作为博物馆藏品——铅条氧化发灰、两处玻璃开裂，放在昏暗的灯箱上。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

#### `PROP_FLASHLIGHT` · 手电筒

- 使用镜头（7）：S002、S028–S029、S050、S059、S062–S063
- **锁定描述 EN**：plain black aluminium flashlight, 3.5 cm head, narrow 4000K beam, no logo; on the guard's belt.
- **锁定描述 ZH**：黑色铝合金手电，3.5 cm 头部，4000K 窄光束，无标志；挂在夜班工作人员腰侧。

参考图提示词 EN
```text
Prop reference: a plain black anodised aluminium flashlight with a 3.5 cm head, no logo, shown off and on with a narrow neutral 4000K beam crossing a dark museum floor. photoreal prop reference sheet, the same object from several angles (top-down, three-quarter, side) plus a macro texture inset, on neutral dark-grey felt, soft raking light to reveal surface texture, accurate scale and proportions, true materials, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
道具参考：一支无标志的黑色阳极氧化铝手电筒，头部直径3.5厘米；展示关闭状态与打开状态——一束窄窄的中性4000K光束划过昏暗的博物馆地面。写实道具参考设定图：同一物件的多个角度（正俯视、四分之三、侧面）并附微距质感特写；中性深灰毛毡背景，柔和的低角度掠射光以显出表面质感；比例与尺寸准确，材质真实；电影感 35mm 胶片质感，细腻颗粒；无文字、无标注、无水印
```

### 5.3 场景 LOC_

#### `LOC_GALLERY` · 博物馆夜间展厅

- 场景键：`museum_gallery`；时代：现代
- 使用镜头（17）：S001–S004、S023–S030、S040–S041、S070–S071、S078
- **锁定描述 EN**：night gallery of the converted 1880s-90s customs house: slender dark grey-green cast-iron columns, waxed teak floor, red brick partly lime-washed; G1 frameless compass vitrine (95 cm dark plinth, 60x60x50 cm low-iron glass hood, 3000K pin spot, near-black navy velvet); G2 flat chart case 1.5 m east; north-wall G3a/G3b/G3c (navigation / ceramics with an EMPTY mount / migration: open case, shirt, comb, permit); moonlight in arched shafts through the five south doorways; opening camera MC_G1_OPEN (lens 1.18 m, square to G1's south face).
- **锁定描述 ZH**：旧海关关栈改建的夜间展厅：纤细的深灰绿铸铁柱、打蜡柚木地板、局部石灰抹面的红砖墙；G1 无框罗盘柜（95 cm 深色台座、60×60×50 cm 低铁玻璃罩、3000K 窄光、近黑深蓝绒布）；G2 海图平柜在其东 1.5 m；北墙 G3a／G3b／G3c（航海／家用瓷器＋空托架／迁徙：打开的藤箱、旧衫、木梳、通行纸）；月光经南侧五个门洞成拱形光柱斜入；开场机位 MC_G1_OPEN（镜头高 1.18 m，正对 G1 南面）。
- **光源**：vitrine LED 3000K (dimmed)；moonlight ~7000-8000K through south doorways (from the corridor arches)；floor guide lights 4000K very low；guard's flashlight 4000K (one sweep in INTRO)

参考图提示词 EN
```text
Location reference: a museum gallery at night inside a converted 19th-century harbour customs-house warehouse, rows of slender dark grey-green cast-iron columns, waxed teak floorboards, old red brick walls partly lime-washed, a single free-standing frameless glass vitrine on a dark plinth holding an aged brass compass lit by one small warm 3000K pin spot, a low flat chart case beside it, three tall dark wall vitrines along the back wall glowing faintly, cool silver moonlight falling in long arched shafts through doorways onto the floor, deep blue air, quiet and empty. 40mm lens, eye-level. photoreal cinematic location reference, anamorphic 2.39:1 widescreen, 35mm film look with fine organic grain and subtle halation around practical lights, motivated light only, deep shadows that keep detail (never crushed black), natural colour, no people unless stated, no text, no signage, no logos, no watermark
```
参考图提示词 ZH
```text
场景参考：由19世纪港口海关旧仓库改建的博物馆夜间展厅，成排纤细的深灰绿铸铁柱，打蜡柚木地板，局部石灰粉刷的旧红砖墙；一个深色台座上的无框玻璃独立展柜，内有一枚老黄铜罗盘，被一盏3000K小射灯照亮；旁边一只低矮的海图平柜；后墙三面高大的暗色立柜微微发亮；冷银色月光从拱形门洞斜射进来，在地板上落下长长的拱形光斑，空气是深蓝色，安静无人。40毫米镜头，平视。写实电影感场景参考，2.39:1 变形宽银幕，35mm 胶片质感，细腻有机的颗粒，实景光源周围有轻微光晕；只用有来源的光；暗部深而保留细节（不死黑）；自然色彩；除注明外无人物；无文字、无招牌、无标志、无水印
```

#### `LOC_LAB` · 文物修复室

- 场景键：`restoration_lab`；时代：现代
- 使用镜头（12）：S012–S015、S017–S018、S049–S054
- **锁定描述 EN**：ground-floor south-east conservation studio (= the 1890s map office): a round-arched six-over-six sash window with fanlight to the harbour at screen-right, oak bench along it, articulated 3500K lamp at upper left, shards on grey foam, white-sand tray, fine tools, ledger shelf with a 2700K lamp, lime-white walls, terrazzo floor.
- **锁定描述 ZH**：一层东南角修复室（即 1890 年代地图办公室）：画右是通向港口的六格对六格圆拱木窗（带半圆扇形亮子），沿窗橡木工作台，左上方 3500K 可调臂台灯，灰色海绵垫上的残片、白沙修复沙盘、精细工具，书架一盏 2700K 小灯，石灰白墙、水磨石地。
- **光源**：articulated bench lamp 3500K CRI>=97 (from upper screen-left, 45 deg)；harbour night lights and moonlight through the arched window；shelf lamp 2700K (distant warm point)

参考图提示词 EN
```text
Location reference: a museum ceramics conservation studio at night in an old harbour building, a large round-arched white-painted timber sash window with a semicircular fanlight looking out over a dark harbour with scattered ship lights, an oak workbench beneath it with an articulated lamp casting a warm pool of light on blue-and-white porcelain shards on grey foam and a tray of fine white sand, fine tools, soft brushes, Japanese tissue, steel archive cabinets in shadow, lime-white walls, terrazzo floor. 40mm lens. photoreal cinematic location reference, anamorphic 2.39:1 widescreen, 35mm film look with fine organic grain and subtle halation around practical lights, motivated light only, deep shadows that keep detail (never crushed black), natural colour, no people unless stated, no text, no signage, no logos, no watermark
```
参考图提示词 ZH
```text
场景参考：老港口建筑中的博物馆陶瓷修复室，夜晚；一扇带半圆扇形亮子的漆白圆拱木竖拉窗，窗外是黑暗的港湾与零星船灯；窗下橡木工作台，可调臂台灯在灰色海绵垫上的青花残片与一盘细白沙上投下一圈暖光，精细工具、软毛刷、日本和纸，阴影里的钢制档案柜，石灰白墙，水磨石地面。40毫米镜头。写实电影感场景参考，2.39:1 变形宽银幕，35mm 胶片质感，细腻有机的颗粒，实景光源周围有轻微光晕；只用有来源的光；暗部深而保留细节（不死黑）；自然色彩；除注明外无人物；无文字、无招牌、无标志、无水印
```

#### `LOC_CABIN` · 航海人船舱（针房）

- 场景键：`ship_cabin`；时代：航海人
- 使用镜头（7）：S005–S007、S009–S011、S024
- **锁定描述 EN**：compass-keeper's stern cabin of an early-17th-century junk: 2.4x2.0 m, 1.65 m headroom, smoke-blackened planks and low beams, a 70x70 cm overhead hatch, a barred stern window letting in dusk blue, fold-down chart table with the compass box at its left, a swinging 25 cm horn cabin lantern (1950K).
- **锁定描述 ZH**：17 世纪上半叶远洋帆船艉部火长针房：2.4×2.0 m、净高 1.65 m，烟熏发黑的板壁与低横梁，头顶 70×70 cm 方形舱口，艉墙直棂小窗透进暮蓝，可翻折海图桌左侧嵌罗盘匣，横梁上一盏摆动的 25 cm 角片舱灯（1950K）。
- **光源**：horn-panel cabin lantern with candle 1950K, swinging；dusk blue (P03) through the barred stern window；sky through the overhead hatch

参考图提示词 EN
```text
Location reference: the cramped compass cabin at the stern of a 17th-century Chinese ocean-going junk, low smoke-blackened wooden beams and plank walls, a small barred stern window letting in deep blue dusk light, a fold-down chart table with a paper sea-chart scroll held by brass weights and a brass compass set in a wooden box, a small horn-paned lantern hanging from the beam casting warm swinging candlelight, an open square hatch overhead showing the edge of a huge battened sail against the sky. 32mm lens. photoreal cinematic location reference, anamorphic 2.39:1 widescreen, 35mm film look with fine organic grain and subtle halation around practical lights, motivated light only, deep shadows that keep detail (never crushed black), natural colour, no people unless stated, no text, no signage, no logos, no watermark
```
参考图提示词 ZH
```text
场景参考：17世纪中国远洋帆船船尾狭小的针房，低矮被烟熏黑的木梁与板壁，一扇带直棂的小艉窗透入深蓝暮色；一张翻折海图桌，上面是被铜镇纸压住的纸本海图长卷与嵌在木匣里的黄铜罗盘；横梁上挂着一盏角片小灯，摇曳的暖色烛光；头顶一个打开的方形舱口，露出巨大竹篾硬帆的一角与天空。32毫米镜头。写实电影感场景参考，2.39:1 变形宽银幕，35mm 胶片质感，细腻有机的颗粒，实景光源周围有轻微光晕；只用有来源的光；暗部深而保留细节（不死黑）；自然色彩；除注明外无人物；无文字、无招牌、无标志、无水印
```

#### `LOC_DECK` · 甲板与大海

- 场景键：`sea_deck`；时代：航海人
- 使用镜头（10）：S001–S003、S007–S008、S022、S045、S066–S067、S075
- **锁定描述 EN**：three-masted junk on a heavy deep-blue swell: rust-ochre battened sails, painted bow eyes, high stern castle with the stern lantern; dusk (V1) or moonlight from upper right; a low black shore with one warm 1900K light ALWAYS screen-left; figures <=2% of frame in extreme wides.
- **锁定描述 ZH**：沉重深蓝涌浪上的三桅帆船：锈赭色竹篾硬帆、船首船眼、高艉楼与艉灯；暮色（V1）或来自画右上方的月光；远处低矮黑色海岸与一点 1900K 暖灯永远在画左；极远景人物不超过画面 2%。
- **光源**：dusk sky (V1) / moonlight from upper screen-right (night)；stern lantern 1950K；distant shore lights 1900K (screen-left)

参考图提示词 EN
```text
Location reference: extreme wide shot of a 17th-century three-masted Chinese ocean-going junk on a vast deep-blue South China Sea at dusk, huge rust-ochre battened sails, painted eyes on the bow, a high stern castle with a single warm lantern, a long heavy swell with silver crests and spray, towering cumulus clouds catching the last light, a faint warm line on the horizon, a low dark coastline on the far left with one tiny warm light; a single tiny human figure on the stern. 28mm lens, slow and majestic scale. photoreal cinematic location reference, anamorphic 2.39:1 widescreen, 35mm film look with fine organic grain and subtle halation around practical lights, motivated light only, deep shadows that keep detail (never crushed black), natural colour, no people unless stated, no text, no signage, no logos, no watermark
```
参考图提示词 ZH
```text
场景参考：极远景，暮色中辽阔深蓝的南海上一艘17世纪中国三桅远洋帆船，巨大的锈赭色竹篾硬帆，船首画着船眼，高高的艉楼上一盏温暖的灯；长而沉重的涌浪，浪尖银色、溅起盐雾；高耸的积云顶部还留着最后的余晖，地平线一线极淡的暖色；画面最左远处一道低矮的黑色海岸线，上面一点微小的暖灯；艉楼上一个极小的人影。28毫米镜头，缓慢而宏大的尺度。写实电影感场景参考，2.39:1 变形宽银幕，35mm 胶片质感，细腻有机的颗粒，实景光源周围有轻微光晕；只用有来源的光；暗部深而保留细节（不死黑）；自然色彩；除注明外无人物；无文字、无招牌、无标志、无水印
```

#### `LOC_HOME` · 旧日家中（海边石屋）

- 场景键：`old_home`；时代：旧日家中
- 使用镜头（10）：S016–S017、S019、S024–S026、S035、S041–S042、S066
- **锁定描述 EN**：coastal granite house of the navigator's era: dark camphor table, the wife on the screen-left bench, the screen-right bench always empty, cracked-ice lattice window in the screen-right wall; door in the screen-left wall onto one granite step, oil-lamp niche left of the door ((0.04,0.46) in the eaves frame), eaves 1 m with no gutter - the bowl sits at the step's outer edge under the drip line; weather PRE1 clear/humid -> CH1 clouds gather -> CH2 heavier, damp -> CH3 rain.
- **锁定描述 ZH**：航海人时代的海边花岗岩石屋：深色樟木方桌，她坐画左长凳，画右长凳永远空着，画右墙冰裂纹木窗格；画左墙的门外一级花岗岩石阶，门左壁龛放小油灯（屋檐机位中位于 (0.04,0.46)），屋檐出挑 1 m、无檐沟——碗放在石阶外沿的滴水线下；天气 PRE1 晴闷 → CH1 云聚 → CH2 更厚更潮 → CH3 落雨。
- **光源**：table candle 1850K (low, from below)；moonlight through the cracked-ice lattice (screen-right)；door-niche oil lamp 1900K (exterior)；rain visible only against lamp / moon backlight (CH3)

参考图提示词 EN
```text
Location reference: interior of a 17th-century coastal Chinese granite stone house at night, rough granite block walls, exposed roof purlins, square clay-tile floor, a dark wooden square table with two long benches, one bench empty, a single candle in a brass candlestick and a blue-and-white bowl of cold rice with chopsticks on the table, a dark wooden cracked-ice lattice window on the right wall casting fractured moonlight shadows across the table and wall, a doorway on the left with a small oil lamp in a stone wall niche. Second view: exterior under the eaves at night, a blue-and-white bowl on a granite step, a small lamp glowing in the niche, the dark sea beyond a low wall. 32mm lens. photoreal cinematic location reference, anamorphic 2.39:1 widescreen, 35mm film look with fine organic grain and subtle halation around practical lights, motivated light only, deep shadows that keep detail (never crushed black), natural colour, no people unless stated, no text, no signage, no logos, no watermark
```
参考图提示词 ZH
```text
场景参考：17世纪中国海边花岗岩石屋内景，夜晚；粗凿条石墙、露明檩条、方砖地；一张深色木方桌配两条长凳，其中一条空着；桌上一支插在铜烛台上的蜡烛与一碗凉饭、一双筷子，碗为青花；右墙一扇深色冰裂纹木窗格，把碎裂的月光影投在桌面与墙上；左侧门洞旁石墙壁龛里一盏小油灯。第二视图：夜晚屋檐下的外景，花岗岩石阶上放着一只青花碗，壁龛里小灯发光，矮墙外是黑色的海。32毫米镜头。写实电影感场景参考，2.39:1 变形宽银幕，35mm 胶片质感，细腻有机的颗粒，实景光源周围有轻微光晕；只用有来源的光；暗部深而保留细节（不死黑）；自然色彩；除注明外无人物；无文字、无招牌、无标志、无水印
```

#### `LOC_PIER` · 候船处（码头与候船棚）

- 场景键：`pier_waiting`；时代：迁徙
- 使用镜头（14）：S020、S024、S031–S034、S036–S039、S043、S066、S068、S076
- **锁定描述 EN**：1920s-30s timber-and-steel steamer waiting shed at blue hour after rain: corrugated roof on cast-iron columns, enamel-shaded 2400K bulbs every 5 m, wet planks mirroring them; stamp counter with brass rail and glass partitions; a waist-high railing at screen-left separates those seeing travellers off; the steamer ALWAYS screen-right (black hull, white superstructure, invented ochre funnel with a slate band); the crowd flows left to right.
- **锁定描述 ZH**：1920–30 年代雨后蓝调时刻的木钢结构候船棚：铸铁柱撑起波纹铁皮屋顶，每 5 m 一盏搪瓷灯罩 2400K 白炽灯，湿木板映着灯光；黄铜扶手、玻璃隔窗的盖章柜台；画左一道齐腰木栏杆隔开送行者；轮船永远在画右（黑船壳、白上层建筑、虚构赭黄烟囱加石板灰带）；人群从左流向右。
- **光源**：enamel-shaded incandescent bulbs 2400K；blue-hour / night sky over the sea；steamer portholes (warm points)；bulb reflections in wet planks

参考图提示词 EN
```text
Location reference: a 1920s-30s Southeast-Asian-bound passenger pier at blue hour after rain, a long timber-and-steel waiting shed with a corrugated-iron roof on cast-iron columns, a row of enamel-shaded incandescent bulbs making warm pools of light over wet reflecting planks, a high wooden stamp counter with brass rail and glass partitions, a black-hulled steamer with white superstructure and an ochre funnel with a grey band moored on the right with glowing portholes, rattan suitcases and bundles; a crowd of travellers and families in period clothes. 40mm lens. photoreal cinematic location reference, anamorphic 2.39:1 widescreen, 35mm film look with fine organic grain and subtle halation around practical lights, motivated light only, deep shadows that keep detail (never crushed black), natural colour, no text, no signage, no logos, no watermark
```
参考图提示词 ZH
```text
场景参考：雨后蓝调时刻的1920–30年代下南洋客运码头，一座长长的木钢结构候船棚，铸铁柱托着波纹铁皮屋顶，一排搪瓷灯罩白炽灯在湿漉漉反光的木板上投下暖色光池；高木柜台配黄铜扶手与玻璃隔窗；右侧停泊着一艘黑色船壳、白色上层建筑、赭黄烟囱带一道灰带的轮船，舷窗亮着；藤箱与布包袱，穿着时代服装的旅客与送行家人。40毫米镜头。写实电影感场景参考，2.39:1 变形宽银幕，35mm 胶片质感，细腻有机的颗粒，实景光源周围有轻微光晕；只用有来源的光；暗部深而保留细节（不死黑）；自然色彩；无文字、无招牌、无标志、无水印
```

#### `LOC_HARBOR` · 港口时代更替（固定机位）

- 场景键：`harbor_eras`；时代：多时代
- 使用镜头（4）：S018、S046、S048、S080
- **锁定描述 EN**：LOCKED quay-road frame looking east (40 mm, lens 1.6 m, identical MC/tripod data for every era; reused S046/S080): customs-house facade frame-left, gate and granite threshold with iron edge strip at x 0.38 (edge at y 0.66), waiting spot (0.38,0.70), water and ships frame-right, flagpole on the corner roof; one dusk light in every era; invented flags only (F-B/F-C/F-D), E5 none.
- **锁定描述 ZH**：锁定的码头路机位向东（40 mm、镜头高 1.6 m，各时代同一运动控制/三脚架数据；S046/S080 复用）：画左关栈立面，x 0.38 处关口大门与外缘包铁条的花岗岩门槛（边线 y 0.66），等待位置 (0.38,0.70)，画右水面与船，转角屋顶旗杆；所有时代同一暮色光；只用虚构旗帜（F-B/F-C/F-D），E5 无旗。
- **光源**：unified dusk sky light from behind camera (west)；E1 torches/lanterns；E2 kerosene street lamps；E3 incandescent street lamps；E4 sodium lamps (desaturated)；E5 LED 4000K

参考图提示词 EN
```text
Location reference series, identical locked camera for all images: dusk on a fictional South China Sea harbour quay looking east along the waterfront, a colonial-era customs-house facade with arcaded verandah on the left, a gate with a granite threshold at left-centre where one person waits, harbour water and ships on the right, a flagpole on the building's corner; the last warm-pink light on the facade from behind camera and a deep blue eastern sky; render five eras with the same composition and light: c.1630s timber godown and junks; c.1890s new customs house with kerosene lamps; c.1930s steamer and incandescent lamps; c.1950s freighters and sodium lamps; present-day museum with distant container cranes. All flags invented and abstract, no real flags, no insignia, no text. 40mm lens. photoreal cinematic location reference, anamorphic 2.39:1 widescreen, 35mm film look with fine organic grain and subtle halation around practical lights, motivated light only, deep shadows that keep detail (never crushed black), natural colour, no text, no signage, no logos, no watermark
```
参考图提示词 ZH
```text
场景参考组图，所有图像机位完全相同：黄昏，虚构南海港口的码头，沿水岸向东看；画左是带拱廊外廊的殖民时期海关立面，画面中偏左是带花岗岩门槛的关口大门，门槛前站着一个等待的人；画右是港湾水面与船只，建筑转角屋顶上一根旗杆；最后的暖粉色光从摄影机身后照在立面上，东边天空深蓝；以同一构图与光线渲染五个时代：约1630年代木构货栈与帆船；约1890年代新建海关与煤油路灯；约1930年代轮船与白炽路灯；约1950年代货轮与钠灯；当下的博物馆与远处的集装箱起重机。所有旗帜为虚构抽象图案，无真实旗帜、无徽章、无文字。40毫米镜头。写实电影感场景参考，2.39:1 变形宽银幕，35mm 胶片质感，细腻有机的颗粒，实景光源周围有轻微光晕；只用有来源的光；暗部深而保留细节（不死黑）；自然色彩；无文字、无招牌、无标志、无水印
```

#### `LOC_MAPOFFICE` · 地图办公室与关口门槛

- 场景键：`map_office`；时代：地图之手
- 使用镜头（4）：S021、S044、S047–S048
- **锁定描述 EN**：the same south-east ground-floor room c.1890s: the same arched window fitted with half-closed louvred shutters striping cold moonlight across a teak drafting table and linen-backed map, brass kerosene lamp (2200K) at screen-right, lime-white walls with a dark green dado; only hands, cuffs, ruler, pen, map and stripes are framed; sub-set: a granite threshold with an iron edge strip.
- **锁定描述 ZH**：同一个一层东南角房间，约 1890 年代：同一扇拱窗内装半闭木百叶，把冷月光切成条纹落在柚木制图桌与裱布地图上，桌面画右黄铜底座煤油灯（2200K），石灰白墙配深绿墙裙；画面只出现手、袖口、直尺、笔、地图与条纹光；附属场景：外缘包铁条的花岗岩门槛。
- **光源**：kerosene lamp 2200K (screen-right on the desk)；moonlight striped by half-closed louvres；doorway dusk/night light at the threshold

参考图提示词 EN
```text
Location reference: an 1890s colonial harbour-office map room at night, a large teak drafting table with a linen-backed hand-drawn coastal map held by brass weights, an ebony ruler and a ruling pen, a brass kerosene lamp with glass chimney giving warm hard light, tall timber louvred shutters inside a round-arched window cutting cold moonlight into parallel stripes across the map, lime-white walls with a dark green dado, map drawers, a still cloth punkah fan, moths at the lamp; austere, controlled, high contrast. Second view: a granite doorway threshold with an iron edge strip, waiting people blurred beyond. 40mm lens. photoreal cinematic location reference, anamorphic 2.39:1 widescreen, 35mm film look with fine organic grain and subtle halation around practical lights, motivated light only, deep shadows that keep detail (never crushed black), natural colour, no people unless stated, no text, no signage, no logos, no watermark
```
参考图提示词 ZH
```text
场景参考：1890年代殖民港务机构的地图室，夜晚；一张大柚木制图桌，铺着被黄铜镇纸压住的裱布手绘沿海地图、乌木直尺与直线笔；黄铜底座玻璃灯罩的煤油灯发出温暖的硬光；圆拱窗内的通高木百叶板把冷月光切成平行条纹落在地图上；石灰白墙配深绿墙裙，地图抽屉柜，静止的布质手拉风扇，飞蛾绕灯；冷峻、秩序、反差强烈。第二视图：外缘包铁条的花岗岩门槛，门外排队等候的人群虚化。40毫米镜头。写实电影感场景参考，2.39:1 变形宽银幕，35mm 胶片质感，细腻有机的颗粒，实景光源周围有轻微光晕；只用有来源的光；暗部深而保留细节（不死黑）；自然色彩；除注明外无人物；无文字、无招牌、无标志、无水印
```

#### `LOC_CHAPEL` · 异国礼拜堂

- 场景键：`chapel`；时代：礼拜堂
- 使用镜头（6）：S055–S058、S066、S069
- **锁定描述 EN**：large quiet 1950s chapel in a fictional tropical port: lime-white walls, pale grey timber vault, teak pews, terracotta floor, still fans; NON-figurative stained glass only (no figures or icons); sunset through the west lancets lays 'ten thousand petals' on floor, pews and her shoulders, then blue hour with side-table candles; the mother at the screen-left end of the 7th south pew facing east, LONELY at the screen-right end.
- **锁定描述 ZH**：虚构热带港口城市一座宏大而安静的 1950 年代礼拜堂：石灰白墙、浅灰木构拱顶、柚木长椅、赤陶地砖、静止吊扇；彩窗全部非具象（无人物、无圣像）；日落时西窗把“千万瓣”柔彩洒在地面、长椅与她的肩上，随后进入蓝调时刻、侧桌几支蜡烛；母亲坐南侧第七排画左端、面向东，孤单老人在画右端。
- **光源**：low sunset sun ~3200K through west stained-glass lancets；glow of south-aisle stained glass；blue-hour skylight；a few side-table candles 1850K

参考图提示词 EN
```text
Location reference: the nave of a large quiet 1950s chapel in a tropical port, lime-white walls, a pale grey timber vault 15 m high, rows of teak pews, a warm terracotta tile floor, still ceiling fans, low sunset light streaming through tall lancet windows of abstract non-figurative stained glass (layered petals in soft muted ruby, amber, cobalt, sea-green and pale rose) and scattering countless soft coloured petals of light across the floor and pews; faint dust visible only in the light paths; altar end deep in soft shadow, no religious figures in focus. Seen from a high choir loft. 32mm lens. photoreal cinematic location reference, anamorphic 2.39:1 widescreen, 35mm film look with fine organic grain and subtle halation around practical lights, motivated light only, deep shadows that keep detail (never crushed black), natural colour, no people unless stated, no text, no signage, no logos, no watermark
```
参考图提示词 ZH
```text
场景参考：热带港口一座宏大而安静的1950年代礼拜堂中殿，石灰白墙，15米高的浅灰木构拱顶，成排柚木长椅，温暖的赤陶方砖地，静止的吊扇；低角度的夕阳穿过高高的尖拱彩窗（非具象抽象图案：柔和低饱和的绛红、琥珀、钴蓝、海青与浅玫花瓣色块），在地面与长椅上洒下无数柔和的彩色光瓣；尘埃只在光路里隐约可见；祭台一端沉在柔和的阴影中，没有清晰的宗教形象。从高处唱诗廊俯视。32毫米镜头。写实电影感场景参考，2.39:1 变形宽银幕，35mm 胶片质感，细腻有机的颗粒，实景光源周围有轻微光晕；只用有来源的光；暗部深而保留细节（不死黑）；自然色彩；除注明外无人物；无文字、无招牌、无标志、无水印
```

#### `LOC_WINDOW` · 窗边（东端窗湾）

- 场景键：`night_window`；时代：现代
- 使用镜头（15）：S027、S059–S066、S072–S074、S077、S079、S081
- **锁定描述 EN**：three-sided east bay window at the end of the upper corridor (E/SE/NE): old-white frames, slightly wavy old glass above, clear below, teak window bench with a thin grey cushion, 24 cm sill for the cups, a 2700K reading lamp in the NE corner; harbour mouth outside; the guard sits screen-right nearer the SE pane, the restorer on his screen-left ~40 cm away; dawn arrives screen-right; standard set-up BAY_3Q from the SW corner (S062-S065, S072-S074, S077).
- **锁定描述 ZH**：二层长廊东端的三面窗湾（东、东南、东北）：旧白漆窗框，上部微波纹老玻璃、下部清玻璃，柚木窗凳铺薄灰坐垫，24 cm 深窗台放茶杯，东北角一盏 2700K 阅读灯；窗外港口出海口；他坐画右靠东南窗、她在他画左约 40 cm；黎明从画右来；标准机位 BAY_3Q 在西南角（S062–S065、S072–S074、S077）。
- **光源**：phone screen 6500K (GUARD's lower face)；corner reading lamp 2700K；harbour lights through the bay；dawn skylight 7000K -> 4300K (OUTRO/TAIL)

参考图提示词 EN
```text
Location reference: a three-sided bay window at the end of an old harbour building's upper gallery, white-painted timber frames with slightly wavy antique glass in the upper panes, a built-in teak window bench with a thin grey cushion, a deep sill, a small warm reading lamp in the corner, the harbour mouth outside at deep blue night with scattered ship lights and distant cranes; second view the same window at first dawn, soft peach light on the horizon, a few lamps still lit on the sea, two porcelain teacups steaming on the sill. 50mm lens. photoreal cinematic location reference, anamorphic 2.39:1 widescreen, 35mm film look with fine organic grain and subtle halation around practical lights, motivated light only, deep shadows that keep detail (never crushed black), natural colour, no people unless stated, no text, no signage, no logos, no watermark
```
参考图提示词 ZH
```text
场景参考：老港口建筑二层长廊尽头的三面窗湾，漆白木窗框，上部窗格是略带波纹的老玻璃，嵌入式柚木窗凳铺着薄灰坐垫，深窗台，角落一盏小小的暖色阅读灯；窗外是深蓝夜色中的港口出海口，零星船灯与远处起重机；第二视图：同一扇窗的黎明初光，地平线柔和的桃色，海面上还有几盏未熄的灯，两只瓷茶杯在窗台上冒着热气。50毫米镜头。写实电影感场景参考，2.39:1 变形宽银幕，35mm 胶片质感，细腻有机的颗粒，实景光源周围有轻微光晕；只用有来源的光；暗部深而保留细节（不死黑）；自然色彩；除注明外无人物；无文字、无招牌、无标志、无水印
```

#### `LOC_CORRIDOR` · 月光长廊（全片标志性画面）

- 场景键：`corridor`；时代：多时代
- 使用镜头（4）：S027、S057、S061、S066
- **锁定描述 EN**：44 m glazed upper south verandah (x = -44 ... 0, east screen at x = 0): eleven arched windows on the right (south) laying silver moon pools every 4 m, rendered brick wall left, waxed teak boards; five 'windows of eras': P1 x-10 L (ship lamp), P2 x-8 R (home + rain), P3 x-6 L (waiting hall), P4 x-4 R (stained-glass panel / mother), E x0 the real present seen through clear glass; ~14 small wall vitrines of permanently unresolved warm glows; hero move 40 mm, lens 1.45 m, motion control MC_CORRIDOR (S027 / S066).
- **锁定描述 ZH**：44 m 长的二层南侧封闭外廊（x = −44…0，东端隔断在 x = 0）：右侧（南）11 个拱窗每 4 m 在地板上投下一个银色月光斑，左侧抹灰砖墙，打蜡柚木长条地板；五面“时代之窗”：P1 x−10 左（船灯）、P2 x−8 右（家与雨）、P3 x−6 左（候船处）、P4 x−4 右（彩窗残片/母亲）、E x0 透过清玻璃所见的真实当下；约 14 个小壁柜里只有永不对焦的暖色光斑；主运动 40 mm、镜头高 1.45 m、运动控制 MC_CORRIDOR（S027／S066）。
- **光源**：moonlight through 11 south arches (behind-right of the camera), silver pools every 4 m；each pane keeps its own era light (ship lamp / candle / bulbs / stained glass / reading lamp)；minor panes: unresolved warm glows；corridor base light 4000K very low

参考图提示词 EN
```text
Location reference: a long moonlit museum corridor - the glazed upper verandah of a 19th-century harbour customs house - 44 m long, 5.4 m wide, a timber coffered ceiling, long waxed teak floorboards, a row of tall arched windows on the right letting silver moonlight fall in arch-shaped pools on the floor every four metres, rendered brick wall on the left; tall frameless glass vitrines stand alternately left and right, angled toward the viewer, dark inside, and in each glass a different era's night appears in its own deep space: a swinging ship lamp over a deep blue sea, a candle-lit old home with a lattice shadow and rain outside, a crowd under warm bulbs in a 1920s waiting hall, a woman's shoulders under fading stained-glass colour; small wall vitrines hold soft unfocused warm glows; at the far end a glazed timber screen through which two people sit with their backs to us at a window with steaming teacups. Camera on the centre line at 1.45 m, 40mm anamorphic, symmetrical depth. photoreal cinematic location reference, anamorphic 2.39:1 widescreen, 35mm film look with fine organic grain and subtle halation around practical lights, motivated light only, deep shadows that keep detail (never crushed black), natural colour, no text, no signage, no logos, no watermark
```
参考图提示词 ZH
```text
场景参考：一条月光下的博物馆长廊——19世纪港口海关的二层封闭外廊——长44米、宽5.4米，木格天花，打蜡的柚木长条地板；右侧一排高大的拱窗，冷银月光每隔四米在地板上落下一个拱形光斑；左侧是抹灰砖墙；高大的无框玻璃展柜左右交替排列、微微转向观者，柜内是暗的，每一面玻璃里都在自己的深远空间中映出另一个时代的夜晚：深蓝海面上摇晃的船灯、窗格影与门外雨声中的烛光旧屋、1920年代候船厅暖灯下的人群、彩窗余光里一个女人的双肩；墙上的小展柜只有柔焦的暖色光斑；长廊尽头一道木框玻璃隔断，透过它能看到两个人背对我们坐在窗边，茶杯冒着热气。摄影机在中轴线上，高1.45米，40毫米变形镜头，对称纵深。写实电影感场景参考，2.39:1 变形宽银幕，35mm 胶片质感，细腻有机的颗粒，实景光源周围有轻微光晕；只用有来源的光；暗部深而保留细节（不死黑）；自然色彩；无文字、无招牌、无标志、无水印
```

### 5.4 补充参考 XREF_（圣经 v1.0 未登记，建议下一版补登）

#### `XREF_ELDER_HAND` · 用于 S032-S039 (bible §5.5a)

- 在 post 中点名的镜头：S032、S034、S036、S038–S039

参考图提示词 EN
```text
Supplementary reference (not registered in bible v1.0; bible §5.5a): the hands of the older woman seeing the migrant off, 1920s-30s - thick knuckles, soft loose skin on the backs, short clean nails, a dark-blue cotton sleeve cuff #2E3A52, no rings. Views: the back of her RIGHT hand raised palm-forward with four fingers gently curled and the thumb at left (the hand that stays, S039/S040 register (0.36,0.56)); clasping a young woman's left hand; pressing an oil-paper packet into her palms. photoreal reference sheet, neutral mid-grey seamless backdrop, soft even 5600K light, true skin texture, cinematic 35mm film look, fine grain, no text, no labels, no watermark
```
参考图提示词 ZH
```text
补充参考（圣经 v1.0 未登记；圣经 §5.5a）：1920–30 年代送行的年长女性的手——指节粗、手背皮肤松软、指甲短而干净、深蓝布袖口 #2E3A52、不戴戒指。视图：右手手背朝镜头、掌心向前、四指微弯、拇指在左地悬停（那只留在原位的手，S039/S040 登记 (0.36,0.56)）；握着一只年轻女子的左手；把油纸包塞进她的掌心。写实参考设定图，中性中灰无缝背景，柔和均匀的 5600K 光，真实皮肤质感，电影感 35mm 胶片质感，细腻颗粒，无文字、无标注、无水印
```

#### `XREF_CLERK_HAND` · 用于 S037 (bible §6.12)

- 在 post 中点名的镜头：S037

参考图提示词 EN
```text
Supplementary reference: a 1920s-30s pier stamp clerk's hand and forearm in an invented khaki-grey uniform cuff without any insignia, buttons plain, holding a brass-faced stamp with a turned dark rosewood handle; behind a glass counter partition. photoreal reference sheet, neutral mid-grey backdrop, soft even 5600K light, 35mm film look, no text, no insignia, no watermark
```
参考图提示词 ZH
```text
补充参考：1920–30 年代码头盖章办事员的手与小臂，虚构的卡其灰制服袖口、无任何徽记、素面纽扣，手持黄铜印面、紫檀色木柄的印章；在柜台玻璃隔窗后。写实参考设定图，中性中灰背景，柔和均匀 5600K 光，35mm 胶片质感，无文字、无徽记、无水印
```

#### `XREF_CHILD_FEET` · 用于 S042 (bible §5.4, §10-8)

- 在 post 中点名的镜头：S042

参考图提示词 EN
```text
Supplementary reference: the bare feet and ankles only of an East Asian child of about four, on a damp granite doorstep at night in a 17th-century coastal house; toes curling on cool stone; nothing above the ankles ever shown. Prefer a practical shoot (short session, guardian present, warm set). photoreal reference, 35mm film look, no text
```
参考图提示词 ZH
```text
补充参考：约四岁东亚孩子的一双光脚与脚踝，夜里 17 世纪海边石屋潮湿的花岗岩门阶上，脚趾蜷在凉石上；脚踝以上永不入画。优先实拍（短时段、监护人在场、温暖场地）。写实参考，35mm 胶片质感，无文字
```

#### `XREF_THERMOS` · 用于 S059, S062, S077

- 在 post 中点名的镜头：S059、S062、S077

参考图提示词 EN
```text
Supplementary prop reference: the night attendant's old vacuum flask, about 25 cm, dull unpolished stainless steel, slightly dented, a scuffed navy cup-lid, no logo or text; views standing on a teak window bench, cup-lid unscrewed, pouring pale jasmine tea. photoreal prop reference sheet, neutral dark-grey felt, soft raking light, 35mm film look, no text, no labels, no watermark
```
参考图提示词 ZH
```text
补充道具参考：夜班工作人员的旧保温壶，约 25 厘米，哑光不锈钢、略有磕瘪，磨旧的藏青色壶盖杯，无任何标志或文字；视图：立在柚木窗凳上、拧开壶盖、倒出淡金色茉莉花茶。写实道具参考设定图，中性深灰毛毡背景，柔和掠射光，35mm 胶片质感，无文字、无标注、无水印
```

#### `XREF_STEAMER_DECK` · 用于 S076

- 在 post 中点名的镜头：S076

参考图提示词 EN
```text
Supplementary location reference: the rail of a 1920s-30s black-hulled passenger steamer at first light - white-painted steel rail and stanchions, white superstructure, black hull below, sea haze, a faint new coastline on the horizon at screen-right, the invented ochre funnel with a slate band only if seen; no ship name, no text. photoreal cinematic location reference, anamorphic 2.39:1, 35mm film look, no text, no logos, no watermark
```
参考图提示词 ZH
```text
补充场景参考：1920–30 年代一艘黑色船壳客轮的船舷栏杆，清晨第一道光——白漆钢栏杆与立柱、白色上层建筑、下方黑色船壳、海上薄雾、画右海平线上一道淡淡的新海岸；只在必要时露出虚构的赭黄烟囱加石板灰带；无船名、无文字。写实电影场景参考，2.39:1 变形宽银幕，35mm 胶片质感，无文字、无标志、无水印
```

## 6. 逐镜提示词 S001–S081

每镜：负面提示词＝§3 全局负面＋本镜 negative；参考图按 refs 附上；风格块见 §2。

### 前奏 INTRO

#### S001 · 00:00:00 – 00:13:06 · 13.250 s（f0–f318）

| 项目 | 内容 |
|---|---|
| 歌词 | —（无演唱） |
| 段落 / 简报章节 / 时代 / 场景 | INTRO 前奏 / 一 / 多时代 / `museum_gallery` |
| 景别 / 焦段 / 速度 | ECU / 100 mm / 24 |
| 入点转场 | 淡入 12 帧 — 由黑场淡入；前三秒内手已在画面中擦拭 |
| 同步点 | 1.23 s 第一声乐器起音：指尖触到玻璃；3.0 s 擦开的清洁带里闪过几粒盐晶；4.5 s 清洁带完整，指尖放慢、停住；6.6 s 人声铺底进入：焦点开始穿过玻璃；11.0 s 航海人的左手掌心朝向玻璃，停在她的手前约一指 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_NAVIGATOR` `PROP_COMPASS` `PROP_GLOVES` `PROP_COAT` `LOC_GALLERY` `LOC_DECK` |
| 调色 | 多时代/过渡（见提示词） |
| 生成时长 | 13.25 s |

**文生视频提示词 T2V · EN**
```text
Extreme close-up, 100mm macro, lens 1.18 m high, axis square to the south face of a frameless museum vitrine at night; motion-control push-in of only 2% over 13 s, never stopping; 24 fps. Fade up from black over 0.5 s. At 1.2 s the slim gloved right hand of RESTORER, a ~28-year-old East Asian woman conservator (thin warm-white cotton glove, ribbed wrist, faint grey-brown brass smudge on index fingertip and thumb, edge of her charcoal wool coat cuff), enters from frame right, fingertips on the dusty glass, wiping a slow arc leftward; at 3 s a few sea-salt crystals glint beyond the cleared band; at 4.5 s her fingertips stop. At 6.6 s focus drifts through the glass into its dark mirror depth: the LEFT hand of NAVIGATOR, a ~35-year-old 17th-century seaman (large, thick-knuckled, rope-callused, cracked fingertips, white salt crystals between the fingers, faded indigo cuff), rises out of deep navy, palm toward the glass, and stops one finger-width from her hand at 11 s, not touching. He exists only inside the glass. Light: one narrow 3000K pin spot inside the vitrine; near-black navy behind; the soft glint of an aged brass compass far below. Modern night grade (neutral-cool, deep-blue shadows never cyan); the hand in the glass keeps the navigator-era warm-cool split; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
极近特写，100mm 微距，镜头高 1.18 米，光轴垂直于夜间博物馆无框展柜的南侧玻璃面；运动控制 13 秒内只推进约 2%，匀速不停；24 fps。0.5 秒内由黑场淡入。1.2 秒，修复师（约 28 岁东亚女性文物修复师）纤细的右手入画——戴略暖白的薄棉修复手套、罗纹腕口，食指与拇指指尖一点浅灰褐的黄铜污迹，画右边缘露出深灰羊毛呢外套的袖口——指尖贴着蒙尘的玻璃，从画右向画左缓缓擦出一道弧线；3 秒，擦净的清洁带另一侧闪过几粒海盐结晶；4.5 秒，指尖停住。6.6 秒，焦点缓缓穿过玻璃，进入它幽暗的镜像深处：航海人（约 35 岁，17 世纪远洋帆船上的火长）的左手从深蓝暗处升起——手大、指节粗、掌心有缆绳磨出的厚茧、指尖干裂、指缝里结着白色细盐，袖口是褪色的靛蓝粗布——掌心朝向玻璃，11 秒停在她的手前约一指宽处，尚未重合。他只存在于玻璃之中。光：展柜内一盏 3000K 窄角射灯；玻璃后是近黑的深蓝绒布，画面下方远处一点旧黄铜罗盘柔和的反光。现代夜间调色（中性偏冷，暗部深蓝、绝不偏青）；玻璃里的那只手保留航海时代的冷暖对比；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still at t=1.2 s (after the 12-frame fade-up): extreme close-up of a frameless low-iron glass pane filling the 2.39:1 frame, a fine film of dust lit along its upper edge by a narrow 3000K top spot; beyond the glass near-black navy velvet and, low in frame, the soft out-of-focus honey glint of an aged brass compass; the gloved right index fingertip of RESTORER (thin warm-white cotton glove, faint grey-brown brass smudge on the tip) just touching the glass at (0.78,0.52), the charcoal wool coat cuff at the right edge; 100mm macro, focus on the glass surface, very shallow depth; neutral-cool grade, deep shadow detail, fine 35mm grain.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧（约 1.2 秒，12 帧淡入之后）：无框低铁超白玻璃的极近特写占满 2.39:1 画面，玻璃上一层细尘被顶部 3000K 窄光勾亮上缘；玻璃后是近黑的深蓝绒布，画面下方一点虚焦的黄铜蜂蜜色反光；修复师戴略暖白薄棉手套的右手食指指尖（指尖一点浅灰褐黄铜污迹）刚触到玻璃，位于 (0.78,0.52)，画右边缘露出深灰羊毛呢外套袖口；100mm 微距，焦点在玻璃表面，极浅景深；现代中性偏冷调色，暗部有层次，细腻 35mm 颗粒。
```
**末帧 / 匹配规格 End frame**
```text
t=13.25 s, must equal S002 frame 0 (hidden seam): her gloved right hand, back of the hand to camera, fingers up, centred at (0.50,0.55), hand width ~44% of frame height, fingertips on the glass; NAVIGATOR's ~8% larger salt-crusted LEFT hand, palm to camera, thumb on the same side as hers (frame left), ~2 cm deeper in mirror depth and offset ~1% down-left, so his fingertips, thumb pad and palm heel show around her glove outline; focus at glass +1 cm, both hands sharp; compass glint soft at (0.52,0.88).
```
**图生视频运动 Motion · EN**
```text
Camera: motion-control dolly push, 2% scale over 13.25 s, constant after a 12-frame ease-in; no pan, tilt, roll, shake or zoom; 24 fps. 0-0.5 s fade up from black. 1.23 s fingertip contacts the glass; 1.2-4.5 s the gloved fingertips wipe a smooth arc from frame right to left, decelerating, then stop and stay (micro-tremor only). 3.0 s salt crystals glint behind the cleared band. 6.6-9.0 s focus racks slowly (>=1 beat) from the glass surface to ~30 cm mirror depth; her hand softens. 8.0-11.0 s his left hand rises from below centre and advances toward the glass, focus following it back to ~2 cm; it stops at 11.0 s one finger-width from her hand. 11-13.25 s both hands nearly still, closing a few millimetres. Must NOT move: vitrine, glass edges, compass, pin spot, dust outside the wiped band; his hand never touches or lights anything in the room.
```
**图生视频运动 Motion · ZH**
```text
摄影机：运动控制轨道推进，13.25 秒内画面放大约 2%，12 帧缓入后匀速；不摇、不俯仰、不滚转、不晃、不变焦；24 fps。0–0.5 秒由黑场淡入。1.23 秒指尖触到玻璃；1.2–4.5 秒戴手套的指尖由画右向画左擦出一道平滑弧线，逐渐放慢，停住后保持（只允许极细的颤动）。3.0 秒擦净带后闪过盐晶。6.6–9.0 秒焦点缓慢（≥1 拍）从玻璃表面移到约 30 cm 的镜像深处，她的手变虚。8.0–11.0 秒他的左手从画面中下方升起并向玻璃靠近，焦点随之回到约 2 cm 深处；11.0 秒停在她的手前一指宽。11–13.25 秒两只手几乎静止，只再靠近几毫米。不得移动：展柜、玻璃边缘、罗盘、射灯、擦拭带以外的灰尘；他的手不触碰、不照亮房间里的任何东西。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 7.0 | Seg 1 (f0-f168): fade-up, wipe, salt glint, stop, rack starts 6.6 s. Generate 0-7.0 s = 0.5 s tail handle past the hidden seam at 6.5 s (f156). |
| 6.5 | 13.25 | Seg 2 (f156-f318): I2V from the seg-1 frame at 6.5 s with focus already travelling; navigator's hand rises and stops at 11.0 s; last frame = S002 frame 0. Generate 6.0-13.75 s (0.5 s handles), cut on matched frames, no dissolve. |

**分层与合成 Plates & compositing**

- **Plate A**：Modern plate on motion-control path MC_G1_OPEN (save for S002 and S071): G1 south glass ECU, dust film, RESTORER's gloved right hand wiping then resting; vitrine interior near-black navy with the soft compass glint; 3000K top spot. Focus keyframed: glass surface to 6.6 s, rack to 30 cm, then follow plate B back to ~2 cm.
- **Plate B**：Mirror-depth plate: NAVIGATOR's LEFT hand only, palm to camera, against a deep navy void (#0E1B30 to #1A2D4A) with a faint low warm 1950K bounce from lower left (his lantern-lit world); same 100mm perspective and push; rises from 30 cm depth to 2 cm; generated ~8% larger than her hand; salt crystals crisp; no arm beyond the faded indigo cuff.
- **Plate C**：Glass element pass: dust-film texture and an animated clean-band matte following her fingertip path (1.2-4.5 s), plus a few salt-crystal glints behind the band at 3.0 s.
- **合成 / 速度 / 调色 / 同步（post）**：Composite B as a reflection, never a ghost: inside the clean-band matte (feather ~40 px at 1920) screen B at ~30% at first reveal (3.0 s glints), ramping to ~55% by 11 s; outside the band hold B under the dust layer at <=10%. Pull A's transmitted vitrine interior down ~1 stop inside the matte so the reflection can read (dark behind the glass, bright reflected space, bible 8.3). Defocus B by mirror depth (30 cm -> 2 cm) in sync with A's rack; no light or shadow from B on A. Grade A CT_MODERN, B CT_NAV attenuated by reflectance; final grain 1.0 (B 1.15 before comp); halation 0.3 on the pin spot. 12-frame fade from black. Sync: f30 (1.23 s, first instrumental onset) fingertip contact; f72 (3.0 s) salt glint; f108 (4.5 s) fingertips stop; f158 (6.6 s, vocal pad) rack starts; f264 (11.0 s) his hand stops. Save MC data (T01) for S002/S071. MP-1: plate B (navigator's LEFT hand, palm to camera, thumb at frame left) is composited as seen.

**连续性锚点 match_to**：Hidden seam into S002 on the identical frame f318. T01 registry (0.50,0.55), hand width 45% of frame height is reached in S002 at 15.14 s; the same MC path and point are reused in S071 (future viewer's right hand).

**负面提示词（追加在全局负面之后）**
```text
visible seam or jump at 6.5 s, the navigator's hand passing through the glass or casting a shadow in the gallery, translucent ghost arm or body behind the hand, navigator's RIGHT hand or any visible cuff patch, restorer's bare fingers, optical-white or blue-white glove, glove without the brass smudge, two hands merging or morphing, one hand completely hidden behind the other, compass sharp and competing with the hands, fingerprint smears forming letters, cyan or green glass tint, cool LED spot colour, zoom, rotation, camera shake
```

#### S002 · 00:13:06 – 00:21:03 · 7.875 s（f318–f507）

| 项目 | 内容 |
|---|---|
| 歌词 | 千年 |
| 段落 / 简报章节 / 时代 / 场景 | INTRO 前奏 / 一 / 多时代 / `museum_gallery` |
| 景别 / 焦段 / 速度 | ECU / 100 mm / 24 |
| 入点转场 | 切 0 帧 — 隐藏接缝：与 S001 同一运动控制路径、构图与焦点连续，观众不可见（取代原 S003→S004 由特写跳到中景起点的剪辑） |
| 同步点 | 13.25 s 接缝后推近余势：两手继续靠近；15.14 s “千”：两只手掌隔着玻璃几乎完全重合；15.56 s “年”：修复师指尖轻颤，盐手不动；16.7 s “年”尾音后：推进转为缓慢后退；17.49 s 强拍：焦点交给镜像深处，盐手退进反射，夜海与船灯展开；19.5 s 远处手电光束由画右向画左扫过一次 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_GUARD` `CHAR_NAVIGATOR` `PROP_COMPASS` `PROP_SHIPLAMP` `PROP_GLOVES` `PROP_COAT` `PROP_FLASHLIGHT` `LOC_GALLERY` `LOC_DECK` |
| 调色 | 多时代/过渡（见提示词） |
| 生成时长 | 7.875 s |

**文生视频提示词 T2V · EN**
```text
Extreme close-up easing into a slow pull-back to MCU, 100mm macro, lens 1.18 m, square to a museum vitrine's glass; motion control, one continuous take, 24 fps. 0-1.9 s: the slim gloved right hand of RESTORER, ~28-year-old East Asian woman conservator (thin warm-white cotton glove, brass smudge on the index tip, charcoal wool coat cuff), and, inside the glass, the larger salt-crusted LEFT hand of NAVIGATOR, ~35-year-old 17th-century seaman (thick knuckles, rope calluses, cracked fingertips, faded indigo cuff), close until at 1.9 s they almost coincide palm to palm, 3-5 mm apart, centred low-middle. 2.3 s: her fingertips tremor once; his hand stays still. 3.4 s: she lifts her hand away to frame right and the camera eases into a slow 1.2 m retreat. 4.2 s: focus racks into the mirror depth; his hand recedes as the reflection opens into a deep-navy night sea, a horn-paned stern lantern swinging over heavy swell at the pane's upper left; through the glass, the quiet gallery and an aged brass compass under a 3000K spot; her faint silhouette on the glass at right. 6.2 s: a distant 4000K flashlight beam sweeps right to left once, the guard only an unresolved blur. Modern night grade (neutral-cool, never cyan); the sea in the glass keeps the navigator-era warm-cool split; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
极近特写缓缓转为后退至中近景，100mm 微距，镜头高 1.18 米，正对夜间博物馆无框展柜的玻璃；运动控制，一镜到底，24 fps。0–1.9 秒：修复师（约 28 岁东亚女性文物修复师）戴略暖白薄棉手套的纤细右手（食指指尖一点黄铜污迹，深灰羊毛呢外套袖口），与玻璃之中航海人（约 35 岁，17 世纪火长）更大的、带盐的左手（指节粗、掌心缆绳厚茧、指尖干裂、褪色靛蓝袖口）继续靠近，1.9 秒时掌心相对、几乎完全重合，只差 3–5 毫米，位于画面中央偏下。2.3 秒：她的指尖下意识轻轻一颤；他的手纹丝不动。3.4 秒：她把手从玻璃上移开、退出画右，摄影机以缓入转为约 1.2 米的缓慢后退。4.2 秒：焦点移进镜像深处——他的手退远，反射展开成一片深蓝夜海，一盏角片艉灯在沉重的涌浪上摇晃，位于这块玻璃的左上方；透过玻璃，是安静的现代展厅和 3000K 射灯下一枚旧黄铜罗盘；她淡淡的身影浮在玻璃右侧。6.2 秒：远处一道 4000K 手电光束由画右向画左扫过一次，夜班工作人员只是一团看不清的模糊身影。现代夜间调色（中性偏冷、绝不偏青）；玻璃里的海保留航海时代的冷暖对比；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0 (identical to S001's last frame): ECU through vitrine glass; RESTORER's gloved right hand back-to-camera, fingers up, at (0.50,0.55), hand width ~44% of frame height; behind her glove, in the glass's mirror depth, the larger salt-crusted LEFT hand of NAVIGATOR palm to camera, his fingertips, thumb pad and palm heel showing around her glove outline; both sharp; deep navy behind; dust glowing under the 3000K top spot; soft brass glint low; neutral-cool grade, fine grain.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧（与 S001 末帧完全一致）：隔着展柜玻璃的极近特写；修复师戴手套的右手手背朝镜头、四指向上，位于 (0.50,0.55)，手宽约占画面高 44%；在她手套之后、玻璃的镜像深处，航海人更大的带盐左手掌心朝镜头，指尖、拇指根与掌根从她手套轮廓的四周露出；两手都在焦内；背景深蓝；顶部 3000K 射灯照亮玻璃上的细尘；下方一点柔和黄铜反光；现代中性偏冷调色，细腻颗粒。
```
**末帧 / 匹配规格 End frame**
```text
t=7.875 s, hidden cut into S003 on a moving glass-edge highlight: MCU of the G1 vitrine; glass hood spans ~65% of frame width; compass small on its 15-degree cradle at (0.50,0.62); in the hood's south pane the reflected night sea with the swinging stern lantern at (0.36,0.32); the restorer's faint reflected silhouette at (0.74,0.45); the hood's front-right vertical edge carries a thin moonlit highlight at x~0.66, drifting left - S003 opens on the same line.
```
**图生视频运动 Motion · EN**
```text
Camera: 0-3.4 s residual MC push (~1%) easing to zero at 3.45 s, then a 12-24-frame ease into a constant slow pull-back of 1.2 m to the end, same axis (no arc yet); the last 6 frames begin an imperceptible drift right that brings the hood-edge highlight into frame. 24 fps. Subject: 0-1.9 s the hands close the last millimetres (his advancing, hers still) to near-coincidence at 1.9 s; 2.3 s one tiny tremor of her fingertips, his hand absolutely still. 3.4-3.9 s her hand lifts off the glass and exits frame right (she steps out of the camera axis). 4.24 s focus racks >=1 beat into mirror depth; his hand recedes ~40 cm and darkens as the sea reflection widens; the stern lantern swings on a 6-8 s period, swell rolling slowly. 6.25 s a 4000K flashlight beam sweeps once right to left in the far background, then gone. Must NOT move: vitrine, compass, pin spot; the reflection never fades globally.
```
**图生视频运动 Motion · ZH**
```text
摄影机：0–3.4 秒为运动控制推进的余势（约 1%），在 3.45 秒缓停，随后以 12–24 帧缓入转为匀速缓慢后退约 1.2 米直到结束，光轴不变（尚不绕行）；最后 6 帧开始几乎察觉不到地向右偏移，让玻璃罩立边的高光进入画面。24 fps。主体：0–1.9 秒两手合上最后几毫米（他的手靠近，她的手不动），1.9 秒几乎重合；2.3 秒她的指尖轻轻一颤，他的手绝对静止。3.4–3.9 秒她的手离开玻璃、从画右退出（她走出镜头轴线）。4.24 秒焦点用 ≥1 拍移进镜像深处；他的手退远约 40 cm、渐暗，海面反射随之展开；艉灯以 6–8 秒周期摆动，涌浪缓慢起伏。6.25 秒远景里一道 4000K 手电光束由画右向画左扫过一次，随即消失。不得移动：展柜、罗盘、射灯；反射绝不整体淡出。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.8 | Seg 1: ECU hands, continuation of S001 plates A/B/C; near-coincidence 1.9 s, tremor 2.3 s, her hand lifts away 3.4-3.8 s. Generate 0-4.3 s (0.5 s tail handle). |
| 3.3 | 7.875 | Seg 2: MC pull-back reveal; his hand recedes; sea reflection opens; flashlight at 6.25 s. Generate 2.8-8.375 s (0.5 s handles); blend the seam 3.3-3.8 s on her hand's exit motion. |

**分层与合成 Plates & compositing**

- **Plate A**：Modern MC plate (continuation of MC_G1_OPEN): G1 vitrine, aged compass under the 3000K spot, gallery depth seen through the glass hood with moonlight shafts on the teak floor; RESTORER's hand withdrawing to frame right; her faint reflection on the right of the south pane.
- **Plate B**：NAVIGATOR's LEFT hand (continues S001 plate B), receding into mirror depth 4.2-5.5 s and darkening.
- **Plate C**：Night-sea mirror plate (LOC_DECK): deep navy heavy swell under moonlight, a hexagonal horn-paned stern lantern (1950K, candle) swinging on a 6-8 s period at a dark stern rail; rendered from the MC path mirrored across the glass plane so parallax is true.
- **Plate D**：Flashlight element: one narrow 4000K beam sweeping right to left across the far gallery floor and columns at 6.25 s; the guard himself only a dark blur.
- **合成 / 速度 / 调色 / 同步（post）**：Reflection lives only inside the hood's south-pane matte (planar track, 6 px feather; hood edges keep their own highlights). B continues at ~50% from S001 to 4.0 s, then hands over to C by depth as focus passes (4.24-5.0 s), not by a global fade; C sits at ~30-35% screen with the transmitted compass and gallery readable beneath; C is rendered from the mirrored MC path for true reflection parallax and its final on-screen layout is as written (MP-1): lantern in the upper-left third of the pane. Darken the vitrine interior inside the pane ~0.7 stop. Her silhouette reflection ~10%, darker than C. Grade A CT_MODERN, C CT_NAV attenuated; grain unified 1.0; lantern halation 0.5 inside the reflection. Sync: f363 (15.14 '千') hands closest = T01 registry (0.50,0.55), hand width 45% of frame height; f373 (15.56 '年') tremor; f401 (16.7) pull-back begins; f420 (17.49 downbeat) rack into the sea; f468 (19.5) flashlight sweep.

**连续性锚点 match_to**：Frame 0 = S001 last frame (hidden seam). The 15.14 s T01 frame is the reference for S071 (future viewer's hand at the same point, same MC data). Ends on the hood-edge highlight that hides the cut into S003 (T02).

**负面提示词（追加在全局负面之后）**
```text
jump at the seam with S001, hands morphing or fusing through the glass, ghost body standing in the gallery, the sea seen outside the glass instead of in its reflection, unmirrored or pasted-on reflection, reflection fading out globally, electric bulb in the stern lantern, blue streak flare, the restorer's body blocking the vitrine during the pull-back, guard's face or figure in focus, flashlight sweeping more than once or left-to-right, compass needle moving, zoom instead of a dolly retreat, wobble
```

#### S003 · 00:21:03 – 00:28:10 · 7.292 s（f507–f682）

| 项目 | 内容 |
|---|---|
| 歌词 | 有多远 |
| 段落 / 简报章节 / 时代 / 场景 | INTRO 前奏 / 一 / 现代 / `museum_gallery` |
| 景别 / 焦段 / 速度 | CU / 75 mm / 24 |
| 入点转场 | 切 0 帧 — 运动接续的隐形剪辑：S002 后退的余势接本镜弧移 |
| 同步点 | 21.58 s “有”：弧移开始，反射海面开始滑走；22.9 s “远”：海面完全隐去，只剩罗盘；24.0 s 罗盘独立成画；26.0 s 镜头停稳，静观罗盘 |
| 参考图 refs | `PROP_COMPASS` `PROP_SHIPLAMP` `LOC_GALLERY` `LOC_DECK` |
| 调色 | 现代夜间 |
| 生成时长 | 7.292 s |

**文生视频提示词 T2V · EN**
```text
Close-up, 75mm anamorphic, lens about 1.2 m high, slight high angle; the camera, carrying the retreat's momentum, arcs 15 degrees to the right around a frameless museum vitrine and creeps in toward the object; 24 fps. At 0.5 s, as the arc begins, the reflected deep-navy night sea and swinging horn-paned ship lantern in the glass start sliding sideways across the pane, by changing angle, not fading, and at 1.8 s slip past the glass edge and vanish. By 2.9 s only the object remains: a 17th-century brass mariner's compass in its museum state, stabilised chocolate-brown patina with honey high points, blue-green verdigris in the deepest grooves, an engraved bearing ring and drilled star points, a crack across the mica cover near the north-west edge, the red-lacquered south tip of the blued needle still pointing south toward lower left, tilted 15 degrees on a clear acrylic cradle over near-black navy velvet. At 4.9 s the camera settles and holds. Light: one narrow 3000K pin spot from directly above inside the vitrine; a cool moonlit edge on the glass. Engraved marks stay soft. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
近景，75mm 变形镜头，镜头高约 1.2 米，略俯；摄影机承接后退的余势，绕夜间博物馆无框展柜向右弧移约 15°，并缓缓向展品推近；24 fps。0.5 秒弧移开始，玻璃里反射的深蓝夜海与摇晃的角片船灯开始沿玻璃横向滑走——靠角度变化，不是淡出——1.8 秒滑过玻璃边缘、消失。2.9 秒，画面里只剩那件东西：一枚 17 世纪黄铜罗盘的博物馆状态——经稳定化处理的巧克力褐包浆、高点保留蜂蜜色，最深的刻槽里有蓝绿色铜绿，二十四向刻字圈与钻孔星点，云母片在西北（乾位）边缘一道裂纹，发蓝钢针南端那滴朱红漆仍指着南、朝向画左下——倾斜 15° 躺在透明亚克力托架上，下衬近黑的深蓝绒布。4.9 秒摄影机停稳、保持。光：展柜内正上方一盏 3000K 窄角射灯；玻璃边缘一线冷月光。刻字保持柔和。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0 (same framing as S002's last frame, now on a 75mm lens): MCU of the G1 vitrine, glass hood ~65% of frame width, the museum-state compass small at (0.50,0.62) on its acrylic cradle over near-black navy velvet under a 3000K pin spot; the reflected night sea and swinging stern lantern still in the south pane at upper left (0.36,0.32); a thin moonlit highlight on the hood's front-right vertical edge at x~0.66; dark gallery beyond with cool moonlit floor shafts; neutral-cool grade, fine grain.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧（与 S002 末帧同构图，换 75mm）：G1 展柜中近景，玻璃罩约占画面宽 65%，博物馆状态的罗盘小小地位于 (0.50,0.62)，在亚克力托架上、近黑深蓝绒布之上，顶部 3000K 射灯；南侧玻璃左上方 (0.36,0.32) 仍映着夜海与摇晃的艉灯；玻璃罩前右立边一线冷月高光位于 x≈0.66；远处是黑暗的展厅与地板上的冷月光斑；现代中性偏冷调色，细腻颗粒。
```
**末帧 / 匹配规格 End frame**
```text
t=7.29 s: close-up, compass centred at (0.50,0.55), ~60% of frame height, tilted 15 degrees toward camera; needle's red south tip pointing lower left (same on-screen orientation as S009); mica crack at the north-west edge near the top of the needle well; no trace of the sea reflection on the glass; pin-spot highlight on the rim at the top.
```
**图生视频运动 Motion · EN**
```text
Camera: from the retreat's momentum, 0-0.45 s ease into a slow rightward arc of ~15 degrees around the vitrine, combined with a gentle push-in toward the compass (~25 cm in total); the arc decelerates over 3.0-4.9 s and settles at 4.9 s, then locked to the end; 24 fps. Reflection: from 0.45 s the reflected sea and lantern slide across the pane toward frame left with the angle change and exit past the hood's left vertical edge by 1.8 s - no fade; by 2.9 s only the compass remains. Focus: rack from reflection depth to the compass dial over 0.5-1.8 s. Must NOT move: compass, needle, cradle, pin spot, vitrine; no zoom.
```
**图生视频运动 Motion · ZH**
```text
摄影机：承接后退余势，0–0.45 秒缓入为绕展柜约 15° 的缓慢右弧移，同时轻轻推向罗盘（共约 25 cm）；3.0–4.9 秒弧移减速，4.9 秒停稳，此后锁定到结束；24 fps。反射：0.45 秒起，随角度变化，反射里的海与船灯沿玻璃向画左滑动，1.8 秒前滑出玻璃罩左立边——不淡出；2.9 秒只剩罗盘。焦点：0.5–1.8 秒由反射深处转到罗盘盘面。不得移动：罗盘、针、托架、射灯、展柜；不变焦。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.0 | Seg 1: arc start and reflection slide-off (plates A + C). Generate 0-3.5 s. |
| 2.5 | 7.29 | Seg 2: push-in and settle on the compass, single plate. Generate 2.0-7.29 s; blend on the continuous push 2.5-3.0 s. |

**分层与合成 Plates & compositing**

- **Plate A**：Modern MC plate: G1 vitrine with the museum-state compass along the arc + push path; gallery and moonlight shafts beyond; no reflection content generated in the glass.
- **Plate C**：Reuse S002 plate C (night sea + stern lantern), re-rendered from the arc path mirrored across the south pane so it slides left and out of the pane by 1.8 s.
- **合成 / 速度 / 调色 / 同步（post）**：Reflection C composited only inside the south-pane matte at ~30% (continuing S002), moved by the mirrored-camera solve; it leaves by geometry, never by opacity. Compass glyphs: the AI plate keeps the 24 bearings soft; if the dial resolves at this size, replace the ring with the calligrapher-approved texture (clockwise from north 子 癸 丑 艮 寅 甲 卯 乙 辰 巽 巳 丙 午 丁 未 坤 申 庚 酉 辛 戌 乾 亥 壬) tracked to the dial. Grade CT_MODERN: P09 honey highs, P10 patina, P12 verdigris <=1% of frame. Hidden cut from S002 on the hood-edge highlight at frame 0. Sync: f518 (21.58 '有') arc begins; f550 (22.9 '远') sea gone; f576 (24.0) compass alone; f624 (26.0) settled; hold to f682. MP-1 applies to plate C (as in S002).

**连续性锚点 match_to**：Opens on S002's hood-edge highlight (hidden cut, completes T02). Museum state contrasts with the in-use compass of S006/S009; needle on-screen orientation (south to lower left) = S009.

**负面提示词（追加在全局负面之后）**
```text
reflection fading or dissolving instead of sliding off by angle, sea or lantern still visible after 1.8 s, ghost overlay, compass in its fresh golden in-use state, intact mica, missing verdigris, needle not pointing south or moving, wrong or AI-invented bearing characters in sharp focus, red or beige lining instead of navy velvet, vitrine label or plaque text, several spotlights, cool LED spot, camera shake, whip pan
```

### 主歌一 V1

#### S004 · 00:28:10 – 00:31:16 · 3.250 s（f682–f760）

| 项目 | 内容 |
|---|---|
| 歌词 | 海图泛黄 |
| 段落 / 简报章节 / 时代 / 场景 | V1 主歌一 / 二 / 现代 / `museum_gallery` |
| 景别 / 焦段 / 速度 | INSERT / 50 mm / 24 |
| 入点转场 | 切 0 帧 — 同一展厅：G1 罗盘 → 1.5 m 外的 G2 海图平柜（同一个航海人的两件旧物） |
| 同步点 | 28.9 s “海图泛黄”起唱：海图已完整呈现；29.52 s “黄”：手套指尖退出画面 |
| 参考图 refs | `CHAR_RESTORER` `PROP_CHART` `PROP_GLOVES` `LOC_GALLERY` |
| 调色 | 现代夜间 |
| 生成时长 | 3.25 s |

**文生视频提示词 T2V · EN**
```text
Insert, 50mm anamorphic, camera overhead looking down through the horizontal glass top of a museum flat case at night, axis square to the chart's gently tilted board, polariser killing glare; locked with an imperceptible descending push (about 3% over 3.2 s); 24 fps. Filling the frame: a yellowed early-17th-century Chinese needle-route sea chart on a mulberry-paper handscroll in its museum state, paper #CDB98C with brown foxing, edge losses mended with slightly paler toned tissue, soft fold lines and visible fibres; a fictional coastline drawn as little mountain-profile islands and ink-dot reefs over pale indigo water, a twin-peaked islet at 62% across and 40% down, a fine dotted route line; tiny brush annotations soft and illegible; two clear acrylic strips hold the left end and the top edge. In the first frame a gloved fingertip of RESTORER (thin warm-white cotton glove, faint brass smudge) rests on the glass at lower right; at 0.2 s it lifts and by 1.1 s has withdrawn out of frame, leaving a fading smudge of reflection. Light: dimmed 3000K case light, a thin line of cool moonlight along the glass edge. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
插入镜头，50mm 变形镜头，摄影机在上方透过博物馆平柜的水平玻璃面向下拍，光轴垂直于海图下那块微倾的卡板，用偏振镜消除反光；锁定，几乎察觉不到地向下推进（3.2 秒内约 3%）；24 fps。占满画面的是一张泛黄的 17 世纪上半叶针路图，桑皮纸手卷的博物馆状态：纸色 #CDB98C，满布褐色霉斑，边缘缺损处用颜色略浅的调色和纸修补，折痕柔软，纸纤维可见；一段虚构的海岸线以山形立面画法画成小小的岛屿侧影，墨点为礁，水面淡花青晕染，一座双峰小岛位于横向 62%、纵向 40% 处，一条细墨点航线；小楷注记柔和、不可读；两条透明亚克力压条压住左端与上边。第一帧里，修复师戴略暖白薄棉手套的指尖（一点黄铜污迹）停在画右下的玻璃上；0.2 秒抬起，1.1 秒前退出画面，只留下一点渐淡的反光。光：调暗的 3000K 柜内光，玻璃边缘一线冷月光。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0: overhead insert through the G2 flat-case glass; the museum-state chart fills the frame with the registry of the end frame; a gloved fingertip resting on the glass at lower right (0.90,0.82) with a faint glove reflection; a moonlight line along the glass edge at the top; dim even 3000K case light; paper fibres, foxing and tissue repairs crisp.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧：透过 G2 平柜玻璃的俯拍插入镜头；博物馆状态的海图按末帧登记的构图占满画面；一只戴手套的指尖停在画右下 (0.90,0.82) 的玻璃上，带一点手套的淡反光；画面上方玻璃边缘一线月光；均匀而暗的 3000K 柜内光；纸纤维、霉斑与补纸清晰。
```
**末帧 / 匹配规格 End frame**
```text
t=3.25 s, T03 A-frame for S005: unrolled chart spans x 0.05-0.95 (chart width = 90% of frame width); its lower edge at y~0.88 with the free lower-right corner at (0.95,0.88); upper edge just beyond the frame top (the 32 cm scroll is taller than the 2.39 frame at this scale); twin-peaked islet centred at (0.62,0.40); acrylic strip 1 vertical across the left end at x~0.10; acrylic strip 2 horizontal along the top edge from x 0.55 to 0.95 at y~0.06; dotted route from (0.15,0.70) to the islet; no fingertip, no reflection smudge.
```
**图生视频运动 Motion · EN**
```text
Camera: locked overhead, axis square to the chart's 10-degree board, imperceptible descending push (~3% scale over 3.25 s, constant); 24 fps. Subject: frame 0 the gloved fingertip rests on the glass at lower right; 0.2-1.1 s it lifts and withdraws out of frame right, its faint reflection fading by 1.4 s; the chart is fully readable by 0.48 s. Must NOT move: chart, acrylic strips, paper corners, light.
```
**图生视频运动 Motion · ZH**
```text
摄影机：俯拍锁定，光轴垂直于倾斜 10° 的卡板，几乎察觉不到地向下推进（3.25 秒内匀速约 3%）；24 fps。主体：第 0 帧戴手套的指尖停在画右下的玻璃上；0.2–1.1 秒抬起并从画右退出，淡反光在 1.4 秒前消失；0.48 秒海图已完整呈现。不得移动：海图、亚克力压条、纸角、光。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.25 | Single generation. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Keep only the thin moonlight edge line as glare. Chart annotations stay soft and low-contrast (no AI pseudo-script in focus). Grade CT_MODERN with paper held near P15 #D6C6A2 - no yellow-green or sepia. Verify the end frame against S005's start (islet and strip/weight positions within +/-3%). Sync: f694 (28.9 '海图泛黄') chart fully presented; f708 (29.52 '黄') fingertip gone.

**连续性锚点 match_to**：End frame = T03 A-frame for the S005 match cut (same chart, same crop; acrylic strips -> brass weights).

**负面提示词（追加在全局负面之后）**
```text
legible or fake Chinese characters on the chart, European compass rose, keystoned or skewed chart, glare hot-spots on the glass, chart corners moving, fresh cream paper (this is the aged museum state), yellow-green or sepia cast, red route line, bare finger, fingertip lingering after 1.1 s, label or plaque text, visible case frame logos
```

#### S005 · 00:31:16 – 00:34:12 · 2.833 s（f760–f828）

| 项目 | 内容 |
|---|---|
| 歌词 | 暮色深蓝 |
| 段落 / 简报章节 / 时代 / 场景 | V1 主歌一 / 二 / 航海人 / `ship_cabin` |
| 景别 / 焦段 / 速度 | INSERT / 50 mm / 48 (50% slow motion) |
| 入点转场 | 匹配剪辑 0 帧 — 相似构图：同一段海岸线、双峰小岛同在 (0.62,0.40)、同比例 90° 正俯拍；亚克力压条 → 铜镇纸同位置；3000K → 1950K（T03；跨时代） |
| 同步点 | 32.05 s “暮色深蓝”起唱；32.77 s “蓝”：风掀起纸角（48 fps） |
| 参考图 refs | `PROP_CHART` `PROP_SHIPLAMP` `LOC_CABIN` |
| 调色 | 航海时代 |
| 生成时长 | 2.833 s |

**文生视频提示词 T2V · EN**
```text
Insert, 50mm anamorphic, straight overhead onto the chart table in the cramped stern cabin of a 17th-century Chinese ocean-going junk at dusk; the camera rides the ship's slow 7-second roll with a faint sway; shot at 48 fps for 50% slow motion. Matching the museum frame exactly: the same needle-route chart in use, fresher cream paper #DCCDA6 with crisp ink, softened by handling, corners curling, one candle-wax drip, the twin-peaked islet at 62% across and 40% down; two small brass weights sit exactly where the acrylic strips were, on the left end and the top edge, and a round grey stone pins the lower-left corner; the lower-right corner is free. Warm 1950K light from a horn-paned cabin lantern swinging overhead slides slowly across the paper; cool dusk blue from the barred stern window lays a vertical stripe at frame right. At 1.1 s a gust from the stern window at frame right lifts the free lower-right corner; the paper curls up, flutters and settles back in slow motion. Smoke-dark wood at the edges, annotations illegible. Navigator-era grade: strongest warm-cool split, deep-blue sea and sky against amber lamplight, greens muted; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
插入镜头，50mm 变形镜头，正俯拍 17 世纪远洋帆船艉部狭小针房里的海图桌，暮色；摄影机随船体约 7 秒一周期的起伏轻轻晃动；48 fps 拍摄，50% 慢动作。与博物馆画面严格对位：同一张针路图在使用中——纸色较新的米色 #DCCDA6、墨色清楚，却已被手翻软、四角卷起，有一处烛泪，双峰小岛位于横向 62%、纵向 40%；两块小铜镇纸恰好放在亚克力压条的位置——左端与上边——一块灰色圆石压住左下角；右下角空着。头顶摆动的角片舱灯 1950K 暖光在纸面上缓缓移过；艉墙直棂小窗透进的暮色冷蓝在画右投下一道竖条。1.1 秒，一阵风从画右的艉窗灌入，掀起空着的右下纸角；纸卷起、颤动，再以慢动作落回原处。画边是被烟熏深的木头，注记不可读。航海时代调色：全片最强的冷暖对比，深蓝的海与天对琥珀色灯光，绿色压低；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0 (must match S004's last frame within +/-3%): straight down onto the cabin chart table; the same chart in its in-use state, cream #DCCDA6, crisp ink, corners curling; islet at (0.62,0.40); a small brass weight on the left end at (0.10,0.50) and another on the top edge at (0.78,0.06), exactly where the acrylic strips were; a round grey stone on the lower-left corner (0.08,0.85); lower-right corner free at (0.95,0.88); a candle-wax drip near (0.30,0.62); warm 1950K lantern pool from upper left, a vertical twilight-blue stripe from the stern window at frame right; smoke-dark table wood at the edges; navigator grade, fine grain.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧（须与 S004 末帧误差 ±3% 以内）：正俯拍船舱海图桌；同一张海图的当年状态，米色 #DCCDA6、墨色清楚、四角卷起；双峰小岛在 (0.62,0.40)；一块小铜镇纸压在左端 (0.10,0.50)，另一块在上边 (0.78,0.06)，恰是亚克力压条的位置；一块灰色圆石压住左下角 (0.08,0.85)；右下角 (0.95,0.88) 空着；(0.30,0.62) 附近一处烛泪；舱灯 1950K 暖光池来自左上，艉窗暮蓝在画右投下竖条；画边是烟熏深的桌木；航海时代调色，细腻颗粒。
```
**末帧 / 匹配规格 End frame**
```text
—（无专门末帧规格；按运动提示词自然结束）
```
**图生视频运动 Motion · EN**
```text
Shot at 48 fps, played at 24 fps (50% slow motion): the 68 timeline frames cover 1.42 s of real action. Camera: overhead, riding the ship's slow roll - a gentle sway of <=1% of frame, at half speed. Light: the lantern glow slides slowly across the paper (reads as a 12-16 s swing at half speed). 1.10 s: a gust from frame right lifts the free lower-right corner ~6 cm; the paper curls, flutters and settles back by 2.6 s. Must NOT move: the weights, the stone, the islet's position, the rest of the chart (only the free corner lifts).
```
**图生视频运动 Motion · ZH**
```text
以 48 fps 拍摄、24 fps 播放（50% 慢动作）：时间线上 68 帧对应 1.42 秒的真实动作。摄影机：俯拍，随船体缓慢起伏，以半速轻轻晃动，幅度 ≤ 画面 1%。光：舱灯暖光在纸面上缓缓移过（半速下看起来是 12–16 秒的摆动）。1.10 秒：一阵风从画右掀起空着的右下纸角约 6 cm，纸卷起、颤动，2.6 秒前落回。不得移动：镇纸、圆石、小岛位置、海图其余部分（只有空着的那只角被掀起）。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.83 | Single generation at 48 fps (or a 2.83 s half-speed render); use S004's end frame as the composition reference image. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Match cut T03: overlay S004's last frame at 50% to validate islet and weight positions (+/-3%). The 3000K -> 1950K jump is the cut itself (no dissolve). Annotations illegible. Grade CT_NAV, grain 1.15, halation 0.5 around the lantern pool. Sync: f769 (32.05) lyric onset; f786 (32.77 '蓝') corner lift begins.

**连续性锚点 match_to**：Start = T03 B-frame from S004. The same swinging lantern light carries into S006 (glint along the brass).

**负面提示词（追加在全局负面之后）**
```text
brand-new pristine paper, aged foxing (that is the museum state), weights or stone in the wrong place, corner lifting on the left or top, whole chart blowing away, European compass rose, legible or fake characters, electric light, modern objects, chart misaligned with the S004 frame, jerky speed ramp, flame streak flare, cyan dusk
```

#### S006 · 00:34:12 – 00:40:04 · 5.667 s（f828–f964）

| 项目 | 内容 |
|---|---|
| 歌词 | 有人把星辰／刻进黄铜的圆盘 |
| 段落 / 简报章节 / 时代 / 场景 | V1 主歌一 / 二 / 航海人 / `ship_cabin` |
| 景别 / 焦段 / 速度 | ECU / 100 mm / 24 |
| 入点转场 | 切 0 帧 — 同一盏摆动的舱灯，光由纸面移到铜面（光线接续） |
| 同步点 | 36.21 s “星辰”：光掠过星点；36.99 s “刻”：拇指入画沿口沿抹过；39.21 s “盘”：光走完半圈，停在“午”（南） |
| 参考图 refs | `CHAR_NAVIGATOR` `PROP_COMPASS` `PROP_SHIPLAMP` `LOC_CABIN` |
| 调色 | 航海时代 |
| 生成时长 | 5.667 s |

**文生视频提示词 T2V · EN**
```text
Extreme close-up, 100mm macro at T5.6-T8, slight high angle grazing the face of a brass mariner's compass in the stern cabin of a 17th-century junk; camera locked, only riding the ship's gentle roll; 24 fps. The compass in its in-use state: warm golden brass #B8925A, soot and grease in the engraved grooves, eight trigram bars, a ring of 24 engraved bearings, an outer ring of tiny drilled star points linked by hair-fine lines, a silver-inlaid pole star, intact golden mica over the blued needle with its red-lacquered south tip, white salt bloom on the rim. The light moves, not the camera: one warm glint from the swinging horn-paned lantern (1950K, overhead) travels along the star ring; at 1.7 s it crosses the star points. At 2.5 s the right thumb of NAVIGATOR enters, a ~35-year-old seaman's large, cracked, rope-callused thumb with salt in the creases, slowly wipes salt from the rim at the south mark and withdraws by 4.0 s, leaving the brass bright; at 4.7 s the glint comes to rest on that south mark. The rim is the brightest line. Engraved marks stay soft. Navigator-era grade: strongest warm-cool split, deep-blue sea and sky against amber lamplight, greens muted; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
极近特写，100mm 微距，T5.6–T8，略俯、贴着 17 世纪远洋帆船艉部针房里一枚黄铜罗盘的盘面；摄影机锁定，只随船体轻微起伏；24 fps。罗盘为当年状态：温暖的金黄铜色 #B8925A，刻槽里积着烟灰与油污，八卦刻线、二十四向刻字一圈、外圈二十八处钻孔小星点以极细刻线相连、一颗嵌银的北辰，完整的微金色云母片下是发蓝钢针、南端一滴朱红漆，口沿有白色盐霜。动的是光，不是摄影机：头顶摆动的角片舱灯（1950K）投下一点暖光，沿星点外圈移动；1.7 秒掠过星点。2.5 秒，航海人（约 35 岁）粗大、干裂、带缆绳老茧、纹路里嵌着盐的右手拇指入画，沿南向（午位）口沿缓缓抹去一层盐霜，4.0 秒前收回，铜面露出亮色；4.7 秒那点暖光停在这一处南向口沿上。口沿是画面最亮的线。刻字保持柔和。航海时代调色：全片最强的冷暖对比，深蓝的海与天对琥珀色灯光，绿色压低；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0: macro at a grazing slight-high angle across the warm golden brass dial in a dark cabin: the outer ring of drilled star points linked by hair-fine lines sharp in the foreground, the 24-bearing ring beyond (glyphs soft), intact golden mica over the blued needle; soot in the grooves; white salt bloom on the rim at the south mark at lower left; a single warm 1950K lantern glint on the star ring at the east side (frame right); rim the brightest line; deep layered shadow; navigator grade, fine grain.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧：微距，略俯、几乎掠射地横过黑暗船舱中温暖的金色铜盘：前景是以极细刻线相连的钻孔星点外圈，清晰；其后是二十四向刻字圈（字形柔和），完整的金色云母下是发蓝钢针；刻槽积灰；画左下南向口沿上有白色盐霜；星圈东侧（画右）一点 1950K 舱灯暖光；口沿最亮；暗部深而有层次；航海时代调色，细腻颗粒。
```
**末帧 / 匹配规格 End frame**
```text
—（无专门末帧规格；按运动提示词自然结束）
```
**图生视频运动 Motion · EN**
```text
Camera locked, riding a <=0.5% ship roll; 24 fps. The light moves, not the camera: one slow lantern half-swing carries a warm glint along the star ring from the east side toward the south mark (about 60 degrees of arc, from the east-south-east bearing round to due south) - crossing the star points at 1.7 s, reaching the south mark at 4.7 s and resting there as the lantern reaches the end of its swing. 2.5 s the navigator's right thumb enters from lower right, wipes salt off the rim at the south mark in one slow stroke (~1 s) and withdraws by 4.0 s. Must NOT move: compass, needle (still), framing.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定，只随船体起伏 ≤0.5%；24 fps。动的是光：舱灯一次缓慢的半摆，把一点暖光从星圈东侧带向南向（约 60° 弧，由东南偏东的方位转到正南）——1.7 秒掠过星点，4.7 秒到达南向并停住（灯摆到尽头）。2.5 秒航海人的右手拇指从画右下入画，用一次约 1 秒的缓慢抹动擦去南向口沿的盐霜，4.0 秒前收回。不得移动：罗盘、针（静止）、构图。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 5.67 | Single generation (5.67 s); if the model drifts, split at 2.4 s before the thumb entry with a 0.5 s handle. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Engraved bearings: generate soft; if any glyph resolves in focus, replace the ring with the calligrapher-approved texture (correct 24-bearing order, 午 at south) or defocus it. Glint travel is a pendulum lamp's: keep it to ~60 degrees of arc, not a half circle. Grade CT_NAV, rim peak P11 #D2B27E, grain 1.15, halation 0.5 on the glint. Sync: f869 (36.21 '星辰') glint over the star points; f888 (36.99 '刻') thumb enters; f941 (39.21 '盘') glint rests on 午.

**连续性锚点 match_to**：Light continuity from S005 (same swinging lantern). In-use state vs the museum state in S003. The thumb's owner looks up in S007.

**负面提示词（追加在全局负面之后）**
```text
camera moving instead of the light, glint jumping or flickering, a modern compass rose or Western letters, wrong or AI-invented characters in sharp focus, verdigris or cracked mica (museum state), needle swinging, thumb with clean manicured nail, left thumb, plastic hyper-sharp macro, oversaturated gold, electric light
```

#### S007 · 00:40:04 – 00:44:19 · 4.625 s（f964–f1075）

| 项目 | 内容 |
|---|---|
| 歌词 | 你把半生／交给一张帆 |
| 段落 / 简报章节 / 时代 / 场景 | V1 主歌一 / 二 / 航海人 / `ship_cabin` |
| 景别 / 焦段 / 速度 | MCU / 32 mm / 24 |
| 入点转场 | 切 0 帧 — 由物及人：罗盘上的拇指 → 拇指的主人抬头 |
| 同步点 | 41.78 s “你把半生”：航海人抬头；43.94 s “帆”：穿出舱口，巨帆填满画面 |
| 参考图 refs | `CHAR_NAVIGATOR` `PROP_SHIPLAMP` `LOC_CABIN` `LOC_DECK` |
| 调色 | 航海时代 |
| 生成时长 | 4.625 s |

**文生视频提示词 T2V · EN**
```text
Medium close-up rising into a vertical reveal, 32mm anamorphic, crane, 24 fps. In a cramped smoke-blackened stern cabin with 1.65 m headroom: NAVIGATOR, a ~35-year-old East Asian compass-keeper of a 17th-century junk: long sun-weathered face, high cheekbones, deep-set dark-brown eyes with deep sun creases, short neat beard bleached brown by salt, a pale 1.5 cm scar at the tail of his LEFT eyebrow, topknot wrapped in an indigo head-cloth (no queue), faded indigo cross-collar cotton jacket, stoops under a low beam, warm swinging 1950K horn-lantern light on his face, gaze tired and steady. At 1.6 s he lifts his eyes to the open square hatch overhead; the camera leaves his face and rises straight up along his eyeline, slowly, past the dark beam and through the 70 cm hatch frame into dusk-blue backlight, and at 3.8 s a towering rust-ochre battened junk sail fills the frame overhead against a deep twilight sky, bamboo battens dividing it into bellied panels, wind pressing it full. Focus follows: face, beam, sail. Real skin with pores and salt, no modern objects. Navigator-era grade: strongest warm-cool split, deep-blue sea and sky against amber lamplight, greens muted; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中近景升起为竖直揭示，32mm 变形镜头，伸缩摇臂，24 fps。在烟熏发黑、净高只有 1.65 米的狭小艉舱里：航海人——约 35 岁的东亚男性，17 世纪远洋帆船上的火长：长脸、风吹日晒、颧骨突出、眼窝略深的深褐眼睛带着很深的日晒纹，短而整齐、被盐漂浅成褐色的胡须，左眉尾一道约 1.5 厘米的浅白旧疤，发髻裹着靛蓝布头巾（不留辫），穿褪色的靛蓝右衽交领粗棉短褂——弯腰站在低矮的横梁下，摆动的角片舱灯 1950K 暖光落在脸上，目光疲惫而稳定。1.6 秒，他抬眼望向头顶打开的方形舱口；摄影机离开他的脸，沿他的视线竖直、缓慢地升起，越过黑色横梁，穿过 70 厘米见方的舱口，进入暮蓝的逆光；3.8 秒，一面高耸的锈赭色竹篾横撑硬帆在头顶展开、填满画面，背后是深暮色的天，竹篾把帆分成一格一格鼓起的弧面，风把它撑满。焦点随行：脸、横梁、帆。真实皮肤带毛孔与盐，无现代物件。航海时代调色：全片最强的冷暖对比，深蓝的海与天对琥珀色灯光，绿色压低；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0: MCU on a 32mm lens in the cramped smoke-blackened stern cabin; NAVIGATOR stooped under a low dark beam at frame centre-right (face at ~0.58,0.48), eyes lowered toward the chart table below frame; long weathered face, high cheekbones, short salt-bleached beard, pale scar at the tail of the LEFT eyebrow, indigo head-cloth over a topknot, faded indigo cross-collar jacket; face lit by warm swinging 1950K horn-lantern light from upper left; plank wall #3A2A1E behind; a square of dusk-blue light from the open hatch at the top edge; navigator grade, fine grain.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧：32mm 中近景，烟熏发黑的狭小艉舱；航海人弯腰站在低矮的黑色横梁下，位于画面中偏右（脸约在 0.58,0.48），目光低垂、看向画面下方的海图桌；长脸风霜、颧骨高、短须被盐漂浅，左眉尾浅白旧疤，靛蓝头巾裹髻，褪色靛蓝交领短褂；脸被左上方摆动的 1950K 角片舱灯照亮；身后是 #3A2A1E 的木板壁；画面上缘是打开的舱口透下的一方暮蓝；航海时代调色，细腻颗粒。
```
**末帧 / 匹配规格 End frame**
```text
t=4.625 s: looking straight up, the rust-ochre battened sail fills ~85% of frame, battens running near-horizontal, a sliver of deep twilight sky (#0E1B30 to #2E4A6E) at the top edge; camera still rising - S008 picks up the upward/outward motion.
```
**图生视频运动 Motion · EN**
```text
Camera: 0-1.6 s almost static on his face (slight upward drift); 1.61 s as he lifts his eyes, the crane rises straight up along his eyeline while tilting from level to vertical, slow and smooth (~0.6 m/s), passing the beam (~2.2 s) and the 70x70 cm hatch frame (2.9-3.1 s, frame momentarily filled by dark hatch wood = hidden seam), emerging into dusk; 3.77 s the sail fills the frame overhead; keep rising to the end. 24 fps. Subject: he lifts head and eyes at 1.6 s and holds the upward gaze; lantern swings on a 6-8 s period. Must NOT move: beam and hatch geometry (rigid), head-cloth; the sail only breathes with wind pressure, never flaps wildly.
```
**图生视频运动 Motion · ZH**
```text
摄影机：0–1.6 秒几乎停在他的脸上（轻微上移）；1.61 秒他抬眼时，摇臂沿他的视线竖直升起，同时由平视俯仰为正仰，缓慢平滑（约 0.6 m/s），约 2.2 秒越过横梁，2.9–3.1 秒穿过 70×70 cm 的舱口边框（深色舱口木料短暂占满画面＝隐藏接缝），进入暮色；3.77 秒帆在头顶填满画面；继续上升到结束。24 fps。主体：1.6 秒抬头抬眼，保持仰望；舱灯 6–8 秒一周期摆动。不得移动：横梁与舱口结构（刚性）、头巾；帆只随风压鼓动，不剧烈拍打。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.1 | Seg 1 = plate A (cabin): face, look-up at 1.61 s, crane rise to the hatch; ends with the hatch's dark wood filling frame. Generate 0-3.4 s. |
| 2.9 | 4.625 | Seg 2 = plate B (exterior): starts inside the hatch frame wood, rises out past the hatch rim, tilts to the sail; sail fills frame at 3.77 s. Generate 2.6-5.1 s (handles). |

**分层与合成 Plates & compositing**

- **Plate A**：Cabin interior crane plate (LOC_CABIN): navigator under the beam, look-up, rise and tilt to the hatch.
- **Plate B**：Exterior plate (LOC_DECK, stern deck above the hatch): hatch rim in the foreground, rising and tilting up to the mainsail against the dusk sky.
- **合成 / 速度 / 调色 / 同步（post）**：Join A -> B with a soft wipe matched to the hatch's dark wood (2.9-3.1 s); match camera speed across the seam; exposure ramps from the cabin lantern key to the dusk backlight during the hatch passage; no dissolve (T04). Grade CT_NAV; cabin warm share ~40% -> exterior ~5%; grain 1.15. Sync: f1003 (41.78 '你把半生') look-up, camera departs face; f1055 (43.94 '帆') sail fills frame.

**连续性锚点 match_to**：Cut on motion from S006 (thumb -> its owner looks up). Upward/outward motion continues into S008's aerial pull-back (T04).

**负面提示词（追加在全局负面之后）**
```text
Qing queue or shaved forehead, clean modern haircut, missing eyebrow scar or scar on the right brow, cloth sail without battens, Western square-rigged sails, portholes, electric light, fast drone swoop, whip tilt, visible seam at the hatch, camera passing through solid wood, glossy plastic skin, steady studio lighting without the lantern swing
```

#### S008 · 00:44:19 – 00:48:07 · 3.500 s（f1075–f1159）

| 项目 | 内容 |
|---|---|
| 歌词 | 去问天地／何处是心安 |
| 段落 / 简报章节 / 时代 / 场景 | V1 主歌一 / 二 / 航海人 / `sea_deck` |
| 景别 / 焦段 / 速度 | EWS / 28 mm / 24 |
| 入点转场 | 切 0 帧 — 运动方向接续（上升/向外） |
| 同步点 | 44.9 s “去问天地”：拉开至极远景；47.18 s “心”：画左远岸的灯闪了一下 |
| 参考图 refs | `PROP_SHIPLAMP` `LOC_DECK` |
| 调色 | 航海时代 |
| 生成时长 | 3.5 s |

**文生视频提示词 T2V · EN**
```text
Extreme wide, 28mm spherical aerial, high and steady, slowly pulling back and rising, horizon dead level, 24 fps. A three-masted 17th-century Chinese ocean-going junk, tiny on a vast deep-blue South China Sea at dusk after sunset: huge rust-ochre battened sails bellied in segments, painted eyes on the bow, bow heading frame right, a long heavy 2-3 m swell with silver crests, spray and salt mist at the bow. Towering cumulus with the last warm light on their tops; zenith near-black navy #0E1B30; a faint warm line along the horizon. On the far left horizon a low black coastline holds one tiny warm 1900K light; at 2.4 s it flickers once. No clear human figure: the only human traces are an amber square of lantern light from the open cabin hatch on the stern deck and a single dot of a helmsman under the lit stern lantern, together under 2% of frame. The sea is real and heavy. Crest highlights moon-silver, never pure white; no fast drone swoop. Navigator-era grade: strongest warm-cool split, deep-blue sea and sky against amber lamplight, greens muted; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
大远景，28mm 球面镜头航拍，高而稳，缓慢后拉并上升，地平线绝对水平，24 fps。一艘 17 世纪的三桅远洋帆船，在日落之后暮色深蓝的南海上显得极小：巨大的锈赭色竹篾横撑硬帆一格一格地鼓起，船首画着船眼，船首朝画右，2–3 米的长涌浪沉重而有体积，浪尖银亮，船首切开白沫与盐雾。高耸的积云顶端残留最后一点暖光；天顶近黑的深蓝 #0E1B30；地平线上一线极淡的残暖。画左远处的地平线上，一段低矮的黑色海岸线上只有一点极小的 1900K 暖灯；2.4 秒时它闪了一下。甲板上没有清晰的人影：唯一的人的痕迹，是艉部甲板上打开的舱口透出的一格琥珀色灯光，以及亮着的艉灯下一个掌舵人的小点，二者合计不到画面的 2%。海洋真实而沉重。浪尖高光是月光银而非纯白；禁止航拍式快速掠过。航海时代调色：全片最强的冷暖对比，深蓝的海与天对琥珀色灯光，绿色压低；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0: high oblique aerial (~35 degrees down) of the junk at dusk, ship at (0.55,0.64), hull ~8% of frame width, bow to frame right, rust-ochre battened sails bellied, heavy swell with silver crests, cumulus above; low black coastline on the far left horizon with a tiny 1900K light at (0.10,0.44); horizon level at y~0.42; amber hatch square on the stern deck; stern lantern lit; navigator grade, 250D-like grain.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧：约 35° 俯角的高空斜视航拍，暮色中的帆船位于 (0.55,0.64)，船身约占画面宽 8%，船首朝画右，锈赭色竹篾硬帆鼓满，浪尖银亮的沉重涌浪，上方积云；画左远处地平线上低矮的黑色海岸线，一点 1900K 小灯在 (0.10,0.44)；地平线水平，位于 y≈0.42；艉部甲板一格琥珀色舱口光；艉灯亮着；航海时代调色，250D 式颗粒。
```
**末帧 / 匹配规格 End frame**
```text
—（无专门末帧规格；按运动提示词自然结束）
```
**图生视频运动 Motion · EN**
```text
Camera: heavy-lift aerial, slow constant pull-back (~3 m/s) and rise (~1 m/s) while tilting from ~35 degrees down to ~15 degrees down so the horizon settles level in the upper half; no swoop, no bank, no yaw; 24 fps. Subject: the junk ploughs slowly toward frame right; swell rolls with weight; spray at the bow; sails hold their curve. 2.39 s the shore light at far left flickers once (one dip and return, ~6 frames). Must NOT move: horizon level, coastline position at left, the light's colour.
```
**图生视频运动 Motion · ZH**
```text
摄影机：重载航拍，匀速缓慢后拉（约 3 m/s）并上升（约 1 m/s），同时由约 35° 俯角抬到约 15°，让地平线水平地落在画面上半部；不掠过、不侧倾、不偏航；24 fps。主体：帆船缓缓向画右破浪；涌浪沉重起伏；船首溅起浪花；帆保持弧面。2.39 秒画左远处的岸灯闪一下（一次变暗再恢复，约 6 帧）。不得移动：地平线水平、画左海岸线位置、灯的颜色。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.5 | Single generation. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：If the generated shore light is missing or misplaced, add a 1900K (#E2A458) point element on the left coastline at (0.10,0.44), ~3 px at 1920, with one 6-frame dip at f1132; keep it in later plates of the same coast (S022, S045). Figure area <=2%. Grade CT_NAV; crests P04 not white; zenith P01; horizon warm line <=30% of P21 saturation. Sync: f1078 (44.9 '去问天地') pull-out; f1132 (47.18 '心') light flicker.

**连续性锚点 match_to**：Motion continuity from S007 (upward/outward). Shore and its light are screen-left (lock shared with S010's gaze, S022, S045); the ship heads screen-right.

**负面提示词（追加在全局负面之后）**
```text
shore or lights on the right side, bow heading left, sun disk in frame, orange sunset sky, Western galleon or square sails, multiple ships, modern boats, lighthouse, tilted or curved horizon, fisheye bulge, fast swoop or banking, cartoon water, flat glassy sea, pure white wave tops, crowded deck, large readable figure
```

#### S009 · 00:48:07 – 00:50:00 · 1.708 s（f1159–f1200）

| 项目 | 内容 |
|---|---|
| 歌词 | 那根针／认得南 |
| 段落 / 简报章节 / 时代 / 场景 | V1 主歌一 / 二 / 航海人 / `ship_cabin` |
| 景别 / 焦段 / 速度 | ECU / 100 mm / 24 |
| 入点转场 | 切 0 帧 — 尺度对切：极远 → 极近 |
| 同步点 | 48.75 s “根针”：针仍在微摆；49.77 s “南”：针完全静止 |
| 参考图 refs | `PROP_COMPASS` `PROP_SHIPLAMP` `LOC_CABIN` |
| 调色 | 航海时代 |
| 生成时长 | 1.708 s |

**文生视频提示词 T2V · EN**
```text
Extreme close-up, 100mm macro at T8, straight down onto the needle well of a brass mariner's compass in a 17th-century ship's cabin; camera locked to the ship, riding a faint roll; 24 fps. Under a thin, slightly golden mica cover, the 3.6 cm blued-steel dry-pivot needle on its fine brass pin swings in two or three shrinking arcs, about 8 degrees, then 4, then 1, and at 1.5 s stops dead, the drop of red lacquer on its south tip aligned exactly on the south bearing, pointing to lower left. Around it, warm golden brass with soot in the grooves and the engraved bearing ring soft at the frame edge. The pivot pin sits at 46% across and 50% down; the needle spans about 60% of frame height. Light: swinging 1950K horn-lantern warmth across the brass from upper left, a cool twilight-blue line along the needle from the stern window. Engraved marks soft, no plastic macro sharpness. Navigator-era grade: strongest warm-cool split, deep-blue sea and sky against amber lamplight, greens muted; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
极近特写，100mm 微距，T8，正俯拍 17 世纪船舱里一枚黄铜罗盘的针池；摄影机与船体固定，随轻微的起伏；24 fps。薄而微带金色的云母片下，3.6 厘米的发蓝钢针在细铜针轴上摆动两三次，幅度越来越小——约 8°、4°、1°——1.5 秒时稳稳停住，南端那一滴朱红漆恰好对准南向（午位），指向画左下。四周是温暖的金黄铜面、刻槽里的烟灰，二十四向刻字圈在画边柔焦。针轴位于横向 46%、纵向 50%；针长约占画面高 60%。光：左上方摆动的 1950K 角片舱灯暖光掠过铜面，艉窗的暮蓝在针上留一线冷光。刻字柔和，避免塑料感的超锐微距。航海时代调色：全片最强的冷暖对比，深蓝的海与天对琥珀色灯光，绿色压低；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0: top-down macro of the needle well; pivot at (0.46,0.50); the blued needle mid-swing about 8 degrees clockwise of south, ~60% of frame height; intact mica with faint golden lamination; warm brass with soot; bearing ring soft at the frame edges; warm lantern light from upper left, a cool line along the needle; navigator grade, fine grain.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧：正俯拍针池微距；针轴在 (0.46,0.50)；发蓝钢针正摆到南向顺时针约 8°，约占画面高 60%；完整的云母带淡淡金色层纹；温暖铜面积着烟灰；刻字圈在画边柔焦；左上方舱灯暖光，针上一线冷光；航海时代调色，细腻颗粒。
```
**末帧 / 匹配规格 End frame**
```text
t=1.708 s, T05 A-frame for S010: needle at rest; pivot pin exactly at (0.46,0.50); needle axis from upper right to lower left with the red-lacquered south tip at lower left; needle length ~60% of frame height; brass dial soft around; nothing moving.
```
**图生视频运动 Motion · EN**
```text
Camera locked to the ship (riding a <=0.5% roll, the pivot never drifts in frame); 24 fps. Needle: damped oscillation about south - +/-8 degrees at 0 s, +/-4 by ~0.6 s, +/-1 by ~1.1 s - and it stops dead at 1.48 s with the red tip on the south bearing; still to the end. Light: lantern warmth sliding slightly. Must NOT move: dial, mica, pivot position.
```
**图生视频运动 Motion · ZH**
```text
摄影机与船体固定（随 ≤0.5% 的起伏，针轴在画面中绝不漂移）；24 fps。针：围绕南向的阻尼摆动——0 秒 ±8°、约 0.6 秒 ±4°、约 1.1 秒 ±1°——1.48 秒红端停在南向、完全静止，直到结束。光：舱灯暖光轻微滑动。不得移动：盘面、云母、针轴位置。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 1.71 | Single shot built from two plates (see plates); no generation segmenting needed. |

**分层与合成 Plates & compositing**

- **Plate A**：Compass dial macro (in-use state, LOC_CABIN light): locked top-down, needle removed or at rest, lantern light sliding slightly.
- **Plate B**：Needle element: blued-steel needle with red south tip and brass pivot cap, generated as a clean still with alpha (or CG), rotated in comp on a damped-oscillation curve so it settles exactly at f1194.
- **合成 / 速度 / 调色 / 同步（post）**：Animate plate B in comp to lock the sync (49.77 s = f1194 '南'); light motion blur only during the swings; the needle's soft shadow on the dial follows the rotation; mica reflections over the needle. Bearing glyphs soft, or replaced with the approved calligraphy texture. Grade CT_NAV. Sync: f1170 (48.75 '根针') still swinging; f1194 (49.77 '南') at rest.

**连续性锚点 match_to**：End = T05 A-frame -> S010 near pupil at (0.46,0.50). On-screen needle orientation (south to lower left) = S003 museum compass.

**负面提示词（追加在全局负面之后）**
```text
needle still swinging after 1.5 s, needle settling on the wrong bearing, red tip pointing up or right, Western compass card with N/E/S/W letters, magnetic card compass, cracked mica or verdigris (museum state), pivot drifting in frame, plastic hyper-sharp macro, oversaturated gold, legible or invented characters in focus
```

#### S010 · 00:50:00 – 00:52:18 · 2.750 s（f1200–f1266）

| 项目 | 内容 |
|---|---|
| 歌词 | 可认得／你想回的岸 |
| 段落 / 简报章节 / 时代 / 场景 | V1 主歌一 / 二 / 航海人 / `ship_cabin` |
| 景别 / 焦段 / 速度 | CU / 100 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 相似构图：针轴 → 瞳孔同一画面位置 (0.46,0.50)；针的“确定” → 眼神的“不确定”（T05） |
| 同步点 | 50.01 s “可认得”：切到眼睛；51.39 s “回”：他眨了一下眼 |
| 参考图 refs | `CHAR_NAVIGATOR` `PROP_SHIPLAMP` `LOC_CABIN` |
| 调色 | 航海时代 |
| 生成时长 | 2.75 s |

**文生视频提示词 T2V · EN**
```text
Close-up, 100mm anamorphic, eye level, slightly off-axis; barely perceptible push-in (about 2% over 2.7 s); 24 fps. NAVIGATOR, a ~35-year-old East Asian compass-keeper of a 17th-century junk: long sun-weathered face, high cheekbones, deep-set dark-brown eyes with deep sun creases, short neat beard bleached brown by salt, a pale 1.5 cm scar at the tail of his LEFT eyebrow, topknot wrapped in an indigo head-cloth (no queue), faded indigo cross-collar cotton jacket, with a few wind-loosened strands at the head-cloth edge, sits at frame right in three-quarter view facing frame left, toward the barred stern window and the unseen shore of home; the pale scar at the tail of his LEFT eyebrow is clearly visible. The first frame holds his near pupil exactly where the compass pivot was, at 46% across and 50% down. His gaze is lost, slightly unfocused; at 1.4 s he blinks once, slowly. Wind through the window bars stirs the loose strands. Light: warm 1950K lantern light swinging gently across his cheek; cool dusk blue from the stern window rims the eye socket. Real skin, pores, wind-reddened cheeks, salt in the beard. Navigator-era grade: strongest warm-cool split, deep-blue sea and sky against amber lamplight, greens muted; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
近景，100mm 变形镜头，平视略偏；几乎察觉不到地推进（2.7 秒内约 2%）；24 fps。航海人——约 35 岁的东亚男性，17 世纪远洋帆船上的火长：长脸、风吹日晒、颧骨突出、眼窝略深的深褐眼睛带着很深的日晒纹，短而整齐、被盐漂浅成褐色的胡须，左眉尾一道约 1.5 厘米的浅白旧疤，发髻裹着靛蓝布头巾（不留辫），穿褪色的靛蓝交领粗棉短褂，头巾边几缕被风吹乱的碎发——他在画右，四分之三侧脸朝向画左，望向艉墙直棂小窗外看不见的、家的方向的海岸；左眉尾的旧疤清晰可见。第一帧里，他靠近镜头那只眼睛的瞳孔恰好位于罗盘针轴的位置：横向 46%、纵向 50%。眼神迷茫、微微失焦；1.4 秒他缓慢地眨了一下眼。从窗棂间吹进来的风拨动碎发。光：1950K 舱灯暖光在脸颊上轻轻摆动；艉窗暮蓝勾出眼眶。真实皮肤、毛孔、被风吹红的面颊、胡须里的盐。航海时代调色：全片最强的冷暖对比，深蓝的海与天对琥珀色灯光，绿色压低；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0, T05 B-frame: CU of NAVIGATOR in three-quarter view at frame right facing frame left; his near (left) eye's pupil exactly at (0.46,0.50), the eye about 25% of frame height; long weathered face, deep sun creases, short salt-bleached beard, pale scar at the tail of the LEFT eyebrow, indigo head-cloth edge with loose strands; warm lantern light on the cheek, cool dusk blue rimming the eye socket from the stern window at frame left; pores and salt; navigator grade, fine grain.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧，T05 B 帧：航海人四分之三侧脸的近景，人在画右、面朝画左；靠近镜头的左眼瞳孔恰在 (0.46,0.50)，眼睛约占画面高 25%；长脸风霜、深深的日晒纹、被盐漂浅的短须，左眉尾浅白旧疤，靛蓝头巾边几缕碎发；脸颊上舱灯暖光，画左艉窗的暮蓝勾出眼眶；毛孔与盐粒清晰；航海时代调色，细腻颗粒。
```
**末帧 / 匹配规格 End frame**
```text
—（无专门末帧规格；按运动提示词自然结束）
```
**图生视频运动 Motion · EN**
```text
Camera: barely perceptible push-in (~2% over 2.75 s), nothing else; 24 fps. Subject: gaze fixed toward frame left, slightly unfocused; 1.39 s one slow natural blink at real speed; wind through the window bars lifts a few strands at the head-cloth edge; lantern light swings slowly across his cheek. Must NOT move: head position (pupil stays at 0.46,0.50 +/-1%), no head turn, no expression change beyond the blink.
```
**图生视频运动 Motion · ZH**
```text
摄影机：几乎察觉不到地推进（2.75 秒内约 2%），无其他运动；24 fps。主体：视线固定望向画左、微微失焦；1.39 秒一次真实速度的缓慢眨眼；窗棂间的风吹动头巾边几缕碎发；舱灯暖光在脸颊上缓缓摆过。不得移动：头部位置（瞳孔保持在 0.46,0.50 ±1%），不转头，除眨眼外不改变表情。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.75 | Single generation; I2V from the keyframe. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Validate the pupil registry against S009's end frame (overlay). Skin protection: hue 18-32 degrees, P19 #A26F4C base, wind-red cheeks; no smoothing. Grade CT_NAV, grain 1.15. Sync: f1200 (50.01 '可认得') cut; f1233 (51.39 '回') blink.

**连续性锚点 match_to**：Start = T05 B-frame from S009 (pivot -> pupil). Gaze screen-left = the shore of S008/S022/S045. Leads to his hand in S011.

**负面提示词（追加在全局负面之后）**
```text
looking to frame right or at camera, scar on the right brow or missing, Qing queue, tears or crying, exaggerated emotion, head turning, more than one blink, smooth beauty skin, makeup, modern haircut, porthole window, electric light, slow-motion blink
```

### 过门 GAP1

#### S011 · 00:52:18 – 00:56:00 · 3.250 s（f1266–f1344）

| 项目 | 内容 |
|---|---|
| 歌词 | 你想回的岸 |
| 段落 / 简报章节 / 时代 / 场景 | GAP1 过门 / 二 / 航海人 / `ship_cabin` |
| 景别 / 焦段 / 速度 | INSERT / 100 mm / 24 |
| 入点转场 | 切 0 帧 — 眼神 → 手（他想到的东西） |
| 同步点 | 52.75 s “岸”尾音：左手翻开袖口；53.0 s 人声收束：指腹停在补丁上；55.5 s 空拍中画面保持 |
| 参考图 refs | `CHAR_NAVIGATOR` `PROP_PATCH` `PROP_SHIPLAMP` `LOC_CABIN` |
| 调色 | 航海时代 |
| 生成时长 | 3.25 s |

**文生视频提示词 T2V · EN**
```text
Insert, 100mm anamorphic, slight high angle, locked with a faint natural breathing drift; 24 fps. In a dim 17th-century ship's cabin, the right wrist of NAVIGATOR, a ~35-year-old seaman's large, thick-knuckled hand with rope calluses, cracked fingertips and white salt in the creases, lies across frame in the sleeve of his faded indigo coarse-cotton jacket. Cut into the motion: his LEFT thumb and forefinger are already folding back the RIGHT cuff; by 0.25 s the fold is open, the right wrist rolls slightly inward and the inside of the cuff faces the camera, showing a 4.5 by 6 cm patch of paler blue hand-woven cloth, #7D9CBB, sewn with small off-white running stitches, one corner uneven with a double knot, its centre rubbed soft and shiny. His left fingertips settle on the patch and do not move again; hold through the musical pause to the end. Light: the swinging 1950K horn-lantern light passes over the patch, warm, then dimmer; twilight blue in the shadows. Cotton weave and salt in fine detail. Navigator-era grade: strongest warm-cool split, deep-blue sea and sky against amber lamplight, greens muted; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
插入镜头，100mm 变形镜头，略俯，锁定，只带极轻的自然呼吸感；24 fps。昏暗的 17 世纪船舱里，航海人（约 35 岁）的右手腕横在画面中——手大、指节粗、掌心有缆绳老茧、指尖干裂、纹路里嵌着白盐——穿在褪色的靛蓝粗棉短褂袖子里。切入时动作已在进行：他的左手拇指与食指正把右袖口的折边翻开；0.25 秒折边完全翻开，右手腕微微内翻，袖口内侧朝向镜头，露出一块 4.5×6 厘米、颜色更浅的浅蓝手织布补丁（#7D9CBB），本白棉线细密的平针，一角针脚不齐、打了两次小结，中间被摩挲得起毛发亮。左手指腹停在补丁上，此后不再移动；画面停在这里，越过乐句后的空拍直到结束。光：摆动的 1950K 角片舱灯一下一下落在补丁上，暖，又暗下去；阴影里是暮蓝。棉布织纹与盐粒细节清楚。航海时代调色：全片最强的冷暖对比，深蓝的海与天对琥珀色灯光，绿色压低；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0 (mid-gesture): slight-high-angle insert; his right forearm in a faded indigo coarse-cotton sleeve across the lower frame, wrist at centre; his LEFT thumb and forefinger, reaching over from upper right, halfway through folding back the RIGHT cuff, a strip of paler blue cloth just appearing inside; large thick-knuckled hands, cracked fingertips with dark lines, rope calluses, white salt crystals in the creases; warm lantern light on the cuff, twilight blue in the shadows; 100mm, focus on the inner layer of the cuff.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧（动作中途）：略俯的插入镜头；他的右前臂穿着褪色的靛蓝粗棉袖子横在画面下部，手腕在画面中央；他的左手从画右上方伸过来，拇指与食指正把右袖口折边翻开一半，里层一条浅蓝布刚刚露出；手大、指节粗、指尖干裂嵌着深色细线、掌心缆绳老茧、纹路里有白色盐晶；袖口上是舱灯暖光，阴影里是暮蓝；100mm，焦点在袖口里层。
```
**末帧 / 匹配规格 End frame**
```text
t=3.25 s, gesture-match A-frame for S012: the turned-back RIGHT cuff shows the pale blue patch (double-knotted uneven corner at upper right); his LEFT index and middle fingertip pads rest on the patch with the contact point at (0.50,0.52), fingers pointing from upper right toward lower left ~30 degrees below horizontal, fingertip ~12% of frame height; everything still.
```
**图生视频运动 Motion · EN**
```text
Camera: locked with a faint natural breathing drift (<=0.5%); 24 fps. Subject: cut in mid-gesture - 0-0.25 s the fold completes, the right wrist rolls slightly inward to present the patch, and the left fingertip pads settle on it at 0.25 s; then complete stillness to 3.25 s, only the lantern light passing over the patch (brightening ~1.0-2.5 s). Must NOT move after 0.25 s: fingers, cuff, wrist.
```
**图生视频运动 Motion · ZH**
```text
摄影机：锁定，只有极轻的自然呼吸漂移（≤0.5%）；24 fps。主体：切入时动作进行中——0–0.25 秒折边翻完，右手腕微微内翻让补丁朝向镜头，左手指腹在 0.25 秒落在补丁上；此后直到 3.25 秒完全静止，只有舱灯的光掠过补丁（约 1.0–2.5 秒变亮）。0.25 秒之后不得移动：手指、袖口、手腕。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.25 | Single generation; start from the mid-gesture keyframe (cut-in on action). |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Patch lock check: inside the RIGHT cuff, #7D9CBB, off-white running stitches, one uneven double-knotted corner, rubbed centre - identical in S035 (being sewn), S045, S067. Grade CT_NAV, grain 1.15. GAP1 breath: no cut and no new movement during 53.0-56.0. Sync: f1266 (52.75 '岸' tail) gesture in progress; f1272 (53.0, vocal end) fingertips land; f1332 (55.5) hold; cut at f1344 (56.0).

**连续性锚点 match_to**：End frame fingertip registry (0.50,0.52), fingers to lower left -> S012 start (cross-era gesture match). Patch identical in S035/S045/S067.

**负面提示词（追加在全局负面之后）**
```text
patch on the left cuff or on the outside of the sleeve, right hand turning the cuff, patch visible before the fold opens, bright new patch, machine-even stitches, missing double knot, fingers moving after 0.25 s, smooth clean hands, rings, modern fabric, extra fingers, fused fingers, deformed hands
```

### 预副歌 PRE1

#### S012 · 00:56:00 – 00:58:10 · 2.417 s（f1344–f1402）

| 项目 | 内容 |
|---|---|
| 歌词 | 青花碎了 |
| 段落 / 简报章节 / 时代 / 场景 | PRE1 预副歌 / 三 / 现代 / `restoration_lab` |
| 景别 / 焦段 / 速度 | CU / 75 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 手势：航海人停在补丁上的指尖 → 修复师捏住残片的指尖（指尖手势匹配；跨时代） |
| 同步点 | 57.2 s “碎”：两片残片咬合 |
| 参考图 refs | `CHAR_RESTORER` `PROP_SHARDS` `PROP_GLOVES` `PROP_COAT` `LOC_LAB` |
| 调色 | 现代夜间 |
| 生成时长 | 2.417 s |

**文生视频提示词 T2V · EN**
```text
Close-up, 75mm anamorphic, 45-degree high angle over an oak conservation bench at night; slow push-in (about 4% over 2.4 s); 24 fps. The opening frame matches the previous fingertip: the gloved right thumb and forefinger of RESTORER, a ~28-year-old East Asian woman conservator in thin warm-white cotton gloves with ribbed wrists and a faint grey-brown brass smudge on the index fingertip and thumb, pinch a blue-and-white porcelain rim shard at frame centre, fingers pointing to lower left. She holds her breath and eases it toward a second shard on grey conservation foam; at 1.2 s the two break edges meet with a tiny click, the hairline join running exactly between two five-petal plum blossoms of the cobalt rim band, no blossom split. Her left forearm stays pressed on the bench edge at lower left, the charcoal wool coat sleeve unrolled, a small pilled lighter-grey worn spot on the outer little-finger side of the LEFT cuff just visible. Light: articulated 3500K bench lamp from upper left at 45 degrees, one specular highlight on the glaze; cool harbour night at frame right. Glaze #EDF1EF, cobalt #2B4A8B. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
近景，75mm 变形镜头，45° 俯拍夜间的橡木修复台；缓慢推进（2.4 秒内约 4%）；24 fps。起幅与上一镜的指尖对位：修复师——约 28 岁的东亚女性文物修复师，戴略暖白的薄棉修复手套、罗纹腕口，食指与拇指指尖一点浅灰褐黄铜污迹——右手拇指与食指在画面中央捏着一片青花口沿残片，手指朝向画左下。她屏住呼吸，把它慢慢移向灰色海绵垫上的另一片；1.2 秒两片断口轻轻咬合——细细的接缝恰好从口沿钴蓝纹带的两朵五瓣梅花之间穿过，没有一朵梅花被裂开。她的左前臂一直压在画左下的台沿上，深灰羊毛呢外套袖子没有挽起，左袖口外侧（小指一侧）那块起毛、颜色变浅的小磨损刚好可见。光：可调臂台灯 3500K 从左上 45° 落下，釉面一点镜面高光；画右是港口夜色的冷光。釉白 #EDF1EF，钴蓝 #2B4A8B。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0 (gesture-match B-frame): CU at a 45-degree high angle; RESTORER's gloved right thumb and forefinger pinching a blue-and-white rim shard, fingertip contact at (0.50,0.52), fingers pointing from upper right to lower left ~30 degrees, fingertip ~12% of frame height; the second shard on grey foam at lower left; her left forearm in the charcoal coat sleeve resting on the bench edge at the lower-left corner with the worn spot on the outer side of the LEFT cuff just visible; 3500K lamp from upper left, specular on the glaze; cool window night at right.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧（手势匹配 B 帧）：45° 俯拍近景；修复师戴手套的右手拇指与食指捏着一片青花口沿残片，指尖接触点在 (0.50,0.52)，手指由画右上指向画左下约 30°，指尖约占画面高 12%；另一片在画左下的灰色海绵垫上；她穿深灰呢外套的左前臂压在画左下角的台沿，左袖口外侧的磨损刚好可见；3500K 台灯来自左上，釉面有高光；画右是窗外冷色夜光。
```
**末帧 / 匹配规格 End frame**
```text
—（无专门末帧规格；按运动提示词自然结束）
```
**图生视频运动 Motion · EN**
```text
Camera: slow push-in (~4% over 2.4 s) at a constant 45-degree high angle; 24 fps. Subject: 0-1.2 s she eases the shard ~2 cm toward the second shard with one tiny corrective twist; the break edges meet at 1.2 s and hold; breath held, no other body movement; the left forearm stays pressed on the bench edge. Must NOT move: the second shard, the foam, the lamp light.
```
**图生视频运动 Motion · ZH**
```text
摄影机：45° 俯角不变，缓慢推进（2.4 秒内约 4%）；24 fps。主体：0–1.2 秒她把残片向另一片移近约 2 cm，做一次极小的校正转动；1.2 秒断口咬合并保持；屏住呼吸，身体其他部分不动；左前臂一直压在台沿上。不得移动：另一片残片、海绵垫、台灯光。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.42 | Single generation; I2V from the gesture-match keyframe. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Cross-era gesture match: overlay S011's end frame; fingertip contact within +/-3%. The 1950K -> 3500K jump is the cut. Check the canonical pattern (one continuous plum branch, 16 blossoms; join between blossoms). Worn spot: LEFT cuff, outer little-finger side, ~1 cm above the edge, 18x8 mm, #5A5E62. Grade CT_MODERN (lab ratio 4:1), glaze P06, cobalt P07, grain 1.0. Sync: f1344 (56.0; '青花碎了' 56.06) cut; f1373 (57.2 '碎') click.

**连续性锚点 match_to**：Start matches S011's end-frame fingertip registry (0.50,0.52). Worn LEFT-cuff lock shared with S062/S064/S070.

**负面提示词（追加在全局负面之后）**
```text
bare fingers, nitrile or blue gloves, crack running through a plum blossom, scrolling peony or lotus pattern, reign mark, rolled-up sleeve, worn spot on the right cuff, glossy plastic porcelain, glue strings, shards trembling, harsh cold light, readable labels on tools, brand names
```

#### S013 · 00:58:10 – 01:01:06 · 2.833 s（f1402–f1470）

| 项目 | 内容 |
|---|---|
| 歌词 | 春色还留在碗沿 |
| 段落 / 简报章节 / 时代 / 场景 | PRE1 预副歌 / 三 / 现代 / `restoration_lab` |
| 景别 / 焦段 / 速度 | ECU / 100 mm / 24 |
| 入点转场 | 切 0 帧 — 同一物件推近 |
| 同步点 | 58.64 s “春色”：焦点到达梅花纹带；60.26 s “沿”：停在完整的碗沿 |
| 参考图 refs | `PROP_BOWL` `PROP_SHARDS` `LOC_LAB` |
| 调色 | 现代夜间 |
| 生成时长 | 2.833 s |

**文生视频提示词 T2V · EN**
```text
Extreme close-up, 100mm macro at T5.6-T8, low angle grazing the glaze; a slider tracks slowly along a crack (under 2 cm/s) with focus following; 24 fps. On a conservation bench at night, a shard of a folk-kiln blue-and-white flared bowl: slightly bluish white glaze #EDF1EF with tiny pinholes, quick loose cobalt #2B4A8B brushwork with soft bleeding and dark heaped iron spots #18294F, a grey-white hairline break running through the glaze. The camera glides along the crack; at 0.2 s the moving focus plane arrives at the rim band, a 1 cm band between thin double lines holding one continuous flowering plum branch, and travels along it past five-petal blossoms and buds, every blossom whole because the crack passes between them; at 1.8 s the move eases to a stop on an unbroken stretch of the rim, the lip edge kept clearly in frame, as fresh as if just painted. Light: 3500K bench lamp raking from upper left, the glaze holding a soft travelling specular. Shallow depth, real macro texture, not plastic. No reign mark. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
极近特写，100mm 微距，T5.6–T8，低角度贴着釉面；滑轨沿一道裂纹缓慢横移（≤2 cm/s），焦点随行；24 fps。夜里修复台上，一片民窑青花撇口碗的残片：白中泛极淡青的釉 #EDF1EF 带细小棕眼，钴料 #2B4A8B 笔触快而不工整、有晕散，积料处有深色铁锈斑 #18294F，一道灰白的细裂纹穿过釉面。镜头沿裂纹滑行；0.2 秒移动的焦平面到达口沿纹带——上下两道细弦线之间 1 厘米宽、一枝连绵不断的折枝梅——沿纹带继续经过一朵朵五瓣梅花与花苞，每一朵都完整，因为裂纹只从花与花之间穿过；1.8 秒运动缓缓停在一段完好的碗沿上，口沿边缘清楚地留在画内，像刚画上去一样。光：3500K 台灯从左上方掠射，釉面上一点柔和的高光随之移动。浅景深，真实的微距质感，不要塑料感。无底款。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0: low grazing macro on a blue-and-white shard; a grey-white hairline crack runs diagonally from lower left toward the rim band at upper right; focus on the crack just below the band; cobalt bleed and iron spots soft beyond; pinholes in the glaze; raking 3500K specular from upper left; modern grade, fine grain.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧：低角度掠射的青花残片微距；一道灰白细裂纹由画左下斜向画右上的口沿纹带；焦点在纹带下方的裂纹上；更远处钴料晕散与铁锈斑柔焦；釉面棕眼；左上方 3500K 掠射高光；现代调色，细腻颗粒。
```
**末帧 / 匹配规格 End frame**
```text
t=2.83 s: the rim band of plum blossoms runs across frame at y~0.45, three whole five-petal blossoms sharp at centre, the lip edge a clean line at y~0.30, glaze specular at upper left; still.
```
**图生视频运动 Motion · EN**
```text
Camera: slider glides along the crack toward the rim (<=2 cm/s; ~4 cm in 1.8 s), focus tracking the crack; 0.22 s the focus plane reaches the rim band; 0.22-1.84 s it travels along the band past the blossoms; 1.84 s eases to a stop on a whole stretch of the rim with the lip edge in frame; locked to the end. 24 fps. Must NOT move: the shard; no rack beyond the band.
```
**图生视频运动 Motion · ZH**
```text
摄影机：滑轨沿裂纹滑向碗沿（≤2 cm/s；1.8 秒约 4 cm），焦点跟随裂纹；0.22 秒焦平面到达口沿纹带；0.22–1.84 秒沿纹带经过一朵朵梅花；1.84 秒缓停在一段完整的碗沿上，口沿边缘在画内；此后锁定到结束。24 fps。不得移动：残片；焦点不越过纹带。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.83 | Single generation. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Pattern lock: one continuous flowering plum branch, 16 five-petal blossoms alternating with buds, cracks never through a blossom. T5.6-T8 depth, no plastic sharpening. Grade CT_MODERN. Sync: f1407 (58.64 '春色') focus on the band; f1446 (60.26 '沿') stop.

**连续性锚点 match_to**：The rim plum band is the canonical pattern for S015/S016 and later S019, S041, S066.

**负面提示词（追加在全局负面之后）**
```text
crack through a blossom, scrolling peony, lotus or dragon pattern, crisp machine-printed decoration, mirror-gloss glaze, oversaturated cobalt, fake cracks forming characters, rack past the band, plastic hyper-sharp AI macro, focus breathing, gloves or fingers in frame
```

#### S014 · 01:01:06 – 01:04:01 · 2.792 s（f1470–f1537）

| 项目 | 内容 |
|---|---|
| 歌词 | 我读懂了年代 |
| 段落 / 简报章节 / 时代 / 场景 | PRE1 预副歌 / 三 / 现代 / `restoration_lab` |
| 景别 / 焦段 / 速度 | MCU / 75 mm / 24 |
| 入点转场 | 切 0 帧 — 由物到人 |
| 同步点 | 62.28 s “读懂”：她翻过残片看圈足；62.82 s “年代”：笔落在登记簿上 |
| 参考图 refs | `CHAR_RESTORER` `PROP_SHARDS` `PROP_GLOVES` `PROP_COAT` `PROP_LEDGER` `LOC_LAB` |
| 调色 | 现代夜间 |
| 生成时长 | 2.792 s |

**文生视频提示词 T2V · EN**
```text
Medium close-up, 75mm anamorphic, eye level, slightly to the side; locked with a faint push-in; 24 fps. At an oak conservation bench by a dark arched window at frame right: RESTORER, a ~28-year-old East Asian woman, soft oval face, straight natural brows, inner double eyelids, natural pale lips, a tiny light-brown mole below the outer corner of her LEFT eye, faint tiredness, black-brown hair in a loose low ponytail with two or three strands at the right temple, a head-band magnifier lowered over her eyes, charcoal wool melton coat with the middle horn button fastened and a small rubbed worn spot on the outer side of the LEFT cuff, thin warm-white cotton gloves. At 1.0 s she tilts a glued blue-and-white shard section up to the magnifier, reading the unglazed foot ring: orange-brown kiln flush, kiln grit, glaze pinholes; almost at once, at 1.6 s, her right hand sets a pencil to the open deep-green ledger at the bottom edge and writes a date, a flicker of professional certainty at the corner of her mouth. Ledger out of focus and illegible. Light: 3500K bench lamp from upper left; cool harbour night through the window; a distant 2700K shelf lamp. Natural skin texture. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中近景，75mm 变形镜头，平视略侧；锁定，轻微推进；24 fps。在画右一扇黑暗圆拱窗下的橡木修复台前：修复师——约 28 岁东亚女性，鹅蛋脸，自然平直的眉，内双眼皮，唇色自然偏淡，左眼外眼角下方一颗极小的浅褐色痣，眼下有熬夜的淡青，黑褐色头发松松扎成低马尾，右侧太阳穴落下两三缕碎发，头戴式放大镜已放下到眼前，穿深灰羊毛呢外套、扣着中间一粒牛角扣、左袖口外侧一块小磨损，戴略暖白的薄棉手套。1.0 秒，她把一块已粘合的青花残片翻起凑到放大镜前，看圈足露胎处：火石红的橙褐、粘着的窑砂、釉面的针孔；几乎立刻，1.6 秒，她的右手把铅笔落在画面下缘摊开的深绿布面登记簿上，写下一个日期，嘴角掠过一点职业性的笃定。登记簿在焦外、不可读。光：3500K 台灯来自左上；窗外港口夜色的冷光；远处书架上一盏 2700K 小灯。自然皮肤质感。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0: MCU, RESTORER leaning toward the bench at frame centre-left, facing frame right toward the dark arched window; head magnifier down; her left gloved hand lifting a glued shard section, the small worn spot on the outer little-finger side of her LEFT coat cuff visible; her right hand holding a pencil above the open deep-green cloth ledger at the bottom edge; mole under the LEFT eye, loose low ponytail, right-temple strands, charcoal coat with the middle button done; 3500K lamp from upper left (4:1), harbour night cool through the window, a 2700K shelf-lamp point far left; modern grade, fine grain.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧：中近景，修复师在画面中偏左、俯身向台面，面朝画右的黑暗圆拱窗；头戴放大镜已放下；戴手套的左手正托起一块已粘合的残片，外套左袖口外侧小指一侧的小磨损可见；右手握铅笔悬在画面下缘摊开的深绿布面登记簿上方；左眼下小痣、低马尾、右侧碎发、深灰外套扣着中间一粒扣；左上方 3500K 台灯（光比 4:1），窗外港口夜色冷光，画左远处一点 2700K 书架小灯；现代调色，细腻颗粒。
```
**末帧 / 匹配规格 End frame**
```text
—（无专门末帧规格；按运动提示词自然结束）
```
**图生视频运动 Motion · EN**
```text
Camera: locked, faint push-in (~2% over 2.8 s); 24 fps. Subject: 0-1.0 s she tilts the shard toward the magnifier; 1.03 s turns it to show the unglazed foot ring and reads it in one glance; 1.57 s her right hand sets the pencil to the ledger and writes a short date in two quick strokes; a small sure tightening at the corner of her mouth. Must NOT move: the lamp, ledger position; no head turn toward camera.
```
**图生视频运动 Motion · ZH**
```text
摄影机：锁定，轻微推进（2.8 秒内约 2%）；24 fps。主体：0–1.0 秒她把残片斜向放大镜；1.03 秒翻转露出圈足露胎处，一眼读懂；1.57 秒右手把铅笔落在登记簿上，两笔快速写下日期；嘴角一点笃定的收紧。不得移动：台灯、登记簿位置；不转头看镜头。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.79 | Single generation. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Ledger must stay out of focus and illegible (replace any in-focus AI script with a soft plate). Face locks: mole under LEFT eye, right-temple strands, no make-up; skin hue 18-32 degrees, P17 base. Grade CT_MODERN, lab ratio 4:1, grain 1.0. Sync: f1495 (62.28 '读懂') foot ring turned to the loupe; f1508 (62.82 '年代') pencil down.

**连续性锚点 match_to**：Lab geography (lamp upper left, window right, she faces the window) as in S012/S015. The ledger returns in S050/S053.

**负面提示词（追加在全局负面之后）**
```text
readable handwriting or numbers in focus, AI pseudo-script, ink fountain pen, reign mark on the foot, make-up, jewellery, watch, tidy re-tied hair, mole on the right side, bare hands, smiling broadly, looking at camera, beauty filter, magnifier pushed up while reading, ring light, cold fluorescent light
```

#### S015 · 01:04:01 – 01:05:06 · 1.208 s（f1537–f1566）

| 项目 | 内容 |
|---|---|
| 歌词 | 我读懂了年代 |
| 段落 / 简报章节 / 时代 / 场景 | PRE1 预副歌 / 三 / 现代 / `restoration_lab` |
| 景别 / 焦段 / 速度 | INSERT / 100 mm / 24 |
| 入点转场 | 切 0 帧 — 她的目光 → 她手下的碗（由人到物，在“代”的长音里） |
| 同步点 | 64.43 s “代”长音中：口沿圆弧居中、静止 |
| 参考图 refs | `PROP_BOWL` `PROP_SHARDS` `LOC_LAB` |
| 调色 | 现代夜间 |
| 生成时长 | 1.208 s |

**文生视频提示词 T2V · EN**
```text
Insert, 100mm macro, near-overhead about 15 degrees from vertical, tilted from the near side so the outer rim band reads along the near lip; locked; 24 fps; 1.2 s, nearly still. In a tray of fine white conservation sand under a 3500K bench lamp, a folk-kiln blue-and-white flared bowl stands mostly re-assembled from shards: hairline grey-white joins, the fine line inside below the lip, and at dead centre, 50% across and 52% down, the double circle holding a single five-petal plum blossom, its heart the deepest cobalt. The rim is a near-perfect circle about 80% of frame height; along the near lip the outer band of one continuous flowering plum branch reads unbroken, the joins passing only between blossoms, and just below it the top of the cracked-ice lattice window motif; the boat-and-crescent side faces the top of frame. At frame right, between the two scenes, a 2.5 by 3 cm piece of the wall is missing, a small dark gap showing sand. Crisp sand grains; one soft specular on the glaze from upper left. At 0.4 s everything is centred and still. Glaze #EDF1EF, cobalt #2B4A8B, no reign mark. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
插入镜头，100mm 微距，接近正俯、与垂直约成 15°，从近侧倾斜以便近侧口沿上的外口沿纹带可读；锁定；24 fps；1.2 秒，几乎静止。3500K 台灯下一盘细白的修复沙里，一只民窑青花撇口碗已由残片粘合大半，立在沙中：灰白的细接缝，口沿内一道细弦线，正中心（横向 50%、纵向 52%）是双圈里的一朵五瓣梅花，花心钴料积色最深。碗口是近乎正圆的一圈，约占画面高 80%；近侧口沿上，那一枝连绵不断的折枝梅纹带完整无缺，接缝只从花与花之间穿过，纹带下方露出冰裂纹窗格纹样的上缘；画小船与新月的 A 面朝向画面上方。画右，两面纹样之间，碗壁缺了约 2.5×3 厘米的一块，是一个露出沙子的小暗口。沙粒质感清晰；釉面左上方一点柔和高光。0.4 秒时一切居中、静止。釉白 #EDF1EF，钴蓝 #2B4A8B，无底款。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still (frame 0 and end frame identical): near-overhead, ~15 degrees from vertical tilted from the 6 o'clock side; the re-assembled bowl in white sand; centre blossom at (0.50,0.52); rim circle diameter ~80% of frame height; outer plum band visible along the near (lower) lip with the cracked-ice window motif just below it; side A (boat and crescent) toward 12 o'clock; missing 2.5x3 cm gap at 3 o'clock (frame right) showing sand; soft specular upper left; 3500K lamp; modern grade, fine grain.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧（第 0 帧与末帧相同）：接近正俯，与垂直约成 15°，从 6 点钟一侧倾斜；白沙里粘合大半的碗；碗心梅花在 (0.50,0.52)；碗口圆直径约占画面高 80%；近侧（下方）口沿上可见外口沿折枝梅纹带，纹带下方露出冰裂纹窗格纹样；A 面（小船与新月）朝 12 点；3 点钟（画右）缺失 2.5×3 cm、露出沙子；左上方一点柔和高光；3500K 台灯；现代调色，细腻颗粒。
```
**末帧 / 匹配规格 End frame**
```text
t=1.21 s, T07 A-frame for S016: rim circle centred (0.50,0.52), diameter ~80% of frame height, ~15 degrees from vertical tilted from the 6 o'clock side; near-lip plum band and the top of the side-B window motif readable at 6 o'clock; side A toward 12 o'clock; chopstick-free; specular at upper left (0.36,0.24) - S016 must reproduce rim position, size, ellipse and the specular position within +/-3%.
```
**图生视频运动 Motion · EN**
```text
Locked camera; 24 fps; nothing moves - no breathing drift, no light flicker. 0.39 s (the long '代') the frame is fully settled. Must NOT move: bowl, sand, camera, light.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定；24 fps；画面中没有任何运动——没有呼吸漂移，没有光的闪动。0.39 秒（“代”的长音）画面完全稳定。不得移动：碗、沙、摄影机、光。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 1.21 | Single still-like generation (or a still with 1.21 s of grain). |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：This is the T07 A-frame: render at the exact framing used for S016's start (lock the camera tilt, ellipse and specular). A true 90-degree view cannot show the outer plum band, hence the 15-degree tilt - see director note. Grade CT_MODERN, grain 1.0 (animated). Sync: f1546 (64.43, long '代') settled; cut at f1566 (65.25).

**连续性锚点 match_to**：T07 A-frame -> S016 frame 0 (cross-era composition + pattern match: restored rim -> intact rim).

**负面提示词（追加在全局负面之后）**
```text
bowl off-centre or oval from perspective, rim circle smaller or larger than 80% of frame height, missing piece filled in, cracks through blossoms, rice or water in the bowl, glue blobs, tools or gloves in frame, pure 90-degree view hiding the outer band, any camera movement, plastic gloss
```

#### S016 · 01:05:06 – 01:07:00 · 1.750 s（f1566–f1608）

| 项目 | 内容 |
|---|---|
| 歌词 | 我读懂了年代／却读不懂／你的失眠 |
| 段落 / 简报章节 / 时代 / 场景 | PRE1 预副歌 / 三 / 旧日家中 / `old_home` |
| 景别 / 焦段 / 速度 | CU / 50 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 相似构图 + 纹样：修复后的口沿圆弧 → 旧日完整的口沿（同纹样、同画面位置、同比例、同曲率；跨时代，T07） |
| 同步点 | 65.36 s “却读不懂”：碗沿完成匹配；66.32 s “失”：后拉露出空着的长凳 |
| 参考图 refs | `CHAR_WIFE` `PROP_BOWL` `PROP_CANDLE` `LOC_HOME` |
| 调色 | 旧日家中 |
| 生成时长 | 1.75 s |

**文生视频提示词 T2V · EN**
```text
Close-up, 50mm anamorphic; the first frame repeats the previous bowl exactly, about 15 degrees from vertical, rim circle centred at 50% across and 52% down, about 80% of frame height; then a slow rise and gentle tilt to about 60 degrees (about 35 cm of travel in 1.75 s) with focus easing back; 24 fps. A 17th-century coastal stone house at night: the same blue-and-white bowl, now whole with fresh glaze, its outer band of flowering plum unbroken, full of cold white rice, top grains dry and translucent, absolutely no steam, a pair of untouched bamboo chopsticks laid across the rim. At 0.1 s the rim match completes; at 1.1 s the rise reveals the bowl on a dark camphor table before the empty bench at frame right; an ivory candle, 11 cm with one wax drip, in a brass candlestick at table centre; at the left frame edge rest the folded slender hands of WIFE, a ~30-year-old woman of that era in a washed pale-blue cotton jacket, a plain thin, slightly tarnished silver bangle on her LEFT wrist; her face stays out of frame. Light: 1850K candle low and warm; cold moonlight through a cracked-ice lattice from frame right. Old-home grade: candle-warm interior against cool lattice moonlight, blacks slightly lifted; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
近景，50mm 变形镜头；第一帧与上一镜的碗完全一致——与垂直约成 15°，碗口圆居中于横向 50%、纵向 52%，约占画面高 80%；随后缓慢升起并轻轻俯仰到约 60°（1.75 秒内移动约 35 厘米），焦点随之后移；24 fps。17 世纪海边石屋的夜里：同一只青花碗，此刻完整、釉光新鲜，外口沿折枝梅纹带完好，盛着一碗早已凉透的白饭——表面米粒发干、半透明，绝对没有一丝热气——一双没动过的竹筷横放在碗口。0.1 秒碗沿匹配完成；1.1 秒升起后露出：碗放在深色樟木方桌上、画右那条空着的长凳前；桌子中间一只旧铜烛台插着一支象牙白蜡烛，11 厘米，一道蜡泪；画左边缘，是等待的人叠放在桌沿的纤细双手——她是那个时代约 30 岁的妇人，穿洗旧的浅蓝粗棉短袄，左手腕一只微微氧化的素银细镯；她的脸始终在画外。光：1850K 烛光低位暖光；画右冰裂纹窗格透入冷月光。旧日家中调色：烛光暖色的室内对窗格透入的冷月光，黑位略抬；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0 (T07 B-frame): identical framing to S015's last frame - the same bowl whole, rim circle centred (0.50,0.52), ~80% of frame height, ~15 degrees from vertical from the 6 o'clock side; near-lip plum band unbroken; bowl full of cold white rice, top grains dry and translucent, no steam; bamboo chopsticks across the rim from lower left to upper right; candle-warm light from left-centre, low; cold lattice-patterned moonlight from frame right across the rice; specular at (0.36,0.24); dark camphor table at the edges; home grade.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧（T07 B 帧）：与 S015 末帧构图完全一致——同一只碗完整，碗口圆居中 (0.50,0.52)，约占画面高 80%，从 6 点钟一侧与垂直约成 15°；近侧口沿折枝梅纹带完好；碗里盛满凉白饭，表面米粒发干、半透明，无热气；竹筷由左下到右上横在碗口；低位烛光暖光来自画左偏中；画右冰裂纹窗格的冷月光影落在饭上；高光在 (0.36,0.24)；画边是深色樟木桌面；家中调色。
```
**末帧 / 匹配规格 End frame**
```text
t=1.75 s: ~60-degree high angle; bowl and chopsticks at the right third (0.68,0.60) before the edge of the empty bench at frame right; brass candlestick with an 11 cm ivory candle (one drip) at (0.46,0.40); WIFE's folded hands with the silver bangle on the LEFT wrist at the left edge (0.06,0.62); cracked-ice lattice shadows across the table from the right; no face.
```
**图生视频运动 Motion · EN**
```text
Camera: from the matched frame, slow rise of ~35 cm with a tilt from ~75 to ~60 degrees down and a slight drift left over 1.75 s (constant after a 6-frame ease-in); focus eases from the rim to the table plane; 24 fps. Subject: still life - candle flame breathes slowly; her hands rest motionless; no steam from the rice. Must NOT move: bowl, chopsticks, rice, hands, bench.
```
**图生视频运动 Motion · ZH**
```text
摄影机：从匹配帧开始，1.75 秒内缓慢升起约 35 cm，俯角由约 75° 收到约 60°，并略向左移（6 帧缓入后匀速）；焦点从碗沿后移到桌面；24 fps。主体：静物——烛焰缓慢呼吸；她的手静止；饭没有热气。不得移动：碗、筷子、饭、手、长凳。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 1.75 | Single generation; I2V from the T07 B-frame keyframe. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Match cut T07: overlay S015's end frame; rim circle position/size/ellipse within +/-3%. Bowl must be the canonical plum-band bowl. Absolutely no steam (M4 lock). Candle state B: 11 cm, one drip. WIFE's face never in frame. Grade CT_HOME, blacks +1%, grain 1.15, halation 0.5 on the flame. Sync: f1569 (65.36 '却读不懂') match completes; f1592 (66.32 '失') empty bench revealed.

**连续性锚点 match_to**：Start = T07 B-frame from S015. The same room continues inside the glass in S017 (candle B -> C).

**负面提示词（追加在全局负面之后）**
```text
steam or vapour from the rice, warm fresh rice, eaten rice, chopsticks in the bowl or held, a person on the right bench, her face in frame, bangle on the right wrist, gold or jade bangle, candle taller or shorter than 11 cm, electric light, red lanterns, incense, fast crane swoop, bowl pattern different from the plum-band canonical bowl
```

#### S017 · 01:07:00 – 01:10:13 · 3.542 s（f1608–f1693）

| 项目 | 内容 |
|---|---|
| 歌词 | 你的失眠 |
| 段落 / 简报章节 / 时代 / 场景 | PRE1 预副歌 / 三 / 多时代 / `old_home` |
| 景别 / 焦段 / 速度 | MS / 75 mm / 24 |
| 入点转场 | 反射转场 0 帧 — 同一个家：由直接所见 → 修复室窗玻璃里的倒影（她在今天望着它；T09） |
| 同步点 | 67.0 s 起幅：玻璃上修复师低头的淡倒影；67.8 s 焦点转移完成：反射深处的旧日家中；68.5 s 24 帧叠化中点（68.0–69.0）：蜡烛 B→C，窗格影移过一格；69.6 s 人声收束：她的肩轻轻起伏 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_WIFE` `PROP_BOWL` `PROP_CANDLE` `PROP_COAT` `LOC_LAB` `LOC_HOME` |
| 调色 | 多时代/过渡（见提示词） |
| 生成时长 | 3.542 s |

**文生视频提示词 T2V · EN**
```text
Medium shot, 75mm anamorphic, eye level, square to a dark arched six-over-six sash window of a museum conservation studio at night; locked; 24 fps. First frame: on the glass, a faint reflection of RESTORER, a ~28-year-old East Asian woman conservator with a loose low ponytail and charcoal wool coat, head bowed over her work, lit by a 3500K lamp off frame left. At 0.8 s focus pulls slowly through her reflection into the glass's mirror depth: an old coastal stone house at night, where WIFE, a ~30-year-old woman in a washed pale-blue cotton jacket, hair in a low bun with a plain wooden pin, a thin silver bangle on her LEFT wrist, sits upright on the left bench beside a single candle; the right bench is empty, a bowl of untouched rice and chopsticks before it. Her face stays unresolved, broken by candle backlight and cracked-ice lattice shadow. From 1.0 to 2.0 s a soft time-passing dissolve inside the reflection only: the candle burns from 11 cm to 6 cm, wax pooling, the lattice shadow slides one cell, the rice unchanged. At 2.6 s her shoulders rise and fall once. The restorer's reflection stays, darker than the candlelight. Glass in the modern night grade; inside the reflection the old-home grade, candle-warm against cool moonlight; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中景，75mm 变形镜头，平视，正对夜间博物馆修复室一扇六格对六格的深色圆拱木窗；锁定；24 fps。第一帧：玻璃上淡淡映着修复师——约 28 岁东亚女性文物修复师，松松的低马尾，深灰羊毛呢外套——低头工作的轮廓，很暗，被画外左上方的 3500K 台灯照着。0.8 秒，焦点缓缓穿过她的倒影，进入玻璃的镜像深处：夜里一座海边旧石屋，等待的人——约 30 岁的妇人，穿洗旧的浅蓝粗棉短袄，低髻插一支素面木簪，左腕一只素银细镯——挺直地坐在画左的长凳上，身旁一支蜡烛；画右的长凳空着，凳前一碗没动过的饭和一双竹筷。她的脸始终看不清——被烛光侧逆与冰裂纹窗格的影子切碎，永不清晰。1.0 到 2.0 秒，只在倒影之内做一次柔和的时间流逝叠化：蜡烛从 11 厘米烧到 6 厘米，蜡泪堆在接蜡盘里，窗格的影子在桌上移过一格，饭始终没动。2.6 秒，她的肩轻轻起伏一次。修复师的倒影一直留在玻璃上，暗于烛火。玻璃为现代夜间调色；倒影里是旧日家中调色——烛光暖色对冷月光；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0: MS square to one section of the lab's dark arched six-over-six sash window at night; white-painted muntins form a grid; on the glass a faint reflection of RESTORER, head bowed over her bench (low ponytail, charcoal coat), dim and warm from a 3500K lamp off frame upper left, at (0.62,0.40); deeper in the glass, out of focus, a warm candle point at (0.42,0.46) and dark shapes of a room; harbour lights beyond very dim; focus on the reflection plane; modern grade, fine grain.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧：正对修复室深色六格对六格圆拱窗一段的中景；白漆窗棂组成方格；玻璃上淡淡映着修复师低头伏案的轮廓（低马尾、深灰外套），位于 (0.62,0.40)，被画外左上方 3500K 台灯照得暗而暖；玻璃更深处，虚焦的一点暖色烛光在 (0.42,0.46)，以及一个房间的暗影；窗外港口灯极暗；焦点在倒影平面；现代调色，细腻颗粒。
```
**末帧 / 匹配规格 End frame**
```text
t=3.54 s: focus deep in the mirror; the old home in the glass: WIFE upright on the left bench at (0.30,0.55), face unresolved; candle now 6 cm with wax pooled, flame at (0.42,0.46) - suggested light anchor for S018's lit lab window; empty bench at right with the bowl and chopsticks; lattice shadow advanced one cell; the restorer's faint reflection still on the glass at (0.62,0.40), darker than the candle.
```
**图生视频运动 Motion · EN**
```text
Camera locked; 24 fps. 0-0.8 s focus racks slowly (>=1 beat) from her reflection to the old home in mirror depth; her reflection softens but stays. 1.0-2.0 s a 24-frame dissolve inside the reflection layer only: candle 11 cm -> 6 cm, lattice shadow one cell across the table, rice unchanged. 2.6 s the wife's shoulders rise and fall once, real speed. Must NOT move: window muntins, camera; the restorer's reflection keeps only her faint working motion; no global dissolve of the window layer.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定；24 fps。0–0.8 秒焦点缓慢（≥1 拍）从她的倒影移到镜像深处的旧日家中；她的倒影变虚但仍在。1.0–2.0 秒只在反射层内做 24 帧叠化：蜡烛 11 cm → 6 cm，窗格影在桌面移过一格，饭不变。2.6 秒等待的人肩膀以真实速度起伏一次。不得移动：窗棂、摄影机；修复师的倒影只保留轻微的工作动作；窗户层不做整体叠化。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.0 | Seg 1: plates A + B1 (candle state B). Generate B1 locked for 0-2.0 s. |
| 1.0 | 3.54 | Seg 2: plates A + B2 (candle state C, lattice one cell on, shoulders at 2.6 s). Generate B2 locked for 0.6-3.54 s; B1->B2 dissolve 1.0-2.0 s (f1632-f1656). |

**分层与合成 Plates & compositing**

- **Plate A**：Modern foreground (LOC_LAB): the arched window's glass and white muntins, dark, with RESTORER's faint reflection bowed over the bench (generated as a reflection layer or from a camera mirrored across the glass); harbour lights beyond very dim.
- **Plate B1**：Old home interior (LOC_HOME), locked: candle state B (11 cm, one drip), WIFE upright on the left bench, face unresolved, empty right bench with the bowl of cold rice and chopsticks, cracked-ice lattice moonlight from the right; generated in the on-screen layout.
- **Plate B2**：Same locked frame: candle state C (6 cm, wax pooled in the pan), lattice shadow advanced one cell; her shoulders rise and fall once at 2.6 s.
- **合成 / 速度 / 调色 / 同步（post）**：Composite B inside the glass as a reflection: screen at ~45-55% so the old home reads brighter than her reflection (bible 8.3-6); suppress A's transmitted harbour ~1.5 stops so the glass reads as a mirror; muntins and glass waviness over B; defocus B by depth at the start, rack 0-0.8 s while A's reflection softens. B1 -> B2 24-frame dissolve 1.0-2.0 s on B only. MP-1: B is composited as seen (wife screen-left, empty bench screen-right, bangle on her LEFT wrist, as in S016); the restorer's own reflection in A is a true mirror image. WIFE's face stays unresolved. Grade A CT_MODERN, B CT_HOME attenuated; grain unified. Sync: f1608 (67.0) start; f1627 (67.8) rack complete; f1644 (68.5) dissolve midpoint; f1670 (69.6) shoulders; cut at f1693 (70.54) to S018.

**连续性锚点 match_to**：Continues S016's room inside the lab window (T09 as revised by V22: candle B -> C). Light transition into S018 (candle point in the glass -> the lit lab window seen from outside; shared anchor ~(0.42,0.46)). Unresolved-face lock shared with S024-S026.

**负面提示词（追加在全局负面之后）**
```text
wife's face sharp or clearly lit, wife looking at camera, a person on the right bench, steam from the rice, glass window panes inside the 17th-century house, ghost figure standing in the lab, global dissolve of the window layer, the restorer's reflection brighter than the candle, flicker during the dissolve, candle growing taller, electric light in the old house, crying, slow-motion shoulders
```

### 副歌一 CH1

#### S018 · 01:10:13 – 01:13:11 · 2.917 s（f1693–f1763）

| 项目 | 内容 |
|---|---|
| 歌词 | 千年啊／不过无数个今晚 |
| 段落 / 简报章节 / 时代 / 场景 | CH1 副歌一 / 四 / 现代 / `harbor_eras` |
| 景别 / 焦段 / 速度 | EWS / 28 mm / 24 |
| 入点转场 | 光线转场 0 帧 — S017 玻璃里的烛光 → 修复室窗中的台灯光（同一扇窗：由室内看玻璃 → 由室外看窗；暗处一点亮窗的相似构图） |
| 同步点 | 70.7 s “千年啊”：上升开始；73.1 s “今”：港城灯火铺满画面；73.35 s 月亮与聚拢的云入画（接 S019 的天空） |
| 参考图 refs | `CHAR_RESTORER` `LOC_LAB` `LOC_HARBOR` |
| 调色 | 现代夜间 |
| 生成时长 | 2.917 s |

**文生视频提示词 T2V · EN**
```text
Extreme wide aerial establishing shot, 28 mm spherical wide cropped to 2.39:1 anamorphic frame, night, present day. Start: 4 m above dark harbour water, 30 m south of a converted 1880s harbour customs house (granite plinth, red-brick walls with patchy lime render, round-arched windows, glazed upper arcade faintly silver). Only one ground-floor arched timber sash window near the east corner glows warm 3500K; inside it, tiny and soft, the RESTORER (a ~28-year-old East Asian woman conservator in a charcoal wool coat, low loose ponytail) bends over her bench lamp. Camera: one slow, steady heavy-lift crane-up and pull-back, 12-frame ease-in, no yaw, no roll: 0-1.2 s the facade and quay sink while black water with silver moon-sheen fills the lower frame; 1.2-2.5 s the roofline passes and a fictional hillside harbour city of countless small warm windows spreads behind; at 2.56 s the lights fill the frame and her window is one among thousands; at 2.8 s gathering clouds and a veiled waning-gibbous moon enter the top third at upper right. Light: cool silver moonlight #C8D2DB on stone and water, window points #E2A458 desaturated, sky #0E1B30 to #1A2D4A. Deep focus, photoreal. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
极远景航拍建立镜头，28mm 球面广角裁为 2.39:1 宽银幕画幅，当下的夜。起幅：摄影机在漆黑港湾水面上方 4 米、旧海关大楼（花岗岩基座、斑驳石灰抹面的红砖墙、圆拱窗、二层玻璃封闭的外廊泛着淡淡银光）以南 30 米处。整栋楼只有一层东端转角附近的一扇圆拱木窗亮着 3500K 暖光；窗里很小、很柔地，修复师（约28岁东亚女性文物修复师，深灰呢外套，低马尾）正俯在台灯下的工作台前。运镜：一次缓慢、稳定的重载摇臂上升并后拉，起步 12 帧缓入，不偏航、不横滚：0–1.2 秒大楼立面与码头向下沉，画面下部是泛着银色月光的黑色水面；1.2–2.5 秒屋脊线掠过，背后一座虚构的依山港城展开，无数扇小小的暖窗；2.56 秒灯火铺满画面，她那扇窗成了千万盏中的一盏；2.8 秒聚拢的云与一轮被薄云遮住的亏凸月从画面上三分之一的右上方入画。光：冷银月光 #C8D2DB 落在石面与水面，窗灯为压低饱和的暖点 #E2A458，天空 #0E1B30 至 #1A2D4A。全景深，照片级真实。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Night, 2.39:1, 28 mm wide, camera 4 m above harbour water 30 m south of the customs house, level, facing north. The long dark south facade (granite plinth, red brick with lime patches, round-arched windows) spans the frame at mid-height; a single ground-floor arched six-over-six sash window with semicircular fanlight glows warm 3500K, centred at (0.42, 0.46), about 14% of frame height (the building's SE corner just right of it at x 0.55, quay and city lights beyond); inside, a tiny soft silhouette of the restorer bent over a bench lamp. Upper glazed arcade faintly silver with moonlight. Quay edge, iron bollards and black water with silver ripples in the lower third. Deep navy sky only as a thin band at the top. Fine grain, shadows with detail, motivated light only.
```
**首帧关键帧 Keyframe · ZH**
```text
夜，2.39:1，28mm 广角，摄影机在旧海关大楼以南 30 米、水面上方 4 米，水平朝北。漆黑的南立面（花岗岩基座、带石灰斑块的红砖、圆拱窗）横贯画面中部；只有一层一扇六格对六格、带半圆扇形亮子的圆拱木窗亮着 3500K 暖光，中心位于 (0.42, 0.46)，约占画面高度 14%（大楼东南转角就在它右侧 x 0.55 处，再往右是码头与城市灯火）；窗内是修复师俯在台灯前的极小、柔和的剪影。二层玻璃外廊被月光映出淡淡银色。画面下三分之一是码头边沿、铸铁系缆桩与泛着银色涟漪的黑水。深蓝夜空只在顶部留一条细带。细颗粒，暗部有层次，只有有来源的光。
```
**末帧 / 匹配规格 End frame**
```text
Camera ~40 m high, tilted up ~15 degrees: top third (y 0-0.33) is sky with gathering grey-blue clouds, silver edges, the waning-gibbous moon veiled behind thin cloud at (0.80, 0.14); lower two-thirds a hillside harbour city of countless small warm windows; the customs-house roof a dark band at the bottom with her window one tiny warm point at (0.44, 0.88). Cloud shapes and moon-glow position must be identical to the upper third of S019's first frame (shared sky plate B).
```
**图生视频运动 Motion · EN**
```text
Heavy-lift aerial/crane: vertical rise ~35 m with pull-back ~20 m and progressive tilt-up ~15 degrees over 2.92 s at 24 fps; ease-in over the first 12 frames, then constant speed, no ease-out (cut on motion). 0.16 s ('千年啊') rise begins; 2.56 s ('今') city lights fill the frame; 2.81 s clouds and veiled moon enter the top. Clouds drift slowly right to left; city lights steady, no flicker, no traffic streaks. Must NOT move or change: yaw, roll, swooping acceleration after 1 s, the single lit lab window, a sharp or large moon disc.
```
**图生视频运动 Motion · ZH**
```text
重载航拍/摇臂：2.92 秒内垂直上升约 35 米、后拉约 20 米，并逐渐上仰约 15°，24 fps；前 12 帧缓入，之后匀速，不缓出（在运动中切出）。0.16 秒（“千年啊”）开始上升；2.56 秒（“今”）港城灯火铺满画面；2.81 秒云与被遮住的月亮从上方入画。云由画右向画左缓慢飘移；城市灯光稳定，不闪烁，无车流光轨。不得出现：偏航、横滚、1 秒后加速俯冲；修复室那扇唯一亮着的窗不得改变；月亮不得清晰或过大。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.92 | single generation, request 4 s (0.5 s head + 0.5 s tail handle); if the model cannot hold the 6x scale change, split at 1.2 s where the dark cornice crosses frame (plate A facade/quay, plate A2 city) and hide the join in the cornice |

**分层与合成 Plates & compositing**

- **Plate A**：Aerial pull-back plate: customs-house south facade with the one lit lab window, quay, harbour water, hillside city of lit windows; sky left clean/neutral for replacement
- **Plate B**：Shared sky plate (also used in S019 top third and as the moon element for S023): gathering clouds with silver edges, canonical waning-gibbous moon ~90% lit, same texture and apparent size as every era, veiled by thin cloud at (0.80, 0.14) of the end frame
- **合成 / 速度 / 调色 / 同步（post）**：Comp sky plate B into the top third from 2.5 s with a soft skyline mask, cloud density over the moon >=60% so the disc never reads sharp. Grade CT_MODERN. Light transition from S017: S017's 1850K candle glow in the window reflection hands to the 3500K lab window at the same frame position, bridged in the grade over 12 frames. Geography cheat (flagged to director): bible night timeline puts the 02:10 moon due south, behind this north-facing camera; the moon is cheated to upper-right. Cut on motion at 73.458 s.

**连续性锚点 match_to**：IN: S017 end (gen_g1 anchor) - candle flame in the lab-window reflection at (0.42, 0.46) -> S018 first frame lit lab window centred at (0.42, 0.46) (light point to light point, same window seen from outside). OUT: S018 end sky band (cloud shapes, veiled moon at 0.80, 0.14) = upper third of S019 (shared plate B).

**负面提示词（追加在全局负面之后）**
```text
recognisable real skyline or landmark, readable signage, neon text, logos on buildings or ships, fast drone swoop, fly-through, banking roll, yaw spin, tilted horizon, sharp or oversized moon, starfield, orange light-pollution haze, fireworks, blue streak flare, more than one lit window on the customs house ground floor, people in sharp detail, daylight, traffic light trails
```

#### S019 · 01:13:11 – 01:15:01 · 1.583 s（f1763–f1801）

| 项目 | 内容 |
|---|---|
| 歌词 | 不过无数个今晚／有人等一场雨 |
| 段落 / 简报章节 / 时代 / 场景 | CH1 副歌一 / 四 / 旧日家中 / `old_home` |
| 景别 / 焦段 / 速度 | WS / 32 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 相似构图：S018 结尾的月亮与聚云 → 本镜画面上三分之一同一片天（天空位置一致；跨时代） |
| 同步点 | 74.18 s “等”：碗底落在石阶上；74.6 s “场雨”：掌心离开碗沿 |
| 参考图 refs | `CHAR_WIFE` `PROP_BOWL` `LOC_HOME` |
| 调色 | 旧日家中 |
| 生成时长 | 1.583 s |

**文生视频提示词 T2V · EN**
```text
Wide shot, 32 mm anamorphic, locked-off tripod, eye level 1.5 m, exterior of an early-17th-century coastal granite stone house at night. Upper third is sky: gathering grey-blue clouds, a veiled waning-gibbous moon glowing at upper right, its light dimming and returning once as cloud drifts. Below: grey-tiled eaves overhanging 1 m with no gutter, rough-dressed granite block wall with lime pointing, a timber door at frame-left half open with a faint warm 1850K candle glow from inside, an unlit stone niche beside it, one granite step at lower-left, stone yard, low wall, dark sea at right. The WIFE (slender ~30-year-old woman, black hair in a low bun with a plain wooden hairpin, washed pale-blue cotton jacket #7D9CBB, dark indigo-black skirt, thin slightly tarnished silver bangle on her LEFT wrist, face kept in eave shadow, never resolved) is already bending; with her right hand she sets an empty folk-kiln blue-and-white bowl, rim band of one continuous plum branch with 16 small blossoms, at the outer edge of the step under the eaves' drip line: its foot touches stone at 0.72 s; her palm leaves the rim at 1.14 s and pauses. Cool silver moonlight from upper right, deep focus, photoreal. Old-home grade: candle-warm interior against cool lattice moonlight, blacks slightly lifted; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
全景，32mm 变形宽银幕镜头，三脚架完全锁定，平视、镜头高 1.5 米；17 世纪初海边花岗岩石屋外景，夜。画面上三分之一是天空：灰蓝色的云正在聚拢，一轮被云遮住的亏凸月在右上方发出微光，云飘过时月光暗下去又亮回来一次。下方：出挑约 1 米、没有檐沟的青灰瓦屋檐，石灰勾缝的粗凿花岗岩条石墙，画左一扇半开的木门，门内透出微弱的 1850K 暖色烛光，门旁石墙上一个未点灯的小壁龛，画左下一级花岗岩石阶，石铺院子、矮墙，画右远处是黑色的海。等待的人（清瘦的约30岁女子，黑发挽成低髻、插一支素面木簪，洗旧的浅蓝粗棉短袄 #7D9CBB，深靛黑布裙，左手腕一只微微氧化的素银细镯，脸始终在屋檐阴影里，永不看清）已经弯下腰，用右手把一只空的民窑青花碗——口沿纹带是一枝连绵的折枝梅、16 朵小梅花——放到石阶外沿、屋檐滴水线下：0.72 秒碗足碰到石面；1.14 秒掌心离开碗沿，停了一停。冷银月光来自右上方，全景深，照片级真实。旧日家中调色：烛光暖色的室内对窗格透入的冷月光，黑位略抬；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Locked WS 32 mm, eye level, night: top third sky with gathering clouds and veiled moon glow at (0.80, 0.14), identical to S018's end; the tiled eave line crossing at y 0.36; granite wall; door at x 0.08-0.26 half open with a faint candle glow; dark empty niche left of the door at (0.04, 0.46); the woman bending at x 0.30, face hidden in eave shadow, her right hand lowering the bowl about 10 cm above the step's outer edge, under the drip line, at (0.28, 0.80), her left hand on her knee with a faint glint of the silver bangle; stone yard, low wall, dark sea at right.
```
**首帧关键帧 Keyframe · ZH**
```text
锁定全景 32mm，平视，夜：上三分之一是聚拢的云与 (0.80, 0.14) 处被遮住的月光，与 S018 末帧完全一致；瓦檐线位于 y 0.36 横穿画面；花岗岩墙；门位于 x 0.08–0.26，半开，透出微弱烛光；门左侧 (0.04, 0.46) 是暗着的空壁龛；女子在 x 0.30 处弯腰，脸藏在檐影里，右手把碗举在石阶外沿、滴水线下 (0.28, 0.80) 上方约 10 厘米处，左手扶在膝上，银镯一点微光；石院、矮墙，画右是黑色的海。
```
**末帧 / 匹配规格 End frame**
```text
Bowl at rest on the step's outer edge under the drip line at (0.28, 0.80), centre blossom facing the sky; her right hand lifted about 8 cm above the rim at (0.30, 0.74), still; posture still bent. This rising right hand hands off to S020's descending right hand in the same lower-middle region.
```
**图生视频运动 Motion · EN**
```text
Camera completely locked, 24 fps. 0-0.72 s her right hand lowers the bowl at natural speed; 0.72 s ('等') foot touches the step, tiny settle, no bounce; 0.72-1.14 s fingers stay on the rim; 1.14 s ('场雨') the palm lifts off and stops about 8 cm above, held to 1.58 s. Clouds drift slowly leftward; moonlight dims about half a stop and returns between 0.3 and 1.3 s. Must NOT move: camera, door, horizon; no rain; face never leaves the shadow.
```
**图生视频运动 Motion · ZH**
```text
摄影机完全锁定，24 fps。0–0.72 秒她的右手以自然速度把碗放下；0.72 秒（“等”）碗足碰到石阶，轻轻一稳，不弹跳；0.72–1.14 秒手指仍搭在碗沿；1.14 秒（“场雨”）掌心离开，停在碗沿上方约 8 厘米，保持到 1.58 秒。云向画左缓慢飘移；0.3–1.3 秒之间月光暗约半档再恢复。不得移动：摄影机、门、海平线；不下雨；脸始终不离开阴影。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 1.58 | single generation, request 3 s with 0.5 s head handle (hand already moving) and 1 s tail hold |

**分层与合成 Plates & compositing**

- **Plate A**：Locked home-exterior action plate: eaves, wall, door with candle glow, step, wife placing the bowl; sky area kept clean
- **Plate B**：Shared sky plate from S018 (clouds + veiled moon), comped into the top third with a soft eave-line mask so the cut from S018 matches exactly
- **合成 / 速度 / 调色 / 同步（post）**：Comp shared sky plate B; animate one cloud pass over the moon (0.3-1.3 s) and drive the moonlight level on plate A to it. Grade CT_HOME, blacks +1%, the bowl glaze highlight is the brightest point in the lower frame. Niche lamp stays unlit here (it is lit in V2 S035 and seen lit in CH2 S041).

**连续性锚点 match_to**：IN: S018 end sky band = upper third (composition match). OUT: palm lift of the right hand at about (0.30, 0.74) -> S020 right hand descending onto the letter in the lower-middle frame (gesture match; register approx. 0.30-0.40, 0.70-0.75). Camera position reused exactly in S041 (CH2). Staging lock shared with S041/S042/S066 (QA): bowl at the step's outer edge under the eaves' drip line (0.28,0.80), door x 0.08-0.26, niche (0.04,0.46), moon glow (0.80,0.14). S019->S020 is a gesture rhyme in the lower-middle region, not a +/-3% registration: A palm lifting at (0.30,0.74) -> B right hand descending at (0.40,0.62).

**负面提示词（追加在全局负面之后）**
```text
visible face, sharp facial features, rain falling, wet stones, puddles, lit niche lamp, child, second person, rice in the bowl, steam, red lanterns, incense smoke, modern objects, electric light, glazed windows, sharp moon disc, starfield, any camera movement, wind-whipped clothing
```

#### S020 · 01:15:01 – 01:17:01 · 2.000 s（f1801–f1849）

| 项目 | 内容 |
|---|---|
| 歌词 | 有人等一场雨／有人等沉默被听见 |
| 段落 / 简报章节 / 时代 / 场景 | CH1 副歌一 / 四 / 迁徙 / `pier_waiting` |
| 景别 / 焦段 / 速度 | MCU / 75 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 手势：S019 掌心离开碗沿的上抬 → 本镜她的右手落向摊开的信（同一只右手、画面中下同一区域；跨时代） |
| 同步点 | 75.44 s “等”：开始沿旧折痕折回；76.22 s “被听见”：折好；76.6 s 整个手掌压平信 |
| 参考图 refs | `CHAR_MIGRANT` `PROP_CASE` `PROP_LETTER` `LOC_PIER` |
| 调色 | 迁徙时代 |
| 生成时长 | 2.0 s |

**文生视频提示词 T2V · EN**
```text
Medium close-up, 75 mm anamorphic, camera 1.3 m, eye level tilted 10 degrees down, inside a 1920s-30s steamer waiting shed at night under the third enamel-shaded incandescent bulb, 2400K, whose pool falls from upper right; beyond, the blue-black night sea. The MIGRANT (~20-year-old East Asian woman, round-square face with full cheeks, large bright wide-set eyes, straight thick brows, a small mole above her RIGHT eyebrow peak, slightly chapped lips, one long black braid, faded grey-blue cotton blouse #8FA1B3 with small white and faded-rose five-petal flowers) sits on an upturned wooden crate, her honey-amber rattan suitcase across her knees as a desk, an eight-column cream letter with faded vermilion rules and soft illegible brush script open on its lid. Slow push-in, about 25 cm over 2 s, ending on her hands. Her right hand settles on the letter at the cut; at 0.40 s she refolds it along the old creases, in thirds then in half; folded by 1.18 s; at 1.56 s she presses it flat with her whole palm, its folded edge lying exactly along the lid's front edge, one horizontal line at frame height 0.66. It is never sealed. Soft halation on the bulb. Migrant-era grade: faded-photograph softness, saturation -15%, creamy highlights, never sepia; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中近景，75mm 变形宽银幕镜头，镜头高 1.3 米、平视略俯 10°；1920–30 年代轮船候船棚内，夜，第三盏搪瓷灯罩白炽灯（2400K）的光池从画右上方落下；棚外是蓝黑色的夜海。迁徙女性（约20岁东亚女子，圆中带方的脸、颊肉饱满，大而亮、两眼距离略宽的眼睛，直而浓的眉，右眉峰上方一颗小痣，嘴唇略干，一条长长的黑辫子，褪色灰蓝碎花棉布大襟衫 #8FA1B3，碎花为白色与褪玫色的小五瓣花）坐在一只倒扣的木箱上，蜂蜜琥珀色的藤箱横在膝上当桌，一封米色八行笺摊在箱盖上——褪色朱红竖格，柔和、不可读的小楷。缓慢推进，2 秒内约 25 厘米，止于她的手。切入时她的右手落在信上；0.40 秒她沿着旧折痕把信重新折回去，先三折、再对折；1.18 秒折好；1.56 秒用整个手掌把它压平——折好的信边恰好与箱盖前沿对齐，成为画面高度 0.66 处的一条水平线。始终没有封口。灯泡周围有柔和光晕。迁徙时代调色：褪色家庭照片般的柔和，饱和度 −15%，高光微奶油，绝不做棕褐；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
MCU 75 mm, slightly high angle: the migrant seated left of centre (head at 0.40, 0.25), the closed rattan case lid horizontal across her knees, its front edge at y 0.66 spanning x 0.18-0.82; the open eight-column letter on the lid; her right hand coming down from upper right toward the letter at (0.40, 0.62); 2400K bulb pool from upper right, soft blue-black sea at right; warm top light on her face, mole above the right brow visible; braid over her shoulder.
```
**首帧关键帧 Keyframe · ZH**
```text
中近景 75mm，略俯：迁徙女性坐在画面中偏左（头部在 (0.40, 0.25)），合着的藤箱盖水平横在膝上，箱盖前沿在 y 0.66、横跨 x 0.18–0.82；摊开的八行笺放在箱盖上；她的右手从右上方落向信纸 (0.40, 0.62)；2400K 灯泡光池来自画右上方，画右是柔焦的蓝黑色海；她脸上是温暖的顶光，右眉峰上方的小痣可见；辫子搭在肩上。
```
**末帧 / 匹配规格 End frame**
```text
Push complete (frame width about 75 cm): the folded letter (8.5 cm square) rests on the lid with its lower folded edge collinear with the case's front edge - one continuous horizontal line at y 0.66 spanning x 0.20-0.80; her palm flat on the letter at (0.48, 0.56); her face cropped or soft at the top. This line is the A-frame for S021's ruler edge (same height, read left to right).
```
**图生视频运动 Motion · EN**
```text
Dolly push-in, slow and constant (about 12 cm/s), 12-frame ease-in, gentle ease-out ending at 1.8 s; 24 fps real time. 0-0.40 s hand settles on the letter; 0.40-1.18 s two quick folds along soft existing creases (thirds, then half); 1.56 s ('被听见' just sung) whole-palm press, held still to 2.0 s. Bulb light steady; background crowd blurred and barely moving. Must NOT: seal, write, lift the letter off the lid, move the case; braid and blouse pattern unchanged.
```
**图生视频运动 Motion · ZH**
```text
轨道缓慢匀速推进（约 12 厘米/秒），12 帧缓入，1.8 秒前柔和缓出；24 fps 真实速度。0–0.40 秒手落定在信上；0.40–1.18 秒沿柔软的旧折痕快速折两次（先三折、再对折）；1.56 秒（“被听见”刚唱完）整个手掌压平，静止保持到 2.0 秒。灯泡光稳定；背景人群虚化、几乎不动。不得：封口、书写、把信从箱盖上拿起、移动藤箱；辫子与衫的纹样不变。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.0 | single generation, request 3 s with 0.5 s head and 0.5 s tail handles |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Grade CT_MIG. Level the case-edge/letter line exactly (rotate <=0.3 deg if needed) - it is the composition A-frame for S021. Cut after the press settles. Same camera set-up reused for S043 (CH2) - save lens height, distance and push path.

**连续性锚点 match_to**：IN: S019 palm lifting at (0.30,0.74) -> her right hand descending at (0.40,0.62) (gesture rhyme, lower-middle region, not a +/-3% registration). OUT: horizontal line y 0.66, x 0.20-0.80 -> S021 ruler edge (register S020->S021 pos 0.5, 0.66, line ~60% of frame width). Note: the skeleton's '60% of frame width' is achieved by the case-lid edge + folded letter edge together, not by the 8.5 cm letter alone.

**负面提示词（追加在全局负面之后）**
```text
envelope, sealing the letter, wax seal, readable characters, legible handwriting, letter folded in quarters, sepia wash, modern clothing, zipper, wristwatch, plastic, crowd in focus, extra fingers, fused fingers, case in her left hand, bright red letter paper
```

#### S021 · 01:17:01 – 01:20:07 · 3.250 s（f1849–f1927）

| 项目 | 内容 |
|---|---|
| 歌词 | 有人要把山河／握在掌间 |
| 段落 / 简报章节 / 时代 / 场景 | CH1 副歌一 / 四 / 地图之手 / `map_office` |
| 景别 / 焦段 / 速度 | INSERT / 50 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 相似构图：S020 折好的信边（水平，y=0.66）→ 直尺下的墨线（同高度、同方向；跨时代） |
| 同步点 | 78.32 s “山河”：墨线划过海岸；79.64 s “掌”：左手掌压住陆地 |
| 参考图 refs | `CHAR_MAPHAND` `PROP_MAP` `LOC_MAPOFFICE` |
| 调色 | 地图办公室 |
| 生成时长 | 3.25 s |

**文生视频提示词 T2V · EN**
```text
Insert, 50 mm anamorphic, 90-degree top-down, locked with a barely perceptible push (about 3% over 3.25 s), an 1890s harbour-office map room at night. A linen-backed hand-drawn coastal map, paper #E2D6B8: brown-ink coastline running top to bottom at x 0.30, sea left blank on its left, hachured hills on its right, a tiny inked harbour-village mark on the coast at (0.30, 0.58), no legible names. An ebony ruler with brass edges lies horizontal, its drawing edge at frame height 0.66. Only MAPHAND is ever seen: a middle-aged man's well-kept hands, ethnically ambiguous medium skin #D6B59A, clean trimmed nails, a writing bump with a faint ink stain on the right middle finger, no ring; dark charcoal wool frock-coat sleeves, 1.5 cm starched white cuffs, plain unengraved brass oval cufflinks. The right hand draws a steel ruling pen along the ruler from left to right, starting at x 0.12, crossing the coast at 1.28 s, leaving a wet blue-black iron-gall line, never red, glistening; at 2.60 s the left hand lifts off the ruler and spreads flat, palm covering the land at (0.62, 0.45). Light: brass kerosene lamp 2200K at frame-right, half-closed louvres cutting cold moonlight into diagonal stripes. Map-office grade: the hardest, highest-contrast cold look, saturation -25%, grey-green surroundings; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
插入镜头，50mm 变形宽银幕镜头，90° 正顶拍，锁定，仅有几乎察觉不到的微推（3.25 秒内约 3%）；1890 年代港务测绘办公室，夜。一张裱在亚麻布上的手绘海岸地图，纸色 #E2D6B8：褐色墨线的海岸线在 x 0.30 处自上而下延伸，左侧海面留白，右侧是晕滃线画的山地，海岸上 (0.30, 0.58) 处有一个细笔画的小渔港村落记号，没有任何可读地名。一把乌木铜边直尺水平放着，画线的尺边位于画面高度 0.66。画面中只出现掌管地图的手：一双保养良好的中年男性的手，肤色是难以判定族裔的中间色 #D6B59A，指甲修剪整齐干净，右手中指有写字茧与淡淡墨渍，不戴戒指；深炭黑羊毛礼服袖，露出 1.5 厘米浆硬的白衬衫袖口，素面无刻花的黄铜椭圆袖扣。右手持钢制直线笔，沿直尺从画左向画右划线，从 x 0.12 起笔，1.28 秒越过海岸线，留下一道湿润发亮的蓝黑色铁胆墨线，绝不是红色；2.60 秒左手离开直尺、五指张开平按下去，掌心盖住 (0.62, 0.45) 处的一片陆地。光：画右一盏黄铜底座煤油灯 2200K，半闭的木百叶把冷月光切成斜向条纹。地图办公室调色：全片最冷硬、反差最高，饱和度 −25%，四周压成冷灰绿；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Top-down 50 mm: the map fills the frame; ebony-and-brass ruler horizontal with its drawing edge at y 0.66 spanning x 0.18-0.80 (matches S020's line); coastline crossing the ruler line at x 0.30, village mark at (0.30, 0.58); right hand with the ruling pen poised at the ruler's left end (0.14, 0.70); left hand holding the ruler at (0.40, 0.76); diagonal louvre stripes of cold moonlight from upper right to lower left, about 4 cm apart; warm kerosene glow from frame-right.
```
**首帧关键帧 Keyframe · ZH**
```text
50mm 正顶拍：地图铺满画面；乌木铜边直尺水平，画线尺边在 y 0.66、横跨 x 0.18–0.80（与 S020 的线对位）；海岸线在 x 0.30 处与尺线相交，村落记号在 (0.30, 0.58)；右手持直线笔停在直尺左端 (0.14, 0.70)；左手按着直尺 (0.40, 0.76)；冷月光的百叶斜条纹由右上到左下、间距约 4 厘米；画右是煤油灯的暖光。
```
**末帧 / 匹配规格 End frame**
```text
Wet blue-black line along y 0.66 from x 0.12 to about 0.62, glistening in lamplight; the pen hand at the line's end (0.64, 0.70); the left hand spread flat, palm covering the land at (0.62, 0.45); the inked village mark at (0.30, 0.58) left uncovered - S022's single shore light replaces it at the same frame position.
```
**图生视频运动 Motion · EN**
```text
Camera locked, micro push 3%, 24 fps. 0.2-2.9 s the pen travels left to right at a steady ~0.19 frame-widths per second, no hesitation; 1.28 s ('山河') the nib crosses the coastline; 2.40 s the left hand lifts from the ruler; 2.60 s ('掌') fingers spread and press flat, held. Ink sheen catches lamplight as the line lengthens. Moths only as soft passing shadows. Must NOT: map shifts, line curves, any red, face or body, lamp flicker.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定，微推 3%，24 fps。0.2–2.9 秒笔尖以约每秒 0.19 个画面宽的匀速从左向右行进，毫不犹豫；1.28 秒（“山河”）笔尖越过海岸线；2.40 秒左手离开直尺；2.60 秒（“掌”）五指张开平按，保持不动。墨线越画越长，湿墨在灯下反光。飞蛾只以柔和掠过的影子出现。不得：地图移动、线条弯曲、出现任何红色、出现脸或身体、灯光闪烁。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.25 | single generation, request 4 s with 0.4 s head handle (pen already touching paper) and 0.35 s tail |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Grade CT_MAP. Keep the line perfectly horizontal at y 0.66 - the same register is reused by S044, S047, S048, S049. If the model renders any reddish ink, recolour to #1E2230 wet sheen. Straight cut to S022.

**连续性锚点 match_to**：IN: S020 folded-letter/case-lid edge (y 0.66, left to right) -> ruler edge. OUT: inked harbour-village mark at (0.30, 0.58) -> S022 shore light at (0.30, 0.58) (point match; the skeleton leaves this match unregistered and its map/sea orientation is opposite to S022's horizontal coast, so the point - not the coastline shape - carries the cut).

**负面提示词（追加在全局负面之后）**
```text
red ink, red line, face, body, torso, rings, crest or insignia on cufflinks, readable place names, compass rose, flags, ink blots, wobbly or curved line, ballpoint or modern pen, electric lamp, warm golden overall grade, extra fingers
```

#### S022 · 01:20:07 – 01:23:13 · 3.250 s（f1927–f2005）

| 项目 | 内容 |
|---|---|
| 歌词 | 有人只想再见／某个人一面 |
| 段落 / 简报章节 / 时代 / 场景 | CH1 副歌一 / 四 / 航海人 / `sea_deck` |
| 景别 / 焦段 / 速度 | CU / 135 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 相似构图：地图上被墨线切过的海岸线 → 真实夜色中同一段黑暗海岸线（海岸线与岸灯位置一致；跨时代） |
| 同步点 | 80.3 s “有人只想再见”：起幅焦点在远岸；81.62 s “某个人一面”：焦点到达他的眼睛；82.64 s “一”：他轻轻吸一口气 |
| 参考图 refs | `CHAR_NAVIGATOR` `PROP_SHIPLAMP` `PROP_OUTERCOAT` `LOC_DECK` |
| 调色 | 航海时代 |
| 生成时长 | 3.25 s |

**文生视频提示词 T2V · EN**
```text
Close-up, 135 mm anamorphic, eye level, night at sea on an early-17th-century ocean-going junk, locked on a stabilised head with a very slow push (about 3%). A low black coastline lies across the left half at frame height 0.58 with one single warm 1900K shore light at (0.30, 0.58). In the right foreground, soft at first, the left profile of the NAVIGATOR (~35-year-old East Asian compass-keeper, long face, high cheekbones, slightly deep-set dark-brown eyes with deep sun creases, short neat beard and moustache, a small pale scar at the tail of his LEFT eyebrow, deep sun-weathered skin, topknot wrapped in an indigo head-cloth, no queue, a brown padded cotton night coat over his faded indigo cross-collar jacket), leaning on the rail, looking screen-left at the light. Focus starts on the shore light and racks, over more than one beat, to his eye, sharp at 1.33 s; the shore light becomes a tiny warm catchlight in his eye; at 2.35 s he takes one small, soft breath. Light: hard silver moonlight from upper right rims his face; the stern lantern, 1950K, warms his cheek from below right; sea #0E1B30 to #1A2D4A. Loose hair stirring in wind; only a short warm flare. Navigator-era grade: strongest warm-cool split, deep-blue sea and sky against amber lamplight, greens muted; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
近景，135mm 变形宽银幕镜头，平视；17 世纪初远洋帆船上的夜海，稳定云台锁定，极缓慢推进（约 3%）。一条低矮的黑色海岸线横在画面左半边、高度 0.58，岸上只有一点 1900K 的暖灯，位于 (0.30, 0.58)。画右前景起初虚焦的，是航海人的左侧脸（约35岁东亚火长，长脸、颧骨突出，眼窝略深的深褐色眼睛、眼角有很深的日晒纹，短而整齐的胡须与上唇须，左眉尾一道浅白小旧疤，长期日晒的深色皮肤，发髻外裹靛蓝布头巾、不留辫，靛蓝交领短褂外披着棕色夹棉守夜外衣），他倚着船舷，望向画左那一点灯。焦点起于岸灯，以超过一拍的时长转到他的眼睛，1.33 秒清晰；岸灯在他眼里成了一个小小的暖色亮点；2.35 秒他轻轻吸一口气。光：右上方硬而单向的冷银月光勾出他的侧脸；艉灯 1950K 从右下方暖暖地照在他颊上；海面 #0E1B30 至 #1A2D4A。碎发被风轻拂，只允许短促的暖色光晕。航海时代调色：全片最强的冷暖对比，深蓝的海与天对琥珀色灯光，绿色压低；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
135 mm CU: the shore light sharp at (0.30, 0.58) on a low black coast whose silhouette lies at y 0.58 across x 0-0.48; the navigator's left profile a soft warm-and-silver shape filling x 0.60-1.0, his eye at (0.70, 0.40); dark swell between; moonlight rim on his profile from upper right; brown padded coat collar over the indigo jacket collar.
```
**首帧关键帧 Keyframe · ZH**
```text
135mm 近景：岸灯清晰地位于 (0.30, 0.58)，低矮黑色海岸线的轮廓在 y 0.58、横跨 x 0–0.48；航海人的左侧脸是一团柔和的暖与银，占据 x 0.60–1.0，眼睛在 (0.70, 0.40)；中间是黑暗的涌浪；右上方月光勾出他的侧脸轮廓；靛蓝短褂领口外是棕色夹棉外衣的领子。
```
**末帧 / 匹配规格 End frame**
```text
His eye sharp at (0.70, 0.40) with a tiny warm catchlight of the shore light; the shore light now a soft oval bokeh at (0.30, 0.58). The catchlight position (0.70, 0.40) hands off to S023's reflected moon at the same frame position (light point to light point).
```
**图生视频运动 Motion · EN**
```text
Stabilised head compensates the ship's swell: horizon steady, a gentle 7-second heave allowed at most 1% of frame. Very slow push about 3% over 3.25 s, 24 fps. Focus rack from the far shore to his eye between 0.3 s and 1.33 s ('某个人一面'). Subject almost still: natural blinks only, 2.35 s ('一') small inhale lifting his chest slightly; loose strands at the head-cloth edge move in wind. Must NOT: turn his head, show the patch, move the shore light, roll the horizon.
```
**图生视频运动 Motion · ZH**
```text
稳定云台抵消船的起伏：海平线稳定，只允许不超过画面 1% 的 7 秒周期轻微升沉。3.25 秒内极缓慢推进约 3%，24 fps。0.3–1.33 秒（“某个人一面”）焦点由远岸转到他的眼睛。人物几乎静止：只有自然眨眼，2.35 秒（“一”）轻轻吸气、胸口微起；头巾边的碎发随风动。不得：转头、露出补丁、岸灯移动、海平线倾斜。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.25 | single generation, request 4 s with 0.4 s head and 0.35 s tail handles |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Grade CT_NAV. If the catchlight is missing, add a 1900K point in comp at the iris (do not invent extra lights). Stern-lantern swing modulates his cheek light subtly (6-8 s period). Night costume decision: padded outer coat worn on night watch (bible 5.3) - S045 and S067 must match (he gives the coat away in S067).

**连续性锚点 match_to**：IN: S021 village mark (0.30, 0.58) -> shore light (0.30, 0.58). Shore light screen-left, eyeline screen-left, as in S008 and S045. OUT: catchlight in his eye at (0.70, 0.40) -> S023 reflected moon in the vitrine glass at (0.70, 0.40).

**负面提示词（追加在全局负面之后）**
```text
shore light on the right, several bright shore lights, city skyline, lighthouse beam, tears, crying, open mouth, Qing queue, shaved forehead, modern clothing, sharp moon disc in frame, blue streak flare, shaky camera, rolling horizon, visible cuff patch
```

#### S023 · 01:23:13 – 01:26:19 · 3.250 s（f2005–f2083）

| 项目 | 内容 |
|---|---|
| 歌词 | 某个人一面／千年啊／不过无数个今晚 |
| 段落 / 简报章节 / 时代 / 场景 | CH1 副歌一 / 四 / 现代 / `museum_gallery` |
| 景别 / 焦段 / 速度 | WS / 32 mm / 24 |
| 入点转场 | 光线转场 0 帧 — 航海人眼中映着的岸灯 → 展柜玻璃里映着的同一轮月亮（同一画面位置的光点接光点；跨时代） |
| 同步点 | 83.66 s “千年啊”：玻璃里的月亮；86.06 s “今”：下摇到三面展柜 |
| 参考图 refs | `CHAR_RESTORER` `PROP_SHIRT` `PROP_CASE` `PROP_KEEPSAKE` `PROP_PASS` `PROP_GLOVES` `PROP_COAT` `LOC_GALLERY` |
| 调色 | 现代夜间 |
| 生成时长 | 3.25 s |

**文生视频提示词 T2V · EN**
```text
Wide shot, 32 mm anamorphic, present-day museum gallery at night inside a converted 19th-century customs-house warehouse: slender dark grey-green cast-iron columns, waxed teak floor, red brick partly lime-washed. The shot starts tilted up about 35 degrees on the upper glass of three tall frameless wall vitrines on the north wall, where a small mirrored image of the veiled waning-gibbous moon sits at (0.70, 0.40). Slow tilt-down over 2.4 s with 12-frame eases to eye level: cold silver moonlight shafts slant in from behind the camera's right shoulder through unseen south doorways, laying arched pools on the teak floor and washing the glass of the three vitrines standing in a row, left to right: navigation, household ceramics with one empty mount, migration with an open rattan case. Vitrine interiors dim 3000K over near-black navy velvet. At 2.6 s the RESTORER (~28-year-old East Asian woman, slim, low loose ponytail with strands at the right temple, charcoal wool coat #3C4045 with three horn buttons, thin warm-white cotton gloves) walks in from frame-left into the moonlight, carrying no lamp: the moon is her key light. Deep focus. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
全景，32mm 变形宽银幕镜头；当下的夜，旧海关关栈改建的博物馆展厅：纤细的深灰绿铸铁柱、打蜡的柚木地板、局部刷过石灰的红砖墙。起幅上仰约 35°，对着北墙三面通高无框立柜的上部玻璃，玻璃里映着一轮被薄云遮住的亏凸月的小小镜像，位于 (0.70, 0.40)。2.4 秒内缓慢下摇到平视，首尾各 12 帧缓入缓出：冷银色的月光光柱从摄影机右肩后方、经画外的南侧门洞斜射进来，在柚木地板上铺出拱形光斑，并洗亮三面并排立柜的玻璃——由左到右：航海、家用瓷器（一个空着的托架）、迁徙（一只打开的藤箱）。柜内是调暗的 3000K 小灯与近黑的深蓝绒布。2.6 秒，修复师（约28岁东亚女性，纤瘦，低马尾、右侧太阳穴落下几缕碎发，深灰呢外套 #3C4045、三粒牛角扣，略暖白的薄棉手套）从画左走进月光里，手里没有任何灯——月光就是她的主光。全景深。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Tilted up 35 degrees, 32 mm: the dark upper glass panes of the three G3 vitrines across the frame; in the glass a small soft mirrored moon at (0.70, 0.40) inside a faint reflected arch of a doorway; above, timber ceiling and brick in deep blue shadow; no people.
```
**首帧关键帧 Keyframe · ZH**
```text
上仰 35°，32mm：三面 G3 立柜上部的暗玻璃横贯画面；玻璃里，一个淡淡的门洞拱形倒影之中，有一个小而柔和的月亮镜像，位于 (0.70, 0.40)；上方是木屋架与砖墙，沉在深蓝阴影里；没有人。
```
**末帧 / 匹配规格 End frame**
```text
Eye level: G3a at x 0.25, G3b at 0.50, G3c at 0.75, each about 70% of frame height, glass catching moonlight; arched silver pools on the teak floor slanting from lower right toward the vitrines; the restorer just entered at x 0.15, full figure about 45% of frame height, walking right into a moon shaft, her LEFT coat cuff toward camera with the small worn spot.
```
**图生视频运动 Motion · EN**
```text
Remote-head tilt-down 35 degrees from 0.12 s ('千年啊') to 2.52 s ('今'), 12-frame ease in and out, 24 fps; the reflected moon slides up and out of the glass as the camera tilts. She enters at 2.6 s walking left to right at an unhurried 1.2 m/s. Moonlight static, vitrine lights steady. Must NOT: pan sideways, let the reflected moon move independently of the glass, make her reflection brighter than the moon pools.
```
**图生视频运动 Motion · ZH**
```text
遥控云台从 0.12 秒（“千年啊”）到 2.52 秒（“今”）下摇 35°，首尾各 12 帧缓入缓出，24 fps；随着下摇，玻璃里的月亮镜像向上滑出玻璃。2.6 秒她以每秒 1.2 米的从容步速从左向右走入。月光静止，柜内灯稳定。不得：横摇；玻璃中的月亮脱离玻璃单独运动；她的倒影亮过地上的月光斑。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.25 | single generation, request 4 s (0.4 s head handle on the static tilted-up frame, 0.35 s tail) |

**分层与合成 Plates & compositing**

- **Plate A**：Gallery tilt-down plate: G3 vitrines, columns, moon pools on the floor, the restorer walking in; upper glass left dark
- **Plate B**：Moon element from shared sky plate (S018 B), FLOPPED horizontally (a mirror image - its lit limb is reversed), inside a faint reflected doorway arch, comped into the upper glass at 25-30% screen strength and tracked to the tilt
- **合成 / 速度 / 调色 / 同步（post）**：Focus: start at infinity on the reflected moon, rack to the vitrine plane by 1.0 s (>=1 beat). Grade CT_MODERN. Physics cheat flagged to director: with the bible's 02:10 moon at ~60 deg altitude, neither the moon's reflection in the north-wall glass nor moonlight reaching that wall is possible across the 14 m-deep, 6 m-high gallery - treat as an approved cheat for S023-S026 or lower the moon.

**连续性锚点 match_to**：IN: S022 catchlight (0.70, 0.40) -> reflected moon (0.70, 0.40) (light point to light point). OUT: three-vitrine layout and her left-to-right walk continue into S024's lateral track (she then appears only as a reflection).

**负面提示词（追加在全局负面之后）**
```text
moon disc seen directly through a window, two moons, flashlight, work lamp, track lights on, readable exhibit labels or captions, signage, other people, fog, haze, god rays from nowhere, cyan grade, green-tinted glass, ghost figures
```

#### S024 · 01:26:19 – 01:30:01 · 3.250 s（f2083–f2161）

| 项目 | 内容 |
|---|---|
| 歌词 | 不过无数个今晚／多少不敢说的爱／借月色流传 |
| 段落 / 简报章节 / 时代 / 场景 | CH1 副歌一 / 四 / 多时代 / `museum_gallery` |
| 景别 / 焦段 / 速度 | MS / 40 mm / 24 |
| 入点转场 | 切 0 帧 — 同一空间内接续（由下摇转横移） |
| 同步点 | 86.9 s “多少”：G3a（船舱）入画；88.28 s “借月色”：G3b（家中）居中；89.36 s “流传”：G3c（候船处）居中 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_NAVIGATOR` `CHAR_WIFE` `CHAR_MIGRANT` `PROP_COMPASS` `PROP_BOWL` `PROP_CASE` `PROP_CANDLE` `PROP_SHIPLAMP` `LOC_GALLERY` `LOC_CABIN` `LOC_HOME` `LOC_PIER` |
| 调色 | 多时代/过渡（见提示词） |
| 生成时长 | 3.25 s |

**文生视频提示词 T2V · EN**
```text
Medium shot, 40 mm anamorphic, lens 1.45 m, stable dolly track left to right at a constant 1.3 m/s past three tall frameless vitrines on a night museum gallery's north wall, camera yawed 20 degrees toward travel so the dark glass reflects. Each velvet-lined pane holds another era's night in its own depth: first a smoke-blackened junk cabin, the NAVIGATOR (~35, East Asian, indigo head-cloth over a topknot, faded indigo jacket, pale scar at his left eyebrow tail) bent over a warm brass compass under a swinging horn lantern; then, over an empty ceramics mount, a granite home where the WIFE (slender, low bun with a wooden hairpin, pale-blue jacket, silver bangle on her LEFT wrist, face never resolved) waits beside a 6 cm candle, a bowl of untouched rice before the empty bench opposite; then, over an open rattan case, a 1920s waiting shed, the MIGRANT (~20, one long braid, faded grey-blue floral blouse) on an upturned crate, her rattan case across her knees under a 2400K bulb. In every reflection moonlight falls from upper right to lower left. The RESTORER's own reflection (low ponytail, charcoal wool coat), dim and soft, walks along. Gallery in the modern night grade (never cyan); each pane keeps its era grade: amber-and-deep-blue cabin, candle-warm home, faded-photograph shed; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中景，40mm 变形宽银幕镜头，平视、镜头高 1.45 米；轨道车以每秒 1.3 米恒速由画左向画右稳定横移，经过夜间展厅北墙的三面通高无框立柜，镜头朝行进方向偏转 20°，让暗玻璃的反射更强。每一面衬着绒布的玻璃里，都映着另一个时代的夜，各自有自己的纵深：先是熏黑的帆船船舱，航海人（约35岁东亚男子，发髻外裹靛蓝头巾，褪色靛蓝短褂，左眉尾浅白旧疤）伏在温暖的黄铜罗盘前，头顶一盏摆动的角片舱灯；接着，在一个空着的瓷器托架之上，是一间花岗岩石屋，等待的人（清瘦，低髻插木簪，浅蓝短袄，左腕银镯，脸永不看清）守在一支 6 厘米的蜡烛旁，对面空着的长凳前一碗没动过的饭；最后，在一只打开的藤箱之上，是 1920 年代的候船棚，迁徙女性（约20岁，一条长辫，褪色灰蓝碎花衫）坐在倒扣的木箱上，藤箱横在膝上，头顶一盏 2400K 灯泡。每一面倒影里的月光都从右上落向左下。修复师自己的倒影（低马尾、深灰呢外套）淡淡地、柔柔地跟着走。展厅为现代夜间调色（中性偏冷、绝不偏青）；每面玻璃保留各自时代的调色：琥珀对深蓝的船舱、烛光暖色的家、褪色照片般的候船棚；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Track start, 40 mm: G3a (navigation: needle-route book, sounding lead) at x 0.73, right of centre, about 80% of frame height, its glass beginning to show the cabin reflection at low strength; G3b's left edge entering at frame-right; G3a's left neighbour wall and a cast-iron column at left; teak floor with moon pools along the bottom; the restorer's dim reflection soft at x 0.40 in the glass. All vitrine fronts closed.
```
**首帧关键帧 Keyframe · ZH**
```text
横移起幅，40mm：G3a（航海：针路簿、测深铅锤）位于 x 0.73、画面中偏右，约占画面高度 80%，玻璃里刚开始以低强度浮现船舱的倒影；G3b 的左边沿从画右入画；画左是墙与一根铸铁柱；画面底部是带月光斑的柚木地板；修复师的淡淡倒影柔焦地落在玻璃里 x 0.40 处。三面柜门全部关闭。
```
**末帧 / 匹配规格 End frame**
```text
G3c (migration: open rattan case, folded shirt, comb, permit) at x 0.12-0.30 moving left, its reflection of the waiting shed (migrant on the crate, case on her knees, bulb) still strong; G3b exiting at frame-left; beyond G3c, brick wall and a column at right; the restorer's soft reflection at x 0.45. Lateral speed continuous - cut on motion.
```
**图生视频运动 Motion · EN**
```text
Dolly pre-rolled at a constant 1.3 m/s left to right (no visible ease), 24 fps; vitrines slide right-to-left across frame at about 0.58 frame-widths per second: G3a centred at 0.4 s with its cabin reflection blooming from 0.11 s ('多少'); G3b centred at 1.49 s ('借月色'); G3c centred at 2.57 s ('流传'). Reflection strength per pane rises from about 10% at entry to 40% at centre and falls on exit. Inside reflections only small continuous actions: lantern swings (7 s period), candle flame breathes, crowd drifts. Must NOT: vitrines move, figures leave their panes, eras mix.
```
**图生视频运动 Motion · ZH**
```text
轨道车预先起速，以每秒 1.3 米恒速由左向右（无可见缓入），24 fps；立柜以约每秒 0.58 个画面宽的速度由右向左滑过画面：G3a 在 0.4 秒居中，其船舱倒影从 0.11 秒（“多少”）开始浮现；G3b 在 1.49 秒（“借月色”）居中；G3c 在 2.57 秒（“流传”）居中。每面玻璃的反射强度从入画时约 10% 升到居中时 40%，出画时回落。倒影里只有很小的持续动作：舱灯摆动（周期 7 秒）、烛焰呼吸、人群缓缓流动。不得：立柜移动、人物离开各自的玻璃、时代互相混入。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.25 | single base-plate generation, request 4 s pre-rolled (0.5 s head, 0.25 s tail); era plates B1-B3 rendered at 4 s each on matched paths |

**分层与合成 Plates & compositing**

- **Plate A**：Modern clean plate: 40 mm track past closed G3a / G3b / G3c (vitrine contents per bible 7.1, G3b with the empty mount), dark velvet interiors, no era reflections; restorer off-camera walking alongside so only her natural dim reflection is present (or keep separate as C)
- **Plate B1**：Cabin plate: navigator bent over the brass compass under the swinging horn lantern, 1950K + dusk-blue stern-window bars, generated in the on-screen (as-seen) layout with the camera trucking screen-RIGHT at matched speed so its parallax reads as seen in the glass, moonlight from upper right
- **Plate B2**：Home plate: wife at the table on the screen-left bench, face unresolved, candle state C (6 cm), blue-and-white bowl of cold rice (no steam) with chopsticks before the empty screen-right bench, cracked-ice lattice moonlight; as-seen layout, camera trucking screen-RIGHT, moonlight from upper right
- **Plate B3**：Pier plate: migrant on an upturned crate under the third 2400K bulb, rattan case across her knees, wet floor, crowd drifting; as-seen layout, camera trucking screen-RIGHT, moonlight/skylight from upper right
- **Plate C**：Restorer reflection plate: her walking alongside the camera at 1.3 m/s, low level, for a soft 12% layer
- **合成 / 速度 / 调色 / 同步（post）**：MP-1: era plates B1-B3 are composited as seen (no flop), so all on-screen locks hold (wife screen-left, empty bench screen-right, moonlight upper-right to lower-left per T11). Fallback only if the director later orders a literal bible 8.3-4 flop: regenerate B1-B3 trucking screen-LEFT with upper-left moonlight and flop them (layouts then reverse). Screen-blend each era into its pane, masked to the pane edges, strength 10% -> 40% -> 10% driven by pane screen position; era plates sharp at mirror depth, vitrine objects slightly soft, restorer layer C at 12% and soft (bible 8.3-6). Panes keep CT_NAV / CT_HOME / CT_MIG attenuated by reflectance; gallery body CT_MODERN. The restorer's own reflection (C) is always a true mirror image.

**连续性锚点 match_to**：IN: continues S023 (same gallery; tilt becomes track; her walk continues as reflection). OUT: S025 at G3b. Note: by the skeleton's own sync points this track ends centred on G3c, not stopped at G3b as S025's transition says - S025 is treated as a new set-up.

**负面提示词（追加在全局负面之后）**
```text
ghost figures standing in the gallery, semi-transparent people outside the glass, non-mirrored reflections, all panes the same colour, the wife's face sharp, double-exposure look, eras bleeding across panes, morphing between panes, flicker, camera shake, readable labels, restorer visible in person in frame
```

#### S025 · 01:30:01 – 01:33:06 · 3.208 s（f2161–f2238）

| 项目 | 内容 |
|---|---|
| 歌词 | 我隔着玻璃／认不出你的脸 |
| 段落 / 简报章节 / 时代 / 场景 | CH1 副歌一 / gap / 多时代 / `museum_gallery` |
| 景别 / 焦段 / 速度 | MCU / 75 mm / 24 |
| 入点转场 | 切 0 帧 — 横移停在 G3b → 修复师走到它面前 |
| 同步点 | 90.14 s “我隔着玻璃”：她凑近；92.66 s “脸”：焦点最接近，仍不清晰 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_WIFE` `PROP_CANDLE` `PROP_GLOVES` `PROP_COAT` `LOC_GALLERY` `LOC_HOME` |
| 调色 | 多时代/过渡（见提示词） |
| 生成时长 | 3.208 s |

**文生视频提示词 T2V · EN**
```text
Medium close-up, 75 mm anamorphic, eye level, night museum gallery. The RESTORER (~28-year-old East Asian woman, soft oval face, straight natural brows, inner double eyelids, low loose ponytail with loose strands at her RIGHT temple, no make-up, no jewellery, charcoal wool coat #3C4045 with the middle horn button fastened, thin warm-white cotton gloves) stops before a tall frameless vitrine of household ceramics with one empty mount and leans close to the glass. Camera: slow push-in with a gentle 25-degree arc from over her right shoulder to her right profile, about 30 cm over 3.2 s. In the glass her own reflection, dim and out of focus, falls exactly on the empty mount; deeper inside the reflection lies an old candlelit room and a woman's face beside a 1850K candle flame: the WIFE, never resolved, only a warm soft oval, a dark low bun and a wooden hairpin. At 0.10 s she leans in; she narrows her eyes and tilts her head; focus hunts between her reflection and the deep face, closest at 2.62 s but never sharp. Light: cold silver moonlight key from behind screen-left, warm teak-floor bounce under her chin, dim 3000K vitrine glow. Modern night grade with warm living skin; the candlelit face in the glass keeps the old-home grade; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中近景，75mm 变形宽银幕镜头，平视，夜间展厅。修复师（约28岁东亚女性，鹅蛋脸，自然平直的眉，内双眼皮，低马尾、右侧太阳穴落下几缕碎发，不化妆、无首饰，深灰呢外套 #3C4045 中间一粒牛角扣扣着，略暖白的薄棉手套）停在一面家用瓷器立柜前——柜里有一个空着的托架——凑近玻璃。运镜：缓慢推进并带一个 25° 的柔和弧移，从她右肩后过肩到她的右侧脸，3.2 秒约 30 厘米。玻璃里，她自己的倒影（较暗、焦外）恰好落在那个空托架上；倒影更深处，是一间烛光下的旧屋和 1850K 烛焰旁的一张脸——等待的人，永不看清，只是一团暖色的柔和椭圆、一个深色的低髻和一支木簪。0.10 秒她凑近；她眯起眼、微微侧头；焦点在她的倒影与深处那张脸之间来回寻找，2.62 秒最接近，却始终不清晰。光：冷银月光从画左后方作为她的主光，柚木地板把暖色反光补到她下巴下，柜内 3000K 微光。现代夜间调色，肤色温暖鲜活；玻璃里烛光下的脸保留旧日家中调色；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Over her right shoulder: soft foreground shoulder, coat collar and ponytail at frame-left (x 0-0.30); the vitrine glass fills the right two-thirds; the empty acrylic mount at (0.62, 0.55); her dim defocused reflection overlapping it; deep in the glass a warm candle bokeh at (0.70, 0.42) with a soft oval face shape and dark bun; moonlight edge on her ear and collar.
```
**首帧关键帧 Keyframe · ZH**
```text
她右肩后的过肩镜头：画左（x 0–0.30）是柔焦的肩、外套领与马尾；立柜玻璃占据右侧三分之二；空的亚克力托架在 (0.62, 0.55)；她淡淡的焦外倒影与托架重叠；玻璃深处 (0.70, 0.42) 是一团暖色烛光焦外光斑，里面隐约一张柔和的椭圆脸与深色发髻；月光勾着她的耳廓与衣领。
```
**末帧 / 匹配规格 End frame**
```text
Near right profile at frame-left (face centre 0.30, 0.45), eyes narrowed toward the glass at right, loose strands at her right temple catching moonlight; her reflection on the mount at (0.62, 0.55); the deep candle-lit face still soft at (0.70, 0.42).
```
**图生视频运动 Motion · EN**
```text
Slow dolly push about 10 cm/s with a 25-degree arc to the right, 12-frame ease-in, 24 fps. She leans in 0.10-0.6 s, then holds; micro head tilt at 1.5 s; a narrowing of the eyes at 2.2 s. Focus: three small hunts, each at least 0.8 s, between the mirror depth of her own reflection and the deeper home face; nearest at 2.62 s ('脸'), still soft. Must NOT: resolve the wife's face, let her touch the glass, change vitrine contents.
```
**图生视频运动 Motion · ZH**
```text
轨道缓慢推进约每秒 10 厘米并向右弧移 25°，12 帧缓入，24 fps。0.10–0.6 秒她凑近，然后停住；1.5 秒头部微侧；2.2 秒眯眼。焦点：在她自己倒影的镜像深度与更深处家中那张脸之间做三次小幅寻找，每次至少 0.8 秒；2.62 秒（“脸”）最接近，仍然模糊。不得：让等待的人的脸清晰；她触碰玻璃；柜内陈设改变。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.21 | single generation per plate, request 4 s with 0.4 s handles |

**分层与合成 Plates & compositing**

- **Plate A**：Live-action restorer plate at G3b with dark glass (her natural dim reflection allowed), push + arc
- **Plate B**：Home plate: wife's face three-quarter beside the candle (state C, 6 cm), candle side-back light, cracked-ice lattice shadow, deliberately soft; generated and composited as seen (MP-1), consistent with S017/S024
- **Plate C**：Clean G3b interior with the empty acrylic mount on near-black velvet, for the transmission layer
- **合成 / 速度 / 调色 / 同步（post）**：Composite C (through-glass), then B at 20-25% screen within the glass at mirror depth with its own defocus never below 8 px circle of confusion at 1080p (the face must not resolve). Her own reflection never brighter than B (bible 8.3-6). Animate the focus hunt across A/B in comp. Grade CT_MODERN body, CT_HOME inside B.

**连续性锚点 match_to**：IN: S024 track (new set-up at G3b). OUT: S026 continues in the same glass - focus moves from the soft face to the sharp hand.

**负面提示词（追加在全局负面之后）**
```text
the wife's face in focus, recognisable features in the glass, ghost overlay outside the glass, her reflection brighter than the candle, bowl on the mount, labels, tears, make-up, jewellery, wristwatch, touching the glass, mole on the right cheek
```

#### S026 · 01:33:06 – 01:36:22 · 3.667 s（f2238–f2326）

| 项目 | 内容 |
|---|---|
| 歌词 | 却认得你／舍不得的人间 |
| 段落 / 简报章节 / 时代 / 场景 | CH1 副歌一 / gap / 多时代 / `museum_gallery` |
| 景别 / 焦段 / 速度 | INSERT / 100 mm / 24 |
| 入点转场 | 反射转场 0 帧 — 同一块玻璃内焦点由脸转移到手（倒影内转场，T12） |
| 同步点 | 93.32 s “却认得你”：焦点转到手上；94.46 s “舍不得”：手把筷子挪齐；95.95 s 全乐队骤停（“舍不得”与“的人间”之间）：手停住 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_WIFE` `PROP_BOWL` `PROP_CANDLE` `PROP_GLOVES` `LOC_GALLERY` `LOC_HOME` |
| 调色 | 多时代/过渡（见提示词） |
| 生成时长 | 3.667 s |

**文生视频提示词 T2V · EN**
```text
Insert, 100 mm anamorphic, eye level, locked, shot through the glass of a museum vitrine at night. Deep inside the reflection lies an early-17th-century candlelit table: a folk-kiln blue-and-white bowl of cold white rice with no steam at all, its rim band one continuous plum branch of 16 small five-petal blossoms, a pair of bamboo chopsticks across the rim before an empty bench; a 6 cm ivory candle in an old brass candlestick, 1850K; cracked-ice lattice moon shadows on the dark camphor tabletop. The WIFE's face stays a soft blur at the top edge; at 0.07 s focus moves from that blur to her hand: a slender working hand with tiny needle-prick marks and a thin, slightly tarnished silver bangle on her LEFT wrist, straightening the chopsticks, pausing, nudging them a millimetre more at 1.21 s. Near the glass surface, the faint reflection of the RESTORER's fingertip in a thin warm-white cotton conservator glove, a grey-brown brass smudge on the index tip, approaches the glass but never touches. At 2.70 s, as the music stops, the hand stops, resting on the chopsticks, motionless to the end. Old-home grade inside the reflection, candle-warm against cool lattice moonlight; the glass surface in the neutral-cool modern night grade; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
插入镜头，100mm 变形宽银幕镜头，平视，锁定，透过夜间博物馆立柜的玻璃拍摄。倒影深处是一张 17 世纪初烛光下的饭桌：一只民窑青花碗盛着凉透的白饭，没有一丝热气，口沿纹带是一枝连绵的折枝梅、16 朵五瓣小梅花，一双竹筷横放在碗口，碗摆在一条空着的长凳前；旧铜烛台上一支 6 厘米的象牙色蜡烛，1850K；冰裂纹窗格的月影落在深色樟木桌面上。等待的人的脸只是画面上缘一团柔和的模糊；0.07 秒焦点从那团模糊移到她的手上：一只纤细、劳作过的手，指腹有细小的针眼，左手腕一只微微氧化的素银细镯——她把筷子摆正，停了停，1.21 秒又轻轻挪齐一毫米。靠近玻璃表面的地方，修复师戴着暖白薄棉修复手套的指尖（食指指尖一点灰褐黄铜污迹）的淡淡倒影向玻璃靠近，却始终没有接触。2.70 秒音乐骤停，那只手也停住，搁在筷子上，直到镜头结束一动不动。倒影内为旧日家中调色——烛光暖色对窗格冷月光；玻璃表面为中性偏冷的现代夜间调色；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Through glass, 100 mm: deep layer = the table, the bowl of cold rice at (0.62, 0.55) with chopsticks across its rim, candle flame soft at (0.30, 0.35), lattice shadows across the tabletop; her face a warm blur at the top edge (0.45, 0.08); her left hand with the bangle entering at (0.52, 0.62), still soft; on the glass plane, a faint gloved-fingertip reflection at lower right (0.80, 0.78).
```
**首帧关键帧 Keyframe · ZH**
```text
透过玻璃，100mm：深层是饭桌——盛着凉饭的碗在 (0.62, 0.55)，竹筷横在碗口，烛焰柔焦在 (0.30, 0.35)，窗格影斜过桌面；她的脸是画面上缘 (0.45, 0.08) 的一团暖色模糊；戴银镯的左手正从 (0.52, 0.62) 入画，仍然虚；玻璃平面上，右下方 (0.80, 0.78) 有一点戴手套指尖的淡淡倒影。
```
**末帧 / 匹配规格 End frame**
```text
Hand sharp and motionless, resting on the chopsticks at (0.56, 0.58), bangle glint; the gloved-fingertip reflection stopped at (0.72, 0.70), a finger-width from meeting its own real tip at the glass - not touching; candle steady.
```
**图生视频运动 Motion · EN**
```text
Camera locked, 24 fps. Focus rack 0.07-0.9 s from the face blur to the hand ('却认得你'). Hand at real speed: straighten 0.3-0.9 s, pause, nudge at 1.21 s ('舍不得'), small settle; at 2.70 s (full-band stop) all motion stops and the hand stays still through 3.67 s. The fingertip reflection drifts toward the glass 0.5-2.5 s then stops about 1 cm short. Candle flame breathes slowly. Must NOT: face resolves, rice steams, fingertip touches, residual AI drift after 2.70 s.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定，24 fps。0.07–0.9 秒（“却认得你”）焦点从模糊的脸转到手。手以真实速度：0.3–0.9 秒摆正筷子，停顿，1.21 秒（“舍不得”）再挪齐一下，轻轻落定；2.70 秒（全乐队骤停）一切动作停止，手静止到 3.67 秒。指尖倒影在 0.5–2.5 秒向玻璃靠近，然后停在约 1 厘米外。烛焰缓慢呼吸。不得：脸变清晰、饭冒热气、指尖碰到玻璃、2.70 秒后出现 AI 残余漂移。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.67 | single generation per plate, request 4.5 s; from 2.70 s hold the home plate (freeze-blend if the model drifts) |

**分层与合成 Plates & compositing**

- **Plate A**：Glass-surface plate (modern): G3b glass with fine dust, the restorer's gloved fingertip approaching and its reflection, cool moonlight
- **Plate B**：Home table plate in the as-seen layout (wife's side screen-left, bowl and chopsticks before the empty screen-right bench, bangle on her LEFT wrist as seen, candle state C 6 cm), hand action as timed
- **合成 / 速度 / 调色 / 同步（post）**：Screen B at about 35% over the dark velvet without flop (MP-1, as in S017/S024/S025), A on top; rack focus animated across B. (A literal 8.3-4 flop would put the bangle on an apparent right hand and the empty seat at screen-left - not used.) The fingertip reflection in A is a true mirror. Hold B frozen from 2.70 s. Grade CT_HOME in B, CT_MODERN on A.

**连续性锚点 match_to**：IN: S025 same glass (face -> hand, T12). OUT: band re-entry at 96.85 s -> cut to S027 at 96.917 s.

**负面提示词（追加在全局负面之后）**
```text
face in focus, steam from the rice, fingertip touching the glass, bowl pattern other than the plum rim band, chopsticks moving on their own, hand moving after the stop, extra fingers, fused fingers, modern objects, ghost overlay outside the glass, red lanterns
```

#### S027 · 01:36:22 – 01:41:19 · 4.875 s（f2326–f2443）

| 项目 | 内容 |
|---|---|
| 歌词 | 舍不得的人间 |
| 段落 / 简报章节 / 时代 / 场景 | CH1 副歌一 / gap / 现代 / `corridor` |
| 景别 / 焦段 / 速度 | WS / 135 mm / 24 |
| 入点转场 | 切 0 帧 — 全乐队重新进入（96.85）时切长廊（同一夜、同一层楼） |
| 同步点 | 96.92 s 全乐队重新进入：切长廊；97.62 s 重拍：极缓慢推进开始；99.5 s 门洞深处她的剪影走向 G3c；101.5 s “人间”长音结束 |
| 参考图 refs | `CHAR_RESTORER` `LOC_GALLERY` `LOC_WINDOW` `LOC_CORRIDOR` |
| 调色 | 现代夜间 |
| 生成时长 | 4.875 s |

**文生视频提示词 T2V · EN**
```text
Wide shot, 135 mm anamorphic, long-lens compression, from the west end of a 44 m glazed upper verandah corridor of an old harbour customs house at night, lens height 1.45 m on the centre line, looking east, motion-control push so slow it is barely perceptible (about 0.3 m over 4.2 s, starting at 0.70 s). Long waxed teak boards run to the far end; eleven tall arched windows with slim steel glazing bars on the right (south) let in cold silver moonlight, laying arched pools on the floor at a steady 4 m beat. Four tall frameless vitrines stand staggered left and right, their dark glass only catching moonlight, no images yet. Both walls hold about fourteen small wall vitrines whose warm 3000K glows stay permanently out of focus and never resolve. A doorway in the left wall glows warm from the gallery beyond; at 2.58 s the tiny silhouette of the RESTORER (charcoal wool coat, low ponytail) passes across that doorway's depth, walking east. At the far end, through a glazed timber screen, a three-sided bay window: an empty teak window bench before scattered warm harbour lights. Deep focus T8. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
全景，135mm 变形宽银幕长焦压缩，从旧海关大楼二层一条 44 米长、玻璃封闭的南外廊西端向东拍摄，夜；镜头高 1.45 米、位于中轴线，运动控制推进慢到几乎察觉不到（0.70 秒起，4.2 秒内约 0.3 米）。打蜡的柚木长条地板一直铺到尽头；右侧（南）十一扇细钢窗棂的高拱窗透进冷银色月光，在地板上每 4 米铺出一个拱形光斑，节拍稳定。四个通高无框立柜左右错落而立，暗玻璃只接着月光，尚未映出任何画面。两侧墙上约十四个小壁柜，里面 3000K 的暖色光斑永远焦外、永不解析成画面。左墙一个门洞透出展厅的暖光；2.58 秒，修复师（深灰呢外套、低马尾）小小的剪影在门洞深处走过，向东而去。尽头，透过木框玻璃隔断，是三面窗湾：一张空着的柚木窗凳，前面是零星的港口暖灯。T8 深焦。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
135 mm from x = -44 looking east: vanishing point at (0.50, 0.50); moon pools stepping along the right half of the floor every 4 m; vitrines P1 and P3 at left, P2 and P4 at right, dark glass glinting silver; warm oval bokeh discs of the minor wall vitrines on both walls; a warm-lit doorway in the left wall at (0.30, 0.52); the far bay window with the empty bench and harbour light points centred at (0.50, 0.50).
```
**首帧关键帧 Keyframe · ZH**
```text
135mm，自 x = −44 向东：灭点在 (0.50, 0.50)；月光斑每 4 米一个，沿地板右半边排向远处；左侧是 P1、P3，右侧是 P2、P4，暗玻璃闪着银光；两侧墙上小壁柜的暖色椭圆焦外光斑；左墙一个亮着暖光的门洞在 (0.30, 0.52)；尽头窗湾、空长凳与港口灯点居中于 (0.50, 0.50)。
```
**末帧 / 匹配规格 End frame**
```text
Same composition about 1% tighter; the doorway empty again; the bench still empty; nothing resolved in any vitrine.
```
**图生视频运动 Motion · EN**
```text
Motion-control dolly push forward about 0.3 m over 4.2 s starting at 0.70 s ('重拍'), 12-frame ease-in, no pan, no tilt, 24 fps. At 2.58 s her small silhouette passes across the doorway glow (about 1.2 s, walking east, into depth). Harbour lights steady; moon pools static. Must NOT: minor-vitrine glows sharpen; hero vitrines show eras; anyone appears on the bench; any camera wobble.
```
**图生视频运动 Motion · ZH**
```text
运动控制轨道 0.70 秒（重拍）起向前推进约 0.3 米、历时 4.2 秒，12 帧缓入，不摇不仰，24 fps。2.58 秒她小小的剪影穿过门洞的暖光（约 1.2 秒，向东、走向纵深）。港口灯光稳定；月光斑静止。不得：小壁柜光斑变清晰；主展柜映出时代；长凳上出现人；任何机身晃动。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 4.88 | single generation, request 6 s with 0.5 s head (static) and 0.6 s tail handles |

**分层与合成 Plates & compositing**

- **Plate A**：Corridor plate, 135 mm, as described (single generation)
- **Plate B**：Optional minor-vitrine glow element: fourteen unresolved warm glows (a fisher's lamp, a stove, a lighthouse sweep, a night-market window) rendered fully defocused (circle of confusion >= 30 px) and comped into the wall niches if the model resolves them
- **Plate C**：Optional restorer silhouette crossing the gallery doorway, comped at 2.58 s
- **合成 / 速度 / 调色 / 同步（post）**：Record the MoCo path and corridor coordinates (S066 hero move uses the same geometry). Anamorphic oval bokeh. Note flagged to director: from the corridor's west end a north-wall doorway is seen at a 4-8 degree grazing angle, so the gallery interior near G3b/G3c cannot be seen; the silhouette is staged crossing just inside the doorway. Grade CT_MODERN; 02:10 moon due south, so the pools lie square to the south wall.

**连续性锚点 match_to**：Plants the corridor geography and the empty bay bench for S059-S066 (S066 reuses this geometry; S059 is when he sits there). IN: band re-entry at 96.85 s (cut at 96.917 s).

**负面提示词（追加在全局负面之后）**
```text
anyone on the window bench, era images in the hero vitrines, minor vitrines in focus or showing pictures, readable labels, ceiling lights on, fog, haze, light shafts in the air, shaky camera, moon disc in frame, cyan cast, wide-angle distortion
```

### 间奏 INTERLUDE

#### S028 · 01:41:19 – 01:44:15 · 2.833 s（f2443–f2511）

| 项目 | 内容 |
|---|---|
| 歌词 | —（无演唱） |
| 段落 / 简报章节 / 时代 / 场景 | INTERLUDE 间奏 / gap / 现代 / `museum_gallery` |
| 景别 / 焦段 / 速度 | MS / 50 mm / 24 |
| 入点转场 | 切 0 帧 — 长廊 → 同一层的展厅（她刚走回 G3c） |
| 同步点 | 102.17 s 他从铸铁柱之间出现；103.37 s 人声进入的重音上：他点头 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_GUARD` `PROP_CASE` `PROP_GLOVES` `PROP_PHONE` `PROP_COAT` `PROP_FLASHLIGHT` `LOC_GALLERY` |
| 调色 | 现代夜间 |
| 生成时长 | 2.833 s |

**文生视频提示词 T2V · EN**
```text
Medium shot, 50 mm anamorphic, eye level, locked, night museum gallery, waxed teak floor, dark cast-iron columns, cold silver moonlight shafts from doorways at screen-right. Soft in the foreground left of centre, the left shoulder and back of the RESTORER (~28-year-old East Asian woman, low loose ponytail, charcoal wool coat with the small worn spot on the outer side of her LEFT cuff resting on the plinth edge, thin warm-white cotton gloves), doing a condition check at a tall vitrine standing open at frame-left, lit inside by a small hooded 3500K inspection lamp. At 0.38 s the GUARD (~65-year-old East Asian night attendant, slightly stooped upper back, square-round face, three forehead lines, gentle down-turned eyes, a pale-brown age spot on his RIGHT cheekbone, short salt-and-pepper hair thinning at the crown, navy jacket a little big at the shoulders with an invented text-free silver ring-and-waves badge, reading glasses on a black cord, left hand behind his back) appears between the columns at right, walking slowly, a black flashlight in his right hand, its 4000K beam aimed at the floor. Focus racks from her to him. He stops a few steps away, looks at her and, at 1.58 s, gives one very small real-time nod. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中景，50mm 变形宽银幕镜头，平视，锁定；夜间展厅，打蜡柚木地板、纤细的深灰绿铸铁柱、砖墙，冷银月光光柱从画右的门洞斜射进来。前景画面中偏左、柔焦的，是修复师的左肩与背（约28岁东亚女性，低马尾，深灰呢外套——左袖口外侧那块小小的磨损压在展台边沿，略暖白的薄棉手套），她正在画左一面打开的高立柜前做状况检查，柜内只有一盏加了遮光罩的 3500K 小检查灯照着。0.38 秒，夜班工作人员（约65岁东亚男子，上背微驼，方中带圆的脸，额头三道横纹，眼角下垂、目光温和，右颧骨一块浅褐色老年斑，灰多黑少的短发、头顶略稀，藏青值守夹克肩部略显宽大，左胸一枚虚构的、无任何文字的银灰圆环水波纹徽章，老花镜挂在黑色挂绳上，左手背在身后）从画右的铸铁柱之间慢慢走出，右手拿着黑色手电筒，4000K 光束朝着地面。焦点从她移到他。他在几步外停下，看了看她，1.58 秒，以真实速度轻轻点了一下头，幅度很小。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
50 mm locked: G3c standing open at frame-left (x 0-0.22), warm from the hooded lamp, the edge of the rattan case inside; the restorer's left shoulder and back soft at (0.35, 0.50), about 60% of frame height, her left forearm on the plinth edge with the cuff worn spot; deep background right: cast-iron columns at x 0.62 and 0.80 with moonlight shafts across the floor; an empty gap between the columns at (0.72, 0.55).
```
**首帧关键帧 Keyframe · ZH**
```text
50mm 锁定：画左（x 0–0.22）是打开的 G3c，被遮光检查灯照得微暖，柜内露出藤箱一角；修复师柔焦的左肩与背在 (0.35, 0.50)，约占画面高度 60%，左前臂压在展台边沿、袖口磨损可见；背景深处画右：x 0.62 与 0.80 两根铸铁柱，月光光柱斜过地板；两柱之间 (0.72, 0.55) 是空的。
```
**末帧 / 匹配规格 End frame**
```text
Guard sharp between the columns at (0.70, 0.52), about 40% of frame height, flashlight pool on the floor by his feet, head just lifting after the nod; the restorer soft in the foreground, unchanged.
```
**图生视频运动 Motion · EN**
```text
Camera locked, 24 fps. Guard walks in 0.38-1.2 s at a slow 0.6 m/s and stops at 1.2 s; focus rack from her to him 0.6-1.4 s (>=1 beat); nod at 1.58 s (on the 103.37 vocal accent): about 4 degrees down and up in 0.5 s, real time. Restorer: only tiny hand movements in the case. Beam stays on the floor. Must NOT: he speaks or waves; she turns; the beam sweeps the lens; any slow motion.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定，24 fps。0.38–1.2 秒他以每秒 0.6 米慢慢走入，1.2 秒停下；0.6–1.4 秒焦点从她移到他（≥1 拍）；1.58 秒（103.37 人声重音）点头：约 4°、0.5 秒内一低一抬，真实速度。修复师只在柜内有极小的手部动作。光束始终朝地。不得：他说话或挥手；她转身；光束扫过镜头；任何慢动作。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.83 | single generation, request 4 s with 0.5 s head and 0.6 s tail handles |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Grade CT_MODERN. Keep the nod inside the centre third of frame so it reads; no retime. The phone stays unseen in his right jacket pocket (planted for S060). G3c front is OPEN in S028-S030 and must be closed again before S040/S041 (flagged).

**连续性锚点 match_to**：IN: S027 corridor -> gallery. OUT: S029 same axis, tighter (her left profile, him in background right). The nod is paid off by her nod in S065 - keep amplitude about 4 degrees.

**负面提示词（追加在全局负面之后）**
```text
beam pointed at faces or lens, readable badge text, logo, rank insignia, phone in hand, broad smile, big nod, bow, ring on his hand, ceiling lights, slow-motion nod, her facing the camera, wear spot on the right cuff
```

#### S029 · 01:44:15 – 01:47:21 · 3.250 s（f2511–f2589）

| 项目 | 内容 |
|---|---|
| 歌词 | —（无演唱） |
| 段落 / 简报章节 / 时代 / 场景 | INTERLUDE 间奏 / gap / 现代 / `museum_gallery` |
| 景别 / 焦段 / 速度 | MCU / 75 mm / 24 |
| 入点转场 | 切 0 帧 — 正反打：他点头 → 她回应 |
| 同步点 | 104.99 s 她抬眼；105.3 s 她短暂点头；105.5 s 目光落回柜内；105.6 s 焦点开始移向背景的他（至 106.4）；106.9 s 他转身；107.8 s 手电光束远去 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_GUARD` `PROP_GLOVES` `PROP_COAT` `PROP_FLASHLIGHT` `LOC_GALLERY` |
| 调色 | 现代夜间 |
| 生成时长 | 3.25 s |

**文生视频提示词 T2V · EN**
```text
Medium close-up, 75 mm anamorphic, eye level, locked, night museum gallery. The RESTORER (~28-year-old East Asian woman, soft oval face, straight natural brows, inner double eyelids, a tiny light-brown mole below the outer corner of her LEFT eye, faint tiredness under the eyes, low loose ponytail, no make-up, charcoal wool coat #3C4045, thin warm-white cotton gloves) in left profile, facing screen-left into an open vitrine; a hooded 3500K inspection lamp warms the lower half of her face. Behind her, soft in the background right between cast-iron columns, the GUARD (stooped ~65-year-old East Asian night attendant in a navy jacket, reading glasses on a black cord, flashlight beam aimed at the floor). At 0.37 s she lifts her eyes toward him; at 0.68 s a brief, distracted nod; at 0.88 s her eyes drop back to the case. Focus racks to him from 0.98 s to 1.78 s: he lingers half a second, small and alone; at 2.28 s he turns away; at 3.18 s his flashlight beam recedes along the teak floor. Cool silver moonlight from screen-right doorways. Warm living skin. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中近景，75mm 变形宽银幕镜头，平视，锁定，夜间展厅。修复师（约28岁东亚女性，鹅蛋脸，自然平直的眉，内双眼皮，左眼外眼角下方一颗极小的浅褐色痣，眼下有一点熬夜的疲惫，低马尾，不化妆，深灰呢外套 #3C4045，略暖白的薄棉手套）以左侧脸入画，面朝画左、对着打开的立柜；加了遮光罩的 3500K 检查灯照暖了她的下半张脸。她身后，背景画右的铸铁柱之间，柔焦的是夜班工作人员（背微驼的约65岁东亚男子，藏青夹克，老花镜挂在黑色挂绳上，手电光束朝着地面）。0.37 秒她抬眼看向他；0.68 秒匆匆、心不在焉地点了一下头；0.88 秒目光落回箱子。0.98 秒到 1.78 秒焦点转到他身上：他在原地多停了半秒，小小的、一个人；2.28 秒他转身离开；3.18 秒手电光束沿柚木地板慢慢远去。冷银月光来自画右的门洞。肤色温暖鲜活。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Her left profile sharp at (0.32, 0.42), head about 45% of frame height, eyes down toward the case at frame-left, mole below the left eye visible, inspection-lamp warmth on her chin; background right: the guard soft at (0.72, 0.50) between two columns, flashlight pool on the floor.
```
**首帧关键帧 Keyframe · ZH**
```text
她的左侧脸清晰地位于 (0.32, 0.42)，头部约占画面高度 45%，目光向下看着画左的箱子，左眼下的小痣可见，检查灯的暖光落在下巴；背景画右：柔焦的他站在两根柱子之间 (0.72, 0.50)，手电在地上照出一圈光。
```
**末帧 / 匹配规格 End frame**
```text
Focus on the background: the guard has turned and is walking off screen-right, the flashlight pool sliding away on the floor at (0.80, 0.80); the restorer soft in the foreground, eyes on the case.
```
**图生视频运动 Motion · EN**
```text
Camera locked, 24 fps. 0.37 s eyes up and slightly right; 0.68 s quick nod, about 3 degrees; 0.88 s eyes back down. Focus rack 0.98-1.78 s (>=1 beat). 2.28 s he turns away, walks slowly (0.6 m/s) off right; 3.18 s beam recedes. Must NOT: she leaves or turns her body; camera moves; any slow motion on either nod.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定，24 fps。0.37 秒抬眼并略向右；0.68 秒快速点头约 3°；0.88 秒目光落回。0.98–1.78 秒转焦（≥1 拍）。2.28 秒他转身，以每秒 0.6 米慢慢向画右走开；3.18 秒光束远去。不得：她离开或转身；摄影机移动；两次点头都不得慢动作。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.25 | single generation, request 4 s with 0.4 s head and 0.35 s tail handles |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Grade CT_MODERN. The skeleton calls this a shot/reverse-shot, but both S028 and S029 hold him background-right of her on the same axis - staged here as a tighter same-axis set-up (no axis jump).

**连续性锚点 match_to**：IN: S028 nod -> her reply. OUT: S030 what she is looking at. Payoff in S065 (she nods to him).

**负面提示词（追加在全局负面之后）**
```text
held eye contact, smiling, dialogue, beam into lens, guard sharp before the rack, cyan, readable labels, jewellery, wristwatch, slow motion, her mole on the right side
```

#### S030 · 01:47:21 – 01:49:21 · 2.000 s（f2589–f2637）

| 项目 | 内容 |
|---|---|
| 歌词 | —（无演唱） |
| 段落 / 简报章节 / 时代 / 场景 | INTERLUDE 间奏 / gap / 现代 / `museum_gallery` |
| 景别 / 焦段 / 速度 | INSERT / 75 mm / 24 |
| 入点转场 | 切 0 帧 — 她回到工作 → 她在看的东西 |
| 同步点 | 108.67 s 检查灯照进箱内；109.5 s 手套抚过衣领折痕 |
| 参考图 refs | `CHAR_RESTORER` `PROP_SHIRT` `PROP_CASE` `PROP_KEEPSAKE` `PROP_PASS` `PROP_GLOVES` `LOC_GALLERY` |
| 调色 | 现代夜间 |
| 生成时长 | 2.0 s |

**文生视频提示词 T2V · EN**
```text
Insert, 75 mm anamorphic, high angle 80 degrees looking down into an open rattan suitcase inside a museum vitrine at night, slow push-in about 8% over 2 s. The case is in its museum state: honey-amber split rattan over bamboo, darkened at the handle, one corner's rattan broken and lifted, dried cracked leather straps, dull brass buckles, an indigo resist-print lining with small white flowers. Folded inside: a family member's old men's shirt, faded grey-blue #8392A0 with whitened fold lines and a mended collar, the small cut-away triangle at its lower-right hem facing up; on its top-right corner a boxwood comb, 34 teeth with two worn short, lying on its untied square of faded red-brown cotton #8E4A3C. At the frame edge, a folded cream travel permit with a grey-green guilloche border and four empty photo corner-mounts. At 0.80 s the hooded 3500K inspection lamp rakes across the cotton creases from frame-right; at 1.63 s the RESTORER's hand in a thin warm-white cotton conservator glove, faint brass smudge on the index tip, strokes flat along the collar fold, left to right. Near-black velvet, 3000K vitrine glow. Tactile fibre texture. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
插入镜头，75mm 变形宽银幕镜头，80° 高角度俯视夜间博物馆立柜里一只打开的藤箱，缓慢推进，2 秒约 8%。藤箱是博物馆状态：竹框外包蜂蜜琥珀色劈藤，提手处被手汗浸深，一角藤条断裂翘起，皮带干裂，黄铜带扣发暗，内衬是带白色小碎花的蓝印花布。箱内叠放着一件家人的男式旧衫，褪成灰蓝 #8392A0，折痕处发白，领口补过，衣摆右下角被剪去的小三角朝上可见；旧衫右上角平放着一把黄杨木梳（34 齿，两齿磨短），垫在解开的褪色红褐棉布 #8E4A3C 上。画面边缘，是一张对折的米色通行纸，灰绿扭索纹边框，四个空的照片相角。0.80 秒，加了遮光罩的 3500K 检查灯从画右掠射过棉布折痕；1.63 秒，修复师戴暖白薄棉修复手套的手（食指指尖一点淡淡黄铜污迹）沿衣领折痕从左向右轻轻抚平。近黑的绒布，3000K 柜内微光。纤维质感可触。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
80-degree top-down: case interior fills about 85% of frame width; the rattan-wrapped handle at the bottom edge (y 0.94); folded shirt block centred (0.48, 0.52), about 55% of frame height; collar fold at (0.40, 0.40); cut hem corner at (0.66, 0.68); unwrapped comb on its cloth at (0.64, 0.34); permit at the right edge (x > 0.90) with four empty corners; inspection lamp still off - dim 3000K only.
```
**首帧关键帧 Keyframe · ZH**
```text
80° 俯拍：箱内占画面宽度约 85%；藤皮缠绕的提手在画面下沿（y 0.94）；叠好的旧衫方块居中 (0.48, 0.52)，约占画面高度 55%；衣领折痕在 (0.40, 0.40)；衣摆缺角在 (0.66, 0.68)；解开的包布与木梳在 (0.64, 0.34)；通行纸在画面右缘（x > 0.90），四个空相角；检查灯尚未照入，只有暗暗的 3000K。
```
**末帧 / 匹配规格 End frame**
```text
Gloved palm flat on the collar fold at (0.42, 0.42), mid-stroke moving right; raking 3500K light from frame-right; case, handle at the bottom edge and shirt-block position identical to S031's first frame (fabric match A-frame, T13).
```
**图生视频运动 Motion · EN**
```text
Slow push about 8%, 12-frame ease-in, 24 fps. 0.80 s the inspection light swings in from the right over 0.3 s, soft. The gloved hand enters from bottom-left at 1.2 s; at 1.63 s it is mid-stroke along the collar - cut on the stroke. Must NOT: comb moves, shirt lifts, permit moves, glove grips.
```
**图生视频运动 Motion · ZH**
```text
缓慢推进约 8%，12 帧缓入，24 fps。0.80 秒检查灯光在 0.3 秒内从画右柔和地扫入。戴手套的手 1.2 秒从左下入画；1.63 秒正沿衣领抚到一半——在抚的动作中切出。不得：木梳移动、旧衫被掀起、通行纸移动、手套抓握。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.0 | single generation, request 3 s with 0.5 s head handle; keep a 0.5 s tail of the stroke for the mid-stroke cut |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Lock the frame at 2.0 s as the A-frame for S031 (T13) and hand it to S031's keyframe as image reference. Grade CT_MODERN. G3c front open here (condition check).

**连续性锚点 match_to**：OUT: fabric match T13 - gloved palm mid-stroke on the collar at (0.42, 0.42) -> S031 bare palms mid-press on the same shirt in the same composition. Comb position (0.64, 0.34) = where she places it in S033.

**负面提示词（追加在全局负面之后）**
```text
bright new shirt, unbroken rattan, shiny buckles, readable writing on the permit, a photo in the corner-mounts, plastic, museum labels, comb still wrapped, rough handling, bare hands, red lining
```

### 主歌二 V2

#### S031 · 01:49:21 – 01:51:22 · 2.042 s（f2637–f2686）

| 项目 | 内容 |
|---|---|
| 歌词 | 旧衫叠进藤箱／乡音留在唇边 |
| 段落 / 简报章节 / 时代 / 场景 | V2 主歌二 / 五 / 迁徙 / `pier_waiting` |
| 景别 / 焦段 / 速度 | INSERT / 75 mm / 48 (50% slow motion) |
| 入点转场 | 匹配剪辑 0 帧 — 衣料运动：S030 手套抚过衣领折痕 → 她的手掌压平同一处衣领与衣角（同一衣物、同一构图；剪点在压平动作中段；T13） |
| 同步点 | 110.35 s “叠进”：衣衫落入箱中；110.95 s “箱”：手掌压平衣角 |
| 参考图 refs | `CHAR_MIGRANT` `PROP_SHIRT` `PROP_CASE` `LOC_PIER` |
| 调色 | 迁徙时代 |
| 生成时长 | 2.042 s |

**文生视频提示词 T2V · EN**
```text
Insert, 75 mm anamorphic, high angle 80 degrees looking down, locked, the same composition as the museum shot before it, rendered as 48 fps slow motion (50% speed). A 1920s-30s steamer waiting shed at blue hour just after rain; a honey-amber rattan suitcase open on the MIGRANT's knees, bright brass buckles, crisp indigo resist-print lining with small white flowers. Inside lies the same men's shirt, newer: faded grey-blue #6F7F8F cotton, seven cloth buttons, mended collar, a small 3x4 cm triangle cut from its lower-right hem, folded to a 30x22 cm block. The MIGRANT's small strong hands (very short nails, a writing callus on the right middle finger, backs a little red; cuffs of her faded grey-blue floral blouse with white and faded-rose five-petal flowers) are pressing the collar flat at the cut and lift; at 0.48 s the last folded third settles down into the case, cotton falling softly; at 1.08 s her whole palm presses the hem corner flat, then once more at 1.6 s; the cut triangle flashes under her palm. Light: 2400K enamel-shaded bulb from upper right, cool blue-hour skylight from the open seaward side. Real cotton creases. Migrant-era grade: faded-photograph softness, saturation -15%, creamy highlights, never sepia; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
插入镜头，75mm 变形宽银幕镜头，80° 高角度俯拍，锁定，与上一个博物馆镜头构图完全相同，以 48 fps 慢动作呈现（50% 速度）。1920–30 年代轮船候船棚，刚下过雨的蓝调时刻；一只蜂蜜琥珀色的藤箱打开着放在迁徙女性的膝上，黄铜带扣明亮，蓝印花布内衬崭新、带白色小碎花。箱里是同一件男式旧衫，此刻还新：褪色灰蓝 #6F7F8F 棉布，七粒布纽，领口补过，衣摆右下角剪去一个 3×4 厘米的小三角，叠成 30×22 厘米的方块。迁徙女性小而有力的双手（指甲剪得很短，右手中指有握笔的小茧，手背微红；褪色灰蓝碎花衫的袖口，白色与褪玫色的小五瓣花）在切入时正压平衣领，随即抬起；0.48 秒最后折过来的那三分之一轻轻落进箱里，棉布柔软地落下；1.08 秒她用整个手掌把衣角压平，1.6 秒又压一次；那个剪去的三角在她掌心下一闪而过。光：画右上方搪瓷灯罩白炽灯 2400K，开敞的临海一侧透进冷色的蓝调天光。真实的棉布折痕。迁徙时代调色：褪色家庭照片般的柔和，饱和度 −15%，高光微奶油，绝不做棕褐；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Identical to S030's end frame: case interior about 85% of frame width; handle at the bottom edge; shirt block centred (0.48, 0.52); her bare palms mid-press on the collar at (0.42, 0.42); the last third-fold flap slightly raised along the right side of the block; no comb yet; warm bulb light upper right, cool skylight edge on the lining.
```
**首帧关键帧 Keyframe · ZH**
```text
与 S030 末帧完全相同：箱内约占画面宽度 85%；提手在下沿；旧衫方块居中 (0.48, 0.52)；她的双掌正压在衣领 (0.42, 0.42) 上；最后一折的三分之一还微微翘在方块右侧；还没有木梳；右上方是暖色灯泡光，内衬边缘有一线冷色天光。
```
**末帧 / 匹配规格 End frame**
```text
Her palm pressing the hem corner at (0.62, 0.64), the cut triangle just visible at its edge; shirt flat and squared in the case; lining edges visible; no comb.
```
**图生视频运动 Motion · EN**
```text
Rendered as 48 fps-captured slow motion played at 24 fps (all motion at 50% speed). Camera locked. 0-0.3 s palms finish the press and lift; 0.3-0.6 s the last third settles (cloth fall, '叠进' at 0.48 s); 1.08 s ('箱') whole-palm press on the corner with a half-beat hold; 1.6 s second press. Must NOT: refold the whole shirt, move the case, add the comb, speed up.
```
**图生视频运动 Motion · ZH**
```text
以 48 fps 拍摄、24 fps 播放的慢动作呈现（所有动作 50% 速度）。摄影机锁定。0–0.3 秒双掌完成按压并抬起；0.3–0.6 秒最后三分之一落下（布料下落，0.48 秒“叠进”）；1.08 秒（“箱”）整个手掌压平衣角并停半拍；1.6 秒第二次压平。不得：把整件衣服重新折一遍、移动藤箱、放入木梳、加快速度。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.04 | single generation, request 3 s slow-motion look; S030's final frame is the image reference for the first frame |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：T13 cut mid-press from S030 (gloved stroke -> bare press). Keep the slow-motion cadence clean (no frame-blend ghosting). Grade CT_MIG. The skeleton's action (fold in half, fold in three, place, press twice) cannot fit 1.0 s of real time and contradicts the mid-press cut - only the settle and two presses are shown (flagged).

**连续性锚点 match_to**：IN: S030 end frame (composition + collar position, T13). OUT: S032 from hands to her face.

**负面提示词（追加在全局负面之后）**
```text
comb in the case (not yet placed), museum damage, broken rattan, gloves, sepia wash, red lining, zipper, plastic, refolding the whole shirt, fast motion, motion-blur smear, extra fingers, fused fingers, case in her left hand
```

#### S032 · 01:51:22 – 01:54:13 · 2.625 s（f2686–f2749）

| 项目 | 内容 |
|---|---|
| 歌词 | 乡音留在唇边／你想被世界看见 |
| 段落 / 简报章节 / 时代 / 场景 | V2 主歌二 / 五 / 迁徙 / `pier_waiting` |
| 景别 / 焦段 / 速度 | MCU / 100 mm / 24 |
| 入点转场 | 切 0 帧 — 由手到人 |
| 同步点 | 111.92 s “乡音”：她回头；112.33 s “唇边”：嘴唇无声地动；114.13 s “看见”：她仍望着 |
| 参考图 refs | `CHAR_MIGRANT` `PROP_CASE` `LOC_PIER` |
| 调色 | 迁徙时代 |
| 生成时长 | 2.625 s |

**文生视频提示词 T2V · EN**
```text
Medium close-up, 100 mm anamorphic, eye level, limited natural handheld with only a small breathing motion, a 1920s-30s steamer waiting shed at blue hour after rain. The MIGRANT (~20-year-old East Asian woman, round-square face with full cheeks, large bright wide-set eyes, straight thick brows, a small mole above her RIGHT eyebrow peak, slightly chapped lips, sun-pink cheekbones, one long black braid, faded grey-blue floral cotton blouse #8FA1B3 with small white and faded-rose five-petal flowers) sits facing screen-right; behind her a soft crowd of period travellers flows left to right through 2400K bulb pools. At the cut she turns her head back toward screen-left, toward family beyond a railing, unseen and blurred; at 0.41 s her lips move once, silently, a familiar two-syllable name, no sound, not readable; she keeps looking through 2.21 s, eyes glistening, no tears. Shallow focus on her eyes. Light: warm bulb from upper left, cool blue-hour rim from the open seaward side at right, wet planks reflecting bulbs. Living skin. Migrant-era grade: faded-photograph softness, saturation -15%, creamy highlights, never sepia; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中近景，100mm 变形宽银幕镜头，平视，少量自然手持、只有轻微的呼吸感；1920–30 年代轮船候船棚，雨后的蓝调时刻。迁徙女性（约20岁东亚女子，圆中带方的脸、颊肉饱满，大而亮、两眼距离略宽的眼睛，直而浓的眉，右眉峰上方一颗小痣，嘴唇略干，颧骨有一点日晒的红，一条长长的黑辫子，褪色灰蓝碎花棉布大襟衫 #8FA1B3，白色与褪玫色的小五瓣花）面朝画右坐着；她身后，柔焦的旧时代旅客人群从画左向画右穿过 2400K 的灯泡光池。切入时她回头望向画左——栏杆外的家人，看不见、虚化；0.41 秒她的嘴唇无声地动了一下，像在念一个熟悉的双音节称呼，没有声音、不可读唇；她一直望着，直到 2.21 秒，眼里有光，但没有眼泪。浅景深，焦点在她的眼睛。光：左上方暖色灯泡，右侧开敞的临海一侧有冷色蓝调轮廓光，湿木板映着灯泡。肤色鲜活。迁徙时代调色：褪色家庭照片般的柔和，饱和度 −15%，高光微奶油，绝不做棕褐；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Her three-quarter face at (0.58, 0.40) facing screen-right, head about 55% of frame height, mole above the right brow visible; braid over her left shoulder; crowd bokeh flowing behind at left and right; warm bulb bokeh at upper left; cool rim on her right cheek.
```
**首帧关键帧 Keyframe · ZH**
```text
她的四分之三侧脸在 (0.58, 0.40)，面朝画右，头部约占画面高度 55%，右眉峰上的小痣可见；辫子搭在左肩；身后左右是流动的人群焦外光斑；左上方暖色灯泡光斑；右颊一线冷色轮廓光。
```
**末帧 / 匹配规格 End frame**
```text
Head turned to screen-left three-quarter, eyes toward the frame-left edge, lips closed after the silent word, face at (0.52, 0.42); crowd still flowing behind.
```
**图生视频运动 Motion · EN**
```text
Handheld breathing drift no more than 1% of frame, 24 fps; the camera follows her head turn 0-0.5 s with a slight pan left (no more than 3 degrees). 0.41 s ('唇边') one silent two-syllable mouth movement; then still, looking. Crowd flows left to right at walking pace, soft. Must NOT: audible speech, crying, camera shake, crowd direction reversed.
```
**图生视频运动 Motion · ZH**
```text
手持呼吸感漂移不超过画面 1%，24 fps；0–0.5 秒随她回头轻微向左摇（不超过 3°）。0.41 秒（“唇边”）嘴唇无声地动一次、双音节；之后静止地望着。人群以步行速度从左向右流动，柔焦。不得：出声说话、哭泣、镜头抖动、人群方向反转。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.62 | single generation, request 3.5 s with 0.4 s head and 0.5 s tail handles |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Grade CT_MIG. Keep lips unreadable (soft focus on mouth if needed). Seeing-off relative has no bible id: attach supplementary ref XREF_ELDER_HAND (bible 5.5a) across S032-S039.

**连续性锚点 match_to**：Eyeline screen-left (family/home). OUT: cause and effect into S033 (she reopens the case).

**负面提示词（追加在全局负面之后）**
```text
falling tears, crying, open-mouth speech, readable lip words, crowd faces sharp, modern clothes, zippers, wristwatches, eyeglasses, sepia, over-smoothed skin, shaky documentary camera, crowd flowing right to left
```

#### S033 · 01:54:13 – 01:56:16 · 2.125 s（f2749–f2800）

| 项目 | 内容 |
|---|---|
| 歌词 | 还是被一颗心挂念 |
| 段落 / 简报章节 / 时代 / 场景 | V2 主歌二 / 五 / 迁徙 / `pier_waiting` |
| 景别 / 焦段 / 速度 | CU / 75 mm / 24 |
| 入点转场 | 切 0 帧 — 回头望见家人 → 因此重新打开箱子（因果剪辑） |
| 同步点 | 115.33 s “一颗心”：箱盖重新打开；116.29 s “念”：木梳放在最上面并按一下 |
| 参考图 refs | `CHAR_MIGRANT` `PROP_SHIRT` `PROP_CASE` `PROP_KEEPSAKE` `LOC_PIER` |
| 调色 | 迁徙时代 |
| 生成时长 | 2.125 s |

**文生视频提示词 T2V · EN**
```text
Close-up, 75 mm anamorphic, high angle about 70 degrees from her side, locked, a 1920s-30s waiting shed under a 2400K enamel-shaded bulb. A honey-amber rattan suitcase (split rattan over bamboo, leather corners, brown leather straps unbuckled, bright brass buckles, lid hinged at the far side) rests closed on the MIGRANT's knees, folds of her faded grey-blue floral blouse at frame-bottom. Her left hand lifts the lid away from camera; by 0.79 s it stands open, showing the indigo resist-print lining and the folded faded grey-blue shirt. Her right hand, small with very short nails and a writing callus on the middle finger, enters from frame-bottom with a little bundle taken from her blouse front: a boxwood comb wrapped in a 15 cm square of faded red-brown cotton #8E4A3C. She lays it on the shirt's top-right corner; at 1.75 s she presses it once with her palm, then holds still for half a beat. Warm bulb light from above, the hand-darkened rattan handle catching highlights, cool blue-hour fill from the right. Real cotton and rattan texture. Migrant-era grade: faded-photograph softness, saturation -15%, creamy highlights, never sepia; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
近景，75mm 变形宽银幕镜头，从她这一侧约 70° 高角度俯拍，锁定；1920–30 年代候船棚，一盏 2400K 搪瓷灯罩白炽灯下。一只蜂蜜琥珀色藤箱（竹框外包劈藤、四角包皮、棕色皮带已解开、黄铜带扣明亮、箱盖合页在远端）合着放在迁徙女性的膝上，画面下沿是她褪色灰蓝碎花衫的衣褶。她的左手把箱盖向远离镜头的方向掀起；0.79 秒箱盖立起，露出蓝印花布内衬和叠好的褪色灰蓝旧衫。她的右手——小手，指甲很短，中指有握笔的茧——从画面下沿入画，拿着刚从衣襟里取出的小布包：一把用 15 厘米见方的褪色红褐棉布 #8E4A3C 包着的黄杨木梳。她把它放在旧衫的右上角；1.75 秒用手掌按了一下，然后停住半拍。暖色灯泡光从上方来，被手握深的藤提手上有高光，右侧有冷色蓝调补光。真实的棉布与藤编质感。迁徙时代调色：褪色家庭照片般的柔和，饱和度 −15%，高光微奶油，绝不做棕褐；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
70-degree high angle: the closed case fills about 80% of frame width, woven lid with straps hanging unbuckled; her left fingertips under the near edge of the lid at (0.30, 0.70); blouse folds along the bottom edge; warm bulb highlight on the lid.
```
**首帧关键帧 Keyframe · ZH**
```text
70° 高角度：合着的藤箱约占画面宽度 80%，编织箱盖上皮带解开垂着；她左手指尖扣在箱盖近端边沿下 (0.30, 0.70)；下沿是衣褶；暖色灯泡在箱盖上的高光。
```
**末帧 / 匹配规格 End frame**
```text
Lid open beyond the top of frame; shirt block centred; the wrapped comb on the shirt's top-right corner at (0.64, 0.34) - the same spot it occupies in the museum (S030, S049); her palm resting on it, still.
```
**图生视频运动 Motion · EN**
```text
Camera locked, 24 fps. Lid lift 0.05-0.79 s, smooth ('一颗心' at 0.79 s); right hand enters at 0.9 s; places the bundle at 1.4 s; palm press at 1.75 s ('念'); still to 2.12 s. Must NOT: unwrap the comb, drop it, slam the lid; the lid does not close inside this shot (no time - flagged).
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定，24 fps。0.05–0.79 秒平稳地掀起箱盖（0.79 秒“一颗心”）；0.9 秒右手入画；1.4 秒放下布包；1.75 秒（“念”）掌心按一下；静止到 2.12 秒。不得：解开包布、掉落木梳、用力合盖；本镜头内不合上箱盖（时间不够——已向导演标注）。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.12 | single generation, request 3 s with 0.4 s head and 0.5 s tail handles |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Grade CT_MIG. Comb-bundle position must match the museum layout (0.64, 0.34). The skeleton also asks her to close the lid after the 1.75 s press, leaving 0.37 s - dropped here; lid closing can be implied by the cut (flagged).

**连续性锚点 match_to**：IN: S032 look back -> reopens the case (cause and effect). Comb position = S030 museum state. OUT: S034 warm insert.

**负面提示词（追加在全局负面之后）**
```text
lid slamming shut, comb unwrapped, bright saturated red cloth, plastic, sepia, extra fingers, case in her left hand, museum damage, broken rattan, gloves, zipper
```

#### S034 · 01:56:16 – 01:58:08 · 1.667 s（f2800–f2840）

| 项目 | 内容 |
|---|---|
| 歌词 | 还是被一颗心挂念／你爱哪味甜／为谁红过脸 |
| 段落 / 简报章节 / 时代 / 场景 | V2 主歌二 / 五 / 迁徙 / `pier_waiting` |
| 景别 / 焦段 / 速度 | INSERT / 100 mm / 24 |
| 入点转场 | 切 0 帧 — 同一人物，暖光插入组之一（T14） |
| 同步点 | 117.25 s “哪味甜”：油纸包被塞进她手里；117.91 s “甜”：年长的手把她的手指合拢 |
| 参考图 refs | `CHAR_MIGRANT` `PROP_SWEETS` `LOC_PIER` |
| 调色 | 迁徙时代 |
| 生成时长 | 1.667 s |

**文生视频提示词 T2V · EN**
```text
Insert, 100 mm anamorphic, eye level, locked with a micro push of about 3%, a 1920s-30s steamer waiting shed at night. Two pairs of hands, backlit: at centre the MIGRANT's small strong hands cupped palm-up (very short nails, a writing callus on the right middle finger, backs a little red, cuffs of a faded grey-blue floral blouse with small white and faded-rose five-petal flowers). From screen-left comes an older woman's hand, the seeing-off relative: thick knuckles, soft loose skin on the back, a dark-blue cotton cuff #2E3A52. At 0.58 s it presses a 10x8 cm packet of translucent honey oil-paper, tied crosswise with a thin red cotton string, into her palms, then folds her fingers closed over it by 1.24 s. A 2400K enamel-shaded bulb behind the packet makes the oil paper glow honey-gold, revealing soft shadows of peanut-sesame brittle and sugar-frosted candied winter-melon strips inside. Gentle, unhurried, real time. Shallow focus on the packet and fingertips, deep warm-brown bokeh behind. Soft halation around the bulb, true skin texture. Migrant-era grade: faded-photograph softness, saturation -15%, creamy highlights, never sepia; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
插入镜头，100mm 变形宽银幕镜头，平视，锁定并微推约 3%；1920–30 年代轮船候船棚，夜。两双手，逆光：画面中央是迁徙女性掌心向上捧着的一双小而有力的手（指甲很短，右手中指有握笔的茧，手背微红，褪色灰蓝碎花衫的袖口，白色与褪玫色的小五瓣花）。从画左伸来一只年长女性的手——送行的亲人：指节粗，手背皮肤松软，深蓝布袖口 #2E3A52。0.58 秒，它把一个 10×8 厘米、用细红棉绳十字系紧的半透明蜂蜜色油纸包塞进她的掌心，1.24 秒前又把她的手指合拢在纸包上。纸包后面一盏 2400K 搪瓷灯罩白炽灯，把油纸照得像蜂蜜一样发亮，透出里面花生芝麻酥块和撒着糖霜的冬瓜条的柔和影子。轻柔、从容、真实速度。浅景深，焦点在纸包与指尖，身后是深暖褐色的焦外光斑。灯泡周围有柔和光晕，真实的皮肤质感。迁徙时代调色：褪色家庭照片般的柔和，饱和度 −15%，高光微奶油，绝不做棕褐；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Her cupped hands at (0.55, 0.58); the elder's hand entering from frame-left at (0.25, 0.50) holding the glowing packet, red string crossing it; bulb glow soft behind at (0.60, 0.30); dark warm background.
```
**首帧关键帧 Keyframe · ZH**
```text
她捧着的双手在 (0.55, 0.58)；年长者的手从画左 (0.25, 0.50) 入画，拿着发亮的油纸包，红绳十字交叉；灯泡在后方 (0.60, 0.30) 柔和发光；背景暗而暖。
```
**末帧 / 匹配规格 End frame**
```text
The elder's hand wrapped over her closed fingers at (0.52, 0.56), packet edges glowing between the fingers, the red string visible; still.
```
**图生视频运动 Motion · EN**
```text
Micro push 3% over 1.67 s, 24 fps. Hand-over 0.3-0.58 s ('哪味甜'); fingers closed by 1.24 s ('甜'); a slight squeeze, then hold. Giving moves left to right. Must NOT: hands leave frame, packet opens, bulb flickers.
```
**图生视频运动 Motion · ZH**
```text
1.67 秒内微推 3%，24 fps。0.3–0.58 秒（“哪味甜”）递交；1.24 秒（“甜”）前手指合拢；轻轻一握，然后保持。给予方向由左向右。不得：手离开画面、纸包打开、灯泡闪烁。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 1.67 | single generation, request 3 s with 0.5 s head and 0.8 s tail handles |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Grade CT_MIG; the oil-paper glow (P13 family) is the warm source shared with S035/S036 (T14). Elder's hand: attach supplementary ref XREF_ELDER_HAND (no bible id; bible 5.5a). Bible 6.10 says this hand-over happens 'at home'; the skeleton places it at the pier bench - shot list followed (flagged).

**连续性锚点 match_to**：OUT: closing fingers -> S035 fingers pinching the needle (gesture match, T14 warm chain). Same packet returns in S068. Registered: closing fingers at (0.52,0.56) = S035 needle fingers at (0.54,0.58) (+/-3%).

**负面提示词（追加在全局负面之后）**
```text
faces, printed text on the paper, plastic wrap, bright red packaging, ribbon bow, coins, rings, nail polish, extra fingers, fused fingers, giving from screen-right, cellophane
```

#### S035 · 01:58:08 – 02:01:06 · 2.917 s（f2840–f2910）

| 项目 | 内容 |
|---|---|
| 歌词 | 为谁红过脸／恨过谁的欺瞒 |
| 段落 / 简报章节 / 时代 / 场景 | V2 主歌二 / 五 / 旧日家中 / `old_home` |
| 景别 / 焦段 / 速度 | CU / 75 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 手势：S034 被合拢的手指 → 捏针引线的手指（手势相似；跨时代） |
| 同步点 | 118.87 s “红”：她咬断线头，笑意出现；119.5 s 她望向画左门口；119.8 s 焦点开始转向壁龛小灯；120.31 s “谁的”：小灯清晰 |
| 参考图 refs | `CHAR_WIFE` `PROP_PATCH` `PROP_LAMP` `PROP_CANDLE` `LOC_HOME` |
| 调色 | 旧日家中 |
| 生成时长 | 2.917 s |

**文生视频提示词 T2V · EN**
```text
Close-up, 75 mm anamorphic, eye level slightly high, locked, inside an early-17th-century granite stone house at night. The WIFE (slender ~30-year-old woman, black hair in a low bun with a plain wooden hairpin, washed pale-blue cotton jacket #7D9CBB, a thin slightly tarnished silver bangle on her LEFT wrist, an old brass thimble on her left middle finger) sits on a low stool under a cracked-ice lattice window, a faded indigo jacket across her knees with its right cuff turned out: she is sewing a 4.5x6 cm patch of pale-blue cloth, the same cloth as her own jacket, inside the cuff with small off-white running stitches. Only her lower face shows; eyes and brow stay in shadow. At 0.54 s she bites off the thread; a shy smile begins at the corners of her mouth, half hidden in candlelight. At 1.17 s she glances toward the open door at screen-left; focus racks from 1.47 s to 1.98 s past her to the deep background: just beyond the door jamb, a small brown-glazed oil-lamp dish in a granite niche, its steady 2 cm 1900K flame. Light: candle 1850K side-back from screen-right, lattice moonlight shadows on her shoulder. Old-home grade: candle-warm interior against cool lattice moonlight, blacks slightly lifted; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
近景，75mm 变形宽银幕镜头，平视略俯，锁定；17 世纪初花岗岩石屋室内，夜。等待的人（清瘦的约30岁女子，黑发挽成低髻、插一支素面木簪，洗旧的浅蓝粗棉短袄 #7D9CBB，左手腕一只微微氧化的素银细镯，左手中指戴一枚旧铜顶针）坐在冰裂纹木窗格下的矮凳上，膝上搭着一件褪色的靛蓝短褂，右袖口翻了出来：她正在袖口里层缝一块 4.5×6 厘米的浅蓝布补丁——和她自己短袄是同一块布——本白棉线，细小的平针。只露出下半张脸；眼睛和眉毛一直在阴影里。0.54 秒她咬断线头；嘴角先动，一个羞涩的笑，半藏在烛光里。1.17 秒她朝画左敞开的门口看了一眼；1.47–1.98 秒焦点越过她转到深处背景：门框外侧，花岗岩壁龛里一只酱褐釉陶油灯盏，约 2 厘米的 1900K 火苗稳稳地亮着。光：画右侧逆的烛光 1850K，冰裂纹窗格的月影落在她肩上。旧日家中调色：烛光暖色的室内对窗格透入的冷月光，黑位略抬；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
75 mm: her lower face at frame-right (mouth at 0.66, 0.30) bowed toward the cuff; her hands with needle, thimble and the silver bangle on her LEFT wrist, on the turned-out indigo cuff at (0.54, 0.58) (registered to S034's closing fingers at (0.52, 0.56)), pale-blue patch and stitches sharp; lattice shadow across her shoulder; deep background left soft: the dark open doorway with one tiny warm point at (0.22, 0.44).
```
**首帧关键帧 Keyframe · ZH**
```text
75mm：她的下半张脸在画右（嘴在 (0.66, 0.30)），低向袖口；手、针、顶针与左腕银镯在翻出的靛蓝袖口上 (0.54, 0.58)（与 S034 合拢的手指 (0.52, 0.56) 登记对位），浅蓝补丁与针脚清晰；窗格影斜过她的肩；背景深处画左柔焦：暗的门洞，里面一个极小的暖点在 (0.22, 0.44)。
```
**末帧 / 匹配规格 End frame**
```text
Focus on the niche lamp: flame sharp at (0.22, 0.44) just beyond the left door jamb; her lower face a soft warm shape at right, turned slightly left; the needle still in her fingers.
```
**图生视频运动 Motion · EN**
```text
Camera locked, 24 fps. 0-0.54 s last stitch and the bite ('红'); smile 0.6-1.1 s, corners of the mouth first; 1.17 s head turns about 15 degrees left; focus rack 1.47-1.98 s (lamp sharp at '谁的'); hold. Candle and lamp flames breathe slowly. Must NOT: eyes come into light, flames flicker, she stands.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定，24 fps。0–0.54 秒最后一针与咬线（“红”）；0.6–1.1 秒笑意，嘴角先动；1.17 秒头向左转约 15°；1.47–1.98 秒转焦（“谁的”时小灯清晰）；保持。烛焰与灯焰缓慢呼吸。不得：眼睛进入光里、火焰闪烁、她站起来。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.92 | single generation, request 4 s with 0.5 s head and 0.6 s tail handles |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Grade CT_HOME. Patch must match S011 exactly (one corner uneven with a double knot - tied at the moment of the smile). Niche placement note (flagged): bible puts the niche on the outer wall left of the door, invisible from inside; staged here as visible just past the left jamb through the open door. Lamp 1900K = the navigator's shore light (M7).

**连续性锚点 match_to**：IN: S034 closing fingers (0.52,0.56) -> her fingers pinching the needle (0.54,0.58) (gesture, within +/-3%). OUT: lamp warm point -> S036 steamer porthole warm points (light continuity; positions are not matched - lamp screen-left, portholes screen-right by lock).

**负面提示词（追加在全局负面之后）**
```text
full face visible, eyes visible, bright frontal light, laughing, modern steel scissors, plastic, red lanterns, incense smoke, lamp flickering wildly, glazed windows, electric light, bangle on the right wrist, patch on the left cuff
```

#### S036 · 02:01:06 – 02:03:07 · 2.042 s（f2910–f2959）

| 项目 | 内容 |
|---|---|
| 歌词 | 恨过谁的欺瞒／又替谁／求来年平安 |
| 段落 / 简报章节 / 时代 / 场景 | V2 主歌二 / 五 / 迁徙 / `pier_waiting` |
| 景别 / 焦段 / 速度 | WS / 32 mm / 24 |
| 入点转场 | 光线转场 0 帧 — 门边小油灯的暖光 → 门外轮船舷窗的一排暖点（光线接续；跨时代） |
| 同步点 | 121.41 s “替谁”：前景双手入焦；122.65 s “平安”：亲人的拇指轻轻摩挲她的手背 |
| 参考图 refs | `CHAR_MIGRANT` `PROP_CASE` `LOC_PIER` |
| 调色 | 迁徙时代 |
| 生成时长 | 2.042 s |

**文生视频提示词 T2V · EN**
```text
Wide shot, 32 mm anamorphic, eye level, locked, deep focus with foreground hands and the distant ship both sharp, the far end of a 1920s-30s timber-and-steel steamer waiting shed at blue hour after rain: corrugated-iron roof on cast-iron columns, 2400K enamel-shaded bulbs making warm pools on wet reflective planks. Through the wide-open gate a grey-blue sea and, moored at screen-right, a passenger steamer with black hull, white superstructure, one tall funnel in invented ochre with a slate band and black top, a row of warm portholes. In the foreground left, over a waist-high timber railing, two hands clasp tightly: the MIGRANT's left hand and, from screen-left, an older woman's hand with thick knuckles, soft loose skin and a dark-blue cotton cuff #2E3A52. The MIGRANT (~20-year-old East Asian woman, one long black braid down her back, faded grey-blue floral blouse #8FA1B3) stands seen from behind three-quarter, her honey-amber rattan suitcase in her RIGHT hand. Travellers drift toward the gate. At 0.16 s the hands settle; at 1.40 s the elder's thumb strokes the back of her hand once. Migrant-era grade: faded-photograph softness, saturation -15%, creamy highlights, never sepia; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
全景，32mm 变形宽银幕镜头，平视，锁定，深焦——前景的手与远处的船同时清晰；1920–30 年代木钢结构轮船候船棚的尽头，雨后蓝调时刻：铸铁柱撑起波纹铁皮屋顶，2400K 搪瓷灯罩白炽灯在潮湿反光的木板上留下一个个暖色光池。敞开的大门外是灰蓝色的海，画右停泊着一艘客轮：黑色船壳、白色上层建筑、一根高烟囱为虚构的赭黄配色加一道石板灰带、黑顶，一排暖色舷窗。前景画左，一道齐腰高的木栏杆上方，两只手紧紧握在一起：迁徙女性的左手，与从画左伸来的一只年长女性的手——指节粗、皮肤松软、深蓝布袖口 #2E3A52。迁徙女性（约20岁东亚女子，一条长长的黑辫垂在背上，褪色灰蓝碎花衫 #8FA1B3）以四分之三背影站着，右手提着蜂蜜琥珀色藤箱。旅客们缓缓向大门走去。0.16 秒两只手握定；1.40 秒年长者的拇指在她手背上摩挲了一下。迁徙时代调色：褪色家庭照片般的柔和，饱和度 −15%，高光微奶油，绝不做棕褐；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Clasped hands at (0.34, 0.60) above the railing line at y 0.64; the migrant's figure three-quarter from behind at x 0.45-0.62, braid down her back, case handle in her right hand at (0.58, 0.80); open gate framing sea and steamer at (0.78, 0.40), portholes a row of warm points; bulbs along the top; wet planks reflecting.
```
**首帧关键帧 Keyframe · ZH**
```text
握着的手在 (0.34, 0.60)，位于 y 0.64 的栏杆线上方；迁徙女性四分之三背影在 x 0.45–0.62，辫子垂在背上，右手提着藤箱提手 (0.58, 0.80)；敞开的大门框住海与轮船 (0.78, 0.40)，舷窗是一排暖点；顶部一排灯泡；湿木板反光。
```
**末帧 / 匹配规格 End frame**
```text
Same composition; thumb stroke completed; hands still clasped; travellers a few steps closer to the gate.
```
**图生视频运动 Motion · EN**
```text
Camera locked, 24 fps. Crowd drifts slowly left to right toward the gate. 0.16 s ('替谁') the clasp settles; 1.40 s ('平安') one slow thumb stroke on the back of her hand. Steamer static, portholes steady. Must NOT: release, camera move, steamer drift, ship smoke billowing.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定，24 fps。人群从左向右缓缓朝大门移动。0.16 秒（“替谁”）握定；1.40 秒（“平安”）拇指在她手背上缓慢摩挲一下。轮船静止，舷窗稳定。不得：松手、摄影机移动、轮船漂移、烟囱冒出大团浓烟。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.04 | single generation, request 3 s with 0.5 s handles |

**分层与合成 Plates & compositing**

- **Plate A**：Optional foreground plate: railing and clasped hands, the migrant's figure, shot deep
- **Plate B**：Optional background plate: shed end, gate, grey-blue sea and steamer (invented funnel colours), crowd drift; comp along the railing line only if a single generation cannot hold deep focus (no split-diopter seam visible)
- **合成 / 速度 / 调色 / 同步（post）**：Grade CT_MIG. Geography assumption used for S032-S039 (flagged): a waist-high railing runs along screen-left separating travellers from those seeing them off; her bench and the stamp window both sit against it; the gate to the gangway is at screen-right. Funnel colours must pass the shipping-line similarity check. Attach supplementary ref XREF_ELDER_HAND.

**连续性锚点 match_to**：IN: S035 niche lamp -> warm portholes (light). OUT: S037 stamp desk.

**负面提示词（追加在全局负面之后）**
```text
readable ship name, real shipping-line colours, flags, logos, signs, case in her left hand, steamer on screen-left, crowd faces sharp, modern items, sepia, cyan sea, letting go
```

#### S037 · 02:03:07 – 02:06:03 · 2.833 s（f2959–f3027）

| 项目 | 内容 |
|---|---|
| 歌词 | 一枚印章 |
| 段落 / 简报章节 / 时代 / 场景 | V2 主歌二 / 五 / 迁徙 / `pier_waiting` |
| 景别 / 焦段 / 速度 | INSERT / 75 mm / 48 (升格；落章瞬间实拍 96 fps＝25% 速度，圣经 §4.4) |
| 入点转场 | 切 0 帧 — 远方 → 去往远方的手续 |
| 同步点 | 124.03 s “印”：印章举到最高点；124.58 s “章”：印章落下压实（96 fps）；125.6 s 印章抬起，留下紫色印迹 |
| 参考图 refs | `CHAR_MIGRANT` `PROP_STAMP` `PROP_PASS` `LOC_PIER` |
| 调色 | 迁徙时代 |
| 生成时长 | 2.833 s |

**文生视频提示词 T2V · EN**
```text
Insert, 75 mm anamorphic, 45 degrees down, locked, shot through the glass partition window of a high timber stamp counter with a brass rail in a 1920s-30s waiting shed; a 2400K enamel-shaded bulb behind the counter reflects softly in the glass. On the counter lies an open folded travel permit: cream laid paper, a fine grey-green guilloche border, ruled fields of faint unreadable handwriting, its small photo hidden under the clerk's fingertips. A hand in an invented khaki-grey uniform cuff without insignia raises a brass-faced stamp with a turned dark rosewood handle; it peaks at 0.74 s and comes down at 1.29 s in one heavy, slowed press, violet aniline ink #5B4A78, never red, sinking into the paper fibres, the impression half over the border at (0.60, 0.50): an invented text-free emblem, a double ring around a simple steamer over three waves under a six-pointed star. At 2.31 s the stamp lifts. Out of focus at the left frame edge, the MIGRANT's faded grey-blue floral sleeve stretches back toward screen-left, held by someone unseen. Slow motion: 48 fps feel, ramping to 96 fps at the strike. Migrant-era grade: faded-photograph softness, saturation -15%, creamy highlights, never sepia; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
插入镜头，75mm 变形宽银幕镜头，45° 俯角，锁定，隔着 1920–30 年代候船棚里一座高木柜台（黄铜扶手）的玻璃隔窗拍摄；柜台后一盏 2400K 搪瓷灯罩白炽灯在玻璃上映出柔和的倒影。台面上摊开一张对折的通行纸：米色仿古纹纸，细密的灰绿扭索纹边框，表格栏里是淡淡的、不可读的手写字，那张小照片被办事员的指尖遮住。一只穿虚构卡其灰制服袖口（无任何徽记）的手举起一枚黄铜印面、紫檀色木柄的印章；0.74 秒举到最高，1.29 秒落下——沉沉的、被放慢的一压，苯胺紫印泥 #5B4A78（绝不是红色）压进纸纤维，印迹半压在边框上，位于 (0.60, 0.50)：一个虚构的、没有任何文字的图案——双圈之内一艘简化的轮船、三道波浪与一颗六角星。2.31 秒印章抬起。画面左缘焦外，迁徙女性褪色灰蓝碎花衫的衣袖向画左身后伸去，被一个看不见的人握着。慢动作：48 fps 质感，落章瞬间升至 96 fps。迁徙时代调色：褪色家庭照片般的柔和，饱和度 −15%，高光微奶油，绝不做棕褐；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Through glass, 45 degrees down: permit at centre (0.55, 0.55) spanning about 60% of frame width, guilloche border visible, photo corner under the clerk's left fingertips; the clerk's khaki cuff and right hand with the stamp entering from top-right at (0.70, 0.20); bulb reflections in the glass at (0.35, 0.25); her floral sleeve soft along the left frame edge (x < 0.12, y 0.55-0.85).
```
**首帧关键帧 Keyframe · ZH**
```text
透过玻璃，45° 俯角：通行纸居中 (0.55, 0.55)，约占画面宽度 60%，扭索纹边框可见，照片一角在办事员左手指尖下；卡其灰袖口与持印章的右手从右上方 (0.70, 0.20) 入画；玻璃上灯泡的倒影在 (0.35, 0.25)；她的碎花衣袖柔焦地沿画面左缘（x < 0.12，y 0.55–0.85）。
```
**末帧 / 匹配规格 End frame**
```text
Stamp lifted out of the top of frame; violet impression crisp at (0.60, 0.50), half over the guilloche border - registered for S040's faded mark at the same frame position.
```
**图生视频运动 Motion · EN**
```text
Camera locked. Segment 1 (0-1.0 s, 48 fps-capture look, 50% speed): stamp raised to its peak at 0.74 s ('印'). Segment 2 (1.0-1.6 s, 96 fps-capture look, 25% speed): descent, impact at 1.29 s ('章'), ink squeeze, a tiny paper flex. Segment 3 (1.6-2.83 s, back to 50%): hold, lift at 2.31 s, mark revealed. Must NOT: paper slides, the sleeve leaves frame, any text appears, the photo shows.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定。第 1 段（0–1.0 秒，48 fps 质感、50% 速度）：印章举到最高点，0.74 秒（“印”）。第 2 段（1.0–1.6 秒，96 fps 质感、25% 速度）：落下，1.29 秒（“章”）压实，印泥被挤压，纸面轻微受压。第 3 段（1.6–2.83 秒，回到 50%）：停住，2.31 秒抬起，露出印迹。不得：纸张滑动、衣袖离开画面、出现任何文字、露出照片。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 1.0 | raise to peak, 50% speed look; generate with 0.4 s head handle |
| 1.0 | 1.6 | strike at 25% speed look (ramp in/out over 6 frames); generate as its own clip from the peak frame if the model cannot ramp |
| 1.6 | 2.83 | hold and lift at 50% speed look; 0.4 s tail handle |

**分层与合成 Plates & compositing**

- **Plate A**：Through-glass counter plate with the permit, clerk's hand and stamp action
- **Plate B**：Glass reflection element: soft bulb glints and faint counter reflections, comped at 8-12% screen on the partition
- **合成 / 速度 / 调色 / 同步（post）**：Speed ramp 50% -> 25% at the strike -> 50% (skeleton speed '48 ... 96 fps'). Replace the impression in comp with the approved bible stamp artwork if the model drifts (no letters, no numbers). Grade CT_MIG. Counter geography flagged: bible 7.6 puts the counter on the landward wall; staged against the railing line so the relative can still hold her arm. Clerk's hand: attach supplementary ref XREF_CLERK_HAND (invented khaki-grey cuff, no insignia; bible 6.12).

**连续性锚点 match_to**：OUT: mark position (0.60, 0.50) = S040's faded grey-violet mark (#7A6E8C) behind the G3c glass.

**负面提示词（追加在全局负面之后）**
```text
letters, numbers, readable seal text, red ink, real government emblem, flag, insignia, the photo's face visible, rubber office stamp, ballpoint pen, plastic, fast motion blur, ink splatter
```

#### S038 · 02:06:03 – 02:09:18 · 3.625 s（f3027–f3114）

| 项目 | 内容 |
|---|---|
| 歌词 | 一枚印章／许你到下一站 |
| 段落 / 简报章节 / 时代 / 场景 | V2 主歌二 / 五 / 迁徙 / `pier_waiting` |
| 景别 / 焦段 / 速度 | MS / 40 mm / 24 |
| 入点转场 | 切 0 帧 — 印章落下 → 闸口打开（动作因果） |
| 同步点 | 126.19 s “许你”：闸口打开；128.23 s “一站”：两人的手臂被拉直 |
| 参考图 refs | `CHAR_MIGRANT` `PROP_CASE` `PROP_PASS` `LOC_PIER` |
| 调色 | 迁徙时代 |
| 生成时长 | 3.625 s |

**文生视频提示词 T2V · EN**
```text
Medium shot, 40 mm anamorphic, eye level, slow lateral follow to screen-right at about 1 m/s with a little natural handheld breathing, a 1920s-30s steamer waiting shed at blue hour after rain: wet planks mirroring 2400K bulb pools, cast-iron columns, the open gate brighter at far right. At 0.07 s the barrier swings open and a crowd of period travellers surges right toward the steamer. The MIGRANT (~20-year-old East Asian woman, round-square face, straight thick brows, a small mole above her RIGHT eyebrow peak, one long black braid, faded grey-blue floral cotton blouse #8FA1B3 with small white and faded-rose flowers) lifts her honey-amber rattan suitcase in her RIGHT hand and walks right; her left arm stretches back over a waist-high timber railing to screen-left, still held by an older woman's hand in a dark-blue cotton sleeve #2E3A52, the elder herself soft at frame-left. Around 1.5 s she looks back over her left shoulder; by 2.11 s both arms are pulled straight above the railing, the hands still joined, taut, to the end. Real-time performance. Migrant-era grade: faded-photograph softness, saturation -15%, creamy highlights, never sepia; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中景，40mm 变形宽银幕镜头，平视，以约每秒 1 米的速度缓慢向画右横向跟移，带一点自然手持的呼吸感；1920–30 年代轮船候船棚，雨后蓝调时刻：湿木板映着 2400K 灯泡的光池，铸铁柱，画右远处敞开的闸口更亮。0.07 秒闸门打开，一群旧时代旅客向画右的轮船涌去。迁徙女性（约20岁东亚女子，圆中带方的脸，直而浓的眉，右眉峰上方一颗小痣，一条长长的黑辫，褪色灰蓝碎花棉布衫 #8FA1B3，白色与褪玫色小花）用右手提起蜂蜜琥珀色藤箱，向画右走去；她的左臂越过一道齐腰高的木栏杆向画左身后伸着，仍被一只穿深蓝布衣袖 #2E3A52 的年长女性的手握着，年长者本人在画左柔焦。约 1.5 秒她越过左肩回头；2.11 秒两人的手臂在栏杆上方被拉直，手仍连着、绷着，直到镜头结束。真实速度的表演。迁徙时代调色：褪色家庭照片般的柔和，饱和度 −15%，高光微奶油，绝不做棕褐；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
She at (0.48, 0.50) mid-step, about 70% of frame height; her left arm extended back toward frame-left to the clasped hands at (0.18, 0.48) over the railing (y 0.58); the case in her right hand at (0.60, 0.78); the barrier just starting to swing at right; crowd soft; gate glow at far right.
```
**首帧关键帧 Keyframe · ZH**
```text
她在 (0.48, 0.50) 迈步中，约占画面高度 70%；左臂向画左后方伸出，到 (0.18, 0.48) 栏杆（y 0.58）上方握着的两只手；右手提箱在 (0.60, 0.78)；画右闸门刚开始打开；人群柔焦；画右远处闸口的光。
```
**末帧 / 匹配规格 End frame**
```text
She at (0.62, 0.50) looking back over her left shoulder toward frame-left; both arms straight, the clasped hands at (0.30, 0.46) above the railing; the elder's soft shoulder at the frame-left edge; crowd streaming right.
```
**图生视频运动 Motion · EN**
```text
Follow track/pan right at about 1 m/s matched to her walk, so she drifts from x 0.48 to 0.62; handheld amplitude no more than 1% of frame, 24 fps. 0.07 s ('许你') barrier opens; 1.5 s look back; 2.11 s ('一站') arms straight, tension held. Must NOT: release the hands, turn her body fully left, whip, slow motion.
```
**图生视频运动 Motion · ZH**
```text
跟随她的步伐以约每秒 1 米向画右横移/跟摇，使她从 x 0.48 移到 0.62；手持幅度不超过画面 1%，24 fps。0.07 秒（“许你”）闸门打开；1.5 秒回头；2.11 秒（“一站”）手臂拉直，保持绷紧。不得：松手、身体完全转向画左、甩镜、慢动作。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.62 | single generation, request 5 s with 0.5 s head and 0.8 s tail handles |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Grade CT_MIG. Keep direction lock: movement and ship screen-right, family screen-left. Elder: supplementary ref XREF_ELDER_HAND, as S034/S036/S039.

**连续性锚点 match_to**：IN: S037 stamp -> gate opens (action cause). OUT: S039 ECU of the same joined hands (same left/right orientation: elder's hand from screen-left, hers pulling right).

**负面提示词（追加在全局负面之后）**
```text
case in her left hand, steamer on screen-left, crowd flowing right to left, letting go, running, whip pan, shaky handheld, readable signs, flags, modern items, sepia, dropping the case
```

#### S039 · 02:09:18 – 02:13:19 · 4.042 s（f3114–f3211）

| 项目 | 内容 |
|---|---|
| 歌词 | 谁许你／回到离别前 |
| 段落 / 简报章节 / 时代 / 场景 | V2 主歌二 / 五 / 迁徙 / `pier_waiting` |
| 景别 / 焦段 / 速度 | ECU / 100 mm / 48 (50% slow motion) |
| 入点转场 | 切 0 帧 — 由中景到手的特写 |
| 同步点 | 130.38 s “许你”：掌心开始滑开；132.72 s “离”：只剩指尖相触；132.96 s “别”：指尖分开；133.79 s 悬着的手已独自停留约 20 帧 |
| 参考图 refs | `CHAR_MIGRANT` `LOC_PIER` |
| 调色 | 迁徙时代 |
| 生成时长 | 4.042 s |

**文生视频提示词 T2V · EN**
```text
Extreme close-up, 100 mm anamorphic, eye level, locked, rendered as 48 fps slow motion at 50% speed, backlit by the grey-blue blue-hour sky through the open end of a 1920s waiting shed, light glowing between the fingers. Two hands joined palm to palm in mid-air above a railing: from screen-left, an older woman's RIGHT hand seen from the back, thick knuckles, soft loose skin, a dark-blue cotton cuff #2E3A52, palm facing forward away from camera; on its far side the MIGRANT's small left hand, very short nails, reddened knuckles, faded grey-blue floral cuff, wrapped into it. From 0.63 s they slide apart, slowly: palms, knuckles, fingertips; at 2.97 s only fingertips touch; at 3.21 s they part. Her hand drifts out of frame to the right, toward the ship. The elder's hand stays exactly where it was, at (0.36, 0.56), palm forward, four fingers gently curled, thumb at left, suspended, alone and motionless for the final beat. Warm 2400K bulb spill from upper left touches the knuckles. Real skin texture. Migrant-era grade: faded-photograph softness, saturation -15%, creamy highlights, never sepia; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
大特写，100mm 变形宽银幕镜头，平视，锁定，以 48 fps、50% 速度的慢动作呈现；逆光——1920 年代候船棚敞开的一端透进灰蓝色的蓝调天光，从指缝间透亮。两只手在栏杆上方的半空中掌心相握：从画左伸来的是一只年长女性的右手，我们看到的是手背——指节粗、皮肤松软、深蓝布袖口 #2E3A52，掌心朝前、背对镜头；在它的另一侧，迁徙女性小小的左手（指甲很短，指节微红，褪色灰蓝碎花袖口）握在其中。0.63 秒起，两只手慢慢滑开——掌心、指节、指尖；2.97 秒只剩指尖相触；3.21 秒分开。她的手向画右滑出画外，朝着船的方向。年长者的手却完全停在原来的位置 (0.36, 0.56)：掌心向前、四指微弯、拇指在左侧，悬在半空，在最后一拍里独自一动不动。左上方 2400K 灯泡的暖光轻轻落在指节上。真实的皮肤质感。迁徙时代调色：褪色家庭照片般的柔和，饱和度 −15%，高光微奶油，绝不做棕褐；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Joined hands left of centre: the elder's right hand seen from the back at (0.36, 0.56), width about 40% of frame height, the migrant's left hand interlocked from the right with her fingers curled over the elder's palm edge at (0.48, 0.54); bright grey-blue backlight between the fingers; railing soft below at y 0.85.
```
**首帧关键帧 Keyframe · ZH**
```text
两只相握的手在画面中偏左：年长者右手的手背在 (0.36, 0.56)，手宽约占画面高度 40%，迁徙女性的左手从右侧扣进来，手指弯在年长者掌缘上 (0.48, 0.54)；指缝间是明亮的灰蓝逆光；下方 y 0.85 是柔焦的栏杆。
```
**末帧 / 匹配规格 End frame**
```text
Only the elder's right hand at (0.36, 0.56), back toward camera, palm facing away, four fingers slightly curled, thumb on the left; width about 40% of frame height; empty backlit grey-blue space to the right. T15 A-frame for S040 (tolerance +/-3%).
```
**图生视频运动 Motion · EN**
```text
48 fps-capture slow motion played at 24 fps. Camera locked. Separation from 0.63 s ('许你') to 3.21 s ('别'), smooth and continuous, her hand moving right and slightly away; 2.97 s ('离') fingertips only. From 3.21 s to 4.04 s (about 20 frames) the elder's hand is completely still - no drift, no tremor beyond 1 px. Must NOT: the remaining hand closes, lowers, or follows.
```
**图生视频运动 Motion · ZH**
```text
以 48 fps 拍摄、24 fps 播放的慢动作。摄影机锁定。从 0.63 秒（“许你”）到 3.21 秒（“别”）两手平滑连续地分开，她的手向右并略向远处移去；2.97 秒（“离”）只剩指尖。3.21 秒到 4.04 秒（约 20 帧）年长者的手完全静止——不漂移，抖动不超过 1 像素。不得：留下的手合拢、下垂或跟随。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.4 | palms and knuckles slide apart; generate 3 s with 0.4 s head handle |
| 2.0 | 4.04 | fingertips part and the hold; generate 3 s from the 2.0 s frame (0.4 s overlap for the blend), tail handle 0.5 s of hold |

**分层与合成 Plates & compositing**

- **Plate A**：Hands action plate (two segments, blended in the 2.0-2.4 s overlap)
- **Plate B**：Clean backlit background plate (grey-blue sky through the shed end, soft railing) for paint-out and to stabilise the final hold
- **合成 / 速度 / 调色 / 同步（post）**：Stabilise the final 20 frames to absolute stillness (freeze-blend the last 10 frames over plate B if the model drifts). Register the hand silhouette for S040 within +/-3%. Hand pose decision (flagged): the skeleton's 'palm forward' is resolved as the elder's RIGHT hand seen from the back so it matches the restorer's gloved right hand seen from behind in S040. Attach supplementary ref XREF_ELDER_HAND.

**连续性锚点 match_to**：OUT: T15 -> S040: hand at (0.36, 0.56), width 40% of frame height, back of a right hand, palm away, fingers gently curled, thumb at left.

**负面提示词（追加在全局负面之后）**
```text
hand moving after separation, hand dropping or closing, waving, extra fingers, fused fingers, deformed knuckles, rings, nail polish, motion-blur smear, morphing hands, faces, palm facing camera
```

#### S040 · 02:13:19 – 02:15:10 · 1.625 s（f3211–f3250）

| 项目 | 内容 |
|---|---|
| 歌词 | 回到离别前 |
| 段落 / 简报章节 / 时代 / 场景 | V2 主歌二 / 五 / 现代 / `museum_gallery` |
| 景别 / 焦段 / 速度 | ECU / 100 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 手势 + 相似构图：送行者悬在半空的手 → 修复师停在玻璃前的手（同位置、同形状、掌心朝向一致；跨时代，T15） |
| 同步点 | 133.8 s “前”长音中：切入现代的手；134.6 s 焦点微微呼吸，褪色印迹在焦外浮现 |
| 参考图 refs | `CHAR_RESTORER` `PROP_CASE` `PROP_PASS` `PROP_GLOVES` `PROP_COAT` `LOC_GALLERY` |
| 调色 | 现代夜间 |
| 生成时长 | 1.625 s |

**文生视频提示词 T2V · EN**
```text
Extreme close-up, 100 mm anamorphic, eye level, locked with an extremely slow pull-back of about 2% over 1.6 s, night museum gallery. The RESTORER's right hand in a thin warm-white cotton conservator glove with a ribbed cuff, the charcoal wool sleeve of her coat #3C4045 at the wrist with no wear on this right cuff, is raised before the closed front glass of a tall migration vitrine, seen from the back: palm facing the glass, four fingers gently curled, thumb at left, one finger-width from the glass and not touching, at (0.36, 0.56). In the glass, a faint reflection of the glove's palm side shows a grey-brown brass smudge on the index fingertip. Behind the glass, out of focus on near-black navy velvet: an open travel permit with a grey-green border, its stamp faded to grey-violet #7A6E8C at (0.60, 0.50), and four empty photo corner-mounts with no photo. At 0.81 s the focus breathes slightly deeper so the faded mark surfaces, softly, never sharp. Light: cold silver moonlight from screen-right doorways on the glove, a small 3000K vitrine glow behind. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
大特写，100mm 变形宽银幕镜头，平视，锁定并以极慢的速度后拉（1.6 秒约 2%），夜间展厅。修复师的右手戴着暖白薄棉修复手套（罗纹腕口），腕上是深灰呢外套 #3C4045 的衣袖——这只右袖口没有磨损——停在一面高高的迁徙主题立柜关闭着的正面玻璃前，我们从手背一侧看去：掌心朝向玻璃，四指微弯，拇指在左，离玻璃一指宽，没有碰上，位于 (0.36, 0.56)。玻璃里淡淡映出手套掌心一侧，食指指尖一点灰褐色的黄铜污迹。玻璃后面，近黑深蓝绒布上焦外的是：一张摊开的通行纸，灰绿边框，印迹已褪成灰紫 #7A6E8C，位于 (0.60, 0.50)，四个空的照片相角——没有照片。0.81 秒焦点微微向深处呼吸，褪色的印迹柔柔地浮现，却始终不清晰。光：画右门洞来的冷银月光落在手套上，后方一点 3000K 的柜内微光。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Back of her gloved right hand at (0.36, 0.56), width about 40% of frame height, fingers gently curled, thumb at left - matching S039's last frame within +/-3%; the glass plane with faint dust; behind it the soft permit with the grey-violet mark at (0.60, 0.50) and four empty corner-mounts; near-black velvet; the coat sleeve entering from the bottom-left edge.
```
**首帧关键帧 Keyframe · ZH**
```text
她戴手套的右手手背在 (0.36, 0.56)，手宽约占画面高度 40%，四指微弯、拇指在左——与 S039 末帧误差在 ±3% 以内；玻璃面上有淡淡的灰尘；玻璃后是柔焦的通行纸，灰紫印迹在 (0.60, 0.50)，四个空相角；近黑绒布；外套衣袖从左下角入画。
```
**末帧 / 匹配规格 End frame**
```text
About 2% wider; the faded mark slightly clearer but still soft; a faint reflection of the glove visible in the glass - the layer S041's focus passes through into the old-home eaves reflection.
```
**图生视频运动 Motion · EN**
```text
Motion-control pull-back 2% over 1.62 s, 24 fps; focus breath at 0.81 s (about 0.8 s long). Hand perfectly still except a 1 px natural micro-tremor. Must NOT: touch the glass, move the hand, open the vitrine.
```
**图生视频运动 Motion · ZH**
```text
运动控制后拉，1.62 秒约 2%，24 fps；0.81 秒焦点呼吸（约 0.8 秒）。手完全静止，只有 1 像素的自然微颤。不得：碰到玻璃、移动手、打开柜门。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 1.62 | single generation, request 3 s with 0.5 s head and 0.9 s tail handles (tail holds the glove reflection for S041) |

**分层与合成 Plates & compositing**

- **Plate A**：Hand + closed G3c glass + vitrine contents plate (pass, case edge) on velvet
- **Plate B**：Optional glove-reflection element at about 8% screen on the glass, carried into S041 as the surface layer the focus passes through
- **合成 / 速度 / 调色 / 同步（post）**：Register the hand silhouette to S039's last frame (+/-3%); straight cut on the 133.79 beat, no grade bridge needed (2400K skylit warmth -> 7000K moonlight is the intended contrast). G3c front must be CLOSED here (it was open S028-S030 - flagged). The stamp mark position echoes S037 (0.60, 0.50).

**连续性锚点 match_to**：IN: T15 from S039 (pose, position 0.36, 0.56, size 40% of frame height). OUT: S041 - focus passes through the glove's reflection into the eaves reflection (S041 must equal S019's composition; see mirror-flip issue).

**负面提示词（追加在全局负面之后）**
```text
fingertip touching the glass, bare hand, photo in the corner-mounts, readable text, sharp permit, bright violet stamp, open vitrine door, wristwatch, ring, palm facing camera, wear spot on the right cuff
```

### 副歌二 CH2

#### S041 · 02:15:10 – 02:18:04 · 2.750 s（f3250–f3316）

| 项目 | 内容 |
|---|---|
| 歌词 | 千年啊／不过无数个今晚 |
| 段落 / 简报章节 / 时代 / 场景 | CH2 副歌二 / 六 / 旧日家中 / `old_home` |
| 景别 / 焦段 / 速度 | WS / 32 mm / 24 |
| 入点转场 | 反射转场 0 帧 — S040 的 G3c 玻璃 → 焦点穿过玻璃进入旧日屋檐（跨时代） |
| 同步点 | 135.48 s “千年啊”：反射中屋檐成形；137.04 s “无数”：焦点完全进入反射，画面锁定 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_WIFE` `PROP_BOWL` `PROP_LAMP` `PROP_GLOVES` `LOC_GALLERY` `LOC_HOME` |
| 调色 | 多时代/过渡（见提示词） |
| 生成时长 | 2.75 s |

**文生视频提示词 T2V · EN**
```text
Wide shot opening on a reflection, 32mm anamorphic, eye level, close to the low-iron glass of a dark museum wall vitrine at night; 24 fps. Frame 0: soft at left-centre, the warm-white cotton-gloved right hand of RESTORER (~28, East Asian, charcoal wool coat) hovers a finger's width from the glass beside its faint reflection. From 0.06 s focus racks slowly through that reflection into mirror depth as the camera eases 15 cm closer; by 1.6 s the frame locks on the eaves of a 17th-century coastal granite house at night, sky in the upper third. Clouds thicker and lower than before, damp air, the moon only a pale glow behind cloud at upper right; the step sheens with humidity, no rain. WIFE, a slender ~30-year-old woman in a washed pale-blue cotton jacket, low bun with a plain wooden pin, a thin tarnished silver bangle on her LEFT wrist, sits alone at her door facing frame right, face lost in shadow, never clear. At the step's outer edge under the drip line, the empty blue-and-white bowl, its rim band one continuous plum branch, faces the sky; a 1900K oil lamp burns in the niche at far left. Glass in the modern night grade; the eaves in the old-home grade, cloud-veiled moonlight and one warm lamp; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
开场是一面玻璃里的反射，全景，32mm 变形镜头，平视，贴近夜间博物馆一面低铁超白玻璃的暗色立柜；24 fps。第 0 帧：画面左中部、柔虚，修复师（约 28 岁东亚女性，深灰羊毛呢外套）戴略暖白的薄棉手套的右手悬在离玻璃一指宽处，旁边是它淡淡的倒影。0.06 秒起，焦点缓慢穿过这道倒影进入玻璃的镜像深处，摄影机同时缓缓前推约 15 厘米；到 1.6 秒，画面锁定在 17 世纪海边花岗岩石屋的屋檐下，夜，天空占画面上三分之一。云比上一次更厚、更低，空气潮湿，月亮只是右上方云后的一团淡光；花岗岩石阶泛着湿气，没有下雨。等待的人——清瘦、约 30 岁的妇人，洗旧的浅蓝粗棉短袄，低髻插一支素面木簪，左手腕一只微微氧化的素银细镯——独自坐在门口，面朝画右，脸隐在阴影里，始终看不清。石阶外沿的滴水线下，那只空的青花碗口沿一圈连绵的折枝梅，碗心朝天；画面最左，壁龛里一盏 1900K 的小油灯亮着。玻璃为现代夜间调色；屋檐下为旧日家中调色——云后的月光与一点暖灯；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0 (continues S040's G3c glass on a wider lens): the clean low-iron vitrine glass fills frame at night; RESTORER's warm-white-gloved right hand (thin warm-white cotton glove, faint brass smudge on the index tip), palm toward the glass, fingers slightly curled, soft and out of focus at (0.36,0.56), about 25% of frame height, a finger's width from the glass beside its faint mirrored twin; behind the glass, far out of focus, the warm 3000K glow of the open rattan case and a faded violet stamp at (0.60,0.50); deep in the glass, barely visible, dark-blue cloud shapes and a roofline; a moon-silver highlight along the glass edge; modern neutral-cool grade, deep shadow detail, fine grain, anamorphic 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧（接 S040 那面 G3c 玻璃，镜头更广）：夜间立柜干净的低铁超白玻璃占满画面；修复师戴白手套的右手（略暖白的薄棉手套，食指指尖一点黄铜污迹）掌心朝向玻璃、四指微弯，柔虚地位于 (0.36,0.56)，约占画面高 25%，离玻璃一指宽，旁边是它淡淡的镜像；玻璃后面远远的焦外，是打开的藤箱与一枚褪色紫印在 3000K 柜灯下的暖光，位于 (0.60,0.50)；玻璃深处若有若无地浮出深蓝的云影与一道屋脊；玻璃边缘一线月光银高光；现代中性偏冷调色，暗部有层次，细腻颗粒，2.39:1 变形宽银幕。
```
**末帧 / 匹配规格 End frame**
```text
t=1.625-2.75 s, locked (S019's camera data, CH2 weather): sky in the upper third, heavy low cloud, moon glow at (0.80,0.14) exactly as S019; door opening at x 0.08-0.26 (as S019) with the lit niche lamp at (0.04,0.46); WIFE seated on the doorstone at (0.40,0.64), feet on the granite step, facing right, face in shadow; the empty bowl at the step's outer edge under the eaves drip line at (0.28,0.80), rim up; low yard wall and dark sea across the right half; no glass, no glove, no child, no rain.
```
**图生视频运动 Motion · EN**
```text
Camera: 0-1.6 s slow push of ~15 cm toward the glass along the lens axis (6-frame ease-in, eased stop at 1.6 s), then locked to the end. Focus: 0.06-1.6 s slow rack (>=1 beat) from the glove's reflection plane into mirror depth; the glove blurs away and is gone by 1.2 s. Eaves world: low clouds drift slowly right to left, the niche flame breathes, WIFE (pale-blue jacket, silver bangle on the LEFT wrist) is still - one slow breath at 2.1 s. 24 fps. Must NOT move: bowl, door, lamp niche, step; she never turns her face to camera; no rain, no child, no figure appears in the gallery.
```
**图生视频运动 Motion · ZH**
```text
摄影机：0–1.6 秒沿光轴向玻璃缓慢前推约 15 厘米（6 帧缓入，1.6 秒缓停），之后锁定到结束。焦点：0.06–1.6 秒缓慢（≥1 拍）从手套倒影所在平面转入镜像深处；手套随之虚化，1.2 秒前完全消失。屋檐的世界：低云从画右向画左缓慢移动，壁龛火苗轻轻呼吸，等待的人（浅蓝短袄、左腕银镯）几乎不动——2.1 秒有一次缓慢的呼吸。24 fps。不得移动：碗、门、壁龛、石阶；她始终不把脸转向镜头；不下雨、不出现孩子，展厅里不出现任何人影。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.75 | Single shot built from two plates: A generated on the 15 cm push for 0-1.8 s (+0.3 s tail handle); B generated locked for 3.75 s (0.5 s handles both ends) from S019's camera data. |

**分层与合成 Plates & compositing**

- **Plate A**：Modern glass layer (LOC_GALLERY, G3c): low-iron glass with fine dust and one faint smudge, RESTORER's gloved right hand and its mirrored twin soft at (0.36,0.56), the open case / faded pass transmitted far out of focus; shot on the same 15 cm push.
- **Plate B**：Old home eaves (LOC_HOME exterior), S019 camera data (32mm, eye level, sky upper third), CH2 weather: heavy low cloud, damp air, moon glow only; WIFE seated on the doorstone, face in shadow; the empty canonical plum-band bowl at the step's outer edge; niche oil lamp lit 1900K (lit in S035).
- **合成 / 速度 / 调色 / 同步（post）**：Composite B as the reflection inside the G3c pane: 0-0.3 s B at ~15% screen, defocused at mirror depth under A; 0.3-1.6 s the rack hands over by depth - A's transmitted case/pass pulled down 1.5 stops (dark vitrine interior lets the reflection read, bible 8.3-1) while A's dust and glove defocus out; a 24-frame internal hand-off (f3257-f3281) inside the rack, motivated by the reflection, never a free-standing dissolve. MP-1: B is composited as seen, in S019's on-screen layout, so it reads as the same camera position. Grade A CT_MODERN; B CT_HOME exterior (P02 air, P05 cloud edges, one P13 lamp point); grain 1.0 -> 1.15 with B; halation 0.5 on the lamp. Sync: f3252 (135.48 '千年啊') eaves shapes emerge; f3289 (137.04 '无数') focus fully in, frame locked; cut f3316.

**连续性锚点 match_to**：Start continues S040 (G3c glass, gloved hand at (0.36,0.56)). Locked part = S019 composition reused with CH2 weather (heavier cloud, damp). Bowl, step and lamp continue into S042's probe shot; rain pays off in S066 P2.

**负面提示词（追加在全局负面之后）**
```text
child or child's silhouette in the wide, rain, raindrops or puddles, clear sky with a sharp moon disc, stars, the wife's face clear or front-lit, wife looking at camera, bowl full or upside down, any bowl pattern other than the plum-band canonical bowl, lamp unlit, electric light, glass or glove still visible after 1.6 s, ghost figure standing in the gallery, gloved hand touching the glass, layout different from S019, morph between the two worlds
```

#### S042 · 02:18:04 – 02:19:21 · 1.708 s（f3316–f3357）

| 项目 | 内容 |
|---|---|
| 歌词 | 不过无数个今晚／有人等一场雨 |
| 段落 / 简报章节 / 时代 / 场景 | CH2 副歌二 / 六 / 旧日家中 / `old_home` |
| 景别 / 焦段 / 速度 | INSERT / 24 mm / 24 |
| 入点转场 | 切 0 帧 — 全景切入细节 |
| 同步点 | 139.02 s “等”：小脚入画；139.68 s “雨”：脚趾动了动 |
| 参考图 refs | `CHAR_WIFE` `PROP_BOWL` `PROP_LAMP` `LOC_HOME` |
| 调色 | 旧日家中 |
| 生成时长 | 1.708 s |

**文生视频提示词 T2V · EN**
```text
Ground-level insert, 24mm probe lens resting on a granite doorstep at night, locked; 24 fps; a 17th-century coastal stone house. In the near foreground at frame left, the flared rim of an empty folk-kiln blue-and-white bowl, its rim band one continuous flowering plum branch, the plum blossom in its centre facing the sky. At frame right, the toe of a woman's dark cloth shoe with old visible mending stitches and the hem of a dark indigo skirt: WIFE, sitting still at her door, nothing else of her in frame. Damp granite, humid air, no rain. At 0.85 s a pair of small bare feet of a child about four years old steps in from the dark doorway behind and stops between the bowl and her shoe, toes curling on the cool stone; at 1.5 s the toes wiggle restlessly once. Only feet and ankles are ever seen. Light: diffuse, cloud-softened moonlight from above right; warm 1900K oil-lamp glow from the door niche off frame left rims the toes and the bowl's edge. T5.6, focus on the plane between rim and feet. Deep blue air with one amber point, natural skin. Old-home grade: candle-warm interior against cool lattice moonlight, blacks slightly lifted; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
贴地插入镜头，24mm 探针镜头贴在夜里一级花岗岩门前石阶上，锁定；24 fps；17 世纪海边石屋。画左近前景，是一只空的民窑青花碗外翻的口沿，口沿一圈连绵的折枝梅，碗心的梅花朝着天。画右，是一只女人深色布鞋的鞋头，鞋面上有旧日补过的针脚，以及深靛黑布裙的裙边——等待的人静静坐在门口，画面里只有她的鞋与裙边。花岗岩潮湿，空气闷湿，没有下雨。0.85 秒，一双约四岁孩子光着的小脚从身后暗暗的门口走进画面，停在碗与她的鞋之间，脚趾蜷在凉凉的石头上；1.5 秒，脚趾不安分地动了一下。始终只看到脚与脚踝。光：被云柔化的漫射月光从右上方来；画外左侧门边壁龛里 1900K 的小油灯暖光勾亮脚趾与碗沿。T5.6，焦点落在碗沿与小脚之间的平面。深蓝的空气里一个琥珀暖点，自然肤色。旧日家中调色：烛光暖色的室内对窗格透入的冷月光，黑位略抬；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0: 24mm probe lens 4 cm above a damp granite doorstep at night; the empty canonical blue-and-white bowl's flared rim large at left (0.22,0.62), ~35% of frame width, the continuous plum-branch rim band, a glimpse of the plum blossom in its glazed centre; WIFE's mended dark cloth shoe toe and dark indigo skirt hem at right (0.74,0.70); a gap of damp stone between them at (0.50,0.70); background: the dark doorway and rough granite wall, a soft warm lamp bokeh at upper left (0.12,0.30); cool diffuse moonlight from above right; old-home grade (candle-warm against cool moonlight), fine grain, 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧：24mm 探针镜头离潮湿的花岗岩石阶约 4 厘米，夜；画左是那只标准青花空碗外翻的口沿，位于 (0.22,0.62)，约占画面宽 35%，口沿一圈折枝梅，隐约看见釉面碗心的梅花；画右是等待的人补过的深色布鞋鞋头与深靛黑裙边，位于 (0.74,0.70)；两者之间一片潮湿的石面，位于 (0.50,0.70)；背景是暗暗的门洞与粗凿花岗岩墙，左上方 (0.12,0.30) 一团柔和的暖色灯光焦外光斑；右上方来的冷色漫射月光；家中调色，细腻颗粒，2.39:1。
```
**末帧 / 匹配规格 End frame**
```text
t=1.71 s: the child's bare feet planted on the step at (0.50,0.70) between bowl rim and shoe, toes just wiggled; nothing above the ankles in frame; bowl unchanged and empty.
```
**图生视频运动 Motion · EN**
```text
Camera locked on the step (probe), no breathing. 0-0.85 s still life: the lamp glow flickers softly, humid air. 0.85 s small bare feet of a ~4-year-old child step in from the dark doorway at the top of frame - right foot, then left - and settle by 1.1 s between bowl and shoe; 1.5 s the toes curl and wiggle once. 24 fps, real time. Must NOT move: bowl, WIFE's mended shoe, camera; no rain falls; no hands, faces or anything above the child's ankles enter frame.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定在石阶上（探针镜头），无任何呼吸感。0–0.85 秒是静物：灯光柔和地闪动，空气潮湿。0.85 秒，一双约四岁孩子的光脚从画面上方暗暗的门口走进来——先右脚、后左脚——1.1 秒停稳在碗与鞋之间；1.5 秒脚趾蜷起、动了一下。24 fps，真实速度。不得移动：碗、等待的人补过的布鞋、摄影机；不下雨；不出现手、脸或孩子脚踝以上的任何部分。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 1.708 | Single generation, I2V from the keyframe; generate 2.2 s (0.25 s handles) and verify toe count frame by frame. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Child-safety (bible 10-8): preferably shoot the feet practically (short session, guardian present, warm set) and use generation only for the bowl/step; otherwise check every frame for toe count and anatomy. Grade CT_HOME, blacks +1%, grain 1.15, halation 0.5 on the lamp bokeh. Sync: f3336 (139.02 '等') first foot lands; f3352 (139.68 '雨') toes wiggle; cut f3357. If generated, attach supplementary ref XREF_CHILD_FEET.

**连续性锚点 match_to**：Same doorstep and bowl as S041 / S019 (bowl at the step's outer edge under the eaves drip line, WIFE seated on the doorstone with her feet on the step). The bowl's payoff is S066 P2 (first raindrop into the centre blossom).

**负面提示词（追加在全局负面之后）**
```text
child's face, body, legs above the ankles, child's hands, an adult lifting the child, shoes on the child, rain falling, water in the bowl, bowl moved or tipped, wrong bowl pattern, modern sandals, plastic, hyper-sharp macro texture, distorted or extra toes, fisheye bulge, crushed blacks, warm daylight
```

#### S043 · 02:19:21 – 02:22:05 · 2.333 s（f3357–f3413）

| 项目 | 内容 |
|---|---|
| 歌词 | 有人等一场雨／有人等沉默被听见 |
| 段落 / 简报章节 / 时代 / 场景 | CH2 副歌二 / 六 / 迁徙 / `pier_waiting` |
| 景别 / 焦段 / 速度 | MCU / 75 mm / 24 |
| 入点转场 | 切 0 帧 — 直接切回同一个人（与 S020 同机位的重复） |
| 同步点 | 140.22 s “等沉默”：信打开，布片露出；141.18 s “听见”：拇指摸布片；141.8 s 手掌压平 |
| 参考图 refs | `CHAR_MIGRANT` `PROP_SHIRT` `PROP_CASE` `PROP_LETTER` `LOC_PIER` |
| 调色 | 迁徙时代 |
| 生成时长 | 2.333 s |

**文生视频提示词 T2V · EN**
```text
Medium close-up, 75mm anamorphic, eye level slightly high, slow push-in of about 20 cm; 24 fps. A 1920s-30s pier waiting shed at night, under the third enamel-shaded 2400K bulb, warm light falling from above right; blue-black night sea beyond, travellers soft behind. MIGRANT, a ~20-year-old East Asian woman with one long black braid, a small mole above her RIGHT brow peak and slightly chapped lips, in a faded grey-blue cotton blouse with small white and faded-rose five-petal flowers, sits on an upturned wooden crate at frame left, her honey-amber rattan suitcase across her knees as a desk. Her letter on cream bamboo paper with faded vermilion column rules is folded in thirds, then in half. At 0.3 s she opens the last fold: tucked inside lies a small triangle of faded grey-blue shirt cloth. At 1.3 s her right thumb strokes it once. At 1.9 s she closes the fold along its soft old crease and presses it flat with her whole palm; the folded edge lies horizontal in the lower third. The letter is never sealed; the handwriting stays soft and illegible. Living skin, deep shadows. Migrant-era grade: faded-photograph softness, saturation -15%, creamy highlights, never sepia; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中近景，75mm 变形镜头，平视略俯，缓慢推进约 20 厘米；24 fps。1920–30 年代码头候船棚，夜，第三盏搪瓷灯罩白炽灯（2400K）下，暖光从右上方落下；棚外是蓝黑色的夜海，身后的旅客模糊。迁徙女性——约 20 岁东亚女子，一条乌黑长辫，右眉峰上方一颗小痣，嘴唇略干，穿褪色灰蓝底、印白色与褪玫色小五瓣碎花的棉布大襟衫——坐在画左一只倒扣的木箱上，蜂蜜琥珀色的藤箱横在膝上当桌子。她的信写在印着褪色朱红竖格的米色薄竹纸上，先三折、再对折。0.3 秒，她打开最后一折：折缝里夹着一小片三角形的褪色灰蓝旧衫布。1.3 秒，她的右手拇指摸了一下那片布。1.9 秒，她沿着柔软的旧折痕合上，用整个手掌把信压平；折好的信边水平地落在画面下三分之一。信始终没有封口，字迹柔虚、不可读。肤色鲜活，暗部有层次。迁徙时代调色：褪色家庭照片般的柔和，饱和度 −15%，高光微奶油，绝不做棕褐；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0 (S020's camera data and lamp): MCU, MIGRANT (~20, long black braid over her shoulder, mole above the RIGHT brow peak, faded grey-blue floral blouse) at frame left, head bowed over the honey-amber rattan suitcase across her knees; both small hands hold a cream bamboo-paper letter with faded vermilion column rules, folded in thirds and in half, its last fold just lifting, at (0.52,0.62); warm 2400K bulb pool from upper right; soft dark travellers and a hint of blue-black sea behind; migrant-era faded-photograph grade, never sepia, fine grain, 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧（与 S020 同一机位、同一盏灯）：中近景，迁徙女性（约 20 岁，乌黑长辫搭在肩上，右眉峰上方一颗小痣，褪色灰蓝碎花大襟衫）在画左，低头看着横在膝上的蜂蜜琥珀色藤箱；她小而有力的双手拿着一封印褪色朱红竖格的米色竹纸信，先三折再对折，最后一折刚刚掀起，位于 (0.52,0.62)；右上方 2400K 灯泡的暖色光池；身后是柔暗的旅客与一点蓝黑的海；迁徙时代调色，细腻颗粒，2.39:1。
```
**末帧 / 匹配规格 End frame**
```text
t=2.33 s (A-frame for S044, repeat of the S020->S021 line match): the folded letter lies on the case lid, its top folded edge a clean horizontal line at y=0.66 from x 0.34 to 0.66; her right palm pressed flat on it, fingers toward frame right; braid at left; bulb highlight at upper right; the cloth triangle now hidden inside.
```
**图生视频运动 Motion · EN**
```text
Camera: S020's slow push-in, ~20 cm over the shot, constant after a 6-frame ease-in. Subject (MIGRANT, braid, floral blouse): 0-0.35 s she opens the last half-fold - the grey-blue cloth triangle is revealed; 0.35-1.3 s she looks at it, still; 1.3 s her right thumb strokes it once; 1.5-1.9 s she closes the fold along its crease; 1.93 s her whole palm presses it flat and holds. Blurred travellers drift left to right behind her. 24 fps real time. Must NOT move: bulb, crate, case; the letter is never sealed or fully unfolded; she does not look up.
```
**图生视频运动 Motion · ZH**
```text
摄影机：沿用 S020 的缓慢推进，全程约 20 厘米，6 帧缓入后匀速。主体（迁徙女性，长辫、碎花衫）：0–0.35 秒她打开最后半折——灰蓝三角布片露出来；0.35–1.3 秒她看着它，不动；1.3 秒右手拇指摸一下布片；1.5–1.9 秒沿折痕合上；1.93 秒整个手掌压平并停住。身后模糊的旅客从画左向画右走过。24 fps 真实速度。不得移动：灯泡、木箱、藤箱；信不封口、不完全展开；她不抬头。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.333 | Single generation; I2V with first frame from S020's camera data and the endframe as last-frame guide; generate 2.8 s (0.25 s handles). |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Exact repeat of S020's setup (same camera data, same third lamp) so the only news is the cloth. Cloth triangle = the SHIRT hem cut (#6F7F8F, ~3x4 cm, bible 6.5). Grade CT_MIG (sat -15%, highlights toward P22, 2400K), grain 1.25, halation 0.6 on the bulb. Sync: f3365 (140.22 '等沉默') cloth revealed; f3388 (141.18 '听见') thumb; f3403 (141.8) palm press; hold to f3413. Register the letter edge at y=0.66 for S044.

**连续性锚点 match_to**：Same camera/lamp as S020 (CH1). End: folded edge horizontal at y=0.66 = A-frame of the line match into S044 (as S020 -> S021). The cloth matches the triangle missing from the shirt in S030/S031.

**负面提示词（追加在全局负面之后）**
```text
letter fully unfolded with legible writing, readable characters, envelope, wax seal, red or patterned cloth instead of grey-blue, cloth larger than a small triangle, case held in her left hand, short hair or two braids, missing mole or mole on the left, modern clothing, zippers, sepia, cold white light, crying, moving to a ship's berth
```

#### S044 · 02:22:05 – 02:25:02 · 2.875 s（f3413–f3482）

| 项目 | 内容 |
|---|---|
| 歌词 | 有人要把山河／握在掌间 |
| 段落 / 简报章节 / 时代 / 场景 | CH2 副歌二 / 六 / 地图之手 / `map_office` |
| 景别 / 焦段 / 速度 | INSERT / 75 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 相似构图：S043 信的折缝（水平）→ 直尺墨线（与 S020→S021 相同的线条匹配，重复中递进） |
| 同步点 | 142.92 s “山河”：笔尖接近渔村；144.48 s “掌”：左手掌压平地图 |
| 参考图 refs | `CHAR_MAPHAND` `PROP_MAP` `LOC_MAPOFFICE` |
| 调色 | 地图办公室 |
| 生成时长 | 2.875 s |

**文生视频提示词 T2V · EN**
```text
Top-down insert, 75mm anamorphic, 90 degrees down onto an 1890s drafting table, slow push-in of about 25 cm drifting slightly up-frame; 24 fps. A linen-backed hand-drawn coastal map: brown-ink coastline, hachured hills, blank water; on the shore a tiny pen-drawn fishing village of house outlines, boats drawn up on the beach. MAPHAND, only hands and cuffs: a middle-aged man's well-kept hands, ethnically ambiguous medium skin, a writing bump and faint ink stain on the right middle finger, no ring, dark charcoal frock-coat sleeves, starched white cuffs, plain brass oval cufflinks. The left fingertips hold an ebony brass-edged ruler; the right hand runs a steel ruling pen along it from frame left to right, and at 0.7 s, without hesitation, a straight horizontal line of wet blue-black iron-gall ink cuts through the village's lowest row of houses. At 2.27 s the left hand rises over the wet line without touching it and spreads flat above it, palm covering the village, heel a finger's width clear of the glistening ink. Light: brass kerosene lamp 2200K at frame right; cold moonlight cut into parallel louvre stripes across map and hands. Nothing red, no legible writing. Map-office grade: the hardest, highest-contrast cold look, saturation -25%, grey-green surroundings; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
正顶拍插入镜头，75mm 变形镜头，90° 垂直向下对着一张 1890 年代的制图桌，缓慢推进约 25 厘米并略向画面上方漂移；24 fps。一张裱在亚麻布上的手绘海岸地图：褐色墨线的海岸、晕滃线画的山、水域留白；岸边用细笔画着一小片渔村——房屋轮廓，几条拖上沙滩的小船。掌管地图的手，只见手与袖口：一双保养良好的中年男人的手，肤色是难以判定族裔的中间色，右手中指有写字茧和一点墨渍，无戒指；深炭黑礼服袖，浆白的衬衫袖口，素面黄铜椭圆袖扣。左手指尖按着一把乌木铜边直尺；右手持钢制直线笔沿尺从画左向画右划去，0.7 秒，毫不犹豫，一条笔直的水平铁胆墨线——湿时蓝黑——穿过渔村最下面一排房屋。2.27 秒，左手从湿墨线上方抬过、不碰到它，在线的上方整个摊平按下，掌心盖住那片渔村，掌根离闪亮的湿墨还有一指宽。光：画右一盏黄铜底座煤油灯 2200K；半闭的百叶把冷月光切成平行条纹，落在地图与手上。没有任何红色，没有任何可读文字。地图办公室调色：全片最冷硬、反差最高，饱和度 −25%，四周压成冷灰绿；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0 (B-frame from S043's letter edge): 90-degree top-down on the 1890s linen-backed map; the ruler's upper edge - where the line will run - horizontal at y=0.66 from x 0.30 to 0.90, the ebony brass-edged ruler body just below it (y 0.67-0.76); the tiny pen-drawn fishing village centred at (0.50,0.56) with its lowest row of houses sitting on the line path, boats drawn up on the beach; MAPHAND's right hand (charcoal sleeve, starched cuff, plain brass cufflink) with the steel ruling pen poised on the ruler at (0.30,0.64); left fingertips on the ruler's right end at (0.82,0.72); louvre stripes of cold moonlight diagonal from upper right; warm 2200K lamp glow from frame right; paper #E2D6B8; hard high-contrast cold map-office grade, fine grain, 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧（承接 S043 信边的 B 帧）：90° 正顶拍 1890 年代亚麻裱地图；直尺上沿——也就是墨线将要走的位置——水平地位于 y=0.66，横跨 x 0.30 至 0.90，乌木铜边直尺的尺身在它下面（y 0.67–0.76）；细笔画的小渔村居中于 (0.50,0.56)，最下面一排房屋正压在墨线将要经过的位置，几条小船拖在沙滩上；掌管地图的右手（深炭黑袖、浆白袖口、素面黄铜袖扣）握着钢制直线笔停在尺子左端 (0.30,0.64)；左手指尖按在尺子右端 (0.82,0.72)；冷月光的百叶条纹从右上方斜落；画右 2200K 煤油灯暖光；纸色 #E2D6B8；地图办公室冷硬调色，细腻颗粒，2.39:1。
```
**末帧 / 匹配规格 End frame**
```text
t=2.875 s (A-frame for S045, register (0.45,0.60)): pushed in ~1.35x; MAPHAND's left hand spread flat, palm down, fingers spread toward the top of frame, palm centre at (0.45,0.60), hand width ~35% of frame height, covering the little village; the fresh line now at y~0.84, still wet and shining below the heel; the ruler partly visible at the bottom edge; the right hand and pen lifted away off frame right; louvre stripes across the knuckles.
```
**图生视频运动 Motion · EN**
```text
Camera: 90-degree overhead, slow constant push-in (~25 cm, about 1.35x) centred just above the village and drifting slightly up-frame, so the line travels from y 0.66 to ~0.84 while the village grows; 6-frame ease-in, 8-frame ease-out. Subject (MAPHAND - well-kept hands, charcoal sleeves, starched cuffs, plain cufflinks): 0-0.3 s the nib lowers onto the ruler edge at frame left; 0.3-1.7 s the pen draws left to right at an even speed, crossing the village's lowest houses at 0.71 s, ink pooling slightly and catching the lamp; 1.7 s pen lifts away to frame right; 1.9-2.27 s the left hand releases the ruler, rises over the wet line without touching it and spreads flat above it at 2.27 s, pressing once. 24 fps. Must NOT move: map, lamp, louvre stripes; the ink is never smeared; nothing red.
```
**图生视频运动 Motion · ZH**
```text
摄影机：90° 顶拍，匀速缓慢推进（约 25 厘米，约 1.35 倍），推进中心在渔村上方并略向画面上方漂移，使墨线从 y 0.66 下移到约 0.84，渔村逐渐变大；6 帧缓入、8 帧缓出。主体（掌管地图的手——保养良好、深炭黑袖、浆白袖口、素面袖扣）：0–0.3 秒笔尖落到画左的尺边；0.3–1.7 秒笔匀速从左向右划，0.71 秒穿过渔村最下面一排房屋，墨略微积聚、映着灯光；1.7 秒笔向画右抬离；1.9–2.27 秒左手松开直尺，从湿墨线上方抬过、不碰到它，在 2.27 秒摊平按在线的上方，压一下。24 fps。不得移动：地图、煤油灯、百叶条纹；墨线绝不被抹花；画面中没有任何红色。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.875 | Single generation with first- and last-frame guides (keyframe / endframe); generate 3.4 s (0.25 s handles). If the hand crossing the wet line fails, split at 1.8 s and generate the left-hand move as a second I2V from the frame at 1.8 s. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：CT_MAP: highest contrast, saturation -25%, 2200K lamp with surroundings pulled toward cold grey-green; grain 1.2; halation 0.3. Map has no legible lettering anywhere (check every frame); the village is tiny abstract house outlines; boats only on the beach (water stays blank, PROP_MAP). Sync: f3430 (142.92 '山河') nib reaches the village; f3468 (144.48 '掌') palm lands; hold to f3482. Register the end frame for S045: palm centre (0.45,0.60), hand width 35% of frame height (+/-3%).

**连续性锚点 match_to**：Start: line position at y=0.66 = S043's folded letter edge (CH2 repeat of S020->S021). End: left palm at (0.45,0.60) = A-frame of the S044->S045 gesture match (palm pressing flat -> NAVIGATOR's left hand turning back his cuff).

**负面提示词（追加在全局负面之后）**
```text
red ink, red line, smeared or blotted ink, palm or sleeve touching the wet line, readable place names or letters, compass rose with letters, real colonial map, coat of arms, crest or monogram on the cufflink, ring, face or body of the official, fountain pen or ballpoint, modern plastic ruler, warm cosy grade, soft low-contrast look, boats drawn on the open water, distorted fingers
```

#### S045 · 02:25:02 – 02:28:16 · 3.583 s（f3482–f3568）

| 项目 | 内容 |
|---|---|
| 歌词 | 握在掌间／有人只想再见／某个人一面 |
| 段落 / 简报章节 / 时代 / 场景 | CH2 副歌二 / 六 / 航海人 / `sea_deck` |
| 景别 / 焦段 / 速度 | CU / 100 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 手势 + 相似构图：S044 张开压平地图的左手掌 → 航海人翻开袖口的左手（同一画面位置；跨时代） |
| 同步点 | 145.14 s “有人只想”：左手翻开袖口、指腹停在补丁上；146.7 s “某个”：抬眼；147.54 s “一面”：岸灯映在眼中 |
| 参考图 refs | `CHAR_NAVIGATOR` `PROP_PATCH` `PROP_SHIPLAMP` `PROP_OUTERCOAT` `LOC_DECK` |
| 调色 | 航海时代 |
| 生成时长 | 3.583 s |

**文生视频提示词 T2V · EN**
```text
Close-up, 100mm anamorphic, high on his hands, then tilting up to his eyes; 24 fps; night at the stern-castle rail of a 17th-century ocean-going junk. Frame 0: the large LEFT hand of NAVIGATOR - thick knuckles, rope calluses, cracked fingertips, white salt crystals on the back - pushes up the wide sleeve of his brown padded night coat and folds back the RIGHT cuff of the faded indigo coarse-cotton jacket beneath, revealing a patch of paler blue hand-woven cloth with uneven off-white running stitches and a doubled knot at one corner; his right wrist turns inward; his fingertips rest on the patch. At 1.6 s, as he raises his eyes, the camera tilts up to his face: a ~35-year-old East Asian seaman, long sun-weathered face, high cheekbones, deep-set dark-brown eyes with sun creases, short salt-bleached beard, a pale old scar at the tail of his LEFT eyebrow, indigo head-cloth over a topknot. He is at frame right, gazing to frame left, where one far warm shore light glows as a soft point; by 2.5 s it shines as a tiny reflection in his eye. Light: hard moonlight from upper right; low warm 1950K stern lantern on his cheek. Navigator-era grade: strongest warm-cool split, deep-blue sea and sky against amber lamplight, greens muted; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
近景，100mm 变形镜头，先俯拍他的手，再上摇到他的眼睛；24 fps；夜，17 世纪远洋帆船艉楼的船舷边。第 0 帧：航海人的左手——指节粗大、掌心有缆绳磨出的厚茧、指尖干裂、手背上有细白的海盐结晶——推起棕色夹棉守夜外衣宽大的衣袖，翻开里面那件褪色靛蓝粗棉短褂的右袖口；袖口里层露出一块颜色更浅的手织浅蓝布补丁，本白棉线的针脚不齐，一角有个打了两次的小结；他的右手腕微微内翻；左手指腹停在补丁上。1.6 秒，他抬起眼，摄影机随之上摇到他的脸：约 35 岁的东亚水手，风吹日晒的长脸、颧骨突出、眼窝略深的深褐眼睛带着日晒细纹、被盐与日光漂浅的短须、左眉尾一道浅白的旧疤、靛蓝头巾裹着发髻。他在画右，望向画左——那里远远一点温暖的岸灯，是一个柔和的光点；到 2.5 秒，它在他眼里映成一个小小的亮点。光：右上方来的硬质月光；低位 1950K 艉灯暖光落在他脸颊上。航海时代调色：全片最强的冷暖对比，深蓝的海与天对琥珀色灯光，绿色压低；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0 (B-frame of the S044 match): high-angle CU of NAVIGATOR's hands at chest height against dark deck planks; his large salt-crusted LEFT hand at (0.45,0.60), hand width ~35% of frame height, thumb and forefinger turning back the cuff of his RIGHT faded-indigo jacket sleeve toward camera, the wide sleeve of his brown padded night coat pushed up his forearm; inside the cuff the 4.5x6 cm pale-blue patch (#7D9CBB) with uneven off-white running stitches and the double knot at one corner, its centre rubbed soft and shiny; salt crystals glinting on his knuckles under hard moonlight from upper right; low warm stern-lantern glow from frame right; navigator-era warm-cool grade, fine grain, 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧（S044 匹配的 B 帧）：俯拍近景，航海人的双手在胸前高度，背景是暗色的甲板木板；他带盐的粗大左手位于 (0.45,0.60)，手宽约占画面高 35%，拇指与食指把右边褪色靛蓝短褂的袖口朝镜头翻开，棕色夹棉外衣宽大的衣袖推到小臂上；袖口里层是 4.5×6 厘米的浅蓝补丁（#7D9CBB），本白针脚不齐，一角一个双结，中间被摩挲得起毛、发亮；右上方硬质月光下，指节上的盐晶闪着微光；画右低位艉灯暖光；航海人时代调色，细腻颗粒，2.39:1。
```
**末帧 / 匹配规格 End frame**
```text
t=3.58 s (light-point A-frame for S046): CU of NAVIGATOR's face at right-centre in a left-facing three-quarter profile, the pale scar at the tail of his LEFT eyebrow visible, indigo head-cloth; his near eye at (0.60,0.44) holding a tiny warm catchlight; far out of focus at frame left, the single warm shore light as a soft round point at (0.40,0.46) - matched by the E1 gate lantern in S046; moonlit cheek edge; dark-blue sea.
```
**图生视频运动 Motion · EN**
```text
Camera: 0-1.6 s held high on the cuff (micro push only); 1.6-3.0 s smooth tilt up ~35 degrees with a ~15 cm push-in following his rising gaze, eased out by 3.0 s; follow focus patch -> eye, rack complete at 2.4 s. Subject (NAVIGATOR, brown padded night coat over the indigo jacket, salt-crusted hands): 0-0.1 s the cuff completes its turn and his left fingertips settle on the patch; 0.8 s his thumb rubs the patch once; 1.6 s his eyes lift and his head turns slightly toward frame left; 2.46 s the shore light finds his eye; he holds, breathing; the ship rolls gently (7 s period) and the lantern glow sways slowly. 24 fps real time. Must NOT move: the shore light's position; the patch stays inside the RIGHT cuff; no tears.
```
**图生视频运动 Motion · ZH**
```text
摄影机：0–1.6 秒停在袖口的俯拍（只有极微的推进）；1.6–3.0 秒随着他抬起的视线平滑上摇约 35°，同时推进约 15 厘米，3.0 秒缓停；跟焦：补丁 → 眼睛，2.4 秒转焦完成。主体（航海人，靛蓝短褂外披棕色夹棉外衣，带盐的手）：0–0.1 秒袖口翻开到位，左手指腹停在补丁上；0.8 秒拇指摩挲补丁一下；1.6 秒他抬眼，头微微转向画左；2.46 秒岸灯落进他的眼里；他停住，呼吸；船以约 7 秒的周期缓缓起伏，艉灯的暖光随之慢慢摆动。24 fps 真实速度。不得移动：岸灯的位置；补丁始终在右袖口里层；不流泪。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.583 | Single generation with first- and last-frame guides; generate 4.1 s (0.25 s handles). Fallback: split at 1.6 s (cuff hold / tilt-up) with an 8-frame blend on the tilt's ease-in. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：CT_NAV grade (sea/sky P01-P03 vs lantern P13; greens -20%), grain 1.15, halation 0.5 on the shore point and lantern. Patch must match S011 / S035 (same cloth as the wife's jacket, double knot). Sync: f3483 (145.14 '有人只想') fingertips on the patch; f3521 (146.7 '某个') eyes lift; f3541 (147.54 '一面') shore light in his eye; hold to f3568. CH2 order lock: patch first, then the light. Register the shore-light point (0.40,0.46) for S046. Night-costume lock (QA): brown padded night coat PROP_OUTERCOAT over the indigo jacket, as in S022; he gives it away in S067 and is coatless in S075.

**连续性锚点 match_to**：Start = B-frame of S044 (left hand at (0.45,0.60), 35% of frame height). End: shore-light point at (0.40,0.46) is the light-to-light anchor for S046's E1 gate lantern. Shore-left geography as in S008, S022.

**负面提示词（追加在全局负面之后）**
```text
patch on the left cuff or on the outside of the sleeve, patch red or patterned, right hand turning the cuff, smooth clean hands, gloves, Qing queue or shaved forehead, modern clothing, scar on the right eyebrow, shore light on frame right, looking right, daylight, tears, slow motion, shaky handheld, sharp full-moon disc in frame
```

### 桥段一 BR1

#### S046 · 02:28:16 – 02:31:15 · 2.958 s（f3568–f3639）

| 项目 | 内容 |
|---|---|
| 歌词 | 换旗换誓言／旧梦换了衣冠 |
| 段落 / 简报章节 / 时代 / 场景 | BR1 桥段一 / 六 / 多时代 / `harbor_eras` |
| 景别 / 焦段 / 速度 | WS / 40 mm / 24 |
| 入点转场 | 光线转场 0 帧 — S045 眼中的岸灯 → 固定机位里关口同一画面位置的一盏灯笼（E1；光点接光点；跨时代） |
| 同步点 | 148.88 s “换旗”：E1 在画面中；149.21 s “换（誓言）”：切 E2；150.42 s “换（了）”：切 E3；150.84 s “衣冠”：切 E4 |
| 参考图 refs | `CHAR_MIGRANT` `PROP_CASE` `LOC_HARBOR` |
| 调色 | 多时代/过渡（见提示词） |
| 生成时长 | 2.958 s |

**文生视频提示词 T2V · EN**
```text
Locked wide shot, 40mm anamorphic, lens 1.6 m on a quay road at dusk, looking east along a fictional South China Sea waterfront: identical frame and light in every era, hard cuts on the beat; 24 fps. Frame left, a harbour customs-house facade; at 38% across, a gate with a granite threshold where one person waits on the same spot; frame right, harbour water and ships; a flagpole on the corner roof. The sun has just set behind camera: last warm-pink light on the facades, deep blue eastern sky. 0-0.54 s, c.1630s: timber godown, granite landing steps, a stockade gate with a hanging lantern, junks with plain pennants, a woman with a bamboo basket. 0.54 s, c.1890s: a new lime-rendered customs house, kerosene street lamps, a limp invented slate-blue flag with a pale wave line, plain white drill uniforms, a porter with a carrying pole. 1.75 s, c.1930s: an awning and wires, incandescent lamps, a different invented flag, khaki-grey tunics, a single-funnel steamer; MIGRANT (~20, long braid, faded grey-blue floral blouse) holds her rattan case in her RIGHT hand. 2.17 s, c.1950s: repainted facade, window grilles, muted sodium lamps, another invented flag, a father holding a child's hand. One dusk grade in every slice, only practicals change by era; fine 35mm grain, 2.39:1, no real flags or insignia, no text.
```
**文生视频提示词 T2V · ZH**
```text
锁定的全景，40mm 变形镜头，镜头高 1.6 米，暮色中站在码头路上，沿一座虚构的南海港口水岸向东看：每个时代画面与光线完全相同，在节拍上硬切；24 fps。画左是港口关栈的立面；画面 38% 处是一道关口大门与花岗岩门槛，一个等待的人总站在同一个位置；画右是港湾水面与船；转角屋顶上一根旗杆。太阳刚在摄影机身后落下：立面上是最后一点暖粉色的光，东边天空深蓝。0–0.54 秒，约 1630 年代：木构货栈、花岗岩登岸石阶、挂着一盏灯笼的木栅门、挂着无字长幡的帆船，一个挎竹篮的妇人。0.54 秒，约 1890 年代：新建的石灰抹面关栈、煤油路灯、一面半垂的虚构旗帜（石板灰蓝底、一道浅色波浪线）、素面白色斜纹布制服，一个挑担的脚夫。1.75 秒，约 1930 年代：加了雨棚与电线、白炽路灯、换了另一面虚构旗帜、卡其灰立领制服、一艘单烟囱轮船；迁徙女性（约 20 岁，长辫，褪色灰蓝碎花衫）右手提着她的藤箱。2.17 秒，约 1950 年代：立面重新粉刷、加了铁窗、低饱和的钠灯、又一面虚构旗帜，一个牵着孩子的父亲。每个时代切片是同一种暮色调色，只有人工光随时代变化；细腻 35mm 颗粒，2.39:1，不出现任何真实旗帜或徽章，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0 (E1, c.1630s; LOC_HARBOR locked camera: 40mm, 1.6 m, looking east): frame left a timber godown and granite landing steps; at x=0.38 a timber stockade gate with a small warm hand-lantern hanging at its right post at (0.40,0.46); a woman with a bamboo basket waits at (0.38,0.70); frame right harbour water with two junks flying plain text-free pennants (faded madder / indigo); sun just set behind camera, last warm-pink light on the timber facade, deep blue eastern sky (P02-P03); torches dotted along the quay; fine grain, 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧（E1，约 1630 年代；港口固定机位：40mm、1.6 米、向东）：画左是木构货栈与花岗岩登岸石阶；x=0.38 处一道木栅门，门的右侧柱上挂着一盏小小的暖色手提灯笼，位于 (0.40,0.46)；一个挎竹篮的妇人等在 (0.38,0.70)；画右港湾水面上两艘帆船挂着无字长幡（褪茜红 / 靛蓝）；太阳刚在摄影机身后落下，木立面上是最后一点暖粉色，东边天空深蓝（P02–P03）；码头上点着几支火把；细腻颗粒，2.39:1。
```
**末帧 / 匹配规格 End frame**
```text
t=2.958 s (E4 slice, A-frame for S047): same locked frame, c.1950s-60s repainted facade with iron window grilles; the gate's granite threshold with its iron edge strip reads as a horizontal line at y=0.66 from x 0.30 to 0.46; a father holding a small child's hand waits at (0.38,0.70); a limp invented flag F-D (sand field, thin slate bands, small slate eight-pointed star) half hidden on the corner pole; desaturated sodium lamps; freighters and barges at right; same dusk sky as E1.
```
**图生视频运动 Motion · EN**
```text
Camera absolutely locked - identical motion-control / tripod data for every era (reused for S080). Within each slice only small life: lantern and torch flames breathe, pennants and flags stir limply, water moves, the waiting person shifts weight but stays at (0.38,0.70). Era changes are hard cuts at 0.54 s, 1.75 s and 2.17 s - never morph, never dissolve. In E3 MIGRANT (long braid, faded floral blouse) stands still with the rattan case in her RIGHT hand. 24 fps. Must NOT move: camera, horizon, facade corner, sky light direction.
```
**图生视频运动 Motion · ZH**
```text
摄影机绝对锁定——每个时代使用完全相同的运动控制 / 三脚架机位数据（S080 复用）。每个切片里只有细小的生活：灯笼与火把的火苗呼吸，长幡与旗帜无力地轻动，水面起伏，等待的人重心微移但始终站在 (0.38,0.70)。时代更替在 0.54、1.75、2.17 秒硬切——绝不变形、绝不叠化。E3 中迁徙女性（长辫、褪色碎花衫）静静站着，右手提着藤箱。24 fps。不得移动：摄影机、地平线、建筑转角、天光方向。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 0.542 | E1 slice (f3568-f3581). Generate plate E1 locked 1.5 s; use any 13 frames. |
| 0.542 | 1.75 | E2 slice (f3581-f3610). Generate plate E2 locked 2.0 s. |
| 1.75 | 2.167 | E3 slice (f3610-f3620), only 10 frames - see director note. Generate plate E3 locked 1.5 s; pick the frames where the migrant is still and the case reads. |
| 2.167 | 2.958 | E4 slice (f3620-f3639). Generate plate E4 locked 1.5 s; last frame registers the threshold line at y=0.66 for S047. |

**分层与合成 Plates & compositing**

- **Plate E1**：c.1630s: timber godown, granite landing steps, timber stockade gate with a hand-lantern at its right post (0.40,0.46), junks with plain text-free pennants (madder #9A5A44 / indigo #2E3F5C), torches; a woman with a bamboo basket at (0.38,0.70); no threshold slab yet.
- **Plate E2**：c.1890s: new customs house, complete lime render, kerosene street lamps; invented flag F-B (2:3 slate grey-blue #4E6273, one off-white wave line with three crests, small ochre disc #B48A45 upper hoist) limp and distant; white drill stand-collar uniforms with plain bone buttons, no badges; sailing ships and an early steamer; a porter with a carrying pole at (0.38,0.70).
- **Plate E3**：c.1930s: awning and overhead wires added, incandescent street lamps; invented flag F-C (dark oxide-brown #6E4A3A, cream ring centred, narrow cream fly border) partly hidden; khaki-grey stand-collar tunics and peaked caps with the invented ring-and-wave badge; single-funnel passenger-cargo steamer (invented ochre/slate funnel); MIGRANT at (0.38,0.70), long braid, faded grey-blue floral blouse, honey-amber rattan case in her RIGHT hand.
- **Plate E4**：c.1950s-60s: repainted facade, iron window grilles; invented flag F-D (1:2 sand #C2B08C, thin slate bands top and bottom, small slate eight-pointed star) half furled; pale grey shirt-uniforms with plain shoulder loops, no rank; freighters and barges; desaturated sodium lamps; a father holding a child's hand at (0.38,0.70); threshold iron strip horizontal at y=0.66.
- **合成 / 速度 / 调色 / 同步（post）**：All four plates from one camera solve (LOC_HARBOR series); align on the facade corner and horizon (sub-pixel), then hard-cut at f3581 (149.21 '换'), f3610 (150.42 '换'), f3620 (150.84 '衣冠'). Sky and facade light must be identical across slices - grade every plate to the E1 sky reference; per-era offsets only in practicals and costume (CT_BASE with E1 torch warmth, E2 colder kerosene, E3 CT_MIG softness, E4 desaturated sodium). Flag clearance (bible 7.7 / 10-2): compare F-B/F-C/F-D with real flags before final; keep them distant, limp or partly hidden. Grain 1.15-1.25 per era, unified in the final pass. Sync: f3573 (148.88 '换旗') E1 on screen.

**连续性锚点 match_to**：Start: E1 gate lantern at (0.40,0.46) = S045's shore-light point (light to light). End: E4 threshold iron edge horizontal at y=0.66 = A-frame of S047's ink line. Same camera data reused for S080 (E5, today at dawn).

**负面提示词（追加在全局负面之后）**
```text
real national, colonial, party, military or shipping-line flags, flags in close-up or fluttering heroically, readable signs, shop names, insignia or badges with text, morph or dissolve between eras, camera movement, changing light direction or time of day between slices, sunrise, waiting person in a different position, migrant holding the case in her left hand, crowds blocking the gate, modern cars in pre-1950s slices, Orientalist clichés, sepia wash
```

#### S047 · 02:31:15 – 02:32:20 · 1.208 s（f3639–f3668）

| 项目 | 内容 |
|---|---|
| 歌词 | 地图添一道线 |
| 段落 / 简报章节 / 时代 / 场景 | BR1 桥段一 / 六 / 地图之手 / `map_office` |
| 景别 / 焦段 / 速度 | INSERT / 100 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 相似构图：E4 切片中门槛与码头边缘的水平线 → 地图上的新墨线（同高度 y=0.66） |
| 同步点 | 151.64 s “地图”：笔尖落下；152.6 s “线”：线划完，笔尖离纸 |
| 参考图 refs | `CHAR_MAPHAND` `PROP_MAP` `LOC_MAPOFFICE` |
| 调色 | 地图办公室 |
| 生成时长 | 1.208 s |

**文生视频提示词 T2V · EN**
```text
Macro insert, 100mm macro lens, 90 degrees straight down onto an 1890s linen-backed hand-drawn map, locked; 24 fps. Cream map paper with visible fibres and a faint brown-ink hachured slope. Frame 0: the steel nib of a ruling pen touches down at frame left against the brass edge of an ebony ruler lying just below; in under a second it draws one straight horizontal line of iron-gall ink from left to right at two-thirds of frame height - wet blue-black, bleeding a hair into the paper fibres and glistening under the lamp. At 0.97 s the nib lifts away. Of MAPHAND only the soft edge of a starched white shirt cuff and a plain unengraved brass cufflink shows at the lower-left corner; no face, no ring. Light: hard 2200K kerosene lamp from frame right raking the paper; cold parallel louvre stripes of moonlight across the frame. T8, crisp but not over-sharpened; the ink is never red; no letters, numbers or legible marks. Map-office grade: the hardest, highest-contrast cold look, saturation -25%, grey-green surroundings; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
微距插入镜头，100mm 微距镜头，90° 垂直俯拍一张 1890 年代亚麻裱手绘地图，锁定；24 fps。米色地图纸，纸纤维清晰，一片淡淡的褐墨晕滃线山坡。第 0 帧：直线笔的钢笔尖在画左落下，贴着下方一把乌木直尺的黄铜边；不到一秒，它从左向右划出一条笔直的水平铁胆墨线，位于画面三分之二高度——湿时蓝黑，在纸纤维里微微洇开一丝，在灯下闪着光。0.97 秒笔尖抬起离开。掌管地图的手只在画面左下角露出一点浆白衬衫袖口的柔边和一枚素面无刻花的黄铜袖扣；没有脸，没有戒指。光：画右 2200K 煤油灯硬光掠过纸面；冷月光被百叶切成平行条纹横过画面。T8，清晰但不过度锐化；墨线绝不是红色；没有任何字母、数字或可读的痕迹。地图办公室调色：全片最冷硬、反差最高，饱和度 −25%，四周压成冷灰绿；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0 (B-frame from S046's E4 threshold line): 100mm macro, 90-degree top-down on cream 1890s map paper (#E2D6B8) with visible fibres and faint brown hachures; the ebony ruler's brass edge horizontal just below y=0.66 across the frame; the steel ruling-pen nib touching the paper at (0.30,0.66), a bead of wet blue-black iron-gall ink at the tip; MAPHAND's starched white cuff and plain brass cufflink soft at the lower-left corner; louvre stripes of cold moonlight crossing diagonally; hard 2200K lamp raking from frame right; hard high-contrast cold map-office grade, fine grain.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧（承接 S046 E4 门槛线的 B 帧）：100mm 微距，90° 正俯拍 1890 年代米色地图纸（#E2D6B8），纸纤维与淡褐晕滃线清晰；乌木直尺的黄铜边水平地横在 y=0.66 稍下方；直线笔的钢笔尖正落在 (0.30,0.66)，笔尖挂着一粒湿的蓝黑铁胆墨；掌管地图的手的浆白袖口与素面黄铜袖扣柔虚地露在左下角；冷月光的百叶条纹斜着横过画面；画右 2200K 煤油灯硬光掠射；地图办公室冷硬调色，细腻颗粒。
```
**末帧 / 匹配规格 End frame**
```text
t=1.21 s (A-frame for S048): the new line complete, horizontal at y=0.66 from x 0.30 to 0.92, wet sheen catching the lamp, a hair of bleed into the fibres; nib gone; ruler's brass edge just below; louvre stripes.
```
**图生视频运动 Motion · EN**
```text
Camera locked. Subject (MAPHAND's ruling pen; only cuff edge and plain cufflink visible): 0.015 s nib touches down at (0.30,0.66); 0.02-0.95 s draws left to right at an even, unhesitating speed along the ruler edge; ink flows and bleeds slightly into fibres; 0.975 s nib lifts off to frame right. 24 fps. Must NOT move: paper, ruler, lamp stripes; no smear, no second stroke; ink never red.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定。主体（掌管地图的手的直线笔；只见袖口边与素面袖扣）：0.015 秒笔尖落在 (0.30,0.66)；0.02–0.95 秒沿尺边从左向右匀速、毫不犹豫地划过；墨水流出并在纤维里微微洇开；0.975 秒笔尖向画右抬离。24 fps。不得移动：纸、直尺、灯光条纹；不抹花、不划第二笔；墨线绝不是红色。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 1.208 | Single generation; generate 1.7 s (0.25 s handles) and trim; consider a practical macro insert (real ruling pen and iron-gall ink) for perfect ink behaviour. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：CT_MAP grade, grain 1.2, halation 0.3. T17 register: line y=0.66, drawn left -> right, starts at x 0.30 where S046's E4 threshold strip begins. Sync: f3639 (151.64 '地图') nib down; f3662 (152.6 '线') nib up; cut f3668.

**连续性锚点 match_to**：Start = B-frame of S046's E4 threshold line (y=0.66, from x 0.30). End = A-frame of S048 (line -> threshold iron strip at y=0.66).

**负面提示词（追加在全局负面之后）**
```text
red ink, ink splash or blot, smeared line, crooked or wavy line, readable text or numbers, ballpoint or fountain pen, modern plastic ruler, warm cosy grade, face, ring, crest, motion blur, over-sharpened plastic macro, a second line already present
```

#### S048 · 02:32:20 – 02:35:06 · 2.417 s（f3668–f3726）

| 项目 | 内容 |
|---|---|
| 歌词 | 谁就多一道关 |
| 段落 / 简报章节 / 时代 / 场景 | BR1 桥段一 / 六 / 迁徙 / `map_office` |
| 景别 / 焦段 / 速度 | CU / 50 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 相似构图：地图墨线 → 门槛铁条直线（同方向、同画面高度 y=0.66；跨时代：maphand → migrant） |
| 同步点 | 152.84 s 切入：门槛铁条在 y=0.66（保持 ≥12 帧）；153.4 s 上摇开始；153.86 s “一道”：上摇到手；154.4 s “关”：手攥紧提手 |
| 参考图 refs | `CHAR_MIGRANT` `PROP_CASE` `LOC_HARBOR` `LOC_MAPOFFICE` |
| 调色 | 迁徙时代 |
| 生成时长 | 2.417 s |

**文生视频提示词 T2V · EN**
```text
Close-up, 50mm anamorphic, starting at ground level and rising slowly along her side; 24 fps. A 1930s customs-hall doorway at dusk: a granite threshold capped by an iron edge strip, its straight edge horizontal across frame at two-thirds height, held still for half a second; beyond, out of focus, a waiting queue and a thin band of blue-hour sky. A pair of black cloth shoes with white layered soles stands just behind the strip, side-on to us, toes toward frame right. At 0.57 s the camera rises along her - wide dark indigo trousers, the hem of a faded grey-blue blouse with small white and rose five-petal flowers - and settles at 1.0 s on her RIGHT hand gripping the rattan-wrapped handle of a honey-amber rattan suitcase with brown leather straps and bright brass buckles; the handle bar lies horizontal at the same two-thirds height. At 1.57 s her small strong hand tightens, knuckles whitening. She is MIGRANT, ~20; her face never enters frame. Light: an enamel-shaded 2400K bulb overhead; cool blue-hour spill through the doorway. Deep shadow detail. Migrant-era grade: faded-photograph softness, saturation -15%, creamy highlights, never sepia; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
近景，50mm 变形镜头，从贴地高度开始，沿她的身侧缓慢升起；24 fps。1930 年代关口大厅的门洞，暮色：一道外缘包着铁条的花岗岩门槛，笔直的边线水平横过画面三分之二高度，静止停留半秒；门外焦外是排队等候的人群与一线蓝调时刻的天光。一双白色千层底的黑布鞋停在铁条后面，侧对镜头，鞋尖朝向画右。0.57 秒摄影机沿着她升起——深靛黑阔腿裤、褪色灰蓝底白色与褪玫色小五瓣碎花大襟衫的衣摆——1.0 秒停在她的右手上：她攥着一只蜂蜜琥珀色藤箱藤皮缠绕的提手，藤箱有棕色皮带与明亮的黄铜带扣；提手横杆水平地停在同样的三分之二高度。1.57 秒，她小而有力的手攥得更紧，指节发白。她是约 20 岁的迁徙女性，脸始终不入画。光：头顶一盏搪瓷灯罩白炽灯 2400K；门洞外透进冷色的蓝调天光。暗部有层次。迁徙时代调色：褪色家庭照片般的柔和，饱和度 −15%，高光微奶油，绝不做棕褐；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0 (B-frame from S047's ink line): lens ~12 cm above worn granite; the threshold's iron edge strip a clean horizontal line at y=0.66 across the frame (x 0.05-0.95); behind it, sharp, MIGRANT's black cloth shoes with white layered soles, side-on, toes toward frame right at (0.50,0.58); beyond the doorway a soft queue of travellers and a band of blue-hour sky; overhead 2400K bulb light on the stone; migrant-era faded-photograph grade, never sepia, fine grain, 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧（承接 S047 墨线的 B 帧）：镜头离磨旧的花岗岩约 12 厘米；门槛外缘的铁条是一条干净的水平线，位于 y=0.66，横贯画面（x 0.05–0.95）；铁条后面清晰的是迁徙女性白色千层底的黑布鞋，侧对镜头，鞋尖朝画右，位于 (0.50,0.58)；门洞外是柔虚的排队旅客与一带蓝调天光；头顶 2400K 灯光落在石面上；迁徙时代调色，细腻颗粒，2.39:1。
```
**末帧 / 匹配规格 End frame**
```text
t=2.42 s (A-frame for S049): MIGRANT's small RIGHT hand clenched on the new honey-amber rattan-wrapped handle, knuckles pale; the handle bar horizontal at y=0.66 spanning x 0.28-0.72 (~45% of frame width); the case's top edge, brown strap and bright brass buckle below it; faded floral blouse hem soft at upper left; 2400K top light.
```
**图生视频运动 Motion · EN**
```text
Camera: 0-0.57 s locked low (lens ~12 cm above the stone), threshold edge at y=0.66; 0.57-1.03 s smooth pedestal rise of ~60 cm with a slight tilt, eased landing at 1.03 s with the handle bar at y=0.66; locked to the end. Focus follows threshold -> shoes -> hand. Subject (MIGRANT - faded floral blouse, indigo trousers, case in her RIGHT hand): feet still; the case hangs still; 1.57 s her grip tightens, knuckles whitening, a faint creak of rattan; the queue drifts softly beyond. 24 fps. Must NOT move: the threshold; she does not step over it; the case never changes hands.
```
**图生视频运动 Motion · ZH**
```text
摄影机：0–0.57 秒贴地锁定（镜头离石面约 12 厘米），门槛边线在 y=0.66；0.57–1.03 秒平滑升起约 60 厘米并略带俯仰，1.03 秒缓停，提手横杆落在 y=0.66；之后锁定到结束。跟焦：门槛 → 布鞋 → 手。主体（迁徙女性——褪色碎花衫、靛黑阔腿裤、右手提箱）：双脚不动；藤箱静静垂着；1.57 秒她攥得更紧，指节发白，藤条轻轻一响；门外的队伍柔柔地移动。24 fps。不得移动：门槛；她不跨过门槛；藤箱不换手。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.417 | Single generation with first- and last-frame guides (threshold keyframe / handle endframe); generate 2.9 s (0.25 s handles). If the rise drifts, split at 1.03 s and lock the handle segment from the endframe. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：CT_MIG grade, grain 1.25, halation 0.6 on the bulb. Register: hold the threshold edge at y=0.66 for >=13 frames (f3668-f3682); handle bar y=0.66, x 0.28-0.72 from f3693 = A-frame for S049. Rattan here is NEW (bright buckles, unworn wrap). Sync: f3668 cut on '谁就' (152.84); f3682 (153.4) rise begins; f3693 (153.86 '一道') hand framed; f3706 (154.4 '关') grip tightens.

**连续性锚点 match_to**：Start = B-frame of S047's line (iron strip y=0.66, left -> right). End = A-frame for S049 (same handle bar at y=0.66, ~45% of frame width). The threshold is the same granite/iron sill as the harbour gate (LOC_HARBOR) and LOC_MAPOFFICE's threshold view.

**负面提示词（追加在全局负面之后）**
```text
case in her left hand, wooden threshold, stepping over the threshold, her face, red cloth, readable signs or tickets, officials or uniforms in focus, flags, modern shoes or sneakers, plastic handle, worn museum-state rattan (it must be new here), sepia, cold white light, shaky camera, fast crane swoop
```

#### S049 · 02:35:06 – 02:38:00 · 2.750 s（f3726–f3792）

| 项目 | 内容 |
|---|---|
| 歌词 | 你的明天／已是我的从前 |
| 段落 / 简报章节 / 时代 / 场景 | BR1 桥段一 / gap / 现代 / `restoration_lab` |
| 景别 / 焦段 / 速度 | INSERT / 75 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 相似构图：迁徙女性攥紧的新提手 → 修复师手中同一提手的老旧状态（同一物、同位置 y=0.66；跨时代） |
| 同步点 | 155.34 s “你的明天”：老提手入画；157.02 s “我的从前”：取出保护套中的旧信 |
| 参考图 refs | `CHAR_RESTORER` `PROP_SHIRT` `PROP_CASE` `PROP_KEEPSAKE` `PROP_LETTER` `PROP_GLOVES` `PROP_COAT` `LOC_LAB` |
| 调色 | 现代夜间 |
| 生成时长 | 2.75 s |

**文生视频提示词 T2V · EN**
```text
Insert, 75mm anamorphic, high angle on a conservator's oak workbench at night, then a slow tilt up; 24 fps. The same rattan suitcase as a museum object: split rattan darkened and frayed, the handle's rattan wrap stained deep brown by old sweat, one broken corner, dry cracked straps, dull buckles left unbuckled. Frame 0: the handle bar horizontal across frame at two-thirds height. The warm-white cotton-gloved right hand of RESTORER, a ~28-year-old East Asian conservator in a charcoal wool coat, closes gently around it; her left hand lifts the lid, a small rubbed lighter-grey worn spot on the little-finger side of her LEFT coat cuff. The camera tilts up into the case: indigo-and-white resist-printed lining, a folded faded grey-blue shirt, on top a small boxwood comb lying on an unwrapped faded red-brown cloth. She moves comb and cloth aside together, and at 1.8 s draws from under the shirt a clear polyester sleeve holding a flattened old letter of cream bamboo paper, its folds now soft valleys, foxed, writing illegible. Light: warm 3500K articulated bench lamp from upper left; dark harbour window beyond. Deep shadow detail. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
插入镜头，75mm 变形镜头，夜里俯拍修复师的橡木工作台，随后缓慢上摇；24 fps。同一只藤箱，如今是博物馆藏品：劈藤发暗、起毛，提手缠绕的藤皮被旧日手汗浸成深褐，一角断裂，皮带干裂，带扣发暗、已经解开。第 0 帧：提手横杆水平地横在画面三分之二高度。修复师——约 28 岁东亚女性文物修复师，深灰羊毛呢外套——戴略暖白的薄棉手套的右手轻轻握住它；她的左手掀起箱盖，左袖口外侧小指一侧有一小块起毛、颜色变浅的磨损。摄影机上摇进入箱内：蓝白相间的蓝印花布内衬，一件叠好的褪色灰蓝旧衫，最上面是一把小黄杨木梳，平放在解开的褪色红褐包布上。她把木梳连同包布一起轻轻移开，1.8 秒从旧衫下面抽出一只透明聚酯保护套——里面是一封展平的米色竹纸旧信，折痕已成柔软的凹谷，有霉斑，字迹不可读。光：左上方 3500K 可调臂台灯的暖光；远处是暗色的港口窗。暗部有层次。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0 (B-frame of S048's handle): high-angle insert on the oak bench; the closed museum-state rattan case lying flat, its old handle bar horizontal at y=0.66 spanning x 0.28-0.72, rattan wrap dark brown and frayed, a broken corner at right; unbuckled cracked straps; RESTORER's thin warm-white cotton-gloved right hand (faint brass smudge on the index tip) entering from lower right, open, about to close on the handle; charcoal coat cuff at the wrist; 3500K lamp light from upper left; modern night grade (neutral-cool, never cyan), fine grain, 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧（S048 提手的 B 帧）：俯拍橡木工作台的插入镜头；合上的博物馆状态藤箱平放着，老旧的提手横杆水平地位于 y=0.66，横跨 x 0.28–0.72，缠绕的藤皮深褐、起毛，画右一角断裂；干裂的皮带已解开；修复师戴略暖白薄棉手套的右手（食指指尖一点黄铜污迹）从右下方伸进来，张开，正要握住提手；手腕处是深灰外套的袖口；左上方 3500K 台灯光；现代调色，细腻颗粒，2.39:1。
```
**末帧 / 匹配规格 End frame**
```text
t=2.75 s: tilted up ~15 degrees; the open case with its indigo-and-white resist-print lining; the boxwood comb on its red-brown cloth moved aside at left; the folded grey-blue shirt below; RESTORER's two gloved hands lifting the clear polyester sleeve with the flattened letter at (0.52,0.42), lamp glinting off the sleeve; her LEFT coat cuff with the worn spot visible at lower left.
```
**图生视频运动 Motion · EN**
```text
Camera: 0-0.5 s locked; 0.5-1.6 s slow tilt up ~15 degrees following the lid, eased; then locked. Subject (RESTORER - warm-white cotton gloves, charcoal coat, worn spot on the LEFT cuff): 0.09 s her gloved right hand closes gently on the handle; 0.4-1.1 s her left hand raises the lid back on its leather hinges; 1.1-1.6 s her right hand lifts comb and cloth aside to frame left as one; 1.6-2.75 s both hands slide the sleeve out from under the shirt and lift it toward the lamp. Careful, slow conservator movements, real time. 24 fps. Must NOT move: shirt fold, lining; gloves stay on; the comb stays on its cloth.
```
**图生视频运动 Motion · ZH**
```text
摄影机：0–0.5 秒锁定；0.5–1.6 秒跟随箱盖缓慢上摇约 15°，缓入缓出；之后锁定。主体（修复师——略暖白棉手套、深灰外套、左袖口磨损）：0.09 秒戴手套的右手轻轻握住提手；0.4–1.1 秒左手把箱盖沿皮条合页向后掀起；1.1–1.6 秒右手把木梳连同包布一起移到画左；1.6–2.75 秒双手把保护套从旧衫下面抽出，向台灯方向托起。修复师谨慎而缓慢的动作，真实速度。24 fps。不得移动：旧衫的折叠、内衬；手套始终戴着；木梳始终放在包布上。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 1.4 | Seg 1: handle match + lid opening; I2V from the S048-matched keyframe; generate 0-1.65 s. |
| 1.2 | 2.75 | Seg 2: inside the case - comb aside, sleeve out; generate 0.95-3.0 s (0.25 s handles); blend 1.2-1.4 s on the lid settling. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：CT_MODERN grade, grain 1.0, halation 0.3. Register start against S048's end: handle bar y=0.66, ~45% of width (+/-3%) - new -> museum state of the same object. Case = the G3c case (same broken corner) brought down after S041; comb/cloth layout as S030. Sync: f3728 (155.34 '你的明天') hand closes on the handle; f3768 (157.02 '我的从前') sleeve lifted; cut f3792.

**连续性锚点 match_to**：Start = B-frame of S048 (same handle bar, new -> museum state, same position and size). Letter's museum state continues through S050-S054.

**负面提示词（追加在全局负面之后）**
```text
bare hands, nitrile or blue gloves, new shiny rattan, bright buckles, different case colour, red lining, comb in a box, readable letter, crumpled plastic bag, sleeve with labels or text, logos, harsh fluorescent light, cyan shadows, extra fingers, worn spot on the right cuff, cuffs rolled up
```

#### S050 · 02:38:00 – 02:42:14 · 4.583 s（f3792–f3902）

| 项目 | 内容 |
|---|---|
| 歌词 | 已是我的从前／可我读过年月／不等于把你看穿 |
| 段落 / 简报章节 / 时代 / 场景 | BR1 桥段一 / gap / 现代 / `restoration_lab` |
| 景别 / 焦段 / 速度 | MCU / 75 mm / 24 |
| 入点转场 | 切 0 帧 — 物 → 人 |
| 同步点 | 158.52 s “读过年月”：铅笔打勾；159.96 s “把你”：笔停住；160.5 s 背景门玻璃里手电光扫过；160.92 s “看穿”：她抬眼，若有所思 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_GUARD` `PROP_LETTER` `PROP_GLOVES` `PROP_COAT` `PROP_LEDGER` `PROP_FLASHLIGHT` `LOC_LAB` |
| 调色 | 现代夜间 |
| 生成时长 | 4.583 s |

**文生视频提示词 T2V · EN**
```text
Medium close-up, 75mm anamorphic, eye level from slightly to her side, very slow push-in; 24 fps; a museum conservation studio at night. RESTORER: ~28-year-old East Asian woman, soft oval face, straight natural brows, a tiny light-brown mole below her LEFT eye, faint tiredness, black-brown hair in a loose low ponytail with strands loose at her right temple, no make-up, charcoal wool coat over an oatmeal knit, thin warm-white cotton gloves, left forearm resting on the bench edge. Before her, a flattened old letter and an open green-cloth accession ledger, soft and illegible. At 0.5 s she ticks a year in the ledger with a pencil; she reads on, the pencil gliding down the letter, slowing, and at 2.0 s it stops in mid-air; she reads again, brows drawing slightly together. At 2.5 s, in the dark glass pane of the studio door far behind her, a narrow 4000K flashlight beam slides silently across once; she does not turn. At 2.9 s her eyes lift from the page into the middle distance, thinking. Light: 3500K bench lamp from upper left, soft 4:1 on her face; dark harbour window at right. Natural skin with pores. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中近景，75mm 变形镜头，平视、略从她的侧面，极缓慢推进；24 fps；夜里博物馆的修复室。修复师：约 28 岁东亚女性，鹅蛋脸，自然平直的眉，左眼下一颗极小的浅褐色痣，带一点熬夜的疲惫，黑褐色头发松松扎成低马尾，右侧太阳穴落下几缕碎发，素颜，深灰羊毛呢外套里是燕麦白针织衫，戴略暖白的薄棉手套，左前臂压在工作台边缘。她面前是一封展平的旧信和一本打开的绿布面藏品登记簿，都柔虚、不可读。0.5 秒，她用铅笔在登记簿的年份旁打了个勾；接着往下读，笔尖沿着信纸滑下、越来越慢，2.0 秒停在半空；她又读一遍，眉头微微收紧。2.5 秒，她身后远处修复室门上那块暗色的玻璃里，一道窄窄的 4000K 手电光束无声地扫过一次；她没有回头。2.9 秒，她的目光从纸面抬起，落在不远不近的空处，若有所思。光：左上方 3500K 台灯，脸上柔和的 4:1 光比；画右是暗色的港口窗。保留毛孔的自然肤质。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0: MCU; RESTORER (soft oval face, mole below the LEFT eye, loose low ponytail, strands at the right temple, charcoal wool coat, warm-white cotton gloves) at (0.44,0.48) in three-quarter profile facing frame right, head bowed over the bench; her left forearm on the bench edge in the foreground, the worn spot on the LEFT cuff's little-finger side visible; gloved right hand with a pencil over the green ledger at (0.64,0.82), out of focus; the studio door with a dark glass pane in the background at (0.15,0.38); 3500K lamp key from upper left; harbour window glints at the right edge; modern night grade (neutral-cool, never cyan), fine grain, 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧：中近景；修复师（鹅蛋脸、左眼下小痣、松散低马尾、右侧太阳穴碎发、深灰羊毛呢外套、略暖白棉手套）位于 (0.44,0.48)，四分之三侧面朝画右，低头看着工作台；前景是她压在台沿的左前臂，左袖口外侧小指一侧的磨损可见；戴手套的右手握着铅笔停在绿布面登记簿上方 (0.64,0.82)，焦外；背景 (0.15,0.38) 是修复室的门，门上一块暗色玻璃；左上方 3500K 台灯主光；画右边缘港口窗的微光；现代调色，细腻颗粒，2.39:1。
```
**末帧 / 匹配规格 End frame**
```text
t=4.58 s: tighter MCU after the push; her eyes lifted into the middle distance toward frame right (past the lamp, not toward the door), pencil still held in mid-air; the door pane dark again in the background at frame left.
```
**图生视频运动 Motion · EN**
```text
Camera: very slow constant push-in (~20 cm over the shot), 12-frame ease-in. Subject (RESTORER, gloves on, left forearm on the bench): 0.52 s a small pencil tick; 0.6-1.9 s her eyes and the pencil track down the letter; 1.96 s the pencil stops mid-air and holds; 2.1-2.4 s she re-reads, brows tighten a little; 2.5-2.9 s background only: the flashlight beam crosses the door glass right to left once (~0.4 s), then darkness; 2.92 s her eyes lift, unfocused, toward frame right; she stays still to the end. 24 fps real time. Must NOT move: lamp, ledger; she does not turn toward the door; the guard is never seen - only the beam.
```
**图生视频运动 Motion · ZH**
```text
摄影机：极缓慢的匀速推进（全程约 20 厘米），12 帧缓入。主体（修复师，戴手套，左前臂压在台沿）：0.52 秒铅笔轻轻打一个勾；0.6–1.9 秒她的目光与笔尖顺着信纸往下；1.96 秒笔停在半空、不动；2.1–2.4 秒她重读一遍，眉头微微收紧；2.5–2.9 秒只在背景：手电光束从右向左扫过门玻璃一次（约 0.4 秒），随即暗下；2.92 秒她的目光抬起，失焦地望向画右；一直不动到结束。24 fps 真实速度。不得移动：台灯、登记簿；她不转向门口；夜班工作人员始终不出现，只有光束。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.5 | Seg 1: tick, reading, pencil stops; generate 0-2.75 s from the keyframe. |
| 2.2 | 4.583 | Seg 2: re-read, flashlight in the door glass (plate B), eyes lift; generate 1.95-4.83 s; blend 2.2-2.45 s on the held pencil. |

**分层与合成 Plates & compositing**

- **Plate A**：Performance plate, LOC_LAB: RESTORER at the bench with letter and ledger, door pane kept dark.
- **Plate B**：Flashlight element: a narrow 4000K beam sliding right to left across the door's glass pane and the dark corridor beyond, once, 0.4 s; no figure. Generated separately or shot practically.
- **合成 / 速度 / 调色 / 同步（post）**：Composite B into the door-pane matte, softened to the background's defocus; beam f3852-f3862 only. Grade CT_MODERN, skin protected (P17), grain 1.0, halation 0.3. Sync: f3804 (158.52 '读过年月') tick; f3839 (159.96 '把你') pencil stops; f3852 (160.5) beam; f3862 (160.92 '看穿') eyes lift; cut f3902. Shot-list conflict resolved here: 'she does not look up' (at the door) vs sync 'she lifts her eyes' - an inward lift of the eyes, never toward the door.

**连续性锚点 match_to**：Continues S049's letter; ledger row with the tick reappears in S053. The 'busy, not looking up' beat is answered in S061 ('she finally notices'). Beam = the guard's PROP_FLASHLIGHT, same 4000K as the INTRO sweep.

**负面提示词（追加在全局负面之后）**
```text
she turns toward the door, the guard visible, the guard's face, readable writing, legible dates or numbers, bare hands, rings, watch, make-up, re-tied or high ponytail, mole on the right cheek, beauty filter, harsh hard shadows, flashlight beam sweeping twice, tears, cyan grade
```

#### S051 · 02:42:14 – 02:45:19 · 3.208 s（f3902–f3979）

| 项目 | 内容 |
|---|---|
| 歌词 | 不等于把你看穿／若后来的人 |
| 段落 / 简报章节 / 时代 / 场景 | BR1 桥段一 / gap / 现代 / `restoration_lab` |
| 景别 / 焦段 / 速度 | ECU / 100 mm / 24 |
| 入点转场 | 切 0 帧 — 她的目光 → 她在看的地方 |
| 同步点 | 162.75 s 音乐回落：沿最后一行移动；163.02 s “若后来的人”；164.3 s 近乎无声：停在断掉的那一笔 |
| 参考图 refs | `PROP_LETTER` `LOC_LAB` |
| 调色 | 现代夜间 |
| 生成时长 | 3.208 s |

**文生视频提示词 T2V · EN**
```text
Macro, 100mm macro lens at a low grazing angle just above a sheet of thin cream bamboo letter paper on a workbench at night; slow slider move; 24 fps. At 0-0.4 s the warm 3500K pool of an articulated lamp contracts as the lamp is pulled down, until the light covers only the letter and rakes across it; paper fibres glow like fine rivers, a faded vermilion column rule runs through frame, faint foxing. The camera slides slowly, about a centimetre per second, along the last column of brush writing - strokes soft, blurred and illegible - and comes to rest by 1.7 s on the final stroke, centre right: it stops halfway, the brush lifted mid-gesture, a thin dry tail of faded black ink trailing into bare paper. Then it holds, perfectly still, in near-silence. No hands, no people. T5.6, focus following the line, gentle anamorphic falloff, the warm light pool fading into deep blue-black shadow, natural paper texture, not hyper-sharp. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
微距，100mm 微距镜头以低掠射角贴近夜里工作台上一张米色薄竹纸信纸；缓慢的滑轨运动；24 fps。0–0.4 秒，可调臂台灯被拉低，3500K 的暖色光圈随之收缩，直到只剩信纸大小、斜斜地掠过纸面；纸纤维在光里像细小的河流，一道褪色的朱红竖格线横过画面，淡淡的霉斑。摄影机以每秒约 1 厘米的速度，沿着最后一行毛笔字缓缓滑过——笔画柔虚、模糊、不可读——1.7 秒停在画面中心偏右的最后一笔上：这一笔只写到一半，笔锋在半空提起，一道细细的、干涩的褪色墨尾拖进空白的纸面。之后完全静止，在近乎无声里停住。没有手，没有人。T5.6，焦点随字行移动，柔和的变形镜头焦外衰减，暖色光圈渐渐沉入深蓝黑的暗部，纸张质感自然、不过度锐利。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0: 100mm macro at a low grazing angle over thin cream bamboo paper (#E7DCC3) with faint foxing and soft fold valleys; a faded vermilion column rule (#B4533F) running left-right across the frame; the last column of brush writing entering from frame left, soft and illegible; warm 3500K lamp pool still wide and slightly high, beginning to contract; deep blue-black shadow at the edges; modern grade warmed by the lamp, fine grain, 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧：100mm 微距以低掠射角贴近米色薄竹纸（#E7DCC3），有淡淡霉斑与柔软的折痕凹谷；一道褪色朱红竖格线（#B4533F）左右横过画面；最后一行毛笔字从画左进入，柔虚不可读；3500K 台灯光圈仍较大、略高，正开始收缩；边缘是深蓝黑的暗部；被台灯暖化的现代调色，细腻颗粒，2.39:1。
```
**末帧 / 匹配规格 End frame**
```text
t=1.72-3.21 s (held): the broken final stroke sharp at (0.62,0.50), its dry ink tail fading toward frame right into bare paper; everything else soft; the contracted lamp pool raking from upper left, its edge visible at the top of frame.
```
**图生视频运动 Motion · EN**
```text
Camera: slider lateral move left to right parallel to the column at ~1 cm/s, 12-frame ease-in starting at 0.17 s, eased to a stop at 1.72 s, then a locked hold to the end. Light: the lamp is lowered 0-0.4 s (pool shrinks and becomes raking), then steady. Focus follows the line and lands on the broken stroke at 1.7 s. 24 fps. Must NOT move after 1.72 s; no hand enters; no new ink appears; strokes never resolve into legible text.
```
**图生视频运动 Motion · ZH**
```text
摄影机：滑轨沿字行从左向右平行横移，约每秒 1 厘米，0.17 秒起 12 帧缓入，1.72 秒缓停，之后锁定直到结束。光：0–0.4 秒台灯被拉低（光圈缩小、变成掠射光），之后稳定。焦点随字行移动，1.7 秒落在断掉的那一笔上。24 fps。1.72 秒之后一切不动；没有手入画；不出现新的墨迹；笔画始终不会变成可读的字。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.208 | Single generation; generate 3.7 s (0.25 s handles). Practical alternative: a real letter written by the calligraphy adviser, shot on a slider, with generation only for the light change. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Grade CT_MODERN warmed by the lamp (P15 paper; BR1-late warm share ~35%). Calligraphy: written by the calligraphy adviser and kept out of focus, or generated as abstract strokes - inspect every frame for pseudo-characters in the focal plane (bible rule). Ink is faded carbon black (bible PROP_LETTER), not brown. Sync: f3906 (162.75 drop) move starts; f3912 (163.02 '若后来的人'); f3943 (164.3) at rest on the broken stroke; near-silence f3942-f3974; the 165.75 hit falls on the last frame f3978; cut f3979.

**连续性锚点 match_to**：Same letter as S049-S054. Broken stroke centre right (0.62,0.50); S052/S054 see this unfinished column again by show-through on the back of the sheet beside the jasmine.

**负面提示词（追加在全局负面之后）**
```text
legible characters, crisp readable calligraphy, fake Chinese characters in the focal plane, printed text, Latin letters, wet glossy fresh ink, brown iron-gall ink colour, hands, brush or pen in frame, red seal stamp, plastic sheen, over-sharpened macro, oversaturated vermilion, digital noise, camera still moving after 1.8 s
```

#### S052 · 02:45:19 – 02:48:14 · 2.792 s（f3979–f4046）

| 项目 | 内容 |
|---|---|
| 歌词 | 翻到我这段 |
| 段落 / 简报章节 / 时代 / 场景 | BR1 桥段一 / gap / 现代 / `restoration_lab` |
| 景别 / 焦段 / 速度 | CU / 75 mm / 24 |
| 入点转场 | 切 0 帧 — 静默后的第一个动作（165.75 重音） |
| 同步点 | 166.0 s “翻”：信纸翻过来；167.2 s “这段”：露出茉莉 |
| 参考图 refs | `CHAR_RESTORER` `PROP_LETTER` `PROP_GLOVES` `PROP_COAT` `LOC_LAB` |
| 调色 | 现代夜间 |
| 生成时长 | 2.792 s |

**文生视频提示词 T2V · EN**
```text
Close-up, 75mm anamorphic, high angle down onto a workbench under a lowered lamp, locked; 24 fps. The gloved right hand of RESTORER - thin warm-white cotton conservator glove with a faint grey-brown brass smudge on the index fingertip, charcoal wool coat cuff at the wrist - holds slim bamboo tweezers and, steadied by her other gloved fingertips, turns a fragile old letter of thin cream bamboo paper over onto its back; the sheet lifts and settles softly between 0.2 and 1.0 s. In the margin, along an old fold, lies a pressed jasmine flower, flattened and browned, its petals thin and translucent in the raking 3500K light; right beside it, the unfinished last column of brush writing from the front shows faintly through the thin paper, mirrored and illegible. By 1.4 s the tweezers have withdrawn and the flower lies revealed; she is still. Focus on the margin fold; a small warm light pool, deep shadow around, fine paper fibres, faint foxing. Natural texture, warmed by the lamp. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
近景，75mm 变形镜头，俯拍被拉低的台灯下的工作台，锁定；24 fps。修复师戴手套的右手——略暖白的薄棉修复手套，食指指尖一点浅灰褐的黄铜污迹，手腕处是深灰羊毛呢外套的袖口——捏着一把细竹镊，另一只戴手套的手指尖轻轻托着，把一封脆弱的米色薄竹纸旧信翻到背面；0.2 到 1.0 秒之间，信纸轻轻抬起、又柔柔落下。页边一道旧折缝里，夹着一朵压扁的茉莉花，已褪成褐色，花瓣在 3500K 的掠射光里薄得半透明；紧挨着它，正面那最后一行没写完的毛笔字透过薄纸隐隐透出来，左右反向、不可读。到 1.4 秒，竹镊已经退开，花完整地露出来；她一动不动。焦点在页边折缝；一小圈暖色光，四周是深暗部，纸纤维细腻，淡淡霉斑。质感自然，被台灯暖化。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0: high-angle CU; the letter's front - soft illegible brush columns between faded vermilion rules - lies on grey conservation blotter at centre under a tight 3500K lamp pool; RESTORER's warm-white cotton-gloved right hand (brass smudge on the index tip, charcoal coat cuff) at the right edge holding slim bamboo tweezers just under the sheet's corner; her left gloved fingertips at the far edge; deep shadow around; modern night grade warmed by the lamp, fine grain, 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧：俯拍近景；信的正面——褪色朱红竖格间柔虚不可读的毛笔字行——平放在画面中央的灰色修复吸水纸上，台灯 3500K 光圈很小；修复师戴略暖白棉手套的右手（食指指尖黄铜污迹、深灰外套袖口）在画右边缘，细竹镊正探到信纸一角下面；左手戴手套的指尖在信纸另一边；四周是深暗部；被台灯暖化的现代调色，细腻颗粒，2.39:1。
```
**末帧 / 匹配规格 End frame**
```text
t=2.79 s: the back of the sheet; the pressed browned jasmine (#A88A5A) at (0.58,0.46) in the margin fold; the faint mirrored show-through of the unfinished last column immediately beside it; tweezers withdrawn to the right edge; gloved fingertips at rest.
```
**图生视频运动 Motion · EN**
```text
Camera locked. Subject (RESTORER's gloved hands, bamboo tweezers): 0.2-0.9 s the sheet lifts on the tweezers and turns over left to right, her left gloved fingertips steadying the far edge, settling flat by 1.0 s; 1.0-1.4 s the tweezers withdraw; the flower sits revealed, she holds still. The paper flexes softly like thin silk; no tearing. 24 fps real time. Must NOT move: the flower (pressed in place), lamp; gloves stay on.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定。主体（修复师戴手套的手、竹镊）：0.2–0.9 秒信纸被竹镊挑起，从左向右翻过去，左手戴手套的指尖托住另一边，1.0 秒前平平落下；1.0–1.4 秒竹镊退开；花露出来，她停住不动。纸像薄绸一样柔软地弯曲，不撕裂。24 fps 真实速度。不得移动：花（压在原处）、台灯；手套始终戴着。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.792 | Single generation; generate 3.3 s (0.25 s handles). |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：CT_MODERN warmed by the lamp; grain 1.0. If the generation does not produce the show-through, composite S051's final column mirrored at 10-15% under the paper texture beside the flower. Sync: f3984 (166.0 '翻') sheet lifts; f4013 (167.2 '这段') flower fully revealed; cut f4046.

**连续性锚点 match_to**：Resolves the S051 / S054 layout: the unfinished last column (front) reads through the thin paper beside the jasmine on the back, so S054 can hold both in one frame. Jasmine (bible 6.8) quietly rhymes with the jasmine tea of S062-S081.

**负面提示词（追加在全局负面之后）**
```text
fresh white jasmine, colourful or large flower, rose, petals falling off, torn paper, readable text, bare hands, metal tweezers, plastic sleeve glare, red seal stamp, harsh light, crumpled paper, the flower moving or sliding
```

#### S053 · 02:48:14 – 02:50:05 · 1.625 s（f4046–f4085）

| 项目 | 内容 |
|---|---|
| 歌词 | 别只读年份 |
| 段落 / 简报章节 / 时代 / 场景 | BR1 桥段一 / gap / 现代 / `restoration_lab` |
| 景别 / 焦段 / 速度 | INSERT / 75 mm / 24 |
| 入点转场 | 切 0 帧 — 茉莉 → 她的反应（以手代脸） |
| 同步点 | 168.72 s “别只读”：铅笔放下；169.38 s “年份”：笔停在年份旁 |
| 参考图 refs | `CHAR_RESTORER` `PROP_LETTER` `PROP_GLOVES` `PROP_COAT` `PROP_LEDGER` `LOC_LAB` |
| 调色 | 现代夜间 |
| 生成时长 | 1.625 s |

**文生视频提示词 T2V · EN**
```text
Top-down insert, 75mm anamorphic, high angle on an open museum accession ledger at night, locked; 24 fps. Dark green buckram covers with a rubbed spine; ruled cream pages of neat handwritten numbers and dates, soft and illegible; on one row, a small pencil tick beside the year. The warm-white cotton-gloved right hand of RESTORER - faint brass smudge on the index fingertip, charcoal wool coat cuff above the glove's ribbed edge - enters from lower right and at 0.14 s lays a graphite pencil gently on the page beside that year, its tip pointing to upper right; at 0.8 s her fingers open and lift away, leaving the pencil still. She will not write anything more. Light: a lowered 3500K bench lamp from upper left, a warm pool, the page edges falling off into deep blue-black shadow; the ledger at frame left, the soft edge of the old letter at frame right. Visible paper fibre, no readable numbers, warmed by the lamp. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
正顶拍插入镜头，75mm 变形镜头，夜里俯拍一本打开的博物馆藏品登记簿，锁定；24 fps。深绿布面硬壳，书脊磨白；米色横格账页上是整齐的手写编号与日期，柔虚、不可读；其中一行的年份旁有一个小小的铅笔勾。修复师戴略暖白的薄棉手套的右手——食指指尖一点黄铜污迹，手套罗纹腕口上方是深灰羊毛呢外套的袖口——从右下方入画，0.14 秒把一支石墨铅笔轻轻放在那一行年份的旁边，笔尖朝向右上方；0.8 秒手指松开、抬离，铅笔静静留在那里。她不会再写下去了。光：被拉低的 3500K 台灯从左上方照下，一圈暖光，页边沉入深蓝黑的暗部；登记簿在画左，画右是那封旧信柔虚的一角。纸纤维可见，没有任何可读的数字，被台灯暖化。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0: high-angle top-down insert; the green-buckram ledger open across frame left (x 0.05-0.60), ruled cream pages with soft illegible handwritten numbers; a small pencil tick beside one year at (0.48,0.52); RESTORER's warm-white cotton-gloved right hand (brass smudge on the index tip, charcoal coat cuff) holding a graphite pencil just above the page at (0.62,0.58), tip aimed upper right; the old letter's soft edge at the right; lowered 3500K lamp pool from upper left; modern night grade warmed by the lamp, fine grain, 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧：俯拍正顶插入；绿布面登记簿打开在画左（x 0.05–0.60），米色横格页上是柔虚不可读的手写编号；某一年份旁一个小铅笔勾，位于 (0.48,0.52)；修复师戴略暖白棉手套的右手（食指指尖黄铜污迹、深灰外套袖口）拿着一支石墨铅笔，悬在纸面上方 (0.62,0.58)，笔尖朝右上；画右是旧信柔虚的边；左上方被拉低的 3500K 台灯光圈；被台灯暖化的现代调色，细腻颗粒，2.39:1。
```
**末帧 / 匹配规格 End frame**
```text
t=1.63 s: the pencil lying beside the ticked year at (0.50,0.53), tip toward upper right; the gloved hand gone off lower right; page still.
```
**图生视频运动 Motion · EN**
```text
Camera locked. Subject (RESTORER's gloved right hand): 0-0.14 s the hand lowers; 0.14 s the pencil touches down flat beside the year; 0.14-0.8 s her fingers rest on it; 0.8 s fingers open and lift away to lower right; hold. 24 fps real time. Must NOT move: ledger, page; the pencil does not roll; nothing is written.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定。主体（修复师戴手套的右手）：0–0.14 秒手放低；0.14 秒铅笔平平落在年份旁；0.14–0.8 秒手指搭在笔上；0.8 秒手指松开，向右下方抬离；停住。24 fps 真实速度。不得移动：登记簿、纸页；铅笔不滚动；不写任何字。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 1.625 | Single generation; generate 2.1 s (0.25 s handles). |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：CT_MODERN warmed; grain 1.0. Numbers and dates must stay unreadable (defocus / grazing angle) in every frame. Sync: f4049 (168.72 '别只读') pencil touches down; f4065 (169.38 '年份') fingers release; cut f4085.

**连续性锚点 match_to**：The ticked row from S050. Ledger at frame left, letter at frame right (shot-list layout); 'she lays down the date' before S054's 'reading'.

**负面提示词（追加在全局负面之后）**
```text
writing or erasing, readable digits or dates, legible handwriting, ballpoint or fountain pen, bare hand, ring, red ink, bright white printed form, barcode, logo, pencil rolling, modern spreadsheet
```

#### S054 · 02:50:05 – 02:54:14 · 4.375 s（f4085–f4190）

| 项目 | 内容 |
|---|---|
| 歌词 | 也读我没说完的喜欢 |
| 段落 / 简报章节 / 时代 / 场景 | BR1 桥段一 / gap / 现代 / `restoration_lab` |
| 景别 / 焦段 / 速度 | ECU / 100 mm / 24 |
| 入点转场 | 切 0 帧 — 由手到眼 |
| 同步点 | 170.82 s “没说完”：放大镜移近茉莉；172.14 s 焦点开始由花移向她的眼睛；172.92 s “欢”：焦点落在她的眼睛上；174.3 s 镜片折出彩色光晕 |
| 参考图 refs | `CHAR_RESTORER` `PROP_LETTER` `PROP_GLOVES` `PROP_COAT` `LOC_LAB` |
| 调色 | 现代夜间 |
| 生成时长 | 4.375 s |

**文生视频提示词 T2V · EN**
```text
Extreme close-up, 100mm anamorphic, lens low at the letter's far edge looking up toward her, very slow push-in; 24 fps; night, under a lowered lamp. Soft in the bottom foreground: the pressed brown jasmine on thin cream paper and the faint unfinished line beside it. At 0.6 s the round glass of a black-rimmed hand magnifier settles above it; through it, enlarged, the eye of RESTORER: a ~28-year-old East Asian woman, inner double eyelid, straight natural brow, faint tiredness, a tiny light-brown mole below the outer corner of her LEFT eye, loose strands at her right temple, no make-up. Her warm-white cotton-gloved fingertips hover above the paper, never touching. At 1.9 s focus pulls slowly from the flower to her eye, landing at 2.7 s: for the first time she is not identifying - she is reading. At 4.1 s she tilts the magnifier and the lamp light breaks at its rim into a faint, soft spectral halo at upper right, spilling onto the paper. Light: warm 3500K articulated lamp from upper left, intimate, deep shadow beyond. Natural skin with pores, gentle colour. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
大特写，100mm 变形镜头，镜头低低地放在信纸远端，向上望向她，极缓慢推进；24 fps；夜，被拉低的台灯下。画面底部前景柔虚：薄米色纸上那朵压扁的褐色茉莉，和它旁边那行若隐若现、没写完的字。0.6 秒，一只黑框手持放大镜的圆形镜片落到它上方；透过镜片，被放大的是修复师的眼睛：约 28 岁东亚女性，内双眼皮，自然平直的眉，一点熬夜的疲惫，左眼外眼角下方一颗极小的浅褐色痣，右侧太阳穴几缕碎发，素颜。她戴略暖白的薄棉手套的指尖悬在纸面上方，始终没有碰。1.9 秒，焦点从花缓缓移到她的眼睛，2.7 秒落实：她第一次不是在辨认，而是在读。4.1 秒，她把放大镜转过一个角度，台灯的光在镜片边缘折出一圈淡淡的、柔和的彩色光晕，位于画面右上方，并洒落在信纸上。光：左上方 3500K 可调臂台灯的暖光，亲密，远处是深暗部。保留毛孔的自然肤质，色彩温和。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0: low angle from the paper plane; the pressed brown jasmine and the faint show-through of the unfinished column soft-sharp at the bottom (0.42,0.88); above, out of focus, RESTORER's face bowed toward the paper (soft oval face, mole below the LEFT eye, loose strands at the right temple, charcoal coat collar), lit warm from the 3500K lamp at upper left; her warm-white cotton-gloved fingertips hovering at lower right; the magnifier not yet in frame; deep blue-black shadow beyond; modern night grade warmed by the lamp, fine grain, 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧：从纸面高度的低角度；画面底部 (0.42,0.88) 是压扁的褐色茉莉和没写完那一行透过纸背的淡影，柔中带实；上方焦外是修复师俯向信纸的脸（鹅蛋脸、左眼下小痣、右侧太阳穴碎发、深灰外套领口），被左上方 3500K 台灯暖暖地照着；她戴略暖白棉手套的指尖悬在右下方；放大镜尚未入画；远处是深蓝黑的暗部；被台灯暖化的现代调色，细腻颗粒，2.39:1。
```
**末帧 / 匹配规格 End frame**
```text
t=4.37 s (light-to-light A-frame for S055): the magnifier tilted ~15 degrees, its rim at upper right (0.72,0.30) breaking the lamp light into a faint pastel spectral ring - muted ruby, amber, cobalt - that spills onto the paper; RESTORER's eye sharp through the glass at (0.52,0.42), the mole below the LEFT eye readable at the lens edge; the jasmine soft at the bottom.
```
**图生视频运动 Motion · EN**
```text
Camera: very slow push-in (~5 cm) on a slider, constant. Subject (RESTORER, gloves on): 0.3-0.6 s the magnifier descends into frame and settles over the flower; gloved fingertips hover, never touching; 0.6-1.9 s she studies it, still, breath held; 1.93-2.71 s focus rack flower -> her eye (>=1 beat); 2.7-4.0 s she reads, one slow blink at 3.4 s; 4.09 s she tilts the magnifier ~15 degrees and the spectral halo blooms softly at upper right. 24 fps real time. Must NOT move: paper, flower; the halo is soft and short - no streaks.
```
**图生视频运动 Motion · ZH**
```text
摄影机：滑轨上极缓慢的匀速推进（约 5 厘米）。主体（修复师，戴手套）：0.3–0.6 秒放大镜落入画面、停在花的上方；戴手套的指尖悬着，始终不碰；0.6–1.9 秒她凝视着，不动，屏住呼吸；1.93–2.71 秒焦点从花转到她的眼睛（≥1 拍）；2.7–4.0 秒她在读，3.4 秒缓慢眨一次眼；4.09 秒她把放大镜转过约 15°，彩色光晕在右上方柔柔地亮起。24 fps 真实速度。不得移动：纸、花；光晕柔和、短暂——没有条状光晕。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.3 | Seg 1: magnifier in, study; generate 0-2.55 s from the keyframe. |
| 1.9 | 4.375 | Seg 2: rack to her eye, reading, magnifier tilt and halo; generate 1.65-4.625 s; blend 1.9-2.1 s just before the rack begins. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：CT_MODERN warmed by the lamp (BR1-late ~35% warm share); skin protected, no beauty work. Spectral halo practical (single-element magnifier at an angle) or added in comp as a soft chromatic ring, saturation kept low (P23-P27 softened 30%); no streak flare. Sync: f4100 (170.82 '没说完') magnifier settles; f4131 (172.14) rack starts; f4150 (172.92 '欢') eye sharp; f4183 (174.3) halo; cut f4190.

**连续性锚点 match_to**：End halo at upper right (0.72,0.30) = light-to-light anchor for S055's first stained-glass cluster. RESTORER next seen as a faint reflection in S057's quarry and in corridor P4 (S061).

**负面提示词（追加在全局负面之后）**
```text
neon rainbow, blue streak flare, starburst or lens-flare streaks, tears, crying, make-up, mole on the right side, bare hands, gloves touching the flower, readable text, fake characters in focus, grotesquely distorted magnified eye, two eyes inside the lens, extra fingers, hyper-sharp skin, beauty filter, slow-motion
```

### 桥段二 BR2

#### S055 · 02:54:14 – 02:57:10 · 2.833 s（f4190–f4258）

| 项目 | 内容 |
|---|---|
| 歌词 | 彩窗下 |
| 段落 / 简报章节 / 时代 / 场景 | BR2 桥段二 / 七 / 礼拜堂 / `chapel` |
| 景别 / 焦段 / 速度 | WS / 32 mm / 24 |
| 入点转场 | 光线转场 0 帧 — 放大镜镜片里的彩色光晕 → 彩窗透进的彩色光（光线接续；跨时代） |
| 同步点 | 174.76 s “彩窗下”：彩色光柱；175.36 s “下”：下降开始 |
| 参考图 refs | `LOC_CHAPEL` |
| 调色 | 礼拜堂 |
| 生成时长 | 2.833 s |

**文生视频提示词 T2V · EN**
```text
Wide shot, 32mm anamorphic, from choir-loft height about 9 m up near the west end of a large, quiet 1950s chapel in a tropical port, facing across the nave; 24 fps. Lime-white walls, a pale grey timber vault, still ceiling fans. At frame right, a tall pointed lancet of abstract, non-figurative stained glass - layered petal shapes in soft muted ruby, amber, cobalt, sea-green and pale rose, no figures, no symbols - blazes with the low 3200K sun of the last fifteen minutes before sunset. Slanting coloured shafts cut through the air toward lower left; faint dust shows only inside the light paths. At 0.18 s the shafts are at their richest. At 0.78 s a slow, weighty techno-crane descent begins, eased in over 18 frames, sinking steadily while panning gently left toward the nave; below, rows of teak pews and the terracotta tile floor begin to catch the first coloured petals. No figure resolves yet. The walls keep deep shadow detail; gentle halation on the glass, only a short warm flare. Chapel grade: the richest colour of the film, stained-glass hues softened, never neon; fine 35mm grain, 2.39:1, no text, no religious images.
```
**文生视频提示词 T2V · ZH**
```text
全景，32mm 变形镜头，从唱诗廊的高度——约 9 米——位于一座宏大而安静的 1950 年代热带港口礼拜堂西端，朝中殿横向望去；24 fps。石灰白粉墙，浅灰木构拱顶，静止的吊扇。画右，一扇高高的尖拱彩窗——非具象的图案，层层叠叠的花瓣形色块，柔化的绛红、琥珀、钴蓝、海青与浅玫，没有人物、没有符号——被日落前最后十五分钟 3200K 的低角度阳光照得通亮。一束束彩色光柱斜斜地切过空气、落向左下方；淡淡的尘只在光路里看得见。0.18 秒，光柱最盛。0.78 秒，一次缓慢而有分量的伸缩摇臂下降开始，18 帧缓入，稳稳下沉，同时轻轻向左摇向中殿；下方一排排柚木长椅和赤陶方砖地面开始接住第一批彩色光瓣。还看不清任何人。墙面暗部有层次；玻璃上柔和的光晕，只有短而暖的光斑。礼拜堂调色：全片色彩最丰富处，彩窗色相柔化，绝不霓虹；细腻 35mm 颗粒，2.39:1，无任何文字，无任何宗教图像。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0: from ~9 m (choir-loft height) near the west end, facing south across the nave; a tall west lancet of abstract petal-pattern stained glass at frame right (x 0.62-0.92, top cut by frame), its brightest amber-ruby cluster at (0.72,0.30); coloured shafts slanting down-left through the dark upper volume, dust only in the light; pale grey vault ribs at top-left; lime-white wall in soft shadow; nave floor not yet visible; softened rich chapel grade, never neon, fine grain, 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧：在西端约 9 米（唱诗廊高度），面向南、横望中殿；画右是一扇高高的西窗尖拱彩窗，非具象花瓣图案（x 0.62–0.92，顶部被画框切掉），最亮的琥珀—绛红色块位于 (0.72,0.30)；彩色光柱斜向左下穿过暗暗的上部空间，尘只在光里；左上方是浅灰的拱顶肋；石灰白墙在柔和的阴影中；还看不到中殿地面；礼拜堂调色，细腻颗粒，2.39:1。
```
**末帧 / 匹配规格 End frame**
```text
t=2.83 s (continuous into S056): camera ~6.5 m high and still descending, panned ~40 degrees left toward the nave axis; the lancet now at the right edge; teak pews and coloured petals on the terracotta floor in the lower half; no figure resolved yet (the mother still hidden by pew backs).
```
**图生视频运动 Motion · EN**
```text
Camera: 0-0.78 s locked at ~9 m; 0.78 s techno-crane descent starts with an 18-frame ease-in, then constant ~1 m/s downward, with a slow pan left of ~40 degrees by the cut; continues without any stop into S056 (one move >= 6 s, bible 7.9). Light: sun shafts steady, faint dust drifting slowly; no flicker. 24 fps. Must NOT move: windows, shaft direction; no swoop, no speed change at the cut.
```
**图生视频运动 Motion · ZH**
```text
摄影机：0–0.78 秒锁定在约 9 米；0.78 秒伸缩摇臂开始下降，18 帧缓入后以约每秒 1 米匀速下沉，同时缓慢向左摇，到剪辑点约 40°；不停顿地延续到 S056（一次完整运动 ≥6 秒，圣经 §7.9）。光：阳光光柱稳定，尘埃缓慢漂浮；不闪烁。24 fps。不得移动：彩窗、光柱方向；不俯冲，剪辑点处速度不变。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.833 | Generate S055+S056 as ONE continuous crane plate of 6.33 s + 0.5 s handles (6.83 s); S055 uses 0-2.833 s. If the model cannot hold 6.8 s, generate S055 alone (3.3 s) and start S056 from this shot's endframe, blending 6 frames at f4258. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：CT_CHAPEL: richest colour of the film, stained-glass hues softened 30% (P23-P27); grain 1.1; halation 0.5 at the glass. Light match from S054: the first shaft cluster at (0.72,0.30); bridge the halo colour into the shafts over the first 12 frames in the grade. Sync: f4194 (174.76 '彩窗下') shafts richest; f4209 (175.36 '下') descent begins; cut f4258 inside the move.

**连续性锚点 match_to**：Light-to-light from S054's spectral halo (upper right). One continuous crane move with S056 (descent >= 6 s).

**负面提示词（追加在全局负面之后）**
```text
religious figures, saints, crosses or crucifixes in focus, inscriptions or text, neon colours, smoke-machine fog or haze everywhere, unmotivated god rays, fast drone swoop, people in the frame, candle close-ups, gothic horror mood, oversaturated glass, long blue lens-flare streaks, camera stopping or jolting at the end
```

#### S056 · 02:57:10 – 03:00:22 · 3.500 s（f4258–f4342）

| 项目 | 内容 |
|---|---|
| 歌词 | 光分成千万瓣 |
| 段落 / 简报章节 / 时代 / 场景 | BR2 桥段二 / 七 / 礼拜堂 / `chapel` |
| 景别 / 焦段 / 速度 | WS / 32 mm / 24 |
| 入点转场 | 切 0 帧 — 下降运动接续 |
| 同步点 | 177.82 s “分成”：光斑铺满地面；178.42 s “千万瓣”：越过长椅；179.4 s 前一排画右端独坐的老人掠过；180.3 s 接近母亲背影 |
| 参考图 refs | `CHAR_MOTHER` `CHAR_LONELY` `PROP_AIRLETTER` `LOC_CHAPEL` |
| 调色 | 礼拜堂 |
| 生成时长 | 3.5 s |

**文生视频提示词 T2V · EN**
```text
Wide shot, 32mm anamorphic, continuing a slow techno-crane descent and pan inside a large 1950s tropical-port chapel at sunset; 24 fps. Low 3200K sun through abstract stained-glass lancets behind us scatters countless soft petals of muted ruby, amber, cobalt, sea-green and pale rose across the terracotta floor, the teak pews and people's clothes; dust only in the light paths. The camera reaches seated height by 1.6 s and glides forward over the pew backs. At 2.0 s, at the right end of the pew ahead, an old man sits alone, small in a pool of coloured light, drifting out of frame right: LONELY, ~75, thin, sparse white hair, a deeply lined sun-darkened face, a thin much-washed white cotton shirt, a cloth cap on his knees under folded hands. The camera continues toward the aisle end of the seventh pew on the south side and the back of MOTHER, a ~45-year-old East Asian woman, black hair with grey at the temples in a low chignon held by black pins, a pale dove-grey short-sleeved cotton-linen qipao, sitting very straight, shoulders drawn forward, both hands holding a folded pale-blue airmail letter to her chest. Coloured petals rest on her shoulders. Chapel grade: the richest colour of the film, stained-glass hues softened, never neon; fine 35mm grain, 2.39:1, no text, no religious images.
```
**文生视频提示词 T2V · ZH**
```text
全景，32mm 变形镜头，延续一次缓慢的伸缩摇臂下降与横摇，在日落时分一座宏大的 1950 年代热带港口礼拜堂里；24 fps。低角度 3200K 的阳光穿过我们身后的非具象彩窗，把千万瓣柔和的光——柔化的绛红、琥珀、钴蓝、海青、浅玫——洒在赤陶方砖地、柚木长椅和人的衣料上；尘只在光路里看得见。1.6 秒摄影机降到坐姿高度，贴着一排排椅背向前滑行。2.0 秒，前面那排长椅的画右端，一位老人独自坐着，小小的，落在一池彩光里，随后从画右滑出：另一位孤单者，约 75 岁，瘦削，稀疏白发，日晒的深色脸上纹路很深，一件洗得很薄的白棉衬衫，膝上放着一顶旧布帽，双手交叠压在帽上。摄影机继续向前，靠近南侧第七排长椅靠走道的一端，一个女人的背影：祈祷的母亲，约 45 岁东亚女性，黑发里夹着太阳穴处的白发，在颈后盘成低髻、用黑色发夹固定，浅鸽灰棉麻短袖旗袍，坐得很直，肩膀向前收，双手把一封折起来的浅蓝航空信握在胸前。彩色光瓣落在她的肩上。礼拜堂调色：全片色彩最丰富处，彩窗色相柔化，绝不霓虹；细腻 35mm 颗粒，2.39:1，无任何文字，无任何宗教图像。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0 = S055's endframe: camera ~6.5 m high, descending, panned ~40 degrees left toward the nave axis; tall abstract stained-glass lancet at the right edge; coloured petals of muted ruby, amber, cobalt, sea-green and pale rose across terracotta tiles and rows of teak pews in the lower half; no figure resolved yet; softened rich chapel grade, never neon, fine grain, 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧 = S055 的末帧：摄影机约 6.5 米高、仍在下降，已向左摇约 40° 朝向中殿轴线；画右边缘是高高的非具象彩窗；画面下半部，柔化的绛红、琥珀、钴蓝、海青、浅玫光瓣铺在赤陶方砖与一排排柚木长椅上；还看不清任何人；礼拜堂调色，细腻颗粒，2.39:1。
```
**末帧 / 匹配规格 End frame**
```text
t=3.5 s: camera at ~1.3 m, behind and slightly right of MOTHER, looking east along the nave; her back and shoulders at (0.45,0.56), shoulder width ~22% of frame width, coloured petals on her shoulders and dove-grey qipao, low chignon with black pins, a corner of the folded pale-blue airmail letter visible at her chest; the centre aisle at left; LONELY already out of frame right; the altar end deep, soft and unresolved.
```
**图生视频运动 Motion · EN**
```text
Camera: continues S055's crane move without a stop - descent from ~6.5 m to ~1.3 m, arriving at seated height by 1.6 s (eased), the pan settling on the nave axis (east) by 1.6 s, then tracking forward over the pews at ~0.8 m/s and easing to a near stop by 3.5 s behind the mother; follow focus to her back. Subject: LONELY (old man, white shirt, cap on his knees) sits still; MOTHER (dove-grey qipao, grey at the temples) still, only breath; the petals shimmer faintly with drifting dust. 24 fps. Must NOT move: light direction; no one turns to camera.
```
**图生视频运动 Motion · ZH**
```text
摄影机：不停顿地延续 S055 的摇臂运动——从约 6.5 米降到约 1.3 米，1.6 秒缓缓到达坐姿高度，横摇也在 1.6 秒落定在中殿轴线（朝东），随后以约每秒 0.8 米贴着长椅向前推进，3.5 秒在母亲身后缓到几乎停住；跟焦到她的背影。主体：另一位孤单者（老人，白衬衫，帽子放在膝上）静坐；祈祷的母亲（浅鸽灰旗袍、太阳穴白发）静止，只有呼吸；光瓣随漂浮的尘微微闪动。24 fps。不得移动：光线方向；没有人转向镜头。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.5 | Taken from the combined S055+S056 crane plate (2.833-6.333 s of that plate). Fallback: I2V from S055's endframe, generate 4.0 s, blend 6 frames at the head. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：CT_CHAPEL; grain 1.1; halation 0.5 on the glass. Sync: f4268 (177.82 '分成') petals across the floor; f4282 (178.42 '千万瓣') gliding over pews; f4306 (179.4) LONELY passes out frame right; f4327 (180.3) approaching her back; cut f4342. LONELY sits at the right end of the pew in front (shot list) - see director note re S069.

**连续性锚点 match_to**：Continuous with S055's crane move. MOTHER locked at the south side, 7th pew, aisle (screen-left) end, facing east; LONELY seeded for S069.

**负面提示词（追加在全局负面之后）**
```text
religious figures or icons, crosses, sign of the cross, praying-hands gesture, altar in sharp focus, text, faces turned to camera, crowded congregation, neon colours, fog machine, mother in bright patterned silk, jade bangle on the right wrist, old man as an exotic caricature, fast or jerky movement, a cut or pause in the crane move
```

#### S057 · 03:00:22 – 03:02:22 · 2.000 s（f4342–f4390）

| 项目 | 内容 |
|---|---|
| 歌词 | 我听不懂你的祈祷 |
| 段落 / 简报章节 / 时代 / 场景 | BR2 桥段二 / 七 / 礼拜堂 / `chapel` |
| 景别 / 焦段 / 速度 | CU / 100 mm / 24 |
| 入点转场 | 切 0 帧 — 背影 → 侧脸 |
| 同步点 | 180.94 s “我听不懂”：菱形小玻璃里修复师的倒影显现；182.44 s “祷”：母亲嘴唇微动 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_MOTHER` `PROP_AIRLETTER` `PROP_GLASSPANEL` `LOC_CHAPEL` `LOC_CORRIDOR` |
| 调色 | 礼拜堂 |
| 生成时长 | 2.0 s |

**文生视频提示词 T2V · EN**
```text
Close-up, 100mm anamorphic, locked, pure side profile; 24 fps; a quiet 1950s tropical-port chapel at sunset. MOTHER, a ~45-year-old East Asian woman with an oval face, fairly high cheekbones, fine lines at the eyes, pressed lips, black hair greying at the temple in a low chignon, damp strands on her neck, pale dove-grey qipao with stand collar, sits at frame left third facing right, eyes closed, both hands holding a folded pale-blue airmail letter to her chest; an old pale-green jade bangle on her LEFT wrist. She makes no sign of the cross, no ritual gesture. At 1.5 s her lips move slightly in a silent prayer, its words unknown. Soft in the near foreground at frame right: the lowest tier of the abstract stained-glass window beside her pew, muted ruby, amber and cobalt glass petals, and one small clear diamond pane in which, from the first frames, a faint half-defocused reflection of RESTORER's face (a ~28-year-old modern woman, low ponytail) floats, as if looking in from today. Light: low 3200K sunset through stained glass behind her at frame left, petals on her shoulder; distant candle points. Natural skin; the face in the quarry stays faint and unresolved. Chapel grade: the richest colour of the film, stained-glass hues softened, never neon; fine 35mm grain, 2.39:1, no text, no religious images.
```
**文生视频提示词 T2V · ZH**
```text
近景，100mm 变形镜头，锁定，正侧面；24 fps；日落时分安静的 1950 年代热带港口礼拜堂。祈祷的母亲——约 45 岁东亚女性，椭圆脸，颧骨较高，眼角细纹，眉形修得很淡，嘴唇抿着，黑发在太阳穴处夹着白发、在颈后盘成低髻，几根碎发被汗贴在颈侧，浅鸽灰立领旗袍——坐在画左三分之一处、面朝画右，闭着眼，双手把一封折起来的浅蓝葱皮纸航空信握在胸前；左手腕露出一只旧的浅绿玉镯。她不划十字，不做任何仪式手势。1.5 秒，她的嘴唇极轻地动了动，在无声地祈祷，祈祷的内容始终未知。画右近前景柔虚：她座位旁那扇非具象彩窗的最下层，柔化的绛红、琥珀、钴蓝玻璃花瓣，其中一块透明的菱形小玻璃里，从最初几帧起就浮着一个淡淡的、半虚的倒影——修复师（约 28 岁的现代女子，低马尾）的脸——看不清，像是从今天望进来。光：低角度 3200K 的落日穿过她身后（画左）的彩窗，彩色光瓣落在她的肩上；远处几点小小的烛光。自然肤色；菱形小玻璃里的脸始终淡而看不清。礼拜堂调色：全片色彩最丰富处，彩窗色相柔化，绝不霓虹；细腻 35mm 颗粒，2.39:1，无任何文字，无任何宗教图像。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0: CU, MOTHER's right profile at (0.30,0.48), face ~45% of frame height, eyes closed, oval face, high cheekbones, grey strands at the temple, low chignon with black pins, dove-grey stand collar; the folded pale-blue airmail letter at her chest (0.30,0.82), thumb on the soft fold, jade bangle just visible on the LEFT wrist beyond it; soft foreground at right: leaded stained-glass petals (muted ruby, amber, cobalt) blurred, the small clear diamond quarry at (0.70,0.45), ~9% of frame height, dark inside, a very faint face shape just forming in it; coloured sunset light from frame left on her shoulder; warm-grey depth with tiny candle points; softened rich chapel grade, never neon, fine grain, 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧：近景，祈祷的母亲的右侧面位于 (0.30,0.48)，脸约占画面高 45%，闭着眼，椭圆脸、高颧骨、太阳穴处的白发、黑发夹固定的低髻、浅鸽灰立领；折起的浅蓝航空信在胸前 (0.30,0.82)，拇指搭在柔软的折边上，左手腕的玉镯在信后隐约可见；画右柔虚的前景：铅条彩窗的花瓣（柔化绛红、琥珀、钴蓝），透明的菱形小玻璃位于 (0.70,0.45)，约占画面高 9%，里面是暗的，一张极淡的脸的轮廓刚刚浮现；画左来的彩色落日光落在她肩上；暖灰的纵深里几点小烛光；礼拜堂调色，细腻颗粒，2.39:1。
```
**末帧 / 匹配规格 End frame**
```text
t=2.0 s: same frame; her lips have just moved; the faint face in the quarry at (0.70,0.45) at its strongest (~15%), still half-defocused and unresolved, a low-ponytail silhouette.
```
**图生视频运动 Motion · EN**
```text
Camera locked. Subject (MOTHER, eyes closed, dove-grey qipao, jade bangle on the LEFT wrist): 0-0.3 s the reflection fades up in the quarry as the light shifts (not a global fade); her eyelids tremble faintly; 1.0 s her thumb rubs the letter's fold once; 1.5 s her lips move slightly, real time. The reflected face drifts almost imperceptibly, like someone shifting their gaze. 24 fps. Must NOT move: camera, lead lines; she never opens her eyes or looks at the glass.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定。主体（祈祷的母亲，闭眼，浅鸽灰旗袍，左腕玉镯）：0–0.3 秒随着光线变化，菱形小玻璃里的倒影渐渐显出（不是整体淡入）；她的眼睑微微颤动；1.0 秒拇指在信的折边上摩挲一下；1.5 秒嘴唇轻轻动，真实速度。倒影里的脸几乎察觉不到地移动，像有人在移动目光。24 fps。不得移动：摄影机、铅条；她始终不睁眼、不看玻璃。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.0 | Single shot from three plates (A performance, B reflection, C foreground glass); generate A 2.5 s locked (0.25 s handles). |

**分层与合成 Plates & compositing**

- **Plate A**：Chapel performance plate (LOC_CHAPEL): MOTHER in right profile at the left third, eyes closed, letter at her chest, sunset petals from frame left; background warm-grey with candle points.
- **Plate B**：Reflection element: RESTORER's face (low ponytail, charcoal coat collar) looking into a small pane, lit by the dim corridor lightbox and moonlight as in S061, generated separately, mirrored, kept soft.
- **Plate C**：Foreground glass: the lower-left corner of PROP_GLASSPANEL in situ (muted ruby/amber/cobalt petals, oxidation-free lead, the 6x9 cm clear diamond quarry), shot or generated as a defocused foreground element with dark shade behind the clear quarry.
- **合成 / 速度 / 调色 / 同步（post）**：Layer C over A as a soft foreground (cheat: bible geography puts the window at the far end of her pew - see director note); composite B only inside the quarry matte (lead-line mask, 4 px feather), mirrored, 10-15% screen, defocused to C's blur; darken what is seen through the clear quarry so the reflection can read (bible 8.3-1). Face in B never resolves. Grade A/C CT_CHAPEL, B CT_MODERN attenuated; grain 1.1. Sync: f4343 (180.94 '我听不懂') reflection appears; f4379 (182.44 '祷') lips move; cut f4390. Quarry at (0.70,0.45) = T18 register with S061. MP-1: the restorer's face in the quarry is a physical-reflection element - true mirror image.

**连续性锚点 match_to**：T18: the same clear diamond quarry as GLASSPANEL in corridor P4 (S061), position (0.70,0.45); the restorer's reflection is the cross-era link across seventy years.

**负面提示词（追加在全局负面之后）**
```text
sign of the cross, folded praying-hands gesture, rosary, religious figures or saint images, crucifix, text or readable handwriting on the letter, crying, tears, slow motion, eyes opening, looking at camera, the reflected face sharp or bright, a ghost figure standing in the chapel, jade bangle on the right wrist, heavy make-up, modern hairstyle on the mother, neon glass colours
```

#### S058 · 03:02:22 – 03:06:02 · 3.167 s（f4390–f4466）

| 项目 | 内容 |
|---|---|
| 歌词 | 却懂你颤抖的双肩 |
| 段落 / 简报章节 / 时代 / 场景 | BR2 桥段二 / 七 / 礼拜堂 / `chapel` |
| 景别 / 焦段 / 速度 | MCU / 75 mm / 24 |
| 入点转场 | 切 0 帧 — 侧脸 → 肩 |
| 同步点 | 183.76 s “颤抖”：肩膀开始颤抖；185.14 s “肩”：颤抖最明显；185.8 s 彩光褪去 |
| 参考图 refs | `CHAR_MOTHER` `PROP_AIRLETTER` `LOC_CHAPEL` |
| 调色 | 礼拜堂 |
| 生成时长 | 3.167 s |

**文生视频提示词 T2V · EN**
```text
Medium close-up from her right rear at 45 degrees, slightly high, 75mm anamorphic, a barely perceptible push-in; 24 fps; a 1950s tropical-port chapel at the end of sunset. MOTHER - ~45, East Asian, black hair with grey at the temples in a low chignon held by black pins, damp strands on her neck, pale dove-grey cotton-linen qipao - sits upright on a teak pew at frame right third, back to camera, shoulders drawn forward around the folded pale-blue airmail letter she holds in both hands at her chest, a pale-green jade bangle on her LEFT wrist. Soft stained-glass petals of muted ruby, amber and cobalt lie across her shoulders and collar from the west windows behind us. At 0.85 s her shoulders begin to tremble - small, suppressed, at real speed, never slow motion; at 2.2 s it is most visible, her fingers tightening, her thumb rubbing the letter's soft folded edge. From 2.2 s the coloured petals slide away and fade as blue hour arrives; the air turns cool blue and only a few distant warm candle points remain ahead of her. No tears, no face. Colour cooling into blue hour, deep shadow detail. Chapel grade: the richest colour of the film, stained-glass hues softened, never neon; fine 35mm grain, 2.39:1, no text, no religious images.
```
**文生视频提示词 T2V · ZH**
```text
中近景，从她右后方 45°、略高处，75mm 变形镜头，几乎察觉不到的推进；24 fps；日落将尽时的 1950 年代热带港口礼拜堂。祈祷的母亲——约 45 岁东亚女性，黑发在太阳穴处夹着白发、用黑色发夹盘成低髻，颈侧几缕汗湿的碎发，浅鸽灰棉麻旗袍——挺直地坐在柚木长椅上，位于画右三分之一处，背对镜头，肩膀向前收，护着双手握在胸前的那封折起的浅蓝航空信，左手腕一只浅绿玉镯。我们身后的西窗把柔和的彩窗光瓣——柔化的绛红、琥珀、钴蓝——洒在她的肩与领口上。0.85 秒，她的肩膀开始颤抖——很小、压抑，真实速度，绝不慢放；2.2 秒颤抖最明显，握信的手指收紧，拇指在信柔软的折边上来回摩挲。从 2.2 秒起，彩色光瓣滑走、褪去，蓝调时刻来了；空气变成冷蓝，只剩她前方远处几点温暖的烛光。没有眼泪，不露脸。色彩渐渐转入蓝调时刻，暗部有层次。礼拜堂调色：全片色彩最丰富处，彩窗色相柔化，绝不霓虹；细腻 35mm 颗粒，2.39:1，无任何文字，无任何宗教图像。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0: MCU from MOTHER's right rear at 45 degrees, slightly high; her back and shoulders at the right third (0.66,0.50), shoulder width ~28% of frame width, low chignon with black pins, grey at the temple, damp strands at the neck, dove-grey qipao; soft stained-glass petals (muted ruby, amber, cobalt) across shoulders and collar from behind camera; a corner of the pale-blue airmail letter and her right thumb on its fold just visible at her chest; dark teak pew back across the lower frame; deep soft nave ahead with tiny candle points; softened rich chapel grade, never neon, fine grain, 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧：从母亲右后方 45°、略高处的中近景；她的背与肩位于画右三分之一 (0.66,0.50)，肩宽约占画面宽 28%，黑发夹固定的低髻，太阳穴的白发，颈侧汗湿的碎发，浅鸽灰旗袍；柔和的彩窗光瓣（柔化绛红、琥珀、钴蓝）从摄影机身后洒在她的肩与领口上；胸前隐约露出浅蓝航空信的一角和搭在折边上的右手拇指；画面下部横着深色柚木椅背；前方是柔和深远的中殿与几点小烛光；礼拜堂调色，细腻颗粒，2.39:1。
```
**末帧 / 匹配规格 End frame**
```text
t=3.17 s (A-frame for S059, T19 register): her back and shoulder line at (0.66,0.50), shoulder width ~30% of frame width, back to camera, head slightly bowed; the petals gone, cool blue-hour light (P03) on her dove-grey shoulders; two tiny warm candle points ahead of her at (0.52,0.38); dark pew back across the lower frame.
```
**图生视频运动 Motion · EN**
```text
Camera: barely perceptible constant push-in (~10 cm), 12-frame ease-in. Subject (MOTHER, back to camera, dove-grey qipao, jade bangle on the LEFT wrist): 0-0.85 s still, breathing; 0.85-2.9 s her shoulders tremble in small, irregular, real-time shudders, peaking at 2.2 s; her fingers tighten and her thumb rubs the fold; 2.2-3.0 s the coloured petals slide off and fade as the sun drops - a light change, not a dissolve - and blue hour cools the scene. 24 fps real time, never slowed. Must NOT move: her head stays bowed (no turn); no hand rises to her face.
```
**图生视频运动 Motion · ZH**
```text
摄影机：几乎察觉不到的匀速推进（约 10 厘米），12 帧缓入。主体（母亲，背对镜头，浅鸽灰旗袍，左腕玉镯）：0–0.85 秒静止，呼吸；0.85–2.9 秒她的肩膀以细小、不规则、真实速度的方式颤抖，2.2 秒最明显；手指收紧，拇指摩挲折边；2.2–3.0 秒随着太阳落下，彩色光瓣滑走、褪去——是光线变化，不是叠化——蓝调时刻让画面变冷。24 fps 真实速度，绝不慢放。不得移动：她的头保持低垂（不回头）；手不抬到脸上。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.167 | Single generation; generate 3.7 s (0.25 s handles); the light fade may be done in the grade with a petal-light matte if the model cannot hold it. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：CT_CHAPEL cooling to blue hour (P03): petals fade 2.2-3.0 s as a light change; grain 1.1; halation 0.5 on the candle points. Tremble must be real-time (bible 4.4 / 5.7). Sync: f4410 (183.76 '颤抖') tremble starts; f4443 (185.14 '肩') peak; f4459 (185.8) petals gone; cut f4466. Register the end frame for T19: shoulder line (0.66,0.50), width 30%.

**连续性锚点 match_to**：End frame = A-frame of T19 into S059 (guard's bent back: same angle, size, position; petals out -> phone glow).

**负面提示词（追加在全局负面之后）**
```text
slow motion, sobbing, tears, hand raised to her face, sign of the cross, her face visible, turning to look back, bright neon petals, petals still on her after 3.0 s, religious images, harsh spotlight, sharp altar, qipao in bright silk, bangle on the right wrist, exaggerated heaving shoulders
```

#### S059 · 03:06:02 – 03:08:05 · 2.125 s（f4466–f4517）

| 项目 | 内容 |
|---|---|
| 歌词 | 却懂你颤抖的双肩 |
| 段落 / 简报章节 / 时代 / 场景 | BR2 桥段二 / 八 / 现代 / `night_window` |
| 景别 / 焦段 / 速度 | MCU / 75 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 相似构图 + 姿态：母亲颤抖的双肩 → 夜班工作人员弯着的背（同角度、同肩线、同画面位置；彩光褪去 → 手机冷光；跨时代，T19） |
| 同步点 | 186.09 s 强起音上切入他的背；187.3 s 手机冷光亮起 |
| 参考图 refs | `CHAR_GUARD` `PROP_PHONE` `PROP_FLASHLIGHT` `LOC_WINDOW` |
| 调色 | 现代夜间 |
| 生成时长 | 2.125 s |

**文生视频提示词 T2V · EN**
```text
Medium close-up from his right rear at 45 degrees, slightly high, 75mm anamorphic, locked; 24 fps; present day, the three-sided bay window at the east end of an old harbour building's upper gallery, night. GUARD, a ~65-year-old East Asian night attendant with short salt-and-pepper hair thinning at the crown and a slightly stooped upper back, wearing a navy night-shift jacket a little big at the shoulders, sits alone on the teak window bench at frame right third, back to camera, bent forward; reading glasses on, their black cord behind his neck; a black flashlight on his belt. On the bench by his right hip stands an old, slightly dented, unbranded dull-steel thermos with a scuffed navy cup-lid. Beyond the slightly wavy old window panes: the dark harbour mouth, breakwater lamps, anchored ships' lights, tiny defocused warm points. At 1.2 s the cool 6500K glow of a phone screen rises from his lap, catching the edge of his cheek, his ear and the rim of his glasses from below. Light: a small 2700K reading lamp in the corner, low and warm; no moonlight through these east windows. Natural skin, deep shadow detail. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中近景，从他右后方 45°、略高处，75mm 变形镜头，锁定；24 fps；当下，旧港口建筑二层长廊东端的三面窗湾，夜。夜班工作人员——约 65 岁东亚男性，灰多黑少的短发、头顶略稀，上背微驼，穿一件肩部略大的藏青值守夹克——独自坐在柚木窗凳上，位于画右三分之一，背对镜头，身体前倾；已经戴上老花镜，黑色挂绳绕在颈后；腰侧挂着一支黑色手电筒。他右侧胯边的窗凳上立着一只略有磕瘪、没有任何标志的旧哑光不锈钢保温壶，壶盖杯是磨旧的藏青色。微微波纹的老玻璃窗外：暗色的港口出海口、防波堤灯、锚泊船只的灯，细小的焦外暖点。1.2 秒，一点 6500K 的手机屏幕冷光从他膝上亮起，从下方勾出他的脸颊边缘、耳朵和镜框。光：角落一盏 2700K 小阅读灯，低而暖；这几扇东窗里没有月光。自然肤色，暗部有层次。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0 (B-frame of T19): MCU from GUARD's right rear at 45 degrees, slightly high; his stooped back and shoulder line at (0.66,0.50), shoulder width ~30% of frame width, head bowed, short salt-and-pepper hair thinning at the crown, navy jacket a little big at the shoulders, reading-glasses cord behind his neck, black flashlight on the belt; the dented dull-steel thermos with its scuffed navy cup-lid at his right hip, lower right; old wavy window panes ahead with harbour light points, two warm points at (0.52,0.38); 2700K reading lamp glow from the corner at frame left; phone still dark on his lap; modern night grade (neutral-cool, never cyan), fine grain, 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧（T19 的 B 帧）：从夜班工作人员右后方 45°、略高处的中近景；他微驼的背与肩线位于 (0.66,0.50)，肩宽约占画面宽 30%，低着头，灰多黑少、头顶略稀的短发，肩部略大的藏青夹克，老花镜挂绳绕在颈后，腰侧黑色手电；右下方他胯边那只磕瘪的旧哑光不锈钢保温壶（磨旧的藏青壶盖杯）；前方是微波纹的老窗玻璃与港口灯点，(0.52,0.38) 处两点暖光；画左角落 2700K 阅读灯的暖光；膝上的手机仍是暗的；现代调色，细腻颗粒，2.39:1。
```
**末帧 / 匹配规格 End frame**
```text
t=2.13 s: same frame; the cool 6500K phone glow now lit on his lap, rimming his right cheek, ear and the rim of his glasses from below; the screen itself not visible to camera.
```
**图生视频运动 Motion · EN**
```text
Camera locked (same composition as S058's end frame). Subject (GUARD, stooped, navy jacket, reading glasses on a black cord): still, breathing; 0.6 s he adjusts his glasses slightly with his left hand; 1.2 s he wakes the phone in his lap - the cool glow rises over 6 frames; he leans a few millimetres toward it. 24 fps real time. Must NOT move: camera, thermos; he does not turn; no one else in frame.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定（与 S058 末帧同构图）。主体（夜班工作人员，微驼，藏青夹克，老花镜挂在黑绳上）：静止，呼吸；0.6 秒他用左手轻轻扶一下眼镜；1.2 秒他点亮膝上的手机——冷光在 6 帧内亮起；他向它倾近几毫米。24 fps 真实速度。不得移动：摄影机、保温壶；他不转身；画面里没有其他人。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.125 | Single generation; generate 2.6 s (0.25 s handles). |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：CT_MODERN; phone light P29 (6500K) only on lower face and hands; reading lamp 2700K; grain 1.0. Register the start against S058's end (shoulder line (0.66,0.50), width 30% +/-3%); bridge S058's blue hour into the phone glow over 12 frames in the grade. Sync: f4466 cut on the 186.07 accent; f4495 (187.3) glow appears; cut f4517. The thermos is an unregistered GUARD prop (revision log): attach supplementary ref XREF_THERMOS (old, slightly dented, unbranded dull-steel vacuum flask ~25 cm with a scuffed navy cup-lid), identical in S062 and S077.

**连续性锚点 match_to**：B-frame of T19 (S058 -> S059). Window-bay lock: he sits on the screen-right (SE window) side; she will enter from screen-left in S062. Thermos reappears in S077.

**负面提示词（追加在全局负面之后）**
```text
readable phone screen, visible names, phone or thermos logo or brand, ring on his hand, young man, upright posture, badge with text or real insignia, moonlight through the east windows, blue streak flares, cyan grade, the restorer in frame, tears, phone glow lit from frame 0
```

#### S060 · 03:08:05 – 03:10:23 · 2.750 s（f4517–f4583）

| 项目 | 内容 |
|---|---|
| 歌词 | 却懂你颤抖的双肩／若天上的回答 |
| 段落 / 简报章节 / 时代 / 场景 | BR2 桥段二 / 八 / 现代 / `night_window` |
| 景别 / 焦段 / 速度 | CU / 100 mm / 24 |
| 入点转场 | 切 0 帧 — 背 → 他手里的东西 |
| 同步点 | 188.71 s “天上的”：拇指悬在拨号键上；190.03 s “回答”：拇指收回；190.6 s 手机扣在膝上，冷光熄灭 |
| 参考图 refs | `CHAR_GUARD` `PROP_PHONE` `LOC_WINDOW` |
| 调色 | 现代夜间 |
| 生成时长 | 2.75 s |

**文生视频提示词 T2V · EN**
```text
Close-up over his right shoulder, high angle, 100mm anamorphic, slow push past the shoulder to his hands; 24 fps; a museum window bay at night. The broad, thick-knuckled, age-spotted right hand of GUARD - a ~65-year-old East Asian night attendant in a navy jacket, no ring - holds an old unbranded dark-grey smartphone in a worn navy faux-leather flip case with a cracked corner; the screen glows cool 6500K, its content soft, out of focus and unreadable. At 0.5 s his thumb moves over the call button and stops, hovering a few millimetres above the glass without touching, trembling very slightly. At 1.8 s the thumb slowly draws back. At 2.4 s he turns the phone and lays it face down on his right thigh; the cool light goes out, leaving only a warm 2700K corner reading lamp and tiny harbour lights in the dark window. At 2.55 s his reading glasses drop onto their black cord and swing into the top edge of frame. Natural skin with age spots and creases; no logos, no names. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
近景，越过他的右肩，俯拍，100mm 变形镜头，缓慢推过肩头到他的手；24 fps；夜里博物馆的窗湾。夜班工作人员——约 65 岁东亚男性，藏青夹克，无戒指——宽厚、指节粗、带老年斑的右手，握着一部没有品牌标识的旧款深灰智能手机，装在磨旧的藏青仿皮翻盖套里，套角开裂；屏幕发出 6500K 的冷光，内容柔虚、出焦、不可读。0.5 秒，他的拇指移到拨号键上方，停住，悬在玻璃上方几毫米、没有落下，微微发颤。1.8 秒，拇指慢慢收回。2.4 秒，他把手机翻过来，扣在右大腿上；冷光熄灭，只剩角落一盏 2700K 阅读灯的暖光和暗窗里细小的港口灯点。2.55 秒，他摘下的老花镜落回黑色挂绳上，晃进画面上缘。保留老年斑与皱纹的自然皮肤；无标志、无名字。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Still, frame 0: over GUARD's right shoulder, high angle; navy jacket shoulder soft in the left foreground; his broad age-spotted right hand (no ring) holding the old dark-grey phone in a worn navy flip case with a cracked corner at (0.58,0.62), the screen glowing cool 6500K with defocused unreadable content; his thumb resting at the side of the case; knee and navy trousers beneath; reading-glasses cord at the edge; harbour light points in the dark window beyond; warm reading-lamp edge from frame left; modern night grade (neutral-cool, never cyan), fine grain, 2.39:1.
```
**首帧关键帧 Keyframe · ZH**
```text
静帧，第 0 帧：越过夜班工作人员的右肩俯拍；左前景是柔虚的藏青夹克肩头；他宽厚带老年斑的右手（无戒指）握着装在磨旧藏青翻盖套里、套角开裂的旧深灰手机，位于 (0.58,0.62)，屏幕 6500K 冷光，内容出焦不可读；拇指搭在手机套侧边；下方是膝盖与藏青长裤；画面边缘是老花镜挂绳；远处暗窗里的港口灯点；画左阅读灯的暖色边光；现代调色，细腻颗粒，2.39:1。
```
**末帧 / 匹配规格 End frame**
```text
t=2.75 s: the phone lying face down on his right thigh at (0.56,0.70), his reading glasses now hanging on their black cord at the top-left edge, the worn navy case back up with its cracked corner visible; his hand resting on it; the frame lit only by the warm reading lamp from the left and the harbour points - the moment of darkness RESTORER sees from 4 m away in S061.
```
**图生视频运动 Motion · EN**
```text
Camera: slow push over the shoulder (~20 cm), constant after an 8-frame ease-in, easing out by 2.4 s. Subject (GUARD's right hand, age spots, no ring): 0.5 s his thumb rises over the call button and freezes, hovering; 0.5-1.8 s hold with a tiny tremor; 1.82 s the thumb draws back; 2.0-2.39 s he turns the phone and lays it face down on his right thigh; the light goes out at 2.39 s; 2.45-2.75 s his left hand slips the reading glasses off and lets them drop onto their black cord (they swing into the top edge of frame). 24 fps real time. Must NOT move: his head; the thumb never touches the screen; the screen is never readable.
```
**图生视频运动 Motion · ZH**
```text
摄影机：越过肩头缓慢推进（约 20 厘米），8 帧缓入后匀速，2.4 秒缓停。主体（夜班工作人员带老年斑、无戒指的右手）：0.5 秒拇指抬到拨号键上方，停住、悬着；0.5–1.8 秒保持，微微发颤；1.82 秒拇指收回；2.0–2.39 秒他把手机翻过来扣在右大腿上；2.39 秒光熄灭；2.45–2.75 秒他用左手摘下老花镜，让它落回黑色挂绳上（镜片晃进画面上缘）。24 fps 真实速度。不得移动：他的头；拇指始终不碰屏幕；屏幕始终不可读。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.75 | Single generation; generate 3.25 s (0.25 s handles); replace the screen with a soft generic glow in comp if any glyphs appear. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：CT_MODERN: P29 screen glow, then the 2700K reading lamp only. Screen unreadable in every frame (defocus plus a soft generic UI, no glyphs). Sync: f4529 (188.71 '天上的') thumb hovers; f4561 (190.03 '回答') draws back; f4574 (190.6) face down, glow out; cut f4583. QA hand-off: glasses on for the phone (S059-S060), dropped onto the cord at 2.55 s; phone face down on his right thigh - both match g4's lock from S062.

**连续性锚点 match_to**：The glow going out at f4574 is what RESTORER notices from corridor P4 in S061. The phone stays face down on his right thigh until S072 (he dials); the glasses hang on their cord from here on (S062-S081 lock).

**负面提示词（追加在全局负面之后）**
```text
readable screen, legible name or number, call-interface text, brand logo, thumb pressing the screen, ring, smartwatch, young smooth hands, crisp UI graphics, dazzling bright screen, cyan grade, phone still glowing after it is face down, left hand holding the phone
```

#### S061 · 03:10:23 – 03:15:00 · 4.042 s（f4583–f4680）

| 项目 | 内容 |
|---|---|
| 歌词 | 还在风里辗转／愿我伸出的手 |
| 段落 / 简报章节 / 时代 / 场景 | BR2 桥段二 / 八 / 现代 / `corridor` |
| 景别 / 焦段 / 速度 | CU / 100 mm / 24 |
| 入点转场 | 切 0 帧 — 他的手机冷光熄灭 → 远处看见这一下熄灭的她（视线连接；她在长廊 P4，窗湾在其东 4 m） |
| 同步点 | 191.88 s “还”：她抬眼；192.2 s 焦点转到远处窗湾的背影；192.7 s 开始摘右手手套；193.9 s 摘左手手套；194.6 s 两只手套叠好；194.97 s 重音：她攥住手套，转身 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_GUARD` `PROP_GLOVES` `PROP_PHONE` `PROP_COAT` `PROP_GLASSPANEL` `LOC_WINDOW` `LOC_CORRIDOR` |
| 调色 | 现代夜间 |
| 生成时长 | 4.042 s |

**文生视频提示词 T2V · EN**
```text
Close-up, 100mm anamorphic, locked, eye level, a moonlit museum corridor at 04:00, 24 fps. Screen-right: a frameless vitrine holding a leaded stained-glass panel of abstract layered petals in softened ruby, amber, cobalt, sea-green and pale rose, faintly backlit; in its small clear diamond quarry at (0.70,0.45) floats the half-seen reflection of RESTORER (~28-year-old East Asian conservator, soft oval face, tiny mole below her LEFT eye, loose low ponytail with strands at the right temple, charcoal wool coat buttoned at the middle), close enough to read her unease. Screen-left, past the vitrine's edge, the corridor recedes to a glazed timber screen; beyond it, soft, the stooped back of GUARD (~65, salt-and-pepper hair, navy attendant jacket) alone on a window bench under one warm 2700K lamp, his phone light already out. At 0.9 s her reflected eyes lift; 1.2-1.9 s focus racks to his distant back and holds. From 1.7 s her warm-white-gloved hands rise into the soft lower-left foreground; 2.1-2.6 s focus finds them: she pinches off the right glove, then the left at 2.9 s, revealing a small healed scar on the outer side of her right index finger, folds both by 3.6 s and grips them at 4.0 s. Moonlight from behind right. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
近景，100mm 变形宽银幕镜头，锁定，平视，凌晨四点月光下的博物馆长廊，24 fps。画右：一只无框展柜里立着一块铅条彩窗残片，非具象的层叠花瓣色块——柔化的绛红、琥珀、钴蓝、海青与浅玫，背后极暗的灯箱让它微微发光；左下方那块透明菱形小玻璃位于 (0.70,0.45)，里面若隐若现地映着修复师（约 28 岁东亚女性文物修复师，鹅蛋脸，左眼外眼角下一颗极小的浅褐色痣，松松的低马尾、右侧太阳穴落下几缕碎发，深灰呢外套扣着中间一粒扣子）的脸，近到看得清她的不安。画左，越过展柜边缘，长廊向东退到一道木框玻璃隔断；隔断后的窗湾里，焦外是夜班工作人员（约 65 岁，花白短发，藏青值守夹克）微驼的背影，独自坐在窗凳上，一盏 2700K 阅读灯，手机的冷光已经熄灭。0.9 秒，倒影里她抬起眼；1.2–1.9 秒焦点转到远处他的背影并停住。1.7 秒起，她戴白手套的双手升入画左下前景（焦外）；2.1–2.6 秒焦点回到手上：她捏住右手手套指尖抽下，2.9 秒再摘左手——右手食指外侧一道细小的旧疤第一次露出来——3.6 秒两只叠好，4.0 秒攥在手心。月光从右后方来。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0: close-up, 100mm anamorphic, lens ~1.55 m, camera just behind RESTORER's left shoulder looking east-south-east at corridor vitrine P4 (x=-4, south side, toed 20 deg west). Screen-right ~55%: the vitrine's low-iron front glass and behind it the leaded stained-glass panel (abstract layered petals in softened ruby, amber, cobalt, sea-green, pale rose; oxidised grey leads; two cracked pieces) glowing faintly from a very dim lightbox; the clear 6x9 cm diamond quarry at the panel's lower left sits at (0.70,0.45) and holds her reflected face in three-quarter, eyes on the glass, brows slightly drawn, soft-sharp at mirror depth. Screen-left: past the vitrine's north edge the moonlit teak corridor recedes to the glazed timber screen; through its clear lower glass, far and soft, the window bay - GUARD's stooped navy back at (0.27,0.46), a 2700K reading-lamp point at (0.24,0.38), harbour light points. The soft charcoal edge of her coat shoulder at the left frame edge; arched moon pool on the floor at lower left; air deep blue #1A2D4A.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧：近景，100mm 变形镜头，镜头高约 1.55 米，摄影机在修复师左肩后方，向东偏南望向长廊 P4 展柜（x=−4，南侧，向西偏转 20°）。画右约 55%：展柜的低铁超白前玻璃，其后是铅条彩窗残片（非具象层叠花瓣，柔化的绛红、琥珀、钴蓝、海青、浅玫；铅条氧化发灰；两处玻璃有裂纹），被极暗的灯箱微微照亮；残片左下方那块 6×9 cm 透明菱形小玻璃位于 (0.70,0.45)，里面映着她四分之三侧的脸，目光落在玻璃上，眉头微收，在镜像深处半清晰。画左：越过展柜北侧边缘，月光下的柚木长廊退向木框玻璃隔断；透过下部清玻璃，远而虚的窗湾——夜班工作人员微驼的藏青背影在 (0.27,0.46)，一点 2700K 阅读灯在 (0.24,0.38)，港口灯点。画左边缘是她外套肩头柔焦的深灰边；画左下地板上一个拱形月光斑；空气深蓝 #1A2D4A。
```
**末帧 / 匹配规格 End frame**
```text
t=4.04 s: focus on her bare hands in the lower-left foreground around (0.36,0.70), both warm-white gloves folded together and gripped in her right fist, the small healed scar on the outer side of her right index finger readable; her shoulder beginning to turn screen-right; panel and diamond soft at right; the bay soft in the distance.
```
**图生视频运动 Motion · EN**
```text
Camera locked on a tripod, 24 fps, no movement. 0-0.9 s: in the diamond reflection she studies the glass; 0.92 s ('还') her reflected eyes lift toward screen-left. 1.24-1.9 s: smooth focus rack (>=1 beat) from the diamond's mirror depth to the far bay (~6 m); the guard's back stays still except breathing; no phone light. 1.74 s: her gloved hands rise into the lower-left foreground, soft. 2.1-2.6 s: focus racks to her hands. 1.74-2.9 s: left fingers pinch the right glove's fingertips and draw it off; 2.94 s the left glove comes off; 3.0-3.64 s she folds the two together; 4.01 s she grips them and her shoulder starts to turn right. Real time throughout. Must NOT move: vitrine, panel, corridor, guard (breathing only), lights; her reflection stays a true mirror image.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定在三脚架上，24 fps，不动。0–0.9 秒：菱形玻璃的倒影里她看着玻璃；0.92 秒（“还”）倒影中她的眼睛抬起、望向画左。1.24–1.9 秒：焦点平滑地（≥1 拍）从菱形玻璃的镜像深处转到远处窗湾（约 6 米）；他的背影除呼吸外不动；没有手机光。1.74 秒：她戴手套的双手升入画左下前景，焦外。2.1–2.6 秒：焦点转到她的手。1.74–2.9 秒：左手手指捏住右手手套指尖抽下；2.94 秒左手手套摘下；3.0–3.64 秒两只叠在一起；4.01 秒攥在手心，肩头开始向右转。全程真实速度。不得移动：展柜、彩窗、长廊、夜班工作人员（只允许呼吸）、灯光；她的倒影始终是真实的镜像。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.2 | Seg 1 (f4583-f4636): plate A + reflection plate B; she looks up, rack to the bay. Generate 2.7 s with a 0.5 s static head handle on the reflection. |
| 2.0 | 4.042 | Seg 2 (f4631-f4680): hands plate C over A (defocused); glove removal and grip. Generate 2.8 s (0.3 s head overlap, 0.5 s tail handle carrying her turn). Hidden seam at 2.0-2.2 s mid-rack while every plane is soft. |

**分层与合成 Plates & compositing**

- **Plate A**：Corridor/P4 plate, locked 100mm: vitrine P4 with the stained-glass panel on a very dim lightbox (diamond quarry clear and dark enough to act as a mirror), the corridor and the glazed screen visible past the vitrine's north edge, the bay with GUARD's still, stooped back on the bench under the 2700K reading lamp, phone light off. Rendered with a focus track (diamond mirror depth -> bay -> foreground).
- **Plate B**：Reflection plate: RESTORER's face in three-quarter looking into the glass, moonlight from her right and a trace of panel colour on her cheek; at 0.92 s her eyes lift to screen-left. Rendered as a true mirror image (she is physically in the room, so the mirror rule applies without exception).
- **Plate C**：Hands plate: RESTORER's gloved hands at chest height removing the right glove (pinched off by the left fingers), then the left, folding both and gripping them in the right fist; bare hands with long slim fingers, short unpolished nails, the 6 mm healed scar on the outer side of the right index finger; charcoal coat cuffs, the LEFT cuff's outer worn spot glimpsed; background corridor defocused to match A.
- **合成 / 速度 / 调色 / 同步（post）**：Composite B only inside the diamond quarry (mask to the 6x9 cm leaded quarry, 3 px feather), screen ~40-45% over the darkened quarry so it stays 'half-seen' (若隐若现), defocused by mirror depth during the rack; the rest of the panel transmits its own soft colour (P23-P27 softened 30%). Physics: focus cannot pass THROUGH the lightboxed panel - the bay is staged past the vitrine's north edge (flagged). Rack timings: f4605 eyes lift; f4613-f4629 rack to the bay; f4634-f4646 rack to the hands. Hand QC frame by frame (five fingers, no fusion); replace with an insert plate if needed. Grade CT_MODERN, shadows #1A2D4A never cyan, highlights #C8D2DB, grain 1.0, halation 0.3 on the lamp point only. Cut at f4680 on the 195.0 beat.

**连续性锚点 match_to**：IN: S060 - his phone light went out at 190.6 s, so she finds only the dark, stooped back (timing flagged). T18: the diamond quarry at (0.70,0.45) is the same quarry seen in the chapel window in S057, seventy years apart. OUT: S062 - she enters the bay from screen-left with two cups, the folded gloves pinned under her left thumb.

**负面提示词（追加在全局负面之后）**
```text
gloves still on after 3.7 s, bare hands before 1.7 s, scar on the left hand or on the wrong finger, ring, watch, nail polish, glowing phone screen, the guard's face visible, the guard turning round, figurative saints, faces or symbols in the stained glass, the mother or any other era inside the panel, focus passing through the opaque lightboxed panel, her reflection sharper or brighter than the panel colour, ghost double image, readable labels, neon colours, jerky rack focus, camera movement, tears
```

#### S062 · 03:15:00 – 03:17:10 · 2.417 s（f4680–f4738）

| 项目 | 内容 |
|---|---|
| 歌词 | 愿我伸出的手 |
| 段落 / 简报章节 / 时代 / 场景 | BR2 桥段二 / 八 / 现代 / `night_window` |
| 景别 / 焦段 / 速度 | MS / 50 mm / 24 |
| 入点转场 | 切 0 帧 — 她转身 → 她已端着茶走进窗湾（省略茶水间） |
| 同步点 | 195.57 s “伸出”：右手伸向窗台；197.15 s “手”：杯底落在窗台上 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_GUARD` `PROP_GLOVES` `PROP_TEA` `PROP_PHONE` `PROP_COAT` `PROP_FLASHLIGHT` `LOC_WINDOW` |
| 调色 | 现代夜间 |
| 生成时长 | 2.417 s |

**文生视频提示词 T2V · EN**
```text
Medium shot, 50mm anamorphic, eye level, inside a three-sided museum bay window at night, 24 fps; a slow dolly track left to right follows her last two steps, easing to rest by 2.0 s. Screen-right: GUARD (~65-year-old East Asian night attendant, square-round face, pale-brown age spot on his RIGHT cheekbone, short salt-and-pepper hair, stooped back, navy attendant jacket with a small text-free ring-and-waves badge, reading glasses hanging on a black cord) sits on the teak window bench nearest the window, his phone face-down on his right thigh, his old dented dull-steel thermos with a scuffed navy cup-lid by his right hip. From screen-left, through glazed doors, comes RESTORER (~28-year-old East Asian conservator, soft oval face, mole below her LEFT eye, loose low ponytail, charcoal wool coat buttoned at the middle, a small worn spot on the LEFT cuff's outer little-finger side), bare-handed, carrying two handle-less pale bluish-white cups, each ringed by one thin cobalt line under the rim, her folded warm-white gloves pinned under her left thumb. At 0.57 s her right hand reaches out; at 2.15 s she sets his chipped cup on the deep sill beside him. Steam rises, backlit by the 2700K corner lamp against the dark frame; harbour lights outside. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中景，50mm 变形宽银幕镜头，平视，夜里博物馆的三面窗湾，24 fps；一段缓慢稳定的轨道横移由画左向画右，跟着她最后两步，2.0 秒时缓停。画右：夜班工作人员（约 65 岁东亚男性，脸型方中带圆，右颧骨一块浅褐色老年斑，花白短发，背微驼，藏青值守夹克左胸一枚无文字的圆环水波纹小徽章，老花镜挂在黑色挂绳上）坐在柚木窗凳靠窗的一端，旧手机屏幕朝下扣在右大腿上，右胯旁是那只磕瘪的旧哑光不锈钢保温壶（磨旧的藏青壶盖杯）。修复师（约 28 岁东亚女性文物修复师，鹅蛋脸，左眼下小痣，松松的低马尾，深灰呢外套扣着中间一粒扣子，左袖口外侧小指一侧一块小磨损）从画左的玻璃门进来，没戴手套，双手各端一只无柄青白釉茶杯，杯口下各一道细细的钴蓝线，叠好的白手套压在左手拇指下。0.57 秒她的右手伸出去；2.15 秒把他那只带磕口的杯子轻轻放在他身旁深深的窗台上。热气升起，被窗湾角落一盏 2700K 阅读灯逆光照亮，衬着暗色的窗框；窗外是港口的灯。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0: MS 50mm from the bay's south-west corner at 1.3 m, looking north-north-east across the bay: east window panes and the deep white-painted sill (24 cm) at screen-right 0.64-1.0; GUARD seated at (0.74,0.55) on the teak bench with its thin grey cushion, stooped, hands on his knees, phone face-down on his right thigh, black flashlight on his belt, the dented dull-steel thermos (scuffed navy cup-lid) by his right hip at the window end of the bench; the glazed timber double doors to the corridor at screen-left background (0.06-0.24) with the moon-silver corridor floor beyond; RESTORER mid-stride at (0.22,0.52), a steaming cup in each hand at waist height, folded gloves under her left thumb; the 2700K reading lamp in the bay's far corner at (0.58,0.30); harbour lights dotting the black glass; shadows with detail.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧：50mm 中景，摄影机在窗湾西南角，高 1.3 米，向北偏东望过窗湾：东窗玻璃与 24 厘米深的白漆窗台在画右 0.64–1.0；夜班工作人员坐在 (0.74,0.55) 的柚木窗凳上（薄灰坐垫），背微驼，双手放在膝上，手机屏幕朝下扣在右大腿上，腰侧挂着黑色手电，那只磕瘪的哑光不锈钢保温壶（藏青壶盖杯）在他右胯旁、窗凳靠窗一端；画左背景（0.06–0.24）是通往长廊的木框玻璃双开门，门外是月光照着的长廊地板；修复师迈步中，位于 (0.22,0.52)，双手各端一只冒热气的杯子在腰前，叠好的手套压在左手拇指下；2700K 阅读灯在窗湾远角 (0.58,0.30)；黑色玻璃上点点港口灯；暗部有层次。
```
**末帧 / 匹配规格 End frame**
```text
t=2.42 s: she stands at (0.55,0.50) beside him, right arm extended; his chipped cup (chip at 2 o'clock) set on the sill at (0.76,0.57), steam rising backlit against the dark window frame; her own cup still in her left hand at (0.50,0.60). S063 starts on this exact frame (same set-up).
```
**图生视频运动 Motion · EN**
```text
Dolly track left to right ~0.5 m over 2.0 s with a 12-frame ease-out, 24 fps. 0-0.5 s her last stride from the doors; 0.57 s ('伸出') her right hand extends toward the sill; 0.6-2.15 s she leans and lowers his cup; 2.15 s ('手') the cup base meets the sill without a jump; steam continuous from both cups. GUARD still; only his head turns a few degrees toward her at 1.6 s. Must NOT move: window frames, lamp, sill; no spill; steam always rises.
```
**图生视频运动 Motion · ZH**
```text
轨道由左向右横移约 0.5 米、历时 2.0 秒，12 帧缓出，24 fps。0–0.5 秒她从门口迈出最后一步；0.57 秒（“伸出”）右手伸向窗台；0.6–2.15 秒她俯身把他的杯子放低；2.15 秒（“手”）杯底落在窗台上，不跳帧；两只杯子的热气连续不断。夜班工作人员不动，只在 1.6 秒时头朝她转几度。不得移动：窗框、台灯、窗台；不得洒茶；热气始终向上。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.417 | Single generation (f4680-f4738); request 3.4 s: 0.5 s head handle with her stride already in motion, 0.5 s tail. The last frame is handed to S063 as its first frame. |

**分层与合成 Plates & compositing**

- **Plate A**：Main bay plate (single generation).
- **Plate B**：Optional steam element: two thin plumes backlit by 2700K against black, 24 fps, for screen-comp if the model's steam reads weak or against bright glass.
- **合成 / 速度 / 调色 / 同步（post）**：Standard bay set-up 'BAY_3Q' for S062-S065, S072-S074, S077: camera in the bay's SW corner looking NNE so the east window is screen-right, the glazed doors screen-left, GUARD foreground-right nearer the window, RESTORER beside him on his screen-left (a true side-on camera would stack them in depth - flagged). Steam must read against the dark frame, never against bright glass (bible 3.4). Her right index scar visible 0.6-1.2 s. The thermos is not a bible prop (skeleton S059/S077): lock one look (XREF_THERMOS) - an old, slightly dented, unbranded dull-steel vacuum flask ~25 cm with a scuffed navy cup-lid. His reading glasses hang on the cord from here on (keeps S065 free of any glass between their faces - flagged for S060). Grade CT_MODERN: reading-lamp warmth vs harbour cool, warm share ~25%. Sync f4694 (195.57) reach; f4732 (197.15) cup down.

**连续性锚点 match_to**：IN: S061 (she turns with the gloves in her fist; pantry omitted). OUT: S063 continues the same camera from this last frame. Seating lock: GUARD screen-right nearer the window, RESTORER screen-left, ~40 cm apart (bible 7.10).

**负面提示词（追加在全局负面之后）**
```text
gloves on her hands, steam lit against bright sky, cups with handles, patterned or branded cups, the chip on her cup, the guard standing up or looking at camera, spilled tea, floating cups, her entering from screen-right, the guard on screen-left, reading glasses on his nose, lit phone screen, readable text, talking, shaky camera, hurried walk
```

#### S063 · 03:17:10 – 03:20:16 · 3.250 s（f4738–f4816）

| 项目 | 内容 |
|---|---|
| 歌词 | 愿我伸出的手／先抵达你的孤单 |
| 段落 / 简报章节 / 时代 / 场景 | BR2 桥段二 / 八 / 现代 / `night_window` |
| 景别 / 焦段 / 速度 | MS / 50 mm / 24 |
| 入点转场 | 切 0 帧 — 跟拍的最后一步 → 静止的双人构图 |
| 同步点 | 197.45 s “先抵达”：她放下自己的杯子；198.22 s 全乐队进入（“你”）：她坐定；199.3 s 她解开外套中间那粒扣子；200.15 s “孤”：两人的肩同时松下来 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_GUARD` `PROP_GLOVES` `PROP_TEA` `PROP_PHONE` `PROP_COAT` `PROP_FLASHLIGHT` `LOC_WINDOW` |
| 调色 | 现代夜间 |
| 生成时长 | 3.25 s |

**文生视频提示词 T2V · EN**
```text
Medium two-shot, 50mm anamorphic, locked, eye level, a museum bay window at night, 24 fps; the same set-up as the shot before. Screen-right, nearest the window: GUARD (~65-year-old East Asian night attendant, square-round face, gentle down-turned eyes, age spot on his RIGHT cheekbone, salt-and-pepper hair, stooped back, navy attendant jacket with a small text-free badge, reading glasses on a black cord). Beside him: RESTORER (~28-year-old East Asian conservator, mole below her LEFT eye, loose low ponytail with strands at the right temple, charcoal wool coat with a small worn spot on the LEFT cuff's outer edge, bare hands). In one unhurried movement she sets her cup on the sill six centimetres to the left of his chipped one, lays her folded warm-white gloves on the bench's left corner and sits down beside him, about 40 cm away, settled at 0.8 s as the band enters. At 1.9 s she undoes the middle horn button of her coat. At 2.1 s he glances at the tea. At 2.73 s both their shoulders drop together. No words. Steam from both cups climbs between them, backlit by a 2700K corner lamp against the dark window frame; harbour lights beyond. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中景双人，50mm 变形宽银幕镜头，锁定，平视，夜里博物馆的窗湾，24 fps；与上一镜同一机位。画右靠窗：夜班工作人员（约 65 岁东亚男性，脸型方中带圆，眼角下垂、目光温和，右颧骨老年斑，花白短发，背微驼，藏青值守夹克与无文字小徽章，老花镜挂在黑色挂绳上）。他身旁：修复师（约 28 岁东亚女性文物修复师，左眼下小痣，松松的低马尾、右侧太阳穴几缕碎发，深灰呢外套，左袖口外侧一块小磨损，裸手）。她不慌不忙地一气呵成：把自己的杯子放在他那只带磕口的杯子左边约六厘米的窗台上，把叠好的白手套搁在长凳画左的角上，在他身旁坐下，相距约 40 厘米，在 0.8 秒全乐队进入时坐定。1.9 秒她解开外套中间那粒牛角扣。2.1 秒他看了一眼那杯茶。2.73 秒两人的肩膀同时落下来。没有一句话。两只杯子的热气在他们之间缓缓升起，被角落一盏 2700K 阅读灯逆光照亮，衬着暗色窗框；窗外是港口的灯。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0 = S062's last frame: RESTORER standing at (0.55,0.50) beside the seated GUARD at (0.74,0.55); his chipped cup on the sill at (0.76,0.57); her cup in her left hand, folded gloves under her left thumb; reading lamp at (0.58,0.30); steam backlit; glazed doors soft at left.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧 = S062 的末帧：修复师站在 (0.55,0.50)，身旁是坐着的夜班工作人员 (0.74,0.55)；他带磕口的杯子在窗台 (0.76,0.57)；她的杯子在左手，叠好的手套压在左手拇指下；阅读灯在 (0.58,0.30)；热气逆光；画左玻璃门虚焦。
```
**末帧 / 匹配规格 End frame**
```text
t=3.25 s: two seated figures - RESTORER at (0.50,0.56), coat open, shoulders lowered; GUARD at (0.72,0.56), stooped; cups on the sill, hers at (0.705,0.57) and his at (0.76,0.57), ~6 cm apart, steam between them; folded gloves on the bench's left corner at (0.38,0.68). This sill arrangement seeds S081.
```
**图生视频运动 Motion · EN**
```text
Camera locked, 24 fps, real time. 0.03-0.35 s her cup goes down on the sill left of his; 0.35-0.55 s gloves laid on the bench's screen-left corner; 0.55-0.80 s she sits, continuous and unhurried, still on the 0.80 s band entry. 1.88 s her right hand undoes the middle horn button; 2.1 s his eyes go to the cup; 2.73 s both shoulders fall a centimetre together on an out-breath. Steam rises slowly throughout. Must NOT move: camera, cups after placement, gloves after placement, lamp.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定，24 fps，真实速度。0.03–0.35 秒她把杯子放在他那只左边的窗台上；0.35–0.55 秒把手套搁在长凳画左的角上；0.55–0.80 秒坐下，连贯从容，0.80 秒全乐队进入时已坐定。1.88 秒右手解开中间那粒牛角扣；2.1 秒他的目光落到杯子上；2.73 秒两人随一口呼气同时把肩膀放下约一厘米。热气全程缓缓上升。不得移动：摄影机、放好后的杯子、放好后的手套、台灯。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 1.6 | Seg 1 (f4738-f4776): cup down, gloves, sit. Generate 2.1 s with a 0.5 s tail. |
| 1.4 | 3.25 | Seg 2 (f4772-f4816): I2V from the seated frame at 1.4 s - unbutton, glance, shoulders. Generate 2.4 s (0.2 s head overlap, 0.4 s tail); cross-blend 1.4-1.6 s while both bodies are still. |

**分层与合成 Plates & compositing**

- **Plate A**：Main two-shot plate (two segments, same locked camera).
- **Plate B**：Optional steam element as in S062.
- **合成 / 速度 / 调色 / 同步（post）**：Sit lands on the 198.22 full-band entry (f4757); unbutton at 199.3 (f4783) - the coat stays open in every later shot S064-S081; shoulders at 200.15 (f4804). Three actions inside 0.77 s before the band entry is tight - keep them one continuous gesture (flagged). Gloves stay folded on the bench corner for S074. Grade CT_MODERN, 2700K key at ~5:1, warm share ~30%.

**连续性锚点 match_to**：IN: S062 last frame (identical set-up). Two-shot geometry reused in S066's end (from behind), S072, S074, S077; the cup arrangement (his screen-right, hers screen-left, ~6 cm) reused in S081.

**负面提示词（追加在全局负面之后）**
```text
talking, broad smiles, touching each other, eye contact before 2.1 s, the guard on screen-left, gloves on her hands, gloves dropped on the floor, coat still buttoned after 2.0 s, cups touching, cups far apart, steam against bright sky, any glass pane between them, glasses on his nose, slow motion, camera move, melodrama, tears
```

#### S064 · 03:20:16 – 03:22:17 · 2.042 s（f4816–f4865）

| 项目 | 内容 |
|---|---|
| 歌词 | 先抵达你的孤单 |
| 段落 / 简报章节 / 时代 / 场景 | BR2 桥段二 / 八 / 现代 / `night_window` |
| 景别 / 焦段 / 速度 | INSERT / 100 mm / 24 |
| 入点转场 | 切 0 帧 — 双人中景 → 手与茶杯特写（简报：“再给手与茶杯的特写”） |
| 同步点 | 200.67 s 他的手合拢在杯子上；201.6 s 磨损处在焦点中央；202.29 s 热气升过画面上缘 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_GUARD` `PROP_TEA` `PROP_COAT` `LOC_WINDOW` |
| 调色 | 现代夜间 |
| 生成时长 | 2.042 s |

**文生视频提示词 T2V · EN**
```text
Insert, 100mm anamorphic, locked, slightly high angle over a deep white-painted window sill at night, 24 fps; behind, the dark timber window frame and black glass with soft harbour light points. Screen-right: the broad, age-spotted, ringless hands of GUARD (~65-year-old East Asian night attendant; navy jacket cuffs, pale grey-blue shirt cuff) close around a handle-less pale bluish-white porcelain cup ringed by one thin complete cobalt line 6 mm below the rim, a tiny chip at 2 o'clock, and lift it slowly from the sill toward his lap. Screen-left at (0.42,0.62): the bare left hand of RESTORER (~28-year-old East Asian conservator, long slim fingers, short unpolished nails) rests on the sill beside her own identical new cup; the LEFT cuff of her charcoal wool melton coat is turned so its small rubbed, pilled, lighter-grey worn spot, 18x8 mm on the outer little-finger side about 1 cm above the edge, sits in crisp focus by 0.9 s. Jasmine tea, golden #C9A55A, one unfurled leaf. Steam rises from both cups, backlit by a 2700K reading lamp against the dark frame, and climbs past the top of frame by 1.6 s. Quiet and warm. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
插入镜头，100mm 变形宽银幕镜头，锁定，略俯，夜里一面深深的白漆窗台，24 fps；背景是暗色木窗框与黑色玻璃，港口灯点虚焦。画右：夜班工作人员（约 65 岁东亚男性；藏青夹克袖口、浅灰蓝衬衫袖口）宽厚、布满老年斑、没有戒指的双手，慢慢合拢在一只无柄青白釉瓷杯上——杯口下 6 毫米一道完整的钴蓝细线，口沿 2 点钟位置一个小磕口——把它从窗台上捧起，移向膝头。画左 (0.42,0.62)：修复师（约 28 岁东亚女性文物修复师，手指修长，指甲短、无甲油）没戴手套的左手轻轻搭在窗台上，旁边是她那只同款新杯；深灰羊毛呢外套的左袖口转向镜头，外侧小指一侧、距袖口边约 1 厘米处那块 18×8 毫米的小磨损——呢面起毛、颜色变浅、略有光泽——0.9 秒时清晰落在焦点里。茉莉花茶汤色金黄 #C9A55A，漂着一片舒展的茶叶。两只杯子的热气被 2700K 阅读灯逆光照亮、衬着暗窗框缓缓升起，1.6 秒时升过画面上缘。安静而温暖。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0: 100mm insert, focus on the sill plane: his two hands just closing around the chipped cup at (0.70,0.55), the chip at 2 o'clock; her cup at (0.52,0.50) steaming; her bare left hand relaxed on the sill at (0.42,0.62), coat cuff with the worn spot facing the lens (cuff width ~30% of frame height); dark window muntin and black glass behind, harbour points soft; 2700K backlight on the steam.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧：100mm 插入镜头，焦点在窗台平面：他的双手刚合拢在带磕口的杯子上 (0.70,0.55)，磕口在 2 点钟；她的杯子在 (0.52,0.50) 冒着热气；她没戴手套的左手放松地搭在窗台上 (0.42,0.62)，外套袖口的磨损朝向镜头（袖口宽约占画面高 30%）；背后是暗色窗棂与黑玻璃，港口灯点虚焦；2700K 逆光勾亮热气。
```
**末帧 / 匹配规格 End frame**
```text
t=2.04 s: his cup lifted out of frame low right toward his lap, a trail of steam lingering; her hand and cuff unchanged at (0.42,0.62) - the REGISTERED wear position used by S069 -> S070; her cup still steaming at (0.52,0.50).
```
**图生视频运动 Motion · EN**
```text
Locked, 24 fps, real time. 0.0-0.4 s his hands close around the cup; 0.4-1.9 s he lifts it slowly up and back toward lower right, off the sill; her hand stays still apart from a breath. 0.6-0.93 s a small focus breath settles exactly on the cuff wear; 1.62 s steam passes the top edge. Must NOT move: her hand, her cup, the sill, the frame; no spill.
```
**图生视频运动 Motion · ZH**
```text
锁定，24 fps，真实速度。0.0–0.4 秒他的双手合拢在杯子上；0.4–1.9 秒他慢慢把杯子向右下方捧起、离开窗台；她的手除呼吸外不动。0.6–0.93 秒焦点轻轻呼吸一下，正好落定在袖口磨损上；1.62 秒热气升过画面上缘。不得移动：她的手、她的杯子、窗台、窗框；不得洒茶。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.042 | Single generation (f4816-f4865); request 3.0 s with 0.4 s head and 0.5 s tail handles. |

**分层与合成 Plates & compositing**

- **Plate A**：Main insert plate (single generation).
- **Plate B**：Optional steam element (two plumes, 2700K backlit, black background) for screen-comp.
- **合成 / 速度 / 调色 / 同步（post）**：Register the wear spot at (0.42,0.62), cuff width ~30% of frame height; S070's aged cuff lands on the same coordinates. The skeleton has her left hand 'on the bench': since she sits on his screen-left, her left hand is on her far side and cannot sit beside his hands in a 100mm insert, so it rests on the sill by her own cup (flagged). Hand QC: five fingers each, knuckles and age spots consistent with CHAR_GUARD's hand inset. Grade CT_MODERN, warm share ~30%.

**连续性锚点 match_to**：Wear registration (0.42,0.62) -> S069 last frame (two sleeves) -> S070 frame 0 (aged cuff). Cup details (single cobalt line, his chip at 2 o'clock) carried to S077 and S081.

**负面提示词（追加在全局负面之后）**
```text
wear spot on the right cuff or in the wrong place, gloves, ring, wedding band, watch, phone, faces, cups with handles, logos or text on the cups, a chip on her cup, spilled tea, steam against bright sky, cobalt pattern other than one plain line, plastic look, oversharpening, extra or fused fingers, camera movement
```

#### S065 · 03:22:17 – 03:24:16 · 1.958 s（f4865–f4912）

| 项目 | 内容 |
|---|---|
| 歌词 | 先抵达你的孤单／千年啊 |
| 段落 / 简报章节 / 时代 / 场景 | BR2 桥段二 / 八 / 现代 / `night_window` |
| 景别 / 焦段 / 速度 | MCU / 75 mm / 24 |
| 入点转场 | 切 0 帧 — 手与茶杯 → 两张脸（简报：“他抬头，她轻轻点头，两个人的呼吸渐渐放松”） |
| 同步点 | 202.9 s 他抬头看她；203.5 s 拍点：她轻轻点头；203.9 s 两人同时呼气；204.07 s “千年啊”：画面保持 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_GUARD` `PROP_TEA` `PROP_COAT` `LOC_WINDOW` |
| 调色 | 现代夜间 |
| 生成时长 | 1.958 s |

**文生视频提示词 T2V · EN**
```text
Close two-shot, 75mm anamorphic, locked, eye level, inside a museum bay window at night, 24 fps; nothing stands between them - no window, no glass, no reflection. Screen-right, eyes at (0.64,0.42): GUARD (~65-year-old East Asian night attendant, square-round face, three forehead lines, gentle down-turned eyes, pale-brown age spot on his RIGHT cheekbone, short salt-and-pepper hair thinning at the crown, stooped, navy attendant jacket, reading glasses hanging on a black cord), a chipped porcelain cup held in his lap. Screen-left, eyes at (0.36,0.44): RESTORER (~28-year-old East Asian conservator, soft oval face, tiny mole below the outer corner of her LEFT eye, natural brows, no make-up, loose low ponytail with strands at the right temple, charcoal wool coat now unbuttoned). At 0.19 s he lifts his eyes from the cup and looks at her; at 0.79 s she gives one small nod at real speed; at 1.19 s they both breathe out together, shoulders easing; then stillness to the end. Warm 2700K reading-lamp side light from screen-right, about 4:1 on the faces; harbour lights as soft bokeh behind. Real skin with pores and tired eyes. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
近景双人，75mm 变形宽银幕镜头，锁定，平视，夜里博物馆的窗湾，24 fps；两人之间什么都没有——没有窗、没有玻璃、没有倒影。画右，眼睛在 (0.64,0.42)：夜班工作人员（约 65 岁东亚男性，脸型方中带圆，额头三道横纹，眼角下垂、目光温和，右颧骨一块浅褐色老年斑，花白短发、头顶略稀，背微驼，藏青值守夹克，老花镜挂在黑色挂绳上），膝上捧着那只带磕口的瓷杯。画左，眼睛在 (0.36,0.44)：修复师（约 28 岁东亚女性文物修复师，鹅蛋脸，左眼外眼角下一颗极小的痣，自然平直的眉，素颜，松松的低马尾、右侧太阳穴几缕碎发，深灰呢外套此刻已解开）。0.19 秒他从茶杯上抬起眼，看向她；0.79 秒她以真实速度轻轻点一下头；1.19 秒两人同时呼出一口气，肩膀松下来；之后静止到镜头结束。2700K 阅读灯从画右侧面暖暖地照来，脸上光比约 4:1；身后港口灯化成柔和的光斑。真实的皮肤，有毛孔，有熬夜的眼睛。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0: 75mm close two-shot, both faces in focus (T4): GUARD in three-quarter at right, eyes lowered to the cup, eyes at (0.64,0.45); RESTORER in three-quarter at left looking at him, eyes at (0.36,0.44), the mole below her left eye visible; warm lamp light from screen-right; dark bay behind with a few warm harbour bokeh at upper right.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧：75mm 双人近景，两张脸都在焦内（T4）：夜班工作人员四分之三侧在画右，目光垂向茶杯，眼睛在 (0.64,0.45)；修复师四分之三侧在画左望着他，眼睛在 (0.36,0.44)，左眼下的小痣可见；暖色台灯光从画右来；背后是暗的窗湾，右上方几点暖色港口光斑。
```
**末帧 / 匹配规格 End frame**
```text
t=1.96 s: both still, eyes meeting across the middle of frame, shoulders lowered; the frame holds across '千年啊'.
```
**图生视频运动 Motion · EN**
```text
Locked, 24 fps, real time. 0.19 s his head lifts ~10 degrees and turns to her; 0.79 s her nod - the head dips ~1.5 cm and returns in ~0.4 s; 1.19 s both exhale, shoulders settle; 1.4-1.96 s stillness. Must NOT: speak, smile widely, move the cup, move the camera.
```
**图生视频运动 Motion · ZH**
```text
锁定，24 fps，真实速度。0.19 秒他的头抬起约 10° 并转向她；0.79 秒她点头——头低下约 1.5 厘米，约 0.4 秒内回到原位；1.19 秒两人同时呼气，肩膀落定；1.4–1.96 秒静止。不得：说话、大笑、移动茶杯、移动摄影机。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 1.958 | Single generation (f4865-f4912); request 2.5 s with 0.3 s head and 0.3 s tail handles. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：The brief's '他抬头，她轻轻点头，两个人的呼吸渐渐放松' - real speed, never ramped. Sync: f4870 (202.9) look; f4884 (203.5 beat) nod; f4894 (203.9) breath. Skin hue protected 18-32 deg under 2700K. Grade CT_MODERN. Cut to S066 at f4912 on '不过'.

**连续性锚点 match_to**：Answers the INTERLUDE nod (S028/S029) with the roles reversed. OUT: S066 - the same pair seen from behind at the far end of the corridor.

**负面提示词（追加在全局负面之后）**
```text
glass or window pane between them, reflections, eyeglasses on his face, broad smile, laughter, talking, tears, hugging, touching, slow-motion nod, exaggerated nod, beauty filter, smoothed skin, her coat buttoned, gloves, camera movement, unmotivated rim light
```

### 副歌三 CH3

#### S066 · 03:24:16 – 03:33:05 · 8.542 s（f4912–f5117）

| 项目 | 内容 |
|---|---|
| 歌词 | 不过无数个今晚／有人等一场雨／有人等沉默被听见／有人要把山河／握在掌间／有人只想再见 |
| 段落 / 简报章节 / 时代 / 场景 | CH3 副歌三 / 九 / 多时代 / `corridor` |
| 景别 / 焦段 / 速度 | WS / 40 mm / 24 (长廊主运动实时；P2 玻璃内雨滴落碗的素材以 96 fps 拍摄后合成，圣经 §4.4) |
| 入点转场 | 切 0 帧 — “不过”起唱时切入长廊：上一镜两人并肩的正面 → 长廊尽头同一对人的背影（同一时刻的反打；玻璃母题重新打开） |
| 同步点 | 204.67 s “不过无数个今晚”：前推开始（x≈−12.5）；205.52 s 重音：P1 船灯最亮；206.77 s “有人等一场雨”：P2 浮现；207.07 s 雨滴落进碗心（焦点进入反射，约 1 s 内雨滴可辨）；208.57 s “沉默”：P3 候船处居中；210.38 s 重音：P4 母亲的肩居中；211.92 s “握在掌间”：开始缓停；212.79 s 重音：停稳在尽头两人的背影上（停留约 10 帧） |
| 参考图 refs | `CHAR_RESTORER` `CHAR_GUARD` `CHAR_NAVIGATOR` `CHAR_WIFE` `CHAR_MIGRANT` `CHAR_MOTHER` `PROP_BOWL` `PROP_CASE` `PROP_LAMP` `PROP_CANDLE` `PROP_SHIPLAMP` `PROP_TEA` `PROP_COAT` `PROP_OUTERCOAT` `PROP_GLASSPANEL` `LOC_DECK` `LOC_HOME` `LOC_PIER` `LOC_CHAPEL` `LOC_WINDOW` `LOC_CORRIDOR` |
| 调色 | 多时代/过渡（见提示词） |
| 生成时长 | 8.542 s |

**文生视频提示词 T2V · EN**
```text
Wide shot, 40mm anamorphic, lens 1.45 m on the centre line of a long moonlit corridor, motion-control dolly pushing east at ~1.4 m/s, stopping at 8.1 s, 24 fps. Moonlight from behind right lays arched pools on the floor every 4 m. Dark frameless vitrines alternate left and right, each holding another era's night in its own depth: left, a swinging horn stern lantern over a deep-blue swell, a sail edge, the tiny NAVIGATOR (indigo head-cloth, brown padded night coat) at the rail; right at 2.1 s, a granite home - candle stub, empty bench, lattice shadow - and through its open door rain at last falling into a blue-and-white bowl as WIFE (low bun, pale-blue jacket, silver bangle on her LEFT wrist, face unresolved) holds her palm out under the eaves; left at 3.9 s, MIGRANT (~20, long braid, faded floral blouse) on her rattan case under warm bulbs; right at 5.7 s, MOTHER's back (~45, dove-grey qipao, low chignon) trembling in fading stained-glass colour. Small wall vitrines hold only blurred glows. Ahead, through clear glass, the real present: GUARD's stooped navy back at right, RESTORER's low ponytail and charcoal coat at left, two cups steaming. Corridor in the modern night grade, never cyan; each pane keeps its own era grade; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
全景，40mm 变形宽银幕镜头，镜头高 1.45 米，位于一条长长的月光长廊中轴线上，运动控制轨道车以约每秒 1.4 米向东推进，8.1 秒时停住，24 fps。月光从右后方射入，每隔 4 米在地板上铺下一个拱形光斑。暗色的无框展柜左右交替，每一面都在自己的纵深里映着另一个时代的夜：左侧，一盏角片艉灯在深蓝长涌浪上摇晃，帆的一角，船舷边小小的航海人（靛蓝头巾，棕色夹棉守夜外衣）；右侧（2.1 秒），一间花岗岩旧屋——残烛、空着的长凳、窗格影——敞开的门外，雨终于落下，落进一只青花碗里，等待的人（低髻，浅蓝短袄，左腕素银细镯，脸始终看不清）把手心伸到檐外；左侧（3.9 秒），迁徙女性（约 20 岁，长辫，褪色碎花衫）坐在藤箱上，头顶是暖色灯泡；右侧（5.7 秒），母亲（约 45 岁，浅鸽灰旗袍，低髻）的背影在渐褪的彩窗余光里轻轻颤抖。墙上的小壁柜里只有虚焦的光斑。尽头，透过清玻璃，是真实的当下：画右是夜班工作人员微驼的藏青背影，画左是修复师的低马尾与深灰外套，两杯茶冒着热气。长廊为现代夜间调色，绝不偏青；每面玻璃保留各自时代的调色；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0 at x=-12.5: one-point perspective, vanishing point (0.50,0.48); arched moon pools receding on the floor, the nearest at lower right; P1 (x=-10, left) at (0.22,0.45) as a tall dark glass with the unlit old stern lantern inside, its glass just beginning to show a sea and a warm swinging lantern at low strength; P2 (x=-8, right, before a pier) at (0.72,0.46); P3 (left) and P4 (right) smaller beyond; small out-of-focus warm glows of the minor wall vitrines on both walls; at the far end the glazed timber screen (wavy upper glass, clear lower glass) with the lit bay and two small seated backs at (0.47-0.53,0.52); arched windows with slim steel bars along the right wall; timber coffered ceiling.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧，x=−12.5：一点透视，灭点 (0.50,0.48)；拱形月光斑沿地板向远处排去，最近的一个在画右下；P1（x=−10，左）在 (0.22,0.45)，是一面高高的暗玻璃，柜内是不点亮的旧艉灯，玻璃里刚以很低的强度浮现出海面和一盏摇晃的暖灯；P2（x=−8，右，立在墙垛前）在 (0.72,0.46)；更远处是较小的 P3（左）与 P4（右）；两侧墙上小壁柜虚焦的暖色光斑；尽头是木框玻璃隔断（上部波纹玻璃、下部清玻璃），后面是亮着灯的窗湾与两个小小的坐着的背影 (0.47–0.53,0.52)；右墙一排细钢窗棂的拱窗；木格天花。
```
**末帧 / 匹配规格 End frame**
```text
t=8.54 s (at rest since 8.12 s, x=-1.5): the glazed screen fills the centre; through its clear lower glass the two backs on the bay bench - RESTORER at (0.43,0.55), GUARD at (0.57,0.55), ~40 cm apart - two cups steaming on the sill; the 2700K reading lamp in the bay's north-east corner at (0.38,0.36) = light-match anchor for S067's stern lantern; harbour lights beyond; P4's edge leaving frame right; a moon pool at lower right.
```
**图生视频运动 Motion · EN**
```text
Motion-control dolly, 24 fps, already rolling at frame 0 at ~1.4 m/s from x=-12.5 (constant), 12-24-frame ease-out from 7.25 s ('握在掌间') to rest at x=-1.5 by 8.12 s, then a 10-frame hold. Lens height 1.45 m; no pan, tilt or roll. Pane timing: P1 reflection peaks 0.85 s; P2 surfaces 2.10 s, raindrop into the bowl's centre blossom 2.40 s (96 fps element, readable within ~1 s); P3 most prominent 3.90 s; P4 shoulders most prominent 5.71 s; the E pane resolves 6.5-8.1 s. Focus pulls per pane to its mirror depth (camera-to-glass + reflected depth), finally to the bay through the screen. Inside the panes only small continuous actions (lantern swing 6-8 s period, flame breath, crowd drift left to right, real-time shoulder tremble, steam). Must NOT: panes move, figures leave panes, eras overlap, minor glows resolve, camera shake.
```
**图生视频运动 Motion · ZH**
```text
运动控制轨道车，24 fps，第 0 帧时已在运动，自 x=−12.5 以约每秒 1.4 米匀速前进，7.25 秒（“握在掌间”）起 12–24 帧缓出，8.12 秒停稳在 x=−1.5，再停留 10 帧。镜头高 1.45 米；不摇、不俯仰、不滚转。各窗时间：P1 倒影 0.85 秒最亮；P2 在 2.10 秒浮现，2.40 秒雨滴落进碗心梅花（96 fps 素材，约 1 秒内可辨）；P3 在 3.90 秒最显著；P4 母亲的肩在 5.71 秒最显著；尽头 E 在 6.5–8.1 秒清晰。焦点依次转入每面玻璃的镜像深度（摄影机到玻璃的距离 + 被反射空间的深度），最后穿过隔断落到窗湾。玻璃里只有很小的持续动作（艉灯 6–8 秒周期摆动、烛焰呼吸、人群由左向右流动、肩膀以真实速度颤抖、热气）。不得：展柜移动、人物离开各自的玻璃、时代互相重叠、小壁柜光斑变清晰、机身晃动。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 4.5 | Seg 1 (f4912-f5020): base corridor plate A on motion-control path MC_CORRIDOR (S027 geometry), x=-12.5 -> -6.2; P1, P2 (+rain element) and P3 approach. Generate 5.0 s with a 0.5 s pre-rolled head at speed. |
| 4.0 | 8.542 | Seg 2 (f5008-f5117): x=-6.9 -> -1.5 with the ease-out; P3 exit, P4, E stop and hold. Generate 5.0 s (0.5 s head overlap, 0.5 s tail hold). Join 4.0-4.5 s by a velocity-matched optical-flow blend while no pane is centred. |

**分层与合成 Plates & compositing**

- **Plate A**：Corridor base plate (two segments, same MC path): moon pools every 4 m from behind right (04:30, moon SW ~42 deg), the five hero vitrines dark with their museum objects (P1 unlit stern lantern, P2 brass candlestick with a stub, P3 old enamel lamp shade, P4 the stained-glass panel on a dim lightbox), the minor wall vitrines, the glazed end screen with an EMPTY bay beyond (E comes from plate E).
- **Plate B1**：P1 era plate (CT_NAV): night sea, long swell with silver crests, the stern of a junk with the hexagonal horn-paned stern lantern swinging on a 6-8 s period at 1950K, a battened rust-ochre sail edge, the tiny NAVIGATOR (indigo head-cloth, brown padded night coat over the indigo jacket) at the rail in the lamp light (<2% of the pane); clear, windy; moon from upper right. As-seen layout, camera trucking to match the pane's parallax.
- **Plate B2**：P2 era plate (CT_HOME): old granite home interior seen toward the open door at screen-left - candle stub state D (2.5 cm) on the dark camphor table, the empty screen-right bench, cracked-ice lattice moon shadow; through the door, the eaves and the granite step, the blue-and-white bowl (one continuous plum-branch rim band, centre blossom) at the step's outer edge under the drip line catching rain, rain streaks visible only against the 1900K niche lamp; WIFE in the doorway, back three-quarter, silver bangle on her LEFT wrist, extending her palm under the eaves at ~2.6 s, face never resolved.
- **Plate B2r**：96 fps raindrop element (24mm probe / 100mm macro, CT_HOME): one drop falling into the bowl's centre double circle and five-petal plum blossom, crown splash, water starting to cover the blossom; backlit by the 1900K niche lamp against dark; comped inside the P2 reflection at 2.40-3.4 s with focus 'following into' it.
- **Plate B3**：P3 era plate (CT_MIG): the 1920s-30s waiting shed under enamel-shaded 2400K bulb pools, wet floor reflections, crowd drifting left to right, MIGRANT (one long braid, faded grey-blue floral blouse) seated on her rattan case under the third lamp.
- **Plate B4**：P4 era plate (CT_CHAPEL): the MOTHER from behind at the left end of a teak pew, dove-grey qipao, low chignon with grey strands, shoulders trembling slightly in real time, the last soft stained-glass petals fading into blue-hour cool, a few side-table candle points; no religious figures in focus.
- **Plate E**：Present plate (CT_MODERN), TRANSMITTED not reflected: the bay seen from behind through the glazed screen - RESTORER (charcoal coat, low ponytail) at left, GUARD (stooped, navy jacket, salt-and-pepper hair) at right, ~40 cm apart, two cups steaming on the sill, 2700K reading lamp in the north-east corner, harbour night lights beyond.
- **Plate C**：Minor-vitrine glows: ~14 permanently defocused warm glows (a fisher's lamp, a stove, a lighthouse sweep, a night-market window), circle of confusion >= 30 px, never resolving.
- **合成 / 速度 / 调色 / 同步（post）**：MP-1: era plates are composited as seen (no flop), as in S017/S024; E is transmitted, not reflected. Mask each era plate to its pane, screen blend, strength ~10% far -> 35-45% at its peak sync point -> fading as the pane leaves frame; darken each vitrine interior ~1 stop inside the mask (dark behind the glass, bright reflected space); defocus by mirror depth and rack per pane. E is a straight transmitted comp (~90%) with the wavy upper glass distorting it slightly and a faint moon-pool reflection on the screen. Speed note: from x=-12.5 at 204.67 to rest at x=-1.5 by 212.79 needs ~1.43 m/s, not the skeleton's 1.3 (flagged). Grades: corridor CT_MODERN; panes CT_NAV / CT_HOME / CT_MIG / CT_CHAPEL attenuated by reflectance; grain per era. Sync: f4932 (205.52) P1 peak; f4962 (206.77) P2; f4970 (207.07) raindrop; f5006 (208.57) P3; f5049 (210.38) P4; f5086 (211.92) ease; f5107 (212.79) rest.

**连续性锚点 match_to**：IN: S065 (their faces) -> the same pair from behind (reverse). Geometry/MC from S027 (same corridor coordinates); pays off the lateral three-pane preview of S024. OUT: light match - reading lamp (0.38,0.36) -> S067 stern lantern (0.38,0.36).

**负面提示词（追加在全局负面之后）**
```text
ghost figures standing in the corridor, translucent people outside the glass, eras bleeding across panes, all panes one colour, the wife's face sharp, the mother's face shown, minor vitrine glows resolving into pictures, readable labels or signage, ceiling lights on, fog or haze in the air, moon disc in frame, morphing between panes, flicker, camera shake, speed changes mid-move, the two at the end facing camera, him on screen-left
```

#### S067 · 03:33:05 – 03:35:16 · 2.458 s（f5117–f5176）

| 项目 | 内容 |
|---|---|
| 歌词 | 有人只想再见／某个人一面 |
| 段落 / 简报章节 / 时代 / 场景 | CH3 副歌三 / 九 / 航海人 / `sea_deck` |
| 景别 / 焦段 / 速度 | MS / 50 mm / 48 (50% slow motion) |
| 入点转场 | 光线转场 0 帧 — 长廊尽头窗湾阅读灯的暖点 → 同画面位置的艉灯暖光（光点接光点；跨时代） |
| 同步点 | 213.6 s 外衣抖开；214.25 s 全乐队涌起：外衣落定在少年身上；214.9 s 少年拉了拉衣领；215.3 s 左手指停在右袖口补丁上 |
| 参考图 refs | `CHAR_NAVIGATOR` `CHAR_COMPANION` `PROP_PATCH` `PROP_SHIPLAMP` `PROP_OUTERCOAT` `LOC_DECK` |
| 调色 | 航海时代 |
| 生成时长 | 2.458 s |

**文生视频提示词 T2V · EN**
```text
Medium shot, 50mm anamorphic, gentle breathing handheld, slightly high angle, the night deck of a 17th-century ocean-going junk beside a rope coil, 24 fps delivery, the coat's fall at 48 fps (50% slow motion), then real time. Deep-blue sea, silver moonlight from upper right, one hexagonal horn-paned stern lantern glowing 1950K at (0.38,0.36). Screen-right: COMPANION (~17-year-old East Asian sailor, thin boyish face, no beard, lips pale with cold, peeling sunburn on the cheekbones, small topknot tied with a frayed cloth band, torn undyed hemp shirt, barefoot) curled asleep against the coil, head toward screen-right, shivering. Screen-left: NAVIGATOR (~35-year-old East Asian compass-keeper, long face, high cheekbones, deep-set eyes, short neat beard, pale scar at the tail of his LEFT eyebrow, indigo head-cloth over a topknot, salt-crusted hands) shakes open his brown padded cotton coat at 0.4 s; it spreads in the wind and falls left to right over the boy, settling at 1.04 s on the music's surge. Now in only his faded indigo short jacket, he watches; at 1.7 s the boy pulls the collar to his chin, still asleep; at 2.1 s the navigator's left fingers slip inside his own RIGHT cuff and rest on a pale-blue cloth patch. Navigator-era grade: strongest warm-cool split, deep-blue sea and sky against amber lamplight, greens muted; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中景，50mm 变形宽银幕镜头，带呼吸感的轻微手持，略俯，17 世纪远洋帆船的夜甲板，缆绳卷旁；以 24 fps 交付，外衣落下以 48 fps 拍成 50% 慢动作，随后回到真实速度。深蓝的海，银色月光从画右上方来，一盏六角角片艉灯以 1950K 亮在 (0.38,0.36)。画右：年轻同伴（约 17 岁东亚少年水手，脸窄而稚气，没有胡须，嘴唇冻得发白，颧骨上晒脱皮，小发髻用一条磨毛的布带扎着，一件磨破的本色麻布短衫，赤足）蜷在缆绳卷旁睡着，头朝画右，冻得发抖。画左：航海人（约 35 岁东亚火长，长脸、颧骨突出、眼窝略深，短而整齐的胡须，左眉尾一道浅白旧疤，靛蓝头巾裹着发髻，手上结着海盐）在 0.4 秒抖开自己那件棕色夹棉外衣；衣料在风里展开，由画左向画右落到少年身上，在 1.04 秒音乐涌起时落定。此刻他身上只剩那件褪色的靛蓝短褂，站着看；1.7 秒少年在睡梦里把衣领拉到下巴，没醒；2.1 秒航海人的左手手指探进自己的右袖口，停在一块浅蓝布补丁上。航海时代调色：全片最强的冷暖对比，深蓝的海与天对琥珀色灯光，绿色压低；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0 (light match from S066): the stern lantern's warm point at (0.38,0.36) on its iron hook above the rail; NAVIGATOR at (0.26,0.50) standing, the brown padded coat gathered in both hands at chest height; COMPANION curled at (0.70,0.66) against a rope coil, hemp shirt, bare feet; wet deck planks with moon sheen; dark swell beyond the rail; moonlight from upper right.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧（承接 S066 的光点）：艉灯的暖点在 (0.38,0.36)，挂在船舷上方的铁钩上；航海人站在 (0.26,0.50)，双手把棕色夹棉外衣拢在胸前；年轻同伴蜷在 (0.70,0.66) 的缆绳卷旁，麻布短衫、赤足；湿甲板上有月光反光；船舷外是黑暗的涌浪；月光来自画右上方。
```
**末帧 / 匹配规格 End frame**
```text
t=2.46 s: the coat lies over the boy, its folds running left to right; NAVIGATOR at (0.30,0.48) in his indigo jacket, left fingertips resting on the pale-blue patch inside his turned-back right cuff at (0.36,0.62); lantern still at (0.38,0.36).
```
**图生视频运动 Motion · EN**
```text
Handheld, breathing, small amplitude. 0-1.3 s screen time in slow motion (48 fps capture played at 24, ~0.65 s of real action): 0.39 s the coat is shaken open, 0.4-1.04 s it unfurls in the wind and falls left to right over the boy, settling exactly at 1.04 s (214.25 surge). 1.3-1.5 s ramp to 24 fps real time. 1.69 s the boy pulls the collar to his chin; 1.9-2.09 s the navigator's left thumb and forefinger turn back his right cuff and rest on the patch; hold. Lantern swings on a 6-8 s period; the sea rolls. Must NOT: slow motion on faces; the indigo jacket comes off.
```
**图生视频运动 Motion · ZH**
```text
手持，带呼吸感，幅度小。画面时间 0–1.3 秒为慢动作（48 fps 拍摄、24 fps 播放，约等于 0.65 秒的真实动作）：0.39 秒外衣被抖开，0.4–1.04 秒衣料在风中展开、由左向右落到少年身上，恰在 1.04 秒（214.25 涌起）落定。1.3–1.5 秒升格回落到 24 fps 真实速度。1.69 秒少年把衣领拉到下巴；1.9–2.09 秒航海人用左手拇指与食指翻开右袖口，指腹停在补丁上；保持。艉灯以 6–8 秒周期摆动；海在起伏。不得：对脸部做慢动作；脱下靛蓝短褂。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 1.3 | Seg 1 (f5117-f5148) slow-motion coat fall: generate as a 48 fps-look clip (or 24 fps then 2x interpolation), ~0.65 s of real action plus 0.3 s handles. |
| 1.2 | 2.458 | Seg 2 (f5146-f5176) real time: the boy's collar pull and the cuff touch. Generate 1.8 s from the settled-coat frame, 0.3 s tail. |

**分层与合成 Plates & compositing**

- **Plate A**：Main deck plate (two speed segments, same handheld path).
- **Plate B**：Optional cloth element: the brown padded coat (#5B4634, paler rope-worn shoulders, undyed lining) unfurling left to right in wind, 48 fps, for comp if the model's cloth reads stiff.
- **合成 / 速度 / 调色 / 同步（post）**：Speed ramp 48 -> 24 fps at 1.3-1.5 s screen time: the skeleton marks the whole shot 48 fps, but at 50% the 2.46 s shot holds only 1.23 s of real action - too little for coat + collar + cuff (flagged). Coat settles on f5142 (214.25). Patch lock: inside the RIGHT cuff, 4.5x6 cm, #7D9CBB, off-white running stitches, one uneven corner with a double knot, turned back by the LEFT hand. Grade CT_NAV: lantern 1950K with halation 0.5, sea P01-P03, greens -20%, grain 1.15.

**连续性锚点 match_to**：IN: light match from S066's end (reading lamp (0.38,0.36) -> stern lantern (0.38,0.36)). OUT: T21 direction left -> right into S068 (the sweet). Note: S067 ends on a resting hand, so the T21 'cut mid-action' is a direction match only (flagged).

**负面提示词（追加在全局负面之后）**
```text
the navigator taking off his indigo jacket, patch on the left cuff or outside the cuff, coat falling right to left, the boy waking or looking at camera, Qing queue hairstyle, modern fabric, zips, wristwatch, documentary shake, slow motion on faces, blue streak flare, fog machine haze, lantern on the wrong side, readable text, extra fingers
```

### 副歌四 CH4

#### S068 · 03:35:16 – 03:37:17 · 2.042 s（f5176–f5225）

| 项目 | 内容 |
|---|---|
| 歌词 | 某个人一面／千年啊／不过无数个今晚 |
| 段落 / 简报章节 / 时代 / 场景 | CH4 副歌四 / 九 / 迁徙 / `pier_waiting` |
| 景别 / 焦段 / 速度 | MS / 50 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 手势：S067 外衣由画左落向画右 → 糖由画左递向画右（给予的手势与方向一致；剪点在动作中段；T21） |
| 同步点 | 215.94 s “面”：糖落进他的掌心；216.6 s “千”：她的笑跨过最后副歌的第一拍；217.2 s 他半边脸松开 |
| 参考图 refs | `CHAR_MIGRANT` `CHAR_TRAVELLER` `PROP_CASE` `PROP_SWEETS` `LOC_PIER` |
| 调色 | 迁徙时代 |
| 生成时长 | 2.042 s |

**文生视频提示词 T2V · EN**
```text
Medium shot, 50mm anamorphic, locked, eye level, a 1920s-30s pier waiting shed at night after rain, under one enamel-shaded 2400K bulb's pool of light, wet planks reflecting it, 24 fps. On a long bench, screen-left: MIGRANT (~20-year-old East Asian woman, round-square face, full cheeks, large bright wide-set eyes, straight thick brows, small mole above her RIGHT brow peak, slightly chapped lips, one long braid, faded grey-blue cotton blouse with small white and faded-rose five-petal flowers and cloth knot buttons), her rattan case at her feet, an opened square of translucent honey oil paper with a loosened thin red string in her lap, glowing in the bulb light. Screen-right: TRAVELLER (~14-year-old East Asian boy, thin, prominent ears, darting eyes, close-cropped hair, old cloth cap, oversized grey-brown adult jacket with sleeves rolled twice) hugging a cloth bundle, a ticket crushed in his fist. The shot opens mid-gesture: her right hand carries a piece of peanut-sesame brittle left to right and at 0.27 s sets it in his open palm. He hesitates, then closes his fingers. At 0.93 s she smiles at him, her right canine just showing; at 1.53 s half his face slowly loosens into an unfinished smile. Living skin. Migrant-era grade: faded-photograph softness, saturation -15%, creamy highlights, never sepia; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中景，50mm 变形宽银幕镜头，锁定，平视，雨后夜里的 1920–30 年代码头候船棚，一盏搪瓷灯罩 2400K 白炽灯投下一池光，湿木板映着它，24 fps。一条长凳上，画左：迁徙女性（约 20 岁东亚女子，圆中带方的脸，颊肉饱满，大而亮、两眼距离略宽的眼睛，直而浓的眉，右眉峰上方一颗小痣，嘴唇略干微裂，一条长辫，褪色灰蓝碎花棉布大襟衫——白色与褪玫色的五瓣小花、布盘扣），藤箱放在脚边，膝上摊开一方半透明蜂蜜色的油纸，细红棉绳已经解松，在灯泡下透着暖光。画右：紧张的旅客（约 14 岁东亚少年，瘦，耳朵显大，眼睛不停地四处看，头发剃短，旧布帽，明显过大的灰褐色大人外套，袖子挽了两道），怀里紧抱布包袱，手里攥着皱巴巴的船票。镜头在动作中段切入：她的右手捏着一块花生芝麻酥由画左递向画右，0.27 秒放进他摊开的掌心。他犹豫了一下，合拢手指。0.93 秒她冲他笑了一下，右边那颗虎牙微露；1.53 秒他半边脸慢慢松开，成了一个没笑完的笑。皮肤是活的。迁徙时代调色：褪色家庭照片般的柔和，饱和度 −15%，高光微奶油，绝不做棕褐；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0: her right hand mid-reach at (0.48,0.60) holding a 2x3 cm piece of brittle, moving right; the glowing oil-paper packet in her lap at (0.32,0.66); his open palm waiting at (0.62,0.62); her face in three-quarter toward him at (0.30,0.40); his wary face at (0.70,0.40); bulb pool overhead, wet floor reflections, the open seaward side and the steamer's portholes soft at far right.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧：她的右手伸到一半，位于 (0.48,0.60)，捏着一块 2×3 厘米的酥糖向右移动；膝上透光的油纸包在 (0.32,0.66)；他摊开的掌心在 (0.62,0.62) 等着；她四分之三侧的脸朝向他，在 (0.30,0.40)；他戒备的脸在 (0.70,0.40)；头顶灯泡光池，湿地面反光，画右远处是敞开的向海一侧与轮船虚焦的舷窗。
```
**末帧 / 匹配规格 End frame**
```text
t=2.04 s: her hand back in her lap; his fist closed around the sweet; his half smile at (0.70,0.40); her soft smile at (0.30,0.40).
```
**图生视频运动 Motion · EN**
```text
Locked, 24 fps, real time. 0-0.27 s her hand completes the left-to-right pass and sets the sweet in his palm (cut entered mid-action, T21); 0.3-0.7 s he hesitates, fingers close; 0.93 s her smile; 1.53 s his cheek and mouth loosen on one side only; a small crowd drifts soft behind, left to right. Must NOT: camera move; the packet change; slow motion.
```
**图生视频运动 Motion · ZH**
```text
锁定，24 fps，真实速度。0–0.27 秒她的手完成由左向右的递送，把糖放进他的掌心（在动作中段切入，T21）；0.3–0.7 秒他犹豫，手指合拢；0.93 秒她笑；1.53 秒他只有一侧的脸颊和嘴角松开；背后虚焦的人群由左向右缓缓流动。不得：移动摄影机；改变糖包；慢动作。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.042 | Single generation (f5176-f5225); request 2.6 s with a 0.3 s head (hand already moving) and 0.3 s tail. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Sweet lands on 215.94 (f5182); her smile crosses the CH4 downbeat 216.6 (f5198). Same packet as S034: 10x8 cm tung-oil paper #D8B57A, thin red cotton string (P16), peanut-sesame brittle #C8964F and candied winter-melon strips. Grade CT_MIG: 2400K bulbs, highlights creamy toward #F5E4C8, grain 1.25, halation 0.6 on the bulb.

**连续性锚点 match_to**：IN: T21 from S067 (the coat falling left -> right): giving direction left -> right and downward. OUT: S069 (the mother lowers herself to sit, left -> right).

**负面提示词（追加在全局负面之后）**
```text
sepia, yellow wash, the boy grinning fully, the sweet travelling right to left, the boy on screen-left, readable ticket, readable signs, crying, beggar imagery, dirt caricature, modern clothing, plastic wrapper, slow motion, camera movement, red lanterns
```

#### S069 · 03:37:17 – 03:39:17 · 2.000 s（f5225–f5273）

| 项目 | 内容 |
|---|---|
| 歌词 | 不过无数个今晚 |
| 段落 / 简报章节 / 时代 / 场景 | CH4 副歌四 / 九 / 礼拜堂 / `chapel` |
| 景别 / 焦段 / 速度 | MS / 50 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 手势：糖落进掌心的下行动作 → 母亲落座的下行动作（给予/坐到身旁，画左→画右；跨时代） |
| 同步点 | 217.72 s “不过”：她起身走过来；218.52 s “数”：她坐下；219.24 s “晚”：画面停在两只并排的衣袖上 |
| 参考图 refs | `CHAR_MOTHER` `CHAR_LONELY` `PROP_AIRLETTER` `LOC_CHAPEL` |
| 调色 | 多时代/过渡（见提示词） |
| 生成时长 | 2.0 s |

**文生视频提示词 T2V · EN**
```text
Medium shot, 50mm anamorphic, locked with an almost imperceptible push, eye level, the nave of a quiet 1950s tropical-port chapel just after sunset at blue hour, 24 fps. Cold blue skylight (#2E4A6E) through tall windows of now-dark abstract stained glass; a few side-table candles as warm 1850K points far behind. Screen-right, at the end of a teak pew: LONELY (~75-year-old man, thin, deep sun-darkened skin, sparse white hair, deeply lined face, eyes half closed, thin much-washed white cotton shirt, grey trousers, an old cloth cap on his knees under folded age-spotted hands). The shot opens mid-movement: MOTHER (~45-year-old East Asian woman, oval face, fairly high cheekbones, grey strands at the temples, low chignon held by black pins, pale dove-grey short-sleeved qipao, old pale-green jade bangle on her LEFT wrist, a folded pale-blue airmail letter in her hands) takes the last step in from screen-left along the pew and at 0.81 s lowers herself to sit beside him. She says nothing. He does not turn; at 1.1 s his hands loosen a little on the cap. Both look ahead. The frame rests on their two sleeves side by side at (0.42,0.62). Respectful and still. Chapel grade at blue hour: the stained-glass colour gone, cool blue with warm candle points, never neon; fine 35mm grain, 2.39:1, no text, no religious images.
```
**文生视频提示词 T2V · ZH**
```text
中景，50mm 变形宽银幕镜头，锁定并几乎察觉不到地推进，平视，1950 年代热带港口一座安静的礼拜堂中殿，日落之后的蓝调时刻，24 fps。冷蓝的天光（#2E4A6E）从已经暗下来的高大非具象彩窗透进来；远处侧桌上几支蜡烛是 1850K 的暖点。画右，柚木长椅的一端：另一位孤单者（约 75 岁的老人，瘦削，深色日晒肤色，白发稀疏，脸上深深的纹路，眼睛半闭，洗得很薄的白棉衬衫，灰色长裤，一顶旧布帽放在膝上，布满老年斑的双手交叠压在帽子上）。镜头在动作中切入：祈祷的母亲（约 45 岁东亚女性，椭圆脸、颧骨较高，太阳穴处几缕白发，低髻以黑发夹固定，浅鸽灰短袖旗袍，左腕一只旧的浅绿玉镯，手里握着折好的浅蓝航空信）从画左沿着长椅迈出最后一步，0.81 秒在他身旁坐下。她什么也没说。他没有转头；1.1 秒，交叠在帽子上的双手松开了一点。两人都望着前方。画面停在两只并排的衣袖上，位于 (0.42,0.62)。恭敬而安静。蓝调时刻的礼拜堂调色：彩窗的颜色已褪，冷蓝里几点暖色烛光，绝不霓虹；细腻 35mm 颗粒，2.39:1，无任何文字，无任何宗教图像。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0: LONELY seated at (0.66,0.55) at the pew's screen-right end, cap on his knees; MOTHER mid-step at (0.36,0.48), entering along the pew from screen-left, the letter held to her chest; blue-hour nave, pale grey vault soft above, candle points soft at upper right (0.85,0.35); terracotta floor in cool light.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧：孤单的老人坐在长椅画右端 (0.66,0.55)，帽子放在膝上；母亲在 (0.36,0.48) 正迈步，从画左沿长椅走来，信贴在胸前；蓝调时刻的中殿，上方浅灰拱顶虚焦，右上方 (0.85,0.35) 几点虚焦的烛光；赤陶地砖在冷光里。
```
**末帧 / 匹配规格 End frame**
```text
t=2.0 s: both seated; her short dove-grey sleeve and his thin white cotton sleeve touching side by side at (0.42,0.62) - the A frame of the 12-frame dissolve into S070 (aged coat cuff at (0.42,0.62)).
```
**图生视频运动 Motion · EN**
```text
Locked with a push of at most 2% over 2 s, 24 fps, real time. 0-0.6 s she takes the last step (already moving at frame 0 - cut mid-action, T21); 0.6-0.81 s she sits; 1.1 s his hands loosen; 1.53-2.0 s stillness on the sleeves. Must NOT: tilt the camera down to the sleeves; warm light on her face; any liturgical gesture.
```
**图生视频运动 Motion · ZH**
```text
锁定，2 秒内推进不超过 2%，24 fps，真实速度。0–0.6 秒她迈出最后一步（第 0 帧已在运动中——在动作中段切入，T21）；0.6–0.81 秒坐下；1.1 秒他的双手松开；1.53–2.0 秒画面静止在两只衣袖上。不得：把摄影机下摇到衣袖；她脸上出现暖光；任何礼仪性手势。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.0 | Single generation (f5225-f5273); request 2.6 s with a 0.3 s head (already stepping) and a 0.3 s tail feeding the dissolve. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：12-frame dissolve centred on the cut (f5267-f5279) into S070, motivated by fabric/composition (bible 8.1); position match only - the sleeves are ~15% of frame height against the cuff's ~30%. The skeleton's rise (217.72) to seated (218.52) is 0.8 s, impossible for a walk along a pew, so the shot opens on her last step (flagged). Grade CT_CHAPEL at blue hour: stained-glass light gone, hues softened 30%, candles 1850K, halation 0.5, grain 1.1.

**连续性锚点 match_to**：IN: T21 from S068 (downward giving, left -> right). Echo of S063 (she sits at screen-left beside the one at screen-right). OUT: dissolve to S070 at (0.42,0.62) = the wear position registered in S064.

**负面提示词（追加在全局负面之后）**
```text
sign of the cross, praying hand gestures, religious icons or figures in focus, figurative stained glass, him turning or talking, her talking, tears, embrace, sunset colour still on the floor, jerky or rushed sitting, slow motion, exotic caricature, readable hymn boards, text
```

#### S070 · 03:39:17 – 03:43:09 · 3.667 s（f5273–f5361）

| 项目 | 内容 |
|---|---|
| 歌词 | 等我们也成了／被轻轻翻过的一段 |
| 段落 / 简报章节 / 时代 / 场景 | CH4 副歌四 / 十 / 未来 / `museum_gallery` |
| 景别 / 焦段 / 速度 | INSERT / 100 mm / 24 |
| 入点转场 | 叠化 12 帧 — 衣料/相似构图驱动的叠化：S069 两只并排的衣袖 → 同画面位置 (0.42,0.62) 的外套左袖口磨损（与 S064 植入时的画面位置一致；跨时代：1950s → 未来） |
| 同步点 | 219.72 s “等我们”：叠化完成，衣料已老；221.4 s “翻”：后拉露出展柜；222.42 s “段”：展柜完整入画 |
| 参考图 refs | `PROP_COAT` `LOC_GALLERY` |
| 调色 | 未来 |
| 生成时长 | 3.667 s |

**文生视频提示词 T2V · EN**
```text
Insert opening as a macro, 100mm, then a slow motion-control pull-back at eye level, a museum gallery in an unspecified future, 24 fps; lowest contrast, slightly high-key, silver-white light with a trace of warmth, no sci-fi teal. Frame 0: the LEFT cuff of a charcoal wool melton coat - the RESTORER's own coat from tonight, now aged: wool faded to brownish grey #5B5853, flatter and fuzzier, dark horn buttons dulled - its small 18x8 mm rubbed, pilled worn spot on the outer little-finger side about 1 cm above the edge, brighter but identical in shape and position, at (0.42,0.62). From 1.7 s the camera draws back: the coat lies folded on a padded board covered in undyed linen, tilted 12 degrees, left cuff on top facing the glass, inside the same frameless 60x60x50 cm low-iron glass cover on the same dark wooden plinth where a brass compass once stood - the compass is gone; a small blank label card with no text. By 2.7 s the whole vitrine sits centred and square to camera. Soft diffuse overhead light, gentle shadow detail, almost no halation. Future grade: lowest contrast, slightly high-key silver-white with a trace of warmth, no sci-fi teal; very fine grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
插入镜头，以 100mm 微距开场，随后以运动控制缓慢后拉，平视，一个不确定的未来里的博物馆展厅，24 fps；反差最低、略高调，银白色光里带一丝暖，不用科幻青色。第 0 帧：一件深灰羊毛呢外套的左袖口——就是修复师今晚穿的那件，如今已经老了：呢料褪成偏褐的灰 #5B5853，更瘪、起毛更多，深色牛角扣失去光泽——外侧小指一侧、距袖口边约 1 厘米处那块 18×8 毫米的磨损，更亮了，形状与位置却完全一致，位于 (0.42,0.62)。1.7 秒起摄影机后拉：外套叠好平放在一块包着本色亚麻布、倾斜 12° 的软垫展板上，左袖口在最上面、朝向玻璃，罩在同一只 60×60×50 厘米的无框低铁超白玻璃罩里、同一座深色木展台上——那里曾放着一枚黄铜罗盘，如今罗盘不在了；旁边一张空白的小展签，没有任何文字。2.7 秒时整只展柜居中、正对镜头。柔和的顶部漫射光，暗部层次轻柔，几乎没有光晕。未来调色：反差最低、略高调，银白里带一丝暖，不用科幻青色；极细颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0 (dissolve B frame): 100mm macro of the aged left cuff, cuff width ~30% of frame height, the pale worn spot at (0.42,0.62) in crisp focus, weave and pilling readable; linen board texture soft behind; silver-white high-key light from above.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧（叠化的 B 帧）：100mm 微距拍老旧的左袖口，袖口宽约占画面高 30%，浅色磨损在 (0.42,0.62) 清晰对焦，织纹与起毛可辨；后面是虚焦的亚麻展板纹理；银白色高调光从上方来。
```
**末帧 / 匹配规格 End frame**
```text
t=3.67 s: the full G1 vitrine frontal and centred - 60x60x50 cm glass cover on the 95 cm dark plinth, the folded coat inside with its left cuff on top toward the glass, the blank label card at the plinth's right front; the camera now square to the same south glass face used in S001/S002 (the axis S071 returns to).
```
**图生视频运动 Motion · EN**
```text
0-1.69 s locked macro (the dissolve resolves 0-0.25 s); 1.69 s ('翻') motion-control pull-back begins with a 12-frame ease-in, ~1.4 m over ~1.0 s, then easing; 2.71 s ('段') the whole vitrine in frame; 2.71-3.67 s a very slow continuing drift back of ~5 cm, settling. Focus follows from the cuff to the whole coat. Must NOT: pan, tilt or rotate; the coat must not move or reshape.
```
**图生视频运动 Motion · ZH**
```text
0–1.69 秒锁定的微距（叠化在 0–0.25 秒完成）；1.69 秒（“翻”）运动控制后拉开始，12 帧缓入，约 1.0 秒内后退约 1.4 米，随后放缓；2.71 秒（“段”）整只展柜入画；2.71–3.67 秒继续极缓慢地后退约 5 厘米并停稳。焦点由袖口跟到整件外套。不得：摇、俯仰或旋转；外套不得移动或变形。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.667 | Single generation (f5273-f5361); request 4.2 s with a 0.25 s head (dissolve overlap) and 0.3 s tail. |

**分层与合成 Plates & compositing**

- **Plate A**：Future G1 vitrine plate on the S001/S002 motion-control path family (MC_G1_OPEN extended): macro start on the aged cuff, pull-back to the frontal vitrine on the same plinth and glass cover.
- **合成 / 速度 / 调色 / 同步（post）**：12-frame dissolve centred on the cut (f5267-f5279) from S069's sleeves at (0.42,0.62); the skeleton's sync wording 'dissolve complete at 219.72' implies a dissolve ending on the cut - centred is used here, as for S076/S079 (flagged). Future coat state follows the skeleton (folded to fit the 60x60x50 cm cover, revision V25); the bible's PROP_COAT future text still says 'laid flat, sleeves in a natural curve' (flagged). Grade CT_FUTURE: grain 0.7, halation 0.15, lowest contrast. Sync 221.4 (f5314) pull-back; 222.42 (f5338) vitrine complete.

**连续性锚点 match_to**：IN: dissolve from S069 at (0.42,0.62) = S064's registered wear position. OUT: S071 cuts back in to the opening ECU camera (MC_G1_OPEN) on the same glass face.

**负面提示词（追加在全局负面之后）**
```text
compass in the vitrine, readable label, text, holograms, screens, devices, sci-fi teal, chrome, futuristic architecture, people, reflections of people, wear on the right cuff, a fresh new-looking coat, coat on a mannequin or hanger, high contrast, crushed blacks, yellow wash, lens flare, morphing fabric
```

#### S071 · 03:43:09 – 03:46:07 · 2.917 s（f5361–f5431）

| 项目 | 内容 |
|---|---|
| 歌词 | 被轻轻翻过的一段／愿你隔着岁月／仍听得见 |
| 段落 / 简报章节 / 时代 / 场景 | CH4 副歌四 / 十 / 未来 / `museum_gallery` |
| 景别 / 焦段 / 速度 | ECU / 100 mm / 24 |
| 入点转场 | 切 0 帧 — 后拉的展柜 → 回到开场机位（形式呼应，T22） |
| 同步点 | 223.5 s “愿你”：倒影出现；224.16 s “岁”：手抬起；225.66 s “见”：手停在 (0.50,0.55) |
| 参考图 refs | `CHAR_FUTURE` `PROP_COAT` `LOC_GALLERY` |
| 调色 | 未来 |
| 生成时长 | 2.917 s |

**文生视频提示词 T2V · EN**
```text
Extreme close-up, 100mm macro, locked on the exact camera of the film's opening - lens 1.18 m high, axis square to the south glass face of a frameless museum vitrine, focus plane on the glass surface - in a gallery of an unspecified future, 24 fps; soft high-key silver-white light with a trace of warmth, very low contrast, very fine grain. The thin clean glass fills the frame; beyond it, soft, a folded brownish-grey wool coat on undyed linen. At 0.13 s a faint reflection forms in the glass: FUTURE, a stranger of no clear age or gender in a seamless pale warm-grey high-collared knit garment, short soft dark hair, face always defocused and attenuated, never resolved. At 0.79 s their right hand rises toward the glass, palm facing it, fingers relaxed; in the reflection we see the palm, thumb at frame left. At 2.29 s it stops at (0.50,0.55), hand width about 45% of frame height, exactly where two hands met in the opening - a finger-width from the glass, not touching. It stays. It is only a reflection: no real hand on the camera side. Quiet, curious, tender. Future grade: lowest contrast, slightly high-key silver-white with a trace of warmth, no sci-fi teal; very fine grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
大特写，100mm 微距，锁定在全片开场完全相同的机位上——镜头高 1.18 米，光轴垂直于一只无框博物馆展柜的南侧玻璃面，焦平面在玻璃表面——一个不确定的未来里的展厅，24 fps；柔和的高调银白光带一丝暖，反差极低，颗粒极细。薄而干净的玻璃占满画面；玻璃后虚焦的是一件叠好的偏褐灰色呢外套，放在本色亚麻布上。0.13 秒，玻璃里浮现一层淡淡的倒影：未来观看者，一个看不出年龄与性别的陌生人，穿浅暖灰色无缝高领针织长衣，短而柔软的深色头发，脸始终处于焦外并被反射衰减，永远看不清。0.79 秒，他/她的右手朝玻璃抬起，掌心朝向玻璃，手指放松；在倒影里我们看到的是掌心，拇指在画左。2.29 秒，手停在 (0.50,0.55)，手宽约占画面高 45%——正是开场两只手重合的位置——离玻璃一指宽，没有碰上。手停在那里。这只是倒影：玻璃靠镜头的一侧没有真实的手。安静、好奇、温柔。未来调色：反差最低、略高调，银白里带一丝暖，不用科幻青色；极细颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0: identical framing to S002 at 15.14 s without the hands - glass-surface ECU, the soft folded coat beyond (cuff at lower centre), clean thin glass with only a faint dust sparkle; the T01 point (0.50,0.55) empty; high-key silver-white.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧：与 S002 在 15.14 秒时的构图完全相同，只是没有手——玻璃表面大特写，玻璃后是虚焦的叠好的外套（袖口在画面中下），薄而干净的玻璃上只有一点淡淡的灰尘闪光；T01 点 (0.50,0.55) 空着；高调银白。
```
**末帧 / 匹配规格 End frame**
```text
t=2.92 s: the future viewer's reflected right hand at (0.50,0.55), palm to camera, thumb at frame left, width 45% of frame height, soft at mirror depth just behind the glass plane; the face a pale unresolved blur above-left of the hand. Must register with S002's T01 frame within +/-3%.
```
**图生视频运动 Motion · EN**
```text
Camera locked on MC_G1_OPEN data (no move), 24 fps. 0.13 s the reflection fades up as the viewer steps into place (physical, not a dissolve) to ~30% strength by 0.6 s; 0.79-2.29 s the hand rises slowly from below frame centre to (0.50,0.55), decelerating; 2.29-2.92 s stillness. Must NOT: anything appear on the camera side of the glass; the coat move; the light change.
```
**图生视频运动 Motion · ZH**
```text
摄影机锁定在 MC_G1_OPEN 数据上（不动），24 fps。0.13 秒，随着观看者走到柜前，倒影浮现（物理的，不是叠化），0.6 秒时达到约 30% 强度；0.79–2.29 秒手从画面中下方缓缓抬起，减速停在 (0.50,0.55)；2.29–2.92 秒静止。不得：玻璃靠镜头一侧出现任何东西；外套移动；光线变化。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.917 | Single generation (f5361-f5431); request 3.4 s with 0.25 s head and tail handles. |

**分层与合成 Plates & compositing**

- **Plate A**：Future G1 glass ECU clean plate on MC_G1_OPEN (S001/S002 data), the folded coat beyond, focus on the glass surface.
- **Plate B**：Reflection plate: the FUTURE viewer's raised right hand palm-forward plus the defocused pale knit body and face, rendered in true mirror orientation against a soft pale future gallery; perspective matched to a 100mm lens at the opening distance.
- **合成 / 速度 / 调色 / 同步（post）**：Composite B as a true reflection (screen ~30%, max 35%), defocused by mirror depth; darken the vitrine interior ~0.5 stop inside the hand area so it reads (bible 8.3); face contrast held below ~15%. Register the hand to S002's T01 frame (0.50,0.55; 45% of frame height). Grade CT_FUTURE. Sync 223.5 (f5364) reflection; 224.16 (f5380) rise; 225.66 (f5416) stop.

**连续性锚点 match_to**：T22/T23: same camera as S001/S002 (MC_G1_OPEN), same point (0.50,0.55) - the third hand. OUT: S072 - his phone hand rises (gesture rhyme; the A side ends on a held hand, so this is a direction match, flagged).

**负面提示词（追加在全局负面之后）**
```text
sharp or identifiable face, a real hand in front of the glass, hand touching the glass, devices, wristwatch, ring, sci-fi suit, LEDs, holograms, the compass, the restorer's hand, a second hand, text, readable label, non-mirrored reflection, glow, ghost body standing in the room, reflection stronger than ~40%, teal cast
```

#### S072 · 03:46:07 – 03:49:01 · 2.750 s（f5431–f5497）

| 项目 | 内容 |
|---|---|
| 歌词 | 仍听得见／我也曾像你／舍不得这人间 |
| 段落 / 简报章节 / 时代 / 场景 | CH4 副歌四 / 十 / 现代 / `night_window` |
| 景别 / 焦段 / 速度 | MCU / 75 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 手势：未来观看者抬起的手 → 夜班工作人员抬起手机的手（抬手手势；跨时代回到当下） |
| 同步点 | 226.32 s “我也曾像你”：手机抬起；226.98 s “像你”：按下拨号；227.46 s “舍不得”：贴到耳边 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_GUARD` `PROP_TEA` `PROP_PHONE` `PROP_COAT` `LOC_WINDOW` |
| 调色 | 多时代/过渡（见提示词） |
| 生成时长 | 2.75 s |

**文生视频提示词 T2V · EN**
```text
Medium close-up, 75mm anamorphic, locked with a very slight push, eye level a little to his left, the museum bay window just before dawn, about 05:40, 24 fps. Screen-right in focus: GUARD (~65-year-old East Asian night attendant, square-round face, three forehead lines, gentle down-turned eyes, pale-brown age spot on his RIGHT cheekbone, short salt-and-pepper hair, stooped, navy attendant jacket with a small text-free badge, reading glasses on a black cord). At 0.03 s he lifts an old unbranded phone in a worn navy flip case from his right thigh, draws one breath, presses to dial at 0.69 s - the screen angled away and never readable - and at 1.17 s holds it to his right ear. Screen-left, out of focus: RESTORER (~28-year-old East Asian conservator, loose low ponytail, charcoal wool coat open), quietly looking out of the window. Their two cups sit on the sill; the tea has gone cool, no steam. Key: the 2700K reading lamp from screen-right; a brief cold phone glow on his chin and fingers; the window sky only beginning to pale from deep blue #1A2D4A. Modern night grade easing toward dawn: neutral-cool, deep-blue shadows never cyan, the window just paling; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中近景，75mm 变形宽银幕镜头，锁定并极轻微推进，平视、略偏他的左侧，博物馆窗湾，黎明前约 05:40，24 fps。画右在焦内：夜班工作人员（约 65 岁东亚男性，脸型方中带圆，额头三道横纹，眼角下垂、目光温和，右颧骨一块浅褐色老年斑，花白短发，背微驼，藏青值守夹克与无文字小徽章，老花镜挂在黑色挂绳上）。0.03 秒，他从右大腿上拿起那部装在磨旧藏青翻盖套里的无品牌旧手机，吸一口气，0.69 秒按下拨号——屏幕侧向别处，永不可读——1.17 秒把它贴到右耳边。画左焦外：修复师（约 28 岁东亚女性文物修复师，松松的低马尾，深灰呢外套敞着），安静地望着窗外。两只杯子放在窗台上，茶已经凉了，没有热气。主光：画右的 2700K 阅读灯；手机屏幕的冷光短暂地照在他的下巴与手指上；窗外的天刚刚开始从深蓝 #1A2D4A 变淡。现代夜间调色渐向黎明过渡：中性偏冷，暗部深蓝、绝不偏青，窗外刚刚变淡；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0: GUARD in three-quarter at (0.64,0.45), face lowered, his right hand at his thigh just beginning to lift the phone (0.62,0.78); RESTORER soft at (0.28,0.46) in profile toward screen-right; window panes at the right edge, deep blue a touch paler at the bottom; reading lamp warm on his face; the two cups as soft shapes on the sill at right.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧：夜班工作人员四分之三侧在 (0.64,0.45)，脸低着，右手在大腿上，刚开始拿起手机 (0.62,0.78)；修复师在 (0.28,0.46) 虚焦，侧脸朝画右；画右边缘是窗玻璃，深蓝在底部略淡；阅读灯暖光落在他脸上；窗台上两只杯子是画右虚焦的形状。
```
**末帧 / 匹配规格 End frame**
```text
t=2.75 s: the phone at his right ear, his eyes lowered to screen-left, waiting; she soft at left; the sky still deep blue.
```
**图生视频运动 Motion · EN**
```text
Locked with a 2% push over 2.75 s, 24 fps, real time. 0.03-0.6 s the phone rises (an upward hand movement rhyming with S071's rising hand); 0.6 s a small in-breath; 0.69 s his thumb presses (screen hidden by angle and thumb); 0.8-1.17 s the phone travels to his right ear; 1.17-2.75 s still, waiting. Must NOT: show any screen content; bring her into focus.
```
**图生视频运动 Motion · ZH**
```text
锁定，2.75 秒内推进 2%，24 fps，真实速度。0.03–0.6 秒手机抬起（向上的手部动作，与 S071 抬起的手押韵）；0.6 秒轻轻吸一口气；0.69 秒拇指按下（屏幕被角度与拇指挡住）；0.8–1.17 秒手机移到右耳边；1.17–2.75 秒静止，等待。不得：露出任何屏幕内容；让她进入焦内。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.75 | Single generation (f5431-f5497); request 3.2 s with a 0.25 s head and 0.2 s tail. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Phone glow 6500K (#C9D8E6) only on his lower face and fingers 0.4-1.2 s, then hidden at the ear. Story time jumps from ~04:20 (S065) to ~05:40: the tea is cold, so no steam here and in S073/S074 - the refill in S077 then motivates the dawn steam (flagged). His cup is back on the sill (he lifted it in S064; not shown returning - flagged). Phone has stayed face-down on his right thigh since S060. Sync 226.98 (f5448) dial; 227.46 (f5459) ear.

**连续性锚点 match_to**：IN: S071's rising right hand -> his rising right hand (gesture rhyme). Bay two-shot geometry as S063 (he screen-right, she screen-left). Bible T24 (worn cuff macro -> same cuff on her now) is not used here - the skeleton replaces it with this hand match (flagged).

**负面提示词（追加在全局负面之后）**
```text
readable phone screen, a name, numbers, brand logo, him smiling yet, her in focus, her watching him, steam from the cups, bright dawn, sun, glasses on his nose, phone at his left ear, ring, talking, camera shake, fast motion
```

#### S073 · 03:49:01 – 03:50:15 · 1.583 s（f5497–f5535）

| 项目 | 内容 |
|---|---|
| 歌词 | 舍不得这人间 |
| 段落 / 简报章节 / 时代 / 场景 | CH4 副歌四 / 十 / 现代 / `night_window` |
| 景别 / 焦段 / 速度 | CU / 100 mm / 24 |
| 入点转场 | 切 0 帧 — 全乐队骤停的瞬间切入（229.1） |
| 同步点 | 229.1 s 全乐队骤停：切入；229.82 s 他屏住的气息 |
| 参考图 refs | `CHAR_GUARD` `PROP_PHONE` `LOC_WINDOW` |
| 调色 | 现代夜间 |
| 生成时长 | 1.583 s |

**文生视频提示词 T2V · EN**
```text
Close-up, 100mm anamorphic, locked, eye level, in the museum bay window before dawn, 24 fps; almost nothing moves. GUARD (~65-year-old East Asian night attendant, square-round face, three forehead lines, gentle down-turned eyes with deep creases, pale-brown age spot on his RIGHT cheekbone, clean-shaven with the faintest grey stubble, short salt-and-pepper hair, the collar of his navy attendant jacket, the reading-glasses cord at his neck) holds an old phone in a worn navy flip case to his right ear, half hidden behind his jaw. His eyes are lowered to screen-left, waiting for an answer that has not come. At 0.78 s he holds his breath: the lips close, the nostrils still, a tiny swallow. Nothing else - this is the silence of the full-band stop. Light: the warm 2700K reading lamp from screen-right models his face at about 5:1, the far side falling into deep blue shadow that keeps detail; a few harbour lights as soft bokeh behind; no dawn visible yet. Real skin with pores, age spots and fine lines, no retouching. Faint halation on the bokeh only. Modern night grade: neutral-cool, deep-blue shadows never cyan, moon-silver highlights; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
近景，100mm 变形宽银幕镜头，锁定，平视，黎明前的博物馆窗湾，24 fps；几乎什么都不动。夜班工作人员（约 65 岁东亚男性，脸型方中带圆，额头三道横纹，眼角下垂、目光温和、纹路很深，右颧骨一块浅褐色老年斑，胡子刮得干净、只有极淡的灰白胡茬，花白短发，藏青值守夹克的领口，脖子上是老花镜的挂绳）把装在磨旧藏青翻盖套里的旧手机贴在右耳边，一半藏在下颌后面。他的目光垂向画左，在等一个还没有来的回答。0.78 秒，他屏住呼吸：嘴唇抿上，鼻翼不动，轻轻咽了一下。别的什么都没有——这是全乐队骤停的那片静默。光：画右的 2700K 暖色阅读灯以约 5:1 的光比塑出他的脸，另一侧沉入保留层次的深蓝阴影；身后几点港口灯化为柔和光斑；天还没有亮。真实的皮肤，有毛孔、老年斑与细纹，不做修饰。只有光斑周围有极淡的光晕。现代夜间调色：中性偏冷，暗部深蓝、绝不偏青，高光月光银；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0: CU, his eyes at (0.52,0.42), face in three-quarter toward camera-left, the phone at his right ear on the far side (case edge at (0.70,0.45)), warm lamp light from screen-right; deep-blue background with a few warm bokeh.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧：近景，他的眼睛在 (0.52,0.42)，脸四分之三侧朝向镜头左侧，手机在远侧的右耳边（手机套边缘在 (0.70,0.45)），暖色台灯光从画右来；深蓝背景，几点暖色光斑。
```
**末帧 / 匹配规格 End frame**
```text
t=1.58 s: unchanged but for the held breath; brows still tight - they ease only in S074.
```
**图生视频运动 Motion · EN**
```text
Locked, 24 fps, real time. 0-0.78 s stillness with one micro blink; 0.78 s the breath is held (lips press, a tiny swallow); hold to the end. Must NOT: any camera or lighting change; any speech.
```
**图生视频运动 Motion · ZH**
```text
锁定，24 fps，真实速度。0–0.78 秒静止，只眨一次极小的眼；0.78 秒屏住呼吸（嘴唇抿紧，轻轻咽一下）；保持到结束。不得：摄影机或光线有任何变化；说话。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 1.583 | Single generation (f5497-f5535); request 2.0 s with 0.2 s handles. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Cut in on the 229.1 full-band stop (cut at f5497, stop from f5498); hold the grade stable; S074 cuts on the 230.6 re-entry. Skin hue protected under 2700K (P18 #C99A78 reference).

**连续性锚点 match_to**：Between S072 and S074 (same set, same light). Eyeline to screen-left-down.

**负面提示词（追加在全局负面之后）**
```text
phone screen visible, text, smiling, talking, tears, eyes to camera, slow motion, camera move, beauty filter, smoothed skin, glasses on his face, ring, bright sky, flicker
```

#### S074 · 03:50:15 – 03:53:22 · 3.292 s（f5535–f5614）

| 项目 | 内容 |
|---|---|
| 歌词 | 舍不得这人间 |
| 段落 / 简报章节 / 时代 / 场景 | CH4 副歌四 / 十 / 现代 / `night_window` |
| 景别 / 焦段 / 速度 | MCU / 50 mm / 24 |
| 入点转场 | 切 0 帧 — 全乐队重新进入（230.6）时切双人 |
| 同步点 | 230.63 s “这人间”随全乐队重新进入：电话接通，眉眼开始舒展；232.27 s 重音：她微笑；233.07 s 最强重音：她把目光移向窗外 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_GUARD` `PROP_GLOVES` `PROP_TEA` `PROP_PHONE` `PROP_COAT` `LOC_WINDOW` |
| 调色 | 多时代/过渡（见提示词） |
| 生成时长 | 3.292 s |

**文生视频提示词 T2V · EN**
```text
Medium close two-shot, 50mm anamorphic, locked with a very slow push, eye level, inside the museum bay window at about 05:40, 24 fps; the glass beside them beginning to pale from deep blue #1A2D4A. Screen-right, nearer the window: GUARD (~65-year-old East Asian night attendant, square-round face, gentle down-turned eyes, pale-brown age spot on his RIGHT cheekbone, salt-and-pepper hair, stooped, navy attendant jacket, reading glasses on a black cord) holds an old phone in a worn navy flip case to his right ear. Screen-left: RESTORER (~28-year-old East Asian conservator, soft oval face, tiny mole below her LEFT eye, loose low ponytail with more strands loose at the right temple, charcoal wool coat open), her folded warm-white gloves on the bench corner beside her. At 0.01 s someone answers - we hear nothing: his brows slowly ease, the corners of his mouth loosen, and he murmurs a few unreadable words. At 1.65 s she smiles quietly; at 2.45 s she turns her gaze out of the window, leaving the moment to him. Warm 2700K reading-lamp key, a faint cool pre-dawn fill from the window, harbour lights soft. Modern night grade easing toward dawn: neutral-cool, deep-blue shadows never cyan, the window just paling; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中近景双人，50mm 变形宽银幕镜头，锁定并极缓慢推进，平视，约 05:40 的博物馆窗湾，24 fps；他们身旁的玻璃开始从深蓝 #1A2D4A 变淡。画右靠窗：夜班工作人员（约 65 岁东亚男性，脸型方中带圆，眼角下垂、目光温和，右颧骨浅褐色老年斑，花白短发，背微驼，藏青值守夹克，老花镜挂在黑色挂绳上）把装在磨旧藏青翻盖套里的旧手机贴在右耳边。画左：修复师（约 28 岁东亚女性文物修复师，鹅蛋脸，左眼下一颗极小的痣，松松的低马尾、右侧太阳穴的碎发比夜里多了些，深灰呢外套敞着），叠好的白手套放在她身旁长凳的角上。0.01 秒，电话那头有人接了——我们什么也听不见：他的眉眼慢慢舒展，嘴角松开，低声说了几句听不清、也读不出的话。1.65 秒她安静地微笑；2.45 秒她把目光移向窗外，把这一刻留给他。2700K 暖色阅读灯为主光，窗外黎明前一点淡淡的冷光作补光，港口灯虚焦。现代夜间调色渐向黎明过渡：中性偏冷，暗部深蓝、绝不偏青，窗外刚刚变淡；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0: GUARD at (0.66,0.44), phone at his right ear, brows still tight; RESTORER at (0.34,0.47) looking softly toward him; folded gloves on the bench corner at (0.18,0.78); window panes at right with the deep blue just paling; reading lamp warm; cups on the sill at the right edge, no steam.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧：夜班工作人员在 (0.66,0.44)，手机贴在右耳，眉头仍紧；修复师在 (0.34,0.47) 柔和地望着他；叠好的手套在长凳角上 (0.18,0.78)；画右窗玻璃的深蓝刚刚变淡；阅读灯暖光；画右边缘窗台上的杯子，没有热气。
```
**末帧 / 匹配规格 End frame**
```text
t=3.29 s: his face eased, eyes lifted a little; her profile turned to screen-right toward the window at (0.34,0.46) - the first warmth of the outro composition.
```
**图生视频运动 Motion · EN**
```text
Locked, ~2% push, 24 fps, real time. 0.0-1.2 s his brows ease and his mouth loosens gradually (never slow motion); 1.0-1.6 s he murmurs, lips barely moving; 1.65 s her small smile; 2.45 s her eyes, then her head, turn to the window; hold. Must NOT: camera tilt; big mouth movements implying audible dialogue.
```
**图生视频运动 Motion · ZH**
```text
锁定，约 2% 推进，24 fps，真实速度。0.0–1.2 秒他的眉头逐渐舒展、嘴角松开（绝不慢放）；1.0–1.6 秒他低声说话，嘴唇几乎不动；1.65 秒她浅浅一笑；2.45 秒她先是目光、再是头转向窗外；保持。不得：摄影机俯仰；大幅度的口型让人以为有可听的对白。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.292 | Single generation (f5535-f5614); request 3.8 s with 0.25 s handles. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：Cut on the 230.6 re-entry (f5535). Window sky ramps from P02 to slightly lifted by the end (dawn table: 233.8 = P02, warm ~10%). Sync 232.27 (f5574) smile; 233.07 (f5594) look away. Gloves remain where S063 left them.

**连续性锚点 match_to**：Two-shot geometry = S063. OUT: light-led cut to S075 (the first glimmer from screen-right).

**负面提示词（追加在全局负面之后）**
```text
readable lips, visible phone screen, loud laughter, tears, hug, her leaning in to listen, her on screen-right, gloves on her hands, coat buttoned, steam from the cups, bright dawn, sun, slow-motion face, camera shake
```

### 尾声 OUTRO

#### S075 · 03:53:22 – 03:55:13 · 1.625 s（f5614–f5653）

| 项目 | 内容 |
|---|---|
| 歌词 | 那时的你 |
| 段落 / 简报章节 / 时代 / 场景 | OUTRO 尾声 / 十一 / 航海人 / `sea_deck` |
| 景别 / 焦段 / 速度 | MCU / 100 mm / 24 |
| 入点转场 | 光线转场 0 帧 — 现代窗外渐亮的天色 → 海上天边第一缕微光（同方向光源、相似侧脸构图；跨时代） |
| 同步点 | 234.09 s “那时的你”；235.0 s 他把脸转向画右的微光 |
| 参考图 refs | `CHAR_NAVIGATOR` `LOC_DECK` |
| 调色 | 多时代/过渡（见提示词） |
| 生成时长 | 1.625 s |

**文生视频提示词 T2V · EN**
```text
Medium close-up, 100mm anamorphic, locked, side-on at eye level, the stern-castle rail of a 17th-century ocean-going junk in the last minutes before dawn, 24 fps. NAVIGATOR (~35-year-old East Asian compass-keeper, long face, high cheekbones, slightly deep-set dark-brown eyes with sun creases, short neat beard and moustache, a pale old scar at the tail of his LEFT eyebrow, indigo head-cloth over a topknot with a few strands loose in the wind, faded indigo short jacket with a cross collar, no outer coat) stands in the left third of frame, at first facing screen-left toward home, his left profile and the scar toward us. On '你', at 1.08 s, he slowly turns his face to screen-right, where the first glimmer of day touches the horizon - blue-grey #5B6F8A with a thin peach line #EBB894 - and lights his cheek; the sea below is still deep blue. Wind moves the ends of the head-cloth. The only light is the sky at screen-right; no lantern on his face. Real weathered skin, salt on the rail. A short warm horizontal flare at the horizon is allowed. Navigator-era grade easing toward dawn: deep-blue sea, blue-grey sky with a thin peach line, never orange; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中近景，100mm 变形宽银幕镜头，锁定，侧面平视，黎明前最后几分钟里一艘 17 世纪远洋帆船的艉楼船舷，24 fps。航海人（约 35 岁东亚火长，长脸、颧骨突出，眼窝略深的深褐色眼睛带着日晒细纹，短而整齐的胡须与上唇须，左眉尾一道浅白旧疤，靛蓝头巾裹着发髻、几缕碎发被风吹乱，褪色的靛蓝交领短褂，没有外衣）站在画面左三分之一，起初面朝画左——家的方向——左侧脸和那道疤对着我们。“你”字上，1.08 秒，他慢慢把脸转向画右：天边第一缕微光碰到海平线——蓝灰 #5B6F8A 上一线细细的晨光桃色 #EBB894——照亮了他的脸颊；下面的海仍是深蓝。风吹动头巾的尾端。唯一的光来自画右的天空；他脸上没有灯笼光。真实的风霜皮肤，船舷上有盐。允许海平线处有一道短而暖的水平光晕。航海时代调色渐向黎明过渡：深蓝的海，蓝灰的天上一线细细的桃色，绝不变橙；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0: NAVIGATOR at (0.30,0.42) in left profile facing screen-left, the pale scar at the tail of his LEFT eyebrow visible, eyes on the dark coast; the right half of frame open deep-blue sea with the first pale band of sky at the right horizon; a strip of weathered rail across the bottom.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧：航海人在 (0.30,0.42)，左侧脸面朝画左，左眉尾的浅白旧疤可见，望着黑暗的海岸；画面右半是开阔的深蓝海面，右侧海平线上第一道淡淡的天光；画面底部一段风化的船舷。
```
**末帧 / 匹配规格 End frame**
```text
t=1.62 s: his face turned to screen-right, eye at (0.33,0.40), his cheek lit by the cool-peach horizon; the dissolve anchor for S076 (her eye at the same point).
```
**图生视频运动 Motion · EN**
```text
Locked, 24 fps, real time. 0-1.0 s still, breathing, wind in the head-cloth; 1.0-1.5 s his head turns about 120 degrees from screen-left to screen-right, slow and natural; the swell rises and falls behind. Must NOT: slow-motion turn; camera move.
```
**图生视频运动 Motion · ZH**
```text
锁定，24 fps，真实速度。0–1.0 秒静止，呼吸，风吹着头巾；1.0–1.5 秒他的头从画左转向画右约 120°，缓慢而自然；身后涌浪起伏。不得：慢动作转头；移动摄影机。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 1.625 | Single generation (f5614-f5653); request 2.0 s with a 0.2 s head and a 0.3 s tail (feeds the 12-frame dissolve). |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：12-frame dissolve centred on the cut (f5647-f5659) into S076, eyes aligned at (0.33,0.40). First time in the film he looks screen-right (bible 4.5, F9). Grade CT_NAV blending toward CT_DAWN (dawn table 233.8-238: sky P02 -> P20 with a thin P21 line); skin P19 protected.

**连续性锚点 match_to**：T25 echo-group lock: figure in the left third, profile, eyeline slightly above horizontal, light from screen-right. IN: light-led from S074's paling window. OUT: dissolve to S076.

**负面提示词（追加在全局负面之后）**
```text
sun disc, orange sky, the outer coat on him, Qing queue, modern clothing, shore lights at screen-right, light from screen-left, tears, smile, slow-motion head turn, camera move, blue streak flare, fog
```

#### S076 · 03:55:13 – 03:57:02 · 1.542 s（f5653–f5690）

| 项目 | 内容 |
|---|---|
| 歌词 | 那时的你 |
| 段落 / 简报章节 / 时代 / 场景 | OUTRO 尾声 / 十一 / 迁徙 / `pier_waiting` |
| 景别 / 焦段 / 速度 | MCU / 100 mm / 24 |
| 入点转场 | 叠化 12 帧 — 光线驱动的叠化（居中于剪点，5647–5659）：两张侧脸的位置与光向一致（跨时代） |
| 同步点 | 235.6 s 叠化完成：她的侧脸在微光里成形；236.4 s 新的海岸在晨雾里显出轮廓 |
| 参考图 refs | `CHAR_MIGRANT` `PROP_CASE` `LOC_PIER` |
| 调色 | 多时代/过渡（见提示词） |
| 生成时长 | 1.542 s |

**文生视频提示词 T2V · EN**
```text
Medium close-up, 100mm anamorphic, locked, side-on at eye level, the white-painted steel rail of a 1920s-30s black-hulled passenger steamer at first light in a soft sea haze, 24 fps. MIGRANT (~20-year-old East Asian woman, round-square face, full cheeks, large bright wide-set eyes, straight thick brows, small mole above her RIGHT brow peak, slightly chapped lips, sun-pink cheekbones, thin fringe, one long braid down her back tied with black thread, faded grey-blue floral cotton blouse, a thin grey-blue cotton over-jacket around her shoulders) stands in the left third of frame in profile, facing screen-right; the handle of her rattan case is just visible at the lower right edge, by her right hand. Through the haze at screen-right, at 0.86 s, the low outline of a new coastline slowly appears on the horizon. Light from screen-right: the cool-warm boundary of first daylight, blue-grey #5B6F8A with a thin peach edge; her face keeps a living warmth. Wind lifts a few fringe hairs. Migrant-era grade toward dawn: faded-photograph softness, saturation -15%, creamy highlights, never sepia; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中近景，100mm 变形宽银幕镜头，锁定，侧面平视，1920–30 年代一艘黑色船壳客轮的白漆钢栏杆边，清晨第一道光，海上薄雾，24 fps。迁徙女性（约 20 岁东亚女子，圆中带方的脸，颊肉饱满，大而亮、两眼距离略宽的眼睛，直而浓的眉，右眉峰上方一颗小痣，嘴唇略干微裂，颧骨有点日晒的红，稀薄的刘海，一条长辫垂到背中、辫梢用黑棉线扎紧，褪色灰蓝碎花棉布衫，肩上披着灰蓝薄棉外褂）站在画面左三分之一，侧脸朝向画右；藤箱的提手刚好在画右下边缘露出一点，就在她右手边。0.86 秒，画右薄雾里，一道新的海岸线低低的轮廓慢慢显出来。光从画右来：清晨第一道天光冷暖交界，蓝灰 #5B6F8A 带一线细细的桃色边；她的脸保留着活的暖。风吹起几根刘海。迁徙时代调色渐向黎明：褪色家庭照片般的柔和，饱和度 −15%，高光微奶油，绝不做棕褐；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0 (dissolve B frame): her eye at (0.33,0.40), right profile toward screen-right, the mole above her right brow visible; the white rail across the lower frame; haze and pale sea at right.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧（叠化的 B 帧）：她的眼睛在 (0.33,0.40)，右侧脸朝向画右，右眉峰上的小痣可见；白色栏杆横过画面下部；画右是薄雾与淡淡的海。
```
**末帧 / 匹配规格 End frame**
```text
t=1.54 s: a soft new coastline across the right horizon at y~0.52; her face unchanged, lit from the right.
```
**图生视频运动 Motion · EN**
```text
Locked, 24 fps, real time. Only breath, wind in the fringe and the braid's tip, haze drifting; 0.86 s the coastline emerges as the haze thins (atmospheric, not a dissolve). Must NOT: camera move; her head turn.
```
**图生视频运动 Motion · ZH**
```text
锁定，24 fps，真实速度。只有呼吸、风吹动刘海与辫梢、薄雾飘移；0.86 秒随着薄雾变淡，海岸线显现（大气变化，不是叠化）。不得：移动摄影机；她转头。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 1.542 | Single generation (f5653-f5690); request 2.0 s with a 0.25 s head (dissolve) and a 0.2 s tail. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：No location reference exists for the steamer deck at dawn (LOC_PIER covers the shed, pier and ship exterior only) - generate supplementary location ref XREF_STEAMER_DECK first: black hull #1C1C1E, white superstructure #D9D6CC, white-painted steel rail, invented funnel colours (ochre #B58B4A, slate band #4E6273) if seen (flagged). Dissolve in at f5647-f5659. Grade CT_MIG, grain 1.25, halation 0.6.

**连续性锚点 match_to**：T25 echo lock; dissolve-aligned to S075's eye (0.33,0.40). OUT: match cut to S077 (profiles to screen-right, light from screen-right) on the 237.0 accent.

**负面提示词（追加在全局负面之后）**
```text
sepia, yellow wash, broad smile, tears, the case in her left hand, light from screen-left, sun disc, modern ship details, readable ship name or text, real shipping-line colours, crowd faces, slow motion, camera movement
```

#### S077 · 03:57:02 – 04:00:00 · 2.917 s（f5690–f5760）

| 项目 | 内容 |
|---|---|
| 歌词 | 此刻的我 |
| 段落 / 简报章节 / 时代 / 场景 | OUTRO 尾声 / 十一 / 现代 / `night_window` |
| 景别 / 焦段 / 速度 | MS / 50 mm / 24 |
| 入点转场 | 匹配剪辑 0 帧 — 呼应链的相似构图：侧脸朝画右、光从画右来；剪点落在 237.0 重音上（跨时代回到现代） |
| 同步点 | 237.09 s 重音：切到现代两人；237.54 s “此刻”：他拧开保温壶；238.26 s “的”：茶续进她的杯子；238.97 s “我”尾音后：续进自己的杯子；239.6 s 两人望向画右 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_GUARD` `PROP_TEA` `PROP_COAT` `LOC_WINDOW` |
| 调色 | 黎明 |
| 生成时长 | 2.917 s |

**文生视频提示词 T2V · EN**
```text
Medium two-shot, 50mm anamorphic, very slow push, side-on at eye level, the museum bay window at first dawn, 24 fps. The window at screen-right is now the key light, cool about 6500K, sky #5B6F8A with a thin peach horizon line; a small 2700K corner reading lamp still glows. On the teak window bench, screen-right nearer the window: GUARD (~65-year-old East Asian night attendant, square-round face, gentle down-turned eyes, pale-brown age spot on his RIGHT cheekbone, salt-and-pepper hair, stooped, navy attendant jacket, reading glasses on a black cord). Screen-left: RESTORER (~28-year-old East Asian conservator, soft oval face, mole below her LEFT eye, loose low ponytail with more strands loose at the right temple, charcoal wool coat open). At 0.46 s he unscrews the scuffed navy cup-lid of his old dented dull-steel thermos; at 1.18 s he pours hot tea into her cup on the sill, then at 1.89 s into his own chipped cup - fresh steam rises, backlit against the dark window frame. She watches and says nothing. At 2.52 s both turn their faces to screen-right, out of the window, as the sky pales. Both cups are handle-less, pale bluish-white, with one cobalt line. Dawn grade: the light simply comes up, blue-grey toward soft peach, never orange; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中景双人，50mm 变形宽银幕镜头，极缓慢推进，侧面平视，黎明初现时的博物馆窗湾，24 fps。画右的窗此刻成为主光，约 6500K 的冷光，天色 #5B6F8A，地平线一线细细的桃色；角落那盏 2700K 小阅读灯还亮着。柚木窗凳上，画右靠窗：夜班工作人员（约 65 岁东亚男性，脸型方中带圆，眼角下垂、目光温和，右颧骨浅褐色老年斑，花白短发，背微驼，藏青值守夹克，老花镜挂在黑色挂绳上）。画左：修复师（约 28 岁东亚女性文物修复师，鹅蛋脸，左眼下小痣，松松的低马尾、右侧太阳穴的碎发多了些，深灰呢外套敞着）。0.46 秒，他拧开身边那只磕瘪的旧哑光不锈钢保温壶的藏青壶盖；1.18 秒先把热茶续进窗台上她的杯子，1.89 秒再续进自己那只带磕口的杯子——新的热气升起来，逆光衬着暗色窗框。她看着，什么也没说。2.52 秒两人一起把脸转向画右的窗外，天色渐淡。两只杯子都是无柄青白釉，口沿下一道钴蓝细线。黎明调色：光自然地亮起来，由蓝灰走向柔和的桃色，绝不变橙；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0 (match to S076's composition): RESTORER's eye at (0.33,0.40), profile turned slightly to screen-right; GUARD at (0.56,0.44) reaching for the dented dull-steel thermos (scuffed navy cup-lid) by his right hip; cups on the sill, hers at (0.70,0.60) and his at (0.75,0.60), no steam yet; window panes at screen-right 0.66-1.0 with pale sky; the lamp warm in the corner.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧（与 S076 构图匹配）：修复师的眼睛在 (0.33,0.40)，侧脸略朝画右；夜班工作人员在 (0.56,0.44)，伸手去拿右胯旁那只磕瘪的哑光不锈钢保温壶（藏青壶盖杯）；窗台上两只杯子，她的在 (0.70,0.60)、他的在 (0.75,0.60)，还没有热气；画右 0.66–1.0 是窗玻璃与淡淡的天；角落台灯暖光。
```
**末帧 / 匹配规格 End frame**
```text
t=2.92 s: both profiles to screen-right - hers at (0.33,0.40), his at (0.56,0.41) - fresh steam from both cups backlit against the dark muntins; the sky lighter. Dissolve source for S078 (the future viewer's profile at (0.33,0.40)).
```
**图生视频运动 Motion · EN**
```text
Push ~3% over 2.9 s, 24 fps, real time. 0.46 s cap unscrewed; 1.18 s pour into her cup (left), stops at 1.6 s; 1.89 s pour into his cup (right); 2.2 s cap back on; 2.52 s both heads turn to the window. Steam begins where the tea lands. Must NOT: spill; the cups slide on the sill; the sky jump in brightness.
```
**图生视频运动 Motion · ZH**
```text
约 3% 推进、历时 2.9 秒，24 fps，真实速度。0.46 秒拧开壶盖；1.18 秒倒进她的杯子（左），1.6 秒停；1.89 秒倒进他的杯子（右）；2.2 秒盖回壶盖；2.52 秒两人转头望向窗外。茶一落进杯里热气就升起。不得：洒茶；杯子在窗台上滑动；天空亮度跳变。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.917 | Single generation (f5690-f5760); request 3.4 s with 0.25 s handles. |

**分层与合成 Plates & compositing**

- **Plate A**：Main two-shot plate (single generation).
- **Plate B**：Optional steam element: two fresh plumes, window-backlit, on black, 24 fps, comped from the pour onward.
- **合成 / 速度 / 调色 / 同步（post）**：Cut on the 237.0 accent (f5690). Thermos = XREF_THERMOS as in S059/S062 (old, slightly dented, unbranded dull-steel vacuum flask with a scuffed navy cup-lid; not a bible prop, flagged). Dawn table at 238 s: sky P20 with a thin P21, window ~6500K key, warm share ~18%. 12-frame dissolve centred on f5760 into S078. Sync 237.54 (f5701) cap; 238.26 (f5718) her cup; 238.97 (f5735) his cup; 239.6 (f5750) heads turn.

**连续性锚点 match_to**：IN: T25 match from S076 (profile in the left third, light from screen-right). The refill motivates the steam of S079-S081 (F14). OUT: dissolve to S078 aligned on her profile (0.33,0.40).

**负面提示词（追加在全局负面之后）**
```text
branded thermos, cups with handles, spilling, steam against bright sky, sun, orange sky, talking, laughing, her pouring, cups filled in the wrong order, him on screen-left, gloves on her hands, coat buttoned, camera shake
```

#### S078 · 04:00:00 – 04:02:01 · 2.042 s（f5760–f5809）

| 项目 | 内容 |
|---|---|
| 歌词 | 都把未知 |
| 段落 / 简报章节 / 时代 / 场景 | OUTRO 尾声 / 十一 / 未来 / `museum_gallery` |
| 景别 / 焦段 / 速度 | MCU / 75 mm / 24 |
| 入点转场 | 叠化 12 帧 — 窗光驱动的叠化：两人望向窗外的侧脸 → 倒影中的侧脸（相似构图） |
| 同步点 | 240.36 s 器乐重音：倒影成形；240.8 s “都把未知” |
| 参考图 refs | `CHAR_FUTURE` `PROP_COAT` `LOC_GALLERY` |
| 调色 | 未来 |
| 生成时长 | 2.042 s |

**文生视频提示词 T2V · EN**
```text
Medium close-up, 75mm anamorphic, locked, a museum gallery of an unspecified future in the last minutes before dawn, 24 fps; lowest contrast, slightly high-key, silver-white with a trace of warmth, no sci-fi teal. We look at the thin clean glass of a vitrine holding a folded brownish-grey wool coat, soft beyond the glass. In the glass, forming at 0.36 s, is the reflection of FUTURE - a stranger of no clear age or gender, short soft dark hair, seamless pale warm-grey high-collared knit garment - seen in profile facing screen-right in the left third of frame, the face defocused and attenuated, never resolved: only the soft line of brow, nose and chin against the light. They look toward screen-right, where tall arched openings hold the same not-yet-dawn sky, blue-grey #5B6F8A with the faintest peach at the horizon - the only directional light, from screen-right. Nothing moves but breath. It is only a reflection; nobody real stands on our side of the glass. Almost no halation. Future grade: lowest contrast, slightly high-key silver-white with a trace of warmth, no sci-fi teal; very fine grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
中近景，75mm 变形宽银幕镜头，锁定，一个不确定的未来里的博物馆展厅，黎明前最后几分钟，24 fps；反差最低、略高调，银白里带一丝暖，不用科幻青色。我们看着一只展柜薄而干净的玻璃，玻璃后虚焦的是一件叠好的偏褐灰呢外套。0.36 秒，玻璃里浮现未来观看者的倒影——一个看不出年龄与性别的陌生人，短而柔软的深色头发，浅暖灰无缝高领针织长衣——在画面左三分之一处侧脸朝向画右，脸处于焦外并被反射衰减，永远看不清：只有逆光里额、鼻、下巴柔和的轮廓线。他/她望向画右，那里高高的拱形开口里，是同样将亮未亮的天，蓝灰 #5B6F8A，地平线一丝极淡的桃色——这是唯一有方向的光，来自画右。除了呼吸，什么都不动。这只是倒影；玻璃靠我们这一侧没有任何真实的人。几乎没有光晕。未来调色：反差最低、略高调，银白里带一丝暖，不用科幻青色；极细颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0 (dissolve B frame): the glass plane, the coat soft beyond at lower right; the reflection just beginning to form in the left third, its eye point at (0.33,0.40) as in S077, the face never resolved; pale window light from screen-right.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧（叠化的 B 帧）：玻璃平面，外套在画右下方的玻璃后虚焦；倒影刚刚在左三分之一处开始浮现，眼睛的位置在 (0.33,0.40)，与 S077 一致，脸始终看不清；淡淡的窗光来自画右。
```
**末帧 / 匹配规格 End frame**
```text
t=2.04 s: the reflected profile's eye at (0.33,0.40) facing screen-right, soft and attenuated (~30%), window light on the profile edge; dissolve source for S079.
```
**图生视频运动 Motion · EN**
```text
Locked, 24 fps. 0-0.36 s the reflection forms as the light on the viewer rises, then holds; only breathing. Must NOT: the face resolve; the camera move.
```
**图生视频运动 Motion · ZH**
```text
锁定，24 fps。0–0.36 秒随着观看者身上的光变亮，倒影浮现，随后保持；只有呼吸。不得：脸变清晰；摄影机移动。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 2.042 | Single generation (f5760-f5809); request 2.5 s with 0.25 s handles (dissolves at both ends). |

**分层与合成 Plates & compositing**

- **Plate A**：Future vitrine glass plate (side angle), the folded aged coat beyond, high-key.
- **Plate B**：Reflection plate: FUTURE in profile facing screen-right, side/back-lit from the right by pre-dawn sky, rendered as a true mirror image, defocused.
- **合成 / 速度 / 调色 / 同步（post）**：Composite B at ~30% screen in mirror depth, face contrast below ~15%. Dissolve in: 12 frames centred on f5760 (from S077's profiles); dissolve out: 16 frames f5801-f5817 into S079. The bible gives the gallery no window of its own - the pre-dawn light is motivated by the arched doorways to the glazed corridor / the east end at screen-right (flagged). Grade CT_FUTURE, grain 0.7, halation 0.15.

**连续性锚点 match_to**：T25 echo lock (profile in the left third, light from the right). IN: dissolve from S077 (her profile at (0.33,0.40)). OUT: dissolve to S079 (window light to window light).

**负面提示词（追加在全局负面之后）**
```text
sharp face, identifiable features, devices, sci-fi architecture, holograms, screens, text, a real person outside the reflection, strong reflection, ghost body in the room, sun, orange sky, teal, high contrast, camera movement
```

#### S079 · 04:02:01 – 04:06:01 · 4.000 s（f5809–f5905）

| 项目 | 内容 |
|---|---|
| 歌词 | 叫作明天 |
| 段落 / 简报章节 / 时代 / 场景 | OUTRO 尾声 / 十一 / 现代 / `night_window` |
| 景别 / 焦段 / 速度 | WS / 32 mm / 24 |
| 入点转场 | 叠化 16 帧 — 光线驱动的叠化（5801–5817，完成于“叫”）：未来窗外将亮未亮的天 → 当下窗外的天（同一方位；跨时代回到当下） |
| 同步点 | 242.36 s “叫”：叠化完成；243.56 s “明天”：天色开始转暖；245.9 s 尾奏涌起 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_GUARD` `PROP_TEA` `PROP_COAT` `LOC_WINDOW` |
| 调色 | 黎明 |
| 生成时长 | 4.0 s |

**文生视频提示词 T2V · EN**
```text
Wide shot, 32mm anamorphic, from behind two people at eye level, a slow dolly pull-back of about 0.8 m over 4 s, the museum's three-sided bay window at daybreak, 24 fps, deep focus. On the teak window bench, seen from behind as near-silhouettes that keep their shadow detail: at screen-left RESTORER (~28-year-old East Asian conservator, charcoal wool coat, loose low ponytail with strands escaping at the right temple) and at screen-right, nearer the south-east pane, GUARD (~65-year-old East Asian night attendant, stooped upper back, navy attendant jacket, salt-and-pepper hair, reading-glasses cord at his neck), about 40 cm apart and still. Two small cups on the sill before them with thin steam. Beyond the old wavy glass: the harbour mouth, a breakwater light, and three or four lamps still lit on the sea (#E2A458). The deep blue gives way to soft morning light: the sky #5B6F8A warms toward a thin peach horizon #EBB894 from 1.5 s; daylight of about 5000K comes from the south-east pane at screen-right while the north-east pane at screen-left stays darker. The sun stays below the horizon. As the camera draws back, white-painted window frames and the edges of the bay enter. Dawn grade: the light simply comes up, blue-grey toward soft peach, never orange; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
全景，32mm 变形宽银幕镜头，在两人身后平视，轨道车 4 秒内缓慢后拉约 0.8 米，拂晓时博物馆的三面窗湾，24 fps，深焦。柚木窗凳上，两人从背后看几乎是剪影，但暗部仍有层次：画左是修复师（约 28 岁东亚女性文物修复师，深灰呢外套，松松的低马尾、右侧太阳穴散出几缕碎发），画右靠东南窗是夜班工作人员（约 65 岁东亚男性，上背微驼，藏青值守夹克，花白短发，脖子上挂着老花镜的挂绳），相距约 40 厘米，一动不动。他们面前的窗台上两只小杯子，冒着细细的热气。老式波纹玻璃外：港口出海口，一盏防波堤灯，海面上还有三四盏没熄的灯（#E2A458）。深蓝渐渐变成柔和的晨光：1.5 秒起天色从 #5B6F8A 暖向一线细细的桃色地平线 #EBB894；约 5000K 的天光从画右的东南窗来，画左的东北窗仍较暗。太阳始终在地平线下。随着摄影机后拉，白漆窗框与窗湾的边缘进入画面。黎明调色：光自然地亮起来，由蓝灰走向柔和的桃色，绝不变橙；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0 (dissolve B frame): two backs at (0.42,0.58) and (0.58,0.57), heads just below the horizon line y~0.50; three panes - NE darker (0.0-0.30), E (0.30-0.70), SE brightening (0.70-1.0); three or four warm sea lamps across (0.40-0.75, 0.52); cups and thin steam on the sill at (0.50,0.62).
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧（叠化的 B 帧）：两个背影在 (0.42,0.58) 与 (0.58,0.57)，头部略低于 y≈0.50 的地平线；三面窗——东北窗较暗（0.0–0.30）、东窗（0.30–0.70）、东南窗渐亮（0.70–1.0）；海面上三四盏暖灯分布在 (0.40–0.75, 0.52)；窗台上的杯子与细细的热气在 (0.50,0.62)。
```
**末帧 / 匹配规格 End frame**
```text
t=4.0 s: about 12% wider; window frames and the bay's edges at both sides; the peach horizon line stronger; sea lamps still lit; figures unchanged.
```
**图生视频运动 Motion · EN**
```text
Dolly pull-back ~0.8 m over 4 s (12-frame ease-in), 24 fps, no pan or tilt. Figures still, breathing only. The sky warms gradually from 1.52 s; sea lamps twinkle softly; steam drifts up. Must NOT: the lamps go out; the sun appear; the figures turn.
```
**图生视频运动 Motion · ZH**
```text
轨道车 4 秒内后拉约 0.8 米（12 帧缓入），24 fps，不摇不俯仰。人物静止，只有呼吸。1.52 秒起天空逐渐变暖；海面灯点轻轻闪烁；热气缓缓上升。不得：灯熄灭；太阳出现；人物转身。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 4.0 | Single generation (f5809-f5905); request 4.5 s with a 0.35 s head (dissolve overlap) and 0.2 s tail. |

**分层与合成 Plates & compositing**

- 单次生成，无分层。
- **合成 / 速度 / 调色 / 同步（post）**：16-frame dissolve f5801-f5817 from S078 (window light to window light), complete on '叫' 242.36. Dawn table at 242 s: sky P20 -> P21, window ~5000K, warm share ~30%. Silhouettes keep detail above P28 #0A0F17. Tail swell begins 245.9 (f5902); cut to S080 at f5905.

**连续性锚点 match_to**：Bay seen from behind = S066's E-pane geometry (she left, he right). The still-lit sea lamps continue into S080 and S081.

**负面提示词（追加在全局负面之后）**
```text
sun disc, orange sky, streak flares, the sea lamps switched off, figures moving or turning, faces visible, him on screen-left, crushed black silhouettes, fog, camera shake, unrealistic bird flocks, text
```

### 尾奏 TAIL

#### S080 · 04:06:01 – 04:09:07 · 3.250 s（f5905–f5983）

| 项目 | 内容 |
|---|---|
| 歌词 | 叫作明天 |
| 段落 / 简报章节 / 时代 / 场景 | TAIL 尾奏 / 十一 / 现代 / `harbor_eras` |
| 景别 / 焦段 / 速度 | EWS / 40 mm / 24 |
| 入点转场 | 切 0 帧 — 尾奏涌起（246.0，全曲最响的一段）时切到外景 |
| 同步点 | 246.06 s 尾奏涌起（245.9–249.3 全曲最响）：切入；248.1 s 第一层天光掠过码头与空着的位置 |
| 参考图 refs | `LOC_HARBOR` |
| 调色 | 黎明 |
| 生成时长 | 3.25 s |

**文生视频提示词 T2V · EN**
```text
Extreme wide shot, 40mm anamorphic, completely locked at 1.6 m on a harbour quay road looking east along the waterfront - the same camera as the film's harbour-across-eras frame - present day at dawn, 24 fps. Frame-left: the old customs house, now the museum - granite base, red brick partly lime-washed, a glazed upper arcaded verandah - and far along its upper floor at the east end, a bay window still holding one small warm light. At x 0.38 the gate with its granite threshold and iron edge strip (edge at frame height 0.66); the waiting spot before it at (0.38,0.70) stands empty. Frame-right: calm harbour water, a moored ferry, distant container cranes with tiny defocused warm obstruction lights, and three or four fishing lamps still lit on the sea (#E2A458). A few 4000K LED street lamps still on along the quay. The sun is below the horizon: only a thin peach line #EBB894 deep in frame right of centre, sky #5B6F8A. No flag on the bare flagpole. At 2.06 s a soft band of brighter skylight slides across the water and the quay and lights the empty waiting spot. No people. Dawn grade: the light simply comes up, blue-grey toward soft peach, never orange; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
大远景，40mm 变形宽银幕镜头，在码头路上 1.6 米高完全锁定，沿水岸向东看——与片中“港口时代更替”同一个机位——今天的黎明，24 fps。画左：旧海关大楼，如今是博物馆——花岗岩基座，红砖墙局部石灰抹面，二层封闭的拱券外廊——沿着它的二层一直到东端，那扇窗湾里还亮着一点小小的暖灯。画面 x 0.38 处是关口大门，花岗岩门槛外缘包着铁条（边线在画面高度 0.66）；门槛前那个等待者的位置 (0.38,0.70) 空着。画右：平静的港湾水面，一艘停泊的渡轮，远处集装箱起重机上极小、虚焦的暖色障碍灯，海面上三四盏渔灯还亮着（#E2A458）。码头沿线几盏 4000K LED 路灯还没关。太阳在海平线下：只有画面深处中偏右一线细细的桃色 #EBB894，天色 #5B6F8A。旗杆光秃秃的，没有旗。2.06 秒，一层更亮的天光柔和地掠过水面与码头，照亮那个空着的等待位置。没有人。黎明调色：光自然地亮起来，由蓝灰走向柔和的桃色，绝不变橙；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0: identical composition to S046's E1-E4 slices (same motion-control / tripod data): the building frame-left, the gate and threshold at x 0.38, threshold edge at y 0.66, the waiting spot (0.38,0.70) empty; water and ships frame-right; the bare flagpole on the corner roof; the dawn peach line at (0.62-0.85, 0.47); the lit bay window as a tiny warm point far along the upper floor at (0.30,0.38).
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧：与 S046 中 E1–E4 各时代切片完全相同的构图（同一运动控制 / 三脚架数据）：大楼在画左，大门与门槛在 x 0.38，门槛边线在 y 0.66，等待位置 (0.38,0.70) 空着；画右是水面与船；转角屋顶上光秃的旗杆；黎明的桃色线在 (0.62–0.85, 0.47)；二层远处那扇亮着的窗湾是 (0.30,0.38) 处一个极小的暖点。
```
**末帧 / 匹配规格 End frame**
```text
t=3.25 s: the skylight band has passed; the empty waiting spot softly lit; the sea lamps still on; light-continuity source for the dissolve into S081.
```
**图生视频运动 Motion · EN**
```text
Locked, 24 fps. Only nature moves: water shimmer, a faint twinkle in the lamps, one gull crossing high right at ~1.0 s (optional), the skylight band sweeping right to left 2.06-2.9 s as a cloud edge thins on the horizon (no hard cloud-shadow wipe). Must NOT: camera move; eras change; any morph.
```
**图生视频运动 Motion · ZH**
```text
锁定，24 fps。只有自然在动：水面微光、灯点轻轻闪烁、约 1.0 秒时一只海鸥从画右高处飞过（可选）、2.06–2.9 秒地平线上一道云边变薄，天光由右向左掠过（不做生硬的云影擦除）。不得：移动摄影机；时代变化；任何变形。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 3.25 | Single generation (f5905-f5983); request 3.6 s with a 0.2 s head and a 0.25 s tail (12-frame dissolve into S081 centred on f5983). |

**分层与合成 Plates & compositing**

- **Plate A**：Locked E5 dawn plate on the S046 harbour camera data (40mm, 1.6 m, looking east).
- **Plate B**：Optional sky/horizon element with a luma matte for a controlled warm ramp and the 2.06 s skylight band, applied in the grade.
- **合成 / 速度 / 调色 / 同步（post）**：Same camera data as S046. The harbour's 'unified dusk light from behind camera' lock is deliberately not used here: dawn comes from ahead-right. Cut in on the tail swell at 246.0 (f5905); warm share ~35-40%; the sun never in frame (bible 2.3). Invented-flag rule satisfied by an empty flagpole (E5 = no flag). Dissolve 12 frames centred on f5983 into S081.

**连续性锚点 match_to**：Mirrors S046 (BR1 harbour eras; the waiting spot (0.38,0.70)). The lit bay window plants S081's location. OUT: light-continuity dissolve to S081.

**负面提示词（追加在全局负面之后）**
```text
sun disc, flags or banners, readable signs, logos on cranes or the ferry, real landmarks, people at the threshold, cars, traffic signals with text, morphing, camera movement, drone feel, oversaturated sunrise, sea lamps off, HDR look
```

#### S081 · 04:09:07 – 04:16:20 · 7.542 s（f5983–f6164）

| 项目 | 内容 |
|---|---|
| 歌词 | —（无演唱） |
| 段落 / 简报章节 / 时代 / 场景 | TAIL 尾奏 / 十一 / 现代 / `night_window` |
| 景别 / 焦段 / 速度 | CU / 75 mm / 24 |
| 入点转场 | 叠化 12 帧 — 同一束晨光由港口外景过渡到窗台（光线接续） |
| 同步点 | 249.3 s 尾奏安静段：画面锁定；252.55 s 最后一个和弦：晨光照进热气；256.0 s 尾音几近消失，画面仍保持；256.8 s 声音消散，自然结束 |
| 参考图 refs | `CHAR_RESTORER` `CHAR_GUARD` `PROP_TEA` `LOC_WINDOW` |
| 调色 | 黎明 |
| 生成时长 | 7.542 s |

**文生视频提示词 T2V · EN**
```text
Close-up, 75mm anamorphic, locked on a tripod with no digital push, at sill height about 30 degrees to the glass, the museum bay window in early morning, 24 fps (steam may be captured at 48 fps). Two handle-less porcelain cups, pale bluish-white glaze, each ringed by one thin complete cobalt line 6 mm below the rim, stand on a deep white-painted sill about 6 cm apart: his, with a tiny chip at 2 o'clock on the rim, at screen-right nearer the window; hers, new, at screen-left. Freshly poured jasmine tea, an unfurled leaf in each. Slow steam rises, backlit by window light against a dark window muntin and the still-dim north-east pane. At screen-right the south-east pane glows with soft 4300K morning light, peach to cream. In the old wavy glass at screen-left, through which the dawn harbour and three or four still-lit lamps on the sea show, float the soft reflections of two people sitting side by side - the stooped night attendant at right, the young conservator with a low ponytail at left, faces unresolved. At 3.26 s, with the final chord, a ray of morning light slips into the steam. Then only the steam moves, to the end. Dawn grade: the light simply comes up, blue-grey toward soft peach, never orange; fine 35mm grain, 2.39:1, no text.
```
**文生视频提示词 T2V · ZH**
```text
近景，75mm 变形宽银幕镜头，三脚架完全锁定，不做任何数字推进，窗台高度、与窗玻璃约成 30°，清晨的博物馆窗湾，24 fps（热气可用 48 fps 拍摄）。两只无柄瓷茶杯，青白釉，杯口下 6 毫米各一道完整的钴蓝细线，并排放在深深的白漆木窗台上，相距约 6 厘米：他那只口沿 2 点钟位置有个小磕口，在画右、靠窗；她那只是新的，在画左。刚续上的茉莉花茶，各漂着一片舒展的茶叶。热气缓缓升起，被窗光逆光照亮，衬着一根暗色窗棂与仍然发暗的东北窗。画右的东南窗亮着柔和的晨光，约 4300K，由桃色到奶白。画左那块老式波纹玻璃里，透出黎明的港口和海面上三四盏还没熄的灯，也浮着并肩而坐的两个人柔和的倒影——背微驼的夜班工作人员在右、低马尾的年轻修复师在左，脸看不清。3.26 秒，随着最后一个和弦，一缕晨光溜进热气里。此后除了热气，什么都不动，一直到最后。黎明调色：光自然地亮起来，由蓝灰走向柔和的桃色，绝不变橙；细腻 35mm 颗粒，2.39:1，无任何文字。
```
**首帧关键帧 Keyframe · EN**
```text
Frame 0 (dissolve B frame): her cup at (0.38,0.63), his at (0.64,0.63), each ~32% of frame height; cobalt lines level; the chip at 2 o'clock on his rim visible; the SE pane glowing at upper right (0.78-1.0, 0.10-0.55); a dark muntin behind the two steam columns; the NE pane at upper left with faint reflections of two seated people - she at (0.18,0.30), he at (0.30,0.30) - and the through-glass harbour lamps at (0.10-0.35, 0.42); the sill edge across y 0.80.
```
**首帧关键帧 Keyframe · ZH**
```text
第 0 帧（叠化的 B 帧）：她的杯子在 (0.38,0.63)，他的在 (0.64,0.63)，各约占画面高 32%；两道钴蓝线水平；他杯口 2 点钟的磕口可见；画右上方的东南窗发亮（0.78–1.0, 0.10–0.55）；两柱热气后面是一根暗色窗棂；画左上方的东北窗里淡淡映着两个坐着的人——她在 (0.18,0.30)、他在 (0.30,0.30)——透过玻璃可见港口灯点 (0.10–0.35, 0.42)；窗台边沿横在 y 0.80。
```
**末帧 / 匹配规格 End frame**
```text
t=7.54 s (f6163): identical to frame 0 except the light - warmer (warm share ~45%, never above 50%), the steam lit through by the morning ray; the picture ends naturally on the last frame.
```
**图生视频运动 Motion · EN**
```text
Camera absolutely locked, no push, 24 fps. Steam rises slowly and continuously from both cups (two independent plumes, gentle curls, never thick). Light: a smooth grade-driven warm ramp across the whole 7.54 s; at 3.26 s (252.55, final chord) a soft ray from screen-right enters the steam and stays. Must NOT move: cups, sill, window, reflections (a barely perceptible breath in the reflected figures at most), sea lamps (a faint twinkle only).
```
**图生视频运动 Motion · ZH**
```text
摄影机绝对锁定，不推进，24 fps。两只杯子的热气缓慢、连续地上升（两股各自独立的热气，轻柔卷曲，绝不浓厚）。光：整整 7.54 秒由调色驱动的平滑变暖；3.26 秒（252.55，最后一个和弦）一缕柔和的光从画右进入热气并停留。不得移动：杯子、窗台、窗、倒影（倒影中的人最多只有几乎察觉不到的呼吸）、海面灯点（只许极轻微的闪烁）。
```
**生成分段 Segments**

| t0 (s) | t1 (s) | 说明 |
|---|---|---|
| 0.0 | 7.542 | Preferred: plate A as a locked still (or a near-still I2V with zero drift) for the full duration plus steam elements B - no generative drift allowed on a locked frame. If generated as video: Seg 1 0-4.0 s and Seg 2 3.5-7.54 s from the same still, joined by a 12-frame crossfade at 3.6-4.1 s where only steam moves; 0.25 s head for the incoming dissolve. |

**分层与合成 Plates & compositing**

- **Plate A**：Locked still of cups, sill, window bay: two cups as specified, SE pane bright, NE pane dim with wavy old glass, through-glass dawn harbour with 3-4 lit sea lamps.
- **Plate B**：Steam elements: two independent slow plumes backlit by 4300K window light on black, 24 fps (or 48 fps slowed 50%), screen-comped above each cup.
- **Plate C**：Reflection element: two people seated side by side (GUARD at right, RESTORER at left as in S063, faces unresolved), soft, mapped into the NE pane at ~15-20% with the wavy-glass distortion.
- **Plate D**：Light-ray matte: a soft volumetric mask confined to the steam for the 3.26 s warm lift (no haze outside the steam).
- **合成 / 速度 / 调色 / 同步（post）**：12-frame dissolve centred on f5983 from S080 (same morning light). Grade CT_DAWN: from 249.3 (the soft tail) sky P21 -> P22, P22 highlights on the cup rims, warm share 40% -> 45% by f6163 (never above 50%); the 3.26 s ray is a luma-masked warm lift inside the steam only. Steam backlit against the dark muntin, never against the brightest sky (bible 3.4). Stabilise to zero motion (T26). The skeleton says the harbour and lamps are 'reflected' in the NE pane - physically they are seen through it, with the two people's reflection superimposed (flagged). No fade inside the shot: the picture holds to f6163; any fade is an editorial call after the sound has decayed (256.8). No titles in picture.

**连续性锚点 match_to**：Cup arrangement from S063 (his screen-right, hers screen-left, ~6 cm, his chip at 2 o'clock); reflected pair as in S063; the still-lit sea lamps continue from S079/S080 (brief chapter 11). Final frame of the film (T26).

**负面提示词（追加在全局负面之后）**
```text
camera movement, zoom, digital push, flicker, steam against bright sky, thick steam or smoke, cups with handles, logos, text, extra cups, cups touching, a chip on her cup, hands in frame, sun disc, orange wash, warm share over 50%, sea lamps off, sharp faces in the reflection, fade to black before the end, running condensation
```

## 7. QA 修订记录与待导演确认事项

### 7.1 本轮 QA 统一（已直接改入 shots.json 与本包）

1. **调色词统一**：81 条 prompt_en/prompt_zh 的结尾改为圣经 looks[] 的分时代调色描述（见 §4.2）；生成提示词中删去内部 LUT 编号 CT_*（只保留在 post 合成说明里，给调色师用）；所有 T2V 提示词补齐“2.39:1”与“no text / 无任何文字”；S042–S060 关键帧里的 LUT 编号同样改为文字。
2. **手套措辞**：统一为圣经的 “thin warm-white cotton (conservator) gloves / 略暖白的薄棉（修复）手套”（避免生成荧光白），CHAR_RESTORER 参考图提示词同步。
3. **航海人夜间外衣**（g2/g3/g4 冲突）：g2 的 S022 穿棕色夹棉外衣、g4 的 S067 把它披给同伴，而 g3 的 S045 写成“本镜不穿外衣”。已改为 S045 与 S066-P1 都穿外衣（PROP_OUTERCOAT 补入 refs），S075 无外衣。
4. **保温壶**（g3/g4 两种写法）：合并为一个外观 XREF_THERMOS——略有磕瘪、无品牌的哑光不锈钢保温壶，磨旧的藏青壶盖杯（S059、S062、S077）。
5. **老花镜与手机交接**（g3→g4）：S060 末尾老花镜落回黑色挂绳、手机扣在**右大腿**上，与 g4 从 S062 起的锁定一致（S065 两人之间没有任何玻璃）。
6. **雨碗位置与纹样**（g2/g3/g4）：S019、S041、S042、S066-P2 统一为“檐下石阶外沿、滴水线下”（否则接不到雨，圣经 §7.5）；S041 按 S019 同机位登记（月光 (0.80,0.14)、门 x 0.08–0.26、壁龛 (0.04,0.46)、碗 (0.28,0.80)）；g3 的 “plum sprays” 改为圣经唯一纹样“一枝连绵的折枝梅”。
7. **呼应链登记**：S077/S078 的眼睛点由 (0.33,0.43) 改为 (0.33,0.40)，使 S075→S076→S077→S078 落在同一点（±3% 容差）。
8. **匹配剪辑双向一致**：逐对核对 A 末帧与 B 首帧（§4.3）；S034→S035 改为登记 (0.52,0.56)/(0.54,0.58)；S019→S020 两边都写明为“区域呼应、非 ±3% 登记”；S078 首帧写明眼睛点。
9. **只写名字的地方补齐锁定特征**：S024 修复师倒影、S066 尽头两人、S081 倒影中的两人、S002 远处夜班工作人员；S014 补左袖口磨损（左臂入画）；S035/S075 关键帧补“左腕银镯”“左眉尾旧疤”；S001 写明玻璃后是罗盘。
10. **镜像规则 MP-1**：四位作者都按“画面所见”合成并各自标注待定；现以同一句 MP-1 写入所有反射镜头的 post（§4.1）。
11. **补充参考**：圣经未登记的送行者的手、盖章办事员的手、孩子的脚、保温壶、轮船甲板场景，统一命名为 XREF_*，在相关镜头 post 中点名，参考图提示词见 §5.4。
12. **refs 完整性**：S045、S066 加 PROP_OUTERCOAT，S066 加 PROP_COAT，S053 加 PROP_LETTER；每镜 refs 按 CHAR → PROP → LOC、圣经顺序排列，且包含分镜骨架的全部 refs。
13. **伪字风险**：S006 运动提示词去掉方位汉字（辰、巽、巳、丙、午），改为方位描述；罗盘刻字、信、登记簿一律柔焦不可读或由书法顾问贴图（post 已写）。S002/S011 写明镜头类型。
14. **长度**：17 条 prompt_en 超过 220 词，只删冗余措辞、不删任何锁定项，全部回到 177–220 词；中文同步修改，保持同义。

### 7.2 待导演确认（各组作者提出、QA 已在提示词中给出临时处理）

| 类别 | 内容 |
|---|---|
| 镜像规则 | MP-1（画面所见合成）与圣经 §8.3-4 字面写法不同，需导演签字（S001–S003、S017、S024–S026、S041、S066）。 |
| 圣经待同步 | 蜡烛状态表：S016 用 B（圣经 C 从 65.8 s 起），A 从未出现；T09/M2 仍写 G3b 展柜，分镜 V22 改为修复室拱窗；PROP_COAT 未来状态（分镜为折叠，圣经为平铺）；T24（袖口磨损微距 → 当下同一袖口）未进分镜，S072 用手势呼应代替；S070 叠化居中于剪点；需补登 XREF_*（§5.4）与守夜外衣在 S022 的使用。 |
| 物理/地理 cheat（已写进提示词，需认可） | S018 月亮在机位身后，改到画右上，且 2.92 s 的升降偏快；S023–S026 02:10 月高约 60°，月光到不了北墙展柜、玻璃里也映不到月亮；S027 西端看门洞只有 4–8° 掠射角；S057 彩窗在长椅远端，用前景板 cheat；S058 光从她身后来，前方只放远处烛点；S061 焦点不能穿过灯箱彩窗，改为越过展柜北缘看窗湾；S078 未来展厅没有窗，用通向长廊的拱门光；S081 港口是透过东北窗看见的，不是反射。 |
| 时间偏紧 | S011 翻袖只有 6 帧；S016 1.75 s 内的升起（已减为约 35 cm）；S031 只拍最后一折与两次按压；S033 不合箱盖；S046 E3（迁徙女性）只有 10 帧，建议重分切点；S063 0.77 s 内放杯、放手套、坐下；S067 全镜 48 fps 放不下三个动作，改为 48→24 升降格；S069 只拍最后一步；S066 需约 1.43 m/s（骨架写 1.3）。 |
| 连续性空白 | S014→S015 胶未干就翻看圈足（或改看散片）；S028–S030 打开的 G3c 柜门须在 S040 前关上；S064 他把杯子捧到膝上，S072 杯子回到窗台未交代；S065→S072 故事时间跳到约 05:40（茶凉、无热气，S077 续茶才有黎明热气）；S019 与 S026 同一只碗出现在两处（视为不同夜晚）；S034 糖包交接（圣经写在家里，分镜在码头）；S035 壁龛在门外墙上，只能透过门看见；S036–S039 假定一道齐腰栏杆贯穿长凳与盖章窗口；S056 孤单者在前一排、S069 她沿自己这一排走过去，两处需统一；S060 手机光在 190.6 s 熄灭，她 191.88 s 才抬眼，只看见暗下来的背影。 |
| 机位与站位 | S062–S065、S072–S074、S077 用 BAY_3Q 三分之四机位（纯侧拍两人会前后重叠）；S064 她的左手放在窗台而不是长凳；S028/S029 同轴不同景别（不是正反打）；S004/S005 机位垂直于倾斜 10° 的卡板而非真正 90° 俯拍；S015/S016 改为 15° 斜俯以露出外口沿纹带；S001/S002 航海人的手放大约 8% 才能从手套四周露出。 |
| 匹配剪辑的性质 | S021→S022 由海岸线形状改为“点”匹配（地图海陆方向与 S022 相反）；S067→S068、S071→S072 的“动作中段剪”实际是方向/手势呼应（A 镜结束在静止的手）；S069→S070 衣袖约 15% 画高、袖口 30%，只做位置匹配。 |
| 文字类道具 | 罗盘二十四向（S003、S006、S009）、信、登记簿：需书法顾问书写或实拍贴图，AI 生成一律柔焦不可读；S051 墨色按圣经为褪色的黑，不是褐黑；S051/S052/S054 用薄纸透字解决正反面同框。 |
| 其他 | S039 “掌心向前”解释为年长者右手手背朝镜头；S050 “抬眼”是向内的、不看门；S044 墨线不被手掌抹花（推进使线下移到 y≈0.84），小船画在沙滩上；S076 缺少轮船甲板场景参考（XREF_STEAMER_DECK）。 |

### 7.3 校验结果

- `python3 shotlist/validate.py shotlist/shots.json`：退出码 0，`OK — skeleton is valid.`（Shots: 81   Total: 6164 frames = 256.833s   (contract 6164 frames)）
- shots.json：81 个镜头，id 与 in/out 帧与 skeleton.json 完全一致，所有骨架字段原样保留；新增字段 prompt_en、prompt_zh、negative、gen。
- prompt_en 词数 177–220（要求 120–220）；每条都含“2.39:1”与“no text”，中文都含“无任何文字”；生成提示词中无 CT_* 编号。
- gen.duration_s 与骨架帧长一致；gen.refs 均为圣经 id，且包含骨架 refs；分段覆盖 0–时长。

