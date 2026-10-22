/**
 * head.js — which way the author's head is turned, from MediaPipe's face
 * transform (face.js): a 4 × 4 matrix, column by column, that carries a
 * face model looking at the camera to where the face is.
 *
 * Its space is the camera's: x to the right of the camera's picture, y up,
 * z towards the viewer, in centimetres. A face looking straight at the
 * camera is the model unturned; turned, the model's forward axis — the
 * matrix's third column — and its up axis — the second — say how: `yaw`,
 * the face turned towards the picture's right; `pitch`, looking up; `roll`,
 * the top of the head leaning towards the picture's right; `x`, the face
 * that far to the picture's right of the camera. Measured on MediaPipe's
 * own portrait, upright, turned 15° either way on the screen, and mirrored
 * (2026-10-22): a picture turned clockwise reads roll +14°, mirrored every
 * sign but pitch's changes. Shown as a mirror, the picture's right is the
 * author's other side.
 *
 * Straight is the author's own, not the camera's: a camera above the screen
 * sees a head bent to it. The head is measured from where it was over its
 * first second in front of the camera, or whenever the author says it is
 * straight now (`straight`). Pure but for that memory.
 */

/**
 * @param {?ArrayLike<number>} m   the face transform, 16 numbers column by column
 * @returns {?{yaw: number, pitch: number, roll: number, x: number}}  radians, and cm
 */
export function poseOf(m) {
  if (!m || m.length < 16) return null;
  const fx = m[8], fy = m[9], fz = m[10];
  return { yaw: Math.atan2(fx, fz), pitch: Math.atan2(fy, Math.hypot(fx, fz)), roll: Math.atan2(m[4], m[5]), x: m[12] };
}

/** A pose as the page shows it: mirrored, the picture's right is the other side. */
export const asShownPose = (pose, mirror) => (pose && mirror ? { ...pose, yaw: -pose.yaw, roll: -pose.roll, x: -pose.x } : pose);

const KEYS = ['yaw', 'pitch', 'roll', 'x'];

/**
 * Where straight is: learnt over the first `settle` seconds a face is seen,
 * or taken at once by `now()`; each pose then measured from it.
 *
 * @param {object} [opts]
 * @param {number} [opts.settle=1]   seconds of a face to learn straight from
 */
export function straight({ settle = 1 } = {}) {
  let rest = null, sum = null, n = 0, since = null, last = null;
  return {
    /** A pose from straight: null until straight is learnt, or with no face. */
    from(pose, time) {
      if (!pose) return null;
      last = pose;
      if (!rest) {
        if (since === null) { since = time; sum = { yaw: 0, pitch: 0, roll: 0, x: 0 }; n = 0; }
        for (const k of KEYS) sum[k] += pose[k];
        n++;
        if (time - since < settle) return null;
        rest = Object.fromEntries(KEYS.map(k => [k, sum[k] / n]));
      }
      return Object.fromEntries(KEYS.map(k => [k, pose[k] - rest[k]]));
    },
    /** The head as it is now is straight. */
    now() { if (last) rest = { ...last }; },
    /** Learn it again from the next face. */
    reset() { rest = null; since = null; },
    get learnt() { return !!rest; },
  };
}
