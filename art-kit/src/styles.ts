// Style presets: the same looks rendered realistic ("classic") or as heroic
// JRPG sprites. See the concept doc's "Stylization: JRPG, not OSRS" table.
import { CLASSIC_BODY, HEROIC_BODY, type AnimName, type Body } from './rig.ts';

export interface Style {
  name: 'classic' | 'jrpg';
  body: Omit<Body, 'build' | 'height'>;
  weaponScale: number; // main/off-hand items scaled about the hand
  palette: 'muted' | 'vivid';
  outline: 'dark' | 'selout';
  /** 'minimal' drops shading-only paint lines (folds, strands, seams) but keeps color details. */
  detail: 'full' | 'minimal';
  face: 'dot' | 'anime';
  idleAnim: AnimName;
  pitchDeg: number; // camera tilt: lower = closer to eye level
}

export const STYLES: Record<Style['name'], Style> = {
  classic: { name: 'classic', body: CLASSIC_BODY, weaponScale: 1, palette: 'muted', outline: 'dark', detail: 'full', face: 'dot', idleAnim: 'idle', pitchDeg: 28 },
  jrpg: { name: 'jrpg', body: HEROIC_BODY, weaponScale: 1.35, palette: 'vivid', outline: 'selout', detail: 'minimal', face: 'anime', idleAnim: 'stance', pitchDeg: 18 },
};
