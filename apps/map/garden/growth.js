/**
 * growth.js — a flower growing: its marks coming in the order they were
 * drawn, each at its time (the author, 2026-11-06: "si on a une recette, on
 * a automatiquement une séquence, donc oui on a une fleur qui pousse").
 *
 * A mark's `t` is when the hand laid it (core/stage/recorder.js); a flower
 * grows in the time the garden gives it, the hand's rhythm kept — its pauses
 * included, until *growth pace* evens them out (modifiers.js). Pure, no DOM.
 */

/**
 * When each mark comes, in seconds from the flower's planting: its `t`, the
 * whole drawn in `seconds`. A `t` that goes back is held where it was, and a
 * flower whose marks share one time comes evenly.
 *
 * @param {object[]} marks
 * @param {number} seconds
 * @returns {number[]}
 */
export function growthTimes(marks, seconds) {
  const n = marks.length;
  if (!n) return [];
  let last = -Infinity;
  const ts = marks.map(m => (last = Math.max(last, Number(m.t) || 0)));
  const t0 = ts[0], span = ts[n - 1] - t0, total = Math.max(0, seconds);
  return ts.map((t, i) => total * (span > 0 ? (t - t0) / span : n > 1 ? i / (n - 1) : 0));
}

/** How many marks have come `s` seconds after planting: those whose time is past. */
export function grownAt(times, s) {
  let lo = 0, hi = times.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid] <= s) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
