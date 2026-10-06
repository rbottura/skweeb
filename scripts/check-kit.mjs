/**
 * scripts/check-kit.mjs — what a browser check stands on.
 *
 * A server on a copy of ./vault in the OS temp folder, so a check may save and
 * nothing reaches yours; the repo again as plain files, for rule 7's "no
 * vault at all"; headless Chrome (chrome.mjs); and a way to say ok. The
 * console is heard page by page — goto() starts a fresh log — so `go()` keeps
 * what each page said before the next one opens, and `quiet()` is every page
 * so far. Screenshots stay in the temp folder, printed at the end; `keep`
 * leaves the vault copy and the profile there too.
 */

import { spawn }  from 'node:child_process';
import http       from 'node:http';
import net        from 'node:net';
import fs         from 'node:fs';
import os         from 'node:os';
import path       from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp' };

const freePort = () => new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
});

/** The repo as a plain static host: no API, no vault. */
function plainHost() {
  return http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.startsWith('/api/') || p.startsWith('/vault/')) { res.writeHead(404); return res.end(); }
    if (p.endsWith('/')) p += 'index.html';
    fs.readFile(path.join(ROOT, p), (err, body) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
      res.end(body);
    });
  });
}

/**
 * @param {object} [opts]
 * @param {boolean} [opts.keep]   leave the vault copy and the profile behind
 */
export async function startCheck({ keep = false } = {}) {
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'skweeb-check-'));
  const shots = path.join(work, 'shots');
  const vaultDir = path.join(work, 'vault');
  if (fs.existsSync(path.join(ROOT, 'vault'))) fs.cpSync(path.join(ROOT, 'vault'), vaultDir, { recursive: true });
  else fs.mkdirSync(vaultDir);

  const port = await freePort();
  const base = 'http://127.0.0.1:' + port;
  const server = spawn(process.execPath, [path.join(ROOT, 'server.js'), '--port', String(port), '--vault', vaultDir],
    { stdio: 'ignore' });
  const plain = plainHost();
  const plainPort = await freePort();
  await new Promise(r => plain.listen(plainPort, '127.0.0.1', r));
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(base + '/api/vault')).ok) break; } catch { /* not up yet */ }
    await new Promise(r => setTimeout(r, 100));
  }
  const { page, open, find, close, kill } = await launch({ port: await freePort(), profile: path.join(work, 'profile') });

  // A check that throws, or is stopped, never reaches finish(): the server and
  // Chrome go with it, rather than living on in the background for days.
  process.once('exit', () => { server.kill(); kill(); });
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => process.exit(1));

  let fails = 0;
  const noise = [];
  const tabs = [page];                 // the first, and every other a check opens or finds
  const listen = () => { for (const t of tabs) noise.push(...t.errors().filter(e => !(e.url || e.text).includes('favicon.ico'))); };

  return {
    page,
    base,
    plain: 'http://127.0.0.1:' + plainPort,
    vaultDir,
    /** A folder of the check's own, in the temp folder: downloads, say. */
    dir: work,

    ok(label, pass, detail = '') {
      if (!pass) fails++;
      console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(58) + (detail ? ' ' + detail : ''));
    },

    async go(url, opts) { listen(); await page.goto(url, opts); },

    /** Another window of the suite in this browser, at `url`: what one tab sends, another hears. */
    async tab(url, opts) {
      const t = await open();
      tabs.push(t);
      if (url) await t.goto(url, opts);
      return t;
    },

    /** A window a page opened itself, found by a test of its address. */
    async found(test, opts) {
      const t = await find(test, opts);
      tabs.push(t);
      return t;
    },

    /** What every page so far said that it should not have, a missing favicon aside. */
    quiet() { listen(); return noise.splice(0); },

    shot(name) { return page.screenshot(path.join(shots, name + '.png')); },

    /**
     * An object printed in tiles (core/print.js) against the same object
     * drawn whole at the same scale: how far apart, and whether its app drew
     * the windows itself (`enlarged` 1) or was enlarged from a whole picture.
     * A vault id, or an envelope made in the page by `make` — an expression
     * that comes to one. `seams`: how many of the values off lie on a tile's
     * edge, against the share of the picture those edges are — a seam is
     * many times its share, a rasterizer's edges about their share.
     */
    printMatch(id, { scale = 2, tile = 256, tick = 0, make = null } = {}) {
      return page.eval(`(async () => {
        const { Vault } = await import('/core/vault.js');
        const { openFrames } = await import('/core/rebuild.js');
        const { printObject } = await import('/core/print.js');
        const { object, url } = ${make ? `{ object: await (${make}), url: undefined }` : `await Vault.load(${JSON.stringify(id)})`};
        const whole = await openFrames(object, { url, scale: ${scale} });
        // Kept at once: a frame is borrowed, and the print's own runs may take it back (a GPU runner's bitmap).
        const lent = whole.frame(${tick});
        const frame = new OffscreenCanvas(lent.width, lent.height);
        frame.getContext('2d').drawImage(lent, 0, 0);
        const W = Math.round(whole.width * ${scale}), H = Math.round(whole.height * ${scale});
        const out = await printObject(object, { url, sheet: [W, H], tile: ${tile}, paper: null, tick: ${tick} });
        const read = (src, w, h) => { const x = new OffscreenCanvas(w, h).getContext('2d'); x.drawImage(src, 0, 0); return x.getImageData(0, 0, w, h).data; };
        const bmp = await createImageBitmap(out.blob);
        const w = Math.min(W, frame.width), h = Math.min(H, frame.height);
        const a = read(frame, w, h), b = read(bmp, w, h);
        let worst = 0, off = 0, sum = 0, edge = 0, edges = 0;
        const onEdge = p => { const x = (p >> 2) % w, y = Math.floor((p >> 2) / w), t = ${tile};
          return x % t === 0 || x % t === t - 1 || y % t === 0 || y % t === t - 1; };
        for (let i = 0; i < a.length; i++) {
          const d = Math.abs(a[i] - b[i]), seam = onEdge(i);
          worst = Math.max(worst, d); sum += d; if (seam) edges++;
          if (d > 8) { off++; if (seam) edge++; }
        }
        if (whole.dispose) whole.dispose();
        return { size: [bmp.width, bmp.height], frame: [frame.width, frame.height], tiles: Math.ceil(W / ${tile}) * Math.ceil(H / ${tile}),
                 enlarged: +out.enlarged.toFixed(3), worst, off: off / a.length, mean: sum / a.length,
                 seams: off ? +((edge / off) / (edges / a.length)).toFixed(2) : 0 };
      })()`);
    },

    async finish() {
      await close();
      server.kill();
      plain.close();
      console.log('\nscreenshots: ' + shots);
      if (!keep) {
        for (const dir of [vaultDir, path.join(work, 'profile')]) {
          fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
        }
      }
      console.log(fails ? `\n${fails} FAILED` : '\nall passed');
      process.exit(fails ? 1 : 0);
    },
  };
}
