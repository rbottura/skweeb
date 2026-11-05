/**
 * flip.js — what changes place on the page, seen moving.
 *
 * The author, 2026-11-05: "tout élément qui transitionne même très légèrement
 * doit avoir une animation aussi fine et rapide soit-elle". A grid laid again
 * — the vault's, its order changed — would put every card in its new place at
 * once; this is First, Last, Invert, Play: where each keyed element is, read;
 * the change made, at once; where each is now, read; and each one that moved
 * slid from where it was to where it is, by a transform, so nothing is laid
 * out again while it plays. One that came fades in; one that went is gone.
 *
 * Keys are `data-flip`, on the elements `selector` finds; a key seen twice is
 * its first's. What was not in sight before nor after is not animated. With
 * the viewer's reduced motion, the change is made and nothing plays.
 * No DOM at import.
 */

const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const meets = (a, b) => a.right > b.left && a.left < b.right && a.bottom > b.top && a.top < b.bottom;
const laid = r => r.width > 0 || r.height > 0;      // a hidden one has no place to move from, nor to

/**
 * @param {Element} root            where the keyed elements are, and what clips them
 * @param {() => void} change       what moves them — made at once
 * @param {object} [o]
 * @param {string} [o.selector]     the keyed elements: `[data-flip]` in `root`
 * @param {number} [o.ms]           how long a move takes
 * @returns {Animation[]}           what plays
 */
export function flip(root, change, { selector = '[data-flip]', ms = 220 } = {}) {
  if (!root || !root.isConnected || reduced() || typeof root.animate !== 'function') { change(); return []; }
  const was = new Map();
  for (const n of root.querySelectorAll(selector)) {
    const r = n.getBoundingClientRect();
    if (laid(r) && !was.has(n.dataset.flip)) was.set(n.dataset.flip, r);
  }
  change();
  const view = root.getBoundingClientRect(), easing = 'cubic-bezier(0.2, 0.7, 0.2, 1)', plays = [];
  for (const n of root.querySelectorAll(selector)) {
    const before = was.get(n.dataset.flip), now = n.getBoundingClientRect();
    if (!laid(now)) continue;
    if (!before) {
      if (meets(now, view)) plays.push(n.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing }));
      continue;
    }
    was.delete(n.dataset.flip);
    const dx = before.left - now.left, dy = before.top - now.top;
    if ((Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) || (!meets(now, view) && !meets(before, view))) continue;
    plays.push(n.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: ms, easing }));
  }
  return plays;
}
