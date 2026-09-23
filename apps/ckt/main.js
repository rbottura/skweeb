/**
 * main.js — ckt, assembled.
 *
 * ColorKineType, third version: v2 ported from its own source this time.
 * Two stages, as v2 had two layers:
 *
 *   dots     set type — or place an image — rule a white grid over it, and
 *            find the black cells left between the lines. A dataset.
 *   motion   put a sprite on every dot of one glyph, tie each dot to its place,
 *            and run an attractor past them. A still, a loop, a brush family.
 *
 * The vault is what passes a dataset from one to the other. Everything else —
 * the panels, the picker, the frame, the transport, lineage — is core's. This
 * file only keeps the two stages, one canvas and the bar in step.
 */

import { dotsParams }   from './params-dots.js';
import { motionParams } from './params-motion.js';
import { DotsStage }    from './stage-dots.js';
import { MotionStage }  from './stage-motion.js';
import { fontManifest } from './fonts.js';
import { manifest as datasetManifest } from './datasets.js';
import { families }     from './sprites.js';
import { ParamPanel }   from '../../core/ParamPanel.js';
import { VaultPanel }   from '../../core/VaultPanel.js';
import { Vault }        from '../../core/vault.js';

const canvas = document.getElementById('stage');
const playBtn = document.getElementById('play');
const scrub = document.getElementById('playhead');
const readout = document.getElementById('readout');

// The readout is rewritten every frame while a loop plays, so a result — "saved
// ckt_…" — would last one frame. A result holds the line for a few seconds.
let holdUntil = 0;
const say = text => { if (performance.now() >= holdUntil) readout.textContent = text; };
const announce = text => { readout.textContent = text; holdUntil = performance.now() + 3000; };

let dots, motion, panels;
let stage = 'motion';
let busy = false;                  // a save or a cut is running; nothing else may start

async function boot() {
  const [fonts, datasets, fams] = await Promise.all([fontManifest(), datasetManifest(), families()]);

  const dotsP = dotsParams(fonts);
  const motionP = motionParams(datasets, fams);

  panels = {
    dots: new ParamPanel(dotsP, { title: 'ckt · dots' }),
    motion: new ParamPanel(motionP, { title: 'ckt · motion' }),
  };

  dots = new DotsStage({ params: dotsP, canvas, say });
  motion = new MotionStage({ params: motionP, canvas, say, playBtn, scrub });
  await Promise.all([dots.init(), motion.init()]);

  motionP.on(key => { if (key === 'path') pointable(); });

  wireChrome();
  show('motion');                  // v2 opened on its output, already moving
  motion.clock.play();
}

/** Switch stage: its panel, its buttons, its drawing. The other one rests. */
function show(which) {
  stage = which;
  dots.active = which === 'dots';
  motion.active = which === 'motion';

  panels.dots[which === 'dots' ? 'show' : 'hide']();
  panels.motion[which === 'motion' ? 'show' : 'hide']();

  for (const node of document.querySelectorAll('[data-stage]')) {
    node.hidden = node.dataset.stage !== which;
  }
  document.getElementById('tab-dots').setAttribute('aria-pressed', String(which === 'dots'));
  document.getElementById('tab-motion').setAttribute('aria-pressed', String(which === 'motion'));

  if (which === 'dots') { motion.clock.pause(); dots.draw(); }
  else motion.draw();
  pointable();
}

function pointable() {
  document.body.classList.toggle('can-point',
    stage === 'motion' && motion.params.get('path') === 'point');
}

/** Run one long action at a time, and say how it ended. */
async function run(action) {
  if (busy) return;
  busy = true;
  try {
    const message = await action();
    if (message) announce(message);
  } catch (err) {
    console.error('[ckt]', err);
    announce('failed: ' + err.message);
  } finally {
    busy = false;
    refreshVaultState();
  }
}

/** Stage one's cut, handed straight to stage two. */
const make = () => run(async () => {
  const made = await dots.make();
  if (!made) return null;
  await motion.adopt(made);
  show('motion');
  motion.clock.play();
  return made.object
    ? `made ${made.object.id} — ${made.data.length} glyph${made.data.length === 1 ? '' : 's'}, drawing it`
    : `no vault — dataset downloaded, and drawn from memory (saves from it are leaves)`;
});

function wireChrome() {
  const vault = new VaultPanel();

  document.getElementById('tab-dots').addEventListener('click', () => show('dots'));
  document.getElementById('tab-motion').addEventListener('click', () => show('motion'));

  document.getElementById('make').addEventListener('click', make);
  document.getElementById('save').addEventListener('click', () => run(() => motion.saveStill()));
  document.getElementById('save-loop').addEventListener('click', () => run(() => motion.saveLoop(false)));
  document.getElementById('save-frames').addEventListener('click', () => run(() => motion.saveLoop(true)));
  document.getElementById('emit').addEventListener('click', () => run(() => motion.emit()));

  document.getElementById('file').addEventListener('change', e => {
    show('dots');
    dots.openFile(e.target.files[0]);
  });

  playBtn.addEventListener('click', () => { if (!busy) motion.clock.toggle(); });
  scrub.addEventListener('input', () => {
    if (busy) { scrub.value = motion.clock.tick; return; }
    motion.clock.pause();
    motion.clock.show(Number(scrub.value));
  });

  // v2's mouse mode, kept: with the attractor at a point, drag puts it down.
  const drag = e => {
    if (stage !== 'motion' || motion.params.get('path') !== 'point' || !(e.buttons & 1)) return;
    motion.params.set(motion.pointAt(e));
  };
  canvas.addEventListener('pointerdown', drag);
  canvas.addEventListener('pointermove', drag);

  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (e.key === '1') show('dots');
    if (e.key === '2') show('motion');
    if (busy) return;

    if (stage === 'dots') {
      if (e.key === 's' || e.key === 'S') make();
      if (e.key === 'ArrowRight') dots.step(1);
      if (e.key === 'ArrowLeft') dots.step(-1);
      return;
    }

    if (e.key === 's' || e.key === 'S') run(() => motion.saveStill());
    if (e.key === ' ') { e.preventDefault(); motion.clock.toggle(); }
    if (e.key === 'ArrowRight') { motion.clock.pause(); motion.clock.step(1); }
    if (e.key === 'ArrowLeft')  { motion.clock.pause(); motion.clock.step(-1); }
    // v2 stepped its glyph with up and down; so does this.
    if (e.key === 'ArrowUp')   { e.preventDefault(); motion.step(1); }
    if (e.key === 'ArrowDown') { e.preventDefault(); motion.step(-1); }
  });

  // An image dropped anywhere goes to stage one to be cut.
  document.addEventListener('dragover', e => e.preventDefault());
  document.addEventListener('drop', e => {
    e.preventDefault();
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    show('dots');
    dots.openFile(file);
  });

  refreshVaultState();
}

function refreshVaultState() {
  Vault.refresh().then(ok => {
    document.getElementById('vault-state').textContent = ok
      ? `${Vault.index.length} in vault` : 'no vault';
  });
}

boot().catch(err => {
  console.error('[ckt] failed to boot:', err);
  say('failed to boot: ' + err.message);
});
