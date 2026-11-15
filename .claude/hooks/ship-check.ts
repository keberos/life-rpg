// Ship check for the public repo.
//   npm run ship-check          typecheck, tests, build, then the push checks below
//   (hook) PreToolUse on `git push`: push checks only; exit 2 blocks the push.
// Push checks, over every commit not yet on origin/main:
//   - only `main` is pushed (other local branches stay local)
//   - author/committer e-mails are the project's public identity
//   - no line added in the diff matches a private pattern
// Private patterns and the public identity live in .claude/privacy.local.json
// (git-ignored): { "identity": "<public email>", "patterns": ["regex", ...] }
import { execSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();
const git = (cmd: string) => execSync(`git ${cmd}`, { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 }).trim();
const fromHook = !process.stdin.isTTY && process.argv[2] !== '--full';
const problems: string[] = [];

let command = '';
if (fromHook) {
  try {
    command = JSON.parse(readFileSync(0, 'utf8')).tool_input?.command ?? '';
  } catch {
    /* not JSON: treat as a plain push check */
  }
  if (command && !/\bgit\b[^|;&]*\bpush\b/.test(command)) process.exit(0);
}

if (!fromHook) {
  for (const [name, args] of [['typecheck', ['run', 'typecheck']], ['tests', ['test']], ['build', ['run', 'build']]] as const) {
    const r = spawnSync('npm', [...args], { cwd: root, stdio: 'inherit', shell: true });
    if (r.status !== 0) problems.push(`${name} failed`);
  }
}

const cfgPath = join(root, '.claude', 'privacy.local.json');
if (!existsSync(cfgPath)) {
  problems.push('.claude/privacy.local.json is missing (private patterns + public identity), so the privacy scan cannot run');
} else {
  let cfg: { identity: string; patterns: string[] };
  try {
    cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
  } catch (e) {
    console.error(`Ship check failed: .claude/privacy.local.json is not valid JSON (${(e as Error).message})`);
    process.exit(2);
  }
  const branch = git('rev-parse --abbrev-ref HEAD');
  const pushing = command ? command : 'git push origin main';
  const named = pushing.split(/\s+/).slice(2).filter((a) => !a.startsWith('-'));
  const refs = named.length > 1 ? named.slice(1) : [branch];
  for (const r of refs) if (!/^(HEAD:)?(refs\/heads\/)?main$/.test(r.replace(/^\+/, ''))) problems.push(`only main is pushed; this push names "${r}"`);
  if (/--all|--mirror/.test(pushing)) problems.push('--all / --mirror would push local-only branches');

  const range = 'origin/main..HEAD';
  const people = git(`log --format=%ae%n%ce ${range}`).split('\n').filter(Boolean);
  for (const e of new Set(people)) if (e !== cfg.identity) problems.push(`a commit uses the e-mail ${e}, not the public identity`);

  const added = git(`diff ${range.replace('..', '...')} --unified=0 --no-color`).split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++'));
  const files = git(`diff --name-only ${range.replace('..', '...')}`);
  const messages = git(`log --format=%B ${range}`);
  for (const p of cfg.patterns) {
    const re = new RegExp(p, 'i');
    const hit = added.find((l) => re.test(l)) ?? (re.test(files) ? '(a file name)' : re.test(messages) ? '(a commit message)' : undefined);
    if (hit) problems.push(`private pattern #${cfg.patterns.indexOf(p) + 1} found: ${hit.slice(0, 120)}`);
  }
}

if (problems.length) {
  console.error('Ship check failed:\n- ' + problems.join('\n- '));
  process.exit(2);
}
console.log('Ship check passed.');
