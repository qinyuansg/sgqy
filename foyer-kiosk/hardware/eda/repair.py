"""Deterministic clean-up router for connections the autorouter left open.

Reads the DRC report's `unconnected_items` pairs and routes each one with a grid
A* search over all copper layers (8-connected moves, vias between layers),
treating every other net's copper as an obstacle inflated by clearance + half
the track width. Pad-to-pour gaps (an item whose pour island is isolated) are
closed with a short stub and a stitching via to the plane layers.
"""
from __future__ import annotations

import heapq
import math
import re

import numpy as np
import pcbnew

mm = pcbnew.FromMM
RES = 0.025  # grid resolution, mm

ITEM = re.compile(r"@\(([-\d.]+) mm, ([-\d.]+) mm\): (\w+).*?\[([^\]]+)\].*? on (\S+)")


def parse_unconnected(report: str):
    text = open(report, encoding="utf-8").read()
    pairs = []
    for block in re.split(r"\n(?=\[)", text):
        if not block.startswith("[unconnected_items]"):
            continue
        items = [m.groups() for m in ITEM.finditer(block)]
        if len(items) == 2:
            pairs.append([(float(x), float(y), kind, net, layer) for x, y, kind, net, layer in items])
    return pairs


class Grid:
    def __init__(self, board, clearance: float, width: float, via_d: float):
        self.b = board
        bb = board.GetBoardEdgesBoundingBox()
        self.x0, self.y0 = pcbnew.ToMM(bb.GetLeft()), pcbnew.ToMM(bb.GetTop())
        self.nx = int(pcbnew.ToMM(bb.GetWidth()) / RES) + 1
        self.ny = int(pcbnew.ToMM(bb.GetHeight()) / RES) + 1
        self.layers = list(board.GetEnabledLayers().CuStack())
        self.clear, self.width, self.via_d = clearance, width, via_d
        self.edge = 0.5

    def cell(self, x, y):
        return int(round((x - self.x0) / RES)), int(round((y - self.y0) / RES))

    def build(self, net: str):
        """Blocked-cell masks per layer for everything not on `net`."""
        L = len(self.layers)
        occ = np.zeros((L, self.ny, self.nx), dtype=bool)
        own = np.zeros((L, self.ny, self.nx), dtype=bool)
        infl = self.clear + self.width / 2 + RES  # grid-rounding margin
        e = int(self.edge / RES)
        occ[:, :e, :] = occ[:, -e:, :] = occ[:, :, :e] = occ[:, :, -e:] = True

        def mark(mask, li, x0, y0, x1, y1):
            i0, j0 = self.cell(x0, y0)
            i1, j1 = self.cell(x1, y1)
            mask[li, max(0, j0):max(0, j1 + 1), max(0, i0):max(0, i1 + 1)] = True

        def seg(mask, li, a, b, r):
            ax, ay, bx, by = (pcbnew.ToMM(v) for v in (a.x, a.y, b.x, b.y))
            n = max(2, int(math.hypot(bx - ax, by - ay) / RES) + 1)
            rr = int(math.ceil(r / RES))
            yy, xx = np.mgrid[-rr:rr + 1, -rr:rr + 1]
            disk = (xx * xx + yy * yy) <= rr * rr
            for t in np.linspace(0, 1, n):
                ci, cj = self.cell(ax + t * (bx - ax), ay + t * (by - ay))
                j0, i0 = cj - rr, ci - rr
                sl = mask[li, max(0, j0):cj + rr + 1, max(0, i0):ci + rr + 1]
                d = disk[max(0, -j0):max(0, -j0) + sl.shape[0], max(0, -i0):max(0, -i0) + sl.shape[1]]
                sl |= d

        for fp in self.b.GetFootprints():
            for pad in fp.Pads():
                box = pad.GetBoundingBox()
                same = pad.GetNetname() == net
                for li, layer in enumerate(self.layers):
                    if not pad.IsOnLayer(layer):
                        if pad.GetAttribute() in (pcbnew.PAD_ATTRIB_PTH, pcbnew.PAD_ATTRIB_NPTH) and not same:
                            pass
                        else:
                            continue
                    hole = pad.GetAttribute() == pcbnew.PAD_ATTRIB_NPTH
                    r = 0 if same else infl + (0.1 if hole else 0.0)
                    target = own if same else occ
                    mark(target, li, pcbnew.ToMM(box.GetLeft()) - r, pcbnew.ToMM(box.GetTop()) - r,
                         pcbnew.ToMM(box.GetRight()) + r, pcbnew.ToMM(box.GetBottom()) + r)
        for t in self.b.GetTracks():
            same = t.GetNetname() == net
            if t.GetClass() == "PCB_VIA":
                for li in range(L):
                    seg(own if same else occ, li, t.GetPosition(), t.GetPosition(),
                        (0 if same else infl) + pcbnew.ToMM(t.GetWidth()) / 2)
            else:
                li = self.layers.index(t.GetLayer()) if t.GetLayer() in self.layers else None
                if li is None:
                    continue
                seg(own if same else occ, li, t.GetStart(), t.GetEnd(),
                    (0 if same else infl) + pcbnew.ToMM(t.GetWidth()) / 2)
        # vias need room for their own diameter on every layer
        via_extra = max(0.0, self.via_d / 2 - self.width / 2)
        return occ & ~own, own, via_extra

    def route(self, net, start, goal, start_layer, goal_layer, via_at_goal=False):
        occ, own, via_extra = self.build(net)
        L = len(self.layers)
        vx = int(math.ceil(via_extra / RES))
        sl = self.layers.index(start_layer) if start_layer in self.layers else 0
        gl = self.layers.index(goal_layer) if goal_layer in self.layers else 0
        s = (sl, *self.cell(*start)[::-1])
        g = (gl, *self.cell(*goal)[::-1])
        k = int(0.3 / RES)  # free the pad's own escape area (own-net copper is never an obstacle)
        for li, j, i in ((s,) if via_at_goal else (s, g)):
            occ[li, max(0, j - k):j + k + 1, max(0, i - k):i + k + 1] &= ~own[li, max(0, j - k):j + k + 1, max(0, i - k):i + k + 1]
            occ[li, max(0, j - 2):j + 3, max(0, i - 2):i + 3] = False
        if via_at_goal and (occ[g[0], g[1], g[2]] or not self._via_free(occ, g[1], g[2], vx)):
            return None

        def via_ok(j, i):
            return self._via_free(occ, j, i, vx)

        moves = [(0, 1, 1.0), (0, -1, 1.0), (1, 0, 1.0), (-1, 0, 1.0),
                 (1, 1, 1.414), (1, -1, 1.414), (-1, 1, 1.414), (-1, -1, 1.414)]
        h = lambda n: 1.3 * math.hypot(n[1] - g[1], n[2] - g[2])  # noqa: E731  (weighted A*)
        openq = [(h(s), 0.0, s)]
        came = {s: None}
        cost = {s: 0.0}
        limit = 12_000_000
        while openq and limit:
            limit -= 1
            _, c, node = heapq.heappop(openq)
            if node[1:] == g[1:] and (node[0] == g[0] or own[g[0], g[1], g[2]]):
                if node[0] != g[0]:
                    node = (g[0], *node[1:]) if (g[0], *node[1:]) in came else node
                path = []
                while node is not None:
                    path.append(node)
                    node = came[node]
                return path[::-1]
            li, j, i = node
            nbrs = []
            for dj, di, w in moves:
                nj, ni = j + dj, i + di
                if 0 <= nj < self.ny and 0 <= ni < self.nx and not occ[li, nj, ni]:
                    nbrs.append(((li, nj, ni), w))
            if via_ok(j, i):
                for nl in range(L):
                    if nl != li:
                        nbrs.append(((nl, j, i), 40.0 * 0.05 / RES))
            for n, w in nbrs:
                nc = c + w
                if nc < cost.get(n, 1e18):
                    cost[n] = nc
                    came[n] = node
                    heapq.heappush(openq, (nc + h(n), nc, n))
        return None

    @staticmethod
    def _via_free(occ, j, i, vx):
        j0, i0 = max(0, j - vx), max(0, i - vx)
        return not occ[:, j0:j + vx + 1, i0:i + vx + 1].any()

    def commit(self, net, path, width, via_d, via_drill):
        ni = self.b.FindNet(net)
        added = 0
        pts = [(li, self.x0 + i * RES, self.y0 + j * RES) for li, j, i in path]
        # simplify: keep points where direction or layer changes
        keep = [pts[0]]
        for a, b, c in zip(pts, pts[1:], pts[2:]):
            if a[0] != b[0] or b[0] != c[0]:
                keep.append(b)
                continue
            d1 = (b[1] - a[1], b[2] - a[2])
            d2 = (c[1] - b[1], c[2] - b[2])
            if abs(d1[0] * d2[1] - d1[1] * d2[0]) > 1e-9:
                keep.append(b)
        keep.append(pts[-1])
        for a, b in zip(keep, keep[1:]):
            if a[0] != b[0]:
                v = pcbnew.PCB_VIA(self.b)
                v.SetPosition(pcbnew.VECTOR2I(mm(a[1]), mm(a[2])))
                v.SetWidth(mm(via_d)); v.SetDrill(mm(via_drill))
                v.SetViaType(pcbnew.VIATYPE_THROUGH); v.SetLayerPair(pcbnew.F_Cu, pcbnew.B_Cu)
                v.SetNet(ni); self.b.Add(v); added += 1
                continue
            if (a[1], a[2]) == (b[1], b[2]):
                continue
            t = pcbnew.PCB_TRACK(self.b)
            t.SetStart(pcbnew.VECTOR2I(mm(a[1]), mm(a[2]))); t.SetEnd(pcbnew.VECTOR2I(mm(b[1]), mm(b[2])))
            t.SetWidth(mm(width)); t.SetLayer(self.layers[a[0]]); t.SetNet(ni)
            self.b.Add(t); added += 1
        return added


def repair(board_path: str, report: str, clearance=0.2, width=0.2, via_d=0.6, via_drill=0.3, log=print) -> int:
    b = pcbnew.LoadBoard(board_path)
    grid = Grid(b, clearance, width, via_d)
    fixed = 0
    for a, c in parse_unconnected(report):
        net = a[3] if a[2] != "Zone" else c[3]
        ends = [x for x in (a, c) if x[2] != "Zone"]
        if not ends:
            log(f"  skip zone-zone island on {net}")
            continue
        if len(ends) == 1:
            # pad/track isolated from its pour: run a stub to a free spot and drop a via to the planes
            x, y, _, _, layer = ends[0]
            lid = b.GetLayerID(layer)
            best = None
            for r in (0.8, 1.2, 1.6, 2.0, 2.5, 3.0):
                for k in range(16):
                    ang = 2 * math.pi * k / 16
                    px, py = x + r * math.cos(ang), y + r * math.sin(ang)
                    path = grid.route(net, (x, y), (px, py), lid, lid, via_at_goal=True)
                    if path:
                        best = path
                        break
                if best:
                    break
            if best:
                grid.commit(net, best, width, via_d, via_drill)
                end = best[-1]
                v = pcbnew.PCB_VIA(b)
                v.SetPosition(pcbnew.VECTOR2I(mm(grid.x0 + end[2] * RES), mm(grid.y0 + end[1] * RES)))
                v.SetWidth(mm(via_d)); v.SetDrill(mm(via_drill)); v.SetViaType(pcbnew.VIATYPE_THROUGH)
                v.SetLayerPair(pcbnew.F_Cu, pcbnew.B_Cu); v.SetNet(b.FindNet(net)); b.Add(v)
                fixed += 1
                log(f"  stitched {net} at ({x:.2f},{y:.2f})")
            else:
                log(f"  FAILED stitch {net} at ({x:.2f},{y:.2f})")
            continue
        (x0, y0, _, _, l0), (x1, y1, _, _, l1) = ends
        path = grid.route(net, (x0, y0), (x1, y1), b.GetLayerID(l0), b.GetLayerID(l1))
        if path:
            grid.commit(net, path, width, via_d, via_drill)
            fixed += 1
            log(f"  routed {net}: ({x0:.2f},{y0:.2f}) -> ({x1:.2f},{y1:.2f}), {len(path)} steps")
        else:
            log(f"  FAILED {net}: ({x0:.2f},{y0:.2f}) -> ({x1:.2f},{y1:.2f})")
    pcbnew.ZONE_FILLER(b).Fill(b.Zones())
    pcbnew.SaveBoard(board_path, b)
    return fixed


def fanout(board_path: str, nets, clearance=0.2, width=0.25, via_d=0.6, via_drill=0.3, reuse_r=1.0, log=print) -> dict:
    """Give every SMD pad of each plane net a short stub to its own via (or reuse a same-net via
    within `reuse_r` mm). THT pads already reach every layer."""
    b = pcbnew.LoadBoard(board_path)
    grid = Grid(b, clearance, width, via_d)
    stats = {}
    all_vias = [t.GetPosition() for t in b.GetTracks() if t.GetClass() == "PCB_VIA"]
    holes = [p.GetPosition() for fp in b.GetFootprints() for p in fp.Pads() if p.GetDrillSize().x > 0]
    min_pitch = via_d + 0.3  # keeps hole-to-hole >= 0.25 mm and copper apart

    def spot_ok(px, py):
        for q in all_vias + holes:
            if math.hypot(pcbnew.ToMM(q.x) - px, pcbnew.ToMM(q.y) - py) < min_pitch:
                return False
        return True

    for net in nets:
        ok = fail = 0
        ni = b.FindNet(net)
        vias = [t.GetPosition() for t in b.GetTracks() if t.GetClass() == "PCB_VIA" and t.GetNetname() == net]
        for fp in b.GetFootprints():
            for pad in fp.Pads():
                if pad.GetNetname() != net or pad.GetAttribute() != pcbnew.PAD_ATTRIB_SMD:
                    continue
                c = pad.GetPosition()
                if any(math.hypot(pcbnew.ToMM(v.x - c.x), pcbnew.ToMM(v.y - c.y)) < reuse_r for v in vias):
                    ok += 1
                    continue
                lid = pad.GetLayer()
                x, y = pcbnew.ToMM(c.x), pcbnew.ToMM(c.y)
                best = None
                for r in (0.7, 1.0, 1.4, 1.9, 2.5):
                    for k in range(12):
                        a = 2 * math.pi * k / 12
                        gx, gy = x + r * math.cos(a), y + r * math.sin(a)
                        if not spot_ok(gx, gy):
                            continue
                        path = grid.route(net, (x, y), (gx, gy), lid, lid, via_at_goal=True)
                        if path:
                            best = path
                            break
                    if best:
                        break
                if not best:
                    fail += 1
                    continue
                grid.commit(net, best, width, via_d, via_drill)
                end = best[-1]
                pos = pcbnew.VECTOR2I(mm(grid.x0 + end[2] * RES), mm(grid.y0 + end[1] * RES))
                v = pcbnew.PCB_VIA(b)
                v.SetPosition(pos); v.SetWidth(mm(via_d)); v.SetDrill(mm(via_drill))
                v.SetViaType(pcbnew.VIATYPE_THROUGH); v.SetLayerPair(pcbnew.F_Cu, pcbnew.B_Cu); v.SetNet(ni)
                b.Add(v)
                vias.append(pos)
                all_vias.append(pos)
                ok += 1
        stats[net] = (ok, fail)
        log(f"  fanout {net}: {ok} pads connected, {fail} failed")
    pcbnew.SaveBoard(board_path, b)
    return stats
