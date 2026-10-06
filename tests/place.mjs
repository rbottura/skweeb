/**
 * tests/place.mjs — run with: node tests/place.mjs
 *
 * Covers core/place.js: where a placement sits on a page. The promises — an
 * object at rest has its centre on the page's centre; a move, a scale and a
 * turn are about that centre, the turn clockwise; a bleed moves nothing on
 * the sheet; a placement undone takes a point of the page back into the
 * object's own pixels; two matrices made one place a point as the two in
 * turn; a matrix undone is the way back; and compose's page.js hands on the
 * same functions it moved here.
 */

const P = await import('../core/place.js');
const Page = await import('../apps/compose/page.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const round = p => p.map(v => Math.round(v * 1000) / 1000 + 0);
const page = { width: 400, height: 300 };
const size = { width: 100, height: 50 };
const at = (t, p) => round(P.onPage(P.placementMatrix({ x: 0, y: 0, scale: 1, rot: 0, ...t }, size, page), p));

ok('at rest, its centre is the page\'s', at({}, [50, 25]), [200, 150]);
ok('…and its corner half its size up and left', at({}, [0, 0]), [150, 125]);
ok('moved: x and y from the centre', at({ x: 30, y: -20 }, [50, 25]), [230, 130]);
ok('scaled about its centre', at({ scale: 2 }, [0, 0]), [100, 100]);
ok('turned clockwise about its centre: its right end goes down', at({ rot: 90 }, [100, 25]), [200, 200]);
ok('a bleed grows the canvas and moves nothing on the sheet',
  round(P.onPage(P.placementMatrix({ x: 0, y: 0, scale: 1, rot: 0 }, size, { ...page, bleed: 10 }), [50, 25])), [210, 160]);
ok('the page\'s canvas, its bleed counted', P.pageSize({ ...page, bleed: 10 }), { width: 420, height: 320, bleed: 10 });

const m = P.placementMatrix({ x: 12, y: -7, scale: 0.75, rot: 33 }, size, page);
ok('a placement undone: a point of the page back in its own pixels', round(P.offPage(m, P.onPage(m, [17, 41]))), [17, 41]);
ok('…and as a matrix of its own', round(P.onPage(P.invert(m), P.onPage(m, [17, 41]))), [17, 41]);
const n = P.placementMatrix({ x: -40, y: 5, scale: 1.5, rot: -20 }, { width: 30, height: 30 }, page);
ok('two matrices made one place a point as the two in turn', round(P.onPage(P.multiply(m, n), [3, 4])), round(P.onPage(m, P.onPage(n, [3, 4]))));
ok('a flat matrix undone is the way back, not a blow-up', P.invert([0, 0, 0, 0, 5, 5]), [1, 0, 0, 1, 0, 0]);

ok('compose\'s page.js hands on the same functions', [Page.placementMatrix, Page.onPage, Page.offPage, Page.pageSize]
  .map((f, i) => f === [P.placementMatrix, P.onPage, P.offPage, P.pageSize][i]), [true, true, true, true]);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
