/**
 * playback.js — the clock that walks a loop.
 *
 * Two things now play a sequence back: the vault's SequenceViewer and grid,
 * showing the dither move. Neither of them has a file to play — every frame is
 * drawn on demand — so both need the same small piece of timing, and it is the
 * kind of piece that is subtly wrong in two different ways if it is written
 * twice.
 *
 * What it gets right: time is accumulated against the clock and spent in whole
 * ticks, with the remainder carried. One tick per animation frame would play a
 * 60fps loop at double speed on a 120Hz screen and a 12fps loop five times too
 * fast. It also means that when a frame costs more than its share of time —
 * and a re-dither of a 320x157 field costs plenty — playback drops ticks and
 * keeps real time, rather than running the loop in slow motion.
 *
 * It owns the tick and nothing else. It draws nothing, holds no canvas and
 * knows nothing about what a frame is; `onShow` is called with an index and
 * the caller decides what that means.
 *
 * `smooth` is for a caller that can draw between ticks — ckt, whose motion is
 * closed-form, so tick 12.4 is as exact as tick 12. It is then called on
 * every animation frame while playing, with the whole tick and the exact
 * position `at`, fractional; the loop keeps its `fps` and its frame count, and
 * only the preview gets the screen's own rate. A 30fps loop shown in whole
 * ticks on a 60Hz screen holds each one for one refresh or two or three, as
 * the timing falls, and a steady turn reads as a stutter.
 */

export class Playhead {
  /**
   * @param {object} opts
   * @param {(tick:number)=>void} opts.onShow  called with every tick to display
   * @param {number} [opts.fps=30]
   * @param {number} [opts.length=0]   ticks in one complete loop
   * @param {boolean} [opts.loop=true] at the end: wrap, or stop on the last
   * @param {()=>void} [opts.onState]  called whenever playing/paused changes
   * @param {boolean} [opts.smooth=false]  onShow(tick, at) on every animation frame
   */
  constructor({ onShow, fps = 30, length = 0, loop = true, onState, smooth = false } = {}) {
    this._onShow = onShow || (() => {});
    this._onState = onState || (() => {});
    this._fps = fps;
    this._length = length;
    this._loop = loop;
    this._smooth = smooth;

    this._tick = 0;
    this._playing = false;
    this._raf = 0;
    this._last = 0;
    this._carry = 0;
  }

  get tick()    { return this._tick; }
  get length()  { return this._length; }
  get fps()     { return this._fps; }
  get playing() { return this._playing; }

  /**
   * Point at a different loop. Pauses, because whatever was playing is gone —
   * a tick index means nothing once the thing it indexes has been replaced.
   */
  configure({ fps, length, loop } = {}) {
    this.pause();
    if (typeof fps === 'number')     this._fps = fps;
    if (typeof length === 'number')  this._length = length;
    if (typeof loop === 'boolean')   this._loop = loop;
    this._tick = 0;
    this._carry = 0;
    return this;
  }

  /** Show one tick, clamped into the loop. Does not change play state. */
  show(tick) {
    if (!this._length) return;
    this._tick = this._wrap(tick);
    this._onShow(this._tick, this._tick);
  }

  _wrap(tick) {
    const n = this._length;
    return ((Math.round(tick) % n) + n) % n;
  }

  /** Forward or back by whole ticks, wrapping the way the loop does. */
  step(by) { this.show(this._tick + by); }

  // ── Transport ──────────────────────────────────────────────────────────────

  play() {
    if (this._playing || this._length < 2) return;
    this._playing = true;
    this._last = performance.now();
    this._carry = 0;
    this._onState();
    this._raf = requestAnimationFrame(t => this._advance(t));
  }

  pause() {
    if (!this._playing && !this._raf) return;
    this._playing = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._onState();
  }

  toggle() { this._playing ? this.pause() : this.play(); }

  _advance(now) {
    if (!this._playing) return;

    const elapsed = now - this._last;
    this._last = now;
    this._carry += (elapsed / 1000) * this._fps;

    const steps = Math.floor(this._carry);
    if (steps > 0) {
      this._carry -= steps;
      const next = this._tick + steps;
      if (!this._loop && next >= this._length) {
        this.show(this._length - 1);
        return this.pause();
      }
      if (this._smooth) this._tick = this._wrap(next);
      else this.show(next);
    }
    // Every frame, and where the loop really is between its ticks.
    if (this._smooth) this._onShow(this._tick, this._tick + this._carry);

    this._raf = requestAnimationFrame(t => this._advance(t));
  }

  dispose() { this.pause(); }
}

// ── A loop on a page of its own rate ─────────────────────────────────────────
//
// A page — compose's, or a map — has a rate of its own, and a loop placed on
// it keeps its own speed in real time: what the two share is seconds, not
// ticks. Moved here from compose's time.js on 2026-09-30, when the map
// editor needed the same; tests/compose-time.mjs still holds them.

/** Whether a handle moves at all: more than one tick, at a rate. A picture does not. */
export const moves = handle => !!handle && handle.length > 1 && handle.fps > 0;

/**
 * How many of the page's frames a loop lasts: its own length, as time, at the
 * page's rate — rounded, when the two rates do not divide, to the nearest
 * frame. One for something that does not move.
 *
 * @param {object} handle   { length, fps }
 * @param {number} fps      the page's rate
 */
export function framesOnPage(handle, fps) {
  if (!moves(handle)) return 1;
  return Math.max(1, Math.round((handle.length * fps) / handle.fps));
}

/**
 * The object's own tick at a tick of the page: the one showing at that
 * moment. A loop wraps; a sequence that does not loop holds its last tick.
 *
 * @param {number} pageTick
 * @param {object} handle   { length, fps, loop }
 * @param {number} fps      the page's rate
 */
export function tickAt(pageTick, handle, fps) {
  if (!moves(handle)) return 0;
  const t = Math.floor((pageTick * handle.fps) / fps);
  if (handle.loop === false) return Math.max(0, Math.min(t, handle.length - 1));
  return ((t % handle.length) + handle.length) % handle.length;
}
