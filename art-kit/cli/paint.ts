// AI paint pipeline entry point: runs the Python scripts in art-kit/ai with the
// local SDXL venv. Needs LIFE_RPG_SD = the folder holding `venv/` and `models/`
// (set it in .claude/settings.local.json "env", or your shell). Fully offline.
//
//   npm run paint -- bodies [classes|all] [two-pass|frame] [seed] [--ref] [--pixeloe]
//       raw art-kit bodies (npm run sprites) -> public/sprites/body
//       --ref: IP-Adapter copies each class's approved frame (art-kit/ai/refs.json)
//       --pixeloe: PixelOE downscale instead of 8x8 block mode
//   npm run paint -- heroes paint [--ref] | compose [styles/classes] | sheet [out.png]
//       layered heroes (the player's look in every class outfit): render the inputs first
//       with node art-kit/cli/hero-layers.ts; paint = hair + outfit sources (GPU),
//       compose = every hairstyle x class x kind into public/sprites/hero (CPU, no paint)
//   npm run paint -- refs [out.png] [classes|all]
//       contact sheet of painted idle frames, to pick each class's reference
//   npm run paint -- compare <out.png> <body>:<weapon> ...
//       stack body + weapon layers like the app does, scaled up, one row each
//       e.g. ranger-swing:ranger-dagger-swing monk-punch:
//   npm run paint -- create <out.png> "<prompt>" [seed] [size] [colors]
//       text-to-image on a plain background (bosses, no art-kit model)
//   npm run paint -- ab <raw strip> <weapon layer|-> <out dir> <reference png|-> [frame]
//       A/B four paint settings (two-pass, + IP-Adapter, + PixelOE) on one strip
// Game guard: won't start while a game is running, and stops if one starts (rerun resumes;
// LIFE_RPG_IGNORE_GAMES=1 overrides). See scripts/game-guard.ts.
//
//   npm run paint -- download
//       fetch the models (~10 GB, Hugging Face) into LIFE_RPG_SD/models
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { gameRunning, watchForGames } from '../../scripts/game-guard.ts';

const sd = process.env.LIFE_RPG_SD;
if (!sd) {
  console.error('LIFE_RPG_SD is not set (folder with venv/ and models/). See art-kit/cli/paint.ts.');
  process.exit(1);
}
const python = [join(sd, 'venv', 'Scripts', 'python.exe'), join(sd, 'venv', 'bin', 'python')].find(existsSync);
if (!python) {
  console.error(`No Python venv under ${sd}/venv.`);
  process.exit(1);
}
const [cmd, ...args] = process.argv.slice(2);
const script: Record<string, [string, string[]]> = {
  bodies: ['paint_bodies.py', ['art-kit/out/modular/body', 'public/sprites/body', ...args]],
  compare: ['stack.py', ['public', ...args]],
  create: ['repaint.py', ['create', ...args]],
  download: ['download.py', args],
  ab: ['ab_test.py', args],
  heroes: ['hero_layers.py', ['art-kit/out/hero-layers', 'public/sprites', ...args]],
  refs: ['ref_sheet.py', ['public/sprites/body', args[0] ?? 'design/ref-pick.png', ...args.slice(1)]],
};
if (!cmd || !script[cmd]) {
  console.error('Usage: npm run paint -- bodies|heroes|compare|create|ab|refs|download ...  (see art-kit/cli/paint.ts)');
  process.exit(1);
}
const [file, argv] = script[cmd];
const busy = cmd === 'download' ? null : gameRunning({ gpu: true });
if (busy) {
  console.error(`[game guard] Not starting: ${busy}. Run it again when you're done playing (or set LIFE_RPG_IGNORE_GAMES=1).`);
  process.exit(3);
}
const env = { ...process.env, HF_HUB_OFFLINE: cmd === 'download' ? '0' : '1', PYTHONUNBUFFERED: '1' };
const child = spawn(python, [join('art-kit', 'ai', file), ...argv], { stdio: 'inherit', env, cwd: process.cwd() });
const stopWatch = watchForGames(child);
child.on('exit', (code) => {
  stopWatch();
  process.exit(code ?? 3);
});
