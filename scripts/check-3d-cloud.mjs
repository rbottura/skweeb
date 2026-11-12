#!/usr/bin/env node
/**
 * scripts/check-3d-cloud.mjs — a cloud of dots in the 3D app (apps/3d/cloud.js,
 * 2026-11-11): particles' emitter in 3D, its dots placed once, in Chrome.
 *
 *   node scripts/check-3d-cloud.mjs
 *
 * Served as plain files with no vault, a cloud added from the menu draws, and
 * one born on an object with none to be had is a disc (rule 7). On the server,
 * the three opening shapes hidden: the cloud unlit, in BEC's identity to the
 * pixel; C deals its colours anew and moves no dot, R moves them; born on a
 * shape of the vault — an L with nothing in its corner — its dots are where
 * the L has ink and nowhere else; a palette of the vault colours it, exactly;
 * the style's outline rings every dot. Saved: a `model`, the L and the palette
 * its parents; drawn again by its app it is its render, at scale 2 twice the
 * pixels, the same picture; `?open=` brings the cloud back, born on the L.
 * In time (G2, apps/3d/forces.js), more dots than three's thousand: a force
 * with no time moves nothing; the time set, its last frame shown, the dots
 * fallen as far as gravity takes them; drawn back to rest and on again, the
 * same frame; played from its end, from rest again; saved, an evolution that
 * plays once, replayed to its render. With WebGPU taken away, three draws it
 * with WebGL2, in its colours. And no page said anything wrong.
 */

import { startCheck, inner } from './check-kit.mjs';   // inner: a smart object as its app has it (S6b)
import { PALETTES } from '../apps/3d/bec-palettes.js';

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const cards = `[...document.querySelectorAll('.pp-card')].filter(c => !c.parentElement.closest('.pp-card'))`;
const cardRow = (i, name) => `[...${cards}[${i}].querySelectorAll('.pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const panelRow = name => `[...document.querySelectorAll('#side > .pp > .pp-body .pp-row:not(.pp-stack-layer .pp-row), .viewer-head > .vf .pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
/** Values set on a row's panel, as a hand would: the cloud's card, or the app's. */
const setOn = (row, values) => page.eval(`import('/core/param-rows.js').then(({ rowParams }) => { rowParams(${row}).params.set(${JSON.stringify(values)}); return true; })`);
const CLOUD = 3;                                      // the opening's box, sphere and torus, then the cloud
const setCloud = async values => { await setOn(cardRow(CLOUD, 'emitter'), values); await wait(900); };
const setView = async values => { await setOn(panelRow('sun'), values); await wait(900); };
const cardValue = name => page.eval(`(${cardRow(CLOUD, name)}?.querySelector('.pp-num, select')?.value)`);
const tapKey = k => page.eval(`(() => { for (const type of ['keydown', 'keyup'])
  document.dispatchEvent(new KeyboardEvent(type, { code: 'Key${k.toUpperCase()}', key: '${k}', bubbles: true })); })()`);
const addCloud = async () => {
  await page.typeInto(`[...document.querySelectorAll('.pp-cards-add')].find(m => !m.closest('.pp-card'))`, 'cloud');
  await page.until(`${cards}.length === 4`, { timeout: 10000 }).catch(() => {});
  await wait(800);
};
const BEC = PALETTES.bec;
/** How many pixels of the preview are exactly each of these colours. */
const exactly = hexes => page.eval(`(() => { const c = document.getElementById('stage'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const want = ${JSON.stringify(hexes)}.map(h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16))), out = want.map(() => 0);
  for (let i = 0; i < d.length; i += 4) want.forEach((w, k) => { if (d[i] === w[0] && d[i + 1] === w[1] && d[i + 2] === w[2]) out[k]++; });
  return out; })()`);
/**
 * Where the preview has ink — far from the ground — kept in the page as `name`; with `than`, how much of it
 * differs from that one kept before, in where there is ink and in its colours, as shares of the picture.
 */
const inkOf = (name, than = null) => page.eval(`(() => { const c = document.getElementById('stage'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const n = c.width * c.height, mask = new Uint8Array(n), rgb = new Uint8Array(n * 3); let ink = 0, x0 = 1, y0 = 1, x1 = 0, y1 = 0;
  for (let p = 0; p < n; p++) { const i = p * 4; rgb.set([d[i], d[i + 1], d[i + 2]], p * 3);
    if (Math.abs(d[i] - 255) + Math.abs(d[i + 1] - 253) + Math.abs(d[i + 2] - 246) > 90) { mask[p] = 1; ink++;
      const x = (p % c.width) / c.width, y = Math.floor(p / c.width) / c.height; x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
  window['__' + ${JSON.stringify(name)}] = { mask, rgb, w: c.width, h: c.height };
  const out = { ink: ink / n, box: ink ? [x0, y0, x1, y1].map(v => +v.toFixed(3)) : null };
  const b = ${than ? `window['__' + ${JSON.stringify(than)}]` : 'null'};
  if (b && b.w === c.width && b.h === c.height) { let where = 0, hue = 0;
    for (let p = 0; p < n; p++) { if (mask[p] !== b.mask[p]) where++;
      else if (mask[p] && Math.abs(rgb[p * 3] - b.rgb[p * 3]) + Math.abs(rgb[p * 3 + 1] - b.rgb[p * 3 + 1]) + Math.abs(rgb[p * 3 + 2] - b.rgb[p * 3 + 2]) > 60) hue++; }
    Object.assign(out, { where: where / n, hue: hue / n }); }
  return out; })()`);
/** The ink in a part of the picture: [x0, y0, x1, y1] as shares of the whole, the share of its pixels. */
const inkIn = (name, [x0, y0, x1, y1]) => page.eval(`(() => { const k = window['__' + ${JSON.stringify(name)}]; let n = 0, all = 0;
  for (let y = Math.floor(${y0} * k.h); y < Math.ceil(${y1} * k.h); y++) for (let x = Math.floor(${x0} * k.w); x < Math.ceil(${x1} * k.w); x++) { all++; n += k.mask[y * k.w + x]; }
  return all ? n / all : 0; })()`);
const drawn = `/cloud of dots|nothing draws/.test(${say})`;

// ── Rule 7 ──────────────────────────────────────────────────────────────────

await c.go(c.plain + '/apps/3d/');
await page.until(`/box, sphere, torus|nothing draws/.test(${say})`, { timeout: 30000 });
await addCloud();
c.ok('with no vault, a cloud added from the menu draws, in BEC\'s colours', (await page.eval(say)).includes('cloud of dots')
  && (await exactly(BEC)).every(n => n > 20), await page.eval(say));
await setCloud({ emitter: 'object' });
c.ok('…born on an object none can give: a disc, drawn all the same', (await exactly(BEC)).every(n => n > 20));

// ── On the server: the cloud alone, seen square on ──────────────────────────

await c.go(c.base + '/apps/3d/');
const plainNoise = c.quiet().filter(e => !(e.url || '').endsWith('/api/vault'));   // the plain page's, heard as it went
c.ok('…and with no vault it said nothing else', !plainNoise.length, JSON.stringify(plainNoise).slice(0, 300));
await page.until(`/box, sphere, torus|nothing draws/.test(${say})`, { timeout: 30000 });
for (const i of [0, 1, 2]) await page.click(`[...${cards}[${i}].querySelectorAll('.pp-head .pp-btn')].find(b => b.textContent === 'shown')`);
await addCloud();
await setCloud({ x: 0, emitter: 'disc', extent: 1.4, depth: 0, count: 900 });
await setView({ yaw: 0, pitch: 0, distance: 7, tx: 0, ty: 0, tz: 0 });
await page.until(drawn, { timeout: 30000 });
const inks = await exactly(BEC);
c.ok('a cloud alone, unlit: its dots in BEC\'s identity, every colour exactly', inks.every(n => n > 200), JSON.stringify(inks));
c.ok('…on a disc, square to the eye: round, in the middle', (b => !!b && Math.abs((b[0] + b[2]) / 2 - 0.5) < 0.03 && Math.abs((b[1] + b[3]) / 2 - 0.5) < 0.03
  && Math.abs((b[2] - b[0]) - (b[3] - b[1])) < 0.03)((await inkOf('disc')).box), JSON.stringify((await inkOf('disc')).box));
const huesWere = Number(await cardValue('colours dealt (C)')), seedWas = Number(await cardValue('where they are (R)'));
await tapKey('c');
await wait(900);
const byC = await inkOf('rehued', 'disc');
// Where there is ink moves only at the dots' edges, a colour nearer the ground's leaving less of one there.
c.ok('C: its colours dealt anew, not a dot moved', Number(await cardValue('colours dealt (C)')) === huesWere + 1 && byC.where < 0.004 && byC.hue > 0.02,
  JSON.stringify(byC));
await tapKey('r');
await wait(900);
const byR = await inkOf('reseeded', 'rehued');
c.ok('R: the dots born somewhere else', Number(await cardValue('where they are (R)')) === seedWas + 1 && byR.where > 0.02, JSON.stringify(byR));
await c.shot('1-disc');

// ── Born on a shape of the vault: an L ──────────────────────────────────────

const made = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { thumbFromBlob } = await import('/core/thumb.js');
  const { savePalette } = await import('/core/vault-palette.js');
  const pic = new OffscreenCanvas(400, 400), g = pic.getContext('2d');      // an L: a bar down, a bar across its foot
  g.fillStyle = '#000'; g.fillRect(40, 40, 100, 320); g.fillRect(40, 260, 320, 100);
  const blob = await pic.convertToBlob({ type: 'image/png' });
  const L = (await Vault.save({ type: 'shape', title: 'an L', tags: ['import'], origin: { app: 'import', version: '1.0.0' }, seed: null,
    recipe: null, render: { blob, ext: 'png', w: 400, h: 400 }, thumb: await thumbFromBlob(blob) })).id;
  const palette = (await savePalette({ title: 'magenta and cyan', colours: ['#ff00ff', '#00ffff'] })).id;
  await Vault.refresh();
  return { L, palette }; })()`);
c.ok('an L and a palette in the vault', !!(made && made.L && made.palette), JSON.stringify(made));
await setCloud({ emitter: 'object', from: made.L, extent: 2.6, count: 4000, sizeMin: 0.012, sizeMax: 0.022 });
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);   // chosen no more: no handles over the L
await page.until(`(() => { const c = document.getElementById('stage'), d = c.getContext('2d').getImageData(c.width * 0.7 | 0, c.height * 0.3 | 0, 1, 1).data;
  return Math.abs(d[0] - 255) + Math.abs(d[1] - 253) + Math.abs(d[2] - 246) < 10; })()`, { timeout: 15000 }).catch(() => {});
await wait(600);
const onL = await inkOf('L');
const [x0, y0, x1, y1] = onL.box || [0, 0, 0, 0], w = x1 - x0, h = y1 - y0;
const corner = await inkIn('L', [x0 + 0.42 * w, y0, x1, y0 + 0.6 * h]);
const bars = [await inkIn('L', [x0, y0, x0 + 0.25 * w, y1]), await inkIn('L', [x0, y0 + 0.75 * h, x1, y1])];
c.ok('born on the L: as wide as it is tall, as the L is', !!onL.box && Math.abs(w - h) < 0.03 && w > 0.3, JSON.stringify(onL.box));
c.ok('…its dots where it has ink, none in its empty corner', corner < 0.01 && bars.every(b => b > 0.3),
  `corner ${(corner * 100).toFixed(2)}%, bars ${bars.map(b => (b * 100).toFixed(0) + '%').join(' ')}`);
await setCloud({ colours: made.palette });
await page.until(`(() => { const c = document.getElementById('stage'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  for (let i = 0; i < d.length; i += 4) if (d[i] === 255 && d[i + 1] === 0 && d[i + 2] === 255) return true; return false; })()`, { timeout: 10000 }).catch(() => {});
const tinted = [await exactly(['#ff00ff', '#00ffff']), await exactly(BEC)];
c.ok('a palette of the vault: the dots in its colours, exactly, and BEC\'s gone', tinted[0].every(n => n > 200) && tinted[1].every(n => n < 20),
  JSON.stringify(tinted));
const dark = () => page.eval(`(() => { const c = document.getElementById('stage'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] < 40 && d[i + 1] < 40 && d[i + 2] < 40) n++; return n; })()`);
const darkBefore = await dark();
await setView({ outline: 4 });
const darkAfter = await dark();
c.ok('the style\'s outline: every dot ringed in ink', darkBefore < 10 && darkAfter > 3000, `${darkBefore} → ${darkAfter} dark pixels`);
await c.shot('2-on-the-L');

// ── Saved, replayed, drawn again, opened ────────────────────────────────────

await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'S' }))`);
await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
const mid = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
const o = mid ? inner(await (await fetch(c.base + '/api/vault/' + mid)).json()) : null;
const kept = o && o.recipe.shapes.find(s => s.id === 'cloud');
c.ok('saved: a model titled by what is shown, the cloud in its recipe', !!o && o.type === 'model' && o.title === 'cloud of dots'
  && !!kept && kept.params.emitter === 'object' && kept.params.from === made.L && kept.params.count === 4000, o ? `${o.id} "${o.title}"` : await page.eval(say));
c.ok('…the L it is born on and its palette its parents', !!o && o.parents.includes(made.L) && o.parents.includes(made.palette), o && JSON.stringify(o.parents));
if (o) {
  const replay = await page.eval(`(async () => {
    const { Vault } = await import('/core/vault.js');
    const { openFrames } = await import('/core/rebuild.js');
    const app = await import('/apps/3d/rebuild.js');
    const { object, url } = await Vault.load(${JSON.stringify(o.id)});
    const img = await createImageBitmap(await (await fetch(url)).blob());
    const read = (src, w, h) => { const x = new OffscreenCanvas(w, h).getContext('2d'); x.drawImage(src, 0, 0, w, h); return x.getImageData(0, 0, w, h).data; };
    const render = read(img, img.width, img.height);
    const it = object.type === 'skw' ? (await import('/core/smart.js')).unwrap(object) : object;
    const own = await app.openObject(it, { url });
    const again = read(own.frame(0), img.width, img.height);
    let worst = 0, off = 0;
    for (let i = 0; i < render.length; i++) { const d = Math.abs(render[i] - again[i]); worst = Math.max(worst, d); if (d > 8) off++; }
    const big = await openFrames(object, { url, scale: 2 }), bigFrame = big.frame(0);
    const down = read(bigFrame, img.width, img.height);
    let mean = 0; for (let i = 0; i < render.length; i++) mean += Math.abs(render[i] - down[i]); mean /= render.length;
    const out = { worst, off: off / render.length, big: [big.scale, bigFrame.width, bigFrame.height], mean };
    own.dispose(); big.dispose(); return out; })()`);
  c.ok('drawn again by its app, born on the L read again: it is its render', replay.off < 0.001 && replay.worst <= 64,
    `worst ${replay.worst}, ${(replay.off * 100).toFixed(3)}% past 8`);
  c.ok('at scale 2: drawn again, twice the pixels, the same picture', replay.big[0] === 2 && replay.big[1] === 2160 && replay.mean < 3,
    `${JSON.stringify(replay.big)}, mean difference ${replay.mean.toFixed(3)} of 255`);

  await c.go(c.base + '/apps/3d/?open=' + o.id);
  await page.until(`${say}.includes('opened') || ${say}.includes('could not')`, { timeout: 30000 });
  await wait(1500);
  c.ok('?open= brings the cloud back, born on the L, in the palette', (await page.eval(`${cards}.length`)) === 4
    && (await cardValue('emitter')) === 'object' && Number(await cardValue('dots')) === 4000
    && (await exactly(['#ff00ff', '#00ffff'])).every(n => n > 200), await page.eval(say));
}

// ── In time, under its forces (G2): an evolution, played once ────────────────

const strip = `document.querySelector('.viewer-player')`;
const scrubTo = async i => { await page.eval(`(s => { s.value = ${i}; s.dispatchEvent(new Event('input', { bubbles: true })); return true; })(document.querySelector('.tp-scrub'))`); await wait(500); };
const scrubbed = () => page.eval(`Number(document.querySelector('.tp-scrub')?.value)`);
await c.go(c.base + '/apps/3d/');
await page.until(`/box, sphere, torus|nothing draws/.test(${say})`, { timeout: 30000 });
for (const i of [0, 1, 2]) await page.click(`[...${cards}[${i}].querySelectorAll('.pp-head .pp-btn')].find(b => b.textContent === 'shown')`);
await addCloud();
// More dots than a thousand: three hands their matrices on by another buffer, once a frame (renderer.js).
await setCloud({ x: 0, emitter: 'disc', extent: 1.2, depth: 0, count: 1500, drag: 0 });
await setView({ yaw: 0, pitch: 0, distance: 7, tx: 0, ty: 0, tz: 0 });
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
await wait(500);
const rest = await inkOf('rest');
await setCloud({ gravity: 0.5 });
c.ok('a force with no time: the dots at rest, no player', (await inkOf('forced', 'rest')).where < 0.0005 && (await page.eval(`!${strip} || ${strip}.hidden`)));
await setView({ time: 2, length: 25, fps: 24 });
await page.until(`${say}.includes('2.00 s under the forces')`, { timeout: 15000 }).catch(() => {});
const fallen = await inkOf('fallen', 'rest');
// Half of 0.5 by 2 s squared: a unit down, a fifth of a picture seven away through 40°.
const down = fallen.box && rest.box ? (fallen.box[1] + fallen.box[3]) / 2 - (rest.box[1] + rest.box[3]) / 2 : 0;
c.ok('time under the forces: its last frame shown, the dots a unit down', await scrubbed() === 24 && !(await page.eval(`${strip}.hidden`))
  && Math.abs(down - 0.196) < 0.02, `frame ${await scrubbed()}, down ${down.toFixed(3)} of the picture`);
await scrubTo(0);
const back = await inkOf('back');            // the player under the viewer now: another canvas, its box compared
await scrubTo(24);
const again = await inkOf('again', 'fallen');
const near = (a, b) => !!a && !!b && a.every((x, i) => Math.abs(x - b[i]) < 0.006);
c.ok('…drawn back to rest, and on again: the same frame', near(back.box, rest.box) && again.where < 0.0005 && again.hue < 0.0005,
  JSON.stringify([back.box, rest.box, again.where]));
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))`);
await wait(250);
const replaying = [await scrubbed(), await page.eval(`!!document.querySelector('.tp-play.tp-playing')`)];
await page.until(`!document.querySelector('.tp-play.tp-playing')`, { timeout: 10000 }).catch(() => {});
c.ok('…played from its end, from rest again — and it stops at its end', replaying[0] < 24 && replaying[1] && (await scrubbed()) === 24, JSON.stringify(replaying));
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'S' }))`);
await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
const eid = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
const e = eid ? inner(await (await fetch(c.base + '/api/vault/' + eid)).json()) : null;
c.ok('saved: an evolution, 25 frames that play once', !!e && e.type === 'sequence' && e.render.frames === 25 && e.render.loop === false
  && e.title === 'cloud of dots · evolving ×25' && e.tags.includes('evolving') && !e.tags.includes('loop'), e ? `${e.type} "${e.title}" ${JSON.stringify(e.render)}` : await page.eval(say));
if (e) {
  const replay = await page.eval(`(async () => {
    const { Vault } = await import('/core/vault.js');
    const app = await import('/apps/3d/rebuild.js');
    const { object, url } = await Vault.load(${JSON.stringify(e.id)});
    const img = await createImageBitmap(await (await fetch(url)).blob());
    const read = src => { const x = new OffscreenCanvas(img.width, img.height).getContext('2d'); x.drawImage(src, 0, 0, img.width, img.height); return x.getImageData(0, 0, img.width, img.height).data; };
    const render = read(img);
    const it = object.type === 'skw' ? (await import('/core/smart.js')).unwrap(object) : object;
    const own = await app.openObject(it, { url });
    const first = read(own.frame(0)), last = read(own.frame(24));
    let off = 0, moved = 0;
    for (let i = 0; i < render.length; i++) { if (Math.abs(render[i] - last[i]) > 8) off++; if (Math.abs(first[i] - last[i]) > 8) moved++; }
    const out = { off: off / render.length, moved: moved / render.length, length: own.length, loop: own.loop };
    own.dispose(); return out; })()`);
  c.ok('…replayed: its last frame its render, its first at rest, no loop', replay.off < 0.001 && replay.moved > 0.01 && replay.length === 25 && replay.loop === false,
    JSON.stringify(replay));
}
await c.shot('3-in-time');

// ── With no WebGPU: three falls back to WebGL2, as on the laptop's Intel ────

const stub = await page.beforeLoad(`Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });`);
await c.go(c.base + '/apps/3d/');
await page.until(`/box, sphere, torus|nothing draws/.test(${say})`, { timeout: 30000 });
await addCloud();
c.ok('no WebGPU: the cloud drawn with WebGL2, every colour exactly', (await page.eval(say)).endsWith('WebGL2') && (await exactly(BEC)).every(n => n > 20),
  await page.eval(say));
await page.forget(stub);

const noise = c.quiet();
c.ok('no page said anything wrong', !noise.length, JSON.stringify(noise).slice(0, 400));
await c.finish();
