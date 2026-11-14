// Starter quest pack. Pure data: the app reads it, nothing here knows about a user.
// Scripture is KJV (public domain). Stoic lines are paraphrased, not quoted.
import type { QuestTemplateCurve, StatId } from '../../src/engine/types.ts';

export type QuestKind = 'timer' | 'reps' | 'breath' | 'quiz' | 'pattern' | 'reflection';

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number; // index into options
  why?: string;
  tier: 1 | 2 | 3;
}

export interface QuestDef {
  id: string;
  stat: StatId;
  kind: QuestKind;
  title: string;
  /** Instructions. `{n}` is replaced by the calibrated amount. */
  how: string;
  unit?: 'seconds' | 'reps' | 'cycles';
  curve?: QuestTemplateCurve;
  /** Placement test: what to measure on first launch (physical stats only). */
  placement?: { ask: string; unit: 'seconds' | 'reps' };
  passage?: string;
  source?: string;
  questions?: QuizQuestion[];
  prompt?: string;
  safety?: string;
}

export interface StatInfo {
  id: StatId;
  name: string;
  short: string;
  blurb: string;
  color: string; // CSS var name
}

export const STAT_INFO: Record<StatId, StatInfo> = {
  STR: { id: 'STR', name: 'Strength', short: 'STR', blurb: 'Resistance training', color: 'var(--stat-str)' },
  AGI: { id: 'AGI', name: 'Agility', short: 'AGI', blurb: 'Balance, coordination, mobility', color: 'var(--stat-agi)' },
  STA: { id: 'STA', name: 'Stamina', short: 'STA', blurb: 'Endurance and breath', color: 'var(--stat-sta)' },
  INT: { id: 'INT', name: 'Intellect', short: 'INT', blurb: 'Learning and patterns', color: 'var(--stat-int)' },
  WIS: { id: 'WIS', name: 'Wisdom', short: 'WIS', blurb: 'Stoicism, perspective, emotional IQ', color: 'var(--stat-wis)' },
  FTH: { id: 'FTH', name: 'Faith', short: 'FTH', blurb: 'Scripture and prayer', color: 'var(--stat-fth)' },
};

const PHYS_SAFETY = 'Stop if you feel sharp pain. Good form beats more reps.';

export const QUESTS: QuestDef[] = [
  // ---------------- STR ----------------
  {
    id: 'pushups', stat: 'STR', kind: 'reps', title: 'Push-ups', unit: 'reps',
    how: 'Do {n} push-ups with a straight body line. Knees or a wall count if that is your level.',
    curve: { base: 5, growth: 1.06, min: 3, max: 60 },
    placement: { ask: 'How many push-ups can you do in one set, with good form? (Knee or wall push-ups are fine.)', unit: 'reps' },
    safety: PHYS_SAFETY,
  },
  {
    id: 'squats', stat: 'STR', kind: 'reps', title: 'Slow squats', unit: 'reps',
    how: 'Do {n} squats: 3 seconds down, 1 second up. Chest tall, knees track over toes.',
    curve: { base: 8, growth: 1.06, min: 5, max: 80 }, safety: PHYS_SAFETY,
  },
  {
    id: 'wall-sit', stat: 'STR', kind: 'timer', title: 'Wall sit', unit: 'seconds',
    how: 'Back flat on a wall, thighs as close to level as you can. Hold for {n} seconds.',
    curve: { base: 20, growth: 1.05, min: 10, max: 240 }, safety: PHYS_SAFETY,
  },

  // ---------------- AGI ----------------
  {
    id: 'balance', stat: 'AGI', kind: 'timer', title: 'Single-leg balance', unit: 'seconds',
    how: 'Stand on one leg for {n} seconds, then switch. Harder: close your eyes. Stay near something to grab.',
    curve: { base: 20, growth: 1.05, min: 10, max: 120 },
    placement: { ask: 'How many seconds can you balance on one leg, eyes open?', unit: 'seconds' },
    safety: 'Keep a wall or chair within reach.',
  },
  {
    id: 'mobility-flow', stat: 'AGI', kind: 'timer', title: 'Hip and spine flow', unit: 'seconds',
    how: 'Move slowly for {n} seconds: hip circles, cat-cow, world\'s greatest stretch each side. Smooth, no bouncing.',
    curve: { base: 45, growth: 1.03, min: 30, max: 180 }, safety: PHYS_SAFETY,
  },
  {
    id: 'toe-taps', stat: 'AGI', kind: 'reps', title: 'Cross-body toe taps', unit: 'reps',
    how: 'Standing, tap right hand to left foot, then left hand to right foot. {n} taps total, steady rhythm.',
    curve: { base: 16, growth: 1.05, min: 10, max: 100 }, safety: PHYS_SAFETY,
  },

  // ---------------- STA ----------------
  {
    id: 'plank', stat: 'STA', kind: 'timer', title: 'Plank', unit: 'seconds',
    how: 'Forearm plank for {n} seconds. Squeeze glutes, don\'t let hips sag.',
    curve: { base: 20, growth: 1.05, min: 10, max: 300 },
    placement: { ask: 'How many seconds can you hold a forearm plank?', unit: 'seconds' },
    safety: PHYS_SAFETY,
  },
  {
    id: 'box-breathing', stat: 'STA', kind: 'breath', title: 'Box breathing', unit: 'cycles',
    how: 'Breathe in 4, hold 4, out 4, hold 4. Follow the box for {n} cycles.',
    curve: { base: 3, growth: 1.04, min: 2, max: 12 },
  },
  {
    id: 'march', stat: 'STA', kind: 'timer', title: 'High-knee march', unit: 'seconds',
    how: 'March in place, knees to hip height, arms pumping, for {n} seconds.',
    curve: { base: 30, growth: 1.04, min: 20, max: 240 }, safety: PHYS_SAFETY,
  },

  // ---------------- INT ----------------
  {
    id: 'pattern', stat: 'INT', kind: 'pattern', title: 'Pattern hunt',
    how: 'Find the next number in each sequence. They get harder as you level.',
  },
  {
    id: 'reading-lighthouse', stat: 'INT', kind: 'quiz', title: 'Reading: the lighthouse keeper',
    how: 'Read the passage once, then answer without looking back.',
    passage:
      'Before electric lamps, a lighthouse keeper\'s night was a cycle of small chores. Every few hours the keeper trimmed the wick so the flame burned clean, ' +
      'wound the clockwork that turned the lens, and wiped soot from the glass. A dirty lens could cut the light\'s reach by half, ' +
      'so the cleaning mattered as much as the flame. Ships did not need to see the lighthouse itself; they needed its pattern. ' +
      'Each station flashed in its own rhythm, so a captain counting flashes could tell exactly which coast lay ahead.',
    questions: [
      { q: 'Why did each lighthouse flash in its own rhythm?', options: ['To save fuel', 'So captains could identify which lighthouse it was', 'Because the clockwork was unreliable', 'To warn of storms'], answer: 1, tier: 1 },
      { q: 'According to the passage, what could a dirty lens do?', options: ['Crack the glass', 'Change the flash rhythm', 'Cut the light\'s reach by about half', 'Put the flame out'], answer: 2, tier: 1 },
      { q: 'What does the passage suggest mattered most to a ship?', options: ['Seeing the tower in daylight', 'The keeper\'s schedule', 'Recognizing the light\'s pattern', 'The brightness of the flame alone'], answer: 2, tier: 2 },
    ],
  },
  {
    id: 'reading-honeybees', stat: 'INT', kind: 'quiz', title: 'Reading: the waggle dance',
    how: 'Read the passage once, then answer without looking back.',
    passage:
      'A honeybee that finds good flowers returns to the hive and dances. In the waggle dance she runs a short straight line while shaking her body, ' +
      'then loops back and repeats. The angle of that straight run, compared with straight up on the comb, matches the angle between the sun and the flowers. ' +
      'The longer she waggles, the farther away the food is. Other bees follow the dance in the dark hive by touch and vibration, then fly out to find the spot.',
    questions: [
      { q: 'What does the length of the waggle run tell other bees?', options: ['How much nectar there is', 'How far away the food is', 'Which flower species', 'How many bees should go'], answer: 1, tier: 1 },
      { q: 'The angle of the straight run is measured relative to what?', options: ['North', 'The hive entrance', 'Straight up on the comb', 'The dancing bee\'s head'], answer: 2, tier: 2 },
      { q: 'How do bees follow the dance inside the dark hive?', options: ['By sight', 'By touch and vibration', 'By smell only', 'By sound from the entrance'], answer: 1, tier: 2 },
    ],
  },

  // ---------------- WIS ----------------
  {
    id: 'stoic-control', stat: 'WIS', kind: 'quiz', title: 'In your control?',
    how: 'Read the idea, then sort each situation.',
    passage: 'Epictetus taught that some things are up to us (our judgments, choices and efforts) and some are not (other people\'s opinions, the weather, outcomes). Peace comes from putting full effort into the first and accepting the second.',
    source: 'Paraphrased from Epictetus, Enchiridion 1',
    questions: [
      { q: 'You prepared well, but the interview went to someone else. What was up to you?', options: ['Who got the job', 'Your preparation and how you respond now', 'The interviewer\'s mood', 'Nothing at all'], answer: 1, tier: 1 },
      { q: 'A driver cuts you off. The Stoic first move is to...', options: ['Chase them to make a point', 'Notice your judgment ("this is an outrage") and choose your response', 'Pretend you are not annoyed', 'Decide to never drive again'], answer: 1, tier: 2 },
      { q: 'Which is fully up to you?', options: ['Whether people like your work', 'Whether it rains on your run', 'Whether you keep a promise you made', 'Whether your plan succeeds'], answer: 2, tier: 1 },
    ],
  },
  {
    id: 'stoic-view-from-above', stat: 'WIS', kind: 'reflection', title: 'The view from above',
    how: 'Marcus Aurelius often pictured his troubles from very high up: small, brief, shared by countless people. Take two minutes with the prompt.',
    source: 'Idea drawn from Marcus Aurelius, Meditations',
    prompt: 'Pick one thing bothering you today. Picture it from the sky, then from a year from now. What part of it still matters, and what is one thing you will do about that part?',
  },
  {
    id: 'emotion-label', stat: 'WIS', kind: 'reflection', title: 'Name it to tame it',
    how: 'Putting a precise word on a feeling makes it easier to handle.',
    prompt: 'What are you feeling right now? Go past "fine" or "stressed": try restless, lonely, curious, dreading, hopeful, irritated. What might it be telling you?',
  },

  // ---------------- FTH ----------------
  {
    id: 'verse-proverbs-3', stat: 'FTH', kind: 'quiz', title: 'Proverbs 3:5-6',
    how: 'Read the verses slowly, twice. Then answer.',
    passage: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.',
    source: 'Proverbs 3:5-6 (KJV)',
    questions: [
      { q: 'What are we told not to lean on?', options: ['Other people', 'Our own understanding', 'Riches', 'Tradition'], answer: 1, tier: 1 },
      { q: 'What is promised to those who acknowledge him in all their ways?', options: ['Wealth', 'Long life', 'He shall direct their paths', 'Victory over enemies'], answer: 2, tier: 1 },
      { q: 'Fill the gap: "Trust in the LORD with ___ thine heart"', options: ['some of', 'all', 'part of', 'the whole of'], answer: 1, tier: 2 },
    ],
  },
  {
    id: 'verse-matthew-6-34', stat: 'FTH', kind: 'quiz', title: 'Matthew 6:34',
    how: 'Read the verse slowly, twice. Then answer.',
    passage: 'Take therefore no thought for the morrow: for the morrow shall take thought for the things of itself. Sufficient unto the day is the evil thereof.',
    source: 'Matthew 6:34 (KJV)',
    questions: [
      { q: 'What does this verse tell us not to take thought (worry) about?', options: ['Yesterday', 'Tomorrow', 'Our enemies', 'Food'], answer: 1, tier: 1 },
      { q: '"Sufficient unto the day is the evil thereof" means...', options: ['Every day is evil', 'Each day has enough trouble of its own', 'Evil will be defeated today', 'Do enough good each day'], answer: 1, tier: 2 },
    ],
  },
  {
    id: 'verse-joshua-1-9', stat: 'FTH', kind: 'quiz', title: 'Joshua 1:9',
    how: 'Read the verse slowly, twice. Then answer.',
    passage: 'Have not I commanded thee? Be strong and of a good courage; be not afraid, neither be thou dismayed: for the LORD thy God is with thee whithersoever thou goest.',
    source: 'Joshua 1:9 (KJV)',
    questions: [
      { q: 'What reason is given for not being afraid?', options: ['Joshua\'s army is large', 'The LORD is with him wherever he goes', 'The land is already won', 'Moses will return'], answer: 1, tier: 1 },
      { q: 'Fill the gap: "Be strong and of a good ___"', options: ['heart', 'courage', 'spirit', 'faith'], answer: 1, tier: 1 },
    ],
  },
  {
    id: 'prayer-acts', stat: 'FTH', kind: 'timer', title: 'Guided prayer', unit: 'seconds',
    how: 'Pray for {n} seconds, moving through Adoration, Confession, Thanksgiving and Supplication (requests for yourself and others).',
    curve: { base: 90, growth: 1.03, min: 60, max: 600 },
  },
];

export const questById = (id: string) => QUESTS.find((q) => q.id === id);
