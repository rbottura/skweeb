/**
 * palettes.js — a vault palette as colours to draw with (V1, docs/workshop.md).
 *
 * The other half of core/vault-palette.js, which makes them: what an app
 * reads of one. Moved here from the 3D app when particles needed it too. A
 * recipe keeps only the palette's id, as every object param does; its colours
 * are read beside it, as core/sprites.js reads a set's pictures and
 * core/points.js an object's dots. No vault, or a palette that will not open,
 * is the caller's to meet.
 */

import { Vault } from './vault.js';

/** A palette's colours from its envelope: `#rrggbb` only — none if it has none. */
export const coloursIn = object => {
  const c = object && object.recipe && Array.isArray(object.recipe.colours) ? object.recipe.colours : [];
  const kept = c.filter(x => /^#[0-9a-f]{6}$/i.test(String(x)));
  return kept.length ? kept : null;
};

/**
 * The colours of a palette, in their order, with its title.
 *
 * @param {string} id   a palette in the vault
 * @returns {Promise<{title: string, colours: string[]}>}
 */
export async function loadPalette(id) {
  const { object } = await Vault.load(id);
  const title = object.title || id;
  if (object.type !== 'palette') throw new Error(`${title} is a ${object.type}, not a palette`);
  const colours = coloursIn(object);
  if (!colours) throw new Error(`${title} has no colours`);
  return { title, colours };
}
