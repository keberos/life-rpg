// XP and levels. Honor system: XP depends only on how hard the quest was FOR YOU
// (relative difficulty), never on quest type or whether the app could verify it.

export type RelativeDifficulty = 'easy' | 'normal' | 'hard';
export type QuestOutcome = 'success' | 'fail';

export const XP_TABLE: Record<RelativeDifficulty, number> = { easy: 15, normal: 25, hard: 40 };

/** Share of XP kept on a failed attempt: effort still counts. */
export const FAIL_XP_SHARE = 0.4;

/** Rested XP: bonus for a stat you haven't trained lately. Never a penalty. */
export function restedMultiplier(daysSinceTrained: number): number {
  return 1 + Math.min(Math.max(daysSinceTrained, 0), 7) * 0.1; // up to 1.7x after a week
}

export function questXp(difficulty: RelativeDifficulty, outcome: QuestOutcome, daysSinceTrained = 0): number {
  const base = XP_TABLE[difficulty] * (outcome === 'success' ? 1 : FAIL_XP_SHARE);
  return Math.round(base * restedMultiplier(daysSinceTrained));
}

/** Cumulative XP needed to reach a stat level. Level 1 is free. */
export function xpForLevel(level: number): number {
  return level <= 1 ? 0 : Math.round(10 * Math.pow(level, 1.5));
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level++;
  return level;
}
