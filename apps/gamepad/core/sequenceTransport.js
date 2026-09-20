/**
 * sequenceTransport.js
 * One clock, driving every clip on screen.
 *
 * WHY ONE CLOCK
 * ──────────────────────────────────────────────────────────────────────────────
 * The obvious way to play several clips at once is to give each one a timer and
 * let it pace itself. That cannot be made to work: each accumulator rounds its
 * own remainder against its own frame time, so two clips set to the same speed
 * drift apart, and there is no moment at which you can say where the whole
 * composition is.
 *
 * So positions are *derived*, never accumulated. One master tick advances, and
 * each layer's position falls out of it:
 *
 *   target(layer) = floor(master.tick * ratio) + anchor + offset
 *
 * Every useful behaviour is then a property of that one line. Half speed is a
 * ratio. A canon is an offset. Scrubbing the whole composition is assigning to
 * `tick`. Frame-accurate export is advancing `tick` in a bare loop instead of
 * from a clock — which is why `SequencePlayer.step()` refuses to read one.
 *
 * OFFSET IS THE USER'S; ANCHOR IS OURS
 * ───────────────────────────────────────────────────────────────────────────────
 * Two things need to shift a layer along without the user asking: a ratio
 * change (which would otherwise jump the playhead, since the target is derived
 * from the clock) and a soft pause (which has to absorb the ticks that passed).
 * Both write `anchor`.
 *
 * `offset` is left alone for phase the user actually chose — the quarter-loop
 * stagger that turns four copies of one clip into a canon. Keeping them apart
 * is what lets a phase control and a speed control coexist without fighting,
 * and it means `rewind()` can return a canon to its start *with its voices
 * still staggered*.
 *
 * WALK, DON'T SEEK
 * ──────────────────────────────────────────────────────────────────────────────
 * Having computed a target, the transport asks the player to *walk* to it
 * rather than seek. Stepping forward one tick usually costs a single mark,
 * where a seek always rebuilds the window — see SequencePlayer.walkTo. That is
 * what keeps a stage of several clips affordable, so the distinction is worth
 * preserving: `advance()` walks, and only an explicit `seek()` rebuilds.
 *
 * The SequenceStage owns the layer list, because layers are the things you
 * look at. This class reads those same objects and writes only their time
 * fields — `rate`, `playing`, `pause`, `frozenAt` — and owns nothing else.
 */

/**
 * Master ticks per second, and what 1x means.
 *
 * 1x is one mark per frame — the rate marks were captured at, since a held
 * stamp button offers at most one per frame — and the draw loop runs at the
 * display's ~60fps. So 1x is 60 marks/sec, not 30.
 *
 * Playback never reproduces the original *timing* either way: the player ticks
 * uniformly and ignores each event's `t`, so idle gaps between strokes are not
 * replayed. One mark per frame is the only thing 1x can honestly mean.
 */
export const MASTER_RATE = 60;

/** The speed ladder offered in the UI. A layer's `rate.ratio` IS its multiplier. */
export const SPEED_MULTIPLIERS = [0.25, 0.5, 1, 2, 3];

/** Marks per second at a given rung of the ladder. */
export const tickRateAt = i => Math.round(MASTER_RATE * SPEED_MULTIPLIERS[i]);

/**
 * Most master ticks to run in one frame. Without a cap, returning from a
 * stalled tab would try to catch up the whole backlog in a single frame.
 */
const MAX_TICKS_PER_FRAME = 4;

export class SequenceTransport {
  /**
   * @param {SequenceStage} stage  whose layers this clock drives
   * @param {number} [opts.rate=60] master ticks per second
   */
  constructor(stage, { rate = MASTER_RATE } = {}) {
    this.stage   = stage;
    this.rate    = rate;
    this.tick    = 0;
    this.playing = false;
    this._clock  = 0;      // ms accumulated toward the next master tick
  }

  get layers() { return this.stage.layers; }

  // ── Layers ──────────────────────────────────────────────────────────────────

  /** True once every layer has run out. Only reachable with `loop: false`. */
  get finished() {
    return this.layers.length > 0 && this.layers.every(l => l.player.finished);
  }

  // ── Transport ───────────────────────────────────────────────────────────────

  play()  { this.playing = true;  this._clock = 0; }
  pause() { this.playing = false; }

  stop() {
    this.playing = false;
    this._clock  = 0;
    this.seek(0);
  }

  /**
   * Put every layer back to the start of its own loop, and the clock with it.
   *
   * Deliberately not the same as `seek(0)`, which moves the master clock but
   * leaves each layer's phase offset standing. That is right for a scrub and
   * wrong after a window rule changes, because the offsets were phases of a
   * loop that no longer exists — and because `setRatio` parks its compensation
   * in the same field, so by then an offset is not a number anyone chose.
   */
  rewind() {
    this.tick   = 0;
    this._clock = 0;
    for (const layer of this.layers) this.rewindLayer(layer);
  }

  /**
   * Send one layer back to the start of its own loop without disturbing the
   * clock or anything else on the stage. The anchor cancels out wherever the
   * master happens to be, so the layer lands on its phase offset — which is
   * where "the start" means for a voice in a canon.
   *
   * This is what a reshaped window needs: a new rule changes the loop length,
   * so the old anchor described a position that no longer exists.
   */
  rewindLayer(layer) {
    layer.frozenAt    = null;
    layer.rate.offset = _phaseTicks(layer);
    layer.rate.anchor = -Math.floor(this.tick * layer.rate.ratio);
    layer.player.seek(layer.rate.offset);
  }

  /**
   * Set a layer's stagger, as a fraction of its own loop.
   *
   * A fraction rather than a tick count because a window rule change resizes
   * the loop underneath it: "a quarter of the way round" survives that, and
   * "five ticks in" quietly becomes something else.
   */
  setPhase(layer, phase) {
    layer.rate.phase  = phase;
    layer.rate.offset = _phaseTicks(layer);
    this.sync();
  }

  /** Scrub the whole composition. Every layer follows, rebuilding its window. */
  seek(tick) {
    this.tick = tick;
    this.sync({ hard: true });
  }

  /**
   * Run however many master ticks the elapsed time has earned, then bring every
   * layer to where that leaves it.
   * @param {number} dt  ms since the last frame (p5's deltaTime)
   * @returns {number} master ticks actually run
   */
  advance(dt) {
    if (!this.playing) return 0;

    const interval = 1000 / this.rate;
    this._clock += dt;

    let ticks = Math.floor(this._clock / interval);
    if (ticks <= 0) return 0;

    if (ticks > MAX_TICKS_PER_FRAME) {
      ticks = MAX_TICKS_PER_FRAME;
      this._clock = 0;                     // drop a backlog rather than chase it
    } else {
      this._clock -= ticks * interval;
    }

    this.tick += ticks;
    this.sync();
    return ticks;
  }

  /**
   * Bring every layer to the position the master clock implies.
   * @param {boolean} [opts.hard=false]  rebuild each window instead of walking
   *        to it. What a scrub wants; too expensive to do every frame.
   */
  sync({ hard = false } = {}) {
    for (const layer of this.layers) {
      const base = Math.floor(this.tick * layer.rate.ratio);

      if (!layer.playing) {
        // Hold position. A soft pause keeps the layer's phase by absorbing the
        // elapsed ticks into its offset, so it resumes exactly where it left
        // off; a hard pause leaves the offset alone and snaps back into lock
        // with everything else on resume.
        if (layer.pause === 'soft') {
          // Freeze against where the layer actually IS, not against the clock.
          // By the time a pause is seen here the master has already moved on a
          // tick, so anchoring to `base` would quietly hand that tick back on
          // resume — and again for every pause, which is how a "soft" pause
          // ends up running ahead of a hard one.
          if (layer.frozenAt === null) {
            layer.frozenAt = layer.player.position - layer.rate.offset;
          }
          layer.rate.anchor = layer.frozenAt - base;
        }
        continue;
      }

      layer.frozenAt = null;
      const target = base + layer.rate.anchor + layer.rate.offset;
      if (hard) layer.player.seek(target);
      else      layer.player.walkTo(target);
    }
  }

  // ── Tuning ──────────────────────────────────────────────────────────────────

  /**
   * Change how fast a layer runs *without moving it*.
   *
   * Targets are derived from the master clock, so assigning to `ratio` alone
   * would jump the playhead — at master tick 1000, doubling the ratio doubles
   * the target. The anchor absorbs that, leaving only the future pace changed
   * and the user's phase offset untouched.
   *
   * @param {Object} layer
   * @param {number} ratio  layer ticks per master tick
   */
  setRatio(layer, ratio) {
    const before = Math.floor(this.tick * layer.rate.ratio) + layer.rate.anchor;
    layer.rate.ratio  = ratio;
    layer.rate.anchor = before - Math.floor(this.tick * ratio);
  }

  /**
   * Phase-lock: every clip completes exactly one loop per master period,
   * whatever its length. Without it, clips of different lengths drift in and
   * out of phase against each other — which is polyrhythm, and often the
   * better-looking option, so this is a choice rather than a default.
   * @param {number} masterPeriod  master ticks per composition loop
   */
  /** Re-derive every layer's tick offset from its phase. Call after a reshape. */
  reapplyPhases() {
    for (const layer of this.layers) layer.rate.offset = _phaseTicks(layer);
  }

  lockToPeriod(masterPeriod) {
    if (masterPeriod <= 0) return;
    for (const layer of this.layers) {
      this.setRatio(layer, layer.player.length / masterPeriod);
    }
  }
}

/** A layer's phase fraction as a whole number of its own ticks. */
function _phaseTicks(layer) {
  return Math.round((layer.rate.phase ?? 0) * layer.player.length);
}
