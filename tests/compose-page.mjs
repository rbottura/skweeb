/**
 * tests/compose-page.mjs — run with: node tests/compose-page.mjs
 *
 * Covers apps/compose/page.js and params.js: where a placement lands on a
 * page, and what a page and a placement are. The geometry is pure on purpose
 * — the canvas only applies the matrix — so where a turned, scaled object
 * sits can be written down here rather than judged by eye.
 */

const Page   = await import('../apps/compose/page.js');
const Params = await import('../apps/compose/params.js');
const Frame  = await import('../core/frame.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(56), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};
const round = ([x, y]) => [Math.round(x * 1e6) / 1e6 + 0, Math.round(y * 1e6) / 1e6 + 0];

// -- the page ----------------------------------------------------------------

const sheet = { width: 1000, height: 800, bleed: 0 };
ok('a page is its sheet', Page.pageSize(sheet), { width: 1000, height: 800, bleed: 0 });
ok('and its bleed on every side', Page.pageSize({ ...sheet, bleed: 12 }), { width: 1024, height: 824, bleed: 12 });

// -- where a placement lands -------------------------------------------------

const size = { width: 100, height: 50 };
const at = (t, p, page = sheet) => round(Page.onPage(Page.placementMatrix(t, size, page), p));
const still = { x: 0, y: 0, scale: 1, rot: 0 };

ok('at rest, its centre is the page centre', at(still, [50, 25]), [500, 400]);
ok('and its corner half its size up and left', at(still, [0, 0]), [450, 375]);
ok('x and y move the centre, in page pixels', at({ ...still, x: 10, y: -20 }, [50, 25]), [510, 380]);
ok('scale grows it about its centre', at({ ...still, scale: 2 }, [0, 0]), [400, 350]);
ok('and leaves the centre where it was', at({ ...still, scale: 2 }, [50, 25]), [500, 400]);
ok('a quarter turn is clockwise: top-left goes top-right', at({ ...still, rot: 90 }, [0, 0]), [525, 350]);
ok('turning leaves the centre too', at({ ...still, rot: 37, scale: 3 }, [50, 25]), [500, 400]);
ok('bleed moves nothing on the sheet',
   at({ ...still, x: 10 }, [50, 25], { ...sheet, bleed: 20 }), [530, 420]);

// -- an object's size is its ink ---------------------------------------------

// A recording replays onto the screen it was drawn on; its marks reach part of it.
const recording = { width: 1920, height: 945, bounds: { x: 54, y: 67, w: 1812, h: 811 } };
ok('a recording is the ink its loop reaches', Page.inkSize(recording), { width: 1812, height: 811 });
ok('a picture is all of itself',
   Page.inkSize({ width: 228, height: 501, bounds: { x: 0, y: 0, w: 228, h: 501 } }), { width: 228, height: 501 });
ok('no ink known: its whole canvas', Page.inkSize({ width: 300, height: 200, bounds: null }), { width: 300, height: 200 });
ok('an empty loop: its whole canvas too',
   Page.inkSize({ width: 300, height: 200, bounds: { x: 0, y: 0, w: 0, h: 0 } }), { width: 300, height: 200 });

// -- placed whole ------------------------------------------------------------

ok('a small object is placed at its own size', Page.fitScale({ width: 200, height: 100 }, sheet), 1);
ok('a wide one is shrunk to the sheet', Page.fitScale({ width: 2000, height: 100 }, sheet), 0.5);
ok('floored, so the snapped scale still fits', Page.fitScale({ width: 1812, height: 811 }, sheet), 0.55);
ok('never below the scale row', Page.fitScale({ width: 1e6, height: 1 }, sheet), 0.01);

// -- the page's params -------------------------------------------------------

const page = Params.pageParams();
ok('the page has no zoom: each placement has its scale', page.keys.includes('zoom'), false);
ok('and no derived format: a page has no one source',
   Frame.DERIVED.filter(f => page.spec('format').options.includes(f)), []);
ok('it opens as A4', page.get('format'), 'a4');
ok('and the box is that shape, so the chip and the box agree',
   Frame.sizeForFormat('a4', page), [page.get('width'), page.get('height')]);
ok('which is 150 dpi', Math.round(page.get('width') / 210 * 25.4), 150);

// -- a placement, as the recipe keeps it -------------------------------------

const place = Params.placeParams();
place.set({ ref: 'gam_1_abc', x: -40, y: 12, scale: 0.5, rot: 15 });
const block = Params.toPlacement(place.values);
ok('a placement is the object model\'s block', block,
   { ref: 'gam_1_abc', version: 'latest', transform: { x: -40, y: 12, scale: 0.5, rot: 15 }, at: 0, length: null });
place.reset();
place.restore(Params.fromPlacement(block));
ok('and comes back from it', place.values, { ref: 'gam_1_abc', x: -40, y: 12, scale: 0.5, rot: 15 });
place.restore(Params.fromPlacement({ ref: 'gam_2_def' }));
ok('a block with no transform sits at rest', place.values, { ref: 'gam_2_def', x: 0, y: 0, scale: 1, rot: 0 });
ok('a placement takes what core gives frames of', place.spec('ref').accepts, ['still', 'sequence', 'shape']);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
