/**
 * render.js — a composition drawn from its recipe, the exact way.
 *
 * The preview draws from a preview's frames (placements.js asks for drafts).
 * Whatever leaves compose — a save now, a replay and an export next — is
 * drawn here instead, from every placed object opened exactly and let go
 * after. The same `paintPage` and the same time as the preview: only the
 * frames differ, and only where an app has a faster way to make them.
 */

import { Vault }      from '../../core/vault.js';
import { openFrames } from '../../core/rebuild.js';
import { lookOver }   from '../../core/gpu/look.js';
import { Placements } from './placements.js';
import { paintPage, pageSize } from './page.js';

/**
 * A drawing surface, off screen. Grid and ckt each have these few lines too —
 * copied rather than imported, so no app needs another installed (rule 7).
 */
export function surface(w, h) {
  const width = Math.max(1, Math.round(w));
  const height = Math.max(1, Math.round(h));
  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * A composition opened: every placement's object in exact frames — or, for a
 * page placed live on another page, a preview's (`draft`), as that page asks.
 *
 * Each object is asked for frames at the size it will be drawn: its scale on
 * the page times the page's `scale` (core/rebuild.js `openFrames`), so at
 * print scale its app draws it again rather than its pixels being stretched.
 * What could only be stretched — a picture with no app to draw it again — is
 * named in `stretched`.
 *
 * @param {{page: object, place: object[]}} recipe
 * @param {object} [opts]
 * @param {number} [opts.depth]    how many rebuilds deep this already is (core/rebuild.js)
 * @param {boolean} [opts.draft]   a live preview's frames
 * @param {number} [opts.scale=1]  output pixels per page pixel
 */
export async function openComposition(recipe, { depth = 0, draft = false, scale = 1 } = {}) {
  const asked = block => (block.transform.scale || 1) * scale;
  const list = new Placements({
    load: async (ref, block) => {
      const { object, url, thumbUrl } = await Vault.load(ref);
      const handle = await openFrames(object, { url, depth, draft, scale: asked(block) });
      return { object, handle: await lookOver(handle, block.look), thumb: thumbUrl };
    },
  });
  for (const block of recipe.place || []) list.add(block);
  await Promise.all(list.items.map(p => p.opening));

  const page = recipe.page;
  const size = pageSize(page);
  return {
    frames: list.frames(page.fps),
    fps: page.fps,
    width: size.width,
    height: size.height,
    /** What could not be opened, by id: drawn without. */
    missing: list.items.filter(p => p.error).map(p => p.block.ref),
    /** What is drawn larger than its pixels, having no app to draw it again, by title. */
    stretched: list.items.filter(p => p.handle && asked(p.block) > 1
      && (p.handle.scale || 1) < asked(p.block) - 1e-9).map(p => p.title),
    /** The page at one of its ticks, onto a context the page's size times `scale`. */
    draw(ctx, tick, scale) { paintPage(ctx, page, list.layers(tick, page.fps), scale); },
    dispose() { for (const p of [...list.items]) list.remove(p); },
  };
}

/**
 * The page at one tick, at the page's own scale, on a surface of its own.
 * Refuses a page with an object it could not open: a composition saved
 * without one of its parts would not be the one its recipe describes.
 *
 * @returns {Promise<{canvas, frames: number, fps: number, stretched: string[]}>}
 */
export async function renderComposition(recipe, { tick = 0, scale = recipe.page.scale || 1 } = {}) {
  const c = await openComposition(recipe, { scale });
  try {
    if (c.missing.length) throw new Error(`${c.missing.join(', ')} could not be opened`);
    const canvas = surface(c.width * scale, c.height * scale);
    c.draw(canvas.getContext('2d'), tick, scale);
    return { canvas, frames: c.frames, fps: c.fps, stretched: c.stretched };
  } finally {
    c.dispose();
  }
}
