// Seasonal boss forms: Season 1 is the original bosses; later seasons rotate forms
// with the themes, cover every stat, and stay as fair as the originals.
import { describe, expect, it } from 'vitest';
import { BOSS_FORMS, bossForSeason, formIndex, seasonBosses } from '../src/content/boss-forms.ts';
import { corePack } from '../src/content/core-pack.ts';
import { STAT_IDS } from '../src/engine/types.ts';
import { themeFor } from '../app/content/seasons.ts';
import { ON_SCHEDULE_POINTS, buildStats, winRate } from '../src/sim/scenarios.ts';

describe('boss forms', () => {
  it('Season 1 keeps the original bosses', () => {
    for (const b of corePack.bosses) expect(bossForSeason(b, 1)).toEqual(b);
  });

  it('every boss has three forms with two different weaknesses', () => {
    for (const b of corePack.bosses) {
      expect(BOSS_FORMS[b.id]).toHaveLength(3);
      for (const f of BOSS_FORMS[b.id]) {
        expect(new Set(f.weakTo).size, f.id).toBe(2);
        expect(f.special.every, f.id).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('forms rotate with the theme, and each form is weak to a theme stat', () => {
    for (let n = 2; n <= 7; n++) {
      const theme = themeFor(n)!;
      expect(formIndex(n)).toBe((n - 2) % 3);
      for (const b of seasonBosses(n)) expect(b.weakTo.some((s) => theme.stats.includes(s)), `${n} ${b.name}`).toBe(true);
    }
  });

  it('every stat is a weakness at least once per season, so no build is left out', () => {
    for (let n = 1; n <= 4; n++) {
      const weak = new Set(seasonBosses(n).flatMap((b) => b.weakTo));
      for (const s of STAT_IDS) expect(weak.has(s), `season ${n} ${s}`).toBe(true);
    }
  });

  it('keeps the base id (progress and goals) but changes the name', () => {
    const b = bossForSeason(corePack.bosses[0], 3);
    expect(b.id).toBe(corePack.bosses[0].id);
    expect(b.name).not.toBe(corePack.bosses[0].name);
  });

  it('each form is about as fair as the original for an on-schedule player', () => {
    for (let n = 2; n <= 4; n++) {
      for (const b of seasonBosses(n)) {
        const r = winRate({ stats: buildStats('Balanced', ON_SCHEDULE_POINTS[b.tier]), boss: b, gear: 'common', items: true, policy: 'smart' }, 800);
        expect(r, b.name).toBeGreaterThan(0.62);
        expect(r, b.name).toBeLessThan(0.88);
      }
    }
  });
});
