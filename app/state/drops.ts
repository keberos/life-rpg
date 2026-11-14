// Quest drops. The first few quests follow a guided sequence that teaches the
// loop and kits you out for the first boss; after that drops are random, with
// bad-luck protection and rarer gear unlocking as the season goes on.
import { corePack } from '../../src/content/core-pack.ts';
import type { Rng } from '../../src/engine/rng.ts';
import type { Rarity } from '../../src/engine/types.ts';
import type { QuestDef } from '../content/quests.ts';
import type { GameState, LogEvent } from './model.ts';

export interface Drop {
  kind: 'gear' | 'item';
  id: string;
  name: string;
  rarity?: Rarity;
  /** One-line tip shown with guided drops. */
  tip?: string;
}

/** Drops for quests 1..N, in order. A function picks per quest (e.g. a weapon that suits the stat). */
const GUIDED: { kind: 'gear' | 'item'; id: string | ((q: QuestDef) => string); tip: string }[] = [
  { kind: 'item', id: 'potion', tip: 'Battle items go in your satchel. Use them during boss fights.' },
  {
    kind: 'gear',
    id: (q) => (q.stat === 'INT' || q.stat === 'WIS' ? 'oak-staff' : 'iron-sword'),
    tip: 'New gear equips itself and shows on your hero.',
  },
  { kind: 'gear', id: 'leather-vest', tip: 'Armor adds to your stats in boss fights.' },
  { kind: 'item', id: 'thunder-scroll', tip: 'Thunder Scroll: a burst of damage to swing a close fight.' },
  { kind: 'gear', id: 'prayer-beads', tip: 'Your kit is ready. Challenge the Bog Troll from camp when you feel strong.' },
];

/** After the guided drops: base chance per quest, and a guaranteed drop after this many dry quests. */
export const DROP_CHANCE = 0.35;
export const PITY_AFTER = 3;
/** Share of random drops that are gear (when there's gear left to find). */
const GEAR_SHARE = 0.3;

/** Which gear rarities can drop, by the season's current boss tier. */
const RARITY_WEIGHTS: Record<number, Partial<Record<Rarity, number>>> = {
  1: { common: 1, rare: 0.12 },
  2: { common: 0.4, rare: 1, epic: 0.08 },
  3: { rare: 0.7, epic: 0.6, legendary: 0.04 },
  4: { rare: 0.3, epic: 0.8, legendary: 0.2 },
};

const gearName = (id: string) => corePack.gear.find((g) => g.id === id);
const itemName = (id: string) => corePack.battleItems.find((i) => i.id === id)?.name ?? id;

/** How many quests since the last quest drop (for bad-luck protection). */
export function questsSinceDrop(events: LogEvent[]): number {
  let n = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.type === 'loot' && e.source.startsWith('quest:')) break;
    if (e.type === 'quest') n++;
  }
  return n;
}

function pickWeighted<T extends string>(rng: Rng, weights: Partial<Record<T, number>>): T | undefined {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rng() * total;
  for (const [k, w] of entries) if ((r -= w) <= 0) return k;
  return entries.at(-1)?.[0];
}

/**
 * Decide the drop for a quest that was just completed. `state` is the state
 * BEFORE this quest was logged; `events` is the log AFTER it.
 */
export function rollDrop(state: GameState, q: QuestDef, events: LogEvent[], rng: Rng): Drop | null {
  const n = state.questsTotal; // this season's quests; 0 = first. Each season re-kits you for its first boss.
  if (n < GUIDED.length) {
    const g = GUIDED[n];
    const id = typeof g.id === 'function' ? g.id(q) : g.id;
    const owned = state.ownedGear.some((x) => x.id === id);
    if (!(g.kind === 'gear' && owned)) {
      const def = g.kind === 'gear' ? gearName(id) : undefined;
      const tip = state.season.number === 1 ? g.tip : undefined; // tips teach once
      return { kind: g.kind, id, name: g.kind === 'gear' ? def?.name ?? id : itemName(id), rarity: def?.rarity, tip };
    }
  }

  const dry = questsSinceDrop(events);
  if (dry < PITY_AFTER && rng() > DROP_CHANCE) return null;

  const owned = new Set(state.ownedGear.map((x) => x.id));
  if (rng() < GEAR_SHARE) {
    const weights = RARITY_WEIGHTS[state.boss.tier] ?? RARITY_WEIGHTS[1];
    // only rarities that still have something left to find
    const avail = Object.fromEntries(
      Object.entries(weights).filter(([r]) => corePack.gear.some((x) => x.rarity === r && !owned.has(x.id))),
    ) as Partial<Record<Rarity, number>>;
    const rarity = pickWeighted(rng, avail);
    if (rarity) {
      const pool = corePack.gear.filter((x) => x.rarity === rarity && !owned.has(x.id));
      const gear = pool[Math.floor(rng() * pool.length)];
      return { kind: 'gear', id: gear.id, name: gear.name, rarity };
    }
  }
  const item = corePack.battleItems[Math.floor(rng() * corePack.battleItems.length)];
  return { kind: 'item', id: item.id, name: item.name };
}
