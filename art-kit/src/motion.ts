// Borrowed motion: joint positions exported from CC0 animation clips
// (art-kit/blender/export_motion.py) drive OUR rig. Only the directions of the
// bones are used; lengths and proportions come from our own Body, so a 4-head
// hero keeps its look while moving like the clip.
import { add, mul, norm, rotY, sub, v, type V3 } from './sdf.ts';
import type { Body, Joints } from './rig.ts';
import Hit_Chest from './motion/Hit_Chest.json' with { type: 'json' };
import Idle_Loop from './motion/Idle_Loop.json' with { type: 'json' };
import Pistol_Aim_Neutral from './motion/Pistol_Aim_Neutral.json' with { type: 'json' };
import Punch_Cross from './motion/Punch_Cross.json' with { type: 'json' };
import Punch_Jab from './motion/Punch_Jab.json' with { type: 'json' };
import Spell_Simple_Idle_Loop from './motion/Spell_Simple_Idle_Loop.json' with { type: 'json' };
import Spell_Simple_Shoot from './motion/Spell_Simple_Shoot.json' with { type: 'json' };
import Sword_Attack from './motion/Sword_Attack.json' with { type: 'json' };
import Sword_Idle from './motion/Sword_Idle.json' with { type: 'json' };

type P = [number, number, number];
export type MotionFrame = Record<string, P>;
interface Clip { clip: string; frames: MotionFrame[] }

export const CLIPS = {
  Hit_Chest, Idle_Loop, Pistol_Aim_Neutral, Punch_Cross, Punch_Jab, Spell_Simple_Idle_Loop, Spell_Simple_Shoot, Sword_Attack, Sword_Idle,
} as unknown as Record<string, Clip>;
export type ClipName = keyof typeof CLIPS;

/** A frame of a clip at a 0..1 point through it. */
export function clipFrame(name: string, t: number): MotionFrame {
  const c = CLIPS[name];
  if (!c) throw new Error(`Unknown clip ${name}`);
  return c.frames[Math.min(c.frames.length - 1, Math.max(0, Math.round(t * (c.frames.length - 1))))];
}

const dir = (a: P, b: P): V3 => norm(sub(b, a) as V3);

/**
 * Build our Joints from a clip frame. Hips are squared to the character's facing
 * (the torso shapes are drawn facing +z), the chain is rebuilt from the pelvis
 * with our bone lengths, and the body is set down so the lower foot is on the ground.
 */
export function jointsFromMotion(body: Body, m: MotionFrame, opts: { turn?: number } = {}): Joints {
  const h = body.height, w = body.build;
  const L = body.legScale, T = body.torsoScale, H = body.headScale;
  const thigh = 6.2 * L * h, shin = 5.9 * L * h;

  // Square the hips: rotate the whole frame about y so the hip line points along +x.
  const hl = m.hipL, hr = m.hipR;
  const yaw = Math.atan2(hl[2] - hr[2], hl[0] - hr[0]) + (opts.turn ?? 0);
  const p0 = m.pelvis;
  const q: Record<string, P> = {};
  for (const [k, p] of Object.entries(m)) q[k] = rotY(sub(p, [p0[0], 0, p0[2]]) as V3, yaw) as P;

  const pelvis: V3 = v(0, 0, 0);
  const hipOff = Math.hypot(1.9 * w * body.waistW, 0.9);
  const leg = (s: 'L' | 'R') => {
    const hip = add(pelvis, mul(dir(q.pelvis, q[`hip${s}`]), hipOff));
    const knee = add(hip, mul(dir(q[`hip${s}`], q[`knee${s}`]), thigh));
    const ankle = add(knee, mul(dir(q[`knee${s}`], q[`ankle${s}`]), shin));
    const foot = add(ankle, mul(dir(q[`ankle${s}`], q[`toe${s}`]), Math.hypot(0.6, 0.9 * body.handScale)));
    return { hip, knee, ankle, foot };
  };
  const LL = leg('L'), LR = leg('R');
  const chest = add(pelvis, mul(dir(q.pelvis, q.chest), 5.3 * T * h));
  const neck = add(chest, mul(dir(q.chest, q.neck), 2.8 * T * h));
  const head = add(neck, add(mul(dir(q.headBase, q.headTop), 3.5 * H * h), v(0, 0, 0.35)));
  const shoulderOff = Math.hypot(4.0 * w * body.shoulderW, 1.6 * T);
  const arm = (s: 'L' | 'R') => {
    const shoulder = add(chest, mul(dir(q.chest, q[`shoulder${s}`]), shoulderOff));
    const fore = dir(q[`elbow${s}`], q[`hand${s}`]);
    const elbow = add(shoulder, mul(dir(q[`shoulder${s}`], q[`elbow${s}`]), 5.0 * h * body.armScale));
    const hand = add(elbow, mul(fore, 4.5 * h * body.armScale));
    // Blade direction in a fist grip: across the knuckles, little finger to index.
    const grip = q[`index${s}`] && q[`pinky${s}`] ? dir(q[`pinky${s}`], q[`index${s}`]) : undefined;
    return { shoulder, elbow, hand, fore, grip };
  };
  const AL = arm('L'), AR = arm('R');

  const j: Joints = {
    pelvis, chest, neck, head,
    shoulderL: AL.shoulder, shoulderR: AR.shoulder, elbowL: AL.elbow, elbowR: AR.elbow, handL: AL.hand, handR: AR.hand,
    hipL: LL.hip, hipR: LR.hip, kneeL: LL.knee, kneeR: LR.knee, ankleL: LL.ankle, ankleR: LR.ankle, footL: LL.foot, footR: LR.foot,
    forearmL: AL.fore, forearmR: AR.fore, gripL: AL.grip, gripR: AR.grip,
    build: w, hs: H, shoulderW: body.shoulderW, waistW: body.waistW, handScale: body.handScale, sway: 0.4,
  };
  // Set down: whichever is lowest (an ankle, or a pointed toe) touches the ground
  // the way a standing foot does (ankle 1.3 up, toe 0.7 up).
  const lift = -Math.min(j.ankleL[1] - 1.3 * h, j.ankleR[1] - 1.3 * h, j.footL[1] - 0.7, j.footR[1] - 0.7);
  const keys = ['pelvis', 'chest', 'neck', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR',
    'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'footL', 'footR'] as const;
  for (const k of keys) j[k] = add(j[k], v(0, lift, 0));
  return j;
}
