/**
 * save.js — what leaves particles: a loop, a still, every frame, or a sprite sheet.
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
import { buildSheet }    from '../../core/spritesheet.js';

export const APP = { app: 'particles', version: '1.0.0' };

/** What it is, in words: its mode and rate, what it leaves from, and what it is drawn with. */
function titleOf(emit, spritesTitle, points) {
  const what = emit.mode === 'burst' ? `a burst of ${emit.count}` : `${emit.rate} a second`;
  const from = emit.shape === 'object' && points ? ` · from ${points.title}` : '';
  return `particles · ${what}${from} · ${spritesTitle || 'dots'}`;
}

/**
 * Save a loop, or the frame on screen as a still.
 *
 * @param {object} args
 * @param {object} args.emit          the emitter's Params
 * @param {object} args.picture       the picture's Params
 * @param {?Array} args.sprites       the set's images, or null for dots
 * @param {?string} args.spritesTitle the set's title, for the object's
 * @param {?object} [args.points]     an object emitter's points and title (core/points.js)
 * @param {?object} [args.field]      a field from another object (core/fields.js)
 * @param {number} args.tick          the frame on screen
 * @param {boolean} [args.still]      one frame, not the loop
 * @returns {Promise<?object>}        the envelope, or null when there is no vault
 */
export async function saveParticles({ emit, picture, sprites, spritesTitle, points = null, field = null, tick, still = false }) {
  const recipe = { emit: emit.values, picture: picture.values, ...(still ? { tick } : {}) };
  const frames = openParticles(recipe, sprites, { points, field });
  const shown = frames.frame(tick);
  const blob = await toPng(shown);
  const loop = frames.length > 1;

  return Vault.save({
    type: loop ? 'sequence' : 'still',
    state: !still,                      // S: the project's next state (S6b); the frame as a still, frozen
    title: titleOf(recipe.emit, spritesTitle, points) + (loop ? ` ×${frames.length}` : ` · frame ${tick + 1}`),
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
export async function downloadFrames({ emit, picture, sprites, points = null, field = null, onStatus = () => {} }) {
  const recipe = { emit: emit.values, picture: picture.values };
  const frames = openParticles(recipe, sprites, { points, field });
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

/**
 * The loop as a sprite sheet for a game (core/spritesheet.js): every frame on
 * one PNG, cropped to the box the particles reach over the whole loop, and
 * the Aseprite-style JSON beside it — both in one zip, `<name>.png` and
 * `<name>.json`, so the browser asks once. Drawn on no ground, whatever the
 * picture's is: a game puts its own under a sprite.
 *
 * @returns {Promise<{name, frames, width, height, box}>}
 */
export async function downloadSheet({ emit, picture, sprites, points = null, field = null, onStatus = () => {} }) {
  const recipe = { emit: emit.values, picture: { ...picture.values, ground: 'none' } };
  const frames = openParticles(recipe, sprites, { points, field });
  const name = `particles_${recipe.emit.mode}_${frames.length}f`;
  const { canvas, json, box, layout } = await buildSheet({
    count: frames.length, frame: i => frames.frame(i), fps: frames.fps, name, loop: frames.loop,
    source: { app: APP.app, recipe },
    onProgress: (done, total) => onStatus(`drawing the sheet ${done}/${total}…`),
  });
  const blob = await toPng(canvas);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  download(zipStore([
    { name: `${name}.png`, blob, crc: crc32(bytes), size: bytes.length },
    { name: `${name}.json`, bytes: new TextEncoder().encode(JSON.stringify(json, null, 1)) },
  ]), `${name}_sheet.zip`);
  return { name, frames: frames.length, width: layout.width, height: layout.height, box };
}
