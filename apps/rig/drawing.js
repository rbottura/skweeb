/**
 * drawing.js — a gamepad still as the rig sees it: stamps in the picture's
 * own pixels, each knowing its stroke and how far along the stroke it lies.
 *
 * The stamps are core's, as a print draws the still again (core/stage/
 * still.js `stampsOf`): a mark with a pattern is several — mirrored, turned
 * — and each copy of a stroke is a stroke of its own here, so a mirrored arm
 * bends on its side. Stamps are in the order the gamepad drew them, which is
 * the order they overlap in: the scales. A stroke is a run of marks in that
 * order (strokes.js), so grouping them keeps it.
 */

import { stampsOf, hasMarks, spriteKey, spritesOf } from '../../core/stage/still.js';
import { strokesOf, pathOf } from './strokes.js';

export { hasMarks, spriteKey, spritesOf };

/**
 * @param {object} recipe          a gamepad still's: { canvas, frame, marks }
 * @param {object} [opts]
 * @param {number} [opts.jump=16]  a lifted pen, px (strokes.js)
 * @returns {{width: number, height: number, ground: ?string,
 *            stamps: Array<{x, y, rotation, scale, flipX, key, stroke, s}>,
 *            strokes: Array<{stamps: number[], path: object}>}}
 */
export function drawingOf(recipe, { jump = 16 } = {}) {
  const still = stampsOf(recipe);
  const strokeOfMark = [];
  strokesOf(recipe.marks, { jump }).forEach((group, k) => { for (const i of group) strokeOfMark[i] = k; });
  const strokes = [], index = new Map();
  const stamps = still.stamps.map(({ x, y, rotation, scale, flipX, key, mark, copy }, n) => {
    const id = `${strokeOfMark[mark]}:${copy}`;
    if (!index.has(id)) {
      index.set(id, strokes.length);
      strokes.push({ stamps: [] });
    }
    const stroke = index.get(id);
    strokes[stroke].stamps.push(n);
    return { x, y, rotation, scale, flipX, key, stroke, s: 0 };
  });
  for (const stroke of strokes) {
    stroke.path = pathOf(stroke.stamps.map(i => stamps[i]));
    stroke.stamps.forEach((i, n) => { stamps[i].s = stroke.path.at[n]; });
  }
  return { width: still.width, height: still.height, ground: still.ground, stamps, strokes };
}
