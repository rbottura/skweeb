/**
 * joyImage.js
 * JoyImage — the brush cursor the gamepad drives, and the five symmetry
 * patterns it stamps in.
 *
 * The geometry itself is core/stamp.js: the sequence player expands the same
 * patterns from recorded state, so the two share one implementation. This file
 * is only the live cursor.
 */

// Imported AND re-exported, and the two lines are not redundant. A bare
// `export … from` forwards a name to importers without binding it in this
// module, so the class below — which reads PATTERNS three times — would throw
// ReferenceError the moment one was constructed. It did: the patterns moved to
// core/stamp.js in 45ca7be and the local uses were left pointing at nothing.
// Nothing caught it because the module still *loads* perfectly; it only fails
// once a brush is selected and a JoyImage is built.
import { PATTERNS, PATTERN_LABELS, stampPoints } from '../../../core/stamp.js';

export { PATTERNS, PATTERN_LABELS, stampPoints };


export class JoyImage {
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} scale
   * @param {CanvasImageSource} img   the sprite, decoded (core/registry.js)
   * @param {CanvasRenderingContext2D} target — the ink's context, brushes stamped onto it
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
     * the sketch so the sequence recorder sees marks from every stamp
     * path — the pad and the keyboard — through one hook.
     * @type {?(joy: JoyImage) => void}
     */
    this.onStamp = null;

    this._target = target;
    this._cW = canvasW;
    this._cH = canvasH;
  }

  /** Update the ink's context (needed after resize). */
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
   * Show the live (moving) cursor on the page's canvas.
   * @param {CanvasRenderingContext2D} ctx
   */
  show(ctx) {
    for (const [px, py, rot, scaleX] of this._getStampPoints()) this._drawTo(ctx, px, py, rot, scaleX);
  }

  // ─── Internal ─────────────────────────────────────────────────────────────

  /** @see stampPoints */
  _getStampPoints() {
    return stampPoints(this.x, this.y, this.rotation, this.pattern, this._cW, this._cH);
  }

  /** One stamp on `ctx`: the sprite about its middle, turned and scaled — as the player draws a mark (core/stage/player.js). */
  _drawTo(ctx, px, py, rot, scaleX) {
    if (!ctx || !this.img) return;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(rot);
    ctx.scale(this.scale * scaleX, this.scale);
    ctx.drawImage(this.img, -this.img.width / 2, -this.img.height / 2);
    ctx.restore();
  }
}
