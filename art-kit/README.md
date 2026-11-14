# Art Kit

Our own sprite generator, so every character, outfit and weapon is original art
we own. Target look: classic top-down action-RPG pixel art (about 32 px tall
characters in 64x64 cells, 4 directions, dark outlines, 4-tone shaded colors),
the common style shared by many 16-bit-inspired games. No third-party sprites
are used, traced or referenced as input.

## How it works

Instead of hand-placing pixels frame by frame, characters are built from simple
3D shapes on a skeleton and rendered down to pixel art:

1. **Rig** (`src/rig.ts`): a humanoid skeleton with adult proportions (about
   four heads tall). Poses (idle, walk, attack) set joint angles per frame.
2. **Parts** (`src/wardrobe.ts`): the body, hair, clothes, armor and weapons are
   shapes attached to bones (capsules, rounded boxes, ellipsoids, cut-away
   shells). An outfit is defined once and then works in every direction and
   every animation frame, which is what makes a paper-doll system cheap.
3. **Renderer** (`src/render.ts`): an orthographic camera looks down at about
   30 degrees and casts one ray per pixel at 64x64. Lighting is quantized
   onto hand-tuned color ramps (cel shading), then a pixel pass adds the
   silhouette outline, inner contour lines where parts overlap, and cleanup.
4. **Materials** (`src/materials.ts`): 4-color ramps with hue-shifted shadows
   (skin, cloth, leather, steel, gold, magic glow). Gear rarity and class tier
   are mostly palette and part swaps.

Because every look is data, the game can render any combination of gear at
runtime, and progression (Commoner → Initiate → class → prestige) is just
more parts.

## Detail features (v2)

- **HD quality**: 96x96 cells with ~48 px characters (`quality: 'hd'`); `classic` keeps ~32 px.
- **Edge smoothing**: pixels on silhouettes and part borders vote with 4 sub-samples, so shapes read cleanly.
- **Ambient occlusion and cast shadows**: creases darken, arms and capes shade what's behind them.
- **Paint**: parts can paint surface detail by position (faces with eye whites and brows, plate
  seams and ridges, stitching, cloth folds, hair strands, trims, emblems).
- **Aura**: a look can carry a glow ring and sparkles (`aura: 'holy' | 'arcane'`) to mark prestige tiers.
- **Cleanup**: lone noisy pixels are merged into their surroundings (eyes and emblems are protected).

## Commands

```bash
node art-kit/cli/showcase.ts            # all looks, 4 directions + walk/attack frames
node art-kit/cli/progression.ts hd 4    # class lines, HD, scaled 4x (add "basic" to see the v1 renderer)
```

## Gear catalog (v3)

| Slot | Items |
| --- | --- |
| Head | hood, traveler hat, wizard hat, open helm, horned helm, knight helm, bandana, circlet, crown |
| Hair / face | short, long, spiky, bald, ponytail, bun, mohawk, braids; stubble, short beard, full beard |
| Body | shirt, tunic, leather vest, studded leather, brigandine, chainmail, plate, gi, coat, robe, tabard, stole, sash |
| Arms | bracers, wraps, plate gauntlets |
| Back | cape, cloak, fur mantle, quiver, backpack, greatsword, wings |
| Main hand | sword, axe, mace, hammer, spear, dagger, wand, runeblade, staff |
| Off hand | round shield, kite shield, bow, tome, lantern, orb |
| Neck / belt | amulet, belt with pouch, scabbard |
| Auras | holy, arcane, nature, flame, shadow |

```bash
node art-kit/cli/lineup.ts both 3   # classes.png (8 top-tier classes) + armory.png (every piece)
```

## Styles (v4)

`renderLook(look, { style: 'jrpg' })` vs `'classic'` (`src/styles.ts`):

| Knob | classic | jrpg |
| --- | --- | --- |
| Body | realistic | heroic: head x1.36, broad shoulders, narrow waist, longer legs, bigger hands/feet |
| Weapons | x1 | x1.35 (scaled about the hand) |
| Palette | muted | vivid: more saturation, shadows shift to blue-violet, highlights to warm yellow |
| Outline | dark | colored (sel-out), lighter on the lit side |
| Detail | all paint lines | drops shading-only lines; keeps colors, emblems, eyes, hair shine |
| Face | dot eyes | anime eyes (iris color, lid, catch-light), faces stay lit |
| Idle | relaxed | battle stance; 3/4 views `downRight`/`upLeft` |
| Camera | 28 deg | 18 deg (closer to eye level) |

Hair: `hero`, `swept`, `flowing` lock styles with an anime shine band. Flowing pieces that sway: `scarf`, `hairRibbon`, plus `crossStrap`.

```bash
node art-kit/cli/lineup.ts classes 3 jrpg     # classes-jrpg.png
node art-kit/cli/closeup.ts jrpg 5 0,3        # zoomed faces/details
```

## Sculpt pass (v5)

- **XL quality**: 128x128 cells, ~75 px characters (`quality: 'xl'`), for battle and portrait use.
- **Head**: round cranium + cheeks + a jaw tapering to a V chin (no more ball head).
- **Anime face**: thick upper lash line with a wing, oval iris with pupil, catch-light and lower glint,
  white of the eye, angled brows, nose shadow, small mouth.
- **Body**: V-shaped torso (broad chest, narrow waist), deltoids, biceps, forearms tapering to the wrist,
  mitten hands with thumbs, quads, knees, calves, heels and longer feet.
- **Poses**: torso twist and shoulder tilt against the hips (contrapposto) in the battle stance.
- **Rim light**: a back-right rim highlight on the shadow side (JRPG style).

```bash
node art-kit/cli/lineup.ts classes 2 jrpg xl   # XL lineup
node art-kit/cli/closeup.ts jrpg 4 0,2,6 xl    # XL close-ups (front, 3/4, side)
```
