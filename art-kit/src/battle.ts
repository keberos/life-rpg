// The frames the app uses for a hero in battle. Crisp: 4 breathing stance frames,
// then 4 attack frames (the older jrpg strip has 2 stance frames).
// Crisp style: our own readable stance for idle; attacks borrow motion from CC0
// clips (art-kit/src/motion.ts), picked by what the hero is holding.
import { renderLook, type Image } from './render.ts';
import type { Look } from './wardrobe.ts';

/** Attack keyframes (clip, 0..1 point) per kind of attack. */
const ATTACKS = {
  // wind-up behind the head, downward slash, follow-through, recover with the blade out front
  swing: [['Sword_Attack', 0.2], ['Sword_Attack', 0.35], ['Sword_Attack', 0.5], ['Sword_Attack', 0.7]],
  // guard, cross, extended, recover
  punch: [['Punch_Cross', 0.2], ['Punch_Cross', 0.35], ['Punch_Cross', 0.5], ['Punch_Cross', 0.7]],
  // gather, then cast with the free hand out
  spell: [['Spell_Simple_Idle_Loop', 0.5], ['Spell_Simple_Shoot', 0], ['Spell_Simple_Shoot', 0.5], ['Spell_Simple_Shoot', 1]],
} as const;
export type AttackKind = keyof typeof ATTACKS | 'own';

const MELEE = new Set(['sword', 'axe', 'mace', 'dagger', 'runeblade', 'greatsword', 'spear', 'hammer']);
/** Archers keep our own designed strike: the borrowed swing flails the bow in the off hand. */
const ARCHER = 'bow';
const CASTER = new Set(['staff', 'tome', 'wand']);

export function attackKind(look: Look): AttackKind {
  const ids = look.items.map((i) => i.id);
  if (ids.includes(ARCHER)) return 'own';
  if (ids.some((id) => MELEE.has(id))) return 'swing';
  if (ids.some((id) => CASTER.has(id))) return 'spell';
  return 'punch';
}

export function battleFrames(look: Look, style: 'jrpg' | 'crisp'): Image[] {
  const q = { quality: 'hd' as const, style };
  if (style === 'jrpg') {
    return [
      renderLook(look, { dir: 'downRight', anim: 'stance', frame: 0, ...q }),
      renderLook(look, { dir: 'downRight', anim: 'stance', frame: 1, ...q }),
      ...[0, 1, 2, 3].map((f) => renderLook(look, { dir: 'right', anim: 'attack', frame: f, ...q })),
    ];
  }
  return [
    ...[0, 1, 2, 3].map((f) => renderLook(look, { dir: 'battle', anim: 'stance', frame: f, ...q })),
    ...(() => {
      const kind = attackKind(look);
      if (kind === 'own') return [0, 1, 2, 3].map((f) => renderLook(look, { dir: 'battle', anim: 'strike', frame: f, ...q }));
      return ATTACKS[kind].map(([clip, t]) => renderLook(look, { dir: 'battle', motion: { clip, t }, ...q }));
    })(),
  ];
}
