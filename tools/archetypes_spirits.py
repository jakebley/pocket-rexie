"""Halo-and-horn spirit archetypes (16x16, facing right, ground on row 15), built from parts and natively at every
stage size. Bodies are round chibi creatures; the angel/devil read comes from decorations (halo, horns, wings, tail,
trident toy) and from the base on the ground line (feet, cloud puffs or ember flames).
Registers EXTRA_HANDLERS with the `spirits_` prefix."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from archetypes_fox import _G, SIZES, _T
import spritegen

def _spirit(k=1.0, base='feet', tail=None, hw=3.4, hh=3.0, bw=2.6, bh=2.1, hy=8.0):
    """Big round head over a small body, so the head, halo and horns carry the silhouette."""
    u = k ** -0.7                      # small stages get proportionally chunkier (babies are mostly head)
    hw, bw, hh, bh = hw * u, bw * u, hh * u ** 0.8, bh * u ** 0.8
    g = _G(k); g.hh = hh
    if base == 'cloud':
        g.ell(7.8, 12.0, bw, bh)
        g.ell(4.6, 13.6, 2.5, 1.8); g.ell(8.0, 13.2, 3.0, 2.2); g.ell(11.4, 13.6, 2.5, 1.8)
    elif base == 'ember':
        g.ell(7.8, 12.8, bw, bh)
        g.ell(7.8, 14.6, 5.4, 0.9)
        for x, h in ((2.6, 11.4), (4.4, 12.6), (11.2, 12.6), (13.0, 11.4)):  # flame tongues around the base
            g.tri(x - 1.0, 14.8, x, h, x + 1.0, 14.8, min_h=2)
    else:
        g.ell(7.8, 12.7, bw, bh)
        for x in (6.0, 7.0, 9.0, 10.0): g.set(x, 15)
        g.set(6, 14); g.set(9, 14)
    g.ell(8.8, hy, hw, hh)
    if tail:  # pointed devil tail running along the ground then curling up
        g.line(5.2, 13.6, 2.5, 14.2); g.line(2.5, 14.2, 1.3, 12.4)
        if tail == 'spade':
            g.tri(0.0, 12.4, 1.2, 10.2, 2.4, 12.6, min_h=2)
        else:
            g.set(1.0, 11.4)
    return g

def _build(fn, head, eye, body, **kw):
    by = {}
    for stage, k in SIZES.items():
        g = fn(k=k, **kw)
        hx, hy = _T(k, head[0], head[1]); ex, ey = _T(k, eye[0], eye[1])
        g._raw(ex, ey, 0)
        by[stage] = dict(rows=g.rows(), head=(hx, hy, max(1.6, g.hh * k)), eye=(round(ex), round(ey)),
                         body=(_T(k, body[0], 0)[0], _T(k, body[1], 0)[0]))
    return dict(by_stage=by)

H = (8.8, 8.0, 3.0); E = (10.2, 7.8); B = (4.5, 11.5)
ARCH = {
 'spr_feet':   _build(_spirit, H, E, B),                                         # plain round cherub with feet
 'spr_imp':    _build(_spirit, H, E, B, tail='spade'),                            # round imp with a spade tail
 'spr_cloud':  _build(_spirit, H, E, B, base='cloud'),                            # sits on a cloud
 'spr_ember':  _build(_spirit, H, E, B, base='ember', tail='spade'),              # stands in ember flames
 'spr_emberb': _build(_spirit, H, E, B, base='ember'),                            # ember base, no tail (baby)
 'spr_big':    _build(_spirit, H, E, B, tail='spade', hw=3.7, hh=3.2, bw=2.9, bh=2.3),   # broad adult imp
 'spr_bigfeet':_build(_spirit, H, E, B, hw=3.7, hh=3.2, bw=2.9, bh=2.3),
 'spr_bigcloud':_build(_spirit, H, E, B, base='cloud', hw=3.7, hh=3.2, bw=2.9, bh=2.3),
 'spr_bigember':_build(_spirit, H, E, B, base='ember', tail='spade', hw=3.7, hh=3.2, bw=2.9, bh=2.3),
 'spr_chub':   _build(_spirit, H, E, B, tail='spade', hw=3.7, hh=3.1, bw=4.5, bh=2.5),  # well-fed
 'spr_chubfeet':_build(_spirit, H, E, B, hw=3.7, hh=3.1, bw=4.5, bh=2.5),
}
spritegen.register_archetypes(ARCH)

# ---- decorations ----------------------------------------------------------------------------------
def _hline(g, y, x0, x1):
    for x in range(int(round(x0)), int(round(x1)) + 1): g.set(x, y)

def halo(g, c):
    """Floating ring (5x3) with a one-row gap above the head."""
    hx, top = round(c['hx']), round(c['hy'] - c['hr'] - 4)
    _hline(g, top, hx - 1, hx + 1); _hline(g, top + 2, hx - 1, hx + 1)
    g.set(hx - 2, top + 1); g.set(hx + 2, top + 1)

def halo_crook(g, c):
    """Dim, bent halo for the neglect line: shifted, with a gap in the ring."""
    hx, top = round(c['hx']) + 1, round(c['hy'] - c['hr'] - 3)
    _hline(g, top, hx - 1, hx + 1); g.set(hx - 2, top + 1); g.set(hx + 2, top + 1); g.set(hx - 1, top + 2)

def halo_side(g, c):
    """Halo pushed to the right, leaving room for one horn on the left."""
    hx, top = round(c['hx']) + 2, round(c['hy'] - c['hr'] - 4)
    _hline(g, top, hx - 1, hx + 1); _hline(g, top + 2, hx - 1, hx + 1)
    g.set(hx - 2, top + 1); g.set(hx + 2, top + 1)

def halo_small(g, c):
    """Small 3x2 halo for babies and children."""
    hx, top = round(c['hx']), round(c['hy'] - c['hr'] - 3)
    _hline(g, top, hx - 1, hx + 1); g.set(hx - 2, top + 1); g.set(hx + 2, top + 1)

def _hornbase(c, dx):
    """y of the head's top edge at horizontal offset dx (head is a little wider than tall)."""
    t = min(0.95, abs(dx) / (c['hr'] * 1.25))
    return c['hy'] - c['hr'] * (1 - t * t) ** 0.5

def _horn(g, c, s, big=False):
    """A connected horn slanting outward from the crown (a diagonal band, so it reads as a horn, not an ear)."""
    x0 = c['hx'] + s * 1.0; b = _hornbase(c, 1.0) + 0.7
    pts = [(0, 0), (1, 0), (1, -1), (2, -1), (2, -2)] + ([(3, -2), (3, -3)] if big else [])
    for dx, dy in pts: g.set(x0 + s * dx, b + dy)

def horns(g, c):
    for s in (-1, 1): _horn(g, c, s)

def horn1(g, c): _horn(g, c, -1)

def bighorns(g, c):
    for s in (-1, 1): _horn(g, c, s, True)

def nubs(g, c):
    for s in (-1, 1):
        x0 = c['hx'] + s * 1.2; b = _hornbase(c, 1.2) + 0.6
        for dx, dy in ((0, 0), (1, 0), (1, -1)): g.set(x0 + s * dx, b + dy)

def _tri(g, tip, p0, p1):
    for i in range(7):
        t = i / 6; g.line(tip[0], tip[1], p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t)

def _root(c):
    return round(c['hx'] - c['hr'] * 1.3), round(c['hy'] + c['hr'] * 0.5)

def wings(g, c, big=False):
    """Feathered wing swept up behind the shoulder, two stacked wedges."""
    rx, ry = _root(c); s = max(3, round(c['hr'] * (1.4 if big else 1.0)))
    _tri(g, (rx - s, ry - round(s * 1.4)), (rx, ry - 1), (rx, ry + 2))
    _tri(g, (rx - s - 1, ry - round(s * 0.5)), (rx, ry + 1), (rx, ry + 3))

def wingfold(g, c):
    """Small folded wing: a short wedge on the shoulder."""
    rx, ry = _root(c)
    _tri(g, (rx - 2, ry - 2), (rx, ry), (rx, ry + 2))

def bigwings(g, c): wings(g, c, True)

def batwings(g, c):
    """Pointed wing with a scalloped lower edge."""
    rx, ry = _root(c); s = max(3, round(c['hr'] * 1.1))
    tip = (rx - s, ry - round(s * 1.5))
    _tri(g, tip, (rx, ry), (rx, ry + 2))
    g.line(rx, ry + 2, rx - s * 0.5, ry + 1); g.line(rx - s * 0.5, ry + 1, rx - s * 0.8, ry + 2.5)
    g.line(rx - s * 0.8, ry + 2.5, rx - s - 1, ry)

def trident(g, c):
    """A tiny toy trident held out in front."""
    x = min(15, round(c['hx'] + c['hr'] + 1.6)); top = round(c['hy'] + c['hr'] * 0.9)
    for y in range(top, 16): g.set(x, y)
    g.set(x - 1, top - 1); g.set(x + 1, top - 1); g.set(x, top - 2)
    g.set(x - 1, top); g.set(x + 1, top)

def sparkles(g, c):
    """Stardust twinkles floating near the halo."""
    x, y = round(c['hx'] + c['hr'] + 1), round(c['hy'] - c['hr'] - 1)
    g.set(x, y); g.set(x - 1, y); g.set(x + 1, y); g.set(x, y - 1); g.set(x, y + 1)

for n, f in dict(halo=halo, halo_crook=halo_crook, halo_small=halo, halo_side=halo_side, nubs=nubs, horns=horns, horn1=horn1,
                 bighorns=bighorns, wings=wings, wingfold=wingfold, bigwings=bigwings, batwings=batwings,
                 trident=trident, sparkles=sparkles).items():
    spritegen.EXTRA_HANDLERS['spirits_' + n] = f
