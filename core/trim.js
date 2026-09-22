/**
 * trim.js — where the ink actually is.
 *
 * `contentBounds()` in core/stage/bounds.js answers a related question without
 * reading a pixel: the rect a clip's marks *could* land in. It has to be
 * generous to be safe — it bounds each sprite by half its diagonal, the box
 * that sprite occupies however it is turned — so a brush with transparent
 * padding leaves real slack, and a still drawn with one soft mark keeps a
 * visible empty border.
 *
 * This is the tight answer, and the two compose: the arithmetic bound says
 * where to look, the scan says what is there. Scanning inside the marks' rect
 * rather than the whole canvas is what keeps it cheap — on a 1920x945 canvas
 * with the drawing in one corner, it is most of the work not done.
 *
 * Nothing here decides anything. It returns a rect; `frame.js` decides what a
 * rect means.
 */

/** Nothing found. A zero rect rather than null, so callers can add them up. */
const EMPTY = { x: 0, y: 0, w: 0, h: 0 };

export const isEmpty = rect => !rect || rect.w <= 0 || rect.h <= 0;

/**
 * The rect of pixels at or above an alpha threshold.
 *
 * Reads one scanline at a time out of the supplied RGBA buffer rather than
 * calling back into a canvas, because getImageData is the expensive part and a
 * caller that already has the pixels should not pay it twice.
 *
 * @param {Uint8ClampedArray} pixels  RGBA, w*h*4
 * @param {number} w
 * @param {number} h
 * @param {object} [opts]
 * @param {number} [opts.threshold=1]   alpha at or above this counts as ink
 * @param {{x,y,w,h}} [opts.region]     only look here; clamped to the buffer
 * @returns {{x,y,w,h}}  in the buffer's own coordinates
 */
export function alphaBounds(pixels, w, h, { threshold = 1, region } = {}) {
  const x0 = Math.max(0, Math.floor(region ? region.x : 0));
  const y0 = Math.max(0, Math.floor(region ? region.y : 0));
  const x1 = Math.min(w, Math.ceil(region ? region.x + region.w : w));
  const y1 = Math.min(h, Math.ceil(region ? region.y + region.h : h));

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let y = y0; y < y1; y++) {
    const row = y * w;
    for (let x = x0; x < x1; x++) {
      if (pixels[(row + x) * 4 + 3] < threshold) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (!Number.isFinite(minX)) return { ...EMPTY };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * The rect of pixels that differ from a ground colour.
 *
 * For a surface that has already been composited onto something opaque, where
 * alpha is 255 everywhere and says nothing. The gamepad's saved still is that
 * — ink flattened onto white — so trimming it after the fact needs this, while
 * trimming the ink layer before the fact needs `alphaBounds`. Prefer the
 * second where the choice exists: a drawing that legitimately contains the
 * ground colour is invisible to this one.
 *
 * @param {Uint8ClampedArray} pixels
 * @param {number} w
 * @param {number} h
 * @param {object} opts
 * @param {[number,number,number]} opts.ground  the colour to treat as empty
 * @param {number} [opts.tolerance=6]  per channel, to survive resampling
 * @param {{x,y,w,h}} [opts.region]
 */
export function groundBounds(pixels, w, h, { ground, tolerance = 6, region } = {}) {
  const [gr, gg, gb] = ground || [255, 255, 255];
  const x0 = Math.max(0, Math.floor(region ? region.x : 0));
  const y0 = Math.max(0, Math.floor(region ? region.y : 0));
  const x1 = Math.min(w, Math.ceil(region ? region.x + region.w : w));
  const y1 = Math.min(h, Math.ceil(region ? region.y + region.h : h));

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let y = y0; y < y1; y++) {
    const row = y * w;
    for (let x = x0; x < x1; x++) {
      const p = (row + x) * 4;
      if (pixels[p + 3] === 0) continue;                 // transparent is empty too
      if (Math.abs(pixels[p]     - gr) <= tolerance &&
          Math.abs(pixels[p + 1] - gg) <= tolerance &&
          Math.abs(pixels[p + 2] - gb) <= tolerance) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (!Number.isFinite(minX)) return { ...EMPTY };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * The rect of cells that draw something, in a mapped grid field.
 *
 * Grid's answer, and it reads no pixels at all: `mapPixels()` already marks an
 * empty cell as -1, so the trim is arithmetic over the index array it was
 * going to build anyway. Returned in CELLS — multiply by the cell size for
 * pixels — because the caller knows the cell size and this does not.
 *
 * @param {Int16Array} indices
 * @param {number} cols
 * @param {number} rows
 * @returns {{x,y,w,h}} in cells
 */
export function indexBounds(indices, cols, rows) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (let row = 0; row < rows; row++) {
    const base = row * cols;
    for (let col = 0; col < cols; col++) {
      if (indices[base + col] < 0) continue;
      if (col < minX) minX = col;
      if (col > maxX) maxX = col;
      if (row < minY) minY = row;
      if (row > maxY) maxY = row;
    }
  }

  if (!Number.isFinite(minX)) return { ...EMPTY };
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * The rect containing both.
 *
 * A loop is trimmed to the union over every frame, never frame by frame. A
 * per-frame trim would change the canvas size from one frame to the next,
 * which is not a thing a sequence can be — and in grid it would move the cell
 * grid under the drawing, so the dither would crawl.
 */
export function union(a, b) {
  if (isEmpty(a)) return isEmpty(b) ? { ...EMPTY } : { ...b };
  if (isEmpty(b)) return { ...a };

  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const right = Math.max(a.x + a.w, b.x + b.w);
  const bottom = Math.max(a.y + a.h, b.y + b.h);
  return { x, y, w: right - x, h: bottom - y };
}

/** Grow a rect on every side, clamped to nothing smaller than a pixel. */
export function grow(rect, by) {
  if (isEmpty(rect)) return { ...EMPTY };
  return {
    x: rect.x - by,
    y: rect.y - by,
    w: Math.max(1, rect.w + by * 2),
    h: Math.max(1, rect.h + by * 2),
  };
}
