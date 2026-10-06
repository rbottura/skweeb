/**
 * still.js — a gamepad still drawn again from its marks: at any scale, and
 * any window of it.
 *
 * A still's recipe keeps every mark the gamepad drew, in its canvas's pixels,
 * and `frame`, the part of that canvas its picture shows (apps/gamepad/core/
 * vaultBridge.js, stillFrame.js). Its render is those marks composited once,
 * at the canvas's size: right at its own size, its pixels enlarged at a
 * print's. So past its own size it is drawn again — each mark stamped as the
 * brush and the player stamp one (joyImage.js `_drawTo`, player.js
 * `_drawEvent`), a pattern expanded by stamp.js, every sprite drawn from its
 * own pixels — through any window a print asks for (core/print.js), clipped
 * to what the render shows of the canvas.
 *
 * The rig sees a still as these same stamps and puts its strokes on them
 * (apps/rig/drawing.js): two copies of this would be two drawings.
 *
 * Reached through core/rebuild.js `openFrames` by a dynamic import, as an
 * app's rebuild.js is, so the module graph stays acyclic at load.
 */

import { stampPoints }         from '../stamp.js';
import { familySprite }        from '../sprites.js';
import { surface }             from '../surface.js';
import { windowed, canvasFor } from '../windowed.js';
import { drawFrameInto }       from '../rebuild.js';

/** Whether a recipe is a still's marks: a gamepad drawing, not an image under them. */
export const hasMarks = recipe => !!recipe && Array.isArray(recipe.marks) && recipe.marks.length > 0;

/** The key a stamp's picture is found under: its family and sprite. */
export const spriteKey = (familyId, spriteIndex) => `${familyId}#${spriteIndex}`;

/** Every sprite a still draws with, once: `[familyId, spriteIndex]` by key. */
export function spritesOf(recipe) {
  const out = new Map();
  for (const m of recipe.marks || []) out.set(spriteKey(m.familyId, m.spriteIndex), [m.familyId, m.spriteIndex]);
  return out;
}

/**
 * A still's stamps, in the picture's own pixels and the order they were
 * drawn in, which is the order they overlap in — each knowing its mark and,
 * a pattern's copies, which copy it is. And `clip`: the part of the picture
 * the canvas covers, all a composite of it can show.
 *
 * @param {object} recipe   a gamepad still's: { canvas, frame, marks }
 * @returns {{width: number, height: number, ground: ?string, clip: {x, y, w, h},
 *            stamps: Array<{x, y, rotation, scale, flipX, key, mark, copy}>}}
 */
export function stampsOf(recipe) {
  const canvas = recipe.canvas || {};
  const cw = canvas.w || 0, ch = canvas.h || 0;
  const frame = recipe.frame && recipe.frame.from ? recipe.frame : null;
  const from = frame ? frame.from : { x: 0, y: 0, w: cw, h: ch };
  const to = frame && frame.to ? frame.to : { x: 0, y: 0, w: from.w, h: from.h };
  const sx = from.w > 0 ? to.w / from.w : 1, sy = from.h > 0 ? to.h / from.h : 1;
  const width = frame ? frame.w : cw, height = frame ? frame.h : ch;
  const stamps = [];
  (recipe.marks || []).forEach((m, mark) => {
    stampPoints(m.x, m.y, m.rotation, m.pattern || 'single', cw, ch).forEach(([x, y, rotation, flipX], copy) => {
      stamps.push({ x: (x - from.x) * sx + to.x, y: (y - from.y) * sy + to.y, rotation, scale: m.scale * sx, flipX,
                    key: spriteKey(m.familyId, m.spriteIndex), mark, copy });
    });
  });
  // The frame's part of the canvas — a frame may reach past it — where that part lies in the picture.
  const x0 = Math.max(0, from.x), y0 = Math.max(0, from.y);
  const x1 = cw ? Math.min(cw, from.x + from.w) : from.x + from.w, y1 = ch ? Math.min(ch, from.y + from.h) : from.y + from.h;
  const clip = { x: (x0 - from.x) * sx + to.x, y: (y0 - from.y) * sy + to.y, w: Math.max(0, x1 - x0) * sx, h: Math.max(0, y1 - y0) * sy };
  const ground = canvas.background && canvas.background !== 'none' ? canvas.background : null;
  return { width, height, ground, clip, stamps };
}

/**
 * Draw a still into a context the picture's size times `view`: its ground
 * over all of it, as a save puts one, then its stamps inside its clip.
 *
 * @param {CanvasRenderingContext2D} ctx   its canvas the whole picture's — or core/windowed.js's
 * @param {object} still                   stampsOf's
 * @param {Map<string, CanvasImageSource>} images   by spriteKey
 * @param {number} view                    canvas pixels per picture pixel
 */
export function drawStill(ctx, still, images, view) {
  const { width, height } = ctx.canvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, width, height);
  if (still.ground) {
    ctx.fillStyle = still.ground;
    ctx.fillRect(0, 0, width, height);
  }
  ctx.save();
  const c = still.clip;
  ctx.beginPath();
  ctx.rect(c.x * view, c.y * view, c.w * view, c.h * view);
  ctx.clip();
  // At its own size its sprites are resampled as the gamepad's canvas resampled them — a sprite
  // shrunk grainy, as its render has it; past it, as well as the browser can.
  ctx.imageSmoothingEnabled = true;
  if (view > 1) ctx.imageSmoothingQuality = 'high';
  for (const s of still.stamps) {
    const image = images.get(s.key);
    if (!image) continue;
    ctx.setTransform(view, 0, 0, view, 0, 0);
    ctx.translate(s.x, s.y);
    ctx.rotate(s.rotation);
    ctx.scale(s.scale * s.flipX, s.scale);
    ctx.drawImage(image, -image.width / 2, -image.height / 2);
  }
  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/**
 * A gamepad still as frames (core/rebuild.js): one frame, drawn at `scale`
 * pixels per pixel of its own size — its render's — and windows of it.
 * A sprite that will not load is named in `missing`, its stamps left out.
 *
 * @param {object} object    a vault envelope: a still whose recipe has marks
 * @param {object} [opts]
 * @param {number} [opts.scale=1]
 * @returns {Promise<object>} the handle core/rebuild.js returns
 */
export async function openStill(object, { scale = 1 } = {}) {
  const still = stampsOf(object.recipe);
  const images = new Map(), missing = [];
  await Promise.all([...spritesOf(object.recipe)].map(async ([key, [familyId, index]]) => {
    const image = await familySprite(familyId, index);
    if (image) images.set(key, image);
    else missing.push(`sprite ${index} of ${familyId}`);
  }));
  const render = object.render || {};
  const width = render.w || still.width, height = render.h || still.height;
  const k = scale > 0 ? scale : 1;
  const view = (k * width) / Math.max(1, still.width);   // its render's pixels per picture pixel, at the scale
  const W = Math.max(1, Math.round(width * k)), H = Math.max(1, Math.round(height * k));
  let whole = null, tile = null;

  return {
    length: 1,
    fps: 0,
    loop: false,
    width,
    height,
    bounds: { x: 0, y: 0, w: width, h: height },
    missing,
    scale: k,                           // its marks again, never stretched
    frame() {
      if (!whole) {
        whole = surface(W, H);
        drawStill(whole.getContext('2d'), still, images, view);
      }
      return whole;
    },
    /** A window of the frame at this scale, for a print past any canvas. */
    window(i, win) {
      tile = canvasFor(tile, win);
      drawStill(windowed(tile.getContext('2d'), { x: win.x, y: win.y, width: W, height: H }), still, images, view);
      return tile;
    },
    drawInto(ctx, i, w, h) { drawFrameInto(ctx, this.frame(i), this.bounds, this, w, h); },
    dispose() {
      whole = null;
      tile = null;
    },
  };
}
