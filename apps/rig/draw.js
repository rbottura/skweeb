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
 * The stage round a picture, in its pixels: the picture and a margin a
 * quarter of its longer side on every side.
 *
 * @returns {{x: number, y: number, width: number, height: number}}
 */
export function stageOf(drawing) {
  const pad = Math.round(0.25 * Math.max(drawing.width, drawing.height));
  return { x: -pad, y: -pad, width: drawing.width + 2 * pad, height: drawing.height + 2 * pad };
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
