#!/usr/bin/env node
/**
 * scripts/import-legacy-grid.mjs — the original grid sketch's materials, into
 * the vault.
 *
 *   node scripts/import-legacy-grid.mjs <grid_sketch/img> [--vault ./vault] [--only tiles,degz]
 *
 * grid_sketch (docs/migration.md) loaded seven folders "as mapping material" —
 * degz, trames, sprites, myFace, shapes, tiles, stones — each a ramp numbered
 * light to dark. This puts each into the vault as a legacy grid material: every
 * tile a `shape` filed in its own folder, the folder a `set` with `role:
 * 'material'` (core/legacy.js), so grid offers it and the maker can take tiles
 * out of it. tiles and trames also ship with grid, as ramps it boots with.
 *
 * Order is the whole point: a ramp sorts on the number in its files' names,
 * `tile2` before `tile10`, as scripts/generate-grid-manifest.js does.
 *
 * A thumbnail and a contact sheet need a canvas, and Node has none, so this
 * drives headless Chrome (chrome.mjs) through a page of grid's
 * (apps/grid/legacy-import.js), the sketch's folder served beside it. Its own
 * server.js writes the vault — safe beside another one, since a server
 * rebuilds the index from disk on every write. Run twice, it makes nothing new.
 */

import { spawn } from 'node:child_process';
import http      from 'node:http';
import net       from 'node:net';
import fs        from 'node:fs';
import os        from 'node:os';
import path      from 'node:path';
import { fileURLToPath } from 'node:url';
import { launch } from './chrome.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** What the sketch's preload() loaded as mapping material, in its order. */
const MATERIALS = ['degz', 'trames', 'sprites', 'myFace', 'shapes', 'tiles', 'stones'];
const IMAGE = /\.(png|jpe?g|webp)$/i;
const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};

/** The number in a file's name, which is its place in the ramp: `tile10` after `tile2`. */
const ordinal = name => {
  const m = /(\d+)(?=\D*$)/.exec(path.basename(name, path.extname(name)));
  return m ? parseInt(m[1], 10) : -1;
};

const freePort = () => new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
});

const imgDir = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : null;
if (!imgDir || !fs.existsSync(imgDir)) {
  console.error('usage: node scripts/import-legacy-grid.mjs <grid_sketch/img> [--vault ./vault] [--only tiles,degz]');
  process.exit(1);
}
const vaultDir = path.resolve(arg('--vault', path.join(ROOT, 'vault')));
const only = arg('--only', '');
const wanted = only ? only.split(',').map(s => s.trim()).filter(Boolean) : MATERIALS;

// Each material: its tiles in ramp order, as the sketch numbered them.
const materials = [];
for (const material of wanted) {
  const dir = path.join(imgDir, material);
  if (!fs.existsSync(dir)) { console.warn(`  ${material}: no folder at ${dir}, skipped`); continue; }
  const files = fs.readdirSync(dir).filter(f => IMAGE.test(f))
    .sort((a, b) => ordinal(a) - ordinal(b) || a.localeCompare(b));
  if (!files.length) { console.warn(`  ${material}: no pictures, skipped`); continue; }
  materials.push({ material, files });
}

// The sketch's folder, served so the page can read it: cross-origin, so CORS.
const host = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
  const file = path.join(imgDir, rel);
  if (!file.startsWith(imgDir) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
                       'Access-Control-Allow-Origin': '*' });
  fs.createReadStream(file).pipe(res);
});
const hostPort = await freePort();
await new Promise(r => host.listen(hostPort, '127.0.0.1', r));

const port = await freePort();
const base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, [path.join(ROOT, 'server.js'), '--port', String(port), '--vault', vaultDir],
  { stdio: 'ignore' });
for (let i = 0; i < 100; i++) {
  try { if ((await fetch(base + '/api/vault')).ok) break; } catch { /* not up yet */ }
  await new Promise(r => setTimeout(r, 100));
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'skweeb-import-'));
const { page, close } = await launch({ port: await freePort(), profile });
let failed = 0;

try {
  console.log(`into ${vaultDir}, from ${imgDir}`);
  await page.goto(base + '/apps/grid/', { settle: 800 });
  for (const { material, files } of materials) {
    const tiles = files.map(f => ({ n: ordinal(f), url: `http://127.0.0.1:${hostPort}/${material}/${encodeURIComponent(f)}` }));
    const args = { material, tiles, from: `grid_sketch/img/${material}` };
    try {
      const out = await page.eval(`import('/apps/grid/legacy-import.js')
        .then(m => m.importLegacyMaterial(${JSON.stringify(args)}))`);
      console.log(`  ${out.set.title.padEnd(26)} ${out.set.id}  ${files.length} tiles, `
        + (out.created ? `${out.created} new` : 'already in the vault'));
    } catch (err) {
      failed++;
      console.error(`  ${material}: FAILED — ${err.message}`);
    }
  }
  const errors = page.errors().filter(e => !(e.url || e.text).includes('favicon.ico'));
  if (errors.length) console.error('the page said:', errors.map(e => e.text).join('\n'));
} finally {
  await close();
  server.kill();
  host.close();
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
process.exit(failed ? 1 : 0);
