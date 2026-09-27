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
const row = name => `[...document.querySelectorAll('.pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
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

await c.go(c.plain + '/apps/fractals/');
await page.until(`${say}.includes('mandelbrot') || ${say}.includes('no fractals')`, { timeout: 20000 });
const gpu = !(await page.eval(say)).includes('no fractals');
c.ok('opens with no vault, and draws', gpu, await page.eval(say));

await c.go(c.base + '/apps/fractals/');
const plainNoise = c.quiet().filter(e => !(e.url || '').endsWith('/api/vault'));
c.ok('with no vault it said nothing else', !plainNoise.length, JSON.stringify(plainNoise).slice(0, 300));
await page.until(`${say}.includes('mandelbrot') || ${say}.includes('no fractals')`, { timeout: 20000 });
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

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
