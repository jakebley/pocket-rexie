"""Bunny / small-furry archetypes (16x16, facing right, ground on row 15), built from parts.
Species are told apart by SILHOUETTE: rabbit = two tall upright ears + cotton tail; lop = ears hang down beside the head;
hare = long low body, long legs, long swept-back ears; hamster = near-perfect ball, tiny ears, cheek pouches;
guinea pig = low long loaf, no tail, no real ears; chinchilla = big round ears + long tail curling up;
dormouse = small body, huge bushy tail arching over the back; pika = tiny egg with round ears; baby = ball with small ears.
Built natively at each stage size (no averaging). Also registers the bun_* decorations."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from archetypes_fox import _G, W, _T
import spritegen

def _ear(g, bx, by, tx, ty, w=0.8):
    g.tri(bx - w, by, tx, ty, bx + w, by, min_h=2)

def _tl(g, x0, y0, x1, y1, r=1.0):
    """thick line made of small discs (ears keep >= 2 px width)"""
    n = 6
    for i in range(n + 1):
        t = i / n; g.ell(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r)

def _rabbit(k=1.0, ear=4.2, fluff=0.0, head=2.4, lop=False, tail=1.3):
    g = _G(k)
    g.ell(6.0, 11.2, 3.8 + fluff, 3.6)
    g.ell(8.8, 10.0, 2.4, 3.6)
    g.ell(10.0, 6.0, head, head * 0.92)
    g.ell(2.6, 12.6, tail, tail)  # cotton tail
    if lop:
        _tl(g, 8.2, 4.4, 6.4, 8.0, 1.0)
        _tl(g, 11.4, 4.6, 12.8, 8.6, 1.0)
        g.set(10.2, 6.6, 0)
    else:
        top = 6.0 - head * 0.8
        _tl(g, 8.8, top + 1.0, 8.0, top - ear + 1.0, 1.0)
        _tl(g, 11.2, top + 1.0, 12.0, top - ear + 1.4, 1.0)
    g.line(10.4, 11, 10.4, 14.5)
    for x in range(3, 12): g.set(x, 15)
    return g

def _hare(k=1.0, ear=4.4, long=0.0):
    """long low body, tall hind legs, ears swept back along the neck"""
    g = _G(k)
    g.ell(6.2, 9.6, 5.2 + long, 2.7)
    g.ell(3.2, 10.6, 2.6, 3.4)
    g.ell(11.6, 6.6, 2.3, 2.0)
    g.line(9.6, 8.4, 10.6, 7.4); g.line(9.8, 9.2, 11.2, 8.0)
    g.tri(12.8, 6.0, 12.8, 7.6, 14.6, 7.2)
    e = (ear - 4.4) * 0.6
    _tl(g, 10.4, 5.0, 8.0, 0.6 - e, 0.95)
    _tl(g, 11.8, 4.8, 11.4, 0.0 - e, 0.95)
    g.set(0.8, 9.2); g.set(0.8, 10.0)
    for x in (2.4, 3.8, 10.0, 11.4):
        for y in range(11, 15): g.set(x, y)
        g.set(x + 0.5, 15)
    return g

def _ham(k=1.0, cheeks=1.0):
    """near-perfect ball with cheek pouches and tiny ears; no tail"""
    g = _G(k)
    g.ell(7.4, 10.0, 5.6, 4.9)
    g.ell(10.6, 7.4, 3.0, 2.7)
    g.ell(11.9, 8.8, 1.9 * cheeks, 1.6)
    g.ell(8.6, 4.9, 1.0, 1.0); g.ell(11.8, 4.9, 1.0, 1.0)
    for x in range(4, 12): g.set(x, 15)
    return g

def _pig(k=1.0, fluff=0.0):
    """low long loaf with a blunt head and a small rosebud ear; no tail"""
    g = _G(k)
    g.ell(6.8, 11.0, 6.0 + fluff, 3.6)
    g.ell(12.4, 10.0, 2.6, 2.6)
    g.set(9.8, 6.9); g.set(10.5, 7.4); g.set(10.6, 6.9)
    g.tri(14.2, 9.0, 14.2, 11.0, 15.3, 10.4)
    for x in range(2, 14): g.set(x, 15)
    return g

def _chin(k=1.0, fluff=0.0):
    """plump upright body, BIG round ears, a long tail curling up behind"""
    g = _G(k)
    g.ell(6.6, 10.6, 3.8 + fluff, 4.1)
    g.ell(10.4, 6.6, 2.6, 2.4)
    g.ell(8.8, 2.8, 1.8, 1.8); g.ell(12.0, 2.9, 1.8, 1.8)
    g.set(8.8, 2.8, 0); g.set(12.0, 2.9, 0)
    for (x, y) in ((2.8, 13.0), (1.8, 12.0), (1.4, 10.6), (1.5, 9.0), (2.2, 7.8), (3.2, 7.2)):
        g.set(x, y); g.set(x + 0.8, y)
    g.line(10.8, 12.6, 10.8, 14.6)
    for x in range(3, 12): g.set(x, 15)
    return g

def _dor(k=1.0, fluff=0.0):
    """small and low, huge bushy tail arching over the back"""
    g = _G(k)
    g.ell(8.4, 11.6, 3.6, 2.9)
    g.ell(11.4, 8.8, 2.1, 2.0)
    g.tri(13.0, 8.2, 13.0, 9.6, 14.8, 9.2)
    g.ell(10.2, 6.6, 1.2, 1.2); g.ell(12.6, 6.8, 1.2, 1.2)
    g.set(10.2, 6.6, 0)
    g.ell(3.6, 9.4, 2.0 + fluff, 3.4 + fluff)
    g.ell(5.8, 6.8, 2.2 + fluff, 1.6)
    g.line(10.6, 13, 10.6, 14.5)
    for x in range(4, 13): g.set(x, 15)
    return g

def _pika(k=1.0, fluff=0.0):
    """tiny egg-shaped body, big round ears wide apart, no tail"""
    g = _G(k)
    g.ell(7.4, 11.6, 4.4 + fluff, 3.7)
    g.ell(9.8, 8.2, 2.7, 2.4)
    g.ell(8.2, 5.4, 1.6, 1.6); g.ell(11.4, 5.6, 1.6, 1.6)
    g.set(8.2, 5.4, 0); g.set(11.4, 5.6, 0)
    for x in range(4, 12): g.set(x, 15)
    return g

def _baby(k=1.0, ear=3.6):
    g = _G(k)
    g.ell(6.8, 11.6, 4.0, 3.2)
    g.ell(9.4, 8.2, 3.6, 3.3)
    _tl(g, 8.0, 5.8, 7.4, 5.8 - ear, 1.0)
    _tl(g, 10.9, 5.8, 11.7, 5.8 - ear, 1.0)
    g.ell(3.0, 12.6, 1.1, 1.1)
    for x in range(4, 12): g.set(x, 15)
    return g

SIZES = {1: 0.58, 2: 0.7, 3: 0.86, 4: 1.0, 5: 1.0}

def _build(fn, hd, eye, body, **kw):
    by = {}
    for stage, k in SIZES.items():
        g = fn(k=k, **kw)
        hx, hy = _T(k, hd[0], hd[1]); ex, ey = _T(k, eye[0], eye[1])
        g._raw(ex, ey, 0)
        by[stage] = dict(rows=g.rows(), head=(hx, hy, max(1.6, hd[2] * k)), eye=(round(ex), round(ey)),
                         body=(_T(k, body[0], 0)[0], _T(k, body[1], 0)[0]))
    return dict(by_stage=by)

ARCH_BUN = {
 'bun_sit':   _build(_rabbit, (10.0, 6.0, 2.4), (11.0, 5.8), (3, 10)),
 'bun_plump': _build(_rabbit, (10.0, 6.0, 2.5), (11.0, 5.8), (2, 10), fluff=1.0, head=2.5, ear=3.6),
 'bun_lop':   _build(_rabbit, (10.0, 6.0, 2.5), (11.0, 5.8), (3, 10), lop=True, head=2.5),
 'bun_hare':  _build(_hare, (11.6, 6.6, 2.2), (12.6, 6.4), (2, 10)),
 'bun_hare2': _build(_hare, (11.6, 6.6, 2.2), (12.6, 6.4), (1, 10), long=0.8, ear=5.0),
 'bun_ham':   _build(_ham, (10.6, 7.4, 2.8), (11.8, 7.0), (3, 11)),
 'bun_hamfat':_build(_ham, (10.6, 7.4, 2.8), (11.8, 7.0), (3, 11), cheeks=1.35),
 'bun_pig':   _build(_pig, (12.4, 10.0, 2.5), (13.6, 9.6), (2, 11)),
 'bun_pigfl': _build(_pig, (12.4, 10.0, 2.5), (13.6, 9.6), (2, 11), fluff=0.8),
 'bun_chin':  _build(_chin, (10.4, 6.6, 2.5), (11.5, 6.4), (3, 10)),
 'bun_chinfl':_build(_chin, (10.4, 6.6, 2.5), (11.5, 6.4), (3, 10), fluff=1.0),
 'bun_dor':   _build(_dor, (11.4, 8.8, 2.0), (12.4, 8.4), (4, 11)),
 'bun_dorfl': _build(_dor, (11.4, 8.8, 2.0), (12.4, 8.4), (4, 11), fluff=0.7),
 'bun_pika':  _build(_pika, (9.8, 8.2, 2.6), (10.8, 8.0), (3, 11)),
 'bun_baby':  _build(_baby, (9.4, 8.2, 3.5), (10.6, 8.0), (3, 10)),
}
spritegen.register_archetypes(ARCH_BUN)

# ---- decorations -------------------------------------------------------------------------
def _top(g, x):
    for y in range(16):
        if g.get(x, y): return y
    return None

def bun_clover(g, c):
    """four-leaf clover floating above the head"""
    x, y = int(round(c['hx'])), max(1, int(round(c['hy'] - c['hr'])) - 3)
    for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)): g.set(x + dx, y + dy)
    g.set(x + 1, y + 2)

def bun_moon(g, c):
    """crescent moon behind and above the animal"""
    cx, cy = 3.0, 3.0
    g.ellipse(cx, cy, 2.3, 2.3)
    g.ellipse(cx + 1.3, cy - 0.4, 1.9, 1.9, 0)

def bun_carrot(g, c):
    """a carrot held at the front paws"""
    x = min(14, int(round(c['hx'] + c['hr'] + 0.5)))
    g.line(x, 12, x, 14); g.set(x, 15); g.set(x - 1, 11); g.set(x + 1, 11)

def bun_seed(g, c):
    """sunflower seeds on the floor"""
    g.set(14, 15); g.set(13, 14); g.set(15, 14)

def bun_hay(g, c):
    """a tuft of hay on the ground in front"""
    for x in (13, 14, 15): g.set(x, 15)
    g.set(14, 14); g.set(15, 13)

def bun_notch(g, c):
    """torn ear: a nick out of the tallest ear tip"""
    t = None
    for x in range(int(c['hx'] - 3), int(c['hx'] + 3)):
        y = _top(g, x)
        if y is not None and (t is None or y < t[1]): t = (x, y)
    if t: g.set(t[0], t[1], 0)

def bun_dust(g, c):
    """neglect: fluff bits floating off the coat"""
    for x, y in ((1, 3), (14, 2), (3, 6)):
        if not g.get(x, y): g.set(x, y)

def bun_spark(g, c):
    """sparkle above the animal"""
    x, y = 3, 3
    for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)): g.set(x + dx, y + dy)

def bun_coin(g, c):
    """lucky gold coin on the floor beside the feet"""
    g.ellipse(13.5, 13.5, 1.5, 1.5); g.set(13, 13, 0)

def bun_whisk(g, c):
    """two whisker ticks"""
    y = int(round(c['hy'] + 0.7)); xs = [x for x in range(int(c['hx']), 16) if g.get(x, y)]
    if not xs: return
    x = max(xs)
    for dy in (-1, 1):
        if x + 1 < 16 and not g.get(x + 1, y + dy): g.set(x + 1, y + dy)

def bun_bow(g, c):
    """bow tie under the chin"""
    x = int(round(c['hx'])); y = int(round(c['hy'] + c['hr'] + 0.3))
    for dx in (-1, 0, 1): g.set(x + dx, y, 0)
    g.set(x - 1, y + 1); g.set(x + 1, y + 1)

def bun_flower(g, c):
    """a daisy tucked behind the ear"""
    x, y = int(round(c['hx'] - c['hr'] + 0.5)), int(round(c['hy'] - c['hr'] + 0.5))
    for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)): g.set(x + dx, y + dy)
    g.set(x, y, 0)

spritegen.EXTRA_HANDLERS.update({
 'bun_clover': bun_clover, 'bun_moon': bun_moon, 'bun_carrot': bun_carrot, 'bun_seed': bun_seed, 'bun_hay': bun_hay,
 'bun_notch': bun_notch, 'bun_dust': bun_dust, 'bun_spark': bun_spark, 'bun_coin': bun_coin, 'bun_whisk': bun_whisk,
 'bun_bow': bun_bow, 'bun_flower': bun_flower,
})
