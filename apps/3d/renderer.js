/**
 * renderer.js — the page's one three.js renderer, on the page's one GPU device.
 *
 * three's WebGPU renderer takes a device it did not make (`device`, read in
 * r186's WebGPUBackend), so it draws through core/gpu/device.js's, as the
 * filter kit does: one device for the page, however many models compose
 * places. Where there is no WebGPU it falls back to WebGL2 by itself, so a
 * model draws on the laptop's Intel with no flags — and `backend` says which.
 *
 * Asked for once, lazily, by the app and by rebuild.js alike — the same
 * module, so the same renderer. It draws into an OffscreenCanvas of its own
 * and hands the picture back as an ImageBitmap in the same call, as the
 * kit's runner does (core/gpu/runner.js), because a handle's `frame(i)` is
 * synchronous (core/rebuild.js). The caller draws the picture and closes it.
 *
 * The ground is not three's: the picture comes back on nothing, and
 * frames.js lays it over the recipe's ground, so `none` is a model on no
 * ground at all — a sprite for a game.
 *
 * three speaks through its own console function: what it says goes to the
 * console as it would, but for the one line its WebGL2 fallback always
 * writes, which this file says itself, as `backend`.
 */

import { WebGPURenderer, setConsoleFunction } from '../../core/libs/three/three.webgpu.js';
import { openGpu } from '../../core/gpu/device.js';

let pending = null;

const FALLBACK = /WebGPU is not available, running under WebGL2/;

setConsoleFunction((type, message, ...rest) => {
  if (FALLBACK.test(message)) return;
  (console[type] || console.log)(message, ...rest);
});

/**
 * The renderer, or a rejection saying why there is none — no WebGPU and no
 * WebGL2 either.
 *
 * @returns {Promise<{backend: string, maxSide: number, draw(scene, camera, w: number, h: number): ImageBitmap}>}
 */
export function openRenderer() {
  if (!pending) {
    pending = create();
    pending.catch(() => { pending = null; });     // the next ask tries again
  }
  return pending;
}

async function create() {
  const gpu = await openGpu();
  const canvas = new OffscreenCanvas(1, 1);
  const renderer = new WebGPURenderer({
    canvas,
    ...(gpu ? { device: gpu.device } : {}),
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(1);
  // On from the first: a shadow costs only where a model's sun casts one (look.js
  // `shade`), and turning the map on later would rebuild every lit material.
  renderer.shadowMap.enabled = true;
  await renderer.init();
  renderer.setClearColor(0x000000, 0);

  const webgpu = !!renderer.backend.isWebGPUBackend;
  const maxSide = webgpu && gpu ? gpu.maxSide : 8192;
  let w = 0, h = 0;

  return {
    backend: webgpu ? 'WebGPU' : 'WebGL2',
    maxSide,

    /** The scene seen by the camera at `width` × `height`: an ImageBitmap, the caller's to close. */
    draw(scene, camera, width, height) {
      if (width > maxSide || height > maxSide) throw new Error(`3d: ${width} × ${height} is past this GPU's ${maxSide} a side`);
      if (width !== w || height !== h) {
        renderer.setSize(width, height, false);
        w = width;
        h = height;
      }
      renderer.render(scene, camera);
      return canvas.transferToImageBitmap();
    },
  };
}
