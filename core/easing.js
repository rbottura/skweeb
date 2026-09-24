/**
 * easing.js — the suite's easing curves: how a change runs from start to end.
 *
 * Every curve maps t in [0, 1] — how far through a change we are — to how far
 * the change has gone: 0 at the start, 1 at the end, and in between the
 * character of the motion. `linear` goes at one speed; `out…` starts fast and
 * settles; `in…` starts slow and arrives fast; `inOut…` does both. `back`
 * overshoots past its end and returns, `elastic` rings, `bounce` bounces — so
 * those leave [0, 1] on the way, which a scale or a position may want.
 *
 * The classic set, as Robert Penner named it and easings.net draws it — ten
 * families, three ways each, and `linear`. Pure and exact at the ends: every
 * curve gives 0 at 0 and 1 at 1, so a change always lands where it was going.
 *
 * Declared once for the whole suite: an app offers a curve as a parameter with
 * `easeParam()`, and runs it with `easing(name)`. A recipe stores the name.
 * A picker offers six — BASIC, in words — unless it asks for every one.
 */

const PI = Math.PI;
const C1 = 1.70158;                 // back: the overshoot
const C2 = C1 * 1.525;
const C3 = C1 + 1;
const C4 = (2 * PI) / 3;            // elastic: the period
const C5 = (2 * PI) / 4.5;

function outBounce(t) {
  const n = 7.5625, d = 2.75;
  if (t < 1 / d) return n * t * t;
  if (t < 2 / d) return n * (t -= 1.5 / d) * t + 0.75;
  if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + 0.9375;
  return n * (t -= 2.625 / d) * t + 0.984375;
}

/** name → (t) => progress. Insertion order is the order a picker lists them in. */
export const EASINGS = {
  linear: t => t,

  inSine: t => 1 - Math.cos((t * PI) / 2),
  outSine: t => Math.sin((t * PI) / 2),
  inOutSine: t => -(Math.cos(PI * t) - 1) / 2,

  inQuad: t => t * t,
  outQuad: t => 1 - (1 - t) * (1 - t),
  inOutQuad: t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2),

  inCubic: t => t ** 3,
  outCubic: t => 1 - (1 - t) ** 3,
  inOutCubic: t => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),

  inQuart: t => t ** 4,
  outQuart: t => 1 - (1 - t) ** 4,
  inOutQuart: t => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),

  inQuint: t => t ** 5,
  outQuint: t => 1 - (1 - t) ** 5,
  inOutQuint: t => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2),

  inExpo: t => (t === 0 ? 0 : 2 ** (10 * t - 10)),
  outExpo: t => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  inOutExpo: t => (t === 0 ? 0 : t === 1 ? 1
    : t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2),

  inCirc: t => 1 - Math.sqrt(1 - t * t),
  outCirc: t => Math.sqrt(1 - (t - 1) ** 2),
  inOutCirc: t => (t < 0.5
    ? (1 - Math.sqrt(1 - (2 * t) ** 2)) / 2
    : (Math.sqrt(1 - (-2 * t + 2) ** 2) + 1) / 2),

  inBack: t => C3 * t ** 3 - C1 * t * t,
  outBack: t => 1 + C3 * (t - 1) ** 3 + C1 * (t - 1) ** 2,
  inOutBack: t => (t < 0.5
    ? ((2 * t) ** 2 * ((C2 + 1) * 2 * t - C2)) / 2
    : ((2 * t - 2) ** 2 * ((C2 + 1) * (t * 2 - 2) + C2) + 2) / 2),

  inElastic: t => (t === 0 ? 0 : t === 1 ? 1
    : -(2 ** (10 * t - 10)) * Math.sin((t * 10 - 10.75) * C4)),
  outElastic: t => (t === 0 ? 0 : t === 1 ? 1
    : 2 ** (-10 * t) * Math.sin((t * 10 - 0.75) * C4) + 1),
  inOutElastic: t => (t === 0 ? 0 : t === 1 ? 1
    : t < 0.5 ? -(2 ** (20 * t - 10) * Math.sin((20 * t - 11.125) * C5)) / 2
    : (2 ** (-20 * t + 10) * Math.sin((20 * t - 11.125) * C5)) / 2 + 1),

  inBounce: t => 1 - outBounce(1 - t),
  outBounce,
  inOutBounce: t => (t < 0.5 ? (1 - outBounce(1 - 2 * t)) / 2 : (1 + outBounce(2 * t - 1)) / 2),
};

export const EASE_IDS = Object.keys(EASINGS);

/** 'inOutCubic' → 'in-out cubic', for a picker. */
export const EASE_LABELS = Object.fromEntries(EASE_IDS.map(id => [id,
  id === 'linear' ? 'linear' : id.replace(/^(inOut|in|out)(\w+)$/, (_, way, family) =>
    `${way === 'inOut' ? 'in-out' : way} ${family.toLowerCase()}`)]));

/** The six a picker offers by default, and what it calls them. */
export const BASIC = ['linear', 'inCubic', 'outCubic', 'inOutCubic', 'outBack', 'outBounce'];
export const BASIC_LABELS = {
  linear: 'linear', inCubic: 'ease in', outCubic: 'ease out', inOutCubic: 'ease in-out',
  outBack: 'overshoot', outBounce: 'bounce',
};

/**
 * A curve by name, clamped: t below 0 is 0, above 1 is 1, and an unknown name
 * — a recipe from a later version — is linear rather than an error.
 *
 * @param {string} name
 * @returns {(t: number) => number}
 */
export function easing(name) {
  const f = EASINGS[name] || EASINGS.linear;
  return t => f(t <= 0 ? 0 : t >= 1 ? 1 : t);
}

/**
 * The parameter an app declares to offer a curve — one line in a schema:
 * `ease: easeParam({ group: 'motion' })`. The six BASIC ones, unless `all`.
 *
 * @param {object} [spec]  anything to add or override: default, label, group, when
 * @param {object} [opts]
 * @param {boolean} [opts.all=false]  offer all thirty-one
 */
export function easeParam(spec = {}, { all = false } = {}) {
  return {
    type: 'enum', options: all ? EASE_IDS : BASIC, labels: all ? EASE_LABELS : BASIC_LABELS,
    default: 'outCubic', label: 'easing', ...spec,
  };
}
