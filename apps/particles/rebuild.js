/**
 * rebuild.js — how a particles object replays, for anything that asks.
 *
 * The other end of core/rebuild.js's dispatch: the vault's player, compose
 * placing a loop, a print export. A particles object's recipe is the two
 * panels' values, `{ emit, picture }`, and `tick` for a still, so replaying
 * it is opening its sprite set, if it has one, and the object its emitter
 * leaves from, if it is one (core/points.js), and drawing frames with
 * frames.js — the code its save drew with. No GPU, no random that was not
 * seeded: the replay is the render, on any machine.
 *
 * A sprite set that will not open is said, as `missing`, and the particles
 * are dots; an emitter object that will not, and they leave from its centre —
 * drawn all the same, as the app draws with no vault.
 */

import { openParticles } from './frames.js';
import { loadSprites }   from '../../core/sprites.js';
import { loadPoints }    from '../../core/points.js';
import { drawFrameInto } from '../../core/rebuild.js';

const isParticles = object => !!(object && object.recipe && object.recipe.emit && object.recipe.picture);

/** `?open=<id>` brings back a loop or a still, its panels as they were. */
export function reopens(object) {
  return isParticles(object);
}

/**
 * Whether particles draws this object again at a scale rather than stretch
 * its render: always, since a position is a number and a sprite is drawn
 * from its own picture (frames.js, *Sizes*).
 */
export function redraws(object) {
  return isParticles(object);
}

/**
 * Replay a particles object into frames.
 *
 * @param {object} object   a vault envelope written by particles
 * @param {object} [opts]   { scale } — as core/rebuild.js passes them; `draft`
 *                          changes nothing, every frame is already cheap
 * @returns {Promise<object>} the handle core/rebuild.js returns
 */
export async function openObject(object, opts = {}) {
  if (!isParticles(object)) throw new Error('particles: that object has no emitter and picture to replay');
  const recipe = object.recipe;
  const missing = [];
  let sprites = null;
  if (recipe.picture.sprites) {
    try {
      const set = await loadSprites(recipe.picture.sprites);
      sprites = set.images.length ? set.images : null;
      if (!sprites) missing.push(set.title);
    } catch (err) {
      missing.push(recipe.picture.sprites);
    }
  }

  let points = null;
  const { shape, from, glyph } = recipe.emit;
  if (shape === 'object' && from) {
    try {
      points = await loadPoints(from, { glyph });
    } catch {
      missing.push(from);
    }
  }

  const frames = openParticles(recipe, sprites, { scale: opts.scale > 0 ? opts.scale : 1, points });
  const box = { x: 0, y: 0, w: frames.width, h: frames.height };

  return {
    length: frames.length,
    fps: frames.fps || (object.render && object.render.fps) || 0,
    loop: frames.loop,
    width: frames.width,
    height: frames.height,

    /** The whole picture: particles reach where their forces take them, and the ground fills the rest. */
    bounds: box,
    missing,
    scale: frames.scale,

    /** Borrowed, as every frame is: one canvas, drawn again on the next call. */
    frame(i) { return frames.frame(i); },

    drawInto(ctx, i, w, h) { drawFrameInto(ctx, frames.frame(i), box, this, w, h); },

    dispose() {},
  };
}
