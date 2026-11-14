// Contact sheet of every exercise pose, for checking them by eye.
// Usage: node art-kit/cli/exercises-preview.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { EXERCISE_POSES } from '../src/exercises.ts';
import { LOOKS } from '../src/looks.ts';
import { encodePng, sheet } from '../src/png.ts';
import { renderLook } from '../src/render.ts';

const look = { ...LOOKS.find((l) => l.name.startsWith('Commoner'))!, iris: 'irisBrown' };
const only = process.argv[2]?.split(',');
const rows = Object.entries(EXERCISE_POSES)
  .filter(([id]) => !only || only.includes(id))
  .map(([, ex]) => ex.frames.map((pose) => renderLook(look, { dir: ex.dir, pose, quality: 'hd', style: 'jrpg' })));
mkdirSync('art-kit/out', { recursive: true });
writeFileSync('art-kit/out/exercises.png', encodePng(sheet(rows, 3, [34, 38, 52, 255], 1)));
console.log('art-kit/out/exercises.png');
