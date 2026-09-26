/**
 * device.js — the page's one GPU device.
 *
 * Everything the suite draws on the GPU draws through this device. WebGPU
 * lets one device render to any number of canvases and share textures
 * between them, so compose can place as many GPU objects as it likes — WebGL
 * gives each canvas a context of its own, and a page may hold about sixteen.
 * WebGPU was chosen on 2026-09-26 (docs/decisions.md).
 *
 * Asked for once, lazily; asked for again only if it is lost, to a driver
 * reset or a restarted GPU process. A machine without WebGPU gets null and a
 * reason, never a throw: rule 7, every app still opens. There a GPU-made
 * object shows as its saved render (docs/core-api.md, *gpu/*).
 */

let _pending = null;   // Promise<?Gpu>, shared by every caller
let _why = '';

/**
 * @typedef {object} Gpu
 * @property {GPUDevice} device
 * @property {GPUTextureFormat} format   what a canvas on this machine wants
 * @property {number} maxSide            the largest texture side it takes
 */

/** The device, or null — and then `whyNoGpu()` says why, in words. */
export function openGpu() {
  if (!_pending) _pending = request();
  return _pending;
}

/** Why `openGpu()` gave null; empty while it has not, or did not. */
export function whyNoGpu() {
  return _why;
}

async function request() {
  const gpu = typeof navigator !== 'undefined' ? navigator.gpu : undefined;
  if (!gpu) {
    _why = 'this browser has no WebGPU';
    return null;
  }

  let adapter = null;
  try {
    adapter = await gpu.requestAdapter();
  } catch (err) {
    _why = 'WebGPU would not give an adapter: ' + (err && err.message || err);
    return null;
  }
  if (!adapter) {
    // What webgpureport.org calls "disabled": the API is there, this GPU or
    // its driver is not on the browser's list. A flag lifts the list.
    _why = 'WebGPU is off for this GPU — chrome://flags/#enable-unsafe-webgpu turns it on';
    return null;
  }

  // Print scale needs big textures: ask for all the adapter has, not the
  // default 8192 — an A1 sheet at 300 dpi is 7016 × 9933.
  const maxSide = adapter.limits.maxTextureDimension2D;
  let device;
  try {
    device = await adapter.requestDevice({ requiredLimits: { maxTextureDimension2D: maxSide } });
  } catch (err) {
    _why = 'the GPU refused a device: ' + (err && err.message || err);
    return null;
  }

  // A mistake in a shader surfaces here, where a check's console hears it.
  device.addEventListener('uncapturederror', e => console.error('[gpu]', e.error.message));
  device.lost.then(info => {
    console.warn('[gpu] device lost:', info.message);
    _pending = null;               // the next openGpu() asks again
  });

  _why = '';
  return { device, format: gpu.getPreferredCanvasFormat(), maxSide };
}
