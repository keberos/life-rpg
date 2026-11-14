// Close-up of a few class looks for inspecting faces and details.
// Usage: node art-kit/cli/closeup.ts <style> <scale> <index,index,...>
import { mkdirSync, writeFileSync } from 'node:fs';
import { CLASS_LOOKS } from '../src/class-looks.ts';
import { encodePng, sheet } from '../src/png.ts';
import { renderLook, type Dir } from '../src/render.ts';

const style = (process.argv[2] ?? 'jrpg') as 'classic' | 'jrpg';
const scale = Number(process.argv[3] ?? 6);
const idx = (process.argv[4] ?? '0,1,3').split(',').map(Number);
const dirs: Dir[] = ['down', 'downRight', 'right'];
const quality = (process.argv[5] ?? 'hd') as 'hd' | 'xl';
const rows = idx.map((i) => dirs.map((dir) => renderLook(CLASS_LOOKS[i], { dir, quality, style })));
mkdirSync('art-kit/out', { recursive: true });
writeFileSync('art-kit/out/closeup.png', encodePng(sheet(rows, scale, [34, 38, 52, 255], 1)));
console.log('closeup.png');
