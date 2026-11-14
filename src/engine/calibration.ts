// Per-user, per-stat difficulty. A rating is a unitless number; each quest
// template maps it to its own parameter (reps, seconds, question tier) through
// a curve stored in content. The update rule settles where the person
// succeeds about TARGET_SUCCESS of the time: challenging, not discouraging.
import type { QuestTemplateCurve } from './types.ts';

export const TARGET_SUCCESS = 0.75;
export const STEP = 2;

export type Feedback = 'tooEasy' | 'success' | 'fail' | 'tooHard';

/** Expected-score update (Elo-style) whose fixed point is TARGET_SUCCESS. */
export function updateRating(rating: number, feedback: Feedback): number {
  switch (feedback) {
    case 'success':
      return rating + STEP * (1 - TARGET_SUCCESS);
    case 'tooEasy':
      return rating + STEP;
    case 'fail':
      return rating - STEP * TARGET_SUCCESS;
    case 'tooHard':
      return rating - STEP;
  }
}

/** The quest parameter for a rating, e.g. plank seconds. */
export function paramFor(curve: QuestTemplateCurve, rating: number): number {
  const v = curve.base * Math.pow(curve.growth, rating);
  return Math.round(Math.min(curve.max, Math.max(curve.min, v)));
}

/** Placement: turn a measured value into a starting rating. */
export function ratingFor(curve: QuestTemplateCurve, value: number): number {
  return Math.log(Math.max(value, curve.min) / curve.base) / Math.log(curve.growth);
}

/**
 * Starting rating from a placement test. A normal quest asks for ~60% of a
 * measured max (e.g. max 20 pushups -> sets of 12).
 */
export function placementRating(curve: QuestTemplateCurve, measuredMax: number): number {
  return ratingFor(curve, measuredMax * 0.6);
}
