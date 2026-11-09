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
 * A particle is a sprite of a vault set (sprites.js), or a dot; with a
 * palette, in a colour of it (dye.js).
 */

import { mipFor } from '../../core/stamps.js';
import { easing } from '../../core/easing.js';
import { dyed, inkOf } from './dye.js';

/** The canvas a picture needs, in its own pixels: the frame, and its bleed on every side. */
export function pictureSize(picture) {
  const bleed = Math.max(0, Math.round(picture.bleed || 0));
  return { width: picture.width + bleed * 2, height: picture.height + bleed * 2 };
}

/** Nearer than this to the camera, a particle is behind it, or too close to draw. */
const NEAR = 1;

/**
 * The camera: which particles are drawn, in what order, how far each is
 * scaled. A particle `z` deep is seen `focal / (focal + z)` its size, as far
 * from the picture's centre as that says — the picture's plane, z = 0, at
 * 1, exactly as drawn without depth. Stacked by `order` first — the model
 * gives them oldest first, so `over` keeps that and `under` turns it round —
 * then, when anything has depth, the far ones first; a stable sort, so two
 * at one depth keep the stacking. One behind the camera is left out.
 *
 * @param {object[]} particles   oldest first
 * @param {string} order         'over' | 'under'
 * @param {number} focal         px from the camera to the picture's plane
 * @returns {Array<{p: object, k: number}>}   in draw order; `k` the scale
 */
export function drawOrder(particles, order, focal) {
  const f = focal > 0 ? focal : 800;
  const out = [];
  let deep = false;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[order === 'under' ? particles.length - 1 - i : i];
    const z = p.z || 0;
    if (z) deep = true;
    if (f + z < NEAR) continue;
    out.push({ p, k: f / (f + z) });
  }
  if (deep) out.sort((a, b) => (b.p.z || 0) - (a.p.z || 0));
  return out;
}

/**
 * Every particle, stacked by `order` and depth (`drawOrder`): the newest on top — the model gives
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
 * @param {?string[]} [inks]                a palette's colours (core/palettes.js), or none:
 *                                          a dot in the picture's colour, a sprite in its own
 */
export function drawParticles(ctx, particles, picture, scale, sprites = null, inks = null) {
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
  for (const { p, k } of drawOrder(particles, picture.order, picture.focal)) {
    const w = picture.size * scale * k * (1 + (grow - 1) * growing(p.t));
    const alpha = picture.fade ? 1 - fading(p.t) : 1;
    if (w <= 0 || alpha <= 0) continue;
    const x = ox + p.x * k * scale, y = oy + p.y * k * scale;
    ctx.globalAlpha = Math.min(1, alpha);
    const ink = inks ? inkOf(inks, p.dye) : null;
    if (!n) {
      if (ink) ctx.fillStyle = ink;
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
    const level = mipFor(mark, w);
    ctx.drawImage(ink ? dyed(mark, level, ink, picture.tint) : level, -w / 2, -h / 2, w, h);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
}

/**
 * Where an overlay goes: whole, as large as the format allows, centred, its
 * proportions kept — so a sheet made for the format fills it, and on another
 * format nothing of it is cut. On the frame, the bleed outside it. Within a
 * pixel of filling a side, it fills it: A3 is 1080 × 1527, rounded, and a
 * sheet of A3 inside it would leave a hairline of what is under.
 *
 * @param {number} w          the overlay's own width
 * @param {number} h          and its height
 * @param {object} picture    the picture's values (params.js)
 * @returns {{x: number, y: number, w: number, h: number}}   in picture pixels, from the canvas's corner
 */
export function overlayBox(w, h, picture) {
  const bleed = Math.max(0, Math.round(picture.bleed || 0));
  const k = Math.min(picture.width / w, picture.height / h);
  const fw = picture.width - w * k < 1 ? picture.width : w * k;
  const fh = picture.height - h * k < 1 ? picture.height : h * k;
  return { x: bleed + (picture.width - fw) / 2, y: bleed + (picture.height - fh) / 2, w: fw, h: fh };
}

/**
 * A picture in front of what is drawn, fitted to the format (`overlayBox`):
 * from the halving of it nearest above the size it shows, as a sprite is, so
 * at print scale from its own pixels.
 *
 * @param {CanvasRenderingContext2D} ctx   the canvas `drawParticles` drew on
 * @param {object} picture                 the picture's values (params.js)
 * @param {number} scale                   canvas pixels per picture pixel
 * @param {ImageBitmap} image
 */
export function drawOverlay(ctx, picture, scale, image) {
  const box = overlayBox(image.width, image.height, picture);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(mipFor(image, box.w * scale), box.x * scale, box.y * scale, box.w * scale, box.h * scale);
}
