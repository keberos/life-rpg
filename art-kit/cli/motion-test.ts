// Render borrowed-motion frames for a few classes.
// Usage: node art-kit/cli/motion-test.ts Clip:t,Clip:t,... classes [scale] [turn]
import { writeFileSync } from 'node:fs';
import { CLASS_LOOKS } from '../src/class-looks.ts';
import { encodePng, sheet } from '../src/png.ts';
import { renderLook } from '../src/render.ts';
const [spec, who, sc, turn] = process.argv.slice(2);
const frames = spec.split(',').map((s) => ({ clip: s.split(':')[0], t: Number(s.split(':')[1]) }));
const looks = CLASS_LOOKS.filter((l) => who.split(',').some((o) => l.name.toLowerCase().startsWith(o)));
const rows = looks.map((l) => frames.map((f) => renderLook(l, { dir: 'battle', motion: { ...f, turn: Number(turn ?? 0) }, quality: (process.env.Q ?? 'xl') as 'xl', style: 'crisp' })));
writeFileSync('art-kit/out/motion-test.png', encodePng(sheet(rows, Number(sc ?? 3), [58, 64, 92, 255], 1)));
console.log('ok');
