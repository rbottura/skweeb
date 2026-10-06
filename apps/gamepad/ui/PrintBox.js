/**
 * PrintBox.js — the drawing on the canvas, printed: at a sheet's size and a
 * dpi, drawn again from its marks a tile at a time (core/PrintPanel.js,
 * core/stage/still.js). E opens and closes it.
 *
 * What it prints is what S would save: the canvas framed as a save frames it
 * (core/stillFrame.js), with the save's recipe (core/vaultBridge.js), made
 * into an envelope and never saved — a print is a file for a printer. With
 * an image loaded under the ink there are no marks to draw it again from,
 * and it says so.
 *
 * A mouse's and a keyboard's, not the pad's: a print is chosen once, sat
 * down. Keys typed in it stay in it, so a dpi typed is never a stamp.
 */

import * as Sketch        from '../sketch/gamepadSketch.js';
import * as StillFrame    from '../core/stillFrame.js';
import { recipeNow, APP } from '../core/vaultBridge.js';
import { PrintPanel }     from '../../../core/PrintPanel.js';

export class PrintBox {
  constructor() {
    this._busy = false;
    this._el = document.createElement('div');
    this._el.className = 'hud-panel gp-print';
    this._el.setAttribute('aria-label', 'Print');
    this._el.innerHTML = `
      <div class="hud-panel__header">
        <span class="hud-panel__title">PRINT</span>
        <span class="hud-hint">E = close</span>
      </div>
      <div class="gp-print__body"></div>
      <p class="gp-print__say" aria-live="polite"></p>
    `;
    this._say = this._el.querySelector('.gp-print__say');
    this._el.addEventListener('keydown', e => e.stopPropagation());
    document.body.appendChild(this._el);

    this.printing = new PrintPanel({
      mount: this._el.querySelector('.gp-print__body'),
      app: 'gamepad',
      object: () => this._envelope(),
      leave: action => this._leave(action),
      say: text => { this._say.textContent = text; },
    });
  }

  toggle() {
    this._el.classList.toggle('hud-panel--visible');
  }

  /** The canvas as a save would write it, unsaved — or why there is nothing to print. */
  _envelope() {
    if (!Sketch.canvasIsReproducible()) return 'an image is under the ink — no marks to draw it again from';
    const p = Sketch.p5Instance(), canvas = Sketch.getOverlayCanvas();
    if (!p || !canvas) return null;
    // The overlay as stillFrame.js reads it: the sketch's size, the canvas's own context.
    const frame = StillFrame.frameFor({ width: p.width, height: p.height, drawingContext: canvas.getContext('2d') }, Sketch.params);
    const recipe = recipeNow(Sketch, frame);
    if (!recipe || !recipe.marks.length) return 'nothing drawn yet';
    return { type: 'still', origin: APP, recipe, render: { w: frame.width, h: frame.height } };
  }

  /** One print at a time, and what happened said. */
  async _leave(action) {
    if (this._busy) return;
    this._busy = true;
    try {
      this._say.textContent = await action();
    } catch (err) {
      console.error('[print] failed:', err);
      this._say.textContent = 'failed: ' + err.message;
    } finally {
      this._busy = false;
    }
  }
}
