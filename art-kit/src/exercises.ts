// Exercise guide poses: two key frames per exercise, shown as a slow loop next to
// the quest's instructions. Side view unless noted. Angles in degrees for readability.
import { REST, type Pose } from './rig.ts';
import type { Dir } from './render.ts';

const D = (deg: number) => (deg * Math.PI) / 180;
const P = (p: Partial<Record<keyof Pose, number | boolean>>): Pose => {
  const out: Pose = { ...REST, ground: true };
  for (const [k, val] of Object.entries(p)) (out as unknown as Record<string, number | boolean>)[k] = typeof val === 'number' && k !== 'bob' && k !== 'sway' ? D(val) : val;
  return out;
};

export interface ExerciseArt {
  dir: Dir;
  frames: Pose[];
}

export const EXERCISE_POSES: Record<string, ExerciseArt> = {
  pushups: {
    dir: 'right',
    frames: [
      P({ pitch: 72, armL: 72, armR: 72, elbowL: 0, elbowR: 0, armOut: 0.15 }),
      P({ pitch: 82, armL: 40, armR: 40, elbowL: 60, elbowR: 60, armOut: 0.45 }),
    ],
  },
  squats: {
    dir: 'right',
    frames: [
      P({ armL: 80, armR: 80, elbowL: 5, elbowR: 5 }),
      P({ legL: 85, legR: 85, kneeL: 115, kneeR: 115, bend: 35, armL: 70, armR: 70, elbowL: 5, elbowR: 5 }),
    ],
  },
  'wall-sit': {
    dir: 'right',
    frames: [
      P({ legL: 90, legR: 90, kneeL: 90, kneeR: 90, armL: 20, armR: 20, elbowL: 50, elbowR: 50 }),
      P({ legL: 88, legR: 88, kneeL: 88, kneeR: 88, armL: 22, armR: 22, elbowL: 55, elbowR: 55, bob: -0.1 }),
    ],
  },
  balance: {
    dir: 'downRight',
    frames: [
      P({ legL: 70, kneeL: 90, armOut: 70, elbowL: 10, elbowR: 10 }),
      P({ legL: 75, kneeL: 95, armOut: 66, elbowL: 15, elbowR: 15, tilt: 3 }),
    ],
  },
  'mobility-flow': {
    dir: 'right',
    frames: [
      P({ legL: 75, kneeL: 80, legR: -35, kneeR: 20, legOut: 4, bend: 20, armL: 170, armR: 10, elbowL: 5 }),
      P({ legL: 75, kneeL: 80, legR: -35, kneeR: 20, legOut: 4, bend: 45, armL: 40, armR: 60, elbowL: 10, elbowR: 10, twist: 25 }),
    ],
  },
  'toe-taps': {
    dir: 'down',
    frames: [
      P({ bend: 55, twist: 35, tilt: -12, armR: 30, elbowR: 0, armL: -15, elbowL: 10, legOut: 12 }),
      P({ bend: 55, twist: -35, tilt: 12, armL: 30, elbowL: 0, armR: -15, elbowR: 10, legOut: 12 }),
    ],
  },
  plank: {
    dir: 'right',
    frames: [
      P({ pitch: 80, armL: 80, armR: 80, elbowL: 90, elbowR: 90, armOut: 0.2 }),
      P({ pitch: 80, armL: 80, armR: 80, elbowL: 90, elbowR: 90, armOut: 0.2, bob: -0.08 }),
    ],
  },
  march: {
    dir: 'right',
    frames: [
      P({ legL: 90, kneeL: 95, armR: 60, elbowR: 70, armL: -30, elbowL: 40 }),
      P({ legR: 90, kneeR: 95, armL: 60, elbowL: 70, armR: -30, elbowR: 40 }),
    ],
  },
};
