/**
 * dye.js — a particle in a colour of a palette.
 *
 * A palette (core/palettes.js) gives each particle one of its colours, by a
 * draw of its own (model.js `dye`): the same colour all its life, so a loop
 * still closes. A dot is filled with it (draw.js). A sprite is printed in it,
 * as one ink on paper, for a sprite is rarely flat — of the gamepad's 64
 * brushes 60 have lights and darks, and a still is often opaque:
 *
 *   tones   its darkest tone takes the colour whole, pure white stays white,
 *           and what is between is between. A sprite of one tone, whatever
 *           that tone is, has no lights to keep: it takes the colour whole,
 *           so a white shape is dyed as a black one is.
 *   flat    every pixel that shows takes the colour: a silhouette.
 *
 * Its see-through parts stay as they were. Dyed once for each of a sprite's
 * halvings (core/stamps.js `mipFor`) and each colour, when first drawn, and
 * kept within a budget; the sprite's darkest tone is measured once, so a
 * sprite is the same tint at every scale.
 *
 * The pure parts take numbers and arrays, so tests/particles-model.mjs holds
 * them without a browser.
 */

import { mipFor }  from '../../core/stamps.js';
import { surface } from '../../core/surface.js';

/** A sprite with nothing darker than this far from white is of one pale tone. */
const PALE = 0.1;
/** Below this alpha a pixel is too faint to say what tone the sprite is. */
const FAINT = 128;
/** What the dyed sprites may hold, four bytes a pixel; the oldest are drawn again if wanted. */
const BUDGET = 256 * 1024 * 1024;

const toneAt = (rgba, i) => (0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2]) / 255;

/** The colour a particle's `dye` chooses, of the palette's `inks`. */
export const inkOf = (inks, dye) => inks[Math.min(inks.length - 1, Math.floor(dye * inks.length))];

/**
 * The darkest tone of a picture's pixels that show, 0 to 1.
 *
 * @param {Uint8ClampedArray|Uint8Array} rgba   four bytes a pixel
 * @returns {number}
 */
export function darkest(rgba) {
  let black = 1;
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] >= FAINT) black = Math.min(black, toneAt(rgba, i));
  }
  return black;
}

/**
 * Pixels in one colour, in place; their alpha left alone.
 *
 * @param {Uint8ClampedArray} rgba   four bytes a pixel
 * @param {number[]} ink             [r, g, b], 0 to 255
 * @param {?number} black            the tone that takes the colour whole; null: flat, every pixel does
 * @returns {Uint8ClampedArray}      the same pixels
 */
export function dyePixels(rgba, [r, g, b], black) {
  const span = black == null ? 0 : 1 - black;
  const tones = span > PALE;
  for (let i = 0; i < rgba.length; i += 4) {
    const light = tones ? Math.min(1, Math.max(0, (toneAt(rgba, i) - black) / span)) : 0;
    rgba[i] = r + (255 - r) * light;
    rgba[i + 1] = g + (255 - g) * light;
    rgba[i + 2] = b + (255 - b) * light;
  }
  return rgba;
}

/** A picture's pixels, read once. */
function pixelsOf(picture) {
  const c = surface(picture.width, picture.height).getContext('2d', { willReadFrequently: true });
  c.drawImage(picture, 0, 0);
  return c.getImageData(0, 0, c.canvas.width, c.canvas.height);
}

const _black = new WeakMap();      // a sprite → its darkest tone
const _dyed = new Map();           // its halving's number, the colour and how → the dyed canvas, oldest first
const _numbers = new WeakMap();
let _count = 0, _held = 0;

/** A sprite's darkest tone, measured on a small halving of it: one answer at every scale. */
function blackOf(sprite) {
  if (!_black.has(sprite)) _black.set(sprite, darkest(pixelsOf(mipFor(sprite, 32)).data));
  return _black.get(sprite);
}

const numberOf = picture => {
  if (!_numbers.has(picture)) _numbers.set(picture, ++_count);
  return _numbers.get(picture);
};

/**
 * A sprite's halving in a colour.
 *
 * @param {ImageBitmap} sprite              the sprite, as loaded
 * @param {ImageBitmap|OffscreenCanvas} level   the halving of it about to be drawn
 * @param {string} ink                      `#rrggbb`
 * @param {string} how                      'tones' | 'flat'
 * @returns {OffscreenCanvas|HTMLCanvasElement}
 */
export function dyed(sprite, level, ink, how) {
  const key = `${numberOf(level)}|${ink}|${how}`;
  let out = _dyed.get(key);
  if (out) return out;
  const image = pixelsOf(level);
  dyePixels(image.data, [1, 3, 5].map(i => parseInt(ink.slice(i, i + 2), 16)), how === 'flat' ? null : blackOf(sprite));
  out = surface(level.width, level.height);
  out.getContext('2d').putImageData(image, 0, 0);
  _dyed.set(key, out);
  _held += out.width * out.height * 4;
  while (_held > BUDGET && _dyed.size > 1) {
    const [oldest, gone] = _dyed.entries().next().value;
    _dyed.delete(oldest);
    _held -= gone.width * gone.height * 4;
  }
  return out;
}
