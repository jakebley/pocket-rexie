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


def _junk(k=1.0):
    g = _G(k)
    g.rect(2, 10, 11, 14)                             # bottom crate
    g.rect(5, 6, 13, 9)                               # middle crate, shifted
    g.rect(2, 3, 6, 5); g.set(1, 3); g.set(7, 4)      # top crate, crooked
    g.ell(13.5, 13, 1.8, 1.8)                         # stray wheel
    g.set(13.5, 13, 0)
    g.line(6, 3, 9, 2); g.set(10, 1)                  # snapped antenna
    g.line(1, 12, 0, 15)                              # trailing cable
    g.set(8, 12, 0); g.set(4, 11, 0)                  # dents
    g.rect(1, 15, 14, 15)
    return g

# ---- hand-placed 16x16 sprites (one per species; coordinates are final pixels) ---------------------------
# Eye rules (src/ui/shading.ts): the eye is ONE isolated 1-pixel hole in the upper half of the sprite and the highest small hole;
# every other small hole (buttons, lights) must sit at least 2 rows below it or be 2+ pixels wide, or the shader reads a pattern
# and draws no eye.  Screens, windows and labels are inset panels: a one-pixel ring gap around solid glass.
def _P():
    g = _G(1.0)
    g.R = g.rect                                              # filled rectangle (inclusive)
    g.H = lambda x0, y0, x1, y1: g.rect(x0, y0, x1, y1, 0)    # exact hole
    g.S = lambda x, y, v=1: g._raw(x, y, v)
    def panel(x0, y0, x1, y1, round_=True):
        """inset glass: ring gap around a solid interior (corners of the interior trimmed when round_)"""
        g.rect(x0, y0, x1, y1, 0); g.rect(x0 + 1, y0 + 1, x1 - 1, y1 - 1, 1)
        if round_:
            for (x, y) in ((x0 + 1, y0 + 1), (x1 - 1, y0 + 1), (x0 + 1, y1 - 1), (x1 - 1, y1 - 1)): g._raw(x, y, 0)
    g.panel = panel
    return g

def _disc(g, cx, cy, r, v):
    for y in range(16):
        for x in range(16):
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r: g.p[y][x] = v

def _foot(g, x0, x1, y0=14):
    for x in (x0, x1):
        g.R(x, y0, x + 1, 15)

def _asc(*rows):
    """sprite drawn as text: X ink, . empty, e the eye hole"""
    assert len(rows) == 16 and all(len(r) == 16 for r in rows), [len(r) for r in rows]
    g = _P(); eye = None
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c == 'X': g.p[y][x] = 1
            elif c == 'e': eye = (x, y)
    return g, eye

def s_blip():
    return _asc(
        "................",
        "................",
        "................",
        "................",
        "................",
        "......XX........",
        "......XX........",
        ".......X........",
        "....XXXXXX......",
        "...XXXXXXXX.....",
        "..XXXXeXXXXX....",
        ".XXXXXXXXXXXX...",
        "..XXXXXXXXXX....",
        "...XXXXXXXX.....",
        "....XXXXXX......",
        "....XX..XX......",
    )

def s_nibble():
    return _asc(
        "................",
        "................",
        "................",
        "................",
        "....X......X....",
        "....X......X....",
        "....XXXXXXXX....",
        "...XXXXXXXXXX...",
        "...XXXXXXXXXX...",
        "...XXXXeXXXXX...",
        "..XXXXXXXXXXXX..",
        "..XXXXXXXXXXXX..",
        "...XXXXXXXXXX...",
        "...XX.XX.XXXX...",
        "...XXXXXXXXXX...",
        "...XX......XX...",
    )

def s_heapling():
    return _asc(
        "................",
        ".........X.X.X..",
        ".........XXXXX..",
        "........XXXXXXX.",
        "...X....XXXeXXX.",
        "...X....XXXXXXX.",
        ".XXXXX...XXXXX..",
        ".XXXXX...X.X.X..",
        ".XXXXXX.XXXXXXX.",
        "..XXXXXXXXXXXXXX",
        ".XXXXXXXXXXXXXX.",
        "XXXXXXXXXXXXXXXX",
        ".XXXXXXXXXXXXXXX",
        "XXX..XXXXXX..XXX",
        "XXX..XXXXXX..XXX",
        "XXXXXXXXXXXXXXXX",
    )

def s_junkyard():
    return _asc(
        ".X.X............",
        "..X.........X...",
        "XXXXX.....X.X.X.",
        ".XX......XXXXXXX",
        ".XX......XXXXXXX",
        ".XXXXX..XXXXeXXX",
        ".XXXXXX.XXXXXXXX",
        "..XXXXXXXXXXXXX.",
        ".XXXXXXXXXXXXXXX",
        ".XXXXXXXXXXXXXXX",
        "XXXXXXXXXXXXXXXX",
        "XXXXXXXXXXXXXXXX",
        "XXXX..XXXXX..XXX",
        "XXXX..XXXXX..XXX",
        "XXXXXXXXXXXXXXXX",
        ".XXXXXXXXXXXXXX.",
    )

# ---- stage 2 ---------------------------------------------------------------------------------------------
def s_cogsy():                                                # little tank with a claw
    g = _P()
    g.R(8, 6, 12, 8)
    g.R(4, 9, 12, 10)
    g.R(13, 9, 14, 9); g.S(15, 8); g.S(15, 10)
    g.R(2, 11, 12, 15); g.S(2, 11, 0); g.S(12, 11, 0)
    g.H(3, 13, 4, 14); g.H(6, 13, 7, 14); g.H(9, 13, 10, 14)
    return g, (10, 7)

def s_pixel():                                                # virtual-pet egg: key ring, screen, three buttons
    g = _P()
    g.R(6, 1, 8, 3); g.H(7, 2, 7, 2)
    _disc(g, 7, 9.5, 5.6, 1)
    g.panel(5, 6, 9, 10)
    g.H(5, 13, 5, 13); g.H(7, 13, 7, 13); g.H(9, 13, 9, 13)
    return g, (7, 8)

def s_zapper():                                               # pocket walkie
    g = _P()
    g.R(5, 5, 10, 13)
    g.R(9, 0, 10, 1); g.R(9, 2, 9, 4)
    g.R(5, 3, 6, 4)
    g.R(11, 7, 11, 9)
    g.H(6, 10, 9, 10); g.H(6, 12, 9, 12)
    g.R(5, 14, 6, 15); g.R(9, 14, 10, 15)
    return g, (8, 7)

# ---- stage 3 ---------------------------------------------------------------------------------------------
def s_boomlet():
    return _asc(
        "................",
        "................",
        "....XXXXXXXX....",
        "....X......X....",
        "....X......X....",
        ".XXXXXXXXXXXXXX.",
        ".XX..........XX.",
        ".XX.XXXXXXXX.XX.",
        ".XX.XXXeXXXX.XX.",
        ".XX.XXXXXXXX.XX.",
        ".XX..........XX.",
        ".XXXXXXXXXXXXXX.",
        ".X...XXXXXX...X.",
        ".X.X.XXXXXX.X.X.",
        ".X...XXXXXX...X.",
        ".XXXXXXXXXXXXXX.",
    )

def s_clank():
    return _asc(
        "................",
        ".......XX.......",
        ".......XX.......",
        ".....XXXXXX.....",
        ".....XXXXXX.....",
        ".....XXeXXX.....",
        "......XXXX......",
        ".XXXXXXXXXXXXXX.",
        ".XX.XXXXXXXX.XX.",
        ".XX.XXX..XXX.XX.",
        ".XX.XXX..XXX.XX.",
        ".XX.XXXXXXXX.XX.",
        ".XXX.XXXXXX.XXX.",
        "....XXX..XXX....",
        "....XXX..XXX....",
        "...XXXX..XXXX...",
    )

def s_treadhead():                                            # small dozer, blade forward, headlamp eye
    g = _P()
    g.R(3, 5, 8, 11)
    g.R(9, 7, 12, 11)
    g.R(4, 2, 4, 4)
    g.H(4, 6, 7, 7)
    g.R(14, 4, 15, 14); g.R(13, 10, 13, 10); g.R(12, 12, 13, 12)
    g.R(2, 12, 12, 15); g.S(2, 12, 0); g.S(12, 12, 0)
    g.H(3, 13, 4, 14); g.H(6, 13, 7, 14); g.H(9, 13, 10, 14)
    return g, (11, 8)

def s_pixelkin():
    g = _P()
    g.R(3, 1, 12, 14)
    g.panel(4, 2, 11, 8)
    g.H(5, 11, 5, 11); g.H(4, 12, 6, 12); g.H(5, 13, 5, 13)
    g.H(9, 12, 10, 12); g.H(11, 11, 12, 11)
    g.R(4, 15, 5, 15); g.R(10, 15, 11, 15)
    return g, (7, 5)

def s_cathode():                                              # CRT: bulging glass, dials, neck and base
    g = _P()
    g.R(2, 3, 13, 11)
    g.panel(3, 4, 12, 10)
    g.H(10, 12, 12, 12) if False else None
    g.R(6, 12, 9, 13)
    g.R(4, 14, 11, 15)
    g.S(12, 11, 0)
    return g, (8, 7)

def s_floppet():
    g = _P()
    g.R(3, 2, 12, 13)
    g.S(12, 2, 0); g.S(11, 2, 0); g.S(12, 3, 0)                 # cut corner
    g.H(4, 3, 10, 6); g.R(5, 3, 9, 5)                           # metal shutter in its frame
    g.panel(4, 8, 11, 12, False)                                # paper label
    g.R(4, 14, 5, 15); g.R(10, 14, 11, 15)
    return g, (8, 4)

def s_buzz():
    g = _P()
    g.R(4, 4, 11, 13)
    g.R(10, 0, 11, 1); g.R(10, 2, 10, 3)
    g.R(4, 2, 6, 3)
    g.R(12, 6, 13, 8)
    g.H(5, 9, 10, 9); g.H(5, 11, 10, 11)
    g.R(5, 14, 6, 15); g.R(9, 14, 10, 15)
    return g, (8, 6)

def s_whir():                                                 # helicopter drone
    g = _P()
    g.R(0, 2, 6, 2); g.R(9, 2, 15, 2)
    g.R(7, 2, 8, 4)
    _disc(g, 7.5, 8, 3.4, 1)
    g.R(2, 12, 13, 12); g.R(4, 11, 4, 11); g.R(11, 11, 11, 11)
    g.R(1, 14, 5, 14); g.R(10, 14, 14, 14); g.R(3, 13, 3, 13); g.R(12, 13, 12, 13)
    g.R(13, 7, 15, 8)
    return g, (7, 8)

def s_toastie():  # two slices popping out of the toaster
    return _asc(
        "................",
        "..XXXX....XXXX..",
        ".XXXXXX..XXXXXX.",
        ".XXXXXX..XXXXXX.",
        ".XXXXXX..XXXXXX.",
        "..XXXXX..XXXXX..",
        "..XXXXX..XXXXX..",
        ".XXXXXXXXXXXXXX.",
        "XXXXXXeXXXXXXX..",
        "XXXXXXXXXXXXXXXX",
        "XXXXXXXXXXXXXXXX",
        "XXXXXXXXXXXXXX..",
        "XXX.......XXXX..",
        "XXXXXXXXXXXXXX..",
        "XXXXXXXXXXXXXX..",
        ".XX..........XX.",
    )

# ---- stage 4 ---------------------------------------------------------------------------------------------
def s_bassline():
    g = _P()
    g.R(0, 5, 15, 14); g.R(1, 4, 14, 4)
    g.R(3, 1, 12, 1); g.R(3, 2, 3, 3); g.R(12, 2, 12, 3)
    g.R(14, 0, 14, 3)
    for cx in (3.5, 12.5):
        _disc(g, cx, 11.5, 3.0, 0); _disc(g, cx, 11.5, 2.0, 1)
    g.panel(5, 5, 10, 9, False)
    g.H(6, 12, 9, 12)
    g.R(1, 15, 2, 15); g.R(13, 15, 14, 15)
    return g, (7, 7)

def s_ironclad():
    return _asc(
        "................",
        "......XXXX......",
        ".....XXXXXX.....",
        ".....XXeXXX.....",
        ".....XXXXXX.....",
        ".......XX.......",
        ".XXXXXXXXXXXXXX.",
        "XXXXXXXXXXXXXXXX",
        "XX.XXXXXXXXXX.XX",
        "XXXXX......XXXXX",
        "XXXX........XXXX",
        "XXXX........XXXX",
        "XXXXX......XXXXX",
        "XX.XXXXXXXXXX.XX",
        ".XXXXXXXXXXXXXX.",
        "..XXX......XXX..",
    )

def s_bulldozer():
    g = _P()
    g.R(2, 3, 8, 11)
    g.H(3, 4, 6, 6)
    g.R(9, 6, 12, 11)
    g.R(3, 0, 3, 2); g.R(2, 0, 4, 0)
    g.R(14, 2, 15, 14)
    g.R(12, 9, 13, 9); g.R(12, 12, 13, 12)
    g.R(0, 12, 12, 15); g.S(0, 12, 0); g.S(12, 12, 0)
    g.H(1, 13, 2, 14); g.H(4, 13, 5, 14); g.H(7, 13, 8, 14); g.H(10, 13, 11, 14)
    g.R(0, 7, 1, 8); g.R(0, 9, 0, 11)
    return g, (10, 7)

def s_joypad():
    g = _P()
    g.R(1, 4, 14, 10); g.R(0, 8, 4, 14); g.R(11, 8, 15, 14)
    g.R(2, 3, 4, 3); g.R(11, 3, 13, 3)
    g.H(4, 6, 4, 6); g.H(3, 7, 5, 7); g.H(4, 8, 4, 8)
    g.H(11, 6, 12, 6); g.H(12, 8, 13, 8)
    g.H(7, 9, 8, 9)
    g.R(7, 1, 8, 2)
    return g, (8, 6)

def s_phosphor():
    g = _P()
    g.R(1, 4, 14, 12)
    g.panel(2, 5, 13, 11)
    g.R(6, 13, 9, 13)
    g.R(3, 14, 12, 15)
    g.line(6, 4, 3, 1); g.line(9, 4, 12, 1)
    g.S(13, 12, 0)
    return g, (8, 8)

def s_diskette():
    g = _P()
    g.R(2, 1, 13, 14)
    g.S(13, 1, 0); g.S(12, 1, 0); g.S(13, 2, 0)
    g.H(3, 2, 11, 6); g.R(4, 2, 10, 5)
    g.panel(3, 8, 12, 13, False)
    g.R(3, 15, 5, 15); g.R(10, 15, 12, 15)
    g.R(0, 8, 1, 10); g.R(14, 8, 15, 10)
    return g, (9, 3)

def s_rotor():                                                # quadcopter: ring rotors on arms
    g = _P()
    g.ell(8, 8, 3.2, 2.5)
    for cx in (2.5, 13.5):
        g.ell(cx, 3, 2.6, 1.4); g.ell(cx, 3, 1.4, 0.4, 0)
        g.line(cx, 3, 8 + (cx - 8) * 0.4, 6.5)
    g.line(6, 10, 4, 13); g.line(10, 10, 12, 13)
    g.R(2, 14, 5, 14); g.R(10, 14, 13, 14)
    g.R(7, 11, 8, 12)
    return g, (8, 7)

def s_crumb():
    g = _P()
    g.R(0, 7, 14, 14); g.R(1, 6, 13, 6)
    g.R(2, 3, 5, 5); g.S(3, 2); g.S(4, 2); g.H(3, 4, 4, 4)
    g.R(9, 3, 12, 5); g.S(10, 2); g.S(11, 2); g.H(10, 4, 11, 4); g.S(12, 3, 0)
    g.R(15, 8, 15, 12)
    g.H(2, 11, 4, 11); g.H(9, 11, 12, 11); g.H(2, 13, 12, 13)
    g.R(2, 15, 3, 15); g.R(11, 15, 12, 15)
    return g, (7, 8)

def s_chatter():
    g = _P()
    g.R(2, 4, 11, 13)
    g.R(10, 0, 11, 1); g.R(10, 2, 10, 3)
    g.R(2, 2, 4, 3)
    g.R(12, 6, 13, 9)
    g.H(4, 9, 9, 9); g.H(4, 11, 9, 11)
    g.S(14, 10); g.S(15, 11); g.S(14, 12); g.S(15, 13); g.S(14, 14)
    g.R(3, 14, 4, 15); g.R(9, 14, 10, 15)
    return g, (6, 6)

def s_dialtone():
    g = _P()
    g.R(0, 6, 15, 13)
    g.line(3, 6, 1, 1); g.line(12, 6, 14, 1)
    g.R(0, 0, 1, 1); g.R(14, 0, 15, 1)
    g.H(7, 9, 7, 9); g.H(9, 9, 9, 9); g.H(11, 9, 11, 9); g.H(13, 9, 13, 9)
    g.H(2, 11, 13, 11)
    g.R(1, 14, 2, 15); g.R(13, 14, 14, 15)
    return g, (4, 7)

# ---- stage 5 ---------------------------------------------------------------------------------------------
def s_titan():
    return _asc(
        ".....X.XX.X.....",
        ".....XXXXXX.....",
        ".....XXXXXX.....",
        ".....XXeXXX.....",
        ".....XXXXXX.....",
        "X.....XXXX.....X",
        "XX.XXXXXXXXXX.XX",
        "XXXXXXXXXXXXXXXX",
        "XXX.XXX..XXX.XXX",
        "XXX.XX....XX.XXX",
        "XXX.XXX..XXX.XXX",
        ".XX.XXXXXXXX.XX.",
        ".XXX.XXXXXX.XXX.",
        "..XX.XXXXXX.XX..",
        "....XXX..XXX....",
        "...XXXX..XXXX...",
    )

def s_jukebox():
    g = _P()
    g.R(2, 3, 13, 14); g.R(4, 1, 11, 2); g.R(6, 0, 9, 0)
    g.panel(3, 3, 12, 9)
    g.H(4, 11, 11, 11); g.H(4, 13, 11, 13)
    g.R(2, 15, 4, 15); g.R(11, 15, 13, 15)
    g.R(0, 7, 1, 10); g.R(14, 7, 15, 10)
    return g, (8, 6)

def s_mainframe():
    g = _P()
    g.R(2, 0, 13, 8)
    g.panel(3, 1, 12, 7)
    g.R(0, 9, 15, 15)
    for cx in (4, 11): _disc(g, cx, 12, 1.9, 0); g.S(cx, 12, 1)
    g.H(7, 11, 8, 11); g.H(7, 13, 8, 13)
    return g, (8, 4)

def s_oracle():
    g = _P()
    g.R(2, 4, 13, 15)
    g.S(13, 4, 0); g.S(12, 4, 0); g.S(13, 5, 0)
    g.H(3, 5, 11, 8); g.R(4, 5, 10, 7)
    g.panel(3, 10, 12, 14, False)
    g.R(4, 0, 11, 2); g.H(6, 1, 9, 1); g.S(4, 0, 0); g.S(11, 0, 0)   # halo
    return g, (8, 6)

def s_tempest():
    g = _P()
    g.ell(8, 8, 3.2, 2.6)
    for (cx, cy) in ((2.5, 3), (13.5, 3), (2.5, 11), (13.5, 11)):
        g.ell(cx, cy, 2.6, 1.3); g.ell(cx, cy, 1.4, 0.3, 0)
        g.line(cx, cy, 8 + (cx - 8) * 0.3, 8 + (cy - 8) * 0.3)
    g.R(7, 11, 8, 14)
    return g, (8, 7)

def s_beacon():
    g = _P()
    g.R(4, 6, 11, 12)
    g.R(7, 3, 8, 5)
    g.ell(11, 3, 3.2, 2.6); g.ell(11, 3, 1.6, 1.3, 0); g.S(11, 3, 1)
    g.H(5, 10, 10, 10)
    g.line(6, 12, 2, 15); g.line(9, 12, 13, 15)
    g.R(1, 15, 3, 15); g.R(12, 15, 14, 15)
    return g, (7, 7)

def _quadg(k, st):
    g = _P()
    if st == 3:
        g.ell(7.5, 8.5, 4.2, 2.5)
        g.line(4.5, 9.5, 2, 11); g.line(2, 11, 1, 15)
        g.line(6.2, 10.5, 5, 15); g.line(9, 10.5, 10.5, 15)
        g.line(11, 9.5, 13.5, 11); g.line(13.5, 11, 15, 15)
        g.ell(12, 6, 2.0, 1.7)
        g.line(12.5, 4.5, 13.5, 2); g.line(13.5, 2, 15, 2)
    elif st == 4:
        g.ell(7.5, 8.5, 4.6, 2.9)
        g.line(4, 9.5, 1.5, 11); g.line(1.5, 11, 0.5, 15)
        g.line(6, 11, 4.5, 15); g.line(9.5, 11, 11, 15); g.line(11.5, 9.5, 14, 11); g.line(14, 11, 15, 15)
        g.ell(12, 5.5, 2.3, 1.9)
        g.line(12.5, 4, 13.5, 1); g.line(13.5, 1, 15, 1)
    else:
        g.ell(7.5, 8.5, 5.2, 3.2)
        g.ell(7.5, 8.5, 2.0, 1.2, 0)
        for (a, b, c, d) in ((3, 9.5, 0.5, 11), (5.5, 11, 3.5, 15), (8.5, 11.5, 8, 15), (10.5, 11, 12, 15), (12.5, 9.5, 15, 11)):
            g.line(a, b, c, d)
        g.line(0.5, 11, 0, 15); g.line(15, 11, 15, 15)
        g.ell(12, 5, 2.4, 2.0)
        g.R(10, 1, 10, 2); g.R(12, 0, 12, 2); g.R(14, 1, 14, 2)
    return g

def s_rustbucket():
    return _quadg(1.0, 3), (12, 6)

def s_scrapper():
    return _quadg(1.0, 4), (12, 6)

def s_gravelord():
    return _quadg(1.0, 5), (12, 5)

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


def _one(fn, hr=2.4):
    g, (ex, ey) = fn()
    g._raw(ex, ey, 0)
    xs = [x for y in range(11, 16) for x in range(16) if g.p[y][x]] or [4]
    ent = dict(rows=g.rows(), head=(ex, ey, hr), eye=(ex, ey), body=(min(xs), max(xs)))
    return dict(by_stage={st: ent for st in range(1, 6)})

ARCH_BOT = {
 'bot_orb':  _build(_orb, (8, 9, 3.5), (9, 9), (4, 12)),
 'bot_cube': _build(_cube, (7.5, 10, 3.2), (8.5, 9), (4, 11)),
 'bot_junk': _build(_junk, (9, 7, 2.6), (9, 7), (2, 13)),
}
for _n, _f in list(globals().items()):
    if _n.startswith('s_'): ARCH_BOT['bot_' + _n[2:]] = _one(_f)
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
