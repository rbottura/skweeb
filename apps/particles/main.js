/**
 * main.js — particles, assembled. M6, brick 2: the app opens and plays dots.
 *
 * The emitter on the left, the picture between, the picture's settings on
 * the right. Every frame is `particlesAt(recipe, tick / fps)` (model.js) —
 * nothing stepped, nothing carried over — so a scrub, a step back or a jump
 * to frame 900 is the frame playing would have reached, and a stream's loop
 * closes on its last frame. Drawn by draw.js at the size the viewer shows
 * (core/view.js).
 *
 * Opens and plays with no vault (rule 7): nothing here reads one yet. Saving
 * and sprites from a set are the bricks after (STATUS.md).
 */

import { emitParams, pictureParams, toModel, framesOf, EMIT_GROUPS, PICTURE_GROUPS } from './params.js';
import { prepare, particlesAt } from './model.js';
import { drawParticles, pictureSize } from './draw.js';
import { ParamPanel }     from '../../core/ParamPanel.js';
import { VaultPanel }     from '../../core/VaultPanel.js';
import { Transport }      from '../../core/Transport.js';
import { Bar }            from '../../core/Bar.js';
import { Playhead }       from '../../core/playback.js';
import { Vault }          from '../../core/vault.js';
import { applyFrameEdit } from '../../core/frame.js';
import { viewFactor }     from '../../core/view.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

let emit, picture, bar, transport, player;
let clockFps = 0;
let model = null;          // the recipe, prepared: remade when a value changes, not every frame
let shown = [];            // the particles on screen, for the bar
const painted = [];        // when the last paints were, while playing

/** The clock plays the picture's frames at its rate; a tick is a time, tick / fps. */
const clock = new Playhead({
  onShow: tick => { if (transport) transport.show(tick); draw(); },
  onState: () => { if (transport) transport.state(); if (!clock.playing) bar.rate(null); },
});

async function boot() {
  bar = new Bar({ app: 'particles', mount: document.querySelector('.app'),
                  keys: 'space play · , . frame · V vault' });
  emit = emitParams();
  picture = pictureParams();
  new ParamPanel(emit, { title: 'particles', mount: document.getElementById('emit-side'), groups: EMIT_GROUPS });
  const side = new ParamPanel(picture, { title: 'picture', mount: document.getElementById('picture-side'),
                                         groups: PICTURE_GROUPS });

  player = side.drawer('player');
  const holder = document.createElement('div');
  player.body.prepend(holder);
  transport = new Transport({ clock, mount: holder });

  emit.on(() => remake());
  picture.on(key => {
    applyFrameEdit(picture, key);
    if (key === 'fps') remake();
    else draw();
  });
  new ResizeObserver(() => draw()).observe(canvas.parentElement);
  wireKeys();
  remake();
  clock.play();
}

/**
 * The recipe changed: prepare it once, and fit the clock to how long the
 * picture now lasts — kept at the frame it was on, playing if it was.
 */
function remake() {
  const e = emit.values, p = picture.values;
  model = prepare(toModel(e, p));
  const length = framesOf(e, p, model.longest);
  if (length !== clock.length || p.fps !== clockFps) {
    const was = clock.playing, at = clock.tick;
    clock.configure({ length, fps: p.fps, loop: true });
    clockFps = p.fps;
    transport.configure();
    clock.show(Math.min(at, length - 1));
    if (was) clock.play();
  }
  const secs = (length / p.fps).toFixed(2);
  player.note(e.mode === 'burst' ? `${length} frames · ${secs} s, once` : `${length} frames · ${secs} s, a loop`);
  draw();
}

// ── Drawing ──────────────────────────────────────────────────────────────────

let pending = false;

function draw() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

function paint() {
  if (!model) return;
  const p = picture.values;
  const size = pictureSize(p);
  const view = viewFactor(canvas, size, p.scale);
  const w = Math.max(1, Math.round(size.width * view));
  const h = Math.max(1, Math.round(size.height * view));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  shown = particlesAt(model, clock.tick / p.fps);
  drawParticles(ctx, shown, p, view);

  bar.output({ width: Math.round(size.width * p.scale), height: Math.round(size.height * p.scale),
               scale: p.scale, format: p.format });
  bar.say(`${shown.length} alive · frame ${clock.tick + 1} of ${clock.length}`
    + (emit.get('mode') === 'burst' ? ' · a burst' : ' · a loop that closes'));
  rate();
}

/** Paints a second over the last second, while playing. */
function rate() {
  if (!clock.playing) return;
  const now = performance.now();
  painted.push(now);
  while (painted.length && painted[0] < now - 1000) painted.shift();
  bar.rate(painted.length);
}

// ── Keys, the vault ──────────────────────────────────────────────────────────

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
  console.error('[particles] failed to boot:', err);
  if (bar) bar.announce('failed to boot: ' + err.message);
});
