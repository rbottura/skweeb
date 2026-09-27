/**
 * tests/fractal.mjs — run with: node tests/fractal.mjs
 *
 * Covers apps/fractals/fractal.js without a GPU: the plane under a pixel,
 * a zoom that keeps the pointer's point, the escape count the GPU's picture
 * is held to, and the numbers the pass is handed. The promises — the
 * picture is a function of its params, the same at any size in pixels, and
 * a wheel turned over a point leaves that point under the pointer.
 */

const { planeAt, zoomAbout, escape, FRACTAL, FRACTAL_PARAMS, SPAN, MAX_STOPS } = await import('../apps/fractals/fractal.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 70),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 70));
};
const near = (a, b, e = 1e-12) => Math.abs(a - b) < e;
const v = { kind: 'mandelbrot', cx: -0.5, cy: 0, zoom: 1, iterations: 200, jx: -0.8, jy: 0.156 };

// ── The plane ───────────────────────────────────────────────────────────────

ok('the picture\'s centre is the centre point', planeAt(v, 800, 600, 400, 300), [-0.5, 0]);
ok('its height spans SPAN at zoom 1, the imaginary axis up',
   [planeAt(v, 800, 600, 400, 0)[1], planeAt(v, 800, 600, 400, 600)[1]], [SPAN / 2, -SPAN / 2]);
ok('a wider picture shows more of the plane across, not less up', planeAt(v, 1200, 600, 0, 300)[0], -0.5 - SPAN);
ok('the same point at any size in pixels', planeAt(v, 400, 300, 100, 75).every((x, i) => near(x, planeAt(v, 1600, 1200, 400, 300)[i])), true);
ok('zoom 10 shows a tenth', planeAt({ ...v, zoom: 10 }, 800, 600, 400, 0)[1], SPAN / 20);

const z = zoomAbout(v, 800, 600, 620, 130, 3);
const before = planeAt(v, 800, 600, 620, 130), after = planeAt({ ...v, ...z }, 800, 600, 620, 130);
ok('a zoom about a pixel keeps its point under it', near(before[0], after[0]) && near(before[1], after[1]), true);
ok('and zooms by the factor', z.zoom, 3);
const back = zoomAbout({ ...v, ...z }, 800, 600, 620, 130, 1 / 3);
ok('and zooming back returns the view', near(back.cx, v.cx) && near(back.cy, v.cy) && near(back.zoom, 1), true);

// ── Escape ──────────────────────────────────────────────────────────────────

ok('the origin never leaves: inside', escape(v, 0, 0), 200);
ok('-1 cycles: inside', escape(v, -1, 0), 200);
// Out past a radius of 256, for the smooth colouring: a far point still takes a step or two.
ok('far out, it leaves at once', escape(v, 20, 20) <= 1, true);
ok('2 + 2i, soon', escape(v, 2, 2) < 5, true);
ok('near the edge, it takes longer the nearer', escape(v, -0.75, 0.1) > escape(v, -0.75, 0.3), true);
ok('a Julia set iterates its own point: c outside, its centre leaves', escape({ ...v, kind: 'julia', jx: 0.4, jy: 0.4 }, 0, 0) < 200 && escape(v, 0, 0) === 200, true);
ok('its c inside the Mandelbrot set: the Julia set\'s centre stays', escape({ ...v, kind: 'julia', jx: 0, jy: 0 }, 0.5, 0), 200);

// ── The pass ────────────────────────────────────────────────────────────────

const u = FRACTAL.passes[0].uniforms({ ...v, cycle: 48, phase: 0.25, colours: ['#ff0000', '#00ff00'], inside: '#0000ff' });
ok('sixteen numbers, then a stop of four each', u.length, 16 + MAX_STOPS * 4);
ok('the centre, the span, the iterations', u.slice(0, 4), [-0.5, 0, SPAN, 200]);
ok('the ramp\'s turn, its phase, its count, not a Julia set', u.slice(4, 8), [48, 0.25, 2, 0]);
ok('the inside colour', u.slice(10, 13), [0, 0, 1]);
ok('the stops, in order', u.slice(16, 24), [1, 0, 0, 0, 0, 1, 0, 0]);
ok('a Julia set says so, with its c', FRACTAL.passes[0].uniforms({ ...v, kind: 'julia', colours: [] }).slice(7, 10), [1, -0.8, 0.156]);
ok('its params are the app\'s', FRACTAL.params, FRACTAL_PARAMS);
ok('the centre takes any value, not a grid\'s', [FRACTAL_PARAMS.cx.step, FRACTAL_PARAMS.cy.step, FRACTAL_PARAMS.zoom.step], ['any', 'any', 'any']);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
