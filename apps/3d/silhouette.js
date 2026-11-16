/**
 * silhouette.js — a sprite's outline, traced where its alpha passes a
 * threshold, and a ring of points round it (G4, 2026-11-16).
 *
 * The author: "on tirerait une silhouette du motif utilisé (utilisant un
 * filtre de seuil et une conversion bitmap-to-svg par exemple)". The
 * threshold is the filter; marching squares the tracing, with no library —
 * a tracer is these few dozen lines. Each cell between
 * four pixels' centres is cut where the threshold falls between two of them,
 * the cuts joined into closed loops with the ink always on one side; the
 * picture is padded with a pixel of none, so every loop closes. The outline
 * is the loop that holds the most: its holes and islands are left out — a
 * section of a body is one ring.
 *
 * A ring (`ringOf`) is `n` points at equal steps along an outline,
 * counter-clockwise with y up, from where the line out of its middle to the
 * right crosses it: two sprites' rings, point for point, so a body passes
 * from one to the other without a twist. Pure: numbers in, numbers out.
 */

// The cut each cell makes, by which of its corners are ink — top left 8, top right 4, bottom right 2, bottom
// left 1 — as [from, to] edges, the ink on the right of the way round on the screen: 0 the cell's top, 1 its
// right, 2 its bottom, 3 its left. Two ink corners across a cell are two cuts: they touch at a point only.
const CUTS = [[], [[3, 2]], [[2, 1]], [[3, 1]], [[1, 0]], [[1, 0], [3, 2]], [[2, 0]], [[3, 0]],
  [[0, 3]], [[0, 2]], [[0, 3], [2, 1]], [[0, 1]], [[1, 3]], [[1, 2]], [[2, 3]], []];

/** The shoelace: positive for a loop clockwise on the screen, y down — counter-clockwise with y up. */
export function areaOf(loop) {
  let a = 0;
  for (let i = 0, n = loop.length; i < n; i++) {
    const [x0, y0] = loop[i], [x1, y1] = loop[(i + 1) % n];
    a += x0 * y1 - x1 * y0;
  }
  return a / 2;
}

/**
 * Every loop where `mask` crosses `threshold`, in its pixels (y down, pixel i's centre at i + 0.5): outlines
 * clockwise on the screen, holes the other way.
 *
 * @param {ArrayLike<number>} mask   w × h values, row by row — an alpha
 * @param {number} w
 * @param {number} h
 * @param {number} threshold         ink at or above it
 * @returns {Array<Array<[number, number]>>}
 */
export function loopsOf(mask, w, h, threshold) {
  const W = w + 2;                                    // the corners, padded with none all round
  const at = (x, y) => (x < 1 || y < 1 || x > w || y > h ? 0 : mask[(y - 1) * w + (x - 1)]);
  const ink = (x, y) => at(x, y) >= threshold;
  const cut = (a, b) => (a === b ? 0.5 : (threshold - a) / (b - a));
  const points = new Map(), next = new Map();
  for (let y = 0; y <= h; y++) {
    for (let x = 0; x <= w; x++) {
      const kind = (ink(x, y) << 3) | (ink(x + 1, y) << 2) | (ink(x + 1, y + 1) << 1) | ink(x, y + 1);
      if (!CUTS[kind].length) continue;
      // The cell's four edges: their ids, shared with the next cell's, and where the threshold falls on each.
      const edges = [
        [2 * (y * W + x), () => [x + cut(at(x, y), at(x + 1, y)), y]],
        [2 * (y * W + x + 1) + 1, () => [x + 1, y + cut(at(x + 1, y), at(x + 1, y + 1))]],
        [2 * ((y + 1) * W + x), () => [x + cut(at(x, y + 1), at(x + 1, y + 1)), y + 1]],
        [2 * (y * W + x) + 1, () => [x, y + cut(at(x, y), at(x, y + 1))]],
      ];
      for (const [from, to] of CUTS[kind]) {
        const [a, pa] = edges[from], [b, pb] = edges[to];
        if (!points.has(a)) points.set(a, pa());
        if (!points.has(b)) points.set(b, pb());
        next.set(a, b);
      }
    }
  }
  const loops = [];
  for (const start of next.keys()) {
    if (!points.has(start) || !next.has(start)) continue;
    const loop = [];
    let edge = start;
    while (next.has(edge)) {
      const [px, py] = points.get(edge);
      loop.push([px - 0.5, py - 0.5]);              // a padded corner's place: the pixel before it, its centre
      const to = next.get(edge);
      next.delete(edge);
      edge = to;
    }
    if (loop.length > 2) loops.push(loop);
  }
  return loops;
}

/** The loop that holds the most — the outline — or null when nothing passes the threshold. */
export function outlineOf(mask, w, h, threshold) {
  let best = null, most = 0;
  for (const loop of loopsOf(mask, w, h, threshold)) {
    const a = areaOf(loop);
    if (a > most) { most = a; best = loop; }
  }
  return best;
}

/**
 * `n` points at equal steps round a loop — counter-clockwise with y up, the first where the line from its
 * middle out to the right crosses it.
 *
 * @param {Array<[number, number]>} loop   y up
 * @param {number} n
 * @returns {Array<[number, number]>}
 */
export function ringOf(loop, n) {
  const pts = areaOf(loop) < 0 ? loop.slice().reverse() : loop;
  const m = pts.length;
  // Its middle: the centroid of its area.
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < m; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % m], c = x0 * y1 - x1 * y0;
    a += c; cx += (x0 + x1) * c; cy += (y0 + y1) * c;
  }
  if (Math.abs(a) < 1e-12) { cx = pts[0][0]; cy = pts[0][1]; } else { cx /= 3 * a; cy /= 3 * a; }
  // Where the line out to the right crosses it, furthest out: the ring's first point, on edge `first`.
  let first = 0, t0 = 0, far = -Infinity;
  for (let i = 0; i < m; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % m];
    if ((y0 - cy) * (y1 - cy) > 0 || y0 === y1) continue;
    const t = (cy - y0) / (y1 - y0), x = x0 + (x1 - x0) * t;
    if (x > cx && x > far) { far = x; first = i; t0 = t; }
  }
  // Walk it from there, a point every perimeter / n — edge `first` twice, its start the round's last stretch.
  const lengths = [];
  let total = 0;
  for (let k = 0; k <= m; k++) {
    const i = (first + k) % m, [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % m];
    lengths.push(Math.hypot(x1 - x0, y1 - y0));
    if (k < m) total += lengths[k];
  }
  const out = [];
  let k = 0, done = -lengths[0] * t0;                  // how far along, at the start of edge k
  for (let j = 0; j < n; j++) {
    const s = (j * total) / n;
    while (k < m && done + lengths[k] < s) { done += lengths[k]; k++; }
    const i = (first + k) % m, [x0, y0] = pts[i], [x1, y1] = pts[(i + 1) % m];
    const t = lengths[k] > 0 ? Math.min(1, Math.max(0, (s - done) / lengths[k])) : 0;
    out.push([x0 + (x1 - x0) * t, y0 + (y1 - y0) * t]);
  }
  return out;
}

/** A circle's ring, `n` points of radius `r`, as `ringOf` would trace it: a section for a mark with no sprite. */
export const circleRing = (n, r) => Array.from({ length: n }, (_, j) =>
  [r * Math.cos((2 * Math.PI * j) / n), r * Math.sin((2 * Math.PI * j) / n)]);

/**
 * A sprite's ring, in its own pixels round its centre, y up — the outline of its alpha at `threshold`, or a
 * circle half its size when nothing passes it.
 *
 * @param {{w: number, h: number, alpha: ArrayLike<number>, width: number, height: number}} mask
 *        its alpha on a grid `w` × `h`, the sprite `width` × `height` px
 * @param {number} threshold   0 to 1 of the alpha
 * @param {number} n
 */
export function spriteRing(mask, threshold, n) {
  const loop = outlineOf(mask.alpha, mask.w, mask.h, Math.max(1, Math.round(threshold * 255)));
  if (!loop) return circleRing(n, Math.max(mask.width, mask.height) / 4);
  const ux = mask.width / mask.w, uy = mask.height / mask.h;
  return ringOf(loop.map(([x, y]) => [x * ux - mask.width / 2, mask.height / 2 - y * uy]), n);
}
