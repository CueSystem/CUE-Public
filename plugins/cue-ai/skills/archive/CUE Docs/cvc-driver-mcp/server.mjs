import { createDriver } from './driver.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const outputDir = path.resolve(process.env.CVC_DRIVER_OUTPUT_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), 'generated'));
const versions = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const tool = { name: 'create_relay_driver', description: 'Create an importable CUE Visual Composer .cvcd relay driver from prepared XPL2 source. Does not modify an open project, compile, or control hardware. Existing files are never overwritten. Experimental format verified with the locally installed CVC.',
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  inputSchema: { type: 'object', properties: { name: { type: 'string', description: 'DeviceClass name and output filename, e.g. RelayDriverMCP' }, source: { type: 'string', description: 'Complete XPL2 source including Global DeviceClass matching name' }, manufacturer: { type: 'string', default: 'Custom' } }, required: ['name', 'source'], additionalProperties: false } };
const send = value => process.stdout.write(JSON.stringify(value) + '\n');
async function handle(message) {
  if (!message || message.jsonrpc !== '2.0' || typeof message.method !== 'string') { send({ jsonrpc: '2.0', id: message?.id ?? null, error: { code: -32600, message: 'Invalid Request' } }); return; }
  if (message.id === undefined) return;
  const reply = result => send({ jsonrpc: '2.0', id: message.id, result });
  const error = (code, text) => send({ jsonrpc: '2.0', id: message.id, error: { code, message: text } });
  switch (message.method) {
    case 'initialize': return reply({ protocolVersion: versions.includes(message.params?.protocolVersion) ? message.params.protocolVersion : versions[0], capabilities: { tools: {} }, serverInfo: { name: 'cvc-driver-mcp', version: '0.1.0' } });
    case 'ping': return reply({});
    case 'tools/list': return reply({ tools: [tool] });
    case 'tools/call': {
      if (message.params?.name !== tool.name) return error(-32602, 'Unknown tool');
      try {
        const args = message.params.arguments;
        if (!args || typeof args !== 'object' || Array.isArray(args) || Object.keys(args).some(key => !['name', 'source', 'manufacturer'].includes(key))) throw new Error('Invalid arguments');
        return reply({ content: [{ type: 'text', text: JSON.stringify(await createDriver(args, outputDir)) }] });
      } catch (e) { return reply({ isError: true, content: [{ type: 'text', text: e.message }] }); }
    }
    default: return error(-32601, 'Method not found');
  }
}
let pending = Buffer.alloc(0);
let queue = Promise.resolve();
process.stdin.on('data', chunk => {
  pending = Buffer.concat([pending, chunk]);
  let newline;
  while ((newline = pending.indexOf(10)) >= 0) {
    const line = pending.subarray(0, newline); pending = pending.subarray(newline + 1);
    if (line.length > 8 * 1024 * 1024) { process.stderr.write('MCP message too large\n'); process.exit(1); }
    queue = queue.then(async () => {
      let parsed;
      try { parsed = JSON.parse(line.toString('utf8')); }
      catch { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }); return; }
      await handle(parsed);
    }).catch(e => process.stderr.write(e.message + '\n'));
  }
  if (pending.length > 8 * 1024 * 1024) { process.stderr.write('MCP message too large\n'); process.exit(1); }
});
