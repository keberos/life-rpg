// AI paint pipeline entry point: runs the Python scripts in art-kit/ai with the
// local SDXL venv. Needs LIFE_RPG_SD = the folder holding `venv/` and `models/`
// (set it in .claude/settings.local.json "env", or your shell). Fully offline.
//
//   npm run paint -- bodies [classes|all] [two-pass|frame] [seed]
//       raw art-kit bodies (npm run sprites) -> public/sprites/body
//   npm run paint -- compare <out.png> <body>:<weapon> ...
//       stack body + weapon layers like the app does, scaled up, one row each
//       e.g. ranger-swing:ranger-dagger-swing monk-punch:
//   npm run paint -- create <out.png> "<prompt>" [seed] [size] [colors]
//       text-to-image on a plain background (bosses, no art-kit model)
//   npm run paint -- ab <raw strip> <weapon layer|-> <out dir> <reference png|-> [frame]
//       A/B four paint settings (two-pass, + IP-Adapter, + PixelOE) on one strip
//   npm run paint -- download
//       fetch the models (~10 GB, Hugging Face) into LIFE_RPG_SD/models
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

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
};
if (!cmd || !script[cmd]) {
  console.error('Usage: npm run paint -- bodies|compare|create|ab|download ...  (see art-kit/cli/paint.ts)');
  process.exit(1);
}
const [file, argv] = script[cmd];
const env = { ...process.env, HF_HUB_OFFLINE: cmd === 'download' ? '0' : '1', PYTHONUNBUFFERED: '1' };
const r = spawnSync(python, [join('art-kit', 'ai', file), ...argv], { stdio: 'inherit', env, cwd: process.cwd() });
process.exit(r.status ?? 1);
