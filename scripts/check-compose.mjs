#!/usr/bin/env node
/**
 * scripts/check-compose.mjs — compose, checked in a real browser.
 *
 *   node scripts/check-compose.mjs [--keep]
 *
 * Starts server.js on a free port against a copy of ./vault in the OS temp
 * folder, so nothing here can write to yours, and opens compose in headless
 * Chrome (scripts/chrome.mjs). Then, from the page itself:
 *
 *   an empty page         A4, 150 dpi, and it says what to do
 *   every kind placed     one object per type and app in the vault, by
 *                         `?place=`: drawn, whole, as large as fits
 *   a typed transform     a still lands on the pixels page.js's matrix says
 *   the page              bleed, a transparent ground, A3, scale 2, Reset
 *   no vault at all       the repo served as plain files: it boots, says so
 *
 * and a console with nothing in it but a missing favicon. Screenshots land in
 * the temp folder, printed at the end; --keep leaves the folder there.
 * Not in the tests loop: it needs Chrome, and a vault with things in it.
 */

import { spawn }  from 'node:child_process';
import http       from 'node:http';
import net        from 'node:net';
import fs         from 'node:fs';
import os         from 'node:os';
import path       from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './chrome.mjs';
import { placementMatrix, onPage, pageSize } from '../apps/compose/page.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEEP = process.argv.includes('--keep');
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), 'skweeb-check-'));
const SHOTS = path.join(WORK, 'shots');

let fails = 0;
const ok = (label, pass, detail = '') => {
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(58) + (detail ? ' ' + detail : ''));
};

const freePort = () => new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
});

// ── A server on a copy of the vault, and the repo as plain files ────────────

const vaultDir = path.join(WORK, 'vault');
if (fs.existsSync(path.join(ROOT, 'vault'))) fs.cpSync(path.join(ROOT, 'vault'), vaultDir, { recursive: true });
else fs.mkdirSync(vaultDir);

const port = await freePort();
const BASE = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, [path.join(ROOT, 'server.js'), '--port', String(port), '--vault', vaultDir],
  { stdio: 'ignore' });

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.webp': 'image/webp' };
const plain = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.startsWith('/api/') || p.startsWith('/vault/')) { res.writeHead(404); return res.end(); }
  if (p.endsWith('/')) p += 'index.html';
  fs.readFile(path.join(ROOT, p), (err, body) => {
    if (err) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' });
    res.end(body);
  });
});
const plainPort = await freePort();
await new Promise(r => plain.listen(plainPort, '127.0.0.1', r));

for (let i = 0; i < 100; i++) {
  try { if ((await fetch(BASE + '/api/vault')).ok) break; } catch { /* not up yet */ }
  await new Promise(r => setTimeout(r, 100));
}

const { page, close } = await launch({ port: await freePort(), profile: path.join(WORK, 'profile') });

// ── What the page shows ──────────────────────────────────────────────────────

/** The bar, the canvas, and where its ink is: anything darker than the paper. */
const look = () => page.eval(`(() => {
  const c = document.getElementById('page');
  const g = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let clear = 0, x0 = c.width, y0 = c.height, x1 = -1, y1 = -1;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4;
    if (!g[i + 3]) { clear++; continue; }
    if (g[i] < 200 || g[i + 1] < 200 || g[i + 2] < 200) {
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  const dim = [...document.querySelectorAll('.bar-dim')].map(e => e.textContent);
  return { w: c.width, h: c.height, clear, ink: x1 < 0 ? null : [x0, y0, x1, y1],
    say: document.querySelector('.bar-say').textContent, out: document.querySelector('.bar-out').textContent,
    dpi: dim[1] || '', vault: dim[2] || '' };
})()`);

const row = (side, label) => `[...document.querySelectorAll('#${side} .pp-row')]
  .find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(label)})`;
const type = async (side, label, value) => {
  await page.typeInto(row(side, label) + '?.querySelector(".pp-num")', value);
  await new Promise(r => setTimeout(r, 200));
};
const chip = text => `[...document.querySelectorAll('#page-side .pp-chip')].find(c => c.textContent === ${JSON.stringify(text)})`;
const settled = `(() => { const t = document.querySelector('.bar-say')?.textContent || '';
  return t.includes(' on the page') || t.startsWith('could not'); })()`;
const shot = name => page.screenshot(path.join(SHOTS, name + '.png'));

// The console is heard page by page — goto() starts a fresh log — so what
// each page said is kept before the next one opens.
const noise = [];
const listen = () => noise.push(...page.errors().filter(e => !(e.url || e.text).includes('favicon.ico')));
const go = async (url, opts) => { listen(); await page.goto(url, opts); };

const SHEET = { width: 1240, height: 1754, bleed: 0 };
let still = null;

try {
  // 1. Empty.
  await go(BASE + '/apps/compose/');
  await page.until(`document.querySelector('.bar-say')?.textContent.startsWith('choose')`);
  let s = await look();
  ok('empty: says what to do', s.say.startsWith('choose an object'));
  ok('empty: an A4 page at 150 dpi', s.out === '1240 × 1754 px' && s.dpi.includes('150 dpi on A4'), s.out + ' ' + s.dpi);
  ok('empty: the canvas is the sheet\'s shape', Math.abs(s.w / s.h - 1240 / 1754) < 0.01, s.w + '×' + s.h);
  await shot('01-empty');

  // 2. One of every kind the vault has.
  const rows = (await (await fetch(BASE + '/api/vault')).json()).objects || [];
  const kinds = new Map();
  for (const r of rows) {
    const key = r.type + ' from ' + (r.origin && r.origin.app);
    if (['still', 'sequence', 'shape'].includes(r.type) && !kinds.has(key)) kinds.set(key, r);
  }
  if (!kinds.size) console.log('     (the vault has nothing to place — skipping the placements)');
  for (const [kind, r] of kinds) {
    await go(BASE + '/apps/compose/?place=' + r.id);
    await page.until(settled, { timeout: 90000 });
    s = await look();
    const m = s.say.match(/(\d+) × (\d+) on the page/);
    const scale = Number(await page.eval(row('place-side', 'scale') + '.querySelector(".pp-num").value'));
    const [W, H] = m ? [Number(m[1]), Number(m[2])] : [0, 0];
    const whole = W <= SHEET.width && H <= SHEET.height;
    const large = scale === 1 || Math.max(W / SHEET.width, H / SHEET.height) >= scale / (scale + 0.01) - 1e-9;
    ok(`${kind}: placed and drawn`, !!m && !!s.ink, r.id + (m ? '' : ' — ' + s.say));
    ok(`${kind}: whole, and as large as fits`, whole && large, `${W}×${H} at ${scale}`);
    await shot('02-' + kind.replace(/\W+/g, '-'));
    if (r.type === 'still' && !still) still = r;
  }

  // 3. A typed transform lands where the matrix says.
  if (still) {
    await go(BASE + '/apps/compose/?place=' + still.id);
    await page.until(settled, { timeout: 30000 });
    const t = { x: 200, y: -300, scale: 0.5, rot: 90 };
    await type('place-side', 'x from centre', t.x);
    await type('place-side', 'y from centre', t.y);
    await type('place-side', 'scale', t.scale);
    await type('place-side', 'rotation °', t.rot);
    s = await look();
    const view = s.w / pageSize(SHEET).width;
    const mx = placementMatrix(t, { width: still.render.w, height: still.render.h }, SHEET);
    const pts = [[0, 0], [still.render.w, 0], [still.render.w, still.render.h], [0, still.render.h]]
      .map(p => onPage(mx, p).map(v => v * view));
    const want = [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1])),
                  Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))];
    const off = s.ink ? Math.max(...s.ink.map((v, i) => Math.abs(v - want[i]))) : Infinity;
    ok('a typed transform lands where page.js says', off <= 3,
       `ink ${JSON.stringify(s.ink)} against ${JSON.stringify(want.map(Math.round))}`);
    await shot('03-transformed');

    // 4. The page.
    await type('page-side', 'bleed', 40);
    s = await look();
    ok('bleed grows the canvas round the sheet', s.out === '1320 × 1834 px', s.out);
    await shot('04-bleed');
    await type('page-side', 'bleed', 0);
    await page.click(`[...document.querySelectorAll('#page-side .dr-head')].find(h => h.textContent.includes('Ground'))`);
    await page.click(chip('none'));
    await new Promise(r => setTimeout(r, 200));
    s = await look();
    ok('a ground of none is transparent', s.clear > 0, s.clear + ' clear pixels');
    await page.click(chip('A3'));
    await new Promise(r => setTimeout(r, 200));
    s = await look();
    ok('A3 is A4\'s shape: the box stays, the dpi moves', s.out === '1240 × 1754 px' && s.dpi.includes('106 dpi on A3'), s.dpi);
    await type('page-side', 'scale', 2);
    s = await look();
    ok('scale 2 doubles what an export makes', s.out === '2480 × 3508 px · 2×' && s.dpi.includes('212 dpi'), s.out + ' ' + s.dpi);
    await page.click(`document.querySelector('#place-side .pp-head .pp-btn')`);
    await new Promise(r => setTimeout(r, 300));
    s = await look();
    ok('Reset takes the object away', s.say.startsWith('choose') && !s.ink);
  }
  listen();
  ok('the console stayed quiet on every page', !noise.length, JSON.stringify(noise.slice(0, 3)));

  // 5. No vault at all: rule 7.
  await page.goto(`http://127.0.0.1:${plainPort}/apps/compose/`, { settle: 1500 });
  s = await look();
  ok('with no vault it boots and says so', s.vault === 'no vault' && s.out === '1240 × 1754 px', s.vault);
  await shot('05-no-vault');
} catch (err) {
  fails++;
  console.log('FAIL ' + err.message);
} finally {
  await close();
  server.kill();
  plain.close();
  console.log('\nscreenshots: ' + SHOTS);
  if (!KEEP) {
    fs.rmSync(vaultDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    fs.rmSync(path.join(WORK, 'profile'), { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
