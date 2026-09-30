/**
 * tests/points.mjs — run with: node tests/points.mjs
 *
 * Covers core/points.js: an object as points to leave from. The promises —
 * points come back centred on their box, its longer side 1; a dot-set gives
 * one glyph's dots exact, the index wrapping, a bad dot left out; a picture
 * gives its ink on a grid of at most SIDE a side, each sample its cell's
 * centre, what is see-through left out.
 */

const { normalise, pointsOfGlyph, pointsOfPicture, SIDE } = await import('../core/points.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};

// ── Centred, the longer side 1 ──────────────────────────────────────────────

const box = normalise([[0, 0], [10, 0], [10, 5]], 2);
ok('centred on the box, its longer side 1', box.list, [[-0.5, -0.25], [0.5, -0.25], [0.5, 0.25]]);
ok('the box as it was, and a cell in the same units', [box.w, box.h, box.cell], [10, 5, 0.2]);
ok('one point is the centre', normalise([[7, 9]]).list, [[0, 0]]);
ok('none is none', normalise([]).list, []);

// ── A dot-set: one glyph, exact ─────────────────────────────────────────────

const set = [[[0, 0], [4, 0], [2, 2]], [[1, 1]], [[3, 3], ['x', 1], null, [5, 3]]];
ok('a glyph\'s dots', pointsOfGlyph(set, 0).list, [[-0.5, -0.25], [0.5, -0.25], [0, 0.25]]);
ok('which glyph, of how many', [pointsOfGlyph(set, 1).glyph, pointsOfGlyph(set, 1).glyphs], [1, 3]);
ok('the index wraps, either way', [pointsOfGlyph(set, 3).glyph, pointsOfGlyph(set, -1).glyph], [0, 2]);
ok('a dot that is not two numbers is left out', pointsOfGlyph(set, 2).list, [[-0.5, 0], [0.5, 0]]);
ok('no glyphs, no points', pointsOfGlyph([], 0).list, []);
ok('dots are exact: no cell to jitter in', pointsOfGlyph(set, 0).cell, 0);

// ── A picture: its ink, on a grid ───────────────────────────────────────────

const picture = (w, h, inked) => {
  const rgba = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) rgba[(y * w + x) * 4 + 3] = inked(x, y) ? 255 : 0;
  return rgba;
};
const two = pointsOfPicture(picture(4, 4, (x, y) => (x === 1 && y === 1) || (x === 2 && y === 2)), 4, 4);
ok('a small picture: every inked pixel', two.list, [[-0.5, -0.5], [0.5, 0.5]]);
ok('its cell one pixel, in the box\'s units', two.cell, 1);
const faint = pointsOfPicture(picture(3, 1, x => x !== 1), 3, 1);
ok('see-through is no ink', faint.list.length, 2);
const big = pointsOfPicture(picture(1000, 500, () => true), 1000, 500);
const cols = new Set(big.list.map(p => p[0])).size, rows = new Set(big.list.map(p => p[1])).size;
ok('a large picture: at most SIDE samples a side', cols <= SIDE && rows <= SIDE && cols > SIDE * 0.9, true);
ok('and every sample its cell\'s centre, evenly', [cols, rows], [125, 62]);
const ring = pointsOfPicture(picture(64, 64, (x, y) => Math.abs(Math.hypot(x - 31.5, y - 31.5) - 24) < 3), 64, 64);
ok('a ring\'s points keep its hole', ring.list.every(([x, y]) => Math.hypot(x, y) > 0.3), true);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
