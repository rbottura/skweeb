/**
 * access.js — the ways into the planet's heart (docs/worm.md, the heart):
 * "6 points d'accès, 2 aux pôles nord et sud, et 4 sur l'équateur,
 * répartis à égale distance à chaque 90 degrés" — the planet's three axes,
 * both ways each. "Cela revient à sectionner la planète en 3 plans, un par
 * axe, et chaque plan connecté à 4 points d'accès": each plane square to
 * one axis, through the four ways of the other two, is a cut — its tunnels
 * from those four down to the heart, seen flat (section.js).
 *
 * The axes are turned so the start — the top of the planet, where a walker
 * begins (walker.js) — stands as far from all six as it can, between three.
 * Each cut is seen one way, always: the equator's from the north, the two
 * through the poles with the north up.
 *
 * Pure: three's core only, Node runs it (tests/3d-heart.mjs).
 */

import { Quaternion, Vector3 } from '../../../core/libs/three/three.core.js';

const TURN = new Quaternion().setFromUnitVectors(new Vector3(1, 1, 1).normalize(), new Vector3(0, 1, 0));

/** The colour of a hollow — a hole, a tunnel, a mouth: near black, a little violet. */
export const HOLLOW = '#17131c';

/** The planet's three axes as the world has them: its north, then two round its equator. */
export const AXES = [new Vector3(0, 1, 0), new Vector3(1, 0, 0), new Vector3(0, 0, 1)].map(a => a.applyQuaternion(TURN));

/** The six ways in: a direction from the planet's middle each, and a name. */
export const WAYS = [
  { name: 'north', dir: AXES[0].clone() }, { name: 'south', dir: AXES[0].clone().negate() },
  { name: '0°', dir: AXES[1].clone() }, { name: '90°', dir: AXES[2].clone() },
  { name: '180°', dir: AXES[1].clone().negate() }, { name: '270°', dir: AXES[2].clone().negate() },
];

/** The three cuts: the axis each is square to, and its screen's right and up — the north up, the equator's from the north. */
export const PLANES = [
  { across: 0, x: AXES[1].clone(), y: AXES[2].clone().negate() },
  { across: 1, x: AXES[2].clone().negate(), y: AXES[0].clone() },
  { across: 2, x: AXES[1].clone(), y: AXES[0].clone() },
];

/** The way in at `p`, on a sphere of `radius` — within `mouth` of it along the ground — or −1. */
export function wayAt(p, radius, mouth) {
  const n = p.clone().normalize();
  return WAYS.findIndex(w => Math.abs(radius) * n.angleTo(w.dir) < mouth);
}

/** The cut a way is gone into by a body heading `f`: of the two through it, the one `f` lies in the most. */
export function planeFor(way, f) {
  const dir = WAYS[way].dir;
  return PLANES.filter(c => Math.abs(AXES[c.across].dot(dir)) < 0.5)
    .reduce((a, b) => (Math.abs(AXES[b.across].dot(f)) < Math.abs(AXES[a.across].dot(f)) ? b : a));
}

/** Where a way is on a cut's screen: right, left, up or down — [x, y], each −1, 0 or 1. */
export const onCut = (plane, way) => [Math.round(WAYS[way].dir.dot(plane.x)), Math.round(WAYS[way].dir.dot(plane.y))];

/** The way a cut's tunnel leads to, `[x, y]` on its screen. */
export function wayOn(plane, [x, y]) {
  const d = plane.x.clone().multiplyScalar(x).addScaledVector(plane.y, y);
  return WAYS.findIndex(w => w.dir.dot(d) > 0.99);
}

const clamp = (x, a) => Math.max(-a, Math.min(a, x));

/**
 * A point of a cut held where a body can be: in the heart, `heart` round, or in a tunnel along one of the cut's
 * two axes, out to the ground at `radius` — its middle at most `play` off the tunnel's.
 */
export function holdIn(x, y, { radius, heart, play }) {
  const r = Math.hypot(x, y);
  if (r <= heart || (Math.abs(x) <= play && Math.abs(y) <= radius) || (Math.abs(y) <= play && Math.abs(x) <= radius)) return [x, y];
  const near = [r > 0 ? [(x * heart) / r, (y * heart) / r] : [0, 0], [clamp(x, play), clamp(y, radius)], [clamp(x, radius), clamp(y, play)]];
  return near.reduce((a, b) => (Math.hypot(b[0] - x, b[1] - y) < Math.hypot(a[0] - x, a[1] - y) ? b : a));
}

/** The tunnel a point of a cut is in, `[x, y]` toward its way — or null, in the heart. */
export function tunnelAt(x, y, { heart, play }) {
  if (Math.hypot(x, y) <= heart) return null;
  if (Math.abs(x) <= play + 1e-6) return [0, Math.sign(y)];
  if (Math.abs(y) <= play + 1e-6) return [Math.sign(x), 0];
  return null;
}
