/**
 * main.js — the rig, assembled. M9: a drawing made of marks, rigged at its
 * marks (docs/roadmap.md).
 *
 * A gamepad still is chosen — in the Drawing drawer, or `?drawing=<id>` —
 * and its strokes become its bones (bones.js), each stamp carried by its own
 * stroke's (skin.js), each chain named a part (parts.js). The drawing is
 * drawn again from its marks (draw.js), the bones over it (guides.js, B). A
 * bone's far end, pressed, chooses it; dragged, turns it. R puts every bone
 * back where it was drawn. With no vault it opens, empty, and says so
 * (rule 7).
 *
 * The chosen bone's wave and its chain's part are edited on the left
 * (chosen.js); a preset sets every wave by part — a walk, a waddle, an idle
 * (presets.js); the whole drawing may rise and fall; and the body may crawl
 * as a worm's, in place or round a path (crawl.js). The loop plays by a
 * Playhead — space stops it — every frame drawn by frames.js `framesOf`, as
 * a save and a replay draw it.
 *
 * S saves (save.js): a pose, a still — or a loop, when anything moves — its
 * recipe the values, the bones whole, their turns and waves; `?open=<id>`
 * brings one back.
 *
 * A module since S9 (core/mount.js): `mount(host)` and `unmount()`, so a
 * scene can mount another in its place — R core's again when it goes.
 * index.html mounts it on itself. Nothing happens at import.
 */

import { rigParams, GROUPS } from './params.js';
import { drawingOf } from './drawing.js';
import { proposeBones, posed, tipOf, turnToward } from './bones.js';
import { bind } from './skin.js';
import { turnsAt, moves, riseAt } from './motion.js';
import { crawls } from './crawl.js';
import { withParts } from './parts.js';
import { preset } from './presets.js';
import { drawRig, stageOf, reachOf } from './draw.js';
import { drawBones, drawPath } from './guides.js';
import { wireJoints } from './pointer.js';
import { ChosenBone } from './chosen.js';
import { buildDrawers } from './drawers.js';
import { openDrawing, framesOf, openPathFrom, centreOf } from './frames.js';
import { ways }         from './leaving.js';
import { PrintPanel }   from '../../core/PrintPanel.js';
import { stackDrawer }  from '../../core/StackPanel.js';
import { requested, openedLine } from '../../core/reopen.js';
import { ParamPanel }   from '../../core/ParamPanel.js';
import { VaultPanel }   from '../../core/VaultPanel.js';
import { Playhead }     from '../../core/playback.js';
import { Bar }          from '../../core/Bar.js';
import { Vault }        from '../../core/vault.js';
import { own }          from '../../core/keys.js';
import { viewFactor }   from '../../core/view.js';
import { appModule }    from '../../core/mount.js';

const REACH = 14;              // CSS pixels: how near a handle a press takes hold of it

/** The chosen bone on the left, the viewer, the rig's drawers on the right, the bar below; Canvas 2D, no p5. */
const MARKUP = `
  <main class="app-main">
    <div class="app-side" id="bone-side"></div>
    <section class="viewer" aria-label="the rigged drawing">
      <div class="viewer-head">
        <button class="nb-btn" id="bones" type="button" aria-pressed="true"
                title="The bones over the drawing, a joint at each end — never in anything saved [B]">bones</button>
        <button class="nb-btn" id="rest" type="button"
                title="Every bone back where it was drawn [R]">rest</button>
        <button class="nb-btn" id="play" type="button" aria-pressed="false" disabled
                title="The loop, playing — once a bone swings [space]">play</button>
      </div>
      <div class="viewer-stage"><canvas id="stage" width="480" height="300"></canvas></div>
    </section>
    <div class="app-side" id="side"></div>
  </main>`;

const app = appModule('rig', { markup: MARKUP, style: new URL('./style.css', import.meta.url).href, start, keep: () => kept() });

/** The rig in `host`, started — a drawing or a saved rig opened if the page asks for it (core/mount.js). */
export const mount = (host, given) => app.mount(host, given);
/** The rig out of its host, everything it held let go of: its keys, R given back to core, its clock. */
export const unmount = () => app.unmount();
const mounted = () => !!app.scope;

// One app mounted at a time: its state, made again by each mount (`start`).
let root, canvas, ctx, bonesBtn, playBtn, clock, pending;
let params, bar, chosenPanel;
let opened, reopened, drawn, drawing, bones, frames, turns, waves, at, hot, chosen, showBones, asked, view, stage, clockFps, save, kept;

async function start(host, mine) {
  root = host;
  canvas = root.querySelector('#stage');
  ctx = canvas.getContext('2d');
  bonesBtn = root.querySelector('#bones');
  playBtn = root.querySelector('#play');
  params = bar = chosenPanel = null;
  opened = reopened = drawn = drawing = frames = null;   // the drawing opened; a rig reopened, for it to take; a path's points
  bones = [];
  turns = [];                // the pose: a turn a bone, radians
  waves = [];                // a wave a bone, or null where it keeps still (motion.js)
  at = [];                   // the bones, posed at the frame on screen
  hot = chosen = null;       // the bone under the pointer or held; the one pressed last
  showBones = true;
  asked = 0;                 // the latest drawing asked for; an older answer is dropped
  view = 1; stage = { x: 0, y: 0, width: 1, height: 1 };
  clockFps = 0;              // the rate the clock was fitted to
  save = () => {};           // into the vault (leaving.js), once booted
  kept = () => null;         // what it is doing, for a scene to give back (leaving.js, core/mount.js)
  pending = false;           // a paint asked for, not yet made
  // The loop's clock: what moves, moves by it. Stopped at the unmount.
  clock = new Playhead({ onShow: () => repose(), onState: () => playBtn.setAttribute('aria-pressed', String(clock.playing)) });
  mine.hold(() => clock.dispose());
  try { await boot(mine); } catch (err) { if (bar) bar.announce('failed to boot: ' + err.message); throw err; }
}

async function boot(mine) {
  bar = new Bar({ app: 'rig', mount: root,
                  keys: 'drag a joint · B bones · R rest · space play · S save · V vault' });
  own('KeyR');                        // R is the rig's rest, not core's seed (core/keys.js)
  params = rigParams();
  const panel = new ParamPanel(params, { title: 'rig', mount: root.querySelector('#side'), groups: GROUPS });
  const out = ways({ bar, clock, args: () => (drawing ? { params, opened, bones, turns, waves, drawn,
                                                          title: opened.object.title || params.get('drawing'), tick: clock.tick } : null) });
  save = out.save;
  kept = () => out.keep() || { type: 'still', recipe: { rig: params.values, bones: [], turns: [], waves: [] } };   // no drawing: its values
  const exp = buildDrawers(panel, { rest: toRest, preset: applyPreset, still: toStill, save, download: out.download });
  new PrintPanel({ mount: exp.body, app: 'rig', object: () => out.envelope(), leave: out.leave, say: text => bar.say(text), tick: () => clock.tick });
  stackDrawer(panel, { app: 'rig', layer: () => out.envelope(), clock, save: out.save });     // a window of the stack (core/live.js)
  chosenPanel = new ChosenBone({ mount: root.querySelector('#bone-side'), onWave });

  params.on(key => {
    if (params.restoring) return;           // a rig reopened: openRequested() loads it whole
    if (key === 'drawing') return load();
    if (key === 'jump') rebuild('drawing');
    else if (key === 'corner' || key === 'longest') rebuild('bones');
    else if (key === 'bend') rebuild('skin');
    else if (key === 'path' || key === 'pathFrom' || key === 'crawl') loadPath();
    else refresh();
  });
  wireJoints({ canvas, pictureOf, handleAt, choose, turn, hover: bone => { hot = bone; draw(); } });
  bonesBtn.addEventListener('click', () => toggleBones());
  playBtn.addEventListener('click', () => clock.toggle());
  root.querySelector('#rest').addEventListener('click', toRest);
  const sized = new ResizeObserver(() => draw());
  sized.observe(canvas.parentElement); mine.hold(() => sized.disconnect());
  wireKeys(mine);
  if (await openRequested() || mine.closed) return;
  const wanted = new URLSearchParams(location.search).get('drawing');
  if (wanted) params.set('drawing', wanted);
  else load();
}

/** `?open=<id>`: a pose or a loop back to work on (core/reopen.js) — its values, bones, turns and waves. */
async function openRequested() {
  try {
    const was = await requested('rig');
    if (!was || !mounted()) return false;
    const r = was.object.recipe;
    reopened = { bones: r.bones, turns: r.turns, waves: r.waves || [] };
    params.restore(r.rig);
    await load();
    bar.announce(openedLine(was));
  } catch (err) {
    bar.announce('could not open it: ' + err.message);
  }
  return true;
}

/** The drawing chosen, opened: its marks and the sprites they were stamped with. */
async function load() {
  const ask = ++asked;
  const id = params.get('drawing');
  opened = null;
  drawing = null;
  frames = null;
  bones = [];
  turns = [];
  waves = [];
  at = [];
  choose(null);
  if (!id) {
    bar.say('Choose a drawing: a gamepad still — its strokes become its bones.');
    return fitClock();
  }
  bar.say('opening…');
  try {
    const was = await openDrawing(id);
    if (ask !== asked || !mounted()) return;
    opened = was;
    if (was.missing) bar.announce(`${was.missing} of its sprites would not load: their family is not on this disk`);
    rebuild('drawing');
    loadPath();
  } catch (err) {
    if (ask !== asked) return;
    bar.say(/no marks/.test(err.message)
      ? err.message + ' — a gamepad drawing has; a picture without them waits for a mesh.'
      : 'could not open the drawing: ' + err.message);
    draw();
  }
}

/** The proposal again from where a value changed: the strokes, the bones, or how stamps are shared. */
function rebuild(from) {
  if (!opened) return draw();
  const v = params.values;
  if (from === 'drawing') drawing = drawingOf(opened.recipe, { jump: v.jump });
  if (reopened) {
    bones = withParts(reopened.bones);
    turns = reopened.turns.slice();
    waves = reopened.waves.slice();
    reopened = null;
  } else if (from !== 'skin') {
    bones = withParts(proposeBones(drawing, { corner: v.corner, longest: v.longest }));
    turns = [];
    waves = [];
    hot = null;
    choose(null);
  }
  refresh();
}

/** A drawn path, when the crawl follows one: its points, loaded, and everything again. */
async function loadPath() {
  drawn = null;
  if (drawing) {
    try {
      drawn = await openPathFrom(params.values, centreOf(drawing));
    } catch (err) {
      bar.announce('could not follow that path: ' + err.message);
    }
  }
  refresh();
}

/** Every frame's drawing made again for what is now: values, bones, waves (frames.js, as a save draws). */
function refresh() {
  frames = drawing ? framesOf({ rig: params.values, bones, turns, waves }, opened, drawn) : null;
  fitClock();
}

/** Every bone where it was drawn — what moves moves on about it — and no handle lit until the pointer finds one. */
function toRest() {
  turns = [];
  hot = null;
  refresh();
}

/** Whether anything moves, and the loop it moves in. */
const crawling = () => !!drawing && crawls(params.values);
const moving = () => !!drawing && (moves(bones, waves, params.values) || crawling());
const loopLength = () => (moving() ? params.get('length') : 1);

/** The bones where the pose, the waves and the rise put them at the frame on screen, and the drawing again. */
function repose() {
  const length = loopLength(), t = clock.tick;
  at = posed(bones, moving() ? turnsAt(bones, turns, waves, t, length) : turns, moving() ? riseAt(params.values, t, length) : 0);
  draw();
}

/** The clock fitted to the loop: playing while anything moves. */
function fitClock() {
  const length = loopLength(), fps = params.get('fps');
  if (length !== clock.length || fps !== clockFps) {
    clock.configure({ length, fps, loop: true });
    clockFps = fps;
  }
  if (length > 1 && !clock.playing) clock.play();
  if (length <= 1) clock.pause();
  playBtn.disabled = length <= 1;
  repose();
}

// ── The chosen bone, its wave and its part; the presets ─────────────────────

function choose(bone) {
  chosen = bone;
  const b = bone == null ? null : bones[bone];
  chosenPanel.show(bone, b ? waves[bone] : null, b ? `Bone ${bone + 1} of ${bones.length}, on stroke ${b.stroke + 1}` : '', b ? b.part : 'none');
  draw();
}

function onWave(bone, { part, ...wave }) {
  const stroke = bones[bone].stroke;
  if (part !== bones[bone].part) bones = bones.map(b => (b.stroke === stroke ? { ...b, part } : b));
  waves[bone] = wave;
  refresh();
}

/** A preset's waves on every named chain, its loop and its rise in the panel. */
function applyPreset(name) {
  if (!drawing) return bar.announce('choose a drawing first');
  const out = preset(name, bones);
  waves = out.waves;
  params.set(out.values);
  refresh();
  choose(chosen);
  const parts = [...new Set(bones.filter(b => out.waves[b.id]).map(b => b.part))];
  bar.announce(`${name}: ${parts.join(', ') || 'no part named'} moving — a loop of ${out.values.length} at ${out.values.fps} fps`);
}

function toStill() {
  waves = [];
  params.set({ rise: 0 });
  refresh();
  choose(chosen);
}

// ── Taking hold of a joint ──────────────────────────────────────────────────

/** Where a pointer is, in the picture's pixels — null with nothing drawn. */
function pictureOf(e) {
  if (!drawing) return null;
  const r = canvas.getBoundingClientRect();
  return { x: stage.x + ((e.clientX - r.left) / r.width) * stage.width,
           y: stage.y + ((e.clientY - r.top) / r.height) * stage.height };
}

/** The bone whose far end is nearest q, within reach — or null; none while the body crawls. */
function handleAt(q) {
  if (!showBones || !bones.length || crawling()) return null;
  const perCss = stage.width / Math.max(1, canvas.getBoundingClientRect().width);
  let best = null, d = REACH * perCss;
  for (const b of bones) {
    const tip = tipOf(b, at[b.id]), di = Math.hypot(tip.x - q.x, tip.y - q.y);
    if (di < d) { d = di; best = b.id; }
  }
  return best;
}

/** A bone pointed at q: its pose turned so that, swinging or not, it points there now. */
function turn(bone, q) {
  turns[bone] = turnToward(bones[bone], at[bone], turns[bone] || 0, q);
  hot = bone;
  repose();
}

function toggleBones(on = !showBones) {
  showBones = on;
  bonesBtn.setAttribute('aria-pressed', String(on));
  draw();
}

// ── Drawing ─────────────────────────────────────────────────────────────────

function draw() {
  if (pending || !mounted()) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

/** The room a path needs: its box, and the reach of the drawing's widest stamp round it. */
function pathRoom() {
  if (!frames || !frames.path) return null;
  const xs = frames.path.points.map(p => p.x), ys = frames.path.points.map(p => p.y);
  const reach = reachOf(drawing, drawing.stamps.map(s => ({ x: 0, y: 0, rotation: s.rotation })), opened.images);
  const r = reach ? Math.max(-reach.x, -reach.y) : 0;
  return { x: Math.min(...xs) - r, y: Math.min(...ys) - r, w: Math.max(...xs) - Math.min(...xs) + 2 * r, h: Math.max(...ys) - Math.min(...ys) + 2 * r };
}

function paint() {
  if (!mounted()) return;
  if (!drawing || !frames) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  stage = stageOf(drawing, pathRoom());
  view = viewFactor(canvas, stage, 1);
  const w = Math.max(1, Math.round(stage.width * view)), h = Math.max(1, Math.round(stage.height * view));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  drawRig(ctx, drawing, frames.placesAt(moving() ? clock.tick : 0), opened.images, view, stage);
  const dpp = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
  if (showBones && frames.path) drawPath(ctx, frames.path, view, stage, dpp);
  if (showBones && !crawling()) drawBones(ctx, bones, at, view, stage, dpp, [hot, chosen]);

  const turned = turns.some(t => t);
  bar.output({ width: drawing.width, height: drawing.height, scale: 1 });
  bar.say(`${drawing.strokes.length} strokes · ${bones.length} bones · ${drawing.stamps.length} stamps`
    + (crawling() ? ` · crawling ${params.get('crawl')}` : turned ? ' · posed' : ' · at rest')
    + (moving() ? ` · a loop of ${clock.length} at ${params.get('fps')} fps, frame ${clock.tick + 1}` : '')
    + (showBones && bones.length && !moving() ? ' — drag a joint to bend it' : ''));
}

// ── Keys, the vault ─────────────────────────────────────────────────────────

function wireKeys(mine) {
  const vault = new VaultPanel();
  mine.listen(document, 'keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (e.key === 'b' || e.key === 'B') toggleBones();
    if (e.key === 'r' || e.key === 'R') toRest();
    if (e.key === 's' || e.key === 'S') save();
    if (e.key === ' ' && moving()) { e.preventDefault(); clock.toggle(); }
  });
  Vault.refresh().then(ok => { if (bar) bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'); });
}
