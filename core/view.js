/**
 * view.js — how large a preview draws: at the size the viewer shows it.
 *
 * Resolution is an export concern, never a live one (docs/roadmap.md). A
 * preview is drawn in as many canvas pixels as its viewer holds in device
 * pixels, and never more than an export would make, so a big page previews
 * at the cost of the screen and a small one is not blown up. compose and
 * particles draw their pictures this way; ckt's own preview does the same.
 *
 * Seen closer or farther (S14a, core/viewzoom.js): zoomed, as many canvas
 * pixels as the zoom shows, and the canvas sized and placed for it; at Fit,
 * as before. A preview drawn in its own pixels whatever the viewer holds —
 * grid's, filter's, ckt's dots — is laid by the zoom too (`viewAsIs`), CSS
 * alone sizing it.
 */

import { lay } from './viewzoom.js';

/**
 * Canvas pixels per picture pixel: as many as the viewer holds in device
 * pixels, never more than an export makes — in steps of a twentieth, so a
 * resize does not churn the canvas.
 *
 * @param {HTMLCanvasElement} canvas   the preview, in its viewer
 * @param {{width, height}} size       the picture, in its own pixels
 * @param {number} scale               the picture's own scale: the most it is ever drawn at
 */
export function viewFactor(canvas, size, scale) {
  const css = fitOf(canvas, size);
  if (!css) return Math.min(1, scale);
  const dpr = window.devicePixelRatio || 1;
  const zoomed = lay(canvas, size, scale, Math.min(css, scale), dpr);
  return zoomed ?? Math.min(scale, Math.ceil(css * dpr * 20) / 20);
}

/**
 * A preview drawn in its own pixels — `scale` of them a picture pixel — whatever its viewer holds: laid by the
 * viewer's zoom all the same, which sizes it by CSS alone. At Fit, CSS fits it, as it always did.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {{width, height}} size   the picture, in its own pixels: the canvas's, its scale taken out
 * @param {number} [scale]
 */
export function viewAsIs(canvas, size, scale = 1) {
  const css = fitOf(canvas, size);
  if (css) lay(canvas, size, scale, Math.min(css, scale), window.devicePixelRatio || 1);
}

/** CSS pixels a picture pixel that fit the canvas's viewer, its padding out — 0 when it has no room, or no page. */
function fitOf(canvas, size) {
  const box = canvas.parentElement;
  if (!box || typeof getComputedStyle === 'undefined' || !(size.width > 0) || !(size.height > 0)) return 0;
  const cs = getComputedStyle(box);
  const w = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const h = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  return w > 0 && h > 0 ? Math.min(w / size.width, h / size.height) : 0;
}
