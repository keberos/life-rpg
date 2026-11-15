# Sprite repaint pipeline (local, offline once models are downloaded).
#
# repaint: an art-kit strip (N frames of SIZE x SIZE RGBA) is upscaled 8x, used as
#   both the img2img start and (as edges) the ControlNet guide, so pose, gear and
#   proportions stay ours. SDXL + Pixel Art XL repaints it as 2D pixel art. The
#   result is reduced back to the exact pixel grid (8x8 block mode), all frames
#   share one palette (no color flicker), and our sprite's silhouette mask is kept.
# create: text-to-image for things with no art-kit model yet (bosses), on a plain
#   background that is then removed.
#
# repaint_sheet + refine (two-pass): paint all frames as one sheet so the outfit
#   is the same in every frame, then a light per-frame pass for face detail.
#
# Run through `npm run paint` (art-kit/cli/paint.ts), which finds the Python venv.
# Direct use:
#   python repaint.py repaint <strip.png> <out.png> "<prompt>" [strength] [seed] [colors]
#   python repaint.py create  <out.png> "<prompt>" [seed] [size] [colors]
import sys, os
import numpy as np
import torch, cv2
from PIL import Image
from diffusers import (AutoencoderKL, ControlNetModel, StableDiffusionXLControlNetImg2ImgPipeline,
                       StableDiffusionXLPipeline)
from sklearn.cluster import KMeans

# Models live outside the repo (several GB): LIFE_RPG_SD/models (see art-kit/ai/download.py).
ROOT = os.path.join(os.environ['LIFE_RPG_SD'], 'models')
UP = 8
NEG = 'blurry, 3d render, realistic, photo, smooth gradient, text, watermark, signature, extra limbs, extra arms, multiple characters, cropped, frame, border'
BG = (122, 128, 144)


# Options (set by callers before painting):
#   REF       PIL image the IP-Adapter copies identity/outfit from (None = off)
#   REF_SCALE IP-Adapter strength (0.3-0.5 keeps our pose and gear in charge)
#   DOWN      'mode' (8x8 block mode, ours) or 'pixeloe' (contrast-aware, PixelOE)
REF = None
REF_SCALE = 0.4
DOWN = 'mode'


def ipa_kwargs():
    return {'ip_adapter_image': REF} if REF is not None else {}


def load_common():
    vae = AutoencoderKL.from_pretrained(os.path.join(ROOT, 'vae-fp16-fix'), torch_dtype=torch.float16)
    return vae


def lora(pipe, w=1.1):
    pipe.load_lora_weights(os.path.join(ROOT, 'pixel-art-xl'), weight_name='pixel-art-xl.safetensors', adapter_name='pixel')
    pipe.set_adapters(['pixel'], adapter_weights=[w])


def to_grid(img: np.ndarray, size: int) -> np.ndarray:
    """Big render -> size x size. 'mode': each pixel is the most common color in its block
    (no blending). 'pixeloe': PixelOE's contrast-aware downscale (keeps thin dark lines)."""
    if DOWN == 'pixeloe':
        return pixeloe_grid(img, size)
    h = img.shape[0] // size
    out = np.zeros((size, size, 3), np.uint8)
    for y in range(size):
        for x in range(size):
            blk = img[y * h:(y + 1) * h, x * h:(x + 1) * h].reshape(-1, 3)
            q = (blk // 8).astype(np.int32)
            keys = q[:, 0] * 1024 + q[:, 1] * 32 + q[:, 2]
            vals, cnt = np.unique(keys, return_counts=True)
            m = vals[cnt.argmax()]
            out[y, x] = blk[keys == m].mean(0)
    return out


def shared_palette(frames: list[np.ndarray], masks: list[np.ndarray], colors: int) -> list[np.ndarray]:
    px = np.concatenate([f[m] for f, m in zip(frames, masks)]).astype(np.float32)
    km = KMeans(n_clusters=min(colors, len(px)), n_init=4, random_state=0).fit(px[:: max(1, len(px) // 20000)])
    pal = km.cluster_centers_.astype(np.uint8)
    out = []
    for f in frames:
        d = ((f.reshape(-1, 1, 3).astype(np.int32) - pal.reshape(1, -1, 3)) ** 2).sum(-1)
        out.append(pal[d.argmin(1)].reshape(f.shape))
    return out


def cleanup(rgb: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Remove lone pixels (a pixel whose 4 neighbours all share one other color)."""
    o = rgb.copy()
    H, W = mask.shape
    for y in range(1, H - 1):
        for x in range(1, W - 1):
            if not mask[y, x]:
                continue
            n = [tuple(rgb[y - 1, x]), tuple(rgb[y + 1, x]), tuple(rgb[y, x - 1]), tuple(rgb[y, x + 1])]
            if n.count(n[0]) == 4 and n[0] != tuple(rgb[y, x]) and all(mask[y + dy, x + dx] for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1))):
                o[y, x] = n[0]
    return o


def outline(rgba: np.ndarray) -> np.ndarray:
    """1 px dark outline around the silhouette, in each edge pixel's own darkened color."""
    a = rgba[..., 3] > 0
    out = rgba.copy()
    H, W = a.shape
    for y in range(H):
        for x in range(W):
            if a[y, x]:
                continue
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and a[yy, xx]:
                    c = rgba[yy, xx, :3].astype(np.float32) * 0.3
                    out[y, x] = [int(c[0]), int(c[1]), int(c[2] + 10), 255]
                    break
    return out


def pixeloe_grid(img: np.ndarray, size: int) -> np.ndarray:
    from pixeloe.torch.pixelize import pixelize
    t = torch.from_numpy(img).permute(2, 0, 1)[None].float().div(255).cuda()
    out = pixelize(t, pixel_size=img.shape[0] // size, thickness=1, mode='contrast', do_color_match=True, do_quant=False, no_post_upscale=True)
    out = (out[0].permute(1, 2, 0).clamp(0, 1) * 255).byte().cpu().numpy()
    if out.shape[0] != size:
        out = cv2.resize(out, (size, size), interpolation=cv2.INTER_NEAREST)
    return out


def build_repaint_pipe(ip_adapter=False):
    vae = load_common()
    cn = ControlNetModel.from_pretrained(os.path.join(ROOT, 'controlnet-canny'), variant='fp16', torch_dtype=torch.float16)
    extra = {}
    if ip_adapter:
        from transformers import CLIPVisionModelWithProjection
        extra['image_encoder'] = CLIPVisionModelWithProjection.from_pretrained(os.path.join(ROOT, 'ip-adapter', 'models', 'image_encoder'), torch_dtype=torch.float16)
    pipe = StableDiffusionXLControlNetImg2ImgPipeline.from_pretrained(os.path.join(ROOT, 'sdxl-base'), controlnet=cn, vae=vae, variant='fp16', torch_dtype=torch.float16, **extra)
    if ip_adapter:
        # The image encoder adds ~1.3 GB: keep each model on the GPU only while it runs,
        # and decode in tiles, so wide sheets still fit in 16 GB.
        pipe.enable_model_cpu_offload()
        pipe.vae.enable_tiling()
    else:
        pipe = pipe.to('cuda')
    lora(pipe)
    if ip_adapter:
        pipe.load_ip_adapter(os.path.join(ROOT, 'ip-adapter'), subfolder='sdxl_models', weight_name='ip-adapter-plus_sdxl_vit-h.safetensors')
        pipe.set_ip_adapter_scale(REF_SCALE)
    pipe.set_progress_bar_config(disable=True)
    return pipe


def repaint(strip_path, out_path, prompt, strength=0.6, seed=7, colors=28, pipe=None):
    strip = np.array(Image.open(strip_path).convert('RGBA'))
    S = strip.shape[0]
    n = strip.shape[1] // S
    pipe = pipe or build_repaint_pipe()
    frames, masks = [], []
    for i in range(n):
        fr = strip[:, i * S:(i + 1) * S]
        mask = fr[..., 3] > 0
        rgb = fr[..., :3].copy()
        rgb[~mask] = BG
        big = cv2.resize(rgb, (S * UP, S * UP), interpolation=cv2.INTER_NEAREST)
        edges = cv2.Canny(big, 60, 140)
        edges = cv2.dilate(edges, np.ones((3, 3), np.uint8))
        ctrl = Image.fromarray(np.stack([edges] * 3, -1))
        g = torch.Generator('cuda').manual_seed(seed)
        img = pipe(prompt=prompt, negative_prompt=NEG, image=Image.fromarray(big), control_image=ctrl,
                   strength=strength, num_inference_steps=30, guidance_scale=6.5,
                   controlnet_conditioning_scale=0.55, generator=g, **ipa_kwargs()).images[0]
        frames.append(to_grid(np.array(img), S))
        masks.append(mask)
        print('frame', i, flush=True)
    frames = shared_palette(frames, masks, colors)
    out = np.zeros_like(strip)
    for i, (f, m) in enumerate(zip(frames, masks)):
        f = cleanup(f, m)
        rgba = np.zeros((S, S, 4), np.uint8)
        rgba[m, :3] = f[m]
        rgba[m, 3] = 255
        out[:, i * S:(i + 1) * S] = outline(rgba)
    Image.fromarray(out).save(out_path)
    print('wrote', out_path)


def create(out_path, prompt, seed=7, size=128, colors=28):
    vae = load_common()
    pipe = StableDiffusionXLPipeline.from_pretrained(os.path.join(ROOT, 'sdxl-base'), vae=vae, variant='fp16', torch_dtype=torch.float16).to('cuda')
    lora(pipe)
    g = torch.Generator('cuda').manual_seed(seed)
    img = np.array(pipe(prompt=prompt + ', plain flat white background', negative_prompt=NEG + ', scenery, ground, shadow',
                        num_inference_steps=30, guidance_scale=7.0, width=1024, height=1024, generator=g).images[0])
    grid = to_grid(img, size)
    # Remove the background: flood-fill from the corners through near-white pixels.
    bgmask = np.zeros((size + 2, size + 2), np.uint8)
    work = grid.copy()
    for cy, cx in ((0, 0), (0, size - 1), (size - 1, 0), (size - 1, size - 1)):
        cv2.floodFill(work, bgmask, (cx, cy), (255, 0, 255), (28, 28, 28), (28, 28, 28), flags=8 | (255 << 8))
    mask = bgmask[1:-1, 1:-1] == 0
    [pal] = shared_palette([grid], [mask], colors)
    pal = cleanup(pal, mask)
    rgba = np.zeros((size, size, 4), np.uint8)
    rgba[mask, :3] = pal[mask]
    rgba[mask, 3] = 255
    Image.fromarray(outline(rgba)).save(out_path)
    print('wrote', out_path)


if __name__ == '__main__':
    mode = sys.argv[1]
    if mode == 'repaint':
        a = sys.argv[2:]
        repaint(a[0], a[1], a[2], float(a[3]) if len(a) > 3 else 0.6, int(a[4]) if len(a) > 4 else 7, int(a[5]) if len(a) > 5 else 28)
    else:
        a = sys.argv[2:]
        create(a[0], a[1], int(a[2]) if len(a) > 2 else 7, int(a[3]) if len(a) > 3 else 128, int(a[4]) if len(a) > 4 else 28)


def repaint_sheet(strip_path, out_path, prompt, strength=0.6, seed=7, colors=28, pipe=None, cols=4, up=4):
    """Repaint all frames in ONE pass, laid out as a grid, so the outfit stays the same in every frame."""
    strip = np.array(Image.open(strip_path).convert('RGBA'))
    S = strip.shape[0]
    n = strip.shape[1] // S
    rows = (n + cols - 1) // cols
    T = S * up
    pipe = pipe or build_repaint_pipe()
    big = np.zeros((rows * T, cols * T, 3), np.uint8)
    big[:] = BG
    masks = []
    for i in range(n):
        fr = strip[:, i * S:(i + 1) * S]
        mask = fr[..., 3] > 0
        rgb = fr[..., :3].copy()
        rgb[~mask] = BG
        r, c = divmod(i, cols)
        big[r * T:(r + 1) * T, c * T:(c + 1) * T] = cv2.resize(rgb, (T, T), interpolation=cv2.INTER_NEAREST)
        masks.append(mask)
    edges = cv2.dilate(cv2.Canny(big, 60, 140), np.ones((3, 3), np.uint8))
    g = torch.Generator('cuda').manual_seed(seed)
    img = np.array(pipe(prompt=prompt + ', character sheet, same character in every pose', negative_prompt=NEG, image=Image.fromarray(big),
                        control_image=Image.fromarray(np.stack([edges] * 3, -1)), strength=strength, num_inference_steps=30,
                        guidance_scale=6.5, controlnet_conditioning_scale=0.55, width=cols * T, height=rows * T, generator=g, **ipa_kwargs()).images[0])
    frames = []
    for i in range(n):
        r, c = divmod(i, cols)
        frames.append(to_grid(img[r * T:(r + 1) * T, c * T:(c + 1) * T], S))
    frames = shared_palette(frames, masks, colors)
    out = np.zeros_like(strip)
    for i, (f, m) in enumerate(zip(frames, masks)):
        f = cleanup(f, m)
        rgba = np.zeros((S, S, 4), np.uint8)
        rgba[m, :3] = f[m]
        rgba[m, 3] = 255
        out[:, i * S:(i + 1) * S] = outline(rgba)
    Image.fromarray(out).save(out_path)
    print('wrote', out_path)


def refine(raw_path, painted_path, out_path, prompt, strength=0.35, seed=7, colors=28, pipe=None):
    """Second pass per frame at full detail: start from the painted (consistent) frame,
    guide with the art kit's own edges (face, hands), low strength so the design holds."""
    raw = np.array(Image.open(raw_path).convert('RGBA'))
    painted = np.array(Image.open(painted_path).convert('RGBA'))
    S = raw.shape[0]
    n = raw.shape[1] // S
    pipe = pipe or build_repaint_pipe()
    frames, masks = [], []
    for i in range(n):
        fr, pf = raw[:, i * S:(i + 1) * S], painted[:, i * S:(i + 1) * S]
        mask = fr[..., 3] > 0
        rr = fr[..., :3].copy(); rr[~mask] = BG
        pp = pf[..., :3].copy(); pp[~mask] = BG
        edges = cv2.dilate(cv2.Canny(cv2.resize(rr, (S * UP, S * UP), interpolation=cv2.INTER_NEAREST), 60, 140), np.ones((3, 3), np.uint8))
        start = cv2.resize(pp, (S * UP, S * UP), interpolation=cv2.INTER_NEAREST)
        g = torch.Generator('cuda').manual_seed(seed)
        img = pipe(prompt=prompt, negative_prompt=NEG, image=Image.fromarray(start), control_image=Image.fromarray(np.stack([edges] * 3, -1)),
                   strength=strength, num_inference_steps=30, guidance_scale=6.5, controlnet_conditioning_scale=0.7, generator=g, **ipa_kwargs()).images[0]
        frames.append(to_grid(np.array(img), S))
        masks.append(mask)
    frames = shared_palette(frames, masks, colors)
    out = np.zeros_like(raw)
    for i, (f, m) in enumerate(zip(frames, masks)):
        f = cleanup(f, m)
        rgba = np.zeros((S, S, 4), np.uint8)
        rgba[m, :3] = f[m]
        rgba[m, 3] = 255
        out[:, i * S:(i + 1) * S] = outline(rgba)
    Image.fromarray(out).save(out_path)
    print('wrote', out_path)
