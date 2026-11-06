/**
 * sprites.js — a vault object as sprites to draw with: a set's members in
 * its order, or one picture — a shape, a still, a 3D model — or a smart
 * object binding one, followed at its versions (L11).
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
import { familyFromSet, loadManifest, getSpriteUrl, spriteCount } from './registry.js';

const GAMEPAD_MANIFEST = '/apps/gamepad/brush-manifest.json';

const _images = new Map();         // url, or url and version → Promise<?ImageBitmap>

/** A picture, decoded once — by its address, or by `key`: a smart object's at each version, its address the same (L11). */
function image(url, key = url) {
  if (!_images.has(key)) {
    _images.set(key, (async () => {
      try {
        const res = await fetch(url);
        return res.ok ? await createImageBitmap(await res.blob()) : null;
      } catch {
        return null;
      }
    })());
  }
  return _images.get(key);
}

/** What gives one sprite, its render: a picture — and a 3D model's, the author's sprite of 2026-10-22 (L11). */
const PICTURES = new Set(['shape', 'still', 'model']);

/**
 * The sprites an object gives: a set's members as images, in its order — or
 * one picture, a shape, a still or a model, its render, the sprite of every
 * particle. A smart object is the object it binds, its render its latest
 * state's, read again at each new version (L11). Members that would not load
 * are left out, and said.
 *
 * @param {string} id   a set, a picture, or a smart object binding one, in the vault
 * @returns {Promise<{title: string, images: ImageBitmap[], missing: number}>}
 */
export async function loadSprites(id) {
  let { object, url } = await Vault.load(id);
  if (object.type === 'skw') object = (await import('./smart.js')).unwrap(object);
  if (PICTURES.has(object.type)) {
    const one = await image(url, object.version ? `${url}#v${object.version}` : url);
    return { title: object.title || id, images: one ? [one] : [], missing: one ? 0 : 1 };
  }
  if (object.type !== 'set') throw new Error(`${id} is a ${object.type}, not a set or a picture`);
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

/**
 * How many sprites a family has that marks name — a family of the gamepad's
 * manifest, or a vault set the gamepad drew with — or 0 when neither knows
 * it: what keeps an image's number within its family (the garden, M14).
 *
 * @param {string} familyId
 * @returns {Promise<number>}
 */
export async function familySize(familyId) {
  try {
    await loadManifest(GAMEPAD_MANIFEST);
    const n = spriteCount(familyId);
    if (n) return n;
  } catch {
    // No manifest to read: only a vault set can answer.
  }
  if (!/_\d+_[0-9a-z]+$/.test(String(familyId))) return 0;
  try {
    const { object } = await Vault.load(familyId);
    const family = object.type === 'set' ? familyFromSet(object, Vault.index || []) : null;
    return family ? family.urls.length : 0;
  } catch {
    return 0;
  }
}
