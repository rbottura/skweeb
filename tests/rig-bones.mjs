/**
 * tests/rig-bones.mjs — run with: node tests/rig-bones.mjs
 *
 * Covers apps/rig/bones.js and skin.js, a drawing's bones and how its stamps
 * ride them. The promises — a stroke is a chain, jointed at its corners, a
 * long run cut evenly; a chain hangs from the nearest bone drawn before it,
 * and a dot has no bones; a stamp rides its own stroke's bones even where it
 * lies over another stroke's, shared by two bones only near a joint, its
 * weights always whole; at rest every stamp is where it was drawn; a turned
 * elbow carries the forearm round its joint and leaves the rest alone; a
 * turn carries what hangs below and keeps every bone's length; a bone is
 * pointed where it is asked to point.
 */

const { drawingOf } = await import('../apps/rig/drawing.js');
const { proposeBones, posed, tipOf, turnToward, distanceTo } = await import('../apps/rig/bones.js');
const { bind, placeOf } = await import('../apps/rig/skin.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const close = (a, b, e = 1e-6) => Math.abs(a - b) < e;

const line = (x0, y0, x1, y1, step = 2) => {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  return Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n }));
};
const mark = p => ({ x: p.x, y: p.y, rotation: 0, scale: 0.2, familyId: 'brushes', spriteIndex: 8, pattern: 'single' });

// A body drawn upwards, an arm from its middle out and up — over the body
// at its start — and an eye, one tap.
const body = line(100, 300, 100, 120), arm = [...line(104, 210, 220, 210), ...line(220, 208, 220, 110).slice(1)];
const recipe = { canvas: { w: 400, h: 400, background: 'none' }, marks: [...body, ...arm, { x: 100, y: 110 }].map(mark) };
const d = drawingOf(recipe);
const bones = proposeBones(d, { corner: 30, longest: 200 });

ok('three strokes: the body, the arm, the eye', d.strokes.length, 3);
ok('the body one bone, the arm two — jointed at its elbow', bones.map(b => b.stroke), [0, 1, 1]);
ok('the body is the root; the arm hangs from it, its forearm from its upper arm', bones.map(b => b.parent), [null, 0, 1]);
ok('a bone runs from joint to joint along its stroke', [Math.round(bones[1].length), Math.round(bones[2].length),
  Math.round(bones[2].x), Math.round(bones[2].y)], [116, 100, 220, 210]);
ok('a long run is cut evenly', proposeBones(d, { corner: 30, longest: 50 }).filter(b => b.stroke === 0).map(b => Math.round(b.length)),
   [45, 45, 45, 45]);
ok('a sharper corner asked, the arm is one bent run, cut by length', proposeBones(d, { corner: 120, longest: 200 }).length, 3);

const binds = bind(d, bones, { bend: 12 });
const armStamps = d.strokes[1].stamps;
ok('an arm\'s stamp over the body rides the arm, not the body', binds[armStamps[0]].every(b => b.bone !== 0 || b.w < 1)
  && binds[armStamps[8]].map(b => b.bone).join() === '1', true);
ok('the weights of every stamp are whole', binds.every(bs => close(bs.reduce((n, b) => n + b.w, 0), 1)), true);
const shared = armStamps.filter(i => binds[i].length === 2).map(i => Math.round(d.stamps[i].s));
ok('shared only near a joint: the elbow, and where the arm hangs', shared.every(s => s < 12 || Math.abs(s - 116) < 12) && shared.length > 4, true);
ok('half and half at the joint itself', (() => { const i = armStamps.find(k => close(d.stamps[k].s, 116, 0.6));
  return binds[i].map(b => Math.round(b.w * 100)); })(), [50, 50]);
ok('with no bend, nothing is shared', bind(d, bones, { bend: 0 }).every(bs => bs.length === 1), true);
ok('the eye, a dot, rides the bone nearest it, whole', binds[d.stamps.length - 1].map(b => [b.bone, b.w, Math.round(b.lx), Math.round(b.ly)]),
   [[0, 1, 190, 0]]);

const rest = posed(bones);
ok('at rest every stamp is where it was drawn', d.stamps.every((s, i) => {
  const p = placeOf(s, binds[i], bones, rest);
  return close(p.x, s.x) && close(p.y, s.y) && close(p.rotation, s.rotation);
}), true);

const turns = [];
turns[2] = Math.PI / 2;                                   // the elbow, a quarter turn
const at = posed(bones, turns);
const tip = d.strokes[1].stamps.at(-1), tipAt = placeOf(d.stamps[tip], binds[tip], bones, at);
ok('a turned elbow carries the forearm round its joint', [Math.round(tipAt.x), Math.round(tipAt.y), close(tipAt.rotation, Math.PI / 2)],
   [320, 210, true]);
ok('and leaves the body and the upper arm alone', [...d.strokes[0].stamps, ...armStamps.slice(14, 40)].every(i => {
  const p = placeOf(d.stamps[i], binds[i], bones, at);
  return close(p.x, d.stamps[i].x) && close(p.y, d.stamps[i].y);
}), true);

const swung = posed(bones, [0.7]);
ok('a turn of the root carries all that hangs below', bones.every((b, i) => i === 0 || !close(swung[i].a, rest[i].a)), true);
ok('and keeps every bone\'s length and joint', bones.every((b, i) => {
  if (b.parent == null) return true;
  const end = tipOf(bones[b.parent], swung[b.parent]);
  return close(distanceTo({ ...bones[b.parent], ...swung[b.parent], angle: swung[b.parent].a }, swung[i]),
    distanceTo(bones[b.parent], b)) && Number.isFinite(end.x);
}), true);

const aim = { x: 300, y: 400 };
turns[1] = turnToward(bones[1], rest[1], 0, aim);
const aimed = posed(bones, turns);
ok('a bone is pointed where it is asked', close(Math.atan2(aim.y - aimed[1].y, aim.x - aimed[1].x), aimed[1].a), true);

// Hung in another order: the second stroke's chain first, the first's hanging from it.
const reordered = proposeBones(d, { order: [1, 0, 2] });
ok('chains hung in the order asked: the first asked is the root', reordered.filter(b => b.parent == null).map(b => b.stroke), [1]);
ok('…and a stroke drawn before it hangs from it, parents still first', reordered.every(b => b.parent == null || b.parent < b.id)
  && reordered.find(b => b.stroke === 0 && reordered[b.parent] && reordered[b.parent].stroke !== 0) !== undefined, true);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
