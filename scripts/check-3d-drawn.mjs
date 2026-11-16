#!/usr/bin/env node
/**
 * check-3d-drawn.mjs — G4: a body drawn in the gamepad, in the 3D app
 * (apps/3d/loft.js, drawn.js, silhouette.js).
 *
 * A drawn body added from the menu: a worm of its own at once, its rows its
 * form's. A gamepad still put in the vault — an S and a bar of one brush, the
 * pen lifted between — given it: two bodies, the strokes', each section the
 * brush's silhouette traced at the threshold, not a circle; the worm gone
 * from the picture. Saved: the still its parent, its id in the recipe; drawn
 * again by its app, the still read again first: it is its render.
 */

import { startCheck, inner } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const cards = `[...document.querySelectorAll('.pp-card')].filter(c => !c.parentElement.closest('.pp-card'))`;
const cardRow = (i, name) => `[...${cards}[${i}].querySelectorAll('.pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const BODY = 3;                                        // the opening's box, sphere and torus, then the body
const setBody = async values => {
  await page.eval(`import('/core/param-rows.js').then(({ rowParams }) => { rowParams(${cardRow(BODY, 'its ends')}).params.set(${JSON.stringify(values)}); return true; })`);
  await wait(900);
};
const bodyValues = () => page.eval(`import('/core/param-rows.js').then(({ rowParams }) => rowParams(${cardRow(BODY, 'its ends')}).params.values)`);
/** The preview's pixels far from its ground — the corner's — counted, and kept in the page as `name`; with `than`, how many differ from it. */
const ink = (name, than = null) => page.eval(`(() => { const c = document.getElementById('stage'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const g = [d[0], d[1], d[2]], mask = new Uint8Array(d.length / 4); let n = 0, diff = 0;
  for (let p = 0; p < mask.length; p++) { const i = p * 4; mask[p] = Math.abs(d[i] - g[0]) + Math.abs(d[i + 1] - g[1]) + Math.abs(d[i + 2] - g[2]) > 40 ? 1 : 0; n += mask[p]; }
  const before = ${than ? `window.__ink[${JSON.stringify(than)}]` : 'null'};
  if (before) for (let p = 0; p < mask.length; p++) diff += mask[p] !== before[p];
  (window.__ink = window.__ink || {})[${JSON.stringify(name)}] = mask;
  return { share: n / mask.length, diff: diff / mask.length }; })()`);

await c.go(c.base + '/apps/3d/');
await page.until(`/box, sphere, torus|nothing draws/.test(${say})`, { timeout: 30000 });
for (const i of [0, 1, 2]) await page.click(`[...${cards}[${i}].querySelectorAll('.pp-head .pp-btn')].find(b => b.textContent === 'shown')`);
await page.typeInto(`[...document.querySelectorAll('.pp-cards-add')].find(m => !m.closest('.pp-card'))`, 'drawn');
await page.until(`${cards}.length === 4`, { timeout: 10000 }).catch(() => {});
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);   // chosen no more: no handles over it
await wait(1200);

// ── A worm of its own ───────────────────────────────────────────────────────
const rows = await page.eval(`[...${cards}[${BODY}].querySelectorAll('.pp-row .pp-name')].map(n => n.textContent)`);
c.ok('a drawn body from the menu: its drawing, how its sections stand, its ends — rows of its form',
  ['a gamepad drawing', 'its sections stand', 'its ends', 'its silhouette, at alpha'].every(r => rows.includes(r)), JSON.stringify(rows));
const worm = await ink('worm');
c.ok('…a worm of its own at once, with no drawing', worm.share > 0.01, `${(worm.share * 100).toFixed(1)}% of the picture`);
await c.shot('1-worm');

// ── A gamepad still: an S and a bar, one brush ──────────────────────────────
const made = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { thumbFromBlob } = await import('/core/thumb.js');
  const marks = [];
  for (let i = 0; i <= 120; i++) marks.push({ t: i * 16, x: 120 + i * 4, y: 300 + 110 * Math.sin(i / 120 * 2 * Math.PI), rotation: i * 0.01,
    scale: 0.22, familyId: 'brushes', spriteIndex: 0, pattern: 'single' });
  for (let i = 0; i <= 60; i++) marks.push({ t: 2000 + i * 16, x: 140 + i * 4, y: 520, rotation: 0, scale: 0.16, familyId: 'brushes', spriteIndex: 0, pattern: 'single' });
  const pic = new OffscreenCanvas(800, 600), g = pic.getContext('2d');
  g.fillStyle = '#fff'; g.fillRect(0, 0, 800, 600);
  const blob = await pic.convertToBlob({ type: 'image/png' });
  const id = (await Vault.save({ type: 'still', title: 'an S and a bar', tags: ['gamepad'], origin: { app: 'gamepad', version: '1.0.0' },
    seed: null, recipe: { canvas: { w: 800, h: 600, background: '#ffffff' }, marks }, render: { blob, ext: 'png', w: 800, h: 600 },
    thumb: await thumbFromBlob(blob) })).id;
  await Vault.refresh();
  return id; })()`);
c.ok('a gamepad still in the vault: two strokes of a brush', typeof made === 'string' && made.length > 4, String(made));
await setBody({ drawing: made });
await page.until(`import('/apps/3d/drawn.js').then(m => !!m.drawnOf(${JSON.stringify(made)}))`, { timeout: 20000 }).catch(() => {});
await wait(900);
const read = await page.eval(`(async () => {
  const { drawnOf } = await import('/apps/3d/drawn.js');
  const { spriteRing, areaOf } = await import('/apps/3d/silhouette.js');
  const d = drawnOf(${JSON.stringify(made)}), mask = d && d.masks.get('brushes#0');
  if (!mask) return { strokes: d ? d.strokes.length : -1 };
  const ring = spriteRing(mask, 0.5, 48), r = ring.map(([u, v]) => Math.hypot(u, v));
  const loose = spriteRing(mask, 0.1, 48), tight = spriteRing(mask, 0.9, 48);
  return { strokes: d.strokes.length, sprite: [mask.width, mask.height], area: areaOf(ring) / (mask.width * mask.height),
           round: Math.min(...r) / Math.max(...r), byThreshold: [areaOf(loose), areaOf(ring), areaOf(tight)].map(a => Math.round(a)) }; })()`);
c.ok('given it: its two strokes, the brush read as its alpha', read.strokes === 2 && !!read.sprite, JSON.stringify(read));
c.ok('…each section the brush\'s silhouette traced: inside its sprite, no quarter circle — and the higher the threshold, the less',
  read.area > 0.02 && read.area < 0.98 && read.byThreshold[0] >= read.byThreshold[1] && read.byThreshold[1] >= read.byThreshold[2], JSON.stringify(read));
const values = await bodyValues();
const shape = await page.eval(`(async () => {
  const { drawnOf } = await import('/apps/3d/drawn.js');
  const { drawnGeometry } = await import('/apps/3d/loft.js');
  const g = drawnGeometry({ ...${JSON.stringify(values)}, drawn: drawnOf(${JSON.stringify(made)}) });
  return { points: g.attributes.position.count, segments: ${JSON.stringify(values.segments)} }; })()`);
c.ok('…two bodies, pointed: their rings and a point at each of their four ends', (shape.points - 4) % shape.segments === 0 && shape.points > 400,
  JSON.stringify(shape));
const drawn = await ink('drawn', 'worm');
c.ok('…drawn: the worm gone, the S and the bar in its place', drawn.share > 0.005 && drawn.diff > 0.01, JSON.stringify(drawn));
await c.shot('2-the-drawing');

// ── Saved, and drawn again ──────────────────────────────────────────────────
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'S' }))`);
await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
const mid = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
const o = mid ? inner(await (await fetch(c.base + '/api/vault/' + mid)).json()) : null;
const kept = o && o.recipe.shapes.find(s => s.id === 'drawn');
c.ok('saved: a model, its body\'s drawing the still\'s id, the still its parent', !!kept && kept.params.drawing === made && o.parents.includes(made),
  o ? JSON.stringify({ id: o.id, parents: o.parents }) : await page.eval(say));
if (o) {
  const replay = await page.eval(`(async () => {
    const { Vault } = await import('/core/vault.js');
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
    own.dispose();
    return { worst, off: off / render.length }; })()`);
  c.ok('drawn again by its app, its drawing read first: it is its render', replay.off < 0.001 && replay.worst <= 64,
    `worst ${replay.worst}, ${(replay.off * 100).toFixed(3)}% past 8`);
}

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
