/**
 * layers-draw.js — an object's layers drawn (core/layers.js, L13): each
 * opened once by core/rebuild.js — a picture its pixels, a loop at the
 * object's frame, a smart object at its latest — and laid round a frame of
 * the object: the ones behind under it, the ones in front over it, each in
 * its box, turned, at its opacity, by its blend.
 *
 * What every way out of an app draws them with: its saved picture
 * (`finished`, which core/vault.js asks of every save before it writes it),
 * a replay (`withLayers`, core/rebuild.js — compose, the vault, the windows'
 * stack, a print in tiles), and the Stack's preview (core/layers-view.js).
 * An app that draws its own says so — particles, between its ground and its
 * particles (L13b): its handle `layered`, and its save's spec.
 */

import { Vault }        from './vault.js';
import { openFrames, drawFrameInto, inkSize } from './rebuild.js';
import { mipFor }       from './stamps.js';
import { compositeOf }  from './blend.js';
import { surface }      from './surface.js';
import { windowed, canvasFor } from './windowed.js';
import { toPng }        from './export.js';
import { thumbFromBlob } from './thumb.js';
import { layersOf, holderOf, formatOf, layerBox, across } from './layers.js';

/** A frame kept: a picture's bitmap as it is, anything else copied — a handle lends its one canvas. */
function kept(frame) {
  if (typeof ImageBitmap !== 'undefined' && frame instanceof ImageBitmap) return frame;
  const c = surface(frame.width, frame.height);
  c.getContext('2d').drawImage(frame, 0, 0);
  return c;
}

/**
 * Each layer's frames, opened: `[{ layer, handle, still }]`, bottom first —
 * `still` a one-frame object's picture, kept for its halvings. One that will
 * not open is said and left out: the object draws without it, as it does
 * without a sprite set that will not come.
 *
 * @param {object[]} list    layers, as `layersOf` gives them
 * @param {object} [opts]    `draft` for a preview; `depth`, how deep a replay this is
 */
export async function openLayers(list, { draft = false, depth = 0 } = {}) {
  const out = [];
  for (const layer of list) {
    try {
      const { object, url } = await Vault.load(layer.ref);
      const handle = await openFrames(object, { url, draft, depth: depth + 1 });
      out.push({ layer, handle, still: handle.length > 1 ? null : kept(handle.frame(0)) });
    } catch (err) {
      console.warn(`[layers] ${layer.ref} would not open: ${err.message}`);
    }
  }
  return out;
}

/** Let the layers' frames go. */
export function closeLayers(opened) {
  for (const o of opened || []) if (o.handle && o.handle.dispose) o.handle.dispose();
}

/**
 * One layer onto a context, `px` of its pixels a pixel of the format, at
 * frame `i` of the object — a loop's own frame i, round. Its box is fitted by
 * its ink (core/rebuild.js `inkSize`), so a recording of marks fits as
 * compose places it. `blended` false leaves its opacity and blend to the page
 * (core/layers-view.js, a canvas of its own each).
 */
export function drawLayer(ctx, { layer, handle, still }, fmt, px, i = 0, { blended = true } = {}) {
  const n = handle.length > 1 ? handle.length : 1;
  const image = still || handle.frame(((i % n) + n) % n);
  const ink = inkSize(handle);
  const box = layerBox(ink.width, ink.height, layer, fmt);
  const w = box.w * px, h = box.h * px;
  if (!(w > 0 && h > 0)) return;
  const turn = ((layer.rot || 0) * Math.PI) / 180, cos = Math.cos(turn), sin = Math.sin(turn);
  ctx.save();
  ctx.globalAlpha = blended ? Math.max(0, Math.min(1, layer.opacity ?? 1)) : 1;
  ctx.globalCompositeOperation = blended ? compositeOf(layer.blend) : 'source-over';
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.setTransform(cos, sin, -sin, cos, (box.x + box.w / 2) * px, (box.y + box.h / 2) * px);
  ctx.drawImage(still ? mipFor(still, w) : image, -w / 2, -h / 2, w, h);
  ctx.restore();
}

/** The layers on one side of the picture — `behind` or `front` — bottom first. */
export function drawSide(ctx, opened, side, fmt, px, i = 0, opts) {
  for (const o of opened) if ((o.layer.at === 'behind' ? 'behind' : 'front') === side) drawLayer(ctx, o, fmt, px, i, opts);
}

/** Whether a handle's frames are its whole picture — a recording of marks' are its ink's box, and no layer goes round one. */
const whole = handle => !handle.bounds || (handle.bounds.x === 0 && handle.bounds.y === 0
  && handle.bounds.w === handle.width && handle.bounds.h === handle.height);

/**
 * A replay's frames with the object's layers laid round them: what
 * core/rebuild.js hands back for an object whose recipe has layers, unless
 * its app drew them itself (`handle.layered`). A print's windows too, each
 * laid as the frame is, moved by its corner (core/windowed.js).
 *
 * @param {object} handle    the app's, from its rebuild.js
 * @param {object} recipe
 * @param {object} [opts]    as core/rebuild.js's: `draft`, `depth`
 * @returns {Promise<object>}
 */
export async function withLayers(handle, recipe, opts = {}) {
  const list = layersOf(recipe);
  if (!list.length || handle.layered || !whole(handle)) return handle;
  const opened = await openLayers(list, opts);
  if (!opened.length) return handle;
  const fmt = formatOf(holderOf(recipe), { width: handle.width, height: handle.height });
  let canvas = null, tile = null;

  return {
    length: handle.length, fps: handle.fps, loop: handle.loop,
    width: handle.width, height: handle.height, bounds: handle.bounds,
    missing: handle.missing || [], scale: handle.scale,
    layered: true,

    /** Borrowed, as every frame is: one canvas, laid again on the next call. */
    frame(i) {
      const f = handle.frame(i);
      if (!canvas || canvas.width !== f.width || canvas.height !== f.height) canvas = surface(f.width, f.height);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, f.width, f.height);
      const px = f.width / across(fmt);
      drawSide(ctx, opened, 'behind', fmt, px, i);
      ctx.drawImage(f, 0, 0);
      drawSide(ctx, opened, 'front', fmt, px, i);
      return canvas;
    },

    ...(typeof handle.window === 'function' ? {
      /** A window of frame i at its scale, for a print past any canvas (core/print.js): laid as the frame is. */
      window(i, win) {
        const part = handle.window(i, win);
        tile = canvasFor(tile, win);
        const real = tile.getContext('2d');
        real.setTransform(1, 0, 0, 1, 0, 0);
        real.globalAlpha = 1;
        real.globalCompositeOperation = 'source-over';
        real.clearRect(0, 0, win.w, win.h);
        const W = handle.width * (handle.scale || 1), H = handle.height * (handle.scale || 1);
        const ctx = windowed(real, { x: win.x, y: win.y, width: W, height: H });
        const px = W / across(fmt);
        drawSide(ctx, opened, 'behind', fmt, px, i);
        real.setTransform(1, 0, 0, 1, 0, 0);
        real.drawImage(part, 0, 0, win.w, win.h, 0, 0, win.w, win.h);
        drawSide(ctx, opened, 'front', fmt, px, i);
        real.setTransform(1, 0, 0, 1, 0, 0);
        return tile;
      },
    } : {}),

    drawInto(ctx, i, w, h) { drawFrameInto(ctx, this.frame(i), { x: 0, y: 0, w: this.width, h: this.height }, this, w, h); },

    dispose() {
      closeLayers(opened);
      if (handle.dispose) handle.dispose();
    },
  };
}

/**
 * A save's picture with the object's layers laid round it, and its thumb
 * made again — what core/vault.js asks of every save before it writes it —
 * unless its app drew them itself (`spec.layered`). A save with no layers,
 * or a render that is no picture, goes as it came. A loop's picture is one
 * frame of it: its layers at their first.
 *
 * @param {object} spec    as core/vault.js `save` takes it
 * @returns {Promise<object>}
 */
export async function finished(spec) {
  const list = layersOf(spec && spec.recipe);
  if (!list.length || spec.layered || !spec.render || !(spec.render.blob instanceof Blob)) return spec;
  let picture;
  try { picture = await createImageBitmap(spec.render.blob); } catch { return spec; }
  const opened = await openLayers(list);
  try {
    if (!opened.length) return spec;
    const fmt = formatOf(holderOf(spec.recipe), { width: picture.width, height: picture.height });
    const canvas = surface(picture.width, picture.height);
    const ctx = canvas.getContext('2d');
    const px = picture.width / across(fmt);
    drawSide(ctx, opened, 'behind', fmt, px, 0);
    ctx.drawImage(picture, 0, 0);
    drawSide(ctx, opened, 'front', fmt, px, 0);
    const blob = await toPng(canvas);
    return { ...spec, render: { ...spec.render, blob, ext: 'png' }, ...(spec.thumb ? { thumb: await thumbFromBlob(blob) } : {}) };
  } finally {
    closeLayers(opened);
    if (picture.close) picture.close();
  }
}

/** A picture of the object as a download takes it — E's "the picture" — its layers laid round it, as a save's are. */
export async function layeredPng(blob, recipe) {
  return (await finished({ recipe, render: { blob } })).render.blob;
}

// Every save on a page that draws layers goes through them (core/vault.js `finishWith`).
Vault.finishWith(finished);
