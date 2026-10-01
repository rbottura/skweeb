/**
 * frames.js — a rig's recipe as a picture: what a save draws and a replay
 * draws, the same code, so the two cannot drift.
 *
 * A pose's recipe is `{ rig, bones, turns, box }`: the panel's values — the
 * drawing it rigs among them — the bones as they were when it was saved,
 * kept whole rather than proposed again, so a pose replays as it was even
 * once proposals change or a bone has been moved by hand; the turn of each
 * bone; and `box`, the part of the picture its ink fills, in the drawing's
 * pixels. Drawn again from the marks at any scale, so it prints sharp.
 */

import { Vault }        from '../../core/vault.js';
import { familySprite } from '../../core/sprites.js';
import { surface }      from '../../core/surface.js';
import { alphaBounds }  from '../../core/trim.js';
import { drawingOf, hasMarks, spritesOf } from './drawing.js';
import { posed }        from './bones.js';
import { bind, placeOf } from './skin.js';
import { drawRig, reachOf } from './draw.js';

/** Whether a recipe is a pose the rig saved. */
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
 * @param {object} recipe            a pose's: { rig, bones, turns, box }
 * @param {object} [opts]
 * @param {number} [opts.scale=1]    pixels per pixel of the pose's own size
 * @returns {Promise<{length, fps, loop, width, height, scale, missing, frame(i), dispose()}>}
 */
export async function openPose(recipe, { scale = 1 } = {}) {
  const { rig, bones, turns, box } = recipe;
  const opened = await openDrawing(rig.drawing);
  const drawing = drawingOf(opened.recipe, { jump: rig.jump });
  const places = placesOf(drawing, bones, bind(drawing, bones, { bend: rig.bend }), turns);
  const at = box || inkOf(drawing, places, opened.images);
  const canvas = surface(Math.max(1, Math.round(at.w * scale)), Math.max(1, Math.round(at.h * scale)));
  drawRig(canvas.getContext('2d'), drawing, places, opened.images, scale, at);
  return {
    length: 1,
    fps: 0,
    loop: false,
    width: at.w,
    height: at.h,
    scale,
    missing: opened.missing ? [`${opened.missing} sprites of ${opened.object.title || rig.drawing}`] : [],
    frame() { return canvas; },
    dispose() {},
  };
}
