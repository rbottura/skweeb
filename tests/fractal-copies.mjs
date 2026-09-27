/**
 * tests/fractal-copies.mjs — run with: node tests/fractal-copies.mjs
 *
 * Covers apps/fractals/copies.js: a sprite copying itself. The promises —
 * a generation holds every map of every copy before it, so the count is
 * exact; a parent comes before its children; the last generation alone
 * when asked; the copies stop before MAX_COPIES, not past it; a tree's
 * branch stands on its parent's tip; and every copy fits in the picture.
 */

const { copiesOf, fitOf, boxOf, mul, apply, SHAPES, MAX_COPIES } = await import('../apps/fractals/copies.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 70),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 70));
};
const near = (a, b, e = 1e-9) => Math.abs(a - b) < e;
const of = (shape, extra = {}) => ({ shape, ...SHAPES[shape].start, show: 'every', ...extra });

// ── How many ────────────────────────────────────────────────────────────────

ok('a triangle, 3 deep: 1 + 3 + 9 + 27', copiesOf(of('triangle', { depth: 3 })).copies.length, 40);
ok('the last generation alone: 27', copiesOf(of('triangle', { depth: 3, show: 'last' })).copies.length, 27);
ok('a carpet, 2 deep, last: 8 × 8', copiesOf(of('carpet', { depth: 2, show: 'last' })).copies.length, 64);
ok('a cross, 3 deep, last: 5³', copiesOf(of('cross', { depth: 3, show: 'last' })).copies.length, 125);
ok('a tree of 3 branches, 4 deep: 1 + 3 + 9 + 27 + 81', copiesOf(of('tree', { depth: 4, branches: 3 })).copies.length, 121);
ok('a spiral, 40 deep: 41, one each', copiesOf(of('spiral', { depth: 40 })).copies.length, 41);
const deep = copiesOf(of('carpet', { depth: 12 }));
ok('never past MAX_COPIES: the carpet stops a generation short', deep.copies.length <= MAX_COPIES && deep.depth < 12, true);

// ── In what order, and where ────────────────────────────────────────────────

const all = copiesOf(of('tree', { depth: 3 })).copies;
ok('a parent before its children: generations in order', all.every((c, i) => !i || c.level >= all[i - 1].level), true);
ok('the sprite itself first, as it is', all[0].m, [1, 0, 0, 1, 0, 0]);
const child = all.find(c => c.level === 1);
const foot = apply(child.m, [0, 0.5]);
ok('a branch stands on the tip of its parent', near(foot[0], 0) && near(foot[1], -0.5), true);
ok('each branch its map', all.filter(c => c.level === 1).map(c => c.branch), [0, 1]);
const tri = copiesOf(of('triangle', { depth: 1, show: 'last' })).copies;
ok('a triangle\'s copies are half size', tri.every(c => near(Math.hypot(c.m[0], c.m[1]), 0.5)), true);
ok('the same params, the same copies', JSON.stringify(copiesOf(of('carpet', { depth: 3 }))), JSON.stringify(copiesOf(of('carpet', { depth: 3 }))));

// ── Fitted to the picture ───────────────────────────────────────────────────

const box = boxOf(1.5);
ok('a tall sprite\'s box: its shape, in the square', box, { w: 1 / 1.5, h: 1 });
for (const shape of Object.keys(SHAPES)) {
  const { copies } = copiesOf(of(shape));
  const fit = fitOf(copies, box, 1080, 720, { size: 1, turn: 0 });
  let inside = true;
  for (const { m } of copies) for (const p of [[-box.w / 2, -box.h / 2], [box.w / 2, box.h / 2]]) {
    const [x, y] = apply(mul(fit, m), p);
    if (x < -0.5 || y < -0.5 || x > 1080.5 || y > 720.5) inside = false;
  }
  ok(`every copy of a ${shape} inside the picture`, inside, true);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
