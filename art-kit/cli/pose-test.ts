// Quick look at one battle frame for a few classes. Usage: node art-kit/cli/pose-test.ts anim frame classes [scale]
import { writeFileSync } from 'node:fs';
import { CLASS_LOOKS } from '../src/class-looks.ts';
import { encodePng, sheet } from '../src/png.ts';
import { renderLook } from '../src/render.ts';
const [anim, frame, who, sc] = process.argv.slice(2);
const looks = CLASS_LOOKS.filter((l) => who.split(',').some((o) => l.name.toLowerCase().startsWith(o)));
const row = looks.map((l) => renderLook(l, { dir: 'battle', anim: anim as 'strike', frame: Number(frame), quality: 'hd', style: 'crisp' }));
writeFileSync('art-kit/out/pose-test.png', encodePng(sheet([row], Number(sc ?? 4), [58, 64, 92, 255], 1)));
