#!/usr/bin/env node
/**
 * scripts/check-print.mjs — a print in tiles from every app that keeps
 * objects in this vault, each against the same object drawn whole.
 *
 *   node scripts/check-print.mjs
 *
 * A print past any canvas (core/print.js) asks an object's app for windows
 * of its picture at the print's scale: here each app's object is printed in
 * small tiles and held against the object drawn whole at the same scale —
 * the same picture, no seam where tiles meet — and the app is shown to draw
 * every window itself, nothing enlarged. Apps whose objects this vault has
 * not got are checked in their own checks (check-rig, check-map,
 * check-compose). A gamepad still is drawn again from its marks by core
 * (core/stage/still.js): one painted here as the gamepad paints — within a
 * rasterizer's edges, and a frame a pixel off told apart — mirrored and
 * framed past its canvas's edge, is its render; a real one is, but for the
 * edges another rasterizer drew. Then the gamepad's print box from end to
 * end: a drawing made with a pad, E, a sheet at a low dpi, the PNG
 * downloaded — its size, its dpi, the drawing on it. And the 3D app's: a
 * model made here, printed in twelve tiles against it drawn whole, and its
 * print panel from end to end — moved from check-3d.mjs on 2026-10-22. And
 * no page said anything wrong.
 */

import fs   from 'node:fs';
import path from 'node:path';
import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const wait = ms => new Promise(r => setTimeout(r, ms));

const index = (await (await fetch(c.base + '/api/vault')).json()).objects || [];
/** The newest object an app made of a kind, out of the trash. */
const newest = (app, types) => index.filter(o => (o.origin ? o.origin.app : o.app) === app && types.includes(o.type)
  && !(o.tags || []).includes('trash') && !(o.tags || []).includes('leaf')).sort((a, b) => (b.created || '').localeCompare(a.created || ''))[0];

await c.go(c.base + '/apps/compose/');
await wait(500);
const gpu = await page.eval(`(async () => !!(navigator.gpu && await navigator.gpu.requestAdapter()))()`);

for (const [app, types, scale] of [
  ['particles', ['still', 'sequence'], 2],
  ['fractals', ['still', 'sequence'], 2],
  ['ckt', ['still', 'sequence'], 2],
  ['grid', ['still', 'sequence'], 2],
  ['filter', ['still', 'sequence'], 2],
  ['gamepad', ['still'], 2],
]) {
  const object = newest(app, types);
  if (!object) { console.log(`     no ${app} object in this vault — skipped`); continue; }
  if (app === 'filter' && !gpu) { console.log('     no WebGPU here: a filter object is its picture — skipped'); continue; }
  const printed = await c.printMatch(object.id, { scale });
  c.ok(`${app}: printed in ${printed.tiles} tiles, the object drawn whole — its app drawing each window`,
    printed.enlarged === 1 && printed.off < 0.002 && printed.mean < 0.3, `${object.id} ${JSON.stringify(printed)}`);
}

// Escape time, which this vault may not hold: an envelope made of the app's own values, Mandelbrot at zoom 3.
const escape = await c.printMatch(null, { scale: 3, make: `(async () => {
  const { fractalParams } = await import('/apps/fractals/params.js');
  const recipe = { ...fractalParams().values, family: 'escape', kind: 'mandelbrot', zoom: 3, cx: -0.7, cy: 0.1, width: 300, height: 220, scale: 1 };
  return { type: 'still', origin: { app: 'fractals' }, recipe, render: { w: 300, h: 220 } };
})()` });
// The GPU's floats are 32 bits: a window reaches a point of the plane by another sum, and on the set's
// edge a point rounded the other way escapes at another count. Both pictures are right; so the edge's
// pixels may differ, and nothing else.
c.ok(`fractals' escape time: printed in ${escape.tiles} tiles, the plane drawn whole — each window its own part of it`,
  escape.enlarged === 1 && escape.off < 0.01 && escape.mean < 1, JSON.stringify(escape));

// A filter that reads round each pixel and places by position, its edges grown, over a gamepad still
// drawn again from its marks: each window the chain over its part of the source, run as that part.
const under = newest('gamepad', ['still']);
if (gpu && under) {
  const chained = await c.printMatch(null, { scale: 2, make: `({ type: 'still', origin: { app: 'filter' }, recipe: {
    source: ${JSON.stringify(under.id)}, edges: 'grow', seed: 7, chain: [
      { id: 'blur', params: { radius: 3 }, on: true },
      { id: 'shadow', params: { x: 6, y: 9, softness: 4, colour: '#202060', opacity: 0.6 }, on: true },
      { id: 'halftone', params: { cell: 7, angle: 30, paper: 'none' }, on: true },
      { id: 'vignette', params: { strength: 0.8 }, on: true },
      { id: 'grain', params: { amount: 0.25, moving: false }, on: true },
      { id: 'outline', params: { width: 2 }, on: true },
    ] } })` });
  c.ok(`a filter's blur, shadow, halftone, vignette, grain and outline, grown: ${chained.tiles} tiles, the chain run whole`,
    chained.enlarged === 1 && chained.off < 0.002 && chained.mean < 0.3, JSON.stringify(chained));
  // Filters that spread nowhere and read far: a block's colour, a cell's — what a window takes round it
  // is how far a chain reads (runner.js readsOf), not how far it reaches.
  const read = await c.printMatch(null, { scale: 2, make: `({ type: 'still', origin: { app: 'filter' }, recipe: {
    source: ${JSON.stringify(under.id)}, edges: 'keep', chain: [
      { id: 'erode', params: { radius: 2 } }, { id: 'unsharp', params: { radius: 3 } }, { id: 'emboss' },
      { id: 'pixelate', params: { size: 13 } }, { id: 'dots', params: { cell: 9 } },
    ] } })` });
  c.ok(`erode, unsharp, emboss, pixelate and dots: ${read.tiles} tiles, the chain run whole — each window what it reads`,
    read.enlarged === 1 && read.off < 0.002 && read.mean < 0.3, JSON.stringify(read));
  const zoom = await page.eval(`(async () => {
    const { openFrames } = await import('/core/rebuild.js');
    const h = await openFrames({ type: 'still', origin: { app: 'filter' }, recipe: { source: ${JSON.stringify(under.id)},
      chain: [{ id: 'zoomblur' }] } }, { scale: 2 });
    const out = typeof h.window;
    h.dispose();
    return out;
  })()`);
  c.ok('a zoom blur reads from anywhere: no window, so a print draws it whole', zoom === 'undefined', zoom);
}

// ── A gamepad still, drawn again from its marks ─────────────────────────────

/** Two pictures over white, as they are seen: how far apart. Transparent edges say nothing else. */
const apart = `(a, b, w, h) => {
  const read = s => { const x = new OffscreenCanvas(w, h).getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); x.drawImage(s, 0, 0); return x.getImageData(0, 0, w, h).data; };
  const p = read(a), q = read(b);
  let sum = 0, worst = 0, off = 0;
  for (let i = 0; i < p.length; i++) { const d = Math.abs(p[i] - q[i]); sum += d; worst = Math.max(worst, d); if (d > 8) off++; }
  return { mean: sum / p.length, worst, off: off / p.length };
}`;
const painted = await page.eval(`(async () => {
  const { stampPoints } = await import('/core/stamp.js');
  const { openStill } = await import('/core/stage/still.js');
  const sprite = await createImageBitmap(await (await fetch('/apps/gamepad/gamepad_sprites/brushes/sprite(9).png')).blob());
  const marks = Array.from({ length: 24 }, (_, i) => ({ x: 30 + i * 9, y: 140 + 60 * Math.sin(i / 3), rotation: i * 0.4,
    scale: 0.3 + 0.02 * i, familyId: 'brushes', spriteIndex: 8, pattern: 'mirror-xy' }));
  // The canvas as the gamepad paints it (joyImage.js _drawTo), then framed as a save frames it
  // (stillFrame.js composite): the frame reaching past the canvas's left edge, set in from the still's.
  const overlay = new OffscreenCanvas(500, 400), g = overlay.getContext('2d');
  for (const m of marks) for (const [x, y, r, flip] of stampPoints(m.x, m.y, m.rotation, m.pattern, 500, 400)) {
    g.setTransform(1, 0, 0, 1, x, y); g.rotate(r); g.scale(m.scale * flip, m.scale); g.drawImage(sprite, -sprite.width / 2, -sprite.height / 2);
  }
  const from = { x: -20, y: 60, w: 300, h: 280 }, to = { x: 12, y: 8, w: 300, h: 280 };
  /** The gamepad's composite: the canvas copied through the frame, dx pixels right of where it goes. */
  const framed = dx => {
    const still = new OffscreenCanvas(324, 296), s = still.getContext('2d');
    s.fillStyle = '#ffffff'; s.fillRect(0, 0, 324, 296);
    s.drawImage(overlay, from.x, from.y, from.w, from.h, to.x + dx, to.y, to.w, to.h);
    return still;
  };
  const recipe = { canvas: { w: 500, h: 400, background: '#ffffff' }, frame: { from, to, w: 324, h: 296 }, marks };
  const h = await openStill({ type: 'still', recipe, render: { w: 324, h: 296 } }, { scale: 1 });
  return { right: (${apart})(h.frame(0), framed(0), 324, 296), pixelOff: (${apart})(h.frame(0), framed(1), 324, 296) };
})()`);
// Within a rasterizer's edges, never to the pixel (STATUS.md, *Tests*): Chrome 155 draws a sprite's
// turned edges a little differently by what the page drew with that picture before — measured
// 2026-10-22, 0.13 of 255 and 0.4% of values past 8 here, 0.0009 in a fresh page — where the
// frame one pixel off is 2.8 and 3.6%. The bounds sit between, and the second check proves
// that they still tell the two apart.
const close = p => p.mean < 0.5 && p.off < 0.01;
c.ok('a still painted as the gamepad paints, drawn again from its marks: its render', close(painted.right),
  JSON.stringify(painted.right));
c.ok('…and the same frame a pixel off is told apart from it', !close(painted.pixelOff), JSON.stringify(painted.pixelOff));

const drawing = newest('gamepad', ['still']);
if (drawing) {
  const real = await page.eval(`(async () => {
    const { Vault } = await import('/core/vault.js');
    const { openStill } = await import('/core/stage/still.js');
    const { object, url } = await Vault.load(${JSON.stringify(drawing.id)});
    const h = await openStill(object, { scale: 1 });
    const bmp = await createImageBitmap(await (await fetch(url)).blob());
    return { ...(${apart})(h.frame(0), bmp, bmp.width, bmp.height), marks: object.recipe.marks.length, missing: h.missing };
  })()`);
  // Its render was drawn on a canvas Chrome had moved off the GPU — every save reads it back — and a
  // canvas still on the GPU draws a sprite's edges its own way, a sprite shrunk to a quarter its own
  // grain: up to 1.6 apart, fresh; 0.001 once this page's canvases are read back too. The drawing is
  // all there, where it was.
  c.ok(`a real one, ${real.marks} marks: its render, but for edges another rasterizer drew`, real.mean < 2.5 && !real.missing.length,
    `${drawing.id} ${JSON.stringify(real)}`);
}

// ── The gamepad's print box, from end to end ────────────────────────────────

const DL = path.join(c.dir, 'downloads');
await page.downloadsTo(DL);
await c.go(c.base + '/apps/gamepad/');
await page.until(`!!document.querySelector('.bsel-card')`, { timeout: 20000 });
// The brushes family alone, which is in git: Clear All, then its card.
await page.eval(`(() => {
  [...document.querySelectorAll('button')].find(b => b.textContent.trim() === 'Clear All')?.click();
  [...document.querySelectorAll('.bsel-card')].find(c => c.textContent.trim().startsWith('brushes'))?.click();
})()`);
await page.click(`document.querySelector('#bsel-launch')`);
await page.until(`!!document.querySelector('#sketch-container canvas') && !!document.querySelector('.gp-print')`, { timeout: 20000 });
await wait(500);
// A pad that is not there: its stick held over, A held, the right stick turning — a stroke, then mirrored.
const drew = await page.eval(`(async () => {
  const { InputManager } = await import('/apps/gamepad/core/inputManager.js');
  const { SequenceRecorder } = await import('/core/stage/recorder.js');
  const pad = (ax, ay, turn, held = [0]) => ({ axes: [ax, ay, turn, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: held.includes(i), value: held.includes(i) ? 1 : 0 })) });
  InputManager.update(pad(0, 0, 0, []));
  for (let i = 0; i < 30; i++) { InputManager.update(pad(0.6, 0.25, 0.5)); await new Promise(r => requestAnimationFrame(r)); }
  InputManager.update(pad(0, 0, 0, [11]));
  InputManager.update(pad(0, 0, 0, []));
  for (let i = 0; i < 30; i++) { InputManager.update(pad(-0.2, 0.7, -0.4)); await new Promise(r => requestAnimationFrame(r)); }
  InputManager.update(pad(0, 0, 0, []));
  return SequenceRecorder.snapshot().events.length;
})()`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'e' }))`);
await wait(400);
const boxOpen = await page.eval(`getComputedStyle(document.querySelector('.gp-print')).visibility`);
c.ok(`the gamepad: ${drew} marks drawn with a pad, and E opens the print`, drew >= 40 && boxOpen === 'visible', `${drew} ${boxOpen}`);
await page.typeInto(`document.querySelector('.gp-print .pp-num')`, '50');
await wait(300);
const gpNote = await page.eval(`document.querySelector('.gp-print .pp-print-note')?.textContent || ''`);
c.ok('its sheet at 50 dpi: the pixels and the tiles, said', gpNote === '120×176 at 50 dpi: 2362 × 3465 px, drawn in 4 tiles', gpNote);
await page.click(`document.querySelector('.gp-print .pp-print')`);
const gpSay = `(document.querySelector('.gp-print__say')?.textContent || '')`;
await page.until(`/^printed|failed|nothing|an image/.test(${gpSay})`, { timeout: 120000 }).catch(() => {});
let file = null;
for (let i = 0; i < 100 && !file; i++) {
  const f = fs.existsSync(DL) && fs.readdirSync(DL).find(n => /^gamepad_120x176_50dpi_2362x3465\.png$/.test(n));
  if (f) file = path.join(DL, f); else await wait(200);
}
const png = file ? fs.readFileSync(file) : Buffer.alloc(0);
const phys = png.indexOf('pHYs');
const inked = file ? await page.eval(`(async () => {
  const bytes = Uint8Array.from(atob(${JSON.stringify(png.toString('base64'))}), ch => ch.charCodeAt(0));
  const bmp = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
  const x = new OffscreenCanvas(236, 346).getContext('2d'); x.drawImage(bmp, 0, 0, 236, 346);
  const d = x.getImageData(0, 0, 236, 346).data;
  let ink = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] < 700) ink++;
  return ink / (d.length / 4);
})()`) : 0;
c.ok('printed: a PNG the sheet\'s size, saying its 50 dpi, the drawing on it', !!file && png.readUInt32BE(16) === 2362
  && png.readUInt32BE(20) === 3465 && phys > 0 && png.readUInt32BE(phys + 4) === Math.round(50 / 0.0254) && inked > 0.02,
  `${await page.eval(gpSay)} · ink ${(inked * 100).toFixed(1)}%`);

// ── The 3D app: a model in tiles, and its print panel from end to end ───────

await c.go(c.base + '/apps/3d/');
await page.until(`/box, sphere, torus|nothing draws/.test(${say})`, { timeout: 30000 });
await page.downloadsTo(DL);
const panelRow = name => `[...document.querySelectorAll('#side > .pp > .pp-body .pp-row:not(.pp-stack-layer .pp-row)')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;

const tiling = await page.eval(`(async () => {
  const { printObject } = await import('/core/print.js');
  const { openModel } = await import('/apps/3d/frames.js');
  const { openRenderer } = await import('/apps/3d/renderer.js');
  const { modelParams, OPENING } = await import('/apps/3d/params.js');
  const recipe = { ...modelParams().values, toon: 3, outline: 6, shadows: true, width: 600, height: 880, scale: 1,
                   shapes: OPENING.map(s => ({ ...s, modifiers: s.id === 'box' ? [{ id: 'subdivide', params: {} }, { id: 'twist', params: {} }] : [] })) };
  const renderer = await openRenderer();
  const read = (src, w, h) => { const x = new OffscreenCanvas(w, h).getContext('2d'); x.drawImage(src, 0, 0); return x.getImageData(0, 0, w, h).data; };
  const out = await printObject({ type: 'model', origin: { app: '3d' }, recipe, render: { w: 600, h: 880 } }, { sheet: [600, 880], tile: 256, paper: null });
  const bmp = await createImageBitmap(out.blob);
  const tiled = read(bmp, 600, 880);
  const whole = openModel(recipe, { renderer });
  const one = read(whole.frame(0), 600, 880);
  whole.dispose();
  let worst = 0, off = 0, sum = 0;
  for (let i = 0; i < one.length; i++) { const d = Math.abs(one[i] - tiled[i]); worst = Math.max(worst, d); sum += d; if (d > 8) off++; }
  return { size: [bmp.width, bmp.height], worst, off: off / one.length, mean: sum / one.length, enlarged: out.enlarged };
})()`);
c.ok('the 3D app: a print in twelve tiles is the model drawn whole, the outline and shadows meeting',
  tiling.size.join() === '600,880' && tiling.enlarged === 1 && tiling.off < 0.002 && tiling.mean < 0.3, JSON.stringify(tiling));

await page.typeInto(`${panelRow('format')}?.querySelector('select')`, '120x176');
await page.typeInto(`${panelRow('dpi')}?.querySelector('.pp-num')`, '50');
await wait(300);
const printNote = await page.eval(`document.querySelector('.pp-print-note')?.textContent || ''`);
c.ok('the 3D app\'s print panel: the 120×176 sheet at 50 dpi, its pixels and tiles, said', printNote === '120×176 at 50 dpi: 2362 × 3465 px, drawn in 4 tiles', printNote);
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.click(`document.querySelector('.pp-print')`);
await page.until(`/^printed|failed/.test(${say})`, { timeout: 120000 });
let printed = null;
for (let i = 0; i < 100 && !printed; i++) {
  const f = fs.existsSync(DL) && fs.readdirSync(DL).find(n => /^3d_120x176_50dpi/.test(n) && n.endsWith('.png'));
  if (f) printed = path.join(DL, f); else await wait(200);
}
const head = printed ? fs.readFileSync(printed) : Buffer.alloc(0);
const physAt = head.indexOf('pHYs');
c.ok('…printed: a PNG the sheet\'s size, saying its 50 dpi', !!printed && head.readUInt32BE(16) === 2362 && head.readUInt32BE(20) === 3465
  && physAt > 0 && head.readUInt32BE(physAt + 4) === Math.round(50 / 0.0254), `${await page.eval(say)} · ${printed && path.basename(printed)}`);

const noise = c.quiet();
c.ok('no page said anything wrong', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
