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
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp', '.wasm': 'application/wasm' };

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
/**
 * A saved object as its app has it. Since S6b an app's S saves the next
 * state of a smart object, so what a check finds in the vault is often a
 * `skw`: this is the object it binds — as core/smart.js `unwrap` makes it,
 * its id, picture and version kept — and anything else is itself.
 */
export function inner(o) {
  if (!o || o.type !== 'skw') return o;
  const b = o.recipe || {};
  return { ...o, type: b.type || 'still', origin: { ...(o.origin || {}), app: b.app || (o.origin && o.origin.app) },
           recipe: b.recipe ?? null, seed: b.seed ?? null, smart: true };
}

/**
 * What a page holds outside its nodes, counted from before it loads (S9):
 * every listener on the document and the window as it comes and goes, every
 * channel as it opens and closes, every interval as it is set and cleared,
 * every frame asked for — what an app holds while it is mounted, and lets go
 * of when it is not. The page's own BroadcastChannel is kept aside as
 * `window.__Channel`, so a check's own channel is not counted. Called before
 * the page it counts is opened: check-mount's, check-cluster's.
 *
 * @param {object} page   a tab of chrome.mjs
 * @returns {Promise<{ held: () => Promise<{document: number, window: number, channels: number, intervals: number}>,
 *                     framesAsked: (ms?: number) => Promise<number> }>}
 */
export async function countHeld(page) {
  await page.beforeLoad(`(() => {
    const live = new Map();
    for (const [name, t] of [['document', document], ['window', window]]) {
      const add = t.addEventListener.bind(t), rm = t.removeEventListener.bind(t);
      const key = (type, fn, o) => type + '|' + (typeof o === 'boolean' ? o : !!(o && o.capture));
      const set = new Map();
      live.set(name, set);
      t.addEventListener = (type, fn, o) => { if (fn) { const k = key(type, fn, o); if (!set.has(k)) set.set(k, new Set()); set.get(k).add(fn); } return add(type, fn, o); };
      t.removeEventListener = (type, fn, o) => { const s = set.get(key(type, fn, o)); if (s) s.delete(fn); return rm(type, fn, o); };
    }
    const Channel = window.BroadcastChannel, channels = new Set();
    window.__Channel = Channel;
    window.BroadcastChannel = class extends Channel {
      constructor(name) { super(name); channels.add(this); }
      close() { channels.delete(this); return super.close(); }
    };
    const every = window.setInterval.bind(window), stop = window.clearInterval.bind(window), intervals = new Set();
    window.setInterval = (fn, ms, ...rest) => { const id = every(fn, ms, ...rest); intervals.add(id); return id; };
    window.clearInterval = id => { intervals.delete(id); return stop(id); };
    const raf = window.requestAnimationFrame.bind(window);
    let frames = 0;
    window.requestAnimationFrame = fn => { frames++; return raf(fn); };
    window.__held = () => ({ ...Object.fromEntries([...live].map(([n, set]) => [n, [...set.values()].reduce((a, s) => a + s.size, 0)])),
      channels: channels.size, intervals: intervals.size });
    window.__frames = () => frames;
  })()`);
  return {
    held: () => page.eval(`window.__held()`),
    /** Frames asked for over `ms`: a clock playing asks one a frame, and nothing playing none. */
    async framesAsked(ms = 600) {
      const a = await page.eval(`window.__frames()`);
      await new Promise(r => setTimeout(r, ms));
      return (await page.eval(`window.__frames()`)) - a;
    },
  };
}

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
          // Chrome on Windows can still hold a file in its profile a moment after it closed:
          // what cannot go is left in the temp folder and said, never a check failed for it.
          try {
            fs.rmSync(dir, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
          } catch (err) {
            console.log(`     left behind, still held: ${dir} (${err.code})`);
          }
        }
      }
      console.log(fails ? `\n${fails} FAILED` : '\nall passed');
      process.exit(fails ? 1 : 0);
    },
  };
}
