// Hero appearance: the hero looks like the player. Hairstyle picks a pre-made layered
// strip (art kit + AI paint, one per hairstyle x class x attack kind, see
// art-kit/cli/hero-layers.ts); hair color and skin tone are recolored here, in the app,
// so they cost no extra art.
import { MATERIALS, vividRamp } from '../../art-kit/src/materials.ts';

export interface HeroLook {
  hair: string;
  hairColor: string;
  skin: string;
}

/** Hairstyles with painted strips (public/sprites/hero/<id>/). Order = picker order. */
export const HAIRSTYLES: { id: string; label: string }[] = [
  { id: 'short', label: 'Short' },
  { id: 'long', label: 'Long' },
  { id: 'ponytail', label: 'Ponytail' },
  { id: 'bun', label: 'Bun' },
  { id: 'swept', label: 'Swept' },
  { id: 'bald', label: 'Shaved' },
];

export const HAIR_COLORS: { id: string; label: string; mat: string }[] = [
  { id: 'black', label: 'Black', mat: 'hairBlack' },
  { id: 'brown', label: 'Brown', mat: 'hairBrown' },
  { id: 'blond', label: 'Blond', mat: 'hairBlond' },
  { id: 'red', label: 'Red', mat: 'hairRed' },
  { id: 'white', label: 'Gray', mat: 'hairWhite' },
];

export const SKIN_TONES: { id: string; label: string; mat: string }[] = [
  { id: 'fair', label: 'Fair', mat: 'skin' },
  { id: 'tan', label: 'Tan', mat: 'skinTan' },
  { id: 'deep', label: 'Deep', mat: 'skinDeep' },
];

/** What the strips are painted in; the app recolors from these. Must match art-kit/cli/hero-layers.ts. */
export const BASE_HAIR = 'hairBrown';
export const BASE_SKIN = 'skin';

export const DEFAULT_LOOK: HeroLook = { hair: 'short', hairColor: 'brown', skin: 'fair' };

const hairMat = (id: string) => HAIR_COLORS.find((c) => c.id === id)?.mat ?? BASE_HAIR;
const skinMat = (id: string) => SKIN_TONES.find((c) => c.id === id)?.mat ?? BASE_SKIN;

/** A look with unknown ids replaced by defaults (old saves, removed options). */
export function cleanLook(l: Partial<HeroLook> | undefined): HeroLook {
  const ok = <T extends { id: string }>(list: T[], id: string | undefined, d: string) => (list.some((x) => x.id === id) ? id! : d);
  return {
    hair: ok(HAIRSTYLES, l?.hair, DEFAULT_LOOK.hair),
    hairColor: ok(HAIR_COLORS, l?.hairColor, DEFAULT_LOOK.hairColor),
    skin: ok(SKIN_TONES, l?.skin, DEFAULT_LOOK.skin),
  };
}

type RGB = [number, number, number];
const OUTLINE_DARK: RGB = [0x14, 0x0e, 0x1c];
const rgb = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB;
const lum = (c: RGB) => c[0] * 0.299 + c[1] * 0.587 + c[2] * 0.114;
const mix = (a: RGB, b: RGB, t: number): RGB => [0, 1, 2].map((i) => a[i] * (1 - t) + b[i] * t) as RGB;

/**
 * Recolor by brightness along two ramps (same rule as the art kit's layer compose):
 * a pixel's brightness on the source ramp picks the matching tone on the target ramp,
 * so painted shading survives. Anchors: the ramp plus its outline-dark tone.
 */
export function rampMapper(fromMat: string, toMat: string): (c: RGB) => RGB {
  const anchors = (m: string) => {
    const cs = vividRamp(MATERIALS[m].ramp).map(rgb);
    return [mix(cs[0], OUTLINE_DARK, 0.3), ...cs];
  };
  const a = anchors(fromMat), b = anchors(toMat);
  const la = a.map(lum);
  return (c) => {
    const l = lum(c);
    if (l <= la[0]) return b[0].map((x) => x * (l / Math.max(la[0], 1))) as RGB;
    for (let i = 0; i < la.length - 1; i++) {
      if (l <= la[i + 1]) return mix(b[i], b[i + 1], (l - la[i]) / Math.max(la[i + 1] - la[i], 1e-3));
    }
    return b[b.length - 1].map((x) => Math.min(255, x * Math.min(l / la[la.length - 1], 1.15))) as RGB;
  };
}

/** Mask values in a hero strip's bottom half (red channel). */
export const MASK_SKIN = 1, MASK_HAIR = 2;

/**
 * Recolor a layered hero strip in place. `art` is the top half (RGBA), `mask` the bottom
 * half (same size): skin pixels go from the base skin to the look's tone, hair pixels from
 * the base hair color to the look's color. Everything else is left as painted.
 */
export function recolorHero(art: Uint8ClampedArray, mask: Uint8ClampedArray, look: HeroLook): void {
  const skin = skinMat(look.skin), hair = hairMat(look.hairColor);
  const maps: Record<number, ((c: RGB) => RGB) | null> = {
    [MASK_SKIN]: skin === BASE_SKIN ? null : rampMapper(BASE_SKIN, skin),
    [MASK_HAIR]: hair === BASE_HAIR ? null : rampMapper(BASE_HAIR, hair),
  };
  const cache = new Map<number, RGB>();
  for (let i = 0; i < art.length; i += 4) {
    const f = maps[mask[i]];
    if (!f || art[i + 3] === 0) continue;
    const key = (mask[i] << 24) | (art[i] << 16) | (art[i + 1] << 8) | art[i + 2];
    let out = cache.get(key);
    if (!out) cache.set(key, (out = f([art[i], art[i + 1], art[i + 2]])));
    art[i] = Math.round(out[0]);
    art[i + 1] = Math.round(out[1]);
    art[i + 2] = Math.round(out[2]);
  }
}

/** Path of the layered strip for a look (null for classes/kinds without one; the app falls back to the class body). */
export const heroStripPath = (look: HeroLook, classId: string, kind: string) => `sprites/hero/${look.hair}/${classId}-${kind}.png`;
