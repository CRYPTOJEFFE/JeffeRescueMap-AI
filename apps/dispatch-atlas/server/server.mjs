import http from 'node:http';
import { createRequire } from 'node:module';
import { timingSafeEqual, randomUUID } from 'node:crypto';
import { readFile, writeFile, rename, mkdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const COLLECTIONS = ['incidents', 'feeds', 'calls'];
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
};

function fail(status, message) { const error = new Error(message); error.status = status; return error; }
function validToken(actual, expected) {
  if (!expected || typeof actual !== 'string') return false;
  const a = Buffer.from(actual), b = Buffer.from(`Bearer ${expected}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
function checkShape(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw fail(422, 'Expected a JSON object.');
  if (!COLLECTIONS.some(key => Object.hasOwn(input, key))) throw fail(422, 'Supply incidents, feeds, or calls.');
  for (const key of Object.keys(input)) if (!COLLECTIONS.includes(key)) throw fail(422, `Unknown collection: ${key}`);
  for (const key of COLLECTIONS) {
    if (!Object.hasOwn(input, key)) continue;
    if (!Array.isArray(input[key])) throw fail(422, `${key} must be an array.`);
    if (input[key].length > 5000) throw fail(422, `${key} exceeds 5,000 records.`);
    const ids = new Set();
    for (const item of input[key]) {
      if (!item || typeof item.id !== 'string' || !item.id.trim()) throw fail(422, `${key} records need a nonempty string id.`);
      if (ids.has(item.id)) throw fail(422, `Duplicate id in ${key}: ${item.id}`);
      ids.add(item.id);
    }
  }
}
async function readJSONBody(req) {
  if (!(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) throw fail(415, 'Use Content-Type: application/json.');
  if (Number(req.headers['content-length']) > MAX_BODY_BYTES) throw fail(413, 'Payload exceeds 2 MiB.');
  const chunks = []; let length = 0;
  for await (const chunk of req) {
    length += chunk.length;
    if (length > MAX_BODY_BYTES) throw fail(413, 'Payload exceeds 2 MiB.');
    chunks.push(chunk);
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw fail(400, 'Malformed JSON.'); }
}
function modeFor(data) {
  const records = data.incidents;
  if (!records.length) return 'empty';
  if (records.every(item => item.demo === true || item.verification === 'demo')) return 'demo';
  if (records.some(item => item.demo === true || item.verification === 'demo')) return 'mixed';
  return 'imported';
}

/** Creates but does not listen. No private provider endpoints or network fetches are used. */
export async function createAtlasServer(options = {}) {
  const validateImport = options.validateImport || require('../web/core.js').validateImport;
  if (typeof validateImport !== 'function') throw new Error('web/core.js must export validateImport.');
  const webRoot = await realpath(options.webRoot || path.join(here, '../web'));
  const dataDir = path.resolve(options.dataDir || process.env.ATLAS_DATA_DIR || path.join(here, 'data'));
  const dataPath = path.join(dataDir, 'snapshot.json');
  const ingestToken = options.ingestToken ?? process.env.ATLAS_INGEST_TOKEN ?? '';
  const allowedOrigin = options.allowedOrigin ?? process.env.ATLAS_ALLOWED_ORIGIN ?? '';
  if (allowedOrigin === '*') throw new Error('ATLAS_ALLOWED_ORIGIN must be one explicit origin, not *.');
  let snapshot = { incidents: [], feeds: [], calls: [] };
  let updatedAt = null;
  try {
    const persisted = JSON.parse(await readFile(dataPath, 'utf8'));
    checkShape(persisted.data);
    snapshot = validateImport(persisted.data);
    updatedAt = persisted.updatedAt || null;
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error(`Cannot load saved snapshot; file preserved: ${error.message}`);
  }
  let writeQueue = Promise.resolve();
  const persist = (input, normalized) => {
    const operation = writeQueue.then(async () => {
      const next = {};
      for (const key of COLLECTIONS) {
        const merged = new Map(snapshot[key].map(item => [item.id, item]));
        if (Object.hasOwn(input, key)) for (const item of normalized[key]) merged.set(item.id, item);
        if (merged.size > 5000) throw fail(422, `Stored ${key} would exceed 5,000 records.`);
        next[key] = Array.from(merged.values());
      }
      const nextUpdatedAt = new Date().toISOString();
      await mkdir(dataDir, { recursive: true, mode: 0o700 });
      const temporary = path.join(dataDir, `.snapshot-${randomUUID()}.tmp`);
      await writeFile(temporary, JSON.stringify({ updatedAt: nextUpdatedAt, data: next }), { mode: 0o600 });
      await rename(temporary, dataPath);
      snapshot = next;
      updatedAt = nextUpdatedAt;
      return { updatedAt, counts: Object.fromEntries(COLLECTIONS.map(key => [key, snapshot[key].length])) };
    });
    writeQueue = operation.catch(() => {});
    return operation;
  };
  const server = http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    const send = (status, data, headers = {}) => {
      res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
      res.end(req.method === 'HEAD' ? undefined : JSON.stringify(data));
    };
    try {
      const rawPath = (req.url || '/').split('?')[0];
      let pathname;
      try { pathname = decodeURIComponent(rawPath); }
      catch { throw fail(400, 'Invalid path encoding.'); }
      if (pathname.includes('\0') || pathname.includes('\\') || pathname.split('/').some(part => part === '..' || part.startsWith('.'))) throw fail(400, 'Invalid path.');
      const api = pathname.startsWith('/api/');
      const origin = req.headers.origin;
      const requestOrigin = `http://${req.headers.host}`;
      const sameOrigin = !origin || origin === requestOrigin;
      if (api && origin && !sameOrigin && origin !== allowedOrigin) throw fail(403, 'Origin not permitted.');
      if (api && origin && origin === allowedOrigin) {
        res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
        res.setHeader('Vary', 'Origin');
      }
      if (api && req.method === 'OPTIONS') {
        res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, HEAD, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Cache-Control': 'no-store' });
        return res.end();
      }
      if (pathname === '/api/health' && ['GET', 'HEAD'].includes(req.method)) {
        return send(200, { ok: true, ingestConfigured: Boolean(ingestToken), source: 'authorized-imports', mode: modeFor(snapshot), updatedAt, counts: Object.fromEntries(COLLECTIONS.map(key => [key, snapshot[key].length])) });
      }
      if (['/api/incidents', '/api/export'].includes(pathname) && ['GET', 'HEAD'].includes(req.method)) {
        const headers = { 'X-Atlas-Data-Mode': modeFor(snapshot), ...(updatedAt ? { 'X-Atlas-Updated-At': updatedAt } : {}) };
        if (pathname === '/api/export') headers['Content-Disposition'] = 'attachment; filename="dispatch-atlas-data.json"';
        return send(200, snapshot, headers);
      }
      if (pathname === '/api/ingest' && req.method === 'POST') {
        if (!ingestToken) throw fail(503, 'Ingestion is disabled. Configure ATLAS_INGEST_TOKEN on the server.');
        if (!validToken(req.headers.authorization, ingestToken)) throw fail(401, 'A valid ingest token is required.');
        const input = await readJSONBody(req);
        checkShape(input);
        let normalized;
        try { normalized = validateImport(input); }
        catch (error) { throw fail(422, error.message || 'Data validation failed.'); }
        return send(200, { ok: true, ...await persist(input, normalized) });
      }
      if (api) return send(404, { error: 'Unknown API route or method.' });
      if (!['GET', 'HEAD'].includes(req.method)) return send(405, { error: 'Method not allowed.' }, { Allow: 'GET, HEAD' });
      const requestedPath = path.resolve(webRoot, `.${pathname === '/' ? '/index.html' : pathname}`);
      if (!requestedPath.startsWith(webRoot + path.sep)) throw fail(403, 'Path outside web root.');
      let actualPath;
      try { actualPath = await realpath(requestedPath); }
      catch (error) { if (error.code === 'ENOENT') throw fail(404, 'File not found.'); throw error; }
      if (!actualPath.startsWith(webRoot + path.sep)) throw fail(403, 'Symlink outside web root.');
      if (!(await stat(actualPath)).isFile()) throw fail(404, 'File not found.');
      const bytes = await readFile(actualPath);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(actualPath)] || 'application/octet-stream', 'Content-Length': bytes.length, 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : bytes);
    } catch (error) {
      if (!res.headersSent) send(error.status || 500, { error: error.status ? error.message : 'Server could not complete the request.' });
      else res.end();
    }
  });
  server.requestTimeout = 15000;
  server.headersTimeout = 10000;
  return server;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const host = process.env.ATLAS_HOST || '127.0.0.1';
  const port = Number(process.env.ATLAS_PORT || 8787);
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid ATLAS_PORT.');
  const server = await createAtlasServer();
  server.listen(port, host, () => {
    console.log(`Dispatch Atlas: http://${host}:${server.address().port}`);
    console.log(process.env.ATLAS_INGEST_TOKEN ? 'Authorized import endpoint enabled.' : 'Import endpoint disabled: set ATLAS_INGEST_TOKEN to enable.');
  });
  for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.close(() => process.exit(0)));
}
