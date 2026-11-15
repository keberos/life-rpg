// Seasonal boss forms. Season 1 uses the base bosses. From Season 2 each boss
// takes one of three forms, rotating with the season themes (Stillness, Blade,
// Lanterns), so a new season doesn't replay the last one: new name and colors,
// new weaknesses, a new special, different armor.
//
// Rules the forms keep (checked by test/boss-forms.test.ts):
// - Within a season, all six stats appear as a weakness at least once, so no
//   build is left out, and each form's weaknesses include one theme stat.
// - Each form is tuned (hpMult/attackMult, from `npm run tune:forms`) to the same
//   ~75% win rate for an on-schedule Balanced player as the base boss.
import type { BossDef, StatId } from '../engine/types.ts';
import { corePack } from './core-pack.ts';

export interface BossForm {
  id: string;
  name: string;
  /** One line for the boss screen: what changed. */
  blurb: string;
  weakTo: StatId[];
  armor: number;
  special: { name: string; every: number; mult: number };
  enrageTurn?: number;
  /** Tuning multipliers on the base boss's HP and attack. */
  hpMult: number;
  attackMult: number;
}

/** Form index per season: Season 2 -> 0 (Stillness), 3 -> 1 (Blade), 4 -> 2 (Lanterns), then repeat. */
export const formIndex = (seasonNumber: number) => (seasonNumber < 2 ? -1 : (seasonNumber - 2) % 3);

export const BOSS_FORMS: Record<string, [BossForm, BossForm, BossForm]> = {
  'bog-troll': [
    { id: 'moss-troll', name: 'Moss Troll', blurb: 'Grown over with moss. Spore clouds come often.', weakTo: ['STA', 'FTH'], armor: 28, special: { name: 'Spore Cloud', every: 3, mult: 1.8 }, hpMult: 0.98, attackMult: 0.98 },
    { id: 'stone-troll', name: 'Stone Troll', blurb: 'Hide like granite. Heavy armor, slow boulders.', weakTo: ['STR', 'FTH'], armor: 42, special: { name: 'Boulder Toss', every: 4, mult: 2.4 }, hpMult: 0.93, attackMult: 0.93 },
    { id: 'lantern-troll', name: 'Lantern Troll', blurb: 'Swamp lights swirl around it. Thin hide, quick spells.', weakTo: ['INT', 'STR'], armor: 14, special: { name: 'Will-o\'-Wisp', every: 3, mult: 2.0 }, hpMult: 0.98, attackMult: 0.98 },
  ],
  'storm-harpy': [
    { id: 'mist-harpy', name: 'Mist Harpy', blurb: 'Hides in fog and sings you drowsy.', weakTo: ['WIS', 'AGI'], armor: 10, special: { name: 'Lull Song', every: 4, mult: 2.3 }, hpMult: 1.0, attackMult: 1.0 },
    { id: 'ironfeather-harpy', name: 'Ironfeather Harpy', blurb: 'Steel-tipped plumes. Armored, and it cuts.', weakTo: ['STR', 'INT'], armor: 30, special: { name: 'Razor Plumes', every: 3, mult: 2.1 }, hpMult: 0.95, attackMult: 0.95 },
    { id: 'ember-harpy', name: 'Ember Harpy', blurb: 'Wings of cinder. Fragile but fierce.', weakTo: ['FTH', 'AGI'], armor: 5, special: { name: 'Cinder Wing', every: 3, mult: 2.2 }, hpMult: 0.98, attackMult: 0.98 },
  ],
  'hollow-warden': [
    { id: 'silent-warden', name: 'Silent Warden', blurb: 'Makes no sound. Its hush hits hard.', weakTo: ['STA', 'INT'], armor: 34, special: { name: 'Hush', every: 4, mult: 2.6 }, hpMult: 1.03, attackMult: 1.03 },
    { id: 'rusted-warden', name: 'Rusted Warden', blurb: 'Old armor, thick and pitted. Swings wide.', weakTo: ['AGI', 'WIS'], armor: 44, special: { name: 'Rending Cleave', every: 4, mult: 2.5 }, hpMult: 0.99, attackMult: 0.99 },
    { id: 'lantern-warden', name: 'Lantern Warden', blurb: 'Carries a lamp of trapped souls.', weakTo: ['FTH', 'WIS'], armor: 24, special: { name: 'Soul Lamp', every: 3, mult: 2.2 }, hpMult: 1.02, attackMult: 1.02 },
  ],
  'ashen-wyrm': [
    { id: 'frost-wyrm', name: 'Frost Wyrm', blurb: 'Breath of rime instead of fire.', weakTo: ['WIS', 'STR'], armor: 15, special: { name: 'Rime Breath', every: 3, mult: 2.4 }, hpMult: 1.0, attackMult: 1.0 },
    { id: 'iron-wyrm', name: 'Iron Wyrm', blurb: 'Scales like plate. Its tail sweeps the field.', weakTo: ['AGI', 'STA'], armor: 34, special: { name: 'Tail Sweep', every: 4, mult: 2.6 }, hpMult: 0.98, attackMult: 0.98 },
    { id: 'void-wyrm', name: 'Void Wyrm', blurb: 'Swallows starlight. Calls down falling stars.', weakTo: ['INT', 'STA'], armor: 10, special: { name: 'Starfall', every: 3, mult: 2.3 }, hpMult: 1.03, attackMult: 1.03 },
  ],
};

/** The boss as it appears in a given season (the base boss in Season 1). Keeps the base id. */
export function bossForSeason(base: BossDef, seasonNumber: number): BossDef & { form?: string; blurb?: string } {
  const i = formIndex(seasonNumber);
  const f = i >= 0 ? BOSS_FORMS[base.id]?.[i] : undefined;
  if (!f) return base;
  return {
    ...base,
    name: f.name,
    weakTo: f.weakTo,
    armor: f.armor,
    special: f.special,
    enrageTurn: f.enrageTurn ?? base.enrageTurn,
    hp: Math.round(base.hp * f.hpMult),
    attack: Math.round(base.attack * f.attackMult * 10) / 10,
    form: f.id,
    blurb: f.blurb,
  };
}

/** All bosses as they appear in a season, in tier order. */
export const seasonBosses = (seasonNumber: number) => corePack.bosses.map((b) => bossForSeason(b, seasonNumber));
/** One boss (by base id) as it appears in a season. */
export const seasonBoss = (id: string, seasonNumber: number) => seasonBosses(seasonNumber).find((b) => b.id === id);
