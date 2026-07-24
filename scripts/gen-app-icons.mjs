#!/usr/bin/env node
// Renders the opaque "TZ" home-screen icon used by iOS.
//
// iOS composites apple-touch-icon over black, so the source must have no alpha
// at all -- the existing /images/icon-*.png are RGBA with a transparent corner
// and turn into a black square on the home screen. This writes truecolor PNGs
// (no alpha channel) with the navy bleeding to every edge; iOS applies its own
// rounded-rect mask on top.
import fs from 'node:fs/promises';
import path from 'node:path';
import zlib from 'node:zlib';

const OUT_DIR = path.resolve(process.argv[2] || 'public/images');
const NAVY = [0x0a, 0x25, 0x40]; // --ink in tengyunzi-clean.css
const WHITE = [0xff, 0xff, 0xff];
const TARGETS = [{ name: 'apple-touch-icon.png', size: 180 }];
const SUPERSAMPLE = 3;

const crcTable = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}

// Truecolor 8-bit PNG, one filter byte (0 = None) per scanline.
function encodePng(width, height, rgb) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor, no alpha
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// The wordmark matches the .brand-mark "TZ" in the site nav. Both letters are
// straight-line only, so each glyph is a handful of rectangles plus one sheared
// band for the Z diagonal -- no font rasterizer needed.
function buildGlyphTest(size) {
  const markWidth = 0.56 * size;
  const markHeight = 0.30 * size;
  const glyphWidth = 0.24 * size;
  const stroke = 0.062 * size;
  const left = (size - markWidth) / 2;
  const top = (size - markHeight) / 2;
  const tX = left;
  const zX = left + glyphWidth + 0.08 * size;
  const innerTop = top + stroke;
  const innerBottom = top + markHeight - stroke;
  const diagHalf = stroke * 0.62; // widened so the slant reads as evenly thick

  return function isInk(x, y) {
    if (y < top || y > top + markHeight) return false;

    // T: top bar + centered stem.
    if (x >= tX && x <= tX + glyphWidth) {
      if (y <= top + stroke) return true;
      const stemX = tX + glyphWidth / 2;
      if (Math.abs(x - stemX) <= stroke / 2) return true;
    }

    // Z: top bar, bottom bar, and the diagonal between them.
    if (x >= zX && x <= zX + glyphWidth) {
      if (y <= top + stroke) return true;
      if (y >= innerBottom) return true;
      const frac = (y - innerTop) / (innerBottom - innerTop);
      const centerX = zX + glyphWidth - stroke / 2
        + frac * (stroke / 2 - (glyphWidth - stroke / 2));
      if (Math.abs(x - centerX) <= diagHalf) return true;
    }

    return false;
  };
}

function render(size) {
  const isInk = buildGlyphTest(size);
  const rgb = Buffer.alloc(size * size * 3);
  const step = 1 / SUPERSAMPLE;
  const samples = SUPERSAMPLE * SUPERSAMPLE;

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let hits = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          if (isInk(x + (sx + 0.5) * step, y + (sy + 0.5) * step)) hits += 1;
        }
      }
      const coverage = hits / samples;
      const offset = (y * size + x) * 3;
      for (let c = 0; c < 3; c += 1) {
        rgb[offset + c] = Math.round(NAVY[c] + (WHITE[c] - NAVY[c]) * coverage);
      }
    }
  }
  return encodePng(size, size, rgb);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  for (const target of TARGETS) {
    const file = path.join(OUT_DIR, target.name);
    await fs.writeFile(file, render(target.size));
    console.log(`wrote ${file} (${target.size}x${target.size}, no alpha)`);
  }
}

main().catch((err) => {
  console.error(`ERROR: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
});
