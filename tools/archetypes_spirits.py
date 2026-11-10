"""Halo-and-horn spirit archetypes (16x16, ground on row 15), drawn natively at every stage size.
A round chibi head (three-quarter view, eye on the right) on one of four bases: feet, a bumpy cloud, a flame skirt or a
flared bell robe. Alignment reads from the decorations: a halo ring, two curved horns, feathered angel wings spread to both
sides versus pointed bat wings with webbing, a spade tail, a toy trident.
Registers EXTRA_HANDLERS with the `spirits_` prefix. Decorations find the stage from `hr` (the archetype stores stage + 1 in
its head radius) and find the head by scanning the drawn pixels."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from archetypes_fox import _G
import spritegen

# per stage head (cx, cy, rx, ry) and body (cx, cy, rx, ry); symmetric about x = 7.5
GEO = {
 1: dict(h=(7.5, 10.6, 2.6, 2.3), b=(7.5, 13.6, 1.0, 1.0)),
 2: dict(h=(7.5, 9.6, 2.9, 2.5), b=(7.5, 13.2, 1.3, 1.3)),
 3: dict(h=(7.5, 8.8, 3.3, 2.8), b=(7.5, 12.9, 1.6, 1.5)),
 4: dict(h=(7.5, 8.2, 3.7, 3.1), b=(7.5, 12.8, 1.9, 1.6)),
 5: dict(h=(7.5, 8.2, 3.7, 3.1), b=(7.5, 12.8, 1.9, 1.6)),
}
# spade tail (x, y) from the left foot: out along the ground, up, and an arrow head; kept below the wings
TAIL = {
 1: [(5, 14), (4, 14), (3, 13), (3, 12)],
 2: [(5, 14), (4, 14), (3, 13), (3, 12), (3, 11)],
 3: [(5, 14), (4, 14), (3, 14), (2, 13), (2, 12), (2, 11), (1, 11), (3, 11), (2, 10)],
 4: [(5, 14), (4, 14), (3, 14), (2, 13), (1, 12), (1, 11), (0, 11), (2, 11), (1, 10)],
 5: [(5, 14), (4, 14), (3, 14), (2, 13), (1, 12), (1, 11), (0, 11), (2, 11), (1, 10)],
}

def _spirit(stage=4, base='feet', tail=False, brx=0.0, hrx=0.0, hry=0.0, bry=0.0, tall=0):
    hx, hy, rx, ry = GEO[stage]['h']; bx, by, bw, bh = GEO[stage]['b']
    rx += hrx + 0.55; ry += hry + 0.45; bw += brx + 0.5; bh += bry + 0.4
    if tall: by -= tall * 0.5; bh += tall * 0.5
    g = _G(1.0); R = g._raw
    top = int(hy + ry + 0.4)                    # first row under the head
    if base in ('cloud', 'ember'):
        W = ({1: 10, 2: 12, 3: 14, 4: 14, 5: 14} if base == 'cloud' else {1: 10, 2: 12, 3: 14, 4: 16, 5: 16})[stage]
        x0 = 8 - W // 2; x1 = x0 + W - 1
        if base == 'cloud':   # three puffs along the top with a notch between each, a flat full middle, a rounded bottom
            bwd = 3 if stage >= 2 else 2
            for x in list(range(x0 + 1, x0 + 1 + bwd)) + list(range(x1 - bwd, x1)) + list(range(6, 10)): R(x, top)
            if stage >= 3:
                for x in range(x0 + 2, x0 + bwd + 1): R(x, top - 1)
                for x in range(x1 - bwd + 1, x1 - 1): R(x, top - 1)
            for y in range(top + 1, 15):
                for x in range(x0, x1 + 1): R(x, y)
            for x in range(x0 + 1, x1): R(x, 15)
        else:                 # a flame skirt: solid base and a comb of tongues of different heights, tall at the edges
            for x in range(x0, x1 + 1): R(x, 15); R(x, 14)
            n = (W - 1) // 3
            hs = {1: [3, 2, 3], 2: [4, 2, 2, 4], 3: [5, 3, 2, 3, 5], 4: [6, 3, 2, 2, 3, 6]}.get(stage, [6, 3, 2, 2, 3, 6])
            n = len(hs); sp = (W - 2) / max(1, n - 1) if n > 1 else 0
            for i, h in enumerate(hs):
                x = x0 + int(round(i * (W - 2) / (n - 1)))
                for y in (13, 12): R(x, y); R(x + 1, y)                # a two-pixel base ...
                for k, y in enumerate(range(11, 13 - h, -1)): R(x + (1 if (i + k) % 2 == 0 else 0), y)   # ... and a swaying one-pixel tip
        g.ell(hx, hy, rx, ry)
        return g
    if base == 'robe':   # flared bell: narrow at the neck, wide at the hem, no feet
        g.ell(bx, by - 0.8, bw - 0.3, bh)
        for y in range(10, 16):
            half = bw - 0.3 + (y - 10) * 0.45
            for x in range(16):
                if abs(x - bx) <= half: R(x, y)
        bl = int(round(bx - bw - 1.0))
    else:
        g.ell(bx, by, bw, bh)
        fx = 1 if bw < 2.6 else 2
        R(bx - fx - 0.5, 15); R(bx - fx - 0.5, 14); R(bx + fx + 0.5, 15); R(bx + fx + 0.5, 14)
    g.ell(hx, hy, rx, ry)
    if tail:
        for x, y in TAIL[stage]: R(x, y)
    return g

def _seal(g, keep=None):
    """Fill enclosed gaps near the eye: the shader reads small holes up to ~2.5 rows below the topmost one as eyes."""
    seen = set(); st = [(x, y) for x in range(16) for y in range(16) if (x in (0, 15) or y in (0, 15)) and not g.p[y][x]]
    while st:
        x, y = st.pop()
        if (x, y) in seen or not (0 <= x < 16 and 0 <= y < 16) or g.p[y][x]: continue
        seen.add((x, y)); st += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
    if keep is None: return
    lim = keep[1] + 3
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
        hx, hy, rx, ry = GEO[stage]['h']
        ex, ey = round(hx + rx * 0.5), round(hy - ry * 0.1)
        g._raw(ex, ey, 0)
        _seal(g, (ex, ey))
        bx, bw = GEO[stage]['b'][0], GEO[stage]['b'][2] + kw.get('brx', 0.0) + 0.5
        by[stage] = dict(rows=g.rows(), head=(hx, hy, stage + 1.0), eye=(ex, ey), body=(bx - bw, bx + bw))
    return dict(by_stage=by)

ARCH = {
 'spr_feet':    _build(),                                    # round cherub on two feet
 'spr_imp':     _build(tail=True),                           # round imp with a spade tail
 'spr_cloud':   _build('cloud'),
 'spr_ember':   _build('ember'),
 'spr_emberb':  _build('ember'),
 'spr_big':     _build(tail=True),
 'spr_bigfeet': _build(),
 'spr_bigcloud':_build('cloud'),
 'spr_bigember':_build('ember'),
 'spr_chub':    _build(tail=True, brx=1.4, bry=0.3),         # well fed
 'spr_chubember': _build('ember'),
 'spr_imp2':    _build(tail=True, brx=0.8, hrx=0.4),
 'spr_tallimp': _build(tail=True, tall=1, hry=-0.2),
 'spr_champ':   _build(tall=1, hrx=0.5, brx=0.8),
 'spr_robe':    _build('robe'),                              # flared bell robe
 'spr_tall':    _build(tall=1, hry=-0.2),                    # lean and upright
 'spr_brute':   _build(tail=True, hrx=0.6, hry=-0.3, brx=0.9),  # broad flat head, thick shoulders
}
spritegen.register_archetypes(ARCH)

# ---- helpers -----------------------------------------------------------------------------------------
def _stage(c): return int(round(c['hr'] - 1))

def _crown(g, x, hy):
    """Row of the topmost head pixel in column x (scanning up from just above the head centre)."""
    y = int(round(hy)) - 1
    if not g.get(x, y): return None
    while y > 0 and g.get(x, y - 1): y -= 1
    return y

def _edges(g, c):
    y = int(round(c['hy'])) + 1
    xs = [x for x in range(16) if g.get(x, y)]
    return min(xs), max(xs)

def _stamp(g, rows, x, ybot, mirror=False, drop=()):
    """Draw string rows (X = ink); the bottom row sits on ybot. In left-wing form the inner edge is the LAST column; mirror flips it."""
    n = len(rows)
    for j, r in enumerate(rows):
        for i, ch in enumerate(r):
            if ch != 'X' or (j, i) in drop: continue
            col = (len(r) - 1 - i) if mirror else i
            g.set(x + col, ybot - (n - 1 - j))

# ---- halos ------------------------------------------------------------------------------------------
# a closed ring whose hole has more than 6 cells (the shader only fills holes of up to 6 cells as eyes); hatchlings get an open arc
R5 = ['.XXX.', 'X...X', '.XXX.']
RING = {1: ['.XX.', 'X..X'], 2: ['.XX.', 'X..X', '.XX.'], 3: R5, 4: ['.XXXX.', 'X....X', '.XXXX.'], 5: ['.XXXXX.', 'X.....X', '.XXXXX.']}

def _halo(g, c, dx=0):
    s = _stage(c); rows = RING[s]; w = len(rows[0])
    top = _crown(g, int(round(c['hx'])), c['hy'])
    _stamp(g, rows, int(round(c['hx'] - w / 2 + 0.5)) + dx + (0 if w % 2 == 0 else 0), top - 2)

def halo(g, c): _halo(g, c)
def halo_side(g, c): _halo(g, c, 2)

def halo_crook(g, c):
    """Dim, tilted ring for the neglect line: one end hangs low and the rim is broken."""
    s = _stage(c); top = _crown(g, int(round(c['hx'])), c['hy'])
    rows = {1: ['.XX.', 'X...'], 2: ['.XX.', 'X...'], 3: ['..XX.', '.X..X', 'X....'], 4: ['..XXX.', '.X...X', 'X....X'], 5: ['..XXXX.', '.X....X', 'X.....X']}[s]
    _stamp(g, rows, int(round(c['hx'])) - 2, top - 2)

# ---- horns ------------------------------------------------------------------------------------------
# left horn, string rows from the tip down to the base; the LAST column is the inner edge. A thick curved "C" that sweeps up
# and out, then hooks back in at the tip
HORN = {1: ['.XX'], 2: ['.X.', 'XX.'],
        3: ['.XX', 'XX.', '.XX'][::1], 4: ['.XX', 'XX.', 'XX.', '.XX'], 5: ['.XX', 'XX.', 'XX.', '.XX']}
HORN[3] = ['.X.', 'XX.', '.XX']
BIG = {3: ['.XX', 'XX.', '.XX'], 4: ['..X', '.XX', 'XX.', 'XX.', 'XX.', '.XX'], 5: ['..X', '.XX', 'XX.', 'XX.', 'XX.', '.XX']}

def _horns(g, c, sides, rows):
    xin = int(round(c['hx'] - 0.5))                     # inner column of the left horn base sits two columns from the middle
    for s in sides:
        col = xin - 1 if s < 0 else xin + 2
        top = _crown(g, col, c['hy'])
        if top is None: top = _crown(g, col + (1 if s < 0 else -1), c['hy']) + 1
        n = len(rows)
        _stamp(g, rows, (col - 2) if s < 0 else col, top, mirror=(s > 0))
        # pillar the base down onto the head
        for dx in range(3):
            x = (col - 2 + dx) if s < 0 else (col + dx)
            y = top
            while y < 15 and not g.get(x, y + 1) and g.get(x, y): y += 1

def horns(g, c): _horns(g, c, (-1, 1), HORN[_stage(c)])
def horn1(g, c): _horns(g, c, (-1,), HORN[_stage(c)])
def bighorns(g, c): _horns(g, c, (-1, 1), BIG[_stage(c)])
def ramhorns(g, c): _horns(g, c, (-1, 1), BIG[_stage(c)])
def nubs(g, c): _horns(g, c, (-1, 1), ['.XX'] if _stage(c) <= 2 else HORN[2])

# ---- wings ------------------------------------------------------------------------------------------
# left-wing rows (top to bottom); the LAST column touches the body. Angel: rounded top, three feather teeth along the bottom.
ANGEL = {3: ['X..', 'XX.', 'XX.', 'XXX', '.XX', '..X'],
         4: ['X...', 'XX..', 'XX..', 'XXX.', 'XXX.', '.XXX', '.XXX', '..XX', '...X'],
         5: ['X....', 'XX...', 'XX...', 'XXX..', 'XXX..', 'XXXX.', 'XXXX.', '.XXXX', '.XXXX', '..XXX', '...XX', '....X']}
# Bat: a spike for the arm at the top, a straight diagonal leading edge, webbing with deep scallops along the lower edge
BAT = {3: ['X..', 'XX.', 'XXX', 'X.X', '..X'],
       4: ['X...', 'XX..', 'XXX.', 'XXXX', 'X.XX', '..XX', 'X..X'],
       5: ['X....', 'XX...', 'XXX..', 'XXXX.', 'XXXXX', 'X.XXX', '..XXX', 'X..XX', '....X']}

def _wings(g, c, table, low, ragged=False):
    s = max(3, _stage(c)); rows = table[s]; L, Rr = _edges(g, c)
    ybot = int(round(c['hy'])) + low
    w = len(rows[0]); n = len(rows)
    drop = ()
    if ragged: drop = tuple((j, 0) for j in range(1, n, 2)) + ((n - 1, w - 1),)
    _stamp(g, rows, L - 1 - w, ybot, False, drop)                             # left wing: a one-pixel gap from the head
    for x in range(L - 1, L + 5):                                              # a strut joins its foot to the body
        if g.get(x, ybot): break
        g.set(x, ybot)
    if ragged:                                                                 # the right wing is half gone
        _stamp(g, rows[-4:], Rr + 2, ybot, True)
        for x in range(Rr + 1, Rr - 5, -1):
            if g.get(x, ybot): break
            g.set(x, ybot)
    else:
        _stamp(g, rows, Rr + 2, ybot, True)
        for x in range(Rr + 1, Rr - 5, -1):
            if g.get(x, ybot): break
            g.set(x, ybot)

def wings(g, c): _wings(g, c, ANGEL, 2)
def wingfold(g, c): _wings(g, c, ANGEL, 2)
def bigwings(g, c): _wings(g, c, ANGEL, 2)
def tornwings(g, c): _wings(g, c, ANGEL, 2, True)
def batwings(g, c): _wings(g, c, BAT, 1)
def tornbat(g, c): _wings(g, c, BAT, 1, True)

# ---- props ------------------------------------------------------------------------------------------
def trident(g, c):
    """A toy trident held low in front, under the wings: three tines, a cross-bar and a shaft."""
    st = _stage(c); x = 14 if st >= 4 else 13
    top = {1: 11, 2: 10, 3: 10, 4: 10, 5: 10}[st]
    g.set(x - 1, top); g.set(x + 1, top)
    g.set(x - 1, top + 1); g.set(x, top + 1); g.set(x + 1, top + 1)
    for y in range(top + 2, 16): g.set(x, y)

def sparkles(g, c):
    """A twinkling star: a plus shape, kept connected so it never reads as stray dots."""
    st = _stage(c); x = 14 if st >= 4 else 13; y = 2 if st >= 4 else 4
    for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)): g.set(x + dx, y + dy)

def crown(g, c):
    top = _crown(g, int(round(c['hx'])), c['hy']); hx = int(round(c['hx']))
    for dx in range(-1, 2): g.set(hx + dx, top - 1)
    for dx in (-1, 1): g.set(hx + dx, top - 2)
    g.set(hx, top - 2)

def cap(g, c):
    """Jester cap: a band with two floppy points that end in bells."""
    hx = int(round(c['hx'])); top = _crown(g, hx, c['hy'])
    for dx in range(-2, 3): g.set(hx + dx, top)
    for dx in range(-2, 4): g.set(hx + dx, top - 1) if dx != 1 else None
    for dx, dy in ((-3, 2), (-3, 3), (4, 2), (4, 3), (-3, 4), (4, 4)): g.set(hx + dx, top - dy + 1)

def torn(g, c):
    """Tatters: a few notches bitten out of the lower edge."""
    for x in (4, 7, 10):
        for y in range(15, 8, -1):
            if g.get(x, y):
                g.set(x, y, 0); break

def _sealed(f):
    def run(g, c):
        f(g, c); _seal(g, (int(round(c['ex'])), int(round(c['ey']))))
    return run

for n, f in dict(halo=halo, halo_crook=halo_crook, halo_small=halo, halo_side=halo_side, nubs=nubs, horns=horns, horn1=horn1,
                 bighorns=bighorns, ramhorns=ramhorns, wings=wings, wingfold=wingfold, bigwings=bigwings, tornwings=tornwings,
                 batwings=batwings, tornbat=tornbat, trident=trident, sparkles=sparkles, crown=crown, cap=cap, torn=torn).items():
    spritegen.EXTRA_HANDLERS['spirits_' + n] = f if n.startswith('halo') else _sealed(f)
