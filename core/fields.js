/**
 * fields.js — a vault object as a field particles move through, asked of
 * the app that made it.
 *
 * A link is declared by the app that produces it (docs/core-api.md,
 * *links.js*): an app's rebuild.js may export `fieldOf(object)`, answering
 * `{ at(x, y) }` — at a point in px from the picture's centre, y down, a
 * direction of length 1 or less — or null when that object makes none. Core
 * finds it by `origin.app`, as it finds `openObject()`, and knows nothing of
 * what the field is. Fractals answer first: escape time, which way the set
 * is (apps/fractals/field.js) — `fractal → particles: a field`.
 */

import { Vault }   from './vault.js';
import { isMarks } from './reopen.js';

/**
 * @param {string} id
 * @returns {Promise<{at(x: number, y: number): [number, number], title: string}>}
 */
export async function loadField(id) {
  const { object } = await Vault.load(id);
  const title = object.title || id;
  const app = object.origin && object.origin.app;
  let module = null;
  // A leaf, or a recording core replays itself, has no app to ask: asking is a 404 in the console.
  if (app && object.recipe && !isMarks(object.recipe)) {
    try {
      module = await import(/* @vite-ignore */ '/apps/' + app + '/rebuild.js');
    } catch {
      module = null;
    }
  }
  const field = module && typeof module.fieldOf === 'function' ? module.fieldOf(object) : null;
  if (!field) throw new Error(`${title} makes no field — escape time from fractals does`);
  return { at: (x, y) => field.at(x, y), title };
}
