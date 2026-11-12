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

Steps.forTests();
{
  const a = fresh('a'), b = fresh('b');
  a.set('rate', 10); later();
  b.set('rate', 20); later();
  a.set('rate', 30); later();
  Steps.unwatch(a);
  ok('unwatched: its steps gone, the others kept', Steps.counts().back, 1);
  a.set('rate', 40); later();
  ok('…and its changes no more steps', Steps.counts().back, 1);
  Steps.undo();
  ok('…a step back, in the params still watched', [a.get('rate'), b.get('rate')], [40, 90]);
  ok('…watched no more', Steps.watched().includes(a), false);
}

// Listed, as cluster's History has them (S9f): what each changed, taken or gone back over; gone to by its place.
Steps.forTests();
{
  const p = fresh('listed');
  let heard = 0;
  const off = Steps.onSteps(() => heard++);
  p.set('rate', 100); later();
  p.set('rate', 110); later();
  p.set('seed', 7); later();
  Steps.settle();
  ok('the steps listed, oldest first, what each changed', Steps.list().map(s => s.label), ['rate 90 → 100', 'rate 100 → 110', 'seed 1 → 7']);
  Steps.go(0);
  ok('gone to the first: every step after it gone back over', [both(p), Steps.list().map(s => s.ahead)], [[100, 1], [false, true, true]]);
  Steps.go(2);
  ok('…and on to the last again', both(p), [110, 7]);
  Steps.go(-1);
  ok('…and before any: where they started', both(p), [90, 1]);
  ok('…each change of them heard', heard > 5, true);
  off();
}

// A list the recipe holds beyond its params (L12b): held as a params is, laid back with them in one step.
Steps.forTests();
{
  const p = fresh('model');
  let shapes = [{ id: 'cloud', params: { count: 600 } }];
  let put = 0;
  const release = Steps.holdList('shapes', { get: () => shapes, put: list => { shapes = list; put++; }, label: 'the shapes' });
  const [list] = Steps.heldLists();
  ok('a list held: its values under its key, a copy', [list.key, list.values], ['shapes', { shapes: [{ id: 'cloud', params: { count: 600 } }] }]);
  list.values.shapes[0].params.count = 1;
  ok('…which changes nothing of it', shapes[0].params.count, 600);
  p.set('rate', 120); later();
  Steps.settle();
  const v1 = [{ id: 'cloud', params: { count: 500 } }, { id: 'cloud', params: { count: 300 } }];
  Steps.aroundAll([p, list], () => { p.restore({ rate: 400, seed: 3 }); list.restore({ shapes: v1 }); }, 'back to v1');
  ok('a state gone back to, its params and its list: one step', [Steps.counts().back, both(p), shapes.length], [2, [400, 3], 2]);
  ok('…named as it was given', Steps.list().map(s => s.label)[1], 'back to v1');
  Steps.undo();
  ok('…a Ctrl Z the page before it, whole', [both(p), shapes.map(s => s.params.count)], [[120, 1], [600]]);
  Steps.redo();
  ok('…and a Ctrl Y the state again', [both(p), shapes.map(s => s.params.count)], [[400, 3], [500, 300]]);
  Steps.aroundAll([p, list], () => {}, 'nothing');
  ok('nothing changed at once: no step', Steps.counts().back, 2);
  ok('a list is never watched', Steps.watched().includes(list), false);
  release();
  ok('let go of: no list held, and its share of a step gone with it', [Steps.heldLists().length, Steps.counts().back], [0, 2]);
  Steps.undo();
  ok('…the step left the params\'', [both(p), shapes.length, put], [[120, 1], 2, 3]);
}

// Where a card's values are in a recipe: as it says, when told (L12b); undefined otherwise, to be searched for.
Steps.forTests();
{
  const p = fresh('card');
  ok('nothing told: undefined', Steps.findPart(p, { rate: 1 }), undefined);
  Steps.partIn(p, recipe => (recipe.shapes || [])[1]?.params ?? null);
  ok('told: its entry\'s values', Steps.findPart(p, { shapes: [{ params: { rate: 1 } }, { params: { rate: 2 } }] }), { rate: 2 });
  ok('…or null where a state has none', Steps.findPart(p, { shapes: [] }), null);
}

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
