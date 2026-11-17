// Layered heroes: the hero looks like the player (hairstyle, hair color, skin tone) in
// every class outfit, without painting every combination. Paint each hairstyle once and
// each class outfit once, then cut and stack them per combination with interaction rules
// (headwear carves or covers hair, ribbons rest on it; see lookParts in wardrobe.ts).
// Hair color and skin tone are recolored in the app (app/content/appearance.ts).
//
// Renders, into art-kit/out/hero-layers:
//   raw/<name>.png   art-kit strips (8 frames: 4 idle + 4 attack), held items left out
//   ids/<name>.png   per-pixel layer ids in red (ID_* in render.ts), material in green
//                    (index into Object.keys(MATERIALS) + 1, 0 = none)
//   jobs.json        paint prompts for the sources, and the targets to compose
// Sources (painted once each):  hair-<style>-<kind>  (plain clothes, no headwear)
//                                outfit-<class>-<kind> (shaved head)
// Targets (composed, never painted): <style>--<class>-<kind>, base hair color and skin.
// Then: npm run paint -- heroes paint | compose | sheet  (art-kit/ai/hero_layers.py)
// Usage: node art-kit/cli/hero-layers.ts [styles/classes] [--fresh]
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { BASE_HAIR, BASE_SKIN, HAIRSTYLES } from '../../app/content/appearance.ts';
import { ATTACKS } from '../src/battle.ts';
import { kindFor, weaponFor } from '../src/held-gear.ts';
import { MATERIALS } from '../src/materials.ts';
import { CLASS_BODIES, KINDS, type Kind } from '../src/modular.ts';
import { encodePng, sheet } from '../src/png.ts';
import { renderLook, type Image, type RenderOpts } from '../src/render.ts';
import type { Look } from '../src/wardrobe.ts';

const OUT = 'art-kit/out/hero-layers';
const STYLE = 'pixel art, 16-bit JRPG battle sprite, three-quarter view facing right, full body, empty hands, crisp dark outlines, clean shading';
const HAIR_TEXT: Record<string, string> = {
  short: 'short brown hair', long: 'long brown hair', ponytail: 'brown hair in a ponytail',
  bun: 'brown hair in a bun', swept: 'swept-back brown hair',
};
// Class outfits (no hair: the outfit sources have shaved heads). Keep each under ~40 words.
const OUTFIT_TEXT: Record<string, string> = {
  adventurer: 'plain linen shirt, tan trousers, simple boots',
  warrior: 'red bandana with red knot, red brigandine with gold rivets, fur mantle, steel pauldrons, red scarf, leather bracers, dark leather trousers, boots',
  paladin: 'gold circlet, silver plate armor with gold trim, blue tabard, blue cape',
  ranger: 'brown leather chest armor with buckled straps over a green tunic, green scarf, leather bracers, quiver, tan trousers, brown boots',
  monk: 'orange gi with black sash, orange hair ribbon, hand wraps, prayer bead amulet',
  sage: 'tall purple wizard hat, purple robe with gold trim, gold sash',
  cleric: 'thin gold circlet, white hair ribbon, white robe with gold trim, white stole',
  spellblade: 'long black coat with silver trim, light trousers, boots, purple scarf',
};
const PLAIN = CLASS_BODIES.adventurer.items;
const MAT_IDS = Object.keys(MATERIALS);
const matId = (name: string) => { const k = MAT_IDS.indexOf(name); return k < 0 ? 255 : k + 1; };

function strips(look: Look, kind: Kind): { raw: Image; ids: Image } {
  const q: RenderOpts = { quality: 'xl', style: 'crisp', dir: 'battle', layer: 'body' };
  const opts: RenderOpts[] = [
    ...[0, 1, 2, 3].map((f) => ({ ...q, anim: 'stance' as const, frame: f })),
    ...ATTACKS[kind].map(([clip, t]) => ({ ...q, motion: { clip, t } })),
  ];
  const raws: Image[] = [], ids: Image[] = [];
  for (const o of opts) {
    const id = new Uint8Array(128 * 128);
    const mats: string[] = new Array(id.length).fill('');
    raws.push(renderLook(look, { ...o, ids: id, mats }));
    const data = new Uint8ClampedArray(id.length * 4);
    id.forEach((v, i) => data.set([v, mats[i] ? matId(mats[i]) : 0, 0, 255], i * 4));
    ids.push({ w: 128, h: 128, data });
  }
  return { raw: sheet([raws], 1), ids: sheet([ids], 1) };
}

const person = (style: string, items: Look['items']): Look => ({
  name: 'hero', build: 1, height: 1, iris: 'irisBrown', skin: BASE_SKIN, hair: { style: style as NonNullable<Look['hair']>['style'], mat: BASE_HAIR }, items,
});

mkdirSync(`${OUT}/raw`, { recursive: true });
mkdirSync(`${OUT}/ids`, { recursive: true });
const prompts: Record<string, string> = {};
const refClass: Record<string, string> = {};
// Resumable: strips already rendered are kept unless --fresh (use it after changing the art kit).
const fresh = process.argv.includes('--fresh');
const save = (name: string, look: Look, kind: Kind) => {
  if (!fresh && existsSync(`${OUT}/raw/${name}.png`) && existsSync(`${OUT}/ids/${name}.png`)) return;
  const s = strips(look, kind);
  writeFileSync(`${OUT}/raw/${name}.png`, encodePng(s.raw));
  writeFileSync(`${OUT}/ids/${name}.png`, encodePng(s.ids));
};

const styles = HAIRSTYLES.map((h) => h.id);
const classes = Object.keys(CLASS_BODIES);
const only = process.argv.slice(2).find((a) => !a.startsWith('--'))?.split(',');
for (const style of styles) {
  if (style === 'bald' || (only && !only.includes(style))) continue;
  for (const kind of KINDS) {
    const name = `hair-${style}-${kind}`;
    save(name, person(style, PLAIN), kind);
    prompts[name] = `${STYLE}, young adventurer, ${HAIR_TEXT[style] ?? `${style} brown hair`}, fair skin, ${OUTFIT_TEXT.adventurer}`;
    refClass[name] = 'adventurer';
    console.log(name);
  }
}
for (const cls of classes) {
  if (only && !only.includes(cls)) continue;
  for (const kind of KINDS) {
    const name = `outfit-${cls}-${kind}`;
    save(name, person('bald', CLASS_BODIES[cls].items), kind);
    prompts[name] = `${STYLE}, young ${cls}, bald head with bare skin scalp, fair skin, ${OUTFIT_TEXT[cls]}`;
    refClass[name] = cls;
    console.log(name);
  }
}
const targets: { name: string; style: string; cls: string; kind: Kind }[] = [];
for (const style of styles)
  for (const cls of classes)
    for (const kind of KINDS) {
      const name = `${style}--${cls}-${kind}`;
      if (!only || only.includes(style) || only.includes(cls)) save(name, person(style, CLASS_BODIES[cls].items), kind);
      targets.push({ name, style, cls, kind });
    }
console.log(`${targets.length} targets`);
const classKind = Object.fromEntries(classes.map((c) => [c, kindFor(weaponFor(c, []))]));
writeFileSync(`${OUT}/jobs.json`, JSON.stringify({ styles, classes, classKind, prompts, refClass, targets }, null, 2));
console.log(`wrote ${OUT}/jobs.json`);
