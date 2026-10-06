#!/usr/bin/env node
/**
 * scripts/check-3d.mjs — M10's app in Chrome: primitives drawn by three.js.
 *
 *   node scripts/check-3d.mjs
 *
 * Served as plain files with no vault, it opens and draws its box, sphere
 * and torus (rule 7) — with WebGPU, or WebGL2 where Chrome gives no WebGPU,
 * and the bar says which. On the server: the sphere in the middle is blue
 * and lit, the corners the ground; a shape added from the menu is drawn, a
 * hidden one is not, a card's value moves its shape, and one taken out goes;
 * a drag turns round the model by as much as camera.js says, the right
 * button slides it, the wheel comes nearer, F frames it. Saved: a `model`
 * whose recipe is its shapes and whose render is the format; drawn again by
 * its app it is its render; at scale 2 it is drawn again at twice the
 * pixels, the same picture; `?open=` brings its shapes back; compose places
 * it; the PNG is the format at its scale. With WebGPU taken away, as the
 * laptop's Intel has it, three draws the same opening with WebGL2. And no
 * page said anything wrong.
 */

import fs   from 'node:fs';
import path from 'node:path';
import { startCheck } from './check-kit.mjs';
import { TURN } from '../apps/3d/camera.js';

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const panelRow = name => `[...document.querySelectorAll('#side > .pp > .pp-body .pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const value = name => page.eval(`Number(${panelRow(name)}?.querySelector('.pp-num')?.value)`);
const cards = `[...document.querySelectorAll('.pp-card')]`;
const cardRow = (i, name) => `[...${cards}[${i}].querySelectorAll('.pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const headButton = (i, label) => `[...${cards}[${i}].querySelectorAll('.pp-head .pp-btn')].find(b => b.textContent === ${JSON.stringify(label)})`;
/** A pixel of the preview, at a fraction of its width and height. */
const pixelAt = (fx, fy) => page.eval(`(() => { const c = document.getElementById('stage');
  const x = Math.min(c.width - 1, Math.round(${fx} * c.width)), y = Math.min(c.height - 1, Math.round(${fy} * c.height));
  return [...c.getContext('2d').getImageData(x, y, 1, 1).data]; })()`);
/** The preview as a grid of samples, to tell two pictures apart. */
const grid = () => page.eval(`(() => { const c = document.getElementById('stage'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const out = []; for (let y = 0.05; y < 1; y += 0.1) for (let x = 0.05; x < 1; x += 0.1) { const i = (Math.floor(y * c.height) * c.width + Math.floor(x * c.width)) * 4; out.push(d[i], d[i + 1], d[i + 2]); } return out; })()`);
const apart = (a, b) => a.reduce((m, x, i) => Math.max(m, Math.abs(x - b[i])), 0);
/** Where a fraction of the preview is on screen — a whole pixel, as Chrome's mouse events are. */
const onStage = (fx, fy) => page.eval(`(() => { const r = document.getElementById('stage').getBoundingClientRect();
  return [Math.round(r.left + ${fx} * r.width), Math.round(r.top + ${fy} * r.height)]; })()`);
const stageHeight = () => page.eval(`document.getElementById('stage').getBoundingClientRect().height`);
const drawn = `/box, sphere, torus|nothing draws/.test(${say})`;
const isBlue = ([r, g, b]) => b > r + 40 && b > g;
const GROUND = [255, 253, 246];
const isGround = p => apart(p.slice(0, 3), GROUND) <= 2;

// ── Rule 7 ──────────────────────────────────────────────────────────────────

await c.go(c.plain + '/apps/3d/');
await page.until(drawn, { timeout: 30000 });
const firstSay = await page.eval(say);
c.ok('opens with no vault, and draws its box, sphere and torus', firstSay.startsWith('box, sphere, torus'), firstSay);
const backend = (firstSay.match(/(WebGPU|WebGL2)$/) || [])[1] || 'none';
console.log(`     drawn with ${backend}`);

await c.go(c.base + '/apps/3d/');
const plainNoise = c.quiet().filter(e => !(e.url || '').endsWith('/api/vault'));
c.ok('with no vault it said nothing else', !plainNoise.length, JSON.stringify(plainNoise).slice(0, 300));
await page.until(drawn, { timeout: 30000 });
await wait(400);

// ── The picture ─────────────────────────────────────────────────────────────

const middle = await pixelAt(0.5, 0.5);
c.ok('the sphere in the middle: blue, and lit', isBlue(middle) && middle[3] === 255, JSON.stringify(middle));
const corners = await Promise.all([[0.02, 0.02], [0.98, 0.02], [0.02, 0.98], [0.98, 0.98]].map(([x, y]) => pixelAt(x, y)));
c.ok('the corners are the ground', corners.every(isGround), JSON.stringify(corners[0]));
const lit = await pixelAt(0.5, 0.42), shade = await pixelAt(0.5, 0.58);
c.ok('lit from above: the top of the sphere brighter than its foot', lit[2] > shade[2], `${lit[2]} over ${shade[2]}`);
c.ok('three cards, the shapes drawer says 3', (await page.eval(`${cards}.length`)) === 3
  && (await page.eval(`document.querySelector('.dr-note')?.textContent`)) === '3');
await c.shot('1-opening');

// ── Shapes by hand ──────────────────────────────────────────────────────────

await page.typeInto(`document.querySelector('.pp-cards-add')`, 'cone');
await page.until(`${say}.startsWith('box, sphere, torus, cone')`, { timeout: 10000 }).catch(() => {});
c.ok('a cone added from the menu is drawn, and named', (await page.eval(say)).startsWith('box, sphere, torus, cone')
  && (await page.eval(`${cards}.length`)) === 4, await page.eval(say));
c.ok('…beside the others, in the next colour', (await page.eval(`Number(${cardRow(3, 'x')}?.querySelector('.pp-num')?.value)`)) === 3.2
  && (await page.eval(`${cardRow(3, 'colour')}?.querySelector('input')?.value`)) === '#1b998b');

const before = await grid();
await page.typeInto(`${cardRow(1, 'radius')}?.querySelector('.pp-num')`, '0.3');
await wait(400);
const away = await pixelAt(0.5, 0.39);
c.ok('a smaller sphere: where it was is ground now', isGround(away) && apart(await grid(), before) > 0, JSON.stringify(away));

await page.click(headButton(1, 'shown'));
await wait(400);
c.ok('hidden: the sphere is not drawn, nor named', isGround(await pixelAt(0.5, 0.5)) && !(await page.eval(say)).includes('sphere')
  && (await page.eval(`document.querySelector('.dr-note')?.textContent`)) === '3 of 4 shown', await page.eval(say));
await page.click(headButton(1, 'hidden'));
await page.click(headButton(3, '✕'));
await wait(400);
c.ok('taken out: three cards again, the sphere back', (await page.eval(`${cards}.length`)) === 3 && isBlue(await pixelAt(0.5, 0.5)),
  await page.eval(say));
await page.typeInto(`${cardRow(1, 'radius')}?.querySelector('.pp-num')`, '0.6');
await wait(300);

// ── The view, by hand ───────────────────────────────────────────────────────

const yaw0 = await value('turned °'), pitch0 = await value('raised °');
const [ax, ay] = await onStage(0.5, 0.5), [bx, by] = await onStage(0.62, 0.55);
const h = await stageHeight();
const turned = await grid();
await page.pointer([ax, ay], [bx, by], 8);
await wait(300);
const yaw1 = await value('turned °'), pitch1 = await value('raised °');
const wantYaw = yaw0 - (bx - ax) * TURN / h, wantPitch = pitch0 + (by - ay) * TURN / h;
c.ok('a drag turns round the model, as far as the pointer went', Math.abs(yaw1 - wantYaw) < 0.01 && Math.abs(pitch1 - wantPitch) < 0.01,
  `yaw ${yaw0} → ${yaw1.toFixed(2)} (${wantYaw.toFixed(2)}), pitch ${pitch0} → ${pitch1.toFixed(2)} (${wantPitch.toFixed(2)})`);
c.ok('…and the picture turned', apart(await grid(), turned) > 20);
await c.shot('2-turned');

const tx0 = await value('looking at x'), ty0 = await value('looking at y');
await page.pointer([ax, ay], [ax + 40, ay + 30], 6, { button: 'right' });
await wait(300);
c.ok('the right button slides what is looked at', (await value('looking at x')) !== tx0 || (await value('looking at y')) !== ty0,
  `x ${tx0} → ${await value('looking at x')}, y ${ty0} → ${await value('looking at y')}`);

const d0 = await value('distance');
await page.eval(`document.getElementById('stage').dispatchEvent(new WheelEvent('wheel', { clientX: ${ax}, clientY: ${ay}, deltaY: -300, bubbles: true, cancelable: true }))`);
await wait(300);
const d1 = await value('distance');
c.ok('the wheel comes nearer', d1 < d0 && Math.abs(d1 - d0 * Math.exp(-300 * 0.0015)) < 1e-6, `${d0} → ${d1}`);

await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'F' }))`);
await wait(400);
const framed = [await value('looking at x'), await value('looking at y'), await value('distance')];
c.ok('F frames every shape: looking at their middle, from far enough', Math.abs(framed[0]) < 0.1 && Math.abs(framed[1]) < 0.1
  && framed[2] > 3, JSON.stringify(framed.map(x => +x.toFixed(3))));
c.ok('…and every corner is still ground', (await Promise.all([[0.02, 0.02], [0.98, 0.98]].map(([x, y]) => pixelAt(x, y)))).every(isGround));
await c.shot('3-framed');

// ── Saved, replayed, drawn again ────────────────────────────────────────────

await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'S' }))`);
await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
const mid = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
const o = mid ? await (await fetch(c.base + '/api/vault/' + mid)).json() : null;
c.ok('saved: a model, made by 3d, titled by its shapes', !!o && o.type === 'model' && o.origin.app === '3d'
  && o.title === 'box, sphere, torus' && /^3d_/.test(o.id), o ? `${o.id} ${o.type} "${o.title}"` : await page.eval(say));
c.ok('its recipe: the view and its shapes, no vertices', !!o && o.recipe.shapes.length === 3 && o.recipe.shapes[1].id === 'sphere'
  && o.recipe.shapes[1].params.radius === 0.6 && typeof o.recipe.yaw === 'number' && !JSON.stringify(o.recipe).includes('position'));
c.ok('its render: the format, 1080 square', !!o && o.render.w === 1080 && o.render.h === 1080 && o.render.file === 'render.png',
  o && `${o.render.w} × ${o.render.h} ${o.render.file}`);

/** A saved model as the vault replays it: at its size, drawn again by its app, and at scale 2. */
const replayOf = id => page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { openFrames } = await import('/core/rebuild.js');
  const app = await import('/apps/3d/rebuild.js');
  const { object, url } = await Vault.load(${JSON.stringify(id)});
  const img = await createImageBitmap(await (await fetch(url)).blob());
  const read = (src, w, h) => { const x = new OffscreenCanvas(w, h).getContext('2d'); x.drawImage(src, 0, 0, w, h); return x.getImageData(0, 0, w, h).data; };
  const render = read(img, img.width, img.height);
  const own = await app.openObject(object, { url });
  const again = read(own.frame(0), img.width, img.height);
  let worst = 0, off = 0;
  for (let i = 0; i < render.length; i++) { const d = Math.abs(render[i] - again[i]); worst = Math.max(worst, d); if (d > 8) off++; }
  const big = await openFrames(object, { url, scale: 2 });
  const bigFrame = big.frame(0);
  const down = read(bigFrame, img.width, img.height);
  let mean = 0; for (let i = 0; i < render.length; i++) mean += Math.abs(render[i] - down[i]); mean /= render.length;
  const out = { worst, off: off / render.length, big: [big.scale, bigFrame.width, bigFrame.height], mean, missing: own.missing,
                atOwn: (await openFrames(object, { url })).scale };
  own.dispose(); big.dispose(); return out;
})()`);
if (o) {
  const replay = await replayOf(o.id);
  c.ok('drawn again by its app, it is its render', replay.off < 0.001 && replay.worst <= 64,
    `worst ${replay.worst}, ${(replay.off * 100).toFixed(3)}% past 8`);
  c.ok('at its own size the vault shows its render', replay.atOwn === 1);
  c.ok('at scale 2: drawn again, twice the pixels', replay.big[0] === 2 && replay.big[1] === 2160 && replay.big[2] === 2160, JSON.stringify(replay.big));
  c.ok('…the same picture, sharper', replay.mean < 2, `mean difference ${replay.mean.toFixed(3)} of 255`);
  c.ok('…with nothing missing', replay.missing.length === 0);

  await c.go(c.base + '/apps/3d/?open=' + o.id);
  await page.until(`${say}.includes('opened') || ${say}.includes('could not')`, { timeout: 30000 });
  c.ok('?open= brings its shapes back', (await page.eval(`${cards}.length`)) === 3
    && (await page.eval(`Number(${cardRow(1, 'radius')}?.querySelector('.pp-num')?.value)`)) === 0.6
    && Math.abs((await value('distance')) - o.recipe.distance) < 1e-9, await page.eval(say));

  await c.go(c.base + '/apps/compose/?place=' + o.id);
  await page.until(`${say}.includes(' on the page') || ${say}.includes('could not')`, { timeout: 60000 });
  c.ok('compose places it', (await page.eval(say)).includes('box, sphere, torus — model'), await page.eval(say));
  await c.shot('4-placed');
}

// ── The PNG: the format at its scale, drawn again ───────────────────────────

await c.go(c.base + '/apps/3d/');
await page.until(drawn, { timeout: 30000 });
const DL = path.join(c.dir, 'downloads');
await page.downloadsTo(DL);
await page.typeInto(`${panelRow('scale')}?.querySelector('.pp-num')`, '2');
await wait(300);
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

// ── With no WebGPU: three falls back to WebGL2, as on the laptop's Intel ────

const stub = await page.beforeLoad(`Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });`);
await c.go(c.base + '/apps/3d/');
await page.until(drawn, { timeout: 30000 });
const fallback = await page.eval(say);
c.ok('no WebGPU: drawn with WebGL2, and the bar says so', fallback.endsWith('WebGL2'), fallback);
c.ok('…the same opening: the sphere blue in the middle, the corners ground', isBlue(await pixelAt(0.5, 0.5)) && isGround(await pixelAt(0.02, 0.02)));
await c.shot('5-webgl2');
await page.forget(stub);

const noise = c.quiet();
c.ok('no page said anything wrong', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
