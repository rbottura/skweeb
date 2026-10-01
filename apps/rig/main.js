/**
 * main.js — the rig, assembled. M9: a drawing made of marks, rigged at its
 * marks (docs/roadmap.md).
 *
 * A gamepad still is chosen — in the Drawing drawer, or `?drawing=<id>` —
 * and its strokes become its bones (bones.js), each stamp carried by its own
 * stroke's (skin.js). The drawing is drawn again from its marks (draw.js),
 * the bones over it (guides.js, B); a bone's far end, dragged, turns it, and
 * the stamps follow, whole, crowding and fanning at the joints. R puts every
 * bone back where it was drawn. With no vault it opens, empty, and says so
 * (rule 7). Nothing is saved yet: a rig saved is M9's second brick.
 */

import { rigParams, GROUPS } from './params.js';
import { drawingOf, hasMarks, spritesOf } from './drawing.js';
import { proposeBones, posed, tipOf, turnToward } from './bones.js';
import { bind, placeOf } from './skin.js';
import { drawRig, stageOf } from './draw.js';
import { drawBones } from './guides.js';
import { wireJoints } from './pointer.js';
import { familySprite } from '../../core/sprites.js';
import { ParamPanel }   from '../../core/ParamPanel.js';
import { VaultPanel }   from '../../core/VaultPanel.js';
import { Bar }          from '../../core/Bar.js';
import { Vault }        from '../../core/vault.js';
import { viewFactor }   from '../../core/view.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const bonesBtn = document.getElementById('bones');
const REACH = 14;              // CSS pixels: how near a handle a press takes hold of it

let params, bar;
let recipe = null;             // the still's recipe, when it has marks
let images = new Map();        // its sprites, by drawing.js spriteKey
let drawing = null, bones = [], binds = [];
let turns = [];                // the pose: a turn a bone, radians — the editor's, never saved
let at = [];                   // the bones, posed
let hot = null;                // the bone whose handle is under the pointer, or held
let showBones = true;
let asked = 0;                 // the latest drawing asked for; an older answer is dropped
let view = 1, stage = { x: 0, y: 0, width: 1, height: 1 };

function boot() {
  bar = new Bar({ app: 'rig', mount: document.querySelector('.app'),
                  keys: 'drag a joint · B bones · R rest · V vault' });
  params = rigParams();
  const panel = new ParamPanel(params, { title: 'rig', mount: document.getElementById('side'), groups: GROUPS });
  const pose = panel.addDrawer({ id: 'pose', title: 'Pose' });
  const rest = document.createElement('button');
  rest.type = 'button';
  rest.className = 'nb-btn nb-btn--wide';
  rest.textContent = 'Back to rest  [R]';
  rest.addEventListener('click', toRest);
  pose.body.append(rest);

  params.on(key => {
    if (key === 'drawing') return load();
    if (key === 'jump') rebuild('drawing');
    else if (key === 'corner' || key === 'longest') rebuild('bones');
    else if (key === 'bend') rebuild('skin');
  });
  wireJoints({ canvas, pictureOf, handleAt, turn, hover: bone => { hot = bone; draw(); } });
  bonesBtn.addEventListener('click', () => toggleBones());
  document.getElementById('rest').addEventListener('click', toRest);
  new ResizeObserver(() => draw()).observe(canvas.parentElement);
  wireKeys();
  const wanted = new URLSearchParams(location.search).get('drawing');
  if (wanted) params.set('drawing', wanted);
  else load();
}

/** The drawing chosen, opened: its marks and the sprites they were stamped with. */
async function load() {
  const ask = ++asked;
  const id = params.get('drawing');
  recipe = null;
  drawing = null;
  bones = [];
  binds = [];
  turns = [];
  at = [];
  if (!id) {
    bar.say('Choose a drawing: a gamepad still — its strokes become its bones.');
    return draw();
  }
  bar.say('opening…');
  try {
    const { object } = await Vault.load(id);
    if (!hasMarks(object.recipe)) {
      if (ask === asked) bar.say(`${object.title || id} has no marks to rig — a gamepad drawing has; a picture without them waits for a mesh.`);
      return draw();
    }
    const wanted = spritesOf(object.recipe);
    const loaded = new Map();
    let missing = 0;
    await Promise.all([...wanted].map(async ([key, [familyId, index]]) => {
      const image = await familySprite(familyId, index);
      if (image) loaded.set(key, image);
      else missing++;
    }));
    if (ask !== asked) return;
    recipe = object.recipe;
    images = loaded;
    if (missing) bar.announce(`${missing} of its sprites would not load: their family is not on this disk`);
    rebuild('drawing');
  } catch (err) {
    if (ask === asked) bar.say('could not open the drawing: ' + err.message);
  }
}

/** The proposal again from where a value changed: the strokes, the bones, or how stamps are shared. */
function rebuild(from) {
  if (!recipe) return draw();
  const v = params.values;
  if (from === 'drawing') drawing = drawingOf(recipe, { jump: v.jump });
  if (from !== 'skin') {
    bones = proposeBones(drawing, { corner: v.corner, longest: v.longest });
    turns = [];
    hot = null;
  }
  binds = bind(drawing, bones, { bend: v.bend });
  repose();
}

/** Every bone where it was drawn; no handle lit until the pointer moves over one again. */
function toRest() {
  turns = [];
  hot = null;
  repose();
}

/** The bones where the pose puts them, and the drawing again. */
function repose() {
  at = posed(bones, turns);
  draw();
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
  drawRig(ctx, drawing, places, images, view, stage);
  const dpp = canvas.width / Math.max(1, canvas.getBoundingClientRect().width);
  if (showBones) drawBones(ctx, bones, at, view, stage, dpp, hot);

  const turned = turns.some(t => t);
  bar.output({ width: drawing.width, height: drawing.height, scale: 1 });
  bar.say(`${drawing.strokes.length} strokes · ${bones.length} bones · ${drawing.stamps.length} stamps`
    + (turned ? ' · posed' : ' · at rest') + (showBones && bones.length ? ' — drag a joint to bend it' : ''));
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
  });
  Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
}

try {
  boot();
} catch (err) {
  console.error('[rig] failed to boot:', err);
  if (bar) bar.announce('failed to boot: ' + err.message);
}
