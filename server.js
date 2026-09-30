#!/usr/bin/env node
/**
 * server.js — serves skweeb and owns the vault on disk.
 *
 *   node server.js [--port 3000] [--host 127.0.0.1] [--vault ./vault]
 *
 * Static files come from the repo root, so an app lives at /apps/<name>/ and
 * reaches the shared kit at /core/ and its own objects at /vault/.
 *
 *   GET  /api/vault           -> { count, objects: [ row, ... ] }
 *   GET  /api/vault/<id>      -> the envelope
 *   POST /api/vault           <- envelope + base64 render (+ thumb)
 *                             -> { status: 'created' | 'duplicate', object }
 *   PATCH /api/vault/<id>     <- { add: [tag], remove: [tag] }
 *                             -> { status: 'updated', object }
 *   POST /api/vault/delete    <- { ids, dependents? }   — server/delete.js
 *   GET  /api/vault/events    -> a stream: `changed` each time the index is rewritten — server/events.js
 *
 * Files are served by server/static.js; this file owns the vault.
 *
 * The server writes files and computes hashes. It does not make thumbnails:
 * the browser already has the pixels and a canvas to downscale them with, so
 * `core/thumb.js` sends one along. That keeps this file dependency-free.
 *
 * Binds to localhost by default: it writes files, so it has no business being
 * reachable from the network.
 */

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');
const staticHost  = require('./server/static.js');
const deleteRoute = require('./server/delete.js');
const vaultEvents = require('./server/events.js')();

const argv  = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const ROOT        = __dirname;
// --vault moves the objects off the repo, which is what lets tests/vault.mjs
// run against a disposable one instead of yours. /vault/ URLs follow it, so an
// app reads its renders and thumbs from wherever the vault actually is.
const VAULT_DIR   = path.resolve(argOf('--vault', path.join(ROOT, 'vault')));
const OBJECTS_DIR = path.join(VAULT_DIR, 'objects');
const INDEX_FILE  = path.join(VAULT_DIR, 'index.json');
const MAX_UPLOAD  = 64 * 1024 * 1024;

/** Render/thumb extensions the vault will write, with their magic bytes. */
const MAGIC = {
  '.png':  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  '.webp': Buffer.from('RIFF'),
  '.webm': Buffer.from([0x1a, 0x45, 0xdf, 0xa3]),
  '.jpg':  Buffer.from([0xff, 0xd8, 0xff]),
  '.json': null,
};

const PORT = Number(argOf('--port', process.env.PORT || 3000));
const HOST = argOf('--host', '127.0.0.1');

// -- Helpers -----------------------------------------------------------------

function sendJson(res, code, body) {
  const buf = Buffer.from(JSON.stringify(body));
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': buf.length,
    'Cache-Control': 'no-store',
  });
  res.end(buf);
}

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > limit) {
        const err = new Error('payload too large');
        err.code = 413;
        reject(err);
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// -- The vault ---------------------------------------------------------------

/** `<app3>_<ms>_<rand6>` — guessable and greppable, per docs/object-model.md. */
function newId(app) {
  const tag = String(app || 'obj').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 3) || 'obj';
  return tag + '_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
}

/** An id is only ever one folder name. Nothing else may reach the filesystem. */
function safeId(id) {
  return /^[a-z0-9]{1,8}_[0-9]{9,16}_[a-z0-9]{4,12}$/.test(String(id)) ? String(id) : null;
}

function readEnvelope(id) {
  try {
    return JSON.parse(fs.readFileSync(path.join(OBJECTS_DIR, id, 'object.json'), 'utf8'));
  } catch {
    return null;
  }
}

/** Every envelope on disk, newest first. */
function allObjects() {
  if (!fs.existsSync(OBJECTS_DIR)) return [];
  return fs.readdirSync(OBJECTS_DIR)
    .map(readEnvelope)
    .filter(Boolean)
    .sort((a, b) => String(b.created).localeCompare(String(a.created)));
}

/**
 * The gallery reads index.json and never opens an object folder, so this is
 * the row it gets: enough to draw a card and filter on, and no recipe.
 */
function indexRow(o) {
  return {
    id: o.id, type: o.type, title: o.title, tags: o.tags, created: o.created,
    origin: o.origin, thumb: o.thumb, render: o.render && {
      file: o.render.file, w: o.render.w, h: o.render.h,
      frames: o.render.frames, bytes: o.render.bytes, sha256: o.render.sha256,
    },
    parents: o.parents, refs: o.refs, published: o.published,
    // What a set was made as — null for none — so a picker can tell a material
    // from a brush family without opening every folder (core/uses.js).
    ...(o.type === 'set' ? { role: o.recipe && typeof o.recipe.role === 'string' ? o.recipe.role : null } : {}),
  };
}

function rebuildIndex() {
  const objects = allObjects().map(indexRow);
  fs.mkdirSync(VAULT_DIR, { recursive: true });
  fs.writeFileSync(INDEX_FILE,
    JSON.stringify({ generated: new Date().toISOString(), count: objects.length, objects }, null, 1));
  vaultEvents.notify(objects.length);
  return objects;
}

/** Decode a base64 payload and check it is the kind of file it claims to be. */
function decodeAsset(asset, what) {
  if (!asset || typeof asset !== 'object') return { error: what + ' missing' };
  const ext = '.' + String(asset.ext || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!(ext in MAGIC)) return { error: what + ': unsupported extension ' + ext };
  const b64 = String(asset.data == null ? '' : asset.data).replace(/^data:[^,]*,/, '');
  const bytes = Buffer.from(b64, 'base64');
  if (!bytes.length) return { error: what + ' is empty' };
  const magic = MAGIC[ext];
  if (magic && !bytes.subarray(0, magic.length).equals(magic)) {
    return { error: what + ' is not a ' + ext.slice(1) };
  }
  return { ext, bytes };
}

/** Stable enough to compare two recipes for equality. */
function stableStringify(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + value.map(stableStringify).join(',') + ']';
  return '{' + Object.keys(value).sort()
    .map(k => JSON.stringify(k) + ':' + stableStringify(value[k])).join(',') + '}';
}

// -- API ---------------------------------------------------------------------

function apiList(res) {
  const objects = fs.existsSync(INDEX_FILE)
    ? JSON.parse(fs.readFileSync(INDEX_FILE, 'utf8')).objects
    : rebuildIndex();
  sendJson(res, 200, { count: objects.length, objects });
}

function apiGet(res, id) {
  const safe = safeId(id);
  const envelope = safe && readEnvelope(safe);
  if (!envelope) return sendJson(res, 404, { error: 'no such object' });
  sendJson(res, 200, envelope);
}

async function apiCreate(req, res) {
  let payload;
  try {
    payload = JSON.parse((await readBody(req, MAX_UPLOAD)).toString('utf8'));
  } catch (err) {
    return sendJson(res, err.code === 413 ? 413 : 400, { error: err.message });
  }

  if (!payload.type) return sendJson(res, 400, { error: 'type is required' });

  const render = decodeAsset(payload.render, 'render');
  if (render.error) return sendJson(res, 400, { error: render.error });

  let thumb = null;
  if (payload.thumb) {
    thumb = decodeAsset(payload.thumb, 'thumb');
    if (thumb.error) return sendJson(res, 400, { error: thumb.error });
  }

  const sha256 = crypto.createHash('sha256').update(render.bytes).digest('hex');
  const recipeKey = stableStringify(payload.recipe === undefined ? null : payload.recipe);

  // Same bytes AND same recipe is the same object. Same bytes with a different
  // recipe is not — see "Identity and dedup" in docs/object-model.md.
  const twin = allObjects().find(o =>
    o.render && o.render.sha256 === sha256 &&
    stableStringify(o.recipe === undefined ? null : o.recipe) === recipeKey);
  if (twin) return sendJson(res, 200, { status: 'duplicate', object: twin });

  const app = (payload.origin && payload.origin.app) || 'obj';
  const id  = newId(app);
  const dir = path.join(OBJECTS_DIR, id);
  fs.mkdirSync(dir, { recursive: true });

  const renderFile = 'render' + render.ext;
  fs.writeFileSync(path.join(dir, renderFile), render.bytes);
  if (thumb) fs.writeFileSync(path.join(dir, 'thumb' + thumb.ext), thumb.bytes);

  const r = payload.render;
  const envelope = {
    id,
    type:    String(payload.type),
    title:   payload.title == null ? '' : String(payload.title),
    note:    payload.note  == null ? '' : String(payload.note),
    tags:    Array.isArray(payload.tags) ? payload.tags.map(String) : [],
    created: new Date().toISOString(),
    origin:  payload.origin || { app: 'unknown', version: '0' },
    recipe:  payload.recipe === undefined ? null : payload.recipe,
    seed:    payload.seed === undefined ? null : payload.seed,
    parents: Array.isArray(payload.parents) ? payload.parents.map(String) : [],
    refs:    Array.isArray(payload.refs) ? payload.refs.map(String) : [],
    render: {
      file: renderFile,
      w: r.w || null, h: r.h || null, density: r.density || 1,
      frames: r.frames || null, fps: r.fps || null, loop: !!r.loop,
      bytes: render.bytes.length, sha256,
    },
    thumb: thumb ? 'thumb' + thumb.ext : null,
    published: false,
  };

  fs.writeFileSync(path.join(dir, 'object.json'), JSON.stringify(envelope, null, 1));
  rebuildIndex();
  sendJson(res, 201, { status: 'created', object: envelope });
}

/**
 * Tags are the one part of an object that changes after it is saved — the
 * render, the recipe and the lineage never do (docs/object-model.md, *Tags
 * change*). An edit rather than a replacement, so two machines on one vault
 * can each add a tag without the second erasing the first.
 */
async function apiRetag(req, res, id) {
  const safe = safeId(id);
  const envelope = safe && readEnvelope(safe);
  if (!envelope) return sendJson(res, 404, { error: 'no such object' });

  let body;
  try {
    body = JSON.parse((await readBody(req, 64 * 1024)).toString('utf8'));
  } catch (err) {
    return sendJson(res, err.code === 413 ? 413 : 400, { error: err.message });
  }
  const list = v => v === undefined ? []
    : Array.isArray(v) && v.every(t => typeof t === 'string' && t && t.length <= 80) ? v : null;
  const keys = Object.keys(body && typeof body === 'object' ? body : {});
  const add = list(body && body.add), remove = list(body && body.remove);
  if (!keys.length || keys.some(k => k !== 'add' && k !== 'remove') || !add || !remove) {
    return sendJson(res, 400, { error: 'only tags change: { add: [tag], remove: [tag] }' });
  }

  const tags = (envelope.tags || []).filter(t => !remove.includes(t));
  for (const t of add) if (!tags.includes(t)) tags.push(t);
  if (tags.length > 64) return sendJson(res, 400, { error: 'too many tags' });
  envelope.tags = tags;

  // Written aside and moved into place: a crash mid-write must not leave an
  // object.json that no longer parses.
  const file = path.join(OBJECTS_DIR, safe, 'object.json');
  fs.writeFileSync(file + '.tmp', JSON.stringify(envelope, null, 1));
  fs.renameSync(file + '.tmp', file);
  rebuildIndex();
  sendJson(res, 200, { status: 'updated', object: envelope });
}

const apiDelete   = deleteRoute({ objectsDir: OBJECTS_DIR, allObjects, rebuildIndex, safeId, readBody, sendJson });
const serveStatic = staticHost({ root: ROOT, vault: VAULT_DIR });

// -- Routing -----------------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split('?')[0];
  try {
    if (urlPath === '/api/vault') {
      if (req.method === 'GET')  return apiList(res);
      if (req.method === 'POST') return await apiCreate(req, res);
      return sendJson(res, 405, { error: 'GET or POST' });
    }
    if (urlPath === '/api/vault/events') {
      if (req.method === 'GET') return vaultEvents.handle(req, res);
      return sendJson(res, 405, { error: 'GET' });
    }
    if (urlPath === '/api/vault/delete') {
      if (req.method === 'POST') return await apiDelete(req, res);
      return sendJson(res, 405, { error: 'POST' });
    }
    if (urlPath.startsWith('/api/vault/')) {
      const id = urlPath.slice('/api/vault/'.length);
      if (req.method === 'GET')   return apiGet(res, id);
      if (req.method === 'PATCH') return await apiRetag(req, res, id);
      return sendJson(res, 405, { error: 'GET or PATCH' });
    }
    if (urlPath.startsWith('/api/')) return sendJson(res, 404, { error: 'no such endpoint' });
    serveStatic(req, res, urlPath);
  } catch (err) {
    console.error(err);
    sendJson(res, 500, { error: String(err && err.message || err) });
  }
});

fs.mkdirSync(OBJECTS_DIR, { recursive: true });
rebuildIndex();
server.listen(PORT, HOST, () => {
  console.log('skweeb');
  console.log('  serving  ' + ROOT);
  console.log('  vault    ' + VAULT_DIR);
  console.log('  http://' + HOST + ':' + PORT + '/apps/gamepad/');
});
