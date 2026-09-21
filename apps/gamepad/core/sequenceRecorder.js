/**
 * sequenceRecorder.js
 * Records a painting sequence — the ordered marks laid down between arming and
 * disarming the recorder — as a plain, serialisable object.
 *
 * A mark is stored as the brush state that produced it, not as the expanded
 * stamp points, so playback can re-derive the pattern later. That also means a
 * sequence recorded in 'single' can be replayed as 'quad'.
 *
 * Each sequence: { id, createdAt, w, h, events: [...] }
 * Each event:    { t, x, y, rotation, scale, familyId, spriteIndex, pattern }
 *
 * `w` / `h` are the canvas dimensions at record time, so a sequence played back
 * into a differently-sized window can be scaled rather than drift.
 *
 * Emits DOM CustomEvents on the document so UI panels stay in sync:
 *   'sequence:started'   — {}
 *   'sequence:captured'  — { count }
 *   'sequence:stopped'   — { sequence, index }
 *   'sequence:discarded' — {}   (disarmed without laying down a mark)
 *   'sequence:removed'   — { index }
 *   'sequence:cleared'   — {}
 */

// Holding the stamp button emits one stamp per frame, so a two-second hold
// would otherwise be ~120 events — and a playback loop is O(n²) ticks long, so
// that is a ten-minute loop of near-identical frames. Only a mark whose
// transform actually differs from the one before it is worth recording. The
// canvas still receives every stamp either way; this only filters what the
// sequence remembers.
const MIN_MOVE_PX      = 1.0;
const MIN_ROTATION_RAD = 0.01;   // ~0.6°
const MIN_SCALE_RATIO  = 0.01;   // 1% of the previous scale

const _sequences = [];

/**
 * Every mark since the canvas was last cleared, captured whether or not a
 * recording is armed. The ink layer is cumulative, so this buffer is the
 * canvas expressed as instructions — which is what lets a still carry the
 * marks that made it and re-render at any size.
 *
 * Recording does not switch capture on, then. It marks the in and out points
 * of a range over this buffer, which is what a record button means in an
 * editing application anyway.
 */
let _buffer = { w: null, h: null, startedAt: Date.now(), events: [] };

let _active    = null;   // the range being delimited, or null when disarmed
let _lastEvent = null;   // previous captured event, for the distinctness test

export const SequenceRecorder = {
  /** True while marks are being captured. */
  get recording() { return _active !== null; },

  /** All finished sequences (read-only view), oldest first. */
  get all() { return _sequences; },

  get count() { return _sequences.length; },

  /** Marks captured so far in the in-progress sequence. */
  get liveCount() { return _active ? _buffer.events.length - _active.from : 0; },

  /** Every mark since the canvas was last cleared (read-only view). */
  get marks() { return _buffer.events; },

  get markCount() { return _buffer.events.length; },

  /**
   * The canvas as instructions: everything drawn since the last clear.
   * This is what a still puts in its recipe.
   * @returns {{w:number|null, h:number|null, events:Array}}
   */
  snapshot() {
    return { w: _buffer.w, h: _buffer.h, events: _buffer.events.map(e => ({ ...e })) };
  },

  /**
   * Start a fresh buffer. Called when the ink layer is wiped, because the
   * marks no longer describe what is on screen.
   */
  resetBuffer(w, h) {
    _buffer = { w: w ?? _buffer.w, h: h ?? _buffer.h, startedAt: Date.now(), events: [] };
    _lastEvent = null;
    if (_active) _active.from = 0;
    _dispatch('sequence:bufferReset', {});
  },

  /**
   * Arm the recorder.
   * @param {number} w  canvas width at record time
   * @param {number} h  canvas height at record time
   * @returns {Object} the sequence now being built
   */
  start(w, h) {
    if (_active) return _active;
    if (_buffer.w == null) { _buffer.w = w; _buffer.h = h; }
    _active = {
      id:        `seq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      w,
      h,
      from:      _buffer.events.length,   // in point, as an index into the buffer
    };
    _dispatch('sequence:started', {});
    return _active;
  },

  /**
   * Disarm. A sequence that caught no marks is thrown away rather than stored.
   * @returns {Object|null} the finished sequence, or null if nothing was caught
   */
  stop() {
    if (!_active) return null;

    const seq = _active;
    _active = null;

    // The clip is the range of the buffer between the in and out points, with
    // t re-based so a sequence still starts at zero.
    const slice = _buffer.events.slice(seq.from);
    const t0 = slice.length ? slice[0].t : 0;
    seq.events = slice.map(e => ({ ...e, t: e.t - t0 }));
    delete seq.from;

    if (seq.events.length === 0) {
      _dispatch('sequence:discarded', {});
      return null;
    }

    _sequences.push(seq);
    _dispatch('sequence:stopped', { sequence: seq, index: _sequences.length - 1 });
    return seq;
  },

  /**
   * Flip the armed state.
   * @returns {boolean} true if now recording
   */
  toggle(w, h) {
    if (_active) {
      this.stop();
      return false;
    }
    this.start(w, h);
    return true;
  },

  /**
   * Offer a stamp to the recorder. Always buffered; ignored only when the
   * brush has not moved, turned or resized since the previous mark.
   * @param {Object} state  { x, y, rotation, scale, familyId, spriteIndex, pattern }
   * @returns {boolean} true if the mark was recorded
   */
  capture(state) {
    if (!_isDistinct(state)) return false;

    const event = {
      t:           Date.now() - _buffer.startedAt,
      x:           state.x,
      y:           state.y,
      rotation:    state.rotation,
      scale:       state.scale,
      familyId:    state.familyId,
      spriteIndex: state.spriteIndex,
      pattern:     state.pattern,
    };

    _buffer.events.push(event);
    _lastEvent = event;
    if (_active) _dispatch('sequence:captured', { count: _buffer.events.length - _active.from });
    return true;
  },

  get(index) { return _sequences[index] ?? null; },

  remove(index) {
    if (index < 0 || index >= _sequences.length) return;
    _sequences.splice(index, 1);
    _dispatch('sequence:removed', { index });
  },

  /** Drop every stored sequence. Does not disarm an in-progress recording. */
  clear() {
    _sequences.length = 0;
    _dispatch('sequence:cleared', {});
  },

  /** Wall-clock length of a sequence, in ms. */
  durationOf(seq) {
    return seq.events.length ? seq.events[seq.events.length - 1].t : 0;
  },
};

// ── Internal ─────────────────────────────────────────────────────────────────

/** Has anything about the brush changed since the last recorded mark? */
function _isDistinct(state) {
  if (!_lastEvent) return true;

  if (state.familyId    !== _lastEvent.familyId)    return true;
  if (state.spriteIndex !== _lastEvent.spriteIndex) return true;
  if (state.pattern     !== _lastEvent.pattern)     return true;

  const moved = Math.hypot(state.x - _lastEvent.x, state.y - _lastEvent.y);
  if (moved >= MIN_MOVE_PX) return true;

  if (Math.abs(state.rotation - _lastEvent.rotation) >= MIN_ROTATION_RAD) return true;

  const scaleDelta = Math.abs(state.scale - _lastEvent.scale);
  if (scaleDelta >= MIN_SCALE_RATIO * _lastEvent.scale) return true;

  return false;
}

function _dispatch(name, detail) {
  document.dispatchEvent(new CustomEvent(name, { detail }));
}
