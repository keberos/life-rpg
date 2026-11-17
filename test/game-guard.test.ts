import { describe, expect, it } from 'vitest';
import { isHeavy } from '../scripts/game-guard.ts';

describe('game guard: which commands count as heavy', () => {
  it.each([
    'npm run paint -- bodies',
    'cd x && npm run sim',
    'node art-kit/cli/layer-test.ts',
    'node --no-warnings sim/season.ts',
    '"$PY" art-kit/ai/x.py a',
    'C:/sd/venv/Scripts/python.exe -c 1',
    'LIFE_RPG_SD=x npm run paint',
    'npx vite build',
  ])('blocks %s', (c) => expect(isHeavy(c)).toBe(true));
  it.each([
    'echo "npm run paint"',
    'grep -n "npm run loop" README.md',
    'git status',
    'npm run typecheck',
    'npm test',
    'node scripts/game-guard.ts',
    'grep foo.py x',
  ])('allows %s', (c) => expect(isHeavy(c)).toBe(false));
});
