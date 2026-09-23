/**
 * attractor.js — the one thing in ckt that moves on its own.
 *
 * In v2 nothing moved the dots directly. A single invisible Matter body — the
 * attractor — was pushed along a path every animation frame, and every dot,
 * tied to its place in the letter, leaned towards it. `gravCircle`,
 * `gravEight` and `fastSquare` are the paths; they never moved a dot. What the
 * dots do about it is motion.js.
 *
 * ── The paths as v2 wrote them ──────────────────────────────────────────────
 *
 * Each frame v2 picked a target and eased the attractor a fixed fraction of
 * the way there — `pos += (target - pos) * α`:
 *
 *   circle   target on an ellipse about (W/2.2, H/2.2), radii W/2.5 and H/1.5,
 *            angle +0.02 rad a frame;                             α = 0.1
 *   eight    target x = W/2 + 1.2W cos(0.125 n), y = H/2.5 + 600 sin(0.008 n);
 *                                                                 α = 0.01
 *   square   the window's four corners, 130 frames on each;       α = 0.02
 *   mouse    the pointer;                                         α = 0.3
 *   stop     wherever it was
 *
 * ── Why closed forms, and why they are v2's and not approximations ──────────
 *
 * That easing is a first-order filter, and a first-order filter driven by a
 * sinusoid settles into the same sinusoid, scaled and delayed by amounts that
 * depend only on α and the frequency: `easing()` below. So the attractor v2
 * showed a few seconds in — once the start-up transient had died — is exactly
 * computable from the frame index, with no state. For the square the same
 * argument gives an exponential approach to each corner, and the loop's
 * steady state has a closed form too. That is what makes a frame a pure
 * function of its index here, as every render in this suite must be.
 *
 * The one liberty: a loop has to close. So each path takes its phase from the
 * loop, 0..1, instead of from v2's per-frame constants — the ellipse goes
 * round once per loop, the square visits each corner for a quarter of it. The
 * eight's two frequencies were 0.125 and 0.008, a ratio of 15.6, which never
 * closes; it is rounded to 16. Everything else — centres, radii, the easing's
 * shrink and lag — is v2's.
 *
 * `point` stands for both `mouse` and `stop`. A pointer is not reproducible,
 * but where it was put is: dragging on the canvas writes the point into the
 * recipe, and the attractor stays there.
 */

const TAU = Math.PI * 2;

/**
 * What v2's easing does to a sinusoid: `pos += (target - pos) * alpha` per
 * frame, target at `omega` radians a frame. The steady state is the target
 * scaled by `gain` and delayed by `lag` radians — the response
 * α / (e^{iω} − (1 − α)).
 *
 * @returns {{gain: number, lag: number}}
 */
export function easing(alpha, omega) {
  const re = Math.cos(omega) - (1 - alpha);
  const im = Math.sin(omega);
  return { gain: alpha / Math.hypot(re, im), lag: Math.atan2(im, re) };
}

// Computed once from v2's own constants, so the numbers below trace back to
// the source rather than to a tuning session.
const CIRCLE  = easing(0.1, 0.02);                 // gain 0.982, lag 11°
const EIGHT_X = easing(0.01, 0.125);               // gain 0.080, lag 89°
const EIGHT_Y = easing(0.01, 0.008);               // gain 0.782, lag 39°

/** x-cycles per y-cycle for the eight. v2's ratio was 0.125 / 0.008 = 15.6. */
export const EIGHT_RATIO = 16;

/**
 * How much of the way from a square's corner to the next is still left when
 * the attractor turns: 0.98 ^ 130 — v2's α over v2's dwell. About 7%, so it
 * nearly arrives and then cuts away, which is what `fastSquare` looked like.
 */
export const SQUARE_REMAINING = Math.pow(1 - 0.02, 130);

/**
 * Where each quarter of the square starts, in the loop's steady state.
 *
 * Quarter k eases from `s[k]` towards corner `c[k]`, ending at
 * s[k+1] = r·s[k] + (1 − r)·c[k]. Going round once must land where it began,
 * which fixes s[0] = (1 − r)(r³c₀ + r²c₁ + r c₂ + c₃) / (1 − r⁴).
 */
function squareStarts(corners, r) {
  const s0 = (1 - r) * (r * r * r * corners[0] + r * r * corners[1] + r * corners[2] + corners[3])
           / (1 - r * r * r * r);
  const starts = [s0];
  for (let k = 0; k < 3; k++) starts.push(r * starts[k] + (1 - r) * corners[k]);
  return starts;
}

/**
 * The paths, by id. Each takes the loop's phase (0..1), the world's size and
 * the recipe, and returns the attractor in world pixels.
 */
export const PATHS = {
  circle: {
    label: 'circle',
    at(phase, W, H) {
      const a = TAU * phase - CIRCLE.lag;
      return {
        x: W / 2.2 + CIRCLE.gain * (W / 2.5) * Math.cos(a),
        y: H / 2.2 + CIRCLE.gain * (H / 1.5) * Math.sin(a),
      };
    },
  },

  /**
   * Not a figure of eight, whatever v2 called it. With the fast horizontal
   * swing eased down to 8% of its target, what the attractor actually did was
   * sweep up and down the middle of the window while shivering side to side —
   * and that is what is kept. 600px was absolute in v2; here it is 600/1080 of
   * the height, which is the same thing on the screen it was made on.
   */
  eight: {
    label: 'eight',
    at(phase, W, H) {
      return {
        x: W / 2 + EIGHT_X.gain * 1.2 * W * Math.cos(TAU * EIGHT_RATIO * phase - EIGHT_X.lag),
        y: H / 2.5 + EIGHT_Y.gain * (600 / 1080) * H * Math.sin(TAU * phase - EIGHT_Y.lag),
      };
    },
  },

  square: {
    label: 'square',
    at(phase, W, H) {
      const r = SQUARE_REMAINING;
      const cx = [0, W, W, 0];
      const cy = [0, 0, H, H];
      const sx = squareStarts(cx, r);
      const sy = squareStarts(cy, r);

      const q = phase * 4;
      const k = Math.min(3, Math.floor(q));
      const left = Math.pow(r, q - k);           // r^u, u through this quarter
      return {
        x: cx[k] + (sx[k] - cx[k]) * left,
        y: cy[k] + (sy[k] - cy[k]) * left,
      };
    },
  },

  point: {
    label: 'point',
    at(phase, W, H, recipe) {
      return { x: (recipe.pointX ?? 0.5) * W, y: (recipe.pointY ?? 0.5) * H };
    },
  },
};

export const PATH_IDS = Object.keys(PATHS);

export const PATH_LABELS = Object.fromEntries(
  Object.entries(PATHS).map(([id, p]) => [id, p.label]));

/** Where the loop is at a tick, 0..1. Negative ticks wrap, for trails. */
export function phaseOf(tick, period) {
  const n = Math.max(1, Math.round(period));
  return (((tick % n) + n) % n) / n;
}

/**
 * The attractor at a tick.
 *
 * @param {object} recipe  needs path, period, and pointX/pointY for `point`
 * @param {number} tick
 * @param {{width:number, height:number}} world
 * @returns {{x:number, y:number}}
 */
export function attractorAt(recipe, tick, world) {
  const path = PATHS[recipe.path] || PATHS.circle;
  return path.at(phaseOf(tick, recipe.period), world.width, world.height, recipe);
}
