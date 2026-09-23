/**
 * sheet.js — a set's render: its members laid out in order.
 *
 * A `set` has no picture of its own, so its render is a contact sheet, which
 * doubles as its thumbnail (docs/object-model.md, *Sets*). ckt lays out an
 * emitted family in a square; grid lays out a material in one row, light to
 * dark, on the ground it was ordered for — so the card reads as the ramp.
 */

/** Off screen where the browser can; the same few lines grid.js and ckt's surface.js keep. */
function surface(w, h) {
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h);
  return Object.assign(document.createElement('canvas'), { width: w, height: h });
}

/**
 * @param {CanvasImageSource[]} images  in the set's order
 * @param {object} [opts]
 * @param {number} [opts.cell=96]       one member's square
 * @param {number} [opts.cols]          default: as square as the count allows
 * @param {string} [opts.ground]        '#rrggbb' under everything; transparent otherwise
 * @returns {HTMLCanvasElement|OffscreenCanvas}
 */
export function contactSheet(images, { cell = 96, cols, ground } = {}) {
  const n = Math.max(1, images.length);
  const c = Math.max(1, Math.min(n, cols || Math.ceil(Math.sqrt(n))));
  const rows = Math.ceil(n / c);
  const sheet = surface(c * cell, rows * cell);
  const ctx = sheet.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  if (ground && ground !== 'none') {
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, sheet.width, sheet.height);
  }

  images.forEach((img, i) => {
    const k = Math.min((cell - 8) / img.width, (cell - 8) / img.height, 1);
    const w = img.width * k, h = img.height * k;
    ctx.drawImage(img, (i % c) * cell + (cell - w) / 2, Math.floor(i / c) * cell + (cell - h) / 2, w, h);
  });
  return sheet;
}
