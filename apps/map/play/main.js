/**
 * main.js — the player: a map from the vault, played. M8's third brick, point
 * and click: what answers is outlined under the pointer, and a press uses it —
 * a sign shows over the map (sign.js), a warp leads to the latest map of its
 * name. The avatar comes in the fourth brick, and with the fifth the player
 * reads a baked bundle instead of the vault (docs/roadmap.md, M8).
 *
 *   /apps/map/play/?map=<id>      a saved map
 *   /apps/map/play/?name=<name>   the latest map so called, as a warp finds one
 *
 * The map is drawn by the editor's own code (draw.js, things.js, through
 * frames.js `openParts`), fitted to the window in as many pixels as the
 * screen shows it with, its loops playing by its clock. Nothing the player does
 * enters a recipe: a playable map is an export, as video is a loop's. With
 * no vault it says so (rule 7).
 */

import { openParts } from '../frames.js';
import { drawMap }   from '../draw.js';
import { mapSize }   from '../grid.js';
import { thingAt, boxOf } from '../things.js';
import { answers, signOf, latestMap } from './maps.js';
import { Sign }      from './sign.js';
import { Vault }     from '../../../core/vault.js';
import { Playhead }  from '../../../core/playback.js';

const canvas = document.getElementById('room');
const ctx = canvas.getContext('2d');
const note = document.getElementById('note');
const sign = new Sign(document.getElementById('sign'));
const MARGIN = 20;        // CSS pixels kept clear round the map, its frame and shadow
const LONGEST = 4096;     // the most canvas pixels along the map's longer side

let room = null;          // { id, m, recipe, tiles, things, from } — the map being played
let hover = null;         // the thing under the pointer that answers
let asked = 0;            // the latest map asked for; an older answer is dropped
let view = 1;             // canvas pixels per map pixel

/** The map's clock: its loops play, each at its own speed. */
const clock = new Playhead({ onShow: () => draw() });

function say(text) {
  note.textContent = text || '';
  note.hidden = !text;
}

/** The map the address names: by id, or the latest of a name. */
async function openFromUrl(from = null) {
  const q = new URLSearchParams(location.search);
  const name = q.get('name');
  let id = q.get('map');
  if (!(await Vault.refresh())) return say('No vault: the player reads its maps from the vault until they are baked.');
  if (!id && name) id = (latestMap(Vault.index, name) || {}).id;
  if (!id) return say(name ? `No map called “${name}” in the vault.` : 'Which map? Open this page with ?map=<id>, or ?name=<its name>.');
  return open(id, from);
}

async function open(id, from) {
  const ask = ++asked;
  say('opening…');
  sign.close();
  try {
    const { object } = await Vault.load(id);
    const recipe = object.recipe;
    if (object.type !== 'map' || !recipe || !recipe.map) throw new Error(`${id} is not a map`);
    const parts = await openParts(recipe, { draft: true });
    if (ask !== asked) return dispose(parts.things);
    if (room) dispose(room.things);
    room = { id, m: recipe.map, recipe, tiles: parts.tiles, things: parts.things, from };
    hover = null;
    document.title = `${room.m.name || 'a map'} — skweeb`;
    const length = parts.things.length(room.m.fps);
    clock.configure({ length, fps: room.m.fps, loop: true });
    if (length > 1) clock.play();
    say(parts.missing.length ? `${parts.missing.length} of its parts would not open: ${parts.missing.join(', ')}` : '');
    draw();
  } catch (err) {
    if (ask === asked) say('Could not open the map: ' + err.message);
  }
}

function dispose(things) {
  for (const p of things.items) if (p.handle && p.handle.dispose) p.handle.dispose();
}

/** A warp: the latest map of its name, the way back kept in the browser's history. */
async function go(name) {
  if (!name) return say('This warp leads to no map yet.');
  await Vault.refresh();
  if (!latestMap(Vault.index, name)) return say(`No map called “${name}” in the vault yet.`);
  const from = room ? room.m.name : null;
  history.pushState({ from }, '', `?name=${encodeURIComponent(name)}`);
  return openFromUrl(from);
}

// ── What answers ────────────────────────────────────────────────────────────

/** Where the pointer is on the map, in its own pixels. */
function pointOf(e) {
  const r = canvas.getBoundingClientRect(), { width, height } = mapSize(room.m);
  return { x: ((e.clientX - r.left) / r.width) * width, y: ((e.clientY - r.top) / r.height) * height };
}

/** The nearest thing under a point that answers — of those whose frames are in, and the marks. */
function answeringAt(pt) {
  if (!room) return null;
  const items = room.things.items.filter(p => answers(p.block) && (p.size || !p.block.ref));
  return thingAt(items, pt.x, pt.y, room.m.tile);
}

function use(p) {
  if (p.block.event === 'sign') return sign.show(signOf(p.block));
  if (p.block.event === 'warp') return go(p.block.to);
}

canvas.addEventListener('pointermove', e => {
  const p = room ? answeringAt(pointOf(e)) : null;
  if (p === hover) return;
  hover = p;
  canvas.classList.toggle('answers', !!p);
  draw();
});
canvas.addEventListener('pointerleave', () => {
  if (!hover) return;
  hover = null;
  canvas.classList.remove('answers');
  draw();
});
canvas.addEventListener('click', e => {
  const p = room ? answeringAt(pointOf(e)) : null;
  if (p) use(p);
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && sign.isOpen) sign.close();
});
window.addEventListener('popstate', e => openFromUrl((e.state && e.state.from) || null));
window.addEventListener('resize', () => draw());

// ── Drawing ─────────────────────────────────────────────────────────────────

let pending = false;

function draw() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

function paint() {
  if (!room) return;
  const size = mapSize(room.m);
  const fit = Math.max(0.01, Math.min((innerWidth - 2 * MARGIN) / size.width, (innerHeight - 2 * MARGIN) / size.height));
  view = Math.min(fit * (window.devicePixelRatio || 1), LONGEST / Math.max(size.width, size.height));
  const w = Math.max(1, Math.round(size.width * view)), h = Math.max(1, Math.round(size.height * view));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  canvas.style.width = `${Math.round(size.width * fit)}px`;
  canvas.style.height = `${Math.round(size.height * fit)}px`;
  drawMap(ctx, room.m, view, { cells: room.recipe.cells || [], tiles: room.tiles,
                               layers: room.things.layers(clock.tick, room.m) });
  if (hover) outline(hover);
}

/** The thing that answers under the pointer: its box — its cell, for a mark — drawn round. */
function outline(p) {
  const b = boxOf(p.block, p.size, room.m.tile);
  const dpp = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineWidth = 5 * dpp;
  ctx.strokeStyle = '#111111';
  ctx.strokeRect(b.x * view, b.y * view, b.w * view, b.h * view);
  ctx.lineWidth = 3 * dpp;
  ctx.strokeStyle = '#ffd60a';
  ctx.strokeRect(b.x * view, b.y * view, b.w * view, b.h * view);
  ctx.restore();
}

openFromUrl().catch(err => say('The player failed: ' + err.message));
