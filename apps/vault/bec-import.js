/**
 * bec-import.js — BEC_2025's files into the vault, in one folder (M13b;
 * docs/bec.md). The page half of `scripts/import-bec.mjs`, which serves
 * BEC_2025's folder and drives a browser here, as the legacy grid's import
 * does (scripts/import-legacy-grid.mjs): a thumbnail needs a canvas, and
 * Node has none.
 *
 * Each picture comes in as the panel's `+ pictures` brings one
 * (core/vault-import.js `bringIn`) — a `shape` where any of its pixels lets
 * the ground through, a `still` else, its origin `import` — tagged with what
 * it is to BEC, its format and its layer, and filed in `bec_2025`: the
 * author's "un groupe ou dossier de ce nom avec tous les éléments
 * concernés", for BEC 2027's first renders. BEC's three palettes, written in
 * its code, come in as palettes (core/vault-palette.js), each colour named
 * as BEC named it. The vault dedups on bytes and recipe: brought in twice,
 * it makes nothing new.
 */

import { Vault }       from '../../core/vault.js';
import { bringIn }     from '../../core/vault-import.js';
import { savePalette } from '../../core/vault-palette.js';
import { PALETTES, NAMES } from '../3d/bec-palettes.js';

export const FOLDER = 'bec_2025';

/** The palettes' titles: BEC's names for them, its code's. */
const TITLES = { bec: 'BEC 2025 · the identity', mix: 'BEC 2025 · mix', 'grand paris sud': 'BEC 2025 · Grand Paris Sud' };

/**
 * @param {object} args
 * @param {{url: string, title: string, tags: string[], note: string}[]} args.pictures
 * @returns {Promise<{pictures: number, palettes: number, created: number, failed: string[]}>}
 *   `created`: how many of these objects the vault did not have before
 */
export async function importBec({ pictures }) {
  if (!(await Vault.refresh())) throw new Error('no vault — start node server.js');
  const before = new Set(Vault.index.map(r => r.id));
  const ids = [], failed = [];
  for (const p of pictures) {
    try {
      const res = await fetch(p.url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const { object, bitmap } = await bringIn(await res.blob(), { title: p.title, tags: [...p.tags, 'folder:' + FOLDER], note: p.note });
      if (bitmap) bitmap.close();
      if (object) ids.push(object.id);
    } catch (err) {
      failed.push(`${p.title}: ${err.message}`);
    }
  }
  for (const [key, colours] of Object.entries(PALETTES)) {
    const saved = await savePalette({ title: TITLES[key] || key, colours, names: NAMES, tags: ['bec_2025', 'folder:' + FOLDER] });
    if (saved) ids.push(saved.id);
  }
  return { pictures: pictures.length - failed.length, palettes: Object.keys(PALETTES).length,
    created: ids.filter(id => !before.has(id)).length, failed };
}
