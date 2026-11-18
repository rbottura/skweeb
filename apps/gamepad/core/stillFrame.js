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
 *
 * ── At the screen's density ─────────────────────────────────────────────────
 *
 * The ink holds the screen's pixel density (sketch/surface.js): twice as
 * many pixels each way on a HiDPI screen as the units its marks are in. Its
 * bounds are read in its pixels and given back in its units, and the still is
 * its frame in those units — the marks' size, what the recipe says. Under p5
 * (until C6b, docs/gamepad.md) both read the ink as if it had no density: on
 * a HiDPI screen a save cropped the wrong part of it, at twice its size.
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
 * @param {import('../sketch/surface.js').Surface} ink
 * @returns {{x,y,w,h}}  in the ink's units
 */
export function inkBounds(ink) {
  const { canvas, width, height } = ink, d = ink.density || 1;
  const { data } = ink.ctx.getImageData(0, 0, canvas.width, canvas.height);
  const rect = alphaBounds(data, canvas.width, canvas.height);
  if (isEmpty(rect)) return { x: 0, y: 0, w: width, h: height };
  // Its pixels to its units, out to whole ones: no ink cut.
  const x = Math.floor(rect.x / d), y = Math.floor(rect.y / d);
  return { x, y, w: Math.min(width, Math.ceil((rect.x + rect.w) / d)) - x, h: Math.min(height, Math.ceil((rect.y + rect.h) / d)) - y };
}

/**
 * The frame a save should use, from the app's framing params.
 *
 * @param {import('../sketch/surface.js').Surface} ink
 * @param {{format: string, bleed: number, width: number, height: number}} values  the settings' (params.js) — core's format
 */
export function frameFor(ink, values) {
  return resolveFrame(
    { format: values.format, bleed: values.bleed, width: values.width, height: values.height, zoom: 1 },
    inkBounds(ink),
    { width: ink.width, height: ink.height });
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
 * The still itself: the framed region of the overlay, on its ground.
 *
 * Transparent by default since 2026-09-23 — a drawing is ink on nothing, and
 * ink on nothing is what the suite's other apps take in (a sprite in ckt, a
 * source in grid). `values.saveGround` 'white' puts white under it, as every
 * save did before. A canvas of its own, the frame's size in the ink's units.
 *
 * @param {import('../sketch/surface.js').Surface} ink
 * @returns {{canvas: HTMLCanvasElement, frame: object}}
 */
export function composite(ink, values) {
  const frame = frameFor(ink, values);
  _last = frame;

  const canvas = Object.assign(document.createElement('canvas'), { width: frame.width, height: frame.height });
  const ctx = canvas.getContext('2d');
  if (values.saveGround === 'white') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, frame.width, frame.height);
  }
  const d = ink.density || 1;
  ctx.drawImage(ink.canvas,
    frame.from.x * d, frame.from.y * d, frame.from.w * d, frame.from.h * d,
    frame.to.x, frame.to.y, frame.to.w, frame.to.h);

  return { canvas, frame };
}
