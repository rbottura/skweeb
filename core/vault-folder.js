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
 *
 * A set whose members are exactly a folder's is filed with them, first: the
 * legacy grid's materials came in as a folder of tiles and a set of the same
 * tiles, and a set beside its folder said the same thing twice, smaller — the
 * author, 2026-11-05: "trop petits et redondants avec les folders".
 */

/** The folder a row is filed in, from its `folder:` tag, or null. */
export const folderOf = row => {
  const tag = (row.tags || []).find(t => typeof t === 'string' && t.startsWith('folder:'));
  return tag ? tag.slice('folder:'.length) : null;
};

/**
 * Where each of `rows` is filed: its own `folder:` tag; or, a set filed
 * nowhere, the folder that holds exactly its members among these rows — so a
 * picker that shows sets and no tiles files none. Reads index rows only: a
 * set's row carries its members (server.js).
 *
 * @param {object[]} rows  what the grid shows
 * @returns {(row: object) => ?string}
 */
export function filedWith(rows) {
  const held = new Map();                 // a folder → the ids it holds here
  const where = new Map();                // an id → its folder
  for (const r of rows) {
    const name = folderOf(r);
    if (!name) continue;
    if (!held.has(name)) held.set(name, new Set());
    held.get(name).add(r.id);
    where.set(r.id, name);
  }
  const sets = new Map();
  for (const r of rows) {
    if (r.type !== 'set' || folderOf(r) || !Array.isArray(r.members) || !r.members.length) continue;
    const name = where.get(r.members[0]), ids = name && held.get(name);
    if (ids && ids.size === new Set(r.members).size && r.members.every(id => ids.has(id))) sets.set(r.id, name);
  }
  return row => folderOf(row) || sets.get(row.id) || null;
}

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
 * @param {(e:MouseEvent)=>boolean} [f.select]  takes a click first: true when it
 *   was a selection (a ctrl-click), which then does not open the folder
 * @returns {[Element, Element]} the card and its strip, to go into the grid in that order
 */
export function folder({ name, rows, open, thumb, card, onToggle, select }) {
  const sets = rows.filter(r => r.type === 'set');
  rows = [...sets, ...rows.filter(r => r.type !== 'set')];   // a set filed with its members leads them
  const tile = el('button', 'vp-card vp-fcard');
  tile.type = 'button';
  tile.dataset.folder = name;
  tile.title = 'Folder — ' + rows.length + ' objects' + (sets.length ? ', ' + (sets.length === 1 ? 'a set of them' : sets.length + ' sets') : '');

  const pics = el('div', 'vp-fthumb');
  const few = rows.slice(sets.length).concat(sets).slice(0, 4);   // its members' pictures, a set's strip last
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
  tile.addEventListener('click', e => { if (!(select && select(e))) set(strip.hidden); });
  set(open);

  return [tile, strip];
}
