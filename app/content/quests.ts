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
  /** What the quests train in real life. */
  about: string;
  /** What the stat does in boss fights (keep in sync with src/engine/combat.ts derive). */
  battle: string;
}

export const STAT_INFO: Record<StatId, StatInfo> = {
  STR: {
    id: 'STR', name: 'Strength', short: 'STR', blurb: 'Resistance training', color: 'var(--stat-str)',
    about: 'Bodyweight strength: push-ups, squats and holds that build muscle you use every day.',
    battle: 'Your main physical damage. Bosses with armor soak some of it.',
  },
  AGI: {
    id: 'AGI', name: 'Agility', short: 'AGI', blurb: 'Balance, coordination, mobility', color: 'var(--stat-agi)',
    about: 'Balance, coordination and mobility, the things that keep you moving well and falling less.',
    battle: 'Adds physical damage, raises your critical hit chance, and lets you dodge attacks (big special attacks are harder to dodge).',
  },
  STA: {
    id: 'STA', name: 'Stamina', short: 'STA', blurb: 'Endurance and breath', color: 'var(--stat-sta)',
    about: 'Endurance and breath control: planks, marching and steady breathing.',
    battle: 'Your HP. More stamina means you survive more hits.',
  },
  INT: {
    id: 'INT', name: 'Intellect', short: 'INT', blurb: 'Learning and patterns', color: 'var(--stat-int)',
    about: 'Focus and learning: reading closely, remembering what you read, and spotting patterns.',
    battle: 'Spell damage that ignores armor, plus an arcane ward that absorbs damage at the start of each fight.',
  },
  WIS: {
    id: 'WIS', name: 'Wisdom', short: 'WIS', blurb: 'Stoicism, perspective, emotional IQ', color: 'var(--stat-wis)',
    about: 'Perspective and emotional skill: Stoic ideas, naming feelings, and seeing problems at their real size.',
    battle: 'Boosts all your damage a little and blunts the boss\'s special attacks.',
  },
  FTH: {
    id: 'FTH', name: 'Faith', short: 'FTH', blurb: 'Bible reading and study', color: 'var(--stat-fth)',
    about: 'Reading and studying Scripture: understanding a passage and thinking about how it applies to your day.',
    battle: 'Stronger healing each turn, a little holy damage, and a chance to get back up once when you fall.',
  },
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
    id: 'read-psalm-23', stat: 'FTH', kind: 'quiz', title: 'Reading: Psalm 23',
    how: 'Read the psalm slowly, all the way through. Then answer without looking back.',
    passage:
      '1 The LORD is my shepherd; I shall not want.\n' +
      '2 He maketh me to lie down in green pastures: he leadeth me beside the still waters.\n' +
      '3 He restoreth my soul: he leadeth me in the paths of righteousness for his name\'s sake.\n' +
      '4 Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me; thy rod and thy staff they comfort me.\n' +
      '5 Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil; my cup runneth over.\n' +
      '6 Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever.',
    source: 'Psalm 23 (KJV)',
    questions: [
      { q: 'What picture of God opens the psalm?', options: ['A king', 'A shepherd', 'A warrior', 'A builder'], answer: 1, tier: 1 },
      { q: 'Why does the writer fear no evil in the dark valley?', options: ['The valley is short', 'His enemies are gone', '"Thou art with me"', 'He carries a rod'], answer: 2, tier: 1 },
      { q: 'Where is the table prepared?', options: ['Beside still waters', 'In the house of the LORD', 'In the presence of his enemies', 'In green pastures'], answer: 2, tier: 2 },
      { q: 'In verse 4 the writer stops talking about God ("he") and talks to God ("thou"). Where does that happen?', options: ['In the green pastures', 'In the valley of the shadow of death', 'At the table', 'In the house of the LORD'], answer: 1, why: 'The shift happens in the darkest moment of the psalm.', tier: 3 },
    ],
  },
  {
    id: 'read-wise-builder', stat: 'FTH', kind: 'quiz', title: 'Reading: the two builders',
    how: 'Read the passage slowly, all the way through. Then answer without looking back.',
    passage:
      '24 Therefore whosoever heareth these sayings of mine, and doeth them, I will liken him unto a wise man, which built his house upon a rock:\n' +
      '25 And the rain descended, and the floods came, and the winds blew, and beat upon that house; and it fell not: for it was founded upon a rock.\n' +
      '26 And every one that heareth these sayings of mine, and doeth them not, shall be likened unto a foolish man, which built his house upon the sand:\n' +
      '27 And the rain descended, and the floods came, and the winds blew, and beat upon that house; and it fell: and great was the fall of it.',
    source: 'Matthew 7:24-27 (KJV)',
    questions: [
      { q: 'What makes the first builder wise?', options: ['He builds quickly', 'He hears these sayings and does them', 'He builds a bigger house', 'He avoids the storm'], answer: 1, tier: 1 },
      { q: 'Which house faced the storm?', options: ['Only the house on sand', 'Only the house on rock', 'Both houses', 'Neither house'], answer: 2, why: 'Both faced the same rain, floods and wind. Only the foundation differed.', tier: 2 },
      { q: 'The foolish builder also heard the sayings. What was missing?', options: ['Understanding them', 'Doing them', 'Remembering them', 'Teaching them'], answer: 1, tier: 2 },
    ],
  },
  {
    id: 'read-lost-sheep', stat: 'FTH', kind: 'quiz', title: 'Reading: the lost sheep',
    how: 'Read the parable slowly, all the way through. Then answer without looking back.',
    passage:
      '4 What man of you, having an hundred sheep, if he lose one of them, doth not leave the ninety and nine in the wilderness, and go after that which is lost, until he find it?\n' +
      '5 And when he hath found it, he layeth it on his shoulders, rejoicing.\n' +
      '6 And when he cometh home, he calleth together his friends and neighbours, saying unto them, Rejoice with me; for I have found my sheep which was lost.\n' +
      '7 I say unto you, that likewise joy shall be in heaven over one sinner that repenteth, more than over ninety and nine just persons, which need no repentance.',
    source: 'Luke 15:4-7 (KJV)',
    questions: [
      { q: 'How long does the shepherd search?', options: ['Until nightfall', 'Until he finds it', 'Three days', 'Until the others wander'], answer: 1, tier: 1 },
      { q: 'How does he carry the sheep home?', options: ['On his shoulders, rejoicing', 'By a rope', 'With his staff', 'His neighbours carry it'], answer: 0, tier: 1 },
      { q: 'What does the lost sheep stand for in verse 7?', options: ['A lost possession', 'One sinner who repents', 'The ninety and nine', 'The shepherd\'s friends'], answer: 1, tier: 2 },
    ],
  },
  {
    id: 'read-james-1', stat: 'FTH', kind: 'quiz', title: 'Reading: James 1:2-5',
    how: 'Read the passage slowly, all the way through. Then answer without looking back.',
    passage:
      '2 My brethren, count it all joy when ye fall into divers temptations;\n' +
      '3 Knowing this, that the trying of your faith worketh patience.\n' +
      '4 But let patience have her perfect work, that ye may be perfect and entire, wanting nothing.\n' +
      '5 If any of you lack wisdom, let him ask of God, that giveth to all men liberally, and upbraideth not; and it shall be given him.',
    source: 'James 1:2-5 (KJV)',
    questions: [
      { q: 'According to verse 3, what does the trying of faith produce?', options: ['Fear', 'Patience', 'Riches', 'Doubt'], answer: 1, tier: 1 },
      { q: 'What should someone who lacks wisdom do?', options: ['Study harder alone', 'Ask of God', 'Wait for trials to end', 'Ask the elders'], answer: 1, tier: 1 },
      { q: '"Upbraideth not" means God gives...', options: ['Only to the wise', 'Without scolding the one who asks', 'Slowly', 'Only after testing'], answer: 1, tier: 3 },
    ],
  },
  {
    id: 'study-philippians-4', stat: 'FTH', kind: 'reflection', title: 'Study: Philippians 4:6-7',
    how: 'Read the passage twice, then study it with the questions. Take two or three minutes.',
    passage:
      '6 Be careful for nothing; but in every thing by prayer and supplication with thanksgiving let your requests be made known unto God.\n' +
      '7 And the peace of God, which passeth all understanding, shall keep your hearts and minds through Christ Jesus.',
    source: 'Philippians 4:6-7 (KJV). "Be careful for nothing" means "do not be anxious about anything."',
    prompt: 'Observe: what is the instruction in verse 6, and what is the promise in verse 7? Notice the word "keep": it is a guard\'s word.\n\nApply: name one worry you are carrying right now. What would it look like to hand it over, with thanks?',
  },
  {
    id: 'study-1-cor-13', stat: 'FTH', kind: 'reflection', title: 'Study: 1 Corinthians 13:4-7',
    how: 'Read the passage twice, then study it with the questions. Take two or three minutes.',
    passage:
      '4 Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself, is not puffed up,\n' +
      '5 Doth not behave itself unseemly, seeketh not her own, is not easily provoked, thinketh no evil;\n' +
      '6 Rejoiceth not in iniquity, but rejoiceth in the truth;\n' +
      '7 Beareth all things, believeth all things, hopeth all things, endureth all things.',
    source: '1 Corinthians 13:4-7 (KJV). "Charity" here is love; "vaunteth" means boasts.',
    prompt: 'Observe: count what love does and what love does not do. Which list is longer?\n\nApply: pick the one line that is hardest for you this week. Who is one person you could show it to today?',
  },
];

export const questById = (id: string) => QUESTS.find((q) => q.id === id);
