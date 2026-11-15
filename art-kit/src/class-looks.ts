// Top-tier look for every class in the game, plus armory rows that show
// single pieces on a plain commoner.
import type { ItemSpec, Look } from './wardrobe.ts';

export const CLASS_LOOKS: Look[] = [
  {
    name: 'Warrior', build: 1.12, hair: { style: 'hero', mat: 'hairRed' }, iris: 'irisAmber', aura: 'flame',
    items: [{ id: 'trousers', mat: 'leatherDark' }, { id: 'boots' }, { id: 'chainmail' }, { id: 'brigandine' }, { id: 'furMantle' }, { id: 'belt' }, { id: 'bandana' }, { id: 'scarf', mat: 'clothRed' }, { id: 'bracers' }, { id: 'axe' }, { id: 'shield', mat: 'wood', mat2: 'steel' }],
  },
  {
    name: 'Paladin', build: 1.1, hair: { style: 'swept', mat: 'hairBlond' }, iris: 'irisBlue', aura: 'holy',
    items: [{ id: 'trousers', mat: 'leatherDark' }, { id: 'chainmail' }, { id: 'plate' }, { id: 'tabard', mat: 'clothBlue', mat2: 'gold' }, { id: 'cape', mat: 'clothBlue', mat2: 'gold' }, { id: 'circlet', mat: 'silver', mat2: 'holy' }, { id: 'kiteShield', mat: 'clothBlue', mat2: 'gold' }, { id: 'sword', mat: 'silver', mat2: 'gold' }],
  },
  {
    name: 'Ranger', hair: { style: 'ponytail', mat: 'hairBlack' }, iris: 'irisGreen', aura: 'nature',
    items: [{ id: 'trousers', mat: 'burlap' }, { id: 'boots' }, { id: 'shirt', mat: 'clothForest' }, { id: 'leatherArmor' }, { id: 'belt' }, { id: 'crossStrap' }, { id: 'bracers' }, { id: 'scarf', mat: 'clothForest' }, { id: 'quiver' }, { id: 'bow' }, { id: 'dagger' }],
  },
  {
    name: 'Monk', build: 1.04, hair: { style: 'bun', mat: 'hairBlack' }, iris: 'irisBrown', skin: 'skinTan', aura: 'holy',
    items: [{ id: 'gi', mat: 'clothOrange', mat2: 'clothBlack' }, { id: 'sash', mat: 'clothBlack' }, { id: 'wraps' }, { id: 'shoes', mat: 'leatherDark' }, { id: 'hairRibbon', mat: 'clothOrange' }, { id: 'amulet', mat2: 'holy' }],
  },
  {
    name: 'Sage', hair: { style: 'flowing', mat: 'hairWhite' }, iris: 'irisViolet', aura: 'arcane',
    items: [{ id: 'robe', mat: 'clothPurple', mat2: 'gold' }, { id: 'sash', mat: 'gold' }, { id: 'shoes', mat: 'leatherDark' }, { id: 'wizardHat', mat: 'clothPurple' }, { id: 'staff', mat: 'gold' }, { id: 'tome' }],
  },
  {
    name: 'Cleric', hair: { style: 'braids', mat: 'hairBlond' }, iris: 'irisBlue', aura: 'holy',
    items: [{ id: 'robe', mat: 'clothWhite', mat2: 'gold' }, { id: 'stole' }, { id: 'shoes' }, { id: 'circlet', mat2: 'holy' }, { id: 'hairRibbon', mat: 'clothWhite' }, { id: 'mace', mat: 'gold' }, { id: 'lantern', mat2: 'holy' }],
  },
  {
    name: 'Spellblade', hair: { style: 'swept', mat: 'hairWhite' }, iris: 'irisViolet', aura: 'shadow',
    items: [{ id: 'trousers', mat: 'linen' }, { id: 'boots' }, { id: 'coat' }, { id: 'belt', mat2: 'silver' }, { id: 'scarf', mat: 'clothPurple' }, { id: 'bracers', mat: 'leatherDark', mat2: 'silver' }, { id: 'runeblade' }, { id: 'orb', mat: 'shadow', mat2: 'silver' }],
  },
  {
    name: 'Monarch (Legacy)', build: 1.06, hair: { style: 'flowing', mat: 'hairBlond' }, iris: 'irisAmber', aura: 'holy',
    items: [{ id: 'trousers', mat: 'clothWhite' }, { id: 'boots', mat: 'leatherDark' }, { id: 'plate', mat: 'gold', mat2: 'silver' }, { id: 'tabard', mat: 'clothPurple', mat2: 'gold' }, { id: 'cape', mat: 'clothPurple', mat2: 'gold' }, { id: 'wings' }, { id: 'crown' }, { id: 'greatswordBack' }, { id: 'sword', mat: 'holy', mat2: 'gold' }],
  },
];

const BASE: ItemSpec[] = [{ id: 'shirt' }, { id: 'trousers' }, { id: 'shoes' }, { id: 'belt', mat2: 'leatherDark' }];
const one = (name: string, extra: ItemSpec[], hair: Look['hair'] = { style: 'short', mat: 'hairBrown' }, beard?: Look['beard']): Look => ({
  name, hair, beard, items: [...BASE, ...extra],
});

/** Rows of single pieces, each worn by the same commoner. */
export const ARMORY: { title: string; view?: { dir: 'down' | 'left' | 'right' | 'up'; anim?: 'idle' | 'walk' | 'attack'; frame?: number }; looks: Look[] }[] = [
  {
    title: 'Heads and hair',
    looks: [
      one('Hood', [{ id: 'hood', mat: 'clothForest' }]),
      one('Traveler hat', [{ id: 'travelerHat' }]),
      one('Wizard hat', [{ id: 'wizardHat', mat: 'clothBlue' }]),
      one('Open helm', [{ id: 'helmOpen' }]),
      one('Horned helm', [{ id: 'hornedHelm' }]),
      one('Knight helm', [{ id: 'helmKnight' }]),
      one('Bandana', [{ id: 'bandana' }], { style: 'long', mat: 'hairBlack' }),
      one('Crown', [{ id: 'crown' }], { style: 'long', mat: 'hairBlond' }),
    ],
  },
  {
    title: 'Hair and beards',
    looks: [
      one('Ponytail', [], { style: 'ponytail', mat: 'hairRed' }),
      one('Bun', [], { style: 'bun', mat: 'hairBlack' }),
      one('Mohawk', [], { style: 'mohawk', mat: 'hairRed' }),
      one('Braids', [], { style: 'braids', mat: 'hairBlond' }),
      one('Spiky', [], { style: 'spiky', mat: 'hairBlack' }),
      one('Stubble', [], { style: 'short', mat: 'hairBrown' }, 'stubble'),
      one('Short beard', [], { style: 'short', mat: 'hairBlack' }, 'short'),
      one('Full beard', [], { style: 'bald', mat: 'hairWhite' }, 'full'),
    ],
  },
  {
    title: 'Body armor',
    looks: [
      one('Leather vest', [{ id: 'vest' }]),
      one('Studded leather', [{ id: 'leatherArmor' }]),
      one('Brigandine', [{ id: 'brigandine' }]),
      one('Chainmail', [{ id: 'chainmail' }]),
      one('Plate', [{ id: 'chainmail' }, { id: 'plate' }]),
      one('Gi', [{ id: 'gi' }, { id: 'sash', mat: 'clothBlack' }]),
      one('Coat', [{ id: 'coat' }]),
      one('Robe + stole', [{ id: 'robe', mat: 'clothWhite' }, { id: 'stole' }]),
    ],
  },
  {
    title: 'Weapons',
    view: { dir: 'right', anim: 'attack', frame: 2 },
    looks: [
      one('Sword', [{ id: 'sword' }]),
      one('Axe', [{ id: 'axe' }]),
      one('Mace', [{ id: 'mace' }]),
      one('Hammer', [{ id: 'hammer' }]),
      one('Spear', [{ id: 'spear' }]),
      one('Dagger', [{ id: 'dagger' }]),
      one('Wand', [{ id: 'wand' }]),
      one('Runeblade', [{ id: 'runeblade' }]),
    ],
  },
  {
    title: 'Off hand and back',
    view: { dir: 'left' },
    looks: [
      one('Round shield', [{ id: 'shield' }]),
      one('Kite shield', [{ id: 'kiteShield' }]),
      one('Bow + quiver', [{ id: 'bow' }, { id: 'quiver' }]),
      one('Tome', [{ id: 'tome' }]),
      one('Lantern', [{ id: 'lantern' }]),
      one('Orb', [{ id: 'orb' }]),
      one('Cloak + pack', [{ id: 'cloak' }, { id: 'backpack' }]),
      one('Wings', [{ id: 'wings' }]),
    ],
  },
];
