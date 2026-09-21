/**
 * main.js — grid, assembled.
 *
 * The app's whole job is to keep three things in step: the parameters, the
 * assets they name, and one canvas. Everything else is inherited — the panel
 * draws itself from the schema, the picker and the lineage come with the
 * `source` param, and the vault write path is core's.
 *
 * The live preview and an export call the same `renderGrid()`, differing only
 * in the width handed to it. There is deliberately no second drawing path:
 * the moment a preview and an export are different code, they start
 * disagreeing about something small.
 */

import { gridParams }      from './params.js';
import { renderGrid }      from './grid.js';
import { rampUsage }       from './map.js';
import { ParamPanel }      from '../../core/ParamPanel.js';
import { VaultPanel }      from '../../core/VaultPanel.js';
import { Vault }           from '../../core/vault.js';
import { thumbFromCanvas } from '../../core/thumb.js';

const APP = { app: 'grid', version: '1.0.0' };

let params;
let manifest;
let tiles = [];                    // the loaded ramp, light to dark
let source = null;                 // decoded image being dithered
let sourceId = null;               // its vault id, or null when it came off disk
let last = null;                   // the most recent render, for saving
const rampCache = new Map();

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

// ── Boot ─────────────────────────────────────────────────────────────────────

async function boot() {
  manifest = await (await fetch('./material-manifest.json', { cache: 'no-store' })).json();
  params = gridParams(manifest);

  new ParamPanel(params, { title: 'grid' }).show();
  params.on(onParamChange);

  await loadRamp(params.get('ramp'));
  wireChrome();
  draw();
}

/** Only two params need anything fetched; the rest just redraw. */
async function onParamChange(key, value) {
  if (key === 'ramp')   await loadRamp(value);
  if (key === 'source') await loadSource(value);
  draw();
}

// ── Assets ───────────────────────────────────────────────────────────────────

async function loadRamp(id) {
  if (rampCache.has(id)) { tiles = rampCache.get(id); return; }

  const ramp = manifest.ramps.find(r => r.id === id);
  if (!ramp) { tiles = []; return; }

  // A ramp member that will not decode is skipped rather than fatal — a hole
  // costs the cells that would have used it, not the render.
  const loaded = await Promise.all(ramp.files.map(async file => {
    try {
      return await createImageBitmap(await (await fetch('./' + file)).blob());
    } catch {
      console.warn('[grid] ramp member failed to load:', file);
      return null;
    }
  }));

  tiles = loaded.filter(Boolean);
  rampCache.set(id, tiles);
}

async function loadSource(id) {
  if (!id) { source = null; sourceId = null; return; }
  try {
    const { url } = await Vault.load(id);
    source = await createImageBitmap(await (await fetch(url)).blob());
    sourceId = id;
  } catch (err) {
    console.warn('[grid] could not load', id, err);
    source = null;
    sourceId = null;
  }
}

/**
 * A file off disk, so the app is usable with no vault at all — rule 7. What it
 * cannot do is claim lineage: an image that is not an object has no id, so
 * anything saved from it is a leaf with a null recipe, exactly as the gamepad
 * does when a drawing sits on top of a loaded image.
 */
async function loadLocalFile(file) {
  if (!file) return;
  source = await createImageBitmap(file);
  sourceId = null;
  params.set('source', null);
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

  last = renderGrid({ recipe, source, tiles });

  canvas.width = last.canvas.width;
  canvas.height = last.canvas.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(last.canvas, 0, 0);

  const usage = rampUsage(last.indices, tiles.length);
  say(`${last.cols}×${last.rows} cells · ${last.drawn} drawn · `
    + `${usage.empty} empty · ${usage.used}/${tiles.length} of the ramp used`);
}

const say = text => { document.getElementById('readout').textContent = text; };

// ── Saving ───────────────────────────────────────────────────────────────────

async function save() {
  if (!last) return say('nothing to save yet');
  say('saving…');

  const blob = await toBlob(last.canvas);
  const thumb = await thumbFromCanvas(last.canvas);

  // Lineage is not assembled here on purpose. The `source` param records
  // itself, and consumedObjectIds() reads it back out — an app that builds
  // `parents` by hand is the bug the object model warns about.
  const parents = params.consumedObjectIds();

  const object = await Vault.save({
    type: 'still',
    title: titleFor(),
    tags: sourceId ? ['grid', params.get('ramp')] : ['grid', params.get('ramp'), 'leaf'],
    origin: APP,
    seed: null,                       // a luminance dither has no random in it
    recipe: sourceId ? params.values : null,
    parents,
    render: { blob, ext: 'png', w: last.canvas.width, h: last.canvas.height, density: 1 },
    thumb,
  });

  say(object ? `saved ${object.id}` : 'no vault — downloaded instead');
}

function titleFor() {
  return `${params.get('ramp')} ${last.cols}×${last.rows}`;
}

const toBlob = canvasLike => (canvasLike.convertToBlob
  ? canvasLike.convertToBlob({ type: 'image/png' })
  : new Promise(res => canvasLike.toBlob(res, 'image/png')));

// ── Chrome ───────────────────────────────────────────────────────────────────

function wireChrome() {
  const vault = new VaultPanel();

  document.getElementById('save').addEventListener('click', save);
  document.getElementById('file').addEventListener('change', e => loadLocalFile(e.target.files[0]));

  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (e.key === 's' || e.key === 'S') save();
  });

  // Dropping an image is the fastest way in, and it needs no vault.
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadLocalFile(file);
  });

  Vault.refresh().then(ok => {
    document.getElementById('vault-state').textContent = ok
      ? `${Vault.index.length} in vault` : 'no vault';
  });
}

boot().catch(err => {
  console.error('[grid] failed to boot:', err);
  say('failed to boot: ' + err.message);
});
