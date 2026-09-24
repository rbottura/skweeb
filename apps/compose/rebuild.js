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
import { PLACEABLE }                from './params.js';
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
 * Whether a compose page takes this object (core/reopen.js `placeUrl`), so
 * the vault can offer to place it: anything core gives frames of.
 *
 * @param {object} object   a vault envelope, from any app
 */
export function places(object) {
  return !!object && PLACEABLE.includes(object.type);
}

/**
 * Whether compose draws this object again at a scale, rather than stretch its
 * render (core/rebuild.js `openFrames`): every composition — each object on it
 * is asked, in turn, for the size it will be printed at.
 */
export const redraws = reopens;

/**
 * @param {object} object   a composition
 * @param {object} [opts]   `depth`; `draft` for a live preview's frames; and
 *                          `scale`, frames at that many pixels per pixel of its render
 * @returns {Promise<object>} the handle core/rebuild.js documents
 */
export async function openObject(object, opts = {}) {
  if (!reopens(object)) throw new Error('compose: that object carries no page to replay');

  // Its own size is its render's: the page at the page's scale, as a save
  // draws it. Asked for more, every object on it is drawn at more.
  const own = object.recipe.page.scale || 1;
  const k = opts.scale > 0 ? opts.scale : 1;
  const c = await openComposition(object.recipe, { depth: opts.depth, draft: opts.draft, scale: own * k });

  const size = { width: Math.max(1, Math.round(c.width * own)), height: Math.max(1, Math.round(c.height * own)) };
  const canvas = surface(size.width * k, size.height * k);
  const ctx = canvas.getContext('2d');
  const box = { x: 0, y: 0, w: size.width, h: size.height };
  let shown = -1;

  return {
    length: c.frames,
    fps: c.fps,
    loop: true,
    width: size.width,
    height: size.height,
    bounds: box,
    content: box,
    missing: c.missing,
    scale: k,
    frame(i) {
      if (i !== shown) { c.draw(ctx, i, own * k); shown = i; }
      return canvas;
    },
    drawInto(target, i, w, h) { drawFrameInto(target, this.frame(i), box, this, w, h); },
    dispose() { c.dispose(); },
  };
}
