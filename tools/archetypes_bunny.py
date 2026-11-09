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

def _tl(g, x0, y0, x1, y1, r=1.0, v=1):
    """thick line made of small discs"""
    n = 8
    for i in range(n + 1):
        t = i / n; g.ell(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, r, v)

def _feet(g, x0, x1):
    for x in range(x0, x1): g.set(x, 15)

def _scruff(g, pts):
    """ragged fur tufts attached to the silhouette (stray look); pts are (x, y) just outside the body"""
    for x, y in pts: g.set(x, y)

# ---- rabbit (upright sitting, two tall ears, cotton tail) ----------------------------------------------
def _rabbit(k=1.0, ear=4.2, fluff=0.0, head=2.4, tail=1.3, scruff=False, tall=0.0):
    g = _G(k)
    g.ell(6.0, 11.2, 3.8 + fluff, 3.6 + tall * 0.3)
    g.ell(8.8, 10.0, 2.4, 3.6 + tall)
    g.ell(10.0, 6.0, head, head * 0.92)
    g.ell(2.6, 12.6, tail, tail)  # cotton tail
    top = 6.0 - head * 0.8
    if scruff:  # one ear stands, the other is bent over at the middle
        _tl(g, 8.8, top + 1.0, 8.2, top - ear + 1.4, 1.0)
        _tl(g, 11.2, top + 1.0, 11.6, top - ear * 0.55 + 1.0, 1.0)
        _tl(g, 11.6, top - ear * 0.55 + 1.0, 13.6, top - ear * 0.3 + 2.4, 0.8)
        for (x, y) in ((1.0, 11.0), (1.0, 14.0), (3.0, 9.0), (5.2, 7.4)): g.set(x, y)
    else:
        _tl(g, 8.8, top + 1.0, 8.0, top - ear + 1.0, 1.0)
        _tl(g, 11.2, top + 1.0, 12.0, top - ear + 1.4, 1.0)
    g.line(10.4, 11, 10.4, 14.5)
    for x in range(3, 12): g.set(x, 15)
    return g

def _plump(k=1.0, mode='plump'):
    """round loaf rabbit: huge round body, small low head, short fat ears"""
    g = _G(k)
    if mode == 'mop':  # shapeless dust bunny: wide, ragged hem, ears flopped to the sides
        g.ell(7.4, 10.6, 6.2, 4.4); g.ell(10.8, 7.4, 2.6, 2.4)
        _tl(g, 9.4, 6.0, 7.0, 5.4, 1.0); _tl(g, 12.0, 5.6, 14.0, 6.6, 0.9)
        for (x, y) in ((1, 9), (1, 13), (3, 15), (6, 15), (9, 15), (12, 15), (13, 13), (13.6, 11.6), (5, 6), (3, 7)): g.set(x, y)
        for x in (4, 7, 10, 13): g.set(x, 15)
        g.set(13, 9)
        return g
    c = 1.0 if mode == 'fluffy' else 0.0
    g.ell(6.6, 10.4, 5.0 + c, 4.5 + c * 0.4)
    g.ell(10.6, 7.2, 2.8, 2.6)
    g.ell(1.6, 11.4, 1.5, 1.5)  # round tail
    if mode == 'fluffy':  # cheek ruff and tall velvety ears
        g.ell(10.8, 9.4, 2.4, 1.8)
        _tl(g, 9.4, 5.2, 8.6, 0.8, 1.0); _tl(g, 11.6, 5.2, 12.0, 0.6, 1.0)
        g.set(13.4, 8.2); g.set(12.9, 6.2)
    else:
        _tl(g, 9.6, 5.2, 9.0, 2.0, 1.0); _tl(g, 11.6, 5.2, 12.0, 2.4, 1.0)
    g.line(10.6, 12, 10.6, 14.6)
    for x in range(3, 13): g.set(x, 15)
    return g

# ---- lop (round head with two fat ears HANGING down past the chin, outlined by a gap against the body) ---------
def _lop(k=1.0, pose='sit', longear=False):
    """sitting rabbit with a big round head on a LOW body and NO upright ears. A fat ear hangs from the top of the head and
    drapes down behind the cheek; a thin gap is carved along its front edge so it reads as a separate drooping flap.
    The wide pose adds a second ear dangling in front of the chest past the chin."""
    g = _G(k)
    if pose == 'wide':   # big plush lop
        g.ell(5.2, 11.8, 4.8, 3.4); g.ell(9.4, 12.2, 2.4, 2.9); g.ell(11.0, 6.8, 3.0, 2.8)
        front = True
        ex0, ey0, ex1, ey1 = 8.8, 5.0, 4.6, 11.6
    elif pose == 'tall':  # slim, alert, long neck
        g.ell(5.6, 12.0, 3.6, 3.0); g.ell(8.8, 11.4, 2.0, 3.4); g.ell(9.8, 5.6, 2.7, 2.5)
        front = False
        ex0, ey0, ex1, ey1 = 8.0, 3.8, 4.6, 10.6
        if longear: ex1, ey1 = 3.6, 12.4
    else:
        g.ell(5.6, 12.0, 4.0, 3.0); g.ell(9.0, 12.4, 2.0, 2.6); g.ell(10.4, 6.6, 2.9, 2.7)
        front = False
        ex0, ey0, ex1, ey1 = 8.6, 4.6, 5.2, 9.6
    g.ell(1.6, 12.8, 1.3, 1.3)  # cotton tail
    n = 8
    for i in range(n + 1):  # the drooping ear: fat, drapes back and down
        t = i / n
        g.ell(ex0 + (ex1 - ex0) * t, ey0 + (ey1 - ey0) * t, 1.5 - 0.15 * t, 1.5 - 0.15 * t)
    g.line(ex0 + 1.6 + (ex1 - ex0) * 0.45, ey0 + 1.5 + (ey1 - ey0) * 0.45, ex1 + 1.8, ey1 - 0.4, 0)
    if front:
        for i in range(n + 1):
            t = i / n; g.ell(12.8 + 1.0 * t, 6.2 + 4.6 * t, 1.0, 1.0)
    g.line(10.2, 12.4, 10.2, 14.5)
    for x in range(2, 13): g.set(x, 15)
    return g

# ---- hare (long lean body, long hind legs; ears lie back as ONE long wedge, not a pair of antlers) ----------
def _hare(k=1.0, pose='stand', ear=4.4, scruff=False, ghost=False):
    g = _G(k)
    if pose == 'leap':     # mid-bound: front paws reaching, hind legs stretched out behind
        _tl(g, 4.4, 8.2, 9.6, 9.6, 2.0); g.ell(4.0, 8.4, 2.6, 2.6)
        g.ell(12.4, 8.4, 2.2, 1.9); g.tri(13.6, 7.8, 13.6, 9.4, 15.4, 9.0)
        _tl(g, 12.0, 6.8, 6.4, 5.2, 0.95); _tl(g, 12.0, 6.0, 7.0, 3.8, 0.85)
        _tl(g, 3.6, 10.0, 0.6, 14.4, 1.0); g.set(0.2, 15); g.set(1.2, 15)
        _tl(g, 10.4, 10.6, 13.6, 13.6, 0.9); g.set(14, 15); g.set(13, 15)
        g.set(1.6, 6.2)
        return g
    if pose == 'soar':     # stretched flat out, nose to tail, ears streaming back
        _tl(g, 3.4, 8.6, 10.4, 8.6, 1.9); g.ell(11.6, 8.0, 2.2, 1.9); g.tri(12.8, 7.4, 12.8, 9.0, 15.0, 8.6)
        _tl(g, 11.2, 6.4, 4.6, 3.4, 0.95); _tl(g, 11.4, 5.8, 6.2, 2.2, 0.85)
        _tl(g, 3.6, 9.6, 0.6, 12.8, 1.0); _tl(g, 9.4, 10.2, 12.4, 12.6, 0.9)
        g.set(0.4, 7.6); g.set(0.2, 8.6)
        _feet(g, 11, 14)
        return g
    if pose == 'tall' and ghost:   # tall gaunt ghost hare: narrow, very long ragged ears, wisp of a tail
        g.ell(6.0, 9.6, 2.2, 4.6); g.ell(7.8, 4.8, 2.0, 1.8); g.tri(9.2, 4.4, 9.2, 5.8, 11.4, 5.4)
        _tl(g, 7.0, 3.4, 4.8, -0.4, 0.8); _tl(g, 8.6, 3.2, 9.6, -0.6, 0.8); _tl(g, 9.6, -0.6, 11.4, 0.2, 0.7)
        g.ell(3.6, 12.4, 1.8, 2.4)
        g.line(8.2, 9, 9.6, 10.6)
        g.ell(1.6, 10.6, 0.9, 0.9)
        for x in range(2, 9): g.set(x, 15)
        g.line(7.4, 12, 7.4, 14)
        return g
    if pose == 'tall':     # upright on long hind legs, ears straight up, big flat feet
        g.ell(6.4, 9.2, 3.0, 4.6); g.ell(8.0, 4.6, 2.1, 1.9); g.tri(9.6, 4.2, 9.6, 5.8, 11.8, 5.4)
        _tl(g, 7.2, 3.2, 5.8, -0.2, 0.9); _tl(g, 8.8, 3.0, 8.0, -0.4, 0.85)
        g.ell(3.8, 12.0, 2.0, 2.6)
        g.line(9.0, 9, 10.4, 10.4)  # paws held to chest
        g.ell(1.8, 9.4, 1.2, 1.2)
        for x in range(2, 10): g.set(x, 15)
        g.line(8.8, 11, 8.8, 14)
        if scruff:
            for (x, y) in ((0.6, 11.0), (1.0, 13.4), (4.4, 4.6), (6.2, 6.0)): g.set(x, y)
            g.set(8.0, -0.4, 0) if False else None
        return g
    if pose == 'crouch':   # sitting hunched, long ears laid flat along the back, big folded hind foot
        g.ell(6.0, 11.0, 4.4, 3.6); g.ell(3.8, 11.8, 2.6, 3.0); g.ell(10.8, 8.2, 2.3, 2.0)
        g.tri(12.2, 7.6, 12.2, 9.2, 14.4, 8.8)
        _tl(g, 10.0, 6.4, 5.0, 3.4, 0.95); _tl(g, 11.2, 6.2, 6.6, 2.4, 0.85)
        g.line(10.2, 11, 10.2, 14.4); g.ell(1.6, 11.6, 1.2, 1.2)
        if scruff:
            for (x, y) in ((0.6, 13.0), (2.6, 8.4), (5.6, 7.0), (8.4, 7.6), (8.0, 15.0)): g.set(x, y)
        for x in range(2, 12): g.set(x, 15)
        return g
    # standing on all fours
    g.ell(6.2, 9.4, 5.0, 2.7); g.ell(3.2, 10.4, 2.6, 3.4); g.ell(11.6, 6.8, 2.3, 2.0)
    g.line(9.6, 8.4, 10.6, 7.4); g.line(9.8, 9.2, 11.2, 8.0)
    g.tri(12.8, 6.2, 12.8, 7.8, 14.8, 7.4)
    e = ear - 4.4
    if scruff:
        _tl(g, 10.8, 5.2, 8.4, 2.6 - e * 0.5, 0.95); _tl(g, 8.4, 2.6 - e * 0.5, 6.4, 3.8 - e * 0.5, 0.8)
        _tl(g, 12.0, 5.0, 12.0, 1.6 - e, 0.9)
        for (x, y) in ((0.8, 8.0), (1.2, 12.4), (4.0, 6.8), (7.0, 6.6), (9.4, 6.6)): g.set(x, y)
    else:
        _tl(g, 10.6, 5.2, 7.0, 1.6 - e, 0.95); _tl(g, 11.8, 5.0, 8.6, 1.0 - e, 0.85)
    g.set(0.8, 9.4); g.set(0.8, 10.2)
    for x in (2.4, 3.8, 10.0, 11.4):
        for y in range(11, 15): g.set(x, y)
        g.set(x + 0.5, 15)
    return g

# ---- hamster (round, stubby, pouches that bulge) -----------------------------------------------------------
def _ham(k=1.0, mode='ham'):
    g = _G(k)
    if mode == 'sit':    # upright chipmunk-face hamster: small head, cheeks puffed far wider than the head, paws on a seed
        g.ell(6.6, 11.4, 3.6, 4.0); g.ell(9.2, 6.0, 2.2, 2.0)
        g.ell(7.2, 8.4, 1.9, 1.7); g.ell(11.6, 8.4, 2.2, 1.8)
        g.ell(7.6, 4.2, 0.9, 0.9)
        g.set(10, 11); g.set(11, 11)
        _feet(g, 4, 12)
        return g
    if mode == 'king':   # squat and enormous: belly, wide cheek sacks
        g.ell(7.2, 10.8, 5.2, 4.2); g.ell(10.0, 6.8, 3.0, 2.6)
        g.ell(11.6, 8.4, 3.4, 2.4)
        g.ell(7.4, 4.6, 1.0, 1.0); g.ell(11.4, 4.6, 1.0, 1.0)
        _feet(g, 3, 14)
        return g
    c = {'ham': 1.25, 'fat': 1.7}[mode]
    g.ell(7.2, 10.2, 5.4, 4.8)
    g.ell(10.8, 7.8, 2.8, 2.5)
    g.ell(12.2, 10.0, 2.0 * c, 1.7 * c)   # pouch
    g.ell(8.8, 5.0, 1.0, 1.0)
    g.set(2, 14); g.set(3, 14)
    _feet(g, 4, 13)
    return g

# ---- guinea pig (long low body, NO tail, rosebud ear, legs showing) -----------------------------------------
def _pig(k=1.0, mode='short'):
    g = _G(k)
    if mode == 'long':   # long-haired: skirt of hair to the floor, a crest over the eyes
        g.ell(6.6, 10.6, 6.2, 3.9); g.ell(12.0, 9.6, 2.6, 2.7)
        g.set(10.4, 6.6); g.set(11.2, 6.8); g.set(12.0, 7.0); g.set(10.0, 7.6)
        g.set(9.4, 6.8)
        for x in (1, 3, 5, 7, 9): g.set(x, 14); g.set(x, 15)
        g.set(11, 14); g.set(12, 15)
        g.set(0, 11); g.set(0.6, 13)
        return g
    g.ell(6.4, 10.8, 5.4, 3.3); g.ell(11.8, 10.2, 2.5, 2.4)
    g.set(9.6, 7.0); g.set(10.4, 7.0); g.set(9.6, 6.4)       # rosebud ear
    g.tri(13.8, 9.2, 13.8, 11.2, 15.2, 10.8)                  # blunt nose
    for x in (2, 3, 10, 11):
        g.set(x, 14); g.set(x, 15)
    return g

# ---- chinchilla (HUGE round ears with a hole, fluffy tail) ---------------------------------------------------
def _chin(k=1.0, mode='teen'):
    g = _G(k)
    up = mode == 'adult'
    g.ell(6.8, 10.6, 3.8 + (0.8 if up else 0), 4.0)
    g.ell(10.2, 7.0, 2.5, 2.4); g.tri(11.8, 6.8, 11.8, 8.2, 13.4, 7.8)
    r = 2.4 if up else 2.1
    g.ell(8.0, 3.8, r, r + 0.3); g.ell(12.4, 4.0, r, r + 0.3)   # giant ears
    if up:   # big fluffy plume rising behind the back
        _tl(g, 3.4, 12.4, 1.6, 8.6, 1.6); g.ell(1.6, 6.6, 2.0, 3.6); g.set(0, 4.2)
    else:
        _tl(g, 3.0, 12.6, 1.0, 9.4, 1.2); g.ell(1.0, 8.4, 1.5, 1.8)
    g.line(10.8, 12.6, 10.8, 14.6)
    for x in range(3, 12): g.set(x, 15)
    return g

# ---- dormouse (small body, BIG bushy tail curling over the back) -----------------------------------------------
def _dor(k=1.0, mode='stand'):
    g = _G(k)
    if mode == 'curl':   # asleep: tight ball, fat tail hugging the back and wrapping round to the face
        g.ell(7.4, 11.8, 4.6, 3.2); g.ell(11.6, 12.0, 1.9, 1.8)
        for (x, y) in ((3.0, 12.0), (2.2, 9.4), (3.8, 7.2), (7.0, 6.4), (10.4, 7.6)): g.ell(x, y, 1.5, 1.5)
        g.ell(11.2, 10.0, 0.9, 0.9)
        g.line(2.6, 12, 2.6, 13)
        _feet(g, 3, 13)
        return g
    if mode == 'sit':    # upright, tail like a squirrel's
        g.ell(8.2, 11.0, 3.2, 4.0); g.ell(9.8, 6.6, 2.2, 2.0); g.tri(11.2, 6.2, 11.2, 7.6, 13.0, 7.2)
        g.ell(8.2, 4.4, 1.2, 1.2); g.ell(10.8, 4.6, 1.2, 1.2)
        _tl(g, 5.4, 13.0, 3.0, 11.0, 1.5); _tl(g, 3.0, 11.0, 2.4, 6.4, 1.7); _tl(g, 2.4, 6.4, 4.4, 2.8, 1.6); g.ell(5.2, 2.2, 1.4, 1.3)
        g.line(10.6, 12, 10.6, 14.5)
        _feet(g, 5, 12)
        return g
    g.ell(8.6, 11.6, 3.6, 2.9); g.ell(11.6, 9.4, 2.3, 2.1); g.tri(13.2, 9.0, 13.2, 10.2, 14.9, 9.8)
    g.ell(10.6, 7.2, 1.2, 1.2)
    _tl(g, 5.4, 12.4, 2.4, 11.0, 1.5); _tl(g, 2.4, 11.0, 2.0, 6.6, 1.7); _tl(g, 2.0, 6.6, 4.6, 3.8, 1.6); _tl(g, 4.6, 3.8, 7.6, 3.6, 1.4)
    g.line(10.6, 13, 10.6, 14.5)
    _feet(g, 5, 13)
    return g

# ---- pika (tiny round ears, egg-shaped, no tail) -----------------------------------------------------------------
def _pika(k=1.0, mode='egg'):
    g = _G(k)
    if mode == 'up':
        g.ell(7.4, 10.8, 3.6, 4.2); g.ell(9.2, 6.4, 2.6, 2.4)
        g.ell(7.8, 4.2, 1.5, 1.5); g.ell(10.8, 4.4, 1.5, 1.5)
        g.set(11.4, 6.8); g.set(11.6, 7.4)
        _feet(g, 5, 12)
        return g
    g.ell(7.2, 11.4, 4.8, 3.9)
    g.ell(10.2, 8.4, 2.7, 2.4)
    g.ell(8.6, 5.8, 1.5, 1.5); g.ell(11.6, 6.0, 1.5, 1.5)
    for x in range(4, 12): g.set(x, 15)
    return g

def _baby(k=1.0, ear=3.6, mode='up'):
    g = _G(k)
    g.ell(6.8, 11.6, 4.0, 3.2)
    g.ell(9.4, 8.2, 3.6, 3.3)
    if mode == 'up':
        _tl(g, 8.0, 5.8, 7.4, 5.8 - ear, 1.0)
        _tl(g, 10.9, 5.8, 11.7, 5.8 - ear, 1.0)
        g.ell(3.0, 12.6, 1.1, 1.1)
    else:    # droopy-eared, bigger-headed
        g.ell(9.6, 8.0, 3.8, 3.5)
        _tl(g, 7.4, 5.8, 5.4, 8.6, 1.0); _tl(g, 12.0, 5.8, 13.6, 8.8, 1.0)
        g.set(3.0, 12.6); g.set(2.4, 12.2)
    for x in range(4, 12): g.set(x, 15)
    return g

SIZES = {1: 0.58, 2: 0.7, 3: 0.86, 4: 1.0, 5: 1.0}

def _eye_spot(g, ex, ey):
    """the eye must be a fully enclosed one-pixel hole, so move it to the nearest ink pixel whose 8 neighbours are all ink
    (falling back to 4 neighbours on tiny sprites)"""
    best = None
    for need in (8, 4):
        for y in range(1, 15):
            for x in range(1, 15):
                if not g.p[y][x]: continue
                nb = [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)] + ([(x + 1, y + 1), (x - 1, y - 1), (x + 1, y - 1), (x - 1, y + 1)] if need == 8 else [])
                if not all(g.p[b][a] for a, b in nb): continue
                d = (x - ex) ** 2 + (y - ey) ** 2
                if best is None or d < best[0]: best = (d, x, y)
        if best: break
    return (best[1], best[2]) if best else (round(ex), round(ey))

def _build(fn, hd, eye, body, **kw):
    by = {}
    for stage, k in SIZES.items():
        g = fn(k=k, **kw)
        hx, hy = _T(k, hd[0], hd[1]); ex, ey = _T(k, eye[0], eye[1])
        ex, ey = _eye_spot(g, ex, ey)
        g._raw(ex, ey, 0)
        by[stage] = dict(rows=g.rows(), head=(hx, hy, max(1.6, hd[2] * k)), eye=(ex, ey),
                         body=(_T(k, body[0], 0)[0], _T(k, body[1], 0)[0]))
    return dict(by_stage=by)

ARCH_BUN = {
 'bun_sit':   _build(_rabbit, (10.0, 6.0, 2.4), (11.0, 5.8), (3, 10)),
 'bun_scruffsit': _build(_rabbit, (10.0, 6.0, 2.4), (11.0, 5.8), (3, 10), scruff=True),
 'bun_moonrab': _build(_rabbit, (10.0, 6.0, 2.5), (11.0, 5.8), (3, 10), ear=5.0, fluff=0.5, head=2.5, tall=0.6),
 'bun_plump': _build(_plump, (10.6, 7.2, 2.7), (11.7, 7.0), (2, 10)),
 'bun_fluffy': _build(_plump, (10.6, 7.2, 2.8), (11.7, 7.0), (2, 11), mode='fluffy'),
 'bun_mop':   _build(_plump, (10.8, 7.4, 2.6), (11.8, 7.2), (2, 11), mode='mop'),
 'bun_lop':   _build(_lop, (10.4, 6.6, 2.7), (11.4, 6.4), (3, 10)),
 'bun_loploaf': _build(_lop, (11.0, 6.8, 3.0), (12.0, 6.6), (2, 11), pose='wide'),
 'bun_loptall': _build(_lop, (9.8, 5.6, 2.6), (10.8, 5.4), (3, 10), pose='tall'),
 'bun_lopelder': _build(_lop, (9.8, 5.6, 2.6), (10.8, 5.4), (3, 10), pose='tall', longear=True),
 'bun_hare':  _build(_hare, (11.6, 6.8, 2.2), (12.6, 6.6), (2, 10)),
 'bun_harestray': _build(_hare, (11.6, 6.8, 2.2), (12.6, 6.6), (2, 10), scruff=True),
 'bun_harecrouch': _build(_hare, (10.8, 8.2, 2.3), (11.9, 8.0), (2, 10), pose='crouch'),
 'bun_harecrouchstray': _build(_hare, (10.8, 8.2, 2.3), (11.9, 8.0), (2, 10), pose='crouch', scruff=True),
 'bun_hareleap': _build(_hare, (12.4, 8.4, 2.2), (13.2, 8.2), (3, 10), pose='leap'),
 'bun_haresoar': _build(_hare, (11.6, 8.0, 2.2), (12.6, 7.8), (3, 10), pose='soar'),
 'bun_haregaunt': _build(_hare, (7.8, 4.8, 2.0), (8.8, 4.6), (2, 8), pose='tall', ghost=True),
 'bun_hare2': _build(_hare, (8.0, 4.6, 2.1), (9.0, 4.4), (2, 8), pose='tall'),
 'bun_ham':   _build(_ham, (10.8, 7.8, 2.8), (11.2, 7.2), (3, 11)),
 'bun_hamfat':_build(_ham, (10.8, 7.8, 2.8), (12.0, 7.4), (3, 11), mode='fat'),
 'bun_hamsit':_build(_ham, (9.2, 6.4, 2.6), (10.4, 6.0), (3, 9), mode='sit'),
 'bun_hamking':_build(_ham, (10.0, 6.8, 3.0), (11.2, 6.4), (3, 11), mode='king'),
 'bun_pig':   _build(_pig, (11.8, 10.2, 2.5), (13.0, 9.8), (2, 11)),
 'bun_pigfl': _build(_pig, (12.0, 9.6, 2.6), (13.2, 9.4), (2, 11), mode='long'),
 'bun_chin':  _build(_chin, (10.2, 6.8, 2.3), (11.3, 6.6), (3, 10)),
 'bun_chinfl':_build(_chin, (10.2, 6.8, 2.3), (11.3, 6.6), (3, 10), mode='adult'),
 'bun_dor':   _build(_dor, (11.6, 9.4, 2.3), (11.8, 9.0), (4, 11)),
 'bun_dorcurl': _build(_dor, (11.4, 11.8, 2.0), (12.2, 11.6), (4, 11), mode='curl'),
 'bun_dorfl': _build(_dor, (9.8, 6.6, 2.2), (10.2, 6.4), (5, 10), mode='sit'),
 'bun_pika':  _build(_pika, (10.2, 8.4, 2.7), (11.4, 8.2), (3, 11)),
 'bun_pikaup':_build(_pika, (9.2, 6.4, 2.6), (10.4, 6.2), (3, 10), mode='up'),
 'bun_baby':  _build(_baby, (9.4, 8.2, 3.5), (10.6, 8.0), (3, 10)),
 'bun_baby2': _build(_baby, (9.6, 8.0, 3.7), (10.8, 7.8), (3, 10), mode='drop'),
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

def bun_rock(g, c):
    """a boulder beside the feet (rocky slope)"""
    for x in range(12, 16): g.set(x, 15)
    for x in range(13, 16): g.set(x, 14)
    g.set(14, 13); g.set(15, 13)

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
    """neglect: matted fur tufts along the back (attached, never floating)"""
    for x in range(int(c['b0']) + 1, int(c['b1']), 3):
        t = g.top(x)
        if t is not None and t > 0: g.set(x, t - 1)

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

spritegen.EXTRA_HANDLERS.update({
 'bun_rock': bun_rock, 'bun_clover': bun_clover, 'bun_moon': bun_moon, 'bun_carrot': bun_carrot, 'bun_seed': bun_seed, 'bun_hay': bun_hay,
 'bun_notch': bun_notch, 'bun_dust': bun_dust, 'bun_spark': bun_spark, 'bun_coin': bun_coin, 'bun_whisk': bun_whisk,
 'bun_bow': bun_bow, 'bun_flower': bun_flower,
})
