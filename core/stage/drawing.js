/**
 * drawing.js — a gamepad drawing as the rig and the 3D app see it: stamps in
 * the picture's own pixels, each knowing its stroke and how far along the
 * stroke it lies. The rig's until G4 (2026-11-16), when the 3D app swept a
 * body along the same strokes (apps/3d/drawn.js): core's since, as
 * core/sprites.js became when a second app needed it.
 *
 * The stamps are core's, as a print draws the still again (core/stage/
 * still.js `stampsOf`): a mark with a pattern is several — mirrored, turned
 * — and each copy of a stroke is a stroke of its own here, so a mirrored arm
 * bends on its side. Stamps are in the order the gamepad drew them, which is
 * the order they overlap in: the scales. A stroke is a run of marks in that
 * order (strokes.js), so grouping them keeps it.
 *
 * A recorded sequence's events are marks too (`stillOf`), its clip's
 * overrides on them as the player stamps them (player.js `_drawEvent`).
 */

import { stampsOf, hasMarks, spriteKey, spritesOf } from './still.js';
import { strokesOf, pathOf } from './strokes.js';

export { hasMarks, spriteKey, spritesOf };

/**
 * A gamepad drawing's recipe as a still's — `{ canvas, marks }`: a still as
 * it is; a sequence's events its marks, on its canvas, with its clip's
 * family, sprite, pattern and scale over theirs, as the player draws them.
 * A family re-pointed keeps the recorded index: past the family's end, its
 * sprite is not found, as a still's missing sprite is not. Null when there
 * are no marks.
 *
 * @param {object} recipe   a gamepad still's or sequence's
 * @returns {?{canvas: {w: number, h: number}, frame?: object, marks: object[]}}
 */
export function stillOf(recipe) {
  if (hasMarks(recipe)) return recipe;
  const seq = recipe && recipe.sequence;
  if (!seq || !Array.isArray(seq.events) || !seq.events.length) return null;
  const o = (recipe.clip && recipe.clip.overrides) || {};
  const marks = seq.events.map(e => ({
    ...e,
    familyId: o.familyId ?? e.familyId,
    spriteIndex: o.spriteIndex ?? e.spriteIndex,
    pattern: o.pattern ?? e.pattern,
    scale: e.scale * (o.scaleMul ?? 1),
  }));
  return { canvas: { w: seq.w || 0, h: seq.h || 0 }, marks };
}

/**
 * A stroke in `reverse` is read from its last stamp to its first — its
 * line, how far along each stamp lies, and the order of its `stamps` —
 * while the stamps keep the order they were drawn in, and so how they
 * overlap: a limb drawn from its tip in is rigged from the body out.
 *
 * @param {object} recipe          a gamepad still's: { canvas, frame, marks }
 * @param {object} [opts]
 * @param {number} [opts.jump=16]  a lifted pen, px (strokes.js)
 * @param {Iterable<number>} [opts.reverse]   strokes read the other way round
 * @returns {{width: number, height: number, ground: ?string,
 *            stamps: Array<{x, y, rotation, scale, flipX, key, mark, stroke, s}>,  `mark` its mark's index
 *            strokes: Array<{stamps: number[], path: object}>}}
 */
export function drawingOf(recipe, { jump = 16, reverse = [] } = {}) {
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
    return { x, y, rotation, scale, flipX, key, mark, stroke, s: 0 };
  });
  const backwards = new Set(reverse);
  strokes.forEach((stroke, k) => { if (backwards.has(k)) stroke.stamps.reverse(); });
  for (const stroke of strokes) {
    stroke.path = pathOf(stroke.stamps.map(i => stamps[i]));
    stroke.stamps.forEach((i, n) => { stamps[i].s = stroke.path.at[n]; });
  }
  return { width: still.width, height: still.height, ground: still.ground, stamps, strokes };
}
