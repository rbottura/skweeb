/**
 * save.js — a composition, into the vault.
 *
 * The recipe is the page and what is on it: `{ page, place }`, the page's
 * values and every placement's block, bottom first (docs/smart-objects.md,
 * *Placement*). Every placed object is a parent — the page is made from them
 * — and none is a ref: an ordinary object never changes, so nothing here can
 * go stale. A `.skw` placed live will be the first ref.
 *
 * The render is the page at the tick on screen — pause where the page looks
 * like itself, and that is its picture — at the page's own scale, drawn from
 * exact frames (render.js). Above scale 1 the placed objects' own pixels are
 * scaled up with it; drawing each again at the size the page needs is M4's
 * fifth brick.
 */

import { Vault }         from '../../core/vault.js';
import { thumbFromBlob } from '../../core/thumb.js';
import { toPng }         from '../../core/export.js';
import { labelOf }       from '../../core/frame.js';
import { renderComposition } from './render.js';
import { parentsOf }     from './params.js';

export const APP = { app: 'compose', version: '1.0.0' };

/**
 * @param {{page: object, place: object[]}} recipe   a snapshot, not the live list
 * @param {object} [opts]
 * @param {number} [opts.tick]   the page's tick to draw as the render
 * @returns {Promise<?object>}   the envelope, or null when there is no vault
 */
export async function saveComposition(recipe, { tick = 0 } = {}) {
  const out = await renderComposition(recipe, { tick });
  const blob = await toPng(out.canvas);
  const moving = out.frames > 1;

  return Vault.save({
    type: 'composition',
    state: true,                        // the project's next state, its smart object's (S6b, core/vault.js)
    title: `${labelOf(recipe.page.format)} · ${recipe.place.length} placed`,
    tags: moving ? ['compose', 'loop'] : ['compose'],
    origin: APP,
    seed: null,                        // nothing on a page is drawn at random
    recipe,
    parents: parentsOf(recipe),
    render: {
      blob, ext: 'png',
      w: out.canvas.width, h: out.canvas.height, density: recipe.page.scale || 1,
      ...(moving ? { frames: out.frames, fps: out.fps, loop: true } : {}),
    },
    thumb: await thumbFromBlob(blob),
  });
}
