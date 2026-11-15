// Style presets: the same looks rendered realistic ("classic") or as heroic
// JRPG sprites. See the concept doc's "Stylization: JRPG, not OSRS" table.
import { CLASSIC_BODY, CRISP_BODY, HEROIC_BODY, type AnimName, type Body } from './rig.ts';

export interface Style {
  name: 'classic' | 'jrpg' | 'crisp';
  body: Omit<Body, 'build' | 'height'>;
  weaponScale: number; // main/off-hand items scaled about the hand
  palette: 'muted' | 'vivid';
  outline: 'dark' | 'selout';
  /** 'minimal' drops shading-only paint lines (folds, strands, seams) but keeps color details. */
  detail: 'full' | 'minimal';
  face: 'dot' | 'anime';
  idleAnim: AnimName;
  pitchDeg: number; // camera tilt: lower = closer to eye level
  /**
   * 'crisp': hand-painted sprite look (see design/sprite-style-research.md).
   * Light is fixed on screen (upper left) so each part keeps its light side as it
   * moves; no ambient occlusion or cast shadows (they speckle between frames);
   * each part outlined in its own darkest tone, with lines where parts overlap;
   * metal gets a bright edge; no glow halo.
   */
  render?: 'lit3d' | 'crisp';
}

export const STYLES: Record<Style['name'], Style> = {
  classic: { name: 'classic', body: CLASSIC_BODY, weaponScale: 1, palette: 'muted', outline: 'dark', detail: 'full', face: 'dot', idleAnim: 'idle', pitchDeg: 28 },
  crisp: { name: 'crisp', body: CRISP_BODY, weaponScale: 1.45, palette: 'vivid', outline: 'selout', detail: 'minimal', face: 'anime', idleAnim: 'stance', pitchDeg: 14, render: 'crisp' },
  jrpg: { name: 'jrpg', body: HEROIC_BODY, weaponScale: 1.35, palette: 'vivid', outline: 'selout', detail: 'minimal', face: 'anime', idleAnim: 'stance', pitchDeg: 18 },
};
