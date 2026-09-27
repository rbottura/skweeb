/**
 * sprites.js — a vault set as the particles' sprites: M6's link,
 * `set → particles: sprites`.
 *
 * One shape or still is one sprite, drawn for every particle. A set is an
 * ordered list of objects (docs/object-model.md, *Sets*); each
 * member's render is one sprite, in the set's order, and a particle draws
 * `images[floor(pick × n)]` — its `pick` a draw of its own slot, so the same
 * particle is the same sprite every time it is drawn and the loop still
 * closes. The images are the members' render files, as core/registry.js
 * reads a set as a gamepad family (`familyFromSet`), loaded once each.
 *
 * No vault, or a set that will not open: no sprites, and the particles are
 * dots — the app draws all the same (rule 7).
 */

import { Vault }         from '../../core/vault.js';
import { familyFromSet } from '../../core/registry.js';

const _images = new Map();         // url → Promise<?ImageBitmap>

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
 * The sprites an object gives: a set's members as images, in its order — or
 * one shape or still, its render, the sprite of every particle. Members that
 * would not load are left out, and said.
 *
 * @param {string} id   a set, a shape or a still in the vault
 * @returns {Promise<{title: string, images: ImageBitmap[], missing: number}>}
 */
export async function loadSprites(id) {
  const { object, url } = await Vault.load(id);
  if (object.type === 'shape' || object.type === 'still') {
    const one = await image(url);
    return { title: object.title || id, images: one ? [one] : [], missing: one ? 0 : 1 };
  }
  if (object.type !== 'set') throw new Error(`${id} is a ${object.type}, not a set or a sprite`);
  const family = familyFromSet(object, Vault.index || []);
  if (!family) throw new Error(`${object.title || id} has no members`);
  const loaded = await Promise.all(family.urls.map(image));
  const images = loaded.filter(Boolean);
  return { title: object.title || id, images, missing: loaded.length - images.length };
}
