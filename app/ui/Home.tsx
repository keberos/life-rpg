import { corePack } from '../../src/content/core-pack.ts';
import { STAT_IDS } from '../../src/engine/types.ts';
import { STAT_INFO } from '../content/quests.ts';
import { SEASON_WEEKS } from '../state/model.ts';
import { store, useGame } from '../state/store.ts';
import { StatBar, StatChip, Win, go } from './components.tsx';
import { HelpTip } from './Help.tsx';
import { Boss, Hero } from './sprites.tsx';

export function Home() {
  const g = useGame();
  const enabled = store.get().profile.enabledStats;
  const items = corePack.battleItems.filter((i) => (g.items[i.id] ?? 0) > 0);
  const { boss } = g;

  return (
    <div class="stack">
      <div class="topbar">
        <div>
          <h3>Season 1</h3>
          <span class="faint">Week {Math.min(g.week, SEASON_WEEKS)} of {SEASON_WEEKS}</span>
        </div>
        <button class="iconbtn" onClick={() => go('#/menu')} aria-label="Menu">☰</button>
      </div>

      <Win>
        <div class="row" style={{ alignItems: 'flex-start', gap: '14px' }}>
          <button class="iconbtn" style={{ padding: 0 }} onClick={() => go('#/gear')} aria-label="Open equipment">
            <Hero classId={g.activeClass.id} scale={6} gear={g.equipped.map((x) => x.id)} />
          </button>
          <div class="grow stack" style={{ gap: '6px' }}>
            <div class="row between">
              <h2>{g.activeClass.name}</h2>
              <span class="pixel">Lv {g.totalLevel}</span>
            </div>
            <span class="faint">Tap your hero for gear, a stat for details{g.unlocked.length > 1 ? ` (${g.unlocked.length} classes unlocked)` : ''}</span>
            {enabled.map((s) => <StatBar key={s} stat={s} level={g.levels[s]} progress={g.levelProgress[s]} onClick={() => go(`#/stat/${s}`)} />)}
          </div>
        </div>
      </Win>

      {g.questsTotal === 0 && (
        <p class="muted center">Welcome, adventurer. When you'd normally scroll, take a quest instead. Your first quest in each stat is a quick check, so later ones fit you.</p>
      )}
      <button class="btn primary big" onClick={() => go('#/quest')}>Quick quest</button>
      <span class="faint center">Picks a stat for you: rested stats and the boss's weaknesses first. <HelpTip topic="start" /></span>
      <div class="row wrap" style={{ gap: '6px' }}>
        <span class="faint">Choose a stat:</span>
        {STAT_IDS.filter((s) => enabled.includes(s)).map((s) => (
          <button key={s} class="btn ghost small" onClick={() => go(`#/quest/${s}`)} style={{ borderColor: STAT_INFO[s].color }}>
            {STAT_INFO[s].short}
            {g.daysSinceTrained[s] >= 1 && <span class="faint"> rested</span>}
          </button>
        ))}
      </div>

      <Win>
        <div class="row" style={{ gap: '12px' }}>
          <Boss bossId={boss.def.id} scale={4} />
          <div class="grow stack" style={{ gap: '6px' }}>
            <div class="row between"><h3>{boss.def.name}</h3><span class="faint">Boss {boss.tier}/4</span></div>
            <div class="row wrap" style={{ gap: '4px' }}>
              <span class="faint">Weak to</span>
              {boss.def.weakTo.map((s) => <StatChip key={s} stat={s} />)}
              <HelpTip topic="bosses" label="How bosses work" />
            </div>
            {g.seasonOver ? (
              <span class="muted">Season complete. Seasons and Legacy are coming next.</span>
            ) : boss.defeated ? (
              <span class="muted">Defeated! {boss.nextBossWeek ? `Next boss arrives in week ${boss.nextBossWeek}.` : 'Season boss down.'}</span>
            ) : boss.foughtToday ? (
              <span class="muted">You fought today. Train up and try again tomorrow.</span>
            ) : (
              <button class="btn" onClick={() => go('#/boss')}>Challenge</button>
            )}
          </div>
        </div>
      </Win>

      <Win quiet>
        <div class="stack" style={{ gap: '6px' }}>
          <div class="row between"><span class="muted">Quests today</span><span class="pixel">{g.questsToday}</span></div>
          <div class="row between">
            <span class="muted">Satchel <HelpTip topic="loot" label="About items and gear" /></span>
            <span>{items.length ? items.map((i) => `${i.name} ×${g.items[i.id]}`).join(', ') : <span class="faint">empty (quests drop items)</span>}</span>
          </div>
          <button class="btn ghost small" onClick={() => go('#/gear')}>
            Equipment: {g.equipped.length ? g.equipped.map((x) => x.name).join(', ') : 'none yet'} ›
          </button>
          {g.questsToday > 0 && !g.checkedInToday && (
            <button class="btn ghost small" onClick={() => go('#/checkin')}>Done for today? 10-second check-in</button>
          )}
        </div>
      </Win>
    </div>
  );
}
