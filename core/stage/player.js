/**
 * sequencePlayer.js
 * Renders a clip into its own frame buffer, one tick at a time.
 *
 * TWO PROPERTIES WORTH PROTECTING
 * ──────────────────────────────────────────────────────────────────────────────
 * 1. `step()` never reads a clock. It advances exactly one tick and renders.
 *    Something outside decides when to call it — a timer for playback, a plain
 *    loop for a deterministic export. Reading the clock in here would make
 *    frame-accurate export impossible to retrofit.
 *
 * 2. The buffer is sized to the *content*, not to the window. Playback then
 *    reads the same at any window size, a resize cannot invalidate it, and
 *    rendering at 4K is the same code path with `renderScale` turned up.
 *
 *    Content rather than the sequence rect, because a mark is drawn from its
 *    centre: one stamped near an edge hangs half outside the canvas it was
 *    recorded on, and a sequence-sized buffer cuts it off. `bounds` is the
 *    rect the marks actually occupy. It may also come out *smaller* than the
 *    sequence — a doodle in the middle of a 4K canvas needs a buffer its own
 *    size, not the canvas's — and on a stage of many clips that is the
 *    difference that decides how many of them fit.
 *
 * Transport state does not live here. The player knows where its playhead is
 * and how to move it; whether it is running, and how fast, belongs to whatever
 * drives it — see sequenceTransport.js.
 *
 * Ticks are O(1) whenever a rule only ever appends to its window — which the
 * accumulating rules do while they fill. A rule that moves its start (`slide`,
 * and the draining half of `sweep`/`bounce`) falls back to redrawing the
 * window, bounded by the mark count.
 */

import * as Registry     from '../registry.js';
import { stampPoints }    from '../stamp.js';
import { ruleOf, totalTicks } from './clip.js';
import { contentBounds, missingFamilies } from './bounds.js';


export class SequencePlayer {
  /** @param {p5} p  the p5 instance that owns the buffer */
  constructor(p) {
    this._p        = p;
    this._buf      = null;
    this._clip     = null;
    this._scale    = 1;
    this._bounds   = null;    // content rect in sequence coordinates
    this._pass     = 0;
    this._tick     = 0;
    this._lastRange = null;   // what the buffer currently holds
    this._finished = false;
    this._missing  = [];
  }

  // ── State ───────────────────────────────────────────────────────────────────

  get buffer()   { return this._buf; }
  get clip()     { return this._clip; }

  /**
   * The rect of sequence coordinates the buffer covers, `{ x, y, w, h }`.
   * Buffer pixel (0, 0) is sequence point (x, y), times `renderScale`.
   *
   * Whatever draws the buffer needs this to place it: fit the *sequence* to
   * the surface, then put the buffer at `bounds` inside that fit, so marks
   * hanging off the edge spill outside it instead of shrinking the drawing
   * to make room for themselves.
   */
  get bounds() { return this._bounds; }

  /** Buffer pixels per sequence pixel. Changing it means a fresh `load()`. */
  get renderScale() { return this._scale; }

  /**
   * Roughly what this buffer costs in memory, in bytes.
   *
   * Read from the backing canvas where there is one, because p5 multiplies a
   * Graphics by its own pixel density on top of `renderScale` — so the honest
   * figure is usually larger than width x height x 4 suggests, and a UI that
   * offers to raise the density ought to show the real price.
   */
  get byteSize() {
    if (!this._buf) return 0;
    const c = this._buf.canvas;
    return c ? c.width * c.height * 4
             : this._buf.width * this._buf.height * 4;
  }
  get finished() { return this._finished; }
  get pass()     { return this._pass; }
  get tick()     { return this._tick; }

  /**
   * Where the playhead is, as a single tick index in [0, length) with the
   * passes flattened. A transport works in this space, because two clips of
   * different shapes can only be driven from one clock if both can say where
   * they are in the same units.
   */
  get position() {
    if (!this._clip) return 0;
    const n    = this._clip.sequence.events.length;
    const rule = ruleOf(this._clip);
    let base = 0;
    for (let p = 0; p < this._pass; p++) base += rule.tickCount(p, n, this._clip.window);
    return base + this._tick;
  }

  /** Ticks in one complete loop — the frame count of an export. */
  get length() { return this._clip ? totalTicks(this._clip) : 0; }

  /** Family ids this sequence needs that the registry cannot resolve. */
  get missingFamilies() { return this._missing; }

  // ── Loading ─────────────────────────────────────────────────────────────────

  /**
   * Point the player at a clip, building a fresh buffer for it.
   * @param {Object} clip
   * @param {Object} [opts]
   * @param {number} [opts.renderScale=1]  buffer size multiplier; raise it to
   *        render above display resolution for export.
   */
  load(clip, { renderScale = 1 } = {}) {
    this.dispose();

    const seq    = clip.sequence;
    this._clip   = clip;
    this._scale  = renderScale;
    this._bounds = contentBounds(clip);
    this._buf    = this._p.createGraphics(
      Math.max(1, Math.round(this._bounds.w * renderScale)),
      Math.max(1, Math.round(this._bounds.h * renderScale)),
    );
    this._buf.clear();
    this._missing = missingFamilies(seq);

    this.reset();
    return this;
  }

  /** Release the buffer. p5 retains every Graphics until it is removed. */
  dispose() {
    this._buf?.remove();
    this._buf       = null;
    this._clip      = null;
    this._bounds    = null;
    this._lastRange = null;
  }

  // ── Playhead ───────────────────────────────────────────────────────────────

  /** Back to the first tick, rendered. */
  reset() {
    this._pass      = 0;
    this._tick      = 0;
    this._lastRange = null;
    this._finished  = false;
    this._renderCurrent();
  }

  /**
   * Advance exactly one tick and render it. Call this from a timer, or in a
   * bare loop to walk a whole sequence deterministically.
   * @returns {boolean} false once a non-looping clip has run out
   */
  step() {
    if (!this._clip) return false;

    const n    = this._clip.sequence.events.length;
    const rule = ruleOf(this._clip);
    const opts = this._clip.window;

    this._tick++;
    if (this._tick >= rule.tickCount(this._pass, n, opts)) {
      this._tick = 0;
      this._pass++;

      if (this._pass >= rule.passCount(n, opts)) {
        if (!this._clip.timing.loop) {
          this._pass     = rule.passCount(n, opts) - 1;
          this._tick     = Math.max(0, rule.tickCount(this._pass, n, opts) - 1);
          this._finished = true;
          return false;
        }
        this._pass = 0;
      }
    }

    this._renderCurrent();
    return true;
  }

  /**
   * Jump straight to a linear tick position, wrapping into range. Always a full
   * rebuild of that window, which is what a scrub wants — see walkTo() for the
   * cheap path.
   */
  seek(position) {
    if (!this._clip) return;
    const len  = Math.max(1, this.length);
    const want = ((position % len) + len) % len;
    [this._pass, this._tick] = this._locate(want);
    this._lastRange = null;
    this._finished  = false;
    this._renderCurrent();
  }

  /**
   * Bring the playhead to an absolute tick, stepping where that costs less than
   * rebuilding. This is the method a transport drives.
   *
   * Stepping forward keeps the append fast path alive: a delta of one usually
   * costs a single mark, where a seek always redraws the whole window. It stays
   * the cheaper option while the delta is under the mark count, which covers
   * both of the cases that actually happen every frame — one tick of advance,
   * and the wrap at the loop join.
   */
  walkTo(target) {
    if (!this._clip) return;
    const len = this.length;
    if (len <= 0) return;

    const want = ((target % len) + len) % len;
    const here = this.position;
    if (want === here) return;

    let delta = want - here;
    if (delta < 0) delta += len;              // wrapped round the loop

    if (delta <= this._clip.sequence.events.length) {
      while (delta-- > 0) { if (!this.step()) break; }
    } else {
      this.seek(want);
    }
  }

  /** Linear tick position → the [pass, tick] pair the window rules speak in. */
  _locate(position) {
    const n      = this._clip.sequence.events.length;
    const rule   = ruleOf(this._clip);
    const passes = rule.passCount(n, this._clip.window);
    let left = position;
    for (let p = 0; p < passes; p++) {
      const count = rule.tickCount(p, n, this._clip.window);
      if (left < count) return [p, left];
      left -= count;
    }
    return [0, 0];
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  _renderCurrent() {
    if (!this._clip || !this._buf) return;
    const n    = this._clip.sequence.events.length;
    const rule = ruleOf(this._clip);
    this._render(rule.range(this._pass, this._tick, n, this._clip.window));
  }

  /**
   * Bring the buffer to `range`. When the new window is the old one plus a
   * mark on the end — the common case — only that mark is drawn.
   * @param {?[number, number]} range  inclusive, or null for a blank tick
   */
  _render(range) {
    const g = this._buf;

    if (range === null) {
      g.clear();
      this._lastRange = null;
      return;
    }

    const prev = this._lastRange;
    const isAppend = prev !== null
      && range[0] === prev[0]
      && range[1] === prev[1] + 1;

    if (isAppend) {
      this._drawEvent(range[1]);
    } else {
      g.clear();
      for (let i = range[0]; i <= range[1]; i++) this._drawEvent(i);
    }

    this._lastRange = range;
  }

  /**
   * Draw one recorded mark, through the clip's transforms.
   * The index wraps, so a rule may hand out a range that runs past the end
   * and comes back round — see the note on window rules in sequenceClip.js.
   */
  _drawEvent(index) {
    const g    = this._buf;
    const clip = this._clip;
    const seq  = clip.sequence;
    const n    = seq.events.length;
    if (n === 0) return;
    const ev = seq.events[((index % n) + n) % n];
    if (!ev) return;

    const ov = clip.overrides;
    const b  = this._bounds;

    // Content overrides. Re-pointing the family can leave the recorded sprite
    // index out of range, so wrap it into the replacement.
    const familyId = ov.familyId ?? ev.familyId;
    let   spriteIx = ov.spriteIndex ?? ev.spriteIndex;
    if (ov.familyId) {
      const count = Registry.spriteCount(familyId);
      if (count > 0) spriteIx = ((spriteIx % count) + count) % count;
    }

    const img = Registry.getSprite(familyId, spriteIx);
    if (!img) return;   // family not loaded — reported via missingFamilies

    const pattern = ov.pattern ?? ev.pattern;
    const pts     = stampPoints(ev.x, ev.y, ev.rotation, pattern, seq.w, seq.h);
    const markScale = ev.scale * ov.scaleMul;

    for (const [px, py, rot, flipX] of pts) {
      g.push();

      // Render scale, then the content offset — buffer pixel (0, 0) is the
      // top-left of `bounds`, not of the sequence — then the mark's own
      // placement. Where the whole drawing sits is the stage's business, not
      // the buffer's, so nothing about it appears here.
      g.scale(this._scale);
      g.translate(-b.x, -b.y);
      g.translate(px, py);
      g.rotate(rot);
      g.scale(markScale * flipX, markScale);
      g.imageMode(g.CENTER);
      g.image(img, 0, 0);

      g.pop();
    }
  }
}
