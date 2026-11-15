// Nearest-neighbor upscale of PNGs for viewing, on a dark backdrop; several inputs are stacked.
// Usage: node art-kit/cli/upscale.ts in.png[,in2.png...] out.png [scale]
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { encodePng } from '../src/png.ts';
const [inp, outp, sc] = process.argv.slice(2);
const s = Number(sc ?? 4);
function decode(file: string) {
const buf = readFileSync(file);
let w = 0, h = 0; const idat: Buffer[] = []; let ct = 6;
for (let o = 8; o < buf.length;) {
  const len = buf.readUInt32BE(o), type = buf.toString('ascii', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + len);
  if (type === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; }
  if (type === 'IDAT') idat.push(d);
  o += 12 + len;
}
const bpp = ct === 6 ? 4 : 3;
const raw = inflateSync(Buffer.concat(idat));
const px = new Uint8Array(w * h * 4);
const stride = w * bpp;
let prev = new Uint8Array(stride);
for (let y = 0; y < h; y++) {
  const f = raw[y * (stride + 1)], line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
  const cur = new Uint8Array(stride);
  for (let i = 0; i < stride; i++) {
    const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
    const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
    const pred = f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : f === 4 ? (pa <= pb && pa <= pc ? a : pb <= pc ? b : c) : 0;
    cur[i] = (line[i] + pred) & 255;
  }
  for (let x = 0; x < w; x++) for (let k = 0; k < 4; k++) px[(y * w + x) * 4 + k] = k < bpp ? cur[x * bpp + k] : 255;
  prev = cur;
}
return { w, h, px };
}
const imgs = inp.split(',').map(decode);
const w = Math.max(...imgs.map((i) => i.w)), h = imgs.reduce((n, i) => n + i.h + 4, -4);
const px = new Uint8Array(w * h * 4);
let oy = 0;
for (const im of imgs) {
  for (let y = 0; y < im.h; y++) px.set(im.px.subarray(y * im.w * 4, (y + 1) * im.w * 4), ((oy + y) * w) * 4);
  oy += im.h + 4;
}
const W = Math.round(w * s), H = Math.round(h * s), data = new Uint8ClampedArray(W * H * 4);
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = ((y / s | 0) * w + (x / s | 0)) * 4, o = (y * W + x) * 4, a = px[i + 3] / 255;
  for (let k = 0; k < 3; k++) data[o + k] = px[i + k] * a + [58, 64, 92][k] * (1 - a);
  data[o + 3] = 255;
}
writeFileSync(outp, encodePng({ w: W, h: H, data }));
