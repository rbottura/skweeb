/**
 * vault-offer.js — a picker's use filter: which sets it offers, what it left
 * out, and what picking past it does.
 *
 * A param of `type: "object"` may say `use: "material"`, and its picker then
 * narrows sets to those switched on for that use (core/uses.js). Split out of
 * VaultPanel.js at its 400-line cap (rule 4), which keeps the grid, the folders
 * and the detail; this keeps the filter.
 */

import { Vault } from './vault.js';
import { USES, offers, usesOf, retagFor, roleOf, hasUseTags } from './uses.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

/**
 * Split rows by a use: what the filter keeps, and the sets it leaves out that
 * nobody has switched — a ckt family that might make a material. One switched
 * off on purpose, like an earlier version put away, was a choice, and is not
 * mentioned. Rows that are not sets always pass. A set whose row carries no `role` came
 * from an index an older server wrote — one still running from before rows had
 * it — so its envelope is asked instead of the set being hidden unplaced.
 *
 * @returns {Promise<{kept: object[], left: object[]}>}
 */
export async function byUse(rows, use) {
  if (!use) return { kept: rows, left: [] };
  await Promise.all(rows.filter(r => r.type === 'set' && !('role' in r)).map(async r => {
    try { r.role = roleOf((await Vault.load(r.id)).object); } catch { r.role = null; }
  }));
  const pass = r => r.type !== 'set' || offers(r, use);
  return { kept: rows.filter(pass), left: rows.filter(r => !pass(r) && !hasUseTags(r)) };
}

/**
 * The line over the grid: how many sets the filter left out, and a button to
 * see them anyway — or, while they are shown, to hide them again.
 */
export function offerNote({ use, left, showAll, onToggle }) {
  const found = USES.find(u => u.id === use);
  const label = found ? found.label : use;
  const n = left.length;
  const box = el('div', 'vp-offer', showAll
    ? `Every set is shown. Using one that is not offered as a ${label} switches it on.`
    : `${n} set${n === 1 ? ' is' : 's are'} not offered as a ${label} — switch one on in its detail, or `);
  const b = el('button', 'vp-btn', showAll ? 'only the offered ones' : 'show them');
  b.addEventListener('click', onToggle);
  box.append(b);
  return box;
}

/**
 * A set picked from past the filter is switched on for the use: using it as
 * one is offering it as one. Its tags as they now are; unchanged on failure.
 */
export async function switchOn(o, use) {
  if (!use || o.type !== 'set' || offers(o, use)) return o.tags;
  try {
    return (await Vault.retag(o.id, retagFor(o, new Set([...usesOf(o), use])))).tags;
  } catch (err) {
    console.warn('[vault] could not switch it on:', err.message);
    return o.tags;
  }
}
