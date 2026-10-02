/**
 * frames.js — a rig's recipe as frames: what a save draws and a replay
 * draws, the same code, so the two cannot drift.
 *
 * A rig's recipe is `{ rig, bones, turns, waves, box }`: the panel's values —
 * the drawing it rigs among them, and a loop's length and rate — the bones
 * as they were when it was saved, kept whole rather than proposed again, so
 * it replays as it was even once proposals change or a bone has been moved
 * by hand; the pose, a turn a bone; the waves, a bone's each or null
 * (motion.js); and `box`, the part of the picture its ink fills, in the
 * drawing's pixels — over every frame of a loop, so a loop never jitters.
 * With no wave that swings it is one frame: a pose. Frame `i` is the pose
 * and the waves at `i`, and nothing else: no clock, no state, and frame
 * `length` is frame 0. Drawn again from the marks at any scale, so it
 * prints sharp.
 */

import { Vault }        from '../../core/vault.js';
import { familySprite } from '../../core/sprites.js';
import { surface }      from '../../core/surface.js';
import { alphaBounds, union } from '../../core/trim.js';
import { drawingOf, hasMarks, spritesOf } from './drawing.js';
import { posed }        from './bones.js';
import { bind, placeOf } from './skin.js';
import { turnsAt, moves } from './motion.js';
import { drawRig, reachOf } from './draw.js';

/** Whether a recipe is one the rig saved: a pose, or a loop of one. */
export const isPose = recipe => !!recipe && !!recipe.rig && Array.isArray(recipe.bones) && Array.isArray(recipe.turns);

/**
 * A drawing from the vault, opened to be rigged: its recipe and the sprites
 * its marks were stamped with. Throws when it has no marks.
 *
 * @returns {Promise<{object, recipe, images: Map, missing: number}>}
 */
export async function openDrawing(id) {
  const { object } = await Vault.load(id);
  if (!hasMarks(object.recipe)) throw new Error(`${object.title || id} has no marks to rig`);
  const images = new Map();
  let missing = 0;
  await Promise.all([...spritesOf(object.recipe)].map(async ([key, [familyId, index]]) => {
    const image = await familySprite(familyId, index);
    if (image) images.set(key, image);
    else missing++;
  }));
  return { object, recipe: object.recipe, images, missing };
}

/** Where every stamp is, its bones turned. */
export function placesOf(drawing, bones, binds, turns) {
  const at = posed(bones, turns);
  return drawing.stamps.map((s, i) => placeOf(s, binds[i], bones, at));
}

/**
 * Where a pose's ink is, in the drawing's pixels: drawn on the room its
 * stamps could reach and looked at (core/trim.js), as the gamepad trims a
 * still to its content.
 */
export function inkOf(drawing, places, images) {
  const reach = reachOf(drawing, places, images);
  if (!reach) return { x: 0, y: 0, w: drawing.width, h: drawing.height };
  const canvas = surface(reach.w, reach.h), ctx = canvas.getContext('2d');
  drawRig(ctx, { ...drawing, ground: null }, places, images, 1, reach);
  const ink = alphaBounds(ctx.getImageData(0, 0, reach.w, reach.h).data, reach.w, reach.h);
  return ink.w > 0 ? { x: reach.x + ink.x, y: reach.y + ink.y, w: ink.w, h: ink.h } : { x: 0, y: 0, w: drawing.width, h: drawing.height };
}

/**
 * A rig's recipe, ready to draw any frame of: its drawing, how its stamps
 * ride, and where every stamp is at frame `i`.
 *
 * @param {object} recipe   `{ rig, bones, turns, waves }`
 * @param {object} opened   openDrawing's, of `recipe.rig.drawing`
 */
export function framesOf(recipe, opened) {
  const { rig, bones, turns } = recipe, waves = recipe.waves || [];
  const drawing = drawingOf(opened.recipe, { jump: rig.jump });
  const binds = bind(drawing, bones, { bend: rig.bend });
  const loop = moves(bones, waves), length = loop ? Math.max(2, rig.length) : 1;
  const placesAt = i => placesOf(drawing, bones, binds, loop ? turnsAt(bones, turns, waves, i, length) : turns);
  /** The box every frame's ink is in. */
  const ink = () => {
    let box = null;
    for (let i = 0; i < length; i++) box = union(box, inkOf(drawing, placesAt(i), opened.images));
    return box;
  };
  return { drawing, loop, length, fps: loop ? rig.fps : 0, placesAt, ink };
}

/**
 * @param {object} recipe            a rig's: { rig, bones, turns, waves, box }
 * @param {object} [opts]
 * @param {number} [opts.scale=1]    pixels per pixel of its own size
 * @returns {Promise<{length, fps, loop, width, height, scale, missing, frame(i), dispose()}>}
 *          `frame` lends one canvas, drawn again on every call
 */
export async function openRig(recipe, { scale = 1 } = {}) {
  const opened = await openDrawing(recipe.rig.drawing);
  const f = framesOf(recipe, opened);
  const at = recipe.box || f.ink();
  const canvas = surface(Math.max(1, Math.round(at.w * scale)), Math.max(1, Math.round(at.h * scale)));
  const ctx = canvas.getContext('2d');
  return {
    length: f.length,
    fps: f.fps,
    loop: f.loop,
    width: at.w,
    height: at.h,
    scale,
    missing: opened.missing ? [`${opened.missing} sprites of ${opened.object.title || recipe.rig.drawing}`] : [],
    frame(i) {
      drawRig(ctx, f.drawing, f.placesAt(Math.round(i) % f.length), opened.images, scale, at);
      return canvas;
    },
    dispose() {},
  };
}
