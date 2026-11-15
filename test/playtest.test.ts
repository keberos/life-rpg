// The playtest report summarizes play and gathers every note.
import { describe, expect, it } from 'vitest';
import { playtestReport } from '../app/ui/Playtest.tsx';
import { DAY, type LogEvent } from '../app/state/model.ts';

const T = Date.UTC(2026, 10, 1, 12);
const q = (day: number, feedback: 'success' | 'tooHard' | 'tooEasy' = 'success'): LogEvent => ({ at: T + day * DAY, type: 'quest', questId: 'pushups', stat: 'STR', difficulty: 'normal', outcome: 'success', feedback, xp: 25, ratingBefore: 6, ratingAfter: 6 });

describe('playtest report', () => {
  it('counts play days, catches, check-ins and lists notes in order', () => {
    const events: LogEvent[] = [
      q(0), q(0, 'tooHard'), q(2, 'tooEasy'),
      { at: T + 1000, type: 'intercept', accepted: true },
      { at: T + 2000, type: 'intercept', accepted: false },
      { at: T + 3000, type: 'note', text: 'Push-ups felt long', where: 'quest: Push-ups' },
      { at: T + 2 * DAY, type: 'checkin', fun: 4, worthIt: true, note: 'Liked the boss' },
    ];
    const r = playtestReport(events, T + 3 * DAY);
    expect(r).toContain('Played on 2 of 3 days; 3 quests');
    expect(r).toContain('too hard or failed: 1; too easy: 1');
    expect(r).toContain('2 catches, took the quest 1 times (50%)');
    expect(r).toContain('average fun 4.0/5; worth it vs scrolling 100%');
    expect(r.indexOf('Push-ups felt long')).toBeLessThan(r.indexOf('Liked the boss'));
  });
});
