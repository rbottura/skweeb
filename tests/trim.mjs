/**
 * tests/trim.mjs — run with: node tests/trim.mjs
 *
 * Covers core/trim.js: the ink inside a picture — by its alpha, off its
 * ground, out of a grid's indices — and the rectangles that hold it, joined
 * and grown. Pure, no canvas, no DOM. Split out of tests/frame.mjs on
 * 2026-11-03, when the frame's swap took that file past 400 lines.
 */

const Trim = await import('../core/trim.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(52), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

// -- trim --------------------------------------------------------------------

/** A w*h RGBA buffer with one opaque rect painted into it. */
const canvasWith = (w, h, rect, alpha = 255) => {
  const px = new Uint8ClampedArray(w * h * 4);
  for (let y = rect.y; y < rect.y + rect.h; y++) {
    for (let x = rect.x; x < rect.x + rect.w; x++) {
      const p = (y * w + x) * 4;
      px[p] = 20; px[p + 1] = 30; px[p + 2] = 40; px[p + 3] = alpha;
    }
  }
  return px;
};

{
  const px = canvasWith(40, 30, { x: 5, y: 6, w: 10, h: 8 });
  ok('alphaBounds finds the ink', Trim.alphaBounds(px, 40, 30),
     { x: 5, y: 6, w: 10, h: 8 });
}

ok('an empty canvas trims to nothing',
   Trim.alphaBounds(new Uint8ClampedArray(40 * 30 * 4), 40, 30), { x: 0, y: 0, w: 0, h: 0 });

{
  // A single pixel is a rect of one, not of zero — an off-by-one here would
  // silently drop the last row and column of every crop.
  const px = canvasWith(10, 10, { x: 3, y: 4, w: 1, h: 1 });
  ok('one pixel is 1x1', Trim.alphaBounds(px, 10, 10), { x: 3, y: 4, w: 1, h: 1 });
}

{
  const px = canvasWith(10, 10, { x: 0, y: 0, w: 10, h: 10 });
  ok('a full canvas trims to itself', Trim.alphaBounds(px, 10, 10),
     { x: 0, y: 0, w: 10, h: 10 });
}

{
  const px = canvasWith(40, 30, { x: 5, y: 6, w: 10, h: 8 }, 3);
  ok('faint ink counts by default', Trim.alphaBounds(px, 40, 30).w, 10);
  ok('and not above the threshold',
     Trim.alphaBounds(px, 40, 30, { threshold: 8 }), { x: 0, y: 0, w: 0, h: 0 });
}

{
  // The region is the arithmetic bound from bounds.js; ink outside it is not
  // looked for, which is exactly the trade that makes the scan cheap.
  const px = canvasWith(40, 30, { x: 0, y: 0, w: 40, h: 30 });
  ok('a region limits the search',
     Trim.alphaBounds(px, 40, 30, { region: { x: 10, y: 10, w: 5, h: 5 } }),
     { x: 10, y: 10, w: 5, h: 5 });
  ok('and a region past the edge is clamped',
     Trim.alphaBounds(px, 40, 30, { region: { x: 35, y: 25, w: 100, h: 100 } }),
     { x: 35, y: 25, w: 5, h: 5 });
}

{
  // Flattened onto white: alpha says nothing, so the ground colour has to.
  const px = new Uint8ClampedArray(20 * 20 * 4).fill(255);
  for (let y = 4; y < 9; y++) {
    for (let x = 2; x < 7; x++) {
      const p = (y * 20 + x) * 4;
      px[p] = 0; px[p + 1] = 0; px[p + 2] = 0; px[p + 3] = 255;
    }
  }
  ok('groundBounds finds ink on an opaque canvas',
     Trim.groundBounds(px, 20, 20, { ground: [255, 255, 255] }),
     { x: 2, y: 4, w: 5, h: 5 });
  ok('and nothing when it is all ground',
     Trim.groundBounds(new Uint8ClampedArray(20 * 20 * 4).fill(255), 20, 20,
       { ground: [255, 255, 255] }), { x: 0, y: 0, w: 0, h: 0 });
}

{
  const indices = new Int16Array(6 * 4).fill(-1);
  indices[1 * 6 + 2] = 0;
  indices[2 * 6 + 4] = 3;
  ok('indexBounds works in cells, reading no pixels',
     Trim.indexBounds(indices, 6, 4), { x: 2, y: 1, w: 3, h: 2 });
  ok('an all-empty field is nothing',
     Trim.indexBounds(new Int16Array(24).fill(-1), 6, 4), { x: 0, y: 0, w: 0, h: 0 });
}

// The union is what makes a loop trimmable at all: one canvas for every frame.
// a spans y 2..4 and x 2..4; b spans y 1..9 and x 8..9. So the union runs
// x 2..9 and y 1..9 — eight wide and nine tall, not ten.
ok('union covers both', Trim.union({ x: 2, y: 2, w: 3, h: 3 }, { x: 8, y: 1, w: 2, h: 9 }),
   { x: 2, y: 1, w: 8, h: 9 });
ok('union with nothing is the other one',
   Trim.union({ x: 0, y: 0, w: 0, h: 0 }, { x: 8, y: 1, w: 2, h: 9 }),
   { x: 8, y: 1, w: 2, h: 9 });
ok('union of nothings is nothing',
   Trim.union({ x: 0, y: 0, w: 0, h: 0 }, { x: 0, y: 0, w: 0, h: 0 }),
   { x: 0, y: 0, w: 0, h: 0 });
ok('a contained rect changes nothing',
   Trim.union({ x: 0, y: 0, w: 10, h: 10 }, { x: 2, y: 2, w: 3, h: 3 }),
   { x: 0, y: 0, w: 10, h: 10 });

ok('grow expands on every side', Trim.grow({ x: 5, y: 5, w: 10, h: 10 }, 3),
   { x: 2, y: 2, w: 16, h: 16 });

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
