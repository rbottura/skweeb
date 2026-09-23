/**
 * main.js — ckt, assembled.
 *
 * ColorKineType, third version, ported from v2's own source. Two stages, as v2
 * had two layers, laid out as three columns (decided 2026-09-23):
 *
 *   dots     left: set type — or place an image — rule a white grid over it,
 *            and find the cells left between the lines. A dot-set.
 *   viewer   middle: either stage, by the toggle above it.
 *   motion   right: a sprite on every dot of one glyph, turning; an attractor
 *            to lean them by, when you turn it on. A still, a loop, a family.
 *
 * The vault carries a dot-set from one stage to the other, filed in this
 * visit's session folder. Everything else — panels, drawers, the picker, the
 * frame, the player, the bar, lineage — is core's. This file keeps the two
 * stages, one canvas and the keys in step.
 */

import { dotsParams, GROUPS as DOTS }     from './params-dots.js';
import { motionParams, GROUPS as MOTION } from './params-motion.js';
import { DotsStage }    from './stage-dots.js';
import { MotionStage }  from './stage-motion.js';
import { fontManifest } from './fonts.js';
import { manifest as datasetManifest } from './datasets.js';
import { families }     from './sprites.js';
import { ParamPanel }   from '../../core/ParamPanel.js';
import { VaultPanel }   from '../../core/VaultPanel.js';
import { Bar }          from '../../core/Bar.js';
import { Vault }        from '../../core/vault.js';
import { requested }    from '../../core/reopen.js';

const canvas = document.getElementById('stage');
const KEYS = '1 2 view · ← → set · ↑ ↓ glyph · space play · , . frame · S save · V vault';

let dots, motion, bar;
let view = 'motion';
let busy = false;                  // a save or a cut is running; nothing else may start
let resume = false;                // the loop was playing when the viewer left it

async function boot() {
  bar = new Bar({ app: 'ckt', mount: document.querySelector('.app'), keys: KEYS });

  const [fonts, datasets, fams] = await Promise.all([fontManifest(), datasetManifest(), families()]);
  const dotsP = dotsParams(fonts);
  const motionP = motionParams(datasets, fams);

  const dotsPanel = new ParamPanel(dotsP, {
    title: 'dots', mount: document.getElementById('dots-side'), groups: DOTS,
  });
  const motionPanel = new ParamPanel(motionP, {
    title: 'motion', mount: document.getElementById('motion-side'), groups: MOTION,
  });

  motion = new MotionStage({
    params: motionP, panel: motionPanel, canvas, bar,
    legacy: (datasets.datasets || []).map(d => d.id),
    run, busy: () => busy,
  });
  dots = new DotsStage({ params: dotsP, panel: dotsPanel, canvas, bar, make });
  await Promise.all([dots.init(), motion.init()]);

  motionP.on(key => { if (key === 'path') pointable(); });
  wire();
  if (await openRequested(dotsP, motionP)) return;
  show('motion');                  // v2 opened on its output, already moving
  motion.clock.play();
}

/**
 * `?open=<id>`: one of ckt's own objects, back to work on (core/reopen.js). A
 * dot-set goes to both stages — its cut into dots, its dots into this
 * session's list for motion; a still, a loop or a brush restores motion at the
 * frame it kept, and a loop plays.
 *
 * @returns {Promise<boolean>} whether anything was opened
 */
async function openRequested(dotsP, motionP) {
  let opened;
  try {
    opened = await requested('ckt');
    if (!opened) return false;
  } catch (err) {
    bar.announce('could not open it: ' + err.message);
    return false;
  }
  const o = opened.object;

  if (o.type === 'dataset') {
    const data = await (await fetch(opened.url)).json();
    if (o.recipe) { dotsP.restore(o.recipe); await dots.init(); }
    await motion.adopt({ object: o, title: o.title, data, thumb: opened.thumbUrl });
    show(o.recipe ? 'dots' : 'motion');
  } else {
    motionP.restore(o.recipe);
    await motion.init();
    show('motion');
    if (o.type === 'sequence') motion.clock.play();
    else motion.clock.show(o.recipe.tick || 0);
  }
  bar.announce(`opened ${o.id} — ${o.title}`);
  return true;
}

/** Which stage the viewer shows. The other rests; both panels stay. */
function show(which) {
  if (which === view && (dots.active || motion.active)) return;
  if (which === 'dots') { resume = motion.clock.playing; motion.clock.pause(); }

  view = which;
  dots.active = which === 'dots';
  motion.active = which === 'motion';
  document.getElementById('view-dots').setAttribute('aria-pressed', String(which === 'dots'));
  document.getElementById('view-motion').setAttribute('aria-pressed', String(which === 'motion'));

  if (which === 'dots') dots.draw();
  else {
    motion.showOutput();
    motion.draw();
    if (resume) motion.clock.play();
  }
  pointable();
}

function pointable() {
  const on = view === 'motion' && motion.params.get('path') === 'point';
  document.body.classList.toggle('can-point', on);
  document.getElementById('viewer-note').textContent = on ? 'drag to place the attractor' : '';
}

/** Run one long action at a time, and say how it ended. */
async function run(action) {
  if (busy) return;
  busy = true;
  try {
    const message = await action();
    if (message) bar.announce(message);
  } catch (err) {
    console.error('[ckt]', err);
    bar.announce('failed: ' + err.message);
  } finally {
    busy = false;
    refreshVaultState();
  }
}

/** Stage one's cut, filed in this session, and handed straight to stage two. */
const make = () => run(async () => {
  const made = await dots.make(motion.session.folderTag);
  if (!made) return null;
  await motion.adopt(made);
  resume = true;
  show('motion');
  const n = made.data.length;
  return made.object
    ? `made ${made.object.id} — ${n} glyph${n === 1 ? '' : 's'}, in “${motion.session.name}”`
    : 'no vault — the dot-set is downloaded, and drawn from memory (saves from it are leaves)';
});

function wire() {
  const vault = new VaultPanel();

  document.getElementById('view-dots').addEventListener('click', () => show('dots'));
  document.getElementById('view-motion').addEventListener('click', () => show('motion'));

  // v2's mouse mode, kept: with the attractor at a point, drag puts it down.
  const drag = e => {
    if (view !== 'motion' || motion.params.get('path') !== 'point' || !(e.buttons & 1)) return;
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

    if (view === 'dots') {
      if (e.key === 's' || e.key === 'S') make();
      if (e.key === 'ArrowUp')   { e.preventDefault(); dots.step(-1); }
      if (e.key === 'ArrowDown') { e.preventDefault(); dots.step(1); }
      return;
    }

    if (e.key === 's' || e.key === 'S') run(() => motion.saveStill());
    if (e.key === ' ') { e.preventDefault(); motion.clock.toggle(); }
    if (e.key === ',') { motion.clock.pause(); motion.clock.step(-1); }
    if (e.key === '.') { motion.clock.pause(); motion.clock.step(1); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); motion.stepSet(-1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); motion.stepSet(1); }
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
  Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
}

boot().catch(err => {
  console.error('[ckt] failed to boot:', err);
  if (bar) bar.announce('failed to boot: ' + err.message);
});
