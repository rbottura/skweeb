#!/usr/bin/env node
/**
 * scripts/check-fractals.mjs — M7's app in Chrome: escape time on the GPU.
 *
 *   node scripts/check-fractals.mjs
 *
 * Served as plain files with no vault, it opens and draws (rule 7). On the
 * server: the GPU's picture agrees with the escape count in doubles
 * (fractal.js `escape`) — inside is the inside colour, a point that leaves
 * soon is not — wherever the two cannot differ by 32 bits against 64; the
 * wheel zooms about the pointer, keeping its point under it; a drag pans by
 * as much as the pointer moved; a Julia set is another picture; and the PNG
 * is the format at its scale. The zoom's slider runs on the logarithm. And
 * copies: dots with no sprite, as many as copies.js says; a star brought in
 * and picked, drawn in its place; a tree; the PNG drawn again at its scale.
 * And an idle — the author's find, a tree's twist swung −10 to +10: picked,
 * its range filled in, played, its loop closed pixel for pixel; saved as a
 * sequence with the star its parent, replayed to its render, a sprite sheet
 * of every frame, reopened, and placed in compose. And escape time moving:
 * the ramp once round, then a Julia c round a circle, each played and its
 * loop closed pixel for pixel; the second saved, replayed, reopened, placed.
 */

import fs   from 'node:fs';
import path from 'node:path';
import { startCheck } from './check-kit.mjs';
import { planeAt, escape } from '../apps/fractals/fractal.js';
import { copiesOf, SHAPES } from '../apps/fractals/copies.js';

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const row = name => `[...document.querySelectorAll('.pp-row:not(.pp-stack-layer .pp-row)')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const set = async (name, value) => { await page.typeInto(`${row(name)}?.querySelector('.pp-num')`, value); await wait(300); };
/** The bar's line once it says `text`: an announcement holds the bar a few seconds first. */
const sayWith = text => page.until(`${say}.includes(${JSON.stringify(text)})`, { timeout: 10000 }).then(() => page.eval(say), () => page.eval(say));
const value = name => page.eval(`Number(${row(name)}?.querySelector('.pp-num')?.value)`);
const view = async () => ({ kind: 'mandelbrot', cx: await value('centre x'), cy: await value('centre y'),
                            zoom: await value('zoom'), iterations: await value('iterations') });
/** A pixel of the preview, at a place in the picture's own pixels (1080 square). */
const pixelAt = (px, py) => page.eval(`(() => { const c = document.getElementById('stage');
  const x = Math.min(c.width - 1, Math.round(${px} * c.width / 1080)), y = Math.min(c.height - 1, Math.round(${py} * c.height / 1080));
  return [...c.getContext('2d').getImageData(x, y, 1, 1).data]; })()`);
/** Where a place in the picture's own pixels is on screen. */
const onScreen = (px, py) => page.eval(`(() => { const r = document.getElementById('stage').getBoundingClientRect();
  return [r.left + ${px} * r.width / 1080, r.top + ${py} * r.height / 1080]; })()`);

// ── Rule 7 ──────────────────────────────────────────────────────────────────

// With no WebGPU the app opens and says so — "no escape time here" — and the
// rest of this check, which needs the GPU, is skipped.
const opened = `${say}.includes('mandelbrot') || ${say}.includes('no escape time')`;
await c.go(c.plain + '/apps/fractals/');
await page.until(opened, { timeout: 20000 });
const firstSay = await page.eval(say);
const gpu = !firstSay.includes('no escape time');
c.ok('opens with no vault, and draws — or says why it cannot', /mandelbrot|no escape time/.test(firstSay), firstSay);

await c.go(c.base + '/apps/fractals/');
const plainNoise = c.quiet().filter(e => !(e.url || '').endsWith('/api/vault'));
c.ok('with no vault it said nothing else', !plainNoise.length, JSON.stringify(plainNoise).slice(0, 300));
await page.until(opened, { timeout: 20000 });
if (!gpu) {
  console.log('no WebGPU in this Chrome: the rest needs it');
  await c.finish();
}
await wait(400);

// ── The GPU against the escape count in doubles ─────────────────────────────

const v = await view();
let agree = 0, asked = 0, worst = '';
for (let gy = 40; gy < 1080; gy += 80) {
  for (let gx = 40; gx < 1080; gx += 80) {
    const [x, y] = planeAt(v, 1080, 1080, gx, gy);
    const n = escape(v, x, y);
    const deep = n === v.iterations && escape({ ...v, iterations: v.iterations * 4 }, x, y) === v.iterations * 4;
    if (!(deep || n < 12)) continue;                // near the edge, 32 bits and 64 may part
    asked++;
    const [r, g, b] = await pixelAt(gx, gy);
    const inside = r === 17 && g === 17 && b === 17;
    if (inside === deep) agree++;
    else worst = `${gx},${gy}: doubles say ${deep ? 'inside' : 'out at ' + n}, the GPU ${inside ? 'inside' : 'outside'}`;
  }
}
c.ok('the GPU\'s picture is the escape count, away from the edge', asked > 60 && agree === asked, `${agree} of ${asked} ${worst}`);
await c.shot('1-mandelbrot');

// ── The wheel zooms about the pointer ───────────────────────────────────────

// A mouse event's clientX is a whole pixel in Chrome: aim at one, and hold
// the point under where the pointer really is, in the picture's pixels.
const [sx, sy] = (await onScreen(700, 380)).map(Math.round);
const [px, py] = await page.eval(`(() => { const r = document.getElementById('stage').getBoundingClientRect();
  return [(${sx} - r.left) * 1080 / r.width, (${sy} - r.top) * 1080 / r.height]; })()`);
const before = planeAt(await view(), 1080, 1080, px, py);
await page.eval(`document.getElementById('stage').dispatchEvent(new WheelEvent('wheel',
  { clientX: ${sx}, clientY: ${sy}, deltaY: -600, bubbles: true, cancelable: true }))`);
await wait(400);
const zoomed = await view();
const after = planeAt(zoomed, 1080, 1080, px, py);
c.ok('the wheel zooms in', zoomed.zoom > 2, `zoom ${zoomed.zoom.toFixed(3)}`);
c.ok('and keeps the point under the pointer', Math.hypot(after[0] - before[0], after[1] - before[1]) < 1e-9,
  `moved ${Math.hypot(after[0] - before[0], after[1] - before[1]).toExponential(1)}`);

// ── A drag pans by as much as the pointer moved ─────────────────────────────

const [ax, ay] = await onScreen(500, 500), [bx, by] = await onScreen(620, 440);
const held = planeAt(await view(), 1080, 1080, 500, 500);
await page.pointer([ax, ay], [bx, by], 8);
await wait(300);
const panned = planeAt(await view(), 1080, 1080, 620, 440);
c.ok('a drag keeps the point it took hold of under the pointer', Math.hypot(panned[0] - held[0], panned[1] - held[1]) < 1e-6,
  `moved ${Math.hypot(panned[0] - held[0], panned[1] - held[1]).toExponential(1)}`);
await c.shot('2-zoomed');

// ── A Julia set ─────────────────────────────────────────────────────────────

const mand = await pixelAt(540, 540);
await page.click(`[...${row('set')}.querySelectorAll('button')].find(b => b.textContent === 'julia')`);
await set('zoom', '1');
await set('centre x', '0');
await set('centre y', '0');
await wait(300);
const julia = await pixelAt(540, 300);
c.ok('a Julia set is another picture', JSON.stringify(julia) !== JSON.stringify(mand) || (await page.eval(say)).includes('julia of'),
  await page.eval(say));
await c.shot('3-julia');

// ── The PNG: the format at its scale, drawn again ───────────────────────────

const DL = path.join(c.dir, 'downloads');
await page.downloadsTo(DL);
await set('scale', '2');
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.click(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent === 'Download the picture (PNG)')`);
await page.until(`/^downloaded|failed/.test(${say})`, { timeout: 60000 });
let file = null;
for (let i = 0; i < 100 && !file; i++) {
  const f = fs.existsSync(DL) && fs.readdirSync(DL).find(n => n.endsWith('.png'));
  if (f) file = path.join(DL, f); else await wait(200);
}
const size = file ? (b => [b.readUInt32BE(16), b.readUInt32BE(20)])(fs.readFileSync(file)) : [0, 0];
c.ok('the PNG is the format at its scale', size[0] === 2160 && size[1] === 2160, size.join(' × '));

// ── The zoom's slider is logarithmic ────────────────────────────────────────

await page.click(`[...${row('set')}.querySelectorAll('button')].find(b => b.textContent === 'mandelbrot')`);
await page.eval(`(() => { const s = ${row('zoom')}.querySelector('.pp-range'); s.value = 3;
  s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await wait(300);
const logZoom = await value('zoom');
c.ok('the zoom slider runs on the logarithm: 3 along is 1000×', Math.abs(logZoom - 1000) < 1e-6, String(logZoom));
await page.eval(`(() => { const s = ${row('zoom')}.querySelector('.pp-range'); s.value = 0;
  s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
await wait(200);
c.ok('and 0 along is 1×', Math.abs((await value('zoom')) - 1) < 1e-9, String(await value('zoom')));

// ── Copies: a sprite copying itself ─────────────────────────────────────────

await set('scale', '1');
await page.click(`[...${row('family')}.querySelectorAll('button')].find(b => b.textContent === 'a sprite, copied')`);
await wait(400);
const tri = { shape: 'triangle', ...SHAPES.triangle.start };
const want = copiesOf(tri).copies.length;
const dotsSay = await sayWith(`${want.toLocaleString('en')} copies`);
c.ok('copies with no sprite are dots, as many as the maps make', dotsSay.includes(`${want.toLocaleString('en')} copies`) && dotsSay.includes('dots'), dotsSay);
c.ok('escape time\'s rows are put away', await page.eval(`${row('zoom')}?.hidden === true`));

// A star from outside, brought in and picked where the picker opens.
const star = `(async () => { const c = new OffscreenCanvas(96, 96), g = c.getContext('2d');
  g.fillStyle = '#d8342a'; g.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 18 : 46, a = i * Math.PI / 5 - Math.PI / 2; g.lineTo(48 + Math.cos(a) * r, 48 + Math.sin(a) * r); }
  g.fill(); return new File([await c.convertToBlob({ type: 'image/png' })], 'copy star.png', { type: 'image/png' }); })()`;
await page.click(`[...${row('sprite')}.querySelectorAll('button')].find(b => b.textContent === 'Choose…')`);
await page.until(`!!document.querySelector('.vp--visible')`, { timeout: 20000 });
await page.eval(`(async () => { const dt = new DataTransfer(); dt.items.add(await ${star});
  document.querySelector('.vp--visible').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); })()`);
await page.until(`[...document.querySelectorAll('.vp--visible .vp-cell')].some(k => k.querySelector('.vp-name')?.textContent === 'copy star')`,
  { timeout: 30000 }).catch(() => {});
await page.click(`[...document.querySelectorAll('.vp--visible .vp-cell')].find(k => k.querySelector('.vp-name')?.textContent === 'copy star')?.querySelector('.vp-use')`);
await page.until(`${say}.includes('copy star: 1 sprite') || ${say}.includes('could not')`, { timeout: 30000 }).catch(() => {});
await wait(400);
const starSay = await sayWith(`${want.toLocaleString('en')} copies`);
c.ok('a star brought in and picked is what is copied', starSay.includes(`${want.toLocaleString('en')} copies`) && !starSay.includes('dots')
, starSay);
await c.shot('4-copies-triangle');

await page.click(`[...${row('shape')}.querySelectorAll('button')].find(b => b.textContent === 'tree')`);
await wait(400);
const tree = copiesOf({ shape: 'tree', ...SHAPES.tree.start }).copies.length;
c.ok('a tree picked starts from its own depth and ratio', (await value('generations')) === SHAPES.tree.start.depth
  && Math.abs((await value('each copy ×')) - SHAPES.tree.start.ratio) < 1e-9, `${await value('generations')} deep`);
const treeSay = await sayWith(`${tree.toLocaleString('en')} copies`);
c.ok('and has as many copies as its branches make', treeSay.includes(`${tree.toLocaleString('en')} copies`), treeSay);
await c.shot('5-copies-tree');

await set('scale', '2');
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
const before2 = fs.existsSync(DL) ? fs.readdirSync(DL).length : 0;
await page.click(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent === 'Download the picture (PNG)')`);
await page.until(`/^downloaded|failed/.test(${say})`, { timeout: 60000 });
let tfile = null;
for (let i = 0; i < 100 && !tfile; i++) {
  const f = fs.existsSync(DL) && fs.readdirSync(DL).find(n => n.startsWith('fractal_tree'));
  if (f) tfile = path.join(DL, f); else await wait(200);
}
const tsize = tfile ? (b => [b.readUInt32BE(16), b.readUInt32BE(20)])(fs.readFileSync(tfile)) : [0, 0];
c.ok('copies at print scale: the format at its scale, drawn again', tsize[0] === 2160 && tsize[1] === 2160, tsize.join(' × '));

// ── An idle: the twist swung, a loop ────────────────────────────────────────

await set('scale', '1');
const count = `(document.querySelector('.tp-count')?.textContent || '')`;
const scrubTo = async t => { await page.eval(`(() => { const s = document.querySelector('.tp-scrub'); s.value = ${t};
  s.dispatchEvent(new Event('input', { bubbles: true })); })()`); await wait(300); };
const grid = () => page.eval(`(() => { const c = document.getElementById('stage'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const n = 16, out = new Array(n * n).fill(0), k = new Array(n * n).fill(0);
  for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) { const i = (y * c.width + x) * 4, j = Math.floor(y * n / c.height) * n + Math.floor(x * n / c.width);
    out[j] += d[i] + d[i + 1] + d[i + 2]; k[j]++; }
  return out.map((v, j) => v / Math.max(1, k[j]) / 3); })()`);
const apart = (p, q) => Math.max(...p.map((x, i) => Math.abs(x - q[i])));

await page.eval(`(() => { const s = ${row('moving')}.querySelector('select'); s.value = 'twist';
  s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
await wait(500);
c.ok('picked to move, the twist starts from ±10 round its value', (await value('from')) === -10 && (await value('to')) === 10,
  `${await value('from')} to ${await value('to')}`);
const at0 = await page.eval(count);
await wait(700);
const at1 = await page.eval(count);
c.ok('and plays at once: a loop of its frames, moving', /^\d+ \/ 48$/.test(at1) && at1 !== at0, `${at0} → ${at1}`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))`);
await scrubTo(0);
const f0 = await grid();
await scrubTo(12);
const f12 = await grid();
c.ok('the tree sways: a quarter in, another picture', apart(f12, f0) > 2, 'apart by ' + apart(f12, f0).toFixed(1));
await scrubTo(47);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: '.' }))`);
await wait(300);
c.ok('the frame after the last is the first, pixel for pixel', (await page.eval(count)) === '1 / 48' && apart(await grid(), f0) === 0,
  `${await page.eval(count)}, apart by ${apart(await grid(), f0)}`);
await scrubTo(12);
await c.shot('6-idle');

// Saved: a sequence, the star its parent, replayed to its render.
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'S' }))`);
await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
const sid = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
const o = sid ? await (await fetch(c.base + '/api/vault/' + sid)).json() : null;
const starRow = ((await (await fetch(c.base + '/api/vault')).json()).objects || []).find(r => r.title === 'copy star');
c.ok('saved, an idle: a sequence of its frames at its rate', !!o && o.type === 'sequence' && o.render.frames === 48 && o.render.fps === 24,
  o ? `${o.type} ${o.render.frames} at ${o.render.fps}` : await page.eval(say));
c.ok('the sprite it copies is its parent', !!o && !!starRow && JSON.stringify(o.parents) === JSON.stringify([starRow.id]), o && JSON.stringify(o.parents));
/** A saved loop as the vault replays it: its length and rate, how far its frame 12 is from its render, and at scale 2. */
const replayOf = id => page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { openFrames } = await import('/core/rebuild.js');
  const { object, url } = await Vault.load(${JSON.stringify(id)});
  const h = await openFrames(object, { url });
  const img = await createImageBitmap(await (await fetch(url)).blob());
  const a = new OffscreenCanvas(img.width, img.height).getContext('2d'); a.drawImage(img, 0, 0);
  const b = new OffscreenCanvas(img.width, img.height).getContext('2d'); b.drawImage(h.frame(12), 0, 0);
  const da = a.getImageData(0, 0, img.width, img.height).data, db = b.getImageData(0, 0, img.width, img.height).data;
  let worst = 0; for (let i = 0; i < da.length; i++) worst = Math.max(worst, Math.abs(da[i] - db[i]));
  const big = await openFrames(object, { url, scale: 2 });
  const out = { length: h.length, fps: h.fps, worst, missing: h.missing, big: [big.scale, big.frame(0).width, h.width] };
  h.dispose(); big.dispose(); return out;
})()`);
if (o) {
  const replay = await replayOf(o.id);
  c.ok('the vault replays it, 48 frames at 24', replay.length === 48 && replay.fps === 24, JSON.stringify(replay).slice(0, 100));
  c.ok('its frame on screen is its render, pixel for pixel', replay.worst === 0, 'worst ' + replay.worst);
  c.ok('at scale 2, drawn again at twice the pixels', replay.big[0] === 2 && replay.big[1] === 2 * replay.big[2], JSON.stringify(replay.big));

  // The sheet: every frame, for a game.
  await page.eval(`document.querySelector('.bar-say').textContent = ''`);
  await page.click(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent === 'Download a sprite sheet')`);
  await page.until(`/^downloaded|failed/.test(${say})`, { timeout: 120000 });
  let sheetZip = null;
  for (let i = 0; i < 100 && !sheetZip; i++) {
    const f = fs.existsSync(DL) && fs.readdirSync(DL).find(n => n.endsWith('_sheet.zip'));
    if (f) sheetZip = path.join(DL, f); else await wait(200);
  }
  let sheet = null;
  if (sheetZip) {
    const b = fs.readFileSync(sheetZip);
    for (let off = 0; b.readUInt32LE(off) === 0x04034b50;) {
      const size = b.readUInt32LE(off + 18), nl = b.readUInt16LE(off + 26), name = b.slice(off + 30, off + 30 + nl).toString();
      if (name.endsWith('.json')) sheet = JSON.parse(b.slice(off + 30 + nl, off + 30 + nl + size).toString());
      off += 30 + nl + size;
    }
  }
  c.ok('a sprite sheet of every frame, two seconds long', !!sheet && sheet.frames.length === 48
    && sheet.frames.reduce((a, f) => a + f.duration, 0) === 2000, sheet ? `${sheet.frames.length} frames` : await page.eval(say));

  // Reopened, and placed on a page.
  await c.go(c.base + '/apps/fractals/?open=' + o.id);
  await page.until(`${say}.includes('opened') || ${say}.includes('could not')`, { timeout: 30000 });
  c.ok('?open= brings the idle back, its twist moving', (await page.eval(`${row('moving')}?.querySelector('select')?.value`)) === 'twist'
    && (await value('to')) === 10, await page.eval(say));
  await c.go(c.base + '/apps/compose/?place=' + o.id);
  await page.until(`${say}.includes(' on the page') || ${say}.includes('could not')`, { timeout: 60000 });
  c.ok('compose places it, a 24 fps loop of 48', (await page.eval(say)).includes('a 24 fps loop of 48'), await page.eval(say));
}

// ── Escape time moves: the ramp once round, a Julia c round a circle ────────

const key = async k => { await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)} }))`); await wait(300); };
/** The row of that name that shows: both families have a *moving*. */
const shown = name => `[...document.querySelectorAll('.pp-row')].find(r => !r.hidden && r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const moving = async what => { await page.eval(`(() => { const s = ${shown('moving')}.querySelector('select'); s.value = ${JSON.stringify(what)};
  s.dispatchEvent(new Event('change', { bubbles: true })); })()`); await wait(500); };
/** Playing at once; held, a quarter in another picture; the frame after the last the first. */
const closes = async label => {
  const a = await page.eval(count); await wait(700); const b = await page.eval(count);
  c.ok(`${label}: plays at once, a loop of 48`, /^\d+ \/ 48$/.test(b) && a !== b, `${a} → ${b}`);
  await key('.');
  await scrubTo(0); const g0 = await grid();
  await scrubTo(12); const g12 = await grid();
  c.ok(`${label}: a quarter in, another picture`, apart(g12, g0) > 2, 'apart by ' + apart(g12, g0).toFixed(1));
  await scrubTo(47); await key('.');
  c.ok(`${label}: the frame after the last is the first, pixel for pixel`, (await page.eval(count)) === '1 / 48' && apart(await grid(), g0) === 0,
    `${await page.eval(count)}, apart by ${apart(await grid(), g0)}`);
};

await c.go(c.base + '/apps/fractals/');
await page.until(`${say}.includes('mandelbrot')`, { timeout: 20000 });
await moving('phase');
c.ok('the ramp picked to move: once round from its phase', (await value('from')) === 0 && (await value('to')) === 1,
  `${await value('from')} to ${await value('to')}`);
await closes('the ramp round');
await c.shot('7-ramp-round');

await moving('julia');
const juliaSay = await sayWith('julia of');
c.ok('the Julia c picked to move: a Julia set, its c once round a circle', juliaSay.includes('julia of') && (await value('to')) === 360
  && (await page.eval(`!!${shown('radius round c')}`)), juliaSay);
await set('zoom', '1');
await set('centre x', '0');
await set('centre y', '0');
await closes('the Julia c round');
await scrubTo(12);
await c.shot('8-julia-round');

await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await key('S');
await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
const eid = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
const e = eid ? await (await fetch(c.base + '/api/vault/' + eid)).json() : null;
c.ok('saved, the Julia c round: a sequence of 48 at 24', !!e && e.type === 'sequence' && e.render.frames === 48 && e.render.fps === 24
  && e.recipe.moveEscape === 'julia', e ? `${e.type} ${e.render.frames} · ${e.title}` : await page.eval(say));
if (e) {
  const replay = await replayOf(e.id);
  c.ok('the vault replays it, its frame on screen its render, pixel for pixel', replay.length === 48 && replay.worst === 0,
    JSON.stringify(replay).slice(0, 100));
  c.ok('at scale 2, drawn again at twice the pixels', replay.big[0] === 2 && replay.big[1] === 2 * replay.big[2], JSON.stringify(replay.big));
  await c.go(c.base + '/apps/fractals/?open=' + e.id);
  await page.until(`${say}.includes('opened') || ${say}.includes('could not')`, { timeout: 30000 });
  c.ok('?open= brings it back, its c going round', (await page.eval(`${shown('moving')}?.querySelector('select')?.value`)) === 'julia'
    && Math.abs((await value('radius round c')) - 0.02) < 1e-12, await page.eval(say));
  await c.go(c.base + '/apps/compose/?place=' + e.id);
  await page.until(`${say}.includes(' on the page') || ${say}.includes('could not')`, { timeout: 60000 });
  c.ok('compose places it, a 24 fps loop of 48', (await page.eval(say)).includes('a 24 fps loop of 48'), await page.eval(say));
}

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
