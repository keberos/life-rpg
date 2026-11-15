---
name: sprite-pipeline
description: How Life RPG makes its pixel-art sprites — art-kit renders, the local SDXL paint passes, modular body + weapon layers, comparison sheets. Use when producing, repainting or reviewing hero, weapon or boss sprites.
---

# Sprite pipeline

Everything runs locally and offline. The AI paints; the art kit owns pose,
proportions, gear shape and the pixel grid, so layers always line up.

## 1. Art kit (TypeScript, CPU)

- `npm run sprites` → raw class bodies `art-kit/out/modular/body/<class>-<kind>.png`
  (8 classes × punch/swing/spell) and weapon layers
  `public/sprites/held/<weapon>-<kind>.png` (used as-is, not AI-painted).
  `npm run sprites -- held <id,id>` re-exports only some weapons. ~3 min for all.
- Classes and their outfits: `art-kit/src/modular.ts` (`CLASS_BODIES`, built from
  `class-looks.ts`). Weapons: `art-kit/src/held-gear.ts` (`HELD_GEAR`,
  `CLASS_WEAPON`) and their shapes in `art-kit/src/weapons.ts`.
- New weapon = add it to `HELD_GEAR` (game gear id → art item + attack kind),
  export it, and the app shows it. Bodies don't change.
- Motion: attack keyframes are `ATTACKS` in `art-kit/src/battle.ts` (borrowed CC0
  clips, `art-kit/src/motion/`); idle is the 4-frame `stance`.
- Quick look at the raw render: open the PNG in `art-kit/out/`.

## 2. AI paint (Python, GPU) — `npm run paint -- ...`

Models: SDXL base 1.0 + fp16-fix VAE + ControlNet canny + Pixel Art XL LoRA.
Code: `art-kit/ai/` (`repaint.py` core, `paint_bodies.py` batch).

- `npm run paint -- bodies [classes|all] [two-pass|frame] [seed]` paints raw
  bodies into `public/sprites/body/`. **two-pass** (default): pass 1 paints the
  whole strip as one sheet so the outfit is identical in every frame; pass 2 is a
  light per-frame pass (strength 0.45) guided by the art kit's edges to bring back
  faces. ~1.5 min per strip; all 24 ≈ 40 min (run in the background).
- Class looks are the `LOOK` prompts in `art-kit/ai/paint_bodies.py`. Changing a
  class's look = edit its prompt (≤ ~45 words; CLIP stops at 77 tokens), repaint.
- Variants for the owner: paint to a scratch folder with different seeds, e.g.
  run `art-kit/ai/paint_bodies.py` via paint.ts with another out dir, or call
  `repaint_sheet`/`refine` from a small script; then compare.
- `npm run paint -- compare <out.png> <body>:<weapon> ...` stacks layers exactly as
  the app does (e.g. `ranger-swing:ranger-dagger-swing monk-punch:`), 3× scaled,
  one row per spec. It reads from `public/sprites/`.
- `npm run paint -- create <out.png> "<prompt>" [seed] [size] [colors]`:
  text-to-image on a plain background (boss candidates).

Post-process (in `repaint.py`): 8×8 block mode-downscale to the exact grid, one
k-means palette shared by all frames (no flicker), lone-pixel cleanup, 1 px
outline. The art-kit silhouette mask is kept.

## Known issues / ideas

- Free back arm looks like a club in the crouching swing frames (motion clip).
- Candidates to try: IP-Adapter (paint from one approved reference frame, best
  consistency) and PixelOE contrast-aware downscaling (sharper eyes/outlines).

## Checks

- `npx vitest run test/held-gear.test.ts`: every class × weapon has its files.
- Look at every output PNG before reporting. Report drift, missing eyes,
  misaligned weapons, outline gaps.
