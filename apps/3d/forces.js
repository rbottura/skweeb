/**
 * forces.js — a cloud's dots in time (G2, 2026-11-11; docs/plan.md
 * `3d/cloud-forces`): the author's "on fera intervenir des forces de vortex et
 * de gravité sur ces éléments pour faire évoluer et modifier le système".
 *
 * A cloud at rest is its time 0 (cloud.js). From there each dot moves under
 * its own cloud's forces — the author's pick, a cloud each — a launch, gravity
 * and wind, drag, a vortex round an axis, a pull to a centre, curl noise in
 * 3D, as particles' forces.js moves a particle from its birth: integrated from
 * rest by the midpoint rule in steps of STEP, the count of whole steps taken
 * from the time alone, so the same time is always the same steps and a frame
 * stands alone, drawn on its own or after any other. Nothing acts between
 * dots. In the cloud's own space, before its place, as its stack is: a cloud
 * turned, its gravity turns with it.
 *
 * ── Time ───────────────────────────────────────────────────────────────────
 *
 * The model's `time` (motion.js) is how long the forces have acted: the state
 * a still or a print shows, and its sequence from rest to it, played once —
 * the author's pick, 2026-11-11.
 *
 * ── Fast ───────────────────────────────────────────────────────────────────
 *
 * Played forward, a frame goes on from the one before; drawn back, from the
 * nearest state kept on the way — every KEEP steps, kept exactly, in doubles —
 * so it is the state from rest to the bit, in fewer steps.
 *
 * Pure: Node runs it (tests/3d-forces.mjs).
 */

import { makeRng } from '../../core/rng.js';
import { curl3, pcg } from '../../core/noise.js';

/** Seconds a step: 60 a second, so a 24 fps frame is two and a half. */
export const STEP = 1 / 60;
/** Steps between two states kept, for drawing back: two seconds. */
const KEEP = 120;
/** Near the centre a vortex and a pull fade in over this much, so a dot through it is not flung away. */
const SOFT = 0.05;

const forces = 'forces';
const pull = label => ({ type: 'range', min: -20, max: 20, step: 'any', default: 0, label, group: forces });
const at = label => ({ type: 'range', min: -50, max: 50, step: 'any', default: 0, label, group: forces });
const LAUNCHED = { speed: { not: 0 } };

/** A cloud's forces, its card's Forces drawer. All at 0, its dots stay at rest. */
export const FORCE_PARAMS = {
  speed: { type: 'range', min: 0, max: 20, step: 'any', default: 0, label: 'launched at', unit: '/s', group: forces },
  aim: { type: 'enum', options: ['out', 'face', 'any'], labels: { out: 'out from the centre', face: 'the way it faces', any: 'every way' },
         default: 'out', label: 'launched', group: forces, when: LAUNCHED },
  speedSpread: { type: 'range', min: 0, max: 1, step: 0.01, default: 0.3, label: 'launch spread', group: forces, when: LAUNCHED },
  gravity: pull('gravity, down its y'),
  wind: pull('wind, along its x'),
  windZ: pull('wind, along its z'),
  drag: { type: 'range', min: 0, max: 20, step: 'any', default: 0.5, label: 'drag', unit: '/s', group: forces },
  /** Round an axis through the centre, the right hand's way: anticlockwise to the eye, for a flat cloud round z. */
  vortex: pull('vortex, round its axis'),
  axis: { type: 'enum', options: ['z', 'y', 'x'], default: 'z', display: 'chips', label: 'the vortex\'s axis', group: forces,
          when: { vortex: { not: 0 } } },
  attract: pull('pull to the centre — less than 0, away'),
  /** The vortex's and the pull's reach round their centre: 0 everywhere, as particles' falloff. */
  reach: { type: 'range', min: 0, max: 50, step: 'any', default: 0, label: 'their reach — 0, everywhere', group: forces },
  cx: at('the centre, x'), cy: at('the centre, y'), cz: at('the centre, z'),
  noise: { type: 'range', min: 0, max: 20, step: 'any', default: 0, label: 'curl noise', group: forces },
  noiseSize: { type: 'range', min: 0.02, max: 20, step: 'any', log: true, default: 0.8, label: 'noise, how wide', group: forces,
               when: { noise: { not: 0 } } },
};

const num = x => (Number.isFinite(Number(x)) ? Number(x) : 0);

/** Whether a cloud's values move its dots: a launch or a force — drag alone holds still what is still. */
export const forcesOn = v => !!v && ['speed', 'gravity', 'wind', 'windZ', 'vortex', 'attract', 'noise'].some(k => num(v[k]) !== 0);

/** What its dots move under, as one key: equal, the same evolution kept. */
export const forceKey = v => JSON.stringify([...Object.keys(FORCE_PARAMS).map(k => v[k]), v.seed]);

/** How much of a centred pull reaches `d` from its centre: particles' falloff (apps/particles/forces.js `reach`). */
export function reaching(d, reach) {
  if (!(reach > 0)) return 1;
  if (d >= reach) return 0;
  const q = 1 - (d / reach) ** 2;
  return q * q;
}

/**
 * The field a cloud's values make: the pull at a point, into `out`, gravity, wind and drag aside — or null when
 * nothing depends on where a dot is.
 *
 * @returns {?(x: number, y: number, z: number, out: Float64Array) => void}
 */
export function fieldOf(v) {
  const vortex = num(v.vortex), attract = num(v.attract), noise = num(v.noise);
  if (!vortex && !attract && !noise) return null;
  const cx = num(v.cx), cy = num(v.cy), cz = num(v.cz), reach = num(v.reach);
  const axis = ['x', 'y', 'z'].indexOf(v.axis) < 0 ? 2 : ['x', 'y', 'z'].indexOf(v.axis);
  const size = Math.max(0.02, num(v.noiseSize) || 0.8), seed = pcg((Math.round(num(v.seed)) ^ 0x51ed27) >>> 0);
  return (x, y, z, out) => {
    const dx = x - cx, dy = y - cy, dz = z - cz;
    out[0] = 0; out[1] = 0; out[2] = 0;
    if (vortex) {
      // Across the axis, turned a quarter round it: the axis × the way out from it.
      const r = axis === 2 ? [dx, dy, 0] : axis === 1 ? [dx, 0, dz] : [0, dy, dz];
      const d = Math.hypot(r[0], r[1], r[2]);
      if (d > 1e-12) {
        const k = (vortex * Math.min(1, d / SOFT) * reaching(d, reach)) / d;
        if (axis === 2) { out[0] -= r[1] * k; out[1] += r[0] * k; }
        else if (axis === 1) { out[0] += r[2] * k; out[2] -= r[0] * k; }
        else { out[1] -= r[2] * k; out[2] += r[1] * k; }
      }
    }
    if (attract) {
      const d = Math.hypot(dx, dy, dz);
      if (d > 1e-12) {
        const k = (attract * Math.min(1, d / SOFT) * reaching(d, reach)) / d;
        out[0] -= dx * k; out[1] -= dy * k; out[2] -= dz * k;
      }
    }
    if (noise) {
      const [nx, ny, nz] = curl3(x / size, y / size, z / size, seed);
      out[0] += nx * noise; out[1] += ny * noise; out[2] += nz * noise;
    }
  };
}

/**
 * Each dot's launch: `speed`, spread by a draw of its own, out from the centre, the way it faces (out of a flat
 * cloud's plane, out of a ball) or every way — draws of its own seed, so its places are as they were.
 *
 * @param {{count, centres, faces}} dots   cloud.js `dotsOf`'s
 */
export function launchOf(dots, v) {
  const n = dots.count, out = new Float64Array(n * 3), speed = num(v.speed);
  if (!speed) return out;
  const c = [num(v.cx), num(v.cy), num(v.cz)], spread = Math.max(0, Math.min(1, num(v.speedSpread)));
  for (let k = 0; k < n; k++) {
    const r = makeRng(`cloud launch ${v.seed}:${k}`);
    const s = speed * (1 + spread * (r() * 2 - 1));
    const phi = r() * Math.PI * 2, cos = r() * 2 - 1, sin = Math.sqrt(1 - cos * cos);
    let w = [Math.cos(phi) * sin, cos, Math.sin(phi) * sin];          // every way: its own
    if (v.aim === 'face' && dots.faces) w = [dots.faces[k * 3], dots.faces[k * 3 + 1], dots.faces[k * 3 + 2]];
    else if (v.aim !== 'any') {
      const o = [dots.centres[k * 3] - c[0], dots.centres[k * 3 + 1] - c[1], dots.centres[k * 3 + 2] - c[2]];
      if (Math.hypot(o[0], o[1], o[2]) > 1e-9) w = o;                 // at the centre, it has no way out: its own
    }
    const l = Math.hypot(w[0], w[1], w[2]) || 1;
    out.set([(w[0] / l) * s, (w[1] / l) * s, (w[2] / l) * s], k * 3);
  }
  return out;
}

/**
 * A cloud's dots from rest under its forces: `at(t)`, where they all are `t` seconds on.
 */
export class Evolution {
  /**
   * @param {{count, centres, faces}} dots   at rest (cloud.js `dotsOf`)
   * @param {object} v                       the cloud's values: its forces, its seed
   */
  constructor(dots, v) {
    this.key = forceKey(v);
    this.n = dots.count;
    this.rest = dots.centres;
    this.g = [num(v.wind), -num(v.gravity), num(v.windZ)];
    this.drag = Math.max(0, num(v.drag));
    this.field = fieldOf(v);
    this.k = 0;                                           // whole steps the state has taken
    this.p = Float64Array.from(dots.centres);
    this.v = launchOf(dots, v);
    this.kept = new Map([[0, [Float64Array.from(this.p), Float64Array.from(this.v)]]]);
    this.out = new Float32Array(this.n * 3);
    this.f = new Float64Array(3);
  }

  /** Where every dot is `t` seconds from rest: x, y, z each — the rest itself at 0. A buffer of its own, reused. */
  at(t) {
    if (!(t > 0)) return this.rest;
    const whole = Math.max(0, Math.floor(t / STEP + 1e-9)), part = t - whole * STEP;
    if (whole < this.k) {
      let from = 0;
      for (const k of this.kept.keys()) if (k <= whole && k > from) from = k;
      const [p, v] = this.kept.get(from);
      this.p.set(p); this.v.set(v); this.k = from;
    }
    while (this.k < whole) {
      this.step(this.p, this.v, STEP);
      this.k++;
      if (this.k % KEEP === 0 && !this.kept.has(this.k)) this.kept.set(this.k, [Float64Array.from(this.p), Float64Array.from(this.v)]);
    }
    if (part > 1e-12) {
      const p = Float64Array.from(this.p), v = Float64Array.from(this.v);
      this.step(p, v, part);
      this.out.set(p);
    } else this.out.set(this.p);
    return this.out;
  }

  /** Every dot one step on, `h` seconds, by the midpoint rule: particles' integrate, in 3D. */
  step(p, v, h) {
    const { g, drag: k, field, f } = this;
    for (let i = 0; i < this.n * 3; i += 3) {
      let fx = 0, fy = 0, fz = 0;
      if (field) { field(p[i], p[i + 1], p[i + 2], f); fx = f[0]; fy = f[1]; fz = f[2]; }
      const ax = g[0] + fx - k * v[i], ay = g[1] + fy - k * v[i + 1], az = g[2] + fz - k * v[i + 2];
      const mx = p[i] + (v[i] * h) / 2, my = p[i + 1] + (v[i + 1] * h) / 2, mz = p[i + 2] + (v[i + 2] * h) / 2;
      const mvx = v[i] + (ax * h) / 2, mvy = v[i + 1] + (ay * h) / 2, mvz = v[i + 2] + (az * h) / 2;
      if (field) { field(mx, my, mz, f); fx = f[0]; fy = f[1]; fz = f[2]; }
      p[i] += mvx * h; p[i + 1] += mvy * h; p[i + 2] += mvz * h;
      v[i] += (g[0] + fx - k * mvx) * h; v[i + 1] += (g[1] + fy - k * mvy) * h; v[i + 2] += (g[2] + fz - k * mvz) * h;
    }
  }
}
