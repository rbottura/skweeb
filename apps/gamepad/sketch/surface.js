/**
 * surface.js — a canvas drawn on in its own units, at a pixel density: the
 * page's canvas and the ink beside it (C6b, docs/gamepad.md). What p5 gave
 * the sketch — `createCanvas`, `createGraphics`, `pixelDensity` — and no more.
 *
 * `width` and `height` are the units everything is drawn in: the window's
 * CSS pixels, the marks' coordinates. The canvas holds `density` times as
 * many pixels each way, so a HiDPI screen shows the ink sharp; the context
 * keeps that scale as its transform, put back by `begin()` and `clear()`.
 */

export class Surface {
  /**
   * @param {number} width
   * @param {number} height
   * @param {number} [density=1]
   * @param {HTMLCanvasElement} [canvas]   one already on the page, else a new one
   */
  constructor(width, height, density = 1, canvas = document.createElement('canvas')) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.resize(width, height, density);
  }

  /** A new size, its pixels cleared — what was on it is the caller's to draw again. */
  resize(width, height, density = this.density) {
    this.width = Math.max(1, Math.round(width));
    this.height = Math.max(1, Math.round(height));
    this.density = density > 0 ? density : 1;
    this.canvas.width = Math.max(1, Math.round(this.width * this.density));
    this.canvas.height = Math.max(1, Math.round(this.height * this.density));
    return this.begin();
  }

  /** The context back at its own units, nothing else of a drawing's left on it. */
  begin() {
    this.ctx.setTransform(this.density, 0, 0, this.density, 0, 0);
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.filter = 'none';
    return this;
  }

  /** Transparent again, every pixel. */
  clear() {
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    return this.begin();
  }

  /** The canvas let go of: its pixels given back at once. */
  dispose() {
    this.canvas.width = this.canvas.height = 0;
  }
}

/** A picture at `url`, decoded — or null when it will not load. */
export function picture(url) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}
