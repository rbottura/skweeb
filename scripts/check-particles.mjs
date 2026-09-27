#!/usr/bin/env node
/**
 * scripts/check-particles.mjs — M6's app in Chrome: particles as a function of time.
 *
 *   node scripts/check-particles.mjs
 *
 * Served as plain files with no vault, it opens and draws (rule 7). On the
 * server: it plays; the frame after the last is the first again, pixel for
 * pixel; a frame scrubbed to is the frame stepped to; the first frame is as
 * full as any; a burst starts all at the emitter and ends; print scale makes
 * the same picture in more pixels; a vault set chosen, the particles are its
 * sprites, the loop still closes, and the set is switched on as particle
 * sprites (core/uses.js). Saved: a loop and a still into the vault, the set
 * its parent; replayed by the vault to the pixel of its render, drawn again
 * at scale 2, reopened by `?open=`, and placed on a compose page; its frames
 * zipped, and a sprite sheet with its JSON, cropped to the torch. A ring
 * aimed outward blooms; a stream through a vortex and curl noise still
 * closes its loop, and a frame of it costs less than a 60 fps frame; tilted
 * into depth behind a close camera, it is another picture and still a loop.
 * The guides: G switches them, the emitter and the fields' centre are dragged
 * by their handles, and a save made with them on has none in its picture.
 */

import fs   from 'node:fs';
import path from 'node:path';
import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const DL = path.join(c.dir, 'downloads');
/** A downloaded file whose name ends so, once it has finished. */
const downloaded = async ending => {
  for (let i = 0; i < 100; i++) {
    const f = fs.existsSync(DL) && fs.readdirSync(DL).find(n => n.endsWith(ending));
    if (f) return path.join(DL, f);
    await new Promise(r => setTimeout(r, 200));
  }
  return null;
};
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const count = `(document.querySelector('.tp-count')?.textContent || '')`;
const alive = async () => Number(((await page.eval(say)).match(/^(\d+) alive/) || [])[1] || -1);
const key = k => page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)} }))`);
const wait = ms => new Promise(r => setTimeout(r, ms));
const row = name => `[...document.querySelectorAll('.pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const set = async (name, value) => { await page.typeInto(`${row(name)}?.querySelector('.pp-num')`, value); await wait(300); };
const scrubTo = async tick => {
  await page.eval(`(() => { const s = document.querySelector('.tp-scrub'); s.value = ${tick};
    s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await wait(250);
};
// The picture as a 16 × 16 grid of mean colours: two frames are the same when no cell differs.
const pixels = () => page.eval(`(() => { const c = document.getElementById('stage');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const n = 16, out = new Array(n * n).fill(0), k = new Array(n * n).fill(0);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4, j = Math.floor(y * n / c.height) * n + Math.floor(x * n / c.width);
    out[j] += d[i] + d[i + 1] + d[i + 2]; k[j]++;
  }
  return out.map((v, j) => v / Math.max(1, k[j]) / 3); })()`);
const apart = (p, q) => Math.max(...p.map((v, i) => Math.abs(v - q[i])));
/** A store-only zip's entries, as core/export.js writes them: [{ name, bytes }]. */
const readZip = file => {
  const b = fs.readFileSync(file), out = [];
  for (let off = 0; b.readUInt32LE(off) === 0x04034b50;) {
    const size = b.readUInt32LE(off + 18), nl = b.readUInt16LE(off + 26);
    out.push({ name: b.slice(off + 30, off + 30 + nl).toString(), bytes: b.slice(off + 30 + nl, off + 30 + nl + size) });
    off += 30 + nl + size;
  }
  return out;
};

// ── Rule 7: no vault at all ─────────────────────────────────────────────────

await c.go(c.plain + '/apps/particles/');
await page.until(`${say}.includes('alive')`, { timeout: 20000 });
c.ok('opens with no vault, and draws', (await alive()) > 0, await page.eval(say));
c.ok('the bar says there is no vault', await page.eval(`document.body.textContent.includes('no vault')`));

// ── Plays, and closes its loop ──────────────────────────────────────────────

await c.go(c.base + '/apps/particles/');
// The plain page's console, heard as this one opened: its vault's API was
// missing, and saying so is all it may have said.
const plainNoise = c.quiet().filter(e => !(e.url || '').endsWith('/api/vault'));
c.ok('with no vault it said nothing else', !plainNoise.length, JSON.stringify(plainNoise).slice(0, 300));
await page.until(`${say}.includes('alive')`, { timeout: 20000 });
const before = await page.eval(count);
await wait(700);
const after = await page.eval(count);
c.ok('it plays', before !== after && /^\d+ \/ 60$/.test(after), `${before} → ${after}`);

key(' '); await wait(200);
await scrubTo(0);
const first = await pixels();
const full = await alive();
await scrubTo(59);
key('.'); await wait(300);
c.ok('the frame after the last is the first', (await page.eval(count)) === '1 / 60', await page.eval(count));
c.ok('pixel for pixel: the loop closes', apart(await pixels(), first) === 0, 'apart by ' + apart(await pixels(), first));
await c.shot('1-stream');

// Stepped to frame 31, one frame at a time, against scrubbed straight to it.
for (let i = 0; i < 30; i++) key('.');
await wait(400);
const stepped = await pixels();
const at = await page.eval(count);
await scrubTo(5); await scrubTo(30);
c.ok('a frame scrubbed to is the frame stepped to', at === '31 / 60' && apart(await pixels(), stepped) === 0,
  `${at}, apart by ${apart(await pixels(), stepped)}`);
const later = await alive();
c.ok('the first frame is as full as any', Math.abs(full - later) < later * 0.25, `${full} at frame 1, ${later} at 31`);

// Changing the loop's length keeps its frame; changing a force redraws it.
await set('gravity px/s²', '-300');
c.ok('a force changed, the frame redrawn where it was', apart(await pixels(), stepped) > 0 && (await page.eval(count)) === '31 / 60');

// ── A burst ─────────────────────────────────────────────────────────────────

await page.click(`[...${row('mode')}.querySelectorAll('button')].find(b => b.textContent === 'burst')`);
await wait(300);
const note = await page.eval(`[...document.querySelectorAll('#picture-side .dr-note')].map(n => n.textContent).join(' ')`);
c.ok('a burst lasts until its longest life, once', /\d+ frames · [\d.]+ s, once/.test(note), note);
await scrubTo(0);
c.ok('at its first frame, every one of it', (await alive()) === 120, await page.eval(say));
const frames = Number((await page.eval(count)).split(' / ')[1]);
await scrubTo(frames - 1);
c.ok('by its last, nearly all gone', (await alive()) < 30, await page.eval(say));
await c.shot('2-burst');

// ── Print scale: more pixels, the same picture ──────────────────────────────

await page.click(`[...${row('mode')}.querySelectorAll('button')].find(b => b.textContent === 'stream')`);
await scrubTo(10);
const out1 = await page.eval(`document.querySelector('.bar')?.textContent || ''`);
await set('scale', '2');
const out2 = await page.eval(`document.querySelector('.bar')?.textContent || ''`);
c.ok('scale 2 is twice the pixels out', out1.includes('1080 × 1080') && out2.includes('2160 × 2160'),
  (out2.match(/\d+ × \d+[^·]*/) || [''])[0]);

// ── Sprites from a set: M6's link, set → particles ──────────────────────────

await set('scale', '1');
await scrubTo(0);
const dots = await pixels();
await page.click(`[...${row('sprites')}.querySelectorAll('button')].find(b => b.textContent === 'Choose…')`);
await page.until(`!!document.querySelector('.vp--visible')`, { timeout: 20000 });
await wait(800);
// A vault may hold only sets made as something else: the picker says so, and shows them.
await page.eval(`document.querySelector('.vp--visible .vp-offer .vp-btn')?.click()`);
await wait(800);
const picked = await page.eval(`(() => {
  const cells = [...document.querySelectorAll('.vp--visible .vp-cell')].filter(k => k.querySelector('.vp-use'));
  const cell = cells.find(k => k.querySelector('.vp-name')?.textContent === 'sprites (legacy grid)') || cells[0];
  if (!cell) return null;
  const name = cell.querySelector('.vp-name').textContent;
  cell.querySelector('.vp-use').click();
  return name;
})()`);
c.ok('the vault has a set to draw with', !!picked, picked || 'none');
if (picked) {
  await page.until(`/[0-9]+ sprites|could not/.test(${say})`, { timeout: 30000 });
  const told = await page.eval(say);
  c.ok('a set chosen, its members are the sprites', /: \d+ sprites/.test(told) && !told.includes('dots'), told);
  await wait(400);
  await scrubTo(0);
  const drawn = await pixels();
  c.ok('the particles are sprites now, not dots', apart(drawn, dots) > 2, 'apart by ' + apart(drawn, dots).toFixed(1));
  await scrubTo(59);
  key('.'); await wait(300);
  c.ok('with sprites, the loop still closes pixel for pixel', apart(await pixels(), drawn) === 0);
  const id = await page.eval(`(() => { const v = document.querySelector('.pp-row .pp-obj-id, [data-object-id]');
    return v ? (v.dataset.objectId || v.textContent) : null; })()`);
  const all = (await (await fetch(c.base + '/api/vault')).json()).objects || [];
  const set_ = all.find(r => r.type === 'set' && r.title === picked && (r.tags || []).includes('use:particles'));
  c.ok('used as particle sprites, the set is now offered as them', !!set_, set_ ? set_.tags.join(' ') : String(id));
  await c.shot('3-sprites');

  // Over its life: bigger sprites, turning, shrinking — and the loop still closes.
  await set('size px', '48');
  await set('start angle spread °', '360');
  await set('spin °/s', '240');
  await scrubTo(12);
  const turning = await pixels();
  c.ok('turned and grown, a different picture', apart(turning, drawn) > 2, 'apart by ' + apart(turning, drawn).toFixed(1));
  await scrubTo(59); key('.'); await wait(300);
  for (let i = 0; i < 12; i++) key('.');
  await wait(400);
  c.ok('turning and shrinking, the loop still closes', apart(await pixels(), turning) === 0,
    `${await page.eval(count)}, apart by ${apart(await pixels(), turning)}`);
  await c.shot('4-turning');

  // Stacked the other way: the same particles, the newest behind — and still a loop.
  await page.click(`[...${row('stacking')}.querySelectorAll('button')].find(b => b.textContent === 'newest behind')`);
  await wait(300);
  const under = await pixels();
  c.ok('newest behind, the stack is turned over', apart(under, turning) > 1, 'apart by ' + apart(under, turning).toFixed(1));
  await scrubTo(59); key('.'); await wait(300);
  for (let i = 0; i < 12; i++) key('.');
  await wait(400);
  c.ok('and the loop still closes', apart(await pixels(), under) === 0);
  await c.shot('5-newest-behind');

  // ── Saved: a loop, replayed exactly, redrawn at scale, reopened, placed ──

  const saveAs = async (how) => {
    await page.eval(`document.querySelector('.bar-say').textContent = ''`);
    await how();
    await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
    const sid = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
    return sid ? (await fetch(c.base + '/api/vault/' + sid)).json() : null;
  };
  const tickShown = Number((await page.eval(count)).split(' / ')[0]) - 1;
  const o = await saveAs(() => key('S'));
  c.ok('S saves the loop, a sequence of every frame', !!o && o.type === 'sequence' && o.render.frames === 60
    && o.render.fps === 30 && o.render.loop === true, o ? `${o.type} ${o.render.frames} at ${o.render.fps}` : await page.eval(say));
  if (o) {
    const setRow = all.find(r => r.title === picked && r.type === 'set');
    c.ok('the sprite set is its parent', JSON.stringify(o.parents) === JSON.stringify([setRow && setRow.id]), JSON.stringify(o.parents));
    c.ok('its recipe is both panels, its seed the emitter\'s', !!o.recipe.emit && !!o.recipe.picture
      && o.recipe.picture.order === 'under' && o.seed === o.recipe.emit.seed, Object.keys(o.recipe).join(','));

    // The replay's frame against the saved render: the same code, so the same pixels.
    const replay = await page.eval(`(async () => {
      const { Vault } = await import('/core/vault.js');
      const { openFrames } = await import('/core/rebuild.js');
      const { object, url } = await Vault.load(${JSON.stringify(o.id)});
      const h = await openFrames(object, { url });
      const img = await createImageBitmap(await (await fetch('/vault/objects/${o.id}/' + object.render.file)).blob());
      const a = new OffscreenCanvas(img.width, img.height).getContext('2d');
      a.drawImage(img, 0, 0);
      const b = new OffscreenCanvas(img.width, img.height).getContext('2d');
      b.drawImage(h.frame(${tickShown}), 0, 0);
      const da = a.getImageData(0, 0, img.width, img.height).data, db = b.getImageData(0, 0, img.width, img.height).data;
      let worst = 0; for (let i = 0; i < da.length; i++) worst = Math.max(worst, Math.abs(da[i] - db[i]));
      const out = { length: h.length, fps: h.fps, w: h.width, worst, missing: h.missing };
      const big = await openFrames(object, { url, scale: 2 });
      out.big = [big.scale, big.frame(0).width, big.width];
      h.dispose(); big.dispose();
      return out;
    })()`);
    c.ok('the vault replays it: 60 frames at 30', replay.length === 60 && replay.fps === 30, JSON.stringify(replay).slice(0, 120));
    c.ok('its frame is its render, pixel for pixel', replay.worst === 0, 'worst ' + replay.worst);
    c.ok('at scale 2 it is drawn again, twice the pixels', replay.big[0] === 2 && replay.big[1] === 2 * replay.w
      && replay.big[2] === replay.w, JSON.stringify(replay.big));

    const still = await saveAs(() => page.click(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent === 'Save this frame as a still')`));
    c.ok('a frame saves as a still, with the tick it is', !!still && still.type === 'still' && still.recipe.tick === tickShown,
      still ? `${still.type}, tick ${still.recipe.tick}` : '');

    // Every frame, zipped: 60 PNGs and a meta.json with the rate.
    await page.downloadsTo(DL);
    await page.eval(`document.querySelector('.bar-say').textContent = ''`);
    await page.click(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent === 'Download every frame (zip)')`);
    await page.until(`/^downloaded|failed/.test(${say})`, { timeout: 120000 });
    const zip = await downloaded('_frames.zip');
    const entries = zip ? readZip(zip) : [];
    const metaEntry = entries.find(e => e.name === 'meta.json');
    const meta = metaEntry ? JSON.parse(metaEntry.bytes.toString()) : null;
    const pngs = entries.filter(e => e.name.endsWith('.png')).length;
    c.ok('every frame downloads, zipped, with its rate', !!meta && pngs === 60 && meta.frames === 60 && meta.fps === 30,
      `${pngs} PNGs, ${meta ? `${meta.frames} at ${meta.fps}, ${meta.width}×${meta.height}` : 'no meta'}`);

    // A sprite sheet: the frames on one PNG, cropped to where the particles reach, and its JSON.
    await page.eval(`document.querySelector('.bar-say').textContent = ''`);
    await page.click(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent === 'Download a sprite sheet')`);
    await page.until(`/^downloaded|failed/.test(${say})`, { timeout: 120000 });
    const sheetZip = await downloaded('_sheet.zip');
    const parts = sheetZip ? readZip(sheetZip) : [];
    const png = parts.find(e => e.name.endsWith('.png')), js = parts.find(e => e.name.endsWith('.json'));
    const sheet = js ? JSON.parse(js.bytes.toString()) : null;
    const pngSize = png ? [png.bytes.readUInt32BE(16), png.bytes.readUInt32BE(20)] : [0, 0];
    c.ok('a sprite sheet: its PNG and its JSON, side by side', !!png && !!sheet && sheet.meta.image === png.name,
      parts.map(e => e.name).join(', ') + ' · ' + (await page.eval(say)));
    if (sheet) {
      const f0 = sheet.frames[0].frame;
      c.ok('sixty frames, the sheet the size its JSON says', sheet.frames.length === 60
        && sheet.meta.size.w === pngSize[0] && sheet.meta.size.h === pngSize[1], `${sheet.frames.length} on ${pngSize.join(' × ')}`);
      c.ok('cropped to the torch: narrower than the picture', f0.w < 1080 / 2 && f0.h < 1080, `${f0.w} × ${f0.h} of 1080 × 1080`);
      c.ok('every rect inside the sheet', sheet.frames.every(f => f.frame.x + f.frame.w <= pngSize[0] && f.frame.y + f.frame.h <= pngSize[1]));
      c.ok('durations in whole ms, summing to its two seconds', sheet.frames.every(f => Number.isInteger(f.duration))
        && sheet.frames.reduce((a, f) => a + f.duration, 0) === 2000);
      c.ok('one tag, the loop, forward', sheet.meta.frameTags.length === 1 && sheet.meta.frameTags[0].to === 59
        && sheet.meta.frameTags[0].direction === 'forward', JSON.stringify(sheet.meta.frameTags));
    }

    // Reopened: both panels and the frame, as saved.
    await c.go(c.base + '/apps/particles/?open=' + o.id);
    await page.until(`${say}.includes('opened') || ${say}.includes('could not')`, { timeout: 30000 });
    const spinBack = await page.eval(`${row('spin °/s')}?.querySelector('.pp-num')?.value`);
    const stackBack = await page.eval(`[...${row('stacking')}.querySelectorAll('button')].find(b => b.getAttribute('aria-pressed') === 'true' || b.classList.contains('is-on') || b.className.includes('on'))?.textContent`);
    c.ok('?open= brings the panels back', spinBack === '240', `spin ${spinBack}, stacking ${stackBack}`);
    c.ok('a loop opens at its first frame', (await page.eval(count)) === '1 / 60', await page.eval(count));
    if (still) {
      await c.go(c.base + '/apps/particles/?open=' + still.id);
      await page.until(`${say}.includes('opened') || ${say}.includes('could not')`, { timeout: 30000 });
      c.ok('a still opens at the frame it is', (await page.eval(count)) === `${tickShown + 1} / 60`, await page.eval(count));
    }

    // Placed on a compose page, it plays there.
    await c.go(c.base + '/apps/compose/?place=' + o.id);
    await page.until(`${say}.includes(' on the page') || ${say}.includes('could not')`, { timeout: 60000 });
    c.ok('compose places it, a loop of 60 at 30', (await page.eval(say)).includes('a 30 fps loop of 60'), await page.eval(say));
    await c.shot('6-in-compose');
  }
}

// ── Emitters and fields ─────────────────────────────────────────────────────

await c.go(c.base + '/apps/particles/');
await page.until(`${say}.includes('alive')`, { timeout: 20000 });
key(' '); await wait(200);
const chip = (name, text) => page.click(`[...${row(name)}.querySelectorAll('button')].find(b => b.textContent === ${JSON.stringify(text)})`);
await scrubTo(20);
const torchAt20 = await pixels();

// A ring, aimed outward, as a burst: a bloom.
await chip('mode', 'burst');
await chip('emitter', 'ring');
await wait(200);
await chip('launch', 'outward');
await set('gravity px/s²', '0');
await scrubTo(12);
c.ok('a ring aimed outward blooms', apart(await pixels(), torchAt20) > 4, 'apart by ' + apart(await pixels(), torchAt20).toFixed(1));
await c.shot('7-ring-bloom');

// The one-shot as a sprite sheet too: M6's Done when — a torch loop and a burst, both as sheets.
await page.downloadsTo(DL);
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.click(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent === 'Download a sprite sheet')`);
await page.until(`/^downloaded|failed/.test(${say})`, { timeout: 120000 });
const burstZip = await downloaded('particles_burst_55f_sheet.zip');
const burstJson = burstZip ? readZip(burstZip).find(e => e.name.endsWith('.json')) : null;
const burstSheet = burstJson ? JSON.parse(burstJson.bytes.toString()) : null;
c.ok('a burst leaves as a sprite sheet too, tagged as played once', !!burstSheet && burstSheet.frames.length === 55
  && burstSheet.meta.frameTags[0].loop === false, burstSheet ? `${burstSheet.frames.length} frames, ${JSON.stringify(burstSheet.meta.frameTags[0])}` : await page.eval(say));

// A stream through a vortex and curl noise: every frame still its own, the loop still closed.
await chip('mode', 'stream');
await chip('emitter', 'disc');
await set('gravity px/s²', '-200');
await set('vortex px/s²', '600');
await set('curl noise px/s²', '900');
await scrubTo(17);
const swirl = await pixels();
c.ok('a vortex and curl noise move the stream', apart(swirl, torchAt20) > 4);
await scrubTo(59); key('.'); await wait(300);
for (let i = 0; i < 17; i++) key('.');
await wait(500);
c.ok('through a field, the loop still closes pixel for pixel', apart(await pixels(), swirl) === 0,
  `${await page.eval(count)}, apart by ${apart(await pixels(), swirl)}`);
const ms = await page.eval(`(async () => {
  const { particlesAt, prepare } = await import('/apps/particles/model.js');
  const m = prepare({ rate: 90, period: 2, life: 1.4, gravity: -200, vortex: 600, noise: 900, shape: 'disc' });
  const t0 = performance.now(); for (let i = 0; i < 20; i++) particlesAt(m, i / 30); return (performance.now() - t0) / 20;
})()`);
c.ok('a frame through the fields costs less than a 60 fps frame', ms < 16, ms.toFixed(1) + ' ms');
await c.shot('8-swirl');

// Depth: the cone tilted into it, a camera close in — far ones small, near ones large, and still a loop.
await set('vortex px/s²', '0');
await set('curl noise px/s²', '0');
await set('into depth °', '160');
await set('focal px', '400');
await scrubTo(24);
const deep = await pixels();
await set('into depth °', '0');
await scrubTo(24);
const flatNow = await pixels();
c.ok('into depth, the same stream is another picture', apart(deep, flatNow) > 2, 'apart by ' + apart(deep, flatNow).toFixed(1));
await set('into depth °', '160');
await scrubTo(59); key('.'); await wait(300);
for (let i = 0; i < 24; i++) key('.');
await wait(500);
c.ok('in depth, the loop still closes pixel for pixel', apart(await pixels(), deep) === 0,
  `${await page.eval(count)}, apart by ${apart(await pixels(), deep)}`);
await c.shot('9-depth');

// ── Guides: seen in the preview, dragged, never saved ───────────────────────

await c.go(c.base + '/apps/particles/');
await page.until(`${say}.includes('alive')`, { timeout: 20000 });
key(' '); await wait(200);
await scrubTo(10);
const guided = await pixels();
key('g'); await wait(300);
const bare = await pixels();
c.ok('G takes the guides away, and the particles stay', apart(guided, bare) > 1
  && (await page.eval(`${row('show, preview only  [G]')}?.querySelector('input')?.checked`)) === false);
key('g'); await wait(300);
// Within a level, not to the pixel: Chrome moves a canvas read back often off
// the GPU and draws it a hair differently after (check-frames.mjs says the same).
c.ok('and G brings them back', apart(await pixels(), guided) <= 1, 'apart by ' + apart(await pixels(), guided).toFixed(2));

/** Where a point of the picture, from its centre, is on screen. */
const onScreen = (x, y) => page.eval(`(() => { const r = document.getElementById('stage').getBoundingClientRect();
  return [r.left + r.width / 2 + ${x} * r.width / 1080, r.top + r.height / 2 + ${y} * r.height / 1080]; })()`);
const value = name => page.eval(`Number(${row(name)}?.querySelector('.pp-num')?.value)`);
const grab = await onScreen(0, 260);
await page.pointer(grab, [grab[0] + 80, grab[1] - 60], 8);
await wait(300);
const moved = [await value('x from centre'), await value('y from centre')];
const css = await page.eval(`document.getElementById('stage').getBoundingClientRect().width / 1080`);
c.ok('the emitter dragged by its handle, its rows following', Math.abs(moved[0] - 80 / css) <= 2 && Math.abs(moved[1] - (260 - 60 / css)) <= 2,
  `x ${moved[0]}, y ${moved[1]}`);
await page.pointer(await onScreen(300, -300), await onScreen(200, -200), 4);
await wait(200);
c.ok('a press away from any handle moves nothing', (await value('x from centre')) === moved[0]);

await set('vortex px/s²', '500');
const fgrab = await onScreen(0, 0);
await page.pointer(fgrab, [fgrab[0] - 50, fgrab[1] + 40], 6);
await wait(300);
const f = [await value('centre x'), await value('centre y')];
c.ok('the fields\' centre dragged by its handle', Math.abs(f[0] + 50 / css) <= 2 && Math.abs(f[1] - 40 / css) <= 2, `fx ${f[0]}, fy ${f[1]}`);
await c.shot('10-guides');

// Saved, the render is the particles alone: the replay, which draws no guides, is it to the pixel.
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
key('S');
await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
const gid = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
const clean = gid && await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { openFrames } = await import('/core/rebuild.js');
  const { object, url } = await Vault.load(${JSON.stringify(gid || '')});
  const h = await openFrames(object, { url });
  const img = await createImageBitmap(await (await fetch(url)).blob());
  const a = new OffscreenCanvas(img.width, img.height).getContext('2d'); a.drawImage(img, 0, 0);
  const b = new OffscreenCanvas(img.width, img.height).getContext('2d'); b.drawImage(h.frame(10), 0, 0);
  const da = a.getImageData(0, 0, img.width, img.height).data, db = b.getImageData(0, 0, img.width, img.height).data;
  let worst = 0; for (let i = 0; i < da.length; i++) worst = Math.max(worst, Math.abs(da[i] - db[i]));
  h.dispose(); return worst;
})()`);
c.ok('saved with the guides on, its picture has none', clean === 0, 'worst ' + clean);

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
