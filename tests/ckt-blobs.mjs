/**
 * tests/ckt-blobs.mjs — run with: node tests/ckt-blobs.mjs
 *
 * Stage one's second half: ink becomes dots. v2 did it with opencv — grey,
 * Otsu, invert, contours, the centroid of each — and apps/ckt/blobs.js does it
 * with a flood fill. These checks hold it to what opencv actually returned,
 * including the parts that decide which dots exist at all: the rounding in
 * the grey, 8-connectivity, the zero-area blobs v2 silently dropped, and the
 * order the contours came back in.
 *
 * Every step is arithmetic, so all of it runs without a canvas.
 */

const B = await import('../apps/ckt/blobs.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(56), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

/** An RGBA buffer, white, with black rects painted in and white rects over. */
function canvas(w, h, ink, white = []) {
  const px = new Uint8ClampedArray(w * h * 4).fill(255);
  const paint = ([rx, ry, rw, rh], v) => {
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        const p = (y * w + x) * 4;
        px[p] = px[p + 1] = px[p + 2] = v;
      }
    }
  };
  for (const r of ink) paint(r, 0);
  for (const r of white) paint(r, 255);
  return px;
}

const dots = (px, w, h, opts) => B.dotsFromPixels(px, w, h, opts);

// -- grey --------------------------------------------------------------------

{
  // opencv's RGBA2GRAY is fixed-point and rounds: (r*4899 + g*9617 + b*1868
  // + 8192) >> 14. Pure green is 150 there; a truncated float says 149, and a
  // level is enough to move an Otsu split on a pale image.
  const px = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]);
  ok('grey as opencv computes it', [...B.grayscale(px, 3, 1)], [76, 150, 29]);
  ok('white stays white', B.grayscale(new Uint8ClampedArray([255, 255, 255, 255]), 1, 1)[0], 255);
}

{
  const opaque = new Uint8ClampedArray([10, 10, 10, 255]);
  const clear  = new Uint8ClampedArray([10, 10, 10, 0]);
  ok('alpha is ignored, as opencv ignores it',
     B.grayscale(opaque, 1, 1)[0], B.grayscale(clear, 1, 1)[0]);
}

// -- Otsu --------------------------------------------------------------------

{
  const gray = new Uint8Array(200);
  for (let i = 0; i < 100; i++) gray[i] = 20;
  for (let i = 100; i < 200; i++) gray[i] = 200;
  const t = B.otsuThreshold(gray);
  ok('Otsu splits two clusters between them', t >= 20 && t < 200, true);
}

ok('a flat image still yields a number',
   Number.isFinite(B.otsuThreshold(new Uint8Array(100).fill(128))), true);

// -- blobs -------------------------------------------------------------------

{
  // Three squares with exactly known centres. opencv returns contours last
  // found first, so the lower square comes back first — the shipped datasets
  // start at the bottom right for the same reason.
  const w = 40, h = 20;
  const { points } = dots(canvas(w, h, [[2, 2, 4, 4], [20, 2, 4, 4], [10, 12, 6, 6]]), w, h);
  ok('three squares are three dots', points.length, 3);
  ok('at their centres, last found first', points, [[12.5, 14.5], [21.5, 3.5], [3.5, 3.5]]);
}

{
  // Two squares touching only at a corner are ONE blob to findContours.
  const w = 12, h = 12;
  ok('corner-touching blobs are one, as in opencv',
     dots(canvas(w, h, [[2, 2, 3, 3], [5, 5, 3, 3]]), w, h).points.length, 1);
  ok('a real gap makes two',
     dots(canvas(w, h, [[2, 2, 3, 3], [6, 6, 3, 3]]), w, h).points.length, 2);
}

{
  // A blob one pixel thin has a contour of zero area: m00 is 0, the centroid
  // is NaN and v2's `if (cx && cy)` dropped it. The anti-aliased fringe of a
  // grid line is exactly this shape, so keeping them would add a dot per
  // fringe fragment.
  const w = 30, h = 30;
  const px = canvas(w, h, [[1, 1, 1, 1], [4, 20, 9, 1], [20, 4, 1, 9], [10, 10, 5, 5]]);
  ok('one-pixel-thin blobs are dropped, as v2 dropped them', dots(px, w, h).points.length, 1);
  ok('minArea drops more on request',
     dots(canvas(w, h, [[1, 1, 2, 2], [10, 10, 5, 5]]), w, h, { minArea: 5 }).points.length, 1);
}

{
  const w = 20, h = 20;
  ok('a blank image has no dots', dots(canvas(w, h, []), w, h).points.length, 0);
}

// -- the grid is what makes the dots -----------------------------------------

{
  // The whole of stage one in miniature. A solid 40x40 square is one blob and
  // one dot. Rule white lines through it, 2px wide every 6px, and it becomes a
  // lattice of 4px cells — which is how a letterform becomes hundreds of dots,
  // and why the spacing is the parameter that controls how many.
  const w = 60, h = 60;
  const solid = [[10, 10, 40, 40]];
  ok('an ungridded shape is one dot', dots(canvas(w, h, solid), w, h).points.length, 1);

  const lines = [];
  for (let k = 0; k * 6 < w; k++) {
    lines.push([k * 6, 0, 2, h]);           // columns
    lines.push([0, k * 6, w, 2]);           // rows
  }
  const gridded = dots(canvas(w, h, solid, lines), w, h);
  // Cells start at 2, 8, 14 … inside 10..49: the ones fully or partly inside.
  const along = [];
  for (let k = 0; k * 6 < w; k++) {
    const a = k * 6 + 2, b = k * 6 + 6;      // a cell spans [a, b)
    const lo = Math.max(a, 10), hi = Math.min(b, 50);
    if (hi - lo >= 2) along.push(k);          // at least two pixels thick
  }
  ok('gridded, it is a lattice of dots', gridded.points.length, along.length * along.length);
  ok('six pixels apart, straight across',
     Math.abs(gridded.points[0][0] - gridded.points[1][0]), 6);
}

// -- limits ------------------------------------------------------------------

{
  // Hundreds of separate 2x2 specks: the ceiling stops the list growing
  // without bound on a photograph thresholded badly.
  const w = 60, h = 60, specks = [];
  for (let y = 0; y < h - 1; y += 3) for (let x = 0; x < w - 1; x += 3) specks.push([x, y, 2, 2]);
  const out = dots(canvas(w, h, specks), w, h, { maxBlobs: 100 });
  ok('maxBlobs caps the list', out.points.length, 100);
  ok('and says it did', out.truncated, true);
}

{
  // One enormous blob — a quarter of a million pixels — completes rather than
  // overflowing a stack.
  const w = 500, h = 500;
  const px = canvas(w, h, [[0, 0, w, h]], [[0, 0, 1, 1]]);
  ok('a quarter-million-pixel blob does not overflow', dots(px, w, h).points.length, 1);
}

{
  const w = 40, h = 40;
  const px = canvas(w, h, [[5, 5, 4, 4], [25, 5, 4, 4], [15, 25, 4, 4]]);
  const a = dots(px, w, h), b = dots(px, w, h);
  ok('it reports the threshold it chose', Number.isFinite(a.threshold), true);
  ok('the same pixels give the same dots', a.points, b.points);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
