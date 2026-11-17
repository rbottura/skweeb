#!/usr/bin/env node
/**
 * check-3d-drawn.mjs — G4: a body drawn in the gamepad, in the 3D app
 * (apps/3d/loft.js, drawn.js, silhouette.js).
 *
 * A drawn body added from the menu: a worm of its own at once, its rows its
 * form's. A gamepad still put in the vault — an S of red discs and a bar of
 * blue ones, a set the brush, the pen lifted between — picked by hand through
 * its field's Choose…, which offers the gamepad's drawings only: two bodies,
 * the strokes', each section the brush's silhouette traced at the threshold,
 * not a circle; the worm gone from the picture. Its skin the drawing (G4b):
 * from the front, the S red above the blue bar, the bar at its left — never
 * upside down or mirrored; its colour instead, neither. Saved: the still its
 * parent, its id in the recipe; drawn again by its app in a page that had read
 * nothing: it is its render. Opened with WebGL2: its skin still the drawing.
 */

import fs   from 'node:fs';
import path from 'node:path';
import { startCheck, inner } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const cards = `[...document.querySelectorAll('.pp-card')].filter(c => !c.parentElement.closest('.pp-card'))`;
const cardRow = (i, name) => `[...${cards}[${i}].querySelectorAll('.pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const BODY = 3;                                        // the opening's box, sphere and torus, then the body
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

// ── A gamepad still: an S of red discs over a bar of blue ones ──────────────
// The brush a set of two discs, as the gamepad draws with one (core/sprites.js `familySprite`); its colours tell
// the skin's top from its bottom, and its left from its right.
const both = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { thumbFromBlob } = await import('/core/thumb.js');
  const png = (w, h, draw) => { const c = new OffscreenCanvas(w, h); draw(c.getContext('2d')); return c.convertToBlob({ type: 'image/png' }); };
  const disc = fill => png(40, 40, g => { g.fillStyle = fill; g.beginPath(); g.arc(20, 20, 18, 0, Math.PI * 2); g.fill(); });
  const save = async (envelope, blob, w, h) => (await Vault.save({ seed: null, parents: [], ...envelope,
    render: { blob, ext: 'png', w, h }, thumb: await thumbFromBlob(blob) })).id;
  const shape = async (title, fill) => save({ type: 'shape', title, tags: ['import'], origin: { app: 'import', version: '1.0.0' }, recipe: null }, await disc(fill), 40, 40);
  const red = await shape('a red disc', '#d8342a'), blue = await shape('a blue disc', '#2a5bd8');
  const set = await save({ type: 'set', title: 'red and blue', tags: [], origin: { app: 'vault', version: '1.0.0' },
    recipe: { members: [red, blue], role: 'brush-family', name: 'red and blue' } }, await disc('#888888'), 40, 40);
  await Vault.refresh();
  const marks = [];
  for (let i = 0; i <= 120; i++) marks.push({ t: i * 16, x: 120 + i * 4, y: 300 + 110 * Math.sin(i / 120 * 2 * Math.PI), rotation: i * 0.01,
    scale: 1, familyId: set, spriteIndex: 0, pattern: 'single' });
  for (let i = 0; i <= 60; i++) marks.push({ t: 2000 + i * 16, x: 140 + i * 4, y: 520, rotation: 0, scale: 0.8, familyId: set, spriteIndex: 1, pattern: 'single' });
  const blob = await png(800, 600, g => { g.fillStyle = '#fff'; g.fillRect(0, 0, 800, 600); });
  const id = await save({ type: 'still', title: 'an S and a bar', tags: ['gamepad'], origin: { app: 'gamepad', version: '1.0.0' },
    recipe: { canvas: { w: 800, h: 600, background: '#ffffff' }, marks } }, blob, 800, 600);
  await Vault.refresh();
  return { id, set }; })()`);
const made = both.id;
c.ok('a gamepad still in the vault: two strokes of a brush', typeof made === 'string' && made.length > 4, JSON.stringify(both));
// Picked by hand: the body chosen, its field's Choose…, the picker its gamepad's drawings only.
await page.click(`document.querySelectorAll('.pp-cards-line')[${BODY}]`);
await wait(400);
await page.click(`[...${cardRow(BODY, 'a gamepad drawing')}.querySelectorAll('button')].find(b => b.textContent === 'Choose…')`);
await page.until(`[...document.querySelectorAll('.vp--visible .vp-cell')].some(k => k.querySelector('.vp-name')?.textContent.startsWith('an S and a bar'))`, { timeout: 20000 }).catch(() => {});
const offered = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const shown = document.querySelectorAll('.vp--visible .vp-cell').length;
  const rows = await Vault.list({});
  const ours = rows.filter(r => r.origin?.app === 'gamepad' && (['still', 'sequence'].includes(r.type) || (r.type === 'skw' && ['still', 'sequence'].includes(r.binds))));
  return { shown, gamepad: ours.length, all: rows.filter(r => ['still', 'sequence'].includes(r.type)).length }; })()`);
c.ok('its field\'s Choose…: the gamepad\'s stills and sequences, none of another app\'s', offered.shown === offered.gamepad && offered.all > offered.gamepad,
  JSON.stringify(offered));
await page.click(`[...document.querySelectorAll('.vp--visible .vp-cell')].find(k => k.querySelector('.vp-name')?.textContent.startsWith('an S and a bar'))?.querySelector('.vp-use')`);
await wait(900);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
await page.until(`import('/apps/3d/drawn.js').then(m => !!m.drawnOf(${JSON.stringify(made)}))`, { timeout: 20000 }).catch(() => {});
await wait(900);
const read = await page.eval(`(async () => {
  const { drawnOf } = await import('/apps/3d/drawn.js');
  const { spriteRing, areaOf } = await import('/apps/3d/silhouette.js');
  const d = drawnOf(${JSON.stringify(made)}), mask = d && d.masks.get(${JSON.stringify(both.set + '#0')});
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

// ── Its skin: the drawing projected (G4b) ───────────────────────────────────
// From the front — stamped, the eye straight on, orthographic, unlit — the body is the drawing: the S red, above
// the bar and right of it, the bar blue. A picture upside down, or mirrored, puts each colour where the other is.
const panelRow = name => `[...document.querySelectorAll('#side .pp-row')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const setOn = async (row, values) => {
  await page.eval(`import('/core/param-rows.js').then(({ rowParams }) => { rowParams(${row}).params.set(${JSON.stringify(values)}); return true; })`);
  await wait(900);
};
/** The preview's red pixels and blue ones — the discs' — counted, and where they are on average. */
const colours = () => page.eval(`(() => { const c = document.getElementById('stage'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
  const want = { red: [216, 52, 42], blue: [42, 91, 216] }, out = {};
  for (const [name, [r, g, b]] of Object.entries(want)) {
    let n = 0, x = 0, y = 0;
    for (let p = 0; p < d.length / 4; p++) { const i = p * 4;
      if (Math.abs(d[i] - r) + Math.abs(d[i + 1] - g) + Math.abs(d[i + 2] - b) < 40) { n++; x += p % c.width; y += Math.floor(p / c.width); } }
    out[name] = { n, x: n ? Math.round(x / n) : -1, y: n ? Math.round(y / n) : -1 };
  }
  return out; })()`);
const asDrawn = k => k.red.n > 500 && k.blue.n > 200 && k.red.y < k.blue.y && k.blue.x < k.red.x;
const plain = await colours();
await setOn(cardRow(BODY, 'its ends'), { lay: 'stamped', shading: 'unlit', x: 0 });
await setOn(panelRow('lens'), { lens: 'orthographic', yaw: 0, pitch: 0 });
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', key: 'f', bubbles: true }))`);
await wait(1200);
const front = await colours();
c.ok('its skin the drawing, as it starts: seen from the front, the S red above the bar, the bar blue at its left', asDrawn(front),
  JSON.stringify({ front, plain }));
await c.shot('3-skin-front');
await setOn(cardRow(BODY, 'its ends'), { skin: 'colour' });
const coloured = await colours();
c.ok('…its colour instead: no red, no blue — the drawing gone from it', coloured.red.n < 50 && coloured.blue.n < 50, JSON.stringify(coloured));
// Its brush wrapped round it (G10): the sprite its marks use most — the red disc, the S's — on both bodies.
await setOn(cardRow(BODY, 'its ends'), { skin: 'brush' });
const brushed = await colours();
c.ok('…its brush wrapped round it: the red disc its marks use most, on the bar too — no blue', brushed.red.n > 500 && brushed.blue.n < 50,
  JSON.stringify(brushed));
await setOn(cardRow(BODY, 'its ends'), { skin: 'drawing', lay: 'across' });

// ── Saved, and drawn again ──────────────────────────────────────────────────
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'S' }))`);
await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
const mid = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
const o = mid ? inner(await (await fetch(c.base + '/api/vault/' + mid)).json()) : null;
const kept = o && o.recipe.shapes.find(s => s.id === 'drawn');
c.ok('saved: a model, its body\'s drawing the still\'s id, the still its parent', !!kept && kept.params.drawing === made && o.parents.includes(made),
  o ? JSON.stringify({ id: o.id, parents: o.parents }) : await page.eval(say));

// ── Out as meshes (G5, meshfile.js): a .glb, its skin in it; an OBJ ─────────
const DL = path.join(c.dir, 'downloads');
await page.downloadsTo(DL);
const fileOf = async (end, label) => {
  await page.eval(`document.querySelector('.bar-say').textContent = ''`);
  await page.click(`[...document.querySelectorAll('.nb-btn')].find(b => b.textContent === ${JSON.stringify(label)})`);
  await page.until(`/^downloaded|failed/.test(${say})`, { timeout: 60000 });
  for (let i = 0; i < 100; i++) {
    const f = fs.existsSync(DL) && fs.readdirSync(DL).find(name => name.endsWith(end));
    if (f) { await wait(300); return { bytes: fs.readFileSync(path.join(DL, f)), said: await page.eval(say) }; }
    await wait(200);
  }
  return { bytes: null, said: await page.eval(say) };
};
const glb = await fileOf('.glb', 'Download the model (glTF .glb)');
const gltf = (() => { if (!glb.bytes) return null; const b = glb.bytes, n = b.readUInt32LE(12);
  const json = JSON.parse(b.subarray(20, 20 + n).toString('utf8')), bin = b.subarray(28 + n);
  const image = json.images && json.images[0] && json.bufferViews[json.images[0].bufferView];
  const png = image ? bin.subarray(image.byteOffset, image.byteOffset + image.byteLength) : null;
  return { magic: b.readUInt32LE(0), nodes: json.nodes.map(x => x.name), textured: json.materials.filter(mt => mt.pbrMetallicRoughness.baseColorTexture).length,
    png: png ? [png.readUInt32BE(0), png.readUInt32BE(16), png.readUInt32BE(20)] : null }; })();
c.ok('downloaded as a glTF: the body shown its one node, its skin the drawing\'s picture, a PNG 2048 along its longer side',
  !!gltf && gltf.magic === 0x46546c67 && gltf.nodes.length === 1 && /^drawn-/.test(gltf.nodes[0]) && gltf.textured === 1
  && gltf.png[0] === 0x89504e47 && Math.max(gltf.png[1], gltf.png[2]) === 2048, JSON.stringify({ gltf, said: glb.said }));
const obj = await fileOf('.obj', 'Download its surfaces (OBJ)');
const text = obj.bytes ? obj.bytes.toString('utf8') : '';
c.ok('…and as an OBJ: its points, its uv, its faces', /\nv /.test(text) && /\nvt /.test(text) && /\nf \d+\/\d+\/\d+ /.test(text), obj.said);

// ── The worm alive (G6): a wave along it, the model a loop that closes ─────
const scrubTo = async i => {
  await page.eval(`(s => { s.value = ${i}; s.dispatchEvent(new Event('input', { bubbles: true })); return true; })(document.querySelector('.tp-scrub'))`);
  await wait(700);
};
await setOn(cardRow(BODY, 'its ends'), { wave: 1, waves: 1.5, waveCycles: 1 });
const player = await page.eval(`(() => { const p = document.querySelector('.viewer-player'); return !!p && !p.hidden; })()`);
await page.click(`document.querySelector('.tp-first')`);          // stopped, on its first frame
await scrubTo(0);
await ink('wave0');
await scrubTo(18);
const quarter = await ink('wave18', 'wave0');
await scrubTo(0);
const back = await ink('wave0b', 'wave0');
c.ok('a wave along it: the model a loop, its player shown; a quarter on, the body elsewhere; frame 0 again, as it was',
  player && quarter.diff > 0.003 && back.diff < 0.0005, JSON.stringify({ player, quarter, back }));
await c.shot('5-waving');

// ── Turned on a lathe (G7): the drawing's strokes spun round its left edge ──
await setOn(cardRow(BODY, 'its ends'), { wave: 0 });
await page.click(`[...${cards}[${BODY}].querySelectorAll('.pp-head .pp-btn')].find(b => b.textContent === 'shown')`);
await page.typeInto(`[...document.querySelectorAll('.pp-cards-add')].find(m => !m.closest('.pp-card'))`, 'turned');
await page.until(`${cards}.length === ${BODY + 2}`, { timeout: 10000 }).catch(() => {});
await wait(600);
const vase = await ink('vase');
await setOn(cardRow(BODY + 1, 'its wall, by its marks'), { drawing: made, x: 0, shading: 'smooth' });
await page.until(`import('/apps/3d/drawn.js').then(m => !!m.drawnOf(${JSON.stringify(made)}))`, { timeout: 20000 }).catch(() => {});
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyF', key: 'f', bubbles: true }))`);
await wait(1200);
const spun = await ink('spun', 'vase');
c.ok('a turned drawing: a vase of its own at once; given the drawing, its strokes spun in its place', vase.share > 0.01 && spun.share > 0.01 && spun.diff > 0.01,
  JSON.stringify({ vase, spun }));
await c.shot('6-turned');

// ── A flower (G8): the drawn body its petal, round a heart ──────────────────
await page.click(`[...${cards}[${BODY + 1}].querySelectorAll('.pp-head .pp-btn')].find(b => b.textContent === 'shown')`);
await page.click(`[...${cards}[${BODY}].querySelectorAll('.pp-head .pp-btn')].find(b => b.textContent === 'hidden')`);
await page.click(`document.querySelectorAll('.pp-cards-line')[${BODY}]`);
await wait(500);
const petalOnly = await ink('petal');
await page.typeInto(`${cards}[${BODY}].querySelector('.pp-cards-add')`, 'round');
await wait(800);
const flower = await ink('flower', 'petal');
const stack = await page.eval(`[...${cards}[${BODY}].querySelectorAll('.pp-card .pp-title')].map(t => t.textContent)`);
c.ok('a flower: the drawn body its petal, round a heart — its stack round, the picture another', stack.includes('round — petals') && flower.diff > 0.01,
  JSON.stringify({ stack, petalOnly, flower }));
await c.shot('7-flower');

// ── Grown as it was drawn (G9): a sequence played once, its first marks to every one ──
await setOn(cardRow(BODY, 'its ends'), { grow: true });
await page.click(`document.querySelector('.tp-first')`);
await scrubTo(0);
const sprout = await ink('sprout');
await scrubTo(71);
const grownUp = await ink('grownUp', 'sprout');
c.ok('grown as it was drawn: its first marks at the first frame, every one at the last', sprout.share < grownUp.share && grownUp.diff > 0.005,
  JSON.stringify({ sprout, grownUp }));
await c.shot('8-grown');

if (o) {
  // Cold: a page that has read nothing — the drawing and its picture read by the replay itself (drawn.js `readDrawn`).
  await c.go(c.base + '/apps/3d/');
  await page.until(`/box, sphere, torus|nothing draws/.test(${say})`, { timeout: 30000 });
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
  c.ok('drawn again by its app in a page that had read nothing, its drawing and its skin read first: it is its render',
    replay.off < 0.001 && replay.worst <= 64, `worst ${replay.worst}, ${(replay.off * 100).toFixed(3)}% past 8`);

  // With no WebGPU, three draws with WebGL2 — the laptop's Intel — and turns a picture over its own way.
  await page.beforeLoad(`Object.defineProperty(navigator, 'gpu', { value: undefined, configurable: true });`);
  await c.go(c.base + '/apps/3d/?open=' + o.id);
  await page.until(`${say}.includes('opened') || ${say}.includes('could not')`, { timeout: 30000 });
  await page.until(`import('/apps/3d/drawn.js').then(m => !!m.drawnOf(${JSON.stringify(made)}))`, { timeout: 20000 }).catch(() => {});
  await wait(1500);
  const gl = await colours(), backend = await page.eval(`navigator.gpu === undefined ? 'no WebGPU: WebGL2' : 'WebGPU'`);
  c.ok('…opened with WebGL2: across, its skin still the drawing — the S red above the bar, the bar blue at its left',
    asDrawn(gl) && backend === 'no WebGPU: WebGL2', JSON.stringify({ gl, backend }));
  await c.shot('4-skin-webgl2');
}

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
