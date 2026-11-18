/**
 * bridge.js — the spectral bridge between two bodies (M16b, docs/worm.md):
 * "un lien 'spectrale' se forme entre les 2 corps comme la série de frame de
 * la séquence de morphing du corps A vers B".
 *
 * Its ghosts are the morph's in-between frames (morph.js), `count` of them,
 * each `i / (count + 1)` of the way; each stands on an arc from one body to
 * the other over the planet — raised in its middle by `arch` — turned
 * between the two as it goes, a chronophotograph's. The bodies are read
 * frozen, as they stand when the passage begins: the ghosts are made once.
 * Each lights as the phase passes it (phase.js `glowAt`), so the swings run
 * along the bridge and back.
 *
 * Its meshes three's core, its light spectral.js's node material.
 */

import { Group, Mesh, Matrix4, Quaternion, Vector3 } from '../../../core/libs/three/three.core.js';
import { ringsOf, resample, mixRings, tubeOf } from './morph.js';
import { spectral } from './spectral.js';
import { glowAt } from './phase.js';

/** A ghost's rings and points round each: enough for a body seen across a planet. */
const RINGS = 48, POINTS = 24;

/** A worm's place with its head ahead — its matrix turned as its rings are (morph.js `ringsOf`): where, how turned, how big. */
export function canonOf(worm) {
  const s = worm.toward, flip = worm.seen === 'above' ? [s, s, 1] : [s, 1, s];
  const m = worm.mesh.matrix.clone().multiply(new Matrix4().makeScale(...flip));
  const p = new Vector3(), q = new Quaternion(), k = new Vector3();
  m.decompose(p, q, k);
  return { p, q, k };
}

/** The point `t` of the way along the planet from `a` to `b`, raised by `lift` at its middle. */
export function arcAt(a, b, t, lift = 0) {
  const ua = a.clone().normalize(), ub = b.clone().normalize(), angle = ua.angleTo(ub);
  const u = angle < 1e-6 ? ua : ua.multiplyScalar(Math.sin((1 - t) * angle) / Math.sin(angle))
    .add(ub.multiplyScalar(Math.sin(t * angle) / Math.sin(angle)));
  return u.normalize().multiplyScalar(a.length() + (b.length() - a.length()) * t + lift * Math.sin(Math.PI * t));
}

export class Bridge {
  /** Between worms `a` and `b` as they stand: `count` ghosts in `colour`, raised `arch` units at the middle. */
  constructor(a, b, { count = 7, colour = '#a6e3ff', arch = 1.5 } = {}) {
    this.group = new Group();
    this.ghosts = [];
    const ra = resample(ringsOf(a.mesh.geometry, a), RINGS, POINTS);
    const rb = resample(ringsOf(b.mesh.geometry, b), RINGS, POINTS);
    if (!ra.length || !rb.length) return;
    const A = canonOf(a), B = canonOf(b);
    for (let i = 1; i <= count; i++) {
      const t = i / (count + 1);
      const { material, strength } = spectral(colour);
      const mesh = new Mesh(tubeOf(mixRings(ra, rb, t)), material);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.compose(arcAt(A.p, B.p, t, arch * (A.k.x + B.k.x) / 2), A.q.clone().slerp(B.q, t), A.k.clone().lerp(B.k, t));
      mesh.matrixWorldNeedsUpdate = true;
      this.group.add(mesh);
      this.ghosts.push({ mesh, strength, t });
    }
  }

  /** Lit for the phase, `shown` of its full light: 0 gone, 1 there. */
  light(phase, shown) {
    for (const g of this.ghosts) g.strength.value = shown * glowAt(phase, g.t, this.ghosts.length);
  }

  /** Each ghost's light now, for the checks. */
  lights() { return this.ghosts.map(g => g.strength.value); }

  dispose() {
    for (const g of this.ghosts) { g.mesh.geometry.dispose(); g.mesh.material.dispose(); }
    this.ghosts = [];
    this.group.removeFromParent();
  }
}
