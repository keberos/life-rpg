import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { corePack } from '../../src/content/core-pack.ts';
import { createFight, describe, type Fight, type FightEvent } from '../../src/engine/combat.ts';
import { makeRng } from '../../src/engine/rng.ts';
import type { BattleItemDef } from '../../src/engine/types.ts';
import { bossLoot } from '../state/logic.ts';
import { store, useGame } from '../state/store.ts';
import { HpBar, StatChip, TopBar, Win, go } from './components.tsx';
import { HelpTip } from './Help.tsx';
import { Boss, Hero } from './sprites.tsx';

/** How many battle items you can carry into one fight. */
export const SATCHEL_SIZE = 3;

const OMEN_TEXT = { favorable: 'The omens are favorable.', uncertain: 'The omens are uncertain.', ominous: 'The omens are ominous...' };

export function BossScreen() {
  const g = useGame();
  const { boss } = g;
  const [fight, setFight] = useState<Fight | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [fast, setFast] = useState(false);
  const [loot, setLoot] = useState<string[] | null>(null);
  const [flash, setFlash] = useState<'hit' | 'hurt' | null>(null);
  const [heroAction, setHeroAction] = useState<'idle' | 'attack'>('idle');
  const queued = useRef<number | undefined>(undefined);
  const [, force] = useState(0);

  // Pack the satchel: one of each item type first, then repeats.
  const satchel = useMemo<BattleItemDef[]>(() => {
    const out: BattleItemDef[] = [];
    const left = { ...g.items };
    while (out.length < SATCHEL_SIZE) {
      const before = out.length;
      for (const it of corePack.battleItems) {
        if (out.length < SATCHEL_SIZE && (left[it.id] ?? 0) > 0) {
          out.push(it);
          left[it.id]--;
        }
      }
      if (out.length === before) break;
    }
    return out;
  }, []);

  const canFight = !boss.defeated && !boss.foughtToday && !g.seasonOver;

  const start = () => {
    const f = createFight({ stats: g.levels, cls: g.activeClass, gear: g.equipped, items: satchel }, boss.def, makeRng((Date.now() ^ 0x9e3779b9) >>> 0));
    setFight(f);
    setLines([]);
  };

  useEffect(() => {
    if (!fight) return;
    const id = setInterval(() => {
      if (fight.view().over) return clearInterval(id);
      const evs = fight.step(queued.current);
      queued.current = undefined;
      const hurt = evs.some((e) => e.t === 'bossAttack');
      setFlash(hurt ? 'hurt' : 'hit');
      if (evs.some((e) => e.t === 'hit')) {
        setHeroAction('attack');
        setTimeout(() => setHeroAction('idle'), fast ? 300 : 480);
      }
      setLines((ls) => [...evs.filter(show).map(describe).reverse(), ...ls].slice(0, 30));
      const v = fight.view();
      if (v.over) {
        clearInterval(id);
        onEnd(fight, evs);
      }
      force((n) => n + 1);
    }, fast ? 400 : 1200);
    return () => clearInterval(id);
  }, [fight, fast]);

  const onEnd = (f: Fight, _evs: FightEvent[]) => {
    const v = f.view();
    // Spent items: buttons are gear actives first, then the satchel in order.
    const firstItem = v.buttons.length - satchel.length;
    satchel.forEach((it, k) => {
      if (v.buttons[firstItem + k].charges === 0) store.log({ type: 'useItem', id: it.id });
    });
    store.log({ type: 'boss', bossId: boss.def.id, win: v.win, turns: v.turn, omen: v.omen, pressed: v.pressed });
    setLoot(bossLoot(g, v.win));
  };

  const v = fight?.view();

  return (
    <div class="stack">
      <TopBar onBack={() => go('#/')} title={`Boss ${boss.tier}/4`} />

      <Win>
        <div class="stack center" style={{ alignItems: 'center' }}>
          <h2>{boss.def.name}</h2>
          <Boss bossId={boss.def.id} scale={10} className={flash === 'hit' ? 'shake' : ''} />
          {v && <div style={{ width: '100%' }}><HpBar value={v.bossHp} max={v.bossMaxHp} color="var(--boss-hp)" /></div>}
          {!fight && (
            <div class="row wrap" style={{ gap: '4px', justifyContent: 'center' }}>
              <span class="faint">Weak to</span>
              {boss.def.weakTo.map((s) => <StatChip key={s} stat={s} />)}
              <span class="faint">· {boss.def.special.name} every {boss.def.special.every} turns</span>
              <HelpTip topic="bosses" label="How bosses work" />
            </div>
          )}
        </div>
      </Win>

      <Win>
        <div class="row" style={{ gap: '12px' }}>
          <Hero classId={g.activeClass.id} scale={4} action={heroAction} gear={g.equipped.map((x) => x.id)} />
          <div class="grow stack" style={{ gap: '6px' }}>
            <div class="row between"><h3>{g.activeClass.name}</h3><span class="pixel">Lv {g.totalLevel}</span></div>
            {v ? (
              <>
                <HpBar value={v.hp} max={v.maxHp} color="var(--hp)" shield={v.shield} />
                <span class="faint">{Math.round(v.hp)} / {v.maxHp} HP{v.shield > 0 ? ` · ${Math.round(v.shield)} shield` : ''}{v.specialNext && !v.over ? ` · ${boss.def.special.name} incoming!` : ''}</span>
              </>
            ) : (
              <span class="faint">Gear: {g.equipped.map((x) => x.name).join(', ') || 'none'} · Satchel: {satchel.map((x) => x.name).join(', ') || 'empty'}</span>
            )}
          </div>
        </div>
      </Win>

      {!fight && (
        canFight ? (
          <>
            <p class="muted center">The fight plays out on its own. Tap your gear and items at the right moment to tilt it.</p>
            <button class="btn primary big" onClick={start}>Fight!</button>
          </>
        ) : (
          <p class="muted center">{boss.defeated ? 'Already defeated this season.' : 'You fought today. Train and come back tomorrow.'}</p>
        )
      )}

      {v && (
        <>
          <p class="center pixel" style={{ color: v.omen === 'favorable' ? 'var(--good)' : v.omen === 'ominous' ? 'var(--bad)' : 'var(--ink-2)' }}>{OMEN_TEXT[v.omen]} {v.over && <HelpTip topic="bosses" label="What omens mean" />}</p>
          {!v.over && v.buttons.length > 0 && (
            <div class="row wrap" style={{ gap: '6px' }}>
              {v.buttons.map((b, k) => (
                <button key={k} class={`btn small grow ${queued.current === k ? 'selected' : ''}`} disabled={!b.usable} onClick={() => { queued.current = k; force((n) => n + 1); }}>
                  {b.name}{b.consumable ? '' : b.readyIn > 0 ? ` (${b.readyIn})` : ` ×${b.charges}`}
                </button>
              ))}
            </div>
          )}
          {!v.over && <button class="btn ghost small" onClick={() => setFast(!fast)}>{fast ? 'Normal speed' : 'Speed up'}</button>}
          <Win quiet>
            <div class="ticker">{lines.map((l, k) => <div key={lines.length - k} class={k < 3 ? 'new' : ''}>{l}</div>)}</div>
          </Win>
        </>
      )}

      {v?.over && (
        <Win>
          <div class="stack center">
            <h1 class="pop" style={{ color: v.win ? 'var(--accent)' : 'var(--bad)' }}>{v.win ? 'Victory!' : 'Defeated'}</h1>
            <p class="muted">{v.win ? `Took ${v.turn} turns.` : 'Every quest makes the next attempt stronger. Try again tomorrow.'}</p>
            {loot && loot.length > 0 && <p class="pop">Loot: <b>{loot.join(', ')}</b></p>}
            <button class="btn primary" onClick={() => go('#/')}>Back to camp</button>
          </div>
        </Win>
      )}
    </div>
  );
}

/** Keep the ticker readable: skip bookkeeping events. */
const show = (e: FightEvent) => e.t !== 'turn';
