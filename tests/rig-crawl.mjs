/**
 * tests/rig-crawl.mjs — run with: node tests/rig-crawl.mjs
 *
 * Covers apps/rig/crawl.js, parts.js and presets.js — a creature that moves
 * as a worm, the parts a walk is made of, and the walks. The promises — a
 * line is sampled evenly, headed along its way, straight on past its ends;
 * a point held by a line and carried by it unmoved is where it was, beside
 * it, beyond its end or on it; a body undulating keeps its middle and every
 * piece's length, is the body as drawn at no wave, and closes its loop; a
 * path closes, a circle as long as a circle, a wiggle longer, the other way
 * reversed; laid along a path the body keeps its spacing, its head ahead,
 * and closes its loop; a body's chains are named as they hang; a walk sets
 * the legs against each other and each arm against its leg, the chain
 * following where it has more than one bone, and a rise for the body.
 */

const { lineOf, frameAt, coordsOf, carry, undulated, pathOf, alongPath, crawls } = await import('../apps/rig/crawl.js');
const { guessParts, withParts, chainsOf } = await import('../apps/rig/parts.js');
const { preset, bodyLength } = await import('../apps/rig/presets.js');
const { riseAt } = await import('../apps/rig/motion.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const close = (a, b, e = 1e-6) => Math.abs(a - b) < e;
const near = (p, q, e = 1e-6) => close(p.x, q.x, e) && close(p.y, q.y, e);

// A body drawn upwards, 200 px.
const straight = lineOf(Array.from({ length: 101 }, (_, i) => ({ x: 100, y: 300 - 2 * i })));
ok('a line sampled evenly, as long as it is', [straight.points.length, close(straight.length, 200), close(straight.h, 4)], [51, true, true]);
ok('headed along its way', straight.heading.every(a => close(a, -Math.PI / 2)), true);
ok('past its end, straight on', near(frameAt(straight, 230), { x: 100, y: 70 }), true);

const held = [{ x: 100, y: 200 }, { x: 130, y: 150 }, { x: 95, y: 60 }, { x: 70, y: 330 }];
ok('a point held and carried unmoved is where it was — on, beside, past either end', held.every(p => {
  const k = coordsOf(straight, p, 0.3), q = carry(straight, k);
  return near(q, p, 1e-9) && close(q.rotation, 0.3, 1e-12);
}), true);

const still = undulated(straight, { undulate: 0, wavelength: 80, ripples: 1 }, 7, 30);
ok('no wave, the body as drawn', still.points.every((p, i) => near(p, straight.points[i], 1e-9)), true);
const waved = undulated(straight, { undulate: 30, wavelength: 80, ripples: 1 }, 7, 30);
const pieces = waved.points.slice(1).map((p, i) => Math.hypot(p.x - waved.points[i].x, p.y - waved.points[i].y));
ok('a wave keeps every piece its length', pieces.every(d => close(d, 4, 1e-9)), true);
ok('and the middle where it was drawn', near(waved.points[25], straight.points[25], 1e-9), true);
ok('and moves the rest', waved.points.some((p, i) => Math.abs(p.x - straight.points[i].x) > 5), true);
const first = undulated(straight, { undulate: 30, wavelength: 80, ripples: 2 }, 0, 30);
const last = undulated(straight, { undulate: 30, wavelength: 80, ripples: 2 }, 30, 30);
ok('whole ripples close the loop, to the bit', first.points.every((p, i) => p.x === last.points[i].x && p.y === last.points[i].y), true);

const centre = { x: 400, y: 300 };
const circle = pathOf({ path: 'circle', pathWidth: 300 }, centre);
ok('a circle closes, as long as a circle', [circle.closed, close(circle.length, Math.PI * 300, 2)], [true, true]);
ok('round its centre', circle.points.every(p => close(Math.hypot(p.x - 400, p.y - 300), 150, 0.5)), true);
const wiggly = pathOf({ path: 'circle', pathWidth: 300, wiggle: 10, wiggles: 12 }, centre);
ok('a wiggle makes it longer, and still round the centre', wiggly.length > circle.length + 20
  && wiggly.points.every(p => Math.abs(Math.hypot(p.x - 400, p.y - 300) - 150) < 11), true);
const eight = pathOf({ path: 'eight', pathWidth: 400, pathHeight: 200 }, centre);
ok('a figure of eight crosses at its centre', eight.points.some(p => near(p, centre, 1.5)), true);
const back = pathOf({ path: 'ellipse', pathWidth: 300, pathHeight: 200, way: 'the other way' }, centre);
const ahead = pathOf({ path: 'ellipse', pathWidth: 300, pathHeight: 200 }, centre);
ok('the other way round', Math.sign(back.heading[0] - back.heading[10]) === -Math.sign(ahead.heading[0] - ahead.heading[10]), true);

const laid = alongPath(straight, circle, { laps: 1 }, 0, 40);
const spacing = laid.points.slice(1).map((p, i) => Math.hypot(p.x - laid.points[i].x, p.y - laid.points[i].y));
ok('laid on a path the body keeps its spacing', spacing.every(d => Math.abs(d - 4) < 0.05), true);
ok('on the path', laid.points.every(p => close(Math.hypot(p.x - 400, p.y - 300), 150, 0.5)), true);
const later = alongPath(straight, circle, { laps: 1 }, 10, 40);
const moved = Math.hypot(later.points[50].x - laid.points[50].x, later.points[50].y - laid.points[50].y);
ok('its head ahead as the loop goes on', moved > 50, true);
const round = alongPath(straight, circle, { laps: 2 }, 40, 40), start = alongPath(straight, circle, { laps: 2 }, 0, 40);
ok('whole laps close the loop, to the bit', round.points.every((p, i) => p.x === start.points[i].x && p.y === start.points[i].y), true);
ok('a crawl is asked for, or not', [crawls({ crawl: 'none' }), crawls({ crawl: 'in place', undulate: 0 }),
  crawls({ crawl: 'in place', undulate: 20 }), crawls({ crawl: 'along a path' })], [false, false, true, true]);

// A figure drawn upright: a body, a head on its top, an arm each side, a leg each side, a hand off the left arm.
const bone = (id, stroke, parent, x, y, deg, length, from = 0) => ({ id, stroke, parent, x, y, angle: (deg * Math.PI) / 180, length, from, to: from + length });
const figure = [
  bone(0, 0, null, 100, 300, -90, 100), bone(1, 0, 0, 100, 200, -90, 100, 100),
  bone(2, 1, 1, 100, 110, -90, 40),
  bone(3, 2, 1, 95, 170, 180, 60), bone(4, 2, 3, 35, 170, 120, 50, 60),
  bone(5, 3, 1, 105, 170, 0, 60), bone(6, 3, 5, 165, 170, 60, 50, 60),
  bone(7, 4, 0, 90, 300, 100, 80), bone(8, 4, 7, 76, 379, 90, 70, 80),
  bone(9, 5, 0, 110, 300, 80, 80), bone(10, 5, 9, 124, 379, 90, 70, 80),
  bone(11, 6, 4, 10, 213, 120, 20),
];
ok('a figure\'s chains named as they hang, left and right as seen', guessParts(figure),
   { 0: 'body', 1: 'head', 2: 'arm-left', 3: 'arm-right', 4: 'leg-left', 5: 'leg-right', 6: 'none' });
const named = withParts(figure);
ok('every bone carries its chain\'s part', named.map(b => b.part).slice(0, 5), ['body', 'body', 'head', 'arm-left', 'arm-left']);
ok('a part given by hand is kept', withParts([{ ...figure[0], part: 'tail' }])[0].part, 'tail');
ok('the body\'s length, joint to end', bodyLength(figure), 200);

const walk = preset('walk', named);
const w = id => walk.waves[id];
ok('a walk steps the legs against each other', [w(7).phase, w(9).phase, w(7).swing === w(9).swing], [0, 180, true]);
ok('each arm against its own leg', [w(3).phase, w(5).phase], [180, 0]);
ok('the chain follows where there is one, the head bobs twice a stride', [w(7).follow, w(2).follow, w(2).cycles], [true, false, 2]);
ok('a wave on a chain\'s first bone only, none on what is named nothing', [w(8), w(4), w(11)], [null, null, null]);
ok('the body rises a share of its length, twice a loop', walk.values, { length: 24, fps: 24, rise: 6, rises: 2 });
ok('a rise closes its loop, and is up at a quarter', [riseAt({ rise: 6, rises: 1 }, 24, 24) === riseAt({ rise: 6, rises: 1 }, 0, 24),
  close(riseAt({ rise: 6, rises: 1 }, 6, 24), 6)], [true, true]);
ok('the chains by stroke, in order along them', [...chainsOf(figure).get(2)].map(b => b.id), [3, 4]);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
