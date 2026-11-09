"""Bird archetypes (16x16, facing right, ground on row 15), built from parts like the fox ones.
Beaks, crests and legs are drawn in raw pixel space relative to the mapped head so they keep a 2px minimum
at every stage size. Also registers the bird_* decorations (EXTRA_HANDLERS)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from archetypes_fox import _G, W
import spritegen

SIZES = {1: 0.58, 2: 0.7, 3: 0.86, 4: 1.0, 5: 1.0}

def _T(k, x, y):
    return (W - 1) / 2 * (1 - k) + x * k, 15 - (15 - y) * k

class B(_G):
    def px(self, x, y, v=1):
        """Set a pixel at the mapped position of full-size (x, y)."""
        tx, ty = self.T(x, y); self._raw(tx, ty, v)
    def run(self, x, y, n, dx=1, dy=0, v=1):
        """A raw-pixel run of n pixels starting at the mapped (x, y); n does not shrink with k."""
        tx, ty = self.T(x, y)
        for i in range(n): self._raw(tx + dx * i, ty + dy * i, v)
    def beak(self, x, y, n=2, hook=False, down=False):
        self.run(x, y, n)
        if hook or down:
            tx, ty = self.T(x, y); self._raw(tx + n - 1, ty + 1)
    def legs(self, xs, top=13.0, toe=True):
        for x in xs:
            tx, ty = self.T(x, top)
            for y in range(int(round(ty)), 15): self._raw(tx, y)
            self._raw(tx, 15)
            if toe: self._raw(tx + 1, 15)
    def wing(self, pts, big=True):
        """Carve a folded wing as a line of empty pixels (skipped on the tiniest sizes where it is just noise)."""
        if self.k < 0.8: return
        for (a, b) in zip(pts, pts[1:]): self.line(a[0], a[1], b[0], b[1], 0)

def _chick(k=1.0, tuft=1, round_=0.0):
    g = B(k)
    g.ell(7.4, 10.4, 5.2 + round_, 4.3)
    g.ell(9.4, 7.0, 3.5, 3.1)
    g.beak(12.9, 7.4, 2)
    for i in range(tuft + 1): g.px(8.8 - i * 0.0 + (0.8 if i else 0), 3.6 - i)
    g.legs([6.2, 9.2], 14)
    g.wing([(4.5, 9.8), (6.5, 11.8), (8.2, 11.6)])
    return g

def _song(k=1.0, tail=3.4, belly=0.0, beak=2, hook=False, wing=True):
    g = B(k)
    g.ell(7.6, 9.8, 4.7 + belly, 3.7 + belly * 0.5)
    g.ell(10.2, 6.3, 2.9, 2.6)
    if tail:
        g.line(3.8, 11.0, 3.8 - tail, 11.0 + tail * 0.8); g.line(4.3, 10.0, 4.3 - tail, 10.0 + tail * 0.8)
    g.beak(12.9, 6.6, beak, hook)
    g.legs([7.0, 9.2], 13)
    if wing: g.wing([(5.4, 9.4), (7.4, 10.8)])
    return g

def _owl(k=1.0, tufts=1, belly=0.0):
    g = B(k)
    g.ell(8.0, 10.4, 4.2 + belly, 4.5 + belly * 0.4)
    g.ell(8.4, 5.2, 4.5, 3.4)
    if tufts:
        g.tri(4.3, 3.6, 4.8, 0.2, 6.5, 2.6, min_h=2)
        g.tri(10.4, 2.6, 12.2, 0.2, 12.7, 3.8, min_h=2)
    g.beak(11.4, 6.0, 1); g.px(11.4, 7.0)
    g.legs([6.4, 9.4], 14)
    g.wing([(10.6, 8.6), (11.2, 10.6), (9.8, 12.4)])
    g.px(6.6, 4.8, 0); g.px(6.6, 5.8, 0)  # second eye, large and round
    return g

def _raptor(k=1.0, tail=3.4, beak=2, chest=0.0, wing=True):
    g = B(k)
    g.ell(7.6, 9.4, 3.8 + chest, 4.5)
    g.ell(10.3, 4.8, 2.6, 2.4)
    g.line(9, 6, 8.6, 8.5); g.line(10, 6.5, 9.6, 8.5)
    if tail:
        g.line(5.6, 12.0, 5.6 - tail, 12.0 + tail * 0.9); g.line(6.6, 12.4, 6.6 - tail, 12.4 + tail * 0.9)
        g.line(4.6, 11.2, 4.6 - tail, 11.2 + tail * 0.8)
    g.beak(12.7, 5.0, beak, hook=True)
    g.legs([7.0, 9.0], 13)
    if wing: g.wing([(8.2, 7.6), (6.0, 9.4), (4.8, 11.8)])
    return g

def _duck(k=1.0, bill=3, neck=1.0):
    g = B(k)
    g.ell(7.0, 10.6, 5.6, 3.1)
    g.tri(0.8, 7.2, 3.8, 9.6, 2.0, 10.6, min_h=2)
    g.line(11.0, 9.0, 12.0, 6.6); g.line(10.4, 8.4, 11.4, 6.0)
    g.ell(12.0, 5.3, 2.3, 2.1)
    g.run(13.8, 6.2, bill)
    g.legs([6.4, 8.6], 13)
    g.wing([(4.2, 10.2), (7.0, 11.2), (9.6, 10.4)])
    return g

def _swan(k=1.0, bill=3):
    g = B(k)
    g.ell(6.6, 11.8, 5.4, 2.9)
    g.tri(0.8, 8.4, 3.6, 10.6, 1.8, 11.6, min_h=2)
    for (a, b) in (((10.0, 10.6), (11.8, 7.6)), ((11.8, 7.6), (10.6, 4.8)), ((10.6, 4.8), (11.4, 3.2))):
        g.line(a[0], a[1], b[0], b[1]); g.line(a[0] + 1, a[1], b[0] + 1, b[1])
    g.ell(11.6, 2.6, 1.9, 1.6)
    g.run(13.1, 3.0, bill)
    g.legs([6.4, 8.4], 14)
    g.wing([(3.6, 11.0), (6.8, 12.2), (9.6, 11.4)])
    return g

def _heron(k=1.0, bill=4):
    g = B(k)
    g.ell(7.0, 8.6, 4.2, 2.4)
    g.tri(1.0, 6.8, 3.4, 8.2, 2.0, 9.8, min_h=2)
    g.line(10.2, 7.6, 11.2, 3.8); g.line(11.2, 7.6, 12.0, 3.8)
    g.ell(11.8, 2.6, 1.8, 1.5)
    g.run(13.2, 2.9, bill)
    g.legs([7.4, 9.2], 10.6)
    g.wing([(4.8, 8.2), (7.0, 9.4), (9.4, 8.6)])
    return g

def _pigeon(k=1.0, tail=3.0, plump=0.0):
    g = B(k)
    g.ell(7.4, 10.2, 5.3 + plump, 4.0 + plump * 0.5)
    g.ell(9.9, 7.6, 2.8, 2.5)
    g.ell(11.3, 6.1, 2.1, 1.9)
    if tail:
        g.line(3.0, 10.8, 3.0 - tail, 10.8 + tail * 0.9); g.line(3.8, 11.8, 3.8 - tail, 11.8 + tail * 0.9)
    g.beak(13.2, 6.3, 2)
    g.legs([6.4, 8.8], 13.6)
    g.wing([(4.4, 9.2), (7.0, 11.4), (9.4, 10.6)])
    return g

def _build(fn, head, eye, body, **kw):
    by = {}
    for stage, k in SIZES.items():
        g = fn(k=k, **kw)
        hx, hy = _T(k, head[0], head[1]); ex, ey = _T(k, eye[0], eye[1])
        g._raw(ex, ey, 0)
        by[stage] = dict(rows=g.rows(), head=(hx, hy, max(1.6, head[2] * k)), eye=(round(ex), round(ey)),
                         body=(_T(k, body[0], 0)[0], _T(k, body[1], 0)[0]))
    return dict(by_stage=by)

ARCH_BIRD = {
 'bird_chick':   _build(_chick, (9.4, 7.0, 2.8), (10.6, 6.4), (3, 11)),
 'bird_round':   _build(_chick, (9.4, 7.0, 2.8), (10.6, 6.4), (3, 11), tuft=2, round_=0.6),
 'bird_song':    _build(_song, (10.2, 6.3, 2.5), (11.0, 5.7), (3, 12)),
 'bird_finch':   _build(_song, (10.2, 6.3, 2.5), (11.0, 5.7), (3, 12), tail=2.6, belly=0.5, beak=2),
 'bird_long':    _build(_song, (10.2, 6.3, 2.5), (11.0, 5.7), (3, 12), tail=4.2),
 'bird_owl':     _build(_owl, (8.4, 5.2, 3.4), (10.0, 4.8), (4, 12)),
 'bird_owl_fat': _build(_owl, (8.4, 5.2, 3.4), (10.0, 4.8), (3, 12), belly=0.8),
 'bird_raptor':  _build(_raptor, (10.3, 4.8, 2.4), (11.1, 4.3), (3, 11)),
 'bird_hawk':    _build(_raptor, (10.3, 4.8, 2.4), (11.1, 4.3), (2, 11), tail=4.2, chest=0.6),
 'bird_phoenix': _build(_raptor, (10.3, 4.8, 2.4), (11.1, 4.3), (4, 11), tail=0, wing=False, chest=0.4),
 'bird_eagle':   _build(_raptor, (10.3, 4.8, 2.4), (11.1, 4.3), (4, 11), tail=0, wing=False, chest=0.6),
 'bird_songfan': _build(_song, (10.2, 6.3, 2.5), (11.0, 5.7), (4, 12), tail=0, wing=False),
 'bird_doveshow': _build(_pigeon, (11.3, 6.1, 1.9), (12.0, 5.6), (4, 12), tail=0),
 'bird_duck':    _build(_duck, (12.0, 5.3, 2.1), (12.8, 4.8), (1, 12)),
 'bird_swan':    _build(_swan, (11.6, 2.6, 1.7), (12.2, 2.2), (1, 12)),
 'bird_heron':   _build(_heron, (11.8, 2.6, 1.6), (12.4, 2.2), (2, 11)),
 'bird_pigeon':  _build(_pigeon, (11.3, 6.1, 1.9), (12.0, 5.6), (3, 12)),
 'bird_pigeon_fat': _build(_pigeon, (11.3, 6.1, 1.9), (12.0, 5.6), (3, 12), plump=0.8),
}
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
