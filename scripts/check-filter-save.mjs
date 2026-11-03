#!/usr/bin/env node
/**
 * scripts/check-filter-save.mjs — what leaves filter, and how it comes back.
 *
 *   node scripts/check-filter-save.mjs
 *
 * On a copy of the vault: a vault still filtered and saved — its recipe the
 * source and the chain, its source its parent — replays through
 * apps/filter/rebuild.js close to its render (a GPU replay is held to a
 * tolerance, docs/object-model.md) and the same twice; at print scale it is
 * drawn again at twice the pixels; `?open=` brings its chain back card for
 * card. A loop saves as a loop whose picture is the frame on screen, replays
 * through core's openFrames(), downloads as its frames, and goes onto a
 * compose page. A file saves as a leaf. With WebGPU taken away, a filter loop
 * shows as its saved render.
 *
 * Needs a GPU. Not in the tests loop.
 */

import fs   from 'node:fs';
import path from 'node:path';
import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const APP = c.base + '/apps/filter/';
const DL = path.join(c.dir, 'downloads');
await page.downloadsTo(DL);

const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const cards = `[...document.querySelectorAll('.pp-card')]`;
const addMenu = `document.querySelector('.pp-cards-add')`;
const api = async id => (await fetch(c.base + '/api/vault/' + id)).json();

// Objects to filter: loose (in no folder, not trashed) and unmistakable in the picker.
const rows = (await (await fetch(c.base + '/api/vault')).json()).objects || [];
const loose = r => !(r.tags || []).some(t => t.startsWith('folder:') || t === 'trash');
const label = r => r.title + ' ' + r.render.w + '×' + r.render.h;
const unique = r => rows.filter(o => label(o) === label(r)).length === 1;
const still = rows.find(r => r.type === 'still' && loose(r) && unique(r));
const loop = rows.filter(r => r.type === 'sequence' && r.origin && r.origin.app === 'gamepad' && loose(r) && unique(r))
  .sort((a, b) => a.render.frames * a.render.w * a.render.h - b.render.frames * b.render.w * b.render.h)[0];

async function choose(row) {
  await page.click(`[...document.querySelectorAll('.pp-object-actions .pp-btn')].find(b => b.textContent === 'Choose…')`);
  await page.until(`document.querySelectorAll('.vp--visible .vp-use').length > 0`);
  const found = await page.click(`[...document.querySelectorAll('.vp--visible .vp-cell')].find(k =>
    k.querySelector('.vp-name')?.textContent === ${JSON.stringify(row.title)}
    && k.querySelector('.vp-sub')?.textContent.includes(${JSON.stringify(row.render.w + '×' + row.render.h)}))?.querySelector('.vp-use')`);
  if (!found) throw new Error('not in the picker: ' + label(row));
  await page.until(`${say}.startsWith(${JSON.stringify(row.title + ' · ')})`, { timeout: 60000 });
}

async function addFilter(id, value) {
  const n = await page.eval(`${cards}.length`);
  await page.typeInto(addMenu, id);
  await page.until(`${cards}.length === ${n + 1}`);
  if (value != null) await page.typeInto(`${cards}[${n}].querySelector('.pp-num')`, String(value));
}

async function saved(how) {
  const before = await page.eval(say);
  if (how) await page.click(`[...document.querySelectorAll('.pp-actions .nb-btn')].find(b => b.textContent.startsWith(${JSON.stringify(how)}))`);
  else await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))`);
  await page.until(`/saved \\w+_\\d+_\\w+/.test(${say}) && ${say} !== ${JSON.stringify(before)}`, { timeout: 240000 });
  return { id: (await page.eval(say)).match(/saved (\w+_\d+_\w+)/)[1], said: await page.eval(say) };
}

/** A saved filter object replayed by its own rebuild.js, frame `tick`, against its saved render. */
const replay = (id, tick = 0) => page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const filter = await import('/apps/filter/rebuild.js');
  const { object, url } = await Vault.load(${JSON.stringify(id)});
  const read = pic => { const k = new OffscreenCanvas(pic.width, pic.height), x = k.getContext('2d');
    x.drawImage(pic, 0, 0); return x.getImageData(0, 0, k.width, k.height).data; };
  const h = await filter.openObject(object, {});
  const a = read(h.frame(${tick})), b = read(h.frame(${tick}));
  const r = read(await createImageBitmap(await (await fetch(url)).blob()));
  let worst = 0, same = a.length === b.length && a.length === r.length;
  // Premultiplied, so a nearly clear pixel's rounded colour counts for what it shows.
  for (let i = 0; same && i < a.length; i += 4) {
    for (let j = 0; j < 3; j++) worst = Math.max(worst, Math.abs(a[i + j] * a[i + 3] - r[i + j] * r[i + 3]) / 255);
    worst = Math.max(worst, Math.abs(a[i + 3] - r[i + 3]));
    for (let j = 0; j < 4; j++) if (a[i + j] !== b[i + j]) same = false;
  }
  const out = { length: h.length, width: h.width, height: h.height, worst: Math.round(worst * 10) / 10, same };
  h.dispose();
  return out;
})()`);

if (!still || !loop) {
  c.ok('the vault has a loose still and a gamepad loop to filter', false, `still ${!!still}, loop ${!!loop}`);
  await c.finish();
}

// ── 1. A still, filtered and saved ───────────────────────────────────────────
await c.go(APP);
await page.until(`${say}.includes('choose a source')`);
await choose(still);
await addFilter('brightness', 0.1);
await addFilter('pixelate', 4);
await page.until(`${say}.includes('2 of 2 filters on')`);
const one = await saved();
const o = await api(one.id);
c.ok('a still saves as a still, made by filter', o.type === 'still' && o.origin.app === 'filter', one.said);
c.ok('its recipe: the source, and the chain as it was',
  o.recipe.source === still.id && JSON.stringify(o.recipe.chain) === JSON.stringify([
    { id: 'brightness', params: { amount: 0.1 }, on: true }, { id: 'pixelate', params: { size: 4 }, on: true }]),
  JSON.stringify(o.recipe));
c.ok('its source is its parent', JSON.stringify(o.parents) === JSON.stringify([still.id]), JSON.stringify(o.parents));
c.ok('at its source\'s size', o.render.w === still.render.w && o.render.h === still.render.h, `${o.render.w} × ${o.render.h}`);
const r1 = await replay(one.id);
c.ok('it replays through rebuild.js, close to its render', r1.worst <= 3, 'worst premultiplied channel off by ' + r1.worst);
c.ok('and the same, twice', r1.same);
const big = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { openFrames } = await import('/core/rebuild.js');
  const { object, url } = await Vault.load(${JSON.stringify(one.id)});
  const h = await openFrames(object, { url, scale: 2 });
  const f = h.frame(0);
  const out = { width: h.width, pixels: f.width, scale: h.scale };
  h.dispose();
  return out;
})()`);
c.ok('at print scale it is drawn again, at twice the pixels', big.width === o.render.w && big.pixels === 2 * o.render.w,
  `${big.width} wide, drawn at ${big.pixels}; its source drew at ${big.scale}x`);

await c.go(APP + '?open=' + one.id);
await page.until(`${cards}.length === 2 && ${say}.startsWith(${JSON.stringify(still.title + ' · ')})`, { timeout: 60000 });
const back = await page.eval(`${cards}.map(k => k.querySelector('.pp-title').textContent + '=' + k.querySelector('.pp-num').value)`);
c.ok('?open= brings the chain back, card for card', back.join() === 'brightness=0.1,pixelate=4', back.join());

// ── 2. A loop, saved at the frame on screen ──────────────────────────────────
await c.go(APP);
await choose(loop);
await addFilter('contrast', 1.5);
await page.until(`${say}.includes('1 of 1 filters on')`);
for (let i = 0; i < 5; i++) await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }))`);
const two = await saved();
const o2 = await api(two.id);
c.ok('a loop saves as a loop, every frame of it', o2.type === 'sequence' && o2.render.frames === loop.render.frames,
  `${o2.render.frames} frames at ${o2.render.fps} fps — ${two.said}`);
const r2 = await replay(two.id, 5);
c.ok('its picture is the frame on screen, and replays close to it', r2.worst <= 3 && r2.length === o2.render.frames,
  `frame 6 off by ${r2.worst}; ${r2.length} frames`);
const through = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { openFrames } = await import('/core/rebuild.js');
  const { object, url } = await Vault.load(${JSON.stringify(two.id)});
  const h = await openFrames(object, { url });
  const n = h.length; h.dispose(); return n;
})()`);
c.ok('core replays it, as it replays any loop', through === o2.render.frames, through + ' frames');

const zipped = await saved('Save the loop + every frame');
let zip = null;
for (let i = 0; i < 300 && !zip; i++) {
  const f = fs.existsSync(DL) && fs.readdirSync(DL).find(n => n.endsWith('_frames.zip'));
  if (f) zip = path.join(DL, f); else await new Promise(r => setTimeout(r, 200));
}
let count = 0, meta = null;
if (zip) {
  const b = fs.readFileSync(zip);
  for (let off = 0; b.readUInt32LE(off) === 0x04034b50;) {
    const size = b.readUInt32LE(off + 18), nl = b.readUInt16LE(off + 26);
    const name = b.slice(off + 30, off + 30 + nl).toString();
    if (name === 'meta.json') meta = JSON.parse(b.slice(off + 30 + nl, off + 30 + nl + size).toString());
    else count++;
    off += 30 + nl + size;
  }
}
c.ok('the frames download, zipped, with their rate', !!meta && count === o2.render.frames && meta.fps === o2.render.fps,
  `${count} PNGs, meta ${JSON.stringify(meta)} — ${zipped.said}`);

// ── 3. The link it already has: onto a compose page ─────────────────────────
await c.go(c.base + '/apps/compose/?place=' + two.id);
await page.until(`(() => { const t = ${say}; return t.includes(' on the page') || t.includes('could not'); })()`, { timeout: 60000 });
c.ok('a filter loop goes onto a compose page', (await page.eval(say)).includes(' on the page'), await page.eval(say));

// ── 4. A file saves as a leaf ────────────────────────────────────────────────
await c.go(APP);
await page.eval(`(async () => {
  const k = Object.assign(document.createElement('canvas'), { width: 32, height: 32 });
  const x = k.getContext('2d'); x.fillStyle = '#48a'; x.fillRect(0, 0, 32, 32);
  const dt = new DataTransfer();
  dt.items.add(new File([await new Promise(r => k.toBlob(r, 'image/png'))], 'blue.png', { type: 'image/png' }));
  document.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true }));
})()`);
await page.until(`${say}.startsWith('blue.png')`);
await addFilter('brightness', 0.2);
await page.until(`${say}.includes('1 of 1 filters on')`);
const three = await saved();
const o3 = await api(three.id);
c.ok('a file saves as a leaf: its pixels, no recipe', o3.recipe === null && o3.tags.includes('leaf') && !o3.parents.length,
  JSON.stringify({ recipe: o3.recipe, tags: o3.tags }));
await c.go(APP + '?open=' + three.id);
await page.until(`${say}.includes('as a leaf')`);
c.ok('and ?open= says there is no chain to bring back', true, await page.eval(say));

// ── 5. No WebGPU: a filter loop shows as its saved render ───────────────────
const stub = await page.beforeLoad(`Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });`);
await c.go(c.base + '/scripts/check-page.html');
const flat = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { openFrames } = await import('/core/rebuild.js');
  const { object, url } = await Vault.load(${JSON.stringify(two.id)});
  const h = await openFrames(object, { url });
  const out = { length: h.length, width: h.width, height: h.height }; h.dispose(); return out;
})()`);
await page.forget(stub);
c.ok('with no WebGPU a filter loop shows as its render', flat.length === 1 && flat.width === o2.render.w,
  `${flat.length} frame, ${flat.width} × ${flat.height}`);

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
