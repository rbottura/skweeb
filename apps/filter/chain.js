/**
 * chain.js — the filters, in order: each one's values, and its card.
 *
 * An entry is a filter from the catalogue (core/gpu/filters/) with a Params
 * of its own, declared from the filter's schema, and a small ParamPanel drawn
 * from that — rule 1: the controls come from the schema, and this file writes
 * none. What a schema cannot say is a list's own business, and that is all
 * the app adds to each card's head: on or off, up or down, and out.
 *
 * `recipe()` is the chain as a recipe holds it — `[{ id, params, on }]`, what
 * core/gpu's runner takes and what a save will write.
 */

import { FILTERS }      from '../../core/gpu/filters/index.js';
import { defineParams } from '../../core/params.js';
import { ParamPanel }   from '../../core/ParamPanel.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

export class Chain {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.mount     where the cards and the add menu go
   * @param {() => void} opts.onChange   an entry came or went, moved, or changed a value
   */
  constructor({ mount, onChange = () => {} }) {
    this.onChange = onChange;
    this.entries = [];

    this.cards = el('div', 'fl-cards');
    this.empty = el('p', 'fl-empty', 'No filters yet. Add one — they run top to bottom.');
    this.menu = el('select', 'pp-select fl-add');
    this.menu.setAttribute('aria-label', 'Add a filter');
    this.menu.append(new Option('add a filter…', ''));
    for (const f of Object.values(FILTERS)) this.menu.append(new Option(f.label, f.id));
    this.menu.addEventListener('change', () => {
      if (this.menu.value) this.add(this.menu.value);
      this.menu.value = '';
    });
    mount.append(this.cards, this.empty, this.menu);
  }

  /** The chain as a recipe holds it. */
  recipe() {
    return this.entries.map(e => ({ id: e.filter.id, params: e.params.values, on: e.on }));
  }

  /** How many entries are on, of how many. */
  get counts() {
    return { on: this.entries.filter(e => e.on).length, all: this.entries.length };
  }

  /**
   * Add a filter at the end.
   * @param {string} id
   * @param {object} [values]   as a recipe has them; coerced, missing ones default
   * @param {boolean} [on]
   */
  add(id, values = {}, on = true) {
    const filter = FILTERS[id];
    if (!filter) throw new Error(`filter: no "${id}" in the catalogue`);
    const params = defineParams('filter:' + id, filter.params || {});
    params.set(values);

    const card = el('div', 'fl-card');
    const panel = new ParamPanel(params, { title: filter.label, mount: card });
    const entry = { filter, params, on, card, panel };

    const toggle = headButton(on ? 'on' : 'off', 'Switch this filter off or on', () => {
      entry.on = !entry.on;
      toggle.textContent = entry.on ? 'on' : 'off';
      card.classList.toggle('fl-card--off', !entry.on);
      this.onChange();
    });
    card.classList.toggle('fl-card--off', !on);
    entry.up = headButton('↑', 'Run it earlier', () => this.move(entry, -1));
    entry.down = headButton('↓', 'Run it later', () => this.move(entry, 1));
    panel.head.append(toggle, entry.up, entry.down,
      headButton('✕', 'Take it out of the chain', () => this.remove(entry)));
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

  /** Put a whole chain back, as a recipe has it. Unknown filters are named, not thrown. */
  restore(list = []) {
    for (const e of this.entries.slice()) { e.card.remove(); }
    this.entries = [];
    const unknown = [];
    for (const item of list || []) {
      if (item && FILTERS[item.id]) this.add(item.id, item.params, item.on !== false);
      else unknown.push(item && item.id);
    }
    this.paint();
    this.onChange();
    return unknown;
  }

  /** The first card cannot go up, the last cannot go down; an empty chain says so. */
  paint() {
    this.empty.hidden = this.entries.length > 0;
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
