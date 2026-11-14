// Game actions: pick quests, finish quests, fight bosses. They turn player
// actions into log events using the engine's rules; no UI here.
import { corePack } from '../../src/content/core-pack.ts';
import { paramFor, placementRating, updateRating, type Feedback } from '../../src/engine/calibration.ts';
import { questXp, levelFromXp, type QuestOutcome, type RelativeDifficulty } from '../../src/engine/progression.ts';
import { makeRng } from '../../src/engine/rng.ts';
import type { Rarity, StatId } from '../../src/engine/types.ts';
import { QUESTS, questById, type QuestDef } from '../content/quests.ts';
import { ITEM_EVERY_N_QUESTS, type GameState } from './model.ts';
import { store } from './store.ts';

export const DIFFICULTY_SCALE: Record<RelativeDifficulty, number> = { easy: 0.75, normal: 1, hard: 1.3 };

/** The calibrated amount (reps, seconds, cycles) for a quest at a difficulty. */
export function amountFor(q: QuestDef, rating: number, difficulty: RelativeDifficulty): number | undefined {
  if (!q.curve) return undefined;
  const base = paramFor(q.curve, rating);
  return Math.max(q.curve.min, Math.round(base * DIFFICULTY_SCALE[difficulty]));
}

export function howText(q: QuestDef, amount?: number): string {
  return amount === undefined ? q.how : q.how.replaceAll('{n}', String(amount));
}

const seedRng = () => makeRng((Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0);

/**
 * Suggest the next quest: favor stats you haven't trained lately (rested XP)
 * and this week's boss weaknesses, with a little randomness for variety.
 */
export function suggestQuest(state: GameState, enabled: StatId[], stat?: StatId, avoid?: string): QuestDef {
  const rng = seedRng();
  const lastQuest = store.get().events.findLast((e) => e.type === 'quest');
  const lastQuestId = lastQuest?.type === 'quest' ? lastQuest.questId : undefined;
  let pickStat = stat;
  if (!pickStat) {
    let best = -1;
    for (const s of enabled) {
      const score = Math.min(state.daysSinceTrained[s], 7) + (state.boss.def.weakTo.includes(s) ? 1.5 : 0) + rng() * 2;
      if (score > best) [best, pickStat] = [score, s];
    }
  }
  const pool = QUESTS.filter((q) => q.stat === pickStat && q.id !== avoid && q.id !== lastQuestId);
  const fallback = QUESTS.filter((q) => q.stat === pickStat);
  const list = pool.length ? pool : fallback;
  return list[Math.floor(rng() * list.length)];
}

export interface QuestResult {
  xp: number;
  leveledUp: boolean;
  newLevel: number;
  ratingChange: number;
  drop?: string; // battle item name
}

export function completeQuest(
  state: GameState,
  q: QuestDef,
  difficulty: RelativeDifficulty,
  outcome: QuestOutcome,
  feedback: Feedback,
  amount?: number,
  score?: string,
  /** Set by a calibration run: this becomes the stat's rating directly. */
  calibratedRating?: number,
): QuestResult {
  const before = calibratedRating ?? state.ratings[q.stat];
  // Easy wins don't push difficulty up (unless you say it was too easy); everything else uses the rule.
  const after = calibratedRating !== undefined ? calibratedRating : difficulty === 'easy' && feedback === 'success' ? before : updateRating(before, feedback);
  const xp = questXp(difficulty, outcome, state.daysSinceTrained[q.stat]);
  const newXp = state.xp[q.stat] + xp;
  const newLevel = levelFromXp(newXp);

  store.log({ type: 'quest', questId: q.id, stat: q.stat, difficulty, amount, outcome, feedback, xp, ratingBefore: before, ratingAfter: after, score });

  let drop: string | undefined;
  if ((state.questsTotal + 1) % ITEM_EVERY_N_QUESTS === 0) {
    const item = corePack.battleItems[Math.floor(seedRng()() * corePack.battleItems.length)];
    store.log({ type: 'loot', kind: 'item', id: item.id, source: `quest:${q.id}` });
    drop = item.name;
  }
  return { xp, leveledUp: newLevel > state.levels[q.stat], newLevel, ratingChange: after - before, drop };
}

/** Record a calibration result (max reps / longest hold) and return the stat's new rating. */
export function recordPlacement(stat: StatId, questId: string, value: number): number | undefined {
  const q = questById(questId);
  if (!q?.curve) return undefined;
  const rating = placementRating(q.curve, value);
  store.log({ type: 'placement', stat, questId, value, rating });
  return rating;
}

/** Quests whose first run measures you instead of asking for a fixed amount. */
export const canCalibrate = (q: QuestDef) => !!q.curve && (q.kind === 'reps' || q.kind === 'timer');

/** First open: everyone starts with common gear (boss balance assumes it) and two items. */
export function grantStarterKit() {
  store.log(
    ...['iron-sword', 'leather-vest', 'prayer-beads'].map((id) => ({ type: 'loot' as const, kind: 'gear' as const, id, source: 'starter' })),
    { type: 'loot', kind: 'item', id: 'potion', source: 'starter' },
    { type: 'loot', kind: 'item', id: 'thunder-scroll', source: 'starter' },
  );
  store.updateProfile({ onboarded: true });
}

const TIER_RARITY: Record<number, Rarity> = { 1: 'common', 2: 'rare', 3: 'epic', 4: 'legendary' };

/** Loot after a boss fight: gear on a win (rarity by boss tier), a battle item either way. */
export function bossLoot(state: GameState, win: boolean): string[] {
  const rng = seedRng();
  const names: string[] = [];
  const src = `boss:${state.boss.def.id}`;
  if (win) {
    const owned = new Set(state.ownedGear.map((g) => g.id));
    const rarity = TIER_RARITY[state.boss.tier];
    const options = corePack.gear.filter((g) => g.rarity === rarity && !owned.has(g.id));
    const pool = options.length ? options : corePack.gear.filter((g) => !owned.has(g.id));
    if (pool.length) {
      const g = pool[Math.floor(rng() * pool.length)];
      store.log({ type: 'loot', kind: 'gear', id: g.id, source: src });
      names.push(g.name);
    }
  }
  const item = corePack.battleItems[Math.floor(rng() * corePack.battleItems.length)];
  store.log({ type: 'loot', kind: 'item', id: item.id, source: src });
  names.push(item.name);
  return names;
}
