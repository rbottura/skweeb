/**
 * tests/fractal-field.mjs — run with: node tests/fractal-field.mjs
 *
 * Covers apps/fractals/field.js, M7's link: escape time as a field. The
 * promises — the smooth count leaves where the escape count does, and never
 * inside; the field is a pure function of the recipe; outside the set it
 * points at the set, inside it there is none; no direction is longer than 1;
 * past the picture it is held at the edge.
 */

const { smooth, escape } = await import('../apps/fractals/fractal.js');
const { escapeField } = await import('../apps/fractals/field.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};

const mandel = { kind: 'mandelbrot', cx: -0.6, cy: 0, zoom: 1, iterations: 200, jx: -0.8, jy: 0.156, width: 1080, height: 1080 };
const unit = 3 / 1080;                                        // SPAN / zoom / height
const px = x => (x - mandel.cx) / unit, py = y => -(y - mandel.cy) / unit;

// ── The smooth count ────────────────────────────────────────────────────────

const probes = [[0.7, 0], [-0.2, 0], [-2, 1], [0.3, 0.5], [-0.75, 0.1], [-1, 0]];
ok('smooth leaves where escape does, and never inside', probes.map(([x, y]) =>
  Number.isFinite(smooth(mandel, x, y)) === (escape(mandel, x, y) < mandel.iterations)), probes.map(() => true));
ok('and rises towards the set', smooth(mandel, 0.5, 0) > smooth(mandel, 1.5, 0), true);

// ── The field ───────────────────────────────────────────────────────────────

const f = escapeField(mandel);
const g = escapeField(mandel);
const spots = [[0, 0], [123.4, -56.7], [px(0.7), 0], [-400, 300]];
ok('a pure function of the recipe', spots.map(([x, y]) => f.at(x, y)), spots.map(([x, y]) => g.at(x, y)));
const right = f.at(px(0.7), 0), above = f.at(px(-0.6), py(1.3));
ok('right of the set, it points left, at it', right[0] < -0.9 && Math.abs(right[1]) < 0.3, true);
ok('above it, it points down, towards its bulk', above[1] > 0.9 && above[0] > 0, true);
const below = f.at(px(-0.6), py(-1.3));
ok('and below it the same, mirrored, as the set is', [+below[0].toFixed(12), +below[1].toFixed(12)],
   [+above[0].toFixed(12), +(-above[1]).toFixed(12)]);
const inside = f.at(px(-0.2), 0);
ok('inside the set, no pull', Math.hypot(...inside) < 1e-9, true);
let longest = 0;
for (let y = -540; y <= 540; y += 27) for (let x = -540; x <= 540; x += 27) longest = Math.max(longest, Math.hypot(...f.at(x, y)));
ok('no direction longer than 1', longest <= 1 + 1e-12 && longest > 0.99, true);
ok('past the picture, held at its edge', f.at(10000, 0), f.at(540, 0));
ok('on a grid of about 128 a side', [f.nx, f.ny], [129, 129]);

const julia = escapeField({ ...mandel, kind: 'julia', cx: 0, zoom: 1 });
const jr = julia.at(500, 0);
ok('a Julia set\'s field points at it too', jr[0] < -0.5, true);
const wide = escapeField({ ...mandel, width: 1920, height: 1080 });
ok('a wide picture: its grid follows its shape', [wide.nx, wide.ny], [129, 73]);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
