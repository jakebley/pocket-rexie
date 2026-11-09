"""Halo-and-horn spirit archetypes (16x16, facing right, ground on row 15), drawn natively at every stage size.
Round chibi bodies (the head, halo and horns carry the silhouette) on four bases: feet, cloud puffs, ember flames and a
flared bell robe. The angel/devil read comes from the decorations: a floating halo arc, curved horns, fan-of-feathers angel
wings versus pointed webbed bat wings, a spade tail, a toy trident.
Registers EXTRA_HANDLERS with the `spirits_` prefix. Decorations find the stage from `hr` (the archetype stores stage + 1
in its head radius) and find the crown of the head by scanning the drawn pixels."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from archetypes_fox import _G
import spritegen

# per stage head (cx, cy, rx, ry) and body (cx, cy, rx, ry); everything stands on row 15
GEO = {
 1: dict(h=(8.0, 10.6, 2.6, 2.3), b=(7.4, 13.6, 1.0, 1.0)),
 2: dict(h=(8.0, 9.6, 2.9, 2.5), b=(7.4, 13.2, 1.3, 1.3)),
 3: dict(h=(8.2, 8.8, 3.3, 2.8), b=(7.5, 12.9, 1.6, 1.5)),
 4: dict(h=(8.4, 8.2, 3.7, 3.1), b=(7.6, 12.8, 1.9, 1.6)),
 5: dict(h=(8.4, 8.2, 3.7, 3.1), b=(7.6, 12.8, 1.9, 1.6)),
}
# devil tail as (dx, dy) pixels from the body's back edge at ground level, per stage
TAIL = {
 1: [(0, 0), (-1, -1), (-1, -2)],
 2: [(0, 0), (-1, 0), (-2, -1), (-2, -2), (-1, -3)],
 3: [(0, 0), (-1, 0), (-2, -1), (-2, -2), (-3, -3), (-2, -3), (-3, -4)],
 4: [(0, 0), (-1, 0), (-2, -1), (-3, -2), (-3, -3), (-4, -4), (-3, -4), (-2, -4), (-3, -5)],
 5: [(0, 0), (-1, 0), (-2, -1), (-3, -2), (-3, -3), (-4, -4), (-3, -4), (-2, -4), (-3, -5)],
}

def _spirit(stage=4, base='feet', tail=False, brx=0.0, hrx=0.0, hry=0.0, bry=0.0, hdx=0.0, tall=0):
    G = GEO[stage]
    hx, hy, rx, ry = G['h']; bx, by, bw, bh = G['b']
    rx += hrx + 0.55; ry += hry + 0.45; bw += brx + 0.5; bh += bry + 0.4; hx += hdx
    if tall: by -= tall * 0.5; bh += tall * 0.5
    g = _G(1.0)
    R = g._raw
    bl = int(round(bx - bw))
    if base in ('cloud', 'ember'):
        top = int(hy + ry + 0.5)                                    # first row under the head
        W = ({1: 8, 2: 10, 3: 12, 4: 14, 5: 14} if base == 'cloud' else {1: 10, 2: 12, 3: 14, 4: 16, 5: 16})[stage] + (2 if brx > 0.5 and stage < 4 else 0)
        cx = 8
        x0, x1 = cx - W // 2, cx + W // 2 - 1
        if base == 'cloud':   # a pillow of puffs: two side domes, a flat full row, a rounded bottom
            for x in range(x0 + 1, x0 + 4): R(x, top)
            for x in range(x1 - 3, x1): R(x, top)
            for x in range(x0 + 4, x1 - 3): R(x, top)
            for y in range(top + 1, 15):
                for x in range(x0, x1 + 1): R(x, y)
            for x in range(x0 + 1, x1): R(x, 15)
            R(x0, 15, 0); R(x1, 15, 0)
            bl = x0 + 2
        else:                 # a coal mound under the head with flame tongues beside it, a gap between each
            m = 3 if stage >= 4 else 2
            ml, mr = cx - m, cx + m - 1
            for y in range(top, 16):
                for x in range(ml, mr + 1): R(x, y)
            for x in range(x0, x1 + 1): R(x, 15); R(x, 14)
            hgt = {1: 3, 2: 4, 3: 5, 4: 6, 5: 7}[stage]
            tongues = [(x0, hgt), (x1, hgt)]
            if x0 + 2 <= ml - 2: tongues += [(x0 + 2, hgt - 3)]
            if x1 - 2 >= mr + 2: tongues += [(x1 - 2, hgt - 3)]
            for x, h in tongues:
                for y in range(13, 13 - h, -1): R(x, y)
                if h >= 4: R(x + (1 if x < cx else -1), 13 - h + 1, 1); R(x + (1 if x < cx else -1), 13 - h, 1) if h >= 5 else None
            bl = x0 + 1
        g.ell(hx, hy, rx, ry)
        if tail:
            for dx, dy in TAIL[stage]: R(bl + dx, 14 + dy)
        return g
    elif base == 'robe':   # flared bell: narrow at the neck, wide at the hem, no feet
        g.ell(bx, by - 0.8, bw - 0.3, bh)
        for y in range(10, 16):
            half = bw - 0.3 + (y - 10) * 0.45
            for x in range(16):
                if abs(x - bx) <= half: R(x, y)
        bl = int(round(bx - bw - 1.0))
    else:
        g.ell(bx, by, bw, bh)
        fx = 1 if bw < 2.6 else 2
        for dx in (-fx, fx):
            R(bx + dx - 0.5 + (1 if dx > 0 else 0), 15); R(bx + dx - 0.5 + (1 if dx > 0 else 0), 14)
    g.ell(hx, hy, rx, ry)
    if tail:
        for dx, dy in TAIL[stage]: R(bl + dx, 14 + dy)
    return g

def _seal(g, keep=None):
    """Fill every enclosed gap except the eye: stray holes would be read (and filled) as extra eyes by the shader."""
    seen = set(); st = [(x, y) for x in range(16) for y in range(16) if (x in (0, 15) or y in (0, 15)) and not g.p[y][x]]
    while st:
        x, y = st.pop()
        if (x, y) in seen or not (0 <= x < 16 and 0 <= y < 16) or g.p[y][x]: continue
        seen.add((x, y)); st += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    if keep is None: return
    lim = keep[1] + 3          # the shader reads small holes up to ~2.5 rows below the topmost one as eyes; lower gaps stay open
    todo = {(x, y) for y in range(16) for x in range(16) if not g.p[y][x] and (x, y) not in seen and (x, y) != keep}
    while todo:
        comp = []; st = [todo.pop()]
        while st:
            c = st.pop(); comp.append(c)
            for d in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                n = (c[0] + d[0], c[1] + d[1])
                if n in todo: todo.discard(n); st.append(n)
        if min(y for _, y in comp) <= lim:
            for x, y in comp: g.p[y][x] = 1

def _build(base='feet', tail=False, **kw):
    by = {}
    for stage in GEO:
        g = _spirit(stage, base, tail, **kw)
        hx, hy, rx, ry = GEO[stage]['h']; hx += kw.get('hdx', 0.0)
        ex, ey = round(hx + rx * 0.5), round(hy - ry * 0.1)
        g._raw(ex, ey, 0)
        _seal(g, (ex, ey))
        bx, bw = GEO[stage]['b'][0], GEO[stage]['b'][2] + kw.get('brx', 0.0) + 0.5
        by[stage] = dict(rows=g.rows(), head=(hx, hy, stage + 1.0), eye=(ex, ey), body=(bx - bw, bx + bw))
    return dict(by_stage=by)

ARCH = {
 'spr_feet':    _build(),                                    # round cherub on two feet
 'spr_imp':     _build(tail=True),                           # round imp with a spade tail
 'spr_cloud':   _build('cloud'),                             # rises out of a cloud
 'spr_ember':   _build('ember', tail=True),                  # stands in ember flames
 'spr_emberb':  _build('ember'),
 'spr_big':     _build(tail=True),
 'spr_bigfeet': _build(),
 'spr_bigcloud':_build('cloud'),
 'spr_bigember':_build('ember', tail=True),
 'spr_chub':    _build(tail=True, brx=1.4, bry=0.3),         # well fed
 'spr_chubember': _build('ember', tail=True, brx=1.0, bry=0.3),
 'spr_imp2':    _build(tail=True, brx=0.8, hrx=0.4),
 'spr_tallimp': _build(tail=True, tall=1, hry=-0.2),
 'spr_robe':    _build('robe'),                              # flared bell robe
 'spr_tall':    _build(tall=1, hry=-0.2),                    # lean and upright
 'spr_brute':   _build(tail=True, hrx=0.6, hry=-0.3, brx=0.9),  # broad flat head, thick shoulders
}
spritegen.register_archetypes(ARCH)

# ---- helpers -----------------------------------------------------------------------------------------
def _stage(c): return int(round(c['hr'] - 1))

def _put(g, pts, ox, oy):
    for dx, dy in pts: g.set(ox + dx, oy + dy)

def _tri(g, a, b, c, v=1):
    def side(p, q, r): return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    for y in range(16):
        for x in range(16):
            d1, d2, d3 = side(a, b, (x, y)), side(b, c, (x, y)), side(c, a, (x, y))
            if not ((d1 < 0 or d2 < 0 or d3 < 0) and (d1 > 0 or d2 > 0 or d3 > 0)): g.p[y][x] = v

def _crown(g, x, hy):
    """Row of the topmost head pixel in column x (scanning up from the head centre)."""
    y = int(round(hy)) - 1
    if not g.get(x, y): return None
    while y > 0 and g.get(x, y - 1): y -= 1
    return y

def _stroke(g, x0, y0, x1, y1, w=2):
    """A thick line: a centre line plus a neighbour on the flatter axis."""
    g.line(x0, y0, x1, y1)
    if abs(x1 - x0) >= abs(y1 - y0): g.line(x0, y0 + 1, x1, y1 + 1) if w > 1 else None
    else: g.line(x0 + 1, y0, x1 + 1, y1) if w > 1 else None

# ---- halos ------------------------------------------------------------------------------------------
ARC = {1: ['.XX.'], 2: ['.XX.', 'X..X'], 3: ['.XX.', 'X..X'], 4: ['.XXX.', 'X...X'], 5: ['.XXX.', 'X...X']}

def _halo(g, c, dx=0):
    s = _stage(c); rows = ARC[s]; w = len(rows[0])
    hx = int(round(c['hx'])) + dx
    top = _crown(g, int(round(c['hx'])), c['hy'])
    y0 = top - 1 - len(rows)       # one clear row between halo and head
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch == 'X': g.set(hx - w // 2 + i, y0 + j)

def halo(g, c): _halo(g, c)
def halo_side(g, c): _halo(g, c, 2)

def halo_crook(g, c):
    """Dim, tilted halo for the neglect line: one end hangs low."""
    s = _stage(c); hx = int(round(c['hx'])) + 1
    top = _crown(g, int(round(c['hx'])), c['hy']); y0 = top - 4
    if s <= 2: pts = [(0, 0), (1, 0), (-1, 1), (2, 1)]
    else: pts = [(-1, 1), (0, 0), (1, 0), (2, 1), (-2, 2)]
    _put(g, pts, hx, y0)

# ---- horns ------------------------------------------------------------------------------------------
# (outward, up) pixels counted from the crown: a thick base that sweeps outward and then points up (a "(" curve)
HORN = {1: [(-1, 1), (0, 1)], 2: [(-1, 1), (0, 1), (0, 2)], 3: [(-1, 1), (0, 1), (0, 2), (1, 3)],
        4: [(-1, 1), (0, 1), (0, 2), (1, 2), (1, 3), (1, 4)], 5: [(-1, 1), (0, 1), (0, 2), (1, 2), (1, 3), (1, 4)]}
BIG = {3: [(-1, 1), (0, 1), (0, 2), (1, 2), (1, 3)],
       4: [(-1, 1), (0, 1), (0, 2), (1, 2), (1, 3), (2, 3), (2, 4), (1, 5)],
       5: [(-1, 1), (0, 1), (0, 2), (1, 2), (1, 3), (2, 3), (2, 4), (1, 5)]}

def _horn(g, c, s, big=False):
    st = _stage(c); d = {1: 2, 2: 2, 3: 2, 4: 2, 5: 2}[st]
    x = int(round(c['hx'])) + s * d
    top = _crown(g, x, c['hy'])
    if top is None: return
    pts = (BIG.get(st, HORN[st]) if big else HORN[st])
    for dx, dy in pts: g.set(x + s * dx, top - dy + 1)

def horns(g, c):
    for s in (-1, 1): _horn(g, c, s)
def horn1(g, c): _horn(g, c, -1)
def bighorns(g, c):
    for s in (-1, 1): _horn(g, c, s, True)

def nubs(g, c):
    for s in (-1, 1):
        x = int(round(c['hx'])) + s * 2; top = _crown(g, x, c['hy'])
        if top is not None:
            g.set(x, top); g.set(x - s, top); g.set(x, top - 1)

def ramhorns(g, c):
    """Heavy curled ram horns that sweep out and down past the cheeks."""
    st = _stage(c); hx = int(round(c['hx']))
    for s in (-1, 1):
        x = hx + s * 2; top = _crown(g, x, c['hy'])
        if top is None: continue
        pts = [(0, 1), (1, 2), (2, 2), (3, 1), (3, 0)] if st >= 4 else [(0, 1), (1, 1), (2, 0)]
        for dx, dy in pts: g.set(x + s * dx, top - dy)

# ---- wings ------------------------------------------------------------------------------------------
def _root(c):
    st = _stage(c)
    return (4.0, 11.0) if st >= 4 else ((4.3, 10.6) if st == 3 else (4.6, 10.8))

def _feather(g, x0, y0, ang, length, wid, v=1):
    """A filled leaf from (x0, y0) at angle ang (degrees, 0 = right, -90 = up), tapering to a rounded tip."""
    import math
    ca, sa = math.cos(math.radians(ang)), math.sin(math.radians(ang))
    cx, cy = x0 + ca * length / 2, y0 + sa * length / 2
    for y in range(16):
        for x in range(16):
            u = (x - cx) * ca + (y - cy) * sa; w = -(x - cx) * sa + (y - cy) * ca
            if (u / (length / 2 + 0.3)) ** 2 + (w / wid) ** 2 <= 1.0: g.p[y][x] = v

def wings(g, c, scale=1.0, ragged=False):
    """Angel wing: a fan of three leaf-shaped feathers with gaps between their tips, swept up behind the shoulder."""
    st = _stage(c); rx, ry = _root(c)
    k = {3: 0.62, 4: 0.95, 5: 1.2}[st] * scale
    wid = 0.85 if st == 3 else 1.0
    spec = [(-100, 7.8 * k), (-142, 7.4 * k), (-186, 6.2 * k)]
    for i, (ang, ln) in enumerate(spec):
        if ragged and i == 1: ln *= 0.55
        _feather(g, rx + 0.3 - i * 0.2, ry + i * 1.0, ang, ln, wid)
    if ragged:
        g.set(rx - 4.5 * k, ry - 3.2 * k, 0)

def wingfold(g, c): wings(g, c, 0.8)
def bigwings(g, c): wings(g, c, 1.25)
def tornwings(g, c): wings(g, c, 1.0, True)

def batwings(g, c, ragged=False):
    """Bat wing: a tall pointed arm and finger spokes joined by webbing with deeply scalloped lower edge."""
    st = _stage(c); rx, ry = _root(c)
    k = {3: 0.72, 4: 1.0, 5: 1.2}[st]
    R = (rx + 0.5, ry + 0.5); W = (rx - 1.8 * k, ry - 7.6 * k)
    f = [(rx - 4.2 * k, ry - 5.0 * k), (rx - 4.4 * k, ry - 1.8 * k), (rx - 3.0 * k, ry + 1.2 * k)]
    _tri(g, R, W, f[0]); _tri(g, R, f[0], f[1]); _tri(g, R, f[1], f[2])
    for a, b in zip(f, f[1:] + [R]):
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        nx, ny = mx + (R[0] - mx) * 0.5, my + (R[1] - my) * 0.5
        _tri(g, a, b, (nx, ny), 0)
    if ragged:
        g.set(f[1][0] + 1, f[1][1], 0); g.set(f[0][0] + 1, f[0][1] + 1, 0)

def tornbat(g, c): batwings(g, c, True)

# ---- props ------------------------------------------------------------------------------------------
def trident(g, c):
    """A toy trident held out in front: three tines, a cross-bar and a shaft."""
    st = _stage(c); x = 14 if st >= 4 else 13
    top = {1: 10, 2: 9, 3: 8, 4: 7, 5: 7}[st]
    g.set(x - 1, top); g.set(x + 1, top)
    g.set(x - 1, top + 1); g.set(x, top + 1); g.set(x + 1, top + 1)
    for y in range(top + 2, 16): g.set(x, y)

def sparkles(g, c):
    """A twinkling star: a plus shape, kept connected so it never reads as stray dots."""
    st = _stage(c); x = 13 if st >= 4 else 12; y = {3: 3, 4: 2, 5: 1}[st] + 1
    for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)): g.set(x + dx, y + dy)
    if st == 5:
        for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)): g.set(2 + dx, 4 + dy)

def crown(g, c):
    st = _stage(c); hx = int(round(c['hx'])); top = _crown(g, hx, c['hy'])
    for dx in range(-2, 3): g.set(hx + dx, top - 1)
    for dx in (-2, 0, 2): g.set(hx + dx, top - 2)

def cap(g, c):
    """Jester cap: two floppy points with a bell."""
    hx = int(round(c['hx'])); top = _crown(g, hx, c['hy'])
    for dx in range(-2, 3): g.set(hx + dx, top - 1)
    for dx, dy in ((-3, 2), (-3, 3), (-2, 2), (2, 2), (3, 3), (3, 4), (3, 2)): g.set(hx + dx, top - dy + 1)

def torn(g, c):
    """Tatters: a few notches bitten out of the lower edge."""
    for x in (4, 7, 10):
        for y in range(15, 8, -1):
            if g.get(x, y) and not g.get(x, y + 1) if y < 15 else g.get(x, y):
                g.set(x, y, 0); break

def _sealed(f):
    def run(g, c):
        f(g, c); _seal(g, (int(round(c['ex'])), int(round(c['ey']))))
    return run

for n, f in dict(halo=halo, halo_crook=halo_crook, halo_small=halo, halo_side=halo_side, nubs=nubs, horns=horns, horn1=horn1,
                 bighorns=bighorns, ramhorns=ramhorns, wings=wings, wingfold=wingfold, bigwings=bigwings, tornwings=tornwings,
                 batwings=batwings, tornbat=tornbat, trident=trident, sparkles=sparkles, crown=crown, cap=cap, torn=torn).items():
    spritegen.EXTRA_HANDLERS['spirits_' + n] = _sealed(f)
