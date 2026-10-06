/**
 * time.js — what a placed object shows at a tick of the page.
 *
 * A page has a rate of its own, its `fps`, and a loop on it keeps its own
 * speed in real time: what the two share is seconds, not ticks. A 60 fps
 * recording on a 30 fps page shows every other tick; a 30 fps ckt loop on a
 * 60 fps page holds each tick for two. The page is what plays and what an
 * export writes, so its rate decides how many frames there are; the object
 * decides what is in them.
 *
 * Pure arithmetic on a handle's `length`, `fps` and `loop`
 * (core/rebuild.js), so it is written down in tests/compose-time.mjs rather
 * than judged by watching.
 */

// How a loop keeps its own speed on a page of its own rate — `moves`,
// `framesOnPage`, `tickAt` — is core's since the map editor needed it too
// (core/playback.js); compose's own questions of time follow.
import { moves, framesOnPage, tickAt } from '../../core/playback.js';
export { moves, framesOnPage, tickAt };

/**
 * Whether a placement shows at a tick of the page: from its `at`, for its
 * `length` of the page's frames — or, with no length, until the page ends
 * (docs/smart-objects.md, *Placement*). A flipbook is stills one after
 * another, each shown for a frame or a few.
 *
 * @param {number} pageTick
 * @param {object} block   a placement: { at, length }
 */
export function showsAt(pageTick, block) {
  const at = (block && block.at) || 0;
  const length = block ? block.length : null;
  return pageTick >= at && (length == null || pageTick < at + length);
}

/**
 * How far into the page a placement reaches: where its length ends it, or,
 * with none, where its own loop does — a still with none reaches one frame
 * past its start. The page lasts as long as the furthest.
 */
export function endOf(block, handle, fps) {
  const at = (block && block.at) || 0;
  return at + (block && block.length != null ? block.length : framesOnPage(handle, fps));
}

/**
 * A ripple: the placements that started where one ended move with its end —
 * and the ones that started where those ended, and on — so a flipbook's
 * frame held longer, put in, or taken out pushes or pulls the frames after
 * it instead of stacking over them. Only a chain that touches end to start
 * moves: what merely comes later, on its own, stays where it was. A
 * placement with no length ends nowhere, so a chain stops at it.
 *
 * @param {object[]} blocks   the page's blocks
 * @param {number} from       the page frame where the chain starts: an end, as it was
 * @param {number} by         how far it moves, in frames — negative is earlier
 * @param {number} [skip]     the index of the block whose end it is, left alone
 * @returns {object[]}        the blocks, those moved replaced
 */
export function ripple(blocks, from, by, skip = -1) {
  if (!by) return blocks;
  const out = blocks.slice();
  const moved = new Set([skip]);
  let ends = [from];
  while (ends.length) {
    const next = [];
    out.forEach((b, j) => {
      const at = b.at || 0;
      if (moved.has(j) || !ends.includes(at)) return;
      moved.add(j);
      out[j] = { ...b, at: Math.max(0, at + by) };
      if (b.length != null) next.push(at + b.length);
    });
    ends = next;
  }
  return out;
}
