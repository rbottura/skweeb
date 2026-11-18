#!/usr/bin/env node
/**
 * scripts/check-3d-play.mjs — the worm's player in Chrome (M16a, docs/worm.md).
 *
 *   node scripts/check-3d-play.mjs
 *
 * Served as plain files with no vault, it opens on loft.js's own worm and
 * draws (rule 7): the sky above, the planet below, the worm in the middle —
 * turned blue, the middle turns blue. Z held — W by its place — the worm
 * walks ahead round the planet and stays on it, its wave moving; D held, it
 * turns right; the arrows walk it too; the camera follows, behind it and
 * above. Three brushes lie on its ground, the gamepad's own with no vault
 * (M16m): walked into, one is picked up — its card gone, carried, shown in
 * the strip of what it carries. A bigger planet, and it stands on that one. Unmounted, it asks for
 * no more frames, and mounted and unmounted again it holds nothing more;
 * mounted again, it walks. With a vault: a gamepad drawing named in the
 * address is the worm, its head where its stroke ends — drawn right to left,
 * its head to the left; a model's drawn body too. WebGPU or WebGL2,
 * whichever the machine has.
 */

import { startCheck, countHeld } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const counts = await countHeld(page);
const peek = `import('/apps/3d/play/main.js').then(m => m.peek())`;
const tune = values => page.eval(`import('/apps/3d/play/main.js').then(m => m.tune(${JSON.stringify(values)}))`);
const hold = async (code, ms) => {
  await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { code: '${code}', key: '?', bubbles: true }))`);
  await wait(ms);
  await page.eval(`document.dispatchEvent(new KeyboardEvent('keyup', { code: '${code}', key: '?', bubbles: true }))`);
};
const len = v => Math.hypot(...v);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a, b) => a.map((x, i) => x - b[i]);
/** The viewer's picture read back: its colours, its top's, and how much of its middle is blue. */
const look = `(async () => {
  const cv = document.querySelector('canvas.world'), b = await createImageBitmap(cv);
  const o = new OffscreenCanvas(b.width, b.height), g = o.getContext('2d');
  g.drawImage(b, 0, 0);
  const d = g.getImageData(0, 0, b.width, b.height).data, seen = new Set();
  for (let i = 0; i < d.length; i += 4 * 61) seen.add((d[i] >> 4) + '.' + (d[i + 1] >> 4) + '.' + (d[i + 2] >> 4));
  let blue = 0, n = 0;
  for (let y = Math.round(b.height * 0.3); y < b.height * 0.8; y += 2) for (let x = Math.round(b.width * 0.25); x < b.width * 0.75; x += 2) {
    const i = (y * b.width + x) * 4; n++;
    if (d[i + 2] > d[i] + 50 && d[i + 2] > d[i + 1] + 50) blue++;
  }
  const top = Array.from(d.slice((2 * b.width + (b.width >> 1)) * 4, (2 * b.width + (b.width >> 1)) * 4 + 3));
  return { w: b.width, h: b.height, colours: seen.size, top, blue: blue / n };
})()`;

// ── Rule 7: no vault, loft.js's own worm ────────────────────────────────────

await c.go(c.plain + '/apps/3d/play/');
await page.until(`${peek}.then(p => p && p.frames > 3)`, { timeout: 40000 }).catch(() => {});
let p = await page.eval(peek);
c.ok('with no vault it opens, and draws', !!p && p.frames > 3, p ? `${p.frames} frames, ${p.backend}` : 'nothing');
c.ok('…loft.js\'s own worm on the planet', !!p && !p.drawn && p.vertices > 100 && p.things > 0, p ? `${p.vertices} points, ${p.things} things` : '');
let seen = await page.eval(look);
c.ok('…the sky above, the planet and its things below', seen.colours > 6 && Math.abs(seen.top[0] - 207) + Math.abs(seen.top[1] - 227) + Math.abs(seen.top[2] - 241) < 24,
  `${seen.colours} colours, top ${seen.top}`);
await tune({ colour: '#1030ff' });
await wait(300);
const blued = await page.eval(look);
await tune({ colour: '#e3a587' });
c.ok('…the worm in the middle: turned blue, the middle is', blued.blue > 0.01 && seen.blue < 0.002, `${(blued.blue * 100).toFixed(1)}% of it`);
const plainNoise = c.quiet().filter(e => !(e.url || '').includes('/api/vault'));
c.ok('…and it said nothing wrong', !plainNoise.length, JSON.stringify(plainNoise).slice(0, 300));

// ── Walked ──────────────────────────────────────────────────────────────────

const at = await page.eval(peek);
await hold('KeyW', 1200);
p = await page.eval(peek);
c.ok('Z held — W by its place — it walks ahead', p.walked > 1.5, `${p.walked.toFixed(2)} units`);
c.ok('…round the planet, on it', Math.abs(len(p.p) - p.radius) < 1e-6 && len(sub(p.p, at.p)) > 1.5, `${len(p.p).toFixed(6)} from its middle`);
c.ok('…its wave moving as it goes', p.wave !== at.wave, `its wave's phase ${at.wave} → ${p.wave}`);
await wait(1200);
p = await page.eval(peek);
const behind = dot(sub(p.eye, p.p), p.f), above = len(p.eye) - p.radius;
c.ok('the camera behind it and above', behind < -3 && above > 3, `${behind.toFixed(1)} along its way, ${above.toFixed(1)} up`);
const facing = p.f;
await hold('KeyD', 500);
p = await page.eval(peek);
const turned = Math.acos(Math.max(-1, Math.min(1, dot(facing, p.f)))) * 180 / Math.PI;
c.ok('D held, it turns', turned > 20, `${turned.toFixed(0)}°`);
const right = sub(p.f, facing);
const rightWas = [facing[1] * at.up[2] - facing[2] * at.up[1], facing[2] * at.up[0] - facing[0] * at.up[2], facing[0] * at.up[1] - facing[1] * at.up[0]];
c.ok('…to its right', dot(right, rightWas) > 0, '');
const walked = p.walked;
await hold('ArrowUp', 600);
p = await page.eval(peek);
c.ok('the arrows walk it too', p.walked > walked + 0.5, `${(p.walked - walked).toFixed(2)} units`);

// ── A brush found (M16m) ────────────────────────────────────────────────────

p = await page.eval(peek);
c.ok('three brushes lying on the ground — with no vault, the gamepad\'s own', p.finds.length === 3 && p.carried.length === 0
  && p.finds.every(f => /gamepad_sprites\/brushes\//.test(f.picture)), p.finds.map(f => f.title).join(', '));
await page.eval(`import('/apps/3d/play/main.js').then(m => m.seek(0, { away: 7 }))`);
await wait(500);
await c.shot('3d-play-find');
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW', key: '?', bubbles: true }))`);
await page.until(`${peek}.then(p => p && p.carried.length === 1)`, { timeout: 8000 }).catch(() => {});
await page.eval(`document.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW', key: '?', bubbles: true }))`);
p = await page.eval(peek);
c.ok('…walked into one: picked up, a brush carried, its card gone from the ground', p.carried.length === 1
  && p.carried[0].nature === 'brush' && p.finds.length === 2, `${p.carried.map(i => i.title).join(', ') || 'nothing'} carried, ${p.finds.length} left`);
await wait(200);
const strip = await page.eval(`(() => { const li = [...document.querySelectorAll('.carried li')];
  return { n: li.length, loaded: li.every(l => l.querySelector('img').complete && l.querySelector('img').naturalWidth > 0) }; })()`);
c.ok('…and shown in the strip of what it carries, its picture there', strip.n === 1 && strip.loaded, JSON.stringify(strip));

await tune({ radius: 60 });
await wait(400);
p = await page.eval(peek);
c.ok('a bigger planet, and it stands on that one', p.radius === 60 && Math.abs(len(p.p) - 60) < 1e-6, `${len(p.p).toFixed(3)}`);

// ── Out, and in again ───────────────────────────────────────────────────────

await page.eval(`import('/apps/3d/play/main.js').then(m => m.unmount())`);
c.ok('unmounted, nothing is left to peek at', (await page.eval(peek)) === null);
const asked = await counts.framesAsked(600);
c.ok('…and it asks for no more frames', asked === 0, `${asked} asked`);
const once = await counts.held();
await page.eval(`import('/apps/3d/play/main.js').then(m => m.mount(document.body))`);
await page.until(`${peek}.then(p => p && p.frames > 3)`, { timeout: 20000 }).catch(() => {});
await page.eval(`import('/apps/3d/play/main.js').then(m => m.unmount())`);
const twice = await counts.held();
c.ok('mounted and unmounted again, it holds nothing more', JSON.stringify(once) === JSON.stringify(twice), `${JSON.stringify(once)} → ${JSON.stringify(twice)}`);
await page.eval(`import('/apps/3d/play/main.js').then(m => m.mount(document.body))`);
await page.until(`${peek}.then(p => p && p.frames > 3)`, { timeout: 20000 }).catch(() => {});
await hold('KeyW', 500);
p = await page.eval(peek);
c.ok('…and mounted again, it walks', !!p && p.walked > 0.5, p ? `${p.walked.toFixed(2)} units` : 'nothing');
const againNoise = c.quiet().filter(e => !(e.url || '').includes('/api/vault'));   // no vault here, said by each mount
c.ok('…saying nothing wrong', !againNoise.length, JSON.stringify(againNoise).slice(0, 300));

// ── A drawing, and a model's drawn body ─────────────────────────────────────

await c.go(c.base + '/apps/3d/play/');
await page.until(`${peek}.then(p => p && p.frames > 0)`, { timeout: 30000 }).catch(() => {});
const made = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { thumbFromBlob } = await import('/core/thumb.js');
  const png = (w, h, draw) => { const c = new OffscreenCanvas(w, h); draw(c.getContext('2d')); return c.convertToBlob({ type: 'image/png' }); };
  const disc = png(40, 40, g => { g.fillStyle = '#2a8d5c'; g.beginPath(); g.arc(20, 20, 18, 0, Math.PI * 2); g.fill(); });
  const save = async (envelope, blob, w, h) => (await Vault.save({ seed: null, parents: [], ...envelope,
    render: { blob, ext: 'png', w, h }, thumb: await thumbFromBlob(blob) })).id;
  const dot = await save({ type: 'shape', title: 'a green disc', tags: ['import'], origin: { app: 'import', version: '1.0.0' }, recipe: null }, await disc, 40, 40);
  const set = await save({ type: 'set', title: 'green', tags: [], origin: { app: 'vault', version: '1.0.0' },
    recipe: { members: [dot], role: 'brush-family', name: 'green' } }, await disc, 40, 40);
  await Vault.refresh();
  const marks = [];
  for (let i = 0; i <= 100; i++) marks.push({ t: i * 16, x: 640 - i * 5, y: 300 + 40 * Math.sin(i / 100 * 2 * Math.PI), rotation: 0,
    scale: 1, familyId: set, spriteIndex: 0, pattern: 'single' });
  const white = await png(800, 600, g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 800, 600); });
  const drawing = await save({ type: 'still', title: 'a worm drawn right to left', tags: ['gamepad'], origin: { app: 'gamepad', version: '1.0.0' },
    recipe: { canvas: { w: 800, h: 600, background: '#ffffff' }, marks } }, white, 800, 600);
  const model = await save({ type: 'model', title: 'a worm modelled', tags: ['3d'], origin: { app: '3d', version: '1.0.0' },
    recipe: { shapes: [{ id: 'drawn', on: true, params: { drawing, segments: 24, skin: 'colour', colour: '#2a62d8' } }] } }, white, 800, 600);
  await Vault.refresh();
  return { drawing, model };
})()`);
c.ok('a gamepad drawing and a model in the vault', !!(made && made.drawing && made.model), JSON.stringify(made));

await c.go(c.base + '/apps/3d/play/?worm=' + made.drawing);
await page.until(`${peek}.then(p => p && p.drawn && p.frames > 3)`, { timeout: 30000 }).catch(() => {});
p = await page.eval(peek);
c.ok('a drawing named in the address is the worm', !!p && p.drawn, p ? `${p.vertices} points` : 'nothing');
c.ok('…its head where its stroke ends: drawn right to left, to the left', !!p && p.toward === -1, p ? `toward ${p.toward}` : '');
await tune({ head: 'start' });
await wait(200);
p = await page.eval(peek);
c.ok('…or where it began, asked', p.toward === 1, `toward ${p.toward}`);

await c.go(c.base + '/apps/3d/play/?worm=' + made.model);
await page.until(`${peek}.then(p => p && p.drawn && p.frames > 3)`, { timeout: 30000 }).catch(() => {});
p = await page.eval(peek);
c.ok('a model\'s drawn body is the worm, as it was shaped there', !!p && p.drawn && p.vertices % 24 === 2, p ? `${p.vertices} points, 24 round` : 'nothing');
const modelled = await page.eval(look);
c.ok('…in its own colour, the model\'s blue', modelled.blue > 0.005, `${(modelled.blue * 100).toFixed(1)}% of the middle`);
// The plain host's vault, asked for by its last mount, may answer after the page has gone: not this page's.
const vaultNoise = c.quiet().filter(e => !(e.url || '').startsWith(c.plain + '/api/vault'));
c.ok('…and nothing went wrong', !vaultNoise.length, JSON.stringify(vaultNoise).slice(0, 300));

await c.shot('3d-play');
await c.finish();
