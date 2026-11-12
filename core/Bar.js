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
 * Since S12 (2026-11-03) it puts the title bar at the page's head —
 * core/shell/titlebar.js, a Lit component, loaded once there is a DOM — and
 * its keys say what the thing under the cursor answers to. Since S8 it puts
 * the viewer's rulers, guides and tools round the app's stage
 * (core/shell/rulers.js), and tells them the picture's size, from `output`.
 *
 * A result — "saved ckt_…" — holds the status line for a few seconds, because
 * a playing loop rewrites that line every frame and would otherwise show a
 * result for one frame. What was said meanwhile shows when the hold ends: an
 * app that says things only when something changes — a still being filtered
 * — would otherwise keep the result on the line for good.
 */

import { dpiOf }   from './formats.js';
import { labelOf } from './frame.js';
import * as Guides from './shell/guides.js';
import { installKeys, bound, letterOf } from './keys.js';
import { installBindings } from './shell/bindings.js';
import { onStep } from './steps.js';
import { bag, held } from './scope.js';
import { zoomable } from './viewzoom.js';

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
   * @param {boolean} [opts.acts]      false: an app that makes nothing — no Save, no Export above it
   * @param {() => void} [opts.redraw] the app's picture drawn again: what its viewer's zoom asks (core/viewzoom.js)
   */
  constructor({ app, mount, keys = '', acts = true, redraw = null }) {
    this._redraw = redraw;
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
    this._held = bag('bar');         // what it hears off its nodes, let go of by `remove` — or its app's unmount (S9)
    this._unheld = held(() => this.remove());
    this._holdUntil = 0;
    this._keysText = keys;
    this.root.dataset.keys = keys;          // the app's own, for a page that lists every key (cluster's Keys, S9f)

    // The title bar: the app, the search, Save and Export (core/shell/titlebar.js).
    if (typeof customElements !== 'undefined' && !mount.querySelector(':scope > skw-titlebar')) {
      const top = document.createElement('skw-titlebar');
      top.setAttribute('app', app);
      if (!acts) top.setAttribute('acts', 'none');
      mount.prepend(top);
      this._top = top;
      import('./shell/titlebar.js').catch(err => console.warn('the title bar did not load:', err.message));
    }
    if (typeof document !== 'undefined') this._held.listen(document, 'pointerover', e => this._hint(e.target), { passive: true });
    this._viewer(app, mount);
    // The left hand (S5b): keys by their place, tapped or held for a pie (core/keys.js, core/shell/bindings.js).
    if (typeof customElements !== 'undefined') {
      installKeys();
      installBindings();
      this._held.hold(onStep(text => this.announce(text)));     // Ctrl Z, Ctrl Y: a step back, a step on (core/steps.js)
      import('./shell/pie.js').catch(err => console.warn('the pies did not load:', err.message));
    }
  }

  /** Off the page, and deaf; the title bar with it, when it put one there. Twice is once. */
  remove() {
    if (this._held.closed) return;
    this._unheld();
    this._held.close();
    clearTimeout(this._release);
    this.root.remove();
    if (this._top) this._top.remove();
  }

  /** The left hand's keys that answer in this page now, by the letters of an AZERTY. */
  _leftHand() {
    const by = new Map();
    for (const k of bound()) { const w = k.short; by.set(w, [...(by.get(w) || []), letterOf(k.code)]); }
    return [...by].map(([w, letters]) => `${letters.join(' ')} ${w}`).join(' · ');
  }

  /** The rulers over the stage's padding, the viewer's tools at the end of its head — a head made if it has none. Its own app's viewer: in a scene, another may be on the page. */
  _viewer(app, mount) {
    const stage = typeof customElements !== 'undefined' && mount.querySelector('.viewer .viewer-stage');
    if (!stage) return;
    Guides.forApp(app);
    this._held.hold(Guides.on('say', text => this.announce(text)));
    if (!stage.querySelector(':scope > skw-rulers')) stage.append(document.createElement('skw-rulers'));
    const viewer = stage.closest('.viewer');
    let head = viewer.querySelector(':scope > .viewer-head');
    if (!head) { head = el('div', 'viewer-head'); viewer.prepend(head); }
    if (!head.querySelector('skw-viewtools')) head.append(document.createElement('skw-viewtools'));
    zoomable(stage, this._redraw);
    import('./shell/rulers.js').catch(err => console.warn('the rulers did not load:', err.message));
    import('./shell/viewtools.js').catch(err => console.warn("the viewer's tools did not load:", err.message));
  }

  /** What the thing under the cursor answers to, in place of the app's keys while it is there. */
  _hint(t) {
    const at = sel => t && t.closest && t.closest(sel);
    const h = at('.pp-row > .pp-mark') ? 'Alt click: its value in every state of the object open'
      : at('.pp-num') ? 'drag: scrub · Shift ×10 · Ctrl ×0.1 · click: type'
      : at('.pp-row--num .pp-label') ? 'Alt click: its slider · Alt held over a drawer: every slider'
      : at('.tp') ? 'drag: scrub · the buttons: first, back, play, on, last'
      : at('.dr-head') ? 'click: open or close'
      : at('skw-titlebar') ? '² or Ctrl K: every control and act, by name'
      : at('skw-rulers .rl') ? 'drag out: a guide · back into a ruler: gone · Ctrl held: no magnet'
      : at('skw-rulers .gd-grip') ? 'drag: move the guide · back into the ruler it came from: gone · Ctrl held: no magnet'
      : at('skw-viewtools') ? 'the zoom: Ctrl wheel, Space or the middle button and drag · the states · the rulers · the magnet · the guides · the ground'
      : at('.viewer') ? `${this._leftHand()} · held: its pie`
      : null;
    this._keys.textContent = h || this._keysText;
  }

  /** The status line — once any result holding it has had its few seconds. */
  say(text) {
    if (performance.now() < this._holdUntil) {
      this._waiting = text;              // shown when the hold ends
      return;
    }
    this._say.textContent = text;
    this._say.classList.remove('bar-say--held');
  }

  /** A result: shown now, and kept for a few seconds against `say`. */
  announce(text) {
    this._say.textContent = text;
    this._say.classList.add('bar-say--held');
    this._holdUntil = performance.now() + HOLD_MS;
    this._waiting = null;
    clearTimeout(this._release);
    this._release = setTimeout(() => {
      this._holdUntil = 0;               // a timer may wake a hair early
      if (this._waiting != null) this.say(this._waiting);
    }, HOLD_MS);
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
    Guides.setDoc(width > 0 ? width / scale : 0, height > 0 ? height / scale : 0);   // the rulers', in the picture's own pixels
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
