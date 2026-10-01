/**
 * list.js — the things on the map, as rows: the nearest first, as a stack
 * reads from the front, and one of them chosen — the one the thing's panel
 * edits. A small cousin of compose's PlacedList; the two, with ckt's
 * sessions, are the candidates for a list in core.
 */

import { drawOrder } from './things.js';

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

/** What a thing does, in a few words — or '' for nothing. */
export function eventLabel(block) {
  if (block.event === 'sign') return 'a sign';
  if (block.event === 'warp') return block.to ? `a warp to ${block.to}` : 'a warp, to no map yet';
  if (block.event === 'spawn') return `the spawn, facing ${block.face || 'down'}`;
  return '';
}

/** A row's title: its object's, or — with none — what it does. */
const titleOf = p => (p.block.ref ? p.title : eventLabel(p.block) || 'a mark, doing nothing');

/** A row's second line: where it stands, how wide, whether it moves, what it does. */
function about(p) {
  if (p.error) return 'could not open it';
  if (p.block.ref && !p.handle) return 'opening…';
  const at = `column ${p.block.col}, row ${p.block.row}`;
  if (!p.block.ref) return `${at} · nothing to see` + (p.block.solid ? ' · solid' : '');
  const loop = p.handle.length > 1 ? ` · ${p.handle.length} at ${p.handle.fps} fps` : '';
  const does = [p.block.solid ? 'solid' : '', eventLabel(p.block)].filter(Boolean).join(', ');
  return `${at} · ${p.block.width} wide${loop}` + (does ? ` · ${does}` : '');
}

export class ThingList {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.mount
   * @param {(p: object) => void} opts.onChoose
   * @param {() => void} opts.onAdd
   * @param {() => void} opts.onMark
   * @param {() => void} opts.onRemove
   */
  constructor({ mount, onChoose, onAdd, onMark, onRemove }) {
    this.onChoose = onChoose;
    this.rows = el('div', 'mp-rows');
    const actions = el('div', 'mp-actions');
    this.remove = button('Remove', onRemove, { title: 'Off the map  Del' });
    actions.append(button('Place…', onAdd, { primary: true, title: 'A thing from the vault, on the middle cell' }),
      button('Mark', onMark, { title: 'An event with nothing to see — an exit, the spawn — on the middle cell' }), this.remove);
    mount.append(this.rows, actions);
  }

  render(items, chosen) {
    this.rows.replaceChildren();
    if (!items.length) this.rows.append(el('div', 'pp-empty', 'Nothing on the map yet.'));
    const order = drawOrder(items);
    for (let i = order.length - 1; i >= 0; i--) {
      const p = order[i];
      const row = el('button', 'mp-row' + (p === chosen ? ' mp-row--on' : ''));
      row.type = 'button';
      const img = el('img', 'mp-thumb');
      img.alt = '';
      if (p.thumb) img.src = p.thumb;
      const meta = el('div', 'mp-meta');
      meta.append(el('div', 'mp-title', titleOf(p)), el('div', 'mp-sub', about(p)));
      row.append(img, meta);
      row.addEventListener('click', () => this.onChoose(p));
      this.rows.append(row);
    }
    this.remove.disabled = !chosen;
  }
}
