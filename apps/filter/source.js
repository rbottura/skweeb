/**
 * source.js — what is being filtered, as whole frames.
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
 */

import { Vault }      from '../../core/vault.js';
import { openFrames } from '../../core/rebuild.js';

const surface = (w, h) => (typeof OffscreenCanvas !== 'undefined'
  ? new OffscreenCanvas(w, h)
  : Object.assign(document.createElement('canvas'), { width: w, height: h }));

function wrap(frames, { id, title }) {
  const box = frames.bounds || { x: 0, y: 0, w: frames.width, h: frames.height };
  const w = Math.max(1, Math.round(box.w));
  const h = Math.max(1, Math.round(box.h));
  const canvas = surface(w, h);
  const ctx = canvas.getContext('2d');
  return {
    id,
    title,
    width: w,
    height: h,
    frames: frames.length,
    fps: frames.fps || 0,
    loop: frames.loop !== false,
    frame(i) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.translate(-box.x, -box.y);
      frames.drawInto(ctx, i, frames.width, frames.height);
      return canvas;
    },
    dispose() { frames.dispose(); },
  };
}

/** A vault object, by id — a preview's frames, the faster path where its app has one. */
export async function fromVault(id) {
  const { object, url } = await Vault.load(id);
  return wrap(await openFrames(object, { url, draft: true }), { id, title: object.title || id });
}

/** A file off disk. No id: anything made from it will be a leaf. */
export async function fromFile(file) {
  const bitmap = await createImageBitmap(file);
  return wrap({
    length: 1, fps: 0, loop: false, width: bitmap.width, height: bitmap.height,
    drawInto(ctx, i, w, h) { ctx.drawImage(bitmap, 0, 0, w, h); },
    dispose() { bitmap.close(); },
  }, { id: null, title: file.name || 'a file' });
}
