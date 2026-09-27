/**
 * save.js — what leaves particles: a loop, a still, or every frame.
 *
 * A loop saves as a `sequence` — a stream that closes, or a burst that plays
 * once — its render the frame on screen, compose's rule for a picture that
 * moves: pause where it looks like itself, and that is its picture. The loop
 * itself is the recipe, `{ emit, picture }`, the two panels' values, and
 * rebuild.js plays it again from that. A still is one frame of it, the same
 * recipe and the `tick` it is.
 *
 * The sprite set is the object's parent, read off the picture's `object`
 * param by `consumedObjectIds()` — this file assembles no lineage. The seed
 * is the emitter's: what every slot drew from.
 *
 * Every render is drawn exactly, at the picture's `scale`, by frames.js —
 * the code the replay runs, so the saved picture is the replay's frame.
 */

import { openParticles } from './frames.js';
import { Vault }         from '../../core/vault.js';
import { thumbFromBlob } from '../../core/thumb.js';
import { runFrames, toPng, zipStore, frameName, download, crc32 } from '../../core/export.js';

export const APP = { app: 'particles', version: '1.0.0' };

/** What it is, in words: its mode and rate, and what it is drawn with. */
function titleOf(emit, spritesTitle) {
  const what = emit.mode === 'burst' ? `a burst of ${emit.count}` : `${emit.rate} a second`;
  return `particles · ${what} · ${spritesTitle || 'dots'}`;
}

/**
 * Save a loop, or the frame on screen as a still.
 *
 * @param {object} args
 * @param {object} args.emit          the emitter's Params
 * @param {object} args.picture       the picture's Params
 * @param {?Array} args.sprites       the set's images, or null for dots
 * @param {?string} args.spritesTitle the set's title, for the object's
 * @param {number} args.tick          the frame on screen
 * @param {boolean} [args.still]      one frame, not the loop
 * @returns {Promise<?object>}        the envelope, or null when there is no vault
 */
export async function saveParticles({ emit, picture, sprites, spritesTitle, tick, still = false }) {
  const recipe = { emit: emit.values, picture: picture.values, ...(still ? { tick } : {}) };
  const frames = openParticles(recipe, sprites);
  const shown = frames.frame(tick);
  const blob = await toPng(shown);
  const loop = frames.length > 1;

  return Vault.save({
    type: loop ? 'sequence' : 'still',
    title: titleOf(recipe.emit, spritesTitle) + (loop ? ` ×${frames.length}` : ` · frame ${tick + 1}`),
    tags: ['particles', ...(loop ? ['loop'] : []), ...(recipe.emit.mode === 'burst' ? ['burst'] : [])],
    origin: APP,
    seed: recipe.emit.seed,
    recipe,
    parents: [...emit.consumedObjectIds(), ...picture.consumedObjectIds()],
    render: {
      blob, ext: 'png', w: shown.width, h: shown.height,
      ...(loop ? { frames: frames.length, fps: frames.fps, loop: frames.loop } : {}),
    },
    thumb: await thumbFromBlob(blob),
  });
}

/**
 * Every frame of the loop as numbered PNGs, and its rate in `meta.json` —
 * what scripts/frames-to-video.mjs turns into a video, and what a sprite
 * sheet will be cut from. Drawn exactly, at the picture's scale.
 *
 * @returns {Promise<{frames: number, fps: number, width: number, height: number}>}
 */
export async function downloadFrames({ emit, picture, sprites, onStatus = () => {} }) {
  const recipe = { emit: emit.values, picture: picture.values };
  const frames = openParticles(recipe, sprites);
  const entries = [];
  await runFrames({
    count: frames.length,
    async frame(i) {
      // By reference: its bytes counted once and let go, so a long loop holds one frame at a time.
      const blob = await toPng(frames.frame(i));
      const bytes = new Uint8Array(await blob.arrayBuffer());
      entries.push({ name: frameName(i, frames.length), blob, crc: crc32(bytes), size: bytes.length });
    },
    onProgress: (done, total) => onStatus(`drawing ${done}/${total} frames…`),
  });
  entries.push({
    name: 'meta.json',
    bytes: new TextEncoder().encode(JSON.stringify({
      app: APP.app, frames: frames.length, fps: frames.fps, loop: frames.loop,
      width: frames.width, height: frames.height, recipe,
    }, null, 1)),
  });
  download(zipStore(entries), `particles_${frames.length}_frames.zip`);
  return { frames: frames.length, fps: frames.fps, width: frames.width, height: frames.height };
}
