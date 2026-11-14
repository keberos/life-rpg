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
/** The week boss `tier` can first arrive (1, 3, 5, 7). */
export const bossWeek = (tier: number) => tier * 2 - 1;
/** Beating a boss of this tier or higher as a class masters it (a Legacy starting class). */
export const MASTERY_TIER = 3;
export const masteryBosses = () => corePack.bosses.filter((b) => b.tier >= MASTERY_TIER);
/** Does this boss win master the class it was fought as? */
export const mastersClass = (bossId: string, classId?: string) =>
  !!classId && classId !== 'adventurer' && (corePack.bosses.find((b) => b.id === bossId)?.tier ?? 0) >= MASTERY_TIER;
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
  | { type: 'boss'; bossId: string; win: boolean; turns: number; omen: Omen; pressed: number; classId?: string }
  /** A new season starts at this event. Everything season-scoped resets; ratings and the lifetime record don't. */
  | { type: 'newSeason'; perk?: string; startClass?: string; heirloom?: string }
  | { type: 'loot'; kind: 'gear' | 'item'; id: string; source: string }
  | { type: 'useItem'; id: string }
  | { type: 'chooseClass'; classId: string }
  /** The player has seen these unlocked classes (clears the "new class" banner). */
  | { type: 'seenClasses'; ids: string[] }
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
  /** The calendar has moved past this boss: beat it to meet the next one. */
  behind: boolean;
}

/** Across all seasons. Never resets. */
export interface Lifetime {
  seasonsCompleted: number;
  questsTotal: number;
  bossesBeaten: number;
  /** Classes you've beaten a boss with. Each becomes a starting class option. */
  masteredClasses: string[];
  /** Beat all four bosses in a single season (unlocks Heirloom). */
  fullClear: boolean;
  unlockedPerks: string[];
}

export interface Season {
  number: number;
  start: number;
  perk?: string;
  startClass?: string;
  heirloom?: string;
  quests: number;
  bossesBeaten: string[];
  /** Calibration results this season, with last season's for comparison. */
  rechecks: { stat: StatId; questId: string; value: number; before?: number }[];
}

export interface GameState {
  now: number;
  dayKey: string;
  week: number;
  seasonOver: boolean;
  season: Season;
  lifetime: Lifetime;
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
  /** Unlocked classes the player hasn't looked at yet. */
  newClasses: ClassDef[];
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
  const { profile, events: all } = save;
  const now = realNow + timeOffset(all);
  const dayKey = dayKeyOf(now);

  // ---- Seasons: everything after the last newSeason event is this season. ----
  const seasonIdx = all.findLastIndex((e) => e.type === 'newSeason');
  const seasonEvent = seasonIdx >= 0 ? (all[seasonIdx] as Extract<LogEvent, { type: 'newSeason' }>) : undefined;
  const seasonStart = seasonEvent?.at ?? profile.seasonStart;
  const events = all.slice(seasonIdx + 1); // this season only
  const week = Math.floor((now - seasonStart) / (7 * DAY)) + 1;

  // ---- Lifetime record (all seasons). ----
  const lifetimeQuests = all.filter((e) => e.type === 'quest').length;
  const seasonsCompleted = all.filter((e) => e.type === 'newSeason').length;
  const masteredClasses = [...new Set(all.flatMap((e) => (e.type === 'boss' && e.win && mastersClass(e.bossId, e.classId) ? [e.classId!] : [])))];
  let bossesBeaten = 0;
  let fullClear = false;
  {
    let seasonWins = new Set<string>();
    for (const e of all) {
      if (e.type === 'newSeason') seasonWins = new Set();
      if (e.type === 'boss' && e.win) {
        bossesBeaten++;
        seasonWins.add(e.bossId);
        if (corePack.bosses.every((b) => seasonWins.has(b.id))) fullClear = true;
      }
    }
  }
  // Season 1 counts as finished once its weeks are up, so its unlocks show on the recap.
  const finishedSeasons = seasonsCompleted + (week > SEASON_WEEKS ? 1 : 0);
  const unlockedPerks = [...(finishedSeasons >= 1 ? ['field-kit'] : []), ...(fullClear ? ['heirloom'] : [])];

  // Last calibration per quest before this season, for "recheck" comparisons. Ratings carry over.
  const before = new Map<string, number>();
  const ratings = emptyStats(DEFAULT_RATING);
  for (const e of all.slice(0, seasonIdx + 1)) {
    if (e.type === 'placement') {
      before.set(e.questId, e.value);
      ratings[e.stat] = e.rating;
    }
    if (e.type === 'quest') ratings[e.stat] = e.ratingAfter;
  }
  const rechecks: Season['rechecks'] = [];

  const xp = emptyStats();
  const calibrated = Object.fromEntries(STAT_IDS.map((s) => [s, false])) as Record<StatId, boolean>;
  const lastTrained: Partial<Record<StatId, number>> = {};
  const owned = new Set<string>();
  const items: Record<string, number> = {};
  let classChoice: string | null = seasonEvent?.startClass ?? null;
  // Legacy perks picked for this season.
  if (seasonEvent?.perk === 'field-kit') {
    items.potion = 2;
    items['ward-scroll'] = 1;
  }
  if (seasonEvent?.perk === 'heirloom' && seasonEvent.heirloom) owned.add(seasonEvent.heirloom);
  const seenClasses = new Set<string>();
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
        rechecks.push({ stat: e.stat, questId: e.questId, value: e.value, before: before.get(e.questId) });
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
      case 'seenClasses':
        for (const id of e.ids) seenClasses.add(id);
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
    daysSinceTrained[s] = Math.floor((now - (last ?? seasonStart)) / DAY);
  }
  const totalLevel = STAT_IDS.reduce((n, s) => n + levels[s], 0);

  const ownedGear = corePack.gear.filter((g) => owned.has(g.id));
  // Auto-equip the best piece per slot, unless the player picked one (or chose none).
  const bestBySlot = new Map<string, GearDef>();
  for (const g of ownedGear) {
    const cur = bestBySlot.get(g.slot);
    if (!cur || RARITY_RANK[g.rarity] > RARITY_RANK[cur.rarity]) bestBySlot.set(g.slot, g);
  }

  // A mastered class picked as this season's starting class is open from day one.
  const startClass = corePack.classes.find((c) => c.id === seasonEvent?.startClass);
  const byStats = unlockedClasses(levels, corePack.classes);
  const unlocked = startClass && !byStats.includes(startClass) ? [...byStats, startClass] : byStats;
  const chosen = unlocked.find((c) => c.id === classChoice);
  // You stay an Adventurer until you choose a class yourself.
  const activeClass = chosen ?? unlocked[0];
  const newClasses = unlocked.filter((c) => c.id !== 'adventurer' && !seenClasses.has(c.id) && c.id !== classChoice);

  // Bosses advance when you beat them, paced by the calendar: boss N arrives no
  // sooner than week bossWeek(N). A boss you haven't beaten waits for you.
  const beaten = new Set(events.flatMap((e) => (e.type === 'boss' && e.win ? [e.bossId] : [])));
  const bossOf = (t: number) => corePack.bosses.find((b) => b.tier === t) ?? corePack.bosses[0];
  const maxTier = Math.max(...corePack.bosses.map((b) => b.tier));
  const arrivedTier = Math.min(maxTier, Math.max(1, Math.ceil(week / 2)));
  let tier = 1;
  while (tier < arrivedTier && beaten.has(bossOf(tier).id)) tier++;
  const def = bossOf(tier);
  const defeated = beaten.has(def.id);
  const foughtToday = events.some((e) => e.type === 'boss' && dayKeyOf(e.at) === dayKey);
  const nextBossWeek = tier < maxTier ? bossWeek(tier + 1) : null;
  const behind = arrivedTier > tier; // a later boss would be here if this one were beaten

  return {
    now, dayKey, week,
    seasonOver: week > SEASON_WEEKS,
    season: {
      number: seasonsCompleted + 1, start: seasonStart,
      perk: seasonEvent?.perk, startClass: seasonEvent?.startClass, heirloom: seasonEvent?.heirloom,
      quests: questsTotal, bossesBeaten: [...beaten], rechecks,
    },
    lifetime: { seasonsCompleted, questsTotal: lifetimeQuests, bossesBeaten, masteredClasses, fullClear, unlockedPerks },
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
    unlocked, newClasses, activeClass,
    boss: { def, tier, defeated, foughtToday, nextBossWeek, behind },
    questsToday, questsTotal, checkedInToday,
    interceptsAccepted: accepted, interceptsSkipped: skipped,
  };
}
