/**
 * material-save.js — a material, made into a vault `set`.
 *
 * A set lists objects, so a member picked off the gamepad's disk is copied in
 * first, as core/legacy.js says a legacy sprite is copied — once: the vault
 * dedups the same bytes and recipe, so a sprite used in five materials is one
 * object. Then the set: `role: 'material'`, members light to dark, the ground
 * they were ordered on, and a contact sheet of them in one row on that ground.
 *
 * Its `parents` are the sets the members were picked out of — what it was made
 * from. The members themselves are the recipe, and so is its name: the vault
 * dedups on content, so a renamed material must differ in its recipe to be
 * saved at all.
 *
 * ── Editing ─────────────────────────────────────────────────────────────────
 *
 * A material is never changed in place: every dither made with it names it by
 * id and must replay as it was. So "save changes" saves the new version and
 * puts the old one away — offered nowhere, filed in `earlier materials`
 * (core/uses.js, retireFor) — and the new one carries the old one's switches
 * and names it as a parent. To the author that is editing; to the vault it is
 * two objects and the line between them.
 */

/** Where replaced materials are filed. */
export const EARLIER = 'earlier materials';

import { Vault }        from '../../core/vault.js';
import { thumbFromBlob, thumbFromCanvas } from '../../core/thumb.js';
import { toPng }        from '../../core/export.js';
import { legacyShape, legacySet } from '../../core/legacy.js';
import { carriedUses, retireFor, retagFor, usesOf } from '../../core/uses.js';
import { contactSheet } from '../../core/sheet.js';
import { APP }          from './save.js';

/**
 * @param {object} args
 * @param {object[]} args.items           tray items, light to dark (shelves.js)
 * @param {CanvasImageSource[]} args.images  the same, decoded, in the same order
 * @param {string} args.title
 * @param {string} args.ground            what the order was measured on
 * @param {?object} [args.replaces]      the envelope of the version this one replaces
 * @param {(text:string)=>void} [args.onStatus]
 * @returns {Promise<{set: object, unchanged: boolean, retired: ?string}>}
 *   `unchanged` when the vault already had exactly this — nothing new was made;
 *   `retired` is why the old version could not be put away, if it could not
 */
export async function saveMaterial({ items, images, title, ground, replaces = null, onStatus = () => {} }) {
  if (!(await Vault.refresh())) {
    throw new Error('a material lives in the vault — start node server.js');
  }

  const members = [];
  for (let i = 0; i < items.length; i++) {
    onStatus(`member ${i + 1}/${items.length}…`);
    const ref = items[i].ref;
    members.push(ref.vault || await copyLegacy(items[i]));
  }

  onStatus('saving the material…');
  const sheet = contactSheet(images, { cols: images.length, ground });
  const blob = await toPng(sheet);

  const set = await Vault.save({
    type: 'set',
    title,
    tags: ['grid', 'material', ...(replaces ? carriedUses(replaces) : [])],
    origin: APP,
    seed: null,
    recipe: { members, role: 'material', ground, name: title },
    parents: [...new Set([...(replaces ? [replaces.id] : []), ...items.map(i => i.from).filter(Boolean)])],
    render: { blob, ext: 'png', w: sheet.width, h: sheet.height },
    thumb: await thumbFromCanvas(sheet),
  });

  // The same tiles, order, ground and name come back as the object they already
  // are: nothing to replace, and above all nothing to put away.
  if (replaces && set.id === replaces.id) return { set, unchanged: true, retired: null };

  // Edited back to a version that was put away: the vault hands that one back,
  // offered nowhere. Bring it out, with the switches the one it replaces had.
  if ((set.tags || []).includes('folder:' + EARLIER)) {
    const want = new Set([...(replaces ? usesOf(replaces) : []), 'material']);
    const edit = retagFor(set, want);
    edit.remove.push('folder:' + EARLIER);
    set.tags = (await Vault.retag(set.id, edit)).tags;
  }

  let retired = null;
  if (replaces) {
    try {
      await Vault.retag(replaces.id, retireFor(replaces, EARLIER));
    } catch (err) {
      retired = err.message;
    }
  }
  return { set, unchanged: false, retired };
}

/**
 * A whole family off the gamepad's disk, into the vault: every sprite a shape
 * in its legacy folder, and the family as a set in the D-pad's order — offered
 * as a material and as sprites, not to the gamepad, which has the original
 * (core/legacy.js). Run twice, it makes nothing new.
 *
 * @param {object} args
 * @param {string} args.family        the manifest's id
 * @param {object[]} args.items       the shelf's items, in order
 * @param {CanvasImageSource[]} args.images  the same, decoded, for the sheet
 * @param {(text:string)=>void} [args.onStatus]
 * @returns {Promise<object>} the set's envelope
 */
export async function copyFamily({ family, items, images, onStatus = () => {} }) {
  if (!(await Vault.refresh())) throw new Error('no vault to copy into — start node server.js');
  const members = [];
  for (let i = 0; i < items.length; i++) {
    onStatus(`copying ${family}: ${i + 1}/${items.length}…`);
    members.push(await copyLegacy(items[i]));
  }
  const sheet = contactSheet(images);
  const blob = await toPng(sheet);
  return Vault.save({
    ...legacySet(family, members),
    render: { blob, ext: 'png', w: sheet.width, h: sheet.height },
    thumb: await thumbFromCanvas(sheet),
  });
}

/** A sprite off the gamepad's disk, into the vault. Its id, new or the one it already had. */
async function copyLegacy(item) {
  const res = await fetch(item.url);
  if (!res.ok) throw new Error(`${item.label} would not load (HTTP ${res.status})`);
  const blob = await res.blob();
  const bmp = await createImageBitmap(blob);
  const w = bmp.width, h = bmp.height;
  bmp.close();

  const ext = String(item.url).split('.').pop().toLowerCase().replace('jpeg', 'jpg');
  const object = await Vault.save({
    ...legacyShape(item.ref.disk, item.ref.index),
    render: { blob, ext, w, h },
    thumb: await thumbFromBlob(blob),
  });
  if (!object) throw new Error('the vault went away while saving');
  return object.id;
}
