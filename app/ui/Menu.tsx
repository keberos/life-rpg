import { useState } from 'preact/hooks';
import { corePack } from '../../src/content/core-pack.ts';
import { STAT_IDS } from '../../src/engine/types.ts';
import { grantStarterKit } from '../state/logic.ts';
import { DAY, SEASON_WEEKS } from '../state/model.ts';
import { store, useGame } from '../state/store.ts';
import { TopBar, Win, go } from './components.tsx';
import { Icon } from './icons.tsx';

export function Menu() {
  const g = useGame();
  const mastered = g.lifetime.masteredClasses.map((id) => corePack.classes.find((c) => c.id === id)?.name ?? id);
  return (
    <div class="stack">
      <TopBar title="Menu" />
      <div class="tiles">
        <button class="btn ghost tile" onClick={() => go('#/checkin')}><Icon name="flag" size={28} />Daily check-in</button>
        <button class="btn ghost tile" onClick={() => go('#/shortcut')}><Icon name="sword" size={28} />Scroll catcher</button>
        <button class="btn ghost tile" onClick={() => go('#/help')}><Icon name="guide" size={28} />Guide</button>
        <button class="btn ghost tile" onClick={() => go('#/save')}><Icon name="bag" size={28} />Backup</button>
      </div>
      <Win quiet title="Hero record">
        <div class="record">
          <span>Season {g.season.number} quests</span><b>{g.questsTotal}</b>
          <span>Lifetime quests</span><b>{g.lifetime.questsTotal}</b>
          <span>Bosses beaten</span><b>{g.lifetime.bossesBeaten}</b>
          <span>Seasons finished</span><b>{g.lifetime.seasonsCompleted}</b>
          <span>Scroll urges turned into quests</span><b>{g.interceptsAccepted}</b>
          <span>Urges skipped</span><b>{g.interceptsSkipped}</b>
          {mastered.length > 0 && <><span>Classes mastered</span><b>{mastered.join(', ')}</b></>}
        </div>
      </Win>
      <button class="btn ghost small" onClick={() => go('#/debug')}>Debug panel</button>
    </div>
  );
}

export function CheckIn() {
  const [fun, setFun] = useState(0);
  const [worth, setWorth] = useState<boolean | null>(null);
  const [note, setNote] = useState('');
  const save = () => {
    store.log({ type: 'checkin', fun, worthIt: !!worth, note: note.trim() || undefined });
    go('#/');
  };
  return (
    <div class="stack">
      <TopBar onBack={() => go('#/')} title="Check-in" />
      <Win>
        <div class="stack">
          <h3>How fun was today?</h3>
          <div class="row">{[1, 2, 3, 4, 5].map((n) => <button key={n} class={`btn grow ${fun === n ? 'selected' : ''}`} onClick={() => setFun(n)}>{n}</button>)}</div>
          <h3>Was it worth it compared to scrolling?</h3>
          <div class="row">
            <button class={`btn grow good ${worth === true ? 'selected' : ''}`} onClick={() => setWorth(true)}>Yes</button>
            <button class={`btn grow ${worth === false ? 'selected' : ''}`} onClick={() => setWorth(false)}>Not really</button>
          </div>
          <textarea placeholder="Anything to change? (optional, stays on this phone)" value={note} onInput={(e) => setNote((e.target as HTMLTextAreaElement).value)} />
          <button class="btn primary" disabled={!fun || worth === null} onClick={save}>Save</button>
        </div>
      </Win>
    </div>
  );
}

export function ShortcutGuide() {
  const url = `${location.origin}${location.pathname}#/intercept`;
  return (
    <div class="stack">
      <TopBar onBack={() => go('#/menu')} title="Scroll catcher" />
      <Win>
        <div class="stack">
          <p>When you open Reddit or Instagram, your iPhone can open a quest first.</p>
          <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <li>Open the <b>Shortcuts</b> app, then the <b>Automation</b> tab.</li>
            <li>Tap <b>+</b>, choose <b>App</b>, pick Reddit (and any others), select <b>Is Opened</b>, and set it to <b>Run Immediately</b>.</li>
            <li>Add the action <b>Open URLs</b> with the link below.</li>
          </ol>
          <input type="text" readOnly value={url} onFocus={(e) => (e.target as HTMLInputElement).select()} />
          <p class="faint">No setup? Put this app in your dock where Reddit used to be, and move Reddit to a later page.</p>
        </div>
      </Win>
    </div>
  );
}

export function Intercept() {
  const choose = (accepted: boolean) => {
    store.log({ type: 'intercept', accepted });
    go(accepted ? '#/quest' : '#/skipped');
  };
  return (
    <div class="stack center" style={{ paddingTop: '32px' }}>
      <h1>Quest instead?</h1>
      <p class="muted">Two minutes, and your hero gets stronger.</p>
      <button class="btn primary big" onClick={() => choose(true)}>Take a quest</button>
      <button class="btn ghost" onClick={() => choose(false)}>Not now, continue</button>
    </div>
  );
}

export function Skipped() {
  return (
    <div class="stack center" style={{ paddingTop: '32px' }}>
      <h2>No problem.</h2>
      <p class="muted">Swipe back to your app. Your quests will be here when you want them.</p>
      <button class="btn ghost" onClick={() => go('#/')}>Actually, show me camp</button>
    </div>
  );
}

export function SaveScreen() {
  const [msg, setMsg] = useState('');
  const download = () => {
    const blob = new Blob([store.exportJson()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `life-rpg-save-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const restore = async (file: File | undefined) => {
    if (!file) return;
    try {
      store.importJson(await file.text());
      setMsg('Restored.');
    } catch (e) {
      setMsg(`Couldn't restore: ${(e as Error).message}`);
    }
  };
  return (
    <div class="stack">
      <TopBar onBack={() => go('#/menu')} title="Backup" />
      <p class="muted">Your progress lives only on this phone. Save a backup file now and then.</p>
      <button class="btn" onClick={download}>Save backup file</button>
      <label class="btn ghost center">
        Restore from file
        <input type="file" accept="application/json" style={{ display: 'none' }} onChange={(e) => restore((e.target as HTMLInputElement).files?.[0])} />
      </label>
      {msg && <p class="muted center">{msg}</p>}
    </div>
  );
}

export function Debug() {
  const g = useGame();
  const [confirm, setConfirm] = useState(false);
  return (
    <div class="stack">
      <TopBar onBack={() => go('#/menu')} title="Debug" />
      <p class="faint">Day {g.dayKey} · week {g.week} · {store.get().events.length} events</p>
      <div class="row wrap">
        <button class="btn small" onClick={() => store.log({ type: 'debugTime', days: 1 })}>+1 day</button>
        <button class="btn small" onClick={() => store.log({ type: 'debugTime', days: 7 })}>+1 week</button>
        <button class="btn small" onClick={() => store.log({ type: 'debugTime', days: Math.max(1, Math.ceil((g.season.start + SEASON_WEEKS * 7 * DAY - g.now) / DAY)) })}>To season end</button>
        <button class="btn small" onClick={() => store.log(...STAT_IDS.map((stat) => ({ type: 'debugXp' as const, stat, xp: 150 })))}>+150 XP all</button>
        <button class="btn small" onClick={() => store.log(...corePack.battleItems.map((i) => ({ type: 'loot' as const, kind: 'item' as const, id: i.id, source: 'debug' })))}>+1 each item</button>
        <button class="btn small" onClick={() => store.log(...corePack.gear.map((x) => ({ type: 'loot' as const, kind: 'gear' as const, id: x.id, source: 'debug' })))}>All gear</button>
      </div>
      <Win quiet>
        <div class="stack" style={{ gap: '4px' }}>
          {STAT_IDS.map((s) => (
            <span key={s} class="faint">{s}: lv {g.levels[s]} · {g.xp[s]} xp · rating {g.ratings[s].toFixed(1)} · {g.daysSinceTrained[s]}d since</span>
          ))}
        </div>
      </Win>
      {confirm ? (
        <div class="row">
          <button class="btn bad grow" onClick={() => { store.reset(); grantStarterKit(); go('#/'); }}>Erase everything</button>
          <button class="btn ghost" onClick={() => setConfirm(false)}>Cancel</button>
        </div>
      ) : (
        <button class="btn ghost" onClick={() => setConfirm(true)}>Reset save…</button>
      )}
    </div>
  );
}
