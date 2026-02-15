const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, '..', 'assets', 'icon-source.png');
const outDir = path.join(__dirname, '..', 'build');
const out = path.join(outDir, 'icon.ico');

if (!fs.existsSync(src)) {
  console.error('Missing source PNG:', src);
  process.exit(1);
}

const png = fs.readFileSync(src);
const pngLen = png.length;

// ICONDIR header
// 0-1 reserved (0)
// 2-3 type (1 for ICO)
// 4-5 count (1)
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(1, 4);

// ICONDIRENTRY (16 bytes)
const entry = Buffer.alloc(16);
// width and height: use 0 to indicate 256 (if PNG is 256x256); else try to guess
// For robustness, set 0 which modern Windows treats as 256; works for any PNG too
entry.writeUInt8(0, 0); // width
entry.writeUInt8(0, 1); // height
entry.writeUInt8(0, 2); // color count
entry.writeUInt8(0, 3); // reserved
entry.writeUInt16LE(1, 4); // color planes (1)
entry.writeUInt16LE(32, 6); // bits per pixel
entry.writeUInt32LE(pngLen, 8); // bytes in resource
const imageOffset = 6 + 16; // header + entry
entry.writeUInt32LE(imageOffset, 12);

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(out, Buffer.concat([header, entry, png]));
console.log('Wrote', out);
