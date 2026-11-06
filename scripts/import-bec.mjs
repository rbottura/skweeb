#!/usr/bin/env node
/**
 * scripts/import-bec.mjs — BEC_2025's files into the vault, in one folder,
 * `bec_2025` (M13b, docs/bec.md).
 *
 *   node scripts/import-bec.mjs <BEC_2025> [--vault ./vault]
 *
 * The layers by format as BEC's own `assets/urls.json` lists them — each
 * format's titles and infos, the designer's pictures with alpha laid over the
 * grid or under it (docs/migration.md, *BEC_2025*) — and the pictures of its
 * `img/` beside them that the project made: two more titles, its text
 * compositions, the matrix drawn by hand. Each tagged with its format and its
 * layer, all filed in `bec_2025`; BEC's three palettes with them, as palettes.
 * Not its favicon nor its alpha pattern, which were its page's; not its
 * colour range, a PDF the vault has no type for (the roadmap's *Still
 * open*, 3).
 *
 * A thumbnail needs a canvas, and Node has none: this serves the folder and
 * drives headless Chrome (chrome.mjs) through a page of the vault app's
 * (apps/vault/bec-import.js). Its own server.js writes the vault — safe beside
 * another one, since a server rebuilds the index from disk on every write.
 * Run twice, it makes nothing new.
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
const TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' };

const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i > 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const freePort = () => new Promise((resolve, reject) => {
  const probe = net.createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => resolve(port)); });
});

const bec = process.argv[2] && !process.argv[2].startsWith('--') ? path.resolve(process.argv[2]) : null;
if (!bec || !fs.existsSync(path.join(bec, 'assets', 'urls.json'))) {
  console.error('usage: node scripts/import-bec.mjs <BEC_2025> [--vault ./vault]   — the folder holding assets/urls.json and img/');
  process.exit(1);
}
const vaultDir = path.resolve(arg('--vault', path.join(ROOT, 'vault')));

/** The layers by format, as BEC listed them: `titre1`…, `infos1`…, `#` for none. */
const pictures = [];
const urls = JSON.parse(fs.readFileSync(path.join(bec, 'assets', 'urls.json'), 'utf8'));
for (const [format, layers] of Object.entries(urls)) {
  for (const [key, url] of Object.entries(layers)) {
    const m = /^(titre|infos)(\d+)$/.exec(key);
    if (!m || typeof url !== 'string' || url === '#' || !url.startsWith('./img/')) continue;
    const layer = m[1] === 'titre' ? 'titles' : 'infos';
    pictures.push({ file: url.slice(2), title: `BEC 2025 · ${format} · ${layer} ${m[2]}`, tags: ['bec_2025', format, layer] });
  }
}
/** And the project's other pictures, named by what they are. */
const OTHERS = [
  ['img/BEC-Poster_Titres-RL-03.png', 'BEC 2025 · poster · titles, RL-03', ['poster', 'titles']],
  ['img/BEC-Poster_Titres-RL-04.png', 'BEC 2025 · poster · titles, RL-04', ['poster', 'titles']],
  ['img/compo_text_1.png', 'BEC 2025 · a composition of text, 1', ['text']],
  ['img/compo_text_2.png', 'BEC 2025 · a composition of text, 2', ['text']],
  ['img/sqr_text.jpg', 'BEC 2025 · square · text', ['square', 'text']],
  ['img/isaacs-matrix-drawing.png', 'BEC 2025 · the matrix, drawn', ['drawing']],
];
for (const [file, title, tags] of OTHERS) pictures.push({ file, title, tags: ['bec_2025', ...tags] });
const missing = pictures.filter(p => !fs.existsSync(path.join(bec, p.file)));
for (const p of missing) console.warn(`  ${p.file}: not there, skipped`);
const present = pictures.filter(p => !missing.includes(p));

// The folder, served so the page can read it: cross-origin, so CORS.
const host = http.createServer((req, res) => {
  const rel = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
  const file = path.join(bec, rel);
  if (!file.startsWith(bec) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
                       'Access-Control-Allow-Origin': '*' });
  fs.createReadStream(file).pipe(res);
});
const hostPort = await freePort();
await new Promise(r => host.listen(hostPort, '127.0.0.1', r));

const port = await freePort();
const base = 'http://127.0.0.1:' + port;
const server = spawn(process.execPath, [path.join(ROOT, 'server.js'), '--port', String(port), '--vault', vaultDir], { stdio: 'ignore' });
for (let i = 0; i < 100; i++) {
  try { if ((await fetch(base + '/api/vault')).ok) break; } catch { /* not up yet */ }
  await new Promise(r => setTimeout(r, 100));
}

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'skweeb-import-'));
const { page, close } = await launch({ port: await freePort(), profile });
let failed = 0;
try {
  console.log(`into ${vaultDir}, from ${bec}: ${present.length} pictures and three palettes, in the folder bec_2025`);
  await page.goto(base + '/apps/vault/', { settle: 800 });
  const args = { pictures: present.map(p => ({ url: `http://127.0.0.1:${hostPort}/${p.file.split('/').map(encodeURIComponent).join('/')}`,
    title: p.title, tags: p.tags, note: `from BEC_2025/${p.file}` })) };
  const out = await page.eval(`import('/apps/vault/bec-import.js').then(m => m.importBec(${JSON.stringify(args)}))`);
  console.log(`  ${out.pictures} pictures, ${out.palettes} palettes — ${out.created ? out.created + ' new' : 'all already in the vault'}`);
  for (const f of out.failed) { failed++; console.error('  FAILED ' + f); }
  const errors = page.errors().filter(e => !(e.url || e.text).includes('favicon.ico'));
  if (errors.length) console.error('the page said:', errors.map(e => e.text).join('\n'));
} finally {
  await close();
  server.kill();
  host.close();
  fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
}
process.exit(failed ? 1 : 0);
