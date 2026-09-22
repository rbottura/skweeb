/**
 * save.js — what leaves grid.
 *
 * Two shapes, because there are two kinds of source. A still dithers once and
 * saves a `still`. A sequence dithers every frame and saves a `sequence`:
 * M2's link, `grid -> vault: dithered sequence`.
 *
 * ── Per-frame, and where the cost lands ─────────────────────────────────────
 *
 * Re-dithering every frame was chosen over dithering once and replaying,
 * because the second is a different artwork rather than a cheaper version of
 * the same one — the dither has to follow the motion. It is slow: a
 * 1060-frame loop at 295x148 cells is about 46 million drawImage calls. The
 * slowness lands here and nowhere else. The live preview dithers only the
 * frame under the playhead, so scrubbing stays one render.
 *
 * ── Which frame becomes the render ──────────────────────────────────────────
 *
 * A sequence object's render is one PNG. The gamepad learned the hard way that
 * it must not be the last frame, and `representativeTick()` answers it there
 * by asking the window rule which tick shows the most marks — arithmetic, no
 * pixels read.
 *
 * Grid cannot ask that question. By the time it has frames the marks are gone
 * and what it has is cells, so it keeps the frame with the most cells drawn:
 * the same question asked of the same picture one stage later. It has to be
 * measured rather than inherited from the source, because the dither can turn
 * the fullest tick into the emptiest frame — spread the same ink thin enough
 * and every cell falls under the alpha floor and draws nothing at all.
 *
 * ── Lineage ─────────────────────────────────────────────────────────────────
 *
 * Neither path assembles `parents`. The `source` param records itself and
 * `consumedObjectIds()` reads it back out. The saved recipe is grid's own,
 * with the source named inside it by id — so re-rendering this object later
 * re-runs the whole chain: rebuild the source sequence, load its sprites,
 * dither it again. That is exactly what `parents` is for, and this is the
 * first object in the vault that will need it.
 */

import { renderGrid }    from './grid.js';
import { resolveFrame }  from '../../core/frame.js';
import { Vault }      from '../../core/vault.js';
import { thumbFromBlob } from '../../core/thumb.js';
import { runFrames, toPng, zipStore, frameName, download } from '../../core/export.js';

const APP = { app: 'grid', version: '1.0.0' };

/**
 * One dithered image.
 *
 * @param {object} args
 * @param {object} args.params    the app's Params
 * @param {object} args.render    the renderGrid() result on screen
 * @param {?string} args.sourceId null when the source came off disk
 */
export async function saveStill({ params, render, sourceId }) {
  const blob = await toPng(render.canvas);
  const thumb = await thumbFromBlob(blob);

  return Vault.save({
    type: 'still',
    title: `${params.get('ramp')} ${render.cols}x${render.rows}`,
    tags: sourceId ? ['grid', params.get('ramp')] : ['grid', params.get('ramp'), 'leaf'],
    origin: APP,
    seed: null,                       // a luminance dither has no random in it
    recipe: sourceId ? params.values : null,
    parents: params.consumedObjectIds(),
    render: {
      blob, ext: 'png',
      w: render.canvas.width, h: render.canvas.height, density: render.scale,
    },
    thumb,
  });
}

/**
 * Every frame of a sequence, dithered.
 *
 * @param {object} args
 * @param {object} args.params
 * @param {object} args.source            a sequence handle from source.js
 * @param {CanvasImageSource[]} args.tiles
 * @param {boolean} [args.keepFrames]     also hand back a zip of the frames
 * @param {(text:string)=>void} [args.onStatus]
 * @param {AbortSignal} [args.signal]
 * @returns {Promise<{object:?object, frames:number, still:number, drawn:number}>}
 */
export async function saveSequence({ params, source, tiles, keepFrames = false,
                                     onStatus = () => {}, signal }) {
  const count = source.frames;
  if (!count) throw new Error('that sequence has no frames');

  // A snapshot, not the live params: `values` is already a deep copy, so an
  // export cannot be changed halfway through by a control being nudged.
  const recipe = params.values;
  const blobs = keepFrames ? [] : null;

  // Resolved once, outside the loop. The frame is a property of the loop, not
  // of a frame in it: `source.content` is already the union over every tick,
  // so re-resolving per frame would give the same answer at a thousand times
  // the cost — or, if it ever did not, a canvas that changed size mid-export.
  const frame = resolveFrame(recipe, source.content, source);

  let best = null, bestDrawn = -1, bestIndex = 0;

  await runFrames({
    count,
    async frame(i) {
      const out = renderGrid({ recipe, source: source.frame(i), tiles, frame });
      if (blobs) blobs.push(await toPng(out.canvas));

      // renderGrid allocates a fresh surface every call, so keeping the best
      // one costs nothing and pins nothing the next frame needs.
      if (out.drawn > bestDrawn) { bestDrawn = out.drawn; bestIndex = i; best = out; }
    },
    onProgress: (done, total) => onStatus(`dithering ${done}/${total} frames…`),
    signal,
  });

  onStatus('saving…');

  const blob = blobs ? blobs[bestIndex] : await toPng(best.canvas);
  const thumb = await thumbFromBlob(blob);

  const object = await Vault.save({
    type: 'sequence',
    title: `${recipe.ramp} ${best.cols}x${best.rows} x${count}`,
    tags: ['grid', 'loop', recipe.ramp],
    origin: APP,
    seed: null,
    recipe,
    parents: params.consumedObjectIds(),
    render: {
      blob, ext: 'png',
      w: best.canvas.width, h: best.canvas.height, density: best.scale,
      frames: count, fps: source.fps, loop: source.loop,
    },
    thumb,
  });

  if (blobs) await downloadFrames(blobs, object, source);

  return { object, frames: count, still: bestIndex, drawn: bestDrawn };
}

/**
 * The loop as a file, since a sequence object still has no playable render.
 *
 * This is the expensive half and the only reason `keepFrames` is a separate
 * button rather than always on: the blobs are held until the zip is built, so
 * a 1060-frame loop at full size is gigabytes in memory. A plain save keeps
 * one frame and encodes one PNG.
 */
async function downloadFrames(blobs, object, source) {
  const entries = [];
  for (let i = 0; i < blobs.length; i++) {
    entries.push({
      name: frameName(i, blobs.length),
      bytes: new Uint8Array(await blobs[i].arrayBuffer()),
    });
  }

  // The rate travels with the frames, so scripts/frames-to-video.mjs needs no
  // flags to get the speed right. A zip of PNGs is otherwise silent about how
  // fast it was meant to run, and guessing 30 for a 60fps loop halves it.
  entries.push({
    name: 'meta.json',
    bytes: new TextEncoder().encode(JSON.stringify({
      id: object ? object.id : null,
      app: APP.app,
      frames: blobs.length,
      fps: source.fps,
      loop: source.loop,
    }, null, 1)),
  });

  download(zipStore(entries), (object ? object.id : 'grid_sequence') + '_frames.zip');
}
