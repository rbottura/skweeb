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
  const { page, close } = await launch({ port: await freePort(), profile: path.join(work, 'profile') });

  let fails = 0;
  const noise = [];
  const listen = () => noise.push(...page.errors().filter(e => !(e.url || e.text).includes('favicon.ico')));

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

    /** What every page so far said that it should not have, a missing favicon aside. */
    quiet() { listen(); return noise.splice(0); },

    shot(name) { return page.screenshot(path.join(shots, name + '.png')); },

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
