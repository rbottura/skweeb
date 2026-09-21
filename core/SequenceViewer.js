/**
 * SequenceViewer.js — play a sequence object back.
 *
 * Until now a sequence in the vault was a single PNG and there was no way to
 * see the loop it stands for. This rebuilds it from the recipe and drives the
 * playhead, which is possible at all because the stage moved into `core/`.
 *
 * It is not a video player and does not pretend to be: there is no file to
 * play. Every frame is drawn on demand by replaying marks, so scrubbing
 * backwards costs a rebuild of that window and a long loop is not seekable for
 * free. `docs/roadmap.md` still has webm as an open decision, and this is what
 * the gallery uses until that is settled.
 *
 * Timing is accumulated against the clock rather than one frame per animation
 * frame: a 60fps loop on a 120Hz screen would otherwise play at double speed,
 * and a 12fps one would play five times too fast.
 */

import { openSequence } from './rebuild.js';

const el = (tag, cls, text) => {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
};

export class SequenceViewer {
  /**
   * @param {object} object   a vault envelope of type `sequence`
   * @param {object} [opts]
   * @param {boolean} [opts.autoplay=true]
   */
  constructor(object, opts = {}) {
    this._object = object;
    this._autoplay = opts.autoplay !== false;
    this._seq = null;
    this._tick = 0;
    this._playing = false;
    this._raf = 0;
    this._last = 0;
    this._carry = 0;

    this._build();
  }

  /** The element to put in a page. Contents fill in once the rebuild lands. */
  get node() { return this._root; }

  _build() {
    this._root = el('div', 'sv');

    this._canvas = el('canvas', 'sv-canvas');
    this._ctx = this._canvas.getContext('2d');
    this._root.append(this._canvas);

    const bar = el('div', 'sv-bar');

    this._playBtn = el('button', 'sv-btn', '▶');
    this._playBtn.title = 'Play / pause';
    this._playBtn.addEventListener('click', () => this.toggle());

    this._scrub = el('input', 'sv-scrub');
    this._scrub.type = 'range';
    this._scrub.min = 0;
    this._scrub.max = 1;
    this._scrub.value = 0;
    this._scrub.disabled = true;
    this._scrub.addEventListener('input', () => {
      this.pause();
      this._show(Number(this._scrub.value));
    });

    this._count = el('span', 'sv-count', '…');

    bar.append(this._playBtn, this._scrub, this._count);
    this._root.append(bar);

    this._note = el('div', 'sv-note', 'rebuilding from the recipe…');
    this._root.append(this._note);
  }

  /** Rebuild and, unless told otherwise, start playing. */
  async start() {
    try {
      this._seq = await openSequence(this._object);
    } catch (err) {
      this._note.textContent = String(err.message || err);
      this._note.classList.add('sv-note--bad');
      return null;
    }

    this._canvas.width = this._seq.width;
    this._canvas.height = this._seq.height;

    this._scrub.max = Math.max(0, this._seq.length - 1);
    this._scrub.disabled = false;

    // A family the registry cannot resolve draws nothing, so the loop comes
    // back missing marks with no other sign that anything is wrong.
    if (this._seq.missing && this._seq.missing.length) {
      this._note.textContent = 'not drawing: ' + this._seq.missing.join(', ')
        + ' — those sprite families are not on this machine';
      this._note.classList.add('sv-note--bad');
    } else {
      this._note.remove();
    }

    this._show(0);
    if (this._autoplay) this.play();
    return this._seq;
  }

  // ── Transport ──────────────────────────────────────────────────────────────

  play() {
    if (this._playing || !this._seq || !this._seq.length) return;
    this._playing = true;
    this._playBtn.textContent = '❙❙';
    this._last = performance.now();
    this._carry = 0;
    this._raf = requestAnimationFrame(t => this._advance(t));
  }

  pause() {
    this._playing = false;
    this._playBtn.textContent = '▶';
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  toggle() { this._playing ? this.pause() : this.play(); }

  _advance(now) {
    if (!this._playing) return;

    // Whole ticks only, with the remainder carried, so playback keeps the
    // object's own frame rate whatever the display is running at.
    const elapsed = now - this._last;
    this._last = now;
    this._carry += (elapsed / 1000) * this._seq.fps;

    const steps = Math.floor(this._carry);
    if (steps > 0) {
      this._carry -= steps;
      const next = this._tick + steps;
      if (!this._seq.loop && next >= this._seq.length) {
        this._show(this._seq.length - 1);
        return this.pause();
      }
      this._show(next % this._seq.length);
    }

    this._raf = requestAnimationFrame(t => this._advance(t));
  }

  _show(tick) {
    this._tick = tick;
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._seq.drawInto(this._ctx, tick, this._canvas.width, this._canvas.height);
    this._scrub.value = tick;
    this._count.textContent = (tick + 1) + ' / ' + this._seq.length;
  }

  dispose() {
    this.pause();
    if (this._seq) this._seq.dispose();
    this._seq = null;
    this._root.remove();
  }
}
