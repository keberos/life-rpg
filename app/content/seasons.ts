// Season themes and goals. A theme gives two stats bonus XP for the season; a
// goal is the player's own target, which steers the suggested quests.
// Neither one is required, and training a stat outside them still counts in full.
import type { StatId } from '../../src/engine/types.ts';

export interface ThemeDef {
  id: string;
  name: string;
  stats: StatId[];
  blurb: string;
}

/** Bonus XP on a theme's stats (on top of everything else). */
export const THEME_BONUS = 0.25;

/** Season 1 has no theme, so the first run stays simple. Themes rotate from Season 2. */
export const THEMES: ThemeDef[] = [
  { id: 'stillness', name: 'Season of Stillness', stats: ['STA', 'WIS'], blurb: 'Long holds and quiet focus.' },
  { id: 'blade', name: 'Season of the Blade', stats: ['STR', 'AGI'], blurb: 'Strength and quick feet.' },
  { id: 'lanterns', name: 'Season of Lanterns', stats: ['INT', 'FTH'], blurb: 'Study, Scripture and sharp thinking.' },
];

export const themeFor = (seasonNumber: number): ThemeDef | undefined =>
  seasonNumber < 2 ? undefined : THEMES[(seasonNumber - 2) % THEMES.length];

/** A season goal: unlock a class, or beat a boss. */
export type Goal = { kind: 'class'; id: string } | { kind: 'boss'; id: string };

/** Lowest boss tier you can set as a goal (the first boss comes on its own). */
export const GOAL_MIN_BOSS_TIER = 2;

/**
 * Second Wind: catch-up XP for players behind a steady season pace, so playing a
 * few times a week still reaches the late bosses. It fades out as you reach the
 * pace and never applies above it, so more play always means more progress.
 */
export const SECOND_WIND_MAX = 1; // up to +100% XP when far behind
const SECOND_WIND_SLOPE = 2; // 25% behind the pace = +50% XP
/** Total level a steady player has after `days` of the season (all six stats start at 1). */
export const paceLevel = (days: number) => 6 + 125 * (1 - Math.exp(-Math.max(0, days) / 40));
/** Bonus share of base XP for this total level at this point in the season. */
export function secondWind(totalLevel: number, days: number): number {
  const pace = paceLevel(days);
  return Math.min(SECOND_WIND_MAX, Math.max(0, (SECOND_WIND_SLOPE * (pace - totalLevel)) / pace));
}
