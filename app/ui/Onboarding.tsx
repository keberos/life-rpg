import { useState } from 'preact/hooks';
import { STAT_IDS, type StatId } from '../../src/engine/types.ts';
import { QUESTS, STAT_INFO } from '../content/quests.ts';
import { recordPlacement } from '../state/logic.ts';
import { store } from '../state/store.ts';
import { Win } from './components.tsx';
import { Hero } from './sprites.tsx';

const PLACEMENTS = QUESTS.filter((q) => q.placement);

export function Onboarding() {
  const [step, setStep] = useState(0); // 0 welcome, 1 stats, 2.. placements
  const [enabled, setEnabled] = useState<StatId[]>(store.get().profile.enabledStats);
  const [value, setValue] = useState('');
  const placements = PLACEMENTS.filter((q) => enabled.includes(q.stat));

  const finish = () => {
    // Starter kit: the boss balance assumes common gear, so everyone starts with it.
    const starterGear = ['iron-sword', 'leather-vest', 'prayer-beads'];
    store.log(
      ...starterGear.map((id) => ({ type: 'loot' as const, kind: 'gear' as const, id, source: 'starter' })),
      { type: 'loot', kind: 'item', id: 'potion', source: 'starter' },
      { type: 'loot', kind: 'item', id: 'thunder-scroll', source: 'starter' },
    );
    store.updateProfile({ enabledStats: enabled, onboarded: true });
    location.hash = '#/';
  };

  if (step === 0) {
    return (
      <div class="stack center" style={{ paddingTop: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}><Hero classId="adventurer" scale={10} /></div>
        <h1>Life RPG</h1>
        <p class="muted">When you reach for your phone to scroll, take a quest instead. One or two minutes of real effort makes your hero stronger.</p>
        <button class="btn primary big" onClick={() => setStep(1)}>Begin your adventure</button>
      </div>
    );
  }

  if (step === 1) {
    const toggle = (s: StatId) => setEnabled((e) => (e.includes(s) ? e.filter((x) => x !== s) : [...e, s]));
    return (
      <div class="stack">
        <h2>Choose your paths</h2>
        <p class="muted">Pick the stats you want to train. You can change this later, and skipping one never locks you out of anything.</p>
        {STAT_IDS.map((s) => (
          <button key={s} class={`btn ghost ${enabled.includes(s) ? 'selected' : ''}`} style={{ textAlign: 'left' }} onClick={() => toggle(s)}>
            <span style={{ color: STAT_INFO[s].color }} class="pixel">{STAT_INFO[s].short}</span> {STAT_INFO[s].name}
            <div class="faint">{STAT_INFO[s].blurb}</div>
          </button>
        ))}
        <button class="btn primary big" disabled={enabled.length === 0} onClick={() => setStep(2)}>Next</button>
      </div>
    );
  }

  const idx = step - 2;
  if (idx >= placements.length) {
    return (
      <div class="stack center" style={{ paddingTop: '24px' }}>
        <h2>You're set.</h2>
        <p class="muted">Quests will start near your level and adjust as you go. Mental stats calibrate as you play.</p>
        <button class="btn primary big" onClick={finish}>To camp</button>
      </div>
    );
  }

  const q = placements[idx];
  const next = () => {
    const n = Number(value);
    if (value !== '' && n > 0) recordPlacement(q.stat, q.id, n);
    setValue('');
    setStep(step + 1);
  };
  return (
    <div class="stack">
      <span class="faint">Quick check {idx + 1} of {placements.length}</span>
      <Win>
        <div class="stack">
          <h2 style={{ color: STAT_INFO[q.stat].color }}>{STAT_INFO[q.stat].name}</h2>
          <p>{q.placement!.ask}</p>
          <p class="faint">Guess if you're not sure, or try it now. {q.safety}</p>
          <input type="number" inputMode="numeric" min={0} placeholder={q.placement!.unit} value={value} onInput={(e) => setValue((e.target as HTMLInputElement).value)} />
        </div>
      </Win>
      <button class="btn primary big" onClick={next}>{value ? 'Next' : 'Skip'}</button>
    </div>
  );
}
