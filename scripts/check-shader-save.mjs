#!/usr/bin/env node
/**
 * scripts/check-shader-save.mjs — what the shader app saves, in a real browser.
 *
 *   node scripts/check-shader-save.mjs
 *
 * M15c: fire from its starter saved with S is a `sequence` — its recipe the
 * values and the chain, its seed the object's, no parents; replayed by its
 * own rebuild.js it is its saved render to the pixel, the same twice, and
 * at scale 2 drawn again at twice the pixels;
 * compose places the loop; `?open=` brings the chain back row for row; one
 * frame saves a `still`; and a print in tiles is the object drawn whole.
 *
 * Needs a GPU. Not in the tests loop.
 */

import { startCheck, inner } from './check-kit.mjs';   // inner: a smart object as its app has it (S6b)

const c = await startCheck();
const { page } = c;
const APP = c.base + '/apps/shader/';
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const cards = `[...document.querySelectorAll('.pp-card')]`;
const api = async id => inner(await (await fetch(c.base + '/api/vault/' + id)).json());
const key = k => page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(k)} }))`);
const settle = () => page.eval(`new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r(true))))`);
const num = label => `[...document.querySelectorAll('.pp-row')].find(r => r.textContent.includes(${JSON.stringify(label)}))?.querySelector('.pp-num')`;

async function saved() {
  const before = await page.eval(say);
  await key('s');
  await page.until(`/saved \\w+_\\d+_\\w+/.test(${say}) && ${say} !== ${JSON.stringify(before)}`, { timeout: 120000 });
  return (await page.eval(say)).match(/saved (\w+_\d+_\w+)/)[1];
}

/** A saved surface replayed by its own rebuild.js, frame `tick`, against its saved render. */
const replay = (id, tick = 0) => page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const shader = await import('/apps/shader/rebuild.js');
  const { object, url } = await Vault.load(${JSON.stringify(id)});
  const read = pic => { const k = new OffscreenCanvas(pic.width, pic.height), x = k.getContext('2d');
    x.drawImage(pic, 0, 0); return x.getImageData(0, 0, k.width, k.height).data; };
  const own = object.type === 'skw' ? (await import('/core/smart.js')).unwrap(object) : object;
  const h = await shader.openObject(own, {});
  const a = read(h.frame(${tick})), b = read(h.frame(${tick}));
  const r = read(await createImageBitmap(await (await fetch(url)).blob()));
  let worst = 0, same = a.length === b.length && a.length === r.length;
  for (let i = 0; same && i < a.length; i += 4) {
    for (let j = 0; j < 3; j++) worst = Math.max(worst, Math.abs(a[i + j] * a[i + 3] - r[i + j] * r[i + 3]) / 255);
    worst = Math.max(worst, Math.abs(a[i + 3] - r[i + 3]));
    for (let j = 0; j < 4; j++) if (a[i + j] !== b[i + j]) same = false;
  }
  // The loop closes: the frame after the last is the first.
  const first = read(h.frame(0)), round = read(h.frame(h.length));
  let closes = first.length === round.length;
  for (let i = 0; closes && i < first.length; i++) if (first[i] !== round[i]) closes = false;
  const big = await shader.openObject(own, { scale: 2 });
  const f = big.frame(0);
  const out = { length: h.length, fps: h.fps, width: h.width, height: h.height, worst: Math.round(worst * 10) / 10, same, closes,
                twice: [f.width, f.height], windows: typeof h.window === 'function', redraws: shader.redraws(own), reopens: shader.reopens(own) };
  h.dispose(); big.dispose();
  return out;
})()`);

// ── 1. Fire, saved as a loop ────────────────────────────────────────────────
await c.go(APP);
await page.until(`${cards}.length === 1 && ${say}.includes('1 of 1 rows on')`);
await page.click(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent === 'fire')`);
await page.until(`${cards}.length === 6 && ${say}.includes('6 of 6 rows on')`);
await key(' ');
for (let i = 0; i < 3; i++) await key('.');
await settle();
const at = +(await page.eval(say)).match(/frame (\d+) of 48/)[1] - 1;
const loopId = await saved();
const loop = await api(loopId);
c.ok('S saves fire as a sequence, the shader app\'s', loop.type === 'sequence' && loop.origin.app === 'shader', `${loopId} ${loop.type}`);
c.ok('its recipe the values and the chain, six rows', loop.recipe.chain.length === 6 && loop.recipe.frames === 48 && loop.recipe.chain[0].id === 'noise',
  loop.recipe.chain.map(r => r.id).join());
c.ok('its seed the object\'s, since a noise draws at random; made from nothing, no parents', loop.seed === 7 && !(loop.parents || []).length, `seed ${loop.seed}`);
c.ok('its render the format\'s, 48 frames at 24', loop.render.w === 1080 && loop.render.h === 1080 && loop.render.frames === 48 && loop.render.fps === 24,
  JSON.stringify(loop.render).slice(0, 120));
const again = await replay(loopId, at);
c.ok(`replayed, frame ${at + 1} is the saved picture to the pixel, the same twice`, again.worst === 0 && again.same, JSON.stringify(again));
c.ok('the loop closes: the frame after the last is the first', again.closes && again.length === 48 && again.fps === 24);
c.ok('at scale 2 it is drawn again, twice the pixels', again.redraws && again.twice.join() === '2160,2160', again.twice.join(' × '));

// ── 2. Placed, reopened ─────────────────────────────────────────────────────
await c.go(c.base + '/apps/compose/?place=' + loopId);
await page.until(`${say}.includes(' on the page') || ${say}.includes('could not')`, { timeout: 60000 });
c.ok('compose places it, a 24 fps loop of 48', (await page.eval(say)).includes('a 24 fps loop of 48'), await page.eval(say));

await c.go(APP + '?open=' + loopId);
await page.until(`${say}.includes('opened') || ${say}.includes('could not')`, { timeout: 30000 });
await page.until(`${cards}.length === 6`);
const back = await page.eval(`({ titles: ${cards}.map(k => k.querySelector('.pp-title').textContent).join(), seed: +${num('seed')}.value,
  frames: +${num('frames, a loop')}.value, second: ${cards}[1].querySelector('select')?.value })`);
c.ok('?open= brings it back: its six rows, its seed, its loop, a row\'s blend',
  back.titles === 'noise,noise,brightness,gradient,shape,gradient map' && back.seed === 7 && back.frames === 48 && back.second === 'multiply', JSON.stringify(back));

// ── 3. One frame is a still — the same smart object's next state (S6b) — and printed
await page.typeInto(num('frames, a loop'), '1');
await page.until(`!${say}.includes('frame ')`);
const stillId = await saved();
const still = await api(stillId);
const once = await replay(stillId, 0);
c.ok('one frame saves a still, replayed to the pixel', still.type === 'still' && !still.render.frames && once.worst === 0 && once.same, `${stillId} ${JSON.stringify(once)}`);

const printed = await c.printMatch(stillId, { scale: 2 });
c.ok(`printed in ${printed.tiles} tiles, the surface drawn whole — each window its part of it`,
  again.windows && printed.enlarged === 1 && printed.off < 0.002 && printed.mean < 0.3, JSON.stringify(printed));

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
