// Core types. Everything game-specific (stats, classes, gear, bosses) is DATA
// described by these types and lives in content packs, never hard-coded in
// the engine. A user's profile only stores numbers and ids that point at packs.

export const STAT_IDS = ['STR', 'AGI', 'STA', 'INT', 'WIS', 'FTH'] as const;
export type StatId = (typeof STAT_IDS)[number];
export type StatBlock = Record<StatId, number>;

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type GearSlot = 'weapon' | 'armor' | 'charm' | 'relic';

/** What an ability or item does when it fires. */
export type Effect =
  | { kind: 'damage'; base: number; scaling?: StatId; perPoint?: number; ignoresArmor?: boolean }
  | { kind: 'damagePctBoss'; pct: number } // scales with the boss, so items stay useful all season
  | { kind: 'extraHit'; mult: number }
  | { kind: 'heal'; pctMaxHp: number }
  | { kind: 'shield'; pctMaxHp: number }
  | { kind: 'stun'; turns: number }
  | { kind: 'buffDamage'; mult: number; turns: number }
  | { kind: 'stackDamage'; pct: number; max: number } // +pct damage per stack for the rest of the fight
  | { kind: 'evade'; attacks: number }; // the next N boss attacks miss, specials included

/** Always-on gear ability. Fires on a trigger, sometimes with a chance. */
export interface PassiveDef {
  id: string;
  name: string;
  trigger: 'onHit' | 'turnStart' | 'onDodge' | 'onHeal' | 'onHurt';
  chance: number; // 0..1
  effects: Effect[];
}

/**
 * When the auto-battler's "smart" player would press this.
 * In the real game the player presses it; the hint is only for the simulator.
 */
export type UseHint = 'lowHp' | 'beforeSpecial' | 'asap';

/** A button the player can press mid-fight. */
export interface ActiveDef {
  id: string;
  name: string;
  charges: number; // uses per fight
  cooldown: number; // turns between uses
  effects: Effect[];
  hint: UseHint;
}

export interface GearDef {
  id: string;
  name: string;
  slot: GearSlot;
  rarity: Rarity;
  stats: Partial<StatBlock>;
  passive?: PassiveDef; // rare and above
  active?: ActiveDef; // epic and above
}

/** Single-use, scarce. Spent when used. */
export interface BattleItemDef {
  id: string;
  name: string;
  effects: Effect[];
  hint: UseHint;
}

export interface ClassPassive {
  hpMult?: number;
  physMult?: number;
  spellMult?: number;
  healMult?: number;
  critBonus?: number;
  dodgeBonus?: number;
}

/** Classes unlock at stat THRESHOLDS, never ratios, so training more never removes one. */
export interface ClassDef {
  id: string;
  name: string;
  requires: Partial<StatBlock>;
  passive: ClassPassive;
  /** Signature passive: what makes the class play differently. */
  trait?: PassiveDef;
  /** Buttons the class brings to every fight. */
  abilities?: ActiveDef[];
}

export interface BossDef {
  id: string;
  name: string;
  tier: number;
  hp: number;
  attack: number;
  armor: number;
  weakTo: StatId[]; // these stats count extra in this fight
  special: { name: string; every: number; mult: number };
  enrageTurn: number; // boss damage ramps after this turn so fights end
}

export interface QuestTemplateCurve {
  /** param = base * growth ^ rating, e.g. pushup reps or plank seconds */
  base: number;
  growth: number;
  min: number;
  max: number;
}

export interface ContentPack {
  id: string;
  version: string;
  classes: ClassDef[];
  gear: GearDef[];
  battleItems: BattleItemDef[];
  bosses: BossDef[];
}
