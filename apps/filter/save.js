/**
 * save.js — what leaves filter.
 *
 * Two shapes, as grid's: a still filtered once saves a `still`, and a loop
 * saves a `sequence`. The recipe is the source by id and the chain,
 * `{ source, chain }`; the source is the parent, read back by
 * `consumedObjectIds()` — this file assembles no lineage. So the object
 * replays by opening its source and running the chain again (rebuild.js).
 *
 * A source that came off disk has no id, and what is made from it is a leaf:
 * `recipe: null`, its pixels only, as grid's are.
 *
 * ── Exact, and which frame ──────────────────────────────────────────────────
 *
 * The preview filters a draft of its source (core/rebuild.js, `draft`); a
 * save never does. It opens the source again, exact, and filters that. A
 * loop's render is the frame on screen — compose's rule for a page that
 * moves: pause where it looks like itself, and that is its picture. The loop
 * itself is the recipe, so a plain save filters one frame; *Save + download
 * the frames* filters them all, into a zip for scripts/frames-to-video.mjs.
 */

import { fromVault }     from './source.js';
import { FILTERS }       from '../../core/gpu/filters/index.js';
import { Vault }         from '../../core/vault.js';
import { thumbFromBlob } from '../../core/thumb.js';
import { runFrames, toPng, zipStore, frameName, download } from '../../core/export.js';

export const APP = { app: 'filter', version: '1.0.0' };

/** What was done, in words: the filters that are on, in order. */
export function chainName(chain) {
  const on = (chain || []).filter(e => e.on !== false).map(e => (FILTERS[e.id] ? FILTERS[e.id].label : e.id));
  return on.length ? on.join(', ') : 'unfiltered';
}

/** A borrowed picture, kept: the runner's next run() closes the one it handed out. */
function keep(picture) {
  const canvas = new OffscreenCanvas(picture.width, picture.height);
  canvas.getContext('2d').drawImage(picture, 0, 0);
  return canvas;
}

/**
 * Save what is on screen.
 *
 * @param {object} args
 * @param {object} args.params    the app's Params: the source, and the lineage
 * @param {object[]} args.chain   the chain as a recipe holds it
 * @param {object} args.source    the preview's source.js handle
 * @param {object} args.runner    core/gpu's, compiled for this chain
 * @param {number} args.tick      the frame on screen, a loop's render
 * @param {boolean} [args.keepFrames]  a loop's every frame too, as a zip
 * @param {(text:string)=>void} [args.onStatus]
 * @returns {Promise<{object: ?object, frames: number}>}
 */
export async function save({ params, chain, source, runner, tick = 0, keepFrames = false, onStatus = () => {} }) {
  const loop = source.frames > 1;
  // Exact frames for anything saved: the source again, not the preview's draft.
  const exact = source.id ? await fromVault(source.id, { draft: false }) : source;
  try {
    const fps = exact.fps || 0;
    const at = i => runner.run(exact.frame(i), chain, { time: fps ? i / fps : 0 });

    const shown = keep(at(loop ? tick : 0));
    const blob = await toPng(shown);
    const recipe = source.id ? { ...params.values, chain } : null;

    const object = await Vault.save({
      type: loop ? 'sequence' : 'still',
      title: `${source.title} · ${chainName(chain)}` + (loop ? ` ×${exact.frames}` : ''),
      tags: ['filter', ...(loop ? ['loop'] : []), ...(recipe ? [] : ['leaf'])],
      origin: APP,
      seed: null,                     // nothing in the catalogue draws at random yet
      recipe,
      parents: params.consumedObjectIds(),
      render: {
        blob, ext: 'png', w: shown.width, h: shown.height,
        ...(loop ? { frames: exact.frames, fps, loop: exact.loop } : {}),
      },
      thumb: await thumbFromBlob(blob),
    });

    if (loop && keepFrames) await downloadFrames({ exact, at, object, onStatus });
    return { object, frames: loop ? exact.frames : 1 };
  } finally {
    if (exact !== source) exact.dispose();
  }
}

/** Every frame of the loop, filtered, as numbered PNGs and the loop's rate. */
async function downloadFrames({ exact, at, object, onStatus }) {
  const entries = [];
  await runFrames({
    count: exact.frames,
    async frame(i) {
      const blob = await toPng(keep(at(i)));
      entries.push({ name: frameName(i, exact.frames), bytes: new Uint8Array(await blob.arrayBuffer()) });
    },
    onProgress: (done, total) => onStatus(`filtering ${done}/${total} frames…`),
  });
  entries.push({
    name: 'meta.json',
    bytes: new TextEncoder().encode(JSON.stringify({
      id: object ? object.id : null, app: APP.app, frames: exact.frames, fps: exact.fps, loop: exact.loop,
    }, null, 1)),
  });
  download(zipStore(entries), (object ? object.id : 'filter_sequence') + '_frames.zip');
}
