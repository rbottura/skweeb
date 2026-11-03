#!/usr/bin/env node
/**
 * scripts/check-particles-links.mjs — particles taking other apps' objects, in Chrome.
 *
 *   node scripts/check-particles-links.mjs
 *
 * `ckt → particles: an emitter` (2026-09-30): a dot-set made as ckt saves one
 * is picked as the emitter, and every particle is born on one of its dots, at
 * the emitter's size — nothing drawn between them; a glyph of a dot-set of
 * two is its own emitter; a shape dropped into the vault leaves them from its
 * ink. Saved, the dot-set is the loop's parent, the vault replays it to the
 * pixel of its render, and `?open=` brings the emitter back; switched back to
 * a point, the dot-set is no parent of the next save.
 *
 * `fractal → particles: a field` (M7's link, 2026-09-30): a Julia loop saved
 * as fractals saves one is picked as a field, and moves the particles; the
 * loop through it still closes pixel for pixel; saved, the Julia loop is a
 * parent and the replay is the render to the pixel; an object whose app
 * makes no field says so. The field is in doubles: no GPU here either.
 *
 * On its own because check-particles.mjs is past the 400-line cap. Needs no
 * GPU and brings its own objects: the vault it runs on may be empty.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const key = async k => { await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)} }))`); await wait(300); };
const row = name => `[...document.querySelectorAll('.pp-row:not(.pp-stack-layer .pp-row)')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const set = async (name, value) => { await page.typeInto(`${row(name)}?.querySelector('.pp-num')`, value); await wait(250); };
const chip = async (name, text) => { await page.click(`[...${row(name)}.querySelectorAll('button')].find(b => b.textContent === ${JSON.stringify(text)})`); await wait(300); };
const chipOn = (name, text) => page.eval(`!![...${row(name)}.querySelectorAll('.pp-chip--on')].find(b => b.textContent === ${JSON.stringify(text)})`);
const sayWith = text => page.until(`${say}.includes(${JSON.stringify(text)})`, { timeout: 15000 }).then(() => page.eval(say), () => page.eval(say));
const scrubTo = async tick => {
  await page.eval(`(() => { const s = document.querySelector('.tp-scrub'); s.value = ${tick};
    s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await wait(300);
};
/** Where along a row of the 1080-square picture there is ink: the picture's x of each pixel that is not the ground. */
const inkAlong = py => page.eval(`(() => { const c = document.getElementById('stage'); const y = Math.round(${py} * c.height / 1080);
  const d = c.getContext('2d').getImageData(0, y, c.width, 1).data, out = [];
  for (let x = 0; x < c.width; x++) { const i = x * 4;
    if (Math.abs(d[i] - 255) + Math.abs(d[i + 1] - 253) + Math.abs(d[i + 2] - 246) > 30) out.push(x * 1080 / c.width); }
  return out; })()`);
/** The guides off, whatever this browser remembered: only particles on the picture. */
const guidesOff = async () => { await page.eval(`(() => { const b = document.getElementById('guides');
  if (b.getAttribute('aria-pressed') === 'true') b.click(); })()`); await wait(200); };
/** Pick an object by its title in the picker a row's Choose… opens. */
const choose = async (rowName, title) => {
  await page.click(`[...${row(rowName)}.querySelectorAll('button')].find(b => b.textContent === 'Choose…')`);
  await page.until(`!!document.querySelector('.vp--visible')`, { timeout: 20000 });
  const cell = `[...document.querySelectorAll('.vp--visible .vp-cell')].find(k => k.querySelector('.vp-name')?.textContent === ${JSON.stringify(title)})`;
  await page.until(`!!${cell}`, { timeout: 20000 }).catch(() => {});
  await page.click(`${cell}?.querySelector('.vp-use')`);
  await wait(500);
};
/** A saved object as the vault replays it: how far its frame `i` is from its render. */
const replayOf = (id, i) => page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { openFrames } = await import('/core/rebuild.js');
  const { object, url } = await Vault.load(${JSON.stringify(id)});
  const h = await openFrames(object, { url });
  const img = await createImageBitmap(await (await fetch(url)).blob());
  const a = new OffscreenCanvas(img.width, img.height).getContext('2d'); a.drawImage(img, 0, 0);
  const b = new OffscreenCanvas(img.width, img.height).getContext('2d'); b.drawImage(h.frame(${i}), 0, 0);
  const da = a.getImageData(0, 0, img.width, img.height).data, db = b.getImageData(0, 0, img.width, img.height).data;
  let worst = 0; for (let k = 0; k < da.length; k++) worst = Math.max(worst, Math.abs(da[k] - db[k]));
  const out = { length: h.length, worst, missing: h.missing }; h.dispose(); return out; })()`);
const saved = async () => {
  await page.eval(`document.querySelector('.bar-say').textContent = ''`);
  await key('S');
  await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
  const id = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
  return id ? (await fetch(c.base + '/api/vault/' + id)).json() : null;
};

// ── Two dot-sets, saved as ckt saves them ───────────────────────────────────

await c.go(c.base + '/apps/particles/');
await page.until(`${say}.includes('alive')`, { timeout: 20000 });
const made = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { thumbFromLabel } = await import('/core/thumb.js');
  const dots = async (title, data) => (await Vault.save({ type: 'dataset', title, tags: ['ckt', 'dataset'],
    origin: { app: 'ckt', version: '3.0.0' }, seed: null, recipe: null,
    render: { blob: new Blob([JSON.stringify(data)], { type: 'application/json' }), ext: 'json', w: 1200, h: 1000 },
    thumb: await thumbFromLabel(title) })).id;
  const out = { two: await dots('two dots', [[[100, 500], [1100, 500]]]),
                glyphs: await dots('two glyphs', [[[0, 0], [10, 0]], [[5, 5]]]) };
  await Vault.refresh();
  return out; })()`);
c.ok('two dot-sets in the vault, as ckt saves them', !!(made && made.two && made.glyphs), JSON.stringify(made));

// ── The dots are the emitter ────────────────────────────────────────────────

await guidesOff();
await chip('mode', 'burst');
for (const [name, v] of [['at once', 200], ['speed', 0], ['speed spread', 0], ['gravity', 0],
                         ['life', 5], ['life spread', 0], ['y from centre', 0], ['x from centre', 0]]) await set(name, v);
await chip('emitter', 'object');
c.ok('an object emitter asks which object', await page.eval(`!!${row('emitter object')} && !${row('emitter object')}.hidden`));
await set('length · radius · size', 400);
await choose('emitter object', 'two dots');
const dotsSay = await sayWith('two dots: 2 points to leave from');
c.ok('the dot-set picked: two points to leave from', dotsSay.includes('two dots: 2 points'), dotsSay);
await scrubTo(0);
const ink = await inkAlong(540);
c.ok('every particle born on a dot, at the emitter\'s size', ink.length > 0
  && ink.every(x => Math.abs(x - 340) < 16 || Math.abs(x - 740) < 16), `ink at ${ink.length} px of the row`);
c.ok('both dots used, nothing between them', ink.some(x => Math.abs(x - 340) < 3) && ink.some(x => Math.abs(x - 740) < 3)
  && !ink.some(x => Math.abs(x - 540) < 100), JSON.stringify([Math.min(...ink), Math.max(...ink)].map(Math.round)));
await c.shot('1-two-dots');

// A dot-set of two glyphs: the second is one dot, at the emitter.
await choose('emitter object', 'two glyphs');
await set('glyph, of a dot-set', 1);
const glyphSay = await sayWith('glyph 2 of 2');
c.ok('a glyph of a dot-set is its own emitter', glyphSay.includes('1 point to leave from'), glyphSay);
await scrubTo(0);
const one = await inkAlong(540);
c.ok('its one dot: every particle at the emitter', one.length > 0 && one.every(x => Math.abs(x - 540) < 16), `${one.length} px`);

// ── Saved, replayed, reopened ───────────────────────────────────────────────

await choose('emitter object', 'two dots');
await set('glyph, of a dot-set', 0);
await sayWith('two dots: 2 points');
await scrubTo(0);
const o = await saved();
c.ok('saved: the dot-set is its parent', !!o && o.parents.includes(made.two) && o.recipe.emit.from === made.two,
  o ? `${o.title} · parents ${JSON.stringify(o.parents)}` : await page.eval(say));
c.ok('titled by what it leaves from', !!o && o.title.includes('from two dots'), o && o.title);
if (o) {
  const replay = await replayOf(o.id, 0);
  c.ok('the vault replays it: its frame, its render, pixel for pixel', replay.worst === 0 && !replay.missing.length,
    JSON.stringify(replay));
  await c.go(c.base + '/apps/particles/?open=' + o.id);
  await page.until(`${say}.includes('opened') || ${say}.includes('could not')`, { timeout: 30000 });
  c.ok('?open= brings the emitter back: the object, its dots', await chipOn('emitter', 'object')
    && (await page.eval(say)).includes('opened'), await page.eval(say));

  // Back to a point: the dot-set's row is hidden, and it is no parent.
  await chip('emitter', 'point');
  const p = await saved();
  c.ok('switched back to a point, the dot-set is no parent', !!p && !p.parents.includes(made.two) && p.recipe.emit.from === made.two,
    p ? `parents ${JSON.stringify(p.parents)}, from still ${p.recipe.emit.from}` : await page.eval(say));
}

// ── A shape's ink ───────────────────────────────────────────────────────────

await c.go(c.base + '/apps/particles/');
await page.until(`${say}.includes('alive')`, { timeout: 20000 });
await guidesOff();
await chip('mode', 'burst');
for (const [name, v] of [['speed', 0], ['speed spread', 0], ['gravity', 0], ['life', 5], ['y from centre', 0]]) await set(name, v);
await chip('emitter', 'object');
await set('length · radius · size', 400);
await page.click(`[...${row('emitter object')}.querySelectorAll('button')].find(b => b.textContent === 'Choose…')`);
await page.until(`!!document.querySelector('.vp--visible')`, { timeout: 20000 });
await page.eval(`(async () => {
  const c = new OffscreenCanvas(96, 96), g = c.getContext('2d');
  g.fillStyle = '#1b1464'; g.beginPath();
  for (let i = 0; i < 10; i++) { const r = i % 2 ? 18 : 46, a = i * Math.PI / 5 - Math.PI / 2; g.lineTo(48 + Math.cos(a) * r, 48 + Math.sin(a) * r); }
  g.fill();
  const dt = new DataTransfer(); dt.items.add(new File([await c.convertToBlob({ type: 'image/png' })], 'emitter star.png', { type: 'image/png' }));
  document.querySelector('.vp--visible').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); })()`);
const star = `[...document.querySelectorAll('.vp--visible .vp-cell')].find(k => k.querySelector('.vp-name')?.textContent === 'emitter star')`;
await page.until(`!!${star}`, { timeout: 30000 }).catch(() => {});
await page.click(`${star}?.querySelector('.vp-use')`);
const starSay = await sayWith('emitter star:');
const starPoints = Number((starSay.match(/emitter star: ([\d,]+) points/) || [])[1]?.replace(/,/g, '') || 0);
c.ok('a shape dropped in, picked: its ink is the points', starPoints > 500, starSay);
await scrubTo(0);
const across = await inkAlong(540), down = await inkAlong(700);
c.ok('born on its ink: across its middle, and not past its box', across.length > 0 && across.every(x => Math.abs(x - 540) < 230),
  `${across.length} px, from ${Math.round(Math.min(...across))} to ${Math.round(Math.max(...across))}`);
c.ok('and not in the notch under its middle', down.every(x => Math.abs(x - 540) > 20 || down.length === 0), `${down.length} px at y 700`);
await c.shot('2-star');

// ── A fractal's field: M7's link ────────────────────────────────────────────

const julia = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { thumbFromBlob } = await import('/core/thumb.js');
  const { fractalParams } = await import('/apps/fractals/params.js');
  const recipe = { ...fractalParams().values, kind: 'julia', cx: 0, cy: 0, zoom: 1, moveEscape: 'julia', radius: 0.02,
                   from: 0, to: 360, wave: 'through', ease: 'linear', frames: 48, fps: 24 };
  const pic = new OffscreenCanvas(64, 64); pic.getContext('2d').fillRect(8, 8, 48, 48);
  const blob = await pic.convertToBlob({ type: 'image/png' });
  const o = await Vault.save({ type: 'sequence', title: 'julia loop', tags: ['fractals', 'escape', 'loop'],
    origin: { app: 'fractals', version: '1.0.0' }, seed: null, recipe, parents: [],
    render: { blob, ext: 'png', w: 64, h: 64, frames: 48, fps: 24, loop: true }, thumb: await thumbFromBlob(blob) });
  await Vault.refresh();
  return o.id; })()`);
c.ok('a Julia loop in the vault, as fractals saves one', !!julia, julia);

await c.go(c.base + '/apps/particles/');
await page.until(`${say}.includes('alive')`, { timeout: 20000 });
await guidesOff();
const grid = () => page.eval(`(() => { const c = document.getElementById('stage'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const n = 16, out = new Array(n * n).fill(0), k = new Array(n * n).fill(0);
  for (let y = 0; y < c.height; y += 2) for (let x = 0; x < c.width; x += 2) { const i = (y * c.width + x) * 4, j = Math.floor(y * n / c.height) * n + Math.floor(x * n / c.width);
    out[j] += d[i] + d[i + 1] + d[i + 2]; k[j]++; }
  return out.map((v, j) => v / Math.max(1, k[j]) / 3); })()`);
const apart = (p, q) => Math.max(...p.map((v, i) => Math.abs(v - q[i])));
const count = `(document.querySelector('.tp-count')?.textContent || '')`;
await key(' ');                                   // the torch held still
await scrubTo(20);
const unpulled = await grid();
await choose('a field from', 'julia loop');
const fieldSay = await sayWith('julia loop: a field to move through');
c.ok('the Julia loop picked: a field to move through', fieldSay.includes('a field to move through'), fieldSay);
await set('its pull', 1500);
await scrubTo(20);
const pulled = await grid();
c.ok('its field moves the particles', apart(pulled, unpulled) > 8, 'apart by ' + apart(pulled, unpulled).toFixed(1));
await scrubTo(0);
const first = await grid();
await scrubTo(59);
await key('.');
c.ok('through it, the frame after the last is the first, pixel for pixel', (await page.eval(count)) === '1 / 60'
  && apart(await grid(), first) === 0, `${await page.eval(count)}, apart by ${apart(await grid(), first)}`);
await scrubTo(20);
await c.shot('3-julia-field');

const f = await saved();
c.ok('saved: the Julia loop is its parent', !!f && f.parents.includes(julia) && f.recipe.emit.fieldFrom === julia,
  f ? `parents ${JSON.stringify(f.parents)}` : await page.eval(say));
if (f) {
  const replay = await replayOf(f.id, 20);
  c.ok('the vault replays it through the field: its render, pixel for pixel', replay.worst === 0 && !replay.missing.length,
    JSON.stringify(replay));
}
if (o) {
  await choose('a field from', o.title);
  const none = await sayWith('makes no field');
  c.ok('an object whose app makes no field says so', none.includes('makes no field'), none);
}

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
