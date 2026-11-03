/**
 * main.js — compose, assembled. M4, three bricks in.
 *
 * The fourth app, and where a finished piece will be made: objects from every
 * process placed on one page, previewed live and rendered out
 * (docs/roadmap-done.md, M4). The page is the suite's Format drawer and a rate;
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

import { pageParams, placeParams, toPlacement, PAGE_GROUPS, PLACE_GROUPS, PLACEABLE } from './params.js';
import { paintPage, pageSize } from './page.js';
import { trimLine, outline, PaintRate } from './preview.js';
import { viewFactor }     from '../../core/view.js';
import { onionLayer }     from './onion.js';
import { Placements }     from './placements.js';
import { endOf, showsAt } from './time.js';
import { Editing }        from './editing.js';
import { PlacedList }     from './list.js';
import { wirePointer }    from './pointer.js';
import { saveComposition, APP } from './save.js';
import { PrintPanel }     from '../../core/PrintPanel.js';
import { exportBox }      from '../../core/boxes/export.js';
import { stackDrawer }    from '../../core/StackPanel.js';
import { exportPng, exportFrames } from './export.js';
import { ParamPanel }     from '../../core/ParamPanel.js';
import { VaultPanel }     from '../../core/VaultPanel.js';
import { Transport }      from '../../core/Transport.js';
import { Bar }            from '../../core/Bar.js';
import { Playhead }       from '../../core/playback.js';
import { Vault }          from '../../core/vault.js';
import { applyFrameEdit } from '../../core/frame.js';
import { requested }      from '../../core/reopen.js';

const canvas = document.getElementById('page');
const ctx = canvas.getContext('2d');
const AT_REST = { x: 0, y: 0, scale: 1, rot: 0 };

let page, place, bar, rate, player, transport, list, listDrawer, adder, framer, placements, editing;
const buttons = {};                // the Export drawer's: save, png, frames
let clockFps = 0;
let shownView = 1;                 // canvas pixels per page pixel, as last painted
let busy = false;                  // a save or an export is drawing the page again; the player waits

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
    if (!clock.playing && rate) { rate.stop(); draw(); }         // paused, the onion skin comes back
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
  editing = new Editing({ placements, place, page, refresh, say: t => bar.announce(t) });
  list = new PlacedList({ mount: listDrawer.body, onAdd: () => adder.show(), onAddFrame: () => framer.show(),
                          onChoose: p => { editing.choose(p); toFrameOf(p); },
                          onRemove: () => editing.chosen && editing.takeOff(editing.chosen),
                          onMove: by => editing.chosen && placements.move(editing.chosen, by) });
  adder = new VaultPanel({ accepts: PLACEABLE, pickLabel: 'Place this',
                           onPick: o => editing.putOn(toPlacement({ ref: o.id, ...AT_REST })) });
  framer = new VaultPanel({ accepts: PLACEABLE, pickLabel: 'The next frame',
                            onPick: o => { const { block, over } = nextFrame(o.id);
                                            editing.putOn(block, { fit: false, over }); toFrameOf(editing.chosen); } });

  // The player sits above the page's rate, in its drawer, as ckt's does.
  player = pagePanel.drawer('player');
  const holder = document.createElement('div');
  player.body.prepend(holder);
  transport = new Transport({ clock, mount: holder, busy: () => busy });

  const box = exportBox(pagePanel, { before: 'ground', vault: { save }, disk: { picture: png, frames } });
  const exp = box.drawer;
  buttons.save = box.buttons.save;
  buttons.png = box.buttons.picture;
  buttons.frames = box.buttons.frames;
  // A print of the page at the tick on screen, past any canvas: each object asked for its windows (core/PrintPanel.js).
  const printing = new PrintPanel({
    mount: exp.body, app: 'compose', say: t => bar.say(t), format: page.get('format'), tick: () => clock.tick,
    leave: action => leave('print', () => action()),
    object: () => {
      const v = page.values, size = pageSize(v), own = v.scale || 1;
      return { type: 'composition', origin: APP, recipe: JSON.parse(JSON.stringify({ page: v, place: placements.blocks() })),
               render: { w: Math.max(1, Math.round(size.width * own)), h: Math.max(1, Math.round(size.height * own)) } };
    },
  });
  // A window of the stack (core/live.js): what is on screen, as its print has it.
  stackDrawer(pagePanel, { app: 'compose', layer: () => printing.object(), clock, save: () => save() });

  // The frame chain keeps the format and the box in step (core/frame.js).
  page.on(key => {
    applyFrameEdit(page, key);
    if (key === 'format') printing.follow(page.get('format'));
    if (key === 'fps') configureClock();
    draw();
  });

  // The preview is drawn at the size the viewer shows it.
  new ResizeObserver(() => draw()).observe(canvas.parentElement);
  wirePointer({ canvas, view: () => shownView, page: () => page.values, placements, tick: () => clock.tick,
                chosen: () => editing.chosen, choose: p => editing.choose(p),
                moveTo: (x, y) => place.set({ x, y }) });
  wireKeys();
  refresh();

  await openRequested();
  const asked = new URLSearchParams(location.search).get('place');
  if (asked) editing.putOn(toPlacement({ ref: asked, ...AT_REST }));
}

/**
 * `?open=<id>`: a composition back to work on (core/reopen.js). The page's
 * values come back, and its list as it was saved — nothing refitted — with
 * the top one chosen. Its objects open behind it, as any placement's do.
 */
async function openRequested() {
  try {
    const opened = await requested('compose');
    if (!opened) return;
    const { recipe } = opened.object;
    page.restore(recipe.page);
    for (const block of recipe.place || []) placements.add(block);
    editing.choose(placements.items[placements.length - 1] || null);
    bar.announce(`opened ${opened.object.id} — ${opened.object.title}`);
  } catch (err) {
    bar.announce('could not open it: ' + err.message);
  }
}

// ── The page's state ─────────────────────────────────────────────────────────

/** The list, the clock and the page, after anything changed. */
function refresh() {
  list.render(placements.items, editing.chosen);
  listDrawer.note(placements.length ? `${placements.length} placed` : '');
  configureClock();
  draw();
}

/**
 * A flipbook's next frame: the object picked, where the chosen placement is,
 * with its look, starting where it ends and lasting as long. One that had no
 * end is given one first — its own length, a frame for a still — or it would
 * show under every frame after it. Put in after a frame that has others
 * after it, it makes room: they move on by its length (editing.js `ripple`).
 * It goes in the stack just over the frame it follows (`over`).
 */
function nextFrame(ref) {
  const last = editing.chosen || placements.items[placements.length - 1];
  const lasts = last.block.length || Math.max(1, endOf({ at: 0, length: null }, last.handle, page.get('fps')));
  if (last.block.length == null) placements.update(last, { ...last.block, length: lasts });
  const t = last.block.transform;
  const at = (last.block.at || 0) + lasts;
  editing.ripple(at, lasts);
  return { over: last,
           block: toPlacement({ ref, x: t.x, y: t.y, scale: t.scale, rot: t.rot, look: last.block.look, at, length: lasts }) };
}

/** Paused, the page goes to the first frame a chosen placement shows in, when it is not showing. */
function toFrameOf(p) {
  if (!p || clock.playing || showsAt(clock.tick, p.block)) return;
  clock.show(p.block.at || 0);
}

/**
 * The page lasts until its last placement ends, at its own rate; a page
 * with nothing that moves or waits its turn is one frame and does not play. Reconfigured only when
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
  if (buttons.frames) buttons.frames.hidden = !placements.moving;       // a still page is its PNG
}

// ── Leaving compose: a save, a PNG, the frames ───────────────────────────────

/**
 * One way out, for all three: the page and every placement as a snapshot —
 * a drag meanwhile cannot change what leaves — drawn again from exact frames
 * at the page's scale (render.js), with the player held still. A page with
 * an object that would not open, or one still opening, does not leave.
 */
async function leave(doing, action) {
  if (busy) return;
  if (!placements.length) return bar.announce(`nothing to ${doing} — place something first`);
  const lost = placements.items.find(p => p.error);
  if (lost) return bar.announce(`${lost.title} could not be opened — take it off the page to ${doing}`);
  if (placements.items.some(p => !p.handle)) return bar.announce(`still opening — ${doing} once everything is in`);

  busy = true;
  for (const b of Object.values(buttons)) b.disabled = true;
  clock.pause();
  try {
    const recipe = JSON.parse(JSON.stringify({ page: page.values, place: placements.blocks() }));
    bar.announce(await action(recipe));
  } catch (err) {
    console.error(`[compose] ${doing} failed:`, err);
    bar.announce(`${doing} failed: ${err.message}`);
  } finally {
    busy = false;
    for (const b of Object.values(buttons)) b.disabled = false;
    refreshVault();
  }
}

/** What prints from its own pixels, stretched, since no app can draw it again. */
const stretchedNote = titles => (titles.length ? ` · stretched from their pixels: ${titles.join(', ')}` : '');

/** The composition, into the vault (save.js), its render the tick on screen. */
function save() {
  return leave('save', async recipe => {
    bar.say('saving — every object drawn again, at its size…');
    const object = await saveComposition(recipe, { tick: clock.tick });
    return object ? `saved ${object.id} — ${object.title}` : 'no vault — the page is downloaded instead';
  });
}

/** The page at the tick on screen, at its scale, as a PNG (export.js). */
function png() {
  return leave('export', async recipe => {
    bar.say('drawing the page at its scale…');
    const out = await exportPng(recipe, { tick: clock.tick });
    return `downloaded ${out.width} × ${out.height} px` + stretchedNote(out.stretched);
  });
}

/** Every frame of a page that moves, zipped with its rate (export.js). */
function frames() {
  return leave('export', async recipe => {
    const out = await exportFrames(recipe, { onStatus: t => bar.say(t) });
    return `downloaded ${out.frames} frames at ${out.fps} fps, ${out.width} × ${out.height} px — `
      + 'node scripts/frames-to-video.mjs makes the video' + stretchedNote(out.stretched);
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
  const v = page.values;
  const size = pageSize(v);
  const view = viewFactor(canvas, size, v.scale);
  const w = Math.max(1, Math.round(size.width * view));
  const h = Math.max(1, Math.round(size.height * view));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  const onion = v.onion && !clock.playing ? onionLayer(placements, clock.tick, clock.length, v, view) : null;
  paintPage(ctx, v, [...(onion ? [onion] : []), ...placements.layers(clock.tick, v.fps)], view);
  shownView = view;
  trimLine(ctx, size, view);
  outline(ctx, editing.chosen, v, view);
  if (clock.playing) rate.count();

  bar.output({ width: Math.round(size.width * v.scale), height: Math.round(size.height * v.scale),
               scale: v.scale, format: v.format });
  bar.say(describe());
}

/** The bar's line: how many are placed, and the chosen one. */
function describe() {
  const n = placements.length;
  const chosen = editing.chosen;
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
    const chosen = editing.chosen;
    if (e.key === 'Delete' && chosen) editing.takeOff(chosen);
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
