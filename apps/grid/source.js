/**
 * source.js — whatever is being dithered, behind one shape.
 *
 * Grid eats three things that arrive three different ways: a file off disk, a
 * `still` in the vault, and a `sequence` — which is not a file at all. A
 * sequence object's render is one PNG and its loop exists only as the marks in
 * its recipe, so it has to be rebuilt (`core/rebuild.js`) before there is
 * anything to dither. Until now grid loaded a sequence's render.png and
 * dithered that one frame without noticing what it was.
 *
 * All three come out of here as the same handle: a size, a frame count, and
 * `frame(i)` returning something `drawImage` accepts. That is the whole reason
 * this file exists. Without it the branch on source kind appears three times —
 * in the preview, in the export and in the save — and the three disagree about
 * something small.
 *
 * ── The frames are borrowed ─────────────────────────────────────────────────
 *
 * `frame(i)` returns a canvas this handle owns and redraws. Use it before
 * asking for the next one. That is rebuild.js's rule and it is kept rather
 * than softened: a 1060-frame loop at 475x926 is 1.8 GB of RGBA if anything
 * here starts keeping copies.
 */

import { openSequence } from '../../core/rebuild.js';
import { Vault }        from '../../core/vault.js';
import { alphaBounds, isEmpty } from '../../core/trim.js';
import { surface }      from './grid.js';

/**
 * Where the ink is, for a decoded image.
 *
 * One getImageData over the whole thing, once, when the source is chosen —
 * not per frame and not per render. A source with no transparency at all
 * trims to itself, which is the correct answer for a photograph.
 */
function inkOf(bitmap) {
  const canvas = surface(bitmap.width, bitmap.height);
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0);
  const { data } = ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  const rect = alphaBounds(data, bitmap.width, bitmap.height);
  return isEmpty(rect) ? { x: 0, y: 0, w: bitmap.width, h: bitmap.height } : rect;
}

/**
 * A file the user dropped or opened. No id, so anything saved from it is a
 * leaf with a null recipe — rule 7, the app works with no vault at all.
 */
export async function fromFile(file) {
  return stillHandle(await createImageBitmap(file), null);
}

/**
 * A vault object, by id. Its type decides which handle comes back.
 *
 * `opts` is passed straight through to the rebuild, which is how the chain
 * depth survives: grid replaying its own sequence calls this for its parent,
 * and the parent may in principle be another grid sequence.
 */
export async function fromVault(id, opts = {}) {
  const { object, url } = await Vault.load(id);

  if (object.type === 'sequence') return sequenceHandle(object, id, opts);

  const blob = await (await fetch(url)).blob();
  return stillHandle(await createImageBitmap(blob), id);
}

// ── The two handles ──────────────────────────────────────────────────────────

function stillHandle(bitmap, id) {
  return {
    kind: 'still',
    id,
    width: bitmap.width,
    height: bitmap.height,

    /** The painted area, scanned once. `format: content` trims to this. */
    content: inkOf(bitmap),

    frames: 1,
    fps: 0,
    loop: false,
    missing: [],
    frame() { return bitmap; },
    dispose() { if (bitmap.close) bitmap.close(); },
  };
}

async function sequenceHandle(object, id, opts = {}) {
  // Whatever kind of sequence it is. Marks are replayed by core; anything else
  // is handed back to the app that made it — including grid itself, which is
  // how a dither of a dither would work.
  const rebuilt = await openSequence(object, opts);
  if (!rebuilt.length) {
    rebuilt.dispose();
    throw new Error('that sequence rebuilt to no frames');
  }

  // One canvas, reused for every frame. It is the sequence's own coordinate
  // space — the canvas the marks were drawn on — and not the rebuilt buffer's,
  // which is cropped to the marks. Handing the buffer straight to the dither
  // would crop and rescale the loop without saying so, and the cell count
  // would move from frame to frame as the marks spread.
  const canvas = surface(rebuilt.width, rebuilt.height);
  const ctx = canvas.getContext('2d');

  return {
    kind: 'sequence',
    id,
    width: rebuilt.width,
    height: rebuilt.height,

    /**
     * The painted area over the WHOLE loop, never one frame's.
     *
     * A per-frame trim would move the canvas from frame to frame, which is not
     * a thing a sequence can be, and in grid it would slide the cell grid
     * under the drawing so the dither crawled. `rebuilt.bounds` is already
     * that union — `contentBounds()` computes it across every event — so it
     * costs nothing here.
     *
     * It is the arithmetic bound rather than a scan, so it can be generous by
     * up to half a sprite's diagonal. Tightening it would mean scanning all
     * 1060 frames, which is a whole export to answer a framing question; the
     * bleed parameter is the cheaper way to say "a little more room".
     */
    content: rebuilt.bounds || { x: 0, y: 0, w: rebuilt.width, h: rebuilt.height },

    frames: rebuilt.length,
    fps: rebuilt.fps,
    loop: rebuilt.loop,

    /** Families the registry could not resolve. Their marks are simply absent. */
    missing: rebuilt.missing,

    frame(i) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      rebuilt.drawInto(ctx, i, canvas.width, canvas.height);
      return canvas;
    },

    dispose() { rebuilt.dispose(); },
  };
}
