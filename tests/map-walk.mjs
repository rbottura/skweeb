/**
 * tests/map-walk.mjs — run with: node tests/map-walk.mjs
 *
 * Covers apps/map/walk.js, and what a map is made of (save.js `partsOf`).
 * The promises — a cell can be walked unless it is off the map, a wall, or
 * under a solid thing's feet, asked as the avatar will ask before each step;
 * a solid thing's feet are its own cell, and on its row the cells its width
 * covers more than half of; a map saved before walls is walkable all over;
 * walls keep their cells when a map changes size, the new ones walkable; the
 * spawn is the first thing that says so, facing its way, or the middle
 * facing down; through a warp the avatar arrives on the warp back, or at the
 * spawn; a map's parts are its things and what its signs show.
 */

const { walkable, walkGrid, blockedBy, spawnOf, arrival, FACES } = await import('../apps/map/walk.js');
const { resize } = await import('../apps/map/grid.js');
const { partsOf } = await import('../apps/map/save.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};

const map = { cols: 4, rows: 3, tile: 64 };
const walls = [0, 1, 0, 0,
               0, 0, 0, 0,
               0, 0, 0, 1];
const recipe = { map, cells: [], walls, place: [] };

ok('an open cell can be walked', walkable(recipe, 0, 0), true);
ok('a wall cannot', [walkable(recipe, 1, 0), walkable(recipe, 3, 2)], [false, false]);
ok('off the map, nothing can', [walkable(recipe, -1, 0), walkable(recipe, 4, 0), walkable(recipe, 0, 3), walkable(recipe, 0.5, 0)],
   [false, false, false, false]);
ok('saved before walls, walkable all over', walkGrid({ map, cells: [] }).every(Boolean), true);

ok('a thing that is not solid blocks nothing', blockedBy({ col: 2, row: 1, width: 3 }), []);
const feet = w => blockedBy({ col: 5, row: 1, width: w, solid: true }).map(c => c.col);
ok('solid, one or two wide: its own cell', [feet(1), feet(2), feet(0.5)], [[5], [5], [5]]);
ok('three or four wide: a cell either side too', [feet(3), feet(4)], [[4, 5, 6], [4, 5, 6]]);
ok('five wide: two either side', feet(5), [3, 4, 5, 6, 7]);

const table = { ...recipe, place: [{ ref: 'x', col: 1, row: 1, width: 3, solid: true }, { ref: 'y', col: 3, row: 1, width: 1 }] };
ok('a solid table stops the avatar along its length', [0, 1, 2].map(c => walkable(table, c, 1)), [false, false, false]);
ok('but not on the cells it rises over', [walkable(table, 0, 0), walkable(table, 2, 0)], [true, true]);
ok('a thing that is not solid can be walked through', walkable(table, 3, 1), true);
ok('the grid agrees with the cell asked, everywhere', walkGrid(table).every((v, i) => v === walkable(table, i % 4, Math.floor(i / 4))), true);
ok('a solid thing past the edge blocks only what is on the map', walkGrid({ map, place: [{ col: 0, row: 0, width: 3, solid: true }] })
  .slice(0, 4), [false, false, true, true]);

ok('walls grown keep their cells, the new ones walkable', resize(walls, { cols: 4, rows: 3 }, { cols: 5, rows: 3 }, 0),
   [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]);

ok('no spawn: the middle, facing down', spawnOf(recipe), { col: 2, row: 1, face: 'down', from: null });
const spawns = { ...recipe, place: [{ ref: 'x', col: 0, row: 0 }, { col: 3, row: 2, event: 'spawn', face: 'left' },
                                    { col: 1, row: 1, event: 'spawn', face: 'up' }] };
ok('the first thing that is the spawn, facing its way', spawnOf(spawns), { col: 3, row: 2, face: 'left', from: 1 });
ok('a face it does not know is down', spawnOf({ map, place: [{ col: 0, row: 0, event: 'spawn', face: 'sideways' }] }).face, 'down');
ok('a spawn past the edge of a map made smaller stays on it', spawnOf({ map, place: [{ col: 9, row: 9, event: 'spawn' }] }),
   { col: 3, row: 2, face: 'down', from: 0 });
ok('the ways it can face', FACES, ['down', 'up', 'left', 'right']);

const hall = { map, place: [{ col: 0, row: 0, event: 'spawn', face: 'right' }, { col: 3, row: 2, event: 'warp', to: 'the kitchen' },
                            { ref: 'door', col: 2, row: 0, event: 'warp', to: 'a room' }] };
ok('through a warp, it arrives on the warp back, facing out', arrival(hall, 'a room'), { col: 2, row: 0, face: 'down', by: 2 });
ok('from a map with no warp back, at the spawn', arrival(hall, 'the garden'), { col: 0, row: 0, face: 'right', by: null });
ok('with no map left, at the spawn', arrival(hall, null).by, null);

// The avatar's steps (P4): ahead, the way it faces, what answers, the shortest way.
const { ahead, faceTo, answeringAt, warpAt, pathTo } = await import('../apps/map/walk.js');
ok('the cell ahead, each way', FACES.map(f => ahead({ col: 1, row: 1 }, f)),
   [{ col: 1, row: 2 }, { col: 1, row: 0 }, { col: 0, row: 1 }, { col: 2, row: 1 }]);
ok('the way a cell is from another, a tie the column\'s', [faceTo({ col: 1, row: 1 }, { col: 1, row: 3 }), faceTo({ col: 1, row: 1 }, { col: 0, row: 1 }),
  faceTo({ col: 1, row: 1 }, { col: 2, row: 2 })], ['down', 'left', 'right']);
const signed = { map, walls, place: [{ ref: 'p', col: 2, row: 0, event: 'sign', says: 'hi' }, { col: 0, row: 2, event: 'warp', to: 'out' },
                                     { ref: 'w', col: 2, row: 2, width: 3, event: 'sign' }] };
ok('what answers on a cell: a sign there, a warp there, a wide sign across its width', [answeringAt(signed, 2, 0)?.says,
  answeringAt(signed, 0, 2)?.to, answeringAt(signed, 3, 2)?.ref, answeringAt(signed, 0, 0)], ['hi', 'out', 'w', null]);
ok('an effect answers on its cell too, faced and used (M15g)',
   answeringAt({ map, walls, place: [{ col: 1, row: 1, event: 'effect', plays: 'burst' }] }, 1, 1)?.plays, 'burst');
ok('the warp a step onto a cell goes through — not a sign', [warpAt(signed, 0, 2)?.to, warpAt(signed, 2, 0)], ['out', null]);
ok('the shortest way round a wall, the same way every time', pathTo(recipe, { col: 0, row: 0 }, { col: 2, row: 0 }),
   [{ col: 0, row: 1 }, { col: 1, row: 1 }, { col: 2, row: 1 }, { col: 2, row: 0 }]);
ok('…there already: no step; to a wall, or off the map: no way', [pathTo(recipe, { col: 2, row: 1 }, { col: 2, row: 1 }),
  pathTo(recipe, { col: 0, row: 0 }, { col: 1, row: 0 }), pathTo(recipe, { col: 0, row: 0 }, { col: 9, row: 0 })], [[], null, null]);
const shut = { map, walls: [0, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0] };
ok('…shut in, no way out', pathTo(shut, { col: 0, row: 0 }, { col: 3, row: 2 }), null);
const door = { map, walls: [0, 0, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0], place: [{ col: 3, row: 1, event: 'warp', to: 'a room' }] };
ok('…a warp on the way is gone round, or there is no way', pathTo(door, { col: 0, row: 0 }, { col: 0, row: 2 }), null);
ok('…and one at the end is gone through', pathTo(door, { col: 0, row: 0 }, { col: 3, row: 1 }).at(-1), { col: 3, row: 1 });

ok('a map is made of its things and what its signs show', partsOf([
  { ref: 'a', event: 'sign', shows: 'b' }, { ref: 'a' }, { ref: null, event: 'warp', to: 'hall', shows: 'c' },
  { ref: null, event: 'sign', shows: 'd' }]), ['a', 'b', 'd']);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
