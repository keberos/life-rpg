// Equipment: auto-equip the best piece per slot unless the player picked one or chose none.
import { describe, expect, it } from 'vitest';
import { derive, type LogEvent, type SaveFile } from '../app/state/model.ts';
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
