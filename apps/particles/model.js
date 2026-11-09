/**
 * model.js — particles as a function of time, not a simulation.
 *
 * M6's one idea (docs/roadmap-done.md): a particle is a function of its spawn slot
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
 * pick, turn, twist, spot, spot, lift, dye — and a new one is only ever added at the end, so a
 * recipe saved today draws the same particles after the model has grown.
 *
 * ── Motion ─────────────────────────────────────────────────────────────────
 *
 * Positions are in the picture's pixels at scale 1, from its centre, y down.
 * A particle leaves the emitter at its speed, `angle` degrees clockwise from
 * straight up, spread either way by up to `spread` / 2. Gravity pulls down,
 * wind across, both in px/s², and drag slows it by `drag` of its speed a
 * second, towards the speed the pull alone would hold it at (`motion`).
 *
 * A particle turns too: from a start angle spread by `turn` degrees, at
 * `spin` degrees a second, each its own speed within `spinSpread` — or,
 * with `align`, it faces where it is going, as a spark or a streak does.
 * `rot` is radians, clockwise, 0 as the sprite was drawn.
 * A vortex, an attractor and curl noise have no closed form: with any of
 * them on, a particle is integrated from its own birth (forces.js), which
 * keeps every promise above at the cost of its age in steps. So does a field
 * from another object, given beside the recipe as an object emitter's points
 * are: a fractal's, which way its set is.
 *
 * ── Depth ──────────────────────────────────────────────────────────────────
 *
 * A particle has a `z` too: 0 the picture's plane, more is further away. It
 * leaves from the emitter's `z`, its cone tilted out of the plane by up to
 * `depthSpread` / 2 degrees either way, and drag slows it in depth as in the
 * plane; gravity, wind and the fields stay in the plane. The camera that
 * turns depth into size and place is the picture's (draw.js); a model with
 * no depth — the default — has every z at 0, and draws as it always did.
 *
 * ── Where it leaves from ───────────────────────────────────────────────────
 *
 * The emitter is a `point`, a `line` `extent` px long turned `lineAngle`
 * degrees clockwise from level, a `disc` of radius `extent` — filled evenly,
 * not crowded at its centre — or a `ring` on its edge. On a disc or a ring
 * the launch can `aim` `outward`: the cone turned to point away from the
 * centre, for a burst that blooms. The spot is two more draws of the slot.
 *
 * Or it is an `object` from the vault (2026-09-30, the author's idea): a
 * dot-set's dots, or where a picture has ink (core/points.js), `extent` px
 * along its longer side. The recipe names the object; its points come to
 * `prepare()` beside it, never in it. The first spot draw picks a point, the
 * second jitters round it within a picture's sample — dots are exact — and
 * `outward` points away from the object's centre: a word that bursts. Until
 * the points are in, it is a point.
 */

import { makeRng, seedFrom } from '../../core/rng.js';
import { fieldOf, integrate } from './forces.js';

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
  turn: 0,              // degrees, the spread of the angle it starts at
  spin: 0,              // degrees a second, clockwise
  spinSpread: 0,        // 0..1, either way
  align: false,         // facing where it goes, instead of turning
  shape: 'point',       // 'point' | 'line' | 'disc' | 'ring' | 'object'
  extent: 100,          // px: a line's length, a disc's or a ring's radius, an object's longer side
  lineAngle: 0,         // degrees clockwise from level
  aim: 'fixed',         // 'fixed' | 'outward', on a disc, a ring or an object
  fx: 0, fy: 0,         // the fields' centre, from the picture's centre
  vortex: 0,            // px/s², round the centre, clockwise
  attract: 0,           // px/s², towards the centre
  falloff: 0,           // px: the vortex's and the pull's reach; 0 is everywhere
  noise: 0,             // px/s², along curl noise
  noiseScale: 200,      // px, the noise's features
  fieldPull: 0,         // px/s², along a field from another object, given beside the recipe
  fieldTurn: 0,         // degrees, that field turned clockwise: 180 away, 90 round
  z: 0,                 // px, the emitter's depth: more is further away
  depthSpread: 0,       // degrees, the cone tilted out of the plane, the whole of it
};

/**
 * The recipe with its defaults, and the numbers the model needs derived once.
 * Every function here takes either; a frame drawn many times prepares once.
 *
 * @param {object} [recipe]              see DEFAULTS
 * @param {object} [given]
 * @param {?{list, cell}} [given.points] an `object` emitter's points (core/points.js)
 * @param {?{at}} [given.field]          a field from another object (core/fields.js)
 */
export function prepare(recipe = {}, { points = null, field = null } = {}) {
  const r = { ...DEFAULTS, ...recipe };
  const burst = r.mode === 'burst';
  const n = burst ? Math.max(0, Math.round(r.count)) : Math.max(1, Math.round(r.rate * r.period));
  const m = { ...r, prepared: true, burst, n, spacing: burst ? 0 : r.period / n,
              longest: r.life * (1 + Math.max(0, r.lifeSpread)), seed: seedFrom(r.seed) };
  m.points = r.shape === 'object' && points && points.list && points.list.length ? points : null;
  m.external = field && typeof field.at === 'function' ? field : null;
  m.field = fieldOf(m);
  return m;
}

/**
 * Where on the emitter a particle leaves from, from its two spot draws `a`
 * and `b`: its offset from the emitter's centre, and — on a disc or a ring
 * aimed outward — the angle pointing away from it, clockwise from up.
 */
export function spotOf(m, a, b) {
  if (m.shape === 'line') {
    const t = m.lineAngle * DEG, u = (a - 0.5) * m.extent;
    return { dx: Math.cos(t) * u, dy: Math.sin(t) * u, out: null };
  }
  if (m.shape === 'disc' || m.shape === 'ring') {
    const r = m.shape === 'ring' ? m.extent : m.extent * Math.sqrt(a);
    const phi = b * Math.PI * 2;
    const dx = Math.cos(phi) * r, dy = Math.sin(phi) * r;
    return { dx, dy, out: m.aim === 'outward' ? Math.atan2(Math.cos(phi), -Math.sin(phi)) : null };
  }
  if (m.points) {
    // A point by the first draw; the second, and its low bits for the other
    // axis, jitter within a picture's sample — nothing new is drawn.
    const { list, cell } = m.points;
    const [px, py] = list[Math.min(list.length - 1, Math.floor(a * list.length))];
    const jx = cell ? (b - 0.5) * cell : 0, jy = cell ? (((b * 4096) % 1) - 0.5) * cell : 0;
    const dx = (px + jx) * m.extent, dy = (py + jy) * m.extent;
    return { dx, dy, out: m.aim === 'outward' ? Math.atan2(dx, -dy) : null };
  }
  return { dx: 0, dy: 0, out: null };
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
  const turn = m.turn * (rng() - 0.5) * DEG;
  const spin = m.spin * (1 + m.spinSpread * (rng() * 2 - 1)) * DEG;
  const spot = spotOf(m, rng(), rng());
  const lift = (m.depthSpread || 0) * (rng() - 0.5) * DEG;
  const dye = rng();
  const born = m.burst ? 0 : (k + m.jitter * jitter) * m.spacing;
  return { slot: own, born, life: Math.max(1e-3, life), speed,
           angle: angle + (spot.out ?? 0), pick, turn, spin, dx: spot.dx, dy: spot.dy, lift, dye };
}

/**
 * Every particle alive at `t` seconds, oldest first — the order they are
 * drawn in, so the newest are on top. Each is where it is, how fast it goes,
 * how old it is, how it is turned and what it drew:
 * `{ slot, x, y, z, vx, vy, vz, rot, age, life, t, pick, dye }`,
 * `t` its age over its life, 0 to 1, for what runs over a particle's life;
 * `pick` chooses its sprite and `dye` its colour of a palette, apart, so a
 * sprite is not tied to a colour.
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
    // Tilted out of the plane by `lift`: what goes into depth is taken from the plane.
    const flat = Math.cos(s.lift) * s.speed;
    const v = { x: Math.sin(s.angle) * flat, y: -Math.cos(s.angle) * flat };
    const from = { x: m.x + s.dx, y: m.y + s.dy };
    const at = m.field ? integrate(from, v, m, m.field, age) : motion(from, v, a, m.drag, age);
    // Depth has drag and nothing else: its closed form, on either path.
    const deep = motion({ x: m.z || 0, y: 0 }, { x: Math.sin(s.lift) * s.speed, y: 0 }, { x: 0, y: 0 }, m.drag, age);
    at.z = deep.x;
    at.vz = deep.vx;
    const rot = m.align ? Math.atan2(at.vx, -at.vy) : s.turn + s.spin * age;
    out.push({ slot: s.slot, ...at, rot, age, life: s.life, t: age / s.life, pick: s.pick, dye: s.dye });
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
