// Hero appearance: a look event, defaults, survives seasons, and the in-app recolor.
import { describe, expect, it } from 'vitest';
import { DEFAULT_LOOK, MASK_HAIR, MASK_SKIN, cleanLook, rampMapper, recolorHero } from '../app/content/appearance.ts';
import { DAY, derive, type LogEvent, type SaveFile } from '../app/state/model.ts';
import { MATERIALS, vividRamp } from '../art-kit/src/materials.ts';
import { STAT_IDS } from '../src/engine/types.ts';

const save = (events: LogEvent[], seasonStart = Date.now()): SaveFile => ({
  version: 1,
  profile: { id: 't', createdAt: 0, seasonStart, enabledStats: [...STAT_IDS], onboarded: true },
  events,
});
const look = { hair: 'long', hairColor: 'black', skin: 'deep' };

describe('hero look', () => {
  it('defaults with no appearance event (drop-in start: no picker wall)', () => {
    expect(derive(save([])).look).toEqual(DEFAULT_LOOK);
  });

  it('uses the latest pick, and keeps it in a new season', () => {
    const t0 = Date.now() - 70 * DAY;
    const s = derive(save([
      { at: t0, type: 'appearance', look: { hair: 'bun', hairColor: 'red', skin: 'tan' } },
      { at: t0 + DAY, type: 'appearance', look },
      { at: t0 + 60 * DAY, type: 'newSeason' },
    ], t0));
    expect(s.look).toEqual(look);
  });

  it('replaces unknown options with defaults', () => {
    expect(cleanLook({ hair: 'mullet', hairColor: 'black', skin: 'green' })).toEqual({ ...DEFAULT_LOOK, hairColor: 'black' });
  });

  it('maps each tone of the base ramp onto the same tone of the target ramp', () => {
    const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
    const from = vividRamp(MATERIALS.skin.ramp).map(rgb), to = vividRamp(MATERIALS.skinDeep.ramp).map(rgb);
    const f = rampMapper('skin', 'skinDeep');
    from.forEach((c, i) => f(c as [number, number, number]).forEach((v, k) => expect(Math.abs(v - to[i][k])).toBeLessThan(2)));
  });

  it('recolors only masked skin and hair pixels, and leaves the base look untouched', () => {
    const px = (r: number, g: number, b: number) => [r, g, b, 255];
    const art = new Uint8ClampedArray([...px(234, 166, 130), ...px(116, 68, 46), ...px(200, 30, 30)]);
    const mask = new Uint8ClampedArray([MASK_SKIN, 0, 0, 255, MASK_HAIR, 0, 0, 255, 0, 0, 0, 255]);
    const base = art.slice();
    recolorHero(base, mask, DEFAULT_LOOK);
    expect([...base]).toEqual([...art]);
    const out = art.slice();
    recolorHero(out, mask, look);
    expect([...out.slice(0, 3)]).not.toEqual([...art.slice(0, 3)]); // skin darker
    expect([...out.slice(4, 7)]).not.toEqual([...art.slice(4, 7)]); // hair black
    expect([...out.slice(8, 12)]).toEqual([...art.slice(8, 12)]); // outfit pixel kept
  });
});
