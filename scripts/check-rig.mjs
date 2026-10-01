#!/usr/bin/env node
/**
 * scripts/check-rig.mjs — M9's rig in Chrome: a drawing's strokes as its
 * bones, bent.
 *
 *   node scripts/check-rig.mjs
 *
 * Served as plain files with no vault, the rig opens and asks for a drawing
 * (rule 7). On the server: a gamepad still saved as the gamepad saves one —
 * a body drawn upwards, an arm out and up, an eye — its render painted as
 * the gamepad paints a mark. The rig finds three strokes and three bones; at
 * rest it draws the still again as it was saved; the bones are drawn over
 * it, and B takes them away; the forearm's handle, dragged, swings the
 * forearm and leaves the body be; R puts it back to the pixel; a shorter
 * longest bone cuts more bones; a still with no marks is said to have none.
 * Needs no GPU, and brings what it needs: the brushes family is in git.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const row = name => `[...document.querySelectorAll('.pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;

// ── Rule 7 ──────────────────────────────────────────────────────────────────

await c.go(c.plain + '/apps/rig/');
await page.until(`${say}.includes('Choose a drawing')`, { timeout: 20000 }).catch(() => {});
c.ok('opens with no vault, and asks for a drawing', (await page.eval(say)).includes('Choose a drawing'), await page.eval(say));
c.ok('the bar says there is no vault', await page.until(`document.body.textContent.includes('no vault')`, { timeout: 8000 })
  .then(() => true, () => false));

// ── A drawing saved as the gamepad saves one ────────────────────────────────

await c.go(c.base + '/apps/rig/');
const plainNoise = c.quiet().filter(e => !(e.url || '').endsWith('/api/vault'));
c.ok('with no vault it said nothing else', !plainNoise.length, JSON.stringify(plainNoise).slice(0, 300));
const made = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { thumbFromBlob } = await import('/core/thumb.js');
  const line = (x0, y0, x1, y1, scale) => { const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 2);
    return Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n, rotation: 0.3, scale,
      familyId: 'brushes', spriteIndex: 8, pattern: 'single' })); };
  const marks = [...line(300, 460, 300, 280, 0.5), ...line(304, 370, 420, 370, 0.2), ...line(420, 368, 420, 270, 0.2).slice(1),
    { x: 300, y: 262, rotation: 0.3, scale: 0.15, familyId: 'brushes', spriteIndex: 8, pattern: 'single' }];
  marks.forEach((m, i) => { m.t = i * 17; });
  const from = { x: 100, y: 120, w: 400, h: 400 };
  // The gamepad's own way with a mark (core/stage/player.js): moved, turned, scaled, its sprite centred.
  const sprite = await createImageBitmap(await (await fetch('/apps/gamepad/gamepad_sprites/brushes/sprite(9).png')).blob());
  const c = new OffscreenCanvas(400, 400), g = c.getContext('2d');
  for (const m of marks) { g.setTransform(1, 0, 0, 1, m.x - from.x, m.y - from.y); g.rotate(m.rotation); g.scale(m.scale, m.scale);
    g.drawImage(sprite, -sprite.width / 2, -sprite.height / 2); }
  const blob = await c.convertToBlob({ type: 'image/png' });
  const recipe = { canvas: { w: 800, h: 600, background: 'none' }, frame: { from, to: { x: 0, y: 0, w: 400, h: 400 }, w: 400, h: 400 },
    brush: { familyId: 'brushes', familyIndex: 0, spriteIndex: 8, patternIndex: 0 }, params: {}, marks };
  const still = (await Vault.save({ type: 'still', title: 'a figure', tags: ['gamepad'], origin: { app: 'gamepad', version: '1.0.0' },
    seed: null, recipe, render: { blob, ext: 'png', w: 400, h: 400 }, thumb: await thumbFromBlob(blob) })).id;
  const flat = (await Vault.save({ type: 'still', title: 'no marks', tags: ['import'], origin: { app: 'import', version: '1.0.0' },
    seed: null, recipe: null, render: { blob, ext: 'png', w: 400, h: 400 }, thumb: await thumbFromBlob(blob) })).id;
  await Vault.refresh();
  return { still, flat, stamps: marks.length }; })()`);
c.ok('a gamepad still in the vault, and a still with no marks', !!(made.still && made.flat), JSON.stringify(made));

// ── Rigged ──────────────────────────────────────────────────────────────────

await c.go(c.base + '/apps/rig/?drawing=' + made.still);
await page.until(`${say}.includes('bones')`, { timeout: 30000 }).catch(() => {});
c.ok('its strokes found, and a bone proposed for each run between corners',
  (await page.eval(say)).startsWith(`3 strokes · 3 bones · ${made.stamps} stamps · at rest`), await page.eval(say));

/** The rig's drawing at rest, at the picture's own pixels, against the still's render. */
const rest = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { familySprite } = await import('/core/sprites.js');
  const { drawingOf, spritesOf } = await import('/apps/rig/drawing.js');
  const { proposeBones, posed } = await import('/apps/rig/bones.js');
  const { bind, placeOf } = await import('/apps/rig/skin.js');
  const { drawRig } = await import('/apps/rig/draw.js');
  const { object, url } = await Vault.load(${JSON.stringify(made.still)});
  const images = new Map();
  for (const [key, [f, i]] of spritesOf(object.recipe)) images.set(key, await familySprite(f, i));
  const d = drawingOf(object.recipe), bones = proposeBones(d), binds = bind(d, bones), at = posed(bones);
  const mine = new OffscreenCanvas(d.width, d.height).getContext('2d');
  drawRig(mine, d, d.stamps.map((s, i) => placeOf(s, binds[i], bones, at)), images, 1, { x: 0, y: 0 });
  const theirs = new OffscreenCanvas(d.width, d.height).getContext('2d');
  theirs.drawImage(await createImageBitmap(await (await fetch(url)).blob()), 0, 0);
  const a = mine.getImageData(0, 0, d.width, d.height).data, b = theirs.getImageData(0, 0, d.width, d.height).data;
  let sum = 0, worst = 0;
  for (let k = 0; k < a.length; k++) { const dd = Math.abs(a[k] - b[k]); sum += dd; worst = Math.max(worst, dd); }
  return { mean: sum / a.length, worst };
})()`);
c.ok('at rest it draws the still again as it was saved', rest.mean < 0.5, JSON.stringify(rest));

/** The stage's pixels over a box of the picture, and where a picture point is on screen. */
const geometry = `(async () => { const { stageOf } = await import('/apps/rig/draw.js'); const { drawingOf } = await import('/apps/rig/drawing.js');
  const { Vault } = await import('/core/vault.js'); const { object } = await Vault.load(${JSON.stringify(made.still)});
  return stageOf(drawingOf(object.recipe)); })()`;
const stage = await page.eval(geometry);
const box = (x, y, w, h) => page.eval(`(() => { const c = document.getElementById('stage'), k = c.width / ${stage.width};
  return [...c.getContext('2d').getImageData(Math.round((${x} - ${stage.x}) * k), Math.round((${y} - ${stage.y}) * k),
    Math.max(1, Math.round(${w} * k)), Math.max(1, Math.round(${h} * k))).data]; })()`);
const onScreen = (x, y) => page.eval(`(() => { const r = document.getElementById('stage').getBoundingClientRect();
  return [r.left + (${x} - ${stage.x}) / ${stage.width} * r.width, r.top + (${y} - ${stage.y}) / ${stage.height} * r.height]; })()`);
const differ = (a, b) => a.reduce((n, v, i) => n + (Math.abs(v - b[i]) > 24 ? 1 : 0), 0);

const blueish = p => { let n = 0; for (let i = 0; i < p.length; i += 4) if (p[i + 2] > 150 && p[i] < 80 && p[i + 1] < 120) n++; return n; };
const withBones = await box(300, 160, 40, 40);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))`);
await wait(300);
const without = await box(300, 160, 40, 40);
c.ok('the bones are drawn over it, and B takes them away', differ(withBones, without) > 20
  && !(await page.eval(`document.getElementById('bones').getAttribute('aria-pressed') === 'true'`)), String(differ(withBones, without)));
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }))`);
await wait(300);

const atRest = await page.eval(`[...document.getElementById('stage').getContext('2d').getImageData(0, 0, document.getElementById('stage').width, document.getElementById('stage').height).data]`);
const bodyBefore = await box(150, 280, 100, 60), foreBefore = await box(300, 150, 40, 80);
await page.pointer(await onScreen(320, 150), await onScreen(390, 240), 10);
await wait(300);
const bodyAfter = await box(150, 280, 100, 60), foreAfter = await box(300, 150, 40, 80);
c.ok('the forearm\'s handle, dragged, swings the forearm', (await page.eval(say)).includes('posed')
  && differ(foreBefore, foreAfter) > 200, `${differ(foreBefore, foreAfter)} values changed · ${await page.eval(say)}`);
c.ok('and leaves the body be', differ(bodyBefore, bodyAfter) === 0, String(differ(bodyBefore, bodyAfter)));
await c.shot('1-bent');

await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r' }))`);
await wait(300);
const back = await page.eval(`[...document.getElementById('stage').getContext('2d').getImageData(0, 0, document.getElementById('stage').width, document.getElementById('stage').height).data]`);
c.ok('R puts every bone back, to the pixel', back.length === atRest.length && differ(back, atRest) === 0
  && (await page.eval(say)).includes('at rest'), String(differ(back, atRest)));

await page.typeInto(`${row('longest bone, px')}?.querySelector('.pp-num')`, 50);
await page.until(`${say}.includes('bones')`, { timeout: 8000 }).catch(() => {});
await wait(300);
c.ok('a shorter longest bone cuts more bones', (await page.eval(say)).includes('9 bones'), await page.eval(say));

await c.go(c.base + '/apps/rig/?drawing=' + made.flat);
await page.until(`${say}.includes('no marks')`, { timeout: 20000 }).catch(() => {});
c.ok('a still with no marks is said to have none to rig', (await page.eval(say)).includes('no marks to rig'), await page.eval(say));

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
