// Renders a hero sprite strip off the main thread (the art kit takes a few
// seconds). Same layout as the pre-rendered strips: frames 0-1 idle stance,
// 2-5 attack. Replies with a PNG data URL.
import { renderLook } from '../../art-kit/src/render.ts';
import type { Look } from '../../art-kit/src/wardrobe.ts';

const SIZE = 96;
const ctx = self as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage: (m: unknown) => void };

ctx.onmessage = async (e: MessageEvent<{ key: string; look: Look }>) => {
  const { key, look } = e.data;
  try {
    const opts = { quality: 'hd' as const, style: 'jrpg' as const };
    const frames = [
      renderLook(look, { ...opts, dir: 'downRight', anim: 'stance', frame: 0 }),
      renderLook(look, { ...opts, dir: 'downRight', anim: 'stance', frame: 1 }),
      ...[0, 1, 2, 3].map((f) => renderLook(look, { ...opts, dir: 'right', anim: 'attack', frame: f })),
    ];
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
