import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { inflateSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { encodeDriver, crc32 } from './driver.mjs';

test('CRC32 standard vector', () => assert.equal(crc32(Buffer.from('123456789')), 0xcbf43926));
test('Container preserves Unicode source, metadata and lengths', () => {
  const source = 'Global DeviceClass Demo\n// Příliš žluťoučký\nConnector RelayConnector\nEnd DeviceClass\n';
  const b = encodeDriver({ name: 'Demo', source, manufacturer: 'Výrobce' });
  assert.equal(b.readUInt32LE(0), crc32(b.subarray(4)));
  const metadataLength = b.readUInt32LE(21);
  assert.match(b.subarray(25, 25 + metadataLength).toString('utf16le'), /MANUFACTURER:=Výrobce/);
  const offset = 25 + metadataLength + 16;
  const raw = inflateSync(b.subarray(offset + 8, offset + 4 + b.readUInt32LE(offset)));
  assert.equal(raw.length, b.readUInt32LE(offset + 4));
  assert.equal(raw.toString('utf16le'), source);
});
test('Reject path traversal, metadata injection and mismatched class', () => {
  for (const args of [{name:'../bad'}, {name:'CON'}, {name:'Demo',manufacturer:'x\nCT:=TCP'}, {name:'Other'}]) {
    assert.throws(() => encodeDriver({source:'Global DeviceClass Demo\nEnd DeviceClass', ...args}));
  }
});
test('Real MCP process handshake, tool call, errors and no overwrite', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'cvc-mcp-test-'));
  try {
    const source = await readFile(new URL('./examples/RelayDriverMCP.xpl2', import.meta.url), 'utf8');
    const call = {jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'create_relay_driver',arguments:{name:'RelayDriverMCP',source}}};
    const requests = [{jsonrpc:'2.0',id:1,method:'initialize',params:{protocolVersion:'2025-11-25'}},{jsonrpc:'2.0',method:'notifications/initialized'},{jsonrpc:'2.0',id:2,method:'tools/list'},call,{...call,id:4},{jsonrpc:'2.0',id:5,method:'missing'}];
    const r = spawnSync(process.execPath, [fileURLToPath(new URL('./server.mjs', import.meta.url))], {env:{...process.env,CVC_DRIVER_OUTPUT_DIR:dir}, input:requests.map(JSON.stringify).join('\n')+'\n',encoding:'utf8',timeout:10000});
    assert.equal(r.status, 0, r.stderr || r.error?.message);
    const replies = r.stdout.trim().split('\n').map(JSON.parse);
    assert.equal(replies.length,5);
    assert.equal(replies[0].result.protocolVersion,'2025-11-25');
    assert.equal(replies[1].result.tools[0].name,'create_relay_driver');
    const created = JSON.parse(replies[2].result.content[0].text);
    assert.equal(created.importedIntoCvc,false);
    assert.deepEqual(await readFile(created.path),encodeDriver({name:'RelayDriverMCP',source}));
    assert.equal(replies[3].result.isError,true);
    assert.equal(replies[4].error.code,-32601);
  } finally { await rm(dir,{recursive:true,force:true}); }
});
