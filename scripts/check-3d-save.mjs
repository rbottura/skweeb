#!/usr/bin/env node
/**
 * scripts/check-3d-save.mjs — M10's app in Chrome: a model saved, and what is
 * made of it.
 *
 *   node scripts/check-3d-save.mjs
 *
 * A model made here — the opening's box, sphere and torus, the box twisted
 * and displaced by a stack of modifiers, in three bands of light with an
 * outline and shadows — saved: a `model` whose recipe is its shapes, their
 * stacks and its style, and whose render is the format; drawn again by its
 * app it is its render; at scale 2 it is drawn again at twice the pixels,
 * the same picture; `?open=` brings its shapes and the box's stack back;
 * compose places it; the PNG is the format at its scale. And no page said
 * anything wrong. Split from check-3d.mjs on 2026-10-22, at the line cap;
 * the model's print is check-print.mjs's.
 */

import fs   from 'node:fs';
import path from 'node:path';
import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const panelRow = name => `[...document.querySelectorAll('#side > .pp > .pp-body .pp-row:not(.pp-stack-layer .pp-row)')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const value = name => page.eval(`Number(${panelRow(name)}?.querySelector('.pp-num')?.value)`);
/** The shapes' cards — not the modifiers' inside them. */
const cards = `[...document.querySelectorAll('.pp-card')].filter(c => !c.parentElement.closest('.pp-card'))`;
const modCards = i => `[...${cards}[${i}].querySelectorAll('.pp-card')]`;
const cardRow = (i, name) => `[...${cards}[${i}].querySelectorAll('.pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const drawn = `/box, sphere, torus|nothing draws/.test(${say})`;
/** Each card as the choice has it. */
const choice = () => page.eval(`${cards}.map(c => c.classList.contains('pp-card--chosen') ? 'chosen' : c.classList.contains('pp-card--folded') ? 'folded' : 'open').join(' ')`);

// ── A model to save: the box's stack of modifiers, and a style ──────────────

await c.go(c.base + '/apps/3d/');
await page.until(drawn, { timeout: 30000 });
await page.click(`${cards}[0].querySelector('.pp-title')`);
await wait(300);
const modMenu = `${cards}[0].querySelector('.pp-cards-add')`;
for (const id of ['subdivide', 'twist', 'displace']) await page.typeInto(modMenu, id);
await wait(400);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
await wait(300);
await page.typeInto(`${panelRow('bands of light — 0, smooth')}?.querySelector('.pp-num')`, '3');
await page.typeInto(`${panelRow('outline, thousandths of its height')}?.querySelector('.pp-num')`, '6');
await page.click(`${panelRow('shadows, on a ground of their own')}?.querySelector('input')`);
await wait(600);

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
const kept = o && o.recipe.shapes[0].modifiers;
c.ok('…the box\'s stack kept with it, in order', !!kept && kept.map(m => `${m.id}:${m.on}`).join() === 'subdivide:true,twist:true,displace:true'
  && kept[1].params.angle === 90, JSON.stringify(kept));
c.ok('…and its style, three bands, an outline, shadows', !!o && o.recipe.toon === 3 && o.recipe.outline === 6 && o.recipe.shadows === true, o && `${o.recipe.toon} ${o.recipe.outline} ${o.recipe.shadows}`);
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
  c.ok('?open= brings its shapes back, folded, the box\'s stack too', (await page.eval(`${cards}.length`)) === 3
    && (await page.eval(`Number(${cardRow(1, 'radius')}?.querySelector('.pp-num')?.value)`)) === 0.6
    && Math.abs((await value('distance')) - o.recipe.distance) < 1e-9 && (await choice()) === 'folded folded folded'
    && (await page.eval(`${modCards(0)}.map(m => m.querySelector('.pp-title').textContent).join()`)) === 'subdivide,twist,displace'
    && (await value('bands of light — 0, smooth')) === 3 && (await value('outline, thousandths of its height')) === 6, await page.eval(say));

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

const noise = c.quiet();
c.ok('no page said anything wrong', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
