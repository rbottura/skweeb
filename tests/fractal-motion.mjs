/**
 * tests/fractal-motion.mjs — run with: node tests/fractal-motion.mjs
 *
 * Covers apps/fractals/motion.js: a param swung over a loop. The promises —
 * a still is its values at every tick; there and back reaches `to` halfway
 * and comes back, eased at both ends; once through runs from `from` to `to`;
 * the loop closes on itself, any tick drawn on its own; and a param picked
 * to move starts from a range round its value now. Escape time too: the
 * ramp once round, evenly; a Julia `c` round a circle about the one chosen,
 * every frame on it; a Julia `c` moves no Mandelbrot set; and the shared
 * rows show for whichever family moves.
 */

const { valuesAt, loopOf, rangeAround, MOTION_PARAMS, MOVABLE, MOVABLE_ESCAPE } = await import('../apps/fractals/motion.js');
const { applies } = await import('../core/params.js');

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
ok('escape time does not move by the copies\' choice', loopOf({ ...sway, family: 'escape' }), 1);
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

// Escape time moves too (2026-09-30).
const cycling = { family: 'escape', kind: 'mandelbrot', moveEscape: 'phase', move: 'twist', twist: 3, cx: -0.6,
                  phase: 0.25, jx: -0.8, jy: 0.156, radius: 0.02, from: 0.25, to: 1.25, wave: 'through', ease: 'linear', frames: 48 };
ok('escape time standing still is one frame', loopOf({ ...cycling, moveEscape: 'none' }), 1);
ok('the ramp once round is its frames', loopOf(cycling), 48);
ok('the phase runs evenly on from where it was', [0, 12, 24, 36].map(t => r6(valuesAt(cycling, t).phase)), [0.25, 0.5, 0.75, 1]);
ok('the last frame is a step short of once round', r6(valuesAt(cycling, 47).phase - cycling.from), r6(47 / 48));
ok('the tick after the last is the first', valuesAt(cycling, 48).phase, valuesAt(cycling, 0).phase);
ok('the copies\' choice moves nothing here', valuesAt(cycling, 12).twist, 3);

const orbit = { ...cycling, kind: 'julia', moveEscape: 'julia', from: 0, to: 360 };
const cAt = t => { const w = valuesAt(orbit, t); return [r6(w.jx), r6(w.jy)]; };
ok('the Julia c round a circle: a quarter round each quarter', [0, 12, 24, 36].map(cAt),
   [[-0.78, 0.156], [-0.8, 0.176], [-0.82, 0.156], [-0.8, 0.136]]);
ok('every frame\'s c is the radius from the c chosen', Array.from({ length: 48 }, (_, t) => valuesAt(orbit, t))
   .every(w => Math.abs(Math.hypot(w.jx - orbit.jx, w.jy - orbit.jy) - orbit.radius) < 1e-12), true);
ok('once round, the tick after the last is the first', [valuesAt(orbit, 48).jx, valuesAt(orbit, 48).jy],
   [valuesAt(orbit, 0).jx, valuesAt(orbit, 0).jy]);
ok('the view and the ramp stay as they were', [valuesAt(orbit, 30).cx, valuesAt(orbit, 30).phase], [-0.6, 0.25]);
ok('a Julia c moves no Mandelbrot set: a still', loopOf({ ...orbit, kind: 'mandelbrot' }), 1);

ok('picked to move, the ramp starts once round from its phase', rangeAround('phase', 0.3),
   { from: 0.3, to: 1.3, wave: 'through', ease: 'linear' });
ok('and the Julia c once round its circle', rangeAround('julia', undefined), { from: 0, to: 360, wave: 'through', ease: 'linear' });
ok('every escape mover has a label', Object.keys(MOVABLE_ESCAPE).every(k => MOTION_PARAMS.moveEscape.labels[k]), true);

const shows = (key, v) => applies(MOTION_PARAMS[key], v);
ok('the range shows while the ramp moves', shows('from', { family: 'escape', moveEscape: 'phase' }), true);
ok('and not while escape time stands still, whatever the copies chose', shows('from', { family: 'escape', moveEscape: 'none', move: 'twist' }), false);
ok('the radius shows for a Julia set\'s c moving, and only then',
   [shows('radius', { family: 'escape', kind: 'julia', moveEscape: 'julia' }),
    shows('radius', { family: 'escape', kind: 'mandelbrot', moveEscape: 'julia' })], [true, false]);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
