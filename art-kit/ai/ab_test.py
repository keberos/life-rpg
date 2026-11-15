# A/B test for paint settings on one raw body strip. Writes one strip per variant
# (with the weapon layer) and a comparison sheet, so the owner can judge.
# Usage: python ab_test.py <raw strip> <weapon layer|-> <out dir> <reference png|-> [ref frame]
#   reference: a painted strip (or single frame) the IP-Adapter copies the look from;
#   ref frame: which 128 px frame of it to use (default 1).
import os, sys
import numpy as np
from PIL import Image
import repaint as rp
from paint_bodies import LOOK, STYLE

raw, weapon, out, ref = sys.argv[1:5]
ref_frame = int(sys.argv[5]) if len(sys.argv) > 5 else 1
os.makedirs(out, exist_ok=True)
cls = os.path.basename(raw).split('-')[0]
prompt = f'{STYLE}, {LOOK[cls]}'


def ref_image():
    im = Image.open(ref).convert('RGBA')
    S = im.height
    fr = im.crop((ref_frame * S, 0, ref_frame * S + S, S)) if im.width > S else im
    bg = Image.new('RGBA', fr.size, rp.BG + (255,))
    bg.alpha_composite(fr)
    return bg.convert('RGB').resize((512, 512), Image.NEAREST)


VARIANTS = [
    # name, ip-adapter on, downscale
    ('A-two-pass', False, 'mode'),
    ('B-ipadapter', True, 'mode'),
    ('C-ipadapter-pixeloe', True, 'pixeloe'),
    ('D-two-pass-pixeloe', False, 'pixeloe'),
]
need_ipa = ref != '-'
pipe = rp.build_repaint_pipe(ip_adapter=need_ipa)
rows = []
for name, ipa, down in VARIANTS:
    if ipa and not need_ipa:
        continue
    rp.DOWN = down
    rp.REF = ref_image() if ipa else None
    if need_ipa:
        pipe.set_ip_adapter_scale(rp.REF_SCALE if ipa else 0.0)
        if not ipa:
            rp.REF = ref_image()  # adapter loaded but at 0: still needs an image
    sheet = os.path.join(out, f'{name}.sheet.png')
    dest = os.path.join(out, f'{name}.png')
    rp.repaint_sheet(raw, sheet, prompt, 0.6, 23, 28, pipe=pipe)
    rp.refine(raw, sheet, dest, prompt, 0.45, 7, 28, pipe=pipe)
    os.remove(sheet)
    rows.append((name, dest))

# Comparison sheet: one row per variant, weapon stacked, 3x.
strips = []
for name, path in rows:
    im = Image.open(path).convert('RGBA')
    if weapon != '-':
        im.alpha_composite(Image.open(weapon).convert('RGBA'))
    strips.append(im)
W, H = strips[0].size
sheet = Image.new('RGBA', (W, H * len(strips)), (60, 64, 80, 255))
for i, im in enumerate(strips):
    sheet.alpha_composite(im, (0, i * H))
sheet = sheet.resize((W * 3, H * len(strips) * 3), Image.NEAREST)
sheet.save(os.path.join(out, 'compare.png'))
print('rows:', ', '.join(n for n, _ in rows))
print('wrote', os.path.join(out, 'compare.png'))
