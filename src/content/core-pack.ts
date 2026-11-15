// The core content pack. Pure data: the engine reads it, never the other way round.
// Later this moves to versioned JSON files so packs can be shared without code.
import type { ContentPack } from '../engine/types.ts';

export const corePack: ContentPack = {
  id: 'core',
  version: '0.1.0',

  classes: [
    // Before choosing a class: base attacks and battle items only.
    { id: 'adventurer', name: 'Adventurer', requires: {}, passive: {} },
    {
      id: 'warrior', name: 'Warrior', requires: { STR: 6, STA: 6 }, passive: { hpMult: 1.1, physMult: 1.05 },
      trait: { id: 'battle-rage', name: 'Battle Rage', trigger: 'onHurt', chance: 1, effects: [{ kind: 'stackDamage', pct: 0.05, max: 6 }] },
      abilities: [
        { id: 'cleave', name: 'Cleave', charges: 2, cooldown: 2, hint: 'asap', effects: [{ kind: 'damage', base: 10, scaling: 'STR', perPoint: 1.5 }] },
        { id: 'iron-wall', name: 'Iron Wall', charges: 1, cooldown: 0, hint: 'beforeSpecial', effects: [{ kind: 'shield', pctMaxHp: 0.2 }] },
      ],
    },
    {
      id: 'sage', name: 'Sage', requires: { INT: 6, WIS: 6 }, passive: { spellMult: 1.1 },
      trait: { id: 'arcane-echo', name: 'Arcane Echo', trigger: 'onHit', chance: 0.35, effects: [{ kind: 'damage', base: 6, scaling: 'INT', perPoint: 1.5, ignoresArmor: true }] },
      abilities: [
        { id: 'fireball', name: 'Fireball', charges: 2, cooldown: 2, hint: 'asap', effects: [{ kind: 'damage', base: 16, scaling: 'INT', perPoint: 2, ignoresArmor: true }] },
        { id: 'mana-shield', name: 'Mana Shield', charges: 1, cooldown: 0, hint: 'beforeSpecial', effects: [{ kind: 'shield', pctMaxHp: 0.2 }] },
      ],
    },
    {
      id: 'cleric', name: 'Cleric', requires: { FTH: 6, WIS: 6 }, passive: { healMult: 1.2 },
      trait: { id: 'blessed-light', name: 'Blessed Light', trigger: 'onHeal', chance: 1, effects: [{ kind: 'shield', pctMaxHp: 0.1 }] },
      abilities: [
        { id: 'mend', name: 'Mend', charges: 1, cooldown: 0, hint: 'lowHp', effects: [{ kind: 'heal', pctMaxHp: 0.3 }] },
        { id: 'smite', name: 'Smite', charges: 2, cooldown: 2, hint: 'asap', effects: [{ kind: 'damage', base: 10, scaling: 'FTH', perPoint: 1.5, ignoresArmor: true }] },
      ],
    },
    {
      id: 'ranger', name: 'Ranger', requires: { AGI: 6, STA: 6 }, passive: { critBonus: 0.05 },
      trait: { id: 'counter-shot', name: 'Counter Shot', trigger: 'onDodge', chance: 1, effects: [{ kind: 'extraHit', mult: 0.8 }] },
      abilities: [
        { id: 'evasive-roll', name: 'Evasive Roll', charges: 1, cooldown: 0, hint: 'beforeSpecial', effects: [{ kind: 'evade', attacks: 1 }] },
        { id: 'aimed-shot', name: 'Aimed Shot', charges: 2, cooldown: 2, hint: 'asap', effects: [{ kind: 'damage', base: 10, scaling: 'AGI', perPoint: 2 }] },
      ],
    },
    // Hybrids reward combining stats.
    {
      id: 'paladin', name: 'Paladin', requires: { STR: 12, FTH: 12 }, passive: { hpMult: 1.1, physMult: 1.05 },
      trait: { id: 'aegis', name: 'Aegis', trigger: 'turnStart', chance: 0.2, effects: [{ kind: 'shield', pctMaxHp: 0.06 }] },
      abilities: [
        { id: 'divine-strike', name: 'Divine Strike', charges: 2, cooldown: 2, hint: 'asap', effects: [{ kind: 'damage', base: 12, scaling: 'FTH', perPoint: 2 }] },
        { id: 'lay-on-hands', name: 'Lay on Hands', charges: 1, cooldown: 0, hint: 'lowHp', effects: [{ kind: 'heal', pctMaxHp: 0.35 }] },
      ],
    },
    {
      id: 'monk', name: 'Monk', requires: { AGI: 12, WIS: 12 }, passive: { dodgeBonus: 0.05 },
      trait: { id: 'flurry', name: 'Flurry', trigger: 'onHit', chance: 0.3, effects: [{ kind: 'extraHit', mult: 0.5 }] },
      abilities: [
        { id: 'stunning-palm', name: 'Stunning Palm', charges: 1, cooldown: 0, hint: 'asap', effects: [{ kind: 'stun', turns: 1 }] },
        { id: 'inner-calm', name: 'Inner Calm', charges: 1, cooldown: 0, hint: 'lowHp', effects: [{ kind: 'heal', pctMaxHp: 0.15 }, { kind: 'buffDamage', mult: 1.2, turns: 3 }] },
      ],
    },
    {
      id: 'spellblade', name: 'Spellblade', requires: { STR: 12, INT: 12 }, passive: { physMult: 1.05, spellMult: 1.05 },
      trait: { id: 'spellstrike', name: 'Spellstrike', trigger: 'onHit', chance: 0.4, effects: [{ kind: 'damage', base: 8, scaling: 'INT', perPoint: 1.2, ignoresArmor: true }] },
      abilities: [
        { id: 'enchant-blade', name: 'Enchant Blade', charges: 1, cooldown: 0, hint: 'asap', effects: [{ kind: 'buffDamage', mult: 1.25, turns: 3 }] },
        { id: 'arcane-burst', name: 'Arcane Burst', charges: 2, cooldown: 2, hint: 'asap', effects: [{ kind: 'damage', base: 16, scaling: 'INT', perPoint: 1.8, ignoresArmor: true }] },
      ],
    },
  ],

  gear: [
    // Common: stats only.
    { id: 'iron-sword', name: 'Iron Sword', slot: 'weapon', rarity: 'common', stats: { STR: 2 } },
    { id: 'oak-staff', name: 'Oak Staff', slot: 'weapon', rarity: 'common', stats: { INT: 2 } },
    { id: 'leather-vest', name: 'Leather Vest', slot: 'armor', rarity: 'common', stats: { STA: 2 } },
    { id: 'prayer-beads', name: 'Prayer Beads', slot: 'charm', rarity: 'common', stats: { FTH: 2 } },

    // Rare: stats + a passive proc/buff.
    {
      id: 'twinfang', name: 'Twinfang', slot: 'weapon', rarity: 'rare', stats: { STR: 3, AGI: 1 },
      passive: { id: 'double-strike', name: 'Double Strike', trigger: 'onHit', chance: 0.15, effects: [{ kind: 'extraHit', mult: 0.5 }] },
    },
    {
      id: 'mossweave', name: 'Mossweave Mail', slot: 'armor', rarity: 'rare', stats: { STA: 3 },
      passive: { id: 'regrowth', name: 'Regrowth', trigger: 'turnStart', chance: 1, effects: [{ kind: 'heal', pctMaxHp: 0.015 }] },
    },
    {
      id: 'mirror-charm', name: 'Mirror Charm', slot: 'charm', rarity: 'rare', stats: { AGI: 2, WIS: 1 },
      passive: { id: 'riposte', name: 'Riposte', trigger: 'onDodge', chance: 1, effects: [{ kind: 'damage', base: 6, scaling: 'AGI', perPoint: 0.8 }] },
    },
    {
      id: 'saints-locket', name: "Saint's Locket", slot: 'charm', rarity: 'rare', stats: { FTH: 2, WIS: 1 },
      passive: { id: 'grace', name: 'Grace', trigger: 'onHeal', chance: 1, effects: [{ kind: 'shield', pctMaxHp: 0.08 }] },
    },

    // Epic: stats + passive + an active button.
    {
      id: 'bulwark', name: 'Bulwark of Dawn', slot: 'armor', rarity: 'epic', stats: { STA: 4, STR: 1 },
      passive: { id: 'steadfast', name: 'Steadfast', trigger: 'turnStart', chance: 1, effects: [{ kind: 'heal', pctMaxHp: 0.01 }] },
      active: { id: 'shield-bash', name: 'Shield Bash', charges: 1, cooldown: 4, hint: 'asap', effects: [{ kind: 'stun', turns: 1 }, { kind: 'damage', base: 8, scaling: 'STR', perPoint: 1 }] },
    },
    {
      id: 'emberglass', name: 'Emberglass Rod', slot: 'weapon', rarity: 'epic', stats: { INT: 4, WIS: 1 },
      passive: { id: 'kindle', name: 'Kindle', trigger: 'onHit', chance: 0.25, effects: [{ kind: 'damage', base: 4, scaling: 'INT', perPoint: 0.5, ignoresArmor: true }] },
      active: { id: 'fire-burst', name: 'Fire Burst', charges: 1, cooldown: 3, hint: 'asap', effects: [{ kind: 'damage', base: 10, scaling: 'INT', perPoint: 1.5, ignoresArmor: true }] },
    },

    // Legendary: stronger everything; candidates to become Legacy relics.
    {
      id: 'halo-of-mercy', name: 'Halo of Mercy', slot: 'relic', rarity: 'legendary', stats: { FTH: 3, WIS: 2, STA: 2 },
      passive: { id: 'benediction', name: 'Benediction', trigger: 'onHeal', chance: 1, effects: [{ kind: 'buffDamage', mult: 1.25, turns: 2 }] },
      active: { id: 'sanctuary', name: 'Sanctuary', charges: 1, cooldown: 0, hint: 'lowHp', effects: [{ kind: 'heal', pctMaxHp: 0.2 }] },
    },
  ],

  battleItems: [
    { id: 'potion', name: 'Healing Potion', hint: 'lowHp', effects: [{ kind: 'heal', pctMaxHp: 0.2 }] },
    { id: 'ward-scroll', name: 'Ward Scroll', hint: 'beforeSpecial', effects: [{ kind: 'shield', pctMaxHp: 0.25 }] },
    { id: 'thunder-scroll', name: 'Thunder Scroll', hint: 'asap', effects: [{ kind: 'damagePctBoss', pct: 0.12 }] },
  ],

  // Tier ~ week of the season. Tier 4 = season boss.
  bosses: [
    { id: 'bog-troll', name: 'Bog Troll', tier: 1, hp: 633, attack: 32, armor: 20, weakTo: ['STR', 'FTH'], special: { name: 'Mud Slam', every: 4, mult: 2.2 }, enrageTurn: 14 },
    { id: 'storm-harpy', name: 'Storm Harpy', tier: 2, hp: 1240, attack: 51.5, armor: 10, weakTo: ['AGI', 'INT'], special: { name: 'Gale Dive', every: 3, mult: 2.0 }, enrageTurn: 14 },
    { id: 'hollow-warden', name: 'Hollow Warden', tier: 3, hp: 1817, attack: 68, armor: 30, weakTo: ['WIS', 'STA'], special: { name: 'Grave Cleave', every: 4, mult: 2.5 }, enrageTurn: 15 },
    { id: 'ashen-wyrm', name: 'Ashen Wyrm', tier: 4, hp: 3022, attack: 93.5, armor: 12, weakTo: ['FTH', 'INT'], special: { name: 'Cinder Breath', every: 3, mult: 2.3 }, enrageTurn: 16 },
  ],
};
