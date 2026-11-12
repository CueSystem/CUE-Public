import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseProject,serializeProject} from './inspect-project.mjs';
import {encodeProject} from './project.mjs';
import {crc32} from './driver.mjs';

test('Parser handles minimal generated project, preserves binary fields and rejects damaged framing',()=>{
  const bytes=encodeProject({name:'Relay',source:'Global DeviceClass Relay\nConnector R\nEnd DeviceClass\n'});
  const p=parseProject(bytes);assert.deepEqual(serializeProject(p),bytes);
  p.root[0].children.push({tag:4,payload:Buffer.from([0xf0,0xf1,0x03])});
  const binary=serializeProject(p);assert.deepEqual(serializeProject(parseProject(binary)),binary);
  const bad=Buffer.from(bytes);bad[14]=0xf1;bad.writeUInt32LE(crc32(bad.subarray(4)),0);
  assert.throws(()=>parseProject(bad),/Unmatched/);
  const corrupt=Buffer.from(bytes);corrupt[20]^=1;assert.throws(()=>parseProject(corrupt),/CRC/);
});
test('User supplied full project survives byte-exact structural roundtrip',{skip:!process.env.CVC_REFERENCE_PROJECT},()=>{
  const b=readFileSync(process.env.CVC_REFERENCE_PROJECT),p=parseProject(b);
  assert.deepEqual(serializeProject(p),b);
  assert.equal(p.root[0].children.length,4);
});
