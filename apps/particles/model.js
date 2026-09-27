/**
 * model.js — particles as a function of time, not a simulation.
 *
 * M6's one idea (docs/roadmap.md): a particle is a function of its spawn slot
 * and its age. Nothing is stepped and nothing is carried from one frame to
 * the next, so:
 *
 *   any frame renders on its own — a scrub, an export at another rate, frame
 *   900 before frame 1 — and gives what playing to it would have;
 *
 *   a loop closes exactly: the slots repeat with the loop's period, so the
 *   page at `t + period` is the page at `t`, to the last bit of what each
 *   slot drew;
 *
 *   a frame draws again at any size, since a position is a number and not a
 *   pixel.
 *
 * Particles that act on one another — flocking, collisions — break all three,
 * and wait for a mode that caches.
 *
 * ── Slots ──────────────────────────────────────────────────────────────────
 *
 * A stream emits `rate` a second, as `n` slots a loop — `rate × period`,
 * rounded, at least one — evenly spaced, each nudged later within its own
 * spacing by `jitter`. Slot `k` draws everything it is from a generator
 * seeded by the recipe's seed and `k mod n` (core/rng.js), so slot `k + n` is
 * slot `k` again, one period on. With `prewarm`, slots before zero were born
 * too, and the first frame is already as full as every other; without, the
 * stream starts empty at zero. A `burst` emits `count` at once, at zero, and
 * is over when the longest of them is.
 *
 * A slot's draws are made in a fixed order — jitter, life, speed, angle,
 * pick — and a new one is only ever added at the end, so a recipe saved
 * today draws the same particles after the model has grown.
 *
 * ── Motion ─────────────────────────────────────────────────────────────────
 *
 * Positions are in the picture's pixels at scale 1, from its centre, y down.
 * A particle leaves the emitter at its speed, `angle` degrees clockwise from
 * straight up, spread either way by up to `spread` / 2. Gravity pulls down,
 * wind across, both in px/s², and drag slows it by `drag` of its speed a
 * second, towards the speed the pull alone would hold it at (`motion`).
 * The later forces — vortex, attractors, curl noise, a field from another
 * object — and depth come in their own bricks.
 */

import { makeRng, seedFrom } from '../../core/rng.js';

const DEG = Math.PI / 180;

/** More alive at once than this is a recipe mistake, not a picture: the oldest are left out. */
export const MAX_ALIVE = 20000;

/** A recipe's emission and forces, as the model reads them. Everything has a default. */
export const DEFAULTS = {
  seed: 1,
  mode: 'stream',       // 'stream' | 'burst'
  rate: 60,             // a second, streaming
  count: 120,           // at once, bursting
  period: 2,            // seconds: the loop, streaming
  prewarm: true,        // streaming: born before zero too, so frame 0 is full
  jitter: 1,            // 0..1 of a slot's spacing, its birth nudged later
  life: 1.5,            // seconds
  lifeSpread: 0.3,      // 0..1, either way
  x: 0, y: 0,           // the emitter, from the picture's centre
  speed: 240,           // px/s
  speedSpread: 0.3,     // 0..1, either way
  angle: 0,             // degrees clockwise from up
  spread: 40,           // degrees, the whole cone
  gravity: 300,         // px/s², down
  wind: 0,              // px/s², across
  drag: 0.5,            // 1/s
};

/**
 * The recipe with its defaults, and the numbers the model needs derived once.
 * Every function here takes either; a frame drawn many times prepares once.
 */
export function prepare(recipe = {}) {
  const r = { ...DEFAULTS, ...recipe };
  const burst = r.mode === 'burst';
  const n = burst ? Math.max(0, Math.round(r.count)) : Math.max(1, Math.round(r.rate * r.period));
  return { ...r, prepared: true, burst, n, spacing: burst ? 0 : r.period / n, longest: r.life * (1 + Math.max(0, r.lifeSpread)),
           seed: seedFrom(r.seed) };
}

/**
 * Where a body is `age` seconds after it left `p` at velocity `v`, under a
 * constant pull `a` and a linear drag `k`: the closed form of dv/dt = a − k v.
 * The velocity runs from `v` towards `a / k`, the speed the pull alone holds;
 * with no drag, the schoolbook `p + v t + a t² / 2`.
 *
 * @returns {{x, y, vx, vy}}
 */
export function motion(p, v, a, k, age) {
  if (k < 1e-6) {
    return { x: p.x + v.x * age + (a.x * age * age) / 2, y: p.y + v.y * age + (a.y * age * age) / 2,
             vx: v.x + a.x * age, vy: v.y + a.y * age };
  }
  const decay = Math.exp(-k * age);
  const tx = a.x / k, ty = a.y / k;                        // terminal velocity
  const gone = (1 - decay) / k;
  return { x: p.x + tx * age + (v.x - tx) * gone, y: p.y + ty * age + (v.y - ty) * gone,
           vx: tx + (v.x - tx) * decay, vy: ty + (v.y - ty) * decay };
}

/**
 * What slot `k` is: its birth and everything it drew. Slot `k + n` of a
 * stream is slot `k` one period later.
 */
export function slot(m, k) {
  const own = m.burst ? k : ((k % m.n) + m.n) % m.n;
  const rng = makeRng(seedFrom(`${m.seed}:${own}`));
  const jitter = rng();
  const life = m.life * (1 + m.lifeSpread * (rng() * 2 - 1));
  const speed = m.speed * (1 + m.speedSpread * (rng() * 2 - 1));
  const angle = (m.angle + m.spread * (rng() - 0.5)) * DEG;
  const pick = rng();
  const born = m.burst ? 0 : (k + m.jitter * jitter) * m.spacing;
  return { slot: own, born, life: Math.max(1e-3, life), speed, angle, pick };
}

/**
 * Every particle alive at `t` seconds, oldest first — the order they are
 * drawn in, so the newest are on top. Each is where it is, how fast it goes,
 * how old it is and what it drew: `{ slot, x, y, vx, vy, age, life, t, pick }`,
 * `t` its age over its life, 0 to 1, for what runs over a particle's life.
 *
 * @param {object} recipe   see DEFAULTS
 * @param {number} t        seconds: on a stream, any time at all, negative too
 */
export function particlesAt(recipe, t) {
  const m = recipe && recipe.prepared ? recipe : prepare(recipe);
  let first, last;
  if (m.burst) {
    first = 0;
    last = m.n - 1;
  } else {
    first = Math.floor((t - m.longest) / m.spacing) - 1;
    last = Math.floor(t / m.spacing);
    if (!m.prewarm) first = Math.max(0, first);
  }
  first = Math.max(first, last - MAX_ALIVE + 1);

  const a = { x: m.wind, y: m.gravity };
  const out = [];
  for (let k = first; k <= last; k++) {
    const s = slot(m, k);
    const age = t - s.born;
    if (age < 0 || age >= s.life) continue;
    const v = { x: Math.sin(s.angle) * s.speed, y: -Math.cos(s.angle) * s.speed };
    const at = motion({ x: m.x, y: m.y }, v, a, m.drag, age);
    out.push({ slot: s.slot, ...at, age, life: s.life, t: age / s.life, pick: s.pick });
  }
  return out;
}

/**
 * How long a recipe's picture lasts before it repeats or is over, in seconds:
 * a stream's period, or a burst's longest life.
 */
export function duration(recipe) {
  const m = recipe && recipe.prepared ? recipe : prepare(recipe);
  return m.burst ? m.longest : m.period;
}
