// Body, hair, clothing, armor and weapons as shapes attached to the rig.
// Every item is defined once and works in all directions and frames.
// Parts can also "paint" surface detail (faces, seams, folds, emblems) by
// looking at where on the part a pixel landed.
import type { Joints } from './rig.ts';
import {
  add, capsule, ellipsoid, inflate, intersect, lerp3, mul, norm, rotY, roundBox, scaleAbout, skirt, smooth, sphere, sub, subtract, union, unscalePoint, v,
  type Sdf, type V3,
} from './sdf.ts';

/** Surface detail at one point: switch material and/or shift the shading level. */
export interface Paint {
  mat?: string;
  dl?: number; // shading level shift (-1 darker, +1 lighter)
  keep?: boolean; // protect from pixel cleanup (eyes, tiny emblems)
}

export interface Part {
  sdf: Sdf;
  mat: string;
  /** pc = point in character space, n = surface normal in character space. */
  paint?: (pc: V3, n: V3) => Paint | null;
  /** Scaled with the head (JRPG big heads) or with a hand (oversized weapons). */
  anchor?: 'head' | 'handR' | 'handL';
  /** The face: the crisp style stamps designed eyes on it instead of painting them. */
  face?: boolean;
  /** Which layer the part belongs to (person, hair, outfit, held), for layered sprites. Set by lookParts. */
  group?: 'body' | 'hair' | 'outfit' | 'held';
  /** Drapes over the hair (bandana tails): pushed along `dir` until every `at` point
   *  (with its radius) clears the wearer's hair, so it lies on the hair, not in it. */
  restOnHair?: { at: [V3, number][]; dir: V3 };
  /** Goes under the hair (a headband's back): it doesn't carve the hair, so hair covers it.
   *  Where it should show over hair, the item's hairCut says. */
  underHair?: boolean;
}

export interface ItemSpec {
  id: string;
  mat?: string; // main material
  mat2?: string; // trim / secondary material
}

export interface Look {
  name: string;
  build?: number;
  height?: number;
  skin?: string;
  hair?: { style: 'short' | 'long' | 'spiky' | 'bald' | 'ponytail' | 'bun' | 'mohawk' | 'braids' | 'hero' | 'flowing' | 'swept'; mat: string };
  beard?: 'stubble' | 'short' | 'full';
  /** Eye color material for anime faces (irisBlue, irisGreen, irisAmber...). */
  iris?: string;
  /** Prestige glow around the silhouette, e.g. 'holy' or 'arcane'. */
  aura?: string;
  items: ItemSpec[];
}

// Region helpers.
export const above = (y0: number): Sdf => (p) => y0 - p[1];
export const below = (y0: number): Sdf => (p) => p[1] - y0;
const localHair = (c: V3, frontCut: number, topCut: number): Sdf => (p) =>
  Math.min(c[1] + topCut - p[1], p[2] - (c[2] + frontCut));

// ---------- Paint helpers ----------
/** Vertical cloth folds around a vertical axis through c. */
export const folds = (c: V3, count: number, strength = 0.82): Part['paint'] => (pc) => {
  const a = Math.atan2(pc[0] - c[0], pc[2] - c[2]);
  const s = Math.sin(a * count + (pc[1] - c[1]) * 0.12);
  return s > strength ? { dl: -1 } : s < -0.95 ? { dl: 1 } : null;
};
/** Hair strands plus a highlight band near the crown. */
export const strands = (head: V3): Part['paint'] => (pc, n) => {
  const a = Math.atan2(pc[0] - head[0], pc[2] - head[2]);
  const ly = pc[1] - head[1];
  // anime shine: a bright band across the crown, broken into a few clumps
  if (n[1] > 0.15 && ly > 1.3 && ly < 2.6 && pc[2] - head[2] > -1.5 && Math.sin(a * 4 + 0.6) > -0.2) return { dl: 1, keep: true };
  return Math.sin(a * 11 + ly * 0.4) > 0.72 ? { dl: -1 } : null;
};
/** Horizontal band (trim) on a part between two heights. */
export const band = (y0: number, y1: number, mat: string): Part['paint'] => (pc) => (pc[1] > y0 && pc[1] < y1 ? { mat } : null);

export function torsoSdf(j: Joints, grow = 0): Sdf {
  const w = j.build, g = grow;
  const sw = w * j.shoulderW, ww = w * j.waistW;
  // V-shaped: broad upper chest, ribs narrowing into a small waist, then hips.
  return smooth(
    1.2,
    roundBox(add(j.chest, v(0, 0.9, 0.05)), v(3.45 * sw + g, 1.35 + g, 2.3 + g), 1.3 + g * 0.5),
    roundBox(add(j.chest, v(0, -0.9, 0.1)), v(2.95 * sw + g, 1.3 + g, 2.2 + g), 1.25 + g * 0.5),
    roundBox(lerp3(j.pelvis, j.chest, 0.4), v(2.35 * ww + g, 1.8 + g, 1.95 + g), 1.2 + g * 0.5),
    roundBox(j.pelvis, v(2.6 * ww + g, 1.35 + g, 1.95 + g), 1.2 + g * 0.5),
  );
}

/** Sculpted head: round cranium, cheeks, and a jaw that tapers to a V chin. */
export function headSdf(h: V3): Sdf {
  return smooth(
    0.9,
    ellipsoid(add(h, v(0, 0.45, -0.3)), v(2.95, 3.0, 3.0)),
    ellipsoid(add(h, v(0, -0.65, 0.45)), v(2.5, 2.35, 2.45)),
    capsule(add(h, v(0, -1.7, 1.05)), add(h, v(0, -2.95, 1.6)), 1.35, 0.6),
  );
}

/** Eyes, brows, nose shadow and mouth, painted on the front of the head. */
function facePaint(head: V3, browMat: string, anime: boolean, iris: string): Part['paint'] {
  return (pc) => {
    const x = pc[0] - head[0], y = pc[1] - head[1], z = pc[2] - head[2];
    if (z < 1.3) return null;
    if (anime) {
      const side = Math.abs(x) - 1.15; // + = toward the outer corner
      const ex = Math.abs(side);
      const ey = y + 0.4;
      // thick upper lash line with a small outward wing
      if (ey > 0.5 && ey < 0.95 && ex < 0.82) return { mat: 'eye', keep: true };
      if (side > 0.55 && side < 1.0 && ey > 0.25 && ey < 0.7) return { mat: 'eye', keep: true };
      if (ex < 0.78 && ey > -0.75 && ey <= 0.5) {
        const inIris = (side / 0.5) ** 2 + ((ey + 0.05) / 0.7) ** 2 < 1;
        if (inIris) {
          if (ey > 0.12 && ey < 0.42 && side < -0.08 && side > -0.42) return { mat: 'eyeWhite', dl: 3, keep: true }; // catch-light
          if (Math.abs(side) < 0.2 && ey > -0.35 && ey < 0.2) return { mat: 'eye', keep: true }; // pupil
          if (ey < -0.42 && side > 0.05 && side < 0.3) return { mat: iris, dl: 2, keep: true }; // lower glint
          return { mat: iris, dl: ey > 0.2 ? -1 : 0, keep: true };
        }
        return { mat: 'eyeWhite', keep: true };
      }
      if (ey <= -0.75 && ey > -0.95 && ex < 0.55) return { dl: -1, keep: true }; // lower lash hint
      // angled brows: lower toward the nose for a determined look
      const by = y - (1.05 + 0.22 * side);
      if (Math.abs(by) < 0.24 && ex < 0.95) return { mat: browMat, dl: -1, keep: true };
      if (x > 0.08 && x < 0.38 && y > -1.45 && y < -0.95 && z > 2.3) return { dl: -1, keep: true }; // nose shadow
      if (Math.abs(x) < 0.42 && Math.abs(y + 2.05) < 0.13 && z > 2.0) return { dl: -2, keep: true }; // mouth
      return null;
    }
    const ex = Math.abs(Math.abs(x) - 1.12);
    if (ex < 0.62 && Math.abs(y + 0.15) < 0.55 && z > 1.6) {
      // pupil sits toward the nose so the gaze reads forward
      const inner = Math.abs(x) < 1.12 + 0.12;
      return { mat: inner ? 'eye' : 'eyeWhite', keep: true };
    }
    if (ex < 0.75 && Math.abs(y - 0.85) < 0.22 && z > 1.4) return { mat: browMat, dl: -1, keep: true };
    if (Math.abs(x) < 0.55 && Math.abs(y + 1.95) < 0.2 && z > 1.9) return { dl: -2, keep: true };
    return null;
  };
}

export function armSdf(j: Joints, side: 'L' | 'R'): Sdf {
  const sh = side === 'L' ? j.shoulderL : j.shoulderR;
  const el = side === 'L' ? j.elbowL : j.elbowR;
  const ha = side === 'L' ? j.handL : j.handR;
  const fd = side === 'L' ? j.forearmL : j.forearmR;
  const s = j.handScale;
  const wrist = lerp3(el, ha, 0.82);
  return smooth(
    0.5,
    sphere(sh, 1.7), // deltoid
    capsule(sh, el, 1.45, 1.1),
    ellipsoid(add(lerp3(sh, el, 0.45), v(0, 0, 0.25)), v(1.35, 1.8, 1.45)), // bicep
    capsule(el, wrist, 1.3, 0.78), // forearm tapers to the wrist
    ellipsoid(add(ha, mul(fd, 0.3)), v(0.95 * s, 1.15 * s, 0.75 * s)), // hand
    sphere(add(ha, v(0, 0.2, 0.6 * s)), 0.45 * s), // thumb
  );
}

export function legSdf(j: Joints, side: 'L' | 'R'): Sdf {
  const hip = side === 'L' ? j.hipL : j.hipR;
  const kn = side === 'L' ? j.kneeL : j.kneeR;
  const an = side === 'L' ? j.ankleL : j.ankleR;
  const ft = side === 'L' ? j.footL : j.footR;
  const s = j.handScale;
  return smooth(
    0.6,
    capsule(hip, kn, 2.3, 1.45),
    ellipsoid(add(lerp3(hip, kn, 0.35), v(0, 0, 0.3)), v(1.95, 2.4, 1.9)), // quad
    sphere(kn, 1.45),
    capsule(kn, an, 1.4, 0.78),
    ellipsoid(add(lerp3(kn, an, 0.3), v(0, 0, -0.45)), v(1.4, 2.0, 1.45)), // calf
    sphere(add(an, v(0, -0.3, -0.2)), 0.9 * s), // heel
    ellipsoid(add(ft, v(0, -0.1, 0.45)), v(0.95 * s, 0.6 * s, 1.75 * s)), // foot
  );
}

export function bodyParts(j: Joints, skin: string, browMat: string, anime = false, iris = 'irisBlue'): Part[] {
  return [
    { sdf: torsoSdf(j), mat: skin },
    { sdf: capsule(add(j.neck, v(0, 0.4, 0)), add(j.chest, v(0, 1.4, 0)), 0.95), mat: skin },
    { sdf: headSdf(j.head), mat: skin, paint: facePaint(j.head, browMat, anime, iris), anchor: 'head', face: true },
    { sdf: anime ? capsule(add(j.head, v(0, -0.6, 2.75)), add(j.head, v(0, -1.25, 3.0)), 0.3, 0.32) : sphere(add(j.head, v(0, -0.7, 2.8)), 0.55), mat: skin, anchor: 'head' },
    { sdf: union(ellipsoid(add(j.head, v(2.6, -0.4, 0.1)), v(0.45, 0.75, 0.55)), ellipsoid(add(j.head, v(-2.6, -0.4, 0.1)), v(0.45, 0.75, 0.55))), mat: skin, anchor: 'head' }, // ears
    { sdf: armSdf(j, 'L'), mat: skin },
    { sdf: armSdf(j, 'R'), mat: skin },
    { sdf: legSdf(j, 'L'), mat: skin },
    { sdf: legSdf(j, 'R'), mat: skin },
  ];
}

export function beardParts(j: Joints, kind: string, mat: string): Part[] {
  const chin = add(j.head, v(0, -1.7, 1.3));
  const size = kind === 'full' ? v(2.75, 2.3, 2.1) : kind === 'short' ? v(2.55, 1.7, 1.75) : v(2.45, 1.4, 1.6);
  const shape = intersect(ellipsoid(chin, size), below(j.head[1] - 0.75), (p) => -(p[2] - (j.head[2] - 0.4)));
  const moustache = ellipsoid(add(j.head, v(0, -1.45, 2.75)), v(1.1, 0.35, 0.45));
  return [{ sdf: union(shape, moustache), mat, paint: kind === 'stubble' ? () => ({ dl: -1, keep: true }) : strands(chin), anchor: 'head' }];
}

export function hairParts(j: Joints, style: string, mat: string, frameFace = false): Part[] {
  if (style === 'bald') return [];
  if (style === 'mohawk') {
    const crest: Sdf[] = [];
    for (let i = 0; i <= 6; i++) {
      const a = -0.9 + i * 0.32;
      const base = add(j.head, v(0, 3.0 * Math.cos(a), 3.0 * Math.sin(a)));
      crest.push(capsule(base, add(base, v(0, 1.5 * Math.cos(a) + 0.4, 1.5 * Math.sin(a))), 0.95, 0.35));
    }
    return [{ sdf: union(...crest), mat, paint: strands(j.head), anchor: 'head' }];
  }
  const shell = ellipsoid(add(j.head, v(0, 0.25, -0.15)), v(3.25, 3.6, 3.25));
  const cap = intersect(shell, localHair(j.head, -0.6, 1.0));
  const fringe = union(
    ellipsoid(add(j.head, v(0.7, 2.35, 1.95)), v(2.3, 0.95, 1.05)),
    ellipsoid(add(j.head, v(-1.4, 2.1, 1.85)), v(1.2, 0.95, 1.0)),
  );
  const parts: Sdf[] = [cap, fringe];
  if (style === 'ponytail') parts.push(sphere(add(j.head, v(0, 1.2, -3.2)), 1.0), capsule(add(j.head, v(0, 1.0, -3.6)), add(j.head, v(0, -4.6, -4.4)), 1.1, 0.6));
  if (style === 'bun') parts.push(sphere(add(j.head, v(0, 2.6, -2.6)), 1.7));
  if (style === 'braids') parts.push(capsule(add(j.head, v(2.6, -0.5, -0.4)), add(j.head, v(2.9, -6.0, 0.6)), 0.95, 0.6), capsule(add(j.head, v(-2.6, -0.5, -0.4)), add(j.head, v(-2.9, -6.0, 0.6)), 0.95, 0.6));
  if (style === 'long') parts.push(capsule(add(j.head, v(0, 0, -1.6)), add(j.head, v(0, -5.2, -2.0)), 2.75, 2.1));
  if (style === 'spiky') {
    for (const [x, z] of [[-1.6, 0.6], [0, 1.0], [1.6, 0.4], [-0.8, -1.2], [1.0, -1.4]]) {
      parts.push(capsule(add(j.head, v(x * 0.8, 2.6, z * 0.8)), add(j.head, v(x * 1.3, 4.4, z * 1.2)), 0.9, 0.2));
    }
  }
  const h = j.head;
  const lock = (from: V3, to: V3, r0: number, r1 = 0.15) => capsule(add(h, from), add(h, to), r0, r1);
  if (style === 'hero') {
    // swept-back spikes that break the silhouette, plus front bangs
    for (const [x, y, z, tx, ty, tz] of [[0, 3.0, 0.6, 0, 5.0, -2.6], [-1.6, 2.6, 0.2, -3.0, 4.5, -2.6], [1.6, 2.6, 0.2, 3.0, 4.5, -2.6], [-2.2, 1.6, -1.2, -4.4, 3.0, -3.6], [2.2, 1.6, -1.2, 4.4, 3.0, -3.6], [0, 1.6, -2.4, 0, 2.6, -5.6]])
      parts.push(lock(v(x, y, z), v(tx, ty, tz), 1.35));
    parts.push(lock(v(-0.6, 2.6, 2.2), v(-1.5, 1.3, 3.1), 0.95, 0.25), lock(v(0.9, 2.6, 2.1), v(1.9, 1.2, 3.0), 0.95, 0.25));
  }
  if (style === 'swept') {
    for (const [x, y, z, tx, ty, tz] of [[-0.4, 3.0, 1.2, 3.6, 3.4, 2.8], [0.4, 2.8, -0.6, 4.2, 1.8, -1.0], [-1.6, 2.6, -1.6, 2.4, 0.4, -3.4]])
      parts.push(lock(v(x, y, z), v(tx, ty, tz), 1.3));
  }
  if (style === 'flowing') {
    for (const [x, z] of [[-2.4, -1.0], [-1.2, -2.3], [0, -2.7], [1.2, -2.3], [2.4, -1.0]])
      parts.push(lock(v(x, 1.0, z), v(x * 1.25, -6.8 - Math.abs(x) * 0.4, z * 1.25 - 0.6), 1.35, 0.5));
    parts.push(lock(v(-0.4, 2.6, 2.0), v(-2.3, -0.4, 2.4), 0.9, 0.3), lock(v(0.4, 2.6, 2.0), v(2.3, -0.4, 2.4), 0.9, 0.3));
  }
  if (frameFace) {
    // Frame the face like hand-drawn sprites: pointed bangs down to brow level and a
    // lock down each cheek, so the face is a small window and the eyes dominate it.
    for (const [x, dx] of [[-1.7, -0.2], [-0.55, 0.15], [0.6, 0.35], [1.75, 0.45]])
      parts.push(lock(v(x, 2.7, 2.1), v(x + dx, 0.85, 2.95), 0.8, 0.22));
    for (const s of [1, -1]) parts.push(lock(v(2.5 * s, 1.5, 1.0), v(2.3 * s, -1.7, 1.6), 0.8, 0.3));
  }
  return [{ sdf: union(...parts), mat, paint: strands(j.head), anchor: 'head' }];
}

export const sleeve = (a: V3, b: V3, upTo: number, ra: number, rb: number): Sdf => capsule(a, lerp3(a, b, upTo), ra, rb);

export type ItemFn = (j: Joints, mat: string, mat2: string) => Part[];

/** A band around the head just over the hair cap (radius 3.25), from y0 to y1 above the head center. */
export const headband = (h: V3, y0: number, y1: number, r = 3.4): Sdf =>
  intersect(ellipsoid(add(h, v(0, 0.3, -0.05)), v(r, r + 0.35, r)), above(h[1] + y0), below(h[1] + y1));
/** Hair rule for a headband (worn with underHair): clear the fringe around the band on the
 *  front half only (the back goes under the hair), never above its top edge (no scalp). */
export const headbandCut = (j: Joints, y0: number, y1: number, r = 3.4): Sdf =>
  intersect(inflate(headband(j.head, y0, y1, r), 0.3), (p: V3) => j.head[2] + 0.5 - p[2], below(j.head[1] + y1));
/** Hair rule for a helmet or hood: no hair within `margin` outside its shell (hair can't poke
 *  through), except where `keep` is (a face opening). Hair hanging below the edge stays. */
export const helmCut = (shell: Sdf, margin = 1.0, keep?: Sdf): Sdf => (keep ? subtract(inflate(shell, margin), keep) : inflate(shell, margin));
/** Hair rule for anything worn over the crown (helms, hoods): no hair above the rim (`dy` above
 *  the head center) anywhere around the head, so buns and swept locks can't stick out of it. */
export const aboveRim = (j: Joints, dy: number): Sdf => intersect(ellipsoid(add(j.head, v(0, 0, -0.5)), v(6, 40, 6.5)), above(j.head[1] + dy));

export interface ItemDef {
  fn: ItemFn; mat: string; mat2?: string; anchor?: Part['anchor'];
  /** Headwear: the space where no hair may be (e.g. everything above a brim). Hair is carved out of it. */
  hairCut?: (j: Joints) => Sdf;
}
export const ITEMS: Record<string, ItemDef> = {
  shirt: {
    mat: 'linen',
    fn: (j, m) => [
      { sdf: intersect(torsoSdf(j, 0.3), above(j.pelvis[1] + 0.5)), mat: m, paint: folds(j.chest, 5, 0.9) },
      { sdf: capsule(add(j.neck, v(0, -0.6, 0.3)), add(j.neck, v(0, -0.6, 0.3)), 1.45), mat: m },
      { sdf: union(sleeve(j.shoulderL, j.elbowL, 0.6, 1.8, 1.55), sleeve(j.shoulderR, j.elbowR, 0.6, 1.8, 1.55)), mat: m },
    ],
  },
  tunic: {
    mat: 'clothBlue', mat2: 'leather',
    fn: (j, m) => [
      { sdf: torsoSdf(j, 0.35), mat: m },
      { sdf: skirt(j.pelvis, -4.6, 1.0, 3.6 * j.build, 3.0 * j.build), mat: m, paint: folds(j.pelvis, 6) },
      { sdf: union(sleeve(j.shoulderL, j.elbowL, 1.0, 1.8, 1.5), sleeve(j.shoulderR, j.elbowR, 1.0, 1.8, 1.5)), mat: m },
    ],
  },
  trousers: {
    mat: 'burlap',
    fn: (j, m) => [
      { sdf: intersect(torsoSdf(j, 0.28), below(j.pelvis[1] + 0.9)), mat: m },
      { sdf: intersect(inflate(legSdf(j, 'L'), 0.38), above(j.ankleL[1] + 0.8)), mat: m, paint: folds(j.kneeL, 3, 0.93) },
      { sdf: intersect(inflate(legSdf(j, 'R'), 0.38), above(j.ankleR[1] + 0.8)), mat: m, paint: folds(j.kneeR, 3, 0.93) },
    ],
  },
  shoes: {
    mat: 'leather',
    fn: (j, m) => [
      { sdf: intersect(inflate(legSdf(j, 'L'), 0.32), below(j.ankleL[1] + 1.2)), mat: m },
      { sdf: intersect(inflate(legSdf(j, 'R'), 0.32), below(j.ankleR[1] + 1.2)), mat: m },
    ],
  },
  boots: {
    mat: 'leatherDark',
    fn: (j, m) => {
      const boot = (side: 'L' | 'R') => {
        const an = side === 'L' ? j.ankleL : j.ankleR, kn = side === 'L' ? j.kneeL : j.kneeR;
        const top = lerp3(an, kn, 0.62)[1];
        return {
          sdf: intersect(inflate(legSdf(j, side), 0.45), below(top)), mat: m,
          paint: (pc: V3) => (pc[1] > top - 0.9 ? { dl: 1 } : null), // folded cuff
        };
      };
      return [boot('L'), boot('R')];
    },
  },
  belt: {
    mat: 'leather', mat2: 'gold',
    fn: (j, m, m2) => {
      const y = j.pelvis[1] + 1.25;
      return [
        { sdf: intersect(torsoSdf(j, 0.62), above(y - 0.6), below(y + 0.6)), mat: m },
        { sdf: roundBox(v(0, y, 2.55), v(0.8, 0.7, 0.45), 0.2), mat: m2 },
        // pouch on the left hip
        { sdf: roundBox(add(j.pelvis, v(2.9 * j.build, 0.2, 0.9)), v(0.75, 1.0, 1.0), 0.45), mat: 'leatherDark' },
      ];
    },
  },
  vest: {
    mat: 'leather', mat2: 'leatherDark',
    fn: (j, m, m2) => [
      {
        sdf: intersect(torsoSdf(j, 0.7), above(j.pelvis[1] + 0.2)), mat: m,
        // stitched panels: two horizontal seams and a center lace
        paint: (pc) => {
          const ly = pc[1] - j.chest[1];
          if (pc[2] > 0 && Math.abs(pc[0]) < 0.35) return { mat: m2 };
          return Math.abs(ly + 2.4) < 0.25 || Math.abs(ly + 0.2) < 0.22 ? { dl: -1 } : null;
        },
      },
      { sdf: union(ellipsoid(add(j.shoulderL, v(0.3, 0.45, 0)), v(1.95, 1.45, 1.95)), ellipsoid(add(j.shoulderR, v(-0.3, 0.45, 0)), v(1.95, 1.45, 1.95))), mat: m2 },
    ],
  },
  chainmail: {
    mat: 'steelDark',
    fn: (j, m) => [
      { sdf: torsoSdf(j, 0.55), mat: m },
      { sdf: skirt(j.pelvis, -3.6, 0.8, 3.6 * j.build, 3.2 * j.build), mat: m },
      { sdf: union(sleeve(j.shoulderL, j.elbowL, 0.75, 1.95, 1.6), sleeve(j.shoulderR, j.elbowR, 0.75, 1.95, 1.6)), mat: m },
      // coif collar
      { sdf: capsule(add(j.neck, v(0, -0.2, 0)), add(j.neck, v(0, 0.4, -0.2)), 1.75), mat: m },
    ],
  },
  plate: {
    mat: 'steel', mat2: 'gold',
    fn: (j, m, m2) => {
      const w = j.build;
      const chestC = add(j.chest, v(0, 0.15, 0.2));
      const pauldron = (s: 1 | -1, sh: V3) => [
        { sdf: ellipsoid(add(sh, v(s * 0.6, 0.7, 0)), v(2.45, 1.75, 2.5)), mat: m, paint: band(sh[1] - 0.45, sh[1] - 0.05, m2) },
        { sdf: ellipsoid(add(sh, v(s * 1.1, -0.5, 0)), v(2.1, 1.4, 2.2)), mat: m },
      ];
      return [
        {
          sdf: roundBox(chestC, v(3.85 * w, 2.7, 3.15), 1.5), mat: m,
          paint: (pc) => {
            const lx = pc[0] - chestC[0], ly = pc[1] - chestC[1];
            if (pc[2] > 0 && Math.abs(lx) < 0.3 && ly > -1.6) return { dl: 1 }; // center ridge
            if (Math.abs(ly - 1.2) < 0.22) return { dl: -1 }; // upper seam
            return null;
          },
        },
        { sdf: roundBox(lerp3(j.pelvis, j.chest, 0.4), v(3.2 * w, 1.7, 2.75), 1.2), mat: m, paint: (pc) => (Math.abs(pc[1] - lerp3(j.pelvis, j.chest, 0.4)[1]) < 0.22 ? { dl: -1 } : null) },
        { sdf: skirt(j.pelvis, -3.4, 0.6, 3.8 * w, 3.4 * w), mat: m, paint: (pc) => (Math.abs(pc[1] - (j.pelvis[1] - 1.4)) < 0.25 ? { dl: -1 } : null) },
        { sdf: roundBox(add(j.chest, v(0, -2.45, 0.2)), v(3.95 * w, 0.34, 3.25), 0.3), mat: m2 },
        // gorget
        { sdf: intersect(capsule(add(j.neck, v(0, -0.6, 0)), add(j.neck, v(0, 0.3, 0)), 2.2), above(j.neck[1] - 0.9)), mat: m },
        ...pauldron(1, j.shoulderL), ...pauldron(-1, j.shoulderR),
        { sdf: union(sleeve(j.elbowL, j.handL, 0.8, 1.6, 1.5), sleeve(j.elbowR, j.handR, 0.8, 1.6, 1.5)), mat: m },
        { sdf: union(sphere(lerp3(j.elbowL, j.handL, 0.75), 1.85), sphere(lerp3(j.elbowR, j.handR, 0.75), 1.85)), mat: m }, // gauntlet cuffs
        { sdf: union(intersect(inflate(legSdf(j, 'L'), 0.55), below(j.kneeL[1] + 0.4)), intersect(inflate(legSdf(j, 'R'), 0.55), below(j.kneeR[1] + 0.4))), mat: m },
        { sdf: union(sphere(add(j.kneeL, v(0, 0, 0.4)), 1.8), sphere(add(j.kneeR, v(0, 0, 0.4)), 1.8)), mat: m, paint: () => ({ dl: 0 }) },
        { sdf: union(intersect(inflate(legSdf(j, 'L'), 0.6), below(j.ankleL[1] + 0.6)), intersect(inflate(legSdf(j, 'R'), 0.6), below(j.ankleR[1] + 0.6))), mat: m },
      ];
    },
  },
  tabard: {
    mat: 'clothWhite', mat2: 'gold',
    fn: (j, m, m2) => {
      const c = add(lerp3(j.pelvis, j.chest, 0.3), v(0, -1.2, 0));
      const emblem: Part['paint'] = (pc) => {
        const lx = pc[0], ly = pc[1] - (j.chest[1] - 1.2);
        if (Math.abs(pc[2]) < 1) return null;
        const cross = (Math.abs(lx) < 0.6 && Math.abs(ly) < 2.3) || (Math.abs(lx) < 1.7 && Math.abs(ly - 0.7) < 0.55);
        if (cross) return { mat: 'clothRed', keep: true };
        return Math.abs(Math.abs(lx) - 2.75) < 0.35 ? { mat: m2 } : null;
      };
      return [
        { sdf: roundBox(add(c, v(0, 0, 0.0)), v(3.1 * j.build, 5.4, 3.45), 0.6), mat: m, paint: emblem },
      ];
    },
  },
  cape: {
    mat: 'clothRed', mat2: 'gold',
    fn: (j, m, m2) => {
      const top = add(j.chest, v(0, 1.4, -2.6));
      const capeC = add(top, v(0, -6.6, -1.0));
      return [
        { sdf: roundBox(capeC, v(4.1 * j.build, 6.9, 0.4), 0.35, 0, -0.14), mat: m, paint: folds(add(capeC, v(0, 0, 6)), 9, 0.8) },
        { sdf: capsule(add(j.shoulderL, v(-0.3, 0.5, -1.3)), add(j.shoulderR, v(0.3, 0.5, -1.3)), 1.15), mat: m },
        { sdf: union(sphere(add(j.shoulderL, v(-1.0, 0.3, 1.6)), 0.7), sphere(add(j.shoulderR, v(1.0, 0.3, 1.6)), 0.7)), mat: m2 },
      ];
    },
  },
  robe: {
    mat: 'clothDeepBlue', mat2: 'gold',
    fn: (j, m, m2) => {
      const hem = j.pelvis[1] - 12.4;
      const trim: Part['paint'] = (pc) => {
        if (pc[1] < hem + 0.9) return { mat: m2 };
        if (pc[2] > 0 && Math.abs(pc[0]) < 0.45 && pc[1] < j.chest[1] + 1) return { mat: m2 }; // front placket
        return folds(j.pelvis, 7)!(pc, [0, 0, 1]);
      };
      return [
        { sdf: torsoSdf(j, 0.45), mat: m, paint: (pc) => (pc[2] > 0 && Math.abs(pc[0]) < 0.45 ? { mat: m2 } : null) },
        { sdf: skirt(j.pelvis, -12.4, 2.0, 4.8 * j.build, 3.0 * j.build), mat: m, paint: trim },
        { sdf: intersect(inflate(legSdf(j, 'L'), 0.95), above(j.ankleL[1] + 0.4)), mat: m, paint: trim },
        { sdf: intersect(inflate(legSdf(j, 'R'), 0.95), above(j.ankleR[1] + 0.4)), mat: m, paint: trim },
        { sdf: union(capsule(j.shoulderL, j.elbowL, 1.75, 1.7), capsule(j.elbowL, lerp3(j.elbowL, j.handL, 0.7), 1.7, 2.2)), mat: m, paint: (pc) => (pc[1] < lerp3(j.elbowL, j.handL, 0.6)[1] ? { mat: m2 } : null) },
        { sdf: union(capsule(j.shoulderR, j.elbowR, 1.75, 1.7), capsule(j.elbowR, lerp3(j.elbowR, j.handR, 0.7), 1.7, 2.2)), mat: m, paint: (pc) => (pc[1] < lerp3(j.elbowR, j.handR, 0.6)[1] ? { mat: m2 } : null) },
        // high collar
        { sdf: intersect(capsule(add(j.neck, v(0, -0.5, -0.3)), add(j.neck, v(0, 0.8, -0.6)), 2.1), subtract(above(j.neck[1] - 0.8), roundBox(add(j.neck, v(0, 0.5, 2.0)), v(1.3, 1.6, 1.4), 0.4))), mat: m },
      ];
    },
  },
  sash: {
    mat: 'clothRed', mat2: 'gold',
    fn: (j, m) => {
      const y = j.pelvis[1] + 1.4;
      return [
        { sdf: intersect(torsoSdf(j, 0.85), above(y - 0.7), below(y + 0.7)), mat: m },
        { sdf: capsule(add(j.pelvis, v(1.2, 1.2, 2.6)), add(j.pelvis, v(1.6, -2.5, 2.9)), 0.55, 0.4), mat: m },
      ];
    },
  },
  hood: {
    anchor: 'head', mat: 'clothDeepBlue',
    hairCut: (j) => union(helmCut(ellipsoid(add(j.head, v(0, 0.5, -0.5)), v(3.75, 4.0, 3.75)), 1.0, roundBox(add(j.head, v(0, -0.4, 3.2)), v(2.6, 2.7, 2.6), 1.3)), subtract(aboveRim(j, 2.4), roundBox(add(j.head, v(0, -0.4, 3.2)), v(2.6, 2.7, 2.6), 1.3))),
    fn: (j, m) => {
      const shell = ellipsoid(add(j.head, v(0, 0.5, -0.5)), v(3.75, 4.0, 3.75));
      const face = roundBox(add(j.head, v(0, -0.4, 3.2)), v(2.6, 2.7, 2.6), 1.3);
      const tip = capsule(add(j.head, v(0, 1.0, -3.0)), add(j.head, v(0, -2.0, -4.6)), 1.6, 0.5);
      return [{ sdf: union(subtract(shell, face), tip), mat: m, paint: folds(j.head, 5, 0.85) }];
    },
  },
  helmOpen: {
    anchor: 'head', mat: 'steel', mat2: 'leather',
    hairCut: (j) => union(helmCut(intersect(ellipsoid(add(j.head, v(0, 0.3, -0.1)), v(3.4, 3.75, 3.4)), above(j.head[1] + 0.5))), aboveRim(j, 0.5)),
    fn: (j, m) => [
      { sdf: intersect(ellipsoid(add(j.head, v(0, 0.3, -0.1)), v(3.4, 3.75, 3.4)), above(j.head[1] + 0.5)), mat: m, paint: (pc) => (Math.abs(pc[1] - (j.head[1] + 0.85)) < 0.3 ? { dl: -1 } : null) },
      { sdf: roundBox(add(j.head, v(0, 0.0, 3.1)), v(0.35, 1.3, 0.35), 0.2), mat: m },
    ],
  },
  helmKnight: {
    anchor: 'head', mat: 'steel', mat2: 'clothRed',
    hairCut: (j) => union(helmCut(ellipsoid(add(j.head, v(0, 0.2, 0)), v(3.5, 3.85, 3.5))), aboveRim(j, 0.5)),
    fn: (j, m, m2) => [
      {
        sdf: subtract(ellipsoid(add(j.head, v(0, 0.2, 0)), v(3.5, 3.85, 3.5)), roundBox(add(j.head, v(0, 0.35, 3.2)), v(2.1, 0.32, 1.2), 0.1)), mat: m,
        paint: (pc) => (pc[2] > j.head[2] + 1.5 && Math.abs(pc[0] - j.head[0]) < 0.3 && pc[1] < j.head[1] ? { dl: 1 } : Math.abs(pc[1] - (j.head[1] + 1.4)) < 0.2 ? { dl: -1 } : null),
      },
      { sdf: capsule(add(j.head, v(0, 3.95, 1.6)), add(j.head, v(0, 3.4, -2.9)), 0.95, 0.6), mat: m2 },
      { sdf: capsule(add(j.head, v(0, 3.0, -2.9)), add(j.head, v(0, -1.5, -4.2)), 0.7, 0.35), mat: m2 }, // plume tail
    ],
  },
  circlet: {
    anchor: 'head', mat: 'gold', mat2: 'arcane',
    hairCut: (j) => headbandCut(j, 0.95, 1.6, 3.35),
    fn: (j, m, m2) => [
      { sdf: headband(j.head, 0.95, 1.6, 3.35), mat: m, underHair: true },
      { sdf: sphere(add(j.head, v(0, 1.3, 3.1)), 0.6), mat: m2 },
    ],
  },
  sword: {
    anchor: 'handR', mat: 'steel', mat2: 'gold',
    fn: (j, m, m2) => {
      const dir = j.gripR ?? norm(add(j.forearmR, v(0, 0.55, 1.15)));
      const side = norm([dir[2], 0, -dir[0]] as V3);
      const h = j.handR;
      return [
        { sdf: capsule(add(h, mul(dir, 1.7)), add(h, mul(dir, 10.5)), 0.8, 0.35), mat: m },
        // fuller: a darker groove down the middle of the blade
        { sdf: capsule(add(h, mul(dir, 2.4)), add(h, mul(dir, 8.6)), 0.3, 0.15), mat: m, paint: () => ({ dl: -1 }) },
        { sdf: capsule(add(add(h, mul(dir, 1.1)), mul(side, 2.0)), sub(add(h, mul(dir, 1.1)), mul(side, 2.0)), 0.5), mat: m2 },
        { sdf: sphere(sub(h, mul(dir, 1.0)), 0.65), mat: m2 },
      ];
    },
  },
  scabbard: {
    mat: 'leatherDark', mat2: 'gold',
    fn: (j, m, m2) => {
      const top = add(j.pelvis, v(2.6 * j.build, 0.6, 0.6));
      return [
        { sdf: capsule(top, add(top, v(0.6, -7.5, -2.6)), 0.7, 0.55), mat: m, paint: band(top[1] - 0.6, top[1] + 0.2, m2) },
        { sdf: capsule(add(top, v(0, 0.5, 0.3)), add(top, v(-0.2, 2.2, 0.9)), 0.45), mat: m2 },
      ];
    },
  },
  shield: {
    anchor: 'handL', mat: 'wood', mat2: 'steel',
    fn: (j, m, m2) => {
      const c = add(lerp3(j.elbowL, j.handL, 0.5), v(1.6, 0.3, 0.6));
      return [
        { sdf: roundBox(c, v(0.45, 3.0, 2.5), 0.75, -0.7), mat: m, paint: (pc) => (Math.abs(pc[2] - c[2]) < 0.25 || Math.abs(pc[1] - c[1]) < 0.25 ? { dl: -1 } : null) },
        { sdf: subtract(roundBox(c, v(0.6, 3.15, 2.65), 0.8, -0.7), roundBox(c, v(0.85, 2.6, 2.1), 0.55, -0.7)), mat: m2 },
        { sdf: sphere(add(c, v(0.45, 0, 0.45)), 0.8), mat: m2 },
      ];
    },
  },
  staff: {
    anchor: 'handR', mat: 'wood', mat2: 'arcane',
    fn: (j, m, m2) => {
      const h = j.handR;
      const top = add(h, v(0, 9.5, 0.6));
      return [
        { sdf: capsule(add(h, v(0, -7, -0.3)), top, 0.55, 0.65), mat: m },
        { sdf: sphere(add(top, v(0, 1.5, 0)), 1.4), mat: m2 },
        { sdf: union(capsule(add(top, v(-1.3, 0.1, 0)), add(top, v(-0.6, 2.9, 0)), 0.35), capsule(add(top, v(1.3, 0.1, 0)), add(top, v(0.6, 2.9, 0)), 0.35)), mat: 'gold' },
        { sdf: inflate(capsule(add(top, v(-1.2, 0.0, 0)), add(top, v(1.2, 0.0, 0)), 0.1), 0.35), mat: 'gold' },
      ];
    },
  },
};

export interface LookOptions {
  weaponScale?: number;
  anime?: boolean;
  /** Turn the head (and everything worn on it) around its center, radians. Battle view: body toward the enemy, face toward us. */
  headTurn?: number;
  /** Add bangs and cheek locks so hair frames the face (crisp style). */
  frameFace?: boolean;
  /** Toward the camera, in character space (flat weapons face it). */
  view?: V3;
}

export function lookParts(look: Look, j0: Joints, opts: LookOptions = {}): Part[] {
  const j: Joints = opts.view ? { ...j0, view: opts.view } : j0;
  const brow = look.hair?.mat ?? 'hairBrown';
  const tag = (ps: Part[], group: Part['group']) => ps.map((p) => ({ ...p, group: p.group ?? group }));
  const parts = tag(bodyParts(j, look.skin ?? 'skin', brow, !!opts.anime, look.iris ?? 'irisBlue'), 'body');
  if (look.hair) parts.push(...tag(hairParts(j, look.hair.style, look.hair.mat, opts.frameFace), 'hair'));
  if (look.beard) parts.push(...tag(beardParts(j, look.beard, brow), 'hair'));
  for (const it of look.items) {
    const def = ITEMS[it.id];
    if (!def) throw new Error(`Unknown item ${it.id}`);
    const made = def.fn(j, it.mat ?? def.mat, it.mat2 ?? def.mat2 ?? def.mat);
    if (def.anchor) for (const p of made) p.anchor ??= def.anchor;
    parts.push(...tag(made, def.anchor === 'handR' || def.anchor === 'handL' ? 'held' : 'outfit'));
  }
  // Drapes lie on the hair: push each one out until it clears the hair (no hair, no push).
  const hairSdfs = parts.filter((p) => p.group === 'hair').map((p) => p.sdf);
  if (hairSdfs.length) {
    const hair = union(...hairSdfs);
    for (let i = 0; i < parts.length; i++) {
      const r = parts[i].restOnHair;
      if (!r) continue;
      const dir = norm(r.dir);
      let d = 0;
      while (d < 6 && r.at.some(([p, rad]) => hair(add(p, mul(dir, d))) < rad)) d += 0.05;
      if (d === 0) continue;
      const off = mul(dir, d), sdf = parts[i].sdf, paint = parts[i].paint;
      parts[i] = { ...parts[i], sdf: (q) => sdf(sub(q, off)), paint: paint && ((pc: V3, n: V3) => paint(sub(pc, off), n)) };
    }
  }
  // Headwear sits on the hair: carve the hair away wherever a hat, helm or band is,
  // so no hair pokes through a brim and no band pokes out through the hair.
  const headwear = parts.filter((p) => p.group === 'outfit' && p.anchor === 'head' && !p.underHair).map((p) => p.sdf);
  for (const it of look.items) { const cut = ITEMS[it.id].hairCut; if (cut) headwear.push(cut(j)); }
  if (headwear.length) {
    const cover = inflate(union(...headwear), 0.35);
    for (let i = 0; i < parts.length; i++) if (parts[i].group === 'hair') parts[i] = { ...parts[i], sdf: subtract(parts[i].sdf, cover) };
  }
  // Scale anchored parts: heads by the body's head scale, held items by the weapon scale.
  const ws = opts.weaponScale ?? 1;
  const turn = opts.headTurn ?? 0;
  return parts.map((p) => {
    if (!p.anchor) return p;
    const c = p.anchor === 'head' ? j.head : p.anchor === 'handR' ? j.handR : j.handL;
    const s = p.anchor === 'head' ? j.hs : ws;
    let out = p;
    if (s !== 1) {
      const paint = p.paint;
      out = { ...p, sdf: scaleAbout(p.sdf, c, s), paint: paint && ((pc: V3, n: V3) => paint(unscalePoint(pc, c, s), n)) };
    }
    if (p.anchor === 'head' && turn) {
      const sdf = out.sdf, paint = out.paint;
      const back = (q: V3): V3 => add(c, rotY(sub(q, c), -turn));
      out = { ...out, sdf: (q) => sdf(back(q)), paint: paint && ((pc: V3, n: V3) => paint(back(pc), rotY(n, -turn))) };
    }
    return out;
  });
}
