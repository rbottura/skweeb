/**
 * Bar.js — the strip under every app. Information only.
 *
 * Decided 2026-09-23: the bar says what you will get and how to drive the
 * app, and does nothing. It shows the app, a status line, the output size in
 * pixels with its density — and, on a paper format, the print resolution that
 * makes — the vault, and a few keys. The buttons that used to crowd it live in
 * the panels now, in drawers.
 *
 * It is a row of the page grid (theme.css `.app`), not an overlay, so it can
 * never cover the canvas or a panel.
 *
 * A result — "saved ckt_…" — holds the status line for a few seconds, because
 * a playing loop rewrites that line every frame and would otherwise show a
 * result for one frame.
 */

import { dpiOf }   from './formats.js';
import { labelOf } from './frame.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

const HOLD_MS = 3000;

export class Bar {
  /**
   * @param {object} opts
   * @param {string} opts.app          the app's name
   * @param {HTMLElement} opts.mount   the page grid (`.app`)
   * @param {string} [opts.keys]       the few shortcuts worth showing
   */
  constructor({ app, mount, keys = '' }) {
    this.root = el('footer', 'bar');
    this._say = el('span', 'bar-say', 'loading…');
    this._fps = el('span', 'bar-dim');
    this._out = el('span', 'bar-out');
    this._print = el('span', 'bar-dim');
    this._vault = el('span', 'bar-dim', 'vault…');
    this._keys = el('span', 'bar-dim bar-keys', keys);

    this.root.append(
      el('span', 'bar-name', app), this._say,
      this._fps, this._out, this._print,
      el('span', 'bar-sep', '·'), this._vault,
      el('span', 'bar-sep bar-keys', '·'), this._keys,
    );
    mount.append(this.root);
    this._holdUntil = 0;
  }

  /** The status line, unless a result is holding it. */
  say(text) {
    if (performance.now() < this._holdUntil) return;
    this._say.textContent = text;
    this._say.classList.remove('bar-say--held');
  }

  /** A result: shown now, and kept for a few seconds against `say`. */
  announce(text) {
    this._say.textContent = text;
    this._say.classList.add('bar-say--held');
    this._holdUntil = performance.now() + HOLD_MS;
  }

  /**
   * What the output will be.
   *
   * @param {object} o
   * @param {number} o.width     the output's pixels, scale included
   * @param {number} o.height
   * @param {number} [o.scale]   the canvas multiplier those came from
   * @param {string} [o.format]  the frame format id, for the print resolution
   */
  output({ width, height, scale = 1, format }) {
    if (!(width > 0) || !(height > 0)) { this._out.textContent = ''; this._print.textContent = ''; return; }
    this._out.textContent = `${width} × ${height} px` + (scale !== 1 ? ` · ${scale}×` : '');
    const dpi = format && dpiOf(format, width, height);
    this._print.textContent = dpi
      ? `· ${Math.round(dpi.min)} dpi on ${labelOf(format)}` : '';
  }

  vault(text) { this._vault.textContent = text; }

  /** Frames actually painted in the last second while a loop plays; null hides it. */
  rate(fps) { this._fps.textContent = fps == null ? '' : `${Math.round(fps)} fps ·`; }
}
