/**
 * main.js — the 3D app, assembled. M10's first brick: primitives made from
 * their params, seen from anywhere, saved as a `model`.
 *
 * A model is its shapes — each a card drawn from its primitive's schema in
 * core's cards (core/Cards.js, shapes.js) — and the view, the light and the
 * format in the panel (params.js). The scene is kept in step with both
 * (scene.js) and drawn by three.js on the page's one GPU device
 * (renderer.js), at the size the viewer shows (core/view.js), over the
 * ground. A drag turns round it, shift or the right button slides it, the
 * wheel comes nearer (pointer.js); F frames every shape. A click chooses the
 * shape under it (pick.js) — its card the one open, its box dashed over the
 * picture (guides.js) — and on nothing, or Escape, chooses none. The chosen
 * shape has handles, drawn over the picture from a scene of their own, and
 * can be duplicated or taken out (chosen.js, handles.js).
 *
 * What leaves (save.js) is drawn again by frames.js at the format's size
 * times its scale: a `model` into the vault, S, or a PNG. rebuild.js replays
 * one for the vault and compose; `?open=` brings one back.
 *
 * Opens with no vault (rule 7), on a box, a sphere and a torus. With no
 * WebGPU three draws with WebGL2, and the bar says so; with neither, the
 * page still opens and says why.
 */

import { modelParams, GROUPS, SHAPE_CARDS, OPENING } from './params.js';
import { Model }          from './scene.js';
import { drawModel }      from './frames.js';
import { frameAround, cameraFor } from './camera.js';
import { openRenderer }   from './renderer.js';
import { saveModel, downloadPicture, titleOf, APP } from './save.js';
import { wirePointer }    from './pointer.js';
import { pick }           from './pick.js';
import { boxOnPicture, drawChosen } from './guides.js';
import { wireChosen }     from './chosen.js';
import { PrintPanel }     from '../../core/PrintPanel.js';
import { exportBox }      from '../../core/boxes/export.js';
import { stackDrawer }    from '../../core/StackPanel.js';
import { Cards }          from '../../core/Cards.js';
import { ParamPanel }     from '../../core/ParamPanel.js';
import { VaultPanel }     from '../../core/VaultPanel.js';
import { Bar }            from '../../core/Bar.js';
import { Vault }          from '../../core/vault.js';
import { requested }      from '../../core/reopen.js';
import { applyFrameEdit } from '../../core/frame.js';
import { viewFactor }     from '../../core/view.js';
import { whyNoGpu }       from '../../core/gpu/device.js';

const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const model = new Model();

let params, bar, cards, shapesDrawer, chosen;
let renderer = null;     // renderer.js's, once three has a backend
let failing = '';        // why nothing draws, while nothing does
let busy = false;        // a save or a download is drawing; nothing else starts

async function boot() {
  bar = new Bar({ app: '3d', mount: document.querySelector('.app'),
                  keys: 'click choose · drag turn · shift-drag slide · wheel zoom · F frame · S save · V vault' });
  params = modelParams();
  const panel = new ParamPanel(params, { title: '3d', mount: document.getElementById('side'), groups: GROUPS });

  shapesDrawer = panel.addDrawer({ id: 'shapes', title: 'Shapes', before: 'view' });
  cards = new Cards({ ...SHAPE_CARDS, mount: shapesDrawer.body, onChange: draw, onChoose: draw });
  chosen = wireChosen({ cards, model, onChange: draw });
  const frame = button('Frame the model  [F]', frameAll);
  frame.classList.add('td-frame');
  panel.drawer('view').body.append(frame);
  buildExport(panel);

  params.on(key => {
    applyFrameEdit(params, key);
    draw();
  });
  new ResizeObserver(() => draw()).observe(canvas.parentElement);
  wirePointer({ canvas, params, onClick: chooseAt, handles: chosen.handles });
  wireKeys();
  for (const s of OPENING) cards.add(s.id, s.params);

  try {
    renderer = await openRenderer();
    if (renderer.backend !== 'WebGPU') bar.announce(`drawn with ${renderer.backend}: ${whyNoGpu() || 'no WebGPU here'}`);
  } catch (err) {
    failing = err.message;
    bar.announce('nothing here draws in 3D — ' + err.message);
  }
  await openRequested();
  draw();
}

/** `?open=<id>`: a saved model back to work on (core/reopen.js), shape for shape. */
async function openRequested() {
  try {
    const opened = await requested('3d');
    if (!opened) return;
    const recipe = opened.object.recipe || {};
    params.restore(recipe);
    const unknown = cards.restore(recipe.shapes);
    bar.announce(`opened ${opened.object.id} — ${opened.object.title}`
      + (unknown.length ? ` · not known here: ${unknown.join(', ')}` : ''));
  } catch (err) {
    bar.announce('could not open it: ' + err.message);
  }
}

// ── Drawing ──────────────────────────────────────────────────────────────────

let pending = false;

function draw() {
  if (pending) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

function paint() {
  const v = params.values;
  const size = { width: v.width, height: v.height };
  const view = viewFactor(canvas, size, v.scale);
  const w = Math.max(1, Math.round(size.width * view));
  const h = Math.max(1, Math.round(size.height * view));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  const shapes = cards.recipe();
  const { on, all } = cards.counts;
  shapesDrawer.note(all ? (on === all ? `${all}` : `${on} of ${all} shown`) : '');
  bar.output({ width: Math.round(v.width * v.scale), height: Math.round(v.height * v.scale), scale: v.scale, format: v.format });
  chosen.paint();
  if (!renderer) {
    ctx.clearRect(0, 0, w, h);
    if (failing) bar.say('nothing draws here — ' + failing);
    return;
  }
  model.update({ ...v, shapes });
  const camera = cameraFor(v, w, h);
  const part = model.partAt(cards.chosenIndex);
  const { handles } = chosen;
  handles.attach(part && part.mesh);
  handles.see(camera);
  drawModel(ctx, renderer, model, v, w, h, camera);
  const box = part && boxOnPicture(part.mesh, camera, w, h);
  if (box) drawChosen(ctx, box, w / Math.max(1, canvas.getBoundingClientRect().width));
  if (handles.shown) {
    const gizmo = renderer.draw(handles.scene, camera, w, h);
    ctx.drawImage(gizmo, 0, 0);
    gizmo.close();
  }
  bar.say(describe(v, shapes));
}

/** The bar's line: what the model is, where it is seen from, and WebGL2 when that is what draws. */
function describe(v, shapes) {
  const lens = v.lens === 'orthographic' ? 'orthographic' : `${v.fov}° lens`;
  return `${titleOf(shapes)} · turned ${Math.round(v.yaw)}°, raised ${Math.round(v.pitch)}°, `
    + `${+v.distance.toPrecision(3)} away · ${lens}` + (renderer.backend === 'WebGPU' ? '' : ` · ${renderer.backend}`);
}

/**
 * A click on the picture: the shape under it chosen — its card open, the
 * shapes drawer too — or none, on nothing. Seen as it was last drawn.
 */
function chooseAt([x, y]) {
  if (!renderer) return;
  const hit = pick(model, cameraFor(params.values, canvas.width, canvas.height), x, y);
  if (hit) shapesDrawer.open = true;
  cards.choose(hit ? hit.index : null);
}

/** Every shape in view, from where it is seen now. */
function frameAll() {
  const v = params.values;
  model.update({ ...v, shapes: cards.recipe() });
  const round = model.bounds();
  if (!round) return bar.announce('nothing to frame');
  params.set(frameAround(v, round.centre, round.radius, v.width, v.height));
}

// ── Leaving ──────────────────────────────────────────────────────────────────

function button(label, onClick, primary = false) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'nb-btn nb-btn--wide' + (primary ? ' nb-btn--primary' : '');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function buildExport(panel) {
  const exp = exportBox(panel, {
    before: 'format',
    vault: { save },
    disk: {
      picture: () => leave(async () => {
        bar.say('drawing…');
        const out = await downloadPicture({ params, shapes: cards.recipe(), renderer });
        return `downloaded ${out.width} × ${out.height} px`;
      }),
    },
  }).drawer;
  const printing = buildPrint(exp);
  // A window of the stack (core/live.js): what is on screen, as its print has it.
  stackDrawer(panel, { app: '3d', layer: () => printing.object(), save: () => save() });
}

/**
 * A print (core/PrintPanel.js): the model as it stands, drawn again at a
 * sheet's size and a dpi a window at a time (frames.js `window`) — no
 * preview, one file. Its rows are its own, never the recipe's; a print
 * format chosen in the Format drawer becomes its sheet.
 */
function buildPrint(exp) {
  const printing = new PrintPanel({
    mount: exp.body, app: '3d', leave, say: text => bar.say(text), format: params.values.format,
    object: () => renderer && ({
      type: 'model', origin: APP, recipe: { ...params.values, shapes: cards.recipe() },
      render: { w: Math.round(params.values.width * params.values.scale), h: Math.round(params.values.height * params.values.scale) },
    }),
  });
  params.on(key => { if (key === 'format') printing.follow(params.values.format); });
  return printing;
}

/** One way out: nothing else started, what happened said. */
async function leave(action) {
  if (busy) return;
  if (!renderer) return bar.announce('nothing draws here — ' + (failing || 'three is still starting'));
  busy = true;
  try {
    bar.announce(await action());
  } catch (err) {
    console.error('[3d] failed:', err);
    bar.announce('failed: ' + err.message);
  } finally {
    busy = false;
    Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
    draw();
  }
}

/** The model as it stands into the vault (save.js). */
function save() {
  return leave(async () => {
    bar.say('saving…');
    const object = await saveModel({ params, shapes: cards.recipe(), renderer });
    if (!object) return 'no vault — downloaded instead';
    return `saved ${object.id} — ${object.title}`;
  });
}

// ── Keys ─────────────────────────────────────────────────────────────────────

function wireKeys() {
  let vault = null;
  // Heard before the vault panel's own keys, so an Escape that closes the
  // panel is seen as that, and lets go of no shape.
  document.addEventListener('keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (!vault.isOpen && chosen.key(e)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (e.key === 's' || e.key === 'S') save();
    if (e.key === 'f' || e.key === 'F') frameAll();
    if (e.key === 'Escape' && !vault.isOpen) cards.choose(null);
  });
  vault = new VaultPanel();
  Vault.refresh().then(ok => bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'));
}

boot().catch(err => {
  console.error('[3d] failed to boot:', err);
  if (bar) bar.announce('failed to boot: ' + err.message);
});
