/**
 * appendage.js — the appendage between the matrix and the worm (M16p,
 * docs/worm.md): "dans le cœur, un appendice reliant la matrice à notre
 * avatar comme interface de contrôle pour ajouter / retirer des items,
 * faire des modifications qu'on précisera plus tard".
 *
 * A tube of the matrix's own honey (matrix.js `viscous`), thick where it
 * leaves the matrix, thin where it comes up into the worm's belly, laid
 * again each frame as the worm floats round. What the worm carries goes
 * along it into the matrix, and back out to the worm: one thing at a time,
 * a card of its picture carried along, `PASSAGE` seconds. What else passes
 * along it — the changes — the author's, later.
 *
 * Pure but for its material, three's node one: Node runs it (tests/3d-heart.mjs).
 */

import { Mesh, BufferGeometry, Float32BufferAttribute, Vector3 } from '../../../core/libs/three/three.core.js';
import { viscous } from './matrix.js';

const ALONG = 40, ROUND = 10;
/** How long a thing takes along it, seconds. */
export const PASSAGE = 0.8;

/** A point of the cubic from `a` to `d` by `b` and `c` at `t` — or, `slope`, its way there. */
function cubic(a, b, c, d, t, out, slope = false) {
  const s = 1 - t;
  if (slope) {
    return out.copy(b).sub(a).multiplyScalar(3 * s * s).addScaledVector(c.clone().sub(b), 6 * s * t)
      .addScaledVector(d.clone().sub(c), 3 * t * t).normalize();
  }
  return out.copy(a).multiplyScalar(s * s * s).addScaledVector(b, 3 * s * s * t).addScaledVector(c, 3 * s * t * t).addScaledVector(d, t * t * t);
}

export class Appendage {
  constructor() {
    this.mesh = null;
    this.ends = [new Vector3(), new Vector3(), new Vector3(), new Vector3()];   // the matrix's end, its two pulls, the worm's
    this.thick = [0.22, 0.07];
    this.passing = null;      // { item, way: 'in' | 'out', t, card }
  }

  /** Made in `colour`, as thick as the worm's `size` asks. */
  build({ colour = '#ffb347', size = 1 } = {}) {
    this.dispose();
    this.thick = [0.22 * size, 0.07 * size];
    const g = new BufferGeometry(), count = (ALONG + 1) * (ROUND + 1), index = [];
    g.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('normal', new Float32BufferAttribute(new Float32Array(count * 3), 3));
    for (let i = 0; i < ALONG; i++) {
      for (let j = 0; j < ROUND; j++) {
        const a = i * (ROUND + 1) + j, b = a + ROUND + 1;
        index.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    g.setIndex(index);
    this.mesh = new Mesh(g, viscous(colour, { wobble: 0.02 * size }).material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 1;
    return this;
  }

  /** Where along it `t` is — 0 the matrix, 1 the worm. */
  at(t, out = new Vector3()) { return cubic(...this.ends, Math.max(0, Math.min(1, t)), out); }

  /** Laid from `from` on the matrix, leaving it along `out`, to `to` at the worm's belly, coming up into it along `up`. */
  lay(from, out, to, up) {
    const gap = from.distanceTo(to), [a, b, c, d] = this.ends;
    a.copy(from);
    b.copy(from).addScaledVector(out, 0.45 * gap);
    c.copy(to).addScaledVector(up, -0.45 * gap);
    d.copy(to);
    if (!this.mesh) return this;
    const P = this.mesh.geometry.getAttribute('position'), N = this.mesh.geometry.getAttribute('normal');
    const p = new Vector3(), t = new Vector3(), n = new Vector3(), s = new Vector3(), ring = new Vector3();
    cubic(a, b, c, d, 0, t, true);
    n.set(Math.abs(t.x) > 0.9 ? 0 : 1, Math.abs(t.x) > 0.9 ? 1 : 0, 0);
    for (let i = 0; i <= ALONG; i++) {
      const u = i / ALONG, r = this.thick[0] + (this.thick[1] - this.thick[0]) * u;
      cubic(a, b, c, d, u, p);
      cubic(a, b, c, d, u, t, true);
      n.addScaledVector(t, -n.dot(t)).normalize();      // carried along it, square to where it goes
      s.copy(t).cross(n);
      for (let j = 0; j <= ROUND; j++) {
        const angle = (2 * Math.PI * j) / ROUND, k = i * (ROUND + 1) + j;
        ring.copy(n).multiplyScalar(Math.cos(angle)).addScaledVector(s, Math.sin(angle));
        N.setXYZ(k, ring.x, ring.y, ring.z);
        P.setXYZ(k, p.x + r * ring.x, p.y + r * ring.y, p.z + r * ring.z);
      }
    }
    P.needsUpdate = true;
    N.needsUpdate = true;
    return this;
  }

  /** `item` sent along it — `in` to the matrix, `out` to the worm — its `card` carried; false while another passes. */
  send(item, way, card = null) {
    if (this.passing || !item) return false;
    this.passing = { item, way, t: 0, card };
    this.step(0);
    return true;
  }

  /** `dt` on: what passes moved along it — or, `now`, there at once. Come to its end: what it was and which way; else null. */
  step(dt, now = false) {
    const g = this.passing;
    if (!g) return null;
    g.t = now ? 1 : Math.min(1, g.t + dt / PASSAGE);
    if (g.card) this.at(g.way === 'in' ? 1 - g.t : g.t, g.card.position);
    if (g.t < 1) return null;
    this.passing = null;
    if (g.card) {
      if (g.card.parent) g.card.parent.remove(g.card);
      g.card.geometry.dispose();
      if (g.card.material.map) g.card.material.map.dispose();
      g.card.material.dispose();
    }
    return { item: g.item, way: g.way };
  }

  dispose() {
    if (this.mesh) {
      if (this.mesh.parent) this.mesh.parent.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    this.mesh = null;
  }
}
