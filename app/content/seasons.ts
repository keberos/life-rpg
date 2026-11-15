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
