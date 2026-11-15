// Pacing rules found with the season fast-forward: catch-up XP and scarce items.
import { beforeEach, describe, expect, it } from 'vitest';
import { paceLevel, secondWind, SECOND_WIND_MAX } from '../app/content/seasons.ts';
import { MAX_HELD_PER_ITEM } from '../app/state/drops.ts';
import { fastForward, SEASON_DAYS } from '../app/state/fastforward.ts';
import { grantStarterKit } from '../app/state/logic.ts';
import { store } from '../app/state/store.ts';

describe('Second Wind', () => {
  it('gives nothing at or above the season pace', () => {
    for (const d of [0, 7, 28, 56]) {
      expect(secondWind(Math.ceil(paceLevel(d)), d)).toBe(0);
      expect(secondWind(200, d)).toBe(0);
    }
  });

  it('grows with how far behind you are, up to the cap', () => {
    const d = 35;
    const pace = paceLevel(d);
    expect(secondWind(pace * 0.9, d)).toBeGreaterThan(0);
    expect(secondWind(pace * 0.6, d)).toBeGreaterThan(secondWind(pace * 0.9, d));
    expect(secondWind(6, d)).toBe(SECOND_WIND_MAX);
  });
});

describe('season pacing (simulated)', () => {
  beforeEach(() => {
    store.reset();
    grantStarterKit();
  });

  it('a casual player still beats the third boss (class mastery stays in reach)', () => {
    const r = fastForward({ style: 'casual', days: SEASON_DAYS + 1, autoFight: true, seed: 11 });
    expect(r.bosses.some((b) => b.tier === 3 && b.win)).toBe(true);
  });

  it('more play is never worse: an everyday player out-levels a casual one', () => {
    const casual = fastForward({ style: 'casual', days: SEASON_DAYS + 1, autoFight: true, seed: 3 }).weeks.at(-1)!.totalLevel;
    store.reset();
    grantStarterKit();
    const daily = fastForward({ style: 'daily', days: SEASON_DAYS + 1, autoFight: true, seed: 3 }).weeks.at(-1)!.totalLevel;
    expect(daily).toBeGreaterThan(casual);
  });

  it('battle items never pile up past the cap', () => {
    fastForward({ style: 'daily', days: SEASON_DAYS + 1, autoFight: true, seed: 5 });
    for (const n of Object.values(store.state().items)) expect(n).toBeLessThanOrEqual(MAX_HELD_PER_ITEM);
  });
});
