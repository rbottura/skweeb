#!/usr/bin/env node
/**
 * scripts/check-3d-poster.mjs — the 120×176 poster at 300 dpi, once.
 *
 *   node scripts/check-3d-poster.mjs
 *
 * The print's own check, apart from check-3d because it takes a while: a
 * model with a style and a stack, on the 120×176 format, printed at 300 dpi
 * from the Export drawer — 14173 × 20787 px, 294.6 million, in 77 tiles of
 * 2048, past any canvas and any GPU's side. The file it downloads is whole —
 * its IEND last, every chunk's CRC right — its header the sheet's pixels,
 * its pHYs 300 dpi; inflated and unfiltered here, row by row, it is the
 * model: a grid of its pixels held against the same model drawn small,
 * the same picture but where an edge falls between two pixels. And no page
 * said anything wrong. Prints how long it took and how big the file is.
 */

import fs   from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { startCheck } from './check-kit.mjs';
import { crc32 } from '../core/png.js';

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const panelRow = name => `[...document.querySelectorAll('#side .pp-row:not(.pp-stack-layer .pp-row)')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const W = 14173, H = 20787;

await c.go(c.base + '/apps/3d/');
await page.until(`/box, sphere, torus/.test(${say})`, { timeout: 30000 });
const DL = path.join(c.dir, 'downloads');
await page.downloadsTo(DL);

// A model with everything a poster would have: a stack on the box, the whole style.
await page.click(`document.querySelector('.pp-card .pp-title')`);
await wait(300);
const modMenu = `[...document.querySelectorAll('.pp-card')][0].querySelector('.pp-cards-add')`;
await page.typeInto(modMenu, 'subdivide');
await page.typeInto(modMenu, 'twist');
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
await page.typeInto(`${panelRow('bands of light — 0, smooth')}?.querySelector('.pp-num')`, '3');
await page.typeInto(`${panelRow('outline, thousandths of its height')}?.querySelector('.pp-num')`, '4');
await page.click(`${panelRow('shadows, on a ground of their own')}?.querySelector('input')`);
await page.click(`${panelRow('format')}?.querySelector('.pp-chip[title="120x176"]')`);
await page.typeInto(`${panelRow('dpi')}?.querySelector('.pp-num')`, '300');
await wait(500);
const note = await page.eval(`document.querySelector('.pp-print-note')?.textContent || ''`);
c.ok('the sheet: 14173 × 20787 px in 77 tiles', note === `120×176 at 300 dpi: ${W} × ${H} px, drawn in 77 tiles`, note);

const started = Date.now();
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.click(`document.querySelector('.pp-print')`);
await page.until(`/^printed|failed/.test(${say})`, { timeout: 15 * 60000, every: 1000 });
const said = await page.eval(say);
const seconds = (Date.now() - started) / 1000;
c.ok('printed', said.startsWith('printed'), said);

// Chrome writes beside the name, then renames: wait for the name, then for its size to hold.
let file = null, last = -1;
for (let i = 0; i < 600; i++) {
  const f = fs.existsSync(DL) && fs.readdirSync(DL).find(n => n.startsWith('3d_120x176_300dpi') && n.endsWith('.png'));
  if (f) {
    const size = fs.statSync(path.join(DL, f)).size;
    if (size === last) { file = path.join(DL, f); break; }
    last = size;
  }
  await wait(500);
}
const bytes = file ? fs.readFileSync(file) : Buffer.alloc(0);
console.log(`     ${seconds.toFixed(0)} s to print, ${(bytes.length / 1e6).toFixed(1)} MB`);

/** The file's chunks, read in place: their CRCs, its header, its dpi, its IDATs. */
const chunks = [];
let crcs = true;
for (let at = 8; at + 12 <= bytes.length;) {
  const length = bytes.readUInt32BE(at), type = bytes.toString('latin1', at + 4, at + 8);
  if (((crc32(bytes.subarray(at + 4, at + 8 + length)) ^ 0xffffffff) >>> 0) !== bytes.readUInt32BE(at + 8 + length)) crcs = false;
  chunks.push({ type, at, length });
  at += 12 + length;
}
const ihdr = chunks.find(k => k.type === 'IHDR'), phys = chunks.find(k => k.type === 'pHYs');
c.ok('the file whole: every chunk\'s CRC right, IEND last', !!file && crcs && chunks.at(-1)?.type === 'IEND', `${chunks.length} chunks`);
c.ok('its header the sheet\'s pixels, RGB on its ground', !!ihdr && bytes.readUInt32BE(ihdr.at + 8) === W && bytes.readUInt32BE(ihdr.at + 12) === H
  && bytes[ihdr.at + 17] === 2);
c.ok('its pHYs 300 dpi', !!phys && bytes.readUInt32BE(phys.at + 8) === 11811 && bytes[phys.at + 16] === 1);

// Inflated as a stream and unfiltered row by row: a grid of samples, a cell's middle each.
const GRID_X = 120, GRID_Y = 176, stride = W * 3;
const samples = new Uint8Array(GRID_X * GRID_Y * 3);
let rows = 0;
await new Promise((resolve, reject) => {
  const inflate = zlib.createInflate();
  let above = Buffer.alloc(stride), here = Buffer.alloc(stride), pending = Buffer.alloc(0);
  inflate.on('data', data => {
    pending = pending.length ? Buffer.concat([pending, data]) : data;
    let at = 0;
    while (pending.length - at >= stride + 1) {
      const filter = pending[at];
      for (let i = 0; i < stride; i++) here[i] = filter === 2 ? (pending[at + 1 + i] + above[i]) & 255 : pending[at + 1 + i];
      const gy = Math.floor(rows * GRID_Y / H);
      if (Math.floor((gy + 0.5) * H / GRID_Y) === rows) {
        for (let gx = 0; gx < GRID_X; gx++) {
          const x = Math.floor((gx + 0.5) * W / GRID_X);
          samples.set(here.subarray(x * 3, x * 3 + 3), (gy * GRID_X + gx) * 3);
        }
      }
      [above, here] = [here, above];
      rows++;
      at += stride + 1;
    }
    pending = pending.subarray(at);
  });
  inflate.on('end', resolve);
  inflate.on('error', reject);
  for (const k of chunks.filter(k => k.type === 'IDAT')) inflate.write(bytes.subarray(k.at + 8, k.at + 8 + k.length));
  inflate.end();
});
c.ok('every row there', rows === H, `${rows} rows`);

// The preview — the model on the same sheet's shape, small — sampled at the same cells' middles.
const picture = await page.eval(`(async () => {
  const canvas = document.getElementById('stage');
  const d = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data, out = [];
  for (let gy = 0; gy < ${GRID_Y}; gy++) for (let gx = 0; gx < ${GRID_X}; gx++) {
    const x = Math.floor((gx + 0.5) * canvas.width / ${GRID_X}), y = Math.floor((gy + 0.5) * canvas.height / ${GRID_Y});
    const i = (y * canvas.width + x) * 4; out.push(d[i], d[i + 1], d[i + 2]);
  }
  return { out, w: canvas.width, h: canvas.height };
})()`);
let near = 0, sum = 0;
for (let i = 0; i < samples.length; i += 3) {
  const d = Math.max(...[0, 1, 2].map(k => Math.abs(samples[i + k] - picture.out[i + k])));
  sum += d;
  if (d <= 24) near++;
}
const share = near / (samples.length / 3);
c.ok('its picture the model\'s: the preview\'s, sample for sample, but where an edge falls between', share > 0.97 && sum / (samples.length / 3) < 6,
  `${(share * 100).toFixed(1)}% within 24, mean ${(sum / (samples.length / 3)).toFixed(2)} — against the ${picture.w} × ${picture.h} preview`);

const noise = c.quiet();
c.ok('no page said anything wrong', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
