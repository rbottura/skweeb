/**
 * tests/rig-motion.mjs — run with: node tests/rig-motion.mjs
 *
 * Covers apps/rig/motion.js, bones that move by themselves. The promises —
 * a wave swings its bone as far as asked either way, and back; whole cycles
 * close the loop, frame `length` being frame 0 to the bit; a phase starts it
 * later; a wave adds to the pose; one that follows passes down its chain,
 * each bone a lag later, and never into another chain; nothing moves with
 * no swing.
 */

const { waveAt, turnsAt, chainBelow, moves, isStill } = await import('../apps/rig/motion.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const close = (a, b, e = 1e-9) => Math.abs(a - b) < e;
const deg = r => Math.round((r * 180) / Math.PI * 1e6) / 1e6;

const w = { swing: 30, cycles: 1, phase: 0 };
ok('a wave starts at its phase', deg(waveAt(w, 0, 60)), 0);
ok('a quarter through, as far as it swings', deg(waveAt(w, 15, 60)), 30);
ok('three quarters, as far the other way', deg(waveAt(w, 45, 60)), -30);
ok('whole cycles close the loop, to the bit', [waveAt({ ...w, phase: 37 }, 60, 60) === waveAt({ ...w, phase: 37 }, 0, 60),
  waveAt({ ...w, cycles: 3 }, 120, 60) === waveAt({ ...w, cycles: 3 }, 0, 60)], [true, true]);
ok('two cycles a loop, as far again by halfway', close(waveAt({ ...w, cycles: 2 }, 30, 60), waveAt({ ...w, cycles: 2 }, 0, 60)), true);
ok('a phase of 90 starts it at its swing', deg(waveAt({ ...w, phase: 90 }, 0, 60)), 30);
ok('no swing, no turn — and still', [waveAt({ swing: 0 }, 10, 60), isStill(null), isStill({ swing: 0 }), isStill(w)], [0, true, true, false]);

// Two chains: a stalk of three bones (stroke 1) on a body (stroke 0).
const bones = [
  { id: 0, stroke: 0, parent: null, from: 0 },
  { id: 1, stroke: 1, parent: 0, from: 0 }, { id: 2, stroke: 1, parent: 1, from: 30 }, { id: 3, stroke: 1, parent: 2, from: 60 },
];
ok('the bones below one in its chain, nearest first', chainBelow(bones, bones[1]).map(b => b.id), [2, 3]);
ok('a wave adds to the pose', turnsAt(bones, [0, 0.5], [null, w], 15, 60).map(deg), [0, deg(0.5 + Math.PI / 6), 0, 0]);
const whip = turnsAt(bones, [], [null, { ...w, follow: true, lag: 90 }], 15, 60).map(deg);
ok('one that follows passes down its chain, a lag a step', whip, [0, 30, 0, -30]);
ok('and never into another chain', turnsAt(bones, [], [{ ...w, follow: true, lag: 45 }], 15, 60).map(deg), [30, 0, 0, 0]);
ok('a bone with a wave of its own adds it to what follows', turnsAt(bones, [], [null, { ...w, follow: true, lag: 0 }, { ...w }], 15, 60)
  .map(deg), [0, 30, 60, 30]);
ok('anything moves only with a swing somewhere', [moves(bones, []), moves(bones, [null, { swing: 0 }]), moves(bones, [null, w])],
   [false, false, true]);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
