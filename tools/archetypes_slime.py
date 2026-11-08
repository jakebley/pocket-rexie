"""Slime archetypes (16x16, ground on row 15), built from parts and natively at each stage size.
Blobs are told apart by SILHOUETTE: peaked drop, three-tier tower, split twin, mushroom cap, pitted morel,
eyestalks, snail shell, bell jelly with strands, wavy-skirt ghost, flan dessert, chest mimic, lumpy sludge,
melting drips, flat puddle. Each bakes its own eyes and an inner pattern (carved holes). Also registers slime_* decorations."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from archetypes_fox import _G, _T
import spritegen

def _eyes(g, *pts):
    for (x, y) in pts: g.set(x, y, 0)

def _bead(k=1.0):
    g = _G(k)
    g.ell(7.5, 11.6, 5.0, 3.5); g.ell(7.5, 9.6, 3.6, 3.2)
    _eyes(g, (6, 11), (9, 11))
    return g

def _dollop(k=1.0):
    """baby soft-serve: three little tiers with a curl on top"""
    g = _G(k)
    g.ell(7.5, 13, 4.6, 2.2); g.ell(7.5, 10.6, 3.4, 1.9); g.ell(7.5, 8.6, 2.1, 1.6)
    g.line(7.5, 7.6, 8.6, 6.0)
    _eyes(g, (6.2, 10.6), (9, 10.6))
    return g

def _drop(k=1.0, wide=0.0):
    g = _G(k)
    g.ell(7.5, 12.0, 5.4 + wide, 3.2); g.ell(7.5, 9.6, 4.2 + wide * 0.6, 3.0); g.ell(7.5, 7.2, 2.7, 2.5)
    g.tri(6.4, 6.2, 8.4, 2.4, 8.9, 6.2, min_h=2)
    _eyes(g, (6, 10), (9.3, 10))
    return g

def _tall(k=1.0):
    g = _G(k)
    g.ell(7.5, 12.6, 5.0, 2.5); g.ell(7.5, 8.6, 3.4, 3.0); g.ell(7.5, 4.8, 2.3, 2.3)
    g.ell(7.5, 6.7, 1.7, 1.6)
    _eyes(g, (6.3, 8.2), (9, 8.2))
    return g

def _twin(k=1.0, small=1.0):
    g = _G(k)
    g.ell(5.2, 10.6, 4.4, 4.2); g.ell(5.2, 13.2, 5.0, 1.8)
    g.ell(12.0, 12.6 - (small - 1) * 2.2, 2.6 * small, 2.4 * small + (small - 1) * 2); g.ell(12.0, 14.0, 2.8 * small, 1.2)
    g.line(8.5, 12.2, 10.2, 12.4); g.line(8.5, 13.2, 10.2, 13.4)
    _eyes(g, (4.2, 9.5), (6.8, 9.5), (12.0, 12.2))
    return g

def _cap(k=1.0, w=6.0, h=3.6, stem=2.2):
    g = _G(k)
    g.ell(7.5, 6.8, w, h + 0.4)
    for y in range(16):                       # flat underside
        for x in range(16):
            if y >= 9.6 and g.p[y][x]: g.p[y][x] = 0
    for y in range(int(9 + (h - 3.6)), 15):
        for x in range(int(round(7.5 - stem)), int(round(7.5 + stem)) + 1): g.set(x, y)
    g.ell(7.5, 14.2, stem + 1.5, 1.0)
    _eyes(g, (6.3, 12), (8.7, 12))
    return g

def _morel(k=1.0):
    g = _G(k)
    g.ell(7.5, 6.0, 3.6, 5.0); g.ell(7.5, 9.0, 5.0, 2.6)
    for y in range(16):
        for x in range(16):
            if y >= 10.4 and g.p[y][x]: g.p[y][x] = 0
    for y in range(10, 15):
        for x in (6, 7, 8, 9): g.set(x, y)
    g.ell(7.5, 14.3, 3.4, 1.0)
    for (x, y) in ((6.3, 4), (8.7, 4.8), (7.5, 6.8), (5.6, 7.4), (9.6, 7.8)): g.set(x, y, 0)  # pits
    _eyes(g, (6.4, 12), (8.8, 12))
    return g

def _stalk(k=1.0, n=2):
    g = _G(k)
    g.ell(7.5, 12.2, 5.6, 3.0); g.ell(7.5, 9.9, 3.6, 2.4)
    xs = (4.2, 10.8) if n == 2 else (3.2, 7.5, 11.8)
    for x in xs:
        bx = 7.5 + (x - 7.5) * 0.55
        g.line(bx, 9.2, x, 4.0)
        g.line(bx + 0.8, 9.2, x + 0.8, 4.0)
        g.ell(x + 0.4, 3.0, 1.5, 1.5)
        g.set(x + 0.4, 3.0, 0)
    _eyes(g, (7.5, 11.5))
    return g

def _shell(k=1.0, big=4.0):
    g = _G(k)
    g.ell(8.0, 13.6, 6.6, 1.6)                      # foot
    g.ell(12.4, 10.8, 2.0, 2.8)                      # head
    g.line(12.0, 8.4, 11.2, 5.6); g.line(13.2, 8.4, 13.9, 5.6)  # eye stalks
    g.set(11.0, 5.0); g.set(14.0, 5.0)
    g.ell(5.4, 8.6, big + 0.6, big + 0.4)           # shell
    for (x, y) in ((5.4, 8.6), (6.4, 8.6), (6.4, 7.4), (4.6, 7.2), (4.2, 8.8), (5.4, 10.2)): g.set(x, y, 0)  # spiral
    g.set(5.4, 8.6)
    _eyes(g, (12.8, 10.2))
    return g

def _jelly(k=1.0, wide=0.0, strands=5):
    g = _G(k)
    g.ell(7.5, 6.6, 5.4 + wide, 4.4)
    for y in range(16):
        for x in range(16):
            if y >= 8.9 and g.p[y][x]: g.p[y][x] = 0
    xs = (3.0, 5.2, 7.5, 9.8, 12.0)[:strands] if strands == 5 else (4.0, 7.5, 11.0)
    for i, x in enumerate(xs):
        for y in range(9, 15 if i % 2 == 0 else 13): g.set(x + (0.6 if y % 2 else 0), y)
    g.set(2.5, 9); g.set(12.5, 9)
    _eyes(g, (6, 6.2), (9.2, 6.2))
    return g

def _ghost(k=1.0, tail=True):
    g = _G(k)
    g.ell(7.5, 6.4, 4.6, 4.3)
    for y in range(6, 15):
        for x in range(3, 13): g.set(x, y)
    for x in (4, 7, 10):                              # scalloped skirt
        g.set(x, 14, 0); g.set(x, 15, 0)
    for x in (3, 6, 9, 12): g.set(x, 15)
    if tail:
        g.line(12.5, 11, 14, 9.5); g.set(14.5, 8.0); g.set(14, 8.6)
    _eyes(g, (5.8, 7.2), (9.3, 7.2), (7.5, 9.6))
    return g

def _gel(k=1.0):
    """flan / jelly mould: trapezoid on a plate"""
    g = _G(k)
    for y in range(5, 15):
        hw = 3.0 + (y - 5) * 0.3
        for x in range(16):
            if abs(x - 7.5) <= hw: g.set(x, y)
    g.ell(7.5, 5.4, 3.2, 1.3)
    for x in range(1, 15): g.set(x, 15)
    for x in range(2, 14): g.set(x, 14)
    g.set(4.6, 13.9, 0); g.set(10.4, 13.9, 0)
    _eyes(g, (6, 9), (9, 9))
    return g

def _mimic(k=1.0):
    g = _G(k)
    for y in range(9, 15):
        for x in range(2, 14): g.set(x, y)
    for y in range(3, 8):
        for x in range(2, 14):
            if not (y == 3 and x in (2, 13)): g.set(x, y)
    for x in range(2, 14):                           # jagged mouth gap
        g.set(x, 8, 1 if x % 2 == 0 else 0)
    for x in (3, 4, 11, 12): g.set(x, 15)
    for y in range(10, 14): g.set(7.5, y, 0)         # hasp slit
    _eyes(g, (5, 5), (10, 5))
    return g

def _lump(k=1.0, big=0.0):
    g = _G(k)
    g.ell(7.5, 12.8, 6.6 + big, 2.3)
    g.ell(4.3, 10.6, 2.4, 2.2); g.ell(8.4, 9.6, 3.0, 2.8); g.ell(12.0, 11.0, 2.2, 1.9)
    g.set(2.0, 14); g.set(13.4, 14.4)
    _eyes(g, (7.0, 9.8), (9.8, 8.8))
    return g

def _melt(k=1.0, big=0.0):
    g = _G(k)
    g.ell(7.5, 5.4, 5.0 + big, 3.5)
    for (x, y1) in ((4, 12), (7, 14), (10.5, 9)):
        for y in range(6, y1 + 1):
            g.set(x, y)
            if y < y1 - 1: g.set(x + 1, y)
    g.set(11, 12)                                      # a falling drop
    g.ell(7.5, 14.3, 5.8, 0.9)
    _eyes(g, (6, 5.4), (9.4, 5.4))
    return g

def _puddle(k=1.0):
    g = _G(k)
    g.ell(7.5, 13.6, 7.0, 1.7); g.ell(5.6, 11.4, 3.2, 2.4); g.ell(11.4, 12.2, 2.2, 1.6)
    g.set(0, 15); g.set(15, 14.5)
    _eyes(g, (4.8, 11.2), (7.0, 11.2))
    return g

SIZES = {1: 0.66, 2: 0.74, 3: 0.86, 4: 1.0, 5: 1.0}

def _build(fn, hd, eye, body, **kw):
    by = {}
    for stage, k in SIZES.items():
        g = fn(k=k, **kw)
        hx, hy = _T(k, hd[0], hd[1]); ex, ey = _T(k, eye[0], eye[1])
        g._raw(ex, ey, 0)
        by[stage] = dict(rows=g.rows(), head=(hx, hy, max(1.6, hd[2] * k)), eye=(round(ex), round(ey)),
                         body=(_T(k, body[0], 0)[0], _T(k, body[1], 0)[0]))
    return dict(by_stage=by)

ARCH_SLIME = {
 'slime_bead':   _build(_bead, (7.5, 9.0, 2.6), (6, 11), (3, 12)),
 'slime_dollop': _build(_dollop, (7.5, 8.2, 2.2), (6.2, 10.6), (3, 12)),
 'slime_drop':   _build(_drop, (7.5, 5.0, 2.6), (6, 10), (3, 12)),
 'slime_blob':   _build(_drop, (7.5, 5.0, 2.6), (6, 10), (2, 13), wide=1.2),
 'slime_tall':   _build(_tall, (7.5, 4.8, 2.3), (6.3, 8.2), (4, 11)),
 'slime_twin':   _build(_twin, (5.2, 8.0, 3.0), (4.2, 9.5), (1, 10)),
 'slime_twin2':  _build(_twin, (5.2, 8.0, 3.0), (4.2, 9.5), (1, 10), small=1.35),
 'slime_cap':    _build(_cap, (7.5, 5.6, 3.6), (6.3, 12), (3, 12)),
 'slime_capfat': _build(_cap, (7.5, 5.6, 4.0), (6.3, 12), (2, 13), w=6.9, h=4.2, stem=2.8),
 'slime_morel':  _build(_morel, (7.5, 4.4, 3.0), (6.4, 12), (4, 11)),
 'slime_stalk':  _build(_stalk, (7.5, 9.5, 3.0), (7.5, 11.5), (3, 12)),
 'slime_stalk3': _build(_stalk, (7.5, 9.5, 3.0), (7.5, 11.5), (3, 12), n=3),
 'slime_shell':  _build(_shell, (12.4, 10.8, 2.0), (12.8, 10.2), (2, 11)),
 'slime_jelly':  _build(_jelly, (7.5, 6.0, 3.8), (6, 6.2), (3, 12)),
 'slime_bell':   _build(_jelly, (7.5, 6.0, 4.2), (6, 6.2), (2, 13), wide=0.9),
 'slime_ghost':  _build(_ghost, (7.5, 6.4, 3.4), (5.8, 7.2), (3, 12)),
 'slime_gel':    _build(_gel, (7.5, 8.0, 3.0), (6, 9), (3, 12)),
 'slime_mimic':  _build(_mimic, (7.5, 5.0, 4.0), (5, 5), (2, 13)),
 'slime_lump':   _build(_lump, (8.4, 9.0, 2.8), (7.0, 9.8), (2, 13)),
 'slime_lump2':  _build(_lump, (8.4, 9.0, 2.8), (7.0, 9.8), (1, 14), big=1.0),
 'slime_melt2':  _build(_melt, (7.5, 5.0, 3.5), (6, 5.4), (2, 13), big=1.3),
 'slime_melt':   _build(_melt, (7.5, 5.0, 3.5), (6, 5.4), (3, 12)),
 'slime_puddle': _build(_puddle, (5.6, 11.0, 2.2), (5, 11.6), (1, 13)),
}
spritegen.register_archetypes(ARCH_SLIME)

# ---- decorations -------------------------------------------------------------------------
def _bb(g):
    pts = [(x, y) for y in range(16) for x in range(16) if g.get(x, y)]
    if not pts: return 0, 0, 15, 15
    xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
    return min(xs), min(ys), max(xs), max(ys)

def _inner(g, x, y):
    return g.get(x, y) and g.get(x - 1, y) and g.get(x + 1, y) and g.get(x, y - 1) and g.get(x, y + 1)

def _top(g, x):
    for y in range(16):
        if g.get(x, y): return y
    return None

def slime_shine(g, c):
    """glossy highlight: a hole high on the left of the body"""
    x0, y0, x1, y1 = _bb(g); cx = (x0 + x1) // 2
    for (x, y) in ((cx - 2, y0 + 2), (cx - 2, y0 + 3), (cx - 3, y0 + 3)):
        if _inner(g, x, y): g.set(x, y, 0); return

def slime_bubbles(g, c):
    """bubbles: two inside the body, one rising above"""
    x0, y0, x1, y1 = _bb(g)
    for (x, y) in ((x1 - 3, y1 - 2), (x0 + 3, y1 - 3)):
        if _inner(g, x, y): g.set(x, y, 0)
    cx = (x0 + x1) // 2
    if y0 >= 3:
        g.set(cx + 3, y0 - 2)
        if y0 >= 5: g.set(cx + 4, y0 - 4)

def slime_core(g, c):
    """a glowing core: ring with a dot, low in the body"""
    x0, y0, x1, y1 = _bb(g); cx = (x0 + x1) // 2; cy = y1 - 3 if y1 - y0 > 7 else y1 - 2
    if not all(g.get(cx + dx, cy + dy) for dx in (-2, 2) for dy in (-1, 1)): return
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1): g.set(cx + dx, cy + dy, 0)
    g.set(cx, cy, 1)

def slime_layer(g, c):
    """layered gel: dashed seam across the lower body"""
    x0, y0, x1, y1 = _bb(g); y = y0 + int((y1 - y0) * 0.62)
    for x in range(x0 + 1, x1, 2):
        if _inner(g, x, y): g.set(x, y, 0)

def slime_cherry(g, c):
    x0, y0, x1, y1 = _bb(g); cx = (x0 + x1) // 2
    if y0 < 3: return
    for (dx, dy) in ((0, 1), (1, 1), (0, 2), (1, 2)): g.set(cx + dx, y0 - dy)
    if y0 >= 4: g.set(cx + 1, y0 - 3)

def slime_dots(g, c):
    """spore dots carved into the cap"""
    x0, y0, x1, y1 = _bb(g); cx = (x0 + x1) // 2
    for (dx, dy) in ((-3, 2), (1, 1), (3, 3), (-1, 3)):
        if _inner(g, cx + dx, y0 + dy): g.set(cx + dx, y0 + dy, 0)

def slime_spores(g, c):
    x0, y0, x1, y1 = _bb(g); cx = (x0 + x1) // 2
    for (dx, dy) in ((-4, 2), (2, 3), (5, 1)):
        if y0 - dy >= 0: g.set(cx + dx, y0 - dy)

def slime_moss(g, c):
    """a tuft of moss on top"""
    x0, y0, x1, y1 = _bb(g); cx = (x0 + x1) // 2
    if y0 < 2: return
    for dx in (-1, 0, 1): g.set(cx + dx, y0 - 1)
    g.set(cx - 1, y0 - 2); g.set(cx + 1, y0 - 2)

def slime_drip(g, c):
    """a streak running down the left side"""
    x0, y0, x1, y1 = _bb(g)
    for y in range(y1 - 4, y1 - 1):
        if x0 - 1 >= 0 and g.get(x0, y): g.set(x0 - 1, y)

def slime_crack(g, c):
    x0, y0, x1, y1 = _bb(g); cx = (x0 + x1) // 2
    for (dx, dy) in ((1, 2), (2, 3), (1, 4), (2, 5)):
        if _inner(g, cx + dx, y0 + dy): g.set(cx + dx, y0 + dy, 0)

def slime_tongue(g, c):
    x0, y0, x1, y1 = _bb(g)
    if x1 > 13: return
    y = y1 - 3
    g.set(x1 + 1, y); g.set(x1 + 2, y + 1); g.set(x1 + 2, y + 2)

def slime_spark(g, c):
    x0, y0, x1, y1 = _bb(g); x, y = max(1, x0 - 1), max(1, y0)
    if x0 >= 3: x = x0 - 2
    for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)):
        if 0 <= y + dy and not g.get(x + dx, y + dy): g.set(x + dx, y + dy)

def slime_moon(g, c):
    x0, y0, x1, y1 = _bb(g); cx, cy = x0 - 1, max(2, y0 + 1)
    if cx < 2: cx, cy = x1 + 1, max(2, y0)
    g.ellipse(cx, cy, 2.0, 2.0); g.ellipse(cx + 1.2, cy - 0.3, 1.7, 1.7, 0)

def slime_fangs(g, c):
    x, y = c['ex'] - 1, c['ey'] + 3
    for dx in (0, 2): g.set(x + dx, y, 0)

def slime_lumps(g, c):
    x0, y0, x1, y1 = _bb(g)
    for x in (x0 + 1, x1 - 2):
        t = _top(g, x)
        if t is not None and t > 0 and not g.get(x, t - 1): g.set(x, t - 1)

spritegen.EXTRA_HANDLERS.update({
 'slime_shine': slime_shine, 'slime_bubbles': slime_bubbles, 'slime_core': slime_core, 'slime_layer': slime_layer,
 'slime_cherry': slime_cherry, 'slime_dots': slime_dots, 'slime_spores': slime_spores, 'slime_moss': slime_moss,
 'slime_drip': slime_drip, 'slime_crack': slime_crack, 'slime_tongue': slime_tongue, 'slime_spark': slime_spark,
 'slime_moon': slime_moon, 'slime_fangs': slime_fangs, 'slime_lumps': slime_lumps,
})
