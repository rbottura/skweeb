/**
 * frames.js — a model's recipe as frames: what a save draws and what a
 * replay draws, the same code, so the two cannot drift.
 *
 * A recipe is the app's values — view, light, ground, format — and its
 * shapes (scene.js). A frame is the scene built from it, seen by the camera
 * its values make (camera.js), drawn by the page's one renderer
 * (renderer.js) over the recipe's ground. A model that does not turn is
 * one frame; one that turns, its loop (motion.js) — frame i seen from where
 * the turntable has it, the sun turned with the eye when the model turns —
 * and one whose shapes swing, its loop too, each shape where its wave has it.
 *
 * ── Sizes ──────────────────────────────────────────────────────────────────
 *
 * An object's own size is its render's (core/rebuild.js): the format times
 * the recipe's `scale`, as it was saved. Asked for `scale` k, its frames are
 * k times that many pixels, drawn again — the camera reads only the
 * picture's shape, so a bigger picture is the same picture, sharper, never a
 * stretch. Above its own size it is made sharper still (`sharper`): smooth
 * round shapes get the segments the size wants, the shadow map is larger.
 *
 * A print past any canvas asks for windows (core/print.js): `window(i, win)`
 * draws the window of the frame at that scale — the whole frame's camera,
 * offset to the window (three's `setViewOffset`), the outline's push given
 * in the window's own terms — and the whole frame's canvas is made only
 * when a whole frame is asked for.
 */

import { Model } from './scene.js';
import { cameraFor } from './camera.js';
import { outlineOf } from './look.js';
import { loopOf, seenAt } from './motion.js';
import { surface } from '../../core/surface.js';

/**
 * What drawing again above its own size asks of the model (scene.js
 * `update`): segments enough for a silhouette half the picture's longer side
 * — π√R keep one R pixels across within half a pixel of round — and the
 * larger shadow map, within the GPU's side.
 */
export function sharper(w, h, renderer = { maxSide: 4096 }) {
  return { detail: Math.ceil(Math.PI * Math.sqrt(Math.max(w, h) / 2)), shadowMap: Math.min(4096, renderer.maxSide) };
}

/**
 * @param {object} recipe              the values and `shapes`
 * @param {object} opts
 * @param {object} opts.renderer       renderer.js's
 * @param {number} [opts.scale=1]      pixels per pixel of its own size
 * @returns {{length, fps, loop, width, height, scale, frame(i), window(i, win), dispose()}}
 *          `frame` and `window` hand out a canvas each, drawn again on every call — borrowed
 */
export function openModel(recipe, { renderer, scale = 1 }) {
  const own = recipe.scale || 1;
  const px = own * scale;
  const w = Math.max(1, Math.round(recipe.width * px)), h = Math.max(1, Math.round(recipe.height * px));
  const fine = scale > 1 ? sharper(w, h, renderer) : {};
  const model = new Model().update(recipe, fine);
  const motion = loopOf(recipe);
  // Frame i's values: where the turntable has the eye, the sun with it as the model turns — its swung shapes
  // placed again (P2), their forms kept, so no geometry is made again.
  const at = i => {
    const v = seenAt(recipe, i);
    if (motion.swings || motion.evolves) model.update(v, fine);   // its clouds under their forces too (forces.js)
    else if (motion.loop && v.turning !== 'the eye') model.light(v, fine);
    return v;
  };
  const outline = outlineOf(recipe) * 0.002;
  let canvas = null, ctx = null;                 // the whole frame's, when one is asked for
  let tile = null, tileCtx = null;               // a window's, as large as the largest asked

  return {
    length: motion.length,
    fps: motion.fps,
    loop: motion.closes,                         // an evolution plays once: more frames than one, and no loop
    width: Math.max(1, Math.round(recipe.width * own)),
    height: Math.max(1, Math.round(recipe.height * own)),
    scale,
    model,

    frame(i = 0) {
      if (!canvas) {
        canvas = surface(w, h);
        ctx = canvas.getContext('2d');
      }
      drawModel(ctx, renderer, model, at(i), w, h);
      return canvas;
    },

    window(i, win) {
      if (!tile || tile.width < win.w || tile.height < win.h) {
        tile = surface(Math.max(win.w, tile ? tile.width : 0), Math.max(win.h, tile ? tile.height : 0));
        tileCtx = tile.getContext('2d');
      }
      const v = at(i);
      const camera = cameraFor(v, w, h);
      camera.setViewOffset(w, h, win.x, win.y, win.w, win.h);
      if (model.ink) {
        // A push of a share of the whole height, in this window's height; the window's proportions.
        model.ink.width.value = outline * (h / win.h);
        model.ink.aspect.value = win.w / win.h;
      }
      drawModel(tileCtx, renderer, model, v, win.w, win.h, camera);
      if (model.ink) {
        model.ink.width.value = outline;
        model.ink.aspect.value = w / h;
      }
      return tile;
    },

    dispose() { model.dispose(); },
  };
}

/**
 * The model seen by the recipe's camera, over its ground, filling `ctx`'s
 * `w` × `h` — or by the camera given, the one the preview draws its guides
 * and handles with over it.
 */
export function drawModel(ctx, renderer, model, values, w, h, camera = cameraFor(values, w, h)) {
  ctx.clearRect(0, 0, w, h);
  if (values.ground && values.ground !== 'none') {
    ctx.fillStyle = values.ground;
    ctx.fillRect(0, 0, w, h);
  }
  const picture = renderer.draw(model.scene, camera, w, h);
  ctx.drawImage(picture, 0, 0);
  picture.close();
}
