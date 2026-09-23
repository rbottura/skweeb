/**
 * rebuild.js — how a grid object replays, for anything that asks.
 *
 * This is the other end of `core/rebuild.js`'s dispatch. Core knows how to
 * replay marks and nothing else; a grid sequence carries no marks, so core
 * loads this file by convention — `/apps/grid/rebuild.js`, exporting
 * `openObject()` — and grid says how its own objects come back.
 *
 * ── The chain, actually walked ──────────────────────────────────────────────
 *
 * A grid sequence's recipe is grid's parameters, and one of them is the id of
 * the loop it was dithered from. So replaying it is:
 *
 *     openSequence(the grid object)
 *       -> openSequence(its source, which is a gamepad recording)
 *            -> load that recording's sprite families, replay its marks
 *       -> load the ramp the recipe names
 *       -> dither each of those frames, on demand
 *
 * That is the thing the object model has promised since it was written and
 * that nothing had ever done: `parents` is not decoration, it is the only copy
 * of how to make this object again. Nothing was stored to make it work — the
 * envelope written by save.js already held every part of it.
 *
 * It is also the expensive path, and honestly so. A tick here costs a replay
 * of the parent plus a full dither, so a viewer that scrubs backwards pays for
 * it. `docs/roadmap.md` still has webm as an open decision; until that lands,
 * this is what "play the loop" means for a dithered sequence.
 *
 * ── Not an import cycle ─────────────────────────────────────────────────────
 *
 * This imports `source.js`, which imports `core/rebuild.js`, which imports
 * this — but only ever through a dynamic `import()` inside a function, so the
 * module graph is acyclic at load time and each side is fully initialised
 * before the other calls it.
 */

import { renderGrid }    from './grid.js';
import { ramp }          from './materials.js';
import { fromVault }     from './source.js';
import { resolveFrame }  from '../../core/frame.js';
import { drawFrameInto } from '../../core/rebuild.js';

/**
 * Whether `/apps/grid/?open=<id>` brings this object back to work on
 * (core/reopen.js): any whose recipe names its source. A leaf, dithered from a
 * file that was never an object, has nothing to load.
 *
 * @param {object} object   a vault envelope written by grid
 */
export function reopens(object) {
  return !!(object && object.recipe && object.recipe.source);
}

/**
 * Replay a grid object into frames.
 *
 * @param {object} object   a vault envelope written by grid
 * @param {object} [opts]
 * @param {number} [opts.depth]  how many rebuilds deep this already is
 * @returns {Promise<object>}    the same handle core/rebuild.js returns
 */
export async function openObject(object, opts = {}) {
  const recipe = object && object.recipe;
  if (!recipe) {
    throw new Error('grid: that object has no recipe — it was saved as a leaf, '
      + 'from an image that was not itself an object, so there is nothing to replay');
  }
  if (!recipe.source) {
    throw new Error('grid: that object names no source to rebuild');
  }

  // The parent, whatever it is. A still comes back as a one-frame handle, so a
  // grid `still` replays as a loop of length 1 rather than as a special case.
  const parent = await fromVault(recipe.source, opts);
  const tiles = await ramp(recipe.ramp);

  const missing = tiles.length
    ? (parent.missing || [])
    : [...(parent.missing || []), 'material ramp "' + recipe.ramp + '"'];

  // The dither writes into a fresh surface per frame — see save.js — so the
  // handle keeps whichever one it made last and nothing else. Frames are
  // borrowed, exactly as core/rebuild.js's are.
  // Resolved once: the same frame every tick, for the same reason save.js
  // resolves it outside its loop.
  const frame = resolveFrame(recipe, parent.content, parent);

  let current = null;

  const render = i => {
    current = renderGrid({ recipe, source: parent.frame(i), tiles, frame });
    return current.canvas;
  };

  // One frame up front, so the handle can answer `width` and `height` before
  // anything asks for a tick. A viewer sizes its canvas from those.
  const first = render(0);
  const size = { width: first.width, height: first.height };

  return {
    length: parent.frames,
    fps:    parent.fps || (object.render && object.render.fps) || 30,
    loop:   parent.loop !== false,

    width:  size.width,
    height: size.height,

    /** The dither fills the whole frame, so the buffer is the frame. */
    bounds: { x: 0, y: 0, w: size.width, h: size.height },

    /**
     * And so is its content, as far as a consumer is concerned. A dither's
     * ground is painted, not absent — `background` fills every empty cell — so
     * there is no transparent margin to trim and the honest content rect is
     * the whole canvas. Trimming a dither of a dither means setting the frame
     * on the inner one.
     */
    content: { x: 0, y: 0, w: size.width, h: size.height },

    missing,

    frame(i) { return render(i); },

    drawInto(ctx, i, w, h) {
      drawFrameInto(ctx, this.frame(i), this.bounds, this, w, h);
    },

    dispose() {
      parent.dispose();
      current = null;
    },
  };
}
