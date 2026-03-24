/**
 * Generate a minimal 256x256 PNG icon for VibeIDE.
 * Run: node scripts/generate-icon.js
 */
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const width = 256;
const height = 256;

// Build raw image data: filter byte + RGB for each row
const rowBytes = 1 + width * 3;
const rawData = Buffer.alloc(rowBytes * height);

for (let y = 0; y < height; y++) {
  const rowOffset = y * rowBytes;
  rawData[rowOffset] = 0; // no filter
  for (let x = 0; x < width; x++) {
    const px = rowOffset + 1 + x * 3;
    // Dark background with a centered "V" shape
    const cx = x - 128;
    const inV =
      y > 60 &&
      y < 200 &&
      Math.abs(cx) < (y - 60) * 0.5 &&
      (Math.abs(cx) > (y - 60) * 0.5 - 20 || y > 180);
    if (inV) {
      rawData[px] = 0x7a;
      rawData[px + 1] = 0xa2;
      rawData[px + 2] = 0xf7; // blue accent
    } else {
      rawData[px] = 0x1a;
      rawData[px + 1] = 0x1b;
      rawData[px + 2] = 0x26; // dark background
    }
  }
}

const compressed = zlib.deflateSync(rawData);

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crc]);
}

const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8; // bit depth
ihdr[9] = 2; // color type RGB

const png = Buffer.concat([
  sig,
  chunk('IHDR', ihdr),
  chunk('IDAT', compressed),
  chunk('IEND', Buffer.alloc(0)),
]);

const outDir = path.join(__dirname, '..', 'resources');
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, 'icon.png');
fs.writeFileSync(outPath, png);
console.log(`Created ${png.length} byte PNG icon at ${outPath}`);
