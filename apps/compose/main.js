/**
 * main.js — compose, assembled. M4, two bricks in.
 *
 * The fourth app, and where a finished piece will be made: objects from every
 * process placed on one page, previewed live and rendered out
 * (docs/roadmap.md, M4). One object so far. The page is the suite's Format
 * drawer and a rate; the placement is an object and a transform; the object
 * is anything core gives frames of — a still, a shape, a loop from any app —
 * and a loop plays on the page at its own speed (time.js).
 *
 * Three columns, as ckt has: what is placed on the left, the page between,
 * the page's own settings on the right. Everything else is core's — the
 * panels and the picker, the player, the bar, the vault, and the frames.
 *
 * `?place=<id>` boots with that object placed: the seam for the vault's
 * link into compose, `any → compose: place on a sheet`.
 */

import { pageParams, placeParams, PAGE_GROUPS, PLACE_GROUPS } from './params.js';
import { paintPage, pageSize, fitScale, inkSize } from './page.js';
import { moves, framesOnPage, tickAt } from './time.js';
import { ParamPanel }     from '../../core/ParamPanel.js';
import { VaultPanel }     from '../../core/VaultPanel.js';
import { Transport }      from '../../core/Transport.js';
import { Bar }            from '../../core/Bar.js';
import { Playhead }       from '../../core/playback.js';
import { Vault }          from '../../core/vault.js';
import { applyFrameEdit } from '../../core/frame.js';
import { openFrames }     from '../../core/rebuild.js';

const canvas = document.getElementById('page');
const ctx = canvas.getContext('2d');

let page, place, bar, player, transport;
let placed = null;                 // the placement's object, opened: { title, type, handle, size, tick, image }
let loads = 0;                     // the newest load; one that finishes after it is dropped
let painted = null;                // paints counted over the last second, for the bar's rate

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
    if (!clock.playing) { painted = null; bar.rate(null); }
  },
});

async function boot() {
  bar = new Bar({ app: 'compose', mount: document.querySelector('.app'), keys: 'space play · , . frame · V vault' });
  page = pageParams();
  place = placeParams();

  new ParamPanel(place, { title: 'placed', mount: document.getElementById('place-side'), groups: PLACE_GROUPS });
  const pagePanel = new ParamPanel(page, { title: 'page', mount: document.getElementById('page-side'), groups: PAGE_GROUPS });

  // The player sits above the page's rate, in its drawer, as ckt's does.
  player = pagePanel.drawer('player');
  const holder = document.createElement('div');
  player.body.prepend(holder);
  transport = new Transport({ clock, mount: holder });

  // The frame chain keeps the format and the box in step (core/frame.js).
  page.on(key => {
    applyFrameEdit(page, key);
    if (key === 'fps') configureClock();
    draw();
  });
  place.on(key => (key === 'ref' ? open(place.get('ref'), { fit: !place.restoring }) : draw()));

  // The preview is drawn at the size the viewer shows it.
  new ResizeObserver(() => draw()).observe(canvas.parentElement);
  wireKeys();
  configureClock();
  draw();

  const asked = new URLSearchParams(location.search).get('place');
  if (asked) place.set('ref', asked);
}

// ── The placed object ────────────────────────────────────────────────────────

/**
 * Open the chosen object into frames. The newest choice wins: a slow rebuild
 * that finishes after a quicker one is thrown away rather than drawn over it.
 * A choice made by hand places the object whole (`fit`); a restore keeps the
 * scale its recipe says.
 */
async function open(id, { fit }) {
  const token = ++loads;
  if (placed) placed.handle.dispose();
  placed = null;
  configureClock();
  if (!id) return draw();

  bar.say('opening…');
  try {
    const { object, url } = await Vault.load(id);
    // A preview's frames: near-exact where an app has a faster way (a grid
    // dither's growth never reads back). An export will ask for exact ones.
    const handle = await openFrames(object, { url, draft: true });
    if (token !== loads) return handle.dispose();
    if (!handle.length) { handle.dispose(); throw new Error('it rebuilt to no frames'); }
    const size = inkSize(handle);
    placed = { title: object.title || object.id, type: object.type, handle, size, tick: -1, image: null };
    configureClock();
    if (fit) place.set('scale', fitScale(size, page.values));
    const missing = handle.missing || [];
    if (missing.length) bar.announce(`drawn without ${missing.join(', ')}: not on this machine`);
  } catch (err) {
    if (token !== loads) return;
    console.warn('[compose] could not open', id, err);
    bar.announce('could not open that object: ' + err.message);
  }
  draw();
}

/**
 * The page's length is the placed loop's, in time, at the page's rate; a
 * page with nothing that moves is one frame and does not play. A change of
 * rate starts the page again, and keeps it playing if it was.
 */
function configureClock() {
  const fps = page.get('fps');
  const handle = placed && placed.handle;
  const was = clock.playing;
  clock.configure({ length: framesOnPage(handle, fps), fps, loop: !handle || handle.loop !== false });
  transport.configure();
  player.note(moves(handle) ? `${clock.length} frames · ${(clock.length / fps).toFixed(2)} s` : 'nothing moves');
  if (was && moves(handle)) clock.play();
}

/**
 * The object at its own `tick`, asked for once per tick. The frame is
 * borrowed from the handle (core/rebuild.js) and nothing else asks it for
 * another, so it holds until the tick moves — a dragged slider must not
 * re-dither a grid. A tick that fails to draw is said once and left out.
 */
function frameOf(p, tick) {
  const t = Math.min(tick, p.handle.length - 1);
  if (p.tick === t) return p.image;
  p.tick = t;
  try {
    p.image = p.handle.frame(t);
  } catch (err) {
    p.image = null;
    console.warn('[compose] could not draw frame', t, 'of', p.title, err);
    bar.announce(`could not draw ${p.title}: ${err.message}`);
  }
  return p.image;
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
  const view = viewFactor(size, v.scale);
  const w = Math.max(1, Math.round(size.width * view));
  const h = Math.max(1, Math.round(size.height * view));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  const layers = placed ? [{
    image: frameOf(placed, tickAt(clock.tick, placed.handle, v.fps)),
    size: placed.size,
    transform: place.values,
  }] : [];
  paintPage(ctx, v, layers, view);
  trimLine(size, view);
  if (clock.playing) countPaint();

  bar.output({ width: Math.round(size.width * v.scale), height: Math.round(size.height * v.scale),
               scale: v.scale, format: v.format });
  bar.say(placed ? describe(placed)
    : place.get('ref') ? 'opening…'
    : 'choose an object to place — Choose… under Object, or V for the vault');
}

/**
 * Canvas pixels per page pixel, for the preview: as many as the viewer shows
 * in device pixels, never more than an export makes — in steps of a
 * twentieth, so a resize does not churn the canvas.
 */
function viewFactor(size, scale) {
  const box = canvas.parentElement;
  const cs = getComputedStyle(box);
  const w = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const h = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  if (!(w > 0) || !(h > 0)) return Math.min(1, scale);
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min((w * dpr) / size.width, (h * dpr) / size.height);
  return Math.min(scale, Math.ceil(fit * 20) / 20);
}

/** Where the sheet ends inside its bleed: a line on the preview, never in a render. */
function trimLine(size, view) {
  if (!size.bleed) return;
  ctx.save();
  ctx.strokeStyle = '#111111';
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(Math.round(size.bleed * view) + 0.5, Math.round(size.bleed * view) + 0.5,
                 Math.round((size.width - size.bleed * 2) * view), Math.round((size.height - size.bleed * 2) * view));
  ctx.restore();
}

/**
 * The paint rate, measured: pages painted in the last second while playing,
 * in the bar — so a slow page is a number on the machine that has it.
 */
function countPaint() {
  const now = performance.now();
  if (!painted) painted = { since: now, n: 0 };
  painted.n++;
  const span = now - painted.since;
  if (span >= 1000) {
    bar.rate((painted.n * 1000) / span);
    painted = { since: now, n: 0 };
  }
}

function describe(p) {
  const s = place.get('scale');
  const loop = moves(p.handle) ? ` · a ${p.handle.fps} fps loop of ${p.handle.length}` : '';
  return `${p.title} — ${p.type}, ${Math.round(p.size.width * s)} × ${Math.round(p.size.height * s)} `
    + `on the page${loop}`;
}

// ── Keys ─────────────────────────────────────────────────────────────────────

function wireKeys() {
  const vault = new VaultPanel();
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (clock.length < 2) return;
    if (e.key === ' ') { e.preventDefault(); clock.toggle(); }
    if (e.key === ',') { clock.pause(); clock.step(-1); }
    if (e.key === '.') { clock.pause(); clock.step(1); }
  });
  Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
}

boot().catch(err => {
  console.error('[compose] failed to boot:', err);
  if (bar) bar.announce('failed to boot: ' + err.message);
});
