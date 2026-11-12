import { deflateSync, inflateSync } from 'node:zlib';
import { crc32, encodeDriver } from './driver.mjs';

const u32 = value => { const b = Buffer.alloc(4); b.writeUInt32LE(value); return b; };
const byte = value => Buffer.from([value]);
const text = value => { const b = Buffer.from(value, 'utf16le'); return Buffer.concat([byte(3), u32(b.length), b]); };
const number = value => Buffer.concat([byte(1), u32(value)]);
const compressed = (tag, value) => {
  const raw = Buffer.from(value, 'utf16le');
  const packed = deflateSync(raw);
  return Buffer.concat([byte(tag), u32(packed.length + 4), u32(raw.length), packed]);
};
const endResource = Buffer.from('f0f1f0f1f1', 'hex');
function resource(name, type, id, metadata, source) {
  return Buffer.concat([
    byte(0xf0), text(name), number(type), number(id), text(metadata), text(''),
    byte(5), u32(0), byte(5), u32(0), compressed(5, source), endResource,
  ]);
}

// Experimental minimal CVCP 22 container, observed in CVC 24.00.1450.
// Built entirely from typed fields; no project/template bytes are read.
export function encodeProject({ name, source, manufacturer = 'Custom' }) {
  encodeDriver({name, source, manufacturer}); // Shared validation only.
  const metadata = `PRODUCTNAME:=${name}\r\nPRODUCTTYPE:=Other\r\nMANUFACTURER:=${manufacturer}\r\nCT:=Relay\r\n`;
  const configuration = '#VERSION 4\n#PAGES\n"Page1" 100\n#CONTROLLERS\n#DEVICES\n#INTERNALDEBUGCONFIGURATION\n#DEBUGCONFIGURATION\n#MULTIIPADDRESSES\n#ALLSIMULATIONCONFIGURATION\n#MDIWINDOWS\n31 "" ""\n23 "" "' + name + '"\n#END\n';
  const body = Buffer.concat([
    Buffer.from('089c58cadbb12695', 'hex'), Buffer.from([22, 0]),
    byte(0xf0), byte(0xf0),
    resource('MyCommon', 2, 1, '', '// MyCommon - common functions and constants module\n\n'),
    resource(name, 3, 2, metadata, source),
    Buffer.from('f1f0f1f0f1', 'hex'), compressed(6, configuration), byte(0xf1),
  ]);
  return Buffer.concat([u32(crc32(body)), body]);
}

// Strict reader for this minimal subset, for structural validation.
export function inspectMinimalProject(b) {
  if (b.readUInt32LE(0) !== crc32(b.subarray(4))) throw new Error('Invalid project CRC');
  let pos = 4;
  function expect(hex) { const expected = Buffer.from(hex, 'hex'); if (!b.subarray(pos, pos + expected.length).equals(expected)) throw new Error(`Unexpected project structure at ${pos}`); pos += expected.length; }
  function integer() { const n = b.readUInt32LE(pos); pos += 4; return n; }
  function string() { expect('03'); const length = integer(); const s = b.subarray(pos, pos + length).toString('utf16le'); pos += length; return s; }
  function packed(tag) { expect(tag); const length = integer(); const rawLength = integer(); const raw = inflateSync(b.subarray(pos, pos + length - 4)); pos += length - 4; if (raw.length !== rawLength) throw new Error('Invalid decompressed length'); return raw.toString('utf16le'); }
  expect('089c58cadbb126951600f0f0');
  const resources = [];
  while (b[pos] === 0xf0) {
    expect('f0'); const name = string(); expect('01'); const type = integer(); expect('01'); const id = integer();
    const metadata = string(); const filename = string(); expect('05000000000500000000'); const source = packed('05'); expect('f0f1f0f1f1');
    resources.push({name, type, id, metadata, filename, source});
  }
  expect('f1f0f1f0f1'); const configuration = packed('06'); expect('f1');
  if (pos !== b.length) throw new Error('Unexpected trailing data');
  return {resources, configuration};
}
