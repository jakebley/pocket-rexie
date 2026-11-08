"""Fish-family archetypes (16x16, facing right, ground on row 15). Built from parts like the fox bodies and
built natively at every stage size. Swimming bodies rest on the ground line with a gravel base, a ventral fin,
a flat belly, dangling tentacles or a curled tail, so they stand on row 15 in the existing scene.
Also registers the fish_* decorations (spritegen.EXTRA_HANDLERS)."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import spritegen
from archetypes_fox import _G, _T, SIZES

def _cut_below(g, y, v=0):
    """Clear every row below full-size row y (after the transform)."""
    yy = int(round(g.T(0, y)[1]))
    for r in range(yy + 1, 16):
        for x in range(16): g.p[r][x] = v

def _gravel(g, x0, x1, step=1):
    for x in range(x0, x1 + 1, step): g.set(x, 15)

def _fish(k=1.0, rx=4.8, ry=3.2, tail=3.6, dorsal=3.0, long=0, fork=1, ventral=1):
    g = _G(k)
    cx = 8.2 + long * 0.3
    g.ell(cx, 9.0, rx + long, ry)
    g.tri(cx + rx + long - 1.6, 6.6, 15.2, 9.0, cx + rx + long - 1.6, 11.4)     # pointed snout
    tx = cx - rx - long + 0.8
    g.tri(tx, 9.0, tx - tail, 5.2, tx - tail, 12.8)                              # tail fan
    if fork: g.set(tx - tail, 9, 0)
    g.tri(cx - 2.4, 6.4, cx - 0.6, 6.4 - dorsal, cx + 2.4, 6.2, min_h=2)      # dorsal fin
    g.line(cx + 1.4, 10.6, cx - 0.2, 12.6)                                       # pectoral
    if ventral: g.line(cx - 1.4, 11.4, cx - 2.4, 13.0)
    for x in range(4, 13, 2): g.set(x, 15)                                       # pebbles
    return g

def _puffer(k=1.0, spikes=0):
    g = _G(k)
    g.ell(8.4, 8.8, 4.8, 4.4)
    g.tri(4.0, 8.8, 0.8, 5.8, 0.8, 11.8)
    g.tri(7.0, 5.0, 8.4, 2.8, 9.8, 5.0, min_h=2)
    g.line(10, 10.8, 9, 12.4)
    g.set(13.2, 10.8, 0)
    for x in range(5, 12, 2): g.set(x, 15)
    g.set(7, 14); g.set(9, 14)
    return g

def _horse(k=1.0, crown=0):
    g = _G(k)
    g.ell(9.4, 3.4, 2.4, 2.1)                               # head
    g.tri(11.2, 2.8, 11.2, 4.4, 14.6, 4.0)                  # snout
    g.tri(8.2, 1.6, 8.6, -0.2 + 0.0, 10.2, 1.4, min_h=2)    # crest spike
    g.ell(8.4, 7.0, 3.0, 3.2)                               # chest bulge
    g.ell(7.2, 11.0, 2.2, 2.6)                              # tummy
    g.line(7.4, 12.5, 6.2, 14.5); g.line(6.2, 14.5, 4.2, 14.7)  # tail curls in
    g.line(4.2, 14.7, 3.4, 13.0); g.set(3.4, 12.2)
    g.tri(5.6, 6.8, 3.2, 8.2, 5.8, 9.6)                     # dorsal fin on the back
    _gravel(g, 3, 9, 1)
    return g

def _ray(k=1.0, tail=1):
    g = _G(k)
    g.tri(0.6, 12.8, 8.0, 8.4, 15.4, 12.8)                  # top wing
    g.tri(0.6, 12.8, 8.0, 15.4, 15.4, 12.8)                 # bottom wing
    g.ell(11.4, 11.0, 2.4, 1.8)                             # head bump
    if tail:
        g.line(1.0, 12.8, 0.0, 7.6); g.line(2.0, 12.4, 1.0, 7.6)
    return g

def _jelly(k=1.0, tentacles=4, bell=5.0):
    g = _G(k)
    g.ell(8.0, 5.6, bell, 4.2)
    _cut_below(g, 7.6)
    g.line(3.2, 7.4, 12.8, 7.4)                             # frilled rim
    for i in range(tentacles):
        x = 5.0 + i * (6.0 / max(1, tentacles - 1)) if tentacles > 1 else 8
        for y in range(8, 16):
            g.set(x + (0.0 if (y // 2) % 2 == 0 else 1.0), y)
    return g

def _eel(k=1.0, waves=1.0, thick=2.0):
    import math
    g = _G(k)
    for i in range(0, 80):
        t = i / 79
        x = 1.5 + t * 11.5
        y = 12.6 - 2.1 * math.sin(t * math.pi * 2 * waves) - t * 2.4
        g.ell(x, y, thick * (0.7 + 0.3 * t), thick * (0.7 + 0.3 * t))
    g.ell(13.2, 9.6, 2.0, 1.7)                                  # head
    g.tri(14.8, 9.0, 15.4, 9.8, 12.6, 10.4)                     # snout
    g.tri(1.0, 12.8, -0.5, 10.2, 2.4, 11.6)                     # tail fin
    for x in range(3, 13, 2): g.set(x, 15)
    return g

def _angler(k=1.0, belly=0):
    g = _G(k)
    g.ell(8.0, 9.8, 5.0 + belly, 3.8 + belly * 0.4)
    g.ell(11.6, 10.2, 3.2, 3.0)
    g.line(11.4, 11.4, 15.5, 11.4, 0)
    for x in (12.6, 14.0): g.set(x, 10.6); g.set(x + 0.5, 12.2)
    g.tri(3.6, 9.8, 0.4, 6.8, 0.4, 13.2)
    g.tri(5.5, 6.6, 7.0, 4.2, 8.8, 6.4, min_h=2)
    g.line(7.2, 12.8, 6.2, 15); g.line(10.2, 12.8, 10.8, 15)
    return g

def _koi(k=1.0, bulk=0):
    g = _G(k)
    g.ell(8.2, 9.0, 5.6 + bulk * 0.3, 3.0 + bulk * 0.4)
    g.ell(12.6, 9.0, 2.2, 2.3)
    g.tri(3.0, 9.0, -0.2, 4.8, 1.0, 9.0)                        # tail, two flowing lobes
    g.tri(3.0, 9.0, -0.2, 13.4, 1.0, 9.0)
    g.line(3.0, 9.0, 0.8, 9.0)
    g.tri(5.4, 6.4, 8.0, 4.0, 10.4, 6.6, min_h=2)
    g.line(9.8, 10.8, 8.4, 12.8); g.line(6.4, 11.6, 5.4, 13.2)
    for x in range(4, 13, 2): g.set(x, 15)
    return g

def _whale(k=1.0, spout=0):
    g = _G(k)
    g.ell(8.6, 10.6, 6.2, 4.0)
    g.ell(12.0, 10.8, 3.2, 3.4)
    g.tri(4.0, 9.4, 1.8, 6.2, 3.8, 11.0)                        # tail stalk
    g.tri(2.2, 6.6, -0.2, 2.8, 2.4, 4.6)                         # flukes
    g.tri(2.4, 4.6, 5.0, 2.6, 3.8, 7.0)
    g.line(2.2, 6.6, 3.2, 4.6)
    _cut_below(g, 14.6)
    g.line(8, 13.2, 11, 13.2, 0); g.line(10, 12, 8.4, 13.6)
    return g

def _fry(k=1.0, pearl=0):
    g = _G(k)
    g.ell(8.6, 10.6, 4.4, 3.8)
    g.tri(4.6, 10.6, 1.4, 8.0, 1.4, 13.2)
    g.tri(7.0, 7.4, 8.4, 5.6, 9.8, 7.4, min_h=2)
    _gravel(g, 5, 11, 1)
    return g

def _b(fn, head, eye, body, **kw):
    by = {}
    for stage, k in SIZES.items():
        g = fn(k=k, **kw)
        hx, hy = _T(k, head[0], head[1]); ex, ey = _T(k, eye[0], eye[1])
        g._raw(ex, ey, 0)
        by[stage] = dict(rows=g.rows(), head=(hx, hy, max(1.6, head[2] * k)), eye=(round(ex), round(ey)),
                         body=(_T(k, body[0], 0)[0], _T(k, body[1], 0)[0]))
    return dict(by_stage=by)

ARCH_FISH = {
 'fish_fry':    _b(_fry,    (11, 10, 2.4), (11, 9), (4, 12)),
 'fish_guppy':  _b(_fish,   (11.5, 9, 2.6), (11.5, 8.2), (4, 12)),
 'fish_fancy':  _b(_fish,   (11.5, 9, 2.6), (11.5, 8.2), (3, 12), tail=4.2, dorsal=4.0, rx=4.2, ry=3.6),
 'fish_slim':   _b(_fish,   (12.5, 9, 2.4), (12.5, 8.2), (2, 13), long=1.6, ry=2.8, tail=3.0),
 'fish_puffer': _b(_puffer, (12, 8.8, 2.8), (12, 7.8), (4, 12)),
 'fish_horse':  _b(_horse,  (9.4, 3.4, 2.4), (9.6, 2.8), (5, 10)),
 'fish_ray':    _b(_ray,    (11.4, 11, 2.4), (11.4, 10.2), (2, 13)),
 'fish_jelly':  _b(_jelly,  (8, 5, 3.6), (8, 4.6), (4, 12)),
 'fish_jelly3': _b(_jelly,  (8, 5, 3.6), (8, 4.6), (4, 12), tentacles=3, bell=4.2),
 'fish_eel':    _b(_eel,    (13.2, 9.6, 2.2), (13.4, 9), (2, 12)),
 'fish_angler': _b(_angler, (12, 10, 3.0), (12.4, 9.0), (3, 12)),
 'fish_angler2':_b(_angler, (12, 10, 3.0), (12.4, 9.0), (3, 12), belly=0.8),
 'fish_koi':    _b(_koi,    (12.6, 9.0, 2.4), (13, 8.4), (2, 13)),
 'fish_koi2':   _b(_koi,    (12.6, 9.0, 2.4), (13, 8.4), (2, 13), bulk=1.0),
 'fish_whale':  _b(_whale,  (12.0, 10.4, 3.2), (13.0, 9.4), (2, 14)),
}
spritegen.register_archetypes(ARCH_FISH)

# ---- decorations --------------------------------------------------------------------------------------------
def _bubbles(g, c):
    x, y = c['hx'] + c['hr'] * 0.5, c['hy'] - c['hr'] - 1
    for (dx, dy) in ((0, 0), (1.5, -2), (-0.5, -3.5)): g.set(x + dx, max(0, y + dy))

def _whisker(g, c):
    x, y = c['hx'] + c['hr'] - 0.5, c['hy'] + 0.5
    g.line(x, y, x + 2, y + 1.5); g.line(x, y - 1, x + 2, y - 2)

def _lantern(g, c):
    bx, by = c['hx'] + 1.5, max(1.5, c['hy'] - c['hr'] - 3)
    g.line(c['hx'] - 0.5, c['hy'] - c['hr'] + 0.5, bx - 1, by + 1)
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            if dx or dy: g.set(bx + dx, by + dy)
    g.set(bx, by, 0)

def _spout(g, c):
    x, y = c['hx'] - 0.5, c['hy'] - c['hr'] - 1
    g.set(x, y); g.set(x, y - 1); g.set(x - 1.5, y - 2); g.set(x + 1.5, y - 2); g.set(x, y - 3)

def _scales(g, c):
    for y in (int(c['ey']) + 1, int(c['ey']) + 3):
        for x in range(int(c['b0']) + 2, int(c['b1']) - 1, 2):
            if g.get(x, y) and g.get(x, y - 1) and g.get(x, y + 1): g.set(x + (1 if y % 2 else 0), y, 0)

def _coral(g, c):
    x = c['b0'] + 1
    for y in range(11, 16): g.set(x, y)
    g.set(x - 1, 12); g.set(x + 1, 10); g.set(x + 1, 13)

def _weed(g, c):
    x = c['b0'] - 0.5
    for y in range(10, 16): g.set(x + (1 if (y // 2) % 2 else 0), y)

def _shell(g, c):
    x = c['b1'] - 0.5
    for dx in (-1, 0, 1): g.set(x + dx, 14)
    g.set(x, 13); g.set(x, 15, 0)

for _n, _f in (('fish_bubbles', _bubbles), ('fish_whisker', _whisker), ('fish_lantern', _lantern),
               ('fish_spout', _spout), ('fish_scales', _scales), ('fish_coral', _coral),
               ('fish_weed', _weed), ('fish_shell', _shell)):
    spritegen.EXTRA_HANDLERS[_n] = _f
