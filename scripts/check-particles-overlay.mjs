#!/usr/bin/env node
/**
 * scripts/check-particles-overlay.mjs — particles' overlay composed (G3,
 * 2026-11-11, the author's pick: "overlay composable"), in Chrome.
 *
 *   node scripts/check-particles-overlay.mjs
 *
 * On A3, a picture of A3's shape — a green band on top, see-through under it.
 * At its defaults it stands as it did: in front, the format's whole width.
 * Behind the particles, they are over it. Filling a square format, it is as
 * wide as the picture; at half its size and moved right, narrower and to the
 * right; turned a quarter, its band upright; at half its opacity, green half
 * over the ground; by difference, the ground taken from it. On the preview,
 * a press in it away from every handle drags it — its rows the drag's — and
 * F puts its middle back at the picture's. Saved, turned, behind, by a blend
 * and see-through: the overlay its parent, replayed to the pixel, printed in
 * tiles as it is drawn whole; `?open=` brings its composition back. And no
 * page said anything wrong. What came before — fitted whole, in front, at A3
 * and on a square — is check-particles-fields'.
 *
 * Since L13b (2026-11-12) the overlay is the picture's first layer, in its
 * Stack section (core/layers.js): G3's rows by their old names are its rows
 * here, and every assertion stands as it was. With them: the Stack has the
 * layers and no Overlay section is left; a save from before L13, its overlay
 * one of G3's rows, replayed as its picture was.
 */

import { startCheck, inner } from './check-kit.mjs';   // inner: a smart object as its app has it (S6b)

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const key = k => page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)} }))`);
const tapKey = code => page.eval(`(() => { for (const t of ['keydown', 'keyup']) document.dispatchEvent(new KeyboardEvent(t, { code: '${code}', key: '', bubbles: true })); })()`);
const wait = ms => new Promise(r => setTimeout(r, ms));
const row = name => `[...document.querySelectorAll('.pp-row:not(.pp-stack-layer .pp-row)')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
/** G3's rows by their names, the picture's first layer's since L13b — `overlay` its object. */
const OLD = { overlay: 'ref', overlayAt: 'at', overlayFit: 'fit', overlayScale: 'scale', overlayX: 'x', overlayY: 'y', overlayAngle: 'rot',
  overlayOpacity: 'opacity', overlayBlend: 'blend' };
/** Values set on the picture's panel, as its rows would — an old row of the overlay its first layer's. */
const setPicture = async values => { await page.eval(`import('/core/param-rows.js').then(({ rowParams }) => { const p = rowParams(${row('format')}).params;
  const OLD = ${JSON.stringify(OLD)}, rest = {}, part = {};
  for (const [k, v] of Object.entries(${JSON.stringify(values)})) { if (OLD[k]) part[OLD[k]] = v; else rest[k] = v; }
  if (Object.keys(rest).length) p.set(rest);
  if (Object.keys(part).length) { const ls = p.get('layers'); p.set('layers', [{ ...(ls[0] || {}), ...part }, ...ls.slice(1)]); } })`); await wait(400); };
const getPicture = keys => page.eval(`import('/core/param-rows.js').then(({ rowParams }) => { const p = rowParams(${row('format')}).params, first = p.get('layers')[0] || {};
  const OLD = ${JSON.stringify(OLD)}; return ${JSON.stringify(keys)}.map(k => (OLD[k] ? first[OLD[k]] : p.get(k))); })`);
const setEmit = async values => { await page.eval(`import('/core/param-rows.js').then(({ rowParams }) => rowParams(${row('seed')}).params.set(${JSON.stringify(values)}))`); await wait(400); };
const scrubTo = async tick => {
  await page.eval(`(() => { const s = document.querySelector('.tp-scrub'); s.value = ${tick}; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await wait(300);
};
const guides = on => page.eval(`(() => { const b = document.querySelector('skw-viewtools .vt-guides'); if ((b.getAttribute('aria-pressed') === 'true') !== ${on}) b.click(); })()`);
/**
 * The band's green on the picture: how many pixels are it, exactly, and the box they make, as shares of the
 * picture — and, in a strip of it, 0 to 1 from the top, the pixels there and those that are particles.
 */
const green = (from = 0, to = 1) => page.eval(`(() => { const c = document.getElementById('stage'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0, x0 = 1, y0 = 1, x1 = 0, y1 = 0, strip = 0, ink = 0;
  for (let p = 0; p < d.length / 4; p++) { const i = p * 4, x = (p % c.width) / c.width, y = Math.floor(p / c.width) / c.height;
    const g = d[i] < 8 && d[i + 1] > 247 && d[i + 2] < 8;
    if (g) { n++; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    if (y >= ${from} && y < ${to}) { strip++; if (!g && Math.abs(d[i] - 255) + Math.abs(d[i + 1] - 253) + Math.abs(d[i + 2] - 246) > 30) ink++; } }
  return { share: n / (d.length / 4), box: n ? [x0, y0, x1, y1].map(v => +v.toFixed(3)) : null, strip, ink }; })()`);
/** One pixel of the preview, at shares of its width and height. */
const pixelAt = (fx, fy) => page.eval(`(() => { const c = document.getElementById('stage');
  return [...c.getContext('2d').getImageData(Math.floor(${fx} * c.width), Math.floor(${fy} * c.height), 1, 1).data]; })()`);

await c.go(c.base + '/apps/particles/');
await page.until(`${say}.includes('alive')`, { timeout: 20000 });
await guides(false);
await key(' ');                                       // the torch held still
await wait(300);
const band = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { thumbFromBlob } = await import('/core/thumb.js');
  const pic = new OffscreenCanvas(297, 420), g = pic.getContext('2d');   // A3's shape: a green band on top, see-through under it
  g.fillStyle = '#00ff00'; g.fillRect(0, 0, 297, 60);
  const blob = await pic.convertToBlob({ type: 'image/png' });
  const o = await Vault.save({ type: 'shape', title: 'a band on top', tags: ['shape'], origin: { app: 'vault', version: '1.0.0' },
    seed: null, recipe: null, render: { blob, ext: 'png', w: 297, h: 420 }, thumb: await thumbFromBlob(blob) });
  await Vault.refresh();
  return o.id; })()`);
c.ok('a band on top, of A3\'s shape, in the vault', !!band, String(band));
await setPicture({ format: 'a3' });
await setEmit({ y: -700 });                            // the particles at the top, under the band
await setPicture({ overlay: band });
await page.until(`${say}.includes('a band on top')`, { timeout: 15000 }).catch(() => {});
await scrubTo(20);
// Its layers the Stack's, in the picture's panel — no Overlay section left (L13b).
const sections = await page.eval(`[...document.querySelectorAll('.dr-head')].map(h => h.textContent.trim())`);
const stacked = await page.eval(`(() => { const r = document.querySelector('#picture-side .pp-row[data-key="layers"]'); return !!r && /^Stack/.test(r.closest('.dr').querySelector('.dr-head').textContent.trim())
  && document.querySelectorAll('#picture-side .pp-layer-row').length === 1; })()`);
c.ok('its overlay a layer, in the Stack: no Overlay section left', stacked && !sections.some(t => /^Overlay/i.test(t)), JSON.stringify(sections));

// ── At its defaults, as it was; then behind ─────────────────────────────────

const front = await green(0, 0.1);
c.ok('at its defaults, as before: in front, the format\'s whole width, nothing over it', front.box && front.box[0] === 0 && front.box[2] > 0.995
  && front.ink === 0, JSON.stringify(front));
await setPicture({ overlayAt: 'behind' });
await scrubTo(20);
const behind = await green(0, 0.1);
c.ok('behind the particles: they are over it', behind.ink > 200 && behind.share < front.share, JSON.stringify([front.share, behind.share, behind.ink]));
await setPicture({ overlayAt: 'front' });
await setEmit({ y: 260 });

// ── Fitted, sized, moved, turned ────────────────────────────────────────────

await setPicture({ format: 'ig-square' });
await setPicture({ width: 1080, height: 1080 });
await scrubTo(20);
const whole = await green();
await setPicture({ overlayFit: 'fill' });
await scrubTo(20);
const cut = await green();
// Filling a square, A3's top and bottom spill over and are cut — the band with them, until it is moved down.
await setPicture({ overlayY: 300 });
await scrubTo(20);
const filled = await green();
c.ok('on a square, whole it is narrower; filling it, its top cut, then moved down, as wide as the picture', whole.box && whole.box[2] - whole.box[0] < 0.75
  && cut.share === 0 && filled.box && filled.box[0] === 0 && filled.box[2] > 0.995, JSON.stringify([whole.box, cut.share, filled.box]));
await setPicture({ overlayFit: 'whole', overlayY: 0, overlayScale: 0.5, overlayX: 200 });
await scrubTo(20);
const moved = await green();
const mid = moved.box ? (moved.box[0] + moved.box[2]) / 2 : 0, wide = moved.box ? moved.box[2] - moved.box[0] : 0;
c.ok('at half its size and moved right: half as wide, its middle a fifth of the picture right', Math.abs(wide - (whole.box[2] - whole.box[0]) / 2) < 0.01
  && Math.abs(mid - (0.5 + 200 / 1080)) < 0.01, JSON.stringify(moved.box));
await setPicture({ overlayScale: 1, overlayX: 0, overlayAngle: 90 });
await scrubTo(20);
const upright = await green();
c.ok('turned a quarter, clockwise: its band upright, at its right', upright.box && upright.box[3] - upright.box[1] > 0.6 && upright.box[2] - upright.box[0] < 0.16
  && upright.box[0] > 0.8, JSON.stringify(upright.box));
await setPicture({ overlayAngle: 0, format: 'a3' });

// ── See-through, and a blend ────────────────────────────────────────────────

await scrubTo(20);
await setPicture({ overlayOpacity: 0.5 });
await scrubTo(20);
const half = await pixelAt(0.5, 0.03);
c.ok('at half its opacity: green half over the ground', Math.abs(half[0] - 128) < 4 && half[1] > 250 && Math.abs(half[2] - 123) < 4, JSON.stringify(half));
await setPicture({ overlayOpacity: 1, overlayBlend: 'difference' });
await scrubTo(20);
const diff = await pixelAt(0.5, 0.03);
c.ok('by difference: the ground taken from it, green against cream', diff[0] > 250 && diff[1] < 6 && diff[2] > 240, JSON.stringify(diff));
await setPicture({ overlayBlend: 'normal' });

// ── Dragged on the preview, and F ───────────────────────────────────────────

await guides(true);
await scrubTo(20);
const stage = await page.eval(`(() => { const r = document.getElementById('stage').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; })()`);
const css = stage[2] / 1080;                          // CSS pixels a picture pixel
const from = [Math.round(stage[0] + stage[2] * 0.3), Math.round(stage[1] + stage[3] * 0.62)];
await page.pointer(from, [from[0] + Math.round(108 * css), from[1] + Math.round(54 * css)], 12);
await wait(400);
const dragged = await getPicture(['overlayX', 'overlayY']);
c.ok('a press in it, away from every handle, drags it: its rows the drag\'s', Math.abs(dragged[0] - 108) <= 3 && Math.abs(dragged[1] - 54) <= 3, JSON.stringify(dragged));
await tapKey('KeyF');
await wait(400);
const placed = await getPicture(['overlayX', 'overlayY']);
c.ok('…pressed last, F puts its middle back at the picture\'s', placed[0] === 0 && placed[1] === 0, JSON.stringify(placed));
await guides(false);

// ── Saved, replayed, printed, opened ────────────────────────────────────────

await setPicture({ overlayAt: 'behind', overlayAngle: 12, overlayScale: 0.8, overlayX: -60, overlayY: 90, overlayOpacity: 0.7, overlayBlend: 'multiply' });
await setEmit({ y: -500 });
await scrubTo(20);
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await key('S');
await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
const id = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
const o = id ? inner(await (await fetch(c.base + '/api/vault/' + id)).json()) : null;
const kept = o && o.recipe.picture.layers && o.recipe.picture.layers[0];
c.ok('saved composed: the overlay its parent, its composition in the recipe — its first layer', !!o && o.parents.includes(band) && !!kept
  && kept.ref === band && kept.at === 'behind' && kept.blend === 'multiply' && kept.rot === 12 && !('overlay' in o.recipe.picture),
  o ? JSON.stringify({ parents: o.parents, kept }) : await page.eval(say));
if (id) {
  const replayed = await page.eval(`(async () => {
    const { Vault } = await import('/core/vault.js');
    const { openFrames } = await import('/core/rebuild.js');
    const { object, url } = await Vault.load(${JSON.stringify(id)});
    const h = await openFrames(object, { url });
    const img = await createImageBitmap(await (await fetch(url)).blob());
    const a = new OffscreenCanvas(img.width, img.height).getContext('2d'); a.drawImage(img, 0, 0);
    const b = new OffscreenCanvas(img.width, img.height).getContext('2d'); b.drawImage(h.frame(20), 0, 0);
    const da = a.getImageData(0, 0, img.width, img.height).data, db = b.getImageData(0, 0, img.width, img.height).data;
    let worst = 0; for (let k = 0; k < da.length; k++) worst = Math.max(worst, Math.abs(da[k] - db[k]));
    const out = { worst, missing: h.missing }; h.dispose(); return out; })()`);
  c.ok('the vault replays it, turned, behind, by its blend: its render, pixel for pixel', replayed.worst === 0 && !replayed.missing.length, JSON.stringify(replayed));
  const printed = await c.printMatch(id, { scale: 2, tick: 20 });
  c.ok(`printed in ${printed.tiles} tiles, as it is drawn whole`, printed.enlarged === 1 && printed.off < 0.002 && printed.mean < 0.3, JSON.stringify(printed));
  await c.go(c.base + '/apps/particles/?open=' + id);
  await page.until(`${say}.includes('opened') || ${say}.includes('could not')`, { timeout: 30000 });
  const back = await getPicture(['overlayAt', 'overlayAngle', 'overlayScale', 'overlayX', 'overlayY', 'overlayOpacity', 'overlayBlend']);
  c.ok('?open= brings its composition back', JSON.stringify(back) === JSON.stringify(['behind', 12, 0.8, -60, 90, 0.7, 'multiply']), JSON.stringify(back));
}
await c.shot('1-composed');

// ── A save from before L13: its overlay one of G3's rows, replayed as its picture was ──
const index = (await (await fetch(c.base + '/api/vault')).json()).objects || [];
let before = null;
for (const r of index.filter(r => r.type === 'skw' || (r.origin && r.origin.app === 'particles'))) {
  if (before) break;
  const full = inner(await (await fetch(c.base + '/api/vault/' + r.id)).json());
  if (full.origin && full.origin.app === 'particles' && full.recipe && full.recipe.picture && typeof full.recipe.picture.overlay === 'string') before = full;
}
if (before) {
  // Its picture is a frame of it — a still's its tick, a loop's the one on screen when it was saved: the frame of the
  // replay nearest it, found small, then held to it whole.
  const old = await page.eval(`(async () => {
    const { Vault } = await import('/core/vault.js');
    const { openFrames } = await import('/core/rebuild.js');
    const { object, url } = await Vault.load(${JSON.stringify(before.id)});
    const h = await openFrames(object, { url });
    const img = await createImageBitmap(await (await fetch(url, { cache: 'no-store' })).blob());
    const read = (src, w, hh) => { const x = new OffscreenCanvas(w, hh).getContext('2d'); x.drawImage(src, 0, 0, w, hh); return x.getImageData(0, 0, w, hh).data; };
    const apart = (p, q) => { let sum = 0; for (let k = 0; k < p.length; k++) sum += Math.abs(p[k] - q[k]); return sum / p.length; };
    const sw = Math.max(1, img.width >> 3), sh = Math.max(1, img.height >> 3), small = read(img, sw, sh);
    let best = 0, near = Infinity;
    for (let i = 0; i < h.length; i++) { const d = apart(read(h.frame(i), sw, sh), small); if (d < near) { near = d; best = i; } }
    const f = h.frame(best), da = read(img, img.width, img.height), db = read(f, img.width, img.height);
    let sum = 0, off = 0; for (let k = 0; k < da.length; k++) { const d = Math.abs(da[k] - db[k]); sum += d; if (d > 24) off++; }
    const out = { frame: best, of: h.length, size: [img.width, img.height, f.width, f.height], mean: +(sum / da.length).toFixed(3),
      off: +(off / da.length).toFixed(5), missing: h.missing };
    h.dispose(); return out; })()`);
  c.ok("a save from before L13, its overlay G3's row: replayed as its picture was", old.size[0] === old.size[2] && old.mean < 0.5 && old.off < 0.002
    && !old.missing.length, JSON.stringify({ id: before.id, ...old }));
} else {
  console.log('     no particles save with an overlay from before L13 in this vault: the old replay goes unchecked');
}

const noise = c.quiet();
c.ok('no page said anything wrong', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
