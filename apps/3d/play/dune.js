/**
 * dune.js — the ground raised over a buried worm (M16c, docs/worm.md):
 * "qui fait une bosse en surface suivant la courbe de son corps".
 *
 * A patch of ground over the planet's where the worm is: a grid in its
 * frame, each point raised by the rings of its body under it — the most of
 * what each lifts, a bell its girth and `spread` wide and `ridge` high, as
 * much of it as that ring is under the ground; deeper, lower and wider, as
 * much sand moved. So the ground follows the body's curve, its wave and its
 * turns, and rises round the hole a dive goes through. Laid on the planet's
 * curve as the worm is (bend.js), a hair over the ground, in the ground's
 * own material and its patches' shades — the same toon, the same reality
 * as a passage turns it — so it is the ground, raised; darker along its
 * crest, the earth turned, in a band as the toon draws, for three bands of
 * toon flatten a gentle rise. Hidden while nothing of the worm is under.
 *
 * Pure: three's core only, Node runs it (tests/3d-dune.mjs).
 */

import { BufferGeometry, Float32BufferAttribute, Mesh, Vector3 } from '../../../core/libs/three/three.core.js';
import { bendPoint } from './bend.js';
import { patchAt } from './planet.js';

/** The grid's points, along the worm and across it: the same each frame, stretched over what it covers. */
const ALONG = 120, ACROSS = 60;
/** A hair over the planet's ground: drawn over it, never through it. */
export const OVER = 0.02;
/** How much darker the raised ground is along its crest, the earth turned — past this share of its highest. */
export const TURNED = 0.3, BAND = [0.35, 0.55];
/** How far round a ring its bell is reckoned, in its widths: past it, nothing to see. */
const REACH = 2.5;

/** How much of a ring is under the ground — 0 resting on it, 1 under — its `top` and its `bottom` over it. */
export function sunkOf(top, bottom) {
  const t = Math.min(1, Math.max(0, -bottom / (top - bottom || 1)));
  return t * t * (3 - 2 * t);
}

export class Dune {
  constructor() {
    const g = new BufferGeometry(), n = ALONG * ACROSS;
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('normal', new Float32BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute('color', new Float32BufferAttribute(new Float32Array(n * 3), 3));
    const index = [];
    for (let j = 0; j < ACROSS - 1; j++) for (let i = 0; i < ALONG - 1; i++) {
      const a = j * ALONG + i, b = a + 1, c = a + ALONG, d = c + 1;
      index.push(a, c, b, b, c, d);
    }
    g.setIndex(index);
    this.mesh = new Mesh(g);
    this.stand = this.mesh.material;     // three's own until the ground's is lent: never drawn
    this.mesh.matrixAutoUpdate = false;
    this.mesh.visible = false;
    this.heights = new Float32Array(n);
    this.height = 0;       // its highest, now
    this.sunk = 0;         // how much of the worm is under, 0 to 1
    this.covers = [0, 0, 0, 0];   // ahead from, to; right from, to — in the frame
  }

  /**
   * Laid over a worm's `spine` (worm.js) — each ring's [ahead, up, right, girth, top, bottom] in its walker's `frame` at `p` —
   * on `planet`, its ground raised `ridge` high and `spread` wide over what is under.
   */
  lay(spine, { up, forward, right }, p, planet, { ridge = 0.45, spread = 0.35 } = {}) {
    const rings = [];
    let sunk = 0;
    for (const [f, , r, girth, top, bottom] of spine) {
      const share = sunkOf(top, bottom);
      sunk += share;
      if (share < 1e-3) continue;
      const under = Math.max(0, -top), w = girth + spread, wide = w + under;
      rings.push([f, r, (ridge * share * w) / wide, wide]);
    }
    this.sunk = spine.length ? sunk / spine.length : 0;
    if (!rings.length || !planet.ground || !(ridge > 0)) {
      this.mesh.visible = false;
      this.height = 0;
      return this;
    }

    // What it covers: every bell, out to where it is nothing.
    let f0 = Infinity, f1 = -Infinity, r0 = Infinity, r1 = -Infinity;
    for (const [f, r, , wide] of rings) {
      f0 = Math.min(f0, f - REACH * wide); f1 = Math.max(f1, f + REACH * wide);
      r0 = Math.min(r0, r - REACH * wide); r1 = Math.max(r1, r + REACH * wide);
    }
    this.covers = [f0, f1, r0, r1];
    const df = (f1 - f0) / (ALONG - 1), dr = (r1 - r0) / (ACROSS - 1), H = this.heights.fill(0);
    for (const [f, r, a, wide] of rings) {
      const i0 = Math.max(0, Math.floor((f - REACH * wide - f0) / df)), i1 = Math.min(ALONG - 1, Math.ceil((f + REACH * wide - f0) / df));
      const j0 = Math.max(0, Math.floor((r - REACH * wide - r0) / dr)), j1 = Math.min(ACROSS - 1, Math.ceil((r + REACH * wide - r0) / dr));
      const k = 1 / (wide * wide);
      for (let j = j0; j <= j1; j++) {
        const dz = r0 + j * dr - r, dz2 = dz * dz;
        for (let i = i0; i <= i1; i++) {
          const dx = f0 + i * df - f, h = a * Math.exp(-(dx * dx + dz2) * k), q = j * ALONG + i;
          if (h > H[q]) H[q] = h;
        }
      }
    }

    // Laid on the curve, its shades the ground's where it lies, darker along its crest.
    const g = this.mesh.geometry, P = g.getAttribute('position').array, C = g.getAttribute('color').array;
    const m = this.mesh.matrix.makeBasis(forward, up, right).setPosition(p), o = [0, 0, 0], at = new Vector3();
    let top = 0;
    for (let q = 0; q < H.length; q++) top = Math.max(top, H[q]);
    for (let j = 0; j < ACROSS; j++) for (let i = 0; i < ALONG; i++) {
      const q = j * ALONG + i, t = Math.min(1, Math.max(0, (H[q] / (top || 1) - BAND[0]) / (BAND[1] - BAND[0])));
      bendPoint(f0 + i * df, H[q] + OVER, r0 + j * dr, planet.radius, o);
      P[q * 3] = o[0]; P[q * 3 + 1] = o[1]; P[q * 3 + 2] = o[2];
      const shade = (0.8 + 0.35 * patchAt(planet.waves, at.set(o[0], o[1], o[2]).applyMatrix4(m).normalize()))
        * (1 - TURNED * t * t * (3 - 2 * t));
      C[q * 3] = C[q * 3 + 1] = C[q * 3 + 2] = shade;
    }
    g.getAttribute('position').needsUpdate = true;
    g.getAttribute('color').needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
    this.mesh.matrixWorldNeedsUpdate = true;
    this.mesh.material = planet.ground.material;     // the ground's own, lent: its colour is the reality's
    this.mesh.visible = true;
    this.height = top;
    return this;
  }

  /** Its height over the ground at (f, r) of the frame it was last laid in: what the checks ask. */
  heightAt(f, r) {
    const [f0, f1, r0, r1] = this.covers;
    if (!this.mesh.visible || f < f0 || f > f1 || r < r0 || r > r1) return 0;
    const i = Math.round(((f - f0) / (f1 - f0)) * (ALONG - 1)), j = Math.round(((r - r0) / (r1 - r0)) * (ACROSS - 1));
    return this.heights[j * ALONG + i];
  }

  dispose() {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.stand.dispose();        // the ground's material is the planet's to let go of
  }
}

