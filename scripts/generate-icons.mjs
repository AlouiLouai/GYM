// Generates the PWA icons (dumbbell on dark background) with no image dependencies.
// Run: node scripts/generate-icons.mjs
import { mkdir, writeFile } from "node:fs/promises";
import { deflateSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");

const BG = [9, 9, 11];
const FG = [163, 230, 53];
const SS = 3; // supersampling for smooth edges

// Dumbbell geometry in a 0..1 box, centred; `scale` shrinks it for maskable safe zone.
function inDumbbell(u, v, scale) {
  const x = (u - 0.5) / scale;
  const y = (v - 0.5) / scale;
  const rect = (cx, cy, w, h) => Math.abs(x - cx) <= w / 2 && Math.abs(y - cy) <= h / 2;
  return (
    rect(0, 0, 0.5, 0.07) || // bar
    rect(-0.2, 0, 0.09, 0.34) || // inner plates
    rect(0.2, 0, 0.09, 0.34) ||
    rect(-0.29, 0, 0.07, 0.24) || // outer plates
    rect(0.29, 0, 0.07, 0.24)
  );
}

function inRoundedSquare(u, v, radius) {
  const dx = Math.max(Math.abs(u - 0.5) - (0.5 - radius), 0);
  const dy = Math.max(Math.abs(v - 0.5) - (0.5 - radius), 0);
  return dx * dx + dy * dy <= radius * radius;
}

function render(size, { rounded, scale }) {
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let py = 0; py < size; py++) {
    const row = py * (size * 4 + 1);
    raw[row] = 0; // filter: none
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (px + (sx + 0.5) / SS) / size;
          const v = (py + (sy + 0.5) / SS) / size;
          if (rounded && !inRoundedSquare(u, v, 0.22)) continue;
          const c = inDumbbell(u, v, scale) ? FG : BG;
          r += c[0]; g += c[1]; b += c[2]; a += 255;
        }
      }
      const n = SS * SS;
      const o = row + 1 + px * 4;
      const cover = a / 255;
      raw[o] = cover ? Math.round(r / cover) : 0;
      raw[o + 1] = cover ? Math.round(g / cover) : 0;
      raw[o + 2] = cover ? Math.round(b / cover) : 0;
      raw[o + 3] = Math.round(a / n);
    }
  }
  return encodePng(size, raw);
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function encodePng(size, raw) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const icons = [
  ["icon-192.png", 192, { rounded: true, scale: 1.15 }],
  ["icon-512.png", 512, { rounded: true, scale: 1.15 }],
  // Maskable: full-bleed background, artwork kept inside the 80% safe zone.
  ["icon-maskable-512.png", 512, { rounded: false, scale: 0.9 }],
  // iOS applies its own mask and dislikes transparency.
  ["apple-touch-icon.png", 180, { rounded: false, scale: 1.05 }],
];

await mkdir(outDir, { recursive: true });
for (const [name, size, opts] of icons) {
  await writeFile(join(outDir, name), render(size, opts));
  console.log(`[icons] ${name}`);
}
