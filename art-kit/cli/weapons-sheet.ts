// Every weapon in the hand of the same plain hero, battle stance + one swing frame.
// Usage: node art-kit/cli/weapons-sheet.ts [scale] [ids]
import { writeFileSync } from 'node:fs';
import { LOOKS } from '../src/looks.ts';
import { encodePng, sheet } from '../src/png.ts';
import { renderLook } from '../src/render.ts';
import type { ItemSpec, Look } from '../src/wardrobe.ts';
const scale = Number(process.argv[2] ?? 3);
const all: [string, ItemSpec[]][] = [
  ['ironSword', [{ id: 'ironSword' }]], ['twinfang', [{ id: 'twinfang' }]], ['sword', [{ id: 'sword' }]], ['runeblade', [{ id: 'runeblade' }]],
  ['dagger', [{ id: 'dagger' }]], ['axe', [{ id: 'axe' }]], ['mace', [{ id: 'mace', mat: 'gold' }]],
  ['staff', [{ id: 'staff' }]], ['oakStaff', [{ id: 'oakStaff' }]], ['emberglassRod', [{ id: 'emberglassRod' }]], ['bow', [{ id: 'bow' }]],
];
const only = process.argv[3]?.split(',');
const base = LOOKS.find((l) => l.name.startsWith('Commoner'))!;
const pick = all.filter(([id]) => !only || only.includes(id));
const looks: Look[] = pick.map(([id, items]) => ({ ...base, name: id, items: [...base.items, ...items] }));
const top = looks.map((l) => renderLook(l, { dir: 'battle', anim: 'stance', frame: 0, quality: 'xl', style: 'crisp' }));
const bottom = looks.map((l) => renderLook(l, { dir: 'battle', motion: { clip: 'Sword_Attack', t: 0.5 }, quality: 'xl', style: 'crisp' }));
writeFileSync('art-kit/out/weapons.png', encodePng(sheet([top, bottom], scale, [58, 64, 92, 255], 1)));
console.log(pick.map(([id]) => id).join(', '));
