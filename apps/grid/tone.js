/**
 * tone.js — how light or dark a tile reads, once it is in a cell.
 *
 * A material is ordered light to dark (map.js: the darkest pixels take the
 * last member), and for the shipped ramps that order was made by hand. A
 * sprite is not a tile: it is ink on nothing, often in colour, and how dark it
 * reads depends on what is under it — black stripes vanish into grid's default
 * black ground, a white sphere glows on it. So a tile's tone is measured the
 * way the cell will show it: fitted into a square, over the ground, averaged
 * with the same luminance map.js dithers by.
 *
 * `toneOfPixels` is the arithmetic and has no canvas in it, so it is tested;
 * `toneOf` is the canvas half.
 */

import { luminance } from './map.js';

/** What a transparent ground is measured against: a transparent export lands on paper. */
const PAPER = [255, 255, 255];

/** '#rrggbb' or 'none' to [r, g, b]. */
export function groundRgb(ground) {
  const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(String(ground || ''));
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : PAPER;
}

/**
 * The mean luminance, 0 black to 1 white, of RGBA pixels laid over a ground.
 *
 * @param {Uint8ClampedArray|number[]} pixels  RGBA, the tile as a cell shows it
 * @param {string} ground                      '#rrggbb', or 'none' for paper
 * @param {string} [weighting='perceptual']
 */
export function toneOfPixels(pixels, ground, weighting = 'perceptual') {
  const [gr, gg, gb] = groundRgb(ground);
  const n = Math.floor(pixels.length / 4);
  if (!n) return luminance(gr, gg, gb, weighting);
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    const a = pixels[p + 3] / 255;
    sum += luminance(
      pixels[p] * a + gr * (1 - a),
      pixels[p + 1] * a + gg * (1 - a),
      pixels[p + 2] * a + gb * (1 - a),
      weighting);
  }
  return sum / n;
}

/**
 * Where a tile goes in a square cell: fitted whole and centred, so a glyph
 * cut to its ink keeps its shape. A square tile fills the cell exactly, as the
 * shipped ramps always have. Fractions of the cell.
 *
 * @returns {{x:number, y:number, w:number, h:number}}
 */
export function fitInCell(width, height) {
  if (!(width > 0) || !(height > 0) || width === height) return { x: 0, y: 0, w: 1, h: 1 };
  const w = width > height ? 1 : width / height;
  const h = height > width ? 1 : height / width;
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

/**
 * A tile's tone, measured in a small cell. Small is enough — the average is
 * what is wanted — and cheap enough to redo for twelve tiles when the ground
 * changes.
 *
 * @param {CanvasImageSource & {width:number, height:number}} image
 * @param {string} ground
 * @param {string} [weighting]
 */
export function toneOf(image, ground, weighting) {
  const size = 32;
  const canvas = typeof OffscreenCanvas !== 'undefined'
    ? new OffscreenCanvas(size, size)
    : Object.assign(document.createElement('canvas'), { width: size, height: size });
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const f = fitInCell(image.width, image.height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, f.x * size, f.y * size, f.w * size, f.h * size);
  return toneOfPixels(ctx.getImageData(0, 0, size, size).data, ground, weighting);
}
