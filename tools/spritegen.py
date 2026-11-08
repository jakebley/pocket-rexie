"""Procedural dino sprites: scaled hand-drawn archetypes plus per-species extras. Facing right."""
import math
from archetypes import ARCH
from archetypes_fox import ARCH_FOX
ARCH = dict(ARCH); ARCH.update(ARCH_FOX)

W = 16
SCALE = {1: 0.0, 2: 0.62, 3: 0.82, 4: 1.0, 5: 1.0}

class G:
    def __init__(self, rows=None):
        self.p = [[0] * W for _ in range(W)]
        if rows:
            for y, r in enumerate(rows):
                for x, c in enumerate(r):
                    self.p[y][x] = 1 if c == 'X' else 0
    def set(self, x, y, v=1):
        x, y = int(round(x)), int(round(y))
        if 0 <= x < W and 0 <= y < W:
            self.p[y][x] = v
    def get(self, x, y):
        return self.p[y][x] if 0 <= x < W and 0 <= y < W else 0
    def ellipse(self, cx, cy, rx, ry, v=1):
        for y in range(W):
            for x in range(W):
                if ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1.0:
                    self.p[y][x] = v
    def line(self, x0, y0, x1, y1, v=1):
        n = int(max(abs(x1 - x0), abs(y1 - y0)) * 2) + 1
        for i in range(n + 1):
            t = i / n
            self.set(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, v)
    def top(self, x):
        for y in range(W):
            if self.p[y][int(x)]: return y
        return None
    def rows(self):
        return ["".join("X" if c else "." for c in r) for r in self.p]

def scaled(rows, f):
    """Area-average downscale of a 16x16 template, bottom-aligned and centred."""
    if f >= 1.0:
        return G(rows), 1.0, 0, 0
    n = max(6, round(W * f))
    f = n / W
    src = [[1 if c == 'X' else 0 for c in r] for r in rows]
    g = G()
    ox = (W - n) // 2
    oy = W - n
    for y in range(n):
        for x in range(n):
            x0, x1 = x / f, (x + 1) / f
            y0, y1 = y / f, (y + 1) / f
            tot = cnt = 0
            for sy in range(int(y0), min(W, int(math.ceil(y1)))):
                for sx in range(int(x0), min(W, int(math.ceil(x1)))):
                    tot += src[sy][sx]; cnt += 1
            if cnt and tot / cnt >= 0.4:
                g.p[oy + y][ox + x] = 1
    return g, f, ox, oy

BABY_ROWS = [
    '................',
    '......XXXX......',
    '....XXXXXXXX....',
    '...XXXX.XXXXX...',
    '..XXXXXXXXXXXX..',
    '..X.XX.XX.XX.X..',
    '..X..........X..',
    '..X.......XX.X..',
    '..X.......XX.X..',
    '..X..........X..',
    '..XX........XX..',
    '...XXXXXXXXXX...',
    '.X..XXXXXXXX....',
    '..XXXXXXXXXX....',
    '....XX....XX....',
    '...XXX...XXX....',
]

def baby(r, blink):
    """Hatchling: big head, tiny body, eggshell cap with zigzag rim, big eye, two feet."""
    g = G(BABY_ROWS)
    ex, ey = 10, 7
    if blink:
        g.set(10, 7, 0); g.set(11, 7, 0); g.set(10, 8, 0); g.set(11, 8, 0)
        for x in (9, 10, 11, 12): g.set(x, 8, 1)
    for e in r.get('extra', []):
        if e == 'leaf':
            for x in (7, 8, 9): g.set(x, 0)
            g.set(9, 1, 1)
    return g, (ex, ey)

def draw(r, blink=False):
    stage = r['stage']
    if stage == 1 and 'arch' not in r:
        g, (ex, ey) = baby(r, blink)
        return g
    arch = ARCH[r['arch']]
    if 'by_stage' in arch:  # built natively for this stage (thin features survive); no averaging
        arch = arch['by_stage'][stage]
        g, f, ox, oy = G(arch['rows']), 1.0, 0, 0
    else:
        f = r.get('scale', SCALE[stage])
        g, f, ox, oy = scaled(arch['rows'], f)
    hx, hy, hr = arch['head']
    hx, hy, hr = hx * f + ox, hy * f + oy, max(1.6, hr * f)
    ex, ey = arch['eye'][0] * f + ox, arch['eye'][1] * f + oy
    b0, b1 = arch['body'][0] * f + ox, arch['body'][1] * f + oy * 0 + ox
    if r.get('fat'):
        # fatten the belly by one pixel row/column
        for y in range(W - 1, 4, -1):
            for x in range(W):
                if g.p[y][x] and not g.get(x, y + 1) and y < 14:
                    g.set(x, y + 1)
    back = r.get('back')
    cols = [x for x in range(int(b0), int(b1) + 1) if 0 <= x < W]
    if back in ('fur', 'plates', 'spikes', 'sail', 'shell'):
        for i, x in enumerate(cols):
            t = g.top(x)
            if t is None: continue
            if back == 'fur' and i % 2 == 0:
                g.set(x, t - 1)
            elif back == 'plates' and i % 2 == 0:
                g.set(x, t - 1); g.set(x, t - 2)
            elif back == 'spikes' and i % 2 == 0:
                g.set(x, t - 1)
                if i % 4 == 0: g.set(x, t - 2)
            elif back == 'sail':
                mid = (b0 + b1) / 2
                for k in range(1, int(3 - abs(x - mid) * 0.5) + 2): g.set(x, t - k)
        if back == 'shell':
            for (x, y) in ((b0 + 2, 0), (b0 + 4, 0), (b0 + 6, 0)):
                t = g.top(int(x)) or 8
                g.set(x, t + 1, 0)
    tail = r.get('tail')
    if tail:
        # tail tip is the leftmost ink pixel
        tipx = min(x for y in range(W) for x in range(W) if g.p[y][x])
        tipy = max(y for y in range(W) if g.p[y][tipx] or False) if any(g.p[y][tipx] for y in range(W)) else 8
        tipy = [y for y in range(W) if g.p[y][tipx]][0]
        if tail == 'club':
            g.ellipse(tipx + 1, tipy, 1.6, 1.6)
        elif tail == 'spike':
            for sx in (tipx, tipx + 2):
                g.set(sx, tipy - 1); g.set(sx, tipy + 1)
        elif tail == 'flame':
            for (dx, dy) in ((0, -1), (1, -2), (0, -3), (2, -1), (1, 0)):
                g.set(tipx + dx, tipy + dy)
        elif tail == 'curl':
            g.line(tipx, tipy, tipx, tipy - 3, 1); g.set(tipx + 1, tipy - 3)
        elif tail == 'fin':
            g.line(tipx, tipy - 2, tipx, tipy + 2, 1)
    for e in r.get('extra', []):
        if e == 'fangs':
            g.set(hx + hr - 0.5, hy + hr * 0.8); g.set(hx + 0.5, hy + hr * 0.8)
        elif e == 'horn':
            g.line(hx + 1, hy - hr, hx + 2.5, hy - hr - 2, 1)
        elif e == 'horns2':
            g.line(hx - 1, hy - hr, hx - 2, hy - hr - 2, 1); g.line(hx + 1, hy - hr, hx + 2, hy - hr - 2, 1)
        elif e == 'crest':
            for dx in (-1, 0, 1): g.set(hx + dx, hy - hr - 1); g.set(hx + dx, hy - hr - 2) if dx == 0 else None
        elif e == 'leaf':
            g.line(hx, hy - hr, hx - 1, hy - hr - 2, 1); g.line(hx - 1, hy - hr - 2, hx + 1, hy - hr - 3, 1)
            g.set(hx, hy - hr - 2)
        elif e == 'noodle':
            for k in range(3):
                g.set(hx - 2 + k * 2, hy - hr - 1); g.set(hx - 1 + k * 2, hy - hr - 2)
            g.set(hx - 2, hy - hr)
        elif e == 'crown':
            ty = hy - hr - 1
            for dx in range(-2, 3): g.set(hx + dx, ty)
            for dx in (-2, 0, 2): g.set(hx + dx, ty - 1)
        elif e == 'halo':
            for dx in range(-2, 3): g.set(hx + dx, hy - hr - 3)
            g.set(hx - 3, hy - hr - 2); g.set(hx + 3, hy - hr - 2)
            for dx in range(-2, 3): g.set(hx + dx, hy - hr - 1)
        elif e == 'antenna':
            g.line(hx - 1, hy - hr, hx - 2, hy - hr - 3, 1); g.set(hx - 3, hy - hr - 4)
        elif e == 'glasses':
            for dx in (-1, 0, 1): g.set(ex + dx, ey - 1); g.set(ex + dx, ey + 1)
            g.set(ex - 1, ey); g.set(ex + 1, ey)
        elif e == 'stripes':
            for x in range(int(b0) + 1, int(b1), 3):
                for y in range(8, 12): g.set(x, y, 0)
        elif e == 'spots':
            for (x, y) in ((b0 + 2, 10), (b0 + 5, 9), (b0 + 4, 12)): g.set(x, y, 0)
        elif e == 'belly':
            for x in range(int(b0) + 2, int(b1) - 1): g.set(x, 12, 0)
        elif e == 'bolt':
            for (x, y) in ((b0 + 4, 8), (b0 + 5, 9), (b0 + 4, 10), (b0 + 5, 11)): g.set(x, y, 0)
        elif e == 'wings':
            bx = (b0 + b1) / 2
            g.line(bx, 7, bx - 4, 1, 1); g.line(bx - 4, 1, bx - 5, 5, 1); g.line(bx - 5, 5, bx - 2, 6, 1)
            g.line(bx - 3, 3, bx - 1, 6, 1)
        elif e in ('tails2', 'tails3', 'tails5'):
            n = int(e[-1])
            tipx = min(x for yy in range(W) for x in range(W) if g.p[yy][x])
            baseY = 9
            for k in range(n - 1):
                ang = (k + 1) / n
                tx = max(0, tipx - 1 + int(ang * 2)); ty = max(0, 6 - int(ang * 6))
                g.line(b0 + 1, baseY, tx, ty, 1); g.line(b0 + 1, baseY + 1, tx + 1, ty + 1, 1)
        elif e == 'scarf':
            for dx in range(-2, 3): g.set(hx + dx, hy + hr)
            g.set(hx - 2, hy + hr + 1); g.set(hx - 1, hy + hr + 1)
        elif e == 'arms':
            g.set(b1 + 1, 9); g.set(b1 + 2, 10)
    g.set(ex, ey, 1 if blink else 0)
    return g

def render(r):
    return draw(r).rows(), draw(r, blink=True).rows()


def scale2x(rows):
    """EPX / Scale2x pixel-art upscale: 16x16 -> 32x32 with diagonals smoothed and no blur."""
    n = len(rows)
    g = [[1 if c == 'X' else 0 for c in r] for r in rows]
    def at(x, y):
        return g[y][x] if 0 <= x < n and 0 <= y < n else 0
    out = [[0] * (n * 2) for _ in range(n * 2)]
    for y in range(n):
        for x in range(n):
            p = at(x, y); a = at(x, y - 1); b = at(x + 1, y); c = at(x - 1, y); d = at(x, y + 1)
            e1 = e2 = e3 = e4 = p
            if c == a and c != d and a != b: e1 = a
            if a == b and a != c and b != d: e2 = b
            if d == c and d != b and c != a: e3 = c
            if b == d and b != a and d != c: e4 = d
            out[2 * y][2 * x] = e1; out[2 * y][2 * x + 1] = e2
            out[2 * y + 1][2 * x] = e3; out[2 * y + 1][2 * x + 1] = e4
    return ["".join("X" if v else "." for v in r) for r in out]
