# Layered heroes: the hero looks like the player (hairstyle, hair color, skin tone), in
# every class's outfit, without painting every combination. art-kit/cli/hero-layers.ts
# renders the inputs; this paints and composes them (npm run paint -- heroes ...).
#
#   paint [--ref] [--seed=N]  paint the SOURCES once each (two-pass, like the class bodies):
#                    hair-<style>-<kind>    the hairstyle on a plain person (no headwear)
#                    outfit-<class>-<kind>  the class outfit on a shaved head
#                  --ref adds the IP-Adapter with each class's approved frame (refs.json)
#   compose        build every TARGET (hairstyle x class x kind) from the painted sources:
#                    - the target's own id map (art kit) says which layer wins each pixel
#                    - the color comes from the source painted for that layer, at the same
#                      pixel, where that source shows the same layer and material
#                      ("paint in context, cut"); a moved part (a ribbon resting on hair)
#                      never takes the color of whatever sat there in the source
#                    - holes borrow the nearest pixel of that layer and material, then of
#                      that layer, else the raw art-kit pixel
#                    - tiny fragments (< 8 px) go to the layer around them
#                    - lines go where the TARGET has a line, not where a source had one
#                  then one shared palette and the silhouette outline. Writes
#                  public/sprites/hero/<style>/<class>-<kind>.png: the strip on top, a
#                  mask below (red 1 = skin, 2 = hair) that the app recolors.
#   sheet [out]    contact sheet of composed idle frames (default design/hero-looks.png)
#
# Usage: python hero_layers.py <work dir> <app sprites dir> paint|compose|sheet [...]
import os, sys, json, time
import numpy as np
from PIL import Image, ImageDraw

S = 128
GROUP = 7
SKIN, LINE, STAMP = 8, 16, 32
G_BODY, G_HAIR, G_OUTFIT = 1, 2, 3
MASK_SKIN, MASK_HAIR = 1, 2
OUTLINE_DARK = np.array([0x14, 0x0e, 0x1c], np.float32)


def load(path):
    return np.array(Image.open(path).convert('RGBA'))


def frames_of(strip):
    return [strip[:, i * S:(i + 1) * S] for i in range(strip.shape[1] // S)]


def paint(d, use_ref=False, seed=0):
    """seed: offset for a repaint of sources that slipped (delete their painted/*.png first)."""
    import repaint as rp
    from paint_bodies import load_refs
    meta = json.load(open(os.path.join(d, 'jobs.json'), encoding='utf-8'))
    os.makedirs(os.path.join(d, 'painted'), exist_ok=True)
    pipe = rp.build_repaint_pipe(ip_adapter=use_ref)
    refs = {c: rp.load_ref(r['path'], r.get('frame')) for c, r in load_refs().items()} if use_ref else {}
    t0 = time.time()
    todo = [n for n in meta['prompts'] if not os.path.exists(os.path.join(d, 'painted', n + '.png'))]
    print(f'{len(todo)} of {len(meta["prompts"])} sources to paint', flush=True)
    for i, name in enumerate(todo):
        prompt = meta['prompts'][name]
        raw = os.path.join(d, 'raw', name + '.png')
        dest = os.path.join(d, 'painted', name + '.png')
        sheet = dest + '.sheet.png'
        if use_ref:
            # The adapter stays loaded; at scale 0 it still needs an image (same as paint_bodies.py).
            cls = meta['refClass'].get(name, '')
            rp.REF = refs.get(cls) or next(iter(refs.values()), None) or rp.load_ref(raw, 0)
            pipe.set_ip_adapter_scale(rp.REF_SCALE if cls in refs else 0.0)
        rp.repaint_sheet(raw, sheet, prompt, 0.6, 23 + seed, 28, pipe=pipe)
        rp.refine(raw, sheet, dest, prompt, 0.45, 7 + seed, 28, pipe=pipe)
        os.remove(sheet)
        print(f'[{i + 1}/{len(todo)}] {name} ({time.time() - t0:.0f}s)', flush=True)


def nearest(src_rgb, src_ids, y, x, g, r=3, avoid_line=False, src_mat=None, mat=0):
    best, bd = None, 1e9
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            yy, xx = y + dy, x + dx
            if 0 <= yy < S and 0 <= xx < S and (src_ids[yy, xx] & GROUP) == g and not (avoid_line and src_ids[yy, xx] & LINE) \
                    and (src_mat is None or src_mat[yy, xx] == mat):
                dd = dy * dy + dx * dx
                if dd < bd:
                    best, bd = src_rgb[yy, xx], dd
    return best


def despeckle(ids, min_px=8):
    """Rule: a layer showing through another in a tiny fragment (a band edge poking
    through hair) goes to the layer around it. A whole paint would hide it too."""
    import cv2
    ids = ids.copy()
    g = ids & GROUP
    for grp in (G_BODY, G_HAIR, G_OUTFIT):
        n, lab, st, _ = cv2.connectedComponentsWithStats((g == grp).astype(np.uint8), connectivity=4)
        for c in range(1, n):
            if st[c, cv2.CC_STAT_AREA] >= min_px:
                continue
            ys, xs = np.nonzero(lab == c)
            nb = []
            for y, x in zip(ys, xs):
                for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= yy < S and 0 <= xx < S and g[yy, xx] not in (0, grp):
                        nb.append(int(g[yy, xx]))
            if nb:
                new = max(set(nb), key=nb.count)
                ids[ys, xs] = (ids[ys, xs] & np.uint8(0xFF ^ (GROUP | SKIN))) | np.uint8(new)
    return ids


def compose_target(d, t, kinds_hair, cache):
    """One target strip -> (rgba strip with mask row below, stats)."""
    import repaint as rp
    k = t['kind']
    hair_src = [] if t['style'] == 'bald' else [f"hair-{t['style']}-{k}"]
    others = [f'hair-{h}-{k}' for h in kinds_hair if h != t['style']]
    outfit = f"outfit-{t['cls']}-{k}"
    # Layer -> sources in order of preference. The person comes with the target's own hairstyle first.
    srcs = {G_BODY: hair_src + others + [outfit], G_HAIR: hair_src, G_OUTFIT: [outfit]}

    def get(n):
        if n not in cache:
            ids = frames_of(load(os.path.join(d, 'ids', n + '.png')))
            cache[n] = (frames_of(load(os.path.join(d, 'painted', n + '.png'))), [f[..., 0] for f in ids], [f[..., 1] for f in ids])
        return cache[n]

    tid = frames_of(load(os.path.join(d, 'ids', t['name'] + '.png')))
    tids, tmat = [f[..., 0] for f in tid], [f[..., 1] for f in tid]
    traw = frames_of(load(os.path.join(d, 'raw', t['name'] + '.png')))
    cut = hole = rawfill = 0
    out_frames, masks, layer_masks = [], [], []
    for f in range(len(tids)):
        ids = despeckle(tids[f])
        rgb = np.zeros((S, S, 3), np.uint8)
        mask = ids > 0
        for y, x in zip(*np.nonzero(mask)):
            g = int(ids[y, x] & GROUP)
            mt = 0 if ids[y, x] & SKIN else tmat[f][y, x]  # skin is recolored, any skin source works
            col = None
            for n in srcs.get(g, []):
                p, si, sm = (a[f] for a in get(n))
                if (si[y, x] & GROUP) == g and (not mt or sm[y, x] == mt):
                    col = p[y, x, :3]
                    # Contour rule: a source line where the target has none (old boundary) is replaced.
                    if si[y, x] & LINE and not ids[y, x] & LINE:
                        alt = nearest(p[..., :3], si, y, x, g, 2, avoid_line=True)
                        col = col if alt is None else alt
                    cut += 1
                    break
            if col is None and mt:
                for n in srcs.get(g, []):
                    p, si, sm = (a[f] for a in get(n))
                    col = nearest(p[..., :3], si, y, x, g, 10, src_mat=sm, mat=mt)
                    if col is not None:
                        hole += 1
                        break
            if col is None:
                for n in srcs.get(g, []):
                    p, si, _ = (a[f] for a in get(n))
                    col = nearest(p[..., :3], si, y, x, g)
                    if col is not None:
                        hole += 1
                        break
            if col is None:
                col = traw[f][y, x, :3]
                rawfill += 1
            rgb[y, x] = col
        # Contour rule: where the target has a line at a layer boundary, draw it dark.
        for y, x in zip(*np.nonzero(mask & ((ids & LINE) > 0))):
            g = ids[y, x] & GROUP
            nb = [ids[yy, xx] & GROUP for yy, xx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)) if 0 <= yy < S and 0 <= xx < S]
            if any(n and n != g for n in nb):
                rgb[y, x] = np.clip(rgb[y, x].astype(np.float32) * 0.55 + OUTLINE_DARK * 0.2, 0, 255)
        lm = np.zeros((S, S), np.uint8)
        lm[(ids & SKIN > 0) & (ids & STAMP == 0)] = MASK_SKIN
        lm[(ids & GROUP) == G_HAIR] = MASK_HAIR
        out_frames.append(rgb)
        masks.append(mask)
        layer_masks.append(lm)
    out_frames = rp.shared_palette(out_frames, masks, 32)
    n = len(out_frames)
    strip = np.zeros((2 * S, S * n, 4), np.uint8)
    for i, (fr, m, lm) in enumerate(zip(out_frames, masks, layer_masks)):
        rgba = np.zeros((S, S, 4), np.uint8)
        rgba[m, :3] = rp.cleanup(fr, m)[m]
        rgba[m, 3] = 255
        strip[:S, i * S:(i + 1) * S] = rp.outline(rgba)
        strip[S:, i * S:(i + 1) * S, 0] = lm
        strip[S:, i * S:(i + 1) * S, 3] = 255
    total = max(cut + hole + rawfill, 1)
    return strip, {'borrowedPct': round(100 * hole / total, 2), 'rawPct': round(100 * rawfill / total, 2)}


def compose(d, app_dir, only=None):
    meta = json.load(open(os.path.join(d, 'jobs.json'), encoding='utf-8'))
    styles = [s for s in meta['styles'] if s != 'bald']
    missing = [n for n in meta['prompts'] if not os.path.exists(os.path.join(d, 'painted', n + '.png'))]
    if missing:
        sys.exit(f'{len(missing)} sources not painted yet (npm run paint -- heroes paint): {", ".join(missing[:6])}...')
    cache, stats, t0 = {}, {}, time.time()
    targets = [t for t in meta['targets'] if not only or t['style'] in only or t['cls'] in only]
    for i, t in enumerate(targets):
        strip, st = compose_target(d, t, styles, cache)
        out = os.path.join(app_dir, 'hero', t['style'], f"{t['cls']}-{t['kind']}.png")
        os.makedirs(os.path.dirname(out), exist_ok=True)
        Image.fromarray(strip).save(out, optimize=True)
        stats[t['name']] = st
        print(f"[{i + 1}/{len(targets)}] {t['style']}/{t['cls']}-{t['kind']} {st} ({time.time() - t0:.0f}s)", flush=True)
    json.dump(stats, open(os.path.join(d, 'compose-stats.json'), 'w'), indent=2)


def sheet(d, app_dir, out, up=2):
    """Rows = hairstyles, columns = classes (idle frame 0 of each class's first kind)."""
    meta = json.load(open(os.path.join(d, 'jobs.json'), encoding='utf-8'))
    styles, classes = meta['styles'], meta['classes']
    label_w, head_h, cw = 90, 26, S * up
    im = Image.new('RGB', (label_w + len(classes) * cw, head_h + len(styles) * cw), (58, 62, 80))
    dr = ImageDraw.Draw(im)
    for c, cls in enumerate(classes):
        dr.text((label_w + c * cw + 8, 8), cls, fill=(230, 230, 230))
    for r, st in enumerate(styles):
        dr.text((8, head_h + r * cw + cw // 2), st, fill=(255, 214, 120))
        for c, cls in enumerate(classes):
            kind = meta['classKind'][cls]
            p = os.path.join(app_dir, 'hero', st, f'{cls}-{kind}.png')
            if not os.path.exists(p):
                continue
            fr = Image.fromarray(load(p)[:S, :S]).resize((cw, cw), Image.NEAREST)
            im.paste(fr, (label_w + c * cw, head_h + r * cw), fr)
    im.save(out)
    print('wrote', out)


if __name__ == '__main__':
    flags = {a for a in sys.argv[1:] if a.startswith('--')}
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    d, app_dir, cmd = args[0], args[1], args[2]
    if cmd == 'paint':
        seed = next((int(f.split('=')[1]) for f in flags if f.startswith('--seed=')), 0)
        paint(d, '--ref' in flags, seed)
    elif cmd == 'compose':
        compose(d, app_dir, args[3].split(',') if len(args) > 3 else None)
    elif cmd == 'sheet':
        sheet(d, app_dir, args[3] if len(args) > 3 else 'design/hero-looks.png')
    else:
        sys.exit('commands: paint [--ref] | compose [styles/classes] | sheet [out.png]')
