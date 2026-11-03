/**
 * smart.js — a smart object as the object it binds (docs/smart-objects.md,
 * *Smart objects*).
 *
 * A `skw` an app saved is what the app made, bound: its recipe the bound
 * form, `{ kind: 'bound', app, type, recipe, seed }` — the app, the kind of
 * object it made, its own recipe and seed. Drawn, it is that object: its
 * app's rebuild handed the inner envelope, at its latest version or a
 * pinned one (`versions/v<N>.json`, server/versions.js). Reopened in its
 * app, it is that object to work on, and the window is bound to it
 * (core/vault.js `bind`): what the app saves next of its kind is its next
 * version, and everything placing it at `latest` draws it again.
 */

import { Vault }      from './vault.js';
import { openFrames } from './rebuild.js';

/** Whether a vault id names a smart object: its prefix says so (docs/object-model.md, *The envelope*). */
export const isSmart = id => typeof id === 'string' && id.startsWith('skw_');

/**
 * The object a smart object binds, as it is now: the envelope its app takes
 * as its own — its id and render the smart object's, so its picture is found.
 *
 * @param {object} skw   a `skw` envelope
 * @returns {object}
 */
export function unwrap(skw, at = skw) {
  const bound = (at && at.recipe) || {};
  return {
    ...skw,
    type: bound.type || 'still',
    origin: { ...(skw.origin || {}), app: bound.app || (skw.origin && skw.origin.app) },
    recipe: bound.recipe ?? null,
    seed: bound.seed ?? null,
    title: at.title || skw.title,              // a state kept has its own title
    render: at.render || skw.render,
    version: at.version || skw.version || 1,
  };
}

/**
 * The object a smart object binds, at a version: `latest`, or one pinned —
 * what it was then, kept, with its picture of then.
 *
 * @returns {Promise<{object: object, url: ?string}>}
 */
export async function innerOf(skw, { version = 'latest' } = {}) {
  const now = skw.version || 1;
  if (version === 'latest' || Number(version) === now) return { object: unwrap(skw), url: null };
  const at = await Vault.version(skw.id, Number(version));
  const url = at.render && at.render.file ? `/vault/objects/${skw.id}/versions/${at.render.file}` : null;
  return { object: unwrap(skw, at), url };
}

/** Frames of a smart object: the object it binds, drawn by its app (core/rebuild.js `openFrames`). */
export async function openSmart(skw, opts = {}) {
  const { object, url } = await innerOf(skw, opts);
  return openFrames(object, { ...opts, url: url || opts.url });
}
