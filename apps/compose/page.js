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
 * sheet's.
 */

/** The canvas a page needs, in page pixels: the sheet, and its bleed on every side. */
export function pageSize(page) {
  const bleed = Math.max(0, Math.round(page.bleed || 0));
  return { width: page.width + bleed * 2, height: page.height + bleed * 2, bleed };
}

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
 * The map from an object's own pixels to page pixels, as a canvas
 * `transform()` takes it: `[a, b, c, d, e, f]`. Move the object's centre to
 * its origin, scale, turn, and move it out to where the transform puts it.
 *
 * @param {{x, y, scale, rot}} transform
 * @param {{width, height}} size   the object's own size
 * @param {object} page            the page's values
 */
export function placementMatrix(transform, size, page) {
  const { width, height } = pageSize(page);
  const turn = ((transform.rot || 0) * Math.PI) / 180;
  const cos = Math.cos(turn) * transform.scale;
  const sin = Math.sin(turn) * transform.scale;
  const ox = -size.width / 2;
  const oy = -size.height / 2;
  return [
    cos, sin, -sin, cos,
    width / 2 + transform.x + cos * ox - sin * oy,
    height / 2 + transform.y + sin * ox + cos * oy,
  ];
}

/** Where a point of the object lands on the page. */
export function onPage(matrix, [x, y]) {
  const [a, b, c, d, e, f] = matrix;
  return [a * x + c * y + e, b * x + d * y + f];
}

/** Where a point of the page falls in the object's own pixels: `onPage`, undone. */
export function offPage([a, b, c, d, e, f], [x, y]) {
  const det = a * d - b * c;
  if (!det) return [NaN, NaN];
  const u = x - e, v = y - f;
  return [(d * u - c * v) / det, (a * v - b * u) / det];
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
 * An object's own size on a page: its ink over the whole loop, the `bounds`
 * a handle gives (core/rebuild.js) — all of a still or a dither, and the part
 * of a recording's canvas its marks ever reach. A gamepad loop's canvas is
 * the screen it was drawn on, mostly empty, and its render is cropped to the
 * ink; so is it here, so that it is centred and fitted by what can be seen.
 *
 * @param {object} handle   from core/rebuild.js
 * @returns {{width, height}}
 */
export function inkSize(handle) {
  const b = handle.bounds;
  return b && b.w > 0 && b.h > 0 ? { width: b.w, height: b.h } : { width: handle.width, height: handle.height };
}

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

  for (const { image, size, transform, part } of layers) {
    if (!image) continue;
    ctx.save();
    ctx.transform(...placementMatrix(transform, size, page));
    if (part) ctx.drawImage(image, 0, 0, part.w, part.h, part.at.x, part.at.y, part.at.w, part.at.h);
    else ctx.drawImage(image, 0, 0, size.width, size.height);
    ctx.restore();
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
