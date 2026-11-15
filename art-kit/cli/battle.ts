// Battle sprite sheet: every class in the battle stance and the attack swing,
// exactly as the app shows them. Usage: node art-kit/cli/battle.ts [style] [scale] [classes]
// Writes art-kit/out/battle-<style>.png
import { mkdirSync, writeFileSync } from 'node:fs';
import { CLASS_LOOKS } from '../src/class-looks.ts';
import { encodePng, sheet } from '../src/png.ts';
import { battleFrames } from '../src/battle.ts';

const style = (process.argv[2] ?? 'crisp') as 'jrpg' | 'crisp';
const scale = Number(process.argv[3] ?? 3);
const only = process.argv[4]?.split(',');
mkdirSync('art-kit/out', { recursive: true });
const t0 = Date.now();
const looks = CLASS_LOOKS.filter((l) => !only || only.some((o) => l.name.toLowerCase().startsWith(o)));
const rows = looks.map((l) => battleFrames(l, style));
writeFileSync(`art-kit/out/battle-${style}.png`, encodePng(sheet(rows, scale, [58, 64, 92, 255], 1)));
console.log(`battle-${style}.png: ${looks.map((l) => l.name).join(', ')} in ${Date.now() - t0} ms`);
