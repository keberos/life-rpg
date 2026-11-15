// Content pack sanity: catches typos in quest data before they reach the phone.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QUESTS } from '../app/content/quests.ts';
import { STAT_IDS } from '../src/engine/types.ts';

describe('quest content', () => {
  it('ids are unique', () => {
    expect(new Set(QUESTS.map((q) => q.id)).size).toBe(QUESTS.length);
  });

  it('every stat has at least 6 quests for the playtest', () => {
    for (const s of STAT_IDS) expect(QUESTS.filter((q) => q.stat === s).length, s).toBeGreaterThanOrEqual(6);
  });

  it('quiz answers point at a real option', () => {
    for (const q of QUESTS.filter((x) => x.kind === 'quiz')) {
      expect(q.questions?.length, q.id).toBeGreaterThan(0);
      for (const qq of q.questions!) {
        expect(qq.answer, `${q.id}: ${qq.q}`).toBeGreaterThanOrEqual(0);
        expect(qq.answer, `${q.id}: ${qq.q}`).toBeLessThan(qq.options.length);
      }
    }
  });

  it('reps and timer quests have a sane curve and use {n}', () => {
    for (const q of QUESTS.filter((x) => x.kind === 'reps' || x.kind === 'timer')) {
      expect(q.curve, q.id).toBeDefined();
      expect(q.curve!.min, q.id).toBeLessThanOrEqual(q.curve!.base);
      expect(q.curve!.base, q.id).toBeLessThan(q.curve!.max);
      expect(q.how, q.id).toContain('{n}');
    }
  });

  it('every guide picture has been exported', () => {
    for (const q of QUESTS) if (q.guide?.art) expect(existsSync(`public/exercises/${q.guide.art}.png`), q.id).toBe(true);
  });
});
