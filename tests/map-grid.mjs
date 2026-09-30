/**
 * tests/map-grid.mjs — run with: node tests/map-grid.mjs
 *
 * Covers apps/map/grid.js: a map's grid. The promises — its size is its
 * tiles; a point is in the cell whose box holds it, and past the edge in
 * none; a cell's place in the list is row after row; a map that changes size
 * keeps each cell where it was.
 */

const { mapSize, cellAt, indexOf, resize } = await import('../apps/map/grid.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};

const m = { cols: 12, rows: 10, tile: 64 };
ok('a map is its tiles', mapSize(m), { width: 768, height: 640 });
ok('the top left point is in the first cell', cellAt(m, 0, 0), { col: 0, row: 0 });
ok('a cell holds its box, not the next one\'s edge', [cellAt(m, 63.9, 10), cellAt(m, 64, 10)], [{ col: 0, row: 0 }, { col: 1, row: 0 }]);
ok('the bottom right cell', cellAt(m, 767, 639), { col: 11, row: 9 });
ok('past the edge, no cell', [cellAt(m, 768, 0), cellAt(m, -1, 5), cellAt(m, 5, 640)], [null, null, null]);
ok('cells count row after row', indexOf(m, 3, 2), 27);

const cells = Array.from({ length: 6 }, (_, i) => i);          // 3 × 2: [0 1 2 / 3 4 5]
ok('grown, each cell where it was, the new ones empty', resize(cells, { cols: 3, rows: 2 }, { cols: 4, rows: 3 }),
   [0, 1, 2, -1, 3, 4, 5, -1, -1, -1, -1, -1]);
ok('shrunk, what falls off the edge is gone', resize(cells, { cols: 3, rows: 2 }, { cols: 2, rows: 1 }), [0, 1]);
ok('what is not a tile index is empty', resize([0, 'x', null, 2.5], { cols: 2, rows: 2 }, { cols: 2, rows: 2 }), [0, -1, -1, -1]);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
