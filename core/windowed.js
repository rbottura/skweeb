/**
 * windowed.js — a 2D context that draws one window of a bigger picture.
 *
 * A print past any canvas (core/print.js) asks an app for its picture a tile
 * at a time. An app's drawing sets its transform outright — to place each
 * sprite, to start each frame — so a translation set beforehand would be
 * lost; and it clears and fills its ground from its canvas's size. This
 * context stands in for the real one: every transform it is given is moved
 * by the window's corner, a pixel put or read is moved too, and its canvas
 * reports the whole picture's size. So an app draws exactly as it always
 * does, into a canvas the window's size, and what lands there is that window
 * of its picture. Everything else goes straight through.
 *
 * Not for drawing the canvas onto itself: its `canvas` is a stand-in with a
 * size, `real` the canvas underneath.
 */

import { surface } from './surface.js';

/**
 * A canvas for a window: the one given while it is big enough, a bigger one
 * otherwise. A print's windows are its tiles, all one size but the last of a
 * row or a column, so one canvas serves them all; beyond the window, what it
 * holds is never read.
 */
export function canvasFor(canvas, { w, h }) {
  if (canvas && canvas.width >= w && canvas.height >= h) return canvas;
  return surface(Math.max(w, canvas ? canvas.width : 0), Math.max(h, canvas ? canvas.height : 0));
}

/**
 * @param {CanvasRenderingContext2D|OffscreenCanvasRenderingContext2D} ctx   a window-sized canvas's
 * @param {object} window
 * @param {number} window.x        the window's corner in the whole picture's pixels
 * @param {number} window.y
 * @param {number} window.width    the whole picture's size, as the app thinks of its canvas
 * @param {number} window.height
 * @returns {CanvasRenderingContext2D}
 */
export function windowed(ctx, { x, y, width, height }) {
  const real = ctx;
  const home = () => real.setTransform(1, 0, 0, 1, -x, -y);
  home();
  const stand = Object.freeze({ width, height, real: real.canvas });
  const own = {
    setTransform(a, b, c, d, e, f) {
      if (a && typeof a === 'object') {
        const m = a;
        return real.setTransform(m.a ?? m.m11 ?? 1, m.b ?? m.m12 ?? 0, m.c ?? m.m21 ?? 0, m.d ?? m.m22 ?? 1,
          (m.e ?? m.m41 ?? 0) - x, (m.f ?? m.m42 ?? 0) - y);
      }
      return real.setTransform(a, b, c, d, e - x, f - y);
    },
    resetTransform: home,
    reset() { real.reset(); home(); },
    getTransform() {
      const m = real.getTransform();
      m.e += x;
      m.f += y;
      return m;
    },
    putImageData(data, dx, dy, ...dirty) { return real.putImageData(data, dx - x, dy - y, ...dirty); },
    getImageData(sx, sy, sw, sh, settings) { return real.getImageData(sx - x, sy - y, sw, sh, settings); },
  };
  const bound = new Map();
  return new Proxy(real, {
    get(target, key) {
      if (key === 'canvas') return stand;
      if (key in own) return own[key];
      const v = target[key];
      if (typeof v !== 'function') return v;
      if (!bound.has(key)) bound.set(key, v.bind(target));
      return bound.get(key);
    },
    set(target, key, value) {
      target[key] = value;
      return true;
    },
  });
}
