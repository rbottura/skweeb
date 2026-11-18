/**
 * worm.js — the worm walked (M16a, docs/worm.md): a gamepad drawing lofted
 * by the 3D app's own loft.js, hung in the walker's frame, its wave timed by
 * the distance walked.
 *
 * How it hangs: the drawing's x along its way, toward its head — where its
 * longest stroke ends, or where it begins. Seen from the side, the
 * drawing's y is up and its depth to the worm's right; seen from above, its
 * depth is up and its y to its left. Lifted so its lowest point is on the
 * ground, as its wave moves it.
 *
 * Its wave is G6's (loft.js `wave`), its phase the distance walked over a
 * wavelength — the body's length over `waves` — so the crests hold still on
 * the ground while the body slides through them, a snake's way: standing,
 * it holds; frozen, for free. It undulates from side to side or up and down,
 * whichever of loft's two ways that is as the drawing is seen. Lofted again
 * only when the phase has moved, its points kept as its rest — loft.js lays
 * the same points in the same order at any phase.
 *
 * Laid on the ground (M16c): each point of its rest taken into the walker's
 * frame, raised or sunk as its dive has it where that point has come to
 * along the ground (dive.js) — each ring to its back just under it, so a
 * body drawn arched swims level — and laid on the planet's curve
 * (bend.js): a long worm lies along a small planet, and dives into it head
 * first. Its
 * spine kept as it lies, each ring's middle and girth: what the ground is
 * raised by (dune.js).
 *
 * And a shell (M16b): the same body again in spectral.js's light, its edges
 * lit — "notre corps devient un coquille vide légèrement transparente" — as
 * its own body fades: `setShell`, 0 the body whole, 1 a shell.
 *
 * Pure but for a skin, a canvas drawn.js made: Node runs it (tests/3d-play.mjs).
 */

import { Mesh, BufferGeometry, MeshToonMaterial, Matrix4, Vector3 } from '../../../core/libs/three/three.core.js';
import { drawnGeometry, DRAWN_PARAMS, DRAWN_WAVE } from '../loft.js';
import { valuesFor } from '../../../core/params.js';
import { rampOf } from '../look.js';
import { spectral } from './spectral.js';
import { bendPoint, bendNormal } from './bend.js';

const LOFT = { ...DRAWN_PARAMS, ...DRAWN_WAVE };

/** loft.js's wave way for a sway, as the drawing is seen: from the side, its depth is the worm's side. */
export const waveWayOf = (seen, sway) => ((seen === 'side') === (sway === 'side') ? 'up' : 'side');

/** A ring's middle: the mean of its points. */
function middleOf(P, body, r) {
  const c = [0, 0, 0];
  for (let j = 0; j < body.points; j++) for (let q = 0; q < 3; q++) c[q] += P[(body.base + r * body.points + j) * 3 + q];
  return c.map(x => x / body.points);
}

/**
 * Each point's ring's top at rest, along the frame's up in the world's units — how far it sinks for its back to be
 * just under the ground: every ring its own. A point of no ring, a body's end, its nearest ring's.
 */
function topsOf(P, bodies, { up, size }) {
  const tops = new Float32Array(P.length / 3).fill(NaN), rings = [];
  for (const b of bodies) for (let r = 0; r < b.rings; r++) {
    let top = -Infinity;
    for (let j = 0; j < b.points; j++) top = Math.max(top, P[(b.base + r * b.points + j) * 3 + up]);
    rings.push([middleOf(P, b, r), size * top]);
    tops.fill(size * top, b.base + r * b.points, b.base + (r + 1) * b.points);
  }
  for (let i = 0; i < tops.length; i++) {
    if (!Number.isNaN(tops[i])) continue;
    let best = Infinity, top = 0;
    for (const [c, t] of rings) {
      const d = (P[i * 3] - c[0]) ** 2 + (P[i * 3 + 1] - c[1]) ** 2 + (P[i * 3 + 2] - c[2]) ** 2;
      if (d < best) { best = d; top = t; }
    }
    tops[i] = top;
  }
  return tops;
}

/**
 * Each ring of `bodies` as it lies in `flat` — the frame's ahead, up, right: [ahead, up, right] its middle, its
 * girth, and how high its top and its bottom are.
 */
function spineOf(flat, bodies) {
  const spine = [];
  for (const b of bodies) for (let ring = 0; ring < b.rings; ring++) {
    const c = middleOf(flat, b, ring);
    let girth = 0, top = -Infinity, bottom = Infinity;
    for (let j = 0; j < b.points; j++) {
      const q = (b.base + ring * b.points + j) * 3;
      girth += Math.hypot(flat[q] - c[0], flat[q + 1] - c[1], flat[q + 2] - c[2]);
      top = Math.max(top, flat[q + 1]);
      bottom = Math.min(bottom, flat[q + 1]);
    }
    spine.push([c[0], c[1], c[2], girth / b.points, top, bottom]);
  }
  return spine;
}

export class Worm {
  constructor() {
    // Always see-through, at 1 whole: its opacity moves with its shell, never its pipeline.
    this.material = new MeshToonMaterial({ color: '#e3a587', gradientMap: rampOf(3), transparent: true });
    this.mesh = new Mesh(new BufferGeometry(), this.material);
    this.mesh.matrixAutoUpdate = false;
    const { material, strength, tint } = spectral();
    this.glow = { strength, tint };
    this.shell = new Mesh(this.mesh.geometry, material);    // a child: it stands where the body does
    this.shell.matrixAutoUpdate = false;
    this.shell.visible = false;
    this.mesh.add(this.shell);
    this.shellAt = 0;        // 0 the body whole, 1 a shell
    this.v = null;           // loft's values, at rest
    this.seen = 'side';
    this.sway = 'side';
    this.size = 1;
    this.toward = 1;         // its head along the drawing's x: 1 or −1
    this.headAtEnd = true;   // its head where its stroke ends
    this.length = 4;         // its longest stroke's line, in the world's units at size 1
    this.low = 0;            // its lowest point along its up, at size 1
    this.high = 0;           // …and its highest
    this.front = 2;          // its head's tip ahead of where it stands, in the world's units
    this.back = -2;          // …and its tail's, behind
    this.phase = null;       // the wave's phase it was last lofted at
    this.rest = null;        // its points and normals as lofted, before it is laid: { position, normal }
    this.flat = null;        // its points in the walker's frame, dived, before the curve
    this.tops = null;        // each point's ring's top over the ground at rest: how far it sinks
    this.spine = [];         // each ring's [ahead, up, right, girth, top, bottom] as it lies, before the curve
    this.laid = '';          // what it was last laid by
  }

  /**
   * Shaped: `body`, loft's rows for it and `drawn`, the drawing read (drawn.js) — none, loft.js's worm; how its
   * drawing is `seen`, where its `head` is, how it waves, its size, and its `skin` — 'drawing', 'brush' or
   * 'colour' — over its `colour`.
   */
  shape({ body = {}, seen = 'side', head = 'end', wave = 0, waves = 1.5, sway = 'side', size = 1, skin = 'drawing', colour = '#e3a587' }) {
    const drawn = body.drawn || null;
    const v = { ...valuesFor(LOFT, body), drawn, wave, waves, waveCycles: 1, grow: false,
                waveWay: waveWayOf(seen, sway), skin: skin === 'brush' ? 'brush' : 'drawing' };
    const g = drawnGeometry({ ...v, phase: 0 });
    const bodies = g.userData.bodies || [];
    const main = bodies.reduce((a, b) => (!a || b.length > a.length ? b : a), null);
    const P = g.getAttribute('position').array;
    if (main) {
      const dx = middleOf(P, main, main.rings - 1)[0] - middleOf(P, main, 0)[0];
      this.headAtEnd = head !== 'start';
      this.toward = (Math.sign(dx) || 1) * (this.headAtEnd ? 1 : -1);
      this.length = main.length;
    }
    this.v = v;
    this.seen = seen === 'above' ? 'above' : 'side';
    this.sway = sway;
    this.size = size;
    this.take(g);
    this.phase = 0;
    this.laid = '0|Infinity|surface';      // as lofted: on no curve, dived nowhere
    let front = -Infinity, back = Infinity;
    for (let i = 0; i < this.rest.position.length; i += 3) {
      const f = this.toward * size * this.rest.position[i];
      front = Math.max(front, f);
      back = Math.min(back, f);
    }
    this.front = Number.isFinite(front) ? front : 0;
    this.back = Number.isFinite(back) ? back : 0;
    const map = !drawn ? null : skin === 'drawing' ? drawn.skin || null : skin === 'brush' ? drawn.brush || null : null;
    if (this.material.map !== map) { this.material.map = map; this.material.needsUpdate = true; }
    this.material.color.set(map ? '#ffffff' : colour);
    return this;
  }

  /** Geometry `g` its body: its points kept as its rest, and laid as they are until it is posed. */
  take(g) {
    if (this.mesh.geometry !== g) this.mesh.geometry.dispose();
    this.mesh.geometry = this.shell.geometry = g;
    const P = g.getAttribute('position'), N = g.getAttribute('normal');
    this.rest = { position: Float32Array.from(P ? P.array : []), normal: Float32Array.from(N ? N.array : []) };
    this.flat = new Float32Array(this.rest.position.length);
    this.low = this.lowest();
    this.high = this.lowest(true);
    this.tops = topsOf(this.rest.position, g.userData.bodies || [], { up: this.seen === 'above' ? 2 : 1, size: this.size });
    this.spine = [];
    this.laid = '';
  }

  /**
   * Its lowest point along its up at rest, as it hangs — the drawing's y seen from the side, its depth from above —
   * or its highest, `top`.
   */
  lowest(top = false) {
    const P = this.rest ? this.rest.position : this.mesh.geometry.getAttribute('position').array;
    let at = top ? -Infinity : Infinity;
    for (let i = this.seen === 'above' ? 2 : 1; i < P.length; i += 3) at = top ? Math.max(at, P[i]) : Math.min(at, P[i]);
    return Number.isFinite(at) ? at : 0;
  }

  /** The wave's phase after `walked` units: the crests still on the ground, the body sliding through them. */
  phaseAt(walked) {
    const wavelength = (this.length * this.size) / Math.max(0.01, this.v ? this.v.waves : 1);
    const phase = ((this.headAtEnd ? -1 : 1) * walked) / wavelength;
    return phase - Math.floor(phase);
  }

  /**
   * Posed where `walked` puts it: its wave — lofted again only if its phase moved — its `dive` (dive.js), its
   * leap and how deep its back goes, on a planet of `radius`. Laid again only if one of them moved; says whether.
   */
  pose(walked, { radius = Infinity, dive = null, leap = 0, depth = 0 } = {}) {
    if (!this.v) return false;
    const phase = this.v.wave > 0 ? this.phaseAt(walked) : 0;
    if (!(Math.abs(phase - this.phase) < 1e-4)) this.loft(phase);
    const under = dive && dive.state !== 'surface' ? dive : null;
    const key = `${this.phase}|${radius}|${under ? `${under.keyAt(walked)}|${leap}|${depth}` : 'surface'}`;
    if (key === this.laid) return false;
    this.laid = key;
    this.lay(walked, radius, under, { span: this.front - this.back, leap, drop: 0 }, depth);
    return true;
  }

  /** Lofted again at the wave's `phase`, into its rest: the same points in the same order. */
  loft(phase) {
    this.phase = phase;
    const g = drawnGeometry({ ...this.v, phase });
    const P = g.getAttribute('position'), N = g.getAttribute('normal');
    if (!P || P.array.length !== this.rest.position.length || (N && N.array.length !== this.rest.normal.length)) {
      this.take(g);
      return;
    }
    this.rest.position.set(P.array);
    if (N) this.rest.normal.set(N.array);
    g.dispose();
    this.low = this.lowest();
    this.high = this.lowest(true);
  }

  /**
   * Its rest laid as it stands: each point into the walker's frame — ahead, up from the ground, right — raised or
   * sunk as `dive` has it where the point has come to along the ground — its ring's back `depth` under it at the
   * last — its normal sheared with it, then laid on the planet's curve and taken back to the drawing's axes, which
   * `place` hangs.
   */
  lay(walked, radius, dive, path, depth) {
    const { position: P0, normal: N0 } = this.rest, flat = this.flat, tops = this.tops, g = this.mesh.geometry;
    const P = g.getAttribute('position').array, normals = g.getAttribute('normal'), N = normals && normals.array;
    const k = this.size, s = this.toward, above = this.seen === 'above', low = this.low;
    const lit = N && N0.length === P0.length, o = [0, 0, 0], n = [0, 0, 0], m = [0, 0, 0];
    for (let i = 0; i < P0.length; i += 3) {
      const f = s * k * P0[i], r = above ? -s * k * P0[i + 1] : s * k * P0[i + 2];
      let u = k * ((above ? P0[i + 2] : P0[i + 1]) - low);
      if (lit) { n[0] = s * N0[i]; n[1] = above ? N0[i + 2] : N0[i + 1]; n[2] = above ? -s * N0[i + 1] : s * N0[i + 2]; }
      if (dive) {
        path.drop = tops[i / 3] - k * low + depth;
        const [h, slope] = dive.heightAt(walked + f, path);
        u += h;
        n[0] -= slope * n[1];
      }
      flat[i] = f; flat[i + 1] = u; flat[i + 2] = r;
      bendPoint(f, u, r, radius, o);
      P[i] = o[0] / (s * k);
      if (above) { P[i + 1] = -o[2] / (s * k); P[i + 2] = o[1] / k + low; }
      else { P[i + 1] = o[1] / k + low; P[i + 2] = o[2] / (s * k); }
      if (!lit) continue;
      bendNormal(f, r, radius, n, m);
      const l = Math.hypot(m[0], m[1], m[2]) || 1;
      N[i] = (s * m[0]) / l;
      if (above) { N[i + 1] = (-s * m[2]) / l; N[i + 2] = m[1] / l; }
      else { N[i + 1] = m[1] / l; N[i + 2] = (s * m[2]) / l; }
    }
    g.getAttribute('position').needsUpdate = true;
    if (lit) normals.needsUpdate = true;
    g.computeBoundingSphere();
    this.spine = spineOf(flat, g.userData.bodies || []);
  }

  /** Its wave in its drawing's own plane — seen flat, in a cut (section.js) — or, `flat` false, as it was shaped. */
  flatten(flat) {
    const way = flat ? 'side' : waveWayOf(this.seen, this.sway);
    if (!this.v || this.v.waveWay === way) return this;
    this.v.waveWay = way;
    this.phase = NaN;            // lofted again at its next pose
    return this;
  }

  /** Hung in a walker's frame at `p`: its drawing's axes the frame's, its lowest point on the ground. */
  place({ up, forward, right }, p) {
    const k = this.size, s = this.toward;
    const X = forward.clone().multiplyScalar(s * k);
    const Y = this.seen === 'above' ? right.clone().multiplyScalar(-s * k) : up.clone().multiplyScalar(k);
    const Z = this.seen === 'above' ? up.clone().multiplyScalar(k) : right.clone().multiplyScalar(s * k);
    this.mesh.matrix.copy(new Matrix4().makeBasis(X, Y, Z).setPosition(p.clone().addScaledVector(up, -this.low * k)));
    this.mesh.matrixWorldNeedsUpdate = true;
    return this;
  }

  /** Where its middle stands, raised off the ground: what a camera looks at. */
  centre() { return new Vector3().setFromMatrixPosition(this.mesh.matrix); }

  /**
   * Its body a shell by `amount`: 0 whole, 1 its edges lit in spectral light over what is left of it — a little,
   * "légèrement transparente". Past half, it no longer hides what is behind it.
   */
  setShell(amount) {
    const a = Math.max(0, Math.min(1, Number(amount) || 0));
    if (a === this.shellAt) return this;
    this.shellAt = a;
    this.material.opacity = 1 - 0.88 * a;
    const write = a < 0.5;
    if (this.material.depthWrite !== write) { this.material.depthWrite = write; this.material.needsUpdate = true; }
    this.glow.strength.value = a;
    this.shell.visible = a > 0;
    return this;
  }

  /** Its shell's light. */
  tintShell(colour) { this.glow.tint.value.set(colour); return this; }

  dispose() {
    this.mesh.geometry.dispose();
    this.material.dispose();            // a skin is drawn.js's, kept: never freed here
    this.shell.material.dispose();
  }
}
