"""Cat archetypes (16x16, facing right, ground on row 15): hand-drawn poses, one per personality.
Poses: walk / walkl (slender) / trot, stalk (low), leap (pounce), sitcurl (upright, curled tail), sitfat, sitback (seen from behind),
loaf, sphinx, fluffy (long hair), lynx (ear tufts, bobbed tail), lynxfluff, arch (hissing), supine (on its back), king (lion mane),
panther, beckon (waving paw) and two kittens. Adult-size poses are drawn by hand; smaller stages are area-resampled from them
(or hand-drawn in SMALL). An 'o' marks the eye (a hole that the renderer fills in Technicolor).
Also registers the cat_* decorations."""
import os, sys
sys.path.insert(0, os.path.dirname(__file__))
import spritegen

P = {}
def pose(name, txt): P[name] = txt.strip('\n').split('\n')


pose('walk', """
..........X...X.
.XX.......XX.XX.
X.........XXXXX.
X.........XXXoX.
X..XXXXXXXXXXXX.
.XXXXXXXXXXXXX..
..XXXXXXXXXXXX..
..XXXXXXXXXXX...
...X..X..X..X...
...X..X..X..X...
...X..X..X..X...
...XX.XX.XX.XX..
""")
pose('walkl', """
..........X...X.
..........XX.XX.
..........XXXXX.
.XX.......XXXoX.
X.........XXXXX.
X..XXXXXXXXXXXX.
.XXXXXXXXXXXXX..
..XXXXXXXXXXX...
...X.X.....X.X..
...X.X.....X.X..
...X.X.....X.X..
...X.X.....X.X..
...XXX.....XXX..
""")
pose('stalk', """
...........X...X
...........XX.XX
...........XXXXX
X..........XXXoX
X...XXXXXXXXXXXX
XXXXXXXXXXXXXXX.
....XXXXXXXXXXX.
....XXXXXXXXXX..
....X..X...X..X.
....X..X...X..X.
....XX.XX..XX.XX
""")
pose('sitcurl', """
........X...X...
........XX.XX...
........XXXXX...
........XXXoX...
.........XXXX...
........XXXXX...
.......XXXXXX...
......XXXXXXX...
.XX..XXXXXXXX...
.X...XXXXXXXX...
.X..XXXXXXXXX...
.X..XXXXXXXXX...
.X..XXXXXXX.XX..
.XX.XXXXXXX.XX..
.XXXXXXXXXXXXX..
""")
pose('sitfat', """
.......X....X...
.......XX..XX...
.......XXXXXX...
.......XXXXoX...
.......XXXXXX...
......XXXXXXXX..
.....XXXXXXXXX..
XX..XXXXXXXXXXX.
X..XXXXXXXXXXXX.
X..XXXXXXXXXXXX.
X..XXXXXXXXXXXX.
X..XXXXXXX.XXXX.
XX.XXXXXXX.XXXX.
.XXXXXXXXXXXXXX.
""")
pose('loaf', """
........X....X..
........XX..XX..
........XXXXXX..
........XXXoXX..
........XXXXXX..
....XXXXXXXXXXX.
...XXXXXXXXXXXXX
..XXXXXXXXXXXXXX
..XXXXXXXXXXXXXX
.XXXXXXXXXXXXXX.
.XXXXXXXXXXXXXX.
XXXXXXXXXXXXXXX.
..XXXXXXXXXXXX..
""")
pose('sphinx', """
..........X...X.
..........XX.XX.
..........XXXXX.
..........XXXoX.
..........XXXXX.
.........XXXXXX.
........XXXXXXX.
...XXXXXXXXXXXX.
..XXXXXXXXXXXXXX
..XXXXXXXXXXXXXX
.XXXXXXXXXX.XXXX
XX.XXXXXXXXXXXXX
""")
pose('leap', """
..........X...X.
..........XX.XX.
..........XXXXX.
..........XXXoX.
..........XXXXX.
......XXXXXXXXXX
X....XXXXXXXXXX.
.X..XXXXXXXXX.XX
..XXXXXXXXXX...X
..XXXXXXXXX.....
..XXXXXXXX......
.XX.XX.XX.......
XX..X...........
""")
pose('stretch', """
..X.........X...
..X.........XX.X
..XX.......XXXXX
..XXXX.....XXXoX
..XXXXXXX..XXXXX
..XXXXXXXXXXXXXX
..XXXXXXXXXXXXXX
..XXXXXXXXXX....
..X..X..XX......
..X..X..........
..XX.XX.........
""")
pose('lynx', """
..........X...X.
..........X...X.
..........XX.XX.
..........XXXXX.
..........XXXoX.
.........XXXXXXX
.XX.XXXXXXXXXXX.
.XXXXXXXXXXXXX..
..XXXXXXXXXXX...
..XXXXXXXXXX....
...X.X....X.X...
...X.X....X.X...
...X.X....X.X...
...XXX...XXX....
""")
pose('sitback', """
.....X....X.....
.....XX..XX.....
.....XXXXXXX....
.....XXXXoXX....
.....XXXXXXX....
......XXXXX.....
.....XXXXXXX....
...XXXXXXXXX....
..XXXXXXXXXXX...
..XXXXXXXXXXX...
..XXXXXXXXXXX..X
..XXXXXXXXXXX..X
..XXXXXXXXXXX..X
...XXXXXXXXXX.XX
...XXXXXXXXXXXXX
""")
pose('fluffy', """
........X....X..
.XX.....XX..XX..
XXX.....XXXXXX..
XXX.....XXXoXX..
XXX....XXXXXXXX.
XXX...XXXXXXXXX.
XXX..XXXXXXXXXXX
XXX.XXXXXXXXXXX.
.XXXXXXXXXXXXXXX
.XXXXXXXXXXXXXX.
.XXXXXXXXXXXXXXX
..XXXXXXXXXXXXX.
..XXXXXXXXXXXXX.
...XXXXXXXXXXX..
""")
pose('arch', """
.XX.............
.XX..XXXX.......
.XX.XXXXXX.X...X
.XXXXXXXXXXXX.XX
..XXXXXXXXXXXXXX
..XX.XXXXXXXXXoX
..XX..XXXXXXXXXX
..X....XXXX.XXX.
..X..X.....X..X.
..X..X.....X..X.
..X..X.....X..X.
..XX.XX....XX.XX
""")
pose('supine', """
..XX.XX.XX......
..XX.XX.XX..X..X
..XX.XX.XX.XX.XX
..XXXXXXXXXXXXXX
.XXXXXXXXXXXXoXX
.XXXXXXXXXXXXXXX
.XXXXXXXXXXXXXX.
XXXXXXXXXXXXXX..
..XXXXXXXXXXX...
...XXXXXXXXX....
""")
pose('king', """
..........XX.XX.
.........XXXXXXX
........XXXXXXXX
........XXXXXXoX
........XXXXXXXX
.........XXXXXX.
..XXXXXXXXXXXXXX
.XXXXXXXXXXXXXXX
XXXXXXXXXXXXXXX.
X.XXXXXXXXXXXX..
XX.X..X....X..X.
X..X..X....X..X.
X..X..X....X..X.
XX.XX.XX...XX.XX
""")
pose('panther', """
..........X...X.
..........XX.XX.
..........XXXXX.
..........XXXoX.
..XXXXXXXXXXXXX.
.XXXXXXXXXXXXXX.
XXXXXXXXXXXXX...
X.XXXXXXXXXXX...
X..X..X...X..X..
X..X..X...X..X..
XX.X..X...X..X..
.X.XX.XX..XX.XX.
""")
pose('beckon', """
......X....X....
......XX..XX.XX.
......XXXXXX.XX.
......XXXoXX.XX.
......XXXXXX.XX.
.....XXXXXXXXXX.
....XXXXXXXXXX..
...XXXXXXXXXXX..
...XXXXXXXXXXX..
...XXXXXXXXXXX..
...XXXXXXXXXXX..
XX.XXXXXXXXXXX..
X..XXXXXXXXXXXX.
.XXXXXXXXXXXXXX.
""")
pose('lynxfluff', """
.........X....X.
.........X....X.
.........XX..XX.
........XXXXXXXX
........XXXXoXXX
.......XXXXXXXXX
......XXXXXXXXX.
.....XXXXXXXXXX.
....XXXXXXXXXXX.
...XXXXXXXXXXXX.
...XXXXXXXXXXXX.
...XXXXXXXXXXXX.
...XXXXXXXXXXXX.
..XX.XXXXXXXXXX.
..XX..XX.XXXXXX.
..XXXXXXXXXXXXX.
""")
pose('kita', """
.....X...X......
.....XX.XX......
.....XXXXX......
....XXXXXXX.....
....XXXoXXX.....
....XXXXXXX.....
.....XXXXX......
....XXXXXXX.....
...XXXXXXXXX....
...XXXXXXXXX..X.
XX.XXXXXXXXX.XX.
.X.XXXXXXXXXXXX.
.XXXXXXXXXXXXX..
""")

pose('trot', """
..........X...X.
..........XX.XX.
..........XXXXX.
X.........XXXoX.
X..XXXXXXXXXXXX.
.XXXXXXXXXXXXXX.
..XXXXXXXXXXXX..
..XXXXXXXXXXXX..
.XX..X....X.XXX.
XX...X....X...X.
X....X....X.....
XX..XX...XX.....
""")

pose('sitwrap', """
........X...X...
........XX.XX...
........XXXXX...
........XXXoX...
.........XXXX...
........XXXXX...
.......XXXXXX...
......XXXXXXX...
.....XXXXXXXX...
.....XXXXXXXX...
....XXXXXXXXX.XX
....XXXXXXXXX.XX
....XXXXXXX.XXX.
....XXXXXXX.XX..
..XXXXXXXXXXXXX.
..XXXXXXXXXXXXXX
""")

pose('kitb', """
........X...X...
........XX.XX...
........XXXXX...
........XXXoX...
.XX.....XXXXX...
..X.XXXXXXXXXX..
..XXXXXXXXXXXX..
..XXXXXXXXXXXX..
..X.X......X.X..
..X.X......X.X..
..XXX.....XXXX..
""")

pose('sniff', """
X...............
XXXXXXXX........
..XXXXXXXX.X...X
..XXXXXXXXXXX.XX
..XXXXXXXXXXXXXX
..XXXXXXXXXXXXoX
...X.X....X.XXXX
...X.X....X.....
...X.X....X.....
...XX.XX..XX....
""")

# ---- sizing ------------------------------------------------------------------------------
W = 16
STAGE_K = {1: 0.62, 2: 0.74, 3: 0.88, 4: 1.0, 5: 1.0}
SMALL = {}  # (pose, stage) -> hand-drawn rows for sizes where resampling is not good enough

SMALL[('kita', 1)] = """
....X....X......
....XX..XX......
....XXXXXX......
....XXXXoX......
....XXXXXX......
.....XXXXXX.....
....XXXXXXXX....
.X..XXXXXXXX....
.XX.XXXXXXXXX...
..XXXXXXXXXXX...
..XXXXXXXXXXX...
""".strip('\n').split('\n')
SMALL[('kitb', 1)] = """
.......X...X....
.......XX.XX....
.......XXXXX....
.......XXXoX....
.XX....XXXXX....
..X.XXXXXXXX....
..XXXXXXXXXXX...
..XXXXXXXXXXX...
..X.X.....X.X...
..X.X.....X.X...
..XXX....XXX....
""".strip('\n').split('\n')


SMALL[('loaf', 3)] = """
........X...X...
........XX.XX...
........XXXXX...
........XXXoX...
........XXXXX...
....XXXXXXXXXX..
...XXXXXXXXXXXX.
..XXXXXXXXXXXXX.
..XXXXXXXXXXXXX.
.XXXXXXXXXXXXX..
..XXXXXXXXXXXX..
""".strip('\n').split('\n')
SMALL[('loaf', 2)] = """
.......X...X....
.......XX.XX....
.......XXoXX....
.......XXXXX....
...XXXXXXXXXXX..
..XXXXXXXXXXXX..
..XXXXXXXXXXXX..
.XXXXXXXXXXXX...
..XXXXXXXXXXX...
""".strip('\n').split('\n')

def _parse(rows):
    """-> (grid[16][16] of 0/1, eye (x, y)) with the pose bottom-aligned"""
    g = [[0] * W for _ in range(W)]; eye = None
    for i, l in enumerate(rows):
        y = W - len(rows) + i
        for x, c in enumerate(l):
            if c in 'Xo': g[y][x] = 1
            if c == 'o': eye = (x, y)
    return g, eye

def _resample(g, eye, k):
    pts = [(x, y) for y in range(W) for x in range(W) if g[y][x]]
    x0, x1 = min(p[0] for p in pts), max(p[0] for p in pts); y0, y1 = min(p[1] for p in pts), max(p[1] for p in pts)
    w, h = x1 - x0 + 1, y1 - y0 + 1
    nw, nh = max(4, round(w * k)), max(4, round(h * k))
    ox = (W - nw) // 2; oy = W - nh
    out = [[0] * W for _ in range(W)]
    for y in range(nh):
        for x in range(nw):
            sx0, sx1 = x0 + x * w / nw, x0 + (x + 1) * w / nw; sy0, sy1 = y0 + y * h / nh, y0 + (y + 1) * h / nh
            tot = on = 0.0
            for yy in range(int(sy0), int(math.ceil(sy1))):
                for xx in range(int(sx0), int(math.ceil(sx1))):
                    a = (min(sx1, xx + 1) - max(sx0, xx)) * (min(sy1, yy + 1) - max(sy0, yy))
                    if a <= 0: continue
                    tot += a; on += a * g[yy][xx]
            if tot and on / tot >= 0.34: out[oy + y][ox + x] = 1
    ex = ox + int((eye[0] - x0 + 0.5) * nw / w); ey = oy + int((eye[1] - y0 + 0.5) * nh / h)
    return out, (ex, ey)

import math
def _bridge(g):
    """join small floating parts (a tail one pixel off the body) to the main silhouette by filling the one-pixel gap"""
    def comps():
        seen = set(); out = []
        for y in range(W):
            for x in range(W):
                if g[y][x] and (x, y) not in seen:
                    st, c = [(x, y)], []
                    while st:
                        p = st.pop()
                        if p in seen or not (0 <= p[0] < W and 0 <= p[1] < W) or not g[p[1]][p[0]]: continue
                        seen.add(p); c.append(p); st += [(p[0] + 1, p[1]), (p[0] - 1, p[1]), (p[0], p[1] + 1), (p[0], p[1] - 1)]
                    out.append(c)
        return out
    for _ in range(3):
        cs = comps()
        if len(cs) < 2: return
        main = max(cs, key=len); ms = set(main)
        for c in cs:
            if c is main: continue
            done = False
            for (x, y) in c:
                for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    mx, my, fx, fy = x + dx, y + dy, x + 2 * dx, y + 2 * dy
                    if 0 <= fx < W and 0 <= fy < W and not g[my][mx] and (fx, fy) in ms:
                        g[my][mx] = 1; done = True; break
                if done: break

def _clean(g, eye):
    _bridge(g)
    for y in range(W):
        for x in range(W):
            if g[y][x] and (x, y) != eye:
                n = sum(1 for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < W and 0 <= y + dy < W and g[y + dy][x + dx])
                if n == 0: g[y][x] = 0
    ex, ey = eye
    for dx, dy in ((0, 0), (1, 0), (-1, 0), (0, 1), (0, -1)):
        if 0 <= ex + dx < W and 0 <= ey + dy < W: g[ey + dy][ex + dx] = 1

def _entry(pose_name, stage):
    rows = SMALL.get((pose_name, stage)) or P[pose_name]
    g, eye = _parse(rows)
    if (pose_name, stage) not in SMALL and STAGE_K[stage] < 1.0:
        g, eye = _resample(g, eye, STAGE_K[stage])
    _clean(g, eye)
    ex, ey = eye
    xs = [x for y in range(W) for x in range(W) if g[y][x] and y >= ey + 1]
    b0 = min(xs) if xs else 2
    b1 = max(b0 + 2, ex - 3)
    return dict(rows=["".join('X' if c else '.' for c in r) for r in g], head=(ex - 1.6, ey + 0.5, 2.5), eye=(ex, ey), body=(b0, b1))

ARCH_CAT = {}
for _name in P: ARCH_CAT['cat_' + _name] = dict(by_stage={s: _entry(_name, s) for s in STAGE_K})
spritegen.register_archetypes(ARCH_CAT)

# ---- decorations -------------------------------------------------------------------------
# Eye rule (expo-prototype/src/ui/shading.ts): the topmost small hole(s) in the upper half are filled as eyes, and three or more
# holes in that band count as a pattern. So decorations never carve an enclosed hole at or above the eye row + 2; they cut notches
# from the outside edge, or put holes well below the eye (row >= eye + 3).
def _lit(g, x, y): return g.get(x, y)

def _ear_tips(g, c):
    """lit pixels on the highest row of the head region (both ear tips)"""
    hx = c['hx']; xs = range(max(0, int(hx - 3.5)), min(16, int(hx + 4.5)))
    top = min((y for x in xs for y in range(16) if g.get(x, y)), default=None)
    if top is None: return []
    return [(x, top) for x in xs if g.get(x, top)]

def cat_whiskers(g, c):
    """two whisker ticks (a V) at the cheek; the middle pixel stays empty so the face does not grow a snout"""
    y = int(round(c['ey'])) + 1
    xs = [x for x in range(int(c['hx']), 16) if g.get(x, y)]
    if not xs: return
    x = max(xs)
    for dy in (-1, 1):
        if x + 1 < 16 and not g.get(x + 1, y + dy) and g.get(x, y + dy): g.set(x + 1, y + dy)

def cat_bell(g, c):
    """collar: a dashed band across the neck with a bell (a lit pixel between two gaps)"""
    ny = int(round(c['ey'])) + 3
    if ny > 13: return
    xs = [x for x in range(16) if g.get(x, ny) and abs(x - c['hx']) <= 3.2]
    if len(xs) < 5: return
    x0 = xs[0] + (len(xs) - 5) // 2 + 0
    for i, x in enumerate(range(x0, x0 + 5)):
        if i != 2 and g.get(x - 1, ny) and g.get(x + 1, ny) and g.get(x, ny - 1) and g.get(x, ny + 1) and i not in (0, 4): g.set(x, ny, 0)
    # the dash is rim-to-rim: only the inner cells (1, 3) are holes; the end cells and the bell stay lit
    g.set(x0 + 2, ny + 1)

def cat_tufts(g, c):
    """lynx tufts: a pixel standing above each ear tip"""
    for x, t in _ear_tips(g, c):
        if t > 0: g.set(x, t - 1)

def cat_notch(g, c):
    """a torn ear: the tip of the right ear is bitten off"""
    tips = _ear_tips(g, c)
    if not tips: return
    x, t = tips[-1]
    g.set(x, t, 0)

def cat_tabby(g, c):
    """tabby marks: stripes cut into the back from the edge (never an enclosed hole)"""
    x = int(c['b0']) + 1; n = 0
    while x <= int(c['b1']) and n < 3:
        t = next((y for y in range(16) if g.get(x, y)), None)
        if t is not None and t >= c['ey'] and g.get(x, t + 3):
            g.set(x, t, 0); g.set(x, t + 1, 0); n += 1
        x += 3

def cat_spots(g, c):
    """a few holes low in the body (always below the eye + 3)"""
    cand = []
    for y in range(int(c['ey']) + 3, 14):
        for x in range(int(c['b0']), int(c['ex']) + 1):
            if all(g.get(x + dx, y + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1)): cand.append((x, y))
    got = []
    for (x, y) in sorted(cand, key=lambda p: (p[0] + p[1] * 2)):
        if all(abs(x - a) + abs(y - b) >= 4 for a, b in got) and len(got) < 3: got.append((x, y))
    for x, y in got: g.set(x, y, 0)

def cat_moon(g, c):
    """a crescent moon floating behind the head (4 x 5, open to the right)"""
    shape = [".XXX", "XX..", "XX..", "XX..", ".XXX"]
    best = None
    for x0 in range(0, 12):
        for y0 in range(0, 10):
            if all(not g.get(x0 + dx, y0 + dy) and not g.get(x0 + dx - 1, y0 + dy) and not g.get(x0 + dx + 1, y0 + dy) for dy in range(5) for dx in range(4)):
                d = abs(x0 + 2 - (c['hx'] - 4)) + abs(y0 - 1) * 0.6
                if best is None or d < best[0]: best = (d, x0, y0)
    if best:
        _, x0, y0 = best
        for dy, r in enumerate(shape):
            for dx, ch in enumerate(r):
                if ch == 'X': g.set(x0 + dx, y0 + dy)

def cat_halo(g, c):
    """a floating halo (a flat 7 x 2 ellipse) two rows above the ears; it is an open arch, never a hole"""
    tips = _ear_tips(g, c)
    if not tips: return
    top = tips[0][1]; cx = int(round(c['hx'])) + 1
    y = top - 3
    if y < 0: return
    for dx in range(-2, 3): g.set(cx + dx, y)
    for dx in (-3, 3): g.set(cx + dx, y + 1)
    for dx in (-2, 2): g.set(cx + dx, y + 1)

def cat_flame(g, c):
    """a flame standing on the tail tip (3 wide, 4 tall)"""
    ys = [(y, x) for x in range(0, 5) for y in range(16) if g.get(x, y)]
    if not ys: return
    ty, tx = min(ys)
    shape = [".X.", ".XX", "XXX", "XXX"]
    x0 = max(0, min(13, tx - 1)); y0 = ty - 4
    if y0 < 0: return
    for dy, r in enumerate(shape):
        for dx, ch in enumerate(r):
            if ch == 'X': g.set(x0 + dx, y0 + dy)

def cat_yarn(g, c):
    """a ball of yarn (3 x 3 ring) on the ground beside the paws, on whichever side has room"""
    for x0 in (12, 0, 11, 1):
        if all(not g.get(x, y) for x in range(x0 - 1, x0 + 4) for y in range(13, 16)) and x0 + 3 <= 16:
            for dx in range(3):
                for dy in range(3): g.set(x0 + dx, 13 + dy)
            g.set(x0 + 1, 14, 0)
            return

def cat_spark(g, c):
    """a sparkle (plus sign) floating beside the head"""
    best = None
    for x in range(1, 15):
        for y in range(1, 14):
            if all(not g.get(x + dx, y + dy) for dx in range(-2, 3) for dy in range(-2, 3)):
                d = abs(x - (c['hx'] - 4)) + abs(y - (c['hy'] - 2))
                if best is None or d < best[0]: best = (d, x, y)
    if best:
        _, x, y = best
        for dx, dy in ((0, 0), (-1, 0), (1, 0), (0, -1), (0, 1)): g.set(x + dx, y + dy)

def cat_ringtail(g, c):
    """banded tail: a gap cut across the thin tail"""
    tx = min(x for y in range(16) for x in range(16) if g.get(x, y))
    ys = [y for y in range(16) if g.get(tx, y)]
    if len(ys) >= 4 and not g.get(tx + 1, ys[1]): g.set(tx, ys[1], 0)

spritegen.EXTRA_HANDLERS.update({
 'cat_whiskers': cat_whiskers, 'cat_bell': cat_bell, 'cat_tufts': cat_tufts, 'cat_notch': cat_notch,
 'cat_tabby': cat_tabby, 'cat_spots': cat_spots, 'cat_moon': cat_moon, 'cat_halo': cat_halo,
 'cat_yarn': cat_yarn, 'cat_spark': cat_spark, 'cat_ringtail': cat_ringtail, 'cat_flame': cat_flame,
})
