/**
 * save.js — what leaves ckt.
 *
 * Three shapes, one per thing the app makes:
 *
 *   dataset   stage one's output: the dots, as JSON, `[entry][point][x, y]`.
 *             Its render *is* the data, so the vault holds the file and the
 *             recipe beside it can cut it again.
 *   still     one frame of stage two.
 *   sequence  the whole loop — one turn, loopFrames() frames at `fps`.
 *
 * ── The vault is the send ───────────────────────────────────────────────────
 *
 * v2 passed stage one's dots to stage two inside the page, into a slot called
 * "custom" that was gone on reload. Here stage one saves a `dataset` and stage
 * two names it by id: the handover is an object with a recipe and a lineage,
 * and a made dataset sits beside the nine shipped ones as an equal.
 *
 * ── Lineage and seed ────────────────────────────────────────────────────────
 *
 * Nothing here assembles `parents`. The `object` params — the image stage one
 * cut, the dataset and the sprite stage two drew with — record themselves, and
 * `consumedObjectIds()` reads them back. `seed` is null everywhere and that is
 * honest: nothing in either stage draws a random number.
 */

import { renderFrame }   from './render.js';
import { loopFrames }    from './motion.js';
import { Vault }         from '../../core/vault.js';
import { regroup }       from '../../core/vault-groups.js';
import { thumbFromCanvas, thumbFromBlob } from '../../core/thumb.js';
import { runFrames, toPng, zipStore, frameName, download } from '../../core/export.js';

export const APP = { app: 'ckt', version: '3.0.0' };

/**
 * Stage one's dots.
 *
 * @param {object} args
 * @param {object} args.params     stage one's Params
 * @param {number[][][]} args.data from makeDataset()
 * @param {Array<?string>} args.entries
 * @param {CanvasImageSource} args.preview   what the thumbnail shows
 * @param {boolean} args.fromFile  the image came off disk: no recipe can recut it
 * @param {string} [args.folder]    the `folder:` tag of this visit's session
 */
export async function saveDataset({ params, data, entries, preview, fromFile, folder }) {
  const recipe = params.values;
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  const points = data.reduce((n, g) => n + g.length, 0);

  const what = recipe.input === 'image' ? 'image'
    : recipe.input === 'glyphs' ? `${entries[0]}–${entries[entries.length - 1]}`
    : JSON.stringify(recipe.text.slice(0, 24));

  const object = await Vault.save({
    type: 'dataset',
    title: `${what} · ${data.length} × ${points} dots`,
    tags: ['ckt', 'dataset', recipe.input].concat(fromFile ? ['leaf'] : [], folder ? [folder] : []),
    origin: APP,
    seed: null,
    recipe: fromFile ? null : recipe,
    parents: params.consumedObjectIds(),
    render: { blob, ext: 'json', w: recipe.width, h: recipe.height },
    thumb: await thumbFromCanvas(preview),
  });
  // The same dots cut again: the vault hands back the object it had, its tags of then — filed now with this
  // visit's session, its one folder (core/vault-groups.js), so the session holds what was cut in it (C4).
  if (object && folder && !(object.tags || []).includes(folder)) {
    try {
      object.tags = (await Vault.retag(object.id, regroup(object, folder.slice('folder:'.length)))).tags;
    } catch (err) {
      console.warn('[ckt] the dots cut again stayed in the session they were cut in:', err.message);
    }
  }
  return object;
}

/** What a stage-two piece is called: its dots, its glyph, its attractor. */
function titleOf(recipe, madeTitle) {
  const from = recipe.made ? (madeTitle || 'made') : recipe.dataset;
  return `${from} ${recipe.glyph} · ${recipe.path}`;
}

/**
 * One frame of stage two, as on screen.
 *
 * A still is one frame of a loop, so its recipe says which: `tick`. Without
 * it the recipe describes the loop, and replaying the still would show frame
 * 0 — a different picture from the one that was kept. With it, `ink` also
 * crops to this frame alone rather than to the whole loop.
 *
 * @param {object} args
 * @param {object} args.params     stage two's Params
 * @param {Float64Array} args.anchors
 * @param {?CanvasImageSource} args.mark
 * @param {number} args.tick       the frame on screen
 * @param {string} [args.madeTitle]
 * @param {boolean} [args.leaf]    drawn from a dataset no recipe can name
 */
export async function saveStill({ params, anchors, mark, tick, madeTitle, leaf = false }) {
  const recipe = { ...params.values, tick: Math.round(tick) };
  const render = renderFrame({ recipe, anchors, mark, tick: recipe.tick });
  const blob = await toPng(render.canvas);

  return Vault.save({
    type: 'still',
    title: titleOf(recipe, madeTitle),
    tags: ['ckt', recipe.path, recipe.mark].concat(leaf ? ['leaf'] : []),
    origin: APP,
    seed: null,
    recipe: leaf ? null : recipe,
    parents: params.consumedObjectIds(),
    render: {
      blob, ext: 'png',
      w: render.canvas.width, h: render.canvas.height, density: render.scale,
    },
    thumb: await thumbFromBlob(blob),
  });
}

/**
 * The loop.
 *
 * The render — a sequence object's one PNG — is the frame on screen when you
 * saved. Every frame of a ckt loop has every dot in it, so there is no empty
 * frame to avoid, and the one you were looking at is the one you chose.
 *
 * @param {object} args
 * @param {object} args.params
 * @param {Float64Array} args.anchors
 * @param {?CanvasImageSource} args.mark
 * @param {object} args.frame        from render.js framing(), fixed for the loop
 * @param {number} args.tick         the frame on screen
 * @param {boolean} [args.keepFrames] also download every frame as a zip
 * @param {string} [args.madeTitle]
 * @param {boolean} [args.leaf]      drawn from a dataset no recipe can name
 * @param {(text:string)=>void} [args.onStatus]
 */
export async function saveLoop({ params, anchors, mark, frame, tick, keepFrames = false,
                                 madeTitle, leaf = false, onStatus = () => {} }) {
  const recipe = params.values;
  // One loop is one turn at `speed` — the recording closes on itself.
  const count = loopFrames(recipe);
  const blobs = keepFrames ? [] : null;

  if (blobs) {
    await runFrames({
      count,
      async frame(i) {
        blobs.push(await toPng(renderFrame({ recipe, anchors, mark, tick: i, frame }).canvas));
      },
      onProgress: (done, total) => onStatus(`rendering ${done}/${total} frames…`),
    });
  }

  onStatus('saving…');
  const shown = ((Math.round(tick) % count) + count) % count;
  const still = blobs ? null : renderFrame({ recipe, anchors, mark, tick: shown, frame });
  const blob = blobs ? blobs[shown] : await toPng(still.canvas);

  const object = await Vault.save({
    type: 'sequence',
    title: `${titleOf(recipe, madeTitle)} x${count}`,
    tags: ['ckt', 'loop', recipe.path, recipe.mark].concat(leaf ? ['leaf'] : []),
    origin: APP,
    seed: null,
    recipe: leaf ? null : recipe,
    parents: params.consumedObjectIds(),
    render: {
      blob, ext: 'png',
      w: frame.frame.width, h: frame.frame.height, density: frame.sx,
      frames: count, fps: recipe.fps, loop: true,
    },
    thumb: await thumbFromBlob(blob),
  });

  if (blobs) await downloadFrames(blobs, object, recipe);
  return { object, frames: count };
}

/**
 * Every frame as a numbered PNG zip, with the rate inside it, so
 * scripts/frames-to-video.mjs turns it into a file with no flags.
 */
async function downloadFrames(blobs, object, recipe) {
  const entries = [];
  for (let i = 0; i < blobs.length; i++) {
    entries.push({ name: frameName(i, blobs.length), bytes: new Uint8Array(await blobs[i].arrayBuffer()) });
  }
  entries.push({
    name: 'meta.json',
    bytes: new TextEncoder().encode(JSON.stringify({
      id: object ? object.id : null, app: APP.app,
      frames: blobs.length, fps: recipe.fps, loop: true,
    }, null, 1)),
  });
  download(zipStore(entries), (object ? object.id : 'ckt_loop') + '_frames.zip');
}
