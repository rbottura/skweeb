/**
 * save.js — what leaves the 3D app: a model into the vault, or its picture.
 *
 * A model saves as a `model` (docs/object-model.md): its recipe the panel's
 * values and its shapes, nothing else — never a vertex — and its render a
 * PNG of it from its own camera, drawn by frames.js at the format's size
 * times its scale, the code the replay runs, so the saved picture is the
 * replay's frame. `parents` are whatever the params name, read by
 * `consumedObjectIds()`: none yet, since a shape is made from nothing.
 *
 * A model on a turntable (motion.js) saves as its loop, a `sequence` — what
 * moves is, compose's rule — the same recipe, its picture the frame on
 * screen; every frame of it downloads as numbered PNGs for frames-to-video.
 */

import { readPalettes, palettesIn } from './palettes.js';
import { openModel }     from './frames.js';
import { Vault }         from '../../core/vault.js';
import { thumbFromBlob } from '../../core/thumb.js';
import { toPng, download, runFrames, zipStore, frameName, crc32 } from '../../core/export.js';
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
 * Save the model as it stands — on a turntable, its loop, the frame on screen its picture.
 *
 * @param {object} args  { params, shapes, renderer, tick } — `shapes` as the cards hold them, `tick` the frame on screen
 * @returns {Promise<?object>}   the envelope, or null when there is no vault
 */
export async function saveModel({ params, shapes, renderer, tick = 0 }) {
  const recipe = { ...params.values, shapes };
  await readPalettes(recipe);                          // drawn in the vault's palettes its shapes name, as they are seen
  const frames = openModel(recipe, { renderer });
  try {
    const loop = frames.loop;
    const shown = frames.frame(loop ? tick % frames.length : 0);
    const blob = await toPng(shown);
    const kinds = [...new Set(shapes.filter(s => s.on !== false && SHAPES[s.id]).map(s => s.id))];
    return await Vault.save({
      type: loop ? 'sequence' : 'model',
      state: true,                        // the project's next state, its smart object's (S6b, core/vault.js)
      title: titleOf(shapes) + (loop ? ` · turning ×${frames.length}` : ''),
      tags: ['3d', ...kinds, ...(loop ? ['loop', 'turntable'] : [])],
      origin: APP,
      seed: null,
      recipe,
      parents: [...params.consumedObjectIds(), ...palettesIn(recipe)],   // and the palettes its shapes are drawn in
      render: { blob, ext: 'png', w: shown.width, h: shown.height,
                ...(loop ? { frames: frames.length, fps: frames.fps, loop: true } : {}) },
      thumb: await thumbFromBlob(blob),
    });
  } finally {
    frames.dispose();
  }
}

/** The picture at the format's size times its scale, as a PNG — the frame on screen: drawn again, not the preview enlarged. */
export async function downloadPicture({ params, shapes, renderer, tick = 0 }) {
  const recipe = { ...params.values, shapes };
  await readPalettes(recipe);
  const frames = openModel(recipe, { renderer });
  try {
    const shown = frames.frame(frames.loop ? tick % frames.length : 0);
    download(await toPng(shown), `model_${shown.width}x${shown.height}.png`);
    return { width: shown.width, height: shown.height };
  } finally {
    frames.dispose();
  }
}

/** A frame's PNG as a zip entry by reference: its bytes counted once and let go. */
async function entry(name, canvas) {
  const blob = await toPng(canvas);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return { name, blob, crc: crc32(bytes), size: bytes.length };
}

/** A turntable's every frame as numbered PNGs, and its rate in `meta.json`, for frames-to-video. */
export async function downloadFrames({ params, shapes, renderer, onStatus = () => {} }) {
  const recipe = { ...params.values, shapes };
  await readPalettes(recipe);
  const frames = openModel(recipe, { renderer });
  try {
    const entries = [];
    await runFrames({
      count: frames.length,
      async frame(i) { entries.push(await entry(frameName(i, frames.length), frames.frame(i))); },
      onProgress: (done, total) => onStatus(`drawing ${done}/${total} frames…`),
    });
    entries.push({ name: 'meta.json', bytes: new TextEncoder().encode(JSON.stringify({
      app: APP.app, frames: frames.length, fps: frames.fps, loop: frames.loop, width: frames.width, height: frames.height, recipe,
    }, null, 1)) });
    download(zipStore(entries), `model_${titleOf(shapes).replace(/\W+/g, '-')}_${frames.length}_frames.zip`);
    return { frames: frames.length, fps: frames.fps };
  } finally {
    frames.dispose();
  }
}
