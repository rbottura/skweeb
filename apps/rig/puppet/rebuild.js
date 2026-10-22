/**
 * rebuild.js — what core asks about the puppet's objects (core/rebuild.js,
 * core/reopen.js), its app named `rig/puppet` so core finds this file and
 * this page by the path it always builds, `/apps/<app>/`.
 *
 * A puppet kept is a `params` object: its values the recipe, its picture
 * the avatar as it was worn when sent (keeping.js). Drawn, it is that
 * picture — what it wears is a camera's, live, and no frame of it can be
 * drawn again. Reopened, it is the puppet to wear again, here or in OBS.
 */

import { openPicture } from '../../../core/rebuild.js';

/** Whether an object is a puppet kept: the values of one. */
export const isPuppet = object => !!object && object.type === 'params' && !!object.recipe
  && typeof object.recipe === 'object' && 'eyeSize' in object.recipe;

/** `?open=<id>` wears it again: the vault offers *Open in rig/puppet ↗*. */
export const reopens = isPuppet;

/** Never drawn again at a scale: its picture is a camera's, once. */
export const redraws = () => false;

export async function openObject(object, opts = {}) {
  return openPicture(object, opts.url);
}
