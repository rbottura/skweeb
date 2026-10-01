/**
 * strokes.js — a drawing's strokes found again from its marks, and each
 * stroke's line: where it bends.
 *
 * The gamepad stamps for as long as A is held, and the recorder keeps a mark
 * only when the brush moved, turned or grew (core/stage/recorder.js). So a
 * pen held still leaves a pause in time but no gap in space, and a pen lifted
 * and moved leaves a jump: a stroke ends where the brush jumps further than
 * `jump` px, or six of its usual steps. The author's slug: steps of 2.6 px,
 * jumps between strokes of 74 to 475, seven strokes (docs/roadmap.md, M9).
 *
 * A stroke's line is its marks' centres in order, measured along its length
 * (`pathOf`), and a corner is where the line turns by more than `corner`
 * degrees over a short reach either side (`cornersOf`) — an elbow, a knee.
 * Pure: numbers in, numbers out.
 */

const median = values => {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
};

/** The usual distance between two marks of a stroke: the median step. */
export function stepOf(points) {
  const steps = [];
  for (let i = 1; i < points.length; i++) steps.push(Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  return median(steps);
}

/**
 * The marks split into strokes where the pen was lifted.
 *
 * @param {Array<{x: number, y: number}>} marks   in the order drawn
 * @param {object} [opts]
 * @param {number} [opts.jump=16]   the least jump, px, that is a lifted pen
 * @returns {number[][]}  each stroke, its marks' indices
 */
export function strokesOf(marks, { jump = 16 } = {}) {
  if (!marks.length) return [];
  const limit = Math.max(jump, 6 * stepOf(marks));
  const out = [[0]];
  for (let i = 1; i < marks.length; i++) {
    const d = Math.hypot(marks[i].x - marks[i - 1].x, marks[i].y - marks[i - 1].y);
    if (d > limit) out.push([i]);
    else out[out.length - 1].push(i);
  }
  return out;
}

/**
 * A stroke's line: its points, each measured along it from the start.
 *
 * @param {Array<{x: number, y: number}>} points
 * @returns {{points: Array<{x, y}>, at: number[], length: number}}  `at[i]` how far along point i is
 */
export function pathOf(points) {
  const at = [0];
  for (let i = 1; i < points.length; i++) {
    at.push(at[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y));
  }
  return { points: points.map(p => ({ x: p.x, y: p.y })), at, length: at[at.length - 1] || 0 };
}

/** The point `s` along a path, between its points. */
export function pointAt(path, s) {
  const { points, at } = path;
  if (!points.length) return { x: 0, y: 0 };
  if (s <= 0 || points.length === 1) return { ...points[0] };
  if (s >= path.length) return { ...points[points.length - 1] };
  let i = 1;
  while (i < at.length - 1 && at[i] < s) i++;
  const span = at[i] - at[i - 1], t = span > 0 ? (s - at[i - 1]) / span : 0;
  return { x: points[i - 1].x + (points[i].x - points[i - 1].x) * t, y: points[i - 1].y + (points[i].y - points[i - 1].y) * t };
}

const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));

/**
 * Where a path turns: how far along each corner is, nearest first.
 *
 * The turn at a point is the change of heading from `reach` px before it to
 * `reach` px after; a corner is a turn past `corner` degrees, the sharpest of
 * its neighbours, at least `reach` from the ends and from another corner.
 *
 * @param {object} path       pathOf's
 * @param {object} [opts]
 * @param {number} [opts.corner=30]   degrees
 * @param {number} [opts.reach]       px either side; five steps, and 12 px at least
 * @returns {number[]}
 */
export function cornersOf(path, { corner = 30, reach } = {}) {
  const r = reach || Math.max(12, 5 * stepOf(path.points));
  if (path.length < 2 * r) return [];
  const limit = (corner * Math.PI) / 180;
  const turns = [];
  for (let s = r; s <= path.length - r; s += r / 6) {
    const p = pointAt(path, s), a = pointAt(path, s - r), b = pointAt(path, s + r);
    const turn = Math.abs(wrap(Math.atan2(b.y - p.y, b.x - p.x) - Math.atan2(p.y - a.y, p.x - a.x)));
    turns.push({ s, turn });
  }
  const out = [];
  for (let i = 1; i < turns.length - 1; i++) {
    const { s, turn } = turns[i];
    // A peak, with a turn sampled either side: the sharpest turn at the edge
    // of what is sampled is a flick past it, nearer the end than `reach`.
    if (turn < limit || turns[i - 1].turn > turn || turns[i + 1].turn >= turn) continue;
    if (out.length && s - out[out.length - 1] < r) continue;
    out.push(s);
  }
  return out;
}
