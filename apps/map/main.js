/**
 * main.js — the map editor, assembled. M8: a map on a grid, a room first.
 *
 * The map's panel on the left, the map between, the things on it on the
 * right (docs/roadmap.md, M8). Two tools over the map: *tiles* — a
 * tileset's members painted into its cells from the palette — and *things*
 * — objects from the vault standing on cells, picked up and moved. Loops
 * standing on the map play by its clock, each at its own speed
 * (core/playback.js). Drawn at the size the viewer shows (core/view.js);
 * the grid and the chosen thing's box are guides over it — one switch, G —
 * never saved.
 *
 * S saves the map (save.js) — `{ map, cells, place }`, its picture drawn by
 * the code a replay draws with — and `?open=<id>` brings one back. Opens
 * with no vault (rule 7).
 */

import { mapParams, MAP_GROUPS } from './params.js';
import { mapSize, indexOf, resize } from './grid.js';
import { drawMap }      from './draw.js';
import { drawGrid, drawChosen } from './guides.js';
import { Palette }      from './palette.js';
import { Editing }      from './editing.js';
import { wirePointer }  from './pointer.js';
import { saveMap, downloadPicture } from './save.js';
import { requested }    from '../../core/reopen.js';
import { loadSprites }  from '../../core/sprites.js';
import { ParamPanel }   from '../../core/ParamPanel.js';
import { VaultPanel }   from '../../core/VaultPanel.js';
import { Playhead }     from '../../core/playback.js';
import { Bar }          from '../../core/Bar.js';
import { Vault }        from '../../core/vault.js';
import { viewFactor }   from '../../core/view.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const guidesBtn = document.getElementById('guides');
const toolBtns = { tiles: document.getElementById('tool-tiles'), things: document.getElementById('tool-things') };

let map, bar, palette, editing;
let guidesOn = remembered();   // the guides over the preview: the viewer's, not the map's
let tool = 'tiles';            // what a press on the map does: the editor's, never saved
let cells = [];                // a tile index a cell, row after row; -1 empty — the map's, beside its values
let shape = { cols: 0, rows: 0 };   // the grid the cells were laid out for
let tiles = null;              // the tileset's images, or null: nothing to paint with
let tilesTitle = '';
let asked = 0;                 // the latest tileset asked for; an older answer is dropped
let clockFps = 0;              // the rate the clock was fitted to
let busy = false;              // a save or a download is drawing; nothing else starts

/** The map's clock: its loops play, each at its own speed. */
const clock = new Playhead({ onShow: () => draw() });

function boot() {
  bar = new Bar({ app: 'map', mount: document.querySelector('.app'),
                  keys: '1 tiles · 2 things · G guides · space play · Del remove · S save · V vault' });
  map = mapParams();
  const panel = new ParamPanel(map, { title: 'map', mount: document.getElementById('map-side'), groups: MAP_GROUPS });
  palette = new Palette(panel.drawer('tiles').body, () => draw());
  buildExport(panel);
  editing = new Editing({ mount: document.getElementById('things-side'), map: () => map.values,
                          onChange: () => { fitClock(); draw(); } });
  fitCells();
  map.on(key => {
    if (key === 'cols' || key === 'rows') fitCells();
    if (key === 'tileset') chooseTileset(map.get('tileset'));
    if (key === 'fps') fitClock();
    draw();
  });
  wirePointer({
    canvas,
    map: () => map.values,
    tool: () => tool,
    chosen: () => palette.chosen,
    paint: (list, tile) => {
      const m = map.values;
      for (const { col, row } of list) cells[indexOf(m, col, row)] = tile;
      draw();
    },
    things: { at: (x, y) => editing.at(x, y), choose: p => editing.choose(p), move: (p, col, row) => editing.move(p, col, row) },
  });
  new ResizeObserver(() => draw()).observe(canvas.parentElement);
  guidesBtn.addEventListener('click', () => showGuides(!guidesOn));
  for (const [name, b] of Object.entries(toolBtns)) b.addEventListener('click', () => useTool(name));
  showGuides(guidesOn);
  useTool('tiles');
  wireKeys();
  draw();
  openRequested();
}

/** `?open=<id>`: a saved map back to work on (core/reopen.js) — its values, its cells, its things. */
async function openRequested() {
  try {
    const opened = await requested('map');
    if (!opened) return;
    const { recipe } = opened.object;
    map.restore(recipe.map);
    shape = { cols: recipe.map.cols, rows: recipe.map.rows };
    cells = resize(recipe.cells || [], shape, shape);
    await editing.things.load(recipe.place || []);
    editing.choose(null);
    bar.announce(`opened ${opened.object.id} — ${opened.object.title}`);
  } catch (err) {
    bar.announce('could not open it: ' + err.message);
  }
}

/** The cells laid out again for the map's grid: each where it was, what is new empty. */
function fitCells() {
  const { cols, rows } = map.values;
  cells = resize(cells, shape, { cols, rows });
  shape = { cols, rows };
}

/** The clock fitted to the map's longest loop at its rate; playing while anything moves. */
function fitClock() {
  const fps = map.values.fps, length = editing.things.length(fps);
  if (length !== clock.length || fps !== clockFps) {
    clock.configure({ length, fps, loop: true });
    clockFps = fps;
    if (length > 1) clock.play();
  }
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

// ── Leaving: the vault, a picture ────────────────────────────────────────────

function buildExport(panel) {
  const exp = panel.addDrawer({ id: 'export', title: 'Export' });
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
  button('Save to the vault  [S]', save, true);
  button('Download the picture (PNG)', () => leave(async () => {
    const out = await downloadPicture({ map, cells, place: editing.things.blocks(), tick: clock.tick });
    return `downloaded ${out.width} × ${out.height} px`;
  }));
  exp.body.append(actions);
}

/** One way out: the clock held still, nothing else started, what happened said. */
async function leave(action) {
  if (busy) return;
  busy = true;
  clock.pause();
  try {
    bar.announce(await action());
  } catch (err) {
    console.error('[map] failed:', err);
    bar.announce('failed: ' + err.message);
  } finally {
    busy = false;
    Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
    draw();
  }
}

/** The map into the vault, its picture the frame on screen (save.js). */
function save() {
  return leave(async () => {
    bar.say('saving…');
    const object = await saveMap({ map, cells, place: editing.things.blocks(), tick: clock.tick });
    if (!object) return 'no vault — downloaded instead';
    return `saved ${object.id} — ${object.title}` + (object.render.frames ? `, ${object.render.frames} frames at ${object.render.fps} fps` : '');
  });
}

// ── The viewer's switches: the tool, the guides ──────────────────────────────

function useTool(name) {
  tool = name;
  for (const [n, b] of Object.entries(toolBtns)) b.setAttribute('aria-pressed', String(n === name));
  canvas.classList.toggle('things', name === 'things');
  draw();
}

/**
 * The grid and the chosen thing's box, on or off together — how the viewer
 * looks, not what the map is: not a param, remembered in this browser.
 */
function showGuides(on) {
  guidesOn = on;
  guidesBtn.setAttribute('aria-pressed', String(on));
  try { localStorage.setItem('skweeb.map.guides', on ? '1' : '0'); } catch { /* private mode: forgotten */ }
  draw();
}

function remembered() {
  try { return localStorage.getItem('skweeb.map.guides') !== '0'; } catch { return true; }
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
  const dpp = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
  drawMap(ctx, m, view, { cells, tiles, layers: editing.things.layers(clock.tick, m) });
  if (guidesOn) {
    drawGrid(ctx, m, view, dpp);
    const chosen = tool === 'things' && editing.chosenBox();
    if (chosen) drawChosen(ctx, chosen.box, chosen.cell, m.tile, view, dpp);
  }

  bar.output({ width: size.width, height: size.height, scale: 1 });
  const painted = cells.filter(t => t >= 0).length, n = editing.things.items.length;
  bar.say(`${m.cols} × ${m.rows} tiles of ${m.tile} px · ${painted} painted`
    + (tiles ? ` from ${tilesTitle}` : ' · choose a tileset to paint with')
    + ` · ${n} thing${n === 1 ? '' : 's'}` + (clock.length > 1 ? `, frame ${clock.tick + 1} of ${clock.length}` : ''));
}

// ── Keys, the vault ──────────────────────────────────────────────────────────

function wireKeys() {
  const vault = new VaultPanel();
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (e.key === 'g' || e.key === 'G') showGuides(!guidesOn);
    if (e.key === 's' || e.key === 'S') save();
    if (e.key === '1') useTool('tiles');
    if (e.key === '2') useTool('things');
    if ((e.key === 'Delete' || e.key === 'Backspace') && tool === 'things') editing.remove();
    if (e.key === ' ' && clock.length > 1) { e.preventDefault(); clock.toggle(); }
  });
  Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
}

try {
  boot();
} catch (err) {
  console.error('[map] failed to boot:', err);
  if (bar) bar.announce('failed to boot: ' + err.message);
}
