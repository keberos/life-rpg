// Detailed weapons. Each one is built from flat 2D silhouettes (blade outlines,
// guards, crescents) given a little thickness, plus round parts (grips, pommels,
// gems). Flat parts turn their broad side toward the camera, the way sprite
// artists always show the flat of a blade. Registered into ITEMS on import and
// override the simpler capsule weapons from wardrobe-more.ts.
//
// Weapon anatomy that makes each read at sprite size (see design/sprite-style-research.md):
// a silhouette you can name in black, a crossguard wider than the blade, a wrapped
// grip, a pommel, one bright accent (gem, glow, rune) in a hue used nowhere else.
import type { Joints } from './rig.ts';
import { add, capsule, dot, len, mul, norm, sphere, sub, union, v, type Sdf, type V3 } from './sdf.ts';
import { ITEMS, type ItemDef, type Part } from './wardrobe.ts';

type P2 = [number, number];

/** Signed distance to a closed 2D polygon (negative inside). */
export function poly2(pts: P2[]) {
  return (x: number, y: number) => {
    let d = Infinity, s = 1;
    for (let i = 0, k = pts.length - 1; i < pts.length; k = i, i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[k];
      const ex = bx - ax, ey = by - ay, wx = x - ax, wy = y - ay;
      const t = Math.max(0, Math.min(1, (wx * ex + wy * ey) / (ex * ex + ey * ey)));
      const dx = wx - ex * t, dy = wy - ey * t;
      d = Math.min(d, dx * dx + dy * dy);
      const c1 = y >= ay, c2 = y < by, c3 = ex * wy > ey * wx;
      if ((c1 && c2 && c3) || (!c1 && !c2 && !c3)) s = -s;
    }
    return s * Math.sqrt(d);
  };
}
export const circle2 = (cx: number, cy: number, r: number) => (x: number, y: number) => Math.hypot(x - cx, y - cy) - r;
export const mirrorW = (pts: P2[]): P2[] => [...pts, ...[...pts].reverse().map(([x, y]) => [x, -y] as P2)];

const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** A weapon's own frame: u along the weapon, w across its flat, n out of the flat toward the camera. */
interface Frame { o: V3; u: V3; w: V3; n: V3 }
export function frameAt(j: Joints, o: V3, u: V3): Frame {
  const view = j.view ?? v(0, 0, 1);
  let n = sub(view, mul(u, dot(view, u)));
  if (len(n) < 1e-3) n = norm([u[2], 0, -u[0]]);
  n = norm(n);
  return { o, u, w: cross(n, u), n };
}
/** A frame whose flat faces a given direction n (u is projected to lie in the flat). */
export function frameFacing(o: V3, u: V3, n0: V3): Frame {
  const n = norm(n0);
  let uu = sub(u, mul(n, dot(u, n)));
  if (len(uu) < 1e-3) uu = norm([n[2], 0, -n[0]]);
  uu = norm(uu);
  return { o, u: uu, w: cross(n, uu), n };
}
export const local = (f: Frame, p: V3) => {
  const q = sub(p, f.o);
  return [dot(q, f.u), dot(q, f.w), dot(q, f.n)] as const;
};
export const at = (f: Frame, x: number, y: number, z = 0): V3 => add(add(add(f.o, mul(f.u, x)), mul(f.w, y)), mul(f.n, z));

/** A 2D shape in the weapon's frame, extruded to a thin slab (half-thickness t). */
export function flat(f: Frame, shape: (x: number, y: number) => number, t: number): Sdf {
  return (p) => {
    const [x, y, z] = local(f, p);
    const d2 = shape(x, y), dz = Math.abs(z) - t;
    return Math.min(Math.max(d2, dz), 0) + Math.hypot(Math.max(d2, 0), Math.max(dz, 0));
  };
}

/** Paint in the weapon's frame (x along, y across). */
export const paintF = (f: Frame, fn: (x: number, y: number) => ReturnType<NonNullable<Part['paint']>>): Part['paint'] => (pc) => {
  const [x, y] = local(f, pc);
  return fn(x, y);
};

/** Leather (or cloth) wrap: alternating bands along the grip. */
const wrapPaint = (f: Frame, pitch = 0.42): Part['paint'] => paintF(f, (x) => (((x / pitch) % 1) + 1) % 1 < 0.45 ? { dl: -1 } : null);

const gripDir = (j: Joints) => j.gripR ?? norm(add(j.forearmR, v(0, 0.55, 1.15)));

/** A grip from x0 to x1 along the frame, wrapped. */
const grip = (f: Frame, x0: number, x1: number, r: number, mat: string): Part => ({ sdf: capsule(at(f, x0, 0), at(f, x1, 0), r), mat, paint: wrapPaint(f) });

// ---------------------------------------------------------------- Swords
function swordParts(f: Frame, o: {
  blade: P2[]; bladeMat: string; guard: P2[]; guardMat: string; gripMat: string; pommel: Part[]; gem?: string; fuller?: [number, number]; runes?: string;
}): Part[] {
  const parts: Part[] = [
    {
      sdf: flat(f, poly2(o.blade), 0.16), mat: o.bladeMat,
      paint: paintF(f, (x, y) => {
        if (o.runes && Math.abs(y) < 0.24 && x > 2.4 && x < 9.4 && ((x / 1.35) % 1) < 0.5) return { mat: o.runes, keep: true };
        if (o.fuller && Math.abs(y) < 0.16 && x > o.fuller[0] && x < o.fuller[1]) return { dl: -1, keep: true };
        return null;
      }),
    },
    { sdf: flat(f, poly2(o.guard), 0.3), mat: o.guardMat },
    grip(f, -1.3, 0.9, 0.36, o.gripMat),
    ...o.pommel,
  ];
  if (o.gem) parts.push({ sdf: sphere(at(f, 1.3, 0, 0.25), 0.42), mat: o.gem });
  return parts;
}

const W: Record<string, ItemDef> = {
  /** Common drop: plain and honest. Straight blade, fuller, iron crossbar, wrapped grip, round pommel. */
  ironSword: {
    anchor: 'handR', mat: 'steel', mat2: 'ironDark',
    fn: (j, m, m2) => {
      const f = frameAt(j, j.handR, gripDir(j));
      return swordParts(f, {
        blade: [[1.5, -0.62], [9.0, -0.56], [10.8, 0], [9.0, 0.56], [1.5, 0.62]],
        bladeMat: m, fuller: [2.2, 8.4],
        guard: mirrorW([[1.0, 1.9], [1.55, 1.9]]),
        guardMat: m2, gripMat: 'leather',
        pommel: [{ sdf: sphere(at(f, -1.65, 0), 0.55), mat: m2 }],
      });
    },
  },
  /** Rare: a forked tip (two fangs), silver blade, gold guard with curled quillons and a blue gem. */
  twinfang: {
    anchor: 'handR', mat: 'silver', mat2: 'gold',
    fn: (j, m, m2) => {
      const f = frameAt(j, j.handR, gripDir(j));
      return swordParts(f, {
        blade: [[1.5, -0.6], [7.4, -0.88], [11.9, -0.55], [8.8, -0.02], [11.0, 0.8], [7.4, 0.88], [1.5, 0.6]],
        bladeMat: m, fuller: [2.2, 7.4],
        guard: [[1.7, -0.5], [1.3, -2.0], [0.1, -2.6], [-0.2, -2.2], [0.6, -1.5], [0.9, -0.5], [0.9, 0.5], [0.6, 1.5], [-0.2, 2.2], [0.1, 2.6], [1.3, 2.0], [1.7, 0.5]],
        guardMat: m2, gripMat: 'clothDeepBlue', gem: 'gemBlue',
        pommel: [{ sdf: flat(f, poly2([[-1.2, -0.45], [-2.3, 0], [-1.2, 0.45]]), 0.3), mat: m2 }, { sdf: sphere(at(f, -1.55, 0, 0.2), 0.3), mat: 'gemBlue' }],
      });
    },
  },
  /** Holy sword: broad blade, gold ricasso, winged guard, a glowing gem. */
  sword: {
    anchor: 'handR', mat: 'silver', mat2: 'gold',
    fn: (j, m, m2) => {
      const f = frameAt(j, j.handR, gripDir(j));
      const parts = swordParts(f, {
        blade: [[1.5, -0.95], [9.0, -0.85], [11.6, 0], [9.0, 0.85], [1.5, 0.95]],
        bladeMat: m, fuller: [3.2, 9.0],
        guard: [[1.6, -0.6], [1.9, -1.3], [3.0, -2.6], [2.2, -2.5], [1.2, -1.6], [0.8, -0.6], [0.8, 0.6], [1.2, 1.6], [2.2, 2.5], [3.0, 2.6], [1.9, 1.3], [1.6, 0.6]],
        guardMat: m2, gripMat: 'clothBlue', gem: 'holy',
        pommel: [{ sdf: sphere(at(f, -1.7, 0), 0.6), mat: m2 }],
      });
      // gold ricasso plate where the blade meets the guard
      parts.push({ sdf: flat(f, poly2(mirrorW([[1.6, 0.85], [2.9, 0.6]]).slice(0, 4)), 0.22), mat: m2 });
      return parts;
    },
  },
  /** Spellblade: dark notched blade with glowing runes, angular silver guard, an orb pommel. */
  runeblade: {
    anchor: 'handR', mat: 'obsidian', mat2: 'silver',
    fn: (j, m, m2) => {
      const f = frameAt(j, j.handR, gripDir(j));
      return swordParts(f, {
        blade: [[1.5, -0.62], [5.4, -0.8], [5.9, -0.45], [9.6, -0.72], [11.8, 0.25], [9.2, 0.72], [1.5, 0.68]],
        bladeMat: m, runes: 'shadow',
        guard: [[1.6, -0.5], [2.4, -2.2], [1.6, -1.9], [0.9, -0.5], [0.9, 0.5], [1.6, 1.9], [2.4, 2.2], [1.6, 0.5]],
        guardMat: m2, gripMat: 'leatherDark',
        pommel: [{ sdf: sphere(at(f, -1.7, 0), 0.6), mat: 'shadow' }],
      });
    },
  },
  /** Leaf-bladed dagger with a small curled guard. */
  dagger: {
    anchor: 'handR', mat: 'steel', mat2: 'gold',
    fn: (j, m, m2) => {
      const f = frameAt(j, j.handR, gripDir(j));
      return swordParts(f, {
        blade: [[1.2, -0.42], [3.4, -0.62], [5.6, 0], [3.4, 0.62], [1.2, 0.42]],
        bladeMat: m, fuller: [1.6, 3.6],
        guard: [[1.4, -0.4], [1.6, -1.2], [1.2, -1.4], [0.9, -0.4], [0.9, 0.4], [1.2, 1.4], [1.6, 1.2], [1.4, 0.4]],
        guardMat: m2, gripMat: 'leatherDark',
        pommel: [{ sdf: sphere(at(f, -1.5, 0), 0.45), mat: m2 }],
      });
    },
  },

  // ---------------------------------------------------------------- Axe and mace
  /** Bearded axe: crescent edge, socket, back spike, wrapped haft with an end cap. */
  axe: {
    anchor: 'handR', mat: 'steel', mat2: 'wood',
    fn: (j, m, m2) => {
      const f = frameAt(j, j.handR, gripDir(j));
      const blade = poly2([[6.0, -0.55], [4.9, -1.5], [4.2, -3.4], [5.4, -3.0], [6.6, -2.8], [8.0, -3.1], [8.9, -3.5], [8.5, -1.7], [7.3, -0.55]]);
      return [
        { sdf: capsule(at(f, -1.6, 0), at(f, 8.3, 0), 0.42), mat: m2, paint: paintF(f, (x) => (x < 1.1 && x > -1.3 && (((x / 0.42) % 1) + 1) % 1 < 0.45 ? { mat: 'leatherDark' } : null)) },
        { sdf: flat(f, blade, 0.2), mat: m, paint: paintF(f, (x, y) => (y < -2.4 && y > -2.75 ? { dl: 1, keep: true } : null)) },
        { sdf: flat(f, poly2([[5.8, -0.65], [7.6, -0.65], [7.6, 0.65], [5.8, 0.65]]), 0.55), mat: 'ironDark' },
        { sdf: flat(f, poly2([[6.3, 0.6], [6.85, 2.1], [7.2, 0.6]]), 0.25), mat: m },
        { sdf: sphere(at(f, 8.4, 0), 0.5), mat: 'ironDark' },
        { sdf: sphere(at(f, -1.8, 0), 0.5), mat: 'ironDark' },
      ];
    },
  },
  /** Flanged mace with a top spike, collar and pommel. */
  mace: {
    anchor: 'handR', mat: 'steel', mat2: 'wood',
    fn: (j, m, m2) => {
      const f = frameAt(j, j.handR, gripDir(j));
      const head = at(f, 6.4, 0);
      const flanges = flat(f, poly2([[5.2, -0.5], [5.6, -1.8], [7.2, -1.8], [7.6, -0.5], [7.6, 0.5], [7.2, 1.8], [5.6, 1.8], [5.2, 0.5]]), 0.32);
      return [
        { sdf: capsule(at(f, -1.4, 0), at(f, 5.4, 0), 0.4), mat: m2, paint: paintF(f, (x) => (x < 1.0 && (((x / 0.42) % 1) + 1) % 1 < 0.45 ? { mat: 'leatherDark' } : null)) },
        { sdf: union(sphere(head, 1.25), flanges), mat: m, paint: paintF(f, (x, y) => (Math.abs(y) > 1.2 ? { dl: 1, keep: true } : null)) },
        { sdf: flat(f, poly2([[7.4, -0.4], [8.9, 0], [7.4, 0.4]]), 0.3), mat: m },
        { sdf: capsule(at(f, 4.8, 0), at(f, 5.2, 0), 0.6), mat: 'gold' },
        { sdf: sphere(at(f, -1.65, 0), 0.5), mat: 'gold' },
      ];
    },
  },

  // ---------------------------------------------------------------- Staves and rods (held upright)
  /** Sage: a gold crescent moon cradling a glowing orb, rings down the shaft, a ribbon. */
  staff: {
    anchor: 'handR', mat: 'wood', mat2: 'arcane',
    fn: (j, m, m2) => {
      const h = j.handR;
      const f = frameAt(j, add(h, v(0, 9.6, 0.6)), v(0, 1, 0));
      const moon = (x: number, y: number) => Math.max(circle2(1.4, 0, 2.0)(x, y), -circle2(2.1, 0.25, 1.65)(x, y));
      return [
        { sdf: capsule(add(h, v(0, -7, -0.3)), at(f, 0, 0), 0.5, 0.6), mat: m, paint: paintF(f, (x) => (x < -9.0 && x > -10.6 && (((x / 0.42) % 1) + 1) % 1 < 0.45 ? { dl: -1 } : null)) },
        { sdf: flat(f, moon, 0.32), mat: 'gold' },
        { sdf: sphere(at(f, 2.0, 0.2), 1.05), mat: m2 },
        { sdf: union(capsule(at(f, -0.3, 0), at(f, 0.2, 0), 0.8), capsule(at(f, -3.2, 0), at(f, -2.9, 0), 0.7)), mat: 'gold' },
        { sdf: capsule(at(f, -0.6, -0.7, 0.3), at(f, -3.4, -1.3, 0.5), 0.3, 0.15), mat: 'clothRed' },
      ];
    },
  },
  /** Common drop: gnarled oak, a root-claw crown holding a green crystal, a leather wrap. */
  oakStaff: {
    anchor: 'handR', mat: 'wood', mat2: 'gemGreen',
    fn: (j, m, m2) => {
      const h = j.handR;
      const f = frameAt(j, add(h, v(0, 9.2, 0.6)), v(0, 1, 0));
      // a slightly crooked shaft
      const pts: P2[] = [[-16.2, 0.1], [-11, -0.25], [-6, 0.2], [-2, -0.2], [0, 0]];
      const shaft: Sdf[] = [];
      for (let i = 0; i < pts.length - 1; i++) shaft.push(capsule(at(f, ...pts[i]), at(f, ...pts[i + 1]), 0.55 + i * 0.04));
      const claw = [[[0, 0], [1.3, -1.9], [3.3, -1.5], [4.2, -0.6]], [[0, 0], [1.5, 1.8], [3.5, 1.5], [4.1, 0.5]], [[0, 0], [2.4, -0.3], [4.6, 0.1]]] as P2[][];
      const prongs: Sdf[] = claw.flatMap((c) => c.slice(1).map((p, i) => capsule(at(f, ...c[i]), at(f, ...p), 0.6 - i * 0.17, 0.43 - i * 0.14)));
      return [
        { sdf: union(...shaft), mat: m, paint: paintF(f, (x) => (x < -9.2 && x > -10.8 && (((x / 0.42) % 1) + 1) % 1 < 0.45 ? { mat: 'leather' } : null)) },
        { sdf: union(...prongs), mat: m },
        { sdf: flat(f, poly2([[1.2, 0], [2.4, -0.95], [3.9, 0], [2.4, 0.95]]), 0.5), mat: m2 },
      ];
    },
  },
  /** Epic drop: a short gold scepter whose prong cage holds a burning crystal. Held one-handed. */
  emberglassRod: {
    anchor: 'handR', mat: 'gold', mat2: 'gemRed',
    fn: (j, m, m2) => {
      const f = frameAt(j, j.handR, gripDir(j));
      const crystal = poly2([[5.2, 0], [6.6, -1.0], [8.8, 0], [6.6, 1.0]]);
      const cage = poly2([[5.0, -0.35], [5.6, -1.25], [7.2, -1.15], [6.4, -0.85], [5.6, -0.3], [5.6, 0.3], [6.4, 0.85], [7.2, 1.15], [5.6, 1.25], [5.0, 0.35]]);
      return [
        { sdf: capsule(at(f, -1.6, 0), at(f, 5.2, 0), 0.38, 0.45), mat: m, paint: paintF(f, (x) => ((x > 1.6 && x < 2.0) || (x > 3.6 && x < 4.0) ? { mat: 'flame', keep: true } : null)) },
        { sdf: flat(f, crystal, 0.42), mat: m2 },
        { sdf: flat(f, cage, 0.5), mat: m },
        { sdf: sphere(at(f, -1.85, 0), 0.5), mat: m },
        { sdf: capsule(at(f, -1.9, 0.3, 0.3), at(f, -3.4, 0.8, 0.4), 0.22, 0.1), mat: 'clothRed' },
      ];
    },
  },

  // ---------------------------------------------------------------- Bow
  /** Recurve bow: shaped limbs that curl at the tips, a wrapped grip, gold tip caps. */
  bow: {
    anchor: 'handL', mat: 'wood', mat2: 'linen',
    fn: (j, m, m2) => {
      const h = add(j.handL, v(0.3, 0, 0.6));
      const f = frameAt(j, h, v(0, 1, 0));
      // limb centerline: bowed toward the target (+n is toward camera; the bow belly faces forward, -w side)
      const P = (t: number): P2 => [t * 7.6, -(1 - t * t) * 2.4 + Math.sign(t) * Math.max(0, Math.abs(t) - 0.82) * 4.5];
      const limbs: Sdf[] = [];
      for (let i = 0; i < 12; i++) {
        const t0 = -1 + (i / 12) * 2, t1 = -1 + ((i + 1) / 12) * 2;
        const r = Math.abs(t0 + t1) / 2 < 0.2 ? 0.7 : 0.5 - 0.2 * Math.abs(t0);
        limbs.push(capsule(at(f, ...P(t0)), at(f, ...P(t1)), r));
      }
      return [
        { sdf: union(...limbs), mat: m, paint: paintF(f, (x) => (Math.abs(x) < 1.0 ? ((((x / 0.4) % 1) + 1) % 1 < 0.5 ? { mat: 'leatherDark' } : { mat: 'leather' }) : null)) },
        { sdf: union(sphere(at(f, ...P(-1)), 0.5), sphere(at(f, ...P(1)), 0.5)), mat: 'gold' },
        { sdf: capsule(at(f, ...P(-0.97)), at(f, ...P(0.97)), 0.12), mat: m2 },
      ];
    },
  },
};

Object.assign(ITEMS, W);
export const WEAPON_IDS = Object.keys(W);
