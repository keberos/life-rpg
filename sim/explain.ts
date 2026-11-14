// Prints derived combat numbers for each build vs one boss, to see WHY a build wins or loses.
// Usage: npm run explain [-- <bossIndex 0-3>]
import { derive } from '../src/engine/combat.ts';
import { BUILDS, ON_SCHEDULE_POINTS, bestClass, buildStats, gearFor, pack } from '../src/sim/scenarios.ts';

const boss = pack.bosses[Number(process.argv[2] ?? 2)];
const armor = 100 / (100 + boss.armor);
console.log(`\n${boss.name} (hp ${boss.hp}, atk ${boss.attack}, armor ${boss.armor}, weak ${boss.weakTo.join('/')}), ${ON_SCHEDULE_POINTS[boss.tier]} pts, common gear\n`);
console.log('build'.padEnd(12) + ['class', 'maxHp', 'dmg/turn', 'crit', 'dodge', 'resist', 'heal', 'revive', 'turnsToKill'].map((h) => h.padStart(10)).join(''));
for (const build of Object.keys(BUILDS)) {
  const stats = buildStats(build, ON_SCHEDULE_POINTS[boss.tier]);
  const cls = bestClass(stats, boss, 'common');
  const d = derive({ stats, cls, gear: gearFor(stats, 'common'), items: [] }, boss);
  const perTurn = (d.phys * armor + d.spell + d.smite) * d.insight * (1 + 0.75 * d.crit);
  const cells = [cls.name, d.maxHp.toFixed(0), perTurn.toFixed(0), d.crit.toFixed(2), d.dodge.toFixed(2), d.specialResist.toFixed(2), d.heal.toFixed(0), d.reviveChance.toFixed(2), (boss.hp / perTurn).toFixed(1)];
  console.log(build.padEnd(12) + cells.map((c) => c.padStart(10)).join(''));
}
console.log('');
