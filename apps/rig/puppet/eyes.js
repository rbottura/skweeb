/**
 * eyes.js — where the author's eyes are in a frame of the camera: a box
 * round each, from the face's points, and which stalk takes which.
 *
 * MediaPipe's Face Landmarker gives 478 points a face (face.js); an eye is
 * the sixteen round its lids, and its centre their mean — sixteen points
 * tremble less than any four. Both boxes are one size, `around` eye widths
 * a side — the lids and a little of the face, so a blink shows and a soft
 * edge falls on skin. An eye's width is measured from the distance between
 * the two eyes' centres in depth as well as across, which a turn of the
 * head does not change, where the eye's own width narrows as it turns away:
 * so the eyes keep their size as the head turns. An eye is 0.42 of that
 * distance, corner to corner, on MediaPipe's own portrait (2026-10-22). Both
 * boxes are turned as the line through the two centres is, so an eye is cut
 * level however the head leans (`level`) — or square to the camera, the
 * lean kept in the eye.
 *
 * Which stalk takes which eye is the picture's business, not the face's:
 * the eye on the left of the picture as shown goes to the stalk on the
 * left. Shown as a mirror shows the author — the default — the camera's
 * right-hand eye is on the left, and each eye is cut flipped (`asShown`).
 * Pure: points in, boxes out.
 */

/** Face Mesh's points round each eye's lids, corner to corner and back. */
export const EYE_RINGS = [
  [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],      // the face's right eye
  [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],   // its left
];

/** An eye's width, corner to corner, in distances between the eyes' centres. */
export const EYE_WIDTH = 0.42;

/** The mean of some of the points: x, y, and z where they have it. */
function centreOf(points, ring) {
  let x = 0, y = 0, z = 0;
  for (const i of ring) { x += points[i].x; y += points[i].y; z += points[i].z || 0; }
  return { x: x / ring.length, y: y / ring.length, z: z / ring.length };
}

/**
 * The face's frame, as the eyes give it: their centres left to right in the
 * camera's picture, how far apart they are in depth as well as across, and
 * the way the line through them turns — what the eyes' boxes and the
 * mouth's (mouth.js) are measured by.
 *
 * @param {?Array<{x: number, y: number, z?: number}>} points
 * @returns {?{eyes: Array<{x, y, z}>, apart: number, angle: number}}  null with no face
 */
export function frameOf(points) {
  if (!points || points.length < 468) return null;
  const [a, b] = EYE_RINGS.map(ring => centreOf(points, ring)).sort((p, q) => p.x - q.x);
  return { eyes: [a, b], apart: Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z), angle: Math.atan2(b.y - a.y, b.x - a.x) };
}

/**
 * @param {?Array<{x: number, y: number, z?: number}>} points   a face's, in the camera's pixels — z in the same pixels
 * @param {object} [opts]
 * @param {number} [opts.around=1.8]    a box's side, in eye widths
 * @param {boolean} [opts.level=true]   turned with the line through both eyes
 * @returns {?Array<{x: number, y: number, size: number, angle: number}>}
 *          left to right in the camera's own picture; null with no face
 */
export function eyesOf(points, { around = 1.8, level = true } = {}) {
  const face = frameOf(points);
  if (!face) return null;
  const size = face.apart * EYE_WIDTH * around, angle = level ? face.angle : 0;
  return face.eyes.map(e => ({ x: e.x, y: e.y, size, angle }));
}

/**
 * The eyes left to right as the page shows them, each saying whether it is
 * cut flipped: mirrored, the camera's right-hand eye first.
 *
 * @param {Array<{x, y, size, angle}>} eyes   eyesOf's
 * @param {boolean} mirror
 */
export function asShown(eyes, mirror) {
  return mirror ? eyes.slice().reverse().map(e => ({ ...e, flip: true })) : eyes.map(e => ({ ...e, flip: false }));
}
