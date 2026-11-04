/**
 * tests/graph-layout.mjs — run with: node tests/graph-layout.mjs
 *
 * Covers core/shell/layout.js: a smart object's states placed in its graph —
 * a line straight up, a branch in a column of its own, a merge above both of
 * its parents, v1 at the bottom.
 */

const { layout, W, H } = await import('../core/shell/layout.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(52), JSON.stringify(got), pass ? '' : '  expected ' + JSON.stringify(want));
};
const at = (pos, v) => { const p = pos.get(v); return [p.x, p.y]; };

{
  const pos = layout([{ version: 1, parent: null }, { version: 2, parent: 1 }, { version: 3, parent: 2 }]);
  ok('a line: one column, v1 at the bottom', [at(pos, 1)[0], at(pos, 2)[0], at(pos, 3)[0]], [0, 0, 0]);
  ok('…each above the one before it', at(pos, 3)[1] < at(pos, 2)[1] && at(pos, 2)[1] < at(pos, 1)[1], true);
}
{
  const pos = layout([{ version: 1, parent: null }, { version: 2, parent: 1 }, { version: 3, parent: 1 }, { version: 4, parent: 3, parent2: 2 }]);
  ok('a branch from v1: a column of its own, beside v2', [at(pos, 3)[0] > at(pos, 2)[0], at(pos, 3)[1] === at(pos, 2)[1]], [true, true]);
  ok('a merge: above both of its parents', at(pos, 4)[1] < at(pos, 2)[1] && at(pos, 4)[1] < at(pos, 3)[1], true);
  ok('…in the column of the state it was made from', at(pos, 4)[0], at(pos, 3)[0]);
  ok('cards a card apart', at(pos, 3)[0] >= W && at(pos, 1)[1] - at(pos, 2)[1] >= H, true);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
