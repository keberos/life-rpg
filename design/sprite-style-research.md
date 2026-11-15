# Sprite style research: Final Fantasy Resonance (2026-11)

Reference for the next art-kit pass. We borrow *techniques*, not designs: no
characters, outfits or palettes copied from the game.

## What the reference is

Final Fantasy Resonance (Square Enix / Lancarse, Oct 2026) is an HD-2D remake of
Brave Exvius's first arc: pixel-art characters inside lit 3D scenes. Its battle
sprites come from the Brave Exvius line (~40-50 px tall characters, drawn
frame by frame). Studied: one lossless press sprite (91x79 px) and 4K press
screenshots, plus the producer/director interview on 80 Level.

## Findings

**Proportions and angle**
- Characters are about 2.7-3 heads tall: big head, short body. Readability at
  phone size comes from the head and the weapon, not from anatomy.
- Battle view is a fixed 3/4 angle: body turned toward the enemy, chest and face
  still angled at the viewer. The face is always visible (one big eye, the
  other partly hidden).
- The weapon arm is out in front and away from the torso. Weapons are
  oversized, held diagonally, and never cross the face.
- The interview: sprites don't turn with the camera automatically. They tweak
  each sprite's orientation per camera angle, and redraw it when needed.
  Lesson: choose the angle per pose so the important parts stay visible.

**Telling parts apart (the main lesson)**
- Each material gets its own hue family and its own contrast: gold
  (yellow-orange, near-white highlight), steel (cool grey, high contrast), cloth
  (saturated, low contrast), skin (warm pink), hair (soft ramp that differs
  from the gold metal).
- Neighbouring parts never share a value. Light metal sits on dark cloth, the
  red cape on a blue body. If two parts touch, one is clearly lighter.
- The outline is not one black line. Each part is outlined in the darkest
  shade of its own ramp (selective outline), and 1 px internal lines separate
  overlapping parts (belt from tunic, sleeve cuff from glove, armor plate
  edges).
- Weapons read as a thin bright line: a 1-2 px near-white edge on the blade
  with a dark edge beside it. That is the highest contrast on the whole
  sprite, so the eye finds it first.
- Small accents (gem, crest, emblem) are 1-3 px of a hue used nowhere else.

**Shading and motion (why theirs isn't muddy)**
- 3-4 shades per material, laid down as clean clusters. No single-pixel noise,
  no dithering on bodies.
- Light is fixed from the top-left and painted onto each part, so a part keeps
  its light and dark sides as it moves. Nothing is re-lit per frame.
- Animation is frame by frame, with no rotated or scaled pixels: a moving limb
  is redrawn, not rotated, so its clusters stay crisp.
- Edges are hard against the background. No halo, no soft second outline.

## What this means for our art kit (diagnosis of current sprites)

| Ours now | Their technique |
|---|---|
| Per-pixel 3D lighting + AO re-computed each frame, so speckles shuffle as limbs move | Shading painted per part in its own space; moves with the part |
| Orange halo ring around the whole figure | Per-part dark outline, hard edge |
| Weapon same value as sleeves, held across chest | Weapon brightest + darkest pair, held out and away |
| Front-facing camera, arms over torso | 3/4 toward the enemy, face and chest shown |
| Paint detail adds 1 px noise | Clusters only; 1 px reserved for edges and accents |

Plan: keep the rig for poses, but (1) shade in each part's local frame with
fixed bands, (2) drop AO/cast-shadow speckle, (3) outline per part plus
internal part-boundary lines, with no halo, (4) draw weapons as a separate
top layer with an edge-highlight ramp, (5) a 3/4 battle angle chosen per pose
so the weapon never covers the face or chest, (6) per-material hue/contrast
rules checked by a test (adjacent parts must differ in value).

Open question for the user: their ~3-heads-tall proportions vs the taller
heroic build we used so far (earlier feedback rejected big-head sprites).

Sources: 80 Level interview (Nakajima/Furuya, Oct 2026); Xbox Wire and Gematsu
press galleries; Kotaku preview.
