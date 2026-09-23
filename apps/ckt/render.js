/**
 * render.js — one frame of stage two, on a canvas.
 *
 * Pure in the sense the suite needs: everything arrives as arguments, nothing
 * reads a clock, the DOM or a random, and the same recipe and tick give the
 * same pixels. The live preview, a saved loop, a brush family and a replay in
 * the vault viewer all come through `renderFrame()` — one drawing path, so
 * they cannot drift apart.
 *
 * ── The world and the frame ─────────────────────────────────────────────────
 *
 * v2 drew in the browser window: the glyph centred in it, the attractor's
 * paths measured against it, and a zoom slider that scaled the drawing about
 * its middle. Here the window is the recipe's `width` x `height` — `hd` by
 * default, which is v2's window — and core/frame.js decides the canvas:
 *
 *   a named or custom size   the window itself; zoom scales about its middle
 *   `source` (canvas)        the window times the zoom
 *   `content` (ink)          cropped to where the dots go over the whole loop
 *
 * ── Trails ──────────────────────────────────────────────────────────────────
 *
 * v2 could stop clearing its canvas, and every frame piled onto the last:
 * that is the stack of offset copies in v2's own screenshots. An endless pile
 * cannot loop and cannot be asked for frame 400 without drawing 399, so here
 * `trail` is how many earlier frames are drawn under this one, oldest first,
 * at full strength as v2 drew them. The loop wraps, so frame 0's trail is the
 * end of the loop before it and the pile closes too.
 */

import { place, STRIDE, loopBounds } from './motion.js';
import { resolveFrame } from '../../core/frame.js';
import { surface }      from './surface.js';

/**
 * A disc's diameter at size 1: the size of a typical v2 sprite, 360px, so
 * switching between a sprite and a disc keeps what you see the same size.
 */
export const DISC = 360;

/** Half a mark's diagonal at size 1 — how far past its dot a mark can reach. */
export function reachOf(mark) {
  return mark ? Math.hypot(mark.width, mark.height) / 2 : DISC / 2;
}

/**
 * Where the drawing goes: the window, the canvas, and the map between them.
 *
 * Worked out once per change, not per frame — for `content` it walks the
 * whole loop to find the ink, and a loop's frames must all be the same size.
 *
 * @param {object} recipe
 * @param {Float64Array} anchors  from motion.js centre()
 * @param {?CanvasImageSource} mark
 */
export function framing(recipe, anchors, mark) {
  const world = { width: recipe.width, height: recipe.height };
  const content = recipe.format === 'content'
    ? loopBounds(anchors, recipe, world, reachOf(mark) * Math.abs(recipe.size) + trailSlack(recipe))
    : { x: 0, y: 0, w: world.width, h: world.height };
  const frame = resolveFrame(recipe, content, world);
  const sx = frame.to.w / frame.from.w;
  const sy = frame.to.h / frame.from.h;
  return {
    world, frame, sx, sy,
    ox: frame.to.x - frame.from.x * sx,
    oy: frame.to.y - frame.from.y * sy,
  };
}

/** A trail is inside the loop's own box already; this is for rounding at the edges. */
const trailSlack = recipe => (recipe.trail ? 1 : 0);

// ── The mark, at the size it will be drawn ───────────────────────────────────

const _prepared = new WeakMap();   // image → Map(factor → canvas)
const _discs = new Map();          // `${color}@${px}` → canvas

/**
 * The factor a mark is pre-shrunk by before it is stamped: a power of two at
 * least twice the drawn size, never above 1. Stamping a 360px sprite at 18px a
 * thousand times a frame makes the browser resample the whole sprite each
 * time; shrinking it once, in halves, is faster and cleaner.
 */
function prepFactor(drawn) {
  if (!(drawn > 0)) return 1;
  return Math.min(1, Math.pow(2, Math.ceil(Math.log2(drawn * 2))));
}

function shrink(image, factor) {
  let src = image, w = image.width, h = image.height;
  while (w * 0.5 >= image.width * factor) {
    const next = surface(Math.max(1, Math.round(w * 0.5)), Math.max(1, Math.round(h * 0.5)));
    const ctx = next.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(src, 0, 0, next.width, next.height);
    src = next; w = next.width; h = next.height;
  }
  return src;
}

function prepared(image, factor) {
  if (factor >= 1) return image;
  let byFactor = _prepared.get(image);
  if (!byFactor) _prepared.set(image, byFactor = new Map());
  if (!byFactor.has(factor)) byFactor.set(factor, shrink(image, factor));
  return byFactor.get(factor);
}

function disc(color, factor) {
  const px = Math.max(2, Math.round(DISC * factor));
  const key = color + '@' + px;
  if (!_discs.has(key)) {
    const c = surface(px, px);
    const ctx = c.getContext('2d');
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px / 2, px / 2, px / 2, 0, Math.PI * 2);
    ctx.fill();
    _discs.set(key, c);
  }
  return _discs.get(key);
}

// ── A frame ──────────────────────────────────────────────────────────────────

/**
 * @param {object} args
 * @param {object} args.recipe   stage two's params.values
 * @param {Float64Array} args.anchors
 * @param {?CanvasImageSource} args.mark   null draws discs in `recipe.color`
 * @param {number} args.tick
 * @param {object} [args.frame]  from framing(); computed if absent
 * @returns {{canvas, drawn: number, scale: number, attractor: {x, y}}}
 */
export function renderFrame({ recipe, anchors, mark, tick, frame }) {
  const f = frame || framing(recipe, anchors, mark);
  const canvas = surface(f.frame.width, f.frame.height);
  const ctx = canvas.getContext('2d');

  if (!recipe.transparent) {
    ctx.fillStyle = recipe.ground;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const native = mark ? Math.max(mark.width, mark.height) : DISC;
  const factor = prepFactor((native * Math.abs(recipe.size) * f.sx) / native);
  const stamp = mark ? prepared(mark, factor) : disc(recipe.color, factor);
  // What one stamp pixel is worth in world pixels, so the matrix below puts a
  // pre-shrunk stamp down at the size the original would have been.
  const kx = (mark ? mark.width : DISC) / stamp.width;
  const ky = (mark ? mark.height : DISC) / stamp.height;
  const hw = stamp.width / 2, hh = stamp.height / 2;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const n = anchors.length / 2;
  const trail = Math.max(0, Math.min(Math.round(recipe.trail || 0), Math.round(recipe.period) - 1));
  let buf = null, drawn = 0, attractor = null;

  for (let k = trail; k >= 0; k--) {
    const placed = place(anchors, recipe, tick - k, f.world, buf);
    buf = placed.dots;
    if (k === 0) attractor = placed.attractor;

    for (let i = 0; i < n; i++) {
      const o = i * STRIDE;
      const s = buf[o + 3];
      if (s === 0) continue;                       // a pulse passing through zero
      const c = Math.cos(buf[o + 2]), si = Math.sin(buf[o + 2]);
      // camera · translate(x, y) · rotate · scale(s), in one matrix
      ctx.setTransform(
        f.sx * s * c * kx,  f.sy * s * si * kx,
        -f.sx * s * si * ky, f.sy * s * c * ky,
        f.ox + f.sx * buf[o], f.oy + f.sy * buf[o + 1]);
      ctx.drawImage(stamp, -hw, -hh);
      drawn++;
    }
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { canvas, drawn, scale: f.sx, attractor };
}
