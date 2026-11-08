"""Bug archetypes (16x16, facing right, ground on row 15), built from parts so wings, shells and legs can be tuned.
Reading rules: every bug has THIN ANTENNAE (2+ px) and SPINDLY LEGS; the silhouettes differ by body plan:
 grub / caterpillar = low segmented sausage, pupa = upright cocoon, butterfly = tall wing sail,
 moth = swept delta wing, beetle = low dome (+ horn / mandibles), dragonfly = long thin body on a reed with 4 wings,
 mantis = tall with folded arms, bee = fat body with wings and stinger, ant = three beads on tall legs, roach = flat with whips.
Built natively at each stage size (no averaging). Also registers the bug_* decorations (EXTRA_HANDLERS)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from archetypes_fox import _G, W
import spritegen

SIZES = {1: 0.62, 2: 0.7, 3: 0.86, 4: 1.0, 5: 1.0}

def _T(k, x, y):
    return (W - 1) / 2 * (1 - k) + x * k, 15 - (15 - y) * k

class B(_G):
    def px(self, x, y, v=1):
        tx, ty = self.T(x, y); self._raw(tx, ty, v)
    def legs(self, xs, top=13.0, lean=0):
        """vertical legs down to row 15; they keep 1 px width at every size"""
        for x in xs:
            tx, ty = self.T(x, top)
            for y in range(int(round(ty)), 16): self._raw(tx + (lean if y < 15 else lean * 1.5), y)
    def feelers(self, hx, hy, r, n=3.2, spread=1.0):
        """a pair of antennae rising from the head, at least 2 px tall at every size"""
        tx, ty = self.T(hx, hy - r + 0.3)
        tx = int(round(tx)); ty = int(round(ty))
        hh = max(2, int(round(n * self.k)))
        for i in range(1, hh + 1):
            self._raw(tx, ty - i)
        self._raw(tx + 1, ty - hh - 1 + (0 if hh > 2 else 1))
        if spread:
            self._raw(tx - 1, ty - max(1, hh - 1))
    def fl(self, x0, y0, x1, y1, v=1):
        self.line(x0, y0, x1, y1, v)
    def blade(self, x0, y0, x1, y1, w=1.4, belly=0.5, v=1):
        """a lens-shaped blade (wing) along a line: widest at `belly` of the way, tapering at both ends"""
        n = 14
        for i in range(n + 1):
            t = i / n
            r = w * (1 - abs(t - belly) / max(belly, 1 - belly) * 0.85)
            self.ell(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, v)
    def poly(self, pts, v=1):
        P = [self.T(x, y) for x, y in pts]
        for y in range(W):
            for x in range(W):
                inside = False; j = len(P) - 1
                for i in range(len(P)):
                    xi, yi = P[i]; xj, yj = P[j]
                    if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi + 1e-9) + xi: inside = not inside
                    j = i
                if inside: self.p[y][x] = v
    def clear_below(self, row, x0=0, x1=16):
        for y in range(int(row), 16):
            for x in range(x0, x1): self.p[y][x] = 0

# ---- stage-1 / early bodies -----------------------------------------------------------------------
def _egg(k=1.0):
    """a cracked egg: zigzag rim and two antenna tips poking out"""
    g = B(k)
    g.ell(8.0, 11.0, 3.9, 4.2)
    g.feelers(8.0, 7.2, 1.0, 2.6)
    g.legs([6.4, 9.6], 14.0)
    for x in range(5, 12): g.px(x, 15)
    g.px(5, 7.0, 0); g.px(7, 6.4, 0); g.px(9, 7.0, 0); g.px(11, 6.4, 0)
    return g

def _nub(k=1.0):
    """a tiny round-headed grub with a stubby body"""
    g = B(k)
    g.ell(9.3, 11.2, 3.6, 3.5)
    g.ell(4.8, 12.6, 3.0, 2.2)
    g.px(1.6, 13.2); g.px(1.0, 12.0)
    g.feelers(9.6, 11.2, 3.6, 3.0)
    for x in (4, 6, 8, 10, 11): g.px(x, 14.5)
    return g

def _larva(k=1.0, segs=5, hump=1.0, head=2.3):
    """caterpillar: beads in a low arch, head at the right, feet under each bead"""
    g = B(k)
    xs = [11.8 - i * 2.35 for i in range(segs)]
    for i, x in enumerate(xs):
        arch = (1.0 - abs(i - (segs - 1) / 2.0) / segs * 1.4) * hump
        y = 12.8 - arch * 1.3
        if i == 0: g.ell(x + 0.6, y - 0.4, head, head)
        else: g.ell(x, y, 1.9 - i * 0.07, 1.9 - i * 0.07)
        g.px(x, 14.5); g.px(x - 0.7, 15) if i else None
    g.feelers(12.4, 11.2 - 0.4, head, 3.4)
    g.px(1.0, 13.6)
    return g

def _grub(k=1.0, fat=0.0):
    """C-shaped grub: a fat curled body, a small head tucked to the right, three tiny legs"""
    g = B(k)
    g.ell(7.0, 11.4, 5.1 + fat, 3.6 + fat * 0.5)
    g.ell(2.6, 9.4, 2.2, 2.4)
    g.ell(12.0, 12.4, 2.1, 2.1)
    g.feelers(12.2, 12.4, 2.1, 2.6)
    for x in (9.6, 11.2, 12.8): g.px(x, 14.6)
    for x in (4.5, 7.0): g.px(x, 14.8)
    return g

def _pill(k=1.0):
    """a rolled-up armoured ball with a face peeking out"""
    g = B(k)
    g.ell(7.6, 10.4, 5.2, 5.0)
    g.ell(12.4, 12.6, 1.9, 1.8)
    g.feelers(12.6, 12.4, 1.8, 2.8)
    # armour bands
    if k > 0.9: g.line(4.2, 7.2, 6.6, 14.4, 0); g.line(8.4, 6.2, 8.6, 14.8, 0)
    for x in (5.0, 7.0, 9.0, 11.0): g.px(x, 15)
    return g

def _pupa(k=1.0, tall=0.0):
    """upright cocoon on a thread with banded segments and antenna tips peeking from the top"""
    g = B(k)
    g.ell(7.6, 9.0 + tall * 0.3, 3.3, 5.6 + tall)
    g.px(7.6, 2.6 - tall); g.px(7.6, 3.4 - tall)
    g.feelers(9.0, 3.6 - tall, 0.8, 2.6)
    for yy in ((7.5, 10.0, 12.0) if k > 0.9 else (9.5,)): g.line(5.0, yy, 10.2, yy + 0.4, 0)
    for x in (5, 7, 9, 10): g.px(x, 15)
    return g

# ---- flying bugs --------------------------------------------------------------------------------
def _butterfly(k=1.0, wing=1.0, tails=True, head=1.7):
    """perched butterfly in profile: a tall closed-wing sail over a slim body, club antennae, tails on the hindwing"""
    g = B(k)
    g.line(10.0, 11.8, 3.4, 12.6); g.line(10.0, 12.6, 3.6, 13.2)   # abdomen
    g.ell(10.6, 11.8, 1.5, 1.6)                       # thorax
    g.ell(12.6, 10.8, head, head)                     # head
    g.feelers(12.8, 10.8, head, 3.2)
    t = 1.5 + (1 - wing) * 3
    g.poly([(10.2, 11.0), (4.0, 10.6), (2.6, 5.4), (4.6, t), (9.0, t - 0.4), (11.4, 4.2), (11.0, 8.0)])   # wing sail
    g.ell(5.2, 11.2, 2.6, 2.0)                        # hindwing lobe
    if tails: g.px(3.4, 14.0); g.px(3.0, 15)
    g.line(5.0, 9.4, 8.0, 7.0, 0)                     # short vein
    g.legs([10.2, 12.0], 13.0)
    return g

def _moth(k=1.0, fluff=0.0, wing=1.0):
    """moth: a furry round chest and head with a long delta wing swept back like a tent, feathery antennae"""
    g = B(k)
    g.ell(10.4, 10.8, 3.2 + fluff, 3.4 + fluff * 0.5)  # furry chest
    g.ell(12.8, 9.6, 1.7, 1.7)
    g.tri(10.2, 6.6, 0.4, 13.4 - (wing - 1) * 3, 11.0, 13.6, min_h=3)   # tented wing
    g.ell(5.8, 12.0, 4.2 * wing, 1.7)
    tx, ty = g.T(13.0, 7.9); tx = int(round(tx)); ty = int(round(ty))
    hh = max(2, int(round(3 * k)))
    for i in range(1, hh + 1): g._raw(tx, ty - i)
    g._raw(tx - 1, ty - hh); g._raw(tx + 1, ty - hh); g._raw(tx + 1, ty - hh + 1) if hh > 2 else None
    g.legs([10.0, 12.0], 13.4)
    return g

def _dragon(k=1.0, wing=1.0, thick=0.0):
    """dragonfly perched on a reed: long banded body, huge eye, four slender wings fanned up and back"""
    g = B(k)
    g.ell(12.2, 7.4, 2.1, 2.0)                        # big head
    g.ell(9.6, 7.8, 1.9 + thick, 1.9 + thick)         # thorax
    g.blade(8.4, 8.2, 0.4, 8.6, 1.0 + thick * 0.4, 0.3)   # long abdomen
    s = wing
    g.blade(10.0, 6.6, 10.0 - 7.0 * s, 1.0, 1.0, 0.5)     # forewings
    g.blade(9.0, 6.8, 9.0 - 8.0 * s, 3.4, 1.0, 0.5)       # hindwings
    g.legs([6.8], 9.0)
    for x in (5, 6, 7, 8): g.px(x, 15)
    g.feelers(12.8, 6.6, 1.0, 1.0, spread=0)
    return g

def _mantis(k=1.0, tall=0.0, head=1.9):
    """praying mantis: tall upright body, triangle head, folded spiked arms, long abdomen"""
    g = B(k)
    g.tri(10.8, 1.6 - tall, 13.4, 3.0 - tall, 10.8, 4.6 - tall, min_h=2)
    g.ell(10.9, 3.0 - tall, head, head)
    g.line(10.4, 4.4 - tall, 8.4, 9.8); g.line(11.0, 4.4 - tall, 9.0, 9.8)    # thorax
    g.ell(6.2, 11.0, 4.6, 1.9)                       # abdomen
    # folded raptor arms: out and back
    g.line(11.2, 5.6 - tall, 14.6, 6.2 - tall); g.line(14.6, 6.2 - tall, 12.0, 8.8 - tall)
    g.px(14.8, 7.2 - tall)
    g.line(10.0, 7.0, 9.2, 10.0)
    g.legs([5.0, 7.4, 9.4], 11.8, lean=0)
    g.feelers(10.9, 3.0 - tall, head, 2.6, spread=0)
    return g

def _bee(k=1.0, fluff=0.0, stinger=True):
    """fuzzy bee: fat body, two slender wings swept back over it, stinger at the back"""
    g = B(k)
    g.ell(6.8, 11.0, 4.3 + fluff, 3.3 + fluff * 0.6)
    g.ell(11.8, 10.0, 2.1, 2.0)
    if stinger: g.line(2.4, 11.4, 0.6, 12.0)
    g.blade(8.6, 7.8, 1.6, 3.6, 1.3, 0.5)
    g.blade(9.8, 7.8, 4.6, 1.8, 1.1, 0.5)
    g.feelers(12.2, 10.0, 2.0, 3.0)
    g.legs([5.6, 8.0, 10.2], 13.4)
    return g

def _ant(k=1.0, head=2.0, abd=2.8):
    """ant: three beads (head, thin chest, big abdomen) on tall bent legs, elbowed antennae"""
    g = B(k)
    g.ell(12.2, 8.4, head, head - 0.1)
    g.ell(8.2, 8.6, 1.5, 1.5)
    g.ell(3.8, 9.2, abd, abd - 0.4)
    g.line(11.0, 8.6, 9.4, 8.6)
    # tall legs with knees
    for x0, x1 in ((7.4, 5.6), (8.4, 8.6), (9.2, 11.4)):
        g.line(x0, 9.6, (x0 + x1) / 2, 12.4); g.line((x0 + x1) / 2, 12.4, x1, 14.8)
    g.px(5.4, 15); g.px(8.6, 15); g.px(11.6, 15)
    tx, ty = g.T(12.8, 6.8); tx = int(round(tx)); ty = int(round(ty))
    g._raw(tx, ty - 1); g._raw(tx, ty - 2); g._raw(tx + 1, ty - 3)
    g._raw(tx - 2, ty - 1); g._raw(tx - 2, ty - 2) if k > 0.7 else None
    return g

# ---- shell bugs -------------------------------------------------------------------------------
def _dome(k=1.0, rx=5.8, ry=5.6, head=1.6, horn=0, mand=False, flat=0.0):
    """beetle dome: a tall rounded shell lifted off the ground on thin legs, head tucked low at the right"""
    g = B(k)
    g.ell(7.2, 14.0, rx + 0.4, ry + 0.8)
    g.clear_below(14 if k > 0.7 else 15)
    g.ell(12.8, 12.6, head, head)
    if horn:
        g.blade(12.8, 11.2, 14.6, 8.2, 0.9, 0.3)
        g.px(14.8, 7.2)
    if mand:
        g.line(13.4, 11.8, 15.2, 9.4); g.line(15.2, 9.4, 14.6, 12.4)
        g.line(13.4, 13.4, 15.2, 14.2)
    g.feelers(12.8, 12.6, head, 2.4, spread=0)
    if k > 0.9: g.line(7.0, 14.0 - ry + 1.4, 7.0, 12.6, 0)        # elytra seam
    g.legs([4.4, 7.6, 10.4], 14.0)
    return g

def _lady(k=1.0):
    """ladybug: a smooth round dome, the head fused into the front, short antennae"""
    g = B(k)
    g.ell(8.0, 14.2, 5.8, 6.6)
    g.clear_below(14 if k > 0.7 else 15)
    g.ell(13.2, 12.8, 1.4, 1.6)
    g.feelers(13.2, 12.6, 1.5, 2.6, spread=0)
    g.line(8.2, 8.0, 8.2, 13.4, 0)
    g.legs([5.0, 8.4, 11.2], 14.0)
    return g

def _firefly(k=1.0):
    """firefly: soft long body with a hooded head and wing cases lifted to show a glowing tail"""
    g = B(k)
    g.ell(6.4, 11.6, 5.4, 2.4)
    g.ell(11.8, 11.4, 1.9, 1.9)
    g.blade(9.0, 9.6, 2.0, 5.4, 1.0, 0.5)             # lifted wing case
    g.feelers(12.0, 11.4, 1.9, 2.8)
    g.legs([5.2, 7.6, 10.0], 13.6)
    return g

def _roach(k=1.0, wide=0.0, lash=3.6):
    """flat oval cockroach (affectionate): wide low shell, long whip antennae curving back"""
    g = B(k)
    g.ell(7.4, 12.6, 5.8 + wide, 2.5)
    g.ell(12.4, 12.8, 1.7, 1.6)
    tx, ty = g.T(13.0, 11.4); tx = int(round(tx)); ty = int(round(ty))
    n = max(3, int(round(lash * k)))
    for i in range(1, n + 1): g._raw(tx - (i // 2), ty - i) if False else g._raw(tx + (i // 2) - 0, ty - i)
    g._raw(tx - 1, ty - 1); g._raw(tx - 1, ty - 2)
    g.legs([4.2, 6.8, 9.6], 14.0)
    g.px(3.4, 15); g.px(10.4, 15); g.px(7.4, 15)
    return g

def _build(fn, hd, eye, body, **kw):
    by = {}
    for stage, k in SIZES.items():
        g = fn(k=k, **kw)
        hx, hy = _T(k, hd[0], hd[1]); ex, ey = _T(k, eye[0], eye[1])
        g._raw(ex, ey, 0)
        by[stage] = dict(rows=g.rows(), head=(hx, hy, max(1.6, hd[2] * k)), eye=(round(ex), round(ey)),
                         body=(_T(k, body[0], 0)[0], _T(k, body[1], 0)[0]))
    return dict(by_stage=by)

ARCH_BUG = {
 'bug_egg':    _build(_egg, (8.0, 11.0, 2.0), (8.0, 11.0), (4, 12)),
 'bug_nub':    _build(_nub, (9.3, 11.2, 3.0), (10.2, 10.8), (3, 11)),
 'bug_larva':  _build(_larva, (12.4, 12.4, 2.3), (13.2, 11.8), (2, 11)),
 'bug_grub':   _build(_grub, (12.0, 12.4, 2.1), (12.8, 12.0), (2, 10)),
 'bug_fatgrub': _build(_grub, (12.0, 12.4, 2.1), (12.8, 12.0), (2, 10), fat=0.9),
 'bug_pill':   _build(_pill, (12.4, 12.6, 1.8), (13.0, 12.4), (4, 11)),
 'bug_pupa':   _build(_pupa, (7.6, 7.0, 2.0), (8.6, 7.0), (5, 10)),
 'bug_tallpupa': _build(_pupa, (7.6, 6.0, 2.0), (8.6, 6.0), (5, 10), tall=0.8),
 'bug_butterfly': _build(_butterfly, (11.6, 9.2, 1.7), (12.2, 9.0), (3, 10)),
 'bug_swallow': _build(_butterfly, (11.6, 9.2, 1.7), (12.2, 9.0), (3, 10), wing=1.0, tails=True),
 'bug_flutter': _build(_butterfly, (11.6, 9.2, 1.7), (12.2, 9.0), (3, 10), wing=0.8, tails=False),
 'bug_moth':   _build(_moth, (12.0, 10.0, 2.0), (12.8, 9.8), (3, 10)),
 'bug_fuzzmoth': _build(_moth, (12.0, 10.0, 2.0), (12.8, 9.8), (3, 10), fluff=0.8, wing=0.85),
 'bug_dragon': _build(_dragon, (12.0, 7.2, 2.1), (12.6, 6.8), (1, 10)),
 'bug_skimmer': _build(_dragon, (12.0, 7.2, 2.1), (12.6, 6.8), (1, 10), wing=0.75),
 'bug_mantis': _build(_mantis, (10.9, 3.0, 1.9), (11.4, 2.8), (4, 10)),
 'bug_mantlet': _build(_mantis, (10.9, 4.0, 1.9), (11.4, 3.8), (4, 10), tall=-1.0),
 'bug_bee':    _build(_bee, (11.8, 9.8, 2.1), (12.6, 9.4), (3, 10)),
 'bug_bumble': _build(_bee, (11.8, 9.8, 2.1), (12.6, 9.4), (3, 10), fluff=1.0, stinger=False),
 'bug_ant':    _build(_ant, (12.2, 8.4, 2.0), (13.0, 8.2), (2, 11)),
 'bug_bigant': _build(_ant, (12.2, 8.4, 2.4), (13.2, 8.2), (2, 11), head=2.4, abd=3.2),
 'bug_beetle': _build(_dome, (12.4, 12.2, 1.6), (13.0, 12.0), (3, 11)),
 'bug_rhino':  _build(_dome, (12.4, 12.2, 1.6), (13.0, 12.0), (3, 11), horn=1, ry=4.8),
 'bug_stag':   _build(_dome, (12.4, 12.2, 1.6), (13.0, 12.0), (3, 11), mand=True, rx=5.0),
 'bug_lady':   _build(_lady, (12.9, 12.6, 1.4), (13.3, 12.4), (3, 12)),
 'bug_firefly': _build(_firefly, (11.8, 11.0, 1.9), (12.6, 10.8), (2, 10)),
 'bug_roach':  _build(_roach, (12.4, 12.8, 1.6), (13.0, 12.6), (2, 11)),
 'bug_bigroach': _build(_roach, (12.4, 12.8, 1.6), (13.0, 12.6), (2, 11), wide=0.7, lash=4.4),
}
spritegen.register_archetypes(ARCH_BUG)

# ---- decorations -------------------------------------------------------------------------------
def _top(g, x):
    for y in range(16):
        if g.get(x, y): return y
    return None

def bug_glow(g, c):
    """firefly lamp: a ring of rays around the tail end"""
    xs = [x for y in range(16) for x in range(16) if g.get(x, y)]
    tx = min(xs); ys = [y for y in range(16) if g.get(tx, y)]
    cy = ys[len(ys) // 2] if ys else 11
    for dx, dy in ((-1, 0), (-1, -2), (-1, 2), (0, -3), (0, 3), (-2, -1), (-2, 1)):
        if tx + dx >= 0: g.set(tx + dx, cy + dy)

def bug_sparkle(g, c):
    """star sparkle above the head, to the left"""
    x, y = c['hx'] - c['hr'] - 3, max(1, c['hy'] - c['hr'] - 1)
    for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)): g.set(x + dx, y + dy)

def bug_dots(g, c):
    """wing or shell spots: carved holes spread across the back"""
    for fx, fy in ((0.3, 0.0), (0.75, 0.0)):
        x = int(c['b0'] + (c['b1'] - c['b0']) * fx)
        t = _top(g, x)
        if t is not None: g.set(x, t + 2 + int(fy), 0)

def bug_ring(g, c):
    """eyespot: a hollow ring with a dot, carved into the biggest wing"""
    best = None
    for y in range(2, 14):
        for x in range(1, 13):
            if all(g.get(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
                if best is None or x + 0.1 * y < best[0] + 0.1 * best[1]: best = (x, y)
    if best:
        x, y = best; g.set(x, y, 0)
        if g.get(x, y + 2) and g.get(x, y - 2): pass

def bug_tatter(g, c):
    """ragged wing/shell edge: a few nicks bitten out of the outline"""
    cols = [x for x in range(int(c['b0']), int(c['b1']) + 1)]
    for i, x in enumerate(cols):
        if i % 3 == 1:
            t = _top(g, x)
            if t is not None and t < 14: g.set(x, t, 0)

def bug_fuzz(g, c):
    """fuzz: spiky pixels along the top edge of the back"""
    for x in range(int(c['b0']) + 1, int(c['b1']), 2):
        t = _top(g, x)
        if t is not None and t > 1: g.set(x, t - 1)

def bug_bands(g, c):
    """abdomen bands: gaps across the body (for bees and ants)"""
    for x in range(int(c['b0']) + 2, int(c['b1']) - 1, 3):
        t = _top(g, x)
        if t is None: continue
        for y in range(t + 1, 13): g.set(x, y, 0)

def bug_moon(g, c):
    """crescent moon behind the head"""
    cx, cy = c['hx'] - c['hr'] - 2.2, max(2.0, c['hy'] - c['hr'] - 1)
    g.ellipse(cx, cy, 2.0, 2.0)
    g.ellipse(cx + 1.2, cy - 0.3, 1.8, 1.8, 0)

def bug_crown(g, c):
    """small crown set between the antennae"""
    ty = c['hy'] - c['hr'] - 2
    for dx in range(-1, 2): g.set(c['hx'] + dx, ty)
    for dx in (-1, 1): g.set(c['hx'] + dx, ty - 1)

def bug_pollen(g, c):
    """a few pollen dots floating at the back"""
    x = c['b0'] + 1
    for dx, dy in ((0, 0), (2, -2), (-1, 2)):
        g.set(x + dx, 3 + dy + (0 if c['f'] > 0.8 else 2))

def bug_cheek(g, c):
    """a darker patch under the eye to give the face a blush"""
    g.set(c['ex'], c['ey'] + 1, 0) if g.get(c['ex'], c['ey'] + 1) else None

def bug_stripe(g, c):
    """thick bands across the whole body (bee)"""
    for x in range(int(c['b0']) + 1, int(c['b1']), 3):
        for y in range(8, 14):
            if g.get(x, y) and g.get(x, y - 1) or g.get(x, y) and y == 8: g.set(x, y, 0)

spritegen.EXTRA_HANDLERS.update({
 'bug_glow': bug_glow, 'bug_sparkle': bug_sparkle, 'bug_dots': bug_dots, 'bug_ring': bug_ring,
 'bug_tatter': bug_tatter, 'bug_fuzz': bug_fuzz, 'bug_bands': bug_bands, 'bug_moon': bug_moon,
 'bug_crown': bug_crown, 'bug_pollen': bug_pollen, 'bug_stripe': bug_stripe,
})
