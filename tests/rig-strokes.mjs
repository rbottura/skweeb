/**
 * tests/rig-strokes.mjs — run with: node tests/rig-strokes.mjs
 *
 * Covers apps/rig/strokes.js and drawing.js, a drawing's strokes found again
 * from its marks. The promises — a jump is a lifted pen and a pause is not,
 * so a pen held still before it moves stays one stroke; a path is measured
 * along its length, and a point found between its marks; a corner is where
 * it turns past the angle asked, an elbow, never a straight run, a gentle
 * curve or its ends; a still's marks are stamps in its picture's pixels,
 * cropped as it was, a mirror pattern's copy a stroke of its own, mirrored.
 */

const { strokesOf, pathOf, pointAt, cornersOf } = await import('../apps/rig/strokes.js');
const { drawingOf, spritesOf } = await import('../apps/rig/drawing.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const near = (a, b, e = 1e-6) => Math.abs(a - b) < e;

/** A line of marks, `step` px apart, from (x0, y0) to (x1, y1). */
const line = (x0, y0, x1, y1, step = 2) => {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  return Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n }));
};

const body = line(100, 200, 100, 50), arm = [...line(102, 120, 180, 120), ...line(180, 118, 180, 60).slice(1)];
ok('a jump is a lifted pen: two strokes', strokesOf([...body, ...arm]).map(s => s.length), [body.length, arm.length]);
const held = [{ x: 0, y: 0 }, { x: 1.5, y: 0 }, ...line(3, 0, 60, 0).map(p => ({ ...p }))];
ok('a pen held still, then moving, is one stroke', strokesOf(held).length, 1);
ok('no marks, no strokes', strokesOf([]), []);
ok('a jump short of the least is no lifted pen', strokesOf([...line(0, 0, 20, 0), ...line(30, 0, 50, 0)], { jump: 16 }).length, 1);

const path = pathOf([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 10 }]);
ok('a path is measured along its length', [path.at, path.length], [[0, 5, 11], 11]);
const mid = pointAt(path, 8);
ok('a point between its marks', near(mid.x, 3) && near(mid.y, 7), true);
ok('past its ends, its ends', [pointAt(path, -3), pointAt(path, 99)], [{ x: 0, y: 0 }, { x: 3, y: 10 }]);

const elbow = cornersOf(pathOf(arm), { corner: 30 });
ok('an elbow is a corner, where the arm turns', elbow.length === 1 && Math.abs(elbow[0] - 78) < 6, true);
ok('a straight run has none', cornersOf(pathOf(body), { corner: 30 }), []);
const arc = Array.from({ length: 91 }, (_, i) => ({ x: 200 * Math.cos(i / 180), y: 200 * Math.sin(i / 180) }));
ok('nor a gentle curve', cornersOf(pathOf(arc), { corner: 30 }), []);
const hook = [...line(0, 0, 100, 0), ...line(100, 2, 100, 6).slice(1)];
ok('nor a turn too near an end to bend', cornersOf(pathOf(hook), { corner: 30 }), []);
ok('asked for a sharper turn, the elbow is none', cornersOf(pathOf(arm), { corner: 120 }), []);

const mark = (x, y, extra = {}) => ({ x, y, rotation: 0.5, scale: 0.2, familyId: 'brushes', spriteIndex: 8, pattern: 'single', ...extra });
const recipe = { canvas: { w: 800, h: 600, background: 'none' }, frame: { from: { x: 50, y: 40, w: 400, h: 300 },
  to: { x: 0, y: 0, w: 400, h: 300 }, w: 400, h: 300 }, marks: [...body.map(p => mark(p.x, p.y)), ...arm.map(p => mark(p.x, p.y))] };
const d = drawingOf(recipe);
ok('a still\'s marks are stamps in its picture, cropped', [d.width, d.height, d.stamps[0].x, d.stamps[0].y], [400, 300, 50, 160]);
ok('each knows its stroke, and how far along it', [d.strokes.length, d.stamps[0].stroke, d.stamps[body.length].stroke,
  d.stamps[1].s], [2, 0, 1, 2]);
ok('turned and sized as drawn', [d.stamps[0].rotation, d.stamps[0].scale, d.stamps[0].flipX], [0.5, 0.2, 1]);
ok('no ground: drawn on nothing', d.ground, null);

const mirrored = drawingOf({ ...recipe, frame: null, marks: line(100, 100, 100, 50).map(p => mark(p.x, p.y, { pattern: 'mirror-x' })) });
ok('a mirror pattern\'s copy is a stroke of its own, mirrored', [mirrored.strokes.length, mirrored.stamps[1].x, mirrored.stamps[1].flipX,
  mirrored.stamps[1].stroke], [2, 700, -1, 1]);
ok('a drawing names each sprite it uses once', [...spritesOf(recipe).entries()], [['brushes#8', ['brushes', 8]]]);

const back = drawingOf(recipe, { reverse: [1] });
const armStamps = back.strokes[1].stamps;
ok('a stroke read in reverse: from its last stamp, measured from there', [armStamps[0] > armStamps[armStamps.length - 1],
  back.stamps[armStamps[0]].s, near(back.strokes[1].path.points[0].y, d.stamps[d.strokes[1].stamps.at(-1)].y)], [true, 0, true]);
ok('…the stamps in the order drawn, and the other strokes as they were', [back.stamps.map(s => s.x).join() === d.stamps.map(s => s.x).join(),
  back.strokes[0].stamps.join() === d.strokes[0].stamps.join()], [true, true]);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
