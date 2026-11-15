# Paint the raw art-kit class body strips (art-kit/out/modular/body) into the app's
# sprites (public/sprites/body).
#   two-pass (default): whole strip as one sheet (same outfit in every frame), then
#                       a light per-frame pass guided by the art kit's edges (faces).
#   frame:              each frame painted on its own (older, drifts between frames).
# Options (anywhere after the dirs):
#   --ref      IP-Adapter: copy each class's approved reference frame (refs.json);
#              classes with no reference yet are painted without it.
#   --pixeloe  PixelOE contrast-aware downscale instead of 8x8 block mode.
# Usage: python paint_bodies.py <raw dir> <out dir> [classes|all] [two-pass|frame] [seed] [--ref] [--pixeloe]
import os, sys, glob, json, time
import repaint as rp

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
# Approved reference frames per class: {"class": {"path": "...", "frame": n}}.
# frame is the 128 px frame of a strip; leave it out for a single image.
REFS_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'refs.json')


def load_refs():
    if not os.path.exists(REFS_FILE):
        return {}
    return {k: v for k, v in json.load(open(REFS_FILE, encoding='utf-8')).items() if not k.startswith('_')}


if __name__ == '__main__':
    flags = {a for a in sys.argv[1:] if a.startswith('--')}
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    raw, out = args[0], args[1]
    only = args[2].split(',') if len(args) > 2 and args[2] != 'all' else None
    mode = args[3] if len(args) > 3 else 'two-pass'
    seed = int(args[4]) if len(args) > 4 else 23
    use_ref = '--ref' in flags
    rp.DOWN = 'pixeloe' if '--pixeloe' in flags else 'mode'
    refs = load_refs() if use_ref else {}
    if use_ref and mode == 'frame':
        sys.exit('--ref works with two-pass only')
    os.makedirs(out, exist_ok=True)
    pipe = rp.build_repaint_pipe(ip_adapter=use_ref)
    # Reference images are read once (the pre-paint frame must not change mid-run
    # when a class's own strip is its reference).
    ref_img = {c: rp.load_ref(r['path'], r.get('frame')) for c, r in refs.items()}
    print(f"paint: {mode}, down={rp.DOWN}, ref={'on: ' + ', '.join(sorted(ref_img)) if use_ref else 'off'}", flush=True)
    t0 = time.time()
    for f in sorted(glob.glob(os.path.join(raw, '*.png'))):
        name = os.path.basename(f)
        cls = name.split('-')[0]
        if only and cls not in only:
            continue
        prompt = f'{STYLE}, {LOOK[cls]}'
        dest = os.path.join(out, name)
        if use_ref:
            # The adapter stays loaded; at scale 0 it still needs an image.
            rp.REF = ref_img.get(cls) or next(iter(ref_img.values()), None) or rp.load_ref(f, 0)
            pipe.set_ip_adapter_scale(rp.REF_SCALE if cls in ref_img else 0.0)
        if mode == 'frame':
            rp.repaint(f, dest, prompt, 0.6, 7, 28, pipe=pipe)
        else:
            sheet = dest + '.sheet.png'
            rp.repaint_sheet(f, sheet, prompt, 0.6, seed, 28, pipe=pipe)
            rp.refine(f, sheet, dest, prompt, 0.45, 7, 28, pipe=pipe)
            os.remove(sheet)
        print(f"{name}{' (ref)' if cls in ref_img else ''} ({time.time() - t0:.0f}s)", flush=True)
    print('done')
