/**
 * crawl.js — a creature that moves as a worm does: its body — the root
 * chain's stroke — a spine, and every stamp carried with the spine.
 *
 * *In place*, a wave runs down the body: the spine's heading at each point
 * turned by up to `undulate` degrees, a sine `wavelength` px long, running
 * from the head to the tail `ripples` whole times a loop — Hirose's
 * serpenoid — the body's middle kept where it was drawn.
 *
 * *Along a path*, the head runs round a closed path `laps` whole times a
 * loop and the body follows, each point passing where the head passed: a
 * circle, an ellipse, a figure of eight, or a stroke drawn in the gamepad.
 * A `wiggle` laid on the path — `wiggles` sine waves round it, fixed to the
 * ground — makes the body slither through them as a snake does.
 *
 * A stamp is carried rigidly by the spine at the point nearest it at rest
 * (`coordsOf`): its offset in the spine's frame there, and its turn from the
 * spine's heading — so the scales of a body turn with it, and a stalk past
 * the head's end stays on the head. Where the spine has not moved, nothing
 * has. Whole ripples and whole laps close every loop. Pure.
 */

import { pointAt } from './strokes.js';

export const CRAWLS = ['none', 'in place', 'along a path'];
export const PATHS = ['circle', 'ellipse', 'eight', 'drawn'];

const RAD = Math.PI / 180;
const STEP = 4;                  // px between a line's samples
const REACH = 12;                // px either side over which a heading is taken
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * A line sampled every few px along its length: its points, how far along
 * each is, and the way it heads there — taken over a reach either side, so a
 * hand's wobble does not turn it, and unwrapped along an open line.
 *
 * @param {Array<{x, y}>} points
 * @param {object} [opts]   { closed, step }
 */
export function lineOf(points, { closed = false, step = STEP } = {}) {
  const ring = closed ? [...points, points[0]] : points;
  const at = [0];
  for (let i = 1; i < ring.length; i++) at.push(at[i - 1] + Math.hypot(ring[i].x - ring[i - 1].x, ring[i].y - ring[i - 1].y));
  const length = at[at.length - 1];
  const n = Math.max(2, Math.round(length / step) + 1);
  const raw = { points: ring, at, length };
  const out = [];
  for (let i = 0; i < n; i++) out.push(pointAt(raw, (length * i) / (n - 1)));
  if (closed) out.pop();                                   // the last is the first again
  const m = out.length, h = closed ? length / m : length / Math.max(1, m - 1);
  const k = Math.max(1, Math.round(REACH / Math.max(h, 1e-9)));
  const pick = i => (closed ? out[((i % m) + m) % m] : out[Math.max(0, Math.min(m - 1, i))]);
  const heading = out.map((_, i) => { const a = pick(i - k), b = pick(i + k); return Math.atan2(b.y - a.y, b.x - a.x); });
  for (let i = 1; i < m; i++) heading[i] = heading[i - 1] + wrap(heading[i] - heading[i - 1]);
  return { points: out, heading, h, length: closed ? length : h * (m - 1), closed };
}

/** Where a line is `s` along it, and its heading there — past an open line's ends, straight on. */
export function frameAt(line, s) {
  const { points, heading, h, closed } = line, m = points.length;
  if (closed) {
    const u = (((s / h) % m) + m) % m, i = Math.floor(u), j = (i + 1) % m, t = u - i;
    return { x: points[i].x + (points[j].x - points[i].x) * t, y: points[i].y + (points[j].y - points[i].y) * t,
             a: heading[i] + wrap(heading[j] - heading[i]) * t };
  }
  if (s <= 0 || s >= line.length) {
    const end = s <= 0 ? 0 : m - 1, a = heading[end], d = s <= 0 ? s : s - line.length;
    return { x: points[end].x + Math.cos(a) * d, y: points[end].y + Math.sin(a) * d, a };
  }
  const u = s / h, i = Math.min(m - 2, Math.floor(u)), t = u - i;
  return { x: points[i].x + (points[i + 1].x - points[i].x) * t, y: points[i].y + (points[i + 1].y - points[i].y) * t,
           a: heading[i] + (heading[i + 1] - heading[i]) * t };
}

/**
 * Where a point is held by an open line: how far along, its offset in the
 * line's frame there, and its turn from the line's heading. Nearest the
 * line — past its ends, along the end's heading.
 */
export function coordsOf(line, p, rotation = 0) {
  const { points, h } = line, m = points.length;
  let best = { d: Infinity, s: 0 };
  for (let i = 0; i < m - 1; i++) {
    const a = points[i], b = points[i + 1], ex = b.x - a.x, ey = b.y - a.y, span = ex * ex + ey * ey || 1;
    let t = ((p.x - a.x) * ex + (p.y - a.y) * ey) / span;
    if (i > 0) t = Math.max(0, t);
    if (i < m - 2) t = Math.min(1, t);
    const d = Math.hypot(p.x - (a.x + ex * t), p.y - (a.y + ey * t));
    if (d < best.d) best = { d, s: (i + t) * h };
  }
  const f = frameAt(line, best.s), c = Math.cos(f.a), sn = Math.sin(f.a);
  const dx = p.x - f.x, dy = p.y - f.y;
  return { s: best.s, lx: c * dx + sn * dy, ly: -sn * dx + c * dy, turn: rotation - f.a };
}

/** A point carried by a line from where `coordsOf` found it. */
export function carry(line, k) {
  const f = frameAt(line, k.s), c = Math.cos(f.a), sn = Math.sin(f.a);
  return { x: f.x + c * k.lx - sn * k.ly, y: f.y + sn * k.lx + c * k.ly, rotation: k.turn + f.a };
}

/** The phase a whole number of times round a loop has come, at a frame: 0 to 1. */
const through = (times, frame, length) => ((((Math.max(1, Math.round(times)) * Math.round(frame)) % length) + length) % length) / length;

/**
 * The spine undulating in place at a frame: each sample's heading turned by
 * the wave there, the body rebuilt from its middle out, every piece its
 * length — at no wave, the spine as drawn.
 */
export function undulated(spine, { undulate = 0, wavelength = 160, ripples = 1 }, frame, length) {
  const { points, heading, h } = spine, m = points.length, mid = Math.floor((m - 1) / 2);
  const run = through(ripples, frame, length);
  const turn = points.map((_, i) => undulate * RAD * Math.sin(2 * Math.PI * ((i * h) / Math.max(1, wavelength) + run)));
  const out = points.map(p => ({ ...p }));
  const rot = (v, a) => ({ x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a) });
  for (let i = mid + 1; i < m; i++) {
    const d = rot({ x: points[i].x - points[i - 1].x, y: points[i].y - points[i - 1].y }, (turn[i - 1] + turn[i]) / 2);
    out[i] = { x: out[i - 1].x + d.x, y: out[i - 1].y + d.y };
  }
  for (let i = mid - 1; i >= 0; i--) {
    const d = rot({ x: points[i + 1].x - points[i].x, y: points[i + 1].y - points[i].y }, (turn[i] + turn[i + 1]) / 2);
    out[i] = { x: out[i + 1].x - d.x, y: out[i + 1].y - d.y };
  }
  return { ...spine, points: out, heading: heading.map((a, i) => a + turn[i]) };
}

/**
 * A closed path round a centre, sampled: a circle `width` across, an ellipse
 * or a figure of eight `width` by `height` — or `drawn`, points given — then
 * the wiggle laid on it, `wiggles` whole waves round, so it closes.
 *
 * @param {object} values   the panel's: path, pathWidth, pathHeight, way, wiggle, wiggles
 * @param {{x, y}} centre
 * @param {?Array<{x, y}>} [drawn]   a drawn path's points, centred already
 */
export function pathOf(values, centre, drawn = null) {
  const { path = 'ellipse', pathWidth: w = 500, pathHeight: hh = 320, way = 'one way', wiggle = 0, wiggles = 0 } = values;
  let pts = [];
  if (path === 'drawn' && drawn && drawn.length > 2) pts = drawn.map(p => ({ ...p }));
  else {
    const n = 360;
    for (let i = 0; i < n; i++) {
      const t = (2 * Math.PI * i) / n;
      if (path === 'circle') pts.push({ x: centre.x + (w / 2) * Math.cos(t), y: centre.y + (w / 2) * Math.sin(t) });
      else if (path === 'eight') pts.push({ x: centre.x + (w / 2) * Math.sin(t), y: centre.y + hh * Math.sin(t) * Math.cos(t) });
      else pts.push({ x: centre.x + (w / 2) * Math.cos(t), y: centre.y + (hh / 2) * Math.sin(t) });
    }
  }
  if (way === 'the other way') pts.reverse();
  const base = lineOf(pts, { closed: true });
  if (!wiggle || !wiggles) return base;
  const waved = base.points.map((p, i) => {
    const a = base.heading[i], off = wiggle * Math.sin((2 * Math.PI * Math.round(wiggles) * i) / base.points.length);
    return { x: p.x - Math.sin(a) * off, y: p.y + Math.cos(a) * off };
  });
  return lineOf(waved, { closed: true });
}

/**
 * The spine laid along a path at a frame: its head `laps` whole times round
 * a loop, the body behind it on the path, each sample where the head was.
 */
export function alongPath(spine, path, { laps = 1 }, frame, length) {
  const L = spine.length, head = L + path.length * through(laps, frame, length);
  const points = [], heading = [];
  spine.points.forEach((_, i) => {
    const f = frameAt(path, head - (L - i * spine.h));
    points.push({ x: f.x, y: f.y });
    heading.push(f.a);
  });
  for (let i = 1; i < heading.length; i++) heading[i] = heading[i - 1] + wrap(heading[i] - heading[i - 1]);
  return { ...spine, points, heading };
}

/** Whether a rig's values make it crawl at all. */
export const crawls = values => !!values && (values.crawl === 'along a path' || (values.crawl === 'in place' && !!values.undulate));
