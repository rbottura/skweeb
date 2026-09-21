/**
 * joyImage.js
 * JoyImage — the brush cursor the gamepad drives, and the five symmetry
 * patterns it stamps in.
 *
 * The geometry itself is core/stamp.js: the sequence player expands the same
 * patterns from recorded state, so the two share one implementation. This file
 * is only the live cursor.
 */

import { stampPoints } from '../../../core/stamp.js';

export { PATTERNS, PATTERN_LABELS, stampPoints } from '../../../core/stamp.js';


export class JoyImage {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} scale
   * @param {p5.Image} img
   * @param {p5.Graphics} target — the offscreen canvas brushes are stamped onto
   * @param {number} canvasW
   * @param {number} canvasH
   */
  constructor(x, y, scale, img, target, canvasW, canvasH) {
    this.x = x;
    this.y = y;
    this.scale = scale;
    this.img = img;

    this.rotation = 0;
    this.pattern = PATTERNS[0]; // 'single'

    /**
     * Optional observer, called with this JoyImage after every stamp. Set by
     * the sketch so the sequence recorder sees marks from all three stamp
     * paths — gamepad, keyboard and p5.joystick — through one hook.
     * @type {?(joy: JoyImage) => void}
     */
    this.onStamp = null;

    this._target = target;
    this._cW = canvasW;
    this._cH = canvasH;
  }

  /** Update the offscreen canvas reference (needed after resize). */
  setTarget(target, w, h) {
    this._target = target;
    this._cW = w;
    this._cH = h;
  }

  setPattern(p) { this.pattern = p; }
  nextPattern() {
    const i = PATTERNS.indexOf(this.pattern);
    this.pattern = PATTERNS[(i + 1) % PATTERNS.length];
  }

  /**
   * Stamp the current brush image onto the offscreen canvas
   * at all positions defined by the current pattern.
   */
  stamp() {
    const pts = this._getStampPoints();
    for (const [px, py, rot, scaleX] of pts) {
      this._drawTo(this._target, px, py, rot, scaleX);
    }
    this.onStamp?.(this);
  }

  /**
   * Show the live (moving) cursor on the main p5 canvas.
   * @param {p5} p
   */
  show(p) {
    const pts = this._getStampPoints();
    for (const [px, py, rot, scaleX] of pts) {
      p.push();
      p.translate(px, py);
      p.rotate(rot);
      p.scale(this.scale * scaleX, this.scale);
      p.imageMode(p.CENTER);
      p.image(this.img, 0, 0);
      p.pop();
    }
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  /** @see stampPoints */
  _getStampPoints() {
    return stampPoints(this.x, this.y, this.rotation, this.pattern, this._cW, this._cH);
  }

  _drawTo(gfx, px, py, rot, scaleX) {
    gfx.push();
    gfx.translate(px, py);
    gfx.rotate(rot);
    gfx.scale(this.scale * scaleX, this.scale);
    gfx.imageMode(gfx.CENTER);
    gfx.image(this.img, 0, 0);
    gfx.pop();
  }
}
