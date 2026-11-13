/**
 * tests/map-play.mjs — run with: node tests/map-play.mjs
 *
 * Covers apps/map/play/maps.js, what the player asks of a map. The promises —
 * only a sign and a warp answer when used; a sign shows another object, or
 * the thing itself, and its words; a warp's map is the latest map of its
 * name, never another type of object so called, and none when there is none.
 */

const { answers, signOf, latestMap, effectOf, effectFrame, effectBox } = await import('../apps/map/play/maps.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};

ok('a sign, a warp and an effect answer', [answers({ event: 'sign' }), answers({ event: 'warp', to: 'hall' }), answers({ event: 'effect' })], [true, true, true]);
ok('nothing else does: none, the spawn, an old block, nothing',
   [answers({ event: 'none' }), answers({ event: 'spawn' }), answers({ ref: 'x', col: 0, row: 0 }), answers(null)],
   [false, false, false, false]);

ok('a sign shows what it names, with its words', signOf({ ref: 'poster', event: 'sign', shows: 'big', says: 'hi' }),
   { picture: 'big', says: 'hi' });
ok('naming nothing, it shows the thing itself', signOf({ ref: 'poster', event: 'sign', shows: null }), { picture: 'poster', says: '' });
ok('a mark\'s sign shows its words alone', signOf({ ref: null, event: 'sign', says: 'a note' }), { picture: null, says: 'a note' });

// -- An effect: an object's frames, once, at its cell (M15g) ---------------------

ok('an effect plays what it names, centred on its cell', effectOf({ ref: 'barrel', col: 2, row: 3, event: 'effect', plays: 'burst', over: 2 }),
   { plays: 'burst', col: 2, row: 3, over: 2 });
ok('told no width, three tiles; naming nothing, nothing to play', effectOf({ col: 0, row: 0, event: 'effect' }), { plays: null, col: 0, row: 0, over: 3 });
ok('no other block is one', [effectOf({ event: 'sign', plays: 'x' }), effectOf(null)], [null, null]);
ok('thirty frames at thirty a second: the first, the middle, the last', [effectFrame(0, 30, 30), effectFrame(500, 30, 30), effectFrame(999, 30, 30)], [0, 15, 29]);
ok('once: after its last frame, over — a loop too', [effectFrame(1000, 30, 30), effectFrame(5000, 30, 30)], [-1, -1]);
ok('not before it began', effectFrame(-1, 30, 30), -1);
ok('no rate named, twenty-four a second', [effectFrame(999, 0, 48), effectFrame(1999, undefined, 48), effectFrame(2000, 0, 48)], [23, 47, -1]);
ok('a still is held half a second, a flash', [effectFrame(0, 0, 1), effectFrame(499, 0, 1), effectFrame(500, 0, 1)], [0, 0, -1]);
ok('drawn centred on its cell, as wide as told, its height its shape',
   effectBox({ col: 2, row: 3, over: 2 }, { width: 200, height: 100 }, 64), { x: 96, y: 192, w: 128, h: 64 });
ok('of no known shape, a square', effectBox({ col: 0, row: 0, over: 1 }, null, 64), { x: 0, y: 0, w: 64, h: 64 });

const index = [
  { id: 'map_1', type: 'map', title: 'the hall', created: '2026-10-01T10:00:00.000Z' },
  { id: 'map_3', type: 'map', title: 'the hall', created: '2026-10-02T09:00:00.000Z' },
  { id: 'map_2', type: 'map', title: 'a room', created: '2026-10-02T12:00:00.000Z' },
  { id: 'stl_1', type: 'still', title: 'the hall', created: '2026-10-03T00:00:00.000Z' },
];
ok('a warp leads to the latest map of its name', latestMap(index, 'the hall').id, 'map_3');
ok('never to something else so called', latestMap([index[3]], 'the hall'), null);
ok('a name no map has, nowhere', [latestMap(index, 'the garden'), latestMap(null, 'a room')], [null, null]);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
