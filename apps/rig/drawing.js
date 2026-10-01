/**
 * drawing.js — a gamepad still as the rig sees it: stamps in the picture's
 * own pixels, each knowing its stroke and how far along the stroke it lies.
 *
 * A still's recipe keeps every mark the gamepad drew, in the gamepad's canvas
 * pixels, and `frame.from`, the part of that canvas its picture shows
 * (apps/gamepad/core/vaultBridge.js). A mark with a pattern is several stamps
 * — mirrored, turned (core/stamp.js `stampPoints`) — and each copy of a
 * stroke is a stroke of its own here, so a mirrored arm bends on its side.
 * Stamps are in the order the gamepad drew them, which is the order they
 * overlap in: the scales.
 */

import { stampPoints } from '../../core/stamp.js';
import { strokesOf, pathOf } from './strokes.js';

/** Whether a still's recipe has marks to rig: a gamepad drawing, not an image under them. */
export const hasMarks = recipe => !!recipe && Array.isArray(recipe.marks) && recipe.marks.length > 0;

/** The key a stamp's picture is found under: its family and sprite. */
export const spriteKey = (familyId, spriteIndex) => `${familyId}#${spriteIndex}`;

/**
 * @param {object} recipe          a gamepad still's: { canvas, frame, marks }
 * @param {object} [opts]
 * @param {number} [opts.jump=16]  a lifted pen, px (strokes.js)
 * @returns {{width: number, height: number, ground: ?string,
 *            stamps: Array<{x, y, rotation, scale, flipX, key, stroke, s}>,
 *            strokes: Array<{stamps: number[], path: object}>}}
 */
export function drawingOf(recipe, { jump = 16 } = {}) {
  const marks = recipe.marks;
  const canvas = recipe.canvas || {};
  const cw = canvas.w || 0, ch = canvas.h || 0;
  const frame = recipe.frame && recipe.frame.from ? recipe.frame : null;
  const from = frame ? frame.from : { x: 0, y: 0, w: cw, h: ch };
  const to = frame && frame.to ? frame.to : { x: 0, y: 0, w: from.w, h: from.h };
  const sx = from.w > 0 ? to.w / from.w : 1, sy = from.h > 0 ? to.h / from.h : 1;
  const width = frame ? frame.w : cw, height = frame ? frame.h : ch;

  const stamps = [], strokes = [], index = new Map();
  strokesOf(marks, { jump }).forEach((group, k) => {
    for (const i of group) {
      const m = marks[i];
      stampPoints(m.x, m.y, m.rotation, m.pattern || 'single', cw, ch).forEach(([x, y, rotation, flipX], copy) => {
        const id = `${k}:${copy}`;
        if (!index.has(id)) {
          index.set(id, strokes.length);
          strokes.push({ stamps: [] });
        }
        const stroke = index.get(id);
        strokes[stroke].stamps.push(stamps.length);
        stamps.push({ x: (x - from.x) * sx + to.x, y: (y - from.y) * sy + to.y, rotation, scale: m.scale * sx, flipX,
                      key: spriteKey(m.familyId, m.spriteIndex), stroke, s: 0 });
      });
    }
  });
  for (const stroke of strokes) {
    stroke.path = pathOf(stroke.stamps.map(i => stamps[i]));
    stroke.stamps.forEach((i, n) => { stamps[i].s = stroke.path.at[n]; });
  }
  const ground = canvas.background && canvas.background !== 'none' ? canvas.background : null;
  return { width, height, ground, stamps, strokes };
}

/** Every sprite a drawing draws with, once: `[familyId, spriteIndex]` by key. */
export function spritesOf(recipe) {
  const out = new Map();
  for (const m of recipe.marks || []) out.set(spriteKey(m.familyId, m.spriteIndex), [m.familyId, m.spriteIndex]);
  return out;
}
