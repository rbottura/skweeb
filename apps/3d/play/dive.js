/**
 * dive.js — the worm under the ground (M16c, docs/worm.md): "naviguer juste
 * en dessous de la surface comme un ver de dune", and between the two "une
 * animation de plongeon".
 *
 * A dive is a path the body follows, its head first: off the ground in an
 * arch `leap` high, over, steeply down into it and level again `drop` under
 * — its back just under the ground. Each point of the body is as high as
 * the path is where that point has come to along the ground — the distance
 * walked, and how far ahead of the walker it is — so the body pours through
 * the one hole its head made, as the wave's crests hold still on the ground
 * (worm.js). Coming up is the same path the other way. The path is as long
 * as the body: the arch over its first six tenths, the fall from its peak
 * to its end, each piece a cosine's, so the body bends and never kinks.
 *
 * Played, not held: a dive carries the worm ahead the path's length and its
 * own in `plunge` seconds, the hands only turning it — `lunge`. Under the
 * ground, it is walked at its own speed (main.js).
 *
 * Pure: Node runs it (tests/3d-dune.mjs).
 */

/** Where the arch ends, and where the fall begins — at the arch's peak — as shares of the path. */
const ARCH = 0.6, FALL = 0.3;

/**
 * The path's height `u` units along it, and its slope there: level on the ground before it, an arch `leap` high,
 * the fall `drop` under, level after it — `span` long.
 */
export function pathAt(u, { span, leap, drop }) {
  if (!(span > 0) || u <= 0) return [0, 0];
  if (u >= span) return [-drop, 0];
  const a = ARCH * span, c = FALL * span, b = span - c;
  let y = 0, dy = 0;
  if (u < a) {
    const t = (Math.PI * u) / a;
    y += leap * Math.sin(t) ** 2;
    dy += (leap * Math.sin(2 * t) * Math.PI) / a;
  }
  if (u > c) {
    const t = (Math.PI * (u - c)) / b;
    y -= (drop * (1 - Math.cos(t))) / 2;
    dy -= (drop * Math.sin(t) * Math.PI) / (2 * b);
  }
  return [y, dy];
}

/** How fast a dive carries a body `long` units long: its path, as long, and itself, in `plunge` seconds. */
export const lunge = (long, plunge) => (2 * long) / Math.max(0.05, plunge);

export class Dive {
  constructor() {
    this.state = 'surface';     // 'surface', 'diving', 'buried', 'rising'
    this.from = 0;              // where along the ground its path begins: the distance walked there, plus the head's
  }

  /** Going down or coming up: played, the hands only turning it. */
  get moving() { return this.state === 'diving' || this.state === 'rising'; }

  /** Down from the ground, or up from under it, the path beginning where its head is — or nothing, mid-dive. */
  toggle(walked, front) {
    if (this.moving) return false;
    this.state = this.state === 'surface' ? 'diving' : 'rising';
    this.from = walked + front;
    return true;
  }

  /** A body's height over the ground at `g` — the distance walked there — and its slope, on `path`. */
  heightAt(g, path) {
    if (this.state === 'surface') return [0, 0];
    if (this.state === 'buried') return [-path.drop, 0];
    const u = g - this.from;
    if (this.state === 'diving') return pathAt(u, path);
    const [y, dy] = pathAt(path.span - u, path);
    return [y, -dy];
  }

  /** Its next state once its tail, `back` behind the walker, is through a path `span` long. */
  advance(walked, back, span) {
    if (this.moving && walked + back >= this.from + span) this.state = this.state === 'diving' ? 'buried' : 'surface';
    return this.state;
  }

  /** What a body is laid by, as far as the dive goes: the same, the same body. */
  keyAt(walked) { return this.moving ? `${this.state}:${this.from}:${walked}` : this.state; }
}
