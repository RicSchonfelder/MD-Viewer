import { readFileSync, writeFileSync } from 'fs';

const pngPath = 'src-tauri/icons/256x256.png';
const icoPath = 'src-tauri/icons/icon.ico';

const pngData = readFileSync(pngPath);
const pngSize = pngData.length;

const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);     // reserved
icoHeader.writeUInt16LE(1, 2);     // type: ICO
icoHeader.writeUInt16LE(1, 4);     // count: 1 image

const icoEntry = Buffer.alloc(16);
icoEntry.writeUInt8(0, 0);         // width (0=256)
icoEntry.writeUInt8(0, 1);         // height (0=256)
icoEntry.writeUInt8(0, 2);         // colors
icoEntry.writeUInt8(0, 3);         // reserved
icoEntry.writeUInt16LE(1, 4);      // planes
icoEntry.writeUInt16LE(32, 6);     // bpp
icoEntry.writeUInt32LE(pngSize, 8);  // size
icoEntry.writeUInt32LE(22, 12);    // offset (6 + 16)

const ico = Buffer.concat([icoHeader, icoEntry, pngData]);
writeFileSync(icoPath, ico);
console.log(`Created ${icoPath}`);
