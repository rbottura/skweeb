/**
 * pointer.js — a joint taken hold of and turned.
 *
 * A bone's far end is its handle: pressed, the bone turns about its own
 * joint to point at the pointer for as long as it is held, carrying what
 * hangs from it (bones.js `turnToward`). Under the pointer, the nearest
 * handle within reach lights; a press on nothing does nothing.
 */

/**
 * @param {object} opts
 * @param {HTMLCanvasElement} opts.canvas
 * @param {(e: PointerEvent) => ?{x, y}} opts.pictureOf   where the pointer is, in the picture's pixels
 * @param {(q: {x, y}) => ?number} opts.handleAt           the bone whose handle is within reach of q, or null
 * @param {(bone: number, q: {x, y}) => void} opts.turn    point a bone at q
 * @param {(bone: ?number) => void} opts.hover             the handle under the pointer changed
 */
export function wireJoints({ canvas, pictureOf, handleAt, turn, hover }) {
  let held = null, lit = null;

  const light = bone => {
    if (bone === lit) return;
    lit = bone;
    canvas.classList.toggle('joint', bone != null);
    hover(bone);
  };

  canvas.addEventListener('pointerdown', e => {
    const q = pictureOf(e);
    const bone = q ? handleAt(q) : null;
    if (bone == null) return;
    held = bone;
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('dragging');
    turn(bone, q);
  });
  canvas.addEventListener('pointermove', e => {
    const q = pictureOf(e);
    if (!q) return;
    if (held != null) return turn(held, q);
    light(handleAt(q));
  });
  const end = () => {
    held = null;
    canvas.classList.remove('dragging');
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { if (held == null) light(null); });
}
