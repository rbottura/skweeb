/**
 * tests/grid-map.mjs — run with: node tests/grid-map.mjs
 *
 * apps/grid/map.js is the whole of what grid does, with the canvas taken out,
 * so it is the part worth pinning. It is also a rewrite of code that had a bug
 * and a compensation for that bug sitting in it, cancelling each other — the
 * kind of pair that survives a port unless something holds the arithmetic to
 * known answers.
 *
 * The regression at the bottom is that exact pair: the original summed a
 * pixel's RGB *plus the previous pixel's alpha*, and subtracted a flat 255 to
 * hide it. Both are gone, and these checks fail if either comes back.
 */

const { mapPixels, gridSize, luminance, rampUsage, WEIGHTS } =
  await import('../apps/grid/map.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(48), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

/** RGBA bytes from [r,g,b,a] triples. */
const px = (...pixels) => new Uint8ClampedArray(pixels.flat());
const idx = (...args) => Array.from(mapPixels(...args));

const BLACK = [0, 0, 0, 255];
const WHITE = [255, 255, 255, 255];
const MID   = [128, 128, 128, 255];
const CLEAR = [0, 0, 0, 0];

// ── luminance ────────────────────────────────────────────────────────────────

ok('black is 0', luminance(0, 0, 0), 0);
ok('white is 1', luminance(255, 255, 255), 1);
ok('flat weighting sums to one', WEIGHTS.flat.reduce((a, b) => a + b, 0), 1);
ok('perceptual weighting sums to one',
   Math.round(WEIGHTS.perceptual.reduce((a, b) => a + b, 0) * 1e10) / 1e10, 1);
ok('green reads lighter than blue, perceptually',
   luminance(0, 255, 0) > luminance(0, 0, 255), true);
ok('flat weighting cannot tell them apart',
   luminance(0, 255, 0, 'flat'), luminance(0, 0, 255, 'flat'));
ok('an unknown weighting falls back rather than NaN',
   luminance(255, 255, 255, 'nonsense'), 1);

// ── The mapping, end to end ──────────────────────────────────────────────────
// Dark lands on the far end of the ramp, so a ramp reads light to dark.

ok('black takes the last ramp member', idx(px(BLACK), { steps: 8 }), [7]);
ok('white takes the first', idx(px(WHITE), { steps: 8 }), [0]);
// 128/255 is 0.502, so (1 - 0.502) * 7 is 3.49 and rounds to 3. The midpoint
// of a 0..7 ramp is 3.5, and 128 is a shade lighter than half, so 3 is the
// correct side of it.
ok('mid-grey lands just past mid-ramp', idx(px(MID), { steps: 8 }), [3]);
ok('a one-step ramp always answers 0', idx(px(BLACK, WHITE, MID), { steps: 1 }), [0, 0, 0]);
ok('invert swaps the ends',
   idx(px(BLACK, WHITE), { steps: 8, invert: true }), [0, 7]);

ok('every index is inside the ramp',
   idx(px(BLACK, WHITE, MID, [10, 200, 30, 255]), { steps: 4 }).every(v => v >= -1 && v < 4), true);

// ── Alpha ────────────────────────────────────────────────────────────────────
// A transparent pixel is not a black one. Most of what this suite makes is
// cut out, so an empty cell has to be sayable.

ok('a clear pixel is empty, not black', idx(px(CLEAR), { steps: 8 }), [-1]);
ok('empty survives invert', idx(px(CLEAR), { steps: 8, invert: true }), [-1]);
ok('the floor is adjustable',
   idx(px([0, 0, 0, 20]), { steps: 8, alphaFloor: 40 }), [-1]);
ok('and a pixel above it maps normally',
   idx(px([0, 0, 0, 20]), { steps: 8, alphaFloor: 10 }), [7]);
ok('a fully opaque pixel is never empty',
   idx(px(WHITE), { steps: 8, alphaFloor: 255 }), [0]);

// ── Shape ────────────────────────────────────────────────────────────────────

ok('one index per pixel', idx(px(BLACK, WHITE, MID), { steps: 4 }).length, 3);
ok('a trailing partial pixel is ignored',
   mapPixels(new Uint8ClampedArray([0, 0, 0, 255, 12, 34]), { steps: 4 }).length, 1);
ok('no pixels, no indices', idx(new Uint8ClampedArray([]), { steps: 4 }), []);
ok('missing options do not throw', mapPixels(px(MID)).length, 1);

// ── gridSize ─────────────────────────────────────────────────────────────────
// Whole cells only: a half-width column at the edge reads as a mistake, not a
// margin. What is left over comes back as the margin instead.

ok('cells that divide exactly', gridSize({ width: 100, height: 50, cell: 10 }),
   { cols: 10, rows: 5, cell: 10, w: 100, h: 50, marginX: 0, marginY: 0 });
ok('a remainder becomes margin, not a part cell',
   gridSize({ width: 104, height: 53, cell: 10 }),
   { cols: 10, rows: 5, cell: 10, w: 100, h: 50, marginX: 4, marginY: 3 });
ok('the original canvas and cell size',
   (g => [g.cols, g.rows])(gridSize({ width: 1728 * 0.3, height: 2160 * 0.3, cell: 6 })),
   [86, 108]);
ok('a cell larger than the surface gives no grid',
   (g => [g.cols, g.rows])(gridSize({ width: 10, height: 10, cell: 40 })), [0, 0]);
ok('a zero cell does not divide by zero',
   gridSize({ width: 100, height: 100, cell: 0 }).cell, 1);

// ── rampUsage ────────────────────────────────────────────────────────────────

const field = mapPixels(px(BLACK, BLACK, WHITE, CLEAR), { steps: 4 });
ok('usage counts each member', rampUsage(field, 4).counts, [1, 0, 0, 2]);
ok('usage counts the empties', rampUsage(field, 4).empty, 1);
ok('usage reports how much of the ramp earned its place', rampUsage(field, 4).used, 2);

// ── The regression ───────────────────────────────────────────────────────────
// The original summed R+G+B plus the PREVIOUS pixel's alpha, then subtracted a
// flat 255 to hide it. On a run of identical pixels the two cancel, so the
// tell is a first pixel that disagrees with its identical neighbours.

const run = idx(px(WHITE, WHITE, WHITE, WHITE), { steps: 6 });
ok('identical pixels map identically, first one included',
   new Set(run).size, 1);

const darkRun = idx(px(BLACK, BLACK, BLACK), { steps: 6 });
ok('and at the dark end too', darkRun, [5, 5, 5]);

// Alpha must not reach the luminance at all: same colour, different alpha,
// same index — which is what the old loop could not say.
ok('alpha never leaks into brightness',
   idx(px([128, 128, 128, 255], [128, 128, 128, 40]), { steps: 8, alphaFloor: 8 }),
   [3, 3]);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
