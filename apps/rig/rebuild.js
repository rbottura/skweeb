/**
 * rebuild.js — how what the rig saved replays, for anything that asks; and
 * which objects the rig can take.
 *
 * The other end of core/rebuild.js's dispatch: the vault's player, compose
 * placing a pose or a loop, a print export. A rig's recipe names its drawing
 * and keeps its bones whole, so replaying it is drawing that drawing's marks
 * again where its bones put them, frame by frame (frames.js) — at any scale,
 * sharp.
 *
 * And the link the rig answers for, `gamepad → rig: a drawing's strokes as
 * limbs`: a still with marks — a gamepad drawing — can be rigged, and the
 * vault offers *Rig this ↗* for it (core/reopen.js `rigUrl`).
 */

import { openRig, isPose } from './frames.js';
import { hasMarks }         from './drawing.js';
import { drawFrameInto }    from '../../core/rebuild.js';

const isRigged = object => !!(object && isPose(object.recipe));

/** `?open=<id>` brings a pose or a loop back: its drawing, its bones, its turns and waves. */
export const reopens = isRigged;

/** Drawn again at a scale from its marks, rather than stretched. */
export const redraws = isRigged;

/** What the rig can take: a still that keeps its marks. */
export const rigs = object => !!object && object.type === 'still' && hasMarks(object.recipe);

/**
 * @param {object} object   a vault envelope written by the rig
 * @param {object} [opts]   { scale } — as core/rebuild.js passes it
 */
export async function openObject(object, opts = {}) {
  if (!isRigged(object)) throw new Error('rig: that object has no pose to replay');
  const frames = await openRig(object.recipe, { scale: opts.scale > 0 ? opts.scale : 1 });
  const box = { x: 0, y: 0, w: frames.width, h: frames.height };
  return {
    length: frames.length,
    fps: frames.fps || (object.render && object.render.fps) || 0,
    loop: frames.loop,
    width: frames.width,
    height: frames.height,
    bounds: box,
    missing: frames.missing,
    scale: frames.scale,
    frame(i) { return frames.frame(i); },
    /** A window of frame i at this scale, for a print past any canvas (core/print.js). */
    window(i, win) { return frames.window(i, win); },
    drawInto(ctx, i, w, h) { drawFrameInto(ctx, frames.frame(i), box, this, w, h); },
    dispose() { frames.dispose(); },
  };
}
