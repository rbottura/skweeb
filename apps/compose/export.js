/**
 * export.js — a page out of compose, as files.
 *
 * A PNG of the page, or every frame of a page that moves, zipped with its
 * rate for `scripts/frames-to-video.mjs`: the author's choice of 2026-09-24,
 * and no PDF for now. Both are drawn from exact frames at the page's own
 * scale (render.js), every object asked for the size it will be printed at,
 * so a page at scale 2 is its objects drawn again at twice their size, not
 * its preview enlarged. What could only be stretched — a picture no app can
 * draw again — comes back by name, for the bar to say before anyone prints.
 *
 * A frame's PNG goes into the zip as a Blob, by reference (core/export.js
 * `zipStore`), so a long export holds one frame's bytes at a time.
 */

import { renderComposition, openComposition, surface } from './render.js';
import { toPng, runFrames, zipStore, frameName, download, crc32 } from '../../core/export.js';
import { labelOf } from '../../core/frame.js';

/** A file's name for a page: what it is and how many pixels, `compose_A4_2480x3508`. */
const fileName = (recipe, w, h) =>
  `compose_${String(labelOf(recipe.page.format)).replace(/[^a-z0-9]+/gi, '-')}_${w}x${h}`;

/**
 * The page at one tick, as a PNG, downloaded.
 *
 * @param {{page: object, place: object[]}} recipe   a snapshot
 * @param {object} [opts]
 * @param {number} [opts.tick]
 * @returns {Promise<{width, height, bytes, stretched: string[]}>}
 */
export async function exportPng(recipe, { tick = 0 } = {}) {
  const out = await renderComposition(recipe, { tick });
  const blob = await toPng(out.canvas);
  const { width, height } = out.canvas;
  download(blob, fileName(recipe, width, height) + '.png');
  return { width, height, bytes: blob.size, stretched: out.stretched };
}

/**
 * Every frame of a page that moves, as numbered PNGs in a zip with its
 * `meta.json`, downloaded.
 *
 * @param {{page: object, place: object[]}} recipe   a snapshot
 * @param {object} [opts]
 * @param {(text: string) => void} [opts.onStatus]
 * @param {AbortSignal} [opts.signal]
 * @returns {Promise<{frames, fps, width, height, bytes, stretched: string[]}>}
 */
export async function exportFrames(recipe, { onStatus = () => {}, signal } = {}) {
  const scale = recipe.page.scale || 1;
  const c = await openComposition(recipe, { scale });
  try {
    if (c.missing.length) throw new Error(`${c.missing.join(', ')} could not be opened`);
    const canvas = surface(c.width * scale, c.height * scale);
    const ctx = canvas.getContext('2d');
    const entries = [];

    await runFrames({
      count: c.frames,
      async frame(i) {
        c.draw(ctx, i, scale);
        const blob = await toPng(canvas);
        const bytes = new Uint8Array(await blob.arrayBuffer());
        entries.push({ name: frameName(i, c.frames), blob, crc: crc32(bytes), size: bytes.length });
      },
      onProgress: (done, total) => onStatus(`drawing frame ${done} of ${total}…`),
      signal,
    });

    // The rate travels with the frames, so frames-to-video needs no flags.
    const { width, height } = canvas;
    entries.push({
      name: 'meta.json',
      bytes: new TextEncoder().encode(JSON.stringify(
        { app: 'compose', frames: c.frames, fps: c.fps, loop: true, width, height }, null, 1)),
    });
    onStatus('zipping…');
    const zip = zipStore(entries);
    download(zip, fileName(recipe, width, height) + '_frames.zip');
    return { frames: c.frames, fps: c.fps, width, height, bytes: zip.size, stretched: c.stretched };
  } finally {
    c.dispose();
  }
}
