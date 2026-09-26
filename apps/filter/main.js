/**
 * main.js — filter, assembled.
 *
 * A source, a chain, one canvas. The source is any vault object with a
 * picture, or a file (source.js); the chain is a list of GPU filters, each a
 * card drawn from its own schema (chain.js); the canvas is the source's frame
 * under the clock, run through the chain by one core/gpu runner. Saving — and
 * with it rebuild.js and print scale — is the third brick (STATUS.md).
 *
 * Where there is no WebGPU the page opens all the same (rule 7): the chain
 * can be built, the source shows as it is, and the bar says why.
 */

import { filterParams, GROUPS } from './params.js';
import { Chain }                from './chain.js';
import { fromVault, fromFile }  from './source.js';
import { ParamPanel }           from '../../core/ParamPanel.js';
import { VaultPanel }           from '../../core/VaultPanel.js';
import { Transport }            from '../../core/Transport.js';
import { Bar }                  from '../../core/Bar.js';
import { Playhead }             from '../../core/playback.js';
import { Vault }                from '../../core/vault.js';
import { createRunner }         from '../../core/gpu/runner.js';
import { whyNoGpu }             from '../../core/gpu/device.js';

let params, panel, bar, transport, chain;
let runner = null;       // core/gpu's, or null where there is no WebGPU
let source = null;       // source.js's handle
let failing = '';        // why the chain does not compile, until it does
let asked = 0;           // the latest source asked for; an older answer is dropped

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');

/** The clock: a loop plays at its own rate, and a scrub is one frame filtered. */
const clock = new Playhead({
  onShow: tick => { if (transport) transport.show(tick); draw(); },
  onState: () => { if (transport) transport.state(); if (!clock.playing) bar.rate(null); },
});

// ── Boot ─────────────────────────────────────────────────────────────────────

async function boot() {
  params = filterParams();
  bar = new Bar({
    app: 'filter',
    mount: document.querySelector('.app'),
    keys: 'V vault · space play · ← → step · drop an image',
  });
  panel = new ParamPanel(params, { title: 'filter', mount: document.getElementById('side'), groups: GROUPS });
  params.on(onParamChange);
  buildDrawers();

  runner = await createRunner();
  if (!runner) bar.announce(`no GPU filters here — ${whyNoGpu()}; the source shows as it is`);
  wireKeys();
  onChainChange();
}

/** The drawers that are not parameters: a file under Source, the chain, the player. */
function buildDrawers() {
  const file = document.createElement('input');
  file.type = 'file';
  file.accept = 'image/*';
  file.hidden = true;
  file.addEventListener('change', () => loadFile(file.files[0]));
  panel.drawer('source').body.append(button('Open a file', () => file.click()), file);

  const filters = panel.addDrawer({ id: 'chain', title: 'Filters' });
  chain = new Chain({ mount: filters.body, onChange: onChainChange });

  const player = panel.addDrawer({ id: 'player', title: 'Sequence player' });
  transport = new Transport({ clock, mount: player.body });
  showLoopControls();
}

function button(label, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'nb-btn nb-btn--wide';
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

async function onParamChange(key, value) {
  if (key === 'source') await loadSource(value);
}

/** A filter came, went, moved or changed: compile what is new, then draw. */
function onChainChange() {
  const { on, all } = chain.counts;
  panel.drawer('chain').note(all ? `${on} of ${all} on` : '');
  if (!runner) return draw();
  runner.prepare(chain.recipe()).then(
    () => { failing = ''; draw(); },
    err => { failing = err.message; bar.announce(err.message); draw(); });
}

// ── The source ───────────────────────────────────────────────────────────────

function setSource(next) {
  if (source) source.dispose();
  source = next;
  clock.configure({ length: next ? next.frames : 0, fps: next ? next.fps : 0, loop: next ? next.loop : true });
  showLoopControls();
  draw();
}

async function loadSource(id) {
  const ask = ++asked;
  if (!id) return setSource(null);
  bar.say('opening…');
  try {
    const next = await fromVault(id);
    if (ask !== asked) return next.dispose();        // another was chosen meanwhile
    setSource(next);
  } catch (err) {
    if (ask !== asked) return;
    setSource(null);
    bar.announce('could not open that object: ' + err.message);
  }
}

/** A file off disk: the param is cleared first, since clearing it after would drop this file. */
async function loadFile(file) {
  if (!file) return;
  params.set('source', null);
  const ask = ++asked;
  const next = await fromFile(file);
  if (ask !== asked) return next.dispose();
  setSource(next);
}

/** The player exists only when there is a loop. */
function showLoopControls() {
  panel.drawer('player').hidden = !(source && source.frames > 1);
  if (transport) transport.configure();
}

// ── Drawing ──────────────────────────────────────────────────────────────────

let pending = false;
const painted = [];      // when the last paints were, while a loop plays

function draw() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

function paint() {
  if (!source) {
    canvas.width = 480;
    canvas.height = 300;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    bar.output({ width: 0, height: 0 });
    bar.say('choose a source — V for the vault, the Source drawer, or drop an image'
      + (runner ? '' : ' · no GPU here'));
    return;
  }

  const list = chain.recipe();
  const { on, all } = chain.counts;
  // A filter just added is still compiling: keep what is on screen, and let
  // prepare() draw again when it is done, rather than flash it unfiltered.
  if (runner && on && !failing && !runner.ready(list)) return;

  const frame = source.frame(clock.tick);
  let picture = frame;
  let trouble = failing;
  if (runner && on && !failing) {
    try {
      picture = runner.run(frame, list, { time: source.fps ? clock.tick / source.fps : 0 });
    } catch (err) {
      trouble = err.message;
    }
  }

  if (canvas.width !== source.width) canvas.width = source.width;
  if (canvas.height !== source.height) canvas.height = source.height;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(picture, 0, 0);

  bar.output({ width: source.width, height: source.height });
  bar.say(`${source.title} · `
    + (!runner ? 'no GPU — unfiltered' : all ? `${on} of ${all} filters on` : 'no filters yet')
    + (trouble ? ' — ' + trouble : ''));
  rate();
}

/** Paints a second over the last second, while a loop plays: the honest reading of the GPU's pace. */
function rate() {
  if (!clock.playing) return;
  const now = performance.now();
  painted.push(now);
  while (painted.length && painted[0] < now - 1000) painted.shift();
  bar.rate(painted.length);
}

// ── Keys, drops, the vault ───────────────────────────────────────────────────

function wireKeys() {
  const vault = new VaultPanel();

  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (!source || source.frames < 2) return;
    if (e.key === ' ') { e.preventDefault(); clock.toggle(); }
    if (e.key === 'ArrowRight') { clock.pause(); clock.step(1); }
    if (e.key === 'ArrowLeft')  { clock.pause(); clock.step(-1); }
  });

  // Dropping an image is the fastest way in, and it needs no vault.
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) loadFile(file);
  });

  Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
}

boot().catch(err => {
  console.error('[filter] failed to boot:', err);
  if (bar) bar.announce('failed to boot: ' + err.message);
});
