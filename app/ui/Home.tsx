import { corePack } from '../../src/content/core-pack.ts';
import { STAT_IDS } from '../../src/engine/types.ts';
import { STAT_INFO } from '../content/quests.ts';
import { THEME_BONUS } from '../content/seasons.ts';
import { SEASON_WEEKS } from '../state/model.ts';
import { store, useGame } from '../state/store.ts';
import { StatBar, StatChip, Win, go } from './components.tsx';
import { goalName, goalProgress } from './GoalScreen.tsx';
import { HelpTip } from './Help.tsx';
import { Icon } from './icons.tsx';
import { Boss, Hero } from './sprites.tsx';

export function Home() {
  const g = useGame();
  const enabled = store.get().profile.enabledStats;
  const items = corePack.battleItems.filter((i) => (g.items[i.id] ?? 0) > 0);
  const { boss } = g;
  const week = Math.min(g.week, SEASON_WEEKS);

  return (
    <div class="stack">
      <div class="hud-top">
        <div class="stack" style={{ gap: '5px' }}>
          <h2>Season {g.season.number}</h2>
          <div class="pips" aria-label={`Week ${week} of ${SEASON_WEEKS}`}>
            {Array.from({ length: SEASON_WEEKS }, (_, i) => <i key={i} class={i + 1 < week ? 'done' : i + 1 === week ? 'now' : ''} />)}
          </div>
        </div>
        <div class="stack" style={{ gap: '3px', alignItems: 'flex-end' }}>
          <span class="faint">Week {week}/{SEASON_WEEKS}</span>
          {g.season.theme && (
            <span class="theme-tag">{g.season.theme.name.replace('Season of ', '').replace('the ', '')} · {g.season.theme.stats.join(' ')} +{Math.round(THEME_BONUS * 100)}%</span>
          )}
        </div>
      </div>

      <Win title={g.activeClass.name}>
        <div class="row" style={{ alignItems: 'center', gap: '12px' }}>
          <button class="iconbtn hero-stand" style={{ padding: 0 }} onClick={() => go('#/gear')} aria-label="Open hero and gear">
            <Hero classId={g.activeClass.id} scale={6} gear={g.equipped.map((x) => x.id)} />
          </button>
          <div class="grow stack" style={{ gap: '5px' }}>
            <div class="row between">
              <span class="lv-badge">LV {g.totalLevel}</span>
              {g.unlocked.length > 1 && <span class="faint">{g.unlocked.length - 1} class{g.unlocked.length > 2 ? 'es' : ''}</span>}
            </div>
            {enabled.map((s) => <StatBar key={s} stat={s} level={g.levels[s]} progress={g.levelProgress[s]} onClick={() => go(`#/stat/${s}`)} />)}
          </div>
        </div>
      </Win>

      {g.newClasses.length > 0 && (
        <button class="btn class-banner pop" onClick={() => go('#/gear')}>
          <span>New class unlocked: {g.newClasses.map((c) => c.name).join(', ')}!</span>
          <span class="small-text">Tap to choose it and get its abilities</span>
        </button>
      )}
      {g.lifetime.questsTotal === 0 && (
        <Win quiet>
          <p class="prose muted center">Welcome, adventurer. When you'd normally scroll, take a quest instead. Your first quest in each stat is a quick check, so later ones fit you.</p>
        </Win>
      )}

      {g.lifetime.questsTotal > 0 && !g.seasonOver && (
        <button class="btn ghost goal-strip" onClick={() => go('#/goal')}>
          <span style={{ color: 'var(--accent)' }}><Icon name="flag" /></span>
          {g.season.goal ? (
            <span class="grow">
              {goalName(g.season.goal, g.season.number)}
              <span class={g.season.goalReached ? 'r-legendary' : 'faint'}> · {goalProgress(g)}</span>
            </span>
          ) : (
            <span class="grow">Set a season goal</span>
          )}
          <span class="faint">›</span>
        </button>
      )}

      <button class="btn primary big glow" onClick={() => go('#/quest')}>
        <Icon name="sword" size={22} /> Quick Quest
      </button>
      <div class="stat-tiles">
        {STAT_IDS.filter((s) => enabled.includes(s)).map((s) => (
          <button key={s} class="stat-tile" style={{ '--c': STAT_INFO[s].color }} onClick={() => go(`#/quest/${s}`)} aria-label={`${STAT_INFO[s].name} quest${g.daysSinceTrained[s] >= 1 ? ', rested bonus' : ''}`}>
            {STAT_INFO[s].short}
            {g.daysSinceTrained[s] >= 1 && <span class="rested">+XP</span>}
          </button>
        ))}
      </div>

      <Win tone="danger" title={`Boss ${boss.tier}/4`}>
        <div class="row" style={{ gap: '12px' }}>
          <Boss bossId={boss.def.id} form={boss.def.form} scale={4} />
          <div class="grow stack" style={{ gap: '6px' }}>
            <h3>{boss.def.name}</h3>
            <div class="row wrap" style={{ gap: '4px' }}>
              {boss.def.weakTo.map((s) => <StatChip key={s} stat={s} />)}
              <HelpTip topic="bosses" label="How bosses work" />
            </div>
            {g.seasonOver ? (
              <button class="btn primary" onClick={() => go('#/season')}>Season complete! Recap</button>
            ) : boss.defeated ? (
              <span class="muted">Defeated! {boss.nextBossWeek ? `Next boss: week ${boss.nextBossWeek}.` : 'Season boss down.'}</span>
            ) : boss.foughtToday ? (
              <span class="muted">{boss.behind ? 'It waits for you. ' : ''}Rest, train, and try again tomorrow.</span>
            ) : (
              <button class="btn fight" onClick={() => go('#/boss')}>{boss.behind ? 'It waits · Fight' : 'Fight'}</button>
            )}
          </div>
        </div>
      </Win>

      <Win quiet title="Satchel">
        <div class="stack" style={{ gap: '8px' }}>
          <div class="slots">
            {items.length ? items.map((i) => <span key={i.id} class="slot">{i.name} <b>×{g.items[i.id]}</b></span>) : <span class="faint">Empty. Quests drop items.</span>}
          </div>
          <div class="row between">
            <span class="faint">Quests today: <b style={{ color: 'var(--ink)' }}>{g.questsToday}</b></span>
            {g.questsToday > 0 && !g.checkedInToday && (
              <button class="btn ghost small" onClick={() => go('#/checkin')}>Daily check-in</button>
            )}
          </div>
        </div>
      </Win>
    </div>
  );
}
