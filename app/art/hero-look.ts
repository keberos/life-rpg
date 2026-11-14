// Builds the hero's look from class + equipped gear, so progression shows on
// the character: plain clothes at first, then every piece you earn appears.
import { CLASS_LOOKS } from '../../art-kit/src/class-looks.ts';
import type { ItemSpec, Look } from '../../art-kit/src/wardrobe.ts';

/** Per class: signature cloth color and one small accent that marks the class. */
const CLASS_STYLE: Record<string, { cloth: string; accent?: ItemSpec[]; lookName?: string }> = {
  adventurer: { cloth: 'linen' },
  warrior: { cloth: 'clothRed', accent: [{ id: 'bandana' }], lookName: 'Warrior' },
  paladin: { cloth: 'clothBlue', lookName: 'Paladin' },
  ranger: { cloth: 'clothForest', accent: [{ id: 'scarf', mat: 'clothForest' }], lookName: 'Ranger' },
  monk: { cloth: 'clothOrange', accent: [{ id: 'sash', mat: 'clothBlack' }], lookName: 'Monk' },
  sage: { cloth: 'clothPurple', accent: [{ id: 'wizardHat', mat: 'clothPurple' }], lookName: 'Sage' },
  cleric: { cloth: 'clothWhite', accent: [{ id: 'hairRibbon', mat: 'clothWhite' }], lookName: 'Cleric' },
  spellblade: { cloth: 'clothBlack', accent: [{ id: 'scarf', mat: 'clothPurple' }], lookName: 'Spellblade' },
};

/** Game gear id -> art-kit pieces worn on the hero. */
export const GEAR_VISUALS: Record<string, { items: ItemSpec[]; aura?: string }> = {
  'iron-sword': { items: [{ id: 'sword', mat: 'steelDark', mat2: 'leather' }] },
  'oak-staff': { items: [{ id: 'staff', mat: 'wood', mat2: 'wood' }] },
  'leather-vest': { items: [{ id: 'vest' }] },
  'prayer-beads': { items: [{ id: 'amulet', mat: 'wood', mat2: 'holy' }] },
  twinfang: { items: [{ id: 'sword', mat: 'silver', mat2: 'gold' }] },
  mossweave: { items: [{ id: 'chainmail' }, { id: 'leatherArmor', mat: 'clothForest', mat2: 'leatherDark' }] },
  'mirror-charm': { items: [{ id: 'amulet', mat: 'silver', mat2: 'arcane' }] },
  'saints-locket': { items: [{ id: 'amulet', mat: 'gold', mat2: 'holy' }] },
  bulwark: { items: [{ id: 'chainmail' }, { id: 'plate' }, { id: 'shield', mat: 'steel', mat2: 'gold' }] },
  emberglass: { items: [{ id: 'staff', mat: 'gold', mat2: 'flame' }] },
  'halo-of-mercy': { items: [{ id: 'circlet', mat: 'gold', mat2: 'holy' }, { id: 'cape', mat: 'clothWhite', mat2: 'gold' }], aura: 'holy' },
};

export function heroLook(classId: string, gearIds: string[]): Look {
  const style = CLASS_STYLE[classId] ?? CLASS_STYLE.adventurer;
  const base = CLASS_LOOKS.find((l) => l.name.startsWith(style.lookName ?? '#none'));
  const items: ItemSpec[] = [
    { id: 'shirt', mat: style.cloth },
    { id: 'trousers', mat: classId === 'adventurer' ? 'burlap' : 'leatherDark' },
    { id: 'shoes' },
    { id: 'belt', mat2: 'leatherDark' },
    ...(style.accent ?? []),
  ];
  let aura: string | undefined;
  for (const id of gearIds) {
    const v = GEAR_VISUALS[id];
    if (!v) continue;
    items.push(...v.items);
    aura = v.aura ?? aura;
  }
  return {
    name: `${classId}:${gearIds.join('+')}`,
    hair: base?.hair ?? { style: 'short', mat: 'hairBrown' },
    iris: base?.iris ?? 'irisBrown',
    skin: base?.skin,
    build: base?.build,
    aura,
    items,
  };
}

/** Cache key: changes whenever the visible look would change. */
export const heroKey = (classId: string, gearIds: string[]) => `v1|${classId}|${[...gearIds].sort().join(',')}`;
