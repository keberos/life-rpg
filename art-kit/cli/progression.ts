// A presentation image: each class line from commoner to its top tier,
// front view and a mid-walk side view, scaled up on a dark ground.
// Usage: node art-kit/cli/progression.ts [classic|hd] [scale] [basic]
import { mkdirSync, writeFileSync } from 'node:fs';
import { LOOKS } from '../src/looks.ts';
import { encodePng, sheet } from '../src/png.ts';
import { renderLook, type Quality } from '../src/render.ts';

const quality = (process.argv[2] ?? 'classic') as Quality;
const scale = Number(process.argv[3] ?? (quality === 'hd' ? 4 : 6));
const basic = process.argv[4] === 'basic';
const byName = (n: string) => {
  const l = LOOKS.find((x) => x.name.startsWith(n));
  if (!l) throw new Error(n);
  return l;
};
const lines = [
  ['Commoner', 'Initiate', 'Warrior', 'Paladin'],
  ['Commoner', 'Apprentice', 'Sage', 'Archmage'],
];
const t0 = Date.now();
const rows = lines.flatMap((line) => [
  line.map((n) => renderLook(byName(n), { dir: 'down', quality, basic })),
  line.map((n) => renderLook(byName(n), { dir: 'right', anim: 'walk', frame: 1, quality, basic })),
]);
mkdirSync('art-kit/out', { recursive: true });
const name = `progression-${quality}${basic ? '-basic' : ''}.png`;
writeFileSync(`art-kit/out/${name}`, encodePng(sheet(rows, scale, [34, 38, 52, 255], 1)));
console.log(`${name} in ${Date.now() - t0} ms`);
