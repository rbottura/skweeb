/**
 * vault-groups.js — groups, by hand (V3, 2026-11-06; docs/workshop.md). The
 * author: "des groupes d'objets pour ranger le vault à terme".
 *
 * A group is a folder (docs/object-model.md, *Tags that group*): the tag
 * `folder:<name>`, a view and never a place — every object still lives at
 * objects/<id>/, so no link changes. What the panel selects for the trash —
 * Ctrl or Shift click — goes *into a group…*, a new name or one there is, or
 * *out of its group*; a group's strip renames it, every member's tag with it.
 * An object is in one group at most: filed in another, it leaves the first.
 * The name is asked for in place (vault-name.js).
 *
 * No DOM.
 */

import { Vault }    from './vault.js';
import { folderOf } from './vault-folder.js';
import { groupName } from './vault-name.js';
export { groupName };

/** Every group among `rows`, by name. */
export const groupsIn = rows => [...new Set(rows.map(folderOf).filter(Boolean))].sort((a, b) => a.localeCompare(b));

/**
 * What a row's tags become, filed in `name` — or out of every group, `name` empty.
 *
 * @returns {{add: string[], remove: string[]}}   as `Vault.retag` takes them; both empty when nothing changes
 */
export function regroup(row, name) {
  const to = groupName(name) ? 'folder:' + groupName(name) : null;
  const had = (row.tags || []).filter(t => typeof t === 'string' && t.startsWith('folder:'));
  return { add: to && !had.includes(to) ? [to] : [], remove: had.filter(t => t !== to) };
}

/**
 * These objects into the group `name`, or out of every group: a retag each that changes anything.
 *
 * @param {string[]} ids
 * @param {?string} name
 * @returns {Promise<number>}  how many changed
 */
export async function fileIn(ids, name) {
  let n = 0;
  for (const id of ids) {
    const row = Vault.index.find(r => r.id === id);
    if (!row) continue;
    const change = regroup(row, name);
    if (!change.add.length && !change.remove.length) continue;
    await Vault.retag(id, change);
    n++;
  }
  return n;
}
