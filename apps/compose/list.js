/**
 * list.js — what is on the page, as rows: the top of the page first, as a
 * stack of layers reads, and one of them chosen — the one the `placed`
 * panel edits. Shaped like ckt's session list (apps/ckt/sessions.js); the
 * two are the candidates, should a third app want one, for a list in core.
 */

import { flattens } from './flatten.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

function button(label, onClick, { primary = false, title = '' } = {}) {
  const b = el('button', 'nb-btn' + (primary ? ' nb-btn--primary' : ''), label);
  b.type = 'button';
  if (title) b.title = title;
  b.addEventListener('click', onClick);
  return b;
}

/** A row's second line: what it is, how big it stands on the page, and when it shows. */
function about(p) {
  if (p.error) return 'could not open it';
  if (!p.handle) return 'opening…';
  const s = p.block.transform.scale;
  const loop = p.handle.length > 1 ? ` · ${p.handle.length} at ${p.handle.fps} fps` : '';
  const { at, length } = p.block;
  const when = length != null ? ` · frame${length > 1 ? 's' : ''} ${at + 1}${length > 1 ? '–' + (at + length) : ''}`
    : at ? ` · from frame ${at + 1}` : '';
  return `${p.type} · ${Math.round(p.size.width * s)} × ${Math.round(p.size.height * s)}${loop}${when}`;
}

export class PlacedList {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.mount
   * @param {(entry: object) => void} opts.onChoose
   * @param {() => void} opts.onAdd
   * @param {() => void} opts.onAddFrame   the next frame of a flipbook
   * @param {() => void} opts.onRemove
   * @param {(by: number) => void} opts.onMove   +1 forward, -1 backward
   * @param {() => void} [opts.onFlatten]  the chosen smart placement made ordinary (flatten.js, L2)
   * @param {() => void} [opts.onEdit]     the chosen smart placement edited in its app, in place (L6)
   */
  constructor({ mount, onChoose, onAdd, onAddFrame, onRemove, onMove, onFlatten = () => {}, onEdit = () => {} }) {
    this.onChoose = onChoose;
    this.root = el('div', 'pl');
    this.rows = el('div', 'pl-rows');
    const actions = el('div', 'pl-actions');
    this.up = button('↑', () => onMove(+1), { title: 'Forward: drawn over the one above it  ]' });
    this.down = button('↓', () => onMove(-1), { title: 'Backward: drawn under the one below it  [' });
    this.remove = button('Remove', onRemove, { title: 'Off the page  Del' });
    this.frame = button('Next frame…', onAddFrame,
      { title: 'After the chosen one, in its place, for as long: a flipbook’s next frame' });
    this.flat = button('Flatten', onFlatten,
      { title: 'The smart object made ordinary: its state, an object of its own, the placement pointing at it' });
    this.edit = button('Edit ↗', onEdit,
      { title: 'In its app, bound to it: its next save is its next state, and the page draws it' });
    actions.append(button('Add…', onAdd, { primary: true }), this.frame, this.up, this.down, this.edit, this.flat, this.remove);
    this.root.append(this.rows, actions);
    mount.append(this.root);
  }

  /**
   * @param {object[]} items   bottom first, as the page draws them
   * @param {?object} chosen
   */
  render(items, chosen) {
    this.flat.disabled = !(chosen && flattens(chosen.block));
    this.edit.disabled = this.flat.disabled;
    this.edit.textContent = chosen && chosen.app && !this.edit.disabled ? `Edit in ${chosen.app} ↗` : 'Edit ↗';
    this.rows.replaceChildren();
    if (!items.length) this.rows.append(el('div', 'pp-empty', 'Nothing placed yet.'));
    for (let i = items.length - 1; i >= 0; i--) {
      const p = items[i];
      const row = el('button', 'pl-row' + (p === chosen ? ' pl-row--on' : ''));
      row.type = 'button';
      const img = el('img', 'pl-thumb');
      img.alt = '';
      if (p.thumb) img.src = p.thumb;
      const meta = el('div', 'pl-meta');
      meta.append(el('div', 'pl-title', p.title), el('div', 'pl-sub', about(p)));
      row.append(img, meta);
      row.addEventListener('click', () => this.onChoose(p));
      this.rows.append(row);
    }
    const at = items.indexOf(chosen);
    this.remove.disabled = at < 0;
    const follows = chosen || items[items.length - 1];            // how long it lasts is known once it is open
    this.frame.disabled = !follows || !follows.handle;
    this.up.disabled = at < 0 || at === items.length - 1;
    this.down.disabled = at <= 0;
  }
}
