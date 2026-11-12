import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = new URL('../', import.meta.url);
const plugin = new URL('plugins/cue-ai/', root);
const json = async url => JSON.parse(await readFile(url, 'utf8'));
const portable = await json(new URL('plugin.json', plugin));
const codex = await json(new URL('.codex-plugin/plugin.json', plugin));
const claude = await json(new URL('.claude-plugin/plugin.json', plugin));
assert.equal(portable.$schema, 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json');
for (const manifest of [portable, codex, claude]) {
  assert.equal(manifest.name, 'cue-ai');
  assert.equal(manifest.version, '1.0.0');
  assert.equal(typeof manifest.description, 'string');
}
assert.ok(portable.extensions['com.openai'].interface.shortDescription.length <= 30);
assert.equal(codex.skills, './skills/');
assert.equal(codex.mcpServers, './.mcp.json');
const mcp = await json(new URL('mcp.json', plugin));
const legacy = await json(new URL('.mcp.json', plugin));
assert.equal(mcp.$schema, 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json');
const endpoints = { cvc: 'http://127.0.0.1:8765/mcp', 'cue-docs': 'https://www.cuesystem.com/docs-mcp' };
assert.deepEqual(Object.keys(mcp.mcpServers).sort(), Object.keys(endpoints).sort());
assert.deepEqual(Object.keys(legacy.mcpServers).sort(), Object.keys(endpoints).sort());
for (const [name, url] of Object.entries(endpoints)) {
  assert.deepEqual(mcp.mcpServers[name], { type: 'streamable-http', url });
  assert.deepEqual(legacy.mcpServers[name], { type: 'http', url });
}
const codexMarket = await json(new URL('.agents/plugins/marketplace.json', root));
const claudeMarket = await json(new URL('.claude-plugin/marketplace.json', root));
assert.equal(codexMarket.name, claudeMarket.name);
assert.equal(codexMarket.plugins[0].source.path, './plugins/cue-ai');
assert.equal(claudeMarket.plugins[0].source, './plugins/cue-ai');
const provenance = await json(new URL('provenance/cvc-project-skills.json', root));
for (const file of provenance.files) {
  assert.ok(file.path.startsWith('skills/') && !file.path.includes('..'));
  const bytes = await readFile(new URL(file.path, plugin));
  assert.equal(bytes.length, file.bytes, file.path);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.sha256, file.path);
}
const skills = [];
for (const entry of await readdir(new URL('skills/', plugin), { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name === 'archive') continue;
  const skillFile = new URL(`skills/${entry.name}/SKILL.md`, plugin);
  const text = await readFile(skillFile, 'utf8');
  assert.ok((await stat(skillFile)).size <= 1024 * 1024);
  assert.ok(text.startsWith('---\n') || text.startsWith('---\r\n'));
  assert.match(text, new RegExp(`^name: ${entry.name}$`, 'm'));
  assert.match(text, /^description: \S.+$/m);
  const references = [...text.matchAll(/\]\((references\/[^)]+)\)/g)].map(match => match[1]);
  for (const reference of references) await stat(new URL(`skills/${entry.name}/${reference}`, plugin));
  skills.push(entry.name);
}
assert.deepEqual(skills, ['cue-visual-composer']);
console.log(JSON.stringify({ ok: true, name: portable.name, version: portable.version,
  skills, preservedSourceFiles: provenance.files.length, mcpServers: Object.keys(endpoints) }, null, 2));
