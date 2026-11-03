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

// -- picking one up ----------------------------------------------------------

const turned = { x: 30, y: -40, scale: 1.7, rot: 33 };
const m = Page.placementMatrix(turned, size, sheet);
ok('off the page undoes on the page', round(Page.offPage(m, Page.onPage(m, [12, 34]))), [12, 34]);
const layer = (t, s = size) => ({ size: s, transform: t });
const stack = [layer(still), layer({ ...still, x: 30 })];
ok('a point on both is the top one\'s', Page.hitTest([520, 400], stack, sheet), 1);
ok('a point on the lower one alone is its', Page.hitTest([455, 400], stack, sheet), 0);
ok('a point on neither is nothing', Page.hitTest([100, 100], stack, sheet), -1);
// A quarter turn: 100 x 50 stands 50 wide and 100 tall about the centre.
const upright = [layer({ ...still, rot: 90 })];
ok('turned, it is picked up where it stands', Page.hitTest([500, 440], upright, sheet), 0);
ok('and not where it lay before it turned', Page.hitTest([540, 400], upright, sheet), -1);

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
ok('and comes back from it', place.values, { ref: 'gam_1_abc', look: null, version: 0, x: -40, y: 12, scale: 0.5, rot: 15, opacity: 1, blend: 'normal', at: 0, length: 0 });
place.restore(Params.fromPlacement({ ref: 'gam_2_def' }));
ok('a block with no transform sits at rest', place.values, { ref: 'gam_2_def', look: null, version: 0, x: 0, y: 0, scale: 1, rot: 0, opacity: 1, blend: 'normal', at: 0, length: 0 });

// A smart object placed at its state (S6b): pinned, and named so among the page's parents; 0 follows it.
const pinned = Params.toPlacement({ ...place.values, ref: 'skw_1_abc', version: 3 });
ok('a smart object placed at its state is pinned there', pinned.version, 3);
ok('…0, it follows its new states', Params.toPlacement({ ...place.values, ref: 'skw_1_abc', version: 0 }).version, 'latest');
ok('…an ordinary object never pins: it never changes', Params.toPlacement({ ...place.values, ref: 'gam_1_abc', version: 3 }).version, 'latest');
ok('the page is made from that state of it', Params.parentsOf({ place: [pinned, Params.toPlacement({ ...place.values, ref: 'skw_2_def', version: 0 })] }), ['skw_1_abc@v3', 'skw_2_def']);

// Its time: from a frame, for some — a length of 0 in the panel is null in the block, its own.
place.set({ ref: 'gam_1_abc', at: 3, length: 2 });
const timed = Params.toPlacement(place.values);
ok('a placement keeps when it shows', [timed.at, timed.length], [3, 2]);
ok('a length of 0 is its own, null', Params.toPlacement({ ...place.values, length: 0 }).length, null);
place.restore(Params.fromPlacement(timed));
ok('and comes back with its time', [place.values.at, place.values.length], [3, 2]);

// A look over it (M5's link): in the block only when there is one.
place.set({ ref: 'gam_1_abc', look: 'fil_1_look' });
const looked = Params.toPlacement(place.values);
ok('a look rides in the block', looked.look, 'fil_1_look');
place.restore(Params.fromPlacement(looked));
ok('and comes back with it', place.values.look, 'fil_1_look');
ok('a block with no look has no look key', 'look' in Params.toPlacement({ ...place.values, look: null }), false);
ok('a look is a parent of its page, once',
  Params.parentsOf({ place: [looked, { ...looked, ref: 'gam_2_def' }] }), ['gam_1_abc', 'fil_1_look', 'gam_2_def']);
// How it meets what is under it (M11): in the block only when it says something.
place.set({ ref: 'gam_1_abc', look: null, opacity: 0.6, blend: 'multiply' });
const blended = Params.toPlacement(place.values);
ok('an opacity and a blend ride in the block', [blended.opacity, blended.blend], [0.6, 'multiply']);
place.restore(Params.fromPlacement(blended));
ok('and come back with it', [place.values.opacity, place.values.blend], [0.6, 'multiply']);
const plain = Params.toPlacement({ ...place.values, opacity: 1, blend: 'normal' });
ok('opacity 1 and a normal blend are no keys at all', ['opacity' in plain, 'blend' in plain], [false, false]);

// Each layer drawn with its opacity and blend, canvas's spelling; one with neither, as it always was.
const calls = [];
const fake = { canvas: { width: 100, height: 80 }, save() {}, restore() { calls.push('restore'); }, transform() {}, setTransform() {},
  clearRect() {}, fillRect() {}, set fillStyle(v) {}, set imageSmoothingEnabled(v) {}, set imageSmoothingQuality(v) {},
  set globalAlpha(v) { calls.push(['alpha', v]); }, set globalCompositeOperation(v) { calls.push(['op', v]); }, drawImage() { calls.push('draw'); } };
const rest = { x: 0, y: 0, scale: 1, rot: 0 }, sq = { width: 10, height: 10 };
Page.paintPage(fake, { ...sheet, ground: 'none' }, [{ image: {}, size: sq, transform: rest, opacity: 0.5, blend: 'plus-lighter' }, { image: {}, size: sq, transform: rest }], 0.1);
ok('a page draws each layer with its opacity and blend', calls,
  [['alpha', 0.5], ['op', 'lighter'], 'draw', 'restore', ['alpha', 1], ['op', 'source-over'], 'draw', 'restore']);
place.reset();
ok('a placement takes what core gives frames of, pages, maps and models too', place.spec('ref').accepts,
   ['still', 'sequence', 'shape', 'composition', 'map', 'model']);

// -- a composition's lineage -------------------------------------------------

const recipe = { page: page.values, place: ['gam_1', 'ckt_2', 'gam_1', null].map(ref => ({ ref })) };
ok('its parents are what it places, once each, bottom first', Params.parentsOf(recipe), ['gam_1', 'ckt_2']);
ok('an empty page is made from nothing', Params.parentsOf({ page: page.values, place: [] }), []);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
