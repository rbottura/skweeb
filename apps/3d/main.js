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
 * What leaves (leaving.js, save.js) is drawn again by frames.js at the format's size
 * times its scale: a `model` into the vault, S, or a PNG. rebuild.js replays
 * one for the vault and compose; `?open=` brings one back.
 *
 * A model can turn, on a turntable (motion.js, P1): its Motion drawer's
 * turns, a loop's frames and its rate. Core's clock plays it in the view —
 * space, and , . a frame — its handles hidden while it plays; S saves its
 * loop, a `sequence`, its picture the frame on screen; E's menu every frame.
 *
 * Opens with no vault (rule 7), on a box, a sphere and a torus. With no
 * WebGPU three draws with WebGL2, and the bar says so; with neither, the
 * page still opens and says why.
 *
 * A module since S9 (core/mount.js): `mount(host)` and `unmount()` — the
 * model's geometries and materials and the handles' gizmo let go of when it
 * goes; three's renderer is the page's, kept (renderer.js). index.html mounts
 * it on itself. Nothing happens at import.
 */

import { modelParams, GROUPS, SHAPE_CARDS, OPENING } from './params.js';
import { loopOf, seenAt, swings } from './motion.js';
import { Model }          from './scene.js';
import { drawModel }      from './frames.js';
import { frameAround, cameraFor } from './camera.js';
import { openRenderer }   from './renderer.js';
import { titleOf }        from './save.js';
import { ways }           from './leaving.js';
import { wirePointer }    from './pointer.js';
import { pick }           from './pick.js';
import { boxOnPicture, drawChosen } from './guides.js';
import { wireChosen }     from './chosen.js';
import { Transport }      from '../../core/Transport.js';
import { Playhead }       from '../../core/playback.js';
import { Cards }          from '../../core/Cards.js';
import { ParamPanel }     from '../../core/ParamPanel.js';
import { VaultPanel }     from '../../core/VaultPanel.js';
import { Bar }            from '../../core/Bar.js';
import { Vault }          from '../../core/vault.js';
import { requested, openedLine } from '../../core/reopen.js';
import { applyFrameEdit } from '../../core/frame.js';
import { viewFactor }     from '../../core/view.js';
import { whyNoGpu }       from '../../core/gpu/device.js';
import { setAppPie }      from '../../core/shell/bindings.js';
import { appModule }      from '../../core/mount.js';

/**
 * The viewer, one column of drawers, the bar below; the model drawn by
 * three.js on the page's GPU device and shown on a Canvas 2D, no p5. Over
 * the viewer, what the chosen shape's handles do, and what else can be done
 * to it (chosen.js).
 */
const MARKUP = `
  <main class="app-main">
    <section class="viewer" aria-label="model">
      <div class="viewer-head">
        <button class="nb-btn" id="handle-move" type="button" aria-pressed="true"
                title="The chosen shape's handles move it: along an arrow, or in a square's plane [W]">move</button>
        <button class="nb-btn" id="handle-turn" type="button" aria-pressed="false"
                title="Its handles turn it: about an axis by its ring, or freely inside them [E]">turn</button>
        <button class="nb-btn" id="handle-size" type="button" aria-pressed="false"
                title="Its handles size it: stretched along one of its axes by its cube, or whole by the middle one [R]">size</button>
        <span class="td-spacer"></span>
        <button class="nb-btn" id="duplicate" type="button" disabled
                title="Another of the chosen shape, beside it, chosen [D]">duplicate</button>
        <button class="nb-btn" id="remove" type="button" disabled
                title="Take the chosen shape out of the model [Delete]">remove</button>
      </div>
      <div class="viewer-stage"><canvas id="stage" width="480" height="480"></canvas></div>
    </section>
    <div class="app-side" id="side"></div>
  </main>`;

const app = appModule('3d', { markup: MARKUP, style: new URL('./style.css', import.meta.url).href, start, keep });

/** The 3D app in `host`, started — a saved model opened if the page asks for it (core/mount.js). */
export const mount = (host, given) => app.mount(host, given);
/** The 3D app out of its host, everything it held let go of: its keys, its model, its handles. */
export const unmount = () => app.unmount();
const mounted = () => !!app.scope;

// One app mounted at a time: its state, made again by each mount (`start`).
let root, canvas, ctx, model;
let params, bar, cards, shapesDrawer, chosen, renderer, failing, pending, leaving;
let clock, transport, player, framesButton, clockAt;   // the turntable's (motion.js)

async function start(host, mine) {
  root = host;
  canvas = root.querySelector('#stage');
  ctx = canvas.getContext('2d');
  const own = model = new Model();
  mine.hold(() => own.dispose());          // its geometries and materials; three's renderer is the page's
  params = bar = cards = shapesDrawer = chosen = null;
  renderer = null;         // renderer.js's, once three has a backend
  failing = '';            // why nothing draws, while nothing does
  pending = false;         // a paint asked for, not made
  leaving = null;          // the ways out (leaving.js): a save or a download drawing, nothing else starts
  transport = player = framesButton = null;
  clockAt = '';            // the loop the clock was fitted to
  // The clock plays a turntable's frames at its rate; a model that does not turn is one frame. Stopped at the unmount.
  clock = new Playhead({
    onShow: tick => { if (transport) transport.show(tick); draw(); },
    onState: () => { if (transport) transport.state(); draw(); },
  });
  mine.hold(() => clock.dispose());
  try { await boot(mine); } catch (err) { if (bar) bar.announce('failed to boot: ' + err.message); throw err; }
}

async function boot(mine) {
  bar = new Bar({ app: '3d', mount: root,
                  keys: 'click choose · drag turn · shift-drag slide · wheel zoom · A handles · F frame · space play · , . frame · S save · V vault · R C a BEC grid anew' });
  params = modelParams();
  const panel = new ParamPanel(params, { title: '3d', mount: root.querySelector('#side'), groups: GROUPS });

  shapesDrawer = panel.addDrawer({ id: 'shapes', title: 'Shapes', before: 'view' });
  // A card changed: the loop fitted again — a shape set swinging makes the model one, and plays it (P2).
  cards = new Cards({ ...SHAPE_CARDS, mount: shapesDrawer.body, onChange: () => { const was = clock.length > 1; fitClock();
    if (!was && clock.length > 1 && !clock.playing) clock.play(); draw(); }, onChoose: draw });
  model.onInks = () => draw();             // a palette of the vault a shape names, come: drawn again in it (palettes.js)
  chosen = wireChosen({ cards, model, onChange: draw, root });
  const handles = chosen.handles;
  mine.hold(() => handles.dispose());
  const frame = button('Frame the model  [F]', frameAll);
  frame.classList.add('td-frame');
  panel.drawer('view').body.append(frame);
  player = panel.addDrawer({ id: 'player', title: 'Sequence player', before: 'format' });
  transport = new Transport({ clock, mount: player.body, busy: () => !!leaving && leaving.busy() });
  leaving = ways(panel, { bar, params, clock,
    now: () => ({ shapes: cards.recipe(), renderer, why: failing || 'three is still starting' }),
    after: () => { refreshVault(); draw(); } });
  framesButton = leaving.frames;

  params.on(key => {
    applyFrameEdit(params, key);
    fitClock();
    // Turns given where there were none: the turntable plays at once. A recipe arriving keeps its clock still.
    if (key === 'turns' && !params.restoring && loopOf(params.values).loop && !clock.playing) clock.play();
    draw();
  });
  const sized = new ResizeObserver(() => draw());
  sized.observe(canvas.parentElement);
  mine.hold(() => sized.disconnect());
  wirePointer({ canvas, params, onClick: chooseAt, handles: chosen.handles });
  wireKeys(mine);
  for (const s of OPENING) cards.add(s.id, s.params);

  try {
    const opened = await openRenderer();
    if (mine.closed) return;
    renderer = opened;
    if (renderer.backend !== 'WebGPU') bar.announce(`drawn with ${renderer.backend}: ${whyNoGpu() || 'no WebGPU here'}`);
  } catch (err) {
    failing = err.message;
    bar.announce('nothing here draws in 3D — ' + err.message);
  }
  await openRequested();
  fitClock();
  draw();
}

/** The clock fitted to the turntable the values make (motion.js): its frames at its rate, or one still frame. */
function fitClock() {
  if (!params || !transport) return;
  const { length, fps, loop } = loopOf({ ...params.values, shapes: cards ? cards.recipe() : [] });
  const key = `${length}@${fps}`;
  if (key !== clockAt) {
    const was = clock.playing && loop;
    clock.configure({ length, fps: fps || 24, loop: true });
    transport.configure();
    clockAt = key;
    if (was) clock.play();
    else clock.pause();
  }
  player.hidden = !loop;
  if (framesButton) framesButton.hidden = !loop;
  player.note(loop ? `${length} frames · ${(length / fps).toFixed(2)} s, a loop` : '');
}

/** The values the frame on screen is seen with, its shapes with them: the turntable's and their swings', at the clock's tick (motion.js). */
const seen = () => {
  const v = { ...params.values, shapes: cards.recipe() };
  return seenAt(v, loopOf(v).loop ? clock.tick : 0);
};

/** `?open=<id>`: a saved model back to work on (core/reopen.js), shape for shape. */
async function openRequested() {
  try {
    const opened = await requested('3d');
    if (!opened || !mounted()) return;
    const recipe = opened.object.recipe || {};
    params.restore(recipe);
    const unknown = cards.restore(recipe.shapes);
    bar.announce(openedLine(opened) + (unknown.length ? ` · not known here: ${unknown.join(', ')}` : ''));
  } catch (err) {
    bar.announce('could not open it: ' + err.message);
  }
}

/** What it is doing, for a scene to give back (core/mount.js): its values and its shapes, card for card. */
function keep() {
  return params && cards ? { type: 'model', recipe: { ...params.values, shapes: cards.recipe() } } : null;
}

// ── Drawing ──────────────────────────────────────────────────────────────────

function draw() {
  if (pending || !mounted()) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

function paint() {
  if (!mounted() || !params || !chosen) return;
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
  const at = seen();                       // the frame on screen: the turntable's, the sun with it, its shapes swung
  model.update(at);
  const camera = cameraFor(at, w, h);
  // Its handles and its box hidden while it plays — a moving picture is watched, not worked on — and on a
  // shape that swings: a handle would write the wave's moment into its place (P2).
  const still = !clock.playing && !(cards.chosen && swings({ params: cards.chosen.params.values }));
  const part = still ? model.partAt(cards.chosenIndex) : null;
  const { handles } = chosen;
  handles.attach(part && part.mesh);
  handles.see(camera);
  drawModel(ctx, renderer, model, at, w, h, camera);
  const box = part && boxOnPicture(part.mesh, camera, w, h);
  if (box) drawChosen(ctx, box, w / Math.max(1, canvas.getBoundingClientRect().width));
  if (handles.shown) {
    const gizmo = renderer.draw(handles.scene, camera, w, h);
    ctx.drawImage(gizmo, 0, 0);
    gizmo.close();
  }
  bar.say(describe(at, shapes));
}

/** The bar's line: what the model is, where it is seen from — on a turntable, the frame's — and WebGL2 when that draws. */
function describe(v, shapes) {
  const lens = v.lens === 'orthographic' ? 'orthographic' : `${v.fov}° lens`;
  const yaw = (((Math.round(v.yaw) + 180) % 360) + 360) % 360 - 180;
  return `${titleOf(shapes)} · turned ${yaw}°, raised ${Math.round(v.pitch)}°, `
    + `${+v.distance.toPrecision(3)} away · ${lens}` + (renderer.backend === 'WebGPU' ? '' : ` · ${renderer.backend}`);
}

/**
 * A click on the picture: the shape under it chosen — its card open, the
 * shapes drawer too — or none, on nothing. Seen as it was last drawn.
 */
function chooseAt([x, y]) {
  if (!renderer) return;
  const hit = pick(model, cameraFor(seen(), canvas.width, canvas.height), x, y);
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

// ── A button of the panel's — the ways out are leaving.js's ─────────────────

function button(label, onClick, primary = false) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'nb-btn nb-btn--wide' + (primary ? ' nb-btn--primary' : '');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

// ── Keys ─────────────────────────────────────────────────────────────────────

function wireKeys(mine) {
  // The left hand (core/shell/bindings.js): A the handles' mode — move, turn, size — tapped the next.
  const MODES = ['move', 'turn', 'size'], modeOf = m => root.querySelector('#handle-' + m);
  const now = () => MODES.find(m => modeOf(m)?.getAttribute('aria-pressed') === 'true') || 'move';
  // BEC's grid chosen (grid.js, M13a): its draws again, as BEC's keys had them — new edges (R, core's),
  // new colours (C), so many faces filled (q s d: four, six, eight).
  const grid = () => (cards.chosen && cards.chosen.item.id === 'grid' ? cards.chosen.params : null);
  const again = (p, key) => p.set(key, p.get(key) + 1);
  const becActs = p => [
    { label: 'new edges', run: () => again(p, 'seed') },
    { label: 'new colours', run: () => again(p, 'hues') },
    ...[4, 6, 8].map(n => ({ label: `${n} faces filled`, on: p.get('faces') === n, run: () => { p.set('faces', n); again(p, 'fill'); } })),
  ];
  setAppPie({
    title: 'handles',
    items: () => [...MODES.map(m => ({ label: m, on: now() === m, run: () => modeOf(m)?.click() })), ...(grid() ? becActs(grid()) : [])],
    tap: () => modeOf(MODES[(MODES.indexOf(now()) + 1) % MODES.length])?.click(),
  });
  let vault = null;
  // Heard before the vault panel's own keys, so an Escape that closes the
  // panel is seen as that, and lets go of no shape.
  mine.listen(document, 'keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (!vault.isOpen && chosen.key(e)) return;
    // A turntable's clock (motion.js): space plays it or holds it, , and . a frame back and on.
    if (loopOf(params.values).loop && [' ', ',', '.'].includes(e.key)) {
      e.preventDefault();
      if (e.key === ' ') clock.toggle();
      else { clock.pause(); clock.step(e.key === ',' ? -1 : 1); }
      return;
    }
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (e.key === 's' || e.key === 'S') leaving.save();
    if (e.key === 'f' || e.key === 'F') frameAll();
    if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey && grid()) again(grid(), 'hues');   // BEC's c
    if (e.key === 'Escape' && !vault.isOpen) cards.choose(null);
  });
  vault = new VaultPanel();
  refreshVault();
}

function refreshVault() {
  Vault.refresh().then(ok => { if (bar) bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'); });
}
