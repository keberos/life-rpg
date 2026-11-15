// Sprites. Heroes come from the art kit; bosses are still hand-placed placeholders
// (each row a string, each character a palette color, '.' transparent).
import { useEffect, useState } from 'preact/hooks';
import { useHeroSprite } from '../art/useHeroSprite.ts';

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
// public/sprites/<classId>.png: frames 0-3 breathing stance, 4-7 attack.
const FRAME = 128; // art-kit BATTLE_FRAME
/** Screen size of `scale` 1, in CSS px per 5 scale units (kept from the 96 px era so layouts hold). */
const BASE = 96;
const STRIP = 8;
const KNOWN = new Set(['adventurer', 'warrior', 'paladin', 'ranger', 'monk', 'sage', 'cleric', 'spellblade']);

/** `gear` = equipped gear ids: the hero is rendered wearing them (cached). Without it, the class's stock strip. */
export function Hero({ classId, scale = 6, action = 'idle', gear }: { classId: string; scale?: number; action?: 'idle' | 'attack'; gear?: string[] }) {
  const id = KNOWN.has(classId) ? classId : 'adventurer';
  const sprite = useHeroSprite(id, gear);
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
        backgroundImage: `url(${gear ? sprite.url : `./sprites/${id}.png`})`,
        backgroundSize: `${px * STRIP}px ${px}px`,
        backgroundPosition: `-${frame * px}px 0px`,
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

export function Boss({ bossId, scale = 8, className }: { bossId: string; scale?: number; className?: string }) {
  const b = BOSSES[bossId] ?? BOSSES['bog-troll'];
  return <Pixels rows={b.rows} palette={b.palette} scale={scale} className={className} />;
}
