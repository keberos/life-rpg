// More gear for every slot. Registered into ITEMS on import.
import type { Joints } from './rig.ts';
import { add, capsule, ellipsoid, inflate, intersect, lerp3, mul, norm, roundBox, skirt, sphere, sub, subtract, union, v, type Sdf, type V3 } from './sdf.ts';
import { ITEMS, above, aboveRim, band, below, folds, headband, headbandCut, helmCut, legSdf, sleeve, torsoSdf, type ItemDef, type Part } from './wardrobe.ts';

/** Direction a one-handed weapon points from the right hand (same as the sword). */
const gripDir = (j: Joints) => j.gripR ?? norm(add(j.forearmR, v(0, 0.55, 1.15)));
const sideOf = (dir: V3) => norm([dir[2], 0, -dir[0]] as V3);
/** Studs/rivets in a grid on the front. */
const rivets = (spacing: number): NonNullable<Part['paint']> => (pc) => {
  const gx = Math.abs((pc[0] / spacing) % 1), gy = Math.abs((pc[1] / spacing) % 1);
  return pc[2] > 0 && gx < 0.28 && gy < 0.28 ? { dl: 2, keep: true } : null;
};

const MORE: Record<string, ItemDef> = {
  // ---------------- Heads ----------------
  wizardHat: {
    anchor: 'head', mat: 'clothPurple', mat2: 'gold',
    hairCut: (j) => intersect(ellipsoid(add(j.head, v(0, 1.7, 0)), v(5.0, 40, 5.0)), above(j.head[1] + 1.2)),
    fn: (j, m, m2) => {
      const h = j.head;
      return [
        { sdf: ellipsoid(add(h, v(0, 1.7, 0)), v(5.0, 0.5, 5.0)), mat: m },
        { sdf: union(capsule(add(h, v(0, 2.1, 0)), add(h, v(0, 6.4, -1.0)), 3.1, 1.3), capsule(add(h, v(0, 6.4, -1.0)), add(h, v(0, 9.2, -3.0)), 1.3, 0.25)), mat: m, paint: band(h[1] + 2.0, h[1] + 2.8, m2) },
      ];
    },
  },
  travelerHat: {
    anchor: 'head', mat: 'leather', mat2: 'clothRed',
    hairCut: (j) => intersect(ellipsoid(add(j.head, v(0, 1.95, 0)), v(5.4, 40, 5.4)), above(j.head[1] + 1.5)),
    fn: (j, m, m2) => {
      const h = j.head;
      return [
        { sdf: ellipsoid(add(h, v(0, 1.95, 0)), v(5.4, 0.42, 5.4)), mat: m },
        { sdf: roundBox(add(h, v(0, 3.0, -0.1)), v(2.7, 1.5, 2.7), 1.3), mat: m, paint: band(h[1] + 2.0, h[1] + 2.7, 'leatherDark') },
        { sdf: capsule(add(h, v(2.7, 2.6, 0.4)), add(h, v(3.6, 5.6, -1.6)), 0.55, 0.15), mat: m2 },
      ];
    },
  },
  hornedHelm: {
    anchor: 'head', mat: 'steelDark', mat2: 'bone',
    hairCut: (j) => union(helmCut(intersect(ellipsoid(add(j.head, v(0, 0.3, -0.1)), v(3.45, 3.8, 3.45)), above(j.head[1] + 0.3))), aboveRim(j, 0.3)),
    fn: (j, m, m2) => {
      const h = j.head;
      const horn = (s: 1 | -1) => union(
        capsule(add(h, v(s * 2.9, 1.7, 0.2)), add(h, v(s * 4.6, 3.1, 0.8)), 0.85, 0.55),
        capsule(add(h, v(s * 4.6, 3.1, 0.8)), add(h, v(s * 4.9, 5.2, 1.7)), 0.55, 0.12),
      );
      return [
        { sdf: intersect(ellipsoid(add(h, v(0, 0.3, -0.1)), v(3.45, 3.8, 3.45)), above(h[1] + 0.3)), mat: 'steel', paint: (pc) => (Math.abs(pc[1] - (h[1] + 0.7)) < 0.35 ? { dl: -1 } : null) },
        { sdf: roundBox(add(h, v(0, -0.2, 3.1)), v(0.4, 1.4, 0.35), 0.2), mat: 'steel' },
        { sdf: union(horn(1), horn(-1)), mat: m2, paint: (pc) => (Math.sin(pc[1] * 3.2) > 0.75 ? { dl: -1 } : null) },
      ];
    },
  },
  bandana: {
    anchor: 'head', mat: 'clothRed',
    hairCut: (j) => headbandCut(j, 1.3, 2.6),
    fn: (j, m) => {
      const h = j.head;
      return [
        // The band shows across the front (hairCut clears the fringe there) and goes under the hair at the back.
        { sdf: headband(h, 1.3, 2.6), mat: m, underHair: true },
        // Knot and short tails at the back rest on the hair (restOnHair).
        {
          sdf: union(sphere(add(h, v(0, 1.9, -3.3)), 0.7), capsule(add(h, v(0.3, 1.6, -3.3)), add(h, v(0.9, -0.3, -3.9)), 0.6, 0.35), capsule(add(h, v(-0.3, 1.6, -3.3)), add(h, v(-0.6, 0.1, -4.0)), 0.6, 0.35)),
          mat: m,
          restOnHair: { at: [[add(h, v(0, 1.9, -3.3)), 0.6], [add(h, v(0.9, -0.3, -3.9)), 0.3], [add(h, v(-0.6, 0.1, -4.0)), 0.3]], dir: v(0, 0, -1) },
        },
      ];
    },
  },
  crown: {
    anchor: 'head', mat: 'gold', mat2: 'clothRed',
    hairCut: (j) => headbandCut(j, 1.2, 2.5),
    fn: (j, m, m2) => {
      const h = j.head;
      const ring = headband(h, 1.2, 2.5);
      const points: Sdf[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const base = add(h, v(3.0 * Math.sin(a), 2.4, 3.0 * Math.cos(a)));
        points.push(capsule(base, add(base, v(0, 1.4, 0)), 0.45, 0.12));
      }
      return [
        { sdf: ring, mat: m, underHair: true },
        { sdf: union(...points), mat: m },
        { sdf: sphere(add(h, v(0, 1.85, 3.3)), 0.55), mat: m2 },
      ];
    },
  },

  // ---------------- Bodies ----------------
  leatherArmor: {
    mat: 'leather', mat2: 'leatherDark',
    fn: (j, m, m2) => [
      { sdf: intersect(torsoSdf(j, 0.72), above(j.pelvis[1] - 0.6)), mat: m, paint: rivets(1.4) },
      { sdf: skirt(j.pelvis, -3.0, 0.6, 3.5 * j.build, 3.1 * j.build), mat: m2, paint: folds(j.pelvis, 8, 0.6) },
      { sdf: ellipsoid(add(j.shoulderL, v(0.6, 0.6, 0)), v(2.3, 1.6, 2.3)), mat: m2, paint: rivets(1.2) }, // one big pauldron
    ],
  },
  brigandine: {
    mat: 'clothRed', mat2: 'gold',
    fn: (j, m, m2) => [
      { sdf: intersect(torsoSdf(j, 0.75), above(j.pelvis[1] - 0.2)), mat: m, paint: (pc) => rivets(1.1)(pc, [0, 0, 1]) ? { mat: m2, keep: true } : null },
      { sdf: union(ellipsoid(add(j.shoulderL, v(0.4, 0.5, 0)), v(2.0, 1.4, 2.0)), ellipsoid(add(j.shoulderR, v(-0.4, 0.5, 0)), v(2.0, 1.4, 2.0))), mat: 'steel' },
    ],
  },
  gi: {
    mat: 'clothWhite', mat2: 'clothBlack',
    fn: (j, m, m2) => {
      // wrap top with a diagonal lapel, wide sleeves, loose trousers
      const lapel: NonNullable<Part['paint']> = (pc) => {
        if (pc[2] < 0) return null;
        const d = pc[0] - (pc[1] - j.chest[1]) * 0.75;
        return Math.abs(d) < 0.35 ? { mat: m2 } : d > 0 ? { dl: -1 } : null;
      };
      return [
        { sdf: intersect(torsoSdf(j, 0.45), above(j.pelvis[1] - 0.5)), mat: m, paint: lapel },
        { sdf: union(sleeve(j.shoulderL, j.elbowL, 1.0, 2.0, 2.1), sleeve(j.shoulderR, j.elbowR, 1.0, 2.0, 2.1)), mat: m },
        { sdf: intersect(inflate(legSdf(j, 'L'), 0.7), above(j.ankleL[1] + 0.9)), mat: m, paint: folds(j.kneeL, 3, 0.85) },
        { sdf: intersect(inflate(legSdf(j, 'R'), 0.7), above(j.ankleR[1] + 0.9)), mat: m, paint: folds(j.kneeR, 3, 0.85) },
      ];
    },
  },
  stole: {
    mat: 'gold', mat2: 'clothRed',
    fn: (j, m, m2) => {
      const strip = (s: 1 | -1) => roundBox(add(lerp3(j.pelvis, j.chest, 0.35), v(s * 1.3, -1.5, 2.65)), v(0.55, 6.6, 0.4), 0.2);
      const cross: NonNullable<Part['paint']> = (pc) => {
        const ly = pc[1] - (j.pelvis[1] - 5.6);
        return Math.abs(ly) < 0.9 && Math.abs(Math.abs(pc[0]) - 1.3) < 0.18 ? { mat: m2, keep: true } : Math.abs(ly) < 0.18 ? { mat: m2, keep: true } : null;
      };
      return [
        { sdf: union(strip(1), strip(-1)), mat: m, paint: cross },
        { sdf: capsule(add(j.shoulderL, v(-1.4, 0.4, 0.6)), add(j.shoulderR, v(1.4, 0.4, 0.6)), 0.6), mat: m },
      ];
    },
  },
  furMantle: {
    mat: 'fur',
    fn: (j, m) => [
      { sdf: union(
          capsule(add(j.shoulderL, v(0.4, 0.7, -0.3)), add(j.shoulderR, v(-0.4, 0.7, -0.3)), 2.0),
          ellipsoid(add(j.chest, v(0, 0.9, -1.6)), v(4.3 * j.build, 2.2, 2.4)),
        ), mat: m, paint: (pc) => (Math.sin(pc[0] * 3.1 + pc[2] * 2.3) > 0.6 ? { dl: -1 } : Math.sin(pc[0] * 2.3 - pc[1] * 4) > 0.85 ? { dl: 1 } : null) },
    ],
  },
  coat: {
    mat: 'clothBlack', mat2: 'silver',
    fn: (j, m, m2) => [
      { sdf: torsoSdf(j, 0.55), mat: m, paint: (pc) => (pc[2] > 0 && Math.abs(pc[0] - 0.9) < 0.2 ? { mat: m2 } : pc[2] > 0 && Math.abs(pc[0] - 0.35) < 0.15 ? { dl: -1 } : null) },
      { sdf: subtract(skirt(j.pelvis, -9.5, 0.8, 4.3 * j.build, 3.2 * j.build), roundBox(add(j.pelvis, v(0, -6, 4.2)), v(1.2, 5, 1.5), 0.5)), mat: m, paint: folds(j.pelvis, 6) },
      { sdf: union(sleeve(j.shoulderL, j.handL, 0.85, 1.85, 1.6), sleeve(j.shoulderR, j.handR, 0.85, 1.85, 1.6)), mat: m },
      { sdf: intersect(capsule(add(j.neck, v(0, -0.4, -0.4)), add(j.neck, v(0, 1.1, -0.9)), 2.2), subtract(above(j.neck[1] - 0.7), roundBox(add(j.neck, v(0, 0.6, 2.0)), v(1.4, 1.8, 1.5), 0.4))), mat: m },
    ],
  },
  cloak: {
    mat: 'clothForest', mat2: 'leather',
    fn: (j, m, m2) => {
      const top = add(j.chest, v(0, 1.5, -2.6));
      const c = add(top, v(0, -7.6, -1.1));
      return [
        { sdf: roundBox(c, v(4.4 * j.build, 7.9, 0.45), 0.4, 0, -0.12), mat: m, paint: folds(add(c, v(0, 0, 6)), 8, 0.78) },
        { sdf: capsule(add(j.shoulderL, v(-0.2, 0.5, -1.0)), add(j.shoulderR, v(0.2, 0.5, -1.0)), 1.35), mat: m },
        // lowered hood bunched at the neck
        { sdf: ellipsoid(add(j.neck, v(0, 0.2, -2.0)), v(2.8, 1.6, 1.7)), mat: m },
        { sdf: sphere(add(j.neck, v(0.9, -0.6, 2.0)), 0.55), mat: m2 },
      ];
    },
  },

  // ---------------- Flowing pieces (sway with motion) ----------------
  scarf: {
    mat: 'clothRed',
    fn: (j, m) => {
      const n = j.neck, sw = j.sway;
      const wrap = intersect(capsule(add(n, v(0, -1.0, 0.1)), add(n, v(0, 0.2, 0)), 2.15), above(n[1] - 1.6));
      const tail = (side: number, len: number) => union(
        capsule(add(n, v(side * 0.8, -0.6, -1.8)), add(n, v(side * 1.6 + sw * 1.2, -3.2, -3.4 - sw * 0.8)), 0.95, 0.85),
        capsule(add(n, v(side * 1.6 + sw * 1.2, -3.2, -3.4 - sw * 0.8)), add(n, v(side * 2.2 + sw * 2.6, -3.2 - len, -4.4 - sw * 2.2)), 0.85, 0.55),
      );
      return [{ sdf: union(wrap, tail(-1, 3.4), tail(0.4, 2.2)), mat: m, paint: folds(n, 6, 0.85) }];
    },
  },
  crossStrap: {
    mat: 'leatherDark', mat2: 'gold',
    fn: (j, m, m2) => {
      const a = add(j.shoulderL, v(-0.6, 0.4, 0));
      const b = add(j.pelvis, v(-2.4 * j.build * j.waistW, 0.8, 0));
      const strap = (z: number) => capsule(add(a, v(0, 0, z)), add(b, v(0, 0, z)), 0.55);
      return [
        { sdf: union(strap(2.6), strap(-2.6)), mat: m },
        { sdf: sphere(add(lerp3(a, b, 0.42), v(0, 0, 2.75)), 0.55), mat: m2 },
      ];
    },
  },
  hairRibbon: {
    mat: 'clothRed',
    anchor: 'head',
    fn: (j, m) => {
      const h = j.head, sw = j.sway;
      const knot = add(h, v(0, 1.6, -3.2));
      return [{
        restOnHair: { at: [[knot, 0.6], [add(knot, v(1.2, 0.3, 0)), 0.5], [add(knot, v(-1.2, 0.3, 0)), 0.5]], dir: v(0, 0.2, -1) },
        sdf: union(
          ellipsoid(add(knot, v(1.2, 0.3, 0)), v(1.2, 0.8, 0.4)),
          ellipsoid(add(knot, v(-1.2, 0.3, 0)), v(1.2, 0.8, 0.4)),
          capsule(knot, add(knot, v(0.8 + sw, -3.2, -0.8 - sw)), 0.45, 0.3),
          capsule(knot, add(knot, v(-0.6 + sw, -2.6, -0.6 - sw)), 0.45, 0.3),
        ), mat: m,
      }];
    },
  },

  // ---------------- Hands and arms ----------------
  bracers: {
    mat: 'leather', mat2: 'gold',
    fn: (j, m, m2) => [
      { sdf: union(capsule(lerp3(j.elbowL, j.handL, 0.3), lerp3(j.elbowL, j.handL, 0.85), 1.6, 1.45), capsule(lerp3(j.elbowR, j.handR, 0.3), lerp3(j.elbowR, j.handR, 0.85), 1.6, 1.45)), mat: m, paint: (pc) => (Math.sin(pc[1] * 4) > 0.8 ? { mat: m2 } : null) },
    ],
  },
  wraps: {
    mat: 'linen',
    fn: (j, m) => [
      { sdf: union(capsule(lerp3(j.elbowL, j.handL, 0.4), j.handL, 1.4, 1.25), capsule(lerp3(j.elbowR, j.handR, 0.4), j.handR, 1.4, 1.25)), mat: m, paint: (pc) => (Math.sin(pc[1] * 5 + pc[0] * 2) > 0.7 ? { dl: -1 } : null) },
    ],
  },
  amulet: {
    mat: 'gold', mat2: 'arcane',
    fn: (j, m, m2) => [
      { sdf: intersect(subtract(ellipsoid(add(j.neck, v(0, -1.4, 0.4)), v(2.5, 2.2, 2.6)), ellipsoid(add(j.neck, v(0, -1.4, 0.4)), v(2.2, 1.9, 2.3))), (p) => -(p[2] - j.neck[2])), mat: m },
      { sdf: sphere(add(j.chest, v(0, 0.9, 2.95)), 0.65), mat: m2 },
    ],
  },

  // ---------------- Backs ----------------
  quiver: {
    mat: 'leather', mat2: 'feather',
    fn: (j, m, m2) => {
      const a = add(j.shoulderR, v(0.6, 1.0, -2.6));
      const b = add(j.pelvis, v(1.8, 0.4, -2.7));
      const fl: Sdf[] = [];
      for (let i = 0; i < 4; i++) {
        const o = v(-0.5 + i * 0.35, 0, 0.2 * (i % 2));
        fl.push(capsule(add(a, add(o, v(0, 0.4, 0))), add(a, add(o, v(-0.6, 2.4, -0.2))), 0.35, 0.25));
      }
      return [
        { sdf: capsule(a, b, 1.25, 1.1), mat: m, paint: band(a[1] - 0.8, a[1] - 0.2, 'leatherDark') },
        { sdf: union(...fl), mat: m2 },
        { sdf: capsule(add(j.shoulderR, v(0, 0.6, 1.8)), add(j.pelvis, v(2.9, 1.0, 2.1)), 0.35), mat: 'leatherDark' }, // strap
      ];
    },
  },
  backpack: {
    mat: 'burlap', mat2: 'leather',
    fn: (j, m, m2) => [
      { sdf: roundBox(add(j.chest, v(0, -1.0, -3.6)), v(2.8, 3.0, 1.4), 0.9), mat: m, paint: band(j.chest[1] + 0.4, j.chest[1] + 1.1, m2) },
      { sdf: capsule(add(j.chest, v(-2.6, -2.0, -4.6)), add(j.chest, v(2.6, -2.0, -4.6)), 0.85), mat: 'clothRed' }, // bedroll
    ],
  },
  greatswordBack: {
    mat: 'steel', mat2: 'gold',
    fn: (j, m, m2) => {
      const a = add(j.pelvis, v(-2.6, -2.5, -2.9));
      const b = add(j.chest, v(2.6, 6.0, -3.1));
      const dir = norm(sub(b, a));
      return [
        { sdf: capsule(a, sub(b, mul(dir, 3.2)), 0.45, 1.05), mat: m },
        { sdf: capsule(add(sub(b, mul(dir, 3.0)), v(-1.6, -1.6, 0)), add(sub(b, mul(dir, 3.0)), v(1.6, 1.6, 0)), 0.5), mat: m2 },
        { sdf: capsule(sub(b, mul(dir, 2.8)), b, 0.5), mat: 'leatherDark' },
      ];
    },
  },
  wings: {
    mat: 'feather', mat2: 'holy',
    fn: (j, m) => {
      const wing = (s: 1 | -1) => union(
        ellipsoid(add(j.chest, v(s * 4.3, 2.6, -3.6)), v(3.4, 2.0, 0.6)),
        ellipsoid(add(j.chest, v(s * 6.2, 0.4, -3.8)), v(2.2, 4.2, 0.55)),
        ellipsoid(add(j.chest, v(s * 5.0, -2.6, -3.6)), v(1.5, 3.6, 0.5)),
      );
      return [{ sdf: union(wing(1), wing(-1)), mat: m, paint: (pc) => (Math.sin(pc[1] * 2.2 + Math.abs(pc[0]) * 0.8) > 0.75 ? { dl: -1 } : null) }];
    },
  },

  // ---------------- Main hand ----------------
  axe: {
    anchor: 'handR', mat: 'steel', mat2: 'wood',
    fn: (j, m, m2) => {
      const dir = gripDir(j), side = sideOf(dir), h = j.handR;
      const headC = add(h, mul(dir, 6.6));
      return [
        { sdf: capsule(sub(h, mul(dir, 1.2)), add(h, mul(dir, 7.6)), 0.5), mat: m2 },
        // Bearded blade: a narrow neck off the haft flaring into a tall curved edge, plus a back spike.
        { sdf: union(
            roundBox(add(headC, mul(side, -0.9)), v(0.5, 0.8, 0.8), 0.25),
            subtract(ellipsoid(add(headC, mul(side, -2.5)), v(0.5, 3.3, 1.5)), ellipsoid(add(headC, mul(side, -0.5)), v(1.2, 2.5, 1.6))),
            capsule(headC, add(headC, mul(side, 1.8)), 0.35),
          ), mat: m },
      ];
    },
  },
  mace: {
    anchor: 'handR', mat: 'steel', mat2: 'wood',
    fn: (j, m, m2) => {
      const dir = gripDir(j), h = j.handR;
      const headC = add(h, mul(dir, 6.4));
      const flanges: Sdf[] = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        flanges.push(sphere(add(headC, v(1.65 * Math.cos(a), 0.3 * Math.sin(a * 2), 1.65 * Math.sin(a))), 0.75));
      }
      return [
        { sdf: capsule(sub(h, mul(dir, 1.2)), add(h, mul(dir, 5.6)), 0.5), mat: m2 },
        { sdf: union(sphere(headC, 1.6), ...flanges), mat: m },
      ];
    },
  },
  spear: {
    anchor: 'handR', mat: 'wood', mat2: 'steel',
    fn: (j, m, m2) => {
      const h = j.handR, top = add(h, v(0, 12.5, 1.4));
      return [
        { sdf: capsule(add(h, v(0, -6, -0.6)), top, 0.45), mat: m },
        { sdf: capsule(top, add(top, v(0, 3.4, 0.4)), 0.9, 0.1), mat: m2 },
        { sdf: capsule(add(top, v(0, -0.8, 0)), add(top, v(0, -0.1, 0)), 0.6), mat: 'clothRed' },
      ];
    },
  },
  hammer: {
    anchor: 'handR', mat: 'steel', mat2: 'wood',
    fn: (j, m, m2) => {
      const dir = gripDir(j), side = sideOf(dir), h = j.handR;
      const headC = add(h, mul(dir, 7.0));
      return [
        { sdf: capsule(sub(h, mul(dir, 1.2)), add(h, mul(dir, 7.4)), 0.5), mat: m2 },
        { sdf: capsule(add(headC, mul(side, 2.4)), sub(headC, mul(side, 2.4)), 1.75), mat: m, paint: (pc) => (Math.abs(pc[1] - headC[1]) < 0.25 ? { dl: -1 } : null) },
      ];
    },
  },
  dagger: {
    anchor: 'handR', mat: 'steel', mat2: 'leatherDark',
    fn: (j, m, m2) => {
      const dir = gripDir(j), side = sideOf(dir), h = j.handR;
      return [
        { sdf: capsule(add(h, mul(dir, 1.3)), add(h, mul(dir, 5.0)), 0.6, 0.15), mat: m },
        { sdf: capsule(add(add(h, mul(dir, 0.9)), mul(side, 1.1)), sub(add(h, mul(dir, 0.9)), mul(side, 1.1)), 0.35), mat: 'gold' },
      ];
    },
  },
  wand: {
    anchor: 'handR', mat: 'wood', mat2: 'shadow',
    fn: (j, m, m2) => {
      const dir = gripDir(j), h = j.handR;
      return [
        { sdf: capsule(sub(h, mul(dir, 0.8)), add(h, mul(dir, 5.0)), 0.4, 0.3), mat: m },
        { sdf: sphere(add(h, mul(dir, 5.6)), 0.85), mat: m2 },
      ];
    },
  },
  runeblade: {
    anchor: 'handR', mat: 'shadow', mat2: 'silver',
    fn: (j, m, m2) => {
      const dir = gripDir(j), side = sideOf(dir), h = j.handR;
      return [
        { sdf: capsule(add(h, mul(dir, 1.7)), add(h, mul(dir, 11.0)), 0.85, 0.3), mat: m },
        { sdf: capsule(add(add(h, mul(dir, 1.1)), mul(side, 2.2)), sub(add(h, mul(dir, 1.1)), mul(side, 2.2)), 0.5, 0.3), mat: m2 },
        { sdf: sphere(sub(h, mul(dir, 1.0)), 0.6), mat: m2 },
      ];
    },
  },

  // ---------------- Off hand ----------------
  bow: {
    anchor: 'handL', mat: 'wood', mat2: 'linen',
    fn: (j, m, m2) => {
      const h = add(j.handL, v(0.3, 0, 0.6));
      const pts: V3[] = [];
      for (let i = 0; i <= 8; i++) {
        const t = -1 + (i / 8) * 2;
        pts.push(add(h, v(0.9 * (1 - t * t), t * 7.6, 2.6 * (1 - t * t))));
      }
      const limbs: Sdf[] = [];
      for (let i = 0; i < 8; i++) limbs.push(capsule(pts[i], pts[i + 1], i === 3 || i === 4 ? 0.85 : 0.6));
      return [
        { sdf: union(...limbs), mat: m },
        { sdf: capsule(pts[0], pts[8], 0.15), mat: m2 },
      ];
    },
  },
  tome: {
    anchor: 'handL', mat: 'clothRed', mat2: 'gold',
    fn: (j, m, m2) => {
      const c = add(j.handL, v(0.6, 0.6, 1.2));
      return [
        { sdf: roundBox(c, v(1.7, 2.1, 0.75), 0.25, -0.3), mat: m, paint: (pc) => (Math.abs(pc[0] - c[0]) < 0.35 && Math.abs(pc[1] - c[1]) < 1.0 ? { mat: m2, keep: true } : null) },
        { sdf: roundBox(add(c, v(0.15, 0, 0)), v(1.5, 1.9, 0.85), 0.1, -0.3), mat: 'linen' },
      ];
    },
  },
  lantern: {
    anchor: 'handL', mat: 'leatherDark', mat2: 'flame',
    fn: (j, m, m2) => {
      const c = add(j.handL, v(0.4, -2.6, 0.8));
      return [
        { sdf: subtract(roundBox(c, v(1.2, 1.5, 1.2), 0.3), roundBox(c, v(0.9, 1.25, 1.6), 0.2)), mat: m },
        { sdf: subtract(roundBox(c, v(1.2, 1.5, 1.2), 0.3), roundBox(c, v(1.6, 1.25, 0.9), 0.2)), mat: m },
        { sdf: sphere(c, 0.9), mat: m2 },
        { sdf: capsule(add(c, v(0, 1.6, 0)), j.handL, 0.18), mat: m },
      ];
    },
  },
  orb: {
    anchor: 'handL', mat: 'arcane', mat2: 'gold',
    fn: (j, m, m2) => {
      const c = add(j.handL, v(0.4, 1.2, 1.4));
      return [
        { sdf: sphere(c, 1.45), mat: m },
        { sdf: intersect(subtract(sphere(c, 1.6), sphere(c, 1.35)), above(c[1] - 1.0), below(c[1] - 0.4)), mat: m2 },
      ];
    },
  },
  kiteShield: {
    anchor: 'handL', mat: 'clothBlue', mat2: 'silver',
    fn: (j, m, m2) => {
      const c = add(lerp3(j.elbowL, j.handL, 0.5), v(1.7, 0.2, 0.6));
      const body = union(
        roundBox(add(c, v(0, 1.2, 0)), v(0.45, 2.2, 2.5), 0.6, -0.7),
        roundBox(add(c, v(0, -1.6, 0)), v(0.45, 1.4, 1.7), 0.6, -0.7),
        roundBox(add(c, v(0, -3.4, 0)), v(0.45, 0.9, 0.8), 0.5, -0.7),
      );
      return [
        { sdf: body, mat: m, paint: (pc) => (Math.abs(pc[2] - c[2]) < 0.35 || Math.abs(pc[1] - (c[1] + 1.4)) < 0.3 ? { mat: m2 } : null) },
        { sdf: sphere(add(c, v(0.4, 1.4, 0.4)), 0.6), mat: m2 },
      ];
    },
  },
};

Object.assign(ITEMS, MORE);
export const MORE_ITEM_IDS = Object.keys(MORE);
