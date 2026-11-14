// Automated turn-based boss fight. The player steps in only by pressing gear
// actives or spending battle items. Every stat has a role, and the boss's
// weak stats count extra, so no single stat is ever required.
//
// The fight is a step-by-step state machine (createFight) so the app can play
// it out turn by turn while the player presses buttons; fight() runs a whole
// fight for the simulator, choosing presses with a policy.
import type { Rng } from './rng.ts';
import { addStats } from './stats.ts';
import {
  STAT_IDS,
  type ActiveDef,
  type BattleItemDef,
  type BossDef,
  type ClassDef,
  type Effect,
  type GearDef,
  type PassiveDef,
  type StatBlock,
  type UseHint,
} from './types.ts';

export const WEAKNESS_MULT = 1.3;
export const MAX_TURNS = 40;
export const BOSS_CRIT = 0.12;
export const FORTUNE_SD = 0.16;

/** Standard normal sample (Box-Muller). */
function normal(rng: Rng): number {
  const u = Math.max(rng(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

export interface Loadout {
  stats: StatBlock;
  cls: ClassDef;
  gear: GearDef[];
  items: BattleItemDef[];
}

/** 'auto' = the player never presses anything; 'smart' = presses at good moments. */
export type Policy = 'auto' | 'smart';

export interface FightResult {
  win: boolean;
  turns: number;
  hpLeftPct: number;
  bossHpLeftPct: number;
  pressed: number;
  log: string[];
}

export interface Derived {
  eff: StatBlock;
  maxHp: number;
  phys: number;
  spell: number;
  ward: number;
  smite: number;
  insight: number;
  crit: number;
  dodge: number;
  specialResist: number;
  heal: number;
  reviveChance: number;
}

/** Turn stats + class + gear into combat numbers for one boss. */
export function derive(load: Loadout, boss: BossDef): Derived {
  let eff = addStats(load.stats, {});
  for (const g of load.gear) eff = addStats(eff, g.stats);
  for (const s of STAT_IDS) if (boss.weakTo.includes(s)) eff[s] *= WEAKNESS_MULT;
  const p = load.cls.passive;
  const level = STAT_IDS.reduce((n, s) => n + load.stats[s], 0); // every stat trained adds a little HP
  return {
    eff,
    maxHp: Math.round((80 + 1.2 * level + 6 * eff.STA) * (p.hpMult ?? 1)), // STA: survive
    phys: (4 + 2.1 * eff.STR + 1.2 * eff.AGI) * (p.physMult ?? 1), // STR (+ AGI flurry): armor-reduced damage
    spell: 1.8 * eff.INT * (p.spellMult ?? 1), // INT: damage that ignores armor
    ward: 1.5 * eff.INT, // INT: arcane ward, a shield at fight start
    smite: 1.3 * eff.FTH, // FTH: a little holy damage
    insight: 1 + eff.WIS * 0.012, // WIS: reads the fight, finds openings
    crit: Math.min(0.6, 0.05 + (0.6 * eff.AGI) / (eff.AGI + 30) + (p.critBonus ?? 0)), // AGI
    dodge: Math.min(0.5, (0.5 * eff.AGI) / (eff.AGI + 25) + (p.dodgeBonus ?? 0)), // AGI
    specialResist: (0.7 * eff.WIS) / (eff.WIS + 25), // WIS: blunts the boss's big hits
    heal: (8 + 1.8 * eff.FTH) * (p.healMult ?? 1), // FTH: auto-heal (everyone has a small one)
    reviveChance: eff.FTH / (eff.FTH + 80), // FTH: one revive chance per fight
  };
}

export type Omen = 'favorable' | 'uncertain' | 'ominous';

/** What happened, in order, so the app can animate it and the sim can log it. */
export type FightEvent =
  | { t: 'omen'; omen: Omen; fortune: number }
  | { t: 'turn'; turn: number }
  | { t: 'press'; name: string }
  | { t: 'damage'; source: string; amount: number }
  | { t: 'mend'; source: string; amount: number } // heal from gear or items
  | { t: 'shield'; source: string; amount: number }
  | { t: 'stun'; source: string }
  | { t: 'buff'; source: string; mult: number }
  | { t: 'heal'; amount: number } // the automatic FTH heal
  | { t: 'hit'; amount: number; crit: boolean }
  | { t: 'bossStunned' }
  | { t: 'dodge'; special: boolean }
  | { t: 'bossAttack'; name: string; amount: number; special: boolean; crit: boolean; absorbed: number }
  | { t: 'revive' }
  | { t: 'end'; win: boolean };

export interface ButtonView {
  name: string;
  consumable: boolean;
  charges: number;
  usable: boolean;
  readyIn: number; // turns until usable (0 = now)
  hint: UseHint;
}

export interface FightView {
  turn: number; // turns completed
  hp: number;
  maxHp: number;
  shield: number;
  bossHp: number;
  bossMaxHp: number;
  specialNext: boolean; // the boss's next attack is its special
  omen: Omen;
  buttons: ButtonView[];
  over: boolean;
  win: boolean;
  pressed: number;
}

export interface Fight {
  view(): FightView;
  /** Play one full turn. `press` = index into view().buttons to press at its start. */
  step(press?: number): FightEvent[];
}

interface Button {
  name: string;
  effects: Effect[];
  hint: UseHint;
  charges: number;
  cooldown: number;
  ready: number; // turn it is next usable
  consumable: boolean;
}

export function createFight(load: Loadout, boss: BossDef, rng: Rng): Fight {
  const d = derive(load, boss);
  let events: FightEvent[] = [];
  const emit = (e: FightEvent) => events.push(e);

  let turn = 0;
  let hp = d.maxHp;
  let bossHp = boss.hp;
  let shield = d.ward;
  let stun = 0;
  let buffMult = 1;
  let buffTurns = 0;
  let healReady = 1;
  let revived = false;
  let pressed = 0;
  let lastHit = 0;
  let over = false;
  let win = false;

  // Fortune: one roll per fight, shown to the player as a pre-fight omen. It sets
  // how swingy fights are, so stronger stats tilt the odds without making the
  // outcome certain. Player damage x fortune, boss damage / fortune.
  const fortune = Math.exp(FORTUNE_SD * normal(rng));
  const omen: Omen = fortune >= 1.1 ? 'favorable' : fortune <= 0.9 ? 'ominous' : 'uncertain';
  const opening: FightEvent[] = [{ t: 'omen', omen, fortune }];

  const armorFactor = 100 / (100 + boss.armor);
  const passives = load.gear.flatMap((g) => (g.passive ? [g.passive] : []));
  const buttons: Button[] = [
    ...load.gear.flatMap((g) => (g.active ? [toButton(g.active)] : [])),
    ...load.items.map((i) => ({ name: i.name, effects: i.effects, hint: i.hint, charges: 1, cooldown: 0, ready: 1, consumable: true })),
  ];

  const apply = (effects: Effect[], source: string) => {
    for (const e of effects) {
      switch (e.kind) {
        case 'damage': {
          let dmg = e.base + (e.scaling ? (e.perPoint ?? 0) * d.eff[e.scaling] : 0);
          if (!e.ignoresArmor) dmg *= armorFactor;
          dmg *= d.insight * buffMult * fortune;
          bossHp -= dmg;
          emit({ t: 'damage', source, amount: dmg });
          break;
        }
        case 'damagePctBoss': {
          const dmg = boss.hp * e.pct;
          bossHp -= dmg;
          emit({ t: 'damage', source, amount: dmg });
          break;
        }
        case 'extraHit':
          bossHp -= lastHit * e.mult;
          emit({ t: 'damage', source, amount: lastHit * e.mult });
          break;
        case 'heal': {
          const before = hp;
          hp = Math.min(d.maxHp, hp + d.maxHp * e.pctMaxHp);
          emit({ t: 'mend', source, amount: hp - before });
          break;
        }
        case 'shield':
          shield += d.maxHp * e.pctMaxHp;
          emit({ t: 'shield', source, amount: d.maxHp * e.pctMaxHp });
          break;
        case 'stun':
          stun += e.turns;
          emit({ t: 'stun', source });
          break;
        case 'buffDamage':
          buffMult = e.mult;
          buffTurns = e.turns;
          emit({ t: 'buff', source, mult: e.mult });
          break;
      }
    }
  };
  const firePassives = (trigger: PassiveDef['trigger']) => {
    for (const p of passives) if (p.trigger === trigger && rng() < p.chance) apply(p.effects, p.name);
  };
  const finish = (w: boolean) => {
    over = true;
    win = w;
    emit({ t: 'end', win: w });
  };

  function playTurn(press?: number) {
    turn++;
    emit({ t: 'turn', turn });
    // --- player turn ---
    firePassives('turnStart');
    if (buffTurns > 0 && --buffTurns === 0) buffMult = 1;
    const specialNow = turn % boss.special.every === 0;

    if (press !== undefined) {
      const b = buttons.at(press);
      if (b && b.charges > 0 && turn >= b.ready) {
        b.charges--;
        b.ready = turn + b.cooldown + 1;
        pressed++;
        emit({ t: 'press', name: b.name });
        apply(b.effects, b.name);
      }
    }

    if (hp < d.maxHp * 0.4 && turn >= healReady) {
      const before = hp;
      hp = Math.min(d.maxHp, hp + d.heal);
      healReady = turn + 3;
      emit({ t: 'heal', amount: hp - before });
      firePassives('onHeal');
    }

    let hit = (d.phys * armorFactor + d.spell + d.smite) * d.insight * buffMult * fortune;
    const crit = rng() < d.crit;
    if (crit) hit *= 1.75;
    hit *= 0.75 + rng() * 0.5;
    lastHit = hit;
    bossHp -= hit;
    emit({ t: 'hit', amount: hit, crit });
    firePassives('onHit');
    if (bossHp <= 0) return finish(true);

    // --- boss turn ---
    // Stuns wait for an opening: a boss special can't be interrupted.
    if (stun > 0 && !specialNow) {
      stun--;
      emit({ t: 'bossStunned' });
      return;
    }
    const enrage = turn > boss.enrageTurn ? Math.pow(1.25, turn - boss.enrageTurn) : 1;
    let dmg = (boss.attack * (0.75 + rng() * 0.5) * enrage) / fortune;
    const bossCrit = rng() < BOSS_CRIT;
    if (bossCrit) dmg *= 1.6;
    if (specialNow) dmg *= boss.special.mult * (1 - d.specialResist);
    // AGI dodges normal attacks fully, and big specials at half the chance.
    if (rng() < (specialNow ? d.dodge * 0.5 : d.dodge)) {
      emit({ t: 'dodge', special: specialNow });
      firePassives('onDodge');
      if (bossHp <= 0) return finish(true);
      return;
    }
    const absorbed = Math.min(shield, dmg);
    shield -= absorbed;
    hp -= dmg - absorbed;
    emit({ t: 'bossAttack', name: specialNow ? boss.special.name : 'Attack', amount: dmg, special: specialNow, crit: bossCrit, absorbed });
    if (hp <= 0) {
      if (!revived && rng() < d.reviveChance) {
        revived = true;
        hp = d.maxHp * 0.3;
        emit({ t: 'revive' });
      } else {
        return finish(false);
      }
    }
  }

  return {
    view: () => ({
      turn,
      hp: Math.max(0, hp),
      maxHp: d.maxHp,
      shield,
      bossHp: Math.max(0, bossHp),
      bossMaxHp: boss.hp,
      specialNext: (turn + 1) % boss.special.every === 0,
      omen,
      buttons: buttons.map((b) => ({
        name: b.name,
        consumable: b.consumable,
        charges: b.charges,
        usable: !over && b.charges > 0 && turn + 1 >= b.ready,
        readyIn: Math.max(0, b.ready - (turn + 1)),
        hint: b.hint,
      })),
      over,
      win,
      pressed,
    }),
    step(press?: number) {
      events = turn === 0 ? [...opening] : [];
      if (!over && turn >= MAX_TURNS) finish(false); // out of time
      else if (!over) playTurn(press);
      return events;
    },
  };
}

/** Run a whole fight for the simulator. */
export function fight(load: Loadout, boss: BossDef, rng: Rng, policy: Policy = 'smart', withLog = false): FightResult {
  const f = createFight(load, boss, rng);
  const log: string[] = [];
  while (!f.view().over) {
    const v = f.view();
    const press = policy === 'smart' ? pickButton(v) : undefined;
    const evs = f.step(press);
    if (withLog) for (const e of evs) log.push(describe(e));
  }
  const v = f.view();
  return { win: v.win, turns: v.turn, hpLeftPct: v.hp / v.maxHp, bossHpLeftPct: v.bossHp / v.bossMaxHp, pressed: v.pressed, log };
}

function toButton(a: ActiveDef): Button {
  return { name: a.name, effects: a.effects, hint: a.hint, charges: a.charges, cooldown: a.cooldown, ready: 1, consumable: false };
}

/** The simulator's stand-in for a sensible player. Gear actives before scarce items. */
export function pickButton(v: FightView): number | undefined {
  const hpPct = v.hp / v.maxHp;
  const wants = (b: ButtonView) =>
    b.usable &&
    ((b.hint === 'lowHp' && hpPct < 0.35) || (b.hint === 'beforeSpecial' && v.specialNext && v.shield <= 0) || b.hint === 'asap');
  const gearIdx = v.buttons.findIndex((b) => !b.consumable && wants(b));
  if (gearIdx >= 0) return gearIdx;
  const itemIdx = v.buttons.findIndex((b) => b.consumable && wants(b));
  return itemIdx >= 0 ? itemIdx : undefined;
}

/** One-line text for an event (sim logs, debug). */
export function describe(e: FightEvent): string {
  const n = (x: number) => Math.round(x);
  switch (e.t) {
    case 'omen': return `Omen: ${e.omen} (${e.fortune.toFixed(2)})`;
    case 'turn': return `-- Turn ${e.turn}`;
    case 'press': return `  pressed ${e.name}`;
    case 'damage': return `  ${e.source}: ${n(e.amount)} damage`;
    case 'mend': return `  ${e.source}: +${n(e.amount)} HP`;
    case 'shield': return `  ${e.source}: shield ${n(e.amount)}`;
    case 'stun': return `  ${e.source}: boss stunned`;
    case 'buff': return `  ${e.source}: damage x${e.mult}`;
    case 'heal': return `  heal +${n(e.amount)}`;
    case 'hit': return `  hit ${n(e.amount)}${e.crit ? ' (crit)' : ''}`;
    case 'bossStunned': return '  boss is stunned';
    case 'dodge': return `  dodged${e.special ? ' the special' : ''}`;
    case 'bossAttack': return `  boss ${e.name} ${n(e.amount)}${e.absorbed ? ` (${n(e.absorbed)} absorbed)` : ''}`;
    case 'revive': return '  revived!';
    case 'end': return e.win ? 'VICTORY' : 'DEFEAT';
  }
}
