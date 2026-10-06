#!/usr/bin/env node
/**
 * scripts/check-map.mjs — M8's map editor in Chrome.
 *
 *   node scripts/check-map.mjs
 *
 * Served as plain files with no vault, it opens and draws its grid
 * (rule 7). On the server: the bar says the map's size in tiles; the grid is
 * drawn over the ground, each cell's middle the ground's colour; a map made
 * wider is drawn wider; the guides' switch takes it away. Tiles: three
 * pictures dropped in are a set, picked as the tileset — its members the
 * palette; a press paints a cell, a drag a row with no gaps, another tile
 * another colour, the eraser empties one, and a map made wider keeps each
 * where it was. Things: one placed stands on the middle cell; dragged, it
 * moves cell to cell and its panel follows; made wider, it is drawn wider;
 * of two that overlap the nearer — the lower row — is drawn over, either
 * way round; a particles loop placed plays by the map's clock. Walls: the
 * tool marks a cell, a drag a row, the right button clears one, hatched
 * while the tool is in hand or the guides are on and never otherwise; the
 * bar counts what cannot be walked, a solid thing's feet with it. Events: a
 * map keeps one spawn, a mark — a thing with nothing to see — is a warp to a
 * map by its name, a thing is a sign showing another object. Saved: a
 * `map`, its cells, walls and things, with the loop's frames and rate, its
 * tileset, things and what a sign shows its parents; the vault's replay is
 * its render, measured — a read-back canvas can be drawn in software a
 * little differently — walls and events never in it, and at scale 2 is
 * drawn again; `?open=` brings the tiles, walls and things back, and Del
 * takes one off; compose places the map, and it plays. Needs no GPU, and
 * brings what it needs: the vault it runs on may be empty.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const say = `(document.querySelector('.bar-say')?.textContent || '')`;
const wait = ms => new Promise(r => setTimeout(r, ms));
const row = name => `[...document.querySelectorAll('.pp-row:not(.pp-stack-layer .pp-row)')].find(r => r.querySelector('.pp-name')?.textContent === ${JSON.stringify(name)})`;
const set = async (name, value) => { await page.typeInto(`${row(name)}?.querySelector('.pp-num')`, value); await wait(300); };
/** A pixel of the preview, at a place in the map's own pixels, the map `mapWidth` wide. */
const pixel = async (x, y, mapWidth) => page.eval(`(() => { const c = document.getElementById('stage'); const k = c.width / ${mapWidth};
  return [...c.getContext('2d').getImageData(Math.min(c.width - 1, Math.round(${x} * k)), Math.min(c.height - 1, Math.round(${y} * k)), 1, 1).data]; })()`);
const ground = p => Math.abs(p[0] - 255) + Math.abs(p[1] - 253) + Math.abs(p[2] - 246) < 6;

// ── Rule 7 ──────────────────────────────────────────────────────────────────

await c.go(c.plain + '/apps/map/');
await page.until(`${say}.includes('tiles of')`, { timeout: 20000 });
c.ok('opens with no vault, and draws its grid', (await page.eval(say)).includes('12 × 10 tiles of 64 px'), await page.eval(say));
c.ok('the bar says there is no vault', await page.eval(`document.body.textContent.includes('no vault')`));

// ── On the server ───────────────────────────────────────────────────────────

await c.go(c.base + '/apps/map/');
const plainNoise = c.quiet().filter(e => !(e.url || '').endsWith('/api/vault'));
c.ok('with no vault it said nothing else', !plainNoise.length, JSON.stringify(plainNoise).slice(0, 300));
await page.until(`${say}.includes('tiles of')`, { timeout: 20000 });
c.ok('its canvas is the map\'s shape', await page.eval(`Math.abs(document.getElementById('stage').width / document.getElementById('stage').height - 768 / 640) < 0.01`));
c.ok('a cell\'s middle is the ground', ground(await pixel(96, 96, 768)), JSON.stringify(await pixel(96, 96, 768)));
c.ok('the grid is drawn between cells', !ground(await pixel(128, 96, 768)), JSON.stringify(await pixel(128, 96, 768)));
await set('columns', 20);
c.ok('a map made wider is drawn wider', (await page.eval(say)).includes('20 × 10')
  && await page.eval(`Math.abs(document.getElementById('stage').width / document.getElementById('stage').height - 1280 / 640) < 0.01`), await page.eval(say));
await page.click(`document.getElementById('guides')`);
await wait(300);
c.ok('the guides\' switch takes the grid away', ground(await pixel(128, 96, 1280)), JSON.stringify(await pixel(128, 96, 1280)));
await c.shot('1-grid');

// ── Tiles from a tileset ────────────────────────────────────────────────────

await set('columns', 12);
const onScreen = (x, y, mapWidth) => page.eval(`(() => { const r = document.getElementById('stage').getBoundingClientRect();
  return [Math.round(r.left + ${x} * r.width / ${mapWidth}), Math.round(r.top + ${y} * r.width / ${mapWidth})]; })()`);
const cellMid = n => n * 64 + 32;
const colour = (p, [r, g, b]) => Math.abs(p[0] - r) + Math.abs(p[1] - g) + Math.abs(p[2] - b) < 12;
const RED = [216, 52, 42], BLUE = [42, 98, 216];

await page.click(`[...${row('tileset')}.querySelectorAll('button')].find(b => b.textContent === 'Choose…')`);
await page.until(`!!document.querySelector('.vp--visible')`, { timeout: 20000 });
await page.eval(`(async () => { const dt = new DataTransfer();
  for (const [name, fill] of [['tile 1 red', '#d8342a'], ['tile 2 green', '#2a9d4b'], ['tile 3 blue', '#2a62d8']]) {
    const c = new OffscreenCanvas(64, 64), g = c.getContext('2d'); g.fillStyle = fill; g.fillRect(0, 0, 64, 64);
    dt.items.add(new File([await c.convertToBlob({ type: 'image/png' })], name + '.png', { type: 'image/png' })); }
  document.querySelector('.vp--visible').dispatchEvent(new DragEvent('drop', { dataTransfer: dt, bubbles: true, cancelable: true })); })()`);
const setName = 'tile 1 red … tile 3 blue (3)';
const setCell = `[...document.querySelectorAll('.vp--visible .vp-cell')].find(k => k.querySelector('.vp-name')?.textContent === ${JSON.stringify(setName)})`;
await page.until(`!!document.querySelector('.vp--visible .vp-offer .vp-btn') || !!${setCell}`, { timeout: 30000 }).catch(() => {});
if (!(await page.eval(`!!${setCell}`))) await page.eval(`document.querySelector('.vp--visible .vp-offer .vp-btn')?.click()`);
await page.until(`!!${setCell}`, { timeout: 20000 }).catch(() => {});
await page.click(`${setCell}?.querySelector('.vp-use')`);
await page.until(`document.querySelectorAll('.mp-tile').length === 4`, { timeout: 20000 }).catch(() => {});
c.ok('three pictures dropped in, picked as the tileset: three tiles and the eraser',
  (await page.eval(`document.querySelectorAll('.mp-tile').length`)) === 4, await page.eval(say));

await page.pointer(await onScreen(cellMid(2), cellMid(2), 768));
c.ok('a press paints the cell under it', colour(await pixel(cellMid(2), cellMid(2), 768), RED), JSON.stringify(await pixel(cellMid(2), cellMid(2), 768)));
await page.pointer(await onScreen(cellMid(0), cellMid(5), 768), await onScreen(cellMid(6), cellMid(5), 768), 2);
const along = [];
for (let col = 0; col <= 6; col++) along.push(colour(await pixel(cellMid(col), cellMid(5), 768), RED));
c.ok('a fast drag paints every cell it crosses, no gaps', along.every(Boolean), JSON.stringify(along));
await page.click(`document.querySelector('.mp-tile[data-tile="2"]')`);
await page.pointer(await onScreen(cellMid(3), cellMid(3), 768));
c.ok('another tile, another cell', colour(await pixel(cellMid(3), cellMid(3), 768), BLUE), JSON.stringify(await pixel(cellMid(3), cellMid(3), 768)));
await page.click(`document.querySelector('.mp-tile--erase')`);
await page.pointer(await onScreen(cellMid(2), cellMid(2), 768));
c.ok('the eraser empties a cell', ground(await pixel(cellMid(2), cellMid(2), 768)), JSON.stringify(await pixel(cellMid(2), cellMid(2), 768)));
const counted = await page.until(`${say}.includes(${JSON.stringify(`8 painted from ${setName}`)})`, { timeout: 8000 }).then(() => true, () => false);
c.ok('the bar counts what is painted, and from what', counted, await page.eval(say));
await set('columns', 14);
c.ok('made wider, each cell stays where it was', colour(await pixel(cellMid(3), cellMid(3), 896), BLUE)
  && colour(await pixel(cellMid(6), cellMid(5), 896), RED) && ground(await pixel(cellMid(13), cellMid(5), 896)),
  JSON.stringify(await pixel(cellMid(3), cellMid(3), 896)));
await c.shot('2-tiles');

// ── Things on the map ───────────────────────────────────────────────────────

const value = name => page.eval(`Number(${row(name)}?.querySelector('.pp-num')?.value)`);
const things = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { thumbFromBlob } = await import('/core/thumb.js');
  const { emitParams, pictureParams } = await import('/apps/particles/params.js');
  const dot = async (title, fill) => { const c = new OffscreenCanvas(64, 64), g = c.getContext('2d');
    g.fillStyle = fill; g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill();
    const blob = await c.convertToBlob({ type: 'image/png' });
    return (await Vault.save({ type: 'shape', title, tags: ['import'], origin: { app: 'import', version: '1.0.0' }, seed: null,
      recipe: null, render: { blob, ext: 'png', w: 64, h: 64 }, thumb: await thumbFromBlob(blob) })).id; };
  const pic = new OffscreenCanvas(64, 64); pic.getContext('2d').fillRect(8, 8, 48, 48);
  const pblob = await pic.convertToBlob({ type: 'image/png' });
  const torch = (await Vault.save({ type: 'sequence', title: 'a torch', tags: ['particles', 'loop'],
    origin: { app: 'particles', version: '1.0.0' }, seed: 1, recipe: { emit: emitParams().values, picture: pictureParams().values },
    parents: [], render: { blob: pblob, ext: 'png', w: 64, h: 64, frames: 60, fps: 30, loop: true }, thumb: await thumbFromBlob(pblob) })).id;
  const out = { orange: await dot('orange dot', '#f28c28'), purple: await dot('purple dot', '#7b2cbf'), torch,
                poster: await dot('a poster', '#2a9d4b') };
  await Vault.refresh();
  return out; })()`);
c.ok('three dots and a torch loop in the vault to place', !!(things.orange && things.purple && things.torch && things.poster),
  JSON.stringify(things));

await set('columns', 12);
await page.click(`document.getElementById('tool-things')`);
const placeThing = async title => {
  await page.click(`[...document.querySelectorAll('.mp-actions .nb-btn')].find(b => b.textContent === 'Place…')`);
  await page.until(`!!document.querySelector('.vp--visible')`, { timeout: 20000 });
  const cell = `[...document.querySelectorAll('.vp--visible .vp-cell')].find(k => k.querySelector('.vp-name')?.textContent === ${JSON.stringify(title)})`;
  await page.until(`!!${cell}`, { timeout: 20000 }).catch(() => {});
  await page.click(`${cell}?.querySelector('.vp-use')`);
  await page.until(`[...document.querySelectorAll('.mp-row .mp-title')].some(t => t.textContent === ${JSON.stringify(title)})
    && !document.querySelector('.mp-row .mp-sub')?.textContent.includes('opening')`, { timeout: 30000 }).catch(() => {});
  await wait(400);
};

const ORANGE = [242, 140, 40], PURPLE = [123, 44, 191];   // no tile is either
await placeThing('orange dot');
c.ok('a thing placed stands on the middle cell, its panel open', (await value('column')) === 6 && (await value('row')) === 5,
  `${await value('column')}, ${await value('row')}`);
c.ok('and is drawn there', colour(await pixel(cellMid(6), cellMid(5), 768), ORANGE), JSON.stringify(await pixel(cellMid(6), cellMid(5), 768)));
await page.pointer(await onScreen(cellMid(6), cellMid(5), 768), await onScreen(cellMid(2), cellMid(7), 768), 6);
await wait(300);
c.ok('dragged, it moves cell to cell, and its panel follows', (await value('column')) === 2 && (await value('row')) === 7
  && colour(await pixel(cellMid(2), cellMid(7), 768), ORANGE) && !colour(await pixel(cellMid(6), cellMid(5), 768), ORANGE),
  `${await value('column')}, ${await value('row')}`);
await set('width, tiles', 2);
c.ok('made two tiles wide, it is drawn so, rising from its feet', colour(await pixel(110, 448, 768), ORANGE),
  JSON.stringify(await pixel(110, 448, 768)));

// Two that overlap: the nearer — the lower row — is drawn over.
await placeThing('purple dot');
await set('column', 2);
await set('row', 6);
await set('width, tiles', 2);
c.ok('of two that overlap, the one on the lower row is drawn over', colour(await pixel(160, 416, 768), ORANGE),
  JSON.stringify(await pixel(160, 416, 768)));
await set('row', 8);
c.ok('moved lower, the other is: back to front by row', colour(await pixel(160, 480, 768), PURPLE),
  JSON.stringify(await pixel(160, 480, 768)));

// A loop standing on the map plays by its clock.
await placeThing('a torch');
await set('width, tiles', 3);
const boxPixels = () => page.eval(`(() => { const c = document.getElementById('stage'), k = c.width / 768;
  return [...c.getContext('2d').getImageData(Math.round(320 * k), Math.round(192 * k), Math.round(192 * k), Math.round(192 * k)).data]; })()`);
const was = await boxPixels();
await wait(500);
const now = await boxPixels();
const moved = was.reduce((n, v, i) => n + (Math.abs(v - now[i]) > 16 ? 1 : 0), 0);
const frameSay = await page.until(`/frame \\d+ of 60/.test(${say})`, { timeout: 8000 }).then(() => true, () => false);
c.ok('a loop standing on the map plays by its clock', moved > 0 && frameSay, `${moved} values moved · ${await page.eval(say)}`);
await c.shot('3-things');

// ── What can be walked, and what answers ────────────────────────────────────

const reddish = p => p[0] - p[1] > 24 && p[0] - p[2] > 24;
const counts = n => page.until(`${say}.includes(${JSON.stringify(`${n} not walkable`)})`, { timeout: 8000 }).then(() => true, () => false);
const wallAt = async (col, row) => reddish(await pixel(cellMid(col), cellMid(row), 768));

// The guides were switched off above: the walls tool shows its walls anyway.
await page.click(`document.getElementById('tool-walls')`);
await page.pointer(await onScreen(cellMid(9), cellMid(1), 768));
c.ok('the walls tool marks the cell pressed, hatched, with the guides off', await wallAt(9, 1),
  JSON.stringify(await pixel(cellMid(9), cellMid(1), 768)));
await page.pointer(await onScreen(cellMid(7), cellMid(9), 768), await onScreen(cellMid(11), cellMid(9), 768), 2);
const wallRow = [];
for (let col = 7; col <= 11; col++) wallRow.push(await wallAt(col, 9));
c.ok('a fast drag marks every cell it crosses', wallRow.every(Boolean), JSON.stringify(wallRow));
await page.pointer(await onScreen(cellMid(9), cellMid(9), 768), undefined, 6, { button: 'right' });
c.ok('the right button makes one walkable again', !(await wallAt(9, 9)) && await wallAt(10, 9),
  JSON.stringify(await pixel(cellMid(9), cellMid(9), 768)));
c.ok('the bar counts what cannot be walked', await counts(5), await page.eval(say));
await page.click(`document.getElementById('tool-things')`);
await wait(300);
c.ok('with another tool and the guides off, the walls are not drawn', ground(await pixel(cellMid(9), cellMid(1), 768)),
  JSON.stringify(await pixel(cellMid(9), cellMid(1), 768)));
await page.click(`document.getElementById('guides')`);
await wait(300);
c.ok('with the guides on, they are, whatever the tool', await wallAt(9, 1), JSON.stringify(await pixel(cellMid(9), cellMid(1), 768)));

const chooseRow = title => page.click(`[...document.querySelectorAll('.mp-row')].find(r => r.querySelector('.mp-title')?.textContent === ${JSON.stringify(title)})`);
const pick = async (name, value) => { await page.typeInto(`${row(name)}?.querySelector('select')`, value); await wait(250); };
const write = async (name, value) => { await page.typeInto(`${row(name)}?.querySelector('.pp-text')`, value, 'input'); await wait(250); };
const titles = () => page.eval(`[...document.querySelectorAll('.mp-row .mp-title')].map(t => t.textContent)`);
const subOf = title => page.eval(`[...document.querySelectorAll('.mp-row')].find(r => r.querySelector('.mp-title')?.textContent === ${JSON.stringify(title)})?.querySelector('.mp-sub')?.textContent || ''`);
const mark = async () => { await page.click(`[...document.querySelectorAll('.mp-actions .nb-btn')].find(b => b.textContent === 'Mark')`); await wait(300); };

await chooseRow('orange dot');
await wait(250);
await page.eval(`${row('solid')}?.querySelector('input[type=checkbox]')?.click()`);
c.ok('a thing made solid: the cell under its feet cannot be walked', await counts(6) && (await subOf('orange dot')).includes('solid'),
  await page.eval(say));

// The spawn: a mark — a thing with nothing to see — and one a map.
await mark();
await pick('event', 'spawn');
await mark();
await pick('event', 'spawn');
await pick('facing', 'left');
await set('column', 1);
await set('row', 1);
const afterSpawns = await titles();
c.ok('a map has one spawn: a thing made the spawn takes it from the other',
  afterSpawns.filter(t => t.startsWith('the spawn')).length === 1 && afterSpawns.includes('the spawn, facing left')
  && afterSpawns.includes('a mark, doing nothing'), JSON.stringify(afterSpawns));

await chooseRow('a mark, doing nothing');
await wait(250);
await pick('event', 'warp');
await write('to the map', 'the hall');
c.ok('a mark with nothing to see, made a warp to a map by its name', (await titles()).includes('a warp to the hall'),
  JSON.stringify(await titles()));

await chooseRow('purple dot');
await wait(250);
await pick('event', 'sign');
await write('says', 'hello from the room');
await page.click(`[...${row('shows')}.querySelectorAll('button')].find(b => b.textContent === 'Choose…')`);
await page.until(`!!document.querySelector('.vp--visible')`, { timeout: 20000 });
const posterCell = `[...document.querySelectorAll('.vp--visible .vp-cell')].find(k => k.querySelector('.vp-name')?.textContent === 'a poster')`;
await page.until(`!!${posterCell}`, { timeout: 20000 }).catch(() => {});
await page.click(`${posterCell}?.querySelector('.vp-use')`);
await wait(400);
c.ok('a thing made a sign, showing another object', (await subOf('purple dot')).includes('a sign')
  && (await page.eval(`${row('shows')}?.querySelector('.pp-object-name')?.textContent`)) === 'a poster', await subOf('purple dot'));
await c.shot('4-walls-and-events');

// ── Saved, replayed, reopened, placed ───────────────────────────────────────

await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }))`);      // held still
await page.until(`/frame \\d+ of 60/.test(${say})`, { timeout: 8000 }).catch(() => {});
const tick = Number(((await page.eval(say)).match(/frame (\d+) of 60/) || [])[1] || 1) - 1;
await page.eval(`document.querySelector('.bar-say').textContent = ''`);
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'S' }))`);
await page.until(`/^saved |failed|no vault/.test(${say})`, { timeout: 60000 });
const mid = ((await page.eval(say)).match(/^saved (\S+)/) || [])[1];
const saved = mid ? await (await fetch(c.base + '/api/vault/' + mid)).json() : null;
c.ok('saved: a map — its cells, its things, the loop\'s frames and rate', !!saved && saved.type === 'map'
  && saved.recipe.cells.length === 120 && saved.recipe.place.length === 5 && saved.render.frames === 60 && saved.render.fps === 30,
  saved ? `${saved.type} · ${saved.title} · ${saved.recipe.place.length} things · ${saved.render.frames} frames` : await page.eval(say));
const blocks = saved ? saved.recipe.place : [];
const spawnsSaved = blocks.filter(b => b.event === 'spawn'), warp = blocks.find(b => b.event === 'warp');
const sign = blocks.find(b => b.event === 'sign'), solid = blocks.find(b => b.solid);
c.ok('its walls, a flag a cell beside its tiles', !!saved && saved.recipe.walls.length === 120
  && saved.recipe.walls.filter(Boolean).length === 5 && saved.recipe.walls[1 * 12 + 9] === 1 && saved.recipe.walls[9 * 12 + 9] === 0,
  saved && JSON.stringify(saved.recipe.walls.map((v, i) => (v ? i : -1)).filter(i => i >= 0)));
c.ok('what its things do: solid, one spawn, a warp with nothing to see, a sign', !!solid && solid.ref === things.orange
  && spawnsSaved.length === 1 && spawnsSaved[0].face === 'left' && spawnsSaved[0].col === 1 && spawnsSaved[0].row === 1
  && !!warp && warp.ref === null && warp.to === 'the hall'
  && !!sign && sign.ref === things.purple && sign.says === 'hello from the room' && sign.shows === things.poster,
  JSON.stringify(blocks.map(b => [b.ref && b.ref.slice(0, 3), b.event, b.solid])));
const index = (await (await fetch(c.base + '/api/vault')).json()).objects || [];
const tilesetId = (index.find(r => r.title === setName) || {}).id;
c.ok('its tileset, every thing on it and what a sign shows are its parents', !!saved
  && [tilesetId, things.orange, things.purple, things.torch, things.poster].every(id => saved.parents.includes(id))
  && saved.parents.length === 5, saved && JSON.stringify(saved.parents));
if (saved) {
  const replay = await page.eval(`(async () => {
    const { Vault } = await import('/core/vault.js');
    const { openFrames } = await import('/core/rebuild.js');
    const { object, url } = await Vault.load(${JSON.stringify(mid)});
    const h = await openFrames(object, { url });
    const img = await createImageBitmap(await (await fetch(url)).blob());
    const a = new OffscreenCanvas(img.width, img.height).getContext('2d'); a.drawImage(img, 0, 0);
    const b = new OffscreenCanvas(img.width, img.height).getContext('2d'); b.drawImage(h.frame(${tick}), 0, 0);
    const da = a.getImageData(0, 0, img.width, img.height).data, db = b.getImageData(0, 0, img.width, img.height).data;
    let worst = 0, off = 0, sum = 0;
    for (let k = 0; k < da.length; k++) { const d = Math.abs(da[k] - db[k]); worst = Math.max(worst, d); sum += d; if (d > 8) off++; }
    const big = await openFrames(object, { url, scale: 2 });
    const out = { length: h.length, worst, off: off / da.length, mean: sum / da.length, missing: h.missing, big: [big.scale, big.frame(0).width, h.width] };
    h.dispose(); big.dispose(); return out; })()`);
  // Measured, never the pixel demanded: a canvas read back often enough is drawn by
  // Chrome in software afterwards, a little differently at a sprite's edge (STATUS, *Tests*).
  c.ok('the vault replays it: the frame on screen is its render', replay.length === 60 && replay.off < 0.002 && replay.mean < 0.5
    && !replay.missing.length, JSON.stringify(replay).slice(0, 160));
  c.ok('at scale 2, drawn again at twice the pixels', replay.big[0] === 2 && replay.big[1] === 2 * replay.big[2], JSON.stringify(replay.big));
  // A print past any canvas (core/print.js): the map in tiles, each its own part of the room.
  const printed = await c.printMatch(mid, { scale: 2, tick });
  c.ok(`a print in ${printed.tiles} tiles is the map drawn whole: its tiles, things and torch, no seam`,
    printed.enlarged === 1 && printed.off < 0.002 && printed.mean < 0.3, JSON.stringify(printed));

  await c.go(c.base + '/apps/map/?open=' + mid);
  await page.until(`${say}.includes('opened') || ${say}.includes('could not')`, { timeout: 30000 });
  await page.until(`document.querySelectorAll('.mp-row').length === 5 && document.querySelectorAll('.mp-tile').length === 4`, { timeout: 20000 }).catch(() => {});
  c.ok('?open= brings the tiles and the things back', colour(await pixel(cellMid(3), cellMid(3), 768), BLUE)
    && colour(await pixel(cellMid(0), cellMid(5), 768), RED) && (await page.eval(`document.querySelectorAll('.mp-row').length`)) === 5,
    await page.eval(say));
  const back = await titles();
  c.ok('…and the walls, and what the things do', await wallAt(9, 1) && await counts(6) && back.includes('the spawn, facing left')
    && back.includes('a warp to the hall') && (await subOf('purple dot')).includes('a sign'), JSON.stringify(back));
  await page.click(`document.getElementById('tool-things')`);
  await page.click(`document.querySelector('.mp-row')`);
  await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Delete' }))`);
  await wait(300);
  c.ok('Del takes the chosen thing off the map', (await page.eval(`document.querySelectorAll('.mp-row').length`)) === 4,
    String(await page.eval(`document.querySelectorAll('.mp-row').length`)));

  await c.go(c.base + '/apps/compose/?place=' + mid);
  await page.until(`${say}.includes(' on the page') || ${say}.includes('could not')`, { timeout: 60000 });
  c.ok('compose places the map, and it plays: a 30 fps loop of 60', (await page.eval(say)).includes('a 30 fps loop of 60'),
    await page.eval(say));
}

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
