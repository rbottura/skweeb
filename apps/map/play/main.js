/**
 * main.js — the player: a map from the vault, played. M8's third brick, point
 * and click: what answers is outlined under the pointer, and a press uses it —
 * a sign shows over the map (sign.js), a warp leads to the latest map of its
 * name. The fourth, its avatar (avatar.js, P4): on the spawn, wearing what
 * stands there; it walks a cell at a time — ZQSD or WASD by where the keys
 * are, the arrows, a gamepad's stick or its cross — walls and solid things
 * stopping it, a step onto a warp taking it through, to the warp back; E —
 * or Enter, space, the pad's A — uses what it faces; a tap on the map walks
 * it there by the shortest way (walk.js `pathTo`). With the fifth the player
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
import { Effects }   from './effects.js';
import { Avatar }    from './avatar.js';
import { Steering, stride } from '../steering.js';
import { spawnOf, arrival, pathTo, ahead, warpAt, answeringAt as answeringOn } from '../walk.js';
import { Vault }     from '../../../core/vault.js';
import { Playhead }  from '../../../core/playback.js';

const canvas = document.getElementById('room');
const ctx = canvas.getContext('2d');
const note = document.getElementById('note');
const sign = new Sign(document.getElementById('sign'));
const effects = new Effects();
const MARGIN = 20;        // CSS pixels kept clear round the map, its frame and shadow
const LONGEST = 4096;     // the most canvas pixels along the map's longer side

let room = null;          // { id, m, recipe, tiles, things, from } — the map being played
let hover = null;         // the thing under the pointer that answers
let asked = 0;            // the latest map asked for; an older answer is dropped
let view = 1;             // canvas pixels per map pixel

/** The map's clock: its loops play, each at its own speed. */
const clock = new Playhead({ onShow: () => draw() });

/** Who walks it: where it stands lives here, never in a recipe. */
const avatar = new Avatar();
const steer = new Steering();   // its keys held and tapped, and the pad (../steering.js)

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
    effects.stop();
    effects.ready(recipe);
    // Through a warp, on the warp back; else on the spawn — wearing what stands there, or what it wore (avatar.js).
    avatar.place(arrival(recipe, from));
    const spawn = spawnOf(recipe);
    const wears = spawn.from != null ? recipe.place[spawn.from].ref || null : null;
    if (wears || avatar.ref === undefined) await avatar.wear(wears);
    if (ask !== asked) return;
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

/** A map's things let go of: their frames, and their ear for new versions (things.js). */
function dispose(things) { things.dispose(); }

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

function use(p) { return useBlock(p.block); }

/** A block used, by a press or by E: a sign shown, a warp gone through, an effect played once at its cell (effects.js). */
function useBlock(b) {
  if (b.event === 'sign') return sign.show(signOf(b));
  if (b.event === 'warp') return go(b.to);
  if (b.event === 'effect') {
    if (!b.plays) return say('This effect plays nothing yet.');
    return effects.play(b).then(() => draw(), err => say('What this plays would not open: ' + err.message));
  }
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
  if (!room) return;
  const pt = pointOf(e);
  const p = answeringAt(pt);
  if (p) return use(p);
  // Anywhere else: walked there by the shortest way, from where its step under way ends.
  const way = pathTo(room.recipe, avatar.bound, { col: Math.floor(pt.x / room.m.tile), row: Math.floor(pt.y / room.m.tile) });
  if (way) { avatar.path = way; steer.queued = null; }
});

// ── The avatar's keys, its pad, its steps ───────────────────────────────────

const USE = new Set(['KeyE', 'Enter', 'Space']);

document.addEventListener('keydown', e => {
  if (sign.isOpen) {
    if (e.key === 'Escape' || USE.has(e.code)) { e.preventDefault(); sign.close(); }
    return;
  }
  if (steer.press(e)) {
    e.preventDefault();
    avatar.path = [];
  } else if (USE.has(e.code) && !e.repeat) {
    e.preventDefault();
    useAhead();
  }
});
document.addEventListener('keyup', e => steer.release(e));
window.addEventListener('blur', () => { steer.held.length = 0; });

/** E: what the avatar faces, used — a sign read, a warp gone through, an effect played. */
function useAhead() {
  if (!room || avatar.walking) return;
  const at = ahead(avatar.at, avatar.face);
  const b = answeringOn(room.recipe, at.col, at.row);
  if (b) useBlock(b);
}

/** Every frame: the step under way moved on, a warp stepped onto gone through, the next step taken (../steering.js). */
function walk(now) {
  requestAnimationFrame(walk);
  const pad = steer.pad();
  if (!room) return;
  if (sign.isOpen) { if (pad.use) sign.close(); return; }
  if (pad.use) useAhead();
  const step = stride(avatar, room.recipe, now, () => steer.next(pad.way), cell => {
    const warp = warpAt(room.recipe, cell.col, cell.row);
    if (!warp) return false;
    avatar.stand();
    steer.clear();
    go(warp.to);
    return true;
  });
  if ((step.moved && !step.stopped) || effects.active) paint();
}
requestAnimationFrame(walk);
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
  // The avatar among the things, by the row it stands on; the spawn's own thing is what it wears.
  const layers = room.things.layers(clock.tick, room.m, b => b.event === 'spawn');
  const me = avatar.layer(room.m, performance.now());
  const after = layers.findIndex(l => l.row > me.row);
  layers.splice(after < 0 ? layers.length : after, 0, me);
  layers.push(...effects.layers(performance.now(), room.m));     // over them all, while they last
  drawMap(ctx, room.m, view, { cells: room.recipe.cells || [], tiles: room.tiles, layers });
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
