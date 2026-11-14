// The save file is a profile (settings, no progress numbers) plus an append-only
// event log. Everything you see (levels, ratings, gear, boss status) is DERIVED
// from the log, so rules can change later and be replayed without losing data.
import { corePack } from '../../src/content/core-pack.ts';
import { unlockedClasses } from '../../src/engine/classes.ts';
import { levelFromXp, xpForLevel, type QuestOutcome, type RelativeDifficulty } from '../../src/engine/progression.ts';
import { emptyStats } from '../../src/engine/stats.ts';
import { STAT_IDS, type BossDef, type ClassDef, type GearDef, type GearSlot, type StatBlock, type StatId } from '../../src/engine/types.ts';

import type { Feedback } from '../../src/engine/calibration.ts';
import type { Omen } from '../../src/engine/combat.ts';

export const GEAR_SLOTS: GearSlot[] = ['weapon', 'armor', 'charm', 'relic'];

export const DAY = 86_400_000;
export const SEASON_WEEKS = 8;
export const DEFAULT_RATING = 6;

export interface Profile {
  id: string;
  createdAt: number;
  seasonStart: number;
  enabledStats: StatId[];
  onboarded: boolean;
}

interface Base { at: number }
export type LogEvent = Base & (
  | { type: 'placement'; stat: StatId; questId: string; value: number; rating: number }
  | { type: 'quest'; questId: string; stat: StatId; difficulty: RelativeDifficulty; amount?: number; outcome: QuestOutcome; feedback: Feedback; xp: number; ratingBefore: number; ratingAfter: number; score?: string }
  | { type: 'boss'; bossId: string; win: boolean; turns: number; omen: Omen; pressed: number }
  | { type: 'loot'; kind: 'gear' | 'item'; id: string; source: string }
  | { type: 'useItem'; id: string }
  | { type: 'chooseClass'; classId: string }
  /** Player's pick for a slot; null = wear nothing there. Overrides auto-equip. */
  | { type: 'equip'; slot: GearSlot; gearId: string | null }
  | { type: 'checkin'; fun: number; worthIt: boolean; note?: string }
  | { type: 'intercept'; accepted: boolean }
  | { type: 'debugTime'; days: number }
  | { type: 'debugXp'; stat: StatId; xp: number }
);

/** An event before it is stamped with a time (Omit that keeps the union intact). */
export type NewEvent = LogEvent extends infer E ? (E extends LogEvent ? Omit<E, 'at'> & { at?: number } : never) : never;

export interface SaveFile {
  version: 1;
  profile: Profile;
  events: LogEvent[];
}

export interface BossStatus {
  def: BossDef;
  tier: number;
  defeated: boolean;
  foughtToday: boolean;
  nextBossWeek: number | null;
}

export interface GameState {
  now: number;
  dayKey: string;
  week: number;
  seasonOver: boolean;
  xp: StatBlock;
  levels: StatBlock;
  levelProgress: StatBlock; // 0..1 toward next level
  ratings: StatBlock;
  /** Stats whose difficulty has been measured by a first-quest calibration. */
  calibrated: Record<StatId, boolean>;
  daysSinceTrained: StatBlock;
  totalLevel: number;
  ownedGear: GearDef[];
  equipped: GearDef[];
  items: Record<string, number>;
  unlocked: ClassDef[];
  activeClass: ClassDef;
  boss: BossStatus;
  questsToday: number;
  questsTotal: number;
  checkedInToday: boolean;
  interceptsAccepted: number;
  interceptsSkipped: number;
}

/** Debug time travel shifts "now" for everything. */
export function timeOffset(events: LogEvent[]): number {
  return events.reduce((n, e) => (e.type === 'debugTime' ? n + e.days * DAY : n), 0);
}

export const dayKeyOf = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const RARITY_RANK = { common: 0, rare: 1, epic: 2, legendary: 3 } as const;

export function derive(save: SaveFile, realNow = Date.now()): GameState {
  const { profile, events } = save;
  const now = realNow + timeOffset(events);
  const dayKey = dayKeyOf(now);
  const week = Math.floor((now - profile.seasonStart) / (7 * DAY)) + 1;

  const xp = emptyStats();
  const ratings = emptyStats(DEFAULT_RATING);
  const calibrated = Object.fromEntries(STAT_IDS.map((s) => [s, false])) as Record<StatId, boolean>;
  const lastTrained: Partial<Record<StatId, number>> = {};
  const owned = new Set<string>();
  const items: Record<string, number> = {};
  let classChoice: string | null = null;
  const slotChoice = new Map<GearSlot, string | null>();
  let questsToday = 0;
  let questsTotal = 0;
  let checkedInToday = false;
  let accepted = 0;
  let skipped = 0;

  for (const e of events) {
    switch (e.type) {
      case 'placement':
        ratings[e.stat] = e.rating;
        calibrated[e.stat] = true;
        break;
      case 'quest':
        xp[e.stat] += e.xp;
        ratings[e.stat] = e.ratingAfter;
        lastTrained[e.stat] = e.at;
        questsTotal++;
        if (dayKeyOf(e.at) === dayKey) questsToday++;
        break;
      case 'debugXp':
        xp[e.stat] += e.xp;
        break;
      case 'loot':
        if (e.kind === 'gear') owned.add(e.id);
        else items[e.id] = (items[e.id] ?? 0) + 1;
        break;
      case 'useItem':
        items[e.id] = Math.max(0, (items[e.id] ?? 0) - 1);
        break;
      case 'chooseClass':
        classChoice = e.classId;
        break;
      case 'equip':
        slotChoice.set(e.slot, e.gearId);
        break;
      case 'checkin':
        if (dayKeyOf(e.at) === dayKey) checkedInToday = true;
        break;
      case 'intercept':
        if (e.accepted) accepted++;
        else skipped++;
        break;
    }
  }

  const levels = emptyStats();
  const levelProgress = emptyStats();
  const daysSinceTrained = emptyStats();
  for (const s of STAT_IDS) {
    levels[s] = profile.enabledStats.includes(s) ? levelFromXp(xp[s]) : 0;
    const lo = xpForLevel(levels[s]);
    const hi = xpForLevel(levels[s] + 1);
    levelProgress[s] = hi > lo ? (xp[s] - lo) / (hi - lo) : 0;
    const last = lastTrained[s];
    // Never trained: count from season start, so day one isn't "rested" everywhere.
    daysSinceTrained[s] = Math.floor((now - (last ?? profile.seasonStart)) / DAY);
  }
  const totalLevel = STAT_IDS.reduce((n, s) => n + levels[s], 0);

  const ownedGear = corePack.gear.filter((g) => owned.has(g.id));
  // Auto-equip the best piece per slot, unless the player picked one (or chose none).
  const bestBySlot = new Map<string, GearDef>();
  for (const g of ownedGear) {
    const cur = bestBySlot.get(g.slot);
    if (!cur || RARITY_RANK[g.rarity] > RARITY_RANK[cur.rarity]) bestBySlot.set(g.slot, g);
  }

  const unlocked = unlockedClasses(levels, corePack.classes);
  const chosen = unlocked.find((c) => c.id === classChoice);
  const activeClass = chosen ?? unlocked[unlocked.length - 1];

  const tier = Math.min(4, Math.max(1, Math.ceil(week / 2)));
  const def = corePack.bosses.find((b) => b.tier === tier) ?? corePack.bosses[0];
  const seasonEvents = events.filter((e) => e.at >= profile.seasonStart);
  const defeated = seasonEvents.some((e) => e.type === 'boss' && e.bossId === def.id && e.win);
  const foughtToday = events.some((e) => e.type === 'boss' && dayKeyOf(e.at) === dayKey);
  const nextBossWeek = tier < 4 ? tier * 2 + 1 : null;

  return {
    now, dayKey, week,
    seasonOver: week > SEASON_WEEKS,
    xp, levels, levelProgress, ratings, calibrated, daysSinceTrained, totalLevel,
    ownedGear, equipped: GEAR_SLOTS.flatMap((slot) => {
      if (slotChoice.has(slot)) {
        const pick = ownedGear.find((g) => g.id === slotChoice.get(slot));
        if (pick && pick.slot === slot) return [pick];
        if (slotChoice.get(slot) === null) return [];
      }
      const best = bestBySlot.get(slot);
      return best ? [best] : [];
    }), items,
    unlocked, activeClass,
    boss: { def, tier, defeated, foughtToday, nextBossWeek },
    questsToday, questsTotal, checkedInToday,
    interceptsAccepted: accepted, interceptsSkipped: skipped,
  };
}
