import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { createAtlasServer } from '../server/server.mjs';

const fixture = (id = 'test-incident') => ({
  id, typeId: 'structure-working', title: 'Training fire scenario', category: 'fire',
  emoji: '🔥', agency: 'Training agency', area: 'Training area', address: 'Fictional training block',
  crossStreets: 'Training lane / Exercise road', lat: 40.73, lon: -74.17,
  priority: 'high', status: 'open', reportedAt: '2026-11-19T20:00:00Z', units: ['Training Engine'],
  transcript: 'Training exercise only.', trigger: 'exercise', source: 'Local test fixture',
  verification: 'demo', demo: true, pois: [],
});

async function start(t, options = {}) {
  const root = await mkdtemp(path.join(tmpdir(), 'atlas-server-test-'));
  const webRoot = path.join(root, 'web'), dataDir = path.join(root, 'data');
  await mkdir(webRoot);
  await writeFile(path.join(webRoot, 'index.html'), '<!doctype html><title>Test</title>');
  await writeFile(path.join(root, 'private.txt'), 'DO NOT SERVE');
  await symlink(path.join(root, 'private.txt'), path.join(webRoot, 'escape.txt'));
  const server = await createAtlasServer({ webRoot, dataDir, ingestToken: 'test-token-123', ...options });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => { await new Promise(resolve => server.close(resolve)); await rm(root, { recursive: true, force: true }); });
  const ingest = (body, extras = {}) => fetch(`${base}/api/ingest`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-token-123', ...extras }, body: JSON.stringify(body) });
  return { root, webRoot, dataDir, server, base, ingest };
}

test('initial snapshot is empty, health is truthful, and static root is served', async t => {
  const { base } = await start(t);
  const data = await fetch(`${base}/api/incidents`);
  assert.equal(data.headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
  assert.equal(data.headers.get('X-Atlas-Data-Mode'), 'empty');
  assert.deepEqual(await data.json(), { incidents: [], feeds: [], calls: [] });
  const health = await (await fetch(`${base}/api/health`)).json();
  assert.equal(health.ingestConfigured, true);
  assert.equal(health.updatedAt, null);
  assert.equal(health.source, 'authorized-imports');
  assert.match(await (await fetch(base)).text(), /<title>Test/);
});

test('unauthorized writes never mutate data', async t => {
  const { base, dataDir } = await start(t);
  const response = await fetch(`${base}/api/ingest`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer wrong' }, body: JSON.stringify({ incidents: [fixture()] }) });
  assert.equal(response.status, 401);
  assert.deepEqual((await (await fetch(`${base}/api/incidents`)).json()).incidents, []);
  await assert.rejects(readFile(path.join(dataDir, 'snapshot.json')), { code: 'ENOENT' });
});

test('authorized imports merge by id, preserve omitted arrays, and persist atomically', async t => {
  const { base, ingest, dataDir } = await start(t);
  assert.equal((await ingest({ incidents: [fixture()], feeds: [{ id: 'feed-1', name: 'Test feed', streamUrl: null }] })).status, 200);
  const updated = { ...fixture(), title: 'Updated training scenario' };
  assert.equal((await ingest({ incidents: [updated] })).status, 200);
  const response = await fetch(`${base}/api/incidents`);
  const data = await response.json();
  assert.equal(data.incidents.length, 1);
  assert.equal(data.incidents[0].title, updated.title);
  assert.equal(data.feeds.length, 1);
  assert.equal(response.headers.get('X-Atlas-Data-Mode'), 'demo');
  assert.ok(response.headers.get('X-Atlas-Updated-At'));
  const persisted = JSON.parse(await readFile(path.join(dataDir, 'snapshot.json'), 'utf8'));
  assert.deepEqual(persisted.data, data);
  const exported = await fetch(`${base}/api/export`);
  assert.match(exported.headers.get('Content-Disposition'), /attachment/);
  assert.deepEqual(await exported.json(), data);
});

test('validation rejects out-of-range coordinates, duplicate IDs, and invalid URLs without mutation', async t => {
  const { base, ingest } = await start(t);
  assert.equal((await ingest({ incidents: [{ ...fixture(), lat: 100 }] })).status, 422);
  assert.equal((await ingest({ incidents: [fixture(), fixture()] })).status, 422);
  assert.equal((await ingest({ feeds: [{ id: 'x', name: 'Unsafe feed', streamUrl: 'javascript:alert(1)' }] })).status, 422);
  assert.equal((await ingest({ unknown: [] })).status, 422);
  assert.deepEqual((await (await fetch(`${base}/api/incidents`)).json()).incidents, []);
});

test('concurrent imports do not lose records', async t => {
  const { base, ingest } = await start(t);
  const results = await Promise.all(Array.from({ length: 8 }, (_, index) => ingest({ incidents: [fixture(`fixture-${index}`)] })));
  assert.ok(results.every(result => result.status === 200));
  assert.equal((await (await fetch(`${base}/api/incidents`)).json()).incidents.length, 8);
});

test('external origins, malformed JSON, oversized data and disabled ingestion are rejected', async t => {
  const { base, ingest } = await start(t);
  assert.equal((await ingest({ incidents: [] }, { Origin: 'https://attacker.example' })).status, 403);
  assert.equal((await fetch(`${base}/api/ingest`, { method: 'POST', headers: { Authorization: 'Bearer test-token-123', 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  assert.equal((await fetch(`${base}/api/ingest`, { method: 'POST', headers: { Authorization: 'Bearer test-token-123', 'Content-Type': 'application/json' }, body: JSON.stringify({ padding: 'a'.repeat(2 * 1024 * 1024) }) })).status, 413);
  const disabled = await start(t, { ingestToken: '' });
  assert.equal((await disabled.ingest({ incidents: [] })).status, 503);
});

test('explicit CORS origin works and wildcard configuration is rejected', async t => {
  const { base } = await start(t, { allowedOrigin: 'https://atlas.example' });
  const response = await fetch(`${base}/api/incidents`, { headers: { Origin: 'https://atlas.example' } });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'https://atlas.example');
  await assert.rejects(createAtlasServer({ allowedOrigin: '*' }), /explicit origin/);
});

test('encoded traversal, dotfiles and symlink escapes cannot expose files', async t => {
  const { base } = await start(t);
  const rawGet = urlPath => new Promise((resolve, reject) => {
    http.get(`${base}${urlPath}`, response => { let body = ''; response.on('data', chunk => body += chunk); response.on('end', () => resolve({ status: response.statusCode, body })); }).on('error', reject);
  });
  for (const attempt of ['/%2e%2e%2fprivate.txt', '/.env', '/escape.txt', '/%00']) {
    const result = await rawGet(attempt);
    assert.ok([400, 403, 404].includes(result.status), `${attempt} returned ${result.status}`);
    assert.ok(!result.body.includes('DO NOT SERVE'));
  }
});

test('saved snapshot reloads and corrupted snapshots fail closed', async t => {
  const { ingest, dataDir, webRoot } = await start(t);
  assert.equal((await ingest({ incidents: [fixture()] })).status, 200);
  const restored = await createAtlasServer({ webRoot, dataDir, ingestToken: '' });
  await new Promise(resolve => restored.listen(0, '127.0.0.1', resolve));
  const data = await (await fetch(`http://127.0.0.1:${restored.address().port}/api/incidents`)).json();
  assert.equal(data.incidents.length, 1);
  await new Promise(resolve => restored.close(resolve));
  await writeFile(path.join(dataDir, 'snapshot.json'), '{invalid');
  await assert.rejects(createAtlasServer({ webRoot, dataDir }), /file preserved/);
  assert.equal(await readFile(path.join(dataDir, 'snapshot.json'), 'utf8'), '{invalid');
});
