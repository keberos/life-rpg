// Minimal PNG writer + sheet compositing for Node (no dependencies).
import { deflateSync } from 'node:zlib';
import type { Image } from './render.ts';

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

export function encodePng(img: Image): Buffer {
  const { w, h, data } = img;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    Buffer.from(data.buffer, data.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', new Uint8Array()),
  ]);
}

/** Lay images out in a grid, scaled up with nearest-neighbor, on an optional background. */
export function sheet(rows: Image[][], scale = 1, bg: [number, number, number, number] = [0, 0, 0, 0], gap = 0): Image {
  const cw = rows[0][0].w, ch = rows[0][0].h;
  const cols = Math.max(...rows.map((r) => r.length));
  const w = (cols * cw + (cols + 1) * gap) * scale;
  const h = (rows.length * ch + (rows.length + 1) * gap) * scale;
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(bg, i * 4);
  rows.forEach((row, ry) =>
    row.forEach((img, cx) => {
      const ox = (gap + cx * (cw + gap)) * scale, oy = (gap + ry * (ch + gap)) * scale;
      for (let y = 0; y < img.h; y++)
        for (let x = 0; x < img.w; x++) {
          const s = (y * img.w + x) * 4;
          if (img.data[s + 3] === 0) continue;
          for (let dy = 0; dy < scale; dy++)
            for (let dx = 0; dx < scale; dx++) data.set(img.data.subarray(s, s + 4), ((oy + y * scale + dy) * w + ox + x * scale + dx) * 4);
        }
    }),
  );
  return { w, h, data };
}
