/**
 * tests/map-play.mjs — run with: node tests/map-play.mjs
 *
 * Covers apps/map/play/maps.js, what the player asks of a map. The promises —
 * only a sign and a warp answer when used; a sign shows another object, or
 * the thing itself, and its words; a warp's map is the latest map of its
 * name, never another type of object so called, and none when there is none.
 */

const { answers, signOf, latestMap } = await import('../apps/map/play/maps.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};

ok('a sign and a warp answer', [answers({ event: 'sign' }), answers({ event: 'warp', to: 'hall' })], [true, true]);
ok('nothing else does: none, the spawn, an old block, nothing',
   [answers({ event: 'none' }), answers({ event: 'spawn' }), answers({ ref: 'x', col: 0, row: 0 }), answers(null)],
   [false, false, false, false]);

ok('a sign shows what it names, with its words', signOf({ ref: 'poster', event: 'sign', shows: 'big', says: 'hi' }),
   { picture: 'big', says: 'hi' });
ok('naming nothing, it shows the thing itself', signOf({ ref: 'poster', event: 'sign', shows: null }), { picture: 'poster', says: '' });
ok('a mark\'s sign shows its words alone', signOf({ ref: null, event: 'sign', says: 'a note' }), { picture: null, says: 'a note' });

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
