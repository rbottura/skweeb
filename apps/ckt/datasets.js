/**
 * datasets.js — the dots stage two draws on.
 *
 * Two kinds, one shape. The nine v2 shipped, listed by the generated
 * `dataset-manifest.json` (rule 3); and any `dataset` object stage one has
 * saved to the vault. Both are `[glyph][point][x, y]` in the pixels they were
 * found at, so stage two never asks which it has.
 *
 * v2 showed one glyph at a time and stepped through them with the arrow keys.
 * So does this: a glyph is an index. Nothing recorded which letter glyph 43 of
 * `minipax` is — v2's `char = 65 + i` label assumed A–Z and is wrong for six
 * of the nine — so nothing here pretends to know.
 *
 * Absolute URLs throughout, because a ckt object has to replay from pages that
 * are not ckt's: the vault viewer, or grid dithering a ckt loop.
 */

import { Vault } from '../../core/vault.js';

const ROOT = '/apps/ckt/';

let _manifest = null;
const _cache = new Map();          // 'shipped:id' | 'made:id' → Promise<data>

/** The shipped list, once. */
export async function manifest() {
  if (_manifest) return _manifest;
  const res = await fetch(ROOT + 'dataset-manifest.json', { cache: 'no-store' });
  if (!res.ok) throw new Error('ckt: no dataset manifest (HTTP ' + res.status + ')');
  _manifest = await res.json();
  return _manifest;
}

/** One of the nine. An empty dataset for an unknown id: the app still draws. */
function loadShipped(id) {
  const key = 'shipped:' + id;
  if (!_cache.has(key)) {
    _cache.set(key, (async () => {
      const entry = (await manifest()).datasets.find(d => d.id === id);
      if (!entry) { console.warn('[ckt] no such dataset:', id); return []; }
      const res = await fetch(ROOT + entry.file);
      return res.ok ? res.json() : [];
    })());
  }
  return _cache.get(key);
}

/** One made in stage one. Its render *is* the data. */
function loadMade(id) {
  const key = 'made:' + id;
  if (!_cache.has(key)) {
    _cache.set(key, (async () => {
      const { object, url } = await Vault.load(id);
      if (object.type !== 'dataset') throw new Error(`ckt: ${id} is a ${object.type}, not a dataset`);
      const res = await fetch(url);
      if (!res.ok) throw new Error('ckt: could not read dataset ' + id);
      return res.json();
    })());
  }
  return _cache.get(key);
}

/**
 * The dataset a stage-two recipe names: the one it made, else the shipped one.
 *
 * @param {object} recipe  { made, dataset }
 * @returns {Promise<number[][][]>}
 */
export function datasetFor(recipe) {
  return recipe.made ? loadMade(recipe.made) : loadShipped(recipe.dataset);
}

/** Forget a made dataset, so a re-saved one under a new id is not shadowed. */
export function remember(id, data) {
  _cache.set('made:' + id, Promise.resolve(data));
}

/** One glyph, the index wrapped — v2's arrow keys went round. */
export function glyphOf(data, index) {
  if (!data || !data.length) return [];
  const n = data.length;
  return data[((Math.round(index) % n) + n) % n] || [];
}
