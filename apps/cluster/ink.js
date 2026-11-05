/**
 * ink.js — a tab bar's underline: one, sliding from the tab chosen to the
 * next (S9e; motion.css) — the properties' bar and the side's.
 *
 * No DOM at import.
 */

/**
 * @param {HTMLElement} bar   the tab bar: its tab chosen is `.cl-tab[aria-selected="true"]`
 * @returns {{ node: HTMLElement, place: () => void }}  the underline, to go in the bar after its tabs; and its
 *   placing under the tab chosen — at once the first time, slid after
 */
export function inkFor(bar) {
  const node = document.createElement('span');
  node.className = 'cl-tabs-ink';
  function place() {
    const b = bar.querySelector('.cl-tab[aria-selected="true"]');
    node.hidden = !b;
    if (!b) return;
    const at = `translateX(${b.offsetLeft + 8}px)`, width = Math.max(0, b.offsetWidth - 16) + 'px';
    if (node.style.transform === at && node.style.width === width) return;
    node.classList.toggle('cl-tabs-ink--placed', !!node.style.width);     // the first time, it is put there
    Object.assign(node.style, { transform: at, width });
  }
  return { node, place };
}

/** A panel shown by its tab comes in: a short fade — none, with less motion asked of the system. */
export function comeIn(node) {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (node && !reduced && typeof node.animate === 'function') node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 140, easing: 'ease' });
}
