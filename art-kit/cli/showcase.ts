// Renders every look in 4 directions plus walk frames into one PNG.
// Usage: node art-kit/cli/showcase.ts [scale]
import { mkdirSync, writeFileSync } from 'node:fs';
import { LOOKS } from '../src/looks.ts';
import { encodePng, sheet } from '../src/png.ts';
import { renderLook, type Dir } from '../src/render.ts';

const scale = Number(process.argv[2] ?? 4);
const only = process.argv[3]?.split(','); // optional: comma-separated look indexes
const dirs: Dir[] = ['down', 'right', 'up', 'left'];
const t0 = Date.now();
const picked = only ? only.map((i) => LOOKS[Number(i)]) : LOOKS;
const rows = picked.map((look) => [
  ...dirs.map((dir) => renderLook(look, { dir })),
  renderLook(look, { dir: 'down', anim: 'walk', frame: 1 }),
  renderLook(look, { dir: 'right', anim: 'walk', frame: 1 }),
  renderLook(look, { dir: 'right', anim: 'walk', frame: 4 }),
  renderLook(look, { dir: 'right', anim: 'attack', frame: 1 }),
]);
mkdirSync('art-kit/out', { recursive: true });
writeFileSync('art-kit/out/showcase.png', encodePng(sheet(rows, scale, [58, 64, 52, 255], 2)));
console.log(`showcase.png: ${picked.length} looks x ${rows[0].length} frames in ${Date.now() - t0} ms`);
console.log('rows:', LOOKS.map((l) => l.name).join(' | '));
