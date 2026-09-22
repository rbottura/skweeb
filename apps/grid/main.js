/**
 * main.js — grid, assembled.
 *
 * The app's whole job is to keep three things in step: the parameters, the
 * assets they name, and one canvas. Everything else is inherited — the panel
 * draws itself from the schema, the picker and the lineage come with the
 * `source` param, the handle in source.js hides what kind of thing is being
 * dithered, and the vault write path is core's.
 *
 * The live preview and an export call the same `renderGrid()`, differing only
 * in which frame they hand it. There is deliberately no second drawing path:
 * the moment a preview and an export are different code, they start
 * disagreeing about something small.
 */

import { gridParams }              from './params.js';
import { renderGrid }              from './grid.js';
import { rampUsage }               from './map.js';
import { manifest, ramp }          from './materials.js';
import { fromFile, fromVault }     from './source.js';
import { saveStill, saveSequence } from './save.js';
import { ParamPanel }              from '../../core/ParamPanel.js';
import { VaultPanel }              from '../../core/VaultPanel.js';
import { Playhead }                from '../../core/playback.js';
import { Vault }                   from '../../core/vault.js';
import { resolveFrame, applyFrameEdit } from '../../core/frame.js';
import { dpiOf }                   from '../../core/formats.js';

let params;
let tiles = [];                    // the loaded ramp, light to dark
let source = null;                 // a handle from source.js — still or sequence
let last = null;                   // the most recent render, for saving
let busy = false;                  // an export is running; nothing else may start

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const scrub = document.getElementById('playhead');
const playBtn = document.getElementById('play');

/**
 * The transport. Grid dithers the frame under it and nothing else, which is
 * what keeps a scrub — and now a playback — one render rather than a thousand.
 *
 * It plays at the source loop's own rate, and when a dither costs more than
 * its share of time it drops ticks instead of slowing down. So a big field
 * plays coarsely rather than in slow motion, which is the honest reading of
 * what the loop is.
 */
const clock = new Playhead({
  onShow: () => draw(),
  onState: () => { playBtn.textContent = clock.playing ? '❙❙' : '▶'; },
});

// ── Boot ─────────────────────────────────────────────────────────────────────

async function boot() {
  params = gridParams(await manifest());

  new ParamPanel(params, { title: 'grid' }).show();
  params.on(onParamChange);

  tiles = await ramp(params.get('ramp'));
  wireChrome();
  draw();
}

/**
 * Only two params need anything fetched; the rest just redraw.
 *
 * `applyFrameEdit` is the chain — picking a format writes width and height,
 * typing a width switches to custom and drags the height along. It writes
 * through params, so it comes back round to here; the guard is that it only
 * ever changes keys other than the one it was called for.
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
  showTransport();
}

/**
 * A vault object. This is where a sequence is rebuilt from its recipe — the
 * slow part of choosing one, and the only place it happens.
 */
async function loadSource(id) {
  if (!id) { setSource(null); return; }
  say('opening…');
  try {
    setSource(await fromVault(id));
    if (source.missing.length) {
      console.warn('[grid] sprite families missing from the rebuild:', source.missing);
    }
  } catch (err) {
    console.warn('[grid] could not load', id, err);
    setSource(null);
    say('could not open that object: ' + err.message);
  }
}

/**
 * A file off disk, so the app is usable with no vault at all — rule 7. What it
 * cannot do is claim lineage: an image that is not an object has no id, so
 * anything saved from it is a leaf with a null recipe, exactly as the gamepad
 * does when a drawing sits on top of a loaded image.
 */
async function loadLocalFile(file) {
  if (!file || busy) return;

  // Clearing the param first, not after. Setting it to null announces a change
  // when something was picked, which runs loadSource(null) — so doing it
  // second disposes the handle made one line earlier and leaves a blank
  // canvas. Only visible when you drop a file *after* choosing a vault object,
  // which is why it survived: on a fresh page the param is already null and
  // setting it announces nothing.
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
    ctx.fillStyle = recipe.background || '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    last = null;
    say(source ? 'no material ramp loaded' : 'choose a source — V for the vault, or open a file');
    return;
  }

  const frame = resolveFrame(recipe, source.content, source);
  last = renderGrid({ recipe, source: source.frame(clock.tick), tiles, frame });

  canvas.width = last.canvas.width;
  canvas.height = last.canvas.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(last.canvas, 0, 0);
  scrub.value = clock.tick;

  const usage = rampUsage(last.indices, tiles.length);
  const at = source.frames > 1 ? `frame ${clock.tick + 1}/${source.frames} · ` : '';
  say(`${at}${last.cols}×${last.rows} cells · ${last.drawn} drawn · `
    + `${usage.empty} empty · ${usage.used}/${tiles.length} of the ramp used · `
    + `${canvas.width}×${canvas.height} at ${last.scale}×${printNote(recipe, last)}`);
}

/**
 * What resolution the current output would print at, when a paper format is
 * chosen. The arithmetic is trivial and doing it in your head while deciding a
 * scale is not, so it says the number rather than leaving it implied.
 */
function printNote(recipe, render) {
  const dpi = dpiOf(recipe.format, render.canvas.width, render.canvas.height);
  if (!dpi) return '';
  const n = Math.round(dpi.min);
  const verdict = n >= 300 ? 'print' : n >= 150 ? 'large format' : 'screen only';
  return ` · ${n} dpi on ${recipe.format.toUpperCase()}, ${verdict}`;
}

const say = text => { document.getElementById('readout').textContent = text; };

/** The transport exists only when there is a loop to run. */
function showTransport() {
  const many = !!source && source.frames > 1;
  for (const id of ['play', 'playhead', 'frames']) {
    document.getElementById(id).hidden = !many;
  }
  if (!many) return;
  scrub.max = source.frames - 1;
  scrub.value = 0;
}

// ── Saving ───────────────────────────────────────────────────────────────────

/**
 * One button, two shapes. Which one is not a mode anybody picks: a sequence
 * source makes a sequence and a still makes a still, because anything else is
 * the app silently throwing away most of what it was handed.
 */
async function save({ keepFrames = false } = {}) {
  if (busy) return;
  if (!source || !last) return say('nothing to save yet');

  clock.pause();
  busy = true;
  try {
    if (source.kind === 'sequence') {
      const { object, frames, still, drawn } = await saveSequence({
        params, source, tiles, keepFrames, onStatus: say,
      });
      say(object
        ? `saved ${object.id} — ${frames} frames, still is frame ${still + 1} at ${drawn} cells`
        : `no vault — ${frames} frames dithered, downloaded instead`);
    } else {
      say('saving…');
      const object = await saveStill({ params, render: last, sourceId: source.id });
      say(object ? `saved ${object.id}` : 'no vault — downloaded instead');
    }
  } catch (err) {
    console.error('[grid] save failed:', err);
    say('save failed: ' + err.message);
  } finally {
    busy = false;
    refreshVaultState();
  }
}

// ── Chrome ───────────────────────────────────────────────────────────────────

function wireChrome() {
  const vault = new VaultPanel();

  document.getElementById('save').addEventListener('click', () => save());
  document.getElementById('frames').addEventListener('click', () => save({ keepFrames: true }));
  document.getElementById('file').addEventListener('change', e => loadLocalFile(e.target.files[0]));
  playBtn.addEventListener('click', () => { if (!busy) clock.toggle(); });

  // Scrubbing mid-export is not corrupting — source.frame() is read
  // synchronously by the dither before the loop yields — but it is wasted work
  // and it makes the readout lie about which frame you are looking at.
  scrub.addEventListener('input', () => {
    if (busy) { scrub.value = clock.tick; return; }
    clock.pause();
    clock.show(Number(scrub.value));
  });

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
  Vault.refresh().then(ok => {
    document.getElementById('vault-state').textContent = ok
      ? `${Vault.index.length} in vault` : 'no vault';
  });
}

boot().catch(err => {
  console.error('[grid] failed to boot:', err);
  say('failed to boot: ' + err.message);
});
