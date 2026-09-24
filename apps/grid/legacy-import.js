/**
 * legacy-import.js — a folder of the original grid sketch's tiles, into the
 * vault as a material.
 *
 * The page half of `scripts/import-legacy-grid.mjs`: that script serves the
 * sketch's folders and drives a browser here, because a thumbnail and a
 * contact sheet need a canvas and Node has none. Each tile is saved as the
 * vault's copy of it (core/legacy.js `legacyTile`), under the type its bytes
 * say — the sketch's faces are JPEGs named .png — and then the material, its
 * tiles light to dark in one row on the black the sketch drew on. The vault
 * dedups on bytes and recipe, so importing twice makes nothing new.
 */

import { Vault }        from '../../core/vault.js';
import { thumbFromBlob, thumbFromCanvas } from '../../core/thumb.js';
import { toPng }        from '../../core/export.js';
import { contactSheet } from '../../core/sheet.js';
import { legacyTile, legacyMaterial } from '../../core/legacy.js';

/** A file's own type, read off its first bytes: its name may say otherwise. */
async function kindOf(blob) {
  const b = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return 'png';
  if (b[0] === 0xff && b[1] === 0xd8) return 'jpg';
  if (b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp';
  throw new Error('not a picture the vault keeps');
}

/**
 * @param {object} args
 * @param {string} args.material               the sketch's folder name
 * @param {{n: number, url: string}[]} args.tiles  in order, light to dark
 * @param {string} [args.from]                 where they came from, for the set's note
 * @param {string} [args.ground='#000000']
 * @returns {Promise<{set: {id, title}, members: string[], created: number}>}
 *   `created`: how many of these objects the vault did not have before
 */
export async function importLegacyMaterial({ material, tiles, from = '', ground = '#000000' }) {
  if (!(await Vault.refresh())) throw new Error('no vault — start node server.js');
  const before = new Set(Vault.index.map(r => r.id));

  const members = [];
  const images = [];
  try {
    for (const tile of tiles) {
      const res = await fetch(tile.url);
      if (!res.ok) throw new Error(`${tile.url} would not load (HTTP ${res.status})`);
      const blob = await res.blob();
      const ext = await kindOf(blob);
      const bmp = await createImageBitmap(blob);
      images.push(bmp);
      const object = await Vault.save({
        ...legacyTile(material, tile.n),
        render: { blob, ext, w: bmp.width, h: bmp.height },
        thumb: await thumbFromBlob(blob),
      });
      members.push(object.id);
    }

    const sheet = contactSheet(images, { cols: images.length, ground });
    const blob = await toPng(sheet);
    const set = await Vault.save({
      ...legacyMaterial(material, members, { ground, from }),
      render: { blob, ext: 'png', w: sheet.width, h: sheet.height },
      thumb: await thumbFromCanvas(sheet),
    });

    const created = new Set([...members, set.id].filter(id => !before.has(id))).size;
    return { set: { id: set.id, title: set.title }, members, created };
  } finally {
    for (const bmp of images) bmp.close();
  }
}
