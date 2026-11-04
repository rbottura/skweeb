/**
 * main.js — the map editor, assembled. M8: a map on a grid, a room first.
 *
 * The map's panel on the left, the map between, the things on it on the
 * right (docs/roadmap.md, M8). Three tools over the map: *tiles* — a
 * tileset's members painted into its cells from the palette — *walls* —
 * cells marked as not walkable, a flag a cell beside the tiles — and
 * *things* — objects from the vault standing on cells, picked up and moved,
 * and what they do when used: a sign, a warp, the spawn. Loops
 * standing on the map play by its clock, each at its own speed
 * (core/playback.js). Drawn at the size the viewer shows (core/view.js);
 * the grid, what cannot be walked, the events and the chosen thing's box
 * are guides over it — one switch, Z since S5b — never in the picture; the walls show
 * whenever their tool is in hand.
 *
 * S saves the map (save.js) — `{ map, cells, walls, place }`, its picture drawn by
 * the code a replay draws with — and `?open=<id>` brings one back. Opens
 * with no vault (rule 7).
 *
 * A module since S9 (core/mount.js): `mount(host)` and `unmount()`, so a
 * scene can mount another in its place — the things' frames let go of when
 * it goes. index.html mounts it on itself. Nothing happens at import. Its
 * player, `play/`, stays a page of its own: a playable map is an export.
 */

import { mapParams, MAP_GROUPS } from './params.js';
import { mapSize, indexOf, resize } from './grid.js';
import { drawMap }      from './draw.js';
import { drawGrid, drawChosen, drawBlocked, drawEvents } from './guides.js';
import { walkGrid, walkable, spawnOf } from './walk.js';
import { Palette }      from './palette.js';
import { Editing }      from './editing.js';
import { wirePointer }  from './pointer.js';
import { saveMap, downloadPicture, recipeOf, APP } from './save.js';
import { PrintPanel } from '../../core/PrintPanel.js';
import { exportBox }      from '../../core/boxes/export.js';
import { stackDrawer } from '../../core/StackPanel.js';
import { requested }    from '../../core/reopen.js';
import { loadSprites }  from '../../core/sprites.js';
import { ParamPanel }   from '../../core/ParamPanel.js';
import { VaultPanel }   from '../../core/VaultPanel.js';
import { Playhead }     from '../../core/playback.js';
import { Bar }          from '../../core/Bar.js';
import { setAppPie, setOverlay } from '../../core/shell/bindings.js';
import { Vault }        from '../../core/vault.js';
import { viewFactor }   from '../../core/view.js';
import { appModule }    from '../../core/mount.js';

/** The map's panel on the left, the map between, the things on it on the right; the bar under all three is core's. No p5: Canvas 2D. */
const MARKUP = `
  <main class="app-main">
    <div class="app-side" id="map-side"></div>
    <section class="viewer" aria-label="map">
      <div class="viewer-head">
        <button class="nb-btn" id="tool-tiles" type="button" aria-pressed="true"
                title="A press paints the chosen tile [1]">tiles</button>
        <button class="nb-btn" id="tool-things" type="button" aria-pressed="false"
                title="A press picks up the thing under it, a drag moves it [2]">things</button>
        <button class="nb-btn" id="tool-walls" type="button" aria-pressed="false"
                title="A press marks a cell that cannot be walked, a drag a line of them; the right button clears [3]">walls</button>
        <button class="nb-btn" id="guides" type="button" aria-pressed="true"
                title="The grid, and the chosen thing's box — never in anything saved [Z]">guides</button>
      </div>
      <div class="viewer-stage"><canvas id="stage" width="480" height="300"></canvas></div>
    </section>
    <div class="app-side" id="things-side"></div>
  </main>`;

const app = appModule('map', { markup: MARKUP, style: new URL('./style.css', import.meta.url).href, start });

/** The map editor in `host`, started — a saved map opened if the page asks for it (core/mount.js). */
export const mount = host => app.mount(host);
/** The map editor out of its host, everything it held let go of: its keys, its things' frames, its clock. */
export const unmount = () => app.unmount();
const mounted = () => !!app.scope;

// One app mounted at a time: its state, made again by each mount (`start`).
let root, canvas, ctx, guidesBtn, toolBtns, clock, pending;
let map, bar, palette, editing;
let guidesOn, tool, cells, walls, shape, tiles, tilesTitle, asked, clockFps, busy, savedId, playBtn;

function start(at, mine) {
  root = at;
  canvas = root.querySelector('#stage');
  ctx = canvas.getContext('2d');
  guidesBtn = root.querySelector('#guides');
  toolBtns = { tiles: root.querySelector('#tool-tiles'), walls: root.querySelector('#tool-walls'),
               things: root.querySelector('#tool-things') };
  map = bar = palette = editing = null;
  guidesOn = remembered();   // the guides over the preview: the viewer's, not the map's
  tool = 'tiles';            // what a press on the map does: the editor's, never saved
  cells = [];                // a tile index a cell, row after row; -1 empty — the map's, beside its values
  walls = [];                // a flag a cell: 1 cannot be walked — beside the cells
  shape = { cols: 0, rows: 0 };   // the grid the cells were laid out for
  tiles = null;              // the tileset's images, or null: nothing to paint with
  tilesTitle = '';
  asked = 0;                 // the latest tileset asked for; an older answer is dropped
  clockFps = 0;              // the rate the clock was fitted to
  busy = false;              // a save or a download is drawing; nothing else starts
  savedId = null;            // the map last saved or opened: what Play opens
  playBtn = null;
  pending = false;           // a paint asked for, not yet made
  // The map's clock: its loops play, each at its own speed. Stopped at the unmount.
  clock = new Playhead({ onShow: () => draw() });
  mine.hold(() => clock.dispose());
  try {
    boot(mine);
  } catch (err) {
    if (bar) bar.announce('failed to boot: ' + err.message);
    throw err;
  }
}

function boot(mine) {
  bar = new Bar({ app: 'map', mount: root,
                  keys: '1 tiles · 2 things · 3 walls · A tool · Z guides · space play · Del remove · S save · V vault' });
  map = mapParams();
  const panel = new ParamPanel(map, { title: 'map', mount: root.querySelector('#map-side'), groups: MAP_GROUPS });
  palette = new Palette(panel.drawer('tiles').body, () => draw());
  buildExport(panel);
  editing = new Editing({ mount: root.querySelector('#things-side'), map: () => map.values,
                          onChange: () => { fitClock(); draw(); } });
  const things = editing.things;
  mine.hold(() => things.dispose());          // every thing's frames let go of
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
    paint: (list, value, kind) => {
      const m = map.values, into = kind === 'walls' ? walls : cells;
      for (const { col, row } of list) into[indexOf(m, col, row)] = value;
      draw();
    },
    things: { at: (x, y) => editing.at(x, y), choose: p => editing.choose(p), move: (p, col, row) => editing.move(p, col, row) },
  });
  const sized = new ResizeObserver(() => draw());
  sized.observe(canvas.parentElement);
  mine.hold(() => sized.disconnect());
  guidesBtn.addEventListener('click', () => showGuides(!guidesOn));
  for (const [name, b] of Object.entries(toolBtns)) b.addEventListener('click', () => useTool(name));
  showGuides(guidesOn);
  useTool('tiles');
  // The left hand (core/shell/bindings.js): A the tool, tapped the next; Z the guides — G is the ground's since S5b.
  const TOOLS = ['tiles', 'things', 'walls'];
  setAppPie({
    title: 'tool',
    items: () => TOOLS.map(t => ({ label: t, on: tool === t, run: () => useTool(t) })),
    tap: () => useTool(TOOLS[(TOOLS.indexOf(tool) + 1) % TOOLS.length]),
  });
  setOverlay({ label: 'guides', on: () => guidesOn, toggle: () => showGuides(!guidesOn) });
  wireKeys(mine);
  draw();
  openRequested();
}

/** `?open=<id>`: a saved map back to work on (core/reopen.js) — its values, its cells, its things. */
async function openRequested() {
  try {
    const opened = await requested('map');
    if (!opened || !mounted()) return;
    const { recipe } = opened.object;
    map.restore(recipe.map);
    shape = { cols: recipe.map.cols, rows: recipe.map.rows };
    cells = resize(recipe.cells || [], shape, shape);
    walls = resize(recipe.walls || [], shape, shape, 0);
    await editing.things.load(recipe.place || []);
    editing.choose(null);
    playable(opened.object.id);
    bar.announce(`opened ${opened.object.id} — ${opened.object.title}`);
  } catch (err) {
    bar.announce('could not open it: ' + err.message);
  }
}

/** The cells and the walls laid out again for the map's grid: each where it was, what is new empty. */
function fitCells() {
  const { cols, rows } = map.values;
  cells = resize(cells, shape, { cols, rows });
  walls = resize(walls, shape, { cols, rows }, 0);
  shape = { cols, rows };
}

/** The clock fitted to the map's longest loop at its rate; playing while anything moves. */
function fitClock() {
  if (!mounted() || !editing) return;            // a thing opening after its app went
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
    if (ask !== asked || !mounted()) return;
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
  const box = exportBox(panel, {
    vault: { save },
    disk: {
      picture: () => leave(async () => {
        const out = await downloadPicture({ map, cells, walls, place: editing.things.blocks(), tick: clock.tick });
        return `downloaded ${out.width} × ${out.height} px`;
      }),
    },
    acts: [{ id: 'play', label: 'Play the last save ↗', run: () => window.open(`./play/?map=${encodeURIComponent(savedId)}`, '_blank') }],
  });
  const exp = box.drawer;
  playBtn = box.buttons.play;
  playBtn.title = 'The player, in a tab of its own: what answers outlined, signs shown, warps followed';
  playable(null);
  // A print of the room, drawn again at the sheet's size a window at a time, fitted on it (core/PrintPanel.js).
  const printing = new PrintPanel({ mount: exp.body, app: 'map', leave, say: t => bar.say(t), tick: () => clock.tick,
    object: () => {
      const { width, height } = mapSize(map.values);
      return { type: 'still', origin: APP, recipe: recipeOf(map, cells, walls, editing.things.blocks()), render: { w: width, h: height } };
    } });
  // A window of the stack (core/live.js): what is on screen, as its print has it.
  stackDrawer(panel, { app: 'map', layer: () => printing.object(), clock, save: () => save() });
}

/** The map the player opens: the one last saved or opened, none before. */
function playable(id) {
  savedId = id;
  if (playBtn) playBtn.disabled = !id;
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
    refreshVault();
    draw();
  }
}

/** The map into the vault, its picture the frame on screen (save.js). */
function save() {
  return leave(async () => {
    bar.say('saving…');
    const object = await saveMap({ map, cells, walls, place: editing.things.blocks(), tick: clock.tick });
    if (!object) return 'no vault — downloaded instead';
    playable(object.id);
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

function draw() {
  if (pending || !mounted()) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

function paint() {
  if (!mounted() || !map || !editing) return;
  const m = map.values;
  const size = mapSize(m);
  const view = viewFactor(canvas, size, 1);
  const w = Math.max(1, Math.round(size.width * view)), h = Math.max(1, Math.round(size.height * view));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const dpp = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
  drawMap(ctx, m, view, { cells, tiles, layers: editing.things.layers(clock.tick, m) });
  const recipe = { map: m, walls, place: editing.things.blocks() };
  if (guidesOn) drawGrid(ctx, m, view, dpp);
  if (guidesOn || tool === 'walls') drawBlocked(ctx, m, view, dpp, recipe);
  if (guidesOn) {
    const spawn = spawnOf(recipe);
    drawEvents(ctx, m, view, dpp, recipe.place, spawn, walkable(recipe, spawn.col, spawn.row));
    const chosen = tool === 'things' && editing.chosenBox();
    if (chosen) drawChosen(ctx, chosen.box, chosen.cell, m.tile, view, dpp);
  }

  bar.output({ width: size.width, height: size.height, scale: 1 });
  const painted = cells.filter(t => t >= 0).length, n = editing.things.items.length;
  const blocked = walkGrid(recipe).filter(ok => !ok).length;
  bar.say(`${m.cols} × ${m.rows} tiles of ${m.tile} px · ${painted} painted`
    + (tiles ? ` from ${tilesTitle}` : ' · choose a tileset to paint with')
    + (blocked ? ` · ${blocked} not walkable` : '')
    + ` · ${n} thing${n === 1 ? '' : 's'}` + (clock.length > 1 ? `, frame ${clock.tick + 1} of ${clock.length}` : ''));
}

// ── Keys, the vault ──────────────────────────────────────────────────────────

function wireKeys(mine) {
  const vault = new VaultPanel();
  mine.listen(document, 'keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (e.key === 's' || e.key === 'S') save();
    if (e.key === '1') useTool('tiles');
    if (e.key === '2') useTool('things');
    if (e.key === '3') useTool('walls');
    if ((e.key === 'Delete' || e.key === 'Backspace') && tool === 'things') editing.remove();
    if (e.key === ' ' && clock.length > 1) { e.preventDefault(); clock.toggle(); }
  });
  refreshVault();
}

function refreshVault() {
  Vault.refresh().then(ok => { if (bar) bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'); });
}
