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
 *
 * A module since S9 (core/mount.js): `mount(host)` and `unmount()`, so a
 * scene can mount another in its place — every placement's frames let go of
 * when it goes. index.html mounts it on itself, and it runs alone as ever
 * (rule 7). Nothing happens at import.
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
import { APP }          from './save.js';
import { ways }         from './leaving.js';
import { PrintPanel }     from '../../core/PrintPanel.js';
import { exportBox }      from '../../core/boxes/export.js';
import { stackDrawer }    from '../../core/StackPanel.js';
import { ParamPanel }     from '../../core/ParamPanel.js';
import { VaultPanel }     from '../../core/VaultPanel.js';
import { Transport }      from '../../core/Transport.js';
import { Bar }            from '../../core/Bar.js';
import { Playhead }       from '../../core/playback.js';
import { Vault }          from '../../core/vault.js';
import { applyFrameEdit } from '../../core/frame.js';
import { requested, openedLine } from '../../core/reopen.js';
import { appModule }      from '../../core/mount.js';

const AT_REST = { x: 0, y: 0, scale: 1, rot: 0 };

/**
 * The three columns of this file's head. No p5: a page is drawImage at a
 * transform; a loop that needs p5 to replay gets it from core/rebuild.js.
 */
const MARKUP = `
  <main class="app-main">
    <div class="app-side" id="place-side"></div>

    <section class="viewer" aria-label="the page">
      <div class="viewer-stage"><canvas id="page" width="480" height="300"></canvas></div>
    </section>

    <div class="app-side" id="page-side"></div>
  </main>`;

const app = appModule('compose', { markup: MARKUP, style: new URL('./style.css', import.meta.url).href, start, keep });

/** compose in `host`, started — a page opened, or an object placed, if the page asks for it (core/mount.js). */
export const mount = (host, given) => app.mount(host, given);
/** compose out of its host, everything it held let go of: its keys, its placements' frames, its clock. */
export const unmount = () => app.unmount();
const mounted = () => !!app.scope;

// One app mounted at a time: its state, made again by each mount (`start`).
let root, canvas, ctx, clock, buttons, clockFps, shownView, leaving, pending;
let page, place, bar, rate, player, transport, list, listDrawer, adder, framer, placements, editing;

async function start(at, mine) {
  root = at;
  canvas = root.querySelector('#page');
  ctx = canvas.getContext('2d');
  buttons = {};            // the Export drawer's: save, png, frames
  clockFps = 0;
  shownView = 1;           // canvas pixels per page pixel, as last painted
  leaving = null;          // the ways out (leaving.js): a save or an export drawing the page again, the player waiting
  pending = false;         // a paint asked for, not yet made
  page = place = bar = rate = player = transport = list = listDrawer = adder = framer = placements = editing = null;
  /*
   * The page's clock. It plays at the page's rate, and drops ticks when a
   * frame costs more than its share of time — the honest reading of what the
   * page is. Playing, a tick arrives inside an animation frame and is painted
   * in it, not in the next.
   */
  clock = new Playhead({
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
  mine.hold(() => clock.dispose());
  try {
    await boot(mine);
  } catch (err) {
    if (bar) bar.announce('failed to boot: ' + err.message);
    throw err;
  }
}

async function boot(mine) {
  bar = new Bar({ app: 'compose', mount: root,
                  keys: 'drag or ← ↑ → ↓ move · [ ] order · Del remove · space play · , . frame · S save · V vault' });
  rate = new PaintRate(bar);
  page = pageParams();
  place = placeParams();
  placements = new Placements({ onChange: refresh, say: t => bar.announce(t) });
  const held = placements;
  mine.hold(() => held.dispose());          // every placement's frames let go of

  const placePanel = new ParamPanel(place, { title: 'placed', mount: root.querySelector('#place-side'), groups: PLACE_GROUPS });
  const pagePanel = new ParamPanel(page, { title: 'page', mount: root.querySelector('#page-side'), groups: PAGE_GROUPS });

  listDrawer = placePanel.addDrawer({ id: 'list', title: 'On the page', before: 'object' });
  editing = new Editing({ placements, place, page, refresh, say: t => bar.announce(t) });
  list = new PlacedList({ mount: listDrawer.body, onAdd: () => adder.show(), onAddFrame: () => framer.show(),
                          onChoose: p => { editing.choose(p); toFrameOf(p); },
                          onRemove: () => editing.chosen && editing.takeOff(editing.chosen),
                          onMove: by => editing.chosen && placements.move(editing.chosen, by) });
  adder = new VaultPanel({ accepts: PLACEABLE, pickLabel: 'Place this',
                           onPick: o => editing.putOn(toPlacement({ ref: o.id, ...AT_REST, version: o.type === 'skw' ? (o.version || 1) : 0 })) });   // a project placed at its state of the moment (S6b)
  framer = new VaultPanel({ accepts: PLACEABLE, pickLabel: 'The next frame',
                            onPick: o => { const { block, over } = nextFrame(o.id);
                                            editing.putOn(block, { fit: false, over }); toFrameOf(editing.chosen); } });

  // The player sits above the page's rate, in its drawer, as ckt's does.
  player = pagePanel.drawer('player');
  const holder = document.createElement('div');
  player.body.prepend(holder);
  transport = new Transport({ clock, mount: holder, busy: () => !!leaving && leaving.busy() });

  leaving = ways({ bar, clock, page: () => page, placements: () => placements, buttons: () => Object.values(buttons), after: refreshVault });
  const { save, leave } = leaving;
  const box = exportBox(pagePanel, { before: 'ground', vault: { save }, disk: { picture: leaving.png, frames: leaving.frames } });
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
  const sized = new ResizeObserver(() => draw());
  sized.observe(canvas.parentElement);
  mine.hold(() => sized.disconnect());
  wirePointer({ canvas, view: () => shownView, page: () => page.values, placements, tick: () => clock.tick,
                chosen: () => editing.chosen, choose: p => editing.choose(p),
                moveTo: (x, y) => place.set({ x, y }) });
  wireKeys(mine);
  refresh();

  await openRequested();
  if (mine.closed) return;
  const asked = new URLSearchParams(location.search).get('place');
  // `?place=skw_…@v3`: a state of a smart object, pinned there (S6b); a bare id, as it is now.
  if (asked) { const [ref, at] = String(asked).split('@v'); editing.putOn(toPlacement({ ref, ...AT_REST, version: Number(at) || 0 })); }
}

/**
 * `?open=<id>`: a composition back to work on (core/reopen.js). The page's
 * values come back, and its list as it was saved — nothing refitted — with
 * the top one chosen. Its objects open behind it, as any placement's do.
 */
async function openRequested() {
  try {
    const opened = await requested('compose');
    if (!opened || !mounted()) return;
    const { recipe } = opened.object;
    page.restore(recipe.page);
    for (const block of recipe.place || []) placements.add(block);
    const chosen = opened.kept ? opened.object.chosen : placements.length - 1;
    editing.choose(placements.items[chosen] || null);
    bar.announce(openedLine(opened));
  } catch (err) {
    bar.announce('could not open it: ' + err.message);
  }
}

/** What it is doing, for a scene to give back (core/mount.js): the page, what is on it, the one chosen. */
function keep() {
  return page && placements ? { type: 'composition', recipe: { page: page.values, place: placements.blocks() },
    chosen: placements.items.indexOf(editing.chosen) } : null;
}

// ── The page's state ─────────────────────────────────────────────────────────

/** The list, the clock and the page, after anything changed — while compose is mounted: an object opening after it went has no list to go to. */
function refresh() {
  if (!mounted() || !list) return;
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

// ── Drawing ──────────────────────────────────────────────────────────────────

function draw() {
  if (pending || !mounted()) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

function paint() {
  if (!mounted() || !page || !editing) return;
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

function wireKeys(mine) {
  const vault = new VaultPanel();
  mine.listen(document, 'keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (e.key === 's' || e.key === 'S') leaving.save();
    if (leaving.busy()) return;
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
  Vault.refresh().then(ok => { if (bar) bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'); });
}
