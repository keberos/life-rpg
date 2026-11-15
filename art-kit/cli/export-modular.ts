// Export modular battle sprites for the app:
//   art-kit/out/modular/body/<class>-<kind>.png      raw class bodies (then AI-repainted into public/sprites/body)
//   public/sprites/held/<gear>-<kind>.png            weapon layers
//   public/sprites/modular.json                      what exists
// Usage: node art-kit/cli/export-modular.ts [body|held|all] [weapon ids, comma-separated]
import { mkdirSync, writeFileSync } from 'node:fs';
import { BATTLE_FRAME } from '../src/battle.ts';
import { CLASS_BODIES, HELD_GEAR, KINDS, bodyStrip, heldStrip } from '../src/modular.ts';
import { encodePng, sheet } from '../src/png.ts';

const which = process.argv[2] ?? 'all';
const t0 = Date.now();
const save = (path: string, frames: ReturnType<typeof bodyStrip>) => writeFileSync(path, encodePng(sheet([frames], 1)));
if (which !== 'held') {
  mkdirSync('art-kit/out/modular/body', { recursive: true });
  for (const c of Object.keys(CLASS_BODIES))
    for (const k of KINDS) {
      save(`art-kit/out/modular/body/${c}-${k}.png`, bodyStrip(c, k));
      console.log(`body ${c}-${k}`);
    }
}
if (which !== 'body') {
  mkdirSync('public/sprites/held', { recursive: true });
  const only = process.argv[3]?.split(',');
  for (const g of Object.keys(HELD_GEAR)) {
    if (only && !only.includes(g)) continue;
    save(`public/sprites/held/${g}-${HELD_GEAR[g].kind}.png`, heldStrip(g));
    console.log(`held ${g}`);
  }
}
writeFileSync('public/sprites/modular.json', JSON.stringify({ size: BATTLE_FRAME, frames: { idle: [0, 1, 2, 3], attack: [4, 5, 6, 7] }, classes: Object.keys(CLASS_BODIES), kinds: KINDS, held: Object.fromEntries(Object.entries(HELD_GEAR).map(([g, d]) => [g, d.kind])) }, null, 2));
console.log(`done in ${Math.round((Date.now() - t0) / 1000)} s`);
