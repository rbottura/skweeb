/**
 * tests/layers.mjs — run with: node tests/layers.mjs
 *
 * Covers core/layers.js and the `layers` type of core/params.js (L13): a
 * layer's box — particles' overlay's, so its saves draw as they did — whole,
 * filling, sized, moved, in a bleed, within a pixel of filling; the layers
 * found in a recipe, at its top or in a part; the format they fit; and the
 * param — coerced, each row by its declaration, one naming nothing dropped,
 * a layer that is on a parent of what is saved.
 */

const { layerBox, layersOf, holderOf, formatOf, across, layerOn, LAYER_PARAMS, LAYERS } = await import('../core/layers.js');
const { defineParams } = await import('../core/params.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(56), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};
const round = b => ({ x: Math.round(b.x * 100) / 100, y: Math.round(b.y * 100) / 100, w: Math.round(b.w * 100) / 100, h: Math.round(b.h * 100) / 100 });
const fmt = { width: 1080, height: 1527, bleed: 0, scale: 1 };
const L = over => ({ ...layerOn('imp_x'), ...over });

// ── Its box ─────────────────────────────────────────────────────────────────
ok('a sheet of the format fills it, to the pixel', layerBox(3508, 4961, L(), fmt), { x: 0, y: 0, w: 1080, h: 1527 });
ok('a square on A3, whole: as wide as it, centred', round(layerBox(500, 500, L(), fmt)), { x: 0, y: 223.5, w: 1080, h: 1080 });
ok('…filling it: as tall, what spills over cut', round(layerBox(500, 500, L({ fit: 'fill' }), fmt)), { x: -223.5, y: 0, w: 1527, h: 1527 });
ok('…half its size, moved 100 right and 50 up', round(layerBox(500, 500, L({ scale: 0.5, x: 100, y: -50 }), fmt)),
  { x: 370, y: 443.5, w: 540, h: 540 });
ok('in a bleed: the format inside it', round(layerBox(1080, 1527, L(), { ...fmt, bleed: 20 })), { x: 20, y: 20, w: 1080, h: 1527 });
ok('across: the format and its bleed both sides', across({ ...fmt, bleed: 20 }), 1120);

// ── Found in a recipe ───────────────────────────────────────────────────────
const on = L(), off = L({ ref: 'imp_y', on: false });
ok('at its top', layersOf({ yaw: 30, layers: [on, off] }).map(l => l.ref), ['imp_x']);
ok('in a part: particles\' picture, compose\'s page', layersOf({ emit: {}, picture: { layers: [on] } }).map(l => l.ref), ['imp_x']);
ok('none: none', [layersOf({ yaw: 30 }), layersOf(null)], [[], []]);
ok('the part that holds them', holderOf({ page: { width: 9, layers: [] }, place: [] }), { width: 9, layers: [] });

// ── The format they fit ─────────────────────────────────────────────────────
ok('a part with a format: its own', formatOf({ width: 1080, height: 1080, bleed: 12.4, scale: 2 }), { width: 1080, height: 1080, bleed: 12, scale: 2 });
ok('with none: the picture\'s own size', formatOf({ source: 'x' }, { width: 520, height: 907 }), { width: 520, height: 907, bleed: 0, scale: 1 });
ok('…or nothing to fit', formatOf({}), null);

// ── The param ───────────────────────────────────────────────────────────────
const p = defineParams('layered', { width: { type: 'int', min: 1, max: 9999, default: 1080 }, layers: LAYERS });
ok('none to begin with', p.get('layers'), []);
p.set('layers', [{ ref: 'imp_a', opacity: 3, blend: 'nonsense', scale: 0 }, { at: 'front' }, null, { ref: 'imp_b', on: false, at: 'behind' }]);
const got = p.get('layers');
ok('coerced: one naming nothing dropped', got.map(l => l.ref), ['imp_a', 'imp_b']);
ok('…each row by its declaration', [got[0].opacity, got[0].blend, got[0].scale, got[0].fit, got[1].on, got[1].at], [1, 'normal', 0.05, 'whole', false, 'behind']);
ok('…every row there', Object.keys(got[0]).sort(), ['ref', 'on', ...Object.keys(LAYER_PARAMS)].sort());
ok('a layer that is on is a parent of what is saved, one off is not', p.consumedObjectIds(), ['imp_a']);
ok('a new one: in front, whole, as it is', layerOn('imp_c'), { ref: 'imp_c', on: true, at: 'front', fit: 'whole', scale: 1, x: 0, y: 0, rot: 0, opacity: 1, blend: 'normal' });
p.restore({ width: 500 });
ok('a recipe from before layers: none', p.get('layers'), []);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
