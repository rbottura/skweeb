/**
 * main.js — the shader app, assembled. M15b: a surface from nothing.
 *
 * Filter's chain, begun by a generator (docs/vfx.md): rows of the GPU kit's
 * catalogue run top to bottom over a blank picture, by one core/gpu runner.
 * Every row shows the surface as it stands there — the chain cut at that
 * row (rows.js, frames.js) — and a row's picture clicked is seen large in
 * the viewer. A loop plays under core's player: what scrolls comes round in
 * its length. Starters are chains to open (starters.js); the guide is
 * `docs/guides/vfx.md`, read here.
 *
 * The preview is drawn at the size the viewer shows (core/view.js). What
 * leaves (save.js) is drawn again by frames.js at the format's size times
 * its scale — the same function of the same recipe, so exact: a still or a
 * loop into the vault, S; a print. rebuild.js replays them for the vault
 * and compose; `?open=` brings one back, its chain row for row.
 *
 * Opens with no vault (rule 7): it needs none. With no WebGPU the page opens
 * all the same, says why, and the chain can be built — nothing is drawn.
 *
 * A module (core/mount.js): `mount(host)` and `unmount()` — its runner's GPU
 * memory let go of when it goes, the device the page's. Nothing at import.
 */

import { shaderParams, GROUPS } from './params.js';
import { Rows, ROW_SIDE }       from './rows.js';
import { drawSurface, blankOf, loopOf, isLife } from './frames.js';
import { STARTERS, FIRST }      from './starters.js';
import { saveSurface, APP }     from './save.js';
import { PrintPanel }           from '../../core/PrintPanel.js';
import { exportBox }            from '../../core/boxes/export.js';
import { stackDrawer }          from '../../core/StackPanel.js';
import { VaultPanel }           from '../../core/VaultPanel.js';
import { Vault }                from '../../core/vault.js';
import { requested, openedLine } from '../../core/reopen.js';
import { ParamPanel }           from '../../core/ParamPanel.js';
import { Transport }            from '../../core/Transport.js';
import { Playhead }             from '../../core/playback.js';
import { Bar }                  from '../../core/Bar.js';
import { Guide }                from '../../core/Guide.js';
import { applyFrameEdit }       from '../../core/frame.js';
import { viewFactor }           from '../../core/view.js';
import { createRunner }         from '../../core/gpu/runner.js';
import { whyNoGpu }             from '../../core/gpu/device.js';
import { appModule }            from '../../core/mount.js';

/** The viewer, one column of drawers, the bar below; drawn on the GPU, shown on a Canvas 2D; no p5. */
const MARKUP = `
  <main class="app-main">
    <section class="viewer" aria-label="surface">
      <div class="viewer-stage"><canvas id="stage" width="480" height="480"></canvas></div>
    </section>
    <div class="app-side" id="side"></div>
  </main>`;

const app = appModule('shader', { markup: MARKUP, style: new URL('./style.css', import.meta.url).href, start, keep });

/** The shader app in `host`, started (core/mount.js). */
export const mount = (host, given) => app.mount(host, given);
/** …and out of its host, everything it held let go of: its keys, its runner, its clock. */
export const unmount = () => app.unmount();
const mounted = () => !!app.scope;

// One app mounted at a time: its state, made again by each mount (`start`).
let root, canvas, ctx, clock, pending, painted;
let params, panel, bar, transport, player, chain, runner, failing, blanks, guide, clockAt, busy;

async function start(host, mine) {
  root = host;
  canvas = root.querySelector('#stage');
  ctx = canvas.getContext('2d');
  params = panel = bar = transport = player = chain = runner = guide = null;
  failing = '';            // why the chain does not compile, until it does
  pending = busy = false;  // a paint asked for, not made; a save or a print drawing, nothing else starts
  painted = [];            // when the last paints were, while the loop plays
  blanks = new Map();      // the blank pictures the chain is run over, by size: the viewer's, a row's
  clockAt = '';            // the loop the clock was fitted to
  clock = new Playhead({
    onShow: tick => { if (transport) transport.show(tick); draw(); },
    onState: () => { if (transport) transport.state(); if (!clock.playing && bar) bar.rate(null); },
  });
  mine.hold(() => clock.dispose());
  mine.hold(() => { if (guide) guide.dispose(); });
  try { await boot(mine); } catch (err) { if (bar) bar.announce('failed to boot: ' + err.message); throw err; }
}

async function boot(mine) {
  bar = new Bar({ app: 'shader', mount: root, redraw: () => draw(),
                  keys: 'space play · , . frame · S save · V vault · a row\'s picture: seen large' });
  params = shaderParams();
  panel = new ParamPanel(params, { title: 'shader', mount: root.querySelector('#side'), groups: GROUPS });
  buildDrawers();
  params.on(key => {
    applyFrameEdit(params, key);
    fitClock();
    draw();
  });
  const sized = new ResizeObserver(() => draw());
  sized.observe(canvas.parentElement);
  mine.hold(() => sized.disconnect());
  wireKeys(mine);
  fitClock();

  const made = await createRunner();
  if (mine.closed) { if (made) made.dispose(); return; }
  runner = made;
  mine.hold(() => { if (made) made.dispose(); });   // its GPU memory, not the device: that is the page's
  if (!runner) bar.announce(`no surface here — ${whyNoGpu()}; the chain can still be built`);
  chain.restore(FIRST);
  await openRequested();
}

/** `?open=<id>`: a saved surface back to work on (core/reopen.js) — its values, and its chain row for row. */
async function openRequested() {
  try {
    const opened = await requested('shader');
    if (!opened || !mounted()) return;
    const { chain: list, ...values } = opened.object.recipe;
    params.restore(values);
    const unknown = chain.restore(list);
    fitClock();
    bar.announce(openedLine(opened) + (unknown.length ? ` · ${unknown.length} of its rows are not in this catalogue` : ''));
  } catch (err) {
    bar.announce('could not open it: ' + err.message);
  }
}

/** What it is doing, for a scene to give back (core/mount.js): its values and its chain. */
function keep() {
  return params && chain ? { type: loopOf(params.values) > 1 ? 'sequence' : 'still', recipe: recipeNow() } : null;
}

const recipeNow = () => ({ ...params.values, chain: chain.recipe() });

/** The drawers that are not parameters: the starters and the guide, the chain, the player. */
function buildDrawers() {
  const starters = panel.addDrawer({ id: 'starters', title: 'Starters', before: 'surface' }).body;
  const about = document.createElement('p');
  about.className = 'sh-about';
  for (const s of STARTERS) starters.append(button(s.label, () => { openStarter(s); about.textContent = s.about; }, s.about));
  starters.append(button('Read the guide', () => {
    guide = guide || new Guide({ url: new URL('../../docs/guides/vfx.md', import.meta.url).href, title: 'a game\'s effects' });
    guide.show();
  }), about);

  chain = new Rows({ mount: panel.drawer('surface').body, onChange: onChainChange, onChoose: () => draw() });

  player = panel.addDrawer({ id: 'player', title: 'Sequence player', before: 'format' });
  transport = new Transport({ clock, mount: player.body, busy: () => busy });

  const exp = exportBox(panel, { before: 'format', vault: { save } }).drawer;
  // A print of the frame on screen, drawn again at the sheet's size a window at a time (core/PrintPanel.js).
  const printing = new PrintPanel({
    mount: exp.body, app: 'shader', leave, say: text => bar.say(text), format: params.get('format'), tick: () => clock.tick,
    object: () => {
      const recipe = recipeNow(), own = recipe.scale || 1;
      return { type: 'still', origin: APP, recipe, render: { w: Math.round(recipe.width * own), h: Math.round(recipe.height * own) } };
    },
  });
  params.on(key => { if (key === 'format') printing.follow(params.get('format')); });
  // A window of the stack (core/live.js): what is on screen, as its print has it.
  stackDrawer(panel, { app: 'shader', layer: () => printing.object(), clock, save: () => save() });
}

/** One way out: the player held still, nothing else started, what happened said. */
async function leave(action) {
  if (busy) return;
  if (!runner) return bar.announce(`no WebGPU here — ${whyNoGpu()}`);
  if (failing || !runner.ready(chain.recipe())) return bar.announce('the chain is not ready — ' + (failing || 'still compiling'));
  busy = true;
  clock.pause();
  try {
    bar.announce(await action());
  } catch (err) {
    console.error('[shader] failed:', err);
    bar.announce('failed: ' + err.message);
  } finally {
    busy = false;
    refreshVault();
    draw();
  }
}

/** A still, or a loop with the frame on screen as its picture, into the vault (save.js). */
function save() {
  return leave(async () => {
    bar.say('saving…');
    const object = await saveSurface({ params, chain: chain.recipe(), runner, tick: clock.tick });
    if (!object) return 'no vault — downloaded instead';
    return object.render.frames ? `saved ${object.id} — ${object.render.frames} frames at ${object.render.fps} fps`
      : `saved ${object.id} — ${object.title}`;
  });
}

function button(label, onClick, title = '') {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'nb-btn nb-btn--wide';
  b.textContent = label;
  if (title) b.title = title;
  b.addEventListener('click', onClick);
  return b;
}

/** A starter opened: its loop, its seed, its chain in place of what was there — and played. */
function openStarter(starter) {
  params.set(starter.values);
  chain.restore(starter.chain);
  fitClock();
  clock.show(0);
  clock.play();
  bar.announce(`${starter.label} — ${starter.chain.length} rows, top to bottom`);
}

/** A row came, went, moved or changed: compile what is new, then draw. */
function onChainChange() {
  if (!chain) return;              // a row added while the list is being made
  const { on, all } = chain.counts;
  panel.drawer('surface').note(all ? `${on} of ${all} on` : '');
  if (!runner) return draw();
  runner.prepare(chain.recipe()).then(
    () => { failing = ''; draw(); },
    err => { failing = err.message; bar.announce(err.message); draw(); });
}

/** The clock fitted to the loop: one frame is a still, and the player goes. */
function fitClock() {
  const v = params.values;
  const n = loopOf(v);
  const key = `${n}@${v.fps}${isLife(v) ? ', once' : ''}`;
  if (key !== clockAt) {
    const was = clock.playing && n > 1;
    clock.configure({ length: n, fps: v.fps || 24, loop: !isLife(v) });
    transport.configure();
    clockAt = key;
    if (was) clock.play();
  }
  player.hidden = n < 2;
  player.note(n > 1 ? `${n} frames · ${(n / v.fps).toFixed(2)} s, ${isLife(v) ? 'a life' : 'a loop'}` : '');
}

// ── Drawing ──────────────────────────────────────────────────────────────────

function draw() {
  if (pending || !mounted()) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

/** The blank picture of a size, kept: the chain is run over it, and only its size matters. */
function blank(w, h) {
  const key = w + 'x' + h;
  if (!blanks.has(key)) {
    if (blanks.size > 8) blanks.clear();       // a viewer resized leaves sizes behind
    blanks.set(key, blankOf(w, h));
  }
  return blanks.get(key);
}

function paint() {
  if (!mounted() || !chain) return;
  const recipe = recipeNow();
  const size = { width: recipe.width, height: recipe.height };
  const view = viewFactor(canvas, size, recipe.scale);
  const w = Math.max(1, Math.round(size.width * view));
  const h = Math.max(1, Math.round(size.height * view));
  const { on, all } = chain.counts;
  const seen = chain.chosenIndex;
  bar.output({ width: Math.round(recipe.width * recipe.scale), height: Math.round(recipe.height * recipe.scale),
               scale: recipe.scale, format: recipe.format });

  if (!runner || failing) {
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    bar.say(!runner ? `no GPU — ${all} row${all === 1 ? '' : 's'}, nothing drawn` : 'the chain does not compile — ' + failing);
    return;
  }
  // A row just added is still compiling: keep what is on screen; prepare() draws again when it is done.
  if (!runner.ready(recipe.chain)) return;

  let trouble = '';
  try {
    // Each row's picture: the chain cut there, small.
    const k = ROW_SIDE / Math.max(size.width, size.height);
    const rw = Math.max(1, Math.round(size.width * k)), rh = Math.max(1, Math.round(size.height * k));
    chain.pictures.forEach((small, i) => {
      if (small.width !== rw) small.width = rw;
      if (small.height !== rh) small.height = rh;
      const to = small.getContext('2d');
      to.clearRect(0, 0, rw, rh);
      to.drawImage(drawSurface(runner, blank(rw, rh), recipe, clock.tick, k, i), 0, 0);
    });
    // The viewer: the whole chain, or cut at the row chosen.
    const picture = drawSurface(runner, blank(w, h), recipe, clock.tick, view, seen < 0 ? null : seen);
    if (canvas.width !== w) canvas.width = w;
    if (canvas.height !== h) canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(picture, 0, 0);
  } catch (err) {
    trouble = err.message;
  }

  const n = clock.length;
  bar.say((all ? `${on} of ${all} rows on` : 'no rows yet — add a generator, or open a starter')
    + (seen >= 0 ? ` · seen at row ${seen + 1}, ${chain.entries[seen].item.label}` : '')
    + (n > 1 ? ` · frame ${clock.tick + 1} of ${n}` : '')
    + (trouble ? ' — ' + trouble : ''));
  rate();
}

/** Paints a second over the last second, while the loop plays: the GPU's pace, rows and all. */
function rate() {
  if (!clock.playing) return;
  const now = performance.now();
  painted.push(now);
  while (painted.length && painted[0] < now - 1000) painted.shift();
  bar.rate(painted.length);
}

// ── Keys ─────────────────────────────────────────────────────────────────────

function wireKeys(mine) {
  const vault = new VaultPanel();
  mine.listen(document, 'keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (e.key === 's' || e.key === 'S') save();
    if (busy || clock.length < 2) return;
    if (e.key === ' ') { e.preventDefault(); clock.toggle(); }
    if (e.key === ',') { clock.pause(); clock.step(-1); }
    if (e.key === '.') { clock.pause(); clock.step(1); }
  });
  refreshVault();
}

function refreshVault() {
  Vault.refresh().then(ok => { if (bar) bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'); });
}
