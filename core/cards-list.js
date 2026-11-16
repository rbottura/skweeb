/**
 * cards-list.js — a list of cards as a list, the chosen one's card apart
 * (S15c; core/Cards.js `list`).
 *
 * The author, 2026-11-16, with many shapes in the 3D app: "avoir une section
 * list de shapes et une section de paramètres qui charge ceux de la shape en
 * sélection". With `list`, Cards draws each entry here as one line — its
 * colour where it has one, its name, on or off, up and down where the order
 * means something, out — the menu that adds one under them; and the cards
 * stay in their own mount, the chosen one's alone shown (core/cards.css
 * `.pp-cards--split`). A line clicked chooses its entry, as a click in the
 * view does. Nothing moves in the DOM: a card keeps its rows where they were.
 *
 * DOM only; core/cards.css draws `.pp-cards-list`.
 */

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;     // never innerHTML: names may be the user's
  return node;
};

const small = (label, title, run) => {
  const b = el('button', 'pp-btn pp-cards-line-btn', label);
  b.type = 'button';
  b.title = title;
  b.addEventListener('click', e => { e.stopPropagation(); run(); });
  return b;
};

/**
 * @param {import('./Cards.js').Cards} cards
 * @param {HTMLElement} mount     where the list goes
 * @returns {{ node: HTMLElement, paint: () => void }}
 */
export function cardsList(cards, mount) {
  const node = el('ul', 'pp-cards-list');
  mount.append(node);

  /** Each entry's name: its kind's, numbered from the second of a kind — "box", "box 2". */
  const names = () => {
    const seen = new Map();
    return cards.entries.map(e => {
      const n = (seen.get(e.item.id) || 0) + 1;
      seen.set(e.item.id, n);
      return n > 1 ? `${e.item.label} ${n}` : e.item.label;
    });
  };

  function paint() {
    const w = cards.words, all = names();
    // Each card's head the object's name as its line says it: its colour, its number from the second of a kind.
    cards.entries.forEach((e, i) => {
      const colour = e.params.values.colour;
      if (e.swatch) e.swatch.style.background = typeof colour === 'string' && colour.startsWith('#') ? colour : '';
      if (e.swatch) e.swatch.classList.toggle('pp-cards-swatch--none', !(typeof colour === 'string' && colour.startsWith('#')));
      e.title.dataset.n = all[i] === e.item.label ? '' : all[i].slice(e.item.label.length + 1);
    });
    node.replaceChildren(...cards.entries.map((e, i) => {
      const line = el('li', 'pp-cards-line' + (e === cards.chosen ? ' pp-cards-line--chosen' : '') + (e.on ? '' : ' pp-cards-line--off'));
      line.tabIndex = 0;
      line.title = `${all[i]} — its params below`;
      const colour = e.params.values.colour;
      const swatch = el('span', 'pp-cards-swatch');
      if (typeof colour === 'string' && colour.startsWith('#')) swatch.style.background = colour;
      else swatch.classList.add('pp-cards-swatch--none');
      line.append(swatch, el('span', 'pp-cards-line-name', all[i]));
      line.append(small(e.on ? w.on : w.off, w.toggle, () => e.toggle.click()));
      if (cards.order) line.append(small('↑', w.up, () => cards.move(e, -1)), small('↓', w.down, () => cards.move(e, 1)));
      line.append(small('✕', w.out, () => cards.remove(e)));
      const choose = () => { if (cards.chosen !== e) cards.choose(e); };
      line.addEventListener('click', choose);
      line.addEventListener('keydown', ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); choose(); } });
      return line;
    }));
  }

  /** The chosen line into view in the list's own scroll — the page's left where it is. */
  function reveal() {
    const line = node.querySelector('.pp-cards-line--chosen');
    if (!line) return;
    const r = line.getBoundingClientRect(), R = node.getBoundingClientRect();
    if (r.top < R.top) node.scrollTop -= R.top - r.top;
    else if (r.bottom > R.bottom) node.scrollTop += r.bottom - R.bottom;
  }

  return { node, paint, reveal, names };
}
