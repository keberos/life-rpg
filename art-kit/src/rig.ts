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
  /** Upper body folds forward at the hips (radians). Exercise poses. */
  bend?: number;
  /** Whole body tips forward around the feet (radians), e.g. plank. Exercise poses. */
  pitch?: number;
  /** Put the lowest joint on the ground and center the body front-to-back. Exercise poses. */
  ground?: boolean;
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
/** About 4 heads tall: a readable head and hands at phone size, without toy proportions. */
export const CRISP_BODY: Omit<Body, 'build' | 'height'> = { headScale: 1.5, legScale: 0.98, torsoScale: 0.94, shoulderW: 1.12, waistW: 0.88, handScale: 1.25, armScale: 1.04 };

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
  const bend = pose.bend ?? 0;
  const up = (p: V3): V3 => (pose.twist || pose.tilt || bend ? add(pelvis, rotZ(rotY(rotX(sub(p, pelvis), bend), pose.twist), pose.tilt)) : p);
  const upDir = (d: V3): V3 => rotZ(rotY(rotX(d, bend), pose.twist), pose.tilt);
  const j: Joints = {
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
  return pose.pitch || pose.ground ? placeOnGround(j, pose.pitch ?? 0) : j;
}

const POINT_KEYS = ['pelvis', 'chest', 'neck', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR',
  'hipL', 'hipR', 'kneeL', 'kneeR', 'ankleL', 'ankleR', 'footL', 'footR'] as const;

/** Tip the whole body forward around the feet, then rest the lowest point on the ground, centered front-to-back. */
function placeOnGround(j: Joints, pitch: number): Joints {
  const pivot = mul(add(j.ankleL, j.ankleR), 0.5);
  const out = { ...j } as Joints;
  for (const k of POINT_KEYS) out[k] = add(pivot, rotX(sub(j[k], pivot), pitch));
  out.forearmL = rotX(j.forearmL, pitch);
  out.forearmR = rotX(j.forearmR, pitch);
  // Limbs have thickness: keep joint centers about a limb radius above the floor.
  const lows = POINT_KEYS.map((k) => out[k][1] - (k === 'head' ? 2.6 * j.hs : 0.9));
  const minY = Math.min(...lows);
  const zs = POINT_KEYS.map((k) => out[k][2]);
  const midZ = (Math.min(...zs) + Math.max(...zs)) / 2;
  for (const k of POINT_KEYS) out[k] = add(out[k], v(0, -minY, -midZ));
  return out;
}

// ---------- Animations ----------
export type AnimName = 'idle' | 'stance' | 'walk' | 'attack' | 'strike';

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
  if (anim === 'strike') {
    // Battle swing for the 3/4 view: the weapon goes up over the head, then out
    // to the front (screen right) and down, so it never crosses the face.
    const keys = [
      { armR: D(150), elbowR: D(35), armOut: 0.8, lean: D(-6), legL: D(10), legR: D(-8), twist: D(-12), sway: -0.2, bob: 0 },
      { armR: D(100), elbowR: D(0), armOut: 0.22, lean: D(16), legL: D(26), legR: D(-20), twist: D(24), sway: 0.9, bob: -0.6 },
      { armR: D(55), elbowR: D(0), armOut: 0.2, lean: D(18), legL: D(26), legR: D(-20), twist: D(26), sway: 1, bob: -0.8 },
      { armR: D(38), elbowR: D(50), armOut: 0.24, lean: D(7), legL: D(12), legR: D(-8), twist: D(16), sway: 0.4, bob: -0.3 },
    ];
    const k = keys[frame % keys.length];
    return { ...REST, ...k, legOut: D(8), armL: D(20), elbowL: D(48), kneeL: D(16), kneeR: D(10), tilt: D(4) };
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

export const ANIM_FRAMES: Record<AnimName, number> = { idle: 2, stance: 2, walk: 6, attack: 4, strike: 4 };
