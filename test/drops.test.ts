// Drop rules: a guided first five quests, then random drops with bad-luck protection.
import { describe, expect, it } from 'vitest';
import { PITY_AFTER, questsSinceDrop, rollDrop } from '../app/state/drops.ts';
import { derive, type LogEvent, type SaveFile } from '../app/state/model.ts';
import { questById } from '../app/content/quests.ts';
import { STAT_IDS } from '../src/engine/types.ts';

const fresh = (): SaveFile => ({
  version: 1,
  profile: { id: 'test', createdAt: 0, seasonStart: Date.now(), enabledStats: [...STAT_IDS], onboarded: true },
  events: [],
});

/** Play `ids` quests in order, logging each drop like the app does. */
function play(ids: string[], rng: () => number) {
  const save = fresh();
  const drops: (string | null)[] = [];
  for (const id of ids) {
    const q = questById(id)!;
    const state = derive(save);
    const quest: LogEvent = { at: Date.now(), type: 'quest', questId: id, stat: q.stat, difficulty: 'normal', outcome: 'success', feedback: 'success', xp: 25, ratingBefore: 6, ratingAfter: 6 };
    save.events.push(quest);
    const d = rollDrop(state, q, save.events, rng);
    if (d) save.events.push({ at: Date.now(), type: 'loot', kind: d.kind, id: d.id, source: `quest:${id}` });
    drops.push(d?.id ?? null);
  }
  return { drops, state: derive(save) };
}

describe('quest drops', () => {
  it('guides the first five quests to a full common kit and two battle items', () => {
    const { drops, state } = play(['pushups', 'squats', 'plank', 'balance', 'pattern'], () => 0.99);
    expect(drops).toEqual(['potion', 'iron-sword', 'leather-vest', 'thunder-scroll', 'prayer-beads']);
    expect(state.equipped.map((g) => g.id).sort()).toEqual(['iron-sword', 'leather-vest', 'prayer-beads']);
  });

  it('gives a staff instead of a sword when the second quest trains INT or WIS', () => {
    const { drops } = play(['pushups', 'pattern'], () => 0.99);
    expect(drops[1]).toBe('oak-staff');
  });

  it('never leaves more than PITY_AFTER quests without a drop', () => {
    // rng 0.99 = always "no luck"; the pity rule must still pay out
    const ids = Array.from({ length: 5 + PITY_AFTER * 4 }, (_, i) => (i % 2 ? 'squats' : 'pushups'));
    const { drops } = play(ids, () => 0.99);
    let dry = 0;
    for (const d of drops.slice(5)) {
      dry = d ? 0 : dry + 1;
      expect(dry).toBeLessThan(PITY_AFTER + 1);
    }
  });

  it('counts quests since the last quest drop', () => {
    const ev = (type: 'quest' | 'loot'): LogEvent =>
      type === 'quest'
        ? { at: 0, type, questId: 'pushups', stat: 'STR', difficulty: 'normal', outcome: 'success', feedback: 'success', xp: 1, ratingBefore: 0, ratingAfter: 0 }
        : { at: 0, type, kind: 'item', id: 'potion', source: 'quest:pushups' };
    expect(questsSinceDrop([ev('quest'), ev('loot'), ev('quest'), ev('quest')])).toBe(2);
  });
});
