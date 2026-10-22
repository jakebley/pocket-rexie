"""Generate the Pocket Rexie app icons (1024x1024, RGB, no alpha, square corners).

Run: python3 tools/make_icon.py
Writes light/dark/tinted PNGs to iOS and Watch AppIcon sets plus a 60px preview
sheet under /tmp when --preview is given. Art comes from tools/archetypes.py ('trex').
"""
import os
import sys

from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from archetypes import ARCH  # noqa: E402

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
N = 64          # logical pixel grid
CELL = 16       # 64 * 16 = 1024
GAP = 2         # gap between lit pixels

THEMES = {
    "icon-1024": dict(bg=(0xB5, 0xC1, 0x9A), ink=(0x2B, 0x33, 0x20), unlit=0.10),
    "icon-1024-dark": dict(bg=(0x1E, 0x24, 0x18), ink=(0xC9, 0xD6, 0xA6), unlit=0.09),
    "icon-1024-tinted": dict(bg=(0x20, 0x20, 0x20), ink=(0xF2, 0xF2, 0xF2), unlit=0.10),
}

SUN = [
    "...X....X...",
    "............",
    "...XXXXXX...",
    "X.XXXXXXXX.X",
    "..XXXXXXXX..",
    "..XXXXXXXX..",
    "..XXXXXXXX..",
    "X.XXXXXXXX.X",
    "...XXXXXX...",
    "............",
    "...X....X...",
]
SUN = ["....X..X....", "............", "....XXXX....", "X..XXXXXX..X", "..XXXXXXXX..",
       "..XXXXXXXX..", "..XXXXXXXX..", "X..XXXXXX..X", "....XXXX....", "............",
       "....X..X...."]
HEART = [
    ".XX..XX.",
    "XXXXXXXX",
    "XXXXXXXX",
    "XXXXXXXX",
    ".XXXXXX.",
    "..XXXX..",
    "...XX...",
]


def mix(a, b, t):
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))


def scene():
    """Return a set of lit (x, y) cells on the 64x64 grid."""
    lit = set()
    rows = ARCH["trex"]["rows"]
    # dino at 2x, x 16..47, y 19..50 (cells), standing on the ground at row 51
    ox, oy = 16, 19
    for y, r in enumerate(rows):
        for x, c in enumerate(r):
            if c == "X":
                for dy in (0, 1):
                    for dx in (0, 1):
                        lit.add((ox + 2 * x + dx, oy + 2 * y + dy))
    # ground line with a few pebbles
    for x in range(10, 55):
        lit.add((x, 51)); lit.add((x, 52))
    for x in (13, 14, 20, 38, 47, 48):
        lit.discard((x, 54))
    for x in (14, 15, 29, 30, 44):
        lit.add((x, 54))
    # sun (top-left) and heart (top-right)
    for y, r in enumerate(SUN):
        for x, c in enumerate(r):
            if c == "X":
                lit.add((10 + x, 10 + y))
    for y, r in enumerate(HEART):
        for x, c in enumerate(r):
            if c == "X":
                lit.add((45 + x, 9 + y))
    return lit


def render(theme, lit):
    bg, ink = theme["bg"], theme["ink"]
    img = Image.new("RGB", (N * CELL, N * CELL), bg)
    d = ImageDraw.Draw(img)
    unlit = mix(bg, ink, theme["unlit"])
    for cy in range(N):
        for cx in range(N):
            x0, y0 = cx * CELL, cy * CELL
            col = ink if (cx, cy) in lit else unlit
            d.rectangle([x0 + GAP // 2, y0 + GAP // 2, x0 + CELL - GAP // 2 - 1, y0 + CELL - GAP // 2 - 1], fill=col)
    return img


def main():
    lit = scene()
    imgs = {name: render(t, lit) for name, t in THEMES.items()}
    for sub in ("iOS", "Watch"):
        d = os.path.join(ROOT, sub, "Assets.xcassets", "AppIcon.appiconset")
        os.makedirs(d, exist_ok=True)
        for name, im in imgs.items():
            im.save(os.path.join(d, name + ".png"), optimize=True)
    if "--preview" in sys.argv:
        out = sys.argv[sys.argv.index("--preview") + 1]
        sheet = Image.new("RGB", (3 * 520, 520 + 80), (120, 120, 120))
        for i, im in enumerate(imgs.values()):
            sheet.paste(im.resize((500, 500), Image.LANCZOS), (i * 520 + 10, 10))
            small = im.resize((60, 60), Image.LANCZOS)
            sheet.paste(small, (i * 520 + 10, 520 + 10))
            sheet.paste(im.resize((120, 120), Image.LANCZOS).resize((60, 60)), (i * 520 + 90, 520 + 10))
        sheet.save(out)


if __name__ == "__main__":
    main()
