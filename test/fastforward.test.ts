// Season fast-forward plays through the real game actions; these runs double
// as an end-to-end check of the whole loop (quests -> levels -> class -> bosses).
import { beforeEach, describe, expect, it } from 'vitest';
import { bossOdds, fastForward, SEASON_DAYS } from '../app/state/fastforward.ts';
import { grantStarterKit } from '../app/state/logic.ts';
import { store } from '../app/state/store.ts';

beforeEach(() => {
  store.reset();
  grantStarterKit();
});

describe('season fast-forward', () => {
  it('an everyday player reaches season end, picks a class and beats bosses', () => {
    const r = fastForward({ style: 'daily', days: SEASON_DAYS + 1, autoFight: true, seed: 7 });
    expect(r.stoppedFor).toBe('seasonEnd');
    expect(store.state().seasonOver).toBe(true);
    expect(r.quests).toBeGreaterThan(150);
    expect(r.classesPicked.length).toBe(1);
    expect(r.bosses.filter((b) => b.win).length).toBeGreaterThanOrEqual(3);
  });

  it('skipping Faith never trains it, and still beats the early bosses', () => {
    const r = fastForward({ style: 'noFaith', days: SEASON_DAYS + 1, autoFight: true, seed: 7 });
    expect(store.state().xp.FTH).toBe(0);
    expect(r.bosses.some((b) => b.tier === 2 && b.win)).toBe(true);
  });

  it('when fighting by hand, stops once a boss fight looks winnable', () => {
    const r = fastForward({ style: 'daily', days: SEASON_DAYS, autoFight: false, stopAtBoss: true, seed: 7 });
    expect(r.stoppedFor).toBe('boss');
    const g = store.state();
    expect(g.boss.defeated).toBe(false);
    expect(bossOdds(g)).toBeGreaterThanOrEqual(0.6);
    expect(r.bosses).toHaveLength(0);
    expect(g.seasonOver).toBe(false);
  });
});
