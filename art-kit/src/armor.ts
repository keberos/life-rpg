// Detailed armor and shields. The crisp style drops shading-only paint (it
// speckles between frames), so every detail here is a real color change or a
// protected mark: trims in a second material, rivets, raised ridges, emblems,
// stacked plates. Shields are flat silhouettes held out in front so the
// shield arm (the far arm in the battle view) still shows them.
// Registered into ITEMS on import; overrides the simpler versions.
import { add, capsule, ellipsoid, inflate, intersect, lerp3, roundBox, skirt, sphere, union, v, type V3 } from './sdf.ts';
import { ITEMS, above, below, legSdf, sleeve, torsoSdf, type ItemDef, type Part } from './wardrobe.ts';
import { circle2, flat, frameAt, paintF, poly2 } from './weapons.ts';

type Paint = NonNullable<Part['paint']>;
const keep = (o: { mat?: string; dl?: number }) => ({ ...o, keep: true });

/** Rivets in a grid on the front (a different material, so they survive cleanup). */
const rivetGrid = (spacing: number, mat: string, front = 0.4): Paint => (pc) => {
  const gx = Math.abs((pc[0] / spacing) % 1), gy = Math.abs((pc[1] / spacing) % 1);
  return pc[2] > front && gx < 0.3 && gy < 0.3 ? keep({ mat }) : null;
};

/** Layered shoulder plates (lames) stacked down the arm, the top one trimmed. */
function pauldron(s: 1 | -1, sh: V3, m: string, trim: string, layers = 3, size = 1): Part[] {
  const out: Part[] = [];
  for (let i = 0; i < layers; i++) {
    const c = add(sh, v(s * (0.5 + i * 0.35), 0.75 - i * 0.95, 0));
    const r = v((2.45 - i * 0.25) * size, (1.45 - i * 0.12) * size, (2.5 - i * 0.25) * size);
    out.push({
      sdf: ellipsoid(c, r), mat: m,
      paint: (pc) => {
        const ly = pc[1] - c[1];
        if (i === 0 && ly > r[1] * 0.45) return keep({ mat: trim }); // trimmed top edge
        if (ly < -r[1] * 0.55) return keep({ dl: -1 }); // lower edge of each lame
        if (i === 0 && Math.abs(pc[2] - c[2]) < 0.35 && Math.abs(ly) < 0.35) return keep({ mat: trim }); // rivet
        return null;
      },
    });
  }
  return out;
}

const A: Record<string, ItemDef> = {
  plate: {
    mat: 'steel', mat2: 'gold',
    fn: (j, m, m2) => {
      const w = j.build;
      const chestC = add(j.chest, v(0, 0.15, 0.2));
      const waist = lerp3(j.pelvis, j.chest, 0.4);
      const breast: Paint = (pc) => {
        const lx = pc[0] - chestC[0], ly = pc[1] - chestC[1];
        if (ly > 1.9) return keep({ mat: m2 }); // gold-trimmed neckline
        if (pc[2] > 0.5) {
          // a gold sun emblem: a disc with four rays
          const r = Math.hypot(lx, ly - 0.2);
          if (r < 0.55 || (r < 1.15 && (Math.abs(lx) < 0.18 || Math.abs(ly - 0.2) < 0.18))) return keep({ mat: m2 });
          if (Math.abs(lx) < 0.28 && ly < -0.6) return keep({ dl: 1 }); // center ridge below the emblem
        }
        if (Math.abs(ly + 1.75) < 0.2) return keep({ dl: -1 }); // lower plate seam
        return null;
      };
      const lames: Paint = (pc) => {
        const ly = pc[1] - waist[1];
        if (Math.abs(ly - 0.55) < 0.18 || Math.abs(ly + 0.55) < 0.18) return keep({ dl: -1 });
        return Math.abs(pc[0]) > 2.9 * w && Math.abs(ly) < 0.3 ? keep({ mat: m2 }) : null;
      };
      const faulds: Paint = (pc) => {
        if (pc[1] < j.pelvis[1] - 2.9) return keep({ mat: m2 }); // gold hem
        if (Math.abs(pc[0]) < 0.25 && pc[2] > 0) return keep({ dl: -1 }); // split between the two front plates
        return Math.abs(pc[1] - (j.pelvis[1] - 1.4)) < 0.2 ? keep({ dl: -1 }) : null;
      };
      return [
        { sdf: roundBox(chestC, v(3.85 * w, 2.7, 3.15), 1.5), mat: m, paint: breast },
        { sdf: roundBox(waist, v(3.2 * w, 1.7, 2.75), 1.2), mat: m, paint: lames },
        { sdf: skirt(j.pelvis, -3.4, 0.6, 3.8 * w, 3.4 * w), mat: m, paint: faulds },
        { sdf: roundBox(add(j.chest, v(0, -2.45, 0.2)), v(3.95 * w, 0.34, 3.25), 0.3), mat: m2 },
        { sdf: intersect(capsule(add(j.neck, v(0, -0.6, 0)), add(j.neck, v(0, 0.3, 0)), 2.2), above(j.neck[1] - 0.9)), mat: m, paint: (pc) => (pc[1] > j.neck[1] + 0.05 ? keep({ mat: m2 }) : null) },
        ...pauldron(1, j.shoulderL, m, m2), ...pauldron(-1, j.shoulderR, m, m2),
        { sdf: union(sleeve(j.elbowL, j.handL, 0.8, 1.6, 1.5), sleeve(j.elbowR, j.handR, 0.8, 1.6, 1.5)), mat: m },
        { sdf: union(sphere(lerp3(j.elbowL, j.handL, 0.75), 1.85), sphere(lerp3(j.elbowR, j.handR, 0.75), 1.85)), mat: m, paint: (pc) => (Math.abs(pc[1] - lerp3(j.elbowR, j.handR, 0.75)[1]) < 0.3 || Math.abs(pc[1] - lerp3(j.elbowL, j.handL, 0.75)[1]) < 0.3 ? keep({ mat: m2 }) : null) },
        { sdf: union(intersect(inflate(legSdf(j, 'L'), 0.55), below(j.kneeL[1] + 0.4)), intersect(inflate(legSdf(j, 'R'), 0.55), below(j.kneeR[1] + 0.4))), mat: m },
        { sdf: union(sphere(add(j.kneeL, v(0, 0, 0.4)), 1.8), sphere(add(j.kneeR, v(0, 0, 0.4)), 1.8)), mat: m, paint: (pc) => (pc[2] > 1.4 && (Math.hypot(pc[0] - j.kneeL[0], pc[1] - j.kneeL[1]) < 0.5 || Math.hypot(pc[0] - j.kneeR[0], pc[1] - j.kneeR[1]) < 0.5) ? keep({ mat: m2 }) : null) },
        { sdf: union(intersect(inflate(legSdf(j, 'L'), 0.6), below(j.ankleL[1] + 0.6)), intersect(inflate(legSdf(j, 'R'), 0.6), below(j.ankleR[1] + 0.6))), mat: m },
      ];
    },
  },

  brigandine: {
    mat: 'clothRed', mat2: 'gold',
    fn: (j, m, m2) => {
      // a leather strap from the left shoulder across to the right hip, with a buckle
      const a = add(j.shoulderL, v(-0.6, 0.2, 0)), b = add(j.pelvis, v(-2.2 * j.build, 0.6, 0));
      const strap = (pc: V3) => {
        const t = Math.max(0, Math.min(1, ((pc[0] - a[0]) * (b[0] - a[0]) + (pc[1] - a[1]) * (b[1] - a[1])) / ((b[0] - a[0]) ** 2 + (b[1] - a[1]) ** 2)));
        return Math.hypot(pc[0] - (a[0] + (b[0] - a[0]) * t), pc[1] - (a[1] + (b[1] - a[1]) * t));
      };
      const buckle = lerp3(a, b, 0.45);
      return [
        {
          sdf: intersect(torsoSdf(j, 0.75), above(j.pelvis[1] - 0.2)), mat: m,
          paint: (pc) => {
            if (pc[2] > 0) {
              const d = strap(pc);
              if (d < 0.45) return Math.hypot(pc[0] - buckle[0], pc[1] - buckle[1]) < 0.55 ? keep({ mat: m2 }) : keep({ mat: 'leatherDark' });
            }
            return rivetGrid(1.1, m2)(pc, [0, 0, 1]);
          },
        },
        ...pauldron(1, j.shoulderL, 'steel', 'ironDark', 2, 0.85), ...pauldron(-1, j.shoulderR, 'steel', 'ironDark', 2, 0.85),
      ];
    },
  },

  leatherArmor: {
    mat: 'leather', mat2: 'leatherDark',
    fn: (j, m, m2) => [
      {
        sdf: intersect(torsoSdf(j, 0.72), above(j.pelvis[1] - 0.6)), mat: m,
        paint: (pc) => {
          const ly = pc[1] - j.chest[1];
          if (pc[2] > 0 && Math.abs(Math.abs(pc[0]) - 1.6) < 0.22) return keep({ mat: m2 }); // stitched panel seams
          if (Math.abs(ly + 2.6) < 0.25) return keep({ mat: m2 });
          return rivetGrid(1.6, 'ironDark', 1.2)(pc, [0, 0, 1]);
        },
      },
      { sdf: skirt(j.pelvis, -3.0, 0.6, 3.5 * j.build, 3.1 * j.build), mat: m2, paint: (pc) => (Math.abs(((Math.atan2(pc[0], pc[2]) * 6) / Math.PI) % 1) < 0.12 ? keep({ dl: 1 }) : null) },
      ...pauldron(1, j.shoulderL, m2, 'ironDark', 2, 0.95),
    ],
  },

  vest: {
    mat: 'leather', mat2: 'leatherDark',
    fn: (j, m, m2) => [
      {
        sdf: intersect(torsoSdf(j, 0.7), above(j.pelvis[1] + 0.2)), mat: m,
        paint: (pc) => {
          const ly = pc[1] - j.chest[1];
          if (pc[2] > 0 && Math.abs(pc[0]) < 0.4) return keep({ mat: m2 }); // front opening
          if (pc[2] > 0 && Math.abs(pc[0]) < 0.9 && Math.abs((((ly + 3) / 0.8) % 1) - 0.5) < 0.18) return keep({ mat: 'linen' }); // laces
          return Math.abs(ly + 2.4) < 0.22 || Math.abs(ly + 0.2) < 0.2 ? keep({ mat: m2 }) : null;
        },
      },
      { sdf: union(ellipsoid(add(j.shoulderL, v(0.3, 0.45, 0)), v(1.95, 1.45, 1.95)), ellipsoid(add(j.shoulderR, v(-0.3, 0.45, 0)), v(1.95, 1.45, 1.95))), mat: m2 },
    ],
  },

  chainmail: {
    mat: 'steelDark',
    fn: (j, m) => {
      const rings: Paint = (pc) => (Math.abs(((pc[1] + 20) / 0.6) % 1 - 0.5) < 0.16 ? keep({ dl: -1 }) : null);
      return [
        { sdf: torsoSdf(j, 0.55), mat: m, paint: rings },
        { sdf: skirt(j.pelvis, -3.6, 0.8, 3.6 * j.build, 3.2 * j.build), mat: m, paint: (pc) => (pc[1] < j.pelvis[1] - 3.1 ? keep({ mat: 'steel' }) : rings(pc, [0, 0, 1])) },
        { sdf: union(sleeve(j.shoulderL, j.elbowL, 0.75, 1.95, 1.6), sleeve(j.shoulderR, j.elbowR, 0.75, 1.95, 1.6)), mat: m, paint: rings },
        { sdf: capsule(add(j.neck, v(0, -0.2, 0)), add(j.neck, v(0, 0.4, -0.2)), 1.75), mat: m },
      ];
    },
  },

  // ---------------------------------------------------------------- Shields
  /** Round plank shield: planks, an iron rim with rivets, a domed boss. */
  shield: {
    anchor: 'handL', mat: 'wood', mat2: 'steel',
    fn: (j, m, m2) => {
      const f = frameAt(j, shieldAt(j), v(0, 1, 0));
      return [
        {
          sdf: flat(f, circle2(0, 0, 2.9), 0.35), mat: m,
          paint: paintF(f, (x, y) => {
            const r = Math.hypot(x, y);
            if (r > 2.35) return keep({ mat: m2 }); // rim
            if (r > 2.0 && Math.abs(((Math.atan2(y, x) / Math.PI) * 6) % 1) < 0.22) return keep({ mat: 'gold' }); // rivets
            return Math.abs(((y + 3) / 1.15) % 1) < 0.12 ? keep({ dl: -1 }) : null; // planks
          }),
        },
        { sdf: sphere(add(f.o, v(f.n[0] * 0.35, f.n[1] * 0.35, f.n[2] * 0.35)), 0.85), mat: m2 },
      ];
    },
  },
  /** Kite shield: long tapering heater, silver rim, a gold cross on the field. */
  kiteShield: {
    anchor: 'handL', mat: 'clothBlue', mat2: 'silver',
    fn: (j, m, m2) => {
      const f = frameAt(j, shieldAt(j), v(0, 1, 0));
      const outer = poly2([[2.6, -2.2], [2.9, 0], [2.6, 2.2], [0.6, 2.4], [-1.8, 1.4], [-4.2, 0], [-1.8, -1.4], [0.6, -2.4]]);
      return [
        {
          sdf: flat(f, outer, 0.32), mat: m,
          paint: paintF(f, (x, y) => {
            if (outer(x, y) > -0.45) return keep({ mat: m2 });
            if ((Math.abs(y) < 0.32 && x > -3.0 && x < 2.2) || (Math.abs(x - 0.8) < 0.3 && Math.abs(y) < 1.5)) return keep({ mat: 'gold' });
            return null;
          }),
        },
      ];
    },
  },
  /** Bulwark of Dawn: a steel tower shield, gold rim, a sunburst with a glowing heart. */
  towerShield: {
    anchor: 'handL', mat: 'steel', mat2: 'gold',
    fn: (j, m, m2) => {
      const f = frameAt(j, shieldAt(j), v(0, 1, 0));
      const outer = poly2([[3.0, -2.5], [3.3, 0], [3.0, 2.5], [-1.5, 2.5], [-3.6, 1.2], [-4.1, 0], [-3.6, -1.2], [-1.5, -2.5]]);
      return [
        {
          sdf: flat(f, outer, 0.4), mat: m,
          paint: paintF(f, (x, y) => {
            if (outer(x, y) > -0.5) return keep({ mat: m2 });
            const r = Math.hypot(x - 0.3, y), a = Math.atan2(y, x - 0.3);
            if (r < 0.7) return keep({ mat: 'holy' });
            if (r < 1.9 && Math.abs(((a / Math.PI) * 4) % 1) < 0.28) return keep({ mat: m2 }); // sun rays
            return null;
          }),
        },
      ];
    },
  },
};

/** Where a shield sits: out in front of the body on the shield arm, so it shows in the battle view. */
function shieldAt(j: { elbowL: V3; handL: V3 }): V3 {
  return add(lerp3(j.elbowL, j.handL, 0.5), v(1.9, 0.6, 1.3));
}

Object.assign(ITEMS, A);
