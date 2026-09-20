#!/usr/bin/env node
/**
 * scripts/dev-server.js
 *
 * Serves gamepad/ and accepts the writes the in-app gallery needs to publish
 * an image into gallery/images/. Replaces `npx serve` during development:
 *
 *   node scripts/dev-server.js [--port 3000] [--host 127.0.0.1]
 *
 *   GET  /api/gallery   -> { count, images: [{ file, sha256 }] }
 *   POST /api/gallery   <- { filename, sha256, data }   data = base64 PNG
 *                       -> { status: 'added' | 'duplicate', file, count }
 *
 * An image's identity is the SHA-256 of its bytes, so publishing the same
 * drawing twice is a no-op however it is named. Node stdlib only.
 *
 * Binds to localhost by default: it writes files, so it has no business being
 * reachable from the network.
 */

const http   = require('http');
const fs     = require('fs');
const path   = require('path');
const crypto = require('crypto');

const { buildManifest, listImages, IMAGES_DIR, IMAGE_EXTS } = require('./generate-gallery.js');

const ROOT       = path.join(__dirname, '..', 'gamepad');
const MAX_UPLOAD = 32 * 1024 * 1024;
const PNG_MAGIC  = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif':  'image/gif',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf':  'font/ttf',
  '.otf':  'font/otf',
  '.txt':  'text/plain; charset=utf-8',
  '.md':   'text/plain; charset=utf-8',
  '.map':  'application/json; charset=utf-8',
};

// -- CLI args ----------------------------------------------------------------

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
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

function sendText(res, code, msg) {
  const buf = Buffer.from(msg);
  res.writeHead(code, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': buf.length,
  });
  res.end(buf);
}

/**
 * Map a URL path to a file inside ROOT, or null if it escapes ROOT.
 * The path is resolved first and re-checked against ROOT afterwards, so
 * encoded traversal and absolute paths cannot reach outside the served tree.
 */
function resolveStatic(urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  if (decoded.indexOf('\0') !== -1) return null;

  const normalised = path.posix.normalize('/' + decoded.replace(/\\/g, '/'));
  const full = path.resolve(ROOT, '.' + normalised);
  const rel  = path.relative(ROOT, full);
  if (rel !== '' && (rel.startsWith('..') || path.isAbsolute(rel))) return null;
  return full;
}

/** Strip an upload filename down to a safe basename, always image-extensioned. */
function safeFilename(name) {
  const raw  = String(name == null ? '' : name);
  const base = path.basename(raw).replace(/[^A-Za-z0-9._()-]/g, '-');
  const ext  = path.extname(base).toLowerCase();
  if (!base || base.charAt(0) === '.') return null;
  if (!IMAGE_EXTS.has(ext)) return null;
  return base;
}

/** First free name of the form stem.ext, stem-2.ext, stem-3.ext, ... */
function uniqueFilename(name) {
  const ext  = path.extname(name);
  const stem = path.basename(name, ext);
  let candidate = name;
  for (let n = 2; fs.existsSync(path.join(IMAGES_DIR, candidate)); n++) {
    candidate = stem + '-' + n + ext;
  }
  return candidate;
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

// -- API ---------------------------------------------------------------------

function apiList(res) {
  const images = listImages();
  sendJson(res, 200, { count: images.length, images });
}

async function apiPublish(req, res) {
  let payload;
  try {
    payload = JSON.parse((await readBody(req, MAX_UPLOAD)).toString('utf8'));
  } catch (err) {
    return sendJson(res, err.code === 413 ? 413 : 400, { error: err.message });
  }

  const filename = safeFilename(payload.filename);
  if (!filename) return sendJson(res, 400, { error: 'bad or non-image filename' });

  const base64 = String(payload.data == null ? '' : payload.data).replace(/^data:[^,]*,/, '');
  const bytes  = Buffer.from(base64, 'base64');

  if (!bytes.length) return sendJson(res, 400, { error: 'empty image' });
  if (!bytes.subarray(0, 8).equals(PNG_MAGIC)) {
    return sendJson(res, 400, { error: 'not a PNG' });
  }

  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  if (payload.sha256 && payload.sha256 !== sha256) {
    return sendJson(res, 400, { error: 'sha256 does not match the uploaded bytes' });
  }

  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const existing = listImages().find(i => i.sha256 === sha256);
  if (existing) {
    return sendJson(res, 200, { status: 'duplicate', file: existing.file, sha256 });
  }

  const target = uniqueFilename(filename);
  fs.writeFileSync(path.join(IMAGES_DIR, target), bytes);
  const manifest = buildManifest();

  console.log('  + published ' + target + ' (' + bytes.length + ' bytes) - ' + manifest.count + ' in gallery');
  return sendJson(res, 201, { status: 'added', file: target, sha256, count: manifest.count });
}

// -- Static ------------------------------------------------------------------

function serveStatic(req, res, urlPath) {
  const full = resolveStatic(urlPath);
  if (!full) return sendText(res, 403, 'Forbidden');

  let stat = null;
  try {
    stat = fs.statSync(full);
  } catch {
    stat = null;
  }

  if (stat && stat.isDirectory()) {
    // Redirect to the trailing-slash form so document-relative URLs inside the
    // page resolve against the directory and not against its parent.
    if (!urlPath.endsWith('/')) {
      res.writeHead(301, { Location: urlPath + '/' });
      return res.end();
    }
    return serveFile(res, path.join(full, 'index.html'));
  }
  return serveFile(res, full);
}

function serveFile(res, file) {
  let stat;
  try {
    stat = fs.statSync(file);
    if (!stat.isFile()) throw new Error('not a file');
  } catch {
    return sendText(res, 404, 'Not found');
  }

  const ext = path.extname(file).toLowerCase();
  const headers = {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
  };
  // The app re-reads these after publishing, so they must never come from cache.
  if (ext === '.json') headers['Cache-Control'] = 'no-store';

  res.writeHead(200, headers);
  fs.createReadStream(file).pipe(res);
}

// -- Server ------------------------------------------------------------------

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  if (urlPath === '/api/gallery') {
    if (req.method === 'GET') return apiList(res);
    if (req.method === 'POST') {
      return apiPublish(req, res).catch(err => {
        console.error('publish failed:', err);
        sendJson(res, 500, { error: err.message });
      });
    }
    res.writeHead(405, { Allow: 'GET, POST' });
    return res.end();
  }

  if (req.method !== 'GET') return sendText(res, 405, 'Method not allowed');
  return serveStatic(req, res, urlPath);
});

server.listen(PORT, HOST, () => {
  console.log('GamepadDraw dev server');
  console.log('  serving  ' + ROOT);
  console.log('  gallery  ' + IMAGES_DIR);
  console.log('  http://' + HOST + ':' + PORT + '/');
});
