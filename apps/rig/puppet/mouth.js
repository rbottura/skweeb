/**
 * mouth.js — where the author's mouth is in a frame of the camera: a box
 * round it, from the face's points.
 *
 * The box is held to the face, not to the lips: its size is a share of the
 * distance between the eyes — in depth as well as across, as an eye's is
 * (eyes.js) — so a smile widens and an open mouth drops inside it rather
 * than the box growing with them; its middle is between the mouth's
 * corners, which hardly move as it opens, a little below them, where an
 * open mouth goes; and it is turned with the line through the eyes, level
 * as the eyes are (`level`). Wider than tall, `ASPECT`, and faded to an
 * ellipse (crop.js). A mouth is 0.85 of the eyes' distance, corner to
 * corner, closed. Shown as a mirror, it is cut flipped. Pure.
 */

import { frameOf } from './eyes.js';

/** Face Mesh's points at the mouth's corners: the face's right, then its left. */
export const MOUTH_CORNERS = [61, 291];

/** A closed mouth's width, corner to corner, in distances between the eyes' centres. */
export const MOUTH_WIDTH = 0.85;

/** The box's height for its width: room for an open mouth. */
export const ASPECT = 0.75;

/** How far below the corners the box's middle is, in its heights. */
const DROP = 0.15;

/**
 * @param {?Array<{x: number, y: number, z?: number}>} points   a face's, in the camera's pixels
 * @param {object} [opts]
 * @param {number} [opts.around=1.5]    the box's width, in closed mouths
 * @param {boolean} [opts.level=true]   turned with the line through the eyes
 * @returns {?{x: number, y: number, size: number, aspect: number, angle: number}}  null with no face
 */
export function mouthOf(points, { around = 1.5, level = true } = {}) {
  const face = frameOf(points);
  if (!face) return null;
  const [r, l] = MOUTH_CORNERS.map(i => points[i]);
  const size = face.apart * MOUTH_WIDTH * around, angle = level ? face.angle : 0;
  const down = DROP * size * ASPECT, a = face.angle;
  return { x: (r.x + l.x) / 2 - Math.sin(a) * down, y: (r.y + l.y) / 2 + Math.cos(a) * down, size, aspect: ASPECT, angle };
}

/** The mouth as the page shows it: flipped when the page is a mirror. */
export const mouthShown = (box, mirror) => (box ? { ...box, flip: !!mirror } : null);
