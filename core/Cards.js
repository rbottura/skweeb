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
   * @param {() => void} [opts.onChange]       an entry came or went, moved, or changed a value
   */
  constructor({ mount, catalogue, app, schemaOf = null, groups = null, order = false, start = null, words = {}, onChange = () => {} }) {
    this.catalogue = catalogue;
    this.app = app;
    this.schemaOf = schemaOf || (id => catalogue[id].params || {});
    this.groups = groups;
    this.order = order;
    this.start = start;
    this.words = { ...WORDS, ...words };
    this.onChange = onChange;
    this.entries = [];

    this.cards = el('div', 'pp-cards');
    this.empty = el('p', 'pp-cards-empty', this.words.empty);
    this.menu = el('select', 'pp-select pp-cards-add');
    this.menu.setAttribute('aria-label', this.words.add);
    this.menu.append(new Option(this.words.add, ''));
    for (const item of Object.values(catalogue)) this.menu.append(new Option(item.label, item.id));
    this.menu.addEventListener('change', () => {
      const id = this.menu.value;
      this.menu.value = '';
      if (id) this.add(id, this.start ? this.start(id, this.entries) : {});
    });
    mount.append(this.cards, this.empty, this.menu);
  }

  /** The list as a recipe holds it. */
  recipe() {
    return this.entries.map(e => ({ id: e.item.id, params: e.params.values, on: e.on }));
  }

  /** How many entries are on, of how many. */
  get counts() {
    return { on: this.entries.filter(e => e.on).length, all: this.entries.length };
  }

  /**
   * Add an entry at the end.
   * @param {string} id
   * @param {object} [values]   as a recipe has them; coerced, missing ones default
   * @param {boolean} [on]
   */
  add(id, values = {}, on = true) {
    const item = this.catalogue[id];
    if (!item) throw new Error(`${this.app}: no "${id}" in the catalogue`);
    const params = defineParams(`${this.app}:${id}`, this.schemaOf(id));
    params.set(values);

    const card = el('div', 'pp-card');
    const panel = new ParamPanel(params, { title: item.label, mount: card, ...(this.groups ? { groups: this.groups } : {}) });
    const entry = { item, params, on, card, panel };

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

    this.entries.push(entry);
    this.cards.append(card);
    this.paint();
    this.onChange();
    return entry;
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
    this.paint();
    this.onChange();
  }

  /** Put a whole list back, as a recipe has it. An entry not in the catalogue is named, not thrown. */
  restore(list = []) {
    for (const e of this.entries) e.card.remove();
    this.entries = [];
    const unknown = [];
    for (const item of list || []) {
      if (item && this.catalogue[item.id]) this.add(item.id, item.params, item.on !== false);
      else unknown.push(item && item.id);
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
