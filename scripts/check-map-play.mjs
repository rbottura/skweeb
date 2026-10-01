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
 * it opened. Needs no GPU, and brings what it needs.
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
  const map = async (values, place) => { const m = { ...mapParams().values, ...values };
    const blob = await picture(m.cols * m.tile, m.rows * m.tile, m.ground, false);
    return (await Vault.save({ type: 'map', title: m.name, tags: ['map'], origin: { app: 'map', version: '1.0.0' }, seed: null,
      recipe: { map: m, cells: new Array(m.cols * m.rows).fill(-1), walls: new Array(m.cols * m.rows).fill(0), place },
      parents: [], render: { blob, ext: 'png', w: m.cols * m.tile, h: m.rows * m.tile }, thumb: await thumbFromBlob(blob) })).id; };
  const poster = await shape('a poster', '#2a9d4b', false), big = await shape('the poster, large', '#7b2cbf', false, 96, 128);
  const dot = await shape('a dot', '#f28c28');
  const room = await map({ name: 'a room', cols: 6, rows: 5, tile: 64, ground: '#fffdf6' }, [
    { ref: poster, col: 1, row: 1, width: 1, event: 'sign', says: 'hello from the room', shows: big },
    { ref: dot, col: 3, row: 2, width: 1 },
    { ref: null, col: 4, row: 4, width: 1, event: 'warp', to: 'the hall' }]);
  const hall = await map({ name: 'the hall', cols: 4, rows: 3, tile: 64, ground: '#dfe9ff' }, [
    { ref: null, col: 0, row: 0, width: 1, event: 'warp', to: 'a room' }]);
  await Vault.refresh();
  return { poster, big, dot, room, hall }; })()`);
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
