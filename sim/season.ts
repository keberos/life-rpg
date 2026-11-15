// Season pacing report: plays whole simulated seasons through the real app
// logic (app/state/fastforward.ts) for each play style and summarizes how the
// loop paces out. Run: npm run season [-- runsPerStyle]
import { STAT_IDS } from '../src/engine/types.ts';
import { fastForward, formatReport, PLAY_STYLES, SEASON_DAYS, type FastForwardReport } from '../app/state/fastforward.ts';
import { grantStarterKit } from '../app/state/logic.ts';
import { store } from '../app/state/store.ts';

const RUNS = Number(process.argv[2] ?? 30);
const TIERS = [1, 2, 3, 4];
const pct = (n: number, d: number) => (d ? `${Math.round((100 * n) / d)}%` : '-').padStart(5);
const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);
const fmt = (x: number, digits = 1) => (Number.isNaN(x) ? '-' : x.toFixed(digits)).padStart(5);

function season(style: (typeof PLAY_STYLES)[number]['id'], seed: number): FastForwardReport {
  store.reset();
  grantStarterKit();
  return fastForward({ style, days: SEASON_DAYS + 1, autoFight: true, seed });
}

console.log(`Season pacing: ${RUNS} simulated 8-week seasons per play style, bosses fought once the odds reach 60%
(any odds in the last week, 40% once a boss is overdue).\n`);
console.log('Targets: a boss beaten within a week or so of arriving (weeks 1, 3, 5, 7); a class picked by week 2-3;');
console.log('every play style can clear tier 1-2; skipping Faith is never locked out.\n');

for (const st of PLAY_STYLES) {
  const runs = Array.from({ length: RUNS }, (_, i) => season(st.id, 1000 + i));
  console.log(`=== ${st.name}: ${st.desc}`);
  console.log(`Quests per season: ${fmt(avg(runs.map((r) => r.quests)), 0)}   Final total level: ${fmt(avg(runs.map((r) => r.weeks.at(-1)?.totalLevel ?? 0)))}`);
  const classWeek = runs.map((r) => r.weeks.find((w) => w.className !== 'Adventurer')?.week).filter((w): w is number => !!w);
  console.log(`Class picked: ${pct(classWeek.length, RUNS)} of seasons, avg week ${fmt(avg(classWeek))}`);
  console.log('Boss    Beaten   1st try   Odds at 1st fight   Week beaten   Fights to win');
  for (const tier of TIERS) {
    const beat = runs.filter((r) => r.bosses.some((b) => b.tier === tier && b.win));
    const first = runs.map((r) => r.bosses.find((b) => b.tier === tier)).filter((b) => !!b);
    const firstWin = first.filter((b) => b.win).length;
    const weekBeat = beat.map((r) => r.bosses.find((b) => b.tier === tier && b.win)!.week);
    const tries = beat.map((r) => r.bosses.filter((b) => b.tier === tier).findIndex((b) => b.win) + 1);
    console.log(`T${tier}     ${pct(beat.length, RUNS)}     ${pct(firstWin, first.length)}          ${pct(Math.round(avg(first.map((b) => b.odds)) * 100), 100)}             ${fmt(avg(weekBeat))}          ${fmt(avg(tries))}`);
  }
  const last = runs[0].weeks.at(-1);
  if (last) console.log(`Stat spread at season end (run 1): ${STAT_IDS.map((s) => `${s} ${last.levels[s]}`).join(' · ')}`);
  console.log('');
}

console.log('=== One full season in detail (Every day, seed 1000)');
console.log(formatReport(season('daily', 1000)));
