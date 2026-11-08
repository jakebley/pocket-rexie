"""Fox archetypes (16x16, facing right, ground on row 15), built from parts so ears, snout and tail can be tuned.
Baked into plain row strings so they plug into the same pipeline as the hand-drawn dino templates.
anchors: head=(x,y,r) head centre, eye=(x,y) hole, body=(x0,x1) span for back details."""
import math

W = 16

class _G:
    """Drawing surface with a size factor k: coordinates are given for the full-size fox and mapped so the
    animal stands on row 15 and is centred, scaled by k."""
    def __init__(self, k=1.0):
        self.p = [[0] * W for _ in range(W)]
        self.k = k
        self.ox = (W - 1) / 2 * (1 - k)
    def T(self, x, y): return self.ox + x * self.k, 15 - (15 - y) * self.k
    def set(self, x, y, v=1):
        x, y = self.T(x, y)
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < W: self.p[y][x] = v
    def _raw(self, x, y, v=1):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < W: self.p[y][x] = v
    def ell(self, cx, cy, rx, ry, v=1):
        cx, cy = self.T(cx, cy); rx = max(0.8, rx * self.k); ry = max(0.8, ry * self.k)
        for y in range(W):
            for x in range(W):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0: self.p[y][x] = v
    def tri(self, x0, y0, x1, y1, x2, y2, v=1, min_h=0):
        (x0, y0), (x1, y1), (x2, y2) = self.T(x0, y0), self.T(x1, y1), self.T(x2, y2)
        if min_h:  # keep thin features visible at small sizes: the tip (the highest point) must rise at least min_h
            top = min(y0, y1, y2); base = max(y0, y1, y2)
            if base - top < min_h:
                if y1 == top: y1 = base - min_h
                elif y0 == top: y0 = base - min_h
                else: y2 = base - min_h
        def side(ax, ay, bx, by, px, py): return (bx - ax) * (py - ay) - (by - ay) * (px - ax)
        for y in range(W):
            for x in range(W):
                d1 = side(x0, y0, x1, y1, x, y); d2 = side(x1, y1, x2, y2, x, y); d3 = side(x2, y2, x0, y0, x, y)
                if not ((d1 < 0 or d2 < 0 or d3 < 0) and (d1 > 0 or d2 > 0 or d3 > 0)): self.p[y][x] = v
    def line(self, x0, y0, x1, y1, v=1):
        (x0, y0), (x1, y1) = self.T(x0, y0), self.T(x1, y1)
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
        for i in range(n + 1):
            t = i / n; self._raw(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, v)
    def rows(self):
        return ["".join("X" if c else "." for c in r) for r in self.p]

def _stand(k=1.0, ear=3, snout=3, tail=3.2, body_h=3.0, fluff=0):
    g = _G(k)
    # plume tail: a fat curve rising behind the rump
    g.ell(2.5, 7.0, tail * 0.75, tail * 1.3)
    g.ell(3.5, 5.0, tail * 0.55, tail * 0.9)
    # body and haunch
    g.ell(7.2, 9.6, 5.0 + fluff, body_h)
    # neck and head
    g.line(10, 8, 12, 5.5); g.line(10, 9, 12, 6.5)
    g.ell(12.0, 5.0, 2.4, 2.1)
    # pointed snout
    g.tri(13, 4.3, 13, 6.4, 13 + snout, 5.8, min_h=0)
    # tall pointed ears
    g.tri(10.3, 3.4, 10.8, 0.2 + (3 - ear), 12.3, 3.2, min_h=2)
    g.tri(12.3, 3.2, 13.6, 0.0 + (3 - ear), 14.3, 3.6, min_h=2)
    # thin legs
    for x in (5.0, 7.0, 10.0, 12.0):
        for y in range(11, 15): g.set(x, y)
        g.set(x - 0.6, 15); g.set(x + 0.4, 15)
    return g

def _sit(k=1.0, ear=3, snout=2, tail=3.0, fluff=0):
    """Sitting in profile facing right: narrow upright body, tall ears, pointed snout, plume tail rising behind."""
    g = _G(k)
    # haunch, chest and neck as one narrow column
    g.ell(6.4, 11.4, 3.3 + fluff * 0.5, 3.6)
    g.ell(8.2, 8.4, 2.1, 3.0)
    g.line(8.0, 7.0, 8.6, 5.5)
    # plume tail rising behind the back
    g.ell(2.6, 9.6, tail * 0.55, tail * 1.15)
    g.ell(2.0, 6.4, tail * 0.42, tail * 0.8)
    # head with pointed snout and tall ears
    g.ell(9.0, 4.2, 2.3, 2.0)
    g.tri(10.6, 3.6, 10.6, 5.4, 10.6 + snout + 1.5, 5.0)
    g.tri(7.2, 3.0, 7.6, 0.0 + (3 - ear), 9.0, 2.6, min_h=2)
    g.tri(9.0, 2.6, 10.4, 0.0 + (3 - ear), 10.9, 3.2, min_h=2)
    # front paws and base
    g.line(9.2, 10.5, 9.2, 14.5)
    for x in range(4, 12): g.set(x, 15)
    return g

SIZES = {1: 0.58, 2: 0.7, 3: 0.86, 4: 1.0, 5: 1.0}

def _T(k, x, y):
    return (W - 1) / 2 * (1 - k) + x * k, 15 - (15 - y) * k

def _build(fn, head, eye, body, **kw):
    """Build the archetype natively at every stage size (no averaging, so thin features survive)."""
    by = {}
    for stage, k in SIZES.items():
        g = fn(k=k, **kw)
        hx, hy = _T(k, head[0], head[1]); ex, ey = _T(k, eye[0], eye[1])
        g._raw(ex, ey, 0)
        by[stage] = dict(rows=g.rows(), head=(hx, hy, max(1.6, head[2] * k)), eye=(round(ex), round(ey)),
                         body=(_T(k, body[0], 0)[0], _T(k, body[1], 0)[0]))
    return dict(by_stage=by)

ARCH_FOX = {
 'fox_stand':   _build(_stand, (12, 5, 2.4), (12, 4), (3, 11)),
 'fox_fennec':  _build(_stand, (12, 5, 2.4), (12, 4), (3, 11), ear=3.0, snout=2, tail=2.6, body_h=2.4),
 'fox_sit':     _build(_sit, (9, 4.2, 2.3), (9, 3), (3, 11)),
 'fox_arctic':  _build(_sit, (9, 4.2, 2.3), (9, 3), (3, 12), ear=1.8, snout=1, tail=3.6, fluff=1.6),
 'fox_kitsune': _build(_sit, (9, 4.2, 2.3), (9, 3), (3, 11), ear=3.2, snout=2, tail=2.6),
}
