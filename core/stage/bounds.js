/**
 * bounds.js — how big a clip actually is, and what it is missing.
 *
 * Both questions are asked of the registry rather than of the player: they
 * depend on the sprites a clip names and on nothing the player is currently
 * doing, so they are measurements of a clip and not state. Pulled out of
 * player.js when the stage moved into core/, which also took that file back
 * under the 400-line cap.
 */

import * as Registry from '../registry.js';
import { stampPoints } from '../stamp.js';

/**
 * Widest margin `bounds` may add beyond the sequence rect on any one side, as
 * a fraction of the sequence's shorter side. A safety net rather than a
 * working limit: it clears any mark drawn up to canvas size, and stops one
 * stamped at an absurd scale from sizing the buffer into the hundreds of
 * megabytes. Past it, that mark clips as it did before.
 */
const MAX_MARGIN_RATIO = 0.5;

/**
 * The rect every mark of a clip lands in, in sequence coordinates.
 *
 * Derived once per `load()`. It no longer depends on where the clip is placed
 * — that moved to the stage — so only `overrides` can invalidate it: changing
 * `scaleMul` or re-pointing the family afterwards wants a reload.
 *
 * @param {Object} clip
 * @returns {{x: number, y: number, w: number, h: number}}
 */
export function contentBounds(clip) {
  const seq = clip.sequence;
  const ov  = clip.overrides;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  for (const ev of seq.events) {
    const familyId = ov.familyId ?? ev.familyId;
    let   spriteIx = ov.spriteIndex ?? ev.spriteIndex;
    if (ov.familyId) {
      const count = Registry.spriteCount(familyId);
      if (count > 0) spriteIx = ((spriteIx % count) + count) % count;
    }

    const img = Registry.getSprite(familyId, spriteIx);
    if (!img) continue;   // family not loaded — it will not draw either

    // Half the sprite's diagonal bounds it whichever way the mark is turned,
    // so the mark's own rotation never has to be worked out.
    const reach = 0.5 * Math.hypot(img.width, img.height)
                * ev.scale * ov.scaleMul;

    const pattern = ov.pattern ?? ev.pattern;
    for (const [px, py] of stampPoints(ev.x, ev.y, ev.rotation, pattern, seq.w, seq.h)) {
      if (px - reach < minX) minX = px - reach;
      if (py - reach < minY) minY = py - reach;
      if (px + reach > maxX) maxX = px + reach;
      if (py + reach > maxY) maxY = py + reach;
    }
  }

  // No events, or not one of them resolvable: fall back to the sequence rect.
  if (!Number.isFinite(minX)) return { x: 0, y: 0, w: seq.w, h: seq.h };

  const margin = MAX_MARGIN_RATIO * Math.min(seq.w, seq.h);
  const x0 = Math.floor(Math.max(minX, -margin));
  const y0 = Math.floor(Math.max(minY, -margin));
  const x1 = Math.ceil( Math.min(maxX, seq.w + margin));
  const y1 = Math.ceil( Math.min(maxY, seq.h + margin));

  return { x: x0, y: y0, w: Math.max(1, x1 - x0), h: Math.max(1, y1 - y0) };
}

/** Which of a sequence's families the registry cannot currently resolve. */
export function missingFamilies(seq) {
  const ids = [...new Set(seq.events.map(e => e.familyId))];
  return ids.filter(id => !Registry.getSprite(id, 0));
}
