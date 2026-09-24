/**
 * editing.js — which placement the `placed` panel edits, and how an edit
 * reaches it.
 *
 * The panel is one Params (params.js `placeParams`) and a page holds many
 * placements, so the panel is shown one of them — `choose()` — and what is
 * typed into it is carried back to that one — `sync()`. Showing a placement
 * is not an edit: while the panel is being restored to one, nothing it
 * announces is heard as a change. And an edit arrives as a burst — a Reset
 * announces every key — so it is carried once, after the burst has ended,
 * and sees the panel as it ends up.
 *
 * Putting an object on the page places it whole (`fitWhenOpen`); clearing its
 * object, or a Reset, takes it off; with nothing chosen, an object picked in
 * the panel is a new placement.
 */

import { toPlacement, fromPlacement } from './params.js';
import { fitScale } from './page.js';

export class Editing {
  /**
   * @param {object} opts
   * @param {object} opts.placements    placements.js
   * @param {object} opts.place         the placement's Params
   * @param {object} opts.page          the page's Params
   * @param {() => void} opts.refresh   the list, the clock and the page, after a change
   */
  constructor({ placements, place, page, refresh }) {
    this.placements = placements;
    this.place = place;
    this.page = page;
    this.refresh = refresh;
    this.chosen = null;               // the placement the panel edits
    this.choosing = false;            // the panel is being shown a placement: not an edit
    this.syncing = false;             // an edit is waiting to be carried over

    place.on(() => {
      if (this.choosing || this.syncing) return;
      this.syncing = true;
      queueMicrotask(() => this.sync());
    });
  }

  /** A new placement, on top and chosen — placed whole once its object is open. */
  putOn(block) {
    const p = this.placements.add(block);
    this.choose(p);
    this.fitWhenOpen(p);
  }

  /** Take a placement off the page, and choose the one that was under it. */
  takeOff(p) {
    const i = this.placements.items.indexOf(p);
    this.placements.remove(p);
    if (this.chosen === p) this.choose(this.placements.items[Math.max(0, i - 1)] || null);
  }

  /** Which placement the panel edits. The panel follows it; nothing is edited. */
  choose(p) {
    this.chosen = p;
    this.choosing = true;
    try {
      this.place.restore(p ? fromPlacement(p.block) : {});
    } finally {
      this.choosing = false;
    }
    this.refresh();
  }

  /** The panel as it ended up, carried to the chosen placement. */
  sync() {
    this.syncing = false;
    const v = this.place.values;
    const p = this.chosen;
    if (!p) {
      if (v.ref) this.putOn(toPlacement(v));
      return this.refresh();
    }
    if (!v.ref) return this.takeOff(p);
    const renamed = v.ref !== p.block.ref;
    const { at, length } = p.block;
    this.placements.update(p, toPlacement(v, { at, length }));
    if (renamed) this.fitWhenOpen(p);
    this.refresh();
  }

  /** A placement's scale, set to fit the sheet once its object's size is known. */
  async fitWhenOpen(p) {
    await p.opening;
    if (!p.size || !this.placements.items.includes(p)) return;
    p.block = { ...p.block, transform: { ...p.block.transform, scale: fitScale(p.size, this.page.values) } };
    if (this.chosen === p) this.choose(p);
    else this.refresh();
  }
}
