import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Feedback } from '../../src/engine/calibration.ts';
import type { QuestOutcome, RelativeDifficulty } from '../../src/engine/progression.ts';
import { makeRng } from '../../src/engine/rng.ts';
import type { StatId } from '../../src/engine/types.ts';
import { patternQuestions } from '../content/patterns.ts';
import { STAT_INFO, questById, shuffleOptions, type QuestDef, type QuizQuestion } from '../content/quests.ts';
import { amountFor, calibrationHowText, canCalibrate, completeQuest, howText, recordPlacement, suggestQuest, type QuestResult } from '../state/logic.ts';
import { store, useGame } from '../state/store.ts';
import { StatChip, TopBar, Win, go } from './components.tsx';
import { ExerciseArt, ExerciseGuideView } from './ExerciseGuide.tsx';

type Phase = 'brief' | 'run' | 'rate' | 'done';

export function QuestScreen({ stat, questId }: { stat?: StatId; questId?: string }) {
  const g = useGame();
  const enabled = store.get().profile.enabledStats;
  const [quest, setQuestRaw] = useState<QuestDef>(() => (questId && questById(questId)) || suggestQuest(g, enabled, stat));
  // The first measurable quest in a stat is a calibration run: measure, don't prescribe.
  const calibFor = (q: QuestDef) => canCalibrate(q) && !store.state().calibrated[q.stat];
  const [calibrating, setCalibrating] = useState(() => calibFor(quest));
  const [calibNote, setCalibNote] = useState<string | null>(null);
  const setQuest = (q: QuestDef) => {
    setQuestRaw(q);
    setCalibrating(calibFor(q));
    setCalibNote(null);
  };
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

  const finishCalibration = (value: number) => {
    const prev = store.get().events.findLast((e) => e.type === 'placement' && e.questId === quest.id);
    const before = prev?.type === 'placement' ? prev.value : undefined;
    const rating = recordPlacement(quest.stat, quest.id, value);
    setOutcome('success');
    setResult(completeQuest(g, quest, 'normal', 'success', 'success', value, undefined, rating));
    const next = rating === undefined ? undefined : amountFor(quest, rating, 'normal');
    const recheck =
      before === undefined ? ''
      : value > before ? `Recheck: ${before} → ${value} ${quest.unit}. That's real progress since last season! `
      : `Recheck: ${value} ${quest.unit} (last season ${before}). `;
    setCalibNote(next === undefined ? null : `${recheck}Calibrated. Your ${quest.title.toLowerCase()} quests will start at ${next} ${quest.unit}.`);
    setPhase('done');
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
              {quest.guide && <ExerciseGuideView key={quest.id} guide={quest.guide} open={calibrating} />}
              {calibrating && (
                <>
                  <p>{calibrationHowText(quest)}</p>
                  <p class="muted">
                    <b>First {info.name.toLowerCase()} quest: quick check.</b>{' '}
                    {quest.kind === 'reps' ? 'Count your reps, then enter how many.' : 'After Begin you get 5 seconds to get in position. Tap Stop when you are done.'}
                    {' '}This sets the starting level for future {info.name.toLowerCase()} quests.
                  </p>
                </>
              )}
              {!calibrating && amount !== undefined && (
                <div class="center"><div class="big-number" style={{ color: info.color }}>{amount}</div><div class="muted">{quest.unit}</div></div>
              )}
              {!calibrating && <p>{howText(quest, amount)}</p>}
              {quest.safety && <p class="faint">{quest.safety}</p>}
              {quest.source && <p class="faint">{quest.source}</p>}
            </div>
          </Win>
          {quest.curve && !calibrating && (
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

      {phase === 'run' && quest.guide && <div class="center" style={{ display: 'flex', justifyContent: 'center' }}><ExerciseArt guide={quest.guide} size={144} /></div>}
      {phase === 'run' && calibrating && quest.kind === 'reps' && <CalibrateReps unit={quest.unit ?? 'reps'} onDone={finishCalibration} />}
      {phase === 'run' && calibrating && quest.kind === 'timer' && <CalibrateHold onDone={finishCalibration} />}
      {phase === 'run' && !calibrating && <Runner quest={quest} amount={amount} rating={rating} onDone={ranOut} onScore={setScore} />}

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
            {result.themeXp > 0 && <p class="faint">Includes +{result.themeXp} from the {g.season.theme?.name}</p>}
            {result.leveledUp && <h2 class="pop">{info.short} level {result.newLevel}!</h2>}
            {result.leveledUp && g.newClasses.length > 0 && (
              <button class="btn class-banner pop" onClick={() => go('#/gear')}>
                <span class="pixel">Class unlocked: {g.newClasses.map((c) => c.name).join(', ')}!</span>
                <span class="small-text">See its abilities ›</span>
              </button>
            )}
            {result.leveledUp && g.season.goal?.kind === 'class' && g.newClasses.some((c) => c.id === g.season.goal!.id) && (
              <p class="pop"><b>Season goal reached!</b></p>
            )}
            {score && <p>{score.replace('/', ' of ')} right</p>}
            {calibNote && <p>{calibNote}</p>}
            {outcome === 'fail' && <p class="muted">Effort still counts. The next one will be a little gentler.</p>}
            {result.drop && (
              <div class={`drop pop rarity-${result.drop.rarity ?? 'item'}`}>
                <span class="faint">{result.drop.kind === 'gear' ? 'New gear' : 'Found'}</span>
                <b>{result.drop.name}</b>
                {result.drop.rarity && <span class="faint">{result.drop.rarity}{result.drop.kind === 'gear' ? ' · equipped' : ''}</span>}
                {result.drop.tip && <p class="muted">{result.drop.tip}</p>}
              </div>
            )}
            <button class="btn primary" onClick={() => { setQuest(suggestQuest(store.state(), enabled, undefined, quest.id)); setDifficulty('normal'); setResult(null); setScore(undefined); setPhase('brief'); }}>Another quest</button>
            <button class="btn ghost" onClick={() => go('#/')}>Back to camp</button>
          </div>
        </Win>
      )}
    </div>
  );
}

/** Calibration: count your max reps. */
function CalibrateReps({ unit, onDone }: { unit: string; onDone: (n: number) => void }) {
  const [n, setN] = useState(0);
  return (
    <Win>
      <div class="stack center">
        <p class="muted">Go! Count as you do them, then set the number.</p>
        <div class="row" style={{ justifyContent: 'center', gap: '16px' }}>
          <button class="btn big" style={{ width: '72px' }} onClick={() => setN((x) => Math.max(0, x - 1))} aria-label="One less">−</button>
          <div class="big-number" style={{ minWidth: '96px' }}>{n}</div>
          <button class="btn big" style={{ width: '72px' }} onClick={() => setN((x) => x + 1)} aria-label="One more">+</button>
        </div>
        <div class="row" style={{ justifyContent: 'center', gap: '8px' }}>
          {[5, 10].map((k) => <button key={k} class="btn ghost small" onClick={() => setN((x) => x + k)}>+{k}</button>)}
        </div>
        <p class="muted">{unit}</p>
        <button class="btn good big" disabled={n < 1} onClick={() => onDone(n)}>Done</button>
      </div>
    </Win>
  );
}

/** Calibration: stopwatch for your longest comfortable hold. */
function CalibrateHold({ onDone }: { onDone: (seconds: number) => void }) {
  const [start, setStart] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [ready, setReady] = useState(false);
  useWakeLock(true);
  useEffect(() => {
    if (start === null) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [start]);
  const secs = start === null ? 0 : Math.floor((now - start) / 1000);
  if (!ready) return <GetReady onGo={() => { setReady(true); setStart(Date.now()); setNow(Date.now()); }} />;
  return (
    <Win>
      <div class="stack center">
        <div class="big-number">{Math.floor(secs / 60)}:{String(secs % 60).padStart(2, '0')}</div>
        {start === null ? null : (
          <>
            <p class="muted">Keep going as long as you comfortably can.</p>
            <button class="btn good big" onClick={() => { beep(); onDone(Math.max(1, secs)); }}>Stop</button>
          </>
        )}
      </div>
    </Win>
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

function beep(freq = 880, length = 0.6) {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const gain = ctx.createGain();
    o.frequency.value = freq;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + length);
    o.connect(gain).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + length);
  } catch { /* audio unavailable */ }
}

const SETUP_SECONDS = 5;

/** A short countdown so you can put the phone down and get into position. Ticks each second, beeps on go. */
function GetReady({ onGo }: { onGo: () => void }) {
  const [goAt, setGoAt] = useState(() => Date.now() + SETUP_SECONDS * 1000);
  const [left, setLeft] = useState(SETUP_SECONDS);
  useEffect(() => {
    let last = SETUP_SECONDS;
    const id = setInterval(() => {
      const l = Math.max(0, Math.ceil((goAt - Date.now()) / 1000));
      if (l !== last) {
        last = l;
        setLeft(l);
        if (l > 0) beep(520, 0.12);
      }
      if (l === 0) {
        clearInterval(id);
        beep(880, 0.4);
        onGo();
      }
    }, 100);
    return () => clearInterval(id);
  }, [goAt]);
  return (
    <Win>
      <div class="stack center">
        <p class="muted">Get in position</p>
        <div class="big-number pop" key={left}>{left}</div>
        <div class="row" style={{ gap: '6px', justifyContent: 'center' }}>
          <button class="btn ghost small" onClick={() => setGoAt((t) => t + 5000)}>+5 seconds</button>
          <button class="btn ghost small" onClick={onGo}>I'm ready</button>
        </div>
      </div>
    </Win>
  );
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
  useWakeLock(true);
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
  if (endAt === null) return <GetReady onGo={() => setEndAt(Date.now() + seconds * 1000)} />;
  return (
    <Win>
      <div class="stack center">
        <div class="big-number">{mm}:{ss}</div>
        {endAt === null ? null : (
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
    if (quest.kind === 'pattern') return patternQuestions(rating, rng).map((q) => shuffleOptions(q, rng));
    const tier = rating < 8 ? 1 : rating < 16 ? 2 : 3;
    const pool = (quest.questions ?? []).filter((q) => q.tier <= tier);
    return (pool.length ? pool : quest.questions ?? []).map((q) => shuffleOptions(q, rng));
  }, [quest.id]);
  const [reading, setReading] = useState(!!quest.passage);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const right = useRef(0);

  if (reading) {
    return (
      <Win>
        <div class="stack">
          <p class="passage">{quest.passage}</p>
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
        {quest.passage && (
          <>
            <p class="passage">{quest.passage}</p>
            {quest.source && <p class="faint">{quest.source}</p>}
          </>
        )}
        <p style={{ fontSize: '17px', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{quest.prompt}</p>
        {!quest.passage && quest.source && <p class="faint">{quest.source}</p>}
        <textarea placeholder="Optional: jot a few words (not saved)" />
        <button class="btn good big" onClick={() => onDone('success')}>Done reflecting</button>
      </div>
    </Win>
  );
}
