// Progression looks: each class line starts as the same commoner and grows
// into a distinctive fantasy character.
import type { Look } from './wardrobe.ts';

const commonerItems = [{ id: 'shirt' }, { id: 'trousers' }, { id: 'shoes' }, { id: 'belt', mat2: 'leatherDark' }];

export const LOOKS: Look[] = [
  { name: 'Commoner', hair: { style: 'short', mat: 'hairBrown' }, items: commonerItems },

  // Warrior line
  {
    name: 'Initiate (STR)', hair: { style: 'short', mat: 'hairBrown' },
    items: [{ id: 'shirt' }, { id: 'trousers' }, { id: 'boots' }, { id: 'vest' }, { id: 'belt' }, { id: 'sword', mat: 'steelDark', mat2: 'leather' }],
  },
  {
    name: 'Warrior', build: 1.06, hair: { style: 'short', mat: 'hairBrown' },
    items: [{ id: 'trousers', mat: 'leatherDark' }, { id: 'boots' }, { id: 'chainmail' }, { id: 'vest', mat: 'clothRed', mat2: 'leather' }, { id: 'belt' }, { id: 'scabbard' }, { id: 'helmOpen' }, { id: 'shield' }, { id: 'sword' }],
  },
  {
    name: 'Paladin', build: 1.1, hair: { style: 'short', mat: 'hairBrown' }, aura: 'holy',
    items: [{ id: 'trousers', mat: 'leatherDark' }, { id: 'chainmail' }, { id: 'plate' }, { id: 'tabard' }, { id: 'cape' }, { id: 'helmKnight' }, { id: 'shield', mat: 'clothWhite', mat2: 'gold' }, { id: 'sword', mat: 'silver', mat2: 'gold' }],
  },

  // Sage line
  {
    name: 'Apprentice (INT)', hair: { style: 'long', mat: 'hairBlond' },
    items: [{ id: 'tunic', mat: 'clothBlue' }, { id: 'trousers', mat: 'leatherDark' }, { id: 'shoes' }, { id: 'belt' }, { id: 'staff', mat2: 'wood' }],
  },
  {
    name: 'Sage', hair: { style: 'long', mat: 'hairBlond' },
    items: [{ id: 'robe', mat: 'clothBlue', mat2: 'clothWhite' }, { id: 'sash', mat: 'clothWhite' }, { id: 'shoes' }, { id: 'hood', mat: 'clothBlue' }, { id: 'staff' }],
  },
  {
    name: 'Archmage', hair: { style: 'long', mat: 'hairWhite' }, aura: 'arcane',
    items: [{ id: 'robe', mat: 'clothPurple', mat2: 'gold' }, { id: 'sash', mat: 'gold' }, { id: 'shoes', mat: 'leatherDark' }, { id: 'cape', mat: 'clothDeepBlue', mat2: 'arcane' }, { id: 'circlet' }, { id: 'staff', mat: 'gold' }],
  },
];
