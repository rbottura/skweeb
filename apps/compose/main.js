/**
 * main.js — compose, assembled. M4, three bricks in.
 *
 * The fourth app, and where a finished piece will be made: objects from every
 * process placed on one page, previewed live and rendered out
 * (docs/roadmap.md, M4). The page is the suite's Format drawer and a rate;
 * what is on it is a list of placements (placements.js, list.js), each an
 * object and a transform, and one of them at a time is chosen for the
 * `placed` panel to edit — from the list, or picked up on the page itself
 * and dragged (pointer.js). An object is anything core gives frames of — a
 * still, a shape, a loop from any app — and a loop plays at its own speed
 * (time.js).
 *
 * Three columns, as ckt has: what is placed on the left, the page between,
 * the page's own settings on the right. Everything else is core's — the
 * panels and the pickers, the player, the bar, the vault, and the frames.
 *
 * `?place=<id>` boots with that object placed: the seam for the vault's
 * link into compose, `any → compose: place on a sheet`.
 */

import { pageParams, placeParams, toPlacement, fromPlacement, PAGE_GROUPS, PLACE_GROUPS, PLACEABLE } from './params.js';
import { paintPage, pageSize, fitScale } from './page.js';
import { viewFactor, trimLine, outline, PaintRate } from './preview.js';
import { Placements }     from './placements.js';
import { PlacedList }     from './list.js';
import { wirePointer }    from './pointer.js';
import { saveComposition } from './save.js';
import { ParamPanel }     from '../../core/ParamPanel.js';
import { VaultPanel }     from '../../core/VaultPanel.js';
import { Transport }      from '../../core/Transport.js';
import { Bar }            from '../../core/Bar.js';
import { Playhead }       from '../../core/playback.js';
import { Vault }          from '../../core/vault.js';
import { applyFrameEdit } from '../../core/frame.js';

const canvas = document.getElementById('page');
const ctx = canvas.getContext('2d');
const AT_REST = { x: 0, y: 0, scale: 1, rot: 0 };

let page, place, bar, rate, player, transport, list, listDrawer, adder, placements, saveButton;
let chosen = null;                 // the placement the `placed` panel edits
let choosing = false;              // the panel is being shown a placement: not an edit
let syncing = false;               // an edit is waiting to be carried to the chosen placement
let clockFps = 0;
let shownView = 1;                 // canvas pixels per page pixel, as last painted
let busy = false;                  // a save is drawing the page again; the player waits

/**
 * The page's clock. It plays at the page's rate, and drops ticks when a
 * frame costs more than its share of time — the honest reading of what the
 * page is. Playing, a tick arrives inside an animation frame and is painted
 * in it, not in the next.
 */
const clock = new Playhead({
  onShow: tick => {
    if (transport) transport.show(tick);
    if (clock.playing) paint();
    else draw();
  },
  onState: () => {
    if (transport) transport.state();
    if (!clock.playing && rate) rate.stop();
  },
});

async function boot() {
  bar = new Bar({ app: 'compose', mount: document.querySelector('.app'),
                  keys: 'drag or ← ↑ → ↓ move · [ ] order · Del remove · space play · , . frame · S save · V vault' });
  rate = new PaintRate(bar);
  page = pageParams();
  place = placeParams();
  placements = new Placements({ onChange: refresh, say: t => bar.announce(t) });

  const placePanel = new ParamPanel(place, { title: 'placed', mount: document.getElementById('place-side'), groups: PLACE_GROUPS });
  const pagePanel = new ParamPanel(page, { title: 'page', mount: document.getElementById('page-side'), groups: PAGE_GROUPS });

  listDrawer = placePanel.addDrawer({ id: 'list', title: 'On the page', before: 'object' });
  list = new PlacedList({ mount: listDrawer.body, onChoose: choose, onAdd: () => adder.show(),
                          onRemove: () => chosen && takeOff(chosen),
                          onMove: by => chosen && placements.move(chosen, by) });
  adder = new VaultPanel({ accepts: PLACEABLE, pickLabel: 'Place this',
                           onPick: o => putOn(toPlacement({ ref: o.id, ...AT_REST })) });

  // The player sits above the page's rate, in its drawer, as ckt's does.
  player = pagePanel.drawer('player');
  const holder = document.createElement('div');
  player.body.prepend(holder);
  transport = new Transport({ clock, mount: holder, busy: () => busy });

  const exp = pagePanel.addDrawer({ id: 'export', title: 'Export', before: 'ground' });
  const actions = document.createElement('div');
  actions.className = 'pp-actions';
  saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.className = 'nb-btn nb-btn--wide nb-btn--primary';
  saveButton.textContent = 'Save to the vault  [S]';
  saveButton.addEventListener('click', save);
  actions.append(saveButton);
  exp.body.append(actions);

  // The frame chain keeps the format and the box in step (core/frame.js).
  page.on(key => {
    applyFrameEdit(page, key);
    if (key === 'fps') configureClock();
    draw();
  });
  place.on(() => {
    if (choosing || syncing) return;
    syncing = true;
    queueMicrotask(sync);
  });

  // The preview is drawn at the size the viewer shows it.
  new ResizeObserver(() => draw()).observe(canvas.parentElement);
  wirePointer({ canvas, view: () => shownView, page: () => page.values, placements,
                chosen: () => chosen, choose, moveTo: (x, y) => place.set({ x, y }) });
  wireKeys();
  refresh();

  const asked = new URLSearchParams(location.search).get('place');
  if (asked) putOn(toPlacement({ ref: asked, ...AT_REST }));
}

// ── Placements ───────────────────────────────────────────────────────────────

/** A new placement, on top and chosen — placed whole once its object is open. */
function putOn(block) {
  const p = placements.add(block);
  choose(p);
  fitWhenOpen(p);
}

/** Take a placement off the page, and choose the one that was under it. */
function takeOff(p) {
  const i = placements.items.indexOf(p);
  placements.remove(p);
  if (chosen === p) choose(placements.items[Math.max(0, i - 1)] || null);
}

/** Which placement the panel edits. The panel follows it; nothing is edited. */
function choose(p) {
  chosen = p;
  choosing = true;
  try {
    place.restore(p ? fromPlacement(p.block) : {});
  } finally {
    choosing = false;
  }
  refresh();
}

/**
 * The panel was edited: carry it to the chosen placement. It runs once after
 * a burst — a Reset announces every key — so it sees the panel as it ends up.
 * With nothing chosen, an object picked is a new placement; an object
 * cleared, or a Reset, takes the chosen one off the page; another object
 * picked for it is opened, and placed whole.
 */
function sync() {
  syncing = false;
  const v = place.values;
  if (!chosen) {
    if (v.ref) putOn(toPlacement(v));
    return draw();
  }
  if (!v.ref) return takeOff(chosen);
  const renamed = v.ref !== chosen.block.ref;
  const { at, length } = chosen.block;
  placements.update(chosen, toPlacement(v, { at, length }));
  if (renamed) fitWhenOpen(chosen);
  refresh();
}

/** A placement's scale, set to fit the sheet once its object's size is known. */
async function fitWhenOpen(p) {
  await p.opening;
  if (!p.size || !placements.items.includes(p)) return;
  p.block = { ...p.block, transform: { ...p.block.transform, scale: fitScale(p.size, page.values) } };
  if (chosen === p) choose(p);
  else refresh();
}

/** The list, the clock and the page, after anything changed. */
function refresh() {
  list.render(placements.items, chosen);
  listDrawer.note(placements.length ? `${placements.length} placed` : '');
  configureClock();
  draw();
}

/**
 * The page lasts as long as its longest loop, at its own rate; a page with
 * nothing that moves is one frame and does not play. Reconfigured only when
 * that changes — a change starts the page again, playing if it was.
 */
function configureClock() {
  const fps = page.get('fps');
  const length = placements.frames(fps);
  if (length !== clock.length || fps !== clockFps) {
    const was = clock.playing;
    clock.configure({ length, fps, loop: true });
    clockFps = fps;
    transport.configure();
    if (was && length > 1) clock.play();
  }
  player.note(placements.moving ? `${length} frames · ${(length / fps).toFixed(2)} s` : 'nothing moves');
}

// ── Saving ───────────────────────────────────────────────────────────────────

/**
 * The composition, into the vault: the page and every placement as its
 * recipe, drawn once more from exact frames at the tick on screen (save.js).
 * The recipe is a snapshot — a drag during the save cannot change what it
 * says — and a page with an object that would not open is not saved.
 */
async function save() {
  if (busy) return;
  if (!placements.length) return bar.announce('nothing to save — place something first');
  const lost = placements.items.find(p => p.error);
  if (lost) return bar.announce(`${lost.title} could not be opened — take it off the page to save`);
  if (placements.items.some(p => !p.handle)) return bar.announce('still opening — save once everything is in');

  busy = true;
  saveButton.disabled = true;
  clock.pause();
  bar.say('saving — every object drawn again, exactly…');
  try {
    const recipe = JSON.parse(JSON.stringify({ page: page.values, place: placements.blocks() }));
    const object = await saveComposition(recipe, { tick: clock.tick });
    bar.announce(object ? `saved ${object.id} — ${object.title}` : 'no vault — the page is downloaded instead');
  } catch (err) {
    console.error('[compose] save failed:', err);
    bar.announce('save failed: ' + err.message);
  } finally {
    busy = false;
    saveButton.disabled = false;
    refreshVault();
  }
}

// ── Drawing ──────────────────────────────────────────────────────────────────

let pending = false;

function draw() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

function paint() {
  const v = page.values;
  const size = pageSize(v);
  const view = viewFactor(canvas, size, v.scale);
  const w = Math.max(1, Math.round(size.width * view));
  const h = Math.max(1, Math.round(size.height * view));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  paintPage(ctx, v, placements.layers(clock.tick, v.fps), view);
  shownView = view;
  trimLine(ctx, size, view);
  outline(ctx, chosen, v, view);
  if (clock.playing) rate.count();

  bar.output({ width: Math.round(size.width * v.scale), height: Math.round(size.height * v.scale),
               scale: v.scale, format: v.format });
  bar.say(describe());
}

/** The bar's line: how many are placed, and the chosen one. */
function describe() {
  const n = placements.length;
  if (!n) return 'choose an object to place — Add… under On the page, or V for the vault';
  if (!chosen) return `${n} placed`;
  if (chosen.error) return `${n} placed · ${chosen.title} could not be opened`;
  if (!chosen.handle) return `${n} placed · opening ${chosen.title}…`;
  const s = chosen.block.transform.scale;
  const loop = chosen.handle.length > 1 ? ` · a ${chosen.handle.fps} fps loop of ${chosen.handle.length}` : '';
  return `${n} placed · ${chosen.title} — ${chosen.type}, ${Math.round(chosen.size.width * s)} × `
    + `${Math.round(chosen.size.height * s)} on the page${loop}`;
}

// ── Keys ─────────────────────────────────────────────────────────────────────

function wireKeys() {
  const vault = new VaultPanel();
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (e.key === 's' || e.key === 'S') save();
    if (busy) return;
    if (e.key === 'Delete' && chosen) takeOff(chosen);
    if (e.key === ']' && chosen) placements.move(chosen, +1);
    if (e.key === '[' && chosen) placements.move(chosen, -1);
    const nudge = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
    if (nudge && chosen) {
      e.preventDefault();
      const n = e.shiftKey ? 10 : 1;
      place.set({ x: place.get('x') + nudge[0] * n, y: place.get('y') + nudge[1] * n });
    }
    if (clock.length < 2) return;
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
  console.error('[compose] failed to boot:', err);
  if (bar) bar.announce('failed to boot: ' + err.message);
});
