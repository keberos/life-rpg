// Legacy: what carries across seasons. Unlocks add options for the next run;
// they never require a particular stat and never make an old build obsolete.

export interface PerkDef {
  id: string;
  name: string;
  /** What it does for the season you pick it in. */
  effect: string;
  /** How you unlock it (shown while locked). */
  unlock: string;
}

export const PERKS: PerkDef[] = [
  { id: 'field-kit', name: 'Field Kit', effect: 'Start the season with 2 Healing Potions and a Ward Scroll.', unlock: 'Finish a season.' },
  { id: 'heirloom', name: 'Heirloom', effect: 'Carry one piece of gear from last season into the new one.', unlock: 'Beat all four bosses in one season.' },
];

export const perkById = (id: string | undefined) => PERKS.find((p) => p.id === id);
