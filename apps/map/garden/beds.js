/**
 * beds.js — the flowers standing in the garden (M14): each thing on the map
 * whose object keeps its marks, opened as a flower (flower.js) and drawn by
 * the garden from its marks — growing from when it was planted, or when the
 * garden opened — at the size the garden is shown, never its saved picture
 * stretched. Every other thing is the map's to draw (../things.js).
 */

import { Vault }   from '../../../core/vault.js';
import { surface } from '../../../core/surface.js';
import { boxOf }   from '../things.js';
import { isFlower, bloomOf, drawGrown } from './flower.js';
import { growthTimes, grownAt } from './growth.js';

const STAGGER_MS = 160;    // the garden opening: each flower comes up a little after the one before

export class Beds {
  /**
   * @param {object} opts
   * @param {object} opts.sprites        flower.js's Sprites
   * @param {() => void} opts.onChange   a flower opened: the garden drawn again
   */
  constructor({ sprites, onChange }) {
    this.sprites = sprites;
    this.onChange = onChange;
    this.opened = new Map();   // id → { object, bloom }, or null for a thing that is no flower
    this.asked = new Set();    // ids opening or opened
    this.grow = new Map();     // a thing on the map (things.js item) → { born, times, seconds, canvas, count }
    this.gone = false;
  }

  /** The flower a block names: `{ object, bloom }` once open, null for none, undefined while it opens. */
  flowerOf(block) { return block.ref ? this.opened.get(block.ref) : null; }

  /** Whether the garden draws a block, not the map: a flower, or one not yet known to be none. */
  claims(block) { return !!block.ref && this.opened.get(block.ref) !== null; }

  /** Things to draw if they are flowers, each grown from `at` — the garden opening, they come up in turn. */
  plant(items, at = performance.now(), stagger = STAGGER_MS) {
    items.forEach((p, i) => this.sow(p, at + i * stagger));
  }

  /** One thing, grown from `at`: just planted, or the garden opened; its flower opened once an id. */
  sow(p, at = performance.now()) {
    if (!p.block.ref) return;
    this.grow.set(p, { born: at, times: null, seconds: 0, canvas: null, count: -1 });
    if (this.asked.has(p.block.ref)) return;
    this.asked.add(p.block.ref);
    this._open(p.block.ref);
  }

  /** A thing out of the garden. */
  forget(p) { this.grow.delete(p); }

  /** Every thing out: another garden opened. Its flowers stay opened, for one standing in both. */
  clear() { this.grow.clear(); }

  async _open(id) {
    try {
      const { object } = await Vault.load(id);
      if (!isFlower(object)) {
        this.opened.set(id, null);
      } else {
        await this.sprites.need(object.recipe.marks);
        this.opened.set(id, { object, bloom: bloomOf(object.recipe) });
      }
    } catch {
      this.opened.set(id, null);
    }
    if (!this.gone) this.onChange();
  }

  /** Whether a flower is still coming up at `now`: the garden goes on drawing. */
  growing(now) {
    for (const [p, g] of this.grow) {
      const o = this.flowerOf(p.block);
      if (o && (!g.times || g.count < o.bloom.marks || now < g.born)) return true;
      if (o === undefined) return true;
    }
    return false;
  }

  /**
   * What the map draws for the flowers among `items` at `now`: `{ image, box,
   * row }` each, back to front as the things are, its picture drawn at `view`
   * canvas pixels per map pixel; one not come up yet, nothing.
   */
  layers(items, m, view, now, seconds) {
    const out = [];
    for (const p of items) {
      const o = this.flowerOf(p.block);
      if (!o) continue;
      let g = this.grow.get(p);
      if (!g) { g = { born: -Infinity, times: null, seconds: 0, canvas: null, count: -1 }; this.grow.set(p, g); }
      if (!g.times || g.seconds !== seconds) {
        g.times = growthTimes(o.object.recipe.marks, seconds);
        g.seconds = seconds;
      }
      const count = grownAt(g.times, (now - g.born) / 1000);
      if (count <= 0) continue;
      const { bloom } = o;
      const box = boxOf(p.block, { width: bloom.width, height: bloom.height }, m.tile);
      const k = Math.max(0.02, Math.min(1, (box.w * view) / Math.max(1, bloom.width)));
      const W = Math.max(1, Math.round(bloom.width * k)), H = Math.max(1, Math.round(bloom.height * k));
      if (!g.canvas || g.canvas.width !== W || g.canvas.height !== H) {
        g.canvas = surface(W, H);
        g.count = -1;
      }
      if (g.count !== count) {
        drawGrown(g.canvas, bloom, this.sprites.images, count, k);
        g.count = count;
      }
      out.push({ image: g.canvas, box, row: p.block.row });
    }
    return out;
  }

  /** Everything let go of: the garden gone. */
  dispose() {
    this.gone = true;
    this.grow.clear();
  }
}
