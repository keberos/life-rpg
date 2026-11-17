// Game guard: heavy jobs (AI paint on the GPU, long CPU renders and sims) never run
// while someone is playing a game on this PC.
//
//   node scripts/game-guard.ts          exit 0 = clear, exit 1 = a game is running (prints why)
//   node scripts/game-guard.ts --hook   Claude Code PreToolUse hook: blocks heavy commands (exit 2)
//   import { gameRunning, watchForGames } from './game-guard.ts'   (npm run paint uses both)
//
// Signals (Windows; elsewhere the guard is a no-op):
//   - Windows says a full-screen app is up (SHQueryUserNotificationState: busy / D3D
//     full screen / presentation). Catches borderless-window games too.
//   - Steam reports a running game (HKCU\Software\Valve\Steam RunningAppID).
//   - Any process named in .claude/game-guard.local.json {"processes": ["SomeGame"]} (git-ignored).
//   - Before a job starts only: the GPU is already busy (NVIDIA, over 40% for ~3 s).
// Override for one command: LIFE_RPG_IGNORE_GAMES=1.
import { execFileSync, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const win = process.platform === 'win32';

/** A command step heavy enough to hurt a game: GPU paint, art-kit renders, sims, headless browser runs, builds. */
const HEAVY_STEP = new RegExp([
  String.raw`npm\s+run\s+(paint|sprites|exercises|sim|season|tune|tune:forms|shots|loop|build|ship-check)\b`,
  String.raw`node\s+(--\S+\s+)*["']?\S*(art-kit[\\/](cli|ai)[\\/]|sim[\\/]|scripts[\\/](shots|loop)\.ts)`,
  String.raw`["']?\S*python(3|\.exe)?["']?(\s|$)`,
  String.raw`["']?\$\{?\w+\}?["']?\s+\S+\.py\b`, // "$PY" script.py
  String.raw`(npx\s+)?vite\s+build\b`,
].map((s) => `^(?:${s})`).join('|'));
/** True when some step of a shell command (split on ; & | newlines, env assignments skipped) runs heavy work. Text inside echo/grep doesn't count. */
export const isHeavy = (command: string) =>
  command.split(/[;&|\n]+/).some((step) => HEAVY_STEP.test(step.trim().replace(/^(\w+=\S*\s+)+/, '').replace(/^(cd\s+\S+\s*)$/, '')));

const run = (cmd: string, args: string[]) => {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 15000, windowsHide: true });
  } catch {
    return '';
  }
};

function fullScreen(): boolean {
  const ps = `$t = Add-Type -MemberDefinition '[DllImport("shell32.dll")] public static extern int SHQueryUserNotificationState(out int s);' -Name Q -Namespace G -PassThru; $s = 0; [void]$t::SHQueryUserNotificationState([ref]$s); $s`;
  const s = Number(run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps]).trim());
  return s === 2 || s === 3 || s === 4; // QUNS_BUSY, QUNS_RUNNING_D3D_FULL_SCREEN, QUNS_PRESENTATION_MODE
}

function steamGame(): string | null {
  const m = run('reg', ['query', 'HKCU\\Software\\Valve\\Steam', '/v', 'RunningAppID']).match(/0x([0-9a-f]+)/i);
  return m && parseInt(m[1], 16) !== 0 ? `Steam app ${parseInt(m[1], 16)}` : null;
}

function listedProcess(): string | null {
  const cfg = join(root, '.claude', 'game-guard.local.json');
  if (!existsSync(cfg)) return null;
  let names: string[] = [];
  try {
    names = JSON.parse(readFileSync(cfg, 'utf8')).processes ?? [];
  } catch {
    return null;
  }
  if (!names.length) return null;
  const running = run('tasklist', ['/fo', 'csv', '/nh']).toLowerCase();
  return names.find((n) => running.includes(`"${n.toLowerCase().replace(/\.exe$/, '')}.exe"`)) ?? null;
}

function gpuBusy(): number | null {
  let peak = 0;
  for (let i = 0; i < 3; i++) {
    const out = run('nvidia-smi', ['--query-gpu=utilization.gpu', '--format=csv,noheader,nounits']).trim();
    if (!out) return null;
    peak = Math.max(peak, Number(out.split('\n')[0]));
    if (i < 2) spawnSync(process.execPath, ['-e', 'setTimeout(()=>{},1000)']);
  }
  return peak > 40 ? peak : null;
}

/** Why heavy work should wait, or null when the PC is free. `gpu` also checks GPU load (only before starting a job). */
export function gameRunning(opts: { gpu?: boolean } = {}): string | null {
  if (!win || process.env.LIFE_RPG_IGNORE_GAMES === '1') return null;
  if (fullScreen()) return 'a full-screen app (likely a game) is running';
  const steam = steamGame();
  if (steam) return `a game is running (${steam})`;
  const p = listedProcess();
  if (p) return `a game is running (${p})`;
  if (opts.gpu) {
    const g = gpuBusy();
    if (g !== null) return `the GPU is already ${g}% busy (a game?)`;
  }
  return null;
}

/** While `child` runs, check every `everyMs`; if a game starts, stop the job (it resumes from where it got to when rerun). */
export function watchForGames(child: ChildProcess, everyMs = 20000): () => void {
  if (!win || process.env.LIFE_RPG_IGNORE_GAMES === '1') return () => {};
  const t = setInterval(() => {
    const why = gameRunning();
    if (!why) return;
    console.error(`\n[game guard] Stopping: ${why}. Rerun the same command when you're done playing.`);
    clearInterval(t);
    if (child.pid) spawnSync('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' });
    else child.kill();
  }, everyMs);
  return () => clearInterval(t);
}

if (import.meta.main) {
  if (process.argv.includes('--hook')) {
    let command = '';
    try {
      command = JSON.parse(readFileSync(0, 'utf8')).tool_input?.command ?? '';
    } catch {
      process.exit(0);
    }
    if (!isHeavy(command) || /LIFE_RPG_IGNORE_GAMES=1/.test(command)) process.exit(0);
    const why = gameRunning({ gpu: true });
    if (why) {
      console.error(`[game guard] Not running this now: ${why}. The owner is gaming; heavy GPU/CPU work waits until they're done. Do light work (editing, reading, typecheck) or ask them.`);
      process.exit(2);
    }
    process.exit(0);
  }
  const why = gameRunning({ gpu: true });
  console.log(why ? `busy: ${why}` : 'clear: no game detected');
  process.exit(why ? 1 : 0);
}
