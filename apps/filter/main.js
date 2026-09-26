/**
 * main.js — filter, assembled.
 *
 * A source, a chain, one canvas. The source is any vault object with a
 * picture, or a file (source.js); the chain is a list of GPU filters, each a
 * card drawn from its own schema (chain.js); the canvas is the source's frame
 * under the clock, run through the chain by one core/gpu runner. S saves what
 * is on screen (save.js), and `?open=<id>` brings a saved chain back; how a
 * saved object replays elsewhere is rebuild.js's.
 *
 * Where there is no WebGPU the page opens all the same (rule 7): the chain
 * can be built, the source shows as it is, and the bar says why.
 */

import { filterParams, GROUPS } from './params.js';
import { Chain }                from './chain.js';
import { fromVault, fromFile }  from './source.js';
import { save as saveObject, saveLook } from './save.js';
import { requested }            from '../../core/reopen.js';
import { ParamPanel }           from '../../core/ParamPanel.js';
import { VaultPanel }           from '../../core/VaultPanel.js';
import { Transport }            from '../../core/Transport.js';
import { Bar }                  from '../../core/Bar.js';
import { Playhead }             from '../../core/playback.js';
import { Vault }                from '../../core/vault.js';
import { createRunner }         from '../../core/gpu/runner.js';
import { whyNoGpu }             from '../../core/gpu/device.js';

let params, panel, bar, transport, chain;
let runner = null;       // core/gpu's, or null where there is no WebGPU
let source = null;       // source.js's handle
let failing = '';        // why the chain does not compile, until it does
let asked = 0;           // the latest source asked for; an older answer is dropped
let busy = false;        // a save is running; nothing else may start
const buttons = {};

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

/** The clock: a loop plays at its own rate, and a scrub is one frame filtered. */
const clock = new Playhead({
  onShow: tick => { if (transport) transport.show(tick); draw(); },
  onState: () => { if (transport) transport.state(); if (!clock.playing) bar.rate(null); },
});

// ── Boot ─────────────────────────────────────────────────────────────────────

async function boot() {
  params = filterParams();
  bar = new Bar({
    app: 'filter',
    mount: document.querySelector('.app'),
    keys: 'V vault · S save · space play · ← → step · drop an image',
  });
  panel = new ParamPanel(params, { title: 'filter', mount: document.getElementById('side'), groups: GROUPS });
  params.on(onParamChange);
  buildDrawers();

  runner = await createRunner();
  if (!runner) bar.announce(`no GPU filters here — ${whyNoGpu()}; the source shows as it is`);
  wireKeys();
  onChainChange();
  await openRequested();
}

/**
 * `?open=<id>`: a saved filter object back to work on (core/reopen.js) — its
 * chain card for card, and its source. A leaf, saved from a file, has neither.
 * A look has a chain and no source: it goes over whatever is chosen next.
 */
async function openRequested() {
  try {
    const opened = await requested('filter');
    if (!opened) return;
    const { object } = opened;
    const recipe = object.recipe;
    if (!recipe) return bar.announce(`${object.id} was saved from a file, as a leaf — there is no chain to bring back`);
    const unknown = chain.restore(recipe.chain);
    const lost = unknown.length ? ` · ${unknown.length} of its filters are not in this catalogue` : '';
    if (object.type === 'params') {
      params.set('edges', recipe.edges || 'grow');
      return bar.announce(`${object.title} — choose a source to see it on${lost}`);
    }
    // Saved before `edges` existed, it kept its size.
    params.restore({ edges: 'keep', ...recipe });
    bar.announce(`opened ${object.id} — ${object.title}${lost}`);
  } catch (err) {
    bar.announce('could not open it: ' + err.message);
  }
}

/** The drawers that are not parameters: a file under Source, the chain, the player. */
function buildDrawers() {
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'image/*';
  file.hidden = true;
  file.addEventListener('change', () => loadFile(file.files[0]));
  panel.drawer('source').body.append(button('Open a file', () => file.click()), file);

  chain = new Chain({ mount: panel.drawer('filters').body, onChange: onChainChange });

  const player = panel.addDrawer({ id: 'player', title: 'Sequence player' });
  transport = new Transport({ clock, mount: player.body, busy: () => busy });

  const exp = panel.addDrawer({ id: 'export', title: 'Export' });
  const actions = document.createElement('div');
  actions.className = 'pp-actions';
  buttons.save = button('Save to the vault  [S]', () => save(), true);
  buttons.frames = button('Save + download the frames', () => save({ keepFrames: true }));
  buttons.look = button('Save the chain as a look', () => look());
  actions.append(buttons.save, buttons.frames, buttons.look);
  exp.body.append(actions);
  showLoopControls();
}

function button(label, onClick, primary = false) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'nb-btn nb-btn--wide' + (primary ? ' nb-btn--primary' : '');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

async function onParamChange(key, value) {
  if (key === 'source') await loadSource(value);
  if (key === 'edges') draw();
}

/** Whether the chain gets room past the picture's edge (params.js, `edges`). */
const growing = () => params.get('edges') !== 'keep';

/** A filter came, went, moved or changed: compile what is new, then draw. */
function onChainChange() {
  const { on, all } = chain.counts;
  panel.drawer('filters').note(all ? `${on} of ${all} on` : '');
  if (!runner) return draw();
  runner.prepare(chain.recipe()).then(
    () => { failing = ''; draw(); },
    err => { failing = err.message; bar.announce(err.message); draw(); });
}

// ── The source ───────────────────────────────────────────────────────────────

function setSource(next) {
  if (source) source.dispose();
  source = next;
  clock.configure({ length: next ? next.frames : 0, fps: next ? next.fps : 0, loop: next ? next.loop : true });
  showLoopControls();
  draw();
}

async function loadSource(id) {
  const ask = ++asked;
  if (!id) return setSource(null);
  bar.say('opening…');
  try {
    const next = await fromVault(id);
    if (ask !== asked) return next.dispose();        // another was chosen meanwhile
    setSource(next);
  } catch (err) {
    if (ask !== asked) return;
    setSource(null);
    bar.announce('could not open that object: ' + err.message);
  }
}

/** A file off disk: the param is cleared first, since clearing it after would drop this file. */
async function loadFile(file) {
  if (!file) return;
  params.set('source', null);
  const ask = ++asked;
  const next = await fromFile(file);
  if (ask !== asked) return next.dispose();
  setSource(next);
}

/** The player, and a loop's frames to download, exist only when there is a loop. */
function showLoopControls() {
  const many = !!source && source.frames > 1;
  panel.drawer('player').hidden = !many;
  if (buttons.frames) buttons.frames.hidden = !many;
  if (transport) transport.configure();
}

// ── Saving ───────────────────────────────────────────────────────────────────

/**
 * What is on screen, into the vault: a still source makes a still and a loop
 * makes a loop, whose picture is the frame shown (save.js).
 */
async function save({ keepFrames = false } = {}) {
  if (busy) return;
  if (!source) return bar.announce('nothing to save yet — choose a source');
  if (!runner) return bar.announce('no GPU here — nothing is filtered, so there is nothing to save');
  if (failing) return bar.announce('the chain does not compile — ' + failing);
  const list = chain.recipe();
  if (!runner.ready(list)) return bar.announce('a filter is still compiling — try again in a moment');

  clock.pause();
  busy = true;
  bar.say('saving…');
  try {
    const tick = clock.tick;
    const { object, frames } = await saveObject({
      params, chain: list, source, runner, tick, keepFrames, onStatus: t => bar.say(t),
    });
    bar.announce(!object ? 'no vault — downloaded instead'
      : frames > 1 ? `saved ${object.id} — ${frames} frames, its picture frame ${tick + 1}`
        + (keepFrames ? ', and every frame downloaded' : '')
      : `saved ${object.id}`);
  } catch (err) {
    console.error('[filter] save failed:', err);
    bar.announce('save failed: ' + err.message);
  } finally {
    busy = false;
    refreshVaultState();
    draw();
  }
}

/**
 * The chain alone, as a look another app can put over anything: compose
 * over a placement (core/gpu/look.js). Its picture is what it does to the
 * frame on screen, so its card in the vault shows what it is.
 */
async function look() {
  if (busy) return;
  const list = chain.recipe();
  if (!chain.counts.on) return bar.announce('a look needs a filter that is on');
  if (!source || !runner) return bar.announce('choose a source first — a look is saved with a picture of what it does');
  if (failing || !runner.ready(list)) return bar.announce('the chain is not ready — ' + (failing || 'still compiling'));

  busy = true;
  try {
    const shown = runner.run(source.frame(clock.tick), list,
      { time: source.fps ? clock.tick / source.fps : 0, grow: growing() });
    const object = await saveLook({ chain: list, edges: params.get('edges'), picture: shown });
    bar.announce(object ? `saved the look ${object.id} — ${object.title}` : 'no vault — downloaded instead');
  } catch (err) {
    console.error('[filter] the look did not save:', err);
    bar.announce('the look did not save: ' + err.message);
  } finally {
    busy = false;
    refreshVaultState();
    draw();
  }
}

// ── Drawing ──────────────────────────────────────────────────────────────────

let pending = false;
const painted = [];      // when the last paints were, while a loop plays

function draw() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

function paint() {
  if (!source) {
    canvas.width = 480;
    canvas.height = 300;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bar.output({ width: 0, height: 0 });
    bar.say('choose a source — V for the vault, the Source drawer, or drop an image'
      + (runner ? '' : ' · no GPU here'));
    return;
  }

  const list = chain.recipe();
  const { on, all } = chain.counts;
  // A filter just added is still compiling: keep what is on screen, and let
  // prepare() draw again when it is done, rather than flash it unfiltered.
  if (runner && on && !failing && !runner.ready(list)) return;

  const frame = source.frame(clock.tick);
  let picture = frame;
  let trouble = failing;
  if (runner && on && !failing) {
    try {
      picture = runner.run(frame, list, { time: source.fps ? clock.tick / source.fps : 0, grow: growing() });
    } catch (err) {
      trouble = err.message;
    }
  }

  // The picture's own size: the source's, or more where the chain grew it.
  if (canvas.width !== picture.width) canvas.width = picture.width;
  if (canvas.height !== picture.height) canvas.height = picture.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(picture, 0, 0);

  bar.output({ width: picture.width, height: picture.height });
  bar.say(`${source.title} · `
    + (!runner ? 'no GPU — unfiltered' : all ? `${on} of ${all} filters on` : 'no filters yet')
    + (trouble ? ' — ' + trouble : ''));
  rate();
}

/** Paints a second over the last second, while a loop plays: the honest reading of the GPU's pace. */
function rate() {
  if (!clock.playing) return;
  const now = performance.now();
  painted.push(now);
  while (painted.length && painted[0] < now - 1000) painted.shift();
  bar.rate(painted.length);
}

// ── Keys, drops, the vault ───────────────────────────────────────────────────

function wireKeys() {
  const vault = new VaultPanel();

  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (e.key === 's' || e.key === 'S') save();
    if (busy || !source || source.frames < 2) return;
    if (e.key === ' ') { e.preventDefault(); clock.toggle(); }
    if (e.key === 'ArrowRight') { clock.pause(); clock.step(1); }
    if (e.key === 'ArrowLeft')  { clock.pause(); clock.step(-1); }
  });

  // Dropping an image is the fastest way in, and it needs no vault.
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadFile(file);
  });

  refreshVaultState();
}

function refreshVaultState() {
  Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
}

boot().catch(err => {
  console.error('[filter] failed to boot:', err);
  if (bar) bar.announce('failed to boot: ' + err.message);
});
