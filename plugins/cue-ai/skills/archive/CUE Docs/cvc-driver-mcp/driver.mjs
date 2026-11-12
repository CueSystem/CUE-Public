import { deflateSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

export function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
const u32 = value => { const b = Buffer.alloc(4); b.writeUInt32LE(value); return b; };
export function encodeDriver({ name, source, manufacturer = 'Custom' }) {
  if (typeof name !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name)) throw new Error('name must be an XPL2 identifier, 1–64 ASCII characters');
  if (/^(CON|PRN|AUX|NUL|COM[0-9]|LPT[0-9])$/i.test(name)) throw new Error('Reserved Windows filename');
  if (typeof manufacturer !== 'string' || !manufacturer.length || manufacturer.length > 120 || /[\r\n\x00-\x1f]/.test(manufacturer)) throw new Error('Invalid manufacturer');
  if (typeof source !== 'string' || !source.trim() || Buffer.byteLength(source) > 1024 * 1024 || source.includes('\0')) throw new Error('source must be nonempty XPL2 text, at most 1 MiB');
  const classes = [...source.matchAll(/^\s*Global\s+DeviceClass\s+(\w+)\s*$/gmi)];
  if (classes.length !== 1 || classes[0][1].toLowerCase() !== name.toLowerCase()) throw new Error('source must contain exactly one Global DeviceClass matching name');
  if (!/^\s*End\s+DeviceClass\s*$/mi.test(source)) throw new Error('Missing End DeviceClass');
  // Experimental minimal Relay/Other container, verified against CVC export.
  const metadata = Buffer.from(`PRODUCTNAME:=${name}\r\nPRODUCTTYPE:=Other\r\nMANUFACTURER:=${manufacturer}\r\nCT:=Relay\r\n`, 'utf16le');
  const raw = Buffer.from(source, 'utf16le');
  const compressed = deflateSync(raw);
  const body = Buffer.concat([
    Buffer.from('6f44147ecb6f8bd00c00f00103000000', 'hex'),
    Buffer.from([3]), u32(metadata.length), metadata,
    Buffer.from('03000000000500000000050000000005', 'hex'),
    u32(compressed.length + 4), u32(raw.length), compressed,
    Buffer.from('f0f1f0f1f1', 'hex'),
  ]);
  return Buffer.concat([u32(crc32(body)), body]);
}
export async function createDriver(args, outputDir) {
  const bytes = encodeDriver(args);
  await mkdir(outputDir, { recursive: true });
  const outputPath = path.resolve(outputDir, args.name + '.cvcd');
  await writeFile(outputPath, bytes, { flag: 'wx' });
  return { path: outputPath, bytes: bytes.length, connection: 'Relay', importedIntoCvc: false,
    nextStep: 'In CVC: MyProject Resources > Insert > Device > Insert device from other location. Select this .cvcd file.',
    limitation: 'Experimental Relay/Other container. Source is packaged, not compiled or uploaded.' };
}
