/**
 * blobs.js — a gridded raster becomes a list of dots.
 *
 * The second half of ckt's stage one, and v2's `p5_opencv.js` without the
 * eight megabytes of `opencv.js`. v2 read its own canvas and ran:
 *
 *     cv.cvtColor(RGBA2GRAY)                  grayscale()
 *     cv.threshold(THRESH_BINARY | OTSU)      otsuThreshold()
 *     cv.bitwise_not                          ink is dark
 *     cv.findContours(RETR_LIST)              blobCentroids()
 *     cv.moments → m10/m00, m01/m00           the centroid of each
 *
 * ── Where the dots come from ────────────────────────────────────────────────
 *
 * Not from this file. A solid letterform is one blob and gives one dot. What
 * cuts it into hundreds is the **white grid** raster.js draws over the ink
 * first: each cell of the lattice that still holds ink is its own blob, so the
 * grid's spacing is the dot spacing and this file only has to find the cells.
 * That is why the nine shipped datasets sit on a lattice — `garam`'s nearest
 * neighbours are eleven pixels apart, straight across and straight down.
 *
 * ── Where this differs from opencv, and where it does not ───────────────────
 *
 * Connected components instead of contours. v2 never used the contours
 * themselves, only their centroids, and for a lattice cell the pixel average
 * and the polygon moment are the same point.
 *
 * Kept on purpose, because they change which dots exist:
 *   - opencv's grey is fixed-point and rounds; truncating a float differs by
 *     one level and moves the Otsu split.
 *   - foreground is 8-connected, as `findContours` treats it: two cells
 *     touching at a corner are one blob.
 *   - a blob one pixel thin has a contour of zero area, so `m00` is 0, the
 *     centroid is NaN, and v2's `if (cx && cy)` dropped it. The anti-aliased
 *     fringe of a grid line is exactly that kind of blob.
 *   - the order: opencv hands contours back last-found first, which is why
 *     the shipped datasets start at the bottom right. Order is draw order, so
 *     it decides which sprite lands on top.
 *
 * Not kept: RETR_LIST also returns hole contours, so an ungridded "o" gave v2
 * two dots. With the grid on, a cell has no holes and the case does not arise.
 *
 * Pure and synchronous: testable without a browser, usable from a worker.
 */

/** RGBA → one grey byte per pixel, with opencv's fixed-point RGBA2GRAY. */
export function grayscale(pixels, w, h) {
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) {
    const p = i * 4;
    // Alpha is ignored, as opencv ignores it. Anything with a transparent
    // ground is composited onto white before it gets here — raster.js does.
    out[i] = (pixels[p] * 4899 + pixels[p + 1] * 9617 + pixels[p + 2] * 1868 + 8192) >> 14;
  }
  return out;
}

/**
 * Otsu's threshold: the split that maximises the variance between the two
 * groups. v2 used it rather than a constant so the same pipeline works on
 * black type, a pale image and a photograph without anyone choosing a number.
 *
 * @returns {number} 0..255 — pixels at or below it are ink
 */
export function otsuThreshold(gray) {
  const hist = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) hist[gray[i]]++;

  const total = gray.length;
  let sum = 0;
  for (let t = 0; t < 256; t++) sum += t * hist[t];

  let sumB = 0, wB = 0, best = 0, bestVar = -1;

  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;

    sumB += t * hist[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);

    if (between > bestVar) { bestVar = between; best = t; }
  }

  return best;
}

/**
 * The centroid of every connected blob of ink.
 *
 * Iterative rather than recursive: a large dark region is hundreds of
 * thousands of pixels, and a recursive fill overflows the stack on exactly
 * the input someone tries first.
 *
 * @param {Uint8Array} gray
 * @param {number} w
 * @param {number} h
 * @param {object} [opts]
 * @param {number} [opts.threshold]     default: Otsu's
 * @param {number} [opts.minArea=1]     blobs with fewer pixels are noise
 * @param {number} [opts.maxBlobs=60000] a ceiling, so a bad threshold on a
 *        photograph cannot lock the tab up
 * @returns {{points: number[][], threshold: number, truncated: boolean}}
 *        points in pixels, in opencv's order — last found first
 */
export function blobCentroids(gray, w, h, opts = {}) {
  const { minArea = 1, maxBlobs = 60000 } = opts;
  const threshold = opts.threshold == null ? otsuThreshold(gray) : opts.threshold;

  // 1 where there is ink. THRESH_BINARY sends everything above the split to
  // white and bitwise_not flips it, so ink is what sits at or below.
  const mask = new Uint8Array(w * h);
  for (let i = 0; i < gray.length; i++) mask[i] = gray[i] <= threshold ? 1 : 0;

  const points = [];
  const stack = new Int32Array(w * h);
  let truncated = false;

  for (let start = 0; start < mask.length; start++) {
    if (mask[start] !== 1) continue;
    if (points.length >= maxBlobs) { truncated = true; break; }

    let top = 0;
    stack[top++] = start;
    mask[start] = 2;                      // claimed

    let sumX = 0, sumY = 0, area = 0;
    let minX = w, maxX = -1, minY = h, maxY = -1;

    while (top > 0) {
      const at = stack[--top];
      const x = at % w;
      const y = (at / w) | 0;

      sumX += x;
      sumY += y;
      area++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          if (nx < 0 || nx >= w) continue;
          const n = ny * w + nx;
          if (mask[n] !== 1) continue;
          mask[n] = 2;
          stack[top++] = n;
        }
      }
    }

    if (area < minArea) continue;
    if (maxX === minX || maxY === minY) continue;   // zero-area contour: v2 dropped it
    points.push([sumX / area, sumY / area]);
  }

  points.reverse();
  return { points, threshold, truncated };
}

/**
 * The whole pass, from RGBA pixels to dots.
 *
 * @param {Uint8ClampedArray} pixels
 * @param {number} w
 * @param {number} h
 * @param {object} [opts]  as blobCentroids
 */
export function dotsFromPixels(pixels, w, h, opts = {}) {
  return blobCentroids(grayscale(pixels, w, h), w, h, opts);
}
