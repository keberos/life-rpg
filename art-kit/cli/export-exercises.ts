// Pre-renders exercise guide sprites for the app: one 2-frame strip per exercise.
// Writes public/exercises/<id>.png. Usage: npm run exercises
import { mkdirSync, writeFileSync } from 'node:fs';
import { EXERCISE_POSES } from '../src/exercises.ts';
import { LOOKS } from '../src/looks.ts';
import { encodePng, sheet } from '../src/png.ts';
import { renderLook } from '../src/render.ts';

const look = { ...LOOKS.find((l) => l.name.startsWith('Commoner'))!, iris: 'irisBrown' };
const out = 'public/exercises';
mkdirSync(out, { recursive: true });
for (const [id, ex] of Object.entries(EXERCISE_POSES)) {
  const frames = ex.frames.map((pose) => renderLook(look, { dir: ex.dir, pose, quality: 'hd', style: 'jrpg' }));
  writeFileSync(`${out}/${id}.png`, encodePng(sheet([frames], 1, [0, 0, 0, 0], 0)));
  console.log(id);
}
