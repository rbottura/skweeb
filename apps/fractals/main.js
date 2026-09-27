/**
 * main.js — fractals, assembled. M7: two families of fractal on one picture.
 *
 * Escape time — the Mandelbrot set and its Julia sets — is one pass
 * (fractal.js) through one core/gpu runner, run over a blank picture of the
 * size wanted. Copies — a sprite from the vault copying itself by a few
 * maps (copies.js) — is drawn on the Canvas 2D, needs no GPU, and may move
 * one of its params over a loop (motion.js): an idle, played by core's
 * player. The preview is drawn at the size the viewer shows (core/view.js).
 *
 * What leaves (save.js) is drawn again by frames.js at the format's size
 * times its scale — the same function of the same params, so exact: a
 * still or an idle into the vault, S; every frame; a sprite sheet; a PNG.
 * rebuild.js replays them for the vault and compose; `?open=` brings one
 * back. Drag to pan, the wheel to zoom about the pointer (pointer.js).
 *
 * Opens with no vault (rule 7): copies are dots until a sprite is chosen.
 * With no WebGPU escape time says why, as filter does; copies still draw.
 */

import { fractalParams, GROUPS } from './params.js';
import { drawCopies, SHAPES } from './copies.js';
import { loopOf, valuesAt, rangeAround } from './motion.js';
import { chainOf } from './frames.js';
import { saveFractal, downloadFrames, downloadSheet } from './save.js';
import { wirePointer }    from './pointer.js';
import { loadSprites }    from '../../core/sprites.js';
import { mipFor }         from '../../core/stamps.js';
import { ParamPanel }     from '../../core/ParamPanel.js';
import { VaultPanel }     from '../../core/VaultPanel.js';
import { Transport }      from '../../core/Transport.js';
import { Playhead }       from '../../core/playback.js';
import { Bar }            from '../../core/Bar.js';
import { Vault }          from '../../core/vault.js';
import { requested }      from '../../core/reopen.js';
import { applyFrameEdit } from '../../core/frame.js';
import { viewFactor }     from '../../core/view.js';
import { toPng, download } from '../../core/export.js';
import { surface }        from '../../core/surface.js';
import { createRunner }   from '../../core/gpu/runner.js';
import { whyNoGpu }       from '../../core/gpu/device.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

/** Past this zoom a 32-bit float cannot tell neighbouring pixels apart (fractal.js, *The plane*). */
const DEEPEST = 5e4;

let params, bar, transport, player, runner = null, failing = '';
let blank = null;                  // the picture the pass writes over: only its size matters
let busy = false;                  // a save or a download is drawing; nothing else starts
let sprites = null;                // the copies' sprite, or a set's members; null: dots
let spriteTitle = '';
let spriteIn = Promise.resolve();  // the sprite on its way in, for a reopen to wait on
let asked = 0;                     // the latest sprite asked for; an older answer is dropped
let clockAt = '';                  // the loop the clock was fitted to

/** The clock plays an idle's frames at its rate; a still is one frame. */
const clock = new Playhead({
  onShow: tick => { if (transport) transport.show(tick); draw(); },
  onState: () => { if (transport) transport.state(); },
});

async function boot() {
  bar = new Bar({ app: 'fractals', mount: document.querySelector('.app'),
                  keys: 'drag pan · wheel zoom · space play · , . frame · S save · V vault' });
  params = fractalParams();
  const panel = new ParamPanel(params, { title: 'fractal', mount: document.getElementById('side'), groups: GROUPS });

  player = panel.addDrawer({ id: 'player', title: 'Sequence player', before: 'format' });
  transport = new Transport({ clock, mount: player.body, busy: () => busy });
  buildExport(panel);

  params.on(key => {
    applyFrameEdit(params, key);
    if (!params.restoring) {
      // A shape picked starts from its own ratio, twist and depth; a param
      // picked to move from a range round its value now. A recipe arriving keeps its own.
      if (key === 'shape') params.set(SHAPES[params.get('shape')].start);
      if (key === 'move' && params.get('move') !== 'none') {
        params.set(rangeAround(params.get('move'), params.get(params.get('move'))));
        fitClock();               // the range may be what it was, and announce nothing: fit before playing
        clock.play();
      }
    }
    if (key === 'sprite') spriteIn = chooseSprite(params.get('sprite'));
    fitClock();
    draw();
  });
  new ResizeObserver(() => draw()).observe(canvas.parentElement);
  wirePointer({ canvas, params });
  wireKeys();
  fitClock();

  runner = await createRunner();
  if (!runner) bar.announce(`no escape time here — ${whyNoGpu()}; copies still draw`);
  else {
    try {
      await runner.prepare(chainOf(params.values));
    } catch (err) {
      failing = err.message;
      bar.announce(err.message);
    }
  }
  await openRequested();
  draw();
}

/** `?open=<id>`: a saved still or idle back to work on (core/reopen.js), its sprite with it. */
async function openRequested() {
  try {
    const opened = await requested('fractals');
    if (!opened) return;
    params.restore(opened.object.recipe);
    await spriteIn;
    fitClock();
    if (clock.length > 1) clock.play();
    bar.announce(`opened ${opened.object.id} — ${opened.object.title}`);
  } catch (err) {
    bar.announce('could not open it: ' + err.message);
  }
}

/** The clock fitted to the loop the values make: its frames at its rate, or a still's one. */
function fitClock() {
  const v = params.values;
  const n = loopOf(v);
  const key = `${n}@${v.fps}`;
  if (key !== clockAt) {
    const was = clock.playing && n > 1;
    clock.configure({ length: n, fps: v.fps || 24, loop: true });
    transport.configure();
    clockAt = key;
    if (was) clock.play();
  }
  player.hidden = n < 2;
  player.note(n > 1 ? `${n} frames · ${(n / v.fps).toFixed(2)} s, a loop` : '');
}

/** The copies' sprite (core/sprites.js): dots until it is in, and dots if it will not come. */
async function chooseSprite(id) {
  const ask = ++asked;
  sprites = null;
  spriteTitle = '';
  if (!id) return draw();
  try {
    const got = await loadSprites(id);
    if (ask !== asked) return;
    sprites = got.images.length ? got.images : null;
    spriteTitle = got.title;
    bar.announce(`${got.title}: ${got.images.length} sprite${got.images.length === 1 ? '' : 's'}`);
  } catch (err) {
    if (ask === asked) bar.announce(`could not open the sprite: ${err.message} — drawing dots`);
  }
  draw();
}

// ── Drawing ──────────────────────────────────────────────────────────────────

let pending = false;

function draw() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

/** Escape time at `w` × `h` pixels: the runner's picture, good until its next run. */
function render(values, w, h) {
  if (!blank || blank.width !== w || blank.height !== h) {
    blank = surface(w, h);
    blank.getContext('2d');       // a canvas the GPU copies from must have had a context
  }
  return runner.run(blank, chainOf(values));
}

function paint() {
  const v = valuesAt(params.values, clock.tick);
  const size = { width: v.width, height: v.height };
  const view = viewFactor(canvas, size, v.scale);
  const w = Math.max(1, Math.round(size.width * view));
  const h = Math.max(1, Math.round(size.height * view));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  bar.output({ width: Math.round(v.width * v.scale), height: Math.round(v.height * v.scale), scale: v.scale, format: v.format });
  canvas.classList.toggle('copies', v.family === 'copies');
  if (v.family === 'copies') {
    const { copies, depth } = drawCopies(ctx, v, sprites, view, mipFor);
    const moving = clock.length > 1 ? ` · ${v.move} ${+v[v.move].toFixed(2)}, frame ${clock.tick + 1} of ${clock.length}` : '';
    bar.say(`${v.shape} · ${copies.toLocaleString('en')} copies, ${depth} generation${depth === 1 ? '' : 's'}`
      + (depth < v.depth ? ` — stopped short of ${v.depth}: too many copies` : '') + moving
      + (sprites ? '' : ' · dots: choose a sprite'));
    return;
  }
  if (!runner || failing) {
    ctx.clearRect(0, 0, w, h);
    return;
  }
  ctx.drawImage(render(v, w, h), 0, 0);
  bar.say(describe(v));
}

/** The bar's line: which set, where, how deep — and when 32 bits have run out. */
function describe(v) {
  const where = `${v.cx.toPrecision(8)}, ${v.cy.toPrecision(8)}`;
  const set = v.kind === 'julia' ? `julia of ${v.jx.toPrecision(4)}, ${v.jy.toPrecision(4)}` : 'mandelbrot';
  const deep = v.zoom > DEEPEST ? ' · past 32-bit precision: the picture blocks up' : '';
  return `${set} · ${v.zoom < 10 ? v.zoom.toFixed(2) : Math.round(v.zoom).toLocaleString('en')}× at ${where} · ${v.iterations} iterations${deep}`;
}

// ── Leaving ──────────────────────────────────────────────────────────────────

function buildExport(panel) {
  const exp = panel.addDrawer({ id: 'export', title: 'Export', before: 'format' });
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
  button('Download the picture (PNG)', downloadPicture);
  button('Download every frame (zip)', () => leave(async () => {
    const out = await downloadFrames({ params, sprites, runner, onStatus: t => bar.say(t) });
    return `downloaded ${out.frames} frames at ${out.fps} fps — node scripts/frames-to-video.mjs makes the video`;
  }));
  button('Download a sprite sheet', () => leave(async () => {
    const out = await downloadSheet({ params, sprites, runner, onStatus: t => bar.say(t) });
    return `downloaded ${out.name} — ${out.frames} frames of ${out.box.w} × ${out.box.h} on a ${out.width} × ${out.height} sheet, and its JSON`;
  }));
  exp.body.append(actions);
}

/** One way out: the player held still, nothing else started, what happened said. */
async function leave(action) {
  if (busy) return;
  if (params.get('family') !== 'copies' && !runner) return bar.announce(`no WebGPU here — ${whyNoGpu()}`);
  busy = true;
  clock.pause();
  try {
    bar.announce(await action());
  } catch (err) {
    console.error('[fractals] failed:', err);
    bar.announce('failed: ' + err.message);
  } finally {
    busy = false;
    Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
    draw();
  }
}

/** A still, or an idle with the frame on screen as its picture, into the vault (save.js). */
function save() {
  return leave(async () => {
    bar.say('saving…');
    const tick = clock.tick;
    const object = await saveFractal({ params, sprites, spriteTitle, runner, tick });
    if (!object) return 'no vault — downloaded instead';
    return object.render.frames ? `saved ${object.id} — ${object.render.frames} frames at ${object.render.fps} fps`
      : `saved ${object.id} — ${object.title}`;
  });
}

/**
 * The frame on screen at the format's size times its scale, as a PNG: drawn
 * again, not the preview enlarged.
 */
function downloadPicture() {
  return leave(async () => {
    const v = valuesAt(params.values, clock.tick);
    const w = Math.round(v.width * v.scale), h = Math.round(v.height * v.scale);
    bar.say(`drawing ${w} × ${h}…`);
    const out = surface(w, h);
    if (v.family === 'copies') drawCopies(out.getContext('2d'), v, sprites, v.scale, mipFor);
    else out.getContext('2d').drawImage(render(v, w, h), 0, 0);
    download(await toPng(out), `fractal_${v.family === 'copies' ? v.shape : v.kind}_${w}x${h}.png`);
    return `downloaded ${w} × ${h} px`;
  });
}

// ── Keys ─────────────────────────────────────────────────────────────────────

function wireKeys() {
  const vault = new VaultPanel();
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (e.key === 's' || e.key === 'S') save();
    if (busy || clock.length < 2) return;
    if (e.key === ' ') { e.preventDefault(); clock.toggle(); }
    if (e.key === ',') { clock.pause(); clock.step(-1); }
    if (e.key === '.') { clock.pause(); clock.step(1); }
  });
  Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
}

boot().catch(err => {
  console.error('[fractals] failed to boot:', err);
  if (bar) bar.announce('failed to boot: ' + err.message);
});
