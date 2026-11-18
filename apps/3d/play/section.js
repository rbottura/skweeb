/**
 * section.js — the planet cut through, seen flat (docs/worm.md, the heart):
 * "entrer dans un point d'accès passerait la vue en 2D, une vue section de
 * la planète avec l'avatar en 2D, au joystick les déplacements passent en
 * avant haut bas gauche droite".
 *
 * A cut (access.js) drawn in its own scene, flat colours one over another:
 * the sky round it, its ground a band at its edge, its earth in strata
 * darker as they go down, the four tunnels from its ways to the heart, the
 * heart's hollow in the middle. The worm in it is its drawing as drawn —
 * the walked worm's body, its own points, flat in its colour or its skin —
 * its head along its heading, its back up as it faces, its wave in the
 * drawing's plane. The hands move it right, left, up, down; it is held in
 * the tunnels and the heart (access.js `holdIn`), its heading eased round
 * to where it goes. Its head out at the ground, it leaves by that way;
 * into the heart, it goes in (places.js). An orthographic camera follows it.
 *
 * Pure: three's core only, Node runs it (tests/3d-heart.mjs).
 */

import {
  Scene, Mesh, CircleGeometry, RingGeometry, PlaneGeometry, MeshBasicMaterial, OrthographicCamera, Color,
  DoubleSide, Vector3,
} from '../../../core/libs/three/three.core.js';
import { HOLLOW, holdIn, tunnelAt } from './access.js';

/** The heart's hollow, and its rim. */
const CAVE = '#2a2140', RIM = '#4b3d6e';
/** The earth's strata, darkest deepest: shares of the ground's colour. */
const STRATA = [0.55, 0.48, 0.42, 0.36];

export class Section {
  constructor() {
    this.scene = new Scene();
    this.camera = new OrthographicCamera(-1, 1, 1, -1, -100, 100);
    this.camera.position.set(0, 0, 50);
    this.parts = [];
    this.body = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ side: DoubleSide }));
    this.made = this.body.geometry;          // its own until a worm's is lent: let go of at the end
    this.body.matrixAutoUpdate = false;
    this.body.renderOrder = 10;
    this.scene.add(this.body);
    this.plane = null;       // the cut it is in (access.js PLANES)
    this.q = [0, 0];         // where the worm's middle is on it
    this.heading = 0;        // the way its head points, radians from its right
    this.face = 1;           // which way it faces: 1 right, −1 left — its back up either way
    this.centre = [0, 0];    // where the camera looks, eased
    this.middle = [0, 0];    // its drawing's middle, in its own units
    this.half = 0;           // …and half its height there: what a tunnel leaves it to move across
    this.geometry = null;
  }

  /**
   * Cut on a planet of `radius`, its heart `heart` round, its tunnels `width` wide, the matrix floating in its heart
   * `matrix` of it round in `colour` — in a reality's colours.
   */
  build({ radius, heart, width, matrix = 0.32, colour = '#ffb347' }, { ground, sky }) {
    for (const m of this.parts) { this.scene.remove(m); m.geometry.dispose(); m.material.dispose(); }
    this.parts = [];
    const g = new Color(ground);
    const add = (geometry, colour, order, opacity = 1) => {
      const m = new Mesh(geometry, new MeshBasicMaterial({ color: colour, depthTest: false, depthWrite: false, transparent: opacity < 1, opacity }));
      m.renderOrder = order;
      this.parts.push(m);
      this.scene.add(m);
    };
    add(new CircleGeometry(radius, 180), g.clone().multiplyScalar(STRATA[0]), 0);
    STRATA.slice(1).forEach((k, i) => {
      const r = radius - ((radius - heart) * (i + 1)) / STRATA.length;
      add(new CircleGeometry(r, 160), g.clone().multiplyScalar(k), 1 + i);
    });
    add(new RingGeometry(radius - Math.min(0.4, radius * 0.03), radius, 180), g.clone(), 5);
    add(new PlaneGeometry(width, 2 * radius), new Color(HOLLOW), 6);
    add(new PlaneGeometry(2 * radius, width), new Color(HOLLOW), 6);
    add(new CircleGeometry(heart, 120), new Color(RIM), 7);
    add(new CircleGeometry(heart * 0.94, 120), new Color(CAVE), 8);
    add(new CircleGeometry(matrix * heart, 96), new Color(colour), 9, 0.55);
    add(new RingGeometry(matrix * heart * 0.9, matrix * heart, 96), new Color(colour).lerp(new Color('#ffffff'), 0.4), 9, 0.8);
    this.scene.background = new Color(sky);
    return this;
  }

  /**
   * Gone into from a way at `at` on its screen ([x, y], access.js `onCut`) — from the ground, its head toward the
   * heart, or from the heart, toward the ground — `long` its length; facing as `face` says when it goes up or down.
   */
  enter(plane, at, { fromHeart, radius, heart, long, face = 1 }) {
    this.plane = plane;
    const r = fromHeart ? heart + 0.5 * long + 0.3 : radius - 0.5 * long - 0.2, out = fromHeart ? 1 : -1;
    this.q = [at[0] * r, at[1] * r];
    this.heading = Math.atan2(out * at[1], out * at[0]);
    this.face = at[0] ? Math.sign(out * at[0]) : face;
    this.centre = [...this.q];
    return this;
  }

  /**
   * Moved by the hands — `x` right, `y` up, each −1 to 1 — at `speed` for `dt`, held in the tunnels and the heart,
   * its heading eased round at `turnRate`. The distance it went.
   */
  step({ x = 0, y = 0 }, dt, { speed, turnRate, radius, heart, play }) {
    const n = Math.hypot(x, y), k = n > 1 ? 1 / n : 1;
    const want = [this.q[0] + x * k * speed * dt, this.q[1] + y * k * speed * dt];
    const to = holdIn(want[0], want[1], { radius, heart, play });
    const dx = to[0] - this.q[0], dy = to[1] - this.q[1], d = Math.hypot(dx, dy);
    this.q = to;
    if (d > 1e-6) {
      const aim = Math.atan2(dy, dx);
      let turn = Math.atan2(Math.sin(aim - this.heading), Math.cos(aim - this.heading));
      const most = turnRate * dt;
      turn = Math.max(-most, Math.min(most, turn));
      this.heading += turn;
      const c = Math.cos(this.heading);
      if (Math.abs(c) > 0.3) this.face = Math.sign(c);
    }
    return d;
  }

  /** Where it leaves, if it does: `{ to: 'ground' | 'heart', at }` — the tunnel's way on the screen — or null. */
  leaving({ radius, heart, play, long }) {
    const [x, y] = this.q, r = Math.hypot(x, y), at = tunnelAt(x, y, { heart, play });
    if (r >= radius - 0.25 * long && at) return { to: 'ground', at };
    if (r < heart - 0.25 * long) {
      const from = Math.abs(x) > Math.abs(y) ? [Math.sign(x), 0] : [0, Math.sign(y) || 1];
      return { to: 'heart', at: from };
    }
    return null;
  }

  /** The walked worm's body taken in: its geometry lent, its drawing's middle and half its height found. */
  fit(worm) {
    const geometry = worm.mesh.geometry;
    if (this.geometry === geometry) return this;
    this.geometry = this.body.geometry = geometry;
    const P = worm.rest.position, lo = [Infinity, Infinity], hi = [-Infinity, -Infinity];
    for (let i = 0; i < P.length; i += 3) for (let q = 0; q < 2; q++) { lo[q] = Math.min(lo[q], P[i + q]); hi[q] = Math.max(hi[q], P[i + q]); }
    this.middle = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2];
    this.half = Math.max(0, (hi[1] - lo[1]) / 2);
    return this;
  }

  /** The walked worm drawn flat where it is: its drawing's middle on its place, its head along its heading. */
  draw(worm) {
    const b = this.fit(worm).body, m = worm.material, mat = b.material;
    if (mat.map !== m.map) { mat.map = m.map; mat.needsUpdate = true; }
    mat.color.copy(m.color);
    const k = worm.size, s = worm.toward, c = Math.cos(this.heading), n = Math.sin(this.heading);
    const X = new Vector3(c, n, 0).multiplyScalar(s * k), Y = new Vector3(-n, c, 0).multiplyScalar(this.face * k);
    const Z = new Vector3(0, 0, s * this.face * k);
    const o = new Vector3(this.q[0], this.q[1], 0).addScaledVector(X, -this.middle[0]).addScaledVector(Y, -this.middle[1]);
    b.matrix.makeBasis(X, Y, Z).setPosition(o);
    b.matrixWorldNeedsUpdate = true;
  }

  /** The camera eased onto the worm, `tall` units of the cut in its frame's height at `aspect`. */
  look(aspect, tall, ease, dt, snap = false) {
    const k = snap ? 1 : 1 - Math.exp(-ease * dt);
    this.centre = this.centre.map((x, i) => x + (this.q[i] - x) * k);
    const cam = this.camera, h = tall / 2;
    Object.assign(cam, { left: -h * aspect, right: h * aspect, top: h, bottom: -h });
    cam.position.set(this.centre[0], this.centre[1], 50);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    return cam;
  }

  dispose() {
    for (const m of this.parts) { m.geometry.dispose(); m.material.dispose(); }
    this.parts = [];
    this.made.dispose();
    this.body.material.dispose();
  }
}
