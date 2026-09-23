/**
 * stage-dots.js — stage one on screen.
 *
 * v2's first layer: the text, the white grid over it, and a count of the dots
 * opencv found. Here the cut runs on every change rather than on a button
 * pressed twice, and the dots it found are drawn over the picture in v2's
 * particle colour, so you see what the grid did before you keep it.
 *
 * `Make dataset` cuts every entry — every glyph of a range — and saves the
 * result as a `dataset`. Then stage two draws it: the vault is the handover.
 */

import { cut, entriesOf, makeDataset, plotDots } from './dots.js';
import { loadFace }    from './fonts.js';
import { saveDataset } from './save.js';
import { Vault }       from '../../core/vault.js';

const wrap = (i, n) => ((i % n) + n) % n;

export class DotsStage {
  /**
   * @param {object} opts
   * @param {object} opts.params   from dotsParams()
   * @param {HTMLCanvasElement} opts.canvas
   * @param {(text:string)=>void} opts.say
   */
  constructor({ params, canvas, say }) {
    this.params = params;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.say = say;

    this.active = false;
    this.family = null;       // the loaded face's name for ctx.font
    this.image = null;        // for the image input
    this.fromFile = false;    // that image came off disk, not from the vault
    this.entry = 0;           // which entry the preview shows
    this.pending = false;

    params.on(key => this.changed(key));
  }

  async init() {
    this.family = await loadFace(this.params.get('font'));
    await this.loadImage(this.params.get('image'));
  }

  async changed(key) {
    if (key === 'font') this.family = await loadFace(this.params.get('font'));
    if (key === 'image') await this.loadImage(this.params.get('image'));
    if (key === 'input' || key === 'from' || key === 'to') this.entry = 0;
    this.draw();
  }

  async loadImage(id) {
    if (!id) {
      if (!this.fromFile) this.image = null;
      return;
    }
    try {
      const { url } = await Vault.load(id);
      this.image = await createImageBitmap(await (await fetch(url)).blob());
      this.fromFile = false;
    } catch (err) {
      console.warn('[ckt] could not open', id, err);
      this.image = null;
      this.say('could not open that image: ' + err.message);
    }
  }

  /** An image off disk: usable, but a dataset cut from it is a leaf. */
  async openFile(file) {
    if (!file) return;
    // Clear the vault choice first: clearing it after would dispose this file.
    this.params.set('image', null);
    this.image = await createImageBitmap(file);
    this.fromFile = true;
    this.params.set('input', 'image');
    this.draw();
  }

  /** Walk the preview through a range's glyphs — v2's index box. */
  step(by) {
    const n = entriesOf(this.params.values).length;
    this.entry = wrap(this.entry + by, n);
    this.draw();
  }

  draw() {
    if (!this.active || this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => { this.pending = false; this.paint(); });
  }

  paint() {
    const recipe = this.params.values;
    const entries = entriesOf(recipe);
    const i = wrap(this.entry, entries.length);

    const started = performance.now();
    const found = cut(recipe, { family: this.family, image: this.image }, entries[i]);
    const ms = Math.round(performance.now() - started);

    this.canvas.width = found.canvas.width;
    this.canvas.height = found.canvas.height;
    this.ctx.drawImage(found.canvas, 0, 0);
    plotDots(this.ctx, found.points, { color: '#e66465', radius: Math.max(1, recipe.space / 3) });

    const which = entries.length > 1
      ? ` · ${i + 1}/${entries.length} “${entries[i]}” (←→)` : '';
    const why = recipe.input === 'image' && !this.image ? ' · choose an image — V, or open a file'
      : recipe.input !== 'image' && !this.family ? ' · that face would not load' : '';
    this.say(`${found.points.length} dots · threshold ${found.threshold}${which} · ${ms} ms${why}`);
  }

  /**
   * Cut everything and save it.
   *
   * @returns {Promise<?{object: ?object, data: number[][][], title: string}>}
   */
  async make() {
    const recipe = this.params.values;
    const deps = { family: this.family, image: this.image };
    const { data, entries, points } = await makeDataset(recipe, deps,
      (done, total) => this.say(`cutting ${done}/${total}…`));

    if (!points) {
      this.say('no dots to keep — nothing is inked, or the grid covers it all');
      return null;
    }

    this.say('saving…');
    const object = await saveDataset({
      params: this.params, data, entries,
      preview: this.canvas, fromFile: this.fromFile,
    });
    return { object, data, title: object ? object.title : 'unsaved dataset' };
  }
}
