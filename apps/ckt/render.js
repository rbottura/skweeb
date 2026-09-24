/**
 * render.js — one frame of stage two, on a canvas.
 *
 * Pure in the sense the suite needs: everything arrives as arguments, nothing
 * reads a clock, the DOM or a random, and the same recipe and tick give the
 * same pixels. The live preview, a saved loop, a brush family and a replay in
 * the vault viewer all come through `renderFrame()` — one drawing path, so
 * they cannot drift apart. The preview only asks for it in `draft`: faster
 * smoothing, a degree's face angles, and sprites that turn alike drawn at
 * their exact angle — the same picture. It is also drawn between the loop's
 * frames (core/playback.js, `smooth`), so it paints at the screen's rate.
 *
 * ── The world and the frame ─────────────────────────────────────────────────
 *
 * v2 drew in the browser window: the glyph centred in it, the attractor's paths
 * measured against it, a zoom about its middle. Here the window is the recipe's
 * `width` × `height` — `hd` by default, v2's own — and core/frame.js decides the
 * canvas: a named size is the window itself, `canvas` (source) likewise, `ink`
 * (content) crops to where the dots go. `zoom` is the object inside it; `scale`
 * multiplies the whole canvas last, the same picture in more pixels.
 *
 * ── Why it is fast (the 2026-09-23 audit) ───────────────────────────────────
 *
 * The first version allocated a 1920×1080 canvas every frame — 5 ms before a
 * dot was drawn — and stamped every dot through its own transform, resampling
 * a 360px sprite each time with high-quality smoothing: 31 ms a frame for
 * egypt's 1275 dots at size 0.3, 107 ms with a trail. Now the canvas is reused,
 * and a mark is drawn ONCE at the size and angle it will appear at (a stamp),
 * then blitted to every dot untransformed. spin and none turn every sprite
 * alike, so that is one stamp per frame; face turns each one its own way, so
 * those come from a small cache of angles.
 *
 * Measured in the running app on egypt's heaviest glyph (1275 dots, moving):
 * size 0.6 went from 41 painted frames a second to the loop's full 30, size 1
 * from 22 to 30. Two more things did that: the preview is drawn at the size
 * the viewer shows it (`view`), and a sprite past 160px goes straight through
 * a transform, since at that size filling pixels is the whole cost.
 *
 * And the stutter (2026-09-23, second pass): the preview's angle cache was 4°
 * a bucket, so a spin at 2° a frame moved on screen every other frame — 15
 * changes a second, held unevenly. Now the preview draws the turn exactly and
 * between frames: 60 changes a second on a 60Hz screen, the same heavy glyph
 * at every size to 1, a still trail, the attractor moving, `face`. The stamp
 * cache is stamps.js.
 *
 * ── Trails ──────────────────────────────────────────────────────────────────
 *
 * `trail` frames drawn under this one, oldest first, fading to nothing — and
 * sampled `trailDensity` times a frame, which the closed-form motion makes
 * free: a dot's place at tick 12.5 is as exact as at tick 12. The loop wraps,
 * so frame 0's trail is the end of the loop and the pile closes.
 *
 * When no dot moves — the attractor off, the default — every dot's trail is
 * the same turning, pulsing sprite, so the whole trail is baked into one
 * stamp a frame and blitted once per dot. When dots move it is a pass per
 * sample, the one expensive case left; the preview takes one a frame there,
 * an export every one the recipe asks for.
 */

import { place, STRIDE, loopBounds, loopFrames, spinAt, pulseAt } from './motion.js';
import { phaseOf }      from './attractor.js';
import { resolveFrame } from '../../core/frame.js';
import { surface }      from './surface.js';
import { mipFor, stampFor, freshStamp, blit } from './stamps.js';

/**
 * A disc's diameter at size 1: the size of a typical v2 sprite, 360px, so
 * switching between a sprite and a disc keeps what you see the same size.
 */
export const DISC = 360;

/** Half a mark's diagonal at size 1 — how far past its dot a mark can reach. */
export function reachOf(mark) {
  return mark ? Math.hypot(mark.width, mark.height) / 2 : DISC / 2;
}

/** What is under the marks: a colour or 'none'. Recipes from before carry `transparent`. */
export const groundOf = recipe => (recipe.transparent ? 'none' : (recipe.ground || '#ffffff'));

/**
 * Where the drawing goes: the window, the canvas, and the map between them.
 * Worked out once per change, not per frame — for `ink` it walks the loop.
 *
 * `view` shrinks the canvas for the live preview: the suite draws live at the
 * size it is seen and at full resolution only on export (docs/core-api.md), so
 * a 1920px frame shown 1260px wide is drawn 1260px wide. Saves pass nothing.
 * `scale` is the other way: another page's print scale, drawing the whole
 * picture at more pixels — positions, sprites and the mip they are cut from.
 */
export function framing(recipe, anchors, mark, view = 1, scale = 1) {
  const world = { width: recipe.width, height: recipe.height };
  const content = recipe.format === 'content'
    ? loopBounds(anchors, recipe, world, reachOf(mark) * Math.abs(recipe.size) + 1)
    : { x: 0, y: 0, w: world.width, h: world.height };
  const frame = resolveFrame(recipe, content, world);
  // `view` only ever shrinks — the preview, drawn at the size the viewer shows.
  // `scale` is an export's, and may grow it: another page's print scale.
  const k = Math.max(0.01, recipe.scale || 1) * Math.min(1, Math.max(0.05, view)) * Math.max(0.01, scale);
  const sx = (frame.to.w / frame.from.w) * k;
  const sy = (frame.to.h / frame.from.h) * k;
  return {
    world, frame, scale: k, sx, sy,
    width: Math.max(1, Math.round(frame.width * k)),
    height: Math.max(1, Math.round(frame.height * k)),
    ox: frame.to.x * k - frame.from.x * sx,
    oy: frame.to.y * k - frame.from.y * sy,
  };
}

/**
 * The ages a trail is drawn at, oldest first, each with its strength.
 *
 * @param {object} recipe
 * @param {number} [density]  samples a frame, when the caller must cap it
 */
export function trailSamples(recipe, density) {
  const T = Math.max(0, recipe.trail || 0);
  if (!T) return [{ age: 0, alpha: 1 }];
  const per = Math.max(1, Math.round(density || recipe.trailDensity || 2));
  const n = Math.round(T * per);
  const out = [];
  for (let k = n; k >= 0; k--) {
    const age = k / per;
    out.push({ age, alpha: 1 - age / (T + 1 / per) });
  }
  return out;
}

/**
 * Above this many pixels across, a sprite is drawn straight through a
 * transform: the GPU fills exactly the sprite's own quad, where a stamp would
 * fill its whole box, corners included — and at that size filling is the cost.
 */
const DIRECT_PX = 160;

/** Every dot of one sample, stamped. Returns how many were drawn. */
function stampAll(ctx, dots, n, recipe, mark, f, draft) {
  const native = mark ? mark.width : DISC;
  const buckets = draft ? 360 : 1440;
  const uniform = recipe.rotate !== 'face';
  const exact = draft && uniform && !!mark;
  let one = null, drawn = 0;

  if (mark && n) {
    const s0 = Math.abs(dots[3]);
    if (native * s0 * f.sx > DIRECT_PX) return directAll(ctx, dots, n, mark, f);
  }

  for (let i = 0; i < n; i++) {
    const o = i * STRIDE;
    let s = dots[o + 3];
    if (s === 0) continue;
    let angle = dots[o + 2];
    if (s < 0) { s = -s; angle += Math.PI; }      // a negative size is a half turn
    const px = native * s * f.sx;
    if (px < 0.25) continue;

    const stamp = !uniform ? stampFor(mark, recipe.color, px, angle, buckets)
      : one || (one = exact ? freshStamp(mark, px, angle) : stampFor(mark, recipe.color, px, angle, buckets));
    blit(ctx, stamp, f.ox + f.sx * dots[o], f.oy + f.sy * dots[o + 1]);
    drawn++;
  }
  return drawn;
}

/** Large sprites: one transform per dot, drawn from the nearest halving. */
function directAll(ctx, dots, n, mark, f) {
  const w = mark.width, h = mark.height;
  const src = mipFor(mark, w * Math.abs(dots[3]) * f.sx);
  let drawn = 0;
  for (let i = 0; i < n; i++) {
    const o = i * STRIDE;
    const s = dots[o + 3];
    if (s === 0) continue;
    const c = Math.cos(dots[o + 2]), si = Math.sin(dots[o + 2]);
    ctx.setTransform(f.sx * s * c, f.sy * s * si, -f.sx * s * si, f.sy * s * c,
                     f.ox + f.sx * dots[o], f.oy + f.sy * dots[o + 1]);
    ctx.drawImage(src, -w / 2, -h / 2, w, h);
    drawn++;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return drawn;
}

// ── A frame ──────────────────────────────────────────────────────────────────

/**
 * @param {object} args
 * @param {object} args.recipe   stage two's params.values
 * @param {Float64Array} args.anchors
 * @param {?CanvasImageSource} args.mark   null draws discs in `recipe.color`
 * @param {number} args.tick
 * @param {object} [args.frame]  from framing(); computed if absent
 * @param {HTMLCanvasElement|OffscreenCanvas} [args.into]  draw here, reused
 * @param {boolean} [args.draft] the live preview: faster, a hair coarser
 * @returns {{canvas, drawn: number, scale: number, attractor: ?{x, y}}}
 */
export function renderFrame({ recipe, anchors, mark, tick, frame, into, draft = false }) {
  const f = frame || framing(recipe, anchors, mark);
  const canvas = into || surface(f.width, f.height);
  if (canvas.width !== f.width) canvas.width = f.width;
  if (canvas.height !== f.height) canvas.height = f.height;

  const ctx = canvas.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  const ground = groundOf(recipe);
  if (ground === 'none') ctx.clearRect(0, 0, canvas.width, canvas.height);
  else { ctx.fillStyle = ground; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = draft ? 'low' : 'high';

  const n = anchors.length / 2;
  const on = recipe.path && recipe.path !== 'off';
  // No dot moves when the attractor is off or held at a point: only rotation
  // and pulse change down the trail — and when every sprite turns alike, so
  // does every dot's trail. Then the trail is one stamp, baked once a frame.
  const still = !on || recipe.path === 'point' || !recipe.tether;
  const alike = recipe.rotate !== 'face' || !on;
  const trailing = (recipe.trail || 0) > 0;

  if (trailing && still && alike) {
    const placed = place(anchors, recipe, tick, f.world);
    const baked = bakeTrail(recipe, mark, f, tick, draft);
    let drawn = 0;
    if (baked) {
      for (let i = 0; i < n; i++) {
        const o = i * STRIDE;
        blit(ctx, baked, f.ox + f.sx * placed.dots[o], f.oy + f.sy * placed.dots[o + 1]);
        drawn++;
      }
    }
    return { canvas, drawn, scale: f.sx, attractor: placed.attractor };
  }

  // Dots that move: a pass per sample. The live preview takes one a frame;
  // an export takes every one the recipe asks for.
  let buf = null, drawn = 0, attractor = null;
  for (const { age, alpha } of trailSamples(recipe, draft && trailing ? 1 : undefined)) {
    const placed = place(anchors, recipe, tick - age, f.world, buf);
    buf = placed.dots;
    if (age === 0) attractor = placed.attractor;
    ctx.globalAlpha = alpha;
    drawn += stampAll(ctx, buf, n, recipe, mark, f, draft);
  }

  ctx.globalAlpha = 1;
  return { canvas, drawn, scale: f.sx, attractor };
}

let _bake = null;

/**
 * One dot's whole trail as a single stamp: every sample's sprite, turned and
 * sized for its moment, oldest first, fading. Only for trails whose dots stay
 * put and turn alike, where it is exact — one stamp, n blits, instead of n
 * blits per sample.
 */
function bakeTrail(recipe, mark, f, tick, draft) {
  if (draft && mark) return bakeTrailExact(recipe, mark, f, tick);
  const native = mark ? mark.width : DISC;
  const buckets = draft ? 90 : 1440;
  const frames = loopFrames(recipe);
  const base = (recipe.angle || 0) * Math.PI / 180;
  const parts = [];
  let side = 0;

  for (const { age, alpha } of trailSamples(recipe)) {
    const phase = phaseOf(tick - age, frames);
    let angle = base + (recipe.rotate === 'spin' ? spinAt(recipe, phase) : 0);
    let s = (recipe.size ?? 1) * pulseAt(recipe, phase);
    if (s === 0) continue;
    if (s < 0) { s = -s; angle += Math.PI; }
    const px = native * s * f.sx;
    if (px < 0.25) continue;
    const stamp = stampFor(mark, recipe.color, px, angle, buckets);
    parts.push({ stamp, alpha });
    side = Math.max(side, stamp.canvas.width, stamp.canvas.height);
  }
  if (!parts.length) return null;

  if (!_bake || _bake.width < side || _bake.height < side) _bake = surface(side, side);
  const c = _bake.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.clearRect(0, 0, _bake.width, _bake.height);
  const mid = side / 2;
  for (const { stamp, alpha } of parts) {
    c.globalAlpha = alpha;
    c.drawImage(stamp.canvas, mid - stamp.cx, mid - stamp.cy);
  }
  c.globalAlpha = 1;
  return { canvas: _bake, cx: mid, cy: mid, w: side, h: side };
}

/**
 * The preview's baked trail: each sample drawn straight into the bake through
 * a transform, at its exact angle — for the reason freshStamp gives, and
 * because a trail sampled between frames would fill the cache with angles it
 * never sees again.
 */
function bakeTrailExact(recipe, mark, f, tick) {
  const frames = loopFrames(recipe);
  const base = (recipe.angle || 0) * Math.PI / 180;
  const aspect = mark.height / mark.width;
  const parts = [];
  let side = 0;

  for (const { age, alpha } of trailSamples(recipe)) {
    const phase = phaseOf(tick - age, frames);
    let angle = base + (recipe.rotate === 'spin' ? spinAt(recipe, phase) : 0);
    let s = (recipe.size ?? 1) * pulseAt(recipe, phase);
    if (s === 0) continue;
    if (s < 0) { s = -s; angle += Math.PI; }
    const w = mark.width * s * f.sx;
    if (w < 0.25) continue;
    parts.push({ w, angle, alpha });
    side = Math.max(side, Math.ceil(Math.hypot(w, w * aspect)) + 2);
  }
  if (!parts.length) return null;

  if (!_bake || _bake.width < side || _bake.height < side) _bake = surface(side, side);
  const c = _bake.getContext('2d');
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  c.clearRect(0, 0, side, side);
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = 'high';
  const mid = side / 2;
  for (const { w, angle, alpha } of parts) {
    const h = w * aspect;
    c.globalAlpha = alpha;
    c.setTransform(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), mid, mid);
    c.drawImage(mipFor(mark, w), -w / 2, -h / 2, w, h);
  }
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.globalAlpha = 1;
  return { canvas: _bake, cx: mid, cy: mid, w: side, h: side };
}
