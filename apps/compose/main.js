/**
 * main.js — compose, assembled. M4, three bricks in.
 *
 * The fourth app, and where a finished piece will be made: objects from every
 * process placed on one page, previewed live and rendered out
 * (docs/roadmap.md, M4). The page is the suite's Format drawer and a rate;
 * what is on it is a list of placements (placements.js), each an object and a
 * transform, and one of them at a time is chosen for the `placed` panel to
 * edit. An object is anything core gives frames of — a still, a shape, a
 * loop from any app — and a loop plays at its own speed (time.js).
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
import { Placements }     from './placements.js';
import { PlacedList }     from './list.js';
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

let page, place, bar, player, transport, list, listDrawer, adder, placements;
let chosen = null;                 // the placement the `placed` panel edits
let choosing = false;              // the panel is being shown a placement: not an edit
let syncing = false;               // an edit is waiting to be carried to the chosen placement
let painted = null;                // paints counted over the last second, for the bar's rate
let clockFps = 0;

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
  bar = new Bar({ app: 'compose', mount: document.querySelector('.app'),
                  keys: 'space play · , . frame · Del remove · V vault' });
  page = pageParams();
  place = placeParams();
  placements = new Placements({ onChange: refresh, say: t => bar.announce(t) });

  const placePanel = new ParamPanel(place, { title: 'placed', mount: document.getElementById('place-side'), groups: PLACE_GROUPS });
  const pagePanel = new ParamPanel(page, { title: 'page', mount: document.getElementById('page-side'), groups: PAGE_GROUPS });

  listDrawer = placePanel.addDrawer({ id: 'list', title: 'On the page', before: 'object' });
  list = new PlacedList({ mount: listDrawer.body, onChoose: choose,
                          onAdd: () => adder.show(), onRemove: () => chosen && takeOff(chosen) });
  adder = new VaultPanel({ accepts: PLACEABLE, pickLabel: 'Place this',
                           onPick: o => putOn(toPlacement({ ref: o.id, ...AT_REST })) });

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
  place.on(() => {
    if (choosing || syncing) return;
    syncing = true;
    queueMicrotask(sync);
  });

  // The preview is drawn at the size the viewer shows it.
  new ResizeObserver(() => draw()).observe(canvas.parentElement);
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

  paintPage(ctx, v, placements.layers(clock.tick, v.fps), view);
  trimLine(size, view);
  if (clock.playing) countPaint();

  bar.output({ width: Math.round(size.width * v.scale), height: Math.round(size.height * v.scale),
               scale: v.scale, format: v.format });
  bar.say(describe());
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
    if (e.key === 'Delete' && chosen) takeOff(chosen);
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
