"""Alien archetypes (16x16, ground on row 15), built from parts and natively at each stage size (no averaging).
Cute, original little aliens. Each is told apart by ONE strong silhouette feature:
 wobbler = big slanted-eye head on a tiny body, antenna blob = round body with ball-tip antennae, tentacle tot = dome on
 wavy tentacles, three-eyes = wide head with a forehead eye, floating brain = lobed dome with a fissure, saucer pilot = disc + dome
 + landing legs, moth-folk = big wings + feathered antennae, crystal = prism cluster, tall grey = tiny body on a huge head,
 cyclops = one giant eye + horns, insectoid = mantis profile, jelly = crowned bell with ribbon arms, nebula = pinwheel galaxy,
 maw = round body with a bite taken out + star, ring = donut, mothership = stacked saucer with spire.
Eyes are carved holes (the shader fills them). The glitch decoration (stray line) tears rows sideways and never makes enclosed holes.
Also registers the al_* decorations (EXTRA_HANDLERS)."""
import math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from archetypes_fox import _G, W
import spritegen

SIZES = {1: 0.62, 2: 0.74, 3: 0.86, 4: 1.0, 5: 1.0}

def _T(k, x, y):
    return (W - 1) / 2 * (1 - k) + x * k, 15 - (15 - y) * k

class A(_G):
    def __init__(self, k=1.0):
        _G.__init__(self, k)
        self.anchor = None            # the first eye pixel carved: the blink fills it
    def px(self, x, y, v=1):
        tx, ty = self.T(x, y); self._raw(tx, ty, v)
    def legs(self, xs, top, foot=True):
        """vertical 1 px legs down to row 15 (they keep their width at every size), optional foot pixel"""
        for x in xs:
            tx, ty = self.T(x, top)
            for y in range(int(round(ty)), 16): self._raw(tx, y)
            if foot: self._raw(tx + 1, 15)
    def pts(self, pts, v=1):
        for (x, y) in pts: self.set(x, y, v)
    def hole(self, x, y):
        self.set(x, y, 0)
        if self.anchor is None:
            tx, ty = self.T(x, y); self.anchor = (int(round(tx)), int(round(ty)))
    def pair(self, x, y, w=2, h=2):
        """a mirrored pair of w x h eye holes: the left one starts at x, the right one is its mirror about the centre"""
        for dx in range(w):
            for dy in range(h):
                self.hole(x + dx, y + dy); self.hole(15 - x - dx, y + dy)
    def slants(self, x, y):
        """a mirrored pair of big slanted almond eyes (4 px each), leaning toward the nose"""
        for (dx, dy) in ((0, 0), (1, 0), (1, 1), (2, 1)):
            self.hole(x + dx, y + dy); self.hole(15 - x - dx, y + dy)
    def slants3(self, x, y):
        """a mirrored pair of small slanted eyes (3 px each)"""
        for (dx, dy) in ((0, 0), (0, 1), (1, 1)):
            self.hole(x + dx, y + dy); self.hole(15 - x - dx, y + dy)
    def bigeye(self, y):
        """one big round eye in the centre (12 px)"""
        for (dx, dy) in ((1, 0), (2, 0), (0, 1), (1, 1), (2, 1), (3, 1), (0, 2), (1, 2), (2, 2), (3, 2), (1, 3), (2, 3)):
            self.hole(6 + dx, y + dy)

# ---------------- babies ----------------
def _babe(k=1.0):
    """hatchling: big wobbly head, tiny body, one antenna nub"""
    g = A(k)
    g.ell(7.5, 8.6, 5.0, 4.2); g.ell(7.5, 12.6, 3.0, 2.2)
    g.line(7.5, 4.8, 7.5, 2.6); g.pts([(7.5, 1.6), (6.5, 2.2), (8.5, 2.2)])
    g.legs([5.5, 9.5], 13.5)
    g.pair(4, 8, 2, 2)
    return g

def _orb(k=1.0):
    """one-eyed hatchling orb with a forked sprout"""
    g = A(k)
    g.ell(7.5, 10.2, 5.2, 4.6)
    g.line(7.5, 5.6, 7.5, 3.0); g.line(7.5, 3.6, 5.6, 2.2); g.line(7.5, 3.6, 9.4, 2.2); g.pts([(5.2, 1.6), (9.8, 1.6)])
    g.legs([5, 10], 13.8)
    for (dx, dy) in ((0, 0), (1, 0), (2, 0), (3, 0), (0, 1), (1, 1), (2, 1), (3, 1)): g.hole(6 + dx, 8.6 + dy) if dx < 3 else None
    return g

# ---------------- wobbler / tall ----------------
def _wobble(k=1.0, big=0.0):
    """big slanted-eye head, chin, tiny body, thin arms and legs"""
    g = A(k)
    g.ell(7.5, 5.2, 5.8 + big, 4.5 + big * 0.6); g.ell(7.5, 9.2, 3.4, 2.4)
    g.ell(7.5, 12.2, 2.4, 1.9)
    g.line(5.2, 11.6, 3.2, 13.4); g.line(9.8, 11.6, 11.8, 13.4)
    g.legs([6.2, 8.8], 13.4)
    g.slants(4 - (1 if big else 0) + 0, 4.6)
    return g

def _tall(k=1.0, head=4.4):
    """tall grey: huge head, thin neck, narrow body, long limbs"""
    g = A(k)
    g.ell(7.5, 3.8, head, head * 0.85); g.ell(7.5, 6.6, head * 0.45, 1.3)
    g.line(7.5, 6.6, 7.5, 8.0)
    g.ell(7.5, 9.8, 2.3, 2.6)
    g.line(5.4, 8.8, 3.4, 12.8); g.line(9.6, 8.8, 11.6, 12.8)
    g.legs([6.3, 8.7], 11.8)
    g.slants3(5, 2.6)
    return g

# ---------------- antenna blob / tentacle / three-eyes ----------------
def _antenna(k=1.0, wide=0.0, n=2, ball=1.2):
    g = A(k)
    g.ell(7.5, 10.2, 5.0 + wide, 4.2)
    xs = (3.2, 11.8) if n == 2 else (2.6, 7.5, 12.4)
    for x in xs:
        bx = 7.5 + (x - 7.5) * 0.7
        g.line(bx, 6.6, x, 2.4); g.ell(x, 1.8, ball, ball)
    g.legs([5, 10], 13.6)
    g.pair(5, 9, 2, 2)
    return g

def _tentacle(k=1.0, n=4, dome=4.6):
    g = A(k)
    g.ell(7.5, 6.2, dome + 0.6, dome)
    xs = (3.6, 6.2, 8.8, 11.4) if n == 4 else (2.6, 4.6, 6.6, 8.4, 10.4, 12.4)
    for i, x in enumerate(xs):
        tx, ty = g.T(x, 8.4)
        tx = int(round(tx)); top = int(round(ty))
        for y in range(top, 16):
            w = 1 if (k >= 0.85 and (y // 2 + i) % 2) else 0
            g._raw(tx + w, y)
            if y < top + 2: g._raw(tx + w + 1, y)
    g.pair(4, 5, 2, 2)
    return g

def _three(k=1.0, fat=0.0):
    """wide head, forehead eye above two side eyes"""
    g = A(k)
    g.ell(7.5, 7.0, 6.0 + fat, 4.8 + fat * 0.4)
    g.ell(7.5, 12.2, 3.4 + fat * 0.4, 2.6)
    g.legs([5.2, 10.0], 13.4)
    g.pair(3, 7, 2, 2)
    for dx in (0, 1):
        for dy in (0, 1): g.hole(7 + dx, 4 + dy)
    return g

# ---------------- brain / cyclops / blob ----------------
def _brain(k=1.0, big=0.0, tendrils=False):
    """floating lobed brain over a small face; a fissure opens from the top"""
    g = A(k)
    g.ell(7.5, 6.6, 5.2 + big, 3.0)
    g.ell(4.2, 5.2, 2.8 + big * 0.5, 2.6); g.ell(10.8, 5.2, 2.8 + big * 0.5, 2.6); g.ell(7.5, 3.8, 3.2, 2.8 + big * 0.5)
    g.ell(7.5, 10.0, 4.6 + big * 0.4, 3.0)
    g.line(8.0, 0.4, 8.0, 3.4, 0)      # fissure open to the top
    if tendrils:
        for x in (5, 7, 8, 10): g.px(x, 13); g.px(x, 14) if x in (5, 10) else None
        g.px(7, 14); g.px(8, 15) if False else None
    else:
        g.pts([(7, 13), (8, 13)])
    g.pair(5, 9, 2, 2)
    return g

def _cyclops(k=1.0, horns=0, wide=0.0, tall=0.0):
    """one giant eye, chunky body, stubby legs (+ horns)"""
    g = A(k)
    g.ell(7.5, 9.6 - tall * 0.3, 5.6 + wide, 4.8 + tall)
    if horns:
        g.tri(3.6, 6.0, 2.4, 2.2, 5.6, 5.2, min_h=2); g.tri(9.4, 5.2, 12.6, 2.2, 11.4, 6.0, min_h=2)
    g.legs([5, 10], 13.2)
    if k >= 0.8: g.bigeye(7.6)
    else:
        for (dx, dy) in ((0, 0), (1, 0), (0, 1), (1, 1)): g.hole(7 + dx, 8.4 + dy)
    return g

def _blob(k=1.0, fat=0.0):
    """round heavy blob: two eyes, stubby arms"""
    g = A(k)
    g.ell(7.5, 10.0, 6.3 + fat, 5.0 + fat * 0.4)
    g.line(1.4, 10.6, 0.8, 12.4); g.line(13.6, 10.6, 14.2, 12.4)
    g.legs([4.6, 10.4], 13.8)
    g.pair(4, 7, 2, 2)
    g.pts([(6.6, 5.0), (8.4, 5.0), (7.5, 4.4)])
    return g

def _sage(k=1.0):
    """robed elder: a huge lobed head on a bell-shaped robe, small hands"""
    g = A(k)
    g.ell(7.5, 4.8, 5.2, 3.8); g.ell(4.2, 3.8, 2.4, 2.2); g.ell(10.8, 3.8, 2.4, 2.2); g.ell(7.5, 2.6, 2.6, 1.8)
    g.line(8.0, 0.4, 8.0, 2.0, 0)
    for y in range(7, 15):
        hw = 3.4 + (y - 7) * 0.3
        x = 7.5 - hw
        while x <= 7.5 + hw + 0.01: g.set(x, y); x += 0.5
    for x in (3.5, 4.5, 10.5, 11.5): g.set(x, 14.8)
    g.px(3.0, 15); g.px(4.0, 15); g.px(11.0, 15); g.px(12.0, 15)
    g.slants3(4, 4.0)
    return g

# ---------------- insectoid / moth / saucer / crystal ----------------
def _insect(k=1.0, big=False):
    """mantis-ish profile facing right: round head, big eye, ball antennae, folded claws, legs"""
    g = A(k)
    g.ell(4.6, 9.8, 3.8, 2.8); g.ell(8.6, 8.8, 2.6, 2.8)           # abdomen, thorax
    g.ell(11.4, 5.4, 3.0, 2.6)                                         # head
    g.line(10.6, 3.2, 9.2, 0.8); g.line(12.2, 3.2, 13.8, 0.8); g.px(9.0, 0.2); g.px(14.0, 0.2)   # antennae
    g.pts([(14.2, 7.0), (14.8, 7.8), (13.6, 7.6)])                      # mandibles
    if big: g.line(10.4, 9.4, 12.6, 7.6); g.line(12.6, 7.6, 14.4, 9.6); g.px(14.6, 10.4)   # claw held up
    else: g.line(10.4, 9.6, 13.0, 9.6); g.line(13.0, 9.6, 13.4, 7.8)        # folded claw
    g.legs([3.4, 5.8, 8.0], 11.4, foot=False)
    g.px(10.0, 11.6); g.px(10.4, 12.6); g.px(10.8, 14.0); g.px(11.0, 15)
    for dx in (0, 1):
        for dy in (0, 1): g.hole(11 + dx, 4.6 + dy)
    return g

def _moth(k=1.0, span=1.0, tails=False):
    """moth-folk, front view: fluffy body, swept wings, feathered antennae"""
    g = A(k)
    g.ell(7.5, 9.8, 2.2, 3.6); g.ell(7.5, 5.0, 3.0, 2.7)
    g.tri(5.8, 6.4, 0.2, 1.4, 0.4, 9.6)  ; g.tri(9.2, 6.4, 14.8, 1.4, 14.6, 9.6)
    g.tri(5.6, 7.4, 0.4, 8.6, 2.6, 13.8); g.tri(9.4, 7.4, 14.6, 8.6, 12.4, 13.8)
    g.tri(5.6, 6.0, 0.6, 4.0, 1.0, 11.0); g.tri(9.4, 6.0, 14.4, 4.0, 14.0, 11.0)
    g.line(6.4, 3.0, 4.2, 0.2); g.line(8.6, 3.0, 10.8, 0.2); g.pts([(4.2, 1.2), (10.8, 1.2), (5.2, 1.6), (9.8, 1.6)])
    if tails:
        g.line(2.6, 13.4, 1.0, 15.0); g.line(12.4, 13.4, 14.0, 15.0); g.px(1.4, 13.8); g.px(13.6, 13.8)
    g.legs([6.4, 8.6], 13.4, foot=False)
    g.hole(6, 5); g.hole(9, 5); g.hole(6, 6); g.hole(9, 6)
    return g

def _saucer(k=1.0, dome=3.2, spire=False):
    """little saucer pilot: face in the dome, wide disc, landing legs"""
    g = A(k)
    top = 9.4
    g.ell(7.5, top - 3.6, dome + 0.4, dome * 0.98)
    g.ell(7.5, top, 7.3, 2.1); g.ell(7.5, top + 1.5, 4.0, 1.3)
    if spire:
        g.line(7.5, top - 6.4, 7.5, top - 8.4); g.px(6.7, top - 8.6); g.px(8.3, top - 8.6)
    g.line(4.2, top + 1.8, 2.8, 14.6); g.line(10.8, top + 1.8, 12.2, 14.6); g.px(2.2, 15); g.px(3.2, 15); g.px(11.8, 15); g.px(12.8, 15)
    g.pair(6, top - 4.4, 1, 2)
    return g

def _crystal(k=1.0, sh=6.0, sats=0, spikes=0):
    """faceted gem being: a cut diamond (flat table, wide shoulders, pointed base) with a face, floating shards beside it"""
    g = A(k)
    for y in range(1, 15):
        if y <= 5: hw = 2.2 + (y - 1) * (sh - 2.2) / 4.0
        else: hw = sh * (1 - (y - 5) / 10.0)
        x = 7.5 - hw
        while x <= 7.5 + hw + 0.01:
            g.set(x, y); x += 0.5
    if spikes:
        g.tri(7.5 - sh - 0.6, 5.4, 7.5 - sh + 0.2, 0.2, 7.5 - sh + 2.2, 3.4, min_h=2)
        g.tri(7.5 + sh - 2.2, 3.4, 7.5 + sh - 0.2, 0.2, 7.5 + sh + 0.6, 5.4, min_h=2)
    if sats >= 1:
        for (dx, dy) in ((0, 0), (0, -1), (0, 1), (-1, 0), (1, 0)):
            g.px(1.0 + dx, 11.0 + dy)
            if sats >= 2: g.px(14.0 + dx, 9.0 + dy)
    g.pair(5, 4.0, 1, 3)
    return g

# ---------------- cosmic ultimates ----------------
def _ship(k=1.0):
    """friendly mothership: stacked saucer with a face, antenna array and a skirt of lights"""
    g = A(k)
    g.ell(7.5, 10.2, 7.7, 2.8); g.ell(7.5, 6.4, 4.4, 3.2); g.ell(7.5, 3.6, 2.2, 1.6)
    g.line(7.5, 2.4, 7.5, 0.4); g.px(6.7, 0.4); g.px(8.3, 0.4)
    g.line(3.0, 8.0, 1.4, 5.4); g.px(1.2, 4.6); g.line(12.0, 8.0, 13.6, 5.4); g.px(13.8, 4.6)
    for x in (1, 4, 7, 10, 13):                       # lights: little feet under the rim
        g.px(x, 13.4); g.px(x + 0.6, 14.6)
    g.pair(4, 5.6, 2, 2)
    return g

def _jelly(k=1.0):
    """cosmic jellyfish: crowned bell, curling ribbon arms, short strands"""
    g = A(k)
    g.ell(7.5, 5.2, 5.2, 3.8)
    for x in (3.5, 5.5, 7.5, 9.5, 11.5): g.px(x, 1.0)
    g.px(5.5, 0.2); g.px(9.5, 0.2)
    g.ell(7.5, 8.6, 4.6, 1.2)
    left = [(4.4, 9.4), (3.6, 10.6), (2.8, 12.0), (2.0, 13.4), (2.4, 14.6), (3.6, 14.6), (4.0, 13.6)]
    for (x, y) in left:
        g.px(x, y); g.px(15 - x, y)
    for (x, y) in ((4.4, 10.4), (3.6, 11.6), (2.8, 13.0)): g.px(x + 1, y); g.px(14 - x, y)
    for x in (6.5, 8.5):
        for y in range(10, 14): g.px(x + (0 if y % 2 else 1) * (1 if x < 7 else -1), y)
    g.pair(5, 4.6, 2, 2)
    return g

def _nebula(k=1.0):
    """pinwheel galaxy: bright core with two swirling arms, a face in the middle"""
    g = A(k)
    g.ell(7.5, 8.2, 3.8, 3.6)
    for arm in (0, math.pi):
        for i in range(0, 22):
            t = i / 21.0
            a = arm + t * 3.4 - 0.4
            r = 3.0 + t * 4.6
            g.ell(7.5 + math.cos(a) * r * 1.05, 8.2 + math.sin(a) * r * 0.82, 1.0 + (1 - t) * 0.9, 1.0 + (1 - t) * 0.7)
    g.pair(6, 7.6, 1, 2)
    return g

def _maw(k=1.0):
    """star-eater: round body with a big bite taken out of the front and a star on its way in"""
    g = A(k)
    g.ell(6.8, 9.0, 6.2, 5.6)
    g.tri(15.6, 3.6, 15.6, 14.0, 7.6, 8.8, v=0)
    g.legs([4.4, 8.4], 13.8)
    for (dx, dy) in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)): g.px(12.8 + dx, 8.8 + dy)
    for dx in (0, 1):
        for dy in (0, 1): g.hole(4 + dx, 5.6 + dy)
    g.line(5.6, 3.8, 4.6, 1.4); g.px(4.0, 1.0)
    g.pts([(10, 8), (12, 7), (10, 10), (12, 11)])
    return g

def _ring(k=1.0):
    """a donut: a ring of body around a calm hole; the face rides the top of the ring"""
    g = A(k)
    g.ell(7.5, 8.2, 6.4, 6.4)
    g.ell(7.5, 8.6, 2.9, 2.9, 0)
    g.legs([5, 10], 13.6)
    g.pair(4, 3.6, 2, 2)
    return g

# ---------------- registry ----------------
def _build(fn, hd, eye, body, **kw):
    by = {}
    for stage, k in SIZES.items():
        g = fn(k=k, **kw)
        hx, hy = _T(k, hd[0], hd[1])
        ex, ey = g.anchor if g.anchor else tuple(round(v) for v in _T(k, eye[0], eye[1]))
        g._raw(ex, ey, 0)
        by[stage] = dict(rows=g.rows(), head=(hx, hy, max(1.6, hd[2] * k)), eye=(ex, ey),
                         body=(_T(k, body[0], 0)[0], _T(k, body[1], 0)[0]))
    return dict(by_stage=by)

ARCH_ALIEN = {
 'al_babe':    _build(_babe, (7.5, 8.6, 4.2), (5, 8.5), (3, 12)),
 'al_orb':     _build(_orb, (7.5, 10.0, 4.6), (7, 9), (3, 12)),
 'al_wobble':  _build(_wobble, (7.5, 6.0, 4.4), (4.4, 5.6), (5, 10)),
 'al_wobblebig': _build(_wobble, (7.5, 6.0, 5.0), (3.8, 5.6), (5, 10), big=0.9),
 'al_tall':    _build(_tall, (7.5, 3.8, 3.4), (5, 3.4), (6, 9)),
 'al_tallbig': _build(_tall, (7.5, 3.8, 4.0), (5, 3.4), (6, 9), head=4.2),
 'al_antenna': _build(_antenna, (7.5, 10.0, 4.4), (5, 9.2), (3, 12)),
 'al_antbig':  _build(_antenna, (7.5, 10.0, 5.0), (5, 9.2), (2, 13), wide=1.0, ball=1.5),
 'al_ant3':    _build(_antenna, (7.5, 10.0, 5.0), (5, 9.2), (2, 13), wide=0.6, n=3, ball=1.3),
 'al_tentacle': _build(_tentacle, (7.5, 6.0, 4.6), (4.6, 5.6), (3, 12)),
 'al_tent6':   _build(_tentacle, (7.5, 5.8, 5.0), (4.6, 5.4), (2, 13), n=6, dome=5.0),
 'al_three':   _build(_three, (7.5, 7.0, 5.4), (3.4, 7.4), (3, 12)),
 'al_threefat': _build(_three, (7.5, 7.0, 6.0), (3.0, 7.4), (2, 13), fat=1.0),
 'al_brain':   _build(_brain, (7.5, 6.0, 5.0), (5.4, 10.0), (3, 12)),
 'al_brainbig': _build(_brain, (7.5, 6.0, 5.6), (5.4, 10.0), (2, 13), big=0.8),
 'al_brainking': _build(_brain, (7.5, 6.0, 5.6), (5.4, 10.0), (2, 13), big=0.8, tendrils=True),
 'al_sage':    _build(_sage, (7.5, 4.6, 4.6), (4, 4.4), (3, 12)),
 'al_cyclops': _build(_cyclops, (7.5, 9.0, 5.0), (7, 8.5), (3, 12)),
 'al_cyclohorn': _build(_cyclops, (7.5, 9.0, 5.0), (7, 8.5), (3, 12), horns=1, wide=0.4),
 'al_cyclobig': _build(_cyclops, (7.5, 8.6, 5.6), (7, 8.5), (2, 13), horns=1, wide=1.0, tall=0.6),
 'al_blob':    _build(_blob, (7.5, 9.0, 5.6), (5.4, 8.4), (2, 13)),
 'al_blobfat': _build(_blob, (7.5, 9.0, 6.0), (5.4, 8.4), (1, 14), fat=0.9),
 'al_insect':  _build(_insect, (11.4, 5.4, 2.8), (11.5, 5.0), (2, 12)),
 'al_insectbig': _build(_insect, (11.4, 5.4, 2.8), (11.5, 5.0), (2, 12), big=True),
 'al_moth':    _build(_moth, (7.5, 5.0, 2.2), (6.4, 5.0), (4, 11)),
 'al_mothbig': _build(_moth, (7.5, 5.0, 2.4), (6.4, 5.0), (3, 12), span=1.15),
 'al_luna':    _build(_moth, (7.5, 5.0, 2.4), (6.4, 5.0), (3, 12), span=1.15, tails=True),
 'al_saucer':  _build(_saucer, (7.5, 6.0, 3.2), (6, 5.6), (1, 14)),
 'al_saucerbig': _build(_saucer, (7.5, 6.0, 3.6), (6, 5.6), (1, 14), dome=3.7, spire=True),
 'al_crystal': _build(_crystal, (7.5, 5.0, 3.4), (4, 4), (2, 13), sh=5.2),
 'al_crystal2': _build(_crystal, (7.5, 5.0, 3.6), (4, 4), (2, 13), sh=5.8, sats=1),
 'al_crystal3': _build(_crystal, (7.5, 5.0, 3.8), (4, 4), (1, 14), sh=6.4, sats=2),
 'al_ship':    _build(_ship, (7.5, 6.4, 4.2), (6, 6.6), (0, 15)),
 'al_jelly':   _build(_jelly, (8.6, 5.6, 4.6), (6.8, 5.6), (3, 13)),
 'al_nebula':  _build(_nebula, (7.5, 8.2, 3.8), (6.2, 7.6), (1, 14)),
 'al_maw':     _build(_maw, (6.8, 9.0, 5.2), (4.5, 6.0), (1, 12)),
 'al_ring':    _build(_ring, (7.5, 5.0, 3.0), (4.5, 4.3), (1, 14)),
}
spritegen.register_archetypes(ARCH_ALIEN)

# ---------------- decorations (g is spritegen.G: plain pixel coordinates) ----------------
def _bb(g):
    pts = [(x, y) for y in range(16) for x in range(16) if g.get(x, y)]
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)

def _top(g, x):
    for y in range(16):
        if g.get(x, y): return y
    return None

def al_glitch(g, c):
    """stray line: two rows tear sideways by one pixel at their edges and two edge pixels drop out (no enclosed holes)"""
    x0, y0, x1, y1 = _bb(g)
    h = y1 - y0
    for frac, d in ((0.34, 1), (0.7, -1)):
        y = y0 + int(h * frac)
        row = [g.get(x, y) for x in range(16)]
        if sum(row) < 4: continue
        for x in range(16):
            if row[x] and (x <= x0 + 1 or x >= x1 - 1) and 0 <= x + d < 16:
                g.p[y][x + d] = 1
                if x - d >= 0 and not row[x - d]: g.p[y][x] = 0
    for (left, fy) in ((True, 0.55), (False, 0.25)):
        x = x0 if left else x1; y = y0 + int(h * fy) + 1
        if g.get(x, y) and g.get(x + (1 if left else -1), y): g.set(x, y, 0)

def al_spark(g, c):
    """a four-point sparkle in a free top corner"""
    for (x, y) in ((1, 2), (13, 2), (1, 7), (14, 6)):
        if all(not g.get(x + dx, y + dy) for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2)):
            for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)): g.set(x + dx, y + dy)
            return

def al_stars(g, c):
    """up to three single-pixel stars in empty corners"""
    n = 0
    for (x, y) in ((1, 1), (14, 2), (14, 9), (1, 5), (2, 11), (14, 5)):
        if n < 3 and all(not g.get(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)):
            g.set(x, y); n += 1

def al_moon(g, c):
    """crescent moon beside the head"""
    x0, y0, x1, y1 = _bb(g)
    cx, cy = (x1 + 2.2, y0 + 1.6) if x1 < 12 else (max(2.0, x0 - 1.4), y0 + 1.6)
    g.ellipse(cx, cy, 2.0, 2.0); g.ellipse(cx + (1.1 if cx > 8 else -1.1), cy - 0.3, 1.7, 1.7, 0)

def al_plates(g, c):
    """armour ridges along the top"""
    x0, y0, x1, y1 = _bb(g)
    for x in range(x0 + 2, x1 - 1, 2):
        t = _top(g, x)
        if t is not None and t > 0: g.set(x, t - 1)

spritegen.EXTRA_HANDLERS.update({
 'al_glitch': al_glitch, 'al_spark': al_spark, 'al_stars': al_stars, 'al_moon': al_moon, 'al_plates': al_plates,
})
