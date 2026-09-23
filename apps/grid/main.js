/**
 * main.js — grid, assembled.
 *
 * The app's whole job is to keep three things in step: the parameters, the
 * assets they name, and one canvas. Everything else is inherited — the panel
 * and its drawers draw themselves from the schema, the picker and the lineage
 * come with the `source` param, the bar and the player are core's, and the
 * vault write path is core's.
 *
 * The live preview and an export call the same `renderGrid()`, differing only
 * in which frame they hand it. There is deliberately no second drawing path:
 * the moment a preview and an export are different code, they start
 * disagreeing about something small.
 */

import { gridParams, GROUPS }      from './params.js';
import { renderGrid }              from './grid.js';
import { rampUsage }               from './map.js';
import { manifest, ramp }          from './materials.js';
import { fromFile, fromVault }     from './source.js';
import { saveStill, saveSequence } from './save.js';
import { ParamPanel }              from '../../core/ParamPanel.js';
import { VaultPanel }              from '../../core/VaultPanel.js';
import { Transport }               from '../../core/Transport.js';
import { Bar }                     from '../../core/Bar.js';
import { Playhead }                from '../../core/playback.js';
import { Vault }                   from '../../core/vault.js';
import { resolveFrame, applyFrameEdit } from '../../core/frame.js';
import { requested }               from '../../core/reopen.js';

let params, panel, bar, transport;
let tiles = [];                    // the loaded ramp, light to dark
let source = null;                 // a handle from source.js — still or sequence
let last = null;                   // the most recent render, for saving
let busy = false;                  // an export is running; nothing else may start

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const buttons = {};

/**
 * The clock. Grid dithers the frame under it and nothing else, so a scrub —
 * and a playback — is one render rather than a thousand. It plays at the
 * source loop's own rate and drops ticks when a dither costs more than its
 * share of time, which is the honest reading of what the loop is.
 */
const clock = new Playhead({
  onShow: tick => { if (transport) transport.show(tick); draw(); },
  onState: () => { if (transport) transport.state(); },
});

// ── Boot ─────────────────────────────────────────────────────────────────────

async function boot() {
  params = gridParams(await manifest());
  bar = new Bar({
    app: 'grid',
    mount: document.querySelector('.app'),
    keys: 'V vault · S save · space play · drop an image',
  });

  panel = new ParamPanel(params, { title: 'grid', mount: document.getElementById('side'), groups: GROUPS });
  params.on(onParamChange);
  buildDrawers();

  tiles = await ramp(params.get('ramp'));
  wireKeys();
  draw();
  await openRequested();
}

/**
 * `?open=<id>`: one of grid's own dithers, back to work on (core/reopen.js).
 * Its recipe names its source, so restoring it loads that and dithers again.
 */
async function openRequested() {
  try {
    const opened = await requested('grid');
    if (!opened) return;
    params.restore(opened.object.recipe);
    bar.announce(`opened ${opened.object.id} — ${opened.object.title}`);
  } catch (err) {
    bar.announce('could not open it: ' + err.message);
  }
}

/**
 * The drawers that are not parameters: a file off disk under Source, the
 * player for a loop, and the saves.
 */
function buildDrawers() {
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'image/*';
  file.hidden = true;
  file.addEventListener('change', () => loadLocalFile(file.files[0]));
  const open = button('Open a file', () => file.click());
  panel.drawer('source').body.append(open, file);

  const player = panel.addDrawer({ id: 'player', title: 'Sequence player', before: 'material' });
  transport = new Transport({ clock, mount: player.body, busy: () => busy });

  const exp = panel.addDrawer({ id: 'export', title: 'Export' });
  const actions = document.createElement('div');
  actions.className = 'pp-actions';
  buttons.save = button('Save to the vault  [S]', () => save(), true);
  buttons.frames = button('Save + download the frames', () => save({ keepFrames: true }));
  actions.append(buttons.save, buttons.frames);
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

/**
 * Only two params need anything fetched; the rest just redraw.
 *
 * `applyFrameEdit` is the chain — picking a format writes width and height,
 * and with the link on, typing either side drags the other. It ignores its
 * own echoes and leaves a restore alone, so calling it for every key is safe;
 * it is also needed, since the chain remembers the box it last saw.
 */
async function onParamChange(key, value) {
  if (key === 'ramp')   tiles = await ramp(value);
  if (key === 'source') await loadSource(value);

  applyFrameEdit(params, key, source && source.content);
  draw();
}

// ── Assets ───────────────────────────────────────────────────────────────────

/** Replace whatever is being dithered, disposing what was there. */
function setSource(next) {
  if (source) source.dispose();
  source = next;
  clock.configure({
    length: next ? next.frames : 0,
    fps: next ? next.fps : 0,
    loop: next ? next.loop : true,
  });
  showLoopControls();
}

/** A vault object. Where a sequence is rebuilt from its recipe — the slow part of choosing one. */
async function loadSource(id) {
  if (!id) { setSource(null); return; }
  bar.say('opening…');
  try {
    setSource(await fromVault(id));
    if (source.missing.length) {
      console.warn('[grid] sprite families missing from the rebuild:', source.missing);
    }
  } catch (err) {
    console.warn('[grid] could not load', id, err);
    setSource(null);
    bar.announce('could not open that object: ' + err.message);
  }
}

/**
 * A file off disk, so the app is usable with no vault at all — rule 7. An
 * image that is not an object has no id, so anything saved from it is a leaf.
 * The param is cleared first: clearing it after would dispose this file.
 */
async function loadLocalFile(file) {
  if (!file || busy) return;
  params.set('source', null);
  setSource(await fromFile(file));
  draw();
}

// ── Drawing ──────────────────────────────────────────────────────────────────

let pending = false;

function draw() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

function paint() {
  const recipe = params.values;

  if (!source || !tiles.length) {
    canvas.width = 480;
    canvas.height = 300;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    last = null;
    bar.output({ width: 0, height: 0 });
    bar.say(source ? 'no material ramp loaded' : 'choose a source — V for the vault, or open a file');
    return;
  }

  const frame = resolveFrame(recipe, source.content, source);
  last = renderGrid({ recipe, source: source.frame(clock.tick), tiles, frame });

  if (canvas.width !== last.canvas.width) canvas.width = last.canvas.width;
  if (canvas.height !== last.canvas.height) canvas.height = last.canvas.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(last.canvas, 0, 0);

  const usage = rampUsage(last.indices, tiles.length);
  bar.output({ width: canvas.width, height: canvas.height, scale: last.scale, format: recipe.format });
  bar.say(`${last.cols}×${last.rows} cells · ${last.drawn} drawn · ${usage.empty} empty · `
    + `${usage.used}/${tiles.length} of the ramp used`);
}

/** The player and the frames export exist only when there is a loop. */
function showLoopControls() {
  const many = !!source && source.frames > 1;
  panel.drawer('player').hidden = !many;
  if (buttons.frames) buttons.frames.hidden = !many;
  if (transport) transport.configure();
}

// ── Saving ───────────────────────────────────────────────────────────────────

/**
 * One button, two shapes: a sequence source makes a sequence and a still makes
 * a still, because anything else is the app silently throwing away most of
 * what it was handed.
 */
async function save({ keepFrames = false } = {}) {
  if (busy) return;
  if (!source || !last) return bar.announce('nothing to save yet');

  clock.pause();
  busy = true;
  try {
    if (source.kind === 'sequence') {
      const { object, frames, still, drawn } = await saveSequence({
        params, source, tiles, keepFrames, onStatus: t => bar.say(t),
      });
      bar.announce(object
        ? `saved ${object.id} — ${frames} frames, still is frame ${still + 1} at ${drawn} cells`
        : `no vault — ${frames} frames dithered, downloaded instead`);
    } else {
      bar.say('saving…');
      const object = await saveStill({ params, render: last, sourceId: source.id });
      bar.announce(object ? `saved ${object.id}` : 'no vault — downloaded instead');
    }
  } catch (err) {
    console.error('[grid] save failed:', err);
    bar.announce('save failed: ' + err.message);
  } finally {
    busy = false;
    refreshVaultState();
  }
}

// ── Keys and drops ───────────────────────────────────────────────────────────

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
    if (file && file.type.startsWith('image/')) loadLocalFile(file);
  });

  refreshVaultState();
}

function refreshVaultState() {
  Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
}

boot().catch(err => {
  console.error('[grid] failed to boot:', err);
  if (bar) bar.announce('failed to boot: ' + err.message);
});
