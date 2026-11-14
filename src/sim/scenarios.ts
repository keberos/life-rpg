// Shared building blocks for the simulator and the balance tests.
import { corePack } from '../content/core-pack.ts';
import { unlockedClasses } from '../engine/classes.ts';
import { fight, type Loadout, type Policy } from '../engine/combat.ts';
import { makeRng } from '../engine/rng.ts';
import { distribute } from '../engine/stats.ts';
import type { BattleItemDef, BossDef, ClassDef, GearDef, StatBlock } from '../engine/types.ts';

export const pack = corePack;

/** Build archetypes: relative stat weights. Several deliberately skip a stat. */
export const BUILDS: Record<string, Partial<StatBlock>> = {
  Balanced: { STR: 1, AGI: 1, STA: 1, INT: 1, WIS: 1, FTH: 1 },
  Brute: { STR: 3, STA: 3, AGI: 1, WIS: 1 },
  Scholar: { INT: 3, WIS: 3, STA: 1, FTH: 1 },
  Devout: { FTH: 3, WIS: 2, STA: 2, STR: 1 },
  Skirmisher: { AGI: 3, STA: 2, STR: 2, INT: 1 },
  'No FTH': { STR: 1, AGI: 1, STA: 1, INT: 1, WIS: 1 },
  'No INT': { STR: 1, AGI: 1, STA: 1, WIS: 1, FTH: 1 },
  'No STR': { AGI: 1, STA: 1, INT: 1, WIS: 1, FTH: 1 },
  'No STA': { STR: 1, AGI: 1, INT: 1, WIS: 1, FTH: 1 },
};

/**
 * Total stat points a steady player has when each boss arrives.
 * Season = 8 weeks, ~25 per stat by the end (see progression.ts curve).
 */
export const ON_SCHEDULE_POINTS: Record<number, number> = { 1: 36, 2: 72, 3: 108, 4: 150 };

export type GearTier = 'none' | 'common' | 'rare' | 'epic';

const g = (id: string): GearDef => {
  const found = pack.gear.find((x) => x.id === id);
  if (!found) throw new Error(`unknown gear ${id}`);
  return found;
};
const item = (id: string): BattleItemDef => {
  const found = pack.battleItems.find((x) => x.id === id);
  if (!found) throw new Error(`unknown item ${id}`);
  return found;
};

/** A sensible loadout for a stat block at a gear tier. */
export function gearFor(stats: StatBlock, tier: GearTier): GearDef[] {
  const caster = stats.INT > stats.STR;
  const pious = stats.FTH >= stats.AGI;
  switch (tier) {
    case 'none':
      return [];
    case 'common':
      return [g(caster ? 'oak-staff' : 'iron-sword'), g('leather-vest'), g('prayer-beads')];
    case 'rare':
      return [g(caster ? 'oak-staff' : 'twinfang'), g('mossweave'), g(pious ? 'saints-locket' : 'mirror-charm')];
    case 'epic':
      return [g(caster ? 'emberglass' : 'twinfang'), g('bulwark'), g(pious ? 'saints-locket' : 'mirror-charm'), g('halo-of-mercy')];
  }
}

export const ITEM_KIT: BattleItemDef[] = [item('potion'), item('thunder-scroll')];

export interface Scenario {
  stats: StatBlock;
  boss: BossDef;
  gear: GearTier;
  items: boolean;
  policy: Policy;
  cls?: ClassDef;
}

export function winRate(s: Scenario, trials = 2000, seed = 1): number {
  const cls = s.cls ?? bestClass(s.stats, s.boss, s.gear);
  const load: Loadout = { stats: s.stats, cls, gear: gearFor(s.stats, s.gear), items: s.items ? ITEM_KIT : [] };
  const rng = makeRng(seed);
  let wins = 0;
  for (let i = 0; i < trials; i++) if (fight(load, s.boss, rng, s.policy).win) wins++;
  return wins / trials;
}

/** Players pick their best unlocked class; approximate that with a short sim. */
export function bestClass(stats: StatBlock, boss: BossDef, gear: GearTier): ClassDef {
  const options = unlockedClasses(stats, pack.classes);
  let best = options[0];
  let bestRate = -1;
  for (const cls of options) {
    const r = winRate({ stats, boss, gear, items: false, policy: 'auto', cls }, 300, 99);
    if (r > bestRate) [best, bestRate] = [cls, r];
  }
  return best;
}

/** Share of on-schedule points at which a Balanced player who presses nothing wins ~50%. */
export function coinFlipShare(boss: BossDef, gear: GearTier): number {
  let lo = 0.2;
  let hi = 2;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    const r = winRate({ stats: buildStats('Balanced', ON_SCHEDULE_POINTS[boss.tier] * mid), boss, gear, items: false, policy: 'auto' }, 800, 5);
    if (r < 0.5) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function buildStats(build: string, points: number): StatBlock {
  return distribute(points, BUILDS[build]);
}
