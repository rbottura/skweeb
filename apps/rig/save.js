/**
 * save.js — a rig into the vault, or its picture to disk.
 *
 * What the rig saves is its drawing as rigged: a pose, a still — or, when a
 * bone swings, a loop, a sequence with its frames and rate, as a page that
 * moves saves. Its recipe is `{ rig, bones, turns, waves, box }` (frames.js),
 * its picture drawn by frames.js — the code a replay draws with — at the
 * frame on screen, cropped to the ink of every frame as the gamepad crops a
 * still. Its parent is the drawing it rigs, read off the panel by
 * `consumedObjectIds()`.
 */

import { openRig, framesOf } from './frames.js';
import { isStill }       from './motion.js';
import { Vault }         from '../../core/vault.js';
import { thumbFromBlob } from '../../core/thumb.js';
import { toPng, download } from '../../core/export.js';

export const APP = { app: 'rig', version: '1.0.0' };

/**
 * A rig's recipe from the editor: its values, its bones whole, a turn a bone,
 * a wave a bone when any swings, and the box its ink fills.
 *
 * @param {object} args   { params, opened, bones, turns, waves } — `opened` frames.js `openDrawing`'s
 */
export function recipeOf({ params, opened, bones, turns, waves }) {
  const recipe = { rig: params.values, bones: bones.map(b => ({ ...b })), turns: bones.map(b => turns[b.id] || 0) };
  const swinging = bones.map(b => (isStill(waves[b.id]) ? null : { ...waves[b.id] }));
  if (swinging.some(Boolean)) recipe.waves = swinging;
  recipe.box = framesOf(recipe, opened).ink();
  return recipe;
}

/**
 * @param {object} args   recipeOf's, and `title` — the drawing's — and `tick`, the frame on screen
 * @returns {Promise<?object>}   the envelope, or null when there is no vault
 */
export async function saveRig(args) {
  const recipe = recipeOf(args);
  const frames = await openRig(recipe);
  const loop = frames.loop;
  const shown = frames.frame(loop ? (args.tick || 0) % frames.length : 0);
  const blob = await toPng(shown);
  const turned = recipe.turns.some(t => t);
  return Vault.save({
    type: loop ? 'sequence' : 'still',
    title: `${args.title || 'a drawing'} · ${loop ? 'moving' : turned ? 'posed' : 'at rest'}`,
    tags: ['rig', ...(loop ? ['loop'] : [])],
    origin: APP,
    seed: null,
    recipe,
    parents: args.params.consumedObjectIds(),
    render: { blob, ext: 'png', w: shown.width, h: shown.height,
              ...(loop ? { frames: frames.length, fps: frames.fps, loop: true } : {}) },
    thumb: await thumbFromBlob(blob),
  });
}

/** The frame on screen as a PNG, at its own pixels. */
export async function downloadRig(args) {
  const frames = await openRig(recipeOf(args));
  const shown = frames.frame(frames.loop ? (args.tick || 0) % frames.length : 0);
  download(await toPng(shown), `rig_${(args.title || 'pose').replace(/\W+/g, '-')}_${shown.width}x${shown.height}.png`);
  return { width: shown.width, height: shown.height };
}
