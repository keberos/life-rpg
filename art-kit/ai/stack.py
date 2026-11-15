# Stack body + held layers like the app does, scale up 4x, write one preview sheet.
# Usage: python stack.py <public dir> <out.png> <body>:<held,...> ...
import sys, os
from PIL import Image

pub, out = sys.argv[1], sys.argv[2]
rows = []
for spec in sys.argv[3:]:
    body, _, held = spec.partition(':')
    img = Image.open(os.path.join(pub, 'sprites/body', body + '.png')).convert('RGBA')
    for h in filter(None, held.split(',')):
        img.alpha_composite(Image.open(os.path.join(pub, 'sprites/held', h + '.png')).convert('RGBA'))
    rows.append(img)
W = max(r.width for r in rows)
sheet = Image.new('RGBA', (W, sum(r.height for r in rows)), (60, 64, 80, 255))
y = 0
for r in rows:
    sheet.alpha_composite(r, (0, y))
    y += r.height
sheet = sheet.resize((sheet.width * 3, sheet.height * 3), Image.NEAREST)
sheet.save(out)
print('wrote', out, sheet.size)
