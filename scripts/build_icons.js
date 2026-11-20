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

function createSportSyncPng(size) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9); // RGBA
  ihdr.writeUInt8(0, 10);
  ihdr.writeUInt8(0, 11);
  ihdr.writeUInt8(0, 12);
  const ihdrChunk = makeChunk('IHDR', ihdr);

  const rowLen = 1 + size * 4;
  const raw = Buffer.alloc(rowLen * size);

  const cx = size / 2;
  const cy = size / 2;
  const cornerRadius = size * 0.22; // smooth squircle app icon

  for (let y = 0; y < size; y++) {
    const rowOffset = y * rowLen;
    raw[rowOffset] = 0;

    for (let x = 0; x < size; x++) {
      const pxOffset = rowOffset + 1 + x * 4;

      // Squircle distance
      const qx = Math.max(0, Math.abs(x - cx) - (cx - cornerRadius));
      const qy = Math.max(0, Math.abs(y - cy) - (cy - cornerRadius));
      const qDist = Math.sqrt(qx * qx + qy * qy);

      if (qDist > cornerRadius) {
        // Transparent outside rounded icon
        raw[pxOffset] = 0;
        raw[pxOffset + 1] = 0;
        raw[pxOffset + 2] = 0;
        raw[pxOffset + 3] = 0;
        continue;
      }

      // Background: Athletic deep green-black #060E0A
      let r = 6, g = 14, b = 10, a = 255;

      // Normalized coordinates inside [-1, 1]
      const nx = (x - cx) / (size * 0.38);
      const ny = (y - cy) / (size * 0.38);

      // 1. Athlete head dot: circle at top
      const headX = 0.05;
      const headY = -0.58;
      const headDist = Math.hypot(nx - headX, ny - headY);
      if (headDist <= 0.19) {
        // Brand Lime #D4FA2B
        r = 212; g = 250; b = 43; a = 255;
      }

      // 2. Dynamic ribbon S:
      // Top swoop
      const dTop = Math.abs(ny - (-0.28 - 0.22 * nx));
      const inTop = nx >= -0.55 && nx <= 0.65 && ny >= -0.45 && ny <= -0.10 && dTop < 0.20;

      // Middle diagonal ribbon
      const dMid = Math.abs(ny - (0.45 * nx));
      const inMid = nx >= -0.45 && nx <= 0.45 && ny >= -0.22 && ny <= 0.28 && dMid < 0.24;

      // Bottom swoop
      const dBot = Math.abs(ny - (0.35 - 0.22 * nx));
      const inBot = nx >= -0.65 && nx <= 0.55 && ny >= 0.12 && ny <= 0.52 && dBot < 0.20;

      if (inTop || inMid || inBot) {
        // Gradient from volt lime (212, 250, 43) to deep athletic lime (80, 110, 15)
        const factor = Math.max(0, Math.min(1, (ny + 0.4) / 0.8));
        r = Math.round(212 * (1 - factor * 0.4));
        g = Math.round(250 * (1 - factor * 0.3));
        b = Math.round(43 * (1 - factor * 0.6));
        a = 255;
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

function createMultiIco(pngBuffers) {
  // pngBuffers: array of { width, height, buffer }
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // Reserved
  header.writeUInt16LE(1, 2); // 1 = ICO
  header.writeUInt16LE(count, 4);

  let offset = 6 + count * 16;
  const dirEntries = [];

  for (const item of pngBuffers) {
    const dir = Buffer.alloc(16);
    dir.writeUInt8(item.width === 256 ? 0 : item.width, 0);
    dir.writeUInt8(item.height === 256 ? 0 : item.height, 1);
    dir.writeUInt8(0, 2);
    dir.writeUInt8(0, 3);
    dir.writeUInt16LE(1, 4);
    dir.writeUInt16LE(32, 6);
    dir.writeUInt32LE(item.buffer.length, 8);
    dir.writeUInt32LE(offset, 12);
    dirEntries.push(dir);
    offset += item.buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map(p => p.buffer)]);
}

// Generate sizes
const png16 = createSportSyncPng(16);
const png32 = createSportSyncPng(32);
const png48 = createSportSyncPng(48);
const png192 = createSportSyncPng(192);
const png512 = createSportSyncPng(512);

const icoBuffer = createMultiIco([
  { width: 16, height: 16, buffer: png16 },
  { width: 32, height: 32, buffer: png32 },
  { width: 48, height: 48, buffer: png48 },
]);

// Write ICOs
fs.writeFileSync('public/favicon.ico', icoBuffer);
fs.writeFileSync('src/app/favicon.ico', icoBuffer);

// Write PNGs
fs.writeFileSync('public/icon-192.png', png192);
fs.writeFileSync('public/icon-512.png', png512);
fs.writeFileSync('public/apple-touch-icon.png', png192);

const assetsDir = 'public/assets';
if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });
fs.writeFileSync('public/assets/icon-192.png', png192);
fs.writeFileSync('public/assets/icon-512.png', png512);

console.log('Successfully generated SportSync icons & favicons:');
console.log(' - public/favicon.ico (' + icoBuffer.length + ' bytes)');
console.log(' - src/app/favicon.ico (' + icoBuffer.length + ' bytes)');
console.log(' - public/icon-192.png (' + png192.length + ' bytes)');
console.log(' - public/icon-512.png (' + png512.length + ' bytes)');
console.log(' - public/apple-touch-icon.png (' + png192.length + ' bytes)');
