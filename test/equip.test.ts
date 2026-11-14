// Equipment: auto-equip the best piece per slot unless the player picked one or chose none.
import { describe, expect, it } from 'vitest';
import { DAY, derive, type LogEvent, type SaveFile } from '../app/state/model.ts';
import { STAT_IDS } from '../src/engine/types.ts';

const save = (events: LogEvent[]): SaveFile => ({
  version: 1,
  profile: { id: 't', createdAt: 0, seasonStart: Date.now(), enabledStats: [...STAT_IDS], onboarded: true },
  events,
});
const loot = (id: string): LogEvent => ({ at: 0, type: 'loot', kind: 'gear', id, source: 'test' });

describe('equipment', () => {
  it('auto-equips the rarest owned piece per slot', () => {
    const s = derive(save([loot('iron-sword'), loot('emberglass'), loot('leather-vest')]));
    expect(s.equipped.map((g) => g.id).sort()).toEqual(['emberglass', 'leather-vest']);
  });

  it("respects the player's pick, and 'none'", () => {
    const s = derive(save([
      loot('iron-sword'), loot('emberglass'), loot('halo-of-mercy'),
      { at: 0, type: 'equip', slot: 'weapon', gearId: 'iron-sword' },
      { at: 0, type: 'equip', slot: 'relic', gearId: null },
    ]));
    expect(s.equipped.map((g) => g.id)).toEqual(['iron-sword']);
  });

  it('ignores a pick for gear you do not own', () => {
    const s = derive(save([loot('oak-staff'), { at: 0, type: 'equip', slot: 'weapon', gearId: 'emberglass' }]));
    expect(s.equipped.map((g) => g.id)).toEqual(['oak-staff']);
  });
});

describe('classes', () => {
  const xp = (stat: 'STR' | 'STA', n: number): LogEvent => ({ at: 0, type: 'debugXp', stat, xp: n });
  it('stays Adventurer until you choose, and flags the unlock as new until seen', () => {
    let s = derive(save([xp('STR', 400), xp('STA', 400)]));
    expect(s.unlocked.map((c) => c.id)).toContain('warrior');
    expect(s.activeClass.id).toBe('adventurer');
    expect(s.newClasses.map((c) => c.id)).toEqual(['warrior']);
    s = derive(save([xp('STR', 400), xp('STA', 400), { at: 0, type: 'seenClasses', ids: ['warrior'] }]));
    expect(s.newClasses).toEqual([]);
    s = derive(save([xp('STR', 400), xp('STA', 400), { at: 0, type: 'chooseClass', classId: 'warrior' }]));
    expect(s.activeClass.id).toBe('warrior');
    expect(s.newClasses).toEqual([]);
  });
});

describe('boss progression', () => {
  const seasonAgo = (days: number, events: LogEvent[]): SaveFile => ({
    version: 1,
    profile: { id: 't', createdAt: 0, seasonStart: Date.now() - days * DAY, enabledStats: [...STAT_IDS], onboarded: true },
    events,
  });
  const win = (bossId: string, daysIn: number, seasonDays: number): LogEvent =>
    ({ at: Date.now() - (seasonDays - daysIn) * DAY, type: 'boss', bossId, win: true, turns: 9, omen: 'uncertain', pressed: 0 });

  it('waits for you: an unbeaten boss stays even when its weeks have passed', () => {
    const s = derive(seasonAgo(30, [])); // week 5
    expect(s.boss.def.id).toBe('bog-troll');
    expect(s.boss.behind).toBe(true);
  });

  it('the next boss arrives right away if its week has already come', () => {
    const s = derive(seasonAgo(30, [win('bog-troll', 28, 30)]));
    expect(s.boss.def.id).toBe('storm-harpy');
    expect(s.boss.defeated).toBe(false);
  });

  it('beating a boss early does not skip ahead of the calendar', () => {
    const s = derive(seasonAgo(3, [win('bog-troll', 2, 3)])); // week 1
    expect(s.boss.def.id).toBe('bog-troll');
    expect(s.boss.defeated).toBe(true);
    expect(s.boss.nextBossWeek).toBe(3);
  });
});

