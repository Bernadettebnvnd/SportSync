const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    let byte = buf[i];
    crc ^= byte;
    for (let j = 0; j < 8; j++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ -1) >>> 0;
}

function makeChunk(type, data) {
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(size) {
  // Signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); // width
  ihdr.writeUInt32BE(size, 4); // height
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(6, 9); // RGBA (color type 6)
  ihdr.writeUInt8(0, 10); // compression 0
  ihdr.writeUInt8(0, 11); // filter 0
  ihdr.writeUInt8(0, 12); // interlace 0
  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data: height scanlines, each (1 filter byte + width * 4 bytes RGBA)
  const rowLen = 1 + size * 4;
  const raw = Buffer.alloc(rowLen * size);

  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.44;

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowLen;
    raw[rowOffset] = 0; // Filter None

    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Default background: dark luxury green-black #0B0F0C
      let r = 11, g = 15, b = 12, a = 255;

      // Rounded container circle with neon border
      if (dist <= radius) {
        // Inner fill: #141A15
        r = 20; g = 26; b = 21;

        // Subtle gradient towards center
        const grad = 1 - dist / radius;
        r = Math.min(255, Math.floor(r + grad * 12));
        g = Math.min(255, Math.floor(g + grad * 18));
        b = Math.min(255, Math.floor(b + grad * 14));

        // Border glow: #C8FF2E
        if (dist > radius - size * 0.035) {
          const borderAlpha = (dist - (radius - size * 0.035)) / (size * 0.035);
          r = Math.floor(r * (1 - borderAlpha) + 200 * borderAlpha);
          g = Math.floor(g * (1 - borderAlpha) + 255 * borderAlpha);
          b = Math.floor(b * (1 - borderAlpha) + 46 * borderAlpha);
        }

        // Draw SportSync "S" logo shape in center
        // Normalize coordinates inside [-1, 1] relative to center
        const nx = dx / (size * 0.28);
        const ny = dy / (size * 0.32);

        // Check if point is inside stylized geometric S shape
        // S has:
        // Top bar: ny between -0.85 and -0.45, nx between -0.65 and 0.65
        // Top-left stem: ny between -0.45 and -0.05, nx between -0.65 and -0.2
        // Middle crossbar: ny between -0.2 and 0.2, nx between -0.65 and 0.65
        // Bottom-right stem: ny between 0.05 and 0.45, nx between 0.2 and 0.65
        // Bottom bar: ny between 0.45 and 0.85, nx between -0.65 and 0.65

        let inS = false;
        if (ny >= -0.82 && ny <= -0.45 && nx >= -0.65 && nx <= 0.65) inS = true;
        if (ny >= -0.45 && ny <= 0.05 && nx >= -0.65 && nx <= -0.15) inS = true;
        if (ny >= -0.18 && ny <= 0.18 && nx >= -0.65 && nx <= 0.65) inS = true;
        if (ny >= -0.05 && ny <= 0.45 && nx >= 0.15 && nx <= 0.65) inS = true;
        if (ny >= 0.45 && ny <= 0.82 && nx >= -0.65 && nx <= 0.65) inS = true;

        if (inS) {
          // Neon Volt / Lime #C8FF2E
          r = 200;
          g = 255;
          b = 46;
          a = 255;
        }
      }

      raw[pxOffset] = r;
      raw[pxOffset + 1] = g;
      raw[pxOffset + 2] = b;
      raw[pxOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(raw, { level: 9 });
  const idatChunk = makeChunk('IDAT', deflated);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([sig, ihdrChunk, idatChunk, iendChunk]);
}

const outDir = path.join(__dirname, '../public/assets');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const p192 = path.join(outDir, 'icon-192.png');
const p512 = path.join(outDir, 'icon-512.png');

fs.writeFileSync(p192, createPng(192));
fs.writeFileSync(p512, createPng(512));

console.log('Successfully created PWA icons:');
console.log(' - ' + p192 + ' (' + fs.statSync(p192).size + ' bytes)');
console.log(' - ' + p512 + ' (' + fs.statSync(p512).size + ' bytes)');
