// Boss tuning helper: for each boss, binary-search one scale factor applied to
// HP and attack so a Balanced, on-schedule player with common gear who never
// presses anything wins TARGET of the time. Prints suggested numbers to paste
// into the content pack. Usage: npm run tune [-- 0.6]
import type { BossDef } from '../src/engine/types.ts';
import { ON_SCHEDULE_POINTS, buildStats, pack, winRate } from '../src/sim/scenarios.ts';

const TARGET = Number(process.argv[2] ?? 0.6);

function scaled(b: BossDef, k: number): BossDef {
  return { ...b, hp: Math.round(b.hp * k), attack: Math.round(b.attack * k * 10) / 10 };
}

for (const b of pack.bosses) {
  const stats = buildStats('Balanced', ON_SCHEDULE_POINTS[b.tier]);
  let lo = 0.3;
  let hi = 6;
  for (let i = 0; i < 18; i++) {
    const mid = Math.sqrt(lo * hi);
    const r = winRate({ stats, boss: scaled(b, mid), gear: 'common', items: false, policy: 'auto' }, 1500);
    if (r > TARGET) lo = mid;
    else hi = mid;
  }
  const s = scaled(b, lo);
  console.log(`${b.id.padEnd(14)} scale ${lo.toFixed(2)}  ->  hp: ${s.hp}, attack: ${s.attack}`);
}
