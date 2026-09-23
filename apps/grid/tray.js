/**
 * tray.js — the members of a material while it is being made.
 *
 * An ordered list of up to CAP tiles, light to dark. While `auto` is on the
 * tray keeps itself sorted by tone (tone.js) — add a sprite and it lands where
 * its darkness puts it. The measure is a guess about how an eye reads a tile,
 * so it is overridable: move one by hand and `auto` goes off, and the order is
 * yours until you ask for the sort again.
 *
 * No DOM and no canvas: an item arrives with its `tone` already measured.
 */

/** Members a material may have — twelve, decided 2026-09-23. */
export const CAP = 12;

/**
 * @typedef {object} TrayItem
 * @property {string} key    unique: 'disk:<family>:<index>' or 'vault:<id>'
 * @property {string} label
 * @property {number} tone   0 black … 1 white, over the ground it was measured on
 */

export class Tray {
  constructor() {
    /** @type {TrayItem[]} */
    this.items = [];
    this.auto = true;
  }

  get full() { return this.items.length >= CAP; }
  has(key) { return this.items.some(i => i.key === key); }

  /** Add one. False when it is already in, or the tray is full. */
  add(item) {
    if (this.full || this.has(item.key)) return false;
    this.items.push(item);
    if (this.auto) this.sort();
    return true;
  }

  remove(key) {
    const before = this.items.length;
    this.items = this.items.filter(i => i.key !== key);
    return this.items.length !== before;
  }

  /** Nudge one along the ramp by hand. Hand order wins: the auto sort stops. */
  move(key, by) {
    const i = this.items.findIndex(t => t.key === key);
    const j = i + by;
    if (i < 0 || j < 0 || j >= this.items.length) return false;
    [this.items[i], this.items[j]] = [this.items[j], this.items[i]];
    this.auto = false;
    return true;
  }

  /** Light to dark — the order map.js reads a ramp in. Stable, so ties keep their place. */
  sort() {
    this.items = this.items
      .map((item, i) => ({ item, i }))
      .sort((a, b) => (b.item.tone - a.item.tone) || (a.i - b.i))
      .map(x => x.item);
  }

  /** Turn the auto sort back on, which sorts at once. */
  resort() {
    this.auto = true;
    this.sort();
  }

  /** New tones — the ground changed. Sorted again only while the order is the sort's. */
  retone(toneOf) {
    for (const item of this.items) item.tone = toneOf(item);
    if (this.auto) this.sort();
  }

  clear() {
    this.items = [];
    this.auto = true;
  }
}
