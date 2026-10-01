/**
 * sprites.js — a vault object as sprites to draw with: a set's members in
 * its order, or one shape or still.
 *
 * A set is an ordered list of objects (docs/object-model.md, *Sets*); each
 * member's render is one sprite, as core/registry.js reads a set as a
 * gamepad family (`familyFromSet`), loaded once each. Particles draw
 * `images[floor(pick × n)]` for each particle — M6's link, `set → particles:
 * sprites` — and fractals a member for each level of copies. Moved here from
 * particles when fractals needed it too.
 *
 * No vault, or an object that will not open, is the caller's to meet: both
 * apps draw dots or nothing instead, and go on (rule 7).
 *
 * And one recorded mark's picture (`familySprite`): the sprite a gamepad
 * mark names by family and index, without p5 — for the rig, which draws a
 * drawing again from its marks.
 */

import { Vault }         from './vault.js';
import { familyFromSet, loadManifest, getSpriteUrl } from './registry.js';

const GAMEPAD_MANIFEST = '/apps/gamepad/brush-manifest.json';

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

/**
 * The picture of one recorded mark: sprite `index` of the family `familyId` —
 * a family of the gamepad's manifest, or a vault set the gamepad drew with,
 * which a mark names by the set's id (core/registry.js `familyFromSet`). Null
 * when neither has it: the family is not on this disk, or the set is gone.
 *
 * @param {string} familyId
 * @param {number} index
 * @returns {Promise<?ImageBitmap>}
 */
export async function familySprite(familyId, index) {
  let url = '';
  try {
    await loadManifest(GAMEPAD_MANIFEST);
    url = getSpriteUrl(familyId, index);
  } catch {
    // No manifest to read: only a vault set can answer.
  }
  if (!url && /_\d+_[0-9a-z]+$/.test(String(familyId))) {
    try {
      const { object } = await Vault.load(familyId);
      const family = object.type === 'set' ? familyFromSet(object, Vault.index || []) : null;
      url = (family && family.urls[index]) || '';
    } catch {
      url = '';
    }
  }
  return url ? image(url) : null;
}
