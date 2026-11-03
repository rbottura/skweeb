/**
 * SequenceViewer.js — play a sequence object back.
 *
 * Until now a sequence in the vault was a single PNG and there was no way to
 * see the loop it stands for. This rebuilds it from the recipe and drives the
 * playhead, which is possible at all because the stage moved into `core/`.
 *
 * It is not a video player and does not pretend to be: there is no file to
 * play. Every frame is drawn on demand, so scrubbing backwards costs a rebuild
 * of that window and a long loop is not seekable for free. There will be no
 * webm to play instead: video is frames plus ffmpeg, decided 2026-09-22
 * (`docs/decisions.md`), so this is what "play the loop" means.
 *
 * What it plays is whatever `openSequence()` hands back, which is no longer
 * only a recording of marks: a grid sequence rebuilds its parent and re-runs
 * the dither over every frame. Nothing here changes for that, which is the
 * point of the handle being one shape.
 *
 * Timing lives in core/playback.js, shared with grid rather than written twice.
 */

import { openSequence } from './rebuild.js';
import { Playhead }     from './playback.js';

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

    this._playhead = new Playhead({
      onShow: tick => this._show(tick),
      onState: () => { this._playBtn.textContent = this._playhead.playing ? '❙❙' : '▶'; },
    });

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
      this._playhead.pause();
      this._playhead.show(Number(this._scrub.value));
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
      // A project — a smart object since S6b — plays as the object it binds.
      const o = this._object.type === 'skw' ? (await import('./smart.js')).unwrap(this._object) : this._object;
      this._seq = await openSequence(o);
    } catch (err) {
      this._note.textContent = String(err.message || err);
      this._note.classList.add('sv-note--bad');
      return null;
    }

    this._canvas.width = this._seq.width;
    this._canvas.height = this._seq.height;

    this._playhead.configure({
      fps: this._seq.fps,
      length: this._seq.length,
      loop: this._seq.loop,
    });

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

    this._playhead.show(0);
    if (this._autoplay) this.play();
    return this._seq;
  }

  // ── Transport ──────────────────────────────────────────────────────────────

  play()   { this._playhead.play(); }
  pause()  { this._playhead.pause(); }
  toggle() { this._playhead.toggle(); }

  _show(tick) {
    this._ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);
    this._seq.drawInto(this._ctx, tick, this._canvas.width, this._canvas.height);
    this._scrub.value = tick;
    this._count.textContent = (tick + 1) + ' / ' + this._seq.length;
  }

  dispose() {
    this._playhead.dispose();
    if (this._seq) this._seq.dispose();
    this._seq = null;
    this._root.remove();
  }
}
