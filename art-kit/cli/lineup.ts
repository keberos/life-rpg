// Class lineup (front + side + back) and the armory (single pieces).
// Usage: node art-kit/cli/lineup.ts [classes|armory|both] [scale]
import { mkdirSync, writeFileSync } from 'node:fs';
import { ARMORY, CLASS_LOOKS } from '../src/class-looks.ts';
import { encodePng, sheet } from '../src/png.ts';
import { renderLook } from '../src/render.ts';

const which = process.argv[2] ?? 'both';
const scale = Number(process.argv[3] ?? 3);
const style = (process.argv[4] ?? 'classic') as 'classic' | 'jrpg';
const quality = (process.argv[5] ?? 'hd') as 'hd' | 'xl';
mkdirSync('art-kit/out', { recursive: true });
const bg: [number, number, number, number] = [34, 38, 52, 255];

if (which !== 'armory') {
  const t0 = Date.now();
  const rows = [
    CLASS_LOOKS.map((l) => renderLook(l, { dir: style === 'jrpg' ? 'downRight' : 'down', quality, style })),
    CLASS_LOOKS.map((l) => renderLook(l, { dir: 'right', anim: 'walk', frame: 1, quality, style })),
    CLASS_LOOKS.map((l) => renderLook(l, { dir: style === 'jrpg' ? 'upLeft' : 'up', quality, style })),
  ];
  writeFileSync(`art-kit/out/classes-${style}.png`, encodePng(sheet(rows, scale, bg, 1)));
  console.log(`classes.png (${CLASS_LOOKS.map((l) => l.name).join(', ')}) in ${Date.now() - t0} ms`);
}
if (which !== 'classes') {
  const t0 = Date.now();
  const rows = ARMORY.map((r) => r.looks.map((l) => renderLook(l, { dir: 'down', quality, style, ...r.view })));
  writeFileSync(`art-kit/out/armory-${style}.png`, encodePng(sheet(rows, scale, bg, 1)));
  console.log(`armory.png in ${Date.now() - t0} ms`);
  for (const r of ARMORY) console.log(`  ${r.title}: ${r.looks.map((l) => l.name).join(', ')}`);
}
