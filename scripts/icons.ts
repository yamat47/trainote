// Writes the home-screen icons under public/icons/: the two marks of the app, + for a
// Win and − for a Slip, in white on the tint. Drawn as rectangles and encoded by hand so
// that no image library is needed; replace the PNGs when a designed icon exists.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { crc32, deflateSync } from 'node:zlib';

const root = path.resolve(import.meta.dirname, '..');
type Rgb = readonly [number, number, number];
type Paint = (x: number, y: number) => Rgb;

const tint: Rgb = [0x00, 0x7a, 0xff];

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(size: number, paint: Paint): Buffer {
  const row = 1 + size * 4;
  const raster = Buffer.alloc(row * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const [r, g, b] = paint(x, y);
      raster.set([r, g, b, 0xff], y * row + 1 + x * 4);
    }
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA, no interlace.
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raster)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Whether the centre of pixel (x, y) falls inside an axis-aligned bar.
const inBar = (cx: number, cy: number, halfW: number, halfH: number, x: number, y: number) =>
  Math.abs(x + 0.5 - cx) <= halfW && Math.abs(y + 0.5 - cy) <= halfH;

// Both marks sit inside the central 80% circle, the safe zone of a maskable icon.
function marks(size: number): Paint {
  const stroke = size * 0.085;
  const arm = size * 0.19;
  const plus = { x: size * 0.33, y: size * 0.5 };
  const minus = { x: size * 0.67, y: size * 0.5 };
  return (x, y) =>
    inBar(plus.x, plus.y, arm, stroke / 2, x, y) ||
    inBar(plus.x, plus.y, stroke / 2, arm, x, y) ||
    inBar(minus.x, minus.y, arm, stroke / 2, x, y)
      ? [0xff, 0xff, 0xff]
      : tint;
}

const files: [string, number][] = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
];
await Promise.all(
  files.map(([name, size]) =>
    writeFile(path.join(root, 'public', 'icons', name), png(size, marks(size))),
  ),
);
