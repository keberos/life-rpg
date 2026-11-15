// Which game gear shows in the hero's hand, and how (shared by the art kit's
// modular export and the app, so it has no renderer imports). Heroes carry one
// weapon in the right hand; no shields are drawn (the Bulwark is armor, and
// combat shields are magic barriers).
export type Kind = 'punch' | 'swing' | 'spell';
export const KINDS: Kind[] = ['punch', 'swing', 'spell'];

export const HELD_GEAR: Record<string, { item: { id: string; mat?: string; mat2?: string }; kind: Kind }> = {
  'iron-sword': { item: { id: 'ironSword' }, kind: 'swing' },
  twinfang: { item: { id: 'twinfang' }, kind: 'swing' },
  'oak-staff': { item: { id: 'oakStaff' }, kind: 'spell' },
  emberglass: { item: { id: 'emberglassRod' }, kind: 'spell' },
  // Class standard weapons, shown until gear takes the hand.
  'warrior-axe': { item: { id: 'axe' }, kind: 'swing' },
  'paladin-sword': { item: { id: 'sword', mat: 'silver', mat2: 'gold' }, kind: 'swing' },
  'ranger-dagger': { item: { id: 'dagger' }, kind: 'swing' },
  'sage-staff': { item: { id: 'staff', mat: 'gold' }, kind: 'spell' },
  'cleric-mace': { item: { id: 'mace', mat: 'gold' }, kind: 'swing' },
  'spellblade-blade': { item: { id: 'runeblade' }, kind: 'swing' },
};

/** What each class holds by default (adventurers and monks fight bare-handed). */
export const CLASS_WEAPON: Record<string, string> = {
  warrior: 'warrior-axe',
  paladin: 'paladin-sword',
  ranger: 'ranger-dagger',
  sage: 'sage-staff',
  cleric: 'cleric-mace',
  spellblade: 'spellblade-blade',
};

/** The weapon a hero shows: equipped gear first, else their class's. */
export const weaponFor = (classId: string, gearIds: string[]): string | undefined => gearIds.find((id) => HELD_GEAR[id]) ?? CLASS_WEAPON[classId];
/** Which attack a hero uses: their weapon's, or punch when empty-handed. */
export const kindFor = (weapon: string | undefined): Kind => (weapon ? HELD_GEAR[weapon].kind : 'punch');

/** Sprite paths (relative to the app) for a hero: the class body, then the weapon on top. */
export function heroLayers(classId: string, gearIds: string[]): string[] {
  const weapon = weaponFor(classId, gearIds), kind = kindFor(weapon);
  return [`sprites/body/${classId}-${kind}.png`, ...(weapon ? [`sprites/held/${weapon}-${kind}.png`] : [])];
}
