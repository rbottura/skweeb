/**
 * save.js — what leaves the shader app: a still or a loop into the vault.
 *
 * One frame saves as a `still`; a loop as a `sequence` at its `fps`, its
 * picture the frame on screen — compose's rule for a picture that moves.
 * The recipe is the panel's values and the chain, `{ …values, chain }`, and
 * nothing else: rebuild.js draws every frame again from them. The seed is
 * the object's when its chain draws at random (rule 2) — a noise does. A
 * surface is made from nothing, so it has no parents.
 *
 * The render is drawn exactly, at the format's size times its scale, by
 * frames.js — the code the replay runs — so the saved picture is the
 * replay's frame.
 */

import { openSurface }   from './frames.js';
import { Vault }         from '../../core/vault.js';
import { thumbFromBlob } from '../../core/thumb.js';
import { toPng }         from '../../core/export.js';
import { drawsAtRandom } from '../../core/gpu/runner.js';
import { FILTERS }       from '../../core/gpu/filters/index.js';

export const APP = { app: 'shader', version: '1.0.0' };

/** What it is, in words: its rows that are on, top to bottom. */
export function titleOf(chain) {
  const names = chain.filter(r => r.on !== false && FILTERS[r.id]).map(r => FILTERS[r.id].label);
  return names.length ? names.slice(0, 4).join(' · ') + (names.length > 4 ? ` · +${names.length - 4}` : '') : 'an empty surface';
}

/**
 * Save what is on screen: a still, or a loop with the frame on screen as its picture.
 *
 * @param {object} args  { params, chain, runner, tick } — `chain` as a recipe has it
 * @returns {Promise<?object>}   the envelope, or null when there is no vault
 */
export async function saveSurface({ params, chain, runner, tick = 0 }) {
  const recipe = { ...params.values, chain };
  const frames = openSurface(recipe, { runner });
  const loop = frames.length > 1;
  const shown = frames.frame(loop ? tick : 0);
  const blob = await toPng(shown);
  return Vault.save({
    type: loop ? 'sequence' : 'still',
    state: true,                        // the project's next state, its smart object's (S6b, core/vault.js)
    title: titleOf(chain) + (loop ? ` ×${frames.length}` : ''),
    tags: ['shader', 'surface', ...(loop ? ['loop'] : [])],
    origin: APP,
    seed: drawsAtRandom(chain) ? recipe.seed : null,
    recipe,
    parents: params.consumedObjectIds(),
    render: {
      blob, ext: 'png', w: shown.width, h: shown.height,
      ...(loop ? { frames: frames.length, fps: frames.fps, loop: true } : {}),
    },
    thumb: await thumbFromBlob(blob),
  });
}
