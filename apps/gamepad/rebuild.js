/**
 * rebuild.js — what core asks the gamepad about its objects (C6e,
 * docs/gamepad.md): which it reopens, and which it draws again at a scale.
 *
 * Its objects are recordings of marks — a still's marks, a loop's sequence —
 * and their frames are core's to draw, the stage having moved into core for
 * every app that replays them: a still from its marks (core/stage/still.js),
 * a loop through the player (core/rebuild.js). So `openObject` hands them
 * there, and what is the gamepad's own is taking them back:
 * `/apps/gamepad/?open=<id>` stamps a still's marks again on the ink, or
 * lays a loop on the timeline again (main.js `openRequested`) — the vault
 * offers it as *Open in gamepad ↗* (core/reopen.js).
 */

import { isMarks } from '../../core/reopen.js';

/** A still drawn with marks, or a recording: the gamepad takes either back to work on. A leaf — an image under the ink — has none. */
export const reopens = object => !!object && !!object.recipe && isMarks(object.recipe)
  && (object.type === 'still' || object.type === 'sequence');

/** Drawn again at a scale from its marks, never stretched: every object it reopens. */
export const redraws = reopens;

/** Its frames, core's to draw: a still from its marks, a loop through the player. */
export async function openObject(object, opts = {}) {
  if (object.type === 'still') return (await import('../../core/stage/still.js')).openStill(object, opts);
  return (await import('../../core/rebuild.js')).openSequence(object, opts);
}
