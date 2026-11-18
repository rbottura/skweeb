/**
 * orbit.js — the heart weightless (M16o, docs/worm.md): "dans le cœur
 * j'aimerais qu'on soit dans une forme d'apesanteur autour de la matrice,
 * une forme d'orbit control qui cadre à la fois l'avatar et la matrice dans
 * le même champ, et ZQSD pour contrôler la caméra orbitale qui regarde
 * toujours la matrice, deux degrés de liberté".
 *
 * The worm floats off the wall, on a sphere round the heart's middle: `dir`
 * where it is, `up` the screen's up there, the camera out behind it looking
 * at the matrix, the worm low in its field. The hands move it on the
 * screen — right, left, up, down — round the matrix, where it is and the
 * screen's up carried by the same turn, so no pole stops it and up stays
 * the way it was going. Seen from its side, as in a cut: its head turned
 * to where it goes, its back up as it faces.
 *
 * Aimed — "un mode de vue où on contrôle le regard de la caméra par le
 * pointeur de la souris et on vise un trou sur la paroi" — its gaze starts
 * where the camera looked and is turned by the pointer, freely round, up and
 * down short of straight; the worm faces it, the camera over its back looks
 * where the gaze meets the wall, under the sight; the mouth there, if one
 * is, the one gone into.
 *
 * Pure: three's core only, Node runs it (tests/3d-heart.mjs).
 */

import { Vector3, Quaternion, Matrix4 } from '../../../core/libs/three/three.core.js';
import { wayAt } from './access.js';

/** The gaze's turn for each pixel the pointer moves, radians: a fifth of a degree. */
export const LOOK = (0.2 * Math.PI) / 180;
/** How far up or down a gaze turns: short of straight, radians. */
const PITCH = (85 * Math.PI) / 180;
/** How far from a mouth's middle a gaze still finds it: a share of its width. */
const SLACK = 0.75;
/** The camera's room: never nearer the wall than this share of it, nor the matrix. */
const ROOM = 0.92;

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

/** Where a line from `from` along `dir` meets the inside of a sphere `radius` round the middle. */
export function meet(from, dir, radius) {
  const b = from.dot(dir), c = from.lengthSq() - radius * radius;
  return from.clone().addScaledVector(dir, -b + Math.sqrt(Math.max(0, b * b - c)));
}

export class Orbit {
  constructor() {
    this.dir = new Vector3(0, 1, 0);      // where it floats, from the heart's middle
    this.up = new Vector3(0, 0, -1);      // the screen's up there, square to dir
    this.heading = 0;                     // where it goes on the screen, radians from its right
    this.face = 1;                        // its back up as it faces: right 1, left −1
    this.gaze = null;                     // aimed: where it looked, how far turned since, where it looks
    this.shownAs = null;                  // its turn as shown, eased toward its frame's
  }

  /** The screen's right, square to its up and to the eye. */
  get right() { return this.up.clone().cross(this.dir); }

  /** Floating at `dir`, the screen's up as near `up` as is square to it, going `heading` on it. */
  set(dir, up, heading = 0) {
    this.dir.copy(dir).normalize();
    this.up.copy(up).addScaledVector(this.dir, -up.dot(this.dir));
    if (this.up.lengthSq() < 1e-8) {
      const other = Math.abs(this.dir.x) < 0.9 ? new Vector3(1, 0, 0) : new Vector3(0, 1, 0);
      this.up.copy(other).addScaledVector(this.dir, -other.dot(this.dir));
    }
    this.up.normalize();
    this.heading = wrap(heading);
    this.face = Math.cos(this.heading) < 0 ? -1 : 1;
    this.gaze = null;
    this.shownAs = null;
    return this;
  }

  /**
   * `dt` on, moved by the hands `{ x, y }` — right, up on the screen — at `speed` round a sphere `radius` round: where
   * it is and the screen's up turned together, its heading toward where it goes at `turnRate`. Says how far it went.
   */
  swim({ x = 0, y = 0 }, dt, { radius, speed, turnRate }) {
    const n = Math.hypot(x, y);
    if (n < 1e-6 || !(radius > 0)) return 0;
    const k = n > 1 ? 1 / n : 1, d = n * k * speed * dt;
    const way = this.right.multiplyScalar(x / n).addScaledVector(this.up, y / n);
    const q = new Quaternion().setFromAxisAngle(this.dir.clone().cross(way).normalize(), d / radius);
    this.dir.applyQuaternion(q).normalize();
    this.up.applyQuaternion(q).addScaledVector(this.dir, -this.up.dot(this.dir)).normalize();
    const turn = wrap(Math.atan2(y, x) - this.heading), most = turnRate * dt;
    this.heading = wrap(this.heading + Math.max(-most, Math.min(most, turn)));
    const c = Math.cos(this.heading);
    if (Math.abs(c) > 0.3) this.face = Math.sign(c);
    return d;
  }

  /** The worm's frame: ahead where it goes on the screen, its back up as it faces, its right the eye's way — or, aimed, its gaze's. */
  frame() {
    if (this.gaze) {
      const forward = this.gaze.f.clone(), up = this.gaze.u.clone();
      return { forward, up, right: forward.clone().cross(up) };
    }
    const R = this.right, c = Math.cos(this.heading), s = Math.sin(this.heading);
    const forward = R.clone().multiplyScalar(c).addScaledVector(this.up, s);
    const up = R.clone().multiplyScalar(-s).addScaledVector(this.up, c).multiplyScalar(this.face);
    return { forward, up, right: forward.clone().cross(up) };
  }

  /** Its frame as shown: eased toward `frame()` at `ease` over `dt`, as the camera is — or put there, `snap`. */
  shown(ease, dt, snap = false) {
    const f = this.frame(), q = new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(f.forward, f.up, f.right));
    if (snap || !this.shownAs) this.shownAs = q;
    else this.shownAs.slerp(q, 1 - Math.exp(-ease * dt));
    const forward = new Vector3(1, 0, 0).applyQuaternion(this.shownAs), up = new Vector3(0, 1, 0).applyQuaternion(this.shownAs);
    return { forward, up, right: forward.clone().cross(up) };
  }

  /** Aimed: its gaze where the camera looks, `forward`, its up `up` — not turned yet. */
  aim(forward, up) {
    const f = forward.clone().normalize(), u = up.clone().addScaledVector(f, -up.dot(f)).normalize();
    this.gaze = { forward: f, up: u, yaw: 0, pitch: 0, f: f.clone(), u: u.clone() };
    return this;
  }

  /** Its gaze turned `yaw` to the right round where it looked, `pitch` up — never past short of straight. */
  turn(yaw, pitch) {
    const g = this.gaze;
    if (!g) return this;
    g.yaw = wrap(g.yaw + yaw);
    g.pitch = Math.max(-PITCH, Math.min(PITCH, g.pitch + pitch));
    const right = g.forward.clone().cross(g.up);
    const flat = g.forward.clone().multiplyScalar(Math.cos(g.yaw)).addScaledVector(right, Math.sin(g.yaw));
    g.f = flat.clone().multiplyScalar(Math.cos(g.pitch)).addScaledVector(g.up, Math.sin(g.pitch));
    g.u = g.up.clone().multiplyScalar(Math.cos(g.pitch)).addScaledVector(flat, -Math.sin(g.pitch));
    return this;
  }

  /** Not aimed any more. */
  free() { this.gaze = null; return this; }

  /** The mouth its gaze finds from `p` on a heart `heart` round, its mouths `width` wide: its way, or −1. */
  found(p, heart, width) {
    return this.gaze ? wayAt(meet(p, this.gaze.f, heart), heart, SLACK * width) : -1;
  }

  /**
   * Where the camera is, for the worm floating at `p` in a heart `heart` round whose matrix is `matrix` round, the
   * worm `long`: out behind it looking at the matrix, the worm low in the field — or, aimed, over its head, a
   * little behind, looking where its gaze meets the wall, the sight clear of it. Never nearer the wall, nor the
   * matrix, than its room.
   */
  view(p, { heart, matrix, long }) {
    if (!this.gaze) {
      const at = p.length(), back = Math.max(0.2 * long, Math.min(ROOM * heart - at, 1.5 * long));
      const eye = this.dir.clone().multiplyScalar(at + back).addScaledVector(this.up, 0.3 * back);
      return { eye, at: new Vector3(), up: this.up.clone() };
    }
    const g = this.gaze;
    let k = long, eye = null;
    for (let i = 0; i < 12; i++, k *= 0.8) {
      eye = p.clone().addScaledVector(g.f, -0.35 * k).addScaledVector(g.u, 0.55 * k);
      const r = eye.length();
      if (r < ROOM * heart && r > matrix / ROOM) break;
    }
    return { eye, at: meet(p, g.f, heart), up: g.u.clone() };
  }
}
