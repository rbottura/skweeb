/**
 * sides.js — a model from every side (M10's sixth brick, P6, 2026-11-06):
 * for the map's avatar to wear.
 *
 * The model drawn from four yaws — a character's directions in RPG Maker's
 * order, down, left, right, up (core/character.js) — each side an object of
 * its own: a loop when its shapes swing, a still model when nothing does; a
 * turntable is no side, so none turns. Down is the model as it is framed,
 * facing the eye; left the eye a quarter round to its left side, right the
 * other way, up from behind. Then a character of the four, made as the
 * vault panel makes a set (core/vault-set.js), its sheet one row. Eight
 * directions later, by the same rule.
 *
 * Each side is saved as an object of its own, `state: false`: a frozen act,
 * which names the state the page holds when it holds one (core/vault.js).
 */

import { saveRecipe, titleOf } from './save.js';
import { makeSet }             from '../../core/vault-set.js';
import { ROLE }                from '../../core/character.js';

/** A side and the eye's turn to it, degrees, in RPG Maker's order. */
export const SIDES = [['down', 0], ['left', 90], ['right', -90], ['up', 180]];

/** A side's recipe: the model's, the eye turned by `offset`, no turntable. */
export const sideRecipe = (recipe, offset) => ({ ...recipe, yaw: recipe.yaw + offset, turns: 0 });

/**
 * The model's four sides saved, and the character of them.
 *
 * @param {object} args   { params, shapes, renderer, onStatus }
 * @returns {Promise<{set: object, sides: object[]}>}
 */
export async function saveSides({ params, shapes, renderer, onStatus = () => {} }) {
  const name = titleOf(shapes);
  const sides = [];
  for (const [face, offset] of SIDES) {
    onStatus(`drawing its ${face} side…`);
    const object = await saveRecipe(sideRecipe({ ...params.values, shapes }, offset),
      { renderer, state: false, title: `${name} · ${face}`, tags: ['side', face], parents: params.consumedObjectIds() });
    if (!object) throw new Error('no vault to keep its sides in');
    sides.push(object);
  }
  onStatus('its character…');
  const { set } = await makeSet({ ids: sides.map(o => o.id), name: `${name} · from every side`, role: ROLE });
  return { set, sides };
}
