/**
 * save.js — a pose into the vault, or its picture to disk.
 *
 * A pose is a still the rig made: its recipe `{ rig, bones, turns, box }`
 * (frames.js), its picture drawn by frames.js `openPose` — the code a
 * replay draws with — cropped to its ink as the gamepad crops a still. Its
 * parent is the drawing it rigs, read off the panel by `consumedObjectIds()`.
 */

import { openPose, inkOf, placesOf } from './frames.js';
import { bind }          from './skin.js';
import { Vault }         from '../../core/vault.js';
import { thumbFromBlob } from '../../core/thumb.js';
import { toPng, download } from '../../core/export.js';

export const APP = { app: 'rig', version: '1.0.0' };

/**
 * A pose's recipe from the editor: its values, its bones whole, a turn for
 * each bone, and the box its ink fills.
 *
 * @param {object} params       the rig's Params
 * @param {object} drawing      drawing.js `drawingOf`, as drawn now
 * @param {object[]} bones
 * @param {number[]} turns      by bone id; missing is 0
 * @param {Map} images          the drawing's sprites
 */
export function recipeOf(params, drawing, bones, turns, images) {
  const values = params.values;
  const dense = bones.map(b => turns[b.id] || 0);
  const box = inkOf(drawing, placesOf(drawing, bones, bind(drawing, bones, { bend: values.bend }), dense), images);
  return { rig: values, bones: bones.map(b => ({ ...b })), turns: dense, box };
}

/**
 * @param {object} args   { params, drawing, bones, turns, images, title } — the drawing's title for the pose's
 * @returns {Promise<?object>}   the envelope, or null when there is no vault
 */
export async function savePose({ params, drawing, bones, turns, images, title }) {
  const recipe = recipeOf(params, drawing, bones, turns, images);
  const frames = await openPose(recipe);
  const shown = frames.frame(0);
  const blob = await toPng(shown);
  const posedAtAll = recipe.turns.some(t => t);
  return Vault.save({
    type: 'still',
    title: `${title || 'a drawing'} · ${posedAtAll ? 'posed' : 'at rest'}`,
    tags: ['rig'],
    origin: APP,
    seed: null,
    recipe,
    parents: params.consumedObjectIds(),
    render: { blob, ext: 'png', w: shown.width, h: shown.height },
    thumb: await thumbFromBlob(blob),
  });
}

/** The pose as a PNG, at its own pixels. */
export async function downloadPose({ params, drawing, bones, turns, images, title }) {
  const frames = await openPose(recipeOf(params, drawing, bones, turns, images));
  const shown = frames.frame(0);
  download(await toPng(shown), `rig_${(title || 'pose').replace(/\W+/g, '-')}_${shown.width}x${shown.height}.png`);
  return { width: shown.width, height: shown.height };
}
