/**
 * crop.js — an eye or the mouth cut out of the camera's picture: its box
 * turned level, drawn into a canvas of its own, flipped when the page is a
 * mirror, and faded to nothing towards its edge.
 *
 * The cut is what the avatar wears (draw.js): drawn as large as the stamp
 * it goes on, so it is cut at about the pixels it will show at — `side`
 * wide, `aspect` times as tall as wide (an eye 1, the mouth wider than
 * tall) — and drawn again every frame the camera gives, into the same
 * canvas. The fade is an ellipse filling it: opaque out to `soft` short of
 * the rim, then gone at it, so the drawing's own colour comes through round
 * what is worn.
 */

import { surface } from '../../../core/surface.js';

/**
 * @param {?(HTMLCanvasElement|OffscreenCanvas)} into   the last cut, reused at the same size
 * @param {CanvasImageSource} source   the camera's <video>, or any picture
 * @param {{x, y, size, aspect?, angle, flip}} box   in the source's pixels: its middle, its width, its turn
 * @param {object} [opts]
 * @param {number} [opts.side=128]    the cut's width, px
 * @param {number} [opts.soft=0.4]    the share of the radius that fades
 * @returns {HTMLCanvasElement|OffscreenCanvas}  the cut
 */
export function cutBox(into, source, box, { side = 128, soft = 0.4 } = {}) {
  const aspect = box.aspect || 1;
  const w = Math.max(8, Math.round(side)), h = Math.max(8, Math.round(side * aspect));
  const canvas = into && into.width === w && into.height === h ? into : surface(w, h);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, w, h);
  // Read backwards: the box's middle to the origin, its width to the cut's,
  // turned level, then flipped, then moved to the cut's middle.
  const k = w / Math.max(1, box.size);
  ctx.translate(w / 2, h / 2);
  if (box.flip) ctx.scale(-1, 1);
  ctx.rotate(-box.angle);
  ctx.scale(k, k);
  ctx.translate(-box.x, -box.y);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0);

  // The fade: a disc of the cut's width, squeezed to its height.
  ctx.setTransform(1, 0, 0, h / w, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  const r = w / 2, fade = Math.max(0.001, Math.min(1, soft));
  const disc = ctx.createRadialGradient(r, r, r * (1 - fade), r, r, r);
  disc.addColorStop(0, 'rgba(0, 0, 0, 1)');
  disc.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = disc;
  ctx.fillRect(0, 0, w, w);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  return canvas;
}
