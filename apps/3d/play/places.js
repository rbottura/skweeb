/**
 * places.js — where the worm is played, and the ways between (docs/worm.md,
 * the heart): on the planet's ground (main.js), in a cut — a tunnel, seen
 * flat (section.js) — or in the heart, floating round its matrix
 * (heart.js, orbit.js).
 *
 * Walked into a way in on the ground — on it, not under it, nor mid-phase —
 * the worm goes into the cut that way lies in the most along its heading
 * (access.js `planeFor`), at the ground's end of its tunnel; down it, into
 * the heart: floating under that tunnel's mouth, off the wall, between it
 * and the matrix (M16o). Moved round the matrix there, the camera on both;
 * aimed, a mouth found on the wall and gone into at a press — back into a
 * cut at that tunnel's heart end; out of it at the ground — by any of the
 * cut's four ways — set beside that way's hole, facing away from it. For
 * now each way between is a cut: the camera put at once where it is next.
 *
 * Each frame, the place the worm is in moves it — `tickCut`, `tickHeart`;
 * the ground's is main.js's. `visit` sets it down by a way: for the checks.
 */

import { Vector3 } from '../../../core/libs/three/three.core.js';
import { AXES, WAYS, planeFor, onCut, wayOn } from './access.js';
import { frameOf, settle } from './walker.js';
import { follow } from './follow.js';
import { LOOK } from './orbit.js';

/** The camera's field in the heart, degrees: wider, for a smaller room. */
export const HEART_FOV = 75;
/** Aimed, the gaze turned by keys, or by a stick at its end, radians a second. */
const KEYS = 1.6, STICK = 2.6;

/** A planet's heart and its ways as the rows have them: its radius, the heart's, a tunnel's width, the worm's size. */
export const heartOf = v => ({ radius: v.radius, heart: v.core * v.radius, width: v.tunnel * v.size, size: v.size,
                               matrix: v.matrix, colour: v.matrixColour });

/** How far from the heart's middle the worm floats: `float` of the way from its matrix out to its wall. */
export function floatsAt(v) {
  const h = heartOf(v), m = h.matrix * h.heart;
  return m + v.float * (h.heart - m);
}

const longOf = worm => worm.front - worm.back;

/** The screen's up for the worm floating at `dir`: the north, unless it floats there — then the 0° way. */
const upAt = dir => (Math.abs(dir.dot(WAYS[0].dir)) > 0.9 ? WAYS[2].dir : WAYS[0].dir);

/** Body `b` posed where it has walked — its wave, its dive, the planet's curve — and hung in its walker's frame; floating, in the heart. */
export function hang(s, b, dt = 0) {
  if (s.place === 'heart' && b === s.phasing.walked) return hangFloating(s, b, dt);
  const v = s.params.values;
  b.worm.pose(b.walker.walked, { radius: v.radius, dive: b.dive, leap: v.leap * v.size, depth: v.depth * v.size });
  b.worm.place(frameOf(b.walker), b.walker.p);
}

/** The walked worm floating: straight, no ground to lie on, its wave by how far it has gone, its middle where it floats, turned as shown. */
function hangFloating(s, b, dt) {
  const v = s.params.values, worm = b.worm, p = s.orbit.dir.clone().multiplyScalar(floatsAt(v));
  worm.pose(b.walker.walked);
  const frame = s.orbit.shown(v.ease, dt, s.snap);
  worm.place(frame, p);
  const ball = worm.mesh.geometry.boundingSphere;
  if (ball) worm.place(frame, p.clone().multiplyScalar(2).sub(ball.center.clone().applyMatrix4(worm.mesh.matrix)));
  b.walker.p.copy(p);
  b.walker.f.copy(frame.forward);
}

/** Walker `w` on the planet `off` along it from `dir` toward `t`, facing on. */
function setBeside(w, dir, t, radius, off) {
  const a = off / radius, c = Math.cos(a), n = Math.sin(a);
  w.p.copy(dir).multiplyScalar(c).addScaledVector(t, n).multiplyScalar(radius);
  w.f.copy(dir).multiplyScalar(-n).addScaledVector(t, c);
  w.inside = false;
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

/** Into the heart from a cut's tunnel by `way`: floating under its mouth, off the wall, facing as it faced in the cut. */
export function enterHeart(s, way) {
  const v = s.params.values, me = s.phasing.walked, dir = WAYS[way].dir;
  s.orbit.set(dir, upAt(dir), s.section.face < 0 ? Math.PI : 0);
  me.worm.flatten(true);
  s.heart.build(heartOf(v), me.reality, s.planet.present).scene.add(me.worm.mesh);
  s.place = 'heart';
  s.snap = true;
  s.aimed = -1;
  hang(s, me);
}

/** Out on the ground from a cut's tunnel at `at`: beside that way's hole, facing away from it. */
export function enterGround(s, way, at) {
  const v = s.params.values, me = s.phasing.walked, h = heartOf(v);
  setBeside(me.walker, WAYS[way].dir, onward(s.section.plane, at, s.section.face), v.radius, h.width / 2 + 0.6 * longOf(me.worm));
  me.worm.flatten(false);
  s.planet.scene.add(me.worm.mesh);
  s.place = 'ground';
  s.snap = true;
  hang(s, me);
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
  else enterHeart(s, way);
}

/**
 * A frame in the heart, weightless: moved round the matrix by the hands, the camera out behind it looking at the
 * matrix — or, aimed, its gaze turned by the pointer, a key or a stick, the mouth it finds lit, gone into at a click,
 * Space or the pad's first button; the matrix's things drifting.
 */
export function tickHeart(s, dt, hands) {
  const v = s.params.values, me = s.phasing.walked, h = heartOf(v), o = s.orbit;
  if (hands.aim && !o.gaze) o.aim(s.camera.getWorldDirection(new Vector3()), s.camera.up);
  else if (!hands.aim && o.gaze) o.free();
  const x = hands.turn || 0, y = hands.move || 0;
  if (o.gaze) {
    const [dx, dy] = hands.look || [0, 0], [sx, sy] = hands.stick || [0, 0];
    o.turn(dx * LOOK + (x * KEYS + sx * STICK) * dt, -dy * LOOK + (y * KEYS - sy * STICK) * dt);
  } else me.walker.walked += o.swim({ x, y }, dt, { radius: floatsAt(v), speed: v.drift, turnRate: (2 * v.turn * Math.PI) / 180 });
  hang(s, me, dt);
  s.heart.update(dt);
  s.aimed = o.found(me.walker.p, h.heart, h.width);
  s.heart.light(s.aimed);
  if (s.aimed >= 0 && (hands.go || hands.dive)) return enterCut(s, s.aimed, { fromHeart: true });
  follow(s.camera, o.view(me.walker.p, { heart: h.heart, matrix: h.matrix * h.heart, long: longOf(me.worm) }), v.ease, dt, s.snap);
  s.snap = false;
}

/** The heart, or a cut, built again as the rows now say — the walked worm floating where it was. */
export function refit(s) {
  const v = s.params.values, me = s.phasing.walked, h = heartOf(v);
  if (s.place === 'heart') {
    s.heart.build(h, me.reality, s.planet.present);
    hang(s, me);
  } else if (s.place === 'cut') s.section.build(h, me.reality);
}

/** A way square to `dir`: of the planet's axes the one most square to it, made exactly so. */
function squareTo(dir) {
  const t = AXES.reduce((a, b) => (Math.abs(b.dot(dir)) < Math.abs(a.dot(dir)) ? b : a)).clone();
  return t.addScaledVector(dir, -t.dot(dir)).normalize();
}

/** For the checks: the walked worm set down on the ground `away` from where `dir` points up, facing it. */
export function setDown(s, dir, { away = 3 } = {}) {
  const v = s.params.values, me = s.phasing.walked;
  setBeside(me.walker, dir.clone().normalize(), squareTo(dir.clone().normalize()), v.radius, away);
  me.walker.f.negate();
  me.worm.flatten(false);
  s.planet.scene.add(me.worm.mesh);
  s.place = 'ground';
  s.snap = true;
  s.aimed = -1;
  hang(s, me);
}

/**
 * For the checks: the walked worm set down `away` from way `way` — on the ground facing it, or in the heart floating
 * that far round from under its mouth.
 */
export function visit(s, way, { heart = false, away = 3 } = {}) {
  const v = s.params.values, me = s.phasing.walked, dir = WAYS[way].dir;
  if (!heart) return setDown(s, dir, { away });
  const a = away / floatsAt(v), at = dir.clone().multiplyScalar(Math.cos(a)).addScaledVector(squareTo(dir), Math.sin(a));
  s.orbit.set(at, upAt(at), 0);
  me.worm.flatten(true);
  s.heart.build(heartOf(v), me.reality, s.planet.present).scene.add(me.worm.mesh);
  s.place = 'heart';
  s.snap = true;
  s.aimed = -1;
  hang(s, me);
}
