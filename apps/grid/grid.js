/**
 * grid.js — the drawing half.
 *
 * map.js decides which ramp member each cell gets; this puts them on a
 * surface. Between them they are the whole app, and `renderGrid()` is what
 * `render()` in main.js calls — the same function for the live preview and for
 * a print-scale export, differing only in the width it is handed.
 *
 * ── On p5 ───────────────────────────────────────────────────────────────────
 *
 * There isn't any. Grid needs `drawImage` into a canvas and nothing else: the
 * original used p5 for createCanvas, image(), resize(), loadPixels() and
 * map(), every one of which is Canvas 2D or Math. Pulling p5 in to issue
 * drawImage calls would be a dependency bought with nothing.
 *
 * It also buys something real to leave out. `render()` is required to stay
 * pure so that sandboxing a standalone `.skw` is later a worker rather than a
 * redesign (docs/roadmap.md), and a worker can hold an OffscreenCanvas but not
 * a p5 instance, which wants a live DOM element. Rule 8 in CLAUDE.md asks for
 * instance-mode p5 and one version of it; the rule it is protecting — no
 * globals across files, no second p5 — is kept here by not having one at all.
 * Flagged rather than assumed: if grid should carry p5 anyway for consistency,
 * this is the file that changes.
 */

import { gridSize, mapPixels } from './map.js';

/**
 * A drawing surface. OffscreenCanvas where it exists, because that is what
 * makes an export in a worker possible later; a detached <canvas> otherwise.
 */
export function surface(w, h) {
  const width = Math.max(1, Math.round(w));
  const height = Math.max(1, Math.round(h));

  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Resample a source down to one pixel per cell, and read those pixels.
 *
 * This is the step that decides how much of the source survives: at 6px cells
 * on a 518px canvas an image becomes 86 columns, and everything finer than
 * that is gone before a tile is drawn. Smoothing is on and set to high so a
 * cell averages the area it covers rather than sampling one arbitrary pixel
 * out of it — nearest-neighbour here makes a dither that crawls with noise.
 *
 * @param {CanvasImageSource} source
 * @param {number} cols
 * @param {number} rows
 * @returns {Uint8ClampedArray} RGBA, cols*rows pixels
 */
export function samplePixels(source, cols, rows) {
  if (cols < 1 || rows < 1) return new Uint8ClampedArray(0);

  const canvas = surface(cols, rows);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, cols, rows);
  ctx.drawImage(source, 0, 0, cols, rows);
  return ctx.getImageData(0, 0, cols, rows).data;
}

/**
 * Paint a mapped field of indices onto a context.
 *
 * An index of -1 is an empty cell and draws nothing, so the ground shows
 * through. A ramp member the caller did not supply is also skipped rather than
 * throwing: a manifest can name more steps than are on disk, and a hole in a
 * ramp should cost one cell, not the render.
 */
export function paintField(ctx, { indices, cols, rows, cell, tiles, offsetX = 0, offsetY = 0 }) {
  let drawn = 0;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const index = indices[row * cols + col];
      if (index < 0) continue;

      const tile = tiles[index];
      if (!tile) continue;

      ctx.drawImage(tile, offsetX + col * cell, offsetY + row * cell, cell, cell);
      drawn++;
    }
  }

  return drawn;
}

/**
 * The whole render, from a recipe and the assets it names.
 *
 * Deliberately not async and deliberately not a loader: everything it needs
 * arrives already decoded. That is what keeps it usable from an exporter, a
 * worker, or a live preview without three different code paths.
 *
 * @param {object} args
 * @param {object} args.recipe          params.values
 * @param {CanvasImageSource} args.source  the decoded source image
 * @param {CanvasImageSource[]} args.tiles the ramp, light to dark
 * @param {number} [args.width]         overrides recipe.width, for export scale
 * @returns {{canvas: HTMLCanvasElement|OffscreenCanvas, cols, rows, cell, indices, drawn}}
 */
export function renderGrid({ recipe, source, tiles, width }) {
  const targetWidth = Math.max(1, Math.round(width || recipe.width));

  // The page is the shape of what it is dithering. A source with no
  // dimensions would divide by zero, so it falls back to square.
  const srcW = source && (source.width || source.naturalWidth) || 1;
  const srcH = source && (source.height || source.naturalHeight) || 1;
  const targetHeight = Math.max(1, Math.round(targetWidth * (srcH / srcW)));

  // Cell size scales with the render, or a print export would be the same
  // grid drawn with tiny tiles instead of the same picture larger.
  const scale = targetWidth / Math.max(1, recipe.width);
  const cell = Math.max(1, Math.round(recipe.cell * scale));

  const grid = gridSize({ width: targetWidth, height: targetHeight, cell });

  const canvas = surface(targetWidth, targetHeight);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (recipe.background) {
    ctx.fillStyle = recipe.background;
    ctx.fillRect(0, 0, targetWidth, targetHeight);
  }

  if (!grid.cols || !grid.rows || !source) {
    return { canvas, ...grid, indices: new Int16Array(0), drawn: 0 };
  }

  const pixels = samplePixels(source, grid.cols, grid.rows);
  const indices = mapPixels(pixels, {
    steps: tiles.length,
    invert: recipe.invert,
    alphaFloor: recipe.alphaFloor,
    weighting: recipe.weighting,
  });

  // Whole cells only, so the leftover is split either side and the grid sits
  // centred rather than pinned to the top left with a gap at the end.
  const drawn = paintField(ctx, {
    indices,
    cols: grid.cols,
    rows: grid.rows,
    cell: grid.cell,
    tiles,
    offsetX: Math.floor(grid.marginX / 2),
    offsetY: Math.floor(grid.marginY / 2),
  });

  return { canvas, ...grid, indices, drawn };
}
