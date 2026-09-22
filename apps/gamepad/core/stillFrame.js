/**
 * stillFrame.js — framing a saved still.
 *
 * Saving used to mean the whole canvas, which for this app meant saving mostly
 * nothing: a gamepad drawing is a few marks on a surface the size of your
 * window, so a 1920x945 still routinely held a drawing 996x822 across with
 * white all round it. Sequences never had that problem — `contentBounds()`
 * has always sized their buffer to the marks — so the still was the odd one
 * out rather than the rule.
 *
 * It lives here rather than in gamepadSketch.js because that file is one of
 * the four still over the 400-line cap (STATUS.md), and adding to it would be
 * making a known problem worse to fix a smaller one.
 *
 * ── Why the ink layer and not the saved image ───────────────────────────────
 *
 * The overlay still has alpha. The saved still does not — it is flattened onto
 * white first, and after that "empty" can only be guessed at by colour, which
 * gets a drawing containing white wrong. Trimming before the composite is the
 * only version of this that is exact, and it is why this runs where it does.
 */

import { alphaBounds, isEmpty } from '../../../core/trim.js';
import { resolveFrame }         from '../../../core/frame.js';

/**
 * Where the ink is on an overlay, scanned.
 *
 * `contentBounds()` would answer without reading a pixel, but it bounds each
 * sprite by half its diagonal — the box that sprite occupies however it is
 * turned — so a brush with transparent padding leaves a visible empty border.
 * One getImageData per save buys the tight answer, and a save is not a thing
 * that happens sixty times a second.
 *
 * A loaded reference image is drawn onto this same overlay, so it counts: the
 * crop follows what is on the canvas, whatever put it there.
 *
 * @param {object} overlay  a p5.Graphics
 * @returns {{x,y,w,h}}
 */
export function inkBounds(overlay) {
  const { width, height } = overlay;
  const { data } = overlay.drawingContext.getImageData(0, 0, width, height);
  const rect = alphaBounds(data, width, height);
  return isEmpty(rect) ? { x: 0, y: 0, w: width, h: height } : rect;
}

/**
 * The frame a save should use, from the app's framing params.
 *
 * @param {object} overlay
 * @param {{frameFormat:string, frameBleed:number}} params
 */
export function frameFor(overlay, params) {
  return resolveFrame(
    { format: params.frameFormat, bleed: params.frameBleed, zoom: 1 },
    inkBounds(overlay),
    { width: overlay.width, height: overlay.height });
}

/**
 * The frame the last save used.
 *
 * A cropped still is only reproducible if the crop is written down: the marks
 * are in canvas coordinates and the render is a window onto them, so without
 * this a replay would redraw the whole canvas and believe it matched. The
 * recipe picks it up from here — see vaultBridge.js.
 */
let _last = null;
export const lastFrame = () => _last;

/**
 * The still itself: the framed region of the overlay, on white.
 *
 * White underneath as it always was — a still with a transparent ground reads
 * as broken everywhere outside this app. The caller owns the graphics and
 * should remove() it.
 *
 * @returns {{graphics: object, frame: object}}
 */
export function composite(p5, overlay, params) {
  const frame = frameFor(overlay, params);
  _last = frame;

  const g = p5.createGraphics(frame.width, frame.height);
  g.background(255);
  g.drawingContext.drawImage(overlay.canvas,
    frame.from.x, frame.from.y, frame.from.w, frame.from.h,
    frame.to.x, frame.to.y, frame.to.w, frame.to.h);

  return { graphics: g, frame };
}
