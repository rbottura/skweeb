/**
 * legacy.js — a sprite from the gamepad's folders, as a vault object.
 *
 * `apps/gamepad/gamepad_sprites/` holds the families the gamepad was born
 * with: hand-made, ordered by file name, listed in `brush-manifest.json`. They
 * are not objects, so nothing in the vault can name them — and a `set` can only
 * list objects. When one is needed as an object (a member of a grid material,
 * say) it is copied in as a `shape`: a leaf, since nothing can redraw it, filed
 * in a folder named for its family, titled by its place in it.
 *
 * One envelope, built here, for every path that copies one — grid's material
 * maker in the browser and `scripts/import-legacy-family.mjs` from a terminal.
 * The vault dedups on bytes and recipe, and every copy has the same bytes and a
 * null recipe, so a sprite copied twice, by either path, is one object.
 *
 * Pure: no fetch, no DOM. Runs in Node as it runs in a page.
 */

/** The gamepad's own, since these are its sprites. */
export const LEGACY_ORIGIN = { app: 'gamepad', version: '1.0.0' };

/** The folder a family's copies are filed in (docs/object-model.md, *Tags that group*). */
export const legacyFolder = family => 'legacy ' + family;

/**
 * Everything but the render and thumb.
 *
 * @param {string} family   the manifest's family id, e.g. 'brushes'
 * @param {number} index    its place in the family — what a recorded mark names
 */
export function legacyShape(family, index) {
  return {
    type: 'shape',
    title: `${family} ${index}`,
    tags: ['legacy', 'sprite', family, 'folder:' + legacyFolder(family)],
    origin: LEGACY_ORIGIN,
    recipe: null,
    seed: null,
    parents: [],
  };
}

/**
 * A family on disk, as the `set` of its copies: in the manifest's order, which
 * is the D-pad's. Offered as a material and as sprites, not as brushes — the
 * gamepad already has the family itself, and would list it twice.
 *
 * @param {string} family
 * @param {string[]} members  the copies' ids, in order
 */
export function legacySet(family, members) {
  return {
    type: 'set',
    title: family + ' (legacy)',
    tags: ['legacy', family, 'use:material', 'use:sprites'],
    origin: LEGACY_ORIGIN,
    recipe: { members, role: 'brush-family', family },
    seed: null,
    parents: [],
  };
}
