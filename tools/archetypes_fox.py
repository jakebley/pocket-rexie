"""Fox archetypes (16x16, facing right, feet on row 15), hand-drawn per species and built natively at their own stage size.

Every fox keeps the three fox cues: two tall pointed ears, a pointed snout, and a big plume tail.  Bodies are told apart by plan:
trotting hunters (long, level, brush tail), pouncers (front low, rump high), trackers (nose to the ground), heavy lowriders,
foraging crouchers with a high S tail, riverside waders (long legs, head low, a fish in the jaws), fennecs (huge ears, thin legs,
light build), arctic foxes (round, fluffy, small ears, fat tail), and upright kitsune (regal stance, a fan of separate tails).
Each species has its own archetype 'fox_<id>' so no two share a body.  Heads, tails and bodies are ASCII parts stamped together.
The eye is the only enclosed hole in the head (the renderer fills it in Technicolor); the blink frame closes only that pixel."""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))

W = 16


# ---- shared drawing helpers: other families import _G, _T, SIZES and W from this module, keep them stable ----------------
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

SIZES = {1: 0.58, 2: 0.7, 3: 0.86, 4: 1.0, 5: 1.0}

def _T(k, x, y):
    return (W - 1) / 2 * (1 - k) + x * k, 15 - (15 - y) * k


def _P(s):
    return s.strip('\n').split('\n')


# ---- heads: 'e' is the eye hole; snout points right; ears are the two tips on top ----------------------------------------
H_STD = _P("""
..X..X..
.XX..XX.
.XXXXXX.
.XXXeXX.
.XXXXXXX
..XXXXX.
""")
H_KIT = _P("""
.X..X...
.XX.XX..
.XXXXX..
.XXeXXX.
.XXXXXXX
..XXXX..
""")
H_DOWN = _P("""
.X..X...
.XX.XX..
.XXXXX..
.XXeXXX.
..XXXXXX
....XXX.
""")
H_FEN = _P("""
.X....X.
.XX..XX.
.XX..XX.
.XXXXXX.
.XXXeXX.
.XXXXXXX
..XXXXX.
""")
H_FEN_TORN = _P("""
.X.....X
.XX...XX
.XX...XX
.XXXXXXX
.XXXeXXX
.XXXXXXX
..XXXXX.
""")
H_ROUND = _P("""
.X..X...
.XXXXX..
XXXXXXX.
XXXeXXXX
XXXXXXX.
.XXXXX..
""")
H_ROYAL = _P("""
..X..X..
..XX.XX.
.XXXXXX.
.XXXeXX.
.XXXXXXX
..XXXXX.
""")


def _canvas(torso, top, stamps, carve=()):
    """torso rows start at row `top`; stamps are (part, x, y); carve are (x, y) pixels cleared last"""
    g = [['.'] * W for _ in range(W)]
    for j, r in enumerate(torso):
        for i, c in enumerate(r):
            if c == 'X': g[top + j][i] = 'X'
    eye = None
    for part, x, y in stamps:
        for j, r in enumerate(part):
            for i, c in enumerate(r):
                X, Y = x + i, y + j
                if c == 'e': g[Y][X] = '.'; eye = (X, Y)
                elif c == 'X' and 0 <= X < W and 0 <= Y < W: g[Y][X] = 'X'
    for x, y in carve: g[y][x] = '.'
    if eye: g[eye[1]][eye[0]] = '.'
    return [''.join(r) for r in g], eye


# ---- tails ---------------------------------------------------------------------------------------------------------------
T_BACK = _P("""
X......
XX.....
XXXX...
XXXXXX.
XXXXXXX
.XXXXXX
..XXXX.
""")
T_UP = _P("""
..XX...
.XXXX..
.XXXX..
XXXXXX.
XXXXXXX
.XXXXXX
..XXXX.
""")
T_DROOP = _P("""
XXXXXXX
XXXXXXX
.XXXXXX
..XXXX.
""")

SPR = {}


def _s(name, top, torso, stamps, carve=()):
    SPR[name] = _canvas(_P(torso), top, stamps, carve)

FISH = _P("""
X.XX
XXXX
X.XX
""")

# ================================ stage 1: kits ================================================================================
_s('dewkit', 9, """
.X..............
XX......XXXXX...
XXX..XXXXXXXX...
.XXXXXXXXXXXX...
..XXXXXXXXXX....
...X.X..X.X.....
...X.X..X.X.....
""", [(H_KIT, 7, 4)])
_s('cinder', 9, """
........XXXX....
.......XXXXXX...
...X..XXXXXXX...
..XXX.XXXXXXX...
..XXXXXXXXXXX...
..XXXXXXXXXXXX..
...XXXXXXXXXXX..
""", [(H_KIT, 7, 3)])

# ================================ standing foxes: compact body, deep chest, 2 px legs, BIG plume tail ============================
_SZ = {  # stage: head y, head part, body top, body spans (x0, x1) per row, leg rows, tail length, tail width
    2: dict(hy=5, top=10, rows=[(6, 12), (5, 12), (6, 11)], leg=3, L=5.5, w=3.8),
    3: dict(hy=4, top=9, rows=[(6, 12), (5, 13), (5, 13), (6, 12)], leg=3, L=6.8, w=4.4),
    4: dict(hy=1, top=7, rows=[(6, 12), (5, 13), (5, 13), (5, 13), (6, 12)], leg=4, L=8.2, w=5.0),
    5: dict(hy=0, top=6, rows=[(6, 12), (5, 13), (5, 13), (5, 13), (5, 13), (6, 12)], leg=4, L=8.8, w=5.4),
}


def _fill_holes(g, eye):
    """fill every enclosed gap except the eye so the eye is the only hole"""
    seen = set(); st = [(x, y) for x in range(W) for y in (0, W - 1) if g[y][x] == '.'] + [(x, y) for y in range(W) for x in (0, W - 1) if g[y][x] == '.']
    seen.update(st)
    while st:
        x, y = st.pop()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            u, v = x + dx, y + dy
            if 0 <= u < W and 0 <= v < W and g[v][u] == '.' and (u, v) not in seen: seen.add((u, v)); st.append((u, v))
    for y in range(W):
        for x in range(W):
            if g[y][x] == '.' and (x, y) not in seen and (x, y) != eye: g[y][x] = 'X'


def _plume(g, bx, by, ang, L, w, peak=0.4, hook=False):
    a = math.radians(ang)
    ux, uy = -math.cos(a), -math.sin(a)
    for y in range(W):
        for x in range(W):
            t = ((x - bx) * ux + (y - by) * uy) / L
            if t < -0.05 or t > 1.0: continue
            d = abs(-(x - bx) * uy + (y - by) * ux)
            f = (0.7 + 0.3 * t / peak) if t < peak else max(0.0, (1.0 - t) / (1.0 - peak)) ** 0.7
            if d <= w / 2 * f: g[y][x] = 'X'


def _std(name, stage, tail='up', head='std', fat=0, dy=0, spikes=False, rag=False, flame=False, fish=False, paw=False,
         leglen=0, tail2=None, ang=None, ruff=False, crest=False):
    z = _SZ[stage]
    g = [['.'] * W for _ in range(W)]
    top, rows = z['top'] + dy, z['rows']
    leg = z['leg'] + leglen - dy
    for j, (x0, x1) in enumerate(rows):
        for x in range(x0 - (fat if 0 < j < len(rows) - 1 else 0), x1 + 1 + (fat if 0 < j < len(rows) - 1 else 0)):
            g[top + j][x] = 'X'
    bot = top + len(rows) - 1
    bx0, bx1 = rows[1][0] - fat, rows[1][1] + fat
    for y in range(bot + 1, 16):
        for x in (bx0, bx0 + 1, bx1 - 1, bx1): g[y][x] = 'X'
    if paw:  # front leg folded up
        for y in range(bot + 2, 16): g[y][bx1] = '.'; g[y][bx1 - 1] = '.' if y > bot + 1 else g[y][bx1 - 1]
        g[bot + 1][bx1 + 1] = 'X'; g[bot + 1][bx1 + 2] = 'X'
        for y in range(bot + 2, 16): g[y][bx1 - 1] = 'X'
    # tail
    by = top + len(rows) / 2 - 0.5
    L, w = z['L'], z['w'] + fat * 0.6
    base = {'up': 52, 'back': 18, 'droop': -8, 'high': 78, 'curl': 62, 'low': -22}[tail] if ang is None else ang
    _plume(g, bx0 + 1.5, by, base, L, w)
    if tail == 'curl':  # tip hooks forward over the back
        tx = bx0 + 1.5 - L * math.cos(math.radians(base)) ; ty = by - L * math.sin(math.radians(base))
        for dx, dyy in ((1, 0), (2, 0), (2, 1)):
            xx, yy = int(round(tx)) + dx, int(round(ty)) + dyy
            if 0 <= xx < W and 0 <= yy < W: g[yy][xx] = 'X'
    if tail2 is not None:
        _plume(g, bx0 + 2.5, by - 1, tail2, L * 0.85, w * 0.8)
    if flame:
        tx = bx0 + 1.5 - L * math.cos(math.radians(base)); ty = by - L * math.sin(math.radians(base))
        xx, yy = int(round(tx)), int(round(ty))
        for dx, dyy in ((0, -1), (2, -1), (1, -2)):
            if 0 <= xx + dx < W and 0 <= yy + dyy < W: g[yy + dyy][xx + dx] = 'X'
    if spikes:
        for x in range(bx0 + 1, bx1 - 3, 2): g[top - 1][x] = 'X'
    if rag:
        for x in range(bx0, bx1, 3): g[bot][x] = '.'
        g[top + 1][bx0 - 1 if bx0 > 0 else 0] = '.'
    if ruff:
        g[top + 1][bx1 + 1] = 'X'; g[top + 2][bx1 + 1] = 'X'
    hp = {'std': H_STD if stage >= 4 else H_KIT, 'down': H_DOWN, 'torn': H_FEN_TORN}[head]
    hyy = z['hy'] + dy + (2 if head == 'down' else 0)
    fix = [r for r in range(len(hp))]
    eye = None
    for j, r in enumerate(hp):
        for i, c in enumerate(r):
            X, Y = 8 + i, hyy + j
            if not (0 <= X < W and 0 <= Y < W): continue
            if c == 'e': eye = (X, Y)
            if c == 'X': g[Y][X] = 'X'
    # neck: make sure the head joins the body
    for y in range(hyy + len(hp) - 1, top + 1):
        for x in range(9, 13): g[y][x] = 'X'
    if fish:
        for j, r in enumerate(FISH):
            for i, c in enumerate(r):
                if c == 'X' and hyy + len(hp) + j - 1 < W and 12 + i < W: g[hyy + len(hp) - 1 + j][12 + i] = 'X'
    g[eye[1]][eye[0]] = '.'
    _fill_holes(g, eye)
    SPR[name] = ([''.join(r) for r in g], eye)


# ================================ stage 2-4 ===================================================================================

_std('scamp', 2, 'up')
_std('bramble', 2, 'curl', head='down')
_std('ripple', 2, 'droop', fish=True)
_std('ashpaw', 2, 'back', rag=True)
_std('tracker', 3, 'high', head='down')
_std('prowler', 3, 'low', fat=1, leglen=-1, ang=32)
_std('sneak', 3, 'back', dy=1, ang=22)
_std('thicket', 3, 'curl', spikes=True, dy=1)
_std('whisk', 3, 'up', paw=True)
_std('bracken', 3, 'droop', head='down', ang=-42)
_std('splash', 3, 'high', fat=1)
_std('reed', 3, 'low', head='down', leglen=1, ang=30)
_std('brook', 3, 'back', fish=True)
_std('scrabble', 3, 'up', head='torn', rag=True, dy=1)
_std('tatter', 3, 'back', rag=True, ang=14)
_std('stalker', 4, 'back', ang=12, leglen=1)
_std('trickster', 4, 'curl', paw=True)
_std('brawler', 4, 'low', fat=1, spikes=True, leglen=-1, ang=34)
_std('thornback', 4, 'up', spikes=True, dy=1)
_std('hazelwood', 4, 'curl', head='down')
_std('sagetail', 4, 'back', ang=16, tail2=66)
_std('angler', 4, 'droop', head='down', fish=True, leglen=1, ang=-38)

_s('swiftail', 7, """
....XXXXXXXX....
.XXXXXXXXXXXX...
XXXXXXXXXXXXX...
.XXXXXXXXXXX....
....X.....X.....
....X.....X.....
...X.......X....
...X.......X....
..XX......XX....
""", [(H_FEN, 8, 0), (T_DROOP, 0, 8)])
_s('reedwalker', 6, """
.....XXXXXXX....
XXXX.XXXXXXXX...
XXXXXXXXXXXX....
.XXXXXXXXXX.....
.....X...X......
.....X...X......
.....X...X......
.....X...X......
.....X...X......
....XX...XX.....
""", [(H_FEN, 8, 0)])
_s('raggedy', 7, """
.XX..XXXXXXXXX..
X.XXXXXXXXXXXXX.
XXXXXXXXXXXXXX..
.XXXXXXXXXXXXX..
X.XXXXXXXXXXX...
..X.XX.XX.XX....
..X.X..X..X.....
..X.X..X..X.....
..X.X..X..X.....
""", [(H_STD, 8, 1)])
_s('scrapfox', 6, """
.....XXXXXXXX...
XXXXXXXXXXXXX...
.XXXXXXXXXXXX...
..XXXXXXXXXX....
....X.....X.....
....X.....X.....
....X.....X.....
....X.....X.....
...XX.....XX....
...X.......X....
""", [(H_FEN_TORN, 8, 0)])

# ================================ stage 5: ultimates ===========================================================================
def _lobes(g, n, base, d, a, b, a0, a1):
    """n separate leaf-shaped tails radiating from the rump (tapered ellipses, tips alternately long and short)"""
    for i in range(n):
        th = math.radians(a0 + (a1 - a0) * (i / (n - 1) if n > 1 else 0.5))
        aa = a * (1.0 if i % 2 == 0 else 0.85)
        cx, cy = base[0] + aa * math.cos(th) * d / a, base[1] + aa * math.sin(th) * d / a
        for y in range(W):
            for x in range(W):
                dx, dy = x - cx, y - cy
                u, v = dx * math.cos(th) + dy * math.sin(th), -dx * math.sin(th) + dy * math.cos(th)
                if (u / aa) ** 2 + (v / b) ** 2 <= 1: g[y][x] = 'X'


K_BODY = """
..........XXXXX.
..........XXXXXX
.........XXXXXX.
.........XXXXXX.
.........XX.X.XX
"""


def _kitsune(name, n, base, d, a, b, a0, a1, bodyhy=1):
    """regal upright fox standing tall (long neck, deep chest, 2 px legs) in front of a fan of n separate leaf-shaped tails"""
    g = [['.'] * W for _ in range(W)]
    _lobes(g, n, base, d, a, b, a0, a1)
    body = [(9, 13), (8, 14), (8, 14), (8, 14), (9, 13)]
    top = 8
    for j, (x0, x1) in enumerate(body):
        for x in range(x0, x1 + 1): g[top + j][x] = 'X'
    for y in range(top + len(body), 16):
        for x in (8, 9, 13, 14): g[y][x] = 'X'
    eye = None
    for j, r in enumerate(H_ROYAL):
        for i, c in enumerate(r):
            X, Y = 8 + i, bodyhy + j
            if c == 'e': eye = (X, Y)
            if c == 'X': g[Y][X] = 'X'
    for y in range(bodyhy + len(H_ROYAL) - 1, top + 1):
        for x in (9, 10, 11, 12): g[y][x] = 'X'
    g[eye[1]][eye[0]] = '.'
    _fill_holes(g, eye)
    SPR[name] = ([''.join(r) for r in g], eye)


_kitsune('moonveil', 3, (8, 12), 5.5, 6.5, 1.35, -180, -112)
_kitsune('starbrush', 5, (8, 12), 5.5, 6.5, 1.3, -184, -98)
_kitsune('tidecaller', 3, (8, 12), 5.5, 6.8, 1.45, -186, -140)
_std('emberlord', 5, 'up', flame=True, ruff=True, ang=40)
_s('wildfire', 8, """
....XXXXXXXX....
..XXXXXXXXXXXXX.
XXXXXXXXXXXXXXX.
.XXXXXXXXXXXX.XX
..XX.......XX.XX
..X.........X.X.
.X...........X..
XX..........XX..
""", [(H_STD, 8, 2), ("""
X.X....
XXXX...
XXXXXX.
.XXXXXX
""".strip('\n').split('\n'), 0, 5)])
def _frost(name='frostpelt', two=True, hy=3):
    g = [['.'] * W for _ in range(W)]
    def ell(cx, cy, rx, ry):
        for y in range(W):
            for x in range(W):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1: g[y][x] = 'X'
    ell(2.6, 7.5, 3.0, 3.8) if two else ell(2.4, 5.5, 2.4, 4.4)      # big round tail
    if two: ell(3.2, 4.5, 2.2, 2.6)      # second tail, raised
    ell(7.5, 11.0, 5.3, 3.6)     # fluffy round body
    for x in (4, 5, 7, 8, 10, 11): g[15][x] = 'X'
    for x in (4, 5, 10, 11): g[14][x] = 'X'
    eye = None
    for j, r in enumerate(H_ROUND):
        for i, c in enumerate(r):
            X, Y = 8 + i, hy + j
            if c == 'e': eye = (X, Y)
            if c == 'X': g[Y][X] = 'X'
    for y in range(hy + 5, hy + 7):
        for x in range(9, 13): g[y][x] = 'X'
    g[eye[1]][eye[0]] = '.'
    _fill_holes(g, eye)
    SPR[name] = ([''.join(r) for r in g], eye)


_frost()
_frost('plumptail', two=False, hy=4)
_s('gloamfox', 4, """
.....XXXXXXXX...
..XX.XXXXXXXXXX.
.XXXXXXXXXXXXXX.
XXXXXXXXXXXXXX..
.XXXXXXXXXXXX...
X.XXXXXXXXXX....
XXX.X.....X.....
.XXXX.....X.....
..XX......X.....
...X.....XX.....
...X.....X......
...XX....XX.....
""", [(H_FEN, 8, 0)])


# ---- registry: every species has its own archetype 'fox_<id>' (same drawing at every stage; a species only ever has one) -------
def _anchors(rows, eye):
    xs = [x for r in rows for x, c in enumerate(r) if c == 'X']
    return dict(rows=rows, head=(eye[0] - 0.5, eye[1] + 0.8, 2.2), eye=eye, body=(min(xs) + 1, max(xs) - 3))


ARCH_FOX = {'fox_' + k: dict(by_stage={s: _anchors(rows, eye) for s in (1, 2, 3, 4, 5)}) for k, (rows, eye) in SPR.items()}
