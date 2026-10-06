/**
 * print.js — a model printed: drawn again at a print format's sheet and a
 * dpi, in tiles, into a PNG written as it is drawn (core/png.js). For the
 * poster: 120 × 176 cm at 300 dpi is 14173 × 20787 px, which no canvas holds
 * whole and no GPU draws at once.
 *
 * The picture is the preview's, in more pixels. The camera is the whole
 * sheet's (camera.js `cameraFor`) and each tile a window of it (three's
 * `setViewOffset`), so the tiles meet with no seam; a tile is drawn as the
 * preview draws, over the recipe's ground. The outline's push — a share of
 * the whole picture's height — is given in each tile's own terms; the
 * shadows come from the same map in every tile. A band of tiles goes down
 * into the PNG before the next is drawn: a band is all it ever holds.
 *
 * Drawn again, sharper — never the preview enlarged. A smooth round shape
 * is made with segments enough for the sheet (shapes.js `finer`): 48 round
 * a sphere 4900 pixels across would be five pixels off a circle at its
 * edge; a flat one keeps its facets, its look. The sun's shadow map is
 * 4096 a side rather than 2048, so a shadow's edge is not a smear of texels.
 *
 * A print needs a print format — A5 to A1, or 120×176 — whose millimetres
 * and the dpi make its pixels. Nothing of it goes into the recipe or the
 * vault: it is a file for a printer, and the model saves as it always did.
 */

import { Model } from './scene.js';
import { cameraFor } from './camera.js';
import { outlineOf } from './look.js';
import { writePng } from '../../core/png.js';
import { pixelsAtDpi } from '../../core/formats.js';
import { surface } from '../../core/surface.js';

/** The print's own row: its dpi — the print's, not the model's. */
export const PRINT_PARAMS = {
  dpi: { type: 'int', min: 50, max: 600, default: 300, label: 'dpi' },
};

/** A tile's side at most: what any GPU draws at once, antialiased, without strain. */
export const TILE = 2048;

/** A format's sheet at a dpi, in pixels — null for a format with no sheet. */
export const sheetOf = (format, dpi) => pixelsAtDpi(format, dpi);

/** How many tiles a print of that many pixels is drawn in. */
export const tilesOf = ([w, h], side = TILE) => Math.ceil(w / side) * Math.ceil(h / side);

/**
 * What a print of `width` × `height` asks of the model (scene.js `update`):
 * segments enough for a silhouette half the sheet's height — π√R for R
 * pixels — and the larger shadow map, within the GPU's side.
 */
export function sharper(width, height, renderer = { maxSide: 4096 }) {
  return { detail: Math.ceil(Math.PI * Math.sqrt(Math.max(width, height) / 2)), shadowMap: Math.min(4096, renderer.maxSide) };
}

/**
 * The model drawn at `width` × `height`, tile by tile, written as a PNG.
 *
 * @param {object} opts
 * @param {object} opts.recipe     the model's: its values and its shapes
 * @param {object} opts.renderer   renderer.js's
 * @param {number} opts.width
 * @param {number} opts.height
 * @param {number} [opts.dpi]      written into the PNG
 * @param {number} [opts.tile]     a tile's side, never past the GPU's
 * @param {boolean} [opts.sharpen=true]   round shapes and shadows made for the sheet — false
 *                                        draws exactly the preview's, as a test of the tiling wants
 * @param {(done: number, of: number) => void} [opts.onTile]
 * @returns {Promise<Blob>}
 */
export async function printModel({ recipe, renderer, width, height, dpi = 0, tile = TILE, sharpen = true, onTile = () => {} }) {
  const side = Math.max(16, Math.min(tile, renderer.maxSide));
  const cols = Math.ceil(width / side), rows = Math.ceil(height / side);
  const ground = recipe.ground && recipe.ground !== 'none' ? recipe.ground : null;
  const outline = outlineOf(recipe) * 0.002;
  const model = new Model().update(recipe, sharpen ? sharper(width, height, renderer) : {});
  const ctx = surface(side, side).getContext('2d', { willReadFrequently: true });

  async function* bands() {
    for (let r = 0; r < rows; r++) {
      const y0 = r * side, h = Math.min(side, height - y0);
      const band = new Uint8ClampedArray(width * h * 4);
      for (let c = 0; c < cols; c++) {
        const x0 = c * side, w = Math.min(side, width - x0);
        const camera = cameraFor(recipe, width, height);
        camera.setViewOffset(width, height, x0, y0, w, h);
        if (model.ink) {
          // A push of a share of the whole height, in this tile's height; the tile's own proportions.
          model.ink.width.value = outline * (height / h);
          model.ink.aspect.value = w / h;
        }
        const picture = renderer.draw(model.scene, camera, w, h);
        ctx.clearRect(0, 0, w, h);
        if (ground) {
          ctx.fillStyle = ground;
          ctx.fillRect(0, 0, w, h);
        }
        ctx.drawImage(picture, 0, 0);
        picture.close();
        const px = ctx.getImageData(0, 0, w, h).data;
        for (let y = 0; y < h; y++) band.set(px.subarray(y * w * 4, (y + 1) * w * 4), (y * width + x0) * 4);
        onTile(r * cols + c + 1, rows * cols);
        await new Promise(next => setTimeout(next, 0));     // the bar gets to say how far
      }
      yield { rows: band, count: h };
    }
  }

  try {
    return await writePng({ width, height, dpi, alpha: !ground, bands: bands() });
  } finally {
    model.dispose();
  }
}
