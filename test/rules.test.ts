// Tests for the design rules in the concept doc. If balance changes break one
// of these, the change broke a promise to the player, not just a number.
import { describe, expect, it } from 'vitest';
import { corePack } from '../src/content/core-pack.ts';
import { TARGET_SUCCESS, paramFor, placementRating, updateRating } from '../src/engine/calibration.ts';
import { unlockedClasses } from '../src/engine/classes.ts';
import { fight } from '../src/engine/combat.ts';
import { questXp, levelFromXp, restedMultiplier, xpForLevel } from '../src/engine/progression.ts';
import { makeRng } from '../src/engine/rng.ts';
import { addStats, emptyStats } from '../src/engine/stats.ts';
import { STAT_IDS, type StatBlock } from '../src/engine/types.ts';
import { BUILDS, ON_SCHEDULE_POINTS, bestClass, buildStats, coinFlipShare, gearFor, winRate } from '../src/sim/scenarios.ts';

const randomStats = (rng: () => number): StatBlock => {
  const s = emptyStats();
  for (const id of STAT_IDS) s[id] = Math.floor(rng() * 30);
  return s;
};

describe('honor system and progression', () => {
  it('XP depends only on relative difficulty and outcome, never on quest type', () => {
    // questXp has no quest-type parameter at all; a hard plank pays like a hard quiz.
    expect(questXp('hard', 'success')).toBeGreaterThan(questXp('normal', 'success'));
    expect(questXp('normal', 'success')).toBeGreaterThan(questXp('easy', 'success'));
  });

  it('a failed attempt still earns XP (effort counts)', () => {
    expect(questXp('normal', 'fail')).toBeGreaterThan(0);
  });

  it('rested XP is a bonus, never a penalty, and is capped', () => {
    for (let d = 0; d <= 30; d++) expect(restedMultiplier(d)).toBeGreaterThanOrEqual(1);
    expect(restedMultiplier(30)).toBe(restedMultiplier(7));
  });

  it('levels rise monotonically with XP', () => {
    let prev = 1;
    for (let xp = 0; xp < 5000; xp += 7) {
      const l = levelFromXp(xp);
      expect(l).toBeGreaterThanOrEqual(prev);
      prev = l;
    }
    expect(levelFromXp(xpForLevel(10))).toBe(10);
  });
});

describe('no-lockout rules', () => {
  it('training any stat never removes an unlocked class (thresholds, not ratios)', () => {
    const rng = makeRng(42);
    for (let i = 0; i < 500; i++) {
      const before = randomStats(rng);
      const had = new Set(unlockedClasses(before, corePack.classes).map((c) => c.id));
      for (const s of STAT_IDS) {
        const after = addStats(before, { [s]: 1 + Math.floor(rng() * 10) });
        const has = new Set(unlockedClasses(after, corePack.classes).map((c) => c.id));
        for (const id of had) expect(has.has(id)).toBe(true);
      }
    }
  });

  it('every stat helps in every boss fight', () => {
    for (const boss of corePack.bosses) {
      const base = buildStats('Balanced', ON_SCHEDULE_POINTS[boss.tier] * 0.8);
      const cls = bestClass(base, boss, 'common');
      const r0 = winRate({ stats: base, boss, gear: 'common', items: false, policy: 'auto', cls }, 3000);
      for (const s of STAT_IDS) {
        const r = winRate({ stats: addStats(base, { [s]: 10 }), boss, gear: 'common', items: false, policy: 'auto', cls }, 3000);
        expect(r, `${boss.id} +10 ${s}`).toBeGreaterThan(r0);
      }
    }
  });

  // Current floor (pass 2). Lowest cells are specialist builds vs a boss weak to
  // stats they skipped. Goal: raise toward ~35% as gear and Legacy options land.
  const BUILD_FLOOR = 0.25;
  it(`every build, even ones skipping a stat, wins at least ${BUILD_FLOOR * 100}% on schedule`, () => {
    for (const boss of corePack.bosses) {
      for (const build of Object.keys(BUILDS)) {
        const r = winRate({ stats: buildStats(build, ON_SCHEDULE_POINTS[boss.tier]), boss, gear: 'common', items: true, policy: 'smart' }, 1500);
        expect(r, `${build} vs ${boss.id}`).toBeGreaterThanOrEqual(BUILD_FLOOR);
      }
    }
  });
});

describe('training pays off', () => {
  it('win rate rises with stat points against every boss', () => {
    for (const boss of corePack.bosses) {
      let prev = -1;
      for (const share of [0.7, 0.9, 1.1, 1.3]) {
        const r = winRate({ stats: buildStats('Balanced', ON_SCHEDULE_POINTS[boss.tier] * share), boss, gear: 'common', items: true, policy: 'smart' }, 1500);
        expect(r, `${boss.id} at ${share}`).toBeGreaterThan(prev);
        prev = r;
      }
    }
  });

  it('an on-schedule player is favored but not guaranteed', () => {
    for (const boss of corePack.bosses) {
      const r = winRate({ stats: buildStats('Balanced', ON_SCHEDULE_POINTS[boss.tier]), boss, gear: 'common', items: true, policy: 'smart' }, 2000);
      expect(r, boss.id).toBeGreaterThan(0.55);
      expect(r, boss.id).toBeLessThan(0.9);
    }
  });

  it('gear actives and battle items tilt a coin-flip fight noticeably, but do not decide it', () => {
    for (const boss of corePack.bosses) {
      const stats = buildStats('Balanced', ON_SCHEDULE_POINTS[boss.tier] * coinFlipShare(boss, 'epic'));
      const auto = winRate({ stats, boss, gear: 'epic', items: false, policy: 'auto' });
      const actives = winRate({ stats, boss, gear: 'epic', items: false, policy: 'smart' });
      const items = winRate({ stats, boss, gear: 'epic', items: true, policy: 'smart' });
      expect(actives - auto, `${boss.id} actives`).toBeGreaterThan(0.08);
      expect(actives - auto, `${boss.id} actives`).toBeLessThan(0.25);
      expect(items - actives, `${boss.id} items`).toBeGreaterThan(0.05);
      expect(items - actives, `${boss.id} items`).toBeLessThan(0.2);
    }
  });
});

describe('calibration', () => {
  it('settles where the person succeeds about 75% of the time', () => {
    const rng = makeRng(3);
    const trueAbility = 12; // in rating units
    const pSuccess = (r: number) => 1 / (1 + Math.exp((r - trueAbility) / 2));
    let rating = 0;
    let successes = 0;
    const n = 400;
    for (let i = 0; i < n; i++) {
      const ok = rng() < pSuccess(rating);
      if (i >= n - 200 && ok) successes++;
      rating = updateRating(rating, ok ? 'success' : 'fail');
    }
    expect(successes / 200).toBeGreaterThan(TARGET_SUCCESS - 0.08);
    expect(successes / 200).toBeLessThan(TARGET_SUCCESS + 0.08);
  });

  it('placement maps a measured max to a sensible starting quest', () => {
    const pushups = { base: 5, growth: 1.06, min: 3, max: 60 };
    const r = placementRating(pushups, 20); // max of 20 pushups
    expect(paramFor(pushups, r)).toBe(12); // normal quest asks for ~60%
  });
});

describe('determinism', () => {
  it('the same seed replays the same fight', () => {
    const boss = corePack.bosses[1];
    const stats = buildStats('Balanced', ON_SCHEDULE_POINTS[boss.tier]);
    const load = { stats, cls: bestClass(stats, boss, 'rare'), gear: gearFor(stats, 'rare'), items: [] };
    const a = fight(load, boss, makeRng(11), 'smart', true);
    const b = fight(load, boss, makeRng(11), 'smart', true);
    expect(a).toEqual(b);
  });
});
