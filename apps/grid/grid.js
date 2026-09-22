/**
 * grid.js — the drawing half.
 *
 * map.js decides which ramp member each cell gets; this puts them on a
 * surface. Between them they are the whole app, and `renderGrid()` is what
 * `render()` in main.js calls — the same function for the live preview and for
 * a print-scale export, differing only in the scale it is handed.
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
 * This is the step that decides how much of the source survives: a 1772px-wide
 * source at 6px cells becomes 295 columns, and everything finer than that is
 * gone before a tile is drawn. Smoothing is on and set to high so a
 * cell averages the area it covers rather than sampling one arbitrary pixel
 * out of it — nearest-neighbour here makes a dither that crawls with noise.
 *
 * `from` and `to` are the frame: which part of the source to read, and where
 * it lands on the canvas — both in canvas pixels, scaled here into cell space.
 * Sampling straight into the cell buffer is what avoids building a full-size
 * canvas per frame just to throw it away; a 1920x945 intermediate is 7 MB of
 * churn a thousand times over, for a picture nothing ever looks at.
 *
 * Anything the source does not cover stays transparent, so it maps to an empty
 * cell and the ground shows through. That is the bleed, and it costs no code.
 *
 * @param {CanvasImageSource} source
 * @param {number} cols
 * @param {number} rows
 * @param {object} place
 * @param {{x,y,w,h}} place.from    the rect to read out of the source
 * @param {{x,y,w,h}} place.to      where it goes, in canvas pixels
 * @param {number} place.width      the canvas, so `to` can be scaled to cells
 * @param {number} place.height
 * @returns {Uint8ClampedArray} RGBA, cols*rows pixels
 */
export function samplePixels(source, cols, rows, place) {
  if (cols < 1 || rows < 1) return new Uint8ClampedArray(0);

  const canvas = surface(cols, rows);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.clearRect(0, 0, cols, rows);

  if (place) {
    const sx = cols / place.width;
    const sy = rows / place.height;
    ctx.drawImage(source,
      place.from.x, place.from.y, place.from.w, place.from.h,
      place.to.x * sx, place.to.y * sy, place.to.w * sx, place.to.h * sy);
  } else {
    ctx.drawImage(source, 0, 0, cols, rows);
  }

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
 * The grid is counted in the FRAME's pixels and drawn in the output's. That is
 * the whole of what `scale` means: how many cells there are depends on the
 * frame and `cell` alone, so turning scale up draws the same picture with
 * bigger tiles rather than a finer grid with small ones. Counting in output
 * space instead would make the cell count drift by one at some scales, as the
 * rounding of the canvas and of the cell disagree.
 *
 * The frame is where framing enters the drawing rather than wrapping it. A
 * bleed is extra cells, not a border painted afterwards, so it lands on the
 * grid instead of fighting it — and changing the frame changes the cell count,
 * which is to say it changes the artwork. That is the intended reading.
 *
 * @param {object} args
 * @param {object} args.recipe          params.values
 * @param {CanvasImageSource} args.source  the decoded source image
 * @param {CanvasImageSource[]} args.tiles the ramp, light to dark
 * @param {object} args.frame           from core/frame.js resolveFrame()
 * @param {number} [args.scale]         overrides recipe.scale, for export
 * @returns {{canvas, cols, rows, cell, indices, drawn, scale, frame}}
 */
export function renderGrid({ recipe, source, tiles, frame, scale }) {
  const zoom = Math.max(0.01, scale || recipe.scale || 1);

  // Counted in frame pixels, so the answer does not move with `scale`.
  const grid = gridSize({ width: frame.width, height: frame.height, cell: recipe.cell });

  const cellPx = Math.max(1, Math.round(recipe.cell * zoom));
  const outW = Math.max(1, Math.round(frame.width * zoom));
  const outH = Math.max(1, Math.round(frame.height * zoom));

  const canvas = surface(outW, outH);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  if (recipe.background) {
    ctx.fillStyle = recipe.background;
    ctx.fillRect(0, 0, outW, outH);
  }

  const out = {
    canvas, cols: grid.cols, rows: grid.rows, cell: cellPx, scale: zoom, frame,
  };

  if (!grid.cols || !grid.rows || !source || !tiles.length) {
    return { ...out, indices: new Int16Array(0), drawn: 0 };
  }

  const pixels = samplePixels(source, grid.cols, grid.rows, {
    from: frame.from,
    to: frame.to,
    width: frame.width,
    height: frame.height,
  });

  const indices = mapPixels(pixels, {
    steps: tiles.length,
    invert: recipe.invert,
    alphaFloor: recipe.alphaFloor,
    weighting: recipe.weighting,
  });

  // Whole cells only, so the leftover is split either side and the field sits
  // centred rather than pinned to the top left with a gap at the end.
  const drawn = paintField(ctx, {
    indices,
    cols: grid.cols,
    rows: grid.rows,
    cell: cellPx,
    tiles,
    offsetX: Math.round((outW - grid.cols * cellPx) / 2),
    offsetY: Math.round((outH - grid.rows * cellPx) / 2),
  });

  return { ...out, indices, drawn };
}
