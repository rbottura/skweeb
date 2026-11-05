/**
 * vault-card.js — one object as a card in the vault panel's grid.
 *
 * Split out of VaultPanel.js at the 400-line cap (rule 4), when selection and
 * the trash arrived. It builds DOM and holds no state: the panel says whether
 * the card is the open one and what a click does.
 */

/** Files inside an object folder are served straight from the vault. */
export const fileUrl = (id, file) => '/vault/objects/' + id + '/' + file;

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;   // never innerHTML: titles are user data
  return node;
};

/**
 * @param {object} row          an index row
 * @param {object} opts
 * @param {boolean} opts.on     it is the object open in the drawer
 * @param {(e:MouseEvent)=>void} opts.onClick
 */
export function objectCard(row, { on, onClick }) {
  const card = el('button', 'vp-card' + (on ? ' vp-card--on' : ''));
  card.type = 'button';
  card.dataset.id = row.id;            // the object it shows: a scene, a check, finds it by its id
  card.dataset.type = row.type;        // what it is, for a grid of pictures alone to mark (cluster's)
  card.title = `${row.title || row.id} — ${row.type}`;
  // A set's picture is a strip of its members: its shape, for a host that lays it across the grid (cluster's).
  if (row.type === 'set' && row.render && row.render.w && row.render.h) card.style.setProperty('--vp-ratio', `${row.render.w} / ${row.render.h}`);

  const img = el('img', 'vp-thumb');
  img.loading = 'lazy';
  img.alt = '';
  if (row.thumb) img.src = fileUrl(row.id, row.thumb);
  card.append(img);

  const meta = el('div', 'vp-meta');
  meta.append(el('div', 'vp-name', row.title || row.id));

  const sub = el('div', 'vp-sub');
  sub.append(el('span', 'vp-type', row.type));
  const facts = [];
  if (row.render && row.render.w) facts.push(row.render.w + '×' + row.render.h);
  if (row.render && row.render.frames > 1) facts.push(row.render.frames + 'f');
  if (facts.length) sub.append(document.createTextNode(' · ' + facts.join(' · ')));
  meta.append(sub);

  card.append(meta);
  card.addEventListener('click', onClick);
  return card;
}

/**
 * A picker's card carries its own Use button, shown while it is the chosen
 * one: the choice is made where the eye already is, not at the foot of the
 * detail across the panel. A double click uses it outright.
 */
export function pickableCell(card, label, use) {
  const cell = el('div', 'vp-cell');
  const button = el('button', 'vp-btn vp-btn--primary vp-use', label);
  button.type = 'button';
  button.addEventListener('click', use);
  card.addEventListener('dblclick', use);
  cell.append(card, button);
  return cell;
}
