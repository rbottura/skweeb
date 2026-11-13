#!/usr/bin/env node
/**
 * scripts/check-map-play.mjs — M8's player in Chrome, point and click.
 *
 *   node scripts/check-map-play.mjs
 *
 * Served as plain files with no vault, the player says so (rule 7). On the
 * server: two maps saved as the editor saves them — a room, with a poster
 * that is a sign, a dot that does nothing, and an exit with nothing to see
 * leading to the hall; the hall, with a way back. The room opens fitted to
 * the window, its things drawn; what answers is outlined under the pointer,
 * what does not is not; the poster, clicked, shows its picture and its
 * words over the map, and Escape puts them away; the exit leads to the
 * latest map called the hall, and the browser's back button comes back; a
 * name opens the latest map so called; the editor's Play is there for a map
 * it opened. And its avatar (P4): on the spawn, facing its way; D a step —
 * by where the key is — and a wall stops it; a tap walks it there by the
 * shortest way; the solid poster faced turns it without a step, and E reads
 * it; a step onto the exit takes it to the hall, on the warp back. Needs no
 * GPU, and brings what it needs.
 */

import { startCheck } from './check-kit.mjs';

const c = await startCheck();
const { page } = c;
const wait = ms => new Promise(r => setTimeout(r, ms));
const note = `(document.getElementById('note')?.hidden ? '' : document.getElementById('note')?.textContent || '')`;
const colour = (p, [r, g, b]) => Math.abs(p[0] - r) + Math.abs(p[1] - g) + Math.abs(p[2] - b) < 12;
const GREEN = [42, 157, 75], PURPLE = [123, 44, 191], ORANGE = [242, 140, 40], HALL = [223, 233, 255];

// ── Rule 7 ──────────────────────────────────────────────────────────────────

await c.go(c.plain + '/apps/map/play/');
await page.until(`${note}.length > 0`, { timeout: 20000 }).catch(() => {});
c.ok('with no vault, the player says so', (await page.eval(note)).includes('No vault'), await page.eval(note));

// ── Two maps, saved as the editor saves them ────────────────────────────────

await c.go(c.base + '/apps/map/play/');
const plainNoise = c.quiet().filter(e => !(e.url || '').endsWith('/api/vault'));
c.ok('with no vault it said nothing else', !plainNoise.length, JSON.stringify(plainNoise).slice(0, 300));
await page.until(`${note}.includes('Which map')`, { timeout: 20000 }).catch(() => {});
c.ok('with no map asked for, it says how to ask', (await page.eval(note)).includes('?map='), await page.eval(note));
const made = await page.eval(`(async () => {
  const { Vault } = await import('/core/vault.js');
  const { thumbFromBlob } = await import('/core/thumb.js');
  const { mapParams } = await import('/apps/map/params.js');
  const picture = async (w, h, fill, round) => { const c = new OffscreenCanvas(w, h), g = c.getContext('2d'); g.fillStyle = fill;
    if (round) { g.beginPath(); g.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2); g.fill(); } else g.fillRect(0, 0, w, h);
    return c.convertToBlob({ type: 'image/png' }); };
  const shape = async (title, fill, round = true, w = 64, h = 64) => { const blob = await picture(w, h, fill, round);
    return (await Vault.save({ type: 'shape', title, tags: ['import'], origin: { app: 'import', version: '1.0.0' }, seed: null,
      recipe: null, render: { blob, ext: 'png', w, h }, thumb: await thumbFromBlob(blob) })).id; };
  const map = async (values, place, walled = []) => { const m = { ...mapParams().values, ...values };
    const walls = new Array(m.cols * m.rows).fill(0); for (const [c, r] of walled) walls[r * m.cols + c] = 1;
    const blob = await picture(m.cols * m.tile, m.rows * m.tile, m.ground, false);
    return (await Vault.save({ type: 'map', title: m.name, tags: ['map'], origin: { app: 'map', version: '1.0.0' }, seed: null,
      recipe: { map: m, cells: new Array(m.cols * m.rows).fill(-1), walls, place },
      parents: [], render: { blob, ext: 'png', w: m.cols * m.tile, h: m.rows * m.tile }, thumb: await thumbFromBlob(blob) })).id; };
  const poster = await shape('a poster', '#2a9d4b', false), big = await shape('the poster, large', '#7b2cbf', false, 96, 128);
  const dot = await shape('a dot', '#f28c28');
  // An effect (M15g): a burst of dots from particles, a little over a second, played once — its recipe replayed, no GPU asked.
  const { emitParams, pictureParams } = await import('/apps/particles/params.js');
  const flash = await picture(64, 64, '#d8342a', true);
  const burst = (await Vault.save({ type: 'sequence', title: 'a burst', tags: ['particles'], origin: { app: 'particles', version: '1.0.0' }, seed: 1,
    recipe: { emit: { ...emitParams().values, mode: 'burst', count: 30, life: 1.2, lifeSpread: 0, x: 0, y: 0, speed: 40, gravity: 0 },
              picture: { ...pictureParams().values, ground: 'none', size: 256, grow: 1, fade: false, color: '#d8342a' } },
    parents: [], render: { blob: flash, ext: 'png', w: 1080, h: 1080, frames: 36, fps: 30, loop: false }, thumb: await thumbFromBlob(flash) })).id;
  const room = await map({ name: 'a room', cols: 6, rows: 5, tile: 64, ground: '#fffdf6' }, [
    { ref: null, col: 5, row: 0, width: 1, event: 'effect', plays: burst, over: 1 },
    { ref: poster, col: 1, row: 1, width: 1, event: 'sign', says: 'hello from the room', shows: big, solid: true },
    { ref: dot, col: 3, row: 2, width: 1 },
    { ref: null, col: 4, row: 4, width: 1, event: 'warp', to: 'the hall' },
    { ref: null, col: 0, row: 4, width: 1, event: 'spawn', face: 'right' }], [[2, 4]]);
  const hall = await map({ name: 'the hall', cols: 4, rows: 3, tile: 64, ground: '#dfe9ff' }, [
    { ref: null, col: 0, row: 0, width: 1, event: 'warp', to: 'a room' }]);
  // A character (core/character.js): down the poster, right a sprite red on its left half, up the large poster —
  // three, so its left is its right, mirrored; on the yard's spawn.
  const halfBlob = await (() => { const c = new OffscreenCanvas(64, 64), g = c.getContext('2d'); g.fillStyle = '#d8342a'; g.fillRect(0, 0, 32, 64);
    return c.convertToBlob({ type: 'image/png' }); })();
  const half = (await Vault.save({ type: 'shape', title: 'half a sprite', tags: ['import'], origin: { app: 'import', version: '1.0.0' }, seed: null,
    recipe: null, render: { blob: halfBlob, ext: 'png', w: 64, h: 64 }, thumb: await thumbFromBlob(halfBlob) })).id;
  const sheet = await picture(288, 96, '#888888', false);
  const walker = (await Vault.save({ type: 'set', title: 'a walker', tags: [], origin: { app: 'vault', version: '1.0.0' }, seed: null,
    recipe: { members: [poster, half, big], role: 'character', name: 'a walker' }, parents: [],
    render: { blob: sheet, ext: 'png', w: 288, h: 96 }, thumb: await thumbFromBlob(sheet) })).id;
  const yard = await map({ name: 'the yard', cols: 3, rows: 3, tile: 64, ground: '#fffdf6' }, [
    { ref: walker, col: 1, row: 1, width: 1, event: 'spawn', face: 'down' }]);
  await Vault.refresh();
  return { poster, big, dot, room, hall, yard, burst }; })()`);
c.ok('a room and a hall in the vault, joined by warps', !!(made.room && made.hall), JSON.stringify(made));

// ── Played ──────────────────────────────────────────────────────────────────

/** A pixel of the room, at a place in the map's own pixels, the map `w` wide. */
const pixel = (x, y, w) => page.eval(`(() => { const c = document.getElementById('room'), k = c.width / ${w};
  return [...c.getContext('2d').getImageData(Math.min(c.width - 1, Math.round(${x} * k)), Math.min(c.height - 1, Math.round(${y} * k)), 1, 1).data]; })()`);
/** Where a place of the map is on the screen, in CSS pixels. */
const onScreen = (x, y, w) => page.eval(`(() => { const r = document.getElementById('room').getBoundingClientRect();
  return [Math.round(r.left + ${x} * r.width / ${w}), Math.round(r.top + ${y} * r.width / ${w})]; })()`);
const hoverAt = async ([x, y]) => { await page.eval(`document.getElementById('room').dispatchEvent(new PointerEvent('pointermove',
  { clientX: ${x}, clientY: ${y}, bubbles: true }))`); await wait(150); };
const mid = n => n * 64 + 32;
const answersNow = () => page.eval(`document.getElementById('room').classList.contains('answers')`);
/** Whether the outline's yellow is anywhere across a strip of the map, from x0 to x1 at y. */
const yellowAcross = (x0, x1, y, w) => page.eval(`(() => { const c = document.getElementById('room'), k = c.width / ${w};
  const a = Math.round(${x0} * k), d = c.getContext('2d').getImageData(a, Math.round(${y} * k), Math.max(1, Math.round(${x1} * k) - a), 1).data;
  for (let i = 0; i < d.length; i += 4) if (d[i] > 220 && d[i + 1] > 180 && d[i + 2] < 90) return true;
  return false; })()`);

await c.go(c.base + '/apps/map/play/?map=' + made.room);
await page.until(`document.title.startsWith('a room') && !${note}`, { timeout: 30000 }).catch(() => {});
c.ok('the room opens, fitted to the window, its things drawn', (await page.eval(`(() => { const c = document.getElementById('room');
  return Math.abs(c.width / c.height - 6 / 5) < 0.02 && c.getBoundingClientRect().width <= innerWidth; })()`))
  && colour(await pixel(mid(1), mid(1), 384), GREEN) && colour(await pixel(mid(3), mid(2), 384), ORANGE),
  JSON.stringify(await pixel(mid(1), mid(1), 384)));

const outlinedBefore = await yellowAcross(56, 72, mid(1), 384);
await hoverAt(await onScreen(mid(1), mid(1), 384));
c.ok('a sign under the pointer is outlined, and the pointer says so', !outlinedBefore && await answersNow()
  && await yellowAcross(56, 72, mid(1), 384), `${outlinedBefore} → ${await yellowAcross(56, 72, mid(1), 384)}`);
await hoverAt(await onScreen(mid(3), mid(2), 384));
c.ok('a thing that does nothing is not', !(await answersNow()) && !(await yellowAcross(184, 200, mid(2), 384))
  && !(await yellowAcross(56, 72, mid(1), 384)), String(await answersNow()));
await hoverAt(await onScreen(mid(4), mid(4), 384));
c.ok('an exit with nothing to see answers on its cell', await answersNow(), String(await answersNow()));

await page.pointer(await onScreen(mid(1), mid(1), 384));
await page.until(`!document.getElementById('sign').hidden`, { timeout: 8000 }).catch(() => {});
await wait(400);
const shown = await page.eval(`(() => { const s = document.getElementById('sign'), c = s.querySelector('.play-sign-picture');
  const d = c.getContext('2d').getImageData(Math.floor(c.width / 2), Math.floor(c.height / 2), 1, 1).data;
  return { open: !s.hidden, says: s.querySelector('.play-sign-says').textContent, middle: [...d], tall: c.height > c.width }; })()`);
c.ok('the poster, clicked, shows its picture and its words over the map', shown.open && shown.says === 'hello from the room'
  && colour(shown.middle, PURPLE) && shown.tall, JSON.stringify(shown));
await c.shot('1-sign');
await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))`);
await wait(200);
c.ok('Escape puts it away', await page.eval(`document.getElementById('sign').hidden`));

// ── An effect (M15g, play/effects.js): a click, played once at its cell, then gone ──

/** Whether the burst's red is at the middle of the effect's cell. */
const red = `(() => { const c = document.getElementById('room'), k = c.width / 384;
  const d = c.getContext('2d').getImageData(Math.round(${mid(5)} * k), Math.round(${mid(0)} * k), 1, 1).data;
  return Math.abs(d[0] - 216) + Math.abs(d[1] - 52) + Math.abs(d[2] - 42) < 40; })()`;
const seen = (what, ms) => page.until(what, { timeout: ms }).then(() => true, () => false);
c.ok('an effect waits unseen: its cell is the ground', colour(await pixel(mid(5), mid(0), 384), [255, 253, 246]), JSON.stringify(await pixel(mid(5), mid(0), 384)));
await hoverAt(await onScreen(mid(5), mid(0), 384));
c.ok('…and answers under the pointer', await answersNow());
await page.pointer(await onScreen(mid(5), mid(0), 384));
c.ok('clicked, it plays over its cell', await seen(red, 4000));
await c.shot('1b-effect');
c.ok('once: after its last frame, the map alone', await seen(`!${red}`, 5000) && colour(await pixel(mid(5), mid(0), 384), [255, 253, 246]),
  JSON.stringify(await pixel(mid(5), mid(0), 384)));
await wait(1500);
c.ok('…and it stays gone: a loop is not begun again', !(await page.eval(red)));
await page.pointer(await onScreen(mid(5), mid(0), 384));
c.ok('clicked again, it plays again — and ends', await seen(red, 4000) && await seen(`!${red}`, 5000));

// ── Its avatar (P4, play/avatar.js) ─────────────────────────────────────────

const DARK = [17, 17, 17], NOSE = [255, 214, 10], GROUND = [255, 253, 246];
/** The avatar's disc on a cell: dark left of its middle; its nose the way it faces. */
const standsOn = (col, row, w = 384) => pixel(col * 64 + 18, row * 64 + 32, w).then(p => colour(p, DARK));
const noseAt = (col, row, dx, dy, w = 384) => pixel(col * 64 + 32 + dx * 14, row * 64 + 32 + dy * 14, w).then(p => colour(p, NOSE));
const press = async code => {
  await page.eval(`document.dispatchEvent(new KeyboardEvent('keydown', { code: '${code}', key: '?', bubbles: true }))`);
  await wait(40);
  await page.eval(`document.dispatchEvent(new KeyboardEvent('keyup', { code: '${code}', key: '?', bubbles: true }))`);
};
const settles = async () => { await wait(700); };
c.ok('its avatar on the spawn, facing its way: nothing stands there, so a disc with a nose', await standsOn(0, 4) && await noseAt(0, 4, 1, 0),
  JSON.stringify(await pixel(18, 4 * 64 + 32, 384)));
await press('KeyD');
await settles();
c.ok('D — by where the key is, ZQSD\'s place too — a step right', await standsOn(1, 4) && colour(await pixel(18, 4 * 64 + 32, 384), GROUND));
await press('KeyD');
await settles();
c.ok('…and a wall stops it, still facing right', await standsOn(1, 4) && await noseAt(1, 4, 1, 0));
await page.pointer(await onScreen(mid(1), mid(2), 384));
await page.until(`(() => { const c = document.getElementById('room'), k = c.width / 384;
  const d = c.getContext('2d').getImageData(Math.round((64 + 18) * k), Math.round((2 * 64 + 32) * k), 1, 1).data;
  return d[0] < 40 && d[1] < 40 && d[2] < 40; })()`, { timeout: 8000 }).catch(() => {});
c.ok('a tap on the map walks it there by the shortest way', await standsOn(1, 2) && !(await standsOn(1, 4)));
await press('KeyW');
await settles();
c.ok('the solid poster ahead: it turns to face it, and does not step', await standsOn(1, 2) && await noseAt(1, 2, 0, -1));
await press('KeyE');
await page.until(`!document.getElementById('sign').hidden`, { timeout: 8000 }).catch(() => {});
c.ok('…and E reads it', (await page.eval(`document.querySelector('.play-sign-says').textContent`)) === 'hello from the room'
  && !(await page.eval(`document.getElementById('sign').hidden`)));
await c.shot('1b-the-avatar-reads');
await press('KeyE');
await wait(200);
c.ok('…E again puts it away', await page.eval(`document.getElementById('sign').hidden`));
await page.pointer(await onScreen(mid(4), mid(3), 384));
await page.until(`(() => { const c = document.getElementById('room'), k = c.width / 384;
  const d = c.getContext('2d').getImageData(Math.round((4 * 64 + 18) * k), Math.round((3 * 64 + 32) * k), 1, 1).data;
  return d[0] < 40 && d[1] < 40 && d[2] < 40; })()`, { timeout: 8000 }).catch(() => {});
await press('KeyS');
await page.until(`document.title.startsWith('the hall')`, { timeout: 30000 }).catch(() => {});
await wait(500);
c.ok('a step onto the exit takes it through, to the hall — on the warp back', (await page.eval('document.title')).startsWith('the hall')
  && await standsOn(0, 0, 256), await page.eval('document.title'));
await c.shot('1c-through-the-exit');
await page.eval(`history.back()`);
await page.until(`document.title.startsWith('a room')`, { timeout: 30000 }).catch(() => {});
await wait(500);
c.ok('…and back, on the room\'s spawn again', await standsOn(0, 4));

// A character worn: the yard's spawn names one — its down, then its left the right mirrored, then its right.
const RED = [216, 52, 42];
await c.go(c.base + '/apps/map/play/?map=' + made.yard);
await page.until(`document.title.startsWith('the yard') && !${note}`, { timeout: 30000 }).catch(() => {});
await wait(800);
c.ok('a character on the spawn, worn — facing down, its down', colour(await pixel(mid(1), mid(1), 192), GREEN), JSON.stringify(await pixel(mid(1), mid(1), 192)));
await press('KeyA');
await settles();
const lefts = [await pixel(48, mid(1), 192), await pixel(16, mid(1), 192)];
c.ok('…a step left: its right, mirrored — red on the right half', colour(lefts[0], RED) && !colour(lefts[1], RED), JSON.stringify(lefts));
await press('KeyD');
await settles();
const rights = [await pixel(64 + 16, mid(1), 192), await pixel(64 + 48, mid(1), 192)];
c.ok('…a step right: its right as it is — red on the left half', colour(rights[0], RED) && !colour(rights[1], RED), JSON.stringify(rights));
await c.shot('1d-a-character');
await c.go(c.base + '/apps/map/play/?map=' + made.room);
await page.until(`document.title.startsWith('a room') && !${note}`, { timeout: 30000 }).catch(() => {});
await wait(300);

await page.pointer(await onScreen(mid(4), mid(4), 384));
await page.until(`document.title.startsWith('the hall')`, { timeout: 30000 }).catch(() => {});
await wait(300);
c.ok('the exit leads to the latest map of its name', (await page.eval(`location.search`)) === '?name=the%20hall'
  && colour(await pixel(mid(2), mid(1), 256), HALL), `${await page.eval('document.title')} · ${await page.eval('location.search')}`);
await c.shot('2-the-hall');
await page.eval(`history.back()`);
await page.until(`document.title.startsWith('a room')`, { timeout: 30000 }).catch(() => {});
await wait(300);
c.ok('the browser\'s back button comes back to the room', colour(await pixel(mid(1), mid(1), 384), GREEN), await page.eval('document.title'));

await c.go(c.base + '/apps/map/play/?name=' + encodeURIComponent('the hall'));
await page.until(`document.title.startsWith('the hall') || ${note}.length > 0`, { timeout: 30000 }).catch(() => {});
c.ok('a name opens the latest map so called', (await page.eval('document.title')).startsWith('the hall'), await page.eval(note));
await c.go(c.base + '/apps/map/play/?name=' + encodeURIComponent('the garden'));
await page.until(`${note}.length > 0`, { timeout: 20000 }).catch(() => {});
c.ok('a name no map has says so', (await page.eval(note)).includes('No map called'), await page.eval(note));

// ── From the editor ─────────────────────────────────────────────────────────

const playBtn = `[...document.querySelectorAll('.pp-actions .nb-btn')].find(b => b.textContent.startsWith('Play'))`;
await c.go(c.base + '/apps/map/');
await page.until(`!!${playBtn}`, { timeout: 20000 }).catch(() => {});
const before = await page.eval(`${playBtn}?.disabled`);
await c.go(c.base + '/apps/map/?open=' + made.room);
await page.until(`(document.querySelector('.bar-say')?.textContent || '').includes('opened')`, { timeout: 30000 }).catch(() => {});
c.ok('the editor\'s Play waits for a map saved or opened, then is there', before === true && (await page.eval(`${playBtn}?.disabled`)) === false,
  `${before} → ${await page.eval(`${playBtn}?.disabled`)}`);

const noise = c.quiet();
c.ok('the console stayed quiet', !noise.length, JSON.stringify(noise).slice(0, 300));
await c.finish();
