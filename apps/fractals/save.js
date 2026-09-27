/**
 * save.js — what leaves fractals: a still or a loop into the vault, every
 * frame, or a sprite sheet.
 *
 * A still saves as a `still`; a moving copies picture — an idle — as a
 * `sequence` of its loop at its `fps`, its picture the frame on screen,
 * compose's rule for a picture that moves. The recipe is the panel's values
 * and nothing else: rebuild.js draws every frame again from them. The
 * copies' sprite is the object's parent, read off the `object` param by
 * `consumedObjectIds()` — this file assembles no lineage.
 *
 * Every render is drawn exactly, at the format's size times its scale, by
 * frames.js — the code the replay runs — so the saved picture is the
 * replay's frame.
 */

import { openFractal }   from './frames.js';
import { Vault }         from '../../core/vault.js';
import { thumbFromBlob } from '../../core/thumb.js';
import { buildSheet }    from '../../core/spritesheet.js';
import { runFrames, toPng, zipStore, frameName, download, crc32 } from '../../core/export.js';

export const APP = { app: 'fractals', version: '1.0.0' };

/** What it is, in words. */
function titleOf(v, spriteTitle) {
  if (v.family !== 'copies') {
    return v.kind === 'julia' ? `julia ${v.jx.toPrecision(4)}, ${v.jy.toPrecision(4)}` : `mandelbrot ×${Math.round(v.zoom)}`;
  }
  const moving = v.move && v.move !== 'none' ? ` · ${v.move} ${+v.from.toFixed(2)} ↔ ${+v.to.toFixed(2)}` : '';
  return `${spriteTitle || 'dots'} · ${v.shape} ${v.depth}${moving}`;
}

/** A frame's PNG as a zip entry by reference: its bytes counted once and let go. */
async function entry(name, canvas) {
  const blob = await toPng(canvas);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  return { name, blob, crc: crc32(bytes), size: bytes.length };
}

/**
 * Save what is on screen: a still, or a loop with the frame on screen as
 * its picture.
 *
 * @param {object} args  { params, sprites, spriteTitle, runner, tick }
 * @returns {Promise<?object>}   the envelope, or null when there is no vault
 */
export async function saveFractal({ params, sprites, spriteTitle, runner, tick = 0 }) {
  const recipe = params.values;
  const frames = openFractal(recipe, { sprites, runner });
  const loop = frames.length > 1;
  const shown = frames.frame(loop ? tick : 0);
  const blob = await toPng(shown);
  return Vault.save({
    type: loop ? 'sequence' : 'still',
    title: titleOf(recipe, spriteTitle) + (loop ? ` ×${frames.length}` : ''),
    tags: ['fractals', recipe.family, ...(loop ? ['loop', 'idle'] : [])],
    origin: APP,
    seed: null,
    recipe,
    parents: params.consumedObjectIds(),
    render: {
      blob, ext: 'png', w: shown.width, h: shown.height,
      ...(loop ? { frames: frames.length, fps: frames.fps, loop: true } : {}),
    },
    thumb: await thumbFromBlob(blob),
  });
}

/** Every frame as numbered PNGs, and its rate in `meta.json`, for frames-to-video. */
export async function downloadFrames({ params, sprites, runner, onStatus = () => {} }) {
  const recipe = params.values;
  const frames = openFractal(recipe, { sprites, runner });
  const entries = [];
  await runFrames({
    count: frames.length,
    async frame(i) { entries.push(await entry(frameName(i, frames.length), frames.frame(i))); },
    onProgress: (done, total) => onStatus(`drawing ${done}/${total} frames…`),
  });
  entries.push({ name: 'meta.json', bytes: new TextEncoder().encode(JSON.stringify({
    app: APP.app, frames: frames.length, fps: frames.fps, loop: frames.loop, width: frames.width, height: frames.height, recipe,
  }, null, 1)) });
  download(zipStore(entries), `fractal_${recipe.shape || recipe.kind}_${frames.length}_frames.zip`);
  return { frames: frames.length, fps: frames.fps };
}

/**
 * The loop as a sprite sheet for a game (core/spritesheet.js): every frame
 * on one PNG, cropped to the box the copies reach over the loop, with
 * Aseprite's JSON beside it, in one zip — drawn on no ground.
 */
export async function downloadSheet({ params, sprites, runner, onStatus = () => {} }) {
  const recipe = { ...params.values, ground: 'none' };
  const frames = openFractal(recipe, { sprites, runner });
  const name = `fractal_${recipe.shape || recipe.kind}_${frames.length}f`;
  const { canvas, json, box, layout } = await buildSheet({
    count: frames.length, frame: i => frames.frame(i), fps: frames.fps || 1, name, loop: frames.loop,
    source: { app: APP.app, recipe },
    onProgress: (done, total) => onStatus(`drawing the sheet ${done}/${total}…`),
  });
  download(zipStore([
    await entry(`${name}.png`, canvas),
    { name: `${name}.json`, bytes: new TextEncoder().encode(JSON.stringify(json, null, 1)) },
  ]), `${name}_sheet.zip`);
  return { name, frames: frames.length, width: layout.width, height: layout.height, box };
}
