// Sprites. Heroes come from the art kit; bosses are still hand-placed placeholders
// (each row a string, each character a palette color, '.' transparent).
import { useEffect, useState } from 'preact/hooks';
import { heroLayers } from '../../art-kit/src/held-gear.ts';

type Palette = Record<string, string>;

function Pixels({ rows, palette, scale = 6, className }: { rows: string[]; palette: Palette; scale?: number; className?: string }) {
  const w = rows[0].length;
  const h = rows.length;
  const rects = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = rows[y][x];
      if (c !== '.' && palette[c]) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1.02} height={1.02} fill={palette[c]} />);
    }
  }
  return (
    <svg class={`sprite ${className ?? ''}`} viewBox={`0 0 ${w} ${h}`} width={w * scale} height={h * scale} shape-rendering="crispEdges" aria-hidden="true">
      {rects}
    </svg>
  );
}

// Hero sprites are pre-rendered by the art kit (npm run sprites) into
// public/sprites/body/<class>-<kind>.png + held/<weapon>-<kind>.png: frames 0-3 breathing stance, 4-7 attack.
const FRAME = 128; // art-kit BATTLE_FRAME
/** Screen size of `scale` 1, in CSS px per 5 scale units (kept from the 96 px era so layouts hold). */
const BASE = 96;
const STRIP = 8;
const KNOWN = new Set(['adventurer', 'warrior', 'paladin', 'ranger', 'monk', 'sage', 'cleric', 'spellblade']);

/**
 * The hero is a stack of pre-made layers: the class body (its standard outfit) and
 * the weapon on top. The art for each layer is painted ahead of
 * time; the app only stacks them, so new gear needs one new layer, not new heroes.
 */
export function Hero({ classId, scale = 6, action = 'idle', gear = [] }: { classId: string; scale?: number; action?: 'idle' | 'attack'; gear?: string[] }) {
  const id = KNOWN.has(classId) ? classId : 'adventurer';
  const layers = heroLayers(id, gear);
  // Whole screen pixels per art pixel: at in-between sizes (say 3.6x) some art pixels
  // come out 3 screen pixels wide and some 4, which makes edges and faces look jagged.
  const dpr = typeof devicePixelRatio === 'number' && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const n = Math.max(1, Math.round(((BASE * scale) / 5) * dpr / FRAME + 0.15)); // lean a little toward bigger
  const px = (FRAME * n) / dpr;
  const frames = action === 'attack' ? [4, 5, 6, 7] : [0, 1, 2, 3];
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
    const t = setInterval(() => setI((n) => (action === 'attack' ? Math.min(n + 1, frames.length - 1) : (n + 1) % frames.length)), action === 'attack' ? 90 : 300);
    return () => clearInterval(t);
  }, [action]);
  const frame = frames[Math.min(i, frames.length - 1)];
  return (
    <div
      class="sprite hero-sprite"
      role="img"
      aria-label={`${id} hero`}
      style={{
        width: `${px}px`,
        height: `${px}px`,
        // CSS paints the first background on top, so held layers go first.
        backgroundImage: [...layers].reverse().map((l) => `url(./${l})`).join(', '),
        backgroundSize: layers.map(() => `${px * STRIP}px ${px}px`).join(', '),
        backgroundPosition: layers.map(() => `-${frame * px}px 0px`).join(', '),
      }}
    />
  );
}

const BOSSES: Record<string, { rows: string[]; palette: Palette }> = {
  'bog-troll': {
    rows: [
      '....gggggggg....',
      '...gggggggggg...',
      '..ggwkggggwkgg..',
      '..gggggggggggg..',
      '..ggtgttgtgtgg..',
      '...gggggggggg...',
      '.gggggggggggggg.',
      'gggggddddddggggg',
      'gg.gggddddggg.gg',
      'gg.gggggggggg.gg',
      'kk.gggggggggg.kk',
      '...gggg..gggg...',
      '...ggg....ggg...',
      '..dddd....dddd..',
    ],
    palette: { g: '#5f8f3e', d: '#3f6a28', w: '#fffbe0', k: '#1b1730', t: '#fffbe0' },
  },
  'storm-harpy': {
    rows: [
      '......pppp......',
      '.....pyyyyp.....',
      '.....ykyyky.....',
      '......yooy......',
      'ww....pppp....ww',
      'www..pppppp..www',
      'wwww.pppppp.wwww',
      '.wwwwppppppwwww.',
      '..wwwpppppwww...',
      '....ppppppp.....',
      '.....pp..pp.....',
      '.....oo..oo.....',
      '....o.o..o.o....',
    ],
    palette: { p: '#7b5bd6', y: '#f1c7a1', k: '#1b1730', o: '#f2c14e', w: '#c9c2ff' },
  },
  'hollow-warden': {
    rows: [
      '.....aaaaaa.....',
      '....aaaaaaaa....',
      '....akkaakka....',
      '....ackaacka....',
      '.....aaaaaa.....',
      '...mmmmmmmmmm...',
      '..mmaaaaaaaamm..',
      '..maaaammaaaam.s',
      '..maaaammaaaamss',
      '..mmaaaaaaaamm.s',
      '....aaaaaaaa...s',
      '....aaa..aaa...s',
      '....aaa..aaa....',
      '...mmmm..mmmm...',
    ],
    palette: { a: '#8a8fa8', m: '#4a4f66', k: '#1b1730', c: '#6fe8ff', s: '#d9dde8' },
  },
  'ashen-wyrm': {
    rows: [
      '..rr........rr..',
      '..rrr......rrr..',
      '...rrrrrrrrrr...',
      '..rryrrrrrryrr..',
      '..rrrrrrrrrrrr..',
      '...rroooooorr...',
      '....rrrrrrrr....',
      'ww..rrrrrrrr..ww',
      'wwwrrrddddrrrwww',
      '.wwrrrddddrrrww.',
      '...rrrrrrrrrr...',
      '...rrr....rrr...',
      '..rrrr....rrrr..',
      '.kk..........kk.',
    ],
    palette: { r: '#b83a2e', d: '#f2a65a', y: '#ffe066', o: '#ff8a3d', w: '#5e2a2a', k: '#2a1a1a' },
  },
};

/** Seasonal forms (src/content/boss-forms.ts) recolor the base boss. */
const FORM_PALETTES: Record<string, Palette> = {
  'moss-troll': { g: '#4f8a5a', d: '#2f5e3e', t: '#d6e86a' },
  'stone-troll': { g: '#8a8a96', d: '#5a5a68', w: '#efe9da', t: '#efe9da' },
  'lantern-troll': { g: '#5a6a8a', d: '#3a4466', w: '#fff3a0', t: '#ffe066' },
  'mist-harpy': { p: '#9ab0c8', o: '#e0e8f0', w: '#ffffff' },
  'ironfeather-harpy': { p: '#6a7088', o: '#c0c4d0', w: '#e8ecf4' },
  'ember-harpy': { p: '#c84a2a', o: '#ffb040', w: '#ffe080' },
  'silent-warden': { a: '#3a3a4a', m: '#22222e', c: '#e8e8ff', s: '#8a8a9a' },
  'rusted-warden': { a: '#9a5a3a', m: '#5e3422', c: '#ffb060', s: '#c08a5a' },
  'lantern-warden': { a: '#5a6a5a', m: '#344034', c: '#ffe066', s: '#a0b090' },
  'frost-wyrm': { r: '#5aa8d8', d: '#bfe8ff', y: '#ffffff', o: '#8ad0f0', w: '#2a5a8a' },
  'iron-wyrm': { r: '#6a6e80', d: '#a0a4b4', y: '#e8e4d0', o: '#c0a060', w: '#34364a' },
  'void-wyrm': { r: '#3a2a6a', d: '#8a6ad8', y: '#e8d8ff', o: '#b08aff', w: '#1a1240' },
};

export function Boss({ bossId, form, scale = 8, className }: { bossId: string; form?: string; scale?: number; className?: string }) {
  const b = BOSSES[bossId] ?? BOSSES['bog-troll'];
  const palette = form && FORM_PALETTES[form] ? { ...b.palette, ...FORM_PALETTES[form] } : b.palette;
  return <Pixels rows={b.rows} palette={palette} scale={scale} className={className} />;
}
