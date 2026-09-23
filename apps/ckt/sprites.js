/**
 * sprites.js — what gets drawn on each dot.
 *
 * v2 drew a sprite on every dot and nothing else: its fill colour, its tether
 * lines and its anchors belonged to the Matter renderer, and `Render.run` was
 * commented out, so none of them ever reached the screen. The sprites were 81
 * PNGs in v2's own `sprites/` folder, 69 MB — and 59 of the 80 distinct ones
 * are already in this repo as the gamepad's `brushes` family, in the same
 * order. v2's default, `sprites[8]`, is `brushes` number 8, the same file.
 *
 * So the library is the registry: the gamepad's manifest, probed for what is
 * actually on this machine (rule 6 keeps the heavy families out of git), read
 * without p5. Three answers, in order:
 *
 *   shape    a still or shape from the vault — a gamepad drawing on every dot,
 *            which is M3's first test
 *   sprite   one sprite of a registry family, by index
 *   dot      a plain disc in one colour, when there is nothing else — so the
 *            app draws with no vault and no sprites at all (rule 7)
 */

import * as Registry from '../../core/registry.js';
import { Vault }     from '../../core/vault.js';

const GAMEPAD_MANIFEST = '/apps/gamepad/brush-manifest.json';

let _families = null;
const _images = new Map();         // url → Promise<ImageBitmap|null>

/**
 * The families a recipe may name: in the manifest AND on this disk. An empty
 * list when the gamepad's manifest cannot be read — ckt then draws dots.
 *
 * @returns {Promise<Array<{id:string, count:number}>>}
 */
export async function families() {
  if (_families) return _families;
  try {
    await Registry.loadManifest(GAMEPAD_MANIFEST);
    await Registry.probeFamilies();
    _families = Registry.availableManifestFamilies()
      .map(f => ({ id: f.id, count: (f.files || f.urls || []).length }));
  } catch (err) {
    console.warn('[ckt] no sprite families:', err.message);
    _families = [];
  }
  return _families;
}

function image(url) {
  if (!_images.has(url)) {
    _images.set(url, (async () => {
      try {
        const res = await fetch(url);
        return res.ok ? await createImageBitmap(await res.blob()) : null;
      } catch {
        return null;
      }
    })());
  }
  return _images.get(url);
}

/**
 * The mark a recipe asks for, or null for a disc.
 *
 * @param {object} recipe  { mark, shape, family, sprite }
 * @returns {Promise<?ImageBitmap>}
 */
export async function markFor(recipe) {
  if (recipe.mark === 'dot') return null;

  if (recipe.shape) {
    try {
      const { url } = await Vault.load(recipe.shape);
      return await image(url);
    } catch (err) {
      console.warn('[ckt] sprite object would not load:', recipe.shape, err.message);
      return null;
    }
  }

  await families();
  const count = Registry.spriteCount(recipe.family);
  if (!count) return null;
  const index = ((Math.round(recipe.sprite) % count) + count) % count;
  const url = Registry.getSpriteUrl(recipe.family, index);
  return url ? image(url) : null;
}
