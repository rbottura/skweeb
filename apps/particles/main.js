/**
 * main.js — particles, assembled. M6: the app plays, dots or a set's sprites.
 *
 * The emitter on the left, the picture between, the picture's settings on
 * the right. Every frame is `particlesAt(recipe, tick / fps)` (model.js) —
 * nothing stepped, nothing carried over — so a scrub, a step back or a jump
 * to frame 900 is the frame playing would have reached, and a stream's loop
 * closes on its last frame. Drawn by draw.js at the size the viewer shows
 * (core/view.js).
 *
 * A set from the vault is the sprites (sprites.js), one each; with none, or
 * no vault at all, the particles are dots and the app plays the same
 * (rule 7). S saves the loop (save.js), and the vault plays it back through
 * rebuild.js; `?open=<id>` brings a saved one back to work on.
 */

import { emitParams, pictureParams, toModel, framesOf, EMIT_GROUPS, PICTURE_GROUPS } from './params.js';
import { prepare, particlesAt } from './model.js';
import { drawParticles, pictureSize } from './draw.js';
import { loadSprites }  from './sprites.js';
import { saveParticles, downloadFrames } from './save.js';
import { requested }      from '../../core/reopen.js';
import { ParamPanel }     from '../../core/ParamPanel.js';
import { VaultPanel }     from '../../core/VaultPanel.js';
import { Transport }      from '../../core/Transport.js';
import { Bar }            from '../../core/Bar.js';
import { Playhead }       from '../../core/playback.js';
import { Vault }          from '../../core/vault.js';
import { applyFrameEdit } from '../../core/frame.js';
import { viewFactor }     from '../../core/view.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

let emit, picture, bar, transport, player;
let clockFps = 0;
let model = null;          // the recipe, prepared: remade when a value changes, not every frame
let shown = [];            // the particles on screen, for the bar
let sprites = null;        // the chosen set's images, or null: dots
let spritesTitle = '';     // and its title, for a saved object's
let loading = false;       // a set is on its way in: nothing saves until it is
let spritesIn = Promise.resolve();   // the set on its way in, for a reopen to wait on
let asked = 0;             // the latest set asked for; an older answer is dropped
let busy = false;          // a save or a download is drawing; nothing else starts
const painted = [];        // when the last paints were, while playing

/** The clock plays the picture's frames at its rate; a tick is a time, tick / fps. */
const clock = new Playhead({
  onShow: tick => { if (transport) transport.show(tick); draw(); },
  onState: () => { if (transport) transport.state(); if (!clock.playing) bar.rate(null); },
});

async function boot() {
  bar = new Bar({ app: 'particles', mount: document.querySelector('.app'),
                  keys: 'space play · , . frame · S save · V vault' });
  emit = emitParams();
  picture = pictureParams();
  new ParamPanel(emit, { title: 'particles', mount: document.getElementById('emit-side'), groups: EMIT_GROUPS });
  const side = new ParamPanel(picture, { title: 'picture', mount: document.getElementById('picture-side'),
                                         groups: PICTURE_GROUPS });

  player = side.drawer('player');
  const holder = document.createElement('div');
  player.body.prepend(holder);
  transport = new Transport({ clock, mount: holder, busy: () => busy });
  buildExport(side);

  emit.on(() => remake());
  picture.on(key => {
    applyFrameEdit(picture, key);
    if (key === 'fps') remake();
    else if (key === 'sprites') spritesIn = chooseSprites(picture.get('sprites'));
    else draw();
  });
  new ResizeObserver(() => draw()).observe(canvas.parentElement);
  wireKeys();
  remake();
  if (await openRequested()) return;
  clock.play();
}

/**
 * `?open=<id>`: a saved loop or still back to work on (core/reopen.js) —
 * both panels as they were, its sprites with them, at the frame it kept.
 *
 * @returns {Promise<boolean>} whether anything was opened
 */
async function openRequested() {
  try {
    const opened = await requested('particles');
    if (!opened) return false;
    const { recipe } = opened.object;
    emit.restore(recipe.emit);
    picture.restore(recipe.picture);
    await spritesIn;
    clock.show(Math.min(Number.isInteger(recipe.tick) ? recipe.tick : 0, clock.length - 1));
    bar.announce(`opened ${opened.object.id} — ${opened.object.title}`);
    return true;
  } catch (err) {
    bar.announce('could not open it: ' + err.message);
    return false;
  }
}

/**
 * The recipe changed: prepare it once, and fit the clock to how long the
 * picture now lasts — kept at the frame it was on, playing if it was.
 */
function remake() {
  const e = emit.values, p = picture.values;
  model = prepare(toModel(e, p));
  const length = framesOf(e, p, model.longest);
  if (length !== clock.length || p.fps !== clockFps) {
    const was = clock.playing, at = clock.tick;
    clock.configure({ length, fps: p.fps, loop: true });
    clockFps = p.fps;
    transport.configure();
    clock.show(Math.min(at, length - 1));
    if (was) clock.play();
  }
  const secs = (length / p.fps).toFixed(2);
  player.note(e.mode === 'burst' ? `${length} frames · ${secs} s, once` : `${length} frames · ${secs} s, a loop`);
  draw();
}

/** A set chosen as the sprites (sprites.js): dots until it is in, and dots if it will not come. */
async function chooseSprites(id) {
  const ask = ++asked;
  sprites = null;
  spritesTitle = '';
  loading = !!id;
  draw();
  if (!id) return;
  try {
    const set = await loadSprites(id);
    if (ask !== asked) return;
    sprites = set.images.length ? set.images : null;
    spritesTitle = set.title;
    bar.announce(`${set.title}: ${set.images.length} sprites`
      + (set.missing ? ` — ${set.missing} would not load` : '') + (sprites ? '' : ' — drawing dots'));
  } catch (err) {
    if (ask !== asked) return;
    bar.announce(`could not open the sprites: ${err.message} — drawing dots`);
  }
  loading = false;
  draw();
}

// ── Leaving: a loop, a still, the frames ─────────────────────────────────────

/** The Export drawer, under the picture's settings. */
function buildExport(side) {
  const exp = side.addDrawer({ id: 'export', title: 'Export' });
  const actions = document.createElement('div');
  actions.className = 'pp-actions';
  const button = (label, onClick, primary = false) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'nb-btn nb-btn--wide' + (primary ? ' nb-btn--primary' : '');
    b.textContent = label;
    b.addEventListener('click', onClick);
    actions.append(b);
  };
  button('Save the loop to the vault  [S]', () => save(), true);
  button('Save this frame as a still', () => save({ still: true }));
  button('Download every frame (zip)', frames);
  exp.body.append(actions);
}

/** One way out for all three: the player held still, nothing else started meanwhile. */
async function leave(action) {
  if (busy) return;
  if (loading) return bar.announce('the sprites are still loading — a moment');
  busy = true;
  clock.pause();
  try {
    bar.announce(await action());
  } catch (err) {
    console.error('[particles] failed:', err);
    bar.announce('failed: ' + err.message);
  } finally {
    busy = false;
    refreshVault();
    draw();
  }
}

/** The loop, or the frame on screen as a still, into the vault (save.js). */
function save({ still = false } = {}) {
  return leave(async () => {
    bar.say('saving…');
    const tick = clock.tick;
    const object = await saveParticles({ emit, picture, sprites, spritesTitle, tick, still });
    if (!object) return 'no vault — downloaded instead';
    return still ? `saved ${object.id} — frame ${tick + 1}, a still`
      : `saved ${object.id} — ${object.render.frames} frames at ${object.render.fps} fps, its picture frame ${tick + 1}`;
  });
}

/** Every frame, zipped with its rate (save.js). */
function frames() {
  return leave(async () => {
    const out = await downloadFrames({ emit, picture, sprites, onStatus: t => bar.say(t) });
    return `downloaded ${out.frames} frames at ${out.fps} fps, ${out.width} × ${out.height} px — `
      + 'node scripts/frames-to-video.mjs makes the video';
  });
}

// ── Drawing ──────────────────────────────────────────────────────────────────

let pending = false;

function draw() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

function paint() {
  if (!model) return;
  const p = picture.values;
  const size = pictureSize(p);
  const view = viewFactor(canvas, size, p.scale);
  const w = Math.max(1, Math.round(size.width * view));
  const h = Math.max(1, Math.round(size.height * view));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  shown = particlesAt(model, clock.tick / p.fps);
  drawParticles(ctx, shown, p, view, sprites);

  bar.output({ width: Math.round(size.width * p.scale), height: Math.round(size.height * p.scale),
               scale: p.scale, format: p.format });
  bar.say(`${shown.length} alive · frame ${clock.tick + 1} of ${clock.length}`
    + (emit.get('mode') === 'burst' ? ' · a burst' : ' · a loop that closes'));
  rate();
}

/** Paints a second over the last second, while playing. */
function rate() {
  if (!clock.playing) return;
  const now = performance.now();
  painted.push(now);
  while (painted.length && painted[0] < now - 1000) painted.shift();
  bar.rate(painted.length);
}

// ── Keys, the vault ──────────────────────────────────────────────────────────

function wireKeys() {
  const vault = new VaultPanel();
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (e.key === 's' || e.key === 'S') save();
    if (busy || clock.length < 2) return;
    if (e.key === ' ') { e.preventDefault(); clock.toggle(); }
    if (e.key === ',') { clock.pause(); clock.step(-1); }
    if (e.key === '.') { clock.pause(); clock.step(1); }
  });
  refreshVault();
}

function refreshVault() {
  Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
}

boot().catch(err => {
  console.error('[particles] failed to boot:', err);
  if (bar) bar.announce('failed to boot: ' + err.message);
});
