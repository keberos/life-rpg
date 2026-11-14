import { useState } from 'preact/hooks';
import type { ExerciseGuide as Guide } from '../content/quests.ts';

/** Two-frame looping picture of the exercise, drawn by our art kit (public/exercises). */
export function ExerciseArt({ guide, size = 240 }: { guide: Guide; size?: number }) {
  if (!guide.art) return null;
  return (
    <div class={`exercise-stage ${guide.wall ? 'wall' : ''}`} style={{ width: `${size}px`, height: `${size}px` }}>
      <div
        class="exercise-art sprite"
        role="img"
        aria-label="How the exercise looks"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          backgroundImage: `url(./exercises/${guide.art}.png)`,
          backgroundSize: `${size * 2}px ${size}px`,
          '--shift': `-${size}px`,
        }}
      />
    </div>
  );
}

/** Picture plus step-by-step form. Steps start open the first time (or when asked). */
export function ExerciseGuideView({ guide, open: startOpen = false }: { guide: Guide; open?: boolean }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div class="stack" style={{ gap: '8px', alignItems: 'center' }}>
      <ExerciseArt guide={guide} />
      <button class="btn ghost small" onClick={() => setOpen(!open)}>{open ? 'Hide how-to' : 'How to do it'}</button>
      {open && (
        <div class="stack" style={{ gap: '6px', alignSelf: 'stretch' }}>
          <ol class="steps">
            {guide.steps.map((s, i) => <li key={i}>{s}</li>)}
          </ol>
          {guide.easier && <p class="small-text"><b>Easier version:</b> {guide.easier}</p>}
        </div>
      )}
    </div>
  );
}
