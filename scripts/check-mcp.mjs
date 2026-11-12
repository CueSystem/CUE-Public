import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(new URL('../plugins/cue-ai/mcp.json', import.meta.url), 'utf8'));

async function check(name, server) {
  let session;
  let protocol = '2025-03-26';
  let id = 0;
  async function rpc(method, params, notification = false) {
    const response = await fetch(server.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
        'MCP-Protocol-Version': protocol,
        ...(session ? { 'Mcp-Session-Id': session } : {})
      },
      body: JSON.stringify({ jsonrpc: '2.0', ...(notification ? {} : { id: ++id }), method, params }),
      signal: AbortSignal.timeout(20000)
    });
    session = response.headers.get('mcp-session-id') || session;
    if (!response.ok) throw new Error(`${method}: HTTP ${response.status}`);
    if (notification) {
      await response.body?.cancel();
      return;
    }
    let message;
    if (response.headers.get('content-type')?.includes('text/event-stream')) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      try {
        while (!message) {
          const { value, done } = await reader.read();
          if (done) throw new Error(`${method}: stream ended before response`);
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
          let end;
          while ((end = buffer.indexOf('\n\n')) !== -1) {
            const event = buffer.slice(0, end);
            buffer = buffer.slice(end + 2);
            const data = event.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).trimStart()).join('\n');
            if (!data) continue;
            const candidate = JSON.parse(data);
            if (candidate.id === id) { message = candidate; break; }
          }
        }
      } finally { await reader.cancel(); }
    } else {
      message = await response.json();
    }
    if (message.id !== id || message.jsonrpc !== '2.0') throw new Error(`${method}: invalid RPC response`);
    if (message.error) throw new Error(`${method}: ${JSON.stringify(message.error)}`);
    if (!message.result) throw new Error(`${method}: missing result`);
    return message.result;
  }
  try {
    const initialized = await rpc('initialize', {
      protocolVersion: protocol, capabilities: {},
      clientInfo: { name: 'cue-ai-plugin-check', version: '1.0.0' }
    });
    protocol = initialized.protocolVersion;
    await rpc('notifications/initialized', {}, true);
    const tools = [];
    let cursor;
    do {
      const page = await rpc('tools/list', cursor ? { cursor } : {});
      if (!Array.isArray(page.tools)) throw new Error('Missing tools array');
      tools.push(...page.tools);
      cursor = page.nextCursor;
    } while (cursor);
    const call = name === 'cvc'
      ? { name: 'get_application_info', arguments: {} }
      : { name: 'search_documentation', arguments: { query: 'CUE Visual Composer', limit: 1 } };
    if (!tools.some(tool => tool.name === call.name)) throw new Error(`Missing expected tool ${call.name}`);
    const result = await rpc('tools/call', call);
    if (result.isError || !Array.isArray(result.content) || !result.content.length) {
      throw new Error(`Tool ${call.name} failed or returned no content`);
    }
    console.log(JSON.stringify({ server: name, url: server.url, serverInfo: initialized.serverInfo,
      protocolVersion: protocol, tools: tools.length, readOnlyCall: call.name, ok: true }));
  } finally {
    if (session) {
      const response = await fetch(server.url, { method: 'DELETE',
        headers: { 'Mcp-Session-Id': session, 'MCP-Protocol-Version': protocol },
        signal: AbortSignal.timeout(5000) });
      await response.body?.cancel();
      if (!response.ok && response.status !== 405) console.error(`${name}: session cleanup HTTP ${response.status}`);
    }
  }
}

const results = await Promise.allSettled(Object.entries(config.mcpServers).map(([name, server]) => check(name, server)));
for (const [index, result] of results.entries()) {
  if (result.status === 'rejected') {
    console.error(`${Object.keys(config.mcpServers)[index]}: ${result.reason.message}`);
    process.exitCode = 1;
  }
}
