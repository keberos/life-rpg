// Season goal: pick a class to unlock or a boss to beat. Quick quest then leans
// toward the stats that get you there. Optional, and changeable any time.
import { corePack } from '../../src/content/core-pack.ts';
import type { StatId } from '../../src/engine/types.ts';
import { GOAL_MIN_BOSS_TIER, type Goal } from '../content/seasons.ts';
import type { GameState } from '../state/model.ts';
import { store, useGame } from '../state/store.ts';
import { StatChip, TopBar, Win, go } from './components.tsx';

export function goalName(goal: Goal): string {
  if (goal.kind === 'class') return `Unlock ${corePack.classes.find((c) => c.id === goal.id)?.name ?? goal.id}`;
  return `Beat the ${corePack.bosses.find((b) => b.id === goal.id)?.name ?? goal.id}`;
}

/** One line on where the goal stands: stat levels toward a class, or the boss's week and weaknesses. */
export function goalProgress(g: GameState): string {
  const goal = g.season.goal;
  if (!goal) return '';
  if (g.season.goalReached) return 'Reached!';
  if (goal.kind === 'class') {
    const c = corePack.classes.find((x) => x.id === goal.id);
    return Object.entries(c?.requires ?? {}).map(([s, need]) => `${s} ${Math.min(g.levels[s as StatId], need!)}/${need}`).join(' · ');
  }
  const b = corePack.bosses.find((x) => x.id === goal.id);
  return b ? `Boss ${b.tier} of 4 · weak to ${b.weakTo.join(' and ')}` : '';
}

export function GoalScreen() {
  const g = useGame();
  const current = g.season.goal;
  const set = (goal: Goal | null) => {
    store.log({ type: 'setGoal', goal });
    go('#/');
  };
  const isCurrent = (kind: Goal['kind'], id: string) => current?.kind === kind && current.id === id;
  const classes = corePack.classes.filter((c) => c.id !== 'adventurer' && !g.unlocked.some((u) => u.id === c.id));
  const bosses = corePack.bosses.filter((b) => b.tier >= GOAL_MIN_BOSS_TIER && !g.season.bossesBeaten.includes(b.id));

  return (
    <div class="stack">
      <TopBar onBack={() => go('#/')} title="Season goal" />
      <p class="muted">Pick something to aim for this season. Quick quest will lean toward the stats that get you there. Every quest still counts, and you can change your goal any time.</p>

      {classes.length > 0 && (
        <Win quiet>
          <div class="stack" style={{ gap: '6px' }}>
            <b>Unlock a class</b>
            {classes.map((c) => (
              <button key={c.id} class={`btn ghost option-row ${isCurrent('class', c.id) ? 'selected' : ''}`} onClick={() => set({ kind: 'class', id: c.id })}>
                <b>{c.name}</b>
                <span class="small-text">
                  {Object.entries(c.requires).map(([s, need]) => `${s} ${g.levels[s as StatId]}/${need}`).join(' · ')}
                </span>
              </button>
            ))}
          </div>
        </Win>
      )}

      {bosses.length > 0 && (
        <Win quiet>
          <div class="stack" style={{ gap: '6px' }}>
            <b>Beat a boss</b>
            {bosses.map((b) => (
              <button key={b.id} class={`btn ghost option-row ${isCurrent('boss', b.id) ? 'selected' : ''}`} onClick={() => set({ kind: 'boss', id: b.id })}>
                <b>{b.name}</b>
                <span class="row wrap small-text" style={{ gap: '4px' }}>
                  Boss {b.tier} of 4 · weak to {b.weakTo.map((s) => <StatChip key={s} stat={s} />)}
                </span>
              </button>
            ))}
          </div>
        </Win>
      )}

      {current && <button class="btn ghost" onClick={() => set(null)}>Clear goal</button>}
    </div>
  );
}
