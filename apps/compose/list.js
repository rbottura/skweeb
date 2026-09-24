/**
 * list.js — what is on the page, as rows: the top of the page first, as a
 * stack of layers reads, and one of them chosen — the one the `placed`
 * panel edits. Shaped like ckt's session list (apps/ckt/sessions.js); the
 * two are the candidates, should a third app want one, for a list in core.
 */

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

/** A row's second line: what it is, and how big it stands on the page. */
function about(p) {
  if (p.error) return 'could not open it';
  if (!p.handle) return 'opening…';
  const s = p.block.transform.scale;
  const loop = p.handle.length > 1 ? ` · ${p.handle.length} at ${p.handle.fps} fps` : '';
  return `${p.type} · ${Math.round(p.size.width * s)} × ${Math.round(p.size.height * s)}${loop}`;
}

export class PlacedList {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.mount
   * @param {(entry: object) => void} opts.onChoose
   * @param {() => void} opts.onAdd
   * @param {() => void} opts.onRemove
   * @param {(by: number) => void} opts.onMove   +1 forward, -1 backward
   */
  constructor({ mount, onChoose, onAdd, onRemove, onMove }) {
    this.onChoose = onChoose;
    this.root = el('div', 'pl');
    this.rows = el('div', 'pl-rows');
    const actions = el('div', 'pl-actions');
    this.up = button('↑', () => onMove(+1), { title: 'Forward: drawn over the one above it  ]' });
    this.down = button('↓', () => onMove(-1), { title: 'Backward: drawn under the one below it  [' });
    this.remove = button('Remove', onRemove, { title: 'Off the page  Del' });
    actions.append(button('Add…', onAdd, { primary: true }), this.up, this.down, this.remove);
    this.root.append(this.rows, actions);
    mount.append(this.root);
  }

  /**
   * @param {object[]} items   bottom first, as the page draws them
   * @param {?object} chosen
   */
  render(items, chosen) {
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
    this.up.disabled = at < 0 || at === items.length - 1;
    this.down.disabled = at <= 0;
  }
}
