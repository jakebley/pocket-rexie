"""Procedural 16x16 side-view dino sprites. Pure functions, no deps. Facing right."""
import math

W = 16

class G:
    def __init__(self):
        self.p = [[0] * W for _ in range(W)]
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
    def rows(self, blink_eye=None):
        return ["".join("X" if c else "." for c in r) for r in self.p]

# stage layout: body center/radii, head center/radius, leg height, tail length
LAYOUT = {
    1: dict(bx=7, by=10.5, rx=4.0, ry=3.2, hx=9.5, hy=8.5, hr=3.0, leg=1, tail=2),
    2: dict(bx=6.5, by=10.0, rx=4.2, ry=3.0, hx=10.5, hy=6.5, hr=2.7, leg=2, tail=4),
    3: dict(bx=6.5, by=9.5, rx=5.0, ry=3.4, hx=11.0, hy=5.5, hr=3.0, leg=3, tail=5),
    4: dict(bx=6.5, by=9.0, rx=5.5, ry=3.8, hx=11.5, hy=4.5, hr=3.0, leg=3, tail=6),
    5: dict(bx=6.5, by=9.0, rx=6.0, ry=4.0, hx=11.5, hy=4.0, hr=3.2, leg=3, tail=6),
}

def top_y(L, x):
    d = (x - L['bx']) / L['rx']
    if abs(d) > 1: return None
    return L['by'] - L['ry'] * math.sqrt(1 - d * d)

def draw(r, blink=False):
    g = G()
    L = LAYOUT[r['stage']]
    bx, by, rx, ry = L['bx'], L['by'], L['rx'], L['ry']
    hx, hy, hr = L['hx'], L['hy'], L['hr']
    stage = r['stage']
    if r.get('head') == 'longneck':
        hy = max(3.0, hy - 2); hx = hx - 0.5
    heavy = r.get('fat', 0)
    if heavy:
        rx += 0.8; ry += 0.8; by += 0.4
    # tail
    tail = r.get('tail', 'short')
    tl = L['tail']
    tx0 = bx - rx + 0.5
    ty = by
    g.line(tx0, ty, tx0 - tl, ty + (0 if tail != 'droop' else 1), 1)
    g.line(tx0, ty + 1, tx0 - tl + 1, ty + 1, 1)
    if tail in ('long', 'club', 'spike', 'fin', 'curl', 'flame'):
        g.line(tx0, ty - 0.5, 0, ty - 1 if tail == 'curl' else ty, 1)
        g.line(tx0, ty + 0.5, 0, ty, 1)
    if tail == 'club':
        g.ellipse(1.3, ty - 0.5, 1.6, 1.6)
    if tail == 'spike':
        for sx in (1, 3):
            g.set(sx, ty - 2); g.set(sx, ty + 1)
        g.set(0, ty - 1)
    if tail == 'fin':
        g.line(0, ty - 3, 0, ty + 3, 1); g.line(1, ty - 2, 1, ty + 2, 1)
    if tail == 'curl':
        g.line(1, ty - 1, 0, ty - 4, 1); g.set(1, ty - 4)
    if tail == 'flame':
        for (x, y) in ((0, ty - 2), (1, ty - 3), (0, ty - 4), (2, ty - 2), (1, ty - 1)):
            g.set(x, y)
    # body
    g.ellipse(bx, by, rx, ry)
    # legs
    legs = r.get('legs', 2)
    lh = L['leg'] if stage > 1 else 1
    floor = 15
    xs = [bx - 1.5, bx + 2.0] if legs == 2 else [bx - 3.5, bx - 1.5, bx + 1.5, bx + 3.5]
    for x in xs:
        for y in range(int(by + ry - 1), floor + 1):
            g.set(x, y); g.set(x + 1, y)
        g.set(x + 2, floor)
    if stage == 1:
        g.ellipse(bx, by, rx, ry)
    # neck + head
    g.line(bx + rx - 1, by - 1, hx, hy + 1, 1)
    g.line(bx + rx - 1, by, hx - 1, hy + 2, 1)
    g.line(bx + rx - 2, by - 2, hx - 1, hy + 1, 1)
    head = r.get('head', 'round')
    if head == 'longneck':
        for yy in range(int(hy + 1), int(by - ry + 2)):
            g.set(hx + 0.5, yy); g.set(hx + 1.5, yy); g.set(hx - 0.5, yy)
    g.ellipse(hx, hy, hr * (0.8 if head == 'longneck' else 1), hr * 0.9 * (0.8 if head == 'longneck' else 1))
    if head == 'snout':
        for y in (hy, hy + 1):
            for x in range(int(hx + 1), int(hx + hr + 3)):
                g.set(x, y)
    if head == 'bill':
        for x in range(int(hx + 1), int(hx + hr + 3)):
            g.set(x, hy + 1)
    if head == 'horn':
        g.line(hx + 1, hy - hr + 0.5, hx + 3, hy - hr - 2, 1)
    if head == 'horns2':
        g.line(hx - 1, hy - hr + 0.5, hx - 2, hy - hr - 2, 1)
        g.line(hx + 1.5, hy - hr + 0.5, hx + 3, hy - hr - 2, 1)
    if head == 'crest':
        for dx in (-1, 0, 1):
            g.set(hx + dx - 0.5, hy - hr - 1); g.set(hx + dx - 0.5, hy - hr)
    if head == 'frill':
        g.ellipse(hx - hr + 0.5, hy - 1, hr * 0.9, hr * 1.3)
        g.ellipse(hx, hy, hr, hr * 0.9)
    # eye
    ex, ey = int(round(hx + 1)), int(round(hy - 1)) if stage > 1 else int(round(hy))
    # back details
    back = r.get('back')
    xsb = [x for x in range(0, W) if top_y(L, x) is not None]
    if back in ('plates', 'spikes', 'fur'):
        for i, x in enumerate(xsb):
            t = top_y(L, x)
            if t is None or x > bx + rx - 2: continue
            if back == 'fur':
                if i % 2 == 0: g.set(x, t - 1.0)
            elif back == 'plates':
                if i % 2 == 0:
                    g.set(x, t - 1.0); g.set(x, t - 2.0)
            else:
                if i % 2 == 0:
                    g.set(x, t - 1.0); g.set(x, t - 2.0); g.set(x, t - 3.0) if i % 4 == 0 else None
    if back == 'sail':
        for i, x in enumerate(xsb):
            t = top_y(L, x)
            if t is None or x > bx + rx - 2: continue
            hgt = 3 - abs(x - bx) * 0.5
            for k in range(1, int(max(1, hgt)) + 2):
                g.set(x, t - k)
    if back == 'shell':
        g.ellipse(bx - 0.5, by - 1.2, rx - 0.3, ry + 1.3)
        for (x, y) in ((bx - 2, by - 3), (bx, by - 4), (bx + 2, by - 3), (bx - 1, by - 2), (bx + 1, by - 2)):
            g.set(x, y, 0)
    # extras
    for ex_ in r.get('extra', []):
        if ex_ == 'fangs':
            g.set(hx + hr + (2 if head == 'snout' else 0), hy + 2); g.set(hx + 1.5 + (1 if head=='snout' else 0), hy + 2)
        elif ex_ == 'arms':
            g.set(bx + rx - 1, by + 1); g.set(bx + rx, by + 1); g.set(bx + rx + 1, by + 2)
        elif ex_ == 'wings':
            g.line(bx - 1, by - ry, bx - 6, by - ry - 6, 1)
            g.line(bx - 6, by - ry - 6, bx - 5, by - ry - 1, 1)
            g.line(bx - 1, by - ry, bx - 4, by - ry + 1, 1)
            g.line(bx - 5, by - ry - 4, bx - 2, by - ry - 1, 1)
            g.line(bx - 6, by - ry - 5, bx - 3, by - ry - 3, 1)
            g.line(bx - 4, by - ry - 3, bx - 1, by - ry - 3, 1)
        elif ex_ == 'leaf':
            g.line(hx, hy - hr, hx - 1, hy - hr - 2, 1); g.line(hx - 1, hy - hr - 2, hx + 1, hy - hr - 3, 1)
            g.set(hx, hy - hr - 2); g.set(hx + 1, hy - hr - 2)
        elif ex_ == 'noodle':
            for k, yy in enumerate(range(int(hy - hr - 2), int(hy - hr + 1))):
                g.set(hx - 2 + (k % 2) * 2, yy); g.set(hx + 1 - (k % 2) * 2, yy - 1)
            g.set(hx - 3, hy - hr - 1); g.set(hx + 3, hy - hr - 1)
        elif ex_ == 'crown':
            ty_ = hy - hr - 1
            for dx in (-2, 0, 2): g.set(hx + dx, ty_ - 1)
            for dx in range(-2, 3): g.set(hx + dx, ty_)
        elif ex_ == 'halo':
            for dx in range(-2, 3): g.set(hx + dx, hy - hr - 3)
            g.set(hx - 3, hy - hr - 2); g.set(hx + 3, hy - hr - 2)
            for dx in range(-2, 3): g.set(hx + dx, hy - hr - 1)
            g.set(hx - 2, hy - hr - 2, 0); g.set(hx + 2, hy - hr - 2, 0)
        elif ex_ == 'antenna':
            g.line(hx, hy - hr, hx - 1, hy - hr - 3, 1); g.set(hx - 2, hy - hr - 4); g.set(hx - 1, hy - hr - 4)
        elif ex_ == 'stripes':
            for x in range(int(bx - rx + 2), int(bx + rx - 1), 3):
                for y in range(int(by - ry + 1), int(by + ry - 1)):
                    g.set(x, y, 0)
        elif ex_ == 'spots':
            for (x, y) in ((bx - 2, by), (bx + 1, by - 1), (bx, by + 2), (bx - 3, by + 2)):
                g.set(x, y, 0)
        elif ex_ == 'belly':
            for x in range(int(bx - 2), int(bx + 3)):
                g.set(x, by + ry - 1.2, 0)
        elif ex_ == 'glasses':
            g.set(ex - 1, ey, 0); g.set(ex + 1, ey, 0)
            for dx in (-1, 0, 1): g.set(ex + dx, ey - 1, 1); g.set(ex + dx, ey + 1, 1)
            g.set(ex - 2, ey, 1); g.set(ex + 2, ey, 1); g.set(ex, ey, 0)
        elif ex_ == 'bolt':
            for (x, y) in ((bx - 1, by - 2), (bx, by - 1), (bx - 1, by), (bx, by + 1)):
                g.set(x, y, 0)
    g.set(ex, ey, 1 if blink else 0)
    return g

def render(r):
    return draw(r).rows(), draw(r, blink=True).rows()
