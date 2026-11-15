// The four breathing stance frames for a few classes. Usage: node art-kit/cli/stance-test.ts classes [scale]
import { writeFileSync } from 'node:fs';
import { CLASS_LOOKS } from '../src/class-looks.ts';
import { encodePng, sheet } from '../src/png.ts';
import { renderLook } from '../src/render.ts';
const [who, sc] = process.argv.slice(2);
const looks = CLASS_LOOKS.filter((l) => who.split(',').some((o) => l.name.toLowerCase().startsWith(o)));
const rows = looks.map((l) => [0, 1, 2, 3].map((f) => renderLook(l, { dir: 'battle', anim: 'stance', frame: f, quality: (process.env.Q ?? 'xl') as 'xl', style: 'crisp' })));
writeFileSync('art-kit/out/stance-test.png', encodePng(sheet(rows, Number(sc ?? 4), [58, 64, 92, 255], 1)));
