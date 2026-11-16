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
 * frames.js `openParts`), fitted to its stage in as many pixels as the
 * screen shows it with, its loops playing by its clock. Nothing the player does
 * enters a recipe: a playable map is an export, as video is a loop's. With
 * no vault it says so (rule 7).
 *
 * A module (core/mount.js; S9i, 2026-11-15): `mount(host)` and `unmount()`,
 * its page mounting it on itself — bare there, the map and nothing else. In
 * a scene with a vault of its own (cluster's), it wears the shell's viewer,
 * its title bar and its status bar, takes the walking keys from the scene's
 * left hand while it is there, plays a map that vault opens (`chosen`), and
 * is given back the map it played. Nothing happens at import.
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
import { Bar }       from '../../../core/Bar.js';
import { own, bare } from '../../../core/keys.js';
import { appModule, leftBehind } from '../../../core/mount.js';

/** The map, its note and its sign over it — a viewer and its stage once in a scene (`start`). */
const MARKUP = `
  <main class="app-main play">
    <section class="play-view" aria-label="the map, played">
      <div class="play-stage">
        <canvas id="room" width="480" height="300"
                aria-label="the map — ZQSD, WASD or the arrows walk, E uses what is faced, a tap walks there"></canvas>
        <p class="play-note" id="note" hidden></p>
        <div class="play-sign" id="sign" hidden>
          <figure class="play-sign-card">
            <canvas class="play-sign-picture" width="1" height="1"></canvas>
            <figcaption class="play-sign-says"></figcaption>
          </figure>
        </div>
      </div>
    </section>
  </main>`;

const app = appModule('play', { markup: MARKUP, style: new URL('./style.css', import.meta.url).href, start,
  keep: () => (room ? { id: room.id } : null) });     // the map played, given back as it was left

/** The player in `host`, the map the address names played (core/mount.js). */
export const mount = (host, given) => app.mount(host, given);
/** The player out of its host, all it held let go of: the map's frames, its clock, its keys. */
export const unmount = () => app.unmount();
const mounted = () => !!app.scope;

/** A map a scene's vault opened (cluster's): played here, from its spawn. */
export function chosen(object) {
  if (mounted() && object && object.type === 'map') open(object.id, null);
}

const MARGIN = 20;        // CSS pixels kept clear round the map, its frame and shadow
const LONGEST = 4096;     // the most canvas pixels along the map's longer side
const USE = new Set(['KeyE', 'Enter', 'Space']);

// One player mounted at a time: its state, made again by each mount (`start`).
let canvas, ctx, stage, note, sign, effects, clock, avatar, steer, scene;
let room = null;          // { id, m, recipe, tiles, things, from } — the map being played
let hover = null;         // the thing under the pointer that answers
let asked = 0;            // the latest map asked for; an older answer is dropped
let view = 1;             // canvas pixels per map pixel
let pending = false;      // a paint asked for, not yet made

function start(root, mine, given = {}) {
  scene = !!given.vault;
  canvas = root.querySelector('#room');
  ctx = canvas.getContext('2d');
  stage = canvas.parentElement;
  note = root.querySelector('.play-note');
  sign = new Sign(root.querySelector('.play-sign'));
  effects = new Effects();
  room = hover = null;
  asked = 0;
  view = 1;
  pending = false;
  /** The map's clock: its loops play, each at its own speed. */
  clock = new Playhead({ onShow: () => draw() });
  /** Who walks it: where it stands lives here, never in a recipe. */
  avatar = new Avatar();
  steer = new Steering();   // its keys held and tapped, and the pad (../steering.js)
  mine.hold(() => {
    clock.dispose();
    effects.dispose();
    avatar.wear(null);
    if (room) dispose(room.things);
    room = null;
  });
  if (scene) {
    // The shell's viewer, placed as every app's is; the walking keys its own, not the left hand's (core/keys.js).
    root.querySelector('.play-view').className = 'viewer';
    stage.className = 'viewer-stage';
    new Bar({ app: 'play', mount: root, acts: false,
              keys: 'ZQSD, WASD or the arrows walk · E uses what is faced · a tap walks there · a click uses what answers' });
    own('KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyQ', 'KeyE', 'Space');
  }

  mine.listen(canvas, 'pointermove', e => {
    const p = room ? answeringAt(pointOf(e)) : null;
    if (p === hover) return;
    hover = p;
    canvas.classList.toggle('answers', !!p);
    draw();
  });
  mine.listen(canvas, 'pointerleave', () => {
    if (!hover) return;
    hover = null;
    canvas.classList.remove('answers');
    draw();
  });
  mine.listen(canvas, 'click', e => {
    if (!room) return;
    const pt = pointOf(e);
    const p = answeringAt(pt);
    if (p) return use(p);
    // Anywhere else: walked there by the shortest way, from where its step under way ends.
    const way = pathTo(room.recipe, avatar.bound, { col: Math.floor(pt.x / room.m.tile), row: Math.floor(pt.y / room.m.tile) });
    if (way) { avatar.path = way; steer.queued = null; }
  });
  mine.listen(document, 'keydown', e => {
    if (!bare(e)) return;          // no field, no Ctrl, Alt or Meta: Ctrl V is not V (core/keys.js, S15i)
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
  mine.listen(document, 'keyup', e => steer.release(e));
  mine.listen(window, 'blur', () => { steer.held.length = 0; });
  mine.listen(window, 'popstate', e => openFromUrl((e.state && e.state.from) || null));
  const sized = new ResizeObserver(() => draw());     // the window, or a scene's wall moved
  sized.observe(stage);
  mine.hold(() => sized.disconnect());

  /** Every frame: the step under way moved on, a warp stepped onto gone through, the next step taken (../steering.js). */
  const walk = now => {
    if (app.scope !== mine) return;          // taken out: its loop ends with it
    requestAnimationFrame(walk);
    step(now);
  };
  requestAnimationFrame(walk);
  return openFromUrl().catch(err => say('The player failed: ' + err.message));
}

function say(text) {
  note.textContent = text || '';
  note.hidden = !text;
}

/** The map the address names: by id, or the latest of a name — in a scene, else the one played when it was taken out. */
async function openFromUrl(from = null) {
  const q = new URLSearchParams(location.search);
  const name = q.get('name');
  let id = q.get('map');
  if (!(await Vault.refresh())) return say('No vault: the player reads its maps from the vault until they are baked.');
  if (!mounted()) return;
  if (!id && name) id = (latestMap(Vault.index, name) || {}).id;
  const left = !id && !name && leftBehind('play');
  if (left) id = left.state.id;
  if (!id) {
    return say(name ? `No map called “${name}” in the vault.`
      : scene ? 'Which map? Choose one in the vault.' : 'Which map? Open this page with ?map=<id>, or ?name=<its name>.');
  }
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
    if (ask !== asked || !mounted()) return dispose(parts.things);
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
    if (ask !== asked || !mounted()) return;
    if (!scene) document.title = `${room.m.name || 'a map'} — skweeb`;     // in a scene, the title is the scene's
    const length = parts.things.length(room.m.fps);
    clock.configure({ length, fps: room.m.fps, loop: true });
    if (length > 1) clock.play();
    say(parts.missing.length ? `${parts.missing.length} of its parts would not open: ${parts.missing.join(', ')}` : '');
    draw();
  } catch (err) {
    if (ask === asked && mounted()) say('Could not open the map: ' + err.message);
  }
}

/** A map's things let go of: their frames, and their ear for new versions (things.js). */
function dispose(things) { things.dispose(); }

/** A warp: the latest map of its name, the way back kept in the browser's history — a scene's app named in it still. */
async function go(name) {
  if (!name) return say('This warp leads to no map yet.');
  await Vault.refresh();
  if (!mounted()) return;
  if (!latestMap(Vault.index, name)) return say(`No map called “${name}” in the vault yet.`);
  const from = room ? room.m.name : null;
  history.pushState({ from }, '', `?name=${encodeURIComponent(name)}${location.hash}`);
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

// ── The avatar's steps ──────────────────────────────────────────────────────

/** E: what the avatar faces, used — a sign read, a warp gone through, an effect played. */
function useAhead() {
  if (!room || avatar.walking) return;
  const at = ahead(avatar.at, avatar.face);
  const b = answeringOn(room.recipe, at.col, at.row);
  if (b) useBlock(b);
}

/** A frame's walking: the pad read, the step under way moved on, a warp stepped onto gone through. */
function step(now) {
  const pad = steer.pad();
  if (!room) return;
  if (sign.isOpen) { if (pad.use) sign.close(); return; }
  if (pad.use) useAhead();
  const moved = stride(avatar, room.recipe, now, () => steer.next(pad.way), cell => {
    const warp = warpAt(room.recipe, cell.col, cell.row);
    if (!warp) return false;
    avatar.stand();
    steer.clear();
    go(warp.to);
    return true;
  });
  if ((moved.moved && !moved.stopped) || effects.active) paint();
}

// ── Drawing ─────────────────────────────────────────────────────────────────

function draw() {
  if (pending || !mounted()) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

function paint() {
  if (!room || !mounted()) return;
  const size = mapSize(room.m);
  const cs = getComputedStyle(stage);
  const roomW = stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2 * MARGIN;
  const roomH = stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - 2 * MARGIN;
  const fit = Math.max(0.01, Math.min(roomW / size.width, roomH / size.height));
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
