/**
 * page.js — a page, drawn: its ground, then each placement at its transform.
 *
 * The one drawing path. The preview calls it at the size the viewer shows,
 * an export will call it at the page's `scale` — the same page in more
 * pixels — and nothing else in compose puts a pixel on a page. It reads no
 * clock and no DOM: the frames are fetched before it is called, so it stays a
 * function of its arguments, which is what lets `render()` stay pure
 * (docs/roadmap.md).
 *
 * ── Where a placement sits ──────────────────────────────────────────────────
 *
 * A transform is in page pixels, before `scale`. `x` and `y` put the object's
 * centre that far from the page's centre, `scale` multiplies the object's own
 * size, and `rot` turns it about its centre, in degrees, clockwise. Centre and
 * not corner, so that scaling or turning an object leaves it where it is, and
 * what was centred on a page stays centred when the page changes size. The
 * bleed grows the canvas round the sheet and moves nothing: the centre is the
 * sheet's. That math is core's since the live stack needed it in every window
 * (core/place.js); it is handed on from here, for compose's own.
 */

import { pageSize, placementMatrix, onPage, offPage } from '../../core/place.js';
import { compositeOf } from '../../core/blend.js';
export { pageSize, placementMatrix, onPage, offPage };

/**
 * The scale that places an object whole: its own size, or less when it would
 * not fit on the sheet. Floored to the hundredth the scale row keeps, so the
 * value it snaps to still fits.
 *
 * @param {{width, height}} size   the object's own size
 * @param {object} page            the page's values
 */
export function fitScale(size, page) {
  const k = Math.min(1, page.width / size.width, page.height / size.height);
  return Math.max(0.01, Math.floor(k * 100) / 100);
}

/**
 * Which layer is under a point of the page: the topmost whose box holds it,
 * turned and scaled as it is placed, or -1. Its box and not its ink — a
 * placement is picked up by its frame, as a sheet of glass would be.
 *
 * @param {[number, number]} point              in page pixels
 * @param {Array<{size, transform}>} layers     bottom first
 * @param {object} page                         the page's values
 */
export function hitTest(point, layers, page) {
  for (let i = layers.length - 1; i >= 0; i--) {
    const { size, transform } = layers[i];
    const [x, y] = offPage(placementMatrix(transform, size, page), point);
    if (x >= 0 && y >= 0 && x <= size.width && y <= size.height) return i;
  }
  return -1;
}

/**
 * An object's own size on a page: its ink over the whole loop (core/rebuild.js
 * `inkSize`) — so that it is centred and fitted by what can be seen. Core's
 * since the vault app shows by it too (S9h).
 */
export { inkSize } from '../../core/rebuild.js';

/**
 * Draw a page.
 *
 * A layer is a placement with its frame already in hand: `image` is the
 * object at the tick being drawn, and `size` its ink (`inkSize`), which the
 * image fills — or, with a `part`, only that part of it is in hand (a
 * print's window, placements.js `windowLayers`), and fills only its place.
 *
 * @param {CanvasRenderingContext2D} ctx   a canvas the page's size times `scale`
 * @param {object} page                    the page's values
 * @param {Array<{image, size, transform}>} layers   bottom first
 * @param {number} scale                   canvas pixels per page pixel
 */
export function paintPage(ctx, page, layers, scale) {
  const { width, height } = pageSize(page);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (page.ground && page.ground !== 'none') {
    ctx.fillStyle = page.ground;
    ctx.fillRect(0, 0, width, height);
  }

  for (const { image, size, transform, part, opacity, blend } of layers) {
    if (!image) continue;
    ctx.save();
    ctx.transform(...placementMatrix(transform, size, page));
    // How it meets what is under it: one spec with the live stack's CSS (core/blend.js).
    ctx.globalAlpha = opacity ?? 1;
    ctx.globalCompositeOperation = compositeOf(blend);
    if (part) ctx.drawImage(image, 0, 0, part.w, part.h, part.at.x, part.at.y, part.at.w, part.at.h);
    else ctx.drawImage(image, 0, 0, size.width, size.height);
    ctx.restore();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
