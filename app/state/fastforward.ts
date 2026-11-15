// Season fast-forward (debug/tuning only). Plays simulated days into the save
// through the real game actions, so the season you then see in the app is
// exactly what those days would have produced. A simulated player has a hidden
// "true ability" per stat that grows with training; quest results come from
// how the quest's difficulty compares with it.
import { paramFor, type Feedback } from '../../src/engine/calibration.ts';
import { createFight, fight as simulateFight, pickButton } from '../../src/engine/combat.ts';
import { makeRng, type Rng } from '../../src/engine/rng.ts';
import { STAT_IDS, type StatBlock, type StatId } from '../../src/engine/types.ts';
import { DEFAULT_RATING, SEASON_WEEKS, type GameState } from './model.ts';
import { canCalibrate, completeQuest, heroLoadout, recordFight, recordPlacement, suggestQuest } from './logic.ts';
import { store } from './store.ts';

export type PlayStyleId = 'daily' | 'casual' | 'weekends' | 'noFaith';

export interface PlayStyle {
  id: PlayStyleId;
  name: string;
  desc: string;
  /** Quests played on a given weekday (0 = Sunday). */
  questsOn: (weekday: number, rng: Rng) => number;
  skip?: StatId[];
}

const between = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

export const PLAY_STYLES: PlayStyle[] = [
  { id: 'daily', name: 'Every day', desc: '3 to 5 quests a day, every day.', questsOn: (_, r) => between(r, 3, 5) },
  { id: 'casual', name: 'Casual', desc: '1 to 3 quests on most days; skips about two days a week.', questsOn: (_, r) => (r() < 0.3 ? 0 : between(r, 1, 3)) },
  { id: 'weekends', name: 'Weekends', desc: 'Rarely on weekdays, 5 to 8 quests on Saturday and Sunday.', questsOn: (d, r) => (d === 0 || d === 6 ? between(r, 5, 8) : r() < 0.2 ? 1 : 0) },
  { id: 'noFaith', name: 'Skips Faith', desc: 'Plays every day but never trains Faith.', questsOn: (_, r) => between(r, 3, 5), skip: ['FTH'] },
];

export const styleById = (id: PlayStyleId) => PLAY_STYLES.find((s) => s.id === id)!;

export interface FastForwardOptions {
  style: PlayStyleId;
  /** Most days to play. Stops early at season end (and at a waiting boss when `stopAtBoss`). */
  days: number;
  /** Fight bosses automatically, like a player reading the odds on the boss screen. */
  autoFight: boolean;
  /** Win chance at which the auto-fighter takes the fight (default 0.6). It fights at
   *  any odds in the season's last week, and from 0.4 once it is falling behind. */
  fightAt?: number;
  /** Stop once a boss fight looks winnable (odds >= fightAt), so you can fight it yourself. */
  stopAtBoss?: boolean;
  seed?: number;
}

export interface BossLine {
  week: number;
  boss: string;
  tier: number;
  win: boolean;
  /** Win chance before the fight (the same estimate the boss screen shows). */
  odds: number;
  totalLevel: number;
}

export interface WeekLine {
  week: number;
  quests: number;
  totalLevel: number;
  levels: StatBlock;
  className: string;
  gear: number;
}

export interface FastForwardReport {
  style: string;
  daysPlayed: number;
  quests: number;
  stoppedFor: 'days' | 'seasonEnd' | 'boss';
  weeks: WeekLine[];
  bosses: BossLine[];
  classesPicked: string[];
}

// The simulated player's true ability per stat. Kept per save so a run can be
// continued across button presses; reset when the save changes profile.
let ability: { profile: string; t: StatBlock } | null = null;

function abilityFor(profileId: string, rng: Rng): StatBlock {
  if (ability?.profile !== profileId) {
    const t = {} as StatBlock;
    for (const s of STAT_IDS) t[s] = DEFAULT_RATING + (rng() * 4 - 2);
    ability = { profile: profileId, t };
  }
  return ability.t;
}

/** Win chance for the current boss, same method as the boss screen. */
export function bossOdds(g: GameState, n = 200): number {
  const rng = makeRng(12345);
  const load = heroLoadout(g);
  let wins = 0;
  for (let i = 0; i < n; i++) if (simulateFight(load, g.boss.def, rng).win) wins++;
  return wins / n;
}

const canFight = (g: GameState) => !g.boss.defeated && !g.boss.foughtToday && !g.seasonOver;

function playQuest(g: GameState, style: PlayStyle, t: StatBlock, rng: Rng) {
  const enabled = store.get().profile.enabledStats.filter((s) => !style.skip?.includes(s));
  const q = suggestQuest(g, enabled);
  const s = q.stat;
  // First measurable quest per stat is the calibration: report a max that matches true ability.
  if (!g.calibrated[s] && canCalibrate(q) && q.curve) {
    const comfortable = paramFor(q.curve, t[s]);
    const rating = recordPlacement(s, q.id, Math.round(comfortable / 0.6));
    if (rating !== undefined) {
      completeQuest(store.state(), q, 'normal', 'success', 'success', comfortable, undefined, rating);
      t[s] += 0.05;
      return;
    }
  }
  const gap = g.ratings[s] - t[s];
  const pSuccess = Math.min(0.97, Math.max(0.1, 0.8 - 0.15 * gap));
  const ok = rng() < pSuccess;
  const feedback: Feedback = ok ? (gap < -2 ? 'tooEasy' : 'success') : gap > 2 ? 'tooHard' : 'fail';
  const amount = q.curve ? paramFor(q.curve, g.ratings[s]) : undefined;
  completeQuest(g, q, 'normal', ok ? 'success' : 'fail', feedback, amount);
  t[s] += 0.05; // training makes you a little better
}

function fightBoss(g: GameState, rng: Rng, odds: number): BossLine {
  const load = heroLoadout(g);
  const satchel = load.items;
  const f = createFight(load, g.boss.def, makeRng(Math.floor(rng() * 2 ** 32) >>> 0));
  while (!f.view().over) f.step(pickButton(f.view()));
  const v = f.view();
  recordFight(g, satchel, v);
  return { week: g.week, boss: g.boss.def.name, tier: g.boss.tier, win: v.win, odds, totalLevel: g.totalLevel };
}

/** A real player picks a class once one unlocks; the sim takes the first one offered. */
function maybePickClass(g: GameState): string | undefined {
  if (g.activeClass.id !== 'adventurer') return;
  const pick = g.unlocked.find((c) => c.id !== 'adventurer');
  if (!pick) return;
  store.log({ type: 'chooseClass', classId: pick.id }, { type: 'seenClasses', ids: g.unlocked.map((c) => c.id) });
  return pick.name;
}

export function fastForward(opts: FastForwardOptions): FastForwardReport {
  const style = styleById(opts.style);
  const rng = makeRng((opts.seed ?? Date.now()) >>> 0);
  const t = abilityFor(store.get().profile.id, rng);
  const report: FastForwardReport = { style: style.name, daysPlayed: 0, quests: 0, stoppedFor: 'days', weeks: [], bosses: [], classesPicked: [] };
  const weekLine = (g: GameState) => {
    let w = report.weeks.find((x) => x.week === g.week);
    if (!w) report.weeks.push((w = { week: g.week, quests: 0, totalLevel: 0, levels: g.levels, className: '', gear: 0 }));
    Object.assign(w, { totalLevel: g.totalLevel, levels: { ...g.levels }, className: g.activeClass.name, gear: g.ownedGear.length });
    return w;
  };

  for (let day = 0; day < opts.days; day++) {
    let g = store.state();
    if (g.seasonOver) {
      report.stoppedFor = 'seasonEnd';
      break;
    }
    // Each simulated day starts by moving the clock forward (the first one plays "today").
    if (day > 0 || g.questsToday > 0) {
      store.log({ type: 'debugTime', days: 1 });
      g = store.state();
      if (g.seasonOver) {
        report.stoppedFor = 'seasonEnd';
        break;
      }
    }
    // Hand-fighting: stop once a boss fight looks winnable, so you can go fight it.
    if (opts.stopAtBoss && !opts.autoFight && canFight(g) && bossOdds(g) >= (opts.fightAt ?? 0.6)) {
      report.stoppedFor = 'boss';
      break;
    }
    report.daysPlayed++;
    const n = style.questsOn(new Date(g.now).getDay(), rng);
    for (let i = 0; i < n; i++) {
      playQuest(store.state(), style, t, rng);
      report.quests++;
      weekLine(store.state()).quests++;
      const picked = maybePickClass(store.state());
      if (picked) report.classesPicked.push(picked);
    }
    g = store.state();
    // Fight on a day you played, like a real player at camp, once the odds look decent.
    if (opts.autoFight && n > 0 && canFight(g)) {
      const odds = bossOdds(g);
      const want = g.week >= SEASON_WEEKS ? 0 : g.boss.behind ? 0.4 : (opts.fightAt ?? 0.6);
      if (odds >= want) report.bosses.push(fightBoss(g, rng, odds));
    }
    weekLine(store.state());
  }
  return report;
}

/** Plain-text report (CLI and the Debug screen). */
export function formatReport(r: FastForwardReport): string {
  const lines = [`${r.style}: ${r.daysPlayed} days, ${r.quests} quests (stopped: ${r.stoppedFor})`];
  lines.push('Week  Quests  Level  ' + STAT_IDS.map((s) => s.padStart(3)).join(' ') + '  Gear  Class');
  for (const w of r.weeks) {
    lines.push(`${String(w.week).padStart(4)}  ${String(w.quests).padStart(6)}  ${String(w.totalLevel).padStart(5)}  ${STAT_IDS.map((s) => String(w.levels[s]).padStart(3)).join(' ')}  ${String(w.gear).padStart(4)}  ${w.className}`);
  }
  if (r.bosses.length) {
    lines.push('Bosses:');
    for (const b of r.bosses) lines.push(`  week ${b.week}: ${b.boss} (tier ${b.tier}) ${b.win ? 'WON' : 'lost'} at ${Math.round(b.odds * 100)}% odds, level ${b.totalLevel}`);
  }
  if (r.classesPicked.length) lines.push(`Class picked: ${r.classesPicked.join(', ')}`);
  return lines.join('\n');
}

export const SEASON_DAYS = SEASON_WEEKS * 7;
