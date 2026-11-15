// Modular battle sprites: a class body (outfit is class standard) plus a weapon
// layer stacked in the app. Assets grow linearly: one body strip per class x
// attack kind, one layer per weapon.
// Every strip is 8 frames: 4 breathing stance + 4 attack (see battle.ts).
import { ATTACKS } from './battle.ts';
import { CLASS_LOOKS } from './class-looks.ts';
import { LOOKS } from './looks.ts';
import { renderLook, type Image, type RenderOpts } from './render.ts';
import type { Look } from './wardrobe.ts';

import { HELD_GEAR, KINDS, type Kind } from './held-gear.ts';
export { HELD_GEAR, KINDS, type Kind };

/** Items held in the hands: these become layers, never part of the class body. */
export const HELD_IDS = new Set(['sword', 'ironSword', 'twinfang', 'runeblade', 'dagger', 'axe', 'mace', 'staff', 'oakStaff', 'emberglassRod', 'bow', 'wand', 'spear', 'hammer',
  'shield', 'kiteShield', 'towerShield', 'tome', 'lantern', 'orb']);

const byName = (list: Look[], n: string) => list.find((l) => l.name.startsWith(n))!;
const strip = (l: Look): Look => ({ ...l, build: 1, height: 1, items: l.items.filter((i) => !HELD_IDS.has(i.id)) });

/** Class standard outfits (no held items), same build for all so held layers line up. */
export const CLASS_BODIES: Record<string, Look> = {
  adventurer: strip({ ...byName(LOOKS, 'Commoner'), iris: 'irisBrown' }),
  warrior: strip(byName(CLASS_LOOKS, 'Warrior')),
  paladin: strip(byName(CLASS_LOOKS, 'Paladin')),
  ranger: strip(byName(CLASS_LOOKS, 'Ranger')),
  monk: strip(byName(CLASS_LOOKS, 'Monk')),
  sage: strip(byName(CLASS_LOOKS, 'Sage')),
  cleric: strip(byName(CLASS_LOOKS, 'Cleric')),
  spellblade: strip(byName(CLASS_LOOKS, 'Spellblade')),
};

function frames(look: Look, kind: Kind, layer: RenderOpts['layer']): Image[] {
  const q = { quality: 'xl' as const, style: 'crisp' as const, dir: 'battle' as const, layer };
  return [
    ...[0, 1, 2, 3].map((f) => renderLook(look, { ...q, anim: 'stance', frame: f })),
    ...ATTACKS[kind].map(([clip, t]) => renderLook(look, { ...q, motion: { clip, t } })),
  ];
}

/** Class body strip for an attack kind (empty hands). */
export function bodyStrip(classId: string, kind: Kind): Image[] {
  return frames(CLASS_BODIES[classId], kind, 'body');
}

/** A weapon layer for its attack kind: only its visible pixels, posed on the shared body. */
export function heldStrip(gearId: string): Image[] {
  const g = HELD_GEAR[gearId];
  const base = CLASS_BODIES.adventurer;
  return frames({ ...base, items: [...base.items, g.item] }, g.kind, 'heldR');
}

export { kindFor, weaponFor } from './held-gear.ts';
