/**
 * main.js — the worm's player (M16a, docs/worm.md): a planet, a worm on it,
 * walked in the third person from above — "vu tps d'assez haut".
 *
 *   /apps/3d/play/              the planet, and loft.js's own worm
 *   /apps/3d/play/?worm=<id>    a gamepad drawing lofted, or a model's drawn body
 *
 * Each frame: the hands read (hands.js); the walker stepped round the planet
 * (walker.js); the worm's wave posed by the distance walked, the worm hung in
 * the walker's frame (worm.js); the camera eased behind it (follow.js); the
 * planet drawn by the 3D app's one renderer (../renderer.js) — the page's one
 * GPU device, WebGL2 where there is none — and its picture handed to the
 * viewer's canvas, never copied.
 *
 * A module (core/mount.js): `mount(host)` and `unmount()`, its page mounting
 * it on itself; unmounted, its frames stop, its planet and its worm are let
 * go of, its keys are core's again. Nothing happens at import. Nothing it
 * does is saved (docs/worm.md, *Settled* 5). `peek()` says where things
 * stand, for the checks.
 */

import { PerspectiveCamera } from '../../../core/libs/three/three.core.js';
import { appModule }  from '../../../core/mount.js';
import { Bar }        from '../../../core/Bar.js';
import { ParamPanel } from '../../../core/ParamPanel.js';
import { Vault }      from '../../../core/vault.js';
import { openRenderer } from '../renderer.js';
import { drawnOf }    from '../drawn.js';
import { playParams, GROUPS, WORM_KEYS, PLANET_KEYS } from './params.js';
import { Planet }     from './planet.js';
import { Worm }       from './worm.js';
import { walkerAt, step, settle, frameOf } from './walker.js';
import { aimBehind, follow } from './follow.js';
import { Hands }      from './hands.js';

const MARKUP = `
  <main class="app-main">
    <section class="viewer" aria-label="the worm's planet">
      <div class="viewer-stage">
        <canvas class="world" width="480" height="300"
                aria-label="the planet — ZQSD, WASD or the arrows walk the worm, a stick too"></canvas>
        <p class="world-note" hidden></p>
      </div>
    </section>
    <div class="app-side" id="side"></div>
  </main>`;

const app = appModule('3d-play', { markup: MARKUP, style: new URL('./style.css', import.meta.url).href, start });

/** The player in `host`, the worm the address names on its planet (core/mount.js). */
export const mount = (host, given) => app.mount(host, given);
/** The player out of its host, all it held let go of: its frames, its planet, its worm, its keys. */
export const unmount = () => app.unmount();

/** The most pixels drawn along the viewer's longer side: a game's frame, not a print's. */
const LONGEST = 1920;

let live = null;   // the player mounted: its parts, made again by each mount

async function start(root, mine) {
  live = null;
  const canvas = root.querySelector('canvas.world');
  const note = root.querySelector('.world-note');
  const say = text => { note.hidden = !text; note.textContent = text || ''; };
  const bar = new Bar({ app: '3d-play', mount: root, acts: false, keys: 'ZQSD, WASD or the arrows walk · a stick too' });
  const params = playParams();
  new ParamPanel(params, { title: 'the worm, played', mount: root.querySelector('#side'), groups: GROUPS });
  const asked = new URLSearchParams(location.search).get('worm');
  if (asked) params.set({ avatar: asked });

  let renderer;
  try { renderer = await openRenderer(); } catch (err) { say('No 3D here: ' + err.message); return; }
  if (app.scope !== mine) return;

  const planet = new Planet().build(params.values);
  const worm = new Worm();
  planet.scene.add(worm.mesh);
  const s = { params, planet, worm, renderer, camera: new PerspectiveCamera(50, 1, 0.05, 2000),
              walker: walkerAt(params.get('radius')), hands: new Hands(mine), frames: 0, snap: true,
              body: {}, skin: 'drawing', colour: null, title: '', asked: 0 };
  live = s;

  /** The worm shaped again from what it is made of — its drawing read, when it comes, shapes it once more. */
  const shapeWorm = () => {
    const id = s.body.drawing;
    const drawn = id ? drawnOf(id, () => { if (live === s) shapeWorm(); }) : null;
    const v = params.values;
    worm.shape({ body: { ...s.body, drawn }, seen: v.seen, head: v.head, wave: v.wave, waves: v.waves, sway: v.sway,
                 size: v.size, skin: s.skin, colour: s.colour || v.colour });
    tell();
  };
  const tell = () => bar.say(`${s.title || 'loft.js\'s worm'} · a planet of radius ${Math.round(params.get('radius'))} · ${renderer.backend}`);
  /** What the worm is made of: a model's drawn body as it was shaped there, a drawing lofted, or loft.js's own. */
  const chooseWorm = async () => {
    const ask = ++s.asked, id = params.get('avatar');
    let body = {}, skin = 'drawing', colour = null, title = '';
    say('');
    if (id) {
      let object = null;
      try { ({ object } = await Vault.load(id)); } catch { object = null; }
      if (live !== s || ask !== s.asked) return;
      const shapes = (object && object.type === 'model' && object.recipe && object.recipe.shapes) || [];
      const shape = shapes.find(x => x && x.on !== false && x.id === 'drawn' && x.params);
      if (shape) { body = { ...shape.params }; skin = shape.params.skin || 'drawing'; colour = shape.params.colour || null; }
      else if (object && object.type !== 'model') body = { drawing: id };
      else say(object ? 'That model has no drawn body: loft.js\'s own worm walks instead.'
                      : 'That worm is not in the vault: loft.js\'s own walks instead.');
      if (shape || body.drawing) title = object.title || id;
    }
    Object.assign(s, { body, skin, colour, title });
    shapeWorm();
  };

  params.on(key => {
    if (PLANET_KEYS.includes(key)) {
      planet.build(params.values);
      if (key === 'radius') { settle(s.walker, params.get('radius')); tell(); }
    }
    if (key === 'avatar') chooseWorm();
    else if (WORM_KEYS.includes(key)) shapeWorm();
  });
  await chooseWorm();
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
    planet.dispose();
    worm.dispose();
    if (live === s) live = null;
  });
}

/** One frame's motion: the walker stepped, the worm waved and hung, the camera eased behind it. */
function tick(s, dt) {
  const v = s.params.values;
  step(s.walker, s.hands.read(), dt, { radius: v.radius, speed: v.speed, turnRate: (v.turn * Math.PI) / 180 });
  s.worm.pose(s.walker.walked);
  const frame = frameOf(s.walker);
  s.worm.place(frame, s.walker.p);
  const aim = aimBehind(frame, s.walker.p, { distance: v.distance * v.size, height: v.height * v.size }, v.size);
  follow(s.camera, aim, v.ease, dt, s.snap);
  s.snap = false;
}

/** The planet drawn at the viewer's size in the screen's pixels — at most `LONGEST` — and handed to its canvas. */
function draw(s, canvas, view) {
  const box = canvas.getBoundingClientRect(), k = Math.min(window.devicePixelRatio || 1, 2);
  let w = Math.round(box.width * k), h = Math.round(box.height * k);
  if (w < 2 || h < 2) return;
  const fit = Math.min(1, LONGEST / Math.max(w, h), s.renderer.maxSide / Math.max(w, h));
  w = Math.max(2, Math.round(w * fit));
  h = Math.max(2, Math.round(h * fit));
  s.camera.aspect = w / h;
  s.camera.far = 4 * s.planet.radius + 200;
  s.camera.updateProjectionMatrix();
  const bitmap = s.renderer.draw(s.planet.scene, s.camera, w, h);
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  view.transferFromImageBitmap(bitmap);
  s.frames++;
}

/** Rows set from outside, as the panel would set them — a check's, a scene's. False, unmounted. */
export function tune(values) {
  if (!live) return false;
  live.params.set(values);
  return true;
}

/** Where things stand, for the checks — the walker, the camera, the worm, the frames drawn — or null, unmounted. */
export function peek() {
  if (!live) return null;
  const { walker, camera, worm, planet, renderer, frames } = live;
  const f = frameOf(walker), positions = worm.mesh.geometry.getAttribute('position');
  return { radius: planet.radius, p: walker.p.toArray(), f: walker.f.toArray(), up: f.up.toArray(), walked: walker.walked,
           eye: camera.position.toArray(), phase: worm.phase, low: worm.low, toward: worm.toward, length: worm.length,
           drawn: !!(worm.v && worm.v.drawn), vertices: positions ? positions.count : 0,
           things: planet.things.reduce((n, m) => n + m.count, 0), frames, backend: renderer.backend };
}
