"""Dragon archetypes (16x16, facing right, ground on row 15), built natively at each stage size from polygons, tapered paths and
a few explicit pixels. Every body plan has its own silhouette:
 west   four-legged western dragon: long neck, swept-back horns, snout with nostril, spined back, bat wing, spade tail
 soar   the same dragon in flight: wings spread wide, legs tucked, tail streaming
 rear   a big dragon reared up on its hind legs, wing open behind, jaws wide
 wyv    biped wyvern: wing-arm with a wrist claw, head thrust forward, long barbed tail
 east   serpentine eastern dragons: thick S-bodied ribbons with a mane, whiskers, antler horns and little claws
 wurm   lindwurm: long low wingless body on two front legs, trailing tail
 drake  small wingless quadruped with a frill; drakeheavy is the armoured, stocky one
 hoard  round hoard-sitters; keeper stands upright; boulder / crystal are the jewelled lumps
 hydra  three heads on fanned-out necks
 coil   a serpent coiled round a hoard (gem) or a storm spiral
 stray  spindly scruffy lizard
 hatch  wyrmling in or out of the eggshell
Also registers the dr_* decorations."""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
import spritegen

W = 16

SS = 4  # supersampling: shapes are filled on a 64x64 grid and each pixel keeps a shape when it is covered enough

class Cv:
    """canvas with size factor k: design coordinates are for the full-size animal (pixel centres at integers, pixel i spans i-.5..i+.5)"""
    def __init__(self, k=1.0, thr=0.42):
        self.p = [[0] * W for _ in range(W)]      # final pixels (explicit set / erase)
        self.f = [[0] * (W * SS) for _ in range(W * SS)]  # fine ink layer
        self.k = k; self.thr = thr
        self.ox = (W - 1) / 2 * (1 - k)
    def T(self, x, y): return self.ox + x * self.k, 15 - (15 - y) * self.k
    def get(self, x, y): return self.p[y][x] if 0 <= x < W and 0 <= y < W else 0
    def _raw(self, x, y, v=1):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < W:
            self.p[y][x] = v
            for fy in range(SS):
                for fx in range(SS): self.f[y * SS + fy][x * SS + fx] = v
    def set(self, x, y, v=1):
        x, y = self.T(x, y); self._raw(x, y, v)
    def _fill(self, test, bb, v=1):
        x0, y0, x1, y1 = bb
        for fy in range(max(0, int((y0 + .5) * SS) - 1), min(W * SS, int((y1 + .5) * SS) + 2)):
            for fx in range(max(0, int((x0 + .5) * SS) - 1), min(W * SS, int((x1 + .5) * SS) + 2)):
                cx = (fx + 0.5) / SS - 0.5; cy = (fy + 0.5) / SS - 0.5
                if test(cx, cy): self.f[fy][fx] = v
    def ell(self, cx, cy, rx, ry, v=1):
        cx, cy = self.T(cx, cy); rx = max(0.7, rx * self.k); ry = max(0.7, ry * self.k)
        self._fill(lambda x, y: ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0, (cx - rx, cy - ry, cx + rx, cy + ry), v)
    def poly(self, pts, v=1):
        P = [self.T(x, y) for x, y in pts]; n = len(P)
        def test(x, y):
            inside = False; j = n - 1
            for i in range(n):
                xi, yi = P[i]; xj, yj = P[j]
                if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: inside = not inside
                j = i
            return inside
        self._fill(test, (min(p[0] for p in P), min(p[1] for p in P), max(p[0] for p in P), max(p[1] for p in P)), v)
    def path(self, pts, r0=1.0, r1=None, v=1, rmin=0.45):
        r1 = r0 if r1 is None else r1
        segs = list(zip(pts, pts[1:])); tot = sum(math.hypot(b[0] - a[0], b[1] - a[1]) for a, b in segs) or 1
        done = 0
        for a, b in segs:
            L = math.hypot(b[0] - a[0], b[1] - a[1]); n = max(2, int(L * 3))
            for i in range(n + 1):
                t = i / n; d = (done + L * t) / tot
                cx, cy = self.T(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)
                r = max(rmin, (r0 + (r1 - r0) * d) * self.k)
                self._fill(lambda x, y: (x - cx) ** 2 + (y - cy) ** 2 <= r * r, (cx - r, cy - r, cx + r, cy + r), v)
            done += L
    def line(self, x0, y0, x1, y1, v=1, r=0.5): self.path([(x0, y0), (x1, y1)], r, r, v)
    def rect(self, x0, y0, x1, y1, v=1):
        (a, b), (c, d) = self.T(x0, y0), self.T(x1, y1)
        x0_, x1_, y0_, y1_ = round(min(a, c)), round(max(a, c)), round(min(b, d)), round(max(b, d))
        self._fill(lambda x, y: x0_ - .5 <= x <= x1_ + .5 and y0_ - .5 <= y <= y1_ + .5, (x0_, y0_, x1_, y1_), v)
    def rows(self):
        out = []
        for y in range(W):
            row = ""
            for x in range(W):
                cov = sum(self.f[y * SS + fy][x * SS + fx] for fy in range(SS) for fx in range(SS)) / (SS * SS)
                row += "X" if (cov >= self.thr) else "."
            out.append(row)
        return out

def wing(g, S, A, tips, notch_depth=0.4, carve=0.0, fingers=True):
    """bat wing: shoulder S, wrist A, fingertip points `tips` (ordered from the wrist outward); the trailing edge scallops
    back toward the wrist between the tips, and a thin gap is carved up each scallop so the fingers read"""
    pts = [S, A]; notches = []
    prev = A
    for i, t in enumerate(tips):
        if i > 0:
            n = ((prev[0] + t[0]) / 2, (prev[1] + t[1]) / 2)
            n = (n[0] + (A[0] - n[0]) * notch_depth, n[1] + (A[1] - n[1]) * notch_depth)
            pts.append(n); notches.append(n)
        pts.append(t); prev = t
    pts.append((S[0] - 0.5, S[1] + 1.2))
    g.poly(pts)
    for n in (notches if carve else []):
        g.path([n, (n[0] + (A[0] - n[0]) * carve, n[1] + (A[1] - n[1]) * carve)], 0.4, 0.3, v=0, rmin=0.3)
    g.path([S, A], 0.6, 0.55)
    if fingers:
        for t in tips: g.path([A, t], 0.5, 0.45)

def horn(g, a, b, r=0.8):
    g.path([a, b], r, 0.45, rmin=0.5)

def head(g, hx, hy, r=1.9, snout=2.0, nostril=True, jaw=True, down=0.0, horns=1, hornlen=2.6):
    """a dragon head facing right: skull, a boxy snout with a nostril notch, a heavier jaw, swept-back horns"""
    g.ell(hx, hy, r, r * 0.85)
    sx = hx + r * 0.6
    g.poly([(sx, hy - 0.9 + down), (hx + r + snout, hy - 0.4 + down), (hx + r + snout, hy + 1.1 + down), (sx, hy + 1.3 + down)])
    if jaw: g.path([(hx - 0.2, hy + r * 0.7), (hx + r + snout - 0.4, hy + 1.2 + down)], 0.5, 0.5, rmin=0.5)
    if nostril: g.set(hx + r + snout - 0.9, hy - 0.4 + down, 0)
    for i in range(horns):
        sw = i * 1.2
        horn(g, (hx - 0.2 + sw * 0.2, hy - r * 0.7), (hx - 0.2 - hornlen + sw * 0.1 - 0.4 * i, hy - r * 0.7 - hornlen * (0.55 - 0.1 * i)))

SIZES = {1: 0.62, 2: 0.7, 3: 0.86, 4: 1.0, 5: 1.0}

def TT(k, x, y): return (W - 1) / 2 * (1 - k) + x * k, 15 - (15 - y) * k

def build(fn, hd, eye, body, **kw):
    by = {}
    for stage, k in SIZES.items():
        g = fn(k=k, **kw)
        hx, hy = TT(k, hd[0], hd[1]); ex, ey = TT(k, eye[0], eye[1])
        g._raw(ex, ey, 0)
        by[stage] = dict(rows=g.rows(), head=(hx, hy, max(1.6, hd[2] * k)), eye=(round(ex), round(ey)),
                         body=(TT(k, body[0], 0)[0], TT(k, body[1], 0)[0]))
    return dict(by_stage=by)

def seal_holes(g):
    """fill every enclosed gap (a pixel hole the shapes left between a horn and the skull, say) so the only hole left is the eye"""
    rows = g.rows(); n = len(rows)
    ext = [[False] * n for _ in range(n)]; st = []
    def push(x, y):
        if 0 <= x < n and 0 <= y < n and rows[y][x] != 'X' and not ext[y][x]: ext[y][x] = True; st.append((x, y))
    for i in range(n): push(i, 0); push(i, n - 1); push(0, i); push(n - 1, i)
    while st:
        x, y = st.pop()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)): push(x + dx, y + dy)
    for y in range(n):
        for x in range(n):
            if rows[y][x] != 'X' and not ext[y][x]: g._raw(x, y, 1)

def build2(fn, hd, eye, body, **kw):
    """build() for the second-pass archetypes: enclosed gaps are sealed before the eye hole is punched"""
    by = {}
    for stage, k in SIZES.items():
        g = fn(k=k, **kw)
        hx, hy = TT(k, hd[0], hd[1]); ex, ey = TT(k, eye[0], eye[1])
        seal_holes(g)
        g._raw(ex, ey, 0)
        by[stage] = dict(rows=g.rows(), head=(hx, hy, max(1.6, hd[2] * k)), eye=(round(ex), round(ey)),
                         body=(TT(k, body[0], 0)[0], TT(k, body[1], 0)[0]))
    return dict(by_stage=by)

def batwing(g, T, S, drop=2.2, n=3, tooth=1.6):
    """a bat wing swept back from the shoulder S to the wing tip T: a straight arm along the top and a membrane hanging
    below it with n pointed scallops (teeth) along the lower edge"""
    ax, ay = T; sx, sy = S
    # lower edge base runs parallel to the arm, `drop` below it
    b0 = (ax + 0.6, ay + drop); b1 = (sx - 0.6, sy + 0.6)
    pts = [T, S, b1]
    base = [(b1[0] + (b0[0] - b1[0]) * i / n, b1[1] + (b0[1] - b1[1]) * i / n) for i in range(n + 1)]
    for i in range(n):
        a, b = base[i], base[i + 1]
        tip = ((a[0] + b[0]) / 2 - 0.5, (a[1] + b[1]) / 2 + tooth)
        pts.append(tip); pts.append(b)
    pts.append((ax, ay + 1.0))
    g.poly(pts)
    g.path([T, S], 0.55, 0.6)


def legs(g, xs, top=12, w=1):
    for x in xs: g.rect(x, top, x + w - 1, 15)

# ---------------- western dragons ----------------
def west(k=1.0, wing_up=True):
    g = Cv(k)
    batwing(g, (0.4, 1.8), (7.8, 7.4), 2.4, 3, 1.5)
    g.ell(6.8, 10.8, 4.4, 2.2); g.ell(9.6, 10.4, 1.9, 1.8)
    g.path([(10.4, 9.8), (11.8, 8.2)], 1.5, 1.3)
    head(g, 13.0, 7.6, 1.7, 1.2, horns=1, hornlen=2.4)
    legs(g, (3, 6, 9))
    g.path([(2.8, 11.0), (1.4, 12.0), (0.6, 13.2)], 1.1, 0.55)
    g.poly([(-0.4, 12.4), (1.2, 12.8), (1.8, 14.8)])
    return g

def soar(k=1.0):
    g = Cv(k)
    batwing(g, (-0.2, 0.2), (7.4, 6.2), 2.8, 4, 1.7)
    g.ell(7.0, 8.6, 4.0, 2.0); g.ell(9.4, 8.2, 1.9, 1.8)
    g.path([(10.2, 7.8), (11.8, 6.4)], 1.4, 1.2)
    head(g, 13.0, 5.6, 1.7, 1.2, horns=1, hornlen=2.2)
    g.path([(3.4, 9.2), (1.6, 10.8), (1.4, 13.0), (3.0, 14.6)], 1.0, 0.5)   # streaming tail
    g.poly([(2.2, 14.6), (4.6, 13.8), (4.0, 15.4)])
    g.rect(6, 10, 6, 11); g.rect(9, 10, 9, 11)                              # tucked feet
    return g

def rear(k=1.0):
    g = Cv(k)
    batwing(g, (-0.2, 1.2), (6.8, 6.6), 2.6, 3, 1.5)
    g.ell(8.4, 9.0, 2.7, 3.4)
    g.path([(9.4, 6.4), (10.6, 4.6), (11.8, 3.6)], 1.5, 1.2)
    head(g, 12.8, 3.0, 1.7, 1.3, horns=1, hornlen=2.2)
    g.path([(10.4, 8.0), (12.4, 8.8)], 0.7, 0.55); g.set(13.2, 8.6); g.set(13.2, 9.6)   # clawed fore-arm
    legs(g, (6, 9), 12, 2)
    g.path([(6.0, 11.6), (3.2, 13.6), (1.0, 12.4), (0.6, 9.6)], 1.2, 0.55)
    g.poly([(-0.4, 9.4), (1.6, 9.2), (0.8, 7.4)])
    return g

def wyv(k=1.0, droop=False):
    g = Cv(k)
    if not droop: batwing(g, (1.0, 2.0), (8.6, 6.8), 2.4, 3, 1.5); g.line(1.0, 2.0, 1.2, 0.6, 1, 0.5)
    else:
        g.poly([(8.6, 6.8), (7.0, 8.0), (0.2, 12.4), (2.0, 11.6), (2.4, 14.2), (4.2, 12.4), (5.4, 14.6), (6.2, 11.6)])
    g.ell(8.2, 9.6, 2.7, 3.0)
    g.path([(9.4, 7.4), (10.6, 5.6), (11.8, 5.0)], 1.3, 1.1)
    head(g, 12.8, 4.6, 1.7, 1.3, horns=1, hornlen=2.2)
    g.ell(7.6, 12.2, 1.9, 1.7); legs(g, (7,), 13, 2); g.rect(9, 15, 10, 15)
    g.rect(9, 9.6, 10, 9.6); g.set(10.6, 10.4)
    g.path([(5.8, 11.4), (3.0, 12.8), (0.8, 12.0)], 1.1, 0.5)
    g.poly([(-0.4, 11.0), (0.4, 13.4), (2.0, 12.0)])
    return g

# ---------------- eastern dragons ----------------
def east_head(g, hx, hy, tilt=0.0, big=1.0):
    g.ell(hx, hy, 1.9 * big, 1.5 * big)
    g.poly([(hx + 0.8, hy - 0.9), (hx + 3.0, hy - 0.8 + tilt), (hx + 3.0, hy + 0.5 + tilt), (hx + 0.8, hy + 1.3)])
    g.set(hx + 2.4, hy - 0.8 + tilt, 0)                                    # nostril
    g.path([(hx - 0.4, hy - 1.2), (hx - 2.6, hy - 1.6), (hx - 3.2, hy - 0.4)], 0.6, 0.4)   # horn sweeping back along the mane
    g.path([(hx + 2.6, hy + 0.8), (hx + 2.2, hy + 2.2), (hx + 2.8, hy + 3.0)], 0.4, 0.4, rmin=0.4)   # whisker
def mane(g, pts):
    for (x, y) in pts: g.set(x, y)
def claws(g, pts):
    for (x, y) in pts: g.rect(x, y, x, y + 1)
def east(k=1.0, legs=False):      # vertical S
    g = Cv(k)
    g.path([(12.6, 3.8), (11.8, 6.2), (8.6, 7.6), (5.0, 8.4), (3.2, 10.6), (4.8, 13.0), (8.4, 13.8), (12.6, 13.4)], 1.35, 0.6)
    east_head(g, 12.8, 3.8)
    mane(g, [(10.6, 4.4), (10.0, 6.4), (7.6, 6.0), (4.6, 7.0)])
    claws(g, [(8, 14), (11, 14)]) if legs else None
    return g
def eelet(k=1.0):   # Ripple: comma, big head, tail curled up behind
    g = Cv(k)
    g.path([(12.2, 4.8), (11.0, 7.6), (8.4, 10.4), (5.4, 11.6), (2.8, 10.4), (2.2, 7.6)], 1.45, 0.6)
    east_head(g, 12.4, 4.4, big=1.1)
    mane(g, [(10.2, 5.6), (9.0, 8.0)])
    return g
def eastlong(k=1.0):  # flat wave, head mid height
    g = Cv(k)
    g.path([(0.4, 12.4), (2.0, 9.6), (3.8, 8.6), (5.2, 10.6), (6.4, 12.8), (8.2, 12.6), (9.6, 9.8), (11.2, 8.6)], 1.3, 0.5)
    east_head(g, 12.8, 7.8, 0.2)
    mane(g, [(9.2, 7.2)])
    return g
def eastloop(k=1.0):  # Skywhisker: serpent coiled in a ring
    g = Cv(k)
    g.path([(12.8, 4.2), (11.4, 7.0), (9.8, 10.6), (7.0, 12.4), (4.2, 11.0), (3.4, 8.2), (5.4, 6.4), (8.0, 7.4), (8.6, 9.6)], 1.2, 1.0)
    g.path([(7.0, 12.4), (5.0, 14.0), (1.2, 14.2)], 1.0, 0.5)
    east_head(g, 12.8, 4.2)
    mane(g, [(10.4, 5.4), (9.6, 7.6), (6.4, 5.8), (3.2, 6.6)])
    return g

# ---------------- lindwurms ----------------
def wurmdrag(k=1.0):
    """scruffy low lindwurm: a thin undulating body hugging the ground, head down, ragged spikes"""
    g = Cv(k)
    g.path([(0.6, 12.0), (2.8, 13.6), (5.8, 12.4), (8.6, 13.4), (10.8, 12.2)], 1.3, 1.5)
    g.path([(10.8, 12.2), (11.8, 11.0)], 1.5, 1.4)
    head(g, 13.0, 10.8, 1.8, 1.3, horns=1, hornlen=2.0, down=0.3)
    for x in (4.2, 7.0): g.poly([(x - 0.8, 12.0), (x, 10.2), (x + 0.8, 12.0)])
    g.rect(10, 13, 10, 15); g.rect(12, 13, 12, 15)
    return g
def wurm(k=1.0, up=0.0, fat=0.0, drag=False):
    g = Cv(k)
    g.ell(6.6, 11.2, 4.7, 2.5 + fat)
    g.path([(10.0, 10.6), (11.8, 8.8 - up)], 1.5, 1.3)
    head(g, 13.0, 8.2 - up, 1.8, 1.3, horns=1, hornlen=2.2, down=0.2 if drag else 0)
    for x in (5, 8, 11): g.set(x, 8.0 - fat)       # dorsal spines
    legs(g, (9, 11), 12.4, 1)
    g.path([(2.6, 12.0), (1.2, 11.4), (0.6, 8.6)], 1.3, 0.5)
    g.rect(4, 13.6, 6, 15)  # rear belly foot
    return g

# ---------------- drakes ----------------
def drake(k=1.0):
    g = Cv(k)
    g.ell(7.0, 11.2, 3.7, 2.0)
    g.path([(9.4, 10.4), (10.6, 8.8)], 1.3, 1.2)
    head(g, 12.2, 8.0, 1.9, 1.3, horns=1, hornlen=1.8)
    g.poly([(10.4, 7.0), (8.2, 4.6), (9.4, 8.0)]); g.poly([(10.8, 6.4), (10.0, 3.8), (11.6, 7.2)])   # frill spines
    legs(g, (4, 6, 9), 12.4)
    g.path([(3.6, 11.4), (1.8, 11.0), (1.0, 8.8), (2.2, 7.2)], 0.9, 0.5)
    return g
def drakeheavy(k=1.0):
    g = Cv(k)
    g.ell(6.8, 11.0, 4.3, 2.6)
    g.path([(10.2, 10.0), (11.4, 8.6)], 1.7, 1.5)
    head(g, 12.4, 7.8, 2.1, 1.0, horns=1, hornlen=2.0)
    g.poly([(14.2, 7.0), (14.8, 5.6), (15.4, 7.2)])           # nose horn
    for x in (4.2, 6.2, 8.2): g.poly([(x - 1, 8.8), (x, 6.6), (x + 1, 8.8)])      # back plates
    legs(g, (3, 6, 9), 12.6, 2)
    g.path([(2.8, 11.0), (1.4, 12.0), (0.8, 12.6)], 1.3, 0.9); g.ell(0.8, 12.6, 1.0, 1.2)
    return g

# ---------------- hoarders ----------------
def hoard(k=1.0):
    g = Cv(k)
    batwing(g, (2.4, 3.8), (6.2, 7.4), 1.8, 2, 1.2)
    g.ell(7.6, 10.4, 4.0, 3.6)
    g.path([(9.6, 8.0), (10.2, 6.4)], 1.5, 1.4)
    head(g, 10.8, 5.4, 2.3, 1.2, horns=1, hornlen=2.0)
    g.path([(4.0, 13.4), (1.8, 13.8), (0.8, 12.2), (1.6, 10.8)], 1.0, 0.5)
    legs(g, (5, 9), 13, 2)
    return g
def keeper(k=1.0):
    g = Cv(k)
    batwing(g, (1.6, 3.6), (6.4, 6.8), 1.8, 2, 1.2)
    g.ell(7.6, 9.4, 2.9, 3.9)
    g.path([(8.6, 6.8), (9.4, 5.2)], 1.5, 1.4)
    head(g, 10.4, 3.8, 2.2, 1.4, horns=1, hornlen=2.0)
    g.path([(10.2, 8.4), (12.2, 9.4)], 0.8, 0.6); g.set(12.8, 9.4)      # short arm
    legs(g, (6, 9), 12.8, 2)
    g.path([(5.4, 12.4), (2.8, 13.6), (0.8, 12.6)], 1.2, 0.5)
    return g
def boulder(k=1.0, lumps=3):
    g = Cv(k)
    g.ell(7.0, 10.8, 5.2, 3.0)
    for x in (4.4, 6.8, 9.2)[:lumps]: g.ell(x, 7.8, 1.2, 1.0)           # gem nodules on the back
    g.path([(11.0, 10.6), (12.0, 10.2)], 1.6, 1.4)
    head(g, 12.6, 9.2, 2.2, 0.9, horns=1, hornlen=2.0)
    legs(g, (3, 5, 9, 11), 12.8, 1)
    g.path([(2.0, 11.6), (0.8, 12.8)], 1.3, 0.8)
    return g
def crystal(k=1.0):
    g = Cv(k)
    for (x, ty, w) in ((3.4, 3.0, 1.0), (5.8, 0.8, 1.2), (8.4, 2.4, 1.1)):
        g.poly([(x - w, 8.2), (x, ty), (x + w, 8.2)])
    g.ell(6.8, 10.8, 4.8, 2.6)
    g.path([(10.6, 10.4), (12.0, 9.6)], 1.6, 1.4)
    head(g, 13.0, 9.2, 1.8, 1.0, horns=1, hornlen=1.8)
    g.poly([(14.4, 7.8), (15.6, 5.6), (15.6, 8.2)])                 # long snout crystal
    legs(g, (3, 5, 9, 11), 12.8, 1)
    g.path([(2.2, 11.4), (0.8, 12.2)], 1.3, 0.8); g.poly([(-0.4, 10.6), (0.8, 12.2), (-0.2, 13.6)])
    return g

# ---------------- hydra ----------------
def hydra(k=1.0):
    g = Cv(k)
    g.ell(6.4, 11.8, 4.2, 2.3); legs(g, (3, 5, 8, 10), 12.8, 1)
    g.path([(2.8, 12.0), (1.4, 13.0), (0.6, 14.4)], 1.0, 0.5)
    g.path([(9.2, 10.6), (11.0, 8.6), (12.6, 7.0)], 1.0, 0.9); head(g, 13.2, 6.2, 1.4, 1.1, horns=0, nostril=False)
    g.path([(7.4, 10.2), (7.4, 6.4), (8.2, 4.0)], 1.0, 0.9); head(g, 8.8, 2.8, 1.4, 1.1, horns=0, nostril=False)
    g.path([(5.0, 10.2), (3.6, 8.4), (2.4, 6.8)], 1.0, 0.9); head(g, 2.8, 5.8, 1.4, 1.1, horns=0, nostril=False)
    return g

# ---------------- coils ----------------
def gemcoil(k=1.0):
    g = Cv(k)
    batwing(g, (0.2, 2.6), (7.0, 7.4), 2.0, 3, 1.4)
    g.ell(7.6, 13.0, 7.0, 2.4)                                              # the heap
    for x in (3.6, 6.2, 9.0, 11.6): g.poly([(x - 1, 11.2), (x, 9.6), (x + 1, 11.2)])
    g.path([(10.6, 11.4), (11.6, 8.4), (11.4, 6.6)], 1.3, 1.1)
    head(g, 12.2, 5.6, 1.8, 1.3, horns=1, hornlen=2.2)
    g.path([(3.0, 11.0), (1.6, 9.6), (2.2, 8.2)], 1.0, 0.5)
    return g
def stormcoil(k=1.0):
    g = Cv(k)
    g.path([(12.6, 3.0), (10.4, 5.0), (6.6, 5.6), (4.2, 7.6), (5.4, 10.0), (9.4, 10.6), (11.6, 12.4), (9.6, 14.2), (4.6, 14.2), (2.2, 12.8)], 1.3, 0.6)
    east_head(g, 12.8, 3.0)
    mane(g, [(10.0, 3.6), (7.4, 4.2), (3.6, 6.4)])
    return g

# ---------------- strays and hatchlings ----------------
def stray(k=1.0, wing=False):
    g = Cv(k)
    g.ell(7.2, 11.4, 3.2, 1.5)
    g.path([(9.6, 11.0), (10.8, 9.6)], 0.9, 0.9)
    g.ell(11.8, 9.2, 1.6, 1.3); g.poly([(12.4, 8.6), (15.0, 9.0), (15.0, 10.2), (12.4, 10.4)])
    g.set(14.2, 8.8, 0)
    g.path([(11.0, 8.2), (9.8, 6.6)], 0.5, 0.45)                          # one bent horn
    for x in (5.6, 7.4): g.poly([(x - 0.8, 10.2), (x, 8.4), (x + 0.8, 10.2)])  # ragged back spikes
    legs(g, (5, 8, 10), 11.6)
    g.path([(4.4, 11.4), (2.0, 12.0), (1.0, 10.8), (0.4, 13.2)], 0.65, 0.4)
    return g
def hatch(k=1.0):
    g = Cv(k)
    g.ell(6.2, 12.4, 3.4, 2.6)
    g.ell(8.8, 8.2, 3.6, 3.2); g.poly([(10.4, 7.2), (13.2, 8.4), (13.2, 9.8), (10.4, 10.6)])
    g.set(12.4, 8.0, 0)
    g.poly([(7.0, 6.0), (6.6, 3.2), (8.4, 5.6)]); g.poly([(9.6, 5.4), (10.4, 3.0), (11.2, 5.6)])  # horn buds
    g.path([(4.0, 11.0), (2.4, 9.4)], 0.9, 0.6)                          # tiny wing bud
    g.path([(3.2, 13.0), (1.4, 12.4), (1.0, 10.8)], 0.9, 0.5)
    legs(g, (5, 8), 14, 2)
    return g
def egg(k=1.0):
    """wyrmling in a cracked eggshell: the hatchling's head and horn buds above a bowl with a zigzag rim"""
    g = Cv(k)
    g.ell(8.4, 8.2, 3.6, 3.2); g.poly([(10.4, 7.2), (13.2, 8.4), (13.2, 9.8), (10.4, 10.6)])
    g.poly([(7.0, 6.0), (6.6, 3.2), (8.4, 5.6)]); g.poly([(9.8, 5.4), (10.6, 3.0), (11.4, 5.6)])
    rim = [(1.4, 11.4)]
    for i in range(6): rim += [(2.6 + i * 2.1, 10.2), (3.6 + i * 2.1, 11.6)]
    g.poly(rim + [(14.0, 13.6), (11.4, 15.2), (4.4, 15.2), (1.4, 13.6)])
    g.set(12.4, 8.0, 0)
    return g
def ragwing(k=1.0):
    g = Cv(k)
    g.poly([(7.8, 7.8), (5.2, 5.6), (0.6, 5.0), (2.0, 7.2), (0.8, 9.2), (3.4, 8.4), (3.0, 10.4), (5.6, 9.0)])   # torn wing, drooping
    g.ell(6.8, 10.8, 4.4, 2.3); g.ell(9.6, 10.4, 1.9, 1.8)
    g.path([(10.4, 9.8), (11.8, 8.6)], 1.5, 1.3)
    head(g, 13.0, 8.2, 1.7, 1.2, horns=1, hornlen=1.8)
    legs(g, (3, 6, 9), 12.4)
    g.path([(2.8, 11.2), (1.4, 12.4), (0.6, 14.0)], 1.0, 0.5)
    return g


# ---------------- second pass: unmistakable dragon cues (horned snout, spiked ridge, spade or flame tail, claws, folded wings) ----------------
def head3(g, hx, hy, r=1.7, snout=1.2, down=0.0, long_horn=3.0, short_horn=2.2, jaw=True):
    """dragon head facing right with a visible snout, a nostril notch on top of it and TWO horns: a long one swept back and a
    shorter one standing up behind the brow (a V of horns)"""
    g.ell(hx, hy, r, r * 0.85)
    sx = hx + r * 0.6
    g.poly([(sx, hy - 0.9 + down), (hx + r + snout, hy - 0.4 + down), (hx + r + snout, hy + 1.1 + down), (sx, hy + 1.3 + down)])
    if jaw: g.path([(hx - 0.2, hy + r * 0.7), (hx + r + snout - 0.4, hy + 1.2 + down)], 0.5, 0.5, rmin=0.5)
    horn(g, (hx - 0.5, hy - r * 0.6), (hx - 0.5 - long_horn, hy - r * 0.6 - long_horn * 0.35), 0.8)
    horn(g, (hx + 0.4, hy - r * 0.7), (hx - 0.4 - short_horn * 0.3, hy - r * 0.7 - short_horn), 0.75)

def spade(g, x, y, dx, dy, s=1.0):
    """a spade tail tip at (x, y) pointing along (dx, dy)"""
    n = math.hypot(dx, dy) or 1; dx, dy = dx / n, dy / n
    px, py = -dy, dx
    tip = (x + dx * 1.6 * s, y + dy * 1.6 * s)
    g.poly([tip, (x + px * 1.0 * s, y + py * 1.0 * s), (x - dx * 0.5 * s, y - dy * 0.5 * s), (x - px * 1.0 * s, y - py * 1.0 * s)])

def crest(g, xs, hts, drop=0):
    """spines standing on the top surface of what is already drawn: column x (design coordinates) gets hts[i] pixels above the
    topmost lit pixel in that column (so they always touch the body)"""
    rows = g.rows()
    for i, x in enumerate(xs):
        xo = int(round(g.T(x, 0)[0])); h = hts[i % len(hts)]
        t = next((y for y in range(W) if rows[y][xo] == 'X'), None)
        if t is None: continue
        for j in range(1, h + 1): g._raw(xo, t - j + drop, 1)

def spikes(g, xs, base, tops):
    """a comb of one-pixel spines standing on the back: spine i rises from `base` to tops[i] (cycled)"""
    for i, x in enumerate(xs):
        t = tops[i % len(tops)] if isinstance(tops, (list, tuple)) else tops
        g.path([(x, base), (x, t)], 0.5, 0.5, rmin=0.5)

def fold_wing(g, S, tip, back, w=0.7):
    """a small folded wing on the back: a pointed triangle rising from the shoulder S to `tip`, trailing edge to `back`"""
    g.poly([S, tip, back]); g.path([S, tip], w, w * 0.7)

def crag(k=1.0, back='wing'):
    """armoured drake: stocky western body, a V of horns, a short wing / a boulder hump / a fan of crystal shards on the back, a spine comb and a tail curling to a spade"""
    g = Cv(k)
    if back == 'wing': batwing(g, (3.2, 3.8), (8.4, 7.6), 1.8, 2, 1.3)
    g.ell(7.6, 11.0, 4.2, 2.2); g.ell(10.2, 10.6, 1.8, 1.8)
    g.path([(10.8, 10.0), (12.0, 8.4)], 1.6, 1.4)
    head3(g, 13.2, 7.6, 1.7, 1.1)
    if back == 'boulder':
        g.ell(7.0, 8.6, 3.4, 2.4)
        g.path([(5.6, 6.6), (5.6, 8.0)], 0.5, 0.5, v=0, rmin=0.5); g.path([(8.4, 6.4), (8.4, 7.8)], 0.5, 0.5, v=0, rmin=0.5)
        crest(g, (4.6, 7.0, 9.4), (1,))
    elif back == 'crystal':
        for (bx, tx, ty, w) in ((4.8, 3.2, 4.4, 1.5), (7.0, 6.2, 2.4, 1.6), (9.2, 9.2, 4.2, 1.4)):
            g.poly([(bx - w, 9.4), (tx, ty), (bx + w, 9.4)])
    else: spikes(g, (4, 5), 9.8, 8.4)
    legs(g, (4, 7, 10), 12.4)
    g.path([(3.8, 11.8), (2.0, 12.8), (0.9, 11.6)], 1.3, 0.7)
    spade(g, 0.8, 10.0, 0.0, -1.0, 0.9)
    return g

def vault(k=1.0):
    """slim guard drake: crest of a V of horns, a long folded wing along the back, a long ground tail ending in a spade"""
    g = Cv(k)
    fold_wing(g, (8.6, 8.8), (4.4, 4.4), (2.6, 9.0), 0.6)
    g.ell(8.0, 11.0, 3.6, 2.0)
    g.path([(10.6, 10.2), (12.0, 8.0)], 1.5, 1.3)
    head3(g, 13.2, 6.8, 1.7, 1.1)
    legs(g, (6, 10), 12.4, 1); g.rect(7, 14, 7, 15); g.rect(11, 14, 11, 15)
    g.path([(4.8, 11.6), (2.8, 13.0), (1.4, 13.6)], 1.3, 0.6)
    spade(g, 0.4, 13.8, -1.0, 0.1, 0.9)
    return g

def lind(k=1.0, up=0.0, fat=0.0, wings=0, flame=False, chewed=False, tall=1):
    """lindwurm: a long low body on two clawed forelegs, a neck raising a horned head, bat wings (wings=1), torn wings (2) or just a
    tall comb of spines (0), and a spade (or flame) at the tail tip"""
    g = Cv(k)
    if wings == 1: batwing(g, (2.4, 3.6) if not up else (3.2, 4.6), (8.0, 8.8), 2.0 if not up else 2.4, 3, 1.4)
    elif wings == 3: fold_wing(g, (8.2, 9.8), (6.0, 5.8), (4.0, 10.2), 0.6)
    elif wings == 2:
        g.poly([(8.0, 8.8), (5.0, 5.0), (4.4, 7.0), (3.4, 6.2), (3.0, 9.6)]); g.path([(8.0, 8.8), (5.0, 5.0)], 0.6, 0.5)
    g.ell(6.8, 11.6, 4.2, 1.8 + fat)
    g.path([(10.0, 11.0), (11.8, 8.8 - up)], 1.4, 1.2)
    head3(g, 13.2, 7.4 - up, 1.7, 1.1, long_horn=0.8 if chewed else 3.0)
    g.path([(3.0, 12.0), (1.6, 12.8), (0.8, 11.6)], 1.2, 0.7)
    if flame: g.poly([(0.8, 11.2), (-0.2, 9.0), (1.4, 9.6), (1.4, 7.6), (2.4, 10.6)])
    else: spade(g, 0.8, 10.2, 0.0, -1.0, 0.8)
    legs(g, (8, 11), 12.8, 1); g.set(7, 15); g.set(12, 15)                      # forelegs with a claw each
    g.rect(4, 13, 4, 15); g.set(3, 15)                                           # hind foot
    if wings == 0: crest(g, (3, 5, 7, 9), (2, 3, 2, 3))
    else: crest(g, (3, 4), (1, 2))
    return g

CINDER = ["................", "................", "................", "................", "................", ".......#...#....",
          "........#..#....", "........####....", ".....#..##.####.", "....##..#######.", "....#########...", "....#########...",
          ".....########...", "...#########....", "..###########...", ".......##..##..."]
CINDER_ART = dict(rows=[r.replace('#', 'X') for r in CINDER], head=(10.0, 8.5, 2.2), eye=(10, 8), body=(4, 12))

def stormcoil2(k=1.0):
    """a serpent piled in three stacked coils (offset so they read as one spiral), neck and horned head rising from the top, tail tip flicking out of the bottom"""
    g = Cv(k)
    g.ell(7.2, 13.4, 5.8, 1.5)
    g.ell(7.6, 10.2, 4.8, 1.4)
    g.ell(7.2, 7.2, 3.6, 1.3)
    g.path([(11.6, 12.6), (12.0, 11.2)], 1.4, 1.2)       # coil 1 -> 2 at the right
    g.path([(4.0, 9.4), (3.6, 8.2)], 1.3, 1.2)          # coil 2 -> 3 at the left
    g.path([(8.6, 6.2), (10.6, 4.0)], 1.4, 1.2)
    head3(g, 12.8, 2.8, 1.6, 1.3, long_horn=2.6, short_horn=1.8)
    g.path([(2.0, 13.8), (0.8, 12.4)], 1.0, 0.5)
    return g

# ---- registry -----------------------------------------------------------------------------
def _eastking(k=1.0): return east(k, legs=True)
ARCH_DRAGON = {
 'dr_vault':    build2(vault, (13.2, 6.8, 1.9), (12.7, 6.3), (4, 10)),
 'dr_pebbleh':  build2(crag, (13.2, 7.6, 1.9), (12.7, 7.1), (3, 11), back='boulder'),
 'dr_gemh':     build2(crag, (13.2, 7.6, 1.9), (12.7, 7.1), (3, 11), back='crystal'),
 'dr_lind':     build2(lind, (13.2, 7.4, 1.9), (12.7, 6.9), (3, 10), wings=3),
 'dr_lindfat':  build2(lind, (13.2, 7.4, 1.9), (12.7, 6.9), (3, 10), fat=0.6, wings=1),
 'dr_lindrag':  build2(lind, (13.2, 8.0, 1.9), (12.7, 7.5), (3, 10), wings=2, chewed=True),
 'dr_lindup':   build2(lind, (13.2, 5.2, 1.9), (12.7, 4.7), (3, 10), up=2.2, flame=True, wings=1),

 'dr_crag':     build2(crag, (13.2, 7.6, 1.9), (12.7, 7.1), (3, 11)),
 'dr_hatch2':   dict(by_stage={st: CINDER_ART for st in SIZES}),
 'dr_coil2':    build2(stormcoil2, (12.8, 2.8, 1.9), (12.3, 2.3), (2, 12)),
 'dr_hatch':    build(hatch, (8.8, 8.2, 3.6), (10.4, 7.8), (3, 9)),
 'dr_egg':      build(egg, (8.8, 8.2, 3.6), (10.4, 7.8), (3, 12)),
 'dr_west':     build(west, (13.0, 7.6, 1.9), (12.5, 7.1), (4, 10)),
 'dr_soar':     build(soar, (13.0, 5.6, 1.9), (12.5, 5.1), (4, 10)),
 'dr_rear':     build(rear, (12.8, 3.0, 1.9), (12.3, 2.5), (6, 10)),
 'dr_westlow':  build(ragwing, (13.0, 8.2, 1.9), (12.5, 7.7), (4, 10)),
 'dr_wyv':      build(wyv, (12.8, 4.6, 1.9), (12.3, 4.1), (6, 10)),
 'dr_wraith':   build(wyv, (12.8, 4.6, 1.9), (12.3, 4.1), (6, 10), droop=True),
 'dr_east':     build(east, (12.8, 3.8, 1.9), (12.4, 3.4), (3, 11)),
 'dr_eastking': build(_eastking, (12.8, 3.8, 1.9), (12.4, 3.4), (3, 11)),
 'dr_eelet':    build(eelet, (12.4, 4.4, 1.9), (12.0, 4.0), (3, 11)),
 'dr_eastlong': build(eastlong, (12.8, 7.8, 1.9), (12.4, 7.4), (3, 11)),
 'dr_eastloop': build(eastloop, (12.8, 4.2, 1.9), (12.4, 3.8), (3, 11)),
 'dr_wurm':     build(wurm, (13.0, 8.2, 1.9), (12.5, 7.7), (3, 10)),
 'dr_wurmfat':  build(wurm, (13.0, 8.2, 1.9), (12.5, 7.7), (3, 10), fat=0.8),
 'dr_wurmup':   build(wurm, (13.0, 6.0, 1.9), (12.5, 5.5), (3, 10), up=2.2),
 'dr_wurmdrag': build(wurmdrag, (13.0, 10.8, 1.9), (12.5, 10.3), (3, 10)),
 'dr_drake':    build(drake, (12.2, 8.0, 1.9), (11.7, 7.5), (4, 9)),
 'dr_drakeheavy': build(drakeheavy, (12.4, 7.8, 2.1), (11.9, 7.3), (4, 9)),
 'dr_hoard':    build(hoard, (10.8, 5.4, 2.4), (10.4, 4.9), (4, 10)),
 'dr_keeper':   build(keeper, (10.4, 3.8, 2.2), (10.0, 3.3), (5, 10)),
 'dr_boulder':  build(boulder, (12.6, 9.2, 2.1), (12.1, 8.7), (3, 10)),
 'dr_crystal':  build(crystal, (13.0, 9.2, 1.9), (12.5, 8.7), (3, 10)),
 'dr_hydra':    build(hydra, (13.2, 6.2, 1.6), (12.8, 5.7), (3, 10)),
 'dr_coil':     build(stormcoil, (12.8, 3.0, 1.9), (12.4, 2.6), (2, 12)),
 'dr_gemcoil':  build(gemcoil, (12.2, 5.6, 1.9), (11.8, 5.1), (2, 12)),
 'dr_stray':    build(stray, (11.8, 9.2, 1.6), (12.2, 8.8), (4, 10)),
}
spritegen.register_archetypes(ARCH_DRAGON)

# ---- decorations -------------------------------------------------------------------------
def _right(g, y, x0):
    xs = [x for x in range(int(x0), 16) if g.get(x, y)]
    return max(xs) if xs else None

def _top(g, x):
    for y in range(16):
        if g.get(x, y): return y
    return None

def dr_flame(g, c):
    """a puff of fire from the snout: three ticks fanning out"""
    y = int(round(c['hy'] + 0.4)); x = _right(g, y, c['hx'])
    if x is None or x > 14: return
    g.set(x + 1, y)
    if x + 2 < 16: g.set(x + 2, y - 1); g.set(x + 2, y + 1)

def dr_embers(g, c):
    """a thread of sparks drifting up from the top of the head (a connected diagonal, never a lone pixel)"""
    x = int(round(c['hx'])) + 1
    t = _top(g, x)
    if t is None or t < 3: return
    g.set(x, t - 1); g.set(x + 1, t - 2)
    if t >= 5: g.set(x + 1, t - 3)

def dr_whisk(g, c):
    """long eastern whiskers trailing from the snout"""
    y = int(round(c['hy'] + 0.9)); x = _right(g, y, c['hx'])
    if x is None: return
    if x + 1 < 16: g.set(x, y + 1); g.set(x + 1, y + 2) if y + 2 < 16 else None

def dr_pearl(g, c):
    """a pearl floating above the snout on a thin wisp"""
    x = min(14, int(c['hx'] + c['hr'] + 1.4)); y = int(c['hy'] - c['hr'] - 1.6)
    y = max(2, y)
    g.ellipse(x, y, 1.1, 1.1); g.set(x, y, 0)
    t = _top(g, x)
    if t is not None:
        for yy in range(y + 2, t): g.set(x, yy)

def dr_gems(g, c):
    """a little heap of gems by the feet"""
    for (x, y) in ((12, 14), (13, 14), (14, 14), (13, 13), (12, 15), (13, 15), (14, 15)):
        g.set(x, y)
    g.set(13, 14, 0)

def dr_frill(g, c):
    """neck frill: a fan of spikes behind the head"""
    hx, hy, hr = c['hx'], c['hy'], c['hr']
    for (dx, dy) in ((-hr - 0.6, -1.2), (-hr - 1.2, 0.2), (-hr - 0.8, 1.6)):
        g.set(hx + dx, hy + dy)

def dr_ridge(g, c):
    """a row of dorsal plates along the back with gaps between"""
    for i, x in enumerate(range(int(c['b0']) + 1, int(c['b1']) + 1)):
        t = _top(g, x)
        if t is not None and t > 3 and i % 2 == 0: g.set(x, t - 1)

def dr_scars(g, c):
    """ragged: torn holes along the body"""
    for x in range(int(c['b0']) + 1, int(c['b1']), 3):
        t = _top(g, x)
        if t is not None and t + 3 < 12 and g.get(x, t + 3): g.set(x, t + 2, 0)

def dr_cloud(g, c):
    """a little storm cloud above the head"""
    x, y = c['hx'] - 3, max(1, c['hy'] - c['hr'] - 2)
    for dx in (-1, 0, 1, 2): g.set(x + dx, y)
    g.set(x, y - 1); g.set(x + 1, y - 1)

def dr_orb(g, c):
    """elemental orb floating by the head (four dots in a ring)"""
    x, y = c['hx'] - 4, max(2, c['hy'] - c['hr'] - 1)
    for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)): g.set(x + dx, y + dy)

def dr_belly(g, c):
    """armoured belly plates: a row of gaps low on the body"""
    for x in range(int(c['b0']) + 1, int(c['b1']), 2):
        g.set(x, 13, 0)

spritegen.EXTRA_HANDLERS.update({
 'dr_flame': dr_flame, 'dr_embers': dr_embers, 'dr_whisk': dr_whisk, 'dr_pearl': dr_pearl, 'dr_gems': dr_gems,
 'dr_frill': dr_frill, 'dr_ridge': dr_ridge, 'dr_scars': dr_scars, 'dr_cloud': dr_cloud, 'dr_orb': dr_orb,
 'dr_belly': dr_belly,
})
