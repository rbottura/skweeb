/**
 * map.js — the dither, as arithmetic.
 *
 * Grid is one idea: a source image is resized so that one pixel is one cell,
 * each pixel's luminance picks a member of an ordered ramp, and each cell
 * draws that member. Everything else is presentation. This file is that idea
 * with no canvas anywhere in it, which is what makes it testable and what lets
 * render() run at print scale without a browser in the loop.
 *
 * ── What the original did, and why this does not ────────────────────────────
 *
 * grid_sketch summed pixels like this:
 *
 *     if (i == 0)                 sum += arr[i]
 *     else if ((i + 1) % 4 == 0)  { push(map(sum - 255, ...)); sum = 0; sum += arr[i] }
 *     else                        sum += arr[i]
 *
 * The reset branch zeroes `sum` and then immediately adds `arr[i]` — which at
 * that index is **alpha**. So every pixel after the first carried the previous
 * pixel's alpha, a flat +255 on an opaque image, and the unexplained `- 255`
 * in the map() was cancelling it back out. Two bugs annihilating, which is why
 * it looked right.
 *
 * They do not quite cancel for pixel 0, which has no alpha added but is still
 * short 255. One cell in nine thousand, invisible, and the reason nobody
 * caught it. Striding by four removes both the bug and its compensation.
 *
 * ── Alpha ───────────────────────────────────────────────────────────────────
 *
 * The original ignored alpha, having accidentally eaten it. Most of what this
 * suite makes is cut out — a gamepad drawing is ink on nothing — so a
 * transparent pixel is not a black one. Below `alphaFloor` a cell maps to -1,
 * meaning draw nothing, and the ground shows through.
 */

/** Channel weights. Rec. 709 is how an eye reads brightness; flat is how the original did. */
export const WEIGHTS = {
  perceptual: [0.2126, 0.7152, 0.0722],
  flat:       [1 / 3, 1 / 3, 1 / 3],
};

/**
 * 0 for black, 1 for white.
 *
 * Each channel is normalised before it is weighted, which is not a style
 * choice: `(255*w0 + 255*w1 + 255*w2) / 255` accumulates rounding and gives
 * 0.9999999999999999 for white, while `1*w0 + 1*w1 + 1*w2` is exactly 1
 * because the weights themselves sum to exactly 1 in binary. The endpoints
 * are the values everything else is stated in terms of, so they should be
 * exact rather than nearly.
 *
 * The clamp then only has to cover a custom weighting whose channels do not
 * sum to one.
 */
export function luminance(r, g, b, weighting = 'perceptual') {
  const w = WEIGHTS[weighting] || WEIGHTS.perceptual;
  const lum = (r / 255) * w[0] + (g / 255) * w[1] + (b / 255) * w[2];
  return lum < 0 ? 0 : lum > 1 ? 1 : lum;
}

/**
 * How many cells fit, and how much of the surface they actually cover.
 *
 * Whole cells only — a partial column at the edge would be a ramp member
 * clipped in half, which reads as a mistake rather than as a margin. What is
 * left over is returned as the margin so a caller can centre the grid, which
 * is what the original did by hand with `WiW % cellSize`.
 */
export function gridSize({ width, height, cell }) {
  const size = Math.max(1, Math.floor(cell) || 1);
  const cols = Math.max(0, Math.floor(width / size));
  const rows = Math.max(0, Math.floor(height / size));
  return {
    cols, rows, cell: size,
    w: cols * size,
    h: rows * size,
    marginX: Math.max(0, width - cols * size),
    marginY: Math.max(0, height - rows * size),
  };
}

/**
 * One ramp index per pixel.
 *
 * @param {Uint8ClampedArray|Uint8Array|number[]} pixels  RGBA, already resized
 *        so that one pixel is one cell. Resizing is the caller's job because
 *        it needs a canvas and this file will not have one.
 * @param {object} opts
 * @param {number} opts.steps           members in the ramp
 * @param {boolean} [opts.invert=false] flip light and dark
 * @param {number} [opts.alphaFloor=8]  below this, the cell is empty (-1)
 * @param {string} [opts.weighting='perceptual']
 * @returns {Int16Array} index per pixel; -1 means draw nothing
 */
export function mapPixels(pixels, { steps, invert = false, alphaFloor = 8, weighting = 'perceptual' } = {}) {
  const count = Math.max(1, Math.floor(steps) || 1);
  const total = Math.floor((pixels ? pixels.length : 0) / 4);
  const out = new Int16Array(total);
  const last = count - 1;

  for (let i = 0; i < total; i++) {
    const p = i * 4;

    if (pixels[p + 3] < alphaFloor) { out[i] = -1; continue; }

    let lum = luminance(pixels[p], pixels[p + 1], pixels[p + 2], weighting);
    if (invert) lum = 1 - lum;

    // Dark maps to the far end of the ramp, so a ramp is ordered light to
    // dark and the densest member does the heavy lifting in the shadows.
    const index = Math.round((1 - lum) * last);
    out[i] = index < 0 ? 0 : index > last ? last : index;
  }

  return out;
}

/**
 * A histogram of a mapped field — how many cells landed on each ramp member,
 * with the empties counted separately.
 *
 * Cheap, and it answers the question that is otherwise guesswork: a ramp whose
 * members never get used is a ramp with the wrong number of steps for this
 * image, and a field that is all one index is a source with no contrast in it.
 */
export function rampUsage(indices, steps) {
  const counts = new Array(Math.max(1, steps)).fill(0);
  let empty = 0;
  for (let i = 0; i < indices.length; i++) {
    const v = indices[i];
    if (v < 0) empty++;
    else if (v < counts.length) counts[v]++;
  }
  return { counts, empty, used: counts.filter(n => n > 0).length };
}
