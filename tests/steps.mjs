/**
 * tests/steps.mjs — run with: node tests/steps.mjs
 *
 * Covers core/steps.js, the session's steps (S6c): a change a step, a burst
 * one, back and on, a new change forgetting the steps on, a recipe arriving
 * no step but where they start from, a Reset one, and two params' steps in
 * the order they were taken. On a clock of its own, so a burst is exact.
 */

const { defineParams } = await import('../core/params.js');
const Steps = await import('../core/steps.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(56), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

let t = 0;
const later = (ms = 1000) => { t += ms; };
const fresh = (app = 'steps') => {
  const p = defineParams(app, {
    rate: { type: 'int', min: 0, max: 1000, default: 90 },
    seed: { type: 'int', min: 0, max: 99999, default: 1 },
  });
  Steps.watch(p);
  return p;
};
const both = p => [p.get('rate'), p.get('seed')];

Steps.forTests({ now: () => t });
{
  const p = fresh();
  p.set('rate', 120); later();
  p.set('rate', 150); later();
  ok('two changes apart: two steps', Steps.counts().back, 2);
  Steps.undo();
  ok('a step back: the value before', p.get('rate'), 120);
  Steps.undo();
  ok('and another: where it began', p.get('rate'), 90);
  ok('nothing further back', Steps.undo(), false);
  Steps.redo();
  ok('a step on again', p.get('rate'), 120);
  later();
  p.set('seed', 7);
  ok('a new change forgets the steps on', [Steps.counts().ahead, Steps.redo()], [0, false]);
}

Steps.forTests();
{
  const p = fresh();
  for (const r of [100, 110, 120, 130]) { p.set('rate', r); later(40); }   // a drag: every 40 ms
  later();
  ok('a drag is one step, however long', Steps.counts().back, 1);
  Steps.undo();
  ok('…gone back over at once', p.get('rate'), 90);
}

Steps.forTests();
{
  const p = fresh();
  p.restore({ rate: 400, seed: 3 });
  ok('a recipe arriving is no step', [Steps.counts().back, both(p)], [0, [400, 3]]);
  later();
  p.set('rate', 500); later();
  Steps.undo();
  ok('…but where the steps start from', both(p), [400, 3]);
}

Steps.forTests();
{
  const p = fresh();
  p.set('rate', 333); later();
  Steps.around(p, () => p.reset());
  ok('a Reset is one step', [both(p), Steps.counts().back], [[90, 1], 2]);
  Steps.undo();
  ok('…gone back over, the values before it', both(p), [333, 1]);
}

Steps.forTests();
{
  const a = fresh('a'), b = fresh('b');
  a.set('rate', 10); later();
  b.set('seed', 20); later();
  a.set('seed', 30); later();
  Steps.undo();
  ok("two params' steps, the last first", [both(a), both(b)], [[10, 1], [90, 20]]);
  Steps.undo();
  ok('…then the one before it, in the other', [both(a), both(b)], [[10, 1], [90, 1]]);
  Steps.undo();
  ok('…then the first', both(a), [90, 1]);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
