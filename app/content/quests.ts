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
  /** Exercise guide: step-by-step form, plus an animated picture from public/exercises/<art>.png. */
  guide?: ExerciseGuide;
}

export interface ExerciseGuide {
  art?: string;
  /** Draw a wall behind the picture (wall sit). */
  wall?: boolean;
  steps: string[];
  /** An easier version, so anyone can start. */
  easier?: string;
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
    guide: {
      art: 'pushups',
      steps: [
        "Hands on the floor a little wider than your shoulders.",
        "Walk your feet back until your body is one straight line, head to heels.",
        "Bend your elbows to lower your chest toward the floor, elbows angled back, not flared out.",
        "Push the floor away to come back up. That's one.",
      ],
      easier: "Knees on the floor, or hands on a wall or countertop.",
    },
  },
  {
    id: 'squats', stat: 'STR', kind: 'reps', title: 'Slow squats', unit: 'reps',
    how: 'Do {n} squats: 3 seconds down, 1 second up. Chest tall, knees track over toes.',
    curve: { base: 8, growth: 1.06, min: 5, max: 80 }, safety: PHYS_SAFETY,
    guide: {
      art: 'squats',
      steps: [
        "Feet shoulder-width apart, toes turned out a little.",
        "Reach your arms forward for balance.",
        "Sit your hips back and down for a slow count of 3, chest tall, knees following your toes.",
        "Go as low as is comfortable, then stand up in 1 count.",
      ],
      easier: "Squat down to a chair and stand back up.",
    },
  },
  {
    id: 'wall-sit', stat: 'STR', kind: 'timer', title: 'Wall sit', unit: 'seconds',
    how: 'Back flat on a wall, thighs as close to level as you can. Hold for {n} seconds.',
    curve: { base: 20, growth: 1.05, min: 10, max: 240 }, safety: PHYS_SAFETY,
    guide: {
      art: 'wall-sit',
      wall: true,
      steps: [
        "Stand with your back flat against a wall.",
        "Walk your feet out about two steps.",
        "Slide down until your knees are bent, as close to a right angle as you can.",
        "Keep your back on the wall and hold. Hands rest on your thighs.",
      ],
      easier: "Don't slide down as far.",
    },
  },

  // ---------------- AGI ----------------
  {
    id: 'balance', stat: 'AGI', kind: 'timer', title: 'Single-leg balance', unit: 'seconds',
    how: 'Stand on one leg for {n} seconds, then switch. Harder: close your eyes. Stay near something to grab.',
    curve: { base: 20, growth: 1.05, min: 10, max: 120 },
    placement: { ask: 'How many seconds can you balance on one leg, eyes open?', unit: 'seconds' },
    safety: 'Keep a wall or chair within reach.',
    guide: {
      art: 'balance',
      steps: [
        "Stand tall near a wall or chair you can grab.",
        "Shift your weight onto one foot and lift the other knee.",
        "Arms out to the sides if it helps. Fix your eyes on one spot.",
        "Hold, then switch legs.",
      ],
      easier: "Keep the lifted toes lightly touching the floor.",
    },
  },
  {
    id: 'mobility-flow', stat: 'AGI', kind: 'timer', title: 'Hip and spine flow', unit: 'seconds',
    how: 'Move slowly for {n} seconds: hip circles, cat-cow, world\'s greatest stretch each side. Smooth, no bouncing.',
    curve: { base: 45, growth: 1.03, min: 30, max: 180 }, safety: PHYS_SAFETY,
    guide: {
      art: 'mobility-flow',
      steps: [
        "Hip circles: hands on hips, slow big circles each way.",
        "Cat-cow: on hands and knees, round your back up, then let it sag gently, slowly.",
        "World's greatest stretch: step into a long lunge, hand down inside your front foot, then reach that arm up to the sky. Switch sides.",
        "Move smoothly and breathe. No bouncing.",
      ],
      easier: "Hip circles only.",
    },
  },
  {
    id: 'toe-taps', stat: 'AGI', kind: 'reps', title: 'Cross-body toe taps', unit: 'reps',
    how: 'Standing, tap right hand to left foot, then left hand to right foot. Do {n} taps total, steady rhythm.',
    curve: { base: 16, growth: 1.05, min: 10, max: 100 }, safety: PHYS_SAFETY,
    guide: {
      art: 'toe-taps',
      steps: [
        "Stand with feet wider than your hips.",
        "Hinge at the hips and reach your right hand toward your left foot.",
        "Come up, then reach your left hand toward your right foot.",
        "Keep a steady rhythm. Reaching your shin counts too.",
      ],
      easier: "Tap your knees instead of your toes.",
    },
  },

  // ---------------- STA ----------------
  {
    id: 'plank', stat: 'STA', kind: 'timer', title: 'Plank', unit: 'seconds',
    how: 'Forearm plank for {n} seconds. Squeeze glutes, don\'t let hips sag.',
    curve: { base: 20, growth: 1.05, min: 10, max: 300 },
    placement: { ask: 'How many seconds can you hold a forearm plank?', unit: 'seconds' },
    safety: PHYS_SAFETY,
    guide: {
      art: 'plank',
      steps: [
        "Forearms on the floor, elbows under your shoulders.",
        "Step your feet back so your body is one straight line.",
        "Squeeze your glutes and brace your belly like you're about to be poked.",
        "Don't let your hips sag or pike up. Breathe and hold.",
      ],
      easier: "Knees down, body straight from knees to head.",
    },
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
    guide: {
      art: 'march',
      steps: [
        "Stand tall.",
        "Drive one knee up to hip height while the opposite arm swings forward.",
        "Switch, and keep a brisk rhythm.",
        "Stay light on your feet.",
      ],
      easier: "Lift your knees only as high as feels good.",
    },
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

  // ---- Playtest batch: STR ----
  {
    id: 'reverse-lunges', stat: 'STR', kind: 'reps', title: 'Reverse lunges', unit: 'reps',
    how: 'Do {n} reverse lunges, alternating legs. Step back, lower slowly, drive up through the front heel.',
    curve: { base: 8, growth: 1.06, min: 4, max: 60 }, safety: PHYS_SAFETY,
    guide: {
      art: 'reverse-lunges',
      steps: [
        "Stand tall, feet hip-width apart.",
        "Take a long step back with one foot.",
        "Lower until both knees are bent and the back knee nearly touches the floor. Front knee stays over the ankle.",
        "Push through your front heel to stand back up. Switch legs. Each leg counts as one.",
      ],
      easier: "Hold a chair or wall, and only go part of the way down.",
    },
  },
  {
    id: 'calf-raises', stat: 'STR', kind: 'reps', title: 'Slow calf raises', unit: 'reps',
    how: 'Do {n} calf raises: 2 seconds up onto your toes, a short pause, 2 seconds down.',
    curve: { base: 12, growth: 1.05, min: 8, max: 80 }, safety: PHYS_SAFETY,
    guide: {
      steps: [
        "Stand tall with a hand on a wall or chair for balance.",
        "Rise onto the balls of your feet for a slow count of 2.",
        "Pause at the top and squeeze.",
        "Lower your heels for a slow count of 2.",
      ],
      easier: "Smaller raises, both feet. Harder: one foot at a time.",
    },
  },
  {
    id: 'shoulder-taps', stat: 'STR', kind: 'reps', title: 'Plank shoulder taps', unit: 'reps',
    how: 'From the top of a push-up, tap each hand to the opposite shoulder. Do {n} taps total, hips steady.',
    curve: { base: 10, growth: 1.05, min: 6, max: 60 }, safety: PHYS_SAFETY,
    guide: {
      art: 'shoulder-taps',
      steps: [
        "Start at the top of a push-up, hands under your shoulders.",
        "Widen your feet a little for balance.",
        "Lift one hand and tap the opposite shoulder, then put it back down.",
        "Switch hands. Keep your hips from rocking side to side.",
      ],
      easier: "Knees on the floor, or hands on a countertop.",
    },
  },

  // ---- Playtest batch: AGI ----
  {
    id: 'heel-toe-walk', stat: 'AGI', kind: 'reps', title: 'Heel-to-toe walk', unit: 'reps',
    how: 'Walk a straight line, heel touching toe with every step. Take {n} steps, then turn and walk back.',
    curve: { base: 12, growth: 1.05, min: 8, max: 60 },
    safety: 'Walk beside a wall or counter you can touch.',
    guide: {
      art: 'heel-toe-walk',
      steps: [
        "Stand next to a wall or counter.",
        "Put one foot directly in front of the other, heel touching the toes of the back foot.",
        "Look ahead, not down, and keep your arms loose or out to the sides.",
        "Step slowly. Each step counts as one.",
      ],
      easier: "Leave a small gap between heel and toe.",
    },
  },
  {
    id: 'clock-reach', stat: 'AGI', kind: 'reps', title: 'Clock reach', unit: 'reps',
    how: 'Balance on one leg and reach the other foot to 12, 3 and 6 o\'clock on an imaginary clock. Do {n} taps, then switch legs.',
    curve: { base: 9, growth: 1.05, min: 6, max: 45 },
    safety: 'Keep a wall or chair within reach.',
    guide: {
      art: 'clock-reach',
      steps: [
        "Stand on one leg near a wall or chair, standing knee slightly soft.",
        "Picture a clock on the floor around you.",
        "Lightly tap the free foot forward (12), out to the side (3), then behind you (6). Each tap counts.",
        "Return to the middle between taps without putting weight on that foot. Then switch legs.",
      ],
      easier: "Shorter reaches, or hold the wall with one finger.",
    },
  },
  {
    id: 'deep-squat-hold', stat: 'AGI', kind: 'timer', title: 'Deep squat hold', unit: 'seconds',
    how: 'Sink into a deep, comfortable squat and stay there for {n} seconds. Heels down if you can, chest up.',
    curve: { base: 20, growth: 1.05, min: 15, max: 180 }, safety: PHYS_SAFETY,
    guide: {
      art: 'deep-squat-hold',
      steps: [
        "Feet a bit wider than your hips, toes turned out.",
        "Lower your hips as far as is comfortable.",
        "Press your elbows gently against your inner knees and lift your chest.",
        "Breathe slowly and let your hips relax a little more each breath.",
      ],
      easier: "Hold a door frame or table, or sit your hips on a low step.",
    },
  },

  // ---- Playtest batch: STA ----
  {
    id: 'step-jacks', stat: 'STA', kind: 'timer', title: 'Step jacks', unit: 'seconds',
    how: 'Step one foot out while your arms sweep overhead, then back in. Alternate sides, brisk pace, for {n} seconds.',
    curve: { base: 30, growth: 1.04, min: 20, max: 240 }, safety: PHYS_SAFETY,
    guide: {
      art: 'step-jacks',
      steps: [
        "Stand tall, arms by your sides.",
        "Step one foot out to the side as both arms sweep up overhead.",
        "Bring the foot back in as the arms come down.",
        "Alternate sides at a brisk pace. Harder: jump both feet out (jumping jacks).",
      ],
      easier: "Arms only to shoulder height, slower pace.",
    },
  },
  {
    id: 'shadow-boxing', stat: 'STA', kind: 'timer', title: 'Shadow boxing', unit: 'seconds',
    how: 'Fists up, light on your feet. Throw steady punches at the air for {n} seconds, never locking your elbows.',
    curve: { base: 30, growth: 1.04, min: 20, max: 240 }, safety: 'Don\'t snap your elbows straight. Keep punches smooth.',
    guide: {
      art: 'shadow-boxing',
      steps: [
        "Stand with one foot a half step ahead, knees soft, fists by your cheeks.",
        "Punch straight out with the front hand, then bring it back to your face.",
        "Punch with the back hand, turning your hips and back heel with it.",
        "Keep moving: bounce lightly, mix in fast pairs. Don't fully lock your elbows.",
      ],
      easier: "Stay flat-footed and punch at half speed.",
    },
  },
  {
    id: 'mountain-climbers', stat: 'STA', kind: 'timer', title: 'Mountain climbers', unit: 'seconds',
    how: 'From the top of a push-up, drive your knees toward your chest one at a time for {n} seconds.',
    curve: { base: 20, growth: 1.04, min: 15, max: 150 }, safety: PHYS_SAFETY,
    guide: {
      art: 'mountain-climbers',
      steps: [
        "Start at the top of a push-up, hands under your shoulders.",
        "Pull one knee toward your chest.",
        "Switch legs, stepping or running the feet.",
        "Keep your hips low and your shoulders over your hands.",
      ],
      easier: "Hands on a couch or counter, and step instead of run.",
    },
  },

  // ---- Playtest batch: INT ----
  {
    id: 'reading-blue-sky', stat: 'INT', kind: 'quiz', title: 'Reading: why the sky is blue',
    how: 'Read the passage once, then answer without looking back.',
    passage:
      'Sunlight looks white, but it is a mix of every color. As it passes through the air, it bumps into gas molecules far smaller than its wavelength. ' +
      'These tiny molecules scatter short wavelengths, like blue and violet, much more strongly than long ones, like red. ' +
      'So blue light gets bounced around the whole sky and reaches your eyes from every direction. There is even more violet scattered, ' +
      'but sunlight carries less of it and our eyes are less sensitive to it, so the sky looks blue. At sunset, light crosses much more air ' +
      'before it reaches you. Most of the blue is scattered away along the path, leaving the reds and oranges.',
    questions: [
      { q: 'Which light do air molecules scatter most strongly?', options: ['Long wavelengths like red', 'Short wavelengths like blue and violet', 'All colors equally', 'Only white light'], answer: 1, tier: 1 },
      { q: 'Why does the sky look blue rather than violet?', options: ['Violet is not scattered', 'Clouds absorb violet', 'Sunlight has less violet, and our eyes are less sensitive to it', 'Violet only appears at night'], answer: 2, tier: 2 },
      { q: 'Why are sunsets red and orange?', options: ['The sun cools down in the evening', 'Light crosses more air, so most of the blue is scattered away', 'Dust turns the light red', 'Air molecules get bigger at night'], answer: 1, tier: 1 },
    ],
  },
  {
    id: 'reading-octopus', stat: 'INT', kind: 'quiz', title: 'Reading: octopus camouflage',
    how: 'Read the passage once, then answer without looking back.',
    passage:
      'An octopus can change color in less than a second. Its skin holds thousands of tiny elastic sacs of pigment called chromatophores. ' +
      'Each sac is ringed by small muscles wired to the nervous system. When the muscles pull, the sac stretches wide and its color shows; ' +
      'when they relax, it shrinks to a dot. Beneath these sacs, other cells reflect light to add shimmer and white. ' +
      'Octopuses can also change texture, raising small bumps in their skin to match rock or seaweed. Color and texture together let them disappear against the seafloor.',
    questions: [
      { q: 'What are chromatophores?', options: ['Light-making organs', 'Elastic sacs of pigment in the skin', 'Bumps that change texture', 'Special eyes in the skin'], answer: 1, tier: 1 },
      { q: 'What makes a chromatophore show its color?', options: ['It fills with ink', 'Muscles stretch it wide', 'It heats up', 'It absorbs seawater'], answer: 1, tier: 2 },
      { q: 'Besides color, what else can an octopus change to blend in?', options: ['Its size', 'Its skin texture', 'Its number of arms', 'Its temperature'], answer: 1, tier: 1 },
    ],
  },
  {
    id: 'reading-longitude', stat: 'INT', kind: 'quiz', title: 'Reading: the longitude problem',
    how: 'Read the passage once, then answer without looking back.',
    passage:
      'For centuries, sailors could find their latitude, how far north or south they were, from the height of the sun or stars. ' +
      'Longitude, how far east or west, was much harder. The Earth turns 360 degrees in 24 hours, or 15 degrees every hour. ' +
      'So if a navigator knew the time back at the home port and compared it with local noon at sea, the difference gave the longitude. ' +
      'The catch was keeping accurate home time on a rolling, damp ship. Pendulum clocks failed at sea. In the 1700s, a clockmaker named John Harrison ' +
      'spent decades building sea clocks steady enough to do it, and his work helped make long voyages far safer.',
    questions: [
      { q: 'How many degrees does the Earth turn each hour?', options: ['10', '15', '24', '30'], answer: 1, tier: 1 },
      { q: 'What did a navigator compare to find longitude?', options: ['The height of two stars', 'Home-port time with local noon', 'The ship\'s speed with the wind', 'Two compass readings'], answer: 1, tier: 2 },
      { q: 'Why did ordinary pendulum clocks fail at sea?', options: ['Salt rusted the numbers', 'The ship\'s rolling and damp threw them off', 'Sailors forgot to wind them', 'They ran too fast in the sun'], answer: 1, tier: 2 },
    ],
  },

  // ---- Playtest batch: WIS ----
  {
    id: 'thinking-traps', stat: 'WIS', kind: 'quiz', title: 'Spot the thinking trap',
    how: 'Our minds take shortcuts that make things feel worse than they are. Name the trap in each thought.',
    passage:
      'Catastrophizing: jumping to the worst possible outcome.\n' +
      'Mind reading: assuming you know what others think.\n' +
      'All-or-nothing: seeing only total success or total failure.\n' +
      'Should statements: rigid rules about how you or others must be.',
    questions: [
      { q: '"My boss said \'let\'s talk tomorrow.\' I\'m definitely getting fired."', options: ['Should statements', 'Catastrophizing', 'All-or-nothing', 'Mind reading'], answer: 1, tier: 1 },
      { q: '"They didn\'t reply to my text. They must think I\'m annoying."', options: ['Mind reading', 'Should statements', 'Catastrophizing', 'All-or-nothing'], answer: 0, tier: 1 },
      { q: '"I skipped one workout, so the whole week is ruined."', options: ['Mind reading', 'Catastrophizing', 'All-or-nothing', 'Should statements'], answer: 2, tier: 2 },
      { q: '"I should never feel nervous. Strong people don\'t."', options: ['All-or-nothing', 'Should statements', 'Mind reading', 'Catastrophizing'], answer: 1, tier: 2, why: 'A rigid rule about how you must be. Everyone feels nervous sometimes.' },
    ],
  },
  {
    id: 'evening-review', stat: 'WIS', kind: 'reflection', title: 'The evening review',
    how: 'Seneca ended each day by quietly reviewing it, not to scold himself, but to learn. Take two minutes.',
    source: 'Idea drawn from Seneca, On Anger 3.36',
    prompt: 'Look back over today. What did you do well? Where did you fall short of who you want to be? What is one thing you will do differently tomorrow?',
  },
  {
    id: 'rehearse-hard-thing', stat: 'WIS', kind: 'reflection', title: 'Rehearse the hard thing',
    how: 'The Stoics pictured setbacks in advance so they would meet them calmly instead of being caught off guard. Take two minutes.',
    source: 'Idea drawn from Seneca\'s letters (premeditatio malorum)',
    prompt: 'Think of something coming up that could go badly. Picture it going wrong in a realistic way. How do you want to respond if it does? What can you do now to make it less likely?',
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
