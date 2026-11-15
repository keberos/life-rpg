// The frames the app uses for a hero in battle: 2 stance frames, then 4 attack frames.
import { renderLook, type Image } from './render.ts';
import type { Look } from './wardrobe.ts';

export function battleFrames(look: Look, style: 'jrpg' | 'crisp'): Image[] {
  if (style === 'jrpg') {
    const q = { quality: 'hd' as const, style };
    return [
      renderLook(look, { dir: 'downRight', anim: 'stance', frame: 0, ...q }),
      renderLook(look, { dir: 'downRight', anim: 'stance', frame: 1, ...q }),
      ...[0, 1, 2, 3].map((f) => renderLook(look, { dir: 'right', anim: 'attack', frame: f, ...q })),
    ];
  }
  const q = { quality: 'hd' as const, style };
  return [
    renderLook(look, { dir: 'battle', anim: 'stance', frame: 0, ...q }),
    renderLook(look, { dir: 'battle', anim: 'stance', frame: 1, ...q }),
    ...[0, 1, 2, 3].map((f) => renderLook(look, { dir: 'battle', anim: 'strike', frame: f, ...q })),
  ];
}
