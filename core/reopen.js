/**
 * reopen.js — an object back in the app that made it, to go on working on.
 *
 * `/apps/<app>/?open=<id>` boots the app with that object's recipe restored: a
 * ckt still comes back at its frame, a grid dither with its source loaded. The
 * link is the thing to send — to another tab, or to another machine serving
 * the same vault — and it is what M4's compose needs to reach into any object.
 *
 * Which objects an app can take back is the app's own business, asked the way
 * a replay is (core/rebuild.js): its `rebuild.js` may export `reopens(object)`.
 * No export or no file, and there is no link. Core learns nothing about apps —
 * except that a recording of marks is its own, as rebuild.js already knows,
 * and no app has asked to reopen one.
 */

import { Vault } from './vault.js';

/** A recipe that is a recording of marks: core replays these, and no app reopens them. */
const isMarks = recipe => !!recipe
  && (Array.isArray(recipe.marks) || !!(recipe.sequence && Array.isArray(recipe.sequence.events)));

/**
 * The link that opens `object` in its app, or null when the app cannot.
 *
 * @param {object} object   a vault envelope
 * @returns {Promise<?string>}
 */
export async function reopenUrl(object) {
  const app = object && object.origin && object.origin.app;
  // A leaf has no recipe to reopen, and its app — `import`, or the gamepad
  // for a legacy sprite — need not be asked: asking is a 404 in the console.
  if (!app || !object.recipe || isMarks(object.recipe)) return null;
  try {
    const module = await import(/* @vite-ignore */ '/apps/' + app + '/rebuild.js');
    if (typeof module.reopens !== 'function' || !module.reopens(object)) return null;
  } catch {
    return null;
  }
  return '/apps/' + app + '/?open=' + encodeURIComponent(object.id);
}

/**
 * The link that places `object` on a new compose page — M4's link in the
 * catalogue, `any → compose: place on a sheet` — or null when compose does
 * not take it. Which objects it takes is compose's to say (`places()` in its
 * rebuild.js), as which it reopens is each app's.
 *
 * @param {object} object   a vault envelope
 * @returns {Promise<?string>}
 */
export async function placeUrl(object) {
  if (!object || !object.id) return null;
  try {
    const module = await import(/* @vite-ignore */ '/apps/compose/rebuild.js');
    if (typeof module.places !== 'function' || !module.places(object)) return null;
  } catch {
    return null;
  }
  return '/apps/compose/?place=' + encodeURIComponent(object.id);
}

/**
 * The object this page was asked to open, loaded — or null when it was not
 * asked. Throws, with a message fit for the bar, when the id is unknown or
 * belongs to another app.
 *
 * @param {string} app   the app asking, which must be the one that made it
 * @returns {Promise<?{object:object, url:string, thumbUrl:?string}>}
 */
export async function requested(app) {
  const id = new URLSearchParams(location.search).get('open');
  if (!id) return null;
  const loaded = await Vault.load(id);
  const made = loaded.object.origin && loaded.object.origin.app;
  if (made !== app) throw new Error(`${id} was made by ${made || 'nothing known'}, not ${app}`);
  return loaded;
}
