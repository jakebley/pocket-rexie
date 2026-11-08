"""Render a contact sheet of a family at 16x16 and its Scale2x 32x32 form. Usage: python3 tools/sheet_family.py fox out.png"""
import importlib, sys, os
sys.path.insert(0, os.path.dirname(__file__)); sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'families'))
from PIL import Image, ImageDraw
import spritegen
mod = importlib.import_module(sys.argv[1]); out = sys.argv[2]
S = 8; hi = len(sys.argv) > 3 and sys.argv[3] == 'hi'
ids = list(mod.SPECIES)
cols = 12; cell = 36 * S if hi else 18 * S
rows = (len(ids) + cols - 1) // cols
img = Image.new('RGB', (cols * cell, rows * (cell + 14)), '#B5C19A'); d = ImageDraw.Draw(img)
for k, sid in enumerate(ids):
    name, stage, blurb, rec = mod.SPECIES[sid]
    fr, _ = spritegen.render(dict(rec, stage=stage))
    if hi: fr = spritegen.scale2x(fr)
    ox = (k % cols) * cell; oy = (k // cols) * (cell + 14)
    px = S // 2 if hi else S
    for y, r in enumerate(fr):
        for x, c in enumerate(r):
            if c == 'X':
                for dx in range(px - 1):
                    for dy in range(px - 1): img.putpixel((ox + x * px + dx, oy + y * px + dy), (43, 51, 32))
    d.text((ox + 2, oy + (len(fr) * px) + 1), name, fill=(43, 51, 32))
img.save(out); print('wrote', out, len(ids))
