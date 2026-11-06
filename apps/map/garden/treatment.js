/**
 * treatment.js — what the gardener carries (M14): a chain of modifiers, a
 * card each in the order they act (core/Cards.js, drawn from modifiers.js's
 * schemas — rule 1), and beside it the flower faced as the chain would make
 * it, growing again and again, before E plants it. The chain stays in hand
 * from one flower to the next: one treatment, given to many.
 */

import { Cards }     from '../../../core/Cards.js';
import { CATALOGUE } from './modifiers.js';
import { nextOf, bloomOf, drawGrown } from './flower.js';
import { growthTimes, grownAt } from './growth.js';

const HOLD = 1.2;          // seconds a grown flower stays shown before it grows again

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

export class Treatment {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.cards     where the cards and their menu go
   * @param {HTMLElement} opts.preview   where the flower faced shows
   * @param {object} opts.sprites        flower.js's Sprites
   * @param {() => void} opts.onChange   the chain changed
   */
  constructor({ cards, preview, sprites, onChange }) {
    this.sprites = sprites;
    this.list = new Cards({
      mount: cards, catalogue: CATALOGUE, app: 'garden-modifier', order: true, fold: true,
      words: { add: 'add a modifier…', empty: 'No modifier yet: E plants the flower faced again, as it is.' },
      onChange: () => { onChange(); this._again(); },
    });
    this.canvas = el('canvas', 'gd-preview');
    this.canvas.width = this.canvas.height = 1;
    this.line = el('p', 'gd-line', 'Face a flower: it shows here as the treatment would make it.');
    preview.append(this.canvas, this.line);
    this.source = null;        // the flower faced, its envelope
    this.seed = 0;
    this.seconds = 3;
    this.drawing = null;       // what the chain makes of it: { recipe, bloom, times }
    this.asked = 0;
    this.t0 = 0;
    this.shown = -1;           // the marks drawn in the preview now
  }

  /** The chain as a recipe keeps it: `[{ id, params, on }]`. */
  get chain() { return this.list.recipe(); }

  /** A chain given back: a garden reopened. */
  restore(chain) { this.list.restore(chain || []); }

  /** The flower faced — or none — under the treatment, with this seed, growing in this many seconds. */
  show(source, { seed, seconds }) {
    if (source === this.source && seed === this.seed && seconds === this.seconds) return;
    this.source = source;
    this.seed = seed;
    this.seconds = seconds;
    this._again();
  }

  async _again() {
    const ask = ++this.asked;
    const source = this.source;
    if (!source) {
      this.drawing = null;
      this.line.textContent = 'Face a flower: it shows here as the treatment would make it.';
      this.shown = -1;
      return;
    }
    try {
      const recipe = await nextOf(source, this.chain, this.seed, this.sprites);
      if (ask !== this.asked) return;
      this.drawing = recipe ? { recipe, bloom: bloomOf(recipe), times: growthTimes(recipe.marks, this.seconds) } : null;
      this.t0 = performance.now();
      this.shown = -1;
      const n = source.recipe.marks.length;
      this.line.textContent = recipe ? `${source.title || source.id} — ${n} marks → ${recipe.marks.length}`
        : `${source.title || source.id} — nothing left of it: the treatment thins it all out.`;
    } catch (err) {
      if (ask === this.asked) this.line.textContent = 'The treatment failed: ' + err.message;
    }
  }

  /** The preview at `now`: growing, held grown a moment, growing again. */
  tick(now) {
    const d = this.drawing;
    if (!d || !this.canvas.isConnected) return;
    const total = (d.times.length ? d.times[d.times.length - 1] : 0) + HOLD;
    const count = grownAt(d.times, ((now - this.t0) / 1000) % total);
    const box = Math.max(80, this.canvas.parentElement.clientWidth || 240), dpr = window.devicePixelRatio || 1;
    const k = Math.min((box * dpr) / d.bloom.width, (box * dpr) / d.bloom.height, 1);
    const W = Math.max(1, Math.round(d.bloom.width * k)), H = Math.max(1, Math.round(d.bloom.height * k));
    if (this.canvas.width !== W || this.canvas.height !== H) {
      this.canvas.width = W;
      this.canvas.height = H;
      this.canvas.style.width = `${Math.round(W / dpr)}px`;
      this.shown = -1;
    }
    if (count === this.shown) return;
    drawGrown(this.canvas, d.bloom, this.sprites.images, count, k);
    this.shown = count;
  }
}
