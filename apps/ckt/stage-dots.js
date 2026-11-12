/**
 * stage-dots.js — stage one on screen.
 *
 * v2's first layer: the text, the white grid over it, and a count of the dots
 * opencv found. Here the cut runs on every change, and the dots it found are
 * drawn over the picture in v2's particle colour, so you see what the grid did
 * before you keep it.
 *
 * `Make dot-set` cuts every entry — every glyph of a range — and saves the
 * result as a `dataset`, filed in this visit's session folder. Stage two then
 * draws it: the vault is the handover, and the session list keeps it one click
 * away.
 */

import { cut, entriesOf, makeDataset, plotDots, plotThumb } from './dots.js';
import { loadFace }    from './fonts.js';
import { saveDataset } from './save.js';
import { Vault }       from '../../core/vault.js';
import { viewAsIs }    from '../../core/view.js';

const wrap = (i, n) => ((i % n) + n) % n;

export class DotsStage {
  /**
   * @param {object} opts
   * @param {object} opts.params     from dotsParams()
   * @param {object} opts.panel      its ParamPanel, docked
   * @param {HTMLCanvasElement} opts.canvas   the viewer's canvas, shared
   * @param {object} opts.bar        core/Bar.js
   * @param {() => void} opts.make   run "make a dot-set" through the app's busy guard
   */
  constructor({ params, panel, canvas, bar, make }) {
    this.params = params;
    this.panel = panel;
    this.canvas = canvas;
    this.bar = bar;

    this.active = false;
    this.family = null;       // the loaded face's name for ctx.font
    this.image = null;        // for the image input
    this.fromFile = false;    // that image came off disk, not from the vault
    this.entry = 0;           // which entry the preview shows
    this.pending = false;

    this.buildDrawers(make);
    params.on(key => this.changed(key));
  }

  /** The things in the dots panel that are not parameters. */
  buildDrawers(make) {
    const file = document.createElement('input');
    file.type = 'file';
    file.accept = 'image/*';
    file.hidden = true;
    file.addEventListener('change', () => this.openFile(file.files[0]));
    this.panel.drawer('image').body.append(button('Open a file', () => file.click()), file);

    const drawer = this.panel.addDrawer({ id: 'make', title: 'Make', before: 'canvas' });
    const actions = document.createElement('div');
    actions.className = 'pp-actions';
    actions.append(button('Make dot-set  [S]', make, true));
    drawer.body.append(actions);
    this.rangeNote();
  }

  async init() {
    this.family = await loadFace(this.params.get('font'));
    await this.loadImage(this.params.get('image'));
  }

  async changed(key) {
    if (key === 'font') this.family = await loadFace(this.params.get('font'));
    if (key === 'image') await this.loadImage(this.params.get('image'));
    if (key === 'input' || key === 'from' || key === 'to') { this.entry = 0; this.rangeNote(); }
    this.draw();
  }

  /** What a glyph range will cut, in characters: "A–z · 58". */
  rangeNote() {
    const r = this.params.values;
    const n = Math.max(0, r.to - r.from);
    const drawer = this.panel.drawer('range');
    if (drawer) drawer.note(n ? `${String.fromCodePoint(r.from)}–${String.fromCodePoint(r.to - 1)} · ${n}` : 'empty');
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
      this.bar.announce('could not open that image: ' + err.message);
    }
  }

  /** An image off disk: usable, but a dot-set cut from it is a leaf. */
  async openFile(file) {
    if (!file) return;
    // Clear the vault choice first: clearing it after would dispose this file.
    this.params.set('image', null);
    this.image = await createImageBitmap(file);
    this.fromFile = true;
    this.params.set('input', 'image');
    this.draw();
  }

  /** Walk the preview through a range's glyphs — v2's index box, now ↑ ↓. */
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

    if (this.canvas.width !== found.canvas.width) this.canvas.width = found.canvas.width;
    if (this.canvas.height !== found.canvas.height) this.canvas.height = found.canvas.height;
    viewAsIs(this.canvas, found.canvas);                 // the viewer's zoom (S14a): drawn in its own pixels, sized by CSS
    const ctx = this.canvas.getContext('2d');
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.drawImage(found.canvas, 0, 0);
    plotDots(ctx, found.points, { color: '#e66465', radius: Math.max(1, recipe.space / 3) });
    this.lastPoints = found.points.length;

    const which = entries.length > 1 ? ` · ${i + 1}/${entries.length} “${entries[i]}” (↑ ↓)` : '';
    const why = recipe.input === 'image' && !this.image ? ' · choose an image, or open a file'
      : recipe.input !== 'image' && !this.family ? ' · that face would not load' : '';
    this.bar.output({ width: this.canvas.width, height: this.canvas.height });
    this.bar.say(`${found.points.length} dots · threshold ${found.threshold}${which} · ${ms} ms${why}`);
  }

  /**
   * Cut everything and save it into this visit's folder.
   *
   * @param {string} folder   the session's `folder:` tag
   * @returns {Promise<?{object: ?object, data: Array, title: string, thumb: ?string}>}
   */
  async make(folder) {
    const recipe = this.params.values;
    const deps = { family: this.family, image: this.image };
    const { data, entries, points } = await makeDataset(recipe, deps,
      (done, total) => this.bar.say(`cutting ${done}/${total}…`));

    if (!points) {
      this.bar.announce('no dots to keep — nothing is inked, or the grid covers it all');
      return null;
    }

    this.bar.say('saving…');
    const preview = plotThumb(data[0]);
    const object = await saveDataset({ params: this.params, data, entries, preview, fromFile: this.fromFile, folder });
    return { object, data, title: object ? object.title : describe(recipe, entries), thumb: thumbUrl(preview) };
  }
}

function describe(recipe, entries) {
  return recipe.input === 'glyphs' ? `${entries[0]}–${entries[entries.length - 1]}`
       : recipe.input === 'image' ? 'image' : JSON.stringify(String(recipe.text).slice(0, 20));
}

/** The thumbnail as a URL an <img> can show, for the session list. */
function thumbUrl(source) {
  const c = document.createElement('canvas');
  c.width = 72;
  c.height = 72;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, 72, 72);
  return c.toDataURL('image/png');
}

function button(label, onClick, primary = false) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'nb-btn nb-btn--wide' + (primary ? ' nb-btn--primary' : '');
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}
