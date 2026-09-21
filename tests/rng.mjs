/**
 * tests/rng.mjs — run with: node tests/rng.mjs
 *
 * rng.js exists so a render can be rebuilt, which means the only property that
 * really matters is the boring one: the same seed gives the same sequence,
 * here and on another machine a year from now. That is what most of this pins.
 *
 * The distribution checks are deliberately loose. They are not here to prove
 * the generator is good — mulberry32's quality is not this project's problem —
 * but to catch the ways a hand-rolled PRNG fails loudly: a stuck state, a
 * value out of [0,1), an int() that can return n, a shuffle that drops or
 * duplicates members.
 */

const { makeRng, seedFrom } = await import('../core/rng.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(46), JSON.stringify(got),
    pass ? '' : '  expected ' + JSON.stringify(want));
};

const take = (rng, n) => Array.from({ length: n }, () => rng());

// ── Reproducibility ──────────────────────────────────────────────────────────

ok('same seed, same sequence',
   take(makeRng(19387), 5), take(makeRng(19387), 5));
ok('different seeds diverge',
   take(makeRng(1), 3).join() === take(makeRng(2), 3).join(), false);
ok('a string seeds it too',
   take(makeRng('gam_123'), 3), take(makeRng('gam_123'), 3));
ok('seedFrom is stable', seedFrom('gam_123'), seedFrom('gam_123'));
ok('seedFrom separates near-identical strings',
   seedFrom('deg1') === seedFrom('deg2'), false);
ok('a number seed is its own seed', makeRng(19387).seed, 19387);
ok('seed 0 is not a dead state', take(makeRng(0), 3).every(v => v > 0 && v < 1), true);

// The literal first draws for two fixed seeds. These are the checks that make
// an algorithm change loud: touch mulberry32 and every recipe that recorded a
// seed silently renders something else. Comparing two fresh generators would
// pass through any such change, so the numbers are written out.
ok('seed 19387 draws its known values',
   take(makeRng(19387), 3).map(v => Math.round(v * 1e9)),
   [882460041, 841911055, 302099688]);
ok('seed 1 draws its known values',
   take(makeRng(1), 4).map(v => Math.round(v * 1e6)),
   [627074, 2736, 527447, 981051]);
ok('a string seed draws its known values',
   take(makeRng('gam_123'), 2).map(v => Math.round(v * 1e6)),
   [46538, 485363]);

// ── Range ────────────────────────────────────────────────────────────────────

const many = take(makeRng(7), 3000);
ok('never below 0', many.every(v => v >= 0), true);
ok('never reaches 1', many.every(v => v < 1), true);
ok('not stuck on one value', new Set(many).size > 2900, true);

const mean = many.reduce((a, b) => a + b, 0) / many.length;
ok('mean is near a half', mean > 0.45 && mean < 0.55, true);

// ── int ──────────────────────────────────────────────────────────────────────

const ints = Array.from({ length: 3000 }, (() => { const r = makeRng(11); return () => r.int(6); })());
ok('int stays under n', ints.every(v => v >= 0 && v < 6), true);
ok('int is a whole number', ints.every(Number.isInteger), true);
ok('int covers every value', new Set(ints).size, 6);
ok('int(0) is 0, not NaN', makeRng(3).int(0), 0);
ok('int(-1) is 0, not negative', makeRng(3).int(-1), 0);

// ── range, pick, shuffle ─────────────────────────────────────────────────────

const r = makeRng(5);
const spans = Array.from({ length: 500 }, () => r.range(10, 20));
ok('range stays inside', spans.every(v => v >= 10 && v < 20), true);

ok('pick returns a member',
   ['a', 'b', 'c'].includes(makeRng(9).pick(['a', 'b', 'c'])), true);
ok('pick of empty is undefined', makeRng(9).pick([]), undefined);
ok('pick of nothing does not throw', makeRng(9).pick(undefined), undefined);

const source = [1, 2, 3, 4, 5, 6, 7, 8];
const shuffled = makeRng(4).shuffle(source);
ok('shuffle keeps every member', shuffled.slice().sort((a, b) => a - b), source);
ok('shuffle leaves the input alone', source, [1, 2, 3, 4, 5, 6, 7, 8]);
ok('shuffle actually moves things', shuffled.join() === source.join(), false);
ok('shuffle repeats for a seed',
   makeRng(4).shuffle(source), makeRng(4).shuffle(source));
ok('shuffle of empty is empty', makeRng(4).shuffle([]), []);

// ── fork ─────────────────────────────────────────────────────────────────────
// A subsystem drawing a different number of values must not shift the main
// stream. That is the whole point of a fork, and the failure it prevents is
// nasty: adding one draw somewhere re-rolls an entire composition.

const main = makeRng(42);
const a1 = main.fork('dither');
const a2 = main.fork('dither');
ok('the same fork name is the same stream', take(a1, 3), take(a2, 3));
ok('different names differ',
   take(makeRng(42).fork('a'), 3).join() === take(makeRng(42).fork('b'), 3).join(), false);
ok('forking does not consume the parent',
   take(makeRng(42), 3), take(makeRng(42), 3));

const parent = makeRng(42);
parent.fork('x')();
parent.fork('y')();
ok('draws from a fork leave the parent untouched',
   take(parent, 3), take(makeRng(42), 3));

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
