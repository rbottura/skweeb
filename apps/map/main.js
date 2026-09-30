/**
 * main.js — the map editor, assembled. M8: a map on a grid, a room first.
 *
 * The map's panel on the left, the map between (docs/roadmap.md, M8). A
 * tileset's members are painted into its cells — a press, a drag — from
 * the palette in the Tiles drawer; things placed on it and a save come
 * brick by brick (STATUS.md). Drawn at the size the viewer shows
 * (core/view.js); the grid is a guide over it — G, or its switch — and
 * never in anything saved.
 *
 * Opens with no vault (rule 7).
 */

import { mapParams, MAP_GROUPS } from './params.js';
import { mapSize, indexOf, resize } from './grid.js';
import { drawMap }    from './draw.js';
import { drawGrid }   from './guides.js';
import { Palette }    from './palette.js';
import { wirePainting } from './pointer.js';
import { loadSprites } from '../../core/sprites.js';
import { ParamPanel } from '../../core/ParamPanel.js';
import { VaultPanel } from '../../core/VaultPanel.js';
import { Bar }        from '../../core/Bar.js';
import { Vault }      from '../../core/vault.js';
import { viewFactor } from '../../core/view.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const gridBtn = document.getElementById('grid');

let map, bar, palette;
let gridOn = remembered();     // the grid over the preview: the viewer's, not the map's
let cells = [];                // a tile index a cell, row after row; -1 empty — the map's, beside its values
let shape = { cols: 0, rows: 0 };   // the grid the cells were laid out for
let tiles = null;              // the tileset's images, or null: nothing to paint with
let tilesTitle = '';
let asked = 0;                 // the latest tileset asked for; an older answer is dropped

function boot() {
  bar = new Bar({ app: 'map', mount: document.querySelector('.app'), keys: 'G grid · V vault' });
  map = mapParams();
  const panel = new ParamPanel(map, { title: 'map', mount: document.getElementById('map-side'), groups: MAP_GROUPS });
  palette = new Palette(panel.drawer('tiles').body, () => draw());
  fitCells();
  map.on(key => {
    if (key === 'cols' || key === 'rows') fitCells();
    if (key === 'tileset') chooseTileset(map.get('tileset'));
    draw();
  });
  wirePainting({
    canvas,
    map: () => map.values,
    chosen: () => palette.chosen,
    paint: (list, tile) => {
      const m = map.values;
      for (const { col, row } of list) cells[indexOf(m, col, row)] = tile;
      draw();
    },
  });
  new ResizeObserver(() => draw()).observe(canvas.parentElement);
  gridBtn.addEventListener('click', () => showGrid(!gridOn));
  showGrid(gridOn);
  wireKeys();
  draw();
}

/** The cells laid out again for the map's grid: each where it was, what is new empty. */
function fitCells() {
  const { cols, rows } = map.values;
  cells = resize(cells, shape, { cols, rows });
  shape = { cols, rows };
}

/** A tileset's members as the tiles (core/sprites.js): nothing to paint with until they are in. */
async function chooseTileset(id) {
  const ask = ++asked;
  tiles = null;
  tilesTitle = '';
  palette.show(null);
  if (!id) return draw();
  try {
    const set = await loadSprites(id);
    if (ask !== asked) return;
    tiles = set.images.length ? set.images : null;
    tilesTitle = set.title;
    palette.show(tiles, set.title);
    bar.announce(`${set.title}: ${set.images.length} tile${set.images.length === 1 ? '' : 's'}`
      + (set.missing ? ` — ${set.missing} would not load` : ''));
  } catch (err) {
    if (ask === asked) bar.announce(`could not open the tileset: ${err.message}`);
  }
  draw();
}

// ── The grid's switch ────────────────────────────────────────────────────────

/** How the viewer looks, not what the map is: not a param, remembered in this browser. */
function showGrid(on) {
  gridOn = on;
  gridBtn.setAttribute('aria-pressed', String(on));
  try { localStorage.setItem('skweeb.map.grid', on ? '1' : '0'); } catch { /* private mode: forgotten */ }
  draw();
}

function remembered() {
  try { return localStorage.getItem('skweeb.map.grid') !== '0'; } catch { return true; }
}

// ── Drawing ──────────────────────────────────────────────────────────────────

let pending = false;

function draw() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

function paint() {
  const m = map.values;
  const size = mapSize(m);
  const view = viewFactor(canvas, size, 1);
  const w = Math.max(1, Math.round(size.width * view)), h = Math.max(1, Math.round(size.height * view));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  drawMap(ctx, m, view, { cells, tiles });
  if (gridOn) drawGrid(ctx, m, view, canvas.width / Math.max(1, canvas.getBoundingClientRect().width));
  bar.output({ width: size.width, height: size.height, scale: 1 });
  const painted = cells.filter(t => t >= 0).length;
  bar.say(`${m.cols} × ${m.rows} tiles of ${m.tile} px · ${painted} painted`
    + (tiles ? ` from ${tilesTitle}` : ' · choose a tileset to paint with'));
}

// ── Keys, the vault ──────────────────────────────────────────────────────────

function wireKeys() {
  const vault = new VaultPanel();
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (e.key === 'g' || e.key === 'G') showGrid(!gridOn);
  });
  Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
}

try {
  boot();
} catch (err) {
  console.error('[map] failed to boot:', err);
  if (bar) bar.announce('failed to boot: ' + err.message);
}
