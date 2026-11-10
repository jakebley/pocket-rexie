"""Slime archetypes (16x16, ground on row 15), built from parts and natively at each stage size.
Every slime has a FACE: two eye holes on one row (the shader fills them in Technicolor; the blink fills every eye on that row).
Eye rules that keep them readable: exactly two single-pixel holes, nothing else small and see-through near or above them
(patterns are 2+ pixels wide so the shader leaves them open), and the two holes are never adjacent.
Bodies are told apart by silhouette: drop, pumpkin, trifle tower, crystal spire, heart, conjoined twins, toadstool, hat sprite,
puffball, mushroom grove, morel, eyestalks, root watcher, snail shell, bell jelly, ribbon jelly, ghosts, flan on a plate,
wedding-cake aspic, chest mimic, hoard mimic, lump heap, slug trail, candle melt, slump wave, tar pool, splash crown.
Also registers the slime_* decorations."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from archetypes_fox import _G, _T
import spritegen

class S(_G):
    def __init__(self, k=1.0):
        _G.__init__(self, k)
        self.anchor = None            # first eye hole: the blink frame fills it (the slime_blink decoration fills the rest)
    def out(self, x, y):
        tx, ty = self.T(x, y); return int(round(tx)), int(round(ty))
    def hole(self, x, y):             # eye hole at design coordinates
        tx, ty = self.out(x, y); self.px(tx, ty, 0)
    def px(self, x, y, v=1):          # raw output-space pixel; an eye when carved
        self._raw(x, y, v)
        if v == 0 and self.anchor is None and getattr(self, '_eye', False): self.anchor = (x, y)
    def eyes(self, y, sp=5, cx=7.5):
        """a pair of eye holes sp pixels apart (3 or 5) centred on cx, at design row y"""
        tx, ty = self.T(cx, y)
        if self.k < 0.8: sp = min(sp, 3)
        l = int(round(tx - sp / 2)); ty = int(round(ty))
        self._eye = True
        for x in (l, l + sp): self.px(x, ty, 0)
        self._eye = False
    def eye1(self, x, y):
        tx, ty = self.out(x, y); self._eye = True; self.px(tx, ty, 0); self._eye = False
    def row(self, y): return int(round(self.T(0, y)[1]))
    def col(self, x): return int(round(self.T(x, 0)[0]))
    def cut_below(self, y):
        r = self.row(y)
        for yy in range(r, 16):
            for x in range(16): self.p[yy][x] = 0
    def cut_above(self, y):
        r = self.row(y)
        for yy in range(0, r):
            for x in range(16): self.p[yy][x] = 0
    def ext(self, y):
        xs = [x for x in range(16) if self.p[y][x]]
        return (min(xs), max(xs)) if xs else (7, 8)
    def hline(self, y, x0, x1, v=1):
        for x in range(x0, x1 + 1): self._raw(x, y, v)
    def vline(self, x, y0, y1, v=1):
        for y in range(y0, y1 + 1): self._raw(x, y, v)

# ------------------------------------------------------------------ babies
def _bead(k=1.0):
    g = S(k)
    g.ell(7.5, 11.6, 5.2, 3.4); g.ell(7.5, 9.4, 4.0, 3.2); g.ell(7.5, 6.9, 1.6, 1.4)
    g.eyes(10.6, 3)
    return g

def _dollop(k=1.0):
    """baby soft-serve: three tiers with a curl on top"""
    g = S(k)
    g.ell(7.5, 12.2, 6.4, 3.4); g.ell(7.5, 9.0, 4.4, 2.4); g.ell(7.5, 6.6, 2.6, 1.9)
    g.line(7.5, 5.6, 9.0, 3.6)
    g.eyes(12.2, 3)
    return g

# ------------------------------------------------------------------ gel line
def _drop(k=1.0):
    """peaked drop"""
    g = S(k)
    g.ell(7.5, 12.0, 5.4, 3.2); g.ell(7.5, 9.6, 4.2, 3.0); g.ell(7.5, 7.2, 2.7, 2.5)
    g.tri(6.4, 6.2, 8.4, 2.2, 8.9, 6.2, min_h=2)
    g.eyes(10.2, 5)
    return g

def _pumpkin(k=1.0):
    """plump three-lobed pumpkin with a curled stem and a seed glowing in the belly"""
    g = S(k)
    g.ell(4.4, 10.6, 3.8, 4.2); g.ell(10.6, 10.6, 3.8, 4.2); g.ell(7.5, 10.8, 4.0, 4.4)
    g.ell(7.5, 13.4, 6.2, 1.8)
    g.line(7.5, 6.8, 7.5, 4.6); g.line(8.5, 6.8, 8.5, 4.6)
    g.eyes(9.0, 5)
    return g

def _tower(k=1.0):
    """tall trifle glass: straight sides, rounded top, layer seams added by slime_layer"""
    g = S(k)
    g.ell(7.5, 4.2, 4.2, 2.8)
    for y in range(4, 15):
        for x in range(16):
            if abs(x - 7.5) <= 4.6 * k + 0.2 and g.T(0, y)[1] <= g.row(y) + 15: pass
    for y in range(5, 15):
        for x in range(3, 13): g.set(x, y)
    g.ell(7.5, 14.0, 5.2, 1.2)
    g.eyes(6.8, 5)
    return g

def _crystal(k=1.0):
    """faceted spire: diamond with a flat base and two small shards"""
    g = S(k)
    g.tri(7.5, 0.4, 12.6, 7.0, 2.4, 7.0)
    for y in range(7, 15):
        hw = 5.1 - (y - 7) * 0.22
        for x in range(16):
            if abs(x - 7.5) <= hw: g.set(x, y)
    g.tri(0.2, 15, 2.0, 11.6, 4.4, 15); g.tri(10.6, 15, 13.0, 11.8, 15.0, 15)
    g.eyes(8.6, 5)
    return g

def _heart(k=1.0):
    """split blob: two lobes with a notch between them"""
    g = S(k)
    g.ell(4.4, 8.6, 3.4, 4.2); g.ell(10.6, 8.6, 3.4, 4.2); g.ell(7.5, 12.4, 6.0, 2.8)
    g.eyes(9.0, 5)
    return g

def _twin2(k=1.0):
    """conjoined twins: two tall halves, a bridge between them, one eye each"""
    g = S(k)
    g.ell(3.9, 9.0, 3.0, 5.4); g.ell(11.4, 9.6, 3.0, 4.8)
    g.ell(7.5, 14.0, 7.0, 1.4)
    g.line(6.0, 12.4, 9.0, 12.4); g.line(6.0, 13.0, 9.0, 13.0)
    g.eye1(3.9, 8.0); g.eye1(11.4, 8.0)
    return g

def _flan(k=1.0, dome=False):
    """flan on a plate; the dome version is a round jelly mould"""
    g = S(k)
    if dome:
        g.ell(7.5, 11.2, 5.4, 5.4); g.cut_below(13.4)
    else:
        for y in range(6, 14):
            hw = 3.4 + (y - 6) * 0.15
            for x in range(16):
                if abs(x - 7.5) <= hw: g.set(x, y)
        g.ell(7.5, 6.4, 4.4, 2.2)
    for x in range(1, 15): g.set(x, 15)
    for x in range(2, 14): g.set(x, 14)
    g.eyes(8.8, 5)
    return g

def _cake(k=1.0):
    """aspic regent: three-tier jelly cake on a plate"""
    g = S(k)
    for (y0, y1, hw) in ((11, 14, 6.8), (7, 10, 4.6), (4, 6, 2.4)):
        for y in range(y0, y1 + 1):
            for x in range(16):
                if abs(x - 7.5) <= hw: g.set(x, y)
    for x in range(0, 16): g.set(x, 15)
    g.eyes(8.4, 5)
    return g

def _mimic(k=1.0, big=False):
    """chest mimic: lid, a jagged mouth, little legs. The big one throws its lid wide open over a pile of coins."""
    g = S(k)
    if not big:
        for y in range(10, 15):
            for x in range(2, 14): g.set(x, y)
        for y in range(3, 8):
            for x in range(2, 14):
                if not (y == 3 and x in (2, 13)): g.set(x, y)
        for x in range(3, 13): g.set(x, 8, 0)
        for x in (4, 7, 10): g.set(x, 8)                   # teeth
        g.set(14, 8); g.set(14, 9); g.set(15, 9); g.set(15, 10)   # tongue
        for y in range(11, 14): g.set(7, y, 0); g.set(8, y, 0)    # lock slit
        for x in (3, 4, 11, 12): g.set(x, 15)
        g.eyes(4.8, 5)
    else:
        for y in range(9, 15):
            for x in range(1, 15): g.set(x, y)
        for y in range(2, 7):
            for x in range(1, 15):
                if not (y == 2 and (x < 3 or x > 12)): g.set(x, y)
        for x in range(2, 14): g.set(x, 7, 0); g.set(x, 8, 0)
        for x in range(2, 14, 3): g.set(x, 7); g.set(x + 1, 7)               # top fangs
        for x in range(3, 14, 3): g.set(x, 8)                                # bottom fangs
        for x in (4, 7, 11): g.set(x, 1); g.set(x + 1, 1); g.set(x, 0) if False else None   # gems on the lid
        g.set(15, 8); g.set(15, 9); g.set(14, 9); g.set(15, 10)             # tongue
        for y in range(11, 14): g.set(7, y, 0); g.set(8, y, 0)
        for x in (0, 1, 2, 3, 12, 13, 14, 15): g.set(x, 15)
        g.eyes(4.0, 5)
    return g

# ------------------------------------------------------------------ mushrooms
def _toadstool(k=1.0):
    """classic toadstool: broad cap, thick stem, the face on the stem"""
    g = S(k)
    g.ell(7.5, 6.6, 6.4, 4.4); g.cut_below(9.2)
    for y in range(9, 15):
        for x in range(5, 11): g.set(x, y)
    g.ell(7.5, 14.2, 4.0, 1.0)
    g.eyes(11.4, 3)
    return g

def _hat(k=1.0):
    """a round slime wearing a small mushroom cap"""
    g = S(k)
    g.ell(7.5, 6.4, 6.4, 3.2); g.cut_below(7.8)
    g.ell(7.5, 11.4, 4.8, 3.8)
    g.eyes(11.0, 3)
    return g

def _puff(k=1.0):
    """puffball: a round ball with a puff hole on top and a tiny foot"""
    g = S(k)
    g.ell(7.5, 8.8, 6.6, 6.0)
    g.ell(7.5, 14.2, 3.4, 1.0)
    g.ell(7.5, 2.4, 1.4, 1.0)
    g.eyes(8.6, 5)
    my = g.row(11.4); xl = g.col(6.0); g.hline(my, xl, xl + 3, 0)
    return g

def _grove(k=1.0):
    """mushroom grove: a tall centre mushroom with two small neighbours on a mossy mound"""
    g = S(k)
    g.ell(7.5, 4.6, 4.6, 3.2); g.cut_below(7.2)
    for y in range(7, 15):
        for x in range(5, 11): g.set(x, y)
    g.ell(2.8, 9.8, 2.8, 1.8)
    for y in range(10, 14): g.set(3, y); g.set(4, y)
    g.ell(12.4, 10.8, 2.6, 1.7)
    for y in range(11, 14): g.set(11, y); g.set(12, y)
    g.ell(7.5, 14.4, 7.4, 1.2)
    g.eyes(9.4, 3)
    return g

def _morel(k=1.0):
    """tall honeycomb cap on a thick stem, pits are 2 pixel slits"""
    g = S(k)
    g.ell(7.5, 6.0, 4.0, 5.2)
    g.ell(7.5, 10.0, 4.8, 1.8)
    g.cut_below(11.4)
    for y in range(11, 15):
        for x in range(5, 11): g.set(x, y)
    g.ell(7.5, 14.4, 3.8, 0.9)
    for (x, y) in ((6.2, 2.2), (9.0, 2.8), (4.9, 5.0), (7.7, 5.2), (10.4, 5.0)):   # vertical 2 px pits
        px, py = g.out(x, y); g._raw(px, py, 0); g._raw(px, py + 1, 0)
    g.eyes(8.8, 3)
    return g

# ------------------------------------------------------------------ watchers
def _stalk(k=1.0, tall=False):
    """eyestalks: the eyes are bulbs on two straight stalks over a wide body with a grin"""
    g = S(k)
    g.ell(7.5, 12.4, 6.2, 2.8); g.ell(7.5, 10.2, 4.2, 2.4)
    top = 2.8 if tall else 4.6
    for bx in (3.2, 10.8):
        g.line(bx, top, bx, 10.4); g.line(bx + 1.0, top, bx + 1.0, 10.4)
        g.ell(bx + 0.5, top, 2.3, 2.2)
    e1 = g.out(3.7, top); e2 = g.out(11.3, top)
    g._eye = True; g.px(e1[0], e1[1], 0); g.px(e2[0], e1[1], 0); g._eye = False
    if tall:
        g.line(7.0, 8.2, 7.0, 5.8); g.line(8.0, 8.2, 8.0, 5.8); g.ell(7.5, 5.4, 1.4, 1.2)   # a bud
    ty2 = g.row(11.4); xl = g.col(6.0)
    g.hline(ty2, xl, xl + 3, 0)    # grin
    return g

def _rootwatcher(k=1.0):
    """ancient watcher: a mossy trunk with a face, antler branches and root feet"""
    g = S(k)
    g.ell(7.5, 9.8, 4.8, 4.8)
    for y in range(9, 14):
        for x in range(3, 13): g.set(x, y)
    for x in (2, 4, 6, 9, 11, 13): g.set(x, 14); g.set(x, 15)
    g.set(7, 15); g.set(8, 15)
    for (ax, bx) in ((4.0, 1.6), (11.0, 13.4)):
        g.line(ax, 7.0, bx, 3.8); g.line(ax + 1, 7.0, bx + 1, 3.8)
        g.ell(bx + 0.5, 3.2, 1.5, 1.4)
    g.eyes(9.0, 5)
    ty2 = g.row(11.8); xl = g.col(6.0)
    g.hline(ty2, xl, xl + 3, 0)
    return g

# ------------------------------------------------------------------ shell
def _shell(k=1.0, big=False):
    g = S(k)
    g.ell(7.4, 13.8, 7.0, 1.4)                         # foot
    g.ell(12.0, 10.2, 3.0, 3.4)                        # head
    g.ell(5.4, 8.6, 5.0 if big else 4.5, 4.9 if big else 4.5)   # shell
    cx, cy = g.out(5.4, 8.6)
    if k >= 0.9:
        pat = [(0, 0), (1, 0), (1, 1), (0, 1), (-1, 1), (-2, 1), (-2, 0), (-2, -1), (-2, -2), (-1, -2), (0, -2), (1, -2), (2, -2), (2, -1), (2, 0), (2, 1), (2, 2)]
    else:
        pat = [(0, 1), (1, 1), (1, 0), (1, -1), (0, -1), (-1, -1), (-1, 0)]
    for dx, dy in pat: g._raw(cx + dx, cy + dy, 0)
    hx = g.col(12.0); ey = g.row(9.2)
    g._eye = True; g.px(hx - 1, ey, 0); g.px(hx + 1, ey, 0); g._eye = False
    ty = g.row(6.1)                                    # two short antennae above the eyes
    for ax in (hx - 1, hx + 1):
        g._raw(ax, ty, 1); g._raw(ax, ty - 1, 1)
    return g

# ------------------------------------------------------------------ jellies
def _strands(g, cy, xs_extent, n_long, short, longer=0):
    x0, x1 = xs_extent
    i = 0
    for x in range(x0 + 1, x1, 2):
        ln = n_long if i % 2 == 0 else short
        for y in range(cy, min(15, cy + ln)): g._raw(x, y)
        i += 1

def _bell(k=1.0, wide=0.0, ribbons=False, tall=0.0):
    g = S(k)
    g.ell(7.5, 6.6 - tall * 0.6, 5.4 + wide, 4.6 + tall)
    cut = 9.0
    g.cut_below(cut)
    cy = g.row(cut)
    x0, x1 = g.ext(cy - 1)
    if ribbons:
        for yy in range(cy, min(16, cy + max(4, int(round(6 * k))))):
            d = 1 if yy >= cy + 3 else 0
            g._raw(x0 - d, yy); g._raw(x0 + 1 - d, yy); g._raw(x1 + d, yy); g._raw(x1 - 1 + d, yy)
        _strands(g, cy, (x0 + 3, x1 - 2), max(3, int(round(4 * k))), max(2, int(round(3 * k))))
    else:
        _strands(g, cy, (x0, x1 + 1), max(3, int(round(5 * k))), max(2, int(round(3 * k))))
    g.eyes(5.6 - tall * 0.5, 5)
    return g

# ------------------------------------------------------------------ ghosts
def _ghost_wisp(k=1.0):
    """wisp: a drop-shaped ghost with a long curling tail instead of feet"""
    g = S(k)
    g.ell(7.0, 6.8, 4.6, 4.4)
    for y in range(9, 15):
        hw = 4.4 - (y - 9) * 0.6
        for x in range(16):
            if abs(x - 6.6) <= hw: g.set(x, y)
    g.line(7.5, 13.5, 11.6, 14.6); g.line(11.6, 14.6, 13.6, 12.8); g.set(13.8, 11.8); g.set(14.4, 12.2) if False else None
    g.eyes(7.0, 3, cx=7.0)
    return g

def _ghost_maw(k=1.0):
    """mistmaw: a sheet ghost with a scalloped hem, stubby arms and a toothy grin"""
    g = S(k)
    g.ell(7.5, 6.6, 5.0, 4.6)
    for y in range(7, 15):
        for x in range(2, 14): g.set(x, y)
    # arms
    g.set(1, 9); g.set(1, 10); g.set(0, 8) if False else None
    g.set(14, 9); g.set(14, 10)
    ry = g.row(14.4)
    for x in range(16):
        if g.p[ry][x] and (x % 3 == 1): g.p[ry][x] = 0
    g.eyes(6.6, 5)
    my = g.row(10.4); xl = g.col(5.5)
    g.hline(my, xl, xl + 4, 0); g._raw(xl + 1, my + 1, 0); g._raw(xl + 3, my + 1, 0)
    return g

def _ghost_moon(k=1.0):
    """moonmist: a tall hooded spirit whose robe flares into a long scalloped hem"""
    g = S(k)
    g.ell(7.5, 5.2, 3.8, 3.8); g.set(8.6, 1.4); g.set(9.4, 1.8)
    for y in range(7, 15):
        hw = 3.2 + (y - 7) * 0.7
        for x in range(16):
            if abs(x - 7.5) <= hw: g.set(x, y)
    ry = g.row(14.4)
    for x in range(16):
        if g.p[ry][x] and (x % 3 == 0): g.p[ry][x] = 0
    g.eyes(5.4, 3)
    return g

def _wraith(k=1.0):
    """mirewraith: a horned bog spirit, broad-shouldered, cloak torn at the hem"""
    g = S(k)
    g.ell(7.5, 5.4, 4.2, 3.8)
    g.line(4.6, 3.6, 2.8, 0.8); g.line(5.6, 3.6, 3.8, 0.8); g.line(10.4, 3.6, 12.2, 0.8); g.line(9.4, 3.6, 11.2, 0.8)
    for y in range(8, 15):
        hw = 4.6 + (y - 8) * 0.15 + (0.6 if y < 10 else 0)
        for x in range(16):
            if abs(x - 7.5) <= hw: g.set(x, y)
    ry = g.row(14.4)
    for x in range(16):
        if g.p[ry][x] and (x % 3 == 0) and 3 <= x <= 12: g.p[ry][x] = 0
    g.eyes(6.0, 3)
    my = g.row(9.8); xl = g.col(5.5); g.hline(my, xl, xl + 4, 0)
    return g

# ------------------------------------------------------------------ sludge
def _lump(k=1.0):
    """grey sludge heap: a lumpy mound"""
    g = S(k)
    g.ell(7.5, 12.8, 6.6, 2.3)
    g.ell(4.3, 10.8, 2.6, 2.4); g.ell(8.6, 9.4, 3.2, 3.0); g.ell(12.2, 11.2, 2.4, 2.0)
    g.eyes(11.2, 3)
    return g

def _slug(k=1.0):
    """smear: a slug sliding right, thinning into a trail"""
    g = S(k)
    g.ell(10.0, 10.8, 4.4, 3.8)
    g.ell(6.0, 12.6, 5.0, 2.3)
    g.ell(2.4, 14.0, 2.6, 1.0)
    g.ell(10.6, 13.6, 4.4, 1.5)
    g.eye1(8.4, 10.4); g.eye1(11.6, 10.4)
    return g

def _candle(k=1.0):
    """dreg: a melting candle stub with a drip running over the lip and a puddle skirt"""
    g = S(k)
    g.ell(7.5, 5.6, 4.4, 3.4)
    for y in range(5, 13):
        for x in range(3, 12): g.set(x, y)
    g.ell(7.5, 13.6, 6.2, 1.5)
    for y in range(7, 12): g.set(12, y)          # drip over the lip
    g.set(12, 13) if False else None
    g.set(13, 11)
    g.eyes(7.6, 3)
    return g

def _slump(k=1.0):
    """ooze: a soft heap whose tip has slumped over to one side and is dripping"""
    g = S(k)
    g.ell(7.0, 11.4, 6.2, 3.8); g.ell(6.6, 8.0, 4.2, 3.2)
    g.ell(9.4, 4.8, 2.6, 2.4); g.ell(11.8, 5.2, 1.9, 1.7); g.ell(12.8, 7.4, 1.3, 1.9)
    g.ell(7.5, 14.0, 7.2, 1.2)
    g.eyes(10.2, 5, cx=7.0)
    return g

def _tarpit(k=1.0):
    """tarpit: a wide black pool with a bubble dome rising in the middle and little bubbles at the rim"""
    g = S(k)
    g.ell(7.5, 13.8, 7.6, 1.8)
    g.ell(3.4, 12.0, 3.2, 2.4); g.ell(12.6, 12.2, 3.0, 2.2)
    g.ell(8.0, 10.0, 4.6, 3.6)
    g.eyes(9.4, 3, cx=8.0)
    return g

def _splash(k=1.0):
    """splash: a puddle with a three-lobed water crown"""
    g = S(k)
    g.ell(7.5, 13.4, 7.2, 2.0)
    g.ell(7.5, 9.8, 3.6, 4.0)
    g.ell(3.4, 11.4, 2.4, 2.4); g.ell(11.6, 11.6, 2.4, 2.2)
    g.eyes(10.4, 3)
    return g

SIZES = {1: 0.62, 2: 0.72, 3: 0.82, 4: 0.92, 5: 1.0}

def _build(fn, hd, **kw):
    by = {}
    for stage, k in SIZES.items():
        g = fn(k=k, **kw)
        hx, hy = _T(k, hd[0], hd[1])
        ex, ey = g.anchor
        by[stage] = dict(rows=g.rows(), head=(hx, hy, max(1.6, hd[2] * k)), eye=(ex, ey), body=(3, 12))
    return dict(by_stage=by)

ARCH_SLIME = {
 'slime_bead':    _build(_bead, (7.5, 9.0, 2.6)),
 'slime_dollop':  _build(_dollop, (7.5, 8.2, 2.2)),
 'slime_drop':    _build(_drop, (7.5, 5.0, 2.6)),
 'slime_pumpkin': _build(_pumpkin, (7.5, 8.0, 4.0)),
 'slime_tower':   _build(_tower, (7.5, 4.2, 2.8)),
 'slime_crystal': _build(_crystal, (7.5, 5.0, 4.4)),
 'slime_heart':   _build(_heart, (7.5, 8.0, 3.2)),
 'slime_twin2':   _build(_twin2, (7.5, 8.0, 4.0)),
 'slime_gel':     _build(_flan, (7.5, 8.0, 3.0)),
 'slime_jelmould':_build(_flan, (7.5, 8.0, 3.0), dome=True),
 'slime_cake':    _build(_cake, (7.5, 6.2, 1.5)),
 'slime_mimic':   _build(_mimic, (7.5, 5.0, 4.0)),
 'slime_mimic2':  _build(_mimic, (7.5, 3.4, 4.2), big=True),
 'slime_toad':    _build(_toadstool, (7.5, 5.6, 3.6)),
 'slime_hat':     _build(_hat, (7.5, 6.4, 3.6)),
 'slime_puff':    _build(_puff, (7.5, 6.0, 4.4)),
 'slime_grove':   _build(_grove, (7.5, 4.6, 3.1)),
 'slime_morel':   _build(_morel, (7.5, 4.4, 3.0)),
 'slime_stalk':   _build(_stalk, (7.5, 9.5, 3.0)),
 'slime_stalk3':  _build(_stalk, (7.5, 9.5, 3.0), tall=True),
 'slime_root':    _build(_rootwatcher, (7.5, 7.0, 2.4)),
 'slime_shell':   _build(_shell, (12.0, 8.0, 2.0)),
 'slime_shell2':  _build(_shell, (12.0, 8.0, 2.0), big=True),
 'slime_jelly':   _build(_bell, (7.5, 6.0, 3.8)),
 'slime_bell':    _build(_bell, (7.5, 5.0, 4.4), wide=0.7, tall=0.8),
 'slime_ribbon':  _build(_bell, (7.5, 5.0, 4.4), wide=0.9, tall=1.0, ribbons=True),
 'slime_ghost':   _build(_ghost_wisp, (7.0, 6.0, 3.4)),
 'slime_ghost2':  _build(_ghost_maw, (7.5, 6.4, 3.6)),
 'slime_ghost3':  _build(_ghost_moon, (7.5, 5.0, 3.4)),
 'slime_wraith':  _build(_wraith, (7.5, 5.0, 3.6)),
 'slime_lump':    _build(_lump, (8.6, 9.0, 2.8)),
 'slime_slug':    _build(_slug, (10.0, 9.0, 3.0)),
 'slime_candle':  _build(_candle, (7.5, 5.0, 3.4)),
 'slime_slump':   _build(_slump, (7.0, 6.0, 3.4)),
 'slime_tarpit':  _build(_tarpit, (7.5, 9.0, 3.6)),
 'slime_puddle':  _build(_splash, (7.5, 9.0, 3.0)),
}
spritegen.register_archetypes(ARCH_SLIME)


# ======================================================================================================
# Second pass: hand-built native 16x16 bodies for the weakest slimes. Faces are two eye holes on one row.
# ======================================================================================================
import math as _m
class _H:
    def __init__(self): self.p = [[0] * 16 for _ in range(16)]; self.eyes = []
    def px(self, x, y, v=1):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < 16 and 0 <= y < 16: self.p[y][x] = v
    def ell(self, cx, cy, rx, ry, v=1):
        for y in range(16):
            for x in range(16):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0: self.p[y][x] = v
    def rect(self, x0, y0, x1, y1, v=1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1): self.px(x, y, v)
    def line(self, x0, y0, x1, y1, v=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
        for i in range(n + 1): self.px(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, v)
    def half(self, rows):
        """rows: 16 strings of 8 columns (the left half), mirrored"""
        for y, r in enumerate(rows):
            assert len(r) == 8, (y, r)
            for x, c in enumerate(r):
                if c == '#': self.px(x, y); self.px(15 - x, y)
    def eye_pair(self, y, x0, x1):
        self.eyes = [(x0, y), (x1, y)]
        for x in (x0, x1): self.px(x, y, 0)
    def rows(self):
        return [''.join('X' if v else '.' for v in r) for r in self.p]

_HSL = {}
def _reg(name, stage, g, head):
    """register a hand-built slime body as archetype slime_h_<name> for one stage"""
    ex, ey = g.eyes[0]
    _HSL.setdefault('slime_h_' + name, {'by_stage': {}})['by_stage'][stage] = dict(rows=g.rows(), head=head, eye=(ex, ey), body=(3, 12))

# Custardine: a flan on a visible plate: a caramel cap that overhangs the pudding, a wide rim of plate
g = _H()
g.half(["........", "........", "........", "........", "........", "...#####", "...#####", "...#....",
        "...#####", "...#####", "...###.#", "..######", "..######", "..######", "........", "........"])
for x in range(3, 13): g.px(x, 14)
g.rect(0, 14, 1, 14); g.rect(14, 14, 15, 14); g.rect(0, 15, 15, 15)
g.eye_pair(10, 6, 9)
_reg('custardine', 4, g, (7.5, 8.0, 3.0))

# Aspic Regent: a tall fluted jelly mould with a crown
g = _H()
g.half(["........", "....#.#.", "....####", "....####", "...#####", "...#####", "...#.###", "...#.###",
        "...#.###", "...#.###", "...#.###", "...#.###", "...#.###", "..######", "..######", ".#######"])
g.eye_pair(8, 6, 9)
_reg('aspic', 5, g, (7.5, 8.0, 2.6))

# Mycelord: a big mushroom: round spotted cap, gills, thick stalk, small mushrooms at the sides
g = _H()
g.half(["........", ".....###", "...#####", "..######", ".#######", ".#######", ".###.###", ".###.###",
        ".#######", "..#.#.##", "......##", ".###..##", "####..##", ".###..##", "..#...##", "..######"])
g.eye_pair(4, 6, 9)
_reg('mycelord', 5, g, (7.5, 4.0, 3.0))

# Wobble: a round, plump jelly, a little squashed at the base so it looks mid-wobble
g = _H()
g.ell(7.5, 9.6, 5.8, 5.2)
g.ell(7.5, 12.6, 6.2, 2.2)
g.eye_pair(9, 6, 9)
_reg('wobble', 3, g, (7.5, 8.0, 3.2))

# Ooze: a slumped heap: the tip has flopped over to the right and hangs, dripping
g = _H()
g.ell(5.0, 11.2, 4.8, 3.8)
g.ell(5.2, 8.0, 3.6, 3.4)
g.ell(7.6, 5.4, 2.6, 2.2)
g.ell(10.6, 5.6, 2.4, 2.0)
g.ell(12.4, 7.8, 1.7, 2.4)
g.rect(13, 10, 13, 12); g.rect(13, 13, 14, 13)           # the drip with a bulb
g.ell(5.6, 14.2, 5.6, 1.1)
g.eye_pair(10, 3, 6)
_reg('ooze', 4, g, (5.4, 8.0, 3.2))

# Hoardmaw: a chest mimic: a domed lid with the eyes, one big mouth with two fangs, a wider body with a keyhole
g = _H()
g.half(["........", "....####", "...#####", "..######", "..#####.", "..######", "..######", "..######",
        ".#######", ".##.#...", ".##.#...", ".##.....", ".#######", ".#######", ".##.....", ".###...."])
g.rect(6, 4, 9, 4); g.eye_pair(4, 6, 9)
for x in (6, 9): g.px(x, 11)
g.px(7, 13, 0); g.px(8, 13, 0)    # keyhole
_reg('hoardmaw', 5, g, (7.5, 4.0, 4.0))

# Gazeroot: an ancient mossy trunk with antlers, root feet and a thin solid halo ring
g = _H()
g.half(["....####", "...#....", "...#....", "....####", "#.#.....", ".##..###", "..######", "..######",
        "..######", "..######", "..######", "..######", "..######", "..######", ".##.####", ".#..#..#"])
g.eye_pair(8, 6, 9)
for x in (6, 7, 8, 9): g.px(x, 11, 0)
_reg('gazeroot', 5, g, (7.5, 8.0, 3.0))

spritegen.register_archetypes(_HSL)

# ---- decorations -------------------------------------------------------------------------
def _bb(g):
    pts = [(x, y) for y in range(16) for x in range(16) if g.get(x, y)]
    if not pts: return 0, 0, 15, 15
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)

def _solid(g, x, y, r=1):
    return all(g.get(x + dx, y + dy) for dx in range(-r, r + 1) for dy in range(-r, r + 1))

def slime_blink(g, c):
    """blink: every single-pixel eye hole on the eye row closes (the renderer only closes the first one)"""
    try: blink = sys._getframe(1).f_locals.get('blink')
    except Exception: blink = False
    if not blink: return
    ey = int(round(c['ey']))
    for x in range(1, 15):
        if not g.get(x, ey) and g.get(x - 1, ey) and g.get(x + 1, ey) and g.get(x, ey - 1) and g.get(x, ey + 1): g.set(x, ey, 1)

def _slit(g, x, y):
    """a 2 pixel slit: two holes side by side (too big for the eye detector, so it reads as shine or pattern)"""
    if _solid(g, x, y, 1) and _solid(g, x + 1, y, 1): g.set(x, y, 0); g.set(x + 1, y, 0)

def slime_shine(g, c):
    """glossy highlight: a 2 pixel slit high on the left of the body"""
    x0, y0, x1, y1 = _bb(g); ey = int(round(c['ey']))
    for (dx, dy) in ((3, 2), (3, 1), (2, 2)):
        x, y = x0 + dx, y0 + dy
        if y <= ey - 2 and _solid(g, x, y, 1) and _solid(g, x + 1, y, 1): g.set(x, y, 0); g.set(x + 1, y, 0); return

def slime_bubbles(g, c):
    """two bubbles low in the body, each 2 pixels so they stay open"""
    x0, y0, x1, y1 = _bb(g); ey = int(round(c['ey']))
    for (x, y) in ((x1 - 4, y1 - 2), (x0 + 2, y1 - 3)):
        if y >= ey + 2 and _solid(g, x, y, 1) and _solid(g, x + 1, y, 1): g.set(x, y, 0); g.set(x + 1, y, 0)

def slime_core(g, c):
    """a glowing core: ring with a dot, low in the body"""
    x0, y0, x1, y1 = _bb(g); cx = (x0 + x1) // 2; ey = int(round(c['ey']))
    for cy in (y1 - 3, y1 - 2):
        if cy - 1 > ey + 1 and all(g.get(cx + dx, cy + dy) for dx in (-2, 2) for dy in (-1, 1)):
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1): g.set(cx + dx, cy + dy, 0)
            g.set(cx, cy, 1); return

def slime_layer(g, c):
    """layered gel: a seam across the lower body (a long hole, so it reads as a layer line)"""
    x0, y0, x1, y1 = _bb(g); ey = int(round(c['ey']))
    for y in (ey + 3,):
        if y < y1 - 1 and all(g.get(x, y) for x in range(x0 + 1, x1)):
            for x in range(x0 + 1, x1): g.set(x, y, 0)
            if c.get('f', 1.0) >= 0.9 and y + 3 < y1 and False: pass

def slime_cherry(g, c):
    x0, y0, x1, y1 = _bb(g); cx = (x0 + x1) // 2
    if y0 < 4: return
    for (dx, dy) in ((0, 1), (1, 1), (0, 2), (1, 2)): g.set(cx + dx, y0 - dy)
    g.set(cx + 1, y0 - 3)

def slime_dots(g, c):
    """spots on the cap: 2 pixel slits so they are not mistaken for eyes"""
    x0, y0, x1, y1 = _bb(g); cx = (x0 + x1) // 2; ey = int(round(c['ey']))
    for (dx, dy) in ((-3, 2), (1, 1), (2, 3)):
        x, y = cx + dx, y0 + dy
        if y <= ey - 2 and _solid(g, x, y, 1) and _solid(g, x + 1, y, 1): g.set(x, y, 0); g.set(x + 1, y, 0)

def slime_moss(g, c):
    """a tuft of moss on top"""
    x0, y0, x1, y1 = _bb(g); cx = (x0 + x1) // 2
    if y0 < 3: return
    for dx in (-1, 0, 1): g.set(cx + dx, y0 - 1)
    g.set(cx - 1, y0 - 2); g.set(cx + 1, y0 - 2)

def slime_spark(g, c):
    """a sparkle in the corner: a small plus"""
    x0, y0, x1, y1 = _bb(g)
    x, y = (x0 - 3, y0 + 2) if x0 >= 4 else (x1 + 3, y0 + 2)
    if not (2 <= x <= 13 and y >= 2): return
    for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)):
        if not g.get(x + dx, y + dy): g.set(x + dx, y + dy)

def slime_moon(g, c):
    x0, y0, x1, y1 = _bb(g); cx, cy = x0 - 2, max(3, y0 + 2)
    if cx < 2: cx, cy = x1 + 2, max(3, y0 + 2)
    g.ellipse(cx, cy, 2.0, 2.0); g.ellipse(cx + 1.2, cy - 0.3, 1.7, 1.7, 0)

def slime_noop(g, c): pass

spritegen.EXTRA_HANDLERS.update({
 'slime_blink': slime_blink, 'slime_shine': slime_shine, 'slime_bubbles': slime_bubbles, 'slime_core': slime_core,
 'slime_layer': slime_layer, 'slime_cherry': slime_cherry, 'slime_dots': slime_dots, 'slime_moss': slime_moss,
 'slime_spark': slime_spark, 'slime_moon': slime_moon,
 # retired decorations (kept so old recipes still build): they added stray pixels or eye-like holes
 'slime_spores': slime_noop, 'slime_drip': slime_noop, 'slime_crack': slime_noop, 'slime_tongue': slime_noop,
 'slime_fangs': slime_noop, 'slime_lumps': slime_noop,
})
