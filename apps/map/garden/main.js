/**
 * main.js — the garden (M14): a map you garden in, the map editor's own as
 * the puppet is the rig's. The author's brief is
 * docs/iterations-modifications.md.
 *
 * The gardener walks it as the player's avatar walks a map (../steering.js,
 * ../play/avatar.js) — ZQSD or WASD by where the keys are, the arrows, a
 * pad, a click walking there. Facing a flower — a drawing that keeps its
 * marks (flower.js) — E plants its next generation on the nearest bare earth
 * round it: its marks through the treatment in hand (treatment.js, a chain of
 * modifiers.js's), saved in the vault as a still with its source its parent.
 * Facing bare earth, E plants the flower in hand, from a set offered to the
 * garden; Delete uproots the flower faced, which stays in the vault. Every
 * flower grows from its marks (beds.js) as it is planted, and when the
 * garden opens.
 *
 * The garden is a `map`: saved as one (../save.js), the next state of its
 * smart object (S6b) — by the title bar's Save or Ctrl S, since S walks here
 * — opened from one by `?open=<id>`, played by the player, placed in compose.
 * A module (core/mount.js), so cluster mounts it; index.html mounts it on
 * itself. Nothing happens at import; with no vault it says so (rule 7).
 */

import { mapParams, MAP_GROUPS } from '../params.js';
import { mapSize, resize } from '../grid.js';
import { Things, newBlock, drawOrder } from '../things.js';
import { walkable, spawnOf, ahead, pathTo } from '../walk.js';
import { saveMap }  from '../save.js';
import { Steering, stride } from '../steering.js';
import { Avatar }   from '../play/avatar.js';
import { gardenParams, GARDEN_GROUPS } from './params.js';
import { Sprites, nextOf, saveGeneration } from './flower.js';
import { Beds }      from './beds.js';
import { Treatment } from './treatment.js';
import { blockOn, bareNear, inside } from './plot.js';
import { paintGarden }  from './draw.js';
import { wireControls } from './controls.js';
import { Hand }         from './hand.js';
import { requested, openedLine } from '../../../core/reopen.js';
import { defineParams } from '../../../core/params.js';
import { loadSprites }  from '../../../core/sprites.js';
import { ParamPanel }   from '../../../core/ParamPanel.js';
import { VaultPanel }   from '../../../core/VaultPanel.js';
import { exportBox }    from '../../../core/boxes/export.js';
import { Playhead }     from '../../../core/playback.js';
import { Bar }          from '../../../core/Bar.js';
import { Vault }        from '../../../core/vault.js';
import { own }          from '../../../core/keys.js';
import { appModule }    from '../../../core/mount.js';

/** The garden's panel and the map's on the left, the garden between, the treatment on the right. */
const MARKUP = `
  <main class="app-main">
    <div class="app-side" id="gd-side"></div>
    <section class="viewer" aria-label="the garden">
      <div class="viewer-stage"><canvas id="gd-stage" width="480" height="300"
        aria-label="the garden — ZQSD, WASD or the arrows walk, E plants, Delete uproots, a click walks there"></canvas></div>
    </section>
    <div class="app-side" id="gd-treat"></div>
  </main>`;

const app = appModule('garden', { markup: MARKUP, style: new URL('./style.css', import.meta.url).href, start, keep });

/** The garden in `host`, started — a saved one opened if the page asks for it (core/mount.js). */
export const mount = (host, given) => app.mount(host, given);
/** The garden out of its host: its keys, its loop, its things' frames, its clock let go of. */
export const unmount = () => app.unmount();
const mounted = () => !!app.scope;

// One garden mounted at a time: its state, made again by each mount (`start`).
let root, canvas, bar, map, garden, things, beds, sprites, treatment, avatar, steer, clock;
let cells, walls, shape, tiles, asked, savedId, busy, dirty, changed, hand;

async function start(at, mine) {
  root = at;
  canvas = root.querySelector('#gd-stage');
  [cells, walls, shape, tiles] = [[], [], { cols: 0, rows: 0 }, null];   // the map's, as its editor keeps them: none painted here
  asked = 0;                 // the latest tileset asked for
  savedId = null;            // the garden last saved or opened
  busy = false;              // a planting or a save under way: nothing else starts
  dirty = true;              // to be drawn again
  changed = false;           // planted or uprooted since the last save
  hand = new Hand();         // the set the garden plants from, its members
  clock = new Playhead({ onShow: () => { dirty = true; } });
  mine.hold(() => clock.dispose());
  sprites = new Sprites();
  avatar = new Avatar();
  mine.hold(() => avatar.dispose());
  steer = new Steering();
  beds = new Beds({ sprites, onChange: () => { dirty = true; look(); } });
  mine.hold(() => beds.dispose());
  things = new Things({ onChange: () => { fitClock(); dirty = true; } });
  mine.hold(() => things.dispose());

  bar = new Bar({ app: 'garden', mount: root,
                  keys: 'ZQSD walk · E plant · Del uproot · 1–9 the flower in hand · R a new seed · Ctrl S save · V vault' });
  map = mapParams();
  garden = gardenParams();
  const side = root.querySelector('#gd-side');
  const panel = new ParamPanel(garden, { title: 'garden', mount: side, groups: GARDEN_GROUPS });
  new ParamPanel(map, { title: 'map', mount: side, groups: MAP_GROUPS });
  buildExport(panel);
  const right = new ParamPanel(defineParams('garden-treatment', {}), { title: 'treatment', mount: root.querySelector('#gd-treat') });
  const faced = right.addDrawer({ id: 'faced', title: 'The flower faced' });
  const chain = right.addDrawer({ id: 'chain', title: 'Treatment' });
  treatment = new Treatment({ cards: chain.body, preview: faced.body, sprites, onChange: () => look() });

  map.on(key => {
    if (key === 'cols' || key === 'rows') fitCells();
    if (key === 'tileset') chooseTileset(map.get('tileset'));
    if (key === 'fps') fitClock();
    dirty = true;
  });
  garden.on(key => {
    if (key === 'plot' && !garden.restoring && garden.get('plot')) openPlot(garden.get('plot'));
    if (key === 'wears') dress();
    if (key === 'seed' || key === 'grow' || key === 'flowers' || key === 'sow') look();
    dirty = true;
  });

  own('KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE');      // walking and planting are the garden's, not core's (core/keys.js)
  wireKeys(mine);
  const sized = new ResizeObserver(() => { dirty = true; });
  sized.observe(canvas.parentElement);
  mine.hold(() => sized.disconnect());
  let raf = requestAnimationFrame(function loop(now) {
    if (!mounted()) return;
    raf = requestAnimationFrame(loop);
    frame(now);
  });
  mine.hold(() => cancelAnimationFrame(raf));
  await openGarden();
}

// ── Opening, keeping, saving ─────────────────────────────────────────────────

/** `?open=<id>`: a garden saved — a map; else what the garden was doing in this page; else bare earth. */
async function openGarden() {
  let opened = null;
  try {
    opened = new URLSearchParams(location.search).get('open') ? await requested('map') : await requested('garden');
  } catch (err) {
    bar.announce('could not open it: ' + err.message);
  }
  if (!mounted()) return;
  const state = opened ? opened.object : null;
  const recipe = state && state.recipe && state.recipe.map ? state.recipe : plot();
  if (state && state.garden) garden.restore(state.garden);
  if (state && state.chain) treatment.restore(state.chain);
  map.restore(recipe.map);
  shape = { cols: recipe.map.cols, rows: recipe.map.rows };
  cells = resize(recipe.cells || [], shape, shape);
  walls = resize(recipe.walls || [], shape, shape, 0);
  await things.load(recipe.place || []);
  if (!mounted()) return;
  beds.plant(drawOrder(things.items));
  savedId = opened && !opened.kept ? opened.object.id : (state && state.saved) || null;
  const at = state && state.at ? state.at : spawnOf(recipe);
  avatar.place({ col: at.col, row: at.row, face: at.face || 'down' });
  await dress();
  fitClock();
  look();
  refreshVault();
  bar.announce(opened ? openedLine(opened) : (await Vault.refresh()) ? 'bare earth: E plants the flower in hand — choose flowers to plant in the Garden drawer'
    : 'no vault: the garden plants from the vault, and keeps nothing without it');
}

/** A garden saved, chosen in the Garden drawer: opened as `?open=` opens one — its smart object bound, its saves its states. */
function openPlot(id) {
  const url = new URL(location.href);
  url.searchParams.set('open', id);
  history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  beds.clear();
  openGarden();
}

/** A garden from nothing: a plot of earth, the map's values otherwise. */
function plot() {
  return { map: { ...map.values, name: 'a garden', cols: 12, rows: 8, tile: 96, ground: '#d8e3c0' }, cells: [], walls: [], place: [] };
}

/** What it is doing, for a scene to give back (core/mount.js): the garden, its values, the treatment, the gardener. */
function keep() {
  return map && things ? { type: 'map', recipe: recipeNow(), garden: garden.values, chain: treatment.chain,
                           at: { ...avatar.at, face: avatar.face }, saved: savedId } : null;
}

/** The garden as a map's recipe keeps it. */
const recipeNow = () => ({ map: map.values, cells, walls, place: things.blocks() });

/** The garden into the vault: a map, the next state of its smart object (../save.js). */
function save() {
  return leave(async () => {
    bar.say('saving the garden…');
    const object = await saveMap({ map, cells, walls, place: things.blocks(), tick: clock.tick });
    if (!object) return 'no vault — downloaded instead';
    savedId = object.id;
    changed = false;
    return `saved ${object.id} — ${object.title}`;
  });
}

function buildExport(panel) {
  const box = exportBox(panel, {
    vault: { save },
    acts: [
      { id: 'play', label: 'Play the last save ↗', run: () => savedId && window.open(`../play/?map=${encodeURIComponent(savedId)}`, '_blank') },
      { id: 'editor', label: 'Open it in the map editor ↗', run: () => savedId && window.open(`../?open=${encodeURIComponent(savedId)}`, '_blank') },
    ],
  });
  box.buttons.play.title = 'The player, in a tab of its own: the garden walked, nothing planted';
}

/** One thing at a time: what happened said, the garden looked at again. */
async function leave(action) {
  if (busy) return;
  busy = true;
  try {
    const said = await action();
    if (said) bar.announce(said);
  } catch (err) {
    console.error('[garden] failed:', err);
    bar.announce('failed: ' + err.message);
  } finally {
    busy = false;
    refreshVault();
    look();
    dirty = true;
  }
}

// ── The gardener: dressed, walking, planting ──────────────────────────────────

/** What the garden says it wears; else what stands on the spawn, as the player's avatar; else a disc. */
async function dress() {
  const recipe = recipeNow(), spawn = spawnOf(recipe);
  const ref = garden.get('wears') || (spawn.from != null ? recipe.place[spawn.from].ref || null : null);
  await avatar.wear(ref);
  dirty = true;
}

/** Every frame: the pad read, the step under way moved on, the garden drawn when anything in it moved. */
function frame(now) {
  if (!things) return;
  const pad = steer.pad();
  if (pad.use) act();
  const step = stride(avatar, recipeNow(), now, () => steer.next(pad.way));
  if (step.arrived || (step.moved && !avatar.walking)) look();
  if (step.moved || beds.growing(now)) dirty = true;
  if (dirty) {
    dirty = false;
    paint(now);
  }
  treatment.tick(now);
}

/** The cell the gardener faces, and what stands there. */
function facing() {
  const at = ahead(avatar.at, avatar.face);
  const block = blockOn(things.blocks(), at.col, at.row);
  const p = block ? things.items.find(q => q.block.col === block.col && q.block.row === block.row && q.block.ref === block.ref) : null;
  return { at, p, flower: p ? beds.flowerOf(p.block) : null };
}

/** What the gardener faces: shown under the treatment, and what E would do there said. */
function look() {
  if (!things || !mounted()) return;
  const { at, p, flower } = facing();
  treatment.show(flower ? flower.object : null, { seed: garden.get('seed'), seconds: garden.get('grow') });
  const unsaved = changed ? ' · not saved: Ctrl S' : '';
  if (flower) return bar.say(`facing ${flower.object.title} — E plants its next generation beside it · Del uproots it${unsaved}`);
  if (p) return bar.say(`facing ${p.title || 'a thing'}${unsaved}`);
  if (!inside(map.values, at) || !walkable(recipeNow(), at.col, at.row)) return bar.say(`${things.items.length} in the garden${unsaved}`);
  inHand().then(id => {
    if (!mounted()) return;
    const row = id && (Vault.index || []).find(r => r.id === id);
    bar.say((id ? `bare earth — E plants ${row ? row.title : id}` : 'bare earth — choose flowers to plant, in the Garden drawer') + unsaved);
  });
}

/** E: the flower faced's next generation planted beside it — or, on bare earth, the flower in hand. */
async function act() {
  if (busy || avatar.walking) return;
  const { at, p, flower } = facing();
  if (p && flower) return plantNext(p, flower.object);
  if (p) return bar.announce(flower === undefined ? 'still opening…' : `${p.title || 'that'} is no flower: it keeps no marks`);
  if (!inside(map.values, at) || !walkable(recipeNow(), at.col, at.row)) return bar.announce('nothing grows there');
  const id = await inHand();
  if (!id) return bar.announce(garden.get('flowers') ? `no flower ${garden.get('sow')} in that set` : 'no flowers in hand: choose a set of them in the Garden drawer');
  planted(things.add({ ...newBlock(id, at.col, at.row), width: garden.get('width'), solid: true }));
  bar.announce(`planted ${(Vault.index || []).find(r => r.id === id)?.title || id}`);
}

/** The next generation of a flower: its marks through the treatment, saved, planted on the bare earth nearest it. */
function plantNext(p, source) {
  const cell = bareNear(recipeNow(), p.block, [avatar.at, avatar.bound]);
  if (!cell) return bar.announce('no bare earth left round it');
  return leave(async () => {
    bar.say(`growing ${source.title}'s next generation…`);
    const chain = treatment.chain, seed = garden.get('seed');
    const drawing = await nextOf(source, chain, seed, sprites);
    if (!drawing) return 'nothing left of it: the treatment thins it all out';
    const object = await saveGeneration({ source, drawing, chain, seed, images: sprites.images });
    if (!object) return 'no vault: nothing to plant it in';
    if (!mounted()) return '';
    planted(things.add({ ...newBlock(object.id, cell.col, cell.row), width: p.block.width || 1, solid: true }));
    return `planted ${object.title} — Ctrl S keeps the garden`;
  });
}

/** A thing just planted: grown from now. */
function planted(q) {
  beds.sow(q);
  changed = true;
  dirty = true;
  look();
}

/** Delete: the flower faced out of the garden — still in the vault. */
function uproot() {
  const { p, flower } = facing();
  if (!p) return;
  if (!flower) return bar.announce('only a flower is uprooted here');
  beds.forget(p);
  things.remove(p);
  changed = true;
  bar.announce(`uprooted ${flower.object.title} — still in the vault`);
  look();
}

/** The flower in hand: the set's member the garden names (hand.js). */
const inHand = () => hand.flower(garden.get('flowers'), garden.get('sow'));

// ── The map under it: its cells, its tiles, its clock ─────────────────────────

/** The cells and the walls laid out again for the map's grid: each where it was. */
function fitCells() {
  const { cols, rows } = map.values;
  cells = resize(cells, shape, { cols, rows });
  walls = resize(walls, shape, { cols, rows }, 0);
  shape = { cols, rows };
}

/** The clock fitted to the map's longest loop: the things on it that move play. */
function fitClock() {
  if (!mounted() || !things) return;
  const fps = map.values.fps, length = things.length(fps);
  if (length !== clock.length) {
    clock.configure({ length, fps, loop: true });
    if (length > 1) clock.play();
  }
}

async function chooseTileset(id) {
  const ask = ++asked;
  tiles = null;
  if (!id) return;
  try {
    const set = await loadSprites(id);
    if (ask === asked && mounted()) tiles = set.images.length ? set.images : null;
  } catch (err) {
    if (ask === asked) bar.announce(`could not open the tileset: ${err.message}`);
  }
  dirty = true;
}

// ── Drawing, the keys ─────────────────────────────────────────────────────────

/** The garden drawn (draw.js), the flower faced boxed while the gardener stands. */
function paint(now) {
  if (!mounted() || !things) return;
  const m = map.values, { p, flower } = facing();
  paintGarden(canvas, { m, cells, tiles, things, beds, avatar, tick: clock.tick, grow: garden.get('grow'), now,
    worn: !garden.get('wears'),
    faced: flower && !avatar.walking ? { block: p.block, size: { width: flower.bloom.width, height: flower.bloom.height } } : null });
  const size = mapSize(m);
  bar.output({ width: size.width, height: size.height, scale: 1 });
}

/** The keys and the pointer (controls.js), each asking the garden for one of its acts. */
function wireKeys(mine) {
  const vault = new VaultPanel();
  wireControls(mine, { canvas, steer }, {
    save, act, uproot,
    walked: () => { avatar.path = []; },
    sow: n => garden.set('sow', n),
    vault: () => vault.toggle(),
    walkTo: (u, v) => {
      const m = map.values, size = mapSize(m);
      const way = pathTo(recipeNow(), avatar.bound, { col: Math.floor((u * size.width) / m.tile), row: Math.floor((v * size.height) / m.tile) });
      if (way) { avatar.path = way; steer.queued = null; }
    },
  });
}

function refreshVault() {
  Vault.refresh().then(ok => { if (bar && mounted()) bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'); });
}
