/**
 * main.js — the rig, assembled. M9: a drawing made of marks, rigged at its
 * marks (docs/roadmap.md).
 *
 * A gamepad still is chosen — in the Drawing drawer, or `?drawing=<id>` —
 * and its strokes become its bones (bones.js), each stamp carried by its own
 * stroke's (skin.js). The drawing is drawn again from its marks (draw.js),
 * the bones over it (guides.js, B). A bone's far end, pressed, chooses it;
 * dragged, turns it, and the stamps follow, whole, crowding and fanning at
 * the joints. R puts every bone back where it was drawn. With no vault it
 * opens, empty, and says so (rule 7).
 *
 * The chosen bone swings by itself through its wave, edited in the column on
 * the left (chosen.js, motion.js): the loop plays by a Playhead — space stops
 * it — and each frame is the pose and the waves at that frame, nothing else.
 *
 * S saves (save.js): a pose, a still — or a loop, when a bone swings — its
 * recipe the values, the bones whole, their turns and waves, drawn by the
 * code a replay draws with (frames.js); `?open=<id>` brings one back.
 */

import { rigParams, GROUPS } from './params.js';
import { drawingOf } from './drawing.js';
import { proposeBones, posed, tipOf, turnToward } from './bones.js';
import { bind, placeOf } from './skin.js';
import { turnsAt, moves } from './motion.js';
import { drawRig, stageOf } from './draw.js';
import { drawBones } from './guides.js';
import { wireJoints } from './pointer.js';
import { ChosenBone } from './chosen.js';
import { openDrawing } from './frames.js';
import { saveRig, downloadRig } from './save.js';
import { requested }    from '../../core/reopen.js';
import { ParamPanel }   from '../../core/ParamPanel.js';
import { VaultPanel }   from '../../core/VaultPanel.js';
import { Playhead }     from '../../core/playback.js';
import { Bar }          from '../../core/Bar.js';
import { Vault }        from '../../core/vault.js';
import { viewFactor }   from '../../core/view.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const bonesBtn = document.getElementById('bones');
const playBtn = document.getElementById('play');
const REACH = 14;              // CSS pixels: how near a handle a press takes hold of it

let params, bar, chosenPanel;
let opened = null;             // the drawing, opened (frames.js openDrawing): its recipe and its sprites
let reopened = null;           // a rig reopened: its bones, turns and waves, for the drawing to take once open
let busy = false;              // a save or a download is drawing; nothing else starts
let drawing = null, bones = [], binds = [];
let turns = [];                // the pose: a turn a bone, radians
let waves = [];                // a wave a bone, or null where it keeps still (motion.js)
let at = [];                   // the bones, posed at the frame on screen
let hot = null;                // the bone whose handle is under the pointer, or held
let chosen = null;             // the bone whose handle was pressed last
let showBones = true;
let asked = 0;                 // the latest drawing asked for; an older answer is dropped
let view = 1, stage = { x: 0, y: 0, width: 1, height: 1 };
let clockFps = 0;              // the rate the clock was fitted to

/** The loop's clock: what swings, swings by it. */
const clock = new Playhead({ onShow: () => repose(), onState: () => playBtn.setAttribute('aria-pressed', String(clock.playing)) });

function boot() {
  bar = new Bar({ app: 'rig', mount: document.querySelector('.app'),
                  keys: 'drag a joint · B bones · R rest · space play · S save · V vault' });
  params = rigParams();
  const panel = new ParamPanel(params, { title: 'rig', mount: document.getElementById('side'), groups: GROUPS });
  const pose = panel.addDrawer({ id: 'pose', title: 'Pose', before: 'motion' });
  const rest = document.createElement('button');
  rest.type = 'button';
  rest.className = 'nb-btn nb-btn--wide';
  rest.textContent = 'Back to rest  [R]';
  rest.addEventListener('click', toRest);
  pose.body.append(rest);
  buildExport(panel);
  chosenPanel = new ChosenBone({ mount: document.getElementById('bone-side'), onWave });

  params.on(key => {
    if (params.restoring) return;           // a rig reopened: openRequested() loads it whole
    if (key === 'drawing') return load();
    if (key === 'jump') rebuild('drawing');
    else if (key === 'corner' || key === 'longest') rebuild('bones');
    else if (key === 'bend') rebuild('skin');
    else if (key === 'length' || key === 'fps') fitClock();
  });
  wireJoints({ canvas, pictureOf, handleAt, choose, turn, hover: bone => { hot = bone; draw(); } });
  bonesBtn.addEventListener('click', () => toggleBones());
  playBtn.addEventListener('click', () => clock.toggle());
  document.getElementById('rest').addEventListener('click', toRest);
  new ResizeObserver(() => draw()).observe(canvas.parentElement);
  wireKeys();
  openRequested().then(was => {
    if (was) return;
    const wanted = new URLSearchParams(location.search).get('drawing');
    if (wanted) params.set('drawing', wanted);
    else load();
  });
}

/** `?open=<id>`: a pose or a loop back to work on (core/reopen.js) — its values, bones, turns and waves. */
async function openRequested() {
  try {
    const was = await requested('rig');
    if (!was) return false;
    const r = was.object.recipe;
    reopened = { bones: r.bones, turns: r.turns, waves: r.waves || [] };
    params.restore(r.rig);
    await load();
    bar.announce(`opened ${was.object.id} — ${was.object.title}`);
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
  bones = [];
  binds = [];
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
    if (ask !== asked) return;
    opened = was;
    if (was.missing) bar.announce(`${was.missing} of its sprites would not load: their family is not on this disk`);
    rebuild('drawing');
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
    bones = reopened.bones.map(b => ({ ...b }));
    turns = reopened.turns.slice();
    waves = reopened.waves.slice();
    reopened = null;
  } else if (from !== 'skin') {
    bones = proposeBones(drawing, { corner: v.corner, longest: v.longest });
    turns = [];
    waves = [];
    hot = null;
    choose(null);
  }
  binds = bind(drawing, bones, { bend: v.bend });
  fitClock();
  repose();
}

/** Every bone where it was drawn — the waves swing on about it — and no handle lit until the pointer finds one. */
function toRest() {
  turns = [];
  hot = null;
  repose();
}

/** Whether anything swings, and the loop it swings in. */
const moving = () => !!drawing && moves(bones, waves);
const loopLength = () => (moving() ? params.get('length') : 1);

/** The bones where the pose and the waves put them at the frame on screen, and the drawing again. */
function repose() {
  at = posed(bones, moving() ? turnsAt(bones, turns, waves, clock.tick, loopLength()) : turns);
  draw();
}

/** The clock fitted to the loop: playing while anything swings. */
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

// ── The chosen bone, and its wave ───────────────────────────────────────────

function choose(bone) {
  chosen = bone;
  const b = bone == null ? null : bones[bone];
  chosenPanel.show(bone, b ? waves[bone] : null, b ? `Bone ${bone + 1} of ${bones.length}, on stroke ${b.stroke + 1}` : '');
  draw();
}

function onWave(bone, values) {
  waves[bone] = { ...values };
  fitClock();
}

// ── Leaving: the vault, a picture ───────────────────────────────────────────

function buildExport(panel) {
  const exp = panel.addDrawer({ id: 'export', title: 'Export' });
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
  button('Download the frame (PNG)', () => leave(async () => {
    const out = await downloadRig(rigArgs());
    return `downloaded ${out.width} × ${out.height} px`;
  }));
  exp.body.append(actions);
}

const rigArgs = () => ({ params, opened, bones, turns, waves, title: opened.object.title || params.get('drawing'), tick: clock.tick });

/** One way out: the clock held still, nothing else started, what happened said. */
async function leave(action) {
  if (busy) return;
  if (!drawing) return bar.announce('nothing to save: choose a drawing first');
  busy = true;
  const was = clock.playing;
  clock.pause();
  try {
    bar.announce(await action());
  } catch (err) {
    console.error('[rig] failed:', err);
    bar.announce('failed: ' + err.message);
  } finally {
    busy = false;
    if (was) clock.play();
    Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
  }
}

/** A pose or a loop into the vault (save.js). */
function save() {
  return leave(async () => {
    bar.say('saving…');
    const object = await saveRig(rigArgs());
    if (!object) return 'no vault — downloaded instead';
    return `saved ${object.id} — ${object.title}, ${object.render.w} × ${object.render.h} px`
      + (object.render.frames ? `, ${object.render.frames} frames at ${object.render.fps} fps` : '');
  });
}

// ── Taking hold of a joint ──────────────────────────────────────────────────

/** Where a pointer is, in the picture's pixels — null with nothing drawn. */
function pictureOf(e) {
  if (!drawing) return null;
  const r = canvas.getBoundingClientRect();
  return { x: stage.x + ((e.clientX - r.left) / r.width) * stage.width,
           y: stage.y + ((e.clientY - r.top) / r.height) * stage.height };
}

/** The bone whose far end is nearest q, within reach — or null. */
function handleAt(q) {
  if (!showBones || !bones.length) return null;
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

let pending = false;

function draw() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

function paint() {
  if (!drawing) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  stage = stageOf(drawing);
  view = viewFactor(canvas, stage, 1);
  const w = Math.max(1, Math.round(stage.width * view)), h = Math.max(1, Math.round(stage.height * view));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const places = drawing.stamps.map((s, i) => placeOf(s, binds[i], bones, at));
  drawRig(ctx, drawing, places, opened.images, view, stage);
  const dpp = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
  if (showBones) drawBones(ctx, bones, at, view, stage, dpp, [hot, chosen]);

  const turned = turns.some(t => t);
  bar.output({ width: drawing.width, height: drawing.height, scale: 1 });
  bar.say(`${drawing.strokes.length} strokes · ${bones.length} bones · ${drawing.stamps.length} stamps`
    + (turned ? ' · posed' : ' · at rest')
    + (moving() ? ` · a loop of ${clock.length} at ${params.get('fps')} fps, frame ${clock.tick + 1}` : '')
    + (showBones && bones.length && !moving() ? ' — drag a joint to bend it' : ''));
}

// ── Keys, the vault ─────────────────────────────────────────────────────────

function wireKeys() {
  const vault = new VaultPanel();
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (e.key === 'b' || e.key === 'B') toggleBones();
    if (e.key === 'r' || e.key === 'R') toRest();
    if (e.key === 's' || e.key === 'S') save();
    if (e.key === ' ' && moving()) { e.preventDefault(); clock.toggle(); }
  });
  Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
}

try {
  boot();
} catch (err) {
  console.error('[rig] failed to boot:', err);
  if (bar) bar.announce('failed to boot: ' + err.message);
}
