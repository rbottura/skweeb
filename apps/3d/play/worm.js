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
 * only when the phase has moved, its points copied into the one geometry it
 * keeps — loft.js lays the same points in the same order at any phase.
 *
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

const LOFT = { ...DRAWN_PARAMS, ...DRAWN_WAVE };

/** loft.js's wave way for a sway, as the drawing is seen: from the side, its depth is the worm's side. */
export const waveWayOf = (seen, sway) => ((seen === 'side') === (sway === 'side') ? 'up' : 'side');

/** A ring's middle: the mean of its points. */
function middleOf(P, body, r) {
  const c = [0, 0, 0];
  for (let j = 0; j < body.points; j++) for (let q = 0; q < 3; q++) c[q] += P[(body.base + r * body.points + j) * 3 + q];
  return c.map(x => x / body.points);
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
    this.size = 1;
    this.toward = 1;         // its head along the drawing's x: 1 or −1
    this.headAtEnd = true;   // its head where its stroke ends
    this.length = 4;         // its longest stroke's line, in the world's units at size 1
    this.low = 0;            // its lowest point along its up, at size 1
    this.phase = null;       // the wave's phase it was last lofted at
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
    this.size = size;
    this.mesh.geometry.dispose();
    this.mesh.geometry = this.shell.geometry = g;
    this.phase = 0;
    this.low = this.lowest();
    const map = !drawn ? null : skin === 'drawing' ? drawn.skin || null : skin === 'brush' ? drawn.brush || null : null;
    if (this.material.map !== map) { this.material.map = map; this.material.needsUpdate = true; }
    this.material.color.set(map ? '#ffffff' : colour);
    return this;
  }

  /** Its lowest point along its up, as it hangs: the drawing's y seen from the side, its depth from above. */
  lowest() {
    const P = this.mesh.geometry.getAttribute('position').array, q = this.seen === 'above' ? 2 : 1;
    let low = Infinity;
    for (let i = q; i < P.length; i += 3) if (P[i] < low) low = P[i];
    return Number.isFinite(low) ? low : 0;
  }

  /** The wave's phase after `walked` units: the crests still on the ground, the body sliding through them. */
  phaseAt(walked) {
    const wavelength = (this.length * this.size) / Math.max(0.01, this.v ? this.v.waves : 1);
    const phase = ((this.headAtEnd ? -1 : 1) * walked) / wavelength;
    return phase - Math.floor(phase);
  }

  /** Its wave where `walked` puts it — lofted again only if the phase moved. Says whether it did. */
  pose(walked) {
    if (!this.v || !(this.v.wave > 0)) return false;
    const phase = this.phaseAt(walked);
    if (this.phase !== null && Math.abs(phase - this.phase) < 1e-4) return false;
    this.phase = phase;
    const g = drawnGeometry({ ...this.v, phase });
    const now = this.mesh.geometry;
    for (const name of ['position', 'normal']) {
      const to = now.getAttribute(name), from = g.getAttribute(name);
      if (!to || !from || to.array.length !== from.array.length) {
        now.dispose();
        this.mesh.geometry = this.shell.geometry = g;
        this.low = this.lowest();
        return true;
      }
      to.array.set(from.array);
      to.needsUpdate = true;
    }
    now.computeBoundingSphere();
    g.dispose();
    this.low = this.lowest();
    return true;
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
