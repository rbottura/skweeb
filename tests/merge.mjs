/**
 * tests/merge.mjs — run with: node tests/merge.mjs
 *
 * Covers core/shell/merge.js: two states' base, the nearest one both came
 * from; a merge's plan — taken where only the arriving state changed, kept
 * where only the receiving one did, a conflict the receiving one's until
 * picked — and the values it makes.
 */

const { ancestors, mergeBase, plan, merged } = await import('../core/shell/merge.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(56), JSON.stringify(got), pass ? '' : '  expected ' + JSON.stringify(want));
};

// v1 ─ v2 ─ v4 (a merge of v3 into v2) ; v1 ─ v3
const states = [{ version: 1, parent: null }, { version: 2, parent: 1 }, { version: 3, parent: 1 }, { version: 4, parent: 2, parent2: 3 }];
ok('a state comes from itself and its parents, a merge from both', [...ancestors(states, 4)].sort(), [1, 2, 3, 4]);
ok('two branches meet where they parted', mergeBase(states, 2, 3), 1);
ok('a state and one it came from: that one', mergeBase(states, 4, 3), 3);

const base = { rate: 90, speed: 140, spread: 36 };
const recv = { rate: 90, speed: 300, spread: 50 };       // the receiving one changed speed, and spread
const inc = { rate: 150, speed: 140, spread: 20 };        // the arriving one changed rate, and spread
const rows = plan([{ id: 'emit', keys: ['rate', 'speed', 'spread'], recv, inc, base }]);
ok('only the values they differ in', rows.map(r => r.key), ['rate', 'speed', 'spread']);
ok('…what only the arriving one changed is taken', [rows[0].kind, rows[0].take], ['incoming', true]);
ok('…what only the receiving one changed is kept', [rows[1].kind, rows[1].take], ['receiving', false]);
ok('…a conflict keeps the receiving one until picked', [rows[2].kind, rows[2].take], ['both', false]);
ok('merged: the receiving values, with what is taken', merged(recv, rows, 'emit'), { rate: 150, speed: 300, spread: 50 });
rows[2].take = true;
ok('…a conflict picked, the arriving one\'s', merged(recv, rows, 'emit').spread, 20);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
