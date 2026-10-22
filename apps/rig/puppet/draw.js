/**
 * draw.js — the puppet, drawn: the rigged drawing as the rig draws it, and
 * what it wears, cut from the camera — an eye over each eyestalk's tip, the
 * mouth on the face.
 *
 * Each is laid on just after the stamp it goes on (../draw.js `drawRig`'s
 * `after`), so what was drawn after that stamp still covers it as it covered
 * the stamp: a stalk drawn over the face's edge passes over the mouth too.
 * Each is centred on its spot, as wide as asked, and turned as far as its
 * stamp has turned from how it was drawn — so it rides its stalk, or the
 * body. With no face nothing is worn, and the drawing's own eyes and mouth
 * show. The room is the drawing's ink with room for what is worn and for
 * the head's sway.
 */

import { drawRig } from '../draw.js';

/**
 * @param {CanvasRenderingContext2D} ctx   a canvas the room's size times `view`
 * @param {object} o
 * @param {object} o.drawing        ../drawing.js `drawingOf`
 * @param {Array} o.places          the frame's, by stamp
 * @param {Map} o.images
 * @param {number} o.view           canvas pixels per drawing pixel
 * @param {{x, y, width, height}} o.room
 * @param {?string} o.ground        a colour, or null for none
 * @param {Array<{stamp, cut, x, y, turn, width, height}>} [o.wears]   what is worn, each on its stamp
 */
export function drawPuppet(ctx, { drawing, places, images, view, room, ground, wears = [] }) {
  const on = new Map();
  for (const w of wears) {
    if (!w.cut || !(w.width > 0)) continue;
    if (!on.has(w.stamp)) on.set(w.stamp, []);
    on.get(w.stamp).push(w);
  }
  drawRig(ctx, { ...drawing, ground }, places, images, view, room,
    on.size ? i => { for (const w of on.get(i) || []) lay(ctx, w, view, room); } : null);
}

/** One cut laid on its spot, turned with its stamp. */
function lay(ctx, w, view, room) {
  ctx.setTransform(view, 0, 0, view, -room.x * view, -room.y * view);
  ctx.translate(w.x, w.y);
  ctx.rotate(w.turn);
  ctx.drawImage(w.cut, -w.width / 2, -w.height / 2, w.width, w.height);
}

/**
 * The room the puppet is drawn in, in the drawing's pixels: its ink, an
 * eye's reach past each tip where an eye is wider than its tip, `past` px
 * more for the mouth, as far as the head may move it (sway.js
 * `reachOfSway`), and a little air. It holds still while the puppet moves,
 * so the avatar keeps its size in OBS.
 *
 * @param {{x, y, w, h}} ink
 * @param {Array<{width}>} tips
 * @param {number} eyeSize
 * @param {number} [moves=0]   px the head may move the drawing
 * @param {number} [past=0]    px the mouth may reach past the ink
 */
export function roomOf(ink, tips, eyeSize, moves = 0, past = 0) {
  const reach = Math.max(0, past, ...tips.map(t => ((eyeSize - 1) * t.width) / 2));
  const pad = Math.ceil(reach + moves + 0.03 * Math.max(ink.w, ink.h));
  return { x: Math.floor(ink.x - pad), y: Math.floor(ink.y - pad), width: Math.ceil(ink.w + 2 * pad), height: Math.ceil(ink.h + 2 * pad) };
}
