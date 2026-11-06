#!/usr/bin/env node
/**
 * scripts/check-garden.mjs — M14's garden in Chrome: a map you garden in.
 *
 *   node scripts/check-garden.mjs
 *
 * Served as plain files with no vault, the garden opens on bare earth and
 * says it keeps nothing without one (rule 7). On the server: a flower drawn
 * as the gamepad draws — twelve marks round a ring, a set of two discs its
 * brush — a set of flowers to plant, and a garden saved as a map, the flower
 * standing in it, the spawn beside it facing it. Opened, the flower grows
 * from its marks and the gardener faces it; the treatment's preview shows it
 * as the chain would make it, a mirrored copy doubling its marks; E plants
 * its next generation on the bare earth nearest it — a still that keeps its
 * marks, its source its parent, the chain in its recipe, drawn again at
 * scale 2 by core and offered to the rig; on bare earth E plants the flower
 * in hand; Delete uproots one; Ctrl S saves the garden as a map with what
 * was planted. Needs no GPU, and brings what it needs.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const line = `(document.querySelector('.gd-line')?.textContent || '')`;
const press = async (code, more = {}) => {
  const extra = Object.entries(more).map(([k, v]) => `, ${k}: ${JSON.stringify(v)}`).join('');
  await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { code: '${code}', key: '?', bubbles: true${extra} }))`);
  await page.eval(`document.dispatchEvent(new KeyboardEvent('keyup', { code: '${code}', key: '?', bubbles: true${extra} }))`);
};
const saying = (text, timeout = 20000) => page.until(`${say}.includes(${JSON.stringify(text)})`, { timeout }).then(() => true, () => false);

// ── Rule 7 ──────────────────────────────────────────────────────────────────

await c.go(c.plain + '/apps/map/garden/');
const alone = await saying('no vault');
c.ok('with no vault, the garden opens on bare earth and says so', alone, await page.eval(say));
const plainNoise = c.quiet().filter(e => !(e.url || '').includes('/api/vault'));
c.ok('…and says nothing else', !plainNoise.length, JSON.stringify(plainNoise).slice(0, 300));

// ── A flower, a set of them, a garden ───────────────────────────────────────

await c.go(c.base + '/apps/map/garden/');
await saying('bare earth');
const made = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { thumbFromBlob } = await import('/core/thumb.js');
  const { mapParams } = await import('/apps/map/params.js');
  const png = (w, h, draw) => { const c = new OffscreenCanvas(w, h); draw(c.getContext('2d')); return c.convertToBlob({ type: 'image/png' }); };
  const disc = fill => png(40, 40, g => { g.fillStyle = fill; g.beginPath(); g.arc(20, 20, 18, 0, Math.PI * 2); g.fill(); });
  const save = async (envelope, blob, w, h) => (await Vault.save({ seed: null, parents: [], ...envelope,
    render: { blob, ext: 'png', w, h }, thumb: await thumbFromBlob(blob) })).id;
  const shape = async (title, fill) => save({ type: 'shape', title, tags: ['import'], origin: { app: 'import', version: '1.0.0' }, recipe: null }, await disc(fill), 40, 40);
  const red = await shape('a red disc', '#d8342a'), blue = await shape('a blue disc', '#2a5bd8');
  const brush = await save({ type: 'set', title: 'two discs', tags: [], origin: { app: 'vault', version: '1.0.0' },
    recipe: { members: [red, blue], role: 'brush-family', name: 'two discs' } }, await disc('#888888'), 40, 40);
  await Vault.refresh();
  // A flower as the gamepad draws one: twelve marks round a ring, every one the brush's first image.
  const marks = Array.from({ length: 12 }, (_, i) => ({ t: i * 100, x: 200 + 120 * Math.cos(i * Math.PI / 6),
    y: 200 + 120 * Math.sin(i * Math.PI / 6), rotation: 0, scale: 1, familyId: brush, spriteIndex: 0, pattern: 'single' }));
  const ring = await png(400, 400, g => { g.fillStyle = '#d8342a'; for (const m of marks) { g.beginPath(); g.arc(m.x, m.y, 18, 0, Math.PI * 2); g.fill(); } });
  const flower = await save({ type: 'still', title: 'a ring', tags: ['gamepad'], origin: { app: 'gamepad', version: '1.0.0' },
    recipe: { canvas: { w: 400, h: 400, background: 'none' }, frame: null, marks } }, ring, 400, 400);
  const flowers = await save({ type: 'set', title: 'my flowers', tags: [], origin: { app: 'vault', version: '1.0.0' },
    recipe: { members: [flower], role: 'flowers', name: 'my flowers' } }, ring, 400, 400);
  const m = { ...mapParams().values, name: 'a test garden', cols: 6, rows: 5, tile: 64, ground: '#d8e3c0' };
  const ground = await png(m.cols * m.tile, m.rows * m.tile, g => { g.fillStyle = m.ground; g.fillRect(0, 0, m.cols * m.tile, m.rows * m.tile); });
  const map = await save({ type: 'map', title: m.name, tags: ['map'], origin: { app: 'map', version: '1.0.0' }, parents: [flower],
    recipe: { map: m, cells: new Array(30).fill(-1), walls: new Array(30).fill(0), place: [
      { ref: flower, col: 3, row: 2, width: 1, solid: true },
      { ref: null, col: 2, row: 2, width: 1, event: 'spawn', face: 'right' }] } }, ground, m.cols * m.tile, m.rows * m.tile);
  return { flower, flowers, map };
})()`);
c.ok('a flower, a set of flowers and a garden made', !!(made.flower && made.flowers && made.map), JSON.stringify(made));

// ── The garden opened: the flower grows, the gardener faces it ─────────────

await c.go(c.base + '/apps/map/garden/?open=' + made.map);
c.ok('the garden opens on the map, the gardener facing the flower', await saying('facing a ring'), await page.eval(say));
await new Promise(r => setTimeout(r, 3600));           // grown: three seconds, its marks as they came
const reds = await page.eval(`(() => {
  const cv = document.querySelector('#gd-stage'), k = cv.width / 384;
  const d = cv.getContext('2d').getImageData(Math.round(192 * k), Math.round(128 * k), Math.round(64 * k), Math.round(64 * k)).data;
  let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 170 && d[i + 1] < 110 && d[i + 2] < 110) n++;
  return n;
})()`);
c.ok('…the flower drawn from its marks, grown, on its cell', reds > 20, `${reds} red pixels`);
c.ok('the flower faced shows as the treatment would make it: no modifier, as it is', await page.until(`${line}.includes('12 marks → 12')`,
  { timeout: 10000 }).then(() => true, () => false), await page.eval(line));

// ── A treatment, and E: the next generation ─────────────────────────────────

await page.eval(`(() => { const menu = document.querySelector('#gd-treat .pp-cards-add'); menu.value = 'mirror'; menu.dispatchEvent(new Event('change')); })()`);
c.ok('a mirror added: its copy doubles the marks in the preview', await page.until(`${line}.includes('12 marks → 24')`,
  { timeout: 10000 }).then(() => true, () => false), await page.eval(line));
await press('KeyE');
c.ok('E plants its next generation', await saying('planted a ring · g1'), await page.eval(say));
const g1 = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { openFrames } = await import('/core/rebuild.js');
  const { rigUrl } = await import('/core/reopen.js');
  await Vault.refresh();
  const row = Vault.index.find(r => r.title === 'a ring · g1');
  if (!row) return null;
  const { object, url } = await Vault.load(row.id);
  const twice = await openFrames(object, { url, scale: 2 });
  const out = { id: object.id, type: object.type, app: object.origin.app, parents: object.parents, tags: object.tags,
    marks: object.recipe.marks.length, chain: object.recipe.garden.chain.map(e => e.id), source: object.recipe.garden.source,
    generation: object.recipe.garden.generation, scale: twice.scale, rig: !!(await rigUrl(object)) };
  if (twice.dispose) twice.dispose();
  return out;
})()`);
c.ok('…a still that keeps its marks, the mirror\'s copies with them', !!g1 && g1.type === 'still' && g1.marks === 24, JSON.stringify(g1));
c.ok('…its source its parent, the chain and the generation in its recipe', !!g1 && g1.parents[0] === made.flower && g1.source === made.flower
  && g1.chain.join() === 'mirror' && g1.generation === 1, JSON.stringify(g1 && { parents: g1.parents, chain: g1.chain }));
c.ok('…drawn again at scale 2 by core, from its marks, and offered to the rig', !!g1 && g1.scale === 2 && g1.rig, JSON.stringify(g1 && { scale: g1.scale, rig: g1.rig }));

// ── Bare earth, the flower in hand; Delete; Ctrl S ──────────────────────────

await page.eval(`(async () => { const { rowParams } = await import('/core/param-rows.js');
  const o = rowParams(document.querySelector('.pp-row[data-key="flowers"]')); o.params.set('flowers', ${JSON.stringify(made.flowers)}); })()`);
await press('KeyW');                                      // a step up, by where the key is: facing bare earth
c.ok('W — ZQSD\'s Z — a step up, and bare earth faced', await saying('bare earth — E plants a ring'), await page.eval(say));
await press('KeyE');
c.ok('E plants the flower in hand there', await saying('planted a ring'), await page.eval(say));
await press('KeyS', { ctrlKey: true });
c.ok('Ctrl S saves the garden', await saying('— a test garden'), await page.eval(say));
// The garden's save is the next state of its smart object (S6b): the map it binds, as it is now.
const kept = async () => page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { unwrap } = await import('/core/smart.js');
  await Vault.refresh();
  const row = Vault.index.find(r => r.type === 'skw' && r.title === 'a test garden');
  if (!row) return [];
  const { object } = await Vault.load(row.id);
  return unwrap(object).recipe.place.filter(b => b.ref).map(b => [b.ref, b.col, b.row]);
})()`);
const first = await kept();
c.ok('…a map with the generation beside the flower and the one planted', first.some(([r, col, row]) => r === g1?.id && col === 3 && row === 1)
  && first.some(([r, col, row]) => r === made.flower && col === 2 && row === 0), JSON.stringify(first));
await press('Delete');
c.ok('Delete uproots the flower faced — still in the vault', await saying('uprooted a ring'), await page.eval(say));
await press('KeyS', { ctrlKey: true });
await saying('— a test garden');
const second = await kept();
c.ok('…and the garden saved again without it', !second.some(([r, col, row]) => col === 2 && row === 0) && second.length === first.length - 1, JSON.stringify(second));

// ── A garden saved, opened again from the Garden drawer ─────────────────────

await c.go(c.base + '/apps/map/garden/');
await saying('bare earth');
await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { rowParams } = await import('/core/param-rows.js');
  await Vault.refresh();
  const row = Vault.index.find(r => r.type === 'skw' && r.title === 'a test garden');
  rowParams(document.querySelector('.pp-row[data-key="plot"]')).params.set('plot', row.id);
})()`);
c.ok('a garden saved, chosen in the Garden drawer, opens — the gardener at its spawn', await saying('facing a ring'), await page.eval(say));
c.ok('…its address saying which, as ?open= does', (await page.eval('location.search')).startsWith('?open=skw_'), await page.eval('location.search'));
const noise = c.quiet().filter(e => !(e.url || '').startsWith(c.plain));   // the page with no vault asked for one
c.ok('the garden said nothing it should not have', !noise.length, JSON.stringify(noise).slice(0, 300));

await c.finish();
