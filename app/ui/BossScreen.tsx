import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { createFight, fight as simulate, type Fight, type FightEvent } from '../../src/engine/combat.ts';
import { makeRng } from '../../src/engine/rng.ts';
import type { BattleItemDef } from '../../src/engine/types.ts';
import { perkById, relicById } from '../content/legacy.ts';
import { heroLoadout, recordFight } from '../state/logic.ts';
import { mastersClass } from '../state/model.ts';
import { store, useGame } from '../state/store.ts';
import { HpBar, StatChip, TopBar, Win, go } from './components.tsx';
import { HelpTip } from './Help.tsx';
import { Icon } from './icons.tsx';
import { JotNote } from './Playtest.tsx';
import { Boss, Hero } from './sprites.tsx';

const OMEN_TEXT = { favorable: 'The omens are favorable.', uncertain: 'The omens are uncertain.', ominous: 'The omens are ominous...' };

export function BossScreen() {
  const g = useGame();
  const { boss } = g;
  const [fight, setFight] = useState<Fight | null>(null);
  const [lines, setLines] = useState<string[]>([]);
  const [fast, setFast] = useState(false);
  const [loot, setLoot] = useState<string[] | null>(null);
  const [mastered, setMastered] = useState<string | null>(null);
  const [relics, setRelics] = useState<{ names: string[]; perks: string[] }>({ names: [], perks: [] });
  const [flash, setFlash] = useState<'hit' | 'hurt' | null>(null);
  const [heroAction, setHeroAction] = useState<'idle' | 'attack'>('idle');
  const queued = useRef<number | undefined>(undefined);
  const [, force] = useState(0);

  // Pack the satchel: one of each item type first, then repeats.
  const loadout = useMemo(() => heroLoadout(g), []);
  const satchel: BattleItemDef[] = loadout.items;

  const canFight = !boss.defeated && !boss.foughtToday && !g.seasonOver;

  // A rough read on your odds: replay the fight a few hundred times with sensible button use.
  const odds = useMemo(() => {
    if (!canFight) return null;
    const rng = makeRng(12345);
    const load = loadout;
    let wins = 0;
    let bossLeft = 0;
    const N = 300;
    for (let i = 0; i < N; i++) {
      const r = simulate(load, boss.def, rng);
      if (r.win) wins++;
      bossLeft += r.bossHpLeftPct;
    }
    return { win: wins / N, bossLeft: bossLeft / N };
  }, [canFight, satchel]);

  const start = () => {
    const f = createFight(loadout, boss.def, makeRng((Date.now() ^ 0x9e3779b9) >>> 0));
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
      setLines((ls) => [...evs.map((e) => narrate(e, boss.def.name)).filter((l): l is string => !!l).reverse(), ...ls].slice(0, 30));
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
    if (v.win && mastersClass(boss.def.id, g.activeClass.id) && !g.lifetime.masteredClasses.includes(g.activeClass.id)) setMastered(g.activeClass.name);
    setLoot(recordFight(g, satchel, v));
    // New relics (and any perks they unlock), worked out from the updated record.
    const after = store.state().lifetime;
    const newRelics = after.relics.filter((id) => !g.lifetime.relics.includes(id));
    const newPerks = after.unlockedPerks.filter((id) => !g.lifetime.unlockedPerks.includes(id));
    setRelics({ names: newRelics.map((id) => relicById(id)?.name ?? id), perks: newPerks.map((id) => perkById(id)?.name ?? id) });
  };

  const v = fight?.view();

  return (
    <div class="stack">
      <TopBar onBack={() => go('#/')} title={`Boss ${boss.tier}/4`} />

      <Win tone="danger" title={boss.def.name}>
        <div class="stack center" style={{ alignItems: 'center', paddingTop: '6px' }}>
          <Boss bossId={boss.def.id} form={boss.def.form} scale={10} className={flash === 'hit' ? 'shake' : ''} />
          {v && <div style={{ width: '100%' }}><HpBar value={v.bossHp} max={v.bossMaxHp} color="var(--boss-hp)" /></div>}
          {!fight && boss.def.blurb && <p class="faint center" style={{ margin: 0 }}>This season's form: {boss.def.blurb}</p>}
          {!fight && (
            <div class="row wrap" style={{ gap: '4px', justifyContent: 'center' }}>
              {boss.def.weakTo.map((s) => <StatChip key={s} stat={s} />)}
              <span class="faint">{boss.def.special.name} every {boss.def.special.every} turns</span>
              <HelpTip topic="bosses" label="How bosses work" />
            </div>
          )}
        </div>
      </Win>

      {!fight && <div class="vs">VS</div>}
      <Win title={g.activeClass.name}>
        <div class="row" style={{ gap: '12px' }}>
          <Hero classId={g.activeClass.id} scale={6} action={heroAction} gear={g.equipped.map((x) => x.id)} look={g.look} />
          <div class="grow stack" style={{ gap: '6px' }}>
            <div class="row between"><span class="lv-badge">LV {g.totalLevel}</span></div>
            {v ? (
              <>
                <HpBar value={v.hp} max={v.maxHp} color="var(--hp)" shield={v.shield} />
                <span class="faint">{Math.round(v.hp)} / {v.maxHp} HP{v.shield > 0 ? ` · ${Math.round(v.shield)} shield` : ''}{v.specialNext && !v.over ? ` · ${boss.def.special.name} incoming!` : ''}</span>
              </>
            ) : (
              <div class="slots">
                {g.equipped.map((x) => <span key={x.id} class={`slot r-${x.rarity}`}>{x.name}</span>)}
                {satchel.map((x, k) => <span key={k} class="slot">{x.name}</span>)}
                {!g.equipped.length && !satchel.length && <span class="faint">No gear or items yet</span>}
              </div>
            )}
          </div>
        </div>
      </Win>

      {!fight && (
        canFight ? (
          <>
            {odds && <OddsLine win={odds.win} />}
            <button class="btn fight big glow" onClick={start}><Icon name="sword" size={22} /> Fight!</button>
            <p class="faint center">Auto-battle. Tap gear and items at the right moment.</p>
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
            <p class="muted">
              {v.win
                ? `Took ${v.turn} turns.`
                : `The ${boss.def.name} was down to ${Math.max(1, Math.round((v.bossHp / v.bossMaxHp) * 100))}% HP. Every quest makes the next attempt stronger. Try again tomorrow.`}
            </p>
            {loot && loot.length > 0 && <p class="pop">Loot: <b>{loot.join(', ')}</b></p>}
            {v.win && g.season.goal?.kind === 'boss' && g.season.goal.id === boss.def.id && <p class="pop"><b>Season goal reached!</b></p>}
            {relics.names.length > 0 && (
              <div class="class-banner pop">
                <b>Relic{relics.names.length > 1 ? 's' : ''}: {relics.names.join(', ')}</b>
                <span class="small-text">{relics.perks.length ? `New starting perk unlocked: ${relics.perks.join(', ')}. Pick it when the next season starts.` : 'Added to your Reliquary (Menu).'}</span>
              </div>
            )}
            {mastered && (
              <div class="class-banner pop">
                <b>{mastered} mastered!</b>
                <span class="small-text">You can start any future season as a {mastered}, with its abilities from day one.</span>
              </div>
            )}
            <button class="btn primary" onClick={() => go('#/')}>Back to camp</button>
            <JotNote where={`boss: ${boss.def.name} (${v.win ? 'won' : 'lost'})`} />
          </div>
        </Win>
      )}
    </div>
  );
}

function OddsLine({ win }: { win: number }) {
  const [label, color, hint] =
    win >= 0.75 ? ['Good odds', 'var(--good)', 'You should be ready.']
    : win >= 0.45 ? ['Even fight', 'var(--accent)', 'Could go either way. Good timing with items helps.']
    : win >= 0.15 ? ['Long shot', 'var(--ink-2)', 'Possible with luck. A few more quests in its weak stats would help.']
    : ['Not ready yet', 'var(--bad)', 'Train its weak stats and gather gear first. Trying still earns a little loot.'];
  // A five-pip threat meter: more lit pips = better odds.
  const lit = Math.max(1, Math.min(5, Math.ceil(win * 5)));
  return (
    <Win quiet title="Odds">
      <div class="stack center" style={{ gap: '4px', alignItems: 'center', paddingTop: '4px' }}>
        <div class="odds-pips" aria-label={label}>{Array.from({ length: 5 }, (_, i) => <i key={i} style={i < lit ? { background: color } : undefined} />)}</div>
        <span class="pixel" style={{ color }}>{label}</span>
        <span class="faint">{hint}</span>
      </div>
    </Win>
  );
}

/** Battle log lines in plain words. Bookkeeping events are skipped (null). */
function narrate(e: FightEvent, boss: string): string | null {
  const n = (x: number) => Math.round(x);
  switch (e.t) {
    case 'omen': case 'turn': case 'end': return null;
    case 'press': return `You use ${e.name}!`;
    case 'damage': return `${e.source} deals ${n(e.amount)} damage.`;
    case 'mend': return `${e.source} heals you for ${n(e.amount)}.`;
    case 'shield': return `${e.source} shields you (${n(e.amount)}).`;
    case 'stun': return `${e.source} stuns the ${boss}!`;
    case 'buff': return `${e.source}: damage +${Math.round((e.mult - 1) * 100)}%.`;
    case 'heal': return `You recover ${n(e.amount)} HP.`;
    case 'hit': return e.crit ? `Critical hit! ${n(e.amount)} damage.` : `You hit for ${n(e.amount)}.`;
    case 'bossStunned': return `The ${boss} is stunned and can't act.`;
    case 'dodge': return e.special ? 'You dodge its special attack!' : 'You dodge.';
    case 'bossAttack': {
      const what = e.special ? `unleashes ${e.name}` : 'attacks';
      return `The ${boss} ${what}${e.crit ? ' (critical)' : ''}: ${n(e.amount)} damage${e.absorbed ? `, ${n(e.absorbed)} blocked` : ''}.`;
    }
    case 'revive': return 'Your faith holds. You get back up!';
    case 'evade': return `${e.source}: the next attack will miss.`;
    case 'evaded': return e.special ? `The ${boss}'s special attack misses!` : `The ${boss}'s attack misses.`;
  }
}
