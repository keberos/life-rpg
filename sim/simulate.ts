// Battle simulator: runs thousands of fights per cell and prints win rates.
// Usage: npm run sim            (all reports)
//        npm run sim -- --log   (also prints one sample fight)
import { fight } from '../src/engine/combat.ts';
import { makeRng } from '../src/engine/rng.ts';
import { addStats } from '../src/engine/stats.ts';
import { STAT_IDS } from '../src/engine/types.ts';
import {
  BUILDS,
  ITEM_KIT,
  ON_SCHEDULE_POINTS,
  bestClass,
  buildStats,
  coinFlipShare,
  gearFor,
  pack,
  winRate,
  type GearTier,
} from '../src/sim/scenarios.ts';

const pct = (x: number) => `${Math.round(x * 100)}%`.padStart(5);
const row = (label: string, cells: string[]) => console.log(label.padEnd(14) + cells.map((c) => c.padStart(9)).join(''));

console.log('\n=== 1. Builds at on-schedule stat points (common gear, battle items, smart play) ===');
console.log('Target: every build lands near the Balanced build; none falls far behind.\n');
row('Build', pack.bosses.map((b) => `${b.name.split(' ')[1] ?? b.name}`));
row('', pack.bosses.map((b) => `${ON_SCHEDULE_POINTS[b.tier]}pt`));
for (const build of Object.keys(BUILDS)) {
  row(build, pack.bosses.map((b) => pct(winRate({ stats: buildStats(build, ON_SCHEDULE_POINTS[b.tier]), boss: b, gear: 'common', items: true, policy: 'smart' }))));
}

console.log('\n=== 2. Training pays off: Balanced build, % of on-schedule points ===');
console.log('Target: behind = tough, on schedule = favored, ahead = comfortable.\n');
const shares = [0.6, 0.8, 1.0, 1.2, 1.4];
row('Boss', shares.map((s) => `${Math.round(s * 100)}%`));
for (const b of pack.bosses) {
  row(b.name, shares.map((s) => pct(winRate({ stats: buildStats('Balanced', ON_SCHEDULE_POINTS[b.tier] * s), boss: b, gear: 'common', items: true, policy: 'smart' }))));
}

console.log('\n=== 3a. Gear tiers: Balanced, on schedule, no buttons pressed ===');
console.log('Target: each step up in gear is a clear, not crushing, gain.\n');
const tiers: GearTier[] = ['none', 'common', 'rare', 'epic'];
row('Boss', tiers);
for (const b of pack.bosses) {
  const stats = buildStats('Balanced', ON_SCHEDULE_POINTS[b.tier]);
  row(b.name, tiers.map((t) => pct(winRate({ stats, boss: b, gear: t, items: false, policy: 'auto' }))));
}

console.log('\n=== 3b. Buttons, measured where an untouched fight is a coin flip ===');
console.log('Stats are set so the no-buttons win rate is ~50%, so gains are not hidden by a 100% ceiling.');
console.log('Target: pressing gear actives +10-20 points; spending the 2 battle items +10-15 on top.\n');
row('Boss', ['gear', 'auto', '+actives', '+items']);
for (const b of pack.bosses) {
  for (const t of ['rare', 'epic'] as GearTier[]) {
    const share = coinFlipShare(b, t);
    const stats = buildStats('Balanced', ON_SCHEDULE_POINTS[b.tier] * share);
    row(t === 'rare' ? b.name : '', [
      t,
      pct(winRate({ stats, boss: b, gear: t, items: false, policy: 'auto' })),
      pct(winRate({ stats, boss: b, gear: t, items: false, policy: 'smart' })),
      pct(winRate({ stats, boss: b, gear: t, items: true, policy: 'smart' })),
    ]);
  }
}

console.log('\n=== 4. Every stat helps: +10 to one stat, Balanced at 80% of schedule ===');
console.log('Target: every cell positive. Bold-ish (*) = boss is weak to that stat.\n');
row('Boss', [...STAT_IDS]);
for (const b of pack.bosses) {
  const base = buildStats('Balanced', ON_SCHEDULE_POINTS[b.tier] * 0.8);
  const cls = bestClass(base, b, 'common');
  const r0 = winRate({ stats: base, boss: b, gear: 'common', items: false, policy: 'auto', cls }, 4000);
  row(b.name, STAT_IDS.map((s) => {
    const r = winRate({ stats: addStats(base, { [s]: 10 }), boss: b, gear: 'common', items: false, policy: 'auto', cls }, 4000);
    const delta = Math.round((r - r0) * 100);
    return `${delta >= 0 ? '+' : ''}${delta}${b.weakTo.includes(s) ? '*' : ''}`;
  }));
}

if (process.argv.includes('--log')) {
  const b = pack.bosses[1];
  const stats = buildStats('Balanced', ON_SCHEDULE_POINTS[b.tier]);
  const res = fight({ stats, cls: bestClass(stats, b, 'epic'), gear: gearFor(stats, 'epic'), items: ITEM_KIT }, b, makeRng(7), 'smart', true);
  console.log(`\n=== Sample fight vs ${b.name}: ${res.win ? 'WIN' : 'LOSS'} in ${res.turns} turns ===`);
  console.log(res.log.join('\n'));
}
console.log('');
