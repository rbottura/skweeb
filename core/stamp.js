/**
 * stamp.js — where a stamp lands, for each point a pattern expands to.
 *
 * Pulled out of the gamepad's joyImage.js when the stage moved into core/,
 * and the reason was already written in that file's own comment: the live
 * brush and the sequence player have to derive the same geometry from the
 * same code, because the player works from recorded brush state rather than
 * from baked positions and expands the patterns itself. Two copies of this
 * would be two drawings.
 *
 * Pure: numbers in, numbers out, no canvas and no p5.
 */


export const PATTERNS = ['single', 'mirror-x', 'mirror-y', 'mirror-xy', 'quad'];
export const PATTERN_LABELS = {
  'single':    '⬤  Single',
  'mirror-x':  '⟺  Mirror X',
  'mirror-y':  '⟷  Mirror Y',
  'mirror-xy': '⊞  Mirror XY',
  'quad':      '⊡  Quad',
};

/**
 * Where a stamp lands, for each point a pattern expands to.
 *
 * Pure and free-standing so the live brush and the sequence player derive the
 * same geometry from the same code — the player works from recorded brush
 * state, not from baked positions, so it has to expand patterns itself.
 *
 * @param   {number} x         stamp centre
 * @param   {number} y
 * @param   {number} r         rotation, radians
 * @param   {string} pattern   one of PATTERNS
 * @param   {number} w         canvas width the coordinates are relative to
 * @param   {number} h         canvas height
 * @returns {Array<[number, number, number, number]>} [x, y, rotation, scaleX],
 *          where scaleX is -1 when the stamp is mirrored horizontally.
 */
export function stampPoints(x, y, r, pattern, w, h) {
  switch (pattern) {
    case 'mirror-x':
      return [
        [x,     y, r,  1],
        [w - x, y, -r, -1],
      ];
    case 'mirror-y':
      return [
        [x, y,     r,  1],
        [x, h - y, -r,  1],
      ];
    case 'mirror-xy':
      return [
        [x,     y,      r,  1],
        [w - x, y,     -r, -1],
        [x,     h - y, -r,  1],
        [w - x, h - y,  r, -1],
      ];
    case 'quad': {
      // 4 rotational stamps at 90° intervals around the canvas centre
      const cx = w / 2, cy = h / 2;
      const dx = x - cx, dy = y - cy;
      return [
        [cx + dx,  cy + dy,  r,               1],
        [cx - dy,  cy + dx,  r + Math.PI / 2, 1],
        [cx - dx,  cy - dy,  r + Math.PI,     1],
        [cx + dy,  cy - dx,  r - Math.PI / 2, 1],
      ];
    }
    default: // 'single'
      return [[x, y, r, 1]];
  }
}
