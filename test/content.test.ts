// Content pack sanity: catches typos in quest data before they reach the phone.
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { QUESTS, shuffleOptions } from '../app/content/quests.ts';
import { STAT_IDS } from '../src/engine/types.ts';

describe('quest content', () => {
  it('ids are unique', () => {
    expect(new Set(QUESTS.map((q) => q.id)).size).toBe(QUESTS.length);
  });

  it('mind stats have enough readings to last a 3-week playtest', () => {
    for (const s of ['INT', 'WIS', 'FTH'] as const) expect(QUESTS.filter((q) => q.stat === s).length, s).toBeGreaterThanOrEqual(10);
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

  it('quiz options are distinct and the right one is not a giveaway by length', () => {
    for (const q of QUESTS) for (const qq of q.questions ?? []) {
      const tag = `${q.id}: ${qq.q}`;
      expect(qq.options.length, tag).toBeGreaterThanOrEqual(3);
      expect(new Set(qq.options).size, tag).toBe(qq.options.length);
      const right = qq.options[qq.answer].length;
      const longestWrong = Math.max(...qq.options.filter((_, i) => i !== qq.answer).map((o) => o.length));
      // Short one-word recall answers are exempt; anything longer must not stand out.
      if (right > 15) expect(right / longestWrong, tag).toBeLessThanOrEqual(1.6);
    }
  });

  it('shuffling options keeps the right answer and moves it around', () => {
    const q = QUESTS.find((x) => x.questions)!.questions![0];
    const spots = new Set<number>();
    let seed = 1;
    const rng = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 40; i++) {
      const s = shuffleOptions(q, rng);
      expect(s.options[s.answer]).toBe(q.options[q.answer]);
      expect([...s.options].sort()).toEqual([...q.options].sort());
      spots.add(s.answer);
    }
    expect(spots.size).toBeGreaterThan(2);
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
