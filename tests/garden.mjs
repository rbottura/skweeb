/**
 * tests/garden.mjs — run with: node tests/garden.mjs
 *
 * Covers the garden's genome (M14): apps/map/garden/modifiers.js — a
 * flower's marks through an ordered chain, each modifier on the parts of the
 * drawing's order it takes — and growth.js, when each mark comes as the
 * flower grows. What is easy to get wrong: the source's marks changed under
 * it, a part cut one mark off, a random draw that moves when another card is
 * added after it, a copy grown apart from its mark, a reorder that takes the
 * hand's rhythm with it.
 */

const { partsTaken, chosen, middleOf, applyChain, KINDS, CATALOGUE } = await import('../apps/map/garden/modifiers.js');
const { growthTimes, grownAt } = await import('../apps/map/garden/growth.js');
const { usesOf, USES } = await import('../core/uses.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(64), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};
const round = (v, k = 1000) => Math.round(v * k) / k;

/** Eight marks along a line, a hundred apart, one brush, drawn 100 ms apart. */
const mark = (i, more = {}) => ({ t: i * 100, x: 100 + i * 100, y: 200, rotation: 0, scale: 1, familyId: 'brushes', spriteIndex: 0, pattern: 'single', ...more });
const MARKS = Array.from({ length: 8 }, (_, i) => mark(i));
const one = (id, params = {}, on = true) => [{ id, params, on }];

// ── Parts ───────────────────────────────────────────────────────────────────
ok('which: numbers, a range, odd and even, all, or nothing named', [
  [...partsTaken('1 3', 4)], [...partsTaken('2-4', 4)], [...partsTaken('odd', 4)], [...partsTaken('even', 4)],
  partsTaken('', 4), partsTaken('all', 4), [...partsTaken('1,4', 4)]], [[1, 3], [2, 3, 4], [1, 3], [2, 4], null, null, [1, 4]]);
ok('…a part past the count names nothing', [...partsTaken('5', 4)], []);
ok('the first half of eight marks', chosen(8, { parts: 2, which: '1' }), [0, 1, 2, 3]);
ok('the first and third quarters', chosen(8, { parts: 4, which: '1 3' }), [0, 1, 4, 5]);
ok('the first and fourth quarters', chosen(8, { parts: 4, which: '1 4' }), [0, 1, 6, 7]);
ok('one part, whatever which says: every mark', chosen(5, { parts: 1, which: '2' }), [0, 1, 2, 3, 4]);
ok('thirds of seven marks: every mark in one, none twice', [1, 2, 3].map(k => chosen(7, { parts: 3, which: String(k) })), [[0, 1, 2], [3, 4], [5, 6]]);
ok('the middle of the marks\' box', middleOf(MARKS), { x: 450, y: 200 });

// ── The chain ───────────────────────────────────────────────────────────────
const before = JSON.stringify(MARKS);
applyChain(MARKS, [...one('size', { how: 'times', times: 3 }), ...one('mirror', {}), ...one('thin', {})], { seed: 7 });
ok('the source\'s marks are never changed', JSON.stringify(MARKS) === before, true);
ok('no chain: the marks as they were, copies', applyChain(MARKS, []), MARKS);
ok('a modifier switched off does nothing', applyChain(MARKS, one('size', { times: 3 }, false)), MARKS);
ok('a modifier no one knows does nothing', applyChain(MARKS, one('nonsense', {})), MARKS);
ok('the catalogue has every modifier, a label and a schema each', Object.values(CATALOGUE).every(c => c.label && c.params && KINDS[c.id]), true);

const sizes = applyChain(MARKS, one('size', { how: 'times', times: 2, parts: 2, which: '1' })).map(m => m.scale);
ok('size × 2, the first half only', sizes, [2, 2, 2, 2, 1, 1, 1, 1]);
ok('size + 0.5', applyChain(MARKS, one('size', { how: 'add', add: 0.5 }))[0].scale, 1.5);
ok('size grown along the order: 1 to 3', applyChain(MARKS.slice(0, 3), one('size', { how: 'ramp', times: 3 })).map(m => m.scale), [1, 2, 3]);

const turns = applyChain(MARKS.slice(0, 3), one('turn', { how: 'ramp', degrees: 90 })).map(m => round(m.rotation * 180 / Math.PI));
ok('a turn more and more along the order: 0, 45, 90', turns, [0, 45, 90]);

const images = applyChain(MARKS, one('image', { how: 'every', image: 3, every: 2, among: 2 })).map(m => m.spriteIndex);
ok('the image changed every two marks, among two from the third', images, [3, 3, 4, 4, 3, 3, 4, 4]);
ok('…kept within its family when its size is known', applyChain(MARKS.slice(0, 2), one('image', { how: 'shift', by: 5 }),
  { sizes: new Map([['brushes', 4]]) }).map(m => m.spriteIndex), [1, 1]);
ok('one image for the marks taken, the 3rd quarter', applyChain(MARKS, one('image', { how: 'one', image: 9, parts: 4, which: '3' })).map(m => m.spriteIndex), [0, 0, 0, 0, 9, 9, 0, 0]);

const spread = applyChain(MARKS, one('place', { how: 'spread', times: 2 })).map(m => m.x);
ok('spread × 2 from the middle (450)', spread, [-250, -50, 150, 350, 550, 750, 950, 1150]);
ok('moved', applyChain(MARKS.slice(0, 1), one('place', { how: 'move', dx: 10, dy: -5 })).map(m => [m.x, m.y]), [[110, 195]]);

const mirrored = applyChain(MARKS.slice(0, 2), one('mirror', { axis: 'x', how: 'copy' }));
ok('a mirrored copy: each mark, its mirror beside it', mirrored.map(m => m.x), [100, 200, 200, 100]);
ok('…its turn turned the other way, its time its mark\'s', applyChain([mark(0, { rotation: 0.5 }), mark(1)], one('mirror', {})).map(m => [round(m.rotation), m.t]),
  [[0.5, 0], [-0.5, 0], [0, 100], [-0, 100]]);
ok('turned over: no copy, each mark mirrored', applyChain(MARKS.slice(0, 2), one('mirror', { how: 'flip' })).map(m => m.x), [200, 100]);

const petals = applyChain([mark(0, { x: 100, y: 0 }), mark(1, { x: 0, y: 0 })], one('around', { count: 4, round: 'last', parts: 2, which: '1' }));
ok('copies around the last mark drawn: four in all, beside their mark', petals.map(m => [round(m.x), round(m.y)]),
  [[100, 0], [0, 100], [-100, 0], [0, -100], [0, 0]]);

ok('thin out: one in two', applyChain(MARKS, one('thin', { how: 'every', every: 2 })).map(m => m.x), [100, 300, 500, 700]);
ok('…in the second half only', applyChain(MARKS, one('thin', { how: 'every', every: 2, parts: 2, which: '2' })).length, 6);
ok('brush symmetry: the gamepad\'s pattern', applyChain(MARKS.slice(0, 1), one('symmetry', { pattern: 'quad' }))[0].pattern, 'quad');

const reversed = applyChain(MARKS.slice(0, 4), one('order', { how: 'reverse' }));
ok('reversed: the last drawn grows first', reversed.map(m => m.x), [400, 300, 200, 100]);
ok('…each place keeping its time: the hand\'s rhythm stays', reversed.map(m => m.t), [0, 100, 200, 300]);
ok('from the middle out', applyChain(MARKS.slice(0, 3), one('order', { how: 'outward' })).map(m => m.x), [200, 100, 300]);
ok('growth pace even: a drawing\'s pauses evened out', applyChain([mark(0, { t: 0 }), mark(1, { t: 900 }), mark(2, { t: 1000 })], one('pace', { how: 'even' })).map(m => m.t), [0, 500, 1000]);

// ── The seed ────────────────────────────────────────────────────────────────
const shaken = seed => applyChain(MARKS, one('place', { how: 'jitter', by: 50 }), { seed }).map(m => round(m.x));
ok('a random modifier: the same seed, the same flower', shaken(3), shaken(3));
ok('…another seed, another flower', JSON.stringify(shaken(3)) !== JSON.stringify(shaken(4)), true);
const first = applyChain(MARKS, one('order', { how: 'shuffle' }), { seed: 5 });
const after = applyChain(MARKS, [...one('order', { how: 'shuffle' }), ...one('size', { how: 'random' })], { seed: 5 });
ok('a card added after a random one leaves its draws as they were', after.map(m => m.x), first.map(m => m.x));
ok('a shuffle keeps every mark once', [...first.map(m => m.x)].sort((a, b) => a - b), MARKS.map(m => m.x));

// ── Growth ──────────────────────────────────────────────────────────────────
ok('growth times: the hand\'s rhythm, the whole in 2 s', growthTimes([mark(0, { t: 0 }), mark(1, { t: 300 }), mark(2, { t: 400 })], 2).map(v => round(v)), [0, 1.5, 2]);
ok('…one time for all: even', growthTimes([mark(0), mark(1, { t: 0 }), mark(2, { t: 0 })], 2), [0, 1, 2]);
ok('…a time that goes back is held', growthTimes([mark(0, { t: 0 }), mark(1, { t: 500 }), mark(2, { t: 200 }), mark(3, { t: 1000 })], 1), [0, 0.5, 0.5, 1]);
ok('grown at: the marks whose time is past', [-1, 0, 0.7, 1.5, 9].map(s => grownAt([0, 0.5, 1, 1.5], s)), [0, 1, 2, 4, 4]);

// ── The seeds to plant: a set offered to the garden ────────────────────────
ok('a use for it: the garden\'s flowers, the map\'s', USES.find(u => u.id === 'garden'), { id: 'garden', app: 'map', label: 'garden flowers', role: 'flowers' });
ok('a set made as flowers is offered to the garden by default', [...usesOf({ type: 'set', recipe: { role: 'flowers', members: [] }, tags: [] })], ['garden']);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
