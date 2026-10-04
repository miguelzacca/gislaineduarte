import { deflateRawSync } from 'node:zlib';

// Small ZIP writer for the fixed local delivery files; keeps builds Node-only.
const crcTable = Uint32Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});
const crc32 = buffer => {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
};

export function buildProductBundle(files) {
  const local = [], directory = [];
  let offset = 0;
  // The edition date makes the archive reproducible, independent of build time.
  const date = ((2026 - 1980) << 9) | (10 << 5) | 4;
  for (const file of files) {
    if (!file.name || /(^\/|\\|(^|\/)\.\.(\/|$))/.test(file.name)) throw new Error('Invalid delivery filename');
    const name = Buffer.from(file.name, 'utf8');
    const content = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content);
    const compressed = deflateRawSync(content, { level: 6 });
    const crc = crc32(content);
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50, 0); header.writeUInt16LE(20, 4);
    header.writeUInt16LE(0x800, 6); header.writeUInt16LE(8, 8); header.writeUInt16LE(date, 12);
    header.writeUInt32LE(crc, 14); header.writeUInt32LE(compressed.length, 18); header.writeUInt32LE(content.length, 22); header.writeUInt16LE(name.length, 26);
    local.push(header, name, compressed);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6);
    entry.writeUInt16LE(0x800, 8); entry.writeUInt16LE(8, 10); entry.writeUInt16LE(date, 14);
    entry.writeUInt32LE(crc, 16); entry.writeUInt32LE(compressed.length, 20); entry.writeUInt32LE(content.length, 24); entry.writeUInt16LE(name.length, 28); entry.writeUInt32LE(offset, 42);
    directory.push(entry, name); offset += header.length + name.length + compressed.length;
  }
  const central = Buffer.concat(directory), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(files.length, 8); end.writeUInt16LE(files.length, 10);
  end.writeUInt32LE(central.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, central, end]);
}
