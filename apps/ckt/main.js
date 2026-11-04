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
 *
 * A module since S9 (core/mount.js): `mount(host)` and `unmount()`, so a
 * scene can mount another in its place; index.html mounts it on itself, and
 * it runs alone as ever (rule 7). Nothing happens at import. A visit is the
 * page's, not a mount's: mounted again, ckt goes on filing into the same
 * session, its sets still listed (sessions.js).
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
import { appModule }    from '../../core/mount.js';

const KEYS = '1 2 view · ← → set · ↑ ↓ glyph · space play · , . frame · S save · V vault';

/**
 * Three columns, as decided 2026-09-23: stage one (dots) on the left, stage
 * two (motion) on the right, and the viewer between them with a toggle for
 * which stage it shows. The bar under all three is core's, information only.
 */
const MARKUP = `
  <main class="app-main">
    <div class="app-side" id="dots-side"></div>

    <section class="viewer" aria-label="ckt">
      <div class="viewer-head">
        <div class="nb-toggle" role="group" aria-label="The viewer shows">
          <button class="nb-btn" id="view-dots" type="button" aria-pressed="false" title="Stage one: the cut [1]">dots</button>
          <button class="nb-btn" id="view-motion" type="button" aria-pressed="true" title="Stage two: the sprites [2]">motion</button>
        </div>
        <span class="viewer-note" id="viewer-note"></span>
      </div>
      <div class="viewer-stage"><canvas id="stage" width="480" height="300"></canvas></div>
    </section>

    <div class="app-side" id="motion-side"></div>
  </main>`;

const app = appModule('ckt', { markup: MARKUP, style: new URL('./style.css', import.meta.url).href, start });

/** ckt in `host`, started — one of its objects opened if the page asks for it (core/mount.js). */
export const mount = host => app.mount(host);
/** ckt out of its host, everything it held let go of: its keys, its drops, its clock. */
export const unmount = () => app.unmount();
const mounted = () => !!app.scope;

/** This visit: when the page opened, and the sets made since — kept from one mount to the next. */
let visit = null;

// One app mounted at a time: its state, made again by each mount (`start`).
let root, canvas, dots, motion, bar, view, busy, resume;

async function start(at, mine) {
  root = at;
  canvas = root.querySelector('#stage');
  dots = motion = bar = null;
  view = 'motion';
  busy = false;            // a save or a cut is running; nothing else may start
  resume = false;          // the loop was playing when the viewer left it
  if (!visit) visit = { now: new Date(), items: [] };
  try {
    await boot(mine);
  } catch (err) {
    if (bar) bar.announce('failed to boot: ' + err.message);
    throw err;
  }
}

async function boot(mine) {
  bar = new Bar({ app: 'ckt', mount: root, keys: KEYS });

  const [fonts, datasets, fams] = await Promise.all([fontManifest(), datasetManifest(), families()]);
  if (mine.closed) return;
  const dotsP = dotsParams(fonts);
  const motionP = motionParams(datasets, fams);

  const dotsPanel = new ParamPanel(dotsP, {
    title: 'dots', mount: root.querySelector('#dots-side'), groups: DOTS,
  });
  const motionPanel = new ParamPanel(motionP, {
    title: 'motion', mount: root.querySelector('#motion-side'), groups: MOTION,
  });

  motion = new MotionStage({
    params: motionP, panel: motionPanel, canvas, bar, visit,
    legacy: (datasets.datasets || []).map(d => d.id),
    run, busy: () => busy,
  });
  mine.hold(() => motion.dispose());          // its clock stopped, its observer off
  dots = new DotsStage({ params: dotsP, panel: dotsPanel, canvas, bar, make });
  await Promise.all([dots.init(), motion.init()]);
  if (mine.closed) return;

  motionP.on(key => { if (key === 'path') pointable(); });
  wire(mine);
  if (await openRequested(dotsP, motionP) || mine.closed) return;
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
    if (!opened || !mounted()) return false;
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
  root.querySelector('#view-dots').setAttribute('aria-pressed', String(which === 'dots'));
  root.querySelector('#view-motion').setAttribute('aria-pressed', String(which === 'motion'));

  if (which === 'dots') dots.draw();
  else {
    motion.showOutput();
    motion.draw();
    if (resume) motion.clock.play();
  }
  pointable();
}

/** With the attractor at a point, the canvas says it can be dragged — on the app's own grid, gone with it. */
function pointable() {
  const on = view === 'motion' && motion.params.get('path') === 'point';
  root.classList.toggle('can-point', on);
  root.querySelector('#viewer-note').textContent = on ? 'drag to place the attractor' : '';
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

function wire(mine) {
  const vault = new VaultPanel();

  root.querySelector('#view-dots').addEventListener('click', () => show('dots'));
  root.querySelector('#view-motion').addEventListener('click', () => show('motion'));

  // v2's mouse mode, kept: with the attractor at a point, drag puts it down.
  const drag = e => {
    if (view !== 'motion' || motion.params.get('path') !== 'point' || !(e.buttons & 1)) return;
    motion.params.set(motion.pointAt(e));
  };
  canvas.addEventListener('pointerdown', drag);
  canvas.addEventListener('pointermove', drag);

  mine.listen(document, 'keydown', e => {
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
  mine.listen(document, 'dragover', e => e.preventDefault());
  mine.listen(document, 'drop', e => {
    e.preventDefault();
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;
    show('dots');
    dots.openFile(file);
  });

  refreshVaultState();
}

function refreshVaultState() {
  Vault.refresh().then(ok => { if (bar) bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'); });
}
