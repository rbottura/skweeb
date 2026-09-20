/**
 * sequenceClip.js
 * A clip is a *treatment* of a recorded sequence: how to place it, what to
 * draw it with, how fast, and which marks are visible when.
 *
 * The recording itself is never touched. One sequence can back any number of
 * clips, which is what makes composition work possible — and it means a clip
 * is cheap, plain data that survives a round trip through JSON (the window
 * rule is stored by name, not as a function reference).
 *
 * Note what is NOT here: position, rotation, scale, mirroring. Where a clip
 * sits is a property of the layer showing it, not of the clip — see the note
 * at the top of sequenceStage.js. `overrides.scaleMul` is the exception that
 * proves the rule: it changes mark size relative to mark *spacing*, which
 * alters what the drawing is rather than where it is, so it is baked in.
 *
 *   clip = {
 *     sequence,              // the source recording, treated as immutable
 *     sequenceId,
 *     overrides: { familyId, spriteIndex, pattern, scaleMul },
 *     timing:    { ticksPerSecond, loop },   // 60 = one mark per frame, 1x
 *     window:    { rule, widthSteps },
 *   }
 *
 * WINDOW RULES
 * ──────────────────────────────────────────────────────────────────────────────
 * A rule answers one question: at pass `p`, tick `k`, which marks are on
 * screen? It returns an inclusive [first, last] index pair, or null for a
 * blank tick. Everything else — build-up, erosion, travelling bands — is just
 * a different answer to that question.
 *
 * Indices are taken modulo the mark count, so a range may run off the end and
 * come back round. That is what lets a band wrap the join instead of emptying
 * out and refilling.
 *
 * Every rule function takes the trailing (n, opts) so they are interchangeable:
 *   passCount(n, opts)          → how many passes in one loop
 *   tickCount(pass, n, opts)    → how many ticks in that pass
 *   range(pass, tick, n, opts)  → [first, last] | null
 */

/** Band width as a tenth of the sequence, never less than one mark. */
export const BAND_STEPS = 10;
export function bandWidth(n, opts) {
  const steps = Math.min(BAND_STEPS, Math.max(1, opts?.widthSteps ?? 2));
  return Math.max(1, Math.round((n * steps) / BAND_STEPS));
}

/**
 * The fill-then-drain walk that `sweep` and `bounce` share, without a blank.
 * Step s runs 0 … 2n-2: the window grows to the full sequence, then its start
 * advances to the end.
 */
function sweepRange(s, n) {
  return [Math.max(0, s - n + 1), Math.min(s, n - 1)];
}

export const WINDOW_RULES = {
  /**
   * The default. One continuous run: the window fills from the first mark to
   * the last, then drains from the front while the end stays put. The drawing
   * arrives whole, then dissolves from where it began. Nothing ever clears
   * mid-flow — the blank tick at the end is the only gap.
   *
   *   A·AB·ABC·ABCD·BCD·CD·D·—
   *
   * The fill half only ever appends, so it renders a mark per tick. The drain
   * half moves its start, which a raster buffer cannot undo, so those ticks
   * redraw their window — bounded by the mark count, never by the loop.
   */
  sweep: {
    label:     'Sweep',
    passCount: ()              => 1,
    tickCount: (pass, n)       => n * 2,
    range:     (pass, tick, n) => {
      const first = Math.max(0, tick - n + 1);
      const last  = Math.min(tick, n - 1);
      return first > last ? null : [first, last];
    },
  },

  /**
   * Sweep, but it turns round instead of blanking. Once the window has drained
   * to the last mark it re-accumulates backwards from that end, then drains
   * off the front — so the drawing breathes in and out and never goes empty.
   *
   *   A·AB·ABC·ABCD·BCD·CD·D·CD·BCD·ABCD·ABC·AB
   *                              └─ the window now grows back from the far end
   *
   * 4n-4 ticks: the sweep walk, then the same walk back with both turning
   * points dropped so neither end stutters on a repeat.
   */
  bounce: {
    label:     'Bounce',
    passCount: ()        => 1,
    tickCount: (pass, n) => Math.max(1, 4 * n - 4),
    range:     (pass, tick, n) => {
      const forward = 2 * n - 1;              // ticks in the outward walk
      const s = tick < forward ? tick : (4 * n - 4) - tick;
      return sweepRange(s, n);
    },
  },

  /**
   * Draw it once, blank, repeat. The plain "watch it being made" loop.
   *
   *   A·AB·ABC·ABCD·—
   */
  build: {
    label:     'Build',
    passCount: ()              => 1,
    tickCount: (pass, n)       => n + 1,
    range:     (pass, tick, n) => (tick >= n ? null : [0, tick]),
  },

  /**
   * A band of marks travelling through the sequence and round the join: when
   * it reaches the end it takes the first marks straight back in, so the loop
   * never shows an empty frame or a partial band. Width is `widthSteps`
   * tenths of the sequence.
   *
   * One revolution is n ticks, and tick n is tick 0 — that is what makes the
   * repeat seamless. Unlike the accumulating rules this one moves its start
   * every tick, so each tick redraws the band rather than adding one mark.
   */
  slide: {
    label:     'Slide',
    passCount: ()              => 1,
    tickCount: (pass, n)       => n,
    range:     (pass, tick, n, opts) => [tick, tick + bandWidth(n, opts) - 1],
  },
};

export const RULE_NAMES = Object.keys(WINDOW_RULES);

const DEFAULTS = {
  overrides: { familyId: null, spriteIndex: null, pattern: null, scaleMul: 1 },
  timing:    { ticksPerSecond: 60, loop: true },
  window:    { rule: 'sweep', widthSteps: 2 },
};

/**
 * Build a clip over a recorded sequence.
 * @param {Object} sequence  from SequenceRecorder
 * @param {Object} [options] partial overrides, merged per group
 */
export function createClip(sequence, options = {}) {
  return {
    sequence,
    sequenceId: sequence.id,
    overrides: { ...DEFAULTS.overrides, ...options.overrides },
    timing:    { ...DEFAULTS.timing,    ...options.timing },
    window:    { ...DEFAULTS.window,    ...options.window },
  };
}

/** The rule object a clip names, falling back to the default. */
export function ruleOf(clip) {
  return WINDOW_RULES[clip.window.rule] ?? WINDOW_RULES.sweep;
}

/** Ticks in one complete loop — the frame count of an export. */
export function totalTicks(clip) {
  const n    = clip.sequence.events.length;
  const rule = ruleOf(clip);
  let total  = 0;
  for (let p = 0; p < rule.passCount(n, clip.window); p++) {
    total += rule.tickCount(p, n, clip.window);
  }
  return total;
}
