/**
 * save.js — a map into the vault, or its picture to disk.
 *
 * The recipe is `{ map, cells, walls, place }` and nothing else; its picture
 * is the map at its own pixels, drawn by frames.js — the code a replay draws
 * with — every loop on it at the frame on screen, and never its walls or its
 * events, which are guides. A map with loops on it saves with its frames and
 * rate, as a page that moves does. Its parents are what it is made of: the
 * tileset, read off its panel by `consumedObjectIds()`, every thing standing
 * on it, and what a sign shows — once each.
 */

import { openMap }       from './frames.js';
import { Vault }         from '../../core/vault.js';
import { thumbFromBlob } from '../../core/thumb.js';
import { toPng, download } from '../../core/export.js';

export const APP = { app: 'map', version: '1.0.0' };

/** A map's recipe from the editor: the panel's values, the cells, the walls, the blocks. */
export const recipeOf = (map, cells, walls, place) => ({ map: map.values, cells: cells.slice(), walls: walls.slice(), place });

/** What a map is made of besides its panel's tileset: each thing's object, and what a sign shows. */
export function partsOf(place) {
  const ids = [];
  for (const b of place) {
    for (const id of [b.ref, b.event === 'sign' ? b.shows : null]) if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

/**
 * @param {object} args
 * @param {object} args.map      the map's Params
 * @param {number[]} args.cells
 * @param {number[]} args.walls  a flag a cell
 * @param {object[]} args.place  the things' blocks
 * @param {number} [args.tick]   the frame on screen
 * @returns {Promise<?object>}   the envelope, or null when there is no vault
 */
export async function saveMap({ map, cells, walls, place, tick = 0 }) {
  const recipe = recipeOf(map, cells, walls, place);
  const frames = await openMap(recipe);
  try {
    const loop = frames.length > 1;
    const shown = frames.frame(loop ? tick % frames.length : 0);
    const blob = await toPng(shown);
    const parents = map.consumedObjectIds();
    for (const id of partsOf(place)) if (!parents.includes(id)) parents.push(id);
    return await Vault.save({
      type: 'map',
      state: true,                        // the project's next state, its smart object's (S6b, core/vault.js)
      title: recipe.map.name || 'a map',
      tags: ['map', ...(loop ? ['loop'] : [])],
      origin: APP,
      seed: null,
      recipe,
      parents,
      render: { blob, ext: 'png', w: shown.width, h: shown.height,
                ...(loop ? { frames: frames.length, fps: frames.fps, loop: true } : {}) },
      thumb: await thumbFromBlob(blob),
    });
  } finally {
    frames.dispose();
  }
}

/** The frame on screen as a PNG, at the map's own pixels. */
export async function downloadPicture({ map, cells, walls, place, tick = 0 }) {
  const recipe = recipeOf(map, cells, walls, place);
  const frames = await openMap(recipe);
  try {
    const shown = frames.frame(frames.length > 1 ? tick % frames.length : 0);
    download(await toPng(shown), `map_${(recipe.map.name || 'map').replace(/\W+/g, '-')}_${shown.width}x${shown.height}.png`);
    return { width: shown.width, height: shown.height };
  } finally {
    frames.dispose();
  }
}
