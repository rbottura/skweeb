#!/usr/bin/env node
/**
 * scripts/check-layers.mjs — an object's layers (L13, 2026-11-12), in Chrome:
 * the overlay of every app, in its Stack section, kept state by state
 * (core/layers.js, layers-row.js, layers-draw.js, layers-view.js).
 *
 *   node scripts/check-layers.mjs
 *
 * A band in the vault: green along its top, see-through under it. In the 3D
 * app the Stack section is its last, the object's layers first and the
 * windows after; "+ overlay…" opens the vault, and a picture picked is a
 * layer in front, its line saying so. On the preview it is a canvas of its
 * own on the picture's box, the band at its top; behind, that canvas goes
 * under the picture's. Saved, the state's picture has the band, which is
 * its parent; replayed at twice its size, the band is drawn round it again;
 * printed in tiles, as it is drawn whole. A state from before it has none,
 * and Ctrl Z brings it back; E's picture to disk has it. Then every other app with a Stack — ckt,
 * compose, filter, fractals, grid, the map, the rig, the garden — shows the
 * band on its picture's box, fitted whole to its format, whatever its shape:
 * grid's its source's; the rig's the box a save fills, inside the room its
 * canvas shows round the drawing. And no page said anything wrong.
 */

import fs   from 'node:fs';
import path from 'node:path';
import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const layersRow = `document.querySelector('.pp-row[data-key="layers"]')`;
/** The layers set through their row's params, as its widget sets them. */
const setLayers = list => page.eval(`import('/core/param-rows.js').then(({ rowParams }) => rowParams(${layersRow}).params.set('layers', ${JSON.stringify(list)}))`);
const getLayers = () => page.eval(`import('/core/param-rows.js').then(({ rowParams }) => rowParams(${layersRow}).params.get('layers'))`);
const save = async () => {
  await page.eval(`document.querySelector('.bar-say').textContent = ''`);
  await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 's' }))`);
  await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
  await wait(300);
  return page.eval(say);
};
/** The layers' canvases on the preview: where each is against the app's, in the page and on the screen, and its band. */
const shown = canvasSel => page.eval(`(() => { const own = document.querySelector(${JSON.stringify(canvasSel)}); if (!own) return null;
  const o = own.getBoundingClientRect();
  return [...document.querySelectorAll('canvas.obj-layer')].map(c => { const r = c.getBoundingClientRect();
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let top = 0, all = 0, x0 = 1, y0 = 1, x1 = 0, y1 = 0;
    for (let p = 0; p < d.length / 4; p++) { const i = p * 4; if (d[i + 3] > 250 && d[i] < 8 && d[i + 1] > 247 && d[i + 2] < 8) {
      all++; const x = (p % c.width) / c.width, y = Math.floor(p / c.width) / c.height;
      if (y < 0.25) top++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
    return { before: !!(c.compareDocumentPosition(own) & Node.DOCUMENT_POSITION_FOLLOWING), off: Math.round(Math.abs(r.left - o.left) + Math.abs(r.top - o.top) + Math.abs(r.width - o.width) + Math.abs(r.height - o.height)),
             inside: r.left >= o.left - 1 && r.top >= o.top - 1 && r.right <= o.right + 1 && r.bottom <= o.bottom + 1 && r.width < o.width - 4,
             green: all, top: all ? +(top / all).toFixed(3) : 0, box: all ? [x0, y0, x1, y1].map(v => +v.toFixed(3)) : null, aspect: +(r.width / r.height).toFixed(4),
             blend: c.style.mixBlendMode, opacity: c.style.opacity,
             // Nothing of its own over the picture, and the checkerboard under the picture's canvas, not on it: one behind shows.
             clear: getComputedStyle(c).backgroundImage === 'none' && getComputedStyle(c).boxShadow === 'none'
               && getComputedStyle(own).backgroundImage === 'none' && getComputedStyle(own.parentElement).backgroundImage !== 'none' }; }); })()`);
/** Where the band should be on a picture of that aspect: the square fitted whole, centred, its top fifth green — as shares. */
const bandAt = aspect => {
  const sw = Math.min(1, 1 / aspect), sh = Math.min(1, aspect);   // the square's side, in shares of the width and of the height
  return [(1 - sw) / 2, (1 - sh) / 2, (1 + sw) / 2, (1 - sh) / 2 + 0.2 * sh];
};
const near = (a, b, by = 0.02) => !!a && !!b && a.every((v, i) => Math.abs(v - b[i]) <= by);
/** Green of the band in a picture's top quarter, as a share of what is green in it, and how much green there is. */
const bandIn = expr => page.eval(`(async () => { const f = await (${expr}); const c = new OffscreenCanvas(f.width, f.height); const x = c.getContext('2d'); x.drawImage(f, 0, 0);
  const d = x.getImageData(0, 0, f.width, f.height).data; let top = 0, all = 0;
  for (let p = 0; p < d.length / 4; p++) { const i = p * 4; if (d[i] < 24 && d[i + 1] > 230 && d[i + 2] < 24) { all++; if (p / f.width < f.height * 0.25) top++; } }
  return { size: [f.width, f.height], share: +(all / (d.length / 4)).toFixed(4), top: all ? +(top / all).toFixed(3) : 0 }; })()`);

await c.go(c.base + '/apps/3d/');
await page.until(`document.querySelectorAll('.pp-card').length === 3 && !!${layersRow}`, { timeout: 30000 });
await page.until(`!/three is still starting/.test(${say})`, { timeout: 30000 }).catch(() => {});

// A band: green along the top of a square, see-through under it — the picture an overlay is.
const band = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { thumbFromBlob } = await import('/core/thumb.js');
  const pic = new OffscreenCanvas(400, 400), g = pic.getContext('2d');
  g.fillStyle = '#00ff00'; g.fillRect(0, 0, 400, 80);
  const blob = await pic.convertToBlob({ type: 'image/png' });
  const o = await Vault.save({ type: 'shape', title: 'a band on top, square', tags: ['shape'], origin: { app: 'vault', version: '1.0.0' },
    seed: null, recipe: null, render: { blob, ext: 'png', w: 400, h: 400 }, thumb: await thumbFromBlob(blob) });
  await Vault.refresh();
  return o.id; })()`);
c.ok('a band on top, in the vault', !!band, String(band));

// ── The Stack section: the object's layers, then the windows ────────────────
const section = await page.eval(`(() => { const row = ${layersRow}, dr = row && row.closest('.dr');
  return { head: dr && dr.querySelector('.dr-head')?.textContent.trim(), last: !!dr && dr === dr.parentElement.lastElementChild,
    order: dr ? [...dr.querySelectorAll('.pp-row[data-key="layers"], .pp-stack-part, .pp-stack-note')].map(n => n.dataset.key || n.className) : [],
    add: [...(row?.querySelectorAll('.pp-layers-adds button') || [])].map(b => b.textContent) }; })()`);
c.ok('the Stack is the last section: the object\'s layers, then the windows', /^Stack/.test(section.head) && section.last
  && JSON.stringify(section.order) === '["layers","pp-stack-part","pp-stack-note"]' && JSON.stringify(section.add) === '["＋ overlay…"]', JSON.stringify(section));
const v1 = await save();                                // v1: no layer
await page.click(`[...${layersRow}.querySelectorAll('.pp-layers-adds button')].find(b => b.textContent === '＋ overlay…')`);
await page.until(`!!document.querySelector('.vp--visible [data-id="${band}"]')`, { timeout: 15000 }).catch(() => {});
await page.click(`[...document.querySelectorAll('.vp--visible .vp-cell')].find(x => x.querySelector('[data-id="${band}"]'))?.querySelector('.vp-use')`);
await page.until(`document.querySelectorAll('.pp-layer-row').length === 1`, { timeout: 10000 }).catch(() => {});
const line = await page.eval(`document.querySelector('.pp-layer-row')?.title || ''`);
c.ok('"+ overlay…": the vault, and the picture picked a layer in front', JSON.stringify((await getLayers()).map(l => [l.ref, l.at, l.on])) === JSON.stringify([[band, 'front', true]])
  && line.startsWith('a band on top, square — in front · shape · 400 × 400'), line);

await page.until(`document.querySelectorAll('canvas.obj-layer').length === 1`, { timeout: 15000 }).catch(() => {});
await wait(500);
const front = await shown('#stage');
c.ok('on the preview: a canvas of its own on the picture\'s box, over it, the band at its top', front && front.length === 1 && !front[0].before
  && front[0].off <= 2 && front[0].green > 1000 && front[0].top === 1, JSON.stringify(front));
c.ok("…nothing of its own over the picture, the checkerboard under the picture's canvas", !!(front && front[0] && front[0].clear), JSON.stringify(front && front[0]));
await setLayers([{ ref: band, at: 'behind', opacity: 0.5, blend: 'multiply' }]);
await wait(600);
const under = await shown('#stage');
c.ok('behind: under the picture\'s canvas, its opacity and blend the page\'s', under && under.length === 1 && under[0].before
  && under[0].opacity === '0.5' && under[0].blend === 'multiply', JSON.stringify(under));
await setLayers([{ ref: band }]);
await wait(400);

// ── Saved, replayed, printed ────────────────────────────────────────────────
const v2 = await save();
const kept = await page.eval(`(async () => { const { Vault } = await import('/core/vault.js'); const id = Vault.bound.id; const { object } = await Vault.load(id);
  return { id, version: object.version, parents: object.parents }; })()`);
const picture = await bandIn(`fetch('/vault/objects/${kept.id}/render.png', { cache: 'no-store' }).then(r => r.blob()).then(createImageBitmap)`);
const before = await bandIn(`fetch('/vault/objects/${kept.id}/versions/v1.png', { cache: 'no-store' }).then(r => r.blob()).then(createImageBitmap)`);
c.ok('saved: the state\'s picture has the band at its top, the band its parent', /^saved /.test(v1) && /^saved /.test(v2) && kept.version === 2
  && picture.share > 0.1 && picture.top === 1 && before.share === 0 && kept.parents.includes(band), JSON.stringify({ picture, before, kept }));
const replay = await bandIn(`import('/core/rebuild.js').then(async ({ openFrames }) => { const { Vault } = await import('/core/vault.js');
  const h = await openFrames((await Vault.load('${kept.id}')).object, { scale: 2 }); window.__layered = !!h.layered; return h.frame(0); })`);
c.ok('replayed at twice its size: drawn again, the band round it again', (await page.eval('window.__layered')) && replay.size[0] === picture.size[0] * 2
  && Math.abs(replay.share - picture.share) < 0.01 && replay.top === 1, JSON.stringify({ replay, picture }));
const print = await c.printMatch(kept.id, { scale: 2, tile: 512 });
c.ok('printed in tiles as it is drawn whole', print.enlarged === 1 && print.off < 0.002, JSON.stringify(print));

// ── A state before it, and Ctrl Z ───────────────────────────────────────────
await page.eval(`(async () => { const { backTo } = await import('/core/shell/graph.js'); await backTo(1); })()`);
await wait(800);
const none = [await getLayers(), await page.eval(`document.querySelectorAll('canvas.obj-layer').length`)];
await page.eval(`window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true }))`);
await page.until(`document.querySelectorAll('canvas.obj-layer').length === 1`, { timeout: 10000 }).catch(() => {});
const back = (await getLayers()).map(l => l.ref);
c.ok('a state from before it has none; Ctrl Z brings it back', JSON.stringify(none) === '[[],0]' && JSON.stringify(back) === JSON.stringify([band]),
  JSON.stringify({ none, back }));
await c.shot('01-3d-band');

// E's picture to disk: the band round it too, as a save's is.
const DL = path.join(c.dir, 'downloads');
await page.downloadsTo(DL);
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.click(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent === 'Download the picture (PNG)')`);
await page.until(`/^downloaded|failed/.test(${say})`, { timeout: 60000 }).catch(() => {});
let file = null;
for (let i = 0; i < 100 && !file; i++) {
  const n = fs.existsSync(DL) && fs.readdirSync(DL).find(x => x.endsWith('.png'));
  if (n) file = path.join(DL, n); else await wait(200);
}
const disk = file ? await bandIn(`fetch('data:image/png;base64,${fs.readFileSync(file).toString('base64')}').then(r => r.blob()).then(createImageBitmap)`) : null;
c.ok("E's picture to disk: the band round it too", !!disk && Math.abs(disk.share - picture.share) < 0.01 && disk.top === 1, JSON.stringify(disk));

// ── Every app with a Stack ──────────────────────────────────────────────────
// Each opened on something to show where it needs it: filter on the band as its source, the rig on a drawing of the vault.
const index = (await (await fetch(c.base + '/api/vault')).json()).objects || [];
const drawing = index.find(o => o.type === 'still' && o.origin && o.origin.app === 'gamepad' && !(o.tags || []).includes('trash'));
const APPS = [['ckt', '#stage'], ['compose', '#page'], ['filter', '#stage', { source: band }], ['fractals', '#stage'], ['grid', '#stage', { source: band }],
  ['map', '#stage'], ...(drawing ? [['rig', '#stage', null, '?drawing=' + drawing.id]] : []), ['map/garden', '#gd-stage']];
if (!drawing) console.log('     no gamepad drawing in this vault: the rig goes unchecked');
for (const [app, canvasSel, values, query = ''] of APPS) {
  await c.go(c.base + `/apps/${app}/${query}`);
  await page.until(`!!${layersRow}`, { timeout: 30000 }).catch(() => {});
  if (!(await page.eval(`!!${layersRow} && !!document.querySelector('${canvasSel}')`))) { c.ok(`${app}: its Stack has the object's layers`, false); continue; }
  if (values) await page.eval(`import('/core/param-rows.js').then(({ rowParams }) => rowParams(${layersRow}).params.set(${JSON.stringify(values)}))`);
  await wait(values || query ? 2500 : 300);
  await setLayers([{ ref: band }]);
  await page.until(`document.querySelectorAll('canvas.obj-layer').length === 1`, { timeout: 15000 }).catch(() => {});
  await wait(600);
  const there = await shown(canvasSel);
  const want = there && there[0] ? bandAt(there[0].aspect).map(v => +v.toFixed(3)) : null;
  // The rig's picture is the box a save fills, inside its canvas's room round the drawing; any other's, its canvas.
  const placed = there && there[0] && (app === 'rig' ? there[0].inside : there[0].off <= 2);
  c.ok(`${app}: the band on its picture's box, fitted whole`, there && there.length === 1 && !there[0].before && placed && near(there[0].box, want),
    JSON.stringify({ there, want }));
}
await c.shot('02-garden-band');

const noise = c.quiet();
c.ok('no page said anything wrong', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
