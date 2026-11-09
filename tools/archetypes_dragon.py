"""Dragon archetypes (16x16, facing right, ground on row 15), built from parts, natively at each stage size.
A dragon is read from: a HORNED head with a snout, a LONG TAIL, and one of a few strong body plans:
 western (winged quadruped, long neck), wyvern (biped, wing-arms), eastern (S-curved serpent, no wings),
 lindwurm (low, two-legged, wingless), drake (small wingless quadruped with a frill), hoard (round and upright),
 hydra (several heads), coil (coiled around a hoard), stray (spindly lizard), hatch (wyrmling).
Also registers the dr_* decorations."""
import os, sys, math
sys.path.insert(0, os.path.dirname(__file__))
from archetypes_fox import _G, W, _T
import spritegen

def _path(g, pts, r=1.1, n=10):
    """stamp discs along a polyline: a thick, smooth curve (necks, serpent bodies, tails)"""
    for a, b in zip(pts, pts[1:]):
        for i in range(n + 1):
            t = i / n
            g.ell(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, r, r)

def _head(g, hx, hy, r=1.9, snout=1.6, horn=1, down=0.0):
    g.ell(hx, hy, r, r * 0.82)
    g.ell(hx + r * 0.9, hy + 0.5 + down, snout, 0.85)
    if horn:
        g.line(hx - 0.6, hy - r * 0.6, hx - 2.4, hy - r - 1.6)
        g.line(hx + 0.2, hy - r * 0.7, hx - 1.0, hy - r - 2.0)

def _legs(g, xs, top, foot=True):
    for x in xs:
        for y in range(int(top), 15): g.set(x, y)
        if foot: g.set(x + 0.6, 15)

def _batwing(g, sx, sy, tipx, tipy, backx, backy, bite=True):
    """bat wing: arm from the shoulder to the tip, then a scalloped membrane edge back to the body (a filled fan)"""
    dx, dy = backx - tipx, backy - tipy
    pts = [(tipx, tipy), (tipx - 1.4, tipy + dy * 0.62), (tipx + dx * 0.40, tipy + dy * 0.50),
           (tipx + dx * 0.55, tipy + dy * 0.95), (tipx + dx * 0.80, tipy + dy * 0.80), (backx, backy)]
    for a, b in zip(pts, pts[1:]):
        g.tri(sx, sy, a[0], a[1], b[0], b[1], min_h=0)
    g.line(sx, sy, tipx, tipy)
    if bite:  # carve the finger gaps from the scalloped notches in toward the shoulder
        for n in (pts[2], pts[4]):
            g.line(n[0], n[1] - 0.2, n[0] + (sx - n[0]) * 0.45, n[1] + (sy - n[1]) * 0.45, 0)

# ---- bodies ------------------------------------------------------------------------------
def _west(k=1.0, wing='up', fat=0.0, neck=1.0, horn=1, spade=True):
    g = _G(k)
    if wing == 'up': _batwing(g, 8.3, 8.4, 3.2, 0.2, 5.8, 8.0)
    elif wing == 'wide': _batwing(g, 8.6, 8.2, 2.0, 1.4, 4.6, 8.0)
    elif wing == 'fold': g.tri(8.0, 8.0, 3.6, 3.6, 5.4, 8.4, min_h=2)
    g.ell(7.4, 10.6, 4.1 + fat, 2.5 + fat * 0.4)
    _path(g, [(10.2, 9.0), (11.4, 6.8), (12.0, 5.4 + (1 - neck) * 2)], 1.0)
    hy = 4.3 + (1 - neck) * 2.2
    _head(g, 12.4, hy, 1.9, 1.7, horn)
    _legs(g, (5.2, 6.4, 9.0, 10.2), 11.6 if not fat else 12.4)
    _path(g, [(3.4, 11.0), (1.8, 11.9), (0.9, 13.2)], 0.9)
    if spade: g.tri(0.0, 12.4, 0.2, 14.9, 2.6, 14.0, min_h=2)
    return g

def _wyv(k=1.0, lean=0.0, horn=1, sail=False):
    g = _G(k)
    _batwing(g, 9.0, 7.0, 3.6, 0.4, 6.2, 8.8)
    g.ell(8.0, 9.4, 2.6, 3.4)
    g.ell(7.6, 12.2, 1.9, 1.9)  # thigh
    _legs(g, (7.4, 9.0), 13.2)
    g.set(6.6, 15); g.set(10.0, 15)
    _path(g, [(9.6, 7.0), (10.8, 5.2), (11.4, 4.0)], 0.95)
    _head(g, 12.0, 3.4, 1.8, 1.6, horn)
    _path(g, [(6.2, 11.6), (3.4, 12.8), (1.2, 12.6)], 0.9)
    g.tri(-0.2, 11.4, 0.2, 13.8, 2.2, 12.6, min_h=2)  # barbed tail tip
    g.set(9.8, 9.6); g.set(10.6, 10.6)  # tiny grasping forelimb
    return g

def _east(k=1.0, coils=1, mane=True):
    g = _G(k)
    pts = [(0.8, 12.6), (2.6, 10.4), (5.0, 10.6), (6.6, 13.0), (9.0, 13.4), (11.0, 11.4), (11.4, 8.6), (11.6, 6.0)]
    if coils == 0: pts = [(1.0, 13.4), (4.0, 13.0), (7.0, 13.4), (10.0, 12.0), (11.4, 9.0), (11.8, 6.2)]
    _path(g, pts, 1.1)
    _path(g, [(11.6, 6.0), (12.2, 4.6)], 1.0)
    g.ell(12.6, 3.9, 1.9, 1.5)
    g.ell(14.2, 4.5, 1.2, 0.85)
    g.line(12.0, 2.6, 10.4, 1.0); g.line(12.9, 2.4, 11.8, 0.4)
    g.set(15, 6); g.line(14.6, 5.4, 15.2, 6.6)  # whisker
    for (x, y) in ((6.0, 14.8), (9.5, 14.8)): g.set(x, y); g.set(x + 1, y)
    if mane:
        for (x, y) in ((11.0, 8.0), (10.2, 6.4), (10.4, 4.8)): g.set(x, y)
    return g

def _wurm(k=1.0, head_up=0.0, horn=1, hunch=0.0):
    g = _G(k)
    g.ell(6.6, 12.3, 5.0, 2.4 + hunch)
    _path(g, [(10.4, 11.2), (11.8, 9.6 - head_up)], 1.0)
    _head(g, 12.6, 8.6 - head_up, 1.9, 1.7, horn)
    _legs(g, (8.8, 10.4), 13.0)
    _path(g, [(2.4, 12.6), (0.8, 11.6), (0.6, 9.8)], 0.9)
    g.set(3.4, 14.8); g.set(2.4, 14.8)  # rear belly drag
    return g

def _drake(k=1.0, horn=1, tail_up=True):
    g = _G(k)
    g.ell(7.0, 11.2, 3.6, 2.2)
    _path(g, [(9.4, 10.0), (10.4, 8.4)], 1.1)
    _head(g, 11.6, 7.4, 2.1, 1.6, horn)
    g.line(9.6, 5.6, 8.4, 4.2); g.line(10.4, 5.2, 9.4, 3.6)  # frill spines
    _legs(g, (5.0, 6.2, 8.6, 9.8), 12.0)
    if tail_up: _path(g, [(3.8, 11.2), (1.8, 10.6), (1.0, 8.4), (2.0, 6.8)], 0.8)
    else: _path(g, [(3.8, 11.8), (1.6, 13.0), (0.6, 14.0)], 0.8)
    return g

def _hoard(k=1.0, wing=True, big=0.0):
    g = _G(k)
    if wing: g.tri(5.6, 6.6, 2.4, 1.8, 4.6, 9.0, min_h=2)  # small wing sticking up behind
    g.ell(7.4, 10.8, 4.0 + big, 3.7 + big * 0.5)
    _path(g, [(9.4, 7.6), (10.0, 6.0)], 1.2)
    _head(g, 10.6, 4.9, 2.4, 1.5, 1)
    _path(g, [(4.0, 13.6), (1.8, 13.8), (0.8, 12.2), (1.4, 10.8)], 0.8)
    _legs(g, (5.4, 6.4, 9.2, 10.2), 13.6)
    g.set(11.2, 9.4)
    return g

def _hydra(k=1.0, heads=3):
    g = _G(k)
    g.ell(6.6, 11.6, 4.4, 2.6)
    _legs(g, (4.8, 6.0, 8.8, 10.0), 12.6)
    _path(g, [(3.0, 11.6), (1.4, 12.4), (0.6, 14.0)], 0.9)
    _path(g, [(9.6, 10.0), (10.8, 6.6), (12.4, 3.4)], 0.85)   # high front neck (main head)
    _head(g, 13.2, 2.4, 1.6, 1.3, 1)
    _path(g, [(8.8, 9.6), (9.0, 6.0), (9.0, 3.4)], 0.8)       # tall middle neck
    _head(g, 9.4, 2.0, 1.4, 1.1, 0)
    if heads >= 3:
        _path(g, [(6.4, 9.8), (5.4, 6.8), (4.6, 4.8)], 0.8)   # leaning rear neck
        g.ell(4.8, 3.8, 1.3, 1.1); g.ell(6.0, 4.2, 0.9, 0.6)
    return g

def _coil(k=1.0, wing=True):
    g = _G(k)
    if wing: _batwing(g, 7.6, 8.0, 2.0, 1.2, 4.6, 8.4)
    g.ell(7.0, 12.6, 6.0, 2.4)
    g.ell(7.4, 12.8, 2.6, 0.9, 0)
    _path(g, [(11.4, 11.4), (11.6, 8.0), (11.2, 5.8)], 1.1)
    _head(g, 11.8, 4.4, 2.0, 1.6, 1)
    _path(g, [(2.0, 12.2), (0.8, 10.8), (1.0, 9.2)], 0.8)
    return g

def _stray(k=1.0, horn=0):
    g = _G(k)
    g.ell(7.2, 11.4, 3.3, 1.5)
    _path(g, [(9.6, 11.0), (10.8, 9.6)], 0.8)
    g.ell(11.6, 9.2, 1.6, 1.3)
    g.ell(13.0, 9.8, 1.3, 0.7)
    g.line(10.8, 8.2, 10.0, 7.0)  # lone bent spine / ear
    _legs(g, (5.0, 6.6, 8.6, 10.2), 12.4)
    g.set(4.4, 15); g.set(8.0, 15)
    _path(g, [(4.0, 11.4), (2.0, 12.0), (0.8, 11.0), (0.4, 13.4)], 0.65)
    return g

def _hatch(k=1.0, wing=True):
    g = _G(k)
    g.ell(6.2, 12.4, 3.4, 2.6)
    g.ell(8.8, 8.2, 3.8, 3.4)
    g.ell(11.9, 9.4, 1.5, 1.1)
    g.line(7.6, 5.4, 6.8, 3.6); g.line(9.6, 5.0, 10.2, 3.2)  # horn nubs
    if wing: g.line(4.6, 9.6, 2.8, 8.0); g.line(4.0, 10.6, 2.4, 9.6)
    _path(g, [(3.2, 13.0), (1.4, 12.4), (1.0, 10.8)], 0.8)
    for x in (5.0, 8.0): g.set(x, 15); g.set(x + 1, 15)
    return g

SIZES = {1: 0.62, 2: 0.7, 3: 0.86, 4: 1.0, 5: 1.0}

def _build(fn, hd, eye, body, **kw):
    by = {}
    for stage, k in SIZES.items():
        g = fn(k=k, **kw)
        hx, hy = _T(k, hd[0], hd[1]); ex, ey = _T(k, eye[0], eye[1])
        g._raw(ex, ey, 0)
        by[stage] = dict(rows=g.rows(), head=(hx, hy, max(1.6, hd[2] * k)), eye=(round(ex), round(ey)),
                         body=(_T(k, body[0], 0)[0], _T(k, body[1], 0)[0]))
    return dict(by_stage=by)

ARCH_DRAGON = {
 'dr_west':    _build(_west, (12.4, 4.3, 1.9), (13.0, 3.9), (4, 10)),
 'dr_westlow': _build(_west, (12.4, 6.5, 1.9), (13.0, 6.1), (4, 10), wing='fold', neck=0.0, fat=0.5, horn=1),
 'dr_westwide':_build(_west, (12.4, 4.3, 1.9), (13.0, 3.9), (4, 10), wing='wide', fat=0.6),
 'dr_wyv':     _build(_wyv, (12.0, 3.4, 1.8), (12.7, 3.0), (6, 10)),
 'dr_east':    _build(_east, (12.6, 3.9, 1.9), (13.2, 3.5), (3, 11)),
 'dr_eastlong':_build(_east, (12.6, 3.9, 1.9), (13.2, 3.5), (2, 11), coils=0),
 'dr_wurm':    _build(_wurm, (12.6, 8.6, 1.9), (13.2, 8.2), (3, 10)),
 'dr_wurmup':  _build(_wurm, (12.6, 6.6, 1.9), (13.2, 6.2), (3, 10), head_up=2.0, hunch=0.4),
 'dr_drake':   _build(_drake, (11.6, 7.4, 2.1), (12.4, 7.0), (4, 9)),
 'dr_hoard':   _build(_hoard, (10.6, 4.9, 2.4), (11.5, 4.5), (4, 10)),
 'dr_hoardfat':_build(_hoard, (10.6, 4.9, 2.4), (11.5, 4.5), (3, 11), big=0.7),
 'dr_hydra':   _build(_hydra, (13.2, 2.4, 1.6), (13.9, 2.1), (3, 10)),
 'dr_coil':    _build(_coil, (11.8, 4.4, 2.0), (12.6, 4.0), (2, 12)),
 'dr_stray':   _build(_stray, (11.6, 9.2, 1.6), (12.2, 8.9), (4, 10)),
 'dr_hatch':   _build(_hatch, (8.8, 8.2, 3.8), (10.4, 7.8), (3, 9)),
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
    """sparks floating above the head"""
    x, y = int(c['hx']), int(c['hy'] - c['hr'] - 2.5)
    if y < 1: y = 1
    g.set(x + 2, y); g.set(x - 1, y + 1)

def dr_whisk(g, c):
    """long eastern whiskers trailing from the snout"""
    y = int(round(c['hy'] + 0.9)); x = _right(g, y, c['hx'])
    if x is None: return
    if x + 1 < 16: g.set(x, y + 1); g.set(x + 1, y + 2) if y + 2 < 16 else None

def dr_pearl(g, c):
    """a pearl held before the snout"""
    x = min(14, int(c['hx'] + c['hr'] + 2.2)); y = int(c['hy'] - c['hr'] - 0.6)
    g.ellipse(x, max(1.5, y), 1.1, 1.1); g.set(x, max(1.5, y), 0)

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
        if t is not None and t < 14: g.set(x, t + 2, 0)

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
