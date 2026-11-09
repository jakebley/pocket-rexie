"""Bird art (16x16, facing right, ground on row 15). Each species is drawn by hand from its own shapes (head circle,
hooked or flat beak, neck, body, tail, wing line, legs) instead of one generic bird builder: raptors get a big head, brow
ridge, hooked beak and talons; songbirds a clear tail and beak; waterfowl distinct necks. The six hatchlings and chicks
are plain ASCII. Eyes are holes (the renderer fills them in Technicolor); the blink frame changes only the eye.
Also registers the bird_* decorations (EXTRA_HANDLERS)."""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from archetypes_fox import W
import spritegen

def _seg_d(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    L = dx * dx + dy * dy
    t = 0.0 if L == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / L))
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))

class Cv:
    """Pixel canvas. All shapes are given in full-size coordinates and mapped by the size factor s (about the ground row)."""
    def __init__(self, s=1.0):
        self.g = [[0] * W for _ in range(W)]; self.s = s; self.eye = None
    def T(self, x, y): return 7.5 + (x - 7.5) * self.s, 15 - (15 - y) * self.s
    def _each(self, fn, v):
        for y in range(W):
            for x in range(W):
                if fn(x, y): self.g[y][x] = v
    def ell(self, cx, cy, rx, ry, v=1):
        cx, cy = self.T(cx, cy); rx = max(0.8, rx * self.s); ry = max(0.8, ry * self.s)
        self._each(lambda x, y: ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0, v)
    def poly(self, pts, v=1, fat=0.0):
        P = [self.T(*p) for p in pts]; n = len(P)
        def inside(x, y):
            c = False
            for i in range(n):
                (x0, y0), (x1, y1) = P[i], P[(i + 1) % n]
                if (y0 > y) != (y1 > y) and x < (x1 - x0) * (y - y0) / (y1 - y0) + x0: c = not c
            return c
        def near(x, y):
            return fat > 0 and min(_seg_d(x, y, *P[i], *P[(i + 1) % n]) for i in range(n)) <= fat
        self._each(lambda x, y: inside(x, y) or near(x, y), v)
    def ln(self, x0, y0, x1, y1, w=0.55, v=1):
        (x0, y0), (x1, y1) = self.T(x0, y0), self.T(x1, y1)
        self._each(lambda x, y: _seg_d(x, y, x0, y0, x1, y1) <= w, v)
    def px(self, x, y, v=1):
        x, y = self.T(x, y); x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < W: self.g[y][x] = v
    def raw(self, x, y, v=1):
        if 0 <= x < W and 0 <= y < W: self.g[y][x] = v
    def set(self, x, y, v='X'):
        self.raw(int(round(x)), int(round(y)), 1 if v == 'X' else 0)
    def line(self, x0, y0, x1, y1, v='X', thick=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
        for i in range(n + 1):
            t = i / n
            for d in range(thick): self.set(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + d, v)
    def legs(self, xs, top, toe=2):
        """One pixel wide legs from y=top to the ground, with a toe pixel forward (and back for talons)."""
        for x in xs:
            tx, ty = self.T(x, top); tx = int(round(tx))
            for y in range(int(round(ty)), 15): self.raw(tx, y)
            self.raw(tx, 15)
            for d in range(1, toe + 1): self.raw(tx + d, 15)
    def eyehole(self, x, y):
        x, y = self.T(x, y); self.eye = (int(round(x)), int(round(y)))

def _entry(c):
    g = c.g
    ex, ey = c.eye; g[ey][ex] = 0
    out = [''.join('X' if v else '.' for v in r) for r in g]
    xs = [i for r in out for i, ch in enumerate(r) if ch == 'X']
    return dict(rows=out, head=(ex - 1.0, ey + 0.5, 2.5), eye=(ex, ey), body=(min(xs), max(xs)))

def _from_cv(c):
    e = _entry(c)
    return dict(by_stage={s: e for s in range(1, 6)})

def _art(rows, x=0, post=None):
    """ASCII (X ink, . empty, e eye hole) bottom-aligned on the ground row, left offset x."""
    rows = list(rows); assert len(rows) <= W
    c = Cv(1.0)
    top = W - len(rows)
    for ry, r in enumerate(rows):
        for cx, ch in enumerate(r.rstrip(".")):
            assert x + cx < W, (r, x)
            if ch == 'X': c.g[top + ry][x + cx] = 1
            elif ch == 'e': c.eye = (x + cx, top + ry)
    assert c.eye
    if post: post(c)
    return _from_cv(c)

ART = {}
def species(name, s=1.0):
    def deco(fn):
        c = Cv(s); fn(c); ART[name] = _from_cv(c); return fn
    return deco
# ---- stage 1 ----------------------------------------------------------------------------------------------
ART['downy'] = _art([
 "..XX......",
 ".XXXXX....",
 "XXXXXXXX..",
 "XXXXXeXXXX",
 "XXXXXXXXX.",
 "XXXXXXXX..",
 ".XXXXXX...",
 "..X..X....",
 ".XX.XX....",
], x=3)
ART['pipkin'] = _art([
 ".....XX....",
 "X.XXXXXX...",
 "XXXXXXXXX..",
 "XXXXXXeXXXX",
 ".XXXXXXXXX.",
 ".XXX.XXXXX.",
 ".XXXXXXXX..",
 "..XX..XX...",
 ".XXX.XXX...",
], x=2)
# ---- stage 2 ----------------------------------------------------------------------------------------------
ART['chirp'] = _art([
 ".......X....",
 "......XXX...",
 ".....XXXXX..",
 ".....XXXeXXX",
 "X....XXXXX..",
 "XX..XXXXXXX.",
 ".XXXXXXXXXX.",
 ".XXX...XXXX.",
 "..XXXXXXXX..",
 "...XX.XX....",
], x=2)
ART['owlet'] = _art([
 ".XXXXXXXX.",
 "XXXXXXXXXX",
 "XXeXXXXeXX",
 "XXXXXXXXXX",
 "XXXXXXXXXX",
 "XXX.XX.XXX",
 "XXX.XX.XXX",
 ".XXXXXXXX.",
 "..XX..XX..",
], x=3)
ART['ducklet'] = _art([
 ".......XXX..",
 "......XXXXX.",
 "......XeXXXXX",
 "......XXXXX..",
 "......XXXX...",
 "X....XXXXXX..",
 "XXXXXXXXXXXX",
 ".XXXXXXXXXX.",
 "..XXXXXXXX..",
 "...XX..XX...",
], x=1)
ART['scruff'] = _art([
 "..X.X.......",
 ".XXXXX.XX...",
 "XXXXXXXXXXX.",
 "XXXXXXXXeXXX",
 ".XXXXXXXXXX.",
 ".XXXXXXXXX..",
 "..XXXXXXXX..",
 "...X..X.....",
 "..XX.XX.....",
], x=2)
# ---- raptors -----------------------------------------------------------------------------------------------
ART['hawk'] = _art([
 "......XXXXX.....",
 ".....XXXXXXXX...",
 ".....XXXXXXXXX..",
 ".....XXXeXXXXXX.",
 ".....XXXXXX.XXX.",
 "......XXXXX...X.",
 "....XXXXXXXXX...",
 "...XXXXXX..XXX..",
 "...XXXXX..XXXX..",
 "..XXXXX..XXXXX..",
 "XXXXXX..XXXXX...",
 "XXXXXXXXXXXXX...",
 ".......X..X.....",
 "......XXX.XXX...",
])
ART['falcon'] = _art([
 "........XXXX....",
 ".......XXXXXXX..",
 ".......XXeXXXXX.",
 ".......XXXXXX.X.",
 "......XXXXXXX...",
 ".....XXXXXXXXX..",
 "....XXXXXXXXXX..",
 "...XXXXXXXXXXX..",
 "..XXXXXXXXXXX...",
 ".XXXXXXXXXXX....",
 "XXXXXXXXXXX.....",
 "XXX.XXXXXX.X....",
 "XX...XX..XX.....",
 "......X.X.......",
])
ART['peregrine'] = _art([
 ".......XXXXX....",
 "......XXXXXXXX..",
 "......XXXXXXXXX.",
 "......XXeXXXXXX.",
 "......XXeXXXXX.",
 "......XXXXXXX.X.",
 ".....XXXXXXXX...",
 "....XXXXXXXXXX..",
 "...XXXXXXXXXXXX.",
 "..XXXXXXXXXXXXX.",
 "..XXXXXXXXXXXX..",
 ".XXXXXXXXXXXX...",
 "XXXXXXXXXXX.....",
 "XXXXXX.XX.XX....",
 ".....XXX.XXX....",
])
ART['harrier'] = _art([
 "......XXXXX.....",
 ".....XXXXXXX....",
 "....XXXXXXXXX...",
 "....XXXeXXXXXX..",
 "....XXXXXXXX.X..",
 ".....XXXXXXX....",
 "....XXXXXXXX....",
 "...XXXXXXXXX....",
 "..XXXXXXXXXX....",
 ".XXXXXXXXXX.....",
 "XXXXXXXXX.......",
 "XXXX.XXX........",
 "XX...X.X........",
 ".....X.X........",
 "....XX.XX.......",
])
ART['kingfisher'] = _art([
 "....XX..........",
 "....XXXXXX......",
 ".....XXXXXXXXXX.",
 ".....XXeXXXXXXXX",
 ".....XXXXXX.....",
 ".....XXXXXX.....",
 "....XXXXXXX.....",
 "....XXXXXXXX....",
 "....XXXXXXXX....",
 "....XXXXXXX.....",
 "...XXXXXX.......",
 "...XXXX.........",
 ".......X.X......",
 "......XX.XX.....",
])
# ---- songbirds ---------------------------------------------------------------------------------------------
ART['sparrow'] = _art([
 "........XXXX....",
 ".......XXXXXX...",
 ".......XXXeXXXX.",
 ".......XXXXXX...",
 "....XXXXXXXXXX..",
 "...XXXXXXXXXXX..",
 "..XXXXXXXXXXXX..",
 "XXXXX...XXXXX...",
 "XXXXXXXXXXXXX...",
 "XX..XXXXXXXXX...",
 "......X..X......",
 ".....XX.XX......",
], x=1)
ART['robin'] = _art([
 "........XXXX....",
 ".......XXXXXX...",
 ".......XXXeXXXX.",
 ".......XXXXXXX..",
 "XX....XXXXXXXXX.",
 "XXX..XXXXXXXXXX.",
 ".XXXXXXXXXXXXXX.",
 "..XXXXX...XXXXX.",
 "..XXXXXXXXXXXXX.",
 "...XXXXXXXXXXX..",
 "....XXXXXXXXX...",
 ".......X..X.....",
 "......XX.XX.....",
])
ART['finch'] = _art([
 "......XX........",
 "......XXXXXX....",
 ".......XXXXXX...",
 ".......XXXeXXXX.",
 ".......XXXXXXX..",
 "......XXXXXXX...",
 "....XXXXXXXXXX..",
 "...XXXXXXXXXXX..",
 "..XXXXX..XXXXX..",
 ".XXXXXXXXXXXX...",
 "XXXXXXXXXX......",
 "XX.XX.XXX.......",
 ".......X..X.....",
 "......XX.XX.....",
], x=0)
ART['lark'] = _art([
 ".............XX.",
 ".............X..",
 ".......XX...XX..",
 ".......XXXXXX...",
 "......XXXXXXXX..",
 "......XXXXeXXXX.",
 "......XXXXXXXX..",
 ".....XXXXXXXXX..",
 "....XXXXXXXXXX..",
 "...XXXXXXXXXXX..",
 "..XXXXXXXXXXX...",
 ".XXXXXXXXXXX....",
 "XXXXXXXXXX......",
 "XXX.XXXXXX......",
 ".......X..X.....",
 "......XX.XX.....",
])
ART['jay'] = _art([
 "..........X.....",
 ".........XXX....",
 "........XXXXX...",
 ".......XXXXXXXX.",
 "......XXXXXXXXX.",
 "......XXXXeXXXXX",
 "......XXXXXXXXX.",
 "......XXXXXXXX..",
 "....XXXXXXXXXXX.",
 "...XXXXXXXXXXXX.",
 "..XXXXXXX.XXXXX.",
 ".XXXXXXXXXXXXX..",
 "XXXXX.XXXXXXX...",
 "XXXX..XXXXXX....",
 ".XX....X..X.....",
 "......XX.XX.....",
])
ART['nightingale'] = _art([
 ".........XXXX...",
 "........XXXXXX..",
 "........XXeXXXX.",
 "........XXXXXX..",
 "......XXXXXXXXX.",
 "....XXXXXXXXXX..",
 "..XXXXXXXXXXX...",
 "XXXXXXXXXXXX....",
 "XXXXXXXXXXX.....",
 "..XX.XXXXX......",
 ".......X.X......",
 ".......X.X......",
 ".......X.X......",
 "......XX.XX.....",
])
# ---- waterfowl ---------------------------------------------------------------------------------------------
ART['mallard'] = _art([
 "..........XXX...",
 ".........XXXXX..",
 ".........XXeXXXX",
 ".........XXXXX..",
 "..........XXX...",
 "X.....XXXXXXXX..",
 "XX.XXXXXXXXXXXX.",
 "XXXXXXXXXXXXXXX.",
 ".XXXXXXXXXXXXXX.",
 "..XXXXXXXXXXXX..",
 "....X.X.........",
 "...XX.XX........",
])
ART['teal'] = _art([
 "..........XXX...",
 ".........XXeXXX.",
 ".........XXXXX..",
 "..........XX....",
 "......XXXXXXXX..",
 "XX..XXXXXXXXXX..",
 "XXXXXXXXXXXXXX..",
 ".XXXXXXXXXXXX...",
 "..XXXXXXXXXX....",
 ".....X..X.......",
 "....XX.XX.......",
])
ART['heron'] = _art([
 "........XXXX....",
 "........XXeXXXXX",
 "........XXXX....",
 ".........XX.....",
 "........XX......",
 "........XX......",
 ".......XXXX.....",
 ".XXXXXXXXXXX....",
 "XXXXXXXXXXXXX...",
 ".XXXXXXXXXXX....",
 "...XXXXXXXX.....",
 ".......X..X.....",
 ".......X..X.....",
 ".......X..X.....",
 "......XX.XX.....",
])
ART['egret'] = _art([
 "........XXXX....",
 "........XeXXXX..",
 "........XXXX....",
 ".......XXX......",
 "......XXX.......",
 ".......XXX......",
 "........XXX.....",
 "..XXXXXXXXXX....",
 "XXXXXXXXXXXX....",
 ".XXXXXXXXXXX....",
 "..XXXXXXXXX.....",
 ".......X..X.....",
 ".......X..X.....",
 ".......X..X.....",
 "......XX.XX.....",
], post=lambda c: (c.line(5, 7, 0, 12, 'X', 1), c.line(6, 8, 1, 14, 'X', 1)))
ART['swan'] = _art([
 "..........XXX...",
 ".........XeXXXX.",
 ".........XXXX...",
 "........XXX.....",
 ".......XXX......",
 ".......XXX......",
 "........XXX.....",
 "....XXX..XXXX...",
 "..XXXXXXXXXXXX..",
 ".XXXXXXXXXXXXXX.",
 "XXXXXXXXXXXXXX..",
 ".XXXXXXXXXXXX...",
 "..XXXXXXXXXX....",
 "......X..X......",
 ".....XX.XX......",
])
ART['goose'] = _art([
 "..........XXXX..",
 ".........XXeXXX.",
 ".........XXXXX..",
 ".........XXXX...",
 "........XXXX....",
 "......XXXXXX....",
 ".XXXXXXXXXXXXX..",
 "XXXXXXXXXXXXXXX.",
 "XXXXXXXXXXXXXX..",
 ".XXXXXXXXXXXX...",
 "..XXXXXXXXXX....",
 "......X..X......",
 "......X..X......",
 ".....XX.XX......",
])
# ---- strays ------------------------------------------------------------------------------------------------
ART['dustling'] = _art([
 "..........XXX...",
 ".........XXXXX..",
 "...X.X...XXeXXX.",
 "..XXXXXX.XXXXX..",
 "..XXXXXXXXXXXXX.",
 ".XXXXXXXXXXXXXX.",
 "XXXXXXXXXXXXXX..",
 "XXXXXXXXXXXXX...",
 ".XXXXXXXXXXX....",
 "......X..X......",
 ".....XX.XX......",
])
ART['sootwing'] = _art([
 "XX.X.X..........",
 "XXXXXXXX........",
 ".XXXXXXXXXX.....",
 "..XXXXXXXXXXXX..",
 "...XXXXXXXXXXXX.",
 "...XXXXXXXXXeXXX",
 "....XXXXXXXXXXXX",
 ".....XXXXXX..XXX",
 "......X..X....X.",
 ".....XX.XX......",
])
ART['ledgewing'] = _art([
 "..........XXX...",
 ".........XXXXX..",
 ".........XXeXXX.",
 ".........XXXXX..",
 "........XXXXXX..",
 "...XXXXXXXXXXXX.",
 "..XXXXXXXXXXXXX.",
 "XXXXXXXXXXXXXXX.",
 "XXXXXXXXXXXXXX..",
 "XXXXXXXXXXXXX...",
 ".XXXXXXXXXXX....",
 "......X..X......",
 ".....XX.XX......",
])
ART['tatterdove'] = _art([
 "........XXX.....",
 ".......XXXXX....",
 ".......XXeXXXX..",
 ".......XXXXX....",
 "....X.XXXXXXX...",
 "...XXXXXXXXXXX..",
 "..XXXXXXXXXXXX..",
 ".XXXXXXXXXXXX...",
 "XX.XXXXXXXXXX...",
 "X..XXXXXXXXX....",
 "...XXXXXXXX.....",
 "......X..X......",
 ".....XX.XX......",
])
# ---- owls --------------------------------------------------------------------------------------------------
ART['owl'] = _art([
 ".X........X.",
 ".XXXXXXXXXX.",
 "XXXXXXXXXXXX",
 "XXXeXXXXeXXX",
 "XXXXXXXXXXXX",
 "XXXXXXXXXXXX",
 "XXXXXXXXXXXX",
 "XX.XXXXXX.XX",
 "XX.XXXXXX.XX",
 "XX.XXXXXX.XX",
 ".XX.XXXX.XX.",
 "..XXXXXXXX..",
 "...XX..XX...",
], x=2)
ART['hornowl'] = _art([
 "..X........X..",
 "..XX......XX..",
 ".XXXXXXXXXXXX.",
 "XXXXXXXXXXXXXX",
 "XXXeXXXXXXeXXX",
 "XXXXXXXXXXXXXX",
 "XXXXXXXXXXXXXX",
 "XXXXXXXXXXXXXX",
 "XX.XXXXXXXX.XX",
 "XX.XXXXXXXX.XX",
 "XX.XXXXXXXX.XX",
 ".XX.XXXXXX.XX.",
 ".XX.XXXXXX.XX.",
 "..XXXXXXXXXX..",
 "...XXX..XXX...",
], x=1)
# ---- ultimates ---------------------------------------------------------------------------------------------
def _ember(c):
    c.line(8, 4, 4, 1, 'X', 2)                       # swept-back flame plume
    c.line(4.5, 9, 0, 3, 'X', 2); c.line(4, 11, 0, 8, 'X', 2); c.line(4.5, 12, 0, 13, 'X', 2)   # three flame tail feathers
ART['emberwing'] = _art([
 ".........XXXX...",
 "........XXXXXX..",
 "........XXeXXXXX",
 "........XXXXXX..",
 ".....XXXXXXXXX..",
 "....XXXXXXXXXXX.",
 "...XXXXXXXXXXXX.",
 "...XXXXXXXXXXX..",
 "....XXXXXXXXX...",
 "....XXXXXXX.....",
 "......X..X......",
 "......X..X......",
 ".....XX.XX......",
], post=_ember)
def _fanp(c):
    for (x, y) in ((0, 2), (0, 4), (0, 6), (0, 8), (0, 10), (0, 12), (1, 14)):
        c.line(6, 10, x, y, 'X', 1)
ART['prismlark'] = _art([
 "..........X.....",
 ".........XXX....",
 "........XXXXX...",
 ".......XXXXXXXX.",
 "......XXXXeXXXX.",
 "......XXXXXXXX..",
 ".....XXXXXXXXX..",
 "....XXXXXXXXXX..",
 "....XXXXXXXXXX..",
 "....XXXXXXXXX...",
 ".....XXXXXXX....",
 "......X..X......",
 ".....XX.XX......",
], post=_fanp)
def _storm(c):
    c.line(7, 9, 1, 2, 'X', 3)                      # one big raised wing, three finger feathers at the tip
    c.line(0, 1, 2, 1, 'X', 1)
    for (x, y) in ((0, 4), (1, 6)): c.set(x, y, '.')
    c.set(0, 3, 'X'); c.set(0, 5, 'X')
ART['stormtalon'] = _art([
 ".......XXXXX....",
 "......XXXXXXXX..",
 "......XXXXXXXXX.",
 "......XXXeXXXXXX",
 "......XXXXXX.XXX",
 ".......XXXXX...X",
 ".....XXXXXXXXX..",
 "....XXXXXXXXXX..",
 "....XXXXXXXXXX..",
 "....XXXXXXXXX...",
 ".....XXXXXXXX...",
 "....XXXXXXXX....",
 ".....X.X.X......",
 "....XXX.XXX.....",
], post=_storm)
ART['moonfeather'] = _art([
 "...XXXXXXXXXX...",
 "..X..........X..",
 "..XX......XX....",
 ".XXXXXXXXXXXX...",
 "XXXXXXXXXXXXXX..",
 "XXXeXXXXXXeXXX..",
 "XXXXXXXXXXXXXX..",
 "XXXXXXXXXXXXXX..",
 "XXXXXXXXXXXXXX..",
 "XX.XXXXXXXX.XX..",
 "XX.XXXXXXXX.XX..",
 "XXX.XXXXXX.XXX..",
 ".XXX.XXXX.XXX...",
 "..XXXXXXXXXX....",
 "...XXX..XXX.....",
], x=1)
ART['duskdove'] = _art([
 "........XXXX....",
 ".......X....X...",
 "................",
 ".........XXX....",
 "........XXXXX...",
 "........XXeXXX..",
 "........XXXXX...",
 ".......XXXXXXX..",
 "..XXXXXXXXXXXXX.",
 ".XXXXXXXXXXXXXX.",
 ".XXXXXXXXXXXXX..",
 ".XXXXXXXXXXXX...",
 "..XXXXXXXXXX....",
 "......X..X......",
 ".....XX.XX......",
], post=lambda c: (c.line(5, 9, 0, 3, 'X', 2), c.line(4, 10, 0, 7, 'X', 2), c.line(4, 11, 0, 11, 'X', 2), c.line(4, 12, 0, 14, 'X', 1), c.set(2, 9, '.'), c.set(1, 8, '.')))
ART['snowcrest'] = _art([
 "..........X.X.X.",
 "..........XXXXX.",
 ".........XeXXXXX",
 ".........XXXXX..",
 "........XXX.....",
 ".......XXX......",
 ".......XXX......",
 "........XXX.....",
 "..XX...XXXXX....",
 ".XXXXXXXXXXXXX..",
 "XXXXXXXXXXXXXXX.",
 "XXXXXXXXXXXXXX..",
 ".XXXXXXXXXXXX...",
 "..XXXXXXXXXX....",
 "......X..X......",
 ".....XX.XX......",
], post=lambda c: (c.line(7, 8, 3, 4, 'X', 3)))
ART['tidecrane'] = _art([
 "........XXX.....",
 ".......XXeXXXXXX",
 ".......XXXX.....",
 "........XX......",
 ".......XX.......",
 ".......XX.......",
 "........XXX.....",
 ".XXXXXXXXXXX....",
 "XXXXXXXXXXXXX...",
 ".XXXXXXXXXXX....",
 "...XXXXXXXX.....",
 ".......X..X.....",
 ".......X..X.....",
 ".......X..X.....",
 "......XX.XX.....",
], post=lambda c: (c.line(3, 9, 0, 14, 'X', 2)))

ARCH_BIRD = {'bird_' + k: v for k, v in ART.items()}
spritegen.register_archetypes(ARCH_BIRD)

# ---- decorations -------------------------------------------------------------------------------------------
def _ftri(g, a, b, c, v=1):
    """Filled triangle on a spritegen.G (which has no tri)."""
    def side(p, q, x, y): return (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0])
    for y in range(W):
        for x in range(W):
            d = (side(a, b, x, y), side(b, c, x, y), side(c, a, x, y))
            if not (any(t < 0 for t in d) and any(t > 0 for t in d)): g.set(x, y, v)

def _crest(g, c):
    """Head plume: three feathers sweeping back, each at least 2 px."""
    hx, hy, hr = c['hx'], c['hy'], c['hr']
    g.line(hx + 1, hy - hr + 0.2, hx + 0.4, hy - hr - 2.4); g.line(hx, hy - hr + 0.2, hx - 1.2, hy - hr - 3.2)
    g.line(hx - 1, hy - hr + 0.6, hx - 2.6, hy - hr - 2.2)

def _tip(g):
    xs = [x for y in range(W) for x in range(W) if g.p[y][x]]
    return min(xs)

def _fan(g, c):
    """Tail fan: a filled sector behind the rump with two carved feather gaps."""
    b0 = c['b0']
    bx, by = b0 + 3, 10.5
    _ftri(g, (bx, by - 1), (0, 5), (0, 14)); _ftri(g, (bx, by), (1, 6.5), (1, 13))
    g.line(bx - 1, by, 0, 8.5, 0); g.line(bx - 1, by + 0.5, 0, 11.5, 0)

def _wingspan(g, c):
    """A raised, spread wing behind the back: a filled sweep with carved feather gaps."""
    bx = (c['b0'] + c['b1']) / 2
    sx, sy = bx + 1.5, 8
    _ftri(g, (sx, sy), (bx - 6, 3), (bx + 3, 1)); _ftri(g, (sx, sy), (bx - 6, 3), (bx - 3, 6.5))
    g.line(sx - 1, sy - 1, bx - 4.5, 3, 0); g.line(sx - 0.5, sy - 2, bx - 1.5, 2, 0)

def _note(g, c):
    """A tiny music note above the head."""
    x, y = c['hx'] + 2.5, c['hy'] - c['hr'] - 1
    g.set(x, y); g.set(x, y - 1); g.set(x, y - 2); g.set(x - 1, y); g.set(x + 1, y - 2)

def _spark(g, c):
    """Two small sparkles near the top of the sprite (ultimates)."""
    for (x, y) in ((1.5, 2.0), (14.0, 1.5)):
        g.set(x, y); g.set(x - 1, y); g.set(x + 1, y); g.set(x, y - 1); g.set(x, y + 1)

def _streamer(g, c):
    """Long trailing tail feathers curling up from the rump."""
    b0 = c['b0']
    g.line(b0 + 1, 12, 0, 12); g.set(0, 11); g.set(0, 10)
    g.line(b0 + 1.5, 13, 0.5, 14.5)

spritegen.EXTRA_HANDLERS.update({'bird_crest': _crest, 'bird_fan': _fan, 'bird_wingspan': _wingspan,
                                 'bird_note': _note, 'bird_spark': _spark, 'bird_streamer': _streamer})
