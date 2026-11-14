// Tiny vector math + signed distance functions (SDFs). Distances are in
// "pixels": 1 unit = 1 pixel on the final 64x64 sprite.

export type V3 = [number, number, number];

export const v = (x: number, y: number, z: number): V3 => [x, y, z];
export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => mul(a, 1 / (len(a) || 1));
export const lerp3 = (a: V3, b: V3, t: number): V3 => add(a, mul(sub(b, a), t));

/** Rotate around the X axis (pitch: positive tips +y toward +z). */
export const rotX = (p: V3, a: number): V3 => {
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0], p[1] * c - p[2] * s, p[1] * s + p[2] * c];
};
/** Rotate around the Y axis (yaw). */
export const rotY = (p: V3, a: number): V3 => {
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c + p[2] * s, p[1], -p[0] * s + p[2] * c];
};
/** Rotate around the Z axis (roll). */
export const rotZ = (p: V3, a: number): V3 => {
  const c = Math.cos(a), s = Math.sin(a);
  return [p[0] * c - p[1] * s, p[0] * s + p[1] * c, p[2]];
};

export type Sdf = (p: V3) => number;

export const sphere = (c: V3, r: number): Sdf => (p) => len(sub(p, c)) - r;

export const ellipsoid = (c: V3, r: V3): Sdf => (p) => {
  // Cheap, good-enough ellipsoid bound (Inigo Quilez).
  const q = sub(p, c);
  const k0 = Math.hypot(q[0] / r[0], q[1] / r[1], q[2] / r[2]);
  const k1 = Math.hypot(q[0] / (r[0] * r[0]), q[1] / (r[1] * r[1]), q[2] / (r[2] * r[2]));
  return k1 === 0 ? -Math.min(...r) : (k0 * (k0 - 1)) / k1;
};

/** Capsule from a to b, radius ra at a and rb at b (tapered). */
export const capsule = (a: V3, b: V3, ra: number, rb = ra): Sdf => (p) => {
  const pa = sub(p, a), ba = sub(b, a);
  const h = Math.max(0, Math.min(1, dot(pa, ba) / (dot(ba, ba) || 1)));
  return len(sub(pa, mul(ba, h))) - (ra + (rb - ra) * h);
};

/** Rounded box centered at c with half-extents h and corner radius r, optionally yawed/pitched. */
export const roundBox = (c: V3, h: V3, r: number, yaw = 0, pitch = 0): Sdf => (p) => {
  let q = sub(p, c);
  if (yaw) q = rotY(q, -yaw);
  if (pitch) q = rotX(q, -pitch);
  const d: V3 = [Math.abs(q[0]) - h[0] + r, Math.abs(q[1]) - h[1] + r, Math.abs(q[2]) - h[2] + r];
  const outside = len([Math.max(d[0], 0), Math.max(d[1], 0), Math.max(d[2], 0)]);
  return outside + Math.min(Math.max(d[0], d[1], d[2]), 0) - r;
};

/** Cone-ish skirt: a capped cone along +y from y0 (radius r0) to y1 (radius r1), with depth squash. */
export const skirt = (c: V3, y0: number, y1: number, r0: number, r1: number, squashZ = 0.75): Sdf => (p) => {
  const q = sub(p, c);
  const y = q[1];
  const t = Math.max(0, Math.min(1, (y - y0) / (y1 - y0)));
  const r = r0 + (r1 - r0) * t;
  const radial = Math.hypot(q[0], q[2] / squashZ) - r;
  const cap = Math.max(y0 - y, y - y1);
  return Math.max(radial * squashZ, cap);
};

export const union = (...fs: Sdf[]): Sdf => (p) => {
  let d = Infinity;
  for (const f of fs) d = Math.min(d, f(p));
  return d;
};
export const intersect = (...fs: Sdf[]): Sdf => (p) => {
  let d = -Infinity;
  for (const f of fs) d = Math.max(d, f(p));
  return d;
};
export const subtract = (a: Sdf, b: Sdf): Sdf => (p) => Math.max(a(p), -b(p));
/** Smooth union (blends shapes like a sculpted surface). */
export const smooth = (k: number, ...fs: Sdf[]): Sdf => (p) => {
  let d = fs[0](p);
  for (let i = 1; i < fs.length; i++) {
    const e = fs[i](p);
    const h = Math.max(0, Math.min(1, 0.5 + (0.5 * (e - d)) / k));
    d = e * (1 - h) + d * h - k * h * (1 - h);
  }
  return d;
};
export const inflate = (f: Sdf, r: number): Sdf => (p) => f(p) - r;
/** Half-space: points where dot(p - point, n) < 0 are inside. */
export const halfSpace = (point: V3, n: V3): Sdf => (p) => dot(sub(p, point), norm(n));

/** Uniformly scale a shape about a center point (used to enlarge heads and weapons). */
export const scaleAbout = (f: Sdf, c: V3, s: number): Sdf => (s === 1 ? f : (p) => f(add(c, mul(sub(p, c), 1 / s))) * s);
/** Map a point into a shape's unscaled frame (for painting scaled parts). */
export const unscalePoint = (p: V3, c: V3, s: number): V3 => (s === 1 ? p : add(c, mul(sub(p, c), 1 / s)));
