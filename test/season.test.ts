// Seasons and Legacy: what resets, what carries over, what unlocks.
import { describe, expect, it } from 'vitest';
import { DAY, derive, type LogEvent, type SaveFile } from '../app/state/model.ts';
import { STAT_IDS } from '../src/engine/types.ts';

const START = Date.now() - 70 * DAY; // season 1 began 10 weeks ago
const save = (events: LogEvent[]): SaveFile => ({
  version: 1,
  profile: { id: 't', createdAt: START, seasonStart: START, enabledStats: [...STAT_IDS], onboarded: true },
  events,
});
const d = (days: number) => START + days * DAY;
const quest = (day: number): LogEvent => ({ at: d(day), type: 'quest', questId: 'pushups', stat: 'STR', difficulty: 'normal', outcome: 'success', feedback: 'success', xp: 400, ratingBefore: 6, ratingAfter: 9 });
const win = (day: number, bossId: string, classId = 'warrior'): LogEvent => ({ at: d(day), type: 'boss', bossId, win: true, turns: 9, omen: 'uncertain', pressed: 0, classId });
const season1: LogEvent[] = [
  { at: d(0), type: 'placement', stat: 'STR', questId: 'pushups', value: 12, rating: 7 },
  quest(1),
  { at: d(2), type: 'loot', kind: 'gear', id: 'iron-sword', source: 'quest:pushups' },
  win(5, 'bog-troll'),
  win(40, 'hollow-warden'),
];

describe('seasons', () => {
  it('mastery needs a late-season boss win as that class', () => {
    const early = derive(save([win(5, 'bog-troll'), win(20, 'storm-harpy', 'ranger')]));
    expect(early.lifetime.masteredClasses).toEqual([]);
    const late = derive(save([win(40, 'hollow-warden', 'adventurer'), win(50, 'ashen-wyrm', 'sage')]));
    expect(late.lifetime.masteredClasses).toEqual(['sage']);
  });

  it('season 1 is over after 8 weeks, and finishing it unlocks Field Kit', () => {
    const s = derive(save(season1));
    expect(s.seasonOver).toBe(true);
    expect(s.lifetime.unlockedPerks).toContain('field-kit');
    expect(s.lifetime.masteredClasses).toEqual(['warrior']);
  });

  it('a new season resets levels, gear and bosses but keeps ratings and the lifetime record', () => {
    const s = derive(save([...season1, { at: d(60), type: 'newSeason' }]));
    expect(s.season.number).toBe(2);
    expect(s.seasonOver).toBe(false);
    expect(s.levels.STR).toBe(1);
    expect(s.ownedGear).toEqual([]);
    expect(s.boss.def.id).toBe('bog-troll');
    expect(s.boss.defeated).toBe(false);
    expect(s.ratings.STR).toBe(9);
    expect(s.calibrated.STR).toBe(false); // recheck this season
    expect(s.lifetime.questsTotal).toBe(1);
    expect(s.lifetime.bossesBeaten).toBe(2);
  });

  it('a recheck compares with last season', () => {
    const s = derive(save([...season1, { at: d(60), type: 'newSeason' }, { at: d(61), type: 'placement', stat: 'STR', questId: 'pushups', value: 18, rating: 9 }]));
    expect(s.season.rechecks).toEqual([{ stat: 'STR', questId: 'pushups', value: 18, before: 12 }]);
  });

  it('Legacy picks apply: mastered starting class, Field Kit, Heirloom', () => {
    let s = derive(save([...season1, { at: d(60), type: 'newSeason', startClass: 'warrior', perk: 'field-kit' }]));
    expect(s.activeClass.id).toBe('warrior');
    expect(s.items.potion).toBe(2);
    s = derive(save([...season1, { at: d(60), type: 'newSeason', perk: 'heirloom', heirloom: 'iron-sword' }]));
    expect(s.ownedGear.map((g) => g.id)).toEqual(['iron-sword']);
  });

  it('Heirloom unlocks only after beating all four bosses in one season', () => {
    const all = ['bog-troll', 'storm-harpy', 'hollow-warden', 'ashen-wyrm'];
    expect(derive(save(season1)).lifetime.unlockedPerks).not.toContain('heirloom');
    const s = derive(save([...season1, ...all.map((b, i) => win(10 + i * 14, b))]));
    expect(s.lifetime.unlockedPerks).toContain('heirloom');
  });

  it('themes start in Season 2 and rotate', () => {
    expect(derive(save(season1)).season.theme).toBeUndefined();
    const s2 = derive(save([...season1, { at: d(60), type: 'newSeason' }]));
    expect(s2.season.theme?.stats).toEqual(['STA', 'WIS']);
  });

  it('a season goal is reached by unlocking the class or beating the boss, and resets next season', () => {
    const goal = (kind: 'class' | 'boss', id: string): LogEvent => ({ at: d(1), type: 'setGoal', goal: { kind, id } });
    const boss = derive(save([goal('boss', 'hollow-warden'), ...season1]));
    expect(boss.season.goal).toEqual({ kind: 'boss', id: 'hollow-warden' });
    expect(boss.season.goalReached).toBe(true);
    const cls = derive(save([goal('class', 'warrior'), { at: d(2), type: 'debugXp', stat: 'STR', xp: 200 }]));
    expect(cls.season.goalReached).toBe(false);
    const done = derive(save([goal('class', 'warrior'), ...(['STR', 'STA'] as const).map((stat): LogEvent => ({ at: d(2), type: 'debugXp', stat, xp: 200 }))]));
    expect(done.season.goalReached).toBe(true);
    expect(derive(save([goal('boss', 'hollow-warden'), ...season1, { at: d(60), type: 'newSeason' }])).season.goal).toBeUndefined();
  });
});
