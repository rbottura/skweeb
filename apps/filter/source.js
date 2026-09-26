/**
 * source.js — what is being filtered, as frames.
 *
 * Any object comes through core's openFrames(): a still or a shape as its
 * render, a sequence or a composition that moves replayed by the app that
 * made it. A file off disk comes as its picture, so the app works with no
 * vault at all (rule 7). Either way it leaves here as one handle: a size, a
 * frame count and rate, and frame(i).
 *
 * frame(i) is the object's frame, drawn into one canvas the size of the
 * object: its ink over the whole loop (`bounds`), as compose sizes a
 * placement — a gamepad loop is 1812 × 811, not the 1920 × 945 screen it was
 * drawn on. The same box for every frame, never one frame's own, or the
 * picture would slide under the filters. The canvas is borrowed: the next
 * call redraws it.
 *
 * At a `scale`, the frames have that many pixels per pixel of the object's
 * own size — drawn again by the source's app where it can, stretched where it
 * cannot — and `scale` on the handle says which: what the source really drew
 * at (core/rebuild.js). `width` and `height` stay the object's own.
 */

import { Vault }      from '../../core/vault.js';
import { openFrames } from '../../core/rebuild.js';

const surface = (w, h) => (typeof OffscreenCanvas !== 'undefined'
  ? new OffscreenCanvas(w, h)
  : Object.assign(document.createElement('canvas'), { width: w, height: h }));

function wrap(frames, { id, title, scale = 1 }) {
  const box = frames.bounds || { x: 0, y: 0, w: frames.width, h: frames.height };
  const w = Math.max(1, Math.round(box.w));
  const h = Math.max(1, Math.round(box.h));
  const canvas = surface(Math.max(1, Math.round(box.w * scale)), Math.max(1, Math.round(box.h * scale)));
  const ctx = canvas.getContext('2d');
  return {
    id,
    title,
    width: w,
    height: h,
    density: scale,                    // pixels per pixel of what frame() hands out
    scale: frames.scale || 1,          // the detail the source really drew
    frames: frames.length,
    fps: frames.fps || 0,
    loop: frames.loop !== false,
    missing: frames.missing || [],
    frame(i) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.translate(-box.x * scale, -box.y * scale);
      frames.drawInto(ctx, i, frames.width * scale, frames.height * scale);
      return canvas;
    },
    dispose() { frames.dispose(); },
  };
}

/**
 * A vault object, by id.
 * @param {string} id
 * @param {object} [opts]
 * @param {boolean} [opts.draft=true]  a preview's frames; a save asks for exact ones
 * @param {number} [opts.scale=1]
 * @param {number} [opts.depth]        how many rebuilds deep this already is
 */
export async function fromVault(id, { draft = true, scale = 1, depth } = {}) {
  const { object, url } = await Vault.load(id);
  const frames = await openFrames(object, { url, draft, scale, depth });
  return wrap(frames, { id, title: object.title || id, scale });
}

/** A file off disk. No id: anything made from it is a leaf. */
export async function fromFile(file) {
  const bitmap = await createImageBitmap(file);
  return wrap({
    length: 1, fps: 0, loop: false, width: bitmap.width, height: bitmap.height,
    drawInto(ctx, i, w, h) { ctx.drawImage(bitmap, 0, 0, w, h); },
    dispose() { bitmap.close(); },
  }, { id: null, title: file.name || 'a file' });
}
