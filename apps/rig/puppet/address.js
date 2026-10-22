/**
 * address.js — the puppet's values in its address, and back.
 *
 * A puppet worn is a performance and saves nothing (main.js); what it is
 * set to lives in its address instead, written as it changes, so the page
 * set up in a window is the same puppet when the address is given to OBS.
 * Only what differs from the defaults is written; `obs` says the page shows
 * the avatar and nothing else. Pure.
 */

import { valuesFor } from '../../../core/params.js';

/** A value as the address writes it: a switch as 1 or 0, the rest as itself. */
const written = (spec, value) => (spec.type === 'bool' ? (value ? '1' : '0') : String(value));

/** A value as the address read it, for params.restore to coerce. */
const read = (spec, text) => {
  if (spec.type === 'bool') return text === '1' || text === 'true';
  if (spec.type === 'range' || spec.type === 'int') return parseFloat(text);
  return text;
};

/**
 * @param {object} params   the puppet's (params.js)
 * @param {object} [opts]
 * @param {boolean} [opts.obs]   the avatar and nothing else
 * @returns {string}  `?…`, or '' when everything is its default
 */
export function toQuery(params, { obs = false } = {}) {
  const defaults = valuesFor(params.schema, {});
  const q = new URLSearchParams();
  for (const key of params.keys) {
    const value = params.get(key);
    if (value == null || JSON.stringify(value) === JSON.stringify(defaults[key])) continue;
    q.set(key, written(params.spec(key), value));
  }
  const s = q.toString() + (obs ? (q.toString() ? '&' : '') + 'obs' : '');
  return s ? '?' + s : '';
}

/**
 * The values an address names, for `params.restore`: what it does not name
 * goes back to its default there.
 *
 * @param {object} params
 * @param {string} search   `location.search`
 */
export function fromQuery(params, search) {
  const q = new URLSearchParams(search), out = {};
  for (const key of params.keys) if (q.has(key)) out[key] = read(params.spec(key), q.get(key));
  return out;
}
