import { STAT_IDS, type StatBlock } from './types.ts';

export function emptyStats(fill = 0): StatBlock {
  return Object.fromEntries(STAT_IDS.map((s) => [s, fill])) as StatBlock;
}

export function addStats(a: StatBlock, b: Partial<StatBlock>): StatBlock {
  const out = { ...a };
  for (const s of STAT_IDS) out[s] += b[s] ?? 0;
  return out;
}

export function totalStats(s: StatBlock): number {
  return STAT_IDS.reduce((n, id) => n + s[id], 0);
}

/**
 * Spread `points` over stats by relative weights (missing weight = 0).
 * Used by the simulator to build comparable characters.
 */
export function distribute(points: number, weights: Partial<StatBlock>): StatBlock {
  const w = STAT_IDS.map((s) => weights[s] ?? 0);
  const sum = w.reduce((a, b) => a + b, 0);
  const out = emptyStats();
  if (sum === 0) return out;
  STAT_IDS.forEach((s, i) => (out[s] = (points * w[i]) / sum));
  return out;
}
