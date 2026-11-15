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
      { q: 'You prepared well, but the interview went to someone else. What was up to you?', options: ['Who got the job', 'Your preparation and your response now', 'Whether they noticed your strengths', 'How the other candidates did'], answer: 1, tier: 1 },
      { q: 'A driver cuts you off. The Stoic first move is to...', options: ['Honk so they learn a lesson', 'Notice your judgment and choose a response', 'Push the anger down and act calm', 'Remind yourself most drivers are worse'], answer: 1, why: 'The Stoics did not deny feelings. The first step is catching the judgment ("this is an outrage") before acting on it.', tier: 2 },
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
      { q: 'Why does the sky look blue rather than violet?', options: ['Violet is scattered less than blue, so less of it reaches us', 'High clouds absorb most of the violet before we see it', 'Sunlight has less violet, and our eyes are less sensitive to it', 'Violet light is too faint for air molecules to scatter'], answer: 2, tier: 2 },
      { q: 'Why are sunsets red and orange?', options: ['The sun gives off redder light near the horizon', 'Light crosses more air, so most of the blue is scattered away', 'Red light is scattered more at low angles', 'The air cools and changes color in the evening'], answer: 1, tier: 1 },
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
      { q: 'What are chromatophores?', options: ['Light-making organs', 'Elastic sacs of pigment in the skin', 'Bumps that change texture', 'Glands that release ink'], answer: 1, tier: 1 },
      { q: 'What makes a chromatophore show its color?', options: ['It fills with ink', 'Muscles stretch it wide', 'It heats up', 'It absorbs seawater'], answer: 1, tier: 2 },
      { q: 'Besides color, what else can an octopus change to blend in?', options: ['Its size', 'Its skin texture', 'How much light it gives off', 'Its body temperature'], answer: 1, tier: 1 },
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
      { q: 'Why did ordinary pendulum clocks fail at sea?', options: ['Salt air jammed the gears', 'The ship\'s rolling and damp threw them off', 'Iron on board pulled the pendulum', 'They were too large to fit below deck'], answer: 1, tier: 2 },
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

  // ---- Variety batch: INT ----
  {
    id: 'reading-eratosthenes', stat: 'INT', kind: 'quiz', title: 'Reading: measuring the Earth',
    how: 'Read the passage once, then answer without looking back.',
    passage:
      'Around 240 BC, a librarian in Alexandria named Eratosthenes heard that in the southern town of Syene, at noon on the longest day of the year, ' +
      'the sun shone straight down a deep well and lit the water at the bottom. In Alexandria, at the same moment, a vertical pole still cast a short shadow. ' +
      'He measured the shadow\'s angle at about one fiftieth of a full circle. If the Earth was round, that angle was the slice of the globe between the two towns. ' +
      'So the Earth\'s full circumference had to be about fifty times the distance from Alexandria to Syene. His answer landed remarkably close to the real size.',
    questions: [
      { q: 'What did the sun do at noon in Syene that caught his attention?', options: ['It set earlier than in Alexandria', 'It shone straight down a deep well', 'It looked larger than usual', 'Poles cast unusually long shadows'], answer: 1, tier: 1 },
      { q: 'What was different in Alexandria at the same moment?', options: ['The sun was straight overhead there too', 'A vertical pole cast a short shadow', 'Shadows pointed north instead of south', 'The sun was already setting'], answer: 1, tier: 1 },
      { q: 'Why multiply the distance between the towns by fifty?', options: ['The shadow was one fiftieth of the pole\'s height', 'The shadow angle was one fiftieth of a circle', 'The well was fifty cubits deep', 'Syene was fifty days\' walk away'], answer: 1, tier: 2 },
      { q: 'What assumption did the whole method depend on?', options: ['The sun is close enough to measure', 'The Earth is round', 'Both towns are near the equator', 'Shadows are the same length everywhere'], answer: 1, why: 'On a flat Earth both places would see the same shadow.', tier: 3 },
    ],
  },
  {
    id: 'reading-spacing', stat: 'INT', kind: 'quiz', title: 'Reading: how memory sticks',
    how: 'Read the passage once, then answer without looking back.',
    passage:
      'In the 1880s, Hermann Ebbinghaus memorized lists of nonsense syllables and tracked how fast he forgot them. Most of the loss came quickly, within the first day, then slowed down. ' +
      'He also found that reviewing a list spread over several days kept it in memory far longer than the same amount of practice crammed into one sitting. ' +
      'Later research added a second lesson: trying to recall something, like quizzing yourself, strengthens memory more than simply rereading it. ' +
      'The struggle to pull an answer out is part of what makes it stick.',
    questions: [
      { q: 'When did most of the forgetting happen?', options: ['After a month', 'Within the first day', 'Only after sleep', 'Evenly over a week'], answer: 1, tier: 1 },
      { q: 'Which kept a list in memory longest?', options: ['One long cramming session', 'Reviews spread over several days', 'Rereading it many times in one evening', 'Copying it out by hand once'], answer: 1, tier: 1 },
      { q: 'According to later research, what beats rereading?', options: ['Highlighting', 'Quizzing yourself', 'Reading faster', 'Copying it out'], answer: 1, tier: 2 },
      { q: 'Why does answering these questions without looking back help?', options: ['It checks that you read carefully', 'The effort of recalling strengthens memory', 'Rereading would take longer', 'Short passages are easier to remember'], answer: 1, tier: 2 },
    ],
  },
  {
    id: 'reading-arch', stat: 'INT', kind: 'quiz', title: 'Reading: the stone arch',
    how: 'Read the passage once, then answer without looking back.',
    passage:
      'A flat stone beam over a doorway can snap under its own weight. Roman builders spanned wide gaps with arches instead. ' +
      'An arch is made of wedge-shaped stones, and each wedge pushes against its neighbors, turning the weight above into a squeeze that travels around the curve and down into the supports. ' +
      'While it was being built, the arch rested on a temporary wooden frame. The last stone set was the keystone at the very top. ' +
      'Once it was in, the frame could be pulled away and the arch held itself up. The supports at each end had to be heavy, because an arch also pushes outward.',
    questions: [
      { q: 'What held the stones up while the arch was being built?', options: ['Fresh mortar between the stones', 'A temporary wooden frame', 'Iron rods hidden inside', 'Ropes from a crane above'], answer: 1, tier: 1 },
      { q: 'Which stone was placed last?', options: ['The first stone at the base', 'The keystone at the top', 'The two stones at the sides', 'Whichever stone fit best'], answer: 1, tier: 1 },
      { q: 'Why did the end supports need to be heavy?', options: ['To carry the wooden frame', 'Because an arch also pushes outward', 'To stop the arch sinking into the ground', 'Because the keystone is the heaviest stone'], answer: 1, tier: 2 },
      { q: 'What does the wedge shape do?', options: ['Lets each stone carry only its own weight', 'Turns weight into a squeeze around the curve', 'Pushes the weight up into the keystone', 'Makes the arch lighter than a flat beam'], answer: 1, tier: 3 },
    ],
  },
  {
    id: 'reading-monarchs', stat: 'INT', kind: 'quiz', title: 'Reading: the monarch migration',
    how: 'Read the passage once, then answer without looking back.',
    passage:
      'Each autumn, monarch butterflies from eastern North America fly south, some as far as 3,000 miles, to spend winter clustered on fir trees in the mountains of central Mexico. ' +
      'The butterflies that make this trip are special: summer monarchs live only a few weeks, but the migrating generation can live around eight months. ' +
      'No single butterfly makes the full round trip. In spring the travelers head north and lay eggs, and it takes several generations to reach the northern range again. ' +
      'They steer using the sun, and an internal clock, partly kept in their antennae, corrects for the sun moving across the sky.',
    questions: [
      { q: 'Where do eastern monarchs spend the winter?', options: ['The coast of southern Florida', 'Mountains of central Mexico', 'Forests along the Gulf Coast', 'Islands in the Caribbean'], answer: 1, tier: 1 },
      { q: 'How long can the migrating generation live?', options: ['A few days', 'A few weeks', 'Around eight months', 'Several years'], answer: 2, tier: 1 },
      { q: 'How many butterflies make the full round trip?', options: ['Most of them', 'Only the strongest', 'None', 'About half'], answer: 2, why: 'It takes several generations to get back north.', tier: 2 },
      { q: 'What is the internal clock for?', options: ['Telling the butterflies when to rest each night', 'Correcting for the sun moving across the sky', 'Timing when to lay eggs on the way north', 'Knowing when autumn has arrived to leave'], answer: 1, tier: 3 },
    ],
  },
  {
    id: 'reading-sourdough', stat: 'INT', kind: 'quiz', title: 'Reading: the living loaf',
    how: 'Read the passage once, then answer without looking back.',
    passage:
      'A sourdough starter is just flour and water, but it is alive. Wild yeast and bacteria settle in and feed on the flour. ' +
      'The yeast give off carbon dioxide gas, and stretchy gluten in the dough traps the bubbles, which is what makes the bread rise. ' +
      'The bacteria give off acids, which add the sour taste and help the bread keep. ' +
      'Bakers "feed" a starter by throwing out some of it and adding fresh flour and water, and some starters have been kept going for decades.',
    questions: [
      { q: 'What makes the bread rise?', options: ['Acid from the bacteria', 'Gas from yeast trapped by gluten', 'Steam from the water as it bakes', 'Air folded in while kneading'], answer: 1, tier: 1 },
      { q: 'Where does the sour taste come from?', options: ['Vinegar added by the baker', 'Acids from the bacteria', 'Flour that has started to spoil', 'The yeast\'s gas'], answer: 1, tier: 1 },
      { q: 'What does "feeding" a starter involve?', options: ['Adding a spoonful of sugar', 'Removing some and adding fresh flour and water', 'Stirring in a little of the last loaf', 'Adding fresh store-bought yeast'], answer: 1, tier: 2 },
    ],
  },
  {
    id: 'logic-puzzles', stat: 'INT', kind: 'quiz', title: 'Brain teasers',
    how: 'Each puzzle has a tempting wrong answer. Slow down before you pick.',
    passage: 'Take your time. The first answer that jumps out is often the trap.',
    questions: [
      { q: 'A bat and a ball cost $1.10 together. The bat costs $1.00 more than the ball. How much is the ball?', options: ['10 cents', '5 cents', '1 cent', '15 cents'], answer: 1, why: 'Ball 5 cents, bat $1.05: together $1.10.', tier: 1 },
      { q: 'All bloops are razzies, and all razzies are lazzies. Are all bloops lazzies?', options: ['Yes', 'No', 'Only some', 'You can\'t tell'], answer: 0, tier: 1 },
      { q: 'In a race, you pass the runner in second place. What place are you in now?', options: ['First', 'Second', 'Third', 'Depends on the race'], answer: 1, why: 'You took their spot. The leader is still ahead.', tier: 1 },
      { q: 'If 5 machines take 5 minutes to make 5 widgets, how long do 100 machines take to make 100 widgets?', options: ['100 minutes', '20 minutes', '5 minutes', '1 minute'], answer: 2, why: 'Each machine makes one widget in 5 minutes.', tier: 2 },
      { q: 'A lily patch doubles in size every day. It covers the whole lake on day 48. On what day did it cover half?', options: ['Day 24', 'Day 47', 'Day 36', 'Day 46'], answer: 1, tier: 2 },
      { q: 'A farmer has 17 sheep. All but 9 run away. How many are left?', options: ['8', '9', '17', '0'], answer: 1, tier: 3 },
    ],
  },

  // ---- Variety batch: WIS ----
  {
    id: 'spot-the-bias', stat: 'WIS', kind: 'quiz', title: 'Spot the bias',
    how: 'Everyone\'s judgment has blind spots. Name the one behind each thought.',
    passage:
      'Sunk cost: sticking with something because of what you already put in.\n' +
      'Confirmation bias: noticing only the evidence that agrees with you.\n' +
      'Spotlight effect: overestimating how much others notice you.\n' +
      'Anchoring: leaning too hard on the first number you hear.',
    questions: [
      { q: '"This movie is awful, but I paid for the ticket, so I\'m staying to the end."', options: ['Anchoring', 'Sunk cost', 'Spotlight effect', 'Confirmation bias'], answer: 1, tier: 1 },
      { q: '"Everyone saw me trip on the stairs. They\'ll be talking about it all week."', options: ['Spotlight effect', 'Sunk cost', 'Anchoring', 'Confirmation bias'], answer: 0, tier: 1 },
      { q: '"The first one I saw was $900, so this $600 one is a steal."', options: ['Confirmation bias', 'Spotlight effect', 'Anchoring', 'Sunk cost'], answer: 2, tier: 2 },
      { q: '"I only read the reviews that say I picked the right phone."', options: ['Sunk cost', 'Anchoring', 'Spotlight effect', 'Confirmation bias'], answer: 3, tier: 2 },
    ],
  },
  {
    id: 'listen-first', stat: 'WIS', kind: 'quiz', title: 'Listen first',
    how: 'Pick the response that helps the other person feel heard.',
    passage: 'When someone shares a problem, we often jump to fixing it, comparing it with our own, or cheering them up. Feeling heard usually has to come first: say back what you heard, then ask what they need.',
    questions: [
      { q: 'A friend says, "Work has been brutal this week." The best first reply is...', options: ['"Oh no, same here. Mine\'s been crazy too."', '"Have you talked to your manager about it?"', '"That sounds exhausting. What\'s been the hardest part?"', '"At least the weekend is almost here."'], answer: 2, tier: 1 },
      { q: 'Someone says, "They planned the trip without even asking me." Which reply reflects what you heard?', options: ['"I\'m sure they didn\'t mean it."', '"So you felt left out?"', '"You should plan your own trip."', '"That happened to me once too."'], answer: 1, tier: 1 },
      { q: 'When is advice most welcome?', options: ['As soon as you can see the fix', 'When they ask, or once they feel heard', 'When the problem is serious', 'When you have been through the same thing'], answer: 1, why: 'Fixing, comparing and silver linings are all kind instincts, but they skip the part where the person feels understood.', tier: 2 },
    ],
  },
  {
    id: 'seneca-time', stat: 'WIS', kind: 'quiz', title: 'Seneca on time',
    how: 'Read the idea, then answer.',
    passage: 'Seneca argued that life is not short; we make it short by wasting it. People guard their money and property carefully, yet hand out their hours to anyone who asks, as if time cost nothing. Used well, he said, a life is long enough for great things.',
    source: 'Paraphrased from Seneca, On the Shortness of Life',
    questions: [
      { q: 'What is Seneca\'s main claim?', options: ['Life is too short, so we must hurry', 'Life is long enough if we use it well', 'Time is worth more than money', 'Slowing down makes life feel longer'], answer: 1, tier: 1 },
      { q: 'What did he say people guard carefully while giving away their time?', options: ['Their health', 'Their money and property', 'Their friends', 'Their reputation'], answer: 1, tier: 1 },
      { q: 'Why, in Seneca\'s view, do people waste time so easily?', options: ['Work leaves them too little of it', 'They treat it as if it cost nothing', 'Life is naturally too short', 'They rest more than they should'], answer: 1, tier: 2 },
    ],
  },
  {
    id: 'obstacle-way', stat: 'WIS', kind: 'reflection', title: 'The obstacle is the way',
    how: 'Marcus Aurelius wrote that what blocks our path can become the path: an obstacle is a chance to practice patience, courage or creativity. Take two minutes.',
    source: 'Idea drawn from Marcus Aurelius, Meditations 5.20',
    prompt: 'What is one thing standing in your way right now? What strength could it train in you if you let it? What is the smallest next step through it, not around it?',
  },
  {
    id: 'three-good-things', stat: 'WIS', kind: 'reflection', title: 'Three good things',
    how: 'A well-studied habit: noticing specific good things trains your attention to find them. Take two minutes.',
    prompt: 'Name three good things from the last day, however small: a kind word, a good meal, something that went right. For each one, why did it happen? Did you have a hand in it?',
  },

  // ---------------- FTH ----------------
  {
    id: 'verse-proverbs-3', stat: 'FTH', kind: 'quiz', title: 'Proverbs 3:5-6',
    how: 'Read the verses slowly, twice. Then answer.',
    passage: 'Trust in the LORD with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths.',
    source: 'Proverbs 3:5-6 (KJV)',
    questions: [
      { q: 'What are we told not to lean on?', options: ['The counsel of others', 'Our own understanding', 'Our own strength', 'The riches of this world'], answer: 1, tier: 1 },
      { q: 'What is promised to those who acknowledge him in all their ways?', options: ['Wealth', 'Long life', 'He shall direct their paths', 'Victory over enemies'], answer: 2, tier: 1 },
      { q: 'What comes right after "Trust in the LORD with all thine heart"?', options: ['"in all thy ways acknowledge him"', '"and lean not unto thine own understanding"', '"and he shall direct thy paths"', '"and fear not"'], answer: 1, tier: 2 },
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
      { q: 'What reason is given for not being afraid?', options: ['Joshua\'s army is large and ready', 'The LORD is with him wherever he goes', 'The land has already been won', 'Moses has blessed his leadership'], answer: 1, tier: 1 },
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
      { q: 'How long does the shepherd search?', options: ['Until nightfall', 'Until he finds it', 'Three days', 'Until the ninety and nine are safe'], answer: 1, tier: 1 },
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
      { q: '"Upbraideth not" means God gives...', options: ['Only to those who are already wise', 'Without scolding the one who asks', 'Slowly, a little at a time', 'Only after a time of testing'], answer: 1, tier: 3 },
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
  // ---- Variety batch: FTH ----
  {
    id: 'verse-psalm-46-10', stat: 'FTH', kind: 'quiz', title: 'Psalm 46:10',
    how: 'Read the verse slowly, twice. Then answer.',
    passage: 'Be still, and know that I am God: I will be exalted among the heathen, I will be exalted in the earth.',
    source: 'Psalm 46:10 (KJV)',
    questions: [
      { q: 'What is the first command in the verse?', options: ['Be strong', 'Be still', 'Be glad', 'Be ready'], answer: 1, tier: 1 },
      { q: 'Fill the gap: "Be still, and ___ that I am God"', options: ['believe', 'know', 'say', 'see'], answer: 1, tier: 1 },
    ],
  },
  {
    id: 'verse-lamentations-3', stat: 'FTH', kind: 'quiz', title: 'Lamentations 3:22-23',
    how: 'Read the verses slowly, twice. Then answer.',
    passage: 'It is of the LORD\'s mercies that we are not consumed, because his compassions fail not. They are new every morning: great is thy faithfulness.',
    source: 'Lamentations 3:22-23 (KJV)',
    questions: [
      { q: 'How often are his compassions new?', options: ['Every year', 'Every morning', 'Every sabbath', 'Every season'], answer: 1, tier: 1 },
      { q: 'Fill the gap: "great is thy ___"', options: ['mercy', 'power', 'faithfulness', 'glory'], answer: 2, tier: 1 },
      { q: 'Why are "we not consumed"?', options: ['Because we are strong', 'Because of the LORD\'s mercies', 'Because the trouble ended', 'Because of our prayers'], answer: 1, tier: 2 },
    ],
  },
  {
    id: 'read-psalm-1', stat: 'FTH', kind: 'quiz', title: 'Reading: Psalm 1',
    how: 'Read the psalm slowly, all the way through. Then answer without looking back.',
    passage:
      '1 Blessed is the man that walketh not in the counsel of the ungodly, nor standeth in the way of sinners, nor sitteth in the seat of the scornful.\n' +
      '2 But his delight is in the law of the LORD; and in his law doth he meditate day and night.\n' +
      '3 And he shall be like a tree planted by the rivers of water, that bringeth forth his fruit in his season; his leaf also shall not wither; and whatsoever he doeth shall prosper.\n' +
      '4 The ungodly are not so: but are like the chaff which the wind driveth away.\n' +
      '5 Therefore the ungodly shall not stand in the judgment, nor sinners in the congregation of the righteous.\n' +
      '6 For the LORD knoweth the way of the righteous: but the way of the ungodly shall perish.',
    source: 'Psalm 1 (KJV)',
    questions: [
      { q: 'What is the blessed man compared to?', options: ['A house built upon a rock', 'A tree planted by rivers of water', 'A shepherd watching his flock', 'A city set on a hill'], answer: 1, tier: 1 },
      { q: 'What are the ungodly compared to?', options: ['Chaff the wind drives away', 'A house built on sand', 'Smoke that vanishes', 'Grass that withers'], answer: 0, tier: 1 },
      { q: 'Verse 1 moves from walking, to standing, to...', options: ['running', 'sitting', 'falling', 'kneeling'], answer: 1, why: 'Walk, stand, sit: each step settles in deeper.', tier: 2 },
      { q: 'When does the tree bring forth its fruit?', options: ['Every day', 'In his season', 'After the storm', 'In the morning'], answer: 1, tier: 3 },
    ],
  },
  {
    id: 'read-isaiah-40', stat: 'FTH', kind: 'quiz', title: 'Reading: Isaiah 40:28-31',
    how: 'Read the passage slowly, all the way through. Then answer without looking back.',
    passage:
      '28 Hast thou not known? hast thou not heard, that the everlasting God, the LORD, the Creator of the ends of the earth, fainteth not, neither is weary? there is no searching of his understanding.\n' +
      '29 He giveth power to the faint; and to them that have no might he increaseth strength.\n' +
      '30 Even the youths shall faint and be weary, and the young men shall utterly fall:\n' +
      '31 But they that wait upon the LORD shall renew their strength; they shall mount up with wings as eagles; they shall run, and not be weary; and they shall walk, and not faint.',
    source: 'Isaiah 40:28-31 (KJV)',
    questions: [
      { q: 'Who shall renew their strength?', options: ['The young men of Israel', 'They that wait upon the LORD', 'Those who are already strong', 'Those who rest from their work'], answer: 1, tier: 1 },
      { q: 'What bird appears in verse 31?', options: ['A dove', 'An eagle', 'A sparrow', 'A raven'], answer: 1, tier: 1 },
      { q: 'Who does verse 30 say will faint and fall?', options: ['The ungodly', 'Even the youths and young men', 'The old', 'The enemies of Israel'], answer: 1, tier: 2 },
      { q: 'Verse 31 ends with flying, then running, then walking. What does that order suggest?', options: ['Strength is running out by the end', 'Strength for the ordinary, daily pace too', 'Flying is only for the young', 'It follows a bird from flight to landing'], answer: 1, tier: 3 },
    ],
  },
  {
    id: 'read-good-samaritan', stat: 'FTH', kind: 'quiz', title: 'Reading: the good Samaritan',
    how: 'Read the parable slowly, all the way through. Then answer without looking back.',
    passage:
      '30 And Jesus answering said, A certain man went down from Jerusalem to Jericho, and fell among thieves, which stripped him of his raiment, and wounded him, and departed, leaving him half dead.\n' +
      '31 And by chance there came down a certain priest that way: and when he saw him, he passed by on the other side.\n' +
      '32 And likewise a Levite, when he was at the place, came and looked on him, and passed by on the other side.\n' +
      '33 But a certain Samaritan, as he journeyed, came where he was: and when he saw him, he had compassion on him,\n' +
      '34 And went to him, and bound up his wounds, pouring in oil and wine, and set him on his own beast, and brought him to an inn, and took care of him.\n' +
      '35 And on the morrow when he departed, he took out two pence, and gave them to the host, and said unto him, Take care of him: and whatsoever thou spendest more, when I come again, I will repay thee.',
    source: 'Luke 10:30-35 (KJV)',
    questions: [
      { q: 'Who passed by on the other side?', options: ['A priest and a Levite', 'A priest and a Samaritan', 'A Levite and a lawyer', 'Two Pharisees'], answer: 0, tier: 1 },
      { q: 'What did the Samaritan pour on the wounds?', options: ['Water', 'Oil and wine', 'Honey', 'Salt'], answer: 1, tier: 1 },
      { q: 'How much did he give the host?', options: ['Two pence', 'Ten pieces of silver', 'A talent', 'Thirty pieces of silver'], answer: 0, tier: 2 },
      { q: 'What did he promise on top of the payment?', options: ['To take the man home when he returned', 'To repay whatever more the host spent', 'To bring the thieves to justice', 'To pay for a doctor to visit him'], answer: 1, tier: 2 },
    ],
  },
  {
    id: 'study-micah-6-8', stat: 'FTH', kind: 'reflection', title: 'Study: Micah 6:8',
    how: 'Read the verse twice, then study it with the questions. Take two or three minutes.',
    passage: 'He hath shewed thee, O man, what is good; and what doth the LORD require of thee, but to do justly, and to love mercy, and to walk humbly with thy God?',
    source: 'Micah 6:8 (KJV)',
    prompt: 'Observe: there are three requirements. Notice the verbs: do, love, walk. One is an action, one a desire, one a daily path.\n\nApply: which of the three is hardest for you right now? What would one small step in it look like today?',
  },
];

export const questById = (id: string) => QUESTS.find((q) => q.id === id);

/** Shuffle a question's options so the right answer isn't always in the same spot. */
export function shuffleOptions(q: QuizQuestion, rng: () => number): QuizQuestion {
  const order = q.options.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) };
}
