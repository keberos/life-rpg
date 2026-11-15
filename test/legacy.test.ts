// Relics and relic perks: earned from boss forms, never lost, small but real.
import { describe, expect, it } from 'vitest';
import { perkEffects, perkSlots, relicPerks, RELICS } from '../app/content/legacy.ts';
import { DAY, derive, type LogEvent, type SaveFile } from '../app/state/model.ts';
import { heroLoadout } from '../app/state/logic.ts';
import { corePack } from '../src/content/core-pack.ts';
import { fight } from '../src/engine/combat.ts';
import { makeRng } from '../src/engine/rng.ts';
import { STAT_IDS } from '../src/engine/types.ts';
import { ON_SCHEDULE_POINTS, buildStats, gearFor, ITEM_KIT } from '../src/sim/scenarios.ts';

const START = Date.now() - 400 * DAY;
const save = (events: LogEvent[]): SaveFile => ({
  version: 1,
  profile: { id: 't', createdAt: START, seasonStart: START, enabledStats: [...STAT_IDS], onboarded: true },
  events,
});
const d = (days: number) => START + days * DAY;
const win = (day: number, bossId: string): LogEvent => ({ at: d(day), type: 'boss', bossId, win: true, turns: 9, omen: 'uncertain', pressed: 0, classId: 'warrior' });
const newSeason = (day: number, extra: Partial<Extract<LogEvent, { type: 'newSeason' }>> = {}): LogEvent => ({ at: d(day), type: 'newSeason', ...extra });

describe('relics', () => {
  it('there is one relic per boss form: 4 bosses x (original + 3 forms)', () => {
    expect(RELICS).toHaveLength(16);
    expect(new Set(RELICS.map((r) => r.id)).size).toBe(16);
  });

  it('the first win over each form leaves its relic', () => {
    const s = derive(save([win(5, 'bog-troll'), win(6, 'bog-troll'), newSeason(60), win(65, 'bog-troll')]));
    expect(s.lifetime.relics).toEqual(['bog-troll:base', 'bog-troll:moss-troll']);
  });

  it('a missed original relic is granted by a later win (never lost for good)', () => {
    const s = derive(save([newSeason(60), win(70, 'storm-harpy')]));
    expect(s.lifetime.relics).toContain('storm-harpy:base');
    expect(s.lifetime.relics).toContain('storm-harpy:mist-harpy');
  });

  it('two relics of a family unlock its perk; eight unlock Collector and two perk slots', () => {
    expect(relicPerks(['bog-troll:base'])).toEqual([]);
    expect(relicPerks(['bog-troll:base', 'bog-troll:moss-troll'])).toEqual(['troll-tusk']);
    const eight = RELICS.filter((r) => r.form === 'base' || r.form.startsWith('moss') || r.form.startsWith('mist') || r.form.startsWith('silent') || r.form.startsWith('frost')).map((r) => r.id);
    expect(eight).toHaveLength(8);
    const all = relicPerks(eight);
    expect(all).toEqual(expect.arrayContaining(['troll-tusk', 'harpy-plume', 'warden-lamp', 'wyrm-scale', 'collector']));
    expect(perkSlots(all)).toBe(2);
    expect(perkSlots([])).toBe(1);
  });

  it("a season's picked perks apply: shield, dodge, softer specials, a fourth item", () => {
    const fx = perkEffects(['troll-tusk', 'wyrm-scale']);
    expect(fx.bonus.shieldPct).toBeCloseTo(0.08);
    expect(fx.satchel).toBe(4);
    const s = derive(save([newSeason(0, { perks: ['wyrm-scale', 'field-kit'] }), { at: d(1), type: 'loot', kind: 'item', id: 'thunder-scroll', source: 't' }, { at: d(1), type: 'loot', kind: 'item', id: 'thunder-scroll', source: 't' }]));
    expect(s.season.perks).toEqual(['wyrm-scale', 'field-kit']);
    expect(heroLoadout(s).items).toHaveLength(4); // 2 potions + ward (Field Kit) + thunder: four slots
  });

  it('perks help, but only a little (a few points of win chance each)', () => {
    const boss = corePack.bosses[2];
    const stats = buildStats('Balanced', ON_SCHEDULE_POINTS[boss.tier]);
    const cls = corePack.classes[0];
    const rate = (bonus = {}) => {
      const rng = makeRng(5);
      let w = 0;
      for (let i = 0; i < 1500; i++) if (fight({ stats, cls, gear: gearFor(stats, 'common'), items: ITEM_KIT, bonus }, boss, rng).win) w++;
      return w / 1500;
    };
    const base = rate();
    for (const id of ['troll-tusk', 'harpy-plume', 'warden-lamp']) {
      const r = rate(perkEffects([id]).bonus);
      expect(r - base, id).toBeGreaterThan(0);
      expect(r - base, id).toBeLessThan(0.12);
    }
  });
});
