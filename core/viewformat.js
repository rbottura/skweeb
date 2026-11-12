/**
 * viewformat.js — the format in the viewer (S14b, 2026-11-12; the author's
 * pick of two, "Tout dans le viewer"). The Format group every app spreads in
 * (core/frame.js) leaves the properties for the viewer's head, where the
 * bench has its list: the format a list, and beside it the picture's size, a
 * chip that opens the rest — width and height, their link and swap, bleed,
 * the zoom where an app keeps it, the scale.
 *
 * Still drawn from the schema (rule 1): ParamPanel lays the group's rows here
 * as it would in a drawer, and their values, steps and keys are its own; this
 * is only where they sit. One block a viewer, taken by the first panel that
 * asks — a panel in an app with no viewer keeps its drawer, as every panel
 * did before. No DOM at import.
 */

import * as G from './shell/guides.js';
import { held } from './scope.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

/**
 * The format's place in the viewer of the app this panel is docked in, made now — or null: no viewer, or one
 * whose format another panel shows.
 *
 * @param {HTMLElement} mount   the panel's column, inside its app's `.app`
 * @param {object} params       the panel's params, whose size the chip says
 * @returns {?{ list: HTMLElement, rows: HTMLElement, paint: () => void, remove: () => void }}
 */
export function formatIn(mount, params) {
  const app = mount && typeof mount.closest === 'function' ? mount.closest('.app') : null;
  const viewer = app && app.querySelector('.viewer');
  if (!viewer) return null;
  let head = viewer.querySelector(':scope > .viewer-head');
  if (!head) { head = el('div', 'viewer-head'); viewer.prepend(head); }
  if (head.querySelector(':scope > .vf')) return null;
  return build(head, params);
}

function build(head, params) {
  const root = el('div', 'vf');
  const list = el('span', 'vf-list');                 // the format's row: its list alone shows
  const chip = el('button', 'vf-size');
  chip.type = 'button';
  chip.title = 'The size — width and height, their link — bleed and scale';
  chip.dataset.pal = 'The format: its size, bleed and scale';
  chip.setAttribute('aria-haspopup', 'dialog');
  chip.setAttribute('aria-expanded', 'false');
  const pop = el('div', 'vf-pop');
  pop.hidden = true;
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'The format');
  const rows = el('div', 'vf-rows');
  pop.append(el('div', 'vf-head', 'Format'), rows);
  root.append(list, chip, pop);
  // Before the viewer's tools, wherever the head has them; after the app's own buttons.
  const tools = head.querySelector(':scope > skw-viewtools');
  head.insertBefore(root, tools);

  const open = on => {
    pop.hidden = !on;
    chip.setAttribute('aria-expanded', String(on));
    root.classList.toggle('vf--open', on);
  };
  chip.addEventListener('click', () => open(pop.hidden));
  // Closed by a press anywhere else, or Escape — a value's own history over it (core/param-history.js) excepted.
  const away = e => {
    if (pop.hidden || !(e.target instanceof Element) || root.contains(e.target) || e.target.closest('.pp-hist')) return;
    open(false);
  };
  const escape = e => {
    if (e.key !== 'Escape' || pop.hidden) return;
    open(false);
    chip.focus();
  };
  document.addEventListener('pointerdown', away, true);
  document.addEventListener('keydown', escape, true);

  /** The size the chip says: the picture's, as the rulers have it from the bar — its scale beside it. */
  const paint = () => {
    const doc = G.state().doc, v = params.values;
    const w = doc ? doc.w : v.width, h = doc ? doc.h : v.height;
    chip.textContent = `${w} × ${h}` + (v.scale && v.scale !== 1 ? ` · ${v.scale}×` : '');
  };
  const unhear = G.on('change', paint);

  let release = () => {};
  const remove = () => {
    release();
    unhear();
    document.removeEventListener('pointerdown', away, true);
    document.removeEventListener('keydown', escape, true);
    root.remove();
  };
  release = held(remove);                    // its app unmounted (core/scope.js): gone with it
  paint();
  return { list, rows, paint, remove, open };
}
