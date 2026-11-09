"""Fish-family sprites (16x16, facing right, ground on row 15). Every species has its own hand-built body, drawn at the
size of its stage with a small pixel toolkit (ellipses, polygons, brush strokes). No generic body plus decoration, so
a ray is a ray, an eel is an eel and every lantern, spout and tail belongs to its own body.

Eye rule (expo-prototype/src/ui/shading.ts): the eye is ONE isolated 1-pixel hole high on the sprite and the topmost
small hole, so no other enclosed hole may sit within about two rows of it. The blink frame (spritegen) fills the eye."""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import spritegen

W = 16
PROBLEMS = []

_K = 1.0     # build scale of the sprite being drawn (smaller stages draw the same idea smaller)

class C:
    """Pixel canvas with float coordinates (pixel centres at integers); normalised afterwards onto the 16x16 grid.
    Everything except art() blocks is scaled by the species' build scale _K."""
    def __init__(self):
        self.on = set(); self.eye = None; self.k = _K
    def _put(self, x, y, v=1):
        k = (int(round(x)), int(round(y)))
        (self.on.add if v else self.on.discard)(k)
    def set(self, x, y, v=1): self._put(x * self.k, y * self.k, v)
    def ell(self, cx, cy, rx, ry, v=1):
        k = self.k; cx, cy = cx * k, cy * k; rx, ry = max(0.8, rx * k), max(0.8, ry * k)
        for y in range(int(cy - ry - 1), int(cy + ry + 2)):
            for x in range(int(cx - rx - 1), int(cx + rx + 2)):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0: self._put(x, y, v)
    def rell(self, cx, cy, rx, ry, deg, v=1):
        k = self.k; cx, cy = cx * k, cy * k; rx, ry = rx * k, ry * k
        a = math.radians(deg); ca, sa = math.cos(a), math.sin(a)
        R = int(max(rx, ry)) + 2
        for y in range(int(cy) - R, int(cy) + R + 1):
            for x in range(int(cx) - R, int(cx) + R + 1):
                u = (x - cx) * ca + (y - cy) * sa; w = -(x - cx) * sa + (y - cy) * ca
                if (u / rx) ** 2 + (w / ry) ** 2 <= 1.0: self._put(x, y, v)
    def poly(self, pts, v=1):
        pts = [(x * self.k, y * self.k) for x, y in pts]
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        for y in range(int(min(ys)) - 1, int(max(ys)) + 2):
            for x in range(int(min(xs)) - 1, int(max(xs)) + 2):
                ins = False; n = len(pts)
                for i in range(n):
                    x0, y0 = pts[i]; x1, y1 = pts[(i + 1) % n]
                    if (y0 > y) != (y1 > y) and x < (x1 - x0) * (y - y0) / (y1 - y0) + x0: ins = not ins
                if ins: self._put(x, y, v)
    def tri(self, a, b, c, v=1): self.poly([a, b, c], v)
    def rect(self, x0, y0, x1, y1, v=1):
        k = self.k
        for y in range(int(round(y0 * k)), int(round(y1 * k)) + 1):
            for x in range(int(round(x0 * k)), int(round(x1 * k)) + 1): self._put(x, y, v)
    def path(self, pts, r0=0.5, r1=None, v=1):
        """Brush stroke through the points; radius goes r0 -> r1 along the path (0.5 = 1 px, 1.0-1.4 = plus, 1.5 = 3x3)."""
        k = self.k
        r1 = r0 if r1 is None else r1
        pts = [(x * k, y * k) for x, y in pts]; r0 = max(0.5, r0 * k) if r0 > 0.5 else 0.5; r1 = max(0.5, r1 * k) if r1 > 0.5 else 0.5
        segs = list(zip(pts, pts[1:])); total = sum(math.dist(a, b) for a, b in segs) or 1; done = 0
        for a, b in segs:
            d = math.dist(a, b); n = max(1, int(d * 4))
            for i in range(n + 1):
                t = i / n; x = a[0] + (b[0] - a[0]) * t; y = a[1] + (b[1] - a[1]) * t
                rr = max(r0 + (r1 - r0) * (done + d * t) / total, 0.5)
                for yy in range(int(y - rr) - 1, int(y + rr) + 2):
                    for xx in range(int(x - rr) - 1, int(x + rr) + 2):
                        if (xx - x) ** 2 + (yy - y) ** 2 <= rr * rr + 1e-6: self._put(xx, yy, v)
            done += d
    def line(self, x0, y0, x1, y1, v=1): self.path([(x0, y0), (x1, y1)], 0.5, 0.5, v)
    def eyeat(self, x, y): self.eye = (x * self.k, y * self.k)
    def art(self, block):
        """Hand-drawn pixels (not scaled): X = ink, e = the eye (ink, punched out later), anything else empty."""
        for y, line in enumerate(block.strip('\n').split('\n')):
            for x, ch in enumerate(line):
                if ch in 'Xe': self._put(x, y)
                if ch == 'e': self.eye = (x, y)

def fill_holes(c):
    """Fill every enclosed unlit cell: the only hole allowed in a sprite is the eye (added afterwards)."""
    xs = [p[0] for p in c.on]; ys = [p[1] for p in c.on]
    x0, x1, y0, y1 = min(xs) - 1, max(xs) + 1, min(ys) - 1, max(ys) + 1
    seen = set(); stack = [(x0, y0)]; seen.add((x0, y0))
    while stack:
        x, y = stack.pop()
        for q in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
            if x0 <= q[0] <= x1 and y0 <= q[1] <= y1 and q not in seen and q not in c.on: seen.add(q); stack.append(q)
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if (x, y) not in seen: c.on.add((x, y))

def finish(c, center=True):
    """Shift onto the grid: bottom on row 15, horizontally centred, eye punched at its place."""
    fill_holes(c)
    xs = [p[0] for p in c.on]; ys = [p[1] for p in c.on]
    w = max(xs) - min(xs) + 1; h = max(ys) - min(ys) + 1
    if h > W or w > W: PROBLEMS.append(('too big', w, h))
    dx = (W - w) // 2 - min(xs) if center else -min(xs)
    dy = 15 - max(ys)
    rows = [['.'] * W for _ in range(W)]
    for x, y in c.on:
        if 0 <= x + dx < W and 0 <= y + dy < W: rows[y + dy][x + dx] = 'X'
    ex, ey = int(round(c.eye[0])) + dx, int(round(c.eye[1])) + dy
    def ringed(x, y):
        return all(0 <= a < W and 0 <= b < W and rows[b][a] == 'X' for a, b in ((x, y), (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)))
    if not ringed(ex, ey):      # the eye must sit in ink with ink on all four sides: take the nearest cell that does
        cand = [(abs(x - ex) + abs(y - ey) * 1.3, x, y) for y in range(W) for x in range(W) if ringed(x, y)]
        PROBLEMS.append(('eye moved', ex, ey))
        _, ex, ey = min(cand)
    return ["".join(r) for r in rows], (ex, ey), (min(xs) + dx, max(xs) + dx)

# ---- shared bits --------------------------------------------------------------------------------------------
def fin_tail(c, x, y, spread, length, notch=True):
    """Forked tail fan whose root is at (x, y) and which opens to the left."""
    c.tri((x, y), (x - length, y - spread), (x - length, y + spread))
    if notch: c.set(x - length, y, 0)

def lamp(c, x, y, big=False):
    """Star-shaped lure bulb: a solid 3x3 with four tips (5x5 plus) when big, else 3x3."""
    c.rect(x - 1, y - 1, x + 1, y + 1)
    if big:
        for dx, dy in ((0, -2), (0, 2), (-2, 0), (2, 0)): c.set(x + dx, y + dy)

def jaws(c, x0, x1, y0, y1, upper=True, lower=True):
    """Open mouth: carve rows y0..y1 from x0 to the front edge, then add needle teeth hanging from the jaws."""
    c.rect(x0, y0, x1 + 2, y1, 0)
    for i, x in enumerate(range(x0 + 1, x1 + 1, 2)):
        if upper: c.set(x, y0)
        if lower: c.set(x + (1 if y1 > y0 else 0), y1)

def ridge(c, xs, h=1):
    """Spines standing on the topmost ink of each column."""
    for x in xs:
        col = [y for (px, y) in c.on if px == int(round(x))]
        if col:
            t = min(col)
            for k in range(1, h + 1): c.set(x, t - k)

def spiky(c, cx, cy, rx, ry, n, ln, skip=()):
    for i in range(n):
        if i in skip: continue
        a = 2 * math.pi * i / n
        x0, y0 = cx + math.cos(a) * (rx - 0.6), cy + math.sin(a) * (ry - 0.6)
        x1, y1 = cx + math.cos(a) * (rx + ln), cy + math.sin(a) * (ry + ln)
        c.line(x0, y0, x1, y1)

# ---- the species --------------------------------------------------------------------------------------------
D = {}
def sp(fn): D[fn.__name__] = fn; return fn

# ===== stage 1 =====
@sp
def bubblet():
    c = C()
    c.ell(5, 6, 3.7, 2.9)
    fin_tail(c, 1.8, 6, 2.2, 2.4)
    c.rect(6, 0, 7, 1)
    c.eyeat(6.4, 5.4); return c

@sp
def pearlfry():
    c = C()
    c.ell(4, 4, 3.4, 2.2)
    fin_tail(c, 1.4, 4, 2.2, 2.4)
    c.tri((3, 2), (4, 0), (6, 2))
    c.ell(9.6, 6.6, 1.9, 1.9)
    c.eyeat(5.6, 3.6); return c

# ===== stage 2 =====
@sp
def nibble():
    c = C()
    c.ell(5.4, 5.6, 3.6, 3)
    fin_tail(c, 2.2, 5.6, 3, 2.8)
    c.tri((4.4, 3.4), (5.4, 1.2), (7.4, 3.4))
    c.path([(10, 8), (10, 4)], 0.5)                                  # a sprig of algae in front of its mouth
    c.set(9, 6); c.set(11, 5); c.set(9, 4); c.set(10, 3)
    c.eyeat(7, 4.8); return c

@sp
def darter():
    c = C()
    c.rell(6.8, 5.4, 5.6, 1.7, -22)                                  # a slim arrow, nose up
    c.poly([(2.6, 7.8), (-0.4, 7), (0.2, 10.8), (3.4, 9.2)]); c.set(0.2, 8.8, 0)
    c.tri((6, 4.4), (5, 1.6), (8.6, 3))
    c.tri((6.4, 7.2), (5.2, 9.2), (7.8, 7.8))
    c.eyeat(10, 3.4); return c

@sp
def dabble():
    c = C()
    c.ell(6.6, 5.4, 3.7, 3.2)
    c.ell(2.2, 5.6, 1.9, 2.8); c.set(0.4, 5.6, 0)
    c.tri((5, 2.4), (6.4, 0.6), (8.2, 2.6))
    c.line(10, 6.4, 11.2, 7.6); c.line(10, 5.4, 11.6, 5)
    c.eyeat(8.2, 4.4); return c

@sp
def silt():
    c = C()
    c.ell(5, 6, 4, 2.4)
    c.ell(7.8, 6, 2.6, 2.5)
    c.tri((1.4, 6), (-1.4, 3.4), (-1.4, 8.6))
    c.tri((4, 4), (5, 2.2), (6.4, 4))
    c.line(9.8, 7.2, 11.4, 8.6); c.line(9.8, 5.2, 11.4, 4.2)
    c.eyeat(8, 5.2); return c

# ===== stage 3 =====
@sp
def pufflet():
    c = C()
    c.ell(7.5, 7, 4.8, 4.4)
    spiky(c, 7.5, 7, 4.8, 4.4, 8, 1.4, skip=(0,))
    c.tri((3, 7), (0, 5), (0, 9));
    c.line(7, 9, 6, 10.4)
    c.eyeat(10, 5.2); return c

@sp
def curlfin():
    c = C()
    c.art("""
...X.X......
...XXXX.....
..XXeXXXXX..
..XXXXXXXXX.
...XXXXX....
....XXX.....
....XXXXX...
..X.XXXXXX..
..XXXXXXXX..
...XXXXXX...
....XXXX....
.XX.XXX.....
XX.XXX......
XXXXX.......
""")
    return c

@sp
def glimmer():
    c = C()
    c.ell(8.2, 6.5, 4.2, 3.6)
    c.tri((4.5, 6.6), (-0.5, 1.4), (1, 6.6)); c.tri((4.5, 6.6), (-0.5, 11.8), (1, 6.6))   # veil tail
    c.tri((6.2, 3.6), (7, -0.4), (10.4, 3.4))                                              # tall dorsal
    c.tri((7.4, 8), (5.6, 11), (9, 9.6))                                                   # pectoral
    c.eyeat(10.6, 5.2); return c

@sp
def gulper():
    c = C()
    c.ell(7, 6, 5.4, 5.2)
    c.poly([(7.6, 6.4), (17, 1.4), (17, 11.4)], 0)
    for x, y in ((8.6, 5), (10.4, 4), (8.6, 8), (10.4, 9)): c.set(x, y)
    c.path([(2.2, 8), (0.6, 10.4), (0.2, 12.4)], 1.2, 0.5)
    c.eyeat(5.6, 3.2); return c

@sp
def lanternet():
    c = C()
    c.ell(7.2, 8, 4.4, 3.6)
    c.ell(10.4, 8.3, 3.4, 3.2)
    jaws(c, 11, 13, 8, 9)
    fin_tail(c, 3, 8, 2.6, 3)
    c.path([(9.4, 6.6), (10, 2.4), (12.4, 1.2)], 0.5)
    lamp(c, 13, 2)
    c.eyeat(10.4, 6.4); return c

@sp
def slinker():
    c = C()
    c.path([(0.5, 10), (2.4, 8.4), (4.6, 9.2), (6.8, 11), (9, 10.2), (10.6, 8.2)], 1.5, 1.6)
    c.ell(11.6, 7, 2.2, 1.9); c.tri((12.8, 6.4), (14.6, 7.4), (12.8, 8.4)); c.set(13.2, 7.8, 0)
    for x, y in ((3, 6.8), (4.8, 7.6), (6.8, 9.2), (8.6, 8.8)): c.line(x, y, x + 1, y)
    c.tri((9.4, 9.6), (8.6, 12.4), (11, 10.6))
    c.tri((1, 10.6), (-1, 8.2), (-1, 12.6))
    c.eyeat(12, 6.8); return c

@sp
def plumpkoi():
    c = C()
    c.ell(7.5, 8.2, 5.4, 4.4)
    c.ell(11.4, 8.6, 2.6, 2.6)
    c.tri((3, 8.4), (-0.5, 5), (-0.5, 11.8)); c.set(-0.5, 8.4, 0); c.tri((3, 8.4), (-0.5, 11.8), (1.5, 12))
    c.tri((6, 4.4), (8, 2.6), (10, 4.6))
    c.line(12.8, 10.4, 14.5, 11.5); c.line(13, 9, 14.8, 9.4)
    c.eyeat(11.8, 6.8); return c

@sp
def driftbell():
    c = C()
    c.ell(6.5, 4, 5, 3.6); c.rect(0, 6, 13, 9, 0)
    c.line(1.6, 6.4, 11.4, 6.4)
    for x, ph, top in ((3, 0, 7), (6.4, 1, 7), (9.6, 0, 7)):
        for y in range(top, 14 if x == 6.4 else 12): c.set(x + (1 if ((y + ph) // 2) % 2 else 0), y)
    c.eyeat(8, 3.6); return c

@sp
def ripplekoi():
    c = C()
    c.ell(7.2, 6.4, 5.4, 2.8)
    c.ell(11.8, 6.6, 2.4, 2.3)
    fin_tail(c, 2.4, 6.4, 3.4, 3)
    c.tri((5.4, 4), (7.4, 1.8), (9.6, 4.2))
    c.tri((8, 8.6), (6.4, 10.6), (10, 9.6))
    c.line(13, 7.6, 14.4, 9); c.line(13, 6.2, 14.6, 5.4)
    c.eyeat(12, 5.6); return c

@sp
def dreg():
    c = C()
    c.rell(6, 6.2, 4.6, 2.9, 24)                            # nose down in the gravel
    c.ell(9.6, 9, 2.4, 2.3)
    c.poly([(2.4, 3.8), (-0.8, 2), (-0.2, 6), (2.8, 5.6)]); c.set(-0.2, 3.6, 0)
    c.tri((4.6, 3.4), (5.8, 1.4), (8, 4.2))
    c.line(11.8, 10.6, 12.6, 12.2); c.line(10.6, 11.4, 10.8, 12.6)
    c.eyeat(10, 7.8); return c

@sp
def muddle():
    c = C()
    c.ell(8, 6.4, 5, 3.4)
    c.tri((3.6, 6.4), (-0.4, 2), (-0.4, 10.8)); c.set(-0.4, 6.4, 0); c.set(0.6, 4.6, 0); c.set(0.6, 8.6, 0)
    c.tri((6, 3.6), (7, 1.4), (10, 3.6)); c.set(8, 2.6, 0)
    c.tri((8, 9), (6.6, 11.6), (10.4, 10.2)); c.set(7.6, 10.4, 0)
    c.eyeat(10.6, 5.4); return c

# ===== stage 4 =====
@sp
def spineball():
    c = C()
    c.ell(8, 8, 5.4, 5)
    spiky(c, 8, 8, 5.4, 5, 9, 2.0, skip=(0,))
    c.tri((2.8, 8.4), (-0.3, 4.4), (-0.3, 12.4)); c.set(-0.3, 8.4, 0)
    c.tri((6.6, 3.4), (8, 0.8), (9.6, 3.4))
    c.path([(7.4, 12.4), (6, 14.6)], 0.5)
    c.eyeat(11, 5.6); return c

@sp
def seastallion():
    c = C()
    c.art("""
......X.X.......
.....XXXXX......
....XXXXXXXX....
....XXXeXXXXXXX.
....XXXXXXXXXXX.
.....XXXXXX.....
......XXXX......
......XXXXXX....
...XX.XXXXXXXX..
...XXXXXXXXXXX..
....XXXXXXXXXX..
.....XXXXXXXX...
......XXXXXX....
.XXX..XXXXX.....
XX.XX.XXXX......
XXXXXXXXX.......
""")
    return c

@sp
def parrotfin():
    c = C()
    c.ell(8.6, 8, 5.8, 4.4)
    c.ell(11.8, 7.6, 3.2, 3.6)
    c.tri((3.4, 8), (-0.6, 2.8), (0.8, 8)); c.tri((3.4, 8), (-0.6, 13.4), (0.8, 8))
    c.tri((5, 4.2), (6.4, 1.6), (11, 3.6))
    c.rect(14, 7, 15, 8)
    c.rect(14, 9, 15, 10)
    c.rect(14, 8.5, 15, 8.5, 0)
    c.tri((8, 9.5), (6.4, 13), (10.4, 11))
    c.eyeat(11.6, 5.8); return c

@sp
def coralback():
    c = C()
    c.ell(8, 11, 5.6, 3)
    c.ell(12, 11, 2.6, 2.4)
    fin_tail(c, 2.8, 11, 2.6, 3)
    c.path([(8, 8), (8, 3.6)], 0.5); c.path([(8, 6), (5.8, 4.4), (5.4, 2)], 0.5)
    c.path([(8, 5), (10, 3.4), (10.4, 1)], 0.5); c.path([(6, 8), (4, 6.4)], 0.5); c.path([(10.4, 8.4), (12.2, 6.8)], 0.5)
    c.eyeat(12.4, 10); return c

@sp
def gapjaw():
    c = C()
    c.ell(8, 8, 5.6, 4.4)
    c.ell(11.4, 7.6, 3.6, 3.8)
    c.rect(12, 8, 15, 9, 0)
    for x in (12, 14): c.set(x, 7); c.set(x + 0.8, 10)
    for x in (13, 15): c.set(x, 10.2)
    fin_tail(c, 3, 8, 3, 3)
    c.path([(6, 4.4), (7, 1.2), (4.6, 0.6)], 0.5)                       # long first dorsal spine
    c.tri((5, 4.8), (9, 4.6), (7, 2.6))
    c.tri((8, 11), (6.6, 14.6), (10.4, 12.2))
    c.eyeat(11, 5.6); return c

@sp
def beaconfish():
    c = C()
    c.ell(7.6, 10, 5, 4.1)
    c.ell(11, 10.4, 3.4, 3.4)
    jaws(c, 12, 14, 10, 11)
    fin_tail(c, 3, 10, 3, 3)
    c.path([(9.8, 8), (10.6, 3.8), (12.4, 2)], 0.5)
    lamp(c, 13, 3.4, True)
    c.tri((6, 6.6), (8, 4.2), (10, 6.4))
    c.tri((6.4, 13.4), (6, 15.5), (9.2, 14))
    c.eyeat(10.6, 8.2); return c

@sp
def moray():
    c = C()
    c.path([(1, 13), (2.6, 11.2), (4.4, 11.8), (6.4, 13.4), (8.6, 12.4), (10, 10.6)], 1.55, 1.7)
    c.ell(11.8, 9.4, 3.2, 2.7)
    jaws(c, 12, 14, 10, 10, upper=False)
    for x, y in ((2.6, 9.4), (4.4, 9.8), (6.2, 11.4), (8.2, 10.4)): c.set(x, y)
    c.tri((9.6, 11.4), (8.6, 14.4), (11.2, 12.2))
    c.eyeat(12.2, 8.2); return c

@sp
def skimray():
    c = C()
    c.art("""
..XX............
..XXX...........
...XXXX.........
...XXXXXX.......
....XXXXXXX.....
......XXXXXXX...
........XXXXXXX.
XXXXXXXXXXXXXXXX
.........XeXXXXX
........XXXXXXX.
......XXXXXXX...
....XXXXXXX.....
...XXXXXX.......
...XXXX.........
..XXX...........
..XX............
""")
    return c

@sp
def goldcarp():
    c = C()
    c.ell(8, 9, 5.4, 3.9)
    c.ell(12, 9.2, 2.6, 2.6)
    c.tri((3, 9), (-0.4, 3.6), (-0.4, 14.4)); c.set(-0.4, 9, 0); c.set(0.6, 9, 0)
    c.tri((4.6, 5.8), (7, 2.8), (11.6, 6))
    c.tri((8, 12), (6.6, 15), (10.8, 13.4))
    c.line(14, 10.4, 15, 12); c.line(14, 8.4, 15, 7)
    c.eyeat(12.2, 7.6); return c

@sp
def moonjelly():
    c = C()
    c.ell(8, 5, 6.2, 4.6); c.rect(0, 8, 15, 10, 0)
    c.line(1.8, 8.4, 14.2, 8.4)
    for x in (2, 5, 8, 11, 14): c.set(x, 9)
    for x, ph in ((3, 0), (6, 1), (10, 0), (13, 1)):
        for y in range(9, 16): c.set(x + (1 if ((y + ph) // 2) % 2 else 0), y)
    c.path([(8, 9), (7.6, 12), (8.6, 15)], 1.1, 0.6)
    c.eyeat(8, 5); return c

@sp
def brocade():
    c = C()
    c.ell(7.6, 9.4, 5.4, 2.9)
    c.ell(11.8, 9.2, 2.4, 2.4)
    fin_tail(c, 2.8, 9.4, 5.0, 3.2)
    c.tri((5.6, 7), (7, 4.4), (11, 7))
    c.tri((9.4, 11, ), (5.4, 14.6), (7.4, 11.4))
    c.line(13, 10.2, 14.8, 12); c.line(13, 8.2, 14.8, 6.6)
    c.eyeat(12.2, 8.2); return c

@sp
def rustfin():
    c = C()
    c.ell(8, 8, 5.4, 3.6)
    c.ell(12, 8.2, 3, 2.8)
    fin_tail(c, 3, 8, 3.2, 3.4); c.set(-0.4, 6, 0); c.set(0.6, 10, 0)
    c.tri((5, 4.6), (7, 2), (11, 4.8)); c.set(8, 3.2, 0); c.set(6, 3.6)
    c.tri((8, 11), (6.6, 14), (10.6, 12.2))
    c.eyeat(12, 6.6); return c

@sp
def wreckfish():
    c = C()
    c.rect(1, 8, 9, 8); c.rect(2, 9, 8, 12)                  # the old boot: wide rim and shaft ...
    c.rect(2, 13, 14, 15); c.set(14, 13, 0); c.set(14, 15, 0); c.set(13, 13, 0)
    c.rect(7, 15, 8, 15, 0)                                   # ... arch under the foot
    c.rell(9.4, 5, 4.6, 2.4, -34)                             # the fish, tail down in the boot, head peeking out
    c.tri((8.2, 3.4), (9.2, 0.4), (11, 2.8))
    c.tri((5.4, 8), (3.2, 5), (3, 8.6))                       # tail fin flicking over the rim
    c.eyeat(11.8, 2.8); return c

# ===== stage 5 =====
@sp
def prismara():
    c = C()
    c.ell(10, 8.6, 4, 3.6)
    c.ell(12.6, 8.4, 2.4, 2.4)
    c.poly([(7.4, 6.2), (2.4, 2.4), (0, 4.2), (1.8, 8.6), (0, 13), (2.4, 14.8), (7.4, 11)])
    c.tri((7.6, 5.8), (8.6, 1.4), (13.4, 5.4))
    c.tri((9.6, 11), (7, 15), (12, 12.6))
    c.rect(10, 0, 14, 0); c.set(9, 1); c.set(15, 1)
    c.eyeat(12.4, 7.6); return c

@sp
def seamonarch():
    c = C()
    c.art("""
....X.X.X.X.....
....XXXXXXX.....
....XXXXXXXX....
....XXXeXXXXXXX.
....XXXXXXXXXXX.
.....XXXXXX.....
......XXXX......
......XXXXXX....
....XXXXXXXXX...
...XXXXXXXXXXX..
....XXXXXXXXXX..
.....XXXXXXXX...
......XXXXXX....
.......XXXXXX...
......XXX.XXXXX.
.....XXX...XXXX.
""")
    return c

@sp
def lanternking():
    c = C()
    c.ell(7.8, 10.6, 6.2, 4.8)
    c.ell(11.2, 10.8, 4.2, 4.2)
    jaws(c, 12, 14, 10, 11)
    ridge(c, (5, 7, 9), 2)
    fin_tail(c, 2.2, 10.6, 3.6, 2.4)
    c.path([(10, 8), (10.6, 3.2), (13, 1.6)], 0.5)
    lamp(c, 13.4, 2.6, True)
    c.tri((6.4, 14.4), (5.6, 15.6), (9, 15))
    c.eyeat(11.4, 8.4); return c

@sp
def tidewyrm():
    c = C()
    c.path([(1.2, 13.6), (2.4, 11), (4.6, 13.8), (5.6, 14.4), (7.2, 11.4), (8.4, 8.6), (9.6, 6)], 1.1, 2.0)
    c.ell(11, 3.8, 2.4, 2.1); c.path([(12.2, 4.2), (14.4, 5)], 1.0, 0.5); c.rect(12.2, 4.8, 14.4, 4.8, 0)
    c.path([(9, 2.2), (8.2, 0.2)], 0.5); c.path([(10.8, 1.6), (10.8, -0.4)], 0.5)
    c.tri((6.6, 9), (5, 6.4), (7.2, 7.4)); c.tri((7.6, 6.6), (6, 4), (8.2, 4.8))
    c.eyeat(11.4, 3); return c

@sp
def aurorabell():
    c = C()
    c.ell(8, 5.4, 5.8, 4.8); c.rect(0, 8, 15, 11, 0)
    c.line(2, 8, 14, 8)
    for x, ph in ((3, 0), (5.6, 1), (8.4, 0), (11.2, 1), (13.6, 0)):
        for y in range(9, 16): c.set(x + (1 if ((y + ph) // 2) % 2 else 0), y)
    c.path([(8, 8), (7, 11), (9, 14.6)], 1.1, 0.6)
    c.path([(1.6, 7), (0.6, 10), (1.4, 13), (0.8, 15)], 0.5)             # aurora streamers
    c.path([(14.4, 7), (15.4, 10), (14.6, 13), (15.2, 15)], 0.5)
    c.eyeat(9.2, 5.4); return c

@sp
def dragonkoi():
    c = C()
    c.rell(7.4, 9.4, 6.4, 3.5, -50)
    c.ell(11.6, 4.0, 2.7, 2.3)
    c.tri((3.6, 12.6), (-0.4, 11.2), (0.4, 15.4)); c.tri((3.6, 12.6), (0, 8.6), (-0.4, 11.6)); c.set(0, 12, 0)
    c.path([(13.6, 4.8), (15.4, 6.8)], 0.5); c.path([(13.4, 3.6), (15.4, 2.2)], 0.5)
    c.path([(9.6, 2.2), (8, 0.2)], 0.5); c.path([(11.2, 1.8), (10.8, -0.4)], 0.5)
    c.tri((9.2, 9), (6, 8.6), (7.6, 11.8))
    c.eyeat(12, 3.2); return c

@sp
def tidewhale():
    c = C()
    c.ell(9.4, 10.8, 6, 4.1)
    c.ell(12.2, 11.2, 3.4, 3.3)
    c.path([(4.8, 10.6), (3, 9), (2.6, 7)], 2.3, 1.6)
    c.tri((2.6, 8), (-0.8, 4), (5.8, 4.4)); c.set(2.6, 4, 0)            # flukes
    c.tri((9, 12.8), (6.8, 15.4), (11, 14))
    c.rect(11, 12.4, 15, 12.4, 0)
    c.set(12, 6); c.set(12, 5); c.set(11, 4); c.set(13, 4)               # the spout
    c.eyeat(13.2, 9.8); return c

@sp
def hollowfin():
    c = C()
    c.ell(12, 5.6, 3.6, 3.4)
    c.rect(14, 8.6, 15, 9)                                    # jaw
    c.path([(2, 7), (11, 7)], 0.5)                            # spine
    for sx in (10, 7, 4):
        for k in (1, 2, 3): c.set(sx - k, 7 - k); c.set(sx - k, 7 + k)                 # ribs sweep back
    for k in (1, 2, 3): c.set(2 - k + 1, 7 - k); c.set(2 - k + 1, 7 + k)               # fork of the tail
    c.eyeat(12.4, 4.8); return c

# ---- registration --------------------------------------------------------------------------------------------
# build scale per species (stage-appropriate size); default 1.0
K = {}

def _arch(fn):
    global _K
    n = len(PROBLEMS); _K = K.get(fn.__name__, 1.0)
    rows, eye, body = finish(fn())
    for i in range(n, len(PROBLEMS)): PROBLEMS[i] = (fn.__name__,) + PROBLEMS[i]
    ex, ey = eye
    ent = dict(rows=rows, head=(ex, ey, 2.4), eye=eye, body=body)
    return dict(by_stage={s: ent for s in (1, 2, 3, 4, 5)})

ARCH_FISH = {'fish_' + k: _arch(f) for k, f in D.items()}
spritegen.register_archetypes(ARCH_FISH)
