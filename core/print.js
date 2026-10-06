/**
 * print.js — a picture printed on a sheet at a dpi, past any canvas: drawn a
 * window at a time and written band by band into a PNG (core/png.js).
 *
 * A 120 × 176 cm sheet at 300 dpi is 14173 × 20787 px — past Chrome's canvas
 * cap and any GPU's side — so nothing ever holds the whole picture.
 *
 * `printTiles` knows nothing of apps: given a size and a way to draw any
 * window of it, it draws tile after tile, each at most `tile` a side, over
 * the paper, copies each into its band, and hands the band to the PNG.
 *
 * `printObject` prints any object an app replays — from the vault, or made
 * of what is on screen — fitted whole on the sheet, centred, the paper round
 * it. The app draws each window itself: opened at the print's scale through
 * core/rebuild.js, its handle's `window(i, { x, y, w, h })` hands back that
 * window of frame i — a canvas at least that big, its corner the window's —
 * so a print is drawn again at its size, never enlarged. A handle with no
 * `window` yet is asked for its whole frame once, as large as a canvas and a
 * GPU allow, and that is cut into the tiles: enlarged, and the result says by
 * how much.
 */

import { writePng } from './png.js';
import { surface } from './surface.js';
import { openFrames } from './rebuild.js';

/** A tile's side at most: what any GPU draws at once, antialiased, without strain. */
export const TILE = 2048;

/** The most a handle with no window is asked for whole: a GPU's side, and an area a page can hold. */
export const WHOLE = { side: 16384, area: 2 ** 27 };

/** How many tiles a print of that many pixels is drawn in. */
export const tilesOf = ([w, h], side = TILE) => Math.ceil(w / side) * Math.ceil(h / side);

/**
 * Draw a picture of `width` × `height` tile by tile into a PNG.
 *
 * @param {object} opts
 * @param {number} opts.width
 * @param {number} opts.height
 * @param {(ctx: CanvasRenderingContext2D, win: {x, y, w, h}) => (void|Promise<void>)} opts.draw
 *        paint the window `win` of the picture at ctx's corner; ctx is cleared and papered
 * @param {number} [opts.dpi]        written into the PNG
 * @param {?string} [opts.paper]     a colour under everything, or null to keep transparency
 * @param {number} [opts.tile]
 * @param {(done: number, of: number) => void} [opts.onTile]
 * @returns {Promise<Blob>}
 */
export async function printTiles({ width, height, draw, dpi = 0, paper = null, tile = TILE, onTile = () => {} }) {
  const side = Math.max(16, Math.floor(tile));
  const cols = Math.ceil(width / side), rows = Math.ceil(height / side);
  const ctx = surface(side, side).getContext('2d', { willReadFrequently: true });

  async function* bands() {
    for (let r = 0; r < rows; r++) {
      const y = r * side, h = Math.min(side, height - y);
      const band = new Uint8ClampedArray(width * h * 4);
      for (let c = 0; c < cols; c++) {
        const x = c * side, w = Math.min(side, width - x);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, side, side);
        if (paper) {
          ctx.fillStyle = paper;
          ctx.fillRect(0, 0, w, h);
        }
        await draw(ctx, { x, y, w, h });
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const px = ctx.getImageData(0, 0, w, h).data;
        for (let k = 0; k < h; k++) band.set(px.subarray(k * w * 4, (k + 1) * w * 4), (k * width + x) * 4);
        onTile(r * cols + c + 1, rows * cols);
        await new Promise(next => setTimeout(next, 0));      // the page gets to say how far
      }
      yield { rows: band, count: h };
    }
  }
  return writePng({ width, height, dpi, alpha: !paper, bands: bands() });
}

/**
 * Where a picture of `w` × `h` goes on a sheet: as large as it fits, centred.
 * @returns {{scale: number, x: number, y: number, w: number, h: number}}   in the sheet's pixels
 */
export function fitOn([sw, sh], w, h) {
  const scale = Math.min(sw / w, sh / h);
  const pw = Math.min(sw, Math.round(w * scale)), ph = Math.min(sh, Math.round(h * scale));
  return { scale, x: Math.floor((sw - pw) / 2), y: Math.floor((sh - ph) / 2), w: pw, h: ph };
}

/**
 * Print an object, fitted on a sheet.
 *
 * @param {object} object             a vault envelope, or one made of what is on screen
 * @param {object} opts
 * @param {number[]} opts.sheet       the sheet's pixels, [w, h]
 * @param {number} [opts.dpi]
 * @param {?string} [opts.paper]      the paper round and under the picture; null keeps transparency
 * @param {number} [opts.tick]        which frame of a loop
 * @param {string} [opts.url]         where its render is, for a picture
 * @param {number} [opts.tile]
 * @param {(done: number, of: number) => void} [opts.onTile]
 * @returns {Promise<{blob: Blob, width: number, height: number, picture: object, enlarged: number}>}
 *          `enlarged` 1 when every window was drawn at its size — and more where what it is drawn from
 *          is not: the handle's own `scale`, the scale it really draws at (core/rebuild.js), a filter's
 *          over a source that is only its picture
 */
export async function printObject(object, { sheet, dpi = 0, paper = '#ffffff', tick = 0, url, tile = TILE, onTile } = {}) {
  const [W, H] = sheet;
  const own = await sizeOf(object, url);
  const at = fitOn(sheet, own.w, own.h);
  let handle = await openFrames(object, { url, scale: at.scale });
  let whole = null, ratio = 1;
  if (typeof handle.window !== 'function') {
    const most = Math.min(at.scale, Math.sqrt(WHOLE.area / (own.w * own.h)), WHOLE.side / Math.max(own.w, own.h));
    if (most < at.scale) {
      if (handle.dispose) handle.dispose();
      handle = await openFrames(object, { url, scale: most });
    }
    whole = handle.frame(tick);
    ratio = (handle.scale || 1) / at.scale;               // its pixels per printed pixel
  }
  try {
    const blob = await printTiles({
      width: W, height: H, dpi, paper, tile, onTile,
      draw(ctx, win) {
        const x0 = Math.max(win.x, at.x), y0 = Math.max(win.y, at.y);
        const x1 = Math.min(win.x + win.w, at.x + at.w), y1 = Math.min(win.y + win.h, at.y + at.h);
        if (x1 <= x0 || y1 <= y0) return;                  // only paper here
        const part = { x: x0 - at.x, y: y0 - at.y, w: x1 - x0, h: y1 - y0 };
        if (whole) {
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(whole, part.x * ratio, part.y * ratio, part.w * ratio, part.h * ratio, x0 - win.x, y0 - win.y, part.w, part.h);
        } else {
          ctx.drawImage(handle.window(tick, part), 0, 0, part.w, part.h, x0 - win.x, y0 - win.y, part.w, part.h);
        }
      },
    });
    return { blob, width: W, height: H, picture: at, enlarged: whole ? 1 / ratio : Math.max(1, at.scale / (handle.scale || at.scale)) };
  } finally {
    if (handle.dispose) handle.dispose();
  }
}

/** An object's own size: its render's, as every handle reports it — opened only when the envelope does not say. */
async function sizeOf(object, url) {
  const r = object.render;
  if (r && r.w > 0 && r.h > 0) return { w: r.w, h: r.h };
  const handle = await openFrames(object, { url });
  const size = { w: handle.width, h: handle.height };
  if (handle.dispose) handle.dispose();
  return size;
}
