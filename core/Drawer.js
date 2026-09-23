/**
 * Drawer.js — a collapsible section.
 *
 * The one piece every panel in the suite is made of. A param panel turns each
 * schema `group` into a drawer; an app adds drawers of its own for things that
 * are not parameters — the sequence player, the export actions, a list of
 * sets. Closed drawers are what keeps a panel with thirty controls compact:
 * you open the one you are working in.
 *
 * Open or closed is remembered per viewer when the drawer has an `id` — a
 * convenience, kept in localStorage and never relied on: a private window or
 * cleared storage just gets the defaults back.
 *
 * DOM only, no styling here: theme.css draws `.dr`, `.dr-head`, `.dr-body`.
 */

const STORE = 'skweeb:drawer:';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

function remembered(id) {
  if (!id) return null;
  try {
    const v = localStorage.getItem(STORE + id);
    return v === null ? null : v === '1';
  } catch {
    return null;
  }
}

function remember(id, open) {
  if (!id) return;
  try { localStorage.setItem(STORE + id, open ? '1' : '0'); } catch { /* storage off: fine */ }
}

export class Drawer {
  /**
   * @param {object} opts
   * @param {string} opts.title
   * @param {boolean} [opts.open=true]  how it starts, unless this viewer chose otherwise
   * @param {string} [opts.id]          remember this viewer's choice under this id
   * @param {string} [opts.note]        a short fact beside the title, like a count
   */
  constructor({ title, open = true, id = null, note = '' } = {}) {
    this.id = id;

    this.root = el('section', 'dr');
    this.head = el('button', 'dr-head');
    this.head.type = 'button';
    this.titleEl = el('span', null, title);
    this.noteEl = el('span', 'dr-note', note);
    this.head.append(this.titleEl, this.noteEl);
    this.body = el('div', 'dr-body');
    this.root.append(this.head, this.body);

    this.head.addEventListener('click', () => {
      this.open = !this.open;
      remember(this.id, this.open);
    });

    const saved = remembered(id);
    this.open = saved === null ? open : saved;
  }

  get open() { return this._open; }

  set open(v) {
    this._open = !!v;
    this.root.classList.toggle('dr--open', this._open);
    this.head.setAttribute('aria-expanded', String(this._open));
  }

  /** The short fact beside the title — '58 glyphs', '3 made'. */
  note(text) { this.noteEl.textContent = text == null ? '' : String(text); }

  /** Hide the whole drawer, as when none of its rows apply. */
  set hidden(v) { this.root.hidden = !!v; }
  get hidden() { return this.root.hidden; }
}
