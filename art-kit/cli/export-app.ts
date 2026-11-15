// Pre-renders placeholder hero sprites for the app, one strip per class:
// frames 0-3 = breathing battle stance, frames 4-7 = attack, all in the 3/4 battle view (crisp style).
// Writes public/sprites/<classId>.png and public/sprites/manifest.json.
// Usage: node art-kit/cli/export-app.ts
import { mkdirSync, writeFileSync } from 'node:fs';
import { CLASS_LOOKS } from '../src/class-looks.ts';
import { LOOKS } from '../src/looks.ts';
import { encodePng, sheet } from '../src/png.ts';
import { battleFrames } from '../src/battle.ts';
import type { Look } from '../src/wardrobe.ts';

const byName = (list: Look[], n: string) => {
  const l = list.find((x) => x.name.startsWith(n));
  if (!l) throw new Error(`no look ${n}`);
  return l;
};

/** App class id -> look. Adventurer is the starting commoner. */
const CLASS_MAP: Record<string, Look> = {
  adventurer: { ...byName(LOOKS, 'Commoner'), iris: 'irisBrown' },
  warrior: byName(CLASS_LOOKS, 'Warrior'),
  paladin: byName(CLASS_LOOKS, 'Paladin'),
  ranger: byName(CLASS_LOOKS, 'Ranger'),
  monk: byName(CLASS_LOOKS, 'Monk'),
  sage: byName(CLASS_LOOKS, 'Sage'),
  cleric: byName(CLASS_LOOKS, 'Cleric'),
  spellblade: byName(CLASS_LOOKS, 'Spellblade'),
};

const size = 96;
const out = 'public/sprites';
mkdirSync(out, { recursive: true });
const t0 = Date.now();
for (const [id, look] of Object.entries(CLASS_MAP)) {
  const frames = battleFrames(look, 'crisp');
  writeFileSync(`${out}/${id}.png`, encodePng(sheet([frames], 1)));
  console.log(`${id}.png`);
}
writeFileSync(
  `${out}/manifest.json`,
  JSON.stringify({ size, frames: { idle: [0, 1, 2, 3], attack: [4, 5, 6, 7] }, classes: Object.keys(CLASS_MAP) }, null, 2),
);
console.log(`done in ${Date.now() - t0} ms`);
