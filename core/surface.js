/**
 * surface.js — a canvas to draw on, off screen.
 *
 * OffscreenCanvas where it exists, because that is what lets a render move
 * into a worker later without being rewritten; a detached <canvas> otherwise.
 * In core since particles needed it as well as ckt; grid still has the same
 * ten lines in grid.js, from before.
 */

export function surface(w, h) {
  const width = Math.max(1, Math.round(w));
  const height = Math.max(1, Math.round(h));

  if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(width, height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
