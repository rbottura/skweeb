/**
 * draw.js — a rigged drawing, drawn: every stamp where its bones have put
 * it, in the order the gamepad drew them, so they overlap as they did.
 *
 * A stamp is drawn as the gamepad's replay draws a mark (core/stage/player.js):
 * moved to its place, turned, scaled — mirrored for a mirror pattern's copy —
 * and its sprite centred there. At rest that is the drawing as it was saved.
 * The stage is the picture with room round it, for limbs that swing out of
 * the box the drawing was cropped to.
 */

/**
 * The stage round a picture, in its pixels: the picture — and `also`, a
 * path a crawl goes round — with a margin a quarter of its longer side on
 * every side.
 *
 * @param {object} drawing
 * @param {?{x, y, w, h}} [also]
 * @returns {{x: number, y: number, width: number, height: number}}
 */
export function stageOf(drawing, also = null) {
  let x0 = 0, y0 = 0, x1 = drawing.width, y1 = drawing.height;
  if (also) { x0 = Math.min(x0, also.x); y0 = Math.min(y0, also.y); x1 = Math.max(x1, also.x + also.w); y1 = Math.max(y1, also.y + also.h); }
  const pad = Math.round(0.25 * Math.max(x1 - x0, y1 - y0));
  return { x: Math.floor(x0) - pad, y: Math.floor(y0) - pad, width: Math.ceil(x1 - x0) + 2 * pad, height: Math.ceil(y1 - y0) + 2 * pad };
}

/**
 * The room a pose's stamps could reach, in the picture's pixels: each
 * bounded by half its sprite's diagonal, as core/stage/bounds.js bounds a
 * mark, whichever way it is turned — or null with nothing to draw.
 *
 * @returns {?{x: number, y: number, w: number, h: number}}
 */
export function reachOf(drawing, places, images) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  drawing.stamps.forEach((stamp, i) => {
    const image = images.get(stamp.key);
    if (!image) return;
    const r = 0.5 * Math.hypot(image.width, image.height) * Math.abs(stamp.scale), p = places[i];
    x0 = Math.min(x0, p.x - r); y0 = Math.min(y0, p.y - r);
    x1 = Math.max(x1, p.x + r); y1 = Math.max(y1, p.y + r);
  });
  if (!Number.isFinite(x0)) return null;
  const x = Math.floor(x0), y = Math.floor(y0);
  return { x, y, w: Math.max(1, Math.ceil(x1) - x), h: Math.max(1, Math.ceil(y1) - y) };
}

/**
 * @param {CanvasRenderingContext2D} ctx   a canvas the stage's size times `view`
 * @param {object} drawing                 drawing.js `drawingOf`
 * @param {Array<{x, y, rotation}>} places each stamp's place, skin.js `placeOf`
 * @param {Map<string, CanvasImageSource>} images   by drawing.js `spriteKey`
 * @param {number} view                    canvas pixels per picture pixel
 * @param {{x, y, width, height}} stage    stageOf's
 */
export function drawRig(ctx, drawing, places, images, view, stage) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (drawing.ground) {
    ctx.fillStyle = drawing.ground;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }
  ctx.imageSmoothingEnabled = true;
  drawing.stamps.forEach((stamp, i) => {
    const image = images.get(stamp.key);
    if (!image) return;
    const p = places[i];
    ctx.setTransform(view, 0, 0, view, -stage.x * view, -stage.y * view);
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.scale(stamp.scale * stamp.flipX, stamp.scale);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
