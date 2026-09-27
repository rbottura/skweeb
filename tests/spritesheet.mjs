/**
 * tests/spritesheet.mjs — run with: node tests/spritesheet.mjs
 *
 * Covers core/spritesheet.js's pure parts: the box a loop reaches, the
 * layout, the durations and the JSON an engine reads. The promises — a box
 * that holds every drawn pixel and nothing past it, cells that never touch,
 * durations in whole ms that sum to the loop exactly, and the fields
 * Aseprite's array format has.
 */

const { inkBox, unionBox, padBox, sheetLayout, durations, sheetJson } = await import('../core/spritesheet.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};

/** A width × height frame with the pixels at `points` drawn: alpha 255 there, 0 elsewhere. */
const frame = (width, height, points) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (const [x, y, a = 255] of points) data[(y * width + x) * 4 + 3] = a;
  return { data, width, height };
};

// ── The box ─────────────────────────────────────────────────────────────────

ok('an empty frame has no box', inkBox(frame(8, 8, [])), null);
ok('one pixel is a box of one', inkBox(frame(8, 8, [[3, 5]])), { x: 3, y: 5, w: 1, h: 1 });
ok('the box holds every drawn pixel', inkBox(frame(10, 10, [[2, 7], [6, 1], [4, 4]])), { x: 2, y: 1, w: 5, h: 7 });
ok('the faintest alpha counts', inkBox(frame(4, 4, [[0, 0, 1]])), { x: 0, y: 0, w: 1, h: 1 });
ok('a whole frame is the frame', inkBox(frame(3, 2, [[0, 0], [2, 1]])), { x: 0, y: 0, w: 3, h: 2 });
ok('two frames: the box that holds both', unionBox({ x: 2, y: 2, w: 2, h: 2 }, { x: 5, y: 0, w: 1, h: 3 }), { x: 2, y: 0, w: 4, h: 4 });
ok('an empty frame changes nothing', unionBox(null, { x: 1, y: 1, w: 1, h: 1 }), { x: 1, y: 1, w: 1, h: 1 });
ok('a margin, round every side', padBox({ x: 10, y: 10, w: 5, h: 5 }, 2, 100, 100), { x: 8, y: 8, w: 9, h: 9 });
ok('never past the frame', padBox({ x: 1, y: 0, w: 98, h: 10 }, 4, 100, 12), { x: 0, y: 0, w: 100, h: 12 });

// ── The layout ──────────────────────────────────────────────────────────────

const sq = sheetLayout(60, 100, 100);
ok('sixty square frames: eight across', [sq.cols, sq.rows], [8, 8]);
ok('the sheet: the cells and a gap between them', [sq.width, sq.height], [8 * 100 + 7 * 2, 8 * 100 + 7 * 2]);
ok('in order, left to right and down', [sq.rects[0], sq.rects[1], sq.rects[8]].map(r => [r.x, r.y]), [[0, 0], [102, 0], [0, 102]]);
const tall = sheetLayout(60, 40, 200);
ok('tall frames: more across, so the sheet is near square', tall.cols > tall.rows, true);
ok('no two cells touch', sq.rects.every((r, i) => sq.rects.every((q, j) => i === j
  || r.x + r.w < q.x || q.x + q.w < r.x || r.y + r.h < q.y || q.y + q.h < r.y)), true);
ok('columns when asked', sheetLayout(10, 20, 20, { cols: 10 }).rows, 1);
ok('one frame is one cell, no gap', [sheetLayout(1, 30, 40).width, sheetLayout(1, 30, 40).height], [30, 40]);

// ── Durations ───────────────────────────────────────────────────────────────

const d30 = durations(60, 30);
ok('whole milliseconds', d30.every(Number.isInteger), true);
ok('30 fps: 33 and 34, never drifting', [d30.slice(0, 3), d30.reduce((a, b) => a + b, 0)], [[33, 34, 33], 2000]);
ok('24 fps sums to its length', durations(24, 24).reduce((a, b) => a + b, 0), 1000);
ok('60 fps: 16s and 17s', [...new Set(durations(60, 60))].sort(), [16, 17]);

// ── The JSON ────────────────────────────────────────────────────────────────

const j = sheetJson({ image: 'torch.png', layout: sheetLayout(4, 50, 80), fps: 30, name: 'torch', source: { id: 'ptc_1' } });
ok('a frame per frame, in order', j.frames.map(f => f.filename), ['torch 0', 'torch 1', 'torch 2', 'torch 3']);
ok('each its rect on the sheet', j.frames[1].frame, { x: 52, y: 0, w: 50, h: 80 });
ok('untrimmed, unrotated, its own size', [j.frames[0].trimmed, j.frames[0].rotated, j.frames[0].sourceSize], [false, false, { w: 50, h: 80 }]);
ok('meta: the image beside it and the sheet\'s size', [j.meta.image, j.meta.size], ['torch.png', { w: 154, h: 162 }]);
ok('one tag, the whole loop, forward', j.meta.frameTags, [{ name: 'torch', from: 0, to: 3, direction: 'forward', loop: true }]);
ok('where it came from, kept aside', j.meta.skweeb, { id: 'ptc_1' });

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
