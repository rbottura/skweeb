/**
 * tests/fractal-motion.mjs — run with: node tests/fractal-motion.mjs
 *
 * Covers apps/fractals/motion.js: a copies param swung over a loop. The
 * promises — a still is its values at every tick; there and back reaches
 * `to` halfway and comes back, eased at both ends; once through runs from
 * `from` to `to`; the loop closes on itself, any tick drawn on its own; and
 * a param picked to move starts from a range round its value now.
 */

const { valuesAt, loopOf, rangeAround, MOTION_PARAMS, MOVABLE } = await import('../apps/fractals/motion.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 70),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 70));
};
const r6 = x => +x.toFixed(6);
const sway = { family: 'copies', move: 'twist', twist: 3, ratio: 0.68, from: -10, to: 10, wave: 'back', ease: 'inOutSine', frames: 48 };

ok('a still is one frame', loopOf({ family: 'copies', move: 'none', frames: 48 }), 1);
ok('escape time does not move here', loopOf({ ...sway, family: 'escape' }), 1);
ok('a still is its values at every tick', valuesAt({ ...sway, move: 'none' }, 17).twist, 3);
ok('a sway is its frames', loopOf(sway), 48);
ok('there and back: from at the start', r6(valuesAt(sway, 0).twist), -10);
ok('to, halfway', r6(valuesAt(sway, 24).twist), 10);
ok('and back, a quarter each way through zero', [r6(valuesAt(sway, 12).twist), r6(valuesAt(sway, 36).twist)], [0, 0]);
ok('the loop closes: the tick after the last is the first', valuesAt(sway, 48).twist, valuesAt(sway, 0).twist);
ok('and wraps either way', r6(valuesAt(sway, -1).twist), r6(valuesAt(sway, 47).twist));
ok('eased at the ends: little moves near them', Math.abs(valuesAt(sway, 1).twist - valuesAt(sway, 0).twist)
   < Math.abs(valuesAt(sway, 13).twist - valuesAt(sway, 12).twist), true);
ok('only the moving param moves', valuesAt(sway, 20).ratio, sway.ratio);
const spin = { ...sway, move: 'turn', from: 0, to: 360, wave: 'through', ease: 'linear', frames: 36 };
ok('once through: from, then evenly on', [0, 9, 18].map(t => r6(valuesAt(spin, t).turn)), [0, 90, 180]);
ok('a whole turn round comes back to where it started', r6(valuesAt(spin, 36).turn), 0);

ok('picked to move, a twist starts ±10 round its value', rangeAround('twist', 4), { from: -6, to: 14 });
ok('a ratio a little either way, within bounds', rangeAround('ratio', 0.96), { from: 0.9299999999999999, to: 0.98 });
ok('a turn once round', rangeAround('turn', 15), { from: 15, to: 375, wave: 'through' });
ok('every movable param has a label', Object.keys(MOVABLE).every(k => MOTION_PARAMS.move.labels[k]), true);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
