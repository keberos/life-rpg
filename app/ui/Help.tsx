// Help, one tap away: a page per stat (tap a stat bar in camp) and the Guide (menu).
// Numbers come from the engine and content data, so the text stays true when balance changes.
import { useEffect } from 'preact/hooks';
import { corePack } from '../../src/content/core-pack.ts';
import { WEAKNESS_MULT } from '../../src/engine/combat.ts';
import { FAIL_XP_SHARE, XP_TABLE, restedMultiplier, xpForLevel } from '../../src/engine/progression.ts';
import { STAT_IDS, type StatId } from '../../src/engine/types.ts';
import { QUESTS, STAT_INFO } from '../content/quests.ts';
import { DROP_CHANCE, PITY_AFTER } from '../state/drops.ts';
import { SEASON_WEEKS } from '../state/model.ts';
import { useGame } from '../state/store.ts';
import { SATCHEL_SIZE } from './BossScreen.tsx';
import { StatBar, TopBar, Win, go } from './components.tsx';

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Small ⓘ button that opens a Guide section. */
export function HelpTip({ topic, label = 'What is this?' }: { topic: string; label?: string }) {
  return (
    <button
      class="helptip"
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        go(`#/help/${topic}`);
      }}
    >
      ⓘ
    </button>
  );
}

export function StatScreen({ stat }: { stat: StatId }) {
  const g = useGame();
  const info = STAT_INFO[stat];
  const level = g.levels[stat];
  const toNext = xpForLevel(level + 1) - g.xp[stat];
  const days = g.daysSinceTrained[stat];
  const bonus = restedMultiplier(days) - 1;
  const quests = QUESTS.filter((q) => q.stat === stat);
  const classes = corePack.classes.filter((c) => stat in c.requires);
  const weakBoss = g.boss.def.weakTo.includes(stat);

  return (
    <div class="stack">
      <TopBar onBack={() => go('#/')} title={info.name} />

      <Win>
        <div class="stack" style={{ gap: '8px' }}>
          <StatBar stat={stat} level={level} progress={g.levelProgress[stat]} />
          <span class="faint">
            Level {level} · {toNext} XP to level {level + 1}
            {bonus > 0 ? ` · rested: +${pct(bonus)} XP on your next ${info.short} quest` : ''}
          </span>
          {!g.calibrated[stat] && quests.some((q) => q.curve) && (
            <span class="faint">Your first measured {info.short} quest is a quick check of your current level, so later ones fit you.</span>
          )}
        </div>
      </Win>

      <Win quiet>
        <div class="stack" style={{ gap: '10px' }}>
          <div class="stack" style={{ gap: '2px' }}>
            <b>In real life</b>
            <span>{info.about}</span>
          </div>
          <div class="stack" style={{ gap: '2px' }}>
            <b>In battle</b>
            <span>{info.battle}</span>
            {weakBoss && <span class="small-text" style={{ color: info.color }}>The {g.boss.def.name} is weak to {info.name}: it counts {WEAKNESS_MULT}× in that fight.</span>}
          </div>
          {classes.length > 0 && (
            <div class="stack" style={{ gap: '2px' }}>
              <b>Classes</b>
              <span class="small-text">
                {classes.map((c) => `${c.name} (${Object.entries(c.requires).map(([s, v]) => `${s} ${v}`).join(', ')})`).join(' · ')}
              </span>
            </div>
          )}
          <div class="stack" style={{ gap: '2px' }}>
            <b>Quests</b>
            <span class="small-text">{quests.map((q) => q.title).join(' · ')}</span>
          </div>
        </div>
      </Win>

      <button class="btn primary big" onClick={() => go(`#/quest/${stat}`)}>Train {info.name}</button>
      <button class="btn ghost small" onClick={() => go('#/help/stats')}>All stats and how they work ›</button>
    </div>
  );
}

const TOPICS = [
  ['start', 'Getting started'],
  ['stats', 'Stats'],
  ['xp', 'XP and levels'],
  ['calibration', 'Calibration'],
  ['loot', 'Drops and gear'],
  ['classes', 'Classes'],
  ['bosses', 'Bosses'],
  ['season', 'Seasons'],
] as const;

function Section({ id, title, children }: { id: string; title: string; children: preact.ComponentChildren }) {
  return (
    <Win quiet>
      <div id={`help-${id}`} class="stack help-section" style={{ gap: '8px' }}>
        <h3>{title}</h3>
        {children}
      </div>
    </Win>
  );
}

export function Guide({ topic }: { topic?: string }) {
  useEffect(() => {
    if (topic) document.getElementById(`help-${topic}`)?.scrollIntoView({ block: 'start' });
  }, [topic]);
  const x = XP_TABLE;

  return (
    <div class="stack">
      <TopBar onBack={() => history.length > 1 ? history.back() : go('#/menu')} title="Guide" />

      <div class="row wrap" style={{ gap: '6px' }}>
        {TOPICS.map(([id, title]) => (
          <button key={id} class="btn ghost small" onClick={() => document.getElementById(`help-${id}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })}>{title}</button>
        ))}
      </div>

      <Section id="start" title="Getting started">
        <p>When you catch yourself reaching for the scroll, take a quest instead. Each one takes a minute or three and builds one stat.</p>
        <p><b>Quick quest</b> picks a stat for you. It favors stats you haven't trained lately (they're rested, so they earn more XP) and the current boss's weaknesses. Or tap a stat in camp to train that one.</p>
        <p>Your hero gets stronger as your stats grow. Use that to beat the season's bosses.</p>
      </Section>

      <Section id="stats" title="Stats">
        <p>Every stat helps in battle in its own way, and no content needs any one stat. Train what you want.</p>
        {STAT_IDS.map((s) => (
          <button key={s} class="btn ghost option-row" onClick={() => go(`#/stat/${s}`)}>
            <b style={{ color: STAT_INFO[s].color }}>{STAT_INFO[s].name} ({s})</b>
            <span class="small-text">{STAT_INFO[s].about}</span>
            <span class="small-text"><i>In battle:</i> {STAT_INFO[s].battle}</span>
          </button>
        ))}
      </Section>

      <Section id="xp" title="XP and levels">
        <p>Each stat has its own XP and level. Your hero's level is all your stat levels added up.</p>
        <p>A quest pays by how hard it was <i>for you</i>: {x.easy} XP if easy, {x.normal} normal, {x.hard} hard. Every kind of quest pays the same, physical or not. It's on the honor system.</p>
        <p>Didn't finish? You still get {pct(FAIL_XP_SHARE)} of the XP. Effort counts, and the next one will be a little gentler.</p>
        <p><b>Rested:</b> each day a stat goes untrained adds +{pct(restedMultiplier(1) - 1)} XP to its next quest, up to +{pct(restedMultiplier(7) - 1)} after a week. Skipping a stat never costs you anything.</p>
      </Section>

      <Section id="calibration" title="Calibration">
        <p>Quests fit you, not an average person. The first counted or timed quest in each stat (push-ups, a plank, a balance hold) asks you to go to your max once. After that, quests aim at about three in four going well.</p>
        <p>After each quest, tell it how it felt (too easy, just right, barely made it). Your next quest in that stat adjusts.</p>
      </Section>

      <Section id="loot" title="Drops and gear">
        <p>Quests can drop gear and battle items. Your first few quests drop a starter kit to get you ready for the first boss. After that, each quest has about a {pct(DROP_CHANCE)} chance, and you're guaranteed something after {PITY_AFTER} quests in a row with nothing.</p>
        <p>Gear adds stats. Rare and better gear adds a passive ability (it triggers on its own in battle). Epic and legendary gear adds an active ability you tap during the fight. Rarer gear starts dropping as you beat bosses.</p>
        <p>Gear shows on your hero. Tap your hero in camp to see and change it.</p>
        <p><b>Battle items</b> (potions, scrolls) go in your satchel. You bring up to {SATCHEL_SIZE} into each fight. Each is used up when tapped.</p>
      </Section>

      <Section id="classes" title="Classes">
        <p>You start as an Adventurer: base attacks and battle items. When two stats reach the level a class needs, you can choose it. Switch any time from the equipment screen (tap your hero).</p>
        <p>Each class has a signature passive that changes how fights go (a Warrior gets stronger as they take hits, a Ranger counterattacks when they dodge) and two abilities you tap during boss fights.</p>
        <span class="small-text">
          {corePack.classes.filter((c) => Object.keys(c.requires).length).map((c) => `${c.name}: ${Object.entries(c.requires).map(([s, v]) => `${s} ${v}`).join(' + ')}`).join(' · ')}
        </span>
      </Section>

      <Section id="bosses" title="Bosses">
        <p>A new boss arrives every two weeks. You can challenge it once a day.</p>
        <p>Fights play out automatically, turn by turn. Your stats, gear and class decide how strong you are. You step in by tapping gear abilities and battle items at the right moment.</p>
        <p><b>Weaknesses:</b> each boss is weak to two stats. In that fight, those stats count {WEAKNESS_MULT}×.</p>
        <p><b>Omens:</b> each fight starts with an omen (favorable, uncertain or ominous). It's that fight's luck. Stronger heroes win more often, but no fight is certain either way.</p>
        <p><b>Specials:</b> every few turns a boss uses a big special attack. Stuns can't stop it. Wisdom softens it, and a shield or heal at the right time helps.</p>
      </Section>

      <Section id="season" title="Seasons">
        <p>A season lasts {SEASON_WEEKS} weeks with {corePack.bosses.length} bosses. Seasons and Legacy unlocks that carry over between seasons are coming next.</p>
      </Section>
    </div>
  );
}
