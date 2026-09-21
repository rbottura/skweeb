/**
 * rng.js — the only random in the suite.
 *
 * `Math.random()` and p5's `random()` are banned in app code, and this is what
 * replaces them. The reason is the vault's whole promise: an object says it can
 * be rebuilt, and a render drawn from an unrecorded random cannot be. `seed` in
 * the envelope is that promise written down — see docs/object-model.md.
 *
 * mulberry32: one 32-bit state word, four operations, and a period of 2^32.
 * It is not cryptographic and does not need to be. What it must be is exactly
 * reproducible across machines and browsers, which a deterministic integer
 * algorithm is and a float-based one is not.
 *
 *   const rng = makeRng(19387);
 *   rng()            // [0, 1)
 *   rng.int(6)       // 0..5
 *   rng.pick(list)   // one member
 *   rng.shuffle(xs)  // a new array, Fisher-Yates
 *
 * A generator is a stream, not a function of its call site: the same seed
 * replays the same sequence only if the same calls happen in the same order.
 * Draw everything one pass through, or take a fresh rng per pass.
 */

/** A 32-bit seed from a string, so an id or a title can seed a render. */
export function seedFrom(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value >>> 0;
  const text = String(value == null ? '' : value);
  let h = 2166136261 >>> 0;              // FNV-1a
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

/**
 * @param {number|string} seed
 * @returns {(() => number) & {int, pick, shuffle, range, fork, seed}}
 */
export function makeRng(seed = 0) {
  const start = seedFrom(seed);
  let state = start;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), t | 61))) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  /** An integer in [0, n). Zero or less gives 0 rather than NaN. */
  next.int = n => (n > 0 ? Math.floor(next() * n) : 0);

  /** A float in [min, max). */
  next.range = (min, max) => min + next() * (max - min);

  /** One member, or undefined for an empty list — never a throw. */
  next.pick = list => (list && list.length ? list[next.int(list.length)] : undefined);

  /** A shuffled copy. The input is left alone: callers reuse their lists. */
  next.shuffle = list => {
    const out = Array.from(list || []);
    for (let i = out.length - 1; i > 0; i--) {
      const j = next.int(i + 1);
      const t = out[i]; out[i] = out[j]; out[j] = t;
    }
    return out;
  };

  /**
   * An independent stream derived from this one, for a subsystem that should
   * not shift the main sequence when its call count changes. Named, so the
   * same name always derives the same stream.
   */
  next.fork = name => makeRng(seedFrom(String(name) + ':' + start));

  /** What this was seeded with, so a render can record it. */
  next.seed = start;

  return next;
}
