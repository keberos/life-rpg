import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CLASS_WEAPON, HELD_GEAR, heroLayers } from '../art-kit/src/held-gear.ts';

describe('heroLayers', () => {
  it('shows the class standard weapon with no gear', () => {
    expect(heroLayers('paladin', [])).toEqual(['sprites/body/paladin-swing.png', 'sprites/held/paladin-sword-swing.png']);
  });
  it('an equipped weapon replaces the class weapon and sets the attack', () => {
    expect(heroLayers('paladin', ['oak-staff'])).toEqual(['sprites/body/paladin-spell.png', 'sprites/held/oak-staff-spell.png']);
  });
  it('non-weapon gear (the Bulwark is armor) draws nothing extra', () => {
    expect(heroLayers('sage', ['bulwark'])).toEqual(['sprites/body/sage-spell.png', 'sprites/held/sage-staff-spell.png']);
  });
  it('bare-handed classes punch', () => {
    expect(heroLayers('monk', [])).toEqual(['sprites/body/monk-punch.png']);
    expect(heroLayers('adventurer', ['iron-sword'])).toEqual(['sprites/body/adventurer-swing.png', 'sprites/held/iron-sword-swing.png']);
  });
});

describe('sprite files', () => {
  it('every class with every weapon has its layers on disk', () => {
    const classes = ['adventurer', 'warrior', 'paladin', 'ranger', 'monk', 'sage', 'cleric', 'spellblade'];
    const classWeapons = new Set(Object.values(CLASS_WEAPON));
    const gear = [undefined, ...Object.keys(HELD_GEAR).filter((g) => !classWeapons.has(g))];
    const missing = new Set<string>();
    for (const c of classes)
      for (const g of gear)
        for (const l of heroLayers(c, g ? [g] : [])) if (!existsSync(`public/${l}`)) missing.add(l);
    expect([...missing]).toEqual([]);
  });
});
