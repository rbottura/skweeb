#!/usr/bin/env node
/**
 * scripts/check-particles-life.mjs — M15e's link in Chrome: a loop's frames
 * as sprites, a particle showing the frame of its age.
 *
 *   node scripts/check-particles-life.mjs
 *
 * A life is made first — a burst of dots, played once, saved: thirty frames,
 * and no GPU asked (the shader's own life as sprites is check-shader-save's).
 * On a new page it is chosen as the sprites: its frames counted, and worn by
 * age without being asked. At half its life a particle shows the middle
 * frame, to the pixel — the picture drawn with that one frame for every
 * particle — and not the one before it. Saved, the life is its parent; its
 * sprite sheet has every frame; replayed on another page, its frame is its
 * render; reopened, worn by age still. Turned to *one each* the picture
 * changes, S is its next state, and reopened it is still one each: a recipe
 * arriving is not a choice. And no page said anything wrong.
 */

import fs   from 'node:fs';
import path from 'node:path';
import { startCheck, inner } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const DL = path.join(c.dir, 'downloads');
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const count = `(document.querySelector('.tp-count')?.textContent || '')`;
const key = k => page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)} }))`);
const wait = ms => new Promise(r => setTimeout(r, ms));
const row = name => `[...document.querySelectorAll('.pp-row:not(.pp-stack-layer .pp-row)')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const scrubTo = async tick => {
  await page.eval(`(() => { const s = document.querySelector('.tp-scrub'); s.value = ${tick};
    s.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await wait(250);
};
/** The picture as a 16 × 16 grid of mean colours. */
const pixels = () => page.eval(`(() => { const c = document.getElementById('stage');
  const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const n = 16, out = new Array(n * n).fill(0), k = new Array(n * n).fill(0);
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
    const i = (y * c.width + x) * 4, j = Math.floor(y * n / c.height) * n + Math.floor(x * n / c.width);
    out[j] += d[i] + d[i + 1] + d[i + 2]; k[j]++;
  }
  return out.map((v, j) => v / Math.max(1, k[j]) / 3); })()`);
const apart = (p, q) => Math.max(...p.map((v, i) => Math.abs(v - q[i])));
const look = (k, v) => page.eval(`import('/core/param-rows.js').then(({ rowParams }) => rowParams(${row('fps')}).params.set(${JSON.stringify(k)}, ${JSON.stringify(v)}))`);
const emits = (k, v) => page.eval(`import('/core/param-rows.js').then(({ rowParams }) => rowParams(${row('seed')}).params.set(${JSON.stringify(k)}, ${JSON.stringify(v)}))`);
/** Saved by `how`: the id the bar said — a smart object's — and the object as its app has it. */
const saveAs = async how => {
  await page.eval(`document.querySelector('.bar-say').textContent = ''`);
  await how();
  await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
  const sid = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
  return sid ? { sid, o: inner(await (await fetch(c.base + '/api/vault/' + sid)).json()) } : { sid: null, o: null };
};
const open = async () => {
  await c.go(c.base + '/apps/particles/');
  await page.until(`${say}.includes('alive')`, { timeout: 20000 });
  key(' ');                                       // held still
  await wait(300);
};
const worn = () => page.eval(`${row('a particle wears')}?.querySelector('.pp-chip--on')?.textContent || ''`);

// ── A life: a burst of dots, played once, saved ─────────────────────────────

await open();
for (const [k, v] of [['mode', 'burst'], ['count', 24], ['life', 1], ['lifeSpread', 0]]) await emits(k, v);
await look('size', 140);                         // dots large enough to tell one frame from another, worn small
await wait(400);
c.ok('with no sprites, nothing asks what a particle wears', await page.eval(`${row('a particle wears')}.hidden`));
const life = await saveAs(() => key('S'));
c.ok('a life saved: thirty frames, played once', !!life.o && life.o.type === 'sequence' && life.o.render.frames === 30
  && life.o.render.loop === false, life.o ? `${life.o.type} ${life.o.render.frames}, loop ${life.o.render.loop}` : await page.eval(say));

if (life.o) {
  // ── Chosen as the sprites, on a page of its own ───────────────────────────

  await open();
  for (const [k, v] of [['mode', 'burst'], ['count', 5], ['life', 1], ['lifeSpread', 0]]) await emits(k, v);
  await look('size', 160);
  await look('grow', 1);                          // worn whole to its end: what changes over its life is its frame
  await look('fade', false);
  await scrubTo(15);
  const dots = await pixels();
  await page.click(`[...${row('sprites')}.querySelectorAll('button')].find(b => b.textContent === 'Choose…')`);
  await page.until(`!!document.querySelector('.vp--visible')`, { timeout: 20000 });
  await wait(1200);
  const offered = await page.eval(`(() => {
    const cell = [...document.querySelectorAll('.vp--visible .vp-cell')].find(k => k.querySelector('.vp-use')
      && k.querySelector('.vp-name')?.textContent === ${JSON.stringify(life.o.title)});
    if (cell) cell.querySelector('.vp-use').click();
    return !!cell;
  })()`);
  c.ok('the picker offers a loop as sprites', offered, life.o.title);
  if (!offered) await look('sprites', life.sid);
  await page.until(`/[0-9]+ (frame|sprite)s?|could not/.test(${say})`, { timeout: 60000 });
  const told = await page.eval(say);
  /** The life as chosen: this check's own, or one made as it was, already in the vault. */
  const lifeId = await page.eval(`import('/core/param-rows.js').then(({ rowParams }) => rowParams(${row('fps')}).params.get('sprites'))`);
  c.ok('its frames are the sprites, every one', told.includes(': 30 frames') && !told.includes('drawing dots'), told);
  await wait(500);
  c.ok('a loop chosen, a particle wears the frame of its age', (await worn()) === 'the frame of its age', await worn());
  const aged = await pixels();
  c.ok('the particles are its frames now, not dots', apart(aged, dots) > 2, 'apart by ' + apart(aged, dots).toFixed(1));
  await c.shot('1-a-life-worn');

  // ── Saved; at half its life, the middle frame ─────────────────────────────

  await page.downloadsTo(DL);
  const made = await saveAs(() => key('S'));
  const o = made.o;
  c.ok('saved, the life its parent, worn by age in its recipe', !!o && JSON.stringify(o.parents) === JSON.stringify([lifeId])
    && o.recipe.picture.wears === 'age' && o.recipe.picture.sprites === lifeId, o ? `${JSON.stringify(o.parents)}, wears ${o.recipe.picture.wears}` : await page.eval(say));
  if (o) {
    const mid = await page.eval(`(async () => {
      const { loadSprites } = await import('/core/sprites.js');
      const { openParticles } = await import('/apps/particles/frames.js');
      const { images } = await loadSprites(${JSON.stringify(lifeId)});
      const r = ${JSON.stringify(o.recipe)}, one = { ...r, picture: { ...r.picture, wears: 'pick' } };
      const data = (recipe, sprites) => { const f = openParticles(recipe, sprites).frame(15); return f.getContext('2d').getImageData(0, 0, f.width, f.height).data; };
      const worst = (a, b) => { let w = 0; for (let i = 0; i < a.length; i++) w = Math.max(w, Math.abs(a[i] - b[i])); return w; };
      const n = images.length, m = Math.floor(n / 2), at = data(r, images);
      return { n, m, side: Math.max(images[0].width, images[0].height),
               middle: worst(at, data(one, [images[m]])), before: worst(at, data(one, [images[m - 1]])), first: worst(at, data(one, [images[0]])) };
    })()`);
    c.ok('at half its life, the middle frame — to the pixel', mid.n === 30 && mid.m === 15 && mid.middle === 0, JSON.stringify(mid));
    c.ok('…and not the one before it, nor the first', mid.before > 0 && mid.first > 0, `before ${mid.before}, first ${mid.first}`);
    c.ok('a frame is kept no larger than a sprite wants', mid.side === 512, mid.side + ' px');

    // Its sprite sheet: every frame of the burst, the life on them.
    await page.eval(`document.querySelector('.bar-say').textContent = ''`);
    await page.click(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent === 'Download a sprite sheet')`);
    await page.until(`/^downloaded|failed/.test(${say})`, { timeout: 120000 });
    let sheet = null;
    for (let i = 0; i < 100 && !sheet; i++) {
      const f = fs.existsSync(DL) && fs.readdirSync(DL).find(n => n.endsWith('_sheet.zip'));
      if (f) sheet = fs.readFileSync(path.join(DL, f)).toString('latin1'); else await wait(200);
    }
    const cells = sheet ? (sheet.match(/"spriteSourceSize"/g) || []).length : 0;
    c.ok('on its sheet: every frame of it', cells === o.render.frames, `${cells} frames of ${o.render.frames} · ${await page.eval(say)}`);

    // ── Replayed where nothing of it is loaded ───────────────────────────────

    await c.go(c.base + '/apps/vault/');
    await wait(1500);
    const replay = await page.eval(`(async () => {
      const { Vault } = await import('/core/vault.js');
      const { openFrames } = await import('/core/rebuild.js');
      const { object, url } = await Vault.load(${JSON.stringify(made.sid)});
      const h = await openFrames(object, { url });
      const img = await createImageBitmap(await (await fetch(url)).blob());
      const a = new OffscreenCanvas(img.width, img.height).getContext('2d');
      a.drawImage(img, 0, 0);
      const b = new OffscreenCanvas(img.width, img.height).getContext('2d');
      b.drawImage(await h.frame(15), 0, 0);
      const da = a.getImageData(0, 0, img.width, img.height).data, db = b.getImageData(0, 0, img.width, img.height).data;
      let worst = 0; for (let i = 0; i < da.length; i++) worst = Math.max(worst, Math.abs(da[i] - db[i]));
      return { worst, length: h.length, loop: h.loop, missing: h.missing };
    })()`);
    c.ok('replayed on another page, its frame is its render', replay.worst === 0 && replay.length === o.render.frames, JSON.stringify(replay));

    // ── Reopened; one each, and the next state says so ───────────────────────

    const reopen = async () => {
      await c.go(c.base + '/apps/particles/?open=' + made.sid);
      await page.until(`${say}.includes('opened') || ${say}.includes('could not')`, { timeout: 30000 });
      await wait(1500);
    };
    await reopen();
    c.ok('?open= brings it back, worn by age', (await worn()) === 'the frame of its age', await worn());
    await scrubTo(15);
    const back = await pixels();
    await page.click(`[...${row('a particle wears')}.querySelectorAll('button')].find(b => b.textContent === 'one each')`);
    await wait(400);
    c.ok('turned to one each, another picture', apart(await pixels(), back) > 0.5, 'apart by ' + apart(await pixels(), back).toFixed(2));
    const next = await saveAs(() => key('S'));
    c.ok('S again, its next state: one each', !!next.o && next.sid === made.sid && next.o.recipe.picture.wears === 'pick',
      next.o ? `${next.sid === made.sid ? 'the same object' : 'another'}, wears ${next.o.recipe.picture.wears}` : '');
    await reopen();
    c.ok('reopened, still one each: a recipe arriving is not a choice', (await worn()) === 'one each', await worn());
    await c.shot('2-one-each');
  }
}

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
