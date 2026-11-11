/**
 * main.js — particles, assembled. M6: the app plays, dots or a set's sprites.
 *
 * The emitter on the left, the picture between, the picture's settings on
 * the right. Every frame is `particlesAt(recipe, tick / fps)` (model.js) —
 * nothing stepped, nothing carried over — so a scrub, a step back or a jump
 * to frame 900 is the frame playing would have reached, and a stream's loop
 * closes on its last frame. Drawn by draw.js at the size the viewer shows
 * (core/view.js).
 *
 * A set from the vault is the sprites (sprites.js), one each; with none, or
 * no vault at all, the particles are dots and the app plays the same
 * (rule 7). A palette from the vault colours them (dye.js), and a picture
 * from it may stand in front, fitted to the format (draw.js `drawOverlay`).
 * An emitter may be an object from the vault — a dot-set, a
 * shape — and a field may come from one — a fractal: its points, its field,
 * loaded beside the recipe (core/points.js, core/fields.js). S saves the loop (save.js), and the vault plays it back through
 * rebuild.js; `?open=<id>` brings a saved one back to work on.
 *
 * A module since S9 (core/mount.js): `mount(host)` and `unmount()`, so a
 * scene can mount another in its place; index.html mounts it on itself, and
 * it runs alone as ever (rule 7). Nothing happens at import.
 */

import { emitParams, pictureParams, toModel, framesOf, EMIT_GROUPS, PICTURE_GROUPS } from './params.js';
import { prepare, particlesAt } from './model.js';
import { drawPicture, pictureSize } from './draw.js';
import { loadSprites }  from '../../core/sprites.js';
import { loadPalette }  from '../../core/palettes.js';
import { loadPoints }   from '../../core/points.js';
import { loadField }    from '../../core/fields.js';
import { APP } from './save.js';
import { ways } from './leaving.js';
import { PrintPanel }     from '../../core/PrintPanel.js';
import { exportBox }      from '../../core/boxes/export.js';
import { stackDrawer }    from '../../core/StackPanel.js';
import { requested, openedLine } from '../../core/reopen.js';
import { ParamPanel }     from '../../core/ParamPanel.js';
import { VaultPanel }     from '../../core/VaultPanel.js';
import { Transport }      from '../../core/Transport.js';
import { Bar }            from '../../core/Bar.js';
import { Playhead }       from '../../core/playback.js';
import { Vault }          from '../../core/vault.js';
import { applyFrameEdit } from '../../core/frame.js';
import { viewFactor }     from '../../core/view.js';
import { drawGuides }     from './guides.js';
import { selected }       from '../../core/shell/guides.js';
import { setAppPie, setOverlay, enumPie } from '../../core/shell/bindings.js';
import { wirePointer }    from './pointer.js';
import { appModule }      from '../../core/mount.js';

/**
 * Three columns, as compose has: what the particles do on the left, the
 * picture between, the picture's own settings on the right. The bar under
 * all three is core's. No p5: Canvas 2D.
 */
const MARKUP = `
  <main class="app-main">
    <div class="app-side" id="emit-side"></div>
    <section class="viewer" aria-label="particles">
      <div class="viewer-head">
        <button class="nb-btn" id="guides" type="button" aria-pressed="true"
                title="The emitter, the fields and the pull over the preview, with handles to drag — never saved [Z]">guides</button>
      </div>
      <div class="viewer-stage"><canvas id="stage" width="480" height="300"></canvas></div>
    </section>
    <div class="app-side" id="picture-side"></div>
  </main>`;

const app = appModule('particles', { markup: MARKUP, style: new URL('./style.css', import.meta.url).href, start, keep });

/** particles in `host`, started — a saved one opened if the page asks for it (core/mount.js). */
export const mount = (host, given) => app.mount(host, given);
/** particles out of its host, everything it held let go of: its keys, its windows, its clock. */
export const unmount = () => app.unmount();
const mounted = () => !!app.scope;

// One app mounted at a time: its state, made again by each mount (`start`).
let root, canvas, ctx, guidesBtn, clock, emit, picture, bar, transport, player;
let clockFps, shownView, guidesOn, model, shown, sprites, spritesTitle, loading, spritesIn, asked;
let given, asking, coming, leaving, painted, pending;

async function start(at, mine) {
  root = at;
  canvas = root.querySelector('#stage');
  ctx = canvas.getContext('2d');
  guidesBtn = root.querySelector('#guides');
  clockFps = 0;
  shownView = 1;           // canvas pixels per picture pixel, as last painted
  guidesOn = remembered(); // the guides over the preview: the viewer's, not the recipe's
  model = null;            // the recipe, prepared: remade when a value changes, not every frame
  shown = [];              // the particles on screen, for the bar
  sprites = null;          // the chosen set's images, or null: dots
  spritesTitle = '';       // and its title, for a saved object's
  loading = false;         // a set is on its way in: nothing saves until it is
  spritesIn = Promise.resolve();   // the set on its way in, for a reopen to wait on
  asked = 0;               // the latest set asked for; an older answer is dropped
  given = { points: null, field: null, palette: null, overlay: null };   // what the recipe names, loaded beside it
  asking = { points: 0, field: 0, palette: 0, overlay: 0 };              // the latest asked for, as `asked` is
  coming = new Set();      // loads on their way in, for a reopen and a save to wait on
  leaving = null;          // the ways out (leaving.js): a save or a download drawing, nothing else starts
  painted = [];            // when the last paints were, while playing
  pending = false;         // a paint asked for, not yet made
  emit = picture = bar = transport = player = null;
  // The clock plays the picture's frames at its rate; a tick is a time, tick / fps. Stopped at the unmount.
  clock = new Playhead({
    onShow: tick => { if (transport) transport.show(tick); draw(); },
    onState: () => { if (transport) transport.state(); if (!clock.playing && bar) bar.rate(null); },
  });
  mine.hold(() => clock.dispose());
  try {
    await boot(mine);
  } catch (err) {
    if (bar) bar.announce('failed to boot: ' + err.message);
    throw err;
  }
}

async function boot(mine) {
  bar = new Bar({ app: 'particles', mount: root,
                  keys: 'drag the handles · Z guides · A emitter · F place · space play · , . frame · S save · V vault' });
  emit = emitParams();
  picture = pictureParams();
  new ParamPanel(emit, { title: 'particles', mount: root.querySelector('#emit-side'), groups: EMIT_GROUPS });
  const side = new ParamPanel(picture, { title: 'picture', mount: root.querySelector('#picture-side'),
                                         groups: PICTURE_GROUPS });

  player = side.drawer('player');
  const holder = document.createElement('div');
  player.body.prepend(holder);
  transport = new Transport({ clock, mount: holder, busy: () => !!leaving && leaving.busy() });
  buildExport(side);

  emit.on(key => {
    if (key === 'shape' || key === 'from' || key === 'glyph') bring('points');
    else if (key === 'fieldFrom') bring('field');
    else remake();
  });
  picture.on(key => {
    applyFrameEdit(picture, key);
    if (key === 'fps') remake();
    else if (key === 'sprites') spritesIn = chooseSprites(picture.get('sprites'), { following: picture.following });
    else if (key === 'palette' || key === 'overlay') bring(key);
    else draw();
  });
  const sized = new ResizeObserver(() => draw());
  sized.observe(canvas.parentElement);
  mine.hold(() => sized.disconnect());
  wirePointer({ canvas, view: () => shownView, emit, picture, guides: () => guidesOn, chose: () => draw(),
               overlay: () => given.overlay && given.overlay.images[0] });
  guidesBtn.addEventListener('click', () => showGuides(!guidesOn));
  showGuides(guidesOn);
  // The left hand (core/shell/bindings.js): Z shows the guides — G is the ground's since S5b — and A picks the emitter's shape.
  setOverlay({ label: 'guides', on: () => guidesOn, toggle: () => showGuides(!guidesOn) });
  setAppPie(enumPie(emit, 'shape', 'emitter'));
  wireKeys(mine);
  remake();
  if (await openRequested() || mine.closed) return;
  clock.play();
}

/**
 * `?open=<id>`: a saved loop or still back to work on (core/reopen.js) —
 * both panels as they were, its sprites with them, at the frame it kept.
 *
 * @returns {Promise<boolean>} whether anything was opened
 */
async function openRequested() {
  try {
    const opened = await requested('particles');
    if (!opened || !mounted()) return false;
    const { recipe } = opened.object;
    emit.restore(recipe.emit);
    picture.restore(recipe.picture);
    await spritesIn;
    await Promise.all([...coming]);
    clock.show(Math.min(Number.isInteger(recipe.tick) ? recipe.tick : 0, clock.length - 1));
    if (opened.kept && opened.object.playing) clock.play();
    bar.announce(openedLine(opened));
    return true;
  } catch (err) {
    bar.announce('could not open it: ' + err.message);
    return false;
  }
}

/** What it is doing, for a scene to give back (core/mount.js): both panels, the frame on screen, whether it plays. */
function keep() {
  if (!emit || !picture || !clock) return null;
  return { type: 'sequence', recipe: { emit: emit.values, picture: picture.values, tick: clock.tick }, playing: clock.playing };
}

/**
 * The recipe changed: prepare it once, and fit the clock to how long the
 * picture now lasts — kept at the frame it was on, playing if it was.
 */
function remake() {
  const e = emit.values, p = picture.values;
  model = prepare(toModel(e, p), given);
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

/**
 * A set chosen as the sprites (sprites.js): dots until it is in, and dots if it will not come. A smart object
 * held, at its new version (L11): the sprites on screen kept until the new ones are in — no dots between.
 */
async function chooseSprites(id, { following = false } = {}) {
  const ask = ++asked;
  if (!following) {
    sprites = null;
    spritesTitle = '';
    loading = !!id;
    draw();
  }
  if (!id) return;
  try {
    const set = await loadSprites(id);
    if (ask !== asked) return;
    sprites = set.images.length ? set.images : null;
    spritesTitle = set.title;
    bar.announce(`${set.title}: ${set.images.length} sprite${set.images.length === 1 ? '' : 's'}`
      + (set.missing ? ` — ${set.missing} would not load` : '') + (sprites ? '' : ' — drawing dots'));
  } catch (err) {
    if (ask !== asked) return;
    bar.announce(`could not open the sprites: ${err.message} — drawing dots`);
  }
  loading = false;
  draw();
}

const pointsSaid = got => `${got.title}: ${got.list.length.toLocaleString('en')} point${got.list.length === 1 ? '' : 's'} to leave from`
  + (got.glyphs > 1 ? ` · glyph ${got.glyph + 1} of ${got.glyphs}` : '');

/** What is loaded beside the recipe: which object it names now, how that is read, what the bar says of it, and its name if it will not come. */
const BROUGHT = {
  points:  { named: e => (e.shape === 'object' ? e.from : null), read: (id, e) => loadPoints(id, { glyph: e.glyph }),
             said: pointsSaid, called: "the emitter's object" },
  field:   { named: e => e.fieldFrom, read: id => loadField(id),
             said: got => `${got.title}: a field to move through`, called: 'the field' },
  palette: { named: (e, p) => p.palette, read: id => loadPalette(id),
             said: got => `${got.title}: ${got.colours.length} colour${got.colours.length === 1 ? '' : 's'}`, called: 'the palette' },
  overlay: { named: (e, p) => p.overlay, read: id => loadSprites(id),
             said: got => (got.images.length ? `${got.title}: in front of the picture, fitted to its format` : `${got.title} would not load`), called: 'the overlay' },
};

/**
 * Load what the recipe names beside it: the object the emitter leaves from
 * (core/points.js), the field it moves through (core/fields.js), the palette
 * it is drawn in (core/palettes.js), the picture in front (core/sprites.js).
 * Until it is in, and if it will not come, the particles do without — from
 * the emitter's centre, with no such pull, in their own colours, with nothing
 * in front; an older answer is dropped for a newer ask.
 */
function bring(what) {
  const ask = ++asking[what];
  const { named, read, said, called } = BROUGHT[what];
  const e = emit.values;
  const id = named(e, picture.values);
  given[what] = null;
  remake();
  if (!id) return;
  const done = read(id, e).then(got => {
    if (ask !== asking[what]) return;
    given[what] = got;
    bar.announce(said(got));
  }, err => {
    if (ask === asking[what]) bar.announce(`could not open ${called}: ${err.message}`);
  }).finally(() => {
    coming.delete(done);
    if (ask === asking[what] && mounted()) remake();
  });
  coming.add(done);
}

// ── Leaving: a loop, a still, the frames ─────────────────────────────────────

/** The Export drawer, under the picture's settings, and the ways out it offers (leaving.js). */
function buildExport(side) {
  leaving = ways({ bar, clock, args: () => ({ emit, picture, sprites, spritesTitle, ...given }),
                   loading: () => loading || coming.size > 0, after: () => { refreshVault(); draw(); } });
  const { save, leave } = leaving;
  const exp = exportBox(side, {
    vault: { save: () => save(), still: () => save({ still: true }) },
    disk: { frames: leaving.frames, sheet: leaving.sheet },
  }).drawer;
  // A print of the frame on screen, drawn again at the sheet's size (core/PrintPanel.js).
  const printing = new PrintPanel({
    mount: exp.body, app: 'particles', leave, say: text => bar.say(text), format: picture.get('format'), tick: () => clock.tick,
    object: () => {
      const size = pictureSize(picture.values), own = picture.values.scale || 1;
      return { type: 'still', origin: APP, recipe: { emit: emit.values, picture: picture.values, tick: clock.tick },
               render: { w: Math.round(size.width * own), h: Math.round(size.height * own) } };
    },
  });
  picture.on(key => { if (key === 'format') printing.follow(picture.get('format')); });
  // A window of the stack (core/live.js): what is on screen, as its print has it.
  stackDrawer(side, { app: 'particles', layer: () => printing.object(), clock, save: () => save() });
}

// ── The guides' switch ───────────────────────────────────────────────────────

/**
 * The guides on or off (guides.js): a switch over the viewer, and Z since S5b. How the
 * viewer looks, not what the particles are — so not a param, never in a
 * recipe — and remembered in this browser, for the next visit.
 */
function showGuides(on) {
  guidesOn = on;
  guidesBtn.setAttribute('aria-pressed', String(on));
  try { localStorage.setItem('skweeb.particles.guides', on ? '1' : '0'); } catch { /* private mode: forgotten */ }
  if (!on) canvas.classList.remove('can-move');
  draw();
}

function remembered() {
  try { return localStorage.getItem('skweeb.particles.guides') !== '0'; } catch { return true; }
}

// ── Drawing ──────────────────────────────────────────────────────────────────

function draw() {
  if (pending || !mounted()) return;
  pending = true;
  requestAnimationFrame(() => { pending = false; paint(); });
}

function paint() {
  if (!model || !mounted()) return;
  const p = picture.values;
  const size = pictureSize(p);
  const view = viewFactor(canvas, size, p.scale);
  const w = Math.max(1, Math.round(size.width * view));
  const h = Math.max(1, Math.round(size.height * view));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;

  shown = particlesAt(model, clock.tick / p.fps);
  drawPicture(ctx, shown, p, view, sprites, given.palette && given.palette.colours, given.overlay && given.overlay.images[0]);
  shownView = view;
  if (guidesOn) drawGuides(ctx, emit.values, p, view, canvas.width / Math.max(1, canvas.getBoundingClientRect().width), { ...given, selected: selected() });

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

function wireKeys(mine) {
  const vault = new VaultPanel();
  mine.listen(document, 'keydown', e => {
    const t = e.target;
    if (t instanceof HTMLElement && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    if (e.key === 'v' || e.key === 'V') vault.toggle();
    if (e.key === 's' || e.key === 'S') leaving.save();
    if (leaving.busy() || clock.length < 2) return;
    if (e.key === ' ') { e.preventDefault(); clock.toggle(); }
    if (e.key === ',') { clock.pause(); clock.step(-1); }
    if (e.key === '.') { clock.pause(); clock.step(1); }
  });
  refreshVault();
}

function refreshVault() {
  Vault.refresh().then(ok => { if (bar) bar.vault(ok ? `${Vault.index.length} in vault` : 'no vault'); });
}
