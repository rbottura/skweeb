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

/** Whether a handle moves at all: more than one tick, at a rate. A picture does not. */
export const moves = handle => !!handle && handle.length > 1 && handle.fps > 0;

/**
 * How many of the page's frames a loop lasts: its own length, as time, at the
 * page's rate — rounded, when the two rates do not divide, to the nearest
 * frame. One for something that does not move.
 *
 * @param {object} handle   { length, fps }
 * @param {number} fps      the page's rate
 */
export function framesOnPage(handle, fps) {
  if (!moves(handle)) return 1;
  return Math.max(1, Math.round((handle.length * fps) / handle.fps));
}

/**
 * Whether a placement shows at a tick of the page: from its `at`, for its
 * `length` of the page's frames — or, with no length, until the page ends
 * (docs/object-model.md, *Placement*). A flipbook is stills one after
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
 * The object's own tick at a tick of the page: the one showing at that
 * moment. A loop wraps; a sequence that does not loop holds its last tick.
 *
 * @param {number} pageTick
 * @param {object} handle   { length, fps, loop }
 * @param {number} fps      the page's rate
 */
export function tickAt(pageTick, handle, fps) {
  if (!moves(handle)) return 0;
  const t = Math.floor((pageTick * handle.fps) / fps);
  if (handle.loop === false) return Math.max(0, Math.min(t, handle.length - 1));
  return ((t % handle.length) + handle.length) % handle.length;
}
