/**
 * server/static.js — the repo and the vault, as files over HTTP.
 *
 * Split out of server.js when the vault API grew a delete route and the file
 * met the 400-line cap: serving files and owning the vault are two concerns.
 *
 * `/vault/...` resolves inside the vault directory, which --vault may have
 * moved off the repo entirely; everything else comes from the repo root.
 */

const fs   = require('fs');
const path = require('path');

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
  '.webm': 'video/webm',
  '.mp4':  'video/mp4',
  '.ico':  'image/x-icon',
  '.otf':  'font/otf',
  '.ttf':  'font/ttf',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.md':   'text/plain; charset=utf-8',
  '.map':  'application/json; charset=utf-8',
};

function sendText(res, code, msg) {
  const buf = Buffer.from(msg);
  res.writeHead(code, { 'Content-Type': 'text/plain; charset=utf-8', 'Content-Length': buf.length });
  res.end(buf);
}

/**
 * @param {{root: string, vault: string}} dirs
 * @returns {(req, res, urlPath: string) => void}
 */
module.exports = function staticHost({ root, vault }) {
  /**
   * Map a URL path to a file on disk, or null if it escapes. The path is
   * resolved first and re-checked against its base afterwards, so encoded
   * traversal and absolute paths cannot reach outside it.
   */
  function resolveStatic(urlPath) {
    let decoded;
    try { decoded = decodeURIComponent(urlPath); } catch { return null; }
    if (decoded.indexOf('\0') !== -1) return null;
    // [u005c] is a backslash; written as an escape so the source has no literal one.
    const normalised = path.posix.normalize('/' + decoded.replace(/[\u005c]/g, '/'));
    const inVault = normalised === '/vault' || normalised.startsWith('/vault/');
    const base    = inVault ? vault : root;
    const within  = inVault ? (normalised.slice('/vault'.length) || '/') : normalised;

    const full = path.resolve(base, '.' + within);
    const rel  = path.relative(base, full);
    if (rel !== '' && (rel.startsWith('..') || path.isAbsolute(rel))) return null;
    return full;
  }

  return function serveStatic(req, res, urlPath) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return sendText(res, 405, 'GET only');
    let full = resolveStatic(urlPath);
    if (!full) return sendText(res, 400, 'bad path');

    let stat = fs.existsSync(full) ? fs.statSync(full) : null;
    if (stat && stat.isDirectory()) {
      if (!urlPath.endsWith('/')) {
        res.writeHead(301, { Location: urlPath + '/' });
        return res.end();
      }
      full = path.join(full, 'index.html');
      stat = fs.existsSync(full) ? fs.statSync(full) : null;
    }
    if (!stat || !stat.isFile()) return sendText(res, 404, 'not found');

    res.writeHead(200, {
      'Content-Type': MIME[path.extname(full).toLowerCase()] || 'application/octet-stream',
      'Content-Length': stat.size,
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(full).pipe(res);
  };
};
