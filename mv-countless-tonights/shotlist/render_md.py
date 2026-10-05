#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Render shotlist/skeleton.json → shotlist/skeleton.md (readable Chinese table).
Usage: python3 shotlist/render_md.py [in.json] [out.md]"""
import json, os, sys
from collections import Counter, OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'skeleton.json')
DST = sys.argv[2] if len(sys.argv) > 2 else os.path.join(HERE, 'skeleton.md')
shots = json.load(open(SRC, encoding='utf-8'))
T = json.load(open(os.path.join(ROOT, 'timing', 'timing.json'), encoding='utf-8'))
FPS = T['fps']

SEC_ZH = {'INTRO': '前奏', 'V1': '主歌一', 'GAP1': '过门', 'PRE1': '预副歌', 'CH1': '副歌一',
          'INTERLUDE': '间奏', 'V2': '主歌二', 'CH2': '副歌二', 'BR1': '桥段一', 'BR2': '桥段二',
          'CH3': '副歌三', 'CH4': '副歌四', 'OUTRO': '尾声', 'TAIL': '尾奏'}
TR_ZH = {'cut': '切', 'match_cut': '匹配剪辑', 'dissolve': '叠化', 'reflection': '反射转场',
         'light': '光线转场', 'fade_in': '淡入'}
ERA_ZH = {'modern': '现代', 'navigator': '航海人', 'home': '旧日家中', 'migrant': '迁徙',
          'maphand': '地图之手', 'chapel': '礼拜堂', 'future': '未来', 'multi': '多时代'}

def tc(f):
    s, ff = divmod(f, FPS); m, s = divmod(s, 60)
    return f'{m:02d}:{s:02d}:{ff:02d}'

def esc(x):
    return str(x).replace('|', '｜').replace('\n', ' ')

durs = [s['out_frame'] - s['in_frame'] for s in shots]
L = []
L.append('# 《无数个今晚》分镜骨架（剪辑结构）')
L.append('')
L.append(f'> 由 `shotlist/skeleton.json` 生成（`python3 shotlist/render_md.py`）。24 fps，共 {shots[-1]["out_frame"]} 帧 '
         f'（{shots[-1]["out_frame"] / FPS:.3f} 秒，歌曲 {T["duration"]} 秒），歌曲完整不剪。时码格式 分:秒:帧，入点含、出点不含。')
L.append(f'> 镜头数 **{len(shots)}**，平均 **{sum(durs) / len(durs) / FPS:.2f} 秒**，'
         f'最短 {min(durs) / FPS:.2f} 秒，最长 {max(durs) / FPS:.2f} 秒。画面内不出现任何文字，片名/字幕/演职员后期统一添加。')
L.append('> **修订版 v2**：已按三位评审（叙事忠实度 / 剪辑与音乐 / 摄影与连续性）的意见完成修订，逐条处理见 `shotlist/revision_log.md`。每个镜头的 `refs` 字段列出圣经 `CHAR_/PROP_/LOC_` 参考 id，`revision.findings` 列出该镜头所对应的评审意见编号。')
L.append('> 本稿锁定剪辑结构、歌词对位与镜头意图；AI 生成提示词与参考图在下一轮补全。')
L.append('')
L.append('## 段落概览')
L.append('')
L.append('| 段落 | 时间（秒） | 镜头 | 平均时长 | 本段任务 |')
L.append('|---|---|---|---|---|')
TASK = {
    'INTRO': '玻璃两侧的两只手；反射中的船灯；只剩罗盘——这件东西属于谁？',
    'V1': '海图匹配剪辑进入航海人时代；舱内→大海；针认得南，人不认得岸；袖口补丁',
    'GAP1': '手指停在补丁上（乐句呼吸）',
    'PRE1': '对齐青花残片→同纹样的碗→凉饭、空椅、一夜未眠',
    'CH1': '尺度第一次打开（远→近）；三联柜横移；认不出脸，认得手；长廊与空长凳首次建立',
    'INTERLUDE': '展厅 G3c 前：夜班工作人员的点头与她匆忙的回应（第八章伏笔）；柜内的藤箱与旧衫',
    'V2': '迁徙：叠衣、回望、木梳、甜与笑与灯、握手、印章、松手→修复师的手',
    'CH2': '重复中递进：孩子的小脚、信里的布片、先摸补丁再望岸灯',
    'BR1': '固定机位的港口时代更替→墨线→门槛→攥紧的手；修复师读信，读到没说完的喜欢',
    'BR2': '彩窗下的母亲与颤抖的双肩→他弯着的背；P4 彩窗残片前她终于注意到他、摘手套；热茶、坐到他身旁、手与杯、无玻璃的点头',
    'CH3': '月光长廊 8.5 秒长镜头：五面时代之窗 + 无数焦外灯点，雨终于落下；随后在乐队涌起处的三个小小善意',
    'CH4': '善意的后两个（递糖、落座）；衣袖→未来展柜里的外套（与开场同机位）；电话拨出、骤停、眉眼舒展',
    'OUTRO': '相似构图呼应：那时的你（航海人转向画右、迁徙女性）/此刻的我（他续茶）/后来的人；天亮，远灯未熄',
    'TAIL': '同一港口机位的黎明（日出前、远灯未熄）；两只茶杯，尾音完全消散',
}
for sec in T['sections']:
    ds = [d for s, d in zip(shots, durs) if s['section'] == sec['id']]
    avg = f'{sum(ds) / len(ds) / FPS:.2f}s' if ds else '—'
    L.append(f'| {sec["id"]} {SEC_ZH.get(sec["id"], "")} | {sec["start"]:.1f}–{sec["end"]:.1f} | {len(ds)} | {avg} | {TASK.get(sec["id"], "")} |')
L.append('')
L.append('## 分镜表')
L.append('')
L.append('| 编号 | 时码 | 时长 | 段落 | 歌词 | 景别/镜头 | 内容 | 转场 |')
L.append('|---|---|---|---|---|---|---|---|')
for s, d in zip(shots, durs):
    seg = f'{s["section"]}<br>章{s["treatment_ref"]}' if s['treatment_ref'] != 'gap' else f'{s["section"]}<br>补白'
    cam = (f'**{s["shot_size"]}** · {s["lens_mm"]}mm<br>{esc(s["camera_move"])}'
           + (f'<br>{esc(s["speed"])}' if str(s['speed']).strip() != '24' else '')
           + f'<br>`{s["scene"]}` · {ERA_ZH.get(s["era"], s["era"])}')
    sync = '；'.join(f'{p["t"]:.2f} {p["event"]}' for p in s['sync_points'])
    body = (f'{esc(s["action"])}<br>*{esc(s["emotion"])}*' + (f'<br>⏱ {esc(sync)}' if sync else '')
            + (f'<br>群演/附属：{esc("；".join(s["extras"]))}' if s.get('extras') else ''))
    tr = s['transition_in']
    trs = TR_ZH.get(tr['type'], tr['type']) + (f'（{tr["frames"]}帧）' if tr['frames'] else '') + f'：{esc(tr["on"])}'
    lyr = esc(s['lyric']) if s['lyric'] else '（器乐）'
    L.append(f'| {s["id"]} | {tc(s["in_frame"])}–{tc(s["out_frame"])}<br>{s["in_frame"]}–{s["out_frame"]} | '
             f'{d / FPS:.2f}s<br>{d}f | {seg} | {lyr} | {cam} | {body} | {trs} |')
L.append('')
REG = [(s['id'], s['transition_in']['register']) for s in shots if s['transition_in'].get('register')]
if REG:
    L.append('## 匹配剪辑登记（圣经 §8.4）')
    L.append('')
    L.append('| A → B | 主体 | 画面坐标 (0–1) | 大小 | 方向/运动 | 剪点所在的动作阶段 |')
    L.append('|---|---|---|---|---|---|')
    for sid, r in REG:
        L.append(f'| {r["a"]} → {r["b"]} | {esc(r["subject"])} | ({r["pos"][0]:.2f}, {r["pos"][1]:.2f}) | {esc(r["size"])} | {esc(r["direction"])} | {esc(r["phase"])} |')
    L.append('')
L.append('## 参考 id 索引（bible.json）')
L.append('')
L.append('| 编号 | refs | 评审意见 | 来自 v1 |')
L.append('|---|---|---|---|')
for s in shots:
    rv = s.get('revision') or {}
    L.append(f'| {s["id"]} | {" ".join("`"+r+"`" for r in s.get("refs", []))} | {" ".join(rv.get("findings", []))} | {" ".join(rv.get("from_v1", []))} |')
L.append('')
chars = Counter(c for s in shots for c in s['characters'])
props = Counter(p for s in shots for p in s['props'])
L.append('## 人物与道具出场统计')
L.append('')
L.append('人物：' + '，'.join(f'`{k}`×{v}' for k, v in chars.most_common()))
L.append('')
L.append('道具：' + '，'.join(f'`{k}`×{v}' for k, v in props.most_common()))
L.append('')
open(DST, 'w', encoding='utf-8').write('\n'.join(L))
print(f'wrote {DST} ({len(shots)} shots)')
