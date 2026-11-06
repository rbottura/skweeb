/**
 * vault-import.js — pictures from outside the suite, into the vault.
 *
 * A sprite drawn in another program, a photograph, a folder of frames: none
 * was made by an app here, so none has a recipe, and each comes in as what
 * the object model calls a leaf (docs/object-model.md, *The recipe
 * contract*) — its pixels, viewable, usable as input by every app, never
 * redrawn. The legacy sprites are the same kind of object (core/legacy.js).
 *
 *   one picture       a `shape` when any of its pixels is see-through — a
 *                     sprite, as the object model has it: a png with alpha —
 *                     and a `still` when none is. Titled by its file's name.
 *   several at once   each one so, and a `set` of them too, in their files'
 *                     order: a sprite family, `role: 'brush-family'`, so the
 *                     gamepad and particles are offered it by default
 *                     (core/uses.js).
 *
 * Its origin is `import`, which no app answers to, so nothing tries to
 * reopen or replay one: its render is what it is. The vault dedups on bytes
 * and recipe, so a file brought in twice is one object.
 *
 * The panel's side is `wireImport()`: a button in its head, and a drop
 * anywhere on it. Split from VaultPanel.js, which is at its line cap.
 */

import { Vault }         from './vault.js';
import { thumbFromBlob } from './thumb.js';
import { contactSheet }  from './sheet.js';
import { toPng }         from './export.js';

export const IMPORT_ORIGIN = { app: 'import', version: '1.0.0' };

/** What the vault writes as it came; anything else is drawn again as a png. */
const KEEP = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

/** A file's name without its extension: what it is called here. */
export const titleOf = name => String(name || 'picture').replace(/\.[^.]+$/, '') || 'picture';

/** Whether any pixel of an image lets the ground through. */
function hasAlpha(bitmap) {
  const c = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 255) return true;
  return false;
}

/**
 * One picture into the vault, as a shape or a still, titled and tagged as asked — the panel's `+ pictures`
 * and an importer of a project's files alike (apps/vault/bec-import.js, M13b).
 *
 * @param {Blob} file
 * @param {{title: string, tags?: string[], note?: string}} o
 * @returns {Promise<{object: ?object, bitmap: ?ImageBitmap}>}
 */
export async function bringIn(file, { title, tags = [], note = '' }) {
  const bitmap = await createImageBitmap(file);
  try {
    const sprite = hasAlpha(bitmap);
    let blob = file, ext = KEEP[file.type];
    if (!ext) {
      const c = new OffscreenCanvas(bitmap.width, bitmap.height);
      c.getContext('2d').drawImage(bitmap, 0, 0);
      blob = await toPng(c);
      ext = 'png';
    }
    const object = await Vault.save({
      type: sprite ? 'shape' : 'still',
      title,
      tags: [...tags, ...(sprite ? ['sprite'] : [])],
      note,
      origin: IMPORT_ORIGIN,
      recipe: null,
      seed: null,
      parents: [],
      render: { blob, ext, w: bitmap.width, h: bitmap.height },
      thumb: await thumbFromBlob(blob),
    });
    return { object, bitmap: object ? await createImageBitmap(blob) : null };
  } finally {
    bitmap.close();
  }
}

/** One file into the vault, as a shape or a still, named for its file. */
const importOne = file => bringIn(file, { title: titleOf(file.name), tags: ['import'] });

/**
 * Pictures into the vault: each a shape or a still, and several a set too.
 *
 * @param {File[]} files   images; anything else is left out
 * @param {object} [opts]
 * @param {(text: string) => void} [opts.onStatus]
 * @returns {Promise<{objects: object[], set: ?object, skipped: number}>}
 */
export async function importPictures(files, { onStatus = () => {} } = {}) {
  const pictures = [...files].filter(f => f.type.startsWith('image/'))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const objects = [], bitmaps = [];
  for (const [i, file] of pictures.entries()) {
    onStatus(`bringing in ${i + 1} of ${pictures.length}…`);
    try {
      const { object, bitmap } = await importOne(file);
      if (object) { objects.push(object); bitmaps.push(bitmap); }
    } catch (err) {
      console.warn('[vault] could not bring in', file.name, err);
    }
  }

  let set = null;
  if (objects.length > 1) {
    const sheet = contactSheet(bitmaps);
    const blob = await toPng(sheet);
    const first = titleOf(pictures[0].name), last = titleOf(pictures[pictures.length - 1].name);
    set = await Vault.save({
      type: 'set',
      title: `${first} … ${last} (${objects.length})`,
      tags: ['import'],
      origin: IMPORT_ORIGIN,
      recipe: { members: objects.map(o => o.id), role: 'brush-family' },
      seed: null,
      parents: [],
      render: { blob, ext: 'png', w: sheet.width, h: sheet.height },
      thumb: await thumbFromBlob(blob),
    });
  }
  for (const b of bitmaps) b && b.close();
  return { objects, set, skipped: files.length - pictures.length };
}

/**
 * The panel's way in: a button for its head, and a drop anywhere on the
 * panel. What was brought in is said on the button a moment, and the panel
 * refreshes to show it.
 *
 * @param {HTMLElement} root              the panel
 * @param {() => void} onDone             refresh it
 * @returns {HTMLButtonElement}           the head's button
 */
export function wireImport(root, onDone) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'vp-btn vp-import';
  button.textContent = '+ pictures';
  button.title = 'Bring pictures in from your disk — or drop them on the vault. Several at once make a set too.';
  const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*', multiple: true, hidden: true });

  const run = async files => {
    if (!files || !files.length) return;
    const said = t => { button.textContent = t; };
    if (!Vault.available) { said('no vault'); setTimeout(() => { button.textContent = '+ pictures'; }, 2500); return; }
    button.disabled = true;
    try {
      const { objects, set, skipped } = await importPictures(files, { onStatus: said });
      said(objects.length ? `+ ${objects.length}${set ? ' and a set' : ''}` : skipped ? 'not pictures' : 'none came in');
    } catch (err) {
      console.error('[vault] import failed:', err);
      said('failed');
    } finally {
      button.disabled = false;
      input.value = '';
      onDone();
      setTimeout(() => { button.textContent = '+ pictures'; }, 2500);
    }
  };

  button.addEventListener('click', () => input.click());
  input.addEventListener('change', () => run(input.files));
  root.append(input);
  // Files only: a card dragged out of the vault (vault-drag.js) is not pictures coming in.
  const files = e => !!e.dataTransfer && [...e.dataTransfer.types].includes('Files');
  root.addEventListener('dragover', e => { if (!files(e)) return; e.preventDefault(); root.classList.add('vp--drop'); });
  root.addEventListener('dragleave', e => { if (e.target === root) root.classList.remove('vp--drop'); });
  root.addEventListener('drop', e => {
    if (!files(e)) return;
    // Stopped here: an app may take a drop on its page as its own source (filter does).
    e.preventDefault();
    e.stopPropagation();
    root.classList.remove('vp--drop');
    run(e.dataTransfer && e.dataTransfer.files);
  });
  return button;
}
