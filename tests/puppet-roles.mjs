/**
 * tests/puppet-roles.mjs — run with: node tests/puppet-roles.mjs
 *
 * Covers what each stroke is to the rig's puppet: apps/rig/puppet/roles.js.
 * The promises — a point held by a line, how far and how far along; the
 * body is the widest stroke wherever it was drawn, the longest among strokes
 * as wide; drawn from its top, it is read from its base; a stroke is read
 * from the end it hangs by; an eyestalk hangs from the body's upper half and
 * points up, a limb otherwise; what is told wins, a body told moving the
 * body; the parts the rig names follow — an eyestalk `head`, a limb never;
 * read so, the body is the root and an eye is at a stalk's free end; the
 * words told go to the address and back.
 */

const { rolesOf, partsFor, along, toldOf, toldText } = await import('../apps/rig/puppet/roles.js');
const { eyeTips, faceOf } = await import('../apps/rig/puppet/tips.js');
const { drawingOf } = await import('../apps/rig/drawing.js');
const { proposeBones } = await import('../apps/rig/bones.js');
const { withParts, guessParts } = await import('../apps/rig/parts.js');

let fails = 0;
const ok = (label, got, want) => {
  const pass = JSON.stringify(got) === JSON.stringify(want);
  if (!pass) fails++;
  console.log((pass ? 'ok   ' : 'FAIL ') + label.padEnd(60), JSON.stringify(got).slice(0, 80),
    pass ? '' : '  expected ' + JSON.stringify(want).slice(0, 80));
};
const close = (a, b, e = 1e-9) => Math.abs(a - b) < e;

const held = along([{ x: 0, y: 100 }, { x: 0, y: 0 }], { x: 10, y: 25 });
ok('a point held by a line: how far, and how far along it', [close(held.d, 10), close(held.t, 0.75)], [true, true]);
ok('…past its end, the end', close(along([{ x: 0, y: 100 }, { x: 0, y: 0 }], { x: 0, y: -30 }).t, 1), true);

const line = (x0, y0, x1, y1, scale) => {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 2));
  return Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n,
    rotation: 0.4, scale, familyId: 'brushes', spriteIndex: 8, pattern: 'single' }));
};
const still = strokes => drawingOf({ canvas: { w: 500, h: 600, background: 'none' }, marks: strokes.flat() });

// The body first, from its base up; two stalks from the head out; an arm.
const usual = still([line(200, 500, 200, 300, 0.4), line(180, 280, 160, 150, 0.12), line(220, 280, 245, 150, 0.12), line(195, 420, 100, 420, 0.12)]);
const u = rolesOf(usual, null);
ok('drawn body first: the widest is the body, the stalks eyes, the arm a limb', u.roles, ['body', 'eye', 'eye', 'limb']);
ok('…read as drawn, hung in drawing order', [u.reverse, u.order], [[], [0, 1, 2, 3]]);

// Eyes first — one from its tip down, one from the head up — then the body from its top down.
const eyesFirst = still([line(160, 150, 180, 280, 0.12), line(220, 280, 245, 150, 0.12), line(200, 300, 200, 500, 0.4)]);
const e = rolesOf(eyesFirst, null);
ok('drawn eyes first: the widest is the body all the same', [e.body, e.roles], [2, ['eye', 'eye', 'body']]);
ok('…the body read from its base, a stalk drawn from its tip read from the head', e.reverse, [0, 2]);
ok('…the body hung first', e.order, [2, 0, 1]);

const d = drawingOf({ canvas: { w: 500, h: 600, background: 'none' }, marks: [line(160, 150, 180, 280, 0.12), line(220, 280, 245, 150, 0.12),
  line(200, 300, 200, 500, 0.4)].flat() }, { reverse: e.reverse });
const raw = proposeBones(d, { longest: 70, order: e.order });
const bones = withParts(raw, partsFor(e.roles, guessParts(raw)));
const at = i => [Math.round(d.stamps[i].x), Math.round(d.stamps[i].y)];
ok('read so, the body is the root, the stalks named head', [bones.find(b => b.parent == null).stroke, [...new Set(bones.filter(b => b.part === 'head').map(b => b.stroke))]], [2, [0, 1]]);
ok('…an eye at each stalk\'s free end, the mouth at the body\'s top', [eyeTips(d, bones).map(at), at(faceOf(d, bones).stamp)], [[[160, 150], [245, 150]], [200, 300]]);

const wide = still([line(100, 500, 100, 300, 0.2), line(300, 500, 300, 200, 0.2)]);
ok('among strokes as wide, the longest is the body', rolesOf(wide, null).body, 1);

ok('a stroke told a limb is a limb', rolesOf(usual, null, ['', 'limb']).roles, ['body', 'limb', 'eye', 'limb']);
ok('…an arm told an eye, an eye', rolesOf(usual, null, ['', '', '', 'eye']).roles, ['body', 'eye', 'eye', 'eye']);
const toldBody = rolesOf(usual, null, ['', '', '', 'body']);
ok('a body told elsewhere moves the body, and is hung first', [toldBody.body, toldBody.order[0], toldBody.roles[0]], [3, 3, 'limb']);

ok('the parts the rig names: body, a stalk head, a limb what was guessed', partsFor(['body', 'eye', 'limb', 'limb'], { 0: 'body', 1: 'arm-left', 2: 'head', 3: 'leg-right' }),
  { 0: 'body', 1: 'head', 2: 'none', 3: 'leg-right' });
ok('the words told: a role a stroke, the found left empty', [toldOf('eye,,body'), toldOf(''), toldOf('eye, nonsense ,limb')], [['eye', '', 'body'], [], ['eye', '', 'limb']]);
ok('…and back, the found at the end left off', [toldText(['', 'limb', '', '']), toldText(['', '']), toldText(['eye', 'what'])], [',limb', '', 'eye']);
ok('no strokes, no roles', rolesOf({ strokes: [], stamps: [] }, null), { roles: [], found: [], reverse: [], order: [], body: null });

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
