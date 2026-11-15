// Tune seasonal boss forms: for each form, find one scale on HP and attack so an
// on-schedule Balanced player (common gear, items, smart play) wins about as often
// as against the base boss. Prints hpMult/attackMult to paste into boss-forms.ts.
// Usage: npm run tune:forms
import { BOSS_FORMS, bossForSeason } from '../src/content/boss-forms.ts';
import type { BossDef } from '../src/engine/types.ts';
import { ON_SCHEDULE_POINTS, buildStats, pack, winRate } from '../src/sim/scenarios.ts';

const N = 2000;
const rate = (b: BossDef) => winRate({ stats: buildStats('Balanced', ON_SCHEDULE_POINTS[b.tier]), boss: b, gear: 'common', items: true, policy: 'smart' }, N);

for (const base of pack.bosses) {
  const target = rate(base);
  console.log(`${base.name}: base ${(target * 100).toFixed(0)}%`);
  BOSS_FORMS[base.id].forEach((form, i) => {
    const raw = bossForSeason(base, 2 + i);
    // undo any existing multipliers so the search starts from the plain form
    const plain: BossDef = { ...raw, hp: base.hp, attack: base.attack };
    const scaled = (k: number): BossDef => ({ ...plain, hp: Math.round(base.hp * k), attack: Math.round(base.attack * k * 10) / 10 });
    let lo = 0.6, hi = 1.6;
    for (let s = 0; s < 14; s++) {
      const mid = Math.sqrt(lo * hi);
      if (rate(scaled(mid)) > target) lo = mid;
      else hi = mid;
    }
    const k = Math.round(lo * 100) / 100;
    console.log(`  ${form.name.padEnd(18)} plain ${(rate(plain) * 100).toFixed(0)}% -> mult ${k.toFixed(2)} gives ${(rate(scaled(k)) * 100).toFixed(0)}%`);
  });
}
