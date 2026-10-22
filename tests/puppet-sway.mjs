/**
 * tests/puppet-sway.mjs — run with: node tests/puppet-sway.mjs
 *
 * Covers the rig's puppet as the head moves it: apps/rig/puppet/head.js and
 * sway.js. The promises — the face's transform read as yaw, pitch and roll
 * in the camera's picture, each its own way round, and mirrored as the page
 * shows it; straight learnt over the first second and taken again at once;
 * the bones sorted into the body, the stalks and the loose limbs; a lean
 * bends the body by its share, spread up it, its top turning most, and no
 * further than the most; a turn leans the stalks on; a nod lifts; no face,
 * no target; the springs settle on the targets, a stalk left behind as the
 * body swings, swinging past further the more it wobbles; a long pause is
 * taken as a short one.
 */

const { poseOf, asShownPose, straight } = await import('../apps/rig/puppet/head.js');
const { limbsOf, targetsOf, springsFor, reachOfSway } = await import('../apps/rig/puppet/sway.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const close = (a, b, e = 1e-9) => Math.abs(a - b) < e;
const RAD = Math.PI / 180;

// ── head.js ─────────────────────────────────────────────────────────────────

/** A 4 × 4 transform, column by column, from a rotation's three columns and where it is. */
const transform = (c0, c1, c2, t = [0, 0, -60]) => [...c0, 0, ...c1, 0, ...c2, 0, ...t, 1];
const turn = (axis, a) => {
  const c = Math.cos(a), s = Math.sin(a);
  if (axis === 'y') return transform([c, 0, -s], [0, 1, 0], [s, 0, c]);
  if (axis === 'x') return transform([1, 0, 0], [0, c, s], [0, -s, c]);
  return transform([c, s, 0], [-s, c, 0], [0, 0, 1]);
};
const unturned = poseOf(transform([1, 0, 0], [0, 1, 0], [0, 0, 1], [3, 2, -60]));
ok('a face looking at the camera: nothing turned, where it is', [unturned.yaw, unturned.pitch, unturned.roll, unturned.x], [0, 0, 0, 3]);
ok('turned about the up axis: yaw, towards the picture\'s right', close(poseOf(turn('y', 20 * RAD)).yaw, 20 * RAD), true);
ok('turned about the side axis, forward going down: pitch below 0', close(poseOf(turn('x', 15 * RAD)).pitch, -15 * RAD), true);
ok('turned anticlockwise in the picture: the top leans left, roll below 0', close(poseOf(turn('z', 10 * RAD)).roll, -10 * RAD), true);
ok('no transform, no pose', [poseOf(null), poseOf([1, 2])], [null, null]);
const pose = { yaw: 0.2, pitch: 0.1, roll: -0.3, x: 4 };
ok('shown as a mirror: yaw, roll and x the other way, pitch kept', asShownPose(pose, true), { yaw: -0.2, pitch: 0.1, roll: 0.3, x: -4 });
ok('…and as it is otherwise', asShownPose(pose, false), pose);

const level = straight({ settle: 1 });
const bent = { yaw: 0.1, pitch: -0.2, roll: 0.05, x: 2 };
ok('straight is learnt over the first second: nothing until then', [level.from(bent, 0), level.from(bent, 0.5)], [null, null]);
const from = level.from({ yaw: 0.3, pitch: -0.2, roll: 0.05, x: 2 }, 1.2);
ok('…then the head is measured from it', [close(from.yaw, 0.2 / 3 * 2, 0.05), close(from.pitch, 0, 1e-9), close(from.roll, 0, 1e-9)], [true, true, true]);
level.now();
ok('straight now: the head as it is', Object.values(level.from({ yaw: 0.3, pitch: -0.2, roll: 0.05, x: 2 }, 1.3)).every(v => close(v, 0)), true);
ok('no face, no pose', level.from(null, 1.4), null);

// ── sway.js ─────────────────────────────────────────────────────────────────

// A body of four bones from its base up, a stalk of two from its top, an arm of one: parents first, as the rig proposes.
const bones = [
  { id: 0, stroke: 0, parent: null, from: 0, part: 'body' }, { id: 1, stroke: 0, parent: 0, from: 50, part: 'body' },
  { id: 2, stroke: 0, parent: 1, from: 100, part: 'body' }, { id: 3, stroke: 0, parent: 2, from: 150, part: 'body' },
  { id: 4, stroke: 1, parent: 3, from: 0, part: 'head' }, { id: 5, stroke: 1, parent: 4, from: 40, part: 'head' },
  { id: 6, stroke: 2, parent: 1, from: 0, part: 'arm-left' },
];
const limbs = limbsOf(bones);
ok('the body base first, the stalk, the loose arm', limbs, { body: [0, 1, 2, 3], stalks: [[4, 5]], loose: [[6]] });

const lean = targetsOf(bones, limbs, { yaw: 0, pitch: 0, roll: 10 * RAD, x: 0 }, { sway: 1, nod: 1 }, 200);
const bodySum = [0, 1, 2, 3].reduce((s, i) => s + lean.turns[i], 0);
ok('a lean bends the body: its top turns 0.6 of it', close(bodySum, 6 * RAD), true);
ok('…spread up the body, more at the top, the base least', lean.turns[0] < lean.turns[1] && lean.turns[2] < lean.turns[3], true);
ok('…the stalk and the arm asked nothing', [lean.turns[4], lean.turns[5], lean.turns[6]], [0, 0, 0]);
const far = targetsOf(bones, limbs, { yaw: 0, pitch: 0, roll: 90 * RAD, x: 0 }, { sway: 2 }, 200);
ok('no further than 40° however far it leans', close([0, 1, 2, 3].reduce((s, i) => s + far.turns[i], 0), 40 * RAD), true);
const look = targetsOf(bones, limbs, { yaw: 20 * RAD, pitch: 0, roll: 0, x: 0 }, { sway: 1 }, 200);
ok('a turn leans the stalk on into it, 0.3 of it', close(look.turns[4] + look.turns[5], 6 * RAD), true);
ok('a nod up lifts the drawing a share of its body', close(targetsOf(bones, limbs, { yaw: 0, pitch: 30 * RAD, roll: 0, x: 0 }, { nod: 1 }, 200).lift, 0.5 * 0.15 * 200), true);
ok('no face, no target', [...targetsOf(bones, limbs, null).turns].every(t => t === 0) && targetsOf(bones, limbs, null).lift === 0, true);

const settle = (wobble, seconds = 3) => {
  const s = springsFor(bones, limbs);
  let out, stalkLeast = 0, stalkMost = 0;
  for (let t = 0; t < seconds; t += 1 / 60) {
    out = s.step(lean.turns, 1 / 60, { wobble });
    stalkLeast = Math.min(stalkLeast, out[4]);
    stalkMost = Math.max(stalkMost, out[6] - lean.turns[6]);
  }
  return { out, stalkLeast, armPast: stalkMost };
};
const calm = settle(0.5);
ok('the springs settle on the targets', [0, 1, 2, 3, 4, 5, 6].every(i => close(calm.out[i], lean.turns[i], 1e-4)), true);
ok('a stalk is left behind as the body swings', calm.stalkLeast < -1e-3, true);
ok('…and swings past further the more it wobbles', settle(1).armPast > settle(0).armPast, true);
ok('a long pause is taken as a short one', [...springsFor(bones, limbs).step(lean.turns, 5, {})].every(Number.isFinite), true);
ok('more sway, more room', reachOfSway({ sway: 2, nod: 1 }, 100) > reachOfSway({ sway: 0.5, nod: 1 }, 100), true);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
