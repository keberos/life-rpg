// Legacy: what carries across seasons. Unlocks add options for the next run;
// they never require a particular stat and never make an old build obsolete.
//
// Relics are trophies: the first win over each boss form (the original in
// Season 1, then its three seasonal forms) leaves a named relic. Two relics from
// the same boss family unlock that family's perk; eight relics unlock Collector
// (pick two perks a season). Perks are small on purpose: a reward for coming
// back, worth a few points of win chance, not power creep.
import type { FightBonus } from '../../src/engine/combat.ts';

export interface PerkDef {
  id: string;
  name: string;
  /** What it does for the season you pick it in. */
  effect: string;
  /** How you unlock it (shown while locked). */
  unlock: string;
  /** Combat bonus while picked (relic perks). */
  bonus?: FightBonus;
  /** Battle items you carry into a fight while picked. */
  satchel?: number;
}

export const PERKS: PerkDef[] = [
  { id: 'field-kit', name: 'Field Kit', effect: 'Start the season with 2 Healing Potions and a Ward Scroll.', unlock: 'Finish a season.' },
  { id: 'heirloom', name: 'Heirloom', effect: 'Carry one piece of gear from last season into the new one.', unlock: 'Beat all four bosses in one season.' },
  { id: 'troll-tusk', name: 'Troll Tusk Charm', effect: 'Start every boss fight behind a small shield (8% of your HP).', unlock: 'Hold 2 Troll relics.', bonus: { shieldPct: 0.08 } },
  { id: 'harpy-plume', name: 'Harpy Plume', effect: '+4% dodge in boss fights.', unlock: 'Hold 2 Harpy relics.', bonus: { dodge: 0.04 } },
  { id: 'warden-lamp', name: "Warden's Lamp", effect: 'Boss special attacks hit you 10% softer.', unlock: 'Hold 2 Warden relics.', bonus: { specialResist: 0.1 } },
  { id: 'wyrm-scale', name: 'Wyrm Scale', effect: 'Carry 4 battle items into each fight instead of 3.', unlock: 'Hold 2 Wyrm relics.', satchel: 4 },
  { id: 'collector', name: 'Collector', effect: 'Pick two starting perks each season instead of one.', unlock: 'Hold 8 relics.' },
];

export const perkById = (id: string | undefined) => PERKS.find((p) => p.id === id);

export interface RelicDef {
  /** `${bossId}:${formId}`; the original boss uses form 'base'. */
  id: string;
  name: string;
  bossId: string;
  form: string;
  /** Which family perk it counts toward. */
  family: 'troll' | 'harpy' | 'warden' | 'wyrm';
  blurb: string;
}

const r = (bossId: string, form: string, family: RelicDef['family'], name: string, blurb: string): RelicDef => ({ id: `${bossId}:${form}`, name, bossId, form, family, blurb });

export const RELICS: RelicDef[] = [
  r('bog-troll', 'base', 'troll', 'Bog Troll Tusk', 'Chipped, muddy, and still warm.'),
  r('bog-troll', 'moss-troll', 'troll', 'Moss Heart', 'A ball of moss that slowly breathes.'),
  r('bog-troll', 'stone-troll', 'troll', 'Granite Knuckle', 'Heavier than it looks.'),
  r('bog-troll', 'lantern-troll', 'troll', 'Swamp Light', 'A wisp that follows you home.'),
  r('storm-harpy', 'base', 'harpy', 'Storm Feather', 'It crackles in dry weather.'),
  r('storm-harpy', 'mist-harpy', 'harpy', 'Mist Pearl', 'Cool to the touch, always damp.'),
  r('storm-harpy', 'ironfeather-harpy', 'harpy', 'Steel Quill', 'Sharp enough to write in stone.'),
  r('storm-harpy', 'ember-harpy', 'harpy', 'Cinder Plume', 'Never quite stops smoldering.'),
  r('hollow-warden', 'base', 'warden', 'Hollow Key', 'Opens nothing you can find.'),
  r('hollow-warden', 'silent-warden', 'warden', 'Silent Bell', 'Ring it, and the room goes quiet.'),
  r('hollow-warden', 'rusted-warden', 'warden', 'Rusted Sigil', 'An old oath, half worn away.'),
  r('hollow-warden', 'lantern-warden', 'warden', "Warden's Wick", 'It lights for the lost.'),
  r('ashen-wyrm', 'base', 'wyrm', 'Ashen Scale', 'Smells faintly of a dead fire.'),
  r('ashen-wyrm', 'frost-wyrm', 'wyrm', 'Frost Fang', 'Frost forms on it in summer.'),
  r('ashen-wyrm', 'iron-wyrm', 'wyrm', 'Iron Scale', 'Rings like a struck shield.'),
  r('ashen-wyrm', 'void-wyrm', 'wyrm', 'Void Shard', 'Stars move inside it.'),
];

export const relicById = (id: string) => RELICS.find((x) => x.id === id);
export const relicFor = (bossId: string, form: string | undefined) => relicById(`${bossId}:${form ?? 'base'}`);

const FAMILY_PERK: Record<RelicDef['family'], string> = { troll: 'troll-tusk', harpy: 'harpy-plume', warden: 'warden-lamp', wyrm: 'wyrm-scale' };
export const RELICS_PER_FAMILY_PERK = 2;
export const COLLECTOR_RELICS = 8;

/** Perks unlocked by the relics you hold. */
export function relicPerks(relicIds: string[]): string[] {
  const held = relicIds.map(relicById).filter((x): x is RelicDef => !!x);
  const out: string[] = [];
  for (const [family, perk] of Object.entries(FAMILY_PERK)) if (held.filter((x) => x.family === family).length >= RELICS_PER_FAMILY_PERK) out.push(perk);
  if (held.length >= COLLECTOR_RELICS) out.push('collector');
  return out;
}

/** How many starting perks you may pick this season. */
export const perkSlots = (unlocked: string[]) => (unlocked.includes('collector') ? 2 : 1);

/** Combined fight bonus and satchel size from the season's picked perks. */
export function perkEffects(perks: string[]): { bonus: FightBonus; satchel: number } {
  const bonus: FightBonus = {};
  let satchel = 3;
  for (const id of perks) {
    const p = perkById(id);
    if (!p) continue;
    if (p.bonus?.shieldPct) bonus.shieldPct = (bonus.shieldPct ?? 0) + p.bonus.shieldPct;
    if (p.bonus?.dodge) bonus.dodge = (bonus.dodge ?? 0) + p.bonus.dodge;
    if (p.bonus?.specialResist) bonus.specialResist = (bonus.specialResist ?? 0) + p.bonus.specialResist;
    if (p.satchel) satchel = Math.max(satchel, p.satchel);
  }
  return { bonus, satchel };
}
