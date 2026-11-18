/**
 * main.js — the worm's player (M16, docs/worm.md): a planet, a worm on it,
 * walked in the third person from above — "vu tps d'assez haut" (M16a) —
 * and another, frozen in space-time, a phase to pass into (M16b).
 *
 *   /apps/3d/play/              the planet, and loft.js's own worms
 *   /apps/3d/play/?worm=<id>    the walked worm: a gamepad drawing lofted, or a model's drawn body
 *
 * Each frame: the hands read (hands.js); the walked worm's walker stepped
 * round the planet (walker.js) — carried by a dive, or under the ground at
 * its own pace (dive.js, M16c) — its wave posed by the distance walked, the
 * worm laid on the planet's curve and hung in its frame (worm.js), the
 * ground raised over what of it is under (dune.js); its coming into a
 * frozen worm's radius begins a passage, and a passage moves on
 * (phasing.js); the camera eased behind the walked worm, or to where both
 * are seen (follow.js); the planet dressed in the walked worm's reality,
 * dimmed as a passage holds the world (planet.js); drawn by the 3D app's
 * one renderer (../renderer.js) — the page's one GPU device, WebGL2 where
 * there is none — its picture handed to the viewer's canvas, never copied.
 *
 * Or the worm is inside (places.js): walked into one of the planet's six
 * ways in, down a tunnel of its cut, seen flat (section.js), into its
 * heart, walked on the inside of its hollow (heart.js) — and out again.
 *
 * A module (core/mount.js): `mount(host)` and `unmount()`, its page mounting
 * it on itself; unmounted, its frames stop, its planet and worms are let go
 * of, its keys are core's again. Nothing happens at import. Nothing it does
 * is saved (docs/worm.md, *Settled* 5). `peek()` says where things stand,
 * `tune()` sets rows: for the checks.
 */

import { PerspectiveCamera } from '../../../core/libs/three/three.core.js';
import { appModule }  from '../../../core/mount.js';
import { Bar }        from '../../../core/Bar.js';
import { ParamPanel } from '../../../core/ParamPanel.js';
import { Vault }      from '../../../core/vault.js';
import { openRenderer } from '../renderer.js';
import { drawnOf }    from '../drawn.js';
import { playParams, GROUPS, WORM_KEYS, PLANET_KEYS, PLACE_KEYS, REALITY_KEYS, HEART_KEYS } from './params.js';
import { Planet }     from './planet.js';
import { Worm }       from './worm.js';
import { walkerAt, step, settle, frameOf } from './walker.js';
import { aimBehind, aimBetween, follow } from './follow.js';
import { Hands }      from './hands.js';
import { Phasing }    from './phasing.js';
import { lunge }      from './dive.js';
import { Dune }       from './dune.js';
import { Section }    from './section.js';
import { Heart }      from './heart.js';
import { WAYS, wayAt } from './access.js';
import { hang, heartOf, enterCut, tickCut, tickHeart, refit, visit as visitWay, HEART_FOV } from './places.js';

const MARKUP = `
  <main class="app-main">
    <section class="viewer" aria-label="the worm's planet">
      <div class="viewer-stage">
        <canvas class="world" width="480" height="300"
                aria-label="the planet — ZQSD, WASD or the arrows walk the worm, Space dives, a stick too"></canvas>
        <p class="world-note" hidden></p>
      </div>
    </section>
    <div class="app-side" id="side"></div>
  </main>`;

const app = appModule('3d-play', { markup: MARKUP, style: new URL('./style.css', import.meta.url).href, start });

/** The player in `host`, the worm the address names on its planet (core/mount.js). */
export const mount = (host, given) => app.mount(host, given);
/** The player out of its host, all it held let go of: its frames, its planet, its worms, its keys. */
export const unmount = () => app.unmount();

/** The most pixels drawn along the viewer's longer side: a game's frame, not a print's. */
const LONGEST = 1920;

/** Each worm's rows: what it is, its colour — the walked one's first, then the frozen one's. */
const ROWS = [{ object: 'avatar', colour: 'colour' }, { object: 'other', colour: 'otherColour' }];

let live = null;   // the player mounted: its parts, made again by each mount

async function start(root, mine) {
  live = null;
  const canvas = root.querySelector('canvas.world');
  const note = root.querySelector('.world-note');
  const say = text => { note.hidden = !text; note.textContent = text || ''; };
  const bar = new Bar({ app: '3d-play', mount: root, acts: false, keys: 'ZQSD, WASD or the arrows walk · Space dives, and comes up · a stick too' });
  const params = playParams();
  new ParamPanel(params, { title: 'the worm, played', mount: root.querySelector('#side'), groups: GROUPS });
  const asked = new URLSearchParams(location.search).get('worm');
  if (asked) params.set({ avatar: asked });

  let renderer;
  try { renderer = await openRenderer(); } catch (err) { say('No 3D here: ' + err.message); return; }
  if (app.scope !== mine) return;

  const v = params.values;
  const planet = new Planet().build(v);
  const phasing = new Phasing(planet.scene);
  phasing.add(new Worm(), walkerAt(v.radius), { ground: v.ground, sky: v.sky });
  phasing.add(new Worm(), walkerAt(v.radius), { ground: v.otherGround, sky: v.otherSky });
  const dune = new Dune();
  planet.scene.add(dune.mesh);
  const s = { params, planet, phasing, dune, section: new Section(), heart: new Heart(), place: 'ground', aspect: 1.6,
              renderer, camera: new PerspectiveCamera(50, 1, 0.05, 2000),
              hands: new Hands(mine), frames: 0, snap: true, made: [{}, {}], asked: [0, 0] };
  live = s;

  const tell = () => bar.say(`${s.made[phasing.walking].title || 'loft.js\'s worm'} · a planet of radius `
    + `${Math.round(params.get('radius'))} · ${renderer.backend}`);

  /** Worm `i` shaped again from what it is made of — its drawing read, when it comes, shapes it once more. */
  const shapeWorm = i => {
    const made = s.made[i], id = made.body && made.body.drawing, b = phasing.bodies[i];
    const drawn = id ? drawnOf(id, () => { if (live === s) shapeWorm(i); }) : null;
    const v = params.values;
    b.worm.shape({ body: { ...made.body, drawn }, seen: v.seen, head: v.head, wave: v.wave, waves: v.waves, sway: v.sway,
                   size: v.size, skin: made.skin || 'drawing', colour: made.colour || v[ROWS[i].colour] });
    b.worm.tintShell(v.spectral);
    hang(s, b);
    tell();
  };
  /** What worm `i` is made of: a model's drawn body as it was shaped there, a drawing lofted, or loft.js's own. */
  const chooseWorm = async i => {
    const ask = ++s.asked[i], id = params.get(ROWS[i].object);
    const made = { body: {}, skin: 'drawing', colour: null, title: '' };
    if (id) {
      let object = null;
      try { ({ object } = await Vault.load(id)); } catch { object = null; }
      if (live !== s || ask !== s.asked[i]) return;
      const shapes = (object && object.type === 'model' && object.recipe && object.recipe.shapes) || [];
      const shape = shapes.find(x => x && x.on !== false && x.id === 'drawn' && x.params);
      if (shape) Object.assign(made, { body: { ...shape.params }, skin: shape.params.skin || 'drawing', colour: shape.params.colour || null });
      else if (object && object.type !== 'model') made.body = { drawing: id };
      else say(object ? 'That model has no drawn body: loft.js\'s own worm stands in.'
                      : 'That worm is not in the vault: loft.js\'s own stands in.');
      if (shape || made.body.drawing) made.title = object.title || id;
    }
    s.made[i] = made;
    shapeWorm(i);
  };
  /** The frozen worm where its rows put it — `away` from the start, `bearing` round, facing back — and every radius laid. */
  const placeOther = () => {
    const v = params.values, other = phasing.bodies[1];
    if (phasing.walking === 1 || phasing.passage) return layReaches(s);
    const w = walkerAt(v.radius);
    step(w, { turn: 1 }, 1, { radius: v.radius, speed: 0, turnRate: (v.bearing * Math.PI) / 180 });
    step(w, { move: 1 }, 1, { radius: v.radius, speed: v.away, turnRate: 0 });
    w.f.negate();
    Object.assign(other.walker, { p: w.p, f: w.f, walked: 0 });
    hang(s, other);
    layReaches(s);
  };
  const realities = () => {
    const v = params.values;
    phasing.bodies[0].reality = { ground: v.ground, sky: v.sky };
    phasing.bodies[1].reality = { ground: v.otherGround, sky: v.otherSky };
  };

  params.on(key => {
    if (PLANET_KEYS.includes(key)) {
      planet.build(params.values);
      for (const b of phasing.bodies) { settle(b.walker, params.get('radius')); hang(s, b); }
      tell();
    }
    if (PLACE_KEYS.includes(key)) placeOther();
    if (REALITY_KEYS.includes(key)) realities();
    if (HEART_KEYS.includes(key)) refit(s);
    if (key === 'avatar') chooseWorm(0);
    else if (key === 'other') chooseWorm(1);
    else if (WORM_KEYS.includes(key) || key === 'spectral') { shapeWorm(0); shapeWorm(1); }
  });
  placeOther();
  await Promise.all([chooseWorm(0), chooseWorm(1)]);
  if (live !== s) return;

  const view = canvas.getContext('bitmaprenderer');
  let raf = 0, last = performance.now();
  const frame = now => {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    tick(s, dt);
    draw(s, canvas, view);
  };
  raf = requestAnimationFrame(frame);
  mine.hold(() => {
    cancelAnimationFrame(raf);
    for (const b of phasing.bodies) b.worm.dispose();
    phasing.dispose();
    dune.dispose();
    s.section.dispose();
    s.heart.dispose();
    planet.dispose();
    if (live === s) live = null;
  });
}

/** Every worm's radius laid round where it stands. */
function layReaches(s) {
  const v = s.params.values;
  for (const b of s.phasing.bodies) b.reach.lay(b.walker.p, v.radius, v.reach);
}

/**
 * One frame's motion: the walked worm stepped, dived, waved and hung — or a passage moved on — and the camera eased;
 * inside the planet, its cut's or its heart's (places.js).
 */
function tick(s, dt) {
  const v = s.params.values, P = s.phasing;
  if (s.place === 'cut') return tickCut(s, dt, s.hands.read());
  if (s.place === 'heart') return tickHeart(s, dt, s.hands.read());
  if (!P.passage) {
    const me = P.walked, { worm, walker, dive } = me, hands = s.hands.read(), long = worm.front - worm.back;
    if (hands.dive) dive.toggle(walker.walked, worm.front);
    // A dive is played — it carries the worm, the hands only turn it; under the ground, the worm goes at its own pace.
    const speed = dive.moving ? lunge(long, v.plunge) : dive.state === 'buried' ? v.under : v.speed;
    step(walker, dive.moving ? { move: 1, turn: hands.turn } : hands, dt, { radius: v.radius, speed, turnRate: (v.turn * Math.PI) / 180 });
    dive.advance(walker.walked, worm.back, long);
    hang(s, me);
    s.dune.lay(worm.spine, frameOf(walker), walker.p, s.planet, { ridge: v.ridge * v.size, spread: v.spread * v.size });
    const way = dive.state === 'surface' ? wayAt(walker.p, v.radius, heartOf(v).width / 2) : -1;
    if (way >= 0) return enterCut(s, way);          // walked into a way in: down into its cut
    const into = P.within(v.reach);
    if (into >= 0) P.begin(into, { ghosts: v.ghosts, spectral: v.spectral, arch: 1.5 * v.size });
  }
  s.hands.frozen = !!P.passage;
  let aim = null, dim = 0;
  if (P.passage) {
    const from = P.walked, to = P.bodies[P.passage.to];
    const at = P.advance(dt, v);
    dim = at.stage === 'framing' ? at.framed : at.stage === 'swinging' ? 1 : 1 - at.fixed;
    if (P.passage) aim = aimBetween(from.worm.centre(), to.worm.centre(), v.radius, { size: v.size, fov: s.camera.fov, from: s.camera.position });
    else layReaches(s);                  // bonded: the one left behind is a phase now, its radius round it
  }
  P.breathe(dt);
  const me = P.walked;
  if (!aim) aim = aimBehind(frameOf(me.walker), me.walker.p, { distance: v.distance * v.size, height: v.height * v.size }, v.size);
  follow(s.camera, aim, v.ease, dt, s.snap);
  s.snap = false;
  s.planet.dress(P.reality(), dim);
}

/** The planet drawn at the viewer's size in the screen's pixels — at most `LONGEST` — and handed to its canvas. */
function draw(s, canvas, view) {
  const box = canvas.getBoundingClientRect(), k = Math.min(window.devicePixelRatio || 1, 2);
  let w = Math.round(box.width * k), h = Math.round(box.height * k);
  if (w < 2 || h < 2) return;
  const fit = Math.min(1, LONGEST / Math.max(w, h), s.renderer.maxSide / Math.max(w, h));
  w = Math.max(2, Math.round(w * fit));
  h = Math.max(2, Math.round(h * fit));
  s.aspect = w / h;
  s.camera.aspect = w / h;
  s.camera.fov = s.place === 'heart' ? HEART_FOV : 50;
  s.camera.far = 4 * s.planet.radius + 200;
  s.camera.updateProjectionMatrix();
  const scene = s.place === 'cut' ? s.section.scene : s.place === 'heart' ? s.heart.scene : s.planet.scene;
  const bitmap = s.renderer.draw(scene, s.place === 'cut' ? s.section.camera : s.camera, w, h);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  view.transferFromImageBitmap(bitmap);
  s.frames++;
}

/** For the checks: the walked worm set down `away` from way `way` — on the ground, or in the heart — facing it. */
export function visit(way, given = {}) {
  if (!live) return false;
  visitWay(live, way, given);
  return true;
}

/** Rows set from outside, as the panel would set them — a check's, a scene's. False, unmounted. */
export function tune(values) {
  if (!live) return false;
  live.params.set(values);
  return true;
}

/**
 * Where things stand, for the checks — or null, unmounted: the walked worm and its walker, the camera, the frozen
 * one, a passage's stage and phase, the bridge's lights, each body's place, shell and radius, the frames drawn;
 * the walked worm's dive, how much of it is under, the ground's highest over it, its head's height and its top's;
 * where it is — the ground, a cut, the heart — the ways in, and in a cut where it is on it.
 */
export function peek() {
  if (!live) return null;
  const { phasing: P, camera, planet, renderer, frames, section: cut } = live;
  const me = P.walked, worm = me.worm, f = frameOf(me.walker), positions = worm.mesh.geometry.getAttribute('position');
  const nose = worm.spine.reduce((a, b) => (b[0] > a[0] ? b : a), [-Infinity, 0, 0, 0]);
  return { radius: planet.radius, p: me.walker.p.toArray(), f: me.walker.f.toArray(), up: f.up.toArray(), walked: me.walker.walked,
           eye: camera.position.toArray(), wave: worm.phase, low: worm.low, toward: worm.toward, length: worm.length,
           drawn: !!(worm.v && worm.v.drawn), vertices: positions ? positions.count : 0,
           things: planet.things.reduce((n, m) => n + m.count, 0), frames, backend: renderer.backend,
           walking: P.walking, stage: P.passage ? P.passage.at.stage : 'walking', phase: P.passage ? P.passage.at.phase : 0,
           lights: P.passage ? P.passage.bridge.lights() : [], bodies: P.bodies.map(b => b.walker.p.toArray()),
           shells: P.bodies.map(b => b.worm.shellAt), reach: P.bodies.map(b => b.reach.strength.value),
           dive: me.dive.state, sunk: live.dune.sunk, ridge: live.dune.height, nose: nose[1],
           top: worm.spine.reduce((t, r) => Math.max(t, r[4]), -Infinity),
           place: live.place, ways: WAYS.map(w => w.dir.toArray()), inside: !!me.walker.inside, fov: camera.fov,
           heart: heartOf(live.params.values).heart,
           cut: live.place === 'cut' ? { q: [...cut.q], heading: cut.heading, face: cut.face, across: cut.plane.across } : null };
}
