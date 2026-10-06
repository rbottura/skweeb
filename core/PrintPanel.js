/**
 * PrintPanel.js — a print, from any app's Export drawer: the sheet, the dpi,
 * the paper, what it comes to, and the button (core/print.js).
 *
 * Its rows are a schema of their own — rule 1 — and never the app's recipe:
 * a print is a file for a printer, and the object saves as it always did.
 * The sheet is one of the print formats (core/formats.js), the app's own
 * format when that is one, so a picture made for the sheet fills it; any
 * other picture is fitted whole on it, centred, the paper round it. What is
 * printed is what is on screen, made into an envelope by the app — the
 * object a save would write — and drawn again by the app at the sheet's
 * size, a window at a time.
 *
 * DOM and params; core/param-panel.css draws `.pp-print-note`.
 */

import { defineParams } from './params.js';
import { ParamPanel }   from './ParamPanel.js';
import { FORMATS, pixelsAtDpi } from './formats.js';
import { printObject, tilesOf } from './print.js';
import { download }     from './export.js';

const SHEETS = FORMATS.filter(f => f.mm);

/** The print's own rows. */
export const PRINT_PARAMS = {
  sheet: { type: 'enum', options: SHEETS.map(f => f.id), default: '120x176', display: 'chips',
           labels: Object.fromEntries(SHEETS.map(f => [f.id, f.label])), label: 'sheet' },
  dpi: { type: 'int', min: 50, max: 600, default: 300, label: 'dpi' },
  paper: { type: 'ground', default: '#ffffff', label: 'paper' },
};

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

export class PrintPanel {
  /**
   * @param {object} opts
   * @param {HTMLElement} opts.mount        where it goes: an Export drawer's body
   * @param {string} opts.app               the app's name, for its rows and the file's
   * @param {() => (object|string|null|Promise<object|string|null>)} opts.object   what is on screen, as an
   *        envelope — or, where there is none, why: said as it is
   * @param {(action: () => Promise<string>) => Promise} opts.leave  the app's one way out: busy, then what happened said
   * @param {(text: string) => void} opts.say          the bar's line, for how far it has got
   * @param {?string} [opts.format]         the app's format now, if it has one
   * @param {() => number} [opts.tick]      the frame on screen
   */
  constructor({ mount, app, object, leave, say, format = null, tick = () => 0 }) {
    this.app = app;
    this.object = object;
    this.leave = leave;
    this.say = say;
    this.tick = tick;
    this.params = defineParams(app + '-print', PRINT_PARAMS);
    new ParamPanel(this.params, { title: 'print', mount });
    this.note = el('p', 'pp-print-note');
    this.button = el('button', 'nb-btn nb-btn--wide pp-print', 'Print it — a PNG at the sheet\'s size');
    this.button.type = 'button';
    this.button.addEventListener('click', () => this.print());
    mount.append(this.note, this.button);
    this.params.on(() => this.paint());
    this.follow(format);
    this.paint();
  }

  /** The app's format changed: a print format becomes the sheet. */
  follow(format) {
    if (format && SHEETS.some(f => f.id === format) && this.params.get('sheet') !== format) this.params.set('sheet', format);
  }

  /** The sheet's pixels at the dpi, as [w, h]. */
  get pixels() {
    const { sheet, dpi } = this.params.values;
    return pixelsAtDpi(sheet, dpi);
  }

  paint() {
    const px = this.pixels;
    const label = (SHEETS.find(f => f.id === this.params.get('sheet')) || {}).label || '';
    this.note.textContent = `${label} at ${this.params.get('dpi')} dpi: ${px[0]} × ${px[1]} px, drawn in ${tilesOf(px)} tiles`;
  }

  /** What is on screen, printed. */
  print() {
    return this.leave(async () => {
      const object = await this.object();
      if (!object || typeof object === 'string') return object || 'nothing to print';
      const { sheet, dpi, paper } = this.params.values;
      const px = this.pixels;
      const started = performance.now();
      const out = await printObject(object, { sheet: px, dpi, paper: paper === 'none' ? null : paper, tick: this.tick(),
                                              onTile: (i, n) => this.say(`printing… tile ${i} of ${n}`) });
      download(out.blob, `${this.app}_${sheet}_${dpi}dpi_${px[0]}x${px[1]}.png`);
      const enlarged = out.enlarged > 1.01 ? ` — enlarged ${out.enlarged.toFixed(1)}× from pixels that cannot be drawn finer` : '';
      return `printed ${px[0]} × ${px[1]} px at ${dpi} dpi — ${(out.blob.size / 1e6).toFixed(1)} MB `
        + `in ${Math.round((performance.now() - started) / 1000)} s${enlarged}`;
    });
  }
}
