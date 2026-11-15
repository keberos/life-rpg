// Renders a hero sprite strip off the main thread (the art kit takes a few
// seconds). Same layout as the pre-rendered strips: frames 0-3 breathing stance,
// 4-7 attack, in the crisp 3/4 battle view. Replies with a PNG data URL.
import { battleFrames } from '../../art-kit/src/battle.ts';
import type { Look } from '../../art-kit/src/wardrobe.ts';

import { BATTLE_FRAME as SIZE } from '../../art-kit/src/battle.ts';
const ctx = self as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage: (m: unknown) => void };

ctx.onmessage = async (e: MessageEvent<{ key: string; look: Look }>) => {
  const { key, look } = e.data;
  try {
    const frames = battleFrames(look, 'crisp');
    const canvas = new OffscreenCanvas(SIZE * frames.length, SIZE);
    const g = canvas.getContext('2d')!;
    frames.forEach((img, i) => g.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.w, img.h), i * SIZE, 0));
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    ctx.postMessage({ key, url: `data:image/png;base64,${btoa(bin)}` });
  } catch (err) {
    ctx.postMessage({ key, error: String(err) });
  }
};
