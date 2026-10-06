/**
 * Cards.js — a list of small param panels, each drawn from its own schema.
 *
 * What filter's chain is and what the 3D app's shapes are: entries of a
 * catalogue — a filter, a primitive — each with values of its own, declared
 * from its entry's schema, and a card drawn from that: rule 1, the controls
 * come from the schema and the list writes none. What a schema cannot say is
 * the list's own business, and that is all a card's head adds: on or off, up
 * or down where the order means something, and out. Moved here from filter's
 * chain when the 3D app needed the same list (2026-10-06).
 *
 * `recipe()` is the list as a recipe holds it — `[{ id, params, on }]`, what
 * core/gpu's runner takes for a chain and what a model keeps for its shapes.
 *
 * One entry can be chosen (`choose`): its card marked and brought into view
 * — what the 3D app does when a shape is clicked in its view. With `fold`
 * the chosen card is the only one open, the others folded to their head on
 * one line, so a long list stays short; a click on a card's name chooses it,
 * and on the chosen one's folds it. One added from the menu is chosen, and
 * one `duplicate` puts right after its original. Choosing is the list's
 * state, not a value: nothing saves it.
 *
 * A card can hold a list of its own (`inner`) — a shape's modifiers — in a
 * drawer of the card, its changes the outer list's, kept in the entry's
 * recipe under its key: `[{ id, params, on, modifiers: [{ id, params, on }] }]`.
 *
 * DOM and params only; core/param-panel.css draws `.pp-cards` and `.pp-card`.
 */

import { defineParams } from './params.js';
import { ParamPanel }   from './ParamPanel.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

/** What the list says, unless an app says otherwise. */
const WORDS = {
  add: 'add…',
  empty: 'Nothing yet.',
  on: 'on', off: 'off',
  toggle: 'Switch it off or on',
  up: 'Earlier', down: 'Later',
  out: 'Take it out',
};

export class Cards {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.mount           where the cards and the add menu go
   * @param {Object<string, {id: string, label: string, params?: object}>} opts.catalogue
   * @param {string} opts.app                  the prefix of each entry's params: `<app>:<id>`
   * @param {(id: string) => object} [opts.schemaOf]   an entry's schema; its catalogue `params` otherwise
   * @param {object} [opts.groups]             drawers inside a card, as a ParamPanel takes them
   * @param {boolean} [opts.order=false]       ↑ and ↓ on each card: the order means something
   * @param {(id: string, entries: object[]) => object} [opts.start]  the values a card added from the menu starts with
   * @param {object} [opts.words]              what the menu, the empty list and the buttons say
   * @param {boolean} [opts.fold=false]        only the chosen card open, the others one line each
   * @param {object} [opts.inner]              a list inside each card: `{ key, title, before }` and the
   *                                           options of its own Cards; its recipe under `key`
   * @param {() => void} [opts.onChange]       an entry came or went, moved, or changed a value
   * @param {(index: number) => void} [opts.onChoose]   another entry chosen — its index, or -1 for none
   */
  constructor({ mount, catalogue, app, schemaOf = null, groups = null, order = false, start = null, words = {},
                fold = false, inner = null, onChange = () => {}, onChoose = () => {} }) {
    this.catalogue = catalogue;
    this.app = app;
    this.schemaOf = schemaOf || (id => catalogue[id].params || {});
    this.groups = groups;
    this.order = order;
    this.start = start;
    this.words = { ...WORDS, ...words };
    this.fold = fold;
    this.inner = inner;
    this.onChange = onChange;
    this.onChoose = onChoose;
    this.entries = [];
    this.chosen = null;

    this.cards = el('div', 'pp-cards');
    this.empty = el('p', 'pp-cards-empty', this.words.empty);
    this.menu = el('select', 'pp-select pp-cards-add');
    this.menu.setAttribute('aria-label', this.words.add);
    this.menu.append(new Option(this.words.add, ''));
    for (const item of Object.values(catalogue)) this.menu.append(new Option(item.label, item.id));
    this.menu.addEventListener('change', () => {
      const id = this.menu.value;
      this.menu.value = '';
      if (!id) return;
      const entry = this.add(id, this.start ? this.start(id, this.entries) : {});
      if (this.fold) this.choose(entry);
    });
    mount.append(this.cards, this.empty, this.menu);
  }

  /** The list as a recipe holds it, each entry's inner list under its key. */
  recipe() {
    return this.entries.map(e => ({ id: e.item.id, params: e.params.values, on: e.on,
                                    ...(e.inner ? { [this.inner.key]: e.inner.recipe() } : {}) }));
  }

  /** How many entries are on, of how many. */
  get counts() {
    return { on: this.entries.filter(e => e.on).length, all: this.entries.length };
  }

  /** Where the chosen entry is in the list, or -1. */
  get chosenIndex() {
    return this.chosen ? this.entries.indexOf(this.chosen) : -1;
  }

  /**
   * Choose an entry — itself, or its index — or none (null, -1): its card
   * marked and brought into view, and with `fold` the only one open.
   */
  choose(which) {
    const entry = typeof which === 'number' ? (this.entries[which] || null) : (which || null);
    if (entry && !this.entries.includes(entry)) return;
    const changed = entry !== this.chosen;
    this.chosen = entry;
    for (const e of this.entries) this.mark(e);
    if (entry) reveal(entry);
    if (changed) this.onChoose(this.chosenIndex);
  }

  /** A card as the choice has it: marked or not, open or folded. */
  mark(entry) {
    const chosen = entry === this.chosen;
    entry.card.classList.toggle('pp-card--chosen', chosen);
    if (!this.fold) return;
    entry.card.classList.toggle('pp-card--folded', !chosen);
    entry.title.setAttribute('aria-expanded', String(chosen));
  }

  /**
   * Add an entry, at the end unless told where.
   * @param {string} id
   * @param {object} [values]   as a recipe has them; coerced, missing ones default
   * @param {boolean} [on]
   * @param {number} [at]       its place in the list
   */
  add(id, values = {}, on = true, at = this.entries.length) {
    const item = this.catalogue[id];
    if (!item) throw new Error(`${this.app}: no "${id}" in the catalogue`);
    const params = defineParams(`${this.app}:${id}`, this.schemaOf(id));
    params.set(values);

    const card = el('div', 'pp-card');
    const panel = new ParamPanel(params, { title: item.label, mount: card, ...(this.groups ? { groups: this.groups } : {}) });
    const entry = { item, params, on, card, panel, title: panel.head.querySelector('.pp-title') };
    if (this.fold) foldable(entry, () => this.choose(this.chosen === entry ? null : entry));
    if (this.inner) entry.inner = this.innerOf(panel);

    const toggle = headButton(on ? this.words.on : this.words.off, this.words.toggle, () => {
      entry.on = !entry.on;
      toggle.textContent = entry.on ? this.words.on : this.words.off;
      card.classList.toggle('pp-card--off', !entry.on);
      this.onChange();
    });
    card.classList.toggle('pp-card--off', !on);
    panel.head.append(toggle);
    if (this.order) {
      entry.up = headButton('↑', this.words.up, () => this.move(entry, -1));
      entry.down = headButton('↓', this.words.down, () => this.move(entry, 1));
      panel.head.append(entry.up, entry.down);
    }
    panel.head.append(headButton('✕', this.words.out, () => this.remove(entry)));
    params.on(() => this.onChange());

    const next = this.entries[at];
    this.entries.splice(at, 0, entry);
    this.cards.insertBefore(card, next ? next.card : null);
    this.mark(entry);
    this.paint();
    this.onChange();
    return entry;
  }

  /** An entry again, right after it: its values as they are, `change` over them, its inner list — chosen, with `fold`. */
  duplicate(entry, change = {}) {
    const i = this.entries.indexOf(entry);
    if (i < 0) return null;
    const copy = this.add(entry.item.id, { ...entry.params.values, ...change }, entry.on, i + 1);
    if (copy.inner) copy.inner.restore(entry.inner.recipe());
    if (this.fold) this.choose(copy);
    return copy;
  }

  /** The list inside a card: a drawer of its own, its count beside its title, its changes the outer list's. */
  innerOf(panel) {
    const { key, title, before = null, ...opts } = this.inner;
    const drawer = panel.addDrawer({ id: key, title, before });
    const inner = new Cards({ ...opts, mount: drawer.body, onChange: () => {
      const { on, all } = inner.counts;
      drawer.note(all ? (on === all ? `${all}` : `${on} of ${all} on`) : '');
      this.onChange();
    } });
    return inner;
  }

  move(entry, by) {
    const i = this.entries.indexOf(entry);
    const j = i + by;
    if (i < 0 || j < 0 || j >= this.entries.length) return;
    this.entries.splice(i, 1);
    this.entries.splice(j, 0, entry);
    for (const e of this.entries) this.cards.append(e.card);   // in order, top first
    this.paint();
    this.onChange();
  }

  remove(entry) {
    const i = this.entries.indexOf(entry);
    if (i < 0) return;
    this.entries.splice(i, 1);
    entry.card.remove();
    if (entry === this.chosen) this.choose(null);
    this.paint();
    this.onChange();
  }

  /**
   * Put a whole list back, as a recipe has it, inner lists too, nothing
   * chosen. What a catalogue lacks is named, not thrown — the inner lists' too.
   */
  restore(list = []) {
    for (const e of this.entries) e.card.remove();
    this.entries = [];
    this.choose(null);
    const unknown = [];
    for (const item of list || []) {
      if (!item || !this.catalogue[item.id]) { unknown.push(item && item.id); continue; }
      const entry = this.add(item.id, item.params, item.on !== false);
      if (entry.inner) unknown.push(...entry.inner.restore(item[this.inner.key]));
    }
    this.paint();
    this.onChange();
    return unknown;
  }

  /** The first card cannot go up, the last cannot go down; an empty list says so. */
  paint() {
    this.empty.hidden = this.entries.length > 0;
    if (!this.order) return;
    this.entries.forEach((e, i) => {
      e.up.disabled = i === 0;
      e.down.disabled = i === this.entries.length - 1;
    });
  }
}

function headButton(label, title, onClick) {
  const b = el('button', 'pp-btn', label);
  b.type = 'button';
  b.title = title;
  b.addEventListener('click', onClick);
  return b;
}

/** A card's name made the way to open it, by a click or a key, as a drawer's head is. */
function foldable(entry, toggle) {
  const name = entry.title;
  entry.card.classList.add('pp-card--foldable');
  name.setAttribute('role', 'button');
  name.tabIndex = 0;
  name.title = 'Open it and fold the others, or fold it';
  name.addEventListener('click', toggle);
  name.addEventListener('keydown', ev => {
    if (ev.key !== 'Enter' && ev.key !== ' ') return;
    ev.preventDefault();
    toggle();
  });
}

/**
 * The chosen card into view in the column that scrolls it: whole if it fits,
 * its head at the top if it is taller than the column.
 */
function reveal(entry) {
  entry.card.scrollIntoView({ block: 'nearest' });
  entry.panel.head.scrollIntoView({ block: 'nearest' });
}
