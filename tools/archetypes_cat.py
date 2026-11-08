"""Cat archetypes (16x16, facing right, ground on row 15), built from parts so ears, tail and head can be tuned.
A cat is read from: a round head with TWO SHORT WIDE triangle ears, no snout, and a SLENDER curved tail (1 px, never a plume).
Built natively at each stage size (no averaging). Also registers the cat_* decorations."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from archetypes_fox import _G, W, _T
import spritegen

def _tail(g, pts, thick=False):
    for (a, b) in zip(pts, pts[1:]):
        g.line(a[0], a[1], b[0], b[1])
        if thick: g.line(a[0] + 0.7, a[1], b[0] + 0.7, b[1])

def _ears(g, hx, hy, hr, h=2.6, w=1.0):
    """two short wide triangles sitting on the head; tips at hx-1.4 and hx+1.4"""
    top = hy - hr * 0.8
    g.tri(hx - 2.5 * w, top + 1.0, hx - 1.4, top - h, hx - 0.1, top + 0.6, min_h=2)
    g.tri(hx + 0.1, top + 0.6, hx + 1.4, top - h, hx + 2.5 * w, top + 1.0, min_h=2)

def _stand(k=1.0, long=0.0, bob=False, head=2.6, tail_len=1.0, fluff=0.0, tall=0):
    g = _G(k)
    ly = 11 - tall  # leg top
    g.ell(7 - long * 0.4, 10 - tall * 0.4, 4.5 + long + fluff, 2.5 + fluff * 0.5)
    g.line(10, 8.5, 11.3, 7.2); g.line(10, 9.5, 11.6, 8.2)
    g.ell(12.2, 6.3, head, head * 0.92)
    _ears(g, 12.2, 6.3, head)
    if bob: g.line(2.4, 9.5, 1.6, 8.5)
    else:
        e = 2.4 - long * 0.5
        pts = [(e, 9.6), (e - 1.2, 8.4), (e - 1.6, 6.6 if tail_len > 0.9 else 7.4), (e - 0.8, 4.8 if tail_len > 0.9 else 6.0), (e + 0.6, 4.0 if tail_len > 0.9 else 5.4)]
        _tail(g, pts)
    for x in (4.6 - long * 0.6, 6.0 - long * 0.4, 9.0 + long * 0.3, 10.6 + long * 0.3):
        for y in range(int(ly), 15): g.set(x, y)
        g.set(x + 0.5, 15)
    return g

def _sit(k=1.0, head=2.7, chest=2.2, fluff=0.0, tail_up=True):
    g = _G(k)
    g.ell(6.0, 11.3, 3.6 + fluff, 3.6)
    g.ell(8.8, 9.3, chest + fluff * 0.5, 3.9)
    g.ell(9.9, 5.2, head, head * 0.92)
    _ears(g, 9.9, 5.2, head)
    if tail_up:
        _tail(g, [(2.8, 14.5), (1.4, 13.4), (0.8, 11.2), (1.2, 9.0), (2.4, 8.0), (3.4, 8.3)])
    else:
        _tail(g, [(2.8, 14.5), (1.0, 14.0), (0.6, 12.4)])
    g.line(10.2, 11, 10.2, 14.5)
    for x in range(3, 12): g.set(x, 15)
    return g

def _loaf(k=1.0, head=2.6, tail=True):
    g = _G(k)
    g.ell(6.8, 11.9, 6.0, 3.1)
    g.ell(11.4, 8.3, head, head * 0.92)
    _ears(g, 11.4, 8.3, head)
    if tail: _tail(g, [(1.4, 13.6), (0.6, 12.0), (1.0, 10.6)])
    for x in range(2, 14): g.set(x, 15)
    return g

def _kitten(k=1.0, big=3.6):
    g = _G(k)
    g.ell(6.4, 12.4, 3.6, 2.5)
    g.ell(8.8, 8.0, big, big * 0.9)
    _ears(g, 8.8, 8.0, big, h=2.4, w=1.2)
    _tail(g, [(2.8, 13.6), (1.6, 12.4), (1.4, 10.6), (2.2, 9.6)])
    for x in range(4, 12): g.set(x, 15)
    return g

# sizes: native per stage (babies a touch larger than the fox kits, cats are compact)
SIZES = {1: 0.74, 2: 0.72, 3: 0.86, 4: 1.0, 5: 1.0}

def _build(fn, hd, eye, body, **kw):
    by = {}
    for stage, k in SIZES.items():
        g = fn(k=k, **kw)
        hx, hy = _T(k, hd[0], hd[1]); ex, ey = _T(k, eye[0], eye[1])
        g._raw(ex, ey, 0)
        by[stage] = dict(rows=g.rows(), head=(hx, hy, max(1.6, hd[2] * k)), eye=(round(ex), round(ey)),
                         body=(_T(k, body[0], 0)[0], _T(k, body[1], 0)[0]))
    return dict(by_stage=by)

ARCH_CAT = {
 'cat_stand':  _build(_stand, (12.2, 6.3, 2.6), (13.2, 5.9), (3, 11)),
 'cat_lean':   _build(_stand, (12.2, 6.3, 2.4), (13.1, 5.9), (2, 11), long=1.0, head=2.4, tall=0.5),
 'cat_bob':    _build(_stand, (12.2, 6.3, 2.4), (13.1, 5.9), (3, 11), bob=True, head=2.4, long=0.4),
 'cat_sit':    _build(_sit, (9.9, 5.2, 2.7), (10.9, 4.9), (3, 11)),
 'cat_king':   _build(_sit, (9.9, 5.2, 2.5), (10.8, 4.9), (3, 12), head=2.5, chest=2.7, fluff=0.9),
 'cat_round':  _build(_sit, (9.9, 5.4, 2.8), (10.9, 5.1), (3, 12), head=2.8, chest=2.5, fluff=1.4),
 'cat_loaf':   _build(_loaf, (11.4, 8.3, 2.6), (12.4, 8.0), (2, 12)),
 'cat_kitten': _build(_kitten, (8.8, 8.0, 3.6), (10.2, 7.8), (3, 10)),
}
spritegen.register_archetypes(ARCH_CAT)

# ---- decorations -------------------------------------------------------------------------
def _right(g, y, x0):
    xs = [x for x in range(int(x0), 16) if g.get(x, y)]
    return max(xs) if xs else None

def _top(g, x):
    for y in range(16):
        if g.get(x, y): return y
    return None

def cat_whiskers(g, c):
    """two whisker ticks (a V) at the cheek; the middle pixel stays empty so the face does not grow a snout"""
    y = int(round(c['hy'] + 0.7)); x = _right(g, y, c['hx'])
    if x is None: return
    for dy in (-1, 1):
        if x + 1 < 16 and not g.get(x + 1, y + dy): g.set(x + 1, y + dy)

def cat_bell(g, c):
    """collar: a gap across the neck and a bell dot hanging below"""
    y = int(round(c['hy'] + c['hr'] + 0.2)); x = int(round(c['hx']))
    for dx in (-1, 0, 1): g.set(x + dx, y, 0)
    g.set(x, y + 1)

def cat_tufts(g, c):
    """lynx tufts: a pixel standing above each ear tip"""
    for dx in (-1.4, 1.4):
        x = int(round(c['hx'] + dx)); t = _top(g, x)
        if t is not None and t > 0: g.set(x, t - 1)
        if t is not None and t > 1 and dx > 0: pass

def cat_notch(g, c):
    """a torn ear: nick out of the right ear"""
    x = int(round(c['hx'] + 1.4)); t = _top(g, x)
    if t is not None: g.set(x, t, 0); g.set(x + 1, t + 1, 0)

def cat_tabby(g, c):
    """tabby marks: stripes down the back, gaps on the forehead"""
    for x in range(int(c['b0']) + 1, int(c['b1']), 2):
        t = _top(g, x)
        if t is not None and t > 6: g.set(x, t + 1, 0)
    g.set(c['hx'] - 0.5, c['hy'] - c['hr'] + 1, 0)

def cat_mane(g, c):
    """lion mane: a ring of fur around the head with a gap between it and the face"""
    hx, hy, hr = c['hx'], c['hy'], c['hr']
    rr = hr + 1.7
    g.ellipse(hx - 0.3, hy + 0.4, rr, rr * 0.95)
    g.ellipse(hx + 0.3, hy + 0.2, hr + 0.35, (hr + 0.35) * 0.92, 0)
    g.ellipse(hx + 0.3, hy + 0.2, hr - 0.4, (hr - 0.4) * 0.92)
    # ears poke out of the mane
    for dx in (-1.2, 1.5):
        g.set(hx + dx, hy - rr - 0.2)
    g.set(c['ex'], c['ey'], 0)

def cat_moon(g, c):
    """crescent moon over the head"""
    cx, cy = c['hx'] - c['hr'] - 2.4, max(2.2, c['hy'] - c['hr'])
    g.ellipse(cx, cy, 2.1, 2.1)
    g.ellipse(cx + 1.2, cy - 0.3, 1.8, 1.8, 0)

def cat_luckypaw(g, c):
    """one raised paw waving beside the head"""
    x = c['hx'] + c['hr'] + 0.6
    g.line(x - 1, c['hy'] + c['hr'] + 2.2, x, c['hy'] + 0.2)
    g.set(x, c['hy'] - 0.8); g.set(x + 1, c['hy'] - 0.8)

def cat_yarn(g, c):
    """a ball of yarn by the front paws"""
    y = 13.5; x = c['hx'] + c['hr'] + 0.3
    if x > 14: x = 14
    g.ellipse(x, y, 1.6, 1.6)
    g.set(x - 0.5, y - 0.5, 0); g.set(x + 0.5, y + 0.5, 0)

def cat_spark(g, c):
    """sparkle beside the head"""
    x, y = c['hx'] - c['hr'] - 2, max(1, c['hy'] - c['hr'])
    for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)): g.set(x + dx, y + dy)

def cat_ringtail(g, c):
    """banded tail tip"""
    xs = [x for y in range(16) for x in range(16) if g.get(x, y)]
    tx = min(xs); ys = [y for y in range(16) if g.get(tx, y)]
    if ys: g.set(tx, ys[0] + 1, 0)

spritegen.EXTRA_HANDLERS.update({
 'cat_whiskers': cat_whiskers, 'cat_bell': cat_bell, 'cat_tufts': cat_tufts, 'cat_notch': cat_notch,
 'cat_tabby': cat_tabby, 'cat_mane': cat_mane, 'cat_moon': cat_moon, 'cat_luckypaw': cat_luckypaw,
 'cat_yarn': cat_yarn, 'cat_spark': cat_spark, 'cat_ringtail': cat_ringtail,
})
