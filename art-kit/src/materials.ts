// Color ramps: 4 tones from shadow to highlight. Shadows shift toward cool
// purple/blue, highlights toward warm yellow, which is what keeps cel-shaded
// pixel art from looking muddy.

export interface Material {
  ramp: [string, string, string, string];
  /** Optional finish: 'metal' adds a hard specular pop, 'glow' ignores light, 'mail' dithers like chainmail. */
  finish?: 'metal' | 'glow' | 'mail';
}

export const MATERIALS: Record<string, Material> = {
  skin: { ramp: ['#8a4a4a', '#c87a62', '#eaa682', '#ffd0a8'] },
  skinTan: { ramp: ['#5e3434', '#9a5a44', '#c4805c', '#e6a87a'] },
  skinDeep: { ramp: ['#3a2026', '#5e3530', '#844c3c', '#a8684e'] },
  eye: { ramp: ['#1a1220', '#1a1220', '#1a1220', '#2a2440'] },
  irisBlue: { ramp: ['#1a2a6a', '#2a4ab0', '#4a7ae0', '#9ac0ff'] },
  irisGreen: { ramp: ['#14402a', '#1e7a44', '#3aac5a', '#8ee08a'] },
  irisAmber: { ramp: ['#5a2a0a', '#a85a14', '#e09a2a', '#ffd27a'] },
  irisViolet: { ramp: ['#2a1050', '#5a2aa0', '#8a5ae0', '#d0b0ff'] },
  irisBrown: { ramp: ['#2a140e', '#4e2a1a', '#7a4a2a', '#b07a4a'] },
  eyeWhite: { ramp: ['#b8b4cc', '#d8d6e6', '#f2f0f8', '#ffffff'] },

  hairBrown: { ramp: ['#2e1a1e', '#4e2c26', '#74442e', '#9a643c'] },
  hairBlack: { ramp: ['#141220', '#22203a', '#363456', '#4e4c72'] },
  hairBlond: { ramp: ['#7a4a2a', '#b8823a', '#e2b45a', '#fbe08a'] },
  hairRed: { ramp: ['#5a1e22', '#8e3226', '#c25430', '#e6844a'] },
  hairWhite: { ramp: ['#6a6a86', '#9e9eb8', '#cfd0e2', '#f4f4fc'] },

  linen: { ramp: ['#6e5e66', '#a8988e', '#d6c8b0', '#f2e8d2'] },
  burlap: { ramp: ['#3e2c2a', '#6a4a36', '#8e6a48', '#b28e62'] },
  clothRed: { ramp: ['#4a1428', '#82203a', '#b8343c', '#e2604a'] },
  clothBlue: { ramp: ['#1a1a48', '#2a3478', '#3e58b0', '#6a8ee0'] },
  clothDeepBlue: { ramp: ['#120e2e', '#1e1e52', '#2e3482', '#4a5cb8'] },
  clothGreen: { ramp: ['#14302a', '#245038', '#3a7a44', '#6aa858'] },
  clothWhite: { ramp: ['#6e6a8a', '#aeaac4', '#dedcec', '#ffffff'] },
  clothPurple: { ramp: ['#24123a', '#3e2060', '#62348e', '#8e5ab8'] },
  leather: { ramp: ['#2a1618', '#4a2a22', '#704030', '#965c3c'] },
  leatherDark: { ramp: ['#160e14', '#2a1a1e', '#42282a', '#5e3a34'] },
  wood: { ramp: ['#2e1a16', '#54321e', '#7e5028', '#a87038'] },

  steel: { ramp: ['#2a2a40', '#565a78', '#9298b4', '#e2e8f4'], finish: 'metal' },
  steelDark: { ramp: ['#1a1a2a', '#363a52', '#5a6080', '#8e96b4'], finish: 'mail' },
  gold: { ramp: ['#5a2e18', '#a4602a', '#e0a83a', '#fff08a'], finish: 'metal' },
  silver: { ramp: ['#3a3e58', '#7a82a2', '#bcc4dc', '#ffffff'], finish: 'metal' },

  bone: { ramp: ['#5e4a46', '#9e8a78', '#d2c4a8', '#f4ecd6'] },
  clothBlack: { ramp: ['#0e0c16', '#1c1a2a', '#2e2c42', '#46445e'] },
  clothOrange: { ramp: ['#4a1a14', '#8a3a1a', '#c86a22', '#f0a040'] },
  clothForest: { ramp: ['#0e2218', '#1a3a26', '#2a5a32', '#4a8040'] },
  fur: { ramp: ['#2a1a16', '#4e3426', '#7a5636', '#a88250'] },
  feather: { ramp: ['#6a6a86', '#b4b4cc', '#e6e6f2', '#ffffff'] },
  nature: { ramp: ['#1e6a3a', '#3aa858', '#7ee07a', '#e2ffc8'], finish: 'glow' },
  flame: { ramp: ['#8a1a1a', '#e04a1a', '#ff9a2a', '#fff07a'], finish: 'glow' },
  shadow: { ramp: ['#2a1050', '#5a2a9a', '#9a5ae0', '#e2c8ff'], finish: 'glow' },
  arcane: { ramp: ['#2a6aa8', '#4aa8e0', '#8ee0ff', '#e8fcff'], finish: 'glow' },
  holy: { ramp: ['#a87a2a', '#e8c04a', '#fff08a', '#fffde8'], finish: 'glow' },
};

export const OUTLINE_DARK = '#140e1c';

const hex = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const mixHex = (a: string, b: string, t: number) => {
  const x = hex(a), y = hex(b);
  return '#' + x.map((c, i) => Math.round(c + (y[i] - c) * t).toString(16).padStart(2, '0')).join('');
};
export const rgba = (h: string): [number, number, number, number] => [...hex(h), 255] as [number, number, number, number];

// ---------- Vivid palette (JRPG style) ----------
function toHsl([r, g, b]: number[]): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
function fromHsl(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return '#' + [f(0), f(8), f(4)].map((x) => Math.round(Math.max(0, Math.min(1, x)) * 255).toString(16).padStart(2, '0')).join('');
}
/** Shift a hue toward a target by up to `amt` degrees. */
const toward = (h: number, target: number, amt: number) => {
  const d = ((target - h + 540) % 360) - 180;
  return (h + Math.sign(d) * Math.min(Math.abs(d), amt) + 360) % 360;
};
/**
 * More saturated, higher-contrast ramp with stronger hue shifting: shadows lean
 * toward blue-violet, highlights toward warm yellow.
 */
export function vividRamp(ramp: readonly string[]): string[] {
  return ramp.map((c, i) => {
    let [h, s, l] = toHsl(hex(c));
    const grey = s < 0.08;
    if (!grey) s = Math.min(1, s * 1.3 + 0.05);
    if (i === 0) { h = grey ? h : toward(h, 255, 22); l *= 0.8; }
    if (i === 1) { h = grey ? h : toward(h, 255, 10); }
    if (i === 3) { h = grey ? h : toward(h, 55, 14); l = Math.min(0.97, l * 1.06 + 0.03); }
    return fromHsl(h, s, l);
  });
}
