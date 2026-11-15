# Download the models for the sprite repaint pipeline (fp16 only, official repos).
#   SDXL base 1.0 (OpenRAIL++-M)          stabilityai/stable-diffusion-xl-base-1.0
#   SDXL VAE fp16 fix (MIT)               madebyollin/sdxl-vae-fp16-fix
#   ControlNet canny SDXL (OpenRAIL++-M)  diffusers/controlnet-canny-sdxl-1.0
#   Pixel Art XL LoRA (CreativeML OpenRAIL-M) nerijs/pixel-art-xl
#   IP-Adapter Plus SDXL ViT-H + image encoder (Apache-2.0) h94/IP-Adapter
import os, sys
from huggingface_hub import snapshot_download

root = os.path.join(os.environ['LIFE_RPG_SD'], 'models')
jobs = [
    ('stabilityai/stable-diffusion-xl-base-1.0', 'sdxl-base', [
        'model_index.json', 'scheduler/*', 'tokenizer/*', 'tokenizer_2/*',
        'text_encoder/config.json', 'text_encoder/model.fp16.safetensors',
        'text_encoder_2/config.json', 'text_encoder_2/model.fp16.safetensors',
        'unet/config.json', 'unet/diffusion_pytorch_model.fp16.safetensors',
        'vae/config.json', 'vae/diffusion_pytorch_model.fp16.safetensors',
    ]),
    ('madebyollin/sdxl-vae-fp16-fix', 'vae-fp16-fix', ['config.json', 'diffusion_pytorch_model.safetensors']),
    ('diffusers/controlnet-canny-sdxl-1.0', 'controlnet-canny', ['config.json', 'diffusion_pytorch_model.fp16.safetensors']),
    ('nerijs/pixel-art-xl', 'pixel-art-xl', ['pixel-art-xl.safetensors']),
    ('h94/IP-Adapter', 'ip-adapter', ['models/image_encoder/config.json', 'models/image_encoder/model.safetensors',
                                      'sdxl_models/ip-adapter-plus_sdxl_vit-h.safetensors']),
]
only = set(sys.argv[1:])
for repo, name, pats in jobs:
    if only and name not in only:
        continue
    path = snapshot_download(repo, local_dir=os.path.join(root, name), allow_patterns=pats)
    size = sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(path) for f in fs)
    print(f'{repo}: {size / 1e9:.2f} GB -> {path}', flush=True)
print('done')
