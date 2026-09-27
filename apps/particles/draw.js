/**
 * draw.js — particles, drawn: the ground, then every particle alive, oldest
 * first.
 *
 * The one drawing path. The preview calls it at the size the viewer shows,
 * an export will call it at the picture's `scale` — the same picture in more
 * pixels — so it reads no clock and no DOM: it is handed the particles
 * (model.js) and the picture's values, and draws. A position is in the
 * picture's pixels from its centre, so more pixels is a multiplication and
 * never a stretch.
 *
 * A particle is a sprite of a vault set (sprites.js), or a dot.
 */

import { mipFor } from '../../core/stamps.js';
import { easing } from '../../core/easing.js';

/** The canvas a picture needs, in its own pixels: the frame, and its bleed on every side. */
export function pictureSize(picture) {
  const bleed = Math.max(0, Math.round(picture.bleed || 0));
  return { width: picture.width + bleed * 2, height: picture.height + bleed * 2 };
}

/**
 * Every particle, stacked by `order`: the newest on top — the model gives
 * them oldest first — or, `under`, the newest behind, drawn newest first.
 * Redrawn whole every frame, so the order is simply the loop's; nothing
 * needs a composite operation. Each is a sprite of the set —
 * `images[floor(pick × n)]`
 * — or a dot in the picture's colour. Its size runs from `size` to `size ×
 * grow` over its life and its alpha from 1 to 0 when it fades, each along
 * its curve (core/easing.js); a sprite is turned by its `rot`.
 *
 * Drawn in canvas pixels: a sprite from the halving of its picture nearest
 * above the size it shows (core/stamps.js `mipFor`), so at print scale it is
 * drawn again from its own pixels at the larger size, never stretched from a
 * small copy. Each particle has its own size and angle, so there is no stamp
 * to share: one transformed drawImage each.
 *
 * @param {CanvasRenderingContext2D} ctx   a canvas the picture's size times `scale`
 * @param {object[]} particles             from model.js `particlesAt`, oldest first
 * @param {object} picture                 the picture's values (params.js)
 * @param {number} scale                   canvas pixels per picture pixel
 * @param {?Array} [sprites]               a set's images (sprites.js), or none for dots
 */
export function drawParticles(ctx, particles, picture, scale, sprites = null) {
  const { width, height } = pictureSize(picture);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (picture.ground && picture.ground !== 'none') {
    ctx.fillStyle = picture.ground;
    ctx.fillRect(0, 0, width * scale, height * scale);
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = picture.color;

  const ox = (width / 2) * scale, oy = (height / 2) * scale;
  const grow = picture.grow ?? 1;
  const growing = easing(picture.growEase), fading = easing(picture.fadeEase);
  const n = sprites ? sprites.length : 0;
  const under = picture.order === 'under';
  for (let i = 0; i < particles.length; i++) {
    const p = particles[under ? particles.length - 1 - i : i];
    const w = picture.size * scale * (1 + (grow - 1) * growing(p.t));
    const alpha = picture.fade ? 1 - fading(p.t) : 1;
    if (w <= 0 || alpha <= 0) continue;
    const x = ox + p.x * scale, y = oy + p.y * scale;
    ctx.globalAlpha = Math.min(1, alpha);
    if (!n) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.beginPath();
      ctx.arc(x, y, w / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    const mark = sprites[Math.min(n - 1, Math.floor(p.pick * n))];
    const h = w * (mark.height / mark.width);
    const cos = Math.cos(p.rot || 0), sin = Math.sin(p.rot || 0);
    ctx.setTransform(cos, sin, -sin, cos, x, y);
    ctx.drawImage(mipFor(mark, w), -w / 2, -h / 2, w, h);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
}
