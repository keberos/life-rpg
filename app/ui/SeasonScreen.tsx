// Season end: a recap of the run, the Legacy it earned, and setup for the next season.
import { useState } from 'preact/hooks';
import { corePack } from '../../src/content/core-pack.ts';
import { STAT_IDS } from '../../src/engine/types.ts';
import { PERKS } from '../content/legacy.ts';
import { THEME_BONUS, themeFor } from '../content/seasons.ts';
import { STAT_INFO, questById } from '../content/quests.ts';
import { store, useGame } from '../state/store.ts';
import { StatBar, TopBar, Win, go } from './components.tsx';
import { goalName } from './GoalScreen.tsx';
import { Hero } from './sprites.tsx';

export function SeasonScreen() {
  const g = useGame();
  const { season, lifetime } = g;
  const [startClass, setStartClass] = useState<string>('adventurer');
  const [perk, setPerk] = useState<string | null>(null);
  const [heirloom, setHeirloom] = useState<string | null>(null);

  if (!g.seasonOver) {
    return (
      <div class="stack">
        <TopBar onBack={() => go('#/')} title={`Season ${season.number}`} />
        <p class="muted center">The season is still running: week {g.week} of 8.</p>
      </div>
    );
  }

  const nextTheme = themeFor(season.number + 1);
  const className = (id: string) => corePack.classes.find((c) => c.id === id)?.name ?? id;
  const canStart = perk !== 'heirloom' || !!heirloom;
  const start = () => {
    store.log({
      type: 'newSeason',
      ...(startClass !== 'adventurer' ? { startClass } : {}),
      ...(perk ? { perk } : {}),
      ...(perk === 'heirloom' && heirloom ? { heirloom } : {}),
    });
    go('#/goal');
  };

  return (
    <div class="stack">
      <TopBar onBack={() => go('#/')} title={`Season ${season.number} complete`} />

      <Win>
        <div class="stack center" style={{ alignItems: 'center', gap: '6px' }}>
          <Hero classId={g.activeClass.id} scale={7} gear={g.equipped.map((x) => x.id)} />
          <h2>{g.activeClass.name} · Lv {g.totalLevel}</h2>
          <span class="faint">{season.quests} quests this season</span>
          {season.goal && <span class={season.goalReached ? 'r-rare' : 'faint'}>Goal: {goalName(season.goal)} · {season.goalReached ? 'reached!' : 'not this time'}</span>}
        </div>
      </Win>

      <h3>Bosses</h3>
      <Win quiet>
        <div class="stack" style={{ gap: '4px' }}>
          {corePack.bosses.map((b) => (
            <div key={b.id} class="row between">
              <span>{b.name}</span>
              <span class={season.bossesBeaten.includes(b.id) ? 'r-rare' : 'faint'}>{season.bossesBeaten.includes(b.id) ? 'Defeated' : 'Not this time'}</span>
            </div>
          ))}
        </div>
      </Win>

      <h3>Stats</h3>
      <Win quiet>
        <div class="stack" style={{ gap: '6px' }}>
          {STAT_IDS.map((s) => <StatBar key={s} stat={s} level={g.levels[s]} progress={g.levelProgress[s]} />)}
        </div>
      </Win>

      {season.rechecks.length > 0 && (
        <>
          <h3>{season.number === 1 ? 'Your baselines' : 'Rechecks'}</h3>
          <Win quiet>
            <div class="stack" style={{ gap: '4px' }}>
              {season.rechecks.map((r) => {
                const q = questById(r.questId);
                return (
                  <div key={r.questId} class="row between">
                    <span style={{ color: STAT_INFO[r.stat].color }}>{q?.title ?? r.questId}</span>
                    <span>{r.before !== undefined ? `${r.before} → ` : ''}{r.value} {q?.unit}</span>
                  </div>
                );
              })}
              <span class="faint">Next season starts with a quick recheck, so you can see how far you've come.</span>
            </div>
          </Win>
        </>
      )}

      <h3>Legacy</h3>
      <p class="muted">Your levels and gear reset for the new season. Your calibration and lifetime record carry over, and Legacy gives you new ways to start.{nextTheme ? ` Next up: the ${nextTheme.name}, with +${Math.round(THEME_BONUS * 100)}% XP on ${nextTheme.stats.join(' and ')}. You'll pick a season goal after you start.` : ''}</p>

      <Win quiet>
        <div class="stack" style={{ gap: '6px' }}>
          <b>Starting class</b>
          <span class="faint">Beat the Hollow Warden or Ashen Wyrm as a class to master it. Mastered classes can start a season unlocked.</span>
          {['adventurer', ...lifetime.masteredClasses].map((id) => (
            <button key={id} class={`btn ghost option-row ${startClass === id ? 'selected' : ''}`} onClick={() => setStartClass(id)}>
              <b>{className(id)}</b>
              <span class="small-text">{id === 'adventurer' ? 'Start fresh and unlock classes by training.' : 'Open from day one, with its abilities.'}</span>
            </button>
          ))}
        </div>
      </Win>

      <Win quiet>
        <div class="stack" style={{ gap: '6px' }}>
          <b>Starting perk</b>
          <span class="faint">Pick one for the new season.</span>
          <button class={`btn ghost option-row ${perk === null ? 'selected' : ''}`} onClick={() => setPerk(null)}>
            <b>None</b>
          </button>
          {PERKS.map((p) => {
            const open = lifetime.unlockedPerks.includes(p.id);
            return (
              <button key={p.id} class={`btn ghost option-row ${perk === p.id ? 'selected' : ''}`} disabled={!open} onClick={() => setPerk(p.id)}>
                <b>{p.name}</b>{!open && <span class="faint"> · locked</span>}
                <span class="small-text">{p.effect}</span>
                {!open && <span class="faint">Unlock: {p.unlock}</span>}
              </button>
            );
          })}
          {perk === 'heirloom' && (
            <div class="stack" style={{ gap: '6px' }}>
              <span class="faint">Which piece carries over?</span>
              {g.ownedGear.map((x) => (
                <button key={x.id} class={`btn ghost option-row ${heirloom === x.id ? 'selected' : ''}`} onClick={() => setHeirloom(x.id)}>
                  <b class={`r-${x.rarity}`}>{x.name}</b> <span class="faint">· {x.rarity}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </Win>

      <button class="btn primary big" disabled={!canStart} onClick={start}>Start Season {season.number + 1}</button>
    </div>
  );
}
