/**
 * dots.js — stage one, whole: a recipe becomes a dataset.
 *
 * raster.js draws the picture, blobs.js finds the cells the grid left, and
 * this runs the two over every entry the recipe asks for and gathers the
 * result in the shape the nine shipped datasets already have:
 *
 *     [entry][point][x, y]     in the pixels of the canvas they were found on
 *
 * which is the `dataset` type in docs/object-model.md, "made by ckt, eaten by
 * ckt". A dataset made here is the equal of the shipped ones: stage two reads
 * both the same way.
 *
 * ── What an entry is ────────────────────────────────────────────────────────
 *
 * v2 had three inputs, and each makes entries differently:
 *
 *   text    the whole text is one picture and one entry — a word, or several
 *           lines, cut as a single field. The "README" in v2's screenshots.
 *   glyphs  v2's dataset generator: every character from `from` up to, not
 *           including, `to`, one picture and one entry each. 65 to 123 is
 *           A–z, 58 glyphs, which is how many `garam` and `peace` have.
 *   image   one picture, one entry.
 *
 * v2 generated glyphs by redrawing its canvas every 300ms and letting opencv
 * read whatever was on it, which is why its generator had a progress bar. This
 * renders each one off screen, in order, and waits for nothing.
 */

import { raster }         from './raster.js';
import { dotsFromPixels } from './blobs.js';
import { surface }        from '../../core/surface.js';

/**
 * The strings a recipe cuts, in order. `null` for the image entry.
 *
 * @param {object} recipe  stage one's params.values
 * @returns {Array<?string>}
 */
export function entriesOf(recipe) {
  if (recipe.input === 'image') return [null];
  if (recipe.input === 'glyphs') {
    const out = [];
    for (let c = recipe.from; c < recipe.to; c++) out.push(String.fromCodePoint(c));
    return out;
  }
  return [recipe.text];
}

/**
 * One entry, cut: the picture and the dots found in it.
 *
 * @returns {{canvas, points: number[][], threshold: number, truncated: boolean}}
 */
export function cut(recipe, deps, entry) {
  const canvas = raster(recipe, deps, entry);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const found = dotsFromPixels(data, canvas.width, canvas.height, { minArea: recipe.minBlob });
  if (found.truncated) console.warn('[ckt] blob ceiling hit — raise "min blob" or the spacing');
  return { canvas, ...found };
}

/**
 * Every entry, cut. Yields to the page between entries, so 58 glyphs at
 * 1920x1080 keep the tab responsive and the readout can count.
 *
 * @param {object} recipe
 * @param {object} deps  { family, image }, as raster() takes them
 * @param {(done:number, total:number)=>void} [onProgress]
 * @returns {Promise<{data: number[][][], entries: Array<?string>, points: number}>}
 */
export async function makeDataset(recipe, deps, onProgress = () => {}) {
  const entries = entriesOf(recipe);
  const data = [];
  let points = 0;

  for (let i = 0; i < entries.length; i++) {
    const { points: found } = cut(recipe, deps, entries[i]);
    // Two decimals: a centroid finer than a hundredth of a pixel is noise, and
    // it halves the file.
    data.push(found.map(([x, y]) => [Math.round(x * 100) / 100, Math.round(y * 100) / 100]));
    points += found.length;
    onProgress(i + 1, entries.length);
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return { data, entries, points };
}

/**
 * A picture of a dataset entry: its dots on white, for a thumbnail and for
 * the stage-one preview. Every dot the same small disc — this shows where
 * they are, not what stage two will draw on them.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number[][]} points
 * @param {object} [style]  { color, radius }
 */
export function plotDots(ctx, points, { color = '#e66465', radius = 2 } = {}) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const [x, y] of points) {
    ctx.moveTo(x + radius, y);
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  }
  ctx.fill();
  ctx.restore();
}

/**
 * A dot-set's first glyph, fitted to a square: the thumbnail for the vault and
 * for the session list. The whole cut canvas shrunk to a thumbnail is a speck
 * in a field of white; the dots fitted to it are the set.
 *
 * @param {number[][]} points
 * @param {number} [size=256]
 */
export function plotThumb(points, size = 256) {
  const canvas = surface(size, size);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fffdf6';
  ctx.fillRect(0, 0, size, size);
  if (!points || !points.length) return canvas;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of points) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  const pad = size * 0.1;
  const k = Math.min((size - 2 * pad) / Math.max(1, maxX - minX), (size - 2 * pad) / Math.max(1, maxY - minY));
  const ox = (size - (maxX - minX) * k) / 2 - minX * k;
  const oy = (size - (maxY - minY) * k) / 2 - minY * k;
  plotDots(ctx, points.map(([x, y]) => [ox + x * k, oy + y * k]),
           { color: '#111111', radius: Math.max(1, size / 110) });
  return canvas;
}
