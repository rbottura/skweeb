/**
 * save.js — what leaves the 3D app: a model into the vault, or its picture.
 *
 * A model saves as a `model` (docs/object-model.md): its recipe the panel's
 * values and its shapes, nothing else — never a vertex — and its render a
 * PNG of it from its own camera, drawn by frames.js at the format's size
 * times its scale, the code the replay runs, so the saved picture is the
 * replay's frame. `parents` are whatever the params name, read by
 * `consumedObjectIds()`: none yet, since a shape is made from nothing.
 */

import { openModel }     from './frames.js';
import { Vault }         from '../../core/vault.js';
import { thumbFromBlob } from '../../core/thumb.js';
import { toPng, download } from '../../core/export.js';
import { SHAPES }        from './shapes.js';

export const APP = { app: '3d', version: '1.0.0' };

/** What it is, in words: its shapes, counted — "box, sphere ×2, torus". */
export function titleOf(shapes) {
  const counts = new Map();
  for (const s of shapes || []) {
    if (!s || s.on === false || !SHAPES[s.id]) continue;
    counts.set(s.id, (counts.get(s.id) || 0) + 1);
  }
  if (!counts.size) return 'an empty model';
  return [...counts].map(([id, n]) => SHAPES[id].label + (n > 1 ? ` ×${n}` : '')).join(', ');
}

/**
 * Save the model as it stands.
 *
 * @param {object} args  { params, shapes, renderer } — `shapes` as the cards hold them
 * @returns {Promise<?object>}   the envelope, or null when there is no vault
 */
export async function saveModel({ params, shapes, renderer }) {
  const recipe = { ...params.values, shapes };
  const frames = openModel(recipe, { renderer });
  try {
    const shown = frames.frame(0);
    const blob = await toPng(shown);
    const kinds = [...new Set(shapes.filter(s => s.on !== false && SHAPES[s.id]).map(s => s.id))];
    return await Vault.save({
      type: 'model',
      title: titleOf(shapes),
      tags: ['3d', ...kinds],
      origin: APP,
      seed: null,
      recipe,
      parents: params.consumedObjectIds(),
      render: { blob, ext: 'png', w: shown.width, h: shown.height },
      thumb: await thumbFromBlob(blob),
    });
  } finally {
    frames.dispose();
  }
}

/** The picture at the format's size times its scale, as a PNG: drawn again, not the preview enlarged. */
export async function downloadPicture({ params, shapes, renderer }) {
  const recipe = { ...params.values, shapes };
  const frames = openModel(recipe, { renderer });
  try {
    const shown = frames.frame(0);
    download(await toPng(shown), `model_${shown.width}x${shown.height}.png`);
    return { width: shown.width, height: shown.height };
  } finally {
    frames.dispose();
  }
}
