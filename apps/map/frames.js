/**
 * frames.js — a map's recipe as frames: what a save draws and what a replay
 * draws, the same code, so the two cannot drift.
 *
 * A recipe is `{ map, cells, walls, place }` — the panel's values, a tile
 * index a cell, a flag a cell that cannot be walked, the things standing on
 * it. Opening one brings in its tileset (core/sprites.js) and its things
 * (things.js, through core/rebuild.js) — exact frames, unless a preview asks
 * for drafts. Frame `i` is the map at its tick `i`, every loop on it at its
 * own speed; with nothing moving on it, a map is one frame. Its walls and
 * its events are never drawn: they are what the map does, not how it looks.
 *
 * ── Sizes ──────────────────────────────────────────────────────────────────
 *
 * A map's own size is its grid in its own pixels (grid.js). Asked for
 * `scale` k it is drawn at k times that: its things drawn again by the apps
 * that made them, its tiles from their own pictures.
 */

import { mapSize } from './grid.js';
import { drawMap } from './draw.js';
import { Things }  from './things.js';
import { loadSprites } from '../../core/sprites.js';
import { surface }     from '../../core/surface.js';
import { windowed, canvasFor } from '../../core/windowed.js';

/**
 * What a map is drawn from, opened: its tileset's images and its things —
 * for a replay here, and for the player, which draws at the size it shows.
 *
 * @param {object} recipe            `{ map, cells, walls, place }`
 * @param {object} [opts]            { scale, draft } — as openMap's
 * @returns {Promise<{tiles: ?Array, things: Things, missing: string[]}>}
 */
export async function openParts(recipe, { scale = 1, draft = false } = {}) {
  const m = recipe.map;
  const missing = [];
  let tiles = null;
  if (m.tileset) {
    try {
      const set = await loadSprites(m.tileset);
      tiles = set.images.length ? set.images : null;
      if (!tiles || set.missing) missing.push(set.title);
    } catch {
      missing.push(m.tileset);
    }
  }
  const things = new Things({ onChange() {}, draft, scale });
  await things.load(recipe.place || []);
  for (const p of things.items) if (p.error) missing.push(p.block.ref);
  return { tiles, things, missing };
}

/**
 * @param {object} recipe            `{ map, cells, walls, place }`
 * @param {object} [opts]
 * @param {number} [opts.scale=1]    pixels per pixel of the map's own size
 * @param {boolean} [opts.draft]     a preview's frames, for things that have faster ones
 * @returns {Promise<{length, fps, loop, width, height, scale, missing, frame(i), dispose()}>}
 *          `frame` lends one canvas, drawn again on every call
 */
export async function openMap(recipe, { scale = 1, draft = false } = {}) {
  const m = recipe.map;
  const { tiles, things, missing } = await openParts(recipe, { scale, draft });

  const { width, height } = mapSize(m);
  const W = Math.max(1, Math.round(width * scale)), H = Math.max(1, Math.round(height * scale));
  let canvas = null, tile = null;      // the whole frame's when asked for; a print's windows' (core/print.js)
  const length = things.length(m.fps);

  return {
    length,
    fps: length > 1 ? m.fps : 0,
    loop: length > 1,
    width,
    height,
    scale,
    missing,
    frame(i) {
      canvas = canvas || surface(W, H);
      drawMap(canvas.getContext('2d'), m, scale, { cells: recipe.cells || [], tiles, layers: things.layers(i, m) });
      return canvas;
    },
    /** A window of frame i at this scale: drawn as a frame is, every transform moved by its corner. */
    window(i, win) {
      tile = canvasFor(tile, win);
      const ctx = windowed(tile.getContext('2d'), { x: win.x, y: win.y, width: W, height: H });
      drawMap(ctx, m, scale, { cells: recipe.cells || [], tiles, layers: things.layers(i, m) });
      return tile;
    },
    dispose() { things.dispose(); },         // its things' frames, and their ear for new versions (things.js)
  };
}
