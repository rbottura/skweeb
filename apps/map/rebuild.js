/**
 * rebuild.js — how a map replays, for anything that asks.
 *
 * The other end of core/rebuild.js's dispatch: the vault's player, compose
 * placing a map, a print export. A map's recipe is `{ map, cells, place }`,
 * so replaying it is opening its tileset and its things and drawing with
 * frames.js — the code its save drew with. A tileset or a thing that will
 * not open is said, as `missing`, and the rest is drawn.
 */

import { openMap }       from './frames.js';
import { drawFrameInto } from '../../core/rebuild.js';

const isMap = object => !!(object && object.recipe && object.recipe.map && Array.isArray(object.recipe.cells));

/** `?open=<id>` brings a map back: its cells and its things. */
export const reopens = isMap;

/** Drawn again at a scale: its things by their apps, its tiles from their pictures (frames.js, *Sizes*). */
export const redraws = isMap;

/**
 * @param {object} object   a vault envelope written by the map editor
 * @param {object} [opts]   { scale, draft } — as core/rebuild.js passes them
 */
export async function openObject(object, opts = {}) {
  if (!isMap(object)) throw new Error('map: that object has no map to replay');
  const frames = await openMap(object.recipe, { scale: opts.scale > 0 ? opts.scale : 1, draft: !!opts.draft });
  const box = { x: 0, y: 0, w: frames.width, h: frames.height };
  return {
    length: frames.length,
    fps: frames.fps || (object.render && object.render.fps) || 0,
    loop: frames.loop,
    width: frames.width,
    height: frames.height,
    bounds: box,
    missing: frames.missing,
    scale: frames.scale,
    frame(i) { return frames.frame(i); },
    drawInto(ctx, i, w, h) { drawFrameInto(ctx, frames.frame(i), box, this, w, h); },
    dispose() { frames.dispose(); },
  };
}
