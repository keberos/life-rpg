# Contact sheet for choosing each class's IP-Adapter reference frame: one row per
# class, the idle frames (0-3) of its swing, punch and spell strips, each labeled
# "<strip> <frame>" so the owner can answer e.g. "warrior swing 2". Current refs
# (refs.json) are marked. No GPU, no models.
# Usage: python ref_sheet.py <painted body dir> <out.png> [classes|all] [scale]
import os, sys
from PIL import Image, ImageDraw
from paint_bodies import LOOK, load_refs

src, out = sys.argv[1], sys.argv[2]
only = sys.argv[3].split(',') if len(sys.argv) > 3 and sys.argv[3] != 'all' else list(LOOK)
k = int(sys.argv[4]) if len(sys.argv) > 4 else 2
STRIPS, FRAMES, S, LABEL, PAD = ['swing', 'punch', 'spell'], range(4), 128, 18, 4
refs = load_refs()
cell = S * k
W = 110 + len(STRIPS) * len(FRAMES) * (cell + PAD)
H = len(only) * (cell + LABEL + PAD * 3)
sheet = Image.new('RGBA', (W, H), (40, 44, 58, 255))
d = ImageDraw.Draw(sheet)
for row, cls in enumerate(only):
    y = row * (cell + LABEL + PAD * 3) + PAD
    ref = refs.get(cls)
    d.text((8, y + cell // 2), cls + ('\n(has ref)' if ref else ''), fill=(240, 220, 150) if ref else (220, 220, 230))
    x = 110
    for strip in STRIPS:
        path = os.path.join(src, f'{cls}-{strip}.png')
        im = Image.open(path).convert('RGBA') if os.path.exists(path) else None
        for f in FRAMES:
            bg = Image.new('RGBA', (S, S), (122, 128, 144, 255))
            if im:
                bg.alpha_composite(im.crop((f * S, 0, f * S + S, S)))
            sheet.alpha_composite(bg.resize((cell, cell), Image.NEAREST), (x, y))
            picked = ref and os.path.normpath(ref['path']) == os.path.normpath(path) and ref.get('frame', 1) == f
            if picked:
                d.rectangle((x - 2, y - 2, x + cell + 1, y + cell + 1), outline=(240, 200, 80), width=3)
            d.text((x + 4, y + cell + 3), f'{strip} {f}', fill=(240, 200, 80) if picked else (200, 205, 220))
            x += cell + PAD
sheet.save(out)
print('wrote', out)
