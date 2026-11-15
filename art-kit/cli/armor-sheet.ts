// Armor sets and shields on the same plain hero (battle stance + mid-swing).
// Usage: node art-kit/cli/armor-sheet.ts [scale] [names]
import { writeFileSync } from 'node:fs';
import { LOOKS } from '../src/looks.ts';
import { encodePng, sheet } from '../src/png.ts';
import { renderLook } from '../src/render.ts';
import type { ItemSpec, Look } from '../src/wardrobe.ts';
const scale = Number(process.argv[2] ?? 3);
const sets: [string, ItemSpec[]][] = [
  ['vest', [{ id: 'vest' }, { id: 'ironSword' }]],
  ['leather', [{ id: 'leatherArmor' }, { id: 'dagger' }]],
  ['mossweave', [{ id: 'chainmail' }, { id: 'leatherArmor', mat: 'clothForest', mat2: 'leatherDark' }, { id: 'twinfang' }]],
  ['brigandine', [{ id: 'chainmail' }, { id: 'brigandine' }, { id: 'axe' }, { id: 'shield', mat: 'wood', mat2: 'steel' }]],
  ['paladin', [{ id: 'chainmail' }, { id: 'plate' }, { id: 'kiteShield' }, { id: 'sword' }]],
  ['bulwark', [{ id: 'chainmail' }, { id: 'plate' }, { id: 'towerShield' }, { id: 'ironSword' }]],
];
const only = process.argv[3]?.split(',');
const base = LOOKS.find((l) => l.name.startsWith('Commoner'))!;
const pick = sets.filter(([n]) => !only || only.includes(n));
const looks: Look[] = pick.map(([n, items]) => ({ ...base, name: n, items: [...base.items.filter((i) => i.id !== 'shirt'), { id: 'shirt', mat: 'linen' }, ...items] }));
const top = looks.map((l) => renderLook(l, { dir: 'battle', anim: 'stance', frame: 0, quality: 'xl', style: 'crisp' }));
const bottom = looks.map((l) => renderLook(l, { dir: 'battle', motion: { clip: 'Sword_Attack', t: 0.5 }, quality: 'xl', style: 'crisp' }));
writeFileSync('art-kit/out/armor.png', encodePng(sheet([top, bottom], scale, [58, 64, 92, 255], 1)));
console.log(pick.map(([n]) => n).join(', '));
