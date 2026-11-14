// Humanoid rig. Character space: +y up, +z = the direction the character faces,
// +x = the character's LEFT side. Units are final-sprite pixels.
// Proportions come from Body, so the same rig can be realistic ("classic") or
// heroic JRPG (bigger head, broad shoulders, narrow waist, longer legs).
import { add, mul, rotX, rotY, rotZ, sub, v, type V3 } from './sdf.ts';

export interface Pose {
  bob: number; // whole-body vertical offset
  lean: number; // forward lean of the torso (radians)
  legL: number; legR: number; // hip swing, + = forward
  kneeL: number; kneeR: number; // knee bend, + = bent
  legOut: number; // stance width (legs angled out)
  armL: number; armR: number; // shoulder swing, + = forward
  elbowL: number; elbowR: number; // elbow bend, + = bent forward
  armOut: number; // how far arms hang away from the body
  sway: number; // -1..1 secondary motion for capes, scarves, hair
  twist: number; // upper body turn against the hips (radians)
  tilt: number; // shoulder tilt (radians), the other half of contrapposto
}

export const REST: Pose = { bob: 0, lean: 0, legL: 0, legR: 0, kneeL: 0, kneeR: 0, legOut: 0, armL: 0, armR: 0, elbowL: 0.15, elbowR: 0.15, armOut: 0.12, sway: 0, twist: 0, tilt: 0 };

export interface Body {
  build: number; // 0.9 slim .. 1.15 broad
  height: number; // 0.95 .. 1.05
  headScale: number; // 1 = realistic, ~1.35 = JRPG
  legScale: number;
  torsoScale: number;
  shoulderW: number; // chest/shoulder width factor
  waistW: number; // waist/hip width factor
  handScale: number; // hands and feet
  armScale: number;
}

export const CLASSIC_BODY: Omit<Body, 'build' | 'height'> = { headScale: 1, legScale: 1, torsoScale: 1, shoulderW: 1, waistW: 1, handScale: 1, armScale: 1 };
export const HEROIC_BODY: Omit<Body, 'build' | 'height'> = { headScale: 1.3, legScale: 1.1, torsoScale: 0.92, shoulderW: 1.14, waistW: 0.84, handScale: 1.15, armScale: 1.1 };

export interface Joints {
  pelvis: V3; chest: V3; neck: V3; head: V3;
  shoulderL: V3; shoulderR: V3; elbowL: V3; elbowR: V3; handL: V3; handR: V3;
  hipL: V3; hipR: V3; kneeL: V3; kneeR: V3; ankleL: V3; ankleR: V3; footL: V3; footR: V3;
  /** Unit direction of each forearm (elbow -> hand), for attaching weapons and shields. */
  forearmL: V3; forearmR: V3;
  build: number;
  hs: number; // head scale
  shoulderW: number;
  waistW: number;
  handScale: number;
  sway: number;
}

const DOWN = v(0, -1, 0);
const D = (deg: number) => (deg * Math.PI) / 180;

export function solve(body: Body, pose: Pose): Joints {
  const h = body.height;
  const w = body.build;
  const L = body.legScale, T = body.torsoScale, H = body.headScale;
  const y = (n: number) => n * h + pose.bob;

  const thigh = 6.2 * L, shin = 5.9 * L;
  const hipY = 1.3 + thigh + shin;
  const pelvisY = hipY + 0.9;
  const chestY = pelvisY + 5.3 * T;
  const shoulderY = chestY + 1.6 * T;
  const neckY = chestY + 2.8 * T;
  const headY = neckY + 3.5 * H;

  const leg = (side: 1 | -1, swing: number, bend: number) => {
    const hip = v(side * 1.9 * w * body.waistW, y(hipY), 0);
    const thighDir = rotX(rotZ(DOWN, side * pose.legOut), -swing);
    const knee = add(hip, mul(thighDir, thigh * h));
    const shinDir = rotX(rotZ(DOWN, side * pose.legOut * 0.6), -(swing - bend));
    const ankle = add(knee, mul(shinDir, shin * h));
    const foot = add(ankle, v(0, -0.6, 0.9 * body.handScale));
    return { hip, knee, ankle, foot };
  };
  const arm = (side: 1 | -1, swing: number, bend: number) => {
    const shoulder = add(v(side * 4.0 * w * body.shoulderW, y(shoulderY), 0), v(0, 0, -Math.sin(pose.lean) * 3));
    const upperDir = rotX(rotZ(DOWN, side * pose.armOut), -swing);
    const elbow = add(shoulder, mul(upperDir, 5.0 * h * body.armScale));
    const foreDir = rotX(rotZ(DOWN, side * pose.armOut * 0.4), -(swing + bend));
    const hand = add(elbow, mul(foreDir, 4.5 * h * body.armScale));
    return { shoulder, elbow, hand, foreDir };
  };

  const LL = leg(1, pose.legL, pose.kneeL);
  const LR = leg(-1, pose.legR, pose.kneeR);
  const AL = arm(1, pose.armL, pose.elbowL);
  const AR = arm(-1, pose.armR, pose.elbowR);
  const leanZ = Math.sin(pose.lean);
  const pelvis = v(0, y(pelvisY), 0);
  // Upper body turns and tilts against the hips (contrapposto).
  const up = (p: V3): V3 => (pose.twist || pose.tilt ? add(pelvis, rotZ(rotY(sub(p, pelvis), pose.twist), pose.tilt)) : p);
  const upDir = (d: V3): V3 => rotZ(rotY(d, pose.twist), pose.tilt);
  return {
    pelvis,
    chest: up(v(0, y(chestY), leanZ * 2)),
    neck: up(v(0, y(neckY), 0.1 + leanZ * 3)),
    head: up(v(0, y(headY), 0.35 + leanZ * 3.5)),
    shoulderL: up(AL.shoulder), shoulderR: up(AR.shoulder),
    elbowL: up(AL.elbow), elbowR: up(AR.elbow),
    handL: up(AL.hand), handR: up(AR.hand),
    forearmL: upDir(AL.foreDir), forearmR: upDir(AR.foreDir),
    hipL: LL.hip, hipR: LR.hip, kneeL: LL.knee, kneeR: LR.knee,
    ankleL: LL.ankle, ankleR: LR.ankle, footL: LL.foot, footR: LR.foot,
    build: w, hs: H, shoulderW: body.shoulderW, waistW: body.waistW, handScale: body.handScale, sway: pose.sway,
  };
}

// ---------- Animations ----------
export type AnimName = 'idle' | 'stance' | 'walk' | 'attack';

export function animPose(anim: AnimName, frame: number): Pose {
  if (anim === 'idle') {
    const b = frame % 2 === 0 ? 0 : -0.35;
    return { ...REST, bob: b, armL: 0.04 * (frame % 2), armR: -0.04 * (frame % 2), sway: frame % 2 ? 0.3 : -0.3 };
  }
  if (anim === 'stance') {
    // Battle-ready: feet apart, weight shifted, weapon arm up and forward.
    const b = frame % 2 === 0 ? 0 : -0.4;
    return {
      ...REST, bob: b - 0.3, lean: D(6),
      legOut: D(9), legL: D(10), legR: D(-6), kneeL: D(16), kneeR: D(10),
      armOut: 0.24, armR: D(38), elbowR: D(58), armL: D(22), elbowL: D(48),
      twist: D(16), tilt: D(4),
      sway: frame % 2 ? 0.5 : 0.1,
    };
  }
  if (anim === 'walk') {
    const t = (frame / 6) * Math.PI * 2;
    const s = Math.sin(t);
    return {
      ...REST,
      bob: -0.45 * Math.abs(Math.cos(t)),
      legL: D(21) * s, legR: -D(21) * s,
      kneeL: D(10) + D(28) * Math.max(0, -Math.cos(t + 0.6)), kneeR: D(10) + D(28) * Math.max(0, Math.cos(t + 0.6)),
      armL: -D(22) * s, armR: D(22) * s,
      elbowL: D(18), elbowR: D(18),
      lean: D(4),
      sway: 0.6 + 0.3 * Math.cos(t * 2),
    };
  }
  // attack: wind-up, swing, follow-through, recover (right arm)
  const keys = [
    { armR: D(-50), elbowR: D(85), lean: D(-6), legL: D(12), legR: D(-10), sway: -0.2 },
    { armR: D(120), elbowR: D(8), lean: D(14), legL: D(24), legR: D(-18), sway: 0.9 },
    { armR: D(80), elbowR: D(18), lean: D(14), legL: D(24), legR: D(-18), sway: 1 },
    { armR: D(25), elbowR: D(32), lean: D(5), legL: D(8), legR: D(-5), sway: 0.4 },
  ];
  const k = keys[frame % keys.length];
  return { ...REST, ...k, legOut: D(6), armL: D(15), elbowL: D(40), kneeL: D(14), kneeR: D(8), armOut: 0.2 };
}

export const ANIM_FRAMES: Record<AnimName, number> = { idle: 2, stance: 2, walk: 6, attack: 4 };
