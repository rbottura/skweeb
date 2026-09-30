/**
 * editing.js — the things side of the map editor: what stands on the map,
 * the chosen one's panel, and the picker that places a new one.
 *
 * The panel edits one block of `place`, as compose's placement panel edits
 * one entry of its page, and its values are the block's own keys: `ref`,
 * `col`, `row`, `width`. A block stays on the map — its cell within the
 * grid, whatever is typed — and a drag moves the panel with it.
 */

import { thingParams, THING_GROUPS, PLACEABLE } from './params.js';
import { Things, newBlock, thingAt, boxOf } from './things.js';
import { ThingList }  from './list.js';
import { ParamPanel } from '../../core/ParamPanel.js';
import { VaultPanel } from '../../core/VaultPanel.js';

export class Editing {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.mount     the right-hand column
   * @param {() => object} opts.map      the map's values
   * @param {() => void} opts.onChange   something on the map changed
   */
  constructor({ mount, map, onChange }) {
    this.map = map;
    this.onChange = onChange;
    this.chosen = null;
    this.things = new Things({ onChange: () => this._changed() });
    this.thing = thingParams();
    this.panel = new ParamPanel(this.thing, { title: 'things', mount, groups: THING_GROUPS });
    const drawer = this.panel.addDrawer({ id: 'things', title: 'On the map', before: 'thing' });
    this.list = new ThingList({ mount: drawer.body, onChoose: p => this.choose(p),
                                onAdd: () => this.picker.show(), onRemove: () => this.remove() });
    this.picker = new VaultPanel({ accepts: PLACEABLE, pickLabel: 'Place this', onPick: o => this.place(o.id) });
    this.thing.on(() => {
      if (this.thing.restoring || !this.chosen) return;
      this.things.update(this.chosen, this._fit(this.thing.values));
    });
    // Nothing chosen to start, said to no one: the page is still being put together.
    this.panel.drawer('thing').hidden = true;
    this.list.render(this.things.items, null);
  }

  /** A thing from the vault on the middle cell, chosen. */
  place(ref) {
    const m = this.map();
    const p = this.things.add(newBlock(ref, Math.floor(m.cols / 2), Math.floor(m.rows / 2)));
    this.choose(p);
    return p;
  }

  choose(p) {
    this.chosen = p || null;
    this.panel.drawer('thing').hidden = !this.chosen;
    if (this.chosen) this.thing.restore(this.chosen.block);
    this._changed();
  }

  /** Moved to a cell by a drag: the panel follows it. */
  move(p, col, row) {
    this.things.update(p, { ...p.block, col, row });
    if (p === this.chosen) this.thing.restore(p.block);
  }

  remove() {
    if (!this.chosen) return;
    this.things.remove(this.chosen);
    this.choose(null);
  }

  /** The nearest thing under a point of the map, of those whose frames are in. */
  at(x, y) {
    return thingAt(this.things.items.filter(p => p.size), x, y, this.map().tile);
  }

  /** The chosen thing's box and cell, for the guides — or null. */
  chosenBox() {
    const p = this.chosen;
    return p && p.size ? { box: boxOf(p.block, p.size, this.map().tile), cell: p.block } : null;
  }

  /** A block kept on the map: its cell within the grid. */
  _fit(v) {
    const m = this.map();
    const within = (n, most) => Math.min(Math.max(0, Math.round(n) || 0), most);
    return { ref: v.ref, width: v.width, col: within(v.col, m.cols - 1), row: within(v.row, m.rows - 1) };
  }

  _changed() {
    this.list.render(this.things.items, this.chosen);
    this.onChange();
  }
}
