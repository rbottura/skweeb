/**
 * tests/puppet-eyes.mjs — run with: node tests/puppet-eyes.mjs
 *
 * Covers the rig's puppet as far as the eyes: apps/rig/puppet/eyes.js,
 * steady.js, tips.js and address.js. The promises — an eye's centre is its
 * ring's mean and its box a share of the distance between the eyes, in
 * depth as well as across, so a head turning away keeps the eyes' size; the
 * boxes are level with the line through the eyes, or square to the camera;
 * no face, no boxes; shown as a mirror the camera's right-hand eye comes
 * first and is cut flipped; the 1€ filter holds a still value, follows a
 * step, faster for a larger beta, and counts speed in its scale; held boxes
 * outlast a missed frame and are forgotten after `forget`; the eyes go to
 * the tips of the stalks the rig names `head`, left to right, as wide as the
 * tip's sprite is drawn, turned as the tip turns; the address writes only
 * what differs from the defaults and reads it back.
 */

const { eyesOf, asShown, EYE_RINGS, EYE_WIDTH } = await import('../apps/rig/puppet/eyes.js');
const { oneEuro, steadyBoxes, restCutoff } = await import('../apps/rig/puppet/steady.js');
const { eyeTips, tipsAt, stampWidth } = await import('../apps/rig/puppet/tips.js');
const { toQuery, fromQuery } = await import('../apps/rig/puppet/address.js');
const { puppetParams } = await import('../apps/rig/puppet/params.js');
const { drawingOf } = await import('../apps/rig/drawing.js');
const { proposeBones } = await import('../apps/rig/bones.js');
const { withParts } = await import('../apps/rig/parts.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const close = (a, b, e = 1e-6) => Math.abs(a - b) < e;

// ── eyes.js ─────────────────────────────────────────────────────────────────

/** A face of 478 points, each eye's ring round its centre — a wide ellipse, its mean the centre — the rest at the origin. */
function face(centres, turn = 0, about = { x: 250, y: 300 }) {
  const points = Array.from({ length: 478 }, () => ({ x: 0, y: 0, z: 0 }));
  EYE_RINGS.forEach((ring, k) => ring.forEach((i, j) => {
    const a = (2 * Math.PI * j) / ring.length, c = centres[k];
    points[i] = { x: c.x + 20 * Math.cos(a), y: c.y + 8 * Math.sin(a), z: c.z || 0 };
  }));
  if (!turn) return points;
  const s = Math.sin(turn), co = Math.cos(turn);
  return points.map(p => ({ x: about.x + co * (p.x - about.x) - s * (p.y - about.y), y: about.y + s * (p.x - about.x) + co * (p.y - about.y), z: p.z }));
}

const level = eyesOf(face([{ x: 300, y: 300 }, { x: 200, y: 300 }]), { around: 1.8 });
ok('an eye is its ring\'s mean, left to right in the picture', level.map(e => [Math.round(e.x), Math.round(e.y)]), [[200, 300], [300, 300]]);
ok('a box is the eyes\' distance × an eye\'s share × around', close(level[0].size, 100 * EYE_WIDTH * 1.8) && level[1].size === level[0].size, true);
ok('level eyes, a level box', close(level[0].angle, 0), true);
const leaning = eyesOf(face([{ x: 200, y: 300 }, { x: 300, y: 300 }], (20 * Math.PI) / 180));
ok('a head leaning 20°, the boxes turned 20°', close(leaning[0].angle, (20 * Math.PI) / 180, 1e-9), true);
ok('…or square to the camera when not kept level', eyesOf(face([{ x: 200, y: 300 }, { x: 300, y: 300 }], 0.3), { level: false })[0].angle, 0);
const turned = eyesOf(face([{ x: 200, y: 300 }, { x: 280, y: 300, z: 60 }]), { around: 1 });
ok('a head turned away: the distance in depth too, the size kept', close(turned[0].size, 100 * EYE_WIDTH, 1e-9), true);
ok('no face, no boxes', [eyesOf(null), eyesOf([{ x: 0, y: 0 }])], [null, null]);
const shown = asShown(level, true);
ok('as a mirror: the camera\'s right-hand eye first, flipped', [shown[0].x, shown[0].flip, shown[1].x, shown[1].flip], [level[1].x, true, level[0].x, true]);
ok('as the camera sees: as found, not flipped', asShown(level, false).map(e => e.flip), [false, false]);

// ── steady.js ───────────────────────────────────────────────────────────────

const still = oneEuro({ minCutoff: 1, beta: 0 });
ok('a still value is held where it is', Array.from({ length: 30 }, (_, i) => still.filter(7, i / 30)).every(v => v === 7), true);
const follow = (beta, scale = 1) => {
  const f = oneEuro({ minCutoff: 1, beta });
  f.filter(0, 0);
  let v = 0;
  for (let i = 1; i <= 6; i++) v = f.filter(100, i / 30, scale);
  return v;
};
ok('a step is followed, never past it', follow(0) > 0 && follow(0) < 100, true);
ok('…faster for a larger beta', follow(0.1) > follow(0), true);
ok('…speed counted in its scale: a larger scale, slower', follow(0.1, 100) < follow(0.1, 1), true);
ok('the cutoff at rest: 5 Hz at 0, 0.3 at 1', [close(restCutoff(0), 5), close(restCutoff(1), 0.3)], [true, true]);
const boxes = steadyBoxes({ forget: 0.4 });
const box = [{ x: 10, y: 20, size: 50, angle: 0.1 }, { x: 90, y: 20, size: 50, angle: 0.1 }];
ok('the first boxes held as they are', boxes.hold(box, 0), box);
ok('a missed frame keeps the last boxes', boxes.hold(null, 0.1), box);
ok('a face gone longer than forget is forgotten', boxes.hold(null, 0.6), null);
const moved = [{ x: 40, y: 20, size: 50, angle: 0.1 }, { x: 120, y: 20, size: 50, angle: 0.1 }];
ok('…and found again where it is, not glided to', boxes.hold(moved, 0.7), moved);

// ── tips.js ─────────────────────────────────────────────────────────────────

const line = (x0, y0, x1, y1, step = 2) => {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  return Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n }));
};
const mark = p => ({ ...p, rotation: 0.4, scale: 0.25, familyId: 'brushes', spriteIndex: 8, pattern: 'single' });
// A body drawn upwards, a stalk each side from the head out, an arm: in that order, the pen lifted between —
// a jump past 16 px, or the stalk would be the body drawn on (../rig/strokes.js).
const strokes = [line(200, 400, 200, 200), line(186, 214, 165, 110), line(214, 214, 240, 115), line(196, 330, 120, 330)];
const recipe = { canvas: { w: 400, h: 450, background: 'none' }, frame: { from: { x: 0, y: 0, w: 400, h: 450 }, to: { x: 0, y: 0, w: 400, h: 450 }, w: 400, h: 450 },
  marks: strokes.flat().map(mark) };
const drawing = drawingOf(recipe);
const bones = withParts(proposeBones(drawing, { longest: 70 }));
const tips = eyeTips(drawing, bones);
ok('the stalks are named head, the arm not', [...new Set(bones.map(b => b.part))], ['body', 'head', 'arm-left']);
ok('the eyes go to the stalks\' last stamps, left to right', tips.map(i => [Math.round(drawing.stamps[i].x), Math.round(drawing.stamps[i].y)]), [[165, 110], [240, 115]]);
const images = new Map([['brushes#8', { width: 300, height: 300 }]]);
ok('a tip as wide as its sprite is drawn', stampWidth(drawing, images, tips[0]), 75);
const atRest = drawing.stamps.map(s => ({ x: s.x, y: s.y, rotation: s.rotation }));
const swung = atRest.map(p => ({ ...p, rotation: p.rotation + 0.25 }));
ok('at rest a tip has not turned; each takes an eye in turn', tipsAt(drawing, tips, atRest, images).map(t => [t.turn, t.eye]), [[0, 0], [0, 1]]);
ok('swung, an eye turns as its tip turns', tipsAt(drawing, tips, swung, images).every(t => close(t.turn, 0.25)), true);

// ── address.js ──────────────────────────────────────────────────────────────

const params = puppetParams();
ok('everything at its default, no address', toQuery(params), '');
params.set({ drawing: 'gam_1', eyeSize: 1.3, mirror: false });
ok('only what differs is written; a switch as 0', toQuery(params), '?drawing=gam_1&eyeSize=1.3&mirror=0');
ok('…and obs last, alone', toQuery(params, { obs: true }), '?drawing=gam_1&eyeSize=1.3&mirror=0&obs');
const again = puppetParams();
again.restore(fromQuery(again, '?drawing=gam_1&eyeSize=1.3&mirror=0&obs'));
ok('read back, the same puppet', [again.get('drawing'), again.get('eyeSize'), again.get('mirror'), again.get('around')], ['gam_1', 1.3, false, 1.8]);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
