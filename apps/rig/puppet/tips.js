/**
 * tips.js — where the eyes and the mouth go: the tip of each eyestalk, as
 * the rig names its chains, and the face — and how large each is drawn.
 *
 * The rig names a chain `head` when it hangs from the top of the body and
 * points on, as stalks do (../parts.js). A stalk is drawn from the head out,
 * so its stroke's last stamp — drawn last, on top — is its tip, and an eye
 * goes there, as wide as that stamp's sprite is drawn. Tips are taken left
 * to right as drawn; the eyes, left to right as shown (eyes.js), go to them
 * in turn — two stalks an eye each, one a single eye, a third the first eye
 * again. The face is the body's last stamp: a body drawn from its base up
 * ends at its top, drawn over the rest of it (../STATUS.md) — the mouth goes
 * there, or `lower` face widths down the body from it. Each turns as its
 * stamp turns away from how it was drawn. Pure.
 */

/**
 * @param {object} drawing     ../drawing.js `drawingOf`
 * @param {object[]} bones     each with its chain's `part` (../parts.js `withParts`)
 * @returns {number[]}  the tips' stamp indices, left to right at rest
 */
export function eyeTips(drawing, bones) {
  const stalks = [...new Set(bones.filter(b => b.part === 'head').map(b => b.stroke))];
  return stalks
    .map(k => drawing.strokes[k].stamps[drawing.strokes[k].stamps.length - 1])
    .sort((a, b) => drawing.stamps[a].x - drawing.stamps[b].x);
}

/** How wide a stamp is drawn, in the drawing's pixels: its sprite's width at its scale. */
export function stampWidth(drawing, images, stamp) {
  const s = drawing.stamps[stamp], image = images.get(s.key);
  return image ? image.width * Math.abs(s.scale) : 0;
}

/**
 * Each tip as the frame has it, with the eye it takes: its stamp, where it
 * is, how far it has turned from how it was drawn, and how wide it is.
 *
 * @param {object} drawing
 * @param {number[]} tips          eyeTips's
 * @param {Array<{x, y, rotation}>} places   the frame's, by stamp (wear.js `placesAt`)
 * @param {Map} images
 * @returns {Array<{stamp: number, x: number, y: number, turn: number, width: number, eye: number}>}
 */
export function tipsAt(drawing, tips, places, images) {
  return tips.map((stamp, i) => ({
    stamp,
    x: places[stamp].x,
    y: places[stamp].y,
    turn: places[stamp].rotation - drawing.stamps[stamp].rotation,
    width: stampWidth(drawing, images, stamp),
    eye: i % 2,
  }));
}

/**
 * The face: the body's last stamp, and the way down the body from it at
 * rest — towards its first. Null with no bones.
 *
 * @returns {?{stamp: number, down: {x: number, y: number}}}
 */
export function faceOf(drawing, bones) {
  const root = bones.find(b => b.parent == null);
  if (!root) return null;
  const body = drawing.strokes[root.stroke].stamps, stamp = body[body.length - 1];
  const top = drawing.stamps[stamp], base = drawing.stamps[body[0]], d = Math.hypot(base.x - top.x, base.y - top.y);
  return { stamp, down: d ? { x: (base.x - top.x) / d, y: (base.y - top.y) / d } : { x: 0, y: 1 } };
}

/**
 * The face as the frame has it: where the mouth goes, `lower` face widths
 * down the body, turned as the face has turned; and how wide the face is.
 *
 * @returns {{stamp: number, x: number, y: number, turn: number, width: number}}
 */
export function faceAt(drawing, face, places, images, lower = 0) {
  const p = places[face.stamp], turn = p.rotation - drawing.stamps[face.stamp].rotation;
  const width = stampWidth(drawing, images, face.stamp), c = Math.cos(turn), s = Math.sin(turn);
  const dx = c * face.down.x - s * face.down.y, dy = s * face.down.x + c * face.down.y;
  return { stamp: face.stamp, x: p.x + dx * lower * width, y: p.y + dy * lower * width, turn, width };
}
