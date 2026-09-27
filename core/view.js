/**
 * view.js — how large a preview draws: at the size the viewer shows it.
 *
 * Resolution is an export concern, never a live one (docs/roadmap.md). A
 * preview is drawn in as many canvas pixels as its viewer holds in device
 * pixels, and never more than an export would make, so a big page previews
 * at the cost of the screen and a small one is not blown up. compose and
 * particles draw their pictures this way; ckt's own preview does the same.
 */

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
  const box = canvas.parentElement;
  const cs = getComputedStyle(box);
  const w = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const h = box.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  if (!(w > 0) || !(h > 0)) return Math.min(1, scale);
  const dpr = window.devicePixelRatio || 1;
  const fit = Math.min((w * dpr) / size.width, (h * dpr) / size.height);
  return Math.min(scale, Math.ceil(fit * 20) / 20);
}
