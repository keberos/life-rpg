# Paint the raw art-kit class body strips (art-kit/out/modular/body) into the app's
# sprites (public/sprites/body).
#   two-pass (default): whole strip as one sheet (same outfit in every frame), then
#                       a light per-frame pass guided by the art kit's edges (faces).
#   frame:              each frame painted on its own (older, drifts between frames).
# Usage: python paint_bodies.py <raw dir> <out dir> [classes|all] [two-pass|frame] [seed]
import os, sys, glob, time
from repaint import build_repaint_pipe, repaint, repaint_sheet, refine

STYLE = 'pixel art, 16-bit JRPG battle sprite, three-quarter view facing right, full body, empty hands, crisp dark outlines, clean shading'
# One look per class. Keep each under ~45 words: CLIP reads 77 tokens, STYLE uses ~30.
LOOK = {
    'adventurer': 'young adventurer, brown hair, plain linen shirt, tan trousers, simple boots',
    'warrior': 'young warrior, spiky red hair, red brigandine with gold rivets, fur mantle, steel pauldrons, dark leather trousers, boots',
    'paladin': 'young paladin knight, short blond hair, silver plate armor with gold trim, blue tabard, blue cape',
    # The user's pick (2026-11-15): leather chest armor with straps over the green tunic.
    'ranger': 'young ranger, dark hair in a ponytail, brown leather chest armor with buckled straps over a green tunic, green hooded short cape, leather bracers, tan trousers, brown boots',
    'monk': 'young monk, dark hair in a bun, orange gi with black sash, hand wraps',
    'sage': 'young sage, long white hair, tall purple wizard hat, purple robe with gold trim',
    'cleric': 'young cleric, long blond braids, white robe with gold trim, gold circlet',
    'spellblade': 'young spellblade, swept white hair, long black coat with silver trim, light trousers, boots, purple scarf',
}

if __name__ == '__main__':
    raw, out = sys.argv[1], sys.argv[2]
    only = sys.argv[3].split(',') if len(sys.argv) > 3 and sys.argv[3] != 'all' else None
    mode = sys.argv[4] if len(sys.argv) > 4 else 'two-pass'
    seed = int(sys.argv[5]) if len(sys.argv) > 5 else 23
    os.makedirs(out, exist_ok=True)
    pipe = build_repaint_pipe()
    t0 = time.time()
    for f in sorted(glob.glob(os.path.join(raw, '*.png'))):
        name = os.path.basename(f)
        cls = name.split('-')[0]
        if only and cls not in only:
            continue
        prompt = f'{STYLE}, {LOOK[cls]}'
        dest = os.path.join(out, name)
        if mode == 'frame':
            repaint(f, dest, prompt, 0.6, 7, 28, pipe=pipe)
        else:
            sheet = dest + '.sheet.png'
            repaint_sheet(f, sheet, prompt, 0.6, seed, 28, pipe=pipe)
            refine(f, sheet, dest, prompt, 0.45, 7, 28, pipe=pipe)
            os.remove(sheet)
        print(f'{name} ({time.time() - t0:.0f}s)', flush=True)
    print('done')
