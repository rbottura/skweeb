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
 * the panel is a new placement. And a placement's end, moved or gone, moves
 * the ones that started at it (`ripple`): a flipbook stays one frame after
 * another.
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
   * @param {(text: string) => void} [opts.say]   something worth telling
   */
  constructor({ placements, place, page, refresh, say = () => {} }) {
    this.say = say;
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

  /**
   * A new placement, on top and chosen — placed whole once its object is
   * open, unless it keeps the place it was given: a flipbook's next frame,
   * which goes just over the frame it follows, so the list reads in order.
   */
  putOn(block, { fit = true, over = null } = {}) {
    const p = this.placements.add(block, over);
    this.choose(p);
    if (fit) this.fitWhenOpen(p);
  }

  /**
   * Take a placement off the page, and choose the one that was under it. A
   * frame of a flipbook taken out, the frames after it close up (`ripple`).
   */
  takeOff(p) {
    const i = this.placements.items.indexOf(p);
    const { at = 0, length } = p.block;
    this.placements.remove(p);
    if (length != null) this.ripple((at || 0) + length, -length);
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
    const before = p.block;
    const after = toPlacement(v);
    const renamed = v.ref !== before.ref;
    this.placements.update(p, after);
    if (before.length != null && after.length != null) {
      const was = (before.at || 0) + before.length;
      this.ripple(was, after.at + after.length - was, p);
    }
    if (renamed) this.fitWhenOpen(p);
    this.refresh();
  }

  /**
   * An end moved, so the placements that started at it move with it: a
   * flipbook's frame held longer pushes the frames after it on, one cut
   * shorter pulls them back (time.js `ripple`). Said, when any did.
   */
  ripple(from, by, skip = null) {
    const n = this.placements.ripple(from, by, skip);
    if (n) this.say(`${n} after it moved ${Math.abs(by)} frame${Math.abs(by) === 1 ? '' : 's'} ${by > 0 ? 'later' : 'earlier'}`);
    return n;
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
