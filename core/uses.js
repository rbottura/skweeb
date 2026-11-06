/**
 * uses.js — what a set can be used as, and which uses each set is offered to.
 *
 * A `set` is an ordered list of objects (docs/object-model.md, *Sets*), and
 * more than one app can eat one: the gamepad draws with it as a brush family,
 * grid dithers with it as a material, ckt puts it on the dots as sprites. What
 * a set was *made as* is its `recipe.role`, and that is history. Where it is
 * *offered* is a choice the author keeps making — this family in the gamepad,
 * that one only as a material — so it is tags, the one part of an object that
 * may change after it is saved: `use:brushes`, `use:material`.
 *
 * Declared here once, by the consuming side. A link (docs/core-api.md) is a
 * producer's capability — *ckt produces a gamepad brush family* — and this is
 * the other half: *the gamepad can eat a set as brushes*. Neither is inferred.
 *
 * A set with no `use:` tag has never been told, and is offered to the uses
 * whose `role` it was made as — so every family saved before this file keeps
 * working, and a new one appears where it was meant for. Once any `use:` tag
 * is on it, the tags are the whole answer; `use:none` is "offered nowhere".
 *
 * Pure: no DOM, no fetch. The vault detail draws the switches; the apps ask
 * `offers()`.
 */

export const USE_PREFIX = 'use:';
const NONE = USE_PREFIX + 'none';

/**
 * Every use a set can be offered to. `role` is the recipe role a set is
 * offered to it by default. Add a row when an app learns to eat sets.
 */
export const USES = [
  { id: 'brushes',  app: 'gamepad', label: 'gamepad brush family', role: 'brush-family' },
  { id: 'material', app: 'grid',    label: 'grid material',        role: 'material' },
  { id: 'sprites',  app: 'ckt',     label: 'ckt sprite family',    role: null },
  /** M6's link, `set → particles: sprites`. A brush family is sprites already, so it is offered by default. */
  { id: 'particles', app: 'particles', label: 'particle sprites',  role: 'brush-family' },
  /** A sprite copying itself in fractals. A brush family is sprites already. */
  { id: 'copies',   app: 'fractals',  label: 'fractal copies',     role: 'brush-family' },
  /** M8's map editor: a set's members as the tiles a map's cells are painted with. */
  { id: 'tileset',  app: 'map',       label: 'map tileset',        role: 'tileset' },
  /** P3: a character's loops by direction (core/character.js), for the map's avatar to wear (P4). */
  { id: 'character', app: 'map',      label: 'map character',      role: 'character' },
  /** M14: drawings that keep their marks, for the garden's gardener to plant (apps/map/garden/). */
  { id: 'garden',   app: 'map',       label: 'garden flowers',     role: 'flowers' },
];

const isUseTag = t => typeof t === 'string' && t.startsWith(USE_PREFIX);

/**
 * The role a set was made as. An envelope has it in its recipe; an index row
 * carries it on its own, since rows withhold the recipe.
 */
export function roleOf(o) {
  if (!o) return null;
  if (typeof o.role === 'string') return o.role;
  return o.recipe && typeof o.recipe.role === 'string' ? o.recipe.role : null;
}

/** Whether the author has ever said where this set goes. */
export const hasUseTags = o => !!(o && (o.tags || []).some(isUseTag));

/**
 * The ids of the uses a set is offered to — from its tags when it has any,
 * from its role when it has none. Unknown ids in tags are kept: a use this
 * version does not list may be one a later app adds.
 *
 * @param {object} o  an envelope or an index row
 * @returns {Set<string>}
 */
export function usesOf(o) {
  if (!o || o.type !== 'set') return new Set();
  const tags = (o.tags || []).filter(isUseTag);
  if (tags.length) {
    return new Set(tags.filter(t => t !== NONE).map(t => t.slice(USE_PREFIX.length)));
  }
  const role = roleOf(o);
  return new Set(USES.filter(u => u.role && u.role === role).map(u => u.id));
}

/** Whether a set is offered to `use`. Anything but a set never is. */
export const offers = (o, use) => usesOf(o).has(use);

/**
 * The tag edit that leaves a set offered to exactly `uses` — for
 * `Vault.retag()`. Its other tags are not touched. Empty means `use:none`,
 * since no tag at all would put the role's default back.
 *
 * @param {object} o
 * @param {Iterable<string>} uses
 * @returns {{add: string[], remove: string[]}}
 */
export function retagFor(o, uses) {
  const current = (o.tags || []).filter(isUseTag);
  const ids = [...new Set(uses)];
  const want = ids.length ? ids.map(id => USE_PREFIX + id) : [NONE];
  return {
    add: want.filter(t => !current.includes(t)),
    remove: current.filter(t => !want.includes(t)),
  };
}

/**
 * The switches a new version of a set carries over from the one it replaces:
 * its `use:` tags as they were — none, and the role's default applies again.
 */
export const carriedUses = o => ((o && o.tags) || []).filter(isUseTag);

/**
 * The edit that puts a replaced set away: offered nowhere, filed in a folder.
 * It stays in the vault, because whatever was made with it still names it.
 *
 * @param {object} o
 * @param {string} folder
 * @returns {{add: string[], remove: string[]}}
 */
export function retireFor(o, folder) {
  const off = retagFor(o, []);
  return { add: [...off.add, 'folder:' + folder], remove: off.remove };
}
