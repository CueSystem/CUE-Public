import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { encodeProject, inspectMinimalProject } from './project.mjs';

test('Fresh project contains exactly one relay driver and preserves its complete source', async () => {
  const source = (await readFile(new URL('./examples/RelayDriverMCP.xpl2', import.meta.url), 'utf8')).replace('DeviceClass RelayDriverMCP', 'DeviceClass RelayDriver');
  const bytes = encodeProject({name:'RelayDriver',source});
  const project = inspectMinimalProject(bytes);
  assert.deepEqual(project.resources.map(r => [r.name,r.type,r.id]), [['MyCommon',2,1],['RelayDriver',3,2]]);
  assert.equal(project.resources[1].source,source);
  assert.match(project.resources[1].metadata,/CT:=Relay\r\n/);
  assert.doesNotMatch(project.configuration,/RelayDriverMCP/);
  assert.match(project.configuration,/#CONTROLLERS\n#DEVICES\n/);
  const damaged = Buffer.from(bytes); damaged[40] ^= 1;
  assert.throws(() => inspectMinimalProject(damaged), /CRC/);
});
