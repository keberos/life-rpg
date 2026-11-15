// Renders a Look to pixel art: orthographic rays per pixel, cel-shaded onto
// 4-tone ramps with ambient occlusion, cast shadows and painted surface
// detail, then smoothing, outline, contour, cleanup and aura passes.
import { MATERIALS, OUTLINE_DARK, mixHex, rgba, vividRamp } from './materials.ts';
import { ANIM_FRAMES, animPose, solve, type AnimName, type Pose } from './rig.ts';
import { clipFrame, jointsFromMotion } from './motion.ts';
import { add, dot, mul, norm, rotY, sub, v, type V3 } from './sdf.ts';
import { STYLES, type Style } from './styles.ts';
import { lookParts, type Look, type Part } from './wardrobe.ts';
import './wardrobe-more.ts'; // registers the extra gear

export type Dir = 'down' | 'left' | 'right' | 'up' | 'downRight' | 'downLeft' | 'upRight' | 'upLeft' | 'battle';
const YAW: Record<Dir, number> = {
  down: 0, right: Math.PI / 2, left: -Math.PI / 2, up: Math.PI,
  // 3/4 views, used for battle poses
  downRight: 0.62, downLeft: -0.62, upRight: Math.PI - 0.62, upLeft: Math.PI + 0.62,
  // Battle: turned toward the enemy (screen right) but chest and face still toward us.
  battle: 1.15,
};
/** In the battle view the head turns back toward us so the face stays readable. */
const BATTLE_HEAD_TURN = -0.6;

export type Quality = 'classic' | 'hd' | 'xl';
const PRESETS: Record<Quality, { size: number; ppu: number; feetRow: number }> = {
  classic: { size: 64, ppu: 1.2, feetRow: 58 }, // ~32 px tall characters
  hd: { size: 96, ppu: 1.8, feetRow: 88 }, // ~48 px tall characters
  xl: { size: 128, ppu: 2.55, feetRow: 120 }, // ~75 px tall characters (portraits, battle)
};

export interface RenderOpts {
  dir?: Dir;
  anim?: AnimName;
  frame?: number;
  /** A one-off pose instead of an animation frame (exercise guides). */
  pose?: Pose;
  /** Borrowed motion: a clip (art-kit/src/motion) at a 0..1 point. Overrides anim/pose. */
  motion?: { clip: string; t: number; turn?: number };
  quality?: Quality;
  size?: number;
  pixelsPerUnit?: number;
  pitchDeg?: number;
  feetRow?: number;
  /** Turn off the newer passes to compare (AO, shadows, paint, smoothing). */
  basic?: boolean;
  /** Rendering style preset: proportions, palette, outlines, faces, idle pose. */
  style?: Style['name'];
}

export interface Image { w: number; h: number; data: Uint8ClampedArray }

const LIGHT = norm(v(-0.55, 0.85, 0.7)); // world space: upper-left, slightly toward the viewer
const RIM = norm(v(0.85, 0.2, -0.45)); // back-right rim light

interface Sample { part: number; t: number; p: V3 }

export function renderLook(look: Look, opts: RenderOpts = {}): Image {
  const preset = PRESETS[opts.quality ?? 'classic'];
  const size = opts.size ?? preset.size;
  const k = opts.pixelsPerUnit ?? preset.ppu;
  const feetRow = opts.feetRow ?? preset.feetRow;
  const dir = opts.dir ?? 'down';
  const yaw = YAW[dir];
  const basic = !!opts.basic;
  const style = STYLES[opts.style ?? 'classic'];
  const pitch = ((opts.pitchDeg ?? style.pitchDeg) * Math.PI) / 180;
  const crisp = style.render === 'crisp';

  const bodyDims = { build: look.build ?? 1, height: look.height ?? 1, ...style.body };
  const joints = opts.motion
    ? jointsFromMotion(bodyDims, clipFrame(opts.motion.clip, opts.motion.t), { turn: opts.motion.turn })
    : solve(bodyDims, opts.pose ?? animPose(opts.anim ?? style.idleAnim, opts.frame ?? 0));
  const parts: Part[] = lookParts(look, joints, { weaponScale: style.weaponScale, anime: style.face === 'anime', headTurn: dir === 'battle' ? BATTLE_HEAD_TURN : 0, frameFace: style.render === 'crisp' });

  const toChar = (p: V3): V3 => rotY(p, -yaw);
  const scene = (pw: V3): [number, number] => {
    const pc = toChar(pw);
    let best = Infinity, idx = -1;
    for (let i = 0; i < parts.length; i++) {
      // Nothing goes through the floor (long robes pool on the ground in a deep crouch).
      const d = Math.max(parts[i].sdf(pc), -0.15 - pc[1]);
      if (d < best) [best, idx] = [d, i];
    }
    return [best, idx];
  };
  const dist = (p: V3) => scene(p)[0];

  const D: V3 = [0, -Math.sin(pitch), -Math.cos(pitch)];
  const R: V3 = [1, 0, 0];
  const U: V3 = [0, Math.cos(pitch), -Math.sin(pitch)];
  // Crisp: light fixed on screen (upper left, a little toward us), so every pose is lit the same way.
  const light = crisp ? norm(add(add(mul(R, -0.62), mul(U, 0.66)), mul(D, -0.42))) : LIGHT;

  const march = (sx: number, sy: number): Sample | null => {
    const origin = add(add(mul(R, sx), mul(U, sy)), mul(D, -60));
    let t = 0;
    for (let s = 0; s < 140 && t < 140; s++) {
      const p = add(origin, mul(D, t));
      const [d, i] = scene(p);
      if (d < 0.012) return { part: i, t, p };
      t += Math.max(d, 0.02);
    }
    return null;
  };
  const toScreen = (col: number, row: number): [number, number] => [(col - size / 2) / k, (feetRow - row) / k];

  // ---- Pass 1: one ray per pixel center ----
  const N = size * size;
  const samples: (Sample | null)[] = new Array(N).fill(null);
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) samples[row * size + col] = march(...toScreen(col + 0.5, row + 0.5));

  // ---- Pass 2: edge smoothing. Where coverage or part changes, vote with 4 sub-samples. ----
  if (!basic) {
    const edge = new Uint8Array(N);
    for (let row = 0; row < size; row++)
      for (let col = 0; col < size; col++) {
        const i = row * size + col, a = samples[i];
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const r2 = row + dr, c2 = col + dc;
          if (r2 >= size || c2 >= size) continue;
          const b = samples[r2 * size + c2];
          if (!!a !== !!b || (a && b && a.part !== b.part)) edge[i] = edge[r2 * size + c2] = 1;
        }
      }
    for (let i = 0; i < N; i++) {
      if (!edge[i]) continue;
      const row = Math.floor(i / size), col = i % size;
      const subs = [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]].map(([dx, dy]) => march(...toScreen(col + dx, row + dy)));
      const hits = subs.filter((s): s is Sample => !!s);
      if (hits.length <= 1) { samples[i] = null; continue; }
      const count = new Map<number, number>();
      for (const h of hits) count.set(h.part, (count.get(h.part) ?? 0) + 1);
      const bestPart = [...count.entries()].sort((x, y) => y[1] - x[1])[0][0];
      samples[i] = samples[i] && samples[i]!.part === bestPart ? samples[i] : hits.find((h) => h.part === bestPart)!;
    }
  }

  // ---- Pass 3: shading ----
  const depth = new Float32Array(N).fill(Infinity);
  const rampOf: string[][] = [];
  const metal: boolean[] = [];
  const rampIdx = new Map<string, number>();
  const rampId = (m: string) => {
    if (!rampIdx.has(m)) {
      const mat = MATERIALS[m];
      if (!mat) throw new Error(`Unknown material ${m}`);
      rampIdx.set(m, rampOf.length);
      rampOf.push(style.palette === 'vivid' ? vividRamp(mat.ramp) : [...mat.ramp]);
      metal.push(mat.finish === 'metal');
    }
    return rampIdx.get(m)!;
  };
  const ramp = new Int16Array(N).fill(-1);
  const level = new Int8Array(N);
  const keep = new Uint8Array(N);

  for (let i = 0; i < N; i++) {
    const s = samples[i];
    if (!s) continue;
    const row = Math.floor(i / size), col = i % size;
    const { p } = s;
    depth[i] = s.t;
    const e = 0.04;
    const n = norm([
      dist(add(p, [e, 0, 0])) - dist(sub(p, [e, 0, 0])),
      dist(add(p, [0, e, 0])) - dist(sub(p, [0, e, 0])),
      dist(add(p, [0, 0, e])) - dist(sub(p, [0, 0, e])),
    ]);
    const part = parts[s.part];
    let matName = part.mat;
    let dl = 0;
    if (!basic && part.paint && !(crisp && part.face)) {
      const pc = toChar(p);
      let paint = part.paint(pc, toChar(n));
      // Minimal detail: drop shading-only lines (folds, strands, seams); keep colors and protected marks.
      if (paint && style.detail === 'minimal' && !paint.mat && !paint.keep) paint = null;
      if (paint) {
        if (paint.mat) matName = paint.mat;
        dl = paint.dl ?? 0;
        if (paint.keep) keep[i] = 1;
      }
    } else if (basic && part.paint) {
      // classic decal fallback: eyes only
      const pc = toChar(p);
      const paint = part.paint(pc, toChar(n));
      if (paint?.mat === 'eye') { matName = 'eye'; keep[i] = 1; }
    }
    const mat = MATERIALS[matName];

    const lam = dot(n, light);
    let sh = 0.5 * lam + 0.5;
    if (n[1] > 0.6) sh += 0.06;
    // Crisp keeps the darkest tone for outlines: shadow, base, and a small highlight.
    let lv = crisp ? (sh < 0.45 ? 1 : sh < 0.86 ? 2 : 3) : sh < 0.36 ? 0 : sh < 0.58 ? 1 : sh < 0.8 ? 2 : 3;

    // Faces stay lit in the anime style: no hair shadow or crease darkening on the head.
    const litFace = style.face === 'anime' && part.anchor === 'head' && matName !== part.mat ? true : style.face === 'anime' && part.anchor === 'head' && part.paint !== undefined && part.mat.startsWith('skin');
    if (!basic && !crisp && mat.finish !== 'glow' && !litFace) {
      // Ambient occlusion: how crowded the space is just off the surface.
      let occ = 0;
      for (let q = 1; q <= 3; q++) {
        const h = q * 0.55;
        occ += (h - dist(add(p, mul(n, h)))) / h / q;
      }
      if (occ > 0.42) lv -= 1;
      // Cast shadow toward the light (arms on torso, cape on legs, hair on face).
      if (lam > -0.1) {
        let t = 0.35, lit = true;
        for (let q = 0; q < 40 && t < 18; q++) {
          const d = dist(add(p, mul(light, t)));
          if (d < 0.02) { lit = false; break; }
          t += Math.max(d, 0.05);
        }
        if (!lit) lv -= 1;
      }
    }

    // Rim light on the shadow side so the figure pops off the background.
    if (!basic && !crisp && style.outline === 'selout' && mat.finish !== 'glow' && !keep[i]) {
      if (dot(n, RIM) > 0.5 && lam < 0.25) lv = Math.min(3, lv + 2);
    }

    if (mat.finish === 'metal') {
      const h = norm(sub(light, D));
      const spec = dot(n, h);
      lv = crisp ? (sh < 0.5 ? 1 : 2) : Math.min(lv, sh < 0.42 ? 0 : sh < 0.66 ? 1 : 2);
      if (spec > 0.9 && lv >= 1) lv = 3;
    } else if (mat.finish === 'glow') {
      lv = Math.max(2, lv);
    } else if (mat.finish === 'mail' && !crisp) {
      if ((row + col) % 2 === 0 && lv > 0) lv -= 1;
    }
    lv = Math.max(0, Math.min(3, lv + dl));
    ramp[i] = rampId(matName);
    level[i] = lv;
  }

  // ---- Pass 4: cleanup lone pixels (a single pixel surrounded by one other tone) ----
  const nb4 = (i: number) => {
    const r = Math.floor(i / size), c = i % size;
    const out: number[] = [];
    if (r > 0) out.push(i - size);
    if (r < size - 1) out.push(i + size);
    if (c > 0) out.push(i - 1);
    if (c < size - 1) out.push(i + 1);
    return out;
  };
  if (!basic) {
    const lv2 = Int8Array.from(level);
    for (let i = 0; i < N; i++) {
      if (ramp[i] < 0 || keep[i]) continue;
      const ns = nb4(i);
      if (ns.length < 4 || ns.some((j) => ramp[j] !== ramp[i])) continue;
      const l0 = level[ns[0]];
      if (l0 !== level[i] && ns.every((j) => level[j] === l0)) lv2[i] = l0;
    }
    level.set(lv2);
  }

  // ---- Pass 5: compose with inner contours and outline ----
  const inner = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    if (ramp[i] < 0) continue;
    for (const j of nb4(i)) {
      if (ramp[j] < 0) continue;
      if (depth[j] < depth[i] - 1.4) inner[i] = 1;
      // Crisp: a 1 px line where one part overlaps another of a different material (belt on tunic, sleeve on glove).
      else if (crisp && ramp[j] !== ramp[i] && depth[j] < depth[i] - 0.15) inner[i] = 1;
    }
  }
  const data = new Uint8ClampedArray(N * 4);
  const solid = new Uint8Array(N);
  for (let i = 0; i < N; i++) {
    let col: string | null = null;
    if (ramp[i] >= 0) {
      const r = rampOf[ramp[i]];
      const contour = style.outline === 'selout' ? r[0] : mixHex(r[0], OUTLINE_DARK, 0.35);
      col = inner[i] && !keep[i] ? contour : r[level[i]];
      // Crisp: metal catches a bright line along its upper-left edge, so blades read first.
      if (crisp && !inner[i] && metal[ramp[i]]) {
        const up = i - size, left = i - 1;
        if ((up >= 0 && ramp[up] !== ramp[i]) || (i % size > 0 && ramp[left] !== ramp[i])) col = r[3];
      }
    } else {
      let bestJ = -1;
      for (const j of nb4(i)) if (ramp[j] >= 0 && (bestJ < 0 || depth[j] < depth[bestJ])) bestJ = j;
      if (bestJ >= 0) {
        const r = rampOf[ramp[bestJ]];
        if (crisp) col = mixHex(r[0], OUTLINE_DARK, 0.3); // each part outlined in its own darkest tone
        else if (style.outline === 'selout') {
          // Colored outline: the sprite's own dark tone, lighter on the lit (upper-left) side.
          const litSide = bestJ === i + 1 || bestJ === i + size;
          col = litSide ? mixHex(r[0], r[1], 0.35) : mixHex(r[0], OUTLINE_DARK, 0.45);
        } else col = mixHex(r[0], OUTLINE_DARK, 0.6);
      }
    }
    if (col) {
      data.set(rgba(col), i * 4);
      solid[i] = 1;
    }
  }

  // Face glyphs, drawn for a face looking screen-right (mirrored when it looks left).
  // K lash/outline, W eye white, I iris, i dark iris, H catch-light, B brow, M mouth.
  // The near eye is the wider one; the far eye sits by the profile and is narrower.
  function stampFace() {
    const big = size >= 120;
    const G = big
      ? { near: ['KKKK', 'KiHi', 'WiIi', 'WIIi', '.ii.'], far: ['KKK', 'iHK', 'iIi', 'Ii.'], browNear: 'BBBB', browFar: 'BBB', mouth: 'MM' }
      : { near: ['KKK', 'WIH', 'WIi'], far: ['KK', 'IH', 'Ii'], browNear: 'BBB', browFar: 'BB', mouth: 'MM' };
    const turn = dir === 'battle' ? BATTLE_HEAD_TURN : 0;
    const hs = joints.hs;
    const toWorld = (local: V3): V3 => rotY(add(joints.head, rotY(mul(local, hs), turn)), yaw);
    const project = (pw: V3) => ({ col: Math.round(dot(pw, R) * k + size / 2 - 0.5), row: Math.round(feetRow - dot(pw, U) * k - 0.5), depth: dot(pw, D) });
    // A face point shows only if the ray at its pixel lands on the face, close to the point itself.
    const faceIdx = parts.findIndex((p) => p.face);
    const visible = (pw: V3, col: number, row: number) => {
      if (col < 0 || row < 0 || col >= size || row >= size) return false;
      const sm = samples[row * size + col];
      if (!sm || sm.part !== faceIdx) return false;
      const d = sub(sm.p, pw);
      return Math.hypot(d[0], d[1], d[2]) < 0.9 * hs;
    };
    const eyeR = rampOf[rampId('eye')], whiteR = rampOf[rampId('eyeWhite')], irisR = rampOf[rampId(look.iris ?? 'irisBlue')];
    const browR = rampOf[rampId(look.hair?.mat ?? 'hairBrown')], skinR = rampOf[rampId(look.skin ?? 'skin')];
    const COL: Record<string, string> = {
      K: mixHex(eyeR[0], OUTLINE_DARK, 0.3), W: whiteR[3], I: irisR[2], i: irisR[0], H: whiteR[3], B: mixHex(browR[0], OUTLINE_DARK, 0.25), M: mixHex(skinR[0], OUTLINE_DARK, 0.2),
    };
    const put = (col: number, row: number, ch: string) => {
      if (ch === '.' || col < 0 || row < 0 || col >= size || row >= size) return;
      const i = row * size + col;
      if (!solid[i]) return;
      data.set(rgba(COL[ch]), i * 4);
    };
    const eyes = [1, -1].map((s) => {
      const eye = toWorld(v(1.15 * s, -0.4, 2.7));
      const brow = toWorld(v(1.15 * s, 0.95, 2.6));
      return { s, eye, brow, pe: project(eye), pb: project(brow) };
    });
    // Which way the face looks on screen, and which eye is nearer the camera.
    // The character's left eye (+x) lands right of its right eye when the face looks screen-right.
    const lookRight = eyes[0].pe.col > eyes[1].pe.col;
    const near = eyes[0].pe.depth < eyes[1].pe.depth ? eyes[0] : eyes[1];
    for (const e of eyes) {
      if (!visible(e.eye, e.pe.col, e.pe.row)) continue;
      const g = e === near ? G.near : G.far;
      const w = g[0].length;
      for (let r = 0; r < g.length; r++)
        for (let c = 0; c < w; c++) {
          const cc = lookRight ? c : w - 1 - c;
          put(e.pe.col - Math.floor(w / 2) + cc, e.pe.row - 1 + r, g[r][c]);
        }
      const bw = (e === near ? G.browNear : G.browFar).length;
      const browRow = Math.min(e.pb.row, e.pe.row - 3) - (big ? 1 : 0);
      for (let c = 0; c < bw; c++) put(e.pe.col - Math.floor(bw / 2) + c, browRow, 'B');
    }
    const mouth = toWorld(v(0.15, -2.0, 2.35)), pm = project(mouth);
    if (visible(mouth, pm.col, pm.row)) for (let c = 0; c < G.mouth.length; c++) put(pm.col + (lookRight ? c : -c), pm.row, 'M');
  }

  // ---- Pass 5b: crisp faces. Designed pixel eyes, brows and mouth stamped where the
  // face points land on screen (like hand-drawn sprites), instead of sampling them from 3D.
  if (crisp && style.face === 'anime') stampFace();

  // ---- Pass 6: prestige aura (glow ring + a few sparkles) ----
  if (look.aura && !basic && !crisp) {
    const aura = MATERIALS[look.aura].ramp;
    const ring = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (!solid[i] && nb4(i).some((j) => solid[j])) ring[i] = 1;
    for (let i = 0; i < N; i++) {
      if (solid[i]) continue;
      if (ring[i]) { data.set([...rgba(aura[1]).slice(0, 3), 200], i * 4); continue; }
      if (nb4(i).some((j) => ring[j])) data.set([...rgba(aura[0]).slice(0, 3), 90], i * 4);
    }
    // deterministic sparkles around the silhouette
    let seed = 1234567 + (opts.frame ?? 0) * 97 + yaw * 1000;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    for (let s = 0; s < 6; s++) {
      const r = Math.floor(rnd() * size * 0.7 + size * 0.1), c = Math.floor(rnd() * size * 0.6 + size * 0.2);
      const i = r * size + c;
      if (!solid[i] && data[i * 4 + 3] > 0) data.set(rgba(aura[3]), i * 4);
    }
  }
  return { w: size, h: size, data };
}

/** Render a strip: every frame of an animation in one direction. */
export function renderStrip(look: Look, dir: Dir, anim: AnimName, opts: RenderOpts = {}): Image[] {
  return Array.from({ length: ANIM_FRAMES[anim] }, (_, f) => renderLook(look, { ...opts, dir, anim, frame: f }));
}
