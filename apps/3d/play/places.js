/**
 * places.js — where the worm is played, and the ways between (docs/worm.md,
 * the heart): on the planet's ground (main.js), in a cut — a tunnel, seen
 * flat (section.js) — or in the heart, on the inside of its hollow
 * (heart.js).
 *
 * Walked into a way in on the ground — on it, not under it, nor mid-phase —
 * the worm goes into the cut that way lies in the most along its heading
 * (access.js `planeFor`), at the ground's end of its tunnel; down it, into
 * the heart: set on its wall by that tunnel's mouth, facing on. Walked into
 * a mouth there, back into a cut at the tunnel's heart end; out of it at
 * the ground — by any of the cut's four ways — set beside that way's hole,
 * facing away from it. For now each way between is a cut: the camera put
 * at once where it is next.
 *
 * Each frame, the place the worm is in moves it — `tickCut`, `tickHeart`;
 * the ground's is main.js's. `visit` sets it down by a way: for the checks.
 */

import { AXES, WAYS, wayAt, planeFor, onCut, wayOn } from './access.js';
import { frameOf, step, settle } from './walker.js';
import { aimBehind, follow } from './follow.js';

/** The camera's field in the heart, degrees: wider, for a smaller room. */
export const HEART_FOV = 75;

/** A planet's heart and its ways as the rows have them: its radius, the heart's, a tunnel's width, the worm's size. */
export const heartOf = v => ({ radius: v.radius, heart: v.core * v.radius, width: v.tunnel * v.size, size: v.size });

const longOf = worm => worm.front - worm.back;

/** Body `b` posed where it has walked — its wave, its dive, its sphere's curve — and hung in its walker's frame. */
export function hang(s, b) {
  const v = s.params.values, radius = b.walker.inside ? -heartOf(v).heart : v.radius;
  b.worm.pose(b.walker.walked, { radius, dive: b.dive, leap: v.leap * v.size, depth: v.depth * v.size });
  b.worm.place(frameOf(b.walker), b.walker.p);
}

/** Walker `w` on a sphere of `radius` — on its inside, `inside` — `off` along it from `dir` toward `t`, facing on. */
function setBeside(w, dir, t, radius, off, inside) {
  const a = off / radius, c = Math.cos(a), n = Math.sin(a);
  w.p.copy(dir).multiplyScalar(c).addScaledVector(t, n).multiplyScalar(radius);
  w.f.copy(dir).multiplyScalar(-n).addScaledVector(t, c);
  w.inside = inside;
  return settle(w, radius);
}

/** Along the ground from a cut's way at `at`, the way the worm faces on its screen. */
const onward = (plane, at, face) => (at[0] ? plane.y.clone() : plane.x.clone().multiplyScalar(face));

/** Into a cut by `way`: from the ground at the top of its tunnel, or from the heart (`fromHeart`) at its bottom. */
export function enterCut(s, way, { fromHeart = false } = {}) {
  const v = s.params.values, me = s.phasing.walked, h = heartOf(v);
  const plane = planeFor(way, me.walker.f);
  me.worm.flatten(true);
  s.section.build(h, me.reality).enter(plane, onCut(plane, way), {
    fromHeart, radius: h.radius, heart: h.heart, long: longOf(me.worm), face: Math.sign(me.walker.f.dot(plane.x)) || 1 });
  s.place = 'cut';
  s.snap = true;
}

/** Into the heart from a cut's tunnel at `at`: on its wall beside that way's mouth, facing on. */
export function enterHeart(s, way, at) {
  const v = s.params.values, me = s.phasing.walked, h = heartOf(v);
  setBeside(me.walker, WAYS[way].dir, onward(s.section.plane, at, s.section.face), h.heart, h.width / 2 + 0.6 * longOf(me.worm), true);
  me.worm.flatten(false);
  s.heart.build(h, me.reality).scene.add(me.worm.mesh);
  hang(s, me);
  s.place = 'heart';
  s.snap = true;
}

/** Out on the ground from a cut's tunnel at `at`: beside that way's hole, facing away from it. */
export function enterGround(s, way, at) {
  const v = s.params.values, me = s.phasing.walked, h = heartOf(v);
  setBeside(me.walker, WAYS[way].dir, onward(s.section.plane, at, s.section.face), v.radius, h.width / 2 + 0.6 * longOf(me.worm), false);
  me.worm.flatten(false);
  s.planet.scene.add(me.worm.mesh);
  hang(s, me);
  s.place = 'ground';
  s.snap = true;
}

/** A frame in a cut: moved by the hands — right, left, up, down — and out by a way, or into the heart. */
export function tickCut(s, dt, hands) {
  const v = s.params.values, me = s.phasing.walked, h = heartOf(v), cut = s.section.fit(me.worm);
  const limits = { radius: h.radius, heart: h.heart, play: Math.max(0, h.width / 2 - cut.half * v.size) };
  me.walker.walked += cut.step({ x: hands.turn, y: hands.move }, dt, { speed: v.under, turnRate: (2 * v.turn * Math.PI) / 180, ...limits });
  me.worm.pose(me.walker.walked);
  cut.draw(me.worm);
  cut.look(s.aspect || 1.6, 3.5 * longOf(me.worm), v.ease, dt, s.snap);
  s.snap = false;
  const out = cut.leaving({ ...limits, long: longOf(me.worm) });
  if (!out) return;
  const way = wayOn(cut.plane, out.at);
  if (out.to === 'ground') enterGround(s, way, out.at);
  else enterHeart(s, way, out.at);
}

/** A frame in the heart: walked on its wall as on the ground, and into a mouth back to a cut. */
export function tickHeart(s, dt, hands) {
  const v = s.params.values, me = s.phasing.walked, h = heartOf(v);
  step(me.walker, hands, dt, { radius: h.heart, speed: v.speed, turnRate: (v.turn * Math.PI) / 180 });
  hang(s, me);
  const way = wayAt(me.walker.p, h.heart, h.width / 2);
  if (way >= 0) return enterCut(s, way, { fromHeart: true });
  const room = Math.max(0.5, 0.4 * h.heart);
  const aim = aimBehind(frameOf(me.walker), me.walker.p, {
    distance: Math.min(0.5 * v.distance * v.size, room), height: Math.min(0.35 * v.height * v.size, room) }, v.size);
  follow(s.camera, aim, v.ease, dt, s.snap);
  s.snap = false;
}

/** The heart, or a cut, built again as the rows now say — the walked worm kept where it is on it. */
export function refit(s) {
  const v = s.params.values, me = s.phasing.walked, h = heartOf(v);
  if (s.place === 'heart') {
    s.heart.build(h, me.reality);
    settle(me.walker, h.heart);
    hang(s, me);
  } else if (s.place === 'cut') s.section.build(h, me.reality);
}

/** For the checks: the walked worm set down `away` from way `way` — on the ground, or in the heart — facing it. */
export function visit(s, way, { heart = false, away = 3 } = {}) {
  const v = s.params.values, me = s.phasing.walked, h = heartOf(v), dir = WAYS[way].dir;
  const t = AXES.find(a => Math.abs(a.dot(dir)) < 0.5).clone();
  setBeside(me.walker, dir, t, heart ? h.heart : v.radius, away, heart);
  me.walker.f.negate();
  me.worm.flatten(false);
  if (heart) s.heart.build(h, me.reality).scene.add(me.worm.mesh);
  else s.planet.scene.add(me.worm.mesh);
  hang(s, me);
  s.place = heart ? 'heart' : 'ground';
  s.snap = true;
}
