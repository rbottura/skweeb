/**
 * tests/map-things.mjs — run with: node tests/map-things.mjs
 *
 * Covers apps/map/things.js, what stands on a map. The promises — a thing
 * stands with its feet at its cell's bottom middle, `width` tiles wide, its
 * height its own shape's, rising over the cells above; things are drawn
 * back to front by the row they stand on, then as they were placed; a press
 * lands on the nearest thing whose box holds it.
 */

const { boxOf, drawOrder, thingAt, newBlock } = await import('../apps/map/things.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};

ok('a new thing is one tile wide, on its cell', newBlock('shp_1', 3, 4), { ref: 'shp_1', col: 3, row: 4, width: 1 });
const tall = { width: 100, height: 200 };
ok('feet at the cell\'s bottom middle, as tall as its shape', boxOf({ col: 2, row: 3, width: 1 }, tall, 64), { x: 128, y: 128, w: 64, h: 128 });
ok('two tiles wide, it rises two tiles more', boxOf({ col: 2, row: 3, width: 2 }, tall, 64), { x: 96, y: 0, w: 128, h: 256 });
ok('a thing not open yet is a tile square', boxOf({ col: 0, row: 0, width: 1 }, null, 64), { x: 0, y: 0, w: 64, h: 64 });

const at = (row, col = 0) => ({ block: { col, row, width: 1 }, size: { width: 1, height: 1 } });
const items = [at(3), at(1), at(3), at(2)];
ok('back to front by row, then as they were placed', drawOrder(items).map(p => items.indexOf(p)), [1, 3, 0, 2]);

const behind = { block: { col: 1, row: 1, width: 2 }, size: { width: 1, height: 1 }, name: 'behind' };
const front = { block: { col: 1, row: 2, width: 2 }, size: { width: 1, height: 1 }, name: 'front' };
// behind: x 32–160, y -0–128; front: x 32–160, y 64–192. They share y 64–128.
ok('a press where two overlap lands on the nearer', thingAt([front, behind], 100, 100, 64).name, 'front');
ok('where only the one behind is, on it', thingAt([front, behind], 100, 40, 64).name, 'behind');
ok('on nothing, nothing', thingAt([front, behind], 300, 300, 64), null);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
