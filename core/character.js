/**
 * character.js — a character, defined once (P3, 2026-11-06; docs/plan.md,
 * *P*): what M8's avatar wears (P4), and what the rig's slug from every side
 * (P5) and a model from every side (P6) are made as.
 *
 * A `set`, `role: 'character'` (docs/object-model.md, *Sets*), its members
 * loops by direction in RPG Maker's order — down, left, right, up — the
 * first frame of each its stance. Three members are down, right and up: the
 * left left out, the right mirrored. Eight directions later, by the same
 * rule — eight members, or five, the lefts left out. The count is the whole
 * rule: nothing beside the members says which is which. The fields the
 * author took on 2026-10-22: "on adaptera sûrement plus tard".
 *
 * Pure: no DOM, no fetch (tests/character.mjs).
 */

/** The role a character's set is made as (core/uses.js, *map character*). */
export const ROLE = 'character';

/** RPG Maker's order: what four members are, in turn. */
export const DIRECTIONS = ['down', 'left', 'right', 'up'];

/** The frame of a direction's loop it stands still on. */
export const STANCE = 0;

/** What a character's members are, in words: the form that makes one by hand says it (core/vault-set.js). */
export const MEMBERS_SAID = 'four loops — down, left, right, up — or three, down, right, up, the left the right mirrored';

/** Whether so many members make a character: four, or three, the left left out. */
export const isCharacterCount = n => n === 4 || n === 3;

/**
 * Each direction's loop, from a character's members — four in RPG Maker's order, or three, the left the
 * right mirrored. Anything else is no character.
 *
 * @param {string[]} members   a character's `recipe.members`
 * @returns {?{down: Way, left: Way, right: Way, up: Way}}   a Way is `{ id, mirrored }`: the loop, and
 *          whether it is drawn flipped left to right
 */
export function waysOf(members) {
  const m = Array.isArray(members) ? members.filter(id => typeof id === 'string') : [];
  const way = (id, mirrored = false) => ({ id, mirrored });
  if (m.length === 4) return { down: way(m[0]), left: way(m[1]), right: way(m[2]), up: way(m[3]) };
  if (m.length === 3) return { down: way(m[0]), left: way(m[1], true), right: way(m[1]), up: way(m[2]) };
  return null;
}

/** A set's ways, when it is a character: its role says so and its count makes one; null otherwise. */
export function characterOf(set) {
  const recipe = set && set.recipe;
  return set && set.type === 'set' && recipe && recipe.role === ROLE ? waysOf(recipe.members) : null;
}
