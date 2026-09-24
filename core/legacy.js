/**
 * legacy.js — what the suite was born with, as vault objects: a sprite from
 * the gamepad's folders, and a material from the original grid sketch's.
 *
 * `apps/gamepad/gamepad_sprites/` holds the families the gamepad was born
 * with: hand-made, ordered by file name, listed in `brush-manifest.json`. They
 * are not objects, so nothing in the vault can name them — and a `set` can only
 * list objects. When one is needed as an object (a member of a grid material,
 * say) it is copied in as a `shape`: a leaf, since nothing can redraw it, filed
 * in a folder named for its family, titled by its place in it.
 *
 * One envelope, built here, for every path that copies one — grid's material
 * maker in the browser, and `scripts/import-legacy-grid.mjs` for the grid
 * sketch's materials, through a browser too: a thumbnail needs a canvas.
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

// ── The original grid sketch's materials ─────────────────────────────────────
//
// grid_sketch (docs/migration.md) loaded seven folders "as mapping material",
// each numbered light to dark: it drew the brightest cells with the first file
// and the darkest with the last — `map(sum, 0, 765, n - 1, 0)` — which is
// skweeb's material order already. Copied in, each is what a material is: a
// `set` with `role: 'material'`, its tiles `shape` leaves in a folder of their
// own, on the black the sketch drew on. Offered to grid by that role alone;
// switch one on for ckt in the vault if it should be sprites too.

/** grid's own, since these were its materials before it was grid. */
export const LEGACY_GRID_ORIGIN = { app: 'grid', version: '1.0.0' };

/** The folder a legacy grid material's tiles are filed in. */
export const legacyGridFolder = material => 'legacy grid ' + material;

/**
 * One tile, everything but the render and thumb.
 *
 * @param {string} material   the sketch's folder, e.g. 'tiles'
 * @param {number} n          the number in its file's name: 1 is the lightest
 */
export function legacyTile(material, n) {
  return {
    type: 'shape',
    title: `${material} ${n}`,
    tags: ['legacy', 'grid', 'tile', material, 'folder:' + legacyGridFolder(material)],
    origin: LEGACY_GRID_ORIGIN,
    recipe: null,
    seed: null,
    parents: [],
  };
}

/**
 * The material: its tiles' ids light to dark, as a set grid offers.
 *
 * @param {string} material
 * @param {string[]} members   the tiles' ids, light to dark
 * @param {object} [opts]
 * @param {string} [opts.ground='#000000']  what the sketch drew them on
 * @param {string} [opts.from]              where they were copied from, for the note
 */
export function legacyMaterial(material, members, { ground = '#000000', from = '' } = {}) {
  const name = `${material} (legacy grid)`;
  return {
    type: 'set',
    title: name,
    note: from ? `from ${from}, in the order the original grid sketch loaded it` : '',
    tags: ['legacy', 'grid', 'material', material],
    origin: LEGACY_GRID_ORIGIN,
    recipe: { members, role: 'material', ground, name },
    seed: null,
    parents: [],
  };
}
