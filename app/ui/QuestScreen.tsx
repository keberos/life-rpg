import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Feedback } from '../../src/engine/calibration.ts';
import type { QuestOutcome, RelativeDifficulty } from '../../src/engine/progression.ts';
import { makeRng } from '../../src/engine/rng.ts';
import type { StatId } from '../../src/engine/types.ts';
import { patternQuestions } from '../content/patterns.ts';
import { STAT_INFO, questById, type QuestDef, type QuizQuestion } from '../content/quests.ts';
import { amountFor, completeQuest, howText, suggestQuest, type QuestResult } from '../state/logic.ts';
import { store, useGame } from '../state/store.ts';
import { StatChip, TopBar, Win, go } from './components.tsx';

type Phase = 'brief' | 'run' | 'rate' | 'done';

export function QuestScreen({ stat, questId }: { stat?: StatId; questId?: string }) {
  const g = useGame();
  const enabled = store.get().profile.enabledStats;
  const [quest, setQuest] = useState<QuestDef>(() => (questId && questById(questId)) || suggestQuest(g, enabled, stat));
  const [difficulty, setDifficulty] = useState<RelativeDifficulty>('normal');
  const [phase, setPhase] = useState<Phase>('brief');
  const [outcome, setOutcome] = useState<QuestOutcome>('success');
  const [score, setScore] = useState<string | undefined>();
  const [result, setResult] = useState<QuestResult | null>(null);
  const rating = g.ratings[quest.stat];
  const amount = amountFor(quest, rating, difficulty);

  const finish = (fb: Feedback, out: QuestOutcome = outcome, sc = score) => {
    setResult(completeQuest(g, quest, difficulty, out, fb, amount, sc));
    setPhase('done');
  };
  const ranOut = (out: QuestOutcome) => {
    setOutcome(out);
    if (quest.kind === 'reflection') finish('success', 'success');
    else if (out === 'fail') finish('fail', 'fail');
    else setPhase('rate');
  };

  const swap = () => setQuest(suggestQuest(g, enabled, stat, quest.id));
  const info = STAT_INFO[quest.stat];

  return (
    <div class="stack">
      <TopBar onBack={() => go('#/')} title={info.name} />

      {phase === 'brief' && (
        <>
          <Win>
            <div class="stack">
              <div class="row between"><h2>{quest.title}</h2><StatChip stat={quest.stat} /></div>
              {amount !== undefined && (
                <div class="center"><div class="big-number" style={{ color: info.color }}>{amount}</div><div class="muted">{quest.unit}</div></div>
              )}
              <p>{howText(quest, amount)}</p>
              {quest.safety && <p class="faint">{quest.safety}</p>}
              {quest.source && <p class="faint">{quest.source}</p>}
            </div>
          </Win>
          {quest.curve && (
            <div class="row" style={{ gap: '6px' }}>
              {(['easy', 'normal', 'hard'] as const).map((d) => (
                <button key={d} class={`btn ghost small grow ${difficulty === d ? 'selected' : ''}`} onClick={() => setDifficulty(d)}>
                  {d === 'easy' ? 'Easier' : d === 'normal' ? 'Just right' : 'Push me'}
                </button>
              ))}
            </div>
          )}
          <button class="btn primary big" onClick={() => setPhase('run')}>Begin</button>
          <button class="btn ghost" onClick={swap}>Different quest</button>
        </>
      )}

      {phase === 'run' && <Runner quest={quest} amount={amount} rating={rating} onDone={ranOut} onScore={setScore} />}

      {phase === 'rate' && (
        <Win>
          <div class="stack center">
            <h2>Nice work.</h2>
            <p class="muted">How did that feel? This tunes your next {info.short} quest.</p>
            <button class="btn" onClick={() => finish('tooEasy')}>Too easy</button>
            <button class="btn good" onClick={() => finish('success')}>Just right</button>
            <button class="btn" onClick={() => finish('tooHard')}>Barely made it</button>
          </div>
        </Win>
      )}

      {phase === 'done' && result && (
        <Win>
          <div class="stack center">
            <div class="big-number pop" style={{ color: info.color }}>+{result.xp} XP</div>
            <p class="muted">{info.name}{g.daysSinceTrained[quest.stat] >= 1 ? ' (rested bonus)' : ''}</p>
            {result.leveledUp && <h2 class="pop">{info.short} level {result.newLevel}!</h2>}
            {outcome === 'fail' && <p class="muted">Effort still counts. The next one will be a little gentler.</p>}
            {result.drop && <p class="pop">Found: <b>{result.drop}</b></p>}
            <button class="btn primary" onClick={() => { setQuest(suggestQuest(store.state(), enabled, undefined, quest.id)); setDifficulty('normal'); setResult(null); setScore(undefined); setPhase('brief'); }}>Another quest</button>
            <button class="btn ghost" onClick={() => go('#/')}>Back to camp</button>
          </div>
        </Win>
      )}
    </div>
  );
}

function Runner({ quest, amount, rating, onDone, onScore }: { quest: QuestDef; amount?: number; rating: number; onDone: (o: QuestOutcome) => void; onScore: (s: string) => void }) {
  switch (quest.kind) {
    case 'reps':
      return <RepsRunner amount={amount ?? 0} unit={quest.unit ?? 'reps'} onDone={onDone} />;
    case 'timer':
      return <TimerRunner seconds={amount ?? 60} onDone={onDone} />;
    case 'breath':
      return <BreathRunner cycles={amount ?? 3} onDone={onDone} />;
    case 'quiz':
    case 'pattern':
      return <QuizRunner quest={quest} rating={rating} onDone={onDone} onScore={onScore} />;
    case 'reflection':
      return <ReflectionRunner quest={quest} onDone={onDone} />;
  }
}

function RepsRunner({ amount, unit, onDone }: { amount: number; unit: string; onDone: (o: QuestOutcome) => void }) {
  return (
    <Win>
      <div class="stack center">
        <div class="big-number">{amount}</div>
        <p class="muted">{unit}. Take your time; tap when you finish.</p>
        <button class="btn good big" onClick={() => onDone('success')}>Done</button>
        <button class="btn ghost" onClick={() => onDone('fail')}>Couldn't finish this time</button>
      </div>
    </Win>
  );
}

function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const gain = ctx.createGain();
    o.frequency.value = 880;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.connect(gain).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.6);
  } catch { /* audio unavailable */ }
}

/** Keep the screen on while a timed quest runs (where supported). */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    let lock: { release: () => Promise<void> } | undefined;
    (navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock
      ?.request('screen').then((l) => (lock = l)).catch(() => {});
    return () => void lock?.release().catch(() => {});
  }, [active]);
}

function TimerRunner({ seconds, onDone }: { seconds: number; onDone: (o: QuestOutcome) => void }) {
  const [endAt, setEndAt] = useState<number | null>(null);
  const [left, setLeft] = useState(seconds);
  useWakeLock(endAt !== null);
  useEffect(() => {
    if (endAt === null) return;
    // Wall-clock based, so it stays accurate if the phone throttles the page.
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((endAt - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) {
        clearInterval(id);
        beep();
        onDone('success');
      }
    }, 200);
    return () => clearInterval(id);
  }, [endAt]);
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');
  return (
    <Win>
      <div class="stack center">
        <div class="big-number">{mm}:{ss}</div>
        {endAt === null ? (
          <button class="btn primary big" onClick={() => setEndAt(Date.now() + seconds * 1000)}>Start timer</button>
        ) : (
          <>
            <p class="muted">Hold steady. You've got this.</p>
            <button class="btn ghost" onClick={() => onDone('fail')}>Stop early</button>
          </>
        )}
      </div>
    </Win>
  );
}

const BREATH_PHASES = ['Breathe in', 'Hold', 'Breathe out', 'Hold'];
const CORNERS = [[0, 100], [0, 0], [100, 0], [100, 100]]; // dot travels around the box

function BreathRunner({ cycles, onDone }: { cycles: number; onDone: (o: QuestOutcome) => void }) {
  const [step, setStep] = useState(-1); // -1 = not started
  useWakeLock(step >= 0);
  useEffect(() => {
    if (step < 0) return;
    if (step >= cycles * 4) {
      beep();
      onDone('success');
      return;
    }
    const id = setTimeout(() => setStep((s) => s + 1), 4000);
    return () => clearTimeout(id);
  }, [step]);
  const corner = CORNERS[(Math.max(step, 0) + 1) % 4];
  return (
    <Win>
      <div class="stack center">
        <div class="breath-box">
          <div class="breath-dot" style={{ left: `${step < 0 ? 0 : corner[0]}%`, top: `${step < 0 ? 100 : corner[1]}%` }} />
        </div>
        {step < 0 ? (
          <button class="btn primary big" onClick={() => setStep(0)}>Start</button>
        ) : (
          <>
            <h2>{BREATH_PHASES[step % 4]}</h2>
            <p class="muted">Cycle {Math.min(cycles, Math.floor(step / 4) + 1)} of {cycles}</p>
            <button class="btn ghost" onClick={() => onDone('fail')}>Stop early</button>
          </>
        )}
      </div>
    </Win>
  );
}

function QuizRunner({ quest, rating, onDone, onScore }: { quest: QuestDef; rating: number; onDone: (o: QuestOutcome) => void; onScore: (s: string) => void }) {
  const questions = useMemo<QuizQuestion[]>(() => {
    const rng = makeRng(Date.now() >>> 0);
    if (quest.kind === 'pattern') return patternQuestions(rating, rng);
    const tier = rating < 8 ? 1 : rating < 16 ? 2 : 3;
    const pool = (quest.questions ?? []).filter((q) => q.tier <= tier);
    return pool.length ? pool : quest.questions ?? [];
  }, [quest.id]);
  const [reading, setReading] = useState(!!quest.passage);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const right = useRef(0);

  if (reading) {
    return (
      <Win>
        <div class="stack">
          <p style={{ fontSize: '17px', lineHeight: 1.6 }}>{quest.passage}</p>
          {quest.source && <p class="faint">{quest.source}</p>}
          <button class="btn primary" onClick={() => setReading(false)}>I'm ready</button>
        </div>
      </Win>
    );
  }
  const q = questions[i];
  const choose = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    if (k === q.answer) right.current++;
  };
  const next = () => {
    if (i + 1 < questions.length) {
      setI(i + 1);
      setPicked(null);
      return;
    }
    const sc = `${right.current}/${questions.length}`;
    onScore(sc);
    onDone(right.current >= Math.ceil((questions.length * 2) / 3) ? 'success' : 'fail');
  };
  return (
    <Win>
      <div class="stack">
        <span class="faint">Question {i + 1} of {questions.length}</span>
        <h3 style={{ fontFamily: quest.kind === 'pattern' ? 'var(--pixel)' : 'inherit', fontSize: quest.kind === 'pattern' ? '24px' : '18px' }}>{q.q}</h3>
        {q.options.map((o, k) => (
          <button key={k} class={`btn option ${picked !== null && k === q.answer ? 'right' : ''} ${picked === k && k !== q.answer ? 'wrong shake' : ''}`} onClick={() => choose(k)}>
            {o}
          </button>
        ))}
        {picked !== null && (
          <>
            {q.why && <p class="muted">{q.why}</p>}
            <button class="btn primary" onClick={next}>{i + 1 < questions.length ? 'Next' : 'Finish'}</button>
          </>
        )}
      </div>
    </Win>
  );
}

function ReflectionRunner({ quest, onDone }: { quest: QuestDef; onDone: (o: QuestOutcome) => void }) {
  // Notes stay on this screen only; they are never saved or sent anywhere.
  return (
    <Win>
      <div class="stack">
        <p style={{ fontSize: '17px', lineHeight: 1.6 }}>{quest.prompt}</p>
        {quest.source && <p class="faint">{quest.source}</p>}
        <textarea placeholder="Optional: jot a few words (not saved)" />
        <button class="btn good big" onClick={() => onDone('success')}>Done reflecting</button>
      </div>
    </Win>
  );
}
