/**
 * steady.js — what the camera reads, held still while the head barely
 * moves and let go when it moves fast: the 1€ filter (Casiez, Roussel and
 * Vogel, CHI 2012).
 *
 * The face's points tremble from frame to frame, and an eye cut from a box
 * that trembles shakes on the avatar; smoothed hard, the box lags behind a
 * turn of the head and the eye slides about in it instead. The 1€ filter is
 * both: a low-pass whose cutoff rises with the speed of what it follows —
 * `minCutoff` Hz at rest, and `beta` Hz more for every `scale` a second it
 * moves. It is fed once a frame of the camera, at that frame's time (main.js):
 * fed twice a frame, it would read a still frame and then a jump, and let
 * the jump through.
 *
 * An eye's box is four numbers, each held its own way. Where it is follows
 * the steadiness at rest, the puppet's 0 to 1 — 5 Hz at 0, 1.2 at a half,
 * 0.3 at 1 — and is let go fast, its speed counted in boxes a second, so an
 * eye stays in the middle of its box through a quick turn. Its size and its
 * turn change slowly in life and are held still. The head's pose is held
 * lightly: the springs after it smooth it again (sway.js). A face lost for
 * longer than `forget` seconds is forgotten, so the eyes do not glide from
 * where it was to where it is found. Pure: values and times in, values out.
 */

const alpha = (cutoff, dt) => 1 / (1 + 1 / (2 * Math.PI * cutoff * dt));

/**
 * One value, filtered.
 *
 * @param {object} [opts]
 * @param {number} [opts.minCutoff=1]   Hz, at rest
 * @param {number} [opts.beta=0]        Hz more for each `scale` a second
 * @param {number} [opts.dCutoff=1]     Hz: how the speed itself is smoothed
 */
export function oneEuro({ minCutoff = 1, beta = 0, dCutoff = 1 } = {}) {
  let x = null, dx = 0, t = 0;
  return {
    /** `value` at `time`, seconds, its speed counted in `scale`s: the value held. */
    filter(value, time, scale = 1) {
      if (x === null) { x = value; t = time; return x; }
      const dt = time - t;
      if (!(dt > 0)) return x;
      t = time;
      dx += alpha(dCutoff, dt) * ((value - x) / dt - dx);
      x += alpha(minCutoff + (beta * Math.abs(dx)) / Math.max(1e-9, scale), dt) * (value - x);
      return x;
    },
    /** A new cutoff or beta, for what follows. */
    tune(opts = {}) {
      if (opts.minCutoff != null) minCutoff = opts.minCutoff;
      if (opts.beta != null) beta = opts.beta;
    },
    reset() { x = null; dx = 0; },
  };
}

/** The cutoff at rest for a steadiness from 0 to 1, Hz. */
export const restCutoff = steadiness => 5 * Math.pow(0.06, Math.max(0, Math.min(1, steadiness)));

/** How each of a box's numbers is held: Hz at rest (null: the steadiness's), Hz more a box — or a radian — a second. */
const BOX = { x: { rest: null, beta: 4 }, y: { rest: null, beta: 4 }, size: { rest: 0.5, beta: 0.5 }, angle: { rest: 1.5, beta: 1 } };

/**
 * Boxes — the eyes, in the camera's pixels — each of their numbers through
 * a filter of its own. A frame with no face keeps the last boxes until the
 * face has been gone for `forget`: one missed frame does not blink the eyes
 * off the avatar.
 *
 * @param {object} [opts]
 * @param {number} [opts.steadiness=0.5]
 * @param {number} [opts.forget=0.4]    seconds without a face before it is forgotten
 */
export function steadyBoxes({ steadiness = 0.5, forget = 0.4 } = {}) {
  let filters = [], last = null, seen = -Infinity, cutoff = restCutoff(steadiness);
  const make = () => Object.fromEntries(Object.entries(BOX).map(([k, h]) => [k, oneEuro({ minCutoff: h.rest ?? cutoff, beta: h.beta })]));
  return {
    /**
     * @param {?Array<{x, y, size, angle}>} boxes   this frame's, or null with no face
     * @param {number} time   seconds
     * @returns {?Array<{x, y, size, angle}>}  null once the face has been gone for `forget`
     */
    hold(boxes, time) {
      if (!boxes) {
        if (time - seen > forget) { filters = []; last = null; }
        return last;
      }
      if (time - seen > forget || filters.length !== boxes.length) filters = boxes.map(make);
      seen = time;
      last = boxes.map((b, i) => {
        const f = filters[i], size = f.size.filter(b.size, time, b.size);
        return { x: f.x.filter(b.x, time, size), y: f.y.filter(b.y, time, size), size, angle: f.angle.filter(b.angle, time) };
      });
      return last;
    },
    /** A new steadiness, for what follows. */
    tune(next) {
      cutoff = restCutoff(next);
      for (const f of filters) { f.x.tune({ minCutoff: cutoff }); f.y.tune({ minCutoff: cutoff }); }
    },
    reset() { filters = []; last = null; seen = -Infinity; },
  };
}

/**
 * The head's pose — yaw, pitch and roll in radians, x in cm — held lightly.
 * With no face it is null at once: the springs take the drawing back to
 * rest themselves.
 */
export function steadyPose() {
  let filters = null;
  const make = () => ({ yaw: oneEuro({ minCutoff: 1.5, beta: 1 }), pitch: oneEuro({ minCutoff: 1.5, beta: 1 }),
                        roll: oneEuro({ minCutoff: 1.5, beta: 1 }), x: oneEuro({ minCutoff: 1.5, beta: 0.1 }) });
  return {
    hold(pose, time) {
      if (!pose) { filters = null; return null; }
      filters = filters || make();
      return Object.fromEntries(Object.keys(filters).map(k => [k, filters[k].filter(pose[k], time)]));
    },
    reset() { filters = null; },
  };
}
