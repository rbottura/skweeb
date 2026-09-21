/**
 * thumb.js
 * One preview per object, whatever its type — docs/object-model.md requires a
 * thumb.webp on everything, including the types that are not images.
 *
 * Made in the browser rather than on the server: the pixels and a canvas to
 * downscale them with are already here, and it keeps server.js free of image
 * dependencies.
 *
 * WebP where the browser will encode it, PNG otherwise. Alpha is preserved in
 * both, which matters — most of what this suite makes is cut out.
 */

const SIZE = 256;

/** Fit-inside dimensions, never upscaling past the source. */
function fit(w, h, size) {
  const scale = Math.min(size / w, size / h, 1);
  return [Math.max(1, Math.round(w * scale)), Math.max(1, Math.round(h * scale))];
}

async function encode(canvas) {
  const tryType = async type => new Promise(resolve => {
    canvas.toBlob(blob => resolve(blob && blob.type === type ? blob : null), type, 0.85);
  });
  const webp = await tryType('image/webp');
  if (webp) return { blob: webp, ext: 'webp' };
  const png = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  return { blob: png, ext: 'png' };
}

/**
 * @param {HTMLCanvasElement|OffscreenCanvas} source
 * @returns {Promise<{blob: Blob, ext: string}>}
 */
export async function thumbFromCanvas(source, size = SIZE) {
  const [w, h] = fit(source.width, source.height, size);
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  return encode(out);
}

/** Same, from an image blob — used when the render was encoded before saving. */
export async function thumbFromBlob(blob, size = SIZE) {
  const bitmap = await createImageBitmap(blob);
  try {
    return await thumbFromCanvas(bitmap, size);
  } finally {
    bitmap.close();
  }
}

/**
 * A placeholder for types with nothing to photograph — a font before it is
 * rendered, a dataset, a recipe. Draws the type name on a flat ground so the
 * gallery is never a wall of grey boxes.
 */
export async function thumbFromLabel(label, size = SIZE) {
  const out = document.createElement('canvas');
  out.width = out.height = size;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#1a1a1a';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#8a8a8a';
  ctx.font = '500 20px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(label).slice(0, 14), size / 2, size / 2);
  return encode(out);
}
