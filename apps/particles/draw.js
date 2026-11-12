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
 * palette, in a colour of it (dye.js). Its picture's layers (core/layers.js,
 * L13b — its overlay of G3 made a list) are laid by core's drawing, the ones
 * behind between the ground and the particles, the rest in front.
 */

import { mipFor } from '../../core/stamps.js';
import { easing } from '../../core/easing.js';
import { dyed, inkOf } from './dye.js';
import { drawSide } from '../../core/layers-draw.js';
import { formatOf } from '../../core/layers.js';

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
 * A particle's size as it is born, in picture pixels: the picture's for all,
 * or its own between the two, by its `gauge` (model.js). Min above max is the
 * same range turned over.
 */
export function bornSize(picture, p) {
  return picture.sizeRandom ? picture.sizeMin + (picture.sizeMax - picture.sizeMin) * p.gauge : picture.size;
}

/**
 * Every particle, stacked by `order` and depth (`drawOrder`): the newest on top — the model gives
 * them oldest first — or, `under`, the newest behind, drawn newest first.
 * Redrawn whole every frame, so the order is simply the loop's; nothing
 * needs a composite operation. Each is a sprite of the set —
 * `images[floor(pick × n)]`
 * — or a dot in the picture's colour. Its size runs from `bornSize` to that ×
 * `grow` over its life and its alpha from 1 to 0 when it fades, each along
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
 * @param {?(ctx) => void} [behind]         what stands behind the particles, over the ground: its layers set behind
 */
export function drawParticles(ctx, particles, picture, scale, sprites = null, inks = null, behind = null) {
  const { width, height } = pictureSize(picture);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  if (picture.ground && picture.ground !== 'none') {
    ctx.fillStyle = picture.ground;
    ctx.fillRect(0, 0, width * scale, height * scale);
  }
  if (behind) behind(ctx);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.fillStyle = picture.color;

  const ox = (width / 2) * scale, oy = (height / 2) * scale;
  const grow = picture.grow ?? 1;
  const growing = easing(picture.growEase), fading = easing(picture.fadeEase);
  const n = sprites ? sprites.length : 0;
  for (const { p, k } of drawOrder(particles, picture.order, picture.focal)) {
    const w = bornSize(picture, p) * scale * k * (1 + (grow - 1) * growing(p.t));
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
 * A frame whole: the ground, the particles, and its layers where each is set
 * — behind the particles over the ground, or in front of them — fitted to
 * the format (core/layers.js `layerBox`: G3's `overlayBox`, so its overlay
 * draws as it did, to the pixel). The one path the preview, a save, a replay
 * and a print draw through.
 *
 * @param {object[]} [layers]   its layers, opened and laid (core/layers-draw.js `laidOn`)
 * @param {number} [tick]       the frame on screen: a loop's own frame of it
 */
export function drawPicture(ctx, particles, picture, scale, sprites = null, inks = null, layers = [], tick = 0) {
  const fmt = formatOf(picture);
  const behind = layers.some(o => o.layer.at === 'behind'), front = layers.some(o => o.layer.at !== 'behind');
  drawParticles(ctx, particles, picture, scale, sprites, inks, behind ? c => drawSide(c, layers, 'behind', fmt, scale, tick) : null);
  if (front) drawSide(ctx, layers, 'front', fmt, scale, tick);
}
