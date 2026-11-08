"""Bot archetypes (16x16, ground on row 15), built from parts, natively at each stage size (no averaging).
Bots are read from SILHOUETTE: each archetype is a different gadget shape (boombox with handle, portrait handheld,
CRT with tapered back + rabbit ears, notched floppy, wide modem with two antennas, slim walkie with stub antenna,
toaster with toast, drone with rotor bars, upright mech, tracked rover, spider walker, lopsided junk heap, orb, cube).
Also registers the bot_* decorations."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
from archetypes_fox import _G as _FG, W, _T
import spritegen

class _G(_FG):
    def rect(self, x0, y0, x1, y1, v=1):
        """inclusive rectangle in full-size coordinates; always at least 1 px"""
        ax, ay = self.T(x0, y0); bx, by = self.T(x1, y1)
        ax, bx = int(round(min(ax, bx))), int(round(max(ax, bx)))
        ay, by = int(round(min(ay, by))), int(round(max(ay, by)))
        for y in range(ay, by + 1):
            for x in range(ax, bx + 1):
                if 0 <= x < W and 0 <= y < W: self.p[y][x] = v
    def hole(self, x0, y0, x1, y1):
        """cut-out rectangle; rounds inward so the frame stays at least as thick, and tiny ones vanish at small sizes"""
        import math
        ax, ay = self.T(x0, y0); bx, by = self.T(x1, y1)
        ax, bx = math.ceil(min(ax, bx) + 0.01), math.floor(max(ax, bx) - 0.01)
        ay, by = math.ceil(min(ay, by) + 0.01), math.floor(max(ay, by) - 0.01)
        if self.k < 0.8 and (bx - ax < 1 or by - ay < 0): return
        for y in range(ay, by + 1):
            for x in range(ax, bx + 1):
                if 0 <= x < W and 0 <= y < W: self.p[y][x] = 0
    def feet(self, xs, y0=14):
        for x in xs:
            for y in range(int(y0), 16): self.set(x, y)

def _boombox(k=1.0):
    g = _G(k)
    g.rect(1, 6, 14, 13)
    g.rect(2, 5, 13, 5)                       # rounded top
    g.line(4, 5, 4, 3); g.line(11, 3, 11, 5)  # carry handle
    g.rect(4, 3, 11, 3)
    g.ell(4.3, 10, 1.7, 1.7, 0); g.set(4.3, 10)    # left speaker (ring with a dot)
    g.ell(11.7, 10, 1.7, 1.7, 0); g.set(11.7, 10)  # right speaker
    g.hole(6, 8, 9, 10)                    # cassette window (eye lives here)
    g.hole(6, 12, 9, 12)
    g.feet((2, 3, 12, 13), 14)
    return g

def _handheld(k=1.0):
    g = _G(k)
    g.rect(4, 1, 11, 13)
    g.set(4, 0); g.set(11, 0)                 # shoulder buttons
    g.hole(5, 2, 10, 6)                    # screen (eye lives here)
    g.hole(5, 9, 7, 9); g.hole(6, 8, 6, 10)   # d-pad cross
    g.set(9, 9, 0); g.set(10, 10, 0)          # buttons
    g.hole(6, 12, 9, 12)                   # speaker slit
    g.feet((5, 10), 14)
    return g

def _crt(k=1.0, ears=True):
    g = _G(k)
    g.rect(7, 4, 14, 12)                      # front bezel
    g.tri(7, 5, 0.5, 6.5, 7, 7, min_h=0)      # tapered tube back
    g.rect(1, 6, 7, 10)
    g.tri(7, 10, 0.5, 9, 7, 12, min_h=0)
    g.hole(8, 5, 13, 10)                   # screen
    g.rect(9, 6, 9, 6)                        # reflection glint kept as ink
    g.rect(9, 13, 12, 13)                     # neck
    g.rect(7, 14, 14, 15)                     # base
    if ears:
        g.line(9, 4, 6.5, 0); g.line(12, 4, 14.5, 0)   # rabbit ears
    return g

def _floppy(k=1.0, arms=False):
    g = _G(k)
    g.rect(3, 3, 12, 13)
    g.rect(11, 3, 12, 4, 0); g.set(10, 3, 0); g.set(12, 5, 0)     # notched corner
    g.hole(5, 3, 9, 5); g.rect(8, 3, 8, 5)                     # shutter window
    g.hole(5, 8, 10, 11)                                       # label (eye lives here)
    if arms:
        g.rect(1, 8, 2, 9); g.rect(13, 8, 14, 9)
    g.feet((4, 5, 10, 11), 14)
    return g

def _modem(k=1.0):
    g = _G(k)
    g.rect(1, 9, 14, 13)
    g.line(3, 9, 1, 2); g.line(12, 9, 14.5, 2)       # two antennas
    g.set(0.6, 1); g.set(14.8, 1)
    for x in (3, 5, 7, 9, 11): g.set(x, 12, 0)       # status lights
    g.line(1, 12, 0, 14); g.set(0, 15)                # phone cord
    g.feet((3, 4, 11, 12), 14)
    return g

def _walkie(k=1.0, thick=2):
    g = _G(k)
    g.rect(4, 5, 11, 13)
    g.rect(10, 0, 10 + thick - 1, 4)                  # stubby fat antenna
    g.rect(4, 3, 5, 4)                                # knob
    g.hole(5, 9, 10, 9); g.hole(5, 11, 10, 11)        # grill
    g.feet((5, 10), 14)
    return g

def _toaster(k=1.0):
    g = _G(k)
    g.rect(2, 8, 13, 13); g.rect(3, 7, 12, 7)
    g.rect(4, 3, 6, 7); g.set(5, 2)                   # toast
    g.rect(9, 3, 11, 7); g.set(10, 2)
    g.set(7, 7, 0); g.set(8, 7, 0)
    g.rect(14, 9, 14, 10)                             # lever
    g.hole(5, 10, 10, 11)                          # face plate (eye)
    g.feet((3, 12), 14)
    return g

def _drone(k=1.0):
    g = _G(k)
    g.ell(8, 8.5, 3.4, 2.6)
    g.line(5, 7, 2, 4); g.line(11, 7, 14, 4)          # arms
    g.rect(0, 3, 4, 3); g.rect(11, 3, 15, 3)          # rotor blades (bars)
    g.line(6, 10.5, 5, 14); g.line(10, 10.5, 11, 14)  # landing legs
    g.rect(3, 15, 6, 15); g.rect(9, 15, 12, 15)       # skids
    g.set(8, 5); g.set(8, 4)                          # camera mast
    return g

def _mech(k=1.0, wide=0):
    g = _G(k)
    g.ell(8, 3.0, 2.3, 2.0)                           # head
    g.rect(5, 6, 11, 10)                              # torso
    g.rect(1 - wide, 5, 14 + wide, 5)                 # shoulder bar
    g.rect(1 - wide, 6, 2 - wide, 11); g.rect(13 + wide, 6, 14 + wide, 11)   # arms (gap to torso)
    g.rect(0 - wide, 12, 2 - wide, 12); g.rect(13 + wide, 12, 15 + wide, 12) # fists
    g.rect(4, 11, 6, 14); g.rect(10, 11, 12, 14)      # legs (wide gap between)
    g.rect(3, 15, 6, 15); g.rect(10, 15, 13, 15)      # feet
    g.set(8, 5); g.set(8, 4)                          # neck
    return g

def _tread(k=1.0, blade=False):
    g = _G(k)
    g.ell(8, 12.5, 6.8, 2.5)                          # track
    for x in (4.5, 8, 11.5): g.set(x, 12.5, 0)
    g.rect(4, 8, 11, 10)                              # chassis
    g.rect(8, 3, 13, 7)                               # cab / head
    g.line(12, 9, 15, 8)                              # grabber arm
    g.set(15, 7); g.set(15, 9)
    if blade: g.rect(14, 10, 15, 14)                  # dozer blade
    g.rect(1, 15, 14, 15)
    return g

def _quad(k=1.0):
    g = _G(k)
    g.ell(7.5, 8.5, 4.2, 2.5)
    g.line(4.5, 9.5, 2, 11); g.line(2, 11, 1, 15)
    g.line(6.2, 10.5, 5, 15)
    g.line(9, 10.5, 10.5, 15)
    g.line(11, 9.5, 13.5, 11); g.line(13.5, 11, 15, 15)
    g.ell(12, 6, 2.0, 1.7)                            # head
    g.line(12.5, 4.5, 13.5, 2); g.line(13.5, 2, 15, 2)  # bent antenna
    return g

def _junk(k=1.0):
    g = _G(k)
    g.rect(2, 10, 11, 14)                             # bottom crate
    g.rect(5, 6, 13, 9)                               # middle crate, shifted
    g.rect(2, 3, 6, 5); g.set(1, 3); g.set(7, 4)      # top crate, crooked
    g.ell(13.5, 13, 1.8, 1.8)                         # stray wheel
    g.set(13.5, 13, 0)
    g.line(6, 3, 9, 1); g.set(10, 0)                  # snapped antenna
    g.line(1, 12, 0, 15)                              # trailing cable
    g.set(8, 12, 0); g.set(4, 11, 0)                  # dents
    g.rect(1, 15, 14, 15)
    return g

def _orb(k=1.0):
    g = _G(k)
    g.ell(8, 10, 4.6, 4.2)
    g.line(8, 6, 8, 3); g.set(8, 2); g.set(7, 2); g.set(9, 2)   # antenna with a bulb
    g.feet((5, 11), 14)
    return g

def _cube(k=1.0):
    g = _G(k)
    g.rect(4, 7, 11, 13)
    g.rect(2, 9, 3, 10); g.rect(12, 9, 13, 10)        # ear bolts
    g.line(7, 7, 6, 4); g.line(9, 7, 10, 4)           # twin little antennae
    g.feet((5, 10), 14)
    return g

SIZES = {1: 0.62, 2: 0.74, 3: 0.88, 4: 1.0, 5: 1.0}

def _build(fn, hd, eye, body, **kw):
    by = {}
    for stage, k in SIZES.items():
        g = fn(k=k, **kw)
        hx, hy = _T(k, hd[0], hd[1]); ex, ey = _T(k, eye[0], eye[1])
        g._raw(ex, ey, 0)
        by[stage] = dict(rows=g.rows(), head=(hx, hy, max(1.6, hd[2] * k)), eye=(round(ex), round(ey)),
                         body=(_T(k, body[0], 0)[0], _T(k, body[1], 0)[0]))
    return dict(by_stage=by)

ARCH_BOT = {
 'bot_boombox':  _build(_boombox, (7.5, 6, 2.6), (7.5, 9), (1, 14)),
 'bot_handheld': _build(_handheld, (7.5, 4, 2.6), (7.5, 4), (4, 11)),
 'bot_crt':      _build(_crt, (10.5, 7, 2.8), (10.5, 8), (1, 14)),
 'bot_floppy':   _build(_floppy, (7.5, 8, 3.0), (7.5, 9), (3, 12)),
 'bot_modem':    _build(_modem, (8, 11, 2.6), (8, 10), (1, 14)),
 'bot_walkie':   _build(_walkie, (8, 7, 2.4), (8, 7), (5, 11)),
 'bot_toaster':  _build(_toaster, (7.5, 10, 3.0), (7.5, 10), (2, 13)),
 'bot_drone':    _build(_drone, (8, 8.5, 2.8), (8, 8), (4, 12)),
 'bot_mech':     _build(_mech, (8, 3.2, 2.3), (8.5, 3), (3, 13)),
 'bot_mechw':    _build(_mech, (8, 3.2, 2.3), (8.5, 3), (2, 14), wide=1),
 'bot_tread':    _build(_tread, (10.5, 5, 2.4), (11, 5), (4, 12)),
 'bot_dozer':    _build(_tread, (10.5, 5, 2.4), (11, 5), (4, 12), blade=True),
 'bot_quad':     _build(_quad, (12, 6, 2.2), (12.5, 6), (4, 11)),
 'bot_junk':     _build(_junk, (9, 7.5, 2.6), (9, 8), (2, 13)),
 'bot_orb':      _build(_orb, (8, 10, 3.5), (9, 10), (4, 12)),
 'bot_cube':     _build(_cube, (7.5, 10, 3.2), (8.5, 9), (4, 11)),
}
spritegen.register_archetypes(ARCH_BOT)

# ---- decorations -------------------------------------------------------------------------
def _top(g, x):
    for y in range(16):
        if g.get(int(x), y): return y
    return None

def bot_rabbit(g, c):
    """rabbit-ear TV antenna: a V rising over the head"""
    x = int(round(c['hx'])); t = _top(g, x)
    if t is None: t = int(c['hy'] - c['hr'])
    g.line(x, t - 1, x - 2, t - 4); g.line(x, t - 1, x + 2, t - 4)

def bot_cog(g, c):
    """small cog over the head (plus-shape with a hole)"""
    x = int(round(c['hx'])); t = _top(g, x)
    y = (t if t is not None else int(c['hy'] - c['hr'])) - 3
    if y < 1: y = 1
    for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)): g.set(x + dx, y + dy)
    g.set(x - 1, y - 1); g.set(x + 1, y + 1)

def bot_rust(g, c):
    """rust holes: scattered gaps in the body"""
    b0, b1 = int(c['b0']), int(c['b1'])
    for i, x in enumerate(range(b0 + 1, b1, 3)):
        for y in range(15, 3, -1):
            if g.get(x, y) and g.get(x, y - 1) and g.get(x, y - 2):
                g.set(x, y - 2 - (i % 2), 0); break

def bot_zap(g, c):
    """lightning zigzag beside the head"""
    x, y = int(c['hx'] - c['hr'] - 2), max(1, int(c['hy'] - c['hr']))
    for dx, dy in ((1, 0), (0, 1), (1, 1), (0, 2), (-1, 3)): g.set(x + dx, y + dy)

def bot_dish(g, c):
    """little satellite dish beside the head"""
    x, y = int(c['hx'] + c['hr'] + 1), int(c['hy'] - c['hr'])
    g.line(x - 1, y + 2, x + 1, y - 1); g.set(x + 1, y + 1); g.set(x, y + 2); g.set(x + 2, y)

def bot_bolts(g, c):
    """neck bolts: a pixel sticking out each side below the head"""
    y = int(round(c['hy'] + c['hr']))
    for x in (int(c['hx'] - c['hr'] - 1), int(c['hx'] + c['hr'] + 1)): g.set(x, y)

def bot_cable(g, c):
    """cable looping from the rear down to the ground"""
    xs = [x for y in range(16) for x in range(16) if g.get(x, y)]
    x = min(xs) - 1
    if x >= 0:
        g.line(x + 1, 11, x, 13); g.set(x, 14); g.set(x + 1, 15)

def bot_tape(g, c):
    """two reel holes below the face"""
    y = int(round(c['hy'] + c['hr'] + 1))
    g.set(c['hx'] - 1, y, 0); g.set(c['hx'] + 1, y, 0)

spritegen.EXTRA_HANDLERS.update({
 'bot_rabbit': bot_rabbit, 'bot_cog': bot_cog, 'bot_rust': bot_rust, 'bot_zap': bot_zap,
 'bot_dish': bot_dish, 'bot_bolts': bot_bolts, 'bot_cable': bot_cable, 'bot_tape': bot_tape,
})
