/**
 * vault-folder.js — a folder in the vault panel, filed like any object.
 *
 * A folder is one card the size of the others: a tab on top, its picture the
 * first four of its members, its name and count under it. Clicking it opens a
 * strip across the grid holding its cards; clicking the card again, or the
 * strip's head, closes it. The panel's grid packs densely (vault-panel.css),
 * so the cards after a folder fill out its row and the strip lands under that
 * row instead of breaking it.
 *
 * A folder is a view, not a place: see docs/object-model.md, *Tags that group*.
 */

/** The folder a row is filed in, from its `folder:` tag, or null. */
export const folderOf = row => {
  const tag = (row.tags || []).find(t => typeof t === 'string' && t.startsWith('folder:'));
  return tag ? tag.slice('folder:'.length) : null;
};

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;   // never innerHTML: names are user data
  return node;
};

/** A folder outline, drawn in the text colour. */
const icon = () => {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 14 11');
  svg.setAttribute('class', 'vp-ficon');
  svg.setAttribute('aria-hidden', 'true');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M1 1.5h4l1.5 1.5H13v6.5H1z');
  svg.append(path);
  return svg;
};

/**
 * @param {object} f
 * @param {string} f.name
 * @param {object[]} f.rows      its members, newest first
 * @param {boolean} f.open       open when painted
 * @param {(row:object)=>string|null} f.thumb  a member's thumbnail url
 * @param {(row:object)=>Element} f.card       a member's card, as the grid makes it
 * @param {(open:boolean)=>void} f.onToggle     so the panel can reopen it on repaint
 * @returns {[Element, Element]} the card and its strip, to go into the grid in that order
 */
export function folder({ name, rows, open, thumb, card, onToggle }) {
  const tile = el('button', 'vp-card vp-fcard');
  tile.type = 'button';
  tile.title = 'Folder — ' + rows.length + ' objects';

  const pics = el('div', 'vp-fthumb');
  const few = rows.slice(0, 4);
  pics.dataset.n = few.length;
  for (const row of few) {
    const img = el('img');
    img.loading = 'lazy';
    img.alt = '';
    const url = thumb(row);
    if (url) img.src = url;
    pics.append(img);
  }

  const meta = el('div', 'vp-meta');
  meta.append(el('div', 'vp-name', name));
  const sub = el('div', 'vp-sub');
  sub.append(icon(), el('span', 'vp-type', 'folder'), document.createTextNode(' · ' + rows.length));
  meta.append(sub);
  tile.append(pics, meta);

  // The strip: built the first time it opens, then only shown and hidden.
  const strip = el('div', 'vp-fstrip');
  strip.hidden = true;
  let filled = false;
  const fill = () => {
    const head = el('button', 'vp-fstrip-head');
    head.type = 'button';
    head.title = 'Close this folder';
    head.append(icon(), el('span', 'vp-fstrip-name', name),
      el('span', 'vp-fstrip-count', rows.length + ''), el('span', 'vp-fstrip-x', '✕'));
    head.addEventListener('click', () => set(false));
    const grid = el('div', 'vp-grid');
    for (const row of rows) grid.append(card(row));
    strip.append(head, grid);
    filled = true;
  };

  const set = on => {
    if (on && !filled) fill();
    strip.hidden = !on;
    tile.classList.toggle('vp-fcard--open', on);
    tile.setAttribute('aria-expanded', String(on));
    onToggle(on);
  };
  tile.addEventListener('click', () => set(strip.hidden));
  set(open);

  return [tile, strip];
}
