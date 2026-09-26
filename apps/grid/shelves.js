/**
 * shelves.js — what the material maker can pick from.
 *
 * Three kinds of shelf, one shape:
 *
 *   on disk      the gamepad's sprite families, as ckt lists them — the
 *                manifest, and only the families this machine has
 *   vault sets   every set in the vault: a family ckt emitted, a legacy
 *                import, another material
 *   images       the vault's stills and shapes that sit in no folder
 *
 * A shelf is `{ id, label, group, count?, items() }` and an item is
 * `{ key, label, url, thumb, ref }`, where `ref` is how it becomes a member:
 * `{ disk: family, index }` is copied into the vault when the material is
 * saved (core/legacy.js); `{ vault: id }` already is an object. `from` names
 * the set an item was picked out of — the material's lineage.
 */

import * as Registry from '../../core/registry.js';
import { Vault, isTrashed } from '../../core/vault.js';
import { folderOf }  from '../../core/VaultPanel.js';
import { renderUrl } from './materials.js';

const GAMEPAD_MANIFEST = '/apps/gamepad/brush-manifest.json';

const thumbUrl = row => (row.thumb ? '/vault/objects/' + row.id + '/' + row.thumb : null);

/** A vault object as an item. */
function vaultItem(row, from = null) {
  const url = renderUrl(row.id, row.render && row.render.file);
  return { key: 'vault:' + row.id, label: row.title || row.id, url, thumb: thumbUrl(row) || url,
           ref: { vault: row.id }, from };
}

/** Every shelf there is on this machine and in this vault. */
export async function shelves() {
  const out = [];

  try {
    await Registry.loadManifest(GAMEPAD_MANIFEST);
    await Registry.probeFamilies();
    for (const fam of Registry.availableManifestFamilies()) {
      out.push({
        id: 'disk:' + fam.id, label: fam.label || fam.id, group: 'on disk',
        count: Registry.spriteCount(fam.id),
        items: async () => Array.from({ length: Registry.spriteCount(fam.id) }, (_, i) => {
          const url = Registry.getSpriteUrl(fam.id, i);
          return { key: `disk:${fam.id}:${i}`, label: `${fam.id} ${i}`, url, thumb: url,
                   ref: { disk: fam.id, index: i }, from: null };
        }),
      });
    }
  } catch (err) {
    console.warn('[grid] no sprite families on disk:', err.message);
  }

  if (await Vault.refresh()) {
    for (const row of Vault.index.filter(r => r.type === 'set' && !isTrashed(r))) {
      out.push({
        id: 'set:' + row.id, label: row.title || row.id, group: 'vault sets',
        items: () => membersOf(row.id),
      });
    }
    const loose = Vault.index.filter(r => (r.type === 'still' || r.type === 'shape') && !folderOf(r) && !isTrashed(r));
    if (loose.length) {
      out.push({
        id: 'images', label: 'stills and shapes', group: 'vault', count: loose.length,
        items: async () => loose.map(row => vaultItem(row)),
      });
    }
  }
  return out;
}

/** A set's members as items, in its order. A member the index has lost is skipped. */
export async function membersOf(id) {
  return itemsOf((await Vault.load(id)).object);
}

/** The same, from an envelope already loaded. */
export function itemsOf(set) {
  const members = (set.recipe && set.recipe.members) || [];
  return members
    .map(m => Vault.index.find(r => r.id === m))
    .filter(Boolean)
    .map(row => vaultItem(row, set.id));
}
