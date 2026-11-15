// Playtest tools: jot a note in the moment, and a report that summarizes the
// playtest (play rhythm, the scroll catcher, check-ins, notes) as text to copy.
// Everything stays on the phone until you choose to copy it.
import { useState } from 'preact/hooks';
import { questById } from '../content/quests.ts';
import { DAY, dayKeyOf, type LogEvent } from '../state/model.ts';
import { store } from '../state/store.ts';
import { TopBar, Win, go } from './components.tsx';

/** A small "Jot a note" button that opens a one-line note box. */
export function JotNote({ where }: { where: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  if (saved) return <p class="faint center" style={{ margin: 0 }}>Note saved. Thanks!</p>;
  if (!open) return <button class="btn ghost small" onClick={() => setOpen(true)}>Jot a playtest note</button>;
  const save = () => {
    if (!text.trim()) return setOpen(false);
    store.log({ type: 'note', text: text.trim(), where });
    setSaved(true);
  };
  return (
    <div class="stack" style={{ gap: '6px' }}>
      <textarea placeholder="What felt good, boring, confusing or too hard?" value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} />
      <div class="row">
        <button class="btn primary grow" onClick={save}>Save note</button>
        <button class="btn ghost" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}

/** Plain-text playtest summary from the event log. */
export function playtestReport(events: LogEvent[], now = Date.now()): string {
  const quests = events.filter((e): e is Extract<LogEvent, { type: 'quest' }> => e.type === 'quest');
  const days = new Set(quests.map((q) => dayKeyOf(q.at)));
  const first = events[0]?.at ?? now;
  const span = Math.max(1, Math.ceil((now - first) / DAY));
  const intercepts = events.filter((e): e is Extract<LogEvent, { type: 'intercept' }> => e.type === 'intercept');
  const took = intercepts.filter((e) => e.accepted).length;
  const checkins = events.filter((e): e is Extract<LogEvent, { type: 'checkin' }> => e.type === 'checkin');
  const avgFun = checkins.length ? (checkins.reduce((n, c) => n + c.fun, 0) / checkins.length).toFixed(1) : '-';
  const worth = checkins.length ? Math.round((100 * checkins.filter((c) => c.worthIt).length) / checkins.length) : 0;
  const fights = events.filter((e): e is Extract<LogEvent, { type: 'boss' }> => e.type === 'boss');
  const byStat: Record<string, number> = {};
  for (const q of quests) byStat[q.stat] = (byStat[q.stat] ?? 0) + 1;
  const tooHard = quests.filter((q) => q.feedback === 'tooHard' || q.feedback === 'fail').length;
  const tooEasy = quests.filter((q) => q.feedback === 'tooEasy').length;
  const date = (t: number) => new Date(t).toISOString().slice(0, 16).replace('T', ' ');
  const lines = [
    `Life RPG playtest report (${date(now)})`,
    ``,
    `Played on ${days.size} of ${span} days; ${quests.length} quests (${(quests.length / Math.max(1, days.size)).toFixed(1)} per play day).`,
    `By stat: ${Object.entries(byStat).map(([s, n]) => `${s} ${n}`).join(', ') || 'none'}.`,
    `Felt too hard or failed: ${tooHard}; too easy: ${tooEasy}.`,
    `Scroll catcher: ${intercepts.length} catches, took the quest ${took} times${intercepts.length ? ` (${Math.round((100 * took) / intercepts.length)}%)` : ''}.`,
    `Boss fights: ${fights.length} (${fights.filter((f) => f.win).length} won).`,
    `Check-ins: ${checkins.length}; average fun ${avgFun}/5; worth it vs scrolling ${worth}%.`,
    ``,
    `Notes:`,
  ];
  const notes = events
    .filter((e) => e.type === 'note' || (e.type === 'checkin' && e.note))
    .map((e) => (e.type === 'note' ? `- ${date(e.at)} [${e.where}] ${e.text}` : e.type === 'checkin' ? `- ${date(e.at)} [check-in, fun ${e.fun}/5] ${e.note}` : ''));
  lines.push(...(notes.length ? notes : ['- none yet']));
  const last = quests.slice(-5).map((q) => `${questById(q.questId)?.title ?? q.questId} (${q.feedback})`);
  if (last.length) lines.push('', `Last quests: ${last.join('; ')}.`);
  return lines.join('\n');
}

export function PlaytestReport() {
  const text = playtestReport(store.get().events, store.state().now); // game clock (debug time travel shifts it)
  const [msg, setMsg] = useState('');
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg('Copied. Paste it into a message.');
    } catch {
      setMsg('Copy failed: select the text below and copy it.');
    }
  };
  return (
    <div class="stack">
      <TopBar onBack={() => go('#/menu')} title="Playtest report" />
      <p class="muted prose">A summary of how play is going, plus every note you've jotted. It stays on this phone until you copy it.</p>
      <button class="btn primary" onClick={copy}>Copy report</button>
      {msg && <p class="faint center">{msg}</p>}
      <Win quiet>
        <pre class="ff-report" style={{ whiteSpace: 'pre-wrap', fontSize: '13px' }}>{text}</pre>
      </Win>
      <JotNote where="report" />
    </div>
  );
}
