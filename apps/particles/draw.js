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
 * Dots for now; a set's sprites come with the stamps renderer
 * (apps/particles/STATUS.md, brick 3).
 */

/** The canvas a picture needs, in its own pixels: the frame, and its bleed on every side. */
export function pictureSize(picture) {
  const bleed = Math.max(0, Math.round(picture.bleed || 0));
  return { width: picture.width + bleed * 2, height: picture.height + bleed * 2 };
}

/**
 * @param {CanvasRenderingContext2D} ctx   a canvas the picture's size times `scale`
 * @param {object[]} particles             from model.js `particlesAt`, oldest first
 * @param {object} picture                 the picture's values (params.js)
 * @param {number} scale                   canvas pixels per picture pixel
 */
export function drawParticles(ctx, particles, picture, scale) {
  const { width, height } = pictureSize(picture);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  if (picture.ground && picture.ground !== 'none') {
    ctx.fillStyle = picture.ground;
    ctx.fillRect(0, 0, width, height);
  }

  ctx.translate(width / 2, height / 2);
  ctx.fillStyle = picture.color;
  const r = picture.size / 2;
  for (const p of particles) {
    ctx.globalAlpha = picture.fade ? 1 - p.t : 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}
