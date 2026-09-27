/**
 * copies.js — a sprite that copies itself: an iterated function system,
 * drawn with the sprite instead of points.
 *
 * A few maps — each a shrink, a turn and a move — are applied to the
 * sprite, and to every copy they make, `depth` times: a triangle of three
 * half-size copies is Sierpiński's, eight thirds round a hole is his
 * carpet, a copy on the tip of itself leaning left and right is a tree, one
 * copy smaller and turned each time is a spiral. Nothing is drawn at
 * random: the copies are the maps' compositions, all of them, generation by
 * generation, so the picture is a function of its params and draws again
 * at any size from the sprite's own pixels (core/stamps.js `mipFor`).
 *
 * ── Spaces ─────────────────────────────────────────────────────────────────
 *
 * The maps work in the sprite's unit box: the sprite fitted, its shape
 * kept, inside the square −½…½ across and down, y down as a canvas has it.
 * A matrix is a canvas's `[a, b, c, d, e, f]`. All the copies are then
 * fitted to the picture together (`fitOf`), and scaled and turned about its
 * centre by `size` and `turn`, so every shape fills the picture at size 1.
 */

const DEG = Math.PI / 180;

/** More copies than this is a recipe mistake: the last generation that would pass it is left out. */
export const MAX_COPIES = 50000;

// ── Matrices ─────────────────────────────────────────────────────────────────

/** `m` after `n`: the map that does `n`, then `m`. */
export const mul = (m, n) => [
  m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
];
export const apply = (m, [x, y]) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
const I = [1, 0, 0, 1, 0, 0];
const T = (x, y) => [1, 0, 0, 1, x, y];
const S = k => [k, 0, 0, k, 0, 0];
/** Turned `deg` degrees clockwise on the screen. */
const R = deg => { const c = Math.cos(deg * DEG), s = Math.sin(deg * DEG); return [c, s, -s, c, 0, 0]; };
const chain = (...ms) => ms.reduce(mul, I);

// ── The shapes ───────────────────────────────────────────────────────────────

/**
 * Each shape's maps from the params, and the params it starts from when it
 * is picked: `ratio` each copy's size, `twist` each copy's turn, and for a
 * tree `spread` between its branches and how many.
 */
export const SHAPES = {
  /** Three half-size copies at a triangle's corners: Sierpiński's triangle. */
  triangle: {
    start: { ratio: 0.5, twist: 0, depth: 6, show: 'last' },
    maps: ({ ratio: r, twist }) => [-90, 30, 150].map(a => {
      const q = ((1 - r) / 2) * 1.1547;             // the corners of a triangle round the box
      return chain(T(Math.cos(a * DEG) * q, Math.sin(a * DEG) * q), R(twist), S(r));
    }),
  },
  /** Eight thirds round an empty middle: Sierpiński's carpet. */
  carpet: {
    start: { ratio: 1 / 3, twist: 0, depth: 4, show: 'last' },
    maps: ({ ratio: r, twist }) => {
      const out = [], q = (1 - r) / 2;
      for (const j of [-1, 0, 1]) for (const i of [-1, 0, 1]) {
        if (i || j) out.push(chain(T(i * q, j * q), R(twist), S(r)));
      }
      return out;
    },
  },
  /** A centre and four arms: Vicsek's cross. */
  cross: {
    start: { ratio: 1 / 3, twist: 0, depth: 4, show: 'last' },
    maps: ({ ratio: r, twist }) => {
      const q = (1 - r) / 2;
      return [[0, 0], [-q, 0], [q, 0], [0, -q], [0, q]].map(([x, y]) => chain(T(x, y), R(twist), S(r)));
    },
  },
  /** Copies standing on the tip of each copy, leaning apart: a tree. */
  tree: {
    start: { ratio: 0.68, twist: 0, depth: 9, show: 'every', spread: 50, branches: 2 },
    maps: ({ ratio: r, twist, spread, branches }) => {
      const n = Math.max(1, Math.round(branches));
      return Array.from({ length: n }, (_, i) => {
        const lean = n === 1 ? 0 : -spread / 2 + (spread * i) / (n - 1);
        // Its foot, (0, ½), on the parent's tip, (0, −½): shrunk, turned, lifted.
        return chain(T(0, -0.5), R(lean + twist), S(r), T(0, -0.5));
      });
    },
  },
  /** One copy on the tip of each, smaller and turned: a spiral. */
  spiral: {
    start: { ratio: 0.9, twist: 20, depth: 40, show: 'every' },
    maps: ({ ratio: r, twist }) => [chain(T(0, -0.5), R(twist), S(r), T(0, -0.5))],
  },
};

// ── The copies ───────────────────────────────────────────────────────────────

/**
 * Every copy, generation by generation — the sprite itself first, then the
 * copies its maps make of it, then theirs — so a parent is drawn under its
 * children. `branch` is the map that made a copy last; `level` its
 * generation. With `show: 'last'` only the deepest generation is kept, as
 * Sierpiński drew his.
 *
 * @param {object} v   { shape, depth, ratio, twist, spread, branches, show }
 * @returns {{copies: Array<{m: number[], level: number, branch: number}>, depth: number}}
 *          `depth` the generations made, fewer than asked when MAX_COPIES stopped it
 */
export function copiesOf(v) {
  const shape = SHAPES[v.shape] || SHAPES.triangle;
  const maps = shape.maps(v);
  let generation = [{ m: I, level: 0, branch: 0 }];
  const all = [...generation];
  let depth = 0;
  for (let level = 1; level <= v.depth; level++) {
    if (all.length + generation.length * maps.length > MAX_COPIES) break;
    generation = generation.flatMap(g => maps.map((map, branch) => ({ m: mul(g.m, map), level, branch })));
    all.push(...generation);
    depth = level;
  }
  return { copies: v.show === 'last' ? all.filter(c => c.level === depth) : all, depth };
}

/** The sprite's box in unit space: fitted in the square, its shape kept. */
export function boxOf(aspect) {
  const a = aspect > 0 ? aspect : 1;            // height over width
  return a <= 1 ? { w: 1, h: a } : { w: 1 / a, h: 1 };
}

/**
 * The map from unit space to the picture's pixels that holds every copy,
 * margin and all, at its centre — then `size` times that, turned by `turn`
 * about the picture's centre.
 *
 * @param {Array<{m}>} copies
 * @param {{w, h}} box        the sprite's unit box
 * @param {number} W          the picture, in its pixels
 * @param {number} H
 * @param {object} v          { size, turn }
 */
export function fitOf(copies, box, W, H, v) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const corners = [[-box.w / 2, -box.h / 2], [box.w / 2, -box.h / 2], [box.w / 2, box.h / 2], [-box.w / 2, box.h / 2]];
  for (const { m } of copies) {
    for (const p of corners) {
      const [x, y] = apply(m, p);
      if (x < x0) x0 = x; if (x > x1) x1 = x;
      if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
  }
  if (!Number.isFinite(x0)) return chain(T(W / 2, H / 2), S(Math.min(W, H) / 2));
  const k = Math.min((W * 0.92) / (x1 - x0 || 1), (H * 0.92) / (y1 - y0 || 1));
  return chain(T(W / 2, H / 2), R(v.turn || 0), S(k * (v.size || 1)), T(-(x0 + x1) / 2, -(y0 + y1) / 2));
}

/**
 * Draw the copies: the ground, then each copy, a parent under its children.
 *
 * @param {CanvasRenderingContext2D} ctx   a canvas the picture's size times `scale`
 * @param {object} v                        the values
 * @param {?Array} sprites                  images (core/sprites.js); none, a dot in `ink`
 * @param {number} scale                    canvas pixels per picture pixel
 * @param {(image, px) => CanvasImageSource} mip   core/stamps.js `mipFor`
 * @returns {{copies: number, depth: number}}
 */
export function drawCopies(ctx, v, sprites, scale, mip) {
  const W = v.width, H = v.height;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (v.ground && v.ground !== 'none') {
    ctx.fillStyle = v.ground;
    ctx.fillRect(0, 0, W * scale, H * scale);
  }
  const n = sprites ? sprites.length : 0;
  const box = boxOf(n ? sprites[0].height / sprites[0].width : 1);
  const { copies, depth } = copiesOf(v);
  const base = mul(S(scale), fitOf(copies, box, W, H, v));
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = v.ink || '#111111';

  for (const { m, level, branch } of copies) {
    const M = mul(base, m);
    ctx.setTransform(M[0], M[1], M[2], M[3], M[4], M[5]);
    if (!n) {
      ctx.beginPath();
      ctx.arc(0, 0, 0.35, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    const img = sprites[(v.pick === 'branch' ? branch : level) % n];
    const b = boxOf(img.height / img.width);
    const px = Math.hypot(M[0], M[1]) * b.w;    // how wide it lands, in canvas pixels
    if (px < 0.25) continue;                    // smaller than a quarter pixel: nothing to see
    ctx.drawImage(mip(img, px), -b.w / 2, -b.h / 2, b.w, b.h);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { copies: copies.length, depth };
}
