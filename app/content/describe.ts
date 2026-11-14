// Plain-language descriptions of gear, abilities and battle items, built from
// the content pack data (so new gear describes itself).
import type { ActiveDef, BattleItemDef, Effect, GearDef, PassiveDef } from '../../src/engine/types.ts';

const pct = (x: number) => `${Math.round(x * 100)}%`;

export function describeEffect(e: Effect): string {
  switch (e.kind) {
    case 'damage': {
      const scale = e.scaling ? ` + ${e.perPoint}× your ${e.scaling}` : '';
      return `deals ${e.base}${scale} damage${e.ignoresArmor ? ', ignoring armor' : ''}`;
    }
    case 'damagePctBoss': return `deals ${pct(e.pct)} of the boss's max HP`;
    case 'extraHit': return `strikes again for ${pct(e.mult)} of the hit`;
    case 'heal': return `heals ${pct(e.pctMaxHp)} of your max HP`;
    case 'shield': return `adds a shield worth ${pct(e.pctMaxHp)} of your max HP`;
    case 'stun': return `stuns the boss for ${e.turns} turn${e.turns > 1 ? 's' : ''} (not during its special)`;
    case 'buffDamage': return `+${pct(e.mult - 1)} damage for ${e.turns} turns`;
    case 'stackDamage': return `+${pct(e.pct)} damage for the rest of the fight (up to +${pct(e.pct * e.max)})`;
    case 'evade': return `makes the boss's next ${e.attacks === 1 ? 'attack' : `${e.attacks} attacks`} miss, even a special`;
  }
}

const joinEffects = (effects: Effect[]) => effects.map(describeEffect).join(' and ');

const TRIGGER: Record<PassiveDef['trigger'], string> = {
  onHit: 'When you hit',
  turnStart: 'Each turn',
  onDodge: 'When you dodge',
  onHeal: 'When you heal',
  onHurt: 'When you take damage',
};

export function describePassive(p: PassiveDef): string {
  const chance = p.chance < 1 ? `${pct(p.chance)} chance: ` : '';
  return `${TRIGGER[p.trigger]}, ${chance}${joinEffects(p.effects)}.`;
}

export function describeActive(a: ActiveDef): string {
  const uses = `${a.charges} use${a.charges > 1 ? 's' : ''} per fight${a.cooldown ? `, ${a.cooldown}-turn cooldown` : ''}`;
  return `Tap in battle (${uses}): ${joinEffects(a.effects)}.`;
}

export function describeStats(g: GearDef): string {
  return Object.entries(g.stats).map(([s, v]) => `+${v} ${s}`).join('  ') || 'no stat bonus';
}

export function describeItem(i: BattleItemDef): string {
  const sentence = joinEffects(i.effects);
  return sentence.charAt(0).toUpperCase() + sentence.slice(1) + '. Used up when used.';
}

export const SLOT_LABEL: Record<GearDef['slot'], string> = { weapon: 'Weapon', armor: 'Armor', charm: 'Charm', relic: 'Relic' };
