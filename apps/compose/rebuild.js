/**
 * rebuild.js — how a composition replays, for anything that asks.
 *
 * core/rebuild.js hands a recipe it does not know to the app that wrote it,
 * by convention: `/apps/<app>/rebuild.js`, exporting `openObject()`. This is
 * compose's. A composition's recipe is its page and its list, so replaying
 * one is opening every object on it — exactly, or as a preview's draft when
 * the asker says so — and painting the page at the tick asked for, through
 * the same `paintPage` the app draws with (render.js).
 *
 * That makes a composition a thing the vault can play, and a thing another
 * page can place: a page on a page is one more level of the same dispatch,
 * and core's depth guard stops a chain deeper than anyone meant.
 */

import { openComposition, surface } from './render.js';
import { drawFrameInto }            from '../../core/rebuild.js';

/**
 * Whether `/apps/compose/?open=<id>` brings this object back to work on
 * (core/reopen.js): a composition that carries its page and its list.
 *
 * @param {object} object   a vault envelope written by compose
 */
export function reopens(object) {
  return !!object && object.type === 'composition' && !!object.recipe
    && !!object.recipe.page && Array.isArray(object.recipe.place);
}

/**
 * @param {object} object   a composition
 * @param {object} [opts]   `depth`, and `draft` for a live preview's frames
 * @returns {Promise<object>} the handle core/rebuild.js documents
 */
export async function openObject(object, opts = {}) {
  if (!reopens(object)) throw new Error('compose: that object carries no page to replay');
  const c = await openComposition(object.recipe, opts);

  // The page in page pixels, scale 1: a placed page is scaled by its placement,
  // as any picture is. Drawn again only when the tick moves.
  const canvas = surface(c.width, c.height);
  const ctx = canvas.getContext('2d');
  const box = { x: 0, y: 0, w: c.width, h: c.height };
  let shown = -1;

  return {
    length: c.frames,
    fps: c.fps,
    loop: true,
    width: c.width,
    height: c.height,
    bounds: box,
    content: box,
    missing: c.missing,
    frame(i) {
      if (i !== shown) { c.draw(ctx, i, 1); shown = i; }
      return canvas;
    },
    drawInto(target, i, w, h) { drawFrameInto(target, this.frame(i), box, this, w, h); },
    dispose() { c.dispose(); },
  };
}
