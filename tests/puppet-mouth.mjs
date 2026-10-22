/**
 * tests/puppet-mouth.mjs — run with: node tests/puppet-mouth.mjs
 *
 * Covers the rig's puppet as far as the mouth: apps/rig/puppet/mouth.js, and
 * the face in tips.js. The promises — the mouth's box is held to the face:
 * its width a share of the eyes' distance whatever the lips do, its middle
 * between the corners and a little below, level with the eyes or square to
 * the camera, wider than tall; no face, no box; flipped as a mirror; the
 * face is the body's last stamp, the way down the body from it pointing to
 * its first; the mouth goes there, or lower down the body, and turns with
 * the face.
 */

const { mouthOf, mouthShown, MOUTH_CORNERS, MOUTH_WIDTH, ASPECT } = await import('../apps/rig/puppet/mouth.js');
const { EYE_RINGS } = await import('../apps/rig/puppet/eyes.js');
const { faceOf, faceAt, stampWidth } = await import('../apps/rig/puppet/tips.js');
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
const close = (a, b, e = 1e-9) => Math.abs(a - b) < e;

// ── mouth.js ────────────────────────────────────────────────────────────────

/** A face: eyes 100 apart round (200, 300) and (300, 300), the mouth's corners `wide` apart round (250, 400). */
function face({ wide = 80, turn = 0 } = {}) {
  const points = Array.from({ length: 478 }, () => ({ x: 0, y: 0, z: 0 }));
  EYE_RINGS.forEach((ring, k) => ring.forEach((i, j) => {
    const a = (2 * Math.PI * j) / ring.length;
    points[i] = { x: [200, 300][k] + 20 * Math.cos(a), y: 300 + 8 * Math.sin(a), z: 0 };
  }));
  points[MOUTH_CORNERS[0]] = { x: 250 - wide / 2, y: 400, z: 0 };
  points[MOUTH_CORNERS[1]] = { x: 250 + wide / 2, y: 400, z: 0 };
  if (!turn) return points;
  const s = Math.sin(turn), c = Math.cos(turn);
  return points.map(p => ({ x: 250 + c * (p.x - 250) - s * (p.y - 350), y: 350 + s * (p.x - 250) + c * (p.y - 350), z: p.z }));
}

const closed = mouthOf(face({ wide: 80 }), { around: 1.5 });
ok('a box as wide as a closed mouth × around, by the eyes\' distance', close(closed.size, 100 * MOUTH_WIDTH * 1.5), true);
ok('…wider than tall', closed.aspect, ASPECT);
ok('its middle between the corners, a little below them', [close(closed.x, 250), closed.y > 400 && closed.y < 420], [true, true]);
const smiling = mouthOf(face({ wide: 120 }), { around: 1.5 });
ok('a smile widens inside the box: the box keeps its size', close(smiling.size, closed.size), true);
const leaning = mouthOf(face({ turn: 0.3 }));
ok('a head leaning, the box turned with the eyes', close(leaning.angle, 0.3, 1e-9), true);
ok('…or square to the camera when not kept level', mouthOf(face({ turn: 0.3 }), { level: false }).angle, 0);
ok('…and still below the corners, along the face', (() => { const m = leaning, cx = 250, cy = 400; // the corners' middle, turned about (250, 350)
  const mx = 250 + Math.cos(0.3) * (cx - 250) - Math.sin(0.3) * (cy - 350), my = 350 + Math.sin(0.3) * (cx - 250) + Math.cos(0.3) * (cy - 350);
  return Math.atan2(m.y - my, m.x - mx); })() > 0, true);
ok('no face, no box', [mouthOf(null), mouthOf([{ x: 0, y: 0 }])], [null, null]);
ok('as a mirror it is cut flipped; no box stays none', [mouthShown(closed, true).flip, mouthShown(closed, false).flip, mouthShown(null, true)], [true, false, null]);

// ── tips.js, the face ───────────────────────────────────────────────────────

const line = (x0, y0, x1, y1, step = 2) => {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / step));
  return Array.from({ length: n + 1 }, (_, i) => ({ x: x0 + ((x1 - x0) * i) / n, y: y0 + ((y1 - y0) * i) / n }));
};
const mark = (p, scale) => ({ ...p, rotation: 0.4, scale, familyId: 'brushes', spriteIndex: 8, pattern: 'single' });
const strokes = [line(200, 400, 200, 200).map(p => mark(p, 0.4)), line(186, 214, 165, 110).map(p => mark(p, 0.2)), line(214, 214, 240, 115).map(p => mark(p, 0.2))];
const recipe = { canvas: { w: 400, h: 450, background: 'none' }, frame: { from: { x: 0, y: 0, w: 400, h: 450 }, to: { x: 0, y: 0, w: 400, h: 450 }, w: 400, h: 450 },
  marks: strokes.flat() };
const drawing = drawingOf(recipe);
const bones = withParts(proposeBones(drawing, { longest: 70 }));
const top = faceOf(drawing, bones);
ok('the face is the body\'s last stamp: its top', [Math.round(drawing.stamps[top.stamp].x), Math.round(drawing.stamps[top.stamp].y)], [200, 200]);
ok('…down the body from it, towards its first', [close(top.down.x, 0), close(top.down.y, 1)], [true, true]);
const images = new Map([['brushes#8', { width: 300, height: 300 }]]);
const atRest = drawing.stamps.map(s => ({ x: s.x, y: s.y, rotation: s.rotation }));
ok('the face as wide as its stamp is drawn', faceAt(drawing, top, atRest, images).width, stampWidth(drawing, images, top.stamp));
const half = faceAt(drawing, top, atRest, images, 0.5);
ok('the mouth lower: half a face down the body', [Math.round(half.x), Math.round(half.y)], [200, 260]);
const turned = atRest.map((p, i) => (i === top.stamp ? { ...p, rotation: p.rotation + Math.PI / 2 } : p));
const across = faceAt(drawing, top, turned, images, 0.5);
ok('the face turned a quarter, down the body turns with it', [Math.round(across.x), Math.round(across.y), close(across.turn, Math.PI / 2)], [140, 200, true]);
ok('no bones, no face', faceOf(drawing, []), null);

console.log(fails ? `\n${fails} FAILED` : '\nall passed');
process.exit(fails ? 1 : 0);
