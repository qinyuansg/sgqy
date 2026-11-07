#!/usr/bin/env python3
"""三个视角 —— 讲解视频生成器。

用 Pillow 逐帧绘制画面，用 numpy 合成背景音乐，用 ffmpeg 编码成 MP4。
运行：python3 make_video.py   （需要 ffmpeg、Pillow、numpy、文泉驿正黑字体）
输出：three-perspectives.mp4
"""
import math
import os
import subprocess
import sys
import wave
from multiprocessing import Pool

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
BUILD = os.path.join(HERE, "build")
OUT = os.path.join(HERE, "three-perspectives.mp4")

W, H = 1920, 1080
FPS = 30
FONT_PATH = "/usr/share/fonts/truetype/wqy/wqy-zenhei.ttc"

# ---------- 配色 ----------
TEXT = (238, 242, 247)
MUTED = (154, 167, 184)
FACT = (78, 168, 255)     # 事实：蓝
ME = (255, 159, 67)       # 我：橙
OTHER = (46, 214, 161)    # 别人：绿
BAD = (255, 107, 107)
GOLD = (255, 209, 102)
CARD = (255, 255, 255, 16)

_fonts = {}


def font(size):
    if size not in _fonts:
        _fonts[size] = ImageFont.truetype(FONT_PATH, size)
    return _fonts[size]


# ---------- 富文本排版 ----------
NO_LINE_START = set("，。、；：！？）》」”’…—,.;:!?)%～")


def parse_rich(text, color):
    """支持 {文字|颜色名} 标记，返回 [(字符, 颜色)]。"""
    palette = {"fact": FACT, "me": ME, "other": OTHER, "bad": BAD,
               "gold": GOLD, "muted": MUTED, "text": TEXT}
    out, i = [], 0
    while i < len(text):
        if text[i] == "{":
            j = text.index("}", i)
            body, cname = text[i + 1:j].rsplit("|", 1)
            out += [(ch, palette[cname]) for ch in body]
            i = j + 1
        else:
            out.append((text[i], color))
            i += 1
    return out


def wrap_rich(chars, f, maxw):
    lines, line, width = [], [], 0
    for ch, col in chars:
        if ch == "\n":
            lines.append(line)
            line, width = [], 0
            continue
        cw = f.getlength(ch)
        if line and width + cw > maxw:
            if ch == " ":
                lines.append(line)
                line, width = [], 0
                continue
            carry = []
            # 标点不能出现在行首：把前面的字一起带到下一行
            if ch in NO_LINE_START:
                while line and line[-1][0] in NO_LINE_START:
                    carry.insert(0, line.pop())
                if line:
                    carry.insert(0, line.pop())
            lines.append(line)
            line = carry
            width = sum(f.getlength(c) for c, _ in carry)
        line.append((ch, col))
        width += cw
    if line:
        lines.append(line)
    return lines


def text_img(text, size, color=TEXT, maxw=1600, bold=False, align="left",
             line_h=1.45):
    f = font(size)
    lines = wrap_rich(parse_rich(text, color), f, maxw)
    lh = int(size * line_h)
    widths = [sum(f.getlength(c) for c, _ in ln) for ln in lines]
    w = int(max(widths) if widths else 1) + 8
    h = lh * len(lines) + int(size * 0.3)
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for li, ln in enumerate(lines):
        x = {"left": 2, "center": (w - widths[li]) / 2,
             "right": w - widths[li] - 2}[align]
        y = li * lh + int((lh - size) * 0.35)
        # 按颜色分段绘制，保留西文字距
        run, rcol = "", None
        for ch, col in ln + [("", None)]:
            if col != rcol and run:
                d.text((x, y), run, font=f, fill=rcol,
                       stroke_width=1 if bold else 0, stroke_fill=rcol)
                x += f.getlength(run)
                run = ""
            run += ch
            rcol = col
    return img


def rounded(w, h, r, fill, outline=None, width=0, top_bar=None):
    s = 2
    img = Image.new("RGBA", (w * s, h * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, w * s - 1, h * s - 1), r * s, fill=fill,
                        outline=outline, width=width * s)
    if top_bar:
        mask = Image.new("L", img.size, 0)
        ImageDraw.Draw(mask).rounded_rectangle((0, 0, w * s - 1, h * s - 1),
                                               r * s, fill=255)
        bar = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(bar).rectangle((0, 0, w * s, 8 * s), fill=top_bar)
        bar.putalpha(Image.composite(bar.getchannel("A"), mask, mask))
        img = Image.alpha_composite(img, bar)
    return img.resize((w, h), Image.LANCZOS)


def card(content, w, h=None, accent=None, pad=36, fill=CARD, outline=None):
    """content: list of RGBA images stacked vertically."""
    gap = 14
    inner_h = sum(c.height for c in content) + gap * (len(content) - 1)
    h = h or inner_h + pad * 2 + (8 if accent else 0)
    base = rounded(w, h, 22, fill, outline=outline, width=2 if outline else 0,
                   top_bar=accent)
    y = pad + (8 if accent else 0)
    for c in content:
        base.alpha_composite(c, (pad, y))
        y += c.height + gap
    return base


def pill(text, color, size=30, pad_x=22, pad_y=10, solid=False):
    t = text_img(text, size, (15, 23, 36) if solid else color, bold=True)
    w, h = t.width + pad_x * 2, t.height + pad_y * 2
    fill = color + (255,) if solid else color + (40,)
    p = rounded(w, h, h // 2, fill, outline=None if solid else color + (200,),
                width=0 if solid else 2)
    p.alpha_composite(t, (pad_x, pad_y))
    return p


# ---------- 图标 ----------
def icon(kind, size, color):
    s = 4
    S = size * s
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = color + (255,)
    bg = (15, 23, 36, 255)
    if kind == "fact":  # 摄像机
        d.rounded_rectangle((S * .06, S * .28, S * .94, S * .84), S * .1, fill=c)
        d.rounded_rectangle((S * .32, S * .16, S * .62, S * .32), S * .05, fill=c)
        d.ellipse((S * .27, S * .36, S * .73, S * .82), fill=bg)
        d.ellipse((S * .35, S * .44, S * .65, S * .74), fill=c)
        d.ellipse((S * .42, S * .5, S * .52, S * .6), fill=bg)
        d.ellipse((S * .78, S * .34, S * .86, S * .42), fill=bg)
    elif kind == "me":  # 一个人 + 胸口的心
        d.ellipse((S * .32, S * .08, S * .68, S * .44), fill=c)
        d.pieslice((S * .12, S * .5, S * .88, S * 1.26), 180, 360, fill=c)
        hx, hy, r = S * .5, S * .76, S * .07
        d.ellipse((hx - 2 * r, hy - r, hx, hy + r * .9), fill=bg)
        d.ellipse((hx, hy - r, hx + 2 * r, hy + r * .9), fill=bg)
        d.polygon([(hx - 2 * r + 2, hy + r * .2), (hx + 2 * r - 2, hy + r * .2),
                   (hx, hy + r * 2.4)], fill=bg)
    elif kind == "other":  # 两个人
        c2 = tuple(int(v * .62) for v in color) + (255,)
        d.ellipse((S * .5, S * .1, S * .8, S * .4), fill=c2)
        d.pieslice((S * .34, S * .5, S * .96, S * 1.12), 180, 360, fill=c2)
        d.ellipse((S * .16, S * .2, S * .48, S * .52), fill=bg)
        d.ellipse((S * .2, S * .24, S * .44, S * .48), fill=c)
        d.pieslice((S * .0, S * .6, S * .64, S * 1.24), 180, 360, fill=bg)
        d.pieslice((S * .04, S * .64, S * .6, S * 1.2), 180, 360, fill=c)
    return img.resize((size, size), Image.LANCZOS)


def icon_badge(kind, size, color):
    """带光晕的圆形图标徽章。"""
    pad = int(size * .35)
    T = size + pad * 2
    img = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    glow = Image.new("RGBA", (T, T), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse((pad * .5, pad * .5, T - pad * .5, T - pad * .5),
                                 fill=color + (70,))
    img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(size * .12)))
    ring = rounded(int(size * 1.3), int(size * 1.3), int(size * .65),
                   (15, 23, 36, 255), outline=color + (255,), width=4)
    o = (T - ring.width) // 2
    img.alpha_composite(ring, (o, o))
    ic = icon(kind, int(size * .8), color)
    o = (T - ic.width) // 2
    img.alpha_composite(ic, (o, o))
    return img


def cylinder_panel(mode, w=460, h=380):
    """开场比喻：从上看是圆，从侧面看是长方形，合起来是圆柱。"""
    s = 3
    img = Image.new("RGBA", (w * s, h * s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = w * s / 2, h * s / 2
    R = 110 * s
    if mode == "top":
        d.ellipse((cx - R, cy - R, cx + R, cy + R), fill=FACT + (90,),
                  outline=FACT + (255,), width=5 * s)
    elif mode == "side":
        d.rectangle((cx - R, cy - R * .95, cx + R, cy + R * .95),
                    fill=ME + (90,), outline=ME + (255,), width=5 * s)
    else:
        e = R * .38
        top, bot = cy - R * .8, cy + R * .8
        d.rectangle((cx - R, top, cx + R, bot), fill=OTHER + (90,))
        d.ellipse((cx - R, bot - e, cx + R, bot + e), fill=OTHER + (90,))
        d.arc((cx - R, bot - e, cx + R, bot + e), 0, 180, fill=OTHER + (255,),
              width=5 * s)
        d.line((cx - R, top, cx - R, bot), fill=OTHER + (255,), width=5 * s)
        d.line((cx + R, top, cx + R, bot), fill=OTHER + (255,), width=5 * s)
        d.ellipse((cx - R, top - e, cx + R, top + e), fill=(36, 92, 86, 255),
                  outline=OTHER + (255,), width=5 * s)
    return img.resize((w, h), Image.LANCZOS)


# ---------- 场景描述 ----------
class El:
    def __init__(self, img, x, y, start, anim="up"):
        self.img, self.x, self.y, self.start, self.anim = img, int(x), int(y), start, anim


def read_time(text):
    n = len([c for c in text if not c.isspace() and c not in "{}|"])
    return 0.8 + n / 6.0


class Scene:
    """简单的时间轴：add() 自动根据阅读时长安排下一个元素出现的时间。"""

    def __init__(self, chapter=None, color=MUTED):
        self.els, self.t, self.chapter, self.color = [], 0.6, chapter, color

    def add(self, img, x, y, text="", wait=None, anim="up", at=None):
        start = self.t if at is None else at
        self.els.append(El(img, x, y, start, anim))
        if at is None:
            self.t += wait if wait is not None else read_time(text)
        return img

    def pause(self, s):
        self.t += s

    def duration(self, hold=1.6):
        return self.t + hold


def cx(img):
    return (W - img.width) // 2


def chapter_header(sc, label, kind, color):
    b = icon_badge(kind, 46, color)
    sc.add(b, 70, 34, at=0.0, anim="fade")
    t = text_img(label, 34, color, bold=True)
    sc.add(t, 70 + b.width + 8, 34 + (b.height - t.height) // 2, at=0.0, anim="fade")


def build_scenes():
    scenes = []

    # 0. 标题
    sc = Scene()
    t = text_img("三个视角", 150, TEXT, bold=True)
    sc.add(t, cx(t), 230, wait=1.0)
    t = text_img("看清一件事的完整方法", 54, MUTED)
    sc.add(t, cx(t), 430, wait=1.2)
    items = [("fact", "事实的视角", FACT), ("me", "我的视角", ME),
             ("other", "别人的视角", OTHER)]
    for i, (k, lab, col) in enumerate(items):
        b = icon_badge(k, 90, col)
        x = 480 + i * 480 - b.width // 2
        sc.add(b, x, 580, wait=0.0)
        tl = text_img(lab, 40, col, bold=True)
        sc.add(tl, 480 + i * 480 - tl.width // 2, 580 + b.height, wait=0.7)
    sc.pause(1.5)
    scenes.append(sc)

    # 1. 引子：圆柱
    sc = Scene("引子")
    t = text_img("同一件事，为什么每个人说的都不一样？", 64, TEXT, bold=True)
    sc.add(t, cx(t), 110, "同一件事为什么每个人说的都不一样")
    labels = [("top", "从上往下看：是一个{圆|fact}"), ("side", "从侧面看：是一个{长方形|me}"),
              ("cyl", "合起来看：它是一个{圆柱|other}")]
    for i, (m, lab) in enumerate(labels):
        p = cylinder_panel(m)
        x = 140 + i * 560
        sc.add(p, x, 250, wait=0.0)
        tl = text_img(lab, 38, TEXT, align="center", maxw=520)
        sc.add(tl, x + (p.width - tl.width) // 2, 650, lab)
    t = text_img("每个视角都看到了一部分真实；\n只有把视角合起来，才能看到{全貌|gold}。",
                 46, TEXT, align="center")
    sc.add(t, cx(t), 790, "每个视角都看到了一部分真实只有把视角合起来才能看到全貌")
    scenes.append(sc)

    # 2. 总览
    sc = Scene("总览")
    t = text_img("看清一件事，需要三个视角", 64, TEXT, bold=True)
    sc.add(t, cx(t), 110, "看清一件事需要三个视角")
    data = [("fact", "事实的视角", FACT, "像一台{摄像机|fact}", "发生了什么？\n只看能拍下来的。"),
            ("me", "我的视角", ME, "像一段{内心独白|me}", "我感受到什么？\n我需要什么？"),
            ("other", "别人的视角", OTHER, "像{穿上对方的鞋子|other}", "如果我是他，\n我会怎么看？")]
    for i, (k, lab, col, meta, q) in enumerate(data):
        b = icon_badge(k, 80, col)
        content = [b, text_img(lab, 46, col, bold=True), text_img(meta, 34, TEXT),
                   text_img(q, 34, MUTED, maxw=440)]
        c = card(content, 500, 560, accent=col + (255,))
        sc.add(c, 110 + i * 580, 270, lab + meta + q)
    scenes.append(sc)

    # ---------- 第一部分：事实 ----------
    def chapter_title(num, name, kind, col, sub):
        sc = Scene()
        b = icon_badge(kind, 140, col)
        sc.add(b, cx(b), 200, wait=0.4)
        t = text_img(num, 60, col, bold=True)
        sc.add(t, cx(t), 200 + b.height + 10, wait=0.3)
        t = text_img(name, 110, TEXT, bold=True)
        sc.add(t, cx(t), 200 + b.height + 90, wait=0.8)
        t = text_img(sub, 48, MUTED)
        sc.add(t, cx(t), 200 + b.height + 250, sub)
        return sc

    scenes.append(chapter_title("第一部分", "事实的视角", "fact", FACT, "像一台摄像机：只记录，不评判"))

    sc = Scene("事实的视角")
    chapter_header(sc, "第一部分 · 事实的视角", "fact", FACT)
    t = text_img("什么是「事实的视角」？", 60, TEXT, bold=True)
    sc.add(t, 120, 170, "什么是事实的视角")
    t = text_img("想象你是一台{摄像机|fact}：只记录{看得见、听得见、可以验证|fact}的东西。", 44, TEXT, maxw=1680)
    sc.add(t, 120, 280, "想象你是一台摄像机只记录看得见听得见可以验证的东西")
    rows = [("√ 记录", "时间、地点、数字、原话、动作", FACT),
            ("× 不评价", "不说“好 / 坏 / 对 / 错”", BAD),
            ("× 不猜测", "不说“他是故意的”——动机拍不下来", BAD),
            ("× 不概括", "不说“总是 / 从来 / 每次”——一次只能拍一次", BAD)]
    for i, (a, b_, col) in enumerate(rows):
        p = pill(a, col, 32)
        y = 420 + i * 100
        sc.add(p, 160, y, wait=0.0)
        tb = text_img(b_, 40, TEXT)
        sc.add(tb, 400, y + (p.height - tb.height) // 2 + 2, b_)
    t = text_img("检验方法：{换任何一个人来看，都会同意吗？能被拍下来吗？|gold}", 42, TEXT, maxw=1680)
    c = card([t], 1680, pad=30)
    sc.add(c, 120, 860, "检验方法换任何一个人来看都会同意吗能被拍下来吗")
    scenes.append(sc)

    sc = Scene("事实的视角")
    chapter_header(sc, "第一部分 · 事实的视角", "fact", FACT)
    t = text_img("小测验：下面哪一句是事实？", 60, TEXT, bold=True)
    sc.add(t, 120, 170, "小测验下面哪一句是事实")
    quiz = [("“他开会迟到了 15 分钟。”", "√ 事实", FACT, "时间可以核对，摄像机拍得到"),
            ("“他总是迟到。”", "× 概括", BAD, "“总是”是总结，不是一次具体的发生"),
            ("“他根本不尊重我。”", "× 推测", BAD, "“不尊重”是对动机的猜测，看不见"),
            ("“我很生气。”", "感受", ME, "真实，但它属于「我的视角」")]
    qs = []
    for i, (q, *_rest) in enumerate(quiz):
        tq = text_img(q, 46, TEXT)
        y = 300 + i * 165
        sc.add(tq, 160, y, q)
        qs.append((tq, y))
    sc.pause(1.0)
    for (tq, y), (q, lab, col, why) in zip(qs, quiz):
        p = pill(lab, col, 32, solid=True)
        sc.add(p, 820, y - 2, wait=0.0, anim="pop")
        tw = text_img(why, 34, MUTED, maxw=820)
        sc.add(tw, 1010, y + 6, why)
    scenes.append(sc)

    sc = Scene("事实的视角")
    chapter_header(sc, "第一部分 · 事实的视角", "fact", FACT)
    t = text_img("事实的视角：价值与局限", 60, TEXT, bold=True)
    sc.add(t, 120, 170, "事实的视角价值与局限")
    good = card([text_img("价值", 44, FACT, bold=True),
                 text_img("让人{冷静|fact}下来。\n\n当大家吵架时，先回到事实，就找到了一个{共同的起点|fact}：至少我们对“发生了什么”是一致的。", 38, TEXT, maxw=730)],
                820, 560, accent=FACT + (255,), pad=44)
    sc.add(good, 120, 290, "价值让人冷静下来当大家吵架时先回到事实就找到了一个共同的起点至少我们对发生了什么是一致的")
    lim = card([text_img("局限", 44, BAD, bold=True),
                text_img("事实只回答“{发生了什么|bad}”，不回答“{这意味着什么|bad}”。\n\n而且，我们看到的事实，常常只是一个{片段|bad}——镜头外还有很多东西。", 38, TEXT, maxw=730)],
               820, 560, accent=BAD + (255,), pad=44)
    sc.add(lim, 980, 290, "局限事实只回答发生了什么不回答这意味着什么而且我们看到的事实常常只是一个片段镜头外还有很多东西")
    scenes.append(sc)

    # ---------- 第二部分：我 ----------
    scenes.append(chapter_title("第二部分", "我的视角", "me", ME, "像一段内心独白：诚实地看见自己"))

    sc = Scene("我的视角")
    chapter_header(sc, "第二部分 · 我的视角", "me", ME)
    t = text_img("什么是「我的视角」？", 60, TEXT, bold=True)
    sc.add(t, 120, 170, "什么是我的视角")
    parts = [("感受", "开心、委屈、着急、害怕……"), ("需要", "被尊重、安全感、效率、公平……"),
             ("经历", "过去的伤、习惯、成长环境……"), ("期待", "我希望事情变成什么样")]
    t = text_img("我的视角 =", 44, ME, bold=True)
    sc.add(t, 120, 290, wait=0.8)
    for i, (a, b_) in enumerate(parts):
        c = card([text_img(a, 44, ME, bold=True), text_img(b_, 32, MUTED, maxw=310)],
                 380, 230, accent=ME + (255,), pad=30)
        sc.add(c, 120 + i * 425, 370, a + b_)
    qs = "要问自己的四个问题：\n① 这件事让我有什么{感受|me}？  ② 我为什么这么{在意|me}？\n③ 我的哪些{过去经历|me}影响了我的解读？  ④ 我真正想要的{结果|me}是什么？"
    t = text_img(qs, 40, TEXT, maxw=1700, line_h=1.6)
    sc.add(t, 120, 680, qs)
    scenes.append(sc)

    sc = Scene("我的视角")
    chapter_header(sc, "第二部分 · 我的视角", "me", ME)
    t = text_img("一个好用的表达公式", 60, TEXT, bold=True)
    sc.add(t, 120, 170, "一个好用的表达公式")
    f_ = "当 {[事实]|fact} 发生时，我感到 {[感受]|me}，因为我在意 {[需要]|me}，我希望 {[请求]|gold}。"
    c = card([text_img(f_, 46, TEXT, maxw=1600)], 1680, pad=40, outline=ME + (160,))
    sc.add(c, 120, 280, "当事实发生时我感到感受因为我在意需要我希望请求")
    p = pill("× 指责", BAD, 32, solid=True)
    sc.add(p, 120, 470, wait=0.0)
    t = text_img("“你总是这么不靠谱，根本不把别人当回事！”", 42, TEXT)
    sc.add(t, 320, 472, "你总是这么不靠谱根本不把别人当回事")
    t = text_img("→ 对方听到的是攻击，只会防御和反击。", 36, MUTED)
    sc.add(t, 320, 540, "对方听到的是攻击只会防御和反击")
    p = pill("√ 表达", OTHER, 32, solid=True)
    sc.add(p, 120, 650, wait=0.0)
    t = text_img("“{你开会迟到了 15 分钟|fact}，我感到{有点着急|me}，因为我{很在意大家的时间|me}，{我希望下次如果会晚到，能提前告诉我一声|gold}。”", 42, TEXT, maxw=1480)
    sc.add(t, 320, 652, "你开会迟到了15分钟我感到有点着急因为我很在意大家的时间我希望下次如果会晚到能提前告诉我一声")
    y2 = 652 + t.height + 12
    t = text_img("→ 对方听到的是你的需要，更愿意配合。", 36, MUTED)
    sc.add(t, 320, y2, "对方听到的是你的需要更愿意配合")
    scenes.append(sc)

    sc = Scene("我的视角")
    chapter_header(sc, "第二部分 · 我的视角", "me", ME)
    t = text_img("两个重要提醒", 60, TEXT, bold=True)
    sc.add(t, 120, 170, "两个重要提醒")
    a = card([text_img("1. 承认自己的视角 ≠ 自私", 44, ME, bold=True),
              text_img("说出“我很难过”“我需要帮助”，不是矫情，而是{诚实|me}。压抑自己的感受，问题并不会消失。", 38, TEXT, maxw=1580)],
             1680, pad=36, accent=ME + (255,))
    sc.add(a, 120, 280, "承认自己的视角不等于自私说出我很难过我需要帮助不是矫情而是诚实压抑自己的感受问题并不会消失")
    b_ = card([text_img("2. 我的视角，是“一种”解读，不是唯一的真相", 44, ME, bold=True),
               text_img("同一句“你最近好像胖了”：有人听到的是{关心|other}，有人听到的是{羞辱|bad}。\n差别不在这句话，而在每个人的{经历和在意的东西|me}。", 38, TEXT, maxw=1580)],
              1680, pad=36, accent=ME + (255,))
    sc.add(b_, 120, 280 + a.height + 40, "我的视角是一种解读不是唯一的真相同一句你最近好像胖了有人听到的是关心有人听到的是羞辱差别不在这句话而在每个人的经历和在意的东西")
    scenes.append(sc)

    # ---------- 第三部分：别人 ----------
    scenes.append(chapter_title("第三部分", "别人的视角", "other", OTHER, "像穿上对方的鞋子，走一段他的路"))

    sc = Scene("别人的视角")
    chapter_header(sc, "第三部分 · 别人的视角", "other", OTHER)
    t = text_img("什么是「别人的视角」？", 60, TEXT, bold=True)
    sc.add(t, 120, 170, "什么是别人的视角")
    t = text_img("站到对方的位置上：看见他的{处境、掌握的信息、压力、需要和动机|other}。", 44, TEXT, maxw=1680)
    sc.add(t, 120, 280, "站到对方的位置上看见他的处境掌握的信息压力需要和动机")
    qs = [("如果我是他，", "知道他知道的、经历他经历的，我会怎么做？"),
          ("他可能在意什么？", "又在害怕什么？"),
          ("有什么是他看得到，", "而我看不到的？"),
          ("有什么是我看得到，", "而他看不到的？")]
    for i, (a, b_) in enumerate(qs):
        c = card([text_img(a, 40, OTHER, bold=True), text_img(b_, 36, TEXT, maxw=760)],
                 820, 200, accent=OTHER + (255,), pad=30)
        sc.add(c, 120 + (i % 2) * 860, 400 + (i // 2) * 230, a + b_)
    scenes.append(sc)

    sc = Scene("别人的视角")
    chapter_header(sc, "第三部分 · 别人的视角", "other", OTHER)
    t = text_img("三个原则", 60, TEXT, bold=True)
    sc.add(t, 120, 170, "三个原则")
    pr = [("理解 ≠ 认同", "理解他为什么这么做，不代表你同意他这么做。你依然可以说“不”。"),
          ("善意假设", "先假设对方是一个“{有理由的正常人|other}”，而不是坏人或傻瓜。大多数时候，这个假设是对的。"),
          ("“别人”不止一个", "当事人、旁观者、拍视频的人、转述的人……{每个人都有自己的视角|other}。")]
    y = 280
    for i, (a, b_) in enumerate(pr):
        num = text_img(str(i + 1), 80, OTHER, bold=True)
        c = card([text_img(a, 44, OTHER, bold=True), text_img(b_, 38, TEXT, maxw=1420)],
                 1540, pad=32)
        sc.add(num, 140, y + (c.height - num.height) // 2, wait=0.0)
        sc.add(c, 260, y, a + b_)
        y += c.height + 34
    scenes.append(sc)

    # ---------- 例子 ----------
    sc = Scene()
    t = text_img("四个例子", 110, GOLD, bold=True)
    sc.add(t, cx(t), 330, wait=1.0)
    t = text_img("把三个视角放在同一件事上", 52, TEXT)
    sc.add(t, cx(t), 500, "把三个视角放在同一件事上")
    t = text_img("职场 · 关系 · 家庭 · 网络", 40, MUTED)
    sc.add(t, cx(t), 600, "职场关系家庭网络")
    scenes.append(sc)

    examples = [
        ("例子 1 · 职场", "同事开会迟到", "周一上午的项目会，小王迟到了。",
         "会议 10:00 开始；小王 10:15 进门；事先没有发消息。",
         "我很着急，还有点被冒犯。因为我准备了很久、很在意效率，希望会议能准时开始。",
         "小王早上送发烧的孩子去医院，手机又没电了。他推门进来时，其实非常愧疚。",
         "不说“你总是不尊重人”，而是：“今天晚了 15 分钟，我有点着急。下次如果会晚到，能先发个消息吗？”",
         "我", "小王"),
        ("例子 2 · 关系", "消息“已读不回”", "我给好朋友发了一条长长的消息，对方显示“已读”。",
         "晚上 8:00 发出；8:05 显示已读；到 11:00 还没有回复。",
         "我很不安，觉得被忽视了。因为我很在意这段友谊，希望得到回应。",
         "朋友正在加班赶方案。看到消息后想“等会儿认真回”，结果一忙就忘了。",
         "不急着下结论“他不在乎我”。第二天轻松地问一句：“昨天那条你看到啦？有空聊聊～”",
         "我", "朋友"),
        ("例子 3 · 家庭", "孩子数学考了 70 分", "孩子拿着试卷回家，低着头。",
         "这次 70 分；上次 65 分；班级平均 75 分。",
         "我很担心。因为我在意他的未来，希望他能跟上大家。",
         "他其实进步了 5 分，此刻正害怕被骂。他最需要的是：自己的努力被看见。",
         "先说：“比上次进步了 5 分，不容易！”再一起看错题：“这几道，我们一起弄懂。”",
         "我（父母）", "孩子"),
        ("例子 4 · 网络", "一段“地铁不让座”的视频", "网上疯传一段视频，评论区一片骂声。",
         "画面里年轻人坐着，旁边站着一位老人；视频只有 20 秒；看不到前因后果。",
         "我很愤怒，因为我在意尊老爱幼。——但我的愤怒，建立在一个 20 秒的片段上。",
         "年轻人可能刚下夜班、身体不适；拍摄者也有自己的立场，选择了拍哪一段。",
         "先别急着转发和骂人。问自己：“我看到的是全部事实吗？还缺哪些信息？”",
         "我", "年轻人 / 拍摄者"),
    ]
    for tag, title, setup, fact, me, other, better, me_lab, other_lab in examples:
        sc = Scene("例子")
        p = pill(tag, GOLD, 30)
        sc.add(p, 120, 50, wait=0.0, anim="fade")
        t = text_img(title, 64, TEXT, bold=True)
        sc.add(t, 120, 110, wait=0.6)
        t = text_img(setup, 38, MUTED, maxw=1680)
        sc.add(t, 120, 205, setup)
        cols = [("fact", "事实", FACT, fact), ("me", me_lab, ME, me), ("other", other_lab, OTHER, other)]
        conts = []
        for k, lab, col, body in cols:
            head = Image.new("RGBA", (480, 64), (0, 0, 0, 0))
            ic = icon(k, 52, col)
            head.alpha_composite(ic, (0, 6))
            lt = text_img(lab, 40, col, bold=True)
            head.alpha_composite(lt, (66, (64 - lt.height) // 2 + 2))
            conts.append([head, text_img(body, 34, TEXT, maxw=470)])
        hh = max(sum(c.height for c in cc) + 14 + 72 + 8 for cc in conts)
        for i, ((k, lab, col, body), cc) in enumerate(zip(cols, conts)):
            c = card(cc, 545, max(hh, 380), accent=col + (255,))
            sc.add(c, 120 + i * 568, 290, lab + body)
        bt = text_img("更好的做法：", 38, GOLD, bold=True)
        bb = text_img(better, 38, TEXT, maxw=1600)
        c = card([bt, bb], 1680, pad=30, fill=(255, 209, 102, 22), outline=GOLD + (150,))
        sc.add(c, 120, 290 + max(hh, 380) + 36, better)
        sc.pause(1.0)
        scenes.append(sc)

    # ---------- 陷阱 ----------
    sc = Scene("总结")
    t = text_img("只用一个视角，会掉进什么坑？", 60, TEXT, bold=True)
    sc.add(t, 120, 110, "只用一个视角会掉进什么坑")
    traps = [("fact", "只有事实", FACT, "冷冰冰", "“你迟到了 15 分钟，这是事实。”——话没错，但没有温度，人心是冷的。"),
             ("me", "只有我", ME, "自以为是", "只顾自己的感受，容易误解、指责别人，把“我觉得”当成“就是这样”。"),
             ("other", "只有别人", OTHER, "委屈自己", "一味体谅、讨好，压抑自己的需要，忍到最后一起爆发。")]
    for i, (k, a, col, tag, b_) in enumerate(traps):
        head = Image.new("RGBA", (480, 64), (0, 0, 0, 0))
        head.alpha_composite(icon(k, 52, col), (0, 6))
        lt = text_img(a, 42, col, bold=True)
        head.alpha_composite(lt, (66, (64 - lt.height) // 2 + 2))
        c = card([head, pill(tag, BAD, 30), text_img(b_, 34, TEXT, maxw=470)], 545, 470,
                 accent=col + (255,))
        sc.add(c, 120 + i * 568, 240, a + tag + b_)
    t = text_img("三个视角合在一起，才是完整的看见。", 48, GOLD, bold=True)
    sc.add(t, cx(t), 780, "三个视角合在一起才是完整的看见")
    scenes.append(sc)

    sc = Scene("总结")
    lines = [("事实", "让你", "清醒", FACT, "fact"), ("我的视角", "让你", "真诚", ME, "me"),
             ("别人的视角", "让你", "宽容", OTHER, "other")]
    for i, (a, mid, b_, col, k) in enumerate(lines):
        y = 210 + i * 230
        ta = text_img(a, 70, col, bold=True)
        ib = icon_badge(k, 80, col)
        sc.add(ib, 1010 - ta.width - ib.width - 10, y + (ta.height - ib.height) // 2, wait=0.0)
        sc.add(ta, 1010 - ta.width, y, wait=0.0)
        tm = text_img(mid, 70, TEXT)
        sc.add(tm, 1060, y, wait=0.0)
        tb = text_img(b_, 70, col, bold=True)
        sc.add(tb, 1060 + tm.width + 40, y, wait=2.2, anim="pop")
    scenes.append(sc)

    sc = Scene("方法")
    t = text_img("遇事三问", 70, GOLD, bold=True)
    sc.add(t, cx(t), 110, wait=1.0)
    steps = [("fact", "①", "真实发生了什么？", "只说摄像机能拍下来的。", FACT),
             ("me", "②", "我的感受和需要是什么？", "诚实地说出来，不指责。", ME),
             ("other", "③", "如果我是对方，我会怎么看？", "善意假设，补上我看不到的部分。", OTHER)]
    for i, (k, n, a, b_, col) in enumerate(steps):
        y = 260 + i * 175
        ib = icon_badge(k, 64, col)
        sc.add(ib, 220, y - 4, wait=0.0)
        ta = text_img(n + " " + a, 50, col, bold=True)
        sc.add(ta, 400, y, wait=0.0)
        tb = text_img(b_, 36, MUTED)
        sc.add(tb, 450, y + 72, a + b_)
    t = text_img("顺序很重要：先把{事实|fact}放在桌上，再诚实面对{自己|me}，最后走进{别人|other}的世界。",
                 40, TEXT, maxw=1600, align="center")
    sc.add(t, cx(t), 820, "顺序很重要先把事实放在桌上再诚实面对自己最后走进别人的世界")
    scenes.append(sc)

    sc = Scene("练习")
    t = text_img("小练习", 70, GOLD, bold=True)
    sc.add(t, cx(t), 110, wait=1.0)
    t = text_img("回想最近一件让你不舒服的事，拿一张纸，分成三栏写下来：", 42, TEXT,
                 maxw=1600, align="center")
    sc.add(t, cx(t), 230, "回想最近一件让你不舒服的事拿一张纸分成三栏写下来")
    hints = [("fact", "事实", FACT, "发生了什么？\n（时间、原话、动作）"),
             ("me", "我", ME, "我的感受？\n我的需要？"),
             ("other", "别人", OTHER, "他的处境？\n他可能怎么想？")]
    for i, (k, a, col, b_) in enumerate(hints):
        c = card([icon_badge(k, 70, col), text_img(a, 46, col, bold=True),
                  text_img(b_, 34, MUTED, maxw=440)], 500, 420, accent=col + (255,))
        sc.add(c, 110 + i * 580, 350, a + b_)
    t = text_img("写完你会发现：事情往往没有你最初想的那么糟。", 42, TEXT, align="center")
    sc.add(t, cx(t), 830, "写完你会发现事情往往没有你最初想的那么糟")
    scenes.append(sc)

    sc = Scene()
    t = text_img("视角越多，世界越大。", 96, TEXT, bold=True)
    sc.add(t, cx(t), 380, wait=2.0)
    for i, (k, col) in enumerate([("fact", FACT), ("me", ME), ("other", OTHER)]):
        b = icon_badge(k, 70, col)
        sc.add(b, 960 - b.width // 2 + (i - 1) * 180, 560, wait=0.4)
    t = text_img("三个视角 · 完", 40, MUTED)
    sc.add(t, cx(t), 780, wait=3.0)
    scenes.append(sc)
    return scenes


# ---------- 渲染 ----------
def make_bg():
    y = np.linspace(0, 1, H)[:, None]
    x = np.linspace(0, 1, W)[None, :]
    top = np.array([14, 21, 34])
    bot = np.array([26, 36, 54])
    g = top + (bot - top) * y[..., None]
    # 柔和的暗角
    v = 1 - 0.28 * (((x - .5) ** 2 + (y - .45) ** 2) * 2.2)
    g = g * v[..., None]
    return Image.fromarray(np.clip(g, 0, 255).astype(np.uint8), "RGB").convert("RGBA")


def ease(a):
    return 1 - (1 - a) ** 3


def render_scene(args):
    idx, scenes_meta, t0, total = args
    scenes = build_scenes()
    sc = scenes[idx]
    dur = scenes_meta[idx]
    n = int(round(dur * FPS))
    bg = make_bg()
    path = os.path.join(BUILD, f"scene_{idx:02d}.mp4")
    ff = subprocess.Popen(
        ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-", "-c:v", "libx264", "-preset",
         "medium", "-crf", "20", "-pix_fmt", "yuv420p", "-tune", "stillimage", path],
        stdin=subprocess.PIPE)
    ANIM = 0.6
    static_cache = None
    fade_cache = {}
    for f in range(n):
        t = f / FPS
        animating = any(e.start <= t < e.start + ANIM for e in sc.els)
        if not animating and static_cache is not None and static_cache[0] == sum(e.start <= t for e in sc.els):
            frame = static_cache[1].copy()
        else:
            frame = bg.copy()
            for e in sc.els:
                if t < e.start:
                    continue
                a = min(1.0, (t - e.start) / ANIM)
                if a >= 1:
                    frame.alpha_composite(e.img, (e.x, e.y))
                    continue
                k = ease(a)
                q = round(k * 24) / 24
                key = (id(e), q)
                if key not in fade_cache:
                    im = e.img
                    if e.anim == "pop":
                        sc_ = 0.8 + 0.2 * q
                        im = im.resize((max(1, int(im.width * sc_)), max(1, int(im.height * sc_))), Image.LANCZOS)
                    al = im.getchannel("A").point(lambda v, q=q: int(v * q))
                    im = im.copy()
                    im.putalpha(al)
                    fade_cache[key] = im
                im = fade_cache[key]
                dx = (e.img.width - im.width) // 2
                dy = (e.img.height - im.height) // 2
                if e.anim == "up":
                    dy += int((1 - k) * 28)
                frame.alpha_composite(im, (e.x + dx, e.y + dy))
            if not animating:
                static_cache = (sum(e.start <= t for e in sc.els), frame.copy())
        # 章节标签 + 全片进度条
        d = ImageDraw.Draw(frame)
        prog = (t0 + t) / total
        d.rectangle((0, H - 6, W, H), fill=(40, 50, 68))
        d.rectangle((0, H - 6, int(W * prog), H), fill=GOLD)
        arr = np.asarray(frame.convert("RGB"), dtype=np.float32)
        # 场景淡入淡出
        fin = min(1.0, t / 0.45)
        fout = min(1.0, (dur - t) / 0.45)
        m = min(fin, fout)
        if m < 1:
            arr = arr * m
        ff.stdin.write(arr.astype(np.uint8).tobytes())
    ff.stdin.close()
    ff.wait()
    return idx


def make_music(total, starts, path, sr=44100):
    """柔和的环境铺底音乐 + 转场时的轻柔钟声。"""
    n = int(total * sr)
    t = np.arange(n) / sr
    out = np.zeros(n, dtype=np.float64)
    # C - Am - F - G，每个和弦 8 秒
    chords = [[261.63, 329.63, 392.00], [220.00, 261.63, 329.63],
              [174.61, 220.00, 261.63], [196.00, 246.94, 293.66]]
    seg = 8.0
    for ci in range(int(total / seg) + 2):
        ch = chords[ci % 4]
        s0 = ci * seg - 1.0
        a, b = max(0, int(s0 * sr)), min(n, int((s0 + seg + 2.0) * sr))
        if a >= b:
            continue
        tt = t[a:b] - s0
        env = np.clip(tt / 2.0, 0, 1) * np.clip((seg + 2.0 - tt) / 2.0, 0, 1)
        env = np.sin(env * np.pi / 2) ** 2
        for k, fr in enumerate(ch + [ch[0] / 2]):
            vib = 1 + 0.002 * np.sin(2 * np.pi * 0.2 * tt + k)
            ph = 2 * np.pi * fr * vib * tt
            tone = np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
            out[a:b] += env * tone * (0.05 if k < 3 else 0.07)
    # 转场钟声
    for s in starts[1:]:
        a = int(max(0, s - 0.05) * sr)
        b = min(n, a + int(3.0 * sr))
        tt = t[a:b] - t[a]
        for fr, amp in ((1046.5, .05), (1568.0, .03), (2093.0, .015)):
            out[a:b] += amp * np.sin(2 * np.pi * fr * tt) * np.exp(-tt * 2.2)
    # 简单混响（多路延迟）
    rev = out.copy()
    for dl, g in ((0.031, .35), (0.047, .3), (0.071, .25), (0.113, .2)):
        k = int(dl * sr)
        rev[k:] += g * out[:-k]
    rev *= np.clip(t / 2.0, 0, 1) * np.clip((total - t) / 3.0, 0, 1)
    rev = rev / (np.max(np.abs(rev)) + 1e-9) * 0.55
    st = np.stack([rev, np.roll(rev, int(0.012 * sr))], 1)
    data = (st * 32767).astype(np.int16)
    with wave.open(path, "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(sr)
        w.writeframes(data.tobytes())


def main():
    os.makedirs(BUILD, exist_ok=True)
    scenes = build_scenes()
    durs = [int(round(s.duration() * FPS)) / FPS for s in scenes]
    starts = list(np.cumsum([0] + durs[:-1]))
    total = sum(durs)
    print(f"{len(scenes)} 个场景，总时长 {total:.1f} 秒 ({total / 60:.1f} 分钟)")
    if sys.argv[1:2] == ["preview"]:
        bg = make_bg()
        for i, sc in enumerate(scenes):
            fr = bg.copy()
            for e in sc.els:
                fr.alpha_composite(e.img, (e.x, e.y))
            fr.convert("RGB").resize((W // 2, H // 2)).save(os.path.join(BUILD, f"preview_{i:02d}.png"))
        return
    only = [int(a) for a in sys.argv[1:]]
    jobs = [(i, durs, starts[i], total) for i in range(len(scenes)) if not only or i in only]
    with Pool(os.cpu_count()) as pool:
        for i in pool.imap_unordered(render_scene, jobs):
            print(f"  场景 {i:02d} 完成 ({durs[i]:.1f}s)", flush=True)
    if only:
        return
    lst = os.path.join(BUILD, "list.txt")
    with open(lst, "w") as fh:
        for i in range(len(scenes)):
            fh.write(f"file 'scene_{i:02d}.mp4'\n")
    music = os.path.join(BUILD, "music.wav")
    make_music(total, starts, music)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0",
                    "-i", lst, "-i", music, "-c:v", "copy", "-c:a", "aac", "-b:a", "160k",
                    "-shortest", "-movflags", "+faststart", OUT], check=True)
    print("输出：", OUT)


if __name__ == "__main__":
    main()
