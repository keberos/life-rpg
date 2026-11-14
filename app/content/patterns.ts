// Procedural INT quests: number sequences whose difficulty follows the player's rating.
// Generated, so they never run out and need no content pack.
import type { Rng } from '../../src/engine/rng.ts';
import type { QuizQuestion } from './quests.ts';

const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));

type Gen = (rng: Rng) => { seq: number[]; next: number };

const tier1: Gen[] = [
  (r) => { const a = int(r, 1, 20), k = int(r, 2, 9); return { seq: [0, 1, 2, 3, 4].map((i) => a + i * k), next: a + 5 * k }; },
  (r) => { const a = int(r, 60, 99), k = int(r, 2, 8); return { seq: [0, 1, 2, 3, 4].map((i) => a - i * k), next: a - 5 * k }; },
  (r) => { const a = int(r, 1, 4); return { seq: [0, 1, 2, 3, 4].map((i) => a * 2 ** i), next: a * 32 }; },
];

const tier2: Gen[] = [
  (r) => { const a = int(r, 1, 9), p = int(r, 2, 6), q = int(r, 7, 12); const s = [a]; for (let i = 1; i < 6; i++) s.push(s[i - 1] + (i % 2 ? p : q)); return { seq: s.slice(0, 5), next: s[5] }; },
  (r) => { const o = int(r, 1, 4); return { seq: [0, 1, 2, 3, 4].map((i) => (i + o) ** 2), next: (5 + o) ** 2 }; },
  (r) => { const a = int(r, 2, 6), k = int(r, 1, 4); const s = [a]; for (let i = 1; i < 6; i++) s.push(s[i - 1] + k * i); return { seq: s.slice(0, 5), next: s[5] }; },
];

const tier3: Gen[] = [
  (r) => { const a = int(r, 1, 5), b = int(r, 2, 7); const s = [a, b]; for (let i = 2; i < 6; i++) s.push(s[i - 1] + s[i - 2]); return { seq: s.slice(0, 5), next: s[5] }; },
  (r) => { const a = int(r, 1, 5); const s = [a]; for (let i = 1; i < 6; i++) s.push(s[i - 1] * 2 + 1); return { seq: s.slice(0, 5), next: s[5] }; },
  (r) => { const a = int(r, 2, 9), m = int(r, 2, 3), k = int(r, 1, 5); const s = [a]; for (let i = 1; i < 6; i++) s.push(i % 2 ? s[i - 1] * m : s[i - 1] - k); return { seq: s.slice(0, 5), next: s[5] }; },
];

export function patternQuestions(rating: number, rng: Rng, count = 3): QuizQuestion[] {
  const tier: 1 | 2 | 3 = rating < 8 ? 1 : rating < 16 ? 2 : 3;
  const pool = tier === 1 ? tier1 : tier === 2 ? [...tier1, ...tier2, ...tier2] : [...tier2, ...tier3, ...tier3];
  const out: QuizQuestion[] = [];
  for (let i = 0; i < count; i++) {
    const g = pool[Math.floor(rng() * pool.length)];
    const { seq, next } = g(rng);
    const gap = Math.max(1, Math.abs(seq[4] - seq[3]));
    const wrong = new Set<number>();
    for (const w of [next + gap, next - gap, next + 1, next - 1, next + 2 * gap, seq[4] + seq[3]]) {
      if (w !== next && wrong.size < 3) wrong.add(w);
    }
    const options = [next, ...wrong].map(String);
    for (let j = options.length - 1; j > 0; j--) {
      const k = Math.floor(rng() * (j + 1));
      [options[j], options[k]] = [options[k], options[j]];
    }
    out.push({ q: `${seq.join(', ')}, ?`, options, answer: options.indexOf(String(next)), tier });
  }
  return out;
}
