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
 *       -> load the ramp the recipe names, or the vault material it names
 *       -> dither each of those frames, on demand
 *
 * That is the thing the object model has promised since it was written and
 * that nothing had ever done: `parents` is not decoration, it is the only copy
 * of how to make this object again. Nothing was stored to make it work — the
 * envelope written by save.js already held every part of it.
 *
 * It is also the expensive path, and honestly so. A tick here costs a replay
 * of the parent plus a full dither, so a viewer that scrubs backwards pays for
 * it. There is no webm to fall back on — video is frames plus ffmpeg
 * (`docs/decisions.md`, 2026-09-22) — so this is what "play the loop" means
 * for a dithered sequence; a live preview asks for a draft (`opts.draft`).
 *
 * ── Not an import cycle ─────────────────────────────────────────────────────
 *
 * This imports `source.js`, which imports `core/rebuild.js`, which imports
 * this — but only ever through a dynamic `import()` inside a function, so the
 * module graph is acyclic at load time and each side is fully initialised
 * before the other calls it.
 */

import { renderGrid, surface } from './grid.js';
import { Growth }        from './growth.js';
import { ramp, materialTiles } from './materials.js';
import { roleOf }        from '../../core/uses.js';
import { fromVault }     from './source.js';
import { resolveFrame }  from '../../core/frame.js';
import { drawFrameInto } from '../../core/rebuild.js';
import { windowed, canvasFor } from '../../core/windowed.js';

/**
 * Whether `/apps/grid/?open=<id>` brings this object back to work on
 * (core/reopen.js): a dither whose recipe names its source, and a material,
 * which opens in the maker to be edited. A leaf, dithered from a file that was
 * never an object, has nothing to load.
 *
 * @param {object} object   a vault envelope written by grid
 */
export function reopens(object) {
  if (object && object.type === 'set') return roleOf(object) === 'material';
  return !!(object && object.recipe && object.recipe.source);
}

/**
 * Whether grid draws this object again at a scale, rather than stretch its
 * render (core/rebuild.js `openFrames`): a dither whose recipe names its
 * source. Its tiles are drawn at the cell's size times the scale; the source
 * is only ever sampled, one pixel a cell, so it needs no more pixels.
 *
 * @param {object} object   a vault envelope written by grid
 */
export function redraws(object) {
  return !!(object && object.type !== 'set' && object.recipe && object.recipe.source);
}

/**
 * The tiles a recipe dithers with: its vault material when it names one, the
 * shipped ramp otherwise. What could not be found is named, never thrown — a
 * replay with a hole in its ramp still shows the rest.
 */
async function tilesFor(recipe) {
  if (recipe.material) {
    try {
      const m = await materialTiles(recipe.material);
      return { tiles: m.tiles, lost: m.missing.map(id => 'material member ' + id) };
    } catch {
      return { tiles: [], lost: ['material ' + recipe.material] };
    }
  }
  const tiles = await ramp(recipe.ramp);
  return { tiles, lost: tiles.length ? [] : ['material ramp "' + recipe.ramp + '"'] };
}

/**
 * Replay a grid object into frames.
 *
 * @param {object} object   a vault envelope written by grid
 * @param {object} [opts]
 * @param {number} [opts.depth]   how many rebuilds deep this already is
 * @param {boolean} [opts.draft]  a live preview's frames (core/rebuild.js)
 * @param {number} [opts.scale]   frames at this many pixels per pixel of its render
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
  const parent = await fromVault(recipe.source, { depth: opts.depth, draft: opts.draft });
  const { tiles, lost } = await tilesFor(recipe);
  const missing = [...(parent.missing || []), ...lost];

  // The exact dither writes into a fresh surface per frame — see save.js — so
  // the handle keeps whichever one it made last and nothing else. Frames are
  // borrowed, exactly as core/rebuild.js's are.
  // Resolved once: the same frame every tick, for the same reason save.js
  // resolves it outside its loop.
  const frame = resolveFrame(recipe, parent.content, parent);

  // A draft is what grid's own preview draws: the growth never reads back
  // through the source — a jump starts settled — and tiles fill one pattern
  // at a time, into one reused canvas. Played on a compose page, the exact
  // look-back cost 459 ms a skipped tick against 37; saves stay exact.
  const draft = !!opts.draft;
  const into = draft ? surface(1, 1) : null;

  let current = null;
  const growth = new Growth(parent, { draft });   // sprites growing in, looked back for

  // Its own size is its render's: the frame at the recipe's scale, as
  // renderGrid sizes it. Asked for more, the tiles are drawn at more — the
  // size it reports stays its own, so a page places it the same either way.
  const k = opts.scale > 0 ? opts.scale : 1;
  const zoom = Math.max(0.01, recipe.scale || 1);
  const size = { width: Math.max(1, Math.round(frame.width * zoom)),
                 height: Math.max(1, Math.round(frame.height * zoom)) };

  const render = i => {
    const { indices, scales } = growth.at(i, recipe, frame, tiles.length);
    current = renderGrid({ recipe, tiles, frame, indices, scales, draft, into, scale: zoom * k });
    return current.canvas;
  };

  // A print's windows (core/print.js): frame i's cells once, then each window drawn through them.
  let tile = null, cellsOf = null;
  const W = Math.max(1, Math.round(frame.width * zoom * k)), H = Math.max(1, Math.round(frame.height * zoom * k));
  const windowOf = (i, win) => {
    if (!cellsOf || cellsOf.i !== i) cellsOf = { i, ...growth.at(i, recipe, frame, tiles.length) };
    tile = canvasFor(tile, win);
    const ctx = windowed(tile.getContext('2d'), { x: win.x, y: win.y, width: W, height: H });
    renderGrid({ recipe, tiles, frame, indices: cellsOf.indices, scales: cellsOf.scales, draft, scale: zoom * k, ctx });
    return tile;
  };

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

    /** The scale its frames are drawn at: its tiles again, at the size asked. */
    scale: k,

    frame(i) { return render(i); },

    /** A window of frame i at this scale, for a print past any canvas. */
    window(i, win) { return windowOf(i, win); },

    drawInto(ctx, i, w, h) {
      drawFrameInto(ctx, this.frame(i), this.bounds, this, w, h);
    },

    dispose() {
      parent.dispose();
      current = null;
    },
  };
}
